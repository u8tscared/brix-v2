/// <reference types="node" />
/** Outils de test des comptes et de la synchronisation : D1 en mémoire (node:sqlite), R2 en mémoire, appel des routes. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleCoreRoutes } from '../routes';
import { handleSyncRoutes } from '../../sync/routes';

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

export function creerD1() {
  const db = new DatabaseSync(':memory:');
  for (const f of ['../schema.sql', '../../emails/schema.sql']) db.exec(readFileSync(join(here, f), 'utf8'));
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
  };
}

export function creerR2() {
  const objets = new Map<string, string>();
  return {
    objets,
    async put(cle: string, v: string) {
      objets.set(cle, v);
      return {};
    },
    async get(cle: string) {
      const o = objets.get(cle);
      return o === undefined ? null : { text: async () => o, json: async () => JSON.parse(o) };
    },
  };
}

export const SECRET = 'secret-de-test-assez-long-pour-les-sessions-brix';

export function creerEnv(extra: Record<string, unknown> = {}) {
  return { DB: creerD1(), FILES: creerR2(), JWT_SECRET: SECRET, APP_ORIGIN: 'https://app.test', ...extra } as any;
}

export async function appeler(env: any, method: string, path: string, o: { body?: unknown; token?: string; ip?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cf-connecting-ip': o.ip ?? '203.0.113.7' };
  if (o.token) headers.authorization = `Bearer ${o.token}`;
  const req = new Request(`https://app.test${path}`, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  const pathname = new URL(req.url).pathname;
  try {
    for (const h of [handleCoreRoutes, handleSyncRoutes]) {
      const res = await h(req, env, pathname);
      if (res) return { status: res.status, data: (await res.json()) as any };
    }
    return { status: 404, data: null as any };
  } catch (e: any) {
    // Même traduction que worker/src/index.ts
    return { status: e?.status ?? 500, data: { error: e?.message } };
  }
}

export const inscription = (email = 'karim@benali.test', extra: Record<string, unknown> = {}) => ({
  email,
  password: 'motdepasse-solide',
  firstName: 'Karim',
  lastName: 'Benali',
  company: { name: 'Benali Électricité', trade: 'electricien', size: 'petite' },
  enabledModules: ['devis', 'factures'],
  ...extra,
});
