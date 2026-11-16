// Lecture des sources de Salles (docs/spec-salles.md, § Modèle, lot 2) : les services du planning (pour la variante du
// dimanche, AR13) et les éditions affichées des fêtes (jour J ; leurs créneaux de scène sont des réservations depuis le lot 5), comme le
// Calendrier (`src/lib/calendrier/charger.ts`). Une source en panne n'empêche pas l'autre : `echec` le dit. Firestore
// en REST seulement. Lot 4 : les évènements et réunions qui portent une salle (AR15), lus comme le Calendrier ; la
// vérification d'un formulaire d'évènement (SA12) lit les occupations d'un seul jour (`occupationsPourEvenement`).

import { listEvenements } from "@/lib/firebase/evenements";
import { listProgrammes } from "@/lib/firebase/programmes";
import { listReservations, type Reservation } from "@/lib/firebase/reservations";
import { addDays } from "@/lib/taches/echeances";
import { loadPlanningData, type PlanningData } from "@/lib/planning/names";
import { editionsAffichees } from "@/lib/scene/fetes";
import type { Evenement } from "@/types/evenement";
import { occupationsDu, type EvenementSalle, type Occupation, type SourcesSalles } from "./occupations";

/** Les services qui changent la variante d'un dimanche : les dates d'Intergroupe et d'Interfranco du planning. */
export function servicesDeVariante(planning: Pick<PlanningData, "intergroupe" | "interfranco">): SourcesSalles["services"] {
  return [
    ...planning.intergroupe.filter((r) => r[0]).map((r) => ({ date: r[0], service: "Intergroupe" })),
    ...planning.interfranco.filter((r) => r[0]).map((r) => ({ date: r[0], service: "Interfranco" })),
  ];
}

/** Jours lus après aujourd'hui : treize de la bande, six de plus pour la semaine du volet. */
const JOURS_LUS = 13 + 6;

/** Les réservations que la page peut montrer. */
export function chargerReservations(today: string): Promise<Reservation[]> {
  return listReservations(today, addDays(today, JOURS_LUS));
}

/** Les évènements qui portent une salle ; `voir` : la personne peut-elle le voir (sinon il occupe sans être nommé). */
async function chargerEvenements(voir: (e: Evenement) => boolean): Promise<EvenementSalle[]> {
  return (await listEvenements(false)).filter((e) => e.salle).map((e) => ({
    id: e.id, titre: e.titre, date: e.date, heure: e.heure, heureFin: e.heureFin, salle: e.salle, organisateurNom: e.organisateurNom,
    ...(voir(e) ? {} : { prive: true }),
  }));
}

/** Les éditions affichées des fêtes (jour J, page d'un créneau). Lot 5 (AR20) : leurs créneaux de scène sont des
 *  réservations, lues avec les autres ; plus de lecture à part. */
async function chargerScene(today: string): Promise<SourcesSalles["scene"]> {
  return editionsAffichees(await listProgrammes(), today).map(({ programme }) => ({ programme: programme! }));
}

export async function chargerSalles(today: string, voir: (e: Evenement) => boolean = () => true): Promise<{ sources: SourcesSalles; echec: boolean }> {
  let echec = false;
  const [services, scene, reservations, evenements] = await Promise.all([
    loadPlanningData().then(servicesDeVariante).catch(() => { echec = true; return []; }),
    chargerScene(today).catch(() => { echec = true; return []; }),
    chargerReservations(today).catch(() => { echec = true; return []; }),
    chargerEvenements(voir).catch(() => { echec = true; return []; }),
  ]);
  return { sources: { services, scene, reservations, evenements }, echec };
}

/** SA12 : les occupations du jour d'un évènement, relues avant de l'écrire (réservations et évènements de ce jour-là).
 *  Le planning (variante du dimanche) et la scène en panne comptent pour rien ; réservations ou évènements illisibles
 *  font échouer la vérification (rejet) : l'évènement ne s'écrit pas sans elle. */
export async function occupationsPourEvenement(date: string, today: string, voir: (e: Evenement) => boolean): Promise<Occupation[]> {
  const [services, scene, reservations, evenements] = await Promise.all([
    loadPlanningData().then(servicesDeVariante).catch(() => []),
    chargerScene(today).catch(() => []),
    listReservations(date, date),
    chargerEvenements(voir),
  ]);
  return occupationsDu(date, { services, scene, reservations, evenements });
}

/** Lot 5 (AR22) : ce que la page d'une fête lit pour dire quand la Scène est libre pendant sa saison, `du` à `au` :
 *  l'emploi du temps fixe (variante du dimanche), les réservations de Salles et des autres fêtes, les évènements. Les
 *  réservations de la fête elle-même (`fete`) se lisent à part (`listCreneaux`). Une source en panne compte pour
 *  rien : l'écran montre alors trop de place, et le refus à l'enregistrement relit le jour (`occupationsPourEvenement`). */
export async function chargerAutresScene(du: string, au: string, today: string, fete: string, voir: (e: Evenement) => boolean): Promise<SourcesSalles> {
  const [services, scene, reservations, evenements] = await Promise.all([
    loadPlanningData().then(servicesDeVariante).catch(() => []),
    chargerScene(today).catch(() => []),
    listReservations(du, au).catch(() => []),
    chargerEvenements(voir).catch(() => []),
  ]);
  return { services, scene, reservations: reservations.filter((r) => r.fete !== fete), evenements };
}
