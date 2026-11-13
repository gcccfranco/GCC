"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChoixNotation } from "@/components/song/ChoixNotation";
import { keyLike, keyOptions } from "@/lib/transpose";
import { TOUCHER_44 } from "@/lib/toucher44";

/** ♯ et ♭ en caractères musicaux (police Noto Music, classe `.alteration`) ; « 1=Bb » → 1=B♭. */
function Tonalite({ k }: { k: string }) {
  const m = k.match(/^(.*?[A-G])([#b♯♭])(.*)$/);
  if (!m) return <>{k}</>;
  return <>{m[1]}<span className="alteration">{m[2] === "#" ? "♯" : m[2] === "b" ? "♭" : m[2]}</span>{m[3]}</>;
}

/** L'armure : la tonalité lue, en bouton ; sa fenêtre offre les douze tonalités, la notation, le capo (lot RU, RU-1).
 *  Pleine = ma tonalité, au contour = celle de l'équipe (ou la recommandée) ; aucune couleur ajoutée. */
export function Armure({
  titre, langue, tonaliteOrigine, tonaliteReco, tonaliteEquipe, tonalite, onChange, portee, lectureSeule, capo, onCapo, onChangerEquipe,
}: {
  titre: string;
  langue: "fr" | "zh";
  tonaliteOrigine: string;
  tonaliteReco?: string | null;
  tonaliteEquipe?: string | null;
  tonalite: string;
  onChange?: (k: string) => void;
  portee: "page" | "appareil";
  lectureSeule?: boolean;
  capo?: number;
  onCapo?: (n: number) => void;
  onChangerEquipe?: (k: string) => void;
}) {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const reference = tonaliteEquipe ?? tonaliteReco ?? tonaliteOrigine;
  const choisie = keyLike(tonaliteOrigine, tonalite);
  const options = keyOptions(choisie, tonaliteOrigine, tonaliteReco, tonaliteEquipe);
  const etat = lectureSeule ? "lecture" : choisie !== keyLike(tonaliteOrigine, reference) ? "moi" : "equipe";
  const texte = (k: string) => (langue === "zh" ? `1=${k}` : k);

  // Flèches : la tonalité voisine, comme un groupe de boutons radio.
  function onKeyDown(e: KeyboardEvent, i: number) {
    const pas = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!pas) return;
    e.preventDefault();
    const j = (i + pas + options.length) % options.length;
    onChange?.(options[j]);
    refs.current[j]?.focus();
  }

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="armure"
          data-armure={etat}
          aria-label={t("armure.aria", { key: tonalite })}
          aria-haspopup="dialog"
          aria-expanded={ouvert}
          className={`${TOUCHER_44} h-8 min-w-[34px] whitespace-nowrap rounded-[9px] px-[7px] text-[17px] font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            etat === "moi" ? "bg-foreground text-background" : `text-foreground ${etat === "lecture" ? "border-[1.5px] border-dashed border-foreground" : "shadow-[inset_0_0_0_1.5px_hsl(var(--foreground))]"}`
          }`}
        >
          <Tonalite k={texte(tonalite)} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-testid="fenetre-armure"
        role="dialog"
        aria-label={t("armure.titre")}
        align="end"
        collisionPadding={12}
        className="w-[min(320px,calc(100vw-24px))] rounded-2xl border border-border bg-popover p-4"
      >
        <p className="text-[15px] font-semibold">{t("armure.titre")}</p>
        <p className="mb-3 text-xs text-muted-foreground">{t(portee === "page" ? "armure.pourMoiPage" : "armure.pourMoiAppareil")}</p>
        {lectureSeule ? (
          <p className="whitespace-nowrap text-sm">{t("armure.equipeJoue", { key: reference })}</p>
        ) : (
          <>
            <div role="radiogroup" aria-label={t("setlists.form.songKeyLabel", { title: titre })} className="grid grid-cols-4 gap-1.5">
              {options.map((k, i) => {
                const on = k === choisie;
                const legende = k === tonaliteEquipe ? t("armure.equipe") : k === tonaliteReco ? t("setlists.editeur.reco") : k === tonaliteOrigine ? t("setlists.editeur.orig") : on ? t("armure.moi") : "";
                return (
                  <button
                    key={k}
                    ref={(el) => { refs.current[i] = el; }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => onChange?.(k)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    className={`flex h-[52px] flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "bg-foreground text-background" : "bg-muted text-foreground"}`}
                  >
                    <span className="text-[19px] font-semibold leading-none"><Tonalite k={k} /></span>
                    <span className="h-[11px] whitespace-nowrap text-[10.5px] leading-[11px] opacity-70">{legende}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3"><ChoixNotation variante="fenetre" /></div>
            {onCapo && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm">{t("performance.capo")}</span>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={t("performance.capoLower")} disabled={!capo} onClick={() => onCapo(Math.max(0, (capo ?? 0) - 1))} className={`${TOUCHER_44} h-9 w-9 rounded-full bg-muted text-base font-semibold disabled:opacity-40`}>−</button>
                  <span className="min-w-6 text-center tabular-nums">{capo ?? 0}</span>
                  <button type="button" aria-label={t("performance.capoRaise")} onClick={() => onCapo((capo ?? 0) + 1)} className={`${TOUCHER_44} h-9 w-9 rounded-full bg-muted text-base font-semibold`}>+</button>
                </span>
              </div>
            )}
            {onChangerEquipe && (
              <button type="button" onClick={() => onChangerEquipe(tonalite)} className="mt-2 flex h-11 w-full items-center justify-center text-sm font-medium underline underline-offset-2">
                {t("armure.changerEquipe")}
              </button>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
