import { useEffect, useRef } from "react";
import type { FSSetlist, SetlistItem } from "@/types/setList";

/** « Mode louange » de l'accueil (lot U4 bis, B1, docs/spec-pages-en-grand.md, Q14) : arrive
 *  avec `?louange=1`. `entrerEnLouange` est lue dans le corps de l'effet, version du rendu
 *  où il s'exécute (comme avant l'extraction). */
export function useEntreeLouange({ setlist, loadContents, entrerEnLouange }: {
  setlist: FSSetlist | null;
  loadContents: (items: SetlistItem[]) => Promise<string[]>;
  entrerEnLouange: (pleinEcran: boolean) => Promise<boolean>;
}) {
  // « Mode louange » de l'accueil (lot U4 bis, B1, docs/spec-pages-en-grand.md, Q14) arrive
  // avec `?louange=1` : le mode louange s'ouvre dès la setlist lue, sans plein écran natif
  // (il faut un geste sur cette page) ; l'adresse perd le paramètre, retour arrière ne le relance pas.
  const louangeDemandee = useRef(false);
  useEffect(() => {
    if (!setlist || louangeDemandee.current) return;
    if (new URLSearchParams(window.location.search).get("louange") !== "1") return;
    louangeDemandee.current = true;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    // Même contrôle que le bouton : chants non chargés, scans 简谱 absents du cache hors ligne.
    requestAnimationFrame(() => { void entrerEnLouange(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lancé une fois (louangeDemandee), sur la setlist lue
  }, [setlist, loadContents]);
}
