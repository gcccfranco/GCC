"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Search, X } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { SetlistCard } from "@/components/setlists/SetlistCard";
import { duplicateSetlist, getMySetlists, getSetlists, type FSSetlist } from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { canDuplicateSetlist, canSeeSetlist } from "@/lib/access";
import { todayIso } from "@/lib/scene/dimanches";

// « Repartir d'une setlist passée » (lot U5 bis, Q14) : les setlists passées
// que la personne voit et peut dupliquer, la plus récente d'abord. « Reprendre »
// est la duplication d'aujourd'hui (copie privée, mêmes date, présidence et
// catégorie), ouverte dans « Modifier ».

export function SetlistsPassees() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile } = useProfile();
  const [setlists, setSetlists] = useState<FSSetlist[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!user) return;
    let annule = false;
    // Partagées + mes privées (getSetlists ne rend ni privées ni brouillons).
    Promise.all([getSetlists(), getMySetlists(user.uid)])
      .then(([partagees, privees]) => {
        if (!annule) setSetlists([...new Map([...partagees, ...privees].map((s) => [s.id, s])).values()]);
      })
      .catch(() => {
        if (!annule) setSetlists([]);
      });
    return () => {
      annule = true;
    };
  }, [user]);

  const passees = useMemo(() => {
    if (!user || !setlists) return [];
    const aujourdhui = todayIso();
    return setlists
      .filter((s) => s.date < aujourdhui && canSeeSetlist(user, profile, s) && canDuplicateSetlist(user, profile, s))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [setlists, user, profile]);

  const affichees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return passees;
    return passees.filter(
      (s) => s.title.toLowerCase().includes(q) || (s.leader ?? "").toLowerCase().includes(q) || s.date.includes(q),
    );
  }, [passees, recherche]);

  async function reprendre(s: FSSetlist) {
    if (!user) return;
    setEnCours(s.id);
    setErreur(false);
    try {
      const id = await duplicateSetlist(s, user.uid, `${s.title} ${t("setlists.detail.duplicateCopySuffix")}`);
      router.push(`/setlists/${id}/edit`);
    } catch {
      setEnCours(null);
      setErreur(true);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pt-3 pb-28 lg:px-8 lg:pt-6">
        <Link
          href="/setlists/new"
          className="mb-2 inline-flex min-h-11 items-center gap-1 text-[15px] text-muted-foreground hover:text-foreground active:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t("setlists.form.titleNew")}
        </Link>
        <PageTitle title={t("setlists.entree.passee")} subtitle={t("setlists.entree.passeeHint")} />

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            enterKeyHint="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={t("setlists.entree.passeesRecherche")}
            aria-label={t("setlists.entree.passeesRecherche")}
            className="raised w-full rounded-full border border-transparent py-2.5 pl-9 pr-9 text-[16px] text-foreground placeholder:text-muted-foreground/60 focus:border-ring/50 focus:outline-none focus:ring-[3px] focus:ring-ring/10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche("")}
              aria-label={t("common.buttons.reset")}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {erreur && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {t("setlists.entree.reprendreErreur")}
          </p>
        )}

        {setlists === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : affichees.length === 0 ? (
          <p role="status" className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            {t(recherche.trim() ? "setlists.entree.aucunePasseeRecherche" : "setlists.entree.aucunePassee")}
          </p>
        ) : (
          <ul aria-label={t("setlists.entree.passee")}>
            {affichees.map((s) => (
              <li key={s.id} className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <SetlistCard setlist={s} />
                </div>
                <button
                  type="button"
                  onClick={() => void reprendre(s)}
                  disabled={enCours !== null}
                  aria-label={t("setlists.entree.reprendreLabel", { title: s.title })}
                  className="h-9 shrink-0 rounded-full bg-secondary px-4 text-sm font-semibold text-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[.97] disabled:opacity-50"
                >
                  {enCours === s.id ? "…" : t("setlists.entree.reprendre")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
