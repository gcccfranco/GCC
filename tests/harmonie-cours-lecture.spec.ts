import { expect, test } from "@playwright/test";
import { lireChapitre } from "../src/lib/harmonie/cours";

// Cours d'Harmonie, tranche C1 (docs/spec-cours-harmonie.md) : lire un chapitre
// au format de l'import C0 (`docs/harmonie/cours/*.md`). Fonction pure.

const CHAPITRE = `# 6. Tous les accords

| Id | Partie | Niveau | Statut |
| --- | --- | --- | --- |
| tous-les-accords | 2 | 2 | validée |

Un accord, c'est **trois notes** ou plus jouées ensemble.

## 6.1 Le principe de construction

On part de la *fondamentale*, puis on empile des tierces : \`C – E – G\`.

| Accord | Notes | Formule |
| --- | --- | --- |
| C | C – E – G | 1 – 3 – 5 |
| Cm \\| C- | C – Eb – G | 1 – b3 – 5 |

### Le cas du sus

> Le sus remplace la tierce.
> Il appelle sa résolution.

\`\`\`
| C  /  / / | F / G / |
\`\`\`

[[schéma : cercle-des-quintes]]

## 6.14 Exercices

1. Joue les accords de C à B.
    - en majeur
    - en mineur
2. Écris les notes de F#m7.
3. Chanteurs : chante la fondamentale
   puis la tierce.
`;

test("un chapitre se lit : titre, en-tête, intro, sous-parties, exercices", () => {
  const c = lireChapitre(CHAPITRE, "06-tous-les-accords.md");
  expect(c).toMatchObject({
    id: "tous-les-accords",
    numero: 6,
    titre: "Tous les accords",
    partie: 2,
    niveau: 2,
    statut: "validée",
    sousParties: ["6.1 Le principe de construction", "6.14 Exercices"],
    exercices: 3,
  });
  expect(c.intro).toEqual([{ t: "paragraphe", texte: "Un accord, c'est **trois notes** ou plus jouées ensemble." }]);
});

test("les blocs d'une sous-partie : paragraphe, tableau, titre, citation, grille, schéma", () => {
  const [principe] = lireChapitre(CHAPITRE, "06-tous-les-accords.md").contenu;
  expect(principe.blocs.map((b) => b.t)).toEqual(["paragraphe", "tableau", "titre", "citation", "code", "schema"]);
  expect(principe.blocs[1]).toEqual({
    t: "tableau",
    entetes: ["Accord", "Notes", "Formule"],
    lignes: [["C", "C – E – G", "1 – 3 – 5"], ["Cm | C-", "C – Eb – G", "1 – b3 – 5"]],
  });
  expect(principe.blocs[3]).toEqual({ t: "citation", texte: "Le sus remplace la tierce.\nIl appelle sa résolution." });
  expect(principe.blocs[4]).toEqual({ t: "code", texte: "| C  /  / / | F / G / |" });
  expect(principe.blocs[5]).toEqual({ t: "schema", nom: "cercle-des-quintes" });
});

test("une liste numérotée garde ses sous-listes et ses lignes de suite", () => {
  const exercices = lireChapitre(CHAPITRE, "06-tous-les-accords.md").contenu[1];
  expect(exercices.blocs).toEqual([{
    t: "liste",
    ordonnee: true,
    items: [
      { texte: "Joue les accords de C à B.", sous: { ordonnee: false, items: [{ texte: "en majeur" }, { texte: "en mineur" }] } },
      { texte: "Écris les notes de F#m7." },
      { texte: "Chanteurs : chante la fondamentale puis la tierce." },
    ],
  }]);
});

test("le mode d'emploi et les annexes n'ont ni numéro de niveau ni exercices", () => {
  const md = `# Mode d'emploi\n\n| Id | Partie | Niveau | Statut |\n| --- | --- | --- | --- |\n| mode-d-emploi | 0 | — | validée |\n\nCe cours s'adresse à tous.\n`;
  expect(lireChapitre(md, "00-mode-d-emploi.md")).toMatchObject({ id: "mode-d-emploi", numero: null, partie: 0, niveau: null, exercices: 0 });
});

test("un fichier mal formé arrête le build, avec le nom du fichier", () => {
  expect(() => lireChapitre("Pas de titre\n", "07-x.md")).toThrow(/07-x\.md/);
  expect(() => lireChapitre("# 7. X\n\nSans en-tête\n", "07-x.md")).toThrow(/en-tête/);
});
