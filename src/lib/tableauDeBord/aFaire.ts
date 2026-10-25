// L'écran « À faire » (piste A, BO-B, docs/spec-back-office-piste-a.md BO6) : ce que rendent les fonctions de
// `./donnees` réuni en une seule liste, en groupes (en retard, cette semaine, plus tard, à lire ou à relier).
// Module pur, sans React ni Firestore : `./lecture` (`lireAFaire`) lit les sources permises, celles qu'il n'a pas
// pu lire ou pas le droit de lire restent absentes. Les lignes portent des données, jamais du texte traduit.
import { estReunion } from "@/lib/access";
import { isExpired, isInfo, isPast } from "@/lib/evenements/agenda";
import { baseBackOffice, ficheEvenement } from "@/lib/navigation";
import { addDays, type Ligne } from "@/lib/taches/echeances";
import type { Evenement } from "@/types/evenement";
import type { Creneau } from "@/types/programme";
import {
  creneauxVides, equipeDeLaColonne, estSienEvenement, etatInscriptions, fermeBientot, nomsSansCompte, planningsDuTableau,
  prochainDimanche, prochainsDimanches, tachesDuTableau,
  type EtatInscriptions, type ProfilReferent, type ReunionDuTableau,
} from "./donnees";

export type GroupeAFaire = "enRetard" | "semaine" | "plusTard" | "aLire";
export type SorteAFaire = "cases" | "tache" | "inscriptions" | "scene" | "compteRendu" | "messages" | "comptes";
export type VerbeAFaire = "remplir" | "fait" | "voirInscrits" | "attribuer" | "compteRendu" | "lire" | "relier";
export type Filtre = "tout" | "mesEquipes";

/** Une ligne : des données (le texte se compose à l'affichage), les champs sont ceux utiles à sa `sorte`. */
export type LigneAFaire = {
  id: string;
  sorte: SorteAFaire;
  verbe: VerbeAFaire;
  href: string;
  /** « AAAA-MM-JJ » : l'échéance (cases : le dimanche ; tâche : sa date ; évènement : son jour ; scène : le premier passage vide). */
  date?: string;
  /** Les équipes concernées (pour le filtre « Mes équipes »). */
  equipes: string[];
  aMoi: boolean;
  /** Cases : le planning (clé), ses colonnes vides (`n` = nombre de dimanches, cases « plus tard »), les prénoms à relancer. */
  planning?: string;
  colonnes?: { cle: string; i18n: string; n?: number }[];
  relancer?: string[];
  /** Tâche, évènement ou réunion. */
  titre?: string;
  /** Tâche : son équipe. */
  equipe?: string;
  /** Inscriptions : l'état (inscrits / places). */
  inscriptions?: EtatInscriptions;
  /** Scène : créneaux vides. Messages : signalements + propositions. Comptes : noms sans compte. */
  nombre?: number;
  signalements?: number;
  propositions?: number;
};

export type ResultatAFaire = { groupes: { id: GroupeAFaire; lignes: LigneAFaire[] }[]; total: number };

/** Ce qui a été lu ; une source absente = non permise ou en échec. */
export type SourcesAFaire = {
  /** Plannings qu'on remplit : leurs lignes (clé → lignes), leurs clés, les profils (qui relancer). */
  planning?: { rows: Record<string, string[][]>; plannings: string[]; profils: (ProfilReferent & { planningName: string })[] };
  taches?: Ligne[];
  evenements?: Evenement[];
  /** Créneaux de scène des éditions affichées. */
  creneaux?: Creneau[];
  /** `reunionsDuTableau(...)` sans plafond. */
  reunions?: ReunionDuTableau[];
  messages?: { signalements: number; propositions: number };
  comptes?: { noms: string[]; profils: { planningName: string }[] };
};

export type EntreesAFaire = {
  sources: SourcesAFaire;
  /** « AAAA-MM-JJ ». */
  today: string;
  /** « AAAA-MM-JJTHH:MM » (heure de Paris). */
  nowIso: string;
  uid: string;
  /** Les équipes dont on est membre (`equipesDe`). */
  mesEquipes: string[];
};

const ORDRE: GroupeAFaire[] = ["enRetard", "semaine", "plusTard", "aLire"];
/** Dimanches suivants comptés « plus tard » (le réglage par défaut du widget Plannings). */
const HORIZON_PLUS_TARD = 4;

const equipesDe = (pour: string) => (pour.startsWith("equipe:") ? [pour.slice("equipe:".length)] : []);
const distincts = <T,>(l: T[]) => [...new Set(l)];

/** Date croissante (sans date à la fin), puis les siennes, puis l'identifiant. */
function trier(lignes: LigneAFaire[]): LigneAFaire[] {
  return [...lignes].sort((a, b) =>
    (a.date ? 0 : 1) - (b.date ? 0 : 1) || (a.date ?? "").localeCompare(b.date ?? "")
    || Number(b.aMoi) - Number(a.aMoi) || a.id.localeCompare(b.id));
}

function reunir(parGroupe: Record<GroupeAFaire, LigneAFaire[]>): ResultatAFaire {
  const groupes = ORDRE.flatMap((id) => (parGroupe[id].length ? [{ id, lignes: trier(parGroupe[id]) }] : []));
  return { groupes, total: groupes.reduce((n, g) => n + g.lignes.length, 0) };
}

export function aFaire({ sources, today, nowIso, uid, mesEquipes }: EntreesAFaire): ResultatAFaire {
  const g: Record<GroupeAFaire, LigneAFaire[]> = { enRetard: [], semaine: [], plusTard: [], aLire: [] };
  const semaineFin = addDays(today, 7);

  // Cases vides des plannings qu'on remplit.
  if (sources.planning) {
    const { rows, plannings, profils } = sources.planning;
    const dimanche = prochainDimanche(nowIso);
    const suivants = prochainsDimanches(addDays(dimanche, 7), HORIZON_PLUS_TARD);
    const p = planningsDuTableau(rows, plannings, dimanche, suivants, profils, []);
    for (const planning of distincts(p.vides.map((v) => v.planning))) {
      const vides = p.vides.filter((v) => v.planning === planning);
      g.semaine.push({
        id: `cases:${planning}:semaine`, sorte: "cases", verbe: "remplir", href: `/back-office/planning/${planning}`, date: dimanche,
        equipes: distincts(vides.flatMap((v) => equipeDeLaColonne(planning, v.colonne.cle)?.equipe ?? [])), aMoi: false,
        planning, colonnes: vides.map((v) => v.colonne), nombre: vides.length,
        relancer: distincts(vides.flatMap((v) => v.relancer?.prenom ?? [])),
      });
    }
    for (const pp of p.plusTard.parPlanning) {
      g.plusTard.push({
        id: `cases:${pp.planning}:plusTard`, sorte: "cases", verbe: "remplir", href: `/back-office/planning/${pp.planning}`,
        date: p.plusTard.jusquau,
        equipes: distincts(pp.colonnes.flatMap((c) => equipeDeLaColonne(pp.planning, c.cle)?.equipe ?? [])), aMoi: false,
        planning: pp.planning, colonnes: pp.colonnes, nombre: pp.colonnes.reduce((s, c) => s + c.n, 0),
      });
    }
  }

  // Tâches : en retard, sinon cette semaine (`tachesDuTableau` garde jusqu'à J+7).
  if (sources.taches) {
    for (const l of tachesDuTableau(sources.taches, uid, today, Number.MAX_SAFE_INTEGER).lignes) {
      g[l.date < today ? "enRetard" : "semaine"].push({
        id: `tache:${l.tache.equipe}:${l.tache.id}:${l.date}`, sorte: "tache", verbe: "fait", href: `/back-office/equipes/${l.tache.equipe}`,
        date: l.date, equipes: [l.tache.equipe], aMoi: l.aMoi, titre: l.tache.titre, equipe: l.tache.equipe,
      });
    }
  }

  // Évènements à soi : inscriptions qui ferment bientôt, passages de scène vides.
  if (sources.evenements) {
    const siens = sources.evenements.filter((e) =>
      estSienEvenement(e, uid, mesEquipes) && !estReunion(e) && !isInfo(e) && !isPast(e, today) && !isExpired(e, today));
    for (const e of siens) {
      if (fermeBientot(e, nowIso)) {
        g.semaine.push({
          id: `inscriptions:${e.id}`, sorte: "inscriptions", verbe: "voirInscrits", href: `${baseBackOffice(e)}/${e.id}`, date: e.date,
          equipes: equipesDe(e.pour), aMoi: true, titre: e.titre, inscriptions: etatInscriptions(e, nowIso),
        });
      }
      if (sources.creneaux) {
        const vides = creneauxVides(e, sources.creneaux).filter((c) => c.dimanche >= today);
        if (vides.length > 0) {
          const premier = vides.map((c) => c.dimanche).sort()[0];
          g[premier <= semaineFin ? "semaine" : "plusTard"].push({
            id: `scene:${e.id}`, sorte: "scene", verbe: "attribuer", href: "/back-office/evenements/scene", date: premier,
            equipes: equipesDe(e.pour), aMoi: true, titre: e.titre, nombre: vides.length,
          });
        }
      }
    }
  }

  // Réunion passée restée sans compte rendu (la même ne compte qu'une fois).
  if (sources.reunions) {
    const vues = new Set<string>();
    for (const { precedenteSansCompteRendu: p } of sources.reunions) {
      if (!p || vues.has(p.id)) continue;
      vues.add(p.id);
      g.enRetard.push({
        id: `compteRendu:${p.id}`, sorte: "compteRendu", verbe: "compteRendu", href: ficheEvenement(p), date: p.date,
        equipes: equipesDe(p.pour), aMoi: true, titre: p.titre,
      });
    }
  }

  // À lire, à relier.
  if (sources.messages) {
    const { signalements, propositions } = sources.messages;
    if (signalements + propositions > 0) {
      g.aLire.push({
        id: "messages", sorte: "messages", verbe: "lire", href: "/back-office/messages", equipes: [], aMoi: false,
        nombre: signalements + propositions, signalements, propositions,
      });
    }
  }
  if (sources.comptes) {
    const n = nomsSansCompte(sources.comptes.noms, sources.comptes.profils).length;
    if (n > 0) {
      g.aLire.push({
        id: "comptes", sorte: "comptes", verbe: "relier", href: "/back-office/equipes/personnes/sans-compte", equipes: [], aMoi: false, nombre: n,
      });
    }
  }

  return reunir(g);
}

/** « Mes équipes » : les lignes à soi ou d'une de ses équipes (une ligne sans équipe disparaît) ; « Tout » : tel quel. */
export function filtrer(resultat: ResultatAFaire, filtre: Filtre, mesEquipes: string[]): ResultatAFaire {
  if (filtre === "tout") return resultat;
  const groupes = resultat.groupes
    .map((g) => ({ id: g.id, lignes: g.lignes.filter((l) => l.aMoi || l.equipes.some((e) => mesEquipes.includes(e))) }))
    .filter((g) => g.lignes.length > 0);
  return { groupes, total: groupes.reduce((n, g) => n + g.lignes.length, 0) };
}
