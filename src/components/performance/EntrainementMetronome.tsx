"use client";

import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { BORNES_ENTRAINEMENT, type Entrainement } from "@/lib/performance/tempo";
import type { CasesEntrainement } from "@/components/performance/hooks/useEntrainement";

/** Petit champ numérique de 44 px de haut ; la valeur hors bornes est ramenée à la borne au blur. */
function Champ({ cle, valeur, onChange, nom }: { cle: keyof Entrainement; valeur: number; onChange: (n: number) => void; nom: string }) {
  const [min, max] = BORNES_ENTRAINEMENT[cle];
  const [texte, setTexte] = useState<string | null>(null);
  return (
    <input
      type="number"
      inputMode="numeric"
      data-entr-champ={cle}
      aria-label={nom}
      min={min}
      max={max}
      value={texte ?? String(valeur)}
      onChange={(e) => {
        const brut = e.target.value.replace(/\D/g, "").slice(0, 3);
        setTexte(brut);
        const n = parseInt(brut, 10);
        if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={() => {
        const n = parseInt(texte ?? "", 10);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        setTexte(null);
      }}
      className="h-11 w-14 rounded-lg border border-border bg-background px-1 text-center text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

/** Temps restant du minuteur (m:ss), recalculé chaque seconde depuis l'appui sur Marche. */
function Restant({ appui, minutes }: { appui: { current: number }; minutes: number }) {
  const { t } = useTranslation();
  const [, setTic] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.ceil((appui.current + minutes * 60000 - performance.now()) / 1000));
  return <span data-entr-restant className="w-full text-xs tabular-nums text-muted-foreground">{t("panneauMetronome.restant", { t: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` })}</span>;
}

function Ligne({ id, gabarit, cases, changerCase, valeurs, changerValeurs, restant }: {
  id: keyof CasesEntrainement;
  gabarit: string;
  cases: CasesEntrainement;
  changerCase: (c: keyof CasesEntrainement, v: boolean) => void;
  valeurs: Entrainement;
  changerValeurs: (v: Partial<Entrainement>) => void;
  restant?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const phrase = gabarit.replace(/\{([a-z]+)\}/g, (_, c: keyof Entrainement) => String(valeurs[c]));
  const coche = cases[id];
  return (
    <div data-entr-ligne={id} className="flex items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={coche}
        aria-label={phrase}
        onClick={() => changerCase(id, !coche)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className={`flex h-6 w-10 items-center rounded-full p-0.5 ${coche ? "justify-end bg-[color:var(--couleur-icones)]" : "justify-start bg-muted-foreground/40"}`}>
          <span className="h-5 w-5 rounded-full bg-background shadow-sm" />
        </span>
      </button>
      <div className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
        {gabarit.split(/(\{[a-z]+\})/).map((morceau, i) => {
          const m = /^\{([a-z]+)\}$/.exec(morceau);
          if (!m) return morceau ? <span key={i}>{morceau}</span> : null;
          const cle = m[1] as keyof Entrainement;
          return <Champ key={i} cle={cle} valeur={valeurs[cle]} nom={t(`panneauMetronome.champ.${cle}`)} onChange={(n) => changerValeurs({ [cle]: n })} />;
        })}
        {coche && restant}
      </div>
    </div>
  );
}

/** Bloc « S'entraîner » (MT-4) : replié au départ ; mesures muettes, accélération, minuteur. */
export function EntrainementMetronome({ ouvert, setOuvert, cases, changerCase, valeurs, changerValeurs, marche, appui }: {
  ouvert: boolean;
  setOuvert: (v: boolean) => void;
  cases: CasesEntrainement;
  changerCase: (c: keyof CasesEntrainement, v: boolean) => void;
  valeurs: Entrainement;
  changerValeurs: (v: Partial<Entrainement>) => void;
  marche: boolean;
  /** Instant d'appui sur Marche (`performance.now()`), posé par `useMetronome`. */
  appui: { current: number };
}) {
  const { t } = useTranslation();
  const corps = useId();
  const commun = { cases, changerCase, valeurs, changerValeurs };
  return (
    <section data-entrainement className="border-t border-border px-4 py-1">
      <button
        type="button"
        data-entr-entete
        aria-expanded={ouvert}
        aria-controls={corps}
        onClick={() => setOuvert(!ouvert)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left text-[13px] font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{t("panneauMetronome.entrainement")}</span>
        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 ${ouvert ? "rotate-180" : ""}`} />
      </button>
      <div id={corps} hidden={!ouvert} className="space-y-1 pb-2">
        {ouvert && (
          <>
            <Ligne id="muettes" gabarit={t("panneauMetronome.entrMuettes")} {...commun} />
            <Ligne id="accel" gabarit={t("panneauMetronome.entrAccel")} {...commun} />
            <Ligne id="minuteur" gabarit={t("panneauMetronome.entrMinuteur")} {...commun} restant={marche ? <Restant appui={appui} minutes={valeurs.minutes} /> : null} />
          </>
        )}
      </div>
    </section>
  );
}
