// L'en-tête de toutes les pages, App et Back-Office (agencement v18, R1, R2, R3, R8 de
// docs/spec-agencement-v18.md ; planches `entete`, agencement_bo.py, et `tete`, agencement_app.py).
// Remplace `PageTitle` et `EnTeteEntree` (retirés à la tranche Z). Dans l'ordre :
//   « ‹ Section » (retour), le titre (le seul h1 de la page) et son sous-titre d'une ligne, à
//   droite les outils puis l'action principale, dessous les onglets (rail), puis une rangée libre
//   (`apres` : filtres, période, interrupteur).
// Il porte la marge de la zone (`--marge-page`) et les 20 px qui le séparent du contenu : la page
// le pose en haut de sa zone, sans marge autour, puis son contenu (deux volets, grille, lecture).
// Toujours au-dessus des deux volets ; la fiche du volet de droite se titre en h2 de 24 px.
//
//   <EnTetePage
//     titre={t("taches.titre")}
//     sousTitre={t("taches.sousTitre")}
//     action={<BoutonNouveau label={t("taches.nouvelle")} href="/back-office/taches/da/nouvelle" />}
//     onglets={<OngletsRail etiquette={t("taches.poles")} onglets={poles} />}
//   />

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/** Le seul retour du site (R8) : « ‹ Section », 14 px gras gris, au-dessus du titre, à gauche. */
export function Retour({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 mb-1.5 inline-flex items-center gap-0.5 rounded-md text-[14px] leading-5 font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden />
      {children}
    </Link>
  );
}

export function EnTetePage({
  titre,
  sousTitre,
  retour,
  outils,
  action,
  onglets,
  apres,
}: {
  /** Le titre de la page : le h1, même place et même taille partout. */
  titre: ReactNode;
  /** Une ligne, coupée par « … » si elle ne tient pas. */
  sousTitre?: ReactNode;
  /** « ‹ Section » : une page qui dépend d'une autre (Mon profil › Moi, une fiche sur téléphone). */
  retour?: { href: string; label: ReactNode };
  /** Boutons secondaires (contour) et « ⋯ » (`MenuActions`), avant l'action principale. */
  outils?: ReactNode;
  /** L'action principale, une par page : `BoutonNouveau` (rond fixe sur téléphone). */
  action?: ReactNode;
  /** Les onglets de section ou de vue : `OngletsRail`. */
  onglets?: ReactNode;
  /** Une rangée libre sous les onglets : `Pilules`, période, interrupteur. */
  apres?: ReactNode;
}) {
  return (
    <header data-entete-page="" className="relative px-[var(--marge-page)] pb-5 pt-6">
      {retour && <Retour href={retour.href}>{retour.label}</Retour>}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="titre-page text-foreground">{titre}</h1>
          {sousTitre && <p className="mt-1 truncate text-[14px] leading-5 text-muted-foreground">{sousTitre}</p>}
        </div>
        {(outils || action) && (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {outils}
            {action}
          </div>
        )}
      </div>
      {onglets && <div className="mt-4">{onglets}</div>}
      {apres && <div className="mt-3">{apres}</div>}
    </header>
  );
}
