import "./helpers/cleFirebase";
import { expect, test, type BrowserContextOptions, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs, repondreDansLeSite } from "./helpers/agencement";

// Retouches v18, R8 (docs/spec-retouches-v18.md, D20) : l'ordre de passage de la scène est protégé.
// L'écriture porte la version lue du programme (`currentDocument.updateTime`) ; si quelqu'un l'a
// modifié entre-temps, Firestore refuse (HTTP 400 `FAILED_PRECONDITION`) : « Modifié par Prénom
// entre-temps : recharge », et rien n'est écrit. Base simulée (tests/helpers/fakeSession.ts),
// partagée par deux contextes de navigateur comme par deux responsables sur deux appareils.

const BO = "/back-office/evenements/scene";
const PASSAGES = [
  { quoi: "Séance louange", qui: ["敬拜团"], titre: "Ouverture" },
  { quoi: "Chant", qui: ["EDD 小班"], titre: "Jésus est né" },
  { quoi: "Sketch", qui: ["Gp Paix"], titre: "La nuit de Bethléem" },
];
const NOEL_2026 = {
  nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: true,
  passages: PASSAGES, plages: [{ jour: 0, debut: "14:00", fin: "19:00" }], duree: 60,
  createdBy: "uid-alice", updatedAt: "2026-10-01T10:00:00Z",
};
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };
const BRUNO: FakeProfile = { uid: "uid-bruno", email: "bruno@example.com", firstName: "Bruno", lastName: "V.", poles: ["evenement"] };

async function ouvrirOrdre(page: Page, qui: FakeProfile, partage?: FakeDb) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  const db = await signInAs(page, qui, { "programmes/noel-2026": NOEL_2026 }, `${BO}/noel?vue=ordre`, partage);
  await expect(liste(page).getByRole("listitem")).toHaveCount(3);
  return db;
}
// L'ordre de passage, quelle que soit la langue (« Ordre de Passage jour J », « 正日出场顺序 »).
const liste = (page: Page) => page.getByRole("list", { name: /Ordre de Passage jour J|正日出场顺序/ });
// Le message d'écriture du site (`role="alert"`), pas l'annonceur de route de Next.
const message = (page: Page) => page.locator("[role=alert]:not(#__next-route-announcer__)");
const patchs = (db: FakeDb) => db.writes.filter((w) => w.method === "PATCH" && w.path === "programmes/noel-2026");

test("R8 — deux responsables sur la même version : le second voit « Modifié par Alice entre-temps : recharge », le document garde la première écriture", async ({ page, browser }) => {
  // Les deux ont lu la même version de l'ordre de passage.
  const db = await ouvrirOrdre(page, ALICE);
  const { defaultBrowserType: _ignore, ...use } = test.info().project.use as Record<string, unknown>;
  const contexte = await browser.newContext({ ...(use as BrowserContextOptions), baseURL: new URL(page.url()).origin });
  try {
    const autre = await contexte.newPage();
    await ouvrirOrdre(autre, BRUNO, db);

    // Alice ajoute un numéro : enregistré.
    await page.getByRole("button", { name: "Ajouter un passage" }).click();
    await page.getByLabel("Titre").fill("Douce nuit");
    await page.getByLabel("Gp Paix").check();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(liste(page).getByRole("listitem")).toHaveCount(4);
    expect(patchs(db)).toHaveLength(1);
    await expect(message(page)).toHaveCount(0);

    // Bruno, sur la version d'avant, retire le premier numéro : refusé, avec le prénom d'Alice.
    await liste(autre).getByRole("listitem").nth(0).getByRole("button", { name: "Retirer" }).click();
    await repondreDansLeSite(autre, "Retirer");
    await expect(message(autre)).toHaveText("Modifié par Alice entre-temps : recharge");
    await expect(liste(autre).getByRole("listitem")).toHaveCount(3);
    // Captures à regarder : PW_CAPTURES=<dossier>.
    if (process.env.PW_CAPTURES) await autre.screenshot({ path: `${process.env.PW_CAPTURES}/r8-conflit-${test.info().project.name}.png` });

    // Rien n'est écrit : le document garde l'écriture d'Alice, « Ouverture » comprise.
    expect(patchs(db)).toHaveLength(1);
    expect((db.doc("programmes/noel-2026")!.passages as { titre: string }[]).map((p) => p.titre))
      .toEqual(["Ouverture", "Jésus est né", "La nuit de Bethléem", "Douce nuit"]);

    // Bruno recharge : il voit les quatre numéros, et peut retirer.
    await autre.reload();
    await expect(liste(autre).getByRole("listitem")).toHaveCount(4);
    await liste(autre).getByRole("listitem").nth(0).getByRole("button", { name: "Retirer" }).click();
    await repondreDansLeSite(autre, "Retirer");
    await expect(liste(autre).getByRole("listitem")).toHaveCount(3);
    await expect(message(autre)).toHaveCount(0);
    expect(patchs(db)).toHaveLength(2);
    expect((db.doc("programmes/noel-2026")!.passages as { titre: string }[]).map((p) => p.titre))
      .toEqual(["Jésus est né", "La nuit de Bethléem", "Douce nuit"]);
  } finally {
    await contexte.close();
  }
});

test("R8 — en chinois : 由 Bruno 修改, et rien n'est écrit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  const db = await ouvrirOrdre(page, ALICE);
  // Un autre responsable enregistre entre-temps (base simulée).
  db.set("programmes/noel-2026", { ...NOEL_2026, passages: PASSAGES.slice(0, 2), modifiePar: "Bruno" });
  await liste(page).getByRole("listitem").nth(0).getByRole("button", { name: "删除" }).click();
  await repondreDansLeSite(page, "删除");
  await expect(message(page)).toHaveText("已被 Bruno 修改：请重新加载");
  expect(patchs(db)).toHaveLength(0);
  expect(db.doc("programmes/noel-2026")!.passages).toHaveLength(2);
});
