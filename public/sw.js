// Service Worker — GCC Louange
//
// Trois rôles :
//  1. Notifications Web Push (indispensable sur PWA iOS/Android).
//  2. Cache hors-ligne — réintroduit après avoir été retiré (il provoquait
//     l'affichage de déploiements périmés). La stratégie est choisie pour NE
//     PLUS reproduire ce bug :
//       • les documents HTML sont servis en NETWORK-FIRST, avec une course de
//         3 s : en ligne et réseau correct, la page vient du réseau (dernier
//         déploiement) ; réseau qui traîne (ou 5xx, ou hors ligne), la copie
//         en cache est servie au bout de 3 s et mise à jour en arrière-plan ;
//       • les assets Next.js (/_next/static) sont content-hashés donc
//         immuables → cache-first sans risque de péremption ;
//       • le contenu quasi-figé (polices, index des chants, API chant,
//         scans 简谱 et leurs manifestes) est servi en stale-while-revalidate :
//         instantané, rafraîchi en fond ;
//       • tout le reste (Firestore REST, CSV planning, push) n'est jamais mis
//         en cache.
//   Le nom de cache est versionné, mais RIEN ne le change tout seul au
//   déploiement : il faut changer CACHE à la main quand les stratégies ou le
//   contenu mis en cache changent (l'ancien cache est alors purgé à l'activation).
//   En DÉVELOPPEMENT (serveur local), rien n'est mis en cache : les fichiers
//   de Next n'y portent pas de nom hashé, et les servir depuis le cache
//   affichait l'ancien code après chaque modification (16/09/2026).
//  3. Dimanche hors ligne (audit du 24/10/2026, D2 et D3) : une page jamais
//     ouverte sur l'appareil, hors ligne, affiche /hors-ligne.html (jamais une
//     autre page à sa place) ; la page d'une setlist demande, en ligne, de garder
//     sa propre adresse, la liste, les pages et le contenu de ses chants et leurs
//     scans 简谱 (message « precache ») ; une page en cache est servie après 3 s si
//     le réseau ne répond pas, ou s'il répond 5xx ; une adresse sans barre finale
//     (/planning) se retrouve avec sa barre (/planning/) ; les plafonds suivent un
//     LRU : une entrée relue passe en fin d'ordre (delete + put, sans réseau).

const CACHE = "gcc-louange-v5";

/** Nombre maximal d'entrées gardées pour /_next/static et pour /jianpu/ (les plus anciennes partent d'abord). */
const PLAFOND_STATIC = 300;
const PLAFOND_JIANPU = 250;

/** Attente du réseau avant de servir la copie d'une page (D3). */
const COURSE_MS = 3000;

/** Serveur de développement : localhost, ::1, une adresse IPv4 privée (10.*, 172.16–31.*, 192.168.*) ou *.local.
 *  127.0.0.2 n'en est PAS : le banc scripts/rude-epreuve s'en sert volontairement comme hôte « non local »,
 *  pour voir le service worker travailler sur la machine de développement. */
function estHoteLocal(hote) {
  if (hote === "localhost" || hote === "127.0.0.1" || hote === "::1" || hote === "[::1]" || hote.endsWith(".local")) {
    return true;
  }
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hote);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

const LOCAL = estHoteLocal(self.location.hostname);

// Ressources du shell préchargées à l'installation (best-effort, une par une).
const HORS_LIGNE = "/hors-ligne.html";
const PRECACHE = ["/songs/", "/songs-index.json", HORS_LIGNE];

self.addEventListener("install", (event) => {
  if (!LOCAL) {
    event.waitUntil(
      caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
    );
  }
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      // En local, tout est purgé : sinon un ancien cache continue de servir du code périmé.
      .then((keys) => Promise.all(keys.filter((k) => LOCAL || k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Stratégies de cache ────────────────────────────────────────────────────

/** Garde au plus `max` entrées dont le chemin commence par `prefixe` : les plus anciennes sont retirées. */
function plafonner(cache, prefixe, max) {
  return cache.keys().then((keys) => {
    const siens = keys.filter((k) => new URL(k.url).pathname.startsWith(prefixe));
    return Promise.all(siens.slice(0, Math.max(0, siens.length - max)).map((k) => cache.delete(k)));
  });
}

/** Écrit la réponse en cache, en arrière-plan (la vie du service worker est prolongée jusque-là). */
function enCache(event, request, res, prefixe, max) {
  if (!res || !res.ok) return;
  const copy = res.clone();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.put(request, copy).then(() => (prefixe ? plafonner(c, prefixe, max) : undefined)))
      .catch(() => {})
  );
}

/** La même adresse avec la barre finale (le site sert ses pages ainsi : /planning répond 308 vers /planning/,
 *  redirection que le service worker ne rejoue pas hors ligne). Sans barre ni extension seulement ; les
 *  paramètres restent derrière la barre. */
function copieAvecBarre(request) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return Promise.resolve(undefined);
  }
  if (url.pathname.endsWith("/") || (url.pathname.split("/").pop() || "").includes(".")) return Promise.resolve(undefined);
  url.pathname += "/";
  return caches.match(url.href).then((c) => c || caches.match(url.href, { ignoreSearch: true }));
}

/** La copie d'une page : son adresse exacte, sinon la même sans paramètres (?key=…, ?_rsc=…), sinon avec la barre finale. */
function trouverCopie(request) {
  return caches
    .match(request)
    .then((c) => c || caches.match(request, { ignoreSearch: true }))
    .then((c) => c || copieAvecBarre(request));
}

/** Page « pas de réseau » (D2) : jamais une autre page à la place de celle qu'on demande. */
function pageHorsLigne() {
  return caches.match(HORS_LIGNE).then(
    (c) =>
      c ||
      new Response("Pas de réseau — cette page n'a pas encore été ouverte sur cet appareil.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
  );
}

function networkFirst(event) {
  const request = event.request;
  const reseau = fetch(request).then((res) => {
    enCache(event, request, res);
    return res;
  });
  // Le fetch va jusqu'au bout (et met le cache à jour) même si la copie est servie avant lui.
  event.waitUntil(reseau.catch(() => {}));
  return trouverCopie(request).then((copie) => {
    // Aucune copie : on attend le réseau comme avant, puis la page hors ligne s'il échoue.
    if (!copie) return reseau.catch(pageHorsLigne);
    // Une copie : le réseau a COURSE_MS pour répondre, une réponse 5xx ne vaut pas mieux qu'elle.
    return new Promise((resolve) => {
      const minuteur = setTimeout(() => resolve(copie), COURSE_MS);
      reseau.then(
        (res) => {
          clearTimeout(minuteur);
          resolve(res && res.status >= 500 ? copie : res);
        },
        () => {
          clearTimeout(minuteur);
          resolve(copie);
        }
      );
    });
  });
}

/** LRU : une entrée servie depuis le cache est retirée puis remise (même réponse, sans réseau) : Cache Storage
 *  liste ses clés dans l'ordre d'insertion, elle passe donc en fin d'ordre et `plafonner` retire d'abord les
 *  entrées qu'on n'a pas relues depuis le plus longtemps. */
function remonter(event, request, copy) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.delete(request).then(() => c.put(request, copy)))
      .catch(() => {})
  );
}

function cacheFirst(event, prefixe, max) {
  const request = event.request;
  return caches.match(request).then((cached) => {
    if (cached) {
      remonter(event, request, cached.clone());
      return cached;
    }
    return fetch(request).then((res) => {
      enCache(event, request, res, prefixe, max);
      return res;
    });
  });
}

function staleWhileRevalidate(event, prefixe, max) {
  const request = event.request;
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      // Clonée tout de suite : la page lira `cached` avant que le réseau n'ait échoué.
      const copieLRU = cached && prefixe ? cached.clone() : null;
      const network = fetch(request)
        .then((res) => {
          enCache(event, request, res, prefixe, max);
          return res;
        })
        .catch(() => {
          // Sans réseau, une entrée relue passe en fin d'ordre (LRU) : avec réseau, l'écriture s'en charge.
          if (copieLRU) remonter(event, request, copieLRU);
          return cached;
        });
      event.waitUntil(network.catch(() => {}));
      return cached || network;
    })
  );
}

// ─── Préchargement demandé par la page d'une setlist (D2) ───────────────────
// Message { type: "precache", urls: ["/songs/<slug>/", "/api/song/<slug>", "/setlists/<id>/", "/jianpu/…", …] } :
// chaque chemin absent du cache est téléchargé en arrière-plan, sans bloquer la page. Pour une page HTML, ses
// fichiers /_next/static sont gardés aussi (sinon la page revient sans son JavaScript). Une page ouverte par un
// lien n'est jamais une requête `navigate` : c'est la page elle-même qui demande à garder son adresse.

const CHEMINS_PRECACHE = ["/songs/", "/api/song/", "/setlists/", "/jianpu/"];
const MAX_PRECACHE = 200;

async function garder(cache, chemin) {
  // La page de la setlist et la liste sont relues à chaque ouverture (en ligne) : leur HTML suit le dernier
  // déploiement et cite ses fichiers /_next/static. Le reste (chants, scans) n'est pris qu'une fois.
  if (!chemin.startsWith("/setlists/") && (await cache.match(chemin))) return;
  const res = await fetch(chemin);
  if (!res || !res.ok) return;
  await cache.put(chemin, res.clone());
  const type = res.headers.get("Content-Type") || "";
  if (!type.includes("text/html")) {
    if (chemin.startsWith("/jianpu/")) await plafonner(cache, "/jianpu/", PLAFOND_JIANPU);
    return;
  }
  const html = await res.text();
  const statiques = new Set(html.match(/\/_next\/static\/[^"'\\\s)<>]+\.(?:js|css)/g) || []);
  for (const f of statiques) {
    if (await cache.match(f)) continue;
    const r = await fetch(f).catch(() => null);
    if (r && r.ok) await cache.put(f, r);
  }
  await plafonner(cache, "/_next/static/", PLAFOND_STATIC);
}

self.addEventListener("message", (event) => {
  if (LOCAL) return;
  const data = event.data;
  if (!data || data.type !== "precache" || !Array.isArray(data.urls)) return;
  const chemins = data.urls
    .filter((u) => typeof u === "string" && CHEMINS_PRECACHE.some((p) => u.startsWith(p)) && !u.includes(".."))
    .slice(0, MAX_PRECACHE);
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        for (const c of chemins) await garder(cache, c).catch(() => {});
      })
      .catch(() => {})
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Développement : tout passe par le réseau, rien n'est mis en cache.
  if (LOCAL) return;

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
    event.respondWith(networkFirst(event));
    return;
  }

  // Assets Next.js content-hashés : immuables → cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event, "/_next/static/", PLAFOND_STATIC));
    return;
  }

  // Contenu quasi-figé : polices, index des chants, contenu d'un chant ; les
  // scans 简谱, affichés par défaut (lot 1 du chantier 简谱) : manifestes et
  // images, servis tels quels sous /jianpu/ (images non optimisées).
  if (
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/songs-index.json" ||
    url.pathname.startsWith("/api/song/") ||
    url.pathname.startsWith("/jianpu/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/logo.png"
  ) {
    const jianpu = url.pathname.startsWith("/jianpu/");
    event.respondWith(staleWhileRevalidate(event, jianpu ? "/jianpu/" : undefined, PLAFOND_JIANPU));
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
