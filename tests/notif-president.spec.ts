import { expect, test } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { presentationNotifKey, presidentRecipients } from "../src/lib/setlist/presentationLink";

// Lot 2 (docs/spec-notif-president.md) : quand la régie pose ou remplace le
// lien de la présentation, le président de la setlist est prévenu
// automatiquement ; sans compte relié à son nom, rien ne part et la régie le voit.

const SETLIST_ID = "setlist-president";
const REGIE: FakeProfile = {
  uid: "uid-regie",
  email: "regie@example.com",
  planningName: "Test R.",
  serviceRoles: { "Culte Francophone": ["regie"] },
};
const CANVA = "https://www.canva.com/design/DAG123/view";
const API = "**/api/setlist/presentation";

function setlist() {
  return {
    title: "Culte du 14 septembre",
    leader: "Jonathan Z.",
    category: "Culte Francophone",
    date: "2026-09-14",
    language: "mixed",
    notes: "",
    ownerId: "uid-owner",
    isPrivate: false,
    items: [],
  };
}

test("destinataires : tous les comptes au nom du président, sauf l'auteur du lien", () => {
  const index = new Map([["jonathan z", ["uid-jo", "uid-jo-2"]]]);
  expect(presidentRecipients("Jonathan Z.", index, "uid-regie")).toEqual({ uids: ["uid-jo", "uid-jo-2"], linked: true });
  expect(presidentRecipients("Jonathan Z.", index, "uid-jo"), "le président pose le lien lui-même").toEqual({ uids: ["uid-jo-2"], linked: true });
  expect(presidentRecipients("Paul W.", index, "uid-regie"), "aucun compte à ce nom").toEqual({ uids: [], linked: false });
  expect(presidentRecipients("", index, "uid-regie")).toEqual({ uids: [], linked: false });
});

test("anti-doublon : une clé par setlist et par lien", () => {
  const a = presentationNotifKey(SETLIST_ID, CANVA);
  expect(a).toBe(presentationNotifKey(SETLIST_ID, CANVA));
  expect(a).toMatch(/^presentation-setlist-president-[0-9a-f]+$/);
  expect(a).not.toBe(presentationNotifKey(SETLIST_ID, "https://www.canva.com/design/AUTRE/view"));
  expect(a).not.toBe(presentationNotifKey("autre-setlist", CANVA));
});

test.describe("retour à la régie", () => {
  async function saveLink(page: import("@playwright/test").Page, response: Record<string, unknown>) {
    await signInAs(page, REGIE, { [`setlists/${SETLIST_ID}`]: setlist() }, `/setlists/${SETLIST_ID}`);
    await page.route(API, (route) => route.fulfill({ json: { ok: true, presentationUrl: CANVA, ...response } }));
    await page.getByRole("button", { name: "Ajouter le lien de la présentation" }).click();
    await page.getByRole("textbox", { name: "Lien de la présentation" }).fill(CANVA);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("link", { name: "Présentation" })).toHaveAttribute("href", CANVA);
  }

  test("le président a été prévenu", async ({ page }) => {
    await saveLink(page, { notified: 1, linked: true });
    await expect(page.getByText("Président prévenu.")).toBeVisible();
  });

  test("sans compte relié au nom du président, la régie le voit", async ({ page }) => {
    await saveLink(page, { notified: 0, linked: false });
    await expect(page.getByText("Personne n'a été prévenu : aucun compte relié au nom du président.")).toBeVisible();
  });

  test("rien à dire quand le lien n'a pas changé", async ({ page }) => {
    await saveLink(page, {});
    await expect(page.getByText(/prévenu/)).toHaveCount(0);
  });
});
