import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { filterUidsByNotifPref, loadNotifLangs, loadPlanningNameIndex, resolveNamesToUids } from "@/lib/push/recipients";
import { loadPlanningData, servantsForDate } from "@/lib/planning/names";
import { dimancheApres } from "@/lib/taches/echeances";
import { tacheFaiteMessage } from "@/lib/taches/messages";
import { ID, appelant, estEquipe, membresDeLEquipe, tacheDeLAppelant } from "@/lib/taches/serveur";
import { apresEnvoi, reserverPuisEnvoyer } from "@/lib/push/reserver";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Une fois de tâche vient d'être cochée (lot 7, docs/spec-taches.md ; lot 1 du
// chantier « équipes et groupes », EQ11) : prévenir l'équipe suivante, ou la
// régie du service choisi le dimanche qui suit l'échéance (planning). Une seule
// fois par (tâche, fois, destinataire). Seul qui peut cocher la tâche prévient
// (`peutCocher`, décision 41). Réponse : `notified`, `linked` (au moins un
// compte trouvé), `cible`.

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  const { equipe, tacheId, date } = (await req.json().catch(() => ({}))) as { equipe?: string; tacheId?: string; date?: string };
  if (!estEquipe(equipe) || typeof tacheId !== "string" || !ID.test(tacheId) || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }
  const qui = await appelant(req);
  if (qui instanceof NextResponse) return qui;

  const tache = await tacheDeLAppelant(adminDb(), qui, equipe, tacheId, "fait");
  if ("status" in tache) return NextResponse.json({ error: tache.error }, { status: tache.status });
  const fois = await adminDb().collection("equipes").doc(equipe).collection("taches").doc(tacheId).collection("fois").doc(date).get();
  if (!fois.exists) return NextResponse.json({ error: "Pas encore cochée" }, { status: 400 });
  // Lot 13 : on ne prévient l'équipe suivante que sur une tâche terminée, jamais
  // sur une tâche seulement commencée (un document d'avant le lot n'a pas d'état).
  if (((fois.data()?.etat as string) ?? "terminee") !== "terminee") {
    return NextResponse.json({ error: "Pas encore terminée" }, { status: 400 });
  }
  if (!tache.prevenir) return NextResponse.json({ ok: true, notified: 0, linked: true, cible: null });

  let uids: string[];
  let url: string;
  let cible: "equipe" | "regie";
  if ("equipe" in tache.prevenir) {
    cible = "equipe";
    // Les membres de l'équipe, Louange élargi (EQ11).
    uids = await membresDeLEquipe(tache.prevenir.equipe);
    // Lot U6, B3 : « À faire pour moi » (la page de l'équipe est au Back-Office).
    url = "/taches";
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
  uids = uids.filter((u) => u !== qui.uid);

  const key = `tache-fait-${equipe}-${tacheId}-${date}`;
  // Réservé dans le try (une clé par destinataire) ; rendue seulement si l'envoi échoue. Une cloche ratée après
  // l'envoi se journalise.
  const fresh = await reserverPuisEnvoyer(adminDb(), await filterUidsByNotifPref(uids, "taches"), key, { equipe, tacheId, date }, async (reserves, envoyes) => {
    const parNom = (fois.data()?.parNom as string) ?? "";
    const langs = await loadNotifLangs(reserves);
    const resultats = await Promise.allSettled(
      reserves.map(async (u) => {
        const msg = tacheFaiteMessage(tache, parNom, langs.get(u) ?? "fr");
        // Le lien de la tâche (fond Canva…) voyage en texte, pas en image.
        const payload = { ...msg, body: tache.lien ? `${msg.body}\n${tache.lien}` : msg.body, url, tag: key };
        await sendPushToUids([u], payload);
        envoyes.add(u);
        await apresEnvoi(() => recordNotification({ ...payload, kind: "tache", recipients: [u] }), "taches/fait");
      }),
    );
    const echec = resultats.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (echec) throw echec.reason;
  });
  return NextResponse.json({ ok: true, notified: fresh.length, linked, cible });
}
