/*
 * Fatafalta — service worker de la PWA.
 *
 * Stratégie prudente : une mise à jour publiée n'est jamais bloquée par le cache.
 *  - Page (navigation) : réseau d'abord ; la dernière page reçue sert de secours hors ligne.
 *    L'application est une page unique : toutes les adresses renvoient le même index.html.
 *  - Fichiers produits par `expo export` (/_expo/static/, /assets/) : leur nom contient une
 *    empreinte, ils ne changent jamais → cache d'abord.
 *  - Tout le reste (API, vidéos, autres domaines) n'est pas intercepté.
 */
const VERSION = 'v1';
const PAGE_CACHE = `fatafalta-page-${VERSION}`;
const STATIC_CACHE = `fatafalta-static-${VERSION}`;
const SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.add(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [PAGE_CACHE, STATIC_CACHE];
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith('fatafalta-') && !keep.includes(key)).map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

const isFingerprinted = (url) => url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const type = response.headers.get('content-type') || '';
        if (response.ok && type.includes('text/html')) {
          const cache = await caches.open(PAGE_CACHE);
          await cache.put(SHELL, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(SHELL);
        return cached || Response.error();
      }
    })());
    return;
  }

  if (isFingerprinted(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })());
  }
});
