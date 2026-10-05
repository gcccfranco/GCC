// Prévenir d'un déplacement (lot U8, tranche C7, docs/spec-calendrier.md Q7 et Q8).
// Pur, partagé par le cron du matin et les tests. Un évènement déplacé depuis le
// calendrier, case « Prévenir » cochée, porte `deplacement` ; le lendemain matin, ses
// inscrits (les membres, pour une réunion) lisent une ligne de plus dans leur rappel :
// « Changement : Foot au parc passe au vendredi 9 octobre, 19:00. ». Pas de
// notification de plus : une seule par personne et par jour.

import { jourFr } from "@/lib/calendrier/deplacer";
import { isPast } from "@/lib/evenements/agenda";
import { jourDuMois } from "@/lib/reunions/sujets";
import { addDays } from "@/lib/taches/echeances";
import type { Evenement } from "@/types/evenement";
import type { NotifLang } from "@/types/user";

/** « Changement : Foot au parc passe au vendredi 9 octobre, 19:00. » ;
 *  中文 « 活动改期：Foot au parc 改到 10月9日 19:00。». La date est celle de l'évènement. */
export function ligneDeplacement(e: Pick<Evenement, "titre" | "date" | "heure">, lang: NotifLang): string {
  if (lang === "zh-CN") return `活动改期：${e.titre} 改到 ${jourDuMois(e.date, "zh-CN")}${e.heure ? ` ${e.heure}` : ""}。`;
  return `Changement : ${e.titre} passe au ${jourFr(e.date, true)}${e.heure ? `, ${e.heure}` : ""}.`;
}

/** Les évènements dont le déplacement s'annonce ce matin : fait hier ou avant-hier
 *  (`deplacement.le`, jour UTC comme le cron : un matin manqué ne perd rien ; un
 *  déplacement de ce matin attend demain), qui dit encore la date de l'évènement
 *  (redéplacé depuis par le formulaire, la ligne serait fausse) et pas passé. */
export function deplacementsAPrevenir<E extends Pick<Evenement, "type" | "date" | "dateFin" | "deplacement">>(evenements: E[], today: string): E[] {
  const fenetre = [addDays(today, -2), addDays(today, -1)];
  return evenements.filter((e) => {
    const d = e.deplacement;
    return !!d && fenetre.includes(d.le.slice(0, 10)) && d.vers === e.date && !isPast(e, today);
  });
}

/** Clé notifLog du déplacement, sans l'uid que le cron ajoute : `deplacement-<id>-<vers>`. */
export function cleDeplacement(e: Pick<Evenement, "id" | "deplacement">): string {
  return `deplacement-${e.id}-${e.deplacement?.vers ?? ""}`;
}

/** Clé notifLog du rappel de la veille (Q8) : datée, pour qu'un évènement déplacé
 *  ait son rappel la veille de sa nouvelle date. */
export function cleVeille(e: Pick<Evenement, "id" | "date">): string {
  return `rappel-evenement-${e.id}-${e.date}`;
}

/** Qui lit la ligne : les inscrits avec compte (ou les membres d'une réunion, que le
 *  cron passe à la place), une fois chacun, sans l'auteur du geste. Rien sans `deplacement`. */
export function destinatairesDeplacement(e: Pick<Evenement, "deplacement">, uids: (string | null | undefined)[]): string[] {
  if (!e.deplacement) return [];
  const auteur = e.deplacement.parUid;
  return [...new Set(uids.filter((u): u is string => !!u && u !== auteur))];
}
