import { expect, test } from "@playwright/test";
import { MARGE_FILET, choisirCoupe, type BordsDemi, type GroupeDemi } from "../src/lib/performance/demiPage";

// Lot FS-E : choix de la coupe (fonction pure), sans page. Rappel de section et cohérence du filet avec la reprise.

const HAUTEUR = 600;
const RESERVE = 14;

test("une reprise posée au libellé d'une section n'a pas de rappel ; sous le libellé, elle en a un", () => {
  const bas = (libelleTop?: number): GroupeDemi => ({
    x0: 0, x1: 400, top: 0, blocs: [], lignes: [300],
    sections: [{ top: 290, bottom: 700, nom: "Refrain", libelleTop }],
  });
  const haut: GroupeDemi = { x0: 0, x1: 400, top: 0, blocs: [100], lignes: [], sections: [] };
  const au = choisirCoupe({ haut: [haut], bas: [bas(300)] }, 300, HAUTEUR, RESERVE);
  expect(au).not.toBeNull();
  expect(au!.bas[0].rappel, "reprise au libellé : le nom est déjà là").toBeUndefined();
  const sous = choisirCoupe({ haut: [haut], bas: [{ ...bas(280), lignes: [330] }] }, 330, HAUTEUR, RESERVE);
  expect(sous!.bas[0].rappel, "reprise sous le libellé : rappel").toBe("Refrain");
  const inconnu = choisirCoupe({ haut: [haut], bas: [bas(undefined)] }, 300, HAUTEUR, RESERVE);
  expect(inconnu!.bas[0].rappel, "libellé non mesuré : comportement d'origine").toBe("Refrain");
});

test("le filet reste cohérent avec la reprise (yCoupe = plus haute reprise, rappel compris, moins la marge)", () => {
  let graine = 7;
  const alea = () => (graine = (graine * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const groupe = (): GroupeDemi => {
    const rangees: Array<[number, number]> = [];
    let y = alea() * 60;
    for (let i = 0, n = 4 + Math.floor(alea() * 14); i < n; i++) {
      const h = 20 + alea() * 120;
      rangees.push([y, y + h]);
      y += h + alea() * 10;
    }
    return { x0: 0, x1: 400, top: rangees[0][0], blocs: [], lignes: rangees.map((r) => r[0]), sections: [], plages: rangees };
  };
  let vues = 0;
  for (let n = 0; n < 2000; n++) {
    const bords: BordsDemi = { haut: [{ x0: 0, x1: 400, top: 0, blocs: [40 + alea() * 300], lignes: [], sections: [] }], bas: [groupe(), groupe()] };
    const c = choisirCoupe(bords, (0.25 + alea() * 0.5) * HAUTEUR, HAUTEUR, RESERVE);
    const tops = c ? c.bas.filter((z) => Number.isFinite(z.y)).map((z) => z.y - (z.rappel ? RESERVE : 0)) : [];
    if (!c || tops.length === 0) continue;
    vues++;
    expect(Math.abs(Math.min(...tops) - MARGE_FILET - c.yCoupe)).toBeLessThan(1e-6);
  }
  expect(vues).toBeGreaterThan(1000);
});
