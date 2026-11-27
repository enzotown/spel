const CACHE = 'kotten-vridratt-v1';
const ASSETS = ["index.html", "app.js", "kotten.js", "sma-ljud.js", "larare.html",
  "manifest.webmanifest", "icon-180.png", "icon-512.png",
  "ljud/lines.js", "ljud/rosten.js",
  "ljud/vridratt-01.mp3", "ljud/vridratt-02.mp3", "ljud/vridratt-03.mp3", "ljud/vridratt-04.mp3",
  "ljud/vridratt-05.mp3", "ljud/vridratt-06.mp3", "ljud/vridratt-07.mp3", "ljud/vridratt-08.mp3"];
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