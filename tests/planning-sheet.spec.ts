import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { isFirstSundayOfMonth } from "../src/lib/planning/utils";
import { copiesServiesSheet, enTeteAttendu, fetchSheet, lecturesSheet, parseCSV, reinitialiserLecturesSheet } from "../src/lib/planning/sheets";
import { bilanLectures, lireAvecRelecture, messageOngletsIllisibles } from "../src/lib/planning/relecture";
import { ajouterAuxRappels } from "../src/lib/push/reminderMessage";
import type { ReminderService } from "../src/lib/push/reminderMessage";

// Tranche A4 (docs/spec-corrections-audit.md) : le planning lu dans le Google Sheet. Tests serveur, prénoms inventés.

test.describe("parseCSV", () => {
  test("une cellule sur deux lignes garde la ligne entière et ses colonnes de droite", () => {
    const csv = '"04/10/2026","Viviane","Pasteur Alba\n(à confirmer)","Hewei","Karémy"\n"11/10/2026","Odon","Lise","Noé","Ana"';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["04/10/2026", "Viviane", "Pasteur Alba (à confirmer)", "Hewei", "Karémy"]);
    expect(rows[1][4]).toBe("Ana");
  });

  test("guillemets doublés, virgules entre guillemets et \\r\\n", () => {
    const rows = parseCSV('a,"b, c","d ""e"""\r\n\r\n x , y \r\n');
    expect(rows).toEqual([["a", "b, c", 'd "e"'], ["x", "y"]]);
  });

  test("une cellule multiligne en fin de fichier avec \\r\\n", () => {
    expect(parseCSV('"1","a\r\nb","3"\r\n"2","c","4"')).toEqual([["1", "a b", "3"], ["2", "c", "4"]]);
  });
});

test.describe("fetchSheet", () => {
  const vraiFetch = globalThis.fetch;
  const vraiNow = Date.now;
  let maintenant = 0;
  test.beforeEach(() => { maintenant = vraiNow(); Date.now = () => maintenant; reinitialiserLecturesSheet(); });
  test.afterEach(() => { globalThis.fetch = vraiFetch; Date.now = vraiNow; });

  const reponse = (corps: string, init: ResponseInit = {}) => () => Promise.resolve(new Response(corps, init));
  /** Lit une fois (copie bonne), laisse expirer le cache de 5 min, puis lit avec `panne`. */
  async function apresPanne(onglet: string, panne: typeof fetch) {
    globalThis.fetch = reponse("a,b\n1,2", { headers: { "content-type": "text/csv" } }) as typeof fetch;
    expect(await fetchSheet(onglet)).toEqual([["a", "b"], ["1", "2"]]);
    maintenant += 6 * 60_000;
    globalThis.fetch = panne;
    return fetchSheet(onglet);
  }

  test("503 : la copie précédente est gardée et l'échec compté", async () => {
    expect(await apresPanne("t-503", reponse("Service Unavailable", { status: 503 }) as typeof fetch)).toEqual([["a", "b"], ["1", "2"]]);
    expect(lecturesSheet().echecs).toEqual(["t-503"]);
  });

  test("page HTML en 200 : copie gardée", async () => {
    const html = reponse("<!DOCTYPE html><html></html>", { headers: { "content-type": "text/html" } });
    expect(await apresPanne("t-html", html as typeof fetch)).toEqual([["a", "b"], ["1", "2"]]);
    expect(lecturesSheet().echecs).toEqual(["t-html"]);
  });

  test("HTML sans Content-Type : reconnu au premier caractère", async () => {
    const html = () => Promise.resolve(new Response("  <html>connexion</html>", { headers: { "content-type": "text/plain" } }));
    expect(await apresPanne("t-html2", html as typeof fetch)).toEqual([["a", "b"], ["1", "2"]]);
  });

  test("délai dépassé (AbortError) : copie gardée", async () => {
    const abandon = () => Promise.reject(new DOMException("The operation was aborted", "AbortError"));
    expect(await apresPanne("t-delai", abandon as typeof fetch)).toEqual([["a", "b"], ["1", "2"]]);
    expect(lecturesSheet().echecs).toEqual(["t-delai"]);
  });

  test("échec sans copie : vide, compté ; un signal de délai est passé", async () => {
    let signal: AbortSignal | null | undefined;
    globalThis.fetch = ((_u: unknown, init?: RequestInit) => { signal = init?.signal; return Promise.resolve(new Response("", { status: 429 })); }) as typeof fetch;
    expect(await fetchSheet("t-vide")).toEqual([]);
    expect(signal).toBeTruthy();
    expect(lecturesSheet()).toEqual({ tentatives: 1, echecs: ["t-vide"] });
  });
});

test.describe("fetchSheet : copie resservie et onglet renommé (A2 ter)", () => {
  const vraiFetch = globalThis.fetch;
  const vraiNow = Date.now;
  let maintenant = 0;
  test.beforeEach(() => { maintenant = vraiNow(); Date.now = () => maintenant; reinitialiserLecturesSheet(); });
  test.afterEach(() => { globalThis.fetch = vraiFetch; Date.now = vraiNow; });
  const csv = (corps: string) => () => Promise.resolve(new Response(corps, { headers: { "content-type": "text/csv" } }));

  test("une copie resservie après un échec fait avancer le compteur lu par useSheet (bandeau « périmé »)", async () => {
    globalThis.fetch = csv("a,b\n1,2") as typeof fetch;
    const avant = copiesServiesSheet();
    expect(await fetchSheet("t-copie")).toEqual([["a", "b"], ["1", "2"]]);
    expect(copiesServiesSheet()).toBe(avant);
    maintenant += 6 * 60_000;
    globalThis.fetch = (() => Promise.resolve(new Response("", { status: 503 }))) as typeof fetch;
    expect(await fetchSheet("t-copie")).toEqual([["a", "b"], ["1", "2"]]);
    expect(copiesServiesSheet()).toBe(avant + 1);
    // Sans copie : vide, pas de copie servie.
    expect(await fetchSheet("t-sans-copie")).toEqual([]);
    expect(copiesServiesSheet()).toBe(avant + 1);
  });

  test("l'en-tête attendu : un CSV d'un autre onglet (le premier du classeur) compte pour un échec, la copie reste", async () => {
    const campus = "DATE,MOMENT,PRESIDENT\n04/10/2026,Matin,Ana";
    const culte = "2026 DATE,Présidence,Choristes,,Pianiste\n04/10/2026,Ana,Bo,Cy,Di";
    globalThis.fetch = csv(campus) as typeof fetch;
    expect(await fetchSheet("Campus_Louange")).toEqual([["DATE", "MOMENT", "PRESIDENT"], ["04/10/2026", "Matin", "Ana"]]);
    maintenant += 6 * 60_000;
    globalThis.fetch = csv(culte) as typeof fetch;
    expect(await fetchSheet("Campus_Louange")).toEqual([["DATE", "MOMENT", "PRESIDENT"], ["04/10/2026", "Matin", "Ana"]]);
    expect(lecturesSheet().echecs).toEqual(["Campus_Louange"]);
  });

  test("enTeteAttendu : repère par onglet, accents et casse ignorés ; onglet sans repère ou CSV vide : accepté", () => {
    const culte = [["2026 DATE", "Présidence", "Choristes"], ["04/10/2026", "Ana"]];
    expect(enTeteAttendu("Franco_Louange", culte)).toBe(true);
    expect(enTeteAttendu("Intergroupe", culte)).toBe(true);
    expect(enTeteAttendu("EDD", culte)).toBe(false);
    expect(enTeteAttendu("EDD", [["DATE", "PRESIDENCE", "SUPPLÉANT", "PIANO"]])).toBe(true);
    expect(enTeteAttendu("Franco_Table_PtD", culte)).toBe(true);
    expect(enTeteAttendu("Paix _T2", [["", "", "Titre"], ["DATE", "PRÉSIDENCE", "MUSICIENS"]])).toBe(true);
    expect(enTeteAttendu("Paix_T1", culte)).toBe(false);
    expect(enTeteAttendu("Campus_Louange", [])).toBe(true);
  });
});

test.describe("cron : onglets ratés relus une fois (A2 ter)", () => {
  const vraiFetch = globalThis.fetch;
  test.beforeEach(() => reinitialiserLecturesSheet());
  test.afterEach(() => { globalThis.fetch = vraiFetch; });

  /** `etats[onglet]` : statuts successifs rendus pour cet onglet (le dernier se répète). */
  function simuler(etats: Record<string, number[]>) {
    const appels: Record<string, number> = {};
    globalThis.fetch = ((url: string) => {
      const onglet = decodeURIComponent(String(url).split("sheet=")[1]);
      const n = (appels[onglet] = (appels[onglet] ?? 0) + 1);
      const liste = etats[onglet];
      const statut = liste[Math.min(n, liste.length) - 1];
      return Promise.resolve(statut === 200 ? new Response(`${onglet},ok`, { headers: { "content-type": "text/csv" } }) : new Response("", { status: statut }));
    }) as typeof fetch;
    return appels;
  }
  const charger = (noms: string[]) => () => Promise.all(noms.map((n) => fetchSheet(n)));

  test("un onglet en 429 puis OK à la relecture : ok:true, relu, rechargé, aucun admin prévenu", async () => {
    const appels = simuler({ "c-a": [200], "c-b": [429, 200] });
    const messages: unknown[] = [];
    const r = await lireAvecRelecture(charger(["c-a", "c-b"]), { pauseMs: 0, prevenir: async (m) => { messages.push(m); } });
    expect(r).toMatchObject({ ok: true, status: 200, ratees: [] });
    expect(r.data[1]).toEqual([["c-b", "ok"]]);
    expect(appels["c-b"]).toBe(2);
    expect(messages).toEqual([]);
  });

  test("toujours 429 : ok:false (200), notification aux admins avec le nombre et les noms", async () => {
    const appels = simuler({ "d-a": [200], "d-b": [429] });
    const messages: { body: string }[] = [];
    const avant = console.error;
    console.error = () => {};
    let r;
    try {
      r = await lireAvecRelecture(charger(["d-a", "d-b"]), { pauseMs: 0, prevenir: async (m) => { messages.push(m); } });
    } finally {
      console.error = avant;
    }
    expect(r).toMatchObject({ ok: false, status: 200, ratees: ["d-b"] });
    expect(appels["d-b"]).toBe(2);
    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe("Rappels du matin : 1 onglet du planning illisible (d-b)");
  });

  test("toutes les lectures ratées : 500 comme avant ; la notification dit « 2 onglets … illisibles »", async () => {
    simuler({ "e-a": [500], "e-b": [429] });
    const messages: { body: string }[] = [];
    const avant = console.error;
    console.error = () => {};
    let r;
    try {
      r = await lireAvecRelecture(charger(["e-a", "e-b"]), { pauseMs: 0, prevenir: async (m) => { messages.push(m); } });
    } finally {
      console.error = avant;
    }
    expect(r).toMatchObject({ ok: false, status: 500, ratees: ["e-a", "e-b"] });
    expect(messages[0].body).toBe("Rappels du matin : 2 onglets du planning illisibles (e-a, e-b)");
  });

  test("bilanLectures : une relecture qui récupère un onglet évite le 500 ; une notification qui échoue ne casse pas le passage", async () => {
    expect(bilanLectures({ tentatives: 2, echecs: ["a", "b"] }, ["b"])).toEqual({ ok: false, status: 200, ratees: ["b"] });
    expect(bilanLectures({ tentatives: 2, echecs: [] }, [])).toEqual({ ok: true, status: 200, ratees: [] });
    expect(messageOngletsIllisibles(["x"]).title).toBe("Rappels du matin");
    simuler({ "f-a": [429] });
    const avant = console.error;
    console.error = () => {};
    try {
      const r = await lireAvecRelecture(charger(["f-a"]), { pauseMs: 0, prevenir: async () => { throw new Error("push en panne"); } });
      expect(r.ok).toBe(false);
    } finally {
      console.error = avant;
    }
  });

  test("le cron appelle lireAvecRelecture et répond avec son statut", () => {
    const source = readFileSync("src/app/api/cron/reminders/route.ts", "utf8");
    expect(source).toContain("lireAvecRelecture(");
    expect(source).toContain("status: lecture.status");
  });
});

test("badge Sainte cène : le 1er au 7 vrai, le 8 faux, sans les autres lignes ni l'année", () => {
  for (const j of ["01", "02", "07"]) expect(isFirstSundayOfMonth(`2026-11-${j}`, [])).toBe(true);
  expect(isFirstSundayOfMonth("2026-11-08", [["2026-11-01"]])).toBe(false);
  expect(isFirstSundayOfMonth("2027-01-03", [["2026-01-04"], ["2027-01-03"]])).toBe(true);
  expect(isFirstSundayOfMonth("2027-01-31", [["2027-01-31"]])).toBe(false);
});

test("rappels : ajouter l'entraînement sur scène ne change pas la liste partagée entre deux comptes", () => {
  const partagee: ReminderService[] = [{ service: "Culte Franco", roles: ["Piano"] }];
  const parUid = new Map<string, ReminderService[]>([["uid-a", partagee], ["uid-b", partagee]]);
  ajouterAuxRappels(parUid, "uid-a", { service: "Entraînement", roles: [] });
  ajouterAuxRappels(parUid, "uid-c", { service: "Entraînement", roles: [] });
  expect(parUid.get("uid-a")).toHaveLength(2);
  expect(parUid.get("uid-b")).toBe(partagee);
  expect(partagee).toHaveLength(1);
  expect(parUid.get("uid-c")).toHaveLength(1);
});

// A2 ter : un onglet introuvable fait rendre à gviz le premier onglet du classeur, le calendrier des réunions.
test("enTeteAttendu : le calendrier des réunions (premier onglet) n'est jamais un planning", () => {
  const calendrier = [["CALENDRIER DES RÉUNIONS STAFF — Grace Church", "HEURE", "TYPE"], ["01/11/2026", "10:00", "Réunion"]];
  expect(enTeteAttendu("Franco_Louange", calendrier)).toBe(false);
  expect(enTeteAttendu("Interfranco", calendrier)).toBe(false);
  expect(enTeteAttendu("Interfranco", [["INTERFRANCO", "Présidence", "Choristes"]])).toBe(true);
});
