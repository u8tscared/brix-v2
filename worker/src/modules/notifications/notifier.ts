/**
 * notifier(env, {...}) : point d'entrée utilisé par les autres modules (documents, signature, paiements).
 * - enregistre la notification dans le fil de l'entreprise ;
 * - pousse sur les appareils des utilisateurs qui l'ont activée pour ce type ;
 * - pendant les heures calmes, l'envoi push est différé (repris par le cron) ; le fil, lui, est à jour.
 */
import { enCentimes, nouvelId } from '../documents/commun';
import type { EnvParcours } from '../documents/env';
import { CANAUX_NATIFS, type MessagePush } from './push-natif';
import { envoyerWebPush, type ResultatPush } from './push-web';
import { TYPES_NOTIFICATION, type Canal, type Notifier, type TypeNotification } from './types';

interface Abonnement {
  id: string;
  user_id: string;
  plateforme: 'web' | 'apns' | 'fcm';
  cible: string;
  p256dh: string | null;
  auth: string | null;
}

/** Préférence d'un utilisateur (défaut du type si aucune ligne). */
export async function preferenceActive(env: EnvParcours, userId: string, type: TypeNotification, canal: Canal): Promise<boolean> {
  const r = await env.DB.prepare('SELECT actif FROM notifications_preferences WHERE user_id = ? AND type = ? AND canal = ?').bind(userId, type, canal).first<{ actif: number }>();
  return r ? !!r.actif : TYPES_NOTIFICATION[type][canal];
}

const minutes = (hhmm: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Vrai si `maintenant` tombe dans la plage calme (qui peut passer minuit : 21:00 → 07:00). */
export function enHeuresCalmes(maintenant: number, debut: string | null, fin: string | null, fuseau = 'Europe/Paris'): boolean {
  const d = debut ? minutes(debut) : null;
  const f = fin ? minutes(fin) : null;
  if (d === null || f === null || d === f) return false;
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(maintenant));
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const mn = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const t = h * 60 + mn;
  return d < f ? t >= d && t < f : t >= d || t < f;
}

async function calmePour(env: EnvParcours, userId: string): Promise<boolean> {
  const r = await env.DB.prepare('SELECT calme_debut, calme_fin, fuseau FROM notifications_reglages WHERE user_id = ?')
    .bind(userId)
    .first<{ calme_debut: string | null; calme_fin: string | null; fuseau: string }>();
  return r ? enHeuresCalmes(Date.now(), r.calme_debut, r.calme_fin, r.fuseau) : false;
}

/** Envoie sur un abonnement et tient à jour son état (suppression s'il a expiré). */
export async function pousser(env: EnvParcours, abo: Abonnement, m: MessagePush): Promise<ResultatPush> {
  const r =
    abo.plateforme === 'web'
      ? await envoyerWebPush(env, { endpoint: abo.cible, p256dh: abo.p256dh ?? '', auth: abo.auth ?? '' }, m as unknown as Record<string, unknown>)
      : await CANAUX_NATIFS[abo.plateforme].envoyer(env, abo.cible, m);
  if (r === 'expire') await env.DB.prepare('DELETE FROM notifications_abonnements WHERE id = ?').bind(abo.id).run();
  else if (r === 'envoye') await env.DB.prepare('UPDATE notifications_abonnements SET dernier_succes = ?, echecs = 0 WHERE id = ?').bind(Date.now(), abo.id).run();
  else if (r === 'echec') await env.DB.prepare('UPDATE notifications_abonnements SET echecs = echecs + 1 WHERE id = ?').bind(abo.id).run();
  return r;
}

export async function notifier(env: EnvParcours, n: Notifier): Promise<{ id: string; push: Record<ResultatPush | 'differe', number> }> {
  const id = nouvelId('ntf');
  const titre = n.titre.slice(0, 140);
  const texte = n.texte.slice(0, 500);
  await env.DB.prepare(
    'INSERT INTO notifications (id, organization_id, type, titre, texte, vers, montant_cents, document_type, document_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, n.entrepriseId, n.type, titre, texte, n.vers ?? null, n.montant == null ? null : enCentimes(n.montant), n.documentType ?? null, n.documentId ?? null, Date.now())
    .run();

  const bilan: Record<ResultatPush | 'differe', number> = { envoye: 0, expire: 0, echec: 0, simule: 0, differe: 0 };
  const abonnements =
    (
      await env.DB.prepare('SELECT id, user_id, plateforme, cible, p256dh, auth FROM notifications_abonnements WHERE organization_id = ?')
        .bind(n.entrepriseId)
        .all<Abonnement>()
    ).results ?? [];
  const message: MessagePush = { titre, texte, vers: n.vers ?? null, type: n.type, id };
  const decisions = new Map<string, 'non' | 'calme' | 'oui'>();
  for (const abo of abonnements) {
    if (!decisions.has(abo.user_id)) {
      const actif = (await preferenceActive(env, abo.user_id, n.type, 'push')) && (await preferenceActive(env, abo.user_id, n.type, 'app'));
      decisions.set(abo.user_id, !actif ? 'non' : (await calmePour(env, abo.user_id)) ? 'calme' : 'oui');
    }
    const d = decisions.get(abo.user_id);
    if (d === 'non') continue;
    if (d === 'calme') {
      await env.DB.prepare("INSERT INTO notifications_envois (id, notification_id, abonnement_id, user_id, statut, created_at) VALUES (?, ?, ?, ?, 'differe', ?)")
        .bind(nouvelId('env'), id, abo.id, abo.user_id, Date.now())
        .run();
      bilan.differe++;
      continue;
    }
    bilan[await pousser(env, abo, message)]++;
  }
  return { id, push: bilan };
}

/** Cron : envoie les push différés dont les heures calmes sont passées (au plus 200 par passage). */
export async function envoyerPushDifferes(env: EnvParcours): Promise<number> {
  const rows =
    (
      await env.DB.prepare(
        `SELECT e.id AS envoi_id, e.user_id, a.id, a.plateforme, a.cible, a.p256dh, a.auth, n.titre, n.texte, n.vers, n.type, n.id AS notification_id, n.created_at
         FROM notifications_envois e JOIN notifications_abonnements a ON a.id = e.abonnement_id JOIN notifications n ON n.id = e.notification_id
         WHERE e.statut = 'differe' ORDER BY e.created_at LIMIT 200`,
      ).all<Abonnement & { envoi_id: string; titre: string; texte: string; vers: string | null; type: string; notification_id: string; created_at: number }>()
    ).results ?? [];
  let n = 0;
  for (const r of rows) {
    if (await calmePour(env, r.user_id)) continue;
    // Une alerte de plus de 24 h n'a plus d'intérêt sur l'écran verrouillé : elle reste dans le fil.
    const statut = r.created_at < Date.now() - 86_400_000 ? 'expire' : await pousser(env, r, { titre: r.titre, texte: r.texte, vers: r.vers, type: r.type, id: r.notification_id });
    await env.DB.prepare('UPDATE notifications_envois SET statut = ?, essais = essais + 1, traite_le = ? WHERE id = ?').bind(statut, Date.now(), r.envoi_id).run();
    n++;
  }
  // Envois orphelins (abonnement supprimé)
  await env.DB.prepare("UPDATE notifications_envois SET statut = 'expire' WHERE statut = 'differe' AND abonnement_id NOT IN (SELECT id FROM notifications_abonnements)").run();
  return n;
}
