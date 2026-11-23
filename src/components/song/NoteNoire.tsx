// « ♩ = 64 » de l'en-tête Partition : la note est un SVG (le ♩ du texte sort d'une police de secours, minuscule),
// noire avec hampe, à la hauteur des chiffres et collée au « = » (planche mode louange forscore 2, `svg.nt` de `.hd2 .tk`).
export function NoteNoire({ className = "" }: { className?: string }) {
  return (
    <svg
      // Boîte recadrée sur le dessin (tête de 4 à 14, hampe à 13,7) : pas de blanc avant le « = ».
      viewBox="3.5 0 11.5 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={`mr-[3px] inline-block h-[1.1em] w-[0.53em] align-[-0.18em] ${className}`}
    >
      <ellipse cx="9" cy="18" rx="5" ry="3.6" transform="rotate(-20 9 18)" fill="currentColor" stroke="none" />
      <path d="M13.7 16.5V3.5" strokeWidth="2.2" />
    </svg>
  );
}

/** Tempo de l'en-tête Partition : note en SVG, « = 64 » ; le lecteur d'écran lit « ♩ = 64 ». */
export function TempoPartition({ tempo }: { tempo: number | string }) {
  return (
    <>
      <span className="sr-only">♩ = {tempo}</span>
      <span aria-hidden="true">
        <NoteNoire />
        {"= "}{tempo}
      </span>
    </>
  );
}
