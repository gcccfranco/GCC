"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Square } from "lucide-react";
import { creerHorloge, dureeTemps, type Accent, type Mesure } from "@/lib/performance/metronome";

/** Bande des temps du métronome (lot MT, piste A « Un, deux, trois, quatre ») : une pastille par temps, accents par la
 *  forme, le temps en cours s'allume. Silencieuse ; la page descend de 36 px pour lui faire place (PerformanceMode).
 *  Toucher la bande (hors bouton ▶ / ■) appelle `onOuvrir`. Style : `[data-bande-temps]` dans globals.css. */
export function BandeTemps({
  tempo,
  mesure,
  accents,
  marche,
  onMarche,
  onOuvrir,
  top,
  telephone,
}: {
  tempo: number;
  mesure: Mesure;
  accents: Accent[];
  marche: boolean;
  onMarche: () => void;
  onOuvrir: () => void;
  top: string;
  telephone: boolean;
}) {
  const { t } = useTranslation();
  const [pos, setPos] = useState<{ temps: number; n: number } | null>(null);
  const horloge = useRef(creerHorloge());
  const duree = dureeTemps(tempo, mesure);
  const dernier = useRef({ duree, temps: mesure.temps });

  // Une image sur deux n'a rien à dire : setState seulement quand le temps change.
  useEffect(() => {
    if (!marche) { horloge.current.arreter(); setPos(null); return; }
    const h = horloge.current;
    h.demarrer(performance.now(), dernier.current.duree, dernier.current.temps);
    let raf = 0;
    let n = -1;
    const boucle = () => {
      const p = h.position(performance.now());
      if (p) {
        const k = p.mesure * 100000 + p.temps;
        if (k !== n) { n = k; setPos({ temps: p.temps, n: k }); }
      }
      raf = requestAnimationFrame(boucle);
    };
    boucle();
    return () => cancelAnimationFrame(raf);
  }, [marche]);

  useEffect(() => {
    if (dernier.current.duree !== duree) horloge.current.changerTempo(duree, performance.now());
    if (dernier.current.temps !== mesure.temps) horloge.current.changerMesure(mesure.temps, performance.now());
    dernier.current = { duree, temps: mesure.temps };
  }, [duree, mesure.temps]);

  const nom = t(marche ? "performance.metronomeArreter" : "performance.metronomeLancer");
  const douze = telephone && mesure.temps >= 12;
  return (
    <div
      data-bande-temps
      className="absolute left-0 right-0 bg-background"
      style={{ top, height: "36px", zIndex: 15, "--duree-temps": `${duree}ms` } as React.CSSProperties}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div data-bande-interieur>
        <button
          type="button"
          data-bande-ouvrir
          aria-label={t("performance.metronomeBande", { tempo, mesure: `${mesure.temps}/${mesure.unite}` })}
          onClick={onOuvrir}
        />
        <div data-bande-pastilles aria-hidden="true">
          {mesure.groupes.map((g, gi) => {
            const d = mesure.groupes.slice(0, gi).reduce((a, b) => a + b, 0);
            return (
              <div key={gi} data-bande-groupe style={{ flexGrow: g, maxWidth: `${g * 96 + (g - 1) * 6}px` }}>
                {Array.from({ length: g }, (_, j) => {
                  const i = d + j;
                  const actif = pos?.temps === i;
                  const chiffre = !douze || i % 3 === 0 || actif;
                  return (
                    <span
                      key={actif ? `a${pos.n}` : `r${i}`}
                      data-temps={i + 1}
                      data-accent={accents[i] ?? "faible"}
                      data-actif={actif ? "" : undefined}
                      data-compact={douze ? "" : undefined}
                    >
                      {chiffre ? i + 1 : null}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        {telephone && (
          <button type="button" data-metronome-marche aria-pressed={marche} aria-label={nom} onClick={onMarche}>
            <span aria-hidden="true" className="flex items-center"><span className="-mr-1 text-xl leading-none">♩</span> {tempo}</span>
            {marche ? <Square className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
