/// <reference types="node" />
/**
 * Outils de test des parcours : D1 en mémoire (node:sqlite) avec les schémas du cœur et des 4 modules,
 * R2 en mémoire, routeur identique à l'ordre prévu dans index.ts, jeu de données de démonstration.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { signJwt } from '../../../lib/auth';
import { handleDocumentsRoutes } from '../routes';
import { handleSignatureRoutes } from '../../signature/routes';
import { handlePaiementsRoutes } from '../../paiements/routes';
import { handleNotificationsRoutes } from '../../notifications/routes';

const here = dirname(fileURLToPath(import.meta.url));
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type Db = InstanceType<typeof DatabaseSync>;

class Stmt {
  constructor(private db: Db, public sql: string, public params: unknown[] = []) {}
  bind(...p: unknown[]) {
    return new Stmt(this.db, this.sql, p.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x)));
  }
  async first<T>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.params as never[])) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (col ? row[col] : { ...row }) as T;
  }
  async all<T>() {
    const rows = this.db.prepare(this.sql).all(...(this.params as never[])) as T[];
    return { results: rows.map((r) => ({ ...(r as object) })) as T[], success: true, meta: {} };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...(this.params as never[]));
    return { success: true, meta: { changes: Number(r.changes) } };
  }
}

export function creerD1(): D1Database {
  const db = new DatabaseSync(':memory:');
  for (const f of ['../../core/schema.sql', '../schema.sql', '../../signature/schema.sql', '../../paiements/schema.sql', '../../notifications/schema.sql']) {
    db.exec(readFileSync(join(here, f), 'utf8'));
  }
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    async batch(stmts: Stmt[]) {
      db.exec('BEGIN');
      try {
        const out = [];
        for (const s of stmts) out.push(await s.run());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    async exec(sql: string) {
      db.exec(sql);
      return { count: 1, duration: 0 };
    },
  } as unknown as D1Database;
}

export function creerR2() {
  const objets = new Map<string, { corps: Uint8Array; type?: string }>();
  const r2 = {
    objets,
    async put(cle: string, v: string | Uint8Array | ArrayBuffer, o?: { httpMetadata?: { contentType?: string } }) {
      const corps = typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v as ArrayBuffer);
      objets.set(cle, { corps, type: o?.httpMetadata?.contentType });
      return {};
    },
    async get(cle: string) {
      const o = objets.get(cle);
      if (!o) return null;
      return { text: async () => new TextDecoder().decode(o.corps), arrayBuffer: async () => o.corps.buffer.slice(o.corps.byteOffset, o.corps.byteOffset + o.corps.byteLength) };
    },
  };
  return r2;
}

export function creerEnv(extra: Record<string, unknown> = {}) {
  return { DB: creerD1(), FILES: creerR2(), JWT_SECRET: 'secret-de-test', APP_ORIGIN: 'https://app.test', PUBLIC_LINK_SECRET: 'secret-liens-test', ...extra } as any;
}

const HANDLERS = [handleDocumentsRoutes, handleSignatureRoutes, handlePaiementsRoutes, handleNotificationsRoutes];

export async function appeler(env: any, method: string, path: string, o: { body?: unknown; brut?: string; token?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.42', 'user-agent': 'Mozilla/5.0 (iPhone) Test', ...(o.headers ?? {}) };
  if (o.token) headers.authorization = `Bearer ${o.token}`;
  const req = new Request(`https://app.test${path}`, { method, headers, body: o.brut ?? (o.body === undefined ? undefined : JSON.stringify(o.body)) });
  for (const h of HANDLERS) {
    const res = await h(req, env, new URL(req.url).pathname);
    if (res) {
      const t = await res.text();
      let data: any = t;
      try {
        data = JSON.parse(t);
      } catch {
        /* HTML */
      }
      return { status: res.status, data, headers: res.headers };
    }
  }
  return { status: 404, data: null as any, headers: new Headers() };
}

export const jetonArtisan = (org = 'org_a', user = 'usr_a') => signJwt({ sub: user, org, role: 'patron' }, 'secret-de-test');

// PNG 1×1 valide (signature dessinée minimale)
export const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export async function semer(env: any, o: { horsEtablissement?: boolean; pro?: boolean } = {}) {
  const q = (sql: string, ...p: unknown[]) => env.DB.prepare(sql).bind(...p).run();
  await q(`INSERT INTO organizations (id, name, siret, email, phone, city, settings) VALUES ('org_a', 'Benali Électricité', '12345678900012', 'contact@benali.test', '0478000000', 'Villeurbanne', ?)`, JSON.stringify({ iban: 'FR7630006000011234567890189', decennale: 'AXA n° 123' }));
  await q(`INSERT INTO organizations (id, name) VALUES ('org_b', 'Autre entreprise')`);
  await q(`INSERT INTO users (id, organization_id, email, first_name, last_name, role) VALUES ('usr_a', 'org_a', 'karim@benali.test', 'Karim', 'Benali', 'patron')`);
  await q(`INSERT INTO users (id, organization_id, email, first_name, last_name, role) VALUES ('usr_b', 'org_b', 'b@b.test', 'B', 'B', 'patron')`);
  await q(`INSERT INTO clients (id, organization_id, kind, name, email, phone, address, city) VALUES ('cl1', 'org_a', ?, 'Claire Lefèvre', 'claire@client.test', '06 12 34 56 78', '3 rue des Lilas', 'Lyon')`, o.pro ? 'pro' : 'particulier');
  await q(`INSERT INTO devis (id, organization_id, client_id, number, status, title, deposit_percent, sent_at) VALUES ('dv1', 'org_a', 'cl1', 'D-2026-118', 'envoye', 'Rénovation tableau électrique', 30, datetime('now'))`);
  const lignes: [number, string, string, number, string, number, number, number][] = [
    [1, 'section', 'Tableau', 0, '', 0, 0, 20],
    [2, 'ouvrage', 'Tableau 3 rangées équipé', 1, 'u', 850, 520, 20],
    [3, 'main_oeuvre', 'Pose et raccordement', 6, 'h', 55, 30, 20],
    [4, 'fourniture', 'Prises 16 A', 10, 'u', 12.5, 6, 10],
  ];
  for (const [pos, kind, des, qte, u, pu, cout, tva] of lignes) {
    await q(`INSERT INTO devis_lignes (id, devis_id, position, kind, designation, quantity, unit, unit_price_ht, unit_cost_ht, vat_rate) VALUES (?, 'dv1', ?, ?, ?, ?, ?, ?, ?, ?)`, `l${pos}`, pos, kind, des, qte, u, pu, cout, tva);
  }
  await q(`INSERT INTO factures (id, organization_id, client_id, number, kind, status, issue_date, due_date, total_ht, total_tva, total_ttc) VALUES ('fa1', 'org_a', 'cl1', 'F-2026-206', 'facture', 'envoyee', '2026-11-01', '2026-12-01', 1000, 200, 1200)`);
  await q(`INSERT INTO facture_lignes (id, facture_id, position, kind, designation, quantity, unit, unit_price_ht, vat_rate) VALUES ('fl1', 'fa1', 1, 'ouvrage', 'Mise aux normes', 1, 'forfait', 1000, 20)`);
  const token = await jetonArtisan();
  if (o.horsEtablissement) await appeler(env, 'PUT', '/api/documents/complements/devis/dv1', { token, body: { horsEtablissement: true } });
  return { token };
}
