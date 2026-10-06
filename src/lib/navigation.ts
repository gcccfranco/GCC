// Navigation de l'app (lot U4, docs/spec-navigation-grand-ecran.md) : une seule liste
// d'entrées pour la barre du bas (téléphone, tablette en portrait) et la barre latérale
// (ordinateur, tablette en paysage), pour que les deux ne divergent jamais.
// U6 ajoute l'espace « back-office » (sélecteur App ↔ Back-Office, menu à 8 entrées).
import { CalendarDays, ListMusic, Music, Ticket, UserRound, type LucideIcon } from "lucide-react";

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

/**
 * Entrées des barres pour un espace. `backOffice` = interrupteur `BACK_OFFICE`
 * (lot 18) : coupé, la section Évènements n'est pas en ligne.
 */
export function entreesBarre(espace: Espace, ctx: { connecte: boolean; backOffice: boolean }): EntreeBarre[] {
  // U4 : seul l'espace « app » existe ; U6 rendra ici les entrées du back-office.
  void espace;
  const entrees = ctx.connecte ? ENTREES_MEMBRE : ENTREES_VISITEUR;
  return entrees.filter((e) => ctx.backOffice || e.href !== "/evenements");
}

/** Liste des setlists telle qu'on l'a quittée (onglet, recherche, catégorie), retenue
 *  pour l'onglet du navigateur par `useSetlistsNavState`. Sur une setlist, l'entrée
 *  « Setlists » de la barre latérale y ramène : en deux volets, il n'y a plus de Retour
 *  (lot U5, docs/spec-deux-volets.md, Q7). */
export const CLE_LISTE_SETLISTS = "setlistsListPath";

export function listeSetlistsRetenue(): string {
  try {
    const p = sessionStorage.getItem(CLE_LISTE_SETLISTS);
    if (p && /^\/setlists\/?(\?|$)/.test(p)) return p;
  } catch { /* stockage indisponible */ }
  return "/setlists";
}

/** Vrai si `pathname` est la page de l'entrée (ou l'une de ses sous-pages). */
export function estEntreeActive(entree: EntreeBarre, pathname: string): boolean {
  return entree.actifSur.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

/** Clé i18n du label contextuel « GCC <label> » (décisions du 15/09/2026, gelées). */
export function labelDeSection(pathname: string): string {
  if (pathname.startsWith("/planning")) return "common.header.planning";
  if (pathname.startsWith("/mes-services")) return "common.header.service";
  if (pathname.startsWith("/evenements")) return "common.header.evenements";
  if (pathname.startsWith("/taches")) return "common.header.taches";
  return "common.header.louange";
}
