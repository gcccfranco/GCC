import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL } from "./helpers/fakeSession";
import { estMusicien } from "../src/lib/access";
import type { ProfilOrganigramme } from "../src/lib/acces/organigramme";

// EM-1 (docs/spec-espace-musiciens.md, Q1) : qui est musicien. Fonction pure, profils et services fictifs.

const VIDE: ProfilOrganigramme = {};
const membre = { email: "membre@example.com" };

test.describe("estMusicien", () => {
  test("pianiste par l'organigramme", () => {
    expect(estMusicien(membre, { joue: ["piano"] }, [])).toBe(true);
  });

  test("bassiste par l'organigramme seul, aucun service", () => {
    expect(estMusicien(membre, { joue: ["basse"] }, [])).toBe(true);
  });

  test("membre de la sous-équipe musiciens sans `joue`", () => {
    expect(estMusicien(membre, { sousEquipes: ["musiciens"] }, [])).toBe(true);
  });

  test("batteur par le planning seul", () => {
    expect(estMusicien(membre, VIDE, [{ role: "Batterie" }])).toBe(true);
  });

  for (const role of ["Cajon/Batterie", "Cajon", "Percussion", "Musicien", "Piano", "Guitare"]) {
    test(`rôle de planning « ${role} »`, () => {
      expect(estMusicien(membre, VIDE, [{ role }])).toBe(true);
    });
  }

  test("choriste : faux", () => {
    expect(estMusicien(membre, { sousEquipes: ["choristes"] }, [{ role: "Choriste" }])).toBe(false);
  });

  test("présidence : faux", () => {
    expect(estMusicien(membre, VIDE, [{ role: "Présidence" }])).toBe(false);
  });

  test("profil null sans service : faux", () => {
    expect(estMusicien(membre, null, [])).toBe(false);
    expect(estMusicien(null, null, [])).toBe(false);
  });

  test("admin : vrai", () => {
    expect(estMusicien({ email: ADMIN_EMAIL }, null, [])).toBe(true);
  });
});
