"use client";

// Planning › Sans compte (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 1106) : les noms
// des plannings liés à aucun compte. Admins seuls (lecture de tous les profils).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { listProfiles } from "@/lib/firebase/users";
import { listGroupes } from "@/lib/firebase/groupes";
import { libellePoste } from "./Personnes";
import { titulairesSansCompte, type TitulaireSansCompte } from "@/lib/groupes/personnes";
import { groupeDef } from "@/lib/groupes/table";
import { categoryColor } from "@/lib/serviceColors";
import { BACK_OFFICE } from "@/lib/backOffice";
import { loadPlanningData, collectPlanningNames, normalizeName, type PlanningData } from "@/lib/planning/names";
import type { UserProfile } from "@/types/user";

/** `onCompte` : nombre de noms sans compte (pastille de l'onglet). */
export function SansCompte({ onCompte }: { onCompte?: (n: number) => void }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  // Titulaires écrits sans compte dans les organigrammes (OG32, interrupteur ouvert) ; échec de lecture : le bloc se tait.
  const [titulaires, setTitulaires] = useState<TitulaireSansCompte[]>([]);

  useEffect(() => {
    if (BACK_OFFICE) listGroupes().then((l) => setTitulaires(titulairesSansCompte(l.map((x) => x.groupe)))).catch(() => setTitulaires([]));
    listProfiles().then(setProfiles);
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, []);

  // Noms présents dans les plannings mais liés à aucun compte (planningName) :
  // ces personnes échappent aux rappels et aux notifs « setlist prête » (ciblage
  // par nom de planning, cf. src/lib/push/recipients.ts). Visibilité pour l'admin.
  const unlinkedNames = useMemo(() => {
    const linked = new Set(
      profiles.map((p) => normalizeName(p.planningName.trim())).filter(Boolean)
    );
    // OG32 : un nom aussi écrit dans un organigramme n'est compté qu'une fois : il reste dans « Titulaires sans compte ».
    const titulairesNoms = new Set(titulaires.map((l) => normalizeName(l.nom)));
    return planningNames.filter((n) => !linked.has(normalizeName(n.trim())) && !titulairesNoms.has(normalizeName(n.trim())));
  }, [planningNames, profiles, titulaires]);

  useEffect(() => {
    onCompte?.(unlinkedNames.length);
  }, [onCompte, unlinkedNames.length]);

  return (
    <div className="space-y-4">
    <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Planning sans compte ({unlinkedNames.length})
      </h2>
      <p className="text-xs text-muted-foreground">
        Ces noms apparaissent dans les plannings mais ne sont liés à aucun compte —
        ces personnes ne reçoivent ni rappels ni notification « setlist prête ».
      </p>
      {planningData == null ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : unlinkedNames.length === 0 ? (
        <p className="text-sm text-foreground">
          ✅ Tous les noms du planning sont liés à un compte.
        </p>
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
    <section aria-label={titre} className="rounded-xl bg-card shadow-soft p-5 space-y-3">
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
