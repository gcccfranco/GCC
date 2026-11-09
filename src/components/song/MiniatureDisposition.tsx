import type { Disposition } from "@/lib/dispositionPref";

// Miniature d'une disposition de partition : un SVG statique qui schématise la
// page (titre, rangées d'accords au-dessus de rangées de paroles, sections).
// Couleurs par variables CSS et currentColor : elles suivent le clair et le sombre.
const ACCORD = "var(--chord-color)";
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

function Page({ children, titre = "gauche" }: { children: React.ReactNode; titre?: "gauche" | "centre" }) {
  return (
    <svg viewBox="0 0 56 72" width="56" height="72" aria-hidden="true" focusable="false" className="block text-foreground">
      <rect x={0.5} y={0.5} width={55} height={71} rx={3} fill={FOND} stroke={CADRE} />
      <rect x={titre === "centre" ? 16 : 6} y={5} width={titre === "centre" ? 24 : 22} height={3} rx={1.5} fill="currentColor" opacity={0.85} />
      {children}
    </svg>
  );
}

export function MiniatureDisposition({ disposition }: { disposition: Disposition }) {
  switch (disposition) {
    case "classique":
      // Intitulé discret, cadre et filet de la couleur de langue (français : accords).
      return (
        <Page>
          {[14, 43].map((y) => (
            <g key={y}>
              <rect x={5} y={y} width={46} height={26} rx={1.5} fill={ACCORD} fillOpacity={0.07} stroke={ACCORD} strokeOpacity={0.45} strokeWidth={0.6} />
              <rect x={5} y={y} width={1.8} height={26} fill={ACCORD} />
              <rect x={10} y={y + 3} width={10} height={1.8} rx={0.9} fill={ACCORD} opacity={0.6} />
              <Rangees x={10} y={y + 8} w={36} />
            </g>
          ))}
        </Page>
      );
    case "sections":
      // Filet gauche et cadre fin de la couleur de chaque section, accords neutres.
      return (
        <Page>
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
      // Pastilles rondes dans une gouttière gauche, reliées par un filet vertical.
      return (
        <Page>
          <rect x={9.6} y={17} width={0.8} height={46} fill={CADRE} />
          {[[17, V], [46, R]].map(([y, c]) => (
            <g key={y as number}>
              <circle cx={10} cy={(y as number) + 2} r={3.6} fill={c as string} />
              <Rangees x={19} y={(y as number) - 2} w={31} />
            </g>
          ))}
        </Page>
      );
    case "scene":
      // Bandes pleine largeur teintées, grande lettre à gauche.
      return (
        <Page>
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
        <Page titre="centre">
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
