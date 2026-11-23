import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage } from "./helpers/louange";

// Métronome MT-4 (docs/spec-metronome.md) : décompte, S'entraîner (mesures muettes, accélération, minuteur), Espace et T.
// Faux AudioContext (chaque start(t) est noté) et page.clock. Chants : avec-nous (FR, {tempo} 94, 4/4), abba-pere (FR), 为我而来 (ZH, 6/8).

const SETLIST_ID = "setlist-metronome-entrainement";
const MUSICIEN: FakeProfile = { uid: "uid-lecteur", email: "lecteur@example.com", serviceRoles: { "Culte Francophone": ["musicien"] } };
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (slugs: string[]) => ({
  title: "Culte d'essai", leader: "Présidence", category: "Culte Francophone", date: "2026-09-14", language: "mixed",
  notes: "", ownerId: "uid-owner", isPrivate: false, items: slugs.map((s, i) => item(s, i + 1)),
});

type Depart = { t: number; type: string; frequence: number };
declare global {
  interface Window { __ctxCrees: number; __starts: Depart[] }
}

/** Faux AudioContext : currentTime suit performance.now() (donc page.clock), décalé de 1 000 s pour que la bascule d'horloge se voie. */
function installerFauxAudio() {
  window.__ctxCrees = 0;
  window.__starts = [];
  const param = (v = 0) => ({
    value: v,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {},
  });
  type Noeud = { connect: (n: Noeud) => Noeud; disconnect: () => void; _cible?: Noeud; [k: string]: unknown };
  const noeud = (extra: Record<string, unknown> = {}): Noeud => {
    const n: Noeud = { connect(c) { n._cible = c; return c; }, disconnect() {}, ...extra };
    return n;
  };
  class FauxContexte {
    sampleRate = 44100;
    destination = noeud();
    state = "running";
    constructor() { window.__ctxCrees++; }
    get currentTime() { return 1000.3 + performance.now() / 1000; }
    resume() { return Promise.resolve(); }
    createGain() { return noeud({ gain: param(1) }); }
    createBiquadFilter() { return noeud({ type: "", frequency: param(), Q: param(), _filtre: true }); }
    createBuffer(_c: number, l: number) { return { getChannelData: () => new Float32Array(l) }; }
    createOscillator() {
      const o: Noeud = noeud({ type: "sine", frequency: param(), start(t: number) { window.__starts.push({ t, type: "osc", frequence: (o.frequency as { value: number }).value }); }, stop() {} });
      return o;
    }
    createBufferSource() {
      const s: Noeud = noeud({
        buffer: null,
        start(t: number) {
          let f = s._cible;
          while (f && !f._filtre) f = f._cible;
          window.__starts.push({ t, type: "bruit", frequence: f ? (f.frequency as { value: number }).value : 0 });
        },
        stop() {},
      });
      return s;
    }
    decodeAudioData() { return Promise.reject(new Error("pas d'écoute réelle")); }
  }
  Object.assign(window, { AudioContext: FauxContexte, webkitAudioContext: FauxContexte });
}

async function ouvrir(page: Page, slugs: string[], opts: { zh?: boolean; init?: Record<string, string> } = {}) {
  await page.clock.install();
  await page.addInitScript(installerFauxAudio);
  await page.addInitScript(({ zh, init }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-metronome", "1");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    if (!sessionStorage.getItem("init-metro")) {
      for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v);
      sessionStorage.setItem("init-metro", "1");
    }
  }, { zh: !!opts.zh, init: opts.init ?? {} });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(slugs) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

const bande = (page: Page) => page.locator("[data-bande-temps]");
const actif = (page: Page) => bande(page).locator("[data-actif]");
const panneau = (page: Page) => page.getByTestId("panneau-metronome");
const interrupteur = (page: Page) => panneau(page).locator("[data-metronome-son]");
const marche = (page: Page) => panneau(page).locator("[data-panneau-marche]");
const entete = (page: Page) => panneau(page).locator("[data-entr-entete]");
const ligne = (page: Page, nom: RegExp) => panneau(page).getByRole("switch", { name: nom });
const champ = (page: Page, cle: string) => panneau(page).locator(`[data-entr-champ="${cle}"]`);
const starts = (page: Page) => page.evaluate(() => window.__starts.slice());
const nbStarts = (page: Page) => page.evaluate(() => window.__starts.length);
const attendreTempo = (page: Page, n: number) => expect(bande(page).locator("[data-bande-ouvrir]")).toHaveAttribute("aria-label", new RegExp(`♩ ${n},`));

const MUETTES = /^Jouer 4 mesures, puis 4 en silence$/;
const ACCEL = /^De 60, \+2 toutes les 4 mesures, jusqu'à 80$/;
const MINUTEUR = /^S'arrêter après \d+ minutes$/;

async function ouvrirPanneau(page: Page) {
  await bande(page).locator("[data-bande-ouvrir]").click();
  await expect(panneau(page)).toBeVisible();
}
async function deplier(page: Page) {
  await entete(page).click();
  await expect(entete(page)).toHaveAttribute("aria-expanded", "true");
}
/** Le temps ne passe plus que par runFor : instants exacts. À poser après les clics qui demandent des animations. */
const figer = (page: Page) => page.clock.pauseAt(new Date(Date.now() + 5_000));
/** Marche (le temps est figé juste avant) ; attend que la bande tourne avant de faire avancer l'horloge. */
async function lancer(page: Page) {
  await figer(page);
  await marche(page).click();
  await expect(actif(page)).toHaveCount(1);
}
async function fermerPanneau(page: Page) {
  await panneau(page).getByRole("button", { name: "Fermer le métronome" }).click();
  await expect(panneau(page)).toBeHidden();
}
/** Écarts (s) entre départs consécutifs, et l'écart théorique de chaque temps. */
const ecarts = (tout: Depart[]) => tout.slice(1).map((s, i) => s.t - tout[i].t);

test("décompte d'une mesure à 120 en 4/4 : 1 à 4 sur la bande pendant 2 s, puis la suite sans arrêt ; quatre clics puis la suite, un temps muet y devient faible", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120", "perf-metro-decompte": "1", "perf-metro-accents-avec-nous": "fmsa" } });
  await ouvrirPanneau(page);
  await interrupteur(page).click();
  await lancer(page);
  // Milieu de chaque temps : l'attribut est lu après l'image, jamais aussitôt.
  await page.clock.runFor(250);
  for (let i = 0; i < 4; i++) {
    await expect(bande(page)).toHaveAttribute("data-decompte", "");
    await expect(actif(page)).toHaveAttribute("data-temps", String(i + 1));
    await page.clock.runFor(500);
  }
  // 2,25 s : la mesure 1 commence, sans arrêt ni saut.
  await expect(bande(page)).not.toHaveAttribute("data-decompte");
  await expect(actif(page)).toHaveAttribute("data-temps", "1");
  await page.clock.runFor(500);
  await expect(actif(page)).toHaveAttribute("data-temps", "2");
  await page.clock.runFor(2_000);
  const tout = await starts(page);
  const t0 = tout[0].t;
  const dans = tout.filter((s) => s.t < t0 + 3.99);
  // Décompte : 4 clics (le temps 3, muet, y sonne faible) ; mesure 1 : 3 clics, le temps 3 est muet.
  expect(dans.map((s) => Math.round((s.t - t0) * 2) / 2)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3.5]);
  for (const s of dans) expect(Math.abs(s.t - t0 - Math.round((s.t - t0) * 2) / 2)).toBeLessThan(0.002);
  const f = dans.map((s) => s.frequence);
  expect(f[0]).toBeGreaterThan(f[1]);
  expect(f[1]).toBeGreaterThan(f[2]);
  expect(f[2]).toBe(f[3]); // temps 3 : muet, joué faible pendant le décompte
  expect(f[4]).toBe(f[0]);
  expect(f[5]).toBe(f[1]);
  expect(f[6]).toBe(f[3]);
});

test("décompte : le temps allumé est un contour épais, plus une pastille pleine ; il ne rejoue pas quand on change le tempo en marche", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120", "perf-metro-decompte": "2" } });
  await ouvrirPanneau(page);
  await lancer(page);
  await page.clock.runFor(250);
  await expect(bande(page)).toHaveAttribute("data-decompte", "");
  await expect(actif(page)).toHaveCSS("border-top-width", "4px");
  await expect(actif(page)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.clock.runFor(3_900); // 4,15 s : mesure 2 (la deuxième mesure de décompte finit à 4 s)
  await expect(bande(page)).not.toHaveAttribute("data-decompte");
  await panneau(page).locator("[data-tempo-plus]").click(); // tempo changé en marche : pas de nouveau décompte
  await page.clock.runFor(8_000);
  await expect(actif(page)).toHaveCount(1);
  await expect(bande(page)).not.toHaveAttribute("data-decompte");
});

test("« 4 jouées, 4 muettes » à 120 en 4/4 : aucun départ pendant les mesures 5 à 8, la bande bat toujours, les clics reprennent à la mesure 9", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await interrupteur(page).click();
  await deplier(page);
  await ligne(page, MUETTES).click();
  await expect(ligne(page, MUETTES)).toHaveAttribute("aria-checked", "true");
  await lancer(page);
  await page.clock.runFor(1_000);
  await expect(bande(page)).not.toHaveAttribute("data-muette");
  await page.clock.runFor(8_000); // 9 s : mesure 5, muette
  await expect(bande(page)).toHaveAttribute("data-muette", "");
  await expect(actif(page)).toHaveCount(1);
  await expect(actif(page)).toHaveAttribute("data-accent", "muet");
  await page.clock.runFor(1_500);
  await expect(actif(page)).toHaveCount(1);
  await page.clock.runFor(6_500); // 17 s : mesure 9
  await expect(bande(page)).not.toHaveAttribute("data-muette");
  const tout = await starts(page);
  const t0 = tout[0].t;
  const rel = tout.map((s) => s.t - t0);
  expect(rel.filter((t) => t < 7.99)).toHaveLength(16);
  expect(rel.filter((t) => t > 7.99 && t < 15.99)).toHaveLength(0);
  expect(rel.some((t) => Math.abs(t - 16) < 0.002)).toBe(true);
  expect(rel.filter((t) => t >= 15.99 && t < 16.99)).toHaveLength(2);
});

test("« de 60, +2 toutes les 4 mesures, jusqu'à 80 » : 1 000 ms sur les mesures 1 à 4, 62 au premier temps de la mesure 5 (≈ 967,7 ms), jamais écrit, retour au tempo du chant à l'arrêt", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await interrupteur(page).click();
  await deplier(page);
  await ligne(page, ACCEL).click();
  await lancer(page);
  await page.clock.runFor(1_000);
  await attendreTempo(page, 60); // Marche part au tempo « de », pas à celui du chant (120)
  await page.clock.runFor(16_000); // 17 s : mesure 5, deuxième temps
  await attendreTempo(page, 62);
  await page.clock.runFor(3_000);
  const g = ecarts(await starts(page));
  for (let j = 0; j < 16; j++) expect(Math.abs(g[j] - 1)).toBeLessThan(0.002); // les 16 temps des mesures 1 à 4 durent 1 s (le 16e écart mène au premier temps de la mesure 5)
  expect(Math.abs(g[16] - 60 / 62)).toBeLessThan(0.002);
  expect(Math.abs(g[19] - 60 / 62)).toBeLessThan(0.002);
  expect(await page.evaluate(() => localStorage.getItem("perf-tempo-avec-nous"))).toBe("120");
  await marche(page).click();
  await attendreTempo(page, 120);
});

test("accélération plafonnée : de 70, +5 toutes les mesures, jusqu'à 80 → 70, 75, puis 80 (750 ms)", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120", "perf-metro-entrainement": JSON.stringify({ jouees: 4, silence: 4, de: 70, pas: 5, tous: 1, jusqua: 80, minutes: 10 }) } });
  await ouvrirPanneau(page);
  await interrupteur(page).click();
  await deplier(page);
  await ligne(page, /^De 70, \+5 toutes les 1 mesures, jusqu'à 80$/).click();
  await lancer(page);
  await page.clock.runFor(13_000);
  const g = ecarts(await starts(page));
  const tempo = [70, 75, 80, 80];
  for (let j = 0; j < 12; j++) expect(Math.abs(g[j] - 60 / tempo[Math.floor(j / 4)])).toBeLessThan(0.002);
  expect(Math.abs(g[11] - 0.75)).toBeLessThan(0.002);
  await attendreTempo(page, 80);
});

test("minuteur d'une minute : le temps restant se lit, arrêt à 60 s, plus aucune pastille allumée", async ({ page }) => {
  test.setTimeout(120_000); // 61 s simulées, image par image
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120", "perf-metro-entrainement": JSON.stringify({ jouees: 4, silence: 4, de: 60, pas: 2, tous: 4, jusqua: 80, minutes: 1 }) } });
  await ouvrirPanneau(page);
  await deplier(page);
  await ligne(page, MINUTEUR).click();
  await lancer(page);
  await page.clock.runFor(30_000);
  await expect(actif(page)).toHaveCount(1);
  await expect(panneau(page).locator("[data-entr-restant]")).toHaveText(/Reste 0:(29|30|31)/);
  await page.clock.runFor(29_000);
  await expect(actif(page)).toHaveCount(1);
  await page.clock.runFor(2_000);
  await expect(actif(page)).toHaveCount(0);
  await expect(marche(page)).toHaveAttribute("aria-pressed", "false");
});

test("minuteur décoché en marche : plus d'arrêt à 60 s", async ({ page }) => {
  test.setTimeout(120_000); // 80 s simulées, image par image
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120", "perf-metro-entrainement": JSON.stringify({ jouees: 4, silence: 4, de: 60, pas: 2, tous: 4, jusqua: 80, minutes: 1 }) } });
  await ouvrirPanneau(page);
  await deplier(page);
  await ligne(page, MINUTEUR).click();
  await lancer(page);
  await page.clock.runFor(20_000);
  await ligne(page, MINUTEUR).click();
  await page.clock.runFor(60_000);
  await expect(actif(page)).toHaveCount(1);
});

test("Espace lance et arrête (bande affichée) ; T tape : quatre T à 500 ms donnent 120", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  await figer(page);
  // Le focus est resté sur le bouton d'entrée (aucun pointerdown vu depuis l'ouverture du mode) : on repart du corps de page, comme avec une pédale.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Space");
  await expect(actif(page)).toHaveCount(1);
  await page.keyboard.press("Space");
  await expect(actif(page)).toHaveCount(0);
  await attendreTempo(page, 94);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("t");
    await page.clock.runFor(500);
  }
  await attendreTempo(page, 120);
  expect(await page.evaluate(() => localStorage.getItem("perf-tempo-avec-nous"))).toBe("120");
});

test("fenêtre Métronome ouverte : Espace et T agissent, le bouton Taper et la touche T tapent dans la même série ; touches annoncées avec un clavier", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  await ouvrirPanneau(page);
  await expect(marche(page)).toHaveAttribute("aria-keyshortcuts", "Space");
  await expect(panneau(page).locator("[data-panneau-taper]")).toHaveAttribute("aria-keyshortcuts", "T");
  if (!(await page.evaluate(() => matchMedia("(pointer: fine)").matches))) await expect(panneau(page).locator("kbd")).toHaveCount(0);
  await figer(page);
  await page.keyboard.press("t"); // un clavier vient d'être vu
  await expect(panneau(page).locator("kbd")).toHaveText(["T", "Espace"]);
  await page.clock.runFor(500);
  await panneau(page).locator("[data-panneau-taper]").dispatchEvent("pointerdown"); // même série que la touche
  await expect.poll(() => bande(page).locator("[data-bande-ouvrir]").getAttribute("aria-label")).toMatch(/♩ 120,/);
  await page.keyboard.press("Space");
  await expect(actif(page)).toHaveCount(1);
  await expect(marche(page)).toHaveAttribute("aria-pressed", "true");
});

test("Espace et T dans un champ du bloc S'entraîner ne lancent rien et ne tapent rien ; hors bornes, la valeur est ramenée à la borne", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  await ouvrirPanneau(page);
  await deplier(page);
  await figer(page);
  const jouees = champ(page, "jouees");
  await jouees.click();
  await page.keyboard.press("Space");
  await page.keyboard.press("t");
  await page.clock.runFor(500);
  await page.keyboard.press("t");
  await page.keyboard.press("T");
  await expect(actif(page)).toHaveCount(0);
  await expect(marche(page)).toHaveAttribute("aria-pressed", "false");
  await attendreTempo(page, 94);
  await expect(jouees).toHaveValue("4");
  await jouees.fill("99");
  await jouees.blur();
  await expect(jouees).toHaveValue("16");
  await champ(page, "de").fill("10");
  await champ(page, "de").blur();
  await expect(champ(page, "de")).toHaveValue("30");
  await champ(page, "minutes").fill("500");
  await champ(page, "minutes").blur();
  await expect(champ(page, "minutes")).toHaveValue("120");
});

const chantSuivant = async (page: Page) => {
  const suivant = onStage(page, "[data-suivant]");
  for (let i = 0; i < 20 && (await suivant.count()) === 0; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
  }
  await expect(suivant).toHaveCount(1);
  await suivant.dispatchEvent("click");
};

test("S'entraîner ouvert : le chant suivant n'arrête ni la marche ni le son", async ({ page }) => {
  await ouvrir(page, ["avec-nous", "abba-pere"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await interrupteur(page).click();
  await deplier(page);
  await marche(page).click();
  await expect(actif(page)).toHaveCount(1);
  await page.clock.runFor(600);
  await fermerPanneau(page);
  await chantSuivant(page);
  await attendreTempo(page, 72); // abba-pere n'a pas de {tempo} : 72 ; la marche, elle, continue
  const n = await nbStarts(page);
  await page.clock.runFor(1_500);
  expect(await nbStarts(page)).toBeGreaterThan(n);
  await expect(actif(page)).toHaveCount(1);
  await expect(page.locator("[data-avis-son]")).not.toHaveText("Son coupé");
  await ouvrirPanneau(page);
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "true");
  await expect(marche(page)).toHaveAttribute("aria-pressed", "true");
});

test("S'entraîner replié : le chant suivant arrête la marche et le son", async ({ page }) => {
  await ouvrir(page, ["avec-nous", "abba-pere"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await interrupteur(page).click();
  await expect(entete(page)).toHaveAttribute("aria-expanded", "false");
  await marche(page).click();
  await expect(actif(page)).toHaveCount(1);
  await page.clock.runFor(600);
  await fermerPanneau(page);
  await chantSuivant(page);
  await attendreTempo(page, 72);
  await expect(page.locator("[data-avis-son]")).toHaveText("Son coupé");
  await expect(actif(page)).toHaveCount(0);
  const n = await nbStarts(page);
  await page.clock.runFor(1_500);
  expect(await nbStarts(page)).toBe(n);
});

test("réouverture du mode louange : bloc replié, cases éteintes, valeurs retenues", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  await ouvrirPanneau(page);
  await expect(entete(page)).toHaveAttribute("aria-expanded", "false");
  await deplier(page);
  await ligne(page, ACCEL).click();
  await ligne(page, MINUTEUR).click();
  await champ(page, "jouees").fill("6");
  await champ(page, "jouees").blur();
  await champ(page, "minutes").fill("12");
  await champ(page, "minutes").blur();
  await expect(ligne(page, ACCEL)).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("perf-metro-entrainement") ?? "null"))).toMatchObject({ jouees: 6, minutes: 12 });
  await fermerPanneau(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-performance-mode]")).toBeHidden();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await ouvrirPanneau(page);
  await expect(entete(page)).toHaveAttribute("aria-expanded", "false");
  await deplier(page);
  for (const nom of [/^Jouer 6 mesures/, /^De 60/, /^S'arrêter après 12 minutes$/]) await expect(ligne(page, nom)).toHaveAttribute("aria-checked", "false");
  await expect(champ(page, "jouees")).toHaveValue("6");
  await expect(champ(page, "minutes")).toHaveValue("12");
});

test("libellés en chinois : le bloc 练习, ses phrases et ses champs", async ({ page }) => {
  await ouvrir(page, ["为我而来"], { zh: true });
  await bande(page).locator("[data-bande-ouvrir]").click();
  await expect(panneau(page)).toBeVisible();
  await expect(entete(page)).toHaveText("练习");
  await deplier(page);
  await expect(ligne(page, /^演奏 4 小节，然后静音 4 小节$/)).toBeVisible();
  await expect(ligne(page, /^从 60 开始，每 4 小节加 2，直到 80$/)).toBeVisible();
  await expect(ligne(page, /^10 分钟后停止$/)).toBeVisible();
  await expect(champ(page, "jusqua")).toHaveAccessibleName("目标速度");
});
