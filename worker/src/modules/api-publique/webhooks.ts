/**
 * Webhooks sortants vers les partenaires fournisseurs.
 *
 * Signature : en-tête `Brix-Signature: t=<timestamp>,v1=<hmac_sha256(secret, "<t>.<body>")>`.
 * Livraison immédiate, puis nouvelles tentatives (1 min, 5 min, 30 min, 2 h, 12 h) par le cron
 * `relancerWebhooks`. Un webhook est désactivé après 20 échecs consécutifs.
 */

import type { Env } from '../../env';
import { all, first, run } from '../fournisseurs/depot';
import { hmacSha256Hex, newId, parseJsonArray } from '../fournisseurs/util';

export type EvenementWebhook =
  | 'demande.creee'
  | 'demande.annulee'
  | 'commande.creee'
  | 'commande.annulee'
  | 'liaison.creee';

export const EVENEMENTS_WEBHOOK: EvenementWebhook[] = [
  'demande.creee',
  'demande.annulee',
  'commande.creee',
  'commande.annulee',
  'liaison.creee',
];

const DELAIS_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];

interface WebhookRow {
  id: string;
  partenaire_id: string;
  url: string;
  secret: string;
  evenements: string;
  actif: number;
  echecs_consecutifs: number;
}

/** Partenaire API relié à cette fiche fournisseur de l'artisan, s'il existe. */
export async function partenaireDuFournisseur(env: Env, orgId: string, fournisseurId: string): Promise<string | null> {
  const row = await first<{ partenaire_id: string }>(
    env,
    `SELECT partenaire_id FROM api_liaisons WHERE organization_id = ? AND fournisseur_id = ? AND statut = 'active'`,
    orgId,
    fournisseurId,
  );
  return row?.partenaire_id ?? null;
}

export async function signer(secret: string, body: string, t = Math.floor(Date.now() / 1000)): Promise<string> {
  return `t=${t},v1=${await hmacSha256Hex(secret, `${t}.${body}`)}`;
}

export async function emettre(
  env: Env,
  partenaireId: string,
  evenement: EvenementWebhook,
  data: unknown,
  ctx?: { waitUntil(p: Promise<unknown>): void },
): Promise<number> {
  const hooks = (await all<WebhookRow>(env, `SELECT * FROM api_webhooks WHERE partenaire_id = ? AND actif = 1`, partenaireId)).filter(
    (h) => parseJsonArray(h.evenements).includes(evenement),
  );
  for (const h of hooks) {
    const envoiId = newId('whd');
    const payload = JSON.stringify({ id: envoiId, type: evenement, cree_le: new Date().toISOString(), data });
    await run(
      env,
      `INSERT INTO api_webhooks_envois (id, webhook_id, evenement, payload, tentatives, prochain_essai, created_at) VALUES (?,?,?,?,0,?,?)`,
      envoiId,
      h.id,
      evenement,
      payload,
      Date.now(),
      Date.now(),
    );
    const p = livrer(env, h, envoiId, payload, 0);
    if (ctx) ctx.waitUntil(p);
    else await p;
  }
  return hooks.length;
}

/** Anti-SSRF : nom de domaine public uniquement (pas d'IP littérale, pas de localhost), HTTPS, port standard. */
export function urlWebhookAutorisee(u: URL): boolean {
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== '443' && u.port !== '8443') return false;
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!h.includes('.') || h.startsWith('[') || h.includes(':')) return false;
  if (/^[\d.]+$/.test(h) || /^0x/i.test(h)) return false;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan')) return false;
  return true;
}

async function livrer(env: Env, h: WebhookRow, envoiId: string, payload: string, tentatives: number): Promise<boolean> {
  let status = 0;
  try {
    if (!urlWebhookAutorisee(new URL(h.url))) throw new Error('url_interdite');
    const res = await fetch(h.url, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Brix-Webhooks/1.0',
        'brix-signature': await signer(h.secret, payload),
        'brix-event-id': envoiId,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
  } catch {
    status = 0;
  }
  const ok = status >= 200 && status < 300;
  const n = tentatives + 1;
  await run(
    env,
    `UPDATE api_webhooks_envois SET statut_http = ?, tentatives = ?, livre_le = ?, prochain_essai = ? WHERE id = ?`,
    status || null,
    n,
    ok ? Date.now() : null,
    ok || n > DELAIS_MS.length ? null : Date.now() + DELAIS_MS[n - 1],
    envoiId,
  );
  await run(
    env,
    ok
      ? `UPDATE api_webhooks SET echecs_consecutifs = 0 WHERE id = ?`
      : `UPDATE api_webhooks SET echecs_consecutifs = echecs_consecutifs + 1, actif = CASE WHEN echecs_consecutifs + 1 >= 20 THEN 0 ELSE actif END WHERE id = ?`,
    h.id,
  );
  return ok;
}

/** À appeler depuis le cron du worker (toutes les minutes). */
export async function relancerWebhooks(env: Env, limite = 50): Promise<number> {
  const rows = await all<{ id: string; webhook_id: string; payload: string; tentatives: number }>(
    env,
    `SELECT id, webhook_id, payload, tentatives FROM api_webhooks_envois
     WHERE livre_le IS NULL AND prochain_essai IS NOT NULL AND prochain_essai <= ? ORDER BY prochain_essai LIMIT ?`,
    Date.now(),
    limite,
  );
  let ok = 0;
  for (const r of rows) {
    const h = await first<WebhookRow>(env, `SELECT * FROM api_webhooks WHERE id = ? AND actif = 1`, r.webhook_id);
    if (!h) {
      await run(env, `UPDATE api_webhooks_envois SET prochain_essai = NULL WHERE id = ?`, r.id);
      continue;
    }
    if (await livrer(env, h, r.id, r.payload, r.tentatives)) ok++;
  }
  return ok;
}
