import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { loadPlanningNameIndex, resolveNamesToUids, filterUidsByNotifPref, loadNotifLangs } from "@/lib/push/recipients";
import { setlistReadyMessage } from "@/lib/push/messages";
import { loadPlanningData, servantsForDate, normalizeName } from "@/lib/planning/names";
import { FieldValue } from "firebase-admin/firestore";
import { isAdminEmail, categoryLevel } from "@/lib/access";
import { aPrevenir, horodatageEnvoi, peutPrevenirEquipe } from "@/lib/setlist/partage";
import type { ServiceRole } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Notif « setlist prête » : sur une setlist (toute catégorie) contenant ≥ 4
// chants. Prévient les musiciens, la régie et les choristes de service à cette
// date (hors présidence et orateur). Deux déclencheurs :
//   - Manuel (bouton « Prévenir l'équipe ») : ré-envoi possible 1 fois / 24 h.
//   - Auto (`auto: true`, à la sauvegarde de la setlist) : envoi UNE seule fois,
//     dès que l'équipe a été touchée. Tant que personne n'est joignable (noms du
//     planning non encore appariés à un compte), la prochaine sauvegarde réessaie.

const MIN_SONGS = 4;
const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;
// Rôles destinataires : exécutants hors présidence (auteur/leader) et hors
// orateur/traduction (serviceRole null dans servantsForDate).
const TEAM_ROLES: ServiceRole[] = ["chanteur", "musicien", "regie"];

export async function POST(req: NextRequest) {
  // 1. Authentification de l'appelant
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

  const { setlistId, auto } = (await req.json().catch(() => ({}))) as {
    setlistId?: string;
    auto?: boolean;
  };
  if (!setlistId) return NextResponse.json({ error: "setlistId manquant" }, { status: 400 });

  const db = adminDb();

  // 2. Chargement de la setlist
  const snap = await db.collection("setlists").doc(setlistId).get();
  if (!snap.exists) return NextResponse.json({ error: "Setlist introuvable" }, { status: 404 });
  const sl = snap.data() as {
    title?: string;
    leader?: string;
    category?: string;
    date?: string;
    moment?: "matin" | "soir";
    ownerId?: string;
    isPrivate?: boolean;
    editeurs?: string[];
    items?: { type?: string }[];
  };

  if (!sl.category) {
    return NextResponse.json({ error: "Catégorie de setlist manquante" }, { status: 400 });
  }

  // Une setlist privée ne notifie jamais l'équipe du planning ; avec une équipe
  // choisie (`editeurs`, lue ici dans le document), elle prévient cette équipe seule.
  const equipeChoisie = sl.editeurs ?? [];
  if (sl.isPrivate && equipeChoisie.length === 0) {
    if (auto) return NextResponse.json({ ok: true, skipped: "private" });
    return NextResponse.json({ error: "Cette setlist est privée." }, { status: 400 });
  }

  // 3. Au moins 4 vrais chants (les transitions ne comptent pas)
  const songCount = (sl.items ?? []).filter((i) => i?.type !== "transition").length;
  if (songCount < MIN_SONGS) {
    // En auto, une setlist pas encore prête n'est pas une erreur : on l'ignore.
    if (auto) return NextResponse.json({ ok: true, skipped: "below-min" });
    return NextResponse.json(
      { error: `La setlist doit contenir au moins ${MIN_SONGS} chants` },
      { status: 400 }
    );
  }

  // 4. Autorisation : propriétaire, équipe de la setlist ; sur une non privée, aussi
  //    admin ou exécutant de la catégorie.
  const isAdmin = isAdminEmail(email);
  const isOwner = sl.ownerId === uid;
  let isPerformer = false;
  if (!sl.isPrivate && !isAdmin && !isOwner && !equipeChoisie.includes(uid)) {
    const me = (await db.collection("users").doc(uid).get()).data() as
      | { serviceRoles?: Record<string, ServiceRole[]> }
      | undefined;
    const serviceRoles = me?.serviceRoles ?? {};
    const rolesAtCat = serviceRoles[sl.category];
    // Exécutant = niveau create/edit sur la catégorie (la régie seule en lecture est exclue).
    isPerformer = !!rolesAtCat && categoryLevel(sl.category, rolesAtCat) !== "view";
  }
  if (!peutPrevenirEquipe({ ownerId: sl.ownerId, isPrivate: sl.isPrivate, editeurs: equipeChoisie }, { uid, estAdmin: isAdmin, estExecutant: isPerformer })) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }

  // 5. Anti-spam selon le déclencheur.
  const logRef = db.collection("notifLog").doc(`setlist-${setlistId}`);
  const logSnap = await logRef.get();
  const lastSentAt = logSnap.exists ? (logSnap.data()?.lastSentAt as number | undefined) : undefined;
  const lastRecipients = logSnap.exists ? (logSnap.data()?.recipients as number | undefined) : undefined;
  const prevenus = logSnap.exists ? ((logSnap.data()?.partagePrevenus as string[] | undefined) ?? []) : [];
  const planningDejaPrevenu = !!lastSentAt && (lastRecipients ?? 0) > 0;
  if (auto) {
    // Auto : le planning une seule fois, dès qu'il a été touché ; chaque personne de
    // l'équipe choisie une seule fois. Rien de nouveau : déjà envoyé.
    const planningFait = !!sl.isPrivate || planningDejaPrevenu;
    const equipeNouvelle = aPrevenir({ isPrivate: true, editeurs: equipeChoisie }, { planning: [], prevenus, planningDejaPrevenu, auto: true });
    if (planningFait && equipeNouvelle.length === 0) {
      return NextResponse.json({ ok: true, skipped: "already-sent" });
    }
  } else if (lastSentAt && Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
    // Manuel : 1 envoi / 24 h.
    return NextResponse.json(
      { error: "Une notification a déjà été envoyée pour cette setlist aujourd'hui." },
      { status: 429 }
    );
  }

  // 6. Destinataires : équipe (musiciens, régie, choristes) de service à cette date
  //    dans la catégorie de la setlist. Campus : départage matin/soir par moment
  //    (setlists récentes liées à la séance), sinon par président (anciennes setlists).
  const dateISO = (sl.date ?? "").slice(0, 10);
  const planning = await loadPlanningData();
  const wantLeader = normalizeName(sl.leader ?? "");
  const team = sl.isPrivate ? [] : servantsForDate(planning, dateISO).filter(
    (s) =>
      s.category === sl.category &&
      !!s.serviceRole &&
      TEAM_ROLES.includes(s.serviceRole) &&
      (sl.category !== "Campus" ||
        (sl.moment ? s.moment === sl.moment : normalizeName(s.leader) === wantLeader))
  );
  const names = [...new Set(team.map((s) => s.name))];
  const index = await loadPlanningNameIndex();
  const { uids, unresolved } = resolveNamesToUids(names, index);
  if (unresolved.length) {
    console.warn(`[notify-setlist] noms non appariés (${dateISO}):`, unresolved);
  }
  const destinataires = aPrevenir(
    { isPrivate: sl.isPrivate, editeurs: equipeChoisie },
    { planning: uids, prevenus, planningDejaPrevenu, auto: !!auto },
  );
  const prefUids = await filterUidsByNotifPref(destinataires, "setlists");

  // 7. Envoi, une fournée par langue (lot 8) : chacun lit le message dans la
  // sienne. Resté en français seul jusqu'au 19/09/2026.
  const langs = await loadNotifLangs(prefUids);
  const result = { sent: 0, failed: 0, recipients: 0 };
  for (const lang of ["fr", "zh-CN"] as const) {
    const groupe = prefUids.filter((u) => (langs.get(u) ?? "fr") === lang);
    if (!groupe.length) continue;
    const r = await sendPushToUids(groupe, {
      ...setlistReadyMessage({ title: sl.title ?? "", leader: sl.leader ?? "", songCount, category: sl.category }, lang),
      url: `/setlists/${setlistId}`,
      tag: `setlist-${setlistId}`,
    });
    result.sent += r.sent;
    result.failed += r.failed;
    result.recipients += r.recipients;
  }

  // En auto sans destinataire joignable, on ne mémorise rien : la prochaine
  // sauvegarde réessaiera et le bouton manuel reste utilisable.
  if (!auto || result.recipients > 0) {
    // `recipients` ne compte que le planning ; l'équipe choisie a sa liste d'uids prévenus.
    const planningTouche = prefUids.filter((u) => uids.includes(u)).length;
    const equipePrevenue = equipeChoisie.filter((u) => prefUids.includes(u));
    const envoyeLe = horodatageEnvoi({ auto: !!auto, planningTouche, maintenant: Date.now() });
    await logRef.set(
      {
        ...(envoyeLe !== undefined ? { lastSentAt: envoyeLe } : {}),
        setlistId,
        ...(planningTouche > 0 || lastRecipients === undefined ? { recipients: planningTouche } : {}),
        ...(equipePrevenue.length ? { partagePrevenus: FieldValue.arrayUnion(...equipePrevenue) } : {}),
      },
      { merge: true }
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
