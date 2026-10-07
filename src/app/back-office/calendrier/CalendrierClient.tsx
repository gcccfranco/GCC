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
// Relecture : les sources se lisent une fois (`chargerCalendrier`), puis la période affichée
// (`chargerPeriode` : fois des tâches qui y tombent, mes inscriptions pour « Seulement moi ») ;
// une source illisible se nomme dans un bandeau, comme le Sheet.
// Agencement v18 (B5, piste A ; planche v18-bo-calendrier-agenda-a) : en-tête commun « Calendrier »
// (`EnTetePage`), « + Nouvel évènement » (`BoutonNouveau` ; sur téléphone, le rond « Créer » et sa
// feuille), rail Mois · Agenda ; dans la rangée, « ‹ Octobre 2026 › », « Aujourd'hui », filet,
// sources en pilules, « Seulement moi ». L'agenda suit le mois de la rangée (d'aujourd'hui pour le mois
// en cours) ; dès 768 px, une colonne de jours par semaine, sur toute la largeur moins le volet du jour,
// à droite en agenda comme en Mois, avec « Ajouter ce jour-là » et son menu ; toucher un jour le choisit.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, CloudOff, SlidersHorizontal, UserRound } from "lucide-react";
import { creatableEvenementPours, estReunion, isAdminUser, polesDe } from "@/lib/access";
import type { TacheValues } from "@/lib/firebase/taches";
import { useProfile } from "@/lib/firebase/users";
import { chargerCalendrier, chargerPeriode, enOrdre, type LectureCalendrier } from "@/lib/calendrier/charger";
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
import { avantBascule, jourDeParis } from "@/lib/evenements/bascule";
import { todayIso } from "@/lib/scene/dimanches";
import { cn } from "@/lib/utils";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import { TACHE_POLES, type TachePole } from "@/types/tache";
import type { NotifLang } from "@/types/user";
import { AgendaSemaines, CartesDuJour, FeuilleEntree, ListeAgenda, useTitreDuJour } from "@/components/calendrier/Agenda";
import { DialogueDeplacer, type DemandeDeplacement } from "@/components/calendrier/Deplacer";
import { GrilleMois } from "@/components/calendrier/GrilleMois";
import { GrillePoints } from "@/components/calendrier/GrillePoints";
import { AjouterCeJour, BoutonsCreation, ListeDuJour, type DroitsCreation } from "@/components/calendrier/PanneauJour";
import { TacheForm } from "@/components/taches/TacheForm";
import { creerTache, useMembres } from "@/components/taches/creerTache";
import { ICONES } from "@/components/calendrier/apparence";
import { AnnonceBascule } from "@/components/evenements/AnnonceBascule";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OngletsRail, Pilules } from "@/components/layout/Onglets";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";

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
/** « Sources » sur téléphone : à la taille des pilules qu'il suit (`Pilules`, grise). */
const BOUTON_SOURCES_TEL =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-[15px] text-foreground/80 transition-colors duration-150 active:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function CalendrierClient() {
  const { t, i18n } = useTranslation();
  const lang: NotifLang = i18n.language === "zh-CN" ? "zh-CN" : "fr";
  const { user, profile } = useProfile();
  const profil = profile as ProfilCalendrier | null;
  const aujourdhui = useMemo(() => todayIso(), []);
  // U9 : la bascule (pastille, lecture du Sheet en Agenda) tombe à minuit de Paris, même loin.
  const jourParis = useMemo(() => jourDeParis(), []);
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
  // L'agenda montre le mois de la rangée (d'aujourd'hui pour le mois en cours), plus les mois
  // ajoutés par « Afficher … » ; ‹ › et « Aujourd'hui » les retirent.
  const [moisEnPlus, setMoisEnPlus] = useState(0);
  const [prefs, setPrefs] = useState<PreferencesCalendrier>(lirePreferences);
  const [lu, setLu] = useState<LectureCalendrier | null>(null);
  // La période lue : la dernière, même périmée le temps d'en lire une autre (rien ne clignote).
  const [periode, setPeriode] = useState<{
    de: LectureCalendrier;
    cle: string;
    donnees: Omit<DonneesCalendrier, "sheet">;
    echecs: SourceCalendrier[];
  } | null>(null);
  const [sheet, setSheet] = useState<{ fenetre: string; lecture: LectureSheet } | null>(null);
  // C5 : la feuille « Créer » (téléphone, Agenda), l'échéance d'une nouvelle tâche, ses responsables
  // possibles, et un compteur qui fait relire les sources après une création.
  const [feuilleCreer, setFeuilleCreer] = useState(false);
  const [tacheLe, setTacheLe] = useState<string | null>(null);
  // Les responsables possibles ne servent qu'au formulaire de tâche : lus à sa première ouverture.
  const membres = useMembres(tacheLe !== null);
  const [lecture, setLecture] = useState(0);
  // C6 : le déplacement demandé (dépôt dans la grille, ou « Déplacer… »).
  const [demande, setDemande] = useState<DemandeDeplacement | null>(null);

  const jours = useMemo(() => joursDeLaGrille(mois), [mois]);
  const dernierMoisAgenda = moisVoisin(mois, moisEnPlus);
  const moisCourant = mois === aujourdhui.slice(0, 7);
  // La fenêtre lue : les six semaines de la grille, ou du début de l'agenda à sa fin.
  const { debut, fin } = useMemo(
    () => (vue === "agenda"
      ? { debut: moisCourant ? aujourdhui : `${mois}-01`, fin: finDuMois(dernierMoisAgenda) }
      : { debut: jours[0], fin: jours[jours.length - 1] }),
    [vue, moisCourant, aujourdhui, mois, dernierMoisAgenda, jours],
  );

  useEffect(() => {
    if (!user) return;
    let vivant = true;
    chargerCalendrier(user, profil, aujourdhui).then((l) => vivant && setLu(l));
    return () => { vivant = false; };
  }, [user, profil, aujourdhui, lecture]);

  const seulementMoiActif = prefs.seulementMoi;
  const clePeriode = `${debut}|${fin}|${seulementMoiActif}`;
  useEffect(() => {
    if (!user || !lu) return;
    let vivant = true;
    const cle = `${debut}|${fin}|${seulementMoiActif}`;
    chargerPeriode(lu.base, user.uid, debut, fin, { seulementMoi: seulementMoiActif })
      .then((p) => vivant && setPeriode({ de: lu, cle, ...p }));
    return () => { vivant = false; };
  }, [user, lu, debut, fin, seulementMoiActif]);
  const base = periode?.donnees ?? null;
  const echecs = enOrdre([...(lu?.echecs ?? []), ...(periode?.echecs ?? [])]);

  // Lot U9 (Q6) : un mois affiché à partir de la bascule ne lit plus le Sheet, pas même les
  // derniers jours de décembre en tête de sa grille ; l'agenda, à partir d'aujourd'hui.
  const lireLeSheet = avantBascule(vue === "agenda" && moisCourant ? jourParis : `${mois}-01`);
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

  const chargement = !periode || periode.de !== lu || periode.cle !== clePeriode || sheet?.fenetre !== `${debut}|${fin}`;
  const changer = (p: PreferencesCalendrier) => { setPrefs(p); ecrirePreferences(p); };
  const basculer = (s: SourceCalendrier) =>
    changer({ ...prefs, sources: prefs.sources.includes(s) ? prefs.sources.filter((x) => x !== s) : [...prefs.sources, s] });
  const allerA = (m: string) => { setMois(m); setMoisEnPlus(0); setChoisi(m === aujourdhui.slice(0, 7) ? aujourdhui : `${m}-01`); };
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
  const pours = creatableEvenementPours(user, profile, ANNONCE_SECTIONS);
  const mesPoles: TachePole[] = !user ? [] : isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile);
  const droits: DroitsCreation = {
    evenement: pours.some((p) => !estReunion(p)),
    reunion: pours.some(estReunion),
    tache: mesPoles.length > 0,
  };
  const peutCreer = droits.evenement || droits.reunion || droits.tache;
  // La feuille « Créer » du téléphone : le jour touché du Mois à points ; en Agenda, où aucun jour ne
  // se choisit, aujourd'hui (spec-calendrier, C5), même après ‹ ›.
  const jourCreer = vue === "agenda" ? aujourdhui : choisi;
  const nouvelleTache = (date: string) => () => { setFeuille(false); setFeuilleCreer(false); setTacheLe(date); };
  const boutonsCreation = (date: string) => (
    <BoutonsCreation date={date} lang={lang} droits={droits} onNouvelleTache={nouvelleTache(date)} />
  );
  // Comme sur la page du pôle (`creerTache`) : nommé par quelqu'un d'autre, le responsable est prévenu.
  async function enregistrerTache(values: TacheValues, pole: TachePole) {
    if (!user) return;
    await creerTache(pole, values, user.uid);
    setTacheLe(null);
    setLecture((n) => n + 1);
  }

  // « ‹ Octobre 2026 › » et « Aujourd'hui » : dans la rangée de l'en-tête, en Mois comme en Agenda
  // (sans l'année sur téléphone, planche bo-telephone-calendrier).
  const navigation = (
    <div className="flex items-center gap-1.5">
      <button type="button" className={BOUTON_ROND} aria-label={t("calendrier.precedent")} onClick={() => allerA(moisVoisin(mois, -1))}>
        <ChevronLeft aria-hidden className="h-4 w-4" />
      </button>
      <span data-testid="mois-affiche" aria-live="polite" className="min-w-[92px] text-center text-[17px] font-bold text-foreground md:min-w-[128px]">
        {titreMois(mois, lang, telephone && mois.slice(0, 4) === aujourdhui.slice(0, 4))}
      </span>
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
        {/* U9 (Q6) : « Évènements (Sheet) » jusqu'au 31/12/2026, « Évènements » ensuite — selon
            l'horloge (de Paris), pas selon le mois affiché. */}
        {t(s === "evenements" && avantBascule(jourParis) ? "calendrier.sources.evenementsSheet" : `calendrier.sources.${s}`)}
      </button>
    );
  });
  const seulementMoi = (
    <button
      type="button"
      aria-pressed={prefs.seulementMoi}
      onClick={() => changer({ ...prefs, seulementMoi: !prefs.seulementMoi })}
      className={cn(PASTILLE, prefs.seulementMoi ? "bg-foreground text-background" : "raised text-foreground")}
    >
      <UserRound aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {t("calendrier.seulementMoi")}
    </button>
  );

  // La rangée sous le rail : la période, puis les filtres (sur téléphone, « Tout » · « Seulement moi »
  // en pilules (R5), retoucher « Seulement moi » revient à « Tout » ; puis « Sources », la feuille des sources).
  const rangee = telephone ? (
    <div className="flex flex-col gap-3">
      {navigation}
      <div className="flex items-center gap-1.5">
        <Pilules
          etiquette={t("calendrier.filtreAria")}
          options={[{ cle: "tout", nom: t("calendrier.tout") }, { cle: "moi", nom: t("calendrier.seulementMoi") }]}
          valeur={prefs.seulementMoi ? "moi" : "tout"}
          choisir={(v) => changer({ ...prefs, seulementMoi: v === "moi" })}
        />
        <button type="button" onClick={() => setFeuilleSources(true)} className={BOUTON_SOURCES_TEL}>
          <SlidersHorizontal aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {t("calendrier.sourcesFeuille")}
        </button>
      </div>
    </div>
  ) : (
    // Les filtres passent à la ligne à droite de la période, jamais dessous (le filet reste devant eux) ;
    // le groupe des sources s'efface de la mise en page (`contents`) pour que « Seulement moi » les suive.
    <div className="flex items-start gap-1.5">
      <div className="shrink-0">{navigation}</div>
      <span aria-hidden className="mx-2 mt-1 h-6 w-px shrink-0 bg-border" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <div role="group" aria-label={t("calendrier.sourcesAria")} data-onglets="pilules" className="contents">
          {boutonsSources}
        </div>
        {seulementMoi}
      </div>
    </div>
  );

  // L'action principale (R7) : « + Nouvel évènement » dès 768 px ; sur téléphone, le rond « Créer »,
  // qui propose dans sa feuille l'évènement, la tâche et la réunion du jour choisi.
  const action = telephone
    ? peutCreer && <BoutonNouveau label={t("calendrier.creer")} onClick={() => setFeuilleCreer(true)} />
    : droits.evenement && <BoutonNouveau label={t("evenements.nouveau")} href="/back-office/evenements/nouveau" />;

  return (
    <div data-testid="calendrier" aria-busy={chargement} className="flex min-h-dvh flex-col">
      <EnTetePage
        titre={t("backOffice.entrees.calendrier")}
        action={action || undefined}
        onglets={
          <OngletsRail
            etiquette={t("calendrier.vue.aria")}
            onglets={[{ id: "mois", label: t("calendrier.vue.mois") }, { id: "agenda", label: t("calendrier.vue.agenda") }]}
            actif={vue}
            choisir={(v) => setVue(v as Vue)}
          />
        }
        apres={rangee}
      />
      <div className="flex flex-1 items-stretch">
        <div className="min-w-0 flex-1 px-[var(--marge-page)] pb-10">
          {/* U9 (Q7 b) : où se créent les évènements, jusqu'au 31/01/2027. */}
          <AnnonceBascule className="mb-3" />

          {echecs.length > 0 && (
            <div role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
              <CloudOff aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {t("calendrier.echecs", { liste: echecs.map((s) => t(`calendrier.legende.${s}`)).join(lang === "zh-CN" ? "、" : ", ") })}
            </div>
          )}
          {sheet?.lecture.injoignable && (
            <div role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
              <CloudOff aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {t("calendrier.sheetInjoignable")}
            </div>
          )}

          {vue === "agenda" ? (
            <div>
              {telephone ? (
                <ListeAgenda
                  parJour={parJour}
                  titreDuJour={titreDuJour}
                  vide={t("calendrier.agendaVide", { mois: nomMois(dernierMoisAgenda, lang) })}
                  onOuvrir={ouvrirEntree}
                />
              ) : (
                <AgendaSemaines
                  parJour={parJour}
                  choisi={choisi}
                  lang={lang}
                  titreDuJour={titreDuJour}
                  vide={t("calendrier.agendaVide", { mois: nomMois(dernierMoisAgenda, lang) })}
                  onChoisir={choisir}
                />
              )}
              <button
                type="button"
                onClick={() => setMoisEnPlus((n) => n + 1)}
                className={cn(BOUTON_ROND, "mt-5 h-10 w-full rounded-2xl")}
              >
                {t("calendrier.afficherMois", { mois: nomMois(moisVoisin(dernierMoisAgenda, 1), lang) })}
              </button>
            </div>
          ) : telephone ? (
            <div>
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
          )}
        </div>

        {/* Le volet du jour (B5) : à droite sur ordinateur et tablette couchée, en Mois comme en Agenda. */}
        {aDroite && !telephone && (
          <aside aria-labelledby="calendrier-jour" className="w-[300px] shrink-0 border-l border-border">
            <div className="sticky top-[var(--nav-h)] flex max-h-[calc(100dvh-var(--nav-h))] flex-col gap-3 overflow-y-auto px-5 pb-6 pt-1">
              <h2 id="calendrier-jour" className="text-[17px] font-bold text-foreground">
                {titreJour(choisi, lang)}
              </h2>
              <AjouterCeJour date={choisi} lang={lang} droits={droits} onNouvelleTache={nouvelleTache(choisi)} />
              <ListeDuJour entrees={duJour} onDeplacer={demanderDate} />
            </div>
          </aside>
        )}
      </div>

      {telephone && (
        <Drawer open={feuilleSources} onOpenChange={setFeuilleSources}>
          <DrawerContent aria-describedby={undefined}>
            <DrawerHeader className="pb-2 text-left">
              <DrawerTitle>{t("calendrier.sourcesFeuille")}</DrawerTitle>
            </DrawerHeader>
            <div role="group" aria-label={t("calendrier.sourcesAria")} data-onglets="pilules" className="flex flex-wrap gap-2 px-4 pb-8">
              {boutonsSources}
            </div>
          </DrawerContent>
        </Drawer>
      )}
      {telephone && (
        <Drawer open={feuilleCreer} onOpenChange={setFeuilleCreer}>
          <DrawerContent aria-describedby={undefined}>
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
          onSubmit={enregistrerTache}
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

      {/* Tablette debout : le jour touché (dans la grille ou l'agenda) s'ouvre en feuille. */}
      {!aDroite && !telephone && (
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
