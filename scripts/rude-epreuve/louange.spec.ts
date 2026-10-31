import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "../../tests/helpers/fakeSession";
import { attendreMiseEnPage } from "../../tests/helpers/louange";

// Singe du mode louange (forScore, mode unique depuis le 27/10/2026) : 200 gestes au hasard (graine fixe)
// sur une setlist mêlée — français, chinois transposé, scan 简谱, même chant deux fois, chant inexistant.
// Après chaque geste : aucune erreur, compteur « n / N » cohérent, aucun débordement horizontal.

const MUSICIEN: FakeProfile = {
  uid: "uid-singe", email: "singe@example.com", serviceRoles: { "Culte Francophone": ["musicien"] },
};
const item = (songSlug: string, position: number, extra: Record<string, unknown> = {}) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "", ...extra,
});
const SETLIST = {
  title: "Culte du singe", leader: "Présidence", category: "Culte Francophone", date: "2026-11-01",
  language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
  items: [
    item("abba-pere", 1),
    item("一切歌颂赞美", 2, { keyOverride: "E" }),
    item("一生爱你", 3, { keyOverride: "D", jianpuSheet: true }),
    // item("chant-qui-n-existe-pas", 4),
    item("abba-pere", 5, { keyOverride: "Bb" }),
  ],
};

function aleatoire(graine: number) {
  let s = graine;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

async function etat(page: Page) {
  return page.evaluate(() => {
    const racine = document.querySelector("[data-performance-mode]");
    const compteur = [...document.querySelectorAll("[data-performance-mode] span.tabular-nums:not([data-tempo-barre])")]
      .map((e) => e.textContent ?? "").find((t) => /\d+\s*\/\s*\d+/.test(t)) ?? null;
    return {
      ouvert: !!racine,
      compteur,
      deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
}

for (const graine of [1, 7, 42]) {
  test(`singe du mode louange, graine ${graine}`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const erreurs: string[] = [];
    page.on("pageerror", (e) => erreurs.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erreurs.push(`console: ${m.text()}`);
    });
    await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await signInAs(page, MUSICIEN, { "setlists/setlist-singe": SETLIST }, "/setlists/setlist-singe");
    const ouvrir = async () => {
      await page.getByRole("button", { name: /Mode Louange/ }).click();
      await attendreMiseEnPage(page);
    };
    await ouvrir();

    const hasard = aleatoire(graine);
    const base = page.viewportSize()!;
    const journal: string[] = [];
    const anomalies: string[] = [];
    for (let i = 0; i < 200; i++) {
      const v = page.viewportSize()!;
      const r = hasard();
      let geste: string;
      if (r < 0.35) {
        const x = Math.round(hasard() * v.width), y = Math.round(hasard() * v.height);
        geste = `toucher ${x},${y}`;
        await page.mouse.click(x, y);
      } else if (r < 0.55) {
        const y = Math.round(v.height * (0.2 + hasard() * 0.6)), sens = hasard() < 0.5 ? -1 : 1;
        geste = `glisser ${sens < 0 ? "gauche" : "droite"}`;
        await page.mouse.move(v.width / 2, y);
        await page.mouse.down();
        await page.mouse.move(v.width / 2 + sens * 120, y, { steps: 3 });
        await page.mouse.up();
      } else if (r < 0.85) {
        const touches = ["ArrowRight", "ArrowLeft", "PageDown", "PageUp", " ", "ArrowDown", "ArrowUp", "Home", "End"];
        const t = touches[Math.floor(hasard() * touches.length)];
        geste = `touche ${JSON.stringify(t)}`;
        await page.keyboard.press(t);
      } else if (r < 0.95) {
        const tourne = v.width === base.width ? { width: base.height, height: base.width } : base;
        geste = `rotation ${tourne.width}x${tourne.height}`;
        // Plein écran (un toucher au hasard sur son bouton) : la fenêtre ne se redimensionne plus.
        await page.setViewportSize(tourne).catch(() => {});
        await page.waitForTimeout(300);
      } else {
        geste = "Échap";
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(60);
      const e = await etat(page);
      journal.push(`${i} ${geste} → ${e.ouvert ? e.compteur : "fermé"}`);
      if (e.deborde) anomalies.push(`${i} ${geste} : débordement horizontal`);
      if (e.ouvert && e.compteur) {
        const [n, total] = e.compteur.match(/\d+/g)!.map(Number);
        if (n < 1 || n > total) anomalies.push(`${i} ${geste} : compteur incohérent « ${e.compteur} »`);
      }
      if (!e.ouvert) {
        // Échap (ou un bouton touché au hasard) a fermé le mode : on le rouvre.
        const bouton = page.getByRole("button", { name: /Mode Louange/ });
        if (await bouton.isVisible().catch(() => false)) await ouvrir();
        else { anomalies.push(`${i} ${geste} : mode fermé et bouton « Mode Louange » introuvable (${page.url()})`); break; }
      }
    }
    await page.screenshot({ path: testInfo.outputPath(`fin-${graine}.png`) });
    await testInfo.attach("journal", { body: journal.join("\n"), contentType: "text/plain" });
    expect.soft(anomalies, journal.slice(-15).join("\n")).toEqual([]);
    expect(erreurs, journal.slice(-15).join("\n")).toEqual([]);
  });
}
