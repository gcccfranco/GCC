"use client";

// Harmonie (lot 9) — les deux dessins des fiches : la grille de guitare et le
// clavier. Ils ne sortent que là où la position compte : les fiches écrivent
// un doigté entre accents graves (`320033`, `x24432`) ou une poignée de notes
// reliées par des tirets (D-A-D). On ne dessine rien d'autre.

const CORDES = 6;
const CASES = 5;

/** « 320033 » ou « x24432 » : une case par corde, de la plus grave à la plus
 *  aiguë ; `x` = corde étouffée, `0` = corde à vide. */
export function DiagrammeGuitare({ doigte, label }: { doigte: string; capo?: number; label?: string }) {
  const cordes = doigte.split("").slice(0, CORDES);
  const frettes = cordes.map((c) => (/^[1-9]$/.test(c) ? Number(c) : null)).filter((n): n is number => n !== null);
  // La grille commence à la première case utilisée quand l'accord est haut sur
  // le manche (barré en 5e case : on n'affiche pas les quatre cases vides).
  const base = frettes.length && Math.min(...frettes) > 2 ? Math.min(...frettes) - 1 : 0;

  const L = 13; // pas entre deux cordes
  const H = 15; // pas entre deux cases
  const x0 = 10;
  const y0 = 14;
  const largeur = x0 * 2 + L * (CORDES - 1);
  const hauteur = y0 + H * CASES + 6;

  return (
    <svg
      viewBox={`0 0 ${largeur} ${hauteur}`}
      width={largeur}
      height={hauteur}
      role="img"
      aria-label={label ?? doigte}
      className="shrink-0"
    >
      {/* Sillet : trait épais quand la grille part de la première case */}
      <line
        x1={x0} y1={y0} x2={x0 + L * (CORDES - 1)} y2={y0}
        stroke="currentColor" strokeWidth={base === 0 ? 2.5 : 1} opacity={0.75}
      />
      {Array.from({ length: CASES }, (_, i) => (
        <line key={i} x1={x0} y1={y0 + H * (i + 1)} x2={x0 + L * (CORDES - 1)} y2={y0 + H * (i + 1)} stroke="currentColor" strokeWidth={1} opacity={0.3} />
      ))}
      {Array.from({ length: CORDES }, (_, i) => (
        <line key={i} x1={x0 + L * i} y1={y0} x2={x0 + L * i} y2={y0 + H * CASES} stroke="currentColor" strokeWidth={1} opacity={0.3} />
      ))}
      {base > 0 && (
        <text x={x0 - 6} y={y0 + H - 4} fontSize={9} textAnchor="end" fill="currentColor" opacity={0.6}>{base + 1}</text>
      )}
      {cordes.map((c, i) => {
        const x = x0 + L * i;
        if (c === "x" || c === "X") {
          return (
            <g key={i} stroke="currentColor" strokeWidth={1.4} opacity={0.6}>
              <line x1={x - 3} y1={y0 - 9} x2={x + 3} y2={y0 - 3} />
              <line x1={x - 3} y1={y0 - 3} x2={x + 3} y2={y0 - 9} />
            </g>
          );
        }
        if (c === "0") return <circle key={i} cx={x} cy={y0 - 6} r={3} fill="none" stroke="currentColor" strokeWidth={1.4} opacity={0.6} />;
        const n = Number(c);
        if (!n) return null;
        return <circle key={i} cx={x} cy={y0 + H * (n - base) - H / 2} r={4.5} fill="currentColor" />;
      })}
    </svg>
  );
}

// Un clavier d'une octave et demie, assez pour montrer un voicing des deux mains.
const TOUCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G"];
const BEMOLS: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
const estNoire = (n: string) => n.includes("#");

/** Les notes allumées (« D-A-D », « F#-A-D ») sur un clavier. */
export function Clavier({ notes, label }: { notes: string[]; label?: string }) {
  const allumees = new Set(notes.map((n) => BEMOLS[n] ?? n));
  const blanches = TOUCHES.map((n, i) => ({ n, i })).filter((t) => !estNoire(t.n));
  const l = 15;
  const h = 58;
  const largeur = blanches.length * l;

  return (
    <svg
      viewBox={`0 0 ${largeur} ${h}`}
      width={largeur}
      height={h}
      role="img"
      aria-label={label ?? notes.join(" ")}
      className="shrink-0"
    >
      {blanches.map((t, k) => (
        <rect
          key={`b${k}`} x={k * l} y={0} width={l} height={h} rx={2}
          className={allumees.has(t.n) ? "fill-[var(--chord-color)]" : "fill-card"}
          stroke="currentColor" strokeWidth={0.8} opacity={allumees.has(t.n) ? 1 : 0.85}
        />
      ))}
      {TOUCHES.map((n, i) => {
        if (!estNoire(n)) return null;
        // La noire se pose à cheval sur la blanche qui la précède.
        const k = blanches.findIndex((b) => b.i > i) - 1;
        return (
          <rect
            key={`n${i}`} x={(k + 1) * l - l * 0.3} y={0} width={l * 0.6} height={h * 0.62} rx={1.5}
            className={allumees.has(n) ? "fill-[var(--chord-color)]" : "fill-foreground"}
            stroke="currentColor" strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
}

/** Les doigtés (`320033`) écrits dans un texte de fiche. */
export function doigtesDe(texte: string): string[] {
  return [...texte.matchAll(/`([x0-9]{6})`/gi)].map((m) => m[1]);
}

/** Les groupes de notes (« D-A-D ») écrits dans un texte de fiche. */
export function notesDe(texte: string): string[][] {
  return [...texte.matchAll(/\b([A-G][#b]?(?:-[A-G][#b]?){1,5})\b/g)].map((m) => m[1].split("-"));
}
