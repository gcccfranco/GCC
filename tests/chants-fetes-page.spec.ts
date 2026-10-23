import "./helpers/cleFirebase";
import { expect, test, type Page, type Route } from "@playwright/test";
import { coordination, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs, verifierAgencement } from "./helpers/agencement";

// Lot « chants des fêtes », tranche CF-C (docs/spec-chants-fetes.md, CF1, CF5-CF9, CF22-CF23) : la page
// de la fête. Comptes, programmes, setlists simulés ; les routes /api/fetes/* sont interceptées. Noms fictifs.

const MEMBRE: FakeProfile = { uid: "uid-mo", email: "mo@example.com", firstName: "Mo", lastName: "M.", serviceRoles: { "Groupe Paix": ["musicien"] } };
const COORD: FakeProfile = { uid: "uid-cora", email: "cora@example.com", firstName: "Cora", lastName: "D.", ...coordination() };

const passage = (id: string, titre: string, quoi: string, qui: string[], medias?: unknown[]) => ({ id, titre, quoi, qui, ...(medias ? { medias } : {}) });
const DANSE = { id: "m1", type: "danse", titre: "Lumière dans la nuit, chorégraphie", lien: "https://exemple.org/danse", duree: "3:40", depart: "0:12", note: "Fumée au refrain" };

const PROGRAMME = {
  nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: true,
  plages: [{ jour: 0, debut: "14:00", fin: "19:00" }], duree: 60,
  passages: [
    passage("p1aaaaaa", "Ouverture", "Séance louange", ["Gp Paix"]),
    passage("p2bbbbbb", "Les bergers", "Danse", ["Gp Joie"], [DANSE]),
    passage("p3cccccc", "Le grand spectacle", "Spectacle", ["EDD 中班", "EDD 大班"]),
    passage("p4dddddd", "Louange finale", "Chant", ["Franco"]),
  ],
  createdBy: "uid-alice", updatedAt: "2026-10-01T10:00:00Z",
};

const item = (songSlug: string, keyOverride: string | null = null) =>
  ({ songSlug, position: 0, keyOverride, showChords: true, showPinyin: false, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" });
const SETLIST_P1 = {
  title: "Noël 2026 · Gp Paix", leader: "Ruth K.", category: "Noël", date: "2026-12-24", language: "fr", notes: "", isDraft: false, isPrivate: false, ownerId: null,
  createdAt: "2026-10-05T10:00:00Z", editeurs: ["uid-mo"], fete: { programme: "noel-2026", passage: "p1aaaaaa", qui: "Gp Paix" },
  items: [
    item("a-jamais-tu-es-saint"),
    item("beni-soit-ton-nom", "B"),
    { ...item(""), type: "proposition", proposition: { id: "prop1", titre: "Douce nuit" } },
  ],
};
const DOCS = { "programmes/noel-2026": PROGRAMME, "setlists/noel-2026-p1aaaaaa": SETLIST_P1 };

type Droits = { id: string; chants: boolean; musiques: boolean; mien: boolean }[];
const AUCUN: Droits = PROGRAMME.passages.map((p) => ({ id: p.id, chants: false, musiques: false, mien: false }));
const droitsDe = (surcharges: Record<string, Partial<Droits[number]>>): Droits => AUCUN.map((d) => ({ ...d, ...surcharges[d.id] }));

/** Ouvre l'ordre de passage de Noël 2026 (réservations ouvertes, 09/10/2026) avec des droits simulés. */
async function ouvrir(page: Page, qui: FakeProfile, droits: Droits, opts: { chemin?: string; saisir?: (r: Route) => Promise<void>; musiques?: (r: Route) => Promise<void>; jour?: string } = {}) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(`${opts.jour ?? "2026-10-09"}T10:00:00`));
  await page.route("**/api/fetes/droits", (route) => route.fulfill({ json: { passages: droits } }));
  await page.route("**/api/fetes/saisir", opts.saisir ?? ((route) => route.fulfill({ json: { setlistId: "noel-2026-p1aaaaaa" } })));
  await page.route("**/api/fetes/musiques", opts.musiques ?? ((route) => route.fulfill({ json: { ok: true } })));
  return signInAs(page, qui, DOCS, opts.chemin ?? "/evenements/scene/noel?vue=ordre");
}
const passages = (page: Page, nom = "Ordre de Passage jour J") => page.getByRole("list", { name: nom }).locator(":scope > li");
const ligne = (page: Page, n: number, nom?: string) => passages(page, nom).nth(n);

test.describe("CF-C · page de la fête : chants, musiques et danses dans l'ordre de passage (CF6)", () => {
  test("chants avec tonalité, proposition en attente, « Pas de chant », danse avec durée, départ et note", async ({ page }) => {
    await ouvrir(page, MEMBRE, AUCUN);
    const un = ligne(page, 0);
    await expect(un).toContainText("Ouverture");
    await expect(un).toContainText("À jamais Tu es saint");
    await expect(un.getByText("A", { exact: true })).toBeVisible(); // tonalité recommandée
    await expect(un).toContainText("Béni soit Ton Nom");
    await expect(un.getByText("B", { exact: true })).toBeVisible(); // keyOverride
    await expect(un).toContainText("Douce nuit");
    await expect(un).toContainText("proposition en attente");
    const deux = ligne(page, 1);
    await expect(deux).toContainText("Pas de chant");
    await expect(deux).toContainText("▷ Danse · Lumière dans la nuit, chorégraphie · 3:40 · départ à 0:12");
    await expect(deux).toContainText("Régie : Fumée au refrain");
    await expect(deux.getByRole("link", { name: "Lumière dans la nuit, chorégraphie" })).toHaveAttribute("href", "https://exemple.org/danse");
    await expect(deux.getByRole("link", { name: "Lumière dans la nuit, chorégraphie" })).toHaveAttribute("target", "_blank");
  });

  test("« Culte Francophone » remplace « Franco » ; « Setlist » ouvre la setlist du passage, absente des passages sans chant", async ({ page }) => {
    await ouvrir(page, MEMBRE, AUCUN);
    await expect(ligne(page, 3)).toContainText("Culte Francophone");
    await expect(ligne(page, 3).getByText("Franco", { exact: true })).toHaveCount(0);
    await expect(ligne(page, 0).getByRole("link", { name: "Setlist" })).toHaveAttribute("href", /^\/setlists\/noel-2026-p1aaaaaa\/?$/);
    await expect(page.getByRole("link", { name: "Setlist", exact: true })).toHaveCount(1);
  });

  test("l'entrée de la colonne dit « 4 passages et leurs chants »", async ({ page }) => {
    await ouvrir(page, MEMBRE, AUCUN, { chemin: "/evenements/scene/noel" });
    await expect(page.getByRole("button", { name: /Ordre de passage du jour J/ })).toContainText("jeudi 24 décembre · 4 passages et leurs chants");
  });

  test("un passage à deux Qui : « Pas de chant », ni « Saisir les chants » ni « Setlist », même pour la coordination", async ({ page }) => {
    await ouvrir(page, COORD, droitsDe({ p3cccccc: { chants: false, musiques: true } }));
    const trois = ligne(page, 2);
    await expect(trois).toContainText("Pas de chant");
    await expect(trois.getByRole("button", { name: "Saisir les chants" })).toHaveCount(0);
    await expect(trois.getByRole("link", { name: "Setlist" })).toHaveCount(0);
    await expect(trois.getByRole("button", { name: "+ Musique ou danse" })).toBeVisible();
  });
});

test.describe("CF-C · le mien, « Saisir les chants », « Tous · Le mien » (CF7, CF8)", () => {
  const MIEN = droitsDe({ p1aaaaaa: { chants: true, musiques: true, mien: true } });

  test("passage à moi : pastille « le mien », « Saisir les chants » appelle la route puis ouvre l'éditeur", async ({ page }) => {
    const corps: unknown[] = [];
    await ouvrir(page, MEMBRE, MIEN, { saisir: async (r) => { corps.push(r.request().postDataJSON()); await r.fulfill({ json: { setlistId: "noel-2026-p1aaaaaa" } }); } });
    await expect(ligne(page, 0).getByText("le mien", { exact: true })).toBeVisible();
    await expect(ligne(page, 1).getByText("le mien", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Saisir les chants" })).toHaveCount(1);
    // Sur un passage à moi, « Saisir les chants » remplace « Setlist » (CF7).
    await expect(ligne(page, 0).getByRole("link", { name: "Setlist", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Saisir les chants" }).click();
    await expect(page).toHaveURL(/\/setlists\/noel-2026-p1aaaaaa\/edit\/?\?depuis=fete/, { timeout: 30_000 });
    expect(corps).toEqual([{ programme: "noel-2026", passage: "p1aaaaaa" }]);
  });

  test("« Tous · Le mien » : « Le mien » ne garde que le passage 1 ; sans passage à soi, pas de filtre ni de bouton", async ({ page }) => {
    await ouvrir(page, MEMBRE, MIEN);
    const filtre = page.getByRole("group", { name: "Passages à afficher" });
    await expect(filtre.getByRole("button")).toHaveText(["Tous", "Le mien"]);
    await filtre.getByRole("button", { name: "Le mien" }).click();
    await expect(passages(page)).toHaveCount(1);
    await expect(ligne(page, 0)).toContainText("Ouverture");
    await filtre.getByRole("button", { name: "Tous" }).click();
    await expect(passages(page)).toHaveCount(4);
  });

  test("sans droit : ni filtre, ni « Saisir les chants », ni « + Musique ou danse »", async ({ page }) => {
    await ouvrir(page, { ...MEMBRE, uid: "uid-sans" }, AUCUN);
    await expect(ligne(page, 0)).toBeVisible();
    await expect(page.getByRole("group", { name: "Passages à afficher" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Saisir les chants" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Musique ou danse" })).toHaveCount(0);
  });

  test("coordination : « Saisir les chants » et « + Musique ou danse » sur un passage sans pastille « le mien »", async ({ page }) => {
    await ouvrir(page, COORD, droitsDe({ p4dddddd: { chants: true, musiques: true }, p1aaaaaa: { chants: true, musiques: true } }));
    await expect(page.getByRole("button", { name: "Saisir les chants" })).toHaveCount(2);
    await expect(page.getByText("le mien", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Passages à afficher" })).toHaveCount(0);
  });

  test("réponse 409 : « Ce passage a changé : recharge. »", async ({ page }) => {
    await ouvrir(page, MEMBRE, MIEN, { saisir: (r) => r.fulfill({ status: 409, json: { error: "Ce passage a changé : recharge" } }) });
    await page.getByRole("button", { name: "Saisir les chants" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Ce passage a changé : recharge." })).toBeVisible();
    await expect(page).toHaveURL(/vue=ordre/);
  });
});

test.describe("CF-C · « + Musique ou danse » (CF22, CF23)", () => {
  const MUS = droitsDe({ p2bbbbbb: { musiques: true, mien: true }, p3cccccc: { musiques: true } });

  test("la feuille écrit la liste du seul passage par /api/fetes/musiques ; durée « 3.40 » refusée sous le champ", async ({ page }) => {
    const corps: Record<string, unknown>[] = [];
    await ouvrir(page, MEMBRE, MUS, { musiques: async (r) => { corps.push(r.request().postDataJSON()); await r.fulfill({ json: { ok: true } }); } });
    await ligne(page, 1).getByRole("button", { name: "+ Musique ou danse" }).click();
    const feuille = page.getByRole("dialog");
    await expect(feuille.getByText("facultatif").first()).toBeVisible();
    await feuille.getByLabel("Titre").fill("Entrée des bergers");
    await feuille.getByLabel(/^Durée/).fill("3.40");
    await feuille.getByRole("button", { name: "Enregistrer" }).click();
    await expect(feuille.getByRole("alert")).toContainText("minutes et secondes");
    expect(corps).toEqual([]);
    await feuille.getByLabel(/^Durée/).fill("3:40");
    await feuille.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(() => corps.length).toBe(1);
    expect(corps[0]).toMatchObject({ programme: "noel-2026", passage: "p2bbbbbb" });
    const medias = corps[0].medias as { titre: string; type: string; duree: string }[];
    expect(medias.map((m) => [m.titre, m.type, m.duree])).toEqual([["Lumière dans la nuit, chorégraphie", "danse", "3:40"], ["Entrée des bergers", "musique", "3:40"]]);
  });

  test("« ⋯ » › Retirer passe par la confirmation du site, puis écrit la liste sans la musique", async ({ page }) => {
    const corps: Record<string, unknown>[] = [];
    await ouvrir(page, MEMBRE, MUS, { musiques: async (r) => { corps.push(r.request().postDataJSON()); await r.fulfill({ json: { ok: true } }); } });
    await ligne(page, 1).getByRole("button", { name: /Plus d'actions|Autres actions/ }).click();
    await page.getByRole("menuitem", { name: "Retirer" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Retirer cette musique ou cette danse ?");
    await page.getByRole("alertdialog").getByRole("button", { name: "Retirer" }).click();
    await expect.poll(() => corps.length).toBe(1);
    expect(corps[0].medias).toEqual([]);
  });

  test("onzième musique : refusée dans la feuille, rien d'envoyé", async ({ page }) => {
    const corps: unknown[] = [];
    const dix = Array.from({ length: 10 }, (_, i) => ({ ...DANSE, id: `m${i}`, titre: `Musique ${i}` }));
    interdireDialoguesNatifs(page);
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    await page.route("**/api/fetes/droits", (route) => route.fulfill({ json: { passages: MUS } }));
    await page.route("**/api/fetes/musiques", async (r) => { corps.push(1); await r.fulfill({ json: { ok: true } }); });
    const docs = { ...DOCS, "programmes/noel-2026": { ...PROGRAMME, passages: PROGRAMME.passages.map((p) => (p.id === "p2bbbbbb" ? { ...p, medias: dix } : p)) } };
    await signInAs(page, MEMBRE, docs, "/evenements/scene/noel?vue=ordre");
    await ligne(page, 1).getByRole("button", { name: "+ Musique ou danse" }).click();
    await page.getByRole("dialog").getByLabel("Titre").fill("La onzième");
    await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Dix musiques ou danses au plus");
    expect(corps).toEqual([]);
  });
});

test.describe("CF-C · Back-Office : chants et musiques en lecture (CF9)", () => {
  test("ordre de passage du Back-Office : chants et danse visibles, aucun bouton de saisie ni de musique", async ({ page }) => {
    interdireDialoguesNatifs(page);
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    await page.route("**/api/fetes/**", (route) => route.abort());
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, COORD, DOCS, "/back-office/evenements/scene/noel?vue=ordre");
    const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
    await expect(liste).toContainText("À jamais Tu es saint");
    await expect(liste).toContainText("Lumière dans la nuit, chorégraphie");
    await expect(page.getByRole("button", { name: "Saisir les chants" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Musique ou danse" })).toHaveCount(0);
  });
});

test.describe("CF-C · ids des passages (CF1)", () => {
  test("un passage ajouté dans l'ordre de passage reçoit un identifiant de 8 caractères ; modifier garde l'identifiant et les musiques", async ({ page }) => {
    interdireDialoguesNatifs(page);
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    const db: FakeDb = await signInAs(page, COORD, DOCS, "/back-office/evenements/scene/noel?vue=ordre");
    await page.getByRole("button", { name: "Ajouter un passage" }).click();
    await page.getByLabel("Titre").fill("Chant de clôture");
    await page.getByRole("group", { name: "Qui" }).getByLabel("Gp Amour").check();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect.poll(() => (db.doc("programmes/noel-2026")?.passages as unknown[] | undefined)?.length).toBe(5);
    const passages = db.doc("programmes/noel-2026")!.passages as { id?: string; titre: string; medias?: unknown[] }[];
    expect(passages[4].id).toMatch(/^[a-z0-9]{8}$/);
    expect(passages[1].id).toBe("p2bbbbbb");
    expect(passages[1].medias).toHaveLength(1);
  });
});

test.describe("CF-C · agencement", () => {
  test("la page de la fête ne déborde pas, filtre compris", async ({ page }) => {
    await ouvrir(page, MEMBRE, droitsDe({ p1aaaaaa: { chants: true, musiques: true, mien: true } }));
    await expect(ligne(page, 0)).toBeVisible();
    await expect(page.getByRole("group", { name: "Passages à afficher" })).toBeVisible();
    await verifierAgencement(page);
  });

  test("en 中文 : « Pas de chant », « Saisir les chants » et « 我的 » traduits", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, MEMBRE, droitsDe({ p1aaaaaa: { chants: true, musiques: true, mien: true } }));
    await expect(ligne(page, 1, "正日出场顺序")).toContainText("没有诗歌");
    await expect(page.getByRole("button", { name: "填写诗歌" })).toBeVisible();
    await expect(page.getByRole("group", { name: "显示的节目" }).getByRole("button")).toHaveText(["全部", "我的"]);
    await expect(ligne(page, 3, "正日出场顺序")).toContainText("法语崇拜");
  });
});
