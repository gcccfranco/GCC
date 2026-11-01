import { useTranslation } from "react-i18next";
import type { FSSetlist } from "@/types/setList";
import { titreAffiche } from "@/lib/fetes/droits";
import { formatDate, langueCourte } from "@/lib/utils/formatDate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Confirmation de la suppression groupée : elle NOMME ce qui va disparaître (D3). */
export function ConfirmationSuppressionGroupee({
  ouvert,
  onOuvertChange,
  selection,
  avecFete,
  enCours,
  onConfirmer,
}: {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  selection: FSSetlist[];
  avecFete: boolean;
  enCours: boolean;
  onConfirmer: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <AlertDialog open={ouvert} onOpenChange={onOuvertChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {avecFete ? t("setlists.list.deleteSelectedTitle", { count: selection.length }) : t("setlists.list.trashTitle", { count: selection.length })}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <ul className="list-disc pl-5 space-y-0.5">
                {selection.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    {titreAffiche(s, langueCourte(i18n.language))}
                    {" · "}
                    <span className="inline-block first-letter:uppercase">{formatDate(s.date, i18n.language)}</span>
                  </li>
                ))}
              </ul>
              {selection.length > 8 && (
                <p className="mt-1">
                  {t("setlists.list.deleteMore", { count: selection.length - 8 })}
                </p>
              )}
              <p className="mt-2">
                {avecFete ? t("setlists.list.deleteSelectedBody") : t("setlists.list.trashBody", { count: selection.length })}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enCours}>{t("setlists.detail.deleteCancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={enCours}
            onClick={onConfirmer}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {enCours ? "…" : avecFete ? t("setlists.detail.deleteYes") : t("setlists.list.trashYes")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Suppression définitive depuis la corbeille. */
export function ConfirmationSuppressionDefinitive({
  setlist,
  onFermer,
  enCours,
  onConfirmer,
}: {
  setlist: FSSetlist | null;
  onFermer: () => void;
  enCours: boolean;
  onConfirmer: (s: FSSetlist) => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <AlertDialog open={!!setlist} onOpenChange={(o) => !o && onFermer()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("setlists.corbeille.definitifTitre", { titre: setlist ? titreAffiche(setlist, langueCourte(i18n.language)) : "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("setlists.corbeille.definitifCorps")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enCours}>{t("setlists.detail.deleteCancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={enCours}
            onClick={(e) => {
              e.preventDefault();
              if (setlist) onConfirmer(setlist);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {enCours ? "…" : t("setlists.corbeille.supprimerDefinitivement")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
