import { expect, test } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// CI-21 (A10 bis) : quand la lecture d'une liste échoue (429), /setlists dit « les setlists ne peuvent pas être
// lues » avec « Réessayer », jamais « Aucun culte à venir » / « Aucune archive » / l'état vide de « Mes setlists ».
// Réessayer relit et la setlist semée apparaît. Fausse base, nom fictif. Trois appareils.

const NORBERT: FakeProfile = {
  uid: "uid-norbert", email: "norbert@example.com", firstName: "Norbert", lastName: "Vasseur",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST = {
  title: "Culte de la lecture retrouvée", leader: "", category: "Culte Francophone", date: "2099-03-07", language: "fr",
  notes: "", ownerId: NORBERT.uid, isPrivate: false, isDraft: false, items: [],
};

const TEXTES = {
  fr: { illisible: "Les setlists ne peuvent pas être lues pour le moment (réseau ou base indisponible).", reessayer: "Réessayer", aVenir: "Aucun culte à venir.", archive: "Aucune archive.", privee: "Aucune setlist privée pour l'instant." },
  "zh-CN": { illisible: "暂时无法读取歌单（网络或数据库不可用）。", reessayer: "重试", aVenir: "暂无即将到来的崇拜。", archive: "暂无历史记录。", privee: "目前没有私密歌单。" },
} as const;

for (const langue of ["fr", "zh-CN"] as const) {
  const T = TEXTES[langue];

  test(`lecture des listes refusée (429) : message et Réessayer, jamais l'état vide ; Réessayer relit (${langue})`, async ({ page }) => {
    await page.addInitScript((l) => { try { localStorage.setItem("i18nextLng", l); } catch {} }, langue);
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, NORBERT, { "setlists/lecture-1": SETLIST }, "/guide");
    const etat = { actif: true };
    await page.route(/firestore\.googleapis\.com\/.*:runQuery/, (route) => {
      if (!etat.actif) return route.fallback();
      return route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: { code: 429, message: "x" } }) });
    });

    for (const [tab, vide] of [["upcoming", T.aVenir], ["archived", T.archive], ["mine", T.privee]] as const) {
      await page.goto(tab === "upcoming" ? "/setlists" : `/setlists?tab=${tab}`);
      await expect(page.getByText(T.illisible)).toBeVisible();
      await expect(page.getByRole("button", { name: T.reessayer })).toBeVisible();
      await expect(page.getByText(vide)).toHaveCount(0);
    }

    etat.actif = false;
    await page.goto("/setlists");
    await expect(page.getByText(T.illisible)).toHaveCount(0);
    await expect(page.getByRole("link", { name: SETLIST.title }).first()).toBeVisible();
  });

  test(`lecture refusée puis Réessayer : la liste revient sans recharger (${langue})`, async ({ page }) => {
    await page.addInitScript((l) => { try { localStorage.setItem("i18nextLng", l); } catch {} }, langue);
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, NORBERT, { "setlists/lecture-1": SETLIST }, "/guide");
    const etat = { actif: true };
    await page.route(/firestore\.googleapis\.com\/.*:runQuery/, (route) => {
      if (!etat.actif) return route.fallback();
      return route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: { code: 429, message: "x" } }) });
    });
    await page.goto("/setlists");
    await expect(page.getByText(T.illisible)).toBeVisible();
    etat.actif = false;
    await page.getByRole("button", { name: T.reessayer }).click();
    await expect(page.getByText(T.illisible)).toHaveCount(0);
    await expect(page.getByRole("link", { name: SETLIST.title }).first()).toBeVisible();
  });
}
