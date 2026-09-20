import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { presentationMessage } from "../src/lib/setlist/presentationLink";
import { nouvelEvenementMessage } from "../src/lib/evenements/rappel";
import { auditKey, certifiedSlugs, halfStepUp, loadChords, openSheet, slugsWithoutOverlay, songKey } from "./helpers/jianpu";

// Lot 8 « Nouveaux membres et 中文 » (docs/spec-nouveaux-membres.md).

const NOUVEAU: FakeProfile = { uid: "uid-neuf", email: "neuf@example.com", firstName: "Léa", lastName: "Martin", accueil: true };
const PRESIDENCE: FakeProfile = { ...NOUVEAU, serviceRoles: { "Culte Francophone": ["presidence", "chanteur"] } };
const MUSICIEN: FakeProfile = { ...NOUVEAU, serviceRoles: { "Groupe Paix": ["musicien"] } };

const accueil = (page: Page) => page.getByRole("dialog", { name: /Bienvenue dans GCC|欢迎使用 GCC/ });

async function jusquAuRole(page: Page) {
  await expect(accueil(page)).toBeVisible();
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Suivant" }).click();
}

// ── A1 : accueil à la première connexion ────────────────────────────────────

test("un compte qui n'a pas vu l'accueil le voit, le parcourt et « Commencer » le mémorise", async ({ page }) => {
  const db = await signInAs(page, MUSICIEN, {}, "/moi");
  const d = accueil(page);
  await expect(d).toBeVisible();
  await expect(d.getByRole("heading", { name: "Bienvenue dans GCC" })).toBeVisible();
  await d.getByRole("button", { name: "Suivant" }).click();
  await expect(d.getByText("Setlists")).toBeVisible();
  await d.getByRole("button", { name: "Suivant" }).click();
  await d.getByRole("button", { name: "Suivant" }).click();
  await d.getByRole("button", { name: "Suivant" }).click();
  await expect(d.getByRole("link", { name: "Ouvrir le guide" })).toBeVisible();
  await d.getByRole("button", { name: "Commencer" }).click();
  await expect(accueil(page)).toHaveCount(0);
  await expect.poll(() => db.doc("onboarding/uid-neuf")?.vu).toBe(true);
});

test("« Passer » ferme l'accueil et le mémorise aussi", async ({ page }) => {
  const db = await signInAs(page, NOUVEAU, {}, "/moi");
  await accueil(page).getByRole("button", { name: "Passer" }).click();
  await expect(accueil(page)).toHaveCount(0);
  await expect.poll(() => db.doc("onboarding/uid-neuf")?.vu).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Moi", level: 1 })).toBeVisible();
  await expect(accueil(page)).toHaveCount(0);
});

test("un compte qui a déjà vu l'accueil ne le revoit pas", async ({ page }) => {
  await signInAs(page, { ...NOUVEAU, accueil: false }, {}, "/moi");
  await expect(page.getByRole("heading", { name: "Moi", level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(accueil(page)).toHaveCount(0);
});

test("sans compte, jamais d'accueil", async ({ page }) => {
  await page.goto("/songs");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(accueil(page)).toHaveCount(0);
});

test("écran du rôle : présidence, musicien, sans rôle", async ({ page }) => {
  await signInAs(page, PRESIDENCE, {}, "/moi");
  await jusquAuRole(page);
  await expect(accueil(page).getByRole("heading", { name: "Préparer une setlist" })).toBeVisible();
});

test("écran du rôle : un musicien répète avec le mode louange", async ({ page }) => {
  await signInAs(page, MUSICIEN, {}, "/moi");
  await jusquAuRole(page);
  await expect(accueil(page).getByRole("heading", { name: "Répéter avant le dimanche" })).toBeVisible();
});

test("écran du rôle : sans rôle, la vie de l'église", async ({ page }) => {
  await signInAs(page, NOUVEAU, {}, "/moi");
  await jusquAuRole(page);
  await expect(accueil(page).getByRole("heading", { name: "La vie de l'église" })).toBeVisible();
});

test("l'accueil en 中文", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(page, NOUVEAU, {}, "/moi");
  await expect(accueil(page).getByRole("heading", { name: "欢迎使用 GCC" })).toBeVisible();
  await expect(accueil(page).getByRole("button", { name: "跳过" })).toBeVisible();
});

// ── A2 : guide à jour et plus visible ───────────────────────────────────────

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", firstName: "Jo", lastName: "L.", serviceRoles: { "Culte Francophone": ["musicien"] } };

test("guide : les sections d'aujourd'hui, plus les Annonces", async ({ page }) => {
  await signInAs(page, MEMBRE, {}, "/guide");
  for (const titre of ["Évènements", "Programme de scène", "Vue partitions et coup d'œil", "Ma version d'un chant", "Tâches des pôles", "Moi et réglages"]) {
    await expect(page.getByRole("heading", { name: titre, level: 2 })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Annonces", level: 2 })).toHaveCount(0);
});

test("« Comment ça marche ? » mène à la bonne section du guide sur les quatre pages", async ({ page }) => {
  await signInAs(page, MEMBRE, {}, "/songs");
  for (const [chemin, section] of [["/songs", "songs"], ["/setlists", "setlists"], ["/planning", "planning"], ["/evenements", "evenements"]]) {
    if (chemin !== "/songs") await page.goto(chemin);
    await expect(page.getByRole("link", { name: "Comment ça marche ?" })).toHaveAttribute("href", new RegExp(`^/guide/?#${section}$`));
  }
});

test("sans compte, pas de lien vers le guide", async ({ page }) => {
  await page.goto("/evenements");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Comment ça marche ?" })).toHaveCount(0);
});

// ── A3 : messages du serveur dans la langue du destinataire ─────────────────

test("notification au président : français inchangé, chinois pour un compte en 中文", () => {
  expect(presentationMessage("Culte du 21 septembre", "Ruth K.", "fr")).toEqual({
    title: "Présentation prête — Culte du 21 septembre",
    body: "Ruth K. a ajouté le lien de la présentation.",
  });
  expect(presentationMessage("Culte du 21 septembre", "", "fr").body).toBe("La régie a ajouté le lien de la présentation.");
  expect(presentationMessage("主日崇拜", "Ruth K.", "zh-CN")).toEqual({
    title: "演示文稿已就绪：主日崇拜",
    body: "Ruth K. 已添加演示文稿的链接。",
  });
});

test("nouvel évènement : français inchangé, chinois pour un compte en 中文", () => {
  const e = { titre: "Foot au parc", type: "sport" as const, lieu: "Parc de Bercy", description: "", date: "2026-10-10", heure: "19:00" };
  expect(nouvelEvenementMessage(e, "fr")).toEqual({ title: "Évènement — Foot au parc", body: "Parc de Bercy — 10/10/2026 19:00" });
  expect(nouvelEvenementMessage({ ...e, type: "info", date: "", heure: "" }, "fr").title).toBe("Info — Foot au parc");
  const zh = nouvelEvenementMessage(e, "zh-CN");
  expect(zh.title).toBe("活动：Foot au parc");
  expect(zh.body).toBe("Parc de Bercy，10月10日星期六 19:00");
});

// Chaque texte français de l'interface (au moins deux mots, traduit autrement
// en chinois) ne doit plus apparaître quand l'interface est en 中文.
import frLocale from "../src/locales/fr.json";
import zhLocale from "../src/locales/zh-CN.json";

function textesFrancais(): string[] {
  const out: string[] = [];
  const walk = (fr: unknown, zh: unknown) => {
    if (typeof fr === "string") {
      const net = fr.replace(/\{\{[^}]+\}\}|<\/?\w+>|\*\*/g, "").trim();
      if (fr !== zh && /\s/.test(net) && /[a-zé]{3,}/i.test(net) && net.length >= 8) out.push(net.split(/[{<]/)[0].trim());
      return;
    }
    if (fr && typeof fr === "object") for (const k of Object.keys(fr)) walk((fr as Record<string, unknown>)[k], (zh as Record<string, unknown> | undefined)?.[k]);
  };
  walk(frLocale, zhLocale);
  return out.filter((s) => s.length >= 8);
}

/** Les textes français que la page montre ou fait lire : texte affiché, mais
 *  aussi libellés d'accessibilité, exemples des champs et options des listes,
 *  que `innerText` ne voit pas. */
async function francaisAffiche(page: Page, francais: string[]): Promise<string[]> {
  const lu = await page.evaluate(() => [
    document.body.innerText,
    ...Array.from(document.querySelectorAll("[aria-label],[placeholder],[title]")).flatMap((el) =>
      ["aria-label", "placeholder", "title"].map((a) => el.getAttribute(a) ?? "")),
    ...Array.from(document.querySelectorAll("option")).map((o) => o.textContent ?? ""),
  ].join("\n"));
  return francais.filter((f) => lu.includes(f));
}

test("en 中文, aucun texte français sur les écrans membres principaux", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  const francais = textesFrancais();
  await signInAs(page, { ...MEMBRE, poles: ["da"] }, {}, "/moi");
  for (const chemin of ["/moi", "/songs", "/taches", "/taches/da", "/setlists", "/evenements"]) {
    if (chemin !== "/moi") await page.goto(chemin);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await page.waitForTimeout(800);
    const restes = await francaisAffiche(page, francais);
    expect(restes, `${chemin} : ${restes.join(" | ")}`).toEqual([]);
  }
});

// Les fenêtres de l'inventaire A3 (docs/spec-nouveaux-membres.md) : sans les
// ouvrir, le test précédent passait aussi sur le code d'avant le lot 8.
test("en 中文, la fenêtre de signalement n'a plus de français", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(page, MEMBRE, {}, "/moi");
  await page.getByRole("button", { name: "报告问题" }).click();
  await expect(page.getByRole("heading", { name: "报告问题" })).toBeVisible();
  expect(await francaisAffiche(page, textesFrancais())).toEqual([]);
});

test("en 中文, la proposition de chant n'a plus de français", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(page, MEMBRE, {}, "/songs");
  await page.getByRole("button", { name: "推荐新诗歌" }).click();
  await expect(page.getByRole("heading", { name: "推荐新诗歌" })).toBeVisible();
  expect(await francaisAffiche(page, textesFrancais())).toEqual([]);
});

test("en 中文, le formulaire de nouvelle tâche n'a plus de français", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(page, { ...MEMBRE, poles: ["da"] }, {}, "/taches/da");
  await page.getByRole("button", { name: "新任务" }).click();
  await expect(page.getByRole("dialog", { name: "新任务" })).toBeVisible();
  expect(await francaisAffiche(page, textesFrancais())).toEqual([]);
});

test("en 中文, aucun texte français sur la partition 简谱 transposée", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  const francais = textesFrancais();
  const chords = loadChords();
  // Un chant à deux lectures d'accords (sélecteur « 和弦 ») et un chant sans
  // calque (avertissement « les accords ne suivent pas »).
  const aDeuxLectures = certifiedSlugs().find((s) => chords[s].labels.some((l) => l.opt && l.c));
  const sansCalque = slugsWithoutOverlay()[0];
  for (const slug of [aDeuxLectures, sansCalque].filter((s): s is string => !!s)) {
    const key = chords[slug] ? auditKey(slug, chords[slug].printedKey) : halfStepUp(songKey(slug) ?? "C");
    await openSheet(page, slug, { key });
    const restes = await francaisAffiche(page, francais);
    expect(restes, `${slug} : ${restes.join(" | ")}`).toEqual([]);
  }
});
