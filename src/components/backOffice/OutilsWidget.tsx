"use client";

// Personnaliser le tableau de bord (lot U6, B5, planche `bo-tableau-de-bord`) : la barre
// d'outils en tête de chaque widget — poignée, Monter, Descendre, S, M, L, « Réglages du
// widget », « Retirer le widget » — et, dépliés dessous, ses réglages en pastilles.
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, GripVertical, SlidersHorizontal, X } from "lucide-react";
import { listProgrammes } from "@/lib/firebase/programmes";
import { todayIso } from "@/lib/scene/dimanches";
import { editionsAffichees, libelleEdition } from "@/lib/scene/fetes";
import { useProfile } from "@/lib/firebase/users";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import { choisirReglage, groupesDeReglages } from "@/lib/tableauDeBord/reglages";
import { cn } from "@/lib/utils";
import type { Reglages, Taille, Widget } from "@/types/backOffice";

const TAILLES: Taille[] = ["s", "m", "l"];

/** Bouton de la barre (planche `.ctl button`) : blanc en relief, l'actif en encre. */
const BOUTON =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-[10px] bg-card px-2 text-xs font-bold text-foreground shadow-[0_1px_2px_rgba(28,28,30,.12)] transition-transform duration-150 enabled:active:scale-[.94] disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-foreground aria-pressed:text-background aria-expanded:bg-foreground aria-expanded:text-background";

/** La poignée du glisser (lancée par `WidgetTriable`, qui tient le `useSortable`). */
export function Poignee({ nom, ...props }: { nom: string } & React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }) {
  const { t } = useTranslation();
  return (
    <button
      type="button" {...props} aria-label={t("tableauDeBord.perso.deplacer", { nom })}
      className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function OutilsWidget({
  widget, nom, premier, dernier, poignee, reglagesOuverts,
  onMonter, onDescendre, onTaille, onReglages, onRetirer, onChangerReglages,
}: {
  widget: Widget;
  nom: string;
  premier: boolean;
  dernier: boolean;
  /** `<Poignee>`, branchée sur le glisser. */
  poignee: React.ReactNode;
  reglagesOuverts: boolean;
  onMonter: () => void;
  onDescendre: () => void;
  onTaille: (t: Taille) => void;
  onReglages: () => void;
  onRetirer: () => void;
  onChangerReglages: (r: Reglages) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div
        role="toolbar" aria-label={t("tableauDeBord.perso.outils", { nom })}
        className="-mx-2 -mt-1.5 mb-2.5 flex flex-wrap items-center gap-1 rounded-xl bg-secondary p-1.5"
      >
        {poignee}
        <button type="button" className={BOUTON} aria-label={t("tableauDeBord.perso.monter")} disabled={premier} onClick={onMonter}>
          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" className={BOUTON} aria-label={t("tableauDeBord.perso.descendre")} disabled={dernier} onClick={onDescendre}>
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="flex-1" />
        <span role="group" aria-label={t("tableauDeBord.perso.taille")} className="flex gap-1">
          {TAILLES.map((x) => (
            <button key={x} type="button" className={BOUTON} aria-pressed={widget.taille === x} onClick={() => onTaille(x)}>
              {x.toUpperCase()}
            </button>
          ))}
        </span>
        <button type="button" className={BOUTON} aria-label={t("tableauDeBord.perso.reglages")} aria-expanded={reglagesOuverts} onClick={onReglages}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" className={BOUTON} aria-label={t("tableauDeBord.perso.retirer")} onClick={onRetirer}>
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {reglagesOuverts && <ReglagesWidget widget={widget} onChanger={onChangerReglages} />}
    </>
  );
}

/** Les réglages d'un widget en pastilles (planche `.rgl`), un groupe par réglage. */
function ReglagesWidget({ widget, onChanger }: { widget: Widget; onChanger: (r: Reglages) => void }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  // La Scène se règle sur une des éditions affichées (Pâques · Noël, Q10) : il faut les lire.
  // Une lecture en échec laisse « celui qui est affiché ».
  const langue = i18n.language.startsWith("zh") ? "zh" : "fr";
  const { valeur: programmes } = useLecture(
    async () => (widget.id === "scene"
      ? editionsAffichees(await listProgrammes(), todayIso()).map((e) => ({ id: e.programme!.id, nom: libelleEdition(e.fete, e.annee, langue) }))
      : []),
    `${widget.id}|${langue}`,
  );
  const groupes = groupesDeReglages(widget.id, widget.reglages, user, profile, programmes ?? []);

  return (
    <div className="mb-2.5 space-y-2">
      {groupes.map((g) => (
        <div key={g.cle} className="rounded-xl bg-secondary px-3 py-2.5 text-[13px]">
          <b className="font-semibold text-foreground">{t(g.titre)}</b>
          <div role="group" aria-label={t(g.titre)} className="mt-1.5 flex flex-wrap gap-1.5">
            {g.choix.map((c) => {
              const actif = g.actifs.includes(c.valeur);
              return (
                <button
                  key={c.valeur} type="button" aria-pressed={actif}
                  onClick={() => onChanger(choisirReglage(widget.reglages, g, c.valeur))}
                  className={cn(
                    "h-8 rounded-full px-3 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    actif ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.texte ?? t(c.i18n!, c.params)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
