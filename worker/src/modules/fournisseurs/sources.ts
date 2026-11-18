/**
 * Adaptateurs vers les tables du cœur de l'app (devis, chantiers, entreprise).
 * Un seul fichier à toucher si le schéma du thread « app » évolue.
 */

import type { Env } from '../../env';
import type { DevisLigneSource } from './types';

export interface DevisResume {
  id: string;
  number: string | null;
  title: string | null;
  status: string | null;
  chantier_id: string | null;
  client_id: string | null;
}

export interface ChantierResume {
  id: string;
  name: string;
  address: string | null;
  status: string | null;
  start_date: string | number | null;
}

export interface EntrepriseResume {
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  siret: string | null;
}

export async function lireDevis(env: Env, orgId: string, devisId: string): Promise<DevisResume | null> {
  return env.DB.prepare(
    `SELECT id, number, title, status, chantier_id, client_id FROM devis WHERE id = ? AND organization_id = ?`,
  )
    .bind(devisId, orgId)
    .first<DevisResume>();
}

export async function lireLignesDevis(env: Env, orgId: string, devisId: string): Promise<DevisLigneSource[]> {
  const res = await env.DB.prepare(
    `SELECT l.id, l.devis_id, l.position, l.kind, l.designation, l.quantity, l.unit, l.unit_price_ht, l.unit_cost_ht, l.vat_rate, l.supplier_ref
     FROM devis_lignes l JOIN devis d ON d.id = l.devis_id
     WHERE l.devis_id = ? AND d.organization_id = ? ORDER BY l.position`,
  )
    .bind(devisId, orgId)
    .all<DevisLigneSource>();
  return res.results ?? [];
}

export async function lireChantier(env: Env, orgId: string, chantierId: string): Promise<ChantierResume | null> {
  return env.DB.prepare(`SELECT id, name, address, status, start_date FROM chantiers WHERE id = ? AND organization_id = ?`)
    .bind(chantierId, orgId)
    .first<ChantierResume>();
}

/** Devis acceptés/signés d'un chantier (pour « commander tout le chantier »). */
export async function devisDuChantier(env: Env, orgId: string, chantierId: string): Promise<DevisResume[]> {
  const res = await env.DB.prepare(
    `SELECT id, number, title, status, chantier_id, client_id FROM devis
     WHERE organization_id = ? AND chantier_id = ? AND status = 'signe'`,
  )
    .bind(orgId, chantierId)
    .all<DevisResume>();
  return res.results ?? [];
}

/** Table organizations du cœur (worker/src/modules/core/schema.sql). Valeurs neutres si absente. */
export async function lireEntreprise(env: Env, orgId: string): Promise<EntrepriseResume> {
  for (const sql of [
    `SELECT name AS nom, email, phone AS telephone, address AS adresse, siret FROM organizations WHERE id = ?`,
  ]) {
    try {
      const row = await env.DB.prepare(sql).bind(orgId).first<EntrepriseResume>();
      if (row) return row;
    } catch {
      // table absente : on essaie la suivante
    }
  }
  return { nom: 'Votre client artisan', email: null, telephone: null, adresse: null, siret: null };
}
