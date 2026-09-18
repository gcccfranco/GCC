"use client";

import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Check, ExternalLink, Minus } from "lucide-react";
import { joursEntre, type Ligne } from "@/lib/taches/echeances";
import { todayIso } from "@/lib/scene/dimanches";
import type { Fois } from "@/types/tache";

/** Date courte d'une échéance : « mer. 16 sept. » / « 9月16日周三 ». */
export function dateCourte(iso: string, lang: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

/** « En cours depuis 3 jours », ou « En cours » faute de date de début. */
function depuisQuand(t: TFunction, fois: Fois): string {
  if (!fois.debutLe) return t("taches.enCoursSansDate");
  const jours = joursEntre(fois.debutLe, todayIso());
  return jours <= 0 ? t("taches.enCoursAujourdhui") : t("taches.enCoursDepuis", { count: jours });
}

/** Une fois de tâche : cercle à trois états (À faire → En cours → Terminé),
 *  titre, puis échéance · responsable · rythme · où ça en est. Toucher la
 *  ligne ouvre la tâche. */
export function TacheLigne({ ligne, onToggle, onOpen, poleLabel }: {
  ligne: Ligne;
  onToggle: () => void;
  onOpen?: () => void;
  /** Nom du pôle, quand la liste mélange plusieurs pôles. */
  poleLabel?: string;
}) {
  const { t, i18n } = useTranslation();
  const { tache, date, fois } = ligne;
  const date_ = dateCourte(date, i18n.language);
  const enCours = fois?.etat === "encours";
  const terminee = fois?.etat === "terminee";
  const details = [
    date_,
    poleLabel,
    tache.responsableUid ? tache.responsableNom : t("taches.pourTous"),
    tache.repetition ? t(`taches.rythme.${tache.repetition.rythme}`) : null,
    terminee ? t("taches.faitePar", { nom: fois!.parNom }) : null,
    enCours ? depuisQuand(t, fois!) : null,
    enCours ? t("taches.commenceePar", { nom: fois!.parNom }) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="group-row relative flex w-full min-h-[52px] items-center gap-1 pl-1.5 pr-3 py-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={enCours ? "mixed" : terminee}
        aria-label={t("taches.cocher", { titre: tache.titre, date: date_ })}
        onClick={onToggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-[.94] transition-transform duration-150 cursor-pointer"
      >
        <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
          terminee ? "border-foreground bg-foreground text-background"
            : enCours ? "border-foreground text-foreground"
            : "border-muted-foreground/50"}`}>
          {terminee && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
          {enCours && <Minus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      <button type="button" onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left cursor-pointer disabled:cursor-default">
        <span className={`block text-base ${terminee ? "text-muted-foreground line-through" : "text-foreground"}`}>{tache.titre}</span>
        <span className="block text-sm text-muted-foreground">{details}</span>
      </button>
      {tache.lien && (
        <a href={tache.lien} target="_blank" rel="noopener noreferrer" aria-label={t("taches.ouvrirLien")}
           className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      )}
    </div>
  );
}
