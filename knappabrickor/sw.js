/* Knäppa brickor — offline efter första besöket. */
const CACHE = 'kotten-knappabrickor-v1';
const ASSETS = [
  "index.html", "app.js", "kotten.js", "sma-ljud.js", "larare.html",
  "manifest.webmanifest", "icon-180.png",
  "ljud/lines.js", "ljud/rosten.js"
].concat(Array.from({ length: 14 }, (_, i) => 'ljud/knappabrickor-' + String(i + 1).padStart(2, '0') + '.mp3'));
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
