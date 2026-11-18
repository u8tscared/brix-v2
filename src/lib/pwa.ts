/**
 * PWA : enregistrement du service worker (build de production seulement), proposition de mise à jour,
 * et abonnement aux notifications Web Push (clé VAPID servie par GET /api/notifications/push/cle).
 */
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';

// Rechargement seulement après « Mettre à jour » (pas à la toute première installation du service worker).
let miseAJourDemandee = false;
let propose = false;

function proposerMiseAJour(reg: ServiceWorkerRegistration) {
  const sw = reg.waiting;
  if (!sw || !navigator.serviceWorker.controller || propose) return; // première installation : rien à proposer
  propose = true;
  toast('Nouvelle version disponible', 'info', {
    label: 'Mettre à jour',
    run: () => {
      miseAJourDemandee = true;
      sw.postMessage({ type: 'SKIP_WAITING' });
    },
  }, { duration: 0 });
}

/** À appeler une fois au démarrage. Ne fait rien en développement (`vite`), ni si le navigateur ne sait pas faire. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!miseAJourDemandee) return;
    miseAJourDemandee = false;
    window.location.reload();
  });
  const start = () =>
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((reg) => {
        proposerMiseAJour(reg);
        reg.addEventListener('updatefound', () => {
          const n = reg.installing;
          n?.addEventListener('statechange', () => n.state === 'installed' && proposerMiseAJour(reg));
        });
        // Vérifie les nouvelles versions au retour sur l'appli (PWA ouverte longtemps).
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => undefined));
      })
      .catch(() => undefined);
  // Après le chargement, et un peu plus tard : le précache (toute l'appli) ne doit pas ralentir le premier affichage.
  const later = () => setTimeout(start, 2500);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
}

/* ───── Web Push ───── */

export const pushSupporte = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Mode « écran d'accueil » (iOS n'autorise le Web Push que dans ce mode). */
export const estInstallee = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const versOctets = (b64url: string) => {
  const b64 = (b64url + '='.repeat((4 - (b64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

/** Clé publique VAPID du serveur, ou null si le serveur n'en a pas (push non configuré) ou hors ligne. */
export async function cleVapid(): Promise<string | null> {
  try {
    const r = await api<{ vapidPublicKey: string | null }>('/api/notifications/push/cle');
    return r.vapidPublicKey ?? null;
  } catch {
    return null;
  }
}

export async function abonnementPushActuel(): Promise<PushSubscription | null> {
  if (!pushSupporte()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Demande l'autorisation, s'abonne et enregistre l'abonnement côté serveur. */
export async function activerPush(): Promise<'ok' | 'refuse' | 'indisponible'> {
  if (!pushSupporte()) return 'indisponible';
  const cle = await cleVapid();
  if (!cle) return 'indisponible';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'indisponible';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'refuse';
  const abo = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cle) }));
  const j = abo.toJSON();
  await api('/api/notifications/push/abonnement', { method: 'POST', body: { plateforme: 'web', endpoint: j.endpoint, keys: j.keys } });
  return 'ok';
}

export async function desactiverPush(): Promise<void> {
  const abo = await abonnementPushActuel();
  if (!abo) return;
  await api('/api/notifications/push/abonnement', { method: 'DELETE', body: { endpoint: abo.endpoint } }).catch(() => undefined);
  await abo.unsubscribe().catch(() => undefined);
}
