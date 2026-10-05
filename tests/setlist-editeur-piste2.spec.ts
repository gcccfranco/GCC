import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { buildFormItems } from "../src/lib/setlist/formItems";
import { buildSetlistItems } from "../src/lib/setlist/buildSetlistItems";
import type { SetlistItem } from "../src/types/setList";
import type { SongIndexEntry } from "../src/types/song";

// Lot U5 bis (docs/spec-editeur-setlist.md), éditeur de setlist « piste 2 ».
// Tranche T1 : le défaut trouvé (question 6) — tout enregistrement de
// l'éditeur effaçait les accords retouchés sur un scan 简谱 (`jianpuChords`,
// mode Adapter, lot 9). Ils sont reconduits tels quels, comme `contentOverride`.
// La mise en page en deux colonnes et les feuilles viennent en T3 et T4.

const INDEX = (JSON.parse(readFileSync("public/songs-index.json", "utf8")) as { songs: SongIndexEntry[] }).songs;
const SONGS_MAP = Object.fromEntries(INDEX.map((s) => [s.slug, s]));

/** Chant chinois affiché en scan (calque certifié), comme harmonie-jianpu.spec.ts. */
const SCAN = "到各山岭去传扬";
const RETOUCHES = { changed: { 0: "Em7", 3: "" }, added: [{ page: 0, x: 800, y: 1163, c: "G" }] };

const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne",
  email: "musicienne@example.com",
  firstName: "Musicienne",
  lastName: "Test",
  planningName: "Musicienne T.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-editeur-piste2";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

const SETLIST = {
  title: "Culte Francophone 18/10",
  leader: "Présidence A",
  category: "Culte Francophone",
  date: "2026-10-18",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    item({ songSlug: "abba-pere", position: 1, showPinyin: false }),
    item({ songSlug: SCAN, position: 2, jianpuSheet: true, jianpuChords: RETOUCHES }),
  ],
};

async function ouvrirEditeur(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIENNE, { [SETLIST_DOC]: SETLIST }, `/setlists/${SETLIST_ID}/edit`);
  await expect(page.getByLabel("Tonalité de Abba Père")).toBeVisible();
  return db;
}

test("(pur) jianpuChords : relus par buildFormItems, réécrits par buildSetlistItems", () => {
  const relus = buildSetlistItems(buildFormItems(SETLIST.items as SetlistItem[], SONGS_MAP));
  expect(relus[1].songSlug).toBe(SCAN);
  expect(relus[1].jianpuSheet).toBe(true);
  expect(relus[1].jianpuChords).toEqual(RETOUCHES);
});

test("(pur) jianpuChords : un chant sans retouche n'en reçoit pas", () => {
  const relus = buildSetlistItems(buildFormItems(SETLIST.items as SetlistItem[], SONGS_MAP));
  expect("jianpuChords" in relus[0]).toBe(false);
});

test("« Modifier » : changer la tonalité d'un autre chant garde les accords retouchés sur le scan (FR + 中文)", async ({ page }) => {
  const db = await ouvrirEditeur(page);
  await page.getByLabel("Tonalité de Abba Père").selectOption("B");

  await expect
    .poll(() => (db.doc(SETLIST_DOC)?.items as SetlistItem[])[0].keyOverride, { timeout: 10_000 })
    .toBe("B");
  const scan = (db.doc(SETLIST_DOC)?.items as SetlistItem[])[1];
  expect(scan.jianpuSheet).toBe(true);
  expect(scan.jianpuChords).toEqual(RETOUCHES);
});
