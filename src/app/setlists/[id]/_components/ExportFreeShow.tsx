import type { SongContent } from "@/lib/api/songs";
import type { FSSetlist } from "@/types/setList";
import { fabriquerProjetFreeShow, nomFichierFreeShow } from "@/lib/setlist/freeshow";

/** « Exporter pour FreeShow » (docs/spec-export-freeshow.md, FS1, FS2), entrée du menu ⋯ : fabrique le fichier
 *  `.project` dans le navigateur, depuis la version de la présidence, et le télécharge. Rien n'est écrit. */
export function exporterFreeShow(setlist: FSSetlist, contents: Record<string, SongContent>) {
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
