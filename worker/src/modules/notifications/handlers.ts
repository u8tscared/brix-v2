/** Service des notifications côté artisan connecté : fil, lecture, préférences, abonnements push. */
import { ErreurParcours, deB64url, enEuros, nouvelId, texte } from '../documents/commun';
import type { EnvParcours } from '../documents/env';
import { pousser } from './notifier';
import { webPushConfigure } from './push-web';
import { CANAUX_NATIFS } from './push-natif';
import { TYPES_NOTIFICATION, estTypeNotification, type TypeNotification } from './types';

interface Ctx {
  organizationId: string;
  userId: string;
}

interface LigneNotification {
  id: string;
  type: string;
  titre: string;
  texte: string;
  vers: string | null;
  montant_cents: number | null;
  document_type: string | null;
  document_id: string | null;
  created_at: number;
  lu_le: number | null;
}

export class NotificationsService {
  constructor(private env: EnvParcours, private ctx: Ctx) {}

  private async typesMasques(): Promise<string[]> {
    const r = await this.env.DB.prepare("SELECT type FROM notifications_preferences WHERE user_id = ? AND canal = 'app' AND actif = 0").bind(this.ctx.userId).all<{ type: string }>();
    return (r.results ?? []).map((x) => x.type);
  }

  async lister(o: { nonLues?: boolean; limite?: number; avant?: number }) {
    const limite = Math.min(Math.max(Math.trunc(o.limite ?? 50), 1), 100);
    const masques = await this.typesMasques();
    const filtreType = masques.length ? `AND n.type NOT IN (${masques.map(() => '?').join(',')})` : '';
    const rows =
      (
        await this.env.DB.prepare(
          `SELECT n.*, l.lu_le FROM notifications n
           LEFT JOIN notifications_lectures l ON l.notification_id = n.id AND l.user_id = ?
           WHERE n.organization_id = ? ${filtreType} ${o.avant ? 'AND n.created_at < ?' : ''} ${o.nonLues ? 'AND l.lu_le IS NULL' : ''}
           ORDER BY n.created_at DESC LIMIT ?`,
        )
          .bind(this.ctx.userId, this.ctx.organizationId, ...masques, ...(o.avant ? [o.avant] : []), limite)
          .all<LigneNotification>()
      ).results ?? [];
    const nonLues = await this.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM notifications n LEFT JOIN notifications_lectures l ON l.notification_id = n.id AND l.user_id = ?
       WHERE n.organization_id = ? ${filtreType} AND l.lu_le IS NULL`,
    )
      .bind(this.ctx.userId, this.ctx.organizationId, ...masques)
      .first<{ n: number }>();
    return {
      notifications: rows.map((r) => ({
        id: r.id,
        type: r.type,
        titre: r.titre,
        texte: r.texte,
        vers: r.vers,
        montant: r.montant_cents == null ? null : enEuros(r.montant_cents),
        document: r.document_type ? { type: r.document_type, id: r.document_id } : null,
        creeLe: r.created_at,
        lue: r.lu_le != null,
      })),
      nonLues: nonLues?.n ?? 0,
      suivant: rows.length === limite ? rows[rows.length - 1].created_at : null,
    };
  }

  async marquerLu(body: Record<string, unknown>) {
    const maintenant = Date.now();
    if (body.tout === true) {
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO notifications_lectures (notification_id, user_id, lu_le) SELECT id, ?, ? FROM notifications WHERE organization_id = ?`,
      )
        .bind(this.ctx.userId, maintenant, this.ctx.organizationId)
        .run();
      return { ok: true };
    }
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string' && /^ntf_[A-Za-z0-9_-]{1,40}$/.test(x)).slice(0, 200) : [];
    if (!ids.length) throw new ErreurParcours(400, 'champ_invalide', 'Indiquez les notifications à marquer comme lues.');
    await this.env.DB.batch(
      ids.map((id) =>
        this.env.DB.prepare(
          'INSERT OR IGNORE INTO notifications_lectures (notification_id, user_id, lu_le) SELECT id, ?, ? FROM notifications WHERE id = ? AND organization_id = ?',
        ).bind(this.ctx.userId, maintenant, id, this.ctx.organizationId),
      ),
    );
    return { ok: true };
  }

  async preferences() {
    const rows = (await this.env.DB.prepare('SELECT type, canal, actif FROM notifications_preferences WHERE user_id = ?').bind(this.ctx.userId).all<{ type: string; canal: string; actif: number }>()).results ?? [];
    const reg = await this.env.DB.prepare('SELECT calme_debut, calme_fin, fuseau FROM notifications_reglages WHERE user_id = ?')
      .bind(this.ctx.userId)
      .first<{ calme_debut: string | null; calme_fin: string | null; fuseau: string }>();
    const preferences = Object.fromEntries(
      (Object.keys(TYPES_NOTIFICATION) as TypeNotification[]).map((t) => {
        const val = (canal: 'app' | 'push') => {
          const r = rows.find((x) => x.type === t && x.canal === canal);
          return r ? !!r.actif : TYPES_NOTIFICATION[t][canal];
        };
        return [t, { libelle: TYPES_NOTIFICATION[t].libelle, app: val('app'), push: val('push') }];
      }),
    );
    return {
      preferences,
      heuresCalmes: reg?.calme_debut && reg?.calme_fin ? { debut: reg.calme_debut, fin: reg.calme_fin, fuseau: reg.fuseau } : null,
      push: { web: webPushConfigure(this.env), apns: CANAUX_NATIFS.apns.configure(this.env), fcm: CANAUX_NATIFS.fcm.configure(this.env) },
    };
  }

  async majPreferences(body: Record<string, unknown>) {
    const stmts: D1PreparedStatement[] = [];
    const prefs = body.preferences;
    if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
      for (const [type, v] of Object.entries(prefs as Record<string, unknown>)) {
        if (!estTypeNotification(type) || !v || typeof v !== 'object') continue;
        for (const canal of ['app', 'push'] as const) {
          const actif = (v as Record<string, unknown>)[canal];
          if (typeof actif !== 'boolean') continue;
          stmts.push(
            this.env.DB.prepare(
              `INSERT INTO notifications_preferences (user_id, organization_id, type, canal, actif) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(user_id, type, canal) DO UPDATE SET actif = excluded.actif`,
            ).bind(this.ctx.userId, this.ctx.organizationId, type, canal, actif ? 1 : 0),
          );
        }
      }
    }
    if ('heuresCalmes' in body) {
      const h = body.heuresCalmes as { debut?: unknown; fin?: unknown; fuseau?: unknown } | null;
      const ok = (s: unknown) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
      if (h !== null && (!h || !ok(h.debut) || !ok(h.fin))) throw new ErreurParcours(400, 'champ_invalide', 'Heures calmes : format HH:MM attendu.');
      const fuseau = h && typeof h.fuseau === 'string' && /^[A-Za-z_]+\/[A-Za-z_]+$/.test(h.fuseau) ? h.fuseau : 'Europe/Paris';
      stmts.push(
        this.env.DB.prepare(
          `INSERT INTO notifications_reglages (user_id, organization_id, calme_debut, calme_fin, fuseau) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET calme_debut = excluded.calme_debut, calme_fin = excluded.calme_fin, fuseau = excluded.fuseau`,
        ).bind(this.ctx.userId, this.ctx.organizationId, h ? (h.debut as string) : null, h ? (h.fin as string) : null, fuseau),
      );
    }
    if (stmts.length) await this.env.DB.batch(stmts);
    return this.preferences();
  }

  cleVapid() {
    return { vapidPublicKey: this.env.VAPID_PUBLIC_KEY ?? null };
  }

  async abonner(body: Record<string, unknown>) {
    const plateforme = body.plateforme;
    let cible: string;
    let p256dh: string | null = null;
    let auth: string | null = null;
    if (plateforme === 'web') {
      cible = texte(body.endpoint, 'endpoint', 10, 1000);
      if (!/^https:\/\/[^\s]+$/.test(cible)) throw new ErreurParcours(400, 'champ_invalide', 'Adresse d’abonnement invalide.');
      const keys = (body.keys ?? {}) as Record<string, unknown>;
      p256dh = texte(keys.p256dh, 'keys.p256dh', 80, 100);
      auth = texte(keys.auth, 'keys.auth', 16, 30);
      try {
        if (deB64url(p256dh).length !== 65 || deB64url(auth).length !== 16) throw new Error();
      } catch {
        throw new ErreurParcours(400, 'champ_invalide', 'Clés d’abonnement invalides.');
      }
    } else if (plateforme === 'apns' || plateforme === 'fcm') {
      cible = texte(body.token, 'token', 20, 4096);
    } else throw new ErreurParcours(400, 'champ_invalide', 'Plateforme inconnue (web, apns ou fcm).');
    const appareil = typeof body.appareil === 'string' ? body.appareil.slice(0, 120) : null;
    const id = nouvelId('abo');
    await this.env.DB.prepare(
      `INSERT INTO notifications_abonnements (id, organization_id, user_id, plateforme, cible, p256dh, auth, appareil, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cible) DO UPDATE SET organization_id = excluded.organization_id, user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, appareil = excluded.appareil, echecs = 0`,
    )
      .bind(id, this.ctx.organizationId, this.ctx.userId, plateforme, cible, p256dh, auth, appareil, Date.now())
      .run();
    return { ok: true };
  }

  async desabonner(body: Record<string, unknown>) {
    const cible = typeof body.endpoint === 'string' ? body.endpoint : typeof body.token === 'string' ? body.token : '';
    if (!cible) throw new ErreurParcours(400, 'champ_invalide', 'Indiquez endpoint ou token.');
    await this.env.DB.prepare('DELETE FROM notifications_abonnements WHERE cible = ? AND user_id = ?').bind(cible, this.ctx.userId).run();
    return { ok: true };
  }

  async tester() {
    const abos = (await this.env.DB.prepare('SELECT id, user_id, plateforme, cible, p256dh, auth FROM notifications_abonnements WHERE user_id = ?').bind(this.ctx.userId).all()).results ?? [];
    const res: Record<string, number> = {};
    for (const a of abos as never[]) {
      const r = await pousser(this.env, a, { titre: 'Brix', texte: 'Les notifications fonctionnent sur cet appareil.', vers: null, type: 'test', id: 'test' });
      res[r] = (res[r] ?? 0) + 1;
    }
    return { appareils: abos.length, resultats: res };
  }
}
