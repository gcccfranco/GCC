import { expect, test } from "@playwright/test";
import {
  interrupteurAllume,
  prefDepuisInterrupteur,
  sheetEnabled,
  type JianpuPref,
} from "../src/lib/jianpu/preference";

// Chantier 简谱, lot 1 « 简谱 par défaut » (docs/spec-jianpu-integration.md) :
// un chant qui a un scan s'ouvre sur son scan, partout, sans action de
// personne ; « Partition 简谱 » devient un interrupteur allumé par défaut ; le
// choix de la personne prime sur le « Paroles » du responsable (D4, O1).
// Setlists et comptes simulés, noms fictifs.

test("règle : préférence × choix du responsable (9 cas)", () => {
  const cas: [JianpuPref, boolean | undefined, boolean][] = [
    // Non réglée (absente, ou l'ancien « Choix du responsable ») : le scan,
    // sauf « Paroles » choisi par le responsable.
    ["auto", undefined, true],
    ["auto", true, true],
    ["auto", false, false],
    // Réglée sur 简谱 : le scan, même si le responsable a choisi « Paroles ».
    ["always", undefined, true],
    ["always", true, true],
    ["always", false, true],
    // Réglée sur Paroles : jamais le scan.
    ["never", undefined, false],
    ["never", true, false],
    ["never", false, false],
  ];
  for (const [pref, item, attendu] of cas) {
    expect(sheetEnabled(pref, item), `${pref} × ${item}`).toBe(attendu);
  }
});

test("règle : l'interrupteur montre et écrit la préférence (reprise D3)", () => {
  expect(interrupteurAllume("auto"), "Choix du responsable → allumé").toBe(true);
  expect(interrupteurAllume("always"), "Toujours → allumé").toBe(true);
  expect(interrupteurAllume("never"), "Jamais → éteint").toBe(false);
  expect(prefDepuisInterrupteur(true)).toBe("always");
  expect(prefDepuisInterrupteur(false)).toBe("never");
});
