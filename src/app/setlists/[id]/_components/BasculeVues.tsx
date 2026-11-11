import type { Ref } from "react";
import { List, Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import { compter } from "@/lib/usage";
import { FondDeBarre } from "@/components/layout/FondDeBarre";

/** Bascule « Liste | Partitions » (setlist G, Q11) : sous l'en-tête, elle colle
 *  sous la barre et s'escamote avec elle. Pleine largeur sur téléphone. Elle s'escamote par
 *  son `top` collant et non par un transform, qui la faisait remonter sur l'en-tête avant
 *  qu'elle ne colle ; 3.5rem = sa hauteur (py-2 + p-0.5 + h-9). */
export function BasculeVues({
  refBascule,
  scrollVisible,
  toolbarH,
  view,
  versListe,
  versPartitions,
}: {
  refBascule: Ref<HTMLDivElement>;
  scrollVisible: boolean;
  toolbarH: number;
  view: "liste" | "partitions";
  versListe: () => void;
  versPartitions: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      ref={refBascule}
      data-testid="bascule-vues"
      className="print:hidden sticky z-10 -mx-4 px-4 py-2 mb-1 transition-[top] duration-300"
      style={{
        top: scrollVisible ? `calc(var(--nav-h) + ${toolbarH}px)` : "-3.5rem",
      }}
    >
      <FondDeBarre sousNavbar />
      <div className="flex w-full sm:max-w-[360px] items-center gap-0.5 rounded-full bg-secondary p-0.5">
        <button
          type="button"
          aria-pressed={view === "liste"}
          onClick={() => { if (view !== "liste") compter("cmd.setlist.vue.liste"); versListe(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full text-sm font-semibold transition-colors ${
            view === "liste" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          {t("setlists.detail.tabList")}
        </button>
        <button
          type="button"
          aria-pressed={view === "partitions"}
          onClick={() => { if (view !== "partitions") compter("cmd.setlist.vue.partitions"); versPartitions(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full text-sm font-semibold transition-colors ${
            view === "partitions" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Music className="h-3.5 w-3.5" aria-hidden="true" />
          {t("setlists.detail.tabCharts")}
        </button>
      </div>
    </div>
  );
}
