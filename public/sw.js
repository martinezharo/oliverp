/*
 * OlivERP's service worker.
 *
 * Its job is narrow on purpose. An ERP is not a magazine: the numbers on the
 * screen belong to a session and must never be served from a cache to whoever
 * opens the application next. So nothing that carries data is stored — no API
 * response, no rendered page, nothing from the Convex origin. What is stored
 * is the part of the site that is the same for everybody: the immutable build
 * output, the icons, and one page that explains the network is down.
 *
 * That is also the minimum a browser asks for before it will offer to install
 * the application, which is the other reason this file exists.
 *
 * Bump `VERSION` to retire every cache this worker has written.
 */

const VERSION = "v1";
const CACHE = `oliverp-${VERSION}`;
const OFFLINE_URL = "/offline";

/** Only the paths whose contents can never differ between two visitors. */
function isImmutableAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon.webp" ||
    pathname === "/icon.svg" ||
    pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      // A failed precache would leave the previous worker in charge for good.
      // Losing the offline page is better than never shipping the update.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Convex, and anything else off-origin, is none of this worker's business.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    // Always the live page: a stale shell would show yesterday's session.
    // The cached explanation is only reached when the network refuses.
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error())));
    return;
  }

  if (!isImmutableAsset(url.pathname)) return;

  // Serve immediately from the cache and refresh it in the background: these
  // URLs are content-addressed, so a stale copy is never the wrong copy.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
