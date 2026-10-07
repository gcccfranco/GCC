"use client";

// Le cadre commun des widgets du tableau de bord (lot U6, B4, planche `bo-tableau-de-bord`) :
// carte en relief, titre avec son icône et, à droite, un complément (« Culte Franco »,
// « 1 en retard », « Tout voir ») ; des rangées séparées d'un filet. En personnalisation (B5),
// le tableau de bord lui passe par `EditionWidgetContext` sa barre d'outils et de quoi le glisser.
import { createContext, useContext } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Taille, WidgetId } from "@/types/backOffice";

/** Q10 : grille de 4 (ordinateur, tablette couchée) S = 1, M = 2, L = 4 colonnes ; grille de 2
 *  (tablette en portrait) S et M = 1, L = 2 ; téléphone, une colonne. Voir `GRILLE_WIDGETS`. */
const CLASSE_TAILLE: Record<Taille, string> = {
  s: "col-span-1",
  m: "col-span-1 [@media(pointer:fine)_and_(min-width:1024px)]:col-span-2 [@media(pointer:coarse)_and_(orientation:landscape)_and_(min-width:1024px)]:col-span-2",
  l: "col-span-full",
};

/** La grille : 1 colonne, 2 dès 640 px, 4 sur grand écran (les mêmes requêtes que la barre latérale de U4).
 *  Agencement v18 (B14) : en grand, hors personnalisation, les colonnes de `TableauDeBord` la remplacent ;
 *  elle reste en personnalisation (le glisser-déposer la demande), sur tablette et sur téléphone. */
export const GRILLE_WIDGETS =
  "grid grid-cols-1 items-start gap-4 [grid-auto-flow:row_dense] sm:grid-cols-2 [@media(pointer:fine)_and_(min-width:1024px)]:grid-cols-4 [@media(pointer:coarse)_and_(orientation:landscape)_and_(min-width:1024px)]:grid-cols-4";

/** Personnalisation (B5) : la carte se glisse (`setNodeRef`, `style`) et porte, en tête, la
 *  barre d'outils et les réglages (`outils`, absent hors personnalisation). En colonnes (v18, B14) :
 *  `style` place la carte dans sa colonne et `colonne` la nomme (`data-colonne`, 0 = la large). */
export type EditionWidget = {
  setNodeRef: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
  enMouvement: boolean;
  outils: React.ReactNode | null;
  colonne?: number;
};
export const EditionWidgetContext = createContext<EditionWidget | null>(null);

export function CadreWidget({
  id, taille, nom, titre, Icone, complement, children,
}: {
  id: WidgetId;
  taille: Taille;
  /** Nom du widget (nom de la région) ; `titre` peut le compléter (« Ce dimanche · 4 octobre »). */
  nom: string;
  titre?: string;
  Icone: LucideIcon;
  complement?: React.ReactNode;
  children: React.ReactNode;
}) {
  const edition = useContext(EditionWidgetContext);
  return (
    <section
      ref={edition?.setNodeRef} style={edition?.style} aria-label={nom} data-widget={id} data-colonne={edition?.colonne}
      className={cn(
        "raised min-h-[120px] min-w-0 rounded-[18px] px-[18px] py-4", CLASSE_TAILLE[taille],
        // Planche : contour pointillé en personnalisation ; la carte saisie passe devant.
        edition?.outils && "outline-dashed outline-2 -outline-offset-2 outline-muted-foreground/30",
        edition?.enMouvement && "relative z-10 shadow-lg",
      )}
    >
      {edition?.outils}
      <div className="mb-2.5 flex items-center gap-2">
        <Icone className="h-4 w-4 shrink-0 text-foreground/80" aria-hidden />
        <h3 className="text-[15px] font-semibold leading-snug text-foreground">{titre ?? nom}</h3>
        {complement && <span className="ml-auto min-w-0 text-right text-[13px] font-semibold text-muted-foreground">{complement}</span>}
      </div>
      {children}
    </section>
  );
}

/** Une rangée : texte à gauche, détail en petit à droite. */
export function Rangee({
  testId, href, externe, detail, ton, children,
}: {
  testId?: string;
  href?: string;
  /** Lien hors du site (l'onglet du Sheet des évènements) : un nouvel onglet. */
  externe?: boolean;
  detail?: React.ReactNode;
  /** Couleur du détail : à surveiller (orange) ou en retard (rouge). */
  ton?: "warn" | "bad";
  children: React.ReactNode;
}) {
  const classes = "flex min-w-0 items-center gap-2.5 border-t border-border/60 py-[7px] text-sm text-foreground first:border-t-0";
  const contenu = (
    <>
      <span className="min-w-0 flex-1 break-words">{children}</span>
      {detail !== undefined && (
        <span className={cn("shrink-0 whitespace-nowrap text-xs text-muted-foreground", ton && TON[ton])}>{detail}</span>
      )}
    </>
  );
  if (href && externe) {
    return <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId} className={cn(classes, "hover:text-muted-foreground")}>{contenu}</a>;
  }
  if (href) {
    return <Link href={href} data-testid={testId} className={cn(classes, "hover:text-muted-foreground")}>{contenu}</Link>;
  }
  return <div data-testid={testId} className={classes}>{contenu}</div>;
}

const TON = {
  warn: "font-semibold text-amber-700 dark:text-amber-400",
  bad: "font-semibold text-red-700 dark:text-red-400",
};

/** Pastille d'état (« Setlist publiée », « 1 case vide »). */
export function Pastille({ ton, Icone, children }: { ton: "ok" | "warn"; Icone: LucideIcon; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold",
      ton === "ok" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    )}>
      <Icone className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

/** Lecture en cours, en échec, ou rien à montrer. */
export function Message({ children, erreur }: { children: React.ReactNode; erreur?: boolean }) {
  return <p role={erreur ? "alert" : undefined} className="text-sm text-muted-foreground">{children}</p>;
}

/** Lien en tête de widget (« Tout voir », « Voir la liste »). */
export function LienTete({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="hover:text-foreground">{children}</Link>;
}

const locale = (lang: string) => (lang === "zh-CN" ? "zh-CN" : "fr-FR");
const date = (iso: string) => new Date(`${iso}T12:00:00`);

/** « 4 oct. » */
export const jourCourt = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short" }).format(date(iso));
/** « 4 octobre » */
export const jourLong = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long" }).format(date(iso));
/** « sam. 10/10 » */
export const jourSemaine = (iso: string, lang: string) =>
  `${new Intl.DateTimeFormat(locale(lang), { weekday: "short" }).format(date(iso))} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
/** « 28/09 » */
export const jourMois = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
