import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { authentifier } from "@/lib/api/authentifier";
import { sendPushToUids, sendPushToAll } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { uidsDeLAudienceOrganigramme, uidsDesAudiences, uidsDuGroupe } from "@/lib/push/recipients";
import { isAdminEmail } from "@/lib/access";
import { NOTIFY_ALL, audiencesNotifiables, isValidAudience, peutNotifierAudience } from "@/lib/push/audiences";
import type { ProfilOrganigramme } from "@/lib/acces/organigramme";
import { lireCorpsAudience } from "@/lib/push/bornes";
import { errorResponse } from "@/lib/evenements/serveur";
import { envoyerReserve } from "@/lib/push/reserver";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Notification manuelle, soit à une AUDIENCE (tout le monde / un culte / un groupe /
// une classe EDD), soit à des PERSONNES précises (liste d'uids). Réservée aux admins
// et aux comptes dont `notify` couvre la cible — ou `notifieParRole`, recopié depuis les
// organigrammes des groupes (lot 2, OG24), interrupteur ouvert seulement (OG27). Sert aux annonces de changement de
// planning et de planning du trimestre.
// Lot AO (interrupteur ouvert seulement) : le droit vient de l'organigramme (`audiencesNotifiables`), et deux
// audiences s'ajoutent — `equipe:<id>` (comptes dont `dansEquipes` contient l'id) et `louange:<sous-équipe>`
// (`sousEquipes`), résolues dans recipients.ts. En ligne (interrupteur coupé), `isValidAudience` les refuse : rien ne change.
// Lot RS (interrupteur ouvert seulement) : le droit vient de `responsabilites` (relu avec le profil) — `orga` notifie
// « Tous », un gestionnaire de planning l'audience de son service ; `notifieParRole` et la notification libre d'un
// référent à son équipe ne comptent plus (`audiencesNotifiables`).

export async function POST(req: NextRequest) {
  // 1. Authentification
  const appelant = await authentifier(req);
  if (appelant instanceof NextResponse) return appelant;
  const { uid, email } = appelant;

  // 2. Requête
  let corps: ReturnType<typeof lireCorpsAudience>;
  try {
    corps = lireCorpsAudience(await req.json().catch(() => ({})));
  } catch (e) {
    return errorResponse(e);
  }
  const { audience, uids: targetUids, title, body } = corps;
  const payload = {
    title,
    body,
    url: corps.url,
    tag: `manual-${Date.now()}`,
  };

  // Anti-doublon : rejette un envoi identique (même expéditeur + titre + message)
  // répété dans la minute — évite double-clics et boucles. La clé est réservée AVANT
  // l'envoi (create) et rendue si l'envoi échoue ; passé la minute, elle est reprise.
  const db = adminDb();
  const dupKey = createHash("sha1")
    .update(`${uid}:${title}:${body}`)
    .digest("hex")
    .slice(0, 24);
  const cle = `audience-${dupKey}`;
  /** Réserve la clé, envoie, puis écrit la cloche : la clé n'est rendue que si l'envoi lui-même échoue. */
  const envoyer = <T>(envoi: () => Promise<T>, apres: (valeur: T) => Promise<unknown>) =>
    envoyerReserve(db, cle, { at: Date.now(), uid }, { delaiMs: 60_000 }, envoi, apres);
  const dejaEnvoye = () =>
    NextResponse.json(
      { error: "Notification identique déjà envoyée il y a moins d'une minute." },
      { status: 429 }
    );

  // 3. Droits de l'expéditeur
  const isAdmin = isAdminEmail(email);
  const me = isAdmin
    ? null
    : ((await adminDb().collection("users").doc(uid).get()).data() as ({ notify?: string[]; notifieParRole?: string[] } & ProfilOrganigramme) | undefined) ?? null;
  const rights = audiencesNotifiables(me);
  const canAll = isAdmin || rights.includes(NOTIFY_ALL);

  // 4a. Mode « personnes précises »
  if (Array.isArray(targetUids) && targetUids.length > 0) {
    const wanted = [...new Set(targetUids.filter((u) => typeof u === "string"))];
    if (!canAll) {
      // L'expéditeur ne peut cibler que des personnes de ses catégories autorisées.
      const allowed = await uidsDesAudiences(rights.filter((r) => r !== NOTIFY_ALL));
      if (wanted.some((u) => !allowed.has(u))) {
        return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
      }
    }
    const envoi = await envoyer(() => sendPushToUids(wanted, payload), () => recordNotification({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      kind: "manual",
      recipients: wanted,
    }));
    if (!envoi.pris) return dejaEnvoye();
    return NextResponse.json({ ok: true, ...envoi.valeur });
  }

  // 4b. Mode « audience »
  if (!audience || !isValidAudience(audience)) {
    return NextResponse.json({ error: "Audience invalide" }, { status: 400 });
  }
  if (!peutNotifierAudience(audience, isAdmin, me)) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }
  const isAll = audience === NOTIFY_ALL;
  const catUids = isAll ? [] : audience.startsWith("equipe:") || audience.startsWith("louange:")
    ? await uidsDeLAudienceOrganigramme(audience)
    : await uidsDuGroupe(audience);
  const envoi = await envoyer(async () => (isAll ? await sendPushToAll(payload) : await sendPushToUids(catUids, payload)), () => recordNotification({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    kind: "manual",
    ...(isAll ? { everyone: true } : { recipients: catUids }),
  }));
  if (!envoi.pris) return dejaEnvoye();
  return NextResponse.json({ ok: true, ...envoi.valeur });
}
