// Harmonie (lot 9) — lire les fiches écrites dans `docs/harmonie/*.md`.
//
// Les fiches restent des documents : c'est là que Timothée les relit, corrige
// et valide, famille par famille. Ce lecteur les traduit en données pour
// l'app ; il **refuse** un mot de vocabulaire inconnu plutôt que de l'ignorer,
// pour qu'une coquille se voie au build et non dans le catalogue.

import {
  MOMENT_FR, NIVEAU_FR, SENSATION_FR, STATUT_FR,
  type EtapeParcours, type Fiche, type Instrument, type Moment, type Niveau, type Sensation,
} from "@/types/harmonie";

// Les intertitres d'une fiche. Liste fermée : le corps des fiches met aussi du
// gras en début de ligne (les lignes sont coupées à 80 colonnes), qui n'est pas
// un intertitre.
const INTERTITRES = [
  "Avant → après", "Pourquoi ça marche", "Quand l'éviter", "Au piano",
  "À la guitare", "Dans le répertoire", "Règle",
];

/** Découpe « **Intertitre** … » : le texte de chaque partie d'une fiche. */
function morceaux(bloc: string): Map<string, string> {
  const out = new Map<string, string>();
  const marques: { label: string; debut: number; fin: number }[] = [];
  const re = /^\*\*(.+?)\*\*/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bloc))) {
    const label = m[1].replace(/\.$/, "").trim();
    if (!INTERTITRES.includes(label)) continue;
    marques.push({ label, debut: m.index + m[0].length, fin: bloc.length });
    if (marques.length > 1) marques[marques.length - 2].fin = m.index;
  }
  for (const x of marques) {
    // Le dernier morceau butte sur le trait qui sépare deux fiches.
    const texte = bloc.slice(x.debut, x.fin).replace(/^\s*:\s*/, "").replace(/\s*-{3,}\s*$/, "").trim();
    out.set(x.label, texte);
  }
  return out;
}

function ligneDuTableau(bloc: string, cle: string): string | null {
  const m = bloc.match(new RegExp(`^\\|\\s*${cle}\\s*\\|\\s*(.+?)\\s*\\|\\s*$`, "m"));
  return m ? m[1].trim() : null;
}

function traduire<T>(valeurs: string, table: Record<string, T>, quoi: string, ou: string): T[] {
  return valeurs.split("·").map((v) => {
    const cle = v.trim();
    const t = table[cle];
    if (!t) throw new Error(`${ou} : ${quoi} inconnu « ${cle} » (vocabulaire de docs/harmonie/README.md)`);
    return t;
  });
}

/** « piano : facile · guitare : intermédiaire », ou « facile » pour une fiche
 *  propre à un instrument. Un morceau en gras (« **à préparer avec l'équipe** »)
 *  est une remarque, pas un niveau : elle est gardée à part. */
function lireNiveau(
  texte: string,
  instrument: Instrument | undefined,
  ou: string,
): { niveau: Partial<Record<Instrument, Niveau>>; note?: string } {
  const out: Partial<Record<Instrument, Niveau>> = {};
  let note: string | undefined;
  for (const part of texte.split("·")) {
    const brut = part.trim();
    if (/^\*\*.+\*\*$/.test(brut)) { note = brut.replace(/\*\*/g, ""); continue; }
    const [gauche, droite] = brut.split(":").map((s) => s.trim());
    // Les fiches précisent parfois « facile (avec Bm7) » : la parenthèse est
    // une aide de lecture, pas un niveau.
    const mot = (droite ?? gauche).replace(/\s*\(.*$/, "").trim();
    const niveau = NIVEAU_FR[mot];
    if (!niveau) throw new Error(`${ou} : niveau inconnu « ${mot} »`);
    if (droite) out[gauche === "piano" ? "piano" : "guitare"] = niveau;
    else if (instrument) out[instrument] = niveau;
    else { out.piano = niveau; out.guitare = niveau; }
  }
  return { niveau: out, note };
}

/** Les puces d'une liste markdown. Les fiches sont coupées à 80 colonnes : la
 *  suite d'une puce continue sur la ligne suivante, en retrait, et appartient à
 *  la même puce. */
function puces(texte: string): string[] {
  const out: string[] = [];
  for (const ligne of texte.split("\n")) {
    const nu = ligne.trim();
    if (nu.startsWith("- ")) out.push(nu.slice(2).trim());
    else if (nu && out.length) out[out.length - 1] += ` ${nu}`;
  }
  return out;
}

/**
 * Les fiches d'un fichier de famille. `nomFichier` sert aux messages d'erreur
 * et donne la famille (« 01-substitutions.md » → « Substitutions »).
 */
export function lireFamille(markdown: string, nomFichier: string): Fiche[] {
  const titre = markdown.match(/^#\s*\d+\s*·\s*(.+)$/m);
  const familleNom = titre ? titre[1].trim() : nomFichier;
  const blocs = markdown.split(/\n## /).slice(1);

  return blocs.map((bloc) => {
    const entete = bloc.split("\n")[0];
    const [code, ...reste] = entete.split("·");
    const nom = reste.join("·").trim();
    const ou = `${nomFichier} · ${code.trim()}`;

    const id = ligneDuTableau(bloc, "Id")?.replace(/`/g, "");
    if (!id) throw new Error(`${ou} : pas d'Id`);
    const statutTexte = ligneDuTableau(bloc, "Statut") ?? "à valider";
    const statut = STATUT_FR[statutTexte];
    if (!statut) throw new Error(`${ou} : statut inconnu « ${statutTexte} »`);

    const instrumentTexte = ligneDuTableau(bloc, "Instrument");
    const instrument = instrumentTexte === "piano" || instrumentTexte === "guitare" ? instrumentTexte : undefined;

    const parts = morceaux(bloc);
    const { niveau, note: niveauNote } = lireNiveau(ligneDuTableau(bloc, "Niveau") ?? "facile", instrument, ou);
    const fiche: Fiche = {
      id,
      code: code.trim(),
      famille: id.split("/")[0],
      familleNom,
      nom,
      statut,
      instrument,
      sensations: traduire(ligneDuTableau(bloc, "Sensations") ?? "", SENSATION_FR, "sensation", ou) as Sensation[],
      moments: traduire(ligneDuTableau(bloc, "Moments") ?? "", MOMENT_FR, "moment", ou) as Moment[],
      niveau,
      niveauNote,
      avantApres: parts.get("Avant → après"),
      pourquoi: parts.get("Pourquoi ça marche"),
      eviter: puces(parts.get("Quand l'éviter") ?? ""),
      piano: parts.get("Au piano"),
      guitare: parts.get("À la guitare"),
      // Le compte entre parenthèses de la fiche était une estimation de
      // relecture ; l'app affiche le compte **calculé** (`exemples`). On ne
      // garde ici que les chants nommés, pour ne pas afficher deux chiffres.
      repertoire: parts.get("Dans le répertoire")?.replace(/^\([^)]*\)\s*:?\s*/, ""),
      regle: parts.get("Règle"),
      exemples: [],
    };
    return fiche;
  });
}

/** Le parcours « Par où commencer » : dix étapes, dans l'ordre, chacune
 *  renvoyant à une fiche (deux à l'étape 4, propre à l'instrument). */
export function lireParcours(markdown: string, fiches: Fiche[]): EtapeParcours[] {
  const parCode = new Map(fiches.map((f) => [f.code, f.id]));
  const out: EtapeParcours[] = [];
  for (const ligne of markdown.split("\n")) {
    const cols = ligne.split("|").map((c) => c.trim());
    if (cols.length < 6 || !/^\d+$/.test(cols[1])) continue;
    const codes = [...cols[3].matchAll(/\(([A-Z]\d)(?:\s*\/\s*([A-Z]\d))?\)/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean);
    const ids = codes.map((c) => parCode.get(c)).filter((x): x is string => Boolean(x));
    if (!ids.length) throw new Error(`Par où commencer, étape ${cols[1]} : aucune fiche reconnue dans « ${cols[3]} »`);
    out.push({ n: Number(cols[1]), fiches: ids, pourquoi: cols[4] });
  }
  return out;
}
