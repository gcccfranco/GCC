import { NextResponse, type NextRequest } from "next/server";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { filterUidsByNotifPref, loadNotifLangs } from "@/lib/push/recipients";
import { nouvelleTacheMessage } from "@/lib/taches/messages";
import { ID, appelantDuPole, estPole, lireTache, premiereFois } from "@/lib/taches/serveur";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quelqu'un vient d'être nommé responsable d'une tâche par un autre membre du
// pôle (lot 7) : « Nouvelle tâche : … », une fois par (tâche, responsable),
// préférence « Tâches ». Rien pour les fois suivantes d'une tâche répétée.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  const { pole, tacheId } = (await req.json().catch(() => ({}))) as { pole?: string; tacheId?: string };
  if (!estPole(pole) || typeof tacheId !== "string" || !ID.test(tacheId)) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }
  const appelant = await appelantDuPole(req, pole);
  if (appelant instanceof NextResponse) return appelant;

  const tache = await lireTache(pole, tacheId);
  if (!tache) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  const responsable = tache.responsableUid;
  if (!responsable || responsable === appelant.uid) return NextResponse.json({ ok: true, notified: 0 });

  const key = `tache-assigne-${pole}-${tacheId}`;
  const fresh = await premiereFois(await filterUidsByNotifPref([responsable], "taches"), key, { pole, tacheId });
  if (fresh.length) {
    const lang = (await loadNotifLangs(fresh)).get(responsable) ?? "fr";
    const payload = { ...nouvelleTacheMessage(tache, lang), url: `/taches/${pole}`, tag: key };
    await sendPushToUids(fresh, payload);
    await recordNotification({ ...payload, kind: "tache", recipients: fresh });
  }
  return NextResponse.json({ ok: true, notified: fresh.length });
}
