// Outils des routes /api/equipes/* (serveur seulement, Admin SDK).

import { adminDb } from "@/lib/push/admin";
import { isAdminEmail } from "@/lib/access";
import { HttpError } from "@/lib/evenements/serveur";
import { rattachementDe } from "./organigramme";
import { comptesCites, groupeDe, lireGroupe, recopieDeGroupe } from "@/lib/groupes/organigramme";
import { COMITES, TABLE_GROUPES, type GroupeId } from "@/lib/groupes/table";
import type { MembreEquipe } from "@/types/equipe";
import type { OrganigrammeGroupe } from "@/types/groupe";

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

/** Les champs du profil que la recopie pose (lot U6, R4 ; lot 2, OG19-OG20). `groupe` à part : il
 *  ne s'écrit que lorsqu'une personne sans groupe entre dans un groupe (OG3). */
const LISTES = ["dansEquipes", "referentDe", "remplitParRole", "publieParRole", "notifieParRole"] as const;
type Listes = Record<(typeof LISTES)[number], string[]>;

/** Ce que l'organigramme de l'église et ceux des groupes disent d'un compte, pour son profil : les
 *  équipes de l'église puis le comité, dans l'ordre de `[...EQUIPES, ...COMITES]` (OG20) ; les
 *  listes par rôle ; le groupe où il entre. Un document `equipes/comite-*` n'y compte pas :
 *  `rattachementDe` ne garde que les ids de `EQUIPES`, les membres d'un comité ne viennent que de
 *  groupes/{id}. */
export function recopieDuCompte(uid: string, data: Record<string, unknown>, equipes: EquipeServeur[], groupes: OrganigrammeGroupe[]) {
  const eglise = rattachementDe(uid, equipes);
  const groupe = recopieDeGroupe(uid, groupeDe(data), groupes);
  const listes: Listes = {
    dansEquipes: [...eglise.dansEquipes, ...groupe.dansEquipes],
    referentDe: [...eglise.referentDe, ...groupe.referentDe],
    remplitParRole: groupe.remplitParRole,
    publieParRole: groupe.publieParRole,
    notifieParRole: groupe.notifieParRole,
  };
  return { listes, groupe };
}

export type Ignore = { uid: string; groupe: GroupeId };

/** Repose, pour les comptes donnés, ce que les équipes et les groupes disent : `dansEquipes`,
 *  `referentDe` (réunions et tâches d'équipe, lot U6, R4 ; comités, lot 2), les trois listes par
 *  rôle et `groupe` (OG3, OG19, OG20). Seule écriture de profil des organigrammes ; seuls les champs
 *  changés s'écrivent, un profil inchangé n'est pas réécrit. Les deux routes (rattachement, groupes)
 *  l'appellent avec les deux organigrammes : aucune n'efface ce que l'autre a posé. Renvoie le
 *  nombre de profils modifiés et les comptes cités dans un groupe qui n'est pas le leur (OG3). */
export async function recalculerRattachement(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  equipes: EquipeServeur[],
  groupes: OrganigrammeGroupe[],
): Promise<{ maj: number; ignores: Ignore[] }> {
  let maj = 0;
  const ignores: Ignore[] = [];
  for (const uid of [...new Set(uids)].filter(Boolean)) {
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const data = snap.data() ?? {};
    const { listes, groupe } = recopieDuCompte(uid, data, equipes, groupes);
    ignores.push(...groupe.ignores.map((g) => ({ uid, groupe: g })));
    const changes: Record<string, unknown> = {};
    for (const k of LISTES) {
      if (((data[k] as string[] | undefined) ?? []).join(",") !== listes[k].join(",")) changes[k] = listes[k];
    }
    if (groupe.entre && groupe.groupe) changes.groupe = groupe.groupe;
    if (Object.keys(changes).length === 0) continue;
    await ref.update(changes);
    maj++;
  }
  return { maj, ignores };
}

/** « Recalculer depuis l'organigramme » (bouton admin, lot U6, R4) : pose les champs recopiés de
 *  tous les comptes rangés dans une équipe ou cités dans un groupe (lot 2, OG20) — les profils
 *  d'avant R4 ne les ont pas — et de ceux qui portent encore un comité ou un droit par rôle sans
 *  être cités (une recopie qui a échoué après une écriture) : ils les perdent. */
export async function recalculerDepuisOrganigramme(db: FirebaseFirestore.Firestore): Promise<number> {
  const [equipes, groupes, users] = await Promise.all([lireEquipes(db), lireGroupes(db), db.collection("users").get()]);
  const restes = users.docs.filter((d) => {
    const x = d.data();
    const liste = (k: string) => (Array.isArray(x[k]) ? (x[k] as string[]) : []);
    return [...liste("dansEquipes"), ...liste("referentDe")].some((id) => COMITES.includes(id))
      || ["remplitParRole", "publieParRole", "notifieParRole"].some((k) => liste(k).length > 0);
  }).map((d) => d.id);
  const uids = [...equipes.flatMap((e) => e.membres.map((m) => m.uid)), ...groupes.flatMap(comptesCites), ...restes];
  return (await recalculerRattachement(db, uids, equipes, groupes)).maj;
}

/** Les cinq documents groupes/{id} (lot 2), lus avec les défauts du modèle ; un document absent
 *  se lit vide (un groupe dont aucun admin n'a encore nommé personne). */
export async function lireGroupes(db: FirebaseFirestore.Firestore): Promise<OrganigrammeGroupe[]> {
  const snap = await db.collection("groupes").get();
  return TABLE_GROUPES.map((def) => lireGroupe(def.id, snap.docs.find((d) => d.id === def.id)?.data()));
}
