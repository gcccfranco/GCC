"use client";

// Cours d'Harmonie, tranche C1 : rendre les blocs d'un chapitre. Le texte garde
// le markdown léger des fiches (gras, italique, accents graves), rendu par
// `TexteFiche` ; pas de bibliothèque de markdown.

import { useTranslation } from "react-i18next";
import { TexteFiche } from "@/components/harmonie/TexteFiche";
import { cn } from "@/lib/utils";
import type { BlocCours, ItemListe } from "@/types/cours";

/** Texte d'un bloc : les accords entre accents graves ne se transposent pas. */
const Texte = ({ texte }: { texte: string }) => <TexteFiche texte={texte} demiTons={0} tonalite="C" />;

/** « [ ] » en tête d'un élément : une case du texte (20.5), dessinée sans
 *  se cocher — on ne retient que les chapitres finis. */
const CASE = /^\[[ xX]\] /;

function Liste({ ordonnee, items }: { ordonnee: boolean; items: ItemListe[] }) {
  const Balise = ordonnee ? "ol" : "ul";
  const cases = !ordonnee && items.every((item) => CASE.test(item.texte));
  return (
    <Balise className={`${cases ? "list-none" : ordonnee ? "list-decimal" : "list-disc"} space-y-1.5 ${cases ? "pl-1" : "pl-6"} marker:text-muted-foreground`}>
      {items.map((item, i) => (
        <li key={i} className={cases ? "flex gap-2.5" : "pl-1"}>
          {cases && <span aria-hidden data-case className="mt-[0.35em] h-4 w-4 shrink-0 rounded-[4px] border-[1.5px] border-muted-foreground/60" />}
          <span>
            <Texte texte={cases ? item.texte.replace(CASE, "") : item.texte} />
            {item.sous && <div className="mt-1.5"><Liste {...item.sous} /></div>}
          </span>
        </li>
      ))}
    </Balise>
  );
}

function Bloc({ bloc, schemas }: { bloc: BlocCours; schemas: Record<string, React.ComponentType> }) {
  const { t } = useTranslation();
  switch (bloc.t) {
    case "paragraphe":
      return <p><Texte texte={bloc.texte} /></p>;
    case "titre":
      return <h3 className="pt-1 text-[17px] font-semibold">{bloc.texte}</h3>;
    case "liste":
      return <Liste ordonnee={bloc.ordonnee} items={bloc.items} />;
    case "tableau": {
      // Un tableau large défile dans son cadre, jamais la page. Sur téléphone, au-delà de trois
      // colonnes (« Toutes les cadences », six), chaque ligne devient un bloc : la première case
      // en titre, les autres sous leur en-tête (lot U4 bis, B3, question 4) ; rien ne glisse.
      const empile = bloc.entetes.length > 3;
      return (
        <div
          className={cn("overflow-x-auto rounded-xl border border-border", empile && "max-sm:overflow-visible")}
          data-cours-tableau
        >
          <table className={cn("w-full border-collapse text-[15px]", empile && "max-sm:block")}>
            <thead className={cn(empile && "max-sm:hidden")}>
              <tr className="bg-secondary/60">
                {bloc.entetes.map((e, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-semibold"><Texte texte={e} /></th>
                ))}
              </tr>
            </thead>
            <tbody className={cn(empile && "max-sm:block")}>
              {bloc.lignes.map((ligne, i) => (
                <tr key={i} className={cn("border-t border-border", empile && "max-sm:block max-sm:px-3 max-sm:py-2.5 max-sm:first:border-t-0")}>
                  {ligne.map((c, j) => (
                    <td
                      key={j}
                      className={cn(
                        "px-3 py-2 align-top",
                        empile && (j === 0
                          ? "max-sm:block max-sm:px-0 max-sm:pt-0 max-sm:pb-1 max-sm:text-[17px] max-sm:font-semibold"
                          : "max-sm:grid max-sm:grid-cols-[6.5rem_1fr] max-sm:gap-2 max-sm:px-0 max-sm:py-0.5"),
                      )}
                    >
                      {empile && j > 0 && (
                        <span className="text-[13px] leading-6 text-muted-foreground sm:hidden"><Texte texte={bloc.entetes[j] ?? ""} /></span>
                      )}
                      <span><Texte texte={c} /></span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "code":
      return (
        <pre className="overflow-x-auto rounded-xl bg-secondary/60 px-3 py-2.5 font-chord text-[15px] leading-relaxed" data-cours-grille>
          {bloc.texte}
        </pre>
      );
    case "citation":
      return (
        <blockquote className="space-y-1 border-l-2 border-border pl-3 text-muted-foreground">
          {bloc.texte.split("\n").map((l, i) => <p key={i}><Texte texte={l} /></p>)}
        </blockquote>
      );
    case "schema": {
      const Schema = schemas[bloc.nom];
      return (
        <figure className="space-y-2" data-cours-schema={bloc.nom}>
          {Schema && <Schema />}
          <figcaption className="text-[13px] text-muted-foreground">{t(`harmonie.cours.schema.${bloc.nom}`)}</figcaption>
        </figure>
      );
    }
  }
}

export function LecteurCours({ blocs, schemas = {} }: { blocs: BlocCours[]; schemas?: Record<string, React.ComponentType> }) {
  return (
    <div className="space-y-3 text-[17px] leading-relaxed">
      {blocs.map((b, i) => <Bloc key={i} bloc={b} schemas={schemas} />)}
    </div>
  );
}
