"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, Pencil, SlidersHorizontal, PenLine, Play, MoreHorizontal, Download, Copy, FileText, Presentation } from "lucide-react";
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
import { getSetlist, getSetlistOuCopie, lireCopieDuCompte, deleteSetlist, mettreALaCorbeille, duplicateSetlist, updateSetlist, authHeader, getSetlistsFrom } from "@/lib/firebase/setlists";
import type { FSSetlist } from "@/types/setList";
import { RELIRE_PROFIL, useProfile } from "@/lib/firebase/users";
import { ecrireCopie, listerCopies } from "@/lib/setlist/copieHorsLigne";
import { aujourdhuiLocal, clesDesEntrees, setlistsAVenir } from "@/lib/setlist/liste";
import { BACK_OFFICE } from "@/lib/backOffice";
import { datesServies, findMyServices, loadPlanningData, type ServiceEntry } from "@/lib/planning/names";
import { roleDuPlanning, presideLeService } from "@/lib/planning/rolePlanning";
import type { DateServie } from "@/types/planning";
import { canSeeSetlist, canEditSetlist, canExporterPdfSetlist, canDeleteSetlist, canDuplicateSetlist, canSetPresentationLink, estRegieDeLaSetlist, peutExporterFreeShow } from "@/lib/access";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import type { JianpuChords, SetlistItem } from "@/types/setList";
import type { ChordProLine } from "@/types/chordPro";
import { formatDate, formatJourMois, langueCourte } from "@/lib/utils/formatDate";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useSwipeViews } from "@/hooks/useSwipeViews";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import { useContenusChants } from "./_hooks/useContenusChants";
import { usePreferencesAffichage } from "./_hooks/usePreferencesAffichage";
import { useEntreeLouange } from "./_hooks/useEntreeLouange";
import { ListView } from "./_components/ListView";
import { PartitionsView } from "./_components/PartitionView";
import { compter } from "@/lib/usage";
import { RailSommaire } from "./_components/Sommaire";
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
  withMyJianpuItem,
  withMineStructureItem,
  type SongVersionView,
} from "@/lib/setlist/versionChoice";
import { useMesPartitions } from "@/lib/partition/useMesPartitions";
import { lire, resoudreConflit, type Lecture } from "@/lib/partition/lecture";
import { passerAuCulte, rangDansLaCourante } from "@/lib/partition/fusion";
import type { PartitionDeChant } from "@/lib/firebase/partitions";
import type { ElementTrait } from "@/types/partition";
import { BarreCrayon, type CibleCrayon } from "@/components/partition/BarreCrayon";
import { ChoixDestination, type Destination } from "@/components/partition/ChoixDestination";
import { adresseVue, lireAdresse, poser, surLaSetlist } from "@/lib/setlist/adresseVue";
import { demanderPrecache, urlsAGarder } from "@/lib/setlist/gardeServices";
import { jianpuPngDataUrl, loadJianpuCadrage, loadJianpuChords, loadJianpuManifest, scansAbsentsDuCache, useJianpuManifest } from "@/lib/jianpu/images";
import { sheetEnabled } from "@/lib/jianpu/preference";
import { aDesRetouches } from "@/lib/jianpu/retouches";
import { fetchSongAST, type SongContent} from "@/lib/api/songs";
import { PerformanceMode } from "@/components/performance/PerformanceMode";
import { choixScanDesAjouts, itemsAvecAjouts, positionApres, type AjoutLocal } from "@/lib/performance/ajoutsLocaux";
import { EditLineSheet, type EditLineTarget } from "@/components/setlists/EditLineSheet";
import { PdfChoiceSheet, type PdfVersion } from "@/components/pdf/PdfChoiceSheet";
import { pdfFileName, type PdfStyle } from "@/lib/pdfStylePref";
import { itemAst } from "@/lib/chordpro/itemContent";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { useColonneHarmonie, useGrandEcranHarmonie, useZoneAssezLarge } from "@/hooks/useColonneHarmonie";
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
  mine?: Partial<Pick<PartitionDeChant, "structure" | "sectionOrigins">>;
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
  /** Vue Partitions en volet unique : barre compacte, en-tête replié (docs/spec-exemples-usage.md, T2). */
  const compacte = !deuxVolets && view === "partitions";
  const [enteteOuvert, setEnteteOuvert] = useState(false);
  /** Téléphone, vue Partitions : « Affichage » ouvert depuis le ⋯ (un sous-menu sortirait de l'écran). */
  const [affichageTel, setAffichageTel] = useState(false);
  const plusRef = useRef<HTMLButtonElement>(null);
  const masqueBarre = compacte ? "max-sm:hidden" : "max-[430px]:hidden";
  const masqueMenu = compacte ? "sm:hidden" : "min-[431px]:hidden";
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
  // « Tous les chants » du mode louange : chants ajoutés, locaux, vidés à la fermeture du mode.
  const [ajoutsLocaux, setAjoutsLocaux] = useState<AjoutLocal[]>([]);
  // Ouverture du mode louange sur un chant (`?chant=<n>`, « Mon prochain service »), index 0-based.
  const [chantInitial, setChantInitial] = useState<number | undefined>(undefined);
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
  // Menu Setlist du mode louange, « ‹ Toutes mes setlists » : les setlists à venir que je peux lire ; hors ligne ou lecture
  // en échec, seulement les copies gardées sur l'appareil. Sans compte : pas de ligne (visibilité et copies tiennent au compte).
  const chargerToutesSetlists = useCallback(async () => {
    if (!user) return { miens: [], autres: [], horsLigne: false };
    const cles = clesDesEntrees(servicesDuCompte?.nom === planningName ? servicesDuCompte.services : []);
    const aujourdhui = aujourdhuiLocal();
    if (copieLueLe === null && navigator.onLine) {
      try {
        // Lecture stricte (une réponse en erreur lève) et bornée à 3 s : sinon, les copies gardées.
        const lecture = getSetlistsFrom(aujourdhui, 30, { strict: true });
        const delai = new Promise<never>((_, rejeter) => setTimeout(() => rejeter(new Error("délai")), COPIE_APRES_MS));
        const lues = (await Promise.race([lecture, delai])).filter((s) => canSeeSetlist(user, profile, s, datesDuCompte));
        return { ...setlistsAVenir(lues, cles, aujourdhui, id), horsLigne: false };
      } catch { /* lecture en échec : les copies gardées */ }
    }
    const copies = (await listerCopies(user.uid)).map((c) => c.setlist);
    return { ...setlistsAVenir(copies, cles, aujourdhui, id), horsLigne: true };
  }, [user, profile, planningName, servicesDuCompte, datesDuCompte, copieLueLe, id]);
  // PDF réservé : présider le service donne le droit (Sheet absent ou en panne : services vides, faux).
  const presidence = useMemo(
    () => !!(user && planningName && servicesDuCompte?.nom === planningName && setlist
      && presideLeService(servicesDuCompte.services, { date: setlist.date, category: setlist.category, moment: setlist.moment })),
    [user, planningName, servicesDuCompte, setlist],
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
  // Crayon (docs/spec-ma-partition.md) : un seul mode de retouche, pour moi ou, pour qui règle le culte, pour tout le culte.
  const [crayon, setCrayon] = useState(false);
  const [viseeCrayon, setViseeCrayon] = useState<CibleCrayon>("accord");
  /** « Enregistrer » d'un responsable : la retouche en attente, jusqu'au choix Pour moi / Pour tout le culte. */
  const [aChoisir, setAChoisir] = useState<((d: Destination) => void) | null>(null);
  const [editTarget, setEditTarget] = useState<LineEditState | null>(null);
  const [savingLine, setSavingLine] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState<{ itemIndex: number; destination: Destination } | null>(null);
  // Versions perso des chants (docs/spec-version-perso.md) : un document par
  // personne, chargé avec la setlist. La mienne remplace les accords et
  // paroles de la présidence dans la vue partitions, le sommaire et le mode
  // louange — jamais dans la liste ni l'historique ; le PDF la suit si je la
  // choisis dans « Quel PDF ? » (Timothée, 29/10/2026).
  const [versions, setVersions] = useState<Record<string, SetlistVersions>>({});
  // Vrai quand `versions` vient d'être lu en ligne (faux : lecture échouée, ou versions de la copie hors ligne).
  const [versionsLues, setVersionsLues] = useState(false);
  // La phrase des droits est repliée derrière un « i » (G15, audit 24/10/2026 ; toutes tailles depuis dimanche-16).
  const [droitsDeplies, setDroitsDeplies] = useState(false);
  // Formulaire du lien de la présentation, ouvert par l'entrée du menu ⋯ (dimanche-16).
  const [editionLien, setEditionLien] = useState(false);
  // Retouche d'une section répétée pour moi : toutes les répétitions
  // (défaut, comme avant le lot 9) ou ce seul passage (docs/spec-harmonie.md).
  const [repeatScope, setRepeatScope] = useState<"all" | "one">("all");
  // Ma partition (docs/spec-ma-partition.md) : mes partitions, celles qu'on m'a partagées, mon choix « Je lis ».
  const slugsPartitions = useMemo(
    () => (setlist?.items ?? []).filter((i) => i.songSlug && i.type !== "fusion").map((i) => i.songSlug),
    [setlist],
  );
  const mesPartitions = useMesPartitions(user?.uid, slugsPartitions);
  /** Mes retouches de structure et de calque 简谱 : mes partitions d'abord, puis les anciennes « Ma version » (`versions/{uid}`). */
  const myItems = useMemo(() => {
    const anciennes = user ? versions[user.uid]?.items : undefined;
    const neuves = Object.fromEntries(
      Object.values(mesPartitions.mes).map((p) => [p.slug, { content: p.content, structure: p.structure, shared: false, sectionOrigins: p.sectionOrigins, jianpuChords: p.jianpuChords } as VersionItem]),
    );
    return anciennes || Object.keys(neuves).length ? { ...anciennes, ...neuves } : undefined;
  }, [user, versions, mesPartitions.mes]);
  /** Ancienne version perso de la setlist affichée pour un chant (`versions/{uid}`). */
  function ancienneVue(item: SetlistItem): SongVersionView | undefined {
    return user
      ? songVersionView(item.songSlug, user.uid, versions, {
          structure: item.structureOverride,
          sectionIds: contents[item.songSlug]?.ast.sections.map((s) => s.id),
        })
      : undefined;
  }
  /** Quelle partition se lit, par chant : la mienne, celle du culte, une partagée, l'origine, ou une ancienne version. */
  const lectures = useMemo(() => {
    const out: Record<string, Lecture> = {};
    if (!user) return out;
    for (const item of setlist?.items ?? []) {
      const origine = contents[item.songSlug]?.source;
      if (!item.songSlug || item.type === "fusion" || origine === undefined || out[item.songSlug]) continue;
      const v = ancienneVue(item)!;
      out[item.songSlug] = lire({
        origine,
        culte: item.contentOverride ?? null,
        mienne: mesPartitions.mes[item.songSlug] ?? null,
        partagees: mesPartitions.partagees.filter((p) => p.slug === item.songSlug),
        choix: mesPartitions.choix[item.songSlug],
        anciennes: v.options
          .filter((o) => o.kind !== "presidence")
          .map((o) => ({ valeur: o.value, nom: o.kind === "mine" ? undefined : o.name || t("maPartition.quelquUn") })),
        ancienneValeur: v.value,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, setlist, contents, versions, mesPartitions.mes, mesPartitions.partagees, mesPartitions.choix, t]);
  /** Traits du Crayon par chant (MP-5) : les miens, toujours ; ceux de la partition partagée que je lis, si son auteur les partage. */
  const traitsParChant = useMemo(() => {
    const out: Record<string, { miens: ElementTrait[]; autres: ElementTrait[] }> = {};
    for (const slug of slugsPartitions) {
      const partagee = mesPartitions.partagees.find((p) => p.slug === slug && p.ownerUid === lectures[slug]?.valeur);
      out[slug] = { miens: mesPartitions.mes[slug]?.traits ?? [], autres: partagee?.sharedTraits ? partagee.traits : [] };
    }
    return out;
  }, [slugsPartitions, lectures, mesPartitions.mes, mesPartitions.partagees]);
  // Écritures des traits regroupées (≈ 800 ms) : un trait par tracé ferait une écriture par tracé.
  const traitsEnAttente = useRef<Record<string, { traits: ElementTrait[]; minuterie: ReturnType<typeof setTimeout> }>>({});
  const enregistrerTraitsRef = useRef<(slug: string, traits: ElementTrait[]) => Promise<void>>(async () => {});
  // Un échec d'écriture des traits : le mode louange revient à l'état enregistré.
  const [echecTraits, setEchecTraits] = useState(0);
  const envoyerTraitsRef = useRef<() => void>(() => {});
  useEffect(() => {
    // Sortie de la page ou de l'onglet : pas d'attente des 800 ms.
    const envoyer = () => envoyerTraitsRef.current();
    const cache = () => { if (document.visibilityState === "hidden") envoyer(); };
    window.addEventListener("pagehide", envoyer);
    document.addEventListener("visibilitychange", cache);
    // Démontage (« ‹ Toutes mes setlists » ouvre une autre setlist sans passer par la sortie du mode) : écrire aussi.
    return () => { window.removeEventListener("pagehide", envoyer); document.removeEventListener("visibilitychange", cache); envoyer(); };
  }, []);
  /** Ma partition lue à la place de la présidence (sinon : les anciennes versions décident). */
  const lectureNeuve = (item: SetlistItem) => {
    const l = lectures[item.songSlug];
    return l && l.source !== undefined ? l : undefined;
  };
  /** Version d'un chant pour moi : la présidence, la mienne, ou celle d'un
   *  autre partagée et choisie. */
  function viewOf(item: SetlistItem): SongVersionView | undefined {
    const v = ancienneVue(item);
    const l = lectureNeuve(item);
    // Ma partition lue : sa structure est celle du corps du chant.
    return v && l ? { ...v, shown: "presidence", content: null, value: "presidence", bodyStructure: l.mienne?.structure ?? null } : v;
  }
  /** Item tel qu'affiché : les accords et paroles de la partition lue. */
  function withChosen(item: SetlistItem): SetlistItem {
    const l = lectureNeuve(item);
    if (!l) return withChosenItem(item, viewOf(item), myItems);
    const source = l.source ?? undefined;
    return withMyJianpuItem((item.contentOverride ?? undefined) === source ? item : { ...item, contentOverride: source }, myItems);
  }
  async function choisirLecture(itemIndex: number, valeur: string) {
    const slug = setlist!.items[itemIndex].songSlug;
    mesPartitions.choisir(slug, valeur);
    // Les anciennes versions de la setlist restent à jour : « v:… » les choisit, « culte » et « origine » reviennent à la présidence.
    if (valeur.startsWith("v:")) await persistChoice(slug, valeur.slice(2));
    else if ((valeur === "culte" || valeur === "origine") && lectures[slug]?.options.some((o) => o.type === "ancienne")) await persistChoice(slug, "presidence");
  }
  /** « Garder une copie » : la partition partagée que je lis devient la mienne. */
  function garderCopie(itemIndex: number) {
    const slug = setlist!.items[itemIndex].songSlug;
    const p = mesPartitions.partagees.find((x) => x.slug === slug && x.ownerUid === lectures[slug]?.valeur);
    if (p) mesPartitions.garderUneCopie(p, historyAuthor(profile)?.name ?? "").catch(() => flashFeedback(t("maPartition.erreurEnregistrement")));
  }
  /** « Garder la mienne » / « Prendre celle du chant » : ma partition réécrite, base = la couche du dessous. */
  async function reglerConflit(itemIndex: number, index: number, choix: "mienne" | "chant") {
    const l = lectures[setlist!.items[itemIndex].songSlug];
    if (!l?.modifiable) return;
    try {
      await mesPartitions.enregistrer(resoudreConflit(l, index, choix));
    } catch {
      flashFeedback(t("maPartition.erreurEnregistrement"));
    }
  }
  /** Pour le sommaire et le mode louange : ma structure remplace aussi celle
   *  de la présidence, sans ses notes, nuances et transitions d'occurrence
   *  (elles restent dans le bandeau de la vue partitions). */
  function withMineStructure(item: SetlistItem): SetlistItem {
    return withMineStructureItem(item, viewOf(item), myItems);
  }
  // Feuille « Ordre » du Crayon : chant en cours de réglage.
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
  // Crayon : le bouton de la barre d'outils et, sur téléphone étroit, l'entrée du menu « ⋯ ».
  // Depuis la Liste, il ouvre les partitions au chant lu (Q11) ; en deux volets, elles sont déjà là.
  const toggleCrayon = () => {
    setCrayon(!crayon);
    setEditTarget(null);
    setAChoisir(null);
    if (!crayon && !affichePartitions) versPartitions(current ?? undefined);
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
    const urls = urlsAGarder(setlist, jianpuManifest);
    const envoyer = () => demanderPrecache(urls);
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

  useEntreeLouange({ setlist, loadContents, entrerEnLouange, ouvrirSurChant: setChantInitial });

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

  // Bascule au clavier : la vue change et l'autre bascule remplace celle qui avait le focus ; on le rend au bouton pressé.
  const focusBascule = useRef(false);
  const marquerBascule = (cible: "liste" | "partitions") => {
    if (cible !== view && document.activeElement?.closest("[data-testid=bascule-vues]")) focusBascule.current = true;
  };
  useEffect(() => {
    if (!focusBascule.current) return;
    focusBascule.current = false;
    document.querySelector<HTMLElement>("[data-testid=bascule-vues] [aria-pressed=true]")?.focus();
  }, [view]);

  // Glissement entre les deux vues (Q13) : la Liste à gauche, les Partitions à
  // droite ; même chemin que la bascule (historique, chant lu, retour à la ligne).
  const { glisser } = useSwipeViews({
    zone: zoneRef,
    vue: vueRef,
    cle: view,
    versGauche: view === "liste" ? () => versPartitions() : undefined,
    versDroite: view === "partitions" ? versListe : undefined,
    actif: !!setlist && setlist.items.length > 0 && !performanceMode && !deuxVolets,
  });

  // Toucher sur Liste | Partitions : le même glissement que le geste (si la vue est déjà la bonne, comportement d'avant).
  const basculerListe = () => { marquerBascule("liste"); if (view === "partitions") glisser(1); else versListe(); };
  const basculerPartitions = () => { marquerBascule("partitions"); if (view === "liste") glisser(-1); else versPartitions(); };

  // En-tête déplié : il défile avec la page ; une fois sorti par le haut il se replie, défilement compensé (rien ne bouge).
  const repli = useRef<{ suivant: Element; avant: number } | null>(null);
  useEffect(() => {
    if (!enteteOuvert || !(compacte || deuxVolets)) return;
    let image = 0;
    const onScroll = () => {
      if (image) return;
      image = requestAnimationFrame(() => {
        image = 0;
        const el = document.getElementById(deuxVolets ? "entete-setlist-dv" : "entete-setlist");
        const suivant = el?.nextElementSibling;
        if (!el || !suivant || el.getBoundingClientRect().bottom > 0) return;
        repli.current = { suivant, avant: suivant.getBoundingClientRect().top };
        setEnteteOuvert(false);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(image);
      repli.current = null;
    };
  }, [enteteOuvert, compacte, deuxVolets]);
  useLayoutEffect(() => {
    const r = repli.current;
    if (enteteOuvert) {
      // Déplié alors que la page est défilée : il serait au-dessus de l'écran (et replié au défilement suivant), on le montre.
      const el = document.getElementById(deuxVolets ? "entete-setlist-dv" : "entete-setlist");
      if ((compacte || deuxVolets) && el && el.getBoundingClientRect().top < 0) window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    if (!r) return;
    repli.current = null;
    const racine = document.documentElement;
    racine.setAttribute("data-defilement-compense", "");
    window.scrollTo({ top: window.scrollY + (r.suivant.getBoundingClientRect().top - r.avant), behavior: "instant" });
    requestAnimationFrame(() => requestAnimationFrame(() => racine.removeAttribute("data-defilement-compense")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seul le dépli ou le repli compte, pas un changement de vue
  }, [enteteOuvert]);

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
    ro.observe(basculeRef.current?.parentElement ?? zoneRef.current ?? el);
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
        // « Ma version » : exactement les items de la vue affichée (stageItems).
        const mesItems = version === "mine" ? setlist.items.map(withChosen).map(withMineStructure) : setlist.items;
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
  // Grand écran : la porte 2 est une colonne à droite des partitions (un second appel du puce la referme).
  // La colonne tient si la zone de lecture (à droite du rail) fait 824 px ; sinon, la feuille.
  const [zoneLecture, zoneAssezLarge] = useZoneAssezLarge();
  const grandEcran = useGrandEcranHarmonie() && zoneAssezLarge;
  const [colonnePref, setColonneHarmonie] = useColonneHarmonie();
  const fermerAccord = useRef<(() => void) | null>(null);
  const [instrumentHarmonie] = useInstrument(accesHarmonie);
  const [ideesTarget, setIdeesTarget] = useState<number | null>(null);
  const colonneOuverte = grandEcran && ideesTarget !== null;
  // Dans une fusion : celui de ses chants dont on lit les idées.
  const [ideesChant, setIdeesChant] = useState<string | null>(null);
  // H5-2 : le passage visé par « Ici » (la clé change à chaque appui, pour redéfiler).
  const [passageIci, setPassageIci] = useState<{ uid: string; cle: number; idee?: string } | undefined>();
  // Préférence « 1 » en grand écran : la colonne s'ouvre sur le chant lu et le suit quand il change.
  const dernierLu = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!setlist) return;
    const lu = current ?? setlist.items.filter(estUnChant).sort((a, b) => a.position - b.position)[0]?.position;
    // Un chant choisi à la puce reste : seul un changement du chant lu déplace la colonne.
    const change = dernierLu.current !== undefined && dernierLu.current !== lu;
    dernierLu.current = lu;
    if (!grandEcran || !colonnePref || !accesHarmonie.peut || !affichePartitions) return;
    if (ideesTarget !== null && !change) return;
    const i = setlist.items.findIndex((it) => !!it.songSlug && it.type !== "fusion" && it.position === lu);
    if (i !== -1) { setIdeesTarget(i); setIdeesChant(null); setPassageIci(undefined); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seul un changement de chant lu ou de préférence rouvre la colonne
  }, [grandEcran, colonnePref, accesHarmonie.peut, affichePartitions, current, setlist?.items.length]);
  // La fenêtre passe sous le seuil colonne ouverte (rotation) : on la ferme, la préférence reste.
  const etaitColonne = useRef(false);
  useEffect(() => {
    if (etaitColonne.current && !grandEcran) { setIdeesTarget(null); setIdeesChant(null); setPassageIci(undefined); }
    etaitColonne.current = grandEcran;
  }, [grandEcran]);
  // La bulle d'un accord de la partition se ferme à l'ouverture de la colonne.
  useEffect(() => {
    if (grandEcran && ideesTarget !== null) fermerAccord.current?.();
  }, [grandEcran, ideesTarget]);

  // ── Crayon : retoucher le chant (accords/paroles) ───────────────────────────

  /** Source ChordPro de ce que je lis : c'est elle que le Crayon retouche (ma partition fusionnée, celle du culte ou l'origine). */
  function sourceForItem(item: SetlistItem): string | null {
    return withChosen(item).contentOverride ?? contents[item.songSlug]?.source ?? null;
  }
  /** La couche du culte : les retouches de la setlist, sinon le .cho. */
  function sourceDuCulte(item: SetlistItem): string | null {
    return item.contentOverride ?? contents[item.songSlug]?.source ?? null;
  }
  /** Structure du corps du chant telle que je la lis (la mienne si je lis ma partition). */
  function structureLue(item: SetlistItem): string[] | null {
    return viewOf(item)?.bodyStructure ?? item.structureOverride ?? null;
  }

  /** « Enregistrer » : un responsable choisit Pour moi / Pour tout le culte ; sans le droit, Pour moi directement.
   *  La feuille de la ligne se ferme avant le choix (décision déléguée, session MP-3, 12/11) : empilées, les deux
   *  feuilles se recouvraient ; la retouche est déjà dans `action`, « Annuler » la laisse de côté. */
  function demanderDestination(action: (d: Destination) => void) {
    if (canEdit) {
      setEditTarget(null);
      setAChoisir(() => action);
    } else action("moi");
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
    const baseAst = itemAst(withChosen(item), contents[item.songSlug]);
    if (!baseAst) return;
    const origKey = baseAst.metadata.key;

    // Section répétée par la structure ? On note l'occurrence tapée : pour le culte, une copie est
    // matérialisée ; pour moi, le choix se propose dans la feuille.
    let repeatedSectionId: string | undefined;
    let structIndex: number | undefined;
    const struct = structureLue(item);
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
      cible: viseeCrayon,
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

  /** Mode louange : mes traits d'un chant ont changé. Réécrit ma partition (créée au besoin, texte et `base` inchangés). */
  function traitsChanges(slug: string, traits: ElementTrait[]) {
    const en = traitsEnAttente.current[slug];
    if (en) clearTimeout(en.minuterie);
    traitsEnAttente.current[slug] = {
      traits,
      minuterie: setTimeout(() => {
        delete traitsEnAttente.current[slug];
        void enregistrerTraitsRef.current(slug, traits);
      }, 800),
    };
  }
  /** Écrit tout de suite les traits en attente (sortie du mode louange, de la page, de l'onglet). */
  function envoyerTraits() {
    for (const [slug, en] of Object.entries(traitsEnAttente.current)) {
      clearTimeout(en.minuterie);
      delete traitsEnAttente.current[slug];
      void enregistrerTraitsRef.current(slug, en.traits);
    }
  }
  envoyerTraitsRef.current = envoyerTraits;
  async function enregistrerTraits(slug: string, traits: ElementTrait[]) {
    const item = setlist?.items.find((i) => i.songSlug === slug);
    if (!user || !item) return;
    // Lecture de ma partition pas aboutie : on ne réécrit rien (le document existant perdrait son texte et son partage).
    if (!mesPartitions.charges[slug]) { flashFeedback(t("maPartition.erreurEnregistrement")); setEchecTraits((n) => n + 1); return; }
    const prev = mesPartitions.lireLocale(slug);
    try {
      await mesPartitions.enregistrer({
        slug,
        ownerUid: user.uid,
        ownerName: prev?.ownerName ?? historyAuthor(profile)?.name ?? "",
        base: prev?.base ?? sourceDuCulte(item),
        content: prev?.content ?? null,
        structure: prev?.structure ?? null,
        sectionOrigins: prev?.sectionOrigins,
        jianpuChords: prev?.jianpuChords,
        key: prev?.key ?? null,
        traits,
        sharedWith: prev?.sharedWith ?? [],
        sharedTraits: prev?.sharedTraits ?? false,
      });
    } catch {
      flashFeedback(t("maPartition.erreurEnregistrement"));
      setEchecTraits((n) => n + 1);
    }
  }
  enregistrerTraitsRef.current = enregistrerTraits;

  /** Réécrit ma partition de ce chant (`partitions/{uid}__{slug}`, créée au besoin) : `base` = la couche du dessous
   *  (celle du culte, sinon le .cho) quand le texte change, sinon celle d'avant — la fusion ne prend pas pour miennes des
   *  lignes que le culte a changées depuis. Je la lis ensuite. */
  async function ecrireMaPartition(
    item: SetlistItem,
    patch: Partial<Pick<PartitionDeChant, "content" | "structure" | "sectionOrigins" | "jianpuChords">>,
    cle: string = "cmd.chant.maVersion",
  ): Promise<boolean> {
    if (!user) return false;
    const slug = item.songSlug;
    const courante = sourceDuCulte(item);
    const prev = mesPartitions.mes[slug];
    const p: PartitionDeChant = {
      slug,
      ownerUid: user.uid,
      ownerName: historyAuthor(profile)?.name ?? "",
      base: "content" in patch ? courante : prev?.base ?? courante,
      content: prev?.content ?? null,
      structure: prev?.structure ?? null,
      sectionOrigins: prev?.sectionOrigins,
      jianpuChords: prev?.jianpuChords,
      key: prev?.key ?? null,
      traits: prev?.traits ?? [],
      sharedWith: prev?.sharedWith ?? [],
      sharedTraits: prev?.sharedTraits ?? false,
      ...patch,
    };
    setSavingLine(true);
    try {
      await mesPartitions.enregistrer(p);
      // Un choix posé sur autre chose que ma partition cacherait ma retouche : je la lis.
      const choisi = mesPartitions.choix[slug];
      if (choisi && choisi !== "mienne") mesPartitions.choisir(slug, "mienne");
      setEditTarget(null);
      setStructureTarget(null);
      compter(cle);
      return true;
    } catch {
      flashFeedback(t("setlists.contentEdit.saveError", { defaultValue: "Échec de l'enregistrement — réessaie." }));
      return false;
    } finally {
      setSavingLine(false);
    }
  }

  /** Retient la version choisie pour un chant (« presidence » ou l'uid de son auteur). */
  async function persistChoice(songSlug: string, value: string) {
    if (!user) return;
    const prev = versions[user.uid];
    await saveMine(prev?.items ?? {}, { ...(prev?.choices ?? {}), [songSlug]: value });
  }

  /** Retouche d'accords sur un scan 简谱 (lot 9, docs/spec-harmonie.md) : dans l'item de la setlist pour tout le culte —
   *  donc dans l'historique, avec la phrase des autres retouches —, dans ma partition pour moi. Le calque publié
   *  (`public/jianpu/chords.json`) n'est jamais écrit. */
  function handleEditJianpu(itemIndex: number, next: JianpuChords) {
    if (!setlist) return;
    const item = setlist.items[itemIndex];
    demanderDestination(async (dest) => {
      if (dest === "moi") {
        await ecrireMaPartition(item, { jianpuChords: next });
        return;
      }
      if (await persistOverride(itemIndex, item.contentOverride ?? undefined, { jianpuChords: next })) compter("cmd.chant.adapter");
    });
  }

  /** Applique un nouveau source complet : no-op si rien n'a changé, retrait automatique de la retouche si elle redevient
   *  identique à la couche du dessous (le culte : le chant original ; moi : la couche du culte). */
  async function applyNewSource(
    itemIndex: number,
    next: string,
    extra?: Partial<SetlistItem>,
    mine?: EditBase["mine"],
    dest: Destination = "moi",
  ) {
    if (!setlist) return;
    const item = setlist.items[itemIndex];
    if (dest === "culte") {
      if (next === sourceDuCulte(item) && !extra) {
        setEditTarget(null);
        return;
      }
      const original = contents[item.songSlug]?.source;
      if (await persistOverride(itemIndex, next === original ? undefined : next, extra)) compter("cmd.chant.adapter");
      return;
    }
    if (next === sourceForItem(item) && !mine) {
      setEditTarget(null);
      return;
    }
    await ecrireMaPartition(item, { content: next === sourceDuCulte(item) ? null : next, ...mine });
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

  /** « Seulement ce passage » (pour moi) : la section répétée est copiée dans ma source et ma structure fait pointer cette
   *  occurrence vers la copie — le mécanisme du culte, écrit dans ma partition. */
  function materializeMine(item: SetlistItem, source: string, t: LineEditState): EditBase | null {
    const struct = structureLue(item);
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
        // partition partagée avec une autre structure.
        sectionOrigins: {
          ...myItems?.[item.songSlug]?.sectionOrigins,
          [mat.newSectionId]: t.repeatedSectionId,
        },
      },
    };
  }

  /** La ligne touchée, vue de la couche du culte : sa source et ses rangs ; `null` si elle n'y a pas d'équivalent. */
  function ligneDuCulte(item: SetlistItem, ligne: LineEditState): LineEditState | null {
    const source = sourceDuCulte(item);
    if (!source) return null;
    if (source === sourceForItem(item)) return ligne;
    const f = lectures[item.songSlug]?.fusion;
    if (!f) return null;
    const rang = (n?: number) => (n === undefined ? undefined : rangDansLaCourante(f, n));
    const [srcLine, pinyinSrcLine, jianpuSrcLine] = [rang(ligne.srcLine), rang(ligne.pinyinSrcLine), rang(ligne.jianpuSrcLine)];
    if (srcLine == null || pinyinSrcLine === null || jianpuSrcLine === null) return null;
    return { ...ligne, srcLine, pinyinSrcLine, jianpuSrcLine };
  }

  /** Base d'une édition de ligne : pour le culte, la couche du culte, qui copie l'occurrence tapée avec « Seulement ce
   *  passage » ; pour moi, ma source, « Seulement ce passage » seulement si la retouche ne vise que lui.
   *  Décision déléguée (session MP-3, 12/11) : le choix affiché vaut quelle que soit la destination. */
  function editBase(item: SetlistItem, ligne: LineEditState, dest: Destination): EditBase | null {
    if (dest === "culte") {
      const l = ligneDuCulte(item, ligne);
      if (!l) {
        flashFeedback(t("maPartition.crayon.pasDansLeCulte"));
        return null;
      }
      // shortcut: avec ma propre structure, l'occurrence tapée n'est pas repérable dans celle du culte (copie sautée), à reprendre si on s'en plaint.
      return materializeIfRepeated(item, sourceDuCulte(item)!, repeatScope === "all" || myItems?.[item.songSlug]?.structure?.length ? { ...l, repeatedSectionId: undefined } : l);
    }
    const source = sourceForItem(item)!;
    const one = repeatScope === "one" ? materializeMine(item, source, ligne) : null;
    return (
      one ?? {
        source,
        srcLine: ligne.srcLine,
        pinyinSrcLine: ligne.pinyinSrcLine,
        jianpuSrcLine: ligne.jianpuSrcLine,
      }
    );
  }

  /** Une retouche de la ligne touchée : `fabriquer` rend le nouveau source depuis la base ; le choix du lieu se fait ici. */
  function retoucherLigne(fabriquer: (m: EditBase) => string) {
    if (!setlist || !editTarget) return;
    const cibleLigne = editTarget;
    const item = setlist.items[cibleLigne.itemIndex];
    demanderDestination(async (dest) => {
      const m = editBase(item, cibleLigne, dest);
      if (!m) return;
      await applyNewSource(cibleLigne.itemIndex, fabriquer(m), m.extra, m.mine, dest);
    });
  }

  function handleSaveLine(newRaw: string) {
    if (!setlist || !editTarget) return;
    const source = sourceForItem(setlist.items[editTarget.itemIndex]);
    if (!source) return;
    // Ligne inchangée (y compris pinyin encore sur sa ligne séparée) → no-op.
    if (newRaw === source.split("\n")[editTarget.srcLine]) {
      setEditTarget(null);
      return;
    }
    retoucherLigne((m) => {
      let next = replaceSourceLine(m.source, m.srcLine, newRaw);
      // Le pinyin est désormais inline dans la ligne → la ligne séparée disparaît.
      if (m.pinyinSrcLine !== undefined) next = deleteSourceLines(next, [m.pinyinSrcLine]);
      return next;
    });
  }

  function handleInsertAfter(newRaw: string) {
    retoucherLigne((m) => insertSourceLineAfter(m.source, Math.max(m.srcLine, m.pinyinSrcLine ?? -1), newRaw));
  }

  function handleDeleteLine() {
    retoucherLigne((m) => {
      const idxs = [m.srcLine];
      if (m.pinyinSrcLine !== undefined) idxs.push(m.pinyinSrcLine);
      if (m.jianpuSrcLine !== undefined) idxs.push(m.jianpuSrcLine);
      return deleteSourceLines(m.source, idxs);
    });
  }

  /** « Ordre » : ma structure (jamais celle du culte, qui se règle dans « Modifier »). */
  async function handleSaveOrdre(structure: string[] | null) {
    if (!setlist || !structureTarget) return;
    const item = setlist.items[structureTarget.itemIndex];
    await ecrireMaPartition(item, { structure });
  }

  async function handleRevert(itemIndex: number, destination: Destination) {
    setConfirmRevert(null);
    if (!setlist) return;
    if (destination === "moi") {
      // Mes passages retouchés seuls disparaissent avec mon contenu.
      await ecrireMaPartition(setlist.items[itemIndex], { content: null, structure: null, sectionOrigins: undefined, jianpuChords: undefined }, "cmd.chant.retablir");
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

  /** « Passer au culte » : ma ligne prend la place de celle du culte (par `persistOverride`, historique compris), puis ma
   *  partition est réécrite sur la nouvelle couche du culte : la ligne n'est plus « moi », mes autres retouches restent. */
  async function handlePasserAuCulte(itemIndex: number, srcLine: number) {
    if (!setlist || !canEdit) return;
    const item = setlist.items[itemIndex];
    const l = lectures[item.songSlug];
    const courante = sourceDuCulte(item);
    const nouvelle = l?.fusion && courante ? passerAuCulte(l.fusion, courante, srcLine) : null;
    if (nouvelle === null || !courante) return;
    const original = contents[item.songSlug]?.source;
    if (!(await persistOverride(itemIndex, nouvelle === original ? undefined : nouvelle))) return;
    compter("cmd.chant.adapter");
    const prev = mesPartitions.mes[item.songSlug];
    if (!user || !prev) return;
    // La fusion rendue (mes lignes et celles du culte), relue contre la nouvelle couche du culte.
    const lue = l.fusion!.source;
    try {
      await mesPartitions.enregistrer({ ...prev, base: nouvelle, content: lue === nouvelle ? null : lue });
    } catch {
      flashFeedback(t("maPartition.erreurEnregistrement"));
    }
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
  const peutPdf = canExporterPdfSetlist(user, profile, setlist, presidence);
  // Suppression : le même droit, sous son nom — la liste (lot 10) s'en sert aussi
  const canDelete = !horsLigne && canDeleteSetlist(user, profile, setlist);
  // Items affichés : la partition lue remplace celle de la présidence — accords et paroles pour la vue partitions (qui
  // applique ma structure au corps seul), ma structure comprise pour le sommaire et le mode louange.
  const displayItems = setlist.items.map(withChosen);
  const stageItems = displayItems.map(withMineStructure);
  // « Quel PDF ? » propose ma version quand elle diffère de la présidence (identité d'objet : les trois transformations rendent l'item lui-même quand rien ne change).
  const aMaVersion = !!user && stageItems.some((it, i) => it !== setlist.items[i]);
  const versionViews = Object.fromEntries(setlist.items.filter((it) => it.songSlug).map((it) => [it.songSlug, viewOf(it)!]));
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
    const l = lectureNeuve(item);
    if (l) return l.suitLaPresidence;
    const v = viewOf(item);
    const shown = v?.shown ?? "presidence";
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
    setChantInitial(undefined); // le bouton ouvre toujours sur le chant 1
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
    setChantInitial(undefined);
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
      // Le champ du lien est dans l'en-tête déplié (T2, T3) : « Ajouter le lien » le déplie.
      onLien={() => { setEditionLien(true); setEnteteOuvert(true); }}
      canExporter={peutExporterFreeShow(user, profile, setlist)}
      exportPret={tousLesChantsCharges}
      onExporter={() => { compter("cmd.setlist.presentation"); exporterFreeShow(setlist, contents); }}
    />
  );
  const supprimer = <MenuSupprimer canDelete={canDelete} onSupprimer={() => setConfirmDelete(true)} />;
  // Les partitions : à droite en deux volets, côté Partitions sur G.
  /** « Ordre » : la structure du chant lu (celui de la page où l'on est, sinon le premier). */
  function ouvrirOrdre() {
    const chant = (it: SetlistItem) => !!it.songSlug && it.type !== "fusion";
    const lu = setlist!.items.findIndex((it) => chant(it) && it.position === current);
    const itemIndex = lu !== -1 ? lu : setlist!.items.findIndex(chant);
    const item = setlist!.items[itemIndex];
    const ast = item && itemAst(withChosen(item), contents[item.songSlug]);
    if (!ast) return;
    setStructureTarget({ itemIndex, ast, structure: myItems?.[item.songSlug]?.structure ?? null, presidency: item.structureOverride });
  }
  const partitions = (
    <>
      {crayon && (
        <p className="mb-4 text-xs text-foreground bg-secondary rounded-lg px-3 py-2 print:hidden">
          {t("maPartition.crayon.aide")}
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
        editMode={crayon}
        versions={versionViews}
        retouches={(itemIndex) => {
          const brut = setlist.items[itemIndex];
          const p = mesPartitions.mes[brut.songSlug];
          return {
            moi: !!p && (p.content !== null || p.structure !== null || aDesRetouches(p.jianpuChords)),
            culte: canEdit && (!!brut.contentOverride || aDesRetouches(brut.jianpuChords)),
          };
        }}
        onSelectLine={handleSelectLine}
        onRevert={(itemIndex, destination) => setConfirmRevert({ itemIndex, destination })}
        onPasserAuCulte={canEdit ? handlePasserAuCulte : undefined}
        lectures={lectures}
        onChoisirLecture={choisirLecture}
        partage={user ? (_i, slug) => ({ slug, uid: user.uid, setlistId: id, mp: mesPartitions }) : undefined}
        onGarderCopie={garderCopie}
        onConflit={reglerConflit}
        enAttente={mesPartitions.enAttente}
        onEditJianpu={handleEditJianpu}
        onRetryChant={rechargerUnChant}
        titres={Object.fromEntries(Object.entries(songsMap).map(([slug, e]) => [slug, e.title]))}
        onFermerAccord={(f) => { fermerAccord.current = f; }}
        onIdees={accesHarmonie.peut ? (itemIndex, slug) => {
          compter("cmd.setlist.idees");
          setPassageIci(undefined);
          const ferme = grandEcran && ideesTarget === itemIndex && ideesChant === (slug ?? null);
          if (grandEcran) setColonneHarmonie(!ferme);
          setIdeesTarget(ferme ? null : itemIndex);
          setIdeesChant(ferme ? null : slug ?? null);
        } : undefined}
        // « Ici » ouvre sans basculer : un second appui ne doit pas refermer la porte 2.
        onIci={accesHarmonie.peut ? (itemIndex, slug, uid, idee) => {
          if (grandEcran) setColonneHarmonie(true);
          setIdeesTarget(itemIndex);
          setIdeesChant(slug ?? null);
          setPassageIci({ uid, cle: Date.now(), idee });
        } : undefined}
      />
      {/* La barre basse du Crayon ne cache pas la fin du dernier chant. */}
      {crayon && <div aria-hidden className="h-16 print:hidden" />}
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
  // Bloc titre de la barre compacte (T2 en volet unique, T3 en deux volets) : un bouton qui déplie l'en-tête complet.
  const titreCompact = (
    <>
      {!enteteOuvert && <h1 className="sr-only">{titreAffiche(setlist, langueCourte(i18n.language))}</h1>}
      <button
        type="button"
        aria-expanded={enteteOuvert}
        aria-controls={deuxVolets ? "entete-setlist-dv" : "entete-setlist"}
        aria-label={`${titreAffiche(setlist, langueCourte(i18n.language))}, ${t("setlists.detail.afficherDetails")}`}
        onClick={() => setEnteteOuvert((o) => !o)}
        className={`${TOUCHER_44} flex min-h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-foreground sm:text-[17px]">{titreAffiche(setlist, langueCourte(i18n.language))}</span>
            {setlist.date && <span className="hidden shrink-0 text-xs text-muted-foreground min-[480px]:inline">{formatJourMois(setlist.date, i18n.language)}</span>}
          </span>
          {setlist.notes && <span className="block truncate text-xs italic leading-tight text-muted-foreground">{setlist.notes}</span>}
        </span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${enteteOuvert ? "rotate-180" : ""}`} />
      </button>
    </>
  );
  // Idées d'harmonie du chant (lot 9) : colonne à droite des partitions en grand écran, feuille sinon.
  const idees = ideesTarget !== null && (
    <IdeesDuChant
      disposition={grandEcran ? "colonne" : "feuille"}
      // Elle colle sous l'en-tête collant, comme le rail du sommaire, et descend jusqu'au bas de la fenêtre.
      styleColonne={{
        top: scrollVisible ? `calc(var(--nav-h) + ${enTeteH}px)` : "var(--nav-h)",
        height: scrollVisible ? `calc(100dvh - var(--nav-h) - ${enTeteH}px)` : "calc(100dvh - var(--nav-h))",
        marginTop: 0,
        // Le bas du parent est coiffé de son padding (pb-16 / pb-8) : sans cette marge négative, en fin de page
        // la colonne remonte de ce padding au lieu d'aller au bas de la fenêtre.
        marginBottom: deuxVolets ? "-4rem" : "-2rem",
        transition: "top 300ms, height 300ms",
      }}
      onFermerColonne={() => {
        setColonneHarmonie(false);
        setPassageIci(undefined);
        const pos = setlist.items[ideesTarget]?.position;
        setTimeout(() => document.querySelector<HTMLElement>(`[data-outline-item="${pos}"] [data-puce-harmonie]`)?.focus({ preventScroll: true }), 50);
      }}
      ideesTarget={ideesTarget}
      ideesChant={ideesChant}
      passage={passageIci}
      items={setlist.items}
      contents={contents}
      songsMap={songsMap}
      editMine={crayon}
      canEdit={canEdit}
      instrument={instrumentHarmonie}
      jianpuManifest={jianpuManifest}
      jianpuPref={jianpuPref}
      withMine={withChosen}
      sourceForItem={crayon ? sourceForItem : sourceDuCulte}
      applyNewSource={(i, next, extra) => applyNewSource(i, next, extra, undefined, crayon ? "moi" : "culte")}
      flashFeedback={flashFeedback}
      setIdeesTarget={(i) => { setIdeesTarget(i); setPassageIci(undefined); }}
      setIdeesChant={setIdeesChant}
    />
  );
  // Colonne fermée : les partitions seules, sans plafond ajouté (T4 les élargit à 1 080 px dès 1 000 px de zone).
  const partitionsEtColonne = colonneOuverte ? (
    <div className="flex items-start gap-6">
      <div className="min-w-0 max-w-[920px] flex-1">{partitions}</div>
      {idees}
    </div>
  ) : partitions;
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
            {/* Une rangée (T3) : le bloc titre déplie `#entete-setlist-dv`, en tête de la colonne de partition ; à droite les outils. */}
            <div className="flex items-center gap-x-4 px-7 py-1.5">
              {titreCompact}
              <div className="flex shrink-0 items-center gap-2">
                {presentationHref && (
                  <a href={presentationHref} target="_blank" rel="noopener noreferrer" className={PILULE}>
                    <Presentation className="h-4 w-4" aria-hidden />
                    {t("setlists.detail.presentation")}
                  </a>
                )}
                {!horsLigne && (
                  <button type="button" aria-pressed={crayon} onClick={toggleCrayon} className={crayon ? PILULE_ACTIVE : PILULE}>
                    <PenLine className="h-4 w-4" aria-hidden />
                    {t("maPartition.crayon.bouton")}
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
                {peutPdf && (
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
                )}
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
                      {/* Choisir une couleur des accords : Radix remet le focus sur le menu parent (FocusScope, après un rendu), ce qui
                          refermait le sous-menu ; un focus parti vers un menu ne le ferme plus, un focus parti ailleurs si. */}
                      <DropdownMenuSubContent collisionPadding={12} onFocusOutside={(e) => { if ((e.target as HTMLElement | null)?.closest?.("[data-radix-menu-content]")) e.preventDefault(); }} className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-[min(374px,calc(100vw-16px))] overflow-y-auto overflow-x-hidden sm:w-[25.5rem]">{reglagesAffichage}</DropdownMenuSubContent>
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

          <div className="grid grid-cols-[57px_minmax(0,1fr)] pl-4">
            {/* Le filet descend jusqu'en bas de la page ; le rail colle sous l'en-tête, son panneau s'ouvre par-dessus la partition. */}
            <div className="border-r border-border print:hidden">
              <RailSommaire
                items={stageItems}
                contents={contents}
                songsMap={songsMap}
                jianpuPref={jianpuPref}
                current={current ?? premierChant()}
                uidsLus={uidsLus}
                onGo={allerA}
                copier={toutSuitLaPresidence ? () => setlistLyricsText(setlist.items, contents) : undefined}
                copierPret={tousLesChantsCharges}
                className="sticky z-[15] transition-[top,height] duration-300"
                style={{
                  top: scrollVisible ? `calc(var(--nav-h) + ${enTeteH}px)` : "var(--nav-h)",
                  height: scrollVisible ? `calc(100dvh - var(--nav-h) - ${enTeteH}px)` : "calc(100dvh - var(--nav-h))",
                }}
              />
            </div>
            <div ref={zoneLecture} className={`min-w-0 pb-16 pl-6 pr-4 pt-5 ${colonneOuverte ? "" : "[container-type:inline-size] [container-name:partition]"}`}>
              {/* T3 : colonne de lecture de 920 px, alignée à gauche contre le rail ; seul ce volet pose la variable.
                  T4 : deux colonnes de sections dès 1 000 px de zone (requête de conteneur `partition`).
                  Colonne Harmonie ouverte (H4-2) : la zone entière, partition à 920 px au plus et en une colonne
                  (pas de conteneur `partition` : la zone mesurée inclurait la colonne Harmonie). */}
              <div className={colonneOuverte ? "w-full [--colonne-partition:920px]" : "w-full max-w-[920px] [--colonne-partition:920px] [@container_partition_(min-width:1000px)]:max-w-[1080px] [@container_partition_(min-width:1000px)]:[--colonne-partition:1080px]"}>
              {/* Ce que garde la question 4, sous le titre : historique, langue, qui peut
                  modifier ; la régie ajoute ou change ici le lien de la présentation. */}
              <div id="entete-setlist-dv" className={`mb-4 ${enteteOuvert ? "" : "hidden print:block"}`}>
              <TitreEnTete setlist={setlist} passage={passageFete} />
              <div className="mt-3 print:hidden">
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
              </div>
              {setlist.items.length === 0 ? (
                <p className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  {t("setlists.detail.emptyItems")}
                </p>
              ) : (
                partitionsEtColonne
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
              <div className={`rangee-outils flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2 ${compacte ? "py-1 flex-nowrap" : "py-[9px] flex-wrap"}`}>

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

                {/* Vue Partitions : le bloc titre, un bouton qui déplie l'en-tête complet (T2). Le <h1> reste
                    pour les lecteurs d'écran : celui de l'en-tête déplié, sinon celui-ci. */}
                {compacte && titreCompact}

                {/* Setlist G (docs/spec-deux-volets.md, Q3 et Q11) : la même barre côté Liste
                    et côté Partitions — Affichage, Adapter, Accords, Ma version ; la bascule
                    « Liste | Partitions » est passée sous l'en-tête. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button aria-label={t("setlists.detail.layout.label")}
                      className={`${TOUCHER_44} ${PILULE_EMPILEE} ${compacte ? "max-sm:hidden" : ""} h-8 px-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] bg-secondary text-muted-foreground hover:text-foreground`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span className="libelle-outil">{t("setlists.detail.layout.label")}</span>
                      <span aria-hidden className={LIBELLE_COURT}>{t("setlists.detail.layout.label")}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" collisionPadding={12} className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-[min(374px,calc(100vw-16px))] overflow-y-auto overflow-x-hidden sm:w-[25.5rem]">
                    {reglagesAffichage}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Crayon : retoucher le chant, pour moi ou pour tout le culte */}
                {!horsLigne && (
                  <button aria-label={t("maPartition.crayon.bouton")}
                    aria-pressed={crayon}
                    onClick={toggleCrayon}
                    className={`${TOUCHER_44} ${PILULE_EMPILEE} ${masqueBarre} h-8 px-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] ${
                      crayon
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    <span className="libelle-outil">{t("maPartition.crayon.bouton")}</span>
                    <span aria-hidden className={LIBELLE_COURT}>{t("maPartition.crayon.bouton")}</span>
                  </button>
                )}

                {/* Accords — le réglage vaut pour les partitions et le mode louange */}
                <button aria-label={t("songs.detail.chords")}
                  aria-pressed={showChords}
                  onClick={() => {
                    setShowChords((s) => !s);
                    setChordsTouched(true);
                  }}
                  className={`${TOUCHER_44} ${PILULE_EMPILEE} ${compacte ? "max-sm:hidden" : ""} h-8 px-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] ${
                    showChords
                      ? "bg-foreground text-background"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>
                  <span className="libelle-outil">{t("songs.detail.chords")}</span>
                  <span aria-hidden className={LIBELLE_COURT}>{t("songs.detail.chords")}</span>
                </button>

                {/* Mode louange et ⋯ — poussés à droite, sur la même ligne */}
                <div className="ml-auto flex items-center gap-1.5">

                  {/* Bascule « Liste | Partitions » dans la barre (vue Partitions, un volet) */}
                  {compacte && setlist.items.length > 0 && (
                    <BasculeVues dansBarre view={view} versListe={basculerListe} versPartitions={basculerPartitions} />
                  )}

                  {/* Mode Louange — action principale en live */}
                  <button
                    onClick={ouvrirModeLouange}
                    aria-label={t("setlists.detail.performanceMode")}
                    // 5C1 : un bouton plein est en encre, sauf sur l'écran d'un culte, où il en prend la couleur.
                    style={{ backgroundColor: serviceButtonFill(categoryColor(setlist.category ?? "")) }}
                    className={`${TOUCHER_44} ${PILULE_EMPILEE} h-8 px-2.5 sm:px-3 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 hover:brightness-95 dark:ring-1 dark:ring-white/15 transition-all duration-150 max-sm:!h-11 max-sm:!min-h-11 max-sm:!w-11 max-sm:!flex-row max-sm:!justify-center max-sm:!rounded-full max-sm:!p-0`}
                  >
                    <Play className="h-3.5 w-3.5 max-sm:h-4 max-sm:w-4" />
                    <span className="libelle-outil">{t("setlists.detail.performanceMode")}</span>
                    <span aria-hidden className={`${LIBELLE_COURT} max-sm:!hidden`}>{t("setlists.detail.performanceModeCourt")}</span>
                  </button>

                  {/* Téléphone, vue Partitions : « Affichage » choisi dans le ⋯ s'ouvre ici, sous la barre, à droite. */}
                  {compacte && (
                    <DropdownMenu open={affichageTel} onOpenChange={setAffichageTel}>
                      <DropdownMenuTrigger asChild>
                        <span aria-hidden tabIndex={-1} className="pointer-events-none absolute bottom-0 right-[var(--marge-page)] h-0 w-0 sm:hidden" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" collisionPadding={8} onCloseAutoFocus={(e) => { e.preventDefault(); plusRef.current?.focus(); }} className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-[min(374px,calc(100vw-16px))] overflow-y-auto overflow-x-hidden">
                        {reglagesAffichage}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Menu ⋯ : Modifier / Prévenir l'équipe / Dupliquer / Partager / PDF / Supprimer */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        ref={plusRef}
                        variant="outline"
                        size="icon-lg"
                        className={`${TOUCHER_44} h-8 w-8 rounded-md text-muted-foreground`}
                        aria-label={t("common.moreActions")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Vue Partitions au téléphone : « Accords » et « Affichage », sortis de la barre. */}
                      {compacte && (
                        <>
                          <DropdownMenuCheckboxItem
                            className="sm:hidden"
                            checked={showChords}
                            onCheckedChange={(v) => {
                              setShowChords(v);
                              setChordsTouched(true);
                            }}
                          >
                            {t("songs.detail.chords")}
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuItem className="sm:hidden" onSelect={() => setTimeout(() => setAffichageTel(true), 0)}>
                            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                            {t("setlists.detail.layout.label")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="sm:hidden" />
                        </>
                      )}
                      {/* Téléphone étroit : le Crayon, sorti de la barre. */}
                      {!horsLigne && (
                        <DropdownMenuCheckboxItem className={masqueMenu} checked={crayon} onCheckedChange={toggleCrayon}>
                          {t("maPartition.crayon.bouton")}
                        </DropdownMenuCheckboxItem>
                      )}
                      {!horsLigne && <DropdownMenuSeparator className={masqueMenu} />}
                      {canEdit && (
                        <DropdownMenuItem asChild>
                          <Link href={`/setlists/${id}/edit`}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            {t("setlists.detail.editButton")}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {actionsPartagees}
                      {peutPdf && (
                        <DropdownMenuItem
                          disabled={downloading}
                          // Vue liste : le PDF liste, sans choix ; vue partitions : « Quel PDF ? ».
                          onClick={() => (view === "liste" ? handleDownload("liste") : setShowPdfChoice(true))}
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                          {downloading ? "…" : t("songs.detail.downloadPdf")}
                        </DropdownMenuItem>
                      )}
                      {supprimer}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <div ref={zoneRef} className={`relative pb-8 ${compacte ? "pt-2" : "pt-6"} print:px-0 print:py-4 px-[var(--marge-page)] [--marge-bande:var(--marge-page)] [--colonne-partition:none] print:max-w-2xl print:mx-auto print:[--marge-bande:0px]`} style={{ marginTop: toolbarH }}>
            {copieLueLe !== null && (
              <div role="status" data-copie-hors-ligne className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-muted py-1 pl-3 pr-1 text-xs text-muted-foreground print:hidden">
                <span>{texteCopie}</span>
                {reessayerCopie}
              </div>
            )}
            {/* Header setlist : en vue Partitions (un volet), replié derrière le bloc titre de la barre ; il s'imprime quand même. */}
            <div id="entete-setlist" className={`pb-2 print:mb-4 ${compacte && !enteteOuvert ? "hidden print:block" : ""}`}>
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
            {setlist.items.length > 0 && !compacte && (
              <BasculeVues
                refBascule={basculeRef}
                scrollVisible={scrollVisible}
                toolbarH={toolbarH}
                view={view}
                versListe={basculerListe}
                versPartitions={basculerPartitions}
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
                  partitionsEtColonne
                )}
              </div>
            )}
            {passageFete && <CartesFete passage={passageFete} />}
          </div>
        </>
      )}

      {/* Idées d'harmonie du chant (lot 9) : la feuille ; en grand écran, la colonne est à côté des partitions. */}
      {!grandEcran && idees}

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

      {/* Sheet d'édition de ligne (Crayon) */}
      <EditLineSheet
        target={editTarget}
        saving={savingLine}
        repeatScope={editTarget?.repeatedSectionId !== undefined ? repeatScope : undefined}
        onRepeatScope={setRepeatScope}
        onClose={() => setEditTarget(null)}
        onSaveLine={handleSaveLine}
        onInsertAfter={handleInsertAfter}
        onDeleteLine={handleDeleteLine}
      />

      {/* Feuille « Ordre » du Crayon : ma structure */}
      <MyStructureSheet
        target={structureTarget}
        saving={savingLine}
        onClose={() => setStructureTarget(null)}
        onSave={handleSaveOrdre}
      />

      {/* « Enregistrer » d'un responsable : Pour moi / Pour tout le culte */}
      {aChoisir && (
        <ChoixDestination
          open
          dateCourte={setlist.date ? new Intl.DateTimeFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { day: "numeric", month: "short" }).format(new Date(`${setlist.date}T12:00:00`)) : ""}
          onChoisir={(d) => { const action = aChoisir; setAChoisir(null); action(d); }}
          onClose={() => setAChoisir(null)}
        />
      )}

      {/* Barre basse du Crayon */}
      {crayon && (
        <BarreCrayon
          cible={viseeCrayon}
          onCible={setViseeCrayon}
          onOrdre={ouvrirOrdre}
          onTermine={toggleCrayon}
          deuxVolets={deuxVolets}
        />
      )}

      {/* Confirmation de rétablissement de l'original */}
      <ConfirmerRetablir
        open={confirmRevert !== null}
        onOpenChange={(o) => !o && setConfirmRevert(null)}
        editMine={confirmRevert?.destination === "moi"}
        savingLine={savingLine}
        onConfirmer={() => confirmRevert !== null && handleRevert(confirmRevert.itemIndex, confirmRevert.destination)}
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
          items={itemsAvecAjouts(stageItems, ajoutsLocaux)}
          choixScan={choixScanDesAjouts(ajoutsLocaux)}
          onJouerChant={async (slug, avecJianpu, positionCourante) => {
            if (stageItems.some((it) => it.songSlug === slug)) return true;
            if (!contents[slug]) {
              const res = await fetchSongAST(slug);
              if (!res) return false;
              setContents((prev) => ({ ...prev, [slug]: res }));
            }
            setAjoutsLocaux((prev) => [...prev, { slug, position: positionApres(itemsAvecAjouts(stageItems, prev), positionCourante), jianpu: avecJianpu }]);
            return true;
          }}
          onRetirerChant={(slug) => setAjoutsLocaux((prev) => prev.filter((a) => a.slug !== slug))}
          contents={contents}
          initialShowChords={chordsTouched ? showChords : undefined}
          setlistId={id}
          setlistTitle={setlist.title}
          setlistDate={setlist.date || undefined}
          affichage={layout}
          onAffichageChange={changeLayout}
          jianpuPref={jianpuPref}
          onJianpuPrefChange={(v) => {
            changeJianpuPref(v);
            setAjoutsLocaux((prev) => prev.map((a) => ({ ...a, jianpu: v !== "never" })));
          }}
          horsLigne={horsLigne}
          rolePlanning={rolePlanning}
          chantInitial={chantInitial}
          lectures={lectures}
          onChoisirLecture={(slug, valeur) => {
            const i = setlist.items.findIndex((it) => it.songSlug === slug);
            if (i >= 0) void choisirLecture(i, valeur);
          }}
          traits={traitsParChant}
          onTraitsChange={traitsChanges}
          chantsCharges={Object.fromEntries([...slugsPartitions.map((s) => [s, !!mesPartitions.charges[s]]), ...ajoutsLocaux.map((a) => [a.slug, false])])}
          echecTraits={echecTraits}
          traitsEnAttente={mesPartitions.enAttente}
          chargerToutesSetlists={user ? chargerToutesSetlists : undefined}
          onOuvrirSetlist={(autre) => router.push(`/setlists/${autre}?louange=1`)}
          onClose={() => {
            envoyerTraits();
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            setPerformanceMode(false);
            setAjoutsLocaux([]);
            setChantInitial(undefined);
          }}
        />
      )}
    </div>
  );
}
