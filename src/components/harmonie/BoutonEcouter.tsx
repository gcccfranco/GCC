"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ecouteDisponible, jouer, planAvantApres, planDeLecture } from "@/lib/audio/synthese";

type Props = ({ accords: string[] } | { avant: string[]; apres: string[] }) & { className?: string; /** Icône seule, `aria-label` « Écouter A → C# ». */ compact?: boolean };

const sansAbonnement = () => () => {};

export function BoutonEcouter(props: Props) {
  const { t } = useTranslation();
  // Faux au serveur et à l'hydratation, lu ensuite dans le navigateur.
  const dispo = useSyncExternalStore(sansAbonnement, ecouteDisponible, () => false);
  const [enLecture, setEnLecture] = useState(false);
  const arret = useRef<(() => void) | null>(null);
  const cle = "accords" in props ? props.accords.join("|") : props.avant.join("|") + "\n" + props.apres.join("|");
  const plan = useMemo(() => {
    const [avant, apres] = cle.split("\n");
    return "accords" in props ? planDeLecture(cle.split("|")) : planAvantApres(avant.split("|"), apres.split("|"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  useEffect(() => () => arret.current?.(), []);
  if (!dispo) return null;

  const basculer = () => {
    if (enLecture) {
      arret.current?.();
      return;
    }
    arret.current = jouer(plan, () => setEnLecture(false));
    setEnLecture(true);
  };
  const Icone = enLecture ? Square : Volume2;
  const libelle = t(enLecture ? "harmonie.ecoute.arreter" : "harmonie.ecoute.ecouter");
  return (
    <Button type="button" variant="secondary" size="sm" className={props.className} aria-pressed={enLecture}
      aria-label={props.compact ? `${libelle} ${cle.split("\n")[0].split("|").join(" → ")}` : undefined}
      disabled={!plan.some((p) => p.frequences.length)} onClick={basculer}>
      <Icone aria-hidden />
      {!props.compact && libelle}
    </Button>
  );
}
