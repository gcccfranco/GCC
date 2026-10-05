"use client";

// Calendrier du Back-Office (lot U8, docs/spec-calendrier.md), tranche C3 : la page en
// Mois. En-tête (mois, ‹ ›, « Aujourd'hui »), pastilles des sources et « Seulement
// moi » retenues par appareil, grille de six semaines, jour choisi dans le panneau de
// droite (ordinateur, tablette couchée) ou dans une feuille (ailleurs). L'Agenda (C4),
// la création (C5) et le déplacement (C6) viennent ensuite.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, CloudOff, UserRound } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { chargerCalendrier } from "@/lib/calendrier/charger";
import {
  entreesCalendrier,
  filtrerEntrees,
  sourcesPermises,
  type DonneesCalendrier,
  type EntreeCalendrier,
  type ProfilCalendrier,
  type SourceCalendrier,
} from "@/lib/calendrier/entrees";
import { joursDeLaGrille, moisVoisin, titreJour, titreMois } from "@/lib/calendrier/grille";
import { ecrirePreferences, lirePreferences, type PreferencesCalendrier } from "@/lib/calendrier/preferences";
import { lireSheetEvenements, type LectureSheet } from "@/lib/evenements/sheet";
import { todayIso } from "@/lib/scene/dimanches";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";
import { GrilleMois } from "@/components/calendrier/GrilleMois";
import { ListeDuJour } from "@/components/calendrier/PanneauJour";
import { ICONES } from "@/components/calendrier/apparence";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

// Les dispositions de U4 (bloc « Lot U4 » de globals.css) : le panneau du jour se pose à
// droite sur ordinateur et sur la tablette couchée ; ailleurs il s'ouvre en feuille.
const PANNEAU_A_DROITE = [
  "(pointer: fine) and (min-width: 1024px)",
  "(pointer: coarse) and (orientation: landscape) and (min-width: 1024px)",
];
const suivre = (changement: () => void) => {
  const listes = PANNEAU_A_DROITE.map((q) => window.matchMedia(q));
  listes.forEach((m) => m.addEventListener("change", changement));
  return () => listes.forEach((m) => m.removeEventListener("change", changement));
};
const usePanneauADroite = () =>
  useSyncExternalStore(suivre, () => PANNEAU_A_DROITE.some((q) => window.matchMedia(q).matches), () => false);

const BOUTON_ROND =
  "raised inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[13px] font-bold text-foreground transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const PASTILLE =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function CalendrierClient() {
  const { t, i18n } = useTranslation();
  const lang: NotifLang = i18n.language === "zh-CN" ? "zh-CN" : "fr";
  const { user, profile } = useProfile();
  const profil = profile as ProfilCalendrier | null;
  const aujourdhui = useMemo(() => todayIso(), []);
  const aDroite = usePanneauADroite();

  const [mois, setMois] = useState(aujourdhui.slice(0, 7));
  const [choisi, setChoisi] = useState(aujourdhui);
  const [feuille, setFeuille] = useState(false);
  const [prefs, setPrefs] = useState<PreferencesCalendrier>(lirePreferences);
  const [base, setBase] = useState<Omit<DonneesCalendrier, "sheet"> | null>(null);
  const [sheet, setSheet] = useState<{ debut: string; lecture: LectureSheet } | null>(null);

  const jours = useMemo(() => joursDeLaGrille(mois), [mois]);
  const [debut, fin] = [jours[0], jours[jours.length - 1]];

  useEffect(() => {
    if (!user) return;
    let vivant = true;
    chargerCalendrier(user, profil, aujourdhui).then((d) => vivant && setBase(d));
    return () => { vivant = false; };
  }, [user, profil, aujourdhui]);

  useEffect(() => {
    let vivant = true;
    lireSheetEvenements(debut, fin).then((lecture) => vivant && setSheet({ debut, lecture }));
    return () => { vivant = false; };
  }, [debut, fin]);

  const permises = useMemo(() => (user ? sourcesPermises(user, profil) : []), [user, profil]);
  const parJour = useMemo(() => {
    const m = new Map<string, EntreeCalendrier[]>();
    if (!user || !base) return m;
    const donnees: DonneesCalendrier = { ...base, sheet: sheet?.lecture.entrees ?? [] };
    const toutes = entreesCalendrier(debut, fin, donnees, { user, profile: profil, lang, today: aujourdhui });
    const sources = prefs.sources.filter((s) => permises.includes(s));
    for (const e of filtrerEntrees(toutes, { sources, seulementMoi: prefs.seulementMoi })) {
      m.set(e.date, [...(m.get(e.date) ?? []), e]);
    }
    return m;
  }, [user, profil, base, sheet, debut, fin, lang, aujourdhui, prefs, permises]);

  const chargement = !base || sheet?.debut !== debut;
  const changer = (p: PreferencesCalendrier) => { setPrefs(p); ecrirePreferences(p); };
  const basculer = (s: SourceCalendrier) =>
    changer({ ...prefs, sources: prefs.sources.includes(s) ? prefs.sources.filter((x) => x !== s) : [...prefs.sources, s] });
  const allerA = (m: string) => { setMois(m); setChoisi(m === aujourdhui.slice(0, 7) ? aujourdhui : `${m}-01`); };
  const choisir = (date: string) => { setChoisi(date); if (!aDroite) setFeuille(true); };
  const duJour = parJour.get(choisi) ?? [];

  return (
    <div data-testid="calendrier" aria-busy={chargement} className="flex min-h-dvh">
      <div className="min-w-0 flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">{titreMois(mois, lang)}</h1>
          <div className="flex items-center gap-1.5">
            <button type="button" className={BOUTON_ROND} aria-label={t("calendrier.precedent")} onClick={() => allerA(moisVoisin(mois, -1))}>
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </button>
            <button type="button" className={BOUTON_ROND} aria-label={t("calendrier.suivant")} onClick={() => allerA(moisVoisin(mois, 1))}>
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
            <button type="button" className={cn(BOUTON_ROND, "px-3")} onClick={() => allerA(aujourdhui.slice(0, 7))}>
              {t("calendrier.aujourdhui")}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label={t("calendrier.sourcesAria")} className="flex flex-wrap gap-1.5">
            {permises.map((s) => {
              const allumee = prefs.sources.includes(s);
              const Icone = allumee ? Check : ICONES[s];
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={allumee}
                  onClick={() => basculer(s)}
                  className={cn(PASTILLE, allumee ? "raised text-foreground" : "text-muted-foreground line-through hover:bg-muted/60")}
                >
                  <Icone aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  {t(`calendrier.sources.${s}`)}
                </button>
              );
            })}
            {/* Le trait suit la dernière source (planche) : il ne commence jamais une ligne. */}
            <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
          </div>
          <button
            type="button"
            aria-pressed={prefs.seulementMoi}
            onClick={() => changer({ ...prefs, seulementMoi: !prefs.seulementMoi })}
            className={cn(PASTILLE, prefs.seulementMoi ? "bg-foreground text-background" : "raised text-foreground")}
          >
            <UserRound aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {t("calendrier.seulementMoi")}
          </button>
        </div>

        {sheet?.lecture.injoignable && (
          <div role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
            <CloudOff aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {t("calendrier.sheetInjoignable")}
          </div>
        )}

        <div className="mt-4">
          <GrilleMois mois={mois} jours={jours} parJour={parJour} aujourdhui={aujourdhui} choisi={choisi} lang={lang} onChoisir={choisir} />
        </div>
      </div>

      {aDroite ? (
        <aside
          aria-labelledby="calendrier-jour"
          className="sticky top-0 h-dvh w-[300px] shrink-0 overflow-y-auto border-l border-border px-5 py-6"
        >
          <h2 id="calendrier-jour" className="mb-3 text-sm font-semibold text-muted-foreground">
            {titreJour(choisi, lang)}
          </h2>
          <ListeDuJour entrees={duJour} />
        </aside>
      ) : (
        <Drawer open={feuille} onOpenChange={setFeuille}>
          <DrawerContent className="max-h-[85vh] md:mx-auto md:max-w-xl">
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>{titreJour(choisi, lang)}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-8">
              <ListeDuJour entrees={duJour} />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
