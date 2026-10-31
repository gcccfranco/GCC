// Outils partagés des routes /api/evenements/* (serveur seulement).

import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/push/admin";
import { uidsForCategory } from "@/lib/push/recipients";
import { canInscrireEvenement, equipeDuPour } from "@/lib/access";
import { nowIsoParis, refusInscription, type RefusInscription } from "@/lib/evenements/agenda";
import { membresDeLEquipe } from "@/lib/taches/serveur";
import type { Evenement } from "@/types/evenement";

export class HttpError extends Error {
  /** `code` : court, renvoyé au client qui traduit le refus (src/lib/evenements/inscription.ts). */
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

export const ID = /^[\w-]+$/;

/** Utilisateur du jeton, ou null s'il n'y en a pas ; 401 si le jeton est invalide. */
export async function optionalUser(req: NextRequest): Promise<{ uid: string; email: string } | null> {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await verifyIdToken(token);
    return { uid: decoded.uid, email: (decoded.email ?? "").toLowerCase() };
  } catch {
    throw new HttpError(401, "Token invalide");
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message, ...(e.code ? { code: e.code } : {}) }, { status: e.status });
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}

/** Membres concernés par un évènement : toute l'église, les membres de la
 *  section visée, ceux de l'équipe pour une réunion ou un évènement d'équipe
 *  (lot U6, R4 ; retouches v18 D23 ; EQ20 : `membresDeLEquipe`, Louange élargi,
 *  ce que lisent les règles), lus dans la même base. */
export async function destinatairesEvenement(db: FirebaseFirestore.Firestore, e: Pick<Evenement, "pour">): Promise<string[]> {
  const equipe = equipeDuPour(e.pour);
  if (e.pour === "eglise") return (await db.collection("users").get()).docs.map((d) => d.id);
  return equipe ? membresDeLEquipe(equipe, db) : uidsForCategory(e.pour);
}

const REFUS: Record<RefusInscription, string> = {
  externe: "Les inscriptions se font sur un formulaire externe.",
  fermee: "Les inscriptions sont fermées.",
  pasEncore: "Les inscriptions ne sont pas encore ouvertes.",
  terminee: "Les inscriptions sont closes.",
  commencee: "L'évènement a déjà commencé.",
  complet: "Il n'y a plus assez de places.",
};

/** Places (personnes + invités) offertes aux inscriptions sans compte, par évènement. */
export const PLAFOND_SANS_COMPTE = 60;

/** L'inscription de /api/evenements/inscription, base passée (testable) : avec compte, une place au
 *  nom du profil (id = uid, réinscription = mise à jour des invités) ; sans compte, `nomLibre`, id
 *  aléatoire. Le compteur et la place s'écrivent dans une même transaction. HttpError 403 (sans
 *  compte refusé, évènement d'équipe pour qui ne le voit pas, retouches v18 E6), 404, 409. */
export async function inscrire(
  db: FirebaseFirestore.Firestore,
  user: { uid: string; email: string } | null,
  { evenementId, invites, nomLibre }: { evenementId: string; invites: number; nomLibre: string },
) {
  const ref = db.collection("evenements").doc(evenementId);
  let nom = nomLibre;
  let profil: Parameters<typeof canInscrireEvenement>[1] = null;
  if (user) {
    // Le profil entier : ses sections et ses équipes (Louange élargi) décident de l'accès (E6).
    const p = (await db.collection("users").doc(user.uid).get()).data() as { firstName?: string; lastName?: string; email?: string; serviceRoles?: Record<string, unknown>; dansEquipes?: string[] } | undefined;
    nom = [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() || p?.email || user.email;
    profil = p ?? null;
  }

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "Évènement introuvable", "introuvable");
    const e = snap.data() as Evenement;
    if (!user && !e.sansCompte) throw new HttpError(403, "Inscription réservée aux membres connectés.", "reserveMembres");
    // Évènement d'équipe (retouches v18, E6 ; EQ20) : ceux qui le voient seulement.
    if (!canInscrireEvenement(user, profil, e)) throw new HttpError(403, "Évènement réservé aux membres de l'équipe.", "reserveEquipe");
    const iid = user ? user.uid : ref.collection("inscriptions").doc().id;
    const iref = ref.collection("inscriptions").doc(iid);
    const existing = user ? await tx.get(iref) : null;
    const prev = existing?.exists ? 1 + ((existing.data()?.invites as number) ?? 0) : 0;
    const sansMoi = (e.inscrits ?? 0) - prev;
    const refus = refusInscription({ ...e, inscrits: sansMoi }, invites, nowIsoParis());
    if (refus) throw new HttpError(409, REFUS[refus], refus);
    // Plafond des places sans compte, tenu dans la même transaction.
    const sansCompte = e.inscritsSansCompte ?? 0;
    if (!user && sansCompte + 1 + invites > PLAFOND_SANS_COMPTE) {
      throw new HttpError(409, "La limite des inscriptions sans compte est atteinte.", "limiteSansCompte");
    }
    const createdAt = existing?.exists ? (existing.data()?.createdAt as string) : new Date().toISOString();
    const inscrits = sansMoi + 1 + invites;
    tx.set(iref, { uid: user?.uid ?? null, nom, invites, createdAt });
    tx.update(ref, user ? { inscrits } : { inscrits, inscritsSansCompte: sansCompte + 1 + invites });
    return { inscrits, mine: { id: iid, uid: user?.uid ?? null, nom, invites, createdAt } };
  });
}
