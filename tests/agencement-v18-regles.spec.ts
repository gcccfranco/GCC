import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  estGrandEcran, interdireDialoguesNatifs, ouvrirAvecBarre, verifierAgencement, verifierPleineLargeur,
} from "./helpers/agencement";

// Agencement v18, tranche Z (docs/spec-agencement-v18.md, « Tests », Z) : les vérifications communes
// sur TOUTES les pages de l'App et du Back-Office, barre dépliée puis réduite (ordinateur), sur les
// cinq projets : un seul en-tête et un seul h1, à la marge de la zone et à la bonne taille, le premier
// bloc au x du titre, rien qui déborde, un halo (bleu gris au Back-Office), aucune fenêtre native ;
// en grand, deux volets sur toute la zone, et le volet de droite n'est jamais vide (R11).
// Les pages des tranches ont leurs propres tests plus fins ; celui-ci passe partout, scène comprise.
// Données fictives, Firestore et Sheets simulés, aucune notification.

const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", planningName: "Alix D.",
  poles: ["da", "louange"], plannings: ["culte"], serviceRoles: { "Culte Francophone": ["musicien"] },
};

const EV = {
  titre: "", type: "loisir", pour: "eglise", date: "2026-10-17", heure: "14:00", heureFin: "16:00", dateFin: "",
  lieu: "Jardin", description: "", liens: [], images: [], placesMax: 10, inscriptions: "auto", inscriptionOuverte: true,
  sansCompte: false, contact: "Alix D.", organisateurUid: "uid-admin", organisateurNom: "Alix D.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});

const DOCS: Record<string, Record<string, unknown>> = {
  "poles/da/taches/t1": {
    pole: "da", titre: "Préparer les affiches", responsableUid: "uid-admin", responsableNom: "Alix D.", echeance: "2026-10-09",
    repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "uid-admin",
    createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
  },
  "evenements/foot": { ...EV, titre: "Foot au parc" },
  "evenements/reu-da": {
    ...EV, titre: "Réunion DA", date: "2026-10-14", type: "eglise", pour: "pole:da", placesMax: null, inscriptions: "fermees",
    inscriptionOuverte: false, lieu: "Salle 2", heure: "20:00", heureFin: "", contact: "",
  },
  "setlists/s1": {
    title: "Culte du 11 octobre", leader: "Alix D.", category: "Culte Francophone", date: "2026-10-11", language: "mixed",
    notes: "", ownerId: "uid-admin", isPrivate: false, items: [item("hosanna", 1), item("abba-pere", 2)],
  },
  "config/app": { registrationOpen: true },
};

/** Le Culte Franco : l'admin au piano le 11/10. */
const CULTE = [
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["11/10", "", "", "", "Alix D.", "", "", "", "", "", "", "", ""],
].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

/** `premierBloc` : le bloc de contenu sous l'en-tête, quand ce n'est pas son premier frère visible
 *  (le Planning : la barre collante des plannings, R6, s'intercale sur téléphone et tablette). */
type PageAVerifier = { chemin: string; lecture?: boolean; premierBloc?: string };
const SOUS_LE_PLANNING = "header[data-entete-page] ~ main";

/** Les adresses de la spec (Z), plus les pages qui portaient encore l'ancien titre (`PageTitle`). */
const APP: PageAVerifier[] = [
  { chemin: "/planning", premierBloc: SOUS_LE_PLANNING }, { chemin: "/planning/culte", premierBloc: SOUS_LE_PLANNING },
  { chemin: "/planning/groupes", premierBloc: SOUS_LE_PLANNING }, { chemin: "/planning/table", premierBloc: SOUS_LE_PLANNING },
  { chemin: "/songs" }, { chemin: "/setlists" }, { chemin: "/setlists/new" }, { chemin: "/setlists/new?depuis=passee" },
  { chemin: "/evenements" }, { chemin: "/evenements/scene/noel" }, { chemin: "/mes-services" }, { chemin: "/moi" },
  { chemin: "/profil" }, { chemin: "/guide", lecture: true }, { chemin: "/questionnaire", lecture: true },
  { chemin: "/harmonie" }, { chemin: "/taches" }, { chemin: "/equipes" },
];
const BACK_OFFICE: PageAVerifier[] = [
  { chemin: "/back-office" }, { chemin: "/back-office/taches/da" }, { chemin: "/back-office/evenements" },
  { chemin: "/back-office/evenements/scene/noel" }, { chemin: "/back-office/reunions" }, { chemin: "/back-office/calendrier" },
  { chemin: "/back-office/planning" }, { chemin: "/back-office/equipes" }, { chemin: "/back-office/equipes/personnes" },
  { chemin: "/back-office/messages" }, { chemin: "/back-office/messages/notifier" }, { chemin: "/back-office/messages/questionnaire" },
  { chemin: "/back-office/statistiques" }, { chemin: "/back-office/plus" },
];

async function ouvrir(page: Page, chemin: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-06T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, ADMIN, DOCS, chemin);
  await expect(page.locator("header[data-entete-page] h1").filter({ visible: true }).first()).toBeVisible({ timeout: 15_000 });
  // Les lectures simulées et les fondus finis : les mesures portent sur la page posée.
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Capture à regarder et à comparer aux planches v18 (PW_CAPTURES=<dossier>). */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

async function verifierPage(page: Page, { chemin, lecture, premierBloc }: PageAVerifier, grand: boolean) {
  await verifierAgencement(page, { premierBloc: premierBloc ? page.locator(premierBloc) : undefined });
  if (!grand) return;
  // En grand : deux volets sur toute la zone, et jamais de volet vide (R10, R11).
  const volets = page.locator("[data-deux-volets]").filter({ visible: true });
  if (!lecture && (await volets.count())) {
    await verifierPleineLargeur(page, volets.first());
    const detail = volets.first().locator('[data-volet="detail"]');
    if (await detail.count()) {
      await expect.poll(() => detail.evaluate((el) => (el as HTMLElement).innerText.trim().length), { message: `${chemin} : le volet de droite n'est pas vide` })
        .toBeGreaterThan(0);
    }
  }
}

for (const [espace, pages] of [["App", APP], ["Back-Office", BACK_OFFICE]] as const) {
  test.describe(`Z : les règles communes, ${espace}`, () => {
    // Connexion, première compilation d'une page par `next dev`, lectures simulées : plus que 30 s
    // quand la suite tourne en entier.
    test.describe.configure({ timeout: 60_000 });
    for (const p of pages) {
      test(`${p.chemin} : barre dépliée (ou sans barre)`, async ({ page }, info) => {
        test.skip(info.project.name === "tablette-paysage", "la tablette couchée a toujours la barre réduite : vue avec « réduite »");
        await ouvrirAvecBarre(page, "depliee");
        await ouvrir(page, p.chemin);
        await verifierPage(page, p, estGrandEcran(info));
        await capture(page, `z${p.chemin.replace(/[/?=]+/g, "-")}`);
      });

      test(`${p.chemin} : barre réduite (grands écrans)`, async ({ page }, info) => {
        test.skip(!estGrandEcran(info), "la barre latérale n'existe qu'en grand");
        await ouvrirAvecBarre(page, "reduite");
        await ouvrir(page, p.chemin);
        await verifierPage(page, p, true);
        await capture(page, `z${p.chemin.replace(/[/?=]+/g, "-")}-reduite`);
      });
    }
  });
}
