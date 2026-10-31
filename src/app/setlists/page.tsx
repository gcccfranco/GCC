"use client";

import { GuideLien } from "@/components/guide/GuideLien";
import { useEffect, useState, useMemo, useCallback } from "react";
import { ALL_CATEGORIES, FETE_CATEGORIES, getSetlists, getMySetlists, getSetlistsPartagees, deleteSetlist, deleteSetlists, getCorbeille, mettreALaCorbeilleGroupe, restaurerSetlist, type FSSetlist } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { visibleCategories, canCreateSetlist, canDeleteSetlist, canSeeSetlist, isAdminUser } from "@/lib/access";
import {
  loadPlanningData,
  datesServies,
  findMyServices,
  serviceCategory,
  normalizeName,
  type PlanningData,
} from "@/lib/planning/names";
import { estDansLePartage, nomCourt } from "@/lib/setlist/partage";
import { useTranslation } from "react-i18next";
import { BACK_OFFICE } from "@/lib/backOffice";
import { listProgrammes } from "@/lib/firebase/programmes";
import { anneeDe, editionsDe, feteDe, libelleEdition } from "@/lib/scene/fetes";
import { jourEnLettres } from "@/app/evenements/scene/libelles";
import { titreAffiche } from "@/lib/fetes/droits";
import type { Programme } from "@/types/programme";
import { ChampRecherche } from "@/components/layout/ChampRecherche";
import { Lock, LogIn, UserPen, ChevronDown } from "lucide-react";
import Link from "next/link";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { OngletsRail } from "@/components/layout/Onglets";
import { SetlistCard, SetlistCarteChants } from "@/components/setlists/SetlistCard";
import { BandeauCorbeille } from "@/components/setlists/BandeauCorbeille";
import { ApercuSetlist } from "@/components/setlists/ApercuSetlist";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { useDisposition } from "@/hooks/useDisposition";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import type { SongIndexEntry } from "@/types/song";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { Halo } from "@/components/layout/Halo";
import { FondDeBarre } from "@/components/layout/FondDeBarre";
import { formatDate } from "@/lib/utils/formatDate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSetlistsNavState, type Tab } from "@/hooks/useSetlistsNavState";
import { EtatVide } from "@/components/layout/EtatVide";
import { Squelette } from "@/components/layout/Squelette";

// Lot U4 bis, B2 (docs/spec-pages-en-grand.md, Q4) : en grand, la liste à gauche et l'aperçu
// de la setlist choisie à droite (`?apercu=<id>`, sans aperçu choisi la première de la liste,
// Q3) ; tablette portrait, cartes sur deux colonnes qui listent leurs chants ; téléphone inchangé.
export default function SetlistsPage() {
  const { t, i18n } = useTranslation();
  const { user, profile, loading: authLoading } = useProfile();
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [mySetlists, setMySetlists] = useState<FSSetlist[]>([]);
  // Celles dont on est de l'équipe (PS10) : lues à part, fusionnées par id avec la liste commune.
  const [partagees, setPartagees] = useState<FSSetlist[]>([]);
  // Les éditions des fêtes : l'ordre de passage des setlists de fête, « Sans chant » (CF13).
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [programmesLus, setProgrammesLus] = useState(!BACK_OFFICE);
  const [loading, setLoading] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  // Onglet, recherche, catégorie : dans l'URL (retour navigateur fidèle).
  // « Mes services » : mémorisé sur l'appareil (coché par défaut).
  const { categoryFilter: categorieDemandee, setCategoryFilter, tab, setTab, query, setQuery, onlyMine, setOnlyMine, apercu, setApercu } =
    useSetlistsNavState();
  // Un lien « ?cat=Noël » ouvert là où les fêtes sont coupées : « Toutes ».
  const categoryFilter = !BACK_OFFICE && (FETE_CATEGORIES as readonly string[]).includes(categorieDemandee) ? "Toutes" : categorieDemandee;
  const disposition = useDisposition();
  const grand = disposition === "grand";

  // Titres et tonalités des chants : l'aperçu et les cartes de la tablette les montrent.
  const [songsMap, setSongsMap] = useState<Record<string, SongIndexEntry>>({});
  const avecChants = disposition !== "telephone";
  useEffect(() => {
    if (!avecChants) return;
    chargerIndexChants()
      .then((index) => setSongsMap(Object.fromEntries(index.map((x) => [x.slug, x]))))
      .catch(() => {});
  }, [avecChants]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    loadPlanningData().then(setPlanning);
  }, []);

  // Clés des services réels de l'utilisateur (filtre « Mes services »). Campus : matin et
  // soir partagent date + catégorie → clés par moment (setlists récentes) ET par président
  // (anciennes setlists sans moment) pour ne matcher que la séance où l'on sert réellement.
  const myServiceKeys = useMemo(() => {
    const set = new Set<string>();
    if (!planning || !profile?.planningName) return set;
    for (const e of findMyServices(planning, profile.planningName)) {
      const cat = serviceCategory(e.service);
      if (!cat) continue;
      const date = e.setlistDate ?? e.date;
      if (cat === "Campus") {
        if (e.moment) set.add(`${date}|Campus|m:${e.moment}`);
        set.add(`${date}|Campus|l:${normalizeName(e.leader ?? "")}`);
      } else {
        set.add(`${date}|${cat}`);
      }
    }
    return set;
  }, [planning, profile]);

  // Lot AO (F1) : les dates où l'on sert — leur setlist se lit même sans équipe (`canSeeSetlist`).
  const datesDuCompte = useMemo(
    () => (planning && profile?.planningName ? datesServies(planning, profile.planningName) : undefined),
    [planning, profile]
  );

  // Catégories accessibles selon le profil (services + EDD + groupe) — admins : toutes
  const admin = isAdminUser(user);
  const myCategories = useMemo(
    () => (admin ? [...ALL_CATEGORIES] : profile ? visibleCategories(profile) : []),
    [profile, admin]
  );
  // Bouton « Créer » : caché pour une régie pure (aucune catégorie créable)
  const canCreate = canCreateSetlist(user, profile);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setSetlists([]); setLoading(false); return; }
    setLoading(true);
    Promise.all([getSetlists(), getSetlistsPartagees(user.uid).catch(() => [] as FSSetlist[])])
      .then(([toutes, miennes]) => {
        setSetlists(toutes);
        setPartagees(miennes);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  // Liste commune + setlists de l'équipe, sans doublon (la requête n'est pas crue sur parole).
  const toutes = useMemo(() => {
    const parId = new Map(setlists.map((s) => [s.id, s]));
    for (const s of partagees) if (user && estDansLePartage(s, user.uid) && !parId.has(s.id)) parId.set(s.id, s);
    return [...parId.values()];
  }, [setlists, partagees, user]);
  // « Dans l'équipe » : une setlist qu'on ne verrait pas par ses catégories ni comme propriétaire.
  const dansLEquipe = (s: FSSetlist) =>
    !s.fete && !!user && estDansLePartage(s, user.uid) && s.ownerId !== user.uid && !myCategories.includes(s.category);

  // Une setlist de fête : rang de son passage dans l'ordre de passage ; sans élément, ou dont le passage a
  // été retiré de l'ordre, elle n'a pas de ligne (CF11, CF13).
  const edition = (s: FSSetlist) => programmes.find((p) => p.id === s.fete?.programme);
  const rangPassage = (s: FSSetlist) => edition(s)?.passages.findIndex((p) => p.id === s.fete?.passage) ?? -1;
  const listee = (s: FSSetlist) => !s.fete || (s.items.length > 0 && (!edition(s) || rangPassage(s) >= 0));
  const infosFete = (s: FSSetlist) => ({
    titrePassage: edition(s)?.passages[rangPassage(s)]?.titre ?? "",
    numero: rangPassage(s) >= 0 ? rangPassage(s) + 1 : null,
  });
  const feteFiltree = (FETE_CATEGORIES as readonly string[]).includes(categoryFilter);

  useEffect(() => {
    if (!user || !BACK_OFFICE) return;
    listProgrammes().then(setProgrammes).catch(() => {}).finally(() => setProgrammesLus(true));
  }, [user]);

  useEffect(() => {
    if (!user) { setMySetlists([]); setLoadingMine(false); return; }
    setLoadingMine(true);
    getMySetlists(user.uid).then(setMySetlists).finally(() => setLoadingMine(false));
  }, [user]);

  // ── Corbeille (SC2, docs/spec-createur-corbeille-absences.md) ──
  // Les ids du bandeau « Annuler » (la suppression qui vient d'avoir lieu), la section repliée en bas
  // d'« Archives », et la setlist dont la suppression définitive attend confirmation.
  const [enCorbeille, setEnCorbeille] = useState<string[]>([]);
  const fermerBandeau = useCallback(() => setEnCorbeille([]), []);
  const [corbeille, setCorbeille] = useState<FSSetlist[]>([]);
  const [corbeilleOuverte, setCorbeilleOuverte] = useState(false);
  const [aSupprimerDefinitivement, setASupprimerDefinitivement] = useState<FSSetlist | null>(null);
  const [versionCorbeille, setVersionCorbeille] = useState(0);

  // Venue de la fiche (`?corbeille=id1,id2`) : le bandeau s'affiche ; l'adresse est ensuite réécrite sans
  // ce paramètre par `useSetlistsNavState` (replaceState, pas de rechargement).
  useEffect(() => {
    const ids = new URLSearchParams(window.location.search).get("corbeille");
    if (ids) setEnCorbeille(ids.split(",").filter(Boolean));
  }, []);

  useEffect(() => {
    if (!user || tab !== "archived") return;
    getCorbeille().then(setCorbeille).catch(() => {});
  }, [user, tab, versionCorbeille]);

  /** Relit les listes de la page sans l'écran « Chargement » : après une restauration. */
  async function rafraichir() {
    if (!user) return;
    const [toutesLues, miennes, privees] = await Promise.all([
      getSetlists(),
      getSetlistsPartagees(user.uid).catch(() => [] as FSSetlist[]),
      getMySetlists(user.uid),
    ]);
    setSetlists(toutesLues);
    setPartagees(miennes);
    setMySetlists(privees);
    setVersionCorbeille((v) => v + 1);
  }

  // Filtre commun : catégorie + recherche
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (s: FSSetlist) =>
      (categoryFilter === "Toutes" || s.category === categoryFilter) &&
      (!q ||
        s.title.toLowerCase().includes(q) ||
        titreAffiche(s, i18n.language === "zh-CN" ? "zh" : "fr").toLowerCase().includes(q) ||
        (s.leader ?? "").toLowerCase().includes(q) ||
        s.date.includes(q));
  }, [categoryFilter, query, i18n.language]);

  const displayed = useMemo(() => {
    if (tab === "mine") return mySetlists.filter(matches);
    const useMine = onlyMine && !!profile?.planningName;
    // Visibilité : setlists de ses services/groupe (+ celles qu'on a créées). Le filtre
    // « Mes services » restreint en plus aux dates où l'on sert réellement (accès conservé).
    const list = toutes.filter(
      (s) =>
        !!user && canSeeSetlist(user, profile, s, datesDuCompte) &&
        listee(s) &&
        matches(s) &&
        (!useMine ||
          estDansLePartage(s, user.uid) ||
          // Sous « Noël » ou « Pâques », toutes les setlists de la fête : rien ne s'y rattache à un service.
          (!!s.fete && feteFiltree) ||
          (s.category === "Campus"
            ? (!!s.moment && myServiceKeys.has(`${s.date}|Campus|m:${s.moment}`)) ||
              myServiceKeys.has(`${s.date}|Campus|l:${normalizeName(s.leader ?? "")}`)
            : myServiceKeys.has(`${s.date}|${s.category}`)) ||
          s.ownerId === user?.uid)
    );
    // Un même jour, les setlists d'une fête suivent l'ordre de passage.
    const memeJour = (a: FSSetlist, b: FSSetlist) =>
      (a.fete ? 1 : 0) - (b.fete ? 1 : 0) || (a.fete?.programme ?? "").localeCompare(b.fete?.programme ?? "") || rangPassage(a) - rangPassage(b);
    return tab === "upcoming"
      ? list.filter((s) => s.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date) || memeJour(a, b))
      : list.filter((s) => s.date < todayStr).sort((a, b) => b.date.localeCompare(a.date) || memeJour(a, b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, toutes, mySetlists, matches, todayStr, user, profile, onlyMine, myServiceKeys, programmes, feteFiltree, datesDuCompte]);

  // L'aperçu (en grand) : celui de l'adresse, sinon la première setlist de la liste filtrée (Q3).
  // Une adresse peut viser une setlist d'un autre onglet (lien partagé) : seulement si la page
  // de la setlist l'ouvrirait (`canSeeSetlist`, même règle que sa page).
  const choisie =
    (apercu &&
      (displayed.find((s) => s.id === apercu) ??
        [...toutes, ...mySetlists].find((s) => s.id === apercu && !!user && canSeeSetlist(user, profile, s, datesDuCompte)))) ||
    displayed[0] ||
    null;

  // ── Suppression groupée (lot 10, docs/spec-suppression-groupee.md) ──
  // La sélection est **dérivée** de ce qui est affiché : changer de filtre ou
  // chercher la rétrécit sous les yeux, et on ne supprime jamais une setlist
  // qu'on ne voit plus. Le mode, lui, reste ouvert jusqu'à « Annuler ».
  const [selectionMode, setSelectionMode] = useState(false);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const peutSupprimer = (s: FSSetlist) => !!user && canDeleteSetlist(user, profile, s);
  const supprimables = displayed.filter(peutSupprimer);
  const selection = supprimables.filter((s) => coches.has(s.id));
  // « Mettre à la corbeille » pour des setlists ordinaires ; une fête dans la sélection garde la confirmation définitive.
  const avecFete = selection.some((s) => !!s.fete);
  // La corbeille ne montre que ce qu'on pourrait supprimer : un musicien ne voit pas celle d'un autre.
  const corbeilleVisible = corbeille.filter(peutSupprimer);
  const dateCourte = (iso: string) => {
    const d = new Date(iso);
    return i18n.language === "zh-CN"
      ? `${d.getMonth() + 1}月${d.getDate()}日`
      : new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(d);
  };

  // Changer d'onglet vide la sélection : aucune ligne n'est commune d'un onglet
  // à l'autre, et revenir ne doit pas ramener des cases cochées oubliées.
  function changerOnglet(onglet: Tab) {
    setTab(onglet);
    setCoches(new Set());
  }

  function quitterSelection() {
    setSelectionMode(false);
    setCoches(new Set());
  }

  function basculer(id: string) {
    setCoches((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function supprimerSelection() {
    if (!user) return;
    const cibles = selection;
    setEnCours(true);
    // Les setlists ordinaires vont à la corbeille ; celles d'une fête restent supprimées pour de bon (SC2, Q3).
    const ordinaires = cibles.filter((s) => !s.fete);
    const fetes = cibles.filter((s) => s.fete);
    const vers = ordinaires.length
      ? await mettreALaCorbeilleGroupe(ordinaires.map((s) => s.id), user.uid)
      : { ok: [] as string[], ko: [] as string[] };
    const definitives = fetes.length ? await deleteSetlists(fetes.map((s) => s.id)) : { ok: [] as string[], ko: [] as string[] };
    const ok = [...vers.ok, ...definitives.ok];
    const ko = [...vers.ko, ...definitives.ko];
    // Pas de rechargement : les deux effets de chargement ne dépendent que de
    // `user` et ne se rejoueraient pas. On retire les supprimées en local.
    setSetlists((prev) => prev.filter((s) => !ok.includes(s.id)));
    setPartagees((prev) => prev.filter((s) => !ok.includes(s.id)));
    setMySetlists((prev) => prev.filter((s) => !ok.includes(s.id)));
    // Les ratées restent cochées : réessayer est un seul appui.
    setCoches(new Set(ko));
    const rates = cibles.filter((s) => ko.includes(s.id)).map((s) => `« ${s.title} »`);
    if (vers.ok.length) {
      setEnCorbeille(vers.ok);
      setVersionCorbeille((v) => v + 1);
    }
    // Les mises à la corbeille se disent par le bandeau « Annuler » ; ici, les suppressions définitives et les échecs.
    setMessage(
      [
        definitives.ok.length ? t("setlists.list.deleteDone", { count: definitives.ok.length }) : null,
        rates.length
          ? t("setlists.list.deleteFailed", { count: rates.length, titles: rates.join(", ") })
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    );
    window.setTimeout(() => setMessage(null), 6000);
    setEnCours(false);
    if (ko.length === 0) setSelectionMode(false);
  }

  async function annulerCorbeille() {
    const ids = enCorbeille;
    try {
      for (const id of ids) await restaurerSetlist(id);
    } catch {
      setMessage(t("setlists.corbeille.erreur"));
      window.setTimeout(() => setMessage(null), 6000);
    }
    setEnCorbeille([]);
    await rafraichir().catch(() => {});
  }

  async function restaurer(s: FSSetlist) {
    try {
      await restaurerSetlist(s.id);
      await rafraichir();
    } catch {
      setMessage(t("setlists.corbeille.erreur"));
      window.setTimeout(() => setMessage(null), 6000);
    }
  }

  async function supprimerDefinitivement(s: FSSetlist) {
    setEnCours(true);
    try {
      await deleteSetlist(s.id);
      setVersionCorbeille((v) => v + 1);
    } catch {
      setMessage(t("setlists.corbeille.erreur"));
      window.setTimeout(() => setMessage(null), 6000);
    }
    setEnCours(false);
    setASupprimerDefinitivement(null);
  }

  const emptyMessage = query
    ? t("setlists.list.emptySearch")
    : tab === "mine"
    ? t("setlists.list.emptyPrivate")
    : tab === "upcoming"
    ? t("setlists.list.emptyUpcoming")
    : t("setlists.list.emptyArchived");

  if (authLoading) {
    return <Squelette />;
  }

  // Non connecté : les setlists sont réservées aux membres
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("setlists.list.loginRequired")}</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/login?from=/setlists"
              className="flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              {t("common.header.login")}
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
            >
              {t("common.header.signup")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Connecté mais profil incomplet (les admins passent quand même)
  if (!profile && !admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <UserPen className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("setlists.list.profileRequired")}</p>
          <Link
            href="/profil?from=/setlists"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {t("common.header.profile")}
          </Link>
        </div>
      </div>
    );
  }

  // Agencement v18 (A9, R1 à R3, R7 de docs/spec-agencement-v18.md) : l'en-tête sur toute la
  // largeur, au-dessus des deux volets ; « + Nouvelle setlist » y est l'action principale
  // (pilule dès 768 px, rond fixe sur téléphone). La liste n'a plus de titre.
  const enTete = (
    <EnTetePage
      titre={t("common.header.setlists")}
      sousTitre={t("setlists.list.sousTitre")}
      action={canCreate ? <BoutonNouveau label={t("setlists.list.newButton")} href="/setlists/new" /> : undefined}
    />
  );

  // « Mes services » : seul sur sa ligne au téléphone (inchangé) ; en tête de la rangée des
  // filtres en grand et sur tablette (planches `setlists-*`).
  const mesServices = profile?.planningName && tab !== "mine" && (
    <button
      type="button"
      aria-pressed={onlyMine}
      onClick={() => setOnlyMine((v) => !v)}
      className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.97] ${
        onlyMine
          ? "bg-foreground text-background"
          : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      {onlyMine ? `✓ ${t("setlists.list.myServicesFilter")}` : t("setlists.list.myServicesFilter")}
    </button>
  );

  // Sous « Noël » ou « Pâques » : l'édition (la prochaine, ou la plus récente en Archives), et les passages
  // qui n'ont pas de setlist non vide, dans l'ordre de passage (CF13).
  const editionFiltree = feteFiltree
    ? editionsDe(categoryFilter === "Pâques" ? "paques" : "noel", programmes)
        .filter((p) => p.ouvert !== false)
        .filter((p) => (tab === "upcoming" ? p.jourJ >= todayStr : p.jourJ < todayStr))
        .sort((a, b) => (tab === "upcoming" ? a.jourJ.localeCompare(b.jourJ) : b.jourJ.localeCompare(a.jourJ)))[0]
    : undefined;
  const sansChant = editionFiltree
    ? editionFiltree.passages
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => !toutes.some((s) => s.fete?.programme === editionFiltree.id && s.fete.passage === p.id && s.items.length > 0))
        .map(({ p, i }) => `${i + 1} · ${p.titre}`)
    : [];
  const enteteFete = editionFiltree && (
    <div className="mb-4 space-y-1">
      <h2 className="text-[15px] font-semibold text-foreground">
        {libelleEdition(feteDe(editionFiltree)!, anneeDe(editionFiltree) ?? 0, i18n.language === "zh-CN" ? "zh" : "fr")}
        {" · "}
        {jourEnLettres(editionFiltree.jourJ, i18n.language)}
      </h2>
    </div>
  );
  // « Sans chant » en bas de la liste (CF13) ; pas pendant une recherche, qui réduit la liste.
  const piedFete = editionFiltree && sansChant.length > 0 && !loading && !query.trim() && (
    <p className="mt-4 text-[13px] text-muted-foreground">{t("setlists.fete.sansChant", { liste: sansChant.join(", ") })}</p>
  );

  const contenuListe = (
      <>
        {/* ── Vues : le rail (R4) ── */}
        <OngletsRail
          etiquette={t("common.header.setlists")}
          className="mb-4 flex w-full [&>button]:flex-1"
          actif={tab}
          choisir={(o) => changerOnglet(o as Tab)}
          onglets={[
            { id: "upcoming", label: t("setlists.list.upcoming", { defaultValue: "À venir" }) },
            { id: "archived", label: t("setlists.list.archived", { defaultValue: "Archives" }) },
            {
              id: "mine",
              label: (
                <>
                  <Lock className="hidden sm:block h-3.5 w-3.5" aria-hidden />
                  {t("setlists.list.mySetlists")}
                  {mySetlists.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground">
                      {mySetlists.length}
                    </span>
                  )}
                </>
              ),
            },
          ]}
        />

        {/* ── Barre de filtres partagée ── */}
        <div className="space-y-3 mb-5">
          <ChampRecherche
            value={query}
            onChange={setQuery}
            placeholder={t("setlists.list.searchPlaceholder")}
            label={t("setlists.list.searchPlaceholder")}
          />

          {disposition === "telephone" && mesServices}

          <div className="flex items-center gap-2">
            {disposition !== "telephone" && mesServices}
            {!selectionMode && supprimables.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className="shrink-0 h-9 px-4 rounded-full bg-secondary text-foreground text-sm font-semibold hover:bg-muted transition-[background-color,transform] duration-150 active:scale-[.97]"
              >
                {t("setlists.list.select")}
              </button>
            )}
            <select
              aria-label={t("setlists.list.filterCategoryLabel")}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-w-0 flex-1 h-9 px-3 rounded-lg border border-transparent bg-secondary text-foreground text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <option value="Toutes">{t("setlists.list.allCategories")}</option>
              <optgroup label={t("setlists.list.mainMeetings")}>
                {ALL_CATEGORIES.slice(0, 4).filter((cat) => myCategories.includes(cat)).map((cat) => (
                  <option key={cat} value={cat}>
                    {t("categories." + cat, { defaultValue: cat })}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t("setlists.list.groupsLabel")}>
                {ALL_CATEGORIES.slice(4).filter((cat) => myCategories.includes(cat)).map((cat) => (
                  <option key={cat} value={cat}>
                    {t("categories." + cat, { defaultValue: cat })}
                  </option>
                ))}
              </optgroup>
              {BACK_OFFICE && (
                <optgroup label={t("setlists.list.fetes")}>
                  {FETE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t("categories." + cat, { defaultValue: cat })}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {feteFiltree && tab !== "mine" && enteteFete}

        {/* ── Résultat de la dernière suppression ── */}
        {message && (
          <div role="status" className="mb-4 rounded-xl bg-foreground px-4 py-2.5 text-sm text-background">
            {message}
          </div>
        )}

        {enCorbeille.length > 0 && (
          <BandeauCorbeille count={enCorbeille.length} onAnnuler={annulerCorbeille} onFermer={fermerBandeau} />
        )}

        {/* ── Barre d'action de la sélection ──
             En tête de liste sur les trois appareils, et **collante** sous la
             navbar : sur une longue liste elle reste à portée sans remonter.
             Pas de barre collée au bas de l'écran : à l'intérieur d'une page,
             `position: fixed` se règle sur la transformation d'animation de
             PageTransition, donc sur le bas du **document** et non de l'écran
             (docs/spec-suppression-groupee.md, R3). */}
        {selectionMode && (
          <div className={`sticky z-10 mb-4 flex items-center gap-2 material-chrome py-2.5 ${grand ? "top-0 -mx-4 px-4" : "top-[var(--nav-h)] -mx-[var(--marge-page)] px-[var(--marge-page)]"}`}>
            <FondDeBarre sousNavbar />
            <button
              type="button"
              disabled={selection.length === 0 || enCours}
              onClick={() => setConfirmOpen(true)}
              className="h-10 px-5 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-[.97] disabled:opacity-40 disabled:active:scale-100"
            >
              {enCours ? "…" : t("setlists.list.deleteSelected", { n: selection.length })}
            </button>
            <button
              type="button"
              onClick={quitterSelection}
              disabled={enCours}
              className="h-10 px-5 rounded-full bg-secondary text-foreground text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-[.97]"
            >
              {t("setlists.list.selectCancel")}
            </button>
          </div>
        )}

        {/* ── Contenu ── */}
        {(tab === "mine" ? loadingMine : loading || !programmesLus) ? (
          <Squelette enTete={false} className="px-0" />
        ) : displayed.length === 0 ? (
          <EtatVide
            action={
              /* Qui peut créer a « + Nouvelle setlist » dans l'en-tête : pas de seconde action ici (R7). */
              tab === "upcoming" && !query && !canCreate ? (
                <p className="text-sm text-muted-foreground">{t("setlists.list.emptyUpcomingHint")}</p>
              ) : undefined
            }
          >
            {emptyMessage}
          </EtatVide>
        ) : (
          disposition === "tablette" ? (
            <ul className="grid grid-cols-2 items-start gap-4">
              {displayed.map((s) => (
                <li key={s.id}>
                  <SetlistCarteChants
                    setlist={s}
                    songsMap={songsMap}
                    selectable={selectionMode ? peutSupprimer(s) : undefined}
                    selected={coches.has(s.id)}
                    onToggle={() => basculer(s.id)}
                    dansLEquipe={dansLEquipe(s)}
                    fete={s.fete ? infosFete(s) : undefined}
                  />
                </li>
              ))}
            </ul>
          ) : (
          <ul>
            {displayed.map((s) => (
              <li key={s.id} className="group-row relative">
                <SetlistCard
                  setlist={s}
                  selectable={selectionMode ? peutSupprimer(s) : undefined}
                  selected={coches.has(s.id)}
                  onToggle={() => basculer(s.id)}
                  onApercu={grand ? () => setApercu(s.id) : undefined}
                  actif={grand && !selectionMode && !!apercu && s.id === choisie?.id}
                  dansLEquipe={dansLEquipe(s)}
                  fete={s.fete ? infosFete(s) : undefined}
                />
              </li>
            ))}
          </ul>
          )
        )}
        {feteFiltree && tab !== "mine" && piedFete}
        {tab === "archived" && corbeilleVisible.length > 0 && (
          <section className="mt-8" data-testid="corbeille">
            <button
              type="button"
              aria-expanded={corbeilleOuverte}
              onClick={() => setCorbeilleOuverte((o) => !o)}
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-foreground">
                  {t("setlists.corbeille.titre", { count: corbeilleVisible.length })}
                </span>
                <span className="block text-[13px] text-muted-foreground">{t("setlists.corbeille.aide")}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${corbeilleOuverte ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {corbeilleOuverte && (
              <ul className="mt-1">
                {corbeilleVisible.map((s) => (
                  <li key={s.id} className="border-t border-border/70 py-3">
                    <p className="text-[15px] font-semibold text-foreground">{titreAffiche(s, i18n.language === "zh-CN" ? "zh" : "fr")}</p>
                    <p className="text-[13px] text-muted-foreground">
                      <span className="inline-block first-letter:uppercase">{formatDate(s.date, i18n.language)}</span>
                      {" · "}
                      {t("setlists.corbeille.supprimeeLe", { date: dateCourte(s.supprimeeLe!) })}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void restaurer(s)}
                        className="h-11 rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[.97]"
                      >
                        {t("setlists.corbeille.restaurer")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setASupprimerDefinitivement(s)}
                        className="h-11 rounded-full px-4 text-sm font-semibold text-destructive transition-[background-color,transform] duration-150 hover:bg-destructive/10 active:scale-[.97]"
                      >
                        {t("setlists.corbeille.supprimerDefinitivement")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <GuideLien section="setlists" />
      </>
  );

  return (
    <div className="relative min-h-screen bg-background">
      <PullToRefresh />
      <Halo color="var(--chord-color)" />
      {enTete}
      {grand ? (
        <DeuxVolets
          racine="/setlists"
          largeurListe={400}
          colonneSeule={!apercu}
          liste={<div className="relative px-4 pb-4 pt-4">{contenuListe}</div>}
          premier={choisie && (
            <ApercuSetlist setlist={choisie} songsMap={songsMap} planning={planning} monNom={profile ? nomCourt(profile) : ""} />
          )}
        >
          {null}
        </DeuxVolets>
      ) : (
        <div className="relative px-[var(--marge-page)] pb-10">{contenuListe}</div>
      )}
        {/* ── Confirmation : elle NOMME ce qui va disparaître (D3) ── */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {avecFete ? t("setlists.list.deleteSelectedTitle", { count: selection.length }) : t("setlists.list.trashTitle", { count: selection.length })}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {selection.slice(0, 8).map((s) => (
                      <li key={s.id}>
                        {titreAffiche(s, i18n.language === "zh-CN" ? "zh" : "fr")}
                        {" · "}
                        <span className="inline-block first-letter:uppercase">{formatDate(s.date, i18n.language)}</span>
                      </li>
                    ))}
                  </ul>
                  {selection.length > 8 && (
                    <p className="mt-1">
                      {t("setlists.list.deleteMore", { count: selection.length - 8 })}
                    </p>
                  )}
                  <p className="mt-2">
                    {avecFete ? t("setlists.list.deleteSelectedBody") : t("setlists.list.trashBody", { count: selection.length })}
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enCours}>{t("setlists.detail.deleteCancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={enCours}
                onClick={() => void supprimerSelection()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {enCours ? "…" : avecFete ? t("setlists.detail.deleteYes") : t("setlists.list.trashYes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Suppression définitive depuis la corbeille ── */}
        <AlertDialog open={!!aSupprimerDefinitivement} onOpenChange={(o) => !o && setASupprimerDefinitivement(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("setlists.corbeille.definitifTitre", { titre: aSupprimerDefinitivement ? titreAffiche(aSupprimerDefinitivement, i18n.language === "zh-CN" ? "zh" : "fr") : "" })}
              </AlertDialogTitle>
              <AlertDialogDescription>{t("setlists.corbeille.definitifCorps")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enCours}>{t("setlists.detail.deleteCancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={enCours}
                onClick={(e) => {
                  e.preventDefault();
                  if (aSupprimerDefinitivement) void supprimerDefinitivement(aSupprimerDefinitivement);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {enCours ? "…" : t("setlists.corbeille.supprimerDefinitivement")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
