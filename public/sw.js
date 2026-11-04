/*
 * Tabr service worker — small, hand-rolled, no dependencies.
 *
 * Caching strategy:
 *  - navigations:      network-first → cache → offline shell (keeps data fresh,
 *                      instant back/forward on repeat visits, works offline).
 *                      Pages are never cached when they set cookies, and the
 *                      page cache is LRU-capped so it can't grow unbounded.
 *  - /_next/static/*:  cache-first (content-hashed, immutable)
 *  - /_next/image/*:   cache-first (hash-keyed optimized images)
 *  - /tabr/* assets:   cache-first (immutable brand/photo assets, WebP/SVG)
 *  - fonts/icons:      cache-first
 */
const VERSION = "v2";
const STATIC_CACHE = `tabr-static-${VERSION}`;
const PAGE_CACHE = `tabr-pages-${VERSION}`;
const MAX_PAGES = 8;

/** Lightweight offline fallback — served only when a navigation fails with no cached copy. */
const OFFLINE_URL = "/offline.html";

/** Reponses that must never be stored. */
function isCacheable(response) {
  if (!response || !response.ok) return false;
  if (response.headers.has("set-cookie")) return false;
  return response.type === "basic" || response.type === "default";
}

/** Keep the page cache bounded — drop oldest entries beyond MAX_PAGES. */
async function trimPageCache() {
  const cache = await caches.open(PAGE_CACHE);
  const keys = await cache.keys();
  const stale = keys.filter((k) => new URL(k.url).pathname !== OFFLINE_URL);
  if (stale.length <= MAX_PAGES) return;
  for (const key of stale.slice(0, stale.length - MAX_PAGES)) {
    await cache.delete(key);
  }
}

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

self.addEventListener("message", (event) => {
  // Allow a page to request immediate activation of a waiting worker.
  if (event.data === "SKIP_WAITING") self.skipWaiting();
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
          if (isCacheable(response)) {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(request, response.clone());
            event.waitUntil(trimPageCache());
          }
          return response;
        } catch {
          const cached =
            (await caches.match(request, { ignoreSearch: true })) ||
            (await caches.match(OFFLINE_URL));
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
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/tabr/") ||
    /\.(?:css|js|woff2?|png|webp|svg|ico|jpg|jpeg|avif)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (isCacheable(response)) {
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          throw new Error("asset fetch failed and no cache");
        }
      })()
    );
  }
});
