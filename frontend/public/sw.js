/*
 * Service worker de Fatafalta (PWA, en particulier sur iPhone où l'app s'installe depuis Safari).
 *
 * Objectif : ouvrir vite sur une connexion lente et rester utilisable hors ligne, sans jamais
 * servir de données personnelles périmées.
 * - Pages (navigation) : réseau d'abord (4 s max), sinon la coquille de l'application en cache ;
 *   la préparation garde ses envois hors ligne dans sa propre file (prep/client.js).
 * - Fichiers du site (/static, /fonts, icônes) : cache d'abord (noms versionnés).
 * - API publique de la préparation (catalogue, programmes, vidéos) : réseau d'abord, cache en secours.
 * - Jamais mis en cache : requêtes authentifiées, écritures, PDF, téléchargements.
 * Mise à jour : la nouvelle version attend ; la page propose « Mettre à jour » (SKIP_WAITING).
 */
const VERSION = 'fatafalta-2026-11-19a';
const SHELL = `${VERSION}-coquille`;
const ASSETS = `${VERSION}-fichiers`;
const DATA = `${VERSION}-donnees`;
const IMAGES = `${VERSION}-images`;
// /app : coquille neutre de l'application (sans contenu pré-rendu), servie hors ligne pour toute adresse.
const SHELL_URLS = ['/', '/app', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/fonts/inter-latin-v20.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('fatafalta-') && !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const timeout = (ms) => new Promise((_, reject) => { setTimeout(() => reject(new Error('timeout')), ms); });

const trim = async (name, max) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
};

const networkFirst = async (request, cacheName, ms) => {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([fetch(request), timeout(ms)]);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
};

const cacheFirst = async (request, cacheName, max) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone());
    if (max) trim(cacheName, max);
  }
  return response;
};

const PRIVATE_PAGES = /^\/(compte|dashboard|login|register|recherche|telecharger)(\/|$)/;
const PUBLIC_PREP = /\/api\/prep\/(catalogue|programmes\/[^/]+$|videos|manifest)/;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const personal = request.headers.has('Authorization') || request.headers.has('X-Prep-Token');

  // Navigation : réseau d'abord, coquille hors ligne.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await Promise.race([fetch(request), timeout(4000)]);
        // Dernière version de chaque page publique visitée : disponible hors ligne (30 au plus).
        // Jamais les adresses avec paramètres (recherche, liens de retour) ni les espaces personnels.
        if (response && response.ok && response.type === 'basic' && !url.search && !PRIVATE_PAGES.test(url.pathname)) {
          const cache = await caches.open(SHELL);
          cache.put(request, response.clone());
          trim(SHELL, 30);
        }
        return response;
      } catch (error) {
        const cache = await caches.open(SHELL);
        return (await cache.match(request)) || (await cache.match('/app')) || (await cache.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Fichiers versionnés du site et icônes.
  if (url.origin === self.location.origin && (url.pathname.startsWith('/static/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/organismes/'))) {
    event.respondWith(cacheFirst(request, ASSETS, 120));
    return;
  }

  // Miniatures des vidéos (légères, utiles hors ligne).
  if (url.hostname === 'i.ytimg.com') {
    event.respondWith(cacheFirst(request, IMAGES, 80));
    return;
  }

  // Données publiques de la préparation : réseau d'abord, dernière version connue hors ligne.
  if (!personal && PUBLIC_PREP.test(url.pathname)) {
    event.respondWith(networkFirst(request, DATA, 8000));
  }
});

// Notifications (rappel quotidien) : titre, phrase, adresse de l'application ; rien de personnel.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (error) { data = { title: 'Fatafalta', body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Fatafalta', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'fatafalta',
    data: { url: data.url || '/preparation' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/preparation', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((w) => w.url.startsWith(self.location.origin));
    if (open) { await open.focus(); return open.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
