import "./helpers/cleFirebase";
import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { coordination, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Image de fête, tranche IF-1 (docs/spec-scene-saison.md, « Image de fête ») : une image facultative par édition,
// posée dans l'écran de la fête du Back-Office. Compte simulé, noms fictifs, image générée ici.

const COMITE: FakeProfile = { uid: "uid-orlane", email: "orlane@example.com", firstName: "Orlane", lastName: "V.", ...coordination() };
const CHEMIN = "/back-office/evenements/scene/noel?annee=2026";

/** Un PNG 32×18 uni, fabriqué à la main (CRC et zlib). */
function png32x18(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const bloc = (type: string, data: Buffer) => {
    const t = Buffer.concat([Buffer.from(type), data]);
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(t));
    return Buffer.concat([l, t, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(32, 0); ihdr.writeUInt32BE(18, 4); ihdr[8] = 8; ihdr[9] = 2;
  const ligne = Buffer.concat([Buffer.from([0]), Buffer.alloc(32 * 3, 120)]);
  const brut = Buffer.concat(Array.from({ length: 18 }, () => ligne));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc("IHDR", ihdr), bloc("IDAT", deflateSync(brut)), bloc("IEND", Buffer.alloc(0))]);
}

const DOC_NOEL = {
  nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: false, passages: [],
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }], createdBy: "uid-orlane", updatedAt: "2026-09-14T20:00:00Z",
};

async function ouvrir(page: Page, docs: Record<string, Record<string, unknown>>) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, COMITE, docs, CHEMIN);
}

test("choisir une image : aperçu, puis une écriture JPEG de 250 000 caractères au plus", async ({ page }) => {
  const db = await ouvrir(page, { "programmes/noel-2026": DOC_NOEL });
  const bloc = page.getByTestId("fete-image");
  await expect(bloc).toBeVisible();
  await expect(page.getByTestId("fete-image-apercu")).toHaveCount(0);
  await page.getByTestId("fete-image-choisir").setInputFiles({ name: "crèche.png", mimeType: "image/png", buffer: png32x18() });
  await expect(page.getByTestId("fete-image-apercu")).toBeVisible();
  const ecriture = db.writes.find((w) => w.method === "PATCH" && w.path === "programmes/noel-2026" && "image" in w.data);
  expect(ecriture).toBeTruthy();
  const image = ecriture!.data.image as string;
  expect(image.startsWith("data:image/jpeg")).toBe(true);
  expect(image.length).toBeLessThanOrEqual(250_000);
  expect(ecriture!.data.aImage).toBe(true);
});

test("retirer l'image : le masque porte `image`, le corps non, et « Choisir » revient", async ({ page }) => {
  const masques: string[][] = [];
  page.on("request", (r) => { if (r.method() === "PATCH") masques.push(new URL(r.url()).searchParams.getAll("updateMask.fieldPaths")); });
  const donnee = `data:image/png;base64,${png32x18().toString("base64")}`;
  const db = await ouvrir(page, { "programmes/noel-2026": { ...DOC_NOEL, image: donnee, aImage: true } });
  await expect(page.getByTestId("fete-image-apercu")).toBeVisible();
  await page.getByTestId("fete-image-retirer").click();
  await expect(page.getByTestId("fete-image-apercu")).toHaveCount(0);
  await expect(page.getByTestId("fete-image").getByText("Choisir une image")).toBeVisible();
  const ecriture = db.writes.find((w) => w.method === "PATCH" && w.path === "programmes/noel-2026");
  expect(ecriture).toBeTruthy();
  expect("image" in ecriture!.data).toBe(false);
  expect("aImage" in ecriture!.data).toBe(false);
  expect(masques.some((m) => m.includes("image") && m.includes("aImage"))).toBe(true);
});

test("la liste des programmes n'envoie pas `image` : la requête porte un `select` sans elle", async ({ page }) => {
  const requetes: { select?: { fields: { fieldPath: string }[] } }[] = [];
  page.on("request", (r) => {
    if (!r.url().endsWith(":runQuery")) return;
    const q = (r.postDataJSON() as { structuredQuery: { from: { collectionId: string }[]; select?: { fields: { fieldPath: string }[] } } }).structuredQuery;
    if (q.from[0].collectionId === "programmes") requetes.push({ select: q.select });
  });
  await ouvrir(page, { "programmes/noel-2026": DOC_NOEL });
  await expect(page.getByTestId("fete-image")).toBeVisible();
  expect(requetes.length).toBeGreaterThan(0);
  for (const q of requetes) {
    expect(q.select).toBeTruthy();
    const champs = q.select!.fields.map((f) => f.fieldPath);
    expect(champs).not.toContain("image");
    expect(champs).toContain("jourJ");
  }
});

test("en 中文 : le titre du bloc est en chinois", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch { /* stockage indisponible */ } });
  await ouvrir(page, { "programmes/noel-2026": DOC_NOEL });
  await expect(page.getByTestId("fete-image").getByRole("heading", { name: "图片" })).toBeVisible();
});
