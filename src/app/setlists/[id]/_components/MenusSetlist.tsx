import { Trash2, BellRing, Copy, Share2, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { interrupteurAllume, prefDepuisInterrupteur, type JianpuPref } from "@/lib/jianpu/preference";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";
import type { FSSetlist } from "@/types/setList";

/** Qui peut modifier — rend visible la logique de access.ts. */
export function DroitsDeModifier({
  setlist,
  canEdit,
  droitsDeplies,
  onBasculer,
}: {
  setlist: FSSetlist;
  canEdit: boolean;
  droitsDeplies: boolean;
  onBasculer: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      <Badge variant="secondary">
        {canEdit ? t("setlists.detail.canEdit") : t("setlists.detail.readOnly")}
      </Badge>
      <button
        type="button"
        aria-label={t("setlists.detail.qui")}
        aria-expanded={droitsDeplies}
        onClick={onBasculer}
        className="sm:hidden relative flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      <span className={`text-xs text-muted-foreground ${droitsDeplies ? "" : "max-sm:hidden"}`}>
        {setlist.isPrivate
          ? t(setlist.editeurs?.length ? "setlists.detail.editableByOwnerEquipe" : "setlists.detail.editableByOwner")
          : t(setlist.editeurs?.length ? "setlists.detail.editableByEquipe" : "setlists.detail.editableBy", {
              category: t("categories." + setlist.category, { defaultValue: setlist.category }),
            })}
      </span>
    </div>
  );
}

/** Réglages d'affichage : le bouton « Affichage » de G, le sous-menu « Affichage »
 *  du ⋯ en deux volets (Q3, Q7). */
export function ReglagesAffichage({
  layout,
  changeLayout,
  hasZhSong,
  showPinyin,
  togglePinyin,
  chartStyle,
  toggleChartStyle,
  hasJianpuSheets,
  jianpuPref,
  changeJianpuPref,
}: {
  layout: PartitionLayout;
  changeLayout: (v: PartitionLayout) => void;
  hasZhSong: boolean;
  showPinyin: boolean;
  togglePinyin: () => void;
  chartStyle: boolean;
  toggleChartStyle: (v: boolean) => void;
  hasJianpuSheets: boolean;
  jianpuPref: JianpuPref;
  changeJianpuPref: (v: JianpuPref) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        {t("setlists.detail.layout.label")}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup value={layout} onValueChange={(v) => changeLayout(v as PartitionLayout)}>
        {(["played", "unique", "structure"] as const).map((v) => (
          <DropdownMenuRadioItem key={v} value={v} onSelect={(e) => e.preventDefault()}>
            {t(`setlists.detail.layout.${v}`)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      {/* Pinyin (chants zh) — préférence persistée */}
      {hasZhSong && (
        <DropdownMenuCheckboxItem
          checked={showPinyin}
          onCheckedChange={() => togglePinyin()}
          onSelect={(e) => e.preventDefault()}
        >
          {t("setlists.detail.pinyin", { defaultValue: "Pinyin" })}
        </DropdownMenuCheckboxItem>
      )}
      <DropdownMenuCheckboxItem
        checked={chartStyle}
        onCheckedChange={toggleChartStyle}
        onSelect={(e) => e.preventDefault()}
      >
        {t("performance.chartStyle")}
      </DropdownMenuCheckboxItem>
      {hasJianpuSheets && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={interrupteurAllume(jianpuPref)}
            onCheckedChange={(on) => changeJianpuPref(prefDepuisInterrupteur(on))}
            onSelect={(e) => e.preventDefault()}
          >
            {t("performance.jianpuSheet")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("performance.jianpuSheetHint")}
          </DropdownMenuLabel>
        </>
      )}
    </>
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
}) {
  const { t } = useTranslation();
  return (
    <>
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
