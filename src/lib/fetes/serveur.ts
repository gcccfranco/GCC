// Outils des routes /api/fetes/* (docs/spec-chants-fetes.md, CF1, CF16-CF18, CF23) : serveur seulement,
// Admin SDK. Les routes sont minces ; tout ce qui se teste vit ici, avec la base, le planning EDD et
// « aujourd'hui » en paramètres.

import { FieldValue } from "firebase-admin/firestore";
import { isAdminEmail } from "@/lib/access";
import { HttpError } from "@/lib/evenements/serveur";
import { lireGroupes } from "@/lib/equipes/serveur";
import { groupeDe } from "@/lib/groupes/organigramme";
import { anneeDe, feteDe, type Fete } from "@/lib/scene/fetes";
import type { Passage, Programme } from "@/types/programme";
import {
  droitsDeSaisie, ayantsDroitDuQui, titreSetlistFete,
  type ContexteFetes, type DroitsDeSaisie, type PlanningEddFete, type ProfilFete,
} from "./droits";
import { nouvelIdPassage, validerMedias } from "./passages";

export type Appelant = { uid: string; email: string };

/** Une édition lue dans `programmes/{id}` : refusée si ce n'est pas une fête (programme ordinaire). */
interface EditionFete {
  fete: Fete;
  annee: number;
  jourJ: string;
  passages: Passage[];
}

function lireEdition(id: string, data: Record<string, unknown> | undefined): EditionFete {
  if (!data) throw new HttpError(404, "Édition introuvable");
  const jourJ = typeof data.jourJ === "string" ? data.jourJ : "";
  const base = { fete: data.fete as Programme["fete"], annee: data.annee as number | undefined, jourJ };
  const fete = feteDe(base);
  const annee = anneeDe(base);
  if (!fete || !annee) throw new HttpError(409, "Ce programme n'est pas une fête");
  return { fete, annee, jourJ, passages: Array.isArray(data.passages) ? (data.passages as Passage[]) : [] };
}

/** Les comptes et les groupes, tels que `ayantsDroitDuQui` les lit. La coordination de l'appelant vient
 *  de son jeton (un admin sans profil, ou dont l'e-mail du profil manque, reste coordination). */
export async function lireContexteFetes(
  db: FirebaseFirestore.Firestore,
  jourJ: string,
  edd: PlanningEddFete,
  appelant: Appelant,
): Promise<ContexteFetes> {
  const [users, groupes] = await Promise.all([db.collection("users").get(), lireGroupes(db)]);
  const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const profils: ProfilFete[] = users.docs.map((d) => {
    const x = d.data();
    const serviceRoles = (x.serviceRoles && typeof x.serviceRoles === "object" ? x.serviceRoles : {}) as Record<string, string[]>;
    return {
      uid: d.id,
      groupe: groupeDe({ groupe: x.groupe as string | undefined, serviceRoles }),
      serviceRoles,
      dansEquipes: liste(x.dansEquipes),
      planningName: typeof x.planningName === "string" ? x.planningName : "",
      coordination: isAdminEmail(x.email as string | undefined) || x.coordination === true,
    };
  });
  const moi = profils.find((p) => p.uid === appelant.uid);
  if (!moi) profils.push({ uid: appelant.uid, groupe: null, serviceRoles: {}, dansEquipes: [], planningName: "", coordination: isAdminEmail(appelant.email) });
  else if (isAdminEmail(appelant.email)) moi.coordination = true;
  return { profils, groupes: Object.fromEntries(groupes.map((g) => [g.id, g])), edd, jourJ };
}

/** Un jeton valide ne dit rien du jour J : « jusqu'au jour J compris » (décision 45, Q9). */
const apresLeJourJ = (aujourdhui: string, jourJ: string) => aujourdhui > jourJ;

export interface DroitsPassage extends DroitsDeSaisie { id: string }

/**
 * `POST /api/fetes/droits` (CF16) : donne un `id` aux passages qui n'en ont pas (CF1, une transaction,
 * ni `modifiePar` ni `updatedAt`), puis rend `{ chants, musiques, mien }` de l'appelant pour chaque
 * passage, dans l'ordre du programme. Après le jour J, `chants` et `musiques` sont faux (les boutons
 * s'arrêtent) ; `mien` reste.
 */
export async function droitsDeLEdition(
  db: FirebaseFirestore.Firestore,
  appelant: Appelant,
  programme: string,
  edd: PlanningEddFete,
  aujourdhui: string,
): Promise<DroitsPassage[]> {
  const ref = db.collection("programmes").doc(programme);
  // Lecture simple d'abord : la transaction (un verrou sur le programme) ne sert que s'il manque des `id`.
  let edition = lireEdition(programme, (await ref.get()).data());
  if (edition.passages.some((p) => !p.id)) edition = await db.runTransaction(async (tx) => {
    const ed = lireEdition(programme, (await tx.get(ref)).data());
    if (ed.passages.some((p) => !p.id)) {
      const pris = new Set(ed.passages.map((p) => p.id).filter(Boolean));
      ed.passages = ed.passages.map((p) => {
        if (p.id) return p;
        let id = nouvelIdPassage();
        while (pris.has(id)) id = nouvelIdPassage();
        pris.add(id);
        return { ...p, id };
      });
      tx.update(ref, { passages: ed.passages });
    }
    return ed;
  });
  const ctx = await lireContexteFetes(db, edition.jourJ, edd, appelant);
  const ferme = apresLeJourJ(aujourdhui, edition.jourJ);
  return edition.passages.map((p) => {
    const d = droitsDeSaisie(p, ctx, appelant.uid);
    return { id: p.id!, chants: d.chants && !ferme, musiques: d.musiques && !ferme, mien: d.mien };
  });
}

/** Nom affiché de l'auteur d'une setlist : nom de planning, sinon prénom et initiale. */
function nomDeLAuteur(data: Record<string, unknown> | undefined): string {
  const planning = typeof data?.planningName === "string" ? data.planningName.trim() : "";
  if (planning) return planning;
  const prenom = typeof data?.firstName === "string" ? data.firstName.trim() : "";
  const nom = typeof data?.lastName === "string" ? data.lastName.trim() : "";
  return [prenom, nom && `${nom[0]}.`].filter(Boolean).join(" ");
}

/**
 * `POST /api/fetes/saisir` (CF17, CF18) : crée la setlist du passage s'il n'en a pas, ou met à jour
 * ses `editeurs` (recopie des ayants droit du seul Qui), son titre, sa date et `fete.qui`. L'édition, le
 * passage et la setlist sont relus et vérifiés dans la transaction (comptes et groupes, lus avant). Rend
 * l'id de la setlist.
 */
export async function saisirChants(
  db: FirebaseFirestore.Firestore,
  appelant: Appelant,
  programme: string,
  passage: string,
  edd: PlanningEddFete,
  aujourdhui: string,
): Promise<{ setlistId: string }> {
  const progRef = db.collection("programmes").doc(programme);
  const avant = lireEdition(programme, (await progRef.get()).data());
  const ctx = await lireContexteFetes(db, avant.jourJ, edd, appelant);
  const auteur = nomDeLAuteur((await db.collection("users").doc(appelant.uid).get()).data());
  const setlistId = `${programme}-${passage}`;
  const slRef = db.collection("setlists").doc(setlistId);

  await db.runTransaction(async (tx) => {
    const ed = lireEdition(programme, (await tx.get(progRef)).data());
    const sl = await tx.get(slRef);
    const p = ed.passages.find((x) => x.id === passage);
    // Un seul Qui (décision 37) ; un jour J changé depuis la lecture fausserait la période EDD.
    if (!p || p.qui.length !== 1 || ed.jourJ !== avant.jourJ) throw new HttpError(409, "Ce passage a changé : recharge");
    if (apresLeJourJ(aujourdhui, ed.jourJ)) throw new HttpError(403, "La saisie est close depuis le jour J");
    const qui = p.qui[0];
    const ayants = ayantsDroitDuQui(qui, ctx).map((a) => a.uid);
    const coordination = ctx.profils.find((x) => x.uid === appelant.uid)?.coordination === true;
    if (!coordination && !ayants.includes(appelant.uid)) throw new HttpError(403, "Tu ne saisis pas les chants de ce passage");
    const fete = { programme, passage, qui };
    const titre = titreSetlistFete(ed.fete, ed.annee, qui);
    if (sl.exists) {
      // L'identifiant se devine : une setlist posée d'avance par un navigateur n'est pas reprise.
      const x = sl.data() ?? {};
      if ((x.fete as { programme?: string } | undefined)?.programme !== programme || x.ownerId != null) {
        throw new HttpError(409, "Cette setlist existe déjà : demande à un admin")
      }
      tx.update(slRef, { editeurs: ayants, title: titre, date: ed.jourJ, fete });
    } else {
      // Pas de `updatedAt` : `getSetlistsSince` l'interroge comme un horodatage.
      tx.set(slRef, {
        title: titre, leader: auteur, category: ed.fete === "noel" ? "Noël" : "Pâques", date: ed.jourJ,
        language: "fr", notes: "", items: [], isDraft: false, isPrivate: false, ownerId: null,
        createdAt: FieldValue.serverTimestamp(), editeurs: ayants, fete,
      });
    }
  });
  return { setlistId };
}

/**
 * `POST /api/fetes/musiques` (CF23) : remplace la liste de musiques et danses du seul passage désigné,
 * après avoir revérifié l'appelant (`droitsDeSaisie`, calculé en direct) et le jour J. `prenom` signe
 * l'écriture (`modifiePar`) : une coordination partie d'une version plus ancienne est refusée par D20.
 */
export async function ecrireMusiques(
  db: FirebaseFirestore.Firestore,
  appelant: Appelant,
  programme: string,
  passage: string,
  medias: unknown,
  prenom: string,
  edd: PlanningEddFete,
  aujourdhui: string,
): Promise<void> {
  const valides = validerMedias(medias);
  if (!valides.ok) throw new HttpError(400, `Musiques ou danses invalides (${valides.erreur})`);
  const ref = db.collection("programmes").doc(programme);
  const avant = lireEdition(programme, (await ref.get()).data());
  const ctx = await lireContexteFetes(db, avant.jourJ, edd, appelant);

  await db.runTransaction(async (tx) => {
    const ed = lireEdition(programme, (await tx.get(ref)).data());
    const p = ed.passages.find((x) => x.id === passage);
    if (!p || ed.jourJ !== avant.jourJ) throw new HttpError(409, "Ce passage a changé : recharge");
    if (apresLeJourJ(aujourdhui, ed.jourJ)) throw new HttpError(403, "La saisie est close depuis le jour J");
    if (!droitsDeSaisie(p, ctx, appelant.uid).musiques) throw new HttpError(403, "Tu ne tiens pas les musiques de ce passage");
    tx.update(ref, {
      passages: ed.passages.map((x) => (x === p ? { ...x, medias: valides.medias } : x)),
      modifiePar: prenom,
      updatedAt: new Date().toISOString(),
    });
  });
}
