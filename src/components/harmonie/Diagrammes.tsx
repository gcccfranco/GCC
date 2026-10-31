"use client";

// Harmonie (lot 9) — les deux dessins des fiches : la grille de guitare et le
// clavier. Ils ne sortent que là où la position compte : les fiches écrivent
// un doigté entre accents graves (`320033`, `x24432`) ou une poignée de notes
// reliées par des tirets (D-A-D). On ne dessine rien d'autre.

const CORDES = 6;
const CASES = 5;
// La grille du dictionnaire montre cinq cases sous le sillet : la forme add9 mobile en couvre cinq (la planche en dessine quatre).
const CASES_DICO = 5;

type Doigt = number | "P" | null;
type Barre = { case: number; de: number; a: number } | null;

/** Lit « 320033 », « x24432 » ou « x,10,12,12,11,10 » (au-delà de la 9e case, des virgules) : null = étouffée. */
function lireDoigte(doigte: string): (number | null)[] {
  return (doigte.includes(",") ? doigte.split(",") : doigte.split("").slice(0, CORDES)).map((c) =>
    /^x$/i.test(c.trim()) ? null : Number(c),
  );
}

/** « 320033 » ou « x24432 » : une case par corde, de la plus grave à la plus aiguë ; `x` = corde étouffée,
 *  `0` = corde à vide. Sans les props du dictionnaire (`cases`, `doigts`, `depart`, `barre`, `grand`), le dessin
 *  des fiches Harmonie ; avec elles, la grille du dictionnaire d'accords (doigts, barré, « 5fr »). */
export function DiagrammeGuitare({
  doigte,
  cases,
  doigts,
  depart,
  barre,
  grand,
  label,
}: {
  doigte?: string;
  capo?: number;
  label?: string;
  cases?: (number | null)[];
  doigts?: Doigt[];
  depart?: number;
  barre?: Barre;
  grand?: boolean;
}) {
  if (cases || doigts || depart !== undefined || barre || grand || doigte?.includes(",")) {
    const lues = cases ?? lireDoigte(doigte ?? "");
    return <GrilleGuitare cases={lues} doigts={doigts} depart={depart} barre={barre ?? null} grand={!!grand} label={label ?? (doigte ?? lues.map((c) => c ?? "x").join(" "))} />;
  }
  return <DiagrammeFiche doigte={doigte ?? ""} label={label} />;
}

function DiagrammeFiche({ doigte, label }: { doigte: string; label?: string }) {
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

/** La grille du dictionnaire : cordes de 24 px, cases de 30 px, points de 20 px portant le doigt (mode `grand`,
 *  162 × 152 px comme la planche) ; en petit, la même grille en plus petit. */
function GrilleGuitare({
  cases,
  doigts,
  depart,
  barre,
  grand,
  label,
}: {
  cases: (number | null)[];
  doigts?: Doigt[];
  depart?: number;
  barre: Barre;
  grand: boolean;
  label: string;
}) {
  const pressees = cases.filter((c): c is number => c !== null && c > 0);
  const premiere = depart ?? (pressees.length && Math.max(...pressees) > 4 ? Math.min(...pressees) : 1);
  const S = grand ? 24 : 13; // pas entre deux cordes
  const F = grand ? 30 : 15; // hauteur d'une case
  const D = grand ? 20 : 9; // diamètre d'un point
  const x0 = grand ? 26 : 16;
  const y0 = grand ? 24 : 14;
  const largeur = grand ? 162 : x0 + S * (CORDES - 1) + 8;
  const hauteur = y0 + F * CASES_DICO + (grand ? 8 : 4);
  const bas = y0 + F * CASES_DICO;
  const x = (i: number) => x0 + S * i;
  const yCase = (c: number) => y0 + (c - premiere + 0.5) * F;
  const sillet = premiere === 1;

  return (
    <svg viewBox={`0 0 ${largeur} ${hauteur}`} width={largeur} height={hauteur} role="img" aria-label={label} className="shrink-0">
      {Array.from({ length: CASES_DICO + 1 }, (_, j) => (
        <line
          key={`c${j}`} x1={x(0)} y1={y0 + F * j} x2={x(CORDES - 1)} y2={y0 + F * j}
          stroke="currentColor" strokeWidth={j === 0 && sillet ? (grand ? 5 : 3) : 1.5} opacity={j === 0 && sillet ? 0.9 : 0.35}
        />
      ))}
      {Array.from({ length: CORDES }, (_, i) => (
        <line key={`s${i}`} x1={x(i)} y1={y0} x2={x(i)} y2={bas} stroke="currentColor" strokeWidth={1.5} opacity={0.4} />
      ))}
      {!sillet && (
        <text x={0} y={y0 + F / 2 + 4} fontSize={grand ? 11 : 8} fontWeight={600} fill="currentColor">{premiere}fr</text>
      )}
      {cases.map((c, i) => {
        if (c === null) return <text key={`m${i}`} x={x(i)} y={y0 - 8} fontSize={grand ? 14 : 10} textAnchor="middle" fill="currentColor" opacity={0.75}>×</text>;
        if (c === 0) return <text key={`m${i}`} x={x(i)} y={y0 - 8} fontSize={grand ? 14 : 10} textAnchor="middle" fill="currentColor" opacity={0.75}>○</text>;
        return null;
      })}
      {barre && (
        <rect
          x={x(Math.min(barre.de, barre.a)) - D / 2} y={yCase(barre.case) - D / 2}
          width={Math.abs(barre.a - barre.de) * S + D} height={D} rx={D / 2} fill="currentColor"
        />
      )}
      {cases.map((c, i) => {
        if (!c || c < premiere) return null;
        const d = doigts?.[i];
        const dansLeBarre = barre && c === barre.case && i >= Math.min(barre.de, barre.a) && i <= Math.max(barre.de, barre.a);
        return (
          <g key={`p${i}`}>
            {!dansLeBarre && <circle cx={x(i)} cy={yCase(c)} r={D / 2} fill="currentColor" />}
            {grand && d ? (
              <text x={x(i)} y={yCase(c) + 4} fontSize={11} fontWeight={700} textAnchor="middle" className="fill-background">{d}</text>
            ) : null}
          </g>
        );
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

const BLANCHE_DE: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
const NOIRE_DE: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

/** Piano à deux mains (dictionnaire d'accords) : deux octaves depuis do (trois si une note dépasse 23), notes en
 *  demi-tons depuis le do grave. Main gauche en encre, main droite en couleur d'accord, chaque point porte le nom
 *  de la note. */
export function ClavierMains({
  gauche,
  droite,
  nomsGauche,
  nomsDroite,
  label,
}: {
  gauche: number[];
  droite: number[];
  nomsGauche: string[];
  nomsDroite: string[];
  label?: string;
}) {
  const W = 24;
  const octaves = Math.max(...gauche, ...droite) > 23 ? 3 : 2;
  const largeur = octaves * 7 * W;
  const hauteur = 96;
  const blanches = Array.from({ length: octaves * 7 }, (_, k) => k);
  const noires = blanches.filter((k) => [0, 1, 3, 4, 5].includes(k % 7));
  // Centre d'une note : au milieu de sa blanche, ou à cheval sur la frontière pour une noire.
  const place = (n: number) => {
    const o = Math.floor(n / 12);
    const s = n % 12;
    return s in BLANCHE_DE
      ? { cx: (o * 7 + BLANCHE_DE[s]) * W + W / 2, cy: 80 }
      : { cx: (o * 7 + NOIRE_DE[s] + 1) * W, cy: 44 };
  };
  const points = [
    ...gauche.map((n, i) => ({ ...place(n), nom: nomsGauche[i] ?? "", main: "gauche" })),
    ...droite.map((n, i) => ({ ...place(n), nom: nomsDroite[i] ?? "", main: "droite" })),
  ];

  return (
    <svg
      viewBox={`0 0 ${largeur} ${hauteur}`}
      width={largeur}
      height={hauteur}
      role="img"
      aria-label={label ?? `${nomsGauche.join(" ")} ; ${nomsDroite.join(" ")}`}
      className="shrink-0"
    >
      {blanches.map((k) => (
        <path
          key={`b${k}`}
          d={`M${k * W + 0.5} 0.5 H${(k + 1) * W - 0.5} V${hauteur - 6} Q${(k + 1) * W - 0.5} ${hauteur - 0.5} ${(k + 1) * W - 6} ${hauteur - 0.5} H${k * W + 6.5} Q${k * W + 0.5} ${hauteur - 0.5} ${k * W + 0.5} ${hauteur - 6} Z`}
          className="fill-card" stroke="currentColor" strokeWidth={1} opacity={0.85}
        />
      ))}
      {noires.map((k) => (
        <rect key={`n${k}`} x={(k + 1) * W - 7} y={0} width={14} height={58} rx={3} className="fill-foreground" />
      ))}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.cx} cy={p.cy} r={11} className="fill-background" />
          <circle cx={p.cx} cy={p.cy} r={10} className={p.main === "gauche" ? "fill-foreground" : ""} fill={p.main === "gauche" ? undefined : "var(--chord-color)"} />
          <text
            x={p.cx} y={p.cy + 3.5} fontSize={9} fontWeight={700} textAnchor="middle"
            className={p.main === "gauche" ? "fill-background" : ""} fill={p.main === "gauche" ? undefined : "#fff"}
          >
            {p.nom}
          </text>
        </g>
      ))}
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
