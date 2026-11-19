/**
 * État Brix d'une entreprise, côté serveur (« cloud »).
 *
 * L'app garde ses données dans un store zustand (src/lib/store.ts). En production, ce store est
 * synchronisé ici : un document JSON par entreprise dans R2 (`etat/<orgId>.json`), et une ligne D1
 * `etat_org` qui porte la version (concurrence optimiste) et la date de mise à jour.
 *
 * Tout le monde passe par ce module : la synchronisation de l'app (/api/sync), Brix AI MCP
 * (lecture et écriture), Brix AI côté serveur. Une écriture incrémente la version ; l'app la voit au
 * prochain tirage et fusionne.
 *
 * Le contenu est le sous-ensemble « données » de BrixState (pas les préférences d'affichage) :
 * company, user, plan, priorities, enabled, clients, chantiers, devis, factures, employees, events,
 * leads, expenses, bank, cashBalance, setupTasks. Les formes exactes sont dans src/lib/types.ts.
 */

import type { Env } from '../env';
import { HttpError } from './http';

export type EtatDonnees = Record<string, unknown> & {
  clients?: Array<Record<string, any>>;
  chantiers?: Array<Record<string, any>>;
  devis?: Array<Record<string, any>>;
  factures?: Array<Record<string, any>>;
  employees?: Array<Record<string, any>>;
  events?: Array<Record<string, any>>;
  leads?: Array<Record<string, any>>;
  company?: Record<string, any>;
};

export interface Etat {
  version: number;
  majLe: string | null;
  donnees: EtatDonnees;
}

/** Collections synchronisées (tableaux d'objets avec un `id`). */
export const COLLECTIONS = ['clients', 'chantiers', 'devis', 'factures', 'employees', 'events', 'leads', 'expenses', 'bank'] as const;
/** Champs simples synchronisés. */
export const CHAMPS = ['company', 'user', 'plan', 'priorities', 'enabled', 'cashBalance', 'setupTasks', 'onboarded'] as const;

const TAILLE_MAX = 20 * 1024 * 1024; // 20 Mo par entreprise
const cle = (orgId: string) => `etat/${orgId}.json`;

export const SCHEMA_ETAT = `CREATE TABLE IF NOT EXISTS etat_org (
  organization_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 0,
  maj_le TEXT,
  maj_par TEXT,
  taille INTEGER NOT NULL DEFAULT 0
);`;

/** Ne garde que les clés synchronisées (jamais les préférences ou les flags de démo). */
export function nettoyer(d: Record<string, unknown>): EtatDonnees {
  const out: EtatDonnees = {};
  for (const k of COLLECTIONS) if (Array.isArray(d[k])) out[k] = d[k] as any;
  for (const k of CHAMPS) if (d[k] !== undefined && d[k] !== null) (out as Record<string, unknown>)[k] = d[k];
  return out;
}

/**
 * Stockage du JSON : R2 quand le binding FILES existe, sinon une table D1 (préproduction sans R2).
 * D1 limite une valeur à ~2 Mo : suffisant pour tester, R2 est attendu en production.
 */
const sansR2 = (env: Env) => !(env as { FILES?: unknown }).FILES;

async function lireDonnees(env: Env, orgId: string): Promise<EtatDonnees> {
  if (sansR2(env)) {
    const r = await env.DB.prepare('SELECT donnees FROM etat_donnees WHERE organization_id = ?').bind(orgId).first<{ donnees: string }>();
    return r ? (JSON.parse(r.donnees) as EtatDonnees) : {};
  }
  const obj = await env.FILES.get(cle(orgId));
  return obj ? ((await obj.json()) as EtatDonnees) : {};
}

async function ecrireDonnees(env: Env, orgId: string, texte: string, version: number) {
  if (sansR2(env)) {
    await env.DB.prepare('INSERT INTO etat_donnees (organization_id, donnees) VALUES (?, ?) ON CONFLICT(organization_id) DO UPDATE SET donnees = excluded.donnees').bind(orgId, texte).run();
    return;
  }
  await env.FILES.put(cle(orgId), texte, { httpMetadata: { contentType: 'application/json' }, customMetadata: { version: String(version) } });
}

export async function lireEtat(env: Env, orgId: string): Promise<Etat> {
  const row = await env.DB.prepare('SELECT version, maj_le FROM etat_org WHERE organization_id = ?').bind(orgId).first<{ version: number; maj_le: string | null }>();
  if (!row) return { version: 0, majLe: null, donnees: {} };
  const donnees = await lireDonnees(env, orgId);
  return { version: row.version, majLe: row.maj_le, donnees };
}

/**
 * Écrit l'état si la version de base correspond (sinon 409 avec la version serveur).
 * `baseVersion = null` force l'écriture (création de compte, réparation).
 */
export async function ecrireEtat(env: Env, orgId: string, donnees: Record<string, unknown>, baseVersion: number | null, par: string): Promise<Etat> {
  const propre = nettoyer(donnees);
  const texte = JSON.stringify(propre);
  if (texte.length > TAILLE_MAX) throw new HttpError(413, 'Données trop volumineuses');
  const majLe = new Date().toISOString();
  const actuelle = await env.DB.prepare('SELECT version FROM etat_org WHERE organization_id = ?').bind(orgId).first<{ version: number }>();
  const v = actuelle?.version ?? 0;
  if (baseVersion !== null && baseVersion !== v) throw new HttpError(409, 'conflit');
  const suivante = v + 1;
  // Mise à jour conditionnelle : si quelqu'un a écrit entre-temps, aucune ligne ne change → conflit.
  const res = actuelle
    ? await env.DB.prepare('UPDATE etat_org SET version = ?, maj_le = ?, maj_par = ?, taille = ? WHERE organization_id = ? AND version = ?').bind(suivante, majLe, par, texte.length, orgId, v).run()
    : await env.DB.prepare('INSERT OR IGNORE INTO etat_org (organization_id, version, maj_le, maj_par, taille) VALUES (?, ?, ?, ?, ?)').bind(orgId, suivante, majLe, par, texte.length).run();
  if (!res.meta.changes) throw new HttpError(409, 'conflit');
  await ecrireDonnees(env, orgId, texte, suivante);
  return { version: suivante, majLe, donnees: propre };
}

/**
 * Modifie l'état côté serveur (MCP, Brix AI) : lit, applique `fn`, réécrit, réessaie en cas de course.
 * `fn` reçoit une copie modifiable et renvoie le résultat à rendre à l'appelant.
 */
export async function modifierEtat<T>(env: Env, orgId: string, par: string, fn: (d: EtatDonnees) => T | Promise<T>): Promise<T> {
  for (let essai = 0; essai < 3; essai++) {
    const e = await lireEtat(env, orgId);
    const copie = structuredClone(e.donnees);
    const r = await fn(copie);
    try {
      await ecrireEtat(env, orgId, copie, e.version, par);
      return r;
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) continue;
      throw err;
    }
  }
  throw new HttpError(409, 'Données modifiées en même temps ailleurs, réessayez');
}
