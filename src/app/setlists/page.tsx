"use client";

import { GuideLien } from "@/components/guide/GuideLien";
import { useEffect, useState, useMemo, useCallback } from "react";
import { ALL_CATEGORIES, FETE_CATEGORIES, getSetlists, getMySetlists, getSetlistsPartagees, deleteSetlist, deleteSetlists, getCorbeille, mettreALaCorbeilleGroupe, restaurerSetlist } from "@/lib/firebase/setlists";
import type { FSSetlist } from "@/types/setList";
import { useProfile } from "@/lib/firebase/users";
import { visibleCategories, canCreateSetlist, canDeleteSetlist, canSeeSetlist, isAdminUser } from "@/lib/access";
import {
  loadPlanningData,
  datesServies,
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
import { Lock } from "lucide-react";
import { ChampRecherche } from "@/components/layout/ChampRecherche";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { OngletsRail } from "@/components/layout/Onglets";
import { Menu } from "@/components/ui/menu";
import { TOUCHER_44, TOUCHER_PILULE } from "@/lib/toucher44";
import { SetlistCard, SetlistCarteChants } from "@/components/setlists/SetlistCard";
import { BandeauCorbeille } from "@/components/setlists/BandeauCorbeille";
import { ApercuSetlist } from "@/components/setlists/ApercuSetlist";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { useDisposition } from "@/hooks/useDisposition";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import type { SongIndexEntry } from "@/types/song";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { GROUPE } from "@/components/ui/group";
import { FondDeBarre } from "@/components/layout/FondDeBarre";
import { langueCourte } from "@/lib/utils/formatDate";
import { useSetlistsNavState, type Tab } from "@/hooks/useSetlistsNavState";
import { EtatVide } from "@/components/layout/EtatVide";
import { Squelette } from "@/components/layout/Squelette";
import { useMessageTemporaire } from "@/hooks/useMessageTemporaire";
import { clesDeMesServices, estDeMesServices, trierSetlists } from "@/lib/setlist/liste";
import { EcranConnexionRequise, EcranProfilRequis } from "./_components/EcransAccesListe";
import { SectionCorbeille } from "./_components/SectionCorbeille";
import { ConfirmationSuppressionGroupee, ConfirmationSuppressionDefinitive } from "./_components/ConfirmationsSuppression";
import { compter } from "@/lib/usage";

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

  // Clés des services réels de l'utilisateur (filtre « Mes services »), `src/lib/setlist/liste.ts` : pour Campus,
  // la séance où l'on sert réellement (moment, ou président pour les anciennes setlists).
  const myServiceKeys = useMemo(() => clesDeMesServices(planning, profile?.planningName), [planning, profile]);

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
        titreAffiche(s, langueCourte(i18n.language)).toLowerCase().includes(q) ||
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
          estDeMesServices(s, myServiceKeys) ||
          s.ownerId === user?.uid)
    );
    // Un même jour, les setlists d'une fête suivent l'ordre de passage.
    return trierSetlists(list, tab === "upcoming", todayStr, rangPassage);
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
  const [message, montrerMessage] = useMessageTemporaire();

  const peutSupprimer = (s: FSSetlist) => !!user && canDeleteSetlist(user, profile, s);
  const supprimables = displayed.filter(peutSupprimer);
  const selection = supprimables.filter((s) => coches.has(s.id));
  // « Mettre à la corbeille » pour des setlists ordinaires ; une fête dans la sélection garde la confirmation définitive.
  const avecFete = selection.some((s) => !!s.fete);
  // La corbeille ne montre que ce qu'on pourrait supprimer : un musicien ne voit pas celle d'un autre.
  const corbeilleVisible = corbeille.filter(peutSupprimer);

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
      compter("cmd.setlist.corbeille.mettre");
      setEnCorbeille(vers.ok);
      setVersionCorbeille((v) => v + 1);
    }
    // Les mises à la corbeille se disent par le bandeau « Annuler » ; ici, les suppressions définitives et les échecs.
    montrerMessage(
      [
        definitives.ok.length ? t("setlists.list.deleteDone", { count: definitives.ok.length }) : null,
        rates.length
          ? t("setlists.list.deleteFailed", { count: rates.length, titles: rates.join(", ") })
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    );
    setEnCours(false);
    if (ko.length === 0) setSelectionMode(false);
  }

  async function annulerCorbeille() {
    const ids = enCorbeille;
    try {
      for (const id of ids) await restaurerSetlist(id);
      compter("cmd.setlist.corbeille.restaurer");
    } catch {
      montrerMessage(t("setlists.corbeille.erreur"));
    }
    setEnCorbeille([]);
    await rafraichir().catch(() => {});
  }

  async function restaurer(s: FSSetlist) {
    try {
      await restaurerSetlist(s.id);
      compter("cmd.setlist.corbeille.restaurer");
      await rafraichir();
    } catch {
      montrerMessage(t("setlists.corbeille.erreur"));
    }
  }

  async function supprimerDefinitivement(s: FSSetlist) {
    setEnCours(true);
    try {
      await deleteSetlist(s.id);
      compter("cmd.setlist.corbeille.supprimer");
      setVersionCorbeille((v) => v + 1);
    } catch {
      montrerMessage(t("setlists.corbeille.erreur"));
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
    return <EcranConnexionRequise />;
  }

  // Connecté mais profil incomplet (les admins passent quand même)
  if (!profile && !admin) {
    return <EcranProfilRequis />;
  }


  // « Mes services » : seul sur sa ligne au téléphone (inchangé) ; en tête de la rangée des
  // filtres en grand et sur tablette (planches `setlists-*`).
  const mesServices = profile?.planningName && tab !== "mine" && (
    <button
      type="button"
      aria-pressed={onlyMine}
      onClick={() => setOnlyMine((v) => !v)}
      className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors duration-150 [@media(pointer:coarse)]:h-8 ${TOUCHER_PILULE} ${
        onlyMine
          ? "bg-primary text-primary-foreground"
          : "bg-secondary-fond dark:bg-secondary text-foreground active:bg-secondary/70"
      }`}
    >
      {t("setlists.list.myServicesFilter")}
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
      <h2 className="text-base font-semibold text-foreground">
        {libelleEdition(feteDe(editionFiltree)!, anneeDe(editionFiltree) ?? 0, langueCourte(i18n.language))}
        {" · "}
        {jourEnLettres(editionFiltree.jourJ, i18n.language)}
      </h2>
    </div>
  );
  // « Sans chant » en bas de la liste (CF13) ; pas pendant une recherche, qui réduit la liste.
  const piedFete = editionFiltree && sansChant.length > 0 && !loading && !query.trim() && (
    <p className="mt-4 text-sm text-muted-foreground">{t("setlists.fete.sansChant", { liste: sansChant.join(", ") })}</p>
  );

  const rail = (
        <OngletsRail
          etiquette={t("common.header.setlists")}
          surGris
          pleineLargeur={disposition === "telephone"}
          actif={tab}
          choisir={(o) => changerOnglet(o as Tab)}
          onglets={[
            { id: "upcoming", label: t("setlists.list.upcoming", { defaultValue: "À venir" }) },
            { id: "archived", label: t("setlists.list.archived", { defaultValue: "Archives" }) },
            {
              id: "mine",
              label: (
                <>
                  <Lock className="h-3.5 w-3.5" aria-hidden />
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
  );
  const filtres = (
        <div className={`space-y-3 ${grand ? "max-w-[400px]" : ""}`}>
          <ChampRecherche
            value={query}
            onChange={setQuery}
            placeholder={t("setlists.list.searchPlaceholder")}
            label={t("setlists.list.searchPlaceholder")}
            surGris
          />

          {disposition === "telephone" && mesServices}

          <div className="flex items-center gap-2">
            {disposition !== "telephone" && mesServices}
            <Menu
              label={t("setlists.list.filterCategoryLabel")}
              surGris
              value={categoryFilter}
              defaultValue="Toutes"
              onChange={setCategoryFilter}
              options={[
                { valeur: "Toutes", libelle: t("setlists.list.allCategories") },
                ...[
                  { groupe: t("setlists.list.mainMeetings"), cats: ALL_CATEGORIES.slice(0, 4).filter((cat) => myCategories.includes(cat)) },
                  { groupe: t("setlists.list.groupsLabel"), cats: ALL_CATEGORIES.slice(4).filter((cat) => myCategories.includes(cat)) },
                  ...(BACK_OFFICE ? [{ groupe: t("setlists.list.fetes"), cats: [...FETE_CATEGORIES] }] : []),
                ]
                  .filter((g) => g.cats.length > 0)
                  .map((g) => ({ groupe: g.groupe, options: g.cats.map((cat) => ({ valeur: cat as string, libelle: t("categories." + cat, { defaultValue: cat }) })) })),
              ]}
            />
            {!selectionMode && supprimables.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className={`ml-auto shrink-0 text-sm font-semibold text-foreground underline underline-offset-2 cursor-pointer ${TOUCHER_44}`}
              >
                {t("setlists.list.select")}
              </button>
            )}
          </div>
        </div>
  );
  // Agencement v18 (A9, R1 à R3, R7 de docs/spec-agencement-v18.md) : l'en-tête sur toute la
  // largeur, au-dessus des deux volets ; « + Nouvelle setlist » y est l'action principale
  // (pilule dès 768 px, rond fixe sur téléphone). La liste n'a plus de titre. Recette de surface (C) :
  // le rail et les filtres sont des contrôles posés sur le gris (sous le titre), seule la liste est un groupe blanc.
  const enTete = (
    <EnTetePage
      titre={t("common.header.setlists")}
      sousTitre={t("setlists.list.sousTitre")}
      action={canCreate ? <BoutonNouveau label={t("setlists.list.newButton")} href="/setlists/new" /> : undefined}
      onglets={rail}
      apres={filtres}
    />
  );

  const contenuListe = (
      <>
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
            surGris={!grand}
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
            <ul className="space-y-4">
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
          <ul className={grand ? undefined : `${GROUPE} px-4 py-1`}>
            {displayed.map((s) => (
              <li key={s.id} className="group-row relative">
                <SetlistCard
                  setlist={s}
                  selectable={selectionMode ? peutSupprimer(s) : undefined}
                  selected={coches.has(s.id)}
                  onToggle={() => basculer(s.id)}
                  onApercu={grand ? () => setApercu(s.id) : undefined}
                  actif={grand && !selectionMode && s.id === choisie?.id}
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
          <SectionCorbeille
            setlists={corbeilleVisible}
            ouverte={corbeilleOuverte}
            onBasculer={() => setCorbeilleOuverte((o) => !o)}
            onRestaurer={(s) => void restaurer(s)}
            onSupprimer={setASupprimerDefinitivement}
          />
        )}
        {!grand && <GuideLien section="setlists" />}
      </>
  );

  return (
    <div className="relative">
      <PullToRefresh />
      {enTete}
      {grand ? (
        <DeuxVolets
          racine="/setlists"
          largeurListe={400}
          // V3 (validation du 07/11/2026) : plus de colonne seule tant qu'on n'a rien touché ; la première
          // setlist de la liste est montrée d'emblée (`choisie`). Seule une liste vide reste en colonne seule.
          colonneSeule={!choisie}
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
      {/* « Comment ça marche ? » : sous la liste, sur le gris, jamais dans le groupe. */}
      {grand && <div className="px-[var(--marge-page)] pb-6"><GuideLien section="setlists" /></div>}
        {/* ── Confirmation : elle NOMME ce qui va disparaître (D3) ── */}
        <ConfirmationSuppressionGroupee
          ouvert={confirmOpen}
          onOuvertChange={setConfirmOpen}
          selection={selection}
          avecFete={avecFete}
          enCours={enCours}
          onConfirmer={() => void supprimerSelection()}
        />

        {/* ── Suppression définitive depuis la corbeille ── */}
        <ConfirmationSuppressionDefinitive
          setlist={aSupprimerDefinitivement}
          onFermer={() => setASupprimerDefinitivement(null)}
          enCours={enCours}
          onConfirmer={(s) => void supprimerDefinitivement(s)}
        />
    </div>
  );
}
