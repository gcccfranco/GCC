"use client";

// Liseré du métronome visuel : une bande fine sous la zone de sécurité haute (ou sous la barre ouverte),
// qui se remplit de gauche à droite en une pulsation (60 / BPM s), en boucle.
// Silencieux, sans effet sur la mise en page (docs/spec-mode-louange-forscore.md, L4).
export function LiseretTempo({ tempo, top }: { tempo: number; top: string }) {
  return (
    <div
      data-liseret
      aria-hidden="true"
      className="absolute left-0 right-0 pointer-events-none overflow-hidden"
      style={{ top, height: "3px", zIndex: 15 }}
    >
      <div
        data-liseret-barre
        className="liseret-tempo-barre h-full w-full bg-primary"
        style={{ "--battement": `${60 / tempo}s` } as React.CSSProperties}
      />
    </div>
  );
}
