import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { HttpError, ID, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import { loadPlanningData } from "@/lib/planning/names";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { ecrireMusiques } from "@/lib/fetes/serveur";
import { BACK_OFFICE } from "@/lib/backOffice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Musiques et danses d'un passage (docs/spec-chants-fetes.md, CF23) : remplace la liste du seul passage
// désigné. `programmes/{id}` reste écrit par la seule coordination dans les règles : la route (Admin
// SDK) revérifie l'appelant et signe l'écriture du prénom (`modifiePar`, protection D20).

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 });
  try {
    const user = await optionalUser(req);
    if (!user) throw new HttpError(401, "Non authentifié");
    const { programme, passage, medias } = (await req.json().catch(() => ({}))) as { programme?: unknown; passage?: unknown; medias?: unknown };
    if (typeof programme !== "string" || !ID.test(programme) || typeof passage !== "string" || !ID.test(passage)) {
      throw new HttpError(400, "Requête incomplète");
    }
    const db = adminDb();
    const profil = (await db.collection("users").doc(user.uid).get()).data() as { firstName?: string; planningName?: string } | undefined;
    // Signe l'écriture (D20 dit « Modifié par … ») : prénom, sinon nom de planning, sinon e-mail.
    const prenom = profil?.firstName || profil?.planningName || user.email;
    const { edd } = await loadPlanningData();
    await ecrireMusiques(db, user, programme, passage, medias, prenom, edd, nowIsoParis().slice(0, 10));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
