import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/push/admin";

/** Appelant d'une route API : jeton Firebase (en-tête Bearer) vérifié, sinon la réponse 401 à rendre.
 *  Serveur uniquement (firebase-admin) : ne pas l'importer côté client. */
export async function authentifier(
  req: NextRequest,
  sansJeton = "Non authentifié",
): Promise<{ uid: string; email: string } | NextResponse> {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: sansJeton }, { status: 401 });
  try {
    const decoded = await verifyIdToken(token);
    return { uid: decoded.uid, email: (decoded.email ?? "").toLowerCase() };
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
}
