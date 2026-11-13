import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { filterUidsByNotifPref, loadNotifLangs } from "@/lib/push/recipients";
import { nouvelleTacheMessage } from "@/lib/taches/messages";
import { ID, appelant, estEquipe, tacheDeLAppelant } from "@/lib/taches/serveur";
import { apresEnvoi, envoyerReserve } from "@/lib/push/reserver";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quelqu'un vient d'être nommé responsable d'une tâche par un référent de son
// équipe (lot 7 ; lot 1 du chantier « équipes et groupes », EQ11) : « Nouvelle
// tâche : … », une fois par (tâche, responsable), préférence « Tâches ». Rien
// pour les fois suivantes d'une tâche répétée.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  const { equipe, tacheId } = (await req.json().catch(() => ({}))) as { equipe?: string; tacheId?: string };
  if (!estEquipe(equipe) || typeof tacheId !== "string" || !ID.test(tacheId)) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }
  const qui = await appelant(req);
  if (qui instanceof NextResponse) return qui;
  // Membre de l'équipe et référent (seul qui crée ou modifie nomme un responsable), tâche lue ici.
  const tache = await tacheDeLAppelant(adminDb(), qui, equipe, tacheId, "assigne");
  if ("status" in tache) return NextResponse.json({ error: tache.error }, { status: tache.status });
  const responsable = tache.responsableUid;
  if (!responsable || responsable === qui.uid) return NextResponse.json({ ok: true, notified: 0 });

  const key = `tache-assigne-${equipe}-${tacheId}`;
  const [destinataire] = await filterUidsByNotifPref([responsable], "taches");
  if (!destinataire) return NextResponse.json({ ok: true, notified: 0 });
  // La clé `${key}-${uid}` est réservée AVANT l'envoi (une fois par tâche et responsable), rendue si rien n'est
  // parti ; la cloche s'écrit après l'envoi (envoyerReserve, src/lib/push/reserver.ts).
  const db = adminDb();
  const r = await envoyerReserve(db, `${key}-${destinataire}`, { equipe, tacheId, uid: destinataire, at: Date.now() }, {}, async (parti) => {
    const lang = (await loadNotifLangs([destinataire])).get(destinataire) ?? "fr";
    // Lot U6, B3 : « À faire pour moi », ouvert à tout membre de l'équipe (la page de l'équipe est au
    // Back-Office).
    const payload = { ...nouvelleTacheMessage(tache, lang), url: "/taches", tag: key };
    await sendPushToUids([destinataire], payload);
    parti();
    await apresEnvoi(() => recordNotification({ ...payload, kind: "tache", recipients: [destinataire] }), "taches/assigne");
  });
  return NextResponse.json({ ok: true, notified: r.pris ? 1 : 0 });
}
