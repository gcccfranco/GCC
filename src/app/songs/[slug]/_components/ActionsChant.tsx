import type { Dispatch, ReactNode, SetStateAction } from "react";
import { MoreHorizontal, Play, X, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TOUCHER_44 } from "@/lib/toucher44";

/** Les actions de la barre du chant (RU-3) : Vidéo, Crayon, Affichage (`children`), ⋯ ; sur la même ligne que le Retour à toutes les tailles. */
export function ActionsChant({ youtubeId, showVideo, setShowVideo, crayon, setCrayon, menuChant, children }: {
  youtubeId: string | null;
  showVideo: boolean;
  setShowVideo: Dispatch<SetStateAction<boolean>>;
  /** Crayon : l'état du bouton ; absent = personne de connecté, pas de bouton. */
  crayon?: boolean;
  setCrayon: Dispatch<SetStateAction<boolean>>;
  menuChant: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const classe = `${TOUCHER_44} h-9 lg:h-8 min-w-9 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold`;
  const carre = `${TOUCHER_44} h-9 w-9 lg:h-8 lg:w-8 rounded-full`;
  return (
    <>
      {youtubeId && (
        <Button
          variant="secondary"
          aria-label={t("songs.detail.video")}
          title={t("songs.detail.video")}
          aria-pressed={showVideo}
          onClick={() => setShowVideo((v) => !v)}
          className={`${classe} ${showVideo ? "!bg-foreground !text-background hover:!bg-foreground/90" : ""}`}
        >
          {!showVideo ? <Play className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <span className="libelle-action">{t("songs.detail.video")}</span>
        </Button>
      )}
      {crayon !== undefined && (
        <Button
          variant="secondary"
          aria-label={t("maPartition.crayon.bouton")}
          title={t("maPartition.crayon.bouton")}
          aria-pressed={crayon}
          onClick={() => setCrayon((v) => !v)}
          className={`${classe} ${crayon ? "!bg-foreground !text-background hover:!bg-foreground/90" : ""}`}
        >
          <PenLine className="h-4 w-4" />
          {/* décision déléguée (session MP-3, 12/11) : le Crayon prend la place de l'étincelle dans la spec, en icône comme elle */}
        </Button>
      )}
      {children}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon-lg"
            className={carre}
            aria-label={t("common.moreActions")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {menuChant}
      </DropdownMenu>
    </>
  );
}
