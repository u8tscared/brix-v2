/**
 * Limites d'usage de Bob, comptées dans D1 (table bob_quota).
 * - Compte connecté : 300 questions par jour et par entreprise (+ plafond d'appels, boucle d'outils comprise).
 * - Démo ouverte : 20 questions par heure et par adresse IP (+ plafond d'appels).
 * Une « question » est un message tapé ou dicté ; les allers-retours d'outils comptent seulement
 * dans le plafond d'appels.
 */
import type { Env } from '../../env';

export interface Limite {
  questions: number;
  appels: number;
  fenetre: 'jour' | 'heure';
}

export const LIMITES = {
  org: { questions: 300, appels: 1500, fenetre: 'jour' } as Limite,
  demo: { questions: 20, appels: 100, fenetre: 'heure' } as Limite,
};

const cleFenetre = (f: Limite['fenetre'], now: Date) => (f === 'jour' ? now.toISOString().slice(0, 10) : now.toISOString().slice(0, 13));
const duree = (f: Limite['fenetre']) => (f === 'jour' ? 86_400 : 3_600);

async function incrementer(env: Env, cle: string, fenetre: string, expire: number): Promise<number> {
  const row = await env.DB.prepare(
    'INSERT INTO bob_quota (cle, fenetre, n, expire) VALUES (?, ?, 1, ?) ON CONFLICT(cle, fenetre) DO UPDATE SET n = n + 1 RETURNING n',
  ).bind(cle, fenetre, expire).first<{ n: number }>();
  return Number(row?.n ?? 1);
}

/**
 * Compte un appel (et une question si `question`). Renvoie false si une limite est dépassée.
 * L'appel refusé est quand même compté : un client qui insiste reste bloqué.
 */
export async function consommer(env: Env, qui: string, limite: Limite, question: boolean, now = new Date()): Promise<boolean> {
  const f = cleFenetre(limite.fenetre, now);
  const expire = Math.floor(now.getTime() / 1000) + duree(limite.fenetre) * 2;
  const appels = await incrementer(env, `${qui}:appels`, f, expire);
  const questions = question ? await incrementer(env, `${qui}:questions`, f, expire) : 0;
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM bob_quota WHERE expire < ?').bind(Math.floor(now.getTime() / 1000)).run();
  return appels <= limite.appels && questions <= limite.questions;
}
