// Outils NON installés en permanence (décision du 26/09/2026 : mermaid-cli
// pèse 141 Mo et remontait une dépendance du site, @floating-ui/core, à
// chaque `npm ci` sur Vercel). Avant de lancer :
//   npm i -D --no-save @mermaid-js/mermaid-cli dependency-cruiser
//   npx tsx scripts/diagrammes/generer.ts
// .puppeteerrc.cjs empêche le téléchargement d'un Chrome pendant cette install.
//
// Régénère la documentation visuelle : `npm run docs:diagrammes`.
//
//   1. dependency-cruiser analyse src/ et scripts/ ; les graphes de dépendances
//      regroupés par dossier sont réécrits dans docs/diagrammes/4x-*.mmd.
//   2. mmdc (mermaid-cli) rend chaque .mmd deux fois : un SVG clair, commité à
//      côté du .mmd, et une variante sombre qui ne sert qu'à la page HTML.
//   3. docs/diagrammes/index.html (un seul fichier, SVG en ligne, sans rien de
//      l'extérieur) et docs/ARCHITECTURE.md sont reconstruits.
//
// Les textes (titres, explications, fichiers clés, bizarreries) viennent de
// docs/diagrammes/catalogue.json ; les diagrammes écrits à la main, des .mmd.
// Puppeteer ne télécharge pas de navigateur (.puppeteerrc.cjs) : le rendu passe
// par le Chromium de Playwright, déjà installé pour les tests.

import { execFile, execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import { chromium } from "@playwright/test";

const run = promisify(execFile);
const RACINE = process.cwd();
const DOSSIER = path.join(RACINE, "docs", "diagrammes");
const BIN = path.join(RACINE, "node_modules", ".bin");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "diagrammes-"));

// ─── Catalogue ──────────────────────────────────────────────────────────────

type GrapheGenere = "couches" | "lib" | "composants" | "api";
type Diagramme = {
  id: string;
  titre: string;
  resume: string;
  fichiers: string[];
  incertain?: string[];
  genere?: GrapheGenere;
};
type Section = { id: string; titre: string; diagrammes: Diagramme[] };
type Catalogue = {
  titre: string;
  introduction: string[];
  fonctionnalites: { nom: string; etat: "present" | "absent" | "back-office"; detail: string }[];
  sections: Section[];
  incertitudes: string[];
  bizarreries: { titre: string; genre: string; detail: string }[];
};

const catalogue: Catalogue = JSON.parse(fs.readFileSync(path.join(DOSSIER, "catalogue.json"), "utf-8"));
const diagrammes = catalogue.sections.flatMap((s) => s.diagrammes);

// ─── 1. Graphes de dépendances (dependency-cruiser) ─────────────────────────

type Module = {
  source: string;
  dependencies: { resolved: string; dependencyTypes: string[]; couldNotResolve: boolean }[];
};

function analyser(): Module[] {
  const sortie = execFileSync(
    path.join(BIN, "depcruise"),
    [
      "src", "scripts",
      "--no-config",
      "--ts-config", "tsconfig.json",
      "--ts-pre-compilation-deps",
      "--exclude", "(^|/)node_modules/|^scripts/tmp/",
      "--do-not-follow", "node_modules",
      "--output-type", "json",
    ],
    { cwd: RACINE, maxBuffer: 256 * 1024 * 1024 },
  );
  return (JSON.parse(sortie.toString()) as { modules: Module[] }).modules;
}

type Regroupement = {
  /** Nom du nœud d'un fichier, ou null s'il n'entre pas dans ce graphe. */
  groupe: (fichier: string) => string | null;
  /** Seuls les imports partant de ces fichiers comptent (tous par défaut). */
  depuis?: (fichier: string) => boolean;
  typesCompris: boolean;
  /** Au-delà, la flèche est épaisse. */
  seuilEpais: number;
  cadre?: (groupe: string) => string;
};

const dossier = (f: string, prefixe: string, racine: string) => {
  const reste = f.slice(prefixe.length);
  return reste.includes("/") ? reste.split("/")[0] : racine;
};

const REGROUPEMENTS: Record<GrapheGenere, Regroupement> = {
  couches: {
    typesCompris: true,
    seuilEpais: 60,
    groupe: (f) => {
      if (f.startsWith("src/app/api/")) return "src/app/api";
      if (f.startsWith("src/app/")) return "src/app (pages)";
      for (const d of ["components", "lib", "hooks", "types", "locales"]) if (f.startsWith(`src/${d}/`)) return `src/${d}`;
      if (f.startsWith("scripts/jianpu/")) return "scripts/jianpu";
      if (f.startsWith("scripts/")) return "scripts (build)";
      if (f.startsWith("tests/") || f === "playwright.config.ts") return "tests";
      return null;
    },
  },
  lib: {
    typesCompris: false,
    seuilEpais: 10,
    groupe: (f) => (f.startsWith("src/lib/") ? `lib/${dossier(f, "src/lib/", "(racine)")}` : null),
  },
  composants: {
    typesCompris: false,
    seuilEpais: 40,
    depuis: (f) => f.startsWith("src/components/"),
    groupe: (f) => {
      if (f.startsWith("src/components/")) return `components/${dossier(f, "src/components/", "(racine)")}`;
      if (f.startsWith("src/lib/")) return "src/lib";
      if (f.startsWith("src/hooks/")) return "src/hooks";
      return null;
    },
    cadre: (g) => (g.startsWith("components/") ? "src/components" : "Modules partagés"),
  },
  api: {
    typesCompris: false,
    seuilEpais: 12,
    depuis: (f) => f.startsWith("src/app/api/"),
    groupe: (f) => {
      if (f.startsWith("src/app/api/")) return `/api/${dossier(f, "src/app/api/", "")}`;
      if (f.startsWith("src/lib/")) return `lib/${dossier(f, "src/lib/", "(racine)")}`;
      return null;
    },
    cadre: (g) => (g.startsWith("/api/") ? "Routes API" : "src/lib"),
  },
};

function grapheMermaid(modules: Module[], r: Regroupement): { mmd: string; noeuds: number } {
  const fichiersPar = new Map<string, number>();
  for (const m of modules) {
    const g = r.groupe(m.source);
    if (g) fichiersPar.set(g, (fichiersPar.get(g) ?? 0) + 1);
  }
  const aretes = new Map<string, number>();
  for (const m of modules) {
    const a = r.groupe(m.source);
    if (!a || (r.depuis && !r.depuis(m.source))) continue;
    for (const d of m.dependencies) {
      if (d.couldNotResolve) continue;
      if (!r.typesCompris && d.dependencyTypes.includes("type-only")) continue;
      const b = r.groupe(d.resolved);
      if (!b || b === a) continue;
      const cle = `${a}\u0000${b}`;
      aretes.set(cle, (aretes.get(cle) ?? 0) + 1);
    }
  }
  // Seuls les dossiers reliés à un autre sont dessinés.
  const relies = new Set([...aretes.keys()].flatMap((k) => k.split("\u0000")));
  const noms = [...relies].sort();
  const id = new Map(noms.map((n, i) => [n, `n${i}`]));
  const pluriel = (n: number) => `${n} fichier${n > 1 ? "s" : ""}`;
  const noeud = (n: string) => `${id.get(n)}["${n}<br/>${pluriel(fichiersPar.get(n) ?? 0)}"]`;

  const lignes = [
    "%% Généré par scripts/diagrammes/generer.ts (dependency-cruiser). Ne pas modifier à la main.",
    "flowchart LR",
  ];
  if (r.cadre) {
    const cadres = new Map<string, string[]>();
    for (const n of noms) {
      const c = r.cadre(n);
      cadres.set(c, [...(cadres.get(c) ?? []), n]);
    }
    [...cadres.entries()].forEach(([c, membres], i) => {
      lignes.push(`  subgraph C${i}["${c}"]`, ...membres.map((n) => `    ${noeud(n)}`), "  end");
    });
  } else {
    lignes.push(...noms.map((n) => `  ${noeud(n)}`));
  }
  for (const [cle, n] of [...aretes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [a, b] = cle.split("\u0000");
    lignes.push(`  ${id.get(a)} ${n >= r.seuilEpais ? "==>" : "-->"}|${n}| ${id.get(b)}`);
  }
  return { mmd: lignes.join("\n") + "\n", noeuds: noms.length };
}

// ─── 2. Rendu (mmdc) ────────────────────────────────────────────────────────

const POLICE =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

const THEMES = {
  clair: {
    darkMode: false,
    fontFamily: POLICE,
    fontSize: "15px",
    background: "#ffffff",
    primaryColor: "#eef2fc",
    primaryBorderColor: "#8fa3e0",
    primaryTextColor: "#1b1d22",
    secondaryColor: "#fdf1e7",
    secondaryBorderColor: "#e3a878",
    secondaryTextColor: "#1b1d22",
    tertiaryColor: "#f3f4f7",
    tertiaryBorderColor: "#c9cdd6",
    tertiaryTextColor: "#1b1d22",
    mainBkg: "#eef2fc",
    nodeBorder: "#8fa3e0",
    clusterBkg: "#f7f8fa",
    clusterBorder: "#d5d9e1",
    titleColor: "#1b1d22",
    lineColor: "#6a7080",
    textColor: "#1b1d22",
    edgeLabelBackground: "#ffffff",
    actorBkg: "#eef2fc",
    actorBorder: "#8fa3e0",
    actorTextColor: "#1b1d22",
    actorLineColor: "#b4bac6",
    signalColor: "#3a3f4b",
    signalTextColor: "#1b1d22",
    labelBoxBkgColor: "#fdf1e7",
    labelBoxBorderColor: "#e3a878",
    labelTextColor: "#1b1d22",
    loopTextColor: "#1b1d22",
    noteBkgColor: "#fff7df",
    noteBorderColor: "#e3c77a",
    noteTextColor: "#1b1d22",
    activationBkgColor: "#e3e8f8",
    activationBorderColor: "#8fa3e0",
    sequenceNumberColor: "#ffffff",
    attributeBackgroundColorOdd: "#ffffff",
    attributeBackgroundColorEven: "#f5f6f9",
  },
  sombre: {
    darkMode: true,
    fontFamily: POLICE,
    fontSize: "15px",
    background: "#16181d",
    primaryColor: "#1e2745",
    primaryBorderColor: "#5a73c4",
    primaryTextColor: "#e6e8ee",
    secondaryColor: "#34261b",
    secondaryBorderColor: "#a8713f",
    secondaryTextColor: "#e6e8ee",
    tertiaryColor: "#1d2026",
    tertiaryBorderColor: "#3a3f4b",
    tertiaryTextColor: "#e6e8ee",
    mainBkg: "#1e2745",
    nodeBorder: "#5a73c4",
    clusterBkg: "#1a1c22",
    clusterBorder: "#343844",
    titleColor: "#e6e8ee",
    lineColor: "#9aa1b0",
    textColor: "#e6e8ee",
    edgeLabelBackground: "#16181d",
    actorBkg: "#1e2745",
    actorBorder: "#5a73c4",
    actorTextColor: "#e6e8ee",
    actorLineColor: "#4a5060",
    signalColor: "#c9cedb",
    signalTextColor: "#e6e8ee",
    labelBoxBkgColor: "#34261b",
    labelBoxBorderColor: "#a8713f",
    labelTextColor: "#e6e8ee",
    loopTextColor: "#e6e8ee",
    noteBkgColor: "#2f2a1a",
    noteBorderColor: "#7d6a33",
    noteTextColor: "#ece6cf",
    activationBkgColor: "#26305a",
    activationBorderColor: "#5a73c4",
    sequenceNumberColor: "#16181d",
    attributeBackgroundColorOdd: "#1d2026",
    attributeBackgroundColorEven: "#22252c",
  },
};
type Theme = keyof typeof THEMES;

function ecrireConfigs(): { mermaid: Record<Theme, string>; puppeteer: string } {
  const executablePath = chromium.executablePath();
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Chromium de Playwright introuvable (${executablePath}) : lancer « npx playwright install chromium ».`);
  }
  const puppeteer = path.join(TMP, "puppeteer.json");
  fs.writeFileSync(puppeteer, JSON.stringify({ executablePath, headless: true }));
  const mermaid = {} as Record<Theme, string>;
  for (const theme of Object.keys(THEMES) as Theme[]) {
    mermaid[theme] = path.join(TMP, `mermaid-${theme}.json`);
    fs.writeFileSync(
      mermaid[theme],
      JSON.stringify({
        theme: "base",
        fontFamily: POLICE,
        themeVariables: THEMES[theme],
        flowchart: { curve: "basis", padding: 14, nodeSpacing: 38, rankSpacing: 52 },
        sequence: { mirrorActors: false, wrap: true, width: 170, actorMargin: 44, noteAlign: "left" },
        er: { entityPadding: 12 },
      }),
    );
  }
  return { mermaid, puppeteer };
}

async function enParallele(taches: (() => Promise<void>)[], n: number) {
  let suivante = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (suivante < taches.length) await taches[suivante++]();
    }),
  );
}

// ─── 3. SVG pour la page ────────────────────────────────────────────────────

/** Rend un SVG de mmdc insérable plusieurs fois dans une même page : chaque id
 *  interne (flèches des séquences, marqueurs…) prend le préfixe de l'id racine,
 *  unique, la taille devient fixe et le fond transparent. */
function pourLaPage(svg: string, classe: string): { svg: string; w: number; h: number } {
  const racine = /<svg\b[^>]*?\sid="([^"]+)"/.exec(svg)?.[1];
  const vb = /viewBox="([^"]+)"/.exec(svg)?.[1].trim().split(/[\s,]+/).map(Number);
  if (!racine || !vb) throw new Error("SVG inattendu (pas d'id ou de viewBox)");
  const [, , w, h] = vb.map((v) => Math.ceil(v));
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((i) => i !== racine));
  let s = svg
    .replace(/<\?xml[^>]*>\s*/, "")
    // Deux décimales suffisent à l'écran : la page pèse un tiers de moins.
    .replace(/(\d\.\d\d)\d+/g, "$1")
    .replace(/(\sid=")([^"]+)(")/g, (m, a, i, b) => (ids.has(i) ? `${a}${racine}-${i}${b}` : m))
    .replace(/(aria-(?:labelledby|describedby)=")([^"]+)(")/g, (m, a, i, b) => (ids.has(i) ? `${a}${racine}-${i}${b}` : m))
    .replace(/#([A-Za-z_][\w.-]*)/g, (m, i) => (ids.has(i) ? `#${racine}-${i}` : m));
  s = s.replace(/<svg\b[^>]*>/, (balise) =>
    balise
      .replace(/\s(width|height|style)="[^"]*"/g, "")
      .replace("<svg", `<svg class="${classe}" width="${w}" height="${h}"`),
  );
  return { svg: s, w, h };
}

// ─── 4. Page HTML et ARCHITECTURE.md ────────────────────────────────────────

const echapper = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const GENRE: Record<string, string> = {
  flowchart: "flowchart",
  sequenceDiagram: "séquence",
  erDiagram: "entités",
};
function genre(mmd: string): string {
  const premiere = mmd.split("\n").find((l) => l.trim() && !l.trim().startsWith("%%")) ?? "";
  return GENRE[premiere.trim().split(/\s/)[0]] ?? "diagramme";
}

const ETAT = {
  present: { libelle: "présent", classe: "ok" },
  "back-office": { libelle: "back-office", classe: "bo" },
  absent: { libelle: "absent", classe: "non" },
} as const;

type Rendu = { d: Diagramme; genre: string; clair: ReturnType<typeof pourLaPage>; sombre: ReturnType<typeof pourLaPage> };

function page(rendus: Map<string, Rendu>, chiffres: { chants: number; routes: number; modules: number }, date: string): string {
  const liste = (fichiers: string[]) => fichiers.map((f) => `<li><code>${echapper(f)}</code></li>`).join("");
  const nav = catalogue.sections
    .map(
      (s) => `<li class="groupe"><span>${echapper(s.titre)}</span><ul>${s.diagrammes
        .map((d) => `<li><a href="#d-${d.id}">${echapper(d.titre)}</a></li>`)
        .join("")}</ul></li>`,
    )
    .join("");
  const etat = catalogue.fonctionnalites
    .map(
      (f) => `<li><span class="nom">${echapper(f.nom)}</span><span class="pastille ${ETAT[f.etat].classe}">${ETAT[f.etat].libelle}</span><span class="detail">${echapper(f.detail)}</span></li>`,
    )
    .join("");
  const sections = catalogue.sections
    .map((s) => {
      const cartes = s.diagrammes
        .map((d) => {
          const r = rendus.get(d.id)!;
          const incertain = d.incertain?.length
            ? `<aside class="incertain"><strong>Incertain</strong>${d.incertain.map((t) => `<p>${echapper(t)}</p>`).join("")}</aside>`
            : "";
          return `<article class="diagramme" id="d-${d.id}">
<header><p class="directive">{${r.genre}}</p><h3><a href="#d-${d.id}">${echapper(d.titre)}</a></h3></header>
<p class="resume">${echapper(d.resume)}</p>
<figure class="vue" data-w="${r.clair.w}" data-h="${r.clair.h}">
<div class="fenetre" tabindex="0" role="group" aria-label="${echapper(d.titre)} : glisser pour déplacer, Ctrl ou ⌘ avec la molette pour zoomer, touches + − et 0">
<div class="scene">${r.clair.svg}${r.sombre.svg}</div>
</div>
<div class="outils"><button type="button" data-zoom="moins" aria-label="Dézoomer">−</button><output class="niveau">100 %</output><button type="button" data-zoom="plus" aria-label="Zoomer">+</button><button type="button" data-zoom="ajuster">Ajuster</button><button type="button" data-zoom="plein" aria-pressed="false">Plein écran</button><span class="aide">Glisser pour déplacer · Ctrl/⌘ + molette ou pincer pour zoomer</span></div>
</figure>
<div class="fichiers"><h4>Fichiers clés</h4><ul>${liste(d.fichiers)}</ul></div>
${incertain}
</article>`;
        })
        .join("\n");
      return `<section class="partie" id="s-${s.id}">
<h2><span class="directive">{section: ${s.diagrammes.length} diagramme${s.diagrammes.length > 1 ? "s" : ""}}</span>${echapper(s.titre)}</h2>
${cartes}
</section>`;
    })
    .join("\n");
  const incertitudes = catalogue.incertitudes.map((t) => `<li>${echapper(t)}</li>`).join("");
  const bizarreries = catalogue.bizarreries
    .map((b) => `<li><h3>${echapper(b.titre)} <span class="genre">${echapper(b.genre)}</span></h3><p>${echapper(b.detail)}</p></li>`)
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${echapper(catalogue.titre)}</title>
<meta name="description" content="Fonctionnement de GCC Louange, fonctionnalité par fonctionnalité : architecture, séquences, données, dépendances.">
<style>${CSS}</style>
</head>
<body>
<a class="saut" href="#contenu">Aller au contenu</a>
<header class="barre"><span class="marque">Atlas <b>GCC Louange</b></span><button type="button" id="bouton-sommaire" aria-expanded="false" aria-controls="sommaire">Sommaire</button></header>
<div class="cadre">
<nav id="sommaire" class="sommaire" aria-label="Sommaire">
<p class="marque">Atlas <b>GCC Louange</b></p>
<ul>
<li><a href="#etat">Ce qui existe</a></li>
${nav}
<li class="groupe"><span>Bilan</span><ul><li><a href="#incertain">Points incertains</a></li><li><a href="#bizarreries">Bizarreries</a></li></ul></li>
</ul>
<div class="theme" role="group" aria-label="Thème"><button type="button" data-theme-choix="auto">Auto</button><button type="button" data-theme-choix="light">Clair</button><button type="button" data-theme-choix="dark">Sombre</button></div>
</nav>
<main id="contenu">
<header class="entete">
<p class="directive">{title: ${echapper(catalogue.titre)}}</p>
<h1>Comment marche GCC Louange</h1>
${catalogue.introduction.map((p, i) => `<p${i === 0 ? ' class="chapo"' : ""}>${echapper(p)}</p>`).join("\n")}
<dl class="chiffres">
<div><dt>chants</dt><dd>${chiffres.chants}</dd></div>
<div><dt>routes API</dt><dd>${chiffres.routes}</dd></div>
<div><dt>modules analysés</dt><dd>${chiffres.modules}</dd></div>
<div><dt>diagrammes</dt><dd>${diagrammes.length}</dd></div>
</dl>
<p class="date">Généré le ${date} par <code>npm run docs:diagrammes</code>.</p>
</header>
<section class="partie" id="etat">
<h2><span class="directive">{section: ${catalogue.fonctionnalites.length} lignes}</span>Ce qui existe</h2>
<ul class="etat">${etat}</ul>
</section>
${sections}
<section class="partie" id="incertain">
<h2><span class="directive">{section: bilan}</span>Points incertains</h2>
<ul class="puces">${incertitudes}</ul>
</section>
<section class="partie" id="bizarreries">
<h2><span class="directive">{section: bilan}</span>Bizarreries repérées</h2>
<ul class="bizarreries">${bizarreries}</ul>
</section>
<footer class="pied"><p>Sources : <code>docs/diagrammes/*.mmd</code> et <code>docs/diagrammes/catalogue.json</code>. Les graphes de dépendances sont recalculés à chaque génération.</p></footer>
</main>
</div>
<script>${JS}</script>
</body>
</html>
`;
}

function markdown(date: string): string {
  const l: string[] = [
    "<!-- Fichier généré par `npm run docs:diagrammes` (scripts/diagrammes/generer.ts). Modifier docs/diagrammes/*.mmd et docs/diagrammes/catalogue.json, pas ce fichier. -->",
    "",
    `# ${catalogue.titre}`,
    "",
    ...catalogue.introduction.flatMap((p) => [p, ""]),
    `Version interactive, lisible hors ligne (zoom, thème sombre) : [diagrammes/index.html](diagrammes/index.html). Généré le ${date}.`,
    "",
    "## Ce qui existe",
    "",
    "| Fonctionnalité | État | Détail |",
    "|---|---|---|",
    ...catalogue.fonctionnalites.map((f) => `| ${f.nom} | ${ETAT[f.etat].libelle} | ${f.detail} |`),
    "",
  ];
  for (const s of catalogue.sections) {
    l.push(`## ${s.titre}`, "");
    for (const d of s.diagrammes) {
      const mmd = fs.readFileSync(path.join(DOSSIER, `${d.id}.mmd`), "utf-8").trimEnd();
      l.push(`### ${d.titre}`, "", d.resume, "", `**Fichiers clés** : ${d.fichiers.map((f) => `\`${f}\``).join(", ")}`, "");
      for (const t of d.incertain ?? []) l.push(`> **Incertain** : ${t}`, "");
      l.push("```mermaid", mmd, "```", "", `[SVG](diagrammes/${d.id}.svg)`, "");
    }
  }
  l.push("## Points incertains", "", ...catalogue.incertitudes.map((t) => `- ${t}`), "");
  l.push("## Bizarreries repérées", "", ...catalogue.bizarreries.map((b) => `- **${b.titre}** (${b.genre}) : ${b.detail}`), "");
  return l.join("\n");
}

// ─── Programme ──────────────────────────────────────────────────────────────

async function main() {
  const manquants = diagrammes.flatMap((d) => d.fichiers.filter((f) => !fs.existsSync(path.join(RACINE, f))).map((f) => `${d.id} → ${f}`));

  const modules = analyser();
  for (const d of diagrammes) {
    if (!d.genere) continue;
    const { mmd, noeuds } = grapheMermaid(modules, REGROUPEMENTS[d.genere]);
    fs.writeFileSync(path.join(DOSSIER, `${d.id}.mmd`), mmd);
    console.log(`✓ ${d.id}.mmd (${noeuds} nœuds)`);
  }

  const { mermaid, puppeteer } = ecrireConfigs();
  const echecs: string[] = [];
  const taches = diagrammes.flatMap((d) =>
    (Object.keys(THEMES) as Theme[]).map((theme) => async () => {
      const sortie = theme === "clair" ? path.join(DOSSIER, `${d.id}.svg`) : path.join(TMP, `${d.id}-sombre.svg`);
      try {
        await run(path.join(BIN, "mmdc"), [
          "-q",
          "-i", path.join(DOSSIER, `${d.id}.mmd`),
          "-o", sortie,
          "-c", mermaid[theme],
          "-p", puppeteer,
          "-I", `d-${d.id}-${theme}`,
          "-b", theme === "clair" ? "white" : "transparent",
        ]);
      } catch (e) {
        const err = e as { stderr?: string; message: string };
        echecs.push(`${d.id} (${theme}) : ${(err.stderr || err.message).split("\n").slice(0, 6).join("\n")}`);
      }
    }),
  );
  await enParallele(taches, Math.max(2, Math.min(6, os.cpus().length - 1)));
  if (echecs.length) {
    console.error(`✗ ${echecs.length} rendu(s) en échec :\n${echecs.join("\n\n")}`);
    process.exit(1);
  }
  console.log(`✓ ${diagrammes.length} diagrammes rendus (clair + sombre)`);

  const rendus = new Map<string, Rendu>();
  for (const d of diagrammes) {
    const mmd = fs.readFileSync(path.join(DOSSIER, `${d.id}.mmd`), "utf-8");
    rendus.set(d.id, {
      d,
      genre: genre(mmd),
      clair: pourLaPage(fs.readFileSync(path.join(DOSSIER, `${d.id}.svg`), "utf-8"), "svg-clair"),
      sombre: pourLaPage(fs.readFileSync(path.join(TMP, `${d.id}-sombre.svg`), "utf-8"), "svg-sombre"),
    });
  }

  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const chiffres = {
    chants: fs.readdirSync(path.join(RACINE, "content", "songs")).filter((f) => f.endsWith(".cho") && !f.startsWith("_")).length,
    routes: modules.filter((m) => /^src\/app\/api\/.*\/route\.ts$/.test(m.source)).length,
    modules: modules.filter((m) => m.source.startsWith("src/")).length,
  };
  const html = page(rendus, chiffres, date);
  fs.writeFileSync(path.join(DOSSIER, "index.html"), html);
  console.log(`✓ docs/diagrammes/index.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} Mo)`);
  fs.writeFileSync(path.join(RACINE, "docs", "ARCHITECTURE.md"), markdown(date));
  console.log("✓ docs/ARCHITECTURE.md");

  fs.rmSync(TMP, { recursive: true, force: true });
  if (manquants.length) {
    console.warn(`⚠ Fichiers clés introuvables (catalogue.json à mettre à jour) :\n  ${manquants.join("\n  ")}`);
    process.exitCode = 1;
  }
}

// ─── Styles et script de la page ────────────────────────────────────────────

const CSS = `
:root{
  --fond:#f3f4f7;--surface:#ffffff;--surface-2:#eceef3;--encre:#1b1d22;--encre-2:#565c69;--filet:#dcdfe6;
  --accent:#3f63cf;--accent-doux:#e7ecfb;--scene:#fbfbfd;
  --ok:#17773b;--ok-doux:#e5f4ea;--bo:#b04a0c;--bo-doux:#fcece0;--non:#b91c1c;--non-doux:#fbe8e8;
  --note:#8a5a00;--note-doux:#fff6de;
  --texte:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;
  --fond:#111317;--surface:#181a1f;--surface-2:#20232a;--encre:#e6e8ee;--encre-2:#a3a9b6;--filet:#2c3039;
  --accent:#8ea6ef;--accent-doux:#1f2744;--scene:#16181d;
  --ok:#72d394;--ok-doux:#15301f;--bo:#f2a263;--bo-doux:#35241a;--non:#f28b8b;--non-doux:#3b1d1d;
  --note:#f0cf73;--note-doux:#2d2715;}}
:root[data-theme="dark"]{color-scheme:dark;
  --fond:#111317;--surface:#181a1f;--surface-2:#20232a;--encre:#e6e8ee;--encre-2:#a3a9b6;--filet:#2c3039;
  --accent:#8ea6ef;--accent-doux:#1f2744;--scene:#16181d;
  --ok:#72d394;--ok-doux:#15301f;--bo:#f2a263;--bo-doux:#35241a;--non:#f28b8b;--non-doux:#3b1d1d;
  --note:#f0cf73;--note-doux:#2d2715;}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(env(safe-area-inset-top,0px) + 72px)}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--fond);color:var(--encre);font:15px/1.6 var(--texte);-webkit-text-size-adjust:100%}
body.fige{overflow:hidden}
a{color:var(--accent)}
code{font-family:var(--mono);font-size:.84em}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.saut{position:absolute;left:-9999px}.saut:focus{left:16px;top:16px;z-index:50;background:var(--surface);padding:8px 12px;border-radius:8px}
.directive{font-family:var(--mono);font-size:12px;letter-spacing:.02em;color:var(--encre-2);margin:0}
.marque{margin:0;font-weight:500;color:var(--encre-2)}.marque b{color:var(--encre);font-weight:700}
.barre{display:none}
.cadre{display:grid;grid-template-columns:250px minmax(0,1fr);max-width:1320px;margin:0 auto}
.sommaire{position:sticky;top:env(safe-area-inset-top,0px);height:100vh;overflow-y:auto;padding:28px 18px 28px 20px;border-right:1px solid var(--filet);font-size:14px}
.sommaire>.marque{margin-bottom:22px;font-size:15px}
.sommaire ul{list-style:none;margin:0;padding:0}
.sommaire li{margin:0}
.sommaire a{display:block;padding:4px 8px;border-radius:6px;color:var(--encre);text-decoration:none;line-height:1.35}
.sommaire a:hover{background:var(--surface-2)}
.sommaire a[aria-current="true"]{background:var(--accent-doux);color:var(--accent);font-weight:600}
.sommaire .groupe{margin-top:16px}
.sommaire .groupe>span{display:block;padding:0 8px 4px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--encre-2)}
.theme{display:flex;gap:4px;margin-top:24px;padding:3px;background:var(--surface-2);border-radius:8px}
.theme button{flex:1;border:0;background:transparent;color:var(--encre-2);font:inherit;font-size:12px;padding:5px 0;border-radius:6px;cursor:pointer}
.theme button[aria-pressed="true"]{background:var(--surface);color:var(--encre);box-shadow:0 1px 2px rgba(0,0,0,.12)}
main{padding:40px 40px 80px;min-width:0}
.entete{max-width:70ch;margin-bottom:12px}
h1{font-size:clamp(28px,4vw,40px);line-height:1.1;letter-spacing:-.02em;margin:6px 0 16px;text-wrap:balance}
.chapo{font-size:17px}
.entete p{margin:0 0 12px}
.chiffres{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;margin:24px 0 12px;background:var(--filet);border:1px solid var(--filet);border-radius:10px;overflow:hidden}
.chiffres div{background:var(--surface);padding:12px 14px}
.chiffres dt{font-size:12px;color:var(--encre-2)}
.chiffres dd{margin:0;font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.date{font-size:13px;color:var(--encre-2)}
.partie{margin-top:56px}
h2{font-size:24px;letter-spacing:-.01em;margin:0 0 20px;line-height:1.2;text-wrap:balance}
h2 .directive{display:block;margin-bottom:4px}
.etat{list-style:none;margin:0;padding:0;border-top:1px solid var(--filet)}
.etat li{display:grid;grid-template-columns:minmax(0,15rem) 7.5rem minmax(0,1fr);gap:4px 16px;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--filet)}
.etat .nom{font-weight:600}
.etat .detail{color:var(--encre-2)}
.pastille{justify-self:start;font-size:12px;font-weight:600;padding:1px 9px;border-radius:999px;white-space:nowrap}
.pastille.ok{color:var(--ok);background:var(--ok-doux)}
.pastille.bo{color:var(--bo);background:var(--bo-doux)}
.pastille.non{color:var(--non);background:var(--non-doux)}
.diagramme{background:var(--surface);border:1px solid var(--filet);border-radius:14px;padding:22px 22px 18px;margin-bottom:24px}
.diagramme h3{font-size:19px;margin:2px 0 8px;letter-spacing:-.01em}
.diagramme h3 a{color:inherit;text-decoration:none}
.diagramme h3 a:hover{text-decoration:underline}
.resume{max-width:72ch;margin:0 0 16px}
.vue{margin:0 0 16px}
.fenetre{position:relative;overflow:auto;background:var(--scene);border:1px solid var(--filet);border-radius:10px;max-height:72vh}
.js .fenetre{overflow:hidden;touch-action:none;cursor:grab;max-height:none}
.js .fenetre:active{cursor:grabbing}
.scene{position:relative;display:inline-block;padding:0}
.js .scene{position:absolute;left:0;top:0;transform-origin:0 0}
.scene>svg{display:block;max-width:none;height:auto}
.scene>.svg-sombre{display:none}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .scene>.svg-clair{display:none}:root:not([data-theme="light"]) .scene>.svg-sombre{display:block}}
:root[data-theme="dark"] .scene>.svg-clair{display:none}
:root[data-theme="dark"] .scene>.svg-sombre{display:block}
.outils{display:none;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
.js .outils{display:flex}
.outils button{font:inherit;font-size:13px;min-height:32px;min-width:32px;padding:0 10px;border:1px solid var(--filet);background:var(--surface);color:var(--encre);border-radius:8px;cursor:pointer}
.outils button:hover{background:var(--surface-2)}
.outils button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--surface)}
.niveau{min-width:4.2em;text-align:center;font-size:13px;color:var(--encre-2);font-variant-numeric:tabular-nums}
.aide{font-size:12px;color:var(--encre-2);margin-left:auto}
.vue.plein{position:fixed;inset:0;z-index:40;margin:0;background:var(--fond);padding:calc(env(safe-area-inset-top,0px) + 12px) 12px calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;flex-direction:column}
.vue.plein .fenetre{flex:1;height:auto!important}
.fichiers h4{margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--encre-2)}
.fichiers ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.fichiers li code{display:inline-block;background:var(--surface-2);padding:2px 8px;border-radius:6px;overflow-wrap:anywhere}
.incertain{margin-top:14px;padding:10px 14px;border-radius:10px;background:var(--note-doux);color:var(--encre)}
.incertain strong{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--note)}
.incertain p{margin:4px 0 0}
.puces{max-width:75ch;padding-left:20px}
.puces li{margin-bottom:8px}
.bizarreries{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,21rem),1fr));gap:12px}
.bizarreries li{background:var(--surface);border:1px solid var(--filet);border-radius:12px;padding:14px 16px}
.bizarreries h3{font-size:15px;margin:0 0 6px;line-height:1.35}
.bizarreries p{margin:0;color:var(--encre-2);font-size:14px}
.genre{display:inline-block;font-family:var(--mono);font-size:11px;font-weight:500;color:var(--encre-2);background:var(--surface-2);padding:0 6px;border-radius:5px;vertical-align:2px}
.pied{margin-top:56px;padding-top:16px;border-top:1px solid var(--filet);font-size:13px;color:var(--encre-2)}
@media (max-width:900px){
  .cadre{display:block}
  .barre{display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:env(safe-area-inset-top,0px);z-index:30;background:var(--fond);border-bottom:1px solid var(--filet);padding:10px 16px}
  .barre button{font:inherit;font-size:14px;border:1px solid var(--filet);background:var(--surface);color:var(--encre);border-radius:8px;padding:6px 12px;cursor:pointer}
  .sommaire{display:none;position:fixed;inset:calc(env(safe-area-inset-top,0px) + 53px) 0 0 0;height:auto;z-index:29;background:var(--fond);border-right:0;padding:12px 16px 32px}
  .sommaire.ouvert{display:block}
  .sommaire>.marque{display:none}
  main{padding:24px 16px 64px}
  .diagramme{padding:16px 14px 14px;border-radius:12px}
  .etat li{grid-template-columns:minmax(0,1fr) auto}
  .etat .detail{grid-column:1/-1}
  .chiffres{grid-template-columns:repeat(2,minmax(0,1fr))}
  .aide{display:none}
}
`;

const JS = `
(function(){
  var racine=document.documentElement;racine.classList.add("js");
  var CLE="atlas-theme";
  function marquerTheme(){var v=racine.getAttribute("data-theme")||"auto";document.querySelectorAll("[data-theme-choix]").forEach(function(b){b.setAttribute("aria-pressed",String(b.getAttribute("data-theme-choix")===v))})}
  try{var garde=localStorage.getItem(CLE);if(garde==="light"||garde==="dark")racine.setAttribute("data-theme",garde)}catch(e){}
  marquerTheme();
  document.querySelectorAll("[data-theme-choix]").forEach(function(b){b.addEventListener("click",function(){var v=b.getAttribute("data-theme-choix");if(v==="auto")racine.removeAttribute("data-theme");else racine.setAttribute("data-theme",v);try{localStorage.setItem(CLE,v)}catch(e){}marquerTheme()})});

  var nav=document.getElementById("sommaire"),bouton=document.getElementById("bouton-sommaire");
  function fermerNav(){nav.classList.remove("ouvert");bouton.setAttribute("aria-expanded","false")}
  bouton.addEventListener("click",function(){var o=nav.classList.toggle("ouvert");bouton.setAttribute("aria-expanded",String(o))});
  nav.addEventListener("click",function(e){if(e.target.closest("a"))fermerNav()});
  var liens={};nav.querySelectorAll("a[href^='#']").forEach(function(a){liens[a.getAttribute("href").slice(1)]=a});
  if("IntersectionObserver" in window){var courant=null;var obs=new IntersectionObserver(function(entrees){entrees.forEach(function(en){if(en.isIntersecting&&liens[en.target.id]){if(courant)courant.removeAttribute("aria-current");courant=liens[en.target.id];courant.setAttribute("aria-current","true")}})},{rootMargin:"-30% 0px -60% 0px"});Object.keys(liens).forEach(function(id){var el=document.getElementById(id);if(el)obs.observe(el)})}

  var plein=null;
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&plein)plein.basculer()});
  document.querySelectorAll("figure.vue").forEach(function(fig){
    var fen=fig.querySelector(".fenetre"),scene=fig.querySelector(".scene"),niveau=fig.querySelector(".niveau"),bPlein=fig.querySelector("[data-zoom=plein]");
    var W=+fig.getAttribute("data-w"),H=+fig.getAttribute("data-h");
    var s=1,x=0,y=0,touche=false,pts=new Map(),pince=null;
    function borne(v){return Math.min(4,Math.max(0.08,v))}
    function poser(){scene.style.transform="translate("+x+"px,"+y+"px) scale("+s+")";niveau.textContent=Math.round(s*100)+" %"}
    function hauteur(){if(fig.classList.contains("plein")){fen.style.height="";return}var l=fen.clientWidth,max=window.innerHeight*(window.innerWidth<700?0.62:0.74);fen.style.height=Math.round(Math.max(220,Math.min(H*Math.min(1,l/W)+24,max)))+"px"}
    function ajuster(){var l=fen.clientWidth,h=fen.clientHeight;s=Math.min(l/W,h/H,1.25)*0.97;x=(l-W*s)/2;y=(h-H*s)/2;touche=false;poser()}
    function zoomer(f,cx,cy){var n=borne(s*f),k=n/s;x=cx-(cx-x)*k;y=cy-(cy-y)*k;s=n;touche=true;poser()}
    function centre(){return[fen.clientWidth/2,fen.clientHeight/2]}
    var api={basculer:function(){var o=fig.classList.toggle("plein");document.body.classList.toggle("fige",o);bPlein.setAttribute("aria-pressed",String(o));bPlein.textContent=o?"Fermer":"Plein écran";plein=o?api:null;hauteur();ajuster();fen.focus()}};
    fig.querySelector(".outils").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var a=b.getAttribute("data-zoom"),c=centre();if(a==="plus")zoomer(1.25,c[0],c[1]);else if(a==="moins")zoomer(0.8,c[0],c[1]);else if(a==="ajuster")ajuster();else if(a==="plein")api.basculer()});
    fen.addEventListener("wheel",function(e){if(!(e.ctrlKey||e.metaKey)&&!fig.classList.contains("plein"))return;e.preventDefault();var r=fen.getBoundingClientRect();zoomer(Math.exp(-e.deltaY*0.0018),e.clientX-r.left,e.clientY-r.top)},{passive:false});
    fen.addEventListener("pointerdown",function(e){fen.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});pince=null});
    fen.addEventListener("pointermove",function(e){var p=pts.get(e.pointerId);if(!p)return;if(pts.size===1){x+=e.clientX-p.x;y+=e.clientY-p.y;touche=true;p.x=e.clientX;p.y=e.clientY;poser();return}p.x=e.clientX;p.y=e.clientY;var v=Array.from(pts.values()),d=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y),r=fen.getBoundingClientRect(),mx=(v[0].x+v[1].x)/2-r.left,my=(v[0].y+v[1].y)/2-r.top;if(pince){x+=mx-pince.mx;y+=my-pince.my;zoomer(d/pince.d,mx,my)}pince={d:d,mx:mx,my:my}});
    function lacher(e){pts.delete(e.pointerId);pince=null}
    fen.addEventListener("pointerup",lacher);fen.addEventListener("pointercancel",lacher);
    fen.addEventListener("dblclick",function(e){var r=fen.getBoundingClientRect();zoomer(1.6,e.clientX-r.left,e.clientY-r.top)});
    fen.addEventListener("keydown",function(e){var c=centre(),pas=48;if(e.key==="+"||e.key==="=")zoomer(1.25,c[0],c[1]);else if(e.key==="-")zoomer(0.8,c[0],c[1]);else if(e.key==="0")ajuster();else if(e.key==="ArrowLeft")x+=pas;else if(e.key==="ArrowRight")x-=pas;else if(e.key==="ArrowUp")y+=pas;else if(e.key==="ArrowDown")y-=pas;else return;e.preventDefault();touche=true;poser()});
    hauteur();ajuster();
    var largeur=window.innerWidth;
    window.addEventListener("resize",function(){if(window.innerWidth===largeur&&!fig.classList.contains("plein"))return;largeur=window.innerWidth;hauteur();if(!touche||fig.classList.contains("plein"))ajuster()});
  });
})();
`;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
