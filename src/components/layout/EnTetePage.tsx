// L'en-tête de toutes les pages, App et Back-Office (agencement v18, R1, R2, R3, R8 de
// docs/spec-agencement-v18.md ; planches `entete`, agencement_bo.py, et `tete`, agencement_app.py).
// A remplacé `PageTitle` et `EnTeteEntree` (retirés à la tranche Z). Dans l'ordre :
//   « ‹ Section » (retour), le titre (le seul h1 de la page) et son sous-titre de deux lignes au plus, à
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
//     onglets={<OngletsRail etiquette={t("taches.equipes")} onglets={equipes} />}
//   />

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { TOUCHER_RETOUR } from "@/lib/toucher44";

/** Le seul retour du site (R8) : « ‹ Section », 14 px gras gris, au-dessus du titre, à gauche. */
export function Retour({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`${TOUCHER_RETOUR} -ml-1 mb-1.5 inline-flex items-center gap-0.5 rounded-md text-[14px] leading-5 font-semibold text-muted-foreground transition-colors hover:text-foreground`}
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
  fond = "groupe",
}: {
  /** Le titre de la page : le h1, même place et même taille partout. Facultatif : en deux volets, une fiche
   *  (réunion, tâche) est le grand titre et la bande du haut ne garde que le retour et l'action. */
  titre?: ReactNode;
  /** Deux lignes au plus : il passe à la ligne, coupé par « … » seulement au-delà (compte-2). */
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
  /** Fond de la page (recette de surface, lot CD) : `groupe` (défaut) pose le gris `--fond-groupe` sur la page et les barres ;
   *  `blanc` pour une page de lecture (Harmonie, guide, chant). Posé ici et dans `DeuxVolets`, nulle part ailleurs. */
  fond?: "groupe" | "blanc";
}) {
  return (
    <header data-entete-page="" data-fond-groupe={fond === "groupe" ? "" : undefined} className="relative px-[var(--marge-page)] pb-5 pt-6">
      {/* Sans titre (fiche en deux volets) : l'action monte sur la ligne du retour. */}
      {!titre && !sousTitre ? (
        <div className="flex items-center gap-3">
          {retour && <Retour href={retour.href}>{retour.label}</Retour>}
          {(outils || action) && <div className="ml-auto flex shrink-0 items-center gap-2">{outils}{action}</div>}
        </div>
      ) : (<>
      {retour && <Retour href={retour.href}>{retour.label}</Retour>}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {titre && <h1 className="titre-page text-foreground">{titre}</h1>}
          {sousTitre && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{sousTitre}</p>}
        </div>
        {(outils || action) && (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {outils}
            {action}
          </div>
        )}
      </div>
      </>)}
      {onglets && <div className="mt-4">{onglets}</div>}
      {apres && <div className="mt-3">{apres}</div>}
    </header>
  );
}
