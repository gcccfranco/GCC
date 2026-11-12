import type { Dispatch, ReactNode, SetStateAction } from "react";
import { MoreHorizontal, Play, X, Sparkles, PenLine, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TOUCHER_44 } from "@/lib/toucher44";

/** Les actions de la barre du chant (Q2, Q5) : Vidéo, PDF, Crayon, Idées d'harmonie, ⋯. Rendues deux fois
 *  (au bout de la rangée, et sur la seconde rangée du téléphone) : une seule est visible. */
export function ActionsChant({ variante, youtubeId, showVideo, setShowVideo, pdf, downloading, setShowPdfChoice, crayon, setCrayon, accesHarmoniePeut, setShowIdees, menuChant }: {
  variante: "rangee" | "tel";
  youtubeId: string | null;
  showVideo: boolean;
  setShowVideo: Dispatch<SetStateAction<boolean>>;
  /** Droit au PDF (canExporterPdfChant) : sinon pas de bouton. */
  pdf: boolean;
  downloading: boolean;
  setShowPdfChoice: (v: boolean) => void;
  /** Crayon : l'état du bouton ; absent = personne de connecté, pas de bouton. */
  crayon?: boolean;
  setCrayon: Dispatch<SetStateAction<boolean>>;
  accesHarmoniePeut: boolean;
  setShowIdees: (v: boolean) => void;
  menuChant: ReactNode;
}) {
  const { t } = useTranslation();
  const tel = (variante: "rangee" | "tel") => variante === "tel";
  const classe = tel(variante)
    ? `raised ${TOUCHER_44} h-9 shrink-0 gap-1.5 px-3.5 rounded-full text-xs font-semibold bg-card text-foreground hover:bg-card`
    : `${TOUCHER_44} h-9 lg:h-8 min-w-9 lg:min-w-8 px-2.5 rounded-full text-xs font-semibold`;
  const libelle = tel(variante) ? undefined : "libelle-action";
  const carre = tel(variante) ? `${classe} w-9 px-0` : `${TOUCHER_44} h-9 w-9 lg:h-8 lg:w-8 rounded-full`;
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
          <span className={libelle}>{t("songs.detail.video")}</span>
        </Button>
      )}
      {pdf && <Button
        variant="secondary"
        aria-label={t("songs.detail.downloadPdf") || "PDF"}
        title={t("songs.detail.downloadPdf") || "PDF"}
        disabled={downloading}
        onClick={() => setShowPdfChoice(true)}
        className={classe}
      >
        <FileText className="h-4 w-4" />
        <span className={libelle}>{t("songs.detail.downloadPdf") || "PDF"}</span>
      </Button>}
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
          {tel(variante) && <span>{t("maPartition.crayon.bouton")}</span>}
        </Button>
      )}
      {accesHarmoniePeut && (
        <Button
          variant="secondary"
          aria-label={t("harmonie.idees")}
          title={t("harmonie.idees")}
          onClick={() => setShowIdees(true)}
          className={carre}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      )}
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
