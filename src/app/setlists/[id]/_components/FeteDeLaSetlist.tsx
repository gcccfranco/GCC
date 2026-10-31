"use client";

// Ce que la page d'une setlist de fête ajoute (docs/spec-chants-fetes.md, CF14) : le repère « ● Noël · jeudi 24
// décembre · passage 3 », le sous-titre « Lumière dans la nuit · saisie par Ruth K. · Page de Noël 2026 », la carte
// « Musiques et danses — pour la régie » (en lecture) et « L'ordre de passage ». Lus dans le programme et dans les
// setlists de l'édition ; rien n'est recopié.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { categoryColor } from "@/lib/serviceColors";
import { getProgramme } from "@/lib/firebase/programmes";
import { getSetlistsDeFete, type FSSetlist } from "@/lib/firebase/setlists";
import { feteDe, libelleEdition, anneeDe } from "@/lib/scene/fetes";
import { jourEnLettres } from "@/app/evenements/scene/libelles";
import { libelleQui } from "@/lib/fetes/qui";
import type { Passage, Programme } from "@/types/programme";

interface PassageDeLaSetlist {
  programme: Programme;
  setlists: FSSetlist[];
  index: number;
  fete: string;
  titreFete: string;
}

/** Le programme et les setlists de l'édition d'une setlist de fête ; `null` tant qu'ils ne sont pas lus. */
export function usePassageDeLaSetlist(setlist: FSSetlist | null): PassageDeLaSetlist | null {
  const { i18n } = useTranslation();
  const [lu, setLu] = useState<{ programme: Programme; setlists: FSSetlist[] } | null>(null);
  const edition = setlist?.fete?.programme;
  useEffect(() => {
    if (!edition) return;
    let vivant = true;
    void Promise.all([getProgramme(edition), getSetlistsDeFete(edition)]).then(([programme, setlists]) => {
      if (vivant && programme) setLu({ programme, setlists });
    }).catch(() => {});
    return () => { vivant = false; };
  }, [edition]);
  if (!setlist?.fete || !lu || lu.programme.id !== edition) return null;
  const fete = feteDe(lu.programme);
  const annee = anneeDe(lu.programme);
  if (!fete || annee === null) return null;
  return {
    ...lu,
    index: lu.programme.passages.findIndex((p) => p.id === setlist.fete!.passage),
    fete,
    titreFete: libelleEdition(fete, annee, i18n.language === "zh-CN" ? "zh" : "fr"),
  };
}

/** « ● Noël · jeudi 24 décembre · passage 3 » : à la place de « catégorie · date ». */
export function RepereFete({ setlist, passage }: { setlist: FSSetlist; passage: PassageDeLaSetlist | null }) {
  const { t, i18n } = useTranslation();
  const couleur = categoryColor(setlist.category);
  const numero = passage && passage.index >= 0 ? t("setlists.fete.passageN", { n: passage.index + 1 }) : null;
  return (
    <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: couleur }}>
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: couleur }} />
      {[t("categories." + setlist.category, { defaultValue: setlist.category }), jourEnLettres(setlist.date, i18n.language), numero].filter(Boolean).join(" · ")}
    </p>
  );
}

/** « Lumière dans la nuit · saisie par Ruth K. · Page de Noël 2026 ». */
export function SousTitreFete({ setlist, passage }: { setlist: FSSetlist; passage: PassageDeLaSetlist | null }) {
  const { t } = useTranslation();
  const titre = passage && passage.index >= 0 ? passage.programme.passages[passage.index].titre : "";
  return (
    <p className="mt-0.5 text-[13px] text-muted-foreground">
      {titre && <>{titre} · </>}
      {setlist.leader && <>{t("setlists.fete.saisiePar", { nom: setlist.leader })} · </>}
      {passage && <Link href={`/evenements/scene/${passage.fete}`} className="underline underline-offset-2 hover:text-foreground">{t("setlists.fete.pageDe", { fete: passage.titreFete })}</Link>}
    </p>
  );
}

/** Les deux cartes sous la liste : musiques et danses du passage, ordre de passage. */
export function CartesFete({ passage }: { passage: PassageDeLaSetlist }) {
  const { t, i18n } = useTranslation();
  const langue = i18n.language === "zh-CN" ? "zh" : "fr";
  const quiDe = (p: Passage) => p.qui.map((q) => libelleQui(q, langue)).join(" · ");
  const { programme, setlists, index } = passage;
  if (index < 0) return null;
  const courant = programme.passages[index];
  const medias = courant.medias ?? [];
  const setlistDe = (id: string | undefined) => setlists.find((s) => id && s.fete?.passage === id && true);
  const voisin = (i: number) => {
    const p = programme.passages[i];
    return p ? { p, i, setlist: setlistDe(p.id) } : null;
  };
  const rangees = [voisin(index - 1), { p: courant, i: index, setlist: undefined }, voisin(index + 1)].filter((x) => x !== null);
  const carte = "rounded-2xl border border-border bg-card p-4";
  const titreCarte = "text-[15px] font-semibold text-foreground";
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 print:hidden">
      <section aria-labelledby="fete-medias" className={carte}>
        <h2 id="fete-medias" className={titreCarte}>
          {t("setlists.fete.musiquesEtDanses")} <span className="font-normal text-muted-foreground">— {t("setlists.fete.pourLaRegie")}</span>
        </h2>
        {medias.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("setlists.fete.aucune")}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {medias.map((m) => (
              <li key={m.id} className="text-sm">
                <span aria-hidden>▷</span> {t(`planning.fete.media.${m.type}`)} ·{" "}
                {m.lien ? <a href={m.lien} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{m.titre}</a> : m.titre}
                {[m.duree, m.depart && t("planning.fete.departA", { temps: m.depart })].filter(Boolean).map((x) => ` · ${x}`).join("")}
                {m.note && <span className="block text-[13px] italic text-muted-foreground">{t("planning.fete.regie", { note: m.note })}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="fete-ordre" className={carte}>
        <h2 id="fete-ordre" className={titreCarte}>{t("setlists.fete.ordre")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("setlists.fete.iSurN", { i: index + 1, n: programme.passages.length })}</p>
        {/* Téléphone : deux boutons ; en grand : le passage d'avant, celui-ci, celui d'après. */}
        <ol className="mt-2 hidden space-y-1 md:block">
          {rangees.map((v) => (
            <li key={v.i} className={`text-sm ${v.i === index ? "font-semibold text-foreground" : "text-muted-foreground"}`} aria-current={v.i === index ? "step" : undefined}>
              {v.setlist ? <Link href={`/setlists/${v.setlist.id}`} className="underline underline-offset-2 hover:text-foreground">{v.i + 1}. {v.p.titre}</Link> : <>{v.i + 1}. {v.p.titre}</>}
              <span className="block text-[12px] font-normal text-muted-foreground">{quiDe(v.p)}</span>
            </li>
          ))}
        </ol>
        <nav aria-label={t("setlists.fete.dansLOrdre")} className="mt-2 flex gap-2 md:hidden">
          {[voisin(index - 1), voisin(index + 1)].map((v, k) => {
            if (!v) return <span key={k} className="flex-1" />;
            const texte = k === 0 ? `‹ ${t("setlists.fete.passageVoisin", { i: v.i + 1, qui: quiDe(v.p) })}` : `${t("setlists.fete.passageVoisin", { i: v.i + 1, qui: quiDe(v.p) })} ›`;
            const classe = "flex min-h-11 flex-1 items-center justify-center rounded-full bg-secondary px-3 text-center text-sm font-semibold text-foreground";
            return v.setlist ? <Link key={k} href={`/setlists/${v.setlist.id}`} className={classe}>{texte}</Link> : <span key={k} className={`${classe} opacity-60`}>{texte}</span>;
          })}
        </nav>
      </section>
    </div>
  );
}
