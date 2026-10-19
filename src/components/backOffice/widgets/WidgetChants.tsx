"use client";

// Widget 7 « Chants les plus joués » (lot U7, S5, docs/spec-statistiques.md § Modèle, question 4 ;
// table des widgets de U6) : admins seulement. `statsChants` sur la période réglée (3, 6, 12 mois,
// depuis le début ; 12 par défaut), sans autre filtre ; en tête le nombre de setlists comptées,
// lien vers la page Statistiques sur la même période ; puis les cinq premiers en barres
// décoratives (planche `bo-tableau-de-bord`, W_CHANTS), le nombre en texte au bout.
import { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChartColumn } from "lucide-react";
import { getSetlists } from "@/lib/firebase/setlists";
import { statsChants, type Periode } from "@/lib/stats/chantsJoues";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Reglages, Widget } from "@/types/backOffice";
import type { SongIndexEntry } from "@/types/song";
import { CadreWidget, LienTete, Message } from "./Cadre";

type PeriodeWidget = NonNullable<Reglages["periode"]>;

/** Le réglage, sa période de calcul et son paramètre d'adresse sur la page Statistiques. */
const PERIODES: Record<PeriodeWidget, { periode: Periode; adresse: string }> = {
  "3m": { periode: { mois: 3 }, adresse: "?periode=3" },
  "6m": { periode: { mois: 6 }, adresse: "?periode=6" },
  "12m": { periode: { mois: 12 }, adresse: "" },
  tout: { periode: "debut", adresse: "?periode=debut" },
};

async function lire() {
  const [setlists, reponse] = await Promise.all([getSetlists(), fetch("/songs-index.json")]);
  // La base compte plus de cent setlists : zéro veut dire que la lecture a échoué (comme la page).
  if (setlists.length === 0 || !reponse.ok) throw new Error("lecture");
  const index = (await reponse.json()) as { songs: SongIndexEntry[] };
  return { setlists, recueil: index.songs };
}

export function WidgetChants({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  // Même « aujourd'hui » que la page Statistiques : les deux comptes sont les mêmes.
  const aujourdhui = new Date().toISOString().split("T")[0];
  const { valeur, erreur } = useLecture(lire, aujourdhui);
  const reglage = PERIODES[widget.reglages.periode ?? "12m"] ?? PERIODES["12m"];
  const stats = useMemo(
    () => valeur && statsChants(valeur.setlists, valeur.recueil, { periode: reglage.periode, service: null, langue: null, presidence: null }, aujourdhui),
    [valeur, reglage, aujourdhui],
  );
  const cinq = stats?.plusJoues.slice(0, 5) ?? [];
  const max = cinq[0]?.setlists ?? 1;

  return (
    <CadreWidget
      id="chants" taille={widget.taille} Icone={ChartColumn} nom={t("tableauDeBord.widgets.chants")}
      complement={stats && stats.comptees.nombre > 0 && (
        <LienTete href={`/back-office/statistiques${reglage.adresse}`}>
          {t("tableauDeBord.chants.setlists", { count: stats.comptees.nombre })}
        </LienTete>
      )}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !stats ? <Message>{t("common.loading")}</Message>
        : cinq.length === 0 ? <Message>{t("tableauDeBord.chants.rien")}</Message>
        : (
          <ol>
            {cinq.map((l) => (
              <li key={l.slug} data-testid="ligne-plus-joue" className="flex min-w-0 items-center gap-2.5 py-[5px] text-[13px] text-foreground">
                <span data-champ="titre" className="w-[9.5rem] shrink-0 truncate">
                  {l.langue
                    ? <Link href={`/songs/${l.slug}`} className="hover:underline underline-offset-2">{l.titre}</Link>
                    : l.titre}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    data-barre aria-hidden="true" className="h-3.5 shrink-0 rounded-r-[5px] bg-foreground"
                    style={{ width: `calc((100% - 2rem) * ${l.setlists / max})` }}
                  />
                  <span data-champ="setlists" className="text-xs tabular-nums text-muted-foreground">{l.setlists}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
    </CadreWidget>
  );
}
