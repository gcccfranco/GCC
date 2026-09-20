// Outils partagés des routes /api/evenements/* (serveur seulement).

import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/push/admin";
import { uidsForCategory } from "@/lib/push/recipients";
import { poleDuPour } from "@/lib/access";
import { membresDuPole } from "@/lib/taches/serveur";
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
 *  section visée, ou ceux du pôle pour une réunion (lot 7). */
export async function destinatairesEvenement(db: FirebaseFirestore.Firestore, e: Pick<Evenement, "pour">): Promise<string[]> {
  const pole = poleDuPour(e.pour);
  if (e.pour === "eglise") return (await db.collection("users").get()).docs.map((d) => d.id);
  return pole ? membresDuPole(pole) : uidsForCategory(e.pour);
}
