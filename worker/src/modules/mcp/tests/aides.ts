/// <reference types="node" />
/**
 * Aides de test Brix AI MCP : D1 en mémoire (schémas du cœur, fournisseurs, api-publique, mcp),
 * R2 en mémoire, sessions JWT réelles, document d'entreprise de démonstration, client MCP minimal.
 */
import { signJwt } from '../../../lib/auth';
import { ecrireEtat } from '../../../lib/etat';
import { creerD1 } from '../../fournisseurs/tests/d1-memoire';
import { handleMcpRoutes } from '../routes';
import { handleWellKnown } from '../wellknown';

export const ORIGINE = 'https://app.test';
export const SECRET = 'secret-de-test-brix-ai-mcp-0123456789';

export function creerR2() {
  const m = new Map<string, string>();
  return {
    async get(k: string) {
      const v = m.get(k);
      return v === undefined ? null : { json: async () => JSON.parse(v), text: async () => v };
    },
    async put(k: string, v: string) {
      m.set(k, String(v));
    },
    async delete(k: string) {
      m.delete(k);
    },
  };
}

export function creerEnv(extra: Record<string, unknown> = {}): any {
  return { DB: creerD1(), FILES: creerR2(), JWT_SECRET: SECRET, APP_ORIGIN: ORIGINE, ...extra };
}

export const session = (org: string, role = 'patron', sub = 'u_patron') => signJwt({ sub, org, role }, SECRET, 3600);

/** Appel du worker tel que l'index l'enchaîne : /.well-known puis /api/mcp. */
export async function appel(env: any, chemin: string, init: RequestInit = {}) {
  const req = new Request(`${ORIGINE}${chemin}`, init);
  const p = new URL(req.url).pathname;
  const res = (await handleWellKnown(req, env, p)) ?? (await handleMcpRoutes(req, env, p));
  if (!res) throw new Error(`Route non gérée : ${chemin}`);
  return res;
}

export async function rpc(env: any, jeton: string | null, body: unknown, headers: Record<string, string> = {}) {
  const res = await appel(env, '/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(jeton ? { authorization: `Bearer ${jeton}` } : {}), ...headers },
    body: JSON.stringify(body),
  });
  const texte = await res.text();
  return { status: res.status, headers: res.headers, data: texte ? JSON.parse(texte) : null };
}

export const appelOutil = (env: any, jeton: string, name: string, args: Record<string, unknown> = {}) =>
  rpc(env, jeton, { jsonrpc: '2.0', id: name, method: 'tools/call', params: { name, arguments: args } });

const jour = (decalage: number) => new Date(Date.now() + decalage * 86_400_000).toISOString().slice(0, 10);

/** Document d'entreprise (formes de src/lib/types.ts) pour l'organisation org_a. */
export function donneesDemo() {
  const L = (designation: string, quantity: number, unit: string, unitPriceHt: number, vatRate = 10, kind = 'ouvrage') => ({ id: `l_${designation.slice(0, 4)}`, kind, designation, quantity, unit, unitPriceHt, unitCostHt: unitPriceHt / 2, vatRate });
  return {
    company: { name: 'Benali Électricité', legalName: 'Benali Électricité SARL', siret: '123 456 789 00012', city: 'Villeurbanne', trade: 'electricien', size: 'petite', hourlyRate: 55, defaultVat: 10 },
    enabled: ['devis', 'factures', 'mcp'],
    clients: [
      { id: 'c_lefevre', kind: 'particulier', name: 'Claire Lefèvre', email: 'claire@test.fr', phone: '06 00 00 00 01', address: '18 rue Paul Bert', city: '69003 Lyon', tags: [], createdAt: jour(-40) },
      { id: 'c_roux', kind: 'particulier', name: 'Michel Roux', email: 'michel@test.fr', phone: '06 00 00 00 02', address: '3 place Lazare Goujon', city: '69100 Villeurbanne', tags: [], createdAt: jour(-90) },
    ],
    chantiers: [
      { id: 'ch_lefevre', clientId: 'c_lefevre', name: 'Rénovation T3 Lefèvre', address: '18 rue Paul Bert', city: '69003 Lyon', status: 'en_cours', startDate: jour(-10), endDate: jour(20), progress: 40, budgetHt: 8000, costHt: 2500, team: ['e_karim'], nextStep: 'Passage des gaines', photos: 0 },
    ],
    devis: [
      { id: 'q_121', number: 'D-2026-121', clientId: 'c_lefevre', chantierId: 'ch_lefevre', title: 'Rénovation électrique T3', status: 'signe', createdAt: jour(-30), signedAt: jour(-26), validityDays: 30, depositPercent: 30, lines: [L('Section', 0, '', 0, 10, 'section'), L('Tableau électrique', 1, 'u', 1000), L('Main d’œuvre', 10, 'h', 55)] },
      { id: 'q_118', number: 'D-2026-118', clientId: 'c_roux', title: 'Mise en conformité', status: 'envoye', createdAt: jour(-6), sentAt: jour(-5), validityDays: 30, depositPercent: 30, lines: [L('Prises', 10, 'u', 42)] },
      { id: 'q_119', number: 'D-2026-119', clientId: 'c_roux', title: 'Brouillon VMC', status: 'brouillon', createdAt: jour(-2), validityDays: 30, depositPercent: 30, lines: [L('VMC', 1, 'u', 480, 20)] },
    ],
    factures: [
      { id: 'f_201', number: 'F-2026-201', kind: 'facture', clientId: 'c_roux', title: 'Dépannage', status: 'envoyee', issueDate: jour(-45), dueDate: jour(-15), lines: [L('Dépannage', 1, 'forfait', 1000, 20)], paidAmount: 200, einvoice: { status: 'non_transmise', history: [] }, remindersSent: 1 },
      { id: 'f_202', number: 'F-2026-202', kind: 'acompte', clientId: 'c_lefevre', devisId: 'q_121', title: 'Acompte', status: 'payee', issueDate: jour(-26), dueDate: jour(-26), lines: [L('Acompte', 1, 'forfait', 500)], paidAmount: 550, einvoice: { status: 'encaissee', history: [] }, remindersSent: 0 },
    ],
    employees: [{ id: 'e_karim', firstName: 'Karim', lastName: 'Benali', initials: 'KB', role: 'patron', color: '#000', phone: '', email: '', hourlyCost: 0, contract: 'Gérant', grossMonthly: 0, hireDate: '2015-03-01', habilitations: [], leaveBalance: 0 }],
    events: [{ id: 'pe_1', employeeId: 'e_karim', chantierId: 'ch_lefevre', title: 'Chantier Lefèvre', date: jour(1), start: '08:00', end: '17:00', kind: 'chantier' }],
    leads: [{ id: 'ld_1', name: 'Sarah Kaci', phone: '06 51 23 98 70', city: 'Villeurbanne', request: 'Installer 4 prises', source: 'site', receivedAt: jour(0), status: 'nouveau', estimate: 980 }],
  };
}

export async function semer(env: any) {
  await env.DB.prepare(`INSERT INTO organizations (id, name, trade) VALUES ('org_a','Benali Électricité','electricien'), ('org_b','Autre','plombier')`).run();
  await ecrireEtat(env, 'org_a', donneesDemo(), null, 'test');
  await ecrireEtat(env, 'org_b', { company: { name: 'Autre' }, clients: [{ id: 'c_secret', kind: 'pro', name: 'Client secret', email: '', phone: '', address: '', city: 'Paris', tags: [], createdAt: jour(-1) }] }, null, 'test');
}

/** Crée un jeton personnel par l'API de gestion (session du gérant). */
export async function jetonPersonnel(env: any, org = 'org_a', ecriture = true) {
  const res = await appel(env, '/api/mcp/jetons', { method: 'POST', headers: { authorization: `Bearer ${await session(org)}`, 'content-type': 'application/json' }, body: JSON.stringify({ nom: 'Test', ecriture }) });
  return ((await res.json()) as { jeton: string }).jeton;
}

/** Validation minimale d'une valeur contre un schéma JSON (type, required, properties, items, enum). */
export function valider(schema: any, v: unknown, chemin = '$'): string[] {
  const erreurs: string[] = [];
  const types: string[] = schema.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  const typeDe = (x: unknown) => (x === null ? 'null' : Array.isArray(x) ? 'array' : Number.isInteger(x) ? 'integer' : typeof x);
  if (types.length) {
    const t = typeDe(v);
    const okType = types.includes(t) || (t === 'integer' && types.includes('number'));
    if (!okType) return [`${chemin} : attendu ${types.join('|')}, reçu ${t}`];
  }
  if (schema.enum && !schema.enum.includes(v)) erreurs.push(`${chemin} : valeur hors enum`);
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const r of schema.required ?? []) if (!(r in (v as object))) erreurs.push(`${chemin}.${r} : manquant`);
    for (const [k, s] of Object.entries(schema.properties ?? {})) if ((v as any)[k] !== undefined) erreurs.push(...valider(s, (v as any)[k], `${chemin}.${k}`));
  }
  if (Array.isArray(v) && schema.items) v.forEach((x, i) => erreurs.push(...valider(schema.items, x, `${chemin}[${i}]`)));
  return erreurs;
}
