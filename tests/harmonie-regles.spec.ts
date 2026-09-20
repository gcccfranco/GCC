import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { lireFamille, lireParcours } from "../src/lib/harmonie/fiches";
import { MODULATIONS, REGLES } from "../src/lib/harmonie/regles";
import type { Fiche } from "../src/types/harmonie";

// Lot 9 / H1 : les fiches vivent dans `docs/harmonie/*.md` (Timothée les relit
// là) et leur règle y est écrite en toutes lettres ; `regles.ts` en porte la
// version exécutable. Ces tests interdisent aux deux de diverger — sans eux,
// une fiche corrigée en relecture laisserait une règle périmée dans le code.

const DOSSIER = path.join(process.cwd(), "docs", "harmonie");
const lire = (f: string) => fs.readFileSync(path.join(DOSSIER, f), "utf-8");
const fichiers = fs.readdirSync(DOSSIER).filter((f) => /^\d\d-.+\.md$/.test(f) && !f.startsWith("00-")).sort();

const fiches: Fiche[] = fichiers.flatMap((f) => lireFamille(lire(f), f));

test("les 69 fiches se lisent, avec leur vocabulaire", () => {
  expect(fiches).toHaveLength(69);
  for (const f of fiches) {
    expect(f.id, `${f.code} : un id`).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/);
    expect(f.nom.length, `${f.code} : un nom`).toBeGreaterThan(3);
    expect(f.sensations.length, `${f.code} : au moins une sensation`).toBeGreaterThan(0);
    expect(f.moments.length, `${f.code} : au moins un moment`).toBeGreaterThan(0);
    expect(Object.keys(f.niveau).length, `${f.code} : un niveau`).toBeGreaterThan(0);
    expect(f.regle, `${f.code} : une ligne « Règle »`).toBeTruthy();
  }
});

test("aucun texte de fiche n'est coupé à la lecture", () => {
  // Le lecteur découpe les fiches aux intertitres gras : une coupure mal
  // placée arrive (elle est arrivée) et se voit à un texte qui s'arrête au
  // milieu d'une phrase, ou qui avale le trait de séparation des fiches.
  const finit = /[.!?:)»]$/;
  for (const f of fiches) {
    for (const [nom, v] of Object.entries({
      "avant → après": f.avantApres, pourquoi: f.pourquoi, piano: f.piano,
      guitare: f.guitare, répertoire: f.repertoire, règle: f.regle,
    })) {
      if (v) expect(finit.test(v.trim()), `${f.code} · ${nom} : « …${v.trim().slice(-40)} »`).toBe(true);
    }
    f.eviter.forEach((e, i) => {
      expect(finit.test(e.trim()), `${f.code} · à éviter ${i + 1} : « …${e.trim().slice(-40)} »`).toBe(true);
    });
    expect(f.regle, `${f.code} : le trait de séparation avalé`).not.toContain("---");
  }
});

test("chaque fiche qui annonce une règle en a une exécutable, et l'inverse", () => {
  // Une fiche « Aucune : catalogue seul » (voicings, rythme, boucles) n'a pas
  // de règle ; les modulations et les transitions sont calculées ailleurs.
  const attendues = fiches
    .filter((f) => /^Portée/.test(f.regle ?? "") || f.famille === "intros-fins")
    .filter((f) => !/^Aucune/.test(f.regle ?? ""))
    .map((f) => f.id)
    .sort();
  expect([...REGLES].map((r) => r.fiche).sort()).toEqual(attendues);
  for (const r of REGLES) {
    expect(fiches.some((f) => f.id === r.fiche), `${r.fiche} : fiche inconnue`).toBe(true);
    if (!r.genre) expect(r.variantes.length, `${r.fiche} : au moins une variante`).toBeGreaterThan(0);
    for (const v of r.variantes) {
      expect(v.motif.length, `${r.fiche} : motif vide`).toBeGreaterThan(0);
      expect(v.apres.length, `${r.fiche} : « après » vide`).toBeGreaterThan(0);
    }
  }
});

test("la sûreté du code est celle écrite dans la fiche", () => {
  const MOTS = { "très sûre": "tres-sure", sûre: "sure", "à écouter": "a-ecouter" } as const;
  for (const r of REGLES) {
    const fiche = fiches.find((f) => f.id === r.fiche)!;
    // Les fiches sont coupées à 80 colonnes : le gras traverse les retours.
    const m = fiche.regle!.replace(/\s+/g, " ").match(/sûreté\s*:\s*\*\*(.+?)\*\*/);
    expect(m, `${r.fiche} : pas de sûreté dans la fiche`).toBeTruthy();
    expect(MOTS[m![1] as keyof typeof MOTS], `${r.fiche} : sûreté « ${m![1]} »`).toBe(r.surete);
  }
});

test("la portée du code est celle écrite dans la fiche", () => {
  for (const r of REGLES) {
    // Les règles sans motif (intro absente, tag) ne décrivent pas une portée
    // d'accords : elles sont traitées à part par le moteur.
    if (r.genre) continue;
    const prose = fiches.find((f) => f.id === r.fiche)!.regle!.replace(/\s+/g, " ").toLowerCase();
    if (prose.includes("tenu")) expect(r.position, r.fiche).toBe("tenu");
    else if (prose.includes("qui précède un refrain")) expect(r.position, r.fiche).toBe("avant-refrain");
    else if (prose.includes("toute fin du chant") || prose.includes("dernière occurrence du refrain"))
      expect(r.position, r.fiche).toBe("fin-chant");
    else if (prose.includes("fin de ligne")) expect(r.position, r.fiche).toBe("fin-ligne");
    else if (prose.includes("fin de section")) expect(r.position, r.fiche).toBe("fin-section");
    else if (prose.includes("dans une ligne")) expect(r.position, r.fiche).toBe("ligne");

    // Quand la fiche nomme des types de section, le code les filtre.
    const NOMS: Record<string, string> = {
      intro: "intro", couplet: "verse", refrain: "chorus", pont: "bridge", interlude: "interlude",
    };
    // « fin de la section qui précède un refrain » nomme le refrain sans être
    // un filtre de section : la règle s'applique à ce qui le précède.
    const portee = r.position === "avant-refrain" ? "" : prose.split("·")[0];
    for (const [fr, type] of Object.entries(NOMS)) {
      if (new RegExp(`portée\\s*:\\s*[^·]*\\b${fr}\\b`).test(portee)) {
        expect(r.sections, `${r.fiche} : la fiche parle de « ${fr} »`).toContain(type);
      }
    }
  }
});

test("le motif et le remplacement du code ont les degrés écrits dans la fiche", () => {
  // Comparaison sur les **degrés** seulement (la prose écrit tantôt « 3 7 »,
  // tantôt « 1 2 » : les couleurs ne se comparent pas mécaniquement). Ça suffit
  // à attraper un accord oublié ou un degré faux — c'est ainsi que le « 5 » de
  // résolution manquant de C2 s'est vu.
  // Un accord par morceau : les fiches séparent les accords par « → » et
  // « – », et gardent la couleur collée au degré (« 2m7 », « 1 2 », « 3 7 »).
  const accords = (motif: string) => motif.split(/\s*(?:→|–)\s*/).filter((x) => x.trim()).length;
  for (const r of REGLES) {
    if (r.genre) continue;
    const prose = fiches.find((f) => f.id === r.fiche)!.regle!.replace(/\s+/g, " ");
    const attendu = (mot: string) =>
      [...prose.matchAll(new RegExp(`${mot}[^\`]*\`([^\`]+)\``, "g"))].map((m) => m[1]);
    for (const [mot, cle] of [["motif", "motif"], ["remplacement", "apres"]] as const) {
      const ecrits = attendu(mot);
      if (!ecrits.length) continue;
      const codes = r.variantes.map((v) => v[cle].length);
      const tailles = ecrits.map(accords);
      // Certaines fiches n'écrivent que l'accord remplacé (« remplacement du 1
      // par `3m` »), d'autres toute la suite : le code doit donc en porter **au
      // moins** autant que la fiche, jamais moins — c'est un accord oublié.
      expect(
        codes.some((n) => n >= Math.max(...tailles)),
        `${r.fiche} · ${mot} : ${codes.join("/")} accord(s) dans le code, ${tailles.join("/")} dans la fiche « ${ecrits.join(" | ")} »`,
      ).toBe(true);
    }
  }
});

test("les contraintes écrites en toutes lettres sont dans le code", () => {
  // « le 1 n'étant ni le premier accord de la section », « le second n'étant
  // pas le dernier accord de la section », « suivie d'une autre occurrence » :
  // trois phrases qui changent où la règle s'applique, et qui étaient restées
  // lettre morte.
  for (const r of REGLES) {
    const prose = fiches.find((f) => f.id === r.fiche)!.regle!.replace(/\s+/g, " ");
    if (/premier accord de la section/.test(prose)) {
      expect(r.sansTeteDeSection, `${r.fiche} : « pas le premier accord de la section »`).toBe(true);
    }
    if (/dernier accord de la section/.test(prose)) {
      expect(r.sansFinDeSection, `${r.fiche} : « pas le dernier accord de la section »`).toBe(true);
    }
    if (/suivie d'une autre occurrence/.test(prose)) {
      expect(r.sansDerniereSection, `${r.fiche} : « suivie d'une autre occurrence »`).toBe(true);
    }
  }
});

test("les cinq modulations de la famille 8 sont là", () => {
  const ids = fiches.filter((f) => f.famille === "modulations").map((f) => f.id).sort();
  expect(MODULATIONS.map((m) => m.fiche).sort()).toEqual(ids);
  for (const m of MODULATIONS) expect(m.demiTons, m.fiche).toBeGreaterThan(0);
});

test("le parcours « Par où commencer » renvoie à dix fiches qui existent", () => {
  const parcours = lireParcours(lire("00-par-ou-commencer.md"), fiches);
  expect(parcours).toHaveLength(10);
  const ids = new Set(fiches.map((f) => f.id));
  for (const e of parcours) {
    expect(e.fiches.length, `étape ${e.n}`).toBeGreaterThan(0);
    for (const id of e.fiches) expect(ids.has(id), `étape ${e.n} : ${id}`).toBe(true);
    expect(e.pourquoi.length, `étape ${e.n} : un « pourquoi »`).toBeGreaterThan(10);
  }
});
