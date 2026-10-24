import { expect, test } from "@playwright/test";
import { isFirstSundayOfMonth } from "../src/lib/planning/utils";
import { fetchSheet, lecturesSheet, parseCSV, reinitialiserLecturesSheet } from "../src/lib/planning/sheets";
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
