"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSetlist, type FSSetlist } from "@/lib/firebase/setlists";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import { getProgramme } from "@/lib/firebase/programmes";
import { anneeDe, feteDe, libelleEdition } from "@/lib/scene/fetes";
import { resoudrePropositions } from "@/lib/setlist/propositions";
import { titreAffiche } from "@/lib/fetes/droits";
import { useProfile } from "@/lib/firebase/users";
import { canEditSetlist } from "@/lib/access";
import { useTranslation } from "react-i18next";
import type { SongIndexEntry } from "@/types/song";
import { buildFormItems } from "@/lib/setlist/formItems";
import { SetlistForm, type SetlistFormInitial } from "@/components/setlists/SetlistForm";
import type { ContexteFeteEditeur } from "@/components/setlists/editeur/EnTeteEditeur";
import type { Programme } from "@/types/programme";

export function EditSetlistClient() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const depuisFete = useSearchParams().get("depuis") === "fete";
  const id = params.id as string;
  const router = useRouter();
  const { user, profile, loading: authLoading } = useProfile();

  const [songs, setSongs] = useState<SongIndexEntry[]>([]);
  const [setlist, setSetlist] = useState<FSSetlist | null>(null);
  const [initial, setInitial] = useState<SetlistFormInitial | null>(null);
  const [programme, setProgramme] = useState<Programme | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      getSetlist(id),
      chargerIndexChants().then((songs) => ({ songs })),
    ]).then(async ([sl, indexData]) => {
      if (!sl) { router.push("/setlists"); return; }
      const songsMap: Record<string, SongIndexEntry> = {};
      for (const s of (indexData.songs ?? [])) songsMap[s.slug] = s;
      setSongs(indexData.songs ?? []);
      setSetlist(sl);
      setInitial({
        title: sl.title,
        date: sl.date,
        leader: sl.leader,
        category: sl.category,
        moment: sl.moment,
        notes: sl.notes,
        isPrivate: sl.isPrivate ?? false,
        ownerId: sl.ownerId ?? null,
        editeurs: sl.editeurs,
        fete: sl.fete,
        rolesPartage: sl.rolesPartage,
        // Une proposition dont le `.cho` est arrivé devient le chant (CF21) ; l'éditeur l'écrit ainsi.
        items: buildFormItems(resoudrePropositions(sl.items, indexData.songs ?? []), songsMap),
      });
      if (sl.fete) setProgramme(await getProgramme(sl.fete.programme).catch(() => null));
    });
  }, [id, router, authLoading, user]);

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.detail.loginRequired")}</p>
        <Link href={`/login?from=/setlists/${id}/edit`} className="text-sm text-foreground hover:underline">
          {t("common.header.login")}
        </Link>
      </div>
    );
  }

  if (!initial || !setlist || !user || (setlist.fete && programme === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  // Modification : créateur de la setlist + musiciens du même service
  if (!canEditSetlist(user, profile, setlist)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">{t("setlists.detail.noEditAccess")}</p>
        <Link href={`/setlists/${id}`} className="text-sm text-foreground hover:underline">
          {t("setlists.detail.back")}
        </Link>
      </div>
    );
  }

  const langue = i18n.language === "zh-CN" ? "zh" : "fr";
  const fete = programme && feteDe(programme);
  const annee = programme && anneeDe(programme);
  const passage = programme?.passages.findIndex((p) => p.id === setlist.fete?.passage) ?? -1;
  const contexteFete: ContexteFeteEditeur | undefined = setlist.fete && {
    titreFete: fete && annee ? libelleEdition(fete, annee, langue) : setlist.title,
    fete: fete ?? (setlist.category === "Pâques" ? "paques" : "noel"),
    categorie: setlist.category,
    jour: setlist.date,
    numero: passage >= 0 ? passage + 1 : null,
    titrePassage: passage >= 0 ? programme!.passages[passage].titre : "",
    titreAffiche: titreAffiche(setlist, langue),
    depuisFete,
  };

  return <SetlistForm mode="edit" setlistId={id} songs={songs} initial={initial} contexteFete={contexteFete} />;
}
