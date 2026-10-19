import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { HttpError, ID, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { loadPlanningData } from "@/lib/planning/names";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { droitsDeLEdition } from "@/lib/fetes/serveur";
import { BACK_OFFICE } from "@/lib/backOffice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Droits de saisie d'une fête (docs/spec-chants-fetes.md, CF16) : pour chaque passage de l'édition,
// `{ id, chants, musiques, mien }` de l'appelant. Seule source des boutons « Saisir les chants »,
// « + Musique ou danse » et du filtre « Le mien ». Pose aussi les `id` manquants (CF1).

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 });
  try {
    const user = await optionalUser(req);
    if (!user) throw new HttpError(401, "Non authentifié");
    const { programme } = (await req.json().catch(() => ({}))) as { programme?: unknown };
    if (typeof programme !== "string" || !ID.test(programme)) throw new HttpError(400, "Requête incomplète");
    const { edd } = await loadPlanningData();
    const passages = await droitsDeLEdition(adminDb(), user, programme, edd, nowIsoParis().slice(0, 10));
    return NextResponse.json({ passages });
  } catch (e) {
    return errorResponse(e);
  }
}
