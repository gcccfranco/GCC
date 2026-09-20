// Organigramme (lot 16, docs/spec-organigramme.md) : la table des 13 équipes
// et la lecture de l'onglet ORGANIGRAMME du Google Sheet. Tout est pur ici —
// le réseau, les comptes et Firestore sont l'affaire des routes serveur.

import { normalizeName } from "@/lib/planning/names";
import { POLES, type Pole } from "@/types/user";
import type { MembreEquipe } from "@/types/equipe";

export interface EquipeDef {
  id: string;
  /** Nom du Sheet — l'écran affiche la traduction `equipes.team.<id>`. */
  nom: string;
  soustitre: string;
  /** Pôle donné à ses membres ; null = aucun (D1/D3 de la spec). */
  pole: Pole | null;
  /** Clé de reconnaissance dans le Sheet, normalisée (accents et casse pliés). */
  cle: string;
  /** LOUANGE et EDD : la première ligne du bloc porte les sous-colonnes. */
  sousColonnes?: boolean;
}

/** Les 13 équipes, dans l'ordre du Sheet. Une équipe hors de cette table n'est
 *  jamais créée : elle ressort dans `inconnues` (D8). */
export const EQUIPES: EquipeDef[] = [
  { id: "orga", nom: "TEAM ORGA", soustitre: "Coordination générale", pole: "orga", cle: "orga" },
  { id: "comite-franco", nom: "COMITÉ FRANCO", soustitre: "", pole: "orga", cle: "comite franco" },
  { id: "da", nom: "TEAM DA", soustitre: "Direction Artistique", pole: "da", cle: "da" },
  { id: "medias", nom: "TEAM MÉDIAS", soustitre: "Photo, Vidéo", pole: "media", cle: "medias" },
  { id: "developpement", nom: "TEAM DÉVELOPPEMENT", soustitre: "GCCLouange, Siteweb, Livret digital", pole: null, cle: "developpement" },
  { id: "regie", nom: "TEAM RÉGIE", soustitre: "Sono Live & PPT", pole: null, cle: "regie" },
  { id: "traduction", nom: "TEAM TRADUCTION", soustitre: "", pole: null, cle: "traduction" },
  { id: "theologie", nom: "TEAM THÉOLOGIE", soustitre: "", pole: "orga", cle: "theologie" },
  { id: "evenementiel", nom: "TEAM ÉVÉNEMENTIEL", soustitre: "", pole: "evenement", cle: "evenementiel" },
  { id: "decoration", nom: "TEAM DÉCORATION", soustitre: "", pole: "da", cle: "decoration" },
  { id: "accueil-j1", nom: "TEAM ACCUEIL J1", soustitre: "Campus", pole: "evenement", cle: "accueil j1" },
  { id: "louange", nom: "TEAM LOUANGE", soustitre: "Franco / Inter", pole: null, cle: "louange", sousColonnes: true },
  { id: "edd", nom: "TEAM EDD", soustitre: "École du Dimanche", pole: null, cle: "edd", sousColonnes: true },
];

/** Bloc du Sheet lu mais jamais rangé en équipe : la vue d'ensemble des
 *  musiciens est un calcul fait à la main, le lot 16 la recalcule (T3). */
const IGNOREES = ["musiciens"];

const defParCle = new Map(EQUIPES.map((e) => [e.cle, e]));

/** Nom d'équipe d'une cellule d'en-tête → clé de la table : « TEAM MÉDIAS -
 *  Photo, Vidéo » → « medias », « TEAM ACCUEIL J1 (Campus) » → « accueil j1 ». */
function cleDEntete(brut: string): string {
  const sansTeam = brut.trim().replace(/^TEAM\s+/i, "");
  const sansSousTitre = sansTeam.split(/\s+[—–-]\s+/)[0];
  return normalizeName(sansSousTitre.replace(/\([^)]*\)/g, ""));
}

function estEntete(cellule: string): boolean {
  const c = cellule.trim();
  return /^TEAM\s/i.test(c) || cleDEntete(c) === "comite franco";
}

/** « TEAM LOUANGE (FRANCO / INTER)      Jonathan Z. — Référent » : le Sheet
 *  colle parfois le référent à droite de l'en-tête, séparé par un blanc long. */
function couperEntete(cellule: string): { titre: string; referent: string } {
  const parts = cellule.trim().split(/\s{3,}/);
  return { titre: parts[0], referent: parts.slice(1).join(" ").trim() };
}

/** « Maëlice D.  (en essai) — Batterie » → nom, mention, référent, essai. */
function lireMembre(cellule: string, groupe: string): MembreEquipe | null {
  let texte = cellule.trim();
  const essai = /\(en\s+essai\)/i.test(texte);
  texte = texte.replace(/\s*\(en\s+essai\)\s*/i, " ").trim();
  const [nomBrut, ...reste] = texte.split(/\s*[—–]\s*/);
  const nom = nomBrut.trim();
  if (!nom) return null;
  const mention = reste.join(" — ").trim();
  return { nom, uid: "", mention, referent: /^ref/.test(normalizeName(mention)), essai, groupe };
}

export type EquipeLue = { id: string; membres: MembreEquipe[] };

/** Lecture de l'onglet ORGANIGRAMME : des blocs posés côte à côte, pas un
 *  tableau. Une ligne qui porte au moins une cellule « TEAM … » ouvre une
 *  bande ; chaque en-tête y tient les colonnes jusqu'au suivant, et la bande
 *  court jusqu'à la prochaine ligne d'en-tête. */
export function parseOrganigramme(rows: string[][]): { equipes: EquipeLue[]; inconnues: string[] } {
  const lignesEntete = rows.map((r, i) => (r.some(estEntete) ? i : -1)).filter((i) => i >= 0);
  const equipes: EquipeLue[] = [];
  const inconnues: string[] = [];

  lignesEntete.forEach((ligne, rang) => {
    const finBande = lignesEntete[rang + 1] ?? rows.length;
    const colonnes = rows[ligne].map((c, i) => (estEntete(c) ? i : -1)).filter((i) => i >= 0);

    colonnes.forEach((col, k) => {
      const finCol = colonnes[k + 1] ?? Number.MAX_SAFE_INTEGER;
      const brut = rows[ligne][col].trim();
      const { titre, referent } = couperEntete(brut);
      const cle = cleDEntete(titre);
      if (IGNOREES.includes(cle)) return;
      const def = defParCle.get(cle);
      if (!def) { inconnues.push(brut); return; }

      const membres: MembreEquipe[] = [];
      if (referent) {
        const m = lireMembre(referent, "");
        if (m) membres.push({ ...m, referent: true });
      }
      // Sous-colonnes (LOUANGE, EDD) : la première ligne du bloc les nomme.
      let debut = ligne + 1;
      const groupes: [number, string][] = [];
      if (def.sousColonnes && debut < finBande) {
        rows[debut].forEach((c, i) => {
          if (i >= col && i < finCol && c.trim()) groupes.push([i, c.trim()]);
        });
        debut++;
      }
      const groupeDe = (i: number) =>
        groupes.filter(([c]) => c <= i).slice(-1)[0]?.[1] ?? "";

      for (let r = debut; r < finBande; r++) {
        (rows[r] ?? []).forEach((cellule, i) => {
          if (i < col || i >= finCol || !cellule.trim()) return;
          const m = lireMembre(cellule, groupeDe(i));
          if (m) membres.push(m);
        });
      }
      equipes.push({ id: def.id, membres });
    });
  });

  return { equipes, inconnues };
}

export type ProfilRattachement = {
  uid: string;
  planningName: string;
  firstName: string;
  lastName: string;
};

const prenomDe = (s: string) => normalizeName(s).split(" ")[0] ?? "";

/** Nom du Sheet → compte. D'abord le nom de planning, puis le prénom seul
 *  quand il ne désigne qu'un compte (« Stéphane », « Karémy », « Isabelle ») ;
 *  rien n'est deviné au-delà — « Kitty S. » contre « Ketty S. » reste dehors. */
export function rattacherNoms(
  noms: string[],
  profils: ProfilRattachement[],
): Record<string, string> {
  const parNom = new Map<string, Set<string>>();
  const parPrenom = new Map<string, Set<string>>();
  const ajoute = (m: Map<string, Set<string>>, cle: string, uid: string) => {
    if (!cle) return;
    if (!m.has(cle)) m.set(cle, new Set());
    m.get(cle)!.add(uid);
  };
  for (const p of profils) {
    ajoute(parNom, normalizeName(p.planningName), p.uid);
    ajoute(parPrenom, prenomDe(p.planningName), p.uid);
    ajoute(parPrenom, normalizeName(p.firstName), p.uid);
  }
  const trouve: Record<string, string> = {};
  for (const nom of noms) {
    const exact = parNom.get(normalizeName(nom));
    if (exact?.size === 1) { trouve[nom] = [...exact][0]; continue; }
    const parP = parPrenom.get(prenomDe(nom));
    if (parP?.size === 1) trouve[nom] = [...parP][0];
  }
  return trouve;
}

/** Pôles d'une personne d'après les équipes : l'union des pôles des équipes où
 *  elle figure. Seule vérité pour `users/{uid}.poles` depuis le lot 16 (D9). */
export function polesDesEquipes(
  uid: string,
  equipes: { pole: Pole | null; membres: { uid: string }[] }[],
): Pole[] {
  if (!uid) return [];
  const donnes = new Set<Pole>();
  for (const e of equipes) {
    if (e.pole && e.membres.some((m) => m.uid === uid)) donnes.add(e.pole);
  }
  return POLES.filter((p) => donnes.has(p));
}
