import { expect, test } from "@playwright/test";
import { SALLES, lieuxLies } from "../src/lib/salles/salles";
import { occupationsFixes, varianteDu } from "../src/lib/salles/emploi";
import { croise, etatA, etatEnMots, jourJDu, nomOccupant, occupationsDe, occupationsDu, type Occupation, type SourcesSalles } from "../src/lib/salles/occupations";
import type { Reservation } from "../src/lib/firebase/reservations";
import type { Programme } from "../src/types/programme";

// Salles, lot 2, tranche T2a (docs/spec-salles.md, § Modèle, SA1, SA2, SA13, AR6, AR7, AR13, AR14) : le modèle et les
// fonctions pures, sans écran. Aucun nom réel : auteurs inventés pour ces tests.

const DIMANCHE = "2026-11-22";
const SAMEDI = "2026-11-21";
const NOEL = "2026-12-25";

const plages = (o: Occupation[]) => o.map((x) => `${x.debut}-${x.fin}`);
const fixes = (date: string, variante: Parameters<typeof occupationsFixes>[1], salle: string) =>
  occupationsFixes(date, variante).filter((o) => o.salle === salle);
const tempsDeGroupe = (date: string, variante: Parameters<typeof occupationsFixes>[1], salle: string) =>
  fixes(date, variante, salle).filter((o) => o.debut === "13:00").map((o) => nomOccupant(o, "fr"));

const programme = (x: Partial<Programme> = {}): Programme => ({
  id: "noel-2026", nom: "Noël", jourJ: NOEL, debut: "2026-11-01", passages: [], createdBy: "u", updatedAt: "", fete: "noel", annee: 2026, ...x,
});
/** Un créneau de scène : depuis le lot 5 (AR20), une réservation de la Scène qui porte `fete`. */
const creneau = (x: Partial<Reservation>): Reservation => ({
  id: "c1", salle: "scene", fete: "noel-2026", date: DIMANCHE, debut: "17:00", fin: "18:00", pour: "Gp Paix", quoi: "Danse", qui: ["Gp Paix"], note: "",
  auteurUid: "u-ysolde", auteurNom: "Ysolde", createdAt: "", updatedAt: "", ...x,
});
const sources = (x: Partial<SourcesSalles> = {}): SourcesSalles => ({ services: [], scene: [], ...x });

test.describe("Salles (T2a) : le modèle", () => {
  test("neuf salles dans l'ordre de l'écran, groupées, avec leur autre nom", () => {
    expect(SALLES.map((s) => s.id)).toEqual(["grande", "scene", "fidelite", "paix", "amour", "bonte", "zhongban", "imprimante", "reunion"]);
    expect(SALLES.map((s) => s.groupe)).toEqual(["grande", "grande", "groupe", "groupe", "groupe", "groupe", "groupe", "bureaux", "bureaux"]);
    const autre = Object.fromEntries(SALLES.map((s) => [s.id, s.autreNom ?? ""]));
    expect(autre).toMatchObject({ fidelite: "小班", paix: "高班", amour: "大班", bonte: "", zhongban: "", imprimante: "", reunion: "" });
    expect(SALLES.find((s) => s.id === "scene")).toMatchObject({ nom: "Scène", dans: "grande" });
    expect(SALLES.find((s) => s.id === "zhongban")?.nom).toBe("Salle 中班");
  });

  test("Scène et Grande salle sont liées ; toute autre salle n'est liée qu'à elle-même (AR6)", () => {
    expect(lieuxLies("grande").sort()).toEqual(["grande", "scene"]);
    expect(lieuxLies("scene").sort()).toEqual(["grande", "scene"]);
    expect(lieuxLies("bonte")).toEqual(["bonte"]);
    expect(lieuxLies("imprimante")).toEqual(["imprimante"]);
  });

  test("variante d'après les services du planning du jour", () => {
    expect(varianteDu(DIMANCHE, [])).toBe("ordinaire");
    expect(varianteDu(DIMANCHE, [{ date: DIMANCHE, service: "Culte Franco" }])).toBe("ordinaire");
    expect(varianteDu(DIMANCHE, [{ date: DIMANCHE, service: "Intergroupe" }])).toBe("intergroupe");
    expect(varianteDu(DIMANCHE, [{ date: DIMANCHE, service: "Interfranco" }])).toBe("interfranco");
    // Un service d'un autre jour ne compte pas.
    expect(varianteDu(DIMANCHE, [{ date: "2026-11-29", service: "Intergroupe" }])).toBe("ordinaire");
  });

  test("dimanche ordinaire : l'emploi du temps fixe (AR7)", () => {
    expect(plages(fixes(DIMANCHE, "ordinaire", "grande"))).toEqual(["08:30-10:30", "10:30-12:00", "13:00-14:30", "15:00-17:00"]);
    expect(fixes(DIMANCHE, "ordinaire", "grande").map((o) => nomOccupant(o, "fr")))
      .toEqual(["Entraînement louange", "Culte Francophone", "Groupe Joie", "Culte sinophone"]);
    expect(plages(fixes(DIMANCHE, "ordinaire", "fidelite"))).toEqual(["13:00-14:30", "15:30-17:00"]);
    expect(nomOccupant(fixes(DIMANCHE, "ordinaire", "fidelite")[1], "fr")).toBe("小班");
    expect(nomOccupant(fixes(DIMANCHE, "ordinaire", "paix")[1], "fr")).toBe("高班");
    expect(nomOccupant(fixes(DIMANCHE, "ordinaire", "amour")[1], "fr")).toBe("大班");
    expect(plages(fixes(DIMANCHE, "ordinaire", "bonte"))).toEqual(["13:00-14:30"]);
    expect(plages(fixes(DIMANCHE, "ordinaire", "zhongban"))).toEqual(["15:30-17:00"]);
    expect(plages(fixes(DIMANCHE, "ordinaire", "imprimante"))).toEqual(["12:20-12:40"]);
    expect(fixes(DIMANCHE, "ordinaire", "reunion")).toEqual([]);
    expect(fixes(DIMANCHE, "ordinaire", "scene")).toEqual([]);
    expect(fixes(DIMANCHE, "ordinaire", "grande").every((o) => o.source === "fixe")).toBe(true);
  });

  test("aucun autre jour que le dimanche n'a d'emploi du temps fixe", () => {
    expect(occupationsFixes(SAMEDI, "ordinaire")).toEqual([]);
    expect(occupationsFixes("2026-11-23", "intergroupe")).toEqual([]);
  });

  test("le temps de groupe (13:00–14:30) selon le dimanche", () => {
    // Dimanche ordinaire : les quatre salles de groupe occupées, groupe Joie dans la Grande salle.
    expect(tempsDeGroupe(DIMANCHE, "ordinaire", "fidelite")).toHaveLength(1);
    expect(tempsDeGroupe(DIMANCHE, "ordinaire", "bonte")).toHaveLength(1);
    expect(tempsDeGroupe(DIMANCHE, "ordinaire", "paix")).toHaveLength(1);
    expect(tempsDeGroupe(DIMANCHE, "ordinaire", "amour")).toHaveLength(1);
    expect(tempsDeGroupe(DIMANCHE, "ordinaire", "grande")).toEqual(["Groupe Joie"]);
    // Intergroupe : salles de groupe libres, les cinq groupes dans la Grande salle.
    for (const s of ["fidelite", "bonte", "paix", "amour"]) expect(tempsDeGroupe(DIMANCHE, "intergroupe", s)).toEqual([]);
    expect(tempsDeGroupe(DIMANCHE, "intergroupe", "grande")).toEqual(["Intergroupe"]);
    // Interfranco : Fidélité au groupe Joie, Amour au groupe Amour, Bonté et Paix libres, Interfranco dans la Grande salle.
    expect(tempsDeGroupe(DIMANCHE, "interfranco", "fidelite")).toEqual(["Groupe Joie"]);
    expect(tempsDeGroupe(DIMANCHE, "interfranco", "amour")).toEqual(["Groupe Amour"]);
    expect(tempsDeGroupe(DIMANCHE, "interfranco", "bonte")).toEqual([]);
    expect(tempsDeGroupe(DIMANCHE, "interfranco", "paix")).toEqual([]);
    expect(tempsDeGroupe(DIMANCHE, "interfranco", "grande")).toEqual(["Interfranco"]);
    // Le reste de la journée ne change pas.
    expect(plages(fixes(DIMANCHE, "intergroupe", "grande"))).toEqual(["08:30-10:30", "10:30-12:00", "13:00-14:30", "15:00-17:00"]);
    expect(plages(fixes(DIMANCHE, "interfranco", "fidelite"))).toEqual(["13:00-14:30", "15:30-17:00"]);
  });

  test("occupationsDu lit la variante d'après les services", () => {
    const o = occupationsDu(DIMANCHE, sources({ services: [{ date: DIMANCHE, service: "Intergroupe" }] }));
    expect(o.filter((x) => x.salle === "bonte")).toEqual([]);
    expect(o.filter((x) => x.salle === "grande" && x.debut === "13:00").map((x) => nomOccupant(x, "fr"))).toEqual(["Intergroupe"]);
  });

  test("jour J d'une fête : Grande salle et Scène occupées toute la journée, l'emploi fixe de la Grande salle remplacé (AR14)", () => {
    const dimancheNoel = "2026-12-27";
    const p = programme({ jourJ: dimancheNoel });
    const o = occupationsDu(dimancheNoel, sources({ scene: [{ programme: p }] }));
    const grande = occupationsDe(o, "grande");
    expect(grande).toHaveLength(1);
    expect(grande[0]).toMatchObject({ source: "fete", debut: "00:00", fin: "24:00" });
    expect(nomOccupant(grande[0], "fr")).toBe("Noël, jour J");
    expect(nomOccupant(grande[0], "zh")).toBe("圣诞节当天");
    expect(occupationsDe(o, "scene")).toEqual(grande);
    // Les autres salles gardent leur emploi du temps.
    expect(plages(occupationsDe(o, "fidelite"))).toEqual(["13:00-14:30", "15:30-17:00"]);
    expect(jourJDu(dimancheNoel, [{ programme: p }])).toBe("noel");
    expect(jourJDu(DIMANCHE, [{ programme: p }])).toBeNull();
    // Un brouillon n'est jamais affiché.
    const brouillon = occupationsDu(dimancheNoel, sources({ scene: [{ programme: { ...p, ouvert: false } }] }));
    expect(occupationsDe(brouillon, "grande").map((x) => x.source)).toEqual(["fixe", "fixe", "fixe", "fixe"]);
  });

  test("un créneau de scène occupe la Scène et la Grande salle, en lecture seule (SA13)", () => {
    const c = creneau({ debut: "14:00", fin: "15:00" });
    const o = occupationsDu(DIMANCHE, sources({ scene: [{ programme: programme() }], reservations: [c, creneau({ id: "c2", date: "2026-11-29" })] }));
    const scene = o.filter((x) => x.source === "scene");
    expect(scene).toHaveLength(1);
    expect(scene[0]).toMatchObject({ salle: "scene", debut: "14:00", fin: "15:00", id: "c1", auteurNom: "Ysolde", lien: "/evenements/scene/noel" });
    expect(nomOccupant(scene[0], "fr")).toBe("Danse · Gp Paix");
    expect(nomOccupant(scene[0], "zh")).toBe("Danse · 和平团契");
    expect(occupationsDe(o, "grande")).toContainEqual(scene[0]);
    // Le créneau croise le groupe Joie : Salles le montre tel quel.
    expect(occupationsDe(o, "grande").filter((x) => croise(x, scene[0])).map((x) => nomOccupant(x, "fr")))
      .toEqual(["Groupe Joie", "Danse · Gp Paix"]);
    // Les créneaux d'un brouillon ne comptent pas.
    const b = occupationsDu(DIMANCHE, sources({ scene: [{ programme: programme({ ouvert: false }) }], reservations: [c] }));
    expect(b.filter((x) => x.source === "scene")).toEqual([]);
  });

  test("occupations triées par heure de début", () => {
    const o = occupationsDu(DIMANCHE, sources());
    const debuts = o.map((x) => x.debut);
    expect(debuts).toEqual([...debuts].sort());
  });

  test("deux bornes qui se touchent ne se croisent pas (14:30 / 14:30)", () => {
    expect(croise({ debut: "13:00", fin: "14:30" }, { debut: "14:30", fin: "15:00" })).toBe(false);
    expect(croise({ debut: "14:30", fin: "15:00" }, { debut: "13:00", fin: "14:30" })).toBe(false);
    expect(croise({ debut: "13:00", fin: "14:31" }, { debut: "14:30", fin: "15:00" })).toBe(true);
    expect(croise({ debut: "13:00", fin: "17:00" }, { debut: "14:00", fin: "15:00" })).toBe(true);
  });

  test("état en mots à une heure donnée (SA2)", () => {
    const o = occupationsDu(DIMANCHE, sources());
    // 14:00 un dimanche ordinaire : Bonté occupée par son groupe, Grande salle par le groupe Joie.
    expect(etatA(o, "grande", "14:00")).toMatchObject({ type: "occupe", jusqua: "14:30" });
    expect(etatEnMots(etatA(o, "grande", "14:00"), "fr")).toBe("Groupe Joie jusqu'à 14:30");
    expect(etatEnMots(etatA(o, "grande", "14:00"), "zh")).toBe("喜乐团契，至 14:30");
    // 14:30 : le groupe Joie finit à 14:30, la Grande salle est libre jusqu'au culte sinophone.
    expect(etatEnMots(etatA(o, "grande", "14:30"), "fr")).toBe("Libre jusqu'à 15:00");
    expect(etatEnMots(etatA(o, "grande", "14:30"), "zh")).toBe("空闲至 15:00");
    // Bonté après 14:30 : rien jusqu'à 22:00.
    expect(etatEnMots(etatA(o, "bonte", "14:30"), "fr")).toBe("Libre tout l'après-midi");
    expect(etatEnMots(etatA(o, "bonte", "18:00"), "fr")).toBe("Libre toute la soirée");
    expect(etatEnMots(etatA(o, "bonte", "18:00"), "zh")).toBe("晚上空闲");
    expect(etatEnMots(etatA(o, "reunion", "08:00"), "fr")).toBe("Libre toute la journée");
    expect(etatEnMots(etatA(o, "reunion", "14:00"), "zh")).toBe("下午空闲");
    // Une occupation qui commence après 22:00 ne compte pas.
    const tard: Occupation[] = [{ ...o.find((x) => x.salle === "bonte")!, debut: "22:30", fin: "23:00" }];
    expect(etatEnMots(etatA(tard, "bonte", "19:00"), "fr")).toBe("Libre toute la soirée");
  });

  test("état de la Scène quand la Grande salle l'occupe (« Avec la Grande salle »)", () => {
    const o = occupationsDu(DIMANCHE, sources());
    const e = etatA(o, "scene", "15:30");
    expect(e).toMatchObject({ type: "occupe", jusqua: "17:00", avecGrande: true });
    expect(etatEnMots(e, "fr")).toBe("Avec la Grande salle : Culte sinophone jusqu'à 17:00");
    expect(etatEnMots(e, "zh")).toBe("与大厅同用：中文崇拜，至 17:00");
    expect(etatA(o, "grande", "15:30")).toMatchObject({ avecGrande: false });
    // Un créneau de scène vu depuis la Scène elle-même : pas « Avec la Grande salle ».
    const s = occupationsDu(DIMANCHE, sources({ scene: [{ programme: programme() }], reservations: [creneau({})] }));
    expect(etatEnMots(etatA(s, "scene", "17:30"), "fr")).toBe("Danse · Gp Paix jusqu'à 18:00");
    expect(etatEnMots(etatA(s, "grande", "17:30"), "fr")).toBe("Danse · Gp Paix jusqu'à 18:00");
  });

  test("jour J : l'état dit la fête sans heure de fin", () => {
    const p = programme({ jourJ: NOEL });
    const o = occupationsDu(NOEL, sources({ scene: [{ programme: p }] }));
    expect(etatEnMots(etatA(o, "grande", "08:00"), "fr")).toBe("Noël, jour J");
    expect(etatEnMots(etatA(o, "scene", "20:00"), "fr")).toBe("Avec la Grande salle : Noël, jour J");
    expect(etatEnMots(etatA(o, "bonte", "08:00"), "fr")).toBe("Libre toute la journée");
  });
});
