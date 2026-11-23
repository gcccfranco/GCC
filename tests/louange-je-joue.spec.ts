import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, lireCompteur, ouvrirJeJoue, type Langue } from "./helpers/louange";
import { ouvrirPartitions } from "./helpers/setlist";

// Lot FS-C (docs/spec-mode-louange-forscore-2.md) : « Je joue », le rôle, retenu par compte sur l'appareil (aucune écriture
// Firestore). RU-5 : c'est le premier groupe de la marge « Affichage » (colonne dès 1 024 px, sinon feuille basse), plus un menu.
// Comptes simulés, noms fictifs.

const SETLIST_ID = "setlist-je-joue";
const ANOUK: FakeProfile = {
  uid: "uid-anouk",
  email: "anouk-ferrand@example.com",
  firstName: "Anouk",
  lastName: "Ferrand",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const BASILE: FakeProfile = {
  uid: "uid-basile",
  email: "basile-morvan@example.com",
  firstName: "Basile",
  lastName: "Morvan",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (slugs: string[]) => ({
  title: "Culte d'essai de Je joue",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-09",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: slugs.map((s, i) => item(s, i + 1)),
});
const FR = ["avec-nous", "abba-pere", "a-l-agneau"];
const ZH = ["谢谢你", "活着为要敬拜你", "耶和华所定的日子"];

const telephone = (page: Page) => page.viewportSize()!.width < 768;
const tactile = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);
const lire = (page: Page, cle: string) => page.evaluate((c) => localStorage.getItem(c), cle);
// La marge ouverte (le groupe « Je joue » en fait partie) ; `data-ouvert` la distingue de la marge fermée, qui reste dans le DOM.
const dialogueJeJoue = (page: Page) => page.locator('[data-testid="marge-affichage"][data-mode="louange"][data-ouvert="true"]');

/** Réglages de départ posés une seule fois (le script d'initialisation rejoue à chaque chargement de page). */
async function preparer(page: Page, opts: { langue?: Langue; theme?: "light" | "dark"; init?: Record<string, string> } = {}) {
  const { langue = "fr", theme = "light", init = {} } = opts;
  await page.addInitScript(([zh, th, extra]) => {
    try {
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", th as string);
      if (!localStorage.getItem("perf-test-init")) {
        localStorage.setItem("perf-test-init", "1");
        for (const [k, v] of Object.entries(extra as Record<string, string>)) localStorage.setItem(k, v);
      }
    } catch { /* ignore */ }
  }, [langue === "zh", theme, init] as const);
}

async function ouvrirMode(page: Page, profil: FakeProfile, slugs = FR) {
  await signInAs(page, profil, { [`setlists/${SETLIST_ID}`]: setlist(slugs) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

/** Change de compte sur le même appareil : la session Firebase part, le localStorage de l'appareil reste. */
async function changerDeCompte(page: Page) {
  await page.evaluate(() => { indexedDB.deleteDatabase("firebaseLocalStorageDb"); });
  await page.goto("about:blank");
}

async function quitterLeMode(page: Page) {
  const y = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: "Quitter" }).click();
  await page.evaluate((to) => window.scrollTo(0, to), y);
}

/** Points d'une boîte où l'élément n'est ni bouton ni lien ni champ (titre, phrase, espace entre lignes). */
async function pointsInertes(page: Page, boite: { x: number; y: number; width: number; height: number }, parts: number[]) {
  return page.evaluate(({ b, ps }) => {
    const dialogue = document.querySelector('[data-testid="marge-affichage"][data-mode="louange"]');
    return ps.map((part) => {
      const x = b.x + b.width * part;
      for (let y = b.y + 2; y < b.y + b.height - 2; y += 3) {
        const el = document.elementFromPoint(x, y);
        if (!el || !dialogue?.contains(el)) continue;
        if (!el.closest("button, a, input, [role=radio], [role=slider], [role=switch]")) return { x, y };
      }
      return null;
    });
  }, { b: boite, ps: parts });
}

const ROLES = ["Pianiste", "Guitariste", "Présidence", "Choriste", "Batteur"];

test("Je joue : s'ouvre avec la marge Affichage, cinq rôles et « Aucun », le rôle actif coché ; un toucher dedans ne tourne pas la page ; Échap ferme puis quitte", async ({ page }) => {
  await preparer(page, { init: { "perf-role-preset": "guitariste", "perf-font-scale": "1.5" } });
  await ouvrirMode(page, ANOUK);
  await expect(dialogueJeJoue(page), "rôle déjà connu : pas d'ouverture automatique").toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
  const dialogue = await ouvrirJeJoue(page);
  await page.waitForTimeout(500);
  // La marge ouverte refait la pagination (RU-5) : le compteur de référence se lit après.
  const avant = await lireCompteur(page);

  const declencheur = page.locator('[data-menu-declencheur="affichage"]');
  await expect(declencheur).toHaveAttribute("aria-haspopup", "dialog");
  await expect(declencheur).toHaveAttribute("aria-expanded", "true");
  const boite = (await dialogue.boundingBox())!;
  const ecran = page.viewportSize()!;
  if ((await dialogue.getAttribute("data-place")) === "colonne") {
    expect(boite.x + boite.width, "colonne contre le bord droit").toBeGreaterThanOrEqual(ecran.width - 1);
    expect(boite.width).toBe(320);
  } else {
    expect(boite.y + boite.height, "feuille posée en bas").toBeGreaterThanOrEqual(ecran.height - 2);
  }

  await expect(dialogue.getByRole("heading", { name: "Je joue" })).toBeVisible();
  for (const role of ROLES) {
    const bouton = dialogue.getByRole("button", { name: new RegExp(`^${role}`) });
    await expect(bouton).toBeVisible();
    expect((await bouton.boundingBox())!.height, `${role} : au moins 44 px`).toBeGreaterThanOrEqual(43.5);
    await expect(bouton).toHaveAttribute("aria-pressed", role === "Guitariste" ? "true" : "false");
  }
  await expect(dialogue.getByText("Accords, paroles et capo")).toBeVisible();
  await expect(dialogue.getByRole("button", { name: /^Aucun/ })).toBeVisible();
  await expect(dialogue.getByRole("radiogroup", { name: "Ordre des sections" })).toBeVisible();
  await expect(dialogue.getByRole("switch", { name: "Paroles", exact: true }), "Paroles est dans « Ce que je lis »").toBeVisible();

  const doigt = await tactile(page);
  const points = await pointsInertes(page, boite, [0.15, 0.5, 0.85]);
  for (const [i, part] of [0.15, 0.5, 0.85].entries()) {
    expect(points[i], `un point inerte existe à ${part * 100} %`).not.toBeNull();
    if (doigt) await page.touchscreen.tap(points[i]!.x, points[i]!.y);
    else await page.mouse.click(points[i]!.x, points[i]!.y);
    await page.waitForTimeout(250);
    await expect(dialogue, `toujours ouvert après un toucher à ${part * 100} %`).toBeVisible();
    expect(await lireCompteur(page), `la page n'a pas tourné (${part * 100} %)`).toBe(avant);
  }

  // Toucher le rôle actif le retire.
  await dialogue.getByRole("button", { name: /^Guitariste/ }).click();
  await expect(dialogue.getByRole("button", { name: /^Guitariste/ })).toHaveAttribute("aria-pressed", "false");
  expect(await lire(page, "perf-role-preset-uid-anouk")).toBeNull();

  await page.keyboard.press("Escape");
  await expect(dialogue).toBeHidden();
  await expect(page.locator("[data-performance-mode]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
});

test("première ouverture d'un compte neuf : Je joue s'ouvre seul avec la phrase d'accueil, aucun rôle coché ; Batteur retenu par compte, plus de question", async ({ page }) => {
  await preparer(page);
  await ouvrirMode(page, ANOUK);
  const dialogue = dialogueJeJoue(page);
  await expect(dialogue).toBeVisible();
  await expect(dialogue.getByText("Choisis ce que tu joues, ton compte s'en souviendra.")).toBeVisible();
  for (const role of ROLES) await expect(dialogue.getByRole("button", { name: new RegExp(`^${role}`) })).toHaveAttribute("aria-pressed", "false");

  await dialogue.getByRole("button", { name: /^Batteur/ }).click();
  await expect.poll(() => lire(page, "perf-role-preset-uid-anouk")).toBe("batteur");
  expect(await lire(page, "perf-role-asked-uid-anouk")).toBe("1");
  expect(await lire(page, "perf-role-preset"), "la clé d'appareil n'est pas touchée").toBeNull();

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(dialogueJeJoue(page), "plus de question").toHaveCount(0);
  const rouvert = await ouvrirJeJoue(page);
  await expect(rouvert.getByRole("button", { name: /^Batteur/ })).toHaveAttribute("aria-pressed", "true");
});

test("deux comptes sur le même appareil : le premier hérite du rôle d'appareil, le second de rien", async ({ page }) => {
  test.setTimeout(60_000); // trois connexions et trois ouvertures du mode louange : ≈ 29 s seul, plus sous charge
  await preparer(page, { init: { "perf-role-preset": "pianiste" } });

  await ouvrirMode(page, ANOUK);
  await expect(dialogueJeJoue(page), "Anouk a hérité de Pianiste : pas de question").toHaveCount(0);
  const premier = await ouvrirJeJoue(page);
  await expect(premier.getByRole("button", { name: /^Pianiste/ })).toHaveAttribute("aria-pressed", "true");
  expect(await lire(page, "perf-role-migre")).toBe("uid-anouk");
  expect(await lire(page, "perf-role-preset-uid-anouk")).toBe("pianiste");
  expect(await lire(page, "perf-role-preset"), "la clé d'appareil reste").toBe("pianiste");
  await page.keyboard.press("Escape");
  await quitterLeMode(page);

  await changerDeCompte(page);
  await ouvrirMode(page, BASILE);
  const second = dialogueJeJoue(page);
  await expect(second, "Basile n'hérite de rien : la question s'ouvre").toBeVisible();
  await expect(second.getByText("Choisis ce que tu joues, ton compte s'en souviendra.")).toBeVisible();
  for (const role of ROLES) await expect(second.getByRole("button", { name: new RegExp(`^${role}`) })).toHaveAttribute("aria-pressed", "false");
  await second.getByRole("button", { name: /^Guitariste/ }).click();
  await expect.poll(() => lire(page, "perf-role-preset-uid-basile")).toBe("guitariste");
  expect(await lire(page, "perf-role-migre"), "la marque reste à Anouk").toBe("uid-anouk");
  expect(await lire(page, "perf-role-preset-uid-anouk")).toBe("pianiste");
  await page.keyboard.press("Escape");
  await quitterLeMode(page);

  await changerDeCompte(page);
  await ouvrirMode(page, ANOUK);
  await expect(dialogueJeJoue(page)).toHaveCount(0);
  const retour = await ouvrirJeJoue(page);
  await expect(retour.getByRole("button", { name: /^Pianiste/ })).toHaveAttribute("aria-pressed", "true");
  await expect(retour.getByRole("button", { name: /^Guitariste/ })).toHaveAttribute("aria-pressed", "false");
});

test("le rôle d'appareil n'est repris qu'à l'ouverture du mode louange : consulter la setlist (vue partitions) ne migre rien", async ({ page }) => {
  await preparer(page, { init: { "perf-role-preset": "batteur" } });
  // Anouk ne fait que consulter la setlist : la marque n'est pas posée, rien n'est copié vers son compte.
  await signInAs(page, ANOUK, { [`setlists/${SETLIST_ID}`]: setlist(FR) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(page.getByRole("list", { name: "Structure" }).first()).toBeVisible();
  expect(await lire(page, "perf-role-migre"), "pas de marque après une simple consultation").toBeNull();
  expect(await lire(page, "perf-role-preset-uid-anouk")).toBeNull();

  // Basile ouvre le mode louange : c'est lui qui hérite du rôle d'appareil.
  await changerDeCompte(page);
  await ouvrirMode(page, BASILE);
  await expect(dialogueJeJoue(page), "Basile a hérité de Batteur : pas de question").toHaveCount(0);
  expect(await lire(page, "perf-role-migre")).toBe("uid-basile");
  expect(await lire(page, "perf-role-preset-uid-basile")).toBe("batteur");
  expect(await lire(page, "perf-role-preset-uid-anouk"), "Anouk n'a rien").toBeNull();
});

test("la marge porte son titre « Affichage » et, au-dessous, le groupe « Je joue » avant « Ce que je lis »", async ({ page }) => {
  await preparer(page, { init: { "perf-role-preset": "guitariste" } });
  await ouvrirMode(page, ANOUK);
  const dialogue = await ouvrirJeJoue(page);
  const titre = dialogue.getByRole("heading", { name: "Affichage", exact: true });
  await expect(titre).toBeVisible();
  const jeJoue = dialogue.getByRole("heading", { name: "Je joue", exact: true });
  const jeLis = dialogue.getByRole("heading", { name: "Ce que je lis", exact: true });
  const y = async (l: typeof titre) => (await l.boundingBox())!.y;
  expect(await y(titre), "titre de la marge au-dessus des groupes").toBeLessThan(await y(jeJoue));
  expect(await y(jeJoue), "Je joue avant Ce que je lis").toBeLessThan(await y(jeLis));
});

test("vue partitions de la setlist : le rôle Batteur du compte donne « Structure seule » (clé par compte)", async ({ page }) => {
  await preparer(page, { init: { "perf-role-preset-uid-anouk": "batteur", "perf-role-asked-uid-anouk": "1", "perf-role-migre": "uid-autre" } });
  await signInAs(page, ANOUK, { [`setlists/${SETLIST_ID}`]: setlist(FR) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(page.getByRole("list", { name: "Structure" }).first()).toBeVisible();
  await expect(page.locator("[data-section]")).toHaveCount(0);
});

test("Je joue : rôles, ordre (Tout le chant, Une fois chacune, Plan), puis disposition, dans la même marge (FR)", async ({ page }) => {
  await preparer(page, { init: { "perf-role-preset": "guitariste" } });
  await ouvrirMode(page, ANOUK);
  const dialogue = await ouvrirJeJoue(page);
  const ordre = dialogue.getByRole("radiogroup", { name: "Ordre des sections" });
  await expect(ordre.getByRole("radio")).toHaveText(["Tout le chant", "Une fois chacune", "Plan"]);
  // Libellés longs : ils passent à la ligne dans leur segment, jamais sur le voisin.
  const debords = await ordre.getByRole("radio").evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
  expect(debords, "aucun libellé d'ordre ne déborde de son segment").toBe(0);
  const disposition = dialogue.locator('[role=radiogroup][aria-labelledby="perf-disposition"]');
  await expect(disposition.getByRole("radio")).toHaveCount(5);
  const y = async (l: ReturnType<typeof dialogue.locator>) => (await l.boundingBox())!.y;
  const yRole = await y(dialogue.getByRole("button", { name: /^Guitariste/ }));
  const yOrdre = await y(ordre);
  const yDispo = await y(disposition);
  expect(yRole, "rôles au-dessus de l'ordre").toBeLessThan(yOrdre);
  expect(yOrdre, "ordre au-dessus de la disposition").toBeLessThan(yDispo);
  if (telephone(page)) {
    const derniere = disposition.getByRole("radio").last();
    await derniere.scrollIntoViewIfNeeded();
    await expect(derniere).toBeInViewport();
    for (const radio of await disposition.getByRole("radio").all()) {
      expect((await radio.boundingBox())!.height, "chaque disposition : au moins 44 px").toBeGreaterThanOrEqual(43.5);
    }
  }
  const avant = (await lireCompteur(page)).split(" / ")[0];
  await disposition.getByRole("radio").last().click();
  await page.waitForTimeout(250);
  await expect(dialogue).toBeVisible();
  expect((await lireCompteur(page)).split(" / ")[0], "un choix de disposition ne tourne pas la page").toBe(avant);
  await expect(dialogue.getByText("Couleur des accords", { exact: true })).toBeVisible();
});

test("Je joue : ordre 完整顺序 / 每段一次 / 只看结构 (ZH)", async ({ page }) => {
  await preparer(page, { langue: "zh" });
  await ouvrirMode(page, ANOUK, ZH);
  const dialogue = await ouvrirJeJoue(page, "zh");
  await expect(dialogue.getByRole("radiogroup", { name: "段落顺序" }).getByRole("radio")).toHaveText(["完整顺序", "每段一次", "只看结构"]);
  await expect(dialogue.locator('[role=radiogroup][aria-labelledby="perf-disposition"]').getByRole("radio")).toHaveCount(5);
});

test("taille annotée : lue sous la clé du compte, pas sous celle d'un autre", async ({ page }) => {
  await preparer(page, { init: { "perf-role-preset-uid-anouk": "pianiste", "perf-role-migre": "uid-autre", [`perf-annot-scale-uid-anouk-${SETLIST_ID}-abba-pere`]: "1.3" } });
  await ouvrirMode(page, ANOUK, ["abba-pere"]);
  await expect(page.locator("[data-alerte-annotations]"), "annoté à 130 %, lu à 100 % : la bannière prévient").toBeVisible();
});

test("taille annotée : la clé d'un autre compte ne compte pas", async ({ page }) => {
  await preparer(page, { init: { "perf-role-preset-uid-anouk": "pianiste", "perf-role-migre": "uid-autre", [`perf-annot-scale-uid-basile-${SETLIST_ID}-abba-pere`]: "1.3", [`perf-annot-scale-${SETLIST_ID}-abba-pere`]: "1.3" } });
  await ouvrirMode(page, ANOUK, ["abba-pere"]);
  await page.waitForTimeout(500);
  await expect(page.locator("[data-alerte-annotations]")).toHaveCount(0);
});

for (const largeur of [1024, 1440]) {
  test(`capture FS-corr : la marge Affichage (Je joue) à ${largeur} px, titre en tête`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await preparer(page, { init: { "perf-role-preset": "guitariste" } });
    await ouvrirMode(page, ANOUK);
    const dialogue = await ouvrirJeJoue(page);
    await expect(dialogue.getByRole("heading", { name: "Affichage", exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/fs-corr/je-joue-${largeur}-${testInfo.project.name}.png` });
  });
}

// ─── Captures à regarder (test-results/fs-c/) ─────────────────────────────────

const SORTIE = "test-results/fs-c";
async function capture(page: Page, testInfo: TestInfo, nom: string) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SORTIE}/${nom}-${testInfo.project.name}.png` });
}

for (const langue of ["fr", "zh"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`captures FS-C : Je joue, phrase d'accueil puis rôle choisi, ${langue}, ${theme}`, async ({ page }, testInfo) => {
      await preparer(page, { langue, theme });
      await ouvrirMode(page, ANOUK, langue === "zh" ? ZH : FR);
      const dialogue = dialogueJeJoue(page);
      await expect(dialogue).toBeVisible();
      await expect(dialogue.getByText(langue === "zh" ? "选择你演奏的角色，你的账号会记住。" : "Choisis ce que tu joues, ton compte s'en souviendra.")).toBeVisible();
      await capture(page, testInfo, `je-joue-accueil-${langue}-${theme}`);
      await dialogue.getByRole("button", { name: langue === "zh" ? /^钢琴手/ : /^Pianiste/ }).click();
      await capture(page, testInfo, `je-joue-pianiste-${langue}-${theme}`);
      await page.keyboard.press("Escape");
      await expect(dialogue).toBeHidden();
    });
  }
}
