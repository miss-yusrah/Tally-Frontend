/*
 * Tabr service worker — small, hand-rolled, no dependencies.
 *
 * Caching strategy:
 *  - navigations:      network-first → cache → offline shell (keeps data fresh,
 *                      instant back/forward on repeat visits, works offline)
 *  - /_next/static/*:  cache-first (content-hashed, immutable)
 *  - /tabr/* images:   cache-first (immutable brand/photo assets, WebP)
 *  - /icons + fonts:   cache-first
 */
const VERSION = "v1";
const STATIC_CACHE = `tabr-static-${VERSION}`;
const PAGE_CACHE = `tabr-pages-${VERSION}`;

/** Lightweight offline fallback — served only when a navigation fails with no cached copy. */
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_CACHE);
      await cache.add(OFFLINE_URL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("tabr-") && key !== STATIC_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GETs — never touch API routes or cross-origin traffic.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cached page, then offline shell.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = (await caches.match(request)) || (await caches.match(OFFLINE_URL));
          if (cached) return cached;
          throw new Error("offline and no cache");
        }
      })()
    );
    return;
  }

  // Immutable static assets: cache-first.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/tabr/") ||
    /\.(?:css|js|woff2?|png|webp|svg|ico|jpg|jpeg|avif)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          throw new Error("asset fetch failed and no cache");
        }
      })()
    );
  }
});
