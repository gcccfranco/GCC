// Captures d'écran annotées de la page /guide.
//
// Chaque figure = une capture (public/guide/<id>.png, écrans anonymisés du
// site) + des annotations en surimpression (cercles SVG, petites légendes HTML).
// Les annotations ne sont PAS figées dans l'image : elles vivent ici, en
// pourcentages du cadre (x = gauche→droite, y = haut→bas, 0–100), éditables et
// bilingues sans refaire de capture. Coordonnées relevées au pixel sur les
// captures (1280×800). Voir GuideFigure.tsx pour le rendu.
//
// Textes i18n : légende d'une annotation → guide.captures.<id>.labels.<labelId>,
// sous-titre optionnel de la figure → guide.captures.<id>.caption.

export type Annotation =
  | { kind: "circle"; x: number; y: number; rx?: number; ry?: number }
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
        { kind: "circle", x: 33.4, y: 3.6, rx: 5.8, ry: 4.1 },
        { kind: "label", x: 33.4, y: 8.8, labelId: "tab" },
        { kind: "circle", x: 50, y: 13.1, rx: 27, ry: 4.9 },
        { kind: "label", x: 78.5, y: 13.1, labelId: "search", align: "left" },
        { kind: "circle", x: 31, y: 20, rx: 9.5, ry: 4 },
        { kind: "label", x: 20.5, y: 20, labelId: "dot", align: "right" },
      ],
    },
    {
      id: "song",
      annotations: [
        { kind: "circle", x: 33.6, y: 10.3, rx: 5.6, ry: 4 },
        // Accords + menu « Plus d'actions » (où vit Personnaliser)
        { kind: "circle", x: 75.8, y: 10.3, rx: 7, ry: 4 },
        { kind: "label", x: 75.8, y: 16.4, labelId: "customize" },
      ],
    },
  ],
  customize: [
    {
      id: "customize",
      annotations: [
        { kind: "circle", x: 33.6, y: 10.3, rx: 5.6, ry: 4 },
        { kind: "label", x: 33.6, y: 16.4, labelId: "transpose" },
        { kind: "circle", x: 82.7, y: 15.2, rx: 13.5, ry: 6.5 },
        { kind: "label", x: 68.5, y: 15.2, labelId: "sections", align: "right" },
      ],
    },
  ],
  performance: [
    {
      id: "performance",
      annotations: [
        { kind: "circle", x: 10.5, y: 95.9, rx: 4, ry: 3.5 },
        { kind: "label", x: 10.5, y: 90.5, labelId: "annotate" },
        { kind: "circle", x: 91.6, y: 95.9, rx: 4.6, ry: 3.5 },
        { kind: "label", x: 91.6, y: 90.5, labelId: "swipe" },
      ],
    },
  ],
  setlists: [
    {
      id: "setlists",
      annotations: [
        { kind: "circle", x: 32.9, y: 43.3, rx: 18.6, ry: 8.5 },
        { kind: "label", x: 32.9, y: 53.8, labelId: "open" },
        { kind: "circle", x: 79.3, y: 32.5, rx: 6.5, ry: 4.1 },
      ],
    },
  ],
  compose: [
    {
      id: "composeInfos",
      caption: true,
      annotations: [
        { kind: "circle", x: 50, y: 19.5, rx: 27, ry: 4.5 },
        { kind: "circle", x: 50, y: 33.3, rx: 26.5, ry: 5 },
        { kind: "circle", x: 50, y: 95.7, rx: 7, ry: 3.8 },
      ],
    },
    {
      id: "composeSongs",
      caption: true,
      annotations: [
        { kind: "circle", x: 50, y: 32.6, rx: 26.9, ry: 4.6 },
        { kind: "circle", x: 70.8, y: 38.2, rx: 5.1, ry: 3.8 },
        { kind: "label", x: 78, y: 38.2, labelId: "add", align: "left" },
      ],
    },
    {
      id: "composeAdvanced",
      caption: true,
      annotations: [
        { kind: "circle", x: 69.4, y: 34.4, rx: 4.7, ry: 3.5 },
        { kind: "circle", x: 43, y: 44.5, rx: 19, ry: 3.5 },
        { kind: "circle", x: 68.8, y: 49.4, rx: 6, ry: 3.5 },
        { kind: "label", x: 76.5, y: 49.4, labelId: "merge", align: "left" },
      ],
    },
  ],
  planning: [
    {
      id: "planning",
      annotations: [
        { kind: "circle", x: 26.1, y: 3.5, rx: 4.6, ry: 3.5 },
        { kind: "circle", x: 36, y: 9.8, rx: 28, ry: 3.3 },
        { kind: "label", x: 36, y: 14.5, labelId: "colors" },
      ],
    },
    {
      id: "services",
      annotations: [
        { kind: "circle", x: 41.8, y: 3.6, rx: 6.4, ry: 4.1 },
        { kind: "label", x: 41.8, y: 9.2, labelId: "tab" },
        { kind: "circle", x: 35.4, y: 29.6, rx: 8.7, ry: 3.8 },
      ],
    },
  ],
  annonces: [
    {
      id: "annonces",
      annotations: [
        { kind: "circle", x: 51, y: 3.5, rx: 4.7, ry: 3.6 },
        { kind: "label", x: 51, y: 9.2, labelId: "tab" },
        { kind: "circle", x: 77.2, y: 12.5, rx: 8.6, ry: 4.3 },
      ],
    },
  ],
  notifications: [
    {
      id: "notifications",
      annotations: [
        { kind: "circle", x: 66.7, y: 87.3, rx: 4, ry: 3.5 },
        { kind: "label", x: 66.7, y: 81.3, labelId: "toggle" },
      ],
    },
  ],
  roles: [
    {
      id: "admin",
      annotations: [
        { kind: "circle", x: 41.6, y: 18.6, rx: 7.4, ry: 4.3 },
        { kind: "label", x: 41.6, y: 25.3, labelId: "manage" },
      ],
    },
  ],
  account: [
    {
      id: "profile",
      annotations: [
        { kind: "circle", x: 50, y: 46.5, rx: 20.4, ry: 4.6 },
        { kind: "label", x: 47.5, y: 37.4, labelId: "planningName", align: "left" },
      ],
    },
  ],
};
