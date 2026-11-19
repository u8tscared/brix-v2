/* Brix — service worker (écrit à la main, généré au build par scripts/pwa/vite-plugin.ts).
 * - Précache la coque : index.html + fichiers hachés du build (liste injectée ci-dessous).
 * - /api/* : réseau uniquement, jamais mis en cache (données, connexion).
 * - Navigation : réseau d'abord, repli sur index.html en cache hors ligne (HashRouter : une seule page).
 * - Mise à jour : le nouveau SW attend ; l'appli propose « Mettre à jour » puis envoie SKIP_WAITING.
 * - Web Push : affiche les notifications envoyées par worker/src/modules/notifications/push-web.ts.
 */
/* global self, caches, clients */
const VERSION = '__BRIX_VERSION__';
const PRECACHE = __BRIX_PRECACHE__;
const SHELL = 'brix-shell-' + VERSION;
const RUNTIME = 'brix-runtime-v1';
const FONTS = 'brix-fonts-v1';
const scope = new URL(self.registration.scope);
const abs = (p) => new URL(p, scope).href;
const INDEX = abs('./index.html');
const PRECACHED = new Set(PRECACHE.map(abs));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(PRECACHE.map((p) => new Request(abs(p), { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('brix-shell-') && k !== SHELL).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const isApi = (url) => url.origin === scope.origin && /\/api\//.test(url.pathname);
const isFont = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

async function navigation(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;
    const res = await fetch(event.request);
    return res;
  } catch {
    const cache = await caches.open(SHELL);
    return (await cache.match(INDEX)) || (await cache.match(abs('./'))) || Response.error();
  }
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  const net = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit || Response.error());
  return hit || net;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Données et connexion : toujours le réseau, rien en cache.
  if (isApi(url)) return;
  if (request.mode === 'navigate' && url.origin === scope.origin) {
    event.respondWith(navigation(event));
    return;
  }
  if (isFont(url)) {
    event.respondWith(cacheFirst(request, FONTS));
    return;
  }
  if (url.origin !== scope.origin) return;
  if (PRECACHED.has(url.href)) {
    event.respondWith(caches.open(SHELL).then((c) => c.match(url.href)).then((hit) => hit || fetch(request)));
    return;
  }
  // Autres fichiers de l'appli (images de public/, écrans de démarrage) : cache puis mise à jour.
  if (url.pathname.startsWith(scope.pathname)) event.respondWith(staleWhileRevalidate(request));
});

/* ───── Notifications (Web Push) ─────
 * Contenu envoyé par le worker : { titre, texte, vers?, type, id } (MessagePush). */
self.addEventListener('push', (event) => {
  let m = {};
  try {
    m = event.data ? event.data.json() : {};
  } catch {
    m = { texte: event.data ? event.data.text() : '' };
  }
  const titre = m.titre || m.title || 'Brix';
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: m.texte || m.body || '',
      tag: m.id || m.type || undefined,
      icon: abs('./icons/icon-192.png'),
      badge: abs('./icons/badge-96.png'),
      lang: 'fr',
      data: { vers: m.vers || m.url || '/app' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const vers = (event.notification.data && event.notification.data.vers) || '/app';
  const cible = /^https?:/.test(vers) ? vers : abs('./#' + (vers.startsWith('/') ? vers : '/' + vers));
  event.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of fenetres) {
        if (new URL(c.url).origin === scope.origin && 'focus' in c) {
          await c.focus();
          if ('navigate' in c) return c.navigate(cible).catch(() => undefined);
          return undefined;
        }
      }
      return self.clients.openWindow(cible);
    })(),
  );
});
