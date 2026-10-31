// Le rond aux initiales d'un titulaire (planches v19-org) ; pointillé pour un sans compte ou une place libre.

const initiales = (nom: string) =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("");

export function Initiales({ nom, pointille = false, sombre = false }: { nom: string; pointille?: boolean; sombre?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        pointille
          ? "border border-dashed border-muted-foreground/50 text-muted-foreground"
          : sombre ? "bg-foreground text-background" : "bg-secondary text-foreground/80"
      }`}
    >
      {initiales(nom)}
    </span>
  );
}
