"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import { SetlistForm } from "@/components/setlists/SetlistForm";
import { useProfile } from "@/lib/firebase/users";
import { creatableCategories, isAdminUser } from "@/lib/access";
import { ALL_CATEGORIES } from "@/lib/firebase/setlists";
import { lirePreremplissage } from "@/lib/setlist/prochainsServices";
import { PourQuelService } from "./PourQuelService";
import { SetlistsPassees } from "./SetlistsPassees";

// `/setlists/new` (lot U5 bis, docs/spec-editeur-setlist.md, « Modèle ») :
// sans paramètre, « Pour quel service ? » ; `?cat=…&date=…(&moment=…)`,
// l'éditeur prérempli ; `?autre=1`, l'éditeur vide ; `?depuis=passee`, les
// setlists passées à reprendre.
export function CreateSetlistClient() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const { user, profile, loading } = useProfile();
  const [songs, setSongs] = useState<SongIndexEntry[]>([]);
  const admin = isAdminUser(user);
  // Catégories que l'éditeur accepte (admins : toutes), et celles du profil,
  // seules proposées par « Pour quel service ? » (question ouverte 2).
  const permises = useMemo(
    () => (admin ? [...ALL_CATEGORIES] : profile ? creatableCategories(profile) : []),
    [admin, profile],
  );
  const categoriesDuProfil = useMemo(() => (profile ? creatableCategories(profile) : []), [profile]);

  useEffect(() => {
    fetch("/songs-index.json")
      .then((r) => r.json())
      .then((data) => setSongs(data.songs ?? []));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.list.loginRequired")}</p>
        <Link href="/login?from=/setlists/new" className="text-sm text-foreground hover:underline">
          {t("common.header.login")}
        </Link>
      </div>
    );
  }

  if (!profile && !isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.list.profileRequired")}</p>
        <Link href="/profil" className="text-sm text-foreground hover:underline">
          {t("common.header.profile")}
        </Link>
      </div>
    );
  }

  if (params.get("depuis") === "passee") return <SetlistsPassees />;
  if (params.get("autre") === "1" || params.has("cat") || params.has("date")) {
    return (
      <SetlistForm
        key={params.toString()}
        mode="create"
        songs={songs}
        prefill={lirePreremplissage(params, permises)}
      />
    );
  }
  return <PourQuelService categories={categoriesDuProfil} />;
}
