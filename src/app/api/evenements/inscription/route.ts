import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { HttpError, ID, errorResponse, inscrire, optionalUser } from "@/lib/evenements/serveur";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inscription à un évènement (lot 6, docs/spec-evenements.md). Avec compte :
// une place au nom du profil (id = uid, réinscription = mise à jour des
// invités). Sans compte, si l'organisateur l'autorise : nom + invités, id
// aléatoire. Le compteur `inscrits` (personnes + invités) et la place sont
// écrits dans une même transaction ; refus si l'inscription se fait sur un
// formulaire externe (lot 11), si c'est fermé, pas encore ouvert, terminé,
// commencé ou complet (période d'inscription, 17/09/2026). La transaction est
// `inscrire` (src/lib/evenements/serveur.ts), testable avec une base simulée.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  try {
    const user = await optionalUser(req);
    const body = (await req.json().catch(() => ({}))) as { evenementId?: unknown; invites?: unknown; nom?: unknown };
    const evenementId = typeof body.evenementId === "string" && ID.test(body.evenementId) ? body.evenementId : null;
    const invites = Number.isInteger(body.invites) && (body.invites as number) >= 0 && (body.invites as number) <= 5 ? (body.invites as number) : null;
    const nomLibre = typeof body.nom === "string" ? body.nom.trim().slice(0, 40) : "";
    if (!evenementId || invites === null) throw new HttpError(400, "Requête incomplète");
    if (!user && !nomLibre) throw new HttpError(401, "Non authentifié");

    const result = await inscrire(adminDb(), user, { evenementId, invites, nomLibre });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(e);
  }
}
