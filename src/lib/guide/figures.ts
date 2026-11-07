// Captures d'écran annotées de la page /guide.
//
// Chaque figure = une capture (public/guide/<id>.png, écrans anonymisés du
// site) + des annotations en surimpression (cercles SVG, petites légendes HTML).
// Les annotations ne sont PAS figées dans l'image : elles vivent ici, en
// pourcentages du cadre (x = gauche→droite, y = haut→bas, 0–100), éditables et
// bilingues sans refaire de capture. Les coordonnées viennent des mesures que
// fait tests/guide-captures.spec.ts (scripts/guide/mesures.json : boîte de chaque
// cible, en % du cadre 1280×800), un peu élargies pour entourer la cible.
// Deux jeux de captures : français (public/guide/<id>.png) et chinois (public/guide/zh/<id>.png,
// GUIDE_LANGUE=zh-CN, mesures dans scripts/guide/mesures-zh.json). Les libellés chinois, plus courts,
// déplacent certaines cibles : une figure dont les cibles bougent en 中文 porte un `zh` (la liste complète
// des annotations pour la capture chinoise) ; sans `zh`, la capture chinoise reprend les annotations françaises.
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
  /** Annotations de la capture chinoise (public/guide/zh/<id>.png), si ses cibles diffèrent du français. */
  zh?: Annotation[];
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
        { kind: "circle", x: 9.6, y: 16.9, rx: 8.8, ry: 3.4 },
        { kind: "label", x: 19.6, y: 12.6, labelId: "tab", align: "left" },
        // Champ de recherche de la liste
        { kind: "circle", x: 35.7, y: 17.4, rx: 12.6, ry: 3.6 },
        { kind: "label", x: 48.6, y: 21.2, labelId: "search", align: "left" },
        // Pastille de tonalité, colorée selon la langue (bleu = français, rouge = chinois)
        { kind: "circle", x: 46.3, y: 52.8, rx: 2.4, ry: 2.5 },
        { kind: "arrow", x1: 51.5, y1: 70.8, x2: 47.4, y2: 55.6 },
        { kind: "label", x: 58.2, y: 73, labelId: "dot" },
      ],
    },
    {
      id: "song",
      annotations: [
        // Tonalité (− / liste / +), puis menu ⋯ et son entrée « Personnaliser »
        { kind: "circle", x: 62, y: 18, rx: 7.7, ry: 3.1 },
        { kind: "circle", x: 93.8, y: 18, rx: 1.9, ry: 3 },
        { kind: "circle", x: 86.9, y: 26.6, rx: 8.4, ry: 2.7 },
        { kind: "label", x: 77.9, y: 26.6, labelId: "customize", align: "right" },
      ],
      zh: [
        { kind: "circle", x: 61.5, y: 18, rx: 7.2, ry: 3.1 },
        { kind: "circle", x: 93.8, y: 18, rx: 1.9, ry: 3 },
        { kind: "circle", x: 86.9, y: 26.6, rx: 8.4, ry: 2.7 },
        { kind: "label", x: 77.9, y: 26.6, labelId: "customize", align: "right" },
      ],
    },
  ],
  customize: [
    {
      id: "customize",
      annotations: [
        { kind: "circle", x: 62, y: 18, rx: 7.7, ry: 3.1 },
        { kind: "label", x: 62, y: 13, labelId: "transpose" },
        // Le panneau : les sections du chant, leur ordre, leurs notes
        { kind: "rect", x: 85, y: 42.4, rx: 13.8, ry: 31 },
        { kind: "label", x: 85, y: 80, labelId: "sections" },
      ],
      zh: [
        { kind: "circle", x: 61.5, y: 18, rx: 7.2, ry: 3.1 },
        { kind: "label", x: 61.5, y: 13, labelId: "transpose" },
        { kind: "rect", x: 85, y: 42.4, rx: 13.8, ry: 31 },
        { kind: "label", x: 85, y: 80, labelId: "sections" },
      ],
    },
  ],
  performance: [
    {
      id: "performance",
      annotations: [
        { kind: "circle", x: 11.4, y: 96, rx: 2.4, ry: 3.6 },
        { kind: "label", x: 11.4, y: 90, labelId: "annotate" },
        { kind: "circle", x: 91.6, y: 96, rx: 4.2, ry: 3.6 },
        { kind: "label", x: 97.6, y: 89.4, labelId: "swipe", align: "right" },
      ],
    },
  ],
  setlists: [
    {
      id: "setlists",
      annotations: [
        { kind: "rect", x: 50.6, y: 38.3, rx: 28.1, ry: 6.8 },
        { kind: "label", x: 50.6, y: 48.6, labelId: "open" },
        // « Nouvelle setlist »
        { kind: "rect", x: 72.1, y: 5.8, rx: 7, ry: 3.3 },
      ],
      zh: [
        { kind: "rect", x: 50.6, y: 38.3, rx: 28.1, ry: 6.8 },
        { kind: "label", x: 50.6, y: 48.6, labelId: "open" },
        { kind: "rect", x: 74.1, y: 5.8, rx: 4.9, ry: 3.3 },
      ],
    },
  ],
  compose: [
    {
      id: "composeInfos",
      caption: true,
      annotations: [
        // Titre, catégorie, puis « Publier »
        { kind: "circle", x: 32.9, y: 9.1, rx: 12.9, ry: 3 },
        { kind: "circle", x: 28.2, y: 15.5, rx: 5.3, ry: 2.2 },
        { kind: "circle", x: 45.1, y: 95.3, rx: 4.2, ry: 3.6 },
      ],
      zh: [
        { kind: "circle", x: 27.5, y: 9.1, rx: 7.3, ry: 3 },
        { kind: "circle", x: 25.5, y: 15.5, rx: 2.7, ry: 2.2 },
        { kind: "circle", x: 45.8, y: 95.3, rx: 3.5, ry: 3.6 },
      ],
    },
    {
      id: "composeSongs",
      caption: true,
      annotations: [
        { kind: "rect", x: 75.3, y: 13.4, rx: 22.6, ry: 3.9 },
        { kind: "circle", x: 95.9, y: 61.8, rx: 2.2, ry: 3 },
        { kind: "label", x: 89.6, y: 61.8, labelId: "add", align: "right" },
      ],
    },
    {
      id: "composeAdvanced",
      caption: true,
      annotations: [
        // Tonalité, structure, puis « Fusionner »
        { kind: "rect", x: 75.3, y: 9.1, rx: 22.6, ry: 3.9 },
        { kind: "circle", x: 64.8, y: 22.3, rx: 12.2, ry: 3.8 },
        { kind: "circle", x: 58.1, y: 95.7, rx: 5.4, ry: 3.2 },
        { kind: "label", x: 64.4, y: 95.7, labelId: "merge", align: "left" },
      ],
      zh: [
        { kind: "rect", x: 75.3, y: 9.1, rx: 22.6, ry: 3.9 },
        { kind: "circle", x: 64.8, y: 22.3, rx: 12.2, ry: 3.8 },
        { kind: "circle", x: 56.6, y: 95.7, rx: 4, ry: 3.2 },
        { kind: "label", x: 62.9, y: 95.7, labelId: "merge", align: "left" },
      ],
    },
  ],
  planning: [
    {
      id: "planning",
      annotations: [
        // Onglet « Planning », un planning par type de service, puis le lien « Mes services » de « Pour moi »
        { kind: "circle", x: 9.6, y: 27.2, rx: 8.8, ry: 3.4 },
        { kind: "rect", x: 50.4, y: 13.5, rx: 29, ry: 3.4 },
        { kind: "label", x: 63, y: 8.3, labelId: "colors" },
        { kind: "circle", x: 72.2, y: 48.5, rx: 5.6, ry: 2.6 },
      ],
      zh: [
        { kind: "circle", x: 9.6, y: 27.2, rx: 8.8, ry: 3.4 },
        { kind: "rect", x: 45.9, y: 13.5, rx: 24.5, ry: 3.4 },
        { kind: "label", x: 55, y: 8.3, labelId: "colors" },
        { kind: "circle", x: 72.2, y: 48.5, rx: 5.6, ry: 2.6 },
      ],
    },
    {
      id: "services",
      annotations: [
        // « Moi », d'où s'ouvre la page Mes services, puis la première date
        { kind: "circle", x: 9.6, y: 32.3, rx: 8.8, ry: 3.4 },
        { kind: "label", x: 1.2, y: 39.2, labelId: "tab", align: "left" },
        { kind: "rect", x: 38.1, y: 46, rx: 14.8, ry: 4.5 },
      ],
    },
  ],
  notifications: [
    {
      id: "notifications",
      annotations: [
        { kind: "circle", x: 95.5, y: 10.9, rx: 2.9, ry: 3 },
        { kind: "label", x: 98.5, y: 21.6, labelId: "toggle", align: "right" },
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
      zh: [
        { kind: "circle", x: 45.9, y: 10.6, rx: 4.7, ry: 3 },
        { kind: "label", x: 45.9, y: 16, labelId: "manage" },
      ],
    },
  ],
  account: [
    {
      id: "profile",
      annotations: [
        { kind: "rect", x: 37, y: 45.2, rx: 15.7, ry: 6.3 },
        { kind: "label", x: 37, y: 53.6, labelId: "planningName" },
      ],
    },
  ],
};
