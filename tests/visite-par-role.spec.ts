import { expect, test } from "@playwright/test";
import { cartesDeLaVisite, type Carte } from "../src/lib/onboarding/visite";
import { ADMIN_EMAIL } from "./helpers/fakeSession";

// Visite de première connexion selon le rôle (docs/spec-visite-par-role.md). Profils fictifs.

const MOI = { uid: "uid-visite", email: "visite@example.com" };
const ADMIN = { uid: "uid-admin", email: ADMIN_EMAIL };
const kinds = (cartes: Carte[]) => cartes.map((c) => c.kind);

// ── 1. Composition (pur) ────────────────────────────────────────────────────

test.describe("cartesDeLaVisite", () => {
  test("présidence + choriste : une carte service, la plus haute, l'autre en « aussi »", () => {
    const cartes = cartesDeLaVisite(MOI, { sousEquipes: ["choristes", "presidence"], lieuxLouange: ["Culte Francophone"] }, true);
    expect(cartes).toEqual([{ kind: "service", role: "presidence", lieux: ["Culte Francophone"], aussi: ["chanteur"] }]);
  });

  test("back-office coupé : le rôle vient de serviceRoles, les lieux où il figure", () => {
    const cartes = cartesDeLaVisite(MOI, { serviceRoles: { Campus: ["chanteur"], "Culte Francophone": ["presidence", "chanteur"] } }, false);
    expect(cartes).toEqual([{ kind: "service", role: "presidence", lieux: ["Culte Francophone"], aussi: ["chanteur"] }]);
  });

  test("musicien seul, sans équipe : la carte service seule", () => {
    expect(kinds(cartesDeLaVisite(MOI, { sousEquipes: ["musiciens"], lieuxLouange: ["Campus"] }, true))).toEqual(["service"]);
  });

  test("membre de deux équipes, référent d'une : une carte équipe, version référent", () => {
    const cartes = cartesDeLaVisite(MOI, { dansEquipes: ["regie", "medias"], referentDe: ["medias"] }, true);
    expect(cartes.filter((c) => c.kind === "equipe")).toEqual([{ kind: "equipe", equipes: ["medias", "regie"], referentDe: ["medias"] }]);
  });

  test("rôle de service seul (Louange élargi) : pas de carte équipe", () => {
    expect(kinds(cartesDeLaVisite(MOI, { serviceRoles: { "Culte Francophone": ["musicien"] } }, true))).toEqual(["membre"]);
    expect(kinds(cartesDeLaVisite(MOI, { serviceRoles: { "Culte Francophone": ["musicien"] } }, false))).toEqual(["service"]);
  });

  test("TEAM LOUANGE (dansEquipes ∋ louange) : une carte équipe", () => {
    const cartes = cartesDeLaVisite(MOI, { dansEquipes: ["louange"], sousEquipes: ["choristes"], lieuxLouange: ["Culte Francophone"] }, true);
    expect(kinds(cartes)).toEqual(["service", "equipe"]);
  });

  test("coordination + planning + notifier : une carte, trois lignes dans l'ordre", () => {
    // Membre d'Orga : coordination, la Table, toute l'Église.
    const cartes = cartesDeLaVisite(MOI, { dansEquipes: ["orga"] }, true);
    const resp = cartes.find((c) => c.kind === "responsabilites");
    expect(resp).toEqual({
      kind: "responsabilites",
      lignes: [{ kind: "coordination" }, { kind: "planning", plannings: ["table"] }, { kind: "messages", audiences: ["*"] }],
    });
  });

  test("cinq droits : quatre lignes au plus", () => {
    // Référent Louange (coordination, plannings du culte, notifier, évènements du Culte) et président de Paix.
    const cartes = cartesDeLaVisite(MOI, { dansEquipes: ["louange"], referentDe: ["louange", "comite-paix"] }, true);
    const resp = cartes.find((c) => c.kind === "responsabilites");
    expect(resp && resp.kind === "responsabilites" && resp.lignes.map((l) => l.kind)).toEqual(["coordination", "groupe", "planning", "messages"]);
  });

  test("admin : jamais de responsabilités", () => {
    expect(kinds(cartesDeLaVisite(ADMIN, { dansEquipes: ["orga"] }, true))).toEqual(["equipe"]);
    expect(kinds(cartesDeLaVisite(ADMIN, {}, true))).toEqual(["membre"]);
  });

  test("rien : la carte membre", () => {
    expect(cartesDeLaVisite(MOI, {}, true)).toEqual([{ kind: "membre" }]);
  });

  test("back-office coupé : ni équipe ni responsabilités", () => {
    const profil = { serviceRoles: { Campus: ["regie" as const] }, dansEquipes: ["orga"], referentDe: ["medias"] };
    expect(kinds(cartesDeLaVisite(MOI, profil, false))).toEqual(["service"]);
    expect(kinds(cartesDeLaVisite(MOI, { dansEquipes: ["orga"] }, false))).toEqual(["membre"]);
  });
});
