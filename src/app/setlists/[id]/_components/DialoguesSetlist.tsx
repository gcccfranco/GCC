import { useTranslation } from "react-i18next";
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

/** Confirmation de suppression (corbeille, ou suppression d'une fête). */
export function ConfirmerSuppression({
  open,
  onOpenChange,
  fete,
  deleting,
  onConfirmer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fete: boolean;
  deleting: boolean;
  onConfirmer: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{fete ? t("setlists.detail.deleteButton") : t("setlists.detail.trashTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{fete ? t("setlists.detail.deleteConfirm") : t("setlists.detail.trashBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("setlists.detail.deleteCancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={onConfirmer}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "…" : fete ? t("setlists.detail.deleteYes") : t("setlists.detail.trashYes")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Confirmation de rétablissement de l'original (adaptation de la setlist ou ma version). */
export function ConfirmerRetablir({
  open,
  onOpenChange,
  editMine,
  savingLine,
  onConfirmer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMine: boolean;
  savingLine: boolean;
  onConfirmer: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {editMine
              ? t("setlists.myVersion.revert")
              : t("setlists.contentEdit.revert", { defaultValue: "Rétablir l'original" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {editMine
              ? t("setlists.myVersion.revertConfirm")
              : t("setlists.contentEdit.revertConfirm", {
                  defaultValue:
                    "Toutes les modifications d'accords et de paroles de ce chant pour cette setlist seront perdues.",
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel", { defaultValue: "Annuler" })}</AlertDialogCancel>
          <AlertDialogAction
            disabled={savingLine}
            onClick={onConfirmer}
          >
            {savingLine ? "…" : t("setlists.contentEdit.revertYes", { defaultValue: "Rétablir" })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
