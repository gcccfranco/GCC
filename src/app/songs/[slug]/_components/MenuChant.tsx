import { Settings, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/** Menu ⋯ (spec-barre-chant.md, Q3, Q5) : couleurs par section, Personnaliser, Signaler. */
export function MenuChant({ chartStyle, toggleChartStyle, setShowPanel, setShowReport }: {
  chartStyle: boolean;
  toggleChartStyle: (v: boolean) => void;
  setShowPanel: (v: boolean) => void;
  setShowReport: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenuContent align="end" className="w-52">
      <DropdownMenuCheckboxItem
        checked={chartStyle}
        onCheckedChange={toggleChartStyle}
        onSelect={(e) => e.preventDefault()}
      >
        {t("performance.chartStyle")}
      </DropdownMenuCheckboxItem>
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
