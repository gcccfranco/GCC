import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, lireCompteur, NOM_MENU, ouvrirJeJoue, type Langue } from "./helpers/louange";
import { basculerAccords, ouvrirPartitions } from "./helpers/setlist";

// Lot RP, tranche 2 (docs/spec-mode-louange-forscore-2.md « RP — Rôle proposé d'après le planning ») : le mode louange
// propose le rôle du planning, sans jamais l'appliquer seul. Étiquette « d'après le planning » dans Je joue (sans rôle
// retenu, première ouverture), pastille « Planning : … · Passer en vue … » (rôle déjà retenu qui diffère), « Annuler ».
// Sheet Google, setlist et compte simulés, noms inventés ; aucune lecture ni écriture de la vraie base.
test.use({ serviceWorkers: "block", deviceScaleFactor: 1 });

const SETLIST_ID = "setlist-role-planning";
const UID = "uid-solene";
const SOLENE: FakeProfile = {
  uid: UID,
  email: "solene-varin@example.com",
  firstName: "Solène",
  lastName: "Varin",
  planningName: "Solène Varin",
};
const NOM = "Solène Varin";
const PRESIDENT = "Gaspard Huet";
const DATE = "2026-11-09";

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (slugs: string[], extra: Record<string, unknown> = {}) => ({
  title: "Culte d'essai du planning",
  leader: PRESIDENT,
  category: "Culte Francophone",
  date: DATE,
  language: "mixed",
  notes: "",
  ownerId: UID,
  isPrivate: false,
  items: slugs.map((s, i) => item(s, i + 1)),
  ...extra,
});
const FR = ["avec-nous", "abba-pere", "a-l-agneau"];
const ZH = ["谢谢你", "活着为要敬拜你", "耶和华所定的日子"];

// ─── Sheet simulé ──────────────────────────────────────────────────────────────

type Feuilles = Record<string, string[][]>;
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

/** Culte Franco : date, présidence, choristes (2), piano, guitare, batterie. */
const culte = (c: { piano?: string; guitare?: string; batterie?: string }, date = "09/11"): Feuilles => ({
  Franco_Louange: [["DATE"], [date, PRESIDENT, "", "", c.piano ?? "", c.guitare ?? "", c.batterie ?? ""]],
});

/** Réponses du Sheet : par onglet (`?sheet=`), toutes en panne (`statut`), ou retenues jusqu'à `porte`. Compte les lectures. */
async function simulerSheet(page: Page, feuilles: Feuilles, opts: { statut?: number; porte?: Promise<void> } = {}) {
  const suivi = { n: 0 };
  await page.route(/docs\.google\.com\/spreadsheets/, async (route) => {
    suivi.n++;
    if (opts.porte) await opts.porte;
    if (opts.statut) return route.fulfill({ status: opts.statut, contentType: "text/plain", body: "" });
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: csv(feuilles[sheet] ?? []) });
  });
  return suivi;
}

/** Attend que le planning ait fini de se lire (plus aucune lecture nouvelle pendant 400 ms) puis que la page ait digéré. */
async function attendreSheet(page: Page, suivi: { n: number }) {
  await expect.poll(() => suivi.n, { timeout: 20_000 }).toBeGreaterThan(0);
  let dernier = -1;
  await expect.poll(() => { const stable = suivi.n === dernier; dernier = suivi.n; return stable; }, { intervals: [400], timeout: 20_000 }).toBe(true);
  await page.waitForTimeout(300);
}

// ─── Mise en place ─────────────────────────────────────────────────────────────

const telephone = (page: Page) => page.viewportSize()!.width < 768;
const lire = (page: Page, cle: string) => page.evaluate((c) => localStorage.getItem(c), cle);
const pastille = (page: Page) => page.locator("[data-pastille-planning]");
const dialogueJeJoue = (page: Page, langue: Langue = "fr") => page.getByRole("dialog", { name: NOM_MENU[langue].jejoue, exact: true });

/** Réglages de départ posés une seule fois (le script d'initialisation rejoue à chaque chargement de page). */
async function preparer(page: Page, opts: { langue?: Langue; theme?: "light" | "dark"; role?: string; aucun?: boolean; init?: Record<string, string> } = {}) {
  const { langue = "fr", theme = "light", role, aucun, init = {} } = opts;
  const depart: Record<string, string> = { "perf-role-migre": "uid-autre", ...init };
  if (role) depart[`perf-role-preset-${UID}`] = role;
  if (aucun) depart[`perf-role-asked-${UID}`] = "1";
  await page.clock.setFixedTime(new Date("2026-11-09T10:00:00"));
  await page.addInitScript(([zh, th, extra]) => {
    try {
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", th as string);
      if (!localStorage.getItem("perf-test-init")) {
        localStorage.setItem("perf-test-init", "1");
        for (const [k, v] of Object.entries(extra as Record<string, string>)) localStorage.setItem(k, v);
      }
    } catch { /* ignore */ }
  }, [langue === "zh", theme, depart] as const);
}

type Ouverture = {
  feuilles?: Feuilles; statut?: number; porte?: Promise<void>;
  profil?: FakeProfile; setlist?: Record<string, unknown>; slugs?: string[];
  /** Ne pas attendre le planning avant d'ouvrir le mode (planning qui arrive en retard). */
  sansAttendre?: boolean;
};

/** Ouvre la setlist puis le mode louange, une fois le planning lu (sauf `sansAttendre`). */
async function ouvrirMode(page: Page, o: Ouverture = {}) {
  const suivi = await simulerSheet(page, o.feuilles ?? {}, { statut: o.statut, porte: o.porte });
  const profil = o.profil ?? SOLENE;
  const doc = setlist(o.slugs ?? FR, o.setlist ?? {});
  await signInAs(page, profil, { [`setlists/${SETLIST_ID}`]: doc }, `/setlists/${SETLIST_ID}`);
  const bouton = page.getByRole("button", { name: /Mode Louange|敬拜模式/ });
  await bouton.waitFor();
  if (!o.sansAttendre && profil.planningName) await attendreSheet(page, suivi);
  await bouton.click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  return suivi;
}

// ─── Étiquette de Je joue (sans rôle retenu) ───────────────────────────────────

test("sans rôle retenu : Je joue s'ouvre seul, Batteur porte « d'après le planning », rien n'est coché ni changé ; un toucher sur Batteur le choisit", async ({ page }) => {
  await preparer(page);
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }) });
  const dialogue = dialogueJeJoue(page);
  await expect(dialogue).toBeVisible();
  const etiquette = dialogue.locator("[data-role-planning]");
  await expect(etiquette).toHaveCount(1);
  await expect(etiquette).toHaveText("d'après le planning");
  const ligne = dialogue.getByRole("button", { name: /^Batteur/ });
  await expect(ligne.locator("[data-role-planning]")).toHaveCount(1);
  const fs = await etiquette.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(fs, "12 à 13 px").toBeGreaterThanOrEqual(12);
  expect(fs).toBeLessThanOrEqual(13);
  // Étiquette à droite du nom, ligne dans le dialogue.
  const bl = (await ligne.boundingBox())!;
  const be = (await etiquette.boundingBox())!;
  expect(be.x + be.width, "l'étiquette reste dans sa ligne").toBeLessThanOrEqual(bl.x + bl.width + 1);
  expect(be.x, "à droite du nom").toBeGreaterThan(bl.x + bl.width / 3);

  for (const role of ["Pianiste", "Guitariste", "Présidence", "Choriste", "Batteur"]) {
    await expect(dialogue.getByRole("button", { name: new RegExp(`^${role}`) }), `${role} non coché`).toHaveAttribute("aria-pressed", "false");
  }
  await expect(dialogue.getByRole("radio", { name: "Structure seule" }), "l'affichage n'a pas changé").toHaveAttribute("aria-checked", "false");
  expect(await lire(page, "partition-layout")).toBeNull();
  expect(await lire(page, `perf-role-preset-${UID}`)).toBeNull();
  await expect(pastille(page), "sans rôle retenu, pas de pastille").toHaveCount(0);

  await ligne.click();
  await expect.poll(() => lire(page, `perf-role-preset-${UID}`)).toBe("batteur");
  await expect(dialogue.getByRole("radio", { name: "Structure seule" })).toHaveAttribute("aria-checked", "true");
});

// ─── Pastille ──────────────────────────────────────────────────────────────────

test("Piano retenu, planning Batterie : pastille centrée, dans l'écran, ≤ 60 px ; la vue reste Pianiste ; la croix la ferme sans rien changer ni tourner la page", async ({ page }) => {
  await preparer(page, { role: "pianiste", init: { "perf-font-scale": "1.5" } });
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }) });
  const p = pastille(page);
  await expect(p).toBeVisible();
  await expect(p).toHaveAttribute("role", "status");
  await expect(p).toContainText("Planning : Batterie aujourd'hui");
  await expect(p).toContainText("Passer en vue Batteur");

  const ecran = page.viewportSize()!;
  const boite = (await p.boundingBox())!;
  expect(Math.abs(boite.x + boite.width / 2 - ecran.width / 2), "centrée").toBeLessThanOrEqual(2);
  expect(boite.x, "ne déborde pas à gauche").toBeGreaterThanOrEqual(0);
  expect(boite.x + boite.width, "ne déborde pas à droite").toBeLessThanOrEqual(ecran.width);
  expect(boite.height, "hauteur").toBeLessThanOrEqual(60);
  expect(Math.round(boite.width), telephone(page) ? "358 px au téléphone (ou la fenêtre moins 16)" : "304 px").toBe(telephone(page) ? Math.min(358, ecran.width - 16) : 304);
  if ((await page.locator("[data-barre-ouverte]").count()) > 0) {
    const barre = (await page.locator("[data-barre-haut]").boundingBox())!;
    expect(boite.y, "juste sous la barre de titre").toBeGreaterThanOrEqual(barre.y + barre.height - 1);
    expect(boite.y, "sans écart excessif sous la barre").toBeLessThanOrEqual(barre.y + barre.height + 12);
  }
  for (const bouton of [p.getByRole("button", { name: /Planning/ }), p.getByRole("button", { name: "Fermer la proposition" })]) {
    expect((await bouton.boundingBox())!.height, "cible d'au moins 44 px").toBeGreaterThanOrEqual(43.5);
  }

  // La vue n'a pas bougé : rien n'est basculé sans toucher.
  expect(await lire(page, `perf-role-preset-${UID}`)).toBe("pianiste");
  expect(await lire(page, "partition-layout")).toBeNull();

  const avant = await lireCompteur(page);
  await p.getByRole("button", { name: "Fermer la proposition" }).click();
  await expect(p).toHaveCount(0);
  expect(await lireCompteur(page), "la croix ne tourne pas la page").toBe(avant);
  expect(await lire(page, `perf-role-preset-${UID}`)).toBe("pianiste");
  const dialogue = await ouvrirJeJoue(page);
  await expect(dialogue.getByRole("button", { name: /^Pianiste/ })).toHaveAttribute("aria-pressed", "true");
  await expect(dialogue.getByRole("button", { name: /^Batteur/ })).toHaveAttribute("aria-pressed", "false");
});

test("accepter : vue Batteur appliquée et retenue ; « Annuler » rétablit Pianiste et l'affichage d'avant ; la pastille ne revient pas", async ({ page }) => {
  await preparer(page, { role: "pianiste" });
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }) });
  const p = pastille(page);
  await expect(p).toBeVisible();
  await p.getByRole("button", { name: /Passer en vue Batteur/ }).click();
  await expect.poll(() => lire(page, `perf-role-preset-${UID}`)).toBe("batteur");
  await expect.poll(() => lire(page, "partition-layout"), "le Batteur pose Structure seule").toBe("structure");
  await expect(p).toContainText("Vue Batteur");
  const annuler = p.getByRole("button", { name: "Annuler" });
  await expect(annuler).toBeVisible();
  expect((await annuler.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);

  await annuler.click();
  await expect.poll(() => lire(page, `perf-role-preset-${UID}`)).toBe("pianiste");
  await expect.poll(() => lire(page, "partition-layout"), "l'affichage d'avant").toBe("played");
  await expect(p).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(p, "ne repropose pas").toHaveCount(0);
  const dialogue = await ouvrirJeJoue(page);
  await expect(dialogue.getByRole("button", { name: /^Pianiste/ })).toHaveAttribute("aria-pressed", "true");
  await expect(dialogue.getByRole("radio", { name: "Ordre joué" })).toHaveAttribute("aria-checked", "true");
});

test("accepter : « Annuler » reste 6 s puis la pastille disparaît, la vue Batteur reste", async ({ page }) => {
  await preparer(page, { role: "pianiste" });
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }) });
  const p = pastille(page);
  await p.getByRole("button", { name: /Passer en vue Batteur/ }).click();
  await expect(p.getByRole("button", { name: "Annuler" })).toBeVisible();
  await page.waitForTimeout(4000);
  await expect(p, "encore là avant 6 s").toBeVisible();
  await expect(p).toHaveCount(0, { timeout: 5000 });
  expect(await lire(page, `perf-role-preset-${UID}`)).toBe("batteur");
});

test("la pastille disparaît au premier tour de page et ne revient pas", async ({ page }) => {
  await preparer(page, { role: "pianiste", init: { "perf-font-scale": "1.5" } });
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }) });
  await expect(pastille(page)).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
  await expect(pastille(page)).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \//);
  await page.waitForTimeout(400);
  await expect(pastille(page), "ne revient pas").toHaveCount(0);
  expect(await lire(page, `perf-role-preset-${UID}`), "rien n'a basculé").toBe("pianiste");
});

// ─── La correspondance planning → vue, dans le navigateur ─────────────────────

const PAIX_ENTETE = ["DATE", "Présidence", "Musiciens", "Orateur"];
const campus = (mu: { piano?: string; guitare?: string; batterie?: string }, repetition = ""): Feuilles => ({
  Campus_Louange: [
    ["DATE", "Moment", "Président", "Choriste", "Choriste"],
    ["09/11", "Matin", PRESIDENT, "", "", mu.piano ?? "", mu.guitare ?? "", mu.batterie ?? "", "", "", "", "", "", "", repetition],
  ],
});

const POSITIFS: { nom: string; feuilles: Feuilles; setlist?: Record<string, unknown>; profil?: FakeProfile; attendu: string }[] = [
  {
    nom: "Cajon à l'EDD → Batteur",
    feuilles: { EDD: [["DATE", "Présidence", "Suppléant", "Piano", "Cajon", "Guitare", "Cours", "Classe"], ["09/11", PRESIDENT, "", "", NOM, "", "", "中班"]] },
    setlist: { category: "中班" },
    attendu: "Passer en vue Batteur",
  },
  {
    nom: "Cajon/Batterie à l'Interfranco → Batteur",
    feuilles: { Interfranco: [["DATE"], ["09/11", PRESIDENT, "", "", "", "", NOM]] },
    setlist: { category: "Interfranco" },
    attendu: "Passer en vue Batteur",
  },
  {
    nom: "Percussion d'un groupe → Batteur",
    feuilles: { Paix_T4: [PAIX_ENTETE, ["09/11", PRESIDENT, "", "", "", NOM]] },
    setlist: { category: "Groupe Paix" },
    attendu: "Passer en vue Batteur",
  },
  {
    nom: "Musicien sans préfixe, profil qui joue du piano → Pianiste",
    feuilles: { Paix_T4: [PAIX_ENTETE, ["09/11", PRESIDENT, NOM]] },
    setlist: { category: "Groupe Paix" },
    profil: { ...SOLENE, joue: ["piano"] },
    attendu: "Passer en vue Pianiste",
  },
  {
    nom: "Campus « Piano: Nom » → Pianiste (séance et répétition dédoublonnées)",
    feuilles: campus({ piano: NOM }, "02/11/2026 17:00 Grande Salle"),
    setlist: { category: "Campus", moment: "matin" },
    attendu: "Passer en vue Pianiste",
  },
];

for (const cas of POSITIFS) {
  test(`pastille proposée : ${cas.nom}`, async ({ page }) => {
    await preparer(page, { role: "guitariste" });
    await ouvrirMode(page, { feuilles: cas.feuilles, setlist: cas.setlist, profil: cas.profil });
    await expect(pastille(page)).toBeVisible();
    await expect(pastille(page)).toContainText(cas.attendu);
    expect(await lire(page, `perf-role-preset-${UID}`), "rien n'est basculé").toBe("guitariste");
  });
}

// ─── Aucune proposition ────────────────────────────────────────────────────────

/** Ni pastille ni étiquette : la vue retenue n'a pas bougé, Je joue (ouvert à la main) ne marque aucun rôle. */
async function aucuneProposition(page: Page, role: string | null) {
  await page.waitForTimeout(600);
  await expect(pastille(page)).toHaveCount(0);
  const dialogue = (await dialogueJeJoue(page).isVisible()) ? dialogueJeJoue(page) : await ouvrirJeJoue(page);
  await expect(dialogue.getByRole("button", { name: /^Pianiste/ })).toBeVisible();
  await expect(dialogue.locator("[data-role-planning]")).toHaveCount(0);
  expect(await lire(page, `perf-role-preset-${UID}`)).toBe(role);
}

const SANS_PROPOSITION: { nom: string; feuilles?: Feuilles; statut?: number; setlist?: Record<string, unknown>; profil?: FakeProfile }[] = [
  { nom: "deux rôles le même service (Piano et Guitare)", feuilles: culte({ piano: NOM, guitare: NOM }) },
  { nom: "Sheet en panne (500)", statut: 500 },
  { nom: "profil sans planningName", feuilles: culte({ batterie: NOM }), profil: { ...SOLENE, planningName: undefined } },
  { nom: "catégorie sans planning", feuilles: culte({ batterie: NOM }), setlist: { category: "Réunion sans planning" } },
  { nom: "trimestre non publié", feuilles: culte({ batterie: NOM }, "10/01/2027"), setlist: { date: "2027-01-10" } },
];

for (const cas of SANS_PROPOSITION) {
  test(`aucune proposition : ${cas.nom} (rôle retenu)`, async ({ page }) => {
    await preparer(page, { role: "pianiste" });
    await ouvrirMode(page, cas);
    await aucuneProposition(page, "pianiste");
  });
}

test("aucune pastille : « Aucun » déjà répondu", async ({ page }) => {
  await preparer(page, { aucun: true });
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }) });
  await expect(dialogueJeJoue(page), "déjà répondu : pas d'ouverture automatique").toHaveCount(0);
  await page.waitForTimeout(600);
  await expect(pastille(page)).toHaveCount(0);
  expect(await lire(page, `perf-role-preset-${UID}`)).toBeNull();
});

test("aucune pastille : le rôle retenu est déjà celui du planning", async ({ page }) => {
  await preparer(page, { role: "pianiste" });
  await ouvrirMode(page, { feuilles: culte({ piano: NOM }) });
  await page.waitForTimeout(600);
  await expect(pastille(page)).toHaveCount(0);
});

test("aucune pastille : l'affichage de l'appareil contredit déjà le rôle (Batteur retenu, hors Structure seule)", async ({ page }) => {
  await preparer(page, { role: "batteur", init: { "partition-layout": "played" } });
  await ouvrirMode(page, { feuilles: culte({ piano: NOM }) });
  await page.waitForTimeout(600);
  await expect(pastille(page)).toHaveCount(0);
});

test("aucune pastille : accords changés sur la page de la setlist juste avant d'ouvrir le mode", async ({ page }) => {
  await preparer(page, { role: "pianiste" });
  const suivi = await simulerSheet(page, culte({ batterie: NOM }));
  await signInAs(page, SOLENE, { [`setlists/${SETLIST_ID}`]: setlist(FR) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await attendreSheet(page, suivi);
  await basculerAccords(page); // masqués
  await basculerAccords(page); // de nouveau affichés : « touchés »
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(600);
  await expect(pastille(page)).toHaveCount(0);
});

test("hors ligne (copie de la setlist servie) : ni pastille ni étiquette", async ({ page }) => {
  await preparer(page, { role: "pianiste" });
  const suivi = await simulerSheet(page, culte({ batterie: NOM }));
  await signInAs(page, SOLENE, { [`setlists/${SETLIST_ID}`]: setlist(FR) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).waitFor();
  await attendreSheet(page, suivi);
  // La copie est écrite à la lecture réussie ; seule la setlist devient injoignable, le profil et le planning restent lus.
  await page.route(new RegExp(`firestore\\.googleapis\\.com/.*/setlists/${SETLIST_ID}(\\?|$)`), (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByText(/Copie hors ligne du/)).toBeVisible();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(800);
  await expect(pastille(page)).toHaveCount(0);
  const dialogue = await ouvrirJeJoue(page);
  await expect(dialogue.locator("[data-role-planning]")).toHaveCount(0);
});

// ─── Planning qui arrive après l'ouverture du mode ─────────────────────────────

test("Sheet qui répond après l'ouverture, rôle retenu différent : la pastille apparaît, la vue n'a pas changé", async ({ page }) => {
  await preparer(page, { role: "pianiste" });
  let liberer!: () => void;
  const porte = new Promise<void>((r) => { liberer = r; });
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }), porte, sansAttendre: true });
  await page.waitForTimeout(500);
  await expect(pastille(page), "planning pas encore arrivé").toHaveCount(0);
  liberer();
  await expect(pastille(page)).toBeVisible();
  await expect(pastille(page)).toContainText("Passer en vue Batteur");
  expect(await lire(page, `perf-role-preset-${UID}`), "la vue n'a pas changé").toBe("pianiste");
  expect(await lire(page, "partition-layout")).toBeNull();
  const dialogue = await ouvrirJeJoue(page);
  await expect(dialogue.getByRole("button", { name: /^Pianiste/ })).toHaveAttribute("aria-pressed", "true");
  await expect(dialogue.locator("[data-role-planning]"), "un planning tardif n'ajoute pas l'étiquette").toHaveCount(0);
});

test("Sheet qui répond après l'ouverture, sans rôle retenu : pas d'étiquette ajoutée dans Je joue, pas de pastille", async ({ page }) => {
  await preparer(page);
  let liberer!: () => void;
  const porte = new Promise<void>((r) => { liberer = r; });
  const suivi = await ouvrirMode(page, { feuilles: culte({ batterie: NOM }), porte, sansAttendre: true });
  const dialogue = dialogueJeJoue(page);
  await expect(dialogue).toBeVisible();
  await expect(dialogue.locator("[data-role-planning]")).toHaveCount(0);
  liberer();
  await attendreSheet(page, suivi);
  await expect(dialogue.locator("[data-role-planning]"), "toujours aucune étiquette").toHaveCount(0);
  for (const role of ["Pianiste", "Guitariste", "Présidence", "Choriste", "Batteur"]) {
    await expect(dialogue.getByRole("button", { name: new RegExp(`^${role}`) })).toHaveAttribute("aria-pressed", "false");
  }
  await expect(pastille(page)).toHaveCount(0);
});

// ─── 中文 et sombre ────────────────────────────────────────────────────────────

test("en 中文 : la pastille, son bouton et sa croix portent les mots chinois ; Annuler = 撤销", async ({ page }) => {
  await preparer(page, { langue: "zh", role: "pianiste" });
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }), slugs: ZH });
  const p = pastille(page);
  await expect(p).toBeVisible();
  await expect(p).toContainText("排班表：今天鼓");
  await expect(p).toContainText("切换到鼓手视图");
  await expect(p.getByRole("button", { name: "关闭建议" })).toBeVisible();
  await p.getByRole("button", { name: /切换到鼓手视图/ }).click();
  await expect(p).toContainText("鼓手视图");
  await expect(p.getByRole("button", { name: "撤销" })).toBeVisible();
});

test("thème sombre : la pastille a un fond sombre, un texte clair et un liseré (thème du mode louange)", async ({ page }) => {
  await preparer(page, { theme: "dark", role: "pianiste" });
  await ouvrirMode(page, { feuilles: culte({ batterie: NOM }) });
  const p = pastille(page);
  await expect(p).toBeVisible();
  const style = await p.evaluate((e) => {
    const cs = getComputedStyle(e);
    const lum = (c: string) => { const m = c.match(/[\d.]+/g)!.map(Number); return m[0] + m[1] + m[2]; };
    const ligne = e.querySelector("button span") as HTMLElement;
    return { fond: lum(cs.backgroundColor), texte: lum(getComputedStyle(ligne).color), liseré: cs.borderTopWidth, ombre: cs.boxShadow };
  });
  expect(style.fond, "fond sombre").toBeLessThan(300);
  expect(style.texte, "texte clair").toBeGreaterThan(300);
  expect(style.liseré).toBe("1px");
  expect(style.ombre).not.toBe("none");
});

// ─── Captures à regarder (test-results/rp2/) ───────────────────────────────────

const SORTIE = "test-results/rp2";
async function capture(page: Page, testInfo: TestInfo, nom: string) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SORTIE}/${nom}-${testInfo.project.name}.png` });
}

for (const langue of ["fr", "zh"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`captures RP-2 : pastille puis Je joue avec l'étiquette, ${langue}, ${theme}`, async ({ page }, testInfo) => {
      await preparer(page, { langue, theme, role: "pianiste" });
      await ouvrirMode(page, { feuilles: culte({ batterie: NOM }), slugs: langue === "zh" ? ZH : FR });
      await expect(pastille(page)).toBeVisible();
      await capture(page, testInfo, `pastille-${langue}-${theme}`);
      const dialogue = await ouvrirJeJoue(page, langue);
      await expect(dialogue.locator("[data-role-planning]")).toHaveCount(1);
      await capture(page, testInfo, `je-joue-etiquette-${langue}-${theme}`);
    });
  }
}
