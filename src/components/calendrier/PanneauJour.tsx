"use client";

// Le jour choisi (lot U8, C3, planche bo-calendrier) : une carte par entrée — nom
// de la source en couleur, titre, détail — qui ouvre sa fiche. Une entrée du Sheet
// est en lecture seule : elle le dit et ouvre l'onglet du mois. Le même contenu
// sert le panneau de droite (ordinateur, tablette couchée) et la feuille (ailleurs).
// C5 : en bas, les deux boutons de création (`BoutonsCreation`), selon les droits.
// « Déplacer… » (C6) viendra ici.

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { jourCourt } from "@/lib/calendrier/grille";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";
import type { EntreeCalendrier } from "@/lib/calendrier/entrees";
import { COULEURS_CALENDRIER } from "@/lib/calendrier/entrees";
import { couleurSource } from "./apparence";

const POINT: Partial<Record<EntreeCalendrier["source"], string>> = {
  evenements: COULEURS_CALENDRIER.evenements.point,
  taches: COULEURS_CALENDRIER.taches.point,
};

function Carte({ e }: { e: EntreeCalendrier }) {
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
      {e.duSheet && <span className="mt-1 block text-xs text-muted-foreground">{t("calendrier.duSheet")}</span>}
    </>
  );
  const classe =
    "raised block rounded-2xl px-3.5 py-3 transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
  return e.duSheet ? (
    <a href={e.lien} target="_blank" rel="noopener noreferrer" className={classe}>
      {contenu}
    </a>
  ) : (
    <Link href={e.lien} className={classe}>
      {contenu}
    </Link>
  );
}

export function ListeDuJour({ entrees }: { entrees: EntreeCalendrier[] }) {
  const { t } = useTranslation();
  if (entrees.length === 0) return <p className="text-sm text-muted-foreground">{t("calendrier.rien")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {entrees.map((e) => (
        <li key={e.cle}>
          <Carte e={e} />
        </li>
      ))}
    </ul>
  );
}

const BOUTON =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** « Nouvel évènement le 11/10 » (plein, encre) et « Nouvelle tâche pour le 11/10 » (planche
 *  bo-calendrier, Q4) : chacun seulement pour qui a le droit. Le premier ouvre le formulaire
 *  du Back-Office à cette date ; le second, le formulaire de tâche (`onNouvelleTache`). */
export function BoutonsCreation({ date, lang, evenement, tache, onNouvelleTache }: {
  date: string;
  lang: NotifLang;
  evenement: boolean;
  tache: boolean;
  onNouvelleTache: () => void;
}) {
  const { t } = useTranslation();
  if (!evenement && !tache) return null;
  const jour = jourCourt(date, lang);
  return (
    <div className="flex flex-col gap-2">
      {evenement && (
        <Link href={`/back-office/evenements/nouveau?date=${date}`} className={cn(BOUTON, "bg-foreground text-background")}>
          <Plus aria-hidden className="h-4 w-4 shrink-0" />
          {t("calendrier.nouvelEvenement", { date: jour })}
        </Link>
      )}
      {tache && (
        <button type="button" onClick={onNouvelleTache} className={cn(BOUTON, "bg-secondary text-foreground")}>
          <Plus aria-hidden className="h-4 w-4 shrink-0" />
          {t("calendrier.nouvelleTache", { date: jour })}
        </button>
      )}
    </div>
  );
}
