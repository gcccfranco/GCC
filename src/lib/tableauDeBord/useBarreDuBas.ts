"use client";

// Lot U6, B6 — la barre du bas enregistrée (`barreDuBas` de `backOffice/{uid}`, Q5), partagée
// entre la barre (montée une fois, dans le gabarit) et la feuille « Ta barre du bas » de la
// page « Plus » : lue une fois par compte et par visite, mise à jour dès « Terminé ».
import { useEffect, useSyncExternalStore } from "react";
import { ecrireBarreDuBas, lirePreferencesBackOffice } from "@/lib/firebase/backOffice";
import type { Entree } from "@/types/backOffice";

/** `enregistree` : telle que lue (vérifiée par `barreAffichee`), `null` = absente. */
type Etat = { uid: string; enregistree: unknown[] | null };

let etat: Etat | null = null;
let enLecture: string | null = null;
const abonnes = new Set<() => void>();
function suivre(f: () => void) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}
function publier(e: Etat) {
  etat = e;
  abonnes.forEach((f) => f());
}

/** La barre enregistrée du compte `uid` ; `charge` faux tant qu'elle n'est pas lue. Une
 *  lecture refusée ou en échec = absente, donc la barre par défaut. */
export function useBarreDuBas(uid: string | null): { charge: boolean; enregistree: unknown[] | null } {
  const courant = useSyncExternalStore(suivre, () => etat, () => null);
  useEffect(() => {
    if (!uid || etat?.uid === uid || enLecture === uid) return;
    enLecture = uid;
    lirePreferencesBackOffice(uid).then((prefs) => {
      if (enLecture !== uid) return;
      enLecture = null;
      publier({ uid, enregistree: Array.isArray(prefs?.barreDuBas) ? prefs.barreDuBas : null });
    });
  }, [uid]);
  const mien = uid && courant?.uid === uid ? courant : null;
  return { charge: !!mien, enregistree: mien?.enregistree ?? null };
}

/** Enregistre la barre (`null` = la retirer : défaut) ; la barre change tout de suite, et
 *  revient à la précédente si l'écriture est refusée (l'erreur remonte). */
export async function enregistrerBarreDuBas(uid: string, barre: Entree[] | null): Promise<void> {
  const avant = etat;
  publier({ uid, enregistree: barre });
  try {
    await ecrireBarreDuBas(uid, barre);
  } catch (e) {
    if (avant) publier(avant);
    throw e;
  }
}
