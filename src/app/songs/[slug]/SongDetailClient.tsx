"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TOUCHER_44, TOUCHER_RANGEE } from "@/lib/toucher44";
import { ActionsChant } from "./_components/ActionsChant";
import { MenuChant } from "./_components/MenuChant";
import { useRecents } from "./_hooks/useRecents";
import { useBarreRappelee } from "./_hooks/useBarreRappelee";
import { getPersonalKeys, setPersonalKey } from "@/lib/setlist/personalKeys";
import { Music, SlidersHorizontal } from "lucide-react";
import { MargeAffichage } from "@/components/song/MargeAffichage";
import { useReglagesAffichage } from "@/hooks/useReglagesAffichage";
import { SongView } from "@/components/song/SongView";
import { Armure } from "@/components/song/Armure";
import { StatistiquesDuChant } from "@/components/songs/StatistiquesDuChant";
import { JianpuSheet } from "@/components/jianpu/JianpuSheet";
import { useJianpuScore } from "@/lib/jianpu/images";
import { CustomizePanel, type CustomizeState } from "@/components/customPanel/CustomizePanel";
import type { Song } from "@/types/song";
import { useTranslation } from "react-i18next";
import { extractYouTubeId } from "@/lib/youtube/youtube";
import { buildDefaultStructure } from "@/lib/chordpro/structure";
import { parseChordPro } from "@/lib/chordpro/parser";
import { transposeAST } from "@/lib/transposeAST";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { FondDeBarre } from "@/components/layout/FondDeBarre";
import { keyLike, semitonesTo } from "@/lib/transpose";
import { idDeSection } from "@/lib/setlist/sectionOrigins";
import { useSearchParams } from "next/navigation";
import type { SectionItem } from "@/types/song";
import type { SectionNuance } from "@/types/setList";
import { ReportDialog } from "@/components/report/ReportDialog";
import { PdfChoiceSheet } from "@/components/pdf/PdfChoiceSheet";
import { HarmonieDuChant, defilerSousLaBarre } from "@/components/harmonie/HarmonieDuChant";
import { useColonneHarmonie, useGrandEcranHarmonie, useZoneAssezLarge } from "@/hooks/useColonneHarmonie";
import { AccordsProvider, type IciDuChant } from "@/components/accords/AccordsProvider";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { useAllerAuPassage } from "@/lib/harmonie/useAllerAuPassage";
import { pdfFileName, type PdfStyle } from "@/lib/pdfStylePref";
import { getSetlist, getSetlistsPartagees, getMySetlists } from "@/lib/firebase/setlists";
import { prochainesLues } from "../ChoisisUnChant";
import { canExporterPdfChant, isAdminUser } from "@/lib/access";
import { todayIso } from "@/lib/scene/dimanches";
import type { FSSetlist } from "@/types/setList";
import { useAuth } from "@/lib/firebase/auth";
import { useProfile } from "@/lib/firebase/users";
import { compter } from "@/lib/usage";
import { telechargerBlob } from "@/lib/telecharger";
import { useMesPartitions } from "@/lib/partition/useMesPartitions";
import { lire, resoudreConflit } from "@/lib/partition/lecture";
import { MenuJeLis, LigneMaPartition, LignePartagee } from "@/components/partition/MenuJeLis";
import { BarreCrayon, type CibleCrayon } from "@/components/partition/BarreCrayon";
import { EditLineSheet, type EditLineTarget } from "@/components/setlists/EditLineSheet";
import { replaceSourceLine, insertSourceLineAfter, deleteSourceLines } from "@/lib/chordpro/editSource";
import { historyAuthor } from "@/lib/firebase/setlistHistory";
import type { ChordProLine } from "@/types/chordPro";
import type { JianpuChords } from "@/types/setList";

interface SongDetailClientProps {
  song: Song;
}

/** Parse un paramètre d'URL JSON sans jamais lever : les liens partagés
 *  peuvent arriver tronqués (WhatsApp/WeChat) — on retombe sur le défaut. */
function safeParseParam<T>(raw: string | null, fallback: T, valide: (v: unknown) => boolean): T {
  if (!raw) return fallback;
  try {
    const v: unknown = JSON.parse(raw);
    return valide(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

// Gardes de type des paramètres : un JSON valide mais du mauvais type
// (`?structure=null`, `?key=5`) retombe sur le défaut.
const estTexte = (v: unknown) => typeof v === "string";
const estTexteOuNul = (v: unknown) => v === null || typeof v === "string";
const estNombreOuNul = (v: unknown) => v === null || typeof v === "number";
const estListeDeTextes = (v: unknown) => Array.isArray(v) && v.every(estTexte);
const estObjet = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);



/** Version adaptée du chant pour un élément de setlist (Dernière phrase, mode
 *  Adapter, accords retouchés sur le scan) : la page, ouverte depuis la liste,
 *  la relit dans la setlist. Sans session ou si la lecture échoue : rien, le
 *  chant d'origine. */
function useVersionDeLaSetlist(slug: string, setlistId: string | null, position: number | null) {
  const { user } = useAuth();
  const [version, setVersion] = useState<{ source: string | null; retouches?: JianpuChords } | null>(null);
  useEffect(() => {
    if (!setlistId || position === null || !user) return;
    let vivant = true;
    getSetlist(setlistId)
      .then((setlist) => {
        const item = setlist?.items.find((i) => i.position === position);
        if (!vivant || !item) return;
        if (item.type === "fusion") {
          const fs = item.fusionSongs?.find((f) => f.songSlug === slug);
          if (fs?.contentOverride) setVersion({ source: fs.contentOverride });
        } else if (item.songSlug === slug && (item.contentOverride || item.jianpuChords)) {
          setVersion({ source: item.contentOverride ?? null, retouches: item.jianpuChords });
        }
      })
      .catch(() => { /* le chant d'origine */ });
    return () => { vivant = false; };
  }, [slug, setlistId, position, user]);
  return version;
}

/** Le compte est-il de l'équipe (créateur ou `editeurs`) d'une setlist à venir ? Gardé en mémoire de module par uid et
 *  jour (comme `prochainesLues`) quand c'est oui ; un non (ou une lecture en échec, que les lectures rendent vide) se
 *  relit à la visite suivante.
 *  shortcut: le créateur d'une setlist non privée n'est trouvé que parmi les 30 prochaines (`getSetlistsFrom`),
 *  `getMySetlists` ne rendant que les privées. Les 30 prochaines : la lecture gardée de « Choisis un chant ». */
const equipeLue = new Map<string, Promise<boolean>>();
function equipeAVenirLue(uid: string): Promise<boolean> {
  const today = todayIso();
  const cle = `${uid}|${today}`;
  let p = equipeLue.get(cle);
  if (!p) {
    p = Promise.all([getSetlistsPartagees(uid), getMySetlists(uid), prochainesLues(uid, today)]).then((l) =>
      l.flat().some((s: FSSetlist) => !!s.date && s.date >= today && (s.ownerId === uid || !!s.editeurs?.includes(uid))));
    equipeLue.set(cle, p);
    const lue = p;
    lue.then((oui) => { if (!oui && equipeLue.get(cle) === lue) equipeLue.delete(cle); },
      () => { if (equipeLue.get(cle) === lue) equipeLue.delete(cle); });
  }
  return p.catch(() => false);
}

  export function SongDetailClient({ song }: SongDetailClientProps) {
    const { t, i18n } = useTranslation();
    const searchParams = useSearchParams();
    useAllerAuPassage();
    // Ouvert depuis une setlist (`?setlist=`) : sa version, et le Retour y ramène.
    const setlistDOrigine = safeParseParam<string | null>(searchParams.get("setlist"), null, estTexteOuNul);
    const versionSetlist = useVersionDeLaSetlist(
      song.slug,
      setlistDOrigine,
      safeParseParam<number | null>(searchParams.get("item"), null, estNombreOuNul),
    );
    const sourceAdaptee = versionSetlist?.source;
    // Ma partition (docs/spec-ma-partition.md) : « Je lis » = la mienne, une partagée, l'origine — et celle du culte
    // quand la page s'ouvre depuis une setlist qui a adapté ce chant. Pas de compte : le chant d'origine, sans menu.
    const { user: compte, loading: authEnCours } = useAuth();
    const { profile } = useProfile();
    // PDF réservé : sans compte, visible ; connecté non admin, seulement pour l'équipe d'une setlist à venir (lue ici).
    const [equipeAVenir, setEquipeAVenir] = useState<{ uid: string; oui: boolean } | null>(null);
    const uidCompte = compte?.uid;
    const admin = isAdminUser(compte ?? null);
    useEffect(() => {
      if (!uidCompte || admin) return;
      let vivant = true;
      equipeAVenirLue(uidCompte).then((oui) => { if (vivant) setEquipeAVenir({ uid: uidCompte, oui }); });
      return () => { vivant = false; };
    }, [uidCompte, admin]);
    // Auth en cours : pas de bouton (sinon un compte sans droit le verrait passer, `user` valant null au départ).
    const pdf = !authEnCours && canExporterPdfChant(compte ?? null, !!equipeAVenir && equipeAVenir.uid === uidCompte && equipeAVenir.oui);
    const mp = useMesPartitions(compte?.uid, [song.slug]);
    const mienne = mp.mes[song.slug] ?? null;
    const lecture = useMemo(
      () => compte ? lire({
        origine: song.chordProSource,
        culte: sourceAdaptee ?? null,
        mienne,
        partagees: mp.partagees.filter((p) => p.slug === song.slug),
        choix: mp.choix[song.slug],
      }) : null,
      [compte, song.chordProSource, song.slug, sourceAdaptee, mienne, mp.partagees, mp.choix],
    );
    // `source` indéfini : rien de choisi, on garde le comportement d'avant (la version de la setlist, sinon le chant).
    const sourceLue = lecture && lecture.source !== undefined ? lecture.source : sourceAdaptee;
    const ast = useMemo(() => parseChordPro(sourceLue ?? song.chordProSource), [sourceLue, song.chordProSource]);
    const isZh = song.language === "zh";
    // Partition 简谱 en image (scan d'origine) — absente pour la plupart des chants
    const jianpuScore = useJianpuScore(song.slug);
    // Réglages retenus par appareil (marge « Affichage », spec-reglages-unifies.md, RU-3) : 简谱 | Paroles, pinyin, accords,
    // taille, disposition et ordre ; avant la lecture (`pret`), les valeurs par défaut (pas d'écart d'hydratation).
    // Le choix du responsable ne vaut que dans la setlist, même ouverte d'ici (O3).
    const r = useReglagesAffichage(authEnCours ? undefined : compte?.uid ?? null);
    const showScore = r.jianpu;
    const choisirScore = (on: boolean) => {
      r.setJianpu(on);
      if (on) compter("cmd.chant.jianpu");
    };
    const originalKey = ast.metadata.key;
    // Tonalité la plus chantée à GCC : la page y démarre, l'originale reste proposée.
    const recommendedKey = ast.metadata.recommendedKey;
    const defaultKey = recommendedKey ?? originalKey;
    const youtubeId = song.youtubeUrl ? extractYouTubeId(song.youtubeUrl) : null;
    const scrollVisible = useScrollDirection();
    // Deux volets (lot U5, docs/spec-deux-volets.md, Q16) : la barre colle en haut du volet
    // de droite au lieu d'être fixe sur toute la largeur (globals.css, `.chants-volets`).
    // Elle glisse au défilement, donc devient le repère de la copie fixe du halo de son
    // fond : celle-ci se recale de la place de la barre à gauche, `--barre-left`.
    const deuxVolets = useDeuxVolets();
    const barreRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const el = barreRef.current;
      if (!el) return;
      if (!deuxVolets) {
        el.style.removeProperty("--barre-left");
        return;
      }
      const update = () => el.style.setProperty("--barre-left", `${el.getBoundingClientRect().left}px`);
      // Barre collée (le haut du panneau du chant est passé au-dessus d'elle) : `data-collee` lui fait dessiner le haut
      // d'un panneau, aligné sur la carte de la liste, et repeindre au gris la bande au-dessus (globals.css).
      const panneau = el.closest<HTMLElement>(".chants-chant");
      const colle = () => {
        if (!panneau) return;
        const haut = parseFloat(getComputedStyle(el).top) || 0;
        el.toggleAttribute("data-collee", panneau.getBoundingClientRect().top + 16 < haut - 0.5);
      };
      update();
      colle();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      window.addEventListener("resize", update);
      window.addEventListener("scroll", colle, { passive: true });
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", colle);
        el.removeAttribute("data-collee");
      };
    }, [deuxVolets]);
    const { barPinned, setBarPinned } = useBarreRappelee();
    const [showVideo, setShowVideo] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    // Marge « Affichage » : une seule colonne à droite à la fois, avec Harmonie (décision déléguée, session RU-3, 13/11).
    const [showAffichage, setShowAffichage] = useState(false);
    const boutonAffichageRef = useRef<HTMLButtonElement>(null);
    const [downloading, setDownloading] = useState(false);
    const [backPath, setBackPath] = useState("/songs");
    const [showReport, setShowReport] = useState(false);
    const [showPdfChoice, setShowPdfChoice] = useState(false);
    // Idées d'harmonie (lot 9) : pianistes, guitaristes et admins seulement.
    const [showIdees, setShowIdees] = useState(false);
    // H5-2 : le passage visé par « Ici » (la clé change à chaque appui, pour redéfiler).
    const [passageIci, setPassageIci] = useState<{ uid: string; cle: number; idee?: string; miHauteur?: boolean } | undefined>();
    // Grand écran (≥ 1 024 px) : une colonne à droite de la partition, mémorisée par appareil ; sinon la feuille.
    // La colonne tient si la zone de lecture (partition + colonne) fait 824 px ; sinon, la feuille.
    // La marge « Affichage » n'est en colonne que si la musique garde 340 px (RU-3) ; mesurée sur l'enveloppe, qui ne change pas à l'ouverture.
    const [enveloppeMarge, margeEnColonne] = useZoneAssezLarge(320 + 24 + 340);
    const ecranLarge = useGrandEcranHarmonie();
    const margeRetire = showAffichage && ecranLarge && margeEnColonne ? 320 + 24 : 0; // la marge en colonne retire sa place à la zone : sinon « Harmonie » ouvrirait la feuille au lieu de la colonne
    const [zoneLecture, zoneAssezLarge] = useZoneAssezLarge(824 - margeRetire);
    const grandEcran = ecranLarge && zoneAssezLarge;
    const [colonneOuverte, setColonneOuverte] = useColonneHarmonie();
    const boutonHarmonieRef = useRef<HTMLButtonElement>(null);
    const accesHarmonie = useAccesHarmonie();
    const [instrumentHarmonie] = useInstrument(accesHarmonie);
    useEffect(() => {
      const saved = sessionStorage.getItem("lastListPath");
      if (saved) setBackPath(saved);
    }, []);

    // Mémoriser le chant dans les « récemment consultés » (affichés sur /songs)
    useRecents(song.slug);

    const [customize, setCustomize] = useState<CustomizeState>({
      semitones: 0,
      currentKey: originalKey,
      showChords: true, // non lu ici : les accords et le pinyin viennent de la marge (`r`)
      showPinyin: isZh,
      useJianpu: false,
      structure: buildDefaultStructure(ast.sections),
    });
    // AST transposé en mémoire — recalculé uniquement si semitones change


    // Structure override : IDs des sections dans l'ordre choisi
    
    const defaultStructure = useMemo(
      () => customize.structure.map((s) => s.uid),
      [customize.structure]
    );

    const structureOverride = useMemo(
      () => safeParseParam<string[]>(searchParams.get("structure"), defaultStructure, estListeDeTextes),
      [searchParams, defaultStructure]
    );

    const sectionsNote = useMemo(() => {
      const defaultSectionsNote = Object.fromEntries(
        customize.structure.map((s) => [s.uid, s.note]).filter(([, n]) => n)
      );
      return safeParseParam<Record<string, string>>(searchParams.get("sectionNotes"), defaultSectionsNote, estObjet);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, customize.structure]);

    const sectionsNuance = useMemo(
      () => safeParseParam<Record<string, SectionNuance>>(searchParams.get("sectionNuances"), {}, estObjet),
      [searchParams]
    );

    const sectionsKeys = useMemo(
      () => safeParseParam<Record<string, string>>(searchParams.get('sectionKeys'), {}, estObjet),
      [searchParams]
    )
    useEffect(() => {
      const structure: SectionItem[] = structureOverride.map((uid: string, index: number) => {
        const sectionId = idDeSection(uid);
        const cleanUid = uid.match(/-\d+$/) ? uid : `${sectionId}-${index}`;
        return {
          uid: cleanUid,
          sectionId,
          name: ast.sections.find((s) => s.id === sectionId)?.name ?? "",
          note: sectionsNote[cleanUid] ?? sectionsNote[uid] ?? sectionsNote[sectionId] ?? "",
        };
      });
      setCustomize(prev => ({...prev, structure: structure}))
      // Rejoué quand la version adaptée arrive de la setlist : sa Dernière
      // phrase prend alors son nom dans le panneau.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },[ast]);

    // Ouverte depuis une setlist : la tonalité choisie ici est retenue pour ce
    // chant dans cette setlist, sur cet appareil (reprise en mode louange).
    // Depuis une setlist, l'absence de `key` veut dire la tonalité originale.
    const setlistKey = useMemo(
      () => safeParseParam<string>(searchParams.get("key"), setlistDOrigine ? originalKey : defaultKey, estTexte),
      [searchParams, setlistDOrigine, originalKey, defaultKey]
    );

    // Tant que la tonalité de départ n'est pas appliquée, l'état porte encore la
    // tonalité d'origine : l'enregistrer écraserait le choix retenu.
    const [keyReady, setKeyReady] = useState(false);

    useEffect(() => {
      // Un majeur sur un chant mineur se lit comme son relatif mineur (et inversement).
      const songKey = keyLike(originalKey, (setlistDOrigine && getPersonalKeys(setlistDOrigine)[song.slug]) || setlistKey);
      const diff = semitonesTo(originalKey, songKey);
      setCustomize(prev => ({ ...prev, currentKey: songKey, semitones: diff }));
      setKeyReady(true);
    }, []); // une seule fois au montage

    // Ma partition : sa tonalité est celle de départ (avant la recommandée), une fois, sauf `?key=` ou setlist (celle du
    // culte prévaut). Un changement de tonalité ici est enregistré dans ma partition, s'il y en a une (pas de
    // partition créée pour une tonalité seule : c'est le Crayon, MP-3).
    const cleSuivie = useRef<string | null>(null);
    const cleDePartitionPosee = useRef(false);
    const cleDeMaPartition = lecture?.valeur === "mienne" ? mienne?.key ?? null : null;
    useEffect(() => {
      if (!keyReady || !cleDeMaPartition || cleDePartitionPosee.current) return;
      cleDePartitionPosee.current = true;
      if (setlistDOrigine || searchParams.get("key") !== null) return;
      const k = keyLike(originalKey, cleDeMaPartition);
      cleSuivie.current = k;
      setCustomize(prev => ({ ...prev, currentKey: k, semitones: semitonesTo(originalKey, k) }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyReady, cleDeMaPartition]);
    useEffect(() => {
      if (!keyReady) return;
      if (cleSuivie.current === null) { cleSuivie.current = customize.currentKey; return; }
      if (cleSuivie.current === customize.currentKey) return;
      cleSuivie.current = customize.currentKey;
      // Seulement quand je lis ma partition ; regroupé (plusieurs pas de tonalité = une écriture).
      if (!mienne || setlistDOrigine || lecture?.valeur !== "mienne") return;
      const cle = customize.currentKey;
      const minuteur = window.setTimeout(() => {
        mp.enregistrer({ ...mienne, key: cle }).catch(() => { /* la page garde la tonalité */ });
      }, 800);
      return () => window.clearTimeout(minuteur);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyReady, customize.currentKey]);

    useEffect(() => {
      if (!setlistDOrigine || !keyReady) return;
      setPersonalKey(setlistDOrigine, song.slug, customize.currentKey === setlistKey ? null : customize.currentKey);
    }, [setlistDOrigine, keyReady, song.slug, setlistKey, customize.currentKey]);

    const displayedAST = useMemo(
      () => transposeAST(ast, customize.semitones, customize.currentKey),
      [ast, customize.semitones, customize.currentKey]
    );

    // Crayon (docs/spec-ma-partition.md) : retoucher ce que je lis, toujours pour moi (`partitions/{uid}__{slug}`).
    // shortcut: « Pour tout le culte » (page ouverte depuis une setlist, `canEditSetlist`) pas offert ici, le chemin
    // d'écriture de la setlist (`persistOverride`) vit dans SetlistDetailClient ; à extraire avant de l'offrir.
    const [crayon, setCrayon] = useState(false);
    const [viseeCrayon, setViseeCrayon] = useState<CibleCrayon>("accord");
    const [editTarget, setEditTarget] = useState<(EditLineTarget & { srcLine: number; pinyinSrcLine?: number; jianpuSrcLine?: number }) | null>(null);
    const [enregistrement, setEnregistrement] = useState(false);
    const [erreurCrayon, setErreurCrayon] = useState(false);
    const sourceCrayon = sourceLue ?? song.chordProSource;
    function toucherLigne(line: ChordProLine) {
      if (line.srcLine === undefined) return;
      const displayKey = customize.currentKey;
      setEditTarget({
        itemIndex: 0,
        raw: sourceCrayon.split("\n")[line.srcLine] ?? "",
        pinyin: line.pinyin ?? null,
        language: ast.metadata.language === "zh" ? "zh" : "fr",
        semitones: semitonesTo(originalKey, displayKey),
        targetKey: displayKey,
        originalKey,
        srcLine: line.srcLine,
        pinyinSrcLine: line.pinyinSrcLine,
        jianpuSrcLine: line.jianpuSrcLine,
        cible: viseeCrayon,
      });
    }
    /** Ma partition réécrite : `base` = la couche du dessous (celle du culte si la page s'ouvre d'une setlist, sinon le .cho). */
    async function retoucher(fabriquer: (source: string, t: NonNullable<typeof editTarget>) => string) {
      if (!compte || !editTarget) return;
      const prochain = fabriquer(sourceCrayon, editTarget);
      if (prochain === sourceCrayon) {
        setEditTarget(null);
        return;
      }
      const courante = sourceAdaptee ?? song.chordProSource;
      setEnregistrement(true);
      try {
        await mp.enregistrer({
          slug: song.slug,
          ownerUid: compte.uid,
          ownerName: historyAuthor(profile)?.name ?? "",
          base: courante,
          content: prochain === courante ? null : prochain,
          structure: mienne?.structure ?? null,
          sectionOrigins: mienne?.sectionOrigins,
          jianpuChords: mienne?.jianpuChords,
          key: mienne?.key ?? null,
          traits: mienne?.traits ?? [],
          sharedWith: mienne?.sharedWith ?? [],
          sharedTraits: mienne?.sharedTraits ?? false,
        });
        const choisi = mp.choix[song.slug];
        if (choisi && choisi !== "mienne") mp.choisir(song.slug, "mienne");
        compter("cmd.chant.maVersion");
        setEditTarget(null);
      } catch {
        setErreurCrayon(true);
      } finally {
        setEnregistrement(false);
      }
    }

    const fontScale = r.taille;
    const disposition = r.disposition;
    const layout = r.ordre;
    const showPinyin = isZh && r.pinyin;

    async function handleDownload(style: PdfStyle) {
      setDownloading(true);
      try {
        // Chargés à la demande : @react-pdf/renderer est lourd et ne doit pas
        // peser sur le bundle de la fiche chant (cf. SetlistDetailClient).
        const [{ pdf }, { SongPDF }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@/components/pdf/SongPDF"),
        ]);
        const blob = await pdf(
          <SongPDF
            ast={displayedAST}
            showChords={r.accords}
            showPinyin={showPinyin}
            useJianpu={customize.useJianpu}
            structureOverride={structureOverride}
            sectionNotes={sectionsNote}
            sectionNuances={sectionsNuance}
            language={i18n.language}
            sectionStyle={style === "colors" ? "colors" : "classic"}
          />
        ).toBlob();
        telechargerBlob(blob, pdfFileName(`${song.slug}-${customize.currentKey}`, style));
        compter("cmd.chant.pdf");
      } finally {
        setDownloading(false);
      }
    }

  // Libellés par priorité (spec-barre-chant.md, Q4) : tous, puis ceux des actions seuls, puis
  // aucun — le premier niveau qui tient sur la ligne. Mesuré sur la rangée elle-même : ce qu'elle
  // porte varie (Retour, Vidéo, Harmonie, Crayon), un seuil fixe la ferait
  // déborder ou cacherait des libellés qui tiennent (globals.css, `data-libelles`).
  const rangeeRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = rangeeRef.current;
    if (!el) return;
    // Le débordement dans la marge intérieure ne compte pas dans `scrollWidth` : on compare le
    // bord droit du dernier élément à celui du contenu de la rangée.
    const tient = () => {
      const fin = el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight);
      return [...el.children].every((c) => c.getBoundingClientRect().right <= fin + 0.5);
    };
    const signature = () => `${el.clientWidth}:` + [...el.children].map((c) => Math.round(c.getBoundingClientRect().width)).join(",");
    let apres = "";
    const ajuster = () => {
      // La bascule Lettres / Chiffres (H7-1) tient tant que les libellés ne perdent qu'un cran ; ensuite elle passe au menu ⋯.
      for (const niveau of ["3", "2", "1", "0"]) {
        el.dataset.libelles = niveau;
        if (tient()) break;
      }
      apres = signature();
    };
    ajuster();
    // Les enfants aussi (H7-1) : un libellé 中文 ou une police arrivés après la première mesure élargissent la rangée sans
    // changer sa taille, et la barre débordait de la carte à 1 280 px. Leurs tailles après `ajuster` sont gardées : les
    // changements qu'il cause lui-même ne le relancent pas (sinon la bascule clignotait).
    const ro = new ResizeObserver(() => { if (signature() !== apres) ajuster(); });
    ro.observe(el);
    for (const c of el.children) ro.observe(c);
    document.fonts?.ready.then(ajuster);
    return () => ro.disconnect();
  }, [isZh, youtubeId, accesHarmonie.peut, compte, setlistDOrigine, deuxVolets]);

  // Menu ⋯ (spec-reglages-unifies.md, RU-3) : PDF, Personnaliser, Signaler ; Vidéo, Harmonie, Crayon et Affichage sont dans la barre.
  const menuChant = <MenuChant pdf={pdf} downloading={downloading} setShowPdfChoice={setShowPdfChoice} setShowPanel={setShowPanel} setShowReport={setShowReport} />;

  const ici = useMemo<IciDuChant | undefined>(
    () => accesHarmonie.peut ? {
      sections: displayedAST.sections, tonalite: customize.currentKey, tonaliteOrigine: originalKey,
      ouvrir: (uid, idee, options) => {
        if (options?.depuisNom && !grandEcran) defilerSousLaBarre(options.element);
        setPassageIci({ uid, cle: Date.now(), idee, ...(options?.depuisNom ? { miHauteur: true } : null) });
        setShowAffichage(false);
        if (grandEcran) setColonneOuverte(true); else setShowIdees(true);
      },
    } : undefined,
    [accesHarmonie.peut, displayedAST.sections, customize.currentKey, originalKey, grandEcran, setColonneOuverte],
  );

  return (
    <AccordsProvider aide chant={{ slug: song.slug, titre: song.title }} tonalite={customize.currentKey} ici={ici}>
      <div className="relative min-h-screen print:min-h-0 bg-background" style={{ width: `${100 / fontScale}%`, "--zoom-chant": fontScale } as React.CSSProperties}>
        {/* Barre de contrôles */}
        <div ref={barreRef} data-testid="barre-outils" className={`barre-chant print:hidden fixed left-[var(--barre-laterale)] right-0 top-[var(--nav-h)] [--barre-top:var(--nav-h)] [--barre-left:var(--barre-laterale)] z-10 material-chrome transition-transform duration-300 ${ scrollVisible ? "translate-y-0" : barPinned ? "-translate-y-[calc(var(--nav-h)-var(--sat))]" : "-translate-y-[calc(100%+var(--nav-h)+var(--barre-decalage,0px)+var(--barre-ombre,0px))]"}`}>
          <FondDeBarre sousNavbar />
          {/* `rangee-chant` : les libellés suivent la place de la rangée (`data-libelles`, plus haut),
              donc celle du volet en deux volets. */}
          <div ref={rangeeRef} className="rangee-chant max-w-2xl mx-auto w-full flex flex-nowrap gap-1 items-center py-2 px-4">
            <Button
              asChild
              variant="secondary"
              className={`retour-chant ${TOUCHER_44} h-9 lg:h-8 px-2.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground`}
            >
              {/* Deux volets : le Retour n'est montré que vers une setlist (`data-vers-setlist`,
                  globals.css) ; la liste des chants est déjà à gauche. */}
              <Link
                aria-label={t("songs.detail.backToAll")}
                href={setlistDOrigine ? `/setlists/${encodeURIComponent(setlistDOrigine)}` : backPath}
                data-vers-setlist={setlistDOrigine ? "" : undefined}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5m6-7l-7 7 7 7" />
                </svg>
                <span className="libelle-chant">{t("songs.detail.backToAll")}</span>
              </Link>
            </Button>
            {/* Harmonie · Vidéo · Crayon · Affichage · ⋯ : une seule ligne à toutes les tailles (RU-3) ;
                les libellés suivent la place de la rangée (globals.css, `.actions-chant`). */}
            <div className="actions-chant ml-auto shrink-0 items-center gap-1">
              {accesHarmonie.peut && (
                <Button
                  variant="secondary"
                  aria-label={t("harmonie.idees")}
                  title={t("harmonie.idees")}
                  ref={boutonHarmonieRef}
                  aria-expanded={grandEcran ? colonneOuverte : undefined}
                  aria-controls={grandEcran ? "harmonie-colonne" : undefined}
                  onClick={() => {
                    setShowAffichage(false);
                    if (grandEcran) setColonneOuverte(!colonneOuverte); else setShowIdees(true);
                  }}
                  className={`${TOUCHER_44} h-10 lg:h-9 bouton-harmonie shrink-0 rounded-full px-2.5 text-xs font-semibold ${(grandEcran ? colonneOuverte : showIdees) ? "bg-foreground text-background hover:bg-foreground" : "raised bg-card text-foreground hover:bg-card"}`}
                >
                  <span className="libelle-harmonie">{t("harmonie.idees")}</span>
                </Button>
              )}
              <ActionsChant youtubeId={youtubeId} showVideo={showVideo} setShowVideo={setShowVideo} crayon={compte ? crayon : undefined} setCrayon={setCrayon} menuChant={menuChant}>
                {/* Accords et Pinyin à un toucher, synchronisés avec la marge par le crochet (RU-3, retour du 13/11) */}
                <Button
                  variant="secondary"
                  aria-label={t("songs.detail.chords")}
                  title={t("songs.detail.chords")}
                  aria-pressed={r.accords}
                  onClick={() => r.setAccords(!r.accords)}
                  className={`${TOUCHER_44} h-9 lg:h-8 min-w-9 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold ${r.accords ? "!bg-foreground !text-background hover:!bg-foreground/90" : ""}`}
                >
                  <Music className="h-4 w-4" />
                  <span className="libelle-chant">{t("songs.detail.chords")}</span>
                </Button>
                {isZh && (
                  <Button
                    variant="secondary"
                    aria-label={t("songs.detail.pinyin")}
                    title={t("songs.detail.pinyin")}
                    aria-pressed={r.pinyin}
                    onClick={() => r.setPinyin(!r.pinyin)}
                    className={`${TOUCHER_44} h-9 lg:h-8 min-w-9 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold ${r.pinyin ? "!bg-foreground !text-background hover:!bg-foreground/90" : ""}`}
                  >
                    <span className="font-bold">拼</span>
                    <span className="libelle-chant">{t("songs.detail.pinyin")}</span>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  ref={boutonAffichageRef}
                  aria-label={t("margeAffichage.titre")}
                  title={t("margeAffichage.titre")}
                  aria-pressed={showAffichage}
                  aria-expanded={showAffichage}
                  aria-controls="marge-affichage"
                  onClick={() => {
                    if (!showAffichage) { setColonneOuverte(false); setShowIdees(false); }
                    setShowAffichage(!showAffichage);
                  }}
                  className={`${TOUCHER_44} h-9 lg:h-8 min-w-9 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold ${showAffichage ? "!bg-foreground !text-background hover:!bg-foreground/90" : ""}`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="libelle-action">{t("margeAffichage.titre")}</span>
                </Button>
              </ActionsChant>
            </div>
          </div>

          {/* Embed YouTube */}
          
        </div>
        {youtubeId && showVideo && (
            <div className="video-chant relative print:hidden border-b border-border bg-black/5 px-4 py-3 flex justify-center mt-[82px]">
              <div className="w-full max-w-xl aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  title={`${song.title} — YouTube`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-lg"
                />
            </div>
          </div>
        )}
        {/* Contenu — un tap rappelle la barre d'outils (sans gêner la sélection de texte) ; la marge « Affichage »
            l'enveloppe : colonne qui pousse la musique dès 1 024 px, feuille dessous. */}
        <div ref={enveloppeMarge}>
        <MargeAffichage
          mode="page"
          sansColonne={!margeEnColonne}
          ouvert={showAffichage}
          onFermer={() => setShowAffichage(false)}
          zh={isZh}
          sansRole
          aJianpu={!!jianpuScore}
          uid={authEnCours ? undefined : compte?.uid ?? null}
          retourFocus={boutonAffichageRef}
        >
        <div ref={zoneLecture} className="corps-chant flex items-start gap-6">
        <main
          className="song-zoom min-w-0 flex-1 px-4 py-6 print:px-0 print:py-2 print:max-w-none max-w-2xl mx-auto overflow-x-auto mt-[48px] [--marge-bande:1rem] print:[--marge-bande:0px]"
          style={{
            transform: `scale(${fontScale})`,
            transformOrigin: 'top left  ',
          }}
          onClick={() => {
            if (window.getSelection()?.toString()) return;
            setBarPinned(true);
          }}
        >
          {lecture && lecture.options.length > 1 && (
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 print:hidden" onClick={(e) => e.stopPropagation()}>
              <MenuJeLis lecture={lecture} onChoisir={(v) => mp.choisir(song.slug, v)} partage={compte ? { slug: song.slug, uid: compte.uid, setlistId: setlistDOrigine, mp } : undefined} />
              {lecture.valeur === "mienne" && <LigneMaPartition date={lecture.mienne?.updatedAt} enAttente={mp.enAttente} />}
              {lecture.options.find((o) => o.valeur === lecture.valeur)?.type === "partagee" && (
                <LignePartagee
                  nom={lecture.options.find((o) => o.valeur === lecture.valeur)?.nom} mienne={mienne}
                  onGarder={() => { const p = mp.partagees.find((x) => x.slug === song.slug && x.ownerUid === lecture.valeur); if (p) mp.garderUneCopie(p, historyAuthor(profile)?.name ?? "").catch(() => {}); }}
                />
              )}
            </div>
          )}
          {/* L'en-tête du site reste au-dessus du scan (K3) ; le segment « 简谱 · Paroles »
              à droite des pastilles règle la préférence de l'appareil (D5). */}
            <SongView
              pageChant
              slug={song.slug}
              armure={
                <Armure
                  titre={song.title}
                  langue={isZh ? "zh" : "fr"}
                  tonaliteOrigine={originalKey}
                  tonaliteReco={recommendedKey}
                  tonaliteEquipe={setlistDOrigine ? setlistKey : null}
                  tonalite={customize.currentKey}
                  portee={setlistDOrigine ? "appareil" : "page"}
                  onChange={(k) => {
                    compter(k === originalKey ? "cmd.chant.toniqueOrigine" : "cmd.chant.transposer");
                    setCustomize((prev) => ({ ...prev, currentKey: k, semitones: semitonesTo(originalKey, k) }));
                  }}
                />
              }
              statistiques={<StatistiquesDuChant slug={song.slug} />}
              bascule={
                jianpuScore ? (
                  <span role="radiogroup" aria-label={t("songs.detail.basculeJianpu")} className="inline-flex h-8 rounded-full bg-secondary p-0.5 print:hidden">
                    {[
                      { on: true, libelle: "简谱" },
                      { on: false, libelle: t("songs.detail.paroles") },
                    ].map(({ on, libelle }) => (
                      <button
                        key={libelle}
                        type="button"
                        role="radio"
                        aria-checked={showScore === on}
                        onClick={(e) => {
                          e.stopPropagation();
                          choisirScore(on);
                        }}
                        className={`${TOUCHER_RANGEE} h-7 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          showScore === on ? "text-background" : "text-muted-foreground hover:text-foreground"
                        }`}
                        style={showScore === on ? { backgroundColor: "hsl(var(--jianpu-encre))" } : undefined}
                      >
                        {libelle}
                      </button>
                    ))}
                  </span>
                ) : undefined
              }
              corps={
                showScore && jianpuScore && layout !== "structure" ? (
                  // Cale K2 (spec jianpu-integration, O14) : au téléphone, la fin de la feuille remonte au-dessus de la barre d'onglets.
                  <div data-testid="marge-barre" className="max-sm:[body:has([data-testid=barre-du-bas])_&]:pb-[calc(78px+var(--tabbar-bottom))]">
                    <JianpuSheet
                      entry={jianpuScore}
                      title={song.title}
                      slug={song.slug}
                      playedKey={customize.currentKey !== originalKey ? customize.currentKey : null}
                      originalKey={originalKey}
                      chordEdits={versionSetlist?.retouches}
                    />
                  </div>
                ) : undefined
              }
              ast={displayedAST}
              showChords={r.accords}
              showPinyin={showPinyin}
              useJianpu={customize.useJianpu}
              structureOverride={structureOverride}
              sectionNotes={sectionsNote}
              sectionNuances={sectionsNuance}
              sectionKeys={sectionsKeys}
              disposition={disposition}
              layout={layout}
              marques={lecture?.marques}
              onLineSelect={crayon ? (line) => toucherLigne(line) : undefined}
              onConflit={lecture?.modifiable ? (index, choix) => { mp.enregistrer(resoudreConflit(lecture, index, choix)).catch(() => {}); } : undefined}
            />
        </main>
        {/* Idées d'harmonie du chant (lot 9) : colonne à droite de la partition en grand écran, feuille sinon. */}
        <HarmonieDuChant
          sansTitre={grandEcran}
          disposition={grandEcran ? "colonne" : "feuille"}
          open={grandEcran ? accesHarmonie.peut && colonneOuverte : showIdees}
          onClose={() => {
            setPassageIci(undefined);
            if (grandEcran) { setColonneOuverte(false); boutonHarmonieRef.current?.focus(); } else setShowIdees(false);
          }}
          slug={song.slug}
          titre={song.title}
          sections={displayedAST.sections}
          tonalite={customize.currentKey}
          tonaliteOrigine={originalKey}
          instrument={instrumentHarmonie}
          passage={passageIci}
        />
        </div>
        </MargeAffichage>
        </div>

        {crayon && (
          <>
            <BarreCrayon cible={viseeCrayon} onCible={setViseeCrayon} onTermine={() => { setCrayon(false); setEditTarget(null); }} deuxVolets={deuxVolets} />
            {/* Dans `body` : la feuille ouverte masque le reste de la page aux lecteurs d'écran, l'alerte doit rester annoncée. */}
            {erreurCrayon && createPortal(
              <p role="alert" className="fixed inset-x-4 bottom-[calc(var(--tabbar-bottom)+78px+56px)] z-[60] mx-auto w-fit rounded-full bg-foreground px-4 py-2 text-sm text-background">
                {t("maPartition.erreurEnregistrement")}
              </p>,
              document.body,
            )}
            <EditLineSheet
              target={editTarget}
              saving={enregistrement}
              onClose={() => { setEditTarget(null); setErreurCrayon(false); }}
              onSaveLine={(newRaw) => retoucher((source, c) => {
                if (newRaw === source.split("\n")[c.srcLine]) return source;
                const next = replaceSourceLine(source, c.srcLine, newRaw);
                // Le pinyin est désormais inline dans la ligne → la ligne séparée disparaît.
                return c.pinyinSrcLine !== undefined ? deleteSourceLines(next, [c.pinyinSrcLine]) : next;
              })}
              onInsertAfter={(newRaw) => retoucher((source, c) => insertSourceLineAfter(source, Math.max(c.srcLine, c.pinyinSrcLine ?? -1), newRaw))}
              onDeleteLine={() => retoucher((source, c) => deleteSourceLines(source, [c.srcLine, ...(c.pinyinSrcLine !== undefined ? [c.pinyinSrcLine] : []), ...(c.jianpuSrcLine !== undefined ? [c.jianpuSrcLine] : [])]))}
            />
          </>
        )}

        {/* Panneau de personnalisation */}
        {showPanel && (
          <CustomizePanel
            originalKey={originalKey}
            isZh={isZh}
            sections={ast.sections}
            state={customize}
            onChange={setCustomize}
            onClose={() => setShowPanel(false)}
          />
        )}

        <PdfChoiceSheet
          open={showPdfChoice}
          onClose={() => setShowPdfChoice(false)}
          forSetlist={false}
          onDownload={handleDownload}
        />
        {/* Signalement */}
        <ReportDialog
          open={showReport}
          onClose={() => setShowReport(false)}
          kind="song"
          songSlug={song.slug}
          songTitle={song.title}
        />

    </div>
    </AccordsProvider>
    );
  }
