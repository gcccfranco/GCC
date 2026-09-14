import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { loadPlanningData, servantsForDate } from "@/lib/planning/names";
import { canEditSetlist, canSetPresentationLink } from "@/lib/access";
import { isOnDutyRegie, parsePresentationUrl } from "@/lib/setlist/presentationLink";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lien de la présentation (PPT) d'une setlist (docs/spec-regie.md). Passe par le
// serveur parce que la régie du jour ne peut être reconnue qu'en lisant le
// planning, ce que les règles Firestore ne savent pas faire. `url` vide = retirer.
// `updatedAt` n'est pas touché : ajouter le lien n'est pas modifier la setlist.

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
  return NextResponse.json({ ok: true, presentationUrl: presentationUrl || null });
}
