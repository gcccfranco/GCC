import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// PU-1 (docs/spec-entree-musiciens.md « Export PDF réservé ») : le PDF d'une setlist est réservé à son équipe (créateur,
// `editeurs`) et à la présidence du service ; celui d'un chant, aux admins et à l'équipe d'une setlist à venir. Sans
// compte, le PDF d'un chant reste visible (décision de Timothée). Comptes, setlists et Sheet simulés, noms inventés.
test.use({ serviceWorkers: "block", deviceScaleFactor: 1 });

const AUJOURDHUI = "2026-11-09";
const PRESIDENT = "Gaspard Vinet";
const PIANISTE = "Maëlle Tournesol";
const MUSICIENNE: FakeProfile = { uid: "uid-maelle", email: "maelle-tournesol@example.com", firstName: "Maëlle", lastName: "Tournesol", planningName: PIANISTE };
const PRESIDENTE: FakeProfile = { uid: "uid-gaspard", email: "gaspard-vinet@example.com", firstName: "Gaspard", lastName: "Vinet", planningName: PRESIDENT };
const ADMIN: FakeProfile = { uid: "uid-admin-pdf", email: ADMIN_EMAIL, firstName: "Admin", lastName: "Fictif" };
const CHANTS = [["abba-pere", "FR"], ["谢谢你", "ZH"]] as const;

const item = (songSlug: string) => ({
  songSlug, position: 1, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (id: string, extra: Record<string, unknown> = {}) => ({
  [`setlists/${id}`]: {
    title: "Culte d'essai du PDF", leader: PRESIDENT, category: "Culte Francophone", date: "2026-11-09", language: "mixed",
    notes: "", ownerId: "uid-autre", isPrivate: false, items: [item("abba-pere")], ...extra,
  },
});

/** Le Sheet : le culte Franco du 09/11, présidé par PRESIDENT, PIANISTE au piano ; celui du 16/11, PRESIDENT au piano
 *  (il y sert, donc voit la setlist, sans la présider) ; `statut` = en panne. Une setlist hors de ses services ne s'ouvre
 *  pas (lot AO, F1) : chaque compte sans équipe doit servir ce jour-là pour que la page s'affiche. */
async function simulerSheet(page: Page, statut?: number) {
  const suivi = { n: 0 };
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    suivi.n++;
    if (statut) return route.fulfill({ status: statut, contentType: "text/plain", body: "" });
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    const rows = sheet === "Franco_Louange"
      ? [["DATE"], ["09/11", PRESIDENT, "", "", PIANISTE, "", ""], ["16/11", "", "", "", PRESIDENT, "", ""]]
      : [];
    return route.fulfill({ status: 200, contentType: "text/csv", body: rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n") });
  });
  return suivi;
}

async function ouvrir(page: Page, profil: FakeProfile | null, docs: Record<string, Record<string, unknown>>, to: string) {
  await page.clock.setFixedTime(new Date(`${AUJOURDHUI}T10:00:00`));
  if (profil) await signInAs(page, profil, docs, to);
  else await page.goto(to);
}

/** Les deux entrées PDF d'une setlist : le bouton de la barre, l'entrée du ⋯ (compte cumulé). */
async function entreesPdfSetlist(page: Page) {
  await page.getByRole("button", { name: "Plus d'actions" }).waitFor();
  const barre = await page.getByRole("button", { name: "PDF", exact: true }).count();
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  const menu = await page.getByRole("menuitem", { name: "PDF" }).count();
  await page.keyboard.press("Escape");
  return barre + menu;
}
const pdfSetlistAttendu = async (page: Page, present: boolean) => {
  // La lecture du Sheet et celle du profil se terminent hors du chargement de la page : « présent » attend qu'il
  // arrive ; « absent » laisse la page se poser (pas de `networkidle` : la page interroge le réseau sans fin).
  if (!present) await page.waitForTimeout(1500);
  if (present) await expect.poll(() => entreesPdfSetlist(page), { timeout: 15_000 }).toBeGreaterThan(0);
  else expect(await entreesPdfSetlist(page)).toBe(0);
};
const pdfChant = (page: Page) => page.getByTestId("barre-outils").getByRole("button", { name: "PDF", exact: true });
const pdfChantAttendu = async (page: Page, present: boolean) => {
  await expect(page.getByTestId("barre-outils")).toBeVisible();
  if (!present) await page.waitForTimeout(1500);
  if (present) await expect(pdfChant(page)).toHaveCount(1);
  else await expect(pdfChant(page)).toHaveCount(0);
};
const chemin = (slug: string) => `/songs/${encodeURIComponent(slug)}`;

// ─── Page d'une setlist ────────────────────────────────────────────────────────

test("setlist : une musicienne hors équipe n'a aucun PDF (barre et ⋯)", async ({ page }) => {
  await simulerSheet(page);
  await ouvrir(page, MUSICIENNE, setlist("s1"), "/setlists/s1");
  await pdfSetlistAttendu(page, false);
});

test("setlist : un membre de `editeurs` a le PDF", async ({ page }) => {
  await ouvrir(page, MUSICIENNE, setlist("s1", { editeurs: [MUSICIENNE.uid] }), "/setlists/s1");
  await pdfSetlistAttendu(page, true);
});

test("setlist : le créateur a le PDF", async ({ page }) => {
  await ouvrir(page, MUSICIENNE, setlist("s1", { ownerId: MUSICIENNE.uid }), "/setlists/s1");
  await pdfSetlistAttendu(page, true);
});

test("setlist : la présidence du service d'après le Sheet a le PDF, pas sur une autre date", async ({ page }) => {
  await simulerSheet(page);
  await ouvrir(page, PRESIDENTE, { ...setlist("s1"), ...setlist("s2", { date: "2026-11-16" }) }, "/setlists/s1");
  await pdfSetlistAttendu(page, true);
  await page.goto("/setlists/s2");
  await pdfSetlistAttendu(page, false);
});

test("setlist : la présidente, Sheet en panne, n'a pas le PDF", async ({ page }) => {
  // Sheet en panne : ni présidence ni service connus ; la setlist ne s'ouvre pas (F1), aucun PDF n'est offert.
  await simulerSheet(page, 500);
  await ouvrir(page, PRESIDENTE, setlist("s1"), "/setlists/s1");
  await expect(page.getByText(/Tu n'as pas accès à cette setlist/)).toBeVisible();
  await expect(page.getByRole("button", { name: "PDF", exact: true })).toHaveCount(0);
});

test("setlist : un admin a le PDF", async ({ page }) => {
  await ouvrir(page, ADMIN, setlist("s1"), "/setlists/s1");
  await pdfSetlistAttendu(page, true);
});

// ─── Page d'un chant ───────────────────────────────────────────────────────────

for (const [slug, langue] of CHANTS) {
  test(`chant ${langue} : une musicienne hors équipe n'a pas le PDF`, async ({ page }) => {
    await ouvrir(page, MUSICIENNE, setlist("s1"), chemin(slug));
    await pdfChantAttendu(page, false);
  });

  test(`chant ${langue} : un admin a le PDF`, async ({ page }) => {
    await ouvrir(page, ADMIN, {}, chemin(slug));
    await pdfChantAttendu(page, true);
  });

  test(`chant ${langue} : l'équipe d'une setlist à venir a le PDF (éditrice ou créatrice)`, async ({ page }) => {
    await ouvrir(page, MUSICIENNE, setlist("s1", { date: "2026-11-16", editeurs: [MUSICIENNE.uid] }), chemin(slug));
    await pdfChantAttendu(page, true);
  });

  test(`chant ${langue} : la créatrice d'une setlist à venir a le PDF`, async ({ page }) => {
    await ouvrir(page, MUSICIENNE, setlist("s1", { date: "2026-11-16", ownerId: MUSICIENNE.uid }), chemin(slug));
    await pdfChantAttendu(page, true);
  });

  test(`chant ${langue} : la même personne dont la seule setlist est passée n'a pas le PDF`, async ({ page }) => {
    await ouvrir(page, MUSICIENNE, setlist("s1", { date: "2026-10-04", ownerId: MUSICIENNE.uid, editeurs: [MUSICIENNE.uid] }), chemin(slug));
    await pdfChantAttendu(page, false);
  });

  test(`chant ${langue} : sans compte, le PDF est présent`, async ({ page }) => {
    await ouvrir(page, null, {}, chemin(slug));
    await pdfChantAttendu(page, true);
  });
}
