"use client";

import { useEffect, useState, useMemo } from "react";
import { ALL_CATEGORIES, getSetlists, getMySetlists, type FSSetlist } from "@/lib/firebase/setlists";
import { useAuth } from "@/lib/firebase/auth";
import { useTranslation } from "react-i18next";
import { Search, X, Plus } from "lucide-react";
import Link from "next/link";
import { SetlistCard } from "@/components/setlists/SetlistCard";
import { useSetlistsNavState } from "@/hooks/useSetlistsNavState";

type Tab = "shared" | "mine";

export default function SetlistsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [setlists, setSetlists] = useState<FSSetlist[]>([]);
  const [mySetlists, setMySetlists] = useState<FSSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("shared");
  const [query, setQuery] = useState("");
  const { categoryFilter, setCategoryFilter } = useSetlistsNavState();

  useEffect(() => {
    getSetlists()
      .then(setSetlists)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) { setMySetlists([]); return; }
    getMySetlists(user.uid).then(setMySetlists);
  }, [user]);

  const filtered = useMemo(() => {
    let list = categoryFilter === "Toutes"
      ? setlists
      : setlists.filter((s) => s.category === categoryFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.leader ?? "").toLowerCase().includes(q) ||
          s.date.includes(q)
      );
    }
    return list;
  }, [setlists, categoryFilter, query]);

  const filteredMine = useMemo(() => {
    if (!query.trim()) return mySetlists;
    const q = query.trim().toLowerCase();
    return mySetlists.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.leader ?? "").toLowerCase().includes(q) ||
        s.date.includes(q)
    );
  }, [mySetlists, query]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">

        {/* ── Onglets (connecté uniquement) ── */}
        {user && !authLoading && (
          <div className="flex rounded-xl border border-border overflow-hidden text-sm mb-5">
            <button
              onClick={() => setTab("shared")}
              className={`flex-1 px-4 py-2.5 font-medium transition-colors ${
                tab === "shared"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t("setlists.list.publicSetlists")}
            </button>
            <button
              onClick={() => setTab("mine")}
              className={`flex-1 px-4 py-2.5 font-medium transition-colors border-l border-border ${
                tab === "mine"
                  ? "bg-violet-600 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t("setlists.list.mySetlists")}
              {mySetlists.length > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  tab === "mine"
                    ? "bg-white/20 text-white"
                    : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                }`}>
                  {mySetlists.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── Barre de recherche ── */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par titre, leader, date…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Onglet Mes setlists ── */}
        {tab === "mine" && user && (
          <>
            <div className="flex justify-end mb-4">
              <Link
                href="/setlists/new"
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t("setlists.list.newButton")}
              </Link>
            </div>
            {filteredMine.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16 border border-dashed border-border rounded-xl">
                {query ? "Aucun résultat pour cette recherche." : t("setlists.list.emptyPrivate")}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredMine.map((s) => (
                  <SetlistCard key={s.id} setlist={s} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Onglet Setlists partagées ── */}
        {tab === "shared" && (
          <>
            {/* Filtre catégorie + bouton Nouvelle */}
            <div className="flex items-center gap-2 mb-5">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="Toutes">{t("setlists.list.allCategories")}</option>
                <optgroup label="Réunions principales">
                  {ALL_CATEGORIES.slice(0, 4).map((cat) => (
                    <option key={cat} value={cat}>
                      {t("categories." + cat, { defaultValue: cat })}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Groupes">
                  {ALL_CATEGORIES.slice(4).map((cat) => (
                    <option key={cat} value={cat}>
                      {t("categories." + cat, { defaultValue: cat })}
                    </option>
                  ))}
                </optgroup>
              </select>

              <Link
                href="/setlists/new"
                className="shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("setlists.list.newButton")}</span>
              </Link>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground text-center py-16">
                {t("common.loading")}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-16">
                {query
                  ? "Aucun résultat pour cette recherche."
                  : setlists.length === 0
                  ? t("setlists.list.empty")
                  : t("setlists.list.emptyCategory")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((s) => (
                  <SetlistCard key={s.id} setlist={s} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
