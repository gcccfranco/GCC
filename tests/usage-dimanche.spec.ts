import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, ouvrirMenu, ouvrirOptions, ouvrirOutils, onStage } from "./helpers/louange";
import { enDeuxVolets, ouvrirPartitions } from "./helpers/setlist";
import { ajouterChant, attendreEditeur } from "./helpers/editeurSetlist";
import { CLES_USAGE } from "../src/lib/usageCles";

// Comptage d'usage, T2 « Le dimanche » (docs/spec-comptage-usage.md) : chaque commande de la page chant, du mode
// louange et des setlists, déclenchée UNE fois par l'interface, part dans le commit suivant avec `increment` 1 sur
// `` `cmd.….`.n ``. Compte fictif ; jamais de vraie écriture : `documents:commit` est interceptée (route posée après
// fakeFirestore, la dernière posée gagne). Noms fictifs.
//
// Testées par l'interface (15 commandes) :
//   page chant, sur un chant FR et un chant ZH : transposer, copier les paroles, toucher un accord, export PDF ;
//   mode louange : ouvrir, chant suivant, métronome, tempo, capo ;
//   setlists : créer, ajouter un chant (éditeur), vue Partitions (G seulement : pas de bascule en deux volets),
//   corbeille (mettre, restaurer, supprimer).
//
// Non couvertes par un test d'interface (comptées dans le code, vérifiées ici par le seul test de registre) :
//   chants : cmd.chants.recherche, cmd.chants.basculeZh, cmd.chants.statsDuChant, cmd.chants.proposer ;
//   chant : cmd.chant.toniqueOrigine, cmd.chant.disposition, cmd.chant.jianpu, cmd.chant.maVersion,
//     cmd.chant.retablir, cmd.chant.adapter, cmd.chant.transitions, cmd.chant.annoter,
//     cmd.chant.jeJoue ;
//   louange : cmd.louange.pleinEcran, cmd.louange.affichage.<played|unique|structure>, cmd.louange.cercle,
//     cmd.louange.feuilleDeRoute, cmd.louange.reperes, cmd.louange.demiPage, cmd.louange.themeScene ;
//   setlists : cmd.setlist.modifierLigne, cmd.setlist.vue.liste, cmd.setlist.sommaire, cmd.setlist.idees,
//     cmd.setlist.historique, cmd.setlist.partager, cmd.setlist.presentation, cmd.setlist.notifier.

const MEMBRE: FakeProfile = {
  uid: "uid-usage-t2-sorbier",
  email: "ysolde.sorbier@example.com",
  firstName: "Ysolde",
  lastName: "Sorbier",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const FR = "abba-pere";
const ZH = "一切歌颂赞美";

type Commit = { writes: { updateTransforms: { fieldPath: string; increment: { integerValue: string } }[] }[] };

const csvVide = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));

/** Intercepte `documents:commit` (celui du comptage) : rend la liste des corps reçus. */
async function poserCommit(page: Page) {
  const recus: Commit[] = [];
  await page.route("**/documents:commit", async (route) => {
    recus.push(JSON.parse(route.request().postData() ?? "{}"));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ writeResults: [] }) });
  });
  return recus;
}

/** Connecté, sur `url`, l'envoi du jour déjà fait (rien ne part tant que `envoyer` n'a pas rouvert l'envoi). */
async function preparer(page: Page, docs: Record<string, Record<string, unknown>>, url: string, init: Record<string, string> = {}) {
  await csvVide(page);
  await page.addInitScript((extra) => {
    try {
      const p = (n: number) => String(n).padStart(2, "0");
      const d = new Date();
      localStorage.setItem("gcc-usage-envoi", `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
      localStorage.setItem("jianpu-sheet-pref", "never");
      localStorage.setItem("accords-aide-vue", "1");
      if (!localStorage.getItem("usage-t2-init")) {
        localStorage.setItem("usage-t2-init", "1");
        for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
      }
    } catch { /* ignore */ }
  }, init);
  const db = await signInAs(page, MEMBRE, docs, url);
  const recus = await poserCommit(page);
  return { db, recus };
}

/** Rouvre l'envoi, passe en arrière-plan, puis vérifie que le commit porte `increment` 1 sur la clé. */
async function verifier(page: Page, recus: Commit[], cle: string) {
  await page.evaluate(() => {
    localStorage.removeItem("gcc-usage-envoi");
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => recus.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const champs = recus.flatMap((c) => c.writes.flatMap((w) => w.updateTransforms));
  const n = champs.filter((t) => t.fieldPath === `\`${cle}\`.n`);
  expect(n, `${cle} absente du commit : ${champs.map((t) => t.fieldPath).join(", ")}`).toHaveLength(1);
  expect(n[0].increment.integerValue).toBe("1");
}

/** React a posé ses gestionnaires : un toucher avant l'hydratation ne ferait rien. */
const hydrate = (page: Page) =>
  page.waitForFunction(() => {
    const b = document.querySelector("button");
    return !!b && Object.keys(b).some((k) => k.startsWith("__reactProps"));
  });

// ── Page chant : un chant français et un chant chinois ──────────────────────

const CHANTS = [
  { langue: "FR", slug: FR },
  { langue: "ZH", slug: ZH },
] as const;

test.describe("page chant", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  for (const { langue, slug } of CHANTS) {
    const url = `/songs/${encodeURIComponent(slug)}`;

    test(`${langue} : transposer (+) compte cmd.chant.transposer`, async ({ page }) => {
      const { recus } = await preparer(page, {}, url);
      await hydrate(page);
      await page.getByTestId("pilule-tonalite").getByRole("button", { name: "+", exact: true }).click();
      await verifier(page, recus, "cmd.chant.transposer");
    });

    test(`${langue} : copier les paroles compte cmd.chant.copierParoles`, async ({ page }) => {
      const { recus } = await preparer(page, {}, url);
      await page.locator("[data-copy-line]").first().waitFor();
      await hydrate(page);
      await page.evaluate(() => {
        const lignes = document.querySelectorAll("[data-copy-line]");
        const r = document.createRange();
        r.setStart(document.body, 0);
        r.setEndAfter(lignes[lignes.length - 1]);
        const s = getSelection()!;
        s.removeAllRanges();
        s.addRange(r);
      });
      await page.keyboard.press("ControlOrMeta+c");
      await verifier(page, recus, "cmd.chant.copierParoles");
    });

    test(`${langue} : toucher un accord compte cmd.chant.accord`, async ({ page }) => {
      const { recus } = await preparer(page, {}, url);
      const accord = page.locator("[data-accord-touchable]").first();
      await expect(accord).toBeVisible();
      await hydrate(page);
      await accord.click();
      await expect(page.locator("[data-accord-panneau]")).toBeVisible();
      await verifier(page, recus, "cmd.chant.accord");
    });

    test(`${langue} : export PDF compte cmd.chant.pdf`, async ({ page }) => {
      const { recus } = await preparer(page, {}, url);
      await hydrate(page);
      await page.getByTestId("barre-outils").getByRole("button", { name: "PDF", exact: true }).click();
      const feuille = page.getByRole("dialog", { name: "Quel PDF ?" });
      const [telechargement] = await Promise.all([
        page.waitForEvent("download", { timeout: 60_000 }),
        feuille.getByRole("button", { name: "Télécharger" }).click(),
      ]);
      expect(telechargement.suggestedFilename()).toMatch(/\.pdf$/);
      await verifier(page, recus, "cmd.chant.pdf");
    });
  }
});

// ── Mode louange ─────────────────────────────────────────────────────────────

const ID_LOUANGE = "setlist-usage-t2-louange";
const itemL = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlistLouange = {
  title: "Culte d'essai du comptage",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-08",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: ["avec-nous", "abba-pere", "a-l-agneau"].map((s, i) => itemL(s, i + 1)),
};

/** Setlist ouverte (sans entrer dans le mode) ; `ouvrirLeMode` clique « Mode Louange » et compte donc `cmd.louange.ouvrir`. */
async function setlistLouangeOuverte(page: Page, init: Record<string, string> = {}) {
  const prepare = await preparer(page, { [`setlists/${ID_LOUANGE}`]: setlistLouange }, `/setlists/${ID_LOUANGE}`, {
    "perf-role-preset": "pianiste",
    "perf-theme": "light",
    ...init,
  });
  return prepare;
}
async function ouvrirLeMode(page: Page) {
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

test.describe("mode louange", () => {
  test("ouvrir compte cmd.louange.ouvrir", async ({ page }) => {
    const { recus } = await setlistLouangeOuverte(page);
    await ouvrirLeMode(page);
    await verifier(page, recus, "cmd.louange.ouvrir");
  });

  test("chant suivant compte cmd.louange.chantSuivant", async ({ page }) => {
    const { recus } = await setlistLouangeOuverte(page);
    await ouvrirLeMode(page);
    // Une page à la fois : deux touches par tour enjambaient la dernière page du chant (la pastille n'y vit que là).
    for (let i = 0; i < 20 && (await onStage(page, "[data-suivant]").count()) === 0; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
    }
    await expect(onStage(page, "[data-suivant]")).toHaveCount(1);
    // Un clic DOM : la barre et ses calques peuvent recouvrir la pastille sans qu'elle cesse d'être le bouton.
    await onStage(page, "[data-suivant]").dispatchEvent("click");
    await verifier(page, recus, "cmd.louange.chantSuivant");
  });

  test("métronome compte cmd.louange.metronome", async ({ page }) => {
    const { recus } = await setlistLouangeOuverte(page);
    await ouvrirLeMode(page);
    const options = await ouvrirOptions(page);
    await options.locator("[data-metronome]").click();
    await verifier(page, recus, "cmd.louange.metronome");
  });

  test("tempo + compte cmd.louange.tempo", async ({ page }) => {
    const { recus } = await setlistLouangeOuverte(page);
    await ouvrirLeMode(page);
    // Au téléphone les lignes du tempo sont en tête d'Options (ouvrirMenu « outils » y renvoie).
    const menu = page.viewportSize()!.width < 768 ? await ouvrirOutils(page) : await ouvrirMenu(page, "tempo");
    await menu.locator("[data-tempo-plus]").click();
    await verifier(page, recus, "cmd.louange.tempo");
  });

  test("capo + compte cmd.chant.capo", async ({ page }) => {
    const { recus } = await setlistLouangeOuverte(page, { "perf-role-preset": "guitariste" });
    await ouvrirLeMode(page);
    const outils = await ouvrirOutils(page);
    await outils.getByRole("button", { name: "Monter le capo" }).click();
    await verifier(page, recus, "cmd.chant.capo");
  });
});

// ── Setlists ─────────────────────────────────────────────────────────────────

const MUSICIEN_CREATEUR: FakeProfile = {
  uid: "uid-usage-t2-createur",
  email: "ysolde.createur@example.com",
  firstName: "Ysolde",
  lastName: "Sorbier",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

test.describe("setlists", () => {
  test("créer une setlist compte cmd.setlist.creer et ajouter un chant cmd.setlist.ajouterChant", async ({ page }) => {
    await csvVide(page);
    await page.addInitScript(() => {
      const p = (n: number) => String(n).padStart(2, "0");
      const d = new Date();
      localStorage.setItem("gcc-usage-envoi", `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    });
    const db = await signInAs(page, MUSICIEN_CREATEUR, {}, "/setlists/new?autre=1");
    const recus = await poserCommit(page);
    await page.getByLabel("Titre").fill("Culte du comptage");
    await page.getByLabel("Catégorie").selectOption("Culte Francophone");
    await page.getByLabel(/^Présidence$/).selectOption("__other__");
    await page.getByPlaceholder("Nom", { exact: true }).fill("Jonathan Z.");
    await ajouterChant(page, "Abba Père");
    await attendreEditeur(page, "Abba Père");
    await expect.poll(() => db.writes.some((w) => /^setlists\/[^/]+$/.test(w.path)), { timeout: 10_000 }).toBe(true);
    await page.getByRole("button", { name: "Publier" }).click();
    await page.waitForURL((u) => /^\/setlists\/[^/]+$/.test(u.pathname.replace(/\/$/, "")) && !u.pathname.includes("/new"));
    await verifier(page, recus, "cmd.setlist.creer");
    expect(recus.flatMap((c) => c.writes.flatMap((w) => w.updateTransforms)).filter((t) => t.fieldPath === "`cmd.setlist.ajouterChant`.n")[0]?.increment.integerValue).toBe("1");
  });

  test("vue Partitions compte cmd.setlist.vue.partitions", async ({ page }) => {
    const { recus } = await preparer(page, { [`setlists/${ID_LOUANGE}`]: setlistLouange }, `/setlists/${ID_LOUANGE}`);
    test.skip(await enDeuxVolets(page), "deux volets : pas de bascule Liste | Partitions, les partitions sont toujours à droite");
    await ouvrirPartitions(page);
    await verifier(page, recus, "cmd.setlist.vue.partitions");
  });

  const CREATRICE: FakeProfile = {
    uid: "uid-usage-t2-corbeille",
    email: "ysolde.corbeille@example.com",
    firstName: "Ysolde",
    lastName: "Sorbier",
    serviceRoles: { "Culte Francophone": ["chanteur"] },
  };
  const setlistCorbeille = (over: Record<string, unknown>) => ({
    title: "Sans titre",
    leader: "",
    category: "Culte Francophone",
    date: "2099-01-10",
    language: "fr",
    notes: "",
    ownerId: CREATRICE.uid,
    isPrivate: false,
    isDraft: false,
    items: [],
    ...over,
  });
  const A_LA_CORBEILLE = { supprimeeLe: "2026-10-10T09:00:00.000Z", supprimeePar: CREATRICE.uid };

  async function preparerCorbeille(page: Page, docs: Record<string, Record<string, unknown>>, url: string) {
    await csvVide(page);
    await page.addInitScript(() => {
      const p = (n: number) => String(n).padStart(2, "0");
      const d = new Date();
      localStorage.setItem("gcc-usage-envoi", `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    });
    await signInAs(page, CREATRICE, docs, url);
    return poserCommit(page);
  }

  test("corbeille : mettre compte cmd.setlist.corbeille.mettre", async ({ page }) => {
    const recus = await preparerCorbeille(page, { "setlists/usage-c1": setlistCorbeille({ title: "Culte de la brume" }) }, "/setlists/usage-c1");
    await expect(page.getByRole("heading", { name: "Culte de la brume" })).toBeVisible();
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await page.getByRole("button", { name: "Mettre à la corbeille" }).click();
    await expect(page.getByTestId("bandeau-corbeille")).toBeVisible();
    await verifier(page, recus, "cmd.setlist.corbeille.mettre");
  });

  test("corbeille : restaurer compte cmd.setlist.corbeille.restaurer", async ({ page }) => {
    const recus = await preparerCorbeille(page, { "setlists/usage-c2": setlistCorbeille({ title: "Veillée du lierre", ...A_LA_CORBEILLE }) }, "/setlists");
    await page.getByRole("tab", { name: "Archives" }).click();
    await page.getByRole("button", { name: /^Corbeille \(\d+\)/ }).click();
    await page.getByTestId("corbeille").getByRole("button", { name: "Restaurer" }).click();
    await expect(page.getByTestId("corbeille")).toHaveCount(0);
    await verifier(page, recus, "cmd.setlist.corbeille.restaurer");
  });

  test("corbeille : supprimer pour de bon compte cmd.setlist.corbeille.supprimer", async ({ page }) => {
    const recus = await preparerCorbeille(page, { "setlists/usage-c3": setlistCorbeille({ title: "Veillée du houx", ...A_LA_CORBEILLE }) }, "/setlists");
    await page.getByRole("tab", { name: "Archives" }).click();
    await page.getByRole("button", { name: /^Corbeille \(\d+\)/ }).click();
    await page.getByTestId("corbeille").getByRole("button", { name: "Supprimer définitivement" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer définitivement" }).click();
    await expect(page.getByTestId("corbeille")).toHaveCount(0);
    await verifier(page, recus, "cmd.setlist.corbeille.supprimer");
  });
});

// ── Registre : chaque clé comptée dans le code est dans CLES_USAGE (Node, sans page) ─────────────

test("registre : chaque clé cmd.… écrite dans src/ est dans CLES_USAGE, et chaque clé cmd.… du registre est comptée", () => {
  const fichiers: string[] = [];
  const parcourir = (dir: string) => {
    for (const nom of readdirSync(dir)) {
      const p = join(dir, nom);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (/\.(ts|tsx)$/.test(nom) && p !== join("src", "lib", "usageCles.ts")) fichiers.push(p);
    }
  };
  parcourir("src");
  const litterales = new Set<string>();
  let valeursAffichage = false;
  for (const f of fichiers) {
    const source = readFileSync(f, "utf8");
    for (const m of source.matchAll(/["'`](cmd\.[A-Za-z0-9_.]+)["'`]/g)) litterales.add(m[1]);
    // Clé construite : `cmd.louange.affichage.${v}`, v ∈ played | unique | structure (PartitionLayout).
    if (source.includes("`cmd.louange.affichage.${")) valeursAffichage = true;
  }
  expect(litterales.size).toBeGreaterThan(30);
  for (const cle of litterales) expect(CLES_USAGE, `clé comptée absente du registre : ${cle}`).toHaveProperty([cle]);
  expect(valeursAffichage).toBe(true);
  for (const v of ["played", "unique", "structure"]) expect(CLES_USAGE).toHaveProperty([`cmd.louange.affichage.${v}`]);
  for (const cle of Object.keys(CLES_USAGE).filter((c) => c.startsWith("cmd.") && !c.startsWith("cmd.louange.affichage."))) {
    expect(litterales.has(cle), `clé du registre jamais comptée : ${cle}`).toBe(true);
  }
});
