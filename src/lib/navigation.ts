// Navigation de l'app (lot U4, docs/spec-navigation-grand-ecran.md) : une seule liste
// d'entrées pour la barre du bas (téléphone, tablette en portrait) et la barre latérale
// (ordinateur, tablette en paysage), pour que les deux ne divergent jamais.
// U6 ajoute l'espace « back-office » (sélecteur App ↔ Back-Office, menu à 5 entrées depuis la piste A, BO1).
import {
  ArrowLeftRight, BookOpen, CalendarDays, CalendarRange, Drama, Guitar, Inbox, KeyboardMusic, ListChecks, ListMusic, Music,
  Network, Sparkles, Ticket, UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Entree } from "@/types/backOffice";
import { estReunion } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";

/** Espace montré par les barres. U4 ne remplit que "app" ; U6 ajoute "back-office" ; EM-2 ajoute "musiciens". */
export type Espace = "app" | "musiciens" | "back-office";

/** Une entrée, la même pour la barre latérale et la barre du bas. */
type EntreeBarre = {
  href: string;
  /** Libellé i18n. */
  cle: string;
  Icone: LucideIcon;
  /** Préfixes d'URL où l'entrée est la page courante. */
  actifSur: string[];
  /** Courante sur sa seule adresse, pas sur les pages en dessous (le tableau de bord, `/back-office`). */
  exact?: boolean;
  /** Préfixes d'URL, sous `actifSur`, où l'entrée n'est pas la page courante (Harmonie : ni les cours ni le RD-2000). */
  saufSur?: string[];
  /** Libellé court i18n, lu par la barre du bas seulement (« Théorie » pour « Théorie musicale »). */
  cleCourte?: string;
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

// Back-Office (U6, spec-back-office.md Q2-Q4) : le menu, aux adresses `/back-office/…` ; cinq
// entrées depuis la piste A (BO1) : À faire (le tableau de bord jusqu'à BO-B), Calendrier,
// Planning, Équipes, Messages.
const ENTREES_BACK_OFFICE: Record<Entree, EntreeBarre> = {
  afaire: { href: "/back-office", cle: "backOffice.entrees.afaire", Icone: ListChecks, actifSur: ["/back-office"], exact: true },
  calendrier: { href: "/back-office/calendrier", cle: "backOffice.entrees.calendrier", Icone: CalendarRange, actifSur: ["/back-office/calendrier"] },
  scene: { href: "/back-office/evenements/scene", cle: "backOffice.entrees.scene", Icone: Drama, actifSur: ["/back-office/evenements/scene"] },
  planning: { href: "/back-office/planning", cle: "backOffice.entrees.planning", Icone: CalendarDays, actifSur: ["/back-office/planning"] },
  equipes: { href: "/back-office/equipes", cle: "backOffice.entrees.equipes", Icone: Network, actifSur: ["/back-office/equipes"] },
  messages: { href: "/back-office/messages", cle: "backOffice.entrees.messages", Icone: Inbox, actifSur: ["/back-office/messages"] },
};

/** Une entrée du Back-Office (son libellé du menu, son icône, son adresse). */
export function entreeBackOffice(e: Entree): EntreeBarre {
  return ENTREES_BACK_OFFICE[e];
}

/** Où se gère un évènement au Back-Office (agencement v18, B15) : une réunion sous l'entrée
 *  Réunions, un évènement sous Évènements — un évènement d'équipe compris (lot E). Sa fiche est `${base}/<id>`. */
export function baseBackOffice(e: { pour: string; reunion?: boolean }): "/back-office/reunions" | "/back-office/evenements" {
  return estReunion(e) ? "/back-office/reunions" : "/back-office/evenements";
}

/** La fiche d'un évènement (retouches v18, lot G, G2) : une réunion à Back-Office › Réunions,
 *  tout autre évènement (d'équipe compris, lot E) dans l'App. Liens des rappels, des
 *  notifications et de la cloche. */
export function ficheEvenement(e: { id: string; pour: string; reunion?: boolean | null }): string {
  return `${estReunion(e) ? "/back-office/reunions" : "/evenements"}/${e.id}`;
}

/** « App » (BO2) : le dernier onglet de la barre du bas du Back-Office, le retour à l'espace app.
 *  Son adresse est celle de la dernière page vue côté app (`useDernierePage`) ; `/planning` ici n'est que la valeur par défaut. */
export const ONGLET_APP: EntreeBarre = {
  href: "/planning", cle: "backOffice.barre.app", Icone: ArrowLeftRight, actifSur: [],
};

/**
 * Onglets de la barre du bas du Back-Office (BO2) : cinq onglets fixes, À faire · Calendrier ·
 * Planning · Équipes · App, ceux que la personne a le droit de voir (Messages est une icône de
 * l'en-tête, pas un onglet). `app` = l'adresse du retour à l'app.
 */
export function ongletsBackOffice(permises: readonly Entree[], app: string = ONGLET_APP.href): EntreeBarre[] {
  const onglets = (["afaire", "calendrier", "planning", "equipes"] as const)
    .filter((e) => permises.includes(e))
    .map((e) => ENTREES_BACK_OFFICE[e]);
  return permises.length > 0 ? [...onglets, { ...ONGLET_APP, href: app }] : [];
}

/** Entrées de l'espace Musiciens (EM-2, spec-espace-musiciens.md) : accords, harmonie, théorie, RD-2000. */
export type EntreeMusiciens = "accords" | "harmonie" | "theorie" | "rd2000";

const ENTREES_MUSICIENS: Record<EntreeMusiciens, EntreeBarre> = {
  accords: { href: "/accords", cle: "musiciens.entrees.accords", Icone: Guitar, actifSur: ["/accords"] },
  harmonie: {
    href: "/harmonie", cle: "musiciens.entrees.harmonie", Icone: Sparkles, actifSur: ["/harmonie"],
    saufSur: ["/harmonie/cours", "/harmonie/rd2000"],
  },
  theorie: {
    href: "/harmonie/cours", cle: "musiciens.entrees.theorie", cleCourte: "musiciens.entrees.theorieCourt",
    Icone: BookOpen, actifSur: ["/harmonie/cours"],
  },
  rd2000: { href: "/harmonie/rd2000", cle: "musiciens.entrees.rd2000", Icone: KeyboardMusic, actifSur: ["/harmonie/rd2000"] },
};

/** Les entrées de l'espace Musiciens que les droits donnent (Q2) : tout musicien a Accords ; Harmonie et Théorie
 *  musicale demandent `peut` (piano ou guitare), le RD-2000 `piano`. Un non-musicien : aucune. */
export function entreesMusiciens(acces: { musicien: boolean; peut: boolean; piano: boolean }): EntreeMusiciens[] {
  if (!acces.musicien) return [];
  return [
    "accords",
    ...(acces.peut ? (["harmonie", "theorie"] as const) : []),
    ...(acces.piano ? (["rd2000"] as const) : []),
  ];
}

/** Onglets de la barre du bas de l'espace Musiciens : ses entrées, puis « App » (comme `ongletsBackOffice`). */
export function ongletsMusiciens(permises: readonly EntreeMusiciens[], app: string = ONGLET_APP.href): EntreeBarre[] {
  return permises.length > 0
    ? [...permises.map((e) => ENTREES_MUSICIENS[e]), { ...ONGLET_APP, href: app }]
    : [];
}

/** L'espace d'une adresse, sans les droits : `/back-office…` au Back-Office, `/accords…` et `/harmonie…` chez les
 *  musiciens. Ce que montrent les barres passe par `espaceAffiche`. */
export function espaceDe(pathname: string): Espace {
  const p = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const sous = (base: string) => p === base || p.startsWith(`${base}/`);
  if (sous("/back-office")) return "back-office";
  if (sous("/accords") || sous("/harmonie")) return "musiciens";
  return "app";
}

/** L'espace que les barres dessinent : celui de l'adresse, sauf « musiciens » ramené à « app » pour qui n'est pas musicien. */
export function espaceAffiche(pathname: string, { musicien }: { musicien: boolean }): Espace {
  const espace = espaceDe(pathname);
  return espace === "musiciens" && !musicien ? "app" : espace;
}

/**
 * Entrées des barres pour un espace. `backOffice` = interrupteur `BACK_OFFICE`
 * (lot 18) : coupé, la section Évènements n'est pas en ligne, ni le Back-Office.
 * `permises` = `entreesBackOffice` (access.ts), lu pour l'espace « back-office ».
 */
export function entreesBarre(
  espace: Espace,
  ctx: { connecte: boolean; backOffice: boolean; permises?: readonly Entree[]; musiciens?: readonly EntreeMusiciens[] },
): EntreeBarre[] {
  if (espace === "musiciens") {
    return ctx.connecte ? (ctx.musiciens ?? []).map((e) => ENTREES_MUSICIENS[e]) : [];
  }
  if (espace === "back-office") {
    return ctx.backOffice && ctx.connecte ? (ctx.permises ?? []).map((e) => ENTREES_BACK_OFFICE[e]) : [];
  }
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
  // `trailingSlash` (next.config) : « /back-office/ » est la page « /back-office ».
  const p = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (entree.saufSur?.some((m) => p === m || p.startsWith(`${m}/`))) return false;
  return entree.actifSur.some((m) => p === m || (!entree.exact && p.startsWith(`${m}/`)));
}

/** Clé i18n du label contextuel « GCC <label> » (décisions du 15/09/2026, gelées). */
export function labelDeSection(pathname: string, musicien = false): string {
  if (BACK_OFFICE && pathname.startsWith("/back-office")) return "common.header.backOffice";
  if (musicien && espaceDe(pathname) === "musiciens") return "common.header.musiciens";
  if (pathname.startsWith("/planning")) return "common.header.planning";
  if (pathname.startsWith("/mes-services")) return "common.header.service";
  if (pathname.startsWith("/evenements")) return "common.header.evenements";
  if (pathname.startsWith("/taches")) return "common.header.taches";
  return "common.header.louange";
}
