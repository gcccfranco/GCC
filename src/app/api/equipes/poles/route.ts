import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { HttpError, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { exigerDroitEquipes, lireEquipes, recalculerPoles } from "@/lib/equipes/serveur";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Propagation des pôles (lot 16, D4 du 18/09/2026). `users/{uid}.poles` reste
// fermé au navigateur (`allow update: if isAdmin()` dans firestore.rules) :
// c'est cette route qui le repose, après avoir revérifié que l'appelant a bien
// le droit de tenir l'organigramme. Elle n'écrit que `poles`, et seulement ce
// que les équipes disent — l'appelant ne choisit pas les pôles, seulement les
// comptes à recalculer.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  try {
    const user = await optionalUser(req);
    await exigerDroitEquipes(user);
    const body = (await req.json().catch(() => ({}))) as { uids?: unknown };
    const uids = Array.isArray(body.uids) ? body.uids.filter((u): u is string => typeof u === "string") : null;
    if (!uids) throw new HttpError(400, "Requête incomplète");

    const db = adminDb();
    const maj = await recalculerPoles(db, uids, await lireEquipes(db));
    return NextResponse.json({ ok: true, maj });
  } catch (e) {
    return errorResponse(e);
  }
}
