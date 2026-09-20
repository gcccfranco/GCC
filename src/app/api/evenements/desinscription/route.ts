import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { aCommence, nowIsoParis } from "@/lib/evenements/agenda";
import { canEditEvenement } from "@/lib/access";
import { HttpError, ID, errorResponse, optionalUser } from "@/lib/evenements/serveur";
import type { Evenement } from "@/types/evenement";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Désinscription (lot 6) : soi-même (jeton, tant que l'évènement n'a pas
// commencé), ou une inscription donnée par l'organisateur ou la coordination
// (sans compte compris). Compteur et place dans la même transaction.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  try {
    const user = await optionalUser(req);
    if (!user) throw new HttpError(401, "Non authentifié");
    const body = (await req.json().catch(() => ({}))) as { evenementId?: unknown; inscriptionId?: unknown };
    const evenementId = typeof body.evenementId === "string" && ID.test(body.evenementId) ? body.evenementId : null;
    const inscriptionId = typeof body.inscriptionId === "string" && ID.test(body.inscriptionId) ? body.inscriptionId : null;
    if (!evenementId) throw new HttpError(400, "Requête incomplète");

    const db = adminDb();
    const ref = db.collection("evenements").doc(evenementId);
    const profile = ((await db.collection("users").doc(user.uid).get()).data() ?? null) as { poles?: string[] } | null;

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, "Évènement introuvable");
      const e = { id: snap.id, ...snap.data() } as Evenement;
      const gestion = canEditEvenement(user, profile, e);
      const iid = inscriptionId ?? user.uid;
      if (iid !== user.uid && !gestion) throw new HttpError(403, "Non autorisé");
      const iref = ref.collection("inscriptions").doc(iid);
      const ins = await tx.get(iref);
      if (!ins.exists) throw new HttpError(404, "Inscription introuvable");
      if (iid === user.uid && !gestion && aCommence(e, nowIsoParis())) throw new HttpError(409, "L'évènement a déjà commencé.");
      const inscrits = Math.max(0, (e.inscrits ?? 0) - 1 - ((ins.data()?.invites as number) ?? 0));
      tx.delete(iref);
      tx.update(ref, { inscrits });
      return { inscrits };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(e);
  }
}
