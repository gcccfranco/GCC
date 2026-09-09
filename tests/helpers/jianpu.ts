import fs from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";

const ROOT = path.resolve(__dirname, "..", "..");

export type ChordLabel = {
  x: number; y: number; w: number; h: number; c: string;
  fh?: number; alt?: number; opt?: boolean;
};
export type Chords = {
  printedKey: string;
  w: number;
  h: number;
  labelH: number;
  keyLabel?: { x: number; y: number; w: number; h: number; c?: string; sp?: number };
  titleKey?: { x: number; y: number; w: number; h: number };
  labels: ChordLabel[];
  complete?: boolean;
};

/** Le calque publié, lu sur le disque — même source que le navigateur. */
export function loadChords(): Record<string, Chords> {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "public/jianpu/chords.json"), "utf8"));
}

/** Les chants dont le calque est déclaré complet (`complete` absent) : les
 *  seuls sur lesquels « aucun accord ne doit rester dans la tonalité
 *  d'origine » est une assertion légitime. */
export function certifiedSlugs(): string[] {
  const chords = loadChords();
  return Object.keys(chords).filter((s) => chords[s].complete !== false).sort();
}

/** Les chants dont le calque est **partiel** : il publie, mais il ne couvre
 *  pas toute la page (bandeau « seuls les accords en bleu… »).
 *
 *  « Aucun accord ne reste dans la tonalité d'origine » n'y est pas une
 *  assertion légitime — il en reste par construction, ce sont ceux qu'on n'a
 *  pas encore lus. Mais « **aucune étiquette publiée** ne reste identique »
 *  l'est : ce que le calque écrit, il doit le réécrire. C'est cet oracle-là
 *  qui manquait quand `[Gm]` sortait verbatim de 一粒麦子 (itération 43) —
 *  le banc le mécanisait déjà, mais sur les seules pages certifiées, donc
 *  jamais là où le défaut vit. */
export function partialSlugs(): string[] {
  const chords = loadChords();
  return Object.keys(chords).filter((s) => chords[s].complete === false).sort();
}

/** Ouvre la page d'un chant et affiche sa partition 简谱.
 *  `key` absent = tonalité d'origine, donc **pas de calque** : c'est le scan
 *  nu, la référence à laquelle comparer la page transposée. */
export async function openSheet(
  page: Page,
  slug: string,
  opts: { key?: string; dark?: boolean } = {}
): Promise<Locator> {
  if (opts.dark) {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  }
  // La page lit ses paramètres en JSON (`safeParseParam`) : `?key=F` est
  // ignoré silencieusement et la partition reste en tonalité d'origine.
  const query = opts.key ? `?key=${encodeURIComponent(JSON.stringify(opts.key))}` : "";
  await page.goto(`/songs/${encodeURIComponent(slug)}${query}`, { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: /简谱/ }).click();

  const pages = page.locator("[data-jianpu-page]");
  await pages.first().waitFor();
  // Le scan pèse 1 à 2 Mo : sans cette attente la capture montre du vide, et
  // le calque flotte sur rien.
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every(
      (img) => img.complete && img.naturalWidth > 0
    )
  );
  // Les accords réécrits sont mesurés en cqw : une fonte pas encore chargée
  // décale toutes les largeurs.
  await page.evaluate(() => document.fonts.ready);
  return pages;
}

/** Les étiquettes du calque telles que le navigateur les rend : accord
 *  d'origine (`printed`), accord réécrit (`shown`) et boîte à l'écran. */
export async function overlayLabels(
  page: Page,
  pageIndex = 0,
  opts: { avecCadre?: boolean } = {}
) {
  return page.evaluate(({ i, avecCadre }) => {
    const host = document.querySelector(`[data-jianpu-page="${i}"]`);
    const img = host?.querySelector("img");
    if (!host || !img) return { image: null, labels: [] as never[] };
    const box = img.getBoundingClientRect();
    // Le cadre « 1=X » porte le même fond opaque qu'une étiquette et occupe
    // le même plan : un accord publié dessous se dessine par-dessus lui, ou
    // lui par-dessus l'accord. Il est entré dans le test d'**encre couverte**
    // à l'itération 41 et jamais dans celui des **chevauchements**, si bien
    // que le `F` publié sous le « 1=F » de 和散那 n'était vu de nulle part
    // (itération 44). Optionnel : les tests qui comptent les étiquettes
    // publiées comparent au contenu de `chords.json`, où le cadre n'en est
    // pas une.
    const sel = avecCadre ? "[data-jianpu-label],[data-jianpu-keylabel]" : "[data-jianpu-label]";
    const labels = Array.from(host.querySelectorAll<HTMLElement>(sel)).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        printed: el.dataset.jianpuLabel ?? "",
        shown: (el.textContent ?? "").trim(),
        // `alt` : demi-tons entre la tonalité de l'étiquette et celle de la
        // page. `opt` : « hidden » quand le sélecteur de tonalité la masque,
        // « shown » quand il la montre, absent si l'étiquette n'est pas une
        // lecture alternative.
        alt: el.dataset.jianpuAlt ? Number(el.dataset.jianpuAlt) : undefined,
        opt: el.dataset.jianpuOpt,
        left: r.left - box.left,
        top: r.top - box.top,
        width: r.width,
        height: r.height,
      };
    });
    return { image: { width: box.width, height: box.height }, labels };
  }, { i: pageIndex, avecCadre: opts.avecCadre === true });
}

const SHARP = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const ALIAS: Record<string, string> = { Db: "C#", "D#": "Eb", Gb: "F#", "G#": "Ab", "A#": "Bb" };

/** Hauteur d'une note, en demi-tons depuis do. Table indépendante de
 *  `src/lib/transpose.ts`, comme `halfStepUp` : un attendu calculé avec le
 *  code testé ne teste rien. Sert à comparer deux noms **sans** trancher
 *  l'orthographe — « C# » et « Db » sont la même hauteur, et le choix entre
 *  les deux appartient à la tonalité visée. */
export function pitchClass(note: string): number {
  const i = SHARP.indexOf(ALIAS[note] ?? note);
  if (i < 0) throw new Error(`note inconnue : ${note}`);
  return i;
}

/** Le demi-ton au-dessus : la tonalité où **aucun** accord ne garde son nom.
 *  Table indépendante de `src/lib/transpose.ts` — un test qui calcule son
 *  attendu avec le code testé ne teste rien. */
export function halfStepUp(key: string): string {
  const i = SHARP.indexOf(ALIAS[key] ?? key);
  if (i < 0) throw new Error(`tonalité inconnue : ${key}`);
  return SHARP[(i + 1) % 12];
}

/** Les chants qui ont un scan mais pas de calque : le bandeau doit alors
 *  prévenir que les accords imprimés ne suivent pas la transposition. */
export function slugsWithoutOverlay(): string[] {
  const chords = loadChords();
  const index: Record<string, unknown> = JSON.parse(
    fs.readFileSync(path.join(ROOT, "public/jianpu/index.json"), "utf8")
  );
  return Object.keys(index).filter((s) => !(s in chords)).sort();
}

/** Tonalité du `.cho`. La page ne passe une tonalité jouée au calque que si
 *  elle diffère de celle-là : viser par erreur la tonalité d'origine éteint
 *  le calque et le test mesure alors autre chose. */
export function songKey(slug: string): string | undefined {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "public/songs-index.json"), "utf8"));
  return index.songs.find((s: { slug: string }) => s.slug === slug)?.originalKey;
}

/** Tonalité de contrôle : un demi-ton au-dessus de la gravure, sauf si c'est
 *  justement la tonalité d'origine du chant — auquel cas un ton. */
export function auditKey(slug: string, printedKey: string): string {
  const up = halfStepUp(printedKey);
  return up === songKey(slug) ? halfStepUp(up) : up;
}
