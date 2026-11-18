/**
 * Lecture des tables du cœur (organizations, users, clients, devis, factures, chantiers).
 * Un seul fichier à toucher si le schéma du cœur évolue. Toutes les requêtes sont cloisonnées par entreprise.
 */
import type { Emetteur } from '../../../../src/emails/types';
import type { EnvParcours } from './env';
import type { TypeDocument } from './jetons';

export interface Organisation {
  id: string;
  nom: string;
  raisonSociale: string | null;
  siret: string | null;
  tva: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  reglages: Record<string, unknown>;
}

export interface ClientRow {
  id: string;
  kind: 'particulier' | 'pro';
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  siret: string | null;
}

export interface DevisRow {
  id: string;
  organization_id: string;
  client_id: string | null;
  chantier_id: string | null;
  number: string;
  status: string;
  title: string | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  deposit_percent: number;
  created_at: string;
  sent_at: string | null;
  signed_at: string | null;
}

export interface LigneRow {
  position: number;
  kind: string;
  designation: string;
  quantity: number;
  unit: string | null;
  unit_price_ht: number;
  vat_rate: number;
}

export interface FactureRow {
  id: string;
  organization_id: string;
  client_id: string | null;
  chantier_id: string | null;
  devis_id: string | null;
  number: string;
  kind: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  paid_amount: number;
  created_at: string;
}

export interface ChantierRow {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  address: string | null;
  city: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  progress: number;
}

const parse = (s: unknown): Record<string, unknown> => {
  try {
    const v = typeof s === 'string' ? JSON.parse(s) : s;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

export async function lireOrganisation(env: EnvParcours, orgId: string): Promise<Organisation> {
  const r = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(orgId).first<Record<string, string | null>>();
  return {
    id: orgId,
    nom: r?.name ?? 'Votre artisan',
    raisonSociale: r?.legal_name ?? null,
    siret: r?.siret || null,
    tva: r?.vat_number ?? null,
    adresse: r?.address ?? null,
    ville: r?.city ?? null,
    telephone: r?.phone ?? null,
    email: r?.email ?? null,
    reglages: parse(r?.settings),
  };
}

export async function lirePatron(env: EnvParcours, orgId: string) {
  return env.DB.prepare(
    `SELECT id, email, first_name, last_name FROM users WHERE organization_id = ? ORDER BY CASE role WHEN 'patron' THEN 0 ELSE 1 END, created_at LIMIT 1`,
  )
    .bind(orgId)
    .first<{ id: string; email: string; first_name: string | null; last_name: string | null }>();
}

/** Adresse où prévenir l'artisan : e-mail de l'entreprise, sinon celui du patron. */
export async function emailArtisan(env: EnvParcours, orgId: string): Promise<string | null> {
  const org = await lireOrganisation(env, orgId);
  if (org.email) return org.email;
  return (await lirePatron(env, orgId))?.email ?? null;
}

export function initiales(texte: string): string {
  const mots = texte.trim().split(/\s+/).filter(Boolean);
  return ((mots[0]?.[0] ?? 'B') + (mots[1]?.[0] ?? '')).toUpperCase();
}

/** Émetteur des e-mails (contrat src/emails/types.ts). */
export async function emetteurDe(env: EnvParcours, orgId: string): Promise<Emetteur> {
  const org = await lireOrganisation(env, orgId);
  const p = await lirePatron(env, orgId);
  const prenom = p?.first_name ?? '';
  const nom = p?.last_name ?? '';
  return {
    entreprise: org.nom,
    prenom,
    nom,
    telephone: org.telephone ?? '',
    email: org.email ?? p?.email ?? '',
    ville: org.ville ?? '',
    initiales: initiales(prenom || nom ? `${prenom} ${nom}` : org.nom),
    siret: org.siret ?? undefined,
  };
}

export async function lireClient(env: EnvParcours, orgId: string, clientId: string | null): Promise<ClientRow | null> {
  if (!clientId) return null;
  return env.DB.prepare('SELECT id, kind, name, contact, email, phone, address, city, siret FROM clients WHERE id = ? AND organization_id = ?')
    .bind(clientId, orgId)
    .first<ClientRow>();
}

export async function lireDevis(env: EnvParcours, orgId: string, id: string) {
  const devis = await env.DB.prepare('SELECT * FROM devis WHERE id = ? AND organization_id = ?').bind(id, orgId).first<DevisRow>();
  if (!devis) return null;
  const lignes = await env.DB.prepare(
    'SELECT position, kind, designation, quantity, unit, unit_price_ht, vat_rate FROM devis_lignes WHERE devis_id = ? ORDER BY position',
  )
    .bind(id)
    .all<LigneRow>();
  return { devis, lignes: lignes.results ?? [] };
}

export async function lireFacture(env: EnvParcours, orgId: string, id: string) {
  const facture = await env.DB.prepare('SELECT * FROM factures WHERE id = ? AND organization_id = ?').bind(id, orgId).first<FactureRow>();
  if (!facture) return null;
  const lignes = await env.DB.prepare(
    'SELECT position, kind, designation, quantity, unit, unit_price_ht, vat_rate FROM facture_lignes WHERE facture_id = ? ORDER BY position',
  )
    .bind(id)
    .all<LigneRow>();
  return { facture, lignes: lignes.results ?? [] };
}

export async function lireChantier(env: EnvParcours, orgId: string, id: string) {
  return env.DB.prepare('SELECT * FROM chantiers WHERE id = ? AND organization_id = ?').bind(id, orgId).first<ChantierRow>();
}

export async function lireComplements(env: EnvParcours, orgId: string, type: TypeDocument, id: string) {
  const r = await env.DB.prepare('SELECT donnees, version FROM documents_complements WHERE organization_id = ? AND type = ? AND document_id = ?')
    .bind(orgId, type, id)
    .first<{ donnees: string; version: number }>();
  return { donnees: parse(r?.donnees), version: r?.version ?? 1 };
}

export async function ecrireComplements(env: EnvParcours, orgId: string, type: TypeDocument, id: string, donnees: Record<string, unknown>) {
  await env.DB.prepare(
    `INSERT INTO documents_complements (organization_id, type, document_id, donnees, version, updated_at) VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(organization_id, type, document_id) DO UPDATE SET donnees = excluded.donnees, version = documents_complements.version + 1, updated_at = excluded.updated_at`,
  )
    .bind(orgId, type, id, JSON.stringify(donnees), Date.now())
    .run();
}

export async function documentExiste(env: EnvParcours, orgId: string, type: TypeDocument, id: string): Promise<boolean> {
  const table = type === 'devis' ? 'devis' : type === 'facture' ? 'factures' : 'chantiers';
  const r = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ? AND organization_id = ?`).bind(id, orgId).first();
  return !!r;
}

export async function journaliser(env: EnvParcours, orgId: string, type: TypeDocument, id: string, evenement: string, donnees: Record<string, unknown> = {}) {
  await env.DB.prepare('INSERT INTO documents_evenements (id, organization_id, type, document_id, evenement, donnees, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(`evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`, orgId, type, id, evenement, JSON.stringify(donnees), Date.now())
    .run();
}
