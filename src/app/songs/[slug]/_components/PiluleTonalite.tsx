import type { Dispatch, SetStateAction } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { CustomizeState } from "@/components/customPanel/CustomizePanel";
import { keyOptions, semitonesTo, getTransposedKey } from "@/lib/transpose";
import { TOUCHER_44 } from "@/lib/toucher44";
import { compter } from "@/lib/usage";

/** Transposition rapide de la barre du chant : − / liste des tonalités / +. */
export function PiluleTonalite({ currentKey, originalKey, keySuffix, setCustomize }: {
  currentKey: string;
  originalKey: string;
  keySuffix: (k: string) => string;
  setCustomize: Dispatch<SetStateAction<CustomizeState>>;
}) {
  const { t } = useTranslation();
  return (
    <div data-testid="pilule-tonalite" className="raised flex items-center gap-0.5 flex-1 min-w-0 sm:flex-none rounded-full p-0.5">
      <Button
        variant="ghost"
        size="icon-lg"
        className={`${TOUCHER_44} h-9 w-9 lg:h-8 lg:w-8 rounded-full text-sm font-bold`}
        onClick={() => {
          compter("cmd.chant.transposer");
          setCustomize((c) => {
            const s = c.semitones - 1;
            return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
          });
        }}
      >
        −
      </Button>
        {/* Fermé : la tonalité seule sur tactile (le suffixe rognait « E ( » à
            six commandes), tonalité + suffixe sur ordinateur ; la liste native,
            transparente par-dessus, garde ses libellés complets. */}
        <span className="relative flex-1 min-w-12 h-9 lg:h-8 flex items-center justify-center gap-0.5 px-1.5 rounded-full text-foreground text-sm font-semibold focus-within:ring-2 focus-within:ring-ring/30">
          {/* Pilule étroite : le mot passe entier ou pas du tout (parcours du 13/11, constat 5 : « T… A », « ㅣC ») ;
              la lettre, placée en premier (`order`), ne tombe jamais ; le mot qui ne tient plus va à la ligne, rejetée sous le cadre (`gap-y-8`) et masquée. */}
          <span data-testid="tonalite-courante" className="flex h-5 min-w-0 flex-row-reverse flex-wrap items-baseline justify-center gap-y-8 overflow-hidden" aria-hidden>
            <span data-testid="tonalite-mot" className="mr-1 whitespace-nowrap text-[13px] font-semibold text-muted-foreground">{t("customize.panel.keyCourt")}</span>
            <span className="order-first flex shrink-0 items-baseline whitespace-nowrap">
              <span data-testid="tonalite-lettre" className="text-[15px] font-bold text-foreground">{currentKey}</span>
              <span className="suffixe-tonalite ml-1 hidden lg:inline">{keySuffix(currentKey).trim()}</span>
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          <select
            aria-label={t("customize.panel.key")}
            value={currentKey}
            onChange={(e) => {
              compter(e.target.value === originalKey ? "cmd.chant.toniqueOrigine" : "cmd.chant.transposer");
              setCustomize((c) => {
              const key = e.target.value;
              const diff = semitonesTo(originalKey, key);
              return { ...c, semitones: diff, currentKey: key };
              });
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {keyOptions(currentKey, originalKey).map((k) => (
              <option key={k} value={k}>
                {k}
                {keySuffix(k)}
              </option>
            ))}
          </select>
        </span>
      <Button
        variant="ghost"
        size="icon-lg"
        className={`${TOUCHER_44} h-9 w-9 lg:h-8 lg:w-8 rounded-full text-sm font-bold`}
        onClick={() => {
          compter("cmd.chant.transposer");
          setCustomize((c) => {
            const s = c.semitones + 1;
            return { ...c, semitones: s, currentKey: getTransposedKey(originalKey, s) };
          });
        }}
      >
        +
      </Button>
    </div>
  );
}
