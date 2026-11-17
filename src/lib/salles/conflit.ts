// Chevauchement d'une réservation (docs/spec-salles.md, SA8, SA9, AR6) : fonctions pures. SA8 : avant d'écrire, la
// feuille cherche l'occupation qui bloque, les salles libres au même moment et la fenêtre « Décaler ». SA9 : deux
// enregistrements simultanés qui passent quand même ; message aux deux auteurs et clé anti-doublon, partagés par la
// route /api/salles/conflit et les tests ; la Scène des fêtes y passe aussi (lot 5, T5c).

import { formatReminderDate } from "@/lib/push/reminderMessage";
import type { Reservation } from "@/lib/firebase/reservations";
import type { NotifLang } from "@/types/user";
import { croise, libellePour, occupationsDe, type Occupation } from "./occupations";
import { lieuxLies, SALLES, type SalleId } from "./salles";

type Plage = { debut: string; fin: string };

/** L'occupation qui bloque `plage` dans `salle` (la sienne ou celle d'un lieu lié, Grande salle ↔ Scène), la première
 *  par heure ; null si la salle est libre. `sauf` : l'id de la réservation qu'on modifie (SA10). */
export function chevauchement(occupations: Occupation[], salle: SalleId, plage: Plage, sauf?: string): Occupation | null {
  return occupationsDe(occupations, salle).find((o) => (!sauf || o.id !== sauf) && croise(o, plage)) ?? null;
}

/** Les salles libres sur `plage`, dans l'ordre de l'écran. */
export function sallesLibres(occupations: Occupation[], plage: Plage, sauf?: string): SalleId[] {
  return SALLES.filter((s) => !chevauchement(occupations, s.id, plage, sauf)).map((s) => s.id);
}

const minutes = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const heure = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Fin de la journée pour « Décaler » (SA8). */
const LIMITE = "22:00";

/** « Décaler » (SA8) : dans la même salle, la première fenêtre de même durée qui commence après l'occupation qui
 *  bloque (et après celles qui la suivent sans laisser la place) ; null si elle ne tient pas avant 22:00. */
export function decalage(occupations: Occupation[], salle: SalleId, plage: Plage, sauf?: string): Plage | null {
  const duree = minutes(plage.fin) - minutes(plage.debut);
  let bloque = chevauchement(occupations, salle, plage, sauf);
  if (!bloque || duree <= 0) return null;
  let debut = plage.debut;
  while (bloque) {
    // Une occupation « jusqu'à la fin du jour » (24:00) ne laisse rien.
    if (bloque.fin > LIMITE) return null;
    debut = bloque.fin > debut ? bloque.fin : debut;
    const essai = { debut, fin: heure(minutes(debut) + duree) };
    if (essai.fin > LIMITE) return null;
    bloque = chevauchement(occupations, salle, essai, sauf);
  }
  return { debut, fin: heure(minutes(debut) + duree) };
}

/** SA9 : deux réservations du même jour qui se chevauchent dans la même salle ou dans des lieux liés. */
export function reservationsSeChevauchent(a: Pick<Reservation, "salle" | "date" | "debut" | "fin">, b: Pick<Reservation, "salle" | "date" | "debut" | "fin">): boolean {
  return a.date === b.date && lieuxLies(a.salle).includes(b.salle) && croise(a, b);
}

/** SA9 : la réservation qu'on vient d'écrire et une autre qui la croise (enregistrée au même moment), d'après une
 *  relecture ; null s'il n'y en a pas. */
export function autreQuiCroise(ecrite: Reservation, relues: Reservation[]): Reservation | null {
  return relues.find((r) => r.id !== ecrite.id && reservationsSeChevauchent(ecrite, r)) ?? null;
}

/** Une clé par paire de réservations, dans un ordre stable. */
export function conflictKey(reservationIds: string[]): string {
  return `salles-conflit-${[...reservationIds].sort().join("-")}`;
}

const nomSalle = (id: SalleId) => SALLES.find((s) => s.id === id)?.nom ?? id;

function plage(r: Reservation, lang: NotifLang): string {
  const langue = lang === "fr" ? "fr" : "zh";
  const qui = [r.quoi, libellePour(r.pour, langue)].filter(Boolean).join(" · ");
  return lang === "fr"
    ? `${nomSalle(r.salle)} ${r.debut}–${r.fin} (${qui}, ${r.auteurNom})`
    : `${nomSalle(r.salle)} ${r.debut}–${r.fin}（${qui}，${r.auteurNom}）`;
}

export function conflictMessage(a: Reservation, b: Reservation, lang: NotifLang): { title: string; body: string } {
  const [x, y] = [a, b].sort((p, q) => (p.debut + p.id).localeCompare(q.debut + q.id));
  const date = formatReminderDate(a.date, lang);
  return lang === "fr"
    ? { title: "Salles : chevauchement", body: `${date} : ${plage(x, "fr")} et ${plage(y, "fr")} se chevauchent. Mettez-vous d'accord.` }
    : { title: "场地：时段重叠", body: `${date}：${plage(x, "zh-CN")} 与 ${plage(y, "zh-CN")} 的时段重叠，请协商。` };
}
