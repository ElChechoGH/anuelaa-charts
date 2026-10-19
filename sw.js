/* App instalable: siempre intenta la versión más nueva; sin conexión usa la última guardada. */
const VERSION = 'aa-v24';
const SHELL = ['./', 'index.html', 'assets/app.css', 'assets/glass.css', 'assets/app.js', 'assets/studio.js', 'assets/studio.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png', 'icons/favicon-32.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('aa-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // fuentes, miniaturas, vídeos y APIs: directo
  const key = url.pathname.endsWith('/data/data.json') ? 'data/data.json' : e.request;
  // red primero (siempre lo último); si no hay conexión, la copia guardada
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => {
    if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(key, cp)); }
    return r;
  }).catch(() => caches.open(VERSION).then((c) => c.match(key).then((m) => m || (e.request.mode === 'navigate' ? c.match('index.html') : undefined)))));
});
