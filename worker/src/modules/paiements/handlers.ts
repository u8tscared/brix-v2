/**
 * Service paiements : paiement d'une facture, acompte après signature, webhooks Stripe et Alma,
 * compte Stripe Connect de l'artisan. Sans STRIPE_SECRET_KEY : mode simulation (page de démo).
 */
import { ErreurParcours, JOUR_MS, aleatoire, b64url, enEuros, isoMs, limiter } from '../documents/commun';
import type { EnvParcours } from '../documents/env';
import { lienPublic } from '../documents/handlers';
import { urlApp, urlPublique } from '../documents/jetons';
import { construireVueDevis, construireVueFacture } from '../documents/vues';
import { ETATS_ALMA_PAYES, creerPaiementAlma, lirePaiementAlma } from './alma';
import { enregistrerPaiement, factureAcompte, lireSession, paiementEchoue } from './enregistrement';
import { compteConnect, moyensDisponibles, ribArtisan } from './moyens';
import { ErreurStripe, commissionCents, stripe, verifierSignatureStripe, type SessionCheckout } from './stripe';

type Moyen = 'carte' | 'virement' | '3x';
const moyenValide = (v: unknown): Moyen => {
  if (v === 'carte' || v === 'virement' || v === '3x') return v;
  throw new ErreurParcours(400, 'moyen_invalide', 'Moyen de paiement inconnu (carte, virement ou 3x).');
};

const apiBase = (env: EnvParcours) => (env.PUBLIC_BASE_URL ?? env.APP_ORIGIN).replace(/\/+$/, '');

export type ResultatPaiement =
  | { mode: 'redirection'; url: string; sessionId: string; simulation: boolean; montant: number }
  | { mode: 'instructions'; iban: string; bic: string | null; titulaire: string; reference: string; montant: number };

async function demarrer(
  env: EnvParcours,
  o: { orgId: string; factureId: string; devisId: string | null; nature: 'facture' | 'acompte'; moyen: Moyen; retour: string; libelle: string; reference: string },
): Promise<ResultatPaiement> {
  const { vue, interne } = await construireVueFacture(env, o.orgId, o.factureId);
  const montant = interne.resteCents;
  if (montant <= 0) throw new ErreurParcours(409, 'deja_payee', 'Cette facture est déjà réglée. Merci !');
  const moyens = await moyensDisponibles(env, o.orgId, montant, interne.complements);
  const client = interne.client;

  if (o.moyen === 'virement' && moyens.virement.mode === 'rib') {
    const rib = await ribArtisan(env, o.orgId, interne.complements);
    if (!rib) throw new ErreurParcours(409, 'moyen_indisponible', "Le virement n'est pas encore proposé par cette entreprise. Contactez-la directement.");
    return { mode: 'instructions', ...rib, reference: o.reference, montant: enEuros(montant) };
  }
  if (o.moyen === 'carte' && !moyens.carte.disponible) throw new ErreurParcours(409, 'moyen_indisponible', "Le paiement par carte n'est pas encore activé par cette entreprise.");
  if (o.moyen === '3x' && !moyens.troisFois.disponible) throw new ErreurParcours(409, 'moyen_indisponible', "Le paiement en 3 fois n'est pas proposé pour ce document.");

  const id = `pay_${b64url(aleatoire(16))}`;
  const fournisseur = o.moyen === '3x' ? 'alma' : env.STRIPE_SECRET_KEY ? 'stripe' : 'simulation';
  const commission = fournisseur === 'stripe' ? commissionCents(env, montant) : 0;
  await env.DB.prepare(
    `INSERT INTO paiements_sessions (id, organization_id, facture_id, devis_id, nature, moyen, fournisseur, montant_cents, commission_cents, statut, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ouverte', ?)`,
  )
    .bind(id, o.orgId, o.factureId, o.devisId, o.nature, o.moyen, fournisseur, montant, commission, Date.now())
    .run();
  const sep = o.retour.includes('?') ? '&' : '?';
  let url: string;
  let reference: string;

  if (fournisseur === 'simulation') {
    url = `${apiBase(env)}/#/paiement-demo/${id}`;
    reference = id;
  } else if (fournisseur === 'alma') {
    const p = await creerPaiementAlma(env, {
      montantCents: montant,
      sessionId: id,
      retour: `${o.retour}${sep}paiement=ok`,
      annulation: `${o.retour}${sep}paiement=annule`,
      ipn: `${apiBase(env)}/api/paiements/webhook/alma`,
      client: { email: client?.email, nom: client?.name },
    });
    url = p.url;
    reference = p.id;
  } else {
    const compte = await compteConnect(env, o.orgId);
    let customer: string | undefined;
    if (o.moyen === 'virement') {
      // Le virement Stripe (customer_balance) exige un client Stripe : il porte l'IBAN virtuel dédié.
      const c = await stripe<{ id: string }>(env, 'POST', '/customers', { email: client?.email ?? undefined, name: client?.name ?? undefined, metadata: { brix_org: o.orgId } }, { idempotence: `cus_${id}` });
      customer = c.id;
    }
    const s = await stripe<SessionCheckout>(
      env,
      'POST',
      '/checkout/sessions',
      {
        mode: 'payment',
        locale: 'fr',
        client_reference_id: id,
        customer,
        customer_email: customer ? undefined : (client?.email ?? undefined),
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: montant, product_data: { name: o.libelle } } }],
        // Carte : aucun payment_method_types → moyens dynamiques (carte, Apple Pay, Google Pay selon le tableau de bord Stripe).
        payment_method_types: o.moyen === 'virement' ? ['customer_balance'] : undefined,
        payment_method_options:
          o.moyen === 'virement' ? { customer_balance: { funding_type: 'bank_transfer', bank_transfer: { type: 'eu_bank_transfer', eu_bank_transfer: { country: 'FR' } } } } : undefined,
        payment_intent_data: {
          description: o.libelle,
          metadata: { brix_session: id, brix_facture: vue.numero },
          transfer_data: { destination: compte?.stripe_account_id },
          application_fee_amount: commission > 0 ? commission : undefined,
        },
        metadata: { brix_session: id, brix_org: o.orgId },
        success_url: `${o.retour}${sep}paiement=ok`,
        cancel_url: `${o.retour}${sep}paiement=annule`,
      },
      { idempotence: id },
    ).catch((e) => {
      console.error('[paiements] stripe', e instanceof ErreurStripe ? `${e.status} ${e.code} ${e.message}` : e);
      throw new ErreurParcours(502, 'paiement_indisponible', 'Le paiement en ligne est momentanément indisponible. Réessayez dans un instant.');
    });
    url = s.url;
    reference = s.id;
  }
  await env.DB.prepare('UPDATE paiements_sessions SET reference_externe = ?, url = ? WHERE id = ?').bind(reference, url, id).run();
  return { mode: 'redirection', url, sessionId: id, simulation: fournisseur === 'simulation', montant: enEuros(montant) };
}

export async function payerFacture(env: EnvParcours, jeton: string, request: Request, body: Record<string, unknown>) {
  const lien = await lienPublic(env, 'facture', jeton, request);
  await limiter(env, `payer:${lien.id}`, 10, 600_000);
  const { vue } = await construireVueFacture(env, lien.organization_id, lien.document_id);
  return demarrer(env, {
    orgId: lien.organization_id,
    factureId: lien.document_id,
    devisId: null,
    nature: 'facture',
    moyen: moyenValide(body.moyen),
    retour: urlPublique(env, 'facture', jeton),
    libelle: `Facture ${vue.numero} · ${vue.entreprise.nom}`,
    reference: vue.numero,
  });
}

/** Acompte après signature. Hors établissement (particulier) : aucun paiement avant 7 jours (C. consom. L221-10). */
export async function demanderAcompte(env: EnvParcours, jeton: string, request: Request, body: Record<string, unknown>) {
  const lien = await lienPublic(env, 'devis', jeton, request);
  await limiter(env, `acompte:${lien.id}`, 10, 600_000);
  const { vue, interne } = await construireVueDevis(env, lien.organization_id, lien.document_id);
  if (vue.statut !== 'signe' || !vue.signature) throw new ErreurParcours(409, 'non_signe', 'Le devis doit être signé avant le versement de l’acompte.');
  if (vue.retractation.applicable) {
    const disponibleLe = vue.signature.signeLe + 7 * JOUR_MS;
    if (Date.now() < disponibleLe)
      throw new ErreurParcours(409, 'acompte_trop_tot', 'La loi interdit de verser un paiement dans les 7 jours qui suivent la signature d’un contrat conclu hors établissement.', {
        disponibleLe: isoMs(disponibleLe),
      });
  }
  const factureId = await factureAcompte(env, lien.organization_id, lien.document_id, interne.devis.client_id, interne.devis.chantier_id, vue);
  const numero = (await env.DB.prepare('SELECT number FROM factures WHERE id = ?').bind(factureId).first<{ number: string }>())?.number ?? '';
  const r = await demarrer(env, {
    orgId: lien.organization_id,
    factureId,
    devisId: lien.document_id,
    nature: 'acompte',
    moyen: moyenValide(body.moyen ?? 'carte'),
    retour: urlPublique(env, 'devis', jeton),
    libelle: `Acompte ${vue.acompte.pourcent} % · devis ${vue.numero} · ${vue.entreprise.nom}`,
    reference: numero,
  });
  return { ...r, facture: { numero } };
}

/** Page de démo (sans clé Stripe) : le bouton « Payer » de la démo appelle cette route. */
export async function confirmerDemo(env: EnvParcours, sessionId: string) {
  if (env.STRIPE_SECRET_KEY) throw new ErreurParcours(404, 'introuvable', 'Session introuvable.');
  const s = await lireSession(env, sessionId);
  if (!s || s.fournisseur !== 'simulation') throw new ErreurParcours(404, 'introuvable', 'Session introuvable.');
  if (s.statut === 'payee') return { ok: true, deja: true };
  await enregistrerPaiement(env, { sessionId: s.id, montantCents: s.montant_cents, reference: `sim_${s.id}` });
  return { ok: true, simulation: true, montant: enEuros(s.montant_cents) };
}

export async function lireSessionDemo(env: EnvParcours, sessionId: string) {
  const s = await lireSession(env, sessionId);
  if (!s || s.fournisseur !== 'simulation') throw new ErreurParcours(404, 'introuvable', 'Session introuvable.');
  const f = await env.DB.prepare('SELECT number FROM factures WHERE id = ?').bind(s.facture_id).first<{ number: string }>();
  const org = await env.DB.prepare('SELECT name FROM organizations WHERE id = ?').bind(s.organization_id).first<{ name: string }>();
  return { montant: enEuros(s.montant_cents), moyen: s.moyen, statut: s.statut, facture: f?.number ?? '', entreprise: org?.name ?? '' };
}

// ---------- Webhooks ----------

interface EvenementStripe {
  id: string;
  type: string;
  account?: string;
  data: { object: Record<string, unknown> };
}

export async function webhookStripe(env: EnvParcours, request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new ErreurParcours(503, 'non_configure', 'Webhook non configuré.');
  const corps = await request.text();
  if (corps.length > 1_000_000) throw new ErreurParcours(413, 'trop_gros', 'Requête trop volumineuse.');
  const entete = request.headers.get('stripe-signature');
  // Deux points de terminaison possibles chez Stripe (compte plateforme et comptes connectés), chacun son secret.
  const valide =
    (await verifierSignatureStripe(corps, entete, env.STRIPE_WEBHOOK_SECRET)) ||
    (!!env.STRIPE_CONNECT_WEBHOOK_SECRET && (await verifierSignatureStripe(corps, entete, env.STRIPE_CONNECT_WEBHOOK_SECRET)));
  if (!valide) throw new ErreurParcours(400, 'signature_invalide', 'Signature invalide.');
  const evt = JSON.parse(corps) as EvenementStripe;
  if (typeof evt.id !== 'string' || typeof evt.type !== 'string') throw new ErreurParcours(400, 'evenement_invalide', 'Événement invalide.');

  // Anti-rejeu : un événement déjà traité est acquitté sans effet.
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO paiements_webhooks (id, fournisseur, type, recu_le) VALUES (?, ?, ?, ?)').bind(evt.id, 'stripe', evt.type, Date.now()).run();
  if ((ins.meta?.changes ?? 0) === 0) return { recu: true, doublon: true };
  try {
    const o = evt.data?.object ?? {};
    const sessionId = (o.metadata as Record<string, string> | undefined)?.brix_session ?? (o.client_reference_id as string | undefined);
    switch (evt.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (!sessionId) break;
        if (o.payment_status === 'paid') {
          await enregistrerPaiement(env, { sessionId, montantCents: Number(o.amount_total) || 0, reference: String(o.payment_intent ?? o.id) });
        } else {
          await env.DB.prepare("UPDATE paiements_sessions SET statut = 'en_attente' WHERE id = ? AND statut = 'ouverte'").bind(sessionId).run();
        }
        break;
      case 'checkout.session.async_payment_failed':
        if (sessionId) await paiementEchoue(env, sessionId, 'echouee');
        break;
      case 'checkout.session.expired':
        if (sessionId) await paiementEchoue(env, sessionId, 'expiree');
        break;
      case 'account.updated':
        await env.DB.prepare('UPDATE paiements_comptes SET charges_actives = ?, virements_actifs = ?, maj_le = ? WHERE stripe_account_id = ?')
          .bind(o.charges_enabled ? 1 : 0, o.payouts_enabled ? 1 : 0, Date.now(), String(o.id))
          .run();
        break;
    }
    return { recu: true };
  } catch (e) {
    // On libère l'événement pour que Stripe le renvoie.
    await env.DB.prepare('DELETE FROM paiements_webhooks WHERE id = ?').bind(evt.id).run();
    throw e;
  }
}

/** IPN Alma : on relit le paiement chez Alma (jamais de confiance dans l'appel entrant). */
export async function ipnAlma(env: EnvParcours, request: Request) {
  if (!env.ALMA_API_KEY) throw new ErreurParcours(503, 'non_configure', 'Alma non configuré.');
  const pid = new URL(request.url).searchParams.get('pid') ?? '';
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(pid)) throw new ErreurParcours(400, 'evenement_invalide', 'Identifiant invalide.');
  const p = await lirePaiementAlma(env, pid);
  const sessionId = p.custom_data?.brix_session;
  const s = sessionId ? await lireSession(env, sessionId) : null;
  if (!s || s.reference_externe !== p.id) throw new ErreurParcours(404, 'introuvable', 'Paiement inconnu.');
  if (ETATS_ALMA_PAYES.includes(p.state)) await enregistrerPaiement(env, { sessionId: s.id, montantCents: p.purchase_amount, reference: `alma_${p.id}` });
  return { recu: true };
}

// ---------- Stripe Connect (artisan connecté) ----------

export async function connectStatut(env: EnvParcours, orgId: string) {
  if (!env.STRIPE_SECRET_KEY) return { configure: false, simulation: true, chargesActives: false };
  const c = await compteConnect(env, orgId);
  if (!c?.stripe_account_id) return { configure: true, compte: null, chargesActives: false };
  const a = await stripe<{ charges_enabled: boolean; payouts_enabled: boolean; requirements?: { currently_due?: string[] } }>(env, 'GET', `/accounts/${c.stripe_account_id}`);
  await env.DB.prepare('UPDATE paiements_comptes SET charges_actives = ?, virements_actifs = ?, maj_le = ? WHERE organization_id = ?')
    .bind(a.charges_enabled ? 1 : 0, a.payouts_enabled ? 1 : 0, Date.now(), orgId)
    .run();
  return { configure: true, compte: c.stripe_account_id, chargesActives: a.charges_enabled, virementsActifs: a.payouts_enabled, aCompleter: a.requirements?.currently_due?.length ?? 0 };
}

/** Crée (si besoin) le compte Express de l'artisan et renvoie le lien d'inscription Stripe. */
export async function connectInscription(env: EnvParcours, orgId: string) {
  if (!env.STRIPE_SECRET_KEY) return { simulation: true, url: urlApp(env, 'reglages?paiements=demo') };
  let c = await compteConnect(env, orgId);
  if (!c?.stripe_account_id) {
    const org = await env.DB.prepare('SELECT name, email FROM organizations WHERE id = ?').bind(orgId).first<{ name: string; email: string | null }>();
    const a = await stripe<{ id: string }>(
      env,
      'POST',
      '/accounts',
      {
        type: 'express',
        country: 'FR',
        email: org?.email ?? undefined,
        business_profile: { name: org?.name }, // le code d'activité (MCC) est demandé par Stripe pendant l'inscription
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { brix_org: orgId },
      },
      { idempotence: `acct_${orgId}` },
    );
    await env.DB.prepare('INSERT INTO paiements_comptes (organization_id, stripe_account_id, charges_actives, maj_le) VALUES (?, ?, 0, ?) ON CONFLICT(organization_id) DO UPDATE SET stripe_account_id = excluded.stripe_account_id')
      .bind(orgId, a.id, Date.now())
      .run();
    c = { stripe_account_id: a.id, charges_actives: 0 };
  }
  const l = await stripe<{ url: string }>(env, 'POST', '/account_links', {
    account: c.stripe_account_id,
    type: 'account_onboarding',
    refresh_url: urlApp(env, 'reglages?paiements=relancer'),
    return_url: urlApp(env, 'reglages?paiements=retour'),
  });
  return { simulation: false, url: l.url };
}
