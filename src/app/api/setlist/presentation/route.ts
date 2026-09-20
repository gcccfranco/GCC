import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadPlanningNameIndex, filterUidsByNotifPref, loadNotifLangs } from "@/lib/push/recipients";
import { loadPlanningData, servantsForDate } from "@/lib/planning/names";
import { canEditSetlist, canSetPresentationLink } from "@/lib/access";
import {
  isOnDutyRegie,
  parsePresentationUrl,
  presentationNotifKey,
  presidentRecipients,
  presentationMessage,
} from "@/lib/setlist/presentationLink";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lien de la présentation (PPT) d'une setlist (docs/spec-regie.md). Passe par le
// serveur parce que la régie du jour ne peut être reconnue qu'en lisant le
// planning, ce que les règles Firestore ne savent pas faire. `url` vide = retirer.
// `updatedAt` n'est pas touché : ajouter le lien n'est pas modifier la setlist.
// Lien posé ou remplacé → le président de la setlist est prévenu (lot 2,
// docs/spec-notif-president.md) ; retrait ou lien inchangé → rien.

/** Prévient les comptes au nom du président (préférence « Setlist prête »,
 *  jamais deux fois du même lien). Renvoie ce que la régie doit voir. */
async function notifyPresident(
  db: FirebaseFirestore.Firestore,
  setlist: FSSetlist,
  url: string,
  author: { uid: string; profile: UserProfile | null },
): Promise<{ notified: number; linked: boolean }> {
  const { uids, linked } = presidentRecipients(setlist.leader ?? "", await loadPlanningNameIndex(), author.uid);
  const key = presentationNotifKey(setlist.id, url);
  const fresh: string[] = [];
  for (const u of await filterUidsByNotifPref(uids, "setlists")) {
    if (!(await db.collection("notifLog").doc(`${key}-${u}`).get()).exists) fresh.push(u);
  }
  if (!fresh.length) return { notified: 0, linked };
  const p = author.profile;
  const who = p?.planningName || [p?.firstName, p?.lastName].filter(Boolean).join(" ");
  // Une fournée par langue (lot 8) : le président lit le message dans la sienne.
  const langs = await loadNotifLangs(fresh);
  for (const lang of ["fr", "zh-CN"] as const) {
    const groupe = fresh.filter((u) => (langs.get(u) ?? "fr") === lang);
    if (!groupe.length) continue;
    const payload = { ...presentationMessage(setlist.title || setlist.category, who, lang), url: `/setlists/${setlist.id}`, tag: key };
    await sendPushToUids(groupe, payload);
    await recordNotification({ ...payload, kind: "presentation", recipients: groupe });
  }
  const batch = db.batch();
  for (const u of fresh) batch.set(db.collection("notifLog").doc(`${key}-${u}`), { setlistId: setlist.id, uid: u, at: Date.now() });
  await batch.commit();
  return { notified: fresh.length, linked };
}

export async function POST(req: NextRequest) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let user: { uid: string; email: string };
  try {
    const decoded = await verifyIdToken(token);
    user = { uid: decoded.uid, email: (decoded.email ?? "").toLowerCase() };
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const { setlistId, url } = (await req.json().catch(() => ({}))) as { setlistId?: string; url?: string };
  // Identifiant Firestore simple : un « / » ferait viser un autre document.
  if (typeof setlistId !== "string" || !/^[\w-]+$/.test(setlistId) || typeof url !== "string") {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }
  const presentationUrl = url.trim() ? parsePresentationUrl(url) : "";
  if (presentationUrl === null) {
    return NextResponse.json({ error: "Le lien doit commencer par https://" }, { status: 400 });
  }

  const db = adminDb();
  const ref = db.collection("setlists").doc(setlistId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Setlist introuvable" }, { status: 404 });
  const setlist = { id: setlistId, ...snap.data() } as FSSetlist;
  const profile = ((await db.collection("users").doc(user.uid).get()).data() ?? null) as UserProfile | null;
  const safeProfile = profile && { ...profile, serviceRoles: profile.serviceRoles ?? {} };

  // Le planning n'est lu que si l'édition ne suffit pas déjà.
  const regie =
    !canEditSetlist(user, safeProfile, setlist) &&
    !setlist.isPrivate &&
    isOnDutyRegie(servantsForDate(await loadPlanningData(), (setlist.date ?? "").slice(0, 10)), setlist, profile?.planningName ?? "");
  if (!canSetPresentationLink(user, safeProfile, setlist, regie)) {
    return NextResponse.json(
      { error: "Seule la régie inscrite au planning ce jour-là (ou qui peut modifier la setlist) peut changer ce lien." },
      { status: 403 },
    );
  }

  await ref.update({ presentationUrl: presentationUrl || FieldValue.delete() });
  const changed = presentationUrl && presentationUrl !== (setlist.presentationUrl ?? "");
  const notice = changed ? await notifyPresident(db, setlist, presentationUrl, { uid: user.uid, profile: profile }) : {};
  return NextResponse.json({ ok: true, presentationUrl: presentationUrl || null, ...notice });
}
