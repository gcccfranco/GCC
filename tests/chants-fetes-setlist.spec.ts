import "./helpers/cleFirebase";
import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreEditeur, listeCourte, volet } from "./helpers/editeurSetlist";
import { buildFormItems } from "../src/lib/setlist/formItems";
import { buildSetlistItems, detectSetlistLanguage } from "../src/lib/setlist/buildSetlistItems";
import { compactTransitions } from "../src/lib/pdf/compact";
import { setlistLyricsText } from "../src/components/song/copyLyrics";
import { buildPerformanceBlocks } from "../src/lib/performance/blocks";
import type { SetlistItem } from "../src/types/setList";
import type { SongIndexEntry } from "../src/types/song";

// Lot « chants des fêtes », tranche CF-D (docs/spec-chants-fetes.md, CF14, CF15, CF19, CF20, CF21, CF27) :
// l'éditeur et la page d'une setlist de fête, « Proposer » et les éléments « proposition ». Comptes, programmes
// et setlists simulés (tests/helpers/fakeSession.ts). Noms fictifs.

const INDEX = (JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: SongIndexEntry[] }).songs;
const SONGS_MAP = Object.fromEntries(INDEX.map((s) => [s.slug, s]));

const MEMBRE: FakeProfile = { uid: "uid-mo", email: "mo@example.com", firstName: "Mo", lastName: "M.", serviceRoles: { "Groupe Paix": ["musicien"] } };
const REGIE: FakeProfile = { uid: "uid-reg", email: "reg@example.com", firstName: "Reg", lastName: "R.", dansEquipes: ["regie"] };
const SANS: FakeProfile = { uid: "uid-sans", email: "sans@example.com", firstName: "Sans", lastName: "S." };

const item = (songSlug: string, position: number, keyOverride: string | null = null) =>
  ({ songSlug, position, keyOverride, showChords: true, showPinyin: false, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" });
const proposition = (position: number): SetlistItem =>
  ({ ...item("", position), type: "proposition", proposition: { id: "prop1", titre: "Douce nuit" } });
const MUSIQUE = { id: "m1", type: "musique", titre: "Entrée des bergers", lien: "https://exemple.org/musique", duree: "2:10", depart: "", note: "Lumière douce" };

const PASSAGES = [
  { id: "p1aaaaaa", titre: "Ouverture", quoi: "Séance louange", qui: ["Gp Paix"], medias: [MUSIQUE] },
  { id: "p2bbbbbb", titre: "Les bergers", quoi: "Chant", qui: ["Gp Joie"] },
  { id: "p3cccccc", titre: "Louange finale", quoi: "Chant", qui: ["Franco"] },
];
const PROGRAMME = {
  nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: true,
  plages: [{ jour: 0, debut: "14:00", fin: "19:00" }], duree: 60, passages: PASSAGES, createdBy: "uid-alice", updatedAt: "2026-10-01T10:00:00Z",
};
const fete = (passage: string, qui: string) => ({ programme: "noel-2026", passage, qui });
const SETLIST_P1 = {
  title: "Noël 2026 · Gp Paix", leader: "Ruth K.", category: "Noël", date: "2026-12-24", language: "fr", notes: "", isDraft: false, isPrivate: false,
  ownerId: null, createdAt: "2026-10-05T10:00:00Z", editeurs: ["uid-mo"], fete: fete("p1aaaaaa", "Gp Paix"),
  items: [item("a-jamais-tu-es-saint", 1), proposition(2)],
};
const SETLIST_P2 = {
  ...SETLIST_P1, title: "Noël 2026 · Gp Joie", notes: "Entrée côté jardin", editeurs: [], fete: fete("p2bbbbbb", "Gp Joie"), items: [item("beni-soit-ton-nom", 1)],
};
const DOCS = { "programmes/noel-2026": PROGRAMME, "setlists/noel-2026-p1aaaaaa": SETLIST_P1, "setlists/noel-2026-p2bbbbbb": SETLIST_P2 };

async function ouvrir(page: Page, qui: FakeProfile, chemin: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  return signInAs(page, qui, docs, chemin);
}

test.describe("CF-D · éléments « proposition » (CF21, pur)", () => {
  const items = [item("a-jamais-tu-es-saint", 1), proposition(2), item("beni-soit-ton-nom", 3)] as SetlistItem[];

  test("le formulaire relit et réécrit une proposition, sans la perdre ni la changer en chant", () => {
    const form = buildFormItems(items, SONGS_MAP);
    expect(form).toHaveLength(3);
    const reecrits = buildSetlistItems(form);
    expect(reecrits[1]).toMatchObject({ type: "proposition", songSlug: "", position: 2, proposition: { id: "prop1", titre: "Douce nuit" } });
    expect(reecrits.map((i) => i.songSlug)).toEqual(["a-jamais-tu-es-saint", "", "beni-soit-ton-nom"]);
  });

  test("la langue de la setlist ignore la proposition", () => {
    expect(detectSetlistLanguage(buildFormItems([proposition(1)], SONGS_MAP))).toBe("fr");
  });

  test("la copie des paroles, le mode louange et le PDF compact l'ignorent", () => {
    expect(setlistLyricsText([proposition(1)], {})).toBe("");
    expect(buildPerformanceBlocks([proposition(1)], {}, true)).toEqual([]);
    const transition = { ...item("", 3), type: "transition", transitionText: "Prière" } as SetlistItem;
    // La transition s'attache au chant d'avant (index 0), pas à la proposition (index 1).
    expect(compactTransitions([item("a-jamais-tu-es-saint", 1) as SetlistItem, proposition(2), transition]).attached.get(0)).toBe("Prière");
  });
});

test.describe("CF-D · éditeur d'une setlist de fête (CF19, CF15)", () => {
  test("pas de Catégorie, Date, Visibilité ni Équipe ; titre et puces de l'édition ; lien vers la page de la fête", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/setlists/noel-2026-p1aaaaaa/edit?depuis=fete");
    await attendreEditeur(page, "À jamais Tu es saint");
    await expect(page.getByRole("heading", { level: 1, name: "Noël 2026 · Gp Paix" })).toBeVisible();
    await expect(page.getByText("Noël · jeudi 24 décembre · passage 1 · Ouverture")).toBeVisible();
    for (const nom of ["Catégorie", "Date de la présidence", "Visibilité"]) await expect(page.getByLabel(nom)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Équipe/ })).toHaveCount(0);
    await expect(page.getByLabel("Présidence", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Musiques et danses : sur la page de Noël 2026" })).toHaveAttribute("href", /\/evenements\/scene\/noel/);
    await expect(page.getByText("Entrée des bergers")).toHaveCount(0); // pas de carte Musiques et danses
    await expect(listeCourte(page).getByRole("button", { name: "Douce nuit", exact: true })).toBeVisible();
    await expect(listeCourte(page)).toContainText("proposition en attente");
  });

  test("modifier une note enregistre sans toucher à la catégorie, au titre ni aux éditeurs, et n'appelle jamais notify-setlist", async ({ page }) => {
    const appels: string[] = [];
    page.on("request", (r) => { if (r.url().includes("/api/push/notify-setlist")) appels.push(r.url()); });
    const db = await ouvrir(page, MEMBRE, "/setlists/noel-2026-p1aaaaaa/edit?depuis=fete");
    await attendreEditeur(page, "À jamais Tu es saint");
    await page.locator("label", { hasText: "Notes pour l'équipe" }).locator("input").fill("Thème : la lumière");
    await expect.poll(() => db.doc("setlists/noel-2026-p1aaaaaa")?.notes, { timeout: 10_000 }).toBe("Thème : la lumière");
    const doc = db.doc("setlists/noel-2026-p1aaaaaa")!;
    expect(doc.category).toBe("Noël");
    expect(doc.title).toBe("Noël 2026 · Gp Paix");
    expect(doc.isPrivate).toBe(false);
    expect(doc.editeurs).toEqual(["uid-mo"]);
    expect((doc.items as SetlistItem[])[1]).toMatchObject({ type: "proposition", proposition: { id: "prop1" } });
    // « Terminé » ramène à la page de la fête ; rien n'est annoncé à une équipe.
    await page.getByRole("button", { name: "Terminé" }).click();
    await expect(page).toHaveURL(/\/evenements\/scene\/noel/, { timeout: 30_000 });
    expect(appels).toEqual([]);
  });

  test("sans ?depuis=fete, « Terminé » revient à la page de la setlist", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/setlists/noel-2026-p1aaaaaa/edit");
    await attendreEditeur(page, "À jamais Tu es saint");
    await page.getByRole("button", { name: "Terminé" }).click();
    await expect(page).toHaveURL(/\/setlists\/noel-2026-p1aaaaaa\/?$/, { timeout: 30_000 });
  });

  test("un membre qui n'est pas éditeur n'ouvre pas l'éditeur", async ({ page }) => {
    await ouvrir(page, SANS, "/setlists/noel-2026-p1aaaaaa/edit");
    await expect(page.getByText(/Seuls le créateur/).first()).toBeVisible();
    await expect(listeCourte(page)).toHaveCount(0);
  });
});

test.describe("CF-D · « Proposer » un chant hors répertoire (CF20, CF21)", () => {
  test("recherche sans résultat : « Proposer « … » » crée la proposition et l'ajoute à la setlist", async ({ page }) => {
    const db = await ouvrir(page, MEMBRE, "/setlists/noel-2026-p2bbbbbb/edit", { ...DOCS, "setlists/noel-2026-p2bbbbbb": { ...SETLIST_P2, editeurs: ["uid-mo"] } });
    await attendreEditeur(page, "Béni soit Ton Nom");
    await page.getByRole("button", { name: "Ajouter des chants" }).click();
    await page.getByRole("searchbox").fill("Douce nuit zzz");
    await expect(page.getByText(/Pas encore au répertoire/)).toBeVisible();
    await page.getByRole("button", { name: "Proposer « Douce nuit zzz »" }).click();
    const tiroir = page.getByRole("dialog").filter({ hasText: "Proposer un nouveau chant" });
    await expect(tiroir.getByPlaceholder("ex. Tu es fidèle")).toHaveValue("Douce nuit zzz");
    await tiroir.getByPlaceholder(/youtube\.com/).fill("https://www.youtube.com/watch?v=abc");
    await tiroir.getByRole("button", { name: "Proposer et ajouter" }).click();
    await expect.poll(() => db.list("songProposals").length).toBe(1);
    const prop = db.doc(db.list("songProposals")[0])!;
    expect(prop).toMatchObject({ title: "Douce nuit zzz", status: "pending", setlistId: "noel-2026-p2bbbbbb", authorId: "uid-mo" });
    await expect.poll(() => ((db.doc("setlists/noel-2026-p2bbbbbb")?.items as SetlistItem[]) ?? []).map((i) => i.type ?? "chant"), { timeout: 10_000 }).toEqual(["chant", "proposition"]);
    const ajoutee = (db.doc("setlists/noel-2026-p2bbbbbb")!.items as SetlistItem[])[1];
    expect(ajoutee.proposition).toMatchObject({ titre: "Douce nuit zzz" });
    expect(ajoutee.proposition?.id).toBeTruthy();
  });

  test("une setlist ordinaire ne propose pas : recherche sans résultat, aucune ligne « Proposer »", async ({ page }) => {
    const ordinaire = { title: "Culte 18/10", leader: "Présidence", category: "Groupe Paix", date: "2026-10-18", language: "fr", notes: "", isPrivate: false, ownerId: "uid-mo", items: [item("a-jamais-tu-es-saint", 1)] };
    await ouvrir(page, MEMBRE, "/setlists/ordinaire/edit", { "setlists/ordinaire": ordinaire });
    await attendreEditeur(page, "À jamais Tu es saint");
    await page.getByRole("button", { name: "Ajouter des chants" }).click();
    await page.getByRole("searchbox").fill("Douce nuit zzz");
    await expect(volet(page).getByText("Aucun chant ne correspond.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Proposer/ })).toHaveCount(0);
  });
});

test.describe("CF-D · bascule d'une proposition (CF21)", () => {
  test.use({ serviceWorkers: "block" });

  test("un chant dont l'index porte {proposition} remplace la ligne « en attente » sur la page de la setlist", async ({ page }) => {
    await page.route("**/songs-index.json", async (route) => {
      const index = JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: (SongIndexEntry & { proposition?: string })[] };
      index.songs = index.songs.map((s) => (s.slug === "abba-pere" ? { ...s, proposition: "prop1" } : s));
      await route.fulfill({ json: index });
    });
    await ouvrir(page, MEMBRE, "/setlists/noel-2026-p1aaaaaa");
    await expect(page.getByText("Abba Père").first()).toBeVisible();
    await expect(page.getByText("proposition en attente")).toHaveCount(0);
  });

  test("sans correspondance, la ligne « Douce nuit — proposition en attente » est dans la liste et ne casse pas la page", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/setlists/noel-2026-p1aaaaaa");
    await expect(page.getByText("Douce nuit — proposition en attente").first()).toBeVisible();
    await expect(page.getByText("À jamais Tu es saint").first()).toBeVisible();
  });
});

test.describe("CF-D · page d'une setlist de fête (CF14, CF27)", () => {
  test("en-tête, sous-titre, carte « Musiques et danses », « L'ordre de passage » et passages voisins", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/setlists/noel-2026-p1aaaaaa");
    await expect(page.getByText("Noël · jeudi 24 décembre · passage 1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Ouverture · saisie par Ruth K\./).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Page de Noël 2026" }).first()).toHaveAttribute("href", /\/evenements\/scene\/noel/);
    const regie = page.getByRole("region", { name: /Musiques et danses/ });
    await expect(regie).toContainText("Entrée des bergers");
    await expect(regie).toContainText("2:10");
    await expect(regie).toContainText("Régie : Lumière douce");
    await expect(regie.getByRole("link", { name: "Entrée des bergers" })).toHaveAttribute("href", "https://exemple.org/musique");
    const ordre = page.getByRole("region", { name: "L'ordre de passage" });
    await expect(ordre).toContainText("1 sur 3");
    await expect(ordre).toContainText("Gp Joie");
    await expect(ordre.locator('a[href*="noel-2026-p2bbbbbb"]').filter({ visible: true })).toHaveCount(1);
  });

  test("un passage voisin sans setlist : son titre, sans lien", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/setlists/noel-2026-p2bbbbbb");
    const ordre = page.getByRole("region", { name: "L'ordre de passage" });
    await expect(ordre).toContainText("2 sur 3");
    await expect(ordre.locator('a[href*="noel-2026-p1aaaaaa"]').filter({ visible: true })).toHaveCount(1);
    await expect(ordre.locator("a").filter({ visible: true })).toHaveCount(1); // le voisin d'après (Franco) n'a pas de setlist
  });

  test("« Aucune pour ce passage. » quand le passage n'a ni musique ni danse", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/setlists/noel-2026-p2bbbbbb");
    await expect(page.getByRole("region", { name: /Musiques et danses/ })).toContainText("Aucune pour ce passage.");
    await expect(page.getByText("Entrée côté jardin").first()).toBeVisible(); // la note de la setlist
  });

  test("lien de présentation : TEAM RÉGIE le pose, un membre sans équipe ne le voit pas (CF27)", async ({ page }) => {
    const corps: unknown[] = [];
    await page.route("**/api/setlist/presentation", async (route) => { corps.push(route.request().postDataJSON()); await route.fulfill({ json: { ok: true, presentationUrl: "https://www.canva.com/design/noel" } }); });
    await ouvrir(page, REGIE, "/setlists/noel-2026-p1aaaaaa");
    await page.getByRole("button", { name: "Ajouter le lien de la présentation" }).click();
    await page.getByRole("textbox", { name: "Lien de la présentation" }).fill("https://www.canva.com/design/noel");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(() => corps.length).toBe(1);
    expect(corps[0]).toMatchObject({ setlistId: "noel-2026-p1aaaaaa" });
  });

  test("sans équipe : pas de bouton du lien, pas de « Modifier », pas de « Dupliquer »", async ({ page }) => {
    await ouvrir(page, SANS, "/setlists/noel-2026-p1aaaaaa");
    await expect(page.getByText("Noël 2026 · Gp Paix").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter le lien de la présentation" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Dupliquer/ })).toHaveCount(0);
  });
});
