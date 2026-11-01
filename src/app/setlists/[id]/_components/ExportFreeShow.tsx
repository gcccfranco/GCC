"use client";

import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import type { SongContent } from "@/lib/api/songs";
import type { FSSetlist } from "@/types/setList";
import { fabriquerProjetFreeShow, nomFichierFreeShow } from "@/lib/setlist/freeshow";

/** Bouton « Exporter pour FreeShow » (docs/spec-export-freeshow.md, FS1, FS2) : fabrique le fichier `.project`
 *  dans le navigateur, depuis la version de la présidence, et le télécharge. Rien n'est écrit. */
export function ExportFreeShow({
  setlist,
  contents,
  pret,
}: {
  setlist: FSSetlist;
  contents: Record<string, SongContent>;
  /** Tous les chants sont chargés : sans eux, l'export en omettrait sans le dire. */
  pret: boolean;
}) {
  const { t } = useTranslation();

  function exporter() {
    const projet = fabriquerProjetFreeShow(setlist, contents);
    const url = URL.createObjectURL(new Blob([JSON.stringify(projet)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nomFichierFreeShow(setlist.date);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={exporter}
        disabled={!pret}
        title={pret ? undefined : t("setlists.detail.exportFreeShowWait")}
        className="h-8 px-3 rounded-sm border border-border bg-card text-[12.5px] font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <Download className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
        {t("setlists.detail.exportFreeShow")}
      </button>
    </div>
  );
}
