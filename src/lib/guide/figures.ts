// Captures d'écran annotées de la page /guide.
//
// Chaque figure = une capture (public/guide/<id>.png, écrans anonymisés du
// site) + des annotations en surimpression (cercles SVG, petites légendes HTML).
// Les annotations ne sont PAS figées dans l'image : elles vivent ici, en
// pourcentages du cadre (x = gauche→droite, y = haut→bas, 0–100), éditables et
// bilingues sans refaire de capture. Les coordonnées viennent des mesures que
// fait tests/guide-captures.spec.ts (scripts/guide/mesures.json : boîte de chaque
// cible, en % du cadre 1280×800), un peu élargies pour entourer la cible.
// Capture et mesures se refont ensemble : `GUIDE_CAPTURES=1 npx playwright test
// tests/guide-captures.spec.ts --project=ordinateur`. Voir GuideFigure.tsx pour le rendu.
//
// Textes i18n : légende d'une annotation → guide.captures.<id>.labels.<labelId>,
// sous-titre optionnel de la figure → guide.captures.<id>.caption.

export type Annotation =
  | { kind: "circle"; x: number; y: number; rx?: number; ry?: number }
  /** Cadre arrondi centré en (x, y), de demi-largeur rx et demi-hauteur ry : pour une ligne ou une liste. */
  | { kind: "rect"; x: number; y: number; rx: number; ry: number }
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "label"; x: number; y: number; labelId: string; align?: "left" | "center" | "right" };

export interface GuideFigure {
  /** Fichier /guide/<id>.png + clé i18n guide.captures.<id>. */
  id: string;
  /** Ratio largeur/hauteur du cadre (défaut 1.6 ≈ desktop 16:10). */
  aspect?: number;
  annotations?: Annotation[];
  /** Affiche le sous-titre i18n guide.captures.<id>.caption sous l'image. */
  caption?: boolean;
}

/** Figures par section du guide (clé = SECTIONS de src/app/guide/page.tsx). */
export const FIGURES: Record<string, GuideFigure[]> = {
  songs: [
    {
      id: "songs",
      annotations: [
        // Onglet « Chants » de la barre latérale
        { kind: "circle", x: 9.6, y: 10.8, rx: 9.7, ry: 3.5 },
        { kind: "label", x: 19.6, y: 12.6, labelId: "tab", align: "left" },
        // Champ de recherche de la liste
        { kind: "circle", x: 35.7, y: 17.6, rx: 12.6, ry: 3.6 },
        { kind: "label", x: 48.6, y: 21.4, labelId: "search", align: "left" },
        // Pastille de tonalité, colorée selon la langue (bleu = français, rouge = chinois)
        { kind: "circle", x: 46.3, y: 58.2, rx: 2.4, ry: 2.5 },
        { kind: "arrow", x1: 51.5, y1: 76.2, x2: 47.4, y2: 61 },
        { kind: "label", x: 58.2, y: 78.4, labelId: "dot" },
      ],
    },
    {
      id: "song",
      annotations: [
        // Tonalité (− / liste / +), puis menu ⋯ et son entrée « Personnaliser »
        { kind: "circle", x: 60.2, y: 16.3, rx: 6.5, ry: 3.1 },
        { kind: "circle", x: 97.5, y: 16.3, rx: 1.9, ry: 3 },
        { kind: "circle", x: 90.6, y: 25, rx: 8.3, ry: 2.7 },
        { kind: "label", x: 81.6, y: 25, labelId: "customize", align: "right" },
      ],
    },
  ],
  customize: [
    {
      id: "customize",
      annotations: [
        { kind: "circle", x: 60.2, y: 16.3, rx: 6.5, ry: 3.1 },
        { kind: "label", x: 60.2, y: 11.3, labelId: "transpose" },
        // Le panneau : les sections du chant, leur ordre, leurs notes
        { kind: "rect", x: 85.7, y: 45.4, rx: 14, ry: 27 },
        { kind: "label", x: 85.7, y: 81, labelId: "sections" },
      ],
    },
  ],
  performance: [
    {
      id: "performance",
      annotations: [
        { kind: "circle", x: 10.5, y: 96, rx: 2.4, ry: 3.6 },
        { kind: "label", x: 10.5, y: 90, labelId: "annotate" },
        { kind: "circle", x: 92.5, y: 96, rx: 4.2, ry: 3.6 },
        { kind: "label", x: 98.5, y: 89.4, labelId: "swipe", align: "right" },
      ],
    },
  ],
  setlists: [
    {
      id: "setlists",
      annotations: [
        { kind: "rect", x: 59.7, y: 40.5, rx: 37.6, ry: 5.4 },
        { kind: "label", x: 59.7, y: 54.6, labelId: "open" },
        // « Nouvelle setlist »
        { kind: "rect", x: 90.4, y: 5.8, rx: 7, ry: 3.3 },
      ],
    },
  ],
  compose: [
    {
      id: "composeInfos",
      caption: true,
      annotations: [
        // Titre, catégorie, puis « Publier »
        { kind: "circle", x: 31.8, y: 9.4, rx: 11.2, ry: 3.1 },
        { kind: "circle", x: 28.2, y: 15.8, rx: 5.3, ry: 2.2 },
        { kind: "circle", x: 45.1, y: 95.3, rx: 4.2, ry: 3.6 },
      ],
    },
    {
      id: "composeSongs",
      caption: true,
      annotations: [
        { kind: "rect", x: 75.3, y: 13.4, rx: 22.6, ry: 3.9 },
        { kind: "circle", x: 95.9, y: 47.4, rx: 2.2, ry: 3 },
        { kind: "label", x: 89.6, y: 47.4, labelId: "add", align: "right" },
      ],
    },
    {
      id: "composeAdvanced",
      caption: true,
      annotations: [
        // Tonalité, structure, puis « Fusionner »
        { kind: "rect", x: 75.3, y: 9.3, rx: 22.6, ry: 3.9 },
        { kind: "circle", x: 64.8, y: 22.5, rx: 12.2, ry: 3.8 },
        { kind: "circle", x: 58.1, y: 95.7, rx: 5.4, ry: 3.2 },
        { kind: "label", x: 64.4, y: 95.7, labelId: "merge", align: "left" },
      ],
    },
  ],
  planning: [
    {
      id: "planning",
      annotations: [
        // Onglet « Planning », un planning par type de service, puis le lien « Mes services » de « Pour moi »
        { kind: "circle", x: 9.6, y: 21.4, rx: 9.7, ry: 3.5 },
        { kind: "rect", x: 50.4, y: 13.8, rx: 29, ry: 3.4 },
        { kind: "label", x: 63, y: 8.6, labelId: "colors" },
        { kind: "circle", x: 72.2, y: 49.8, rx: 5.6, ry: 2.6 },
      ],
    },
    {
      id: "services",
      annotations: [
        // « Moi », d'où s'ouvre la page Mes services, puis la première date
        { kind: "circle", x: 9.6, y: 26.7, rx: 9.7, ry: 3.5 },
        { kind: "label", x: 1.2, y: 33.6, labelId: "tab", align: "left" },
        { kind: "rect", x: 38.1, y: 45.3, rx: 15.2, ry: 4.7 },
      ],
    },
  ],
  notifications: [
    {
      id: "notifications",
      annotations: [
        { kind: "circle", x: 95.5, y: 10.9, rx: 2.9, ry: 3 },
        { kind: "label", x: 86, y: 21.6, labelId: "toggle" },
      ],
    },
  ],
  roles: [
    {
      id: "admin",
      annotations: [
        { kind: "circle", x: 49, y: 10.6, rx: 6, ry: 3 },
        { kind: "label", x: 49, y: 16, labelId: "manage" },
      ],
    },
  ],
  account: [
    {
      id: "profile",
      annotations: [
        { kind: "rect", x: 37, y: 45.4, rx: 15.7, ry: 6.3 },
        { kind: "label", x: 37, y: 53.8, labelId: "planningName" },
      ],
    },
  ],
};
