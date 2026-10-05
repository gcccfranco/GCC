// Grille du mois du calendrier (lot U8, tranche C3, docs/spec-calendrier.md § Écrans).
// Pur : les jours d'une grille lundi → dimanche sur six semaines, le mois voisin,
// et le libellé court d'une entrée dans sa case. Dates ISO « AAAA-MM-JJ ».

import type { EntreeCalendrier } from "@/lib/calendrier/entrees";
import { addDays } from "@/lib/taches/echeances";
import type { NotifLang } from "@/types/user";

/** Les 42 jours affichés pour `mois` (« AAAA-MM ») : du lundi qui précède
 *  (ou qui est) le 1er, six semaines. */
export function joursDeLaGrille(mois: string): string[] {
  const premier = `${mois}-01`;
  const jourSemaine = new Date(`${premier}T00:00:00Z`).getUTCDay(); // 0 = dimanche
  const lundi = addDays(premier, -((jourSemaine + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(lundi, i));
}

/** Le mois `delta` mois plus loin (« AAAA-MM »). */
export function moisVoisin(mois: string, delta: number): string {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Le dernier jour de `mois` (« AAAA-MM ») : « AAAA-MM-JJ ». */
export function finDuMois(mois: string): string {
  return addDays(`${moisVoisin(mois, 1)}-01`, -1);
}

/** Le libellé d'une entrée dans une case, tronqué ensuite par le CSS (planche
 *  bo-calendrier) : « Culte Franco · Lou M. », « Réunion DA 20:00 »,
 *  « Petit déj : libre » ou le nom inscrit. */
export function libelleCourt(e: EntreeCalendrier, lang: NotifLang): string {
  if (e.source === "services") {
    // « Présidence : Lou M. » / « 司会：Lou M. » → le nom ; l'EDD garde ses classes.
    const qui = e.detail.replace(/^[^:：]*[:：]\s*/, "");
    return qui ? `${e.titre} · ${qui}` : e.titre;
  }
  if (e.source === "petitDej") {
    if (!e.cle.startsWith("petitDej:libre:")) return e.detail;
    return lang === "zh-CN" ? `${e.titre}：${e.detail}` : `${e.titre} : ${e.detail.toLowerCase()}`;
  }
  return e.heure ? `${e.titre} ${e.heure}` : e.titre;
}

// ─── Libellés de dates (Intl, en UTC : une date ISO ne glisse jamais d'un jour) ───

const locale = (lang: NotifLang) => (lang === "zh-CN" ? "zh-CN" : "fr-FR");
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** « Octobre 2026 » ; « 2026年10月 ». Sans l'année (téléphone, planche
 *  bo-telephone-calendrier) : « Octobre » ; « 10月 ». */
export function titreMois(mois: string, lang: NotifLang, sansAnnee = false): string {
  if (sansAnnee) return majuscule(nomMois(mois, lang));
  return majuscule(utc(`${mois}-01`).toLocaleDateString(locale(lang), { month: "long", year: "numeric", timeZone: "UTC" }));
}

/** « novembre » ; « 11月 » (« Afficher novembre », « 显示11月 »). */
export function nomMois(mois: string, lang: NotifLang): string {
  if (lang === "zh-CN") return `${Number(mois.slice(5, 7))}月`;
  return utc(`${mois}-01`).toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" });
}

/** « Dimanche 11 octobre », « Jeudi 1er octobre » ; « 10月11日星期日 ». */
export function titreJour(date: string, lang: NotifLang): string {
  const texte = utc(date).toLocaleDateString(locale(lang), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return majuscule(lang === "zh-CN" ? texte : texte.replace(/ 1 /, " 1er "));
}

/** « lun. » … « dim. » ; « 周一 » … « 周日 ». */
export function joursDeLaSemaine(lang: NotifLang): string[] {
  return joursDeLaGrille("2026-06").slice(0, 7).map((d) => utc(d).toLocaleDateString(locale(lang), { weekday: "short", timeZone: "UTC" }));
}
