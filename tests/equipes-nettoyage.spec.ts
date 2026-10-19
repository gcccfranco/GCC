import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md), tranche EQ-F :
// nettoyage. Le mécanisme des pôles a disparu (EQ1), les libellés aussi (EQ30). Tout est pur : on lit
// les sources, aucune page. Le fichier de migration (src/lib/equipes/migration.ts) est le seul à
// nommer encore les pôles : il lit la base d'avant.

const ROOT = path.resolve(__dirname, "..");
const lire = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function fichiers(dossier: string, sortie: string[] = []): string[] {
  for (const nom of readdirSync(path.join(ROOT, dossier))) {
    const rel = `${dossier}/${nom}`;
    if (statSync(path.join(ROOT, rel)).isDirectory()) fichiers(rel, sortie);
    else if (/\.(tsx?|json|css)$/.test(nom)) sortie.push(rel);
  }
  return sortie;
}

// Le critère de la spec (EQ1), à la lettre.
const CRITERE_EQ1 = /\bp[ôo]les?\b|TachePole|polesDe|isPoleMember|isTachePole/i;
// Le nom de la spec elle-même (« spec-equipes-sans-poles ») figure dans les commentaires : ce n'est pas le mécanisme.
const NOM_DE_LA_SPEC = /spec-equipes-sans-poles/g;

test("critère EQ1 : plus aucun pôle dans src ni dans firestore.rules, sauf la migration et la garde des règles", () => {
  const trouves: string[] = [];
  for (const rel of [...fichiers("src"), "firestore.rules"]) {
    if (rel === "src/lib/equipes/migration.ts") continue;
    lire(rel).split("\n").forEach((ligne, i) => {
      const nette = ligne.replace(NOM_DE_LA_SPEC, "");
      if (!CRITERE_EQ1.test(nette)) return;
      // La garde (EQ21) : plus personne ne crée de public `pole:`.
      if (rel === "firestore.rules" && nette.includes("(pole|equipe):")) return;
      trouves.push(`${rel}:${i + 1}  ${ligne.trim().slice(0, 110)}`);
    });
  }
  expect(trouves, trouves.join("\n")).toEqual([]);
});

test("les règles ne lisent plus users.poles ; la garde (pole|equipe) reste, une fois", () => {
  const rules = lire("firestore.rules");
  expect(rules).not.toMatch(/get\('poles'/);
  expect(rules.match(/\(pole\|equipe\):/g) ?? []).toHaveLength(1);
});

test("le profil simulé n'a plus de champ poles (la base d'après la migration)", () => {
  expect(lire("tests/helpers/fakeSession.ts")).not.toMatch(/\bpoles\b|recalculerPoles/);
});

// ── Libellés (EQ30) ─────────────────────────────────────────────────────────────────────────

type Arbre = { [k: string]: Arbre | string | string[] };
const feuilles = (o: Arbre, prefixe = ""): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === "string" ? [[`${prefixe}${k}`, v] as [string, string]]
      : Array.isArray(v) ? v.map((s, i) => [`${prefixe}${k}.${i}`, s] as [string, string])
        : feuilles(v as Arbre, `${prefixe}${k}.`));

const fr = JSON.parse(lire("src/locales/fr.json")) as Arbre;
const zh = JSON.parse(lire("src/locales/zh-CN.json")) as Arbre;
const cles = (o: Arbre) => new Set(feuilles(o).map(([k]) => k));

test("aucun texte du site ne parle de pôle (FR) ni de 部门 (中文)", () => {
  const fautifs = [
    ...feuilles(fr).filter(([, v]) => /\bp[ôo]les?\b/i.test(v)).map(([k]) => `fr ${k}`),
    ...feuilles(zh).filter(([, v]) => /部门/.test(v)).map(([k]) => `zh ${k}`),
  ];
  expect(fautifs, fautifs.join("\n")).toEqual([]);
});

test("les clés retirées par EQ30 n'existent plus, dans les deux langues", () => {
  const RETIREES = [
    "taches.pole", "taches.aucunPole", "taches.prevenirPole", "taches.polePrevenu", "taches.champs.pole", "taches.poles",
    "evenements.pourPole", "backOffice.reunionDePole", "backOffice.tachesDesPoles", "backOffice.plus.contenu.tesPoles",
    "backOffice.plus.contenu.tousLesPoles", "equipes.donnePole", "equipes.poleEquipe", "equipes.aucunPole", "tableauDeBord.reglages.poles",
  ];
  for (const arbre of [fr, zh]) {
    const toutes = [...cles(arbre)];
    for (const cle of RETIREES) expect(toutes.filter((k) => k === cle || k.startsWith(`${cle}.`)), cle).toEqual([]);
  }
});

test("le guide des tâches et des évènements parle des équipes, FR et 中文", () => {
  const section = (arbre: Arbre, id: string) =>
    JSON.stringify(((arbre.guide as Arbre).sections as Arbre)[id]);
  expect(section(fr, "taches")).toMatch(/équipe/i);
  expect(section(fr, "evenements")).toMatch(/équipe/i);
  expect(section(zh, "taches")).toContain("团队");
  expect(section(zh, "evenements")).toContain("团队");
});
