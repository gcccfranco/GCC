// Navigation de l'app (lot U4, docs/spec-navigation-grand-ecran.md) : une seule liste
// d'entrées pour la barre du bas (téléphone, tablette en portrait) et la barre latérale
// (ordinateur, tablette en paysage), pour que les deux ne divergent jamais.
// U6 ajoute l'espace « back-office » (sélecteur App ↔ Back-Office, menu à 8 entrées).
import {
  CalendarDays, CalendarRange, ChartColumn, Ellipsis, Inbox, LayoutGrid, ListChecks, ListMusic, Music, Network, Ticket, UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Entree } from "@/types/backOffice";

/** Vocabulaire commun du chantier U ; choisie par le CSS (globals.css, bloc « Lot U4 »),
 *  jamais par l'agent utilisateur. */
export type Disposition = "telephone" | "tablette-portrait" | "tablette-paysage" | "ordinateur";

/** Espace montré par les barres. U4 ne remplit que "app" ; U6 ajoute "back-office". */
export type Espace = "app" | "back-office";

/** Une entrée, la même pour la barre latérale et la barre du bas. */
export type EntreeBarre = {
  href: string;
  /** Libellé i18n. */
  cle: string;
  Icone: LucideIcon;
  /** Préfixes d'URL où l'entrée est la page courante. */
  actifSur: string[];
  /** Courante sur sa seule adresse, pas sur les pages en dessous (le tableau de bord, `/back-office`). */
  exact?: boolean;
};

// Chants et Setlists ont chacun leur entrée (décision du 16/09/2026 : un onglet
// « Louange » cachait les setlists, injoignables sur tactile). « Moi » est la porte
// de tout ce qui me concerne : services, profil, guide, réglages, déconnexion.
const ENTREES_MEMBRE: EntreeBarre[] = [
  { href: "/songs", cle: "common.header.songs", Icone: Music, actifSur: ["/songs"] },
  { href: "/setlists", cle: "common.header.setlists", Icone: ListMusic, actifSur: ["/setlists"] },
  { href: "/planning", cle: "common.header.planning", Icone: CalendarDays, actifSur: ["/planning"] },
  { href: "/evenements", cle: "common.header.evenements", Icone: Ticket, actifSur: ["/evenements"] },
  { href: "/moi", cle: "common.header.moi", Icone: UserRound, actifSur: ["/moi", "/mes-services", "/taches", "/profil", "/guide", "/questionnaire", "/notifier", "/admin"] },
];

// Sans compte : les chants et le calendrier public (décision Q10 du lot 6).
const ENTREES_VISITEUR: EntreeBarre[] = [
  { href: "/songs", cle: "common.header.songs", Icone: Music, actifSur: ["/songs"] },
  { href: "/evenements", cle: "common.header.evenements", Icone: Ticket, actifSur: ["/evenements"] },
];

// Back-Office (U6, spec-back-office.md Q2-Q4) : le menu à 8 entrées, aux adresses `/back-office/…`.
const ENTREES_BACK_OFFICE: Record<Entree, EntreeBarre> = {
  tableau: { href: "/back-office", cle: "backOffice.entrees.tableau", Icone: LayoutGrid, actifSur: ["/back-office"], exact: true },
  calendrier: { href: "/back-office/calendrier", cle: "backOffice.entrees.calendrier", Icone: CalendarRange, actifSur: ["/back-office/calendrier"] },
  planning: { href: "/back-office/planning", cle: "backOffice.entrees.planning", Icone: CalendarDays, actifSur: ["/back-office/planning"] },
  taches: { href: "/back-office/taches", cle: "backOffice.entrees.taches", Icone: ListChecks, actifSur: ["/back-office/taches"] },
  evenements: { href: "/back-office/evenements", cle: "backOffice.entrees.evenements", Icone: Ticket, actifSur: ["/back-office/evenements"] },
  equipes: { href: "/back-office/equipes", cle: "backOffice.entrees.equipes", Icone: Network, actifSur: ["/back-office/equipes"] },
  messages: { href: "/back-office/messages", cle: "backOffice.entrees.messages", Icone: Inbox, actifSur: ["/back-office/messages"] },
  statistiques: { href: "/back-office/statistiques", cle: "backOffice.entrees.statistiques", Icone: ChartColumn, actifSur: ["/back-office/statistiques"] },
};

/** Une entrée du Back-Office (son libellé du menu, son icône, son adresse). */
export function entreeBackOffice(e: Entree): EntreeBarre {
  return ENTREES_BACK_OFFICE[e];
}

/** « Plus » (B6) : toujours à droite de la barre du bas du Back-Office. */
export const ONGLET_PLUS: EntreeBarre = {
  href: "/back-office/plus", cle: "backOffice.barre.plus", Icone: Ellipsis, actifSur: ["/back-office/plus"],
};

/**
 * Onglets de la barre du bas du Back-Office (B6, Q13) : la barre choisie (`barreAffichee`),
 * le tableau de bord sous le nom « Accueil » (planche), puis « Plus ».
 */
export function ongletsBackOffice(barre: readonly Entree[]): EntreeBarre[] {
  return [...barre.map((e) => ({ ...ENTREES_BACK_OFFICE[e], cle: cleOnglet(e) })), ONGLET_PLUS];
}

/** Libellé d'une entrée dans la barre du bas : le tableau de bord s'y appelle « Accueil ». */
export function cleOnglet(e: Entree): string {
  return e === "tableau" ? "backOffice.barre.accueil" : ENTREES_BACK_OFFICE[e].cle;
}

/** L'espace d'une adresse : tout ce qui est sous `/back-office` est au Back-Office. */
export function espaceDe(pathname: string): Espace {
  return pathname === "/back-office" || pathname.startsWith("/back-office/") ? "back-office" : "app";
}

/**
 * Entrées des barres pour un espace. `backOffice` = interrupteur `BACK_OFFICE`
 * (lot 18) : coupé, la section Évènements n'est pas en ligne, ni le Back-Office.
 * `permises` = `entreesBackOffice` (access.ts), lu pour l'espace « back-office ».
 */
export function entreesBarre(
  espace: Espace,
  ctx: { connecte: boolean; backOffice: boolean; permises?: readonly Entree[] },
): EntreeBarre[] {
  if (espace === "back-office") {
    return ctx.backOffice && ctx.connecte ? (ctx.permises ?? []).map((e) => ENTREES_BACK_OFFICE[e]) : [];
  }
  const entrees = ctx.connecte ? ENTREES_MEMBRE : ENTREES_VISITEUR;
  return entrees.filter((e) => ctx.backOffice || e.href !== "/evenements");
}

/** Vrai si `pathname` est la page de l'entrée (ou l'une de ses sous-pages). */
export function estEntreeActive(entree: EntreeBarre, pathname: string): boolean {
  // `trailingSlash` (next.config) : « /back-office/ » est la page « /back-office ».
  const p = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return entree.actifSur.some((m) => p === m || (!entree.exact && p.startsWith(`${m}/`)));
}

/** Clé i18n du label contextuel « GCC <label> » (décisions du 15/09/2026, gelées). */
export function labelDeSection(pathname: string): string {
  if (pathname.startsWith("/planning")) return "common.header.planning";
  if (pathname.startsWith("/mes-services")) return "common.header.service";
  if (pathname.startsWith("/evenements")) return "common.header.evenements";
  if (pathname.startsWith("/taches")) return "common.header.taches";
  return "common.header.louange";
}
