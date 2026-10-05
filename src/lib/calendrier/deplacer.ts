// Déplacer une entrée du calendrier (lot U8, tranche C6, docs/spec-calendrier.md Q5, Q6).
// Pur : ce que demande le dépôt d'une entrée sur un jour — un refus nommé, ou ce
// qu'il faudra écrire une fois confirmé. La date bouge, jamais l'heure ; un créneau de
// scène se pose sur un créneau libre de la grille du jour visé (U1). Les droits
// (soulever ou non) sont ceux de `peutDeplacer` (entrees.ts), déjà portés par l'entrée.

import type { DonneesCalendrier, EntreeCalendrier } from "@/lib/calendrier/entrees";
import { creneauxLibres, joursReservables, saisonDe, type Place } from "@/lib/scene/saison";
import { addDays } from "@/lib/taches/echeances";
import type { Evenement } from "@/types/evenement";
import type { Creneau } from "@/types/programme";
import type { Fois, Tache } from "@/types/tache";
import type { NotifLang } from "@/types/user";

/** « Pas avant aujourd'hui », « La scène n'est pas ouverte ce jour-là », « Aucun créneau libre ce jour-là ». */
export type RefusDeplacement = "avantAujourdhui" | "sceneFermee" | "aucunCreneau";

/** Champs d'un évènement que le déplacement réécrit (les vides ne s'écrivent pas). */
export type ChampsDecales = { date: string } & Partial<Pick<Evenement, "dateFin" | "inscriptionDebut" | "inscriptionFin">>;

export type PlanDeplacement =
  | { type: "refus"; refus: RefusDeplacement }
  | {
      type: "evenement";
      evenement: Evenement;
      champs: ChampsDecales;
      /** La case de la confirmation : les inscrits (leur nombre), les membres d'une réunion, ou rien. */
      prevenir: { inscrits: number } | "membres" | null;
      /** Tâches liées (lot 14) : nommées, elles ne bougent pas (question 7). */
      tachesLiees: string[];
    }
  | { type: "tache"; tache: Tache; de: string; vers: string; /** Sa fois commencée, qui suit. */ fois: Fois | null }
  | { type: "creneau"; programmeId: string; creneau: Creneau; places: Place[]; /** La même heure, si elle est libre. */ parDefaut: Place | null };

const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/** Nombre de jours de `de` à `vers` (dates ISO). */
export function ecartJours(de: string, vers: string): number {
  return Math.round((utc(vers) - utc(de)) / 86_400_000);
}

/** Décale de `n` jours une date « AAAA-MM-JJ » ou « AAAA-MM-JJTHH:MM » (l'heure reste) ; vide reste vide. */
export function decaler(valeur: string, n: number): string {
  return valeur ? addDays(valeur.slice(0, 10), n) + valeur.slice(10) : valeur;
}

/** Q6 : `date`, `dateFin`, `inscriptionDebut` et `inscriptionFin` décalés du même nombre de jours. */
export function champsDecales(e: Evenement, n: number): ChampsDecales {
  const champs: ChampsDecales = { date: decaler(e.date, n) };
  for (const cle of ["dateFin", "inscriptionDebut", "inscriptionFin"] as const) {
    if (e[cle]) champs[cle] = decaler(e[cle], n);
  }
  return champs;
}

/** L'id de la source dans la clé `${source}:${id}:${date}`. */
const idDe = (e: EntreeCalendrier) => e.cle.slice(e.cle.indexOf(":") + 1, e.cle.lastIndexOf(":"));

/**
 * Ce que demande le dépôt de `entree` sur `vers`. `null` : rien à faire (même jour,
 * source introuvable ou qui ne bouge pas). On ne dépose jamais avant aujourd'hui ; un
 * créneau, sur un créneau libre de la grille de ce jour (`horloge.maintenant` écarte
 * ceux d'aujourd'hui déjà commencés).
 */
export function planDeplacement(
  entree: EntreeCalendrier,
  vers: string,
  donnees: Pick<DonneesCalendrier, "evenements" | "taches" | "scene">,
  horloge: { today: string; maintenant: string },
): PlanDeplacement | null {
  if (vers === entree.date) return null;
  if (vers < horloge.today) return { type: "refus", refus: "avantAujourdhui" };
  const id = idDe(entree);
  switch (entree.source) {
    case "evenements":
    case "reunions": {
      const e = donnees.evenements.find((x) => x.id === id);
      if (!e) return null;
      const reunion = entree.source === "reunions";
      return {
        type: "evenement",
        evenement: e,
        champs: champsDecales(e, ecartJours(entree.date, vers)),
        prevenir: reunion ? "membres" : !e.lienExterne && e.inscrits > 0 ? { inscrits: e.inscrits } : null,
        tachesLiees: donnees.taches.filter((t) => t.tache.evenement?.id === e.id).map((t) => t.tache.titre),
      };
    }
    case "taches": {
      const t = donnees.taches.find((x) => x.tache.id === id);
      if (!t) return null;
      return { type: "tache", tache: t.tache, de: entree.date, vers, fois: t.fois.find((f) => f.date === entree.date) ?? null };
    }
    case "scene": {
      const scene = donnees.scene;
      const creneau = scene?.creneaux.find((x) => x.id === id);
      if (!scene || !creneau) return null;
      const saison = saisonDe(scene.programme);
      if (!joursReservables(saison, scene.programme.jourJ).includes(vers)) return { type: "refus", refus: "sceneFermee" };
      const places = creneauxLibres(saison, scene.programme.jourJ, scene.creneaux, { sauf: creneau.id, ...horloge }).filter(
        (p) => p.jour === vers,
      );
      if (places.length === 0) return { type: "refus", refus: "aucunCreneau" };
      return {
        type: "creneau",
        programmeId: scene.programme.id,
        creneau,
        places,
        parDefaut: places.find((p) => p.debut === creneau.debut) ?? null,
      };
    }
    default:
      return null;
  }
}

// ─── La question de la confirmation ──────────────────────────────────────────

const enDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** « jeudi 15 », « dimanche 1er novembre » (le mois quand on le demande). */
function jourFr(iso: string, avecMois: boolean): string {
  const texte = enDate(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", ...(avecMois ? { month: "long" } : {}), timeZone: "UTC",
  });
  return texte.replace(/ 1( |$)/, " 1er$1");
}

/** « 10月15日（周四） ». */
function jourZh(iso: string): string {
  const semaine = enDate(iso).toLocaleDateString("zh-CN", { weekday: "short", timeZone: "UTC" });
  return `${Number(iso.slice(5, 7))}月${Number(iso.slice(8, 10))}日（${semaine}）`;
}

/** « Déplacer « Chants de Noël » du jeudi 15 au mercredi 14 octobre ? » ; le mois de
 *  départ n'est dit que s'il diffère. 中文 : « 把「…」从10月15日（周四）改到10月14日（周三）？ ». */
export function questionDeplacement(titre: string, de: string, vers: string, lang: NotifLang): string {
  if (lang === "zh-CN") return `把「${titre}」从${jourZh(de)}改到${jourZh(vers)}？`;
  return `Déplacer « ${titre} » du ${jourFr(de, de.slice(0, 7) !== vers.slice(0, 7))} au ${jourFr(vers, true)} ?`;
}
