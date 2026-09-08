import { transposeLabel, transposeChord } from "@/lib/transpose";
const cases = [
  "F或F/Eb", "G或G/B", "D/A或D/F#", "Gm代替Bb", "先F后F#dim",
  "(F C/E D)", "【前奏 | G D/F# | Dm/F Esus4 E7| Am7 Adim(9) | C/D | D】",
  "Dm(或Bb)", "F(或Am)", "F#m或A", "G或G/B", "（结尾时F）",
  "Am(maj7", "Adim(9)", "Em11", "C#m7b5", "(F#m7b5", "Cm6/D", "D7", "Bb/C", "(C/E)", "G)",
  "D.S. al Fine", "To Chorus", "【Chorus】", "Gm代替Bb]",
  // Itération 37 : la basse seule d'une ligne descendante, et
  // l'enrichissement entre parenthèses qui commence par une lettre. Les deux
  // restaient verbatim au milieu d'une étiquette dont le reste bougeait.
  "D/F# /F B/D#", "Am7  Am(maj7)", "C/D D/E Eb/F F/G", "(C/D)", "A9b13",
];
for (const c of cases) {
  console.log(JSON.stringify(c).padEnd(60), "→", transposeLabel(c, 1, "G#"));
}
console.log("--- inchangé pour les étiquettes simples ?");
for (const c of ["Am(maj7","Adim(9)","Em11","C#m7b5","(F#m7b5","Cm6/D","D7","Bb/C","(C/E)","G)"]) {
  const a = transposeChord(c,1,"G#"), b = transposeLabel(c,1,"G#");
  console.log((a===b?"  ok  ":"DIFF  "), c, a, b);
}
