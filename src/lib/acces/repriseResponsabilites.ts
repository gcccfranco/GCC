// Lot RS, tranche RS-B (docs/spec-responsabilites.md, « Reprise ») : donner à chaque compte les responsabilités que
// ses droits d'aujourd'hui lui valaient, et lister ce qu'il perd. Même patron que migration.ts : le relevé puis le
// plan d'écritures sont purs ou passent par un `Magasin` (la base vue comme des documents à chemin) ; les tests
// tournent sur une base en mémoire. Le script scripts/responsabilites-reprise.ts branche l'Admin SDK ; il n'est
// lancé que par Timothée, à blanc d'abord, puis avec --ecrire. Aucune session ne lit la vraie base.
//
// On ajoute, on n'efface rien : le seul champ écrit est `responsabilites` (union de ce que le profil a déjà et de ce
// qu'il gagne, dans l'ordre de CLES_RESPONSABILITES) ; aucun autre champ du profil n'est touché.

import {
  CLES_RESPONSABILITES, ORGA, audiencesDesPlannings, responsabiliteDuPlanning, responsabilitesDe,
} from "@/lib/acces/responsabilites";
import { appliquer as appliquerPlan, type Donnees, type Magasin, type Operation } from "@/lib/equipes/migration";

export type { Donnees, Magasin, Operation } from "@/lib/equipes/migration";
export { enLectureSeule } from "@/lib/equipes/migration";

export const ETAPES: Record<number, string> = { 1: "users/{uid}.responsabilites complété (union de l'existant et de ce qui est gagné)" };

const POUR_LOUANGE = ["planning:culte", "planning:intergroupe", "planning:interfranco", "planning:campus"];
const POUR_EDD = ["planning:edd"];

export type LigneReprise = {
  uid: string;
  nom: string;
  /** Ses responsabilités valides déjà là. */
  garde: string[];
  /** Ce qu'il gagne (absent de `garde`), dans l'ordre de CLES_RESPONSABILITES. */
  gagne: string[];
  /** Ce qu'il perd, en texte. */
  perd: string[];
};

const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const texte = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Prénom Nom, sinon le nom du planning, l'adresse, l'uid. */
function nomDe(uid: string, d: Donnees): string {
  return [texte(d.firstName), texte(d.lastName)].filter(Boolean).join(" ") || texte(d.planningName) || texte(d.email) || uid;
}

/** Ce que ce profil gagne, sans tenir compte de ce qu'il a déjà. Clés inconnues ignorées. */
function gainsDe(d: Donnees): Set<string> {
  const referentDe = liste(d.referentDe);
  const gains = new Set<string>();
  if (referentDe.includes("louange")) POUR_LOUANGE.forEach((c) => gains.add(c));
  if (referentDe.includes("edd")) POUR_EDD.forEach((c) => gains.add(c));
  if (liste(d.dansEquipes).includes("orga")) gains.add(ORGA);
  for (const cle of [...liste(d.remplitParRole), ...liste(d.publieParRole), ...liste(d.plannings)]) {
    const r = responsabiliteDuPlanning(cle);
    if (r) gains.add(r);
  }
  return gains;
}

/** Ce que ce profil perd, une fois ses responsabilités finales connues (`finales`). */
function pertesDe(d: Donnees, finales: string[]): string[] {
  const referentDe = liste(d.referentDe);
  const perd: string[] = [];
  if (referentDe.includes("regie")) perd.push("Sono, Sono Live, PPT du Culte");
  if (referentDe.includes("louange")) perd.push("coordination (scène, évènements de l'Église), notifier la Louange");
  if (referentDe.includes("edd")) perd.push("coordination");
  for (const id of referentDe.filter((r) => r.startsWith("comite-"))) perd.push(`créer les évènements du groupe (${id.slice("comite-".length)})`);
  if (referentDe.some((r) => !r.startsWith("comite-")) || liste(d.referentSous).length > 0) {
    perd.push("notification libre à son équipe (restent les réunions)");
  }
  const couvertes = audiencesDesPlannings({ responsabilites: finales });
  const aNotifier = liste(d.notifieParRole).filter((a) => !couvertes.includes(a));
  if (aNotifier.length > 0) perd.push(`notifier ${aNotifier.join(", ")}`);
  return perd;
}

export type Etat = { profils: { uid: string; data: Donnees }[] };

export async function lireEtat(m: Magasin): Promise<Etat> {
  const profils = (await m.lister("users")).map(({ id, data }) => ({ uid: id, data })).sort((a, b) => (a.uid < b.uid ? -1 : 1));
  return { profils };
}

/** Le relevé « garde / gagne / perd » par personne, et le plan : une `maj` de `responsabilites` par profil qui gagne. */
export function releveEtPlan(etat: Etat): { lignes: LigneReprise[]; plan: Operation[] } {
  const lignes: LigneReprise[] = [];
  const plan: Operation[] = [];
  for (const { uid, data } of etat.profils) {
    const garde = responsabilitesDe(data as { responsabilites?: string[] });
    const gains = gainsDe(data);
    const gagne = CLES_RESPONSABILITES.filter((c) => gains.has(c) && !garde.includes(c));
    const finales = CLES_RESPONSABILITES.filter((c) => garde.includes(c) || gains.has(c));
    // Une clé inconnue déjà là est gardée telle quelle, en fin de liste : la reprise n'efface rien.
    const inconnues = ((data as { responsabilites?: string[] }).responsabilites ?? []).filter((c) => !(CLES_RESPONSABILITES as readonly string[]).includes(c));
    const perd = pertesDe(data, finales);
    if (garde.length === 0 && gagne.length === 0 && perd.length === 0) continue;
    lignes.push({ uid, nom: nomDe(uid, data), garde, gagne, perd });
    if (gagne.length > 0) plan.push({ etape: 1, genre: "maj", chemin: `users/${uid}`, data: { responsabilites: [...finales, ...inconnues] } });
  }
  return { lignes, plan };
}

/** Lit la base (jamais d'écriture) puis calcule le relevé et le plan. */
export async function planifier(m: Magasin): Promise<{ lignes: LigneReprise[]; plan: Operation[] }> {
  return releveEtPlan(await lireEtat(m));
}

export const appliquer: (m: Magasin, plan: Operation[], surEtape?: (etape: number, nombre: number) => void) => Promise<void> = appliquerPlan;

// ─── Texte du relevé (imprimé au terminal seulement, jamais écrit dans un fichier du dépôt) ───

const ou = (l: string[]) => (l.length > 0 ? l.join(", ") : "—");

/** « Prénom Nom — garde : … / gagne : … / perd : … », puis le nombre d'opérations. */
export function formaterReleve(lignes: LigneReprise[], plan: Operation[]): string[] {
  return [
    ...lignes.map((l) => `${l.nom} — garde : ${ou(l.garde)} / gagne : ${ou(l.gagne)} / perd : ${ou(l.perd)}`),
    "",
    `${plan.length} opération${plan.length > 1 ? "s" : ""}`,
  ];
}
