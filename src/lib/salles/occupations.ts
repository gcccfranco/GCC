// Occupations d'un jour, salle par salle (docs/spec-salles.md, § Modèle, SA2, SA13, AR6, AR14, AR17) : fonctions
// pures. Lot 2 : emploi du temps fixe, jour J d'une fête, créneaux de la Scène en lecture seule ; lot 3 : les
// réservations (`reservations/{id}`) ; lot 4 : les évènements et réunions qui portent une salle (AR15, pas de document
// de réservation : l'évènement porte `salle`).

import { libelleQui } from "@/lib/fetes/qui";
import type { Reservation } from "@/lib/firebase/reservations";
import { nomEquipe } from "@/lib/taches/messages";
import { feteDe, type Fete } from "@/lib/scene/fetes";
import { CATEGORY_COLORS, PLANNING_COLORS } from "@/lib/serviceColors";
import type { ServiceEntry } from "@/lib/planning/names";
import type { Evenement } from "@/types/evenement";
import type { Creneau, Programme } from "@/types/programme";
import { occupationsFixes, varianteDu } from "./emploi";
import { lieuxLies, type SalleId } from "./salles";

type Langue = "fr" | "zh";

/** Qui occupe : une catégorie de l'app (« Groupe Joie »), un occupant propre aux salles, une classe d'EDD, le jour J
 *  d'une fête ou un créneau de scène. Le nom à l'écran : `nomOccupant`. */
export type Occupant =
  | { categorie: string }
  | { cle: "entrainementLouange" | "culteSinophone" | "louangeFranco" }
  | { classe: string }
  | { fete: Fete }
  | { creneau: Pick<Creneau, "quoi" | "qui"> }
  | { reservation: Pick<Reservation, "quoi" | "pour"> }
  | { evenement: { titre: string; prive?: boolean } };

export interface Occupation {
  salle: SalleId;
  /** « HH:MM » ; l'occupation vaut pour [debut, fin[ ; « 24:00 » = jusqu'à la fin du jour. */
  debut: string;
  fin: string;
  occupant: Occupant;
  source: "fixe" | "fete" | "scene" | "reservation" | "evenement";
  /** Créneau de scène : son id, son auteur et la page de sa fête ; jour J : la page de la fête ; réservation : son id
   *  et son auteur (`reservation` : le document, pour la modifier, SA10) ; évènement : son id, son organisateur et sa
   *  fiche (sauf s'il est privé). */
  id?: string;
  auteurUid?: string;
  auteurNom?: string;
  lien?: string;
  reservation?: Reservation;
}

/** Ce que la page a lu : services du planning (`ServiceEntry`) et éditions de la scène, comme le Calendrier. */
export interface SourcesSalles {
  services: Pick<ServiceEntry, "date" | "service">[];
  scene: { programme: Pick<Programme, "jourJ" | "fete" | "ouvert">; creneaux: Creneau[] }[];
  /** Lot 3 : les réservations lues (toutes dates ; seules celles du jour comptent). */
  reservations?: Reservation[];
  /** Lot 4 : les évènements lus (toutes dates) ; seuls ceux du jour qui portent une salle et deux heures comptent.
   *  `prive` : la personne ne peut pas le voir (réunion d'une autre équipe) ; il occupe sans être nommé. */
  evenements?: EvenementSalle[];
}

export type EvenementSalle = Pick<Evenement, "id" | "titre" | "date" | "heure" | "heureFin" | "salle" | "organisateurNom"> & { prive?: boolean };

/** Les occupations des évènements d'un jour qui portent une salle (SA12) ; sans heure de début et de fin, ou à l'envers,
 *  un évènement n'occupe rien (le formulaire l'empêche). */
function occupationsEvenements(date: string, evenements: EvenementSalle[]): Occupation[] {
  return evenements
    .filter((e) => e.salle && e.date === date && e.heure && e.heureFin && e.heure < e.heureFin)
    .map((e): Occupation => ({
      salle: e.salle!, debut: e.heure, fin: e.heureFin, occupant: { evenement: { titre: e.titre, ...(e.prive ? { prive: true } : {}) } },
      source: "evenement", id: e.id, auteurNom: e.organisateurNom || undefined, ...(e.prive ? {} : { lien: `/evenements/${e.id}` }),
    }));
}

/** Fête dont c'est le jour J (programme ouvert), sinon null. */
export function jourJDu(date: string, scene: SourcesSalles["scene"]): Fete | null {
  const p = scene.find(({ programme }) => programme.ouvert !== false && programme.jourJ === date)?.programme;
  return p ? feteDe(p) : null;
}

/** Toutes les occupations d'un jour, triées par heure de début. Le jour J d'une fête remplace l'emploi fixe de la
 *  Grande salle par la fête, toute la journée (AR14) ; un créneau de scène s'affiche tel quel, même s'il croise
 *  l'emploi fixe (SA13). Un brouillon (`ouvert === false`) ne compte pas. */
export function occupationsDu(date: string, sources: SourcesSalles): Occupation[] {
  const fete = jourJDu(date, sources.scene);
  const fixes = occupationsFixes(date, varianteDu(date, sources.services)).filter((o) => !fete || o.salle !== "grande");
  const jourJ: Occupation[] = fete ? [{ salle: "grande", debut: "00:00", fin: "24:00", occupant: { fete }, source: "fete", lien: `/evenements/scene/${fete}` }] : [];
  const scene: Occupation[] = sources.scene
    .filter(({ programme }) => programme.ouvert !== false)
    .flatMap(({ programme, creneaux }) => creneaux
      .filter((c) => c.dimanche === date)
      .map((c): Occupation => ({
        salle: "scene", debut: c.debut, fin: c.fin, occupant: { creneau: { quoi: c.quoi, qui: c.qui } }, source: "scene",
        id: c.id, auteurUid: c.auteurUid, auteurNom: c.auteurNom, lien: `/evenements/scene/${feteDe(programme) ?? ""}`,
      })));
  const reservations: Occupation[] = (sources.reservations ?? [])
    .filter((r) => r.date === date)
    .map((r): Occupation => ({
      salle: r.salle, debut: r.debut, fin: r.fin, occupant: { reservation: { quoi: r.quoi, pour: r.pour } }, source: "reservation",
      id: r.id, auteurUid: r.auteurUid, auteurNom: r.auteurNom, reservation: r,
    }));
  const evenements = occupationsEvenements(date, sources.evenements ?? []);
  return [...jourJ, ...fixes, ...scene, ...reservations, ...evenements].sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Les occupations qui valent pour une salle : la sienne et celles des lieux liés (Grande salle ↔ Scène, AR6). */
export function occupationsDe(occupations: Occupation[], salle: SalleId): Occupation[] {
  const lies = lieuxLies(salle);
  return occupations.filter((o) => lies.includes(o.salle));
}

/** Deux plages [debut, fin[ se croisent ; deux bornes qui se touchent (14:30 / 14:30) ne se croisent pas. */
export function croise(a: { debut: string; fin: string }, b: { debut: string; fin: string }): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}

const FIN_DE_JOURNEE = "22:00";

export type Etat =
  | { type: "occupe"; occupation: Occupation; jusqua: string; avecGrande: boolean }
  | { type: "libreJusqua"; jusqua: string }
  | { type: "libreJournee" | "libreApresMidi" | "libreSoiree" };

/** État d'une salle à une heure (« HH:MM ») : occupée (par la première occupation en cours), libre jusqu'à la
 *  prochaine, ou libre jusqu'à 22:00. « Avec la Grande salle » : la Scène occupée par une occupation de la Grande
 *  salle. Libre jusqu'au soir : « toute la journée » avant 12:00 (décision déléguée, session T2a, 16/11), « tout
 *  l'après-midi » avant 18:00, « toute la soirée » ensuite. */
export function etatA(occupations: Occupation[], salle: SalleId, heure: string): Etat {
  const ici = occupationsDe(occupations, salle);
  const enCours = ici.find((o) => o.debut <= heure && heure < o.fin);
  if (enCours) return { type: "occupe", occupation: enCours, jusqua: enCours.fin, avecGrande: salle === "scene" && enCours.salle === "grande" };
  const suivante = ici.find((o) => o.debut > heure && o.debut < FIN_DE_JOURNEE);
  if (suivante) return { type: "libreJusqua", jusqua: suivante.debut };
  return { type: heure < "12:00" ? "libreJournee" : heure < "18:00" ? "libreApresMidi" : "libreSoiree" };
}

const CATEGORIES_ZH: Record<string, string> = {
  "Culte Francophone": "法语崇拜",
  "Intergroupe": "联合聚会",
  "Interfranco": "法语联合聚会",
  "Groupe Paix": "和平团契",
  "Groupe Fidélité": "信实团契",
  "Groupe Bonté": "恩慈团契",
  "Groupe Amour": "仁爱团契",
  "Groupe Joie": "喜乐团契",
};

const MOTS = {
  fr: {
    entrainementLouange: "Entraînement louange", culteSinophone: "Culte sinophone", louangeFranco: "Louange du culte francophone",
    fete: { noel: "Noël", paques: "Pâques" }, jourJ: (f: string) => `${f}, jour J`,
    occupe: (q: string, h: string) => `${q} jusqu'à ${h}`, libreJusqua: (h: string) => `Libre jusqu'à ${h}`,
    libreJournee: "Libre toute la journée", libreApresMidi: "Libre tout l'après-midi", libreSoiree: "Libre toute la soirée",
    avecGrande: (e: string) => `Avec la Grande salle : ${e}`, evenementPrive: "Réunion d'équipe",
  },
  zh: {
    entrainementLouange: "敬拜排练", culteSinophone: "中文崇拜", louangeFranco: "法语崇拜敬拜团",
    fete: { noel: "圣诞节", paques: "复活节" }, jourJ: (f: string) => `${f}当天`,
    occupe: (q: string, h: string) => `${q}，至 ${h}`, libreJusqua: (h: string) => `空闲至 ${h}`,
    libreJournee: "全天空闲", libreApresMidi: "下午空闲", libreSoiree: "晚上空闲",
    avecGrande: (e: string) => `与大厅同用：${e}`, evenementPrive: "团队会议",
  },
};

/** Nom de l'occupant à l'écran. Noms de catégorie : ceux de `categories.*` (fr.json, zh-CN.json). */
export function nomOccupant(o: Occupation, langue: Langue): string {
  const m = MOTS[langue];
  const x = o.occupant;
  if ("categorie" in x) return langue === "zh" ? CATEGORIES_ZH[x.categorie] ?? x.categorie : x.categorie;
  if ("cle" in x) return m[x.cle];
  if ("classe" in x) return x.classe;
  if ("fete" in x) return m.jourJ(m.fete[x.fete]);
  if ("evenement" in x) return x.evenement.prive ? m.evenementPrive : x.evenement.titre;
  if ("reservation" in x) return [x.reservation.quoi, libellePour(x.reservation.pour, langue)].filter(Boolean).join(" · ");
  return [x.creneau.quoi, x.creneau.qui.map((q) => libelleQui(q, langue)).join(", ")].filter(Boolean).join(" · ");
}

/** « Pour qui » d'une réservation à l'écran (AR16) : une valeur de QUI (`libelleQui`), une équipe (`equipe:<id>`, son
 *  nom court) ou le texte d'« Autre… » tel quel. */
export function libellePour(pour: string, langue: Langue): string {
  if (pour.startsWith("equipe:")) return nomEquipe(pour.slice("equipe:".length), langue === "zh" ? "zh-CN" : "fr", true);
  return libelleQui(pour, langue);
}

/** L'état en mots (SA2). Une occupation qui court jusqu'à la fin du jour (jour J) se dit sans heure. */
export function etatEnMots(e: Etat, langue: Langue): string {
  const m = MOTS[langue];
  if (e.type === "libreJusqua") return m.libreJusqua(e.jusqua);
  if (e.type !== "occupe") return m[e.type];
  const qui = nomOccupant(e.occupation, langue);
  const mots = e.jusqua === "24:00" ? qui : m.occupe(qui, e.jusqua);
  return e.avecGrande ? m.avecGrande(mots) : mots;
}

/** Réservations libres : encre neutre (AR17), l'encre du texte (`--foreground`). */
const ENCRE_RESERVATION = "#1c1c1e";

/** Couleur d'un bloc (AR17) : groupes et cultes d'après `CATEGORY_COLORS`, culte sinophone gris de repli, classes vert
 *  des classes d'EDD, fête sa couleur de setlist, créneau de scène celle de la Scène ; réservation et évènement
 *  (lot 4, décision déléguée T4a) l'encre neutre. */
export function couleurDe(o: Occupation): string {
  const x = o.occupant;
  if ("categorie" in x) return CATEGORY_COLORS[x.categorie] ?? "#64748b";
  if ("cle" in x) return x.cle === "culteSinophone" ? "#64748b" : CATEGORY_COLORS["Culte Francophone"];
  if ("classe" in x) return PLANNING_COLORS.edd;
  if ("fete" in x) return CATEGORY_COLORS[x.fete === "noel" ? "Noël" : "Pâques"];
  if ("reservation" in x || "evenement" in x) return ENCRE_RESERVATION;
  return PLANNING_COLORS.scene;
}
