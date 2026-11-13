// Lien « Page » d'un signalement (Réception) : le chemin que la route /api/report a gardé (pathname + search de la
// même origine). Les anciens signalements portent un chemin sans « ? » ; un texte qui n'est ni un chemin du site
// ni une adresse du site s'affiche sans lien.

/** `pageUrl` si c'est un chemin du site (« / », jamais « // ») ou une adresse de l'origine du site ; sinon `null`. */
export function lienDeLaPage(pageUrl: string, origine: string): string | null {
  if (pageUrl.startsWith("/") && !pageUrl.startsWith("//")) return pageUrl;
  if (origine && (pageUrl === origine || pageUrl.startsWith(`${origine}/`))) return pageUrl;
  return null;
}

/** L'origine du site dans le navigateur ("" au rendu serveur). */
export const origineDuSite = (): string => (typeof window === "undefined" ? "" : window.location.origin);
