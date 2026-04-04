// =====================================================
// FinMatrix Service Worker
// Version: 2.0.0
// =====================================================

const CACHE_NAME    = "finmatrix-v2";
const STATIC_ASSETS = [
  "./index.html",
  "./style.css",
  "./config.js",
  "./db.js",
  "./utils.js",
  "./main.js",
  "./manifest.json",
  "./logo.png",
  "./icon-192x192.png",
  "./icon-512x512.png",
  "./apple-touch-icon.png",
  "./favicon-32x32.png"
];

const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).then(() => {
        return Promise.allSettled(
          CDN_ASSETS.map(url =>
            fetch(url).then(res => {
              if (res.ok) return cache.put(url, res);
            }).catch(() => {})
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.url.startsWith("chrome-extension")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
