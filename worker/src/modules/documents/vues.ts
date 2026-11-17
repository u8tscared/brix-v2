/**
 * Vues publiques (ce que voit le client sur /d/, /f/, /p/) et document canonique (ce qui est signé).
 * Jamais de coût d'achat, de marge ni d'identifiant interne dans une vue publique.
 */
import type { EnvParcours } from './env';
import { ErreurParcours, JOUR_MS, dateMs, enCentimes, enEuros, jsonCanonique, sha256Hex } from './commun';
import { mentionsDevis } from '../signature/mentions';
import { initiales, lireClient, lireComplements, lireDevis, lireFacture, lireOrganisation, type ClientRow, type LigneRow, type Organisation } from './sources';

// ---------- Compléments (saisis par l'artisan, validés strictement) ----------

export interface LigneVue {
  type: string;
  designation: string;
  detail?: string;
  quantite: number;
  unite: string;
  prixUnitaireHt: number;
  tva: number;
  totalHt: number;
}

export interface Complements {
  titre?: string;
  notes?: string;
  message?: string;
  validiteJours?: number;
  horsEtablissement?: boolean;
  delaiExecution?: string;
  dateDebutPrevue?: string;
  iban?: string;
  bic?: string;
  titulaire?: string;
  conditions?: Record<string, string>;
  cgv?: { url?: string; texte?: string };
  aides?: { libelle: string; montant: number }[];
  variantes?: { id: string; titre: string; description?: string; lignes: Omit<LigneVue, 'totalHt'>[] }[];
  etapes?: { titre: string; date?: string; fait: boolean }[];
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const liste = <T>(v: unknown, max: number, f: (x: Record<string, unknown>) => T | undefined): T[] | undefined =>
  Array.isArray(v) ? v.slice(0, max).filter((x) => x && typeof x === 'object').map((x) => f(x as Record<string, unknown>)).filter((x): x is T => x !== undefined) : undefined;

function ligneSaisie(x: Record<string, unknown>): Omit<LigneVue, 'totalHt'> | undefined {
  const designation = str(x.designation, 500);
  if (!designation) return undefined;
  return {
    type: str(x.type, 20) ?? 'ouvrage',
    designation,
    detail: str(x.detail, 2000),
    quantite: num(x.quantite, -1e6, 1e6) ?? 1,
    unite: str(x.unite, 20) ?? 'u',
    prixUnitaireHt: num(x.prixUnitaireHt, -1e7, 1e7) ?? 0,
    tva: num(x.tva, 0, 30) ?? 20,
  };
}

/** Valide et nettoie les compléments envoyés par l'app. Tout champ inconnu ou mal typé est ignoré. */
export function nettoyerComplements(v: Record<string, unknown>): Complements {
  const c: Complements = {
    titre: str(v.titre, 200),
    notes: str(v.notes, 5000),
    message: str(v.message, 2000),
    validiteJours: num(v.validiteJours, 1, 365),
    horsEtablissement: typeof v.horsEtablissement === 'boolean' ? v.horsEtablissement : undefined,
    delaiExecution: str(v.delaiExecution, 200),
    dateDebutPrevue: str(v.dateDebutPrevue, 40),
    iban: str(v.iban, 40)?.replace(/\s+/g, ''),
    bic: str(v.bic, 15),
    titulaire: str(v.titulaire, 140),
  };
  if (c.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(c.iban)) throw new ErreurParcours(400, 'iban_invalide', "L'IBAN n'est pas valide.");
  if (v.conditions && typeof v.conditions === 'object' && !Array.isArray(v.conditions)) {
    c.conditions = Object.fromEntries(
      Object.entries(v.conditions as Record<string, unknown>)
        .slice(0, 20)
        .map(([k, x]) => [k.slice(0, 60), str(x, 2000)])
        .filter((e): e is [string, string] => !!e[1]),
    );
  }
  if (v.cgv && typeof v.cgv === 'object') {
    const g = v.cgv as Record<string, unknown>;
    const url = str(g.url, 500);
    c.cgv = { url: url && /^https:\/\//.test(url) ? url : undefined, texte: str(g.texte, 20000) };
  }
  c.aides = liste(v.aides, 10, (x) => {
    const libelle = str(x.libelle, 200);
    const montant = num(x.montant, 0, 1e6);
    return libelle && montant !== undefined ? { libelle, montant } : undefined;
  });
  c.variantes = liste(v.variantes, 5, (x) => {
    const id = str(x.id, 40);
    const titre = str(x.titre, 200);
    const lignes = liste(x.lignes, 200, ligneSaisie) ?? [];
    return id && titre && id !== 'base' ? { id, titre, description: str(x.description, 2000), lignes } : undefined;
  });
  c.etapes = liste(v.etapes, 50, (x) => {
    const titre = str(x.titre, 200);
    return titre ? { titre, date: str(x.date, 40), fait: x.fait === true } : undefined;
  });
  return JSON.parse(JSON.stringify(c)) as Complements; // retire les undefined
}

// ---------- Totaux (centimes, arrondi par ligne) ----------

export interface Totaux {
  ht: number;
  tva: number;
  ttc: number;
  parTaux: { taux: number; base: number; montant: number }[];
}

const COMPTE = (type: string) => type !== 'section' && type !== 'texte';

export function totaux(lignes: Pick<LigneVue, 'type' | 'totalHt' | 'tva'>[]): Totaux {
  const taux = new Map<number, number>();
  for (const l of lignes) if (COMPTE(l.type)) taux.set(l.tva, (taux.get(l.tva) ?? 0) + enCentimes(l.totalHt));
  const parTaux = [...taux.entries()].sort((a, b) => a[0] - b[0]).map(([t, base]) => ({ taux: t, base, montant: Math.round((base * t) / 100) }));
  const ht = parTaux.reduce((s, x) => s + x.base, 0);
  const tva = parTaux.reduce((s, x) => s + x.montant, 0);
  return { ht: enEuros(ht), tva: enEuros(tva), ttc: enEuros(ht + tva), parTaux: parTaux.map((x) => ({ taux: x.taux, base: enEuros(x.base), montant: enEuros(x.montant) })) };
}

const avecTotal = (l: Omit<LigneVue, 'totalHt'>): LigneVue => ({ ...l, totalHt: COMPTE(l.type) ? enEuros(Math.round(l.quantite * l.prixUnitaireHt * 100)) : 0 });

const depuisRow = (l: LigneRow): LigneVue =>
  avecTotal({ type: l.kind, designation: l.designation, quantite: l.quantity, unite: l.unit ?? 'u', prixUnitaireHt: l.unit_price_ht, tva: l.vat_rate });

// ---------- Blocs communs ----------

const vueEntreprise = (o: Organisation) => ({
  nom: o.nom,
  raisonSociale: o.raisonSociale,
  siret: o.siret,
  tva: o.tva,
  adresse: o.adresse,
  ville: o.ville,
  telephone: o.telephone,
  email: o.email,
  initiales: initiales(o.nom),
  assurance: typeof o.reglages.decennale === 'string' ? o.reglages.decennale : null,
});

const vueClient = (c: ClientRow | null) => (c ? { nom: c.name, type: c.kind, contact: c.contact, adresse: c.address, ville: c.city } : null);

/** Hors établissement + particulier : droit de rétractation de 14 jours (C. consom. L221-18). */
export const retractationApplicable = (client: ClientRow | null, c: Complements) => client?.kind !== 'pro' && c.horsEtablissement === true;

// ---------- Devis ----------

export async function construireVueDevis(env: EnvParcours, orgId: string, devisId: string) {
  const d = await lireDevis(env, orgId, devisId);
  if (!d) throw new ErreurParcours(404, 'document_introuvable', "Ce document n'est plus disponible.");
  const { devis } = d;
  const [org, client, comp] = await Promise.all([lireOrganisation(env, orgId), lireClient(env, orgId, devis.client_id), lireComplements(env, orgId, 'devis', devisId)]);
  const c = nettoyerComplements(comp.donnees);
  const lignes = d.lignes.map(depuisRow);
  const tot = totaux(lignes);
  const variantes = [
    { id: 'base', titre: 'Proposition principale', description: undefined as string | undefined, lignes, totaux: tot },
    ...(c.variantes ?? []).map((v) => {
      const ls = v.lignes.map(avecTotal);
      return { id: v.id, titre: v.titre, description: v.description, lignes: ls, totaux: totaux(ls) };
    }),
  ];
  const emisMs = dateMs(devis.sent_at) ?? dateMs(devis.created_at) ?? Date.now();
  const validiteJours = c.validiteJours ?? 30;
  const valableJusquau = emisMs + validiteJours * JOUR_MS;

  let signature: { signeLe: number; signataire: string; empreinte: string; varianteId: string; retractationFin: number | null; demarrageAnticipe: boolean } | null = null;
  try {
    const p = await env.DB.prepare(
      `SELECT signe_le, signataire_nom, empreinte_sha256, variante_id, retractation_fin, demarrage_anticipe FROM signature_preuves
       WHERE organization_id = ? AND devis_id = ? AND statut = 'signe' ORDER BY signe_le DESC LIMIT 1`,
    )
      .bind(orgId, devisId)
      .first<{ signe_le: number; signataire_nom: string; empreinte_sha256: string; variante_id: string; retractation_fin: number | null; demarrage_anticipe: number }>();
    if (p) signature = { signeLe: p.signe_le, signataire: p.signataire_nom, empreinte: p.empreinte_sha256, varianteId: p.variante_id, retractationFin: p.retractation_fin, demarrageAnticipe: !!p.demarrage_anticipe };
  } catch {
    // module signature absent : pas de bloc signature
  }
  const refus = await env.DB.prepare(`SELECT donnees, created_at FROM documents_evenements WHERE organization_id = ? AND type = 'devis' AND document_id = ? AND evenement = 'refus' ORDER BY created_at DESC LIMIT 1`)
    .bind(orgId, devisId)
    .first<{ donnees: string; created_at: number }>();

  const statut =
    devis.status === 'signe' || signature ? 'signe' : devis.status === 'refuse' ? 'refuse' : devis.status === 'expire' || valableJusquau < Date.now() ? 'expire' : 'a_signer';
  const varianteSignee = variantes.find((v) => v.id === signature?.varianteId) ?? variantes[0];
  const aides = c.aides ?? [];
  const totalAides = aides.reduce((s, a) => s + a.montant, 0);

  return {
    interne: { devis, client, complements: c, version: comp.version, org },
    vue: {
      type: 'devis' as const,
      numero: devis.number,
      titre: c.titre ?? devis.title ?? '',
      statut,
      emisLe: emisMs,
      valableJusquau,
      version: comp.version,
      entreprise: vueEntreprise(org),
      client: vueClient(client),
      lignes,
      totaux: tot,
      variantes,
      aides,
      resteAChargeTtc: aides.length ? enEuros(enCentimes(varianteSignee.totaux.ttc) - enCentimes(totalAides)) : null,
      conditions: { validiteJours, delaiExecution: c.delaiExecution ?? null, dateDebutPrevue: c.dateDebutPrevue ?? null, ...(c.conditions ?? {}) },
      cgv: c.cgv ?? null,
      acompte: { pourcent: devis.deposit_percent, montant: enEuros(Math.round((enCentimes(varianteSignee.totaux.ttc) * devis.deposit_percent) / 100)) },
      notes: c.notes ?? null,
      message: c.message ?? null,
      retractation: { applicable: retractationApplicable(client, c), jours: 14 },
      mentions: mentionsDevis(devis.number, { cgv: !!c.cgv, retractation: retractationApplicable(client, c) }),
      signature,
      refus: refus ? { le: refus.created_at, motif: (JSON.parse(refus.donnees) as { motif?: string }).motif ?? null } : null,
    },
  };
}

export type VueDevis = Awaited<ReturnType<typeof construireVueDevis>>['vue'];

/** Document canonique signé : tout ce qui engage, rien de ce qui change après coup (statut, ouvertures). */
export function documentCanonique(vue: VueDevis, varianteId: string) {
  const v = vue.variantes.find((x) => x.id === varianteId);
  if (!v) throw new ErreurParcours(400, 'variante_inconnue', "Cette proposition n'existe pas.");
  const sansVide = (l: LigneVue) => ({ ...l, detail: l.detail ?? null });
  return {
    schema: 'brix-devis-signe-v1',
    numero: vue.numero,
    version: vue.version,
    titre: vue.titre,
    emisLe: new Date(vue.emisLe).toISOString(),
    valableJusquau: new Date(vue.valableJusquau).toISOString(),
    entreprise: { nom: vue.entreprise.nom, raisonSociale: vue.entreprise.raisonSociale, siret: vue.entreprise.siret, tva: vue.entreprise.tva, adresse: vue.entreprise.adresse },
    client: vue.client ? { nom: vue.client.nom, type: vue.client.type, adresse: vue.client.adresse, ville: vue.client.ville } : null,
    varianteChoisie: { id: v.id, titre: v.titre, lignes: v.lignes.map(sansVide), totaux: v.totaux },
    autresPropositions: vue.variantes.filter((x) => x.id !== v.id).map((x) => ({ id: x.id, titre: x.titre, totalTtc: x.totaux.ttc })),
    aides: vue.aides,
    conditions: vue.conditions,
    cgv: vue.cgv,
    acompte: { pourcent: vue.acompte.pourcent, montant: enEuros(Math.round((enCentimes(v.totaux.ttc) * vue.acompte.pourcent) / 100)) },
    retractation: vue.retractation,
  };
}

export async function empreinte(canonique: unknown): Promise<{ json: string; sha256: string }> {
  const json = jsonCanonique(canonique);
  return { json, sha256: await sha256Hex(json) };
}

// ---------- Facture ----------

export async function construireVueFacture(env: EnvParcours, orgId: string, factureId: string) {
  const f = await lireFacture(env, orgId, factureId);
  if (!f) throw new ErreurParcours(404, 'document_introuvable', "Ce document n'est plus disponible.");
  const { facture } = f;
  const [org, client, comp] = await Promise.all([lireOrganisation(env, orgId), lireClient(env, orgId, facture.client_id), lireComplements(env, orgId, 'facture', factureId)]);
  const c = nettoyerComplements(comp.donnees);
  const lignes = f.lignes.map(depuisRow);
  const tot = lignes.length ? totaux(lignes) : { ht: facture.total_ht, tva: facture.total_tva, ttc: facture.total_ttc, parTaux: [] };
  const ttcCents = enCentimes(tot.ttc);
  const payeCents = enCentimes(facture.paid_amount);
  const resteCents = Math.max(0, ttcCents - payeCents);
  const echeance = dateMs(facture.due_date);
  const statut =
    facture.status === 'annulee' ? 'annulee' : resteCents === 0 && ttcCents > 0 ? 'payee' : payeCents > 0 ? 'partielle' : echeance && echeance < Date.now() ? 'en_retard' : 'a_payer';
  return {
    interne: { facture, client, complements: c, org, resteCents },
    vue: {
      type: 'facture' as const,
      numero: facture.number,
      nature: facture.kind,
      titre: c.titre ?? '',
      statut,
      emiseLe: dateMs(facture.issue_date) ?? dateMs(facture.created_at),
      echeance,
      entreprise: vueEntreprise(org),
      client: vueClient(client),
      lignes,
      totaux: tot,
      dejaPaye: enEuros(payeCents),
      reste: enEuros(resteCents),
      conditions: c.conditions ?? {},
      notes: c.notes ?? null,
      message: c.message ?? null,
      // Mentions B2B obligatoires (C. com. L441-10) : pénalités et indemnité forfaitaire de 40 €.
      mentionsPro: client?.kind === 'pro' ? { indemniteForfaitaire: 40 } : null,
    },
  };
}
