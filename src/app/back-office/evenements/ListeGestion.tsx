"use client";

// Listes de Back-Office › Évènements (lot U6, B3) : « Évènements », ceux qu'on gère
// (organisateur, coordination), réunions à part ; « Réunions », celles de ses pôles et
// équipes (toutes pour un admin). Lignes compactes du calendrier, vers la fiche de gestion ;
// à venir (et infos) d'abord, passés derrière un bouton.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { canEditEvenement, creatableEvenementPours, estDeLaReunion, estReunion } from "@/lib/access";
import { listEvenements } from "@/lib/firebase/evenements";
import { byDate, isInfo, isPast } from "@/lib/evenements/agenda";
import { todayIso } from "@/lib/scene/dimanches";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import type { Evenement } from "@/types/evenement";
import { EvenementCard } from "@/app/evenements/EvenementCard";
import { Button } from "@/components/ui/button";
import { AnnonceBascule } from "@/components/evenements/AnnonceBascule";

export function ListeGestion({ reunions }: { reunions: boolean }) {
  const { t } = useTranslation();
  const { user, profile, loading } = useProfile();
  const [evenements, setEvenements] = useState<Evenement[] | null>(null);
  const [passesVus, setPassesVus] = useState(false);

  useEffect(() => {
    if (!user) return;
    listEvenements(false).then(setEvenements).catch(() => setEvenements([]));
  }, [user]);

  const miens = useMemo(
    () => (evenements ?? []).filter((e) =>
      reunions ? estReunion(e.pour) && estDeLaReunion(user, profile, e) : !estReunion(e.pour) && canEditEvenement(user, profile, e)),
    [evenements, reunions, user, profile],
  );

  if (loading || evenements === null) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  const today = todayIso();
  const aVenir = miens.filter((e) => isInfo(e) || !isPast(e, today)).sort(byDate);
  const passes = miens.filter((e) => !isInfo(e) && isPast(e, today)).sort((a, b) => b.date.localeCompare(a.date));
  const peutCreer = creatableEvenementPours(user, profile, ANNONCE_SECTIONS).some((p) => estReunion(p) === reunions);
  const ligne = (e: Evenement, passe = false) => (
    <EvenementCard key={e.id} evenement={e} past={passe} href={`/back-office/evenements/${e.id}`} />
  );

  return (
    <div className="max-w-2xl space-y-5">
      {/* U9 (Q7 b) : où se créent les évènements, jusqu'au 31/01/2027 ; pas pour les réunions. */}
      {!reunions && <AnnonceBascule />}
      {peutCreer && (
        <Button asChild>
          <Link href={reunions ? "/back-office/evenements/nouveau?reunion=1" : "/back-office/evenements/nouveau"}>
            {t(reunions ? "backOffice.nouvelleReunion" : "evenements.nouveau")}
          </Link>
        </Button>
      )}
      {aVenir.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(reunions ? "backOffice.aucuneReunion" : "backOffice.aucunEvenement")}</p>
      ) : (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">{t("backOffice.aVenir")}</h2>
          {aVenir.map((e) => ligne(e))}
        </section>
      )}
      {passes.length > 0 && (
        <section className="space-y-2">
          <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => setPassesVus(!passesVus)}>
            {passesVus ? t("evenements.hidePast") : t("evenements.past")} ({passes.length})
          </button>
          {passesVus && passes.map((e) => ligne(e, true))}
        </section>
      )}
    </div>
  );
}
