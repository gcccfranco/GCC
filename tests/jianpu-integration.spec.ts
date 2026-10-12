import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { expect, test } from "@playwright/test";

// Chantier 简谱, lot 3 (docs/spec-jianpu-integration.md) : piste A, le scan fondu
// dans la page. Tests purs d'abord (données), le rendu ensuite.

const lire = <T,>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
type Manifeste = Record<string, { pages: { file: string; w: number; h: number }[] }>;
type Calques = Record<string, { keyLabel: { y: number }; labels: { y: number }[] }>;

// ─── L3-T1 : recadrage, donnée certifiée ─────────────────────────────────────

test.describe("recadrage (données)", () => {
  test("chords.json est intact : les calques certifiés ne bougent pas", () => {
    const empreinte = createHash("sha256").update(readFileSync("public/jianpu/chords.json")).digest("hex");
    expect(empreinte).toBe("ecf3ea0d5c91baf7ae82890c2d77f2fc1766ea722474ade20271e89267b85fbb");
  });

  test("cadrage.json : une valeur par page, dans la page, au-dessus de « 1=X » et des accords ; pages suivantes à 0", () => {
    test.skip(!existsSync("public/jianpu/cadrage.json"), "aucune page certifiée");
    const cadrage = lire<Record<string, number[]>>("public/jianpu/cadrage.json");
    const index = lire<Manifeste>("public/jianpu/index.json");
    const calques = lire<Calques>("public/jianpu/chords.json");
    for (const [slug, tops] of Object.entries(cadrage)) {
      const pages = index[slug]?.pages;
      expect(pages, `${slug} a un scan`).toBeTruthy();
      expect(tops, `${slug} : une valeur par page`).toHaveLength(pages.length);
      tops.forEach((top, i) => {
        expect(Number.isInteger(top) && top >= 0 && top < pages[i].h, `${slug} p.${i + 1} : ${top}`).toBe(true);
        if (i > 0) expect(top, `${slug} p.${i + 1} : pas d'en-tête gravé`).toBe(0);
      });
      // Le min du calcul garde « 1=X » et tout accord placé au-dessus dans la fenêtre.
      const c = calques[slug];
      const haut = Math.min(c.keyLabel.y, ...c.labels.map((l) => l.y));
      expect(tops[0], `${slug} : la coupe passe au-dessus de « 1=X » et des accords`).toBeLessThan(haut);
    }
  });
});
