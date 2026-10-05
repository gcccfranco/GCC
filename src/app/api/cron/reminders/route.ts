import { NextResponse, type NextRequest } from "next/server";
import { BACK_OFFICE } from "@/lib/backOffice";
import { adminDb } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadPlanningNameIndex, filterUidsByNotifPref, loadNotifLangs, uidsForCategories } from "@/lib/push/recipients";
import { reminderServicesFor, type ReminderService } from "@/lib/push/reminderMessage";
import { quiCategories, sceneReminder } from "@/lib/scene/rappels";
import { ouvertureDuJour } from "@/lib/evenements/rappel";
import { destinatairesEvenement } from "@/lib/evenements/serveur";
import type { Evenement } from "@/types/evenement";
import type { Sujet } from "@/types/reunion";
import { rappelsDuJour, type RappelTache } from "@/lib/taches/messages";
import { nombreSujetsAAborder, notificationsDuMatin, type LigneEvenement, type ServiceDuJour } from "@/lib/reunions/rappels";
import { poleDuPour, polesDe } from "@/lib/access";
import { membresDuPole } from "@/lib/taches/serveur";
import type { Fois, Tache, TachePole } from "@/types/tache";
import type { Creneau, Programme } from "@/types/programme";
import { currentProgramme } from "@/lib/scene/dimanches";
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

/** Créneaux sur scène du programme affiché aujourd'hui, pour ces dates (ISO).
 *  Lot 12 : le programme n'est plus celui qui porte `visible` mais celui que
 *  `currentProgramme` désigne — la même règle que la page et que l'onglet, sans
 *  quoi un programme choisi automatiquement n'enverrait aucun rappel. */
async function sceneCreneaux(db: FirebaseFirestore.Firestore, dates: string[], today: string): Promise<Creneau[]> {
  // Trié par jour J croissant, comme `listProgrammes` : `currentProgramme` s'y fie.
  const snap = await db.collection("programmes").orderBy("jourJ").get();
  const programmes = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Programme, "id">) }));
  const current = currentProgramme(programmes, today);
  if (!current) return [];
  const creneaux = await db.collection("programmes").doc(current.id).collection("creneaux")
    .where("dimanche", "in", dates).get();
  return creneaux.docs.map((c) => ({ id: c.id, ...c.data() } as Creneau));
}

/** Rappels de tâches du jour (lot 7, docs/spec-taches.md) : J-3, J-1 et le
 *  lendemain d'une échéance sans document, plus les fois « en cours » et en
 *  retard (lot 13, chaque matin), au responsable ou à tout le pôle,
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
      // `etat` et `debutLe` manquent aux documents d'avant le lot 13 : terminés.
      const fois = (await doc.ref.collection("fois").get()).docs.map((f) => {
        const d = f.data() as Partial<Fois>;
        return { parUid: "", parNom: "", le: "", ...d, date: f.id, etat: d.etat ?? "terminee", debutLe: d.debutLe ?? "" };
      });
      return { tache, fois };
    }),
  );
  const rappels = rappelsDuJour(items, today);
  const out = new Map<string, { rappels: RappelTache[]; keys: string[] }>();
  if (!rappels.length) return out;

  const users = await db.collection("users").get();
  const membres = (pole: TachePole) => users.docs.filter((d) => (polesDe(d.data()) as string[]).includes(pole)).map((d) => d.id);
  for (const r of rappels) {
    // « en cours » revient chaque matin : le jour d'envoi entre dans la clé,
    // sinon la ligne ne sortirait qu'une seule fois (lot 13).
    const key = r.quand === "encours"
      ? `rappel-tache-encours-${r.tache.pole}-${r.tache.id}-${r.date}-${today}`
      : `rappel-tache-${r.quand}-${r.tache.pole}-${r.tache.id}-${r.date}`;
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

/** Lignes d'évènements du matin (préférence « Évènements »), par membre pas
 *  encore prévenu : la veille d'un évènement (lot 6 ; réunion de pôle : tout le
 *  pôle, avec le nombre de sujets à aborder, R3), le compte rendu d'une réunion
 *  collé depuis hier (R3 : les autres personnes de la réunion), les inscriptions
 *  qui s'ouvrent aujourd'hui (docs/spec-inscriptions-periode.md). */
async function lignesEvenements(
  db: FirebaseFirestore.Firestore,
  today: string
): Promise<Map<string, { lignes: LigneEvenement[]; keys: string[] }>> {
  const out = new Map<string, { lignes: LigneEvenement[]; keys: string[] }>();
  const ajouter = async (uids: string[], ligne: LigneEvenement, key: string) => {
    for (const u of await freshUids(db, await filterUidsByNotifPref(uids, "evenements"), key)) {
      const entry = out.get(u) ?? { lignes: [], keys: [] };
      entry.lignes.push(ligne);
      entry.keys.push(key);
      out.set(u, entry);
    }
  };

  // Évènements de demain. La clé reste celle du lot 6 : pas de doublon le jour du déploiement.
  for (const doc of (await db.collection("evenements").where("date", "==", isoInDays(1)).get()).docs) {
    const e = { id: doc.id, ...doc.data() } as Evenement;
    const pole = poleDuPour(e.pour);
    if (pole) {
      const sujets = (await doc.ref.collection("sujets").get()).docs.map((s) => s.data() as Sujet);
      await ajouter(await membresDuPole(pole), { kind: "veille", evenement: e, sujets: nombreSujetsAAborder(sujets) }, `rappel-evenement-${e.id}`);
    } else {
      const inscrits = (await doc.ref.collection("inscriptions").get()).docs
        .map((i) => i.data().uid as string | null)
        .filter((u): u is string => !!u);
      await ajouter(inscrits, { kind: "veille", evenement: e }, `rappel-evenement-${e.id}`);
    }
  }

  // Comptes rendus collés depuis hier (« le » est un ISO : la comparaison de
  // texte suit le temps). Un lien remplacé change « le » : il est annoncé à nouveau.
  for (const doc of (await db.collection("evenements").where("compteRendu.le", ">=", isoInDays(-1)).get()).docs) {
    const e = { id: doc.id, ...doc.data() } as Evenement;
    const cr = e.compteRendu;
    if (!cr) continue;
    const uids = (await destinatairesEvenement(db, e)).filter((u) => u !== cr.parUid);
    await ajouter(uids, { kind: "compteRendu", evenement: e }, `compte-rendu-${e.id}-${cr.le}`);
  }

  // « AAAA-MM-JJ » et « AAAA-MM-JJTHH:MM » du jour sont entre `today` et `today~`.
  const ouvertures = await db.collection("evenements").where("inscriptionDebut", ">=", today).where("inscriptionDebut", "<", `${today}~`).get();
  for (const doc of ouvertures.docs) {
    const e = { id: doc.id, ...doc.data() } as Evenement;
    if (!ouvertureDuJour(e, today)) continue;
    const uids = (await destinatairesEvenement(db, e)).filter((u) => u !== e.organisateurUid);
    await ajouter(uids, { kind: "ouverture", evenement: e }, `ouverture-inscriptions-${e.id}`);
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
  const today = isoInDays(0);
  const [planning, index] = await Promise.all([loadPlanningData(), loadPlanningNameIndex()]);
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : le rappel du matin ne
  // parle que des services — ni scène, ni tâches, ni évènements.
  const creneaux = BACK_OFFICE ? await sceneCreneaux(db, REMINDERS.map((r) => isoInDays(r.days)), today) : [];
  const taches: Awaited<ReturnType<typeof rappelsTaches>> = BACK_OFFICE ? await rappelsTaches(db, today) : new Map();
  const lignes: Awaited<ReturnType<typeof lignesEvenements>> = BACK_OFFICE ? await lignesEvenements(db, today) : new Map();

  // Services de chacun, échéance par échéance (pas encore prévenus).
  const servicesDe = new Map<string, ServiceDuJour[]>();
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

    const prefUids = await filterUidsByNotifPref([...byUid.keys()], "reminders");
    const fresh = await freshUids(db, prefUids, `rappel-${tag}-${date}`);
    for (const u of fresh) servicesDe.set(u, [...(servicesDe.get(u) ?? []), { tag, date, services: byUid.get(u)! }]);
    summary[tag] = { date, sent: fresh.length };
  }

  // Un seul passage par personne : services, tâches et lignes d'évènements dans
  // le même message (notificationsDuMatin), puis tout est marqué comme envoyé.
  const uids = [...new Set([...servicesDe.keys(), ...taches.keys(), ...lignes.keys()])];
  const langs = await loadNotifLangs(uids);
  await Promise.all(
    uids.map(async (u) => {
      const mesServices = servicesDe.get(u) ?? [];
      const notifications = notificationsDuMatin(
        { services: mesServices, taches: taches.get(u)?.rappels ?? [], lignes: lignes.get(u)?.lignes ?? [] },
        langs.get(u) ?? "fr",
        today,
      );
      for (const { kind, ...payload } of notifications) {
        await sendPushToUids([u], payload);
        // Une entrée de cloche par destinataire : le corps est personnel.
        await recordNotification({ ...payload, kind, recipients: [u] });
      }
      for (const s of mesServices) await markNotified(db, [u], `rappel-${s.tag}-${s.date}`, { tag: s.tag, date: s.date, kind: "service" });
      for (const key of taches.get(u)?.keys ?? []) await markNotified(db, [u], key, { kind: "tache" });
      for (const key of lignes.get(u)?.keys ?? []) await markNotified(db, [u], key, { kind: "evenement" });
    })
  );

  return NextResponse.json({ ok: true, summary, personnes: uids.length });
}
