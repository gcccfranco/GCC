// Fonctions du haut de SetlistDetailClient (lot N, N4b) : l'adresse de la vue et le défilement. Ni hook ni état
// React ; elles lisent `window` / `document` au moment de l'appel, comme avant.

/** Adresse de la vue : `/setlists/[id]` (Liste) ou `?vue=partitions&chant=N` (Q9). */
export function adresseVue(chant: number | null): string {
  return chant === null ? window.location.pathname : `${window.location.pathname}?vue=partitions&chant=${chant}`;
}

/** L'adresse est encore celle de la setlist : en partant vers la page d'un
 *  chant, la page défile en haut avant de disparaître, et récrire l'adresse
 *  effacerait alors les réglages du chant. */
export function surLaSetlist(id: string): boolean {
  return window.location.pathname.replace(/\/$/, "") === `/setlists/${id}`;
}

/** Lit la vue dans l'adresse : `null` pour la Liste. */
export function lireAdresse(): { chant: number | null } | null {
  const q = new URLSearchParams(window.location.search);
  if (q.get("vue") !== "partitions") return null;
  const n = Number(q.get("chant"));
  return { chant: Number.isInteger(n) && n > 0 ? n : null };
}

/** Défile sans escamoter les barres : la bascule reste au-dessus du chant amené
 *  (même verrou que l'index A–Z, `useScrollDirection`). */
export function poser(y: number): number {
  const root = document.documentElement;
  root.setAttribute("data-nav-lock", "");
  window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: "instant" });
  requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-nav-lock")));
  return window.scrollY;
}
