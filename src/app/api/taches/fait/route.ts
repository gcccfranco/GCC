import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { filterUidsByNotifPref, loadNotifLangs, loadPlanningNameIndex, resolveNamesToUids } from "@/lib/push/recipients";
import { loadPlanningData, servantsForDate } from "@/lib/planning/names";
import { dimancheApres } from "@/lib/taches/echeances";
import { tacheFaiteMessage } from "@/lib/taches/messages";
import { ID, appelantDuPole, estPole, lireTache, membresDuPole, premiereFois } from "@/lib/taches/serveur";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Une fois de tâche vient d'être cochée (lot 7, docs/spec-taches.md) : prévenir
// le pôle suivant, ou la régie du service choisi le dimanche qui suit
// l'échéance (planning). Une seule fois par (tâche, fois, destinataire).
// Réponse : `notified`, `linked` (au moins un compte trouvé), `cible`.

export async function POST(req: NextRequest) {
  const { pole, tacheId, date } = (await req.json().catch(() => ({}))) as { pole?: string; tacheId?: string; date?: string };
  if (!estPole(pole) || typeof tacheId !== "string" || !ID.test(tacheId) || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }
  const appelant = await appelantDuPole(req, pole);
  if (appelant instanceof NextResponse) return appelant;

  const tache = await lireTache(pole, tacheId);
  if (!tache) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  const fois = await adminDb().collection("poles").doc(pole).collection("taches").doc(tacheId).collection("fois").doc(date).get();
  if (!fois.exists) return NextResponse.json({ error: "Pas encore cochée" }, { status: 400 });
  // Lot 13 : on ne prévient le pôle suivant que sur une tâche terminée, jamais
  // sur une tâche seulement commencée (un document d'avant le lot n'a pas d'état).
  if (((fois.data()?.etat as string) ?? "terminee") !== "terminee") {
    return NextResponse.json({ error: "Pas encore terminée" }, { status: 400 });
  }
  if (!tache.prevenir) return NextResponse.json({ ok: true, notified: 0, linked: true, cible: null });

  let uids: string[];
  let url: string;
  let cible: "pole" | "regie";
  if ("pole" in tache.prevenir) {
    cible = "pole";
    uids = await membresDuPole(tache.prevenir.pole);
    url = `/taches/${tache.prevenir.pole}`;
  } else {
    cible = "regie";
    const service = tache.prevenir.regie;
    const names = servantsForDate(await loadPlanningData(), dimancheApres(date))
      .filter((s) => s.serviceRole === "regie" && s.category === service)
      .map((s) => s.name);
    uids = resolveNamesToUids(names, await loadPlanningNameIndex()).uids;
    url = "/setlists";
  }
  const linked = uids.length > 0;
  uids = uids.filter((u) => u !== appelant.uid);

  const key = `tache-fait-${pole}-${tacheId}-${date}`;
  const fresh = await premiereFois(await filterUidsByNotifPref(uids, "taches"), key, { pole, tacheId, date });
  if (fresh.length) {
    const parNom = (fois.data()?.parNom as string) ?? "";
    const langs = await loadNotifLangs(fresh);
    await Promise.all(
      fresh.map(async (u) => {
        const msg = tacheFaiteMessage(tache, parNom, langs.get(u) ?? "fr");
        // Le lien de la tâche (fond Canva…) voyage en texte, pas en image.
        const payload = { ...msg, body: tache.lien ? `${msg.body}\n${tache.lien}` : msg.body, url, tag: key };
        await sendPushToUids([u], payload);
        await recordNotification({ ...payload, kind: "tache", recipients: [u] });
      }),
    );
  }
  return NextResponse.json({ ok: true, notified: fresh.length, linked, cible });
}
