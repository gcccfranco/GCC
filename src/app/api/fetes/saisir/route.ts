import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { HttpError, ID, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { loadPlanningData } from "@/lib/planning/names";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { saisirChants } from "@/lib/fetes/serveur";
import { BACK_OFFICE } from "@/lib/backOffice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// « Saisir les chants » (docs/spec-chants-fetes.md, CF17, CF18) : crée la setlist du passage ou met à
// jour ses éditeurs, après avoir revérifié l'appelant (ayant droit du seul Qui, ou coordination) et le
// jour J. Réponse `{ setlistId }`.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 });
  try {
    const user = await optionalUser(req);
    if (!user) throw new HttpError(401, "Non authentifié");
    const { programme, passage } = (await req.json().catch(() => ({}))) as { programme?: unknown; passage?: unknown };
    if (typeof programme !== "string" || !ID.test(programme) || typeof passage !== "string" || !ID.test(passage)) {
      throw new HttpError(400, "Requête incomplète");
    }
    const { edd } = await loadPlanningData();
    return NextResponse.json(await saisirChants(adminDb(), user, programme, passage, edd, nowIsoParis().slice(0, 10)));
  } catch (e) {
    return errorResponse(e);
  }
}
