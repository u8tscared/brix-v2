/**
 * Réglages Brix AI d'une entreprise : interrupteur « Relier votre IA » et journal des actions.
 * Couper l'interrupteur bloque immédiatement tous les accès (OAuth et jetons personnels).
 */
import type { Env } from '../../env';
import { all, first, run } from '../fournisseurs/depot';
import { newId } from '../fournisseurs/util';

export async function relierActif(env: Env, orgId: string): Promise<boolean> {
  const r = await first<{ actif: number }>(env, `SELECT actif FROM mcp_reglages WHERE organization_id = ?`, orgId);
  return r ? r.actif === 1 : true;
}

export async function definirRelier(env: Env, orgId: string, actif: boolean, par: string) {
  await run(
    env,
    `INSERT INTO mcp_reglages (organization_id, actif, maj_le, maj_par) VALUES (?, ?, ?, ?)
     ON CONFLICT(organization_id) DO UPDATE SET actif = excluded.actif, maj_le = excluded.maj_le, maj_par = excluded.maj_par`,
    orgId, actif ? 1 : 0, Date.now(), par,
  );
}

export async function journaliser(env: Env, orgId: string, clientLabel: string, outil: string, resume: string, ok = true) {
  try {
    await run(env, `INSERT INTO mcp_journal (id, organization_id, client_label, outil, resume, ok, at) VALUES (?,?,?,?,?,?,?)`, newId('mjl'), orgId, clientLabel.slice(0, 80), outil, resume.slice(0, 300), ok ? 1 : 0, Date.now());
    // On garde les 500 dernières lignes par entreprise.
    await run(env, `DELETE FROM mcp_journal WHERE organization_id = ? AND id NOT IN (SELECT id FROM mcp_journal WHERE organization_id = ? ORDER BY at DESC LIMIT 500)`, orgId, orgId);
  } catch (e) {
    console.error('[mcp] journal', e);
  }
}

export const lireJournal = (env: Env, orgId: string, limite = 50) =>
  all<{ id: string; client_label: string; outil: string; resume: string; ok: number; at: number }>(
    env, `SELECT id, client_label, outil, resume, ok, at FROM mcp_journal WHERE organization_id = ? ORDER BY at DESC LIMIT ?`, orgId, Math.min(Math.max(limite, 1), 200),
  );
