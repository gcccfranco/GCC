// Outils partagés des routes /api/evenements/* (serveur seulement).

import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/push/admin";
import { uidsForCategory } from "@/lib/push/recipients";
import { equipeDuPour, poleDuPour, polesDe } from "@/lib/access";
import type { Evenement } from "@/types/evenement";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
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
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}

/** Membres concernés par un évènement : toute l'église, les membres de la
 *  section visée, ceux du pôle pour une réunion de pôle (lot 7), ceux de
 *  l'équipe pour une réunion d'équipe (lot U6, R4 : `dansEquipes` du profil,
 *  ce que lisent les règles). */
export async function destinatairesEvenement(db: FirebaseFirestore.Firestore, e: Pick<Evenement, "pour">): Promise<string[]> {
  const pole = poleDuPour(e.pour);
  const equipe = equipeDuPour(e.pour);
  if (e.pour === "eglise") return (await db.collection("users").get()).docs.map((d) => d.id);
  if (equipe) {
    return (await db.collection("users").get()).docs
      .filter((d) => ((d.data().dansEquipes as string[] | undefined) ?? []).includes(equipe))
      .map((d) => d.id);
  }
  // Pôle : ses membres seuls (lot 7 ; évènement de pôle, retouches v18 D23), lus dans la même base.
  if (pole) {
    return (await db.collection("users").get()).docs
      .filter((d) => (polesDe(d.data()) as string[]).includes(pole))
      .map((d) => d.id);
  }
  return uidsForCategory(e.pour);
}
