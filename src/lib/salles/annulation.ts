// Annulation d'une réservation par la coordination (AS16, docs/spec-reserver-unique-fetes.md, RS11) : fonctions pures,
// partagées par la route /api/salles/annulation et les tests.

import fr from "@/locales/fr.json";
import zh from "@/locales/zh-CN.json";
import type { Reservation } from "@/lib/firebase/reservations";
import type { NotifLang } from "@/types/user";
import { salleLue, SALLES } from "./salles";

/** « mar. 8 déc. » / « 12月8日周二 », le jour de Paris. */
function dateCourte(dateISO: string, lang: NotifLang): string {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "zh-CN", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Paris" })
    .format(new Date(`${dateISO}T12:00:00Z`));
}

/** Le texte poussé à l'auteur ; la salle se lit par `salleLue` (une ancienne « scene » est la Grande salle). */
export function annulationMessage(r: Reservation, motif: string, lang: NotifLang): { title: string; body: string } {
  const nom = SALLES.find((s) => s.id === salleLue(r.salle))?.nom ?? r.salle;
  const valeurs: Record<string, string> = { salle: lang === "fr" ? `la ${nom}` : nom, date: dateCourte(r.date, lang), de: r.debut, a: r.fin, motif };
  const modele = (lang === "fr" ? fr : zh).salles.annuler.notif;
  return {
    title: lang === "fr" ? "Salles : réservation annulée" : "场地：预约已取消",
    body: modele.replace(/\{\{(\w+)\}\}/g, (_, k: string) => valeurs[k] ?? ""),
  };
}

/** L'auteur et les personnes cochées (AS15), sans doublon ni l'appelant. */
export function destinatairesAnnulation(r: Pick<Reservation, "auteurUid" | "personnes">, appelantUid: string): string[] {
  return [...new Set([r.auteurUid, ...(r.personnes ?? []).map((p) => p.uid)].filter((u) => u && u !== appelantUid))];
}

export const annulationKey = (reservationId: string) => `annulation-${reservationId}`;
