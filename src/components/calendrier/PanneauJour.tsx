"use client";

// Le jour choisi (lot U8, C3, planche bo-calendrier) : une carte par entrée — nom
// de la source en couleur, titre, détail — qui ouvre sa fiche. Une entrée du Sheet
// est en lecture seule : elle le dit et ouvre l'onglet du mois. Le même contenu
// sert le panneau de droite (ordinateur, tablette couchée) et la feuille (ailleurs).
// C5 : en bas, les deux boutons de création (`BoutonsCreation`), selon les droits.
// Agencement v18 (B5) : dans le volet du jour à droite, « Ajouter ce jour-là » et son menu
// (`AjouterCeJour` : évènement, tâche, réunion) en tête ; la feuille du jour et la feuille
// « Créer » du téléphone gardent les boutons, réunion comprise.
// C6 : « Déplacer… » sous une carte déplaçable.
// Un service dit sa setlist publiée (« Setlist « Culte du 11 octobre » · 4 chants », planche
// bo-calendrier, pastille Setlists éteinte ou non) ; à venir, ses cases vides en orange
// (« Cases vides : Batterie, Sono », calcul du widget 4 de U6), pour les plannings qu'on
// remplit ou publie. Une tâche répétée dit « Change la répétition dans la tâche » (Q6).

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronDown, Plus } from "lucide-react";
import { jourCourt } from "@/lib/calendrier/grille";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";
import type { EntreeCalendrier } from "@/lib/calendrier/entrees";
import { COULEURS_CALENDRIER } from "@/lib/calendrier/entrees";
import { couleurSource } from "./apparence";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const POINT: Partial<Record<EntreeCalendrier["source"], string>> = {
  evenements: COULEURS_CALENDRIER.evenements.point,
  taches: COULEURS_CALENDRIER.taches.point,
};

function Carte({ e, onDeplacer }: { e: EntreeCalendrier; onDeplacer?: (e: EntreeCalendrier) => void }) {
  const { t } = useTranslation();
  // Planche : un service se nomme par sa catégorie (« Culte Franco »), sa présidence en
  // titre ; le petit déj, par la source, le nom inscrit (ou « Libre ») en titre.
  const parTitre = e.source === "services" || e.source === "petitDej";
  const source = parTitre ? e.titre : t(`calendrier.carte.${e.source}`);
  const titre = parTitre ? e.detail || e.titre : e.titre;
  const detail = parTitre ? "" : e.detail;
  const contenu = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: couleurSource(e) }}>
        {POINT[e.source] && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: POINT[e.source] }} />}
        {source}
      </span>
      <span className="mt-0.5 block font-bold leading-snug text-foreground">{titre}</span>
      {detail && <span className="mt-0.5 block text-sm text-muted-foreground">{detail}</span>}
      {e.setlist && (
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {t("calendrier.setlistDuService", { titre: e.setlist.titre, count: e.setlist.chants })}
        </span>
      )}
      {e.vides && (
        <span className="mt-1 block text-sm text-amber-700 dark:text-amber-400">
          {t("calendrier.casesVides", { liste: e.vides.map((cle) => t(cle)).join(", ") })}
        </span>
      )}
      {e.duSheet && <span className="mt-1 block text-xs text-muted-foreground">{t("calendrier.duSheet")}</span>}
    </>
  );
  const classe =
    "block rounded-2xl px-3.5 py-3 transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
  return (
    <div className="raised rounded-2xl">
      {e.duSheet ? (
        <a href={e.lien} target="_blank" rel="noopener noreferrer" className={classe}>
          {contenu}
        </a>
      ) : (
        <Link href={e.lien} className={classe}>
          {contenu}
        </Link>
      )}
      {/* C6 : « Déplacer… » sur les entrées déplaçables (la voie sans glisser, Q5). */}
      {e.repetee && onDeplacer && (
        <p className="-mt-1.5 px-3.5 pb-2.5 text-right text-[13px] text-muted-foreground">{t("calendrier.deplacer.repetee")}</p>
      )}
      {e.deplacable && onDeplacer && (
        <div className="-mt-1.5 flex justify-end px-2 pb-2">
          <button
            type="button"
            onClick={() => onDeplacer(e)}
            className="rounded-full bg-secondary px-3 py-1 text-[13px] font-semibold text-foreground transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {t("calendrier.deplacer.bouton")}
          </button>
        </div>
      )}
    </div>
  );
}

export function ListeDuJour({ entrees, onDeplacer }: { entrees: EntreeCalendrier[]; onDeplacer?: (e: EntreeCalendrier) => void }) {
  const { t } = useTranslation();
  if (entrees.length === 0) return <p className="text-sm text-muted-foreground">{t("calendrier.rien")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {entrees.map((e) => (
        <li key={e.cle}>
          <Carte e={e} onDeplacer={onDeplacer} />
        </li>
      ))}
    </ul>
  );
}

const BOUTON =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** Qui peut créer quoi depuis un jour : un évènement (un public hors réunions lui est ouvert), une
 *  réunion (un pôle ou une équipe), une tâche (un de ses pôles). */
export type DroitsCreation = { evenement: boolean; reunion: boolean; tache: boolean };

const lienEvenement = (date: string) => `/back-office/evenements/nouveau?date=${date}`;
const lienReunion = (date: string) => `/back-office/evenements/nouveau?reunion=1&date=${date}`;

/** « Nouvel évènement le 11/10 » (plein, encre), « Nouvelle tâche pour le 11/10 » et « Nouvelle
 *  réunion le 11/10 » (planche bo-calendrier, Q4) : chacun seulement pour qui a le droit. Les liens
 *  ouvrent le formulaire du Back-Office à cette date ; la tâche, son formulaire (`onNouvelleTache`). */
export function BoutonsCreation({ date, lang, droits, onNouvelleTache }: {
  date: string;
  lang: NotifLang;
  droits: DroitsCreation;
  onNouvelleTache: () => void;
}) {
  const { t } = useTranslation();
  if (!droits.evenement && !droits.reunion && !droits.tache) return null;
  const jour = jourCourt(date, lang);
  return (
    <div className="flex flex-col gap-2">
      {droits.evenement && (
        <Link href={lienEvenement(date)} className={cn(BOUTON, "bg-foreground text-background")}>
          <Plus aria-hidden className="h-4 w-4 shrink-0" />
          {t("calendrier.nouvelEvenement", { date: jour })}
        </Link>
      )}
      {droits.tache && (
        <button type="button" onClick={onNouvelleTache} className={cn(BOUTON, "bg-secondary text-foreground")}>
          <Plus aria-hidden className="h-4 w-4 shrink-0" />
          {t("calendrier.nouvelleTache", { date: jour })}
        </button>
      )}
      {droits.reunion && (
        <Link href={lienReunion(date)} className={cn(BOUTON, "bg-secondary text-foreground")}>
          <Plus aria-hidden className="h-4 w-4 shrink-0" />
          {t("calendrier.nouvelleReunion", { date: jour })}
        </Link>
      )}
    </div>
  );
}

/** « Ajouter ce jour-là » et son menu (agencement v18, B5, planche v18-bo-calendrier-agenda-a) : les
 *  mêmes trois créations que `BoutonsCreation`, en un bouton, en tête du volet du jour. */
export function AjouterCeJour({ date, lang, droits, onNouvelleTache }: {
  date: string;
  lang: NotifLang;
  droits: DroitsCreation;
  onNouvelleTache: () => void;
}) {
  const { t } = useTranslation();
  if (!droits.evenement && !droits.reunion && !droits.tache) return null;
  const jour = jourCourt(date, lang);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-foreground pl-3 pr-2.5 text-[13.5px] font-semibold text-background transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
        <Plus aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.4} />
        {t("calendrier.ajouterCeJour")}
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        {droits.evenement && (
          <DropdownMenuItem asChild>
            <Link href={lienEvenement(date)}>{t("calendrier.nouvelEvenement", { date: jour })}</Link>
          </DropdownMenuItem>
        )}
        {droits.tache && (
          <DropdownMenuItem onSelect={onNouvelleTache}>{t("calendrier.nouvelleTache", { date: jour })}</DropdownMenuItem>
        )}
        {droits.reunion && (
          <DropdownMenuItem asChild>
            <Link href={lienReunion(date)}>{t("calendrier.nouvelleReunion", { date: jour })}</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
