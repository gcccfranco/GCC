"use client";

// Usage du site (docs/spec-comptage-usage.md, T4) : un tableau trié, sans graphique. Administrateurs seuls
// (même condition que la règle `usage/{mois}`). Totaux sur la période, pas de colonne par mois.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { peutLireUsage } from "@/lib/access";
import { calculerLignes, derniersMois, lireUsage, type LigneUsage, type MoisUsage } from "@/lib/usageLecture";
import { LargeurBO } from "@/components/backOffice/LargeurBO";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Pilules } from "@/components/layout/Onglets";
import { Squelette } from "@/components/layout/Squelette";
import { Pill, ReserveAuxAdmins } from "@/components/admin/commun";

type Periode = "3" | "6" | "12";

function Tableau({ lignes, testid }: { lignes: LigneUsage[]; testid: string }) {
  const { t } = useTranslation();
  const pct = (p: number) => `${(p * 100).toFixed(1).replace(".", ",")} %`;
  return (
    <div className="carte-groupe overflow-hidden">
      <table data-testid={testid} className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-semibold">{t("backOffice.usage.colFonction")}</th>
            <th scope="col" className="w-24 px-2 py-2 text-right font-semibold">{t("backOffice.usage.colJours")}</th>
            <th scope="col" className="hidden w-28 px-2 py-2 text-right font-semibold sm:table-cell">{t("backOffice.usage.colUtilisations")}</th>
            <th scope="col" className="w-16 px-3 py-2 text-right font-semibold">{t("backOffice.usage.colPart")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {lignes.map((l) => (
            <tr key={l.cle} data-testid="ligne-usage" data-cle={l.cle} data-candidate={l.candidate}>
              <td className="px-3 py-2 align-top">
                <span className="block break-words text-foreground">{l.libelle}</span>
                <span className="block break-all text-xs text-muted-foreground">{l.cle}</span>
                {l.candidate && <span className="mt-1 inline-block"><Pill label={t("backOffice.usage.candidate")} /></span>}
              </td>
              <td className="px-2 py-2 text-right align-top tabular-nums">{l.j}</td>
              <td className="hidden px-2 py-2 text-right align-top tabular-nums sm:table-cell">{l.n}</td>
              <td className="px-3 py-2 text-right align-top tabular-nums">{pct(l.part)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UsagePage() {
  const { t } = useTranslation();
  const { user, loading } = useProfile();
  const admin = peutLireUsage(user);
  const [periode, setPeriode] = useState<Periode>("3");
  const [donnees, setDonnees] = useState<{ periode: Periode; mois: (MoisUsage | null)[] } | "erreur" | null>(null);

  useEffect(() => {
    if (!admin) return;
    let actif = true;
    lireUsage(derniersMois(Number(periode)))
      .then((mois) => actif && setDonnees({ periode, mois }))
      .catch(() => actif && setDonnees("erreur"));
    return () => { actif = false; };
  }, [admin, periode]);

  if (loading) return <Squelette />;
  if (!admin) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/usage" />;

  const pret = donnees && donnees !== "erreur" && donnees.periode === periode ? donnees : null;
  const calcul = pret ? calculerLignes(pret.mois) : null;
  return (
    <LargeurBO>
      <EnTetePage
        titre={t("backOffice.usage.titre")}
        sousTitre={t("backOffice.usage.sousTitre")}
        apres={
          <Pilules<Periode>
            etiquette={t("backOffice.usage.periodeAria")} obligatoire valeur={periode} choisir={(v) => v && setPeriode(v)}
            options={(["3", "6", "12"] as const).map((n) => ({ cle: n, nom: t("backOffice.usage.periode", { n }) }))}
          />
        }
      />
      <div className="space-y-6 px-[var(--marge-page)] pb-10">
        {donnees === "erreur" ? (
          <p role="alert" className="text-sm text-muted-foreground">{t("backOffice.usage.erreur")}</p>
        ) : !calcul ? (
          <Squelette enTete={false} className="p-0" />
        ) : (
          <>
            <p className="text-sm text-muted-foreground" data-testid="usage-resume">
              <span data-testid="usage-total">{t("backOffice.usage.total", { total: calcul.total.toLocaleString("fr-FR") })}</span>
              {" · "}
              {t("backOffice.usage.moisLus", { lus: calcul.moisLus, demandes: pret!.mois.length })}
            </p>
            {calcul.total === 0 ? (
              <p data-testid="usage-vide" className="text-sm text-muted-foreground">{t("backOffice.usage.vide")}</p>
            ) : (
              <>
                <Tableau testid="tableau-usage" lignes={calcul.lignes.filter((l) => !l.exception)} />
                <section aria-labelledby="usage-exceptions">
                  <h2 id="usage-exceptions" className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{t("backOffice.usage.exceptions")}</h2>
                  <Tableau testid="tableau-usage-exceptions" lignes={calcul.lignes.filter((l) => l.exception)} />
                </section>
              </>
            )}
          </>
        )}
      </div>
    </LargeurBO>
  );
}
