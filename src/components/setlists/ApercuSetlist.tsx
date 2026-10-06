"use client";

// Aperçu d'une setlist, à droite de la liste en grand (lot U4 bis, B2, docs/spec-pages-en-grand.md,
// Q4 ; planches `setlists-ordinateur`, `setlists-ipad-paysage`). Ce n'est pas la page de la
// setlist : catégorie et date, présidence, « Présentation », thème (les notes de la setlist),
// « Modifiée par… », les chants (structure, tonalité, « orig. », notes) et l'équipe du service
// d'après le planning, avec « Ouvrir » (la setlist en deux volets de U5) et « Mode louange ».
// Toucher un chant ouvre la setlist aux partitions de ce chant (U5, Q9).

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ListMusic, Play, Presentation } from "lucide-react";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { PlanningData } from "@/lib/planning/names";
import type { SongIndexEntry } from "@/types/song";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { serviceButtonFill } from "@/lib/serviceButton";
import { formatDate } from "@/lib/utils/formatDate";
import { parsePresentationUrl } from "@/lib/setlist/presentationLink";
import { equipeDuService } from "@/lib/setlist/equipeDuService";
import { getJianpuPref } from "@/lib/jianpu/preference";
import { ListView } from "@/app/setlists/[id]/_components/ListView";
import { SetlistHistory } from "@/app/setlists/[id]/_components/SetlistHistory";
import { CarteEquipe } from "@/components/setlists/CarteEquipe";

export function ApercuSetlist({
  setlist,
  songsMap,
  planning,
  monNom,
}: {
  setlist: FSSetlist;
  songsMap: Record<string, SongIndexEntry>;
  /** Le planning lu par la liste (filtre « Mes services ») ; `null` tant qu'il n'est pas lu. */
  planning: PlanningData | null;
  monNom: string;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const couleur = categoryColor(setlist.category);
  const presentation = setlist.presentationUrl ? parsePresentationUrl(setlist.presentationUrl) : null;
  const chants = setlist.items.filter((i) => i.type !== "transition").length;
  const equipe = useMemo(() => (planning ? equipeDuService(planning, setlist) : []), [planning, setlist]);
  const lien = `/setlists/${setlist.id}`;

  return (
    <section aria-label={t("setlists.apercu.region")} className="apercu-setlist space-y-5 px-6 pb-10 pt-6">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-72">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: couleur }} />
            <span className="svc-ink" style={{ "--svc": couleur } as React.CSSProperties}>
              {i18n.language === "zh-CN" ? t("categories." + setlist.category, { defaultValue: setlist.category }) : categoryLabel(setlist.category)}
              {" · "}{formatDate(setlist.date, i18n.language)}
            </span>
          </p>
          <h2 className="mt-1 text-[28px] font-bold leading-tight tracking-tight text-foreground text-balance">{setlist.title}</h2>
          {(setlist.leader || presentation) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              {setlist.leader && <span>{t("planning.accueil.presidence", { nom: setlist.leader })}</span>}
              {setlist.leader && presentation && <span aria-hidden>·</span>}
              {presentation && (
                <a href={presentation} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-2">
                  <Presentation className="h-3.5 w-3.5" aria-hidden />
                  {t("setlists.detail.presentation")}
                </a>
              )}
            </p>
          )}
          {setlist.notes && <p className="mt-2 whitespace-pre-wrap text-sm italic text-foreground">{setlist.notes}</p>}
          <SetlistHistory key={setlist.id} setlistId={setlist.id} songsMap={songsMap} />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={lien} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-semibold text-foreground transition-transform duration-150 active:scale-[.97]">
            <ListMusic className="h-4 w-4" aria-hidden />
            {t("planning.accueil.ouvrir")}
          </Link>
          <Link
            href={`${lien}?louange=1`}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white transition-transform duration-150 active:scale-[.97]"
            style={{ background: serviceButtonFill(couleur) }}
          >
            <Play className="h-4 w-4" aria-hidden />
            {t("setlists.detail.performanceMode")}
          </Link>
        </div>
      </div>

      <div className="apercu-colonnes grid items-start gap-4">
        <article className="raised rounded-2xl px-5 pb-2 pt-4">
          <p className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
            <b className="text-base font-bold">{t("setlists.list.songCounter", { count: chants })}</b>
            <span className="text-xs text-muted-foreground">{t("setlists.apercu.tonalites")}</span>
          </p>
          <ListView
            items={setlist.items}
            songsMap={songsMap}
            jianpuPref={getJianpuPref()}
            current={null}
            lienBase={lien}
            onOpen={(position) => router.push(`${lien}?vue=partitions&chant=${position}`)}
          />
        </article>

        {equipe.length > 0 && <CarteEquipe equipe={equipe} monNom={monNom} />}
      </div>
    </section>
  );
}
