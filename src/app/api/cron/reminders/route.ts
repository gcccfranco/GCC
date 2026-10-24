import { NextResponse, type NextRequest } from "next/server";
import { BACK_OFFICE } from "@/lib/backOffice";
import { adminDb } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { apresEnvoi, suivreReservations } from "@/lib/push/reserver";
import { loadPlanningNameIndex, filterUidsByNotifPref, loadNotifLangs, uidsForCategories } from "@/lib/push/recipients";
import { ajouterAuxRappels, reminderServicesFor, type ReminderService } from "@/lib/push/reminderMessage";
import { quiCategories, sceneReminder } from "@/lib/scene/rappels";
import { avecLignes, ouvertureDuJour } from "@/lib/evenements/rappel";
import { destinatairesEvenement } from "@/lib/evenements/serveur";
import { cleDeplacement, cleVeille, deplacementsAPrevenir, destinatairesDeplacement } from "@/lib/calendrier/prevenir";
import type { Evenement } from "@/types/evenement";
import type { Sujet } from "@/types/reunion";
import { cleRappelTache, rappelsDuJour, type RappelTache } from "@/lib/taches/messages";
import { ciblesDuRappel, equipeDuChemin } from "@/lib/taches/serveur";
import { nombreSujetsAAborder, notificationsDuMatin, type LigneEvenement, type ServiceDuJour } from "@/lib/reunions/rappels";
import { estReunion } from "@/lib/access";
import type { Fois, Tache } from "@/types/tache";
import type { Creneau, Programme } from "@/types/programme";
import { editionsAffichees } from "@/lib/scene/fetes";
import { limiteDePurge } from "@/lib/setlists/corbeille";
import { ajouterPetitDejAuxRappels, lirePetitDej } from "@/lib/petitdej/lignes";
import { lignesMercredi, petitDejTitre, prochainDimanche } from "@/lib/petitdej/rappel";
import type { LignePetitDej } from "@/types/petitDej";
import { lignesSansEquipe, sansEquipeParReferent, titreSansEquipe, URL_ORGANIGRAMME, type EquipeRappel } from "@/lib/acces/rappelSansEquipe";
import {
  loadPlanningData,
  servantsForDate,
  rehearsalsForDate,
  normalizeName,
} from "@/lib/planning/names";
import { lecturesSheet, reinitialiserLecturesSheet } from "@/lib/planning/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rappels — exécuté chaque jour par Vercel Cron (cf. vercel.json).
// À J-7, J-3 puis J-1, UNE notification par personne qui liste ses services du
// jour avec le rôle (docs/spec-planning-petits-lots.md, lot 1c) : services de
// tous les plannings sauf les séances Campus, plus la répétition Campus (heure
// et lieu) et les entraînements sur scène des programmes affichés (lot 3 bis :
// auteur + membres du « qui ») fondus dans le même message. Langue : notifPrefs/{uid}.lang.
// Le mercredi, si le dimanche qui vient n'a personne pour le petit déj (lot U3,
// PD4) : une ligne de plus pour chaque compte, dans sa première notification du
// jour, seule sinon.
// Le lundi (lot AO, AO-E), même principe, au référent Louange, Régie ou EDD : « N personnes au
// planning de ce mois ne sont dans aucune équipe » (derrière l'interrupteur du back-office).
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

/** Le suivi des réservations du passage (voir `suivreReservations`) : chaque clé `${prefix}-${uid}` du journal
 *  notifLog est RÉSERVÉE (create) en même temps qu'elle est lue, avant l'envoi. Vercel peut livrer un même passage
 *  deux fois : le second ne retrouve aucun compte à prévenir. Un envoi qui lève rend les réservations des comptes
 *  concernés. Les documents gardent les champs et les clés d'avant (`meta`, `uid`, `at`). */
type Reservations = ReturnType<typeof suivreReservations>

/** Créneaux sur scène des éditions affichées aujourd'hui (Pâques et Noël, Q10 de
 *  docs/spec-scene-paques-noel.md), pour ces dates (ISO) : la même règle que l'onglet, le
 *  calendrier et le widget ; un brouillon n'envoie aucun rappel. */
async function sceneCreneaux(db: FirebaseFirestore.Firestore, dates: string[], today: string): Promise<Creneau[]> {
  // Trié par jour J croissant, comme `listProgrammes` (deux documents pour une édition : le premier lu).
  const snap = await db.collection("programmes").orderBy("jourJ").get();
  const programmes = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Programme, "id">) }));
  const parEdition = await Promise.all(editionsAffichees(programmes, today).map(async ({ programme }) => {
    const creneaux = await db.collection("programmes").doc(programme!.id).collection("creneaux")
      .where("dimanche", "in", dates).get();
    return creneaux.docs.map((c) => ({ id: c.id, ...c.data() } as Creneau));
  }));
  return parEdition.flat();
}

/** Rappels de tâches du jour (lot 7, docs/spec-taches.md) : J-3, J-1 et le
 *  lendemain d'une échéance sans document, plus les fois « en cours » et en
 *  retard (lot 13, chaque matin), au responsable ou, sans responsable, aux
 *  référents de l'équipe (EQ12, décision 41), préférence « Tâches », une fois
 *  par (rappel, destinataire). Seules les tâches rangées sous
 *  equipes/{e}/taches comptent : une tâche restée à l'ancien chemin (migration
 *  pas lancée) n'est pas rappelée. Renvoie, pour chaque destinataire, ses rappels
 *  et les clés notifLog à marquer. */
async function rappelsTaches(
  db: FirebaseFirestore.Firestore,
  reservations: Reservations,
  today: string,
): Promise<Map<string, { rappels: RappelTache[]; keys: string[] }>> {
  const snap = await db.collectionGroup("taches").get();
  const items = await Promise.all(
    snap.docs.flatMap((doc) => {
      const equipe = equipeDuChemin(doc.ref.path);
      return equipe ? [{ doc, equipe }] : [];
    }).map(async ({ doc, equipe }) => {
      const tache = { ...(doc.data() as Omit<Tache, "id" | "equipe">), id: doc.id, equipe };
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

  for (const r of rappels) {
    const key = cleRappelTache(r, today);
    const cibles = await ciblesDuRappel(r.tache, db);
    for (const u of await reservations.reserver(await filterUidsByNotifPref(cibles, "taches"), key, { kind: "tache" })) {
      const entry = out.get(u) ?? { rappels: [], keys: [] };
      entry.rappels.push(r);
      entry.keys.push(key);
      out.set(u, entry);
    }
  }
  return out;
}

/** Lignes d'évènements du matin (préférence « Évènements »), par membre pas
 *  encore prévenu : la veille d'un évènement (lot 6 ; réunion
 *  d'équipe : toute l'équipe, avec le nombre de sujets à aborder, R3, R4), le compte rendu d'une réunion
 *  collé depuis hier (R3 : les autres personnes de la réunion), les inscriptions
 *  qui s'ouvrent aujourd'hui (docs/spec-inscriptions-periode.md), les évènements
 *  déplacés depuis le calendrier, case « Prévenir » cochée (lot U8, C7). */
async function lignesEvenements(
  db: FirebaseFirestore.Firestore,
  reservations: Reservations,
  today: string
): Promise<Map<string, { lignes: LigneEvenement[]; keys: string[] }>> {
  const out = new Map<string, { lignes: LigneEvenement[]; keys: string[] }>();
  const ajouter = async (uids: string[], ligne: LigneEvenement, key: string) => {
    for (const u of await reservations.reserver(await filterUidsByNotifPref(uids, "evenements"), key, { kind: "evenement" })) {
      const entry = out.get(u) ?? { lignes: [], keys: [] };
      entry.lignes.push(ligne);
      entry.keys.push(key);
      out.set(u, entry);
    }
  };

  /** Inscrits avec compte d'un évènement (pas d'une réunion). */
  const inscritsDe = async (ref: FirebaseFirestore.DocumentReference) =>
    (await ref.collection("inscriptions").get()).docs
      .map((i) => i.data().uid as string | null)
      .filter((u): u is string => !!u);

  // Évènements de demain. Clé datée (lot U8, Q8) : un évènement déplacé a son rappel
  // la veille de sa nouvelle date, même si celle de l'ancienne est déjà partie.
  for (const doc of (await db.collection("evenements").where("date", "==", isoInDays(1)).get()).docs) {
    const e = { id: doc.id, ...doc.data() } as Evenement;
    if (estReunion(e)) {
      const sujets = (await doc.ref.collection("sujets").get()).docs.map((s) => s.data() as Sujet);
      await ajouter(await destinatairesEvenement(db, e), { kind: "veille", evenement: e, sujets: nombreSujetsAAborder(sujets) }, cleVeille(e));
    } else {
      await ajouter(await inscritsDe(doc.ref), { kind: "veille", evenement: e }, cleVeille(e));
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

  // Déplacés depuis le calendrier hier ou avant-hier (`deplacement.le` est un ISO) :
  // les inscrits, ou les membres d'une réunion, sauf l'auteur du geste (lot U8, Q7).
  const deplaces = (await db.collection("evenements").where("deplacement.le", ">=", isoInDays(-2)).get()).docs;
  const parId = new Map(deplaces.map((d) => [d.id, d.ref]));
  for (const e of deplacementsAPrevenir(deplaces.map((d) => ({ id: d.id, ...d.data() }) as Evenement), today)) {
    const candidats = estReunion(e) ? await destinatairesEvenement(db, e) : await inscritsDe(parId.get(e.id)!);
    await ajouter(destinatairesDeplacement(e, candidats), { kind: "deplacement", evenement: e }, cleDeplacement(e));
  }
  return out;
}

/** Le mercredi d'un dimanche libre (PD4, T5) : tous les comptes, préférence
 *  « Petit déj », pas encore prévenus pour ce dimanche. Personne un autre jour,
 *  ni si le dimanche a une ligne, ni si la lecture des inscriptions a échoué
 *  (`lignes` à `null`, Q10). */
async function petitDejDuMercredi(
  db: FirebaseFirestore.Firestore,
  reservations: Reservations,
  today: string,
  lignes: LignePetitDej[] | null,
): Promise<{ cle: string; uids: Set<string> }> {
  const cle = `petit-dej-libre-${prochainDimanche(today)}`;
  if (!lignesMercredi(today, lignes, "fr").length) return { cle, uids: new Set() };
  const comptes = (await db.collection("users").get()).docs.map((d) => d.id);
  return { cle, uids: new Set(await reservations.reserver(await filterUidsByNotifPref(comptes, "petitDej"), cle, { kind: "petitDej" })) };
}

/** Le lundi (AO-E) : pour chaque référent concerné, les noms du planning de ce mois qui ne sont dans aucune
 *  équipe, préférence « Rappels », pas encore prévenu cette semaine (clé `cle`, datée du lundi). Personne un
 *  autre jour. */
async function sansEquipeDuLundi(
  db: FirebaseFirestore.Firestore,
  reservations: Reservations,
  planning: Awaited<ReturnType<typeof loadPlanningData>>,
  today: string,
  cle: string,
): Promise<Map<string, string[]>> {
  const [equipes, profils] = await Promise.all([db.collection("equipes").get(), db.collection("users").get()]);
  const parReferent = sansEquipeParReferent(
    planning,
    equipes.docs.map((d) => ({ id: d.id, membres: (d.data().membres ?? []) as EquipeRappel["membres"] })),
    profils.docs.map((d) => ({ uid: d.id, planningName: d.data().planningName as string | undefined })),
    today,
  );
  const fresh = new Set(await reservations.reserver(await filterUidsByNotifPref([...parReferent.keys()], "reminders"), cle, { kind: "sansEquipe" }));
  return new Map([...parReferent].filter(([u]) => fresh.has(u)));
}

/** Corbeille des setlists (SC2.5) : supprime pour de bon, avec leurs sous-collections (history, versions),
 *  celles mises à la corbeille il y a plus de 30 jours. */
async function purgerCorbeille(db: FirebaseFirestore.Firestore): Promise<number> {
  const perimees = await db.collection("setlists").where("supprimeeLe", "<", limiteDePurge(new Date())).get();
  for (const doc of perimees.docs) await db.recursiveDelete(doc.ref);
  return perimees.size;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = adminDb();
  // Hors de l'interrupteur du back-office : la corbeille des setlists existe en ligne. Un échec ne
  // coupe pas les rappels.
  try {
    await purgerCorbeille(db);
  } catch (e) {
    console.error("[cron] purge de la corbeille des setlists", e);
  }
  const reservations = suivreReservations(db);
  try {
    return await passage(db, reservations);
  } catch (e) {
    // Une erreur avant ou pendant l'envoi : les comptes dont la notification n'est pas partie sont de nouveau à prévenir.
    await reservations.rendreRestantes().catch((err) => console.error("[cron] réservations non rendues", err));
    throw e;
  }
}

/** Un passage du cron : lit ce qui est à envoyer (en réservant les clés), envoie, rend le statut. */
async function passage(db: FirebaseFirestore.Firestore, reservations: Reservations) {
  const today = isoInDays(0);
  reinitialiserLecturesSheet();
  const [planning, index] = await Promise.all([loadPlanningData(), loadPlanningNameIndex()]);
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : le rappel du matin ne
  // parle que des services — ni scène, ni tâches, ni évènements.
  const creneaux = BACK_OFFICE ? await sceneCreneaux(db, REMINDERS.map((r) => isoInDays(r.days)), today) : [];
  const taches: Awaited<ReturnType<typeof rappelsTaches>> = BACK_OFFICE ? await rappelsTaches(db, reservations, today) : new Map();
  const lignes: Awaited<ReturnType<typeof lignesEvenements>> = BACK_OFFICE ? await lignesEvenements(db, reservations, today) : new Map();
  // Petit déj (lot U3, Q9) : les inscriptions, déjà lues par loadPlanningData
  // (même cache) ; en échec, rien de plus que ce que les noms ont trouvé, et
  // pas de ligne du mercredi (`null`, Q10).
  const lusPetitDej = BACK_OFFICE ? await lirePetitDej().catch(() => null) : null;
  const lignesPetitDej = lusPetitDej ?? [];
  // Ligne du mercredi (PD4) : fondue dans la première notification de la
  // personne aujourd'hui (services, tâches ou évènements), envoyée seule sinon.
  const petitDej = BACK_OFFICE ? await petitDejDuMercredi(db, reservations, today, lusPetitDej) : { cle: "", uids: new Set<string>() };
  // Ligne du lundi (AO-E) : fondue dans la première notification du référent aujourd'hui, seule sinon.
  const cleSansEquipe = `sans-equipe-${today}`;
  const sansEquipe = BACK_OFFICE ? await sansEquipeDuLundi(db, reservations, planning, today, cleSansEquipe) : new Map<string, string[]>();

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
    // Petit déj : chaque inscrit par son compte, même réécrit (« Famille … ») ou
    // sans nom de planning ; déjà trouvé par son nom, rien de plus.
    ajouterPetitDejAuxRappels(byUid, lignesPetitDej, date);
    // Entraînements sur scène ce jour-là : l'auteur et les membres ayant un
    // rôle dans le « qui » (quand il correspond à une catégorie de l'app).
    for (const c of creneaux.filter((x) => x.dimanche === date)) {
      const entry = sceneReminder(c);
      const uids = new Set([c.auteurUid, ...(await uidsForCategories(quiCategories(c.qui)))]);
      for (const u of uids) {
        if (!u) continue;
        ajouterAuxRappels(byUid, u, entry);
      }
    }

    const prefUids = await filterUidsByNotifPref([...byUid.keys()], "reminders");
    const fresh = await reservations.reserver(prefUids, `rappel-${tag}-${date}`, { tag, date, kind: "service" });
    for (const u of fresh) servicesDe.set(u, [...(servicesDe.get(u) ?? []), { tag, date, services: byUid.get(u)! }]);
    summary[tag] = { date, sent: fresh.length };
  }

  // Un seul passage par personne : services, tâches, lignes d'évènements et
  // ligne du petit déj dans le même message (notificationsDuMatin). Les clés
  // sont déjà réservées (lecture ci-dessus) : elles restent, sauf pour un envoi qui lève.
  const uids = [...new Set([...servicesDe.keys(), ...taches.keys(), ...lignes.keys()])];
  const langs = await loadNotifLangs(uids);
  const resultats = await Promise.allSettled(
    uids.map(async (u) => {
      const lang = langs.get(u) ?? "fr";
      const mesServices = servicesDe.get(u) ?? [];
      const avecPetitDej = petitDej.uids.delete(u);
      const mesSansEquipe = sansEquipe.get(u);
      sansEquipe.delete(u);
      const notifications = notificationsDuMatin(
        {
          services: mesServices,
          taches: taches.get(u)?.rappels ?? [],
          lignes: lignes.get(u)?.lignes ?? [],
          autres: [...(avecPetitDej ? lignesMercredi(today, lusPetitDej, lang) : []), ...lignesSansEquipe(mesSansEquipe ?? [], lang)],
        },
        lang,
        today,
      );
      for (const { kind, ...payload } of notifications) {
        await sendPushToUids([u], payload);
        // Une entrée de cloche par destinataire : le corps est personnel. Ratée après l'envoi, elle se journalise.
        await apresEnvoi(() => recordNotification({ ...payload, kind, recipients: [u] }), "cron rappels");
      }
      // Les clés de ce compte étaient réservées avant l'envoi : elles restent, la notification est partie.
      reservations.envoye(u, [
        ...mesServices.map((s) => `rappel-${s.tag}-${s.date}`),
        ...(taches.get(u)?.keys ?? []),
        ...(lignes.get(u)?.keys ?? []),
        ...(avecPetitDej ? [petitDej.cle] : []),
        ...(mesSansEquipe ? [cleSansEquipe] : []),
      ]);
    })
  );
  // Tous les envois sont terminés avant de rendre quoi que ce soit : un compte déjà prévenu garde sa clé.
  const echec = resultats.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (echec) throw echec.reason;

  // Ligne du lundi des référents sans autre notification aujourd'hui : une notification par personne
  // (les noms sont les siens), ouverte sur l'organigramme (AO-E).
  const sansEquipeSeuls = [...sansEquipe.keys()];
  if (sansEquipeSeuls.length) {
    const langsSeuls = await loadNotifLangs(sansEquipeSeuls);
    for (const [u, noms] of sansEquipe) {
      const lang = langsSeuls.get(u) ?? "fr";
      const payload = { title: titreSansEquipe(lang), body: lignesSansEquipe(noms, lang).join("\n"), url: URL_ORGANIGRAMME, tag: cleSansEquipe };
      await sendPushToUids([u], payload);
      reservations.envoye(u, [cleSansEquipe]);
      await apresEnvoi(() => recordNotification({ ...payload, kind: "reminder", recipients: [u] }), "cron sans équipe");
    }
  }

  // Ligne du mercredi des comptes sans autre notification aujourd'hui : une
  // notification par langue, ouverte sur Planning › Table (lot U3, Q5).
  const petitDejSeuls = [...petitDej.uids];
  if (petitDejSeuls.length) {
    const langsSeuls = await loadNotifLangs(petitDejSeuls);
    for (const lang of ["fr", "zh-CN"] as const) {
      const dest = petitDejSeuls.filter((u) => (langsSeuls.get(u) ?? "fr") === lang);
      if (!dest.length) continue;
      const payload = {
        title: petitDejTitre(lang),
        body: avecLignes("", lignesMercredi(today, lusPetitDej, lang)),
        url: "/planning/table",
        tag: petitDej.cle,
      };
      await sendPushToUids(dest, payload);
      for (const u of dest) reservations.envoye(u, [petitDej.cle]);
      await apresEnvoi(() => recordNotification({ ...payload, kind: "reminder", recipients: dest }), "cron petit déj");
    }
  }

  // Lectures du Sheet ratées pendant ce calcul : journalisées et rendues, sans changer le statut (200 :
  // Vercel ne relance pas) — sauf si TOUTES ont échoué, où le 500 fait voir l'échec dans Vercel.
  const { tentatives, echecs } = lecturesSheet();
  if (echecs.length) console.error(`[cron] ${echecs.length} lecture(s) du Sheet du planning ratée(s) sur ${tentatives} : ${echecs.join(", ")}`);
  const toutesRatees = tentatives > 0 && echecs.length >= tentatives;
  return NextResponse.json(
    { ok: !toutesRatees, summary, personnes: uids.length, petitDej: petitDejSeuls.length, sansEquipe: sansEquipeSeuls.length, lecturesRatees: echecs.length },
    { status: toutesRatees ? 500 : 200 },
  );
}
