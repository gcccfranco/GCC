import { expect, test } from "@playwright/test";
import { signInAs, musicien, type FakeProfile } from "./helpers/fakeSession";
import { loadPlanningData } from "../src/lib/planning/names";

// Audit de performance (docs/audit-performance-2026-11-21.md, § 5 n° 2, § 7 P2) : le planning est lu une fois
// par page, même quand le cadre commun demande l'accès Harmonie cinq ou six fois.

test("loadPlanningData (navigateur) : les appels simultanés partagent une lecture, oubliée une fois réglée", async () => {
  const g = globalThis as unknown as { window?: unknown; fetch: typeof fetch };
  const avantWindow = g.window;
  const avantFetch = g.fetch;
  let lectures = 0;
  g.window = {};
  g.fetch = (async () => { lectures++; return new Response("", { status: 404 }); }) as typeof fetch;
  try {
    const appels = Array.from({ length: 6 }, () => loadPlanningData());
    expect(new Set(appels).size, "six appels, une seule promesse").toBe(1);
    await appels[0];
    const apres = loadPlanningData();
    expect(apres, "une fois réglée, la lecture n'est plus partagée : on relit").not.toBe(appels[0]);
    await apres;
    expect(lectures).toBeGreaterThan(0);
  } finally {
    g.window = avantWindow;
    g.fetch = avantFetch;
  }
});

test("loadPlanningData (serveur) : chaque appel lit, rien n'est partagé", async () => {
  const g = globalThis as unknown as { fetch: typeof fetch };
  const avantFetch = g.fetch;
  g.fetch = (async () => new Response("", { status: 404 })) as typeof fetch;
  try {
    const a = loadPlanningData();
    const b = loadPlanningData();
    expect(a).not.toBe(b);
    await Promise.all([a, b]);
  } finally {
    g.fetch = avantFetch;
  }
});

const ROMANE: FakeProfile = {
  uid: "uid-romane", email: "romane.fictive@example.com", firstName: "Romane", lastName: "K.", planningName: "Romane K.",
  serviceRoles: { "Culte Francophone": ["musicien"] }, ...musicien("piano"),
};

test("chargement d'une page : aucune lecture du planning ne part deux fois", async ({ page }) => {
  await signInAs(page, ROMANE, {}, "/songs");
  const vues = new Map<string, number>();
  page.on("request", (r) => {
    const u = decodeURIComponent(r.url());
    if (!/plannings\/|planningReleases\/|petitDej|docs\.google\.com\/spreadsheets/.test(u)) return;
    const cle = `${r.method()} ${u} ${r.postData() ?? ""}`;
    vues.set(cle, (vues.get(cle) ?? 0) + 1);
  });
  await page.goto("/accords");
  await expect(page.getByRole("button", { name: "Notifications" }).first()).toBeVisible();
  await page.waitForTimeout(2000);
  expect(vues.size, "le planning est bien lu").toBeGreaterThan(0);
  // La feuille EDD est lue trois fois au sein d'une même lecture (plusieurs fonctions de `sheets.ts`) : hors
  // de cette retouche, on la tolère à trois. Avant la retouche, chaque feuille partait une fois par instance.
  expect([...vues].filter(([cle, n]) => n > (/sheet=EDD /.test(cle) ? 3 : 1))).toEqual([]);
});
