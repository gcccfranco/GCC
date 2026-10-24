// Bornes des entrées des routes push, report, équipes et planning (docs/spec-corrections-audit.md, A2, S7).
// Fonctions pures : les formulaires ont déjà ces bornes, le serveur les revérifie. Les `lireCorps…` rendent les valeurs
// propres d'un corps de requête ou lèvent HttpError(400) ; chaque route les appelle en premier.

import { HttpError } from "@/lib/evenements/serveur";
import { validateReport } from "@/lib/report/reportValidator";
import { REPORT_KINDS, type ReportKind } from "@/types/report";
import { TRI_ORDER } from "@/lib/planning/releases";

export const TITRE_MAX = 80;
export const MESSAGE_MAX = 300;
export const SLUG_MAX = 200;
export const UIDS_MAX = 200;
export const ID_SIMPLE = /^[\w-]+$/;

/** Chemin interne sûr uniquement (pas d'URL externe) ; sinon `defaut`. */
export function cheminInterne(url: unknown, defaut: string): string {
  return typeof url === "string" && /^\/[a-zA-Z0-9/_-]*$/.test(url) ? url : defaut;
}

/** Page d'où part un signalement (en-tête Referer) : le chemin seulement, s'il est de la même origine que le site,
 *  borné à PAGE_URL_MAX caractères ; sinon chaîne vide. */
export const PAGE_URL_MAX = 500;
export function cheminDeLaPage(referer: string | null | undefined, origine: string): string {
  if (!referer) return "";
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return "";
  }
  if (url.origin !== origine) return "";
  return cheminInterne(url.pathname, "").slice(0, PAGE_URL_MAX);
}

/** Titre et message d'une notification manuelle trop longs ? */
export function texteTropLong(title: string, body: string): boolean {
  return title.trim().length > TITRE_MAX || body.trim().length > MESSAGE_MAX;
}

/** Slug de chant d'un signalement : une chaîne, coupée à SLUG_MAX. */
export function coupeSlug(v: unknown): string {
  return typeof v === "string" ? v.slice(0, SLUG_MAX) : "";
}

/** Identifiant Firestore simple : un « / » ferait viser un autre document. */
export function idSimple(v: unknown): v is string {
  return typeof v === "string" && ID_SIMPLE.test(v);
}

/** Année d'un planning : entier de 2026 à 2100. */
export function anneeValide(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 2026 && v <= 2100;
}

const corps = (b: unknown): Record<string, unknown> => (b && typeof b === "object" ? (b as Record<string, unknown>) : {});

/** notify-audience : audience ou liste d'uids, titre et message bornés, chemin interne. */
export function lireCorpsAudience(b: unknown) {
  const { audience, uids, title, body, url } = corps(b);
  if (typeof title !== "string" || typeof body !== "string" || !title.trim() || !body.trim()) {
    throw new HttpError(400, "Titre et message requis");
  }
  if (texteTropLong(title, body)) throw new HttpError(400, "Texte trop long");
  return {
    audience: typeof audience === "string" ? audience : undefined,
    uids: Array.isArray(uids) ? uids : undefined,
    title: title.trim(),
    body: body.trim(),
    url: cheminInterne(url, "/mes-services"),
  };
}

/** report : validation du titre et de la description, type, chant (slug coupé à SLUG_MAX, titre à 200). */
export function lireCorpsReport(b: unknown) {
  const c = corps(b);
  const report = validateReport(c);
  const kind: ReportKind = REPORT_KINDS.includes(c.kind as ReportKind) ? (c.kind as ReportKind) : "site";
  return {
    report,
    kind,
    songSlug: kind === "song" ? coupeSlug(c.songSlug) : "",
    songTitle: kind === "song" && typeof c.songTitle === "string" ? c.songTitle.slice(0, 200) : "",
  };
}

/** notify-setlist : identifiant de setlist simple, `auto` booléen. */
export function lireCorpsNotifySetlist(b: unknown) {
  const { setlistId, auto } = corps(b);
  if (!idSimple(setlistId)) throw new HttpError(400, "setlistId manquant");
  return { setlistId, auto: auto === true };
}

/** broadcast : titre et message requis, chemin interne (« / » par défaut). */
export function lireCorpsBroadcast(b: unknown) {
  const { title, body, url } = corps(b);
  if (typeof title !== "string" || typeof body !== "string" || !title || !body) {
    throw new HttpError(400, "title et body sont requis");
  }
  return { title, body, url: cheminInterne(url, "/") };
}

/** equipes/rattachement : liste d'uids (chaînes), au plus UIDS_MAX. */
export function lireUidsRattachement(b: unknown): string[] {
  const { uids } = corps(b);
  if (!Array.isArray(uids)) throw new HttpError(400, "Requête incomplète");
  const liste = uids.filter((u): u is string => typeof u === "string");
  if (liste.length > UIDS_MAX) throw new HttpError(400, "Trop de comptes");
  return liste;
}

/** planning/release : clé, trimestre, publier (par défaut oui), année (entier 2026-2100 ; absente = année en cours). */
export function lireCorpsRelease(b: unknown, anneeCourante: number = new Date().getFullYear()) {
  const { key, tri, publish, year } = corps(b);
  if (typeof tri !== "string" || !(TRI_ORDER as readonly string[]).includes(tri)) throw new HttpError(400, "Trimestre invalide");
  if (year !== undefined && !anneeValide(year)) throw new HttpError(400, "Année invalide");
  return { key: typeof key === "string" ? key : undefined, tri, publish: publish !== false, year: year ?? anneeCourante };
}
