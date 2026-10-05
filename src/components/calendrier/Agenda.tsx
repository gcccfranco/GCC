"use client";

// L'agenda du calendrier (lot U8, C4, planche bo-telephone-calendrier) : la liste par
// jour depuis aujourd'hui, jours vides sautés ; une carte par entrée (vignette colorée
// à icône, titre, détail) qui ouvre sa feuille (date, détail, « Ouvrir » ; « Déplacer… »
// viendra avec C6). Les mêmes cartes servent la liste du jour sous le Mois à points.

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { EntreeCalendrier } from "@/lib/calendrier/entrees";
import { titreJour } from "@/lib/calendrier/grille";
import type { NotifLang } from "@/types/user";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ICONES, couleurSource, styleCase } from "./apparence";

/** « Aujourd'hui · jeudi 1er octobre », sinon « Vendredi 2 octobre ». */
export function useTitreDuJour(lang: NotifLang, aujourdhui: string) {
  const { t } = useTranslation();
  return (date: string) => {
    const titre = titreJour(date, lang);
    if (date !== aujourdhui) return titre;
    return `${t("calendrier.aujourdhui")} · ${lang === "zh-CN" ? titre : titre.charAt(0).toLowerCase() + titre.slice(1)}`;
  };
}

function CarteAgenda({ e, onOuvrir }: { e: EntreeCalendrier; onOuvrir: (e: EntreeCalendrier) => void }) {
  const Icone = ICONES[e.source];
  return (
    <button
      type="button"
      data-source={e.source}
      onClick={() => onOuvrir(e)}
      className="raised flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span aria-hidden style={styleCase(e)} className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]">
        <Icone className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold leading-snug text-foreground">{e.titre}</span>
        {e.detail && <span className="block truncate text-[13px] text-muted-foreground">{e.detail}</span>}
      </span>
    </button>
  );
}

/** Les cartes d'un jour. */
export function CartesDuJour({ entrees, onOuvrir }: { entrees: EntreeCalendrier[]; onOuvrir: (e: EntreeCalendrier) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {entrees.map((e) => (
        <li key={e.cle}>
          <CarteAgenda e={e} onOuvrir={onOuvrir} />
        </li>
      ))}
    </ul>
  );
}

/** La liste par jour : `parJour` arrive dans l'ordre des jours, sans jour vide. */
export function ListeAgenda({
  parJour,
  titreDuJour,
  vide,
  onOuvrir,
}: {
  parJour: Map<string, EntreeCalendrier[]>;
  titreDuJour: (date: string) => string;
  vide: string;
  onOuvrir: (e: EntreeCalendrier) => void;
}) {
  if (parJour.size === 0) return <p className="mt-4 text-sm text-muted-foreground">{vide}</p>;
  return (
    <div data-testid="agenda">
      {[...parJour].map(([date, entrees]) => (
        <section key={date} data-jour={date} aria-labelledby={`agenda-${date}`}>
          <h2 id={`agenda-${date}`} className="mx-0.5 mb-1.5 mt-4 text-[13px] font-semibold text-muted-foreground">
            {titreDuJour(date)}
          </h2>
          <CartesDuJour entrees={entrees} onOuvrir={onOuvrir} />
        </section>
      ))}
    </div>
  );
}

const BOUTON_PLEIN =
  "flex h-11 w-full items-center justify-center rounded-full bg-foreground text-[15px] font-semibold text-background transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** La feuille d'une entrée : sa source, son titre, sa date, son détail, « Ouvrir ». */
export function FeuilleEntree({
  entree,
  ouverte,
  lang,
  onFermer,
}: {
  entree: EntreeCalendrier | null;
  ouverte: boolean;
  lang: NotifLang;
  onFermer: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Drawer open={ouverte && !!entree} onOpenChange={(o) => !o && onFermer()}>
      <DrawerContent className="md:mx-auto md:max-w-md">
        {entree && (
          <>
            <DrawerHeader className="pb-2 text-left">
              <span className="text-xs font-bold" style={{ color: couleurSource(entree) }}>
                {t(`calendrier.carte.${entree.source}`)}
              </span>
              <DrawerTitle>{entree.titre}</DrawerTitle>
              <DrawerDescription>{titreJour(entree.date, lang)}</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-1 px-4 pb-8">
              {entree.detail && <p className="text-[15px] text-foreground">{entree.detail}</p>}
              {entree.duSheet && <p className="text-xs text-muted-foreground">{t("calendrier.duSheet")}</p>}
              <div className="mt-4">
                {entree.duSheet ? (
                  <a href={entree.lien} target="_blank" rel="noopener noreferrer" className={BOUTON_PLEIN}>
                    {t("calendrier.ouvrir")}
                  </a>
                ) : (
                  <Link href={entree.lien} className={BOUTON_PLEIN}>
                    {t("calendrier.ouvrir")}
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
