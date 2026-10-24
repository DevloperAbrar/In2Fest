/* In2Fest service worker.
 * - Never touches /api, /uploads or any cross-origin request (Cashfree, Google, fonts, API on another domain)
 * - Pages: network first, "offline" screen when there is no internet
 * - /assets/* (hashed by Vite): cache first, immutable
 * - /icons/*: stale-while-revalidate
 * Billing / payments / bookings are never cached, so data is always live.
 */
const VERSION = "v1";
const STATIC_CACHE = `in2fest-static-${VERSION}`;
const ASSET_CACHE = `in2fest-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_ASSET_ENTRIES = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("in2fest-") && k !== STATIC_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
  }
}

// A missing JS/CSS chunk must never be cached as an HTML fallback page.
function isCacheableAsset(res) {
  if (!res || !res.ok || res.type !== "basic") return false;
  const type = (res.headers.get("content-type") || "").toLowerCase();
  return !type.includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/uploads")) return;
  if (url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest") return;

  // Page loads
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error())
    );
    return;
  }

  // Vite hashed files: cache first
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (isCacheableAsset(res)) {
          cache.put(req, res.clone());
          trimCache(ASSET_CACHE, MAX_ASSET_ENTRIES);
        }
        return res;
      })
    );
    return;
  }

  // Icons: stale-while-revalidate
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (isCacheableAsset(res)) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
  // everything else: default browser behaviour
});