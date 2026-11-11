"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil, SlidersHorizontal, PenLine, UserRound, Play, MoreHorizontal, Download, Copy, FileText, Presentation } from "lucide-react";
import { categoryColor } from "@/lib/serviceColors";
import { Halo } from "@/components/layout/Halo";
import { FondDeBarre } from "@/components/layout/FondDeBarre";
import { serviceButtonFill } from "@/lib/serviceButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSetlist, getSetlistOuCopie, lireCopieDuCompte, deleteSetlist, mettreALaCorbeille, duplicateSetlist, updateSetlist, authHeader } from "@/lib/firebase/setlists";
import type { FSSetlist } from "@/types/setList";
import { RELIRE_PROFIL, useProfile } from "@/lib/firebase/users";
import { ecrireCopie } from "@/lib/setlist/copieHorsLigne";
import { BACK_OFFICE } from "@/lib/backOffice";
import { datesServies, findMyServices, loadPlanningData, type ServiceEntry } from "@/lib/planning/names";
import { roleDuPlanning } from "@/lib/planning/rolePlanning";
import type { DateServie } from "@/types/planning";
import { canSeeSetlist, canEditSetlist, canDeleteSetlist, canDuplicateSetlist, canSetPresentationLink, canHaveSetlistVersion, estRegieDeLaSetlist, peutExporterFreeShow } from "@/lib/access";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import type { JianpuChords, SetlistItem } from "@/types/setList";
import type { ChordProLine } from "@/types/chordPro";
import { formatDate, langueCourte } from "@/lib/utils/formatDate";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useSwipeViews } from "@/hooks/useSwipeViews";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useDisposition } from "@/hooks/useDisposition";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import { useContenusChants } from "./_hooks/useContenusChants";
import { usePreferencesAffichage } from "./_hooks/usePreferencesAffichage";
import { useEntreeLouange } from "./_hooks/useEntreeLouange";
import { ListView } from "./_components/ListView";
import { PartitionsView } from "./_components/PartitionView";
import { compter } from "@/lib/usage";
import { Sommaire } from "./_components/Sommaire";
import { PresentationLink } from "./_components/PresentationLink";
import { exporterFreeShow } from "./_components/ExportFreeShow";
import { CartesFete, RepereFete, SousTitreFete, usePassageDeLaSetlist } from "./_components/FeteDeLaSetlist";
import { estUnChant, resoudrePropositions } from "@/lib/setlist/propositions";
import { titreAffiche } from "@/lib/fetes/droits";
import { parsePresentationUrl } from "@/lib/setlist/presentationLink";
import { setlistLyricsText } from "@/components/song/copyLyrics";
import { SetlistHistory } from "./_components/SetlistHistory";
import { EcranChargement, EcranConnexion, EcranErreur, EcranIntrouvable, EcranSansAcces } from "./_components/EcransSetlist";
import { DroitsDeModifier, ReglagesAffichage, ActionsPartagees, MenuSupprimer, ReessayerCopie } from "./_components/MenusSetlist";
import { ConfirmerSuppression, ConfirmerRetablir } from "./_components/DialoguesSetlist";
import { BasculeVues } from "./_components/BasculeVues";
import { BandeauChantsManquants } from "./_components/BandeauChantsManquants";
import { IdeesDuChant } from "./_components/IdeesDuChant";
import { TitreEnTete } from "./_components/TitreEnTete";
import { continuePass, historyAuthor, recordHistory, type HistoryPass } from "@/lib/firebase/setlistHistory";
import { getSetlistVersions, saveSetlistVersions } from "@/lib/firebase/setlistVersions";
import type { SetlistVersions, VersionItem } from "@/types/setlistVersions";
import { MyStructureSheet, type MyStructureTarget } from "@/components/setlists/MyStructureSheet";
import {
  songVersionView,
  withChosenItem,
  withMineItem,
  withMineStructureItem,
  myStructureOf,
  type SongVersionView,
} from "@/lib/setlist/versionChoice";
import { adresseVue, lireAdresse, poser, surLaSetlist } from "@/lib/setlist/adresseVue";
import { jianpuPngDataUrl, loadJianpuCadrage, loadJianpuChords, loadJianpuManifest, scansAbsentsDuCache, urlsJianpuAGarder, useJianpuManifest } from "@/lib/jianpu/images";
import { sheetEnabled } from "@/lib/jianpu/preference";
import { aDesRetouches } from "@/lib/jianpu/retouches";
import { fetchSongAST, type SongContent} from "@/lib/api/songs";
import { PerformanceMode } from "@/components/performance/PerformanceMode";
import { EditLineSheet, type EditLineTarget } from "@/components/setlists/EditLineSheet";
import { PdfChoiceSheet, type PdfVersion } from "@/components/pdf/PdfChoiceSheet";
import { pdfFileName, type PdfStyle } from "@/lib/pdfStylePref";
import { itemAst } from "@/lib/chordpro/itemContent";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { semitonesTo } from "@/lib/transpose";
import { telechargerBlob, demanderPleinEcran } from "@/lib/telecharger";
import {
  replaceSourceLine,
  insertSourceLineAfter,
  deleteSourceLines,
  materializeSectionCopy,
} from "@/lib/chordpro/editSource";
import { structUidAt, revertSectionOrigins, idDeSection } from "@/lib/setlist/sectionOrigins";
import { TOUCHER_44 } from "@/lib/toucher44";

// Quand `.libelle-outil` est masqué (sous 1 024 px de fenêtre, ou rangée sous 880 px de conteneur : dimanche-9) :
// l'icône et un libellé court dessous (G15, audit 24/10/2026), jamais l'icône seule.
const PILULE_EMPILEE = "max-lg:h-auto max-lg:min-h-8 max-lg:flex-col max-lg:justify-center max-lg:gap-0.5 max-lg:px-2 max-lg:py-1 max-lg:rounded-2xl [@container(max-width:879px)]:h-auto [@container(max-width:879px)]:min-h-8 [@container(max-width:879px)]:flex-col [@container(max-width:879px)]:justify-center [@container(max-width:879px)]:gap-0.5 [@container(max-width:879px)]:px-2 [@container(max-width:879px)]:py-1 [@container(max-width:879px)]:rounded-2xl";
const LIBELLE_COURT = "hidden max-lg:block [@container(max-width:879px)]:block max-w-[64px] truncate text-xs font-medium leading-tight";

/** Cible d'édition de ligne + indices source nécessaires à la sauvegarde. */
type LineEditState = EditLineTarget & {
  srcLine: number;
  pinyinSrcLine?: number;
  jianpuSrcLine?: number;
  /** Renseignés uniquement si la ligne appartient à une section répétée par la
   *  structure : l'édition doit alors matérialiser une copie de la section
   *  pour cette occurrence (sinon toutes les répétitions changeraient). */
  repeatedSectionId?: string;
  structIndex?: number;
};

/** Sur quoi appliquer l'édition d'une ligne : le source (et les index de
 *  lignes) après une éventuelle copie d'occurrence, plus ce qu'il faut
 *  enregistrer à côté — sur l'item de la setlist (Adapter) ou dans ma version
 *  (« Seulement ce passage »). */
/** Setlist G (docs/spec-deux-volets.md, T2) : où amener la vue qui s'affiche —
 *  un chant des partitions (`decalage` : son haut sous la ligne de lecture, pour
 *  rouvrir là où on était ; `uid` : une de ses sections, touchée dans le sommaire des
 *  deux volets), le haut de la page, ou la ligne du chant lu dans la liste. */
type Cible = { type: "chant"; n: number; decalage?: number; uid?: string } | { type: "haut" } | { type: "ligne" };

/** Le chant amené commence 12 px sous la bascule : la hauteur de son fondu. */
const SOUS_LA_BASCULE = 12;

/** Réseau qui traîne : la copie hors ligne du même compte s'affiche après ce délai si la lecture n'a pas abouti. */
const COPIE_APRES_MS = 3000;

/** Boutons de l'en-tête des deux volets (planche `setlist-deux-volets`) : pilules
 *  libellées, l'état actif en encre comme la barre de G. */
const PILULE =
  "flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold text-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted active:scale-[.97] disabled:opacity-60";
/** Bouton rond sans libellé (PDF, ⋯) : l'icône seule, nom en `aria-label`. */
const PILULE_ICONE =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted active:scale-[.97] disabled:opacity-60";
const PILULE_ACTIVE =
  "flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-[background-color,color,transform] duration-150 active:scale-[.97]";

type EditBase = {
  source: string;
  srcLine: number;
  pinyinSrcLine?: number;
  jianpuSrcLine?: number;
  extra?: Partial<SetlistItem>;
  mine?: Partial<VersionItem>;
};


// ─── Main component ───────────────────────────────────────────────────────────

export function SetlistDetailClient() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useProfile();
  const id = params.id as string;

  const [setlist, setSetlist] = useState<FSSetlist | null>(null);
  const [backPath, setBackPath] = useState("/setlists");
  // Lot AO (F1) : les dates où l'on sert, tirées du planning — la setlist de cette date se lit même sans équipe.
  // Chargées sans bloquer la page (qui voit déjà la setlist ne les attend pas) ; `undefined` = pas encore lues.
  const [datesDuCompte, setDatesDuCompte] = useState<DateServie[] | undefined>(undefined);
  // Lot RP : les services du compte (rôle compris), gardés du même chargement pour proposer une vue dans le mode louange ;
  // avec le nom lu, pour qu'un autre compte connecté par-dessus n'hérite jamais du rôle du précédent.
  const [servicesDuCompte, setServicesDuCompte] = useState<{ nom: string; services: ServiceEntry[] } | undefined>(undefined);
  const planningName = profile?.planningName ?? "";
  useEffect(() => {
    if (!BACK_OFFICE || !planningName) return;
    let annule = false;
    loadPlanningData().then(
      (d) => { if (!annule) { setDatesDuCompte(datesServies(d, planningName)); setServicesDuCompte({ nom: planningName, services: findMyServices(d, planningName) }); } },
      () => { if (!annule) { setDatesDuCompte([]); setServicesDuCompte({ nom: planningName, services: [] }); } },
    );
    return () => { annule = true; };
  }, [planningName]);

  const scrollVisible = useScrollDirection();
  // ── Deux volets (docs/spec-deux-volets.md, T4) : ordinateur et tablette couchée,
  // 900 px utiles au moins (Q1). Le sommaire à gauche, les partitions toujours à
  // droite : ni bascule, ni Liste, ni geste ; `view` n'y sert plus qu'à G.
  const deuxVolets = useDeuxVolets();
  // dimanche-9 (lot CD, T4b) : en tablette portrait, le contenu va jusqu'à la barre d'outils, à `--marge-page` des bords.
  const enTablette = useDisposition() === "tablette";
  /** En-tête collant des deux volets, et sa hauteur (le sommaire colle dessous). */
  const enTeteRef = useRef<HTMLElement>(null);
  const [enTeteH, setEnTeteH] = useState(0);
  // La barre d'outils peut passer sur deux lignes (flex-wrap) : sa hauteur
  // réelle est mesurée pour que le contenu ne finisse jamais dessous.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarH, setToolbarH] = useState(54);
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const update = () => setToolbarH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setlist, deuxVolets]); // la barre n'existe qu'une fois la setlist chargée, et pas en deux volets
  // L'en-tête des deux volets peut passer sur deux lignes : sa hauteur est mesurée. Il
  // glisse (transformé, il devient le repère des éléments fixes) : la copie du halo de
  // son fond se recale de sa place à gauche, `--barre-left`, comme la barre de G.
  useEffect(() => {
    const el = enTeteRef.current;
    if (!el) return;
    const update = () => {
      setEnTeteH(el.getBoundingClientRect().height);
      el.style.setProperty("--barre-left", `${el.getBoundingClientRect().left}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [setlist, deuxVolets]);
  const [songsMap, setSongsMap] = useState<Record<string, SongIndexEntry>>({});
  const passageFete = usePassageDeLaSetlist(setlist);
  // Relit l'historique après une adaptation écrite depuis cette page.
  const [historyVersion, setHistoryVersion] = useState(0);
  // Adaptations successives depuis cette page : un seul passage (adapter puis
  // rétablir ne laisse rien), tant que personne d'autre n'a touché la setlist.
  const historyPassRef = useRef<HistoryPass | null>(null);
  const { contents, setContents, loadingContent, loadContents } = useContenusChants();
  const [loadingSetlist, setLoadingSetlist] = useState(true);
  const [view, setView] = useState<"liste" | "partitions">("liste");
  const affichePartitions = deuxVolets || view === "partitions";
  /** Occurrences de la section lue (`data-section-uids`) : la pastille marquée. */
  const [uidsLus, setUidsLus] = useState<string[]>([]);
  // ── Setlist G : Liste et Partitions reliées (docs/spec-deux-volets.md, T2) ──
  const basculeRef = useRef<HTMLDivElement>(null);
  /** Glissement (T3) : le doigt se pose dans la colonne, la vue affichée le suit. */
  const zoneRef = useRef<HTMLDivElement>(null);
  const vueRef = useRef<HTMLDivElement>(null);
  /** Position du chant lu (celle de `data-outline-item`), suivie dans l'adresse. */
  const [current, setCurrent] = useState<number | null>(null);
  const [cible, setCible] = useState<Cible | null>(null);
  // Deux volets → un volet (fenêtre rétrécie, tablette tournée debout) : G reprend
  // la vue que dit l'adresse, que les deux volets écrivent en lisant (Q9). Ajusté
  // pendant le rendu, comme le veut React pour un état qui suit un autre.
  const [avaitDeuxVolets, setAvaitDeuxVolets] = useState(deuxVolets);
  if (avaitDeuxVolets !== deuxVolets) {
    setAvaitDeuxVolets(deuxVolets);
    const a = deuxVolets ? null : lireAdresse();
    if (a) {
      setView("partitions");
      setCible(a.chant !== null ? { type: "chant", n: a.chant } : { type: "haut" });
    }
  }
  /** Dernière cible atteinte (ou abandonnée) : l'effet ne la rejoue pas. */
  const cibleFaite = useRef<Cible | null>(null);
  /** Une cible est en route : le suivi du chant lu attend qu'elle soit atteinte (la page
   *  défile alors d'elle-même, et le chant de passage n'est pas le chant lu). */
  const enRoute = useRef(false);
  /** Où en étaient les partitions quand on les a quittées : « Partitions » y revient. */
  const retour = useRef<{ n: number; decalage: number } | null>(null);
  /** Lâche le chant amené (voir l'effet qui amène la vue à sa cible). */
  const lacherRef = useRef<(() => void) | null>(null);
  /** Hauteur où la page a été amenée : tant qu'on n'a pas défilé, le chant
   *  amené reste le chant lu, même s'il ne peut pas monter jusqu'en haut. */
  const posee = useRef<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPdfChoice, setShowPdfChoice] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Hors ligne (D1, décision C2) : date de lecture de la copie locale servie à la place de la setlist, sinon null.
  const [copieLueLe, setCopieLueLe] = useState<number | null>(null);
  // Lot RP : la vue du planning pour le service de cette setlist (proposée par le mode louange, jamais appliquée seule).
  const rolePlanning = useMemo(
    () => (user && planningName && servicesDuCompte?.nom === planningName && setlist && copieLueLe === null
      ? roleDuPlanning(servicesDuCompte.services, { date: setlist.date, category: setlist.category, moment: setlist.moment }, profile?.joue)
      : null),
    [user, planningName, servicesDuCompte, setlist, copieLueLe, profile?.joue],
  );
  // Mode louange (D4) : chants qui n'ont pas pu être chargés ; null = pas de bandeau.
  const [chantsManquants, setChantsManquants] = useState<string[] | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // Copie à l'écran : un nouvel essai de lecture ne remplace pas la page par le chargement.
  const copieAffichee = useRef(false);
  useEffect(() => { copieAffichee.current = copieLueLe !== null; }, [copieLueLe]);
  // « Réessayer » du bandeau D4 : essai en cours, et essai qui échoue encore.
  const [essaiEnCours, setEssaiEnCours] = useState(false);
  const [essaiEchoue, setEssaiEchoue] = useState(false);
  const boutonReessayerRef = useRef<HTMLButtonElement>(null);
  // Mode « adapter le chant » (accords/paroles par setlist)
  const [editPartitions, setEditPartitions] = useState(false);
  const [editTarget, setEditTarget] = useState<LineEditState | null>(null);
  const [savingLine, setSavingLine] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState<number | null>(null);
  // Versions perso des chants (docs/spec-version-perso.md) : un document par
  // personne, chargé avec la setlist. La mienne remplace les accords et
  // paroles de la présidence dans la vue partitions, le sommaire et le mode
  // louange — jamais dans la liste ni l'historique ; le PDF la suit si je la
  // choisis dans « Quel PDF ? » (Timothée, 29/10/2026).
  const [versions, setVersions] = useState<Record<string, SetlistVersions>>({});
  // Vrai quand `versions` vient d'être lu en ligne (faux : lecture échouée, ou versions de la copie hors ligne).
  const [versionsLues, setVersionsLues] = useState(false);
  // Mode « Ma version » : mêmes gestes qu'Adapter, écrits dans mon document.
  const [editMine, setEditMine] = useState(false);
  // La phrase des droits est repliée derrière un « i » (G15, audit 24/10/2026 ; toutes tailles depuis dimanche-16).
  const [droitsDeplies, setDroitsDeplies] = useState(false);
  // Formulaire du lien de la présentation, ouvert par l'entrée du menu ⋯ (dimanche-16).
  const [editionLien, setEditionLien] = useState(false);
  // Retouche d'une section répétée en « Ma version » : toutes les répétitions
  // (défaut, comme avant le lot 9) ou ce seul passage (docs/spec-harmonie.md).
  const [repeatScope, setRepeatScope] = useState<"all" | "one">("all");
  const myItems = user ? versions[user.uid]?.items : undefined;
  /** Item en mode « Ma version » : mes accords et paroles à la place de ceux de la présidence. */
  function withMine(item: SetlistItem): SetlistItem {
    return withMineItem(item, myItems);
  }
  /** Version d'un chant pour moi : la présidence, la mienne, ou celle d'un
   *  autre partagée et choisie. */
  function viewOf(item: SetlistItem): SongVersionView | undefined {
    return user
      ? songVersionView(item.songSlug, user.uid, versions, {
          structure: item.structureOverride,
          sectionIds: contents[item.songSlug]?.ast.sections.map((s) => s.id),
        })
      : undefined;
  }
  /** Item tel qu'affiché : les accords et paroles de la version choisie. */
  function withChosen(item: SetlistItem): SetlistItem {
    return withChosenItem(item, viewOf(item), myItems);
  }
  /** Structure que suit le corps du chant en « Ma version » : la mienne si
   *  j'en ai une, sinon celle de la présidence. */
  function myStructure(item: SetlistItem): string[] | null {
    return myStructureOf(item, myItems);
  }
  /** Pour le sommaire et le mode louange : ma structure remplace aussi celle
   *  de la présidence, sans ses notes, nuances et transitions d'occurrence
   *  (elles restent dans le bandeau de la vue partitions). */
  function withMineStructure(item: SetlistItem): SetlistItem {
    return withMineStructureItem(item, viewOf(item), myItems);
  }
  // Feuille « Sections » de ma version : chant en cours de réglage.
  const [structureTarget, setStructureTarget] = useState<(MyStructureTarget & { itemIndex: number }) | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("lastListPath");
    if (saved && (saved.startsWith("/setlists?") || saved === "/setlists")) {
      setBackPath(saved);
    }
    sessionStorage.setItem("lastListPath", window.location.pathname);
  }, []);
  const {
    showChords, setShowChords, chordsTouched, setChordsTouched,
    showPinyin, disposition, layout, jianpuPref,
    changeDisposition, changeLayout, changeJianpuPref, togglePinyin,
  } = usePreferencesAffichage(user?.uid ?? null, authLoading);
  // Adapter (la setlist) et Ma version (pour soi) s'excluent ; la barre d'outils
  // et, sur téléphone étroit, le menu « ⋯ » passent par ici.
  // Depuis la Liste, les deux modes ouvrent les partitions au chant lu (Q11) ; en
  // deux volets, elles sont déjà là.
  const toggleAdapter = () => {
    setEditPartitions(!editPartitions);
    setEditMine(false);
    setEditTarget(null);
    if (!editPartitions && !affichePartitions) versPartitions(current ?? undefined);
  };
  const toggleMaVersion = () => {
    setEditMine(!editMine);
    setEditPartitions(false);
    setEditTarget(null);
    if (!editMine && !affichePartitions) versPartitions(current ?? undefined);
  };
  // Le réglage 简谱 n'apparaît que si un chant de la setlist a un scan.
  const jianpuManifest = useJianpuManifest();
  const hasJianpuSheets = (setlist?.items ?? []).some(
    (it) => it.songSlug && jianpuManifest?.[it.songSlug],
  );
  // Lecture de la setlist + index des chants. Sans copie hors ligne, on attend le profil (authLoading) pour que
  // les setlists privées partent avec leur jeton. Avec la copie du MÊME compte, la lecture part dès que Firebase Auth
  // a restauré la session, sans attendre le profil, et la copie s'affiche au bout de 3 s si la lecture n'a pas
  // abouti (réseau qui traîne) ; la réponse la remplace ensuite, bandeau retiré.
  const lectureLancee = useRef<string | null>(null);
  useEffect(() => {
    if (!id) return;
    const cle = `${id}:${retryKey}`;
    if (lectureLancee.current === cle) return;
    let abandon = false;
    void (async () => {
      const copie = await lireCopieDuCompte(id);
      // Passage de l'effet remplacé avant le lancement, ou lecture déjà lancée par un autre passage.
      if (abandon || lectureLancee.current === cle) return;
      if (!copie && authLoading) return;
      lectureLancee.current = cle;
      const courante = () => lectureLancee.current === cle;
      setLoadError(false);
      if (!copieAffichee.current) setLoadingSetlist(true);
      type Index = { songs?: SongIndexEntry[] };
      // L'index des chants ne conditionne rien : sans lui (hors ligne, pas en cache) la setlist s'affiche quand
      // même, les titres manquants se complètent quand il arrive.
      let indexLu: Index = {};
      const indexP: Promise<Index> = chargerIndexChants().then((songs) => (indexLu = { songs })).catch(() => indexLu);
      let terminee = false;
      const appliquer = (sl: FSSetlist | null, index: Index, lueLe: number | null, v: Record<string, SetlistVersions>) => {
        setCopieLueLe(lueLe);
        // Une proposition dont le `.cho` est arrivé devient le chant (CF21).
        setSetlist(sl && { ...sl, items: resoudrePropositions(sl.items, index.songs ?? []) });
        setVersions(v);
        const map: Record<string, SongIndexEntry> = {};
        for (const s of index.songs ?? []) map[s.slug] = s;
        setSongsMap(map);
      };
      if (copie) {
        void new Promise((r) => setTimeout(r, COPIE_APRES_MS))
          .then(() => {
            if (terminee || !courante()) return;
            appliquer(copie.setlist, indexLu, copie.lueLe, copie.versions);
            setVersionsLues(false);
            setLoadingSetlist(false);
          })
          .catch(() => {});
      }
      Promise.all([
        getSetlistOuCopie(id),
        indexP,
        // Règles pas publiées, hors-ligne… : la présidence seule, sans erreur (null = lecture échouée).
        getSetlistVersions(id).catch(() => null),
      ]).then(([res, index, v]) => {
        terminee = true;
        if (!courante()) return;
        // Hors ligne, « Ma version » vient de la copie (celles de la copie ou, à défaut, celles lues en ligne).
        appliquer(res.setlist, index, res.copieLueLe, res.copieVersions ?? v ?? {});
        setVersionsLues(!res.copieVersions && v !== null);
      }).catch(() => {
        terminee = true;
        if (courante()) setLoadError(true);
      }).finally(() => {
        if (courante()) setLoadingSetlist(false);
      });
      // Index arrivé après l'affichage : on complète les titres.
      void chargerIndexChants().then((songs) => {
        if (!courante()) return;
        const map: Record<string, SongIndexEntry> = {};
        for (const sv of songs) map[sv.slug] = sv;
        setSongsMap(map);
      }).catch(() => {});
    })();
    return () => { abandon = true; };
  }, [id, authLoading, retryKey]);

  // Retour du réseau (A3 bis, 10) : la setlist affichée vient de la copie, on relit la vraie.
  useEffect(() => {
    if (copieLueLe === null) return;
    const relire = () => setRetryKey((k) => k + 1);
    const siVisible = () => { if (document.visibilityState === "visible") relire(); };
    window.addEventListener("online", relire);
    document.addEventListener("visibilitychange", siVisible);
    return () => {
      window.removeEventListener("online", relire);
      document.removeEventListener("visibilitychange", siVisible);
    };
  }, [copieLueLe]);

  // Bandeau D4 : le focus y arrive (« Réessayer »), Échap le ferme.
  const bandeauChantsOuvert = !!chantsManquants && !performanceMode;
  useEffect(() => {
    if (!bandeauChantsOuvert) return;
    boutonReessayerRef.current?.focus();
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setChantsManquants(null);
      setEssaiEchoue(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [bandeauChantsOuvert]);
  // Hors ligne (D1) : la copie ne s'écrit qu'une fois établi que la personne peut voir la setlist,
  // pour qu'une copie n'existe que pour une setlist qu'elle avait le droit de lire. Elle porte le compte
  // et les versions perso lues en ligne (« Ma version » hors ligne).
  useEffect(() => {
    if (!setlist || !user || copieLueLe !== null) return;
    if (canSeeSetlist(user, profile, setlist, datesDuCompte)) {
      void ecrireCopie(setlist, user.uid, versionsLues ? versions : undefined);
    }
  }, [setlist, user, profile, datesDuCompte, copieLueLe, versions, versionsLues]);

  // Hors ligne (D2) : la page d'une setlist lue en ligne demande au service worker de garder sa propre page (une
  // page ouverte par un lien n'est pas une navigation que le service worker voit), celle de la liste, le contenu
  // et la page de chacun de ses chants, et les scans 简谱 de ceux qui en ont un (/jianpu/index.json donne leurs pages).
  useEffect(() => {
    if (!setlist || copieLueLe !== null || !jianpuManifest) return;
    const slugs = new Set<string>();
    for (const it of setlist.items) {
      if (it.songSlug) slugs.add(it.songSlug);
      for (const fs of it.fusionSongs ?? []) slugs.add(fs.songSlug);
    }
    const urls = [
      `/setlists/${encodeURIComponent(id)}/`,
      "/setlists/",
      ...[...slugs].flatMap((s) => [`/songs/${encodeURIComponent(s)}/`, `/api/song/${s}`]),
      ...(slugs.size ? urlsJianpuAGarder(jianpuManifest, slugs) : []),
    ];
    const envoyer = () => {
      try {
        navigator.serviceWorker?.controller?.postMessage({ type: "precache", urls });
      } catch { /* pas de service worker : rien à garder */ }
    };
    envoyer();
    // Un nouveau service worker qui prend la main (mise à jour, premier contrôle) : il n'a pas reçu le message.
    let sw: ServiceWorkerContainer | undefined;
    try { sw = navigator.serviceWorker; } catch { /* pas de service worker */ }
    sw?.addEventListener("controllerchange", envoyer);
    return () => sw?.removeEventListener("controllerchange", envoyer);
  }, [id, setlist, copieLueLe, jianpuManifest]);

  // Partitions préchargées juste après l'affichage de la liste (Q14) : la
  // bascule les trouve prêtes.
  const prechargees = useRef(false);
  useEffect(() => {
    if (!setlist || prechargees.current) return;
    prechargees.current = true;
    const items = setlist.items;
    requestAnimationFrame(() => loadContents(items));
  }, [setlist, loadContents]);

  useEntreeLouange({ setlist, loadContents, entrerEnLouange });

  // Vue lue dans l'adresse à l'ouverture (lien, rechargement) et au retour du
  // navigateur (Q9).
  useEffect(() => {
    const lire = () => {
      // Retour vers une autre page : Next s'en charge.
      if (!surLaSetlist(id)) return;
      const a = lireAdresse();
      if (a) {
        setView("partitions");
        if (a.chant !== null) setCurrent(a.chant);
        setCible(a.chant !== null ? { type: "chant", n: a.chant } : { type: "haut" });
      } else {
        setView("liste");
        setCible({ type: "ligne" });
      }
    };
    if (lireAdresse()) lire();
    window.addEventListener("popstate", lire);
    // Entre Liste et Partitions, c'est la page qui place la vue (ligne du chant
    // lu, chant amené) : le navigateur ne rend pas sa hauteur à l'entrée.
    const avant = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.removeEventListener("popstate", lire);
      window.history.scrollRestoration = avant;
    };
  }, [id]);

  /** Bas de la bascule quand elle colle sous la barre, plus le fondu : la ligne
   *  où commence le chant amené, et la ligne de lecture du chant lu. En deux
   *  volets, le bas de l'en-tête collé en haut, plus son fondu. Elle ne bouge pas
   *  quand les barres s'escamotent : le chant lu changerait avec elles. */
  function hautDeLecture(): number {
    const enTete = enTeteRef.current;
    // Hauteur exacte (offsetHeight arrondit : un demi-pixel décalait le chant amené, 04/11/2026).
    if (enTete) return (parseFloat(getComputedStyle(enTete).top) || 0) + enTete.getBoundingClientRect().height + SOUS_LA_BASCULE;
    const barre = toolbarRef.current;
    const bascule = basculeRef.current;
    return (barre ? barre.offsetTop + barre.offsetHeight : 0) + (bascule?.offsetHeight ?? 0) + SOUS_LA_BASCULE;
  }

  /** Premier chant de la setlist (les transitions n'en sont pas). */
  const premierChant = () =>
    [...(setlist?.items ?? [])].filter(estUnChant).sort((a, b) => a.position - b.position)[0]?.position ?? 1;

  /** Liste → Partitions : une entrée d'historique, que « Liste » et le retour du
   *  navigateur referment. Un chant donné y est amené ; sinon on revient là où
   *  on était (Q10). */
  function versPartitions(n?: number) {
    if (view === "partitions") {
      if (n !== undefined) setCible({ type: "chant", n });
      return;
    }
    const chant = n ?? current ?? premierChant();
    enRoute.current = true;
    window.history.pushState({ vueG: true }, "", adresseVue(chant));
    setView("partitions");
    setCurrent(chant);
    setCible(
      n !== undefined ? { type: "chant", n } : retour.current ? { type: "chant", ...retour.current } : { type: "haut" },
    );
  }

  /** Partitions → Liste : retour en arrière si on est venu de la Liste, sinon
   *  (lien direct, rechargement) l'adresse de la Liste remplace la sienne. */
  function versListe() {
    if (view === "liste") return;
    retenirRetour();
    if (window.history.state?.vueG) {
      window.history.back();
      return;
    }
    window.history.replaceState({}, "", adresseVue(null));
    setView("liste");
    setCible({ type: "ligne" });
  }

  // Glissement entre les deux vues (Q13) : la Liste à gauche, les Partitions à
  // droite ; même chemin que la bascule (historique, chant lu, retour à la ligne).
  useSwipeViews({
    zone: zoneRef,
    vue: vueRef,
    cle: view,
    versGauche: view === "liste" ? () => versPartitions() : undefined,
    versDroite: view === "partitions" ? versListe : undefined,
    actif: !!setlist && setlist.items.length > 0 && !performanceMode && !deuxVolets,
  });

  // Amène la vue affichée à sa cible, une fois les partitions là.
  useEffect(() => {
    if (!cible || cible === cibleFaite.current || !setlist) return;
    enRoute.current = true;
    if (cible.type === "ligne") {
      if (view !== "liste") return;
      cibleFaite.current = cible;
      enRoute.current = false;
      const ligne = current !== null ? document.querySelector<HTMLElement>(`[data-ligne="${current}"]`) : null;
      if (!ligne) return;
      // Après le retour du navigateur, qui rend sa hauteur à la liste.
      requestAnimationFrame(() => {
        const r = ligne.getBoundingClientRect();
        const haut = r.top + window.scrollY;
        // En haut de page si la ligne y tient (en-tête compris), sinon sous la bascule.
        poser(haut + r.height <= window.innerHeight - 16 ? 0 : haut - hautDeLecture());
      });
      return;
    }
    if (!affichePartitions || loadingContent) return;
    if (cible.type === "haut") {
      cibleFaite.current = cible;
      enRoute.current = false;
      posee.current = poser(0);
      return;
    }
    const chant = document.querySelector<HTMLElement>(`[data-outline-item="${cible.n}"]`);
    // Une pastille du sommaire : sa section, sinon (scan 简谱) le chant.
    const el = (cible.uid && chant?.querySelector<HTMLElement>(`[data-section-uids~="${CSS.escape(cible.uid)}"]`)) || chant;
    if (!el) {
      // Contenus pas encore là : on attend ; chargés sans ce chant : on renonce.
      if (Object.keys(contents).length > 0) {
        cibleFaite.current = cible;
        enRoute.current = false;
      }
      return;
    }
    cibleFaite.current = cible;
    enRoute.current = false;
    const decalage = cible.decalage ?? 0;
    const n = cible.n;
    const amener = () => {
      posee.current = poser(el.getBoundingClientRect().top + window.scrollY - hautDeLecture() - decalage);
      // Le chant amené reste le chant lu, et l'adresse avec lui : un défilement de
      // passage (page qui se recoupe pendant la mise en page) a pu en lire un autre.
      setCurrent(n);
      if (surLaSetlist(id) && lireAdresse()?.chant !== n) window.history.replaceState(window.history.state, "", adresseVue(n));
    };
    amener();
    // Ce qui se met en page après (scans 简谱, polices) : le chant reste en place
    // jusqu'au premier geste. L'ancrage du navigateur, qui choisirait un autre
    // repère, est suspendu le temps de tenir.
    // Tenu hors du cycle de l'effet : il se relance dès que la cible est consommée.
    lacherRef.current?.();
    const root = document.documentElement;
    root.style.overflowAnchor = "none";
    const ro = new ResizeObserver(() => amener());
    // La colonne entière (en-tête compris) : `body` garde la hauteur de l'écran.
    ro.observe(basculeRef.current?.parentElement ?? el);
    const GESTES = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    const lacher = () => {
      ro.disconnect();
      root.style.overflowAnchor = "";
      for (const ev of GESTES) window.removeEventListener(ev, lacher);
      window.clearTimeout(fin);
      if (lacherRef.current === lacher) lacherRef.current = null;
    };
    for (const ev of GESTES) window.addEventListener(ev, lacher, { passive: true });
    const fin = window.setTimeout(lacher, 2000);
    lacherRef.current = lacher;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `current` n'est lu que pour la ligne visée
  }, [cible, view, affichePartitions, loadingContent, contents, setlist]);

  // En quittant la page, ou en passant à la Liste, le chant amené est lâché.
  useEffect(() => {
    if (!affichePartitions) lacherRef.current?.();
  }, [affichePartitions]);

  useEffect(() => () => lacherRef.current?.(), []);

  /** Chant à la ligne de lecture des partitions, et l'élément qui le porte. */
  function chantALaLigne(): { n: number; el: HTMLElement | null; uids: string[] } {
    const line = hautDeLecture() + 1;
    let found: HTMLElement | null = null;
    for (const el of document.querySelectorAll<HTMLElement>("[data-outline-item]")) {
      if (el.getBoundingClientRect().top > line) break;
      found = el;
    }
    // Section lue : la dernière dont le haut a passé la ligne (aucune avant la
    // première, ni sur un scan 简谱).
    let uids: string[] = [];
    found?.querySelectorAll<HTMLElement>("[data-section]").forEach((s) => {
      if (s.getBoundingClientRect().top <= line) uids = (s.dataset.sectionUids ?? "").split(" ").filter(Boolean);
    });
    return { n: found ? Number(found.dataset.outlineItem) : premierChant(), el: found, uids };
  }

  /** Retient où en sont les partitions : le chant lu et son haut sous la ligne de lecture. */
  function retenirRetour({ n, el } = chantALaLigne()) {
    const haut = (el ?? document.querySelector<HTMLElement>(`[data-outline-item="${n}"]`))?.getBoundingClientRect().top;
    if (haut !== undefined) retour.current = { n, decalage: haut - hautDeLecture() };
  }

  // Le chant lu suit le défilement des partitions, et l'adresse avec lui, sans
  // nouvelle entrée d'historique (Q9).
  useEffect(() => {
    if (!affichePartitions || loadingContent) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!surLaSetlist(id)) return;
      // Partitions déjà retirées (passage à la Liste, avant que l'effet ne se
      // nettoie) : rien à lire — le premier chant serait pris pour le chant lu.
      if (!document.querySelector("[data-outline-item]") || enRoute.current) return;
      // Une seule lecture du DOM par image, pour le retour et pour le chant lu.
      const lu = chantALaLigne();
      retenirRetour(lu);
      if (posee.current !== null && Math.abs(window.scrollY - posee.current) <= 4) return;
      posee.current = null;
      const { n, uids } = lu;
      setCurrent(n);
      // Même section qu'à l'image d'avant : le même tableau, pour que React n'ait rien à
      // refaire (un tableau neuf re-rendait toute la page à chaque image de défilement).
      setUidsLus((avant) => (avant.length === uids.length && avant.every((u, i) => u === uids[i]) ? avant : uids));
      if (lireAdresse()?.chant !== n) {
        // L'état de Next (`__NA`) est gardé : sans lui, Next relit l'adresse comme une
        // navigation et abandonne celle qui partait (un titre touché pendant le
        // défilement n'ouvrait pas la page du chant).
        window.history.replaceState(window.history.state, "", adresseVue(n));
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lecture du DOM au défilement
  }, [affichePartitions, loadingContent]);

  /** Sommaire des deux volets : un chant (ou une de ses sections) touché vient
   *  sous l'en-tête et devient le chant lu ; l'adresse le suit, sans nouvelle entrée. */
  function allerA(n: number, uid?: string) {
    compter("cmd.setlist.sommaire");
    enRoute.current = true;
    setCurrent(n);
    setUidsLus(uid ? [uid] : []);
    setCible({ type: "chant", n, uid });
    window.history.replaceState(window.history.state, "", adresseVue(n));
  }

  /** `"liste"` : le PDF liste (la vue liste de G, « Liste » de « Quel PDF ? » en deux volets). */
  async function handleDownload(style: PdfStyle | "liste" = "classic", version: PdfVersion = "presidence") {
    if (!setlist) return;
    setDownloading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      if (style === "liste") {
        const { SetlistOverviewPDF } = await import("@/components/pdf/SetlistOverviewPDF");
        const blob = await pdf(
          <SetlistOverviewPDF setlist={setlist} songsMap={songsMap} language={i18n.language} />
        ).toBlob();
        telechargerBlob(blob, `${setlist.title}-liste.pdf`);
      } else {
        // Fetch any missing song contents inline (don't depend on React state timing)
        const allContents: Record<string, SongContent> = { ...contents };
        const slugsToFetch: string[] = [];
        for (const item of setlist.items) {
          if (item.type === "fusion" && item.fusionSongs) {
            for (const fs of item.fusionSongs) {
              if (!allContents[fs.songSlug]) slugsToFetch.push(fs.songSlug);
            }
          } else if (item.songSlug && !allContents[item.songSlug]) {
            slugsToFetch.push(item.songSlug);
          }
        }
        await Promise.all(
          slugsToFetch.map(async (slug) => {
            try {
              const res = await fetchSongAST(slug);
              if (res) allContents[slug] = res;
            } catch { /* skip */ }
          })
        );
        setContents(allContents);
        const { SetlistFullPDF } = await import("@/components/pdf/SetlistFullPDF");
        // Le rendu PDF n'exécute pas d'effets : les manifestes 简谱 doivent
        // être résolus avant l'appel.
        const [sheets, sheetChords, cadrage] = await Promise.all([loadJianpuManifest(), loadJianpuChords(), loadJianpuCadrage()]);
        // Ré-encodage PNG des seules pages réellement imprimées, coupées sous
        // l'en-tête gravé.
        // « Ma version » : exactement les items de la vue affichée (stageItems, hors mode Adapter).
        const mesItems = version === "mine" ? setlist.items.map(editMine ? withMine : withChosen).map(withMineStructure) : setlist.items;
        const sheetFiles = mesItems.flatMap((it) =>
          sheetEnabled(jianpuPref, it.jianpuSheet)
            ? (sheets[it.songSlug]?.pages ?? []).map((p, i) => ({ file: p.file, top: cadrage[it.songSlug]?.[i] ?? 0 }))
            : [],
        );
        const sheetImages: Record<string, string> = {};
        await Promise.all(
          sheetFiles.map(async ({ file, top }) => {
            const url = await jianpuPngDataUrl(file, top);
            if (url) sheetImages[file] = url;
          }),
        );
        const blob = await pdf(
          <SetlistFullPDF
            setlist={{ ...setlist, items: mesItems }}
            contents={allContents}
            showChords={showChords}
            jianpuSheets={sheets}
            jianpuChords={sheetChords}
            jianpuCadrage={cadrage}
            jianpuImages={sheetImages}
            jianpuPref={jianpuPref}
            sectionStyle={style === "classic" ? "classic" : "colors"}
            layout={style === "compact" ? "unique" : "played"}
            language={i18n.language}
          />
        ).toBlob();
        telechargerBlob(blob, pdfFileName(setlist.title, style, "partitions"));
      }
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!setlist || !user) return;
    setDeleting(true);
    try {
      // Setlist de fête : suppression définitive comme avant (SC2, Q3) ; les autres vont à la corbeille.
      if (setlist.fete) {
        await deleteSetlist(id);
        router.push("/setlists");
      } else {
        await mettreALaCorbeille(id, user.uid);
        compter("cmd.setlist.corbeille.mettre");
        router.push(`/setlists?corbeille=${encodeURIComponent(id)}`);
      }
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleDuplicate() {
    if (!setlist || !user) return;
    setDuplicating(true);
    try {
      const newId = await duplicateSetlist(
        setlist,
        user.uid,
        `${setlist.title} ${t("setlists.detail.duplicateCopySuffix")}`
      );
      router.push(`/setlists/${newId}/edit`);
    } catch {
      setDuplicating(false);
    }
  }

  function flashFeedback(msg: string) {
    setShareFeedback(msg);
    window.setTimeout(() => setShareFeedback(null), 3000);
  }

  async function handleShare() {
    if (!setlist) return;
    const url = `${window.location.origin}/setlists/${id}`;
    // Privée avec équipe : le lien s'ouvre pour son équipe seulement (PS14), il est copié et on le dit.
    const privee = !!setlist.isPrivate;
    const avecEquipe = !!setlist.editeurs?.length;
    if (privee && !avecEquipe) {
      // Le destinataire n'y aura pas accès tant qu'elle est privée
      flashFeedback(t("setlists.detail.sharePrivateWarning"));
      return;
    }
    if (privee) {
      try {
        await navigator.clipboard.writeText(url);
        compter("cmd.setlist.partager");
        flashFeedback(t("setlists.detail.sharePrivateEquipe"));
      } catch { /* clipboard indisponible */ }
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: setlist.title, url });
        compter("cmd.setlist.partager");
        return;
      } catch { return; /* partage annulé */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      compter("cmd.setlist.partager");
      flashFeedback(t("setlists.detail.linkCopied"));
    } catch { /* clipboard indisponible */ }
  }

  // Valide la setlist du culte et prévient l'équipe (musiciens, régie, choristes)
  // de service ce dimanche-là via notification push.
  async function handleNotifyTeam() {
    if (!setlist || notifying) return;
    setNotifying(true);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/push/notify-setlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ setlistId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        compter("cmd.setlist.notifier");
        flashFeedback(
          t("setlists.detail.notifySent", {
            defaultValue: "Équipe prévenue ({{count}} notifications envoyées).",
            count: data.sent ?? 0,
          })
        );
      } else {
        flashFeedback(
          data.code === "busy"
            ? t("setlists.detail.notifyBusy")
            : data.error || t("setlists.detail.notifyError", { defaultValue: "Échec de l'envoi." })
        );
      }
    } catch {
      flashFeedback(t("setlists.detail.notifyError", { defaultValue: "Échec de l'envoi." }));
    } finally {
      setNotifying(false);
    }
  }

  // ── Idées d'harmonie (lot 9) ────────────────────────────────────────────────
  // Réservées aux pianistes et guitaristes (et aux admins) ; « Essayer dans Ma
  // version » n'apparaît que dans le mode « Ma version », seul endroit où une
  // retouche ne touche personne d'autre.
  const accesHarmonie = useAccesHarmonie();
  const [instrumentHarmonie] = useInstrument(accesHarmonie);
  const [ideesTarget, setIdeesTarget] = useState<number | null>(null);
  // Dans une fusion : celui de ses chants dont on lit les idées.
  const [ideesChant, setIdeesChant] = useState<string | null>(null);

  // ── Adapter le chant (accords/paroles par setlist) ──────────────────────────

  /** Source ChordPro de travail d'un item : version modifiée sinon original
   *  (en mode « Ma version » : la mienne d'abord). */
  function sourceForItem(item: SetlistItem): string | null {
    return (editMine ? withMine(item) : item).contentOverride ?? contents[item.songSlug]?.source ?? null;
  }

  function handleSelectLine(itemIndex: number, line: ChordProLine, sectionUid?: string) {
    if (!setlist || line.srcLine === undefined) return;
    const item = setlist.items[itemIndex];
    const source = sourceForItem(item);
    if (!source) {
      // Contenu pas encore fetché (vue Partitions en cours de chargement)
      flashFeedback(
        t("setlists.contentEdit.songLoading", {
          defaultValue: "Chant en cours de chargement — réessaie dans un instant.",
        })
      );
      return;
    }
    const baseAst = itemAst(editMine ? withMine(item) : item, contents[item.songSlug]);
    if (!baseAst) return;
    const origKey = baseAst.metadata.key;

    // Section répétée par la structure ? On note l'occurrence tapée : Adapter
    // matérialise une copie, « Ma version » propose le choix à l'enregistrement.
    let repeatedSectionId: string | undefined;
    let structIndex: number | undefined;
    const struct = editMine ? myStructure(item) : item.structureOverride;
    if (struct && sectionUid) {
      const sec = baseAst.sections.find((s) => s.lines.some((l) => l.srcLine === line.srcLine));
      if (sec) {
        const refs = struct.filter((ov) => ov === sec.id || idDeSection(ov) === sec.id);
        if (refs.length > 1) {
          const j = struct.findIndex((ov, k) => structUidAt(ov, k) === sectionUid);
          if (j !== -1) {
            repeatedSectionId = sec.id;
            structIndex = j;
          }
        }
      }
    }

    // Section modulée (升调) : la sheet affiche et re-stocke les accords dans
    // la tonalité de la section, pas celle de l'item.
    const displayKey =
      (sectionUid
        ? item.sectionKeys?.[sectionUid] ?? item.sectionKeys?.[idDeSection(sectionUid)]
        : undefined) ??
      item.keyOverride ??
      origKey;

    setRepeatScope("all");
    setEditTarget({
      itemIndex,
      raw: source.split("\n")[line.srcLine] ?? "",
      pinyin: line.pinyin,
      language: baseAst.metadata.language === "zh" ? "zh" : "fr",
      semitones: semitonesTo(origKey, displayKey),
      targetKey: displayKey,
      originalKey: origKey,
      srcLine: line.srcLine,
      pinyinSrcLine: line.pinyinSrcLine,
      jianpuSrcLine: line.jianpuSrcLine,
      repeatedSectionId,
      structIndex,
    });
  }

  /** Écrit (override = string) ou retire (override = undefined) la version
   *  modifiée d'un item, en ré-appliquant sur l'état Firestore le plus frais :
   *  on n'écrase pas les modifications concurrentes des autres items, et un
   *  conflit sur le même chant est détecté au lieu d'être écrasé. */
  async function persistOverride(
    itemIndex: number,
    override: string | undefined,
    extra?: Partial<SetlistItem>
  ): Promise<boolean> {
    if (!setlist) return false;
    setSavingLine(true);
    try {
      let base = setlist;
      try {
        const fresh = await getSetlist(id);
        if (fresh) {
          const local = setlist.items[itemIndex];
          const remote = fresh.items[itemIndex];
          const structureChanged =
            !remote || remote.songSlug !== local.songSlug || remote.type !== local.type;
          const overrideChanged =
            !structureChanged &&
            (remote.contentOverride ?? null) !== (local.contentOverride ?? null);
          if (structureChanged || overrideChanged) {
            setSetlist(fresh);
            setEditTarget(null);
            flashFeedback(
              t("setlists.contentEdit.conflict", {
                defaultValue: "La setlist a été modifiée entre-temps — vérifie puis réessaie.",
              })
            );
            return false;
          }
          base = fresh;
        }
      } catch {
        /* hors-ligne / lecture impossible : on tente sur l'état local */
      }
      const items = base.items.map((it, i) => {
        if (i !== itemIndex) return it;
        const rest = { ...it, ...(extra ?? {}) };
        if (override === undefined) delete rest.contentOverride;
        else rest.contentOverride = override;
        return rest;
      });
      await updateSetlist(id, { items });
      setSetlist({ ...base, items });
      setEditTarget(null);
      const author = historyAuthor(profile);
      if (author) {
        historyPassRef.current = continuePass(historyPassRef.current, id, author, base);
        await recordHistory(historyPassRef.current, { ...base, items }, (slug) => songsMap[slug]?.sections);
        setHistoryVersion((v) => v + 1);
      }
      return true;
    } catch {
      flashFeedback(t("setlists.contentEdit.saveError", { defaultValue: "Échec de l'enregistrement — réessaie." }));
      return false;
    } finally {
      setSavingLine(false);
    }
  }

  /** Réécrit mon document de versions — jamais la setlist : ni relecture,
   *  ni historique. */
  async function saveMine(items: Record<string, VersionItem>, choices: Record<string, string>): Promise<boolean> {
    if (!user) return false;
    setSavingLine(true);
    try {
      const doc: SetlistVersions = {
        authorUid: user.uid,
        authorName: historyAuthor(profile)?.name ?? "",
        items,
        choices,
      };
      await saveSetlistVersions(id, user.uid, doc);
      setVersions((v) => ({ ...v, [user.uid]: doc }));
      setEditTarget(null);
      setStructureTarget(null);
      return true;
    } catch {
      flashFeedback(t("setlists.contentEdit.saveError", { defaultValue: "Échec de l'enregistrement — réessaie." }));
      return false;
    } finally {
      setSavingLine(false);
    }
  }

  /** Modifie ma version d'un chant (accords et paroles, structure, partage).
   *  Une version revenue à la présidence sur tout est retirée. */
  async function persistMine(songSlug: string, patch: Partial<VersionItem>, cle: string | null = "shared" in patch ? "cmd.chant.partagerVersion" : "cmd.chant.maVersion") {
    if (!user) return;
    const prev = versions[user.uid];
    const items = { ...(prev?.items ?? {}) };
    const next = { ...(items[songSlug] ?? { content: null, structure: null, shared: false }), ...patch };
    if (next.content === null && next.structure === null && !aDesRetouches(next.jianpuChords)) {
      delete items[songSlug];
    }
    else items[songSlug] = next;
    if (await saveMine(items, prev?.choices ?? {})) compter(cle);
  }

  /** Retient la version choisie pour un chant (« presidence » ou l'uid de son auteur). */
  async function persistChoice(songSlug: string, value: string) {
    if (!user) return;
    const prev = versions[user.uid];
    await saveMine(prev?.items ?? {}, { ...(prev?.choices ?? {}), [songSlug]: value });
  }

  /** Retouche d'accords sur un scan 简谱 (lot 9, docs/spec-harmonie.md) : dans
   *  l'item de la setlist pour la présidence — donc dans l'historique, avec la
   *  phrase des autres retouches d'Adapter —, dans ma version pour moi. Le
   *  calque publié (`public/jianpu/chords.json`) n'est jamais écrit. */
  async function handleEditJianpu(itemIndex: number, next: JianpuChords) {
    if (!setlist) return;
    const item = setlist.items[itemIndex];
    if (editMine) {
      await persistMine(item.songSlug, { jianpuChords: next });
      return;
    }
    if (await persistOverride(itemIndex, item.contentOverride ?? undefined, { jianpuChords: next })) compter("cmd.chant.adapter");
  }

  /** Applique un nouveau source complet : no-op si rien n'a changé, retrait
   *  automatique de l'override s'il redevient identique au chant original. */
  async function applyNewSource(
    itemIndex: number,
    next: string,
    extra?: Partial<SetlistItem>,
    mine?: Partial<VersionItem>
  ) {
    if (!setlist) return;
    const current = sourceForItem(setlist.items[itemIndex]);
    if (next === current && !extra && !mine) {
      setEditTarget(null);
      return;
    }
    if (editMine) {
      // Ma version : retirée d'elle-même si elle redevient celle de la présidence.
      const item = setlist.items[itemIndex];
      const presidency = item.contentOverride ?? contents[item.songSlug]?.source;
      await persistMine(item.songSlug, { content: next === presidency ? null : next, ...mine });
      return;
    }
    const original = contents[setlist.items[itemIndex].songSlug]?.source;
    if (await persistOverride(itemIndex, next === original ? undefined : next, extra)) compter("cmd.chant.adapter");
  }

  /** Ligne d'une section répétée par la structure : duplique la section dans
   *  le source et fait pointer cette occurrence vers la copie, pour que
   *  l'édition ne touche pas les autres répétitions. Renvoie le source (et les
   *  index de lignes) sur lesquels appliquer l'édition, plus les champs d'item
   *  à persister (structure et notes/transitions re-clés). */
  function materializeIfRepeated(item: SetlistItem, source: string, t: LineEditState): EditBase {
    const passthrough = {
      source,
      srcLine: t.srcLine,
      pinyinSrcLine: t.pinyinSrcLine,
      jianpuSrcLine: t.jianpuSrcLine,
    };
    if (t.repeatedSectionId === undefined || t.structIndex === undefined || !item.structureOverride) {
      return passthrough;
    }
    const mat = materializeSectionCopy(source, t.repeatedSectionId);
    if (!mat) return passthrough;
    const oldUid = structUidAt(item.structureOverride[t.structIndex], t.structIndex);
    const newUid = `${mat.newSectionId}-${t.structIndex}`;
    const structureOverride = item.structureOverride.map((ov, k) =>
      k === t.structIndex ? newUid : ov
    );
    const sectionNotes = { ...item.sectionNotes };
    if (sectionNotes[oldUid] !== undefined) {
      sectionNotes[newUid] = sectionNotes[oldUid];
      delete sectionNotes[oldUid];
    }
    const sectionTransitions = item.sectionTransitions ? { ...item.sectionTransitions } : undefined;
    if (sectionTransitions && sectionTransitions[oldUid] !== undefined) {
      sectionTransitions[newUid] = sectionTransitions[oldUid];
      delete sectionTransitions[oldUid];
    }
    const sectionNuances = item.sectionNuances ? { ...item.sectionNuances } : undefined;
    if (sectionNuances && sectionNuances[oldUid] !== undefined) {
      sectionNuances[newUid] = sectionNuances[oldUid];
      delete sectionNuances[oldUid];
    }
    const sectionKeys = item.sectionKeys ? { ...item.sectionKeys } : undefined;
    if (sectionKeys && sectionKeys[oldUid] !== undefined) {
      sectionKeys[newUid] = sectionKeys[oldUid];
      delete sectionKeys[oldUid];
    }
    return {
      source: mat.source,
      srcLine: t.srcLine + mat.lineOffset,
      pinyinSrcLine: t.pinyinSrcLine !== undefined ? t.pinyinSrcLine + mat.lineOffset : undefined,
      jianpuSrcLine: t.jianpuSrcLine !== undefined ? t.jianpuSrcLine + mat.lineOffset : undefined,
      extra: {
        structureOverride,
        sectionNotes,
        ...(sectionTransitions ? { sectionTransitions } : {}),
        ...(sectionNuances ? { sectionNuances } : {}),
        ...(sectionKeys ? { sectionKeys } : {}),
        // Provenance de la copie : « Rétablir l'original » s'en sert pour
        // ramener cette occurrence sur la section du chant.
        sectionOrigins: { ...item.sectionOrigins, [mat.newSectionId]: t.repeatedSectionId },
      },
    };
  }

  /** « Seulement ce passage » (Ma version) : la section répétée est copiée dans
   *  mon source et ma structure fait pointer cette occurrence vers la copie —
   *  le mécanisme d'Adapter, écrit dans mon document. */
  function materializeMine(item: SetlistItem, source: string, t: LineEditState): EditBase | null {
    const struct = myStructure(item);
    if (t.repeatedSectionId === undefined || t.structIndex === undefined || !struct) return null;
    const mat = materializeSectionCopy(source, t.repeatedSectionId);
    if (!mat) return null;
    return {
      source: mat.source,
      srcLine: t.srcLine + mat.lineOffset,
      pinyinSrcLine: t.pinyinSrcLine !== undefined ? t.pinyinSrcLine + mat.lineOffset : undefined,
      jianpuSrcLine: t.jianpuSrcLine !== undefined ? t.jianpuSrcLine + mat.lineOffset : undefined,
      mine: {
        structure: struct.map((ov, k) => (k === t.structIndex ? `${mat.newSectionId}-${t.structIndex}` : ov)),
        // Provenance de la copie : elle situe le passage chez qui lit ma
        // version partagée avec une autre structure.
        sectionOrigins: {
          ...myItems?.[item.songSlug]?.sectionOrigins,
          [mat.newSectionId]: t.repeatedSectionId,
        },
      },
    };
  }

  /** Base d'une édition de ligne : Adapter copie toujours l'occurrence tapée,
   *  « Ma version » seulement si la retouche ne vise que ce passage. */
  function editBase(item: SetlistItem, source: string, t: LineEditState): EditBase {
    if (!editMine) return materializeIfRepeated(item, source, t);
    const one = repeatScope === "one" ? materializeMine(item, source, t) : null;
    return (
      one ?? {
        source,
        srcLine: t.srcLine,
        pinyinSrcLine: t.pinyinSrcLine,
        jianpuSrcLine: t.jianpuSrcLine,
      }
    );
  }

  async function handleSaveLine(newRaw: string) {
    if (!setlist || !editTarget) return;
    const source = sourceForItem(setlist.items[editTarget.itemIndex]);
    if (!source) return;
    // Ligne inchangée (y compris pinyin encore sur sa ligne séparée) → no-op.
    if (newRaw === source.split("\n")[editTarget.srcLine]) {
      setEditTarget(null);
      return;
    }
    const m = editBase(setlist.items[editTarget.itemIndex], source, editTarget);
    let next = replaceSourceLine(m.source, m.srcLine, newRaw);
    // Le pinyin est désormais inline dans la ligne → la ligne séparée disparaît.
    if (m.pinyinSrcLine !== undefined) {
      next = deleteSourceLines(next, [m.pinyinSrcLine]);
    }
    await applyNewSource(editTarget.itemIndex, next, m.extra, m.mine);
  }

  async function handleInsertAfter(newRaw: string) {
    if (!setlist || !editTarget) return;
    const source = sourceForItem(setlist.items[editTarget.itemIndex]);
    if (!source) return;
    const m = editBase(setlist.items[editTarget.itemIndex], source, editTarget);
    const at = Math.max(m.srcLine, m.pinyinSrcLine ?? -1);
    await applyNewSource(editTarget.itemIndex, insertSourceLineAfter(m.source, at, newRaw), m.extra, m.mine);
  }

  async function handleDeleteLine() {
    if (!setlist || !editTarget) return;
    const source = sourceForItem(setlist.items[editTarget.itemIndex]);
    if (!source) return;
    const m = editBase(setlist.items[editTarget.itemIndex], source, editTarget);
    const idxs = [m.srcLine];
    if (m.pinyinSrcLine !== undefined) idxs.push(m.pinyinSrcLine);
    if (m.jianpuSrcLine !== undefined) idxs.push(m.jianpuSrcLine);
    await applyNewSource(editTarget.itemIndex, deleteSourceLines(m.source, idxs), m.extra, m.mine);
  }

  async function handleRevert(itemIndex: number) {
    setConfirmRevert(null);
    if (!setlist) return;
    if (editMine) {
      await persistMine(setlist.items[itemIndex].songSlug, {
        content: null,
        structure: null,
        // Mes passages retouchés seuls disparaissent avec mon contenu.
        sectionOrigins: undefined,
        jianpuChords: undefined,
      }, "cmd.chant.retablir");
      return;
    }
    // Les sections matérialisées disparaissent avec le contenu adapté : la
    // structure doit repointer vers les sections d'origine, sinon les
    // occurrences modifiées sortent de la setlist. Les retouches du scan
    // partent avec le reste : ce sont des accords adaptés comme les autres.
    if (await persistOverride(itemIndex, undefined, {
      ...revertSectionOrigins(setlist.items[itemIndex]),
      jianpuChords: {},
    })) compter("cmd.chant.retablir");
  }

  if (loadingSetlist) {
    return <EcranChargement />;
  }

  if (!user) {
    return <EcranConnexion id={id} />;
  }

  if (loadError) {
    return <EcranErreur onRetry={() => setRetryKey((k) => k + 1)} />;
  }

  if (!setlist) {
    return <EcranIntrouvable backPath={backPath} />;
  }

  // Accès : uniquement les setlists de ses services/groupe (ou créées par soi) ; lot AO (F1) : et celle d'une date
  // où l'on sert. Tant que le planning se lit, une personne qui n'a pas d'autre accès attend au lieu de voir « pas d'accès ».
  // Copie hors ligne : son existence vaut accès (le profil peut être introuvable sans réseau).
  if (copieLueLe === null && !canSeeSetlist(user, profile, setlist, datesDuCompte)) {
    // Profil en cours de relecture (retour du réseau après une copie) : attendre, ne pas conclure à « pas d'accès ».
    if (authLoading || (BACK_OFFICE && planningName && datesDuCompte === undefined)) {
      return <EcranChargement />;
    }
    return <EcranSansAcces />;
  }

  // Modification : le créateur, son équipe, les admins (SC1, docs/spec-createur-corbeille-absences.md)
  // Copie hors ligne : rien ne s'écrit en base pendant ce temps (modifier, supprimer, dupliquer, versions…).
  const horsLigne = copieLueLe !== null;
  const canEdit = !horsLigne && canEditSetlist(user, profile, setlist);
  // Suppression : le même droit, sous son nom — la liste (lot 10) s'en sert aussi
  const canDelete = !horsLigne && canDeleteSetlist(user, profile, setlist);
  // Items affichés : la version choisie (en mode « Ma version » : la mienne)
  // remplace celle de la présidence — accords et paroles pour la vue
  // partitions (qui applique ma structure au corps seul), ma structure
  // comprise pour le sommaire et le mode louange. Mode Adapter : la
  // présidence seule.
  const displayItems = editPartitions ? setlist.items : setlist.items.map(editMine ? withMine : withChosen);
  const stageItems = editPartitions ? setlist.items : displayItems.map(withMineStructure);
  // « Quel PDF ? » propose ma version quand elle diffère de la présidence (identité d'objet : les trois transformations rendent l'item lui-même quand rien ne change).
  const aMaVersion = !editPartitions && !!user && stageItems.some((it, i) => it !== setlist.items[i]);
  const versionViews = editPartitions
    ? undefined
    : Object.fromEntries(setlist.items.filter((it) => it.songSlug).map((it) => [it.songSlug, viewOf(it)!]));
  const canDuplicate = !horsLigne && canDuplicateSetlist(user, profile, setlist);
  // Notif « setlist prête » : pour toute setlist modifiable par l'utilisateur,
  // contenant au moins 4 vrais chants (hors transitions). Toutes catégories.
  const realSongCount = setlist.items.filter((i) => i.type !== "transition").length;
  const canNotifyTeam = canEdit && !setlist.fete;
  // Le toggle pinyin n'a de sens que si la setlist contient au moins un chant zh.
  const hasZhSong = setlist.items.some(
    (i) =>
      songsMap[i.songSlug]?.language === "zh" ||
      i.fusionSongs?.some((fs) => songsMap[fs.songSlug]?.language === "zh")
  );
  const peutChangerPresentation = !horsLigne && canSetPresentationLink(
    user,
    profile,
    setlist,
    estRegieDeLaSetlist(profile, setlist),
  );
  const presentationHref = setlist.presentationUrl ? parsePresentationUrl(setlist.presentationUrl) : null;
  // « Copier toutes les paroles » (question 6) : seulement si chaque chant suit la
  // présidence — ni ma version, ni ma structure, ni celle d'un autre (comme
  // « Copier les paroles » de chaque chant, PartitionView).
  const toutSuitLaPresidence = setlist.items.every((item) => {
    if (!item.songSlug || item.type === "fusion") return true;
    const v = viewOf(item);
    const shown = editMine ? (v?.mine?.content ? "mine" : "presidence") : (v?.shown ?? "presidence");
    return shown === "presidence" && !v?.mine?.structure?.length;
  });
  // … et seulement quand chaque chant est là : pendant le préchargement (Q14), ou sans un
  // chant qui n'a pas pu venir (hors ligne), la copie aurait omis des chants sans le dire.
  const tousLesChantsCharges =
    !loadingContent &&
    setlist.items.every((item) =>
      item.type === "fusion" && item.fusionSongs
        ? item.fusionSongs.every((fs) => !!contents[fs.songSlug])
        : !item.songSlug || !!contents[item.songSlug],
    );
  /** Plein écran natif : à demander en synchrone dans le geste (avant tout
   *  await), sinon la demande est rejetée ; iPhone Safari ne le connaît pas. */
  async function ouvrirModeLouange() {
    try {
      demanderPleinEcran();
    } catch { /* non supporté */ }
    await entrerEnLouange(true);
  }
  /** Aucun chant de la setlist n'a son contenu : « Continuer quand même » n'a rien à montrer (le mode Louange
   *  resterait sur « Mise en page… »). */
  const slugsDeLaSetlist = (setlist.items ?? []).flatMap((it) =>
    it.type === "fusion" && it.fusionSongs ? it.fusionSongs.map((fs) => fs.songSlug) : it.songSlug ? [it.songSlug] : [],
  );
  const aucunChantCharge = !slugsDeLaSetlist.some((slug) => !!contents[slug]);
  /** Un chant de la vue Partitions qui n'a pas chargé : on relit le sien seul. */
  async function rechargerUnChant(slug: string) {
    const res = await fetchSongAST(slug);
    if (res) setContents((prev) => ({ ...prev, [slug]: res }));
  }
  /** Toujours (re)charger : loadContents ne fetch que les chants manquants. Si certains manquent encore,
   *  le mode Louange ne s'ouvre pas en silence : le bandeau « N chants non chargés » propose de réessayer
   *  ou de continuer quand même (D4). */
  async function entrerEnLouange(pleinEcran: boolean): Promise<boolean> {
    const manquants = setlist ? await loadContents(setlist.items) : [];
    // Hors ligne, un chant dont le scan 简谱 n'est pas dans le cache du navigateur est « non chargé » aussi
    // (image cassée sinon). On ne sait que ce que le cache dit : en ligne, rien n'est vérifié.
    if (setlist && jianpuManifest && (copieLueLe !== null || !navigator.onLine)) {
      const aScan = setlist.items.filter((it) => it.songSlug && sheetEnabled(jianpuPref, it.jianpuSheet)).map((it) => it.songSlug);
      for (const slug of await scansAbsentsDuCache(jianpuManifest, aScan)) {
        if (!manquants.includes(slug)) manquants.push(slug);
      }
    }
    if (manquants.length) {
      setChantsManquants(manquants);
      if (pleinEcran && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return false;
    }
    setChantsManquants(null);
    compter("cmd.louange.ouvrir");
    setPerformanceMode(true);
    return true;
  }
  /** « Réessayer » du bandeau D4 : le plein écran se demande tout de suite, dans le clic (comme
   *  ouvrirModeLouange), puis l'essai ; un essai qui échoue encore le dit dans le bandeau. */
  async function reessayerLesChants() {
    try {
      demanderPleinEcran();
    } catch { /* non supporté */ }
    setEssaiEnCours(true);
    setEssaiEchoue(false);
    try {
      const ouvert = await entrerEnLouange(true);
      if (!ouvert) setEssaiEchoue(true);
    } finally {
      setEssaiEnCours(false);
    }
  }
  function fermerLeBandeauDesChants() {
    setChantsManquants(null);
    setEssaiEchoue(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  function continuerSansLesChants() {
    try {
      demanderPleinEcran();
    } catch { /* non supporté */ }
    setChantsManquants(null);
    compter("cmd.louange.ouvrir");
    setPerformanceMode(true);
  }
  // Qui peut modifier — rend visible la logique de access.ts.
  const droitsDeModifier = (
    <DroitsDeModifier setlist={setlist} canEdit={canEdit} droitsDeplies={droitsDeplies} onBasculer={() => setDroitsDeplies((o) => !o)} className="" />
  );
  // Réglages d'affichage : le bouton « Affichage » de G, le sous-menu « Affichage »
  // du ⋯ en deux volets (Q3, Q7).
  const reglagesAffichage = (
    <ReglagesAffichage
      layout={layout}
      changeLayout={changeLayout}
      hasZhSong={hasZhSong}
      showPinyin={showPinyin}
      togglePinyin={togglePinyin}
      disposition={disposition}
      changeDisposition={changeDisposition}
      hasJianpuSheets={hasJianpuSheets}
      jianpuPref={jianpuPref}
      changeJianpuPref={changeJianpuPref}
    />
  );
  // Actions du menu ⋯ communes à G et aux deux volets.
  const actionsPartagees = (
    <ActionsPartagees
      canNotifyTeam={canNotifyTeam}
      notifying={notifying}
      realSongCount={realSongCount}
      flashFeedback={flashFeedback}
      handleNotifyTeam={handleNotifyTeam}
      canDuplicate={canDuplicate}
      duplicating={duplicating}
      canEdit={canEdit}
      handleDuplicate={handleDuplicate}
      handleShare={handleShare}
      canChangerLien={peutChangerPresentation}
      aUnLien={!!setlist.presentationUrl}
      onLien={() => setEditionLien(true)}
      canExporter={peutExporterFreeShow(user, profile, setlist)}
      exportPret={tousLesChantsCharges}
      onExporter={() => { compter("cmd.setlist.presentation"); exporterFreeShow(setlist, contents); }}
    />
  );
  const supprimer = <MenuSupprimer canDelete={canDelete} onSupprimer={() => setConfirmDelete(true)} />;
  // Les partitions : à droite en deux volets, côté Partitions sur G.
  const partitions = (
    <>
      {editPartitions && (
        <p className="mb-4 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 print:hidden">
          {t("setlists.contentEdit.hint", {
            defaultValue:
              "Mode adaptation : touche une ligne pour modifier ses accords ou ses paroles. Les changements ne concernent que cette setlist.",
          })}
        </p>
      )}
      {editMine && (
        <p className="mb-4 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 print:hidden">
          {t("setlists.myVersion.hint")}
        </p>
      )}
      <PartitionsView
        setlistId={id}
        items={displayItems}
        contents={contents}
        loading={loadingContent}
        showChordsGlobal={showChords}
        showPinyinGlobal={showPinyin}
        disposition={disposition}
        jianpuPref={jianpuPref}
        layout={layout}
        editMode={editPartitions || editMine}
        versions={versionViews}
        editMine={editMine}
        onSelectLine={handleSelectLine}
        onRevert={(itemIndex) => setConfirmRevert(itemIndex)}
        onEditStructure={(itemIndex) => {
          const item = setlist.items[itemIndex];
          const ast = itemAst(withMine(item), contents[item.songSlug]);
          if (!ast) return;
          setStructureTarget({
            itemIndex,
            ast,
            structure: myItems?.[item.songSlug]?.structure ?? null,
            presidency: item.structureOverride,
          });
        }}
        onChooseVersion={(itemIndex, value) => persistChoice(setlist.items[itemIndex].songSlug, value)}
        onShare={(itemIndex, shared) => persistMine(setlist.items[itemIndex].songSlug, { shared })}
        onEditJianpu={handleEditJianpu}
        onRetryChant={rechargerUnChant}
        titres={Object.fromEntries(Object.entries(songsMap).map(([slug, e]) => [slug, e.title]))}
        onIdees={accesHarmonie.peut ? (itemIndex, slug) => { compter("cmd.setlist.idees"); setIdeesTarget(itemIndex); setIdeesChant(slug ?? null); } : undefined}
      />
    </>
  );
  // Bandeau de la copie hors ligne (A3, décision C2) : dans l'en-tête collant sur grand écran (il compte dans
  // `enTeteH`), sous la barre d'outils sur téléphone et tablette (la barre flottante le couvrirait). « Réessayer »
  // relit la setlist ; elle se relit aussi seule au retour du réseau.
  const texteCopie = copieLueLe === null ? null : t("setlists.detail.copieHorsLigne", {
    date: new Intl.DateTimeFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { dateStyle: "long", timeStyle: "short" }).format(copieLueLe),
  });
  const reessayerCopie = (
    <ReessayerCopie
      deuxVolets={deuxVolets}
      onReessayer={() => { window.dispatchEvent(new Event(RELIRE_PROFIL)); setRetryKey((k) => k + 1); }}
    />
  );
  return (
    <div className="relative min-h-screen bg-background">
      <Halo variant="fiche" color={categoryColor(setlist.category ?? "")} />
      {deuxVolets ? (
        // ── Deux volets (docs/spec-deux-volets.md, T4, planche `setlist-deux-volets`) :
        // l'en-tête pleine largeur colle en haut et s'escamote au défilement (Q7) ; à
        // gauche le sommaire (Q6), qui monte avec lui ; à droite toutes les partitions.
        // Toute la zone de contenu, sans borne (retours du 06/10/2026 : bornés à
        // `--largeur-lecture` et centrés, ils laissaient une bande vide à côté de la barre).
        <div className="relative">
          <header
            ref={enTeteRef}
            data-en-tete
            // Une barre comme les autres (V8) : fond opaque qui repeint la page et son halo.
            className="material-chrome print:hidden sticky z-20 border-b border-border transition-transform duration-300 [--barre-top:var(--nav-h)]"
            style={{
              top: "var(--nav-h)",
              transform: scrollVisible ? "translateY(0)" : "translateY(calc(-100% - var(--nav-h) - 12px))",
            }}
          >
            <FondDeBarre />
            {/* L1 (dimanche-7, lot CD T4b ; V5, validation du 07/11/2026) : la rangée finit où finit la colonne de lecture
                (860 px, `--colonne-partition`, centrée dans le volet de droite) : 380 px de sommaire + 28 de marge + 860 centrés
                dans le reste, plus 28 de marge = 50 % + 648 px ; vaut toute la largeur sous 1 296 px. */}
            <div className="flex max-w-[calc(50%+648px)] flex-wrap items-end gap-x-6 gap-y-3 px-7 pb-4 pt-5">
              {/* Le titre garde 18rem au moins : sinon les boutons passent dessous. */}
              <TitreEnTete setlist={setlist} passage={passageFete} />
              {/* Présentation · Adapter · Ma version · Modifier · PDF · ⋯ · Mode louange,
                  libellés compris ; la rangée passe sous le titre quand elle n'y tient pas. */}
              <div className="flex flex-wrap items-center gap-2">
                {presentationHref && (
                  <a href={presentationHref} target="_blank" rel="noopener noreferrer" className={PILULE}>
                    <Presentation className="h-4 w-4" aria-hidden />
                    {t("setlists.detail.presentation")}
                  </a>
                )}
                {canEdit && (
                  <button type="button" aria-pressed={editPartitions} onClick={toggleAdapter} className={editPartitions ? PILULE_ACTIVE : PILULE}>
                    <PenLine className="h-4 w-4" aria-hidden />
                    {t("setlists.contentEdit.toggle", { defaultValue: "Adapter" })}
                  </button>
                )}
                {(!horsLigne && canHaveSetlistVersion(user, profile, setlist)) && (
                  <button type="button" aria-pressed={editMine} onClick={toggleMaVersion} className={editMine ? PILULE_ACTIVE : PILULE}>
                    <UserRound className="h-4 w-4" aria-hidden />
                    {t("setlists.myVersion.toggle")}
                  </button>
                )}
                {canEdit && (
                  <Link href={`/setlists/${id}/edit`} className={PILULE}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    {t("setlists.detail.editButton")}
                  </Link>
                )}
                {/* SC1.5 : qui ne peut pas modifier duplique en copie privée pour ses notes. */}
                {!canEdit && canDuplicate && (
                  <button type="button" disabled={duplicating} onClick={() => handleDuplicate()} className={PILULE}>
                    <Copy className="h-4 w-4" aria-hidden />
                    {duplicating ? "…" : t("setlists.detail.duplicateForNotes")}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={t("setlists.detail.pdf")}
                  title={t("setlists.detail.pdf")}
                  disabled={downloading}
                  onClick={() => setShowPdfChoice(true)}
                  className={PILULE_ICONE}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={t("common.moreActions")} className={PILULE_ICONE}>
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Accords : le réglage vaut pour les partitions et le mode louange. */}
                    <DropdownMenuCheckboxItem
                      checked={showChords}
                      onCheckedChange={(v) => {
                        setShowChords(v);
                        setChordsTouched(true);
                      }}
                    >
                      {t("songs.detail.chords")}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        {t("setlists.detail.layout.label")}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent collisionPadding={12} className="w-56">{reglagesAffichage}</DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    {actionsPartagees}
                    {supprimer}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={ouvrirModeLouange}
                  // 5C1 : un bouton plein est en encre, sauf sur l'écran d'un culte, où il en prend la couleur.
                  style={{ backgroundColor: serviceButtonFill(categoryColor(setlist.category)) }}
                  className="flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-all duration-150 hover:brightness-95 active:scale-[.97] dark:ring-1 dark:ring-white/15"
                >
                  <Play className="h-4 w-4" aria-hidden />
                  {t("setlists.detail.performanceMode")}
                </button>
              </div>
            </div>
            {copieLueLe !== null && (
              <p role="status" data-copie-hors-ligne className="border-t border-border bg-muted px-7 py-1.5 text-center text-xs text-muted-foreground">
                {texteCopie}
                {reessayerCopie}
              </p>
            )}
          </header>

          <div className="grid grid-cols-[380px_minmax(0,1fr)]">
            {/* Le filet descend jusqu'en bas de la page ; le sommaire colle sous l'en-tête. */}
            <div className="border-r border-border print:hidden">
              <Sommaire
                items={stageItems}
                contents={contents}
                songsMap={songsMap}
                jianpuPref={jianpuPref}
                current={current ?? premierChant()}
                uidsLus={uidsLus}
                onGo={allerA}
                copier={toutSuitLaPresidence ? () => setlistLyricsText(setlist.items, contents) : undefined}
                copierPret={tousLesChantsCharges}
                className="sticky transition-[top,height] duration-300"
                style={{
                  top: scrollVisible ? `calc(var(--nav-h) + ${enTeteH}px)` : "var(--nav-h)",
                  height: scrollVisible ? `calc(100dvh - var(--nav-h) - ${enTeteH}px)` : "calc(100dvh - var(--nav-h))",
                }}
              />
            </div>
            <div className="min-w-0 px-7 pb-16 pt-6">
              {/* V5 : colonne de lecture de 860 px (au lieu de 42rem), centrée dans le volet ; seul ce volet pose la variable. */}
              <div className="mx-auto w-full max-w-[860px] [--colonne-partition:860px]">
              {/* Ce que garde la question 4, sous le titre : historique, langue, qui peut
                  modifier ; la régie ajoute ou change ici le lien de la présentation. */}
              <div className="mb-4 print:hidden">
                {/* Une seule rangée : droits (phrase dans le ⓘ), langue, historique (dimanche-16). */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {droitsDeModifier}
                  <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground">
                    {t("common.languages." + setlist.language, { defaultValue: setlist.language })}
                  </span>
                  <SetlistHistory key={historyVersion} setlistId={id} songsMap={songsMap} />
                </div>
                <PresentationLink
                  setlistId={id}
                  url={setlist.presentationUrl}
                  edition={editionLien}
                  onEdition={setEditionLien}
                  onSaved={(presentationUrl) => setSetlist({ ...setlist, presentationUrl })}
                  sansLien
                />
              </div>
              {setlist.items.length === 0 ? (
                <p className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  {t("setlists.detail.emptyItems")}
                </p>
              ) : (
                partitions
              )}
              {passageFete && <CartesFete passage={passageFete} />}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top bar — même style que SongDetailClient */}
          <div ref={toolbarRef} data-testid="barre-outils" className={`print:hidden fixed left-[var(--barre-laterale)] right-0 top-[var(--nav-h)] [--barre-top:var(--nav-h)] [--barre-left:var(--barre-laterale)] z-10 material-chrome transition-transform duration-300 ${ scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
            <FondDeBarre sousNavbar />
            <div className="max-w-[1080px] mx-auto px-[var(--marge-page)]">
              {/* Une seule ligne sur téléphone (retour du 20/09/2026) : 9 commandes de 32 px
                  tiennent à partir de 390 px ; en dessous, « Adapter » et « Ma version »
                  passent dans le menu « ⋯ ». Les libellés n'arrivent qu'à 1024 px :
                  icônes sur tout téléphone, portrait comme paysage (jusqu'à 956 px), et sur
                  iPad en portrait ; libellés sur iPad en paysage et ordinateur, à condition
                  de tenir à côté de la barre latérale (lot U4 : `.libelle-outil`, requête de
                  conteneur sur `.rangee-outils`, globals.css). `flex-wrap` reste le filet de
                  sécurité. */}
              <div className="rangee-outils flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2 py-[9px] flex-wrap">

                {/* ← Retour */}
                <Link aria-label={t("songs.detail.backToAll")}
                  href={backPath}
                  className={`${TOUCHER_44} h-8 px-2.5 max-sm:w-8 max-sm:justify-center max-sm:px-0 sm:mr-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground text-sm font-semibold flex items-center gap-0.5 transition-[background-color,color,transform] duration-150 active:scale-[.96]`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5m6-7l-7 7 7 7" />
                  </svg>
                  <span className="libelle-outil">{t("songs.detail.backToAll")}</span>
                </Link>

                {/* Setlist G (docs/spec-deux-volets.md, Q3 et Q11) : la même barre côté Liste
                    et côté Partitions — Affichage, Adapter, Accords, Ma version ; la bascule
                    « Liste | Partitions » est passée sous l'en-tête. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button aria-label={t("setlists.detail.layout.label")}
                      className={`${TOUCHER_44} ${PILULE_EMPILEE} h-8 px-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] bg-secondary text-muted-foreground hover:text-foreground`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span className="libelle-outil">{t("setlists.detail.layout.label")}</span>
                      <span aria-hidden className={LIBELLE_COURT}>{t("setlists.detail.layout.label")}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" collisionPadding={12} className="w-56">
                    {reglagesAffichage}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Adapter le chant (accords/paroles par setlist) */}
                {canEdit && (
                  <button aria-label={t("setlists.contentEdit.toggle", { defaultValue: "Adapter" })}
                    aria-pressed={editPartitions}
                    onClick={toggleAdapter}
                    className={`${TOUCHER_44} ${PILULE_EMPILEE} max-[430px]:hidden h-8 px-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] ${
                      editPartitions
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    <span className="libelle-outil">
                      {t("setlists.contentEdit.toggle", { defaultValue: "Adapter" })}
                    </span>
                    <span aria-hidden className={LIBELLE_COURT}>{t("setlists.contentEdit.toggle", { defaultValue: "Adapter" })}</span>
                  </button>
                )}

                {/* Accords — le réglage vaut pour les partitions et le mode louange */}
                <button aria-label={t("songs.detail.chords")}
                  aria-pressed={showChords}
                  onClick={() => {
                    setShowChords((s) => !s);
                    setChordsTouched(true);
                  }}
                  className={`${TOUCHER_44} ${PILULE_EMPILEE} h-8 px-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] ${
                    showChords
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>
                  <span className="libelle-outil">{t("songs.detail.chords")}</span>
                  <span aria-hidden className={LIBELLE_COURT}>{t("songs.detail.chords")}</span>
                </button>

                {/* Ma version (accords/paroles pour soi) — tout connecté */}
                {(!horsLigne && canHaveSetlistVersion(user, profile, setlist)) && (
                  <button aria-label={t("setlists.myVersion.toggle")}
                    aria-pressed={editMine}
                    onClick={toggleMaVersion}
                    className={`${TOUCHER_44} ${PILULE_EMPILEE} max-[430px]:hidden h-8 px-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] ${
                      editMine
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    <span className="libelle-outil">{t("setlists.myVersion.toggle")}</span>
                    <span aria-hidden className={LIBELLE_COURT}>{t("setlists.myVersion.toggle")}</span>
                  </button>
                )}

                {/* Mode louange et ⋯ — poussés à droite, sur la même ligne */}
                <div className="ml-auto flex items-center gap-1.5">

                  {/* Mode Louange — action principale en live */}
                  <button
                    onClick={ouvrirModeLouange}
                    aria-label={t("setlists.detail.performanceMode")}
                    // 5C1 : un bouton plein est en encre, sauf sur l'écran d'un culte, où il en prend la couleur.
                    style={{ backgroundColor: serviceButtonFill(categoryColor(setlist.category ?? "")) }}
                    className={`${TOUCHER_44} ${PILULE_EMPILEE} h-8 px-2.5 sm:px-3 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 hover:brightness-95 dark:ring-1 dark:ring-white/15 transition-all duration-150`}
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span className="libelle-outil">{t("setlists.detail.performanceMode")}</span>
                    <span aria-hidden className={LIBELLE_COURT}>{t("setlists.detail.performanceModeCourt")}</span>
                  </button>

                  {/* Menu ⋯ : Modifier / Prévenir l'équipe / Dupliquer / Partager / PDF / Supprimer */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-lg"
                        className={`${TOUCHER_44} h-8 w-8 rounded-md text-muted-foreground`}
                        aria-label={t("common.moreActions")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Téléphone étroit : les deux modes d'édition, sortis de la barre. */}
                      {canEdit && (
                        <DropdownMenuCheckboxItem className="min-[431px]:hidden" checked={editPartitions} onCheckedChange={toggleAdapter}>
                          {t("setlists.contentEdit.toggle", { defaultValue: "Adapter" })}
                        </DropdownMenuCheckboxItem>
                      )}
                      {(!horsLigne && canHaveSetlistVersion(user, profile, setlist)) && (
                        <DropdownMenuCheckboxItem className="min-[431px]:hidden" checked={editMine} onCheckedChange={toggleMaVersion}>
                          {t("setlists.myVersion.toggle")}
                        </DropdownMenuCheckboxItem>
                      )}
                      {(canEdit || (!horsLigne && canHaveSetlistVersion(user, profile, setlist))) && <DropdownMenuSeparator className="min-[431px]:hidden" />}
                      {canEdit && (
                        <DropdownMenuItem asChild>
                          <Link href={`/setlists/${id}/edit`}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            {t("setlists.detail.editButton")}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {actionsPartagees}
                      <DropdownMenuItem
                        disabled={downloading}
                        // Vue liste : le PDF liste, sans choix ; vue partitions : « Quel PDF ? ».
                        onClick={() => (view === "liste" ? handleDownload("liste") : setShowPdfChoice(true))}
                      >
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        {downloading ? "…" : t("songs.detail.downloadPdf")}
                      </DropdownMenuItem>
                      {supprimer}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <div ref={zoneRef} className={`relative pb-8 pt-6 print:px-0 print:py-4 ${enTablette ? "px-[var(--marge-page)] [--marge-bande:var(--marge-page)]" : "max-w-2xl mx-auto px-4 [--marge-bande:1rem]"} print:[--marge-bande:0px]`} style={{ marginTop: toolbarH }}>
            {copieLueLe !== null && (
              <div role="status" data-copie-hors-ligne className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-muted py-1 pl-3 pr-1 text-xs text-muted-foreground print:hidden">
                <span>{texteCopie}</span>
                {reessayerCopie}
              </div>
            )}
            {/* Header setlist */}
            <div className="pb-2 print:mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground">{titreAffiche(setlist, langueCourte(i18n.language))}</h1>
                  </div>
                  {setlist.fete ? <div className="mt-1"><RepereFete setlist={setlist} passage={passageFete} /><SousTitreFete setlist={setlist} passage={passageFete} /></div> : (
                  <p className="text-muted-foreground first-letter:uppercase mt-1 text-sm">
                    {formatDate(setlist.date, i18n.language)}
                  </p>)}
                  <SetlistHistory key={historyVersion} setlistId={id} songsMap={songsMap} />
                </div>
                <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground shrink-0 mt-1">
                  {t("common.languages." + setlist.language, { defaultValue: setlist.language })}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {!setlist.fete && <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs">
                  {t("categories." + setlist.category, { defaultValue: setlist.category })}
                </span>}
                {!setlist.fete && setlist.leader && (
                  <span>{t("setlists.detail.leaderLabel")} <span className="text-foreground">{setlist.leader}</span></span>
                )}
              </div>
              {/* Droits et « Présentation ↗ » sur une rangée (dimanche-16). */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {droitsDeModifier}
                <PresentationLink
                  setlistId={id}
                  url={setlist.presentationUrl}
                  edition={editionLien}
                  onEdition={setEditionLien}
                  onSaved={(presentationUrl) => setSetlist({ ...setlist, presentationUrl })}
                  className=""
                />
              </div>
              {setlist.notes && (
                <p className="mt-3 max-w-[680px] whitespace-pre-line text-sm text-muted-foreground italic">{setlist.notes}</p>
              )}
            </div>

            {/* Bascule « Liste | Partitions » (setlist G, Q11) : sous l'en-tête, elle colle
                sous la barre et s'escamote avec elle. Pleine largeur sur téléphone. Elle s'escamote par
                son `top` collant et non par un transform, qui la faisait remonter sur l'en-tête avant
                qu'elle ne colle ; 3.5rem = sa hauteur (py-2 + p-0.5 + h-9). */}
            {setlist.items.length > 0 && (
              <BasculeVues
                refBascule={basculeRef}
                scrollVisible={scrollVisible}
                toolbarH={toolbarH}
                view={view}
                versListe={versListe}
                versPartitions={versPartitions}
              />
            )}

            {/* Contenu selon la vue */}
            {setlist.items.length === 0 ? (
              <p className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                {t("setlists.detail.emptyItems")}
              </p>
            ) : (
              <div ref={vueRef} data-vue={view}>
                {view === "liste" ? (
                  <ListView items={setlist.items} songsMap={songsMap} jianpuPref={jianpuPref} current={current} onOpen={versPartitions} />
                ) : (
                  partitions
                )}
              </div>
            )}
            {passageFete && <CartesFete passage={passageFete} />}
          </div>
        </>
      )}

      {/* Idées d'harmonie du chant (lot 9) */}
      {ideesTarget !== null && (
        <IdeesDuChant
          ideesTarget={ideesTarget}
          ideesChant={ideesChant}
          items={setlist.items}
          contents={contents}
          songsMap={songsMap}
          editMine={editMine}
          canEdit={canEdit}
          instrument={instrumentHarmonie}
          jianpuManifest={jianpuManifest}
          jianpuPref={jianpuPref}
          withMine={withMine}
          sourceForItem={sourceForItem}
          applyNewSource={applyNewSource}
          flashFeedback={flashFeedback}
          setIdeesTarget={setIdeesTarget}
          setIdeesChant={setIdeesChant}
        />
      )}

      {/* Confirmation de suppression */}
      <PdfChoiceSheet
        open={showPdfChoice}
        onClose={() => setShowPdfChoice(false)}
        forSetlist
        onDownload={handleDownload}
        versionChoice={aMaVersion}
        onListe={deuxVolets ? () => handleDownload("liste") : undefined}
      />

      <ConfirmerSuppression
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        fete={!!setlist.fete}
        deleting={deleting}
        onConfirmer={handleDelete}
      />

      {/* Retour visuel du partage (lien copié / setlist privée) */}
      {shareFeedback && (
        <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-[calc(50%+var(--barre-laterale)/2)] -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-foreground text-background text-sm shadow-lg">
          {shareFeedback}
        </div>
      )}

      {/* Sheet d'édition de ligne (mode adaptation) */}
      <EditLineSheet
        target={editTarget}
        saving={savingLine}
        repeatScope={editMine && editTarget?.repeatedSectionId !== undefined ? repeatScope : undefined}
        onRepeatScope={setRepeatScope}
        onClose={() => setEditTarget(null)}
        onSaveLine={handleSaveLine}
        onInsertAfter={handleInsertAfter}
        onDeleteLine={handleDeleteLine}
      />

      {/* Feuille « Sections » de ma version */}
      <MyStructureSheet
        target={structureTarget}
        saving={savingLine}
        onClose={() => setStructureTarget(null)}
        onSave={(structure) =>
          structureTarget && persistMine(setlist.items[structureTarget.itemIndex].songSlug, { structure })
        }
      />

      {/* Confirmation de rétablissement de l'original */}
      <ConfirmerRetablir
        open={confirmRevert !== null}
        onOpenChange={(o) => !o && setConfirmRevert(null)}
        editMine={editMine}
        savingLine={savingLine}
        onConfirmer={() => confirmRevert !== null && handleRevert(confirmRevert)}
      />

      {/* Mode Louange */}
      {chantsManquants && !performanceMode && (
        <BandeauChantsManquants
          nombre={chantsManquants.length}
          deuxVolets={deuxVolets}
          essaiEchoue={essaiEchoue}
          essaiEnCours={essaiEnCours}
          aucunChantCharge={aucunChantCharge}
          refReessayer={boutonReessayerRef}
          onReessayer={reessayerLesChants}
          onContinuer={continuerSansLesChants}
          onFermer={fermerLeBandeauDesChants}
        />
      )}
      {performanceMode && (
        <PerformanceMode
          uid={user?.uid ?? null}
          items={stageItems}
          contents={contents}
          initialShowChords={chordsTouched ? showChords : undefined}
          setlistId={id}
          setlistTitle={setlist.title}
          setlistDate={setlist.date || undefined}
          affichage={layout}
          onAffichageChange={changeLayout}
          jianpuPref={jianpuPref}
          onJianpuPrefChange={changeJianpuPref}
          horsLigne={horsLigne}
          rolePlanning={rolePlanning}
          onClose={() => {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            setPerformanceMode(false);
          }}
        />
      )}
    </div>
  );
}
