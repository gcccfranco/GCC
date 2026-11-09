import type { Disposition } from "@/lib/dispositionPref";

// Miniature d'une disposition de partition : un SVG statique qui schématise la
// page (titre, rangées d'accords au-dessus de rangées de paroles, sections).
// Couleurs par variables CSS et currentColor : elles suivent le clair et le sombre.
const ACCORD = "var(--chord-color)";
// Classique suit la langue du chant, comme getSectionStyle : l'accent, le fond et le filet de la boîte (variables de globals.css).
const LANGUE = {
  fr: { accent: "var(--fr-accent)", fond: "var(--fr-box-fill)", bord: "var(--fr-box-border)" },
  zh: { accent: "var(--zh-accent)", fond: "var(--zh-box-fill)", bord: "var(--zh-box-border)" },
} as const;
export type TailleMiniature = "menu" | "panneau";
const FOND = "hsl(var(--background))";
const CADRE = "hsl(var(--border))";
const V = "var(--sec-verse)";
const R = "var(--sec-chorus)";
const V_TINT = "var(--sec-verse-tint)";
const R_TINT = "var(--sec-chorus-tint)";

// Deux paires accords / paroles à partir de (x, y) sur la largeur w.
function Rangees({ x, y, w, accord = ACCORD, chiffres = false }: { x: number; y: number; w: number; accord?: string; chiffres?: boolean }) {
  return (
    <g>
      {[0, 1].map((i) => {
        const yy = y + i * 9;
        return (
          <g key={i}>
            <rect x={x} y={yy} width={5} height={1.8} rx={0.9} fill={accord} />
            <rect x={x + w * 0.5} y={yy} width={5} height={1.8} rx={0.9} fill={accord} />
            <rect x={x} y={yy + 3.4} width={w * (i === 0 ? 0.95 : 0.7)} height={2} rx={1} fill="currentColor" opacity={chiffres ? 0.9 : 0.35} />
          </g>
        );
      })}
    </g>
  );
}

// Taille : 64 × 82 dans les menus, 80 × 103 dans le panneau du mode louange (le dessin reste sur 56 × 72).
const COTES = { menu: [64, 82], panneau: [80, 103] } as const;

function Page({ children, titre = "gauche", taille }: { children: React.ReactNode; titre?: "gauche" | "centre"; taille: TailleMiniature }) {
  return (
    <svg viewBox="0 0 56 72" width={COTES[taille][0]} height={COTES[taille][1]} aria-hidden="true" focusable="false" className="block h-auto max-w-full text-foreground">
      <rect x={0.5} y={0.5} width={55} height={71} rx={3} fill={FOND} stroke={CADRE} />
      <rect x={titre === "centre" ? 16 : 6} y={5} width={titre === "centre" ? 24 : 22} height={3} rx={1.5} fill="currentColor" opacity={0.85} />
      {children}
    </svg>
  );
}

export function MiniatureDisposition({ disposition, langue = "fr", taille = "menu" }: { disposition: Disposition; langue?: "fr" | "zh"; taille?: TailleMiniature }) {
  switch (disposition) {
    case "classique": {
      // Comme la vraie page : le couplet n'a pas de boîte (l'intitulé seul), le refrain est une boîte remplie avec son filet,
      // le tout dans la couleur de la langue du chant. En sombre, fond et trait plus marqués (lisibles sur noir).
      const { accent, fond, bord } = LANGUE[langue];
      return (
        <Page taille={taille}>
          <g>
            <rect x={5} y={14} width={1.8} height={2} fill={accent} />
            <rect x={10} y={15} width={10} height={1.8} rx={0.9} fill={accent} opacity={0.7} />
            <Rangees x={10} y={22} w={36} accord={accent} />
          </g>
          <g>
            <rect x={5} y={43} width={46} height={26} rx={1.5} fill={fond} stroke={bord} strokeWidth={0.7} className="dark:[stroke-width:1px] dark:[stroke:var(--mini-accent)]" style={{ "--mini-accent": accent } as React.CSSProperties} />
            <rect x={5} y={43} width={46} height={26} rx={1.5} fill={accent} className="opacity-0 dark:opacity-15" />
            <rect x={5} y={43} width={1.8} height={26} fill={accent} />
            <rect x={10} y={46} width={10} height={1.8} rx={0.9} fill={accent} opacity={0.8} />
            <Rangees x={10} y={51} w={36} accord={accent} />
          </g>
        </Page>
      );
    }
    case "sections":
      // Filet gauche et cadre fin de la couleur de chaque section, accords neutres.
      return (
        <Page taille={taille}>
          {[[14, V], [43, R]].map(([y, c]) => (
            <g key={y as number}>
              <rect x={5} y={y as number} width={46} height={26} rx={3} fill="none" stroke={c as string} strokeWidth={0.8} />
              <rect x={10} y={(y as number) + 3} width={10} height={1.8} rx={0.9} fill={c as string} />
              <Rangees x={10} y={(y as number) + 8} w={36} accord="currentColor" />
            </g>
          ))}
        </Page>
      );
    case "reperes":
      // Pastilles rondes de la couleur de la section dans une gouttière gauche, filet vertical de la même
      // couleur dessous (plus épais au refrain), pas de cadre.
      return (
        <Page taille={taille}>
          {[[14, V, 1.2], [43, R, 2]].map(([y, c, w]) => (
            <g key={y as number}>
              <circle cx={10} cy={(y as number) + 4} r={3.6} fill={c as string} />
              <rect x={10 - (w as number) / 2} y={(y as number) + 9.5} width={w as number} height={17} rx={0.6} fill={c as string} />
              <Rangees x={19} y={(y as number) + 1} w={31} />
            </g>
          ))}
        </Page>
      );
    case "scene":
      // Bandes pleine largeur teintées, grande lettre à gauche.
      return (
        <Page taille={taille}>
          {[[13, V, V_TINT, "C"], [42, R, R_TINT, "R"]].map(([y, c, tint, lettre]) => (
            <g key={y as number}>
              <rect x={0.5} y={y as number} width={55} height={28} fill={tint as string} />
              <text x={5} y={(y as number) + 12} fontSize={11} fontWeight={700} fill={c as string} fontFamily="sans-serif">{lettre as string}</text>
              <Rangees x={17} y={(y as number) + 5} w={33} />
            </g>
          ))}
        </Page>
      );
    case "partition":
      // Page gravée : titre centré, petits repères encadrés, lignes noires.
      return (
        <Page titre="centre" taille={taille}>
          {[17, 43].map((y) => (
            <g key={y}>
              <rect x={6} y={y} width={5} height={5} fill="none" stroke="currentColor" strokeWidth={0.7} />
              <Rangees x={15} y={y - 1} w={34} accord="currentColor" chiffres />
            </g>
          ))}
        </Page>
      );
  }
}
