"use client";

// Widget 10 « Raccourcis » (lot U6, B4) : créer une tâche, un évènement, une setlist
// (« Pour quel service ? »), notifier — ceux que les droits permettent.
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Megaphone, Plus, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { raccourcisPermis } from "@/lib/tableauDeBord/donnees";
import type { Widget } from "@/types/backOffice";
import { CadreWidget } from "./Cadre";

export function WidgetRaccourcis({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const raccourcis = raccourcisPermis(user, profile, widget.reglages);

  return (
    <CadreWidget id="raccourcis" taille={widget.taille} Icone={Sparkles} nom={t("tableauDeBord.widgets.raccourcis")}>
      <div className="flex flex-wrap gap-2">
        {raccourcis.map(({ id, href }) => {
          const Icone = id === "notifier" ? Megaphone : Plus;
          return (
            <Link
              key={id} href={href}
              className="raised inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
            >
              <Icone className="h-3.5 w-3.5" aria-hidden />
              {t(`tableauDeBord.raccourcis.${id}`)}
            </Link>
          );
        })}
      </div>
    </CadreWidget>
  );
}
