// Évènements de l'église (lot 6, docs/spec-evenements.md) : calendrier public,
// fiches, inscriptions. Les annonces y sont fusionnées (type « info »).

import type { AnnonceLink, AnnonceSection } from "./annonce";
import type { TachePole } from "./tache";

export const EVENEMENT_TYPES = ["sport", "loisir", "musique", "eglise", "info"] as const;
export type EvenementType = (typeof EVENEMENT_TYPES)[number];

/** Public visé : toute l'église (calendrier public), une section (membres
 *  connectés de la section) ou un pôle (réunion, lot 7 : membres du pôle). */
export type EvenementPour = "eglise" | AnnonceSection | `pole:${TachePole}`;
export const POUR_EGLISE = "eglise" as const;

export const MODES_INSCRIPTIONS = ["auto", "ouvertes", "fermees"] as const;
export type ModeInscriptions = (typeof MODES_INSCRIPTIONS)[number];

export interface Evenement {
  id: string;
  titre: string;
  type: EvenementType;
  pour: EvenementPour;
  /** ISO « AAAA-MM-JJ » ; vide pour une info sans date. */
  date: string;
  /** « HH:MM » ; vide si pas d'heure. */
  heure: string;
  heureFin: string;
  /** ISO, facultatif (camp, retraite sur plusieurs jours). */
  dateFin: string;
  lieu: string;
  /** Texte libre, URLs cliquables à l'affichage. */
  description: string;
  liens: AnnonceLink[];
  /** Images compressées côté navigateur, en data-URL (comme les annonces). */
  images: string[];
  /** Places (inscrits + invités) ; null = sans limite. */
  placesMax: number | null;
  /** Automatique (période, sinon jusqu'au début de l'évènement), « Ouvertes »
   *  ou « Fermées » forcées par le responsable. Absent avant le 17/09/2026 :
   *  voir `modeInscriptions` (docs/spec-inscriptions-periode.md). */
  inscriptions?: ModeInscriptions;
  /** « AAAA-MM-JJ » ou « AAAA-MM-JJTHH:MM » ; vide = dès la publication. */
  inscriptionDebut?: string;
  /** Idem ; vide = au début de l'évènement. */
  inscriptionFin?: string;
  /** Ancien interrupteur (lot 6), lu seulement pour les évènements d'avant la période. */
  inscriptionOuverte?: boolean;
  /** Les personnes sans compte peuvent s'inscrire (nom + invités). */
  sansCompte: boolean;
  contact: string;
  organisateurUid: string;
  organisateurNom: string;
  /** Info épinglée en tête du calendrier. */
  epingle: boolean;
  /** ISO ; l'entrée est masquée après cette date (null = jamais). */
  expiresAt: string | null;
  /** Inscrits + invités — tenu par le serveur seulement. */
  inscrits: number;
  createdAt: string;
  updatedAt: string;
}

export interface Inscription {
  id: string;
  /** null pour une inscription sans compte. */
  uid: string | null;
  nom: string;
  invites: number;
  createdAt: string;
}
