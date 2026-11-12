import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { canEcrirePartition, canLirePartition } from "../src/lib/access";
import { signInAs } from "./helpers/fakeSession";

// Ma partition, tranche MP-1 (docs/spec-ma-partition.md, « Rangement ») : droits, module REST, enregistrement fiable.
// Pas d'agencement : trois appareils, pas dans SPECS_GRAND_ECRAN. Noms fictifs. Les règles Firestore ne tournent pas
// ici (pas d'émulateur) : on lit leur texte. MP-3 : l'accès de test `window.__gccPartitions` est retiré ; le module
// (écrire, relire, refus, file hors ligne) se teste par une retouche au Crayon sur la page d'un chant.

const regles = readFileSync(path.resolve(__dirname, "..", "firestore.rules"), "utf8");

function bloc(debut: string): string {
  const i = regles.indexOf(debut);
  expect(i, `${debut} absent de firestore.rules`).toBeGreaterThan(-1);
  const ouvrante = regles.indexOf("{", i + debut.length - 1);
  let profondeur = 0;
  for (let k = ouvrante; k < regles.length; k++) {
    if (regles[k] === "{") profondeur++;
    if (regles[k] === "}" && --profondeur === 0) return regles.slice(i, k + 1);
  }
  throw new Error(`${debut} non fermé`);
}
const sansEspaces = (t: string) => t.replace(/\s+/g, " ");

const SOLENE = { uid: "uid-solene", email: "solene.varin@example.invalid", firstName: "Solène", lastName: "Varin" };
const ILYES = { uid: "uid-ilyes", email: "ilyes.marchal@example.invalid", firstName: "Ilyès", lastName: "Marchal" };

test.describe("Ma partition : droits et règles (sans page)", () => {
  const p = { ownerUid: SOLENE.uid, sharedWith: [ILYES.uid] };

  test("canLirePartition / canEcrirePartition : propriétaire, personne partagée, tiers, déconnecté", () => {
    expect(canLirePartition(SOLENE, p)).toBe(true);
    expect(canEcrirePartition(SOLENE, p)).toBe(true);
    expect(canLirePartition(ILYES, p)).toBe(true);
    expect(canEcrirePartition(ILYES, p)).toBe(false);
    const tiers = { uid: "uid-tiers" };
    expect(canLirePartition(tiers, p)).toBe(false);
    expect(canEcrirePartition(tiers, p)).toBe(false);
    expect(canLirePartition(null, p)).toBe(false);
    expect(canEcrirePartition(null, p)).toBe(false);
  });

  test("firestore.rules : le bloc partitions (lecture par préfixe ou sharedWith, écriture par préfixe et ownerUid)", () => {
    const b = sansEspaces(bloc("match /partitions/{id}"));
    const lecture = b.slice(b.indexOf("allow read"), b.indexOf("allow create"));
    expect(lecture).toContain("id.split('__')[0] == request.auth.uid");
    expect(lecture).toContain("request.auth.uid in resource.data.sharedWith");
    const ecriture = b.slice(b.indexOf("allow create"), b.indexOf("allow delete"));
    expect(ecriture).toContain("id.split('__')[0] == request.auth.uid");
    expect(ecriture).toContain("request.resource.data.ownerUid == request.auth.uid");
    expect(ecriture).toContain("!('sharedWith' in request.resource.data)");
    // Le document de choix est exactement {uid}__choix : un chant dont le slug finirait par « __choix » reste une partition.
    expect(ecriture).toContain("id == request.auth.uid + '__choix'");
    expect(b.slice(b.indexOf("allow delete"))).toContain("id.split('__')[0] == request.auth.uid");
    expect(regles).toContain("docs/spec-ma-partition.md");
  });

  test("firestore.rules : le bloc versions/{uid} est inchangé", () => {
    expect(sansEspaces(bloc("match /versions/{uid}"))).toBe(
      "match /versions/{uid} { allow read: if signedIn(); allow create, update: if signedIn() && request.auth.uid == uid && request.resource.data.authorUid == uid; allow delete: if signedIn() && request.auth.uid == uid; }",
    );
  });
});

const ABBA = readFileSync(path.resolve(__dirname, "..", "content", "songs", "abba-pere.cho"), "utf8");
const PARTITION = `partitions/${SOLENE.uid}__abba-pere`;
const cleFile = (uid: string) => `gcc-partitions-en-attente:${uid}`;
const REFUS = (route: { fulfill(o: object): Promise<void> }) =>
  route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refus" } }) });
const PANNE = (route: { fulfill(o: object): Promise<void> }) =>
  route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: 503, message: "indisponible" } }) });
const COUPURE = (route: { abort(): Promise<void> }) => route.abort();
const PARTITIONS = /firestore\.googleapis\.com.*partitions/;

// La bulle « Touche un accord… » (une fois par appareil) recouvre la barre basse du Crayon : déjà vue, comme dans les autres specs.
const ouvrirChant = async (page: Page, profil: typeof SOLENE, docs: Record<string, Record<string, unknown>> = {}) => {
  await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
  return signInAs(page, profil, docs, "/songs/abba-pere");
};

/** Une retouche au Crayon sur la page d'un chant : « Paroles », la ligne touchée, ses paroles changées, « Valider ». */
async function retoucher(page: Page, de: string, vers: string) {
  const crayon = page.getByRole("button", { name: "Crayon", exact: true }).filter({ visible: true }).first();
  if ((await crayon.getAttribute("aria-pressed")) !== "true") await crayon.click();
  await page.getByRole("button", { name: "Paroles", exact: true }).click();
  await page.getByRole("button").filter({ hasText: de }).first().click();
  const feuille = page.getByRole("dialog").first();
  const champ = feuille.locator("textarea");
  await champ.fill((await champ.inputValue()).replace(de, vers));
  await feuille.getByRole("button", { name: "Valider", exact: true }).click();
  await feuille.getByRole("button", { name: "Valider", exact: true }).click();
}
const enAttente = (page: Page) => page.locator("[data-ma-partition-ligne]", { hasText: "En attente" });

// Couverture de MP-1, par l'interface : écrire et relire (« écrire une partition… »), refus de lecture hors `sharedWith`
// (« lire celles qu'on m'a partagées »), refus de lecture remonté, file hors ligne rejouée, refus d'écriture remonté,
// rejeu lent. L'effacement de la file à la déconnexion passe par le bouton « Déconnexion ».
test.describe("Ma partition : le module, par une retouche au Crayon", () => {
  test("écrire une partition puis la relire", async ({ page }) => {
    const db = await ouvrirChant(page, SOLENE);
    await retoucher(page, "planait", "flottait");
    await expect(page.locator('[data-marque="moi"]', { hasText: "flottait" })).toHaveCount(1);
    expect(db.doc(PARTITION)).toMatchObject({ ownerUid: SOLENE.uid, base: ABBA });
    expect(String(db.doc(PARTITION)!.content)).toContain("flottait");
    expect(db.doc(PARTITION)!.updatedAt).toBeTruthy();
    // Relue à l'ouverture suivante.
    await page.reload();
    await expect(page.locator('[data-marque="moi"]', { hasText: "flottait" })).toHaveCount(1);
    expect(db.doc(`partitions/${SOLENE.uid}__absente`)).toBeUndefined();
  });

  test("les partitions partagées avec moi : seules celles où mon uid est dans sharedWith", async ({ page }) => {
    const doc = (ownerUid: string, ownerName: string, sharedWith: string[]) => ({
      ownerUid, ownerName, base: ABBA, content: ABBA.replace("planait", "flottait"), structure: null, key: null, traits: [], sharedWith, sharedTraits: false,
    });
    await ouvrirChant(page, ILYES, {
      [`partitions/${SOLENE.uid}__abba-pere`]: doc(SOLENE.uid, "Solène Varin", [ILYES.uid]),
      "partitions/uid-tiers__abba-pere": doc("uid-tiers", "Tiers Fictif", ["uid-autre"]),
      [`partitions/${SOLENE.uid}__choix`]: { choices: {}, partageTout: [] },
    });
    await page.getByRole("button", { name: /Je lis/ }).filter({ visible: true }).first().click();
    await expect(page.getByText("Partition de Solène Varin")).toBeVisible();
    await expect(page.getByText("Partition de Tiers Fictif")).toHaveCount(0);
  });

  test("un refus de lecture (403) : le chant d'origine reste affiché et rien ne s'écrit", async ({ page }) => {
    const db = await ouvrirChant(page, ILYES, {
      [`partitions/${ILYES.uid}__abba-pere`]: { ownerUid: ILYES.uid, ownerName: "Ilyès M.", base: ABBA, content: ABBA.replace("planait", "flottait"), structure: null, key: null, traits: [], sharedWith: [], sharedTraits: false },
    });
    await page.route(PARTITIONS, (route) => (route.request().method() === "GET" ? REFUS(route) : route.fallback()));
    await page.goto("/songs/abba-pere");
    await expect(page.locator("[data-copy-line]", { hasText: "planait" })).toHaveCount(1);
    await expect(page.locator("[data-copy-line]", { hasText: "flottait" })).toHaveCount(0);
    expect(db.writes.filter((w) => w.path.startsWith("partitions/"))).toEqual([]);
  });

  test("un refus d'écriture (403) remonte et ne met rien en file", async ({ page }) => {
    await ouvrirChant(page, SOLENE);
    await page.route(PARTITIONS, REFUS);
    await retoucher(page, "planait", "flottait");
    await expect(page.getByRole("alert")).toContainText("Échec de l'enregistrement");
    expect(await page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toBeNull();
  });

  test("réseau coupé : « En attente », rejeu au retour du réseau, puis effacement à la déconnexion", async ({ page }) => {
    const db = await ouvrirChant(page, SOLENE);
    await page.route(PARTITIONS, COUPURE);
    await retoucher(page, "planait", "flottait");
    await expect(enAttente(page)).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toContain("abba-pere");
    expect(db.doc(PARTITION)).toBeUndefined();

    // Retour du réseau : la file se rejoue à l'évènement `online`.
    await page.unroute(PARTITIONS, COUPURE);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect.poll(() => db.doc(PARTITION)).toBeTruthy();
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toBeNull();

    // Déconnexion : la file d'un compte ne lui survit pas.
    await page.evaluate((k) => localStorage.setItem(k, "{}"), cleFile(SOLENE.uid));
    await page.goto("/moi");
    await page.getByText("Déconnexion", { exact: true }).click();
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toBeNull();
  });

  test("un 5xx met en file ; au rejeu, une entrée refusée (403) quitte la file", async ({ page }) => {
    const db = await ouvrirChant(page, SOLENE);
    await page.route(PARTITIONS, PANNE);
    await retoucher(page, "planait", "flottait");
    await expect(enAttente(page)).toBeVisible();
    await page.unroute(PARTITIONS, PANNE);
    // Les droits ont changé entre-temps : le rejeu est refusé, l'entrée ne passera jamais et ne reste pas en file.
    await page.route(PARTITIONS, REFUS);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toBeNull();
    expect(db.doc(PARTITION)).toBeUndefined();
  });

  test("un rejeu lent n'écrase pas une version plus récente enregistrée pendant ce temps", async ({ page }) => {
    const db = await ouvrirChant(page, SOLENE);
    await page.route(PARTITIONS, COUPURE);
    await retoucher(page, "planait", "flottait");
    await expect(enAttente(page)).toBeVisible();
    await page.unroute(PARTITIONS, COUPURE);
    // Réseau qui traîne : chaque écriture met trois secondes à revenir ; une seconde retouche part pendant le rejeu.
    await page.route(PARTITIONS, async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fallback();
    });
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await retoucher(page, "flottait", "glissait");
    await expect.poll(() => String(db.doc(PARTITION)?.content ?? ""), { timeout: 20_000 }).toContain("glissait");
    expect(String(db.doc(PARTITION)!.content)).not.toContain("flottait");
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toBeNull();
  });
});
