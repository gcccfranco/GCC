import type { SetlistVersions, VersionItem } from "@/lib/firebase/setlistVersions";
import { structureWithCopies } from "@/lib/setlist/sectionOrigins";

// Version d'un chant affichée à une personne (docs/spec-version-perso.md, V3) :
// la présidence, la sienne, ou celle qu'un autre a partagée et qu'elle a
// choisie. Tout est calculé depuis les documents `setlists/{id}/versions`.

export const PRESIDENCE = "presidence";

export type SongVersionView = {
  /** Ma version (structure appliquée au corps, badge, partage). */
  mine?: VersionItem;
  /** Qui est affiché. */
  shown: "presidence" | "mine" | "other";
  /** Nom de l'auteur affiché, quand c'est un autre. */
  shownName?: string;
  /** Accords et paroles affichés ; `null` = ceux de la présidence. */
  content: string | null;
  /** Valeur du sélecteur : `"presidence"` ou l'uid de l'auteur. */
  value: string;
  /** Choix proposés ; un sélecteur n'a de sens qu'à partir de deux. */
  options: { value: string; kind: "presidence" | "mine" | "other"; name?: string }[];
  /** Structure du corps du chant : la mienne, et les passages retouchés seuls
   *  de la version affichée (« Seulement ce passage ») à leur place ;
   *  `null` = la structure jouée par la présidence suffit. */
  bodyStructure: string[] | null;
};

export function songVersionView(
  slug: string,
  uid: string,
  versions: Record<string, SetlistVersions>,
  /** De quoi situer les passages retouchés seuls de la version affichée :
   *  structure jouée par la présidence, sinon l'ordre des sections du chant. */
  presidency?: { structure?: string[] | null; sectionIds?: string[] },
): SongVersionView {
  const mine = versions[uid]?.items[slug];
  const options: SongVersionView["options"] = [{ value: PRESIDENCE, kind: "presidence" }];
  if (mine?.content) options.push({ value: uid, kind: "mine" });
  for (const [author, doc] of Object.entries(versions)) {
    const item = doc.items[slug];
    if (author !== uid && item?.shared && item.content) {
      options.push({ value: author, kind: "other", name: doc.authorName });
    }
  }

  // Le choix enregistré, s'il est encore proposé (une version retirée du
  // partage ramène à la présidence) ; sinon la mienne, sinon la présidence.
  const choice = versions[uid]?.choices[slug];
  const chosen =
    options.find((o) => o.value === choice) ??
    options.find((o) => o.kind === "mine") ??
    options[0];

  const chosenItem =
    chosen.kind === "mine" ? mine : chosen.kind === "other" ? versions[chosen.value].items[slug] : undefined;
  const content = chosenItem?.content ?? null;

  // Passages retouchés seuls : ils se placent dans la structure que je suis
  // (la mienne, sinon celle de la présidence, sinon l'ordre du chant).
  const origins = chosenItem?.sectionOrigins;
  const reader = mine?.structure ?? presidency?.structure ?? presidency?.sectionIds;
  const bodyStructure =
    origins && Object.keys(origins).length > 0 && chosenItem?.structure && reader
      ? structureWithCopies(reader, chosenItem.structure, origins)
      : mine?.structure ?? null;

  return { mine, shown: chosen.kind, shownName: chosen.name, content, value: chosen.value, options, bodyStructure };
}
