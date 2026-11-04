"use client";

// Planning › Sans compte (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 1106) : les noms
// des plannings liés à aucun compte. Admins seuls (lecture de tous les profils).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { listProfiles } from "@/lib/firebase/users";
import { listGroupes } from "@/lib/firebase/groupes";
import { libellePoste, nomsSansCompte, titulairesSansCompte, type TitulaireSansCompte } from "@/lib/groupes/personnes";
import { ChampRecherche } from "@/components/layout/ChampRecherche";
import { groupeDef } from "@/lib/groupes/table";
import { categoryColor } from "@/lib/serviceColors";
import { BACK_OFFICE } from "@/lib/backOffice";
import { loadPlanningData, collectPlanningNames, normalizeName, type PlanningData } from "@/lib/planning/names";
import type { UserProfile } from "@/types/user";


/** Le repère d'initiale d'un nom (bo-equipes-12) : sa lettre, accents pliés (« Élise » sous E) ; « 中文 » pour un nom en caractères
 *  chinois ; « # » pour un chiffre ou une marque. */
const REPERE_ZH = "中文";
export function repereInitiale(nom: string): string {
  const c = nom.trim().normalize("NFD").replace(/\p{M}/gu, "").charAt(0);
  if (/\p{Script=Han}/u.test(c)) return REPERE_ZH;
  return /[A-Za-z]/.test(c) ? c.toUpperCase() : "#";
}

/** Les noms rangés par repère : A à Z, puis « 中文 », puis « # » ; dans chaque repère, l'ordre alphabétique français. */
export function nomsParRepere(noms: readonly string[]): { repere: string; noms: string[] }[] {
  const parRepere = new Map<string, string[]>();
  for (const n of [...noms].sort((a, b) => a.localeCompare(b, "fr"))) {
    const r = repereInitiale(n);
    parRepere.set(r, [...(parRepere.get(r) ?? []), n]);
  }
  const rang = (r: string) => (r === "#" ? 2 : r === REPERE_ZH ? 1 : 0);
  return [...parRepere.entries()]
    .sort(([a], [b]) => rang(a) - rang(b) || a.localeCompare(b, "fr"))
    .map(([repere, liste]) => ({ repere, noms: liste }));
}

/** `onCompte` : nombre de noms sans compte (pastille de l'onglet). `titreDePage` : la carte porte
 *  le titre de la page (BO-G, 7 : un seul titre, avec le compte) ; sinon « Planning sans compte (N) ». */
export function SansCompte({ onCompte, titreDePage = false }: { onCompte?: (n: number) => void; titreDePage?: boolean }) {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  // Titulaires écrits sans compte dans les organigrammes (OG32, interrupteur ouvert) ; échec de lecture : le bloc se tait.
  const [titulaires, setTitulaires] = useState<TitulaireSansCompte[]>([]);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    if (BACK_OFFICE) listGroupes().then((l) => setTitulaires(titulairesSansCompte(l.map((x) => x.groupe)))).catch(() => setTitulaires([]));
    listProfiles().then(setProfiles);
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, []);

  // Noms présents dans les plannings mais liés à aucun compte (planningName) : ces personnes échappent aux rappels et aux
  // notifs « setlist prête » (ciblage par nom de planning, cf. src/lib/push/recipients.ts). Visibilité pour l'admin.
  const unlinkedNames = useMemo(
    () => nomsSansCompte(planningNames, profiles, titulaires),
    [planningNames, profiles, titulaires],
  );
  const filtres = useMemo(() => {
    const q = normalizeName(recherche.trim());
    return q ? unlinkedNames.filter((n) => normalizeName(n).includes(q)) : unlinkedNames;
  }, [unlinkedNames, recherche]);

  useEffect(() => {
    onCompte?.(unlinkedNames.length);
  }, [onCompte, unlinkedNames.length]);

  return (
    <div className="space-y-4">
    <div className="carte-groupe p-5 space-y-3">
      <h2 id={titreDePage ? "personnes-sans-compte" : undefined} className={titreDePage ? "text-[17px] font-semibold text-foreground" : "text-sm font-semibold text-muted-foreground"}>
        {titreDePage ? t("backOffice.equipe.sansCompteAvecCompte", { count: unlinkedNames.length }) : t("admin.sansCompte.titre", { count: unlinkedNames.length })}
      </h2>
      <p className={titreDePage ? "text-[13px] leading-[18px] text-muted-foreground" : "text-xs text-muted-foreground"}>
        {titreDePage ? t("backOffice.equipe.sansCompteAide") : t("admin.sansCompte.aide")}
      </p>
      {planningData == null ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : unlinkedNames.length === 0 ? (
        <p className="text-sm text-foreground">
          {t("admin.sansCompte.tous")}
        </p>
      ) : titreDePage ? (
        <div className="space-y-3">
          <ChampRecherche value={recherche} onChange={setRecherche} placeholder={t("admin.sansCompte.chercher")} label={t("admin.sansCompte.chercher")} />
          <p role="status" data-testid="sans-compte-nombre" className="text-[13px] leading-[18px] text-muted-foreground">
            {recherche.trim()
              ? t("admin.sansCompte.filtres", { n: filtres.length, total: unlinkedNames.length })
              : t("admin.sansCompte.nombre", { count: unlinkedNames.length })}
          </p>
          {filtres.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">{t("admin.sansCompte.aucunNom")}</p>
          ) : (
            <div data-testid="sans-compte-liste" className="columns-[180px] gap-x-6">
              {nomsParRepere(filtres).map((g) => (
                <section key={g.repere} aria-label={g.repere} data-repere={g.repere} className="break-inside-avoid pb-3">
                  <h3 className="text-[13px] font-semibold leading-[18px] text-muted-foreground">{g.repere}</h3>
                  <ul>
                    {g.noms.map((n) => <li key={n} className="py-0.5 text-[15px] leading-[21px] text-foreground">{n}</li>)}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {unlinkedNames.map((n) => (
            <span
              key={n}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            >
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
    {BACK_OFFICE && <TitulairesSansCompte lignes={titulaires} />}
    </div>
  );
}

/** Les noms écrits sans compte dans un organigramme : nom · groupe · rôles, chaque ligne mène à l'organigramme du groupe. */
function TitulairesSansCompte({ lignes }: { lignes: TitulaireSansCompte[] }) {
  const { t, i18n } = useTranslation();
  if (lignes.length === 0) return null;
  const titre = `${t("groupes.personnes.sansCompteTitre")} (${lignes.length})`;
  return (
    <section aria-label={titre} className="carte-groupe p-5 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{titre}</h2>
      <p className="text-xs text-muted-foreground">{t("groupes.personnes.sansCompteAide")}</p>
      <ul className="divide-y divide-border">
        {lignes.map((l) => {
          const def = groupeDef(l.groupe)!;
          return (
            <li key={`${l.groupe}-${l.nom}`}>
              <Link href={`/back-office/equipes?groupe=${l.groupe}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm hover:bg-secondary/60">
                <span className="font-semibold text-foreground">{l.nom}</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: categoryColor(def.categorie) }} />
                  {t(`categories.${def.categorie}`)}
                </span>
                <span className="text-muted-foreground">{l.postes.map((x) => libellePoste(t, i18n.language === "zh-CN", x)).join(", ")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
