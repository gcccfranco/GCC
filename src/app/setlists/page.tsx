"use client";

import { GuideLien } from "@/components/guide/GuideLien";
import { useEffect, useState, useMemo } from "react";
import { ALL_CATEGORIES, getSetlists, getMySetlists, deleteSetlists, type FSSetlist } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { visibleCategories, canCreateSetlist, canDeleteSetlist, isAdminUser } from "@/lib/access";
import {
  loadPlanningData,
  findMyServices,
  serviceCategory,
  normalizeName,
  type PlanningData,
} from "@/lib/planning/names";
import { useTranslation } from "react-i18next";
import { Search, X, Plus, Lock, LogIn, UserPen } from "lucide-react";
import Link from "next/link";
import { PageTitle } from "@/components/layout/PageTitle";
import { SetlistCard } from "@/components/setlists/SetlistCard";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
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

export default function SetlistsPage() {
  const { t, i18n } = useTranslation();
  const { user, profile, loading: authLoading } = useProfile();
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [mySetlists, setMySetlists] = useState<FSSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  // Onglet, recherche, catégorie : dans l'URL (retour navigateur fidèle).
  // « Mes services » : mémorisé sur l'appareil (coché par défaut).
  const { categoryFilter, setCategoryFilter, tab, setTab, query, setQuery, onlyMine, setOnlyMine } =
    useSetlistsNavState();

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
    getSetlists()
      .then(setSetlists)
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) { setMySetlists([]); setLoadingMine(false); return; }
    setLoadingMine(true);
    getMySetlists(user.uid).then(setMySetlists).finally(() => setLoadingMine(false));
  }, [user]);

  // Filtre commun : catégorie + recherche
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (s: FSSetlist) =>
      (categoryFilter === "Toutes" || s.category === categoryFilter) &&
      (!q ||
        s.title.toLowerCase().includes(q) ||
        (s.leader ?? "").toLowerCase().includes(q) ||
        s.date.includes(q));
  }, [categoryFilter, query]);

  const displayed = useMemo(() => {
    if (tab === "mine") return mySetlists.filter(matches);
    const useMine = onlyMine && !!profile?.planningName;
    // Visibilité : setlists de ses services/groupe (+ celles qu'on a créées). Le filtre
    // « Mes services » restreint en plus aux dates où l'on sert réellement (accès conservé).
    const list = setlists.filter(
      (s) =>
        (myCategories.includes(s.category) || s.ownerId === user?.uid) &&
        matches(s) &&
        (!useMine ||
          (s.category === "Campus"
            ? (!!s.moment && myServiceKeys.has(`${s.date}|Campus|m:${s.moment}`)) ||
              myServiceKeys.has(`${s.date}|Campus|l:${normalizeName(s.leader ?? "")}`)
            : myServiceKeys.has(`${s.date}|${s.category}`)) ||
          s.ownerId === user?.uid)
    );
    return tab === "upcoming"
      ? list.filter((s) => s.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
      : list.filter((s) => s.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));
  }, [tab, setlists, mySetlists, matches, todayStr, myCategories, user, onlyMine, profile, myServiceKeys]);

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
    const cibles = selection;
    setEnCours(true);
    const { ok, ko } = await deleteSetlists(cibles.map((s) => s.id));
    // Pas de rechargement : les deux effets de chargement ne dépendent que de
    // `user` et ne se rejoueraient pas. On retire les supprimées en local.
    setSetlists((prev) => prev.filter((s) => !ok.includes(s.id)));
    setMySetlists((prev) => prev.filter((s) => !ok.includes(s.id)));
    // Les ratées restent cochées : réessayer est un seul appui.
    setCoches(new Set(ko));
    const rates = cibles.filter((s) => ko.includes(s.id)).map((s) => `« ${s.title} »`);
    setMessage(
      [
        ok.length ? t("setlists.list.deleteDone", { count: ok.length }) : null,
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

  const emptyMessage = query
    ? t("setlists.list.emptySearch")
    : tab === "mine"
    ? t("setlists.list.emptyPrivate")
    : tab === "upcoming"
    ? t("setlists.list.emptyUpcoming")
    : t("setlists.list.emptyArchived");

  const tabBtnClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md font-semibold transition-colors text-sm ${
      active
        ? "bg-card text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh />
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
        <PageTitle title={t("common.header.setlists")} />

        {/* ── Onglets ── */}
        <div className="flex rounded-lg bg-secondary p-0.5 gap-0.5 text-sm mb-4">
          <button onClick={() => changerOnglet("upcoming")} className={tabBtnClass(tab === "upcoming")}>
            {t("setlists.list.upcoming", { defaultValue: "À venir" })}
          </button>
          <button
            onClick={() => changerOnglet("archived")}
            className={tabBtnClass(tab === "archived")}
          >
            {t("setlists.list.archived", { defaultValue: "Archives" })}
          </button>
          {!authLoading && user && (
            <button
              onClick={() => changerOnglet("mine")}
              className={tabBtnClass(tab === "mine")}
            >
              <Lock className="hidden sm:block h-3.5 w-3.5" />
              {t("setlists.list.mySetlists")}
              {mySetlists.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground">
                  {mySetlists.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Barre de filtres partagée ── */}
        <div className="space-y-3 mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("setlists.list.searchPlaceholder")}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-transparent bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring/50 focus:ring-[3px] focus:ring-ring/10 text-[16px] sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label={t("common.buttons.reset")}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground active:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {profile?.planningName && tab !== "mine" && (
            <button
              type="button"
              aria-pressed={onlyMine}
              onClick={() => setOnlyMine((v) => !v)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.97] ${
                onlyMine
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {onlyMine ? `✓ ${t("setlists.list.myServicesFilter")}` : t("setlists.list.myServicesFilter")}
            </button>
          )}

          <div className="flex items-center gap-2">
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg border border-transparent bg-secondary text-foreground text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
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
            </select>
            {canCreate && (
              <Link aria-label={t("setlists.list.newButton")}
                href="/setlists/new"
                className="shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-[background-color,transform] duration-150 active:scale-[.97]"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("setlists.list.newButton")}</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Résultat de la dernière suppression ── */}
        {message && (
          <div role="status" className="mb-4 rounded-xl bg-foreground px-4 py-2.5 text-sm text-background">
            {message}
          </div>
        )}

        {/* ── Barre d'action de la sélection ──
             En tête de liste sur les trois appareils, et **collante** sous la
             navbar : sur une longue liste elle reste à portée sans remonter.
             Pas de barre collée au bas de l'écran : à l'intérieur d'une page,
             `position: fixed` se règle sur la transformation d'animation de
             PageTransition, donc sur le bas du **document** et non de l'écran
             (docs/spec-suppression-groupee.md, R3). */}
        {selectionMode && (
          <div className="sticky top-[var(--nav-h)] z-10 -mx-4 mb-4 flex items-center gap-2 material-chrome shadow-[0_1px_0_hsl(var(--border))] px-4 py-2.5">
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
        {(tab === "mine" ? loadingMine : loading) ? (
          <div className="text-sm text-muted-foreground text-center py-16">
            {t("common.loading")}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl space-y-3">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            {tab === "upcoming" && !query && !canCreate && (
              <p className="text-sm text-muted-foreground">{t("setlists.list.emptyUpcomingHint")}</p>
            )}
            {tab === "upcoming" && !query && canCreate && (
              <Link
                href="/setlists/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-[background-color,transform] duration-150 active:scale-[.97]"
              >
                <Plus className="h-4 w-4" />
                {t("setlists.list.newButton")}
              </Link>
            )}
          </div>
        ) : (
          <ul>
            {displayed.map((s) => (
              <li key={s.id} className="group-row relative">
                <SetlistCard
                  setlist={s}
                  selectable={selectionMode ? peutSupprimer(s) : undefined}
                  selected={coches.has(s.id)}
                  onToggle={() => basculer(s.id)}
                />
              </li>
            ))}
          </ul>
        )}
        {/* ── Confirmation : elle NOMME ce qui va disparaître (D3) ── */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("setlists.list.deleteSelectedTitle", { count: selection.length })}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {selection.slice(0, 8).map((s) => (
                      <li key={s.id}>
                        {s.title}
                        {" · "}
                        <span className="capitalize">{formatDate(s.date, i18n.language)}</span>
                      </li>
                    ))}
                  </ul>
                  {selection.length > 8 && (
                    <p className="mt-1">
                      {t("setlists.list.deleteMore", { count: selection.length - 8 })}
                    </p>
                  )}
                  <p className="mt-2">{t("setlists.list.deleteSelectedBody")}</p>
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
                {enCours ? "…" : t("setlists.detail.deleteYes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <GuideLien section="setlists" />
      </div>
    </div>
  );
}
