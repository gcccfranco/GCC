import { FileText, Settings, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/** Menu ⋯ (spec-reglages-unifies.md, RU-3) : PDF (si droit), Personnaliser, Signaler ; le reste est dans la marge Affichage. */
export function MenuChant({ pdf, downloading, setShowPdfChoice, setShowPanel, setShowReport }: {
  /** Droit au PDF (canExporterPdfChant) : sinon pas d'entrée. */
  pdf: boolean;
  downloading: boolean;
  setShowPdfChoice: (v: boolean) => void;
  setShowPanel: (v: boolean) => void;
  setShowReport: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenuContent align="end" collisionPadding={12} className="w-[min(374px,calc(100vw-16px))] sm:w-auto sm:min-w-52 sm:max-w-[calc(100vw-1rem)]">
      {pdf && (
        <DropdownMenuItem disabled={downloading} onClick={() => setShowPdfChoice(true)}>
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          {t("songs.detail.downloadPdf") || "PDF"}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => setShowPanel(true)}>
        <Settings className="h-3.5 w-3.5 text-muted-foreground" />
        {t("songs.detail.customize")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick= {() => setShowReport(true)}>
        <TriangleAlert className='h-3.5 w-3.5 text-muted-foreground'/>
        {t('songs.detail.report')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
