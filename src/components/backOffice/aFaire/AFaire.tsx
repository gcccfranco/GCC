"use client";

// L'écran « À faire » de /back-office (piste A, BO-B, docs/spec-back-office-piste-a.md BO6) : une seule liste, une action
// par ligne, la plus urgente en premier, en quatre groupes ; le filtre « Tout · Mes équipes » ; rien à faire = une phrase.
// Sur grand écran (barre latérale affichée), « Ce dimanche » et « Prochaine réunion » à droite.
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Drama } from "lucide-react";
import { LargeurBO } from "@/components/backOffice/LargeurBO";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { EtatVide } from "@/components/layout/EtatVide";
import { useBarreMontree } from "@/components/layout/BarreLaterale";
import { Pilules } from "@/components/layout/Onglets";
import { equipesDe, isCoordination } from "@/lib/access";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { useProfile } from "@/lib/firebase/users";
import { PLANNING_COLORS } from "@/lib/serviceColors";
import { todayIso } from "@/lib/scene/dimanches";
import { filtrer, type Filtre } from "@/lib/tableauDeBord/aFaire";
import { lireAFaire, useLecture } from "@/lib/tableauDeBord/lecture";
import { ColonneDroite } from "./ColonneDroite";
import { RangeeAFaire } from "./RangeeAFaire";
import { jourComplet } from "./texte";
import { Squelette } from "@/components/layout/Squelette";

export function AFaire({ titre }: { titre: string }) {
  const { t, i18n } = useTranslation();
  const { user, profile, loading } = useProfile();
  const montree = useBarreMontree();
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const today = todayIso();
  // Le profil se lit après le premier rendu : sans lui les droits seraient ceux d'un inconnu (et la lecture, gardée, le resterait).
  const { valeur, erreur } = useLecture(
    () => (loading ? new Promise<never>(() => {})
      : user ? lireAFaire(user, profile, today, nowIsoParis()) : Promise.reject(new Error("pas de compte"))),
    `${user?.uid ?? ""}|${today}|${loading}`,
  );

  const choix = (
    <Pilules<Filtre>
      etiquette={t("backOffice.aFaire.filtreAria")} obligatoire valeur={filtre} choisir={(v) => v && setFiltre(v)}
      options={[
        { cle: "tout", nom: t("backOffice.aFaire.filtre.tout") },
        { cle: "mesEquipes", nom: t("backOffice.aFaire.filtre.mesEquipes") },
      ]}
    />
  );
  const resultat = valeur ? filtrer(valeur.resultat, filtre, equipesDe(profile)) : null;
  const incomplet = erreur || !!valeur?.incomplet;

  return (
    <LargeurBO>
      <EnTetePage
        titre={titre}
        sousTitre={t("backOffice.aFaire.sousTitre", { jour: jourComplet(today, i18n.language) })}
        outils={<div className="hidden sm:block">{choix}</div>}
        apres={<div className="sm:hidden">{choix}</div>}
      />
      <div className={`px-[var(--marge-page)] pb-10 ${montree ? "grid grid-cols-[minmax(0,1fr)_300px] items-start gap-8" : ""}`}>
        <div>
          {incomplet && <p role="alert" className="mb-3 text-[13px] text-muted-foreground">{t("backOffice.aFaire.incomplet")}</p>}
          {!resultat ? (
            !erreur && <Squelette enTete={false} className="p-0" />
          ) : resultat.total === 0 ? (
            !incomplet && (
              <EtatVide role="status">{t(filtre === "mesEquipes" ? "backOffice.aFaire.videEquipes" : "backOffice.aFaire.vide")}</EtatVide>
            )
          ) : (
            <div className="space-y-6">
              {resultat.groupes.map((g) => (
                <section key={g.id} aria-labelledby={`a-faire-${g.id}`} data-testid={`groupe-${g.id}`}>
                  <h2 id={`a-faire-${g.id}`} className="mb-2 px-1 text-[13px] font-semibold text-muted-foreground">
                    {t(`backOffice.aFaire.groupe.${g.id}`)}
                  </h2>
                  <ul className="divide-y divide-border/60 overflow-hidden rounded-groupe bg-card">
                    {g.lignes.map((l) => <RangeeAFaire key={l.id} ligne={l} today={today} />)}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {/* SF-2 : la porte de la scène des fêtes là où la barre latérale n'existe pas (téléphone, tablette en portrait) ; compte-10 : après les groupes. */}
          {isCoordination(user, profile) && (
            <Link
              href="/back-office/evenements/scene" data-testid="carte-scene-des-fetes"
              className="hide-on-desktop mt-6 flex min-h-[44px] items-center gap-3 rounded-groupe bg-card px-4 py-3"
            >
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary" style={{ color: PLANNING_COLORS.scene }}>
                <Drama className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-balance break-words text-[15px] font-semibold text-foreground">{t("backOffice.aFaire.sceneDesFetes.titre")}</b>
                <span className="block text-balance break-words text-[13px] text-muted-foreground">{t("backOffice.aFaire.sceneDesFetes.sousTitre")}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          )}
        </div>
        {montree && <ColonneDroite />}
      </div>
    </LargeurBO>
  );
}
