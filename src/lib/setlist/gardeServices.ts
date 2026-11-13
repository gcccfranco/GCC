// Services gardés hors ligne d'office (lot Pupitre PU-3, docs/spec-entree-musiciens.md, décision 3).
//
// À l'ouverture de l'onglet Setlists, les setlists des services du compte des 14 prochains jours (question 5) sont
// copiées sur l'appareil (`ecrireCopie`) et leurs pages, chants et scans demandés au service worker, une fois par
// jour et par setlist (marque en localStorage). Aucun changement de public/sw.js : le message « precache » existe.
// Le site marche sans stockage : toute erreur est avalée.

import type { FSSetlist } from "@/types/setList";
import { urlsJianpuAGarder, type JianpuManifest } from "@/lib/jianpu/images";
import { joursAvant } from "@/lib/planning/accueil";
import { ecrireCopie, PREFIXE_GARDE } from "@/lib/setlist/copieHorsLigne";

/** Pages et données à garder pour une setlist : sa page, la liste, chaque chant (page et contenu) et les scans 简谱. */
export function urlsAGarder(setlist: FSSetlist, manifest: JianpuManifest): string[] {
  const slugs = new Set<string>();
  for (const it of setlist.items) {
    if (it.songSlug) slugs.add(it.songSlug);
    for (const fs of it.fusionSongs ?? []) slugs.add(fs.songSlug);
  }
  return [
    `/setlists/${encodeURIComponent(setlist.id)}/`,
    "/setlists/",
    ...[...slugs].flatMap((s) => [`/songs/${encodeURIComponent(s)}/`, `/api/song/${s}`]),
    ...(slugs.size ? urlsJianpuAGarder(manifest, slugs) : []),
  ];
}

/** Demande au service worker de garder ces adresses (sans service worker : rien à garder). */
export function demanderPrecache(urls: string[]): void {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "precache", urls });
  } catch { /* pas de service worker */ }
}

/** Vrai si un service worker contrôle la page et que chaque adresse est dans un cache. Ne lève jamais. */
export async function precacheFait(urls: string[]): Promise<boolean> {
  try {
    if (!navigator.serviceWorker?.controller || typeof caches === "undefined") return false;
    for (const url of urls) if (!(await caches.match(url))) return false;
    return true;
  } catch {
    return false;
  }
}

type Marque = Record<string, string>;

/** Garde les services des 14 prochains jours (setlists déjà filtrées par l'appelant) : copie + précache, une fois
 *  par jour et par setlist. Hors ligne, ne fait rien. */
export async function garderServices(o: {
  uid: string;
  setlists: FSSetlist[];
  manifest: JianpuManifest;
  /** AAAA-MM-JJ, heure locale. */
  aujourdhui: string;
}): Promise<void> {
  try {
    if (navigator.onLine === false) return;
    const cle = PREFIXE_GARDE + o.uid;
    let marque: Marque = {};
    try { marque = JSON.parse(localStorage.getItem(cle) ?? "{}") as Marque; } catch { /* marque illisible */ }
    // Les marques d'un autre jour sont retirées.
    const nouvelle: Marque = {};
    for (const [id, jour] of Object.entries(marque)) if (jour === o.aujourdhui) nouvelle[id] = jour;
    for (const s of o.setlists) {
      const ecart = joursAvant(s.date, o.aujourdhui);
      if (ecart < 0 || ecart > 14 || nouvelle[s.id] === o.aujourdhui) continue;
      await ecrireCopie(s, o.uid);
      demanderPrecache(urlsAGarder(s, o.manifest));
      // Marquée seulement si la demande a pu partir entière : un service worker qui contrôle la page et le manifeste
      // 简谱 lu (sinon les scans manqueraient). Sinon, la prochaine ouverture de l'onglet retente.
      if (navigator.serviceWorker?.controller && Object.keys(o.manifest).length > 0) nouvelle[s.id] = o.aujourdhui;
    }
    try { localStorage.setItem(cle, JSON.stringify(nouvelle)); } catch { /* pas de stockage */ }
  } catch { /* la garde est un confort */ }
}
