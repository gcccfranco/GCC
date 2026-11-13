export const ANNONCE_SECTIONS = [
  "Culte Francophone",
  "Groupe Paix",
  "Groupe Fidélité",
  "Groupe Bonté",
] as const;
export type AnnonceSection = (typeof ANNONCE_SECTIONS)[number];

export interface AnnonceLink {
  label: string;
  url: string;
}
