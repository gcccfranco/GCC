// Outils de la route /api/equipes/groupes (lot 2 du chantier « équipes et groupes »,
// docs/spec-organigrammes-groupes.md, OG5, OG21) : serveur seulement, Admin SDK.

import { adminDb } from "@/lib/push/admin";
import { isAdminEmail } from "@/lib/access";
import { HttpError } from "@/lib/evenements/serveur";
import { lireEquipes, lireGroupes, recopieDuCompte } from "@/lib/equipes/serveur";
import type { OrganigrammeGroupe } from "@/types/groupe";
import { groupeDe } from "./organigramme";
import { estGroupeId, groupeDef } from "./table";

export { lireGroupes } from "@/lib/equipes/serveur";

type Appelant = { uid: string; email: string } | null;

/** Tenir l'organigramme d'un groupe, revérifié ici (OG21) : admin, ou `referentDe` ∋ le comité du
 *  groupe, relu en base — le président et les VP. Le droit Équipes ne suffit pas (décision 44).
 *  Miroirs : canTenirGroupe (src/lib/access.ts), tientGroupe(g) (firestore.rules). */
export async function exigerTenirGroupe(user: Appelant, groupe: string, db: FirebaseFirestore.Firestore = adminDb()): Promise<void> {
  if (!user) throw new HttpError(401, "Non authentifié");
  const def = groupeDef(groupe);
  if (!def) throw new HttpError(400, "Groupe inconnu");
  if (isAdminEmail(user.email)) return;
  const referentDe = ((await db.collection("users").doc(user.uid).get()).data()?.referentDe as string[] | undefined) ?? [];
  if (!referentDe.includes(def.comite)) throw new HttpError(403, "Réservé au président, aux VP du groupe et aux admins");
}

/** Le document sans la personne : ni président, ni VP, ni titulaire. */
function sans(g: OrganigrammeGroupe, uid: string): OrganigrammeGroupe {
  return {
    ...g,
    president: g.president?.uid === uid ? null : g.president,
    vp: g.vp.filter((t) => t.uid !== uid),
    roles: g.roles.map((r) => ({ ...r, titulaires: r.titulaires.filter((t) => t.uid !== uid) })),
  };
}

/**
 * « Changer de groupe » (OG5, admins seuls) : retire la personne de la présidence, des VP et de tous
 * les rôles de son ancien groupe, écrit `groupe` (un id, ou `""` = sans groupe) et recopie son
 * profil, en une seule écriture groupée. Sa clé de `serviceRoles` n'est pas touchée (D17). « Sans
 * groupe » ne lui laisse aucun droit de groupe, même si un autre document la cite encore.
 */
export async function changerGroupe(
  db: FirebaseFirestore.Firestore,
  appelant: Appelant,
  uid: string,
  groupe: string,
): Promise<{ maj: number }> {
  if (!appelant) throw new HttpError(401, "Non authentifié");
  if (!isAdminEmail(appelant.email)) throw new HttpError(403, "Réservé aux admins");
  if (!uid || (groupe !== "" && !estGroupeId(groupe))) throw new HttpError(400, "Requête incomplète");
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "Compte introuvable");
  const data = snap.data() ?? {};

  const ancien = groupeDe(data);
  const avant = await lireGroupes(db);
  const apres = avant.map((g) => (g.id === ancien ? sans(g, uid) : g));
  const { listes } = recopieDuCompte(uid, { ...data, groupe }, await lireEquipes(db), apres);
  if (groupe === "") {
    // Sans groupe : les ids de comité et les listes par rôle tombent, les équipes de l'église restent.
    const comites = new Set(apres.map((g) => groupeDef(g.id)!.comite));
    listes.dansEquipes = listes.dansEquipes.filter((id) => !comites.has(id));
    listes.referentDe = listes.referentDe.filter((id) => !comites.has(id));
    listes.remplitParRole = [];
    listes.publieParRole = [];
    listes.notifieParRole = [];
  }

  const lot = db.batch();
  const doc = apres.find((g) => g.id === ancien);
  if (doc) {
    const { id, ...champs } = doc;
    const par = ((await db.collection("users").doc(appelant.uid).get()).data()?.firstName as string | undefined) ?? "";
    lot.set(db.collection("groupes").doc(id), { ...champs, updatedAt: new Date().toISOString(), parUid: appelant.uid, parNom: par });
  }
  lot.update(ref, { groupe, ...listes });
  await lot.commit();
  return { maj: 1 };
}
