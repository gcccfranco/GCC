// Notes dessinées en SVG (lot MT) : les glyphes ♩ ♪ ♫ ♬ manquent au sous-ensemble Noto Music de globals.css.
// Encre = `currentColor` ; décoratives (le nom accessible est porté par le bouton qui les contient).
export type TypeNote = "noire" | "noirePointee" | "croches" | "doubles" | "pointee" | "triolet";

const TETE = (x: number, y = 15) => <ellipse key={`t${x}`} cx={x} cy={y} rx="3.4" ry="2.5" transform={`rotate(-20 ${x} ${y})`} fill="currentColor" />;
const HAMPE = (x: number, haut = 3) => <rect key={`h${x}`} x={x - 0.6} y={haut} width="1.2" height={15 - haut - 0.5} fill="currentColor" />;
const BARRE = (x1: number, x2: number, y: number) => <rect key={`b${x1}${y}`} x={x1 - 0.6} y={y} width={x2 - x1 + 1.2} height="2.2" fill="currentColor" />;
const POINT = (x: number) => <circle key={`p${x}`} cx={x} cy="14.8" r="1.2" fill="currentColor" />;

const DESSINS: Record<TypeNote, { w: number; corps: React.ReactNode }> = {
  noire: { w: 12, corps: <>{TETE(4)}{HAMPE(7.2)}</> },
  noirePointee: { w: 15, corps: <>{TETE(4)}{HAMPE(7.2)}{POINT(11.5)}</> },
  croches: { w: 26, corps: <>{TETE(4)}{TETE(18)}{HAMPE(7.2)}{HAMPE(21.2)}{BARRE(7.2, 21.2, 3)}</> },
  doubles: { w: 44, corps: <>{[4, 15, 26, 37].map((x) => TETE(x))}{[4, 15, 26, 37].map((x) => HAMPE(x + 3.2))}{BARRE(7.2, 40.2, 3)}{BARRE(7.2, 40.2, 6.6)}</> },
  pointee: { w: 30, corps: <>{TETE(4)}{POINT(11)}{TETE(22)}{HAMPE(7.2)}{HAMPE(25.2)}{BARRE(7.2, 25.2, 3)}{BARRE(19.2, 25.2, 6.6)}</> },
  triolet: { w: 32, corps: <>{[4, 14, 24].map((x) => TETE(x))}{[4, 14, 24].map((x) => HAMPE(x + 3.2, 8))}{BARRE(7.2, 27.2, 8)}<text x="17.2" y="6" fontSize="7" fontStyle="italic" textAnchor="middle" fill="currentColor" fontFamily="system-ui, sans-serif">3</text></> },
};

export function IconeNote({ note, hauteur = 20, className }: { note: TypeNote; hauteur?: number; className?: string }) {
  const d = DESSINS[note];
  return (
    <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${d.w} 20`} width={(d.w * hauteur) / 20} height={hauteur} className={className} style={{ flex: "none" }}>
      {d.corps}
    </svg>
  );
}
