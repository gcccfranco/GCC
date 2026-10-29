// BO-G (1, 2, 8) : la largeur de lecture commune des pages du Back-Office (À faire, page d'une équipe, Statistiques).
// Elle suit le jeton `--largeur-lecture` du site (1 440 px). Un seul conteneur autour de l'en-tête et du corps : les outils de l'en-tête et le dernier bloc du corps finissent
// sur le même bord droit, et aucune page n'a son propre plafond.
export function LargeurBO({ children }: { children: React.ReactNode }) {
  return <div data-largeur-bo="" className="max-w-[var(--largeur-lecture)]">{children}</div>;
}
