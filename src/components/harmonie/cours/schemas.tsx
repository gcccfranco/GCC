"use client";

// Les schémas du cours d'Harmonie (`[[schéma : nom]]` dans le texte), repris des
// graphiques du document de Timothée : même dessin, couleurs du site (thème
// sombre compris). Le texte reste celui du cours, en français.

const ENCRE = "hsl(var(--foreground))";
const DISCRET = "hsl(var(--muted-foreground))";
const BORD = "hsl(var(--muted-foreground) / 0.55)";
const GRILLE = "hsl(var(--border))";

/** 12 tonalités majeures (anneau extérieur), relatifs mineurs (intérieur), armures. */
const CLES: [majeur: string, mineur: string, armure: string][] = [
  ["Do (C)", "Am", "aucune"], ["Sol (G)", "Em", "1 #"], ["Ré (D)", "Bm", "2 #"], ["La (A)", "F#m", "3 #"],
  ["Mi (E)", "C#m", "4 #"], ["Si (B)", "G#m", "5 #"], ["Fa#/Solb", "D#m/Ebm", "6 # ou 6 b"], ["Réb (Db)", "Bbm", "5 b"],
  ["Lab (Ab)", "Fm", "4 b"], ["Mib (Eb)", "Cm", "3 b"], ["Sib (Bb)", "Gm", "2 b"], ["Fa (F)", "Dm", "1 b"],
];

function CercleDesQuintes() {
  const cx = 380, cy = 322, rIn = 90, rMid = 151, rOut = 214, rMin = 120, rMaj = 182, rSig = 240;
  const accent = "var(--chord-color)";
  const ang = (i: number) => ((i * 30 - 90) * Math.PI) / 180;
  const X = (i: number, r: number) => cx + r * Math.cos(ang(i));
  const Y = (i: number, r: number) => cy + r * Math.sin(ang(i));
  const pt = (d: number, r: number) => `${cx + r * Math.cos((d * Math.PI) / 180)} ${cy + r * Math.sin((d * Math.PI) / 180)}`;
  const famille = `M${pt(-135, rIn)} L${pt(-135, rOut)} A${rOut} ${rOut} 0 0 1 ${pt(-45, rOut)} L${pt(-45, rIn)} A${rIn} ${rIn} 0 0 0 ${pt(-135, rIn)} Z`;
  const titre = "Deux tonalités voisines ne diffèrent que d’une altération";
  return (
    <svg viewBox="0 0 760 628" role="img" aria-label={titre} fontSize="13" className="h-auto w-full">
      <text x="24" y="34" fontSize="15" fontWeight="600" fill={ENCRE}>{titre}</text>
      <text x="24" y="54" fontSize="11.5" fill={DISCRET}>Anneau extérieur : tonalités majeures · anneau intérieur : relatifs mineurs · autour : armures</text>
      <path d={famille} fill={accent} fillOpacity="0.12" stroke={accent} strokeWidth="2" />
      <g fill="none">
        <circle cx={cx} cy={cy} r={rOut} stroke={BORD} strokeWidth="1.25" />
        <circle cx={cx} cy={cy} r={rMid} stroke={GRILLE} />
        <circle cx={cx} cy={cy} r={rIn} stroke={BORD} strokeWidth="1.25" />
        {CLES.map((_, i) => (
          <line
            key={i}
            x1={cx + rIn * Math.cos(ang(i) + Math.PI / 12)}
            y1={cy + rIn * Math.sin(ang(i) + Math.PI / 12)}
            x2={cx + rOut * Math.cos(ang(i) + Math.PI / 12)}
            y2={cy + rOut * Math.sin(ang(i) + Math.PI / 12)}
            stroke={GRILLE}
          />
        ))}
      </g>
      {CLES.map(([majeur, mineur, armure], i) => (
        <g key={majeur}>
          <text x={X(i, rMaj)} y={Y(i, rMaj) + 4} textAnchor="middle" fontWeight="600" fill={ENCRE}>{majeur}</text>
          <text x={X(i, rMin)} y={Y(i, rMin) + 4} textAnchor="middle" fontSize="12" fill={ENCRE}>{mineur}</text>
          <text x={X(i, rSig)} y={Y(i, rSig) + 4} textAnchor="middle" fontSize="11.5" fill={DISCRET}>{armure}</text>
        </g>
      ))}
      <text x={cx} y={cy - 22} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={ENCRE}>Sens horaire</text>
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11.5" fill={DISCRET}>+1 quinte, +1 dièse</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={ENCRE}>Sens inverse</text>
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize="11.5" fill={DISCRET}>+1 quarte, +1 bémol</text>
      <text x={cx} y="606" textAnchor="middle" fontSize="11.5" fill={DISCRET}>
        En couleur : les accords de Do majeur, IV – I – V (Fa, Do, Sol) et leurs relatifs ii – vi – iii
      </text>
    </svg>
  );
}

/** Arc type d'un chant moderne, sur les cinq niveaux de dynamique du chapitre 17. */
const SECTIONS: [section: string, niveau: number][] = [
  ["Intro", 1], ["Couplet 1", 2], ["Refrain 1", 3], ["Couplet 2", 3], ["Pré-refrain", 4],
  ["Refrain 2", 4], ["Pont (début)", 2], ["Pont (fin)", 5], ["Dernier refrain", 5], ["Fin", 2],
];
const NIVEAUX = ["Souffle", "Intime", "Porté", "Plein", "Sommet"];

function ArcIntensite() {
  const left = 128, right = 736, base = 280, step = 44;
  const band = (right - left) / SECTIONS.length;
  const x = (i: number) => left + band * (i + 0.5);
  const y = (n: number) => base - (n - 1) * step;
  const sommet = SECTIONS.findIndex(([s]) => s === "Dernier refrain");
  const creux = SECTIONS.findIndex(([s]) => s === "Pont (début)");
  const ligne = SECTIONS.map(([, n], i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(n)}`).join(" ");
  const titre = "L’intensité monte par étapes jusqu’au niveau 5 du dernier refrain";
  return (
    <svg viewBox="0 0 760 348" role="img" aria-label={titre} fontSize="12" className="h-auto w-full">
      <text x="24" y="30" fontSize="15" fontWeight="600" fill={ENCRE}>{titre}</text>
      <text x="24" y="50" fontSize="11.5" fill={DISCRET}>Arc type d’un chant moderne, sur les cinq niveaux de dynamique du chapitre 17</text>
      {NIVEAUX.map((nom, i) => (
        <g key={nom}>
          <line x1={left} x2={right} y1={y(i + 1)} y2={y(i + 1)} stroke={GRILLE} />
          <text x={left - 12} y={y(i + 1) + 4} textAnchor="end" fontSize="11.5" fill={DISCRET}>{`${i + 1} · ${nom}`}</text>
        </g>
      ))}
      <path d={ligne} fill="none" stroke={DISCRET} strokeWidth="2" />
      {SECTIONS.map(([section, n], i) => (
        <circle key={section} cx={x(i)} cy={y(n)} r={i === sommet ? 6 : 4.5} fill={i === sommet ? "var(--sec-chorus)" : DISCRET}>
          <title>{`${section} : niveau ${n}`}</title>
        </circle>
      ))}
      {SECTIONS.map(([section], i) => (
        <text key={section} x={x(i)} y={i % 2 === 0 ? 306 : 324} textAnchor="middle" fontSize="11.5" fontWeight={i === sommet ? 600 : 400} fill={i === sommet ? ENCRE : DISCRET}>
          {section}
        </text>
      ))}
      <text x={x(creux)} y={y(SECTIONS[creux][1]) + 22} textAnchor="middle" fontSize="11.5" fill={DISCRET}>le pont redescend avant la montée</text>
    </svg>
  );
}

export const SCHEMAS_DU_COURS: Record<string, React.ComponentType> = {
  "cercle-des-quintes": CercleDesQuintes,
  "arc-intensite": ArcIntensite,
};
