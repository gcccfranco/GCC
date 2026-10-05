"use client";

// Calendrier du Back-Office (lot U8, docs/spec-calendrier.md). C3 : la page en Mois.
// En-tête (mois, ‹ ›, « Aujourd'hui »), pastilles des sources et « Seulement moi »
// retenues par appareil, grille de six semaines, jour choisi dans le panneau de droite
// (ordinateur, tablette couchée) ou dans une feuille (ailleurs). C4 : « Mois | Agenda »
// (Agenda d'office sur téléphone, au choix ailleurs) ; sur téléphone, « Tout » ·
// « Seulement moi » · « Sources » (feuille des sources) et le Mois à points, la liste
// du jour touché dessous. La création (C5) et le déplacement (C6) viennent ensuite.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, CloudOff, SlidersHorizontal, UserRound } from "lucide-react";
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
import { finDuMois, joursDeLaGrille, moisVoisin, nomMois, titreJour, titreMois } from "@/lib/calendrier/grille";
import { ecrirePreferences, lirePreferences, type PreferencesCalendrier } from "@/lib/calendrier/preferences";
import { lireSheetEvenements, type LectureSheet } from "@/lib/evenements/sheet";
import { avantBascule } from "@/lib/evenements/bascule";
import { todayIso } from "@/lib/scene/dimanches";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";
import { CartesDuJour, FeuilleEntree, ListeAgenda, useTitreDuJour } from "@/components/calendrier/Agenda";
import { GrilleMois } from "@/components/calendrier/GrilleMois";
import { GrillePoints } from "@/components/calendrier/GrillePoints";
import { ListeDuJour } from "@/components/calendrier/PanneauJour";
import { ICONES } from "@/components/calendrier/apparence";
import { AnnonceBascule } from "@/components/evenements/AnnonceBascule";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

// Les dispositions de U4 (bloc « Lot U4 » de globals.css) : le panneau du jour se pose à
// droite sur ordinateur et sur la tablette couchée ; ailleurs il s'ouvre en feuille.
// Le téléphone (C4) : sous la largeur d'une tablette debout ; Agenda d'office, Mois à points.
function requeteMedia(requetes: string[]) {
  const suivre = (changement: () => void) => {
    const listes = requetes.map((q) => window.matchMedia(q));
    listes.forEach((m) => m.addEventListener("change", changement));
    return () => listes.forEach((m) => m.removeEventListener("change", changement));
  };
  const lire = () => requetes.some((q) => window.matchMedia(q).matches);
  return () => useSyncExternalStore(suivre, lire, () => false);
}
const usePanneauADroite = requeteMedia([
  "(pointer: fine) and (min-width: 1024px)",
  "(pointer: coarse) and (orientation: landscape) and (min-width: 1024px)",
]);
const useTelephone = requeteMedia(["(max-width: 767px)"]);

type Vue = "mois" | "agenda";

const BOUTON_ROND =
  "raised inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[13px] font-bold text-foreground transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const PASTILLE =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
/** Pastille du téléphone (planche : pleine en encre si choisie, grise sinon). */
const PASTILLE_TEL = (on: boolean) =>
  cn(PASTILLE, "shrink-0", on ? "bg-foreground text-background" : "bg-secondary text-foreground/85");

export function CalendrierClient() {
  const { t, i18n } = useTranslation();
  const lang: NotifLang = i18n.language === "zh-CN" ? "zh-CN" : "fr";
  const { user, profile } = useProfile();
  const profil = profile as ProfilCalendrier | null;
  const aujourdhui = useMemo(() => todayIso(), []);
  const aDroite = usePanneauADroite();
  const telephone = useTelephone();
  const titreDuJour = useTitreDuJour(lang, aujourdhui);

  const [vueChoisie, setVue] = useState<Vue | null>(null);
  const vue: Vue = vueChoisie ?? (telephone ? "agenda" : "mois");
  const [mois, setMois] = useState(aujourdhui.slice(0, 7));
  const [choisi, setChoisi] = useState(aujourdhui);
  const [feuille, setFeuille] = useState(false);
  const [feuilleSources, setFeuilleSources] = useState(false);
  const [entree, setEntree] = useState<{ e: EntreeCalendrier | null; ouverte: boolean }>({ e: null, ouverte: false });
  // L'agenda part d'aujourd'hui jusqu'à la fin du mois, plus les mois ajoutés par « Afficher … ».
  const [moisEnPlus, setMoisEnPlus] = useState(0);
  const [prefs, setPrefs] = useState<PreferencesCalendrier>(lirePreferences);
  const [base, setBase] = useState<Omit<DonneesCalendrier, "sheet"> | null>(null);
  const [sheet, setSheet] = useState<{ fenetre: string; lecture: LectureSheet } | null>(null);

  const jours = useMemo(() => joursDeLaGrille(mois), [mois]);
  const dernierMoisAgenda = moisVoisin(aujourdhui.slice(0, 7), moisEnPlus);
  // La fenêtre lue : les six semaines de la grille, ou d'aujourd'hui à la fin de l'agenda.
  const { debut, fin } = useMemo(
    () => (vue === "agenda" ? { debut: aujourdhui, fin: finDuMois(dernierMoisAgenda) } : { debut: jours[0], fin: jours[jours.length - 1] }),
    [vue, aujourdhui, dernierMoisAgenda, jours],
  );

  useEffect(() => {
    if (!user) return;
    let vivant = true;
    chargerCalendrier(user, profil, aujourdhui).then((d) => vivant && setBase(d));
    return () => { vivant = false; };
  }, [user, profil, aujourdhui]);

  // Lot U9 (Q6) : un mois affiché à partir de la bascule ne lit plus le Sheet, pas même les
  // derniers jours de décembre en tête de sa grille ; l'agenda, à partir d'aujourd'hui.
  const lireLeSheet = avantBascule(vue === "agenda" ? aujourdhui : `${mois}-01`);
  useEffect(() => {
    let vivant = true;
    const lecture = lireLeSheet ? lireSheetEvenements(debut, fin) : Promise.resolve<LectureSheet>({ entrees: [], injoignable: false });
    lecture.then((l) => vivant && setSheet({ fenetre: `${debut}|${fin}`, lecture: l }));
    return () => { vivant = false; };
  }, [debut, fin, lireLeSheet]);

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

  const chargement = !base || sheet?.fenetre !== `${debut}|${fin}`;
  const changer = (p: PreferencesCalendrier) => { setPrefs(p); ecrirePreferences(p); };
  const basculer = (s: SourceCalendrier) =>
    changer({ ...prefs, sources: prefs.sources.includes(s) ? prefs.sources.filter((x) => x !== s) : [...prefs.sources, s] });
  const allerA = (m: string) => { setMois(m); setChoisi(m === aujourdhui.slice(0, 7) ? aujourdhui : `${m}-01`); };
  // Sur téléphone, le jour touché s'affiche sous le Mois à points, sans feuille (question 3).
  const choisir = (date: string) => { setChoisi(date); if (!aDroite && !telephone) setFeuille(true); };
  const duJour = parJour.get(choisi) ?? [];
  const ouvrirEntree = (e: EntreeCalendrier) => setEntree({ e, ouverte: true });

  // ‹ › et « Aujourd'hui » : dans l'en-tête ; sur téléphone, au-dessus du Mois à points
  // (l'en-tête n'a la place que du titre et de « Mois | Agenda », planche).
  const navigation = (
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
  );

  const boutonsSources = permises.map((s) => {
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
        {/* U9 (Q6) : « Évènements (Sheet) » jusqu'au 31/12/2026, « Évènements » ensuite. */}
        {t(s === "evenements" && avantBascule(aujourdhui) ? "calendrier.sources.evenementsSheet" : `calendrier.sources.${s}`)}
      </button>
    );
  });
  const seulementMoi = (
    <button
      type="button"
      aria-pressed={prefs.seulementMoi}
      onClick={() => changer({ ...prefs, seulementMoi: !prefs.seulementMoi })}
      className={telephone ? PASTILLE_TEL(prefs.seulementMoi) : cn(PASTILLE, prefs.seulementMoi ? "bg-foreground text-background" : "raised text-foreground")}
    >
      {!telephone && <UserRound aria-hidden className="h-3.5 w-3.5 shrink-0" />}
      {t("calendrier.seulementMoi")}
    </button>
  );

  return (
    <div data-testid="calendrier" aria-busy={chargement} className="flex min-h-dvh">
      <div className="min-w-0 flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">
            {vue === "agenda"
              ? titreMois(aujourdhui.slice(0, 7), lang, telephone)
              : titreMois(mois, lang, telephone && mois.slice(0, 4) === aujourdhui.slice(0, 4))}
          </h1>
          {vue === "mois" && !telephone && navigation}
          <div role="group" aria-label={t("calendrier.vue.aria")} className="ml-auto inline-flex shrink-0 rounded-full bg-secondary p-[3px]">
            {(["mois", "agenda"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={vue === v}
                onClick={() => setVue(v)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  vue === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`calendrier.vue.${v}`)}
              </button>
            ))}
          </div>
        </div>

        {/* U9 (Q7 b) : où se créent les évènements, jusqu'au 31/01/2027. */}
        <AnnonceBascule today={aujourdhui} className="mt-3" />

        {telephone ? (
          <div className="mt-3 flex items-center gap-1.5">
            <button
              type="button"
              aria-pressed={!prefs.seulementMoi}
              onClick={() => changer({ ...prefs, seulementMoi: false })}
              className={PASTILLE_TEL(!prefs.seulementMoi)}
            >
              {t("calendrier.tout")}
            </button>
            {seulementMoi}
            <button type="button" onClick={() => setFeuilleSources(true)} className={PASTILLE_TEL(false)}>
              <SlidersHorizontal aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {t("calendrier.sourcesFeuille")}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <div role="group" aria-label={t("calendrier.sourcesAria")} className="flex flex-wrap gap-1.5">
              {boutonsSources}
              {/* Le trait suit la dernière source (planche) : il ne commence jamais une ligne. */}
              <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
            </div>
            {seulementMoi}
          </div>
        )}

        {sheet?.lecture.injoignable && (
          <div role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
            <CloudOff aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {t("calendrier.sheetInjoignable")}
          </div>
        )}

        {vue === "agenda" ? (
          <div className="mt-1 max-w-2xl">
            <ListeAgenda
              parJour={parJour}
              titreDuJour={titreDuJour}
              vide={t("calendrier.agendaVide", { mois: nomMois(dernierMoisAgenda, lang) })}
              onOuvrir={ouvrirEntree}
            />
            <button
              type="button"
              onClick={() => setMoisEnPlus((n) => n + 1)}
              className={cn(BOUTON_ROND, "mt-5 h-10 w-full rounded-2xl")}
            >
              {t("calendrier.afficherMois", { mois: nomMois(moisVoisin(dernierMoisAgenda, 1), lang) })}
            </button>
          </div>
        ) : telephone ? (
          <div className="mt-4">
            <div className="mb-3">{navigation}</div>
            <GrillePoints mois={mois} jours={jours} parJour={parJour} aujourdhui={aujourdhui} choisi={choisi} lang={lang} onChoisir={choisir} />
            <section data-testid="jour-choisi" aria-labelledby="calendrier-jour-choisi" className="mt-2">
              <h2 id="calendrier-jour-choisi" className="mx-0.5 mb-1.5 mt-4 text-[13px] font-semibold text-muted-foreground">
                {titreDuJour(choisi)}
              </h2>
              {duJour.length > 0 ? (
                <CartesDuJour entrees={duJour} onOuvrir={ouvrirEntree} />
              ) : (
                <p className="text-sm text-muted-foreground">{t("calendrier.rien")}</p>
              )}
            </section>
          </div>
        ) : (
          <div className="mt-4">
            <GrilleMois mois={mois} jours={jours} parJour={parJour} aujourdhui={aujourdhui} choisi={choisi} lang={lang} onChoisir={choisir} />
          </div>
        )}
      </div>

      {telephone && (
        <Drawer open={feuilleSources} onOpenChange={setFeuilleSources}>
          <DrawerContent aria-describedby={undefined}>
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>{t("calendrier.sourcesFeuille")}</DrawerTitle>
            </DrawerHeader>
            <div role="group" aria-label={t("calendrier.sourcesAria")} className="flex flex-wrap gap-2 px-4 pb-8">
              {boutonsSources}
            </div>
          </DrawerContent>
        </Drawer>
      )}
      <FeuilleEntree
        entree={entree.e}
        ouverte={entree.ouverte}
        lang={lang}
        onFermer={() => setEntree((x) => ({ ...x, ouverte: false }))}
      />

      {vue === "agenda" || telephone ? null : aDroite ? (
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
