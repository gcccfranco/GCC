// Outils des routes /api/equipes/* (serveur seulement, Admin SDK).

import { adminDb } from "@/lib/push/admin";
import { ADMIN_EMAILS } from "@/lib/access";
import { HttpError } from "@/lib/evenements/serveur";
import { polesDesEquipes } from "./organigramme";
import type { MembreEquipe } from "@/types/equipe";
import type { Pole } from "@/types/user";

/** Droit de tenir l'organigramme, revérifié ici : admin, ou profil portant le
 *  droit `equipes` (miroir de canEditerEquipes et de isEquipier). C'est ce
 *  contrôle qui remplace `allow update` sur users/{uid}, resté aux admins. */
export async function exigerDroitEquipes(user: { uid: string; email: string } | null): Promise<void> {
  if (!user) throw new HttpError(401, "Non authentifié");
  if (ADMIN_EMAILS.includes(user.email)) return;
  const snap = await adminDb().collection("users").doc(user.uid).get();
  if (snap.data()?.equipes !== true) throw new HttpError(403, "Réservé à qui tient l'organigramme");
}

export type EquipeServeur = { pole: Pole | null; membres: MembreEquipe[] };

export async function lireEquipes(db: FirebaseFirestore.Firestore): Promise<EquipeServeur[]> {
  const snap = await db.collection("equipes").get();
  return snap.docs.map((d) => {
    const data = d.data() as Partial<EquipeServeur>;
    return { pole: data.pole ?? null, membres: data.membres ?? [] };
  });
}

/** Repose `poles` pour les comptes donnés, d'après les équipes : l'union de
 *  leurs pôles, rien d'autre. Seul champ écrit, seule écriture de profil du
 *  lot 16. Renvoie le nombre de profils modifiés. */
export async function recalculerPoles(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  equipes: EquipeServeur[],
): Promise<number> {
  let maj = 0;
  for (const uid of [...new Set(uids)].filter(Boolean)) {
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const avant = ((snap.data()?.poles as Pole[]) ?? []).join(",");
    const apres = polesDesEquipes(uid, equipes);
    if (apres.join(",") === avant) continue;
    await ref.update({ poles: apres });
    maj++;
  }
  return maj;
}
