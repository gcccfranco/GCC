"use client";

// Widget 11 « Calendrier » (lot U8, C8, docs/spec-calendrier.md § Écrans ; cadre de U6,
// planche `bo-tableau-de-bord`). Les entrées de la page (`entreesCalendrier`), sur les
// sources et « Seulement moi » de ses réglages. S : « Prochains jours », trois jours au plus
// sur quatorze, une ligne par jour. M : « Cette semaine », les sept jours à points, puis
// les lignes des jours qui restent. L : le mois à points (la grille du téléphone) et sa
// légende. Toucher un jour ouvre la page du calendrier sur ce jour.
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { GrillePoints } from "@/components/calendrier/GrillePoints";
import { chargerCalendrier } from "@/lib/calendrier/charger";
import { entreesCalendrier, filtrerEntrees, sourcesPermises, type EntreeCalendrier, type ProfilCalendrier } from "@/lib/calendrier/entrees";
import { joursDeLaGrille, titreJour, titreMois } from "@/lib/calendrier/grille";
import {
  fenetreDuWidget, jourDuWidget, joursRestants, lienDuJour, ligneDuJour, prochainsJours, semaineDe, sourcesDuWidget,
} from "@/lib/calendrier/widget";
import { lireSheetEvenements } from "@/lib/evenements/sheet";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/backOffice";
import type { NotifLang } from "@/types/user";
import { CadreWidget, LienTete, Message, Rangee } from "./Cadre";

const POINTS_PAR_JOUR = 4;

export function WidgetCalendrier({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const lang: NotifLang = i18n.language === "zh-CN" ? "zh-CN" : "fr";
  const { user, profile, loading } = useProfile();
  const profil = profile as ProfilCalendrier | null;
  const today = todayIso();
  const { debut, fin } = fenetreDuWidget(widget.taille, today);
  // Lu une fois le profil connu : « mes services » et les pôles en dépendent.
  const pret = !loading && user !== null;

  const { valeur: base, erreur } = useLecture(
    async () => (pret ? chargerCalendrier(user, profil, today) : null),
    pret ? `${user.uid}|${today}` : "",
  );
  // Le Sheet des évènements, sur la période du widget : sans lui, le reste s'affiche.
  const { valeur: sheet } = useLecture(() => lireSheetEvenements(debut, fin), `${debut}|${fin}`);

  const r = widget.reglages;
  const parJour = useMemo(() => {
    const m = new Map<string, EntreeCalendrier[]>();
    if (!user || !base || !sheet) return null;
    const toutes = entreesCalendrier(debut, fin, { ...base, sheet: sheet.entrees }, { user, profile: profil, lang, today });
    const filtre = { sources: sourcesDuWidget(r, sourcesPermises(user, profil)), seulementMoi: r.seulementMoi === true };
    for (const e of filtrerEntrees(toutes, filtre)) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [user, profil, base, sheet, debut, fin, lang, today, r]);

  const complement = widget.taille === "s" ? t("calendrier.widget.prochainsJours")
    : widget.taille === "m" ? t("calendrier.widget.cetteSemaine")
    : titreMois(today.slice(0, 7), lang, true);
  const jours = widget.taille === "s" ? (parJour ? prochainsJours(parJour, today) : [])
    : widget.taille === "m" ? (parJour ? joursRestants(parJour, today) : [])
    : [];

  return (
    <CadreWidget
      id="calendrier" taille={widget.taille} Icone={CalendarDays} nom={t("tableauDeBord.widgets.calendrier")}
      complement={<LienTete href="/back-office/calendrier">{complement}</LienTete>}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !parJour ? <Message>{t("common.loading")}</Message>
        : (
          <>
            {widget.taille === "m" && <Semaine parJour={parJour} today={today} lang={lang} />}
            {widget.taille === "l" && (
              <GrillePoints
                mois={today.slice(0, 7)} jours={joursDeLaGrille(today.slice(0, 7))} parJour={parJour} aujourdhui={today}
                choisi={null} lang={lang} onChoisir={(date) => router.push(lienDuJour(date))}
              />
            )}
            {widget.taille !== "l" && (jours.length === 0
              ? <Message>{t(widget.taille === "s" ? "calendrier.widget.rienS" : "calendrier.widget.rienM")}</Message>
              : (
                <div>
                  {jours.map((date) => {
                    const { titres, heure } = ligneDuJour(parJour.get(date) ?? [], lang);
                    return (
                      <Rangee key={date} testId="ligne-calendrier" href={lienDuJour(date)} detail={heure || undefined}>
                        <span className="flex gap-2.5">
                          <b className="w-14 shrink-0 font-semibold">{jourDuWidget(date, today, lang)}</b>
                          <span className="min-w-0">{titres}</span>
                        </span>
                      </Rangee>
                    );
                  })}
                </div>
              ))}
            {sheet?.injoignable && <p className="mt-2 text-xs text-muted-foreground">{t("calendrier.widget.sheetInjoignable")}</p>}
          </>
        )}
    </CadreWidget>
  );
}

/** M : les sept jours de la semaine, un point coloré par entrée (quatre au plus). */
function Semaine({ parJour, today, lang }: { parJour: Map<string, EntreeCalendrier[]>; today: string; lang: NotifLang }) {
  const { t } = useTranslation();
  return (
    <div data-testid="semaine" className="mb-2 grid grid-cols-7 gap-1.5">
      {semaineDe(today).map((date) => {
        const entrees = parJour.get(date) ?? [];
        const estAujourdhui = date === today;
        return (
          <Link
            key={date} href={lienDuJour(date)} data-jour={date} aria-current={estAujourdhui ? "date" : undefined}
            aria-label={t("calendrier.jourAria", { jour: titreJour(date, lang), count: entrees.length })}
            className={cn(
              "flex min-w-0 flex-col items-center rounded-xl px-1 py-1.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
              estAujourdhui ? "bg-foreground text-background" : "bg-muted/60 hover:bg-muted",
            )}
          >
            <span className="text-[11px] opacity-70">{jourCourtSemaine(date, lang)}</span>
            <span className="text-sm font-bold tabular-nums">{Number(date.slice(8))}</span>
            <span className="mt-0.5 flex h-2 justify-center gap-[3px]">
              {entrees.slice(0, POINTS_PAR_JOUR).map((e) => (
                <span
                  key={e.cle} data-source={e.source} aria-hidden
                  className={cn("h-1.5 w-1.5 rounded-full", estAujourdhui && "ring-1 ring-background")}
                  style={{ background: e.couleur }}
                />
              ))}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** « lun. » ; « 周一 ». */
const jourCourtSemaine = (date: string, lang: NotifLang) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", { weekday: "short", timeZone: "UTC" });
