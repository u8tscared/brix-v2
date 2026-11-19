/**
 * Socle des outils Brix AI : type Outil, schémas JSON abrégés, pagination, calcul des totaux
 * (même règle que src/lib/format.ts › totals), liens profonds vers l'app.
 */
import type { Env } from '../../../env';
import { lireEtat, type EtatDonnees } from '../../../lib/etat';
import type { Client, DevisLigne, Facture } from '../../../../../src/lib/types';
import { origine } from '../config';
import type { McpCtx } from '../jetons';

export type Args = Record<string, unknown>;
export type Schema = Record<string, unknown>;

export interface Contexte {
  env: Env;
  ctx: McpCtx;
  /** Lit le document de l'entreprise une fois par appel. */
  etat: () => Promise<{ donnees: EtatDonnees; majLe: string | null }>;
  /** Date de mise à jour du document s'il a été lu pendant l'appel. */
  majLe: () => string | null;
}

export interface Outil {
  name: string;
  title: string;
  description: string;
  inputSchema: Schema;
  outputSchema: Schema;
  /** Modifie les données (portée brix.ecriture). Toujours un brouillon ou une note, jamais un envoi. */
  ecriture?: boolean;
  /** Sortie telle quelle, sans « donnees_du » (search / fetch au format attendu par ChatGPT). */
  brut?: boolean;
  run: (c: Contexte, args: Args) => Promise<Record<string, unknown>>;
}

/** Erreur lisible renvoyée à l'assistant (isError: true), jamais un détail technique. */
export class ErreurOutil extends Error {}

export const annotations = (o: Outil) => ({
  title: o.title,
  readOnlyHint: !o.ecriture,
  destructiveHint: false,
  idempotentHint: !o.ecriture,
  openWorldHint: false,
});

export function nouveauContexte(env: Env, ctx: McpCtx): Contexte {
  let cache: Promise<{ donnees: EtatDonnees; majLe: string | null }> | null = null;
  let maj: string | null = null;
  return {
    env,
    ctx,
    etat: () => (cache ??= lireEtat(env, ctx.organizationId).then((e) => ((maj = e.majLe), { donnees: e.donnees, majLe: e.majLe }))),
    majLe: () => maj,
  };
}

// ---------------------------------------------------------------- schémas abrégés

export const S = {
  str: (description?: string, extra: Schema = {}): Schema => ({ type: 'string', ...(description ? { description } : {}), ...extra }),
  nstr: (): Schema => ({ type: ['string', 'null'] }),
  num: (description?: string, extra: Schema = {}): Schema => ({ type: 'number', ...(description ? { description } : {}), ...extra }),
  nnum: (): Schema => ({ type: ['number', 'null'] }),
  int: (description?: string, extra: Schema = {}): Schema => ({ type: 'integer', ...(description ? { description } : {}), ...extra }),
  bool: (description?: string): Schema => ({ type: 'boolean', ...(description ? { description } : {}) }),
  enum: (values: readonly string[], description?: string): Schema => ({ type: 'string', enum: [...values], ...(description ? { description } : {}) }),
  arr: (items: Schema): Schema => ({ type: 'array', items }),
  obj: (properties: Record<string, Schema>, required: string[] = []): Schema => ({ type: 'object', properties, ...(required.length ? { required } : {}) }),
};

export const entree = (properties: Record<string, Schema> = {}, required: string[] = []): Schema => ({
  type: 'object', properties, ...(required.length ? { required } : {}), additionalProperties: false,
});

/** Schéma de sortie : enveloppe commune (donnees_du, monnaie, vide, message) + propriétés de l'outil. */
export const sortie = (properties: Record<string, Schema>): Schema => ({
  type: 'object',
  properties: { donnees_du: S.str('Date de la dernière mise à jour des données'), monnaie: S.str(), vide: S.bool(), message: S.str(), ...properties },
  required: ['donnees_du'],
});

export const PAGINATION = {
  limite: S.int('Nombre de résultats (1 à 50, défaut 20)', { minimum: 1, maximum: 50 }),
  curseur: S.str('Valeur « suivant » de la réponse précédente'),
};
export const SORTIE_PAGE = { total: S.int(), suivant: S.nstr() };

export function paginer<T>(liste: T[], a: Args) {
  const limite = entier(a.limite, 1, 50, 20);
  const depart = Math.max(0, Number.parseInt(String(a.curseur ?? '0'), 10) || 0);
  const page = liste.slice(depart, depart + limite);
  return { page, total: liste.length, suivant: depart + limite < liste.length ? String(depart + limite) : null };
}

// ---------------------------------------------------------------- petites aides

export const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
export const entier = (v: unknown, min: number, max: number, defaut: number) => {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : defaut;
};
export const euros = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? 0 : Math.round(n * 100) / 100);
export const jourIso = (d = new Date()) => d.toISOString().slice(0, 10);
export const ilYa = (jours: number) => jourIso(new Date(Date.now() - jours * 86_400_000));
export const vide = (message: string, extra: Record<string, unknown> = {}) => ({ vide: true, message, ...extra });
export const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const contient = (meule: unknown, aiguille: string) => norm(meule).includes(norm(aiguille));

export function totaux(lignes: DevisLigne[] = []) {
  let ht = 0;
  let cout = 0;
  let tva = 0;
  for (const l of lignes) {
    if (l.kind === 'section' || l.kind === 'texte') continue;
    const h = (Number(l.quantity) || 0) * (Number(l.unitPriceHt) || 0);
    ht += h;
    cout += (Number(l.quantity) || 0) * (Number(l.unitCostHt) || 0);
    tva += (h * (Number(l.vatRate) || 0)) / 100;
  }
  return { ht: euros(ht), tva: euros(tva), ttc: euros(ht + tva), marge: euros(ht - cout) };
}

export const resteFacture = (f: Facture) => euros(Math.max(0, totaux(f.lines).ttc - (Number(f.paidAmount) || 0)));
export const factureOuverte = (f: Facture) => !['brouillon', 'annulee', 'payee'].includes(f.status) && f.kind !== 'avoir' && resteFacture(f) > 0;

export const lien = (env: Env, chemin: string) => `${origine(env)}/#/app/${chemin}`;

export const nomClient = (clients: Client[] | undefined, id: string | undefined) => (id ? clients?.find((c) => c.id === id)?.name ?? null : null);

/** Retrouve un élément par id, numéro ou nom (insensible aux accents). */
export function trouver<T extends { id: string }>(liste: T[] | undefined, cle: string, champs: (keyof T)[] = []): T | undefined {
  if (!liste) return undefined;
  return liste.find((x) => x.id === cle) ?? liste.find((x) => champs.some((c) => norm(x[c]) === norm(cle))) ?? liste.find((x) => champs.some((c) => contient(x[c], cle)));
}
