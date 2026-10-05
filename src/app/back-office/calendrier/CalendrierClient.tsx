"use client";

// Calendrier du Back-Office (lot U8, docs/spec-calendrier.md). C3 : la page en Mois.
// En-tête (mois, ‹ ›, « Aujourd'hui »), pastilles des sources et « Seulement moi »
// retenues par appareil, grille de six semaines, jour choisi dans le panneau de droite
// (ordinateur, tablette couchée) ou dans une feuille (ailleurs). C4 : « Mois | Agenda »
// (Agenda d'office sur téléphone, au choix ailleurs) ; sur téléphone, « Tout » ·
// « Seulement moi » · « Sources » (feuille des sources) et le Mois à points, la liste
// du jour touché dessous. C5 : créer depuis un jour — « Nouvel évènement le JJ/MM » et
// « Nouvelle tâche pour le JJ/MM » en bas du panneau (ou de la feuille) du jour ; là où il
// n'y a pas de panneau (téléphone, Agenda), un « + » à côté de « Mois | Agenda » les propose
// pour le jour affiché (question 5). C6 : déplacer — glisser une entrée dans la grille du
// Mois (ordinateur, tablettes), ou « Déplacer… » sous sa carte dans le panneau du jour et
// dans sa feuille (seul moyen sur téléphone) ; la confirmation écrit, puis tout se relit.
// C8 : `?jour=AAAA-MM-JJ` (le widget du tableau de bord) ouvre la page en Mois sur ce jour —
// son panneau à droite, sa feuille sur tablette debout, sa liste sous le Mois à points.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, CloudOff, Plus, SlidersHorizontal, UserRound } from "lucide-react";
import { creatableEvenementPours, isAdminUser, polesDe } from "@/lib/access";
import { createTache, type TacheValues } from "@/lib/firebase/taches";
import { listProfiles, useProfile } from "@/lib/firebase/users";
import { prevenirResponsable } from "@/lib/taches/prevenir";
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
import { todayIso } from "@/lib/scene/dimanches";
import { cn } from "@/lib/utils";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import { TACHE_POLES, type TachePole } from "@/types/tache";
import type { NotifLang, UserProfile } from "@/types/user";
import { CartesDuJour, FeuilleEntree, ListeAgenda, useTitreDuJour } from "@/components/calendrier/Agenda";
import { DialogueDeplacer, type DemandeDeplacement } from "@/components/calendrier/Deplacer";
import { GrilleMois } from "@/components/calendrier/GrilleMois";
import { GrillePoints } from "@/components/calendrier/GrillePoints";
import { BoutonsCreation, ListeDuJour } from "@/components/calendrier/PanneauJour";
import { TacheForm } from "@/components/taches/TacheForm";
import { ICONES } from "@/components/calendrier/apparence";
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
/** Faux au rendu du serveur et à l'hydratation, vrai ensuite (les requêtes média sont lues). */
const useHydrate = () => useSyncExternalStore(() => () => {}, () => true, () => false);

/** `?jour=` : une date « AAAA-MM-JJ », sinon rien. */
const jourDeLAdresse = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

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
  // Ouverte sur un jour (C8) : en Mois, ce jour choisi.
  const jourDemande = jourDeLAdresse(useSearchParams().get("jour"));

  const [vueChoisie, setVue] = useState<Vue | null>(jourDemande ? "mois" : null);
  const vue: Vue = vueChoisie ?? (telephone ? "agenda" : "mois");
  const [mois, setMois] = useState((jourDemande ?? aujourdhui).slice(0, 7));
  const [choisi, setChoisi] = useState(jourDemande ?? aujourdhui);
  // Ouverte sur un jour, là où le jour s'affiche en feuille (tablette debout), sa feuille
  // s'ouvre — une fois les requêtes média lues (`hydrate`), pour ne jamais passer sur un
  // ordinateur, où le jour est dans le panneau de droite.
  const [feuille, setFeuille] = useState(jourDemande !== null);
  const hydrate = useHydrate();
  const [feuilleSources, setFeuilleSources] = useState(false);
  const [entree, setEntree] = useState<{ e: EntreeCalendrier | null; ouverte: boolean }>({ e: null, ouverte: false });
  // L'agenda part d'aujourd'hui jusqu'à la fin du mois, plus les mois ajoutés par « Afficher … ».
  const [moisEnPlus, setMoisEnPlus] = useState(0);
  const [prefs, setPrefs] = useState<PreferencesCalendrier>(lirePreferences);
  const [base, setBase] = useState<Omit<DonneesCalendrier, "sheet"> | null>(null);
  const [sheet, setSheet] = useState<{ fenetre: string; lecture: LectureSheet } | null>(null);
  // C5 : la feuille « Créer » (téléphone, Agenda), l'échéance d'une nouvelle tâche, ses responsables
  // possibles, et un compteur qui fait relire les sources après une création.
  const [feuilleCreer, setFeuilleCreer] = useState(false);
  const [tacheLe, setTacheLe] = useState<string | null>(null);
  const [membres, setMembres] = useState<UserProfile[]>([]);
  const [lecture, setLecture] = useState(0);
  // C6 : le déplacement demandé (dépôt dans la grille, ou « Déplacer… »).
  const [demande, setDemande] = useState<DemandeDeplacement | null>(null);

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
  }, [user, profil, aujourdhui, lecture]);

  // Les responsables possibles ne servent qu'au formulaire de tâche : lus à son ouverture.
  useEffect(() => {
    if (tacheLe) listProfiles().then(setMembres).catch(() => {});
  }, [tacheLe]);

  useEffect(() => {
    let vivant = true;
    lireSheetEvenements(debut, fin).then((lecture) => vivant && setSheet({ fenetre: `${debut}|${fin}`, lecture }));
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

  const chargement = !base || sheet?.fenetre !== `${debut}|${fin}`;
  const changer = (p: PreferencesCalendrier) => { setPrefs(p); ecrirePreferences(p); };
  const basculer = (s: SourceCalendrier) =>
    changer({ ...prefs, sources: prefs.sources.includes(s) ? prefs.sources.filter((x) => x !== s) : [...prefs.sources, s] });
  const allerA = (m: string) => { setMois(m); setChoisi(m === aujourdhui.slice(0, 7) ? aujourdhui : `${m}-01`); };
  // Sur téléphone, le jour touché s'affiche sous le Mois à points, sans feuille (question 3).
  const choisir = (date: string) => { setChoisi(date); if (!aDroite && !telephone) setFeuille(true); };
  const duJour = parJour.get(choisi) ?? [];
  const ouvrirEntree = (e: EntreeCalendrier) => setEntree({ e, ouverte: true });
  // La feuille du jour ou de l'entrée se ferme : la confirmation prend la place.
  const deplacer = (e: EntreeCalendrier, vers: string | null) => {
    setFeuille(false);
    setEntree((x) => ({ ...x, ouverte: false }));
    setDemande({ entree: e, vers });
  };
  const demanderDate = (e: EntreeCalendrier) => deplacer(e, null);

  // Créer (Q4) : chaque bouton seulement pour qui a le droit — un évènement si un public lui est
  // ouvert (un membre de pôle y crée une réunion), une tâche parmi ses pôles (tous pour un admin).
  const peutEvenement = creatableEvenementPours(user, profile, ANNONCE_SECTIONS).length > 0;
  const mesPoles: TachePole[] = !user ? [] : isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile);
  const sansPanneau = telephone || vue === "agenda";
  // Le jour du « + » : celui touché dans le Mois à points ; aujourd'hui dans l'Agenda.
  const jourCreer = vue === "agenda" ? aujourdhui : choisi;
  const boutonsCreation = (date: string) => (
    <BoutonsCreation
      date={date}
      lang={lang}
      evenement={peutEvenement}
      tache={mesPoles.length > 0}
      onNouvelleTache={() => { setFeuille(false); setFeuilleCreer(false); setTacheLe(date); }}
    />
  );
  async function creerTache(values: TacheValues, pole: TachePole) {
    if (!user) return;
    const id = await createTache(pole, values, user.uid);
    setTacheLe(null);
    setLecture((n) => n + 1);
    // Nommé par quelqu'un d'autre : le responsable est prévenu, comme sur la page du pôle.
    if (values.responsableUid && values.responsableUid !== user.uid) prevenirResponsable(pole, id);
  }

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
        {t(`calendrier.sources.${s}`)}
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
          {sansPanneau && (peutEvenement || mesPoles.length > 0) && (
            <button
              type="button"
              aria-label={t("calendrier.creer")}
              onClick={() => setFeuilleCreer(true)}
              className={cn(BOUTON_ROND, "order-last h-[34px] w-[34px] px-0")}
            >
              <Plus aria-hidden className="h-4 w-4" />
            </button>
          )}
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
            <GrilleMois
              mois={mois}
              jours={jours}
              parJour={parJour}
              aujourdhui={aujourdhui}
              choisi={choisi}
              lang={lang}
              onChoisir={choisir}
              onDeposer={deplacer}
            />
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
      {sansPanneau && (
        <Drawer open={feuilleCreer} onOpenChange={setFeuilleCreer}>
          <DrawerContent aria-describedby={undefined} className="md:mx-auto md:max-w-md">
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>{t("calendrier.creer")}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8">{boutonsCreation(jourCreer)}</div>
          </DrawerContent>
        </Drawer>
      )}
      {mesPoles.length > 0 && (
        <TacheForm
          open={tacheLe !== null}
          pole={mesPoles[0]}
          poles={mesPoles}
          echeance={tacheLe ?? undefined}
          initial={null}
          membres={membres}
          onSubmit={creerTache}
          onClose={() => setTacheLe(null)}
        />
      )}
      <FeuilleEntree
        entree={entree.e}
        ouverte={entree.ouverte}
        lang={lang}
        onFermer={() => setEntree((x) => ({ ...x, ouverte: false }))}
        onDeplacer={demanderDate}
      />
      {demande && base && user && (
        <DialogueDeplacer
          key={`${demande.entree.cle}|${demande.vers ?? ""}`}
          demande={demande}
          donnees={base}
          aujourdhui={aujourdhui}
          lang={lang}
          uid={user.uid}
          onFermer={() => setDemande(null)}
          onDeplace={() => { setDemande(null); setLecture((n) => n + 1); }}
        />
      )}

      {vue === "agenda" || telephone ? null : aDroite ? (
        <aside
          aria-labelledby="calendrier-jour"
          className="sticky top-0 flex h-dvh w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-border px-5 py-6"
        >
          <div>
            <h2 id="calendrier-jour" className="mb-3 text-sm font-semibold text-muted-foreground">
              {titreJour(choisi, lang)}
            </h2>
            <ListeDuJour entrees={duJour} onDeplacer={demanderDate} />
          </div>
          {/* Planche : les deux boutons en bas du panneau. */}
          <div className="mt-auto">{boutonsCreation(choisi)}</div>
        </aside>
      ) : (
        <Drawer open={feuille && hydrate} onOpenChange={setFeuille}>
          <DrawerContent className="max-h-[85vh] md:mx-auto md:max-w-xl">
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>{titreJour(choisi, lang)}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-8">
              <ListeDuJour entrees={duJour} onDeplacer={demanderDate} />
              {boutonsCreation(choisi)}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
