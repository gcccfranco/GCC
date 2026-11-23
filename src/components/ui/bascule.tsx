"use client";

// `Bascule` : UN RÉGLAGE (radiogroup bordé, l'actif en fond noir). Choisir une vue, c'est `Segment` (B11 de docs/spec-corrections-interface.md).

export const BASCULE_ACTIVE = "bg-foreground text-background";

export function Bascule({ valeurs, choisie, onChoix, vertical, label, desactive, aLaLigne }: { valeurs: { id: string; nom: string }[]; choisie: string; onChoix: (id: string) => void; vertical?: boolean; label: string; desactive?: boolean; aLaLigne?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={`${vertical ? "flex flex-col" : aLaLigne ? "flex flex-wrap" : "inline-flex"} gap-0.5 rounded-xl border border-border p-0.5 ${desactive ? "opacity-40" : ""}`}>
      {valeurs.map((v) => (
        <button
          key={v.id}
          type="button"
          role="radio"
          aria-checked={choisie === v.id}
          disabled={desactive}
          onClick={() => onChoix(v.id)}
          className={`min-h-11 min-w-11 rounded-[10px] px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${vertical ? "text-left" : ""} ${choisie === v.id ? BASCULE_ACTIVE : "text-foreground"}`}
        >
          {v.nom}
        </button>
      ))}
    </div>
  );
}
