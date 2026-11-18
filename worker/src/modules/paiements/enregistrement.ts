/**
 * Encaissement : écriture de paiement (idempotente), mise à jour de la facture, e-mails, notification.
 * Facture d'acompte après signature d'un devis.
 */
import { ErreurParcours, enCentimes, enEuros, nouvelId } from '../documents/commun';
import { donneesDocument, envoyerSansEchec } from '../documents/emails';
import type { EnvParcours } from '../documents/env';
import { urlApp } from '../documents/jetons';
import { emailArtisan, journaliser, lireClient, lireFacture } from '../documents/sources';
import type { VueDevis } from '../documents/vues';
import { notifier } from '../notifications/notifier';

export const LIBELLE_MOYEN: Record<string, string> = { carte: 'Carte bancaire', virement: 'Virement', '3x': 'Paiement en 3 fois' };

export interface SessionPaiement {
  id: string;
  organization_id: string;
  facture_id: string;
  devis_id: string | null;
  nature: 'facture' | 'acompte';
  moyen: string;
  fournisseur: string;
  montant_cents: number;
  reference_externe: string | null;
  statut: string;
  url: string | null;
}

export const lireSession = (env: EnvParcours, id: string) => env.DB.prepare('SELECT * FROM paiements_sessions WHERE id = ?').bind(id).first<SessionPaiement>();

/**
 * Enregistre un encaissement. `reference` est unique (payment_intent Stripe, id Alma…) :
 * un même paiement reçu deux fois (rejeu, double webhook) n'est compté qu'une fois.
 */
export async function enregistrerPaiement(
  env: EnvParcours,
  o: { sessionId: string; montantCents: number; reference: string; lienRetour?: string | null },
): Promise<{ enregistre: boolean; doublon: boolean }> {
  const s = await lireSession(env, o.sessionId);
  if (!s) {
    console.error('[paiements] session inconnue', o.sessionId);
    return { enregistre: false, doublon: false };
  }
  const montant = Math.max(0, Math.trunc(o.montantCents));
  const maintenant = Date.now();
  const ins = await env.DB.prepare(
    'INSERT OR IGNORE INTO paiements_ecritures (id, organization_id, facture_id, session_id, montant_cents, moyen, fournisseur, reference_externe, paye_le, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(nouvelId('ecr'), s.organization_id, s.facture_id, s.id, montant, s.moyen, s.fournisseur, o.reference, maintenant, maintenant)
    .run();
  if ((ins.meta?.changes ?? 0) === 0) return { enregistre: false, doublon: true };

  await env.DB.batch([
    env.DB.prepare('UPDATE factures SET paid_amount = ROUND(paid_amount + ?, 2) WHERE id = ? AND organization_id = ?').bind(enEuros(montant), s.facture_id, s.organization_id),
    env.DB.prepare("UPDATE factures SET status = CASE WHEN paid_amount + 0.005 >= total_ttc THEN 'payee' ELSE 'partielle' END WHERE id = ? AND organization_id = ?").bind(s.facture_id, s.organization_id),
    env.DB.prepare("UPDATE paiements_sessions SET statut = 'payee', paye_le = ? WHERE id = ?").bind(maintenant, s.id),
  ]);
  await journaliser(env, s.organization_id, 'facture', s.facture_id, 'paiement', { montant: enEuros(montant), moyen: s.moyen, fournisseur: s.fournisseur });
  if (s.devis_id) await journaliser(env, s.organization_id, 'devis', s.devis_id, 'acompte_paye', { montant: enEuros(montant), factureId: s.facture_id });

  const f = await lireFacture(env, s.organization_id, s.facture_id);
  if (f) {
    const client = await lireClient(env, s.organization_id, f.facture.client_id);
    const reste = Math.max(0, enCentimes(f.facture.total_ttc) - enCentimes(f.facture.paid_amount));
    const base = await donneesDocument(env, s.organization_id, {
      client,
      numero: f.facture.number,
      titre: s.nature === 'acompte' ? 'Acompte' : 'Facture',
      montantTtc: enEuros(montant),
      lien: o.lienRetour ?? urlApp(env, `factures/${s.facture_id}`),
    });
    const payeLe = new Date(maintenant).toISOString();
    const moyen = LIBELLE_MOYEN[s.moyen] ?? s.moyen;
    await envoyerSansEchec(env, s.organization_id, 'paiement_recu_client', { ...base, payeLe, moyen, reste: enEuros(reste) }, client?.email, { nomA: client?.name });
    await envoyerSansEchec(
      env,
      s.organization_id,
      'paiement_recu_artisan',
      { ...base, payeLe, moyen, client: client?.name ?? '', lienApp: urlApp(env, `factures/${s.facture_id}`) },
      await emailArtisan(env, s.organization_id),
      { versArtisan: true },
    );
    await notifier(env, {
      entrepriseId: s.organization_id,
      type: 'paiement_recu',
      titre: `${client?.name ?? 'Votre client'} vous a payé ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(enEuros(montant))}`,
      texte: `${s.nature === 'acompte' ? 'Acompte' : 'Facture'} ${f.facture.number} · ${moyen}${reste > 0 ? ` · reste ${enEuros(reste).toFixed(2).replace('.', ',')} €` : ' · soldée'}`,
      vers: `factures/${s.facture_id}`,
      montant: enEuros(montant),
      documentType: 'facture',
      documentId: s.facture_id,
    });
  }
  return { enregistre: true, doublon: false };
}

export async function paiementEchoue(env: EnvParcours, sessionId: string, statut: 'echouee' | 'expiree') {
  const s = await lireSession(env, sessionId);
  if (!s || s.statut === 'payee') return;
  await env.DB.prepare('UPDATE paiements_sessions SET statut = ? WHERE id = ?').bind(statut, s.id).run();
  if (statut === 'echouee') {
    await notifier(env, {
      entrepriseId: s.organization_id,
      type: 'paiement_echoue',
      titre: 'Un paiement n’a pas abouti',
      texte: `${LIBELLE_MOYEN[s.moyen] ?? s.moyen} · ${enEuros(s.montant_cents).toFixed(2).replace('.', ',')} €. Le client peut réessayer depuis son lien.`,
      vers: `factures/${s.facture_id}`,
      montant: enEuros(s.montant_cents),
      documentType: 'facture',
      documentId: s.facture_id,
    });
  }
}

/**
 * Facture d'acompte liée au devis signé (réutilisée si elle existe déjà).
 * Une ligne par taux de TVA, au prorata de la proposition signée.
 * Numérotation : série dédiée « FA-AAAA-NNNN », à aligner avec le module Factures (voir README).
 */
export async function factureAcompte(env: EnvParcours, orgId: string, devisId: string, clientId: string | null, chantierId: string | null, vue: VueDevis): Promise<string> {
  const existante = await env.DB.prepare("SELECT id FROM factures WHERE organization_id = ? AND devis_id = ? AND kind = 'acompte' AND status != 'annulee' ORDER BY created_at LIMIT 1")
    .bind(orgId, devisId)
    .first<{ id: string }>();
  if (existante) return existante.id;
  const variante = vue.variantes.find((v) => v.id === vue.signature?.varianteId) ?? vue.variantes[0];
  const pct = vue.acompte.pourcent;
  if (!(pct > 0)) throw new ErreurParcours(409, 'pas_d_acompte', 'Ce devis ne prévoit pas d’acompte.');
  const lignes = variante.totaux.parTaux.map((t) => ({ taux: t.taux, ht: enEuros(Math.round((enCentimes(t.base) * pct) / 100)) }));
  const ht = lignes.reduce((s, l) => s + enCentimes(l.ht), 0);
  const tva = lignes.reduce((s, l) => s + Math.round((enCentimes(l.ht) * l.taux) / 100), 0);
  const annee = new Date().getUTCFullYear();
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM factures WHERE organization_id = ? AND number LIKE ?").bind(orgId, `FA-${annee}-%`).first<{ n: number }>();
  const numero = `FA-${annee}-${String((n?.n ?? 0) + 1).padStart(4, '0')}`;
  const id = nouvelId('fac');
  const aujourdhui = new Date().toISOString().slice(0, 10);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO factures (id, organization_id, client_id, chantier_id, devis_id, number, kind, status, issue_date, due_date, total_ht, total_tva, total_ttc, paid_amount)
       VALUES (?, ?, ?, ?, ?, ?, 'acompte', 'envoyee', ?, ?, ?, ?, ?, 0)`,
    ).bind(id, orgId, clientId, chantierId, devisId, numero, aujourdhui, aujourdhui, enEuros(ht), enEuros(tva), enEuros(ht + tva)),
    ...lignes.map((l, i) =>
      env.DB.prepare("INSERT INTO facture_lignes (id, facture_id, position, kind, designation, quantity, unit, unit_price_ht, vat_rate) VALUES (?, ?, ?, 'ouvrage', ?, 1, 'forfait', ?, ?)").bind(
        nouvelId('fl'),
        id,
        i + 1,
        `Acompte de ${pct} % sur le devis ${vue.numero}${lignes.length > 1 ? ` (TVA ${l.taux} %)` : ''}`,
        l.ht,
        l.taux,
      ),
    ),
  ]);
  return id;
}
