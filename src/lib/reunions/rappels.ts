// Le rappel du matin (lot U6, R3, docs/spec-back-office.md, Q18) : la veille
// d'un évènement — réunions comprises, avec leurs sujets — et le compte rendu
// collé depuis la veille deviennent des LIGNES de la notification du jour, à
// côté des services et des tâches. Une seule notification par personne et par
// jour (règle du 20/09/2026), sauf les échéances de service distinctes (J7, J3,
// J1), qui gardent chacune la leur. Fonctions pures, partagées avec les tests.

import type { Evenement } from "@/types/evenement";
import type { Sujet } from "@/types/reunion";
import type { NotifLang } from "@/types/user";
import { evenementReminder, ligneOuverture, ouverturesTitre, avecLignes } from "@/lib/evenements/rappel";
import { reminderBody, reminderTitle, type ReminderService, type ReminderTag } from "@/lib/push/reminderMessage";
import { corpsAvecTaches, rappelTachesTitre, type RappelTache } from "@/lib/taches/messages";
import { jourDuMois } from "@/lib/reunions/sujets";
import { ligneDeplacement } from "@/lib/calendrier/prevenir";
import { estReunion } from "@/lib/access";
import { ficheEvenement } from "@/lib/navigation";

/** Sujets encore à aborder : ni traités ni repris. */
export function nombreSujetsAAborder(sujets: Pick<Sujet, "traite" | "reprisDans">[]): number {
  return sujets.filter((s) => !s.traite && !s.reprisDans).length;
}

/** La veille : « Réunion DA demain, 20:00 : 1 sujet » pour une réunion (`sujets`
 *  donné), la phrase du lot 6 pour un évènement à inscriptions. */
export function ligneVeille(e: Pick<Evenement, "titre" | "heure" | "lieu">, sujets: number | undefined, lang: NotifLang): string {
  if (sujets === undefined) return evenementReminder(e, lang).body;
  if (lang === "zh-CN") {
    return `明天${e.heure ? ` ${e.heure}` : ""}：${e.titre}${sujets > 0 ? `（${sujets} 个议题）` : ""}`;
  }
  const compte = sujets > 0 ? ` : ${sujets} sujet${sujets > 1 ? "s" : ""}` : "";
  return `${e.titre} demain${e.heure ? `, ${e.heure}` : ""}${compte}`;
}

/** Le lendemain du lien collé : « Compte rendu ajouté : Réunion DA du 3 octobre ». */
export function ligneCompteRendu(e: Pick<Evenement, "titre" | "date">, lang: NotifLang): string {
  return lang === "zh-CN"
    ? `会议记录已添加：${e.titre}（${jourDuMois(e.date, "zh-CN")}）`
    : `Compte rendu ajouté : ${e.titre} du ${jourDuMois(e.date, "fr")}`;
}

/** Une ligne d'évènement du rappel du matin, avant le choix de la langue. */
export type LigneEvenement =
  | { kind: "veille"; evenement: Evenement; /** Réunion seulement. */ sujets?: number }
  | { kind: "compteRendu"; evenement: Evenement }
  | { kind: "ouverture"; evenement: Evenement }
  /** Déplacé depuis le calendrier, case « Prévenir » cochée (lot U8, C7). */
  | { kind: "deplacement"; evenement: Evenement };

function texte(l: LigneEvenement, lang: NotifLang): string {
  if (l.kind === "veille") return ligneVeille(l.evenement, l.sujets, lang);
  if (l.kind === "compteRendu") return ligneCompteRendu(l.evenement, lang);
  if (l.kind === "deplacement") return ligneDeplacement(l.evenement, lang);
  return ligneOuverture(l.evenement, lang);
}

export interface ServiceDuJour { tag: ReminderTag; date: string; services: ReminderService[] }

export interface NotificationDuMatin {
  title: string;
  body: string;
  url: string;
  tag: string;
  kind: "reminder" | "tache" | "evenement";
}

/** Les notifications du matin d'une personne : une par échéance de service, la
 *  première portant tâches et lignes d'évènements ; sans service, une seule.
 *  `autres` : lignes déjà écrites dans la langue (ligne du petit déj du
 *  mercredi, lot U3, PD4), ajoutées après les lignes d'évènements ; seules,
 *  elles ne font pas de notification (le cron les envoie à part). */
export function notificationsDuMatin(
  { services, taches, lignes, autres = [] }: { services: ServiceDuJour[]; taches: RappelTache[]; lignes: LigneEvenement[]; autres?: string[] },
  lang: NotifLang,
  today: string,
): NotificationDuMatin[] {
  const textes = [...lignes.map((l) => texte(l, lang)), ...autres];
  if (services.length) {
    return services.map((s, i) => ({
      title: reminderTitle(lang),
      body: i === 0 ? avecLignes(corpsAvecTaches(reminderBody(s.date, s.tag, s.services, lang), taches, lang), textes) : reminderBody(s.date, s.tag, s.services, lang),
      url: "/mes-services",
      tag: `rappel-${s.tag}-${s.date}`,
      kind: "reminder" as const,
    }));
  }
  if (taches.length) {
    return [{ title: rappelTachesTitre(lang), body: avecLignes(corpsAvecTaches("", taches, lang), textes), url: "/taches", tag: `rappel-taches-${today}`, kind: "tache" }];
  }
  if (!lignes.length) return [];
  const ids = new Set(lignes.map((l) => l.evenement.id));
  const title = lignes.every((l) => l.kind === "ouverture")
    ? ouverturesTitre(lang)
    : lignes.every((l) => l.kind === "deplacement")
      ? (lang === "zh-CN" ? "活动改期" : "Changement de date")
      : lignes.length === 1 && lignes[0].kind === "veille"
        ? evenementReminder(lignes[0].evenement, lang).title
        : lang === "zh-CN" ? "活动提醒" : "Rappel des évènements";
  return [{
    title,
    body: avecLignes("", textes),
    // Lot G (G2) : une réunion mène à sa fiche de Back-Office › Réunions, plusieurs à la liste des
    // réunions ; un évènement, ou un mélange, à l'App.
    url: ids.size === 1
      ? ficheEvenement(lignes[0].evenement)
      : lignes.every((l) => estReunion(l.evenement)) ? "/back-office/reunions" : "/evenements",
    tag: `rappel-evenements-${today}`,
    kind: "evenement",
  }];
}
