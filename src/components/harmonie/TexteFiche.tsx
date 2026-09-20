"use client";

// Harmonie (lot 9) — afficher le texte d'une fiche.
//
// Les fiches sont écrites en markdown léger dans `docs/harmonie/*.md` : du gras,
// de l'italique, et les accords entre accents graves. On rend ces trois-là à la
// main plutôt que d'ajouter une bibliothèque de markdown pour trois signes.
// Les accords prennent la couleur des accords du site et se transposent dans la
// tonalité choisie.

import { transposeLabel } from "@/lib/transpose";

/** Découpe « **gras**, *italique*, `accords` » en morceaux rendus. */
export function TexteFiche({ texte, demiTons, tonalite }: { texte: string; demiTons: number; tonalite: string }) {
  const morceaux = texte.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {morceaux.map((m, i) => {
        if (m.startsWith("**") && m.endsWith("**")) return <strong key={i} className="font-semibold">{m.slice(2, -2)}</strong>;
        if (m.startsWith("`") && m.endsWith("`")) {
          const accords = demiTons ? transposeLabel(m.slice(1, -1), demiTons, tonalite) : m.slice(1, -1);
          return <span key={i} className="font-chord font-semibold">{accords}</span>;
        }
        if (m.startsWith("*") && m.endsWith("*")) return <em key={i}>{m.slice(1, -1)}</em>;
        return <span key={i}>{m}</span>;
      })}
    </>
  );
}

/** Un paragraphe de fiche, retours à la ligne du markdown recollés. */
export function ParagrapheFiche({
  texte,
  demiTons,
  tonalite,
  className,
}: {
  texte: string;
  demiTons: number;
  tonalite: string;
  className?: string;
}) {
  return (
    <p className={className}>
      <TexteFiche texte={texte.replace(/\s*\n\s*/g, " ")} demiTons={demiTons} tonalite={tonalite} />
    </p>
  );
}
