//
// service-worker.js — cache do app shell para uso offline.
// Caminhos relativos: funciona tanto na raiz quanto sob subpasta (GitHub Pages).
//
const CACHE = "gymlog-v4";
const ASSETS = [
  "./", "index.html", "styles.css", "manifest.webmanifest",
  "js/app.js", "js/store.js", "js/format.js", "js/charts.js",
  "js/data/taco.js", "js/data/mets.js",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).catch(() => {
        // Offline e fora do cache: navegações caem no app shell.
        if (req.mode === "navigate") return caches.match("index.html");
        return Response.error();
      })
    )
  );
});
