// « Champ à action » de la fiche d'une réunion (docs/spec-corrections-design/bo-reunions-taches.md, -4) : le lien du
// compte rendu et le sujet à ajouter se ressemblent. Aplat gris, sans bordure, 44 px ; le bouton d'action (36 px,
// `size="sm" className="h-9"`) est à l'intérieur, à droite.
export const CHAMP_ACTION =
  "flex h-11 items-center gap-2 rounded-full bg-secondary pl-3.5 pr-1 focus-within:ring-2 focus-within:ring-ring"

/** Le bouton dans le champ : 36 px, et désactivé il n'a que son texte grisé (pas d'aplat gris sur gris, -16). */
export const BOUTON_CHAMP_ACTION = "h-9 disabled:bg-transparent"
