// Service Worker — GCC Louange
//
// Deux rôles :
//  1. Notifications Web Push (indispensable sur PWA iOS/Android).
//  2. Cache hors-ligne — réintroduit après avoir été retiré (il provoquait
//     l'affichage de déploiements périmés). La stratégie est choisie pour NE
//     PLUS reproduire ce bug :
//       • les documents HTML sont servis en NETWORK-FIRST → en ligne, on a
//         toujours le dernier déploiement ; hors-ligne seulement, on sert la
//         copie en cache ;
//       • les assets Next.js (/_next/static) sont content-hashés donc
//         immuables → cache-first sans risque de péremption ;
//       • le contenu quasi-figé (polices, index des chants, API chant) est
//         servi en stale-while-revalidate : instantané, rafraîchi en fond ;
//       • tout le reste (Firestore REST, CSV planning, push) n'est jamais mis
//         en cache.
//   Le nom de cache est versionné : à chaque déploiement (nouveau contenu de
//   ce fichier), l'ancien cache est purgé à l'activation.

const CACHE = "gcc-louange-v1";

// Ressources du shell préchargées à l'installation (best-effort).
const PRECACHE = ["/songs/", "/songs-index.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Stratégies de cache ────────────────────────────────────────────────────

function networkFirst(request) {
  return fetch(request)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })
    .catch(() => caches.match(request).then((cached) => cached || caches.match("/songs/")));
}

function cacheFirst(request) {
  return caches.match(request).then(
    (cached) =>
      cached ||
      fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
  );
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Uniquement notre origine — jamais Firestore, Google Sheets, YouTube…
  if (url.origin !== self.location.origin) return;

  // Documents HTML : network-first (déploiement toujours frais en ligne).
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets Next.js content-hashés : immuables → cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Contenu quasi-figé : polices, index des chants, contenu d'un chant.
  if (
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/songs-index.json" ||
    url.pathname.startsWith("/api/song/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/logo.png"
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Le reste (autres API, CSV planning proxifié, etc.) : réseau, repli cache.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ─── Réception d'une notification push ─────────────────────────────────────────
// Le serveur envoie un JSON : { title, body, url, tag }.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "GCC Louange";
  const options = {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    // tag : regroupe/remplace les notifs d'un même sujet (ex. une setlist)
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Clic sur la notification ──────────────────────────────────────────────────
// Focus un onglet existant de l'app si possible, sinon en ouvre un.

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
