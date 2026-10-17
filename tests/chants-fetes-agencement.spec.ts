import "./helpers/cleFirebase";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, estTelephone, interdireDialoguesNatifs, verifierAgencement } from "./helpers/agencement";

// Lot « chants des fêtes », CF-C : l'agencement de la page de la fête sur les cinq projets (téléphone,
// tablette portrait, tablette paysage, ordinateur, 1 440 px). Captures dans CAPTURES si la variable est posée.

const MEMBRE: FakeProfile = { uid: "uid-mo", email: "mo@example.com", firstName: "Mo", lastName: "M.", serviceRoles: { "Groupe Paix": ["musicien"] } };
const item = (songSlug: string, keyOverride: string | null = null) =>
  ({ songSlug, position: 0, keyOverride, showChords: true, showPinyin: false, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" });
const DANSE = { id: "m1", type: "danse", titre: "Lumière dans la nuit, chorégraphie", lien: "https://exemple.org/danse", duree: "3:40", depart: "0:12", note: "Fumée au refrain" };
const passages = [
  { id: "p1aaaaaa", titre: "Ouverture", quoi: "Séance louange", qui: ["Gp Paix"] },
  { id: "p2bbbbbb", titre: "Les bergers", quoi: "Danse", qui: ["Gp Joie"], medias: [DANSE] },
  { id: "p3cccccc", titre: "Le grand spectacle de l'école du dimanche", quoi: "Spectacle", qui: ["EDD 中班", "EDD 大班"] },
  { id: "p4dddddd", titre: "Louange finale", quoi: "Chant", qui: ["Franco"] },
];
const DOCS = {
  "programmes/noel-2026": {
    nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: true,
    plages: [{ jour: 0, debut: "14:00", fin: "19:00" }], duree: 60, passages, createdBy: "uid-alice", updatedAt: "2026-10-01T10:00:00Z",
  },
  "setlists/noel-2026-p1aaaaaa": {
    title: "Noël 2026 · Gp Paix", leader: "Ruth K.", category: "Noël", date: "2026-12-24", language: "fr", notes: "", isDraft: false, isPrivate: false,
    ownerId: null, createdAt: "2026-10-05T10:00:00Z", editeurs: ["uid-mo"], fete: { programme: "noel-2026", passage: "p1aaaaaa", qui: "Gp Paix" },
    items: [item("a-jamais-tu-es-saint"), item("beni-soit-ton-nom", "B"), { ...item(""), type: "proposition", proposition: { id: "prop1", titre: "Douce nuit" } }],
  },
};
const DROITS = passages.map((p) => ({ id: p.id, chants: p.id === "p1aaaaaa", musiques: p.id !== "p4dddddd", mien: p.id === "p1aaaaaa" }));

const appelsDroits = { n: 0 };
async function ouvrir(page: Page, langue: "fr" | "zh-CN" = "fr") {
  interdireDialoguesNatifs(page);
  await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route("**/api/fetes/droits", (route) => { appelsDroits.n++; return route.fulfill({ json: { passages: DROITS } }); });
  await signInAs(page, MEMBRE, DOCS, "/evenements/scene/noel?vue=ordre");
  await expect(page.locator("ol > li").first()).toBeVisible();
  await expect(page.getByRole("group", { name: langue === "fr" ? "Passages à afficher" : "显示的节目" })).toBeVisible();
}

for (const langue of ["fr", "zh-CN"] as const) {
  test(`page de la fête (${langue}) : filtre, « Saisir les chants », chants et danse sans débordement`, async ({ page }, info) => {
    appelsDroits.n = 0;
    await ouvrir(page, langue);
    await verifierAgencement(page);
    // Une seule lecture des droits : la page ne se remonte pas en boucle.
    await page.waitForTimeout(1500);
    expect(appelsDroits.n).toBeLessThanOrEqual(2);

    const titre = page.getByRole("heading", { level: 2, name: /ordre de passage|上场顺序/ });
    const filtre = page.getByRole("group", { name: langue === "fr" ? "Passages à afficher" : "显示的节目" });
    const [bt, bf] = [await titre.boundingBox(), await filtre.boundingBox()];
    if (estGrandEcran(info)) {
      // En grand : le filtre à droite du titre, sur la même rangée.
      expect(bf!.x).toBeGreaterThan(bt!.x + bt!.width - 1);
      expect(Math.abs(bf!.y - bt!.y)).toBeLessThan(60);
    } else if (estTelephone(info)) {
      // Téléphone : le filtre sous le titre.
      expect(bf!.y).toBeGreaterThan(bt!.y + bt!.height - 1);
    }

    const saisir = page.getByRole("button", { name: langue === "fr" ? "Saisir les chants" : "填写诗歌" });
    await expect(saisir).toHaveCount(1);
    const bs = await saisir.boundingBox();
    const largeur = page.viewportSize()!.width;
    expect(bs!.x + bs!.width).toBeLessThanOrEqual(largeur);
    if (estTelephone(info)) {
      // Téléphone : « Saisir les chants » pleine largeur de la colonne du passage.
      const ligne = await page.locator("ol > li").first().boundingBox();
      expect(bs!.width).toBeGreaterThan(ligne!.width * 0.6);
    }

    // Aucune ligne ne déborde de sa carte.
    for (const li of await page.locator("ol > li").all()) {
      const [b, enfants] = [await li.boundingBox(), await li.evaluate((e) => [...e.querySelectorAll("*")].map((c) => c.getBoundingClientRect().right))];
      for (const droite of enfants) expect(droite).toBeLessThanOrEqual(b!.x + b!.width + 1);
    }

    if (process.env.CAPTURES) await page.waitForTimeout(800);
    if (process.env.CAPTURES) await page.screenshot({ path: `${process.env.CAPTURES}/fete-${langue}-${info.project.name}.png`, fullPage: !estGrandEcran(info) });
  });
}
