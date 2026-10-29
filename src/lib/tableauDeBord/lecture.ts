"use client";

// Lectures des widgets du tableau de bord (lot U6, B4) : chaque widget lit ce qu'il montre,
// à son montage, puis passe le résultat aux règles pures de `./donnees`.
import { useEffect, useState } from "react";
import { canVoirAbsencesDeTous, equipesDe, isAdminUser, widgetsPermis } from "@/lib/access";
import { listerToutesAbsences } from "@/lib/firebase/absences";
import { compterEnAttente } from "@/lib/firebase/reports";
import { listCreneaux, listProgrammes } from "@/lib/firebase/programmes";
import { listTaches } from "@/lib/firebase/taches";
import { collectPlanningNames, loadPlanningData } from "@/lib/planning/names";
import { editionsAffichees } from "@/lib/scene/fetes";
import { lignesDeTache } from "@/lib/taches/echeances";
import { aFaire, type ResultatAFaire, type SourcesAFaire } from "./aFaire";
import { equipesAFaire, estSienEvenement, planningsCasesVides, reunionsDuTableau } from "./donnees";
import { fusionnerLignes } from "@/lib/planning/grilles";
import { fetchGrille } from "@/lib/planning/grille";
import { fetchFidelite, lireSheetDe } from "@/lib/planning/sheets";
import { listEvenements } from "@/lib/firebase/evenements";
import { getSetlistsDepuis, type FSSetlist } from "@/lib/firebase/setlists";
import { listProfiles } from "@/lib/firebase/users";
import type { Evenement } from "@/types/evenement";
import type { UserProfile } from "@/types/user";

/**
 * Les lignes de plannings par clé : la grille de l'app et le Google Sheet réunis dimanche
 * par dimanche, comme l'export (`exporter.tsx`). Sans données de secours : un planning
 * illisible n'invente aucun nom. Fidélité : ses guitares et batteries reprises du planning des
 * musiciens (lot F, D25), comme la page.
 */
export async function lireGrilles(cles: string[]): Promise<Record<string, string[][]>> {
  return Object.fromEntries(await Promise.all(
    [...new Set(cles)].map(async (k) => [k, k === "fidelite" ? await fetchFidelite() : fusionnerLignes(await fetchGrille(k), await lireSheetDe(k))] as const),
  ));
}

// « Ce dimanche » et « Setlists à préparer » lisent les mêmes setlists : une lecture pour les
// deux, gardée une minute (comme `fetchGrille`, plus court : une setlist se publie vite).
const TTL_SETLISTS_MS = 60_000;
let setlists: { depuis: string; at: number; promesse: Promise<FSSetlist[]> } | null = null;

/** Les setlists publiées datées de `depuis` ou après, lues une fois pour tous les widgets.
 *  Une lecture en échec rejette (« Lecture impossible ») et n'est pas gardée. */
export function lireSetlists(depuis: string): Promise<FSSetlist[]> {
  if (setlists && setlists.depuis === depuis && Date.now() - setlists.at < TTL_SETLISTS_MS) return setlists.promesse;
  const promesse = getSetlistsDepuis(depuis);
  const entree = { depuis, at: Date.now(), promesse };
  setlists = entree;
  promesse.catch(() => { if (setlists === entree) setlists = null; });
  return promesse;
}

// Lot TB2 : « Évènements » (et bientôt « Réunions ») lisent les mêmes évènements, « Plannings » et
// « Comptes » les mêmes profils : une lecture chacun, gardée une minute, rejetée non gardée.
const TTL_PARTAGE_MS = 60_000;
function lectureGardee<T>(lire: (cle: string) => Promise<T>): (cle: string) => Promise<T> {
  let garde: { cle: string; at: number; promesse: Promise<T> } | null = null;
  return (cle) => {
    if (garde && garde.cle === cle && Date.now() - garde.at < TTL_PARTAGE_MS) return garde.promesse;
    const promesse = lire(cle);
    const entree = { cle, at: Date.now(), promesse };
    garde = entree;
    promesse.catch(() => { if (garde === entree) garde = null; });
    return promesse;
  };
}

/** Les évènements lisibles (`listEvenements(false)`), lus une fois pour tous les widgets ; `today` borne la garde au jour. */
export const lireEvenements: (today: string) => Promise<Evenement[]> = lectureGardee(() => listEvenements(false));

/** Tous les profils (`listProfiles`), lus une fois pour tous les widgets. */
export const lireProfils: () => Promise<UserProfile[]> = (() => { const l = lectureGardee(() => listProfiles()); return () => l(""); })();

/** Signalements et propositions de chants en attente (admins), lus une fois pour la pastille de Messages et pour À faire. */
export const lireEnAttente: (uid: string) => Promise<{ signalements: number; propositions: number }> = lectureGardee(async () => {
  const [signalements, propositions] = await Promise.all([compterEnAttente("reports"), compterEnAttente("songProposals")]);
  return { signalements, propositions };
});

/** Une lecture relancée quand `cle` change ; `erreur` si elle échoue (jamais « vide »). */
export function useLecture<T>(lire: () => Promise<T>, cle: string): { valeur: T | null; erreur: boolean } {
  const [etat, setEtat] = useState<{ cle: string; valeur: T | null; erreur: boolean }>({ cle: "", valeur: null, erreur: false });
  useEffect(() => {
    let vivant = true;
    lire().then(
      (valeur) => { if (vivant) setEtat({ cle, valeur, erreur: false }); },
      () => { if (vivant) setEtat({ cle, valeur: null, erreur: true }); },
    );
    return () => { vivant = false; };
    // `lire` change à chaque rendu ; `cle` dit ce qu'il lit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  return etat.cle === cle ? { valeur: etat.valeur, erreur: etat.erreur } : { valeur: null, erreur: false };
}

// ─── À faire (piste A, BO-B) ─────────────────────────────────────────────────

export type LectureAFaire = { resultat: ResultatAFaire; incomplet: boolean };

/** Lit chaque source que les droits permettent, comme le faisaient les widgets ; une source qui échoue est omise. */
async function lireSansGarde(user: { uid: string; email?: string | null }, profile: UserProfile | null, today: string, nowIso: string): Promise<LectureAFaire> {
  const permis = widgetsPermis(user, profile);
  const mesEquipes = equipesDe(profile);
  const taches: (() => Promise<SourcesAFaire>)[] = [];

  if (permis.includes("planning")) {
    const plannings = planningsCasesVides({}, user, profile);
    if (plannings.length > 0) {
      // BO13 : les absences comme l'ancien widget Plannings, seulement pour qui peut voir celles de tous.
      const voitLesAbsences = canVoirAbsencesDeTous(user, profile);
      taches.push(async () => {
        // Les absences en échec ne retiennent pas les cases vides : la liste se dit seulement incomplète.
        const [rows, profils, absences] = await Promise.all([
          lireGrilles(plannings), lireProfils(), voitLesAbsences ? listerToutesAbsences().catch(() => null) : [],
        ]);
        return absences ? { planning: { rows, plannings, profils, absences } } : { planning: { rows, plannings, profils }, __echec: true };
      });
    }
  }
  if (permis.includes("afaire")) {
    taches.push(async () => {
      const equipes = equipesAFaire({}, user, profile);
      const items = (await Promise.all(equipes.map((e) => listTaches(e)))).flat();
      return { taches: items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today)) };
    });
  }
  if (permis.includes("evenements")) {
    taches.push(async () => {
      const evenements = await lireEvenements(today);
      // Les créneaux de scène ne se lisent que s'il y a des évènements à soi ; leur échec ne retient pas les inscriptions.
      if (!evenements.some((e) => estSienEvenement(e, user.uid, mesEquipes))) return { evenements };
      const creneaux = await (async () => {
        const editions = editionsAffichees(await listProgrammes(), today).flatMap((e) => (e.programme ? [e.programme] : []));
        return (await Promise.all(editions.map((p) => listCreneaux(p.id)))).flat();
      })().catch(() => null);
      return creneaux ? { evenements, creneaux } : { evenements, __echec: true };
    });
  }
  if (permis.includes("reunions")) {
    taches.push(async () => ({ reunions: reunionsDuTableau(await lireEvenements(today), user, profile, nowIso, Number.MAX_SAFE_INTEGER) }));
  }
  if (permis.includes("comptes")) {
    taches.push(async () => {
      const [data, profils] = await Promise.all([loadPlanningData(), lireProfils()]);
      return { comptes: { noms: collectPlanningNames(data), profils } };
    });
  }
  if (isAdminUser(user)) {
    taches.push(async () => ({ messages: await lireEnAttente(user.uid) }));
  }

  const lues = await Promise.allSettled(taches.map((t) => t()));
  const sources: SourcesAFaire = {};
  let incomplet = false;
  for (const l of lues) {
    if (l.status === "rejected") { incomplet = true; continue; }
    const { __echec, ...reste } = l.value as SourcesAFaire & { __echec?: boolean };
    if (__echec) incomplet = true;
    Object.assign(sources, reste);
  }
  return { resultat: aFaire({ sources, today, nowIso, uid: user.uid, mesEquipes }), incomplet };
}

// Gardée comme `lectureGardee`, mais les arguments passent par l'appel, et un résultat incomplet n'est pas gardé.
let garde: { cle: string; at: number; promesse: Promise<LectureAFaire> } | null = null;

/** Ce qu'il y a à faire : une lecture gardée une minute par compte et par jour, partagée par la page et la pastille. */
export function lireAFaire(
  user: { uid: string; email?: string | null }, profile: UserProfile | null, today: string, nowIso: string,
): Promise<LectureAFaire> {
  const cle = `${user.uid}|${today}`;
  if (garde && garde.cle === cle && Date.now() - garde.at < TTL_PARTAGE_MS) return garde.promesse;
  const promesse = lireSansGarde(user, profile, today, nowIso);
  const entree = { cle, at: Date.now(), promesse };
  garde = entree;
  const oublier = () => { if (garde === entree) garde = null; };
  promesse.then((l) => { if (l.incomplet) oublier(); }, oublier);
  return promesse;
}
