import { expect, test, type Page } from "@playwright/test";
import { fsDoc, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";

// Lot LF (docs/spec-lectures-firestore.md) : moins de lectures Firestore. Cette spec COMPTE les requêtes
// `:runQuery` que la page envoie (le faux Firestore ignore les filtres `where` et ne rend pas de `readTime` :
// la requête delta de `getSetlists` est donc servie ici, avec le filtre `majLe > valeur` appliqué aux documents
// de la base simulée).
//   LF1 : setlists en copie IndexedDB + delta sur `majLe` (src/lib/setlist/copieListe.ts, getSetlists).
//   LF2 : `listProfiles()` gardée 10 min (une seule requête `users` pour deux aperçus d'affilée).
//   LF4 : la cloche (`useNotifications`) ne fait qu'une passe par minute au retour sur l'app.
//   LF3 : « À faire » du back-office gardée 10 min, vidée par une écriture de tâche.
//   LF5 : les fois d'une équipe en une requête (collection group), avec repli tâche par tâche.
// Horloge fixe au 30/10/2026 ; noms et chants fictifs ; lancé sur ordinateur, téléphone et tablette.

const MEMBRE: FakeProfile = { uid: "uid-membre-lf", email: "membre-lf@example.com", firstName: "Maud", lastName: "B." };

const HORLOGE = new Date("2026-10-30T10:00:00Z");
const BASE_COPIE = "gcc-liste-setlists";
const FR = "abba-pere";
const ZH = "一生敬拜你";

// ── Comptage des requêtes ────────────────────────────────────────────────────────────────────────────

type Compteurs = {
  /** Lecture complète des setlists (sans filtre ni limite). */
  setlistsComplete: number;
  /** Delta de `getSetlists` (`where majLe > …`). */
  setlistsDelta: number;
  /** Requêtes par collection (toutes sortes confondues). */
  parCollection: Record<string, number>;
  /** LF5 : requêtes `fois` en collection group (`allDescendants`) et requêtes `fois` d'une seule tâche. */
  foisGroupe: number;
  foisParTache: number;
  /** LF5 : vrai = la requête `fois` en collection group est refusée (403), comme une règle pas encore publiée. */
  refuserFoisGroupe: boolean;
  remettreAZero(): void;
};

type Where = { fieldFilter?: { field: { fieldPath: string }; op: string; value: { timestampValue?: string } } };

/** `db.doc` rend les horodatages en texte ISO : on les rend à Firestore en `timestampValue`, comme les lit l'app. */
const avecDates = (d: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(d).map(([k, v]) => [k, ["createdAt", "updatedAt", "majLe"].includes(k) && typeof v === "string" ? new Date(v) : v]));

/**
 * À poser APRÈS `signInAs` (les requêtes du login et de la page d'arrivée ne sont pas comptées) : une route
 * posée plus tard passe avant celle du faux Firestore. La delta des setlists est servie ici ; tout le reste
 * est rendu au faux Firestore (`route.fallback()`).
 */
async function compter(page: Page, db: FakeDb): Promise<Compteurs> {
  const c: Compteurs = {
    setlistsComplete: 0, setlistsDelta: 0, parCollection: {}, foisGroupe: 0, foisParTache: 0, refuserFoisGroupe: false,
    remettreAZero() { c.setlistsComplete = 0; c.setlistsDelta = 0; c.parCollection = {}; c.foisGroupe = 0; c.foisParTache = 0; },
  };
  await page.route(/firestore\.googleapis\.com\/.*:runQuery/, (route) => {
    const q = (route.request().postDataJSON() as {
      structuredQuery: { from: { collectionId: string; allDescendants?: boolean }[]; where?: Where; limit?: number };
    }).structuredQuery;
    const collection = q.from[0].collectionId;
    c.parCollection[collection] = (c.parCollection[collection] ?? 0) + 1;
    if (collection === "fois") {
      if (q.from[0].allDescendants) {
        c.foisGroupe++;
        if (c.refuserFoisGroupe) {
          return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, status: "PERMISSION_DENIED", message: "Missing or insufficient permissions." } }) });
        }
      } else c.foisParTache++;
    }
    if (collection !== "setlists") return route.fallback();

    const filtre = q.where?.fieldFilter;
    if (!filtre && !q.limit) {
      c.setlistsComplete++;
      return route.fallback();
    }
    if (filtre?.field.fieldPath !== "majLe") return route.fallback(); // la cloche : createdAt / updatedAt

    c.setlistsDelta++;
    const depuis = Date.parse(filtre.value.timestampValue ?? "");
    const lignes = db.list("setlists")
      .filter((chemin) => Date.parse(String(db.doc(chemin)?.majLe ?? "")) > depuis)
      .map((chemin) => ({
        document: { ...fsDoc(chemin, avecDates(db.doc(chemin)!)), updateTime: HORLOGE.toISOString() },
        readTime: new Date(HORLOGE).toISOString(),
      }));
    // Aucun résultat : Firestore rend tout de même une ligne avec le `readTime`.
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify(lignes.length ? lignes : [{ readTime: new Date(HORLOGE).toISOString() }]),
    });
  });
  return c;
}

/** Connexion sur une page calme (« Mon compte »), puis compteurs : la page testée s'ouvre ensuite avec un
 *  `goto`, donc sans mémoire (gardes de 60 s et de 10 min à zéro). */
async function connecte(page: Page, docs: Record<string, Record<string, unknown>>) {
  await page.clock.setFixedTime(HORLOGE);
  const db = await signInAs(page, MEMBRE, docs, "/moi");
  const c = await compter(page, db);
  // La page d'arrivée lit elle aussi les setlists, et sa lecture en vol pourrait écrire une copie : on la quitte
  // pour une page statique (plus aucun script de l'app), puis on repart d'une base vide.
  await page.goto("/hors-ligne.html");
  await page.evaluate((base) => new Promise<void>((ok) => {
    const r = indexedDB.deleteDatabase(base);
    r.onsuccess = r.onerror = r.onblocked = () => ok();
  }), BASE_COPIE);
  c.remettreAZero();
  return { db, c };
}

// ── IndexedDB : la copie de la liste ────────────────────────────────────────────────────────────────

type Copie = { uid: string; lueLe: number; completeLe: number; setlists: { id: string; title: string }[] };

/** La copie (JSON de l'unique entrée), ou `null` s'il n'y en a pas. */
async function copie(page: Page): Promise<Copie | null> {
  const json = await page.evaluate((base) => new Promise<string | null>((ok, ko) => {
    const o = indexedDB.open(base, 1);
    o.onupgradeneeded = () => o.result.createObjectStore("liste");
    o.onerror = () => ko(o.error);
    o.onsuccess = () => {
      const g = o.result.transaction("liste", "readonly").objectStore("liste").get("liste");
      g.onsuccess = () => { o.result.close(); ok(typeof g.result === "string" ? g.result : null); };
      g.onerror = () => ko(g.error);
    };
  }), BASE_COPIE);
  return json ? (JSON.parse(json) as Copie) : null;
}

/** Vieillit la dernière lecture complète de la copie (`completeLe`) de `heures` heures. */
async function vieillir(page: Page, heures: number) {
  await page.evaluate(([base, ms]) => new Promise<void>((ok, ko) => {
    const o = indexedDB.open(base as string, 1);
    o.onerror = () => ko(o.error);
    o.onsuccess = () => {
      const s = o.result.transaction("liste", "readwrite").objectStore("liste");
      const g = s.get("liste");
      g.onsuccess = () => {
        const c = JSON.parse(g.result as string);
        c.completeLe = c.completeLe - (ms as number);
        const p = s.put(JSON.stringify(c), "liste");
        p.onsuccess = () => { o.result.close(); ok(); };
        p.onerror = () => ko(p.error);
      };
    };
  }), [BASE_COPIE, heures * 3_600_000] as const);
}

// ── Données ─────────────────────────────────────────────────────────────────────────────────────────

const chant = (songSlug: string) => ({
  songSlug, position: 0, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
/** `majLe` ancien : la delta ne doit pas les renvoyer (ils sont dans la copie depuis la lecture complète). */
const setlist = (date: string, category: string, items: unknown[], extra: Record<string, unknown> = {}) => ({
  title: `Setlist du ${date}`, date, category, leader: "Luc Fictif", language: "fr", notes: "", items,
  isDraft: false, isPrivate: false, ownerId: "uid-autre",
  createdAt: new Date(`${date}T08:00:00Z`), majLe: new Date("2026-01-01T00:00:00Z"), ...extra,
});

const SETLISTS: Record<string, Record<string, unknown>> = {
  "setlists/s1": setlist("2026-06-14", "Culte Francophone", [chant(FR), chant(ZH)]),
  "setlists/s2": setlist("2026-09-06", "Groupe Paix", [chant(FR)]),
  "setlists/s3": setlist("2026-10-18", "Groupe Fidélité", [chant(ZH)]),
};

const stats = (page: Page) => page.getByTestId("statistiques-chant");

async function ouvrirChant(page: Page, slug: string) {
  await page.goto(`/songs/${encodeURIComponent(slug)}`);
  await expect(stats(page)).toBeVisible();
}

test.use({ serviceWorkers: "block" });

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
test.describe("LF1 : les setlists en copie sur l'appareil, relues par delta", () => {
  test("première visite d'un chant : une lecture complète ; rechargement : une delta, aucune complète", async ({ page }) => {
    const { c } = await connecte(page, SETLISTS);

    await ouvrirChant(page, FR);
    expect(c.setlistsComplete).toBe(1);
    expect(c.setlistsDelta).toBe(0);
    // La copie est posée, liée au compte.
    const premiere = await copie(page);
    expect(premiere?.uid).toBe(MEMBRE.uid);
    expect(premiere?.setlists.map((s) => s.id).sort()).toEqual(["s1", "s2", "s3"]);

    c.remettreAZero();
    await page.reload();
    await expect(stats(page)).toBeVisible();
    expect(c.setlistsComplete).toBe(0);
    expect(c.setlistsDelta).toBe(1);
  });

  for (const [langue, slug] of [["FR", FR], ["ZH", ZH]] as const) {
    test(`chant ${langue} : les statistiques sont les mêmes à la première visite (complète) et après rechargement (delta)`, async ({ page }) => {
      const { c } = await connecte(page, SETLISTS);

      await ouvrirChant(page, slug);
      await expect.poll(() => c.setlistsComplete).toBe(1);
      const premiere = (await stats(page).innerText()).trim();
      expect(premiere).toContain("Joué");

      c.remettreAZero();
      await page.reload();
      await expect(stats(page)).toBeVisible();
      await expect.poll(() => c.setlistsDelta).toBe(1);
      expect(c.setlistsComplete).toBe(0);
      await expect(stats(page)).toHaveText(premiere);
    });
  }

  test("une setlist modifiée ailleurs (majLe récent) apparaît après la delta", async ({ page }) => {
    const { db, c } = await connecte(page, SETLISTS);

    await ouvrirChant(page, FR);
    await expect(stats(page)).toContainText("Joué 2 fois");

    // Un autre membre ajoute le chant à une troisième setlist.
    db.set("setlists/s3", setlist("2026-10-18", "Groupe Fidélité", [chant(ZH), chant(FR)], { majLe: new Date(HORLOGE.getTime() + 1000) }));
    c.remettreAZero();
    await page.reload();
    await expect(stats(page)).toContainText("Joué 3 fois");
    expect(c.setlistsDelta).toBe(1);
    expect(c.setlistsComplete).toBe(0);
  });

  test("une setlist mise à la corbeille (supprimeeLe + majLe) disparaît après la delta", async ({ page }) => {
    const { db, c } = await connecte(page, SETLISTS);

    await ouvrirChant(page, FR);
    await expect(stats(page)).toContainText("Joué 2 fois");

    db.set("setlists/s2", setlist("2026-09-06", "Groupe Paix", [chant(FR)], {
      supprimeeLe: new Date(HORLOGE.getTime() + 1000).toISOString(), supprimeePar: "uid-autre", majLe: new Date(HORLOGE.getTime() + 1000),
    }));
    c.remettreAZero();
    await page.reload();
    await expect(stats(page)).toContainText("Joué 1 fois");
    expect(c.setlistsDelta).toBe(1);
    expect(c.setlistsComplete).toBe(0);
    expect((await copie(page))?.setlists.map((s) => s.id).sort()).toEqual(["s1", "s3"]);
  });

  test("une copie de plus de 24 h : lecture complète à la visite suivante", async ({ page }) => {
    const { c } = await connecte(page, SETLISTS);

    await ouvrirChant(page, FR);
    expect(c.setlistsComplete).toBe(1);

    // Moins de 24 h : encore une delta.
    await vieillir(page, 23);
    c.remettreAZero();
    await page.reload();
    await expect(stats(page)).toBeVisible();
    expect(c.setlistsDelta).toBe(1);
    expect(c.setlistsComplete).toBe(0);

    // Plus de 24 h : lecture complète, et la copie est remise à neuf.
    await vieillir(page, 25);
    c.remettreAZero();
    await page.reload();
    await expect(stats(page)).toBeVisible();
    await expect.poll(() => c.setlistsComplete).toBe(1);
    expect(c.setlistsDelta).toBe(0);
    const neuve = await copie(page);
    expect(HORLOGE.getTime() - neuve!.completeLe).toBeLessThan(60_000);
  });

  test("la déconnexion efface la copie", async ({ page }) => {
    await connecte(page, SETLISTS);

    await ouvrirChant(page, FR);
    expect(await copie(page)).not.toBeNull();

    // Le geste réel : « Déconnexion » sur « Mon compte » (téléphone, tablette) ou dans le menu du compte (ordinateur).
    await page.goto("/moi");
    // « Mon compte » lit lui aussi les setlists : on laisse sa lecture finir, sinon elle pourrait réécrire la copie
    // juste après l'effacement (course en vol, voir le compte rendu).
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Déconnexion" }).click();
    await page.waitForURL(/\/login/);
    expect(await copie(page)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
test.describe("LF2 : les profils lus une seule fois", () => {
  // L'aperçu de la setlist (avec « L'équipe ») n'existe qu'en deux volets : fenêtre d'ordinateur sur les trois appareils.
  test.use({ viewport: { width: 1280, height: 800 } });

  const equipe = (date: string, titre: string, avecEquipe: boolean) => ({
    ...setlist(date, "Culte Francophone", [chant(FR)], { title: titre, ownerId: MEMBRE.uid }),
    ...(avecEquipe ? { editeurs: ["uid-ines"] } : {}),
  });
  const DOCS = {
    "users/uid-ines": { email: "ines-lf@example.com", firstName: "Inès", lastName: "Fictive", planningName: "", serviceRoles: {} },
    "setlists/a": equipe("2026-11-01", "Culte A avec équipe", true),
    "setlists/b": equipe("2026-11-08", "Culte B sans équipe", false),
    "setlists/c": equipe("2026-11-15", "Culte C avec équipe", true),
  };
  const apercu = (page: Page) => page.getByRole("region", { name: "Aperçu de la setlist" });
  const ligne = (page: Page, titre: string) => page.locator('[data-volet="liste"]').getByRole("link", { name: new RegExp(titre) });

  test("deux aperçus avec équipe ouverts d'affilée : une seule requête users", async ({ page }) => {
    const { c } = await connecte(page, DOCS);
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

    // Depuis la règle du 25/10/2026 aucun aperçu ne s'ouvre sans choix : A est choisi dans l'adresse.
    await page.goto("/setlists?apercu=a");
    // L'aperçu A lit les profils.
    await expect(apercu(page).getByRole("heading", { level: 2, name: "Culte A avec équipe" })).toBeVisible();
    await expect(apercu(page)).toContainText("Inès");
    await expect.poll(() => c.parCollection.users ?? 0).toBe(1);

    // B n'a pas d'équipe (aucune lecture), C en a une : le second aperçu avec équipe relit la liste... de la mémoire.
    await ligne(page, "Culte B").click();
    await expect(apercu(page).getByRole("heading", { level: 2, name: "Culte B sans équipe" })).toBeVisible();
    await expect(apercu(page)).not.toContainText("Inès");
    await ligne(page, "Culte C").click();
    await expect(apercu(page).getByRole("heading", { level: 2, name: "Culte C avec équipe" })).toBeVisible();
    await expect(apercu(page)).toContainText("Inès");
    expect(c.parCollection.users).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
test.describe("LF4 : la cloche, une passe par minute", () => {
  const passes = (c: Compteurs) => c.parCollection.notifications ?? 0;
  const retour = (page: Page) => page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });

  // La passe de montage : une ou deux (la cloche repart une fois quand le profil arrive après le compte,
  // `refresh` dépend de `[user, profile]`) ; on attend qu'elle se soit posée avant de compter.
  async function passeDeMontage(page: Page, c: Compteurs) {
    await expect.poll(() => passes(c)).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(2000);
    expect(passes(c)).toBeLessThanOrEqual(2);
  }

  // Méthode : l'horloge de la page est figée (`page.clock.setFixedTime`) ; la déplacer de 61 s simule le temps
  // écoulé sans attendre ni déclencher les minuteurs (le polling de 10 min ne part pas). Une passe = une requête
  // `notifications` (et une `setlists` à filtre createdAt/updatedAt, une `evenements`).
  test("le retour sur l'app (focus + visibilitychange) ne relance pas une passe qui date de moins de 60 s", async ({ page }) => {
    const { c } = await connecte(page, {});
    await page.goto("/moi");
    await passeDeMontage(page, c);

    c.remettreAZero();
    await retour(page);
    await page.waitForTimeout(1500);
    expect(passes(c)).toBe(0);
  });

  test("après 60 s, focus + visibilitychange ensemble font exactement une passe", async ({ page }) => {
    const { c } = await connecte(page, {});
    await page.goto("/moi");
    await passeDeMontage(page, c);

    // 61 s plus tard (horloge de la page).
    await page.clock.setFixedTime(new Date(HORLOGE.getTime() + 61_000));
    c.remettreAZero();
    await retour(page);
    await expect.poll(() => passes(c)).toBe(1);
    await page.waitForTimeout(1500);
    expect(passes(c)).toBe(1);
    expect(c.parCollection.evenements).toBe(1);

    // Et un nouveau retour tout de suite : rien.
    c.remettreAZero();
    await retour(page);
    await page.waitForTimeout(1000);
    expect(passes(c)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// LF3 et LF5 : tâches d'une équipe. Horloge au samedi 24/10/2026 ; équipe DA, personnes inventées.

const REF_DA: FakeProfile = {
  uid: "uid-ruth-lf", email: "ruth-lf@example.com", firstName: "Ruth", lastName: "Fictive", dansEquipes: ["da"], referentDe: ["da"],
};
const JOUR = "2026-10-24";
const tacheDa = (titre: string, extra: Record<string, unknown> = {}) => ({
  equipe: "da", titre, responsableUid: null, responsableNom: "", echeance: JOUR, repetition: null, lien: "", note: "",
  prevenir: null, auteurUid: REF_DA.uid, createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", ...extra,
});
const foisTerminee = (equipe: string, date = JOUR) => ({
  date, parUid: "uid-autre", parNom: "Léa Fictive", le: "2026-10-24T08:00:00Z", etat: "terminee", debutLe: "2026-10-24T07:00:00Z", equipe,
});
const TACHES: Record<string, Record<string, unknown>> = {
  "equipes/da/taches/t1": tacheDa("Fond du culte"),
  "equipes/da/taches/t2": tacheDa("Affiche de Noël"),
  "equipes/da/taches/t3": tacheDa("Clés de la salle"),
};

/** Connexion à « À faire » avec l'horloge figée : les compteurs sont posés après l'arrivée, puis la page est rechargée. */
async function ouvrirAFaire(page: Page, docs: Record<string, Record<string, unknown>>) {
  await page.clock.setFixedTime(new Date(`${JOUR}T10:00:00`));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, REF_DA, docs, "/back-office");
  const c = await compter(page, db);
  await page.goto("/back-office");
  c.remettreAZero();
  await page.reload();
  return { db, c };
}
const lignesAFaire = (page: Page) => page.getByTestId("ligne-a-faire");
/** Un lien visible (la barre latérale et la barre du bas existent toutes deux dans le DOM selon l'appareil). */
const lienVisible = (page: Page, href: string) => page.locator(`a[href="${href}"]:visible`).first();

test.describe("LF3 : « À faire » gardée 10 minutes", () => {
  test("deux pages du back-office à moins de 10 min, sans rechargement : une seule passe de lecture", async ({ page }) => {
    const { c } = await ouvrirAFaire(page, TACHES);
    await expect(lignesAFaire(page)).toHaveCount(3);
    await page.waitForTimeout(1500); // la lecture s'est posée
    const apresPremiere = c.parCollection.taches ?? 0;
    expect(apresPremiere).toBeGreaterThanOrEqual(1);

    // Navigation interne vers une autre page, puis retour à « À faire » : la garde répond.
    await lienVisible(page, "/back-office/equipes/").click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/?$/);
    await lienVisible(page, "/back-office/").click();
    await expect(page).toHaveURL(/\/back-office\/?$/);
    await expect(lignesAFaire(page)).toHaveCount(3);
    expect(c.parCollection.taches ?? 0).toBe(apresPremiere);
  });

  test("après une écriture de tâche faite par l'interface, la passe suivante relit", async ({ page }) => {
    const { db, c } = await ouvrirAFaire(page, TACHES);
    await expect(lignesAFaire(page)).toHaveCount(3);

    // « Fait » mène à la fiche de la tâche (navigation interne) ; on la termine.
    await lignesAFaire(page).filter({ hasText: "Fond du culte" }).getByRole("link", { name: /^Fait/ }).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/t1\/?$/);
    await page.getByRole("radio", { name: "Terminé" }).click();
    await expect(page.getByRole("radio", { name: "Terminé" })).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => db.doc(`equipes/da/taches/t1/fois/${JOUR}`)).toMatchObject({ etat: "terminee" });

    // Retour à « À faire », toujours sans rechargement : la tâche cochée n'y est plus, preuve d'une nouvelle lecture.
    c.remettreAZero();
    await lienVisible(page, "/back-office/").click();
    await expect(page).toHaveURL(/\/back-office\/?$/);
    await expect(lignesAFaire(page)).toHaveCount(2);
    await expect(lignesAFaire(page).filter({ hasText: "Fond du culte" })).toHaveCount(0);
    expect(c.parCollection.taches ?? 0).toBeGreaterThanOrEqual(1);
  });
});

test.describe("LF5 : les fois d'une équipe en une requête", () => {
  // Fois des trois tâches, plus une fois d'une AUTRE équipe sous un même identifiant de tâche (`t2`) : le faux Firestore
  // renvoie tout le collection group sans filtrer ; le code doit écarter ce chemin (equipes/medias/…).
  const DOCS = {
    ...TACHES,
    [`equipes/da/taches/t1/fois/${JOUR}`]: foisTerminee("da"),
    "equipes/medias/taches/t2": { ...tacheDa("Tâche des médias"), equipe: "medias", titre: "Tâche des médias" },
    [`equipes/medias/taches/t2/fois/${JOUR}`]: foisTerminee("medias"),
  };

  test("trois tâches : 2 requêtes (taches, fois en collection group) ; les fois d'une autre équipe sont écartées ; repli identique si refus", async ({ page }) => {
    const { c } = await ouvrirAFaire(page, DOCS);
    // t1 est faite (sa fois) : restent t2 et t3. t2 n'est PAS prise pour faite à cause de la fois de l'équipe `medias`.
    await expect(lignesAFaire(page)).toHaveCount(2);
    const unique = (await lignesAFaire(page).allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
    expect(unique.join("|")).toContain("Affiche de Noël");
    expect(unique.join("|")).toContain("Clés de la salle");
    expect(unique.join("|")).not.toContain("Fond du culte");
    expect(c.parCollection.taches).toBe(1);
    expect(c.foisGroupe).toBe(1);
    expect(c.foisParTache).toBe(0);

    // Requête unique refusée : repli, une requête `fois` par tâche (3), mêmes lignes.
    c.refuserFoisGroupe = true;
    c.remettreAZero();
    await page.reload();
    await expect(lignesAFaire(page)).toHaveCount(2);
    const repli = (await lignesAFaire(page).allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
    expect(repli).toEqual(unique);
    expect(c.parCollection.taches).toBe(1);
    expect(c.foisGroupe).toBe(1);
    expect(c.foisParTache).toBe(3);
  });

  test("cocher par l'interface écrit la fois avec le champ `equipe`", async ({ page }) => {
    const { db } = await ouvrirAFaire(page, TACHES);
    await lignesAFaire(page).filter({ hasText: "Clés de la salle" }).getByRole("link", { name: /^Fait/ }).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/t3\/?$/);
    await page.getByRole("radio", { name: "Terminé" }).click();
    await expect.poll(() => db.doc(`equipes/da/taches/t3/fois/${JOUR}`)).toMatchObject({ etat: "terminee", equipe: "da" });
    expect(db.writes.some((w) => w.path === `equipes/da/taches/t3/fois/${JOUR}` && w.data.equipe === "da")).toBe(true);
  });
});
