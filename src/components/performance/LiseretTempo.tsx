"use client";

// Liseré du métronome visuel : une bande fine sous la zone de sécurité haute,
// qui se remplit de gauche à droite en une pulsation (60 / BPM s), en boucle.
// Silencieux, sans effet sur la mise en page (docs/spec-mode-louange-forscore.md, L4).
export function LiseretTempo({ tempo }: { tempo: number }) {
  return (
    <div
      data-liseret
      aria-hidden="true"
      className="absolute left-0 right-0 pointer-events-none overflow-hidden"
      style={{ top: "var(--sat, 0px)", height: "3px", zIndex: 15 }}
    >
      <div
        data-liseret-barre
        className="liseret-tempo-barre h-full w-full bg-primary"
        style={{ "--battement": `${60 / tempo}s` } as React.CSSProperties}
      />
    </div>
  );
}
