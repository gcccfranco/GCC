import type { Ref } from "react";
import { List, Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import { compter } from "@/lib/usage";
import { FondDeBarre } from "@/components/layout/FondDeBarre";
import { TOUCHER_SEGMENT } from "@/lib/toucher44";

/** Bascule « Liste | Partitions » (setlist G, Q11) : sous l'en-tête, elle colle
 *  sous la barre et s'escamote avec elle. Pleine largeur sur téléphone. Elle s'escamote par
 *  son `top` collant et non par un transform, qui la faisait remonter sur l'en-tête avant
 *  qu'elle ne colle ; 3.5rem = sa hauteur (py-2 + p-0.5 + h-9).
 *  `dansBarre` (vue Partitions, un volet) : la bascule compacte de la barre d'outils, h-8, ni fond ni collage
 *  propres ; au téléphone, icônes seules (le nom accessible reste « Liste » / « Partitions »). */
export function BasculeVues({
  refBascule,
  scrollVisible = true,
  toolbarH = 0,
  dansBarre = false,
  view,
  versListe,
  versPartitions,
}: {
  refBascule?: Ref<HTMLDivElement>;
  scrollVisible?: boolean;
  toolbarH?: number;
  dansBarre?: boolean;
  view: "liste" | "partitions";
  versListe: () => void;
  versPartitions: () => void;
}) {
  const { t } = useTranslation();
  if (dansBarre) {
    const segment = `${TOUCHER_SEGMENT} flex items-center justify-center gap-1.5 h-7 rounded-full text-sm font-semibold transition-colors max-sm:w-9 sm:px-3`;
    return (
      <div data-testid="bascule-vues" className="print:hidden flex shrink-0 items-center gap-0.5 rounded-full bg-secondary p-0.5">
        {([
          ["liste", List, "setlists.detail.tabList", versListe, "cmd.setlist.vue.liste"],
          ["partitions", Music, "setlists.detail.tabCharts", versPartitions, "cmd.setlist.vue.partitions"],
        ] as const).map(([v, Icone, cle, aller, usage]) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            aria-label={t(cle)}
            onClick={() => { if (view !== v) compter(usage); aller(); }}
            className={`${segment} ${view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icone className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="max-sm:sr-only">{t(cle)}</span>
          </button>
        ))}
      </div>
    );
  }
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
