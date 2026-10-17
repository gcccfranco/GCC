// Cours d'Harmonie, tranche C1 (docs/spec-cours-harmonie.md) : lire un
// chapitre de `docs/harmonie/cours/*.md`, au format de l'import C0. Lu au build
// (`scripts/build-cours.ts`) : un fichier mal formé lève une erreur qui nomme
// le fichier, et le build échoue plutôt que de publier un chapitre tronqué.

import type { BlocCours, Chapitre, ItemListe, SousPartie } from "@/types/cours";

const PUCE = /^(\s*)(- |\d+\. )/;

/** Cellules d'une ligne de tableau ; « \| » est une barre dans la cellule. */
function cellules(ligne: string): string[] {
  return ligne
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));
}

const retrait = (ligne: string) => ligne.match(/^\s*/)![0].length;

/** Une liste à partir de la ligne `i`, sous-listes (retrait plus grand) et
 *  lignes de suite (retrait plus grand, sans puce) comprises. */
function lireListe(lignes: string[], i: number): { bloc: { ordonnee: boolean; items: ItemListe[] }; suivant: number } {
  const base = retrait(lignes[i]);
  const ordonnee = /^\s*\d+\. /.test(lignes[i]);
  const items: ItemListe[] = [];
  while (i < lignes.length) {
    const l = lignes[i];
    if (!l.trim()) {
      // Une ligne vide ne coupe pas la liste si la suite est encore un de ses éléments.
      let j = i + 1;
      while (j < lignes.length && !lignes[j].trim()) j++;
      if (j < lignes.length && retrait(lignes[j]) === base && PUCE.test(lignes[j])) { i = j; continue; }
      break;
    }
    const r = retrait(l);
    if (r < base) break;
    if (r === base && PUCE.test(l)) {
      items.push({ texte: l.replace(PUCE, "").trim() });
      i++;
      continue;
    }
    const dernier = items[items.length - 1];
    if (!dernier) break;
    if (PUCE.test(l)) {
      const { bloc, suivant } = lireListe(lignes, i);
      dernier.sous = bloc;
      i = suivant;
      continue;
    }
    if (r > base) {
      dernier.texte += ` ${l.trim()}`;
      i++;
      continue;
    }
    break;
  }
  return { bloc: { ordonnee, items }, suivant: i };
}

/** Les blocs à partir de la ligne `i`, jusqu'au prochain « ## » ou la fin. */
function lireBlocs(lignes: string[], i: number): { blocs: BlocCours[]; suivant: number } {
  const blocs: BlocCours[] = [];
  while (i < lignes.length) {
    const l = lignes[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("## ")) break;
    if (l.startsWith("### ")) {
      blocs.push({ t: "titre", texte: l.slice(4).trim() });
      i++;
    } else if (l.startsWith("```")) {
      const debut = ++i;
      while (i < lignes.length && !lignes[i].startsWith("```")) i++;
      blocs.push({ t: "code", texte: lignes.slice(debut, i).join("\n") });
      i++;
    } else if (/^\[\[schéma : [a-z-]+\]\]$/.test(l.trim())) {
      blocs.push({ t: "schema", nom: l.trim().slice("[[schéma : ".length, -2) });
      i++;
    } else if (l.startsWith("|")) {
      const entetes = cellules(l);
      i += 2; // la ligne « | --- | »
      const lignesTableau: string[][] = [];
      while (i < lignes.length && lignes[i].startsWith("|")) lignesTableau.push(cellules(lignes[i++]));
      blocs.push({ t: "tableau", entetes, lignes: lignesTableau });
    } else if (l.startsWith(">")) {
      const texte: string[] = [];
      while (i < lignes.length && lignes[i].startsWith(">")) texte.push(lignes[i++].replace(/^>\s?/, ""));
      blocs.push({ t: "citation", texte: texte.join("\n") });
    } else if (PUCE.test(l)) {
      const { bloc, suivant } = lireListe(lignes, i);
      blocs.push({ t: "liste", ...bloc });
      i = suivant;
    } else {
      // Un paragraphe tient sur une ligne ; des lignes qui se suivent s'y recollent.
      const texte: string[] = [];
      while (i < lignes.length && lignes[i].trim() && !/^(#{2,3} |```|\||>|\[\[schéma)/.test(lignes[i]) && !PUCE.test(lignes[i])) {
        texte.push(lignes[i++].trim());
      }
      blocs.push({ t: "paragraphe", texte: texte.join(" ") });
    }
  }
  return { blocs, suivant: i };
}

export function lireChapitre(md: string, fichier: string): Chapitre {
  const erreur = (quoi: string) => new Error(`${fichier} : ${quoi}`);
  const lignes = md.replace(/\r\n/g, "\n").split("\n");
  const titre = lignes[0]?.match(/^# (?:(\d+)\. )?(.+)$/);
  if (!titre) throw erreur("première ligne « # N. Titre » attendue");

  let i = 1;
  while (i < lignes.length && !lignes[i].trim()) i++;
  if (cellules(lignes[i] ?? "").join("|") !== "Id|Partie|Niveau|Statut" || !/^\|\s*-/.test(lignes[i + 1] ?? "")) {
    throw erreur("tableau d'en-tête « Id | Partie | Niveau | Statut » attendu");
  }
  const [id, partie, niveau, statut] = cellules(lignes[i + 2] ?? "");
  if (!id || !/^[a-z0-9-]+$/.test(id)) throw erreur(`Id invalide : « ${id ?? ""} »`);
  if (!/^[0-4]$/.test(partie ?? "")) throw erreur(`Partie invalide : « ${partie ?? ""} »`);
  if (!/^([1-4]|—)$/.test(niveau ?? "")) throw erreur(`Niveau invalide : « ${niveau ?? ""} »`);

  const { blocs: intro, suivant } = lireBlocs(lignes, i + 3);
  const contenu: SousPartie[] = [];
  i = suivant;
  while (i < lignes.length) {
    if (!lignes[i].startsWith("## ")) { i++; continue; }
    const sousPartie: SousPartie = { titre: lignes[i].slice(3).trim(), blocs: [] };
    const lu = lireBlocs(lignes, i + 1);
    sousPartie.blocs = lu.blocs;
    contenu.push(sousPartie);
    i = lu.suivant;
  }

  // Exercices : les éléments de premier niveau des listes de « … Exercices ».
  const exercices = contenu
    .filter((s) => /Exercices\s*$/.test(s.titre))
    .flatMap((s) => s.blocs)
    .reduce((n, b) => n + (b.t === "liste" ? b.items.length : 0), 0);

  return {
    id,
    numero: titre[1] ? Number(titre[1]) : null,
    titre: titre[2].trim(),
    partie: Number(partie),
    niveau: niveau === "—" ? null : Number(niveau),
    statut,
    sousParties: contenu.map((s) => s.titre),
    exercices,
    intro,
    contenu,
  };
}
