/** Ce qui a été annoncé d'un trimestre : les cases non vides (`AAAA-MM-JJ|clé` → valeur). */
export type EtatAnnonce = {
  cases: Record<string, string>
  /** Date de la dernière écriture de l'état, et son auteur (uid). */
  le?: string
  par?: string
  /** Date de la publication (posée seulement après « Publier le T… », PG37 a). */
  publieLe?: string
}

/** Une date où la personne sert, tirée du planning (`datesServies`, src/lib/planning/names.ts). `moment` : Campus. */
export type DateServie = { date: string; categorie: string; moment?: "matin" | "soir" };
