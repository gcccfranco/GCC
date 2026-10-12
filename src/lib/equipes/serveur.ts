// Outils des routes /api/equipes/* (serveur seulement, Admin SDK).

import { adminDb } from "@/lib/push/admin";
import { isAdminEmail } from "@/lib/access";
import { HttpError } from "@/lib/evenements/serveur";
import { rattachementDe } from "./organigramme";
import type { MembreEquipe } from "@/types/equipe";

/** Droit de tenir l'organigramme, revérifié ici : admin, ou profil portant le
 *  droit `equipes` (miroir de canEditerEquipes et de isEquipier). C'est ce
 *  contrôle qui remplace `allow update` sur users/{uid}, resté aux admins. */
export async function exigerDroitEquipes(user: { uid: string; email: string } | null): Promise<void> {
  if (!user) throw new HttpError(401, "Non authentifié");
  if (isAdminEmail(user.email)) return;
  const snap = await adminDb().collection("users").doc(user.uid).get();
  if (snap.data()?.equipes !== true) throw new HttpError(403, "Réservé à qui tient l'organigramme");
}

export type EquipeServeur = { id: string; membres: MembreEquipe[] };

export async function lireEquipes(db: FirebaseFirestore.Firestore): Promise<EquipeServeur[]> {
  const snap = await db.collection("equipes").get();
  return snap.docs.map((d) => {
    const data = d.data() as Partial<EquipeServeur>;
    return { id: d.id, membres: data.membres ?? [] };
  });
}

type Rattachement = ReturnType<typeof rattachementDe>;
const CHAMPS = ["dansEquipes", "referentDe"] as const;

/** Repose, pour les comptes donnés, ce que les équipes disent : `dansEquipes` et
 *  `referentDe` (réunions et tâches d'équipe, lot U6, R4). Seuls champs écrits, seule
 *  écriture de profil des équipes ; un profil inchangé n'est pas réécrit.
 *  Renvoie le nombre de profils modifiés. */
export async function recalculerRattachement(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  equipes: EquipeServeur[],
): Promise<number> {
  let maj = 0;
  for (const uid of [...new Set(uids)].filter(Boolean)) {
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const tout: Rattachement = rattachementDe(uid, equipes);
    const data = snap.data() ?? {};
    const pareil = CHAMPS.every((k) => ((data[k] as string[] | undefined) ?? []).join(",") === tout[k].join(","));
    if (pareil) continue;
    await ref.update(tout);
    maj++;
  }
  return maj;
}

/** « Recalculer depuis l'organigramme » (bouton admin, lot U6, R4) : pose
 *  `dansEquipes` et `referentDe` de tous les comptes rangés dans une équipe — les
 *  profils d'avant R4 ne les ont pas. */
export async function recalculerDepuisOrganigramme(db: FirebaseFirestore.Firestore): Promise<number> {
  const equipes = await lireEquipes(db);
  return recalculerRattachement(db, equipes.flatMap((e) => e.membres.map((m) => m.uid)), equipes);
}
