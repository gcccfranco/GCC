import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids, allSubscriberUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { uidsForCategory, loadNotifLangs } from "@/lib/push/recipients";
import { planningReleaseMessage } from "@/lib/push/messages";
import { isAdminEmail } from "@/lib/access";
import { NOTIFY_ALL } from "@/lib/push/audiences";
import { getPlanning, canPublishPlanning, TRI_ORDER } from "@/lib/planning/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Publication d'un trimestre de planning (Culte / groupes). Révèle l'onglet du
// trimestre côté membres (flag planningReleases/{key}_{year}.published[]) et, à
// la PREMIÈRE publication, envoie une notification push à l'audience du planning
// (Culte → tout le monde ; groupe → membres du groupe). Réservé aux admins et aux
// comptes dont le droit `notify` couvre ce planning. `publish:false` re-masque le
// trimestre (sans notification, sans re-notif à une republication).

export async function POST(req: NextRequest) {
  // 1. Authentification
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let uid: string;
  let email: string;
  try {
    const decoded = await verifyIdToken(token);
    uid = decoded.uid;
    email = (decoded.email ?? "").toLowerCase();
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  // 2. Requête
  const { key, tri, publish, year } = (await req.json().catch(() => ({}))) as {
    key?: string;
    tri?: string;
    publish?: boolean;
    year?: number;
  };
  const planning = key ? getPlanning(key) : undefined;
  if (!planning) return NextResponse.json({ error: "Planning inconnu" }, { status: 400 });
  if (!tri || !(TRI_ORDER as readonly string[]).includes(tri)) {
    return NextResponse.json({ error: "Trimestre invalide" }, { status: 400 });
  }
  const yr = Number.isInteger(year) ? (year as number) : new Date().getFullYear();
  const doPublish = publish !== false;

  // 3. Droits de l'expéditeur
  const isAdmin = isAdminEmail(email);
  let rights: string[] = [];
  if (!isAdmin) {
    const me = (await adminDb().collection("users").doc(uid).get()).data() as
      | { notify?: string[] }
      | undefined;
    rights = me?.notify ?? [];
  }
  if (!canPublishPlanning(planning, isAdmin, rights)) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }

  // 4. Mise à jour du flag de publication
  const ref = adminDb().collection("planningReleases").doc(`${planning.key}_${yr}`);
  const snap = await ref.get();
  const current = ((snap.data()?.published as string[] | undefined) ?? []).filter((t) =>
    (TRI_ORDER as readonly string[]).includes(t)
  );
  const already = current.includes(tri);
  const next = doPublish
    ? [...new Set([...current, tri])].sort()
    : current.filter((t) => t !== tri);
  if (next.length !== current.length || (!doPublish && already)) {
    await ref.set({ published: next, updatedAt: new Date(), updatedBy: uid }, { merge: true });
  }

  // 5. Notification — uniquement à la première publication (jamais au masquage,
  // jamais à une republication d'un trimestre déjà publié).
  let notified = false;
  let sent = 0;
  if (doPublish && !already) {
    // Une fournée par langue (lot 8) : resté en français seul jusqu'au 19/09/2026.
    const tous = planning.notifyAudience === NOTIFY_ALL;
    const cible = tous ? await allSubscriberUids() : await uidsForCategory(planning.notifyAudience);
    const langs = await loadNotifLangs(cible);
    const tag = `release-${planning.key}-${yr}-${tri}`;
    for (const lang of ["fr", "zh-CN"] as const) {
      const groupe = cible.filter((u) => (langs.get(u) ?? "fr") === lang);
      if (!groupe.length) continue;
      const message = planningReleaseMessage({ label: planning.label, tri }, lang);
      const result = await sendPushToUids(groupe, { ...message, url: "/planning", tag });
      sent += result.sent;
      // Cloche : une entrée par fournée pour une catégorie ; « tout le monde »
      // garde son entrée unique (visible aussi de qui n'a pas d'abonnement push).
      if (!tous) await recordNotification({ ...message, url: "/planning", kind: "broadcast", recipients: groupe });
    }
    if (tous) {
      const fr = planningReleaseMessage({ label: planning.label, tri }, "fr");
      await recordNotification({ ...fr, url: "/planning", kind: "broadcast", everyone: true });
    }
    notified = true;
  }

  return NextResponse.json({ ok: true, published: next, notified, sent });
}
