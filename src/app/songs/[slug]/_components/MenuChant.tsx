import { Settings, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChoixDisposition } from "@/components/song/ChoixDisposition";
import type { Disposition } from "@/lib/dispositionPref";

/** Menu ⋯ (spec-barre-chant.md, Q3, Q5) : disposition, Personnaliser, Signaler. */
export function MenuChant({ langue, disposition, changeDisposition, setShowPanel, setShowReport }: {
  langue: "fr" | "zh";
  disposition: Disposition;
  changeDisposition: (d: Disposition) => void;
  setShowPanel: (v: boolean) => void;
  setShowReport: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenuContent align="end" collisionPadding={12} className="w-auto min-w-52 max-w-[calc(100vw-1rem)]">
      <ChoixDisposition variante="menu" langue={langue} disposition={disposition} changeDisposition={changeDisposition} />
      <DropdownMenuSeparator />
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
