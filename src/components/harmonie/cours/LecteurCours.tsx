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

/** Texte brut d'une case : sans les marques du markdown léger (gras, italique, accents graves). */
const brut = (texte: string) => texte.replace(/\*\*|\*|`/g, "");

/** Une case qui ne contient que des altérations (colonne « Symbole ») : les signes se lisent en 17/23. */
const SEULEMENT_ALTERATIONS = /^[\u266D-\u266F\u{1D12A}\u{1D12B}]+$/u;

/** Une colonne est « courte » quand sa plus longue case tient en 12 caractères ou moins. La tête peut passer
 *  à la ligne (deux lignes au plus) : elle compte par son mot le plus long. Partagé par la largeur des
 *  colonnes (harmonie-3) et la règle d'empilement au téléphone (harmonie-12). */
const SEUIL_COLONNE_COURTE = 12;
export function colonnesCourtes(entetes: string[], lignes: string[][]): boolean[] {
  return entetes.map((entete, j) => {
    const tete = Math.max(0, ...brut(entete).split(/\s+/).map((mot) => [...mot].length));
    const cases = Math.max(0, ...lignes.map((ligne) => [...brut(ligne[j] ?? "")].length));
    return Math.max(tete, cases) <= SEUIL_COLONNE_COURTE;
  });
}

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
      return <h3 className="pt-1 text-lg font-semibold">{bloc.texte}</h3>;
    case "liste":
      return <Liste ordonnee={bloc.ordonnee} items={bloc.items} />;
    case "tableau": {
      // Un tableau large défile dans son cadre, jamais la page. Sur téléphone, dès que deux colonnes
      // sont longues (« Toutes les cadences », six ; le tableau 1.1), chaque ligne devient un bloc :
      // la première case en titre, les autres sous leur en-tête (lot U4 bis, B3, question 4) ; rien
      // ne glisse. Un tableau qui n'a qu'une colonne longue reste un tableau, colonnes courtes au plus juste.
      const courtes = colonnesCourtes(bloc.entetes, bloc.lignes);
      const empile = courtes.filter((c) => !c).length >= 2;
      return (
        <div
          className={cn("overflow-x-auto rounded-xl border border-border", empile && "max-sm:overflow-visible")}
          data-cours-tableau
        >
          <table className={cn("w-full border-collapse text-base", empile && "max-sm:block")}>
            <thead className={cn(empile && "max-sm:hidden")}>
              <tr className="bg-secondary/60">
                {bloc.entetes.map((e, i) => (
                  <th key={i} className={cn("py-2 text-left text-sm font-semibold leading-[18px]", courtes[i] ? "w-px px-2 first:pl-3 last:pr-3" : "px-3")}>
                    {/* Tête de plusieurs mots d'une colonne courte : deux lignes au plus, pas une par mot (au téléphone, la place va au texte). */}
                    {courtes[i] && /\s/.test(brut(e).trim()) ? <span className="block sm:min-w-24"><Texte texte={e.replace(/\(([^)]*)\)/g, (m) => m.replace(/ /g, "\u00A0"))} /></span> : <Texte texte={e} />}
                  </th>
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
                        "py-2 align-top text-base leading-[21px]",
                        courtes[j] ? (empile ? "px-2 sm:first:pl-3 sm:last:pr-3" : "px-2 first:pl-3 last:pr-3") : "px-3",
                        SEULEMENT_ALTERATIONS.test(brut(c).trim()) && "text-lg leading-[23px]",
                        courtes[j] && (empile ? "sm:w-px sm:whitespace-nowrap" : "w-px whitespace-nowrap"),
                        empile && (j === 0
                          ? "max-sm:block max-sm:px-0 max-sm:pt-0 max-sm:pb-1 max-sm:text-lg max-sm:font-semibold"
                          : "max-sm:block max-sm:px-0 max-sm:py-1"),
                      )}
                    >
                      {empile && j > 0 && (
                        <span className="block text-sm leading-[18px] text-muted-foreground sm:hidden"><Texte texte={bloc.entetes[j] ?? ""} /></span>
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
        <pre className="overflow-x-auto rounded-xl bg-secondary/60 px-3 py-2.5 font-chord text-base leading-relaxed" data-cours-grille>
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
          <figcaption className="text-sm text-muted-foreground">{t(`harmonie.cours.schema.${bloc.nom}`)}</figcaption>
        </figure>
      );
    }
  }
}

export function LecteurCours({ blocs, schemas = {} }: { blocs: BlocCours[]; schemas?: Record<string, React.ComponentType> }) {
  return (
    <div className="space-y-3 text-lg leading-relaxed" lang="fr">
      {blocs.map((b, i) => <Bloc key={i} bloc={b} schemas={schemas} />)}
    </div>
  );
}
