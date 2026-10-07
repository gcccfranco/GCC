"use client";

// Back-Office › Tâches (agencement v18, B2) : ce que partagent la feuille d'un volet (sur la liste)
// et le formulaire dans le volet (`/back-office/taches/[pole]/nouvelle`).

import { useEffect, useState } from "react";
import { listProfiles } from "@/lib/firebase/users";
import { createTache, type TacheValues } from "@/lib/firebase/taches";
import { prevenirResponsable } from "@/lib/taches/prevenir";
import type { TachePole } from "@/types/tache";
import type { UserProfile } from "@/types/user";

const AUCUN: UserProfile[] = [];

/** Les profils proposés comme responsables (le formulaire garde ceux du pôle choisi) : lus à la
 *  première ouverture du formulaire (`actif`), puis gardés ; une lecture vide (refusée) se refait
 *  à l'ouverture suivante. */
export function useMembres(actif: boolean): UserProfile[] {
  const [membres, setMembres] = useState<UserProfile[] | null>(null);
  const lus = !!membres?.length;
  useEffect(() => {
    if (actif && !lus) listProfiles().then(setMembres).catch(() => {});
  }, [actif, lus]);
  return membres ?? AUCUN;
}

/** Crée une tâche ; nommé par quelqu'un d'autre, le responsable est prévenu. Rend son id. */
export async function creerTache(pole: TachePole, values: TacheValues, uid: string): Promise<string> {
  const id = await createTache(pole, values, uid);
  if (values.responsableUid && values.responsableUid !== uid) prevenirResponsable(pole, id);
  return id;
}

