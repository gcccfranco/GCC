import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/push/admin";
import { authentifier } from "@/lib/api/authentifier";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadPlanningNameIndex, filterUidsByNotifPref, loadNotifLangs } from "@/lib/push/recipients";
import { loadPlanningData, servantsForDate } from "@/lib/planning/names";
import { canEditSetlist, canSetPresentationLink, estRegieDeFete } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { apresEnvoi, reserverPuisEnvoyer } from "@/lib/push/reserver";
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
  const p = author.profile;
  const who = p?.planningName || [p?.firstName, p?.lastName].filter(Boolean).join(" ");
  // Chaque uid est réservé AVANT l'envoi (create), dans le try : un appel simultané ne le prévient pas une seconde
  // fois. Une fournée par langue (lot 8) : le président lit le message dans la sienne. Une cloche ratée après l'envoi
  // se journalise, la clé reste.
  const fresh = await reserverPuisEnvoyer(db, await filterUidsByNotifPref(uids, "setlists"), key, { setlistId: setlist.id }, async (reserves, envoyes) => {
    const langs = await loadNotifLangs(reserves);
    for (const lang of ["fr", "zh-CN"] as const) {
      const groupe = reserves.filter((u) => (langs.get(u) ?? "fr") === lang);
      if (!groupe.length) continue;
      const payload = { ...presentationMessage(setlist.title || setlist.category, who, lang), url: `/setlists/${setlist.id}`, tag: key };
      await sendPushToUids(groupe, payload);
      for (const u of groupe) envoyes.add(u);
      await apresEnvoi(() => recordNotification({ ...payload, kind: "presentation", recipients: groupe }), "setlist/presentation");
    }
  });
  if (!fresh.length) return { notified: 0, linked };
  return { notified: fresh.length, linked };
}

export async function POST(req: NextRequest) {
  const user = await authentifier(req);
  if (user instanceof NextResponse) return user;

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
  // Une setlist à la corbeille n'existe plus pour personne (SC2.2).
  if (snap.get("supprimeeLe")) return NextResponse.json({ error: "Setlist introuvable" }, { status: 404 });
  const setlist = { id: setlistId, ...snap.data() } as FSSetlist;
  // Une setlist de fête n'existe pas en ligne (docs/spec-chants-fetes.md, CF24) : même Firestore, autre site.
  if (setlist.fete && !BACK_OFFICE) return new Response(null, { status: 404 });
  const profile = ((await db.collection("users").doc(user.uid).get()).data() ?? null) as UserProfile | null;
  const safeProfile = profile && { ...profile, serviceRoles: profile.serviceRoles ?? {} };

  // Le planning n'est lu que si l'édition ne suffit pas déjà. Une setlist de fête n'a pas de planning
  // de catégorie : la régie y est TEAM RÉGIE (CF27, décision 45, Q7).
  // Lot AO (interrupteur ouvert seulement) : la Régie qui sert à ce lieu (`lieuxRegie`, cochée dans l'organigramme)
  // compte aussi, sans être inscrite au planning du jour.
  const regieDuLieu = BACK_OFFICE && !setlist.isPrivate && (profile?.lieuxRegie ?? []).includes(setlist.category);
  const regie = setlist.fete
    ? estRegieDeFete(profile, setlist)
    : !canEditSetlist(user, safeProfile, setlist) &&
      !setlist.isPrivate &&
      (regieDuLieu ||
        isOnDutyRegie(servantsForDate(await loadPlanningData(), (setlist.date ?? "").slice(0, 10)), setlist, profile?.planningName ?? ""));
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
