import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { authentifier } from "@/lib/api/authentifier";
import { sendPushToUids, allSubscriberUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { uidsDuGroupe, loadNotifLangs } from "@/lib/push/recipients";
import { planningReleaseMessage } from "@/lib/push/messages";
import { isAdminEmail } from "@/lib/access";
import { NOTIFY_ALL } from "@/lib/push/audiences";
import { getPlanning, droitsDePublication, TRI_ORDER } from "@/lib/planning/releases";
import type { ProfilOrganigramme } from "@/lib/acces/organigramme";
import { lireCorpsRelease } from "@/lib/push/bornes";
import { errorResponse } from "@/lib/evenements/serveur";
import { apresEnvoi, notifierPublication } from "@/lib/push/reserver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Publication d'un trimestre de planning (Culte / groupes). Révèle l'onglet du
// trimestre côté membres (flag planningReleases/{key}_{year}.published[]) et, à
// la PREMIÈRE publication, envoie une notification push à l'audience du planning
// (Culte → tout le monde ; groupe → membres du groupe, clé de `serviceRoles` ou groupe de la
// personne, lot 2, OG28). Réservé aux admins, aux comptes dont le droit `notify` couvre ce
// planning, et à qui le publie par un rôle de son groupe (`publieParRole`, OG23, interrupteur
// ouvert seulement, OG27). Lot AO (interrupteur ouvert seulement) : plus de droit `notify`. Lot RS (interrupteur
// ouvert seulement) : le profil relu porte `responsabilites` — le gestionnaire du planning (`planning:<x>`) le publie
// (pas la Table), plus le référent Louange ni la Régie ; `droitsDePublication` lit ce champ. `publish:false` re-masque le
// trimestre (sans notification, sans re-notif à une republication).

export async function POST(req: NextRequest) {
  // 1. Authentification
  const appelant = await authentifier(req);
  if (appelant instanceof NextResponse) return appelant;
  const { uid, email } = appelant;

  // 2. Requête
  let corps: ReturnType<typeof lireCorpsRelease>;
  try {
    corps = lireCorpsRelease(await req.json().catch(() => ({})));
  } catch (e) {
    return errorResponse(e);
  }
  const { key, tri, year: yr, publish: doPublish } = corps;
  const planning = key ? getPlanning(key) : undefined;
  if (!planning) return NextResponse.json({ error: "Planning inconnu" }, { status: 400 });

  // 3. Droits de l'expéditeur
  const isAdmin = isAdminEmail(email);
  const me = isAdmin
    ? null
    : ((await adminDb().collection("users").doc(uid).get()).data() as ({ notify?: string[]; publieParRole?: string[] } & ProfilOrganigramme) | undefined) ?? null;
  if (!droitsDePublication(planning, isAdmin, me)) {
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

  // 5. Notification — uniquement à la première publication (jamais au masquage, jamais à une republication
  // après un envoi réussi, masquage compris : la première publication est retenue par une réservation notifLog
  // `release_<planning>_<année>_<trimestre>`, créée avant l'envoi). Rendue si l'envoi lève avant tout envoi (le
  // réessai notifie) ; gardée dès qu'une fournée est partie (notifierPublication, src/lib/push/reserver.ts).
  let sent = 0;
  const { notified, dejaAnnonce } = await notifierPublication(
    adminDb(),
    { planning: planning.key, annee: yr, tri, uid, publier: doPublish },
    async (parti) => {
      // Une fournée par langue (lot 8) : resté en français seul jusqu'au 19/09/2026.
      const tous = planning.notifyAudience === NOTIFY_ALL;
      const cible = tous ? await allSubscriberUids() : await uidsDuGroupe(planning.notifyAudience);
      const langs = await loadNotifLangs(cible);
      const tag = `release-${planning.key}-${yr}-${tri}`;
      // Lot U2 : l'année dans le message dès qu'elle n'est pas l'année en cours.
      const release = { label: planning.label, tri, ...(yr !== new Date().getFullYear() ? { annee: yr } : {}) };
      for (const lang of ["fr", "zh-CN"] as const) {
        const groupe = cible.filter((u) => (langs.get(u) ?? "fr") === lang);
        if (!groupe.length) continue;
        const message = planningReleaseMessage(release, lang);
        const result = await sendPushToUids(groupe, { ...message, url: "/planning", tag });
        parti();
        sent += result.sent;
        // Cloche : une entrée par fournée pour une catégorie ; « tout le monde »
        // garde son entrée unique (visible aussi de qui n'a pas d'abonnement push).
        if (!tous) await apresEnvoi(() => recordNotification({ ...message, url: "/planning", kind: "broadcast", recipients: groupe }), "planning/release");
      }
      if (tous) {
        const fr = planningReleaseMessage(release, "fr");
        await apresEnvoi(() => recordNotification({ ...fr, url: "/planning", kind: "broadcast", everyone: true }), "planning/release");
      }
    },
  );

  // `dejaAnnonce` : publication sans notification parce que le trimestre a déjà été annoncé (le suivi des
  // corrections passe par « Prévenir des changements »).
  return NextResponse.json({ ok: true, published: next, notified, sent, dejaAnnonce });
}
