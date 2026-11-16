/// <reference types="node" />
/**
 * Fausse base D1 en mémoire (node:sqlite, Node ≥ 22) pour les tests d'intégration.
 * Charge les schema.sql des modules fournisseurs, api-publique et mcp + des tables cœur minimales.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// Chargé via require : Vite 5 ne sait pas résoudre « node:sqlite » (module récent sans équivalent « sqlite »).
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type DatabaseSync = InstanceType<typeof DatabaseSync>;

const COEUR = `
CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, address TEXT, siret TEXT);
CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, organization_id TEXT, kind TEXT, name TEXT, email TEXT, phone TEXT, address TEXT, city TEXT, siret TEXT);
CREATE TABLE IF NOT EXISTS chantiers (id TEXT PRIMARY KEY, organization_id TEXT, client_id TEXT, name TEXT, address TEXT, status TEXT, start_date TEXT, end_date TEXT, budget_ht REAL);
CREATE TABLE IF NOT EXISTS devis (id TEXT PRIMARY KEY, organization_id TEXT, client_id TEXT, chantier_id TEXT, number TEXT, status TEXT, title TEXT, total_ht REAL, total_tva REAL, total_ttc REAL, created_at INTEGER, sent_at INTEGER, signed_at INTEGER);
CREATE TABLE IF NOT EXISTS devis_lignes (id TEXT PRIMARY KEY, devis_id TEXT, position INTEGER, kind TEXT, designation TEXT, quantity REAL, unit TEXT, unit_price_ht REAL, unit_cost_ht REAL, vat_rate REAL, supplier_ref TEXT);
CREATE TABLE IF NOT EXISTS factures (id TEXT PRIMARY KEY, organization_id TEXT, client_id TEXT, chantier_id TEXT, number TEXT, status TEXT, total_ht REAL, total_ttc REAL, issued_at INTEGER, due_at INTEGER, paid_at INTEGER);
`;

class Stmt {
  constructor(private db: DatabaseSync, public sql: string, public params: unknown[] = []) {}
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
  db.exec(COEUR);
  for (const f of ['../schema.sql', '../../api-publique/schema.sql', '../../mcp/schema.sql']) {
    try {
      db.exec(readFileSync(join(here, f), 'utf8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
  const d1 = {
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
  };
  return d1 as unknown as D1Database;
}
