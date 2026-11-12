import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { canEcrirePartition, canLirePartition } from "../src/lib/access";
import { signInAs } from "./helpers/fakeSession";

// Ma partition, tranche MP-1 (docs/spec-ma-partition.md, « Rangement ») : droits, module REST, enregistrement fiable.
// Pas d'agencement : trois appareils, pas dans SPECS_GRAND_ECRAN. Noms fictifs. Les règles Firestore ne tournent pas
// ici (pas d'émulateur) : on lit leur texte. Dans la page, les fonctions sont atteintes par `window.__gccPartitions`
// (src/lib/firebase/auth.ts, hors production).

const regles = readFileSync(path.resolve(__dirname, "..", "firestore.rules"), "utf8");

function bloc(debut: string): string {
  const i = regles.indexOf(debut);
  expect(i, `${debut} absent de firestore.rules`).toBeGreaterThan(-1);
  const ouvrante = regles.indexOf("{", i + debut.length - 1);
  let profondeur = 0;
  for (let k = ouvrante; k < regles.length; k++) {
    if (regles[k] === "{") profondeur++;
    if (regles[k] === "}" && --profondeur === 0) return regles.slice(i, k + 1);
  }
  throw new Error(`${debut} non fermé`);
}
const sansEspaces = (t: string) => t.replace(/\s+/g, " ");

const SOLENE = { uid: "uid-solene", email: "solene.varin@example.invalid", firstName: "Solène", lastName: "Varin" };
const ILYES = { uid: "uid-ilyes", email: "ilyes.marchal@example.invalid", firstName: "Ilyès", lastName: "Marchal" };

test.describe("Ma partition : droits et règles (sans page)", () => {
  const p = { ownerUid: SOLENE.uid, sharedWith: [ILYES.uid] };

  test("canLirePartition / canEcrirePartition : propriétaire, personne partagée, tiers, déconnecté", () => {
    expect(canLirePartition(SOLENE, p)).toBe(true);
    expect(canEcrirePartition(SOLENE, p)).toBe(true);
    expect(canLirePartition(ILYES, p)).toBe(true);
    expect(canEcrirePartition(ILYES, p)).toBe(false);
    const tiers = { uid: "uid-tiers" };
    expect(canLirePartition(tiers, p)).toBe(false);
    expect(canEcrirePartition(tiers, p)).toBe(false);
    expect(canLirePartition(null, p)).toBe(false);
    expect(canEcrirePartition(null, p)).toBe(false);
  });

  test("firestore.rules : le bloc partitions (lecture par préfixe ou sharedWith, écriture par préfixe et ownerUid)", () => {
    const b = sansEspaces(bloc("match /partitions/{id}"));
    const lecture = b.slice(b.indexOf("allow read"), b.indexOf("allow create"));
    expect(lecture).toContain("id.split('__')[0] == request.auth.uid");
    expect(lecture).toContain("request.auth.uid in resource.data.sharedWith");
    const ecriture = b.slice(b.indexOf("allow create"), b.indexOf("allow delete"));
    expect(ecriture).toContain("id.split('__')[0] == request.auth.uid");
    expect(ecriture).toContain("request.resource.data.ownerUid == request.auth.uid");
    expect(ecriture).toContain("!('sharedWith' in request.resource.data)");
    // Le document de choix est exactement {uid}__choix : un chant dont le slug finirait par « __choix » reste une partition.
    expect(ecriture).toContain("id == request.auth.uid + '__choix'");
    expect(b.slice(b.indexOf("allow delete"))).toContain("id.split('__')[0] == request.auth.uid");
    expect(regles).toContain("docs/spec-ma-partition.md");
  });

  test("firestore.rules : le bloc versions/{uid} est inchangé", () => {
    expect(sansEspaces(bloc("match /versions/{uid}"))).toBe(
      "match /versions/{uid} { allow read: if signedIn(); allow create, update: if signedIn() && request.auth.uid == uid && request.resource.data.authorUid == uid; allow delete: if signedIn() && request.auth.uid == uid; }",
    );
  });
});

type Api = {
  idPartition(uid: string, slug: string): string;
  lirePartition(uid: string, slug: string): Promise<Record<string, unknown> | null>;
  lirePartitionsPartageesAvecMoi(uid: string): Promise<Record<string, unknown>[]>;
  enregistrerOuMettreEnFile(p: unknown): Promise<string>;
  etatEnregistrement(uid: string): { etat: string; enAttente: number };
  suivreLaFile(uid: string): () => void;
  rejouerFile(uid: string): Promise<void>;
  logOut(): Promise<void>;
};
declare global { interface Window { __gccPartitions: Api } }

const partition = (ownerUid: string, ownerName: string, slug: string, sharedWith: string[] = []) => ({
  slug, ownerUid, ownerName,
  base: "{title: Hosanna}\n[C]Hosanna", content: "{title: Hosanna}\n[D]Hosanna", structure: ["c1", "r1"],
  key: "D", traits: [], sharedWith, sharedTraits: false,
});

const cleFile = (uid: string) => `gcc-partitions-en-attente:${uid}`;

async function ouvrir(page: Page, profil: typeof SOLENE, docs: Record<string, Record<string, unknown>> = {}) {
  const db = await signInAs(page, profil, docs, "/setlists");
  await page.waitForFunction(() => !!window.__gccPartitions);
  return db;
}

test.describe("Ma partition : le module dans la page", () => {
  test("écrire une partition puis la relire", async ({ page }) => {
    const db = await ouvrir(page, SOLENE);
    const p = partition(SOLENE.uid, "Solène Varin", "hosanna");
    expect(await page.evaluate((x) => window.__gccPartitions.enregistrerOuMettreEnFile(x), p)).toBe("enregistre");
    expect(db.doc(`partitions/${SOLENE.uid}__hosanna`)).toBeTruthy();
    const lue = await page.evaluate((uid) => window.__gccPartitions.lirePartition(uid, "hosanna"), SOLENE.uid);
    const { slug: _s, ...attendu } = p;
    void _s;
    expect(lue).toMatchObject(attendu);
    expect(lue?.updatedAt).toBeTruthy();
    expect(await page.evaluate((uid) => window.__gccPartitions.lirePartition(uid, "absente"), SOLENE.uid)).toBeNull();
  });

  test("lirePartitionsPartageesAvecMoi ne rend que celles où mon uid est dans sharedWith", async ({ page }) => {
    const doc = (p: ReturnType<typeof partition>) => { const { slug: _s, ...d } = p; void _s; return d; };
    await ouvrir(page, ILYES, {
      [`partitions/${SOLENE.uid}__hosanna`]: doc(partition(SOLENE.uid, "Solène Varin", "hosanna", [ILYES.uid])),
      [`partitions/${SOLENE.uid}__grace`]: doc(partition(SOLENE.uid, "Solène Varin", "grace", ["uid-tiers"])),
      [`partitions/${SOLENE.uid}__choix`]: { choices: {}, partageTout: [] },
    });
    const rendues = await page.evaluate((uid) => window.__gccPartitions.lirePartitionsPartageesAvecMoi(uid), ILYES.uid);
    expect(rendues.map((r) => r.slug)).toEqual(["hosanna"]);
  });

  test("un refus de lecture (403) fait lever lirePartition et n'écrit rien", async ({ page }) => {
    const db = await ouvrir(page, ILYES);
    await page.route(/firestore\.googleapis\.com.*partitions/, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "Missing or insufficient permissions." } }) })
        : route.fallback());
    const erreur = await page.evaluate(async (uid) => {
      try { await window.__gccPartitions.lirePartition(uid, "hosanna"); return null; } catch (e) { return (e as Error).message; }
    }, SOLENE.uid);
    expect(erreur).toContain("permissions");
    expect(db.writes.filter((w) => w.path.startsWith("partitions/"))).toEqual([]);
  });

  test("un refus d'écriture (403) remonte et ne met rien en file", async ({ page }) => {
    await ouvrir(page, SOLENE);
    await page.route(/firestore\.googleapis\.com.*partitions/, (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refus" } }) }));
    const p = partition(SOLENE.uid, "Solène Varin", "hosanna");
    const erreur = await page.evaluate(async (x) => {
      try { await window.__gccPartitions.enregistrerOuMettreEnFile(x); return null; } catch (e) { return (e as Error).message; }
    }, p);
    expect(erreur).toBe("refus");
    expect(await page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toBeNull();
  });

  test("réseau coupé : mise en file, rejeu au retour du réseau, puis effacement à la déconnexion", async ({ page }) => {
    const db = await ouvrir(page, SOLENE);
    const p = partition(SOLENE.uid, "Solène Varin", "hosanna");
    // Coupure : les appels à Firestore échouent comme un réseau absent.
    const coupure = (route: { abort(): Promise<void> }) => route.abort();
    await page.route(/firestore\.googleapis\.com.*partitions/, coupure);
    expect(await page.evaluate((x) => window.__gccPartitions.enregistrerOuMettreEnFile(x), p)).toBe("en-attente");
    expect(await page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toContain("hosanna");
    expect(await page.evaluate((uid) => window.__gccPartitions.etatEnregistrement(uid), SOLENE.uid)).toEqual({ etat: "en-attente", enAttente: 1 });
    expect(db.doc(`partitions/${SOLENE.uid}__hosanna`)).toBeUndefined();

    // Retour du réseau : la file se rejoue à l'évènement `online`.
    await page.unroute(/firestore\.googleapis\.com.*partitions/, coupure);
    await page.evaluate((uid) => { window.__gccPartitions.suivreLaFile(uid); window.dispatchEvent(new Event("online")); }, SOLENE.uid);
    await expect.poll(() => db.doc(`partitions/${SOLENE.uid}__hosanna`)).toBeTruthy();
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toBeNull();
    expect(await page.evaluate((uid) => window.__gccPartitions.etatEnregistrement(uid), SOLENE.uid)).toEqual({ etat: "enregistre", enAttente: 0 });

    // Déconnexion : la file d'un compte ne lui survit pas.
    await page.evaluate((k) => localStorage.setItem(k, "{}"), cleFile(SOLENE.uid));
    await page.evaluate(() => window.__gccPartitions.logOut());
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), cleFile(SOLENE.uid))).toBeNull();
  });

  test("un 5xx met en file ; au rejeu, une entrée refusée (403) quitte la file", async ({ page }) => {
    const db = await ouvrir(page, SOLENE);
    const p = partition(SOLENE.uid, "Solène Varin", "hosanna");
    const panne = (route: { fulfill(o: object): Promise<void> }) =>
      route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: 503, message: "indisponible" } }) });
    await page.route(/firestore\.googleapis\.com.*partitions/, panne);
    expect(await page.evaluate((x) => window.__gccPartitions.enregistrerOuMettreEnFile(x), p)).toBe("en-attente");
    await page.unroute(/firestore\.googleapis\.com.*partitions/, panne);
    // Les droits ont changé entre-temps : le rejeu est refusé, l'entrée ne passera jamais et ne reste pas « En attente ».
    await page.route(/firestore\.googleapis\.com.*partitions/, (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refus" } }) }));
    await page.evaluate((uid) => window.__gccPartitions.rejouerFile(uid), SOLENE.uid);
    expect(await page.evaluate((uid) => window.__gccPartitions.etatEnregistrement(uid), SOLENE.uid)).toEqual({ etat: "enregistre", enAttente: 0 });
    expect(db.doc(`partitions/${SOLENE.uid}__hosanna`)).toBeUndefined();
  });

  test("un rejeu lent n'écrase pas une version plus récente enregistrée pendant ce temps", async ({ page }) => {
    const db = await ouvrir(page, SOLENE);
    const v1 = { ...partition(SOLENE.uid, "Solène Varin", "hosanna"), content: "{title: Hosanna}\n[E]version un" };
    const v2 = { ...partition(SOLENE.uid, "Solène Varin", "hosanna"), content: "{title: Hosanna}\n[F]version deux" };
    const coupure = (route: { abort(): Promise<void> }) => route.abort();
    await page.route(/firestore\.googleapis\.com.*partitions/, coupure);
    expect(await page.evaluate((x) => window.__gccPartitions.enregistrerOuMettreEnFile(x), v1)).toBe("en-attente");
    await page.unroute(/firestore\.googleapis\.com.*partitions/, coupure);
    // Réseau qui traîne : chaque écriture met une seconde à revenir.
    await page.route(/firestore\.googleapis\.com.*partitions/, async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fallback();
    });
    await page.evaluate(async ([uid, x]) => {
      const rejeu = window.__gccPartitions.rejouerFile(uid as string);
      const ecriture = window.__gccPartitions.enregistrerOuMettreEnFile(x);
      await Promise.all([rejeu, ecriture]);
    }, [SOLENE.uid, v2] as const);
    expect(db.doc(`partitions/${SOLENE.uid}__hosanna`)?.content).toBe(v2.content);
    expect(await page.evaluate((uid) => window.__gccPartitions.etatEnregistrement(uid), SOLENE.uid)).toEqual({ etat: "enregistre", enAttente: 0 });
  });
});
