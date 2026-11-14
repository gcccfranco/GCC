import { Trash2, BellRing, Copy, Share2, Info, Link as LinkIcon, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { FSSetlist } from "@/types/setList";

/** Qui peut modifier — rend visible la logique de access.ts. */
export function DroitsDeModifier({
  setlist,
  canEdit,
  droitsDeplies,
  onBasculer,
  className = "mt-3",
}: {
  setlist: FSSetlist;
  canEdit: boolean;
  droitsDeplies: boolean;
  onBasculer: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  // « Modifiable par… » replié derrière le ⓘ sur toutes les tailles (dimanche-16 : à l'ordinateur, une seule rangée).
  return (
    <div className={`${className} flex items-center gap-2 flex-wrap`}>
      <Badge variant="secondary">
        {canEdit ? t("setlists.detail.canEdit") : t("setlists.detail.readOnly")}
      </Badge>
      <button
        type="button"
        aria-label={t("setlists.detail.qui")}
        aria-expanded={droitsDeplies}
        onClick={onBasculer}
        className="relative flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      <span className={`text-xs text-muted-foreground ${droitsDeplies ? "" : "hidden"}`}>
        {setlist.isPrivate
          ? t(setlist.editeurs?.length ? "setlists.detail.editableByOwnerEquipe" : "setlists.detail.editableByOwner")
          : t(setlist.editeurs?.length ? "setlists.detail.editableByEquipe" : "setlists.detail.editableBy", {
              category: t("categories." + setlist.category, { defaultValue: setlist.category }),
            })}
      </span>
    </div>
  );
}

/** Actions du menu ⋯ communes à G et aux deux volets. */
export function ActionsPartagees({
  canNotifyTeam,
  notifying,
  realSongCount,
  flashFeedback,
  handleNotifyTeam,
  canDuplicate,
  duplicating,
  canEdit,
  handleDuplicate,
  handleShare,
  canChangerLien,
  aUnLien,
  onLien,
  canExporter,
  exportPret,
  onExporter,
}: {
  canNotifyTeam: boolean;
  notifying: boolean;
  realSongCount: number;
  flashFeedback: (msg: string) => void;
  handleNotifyTeam: () => void;
  canDuplicate: boolean;
  duplicating: boolean;
  canEdit: boolean;
  handleDuplicate: () => void;
  handleShare: () => void;
  /** Lien de la présentation et export FreeShow (dimanche-16) : en tête du menu, avec leurs droits. */
  canChangerLien: boolean;
  aUnLien: boolean;
  onLien: () => void;
  canExporter: boolean;
  exportPret: boolean;
  onExporter: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      {canChangerLien && (
        <DropdownMenuItem onClick={onLien}>
          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {aUnLien ? t("setlists.detail.presentationChange") : t("setlists.detail.presentationAdd")}
        </DropdownMenuItem>
      )}
      {canExporter && (
        <DropdownMenuItem
          disabled={!exportPret}
          title={exportPret ? undefined : t("setlists.detail.exportFreeShowWait")}
          onClick={onExporter}
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
          {t("setlists.detail.exportFreeShow")}
        </DropdownMenuItem>
      )}
      {(canChangerLien || canExporter) && <DropdownMenuSeparator />}
      {canNotifyTeam && (
        <DropdownMenuItem
          disabled={notifying}
          onClick={() =>
            realSongCount < 4
              ? flashFeedback(t("setlists.detail.notifyNeedSongs"))
              : handleNotifyTeam()
          }
        >
          <BellRing className="h-3.5 w-3.5 text-muted-foreground" />
          {notifying
            ? "…"
            : t("setlists.detail.notifyTeam", { defaultValue: "Prévenir l'équipe" })}
        </DropdownMenuItem>
      )}
      {canDuplicate && (
        <DropdownMenuItem disabled={duplicating} onClick={() => handleDuplicate()}>
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          {duplicating ? "…" : t(canEdit ? "setlists.detail.duplicate" : "setlists.detail.duplicateForNotes")}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => handleShare()}>
        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
        {t("setlists.detail.share")}
      </DropdownMenuItem>
    </>
  );
}

/** Entrée « Supprimer » du menu ⋯. */
export function MenuSupprimer({ canDelete, onSupprimer }: { canDelete: boolean; onSupprimer: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      {canDelete && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onSupprimer}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("setlists.detail.deleteButton")}
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}

/** « Réessayer » du bandeau de la copie hors ligne (A3) : relit la setlist. */
export function ReessayerCopie({ deuxVolets, onReessayer }: { deuxVolets: boolean; onReessayer: () => void }) {
  const { t } = useTranslation();
  return (
    <Button type="button" size="sm" variant="ghost" className={`${deuxVolets ? "ml-2 h-6" : "h-11 shrink-0"} px-2 text-xs`} onClick={onReessayer}>
      {t("common.retry")}
    </Button>
  );
}
