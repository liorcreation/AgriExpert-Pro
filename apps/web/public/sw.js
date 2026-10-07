const CACHE_NAME = 'agriexpert-shell-v5';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/sw.js', '/brand/app-icon.svg', '/brand/app-icon-32.png', '/brand/app-icon-180.png', '/brand/app-icon-192.png', '/brand/app-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    let files = APP_SHELL;
    try {
      const response = await fetch('/precache-manifest.json', { cache: 'no-store' });
      if (response.ok) files = await response.json();
    } catch { /* Keep the minimal shell as a safe fallback. */ }
    await cache.addAll([...new Set([...files, '/precache-manifest.json'])]);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('agriexpert-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('sync', (event) => {
  if (event.tag !== 'agriexpert-sync') return;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((client) => client.postMessage({ type: 'AGRIEXPERT_SYNC_REQUESTED' })));
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'AGRIEXPERT_QUEUE_SYNC') self.registration.sync?.register('agriexpert-sync');
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', response.clone()));
      return response;
    }).catch(async () => (await caches.match('/index.html')) || (await caches.match('/'))));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => {
    const fresh = fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    });
    return cached || fresh;
  }));
});
