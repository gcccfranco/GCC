import { expect, type Locator, type TestInfo } from "@playwright/test";

/** Une puce d'action (dimanche-17) : 32 px de haut, texte de 12 px au moins, contour, et sous `pointer: coarse`
 *  (téléphone, tablettes) une zone de toucher d'au moins 44 × 44 px. */
export async function verifierPuce(puce: Locator, info: TestInfo) {
  await expect(puce).toBeVisible();
  const m = await puce.evaluate((el) => {
    const c = getComputedStyle(el);
    const a = getComputedStyle(el, "::after");
    return { h: el.getBoundingClientRect().height, police: parseFloat(c.fontSize), bord: parseFloat(c.borderTopWidth), zoneH: parseFloat(a.height), zoneL: parseFloat(a.width) };
  });
  expect(m.h).toBe(32);
  expect(m.police).toBeGreaterThanOrEqual(12);
  expect(m.bord).toBeGreaterThan(0);
  if (!info.project.name.startsWith("ordinateur")) {
    expect(m.zoneH).toBeGreaterThanOrEqual(44);
    expect(m.zoneL).toBeGreaterThanOrEqual(44);
  }
}
