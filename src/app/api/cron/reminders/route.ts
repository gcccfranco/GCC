import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadPlanningNameIndex, filterUidsByNotifPref, loadNotifLangs, uidsForCategories } from "@/lib/push/recipients";
import { reminderBody, reminderServicesFor, reminderTitle, type ReminderService } from "@/lib/push/reminderMessage";
import { quiCategories, sceneReminder } from "@/lib/scene/rappels";
import { evenementReminder } from "@/lib/evenements/rappel";
import type { Evenement } from "@/types/evenement";
import { corpsAvecTaches, rappelsDuJour, rappelTachesTitre, type RappelTache } from "@/lib/taches/messages";
import { poleDuPour, polesDe } from "@/lib/access";
import { membresDuPole } from "@/lib/taches/serveur";
import type { Fois, Tache, TachePole } from "@/types/tache";
import type { Creneau } from "@/types/programme";
import {
  loadPlanningData,
  servantsForDate,
  rehearsalsForDate,
  normalizeName,
} from "@/lib/planning/names";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rappels — exécuté chaque jour par Vercel Cron (cf. vercel.json).
// À J-7, J-3 puis J-1, UNE notification par personne qui liste ses services du
// jour avec le rôle (docs/spec-planning-petits-lots.md, lot 1c) : services de
// tous les plannings sauf les séances Campus, plus la répétition Campus (heure
// et lieu) et les entraînements sur scène des programmes affichés (lot 3 bis :
// auteur + membres du « qui ») fondus dans le même message. Langue : notifPrefs/{uid}.lang.
// Idempotent : un document notifLog par (échéance, date, uid) évite tout doublon.

const REMINDERS: { tag: "J7" | "J3" | "J1"; days: number }[] = [
  { tag: "J7", days: 7 },
  { tag: "J3", days: 3 },
  { tag: "J1", days: 1 },
];

// Date ISO à J+`days`. Calculée en UTC : sûr car le cron tourne à 08:00 UTC
// (≥ 09:00 à Paris), heure à laquelle la date UTC est déjà la date du jour à Paris.
function isoInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Retient les uid pas encore notifiés pour cette clé notifLog `${prefix}-${uid}`. */
async function freshUids(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefix: string
): Promise<string[]> {
  const fresh: string[] = [];
  await Promise.all(
    uids.map(async (u) => {
      if (!(await db.collection("notifLog").doc(`${prefix}-${u}`).get()).exists) fresh.push(u);
    })
  );
  return fresh;
}

/** Marque ces uid comme notifiés (clé `${prefix}-${uid}`). */
async function markNotified(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefix: string,
  meta: Record<string, unknown>
): Promise<void> {
  const batch = db.batch();
  for (const u of uids) {
    batch.set(db.collection("notifLog").doc(`${prefix}-${u}`), { ...meta, uid: u, at: Date.now() });
  }
  await batch.commit();
}

/** Créneaux sur scène des programmes affichés, pour ces dates (ISO). */
async function sceneCreneaux(db: FirebaseFirestore.Firestore, dates: string[]): Promise<Creneau[]> {
  const programmes = await db.collection("programmes").where("visible", "==", true).get();
  const out: Creneau[] = [];
  for (const p of programmes.docs) {
    const snap = await p.ref.collection("creneaux").where("dimanche", "in", dates).get();
    for (const c of snap.docs) out.push({ id: c.id, ...c.data() } as Creneau);
  }
  return out;
}

/** Rappels de tâches du jour (lot 7, docs/spec-taches.md) : J-3, J-1 et le
 *  lendemain d'une échéance non cochée, au responsable ou à tout le pôle,
 *  préférence « Tâches », une fois par (rappel, destinataire). Renvoie, pour
 *  chaque destinataire, ses rappels et les clés notifLog à marquer. */
async function rappelsTaches(
  db: FirebaseFirestore.Firestore,
  today: string,
): Promise<Map<string, { rappels: RappelTache[]; keys: string[] }>> {
  const snap = await db.collectionGroup("taches").get();
  const items = await Promise.all(
    snap.docs.map(async (doc) => {
      const pole = doc.ref.parent.parent?.id as TachePole;
      const tache = { ...(doc.data() as Omit<Tache, "id">), id: doc.id, pole };
      const fois = (await doc.ref.collection("fois").get()).docs.map((f) => ({ ...(f.data() as Fois), date: f.id }));
      return { tache, fois };
    }),
  );
  const rappels = rappelsDuJour(items, today);
  const out = new Map<string, { rappels: RappelTache[]; keys: string[] }>();
  if (!rappels.length) return out;

  const users = await db.collection("users").get();
  const membres = (pole: TachePole) => users.docs.filter((d) => (polesDe(d.data()) as string[]).includes(pole)).map((d) => d.id);
  for (const r of rappels) {
    const key = `rappel-tache-${r.quand}-${r.tache.pole}-${r.tache.id}-${r.date}`;
    const cibles = r.tache.responsableUid ? [r.tache.responsableUid] : membres(r.tache.pole);
    for (const u of await freshUids(db, await filterUidsByNotifPref(cibles, "taches"), key)) {
      const entry = out.get(u) ?? { rappels: [], keys: [] };
      entry.rappels.push(r);
      entry.keys.push(key);
      out.set(u, entry);
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = adminDb();
  const [planning, index] = await Promise.all([loadPlanningData(), loadPlanningNameIndex()]);
  const creneaux = await sceneCreneaux(db, REMINDERS.map((r) => isoInDays(r.days)));
  // Rappels de tâches : ajoutés à la première notification de service de la
  // personne aujourd'hui, sinon envoyés seuls après la boucle.
  const taches = await rappelsTaches(db, isoInDays(0));
  const marquerTaches = async (u: string) => {
    const entry = taches.get(u);
    if (!entry) return;
    taches.delete(u);
    for (const key of entry.keys) await markNotified(db, [u], key, { kind: "tache" });
  };

  const summary: Record<string, { date: string; sent: number }> = {};

  for (const { tag, days } of REMINDERS) {
    const date = isoInDays(days);

    // Personnes de service ce jour-là (Campus exclu : pendant la semaine du
    // campus on sert tous les jours, le rappel serait du bruit) ou en
    // répétition Campus. Chaque compte reçoit un message avec SES services.
    const names = [
      ...new Set([
        ...servantsForDate(planning, date).filter((s) => s.category !== "Campus").map((s) => s.name),
        ...rehearsalsForDate(planning, date).map((r) => r.name),
      ]),
    ];
    const byUid = new Map<string, ReminderService[]>();
    for (const name of names) {
      const services = reminderServicesFor(planning, name, date);
      if (!services.length) continue;
      for (const u of index.get(normalizeName(name)) ?? []) if (!byUid.has(u)) byUid.set(u, services);
    }
    // Entraînements sur scène ce jour-là : l'auteur et les membres ayant un
    // rôle dans le « qui » (quand il correspond à une catégorie de l'app).
    for (const c of creneaux.filter((x) => x.dimanche === date)) {
      const entry = sceneReminder(c);
      const uids = new Set([c.auteurUid, ...(await uidsForCategories(quiCategories(c.qui)))]);
      for (const u of uids) {
        if (!u) continue;
        const mine = byUid.get(u);
        if (mine) mine.push(entry); else byUid.set(u, [entry]);
      }
    }

    const prefix = `rappel-${tag}-${date}`;
    const prefUids = await filterUidsByNotifPref([...byUid.keys()], "reminders");
    const fresh = await freshUids(db, prefUids, prefix);
    if (fresh.length) {
      const langs = await loadNotifLangs(fresh);
      await Promise.all(
        fresh.map(async (u) => {
          const lang = langs.get(u) ?? "fr";
          const payload = {
            title: reminderTitle(lang),
            body: corpsAvecTaches(reminderBody(date, tag, byUid.get(u)!, lang), taches.get(u)?.rappels ?? [], lang),
            url: "/mes-services",
            tag: prefix,
          };
          await marquerTaches(u);
          await sendPushToUids([u], payload);
          // Une entrée de cloche par destinataire : le corps est personnel.
          await recordNotification({ ...payload, kind: "reminder", recipients: [u] });
        })
      );
      await markNotified(db, fresh, prefix, { tag, date, kind: "service" });
    }

    summary[tag] = { date, sent: fresh.length };
  }

  // Tâches des personnes sans notification de service aujourd'hui.
  const tachesSeules = [...taches.keys()];
  if (tachesSeules.length) {
    const langs = await loadNotifLangs(tachesSeules);
    for (const u of tachesSeules) {
      const lang = langs.get(u) ?? "fr";
      const payload = {
        title: rappelTachesTitre(lang),
        body: corpsAvecTaches("", taches.get(u)!.rappels, lang),
        url: "/taches",
        tag: `rappel-taches-${isoInDays(0)}`,
      };
      await marquerTaches(u);
      await sendPushToUids([u], payload);
      await recordNotification({ ...payload, kind: "tache", recipients: [u] });
    }
  }

  // Évènements de demain (lot 6) : un rappel à chaque inscrit ayant un compte,
  // préférence « Évènements », une fois par (évènement, uid).
  const demain = isoInDays(1);
  let evenementsSent = 0;
  const evs = await db.collection("evenements").where("date", "==", demain).get();
  for (const doc of evs.docs) {
    const e = { id: doc.id, ...doc.data() } as Evenement;
    // Réunion de pôle (lot 7) : pas d'inscriptions, tout le pôle est rappelé.
    const pole = poleDuPour(e.pour);
    const inscrits = pole
      ? await membresDuPole(pole)
      : (await doc.ref.collection("inscriptions").get()).docs
          .map((i) => i.data().uid as string | null)
          .filter((u): u is string => !!u);
    const prefix = `rappel-evenement-${e.id}`;
    const fresh = await freshUids(db, await filterUidsByNotifPref(inscrits, "evenements"), prefix);
    if (!fresh.length) continue;
    const langs = await loadNotifLangs(fresh);
    await Promise.all(
      fresh.map(async (u) => {
        const payload = { ...evenementReminder(e, langs.get(u) ?? "fr"), url: `/evenements/${e.id}`, tag: prefix };
        await sendPushToUids([u], payload);
        await recordNotification({ ...payload, kind: "evenement", recipients: [u] });
      })
    );
    await markNotified(db, fresh, prefix, { date: demain, kind: "evenement", evenementId: e.id });
    evenementsSent += fresh.length;
  }

  return NextResponse.json({ ok: true, summary, taches: tachesSeules.length, evenements: { date: demain, sent: evenementsSent } });
}
