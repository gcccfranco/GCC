import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage } from "./helpers/louange";

// Métronome MT-3 (docs/spec-metronome.md) : le son. Faux AudioContext injecté : aucun son réel ; chaque start(t) est noté.
// Chants : avec-nous (FR, {tempo} 94, 4/4), abba-pere (FR), 为我而来 (ZH, 6/8).

const SETLIST_ID = "setlist-metronome-son";
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
const starts = (page: Page) => page.evaluate(() => window.__starts.slice());
const nbStarts = (page: Page) => page.evaluate(() => window.__starts.length);

async function ouvrirPanneau(page: Page) {
  await bande(page).locator("[data-bande-ouvrir]").click();
  await expect(panneau(page)).toBeVisible();
}
/** Son allumé, puis Marche ; attend que la bande tourne (les effets sont posés) avant de faire avancer l'horloge. */
async function lancer(page: Page, son = true) {
  if (son) await interrupteur(page).click();
  await panneau(page).locator("[data-panneau-marche]").click();
  await expect(actif(page)).toHaveCount(1);
}
async function fermerPanneau(page: Page) {
  await panneau(page).getByRole("button", { name: "Fermer le métronome" }).click();
  await expect(panneau(page)).toBeHidden();
}
const aucunNouveauStart = async (page: Page) => {
  const n = await nbStarts(page);
  await page.clock.runFor(1_000);
  expect(await nbStarts(page)).toBe(n);
};

test("son coupé : Marche pendant 2 s ne crée aucun AudioContext et ne programme aucun clic", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "false");
  await lancer(page, false);
  await page.clock.runFor(2_000);
  expect(await page.evaluate(() => window.__ctxCrees)).toBe(0);
  expect(await nbStarts(page)).toBe(0);
});

test("son allumé à 120 en 4/4 pendant 10 s : 20 clics, chacun à moins de 2 ms de t0 + k × 0,5 s", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await lancer(page);
  expect(await page.evaluate(() => window.__ctxCrees)).toBe(1);
  await page.clock.runFor(10_000);
  const tout = await starts(page);
  const t0 = tout[0].t;
  const dans = tout.filter((s) => s.t < t0 + 10 - 0.01);
  expect(dans).toHaveLength(20);
  expect(new Set(dans.map((s) => s.t)).size).toBe(20);
  for (const s of dans) {
    const k = Math.round((s.t - t0) / 0.5);
    expect(Math.abs(s.t - (t0 + k * 0.5))).toBeLessThan(0.002);
  }
});

test("fort, moyen, faible : trois hauteurs distinctes ; un temps muet ne sonne pas", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120", "perf-metro-son": "bois" } });
  await ouvrirPanneau(page);
  // Défauts fort, faible, faible, faible. Temps 2 : faible → muet. Temps 3 : faible → muet → fort → moyen.
  await panneau(page).locator('[data-panneau-temps] [data-temps="2"]').click();
  for (let i = 0; i < 3; i++) await panneau(page).locator('[data-panneau-temps] [data-temps="3"]').click();
  await expect(panneau(page).locator('[data-panneau-temps] [data-temps="3"]')).toHaveAttribute("data-accent", "moyen");
  await lancer(page);
  await page.clock.runFor(1_800);
  const tout = await starts(page);
  const t0 = tout[0].t;
  const dans = tout.filter((s) => s.t < t0 + 1.99);
  expect(dans).toHaveLength(3); // temps 1, 3 et 4 : le temps 2 est muet
  expect(dans.map((s) => Math.round((s.t - t0) * 2) / 2)).toEqual([0, 1, 1.5]);
  const [fort, moyen, faible] = dans.map((s) => s.frequence);
  expect(new Set([fort, moyen, faible]).size).toBe(3);
  expect(fort).toBeGreaterThan(moyen);
  expect(moyen).toBeGreaterThan(faible);
});

test("Ternaire en 4/4 : trois clics par temps", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await panneau(page).getByRole("radio", { name: "Ternaire", exact: true }).click();
  await lancer(page);
  await page.clock.runFor(1_900);
  const tout = await starts(page);
  const t0 = tout[0].t;
  const dans = tout.filter((s) => s.t < t0 + 1.99);
  expect(dans).toHaveLength(12);
  for (let k = 0; k < 4; k++) expect(dans.filter((s) => s.t >= t0 + k * 0.5 - 0.001 && s.t < t0 + (k + 1) * 0.5 - 0.001)).toHaveLength(3);
});

test("6/8 : un clic par pastille, sans subdivision en plus (chant chinois)", async ({ page }) => {
  await ouvrir(page, ["为我而来"], { zh: true, init: { "perf-tempo-为我而来": "120" } });
  await ouvrirPanneau(page);
  await lancer(page);
  await page.clock.runFor(1_000);
  const tout = await starts(page);
  const t0 = tout[0].t;
  expect(tout.filter((s) => s.t < t0 + 0.99)).toHaveLength(6); // 120 à la noire pointée : une croche = 1/6 s
});

test("changement de chant : le son se coupe, plus aucun clic, avis « Son coupé »", async ({ page }) => {
  await ouvrir(page, ["avec-nous", "abba-pere"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await lancer(page);
  await page.clock.runFor(600);
  expect(await nbStarts(page)).toBeGreaterThan(0);
  await fermerPanneau(page);
  const suivant = onStage(page, "[data-suivant]");
  for (let i = 0; i < 20 && (await suivant.count()) === 0; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
  }
  await expect(suivant).toHaveCount(1);
  await suivant.dispatchEvent("click");
  await expect(page.locator("[data-avis-son]")).toHaveText("Son coupé");
  await aucunNouveauStart(page);
  await ouvrirPanneau(page);
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "false");
});

test("page cachée : le son se coupe, plus aucun clic, avis « Son coupé » ; il ne se rallume pas au retour", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await lancer(page);
  await page.clock.runFor(600);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-avis-son]")).toHaveText("Son coupé");
  await aucunNouveauStart(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "false");
  await expect(actif(page)).toHaveCount(1); // le visuel, lui, continue
});

test("quitter le mode louange : plus aucun clic ; à la réouverture le son est coupé", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await lancer(page);
  await page.clock.runFor(600);
  expect(await nbStarts(page)).toBeGreaterThan(0);
  await fermerPanneau(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-performance-mode]")).toBeHidden();
  await aucunNouveauStart(page);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await ouvrirPanneau(page);
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "false");
});

test("la page rechargée rouvre le mode louange avec le son coupé", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  await ouvrirPanneau(page);
  await interrupteur(page).click();
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await ouvrirPanneau(page);
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "false");
  await expect(panneau(page).locator("[data-son-volume]")).toBeDisabled();
});

test("bascule d'horloge : allumer le son en marche ne fait pas reculer le temps affiché", async ({ page }) => {
  await ouvrir(page, ["avec-nous"], { init: { "perf-tempo-avec-nous": "120" } });
  await ouvrirPanneau(page);
  await lancer(page, false);
  await page.clock.runFor(1_200);
  const temps = async () => Number(await actif(page).getAttribute("data-temps"));
  await expect.poll(temps).toBeGreaterThan(0);
  await page.clock.runFor(100);
  let prev = await temps();
  await interrupteur(page).click();
  await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "true");
  // Pas de 100 ms (l'horloge factice avance aussi en temps réel entre deux appels) : jamais en arrière, au plus un temps de plus.
  let avances = 0;
  for (let i = 0; i < 30; i++) {
    await page.clock.runFor(100);
    const courant = await temps();
    const pas = (courant - prev + 4) % 4;
    expect(pas).toBeLessThanOrEqual(1);
    avances += pas;
    prev = courant;
  }
  expect(avances).toBeGreaterThanOrEqual(4);
});

test("le son choisi et le volume sont retenus au rechargement", async ({ page }) => {
  await ouvrir(page, ["avec-nous"]);
  await ouvrirPanneau(page);
  await interrupteur(page).click();
  await panneau(page).getByRole("radio", { name: "Bois", exact: true }).click();
  await panneau(page).locator("[data-son-volume]").fill("35");
  expect(await page.evaluate(() => [localStorage.getItem("perf-metro-son"), localStorage.getItem("perf-metro-volume")])).toEqual(["bois", "35"]);
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await ouvrirPanneau(page);
  await expect(panneau(page).locator("[data-son-type]")).toHaveAttribute("data-son-type", "bois");
  await expect(panneau(page).locator("[data-son-volume]")).toHaveValue("35");
});
