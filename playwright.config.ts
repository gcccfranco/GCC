import { defineConfig, devices } from "@playwright/test";

/** Port dédié aux tests : le `next dev` de travail (3000) reste libre. */
export const PORT = Number(process.env.PW_PORT ?? 3100);
// `localhost` et pas `127.0.0.1` : `next dev` bloque ses ressources de
// développement en cross-origin, et la page arrive alors **non hydratée** —
// elle s'affiche mais aucun bouton ne répond.
export const BASE_URL = `http://localhost:${PORT}`;
/** Second serveur, lancé SANS l'interrupteur du back-office (lot 18,
 *  docs/spec-mise-en-ligne.md) : ce que verra le site en ligne. */
export const BASE_URL_COUPE = `http://localhost:${PORT + 1}`;

/** Lot U4 : specs lancées aussi sur `tablette-paysage` et `ordinateur-1440` —
 *  la navigation, le halo qui part du bord de la barre, et le dimanche (setlist,
 *  barre d'outils, sommaire, mode louange). */
const SPECS_GRAND_ECRAN = [
  /navigation-grand-ecran\.spec\.ts/,
  /look-navigation\.spec\.ts/,
  /look-halo(-defilement)?\.spec\.ts/,
  /look-louange\.spec\.ts/,
  /performance-mode\.spec\.ts/,
  /setlist-regie\.spec\.ts/,
  /coup-d-oeil\.spec\.ts/,
  // Lot U5 (docs/spec-deux-volets.md) : la setlist en deux volets.
  /setlist-deux-volets\.spec\.ts/,
  // … et Chants en deux volets.
  /chants-deux-volets\.spec\.ts/,
  // … le mode louange en deux colonnes, et le parcours de T6 (captures, FR et ZH, clair et sombre).
  /mode-louange-colonnes\.spec\.ts/,
  /deux-volets-finitions\.spec\.ts/,
  // Lot U4 bis (docs/spec-pages-en-grand.md, Q16) : toutes les pages en grand.
  /pages-en-grand-.*\.spec\.ts/,
  // Lot U6 (spec-back-office.md, Tests) : l'espace Back-Office, B1.
  /back-office-espace\.spec\.ts/,
  // Lot U8 (spec-calendrier.md, Tests) : la page du calendrier, Mois sur la tablette couchée.
  /calendrier\.spec\.ts/,
  /calendrier-deplacer\.spec\.ts/,
  /calendrier-widget\.spec\.ts/,
  // Lot U9 (spec-evenements-2027.md) : ligne d'annonce, pastille et calendrier, agenda public.
  /evenements-2027\.spec\.ts/,
  // B2 : Planning, Équipes, Messages rangés dans le Back-Office (pleine largeur, barre latérale).
  /back-office-admin\.spec\.ts/,
  // B4 : le tableau de bord (grille de 4 en paysage et à 1 440 px).
  /tableau-de-bord\.spec\.ts/,
  // Lot U5 bis (docs/spec-editeur-setlist.md) : l'éditeur de setlist en deux colonnes.
  /setlist-editeur-piste2\.spec\.ts/,
  // … et sa bibliothèque (T5 : « + » entre deux éléments sur ordinateur, pas sur tablette couchée).
  /setlist-bibliotheque\.spec\.ts/,
  // … et le choix des chants à fusionner, dans le volet de droite.
  /setlist-fusionner\.spec\.ts/,
  // Lot U7 (spec-statistiques.md, Tests) : la page Statistiques et son entrée du menu.
  /statistiques\.spec\.ts/,
  // Retours du 06/10/2026 : barre réduite, aucune bande vide entre la barre et la page.
  /agencement-barre-reduite\.spec\.ts/,
  // Scène Pâques · Noël (docs/spec-scene-paques-noel.md) : onglets de fête, une semaine à la fois.
  /scene-paques-noel\.spec\.ts/,
  // Agencement v18 (docs/spec-agencement-v18.md) : chaque tranche, F1 comprise, sur les cinq projets.
  /agencement-v18-.*\.spec\.ts/,
];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // 3 en local : les profils téléphone et tablette émulent des écrans haute
  // densité (×2,6, ×2), plus coûteux ; au-delà, `next dev` sature et des tests
  // échouent au hasard (constaté le 14/09/2026 avec 5).
  workers: process.env.CI ? 1 : 3,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Trois appareils, toujours (consigne de Timothée du 14/09/2026, CLAUDE.md),
  // tous sous Chromium (émulation de taille et de toucher ; WebKit écarté).
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
    { name: "telephone", use: { ...devices["Pixel 7"] } },
    { name: "tablette", use: { ...devices["iPad (gen 7)"], defaultBrowserType: "chromium" } },
    // ── Lot U4 (docs/spec-navigation-grand-ecran.md, Q16) ──────────────────────
    // La tablette couchée (barre latérale réduite) et la lecture à 1 440 px, que
    // les trois appareils ne montrent pas. Limités à la navigation et aux specs du
    // dimanche : toute la suite sur cinq projets coûterait deux tiers de temps en plus.
    { name: "tablette-paysage", testMatch: SPECS_GRAND_ECRAN, use: { ...devices["iPad (gen 7) landscape"], defaultBrowserType: "chromium" } },
    { name: "ordinateur-1440", testMatch: SPECS_GRAND_ECRAN, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: `npm run dev -- -p ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: true,
      // `next dev` compile la page à la première requête : la partition 简谱
      // charge un scan de 1 à 2 Mo, la compilation initiale est lente.
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
      // La suite existante teste le back-office : interrupteur ouvert, quoi que dise `.env.local`.
      env: { NEXT_PUBLIC_BACK_OFFICE: "1" },
    },
    {
      // Interrupteur coupé. Next 16 verrouille `.next/dev` : un second `next dev`
      // dans le même dossier a besoin de son propre dossier de build.
      command: `npm run dev -- -p ${PORT + 1}`,
      url: BASE_URL_COUPE,
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
      env: { NEXT_PUBLIC_BACK_OFFICE: "0", NEXT_DIST_DIR: ".next-coupe" },
    },
  ],
});
