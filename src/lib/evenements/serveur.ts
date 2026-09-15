// Outils partagés des routes /api/evenements/* (serveur seulement).

import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/push/admin";

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
