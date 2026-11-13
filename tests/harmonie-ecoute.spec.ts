import { expect, test } from "@playwright/test";
import { loadSong } from "../src/lib/content/loadSongs";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { frequencesDeLAccord, planAvantApres, planDeLecture, dureeDuPlan } from "../src/lib/audio/synthese";

// Lot H3 (docs/spec-harmonie-accords.md) : le plan d'écoute est pur, aucune page.

test("frequencesDeLAccord : D donne quatre fréquences, la première est le ré grave", () => {
  const f = frequencesDeLAccord("D")!;
  expect(f).toHaveLength(4);
  expect(Math.abs(f[0] - 146.83)).toBeLessThan(0.01);
});

test("frequencesDeLAccord : la basse de A/C# est do dièse", () => {
  expect(Math.abs(frequencesDeLAccord("A/C#")![0] - 138.59)).toBeLessThan(0.01);
});

test("frequencesDeLAccord : Bm7 lisible, xyz illisible", () => {
  expect(frequencesDeLAccord("Bm7")?.length).toBeGreaterThan(0);
  expect(frequencesDeLAccord("xyz")).toBeNull();
});

test("planDeLecture : un accord illisible garde sa place, les débuts croissent", () => {
  const plan = planDeLecture(["D", "xyz", "A"]);
  expect(plan).toHaveLength(3);
  expect(plan[1].frequences).toEqual([]);
  expect(plan[0].debut).toBeLessThan(plan[1].debut);
  expect(plan[1].debut).toBeLessThan(plan[2].debut);
});

test("planAvantApres : un silence de 0,8 s entre les deux suites", () => {
  const plan = planAvantApres(["D", "A"], ["G"]);
  expect(plan).toHaveLength(3);
  expect(plan[2].debut - dureeDuPlan(plan.slice(0, 2))).toBeCloseTo(0.8, 5);
});

for (const slug of ["a-jamais-tu-es-saint", "一切歌颂赞美"]) {
  test(`frequencesDeLAccord : tous les accords de ${slug} sont lisibles`, () => {
    const ast = parseChordPro(loadSong(slug).chordProSource);
    const accords = ast.sections.flatMap((s) => s.lines.flatMap((l) => l.tokens.filter((k) => k.type === "chord").map((k) => k.value)));
    expect(accords.length).toBeGreaterThan(0);
    for (const a of accords) expect(frequencesDeLAccord(a), a).not.toBeNull();
  });
}
