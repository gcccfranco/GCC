// Emploi du temps fixe des salles (docs/spec-salles.md, § Les salles, § Le temps de groupe, AR7, AR13) : il vit dans
// le code ; tous les dimanches, en trois variantes choisies d'après les services du planning du jour.

import { serviceCategory, type ServiceEntry } from "@/lib/planning/names";
import { jourDeSemaine } from "@/lib/scene/saison";
import type { Occupant, Occupation } from "./occupations";
import type { SalleId } from "./salles";

export type Variante = "ordinaire" | "intergroupe" | "interfranco";

/** Variante d'un jour : Intergroupe ou Interfranco si un service du planning de cette date l'est (Interfranco
 *  l'emporte, comme `dimanchesSpeciaux`), sinon ordinaire. Mêmes services que le Calendrier (`ServiceEntry`). */
export function varianteDu(date: string, services: Pick<ServiceEntry, "date" | "service">[]): Variante {
  const categories = services.filter((s) => s.date === date).map((s) => serviceCategory(s.service));
  if (categories.includes("Interfranco")) return "interfranco";
  if (categories.includes("Intergroupe")) return "intergroupe";
  return "ordinaire";
}

type Ligne = [SalleId, string, string, Occupant];

const cat = (categorie: string): Occupant => ({ categorie });
const cle = (c: "entrainementLouange" | "culteSinophone" | "louangeFranco"): Occupant => ({ cle: c });
const classe = (texte: string): Occupant => ({ classe: texte });

/** Le dimanche hors temps de groupe : identique dans les trois variantes. */
const DIMANCHE: Ligne[] = [
  ["grande", "08:30", "10:30", cle("entrainementLouange")],
  ["grande", "10:30", "12:00", cat("Culte Francophone")],
  ["imprimante", "12:20", "12:40", cle("louangeFranco")],
  ["grande", "15:00", "17:00", cle("culteSinophone")],
  ["fidelite", "15:30", "17:00", classe("小班")],
  ["paix", "15:30", "17:00", classe("高班")],
  ["amour", "15:30", "17:00", classe("大班")],
  ["zhongban", "15:30", "17:00", classe("中班")],
];

/** Le temps de groupe (13:00–14:30) selon la variante. Dimanche ordinaire : chaque groupe dans sa salle, le groupe
 *  Joie dans la Grande salle (les salles « occupées » du tableau de Timothée portent le nom de leur groupe). */
const TEMPS_DE_GROUPE: Record<Variante, [SalleId, Occupant][]> = {
  ordinaire: [
    ["grande", cat("Groupe Joie")],
    ["fidelite", cat("Groupe Fidélité")],
    ["paix", cat("Groupe Paix")],
    ["amour", cat("Groupe Amour")],
    ["bonte", cat("Groupe Bonté")],
  ],
  intergroupe: [["grande", cat("Intergroupe")]],
  interfranco: [
    ["grande", cat("Interfranco")],
    ["fidelite", cat("Groupe Joie")],
    ["amour", cat("Groupe Amour")],
  ],
};

/** Occupations fixes d'un jour : seul le dimanche en a. */
export function occupationsFixes(date: string, variante: Variante): Occupation[] {
  if (jourDeSemaine(date) !== 0) return [];
  const lignes: Ligne[] = [...DIMANCHE, ...TEMPS_DE_GROUPE[variante].map(([s, o]): Ligne => [s, "13:00", "14:30", o])];
  return lignes
    .map(([salle, debut, fin, occupant]) => ({ salle, debut, fin, occupant, source: "fixe" as const }))
    .sort((a, b) => a.debut.localeCompare(b.debut));
}
