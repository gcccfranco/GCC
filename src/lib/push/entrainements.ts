// Notifications d'entraînement de la semaine du campus (27 → 31 juillet 2026).
// Deux règles distinctes, d'où deux appels depuis deux crons différents :
//  - séance du SOIR   → notif le jour même (cron 08:00 UTC), entraînement à 16h ;
//  - séance du MATIN  → notif la veille au soir (cron 17:00 UTC), entraînement à 21h.
// Le plan Vercel Hobby n'autorise que 2 crons : le volet « soir » est donc greffé
// sur le cron de rappels existant plutôt que d'en consommer un troisième.
// Serveur uniquement.

import { adminDb } from "./admin";
import { sendPushToUids } from "./send";
import { recordNotification } from "./notifications";
import { loadPlanningNameIndex, resolveNamesToUids, filterUidsByNotifPref } from "./recipients";
import { loadPlanningData, servantsForDate } from "@/lib/planning/names";

/** Lieu des entraînements quotidiens — absent du Google Sheet, fixé ici. */
const LIEU = "Grande Salle";

/** Bornes de la semaine du campus (dates des séances de louange, incluses).
 *  Hors de cette fenêtre le module ne fait rien : les horaires 16h/21h et le
 *  lieu ne valent que pour le campus. */
const DEBUT = "2026-07-27";
const FIN = "2026-07-31";

export type Moment = "matin" | "soir";

/** Date ISO à Paris, décalée de `offsetDays` jours. */
function parisISO(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
}

/** Envoie la notif d'entraînement pour les séances `moment`.
 *  Idempotent : un document notifLog par (moment, date, uid) évite tout doublon. */
export async function notifyEntrainement(
  moment: Moment
): Promise<{ date: string; sent: number; unresolved: string[] }> {
  // « soir » : la séance est aujourd'hui. « matin » : elle est demain (notif la veille).
  const date = parisISO(moment === "soir" ? 0 : 1);
  if (date < DEBUT || date > FIN) return { date, sent: 0, unresolved: [] };

  const [planning, index] = await Promise.all([loadPlanningData(), loadPlanningNameIndex()]);
  const group = servantsForDate(planning, date).filter(
    (s) => s.category === "Campus" && s.moment === moment
  );
  if (!group.length) return { date, sent: 0, unresolved: [] };

  const names = [...new Set(group.map((s) => s.name))];
  const { uids, unresolved } = resolveNamesToUids(names, index);
  const prefUids = await filterUidsByNotifPref(uids, "reminders");

  const db = adminDb();
  const prefix = `entrainement-${moment}-${date}`;
  const fresh: string[] = [];
  await Promise.all(
    prefUids.map(async (u) => {
      if (!(await db.collection("notifLog").doc(`${prefix}-${u}`).get()).exists) fresh.push(u);
    })
  );
  if (!fresh.length) return { date, sent: 0, unresolved };

  const leader = group[0]?.leader ?? "";
  // Beaucoup de noms de planning finissent par une initiale (« Mengyao C. ») :
  // on n'ajoute pas de point final derrière, sinon « avec Mengyao C.. ».
  const fin = leader ? `, avec ${leader}${leader.endsWith(".") ? "" : "."}` : ".";
  const body =
    moment === "soir"
      ? `Entraînement à 16h (${LIEU}) pour la louange de ce soir${fin}`
      : `Entraînement ce soir à 21h (${LIEU}) pour la louange de demain matin${fin}`;
  const payload = { title: "Entraînement Campus", body, url: "/planning/campus", tag: prefix };

  await sendPushToUids(fresh, payload);
  await recordNotification({ ...payload, kind: "reminder", recipients: fresh });

  const batch = db.batch();
  for (const u of fresh) {
    batch.set(db.collection("notifLog").doc(`${prefix}-${u}`), {
      uid: u,
      date,
      moment,
      kind: "entrainement",
      at: Date.now(),
    });
  }
  await batch.commit();

  return { date, sent: fresh.length, unresolved };
}
