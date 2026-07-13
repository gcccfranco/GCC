"use client";

import { useEffect, useState } from "react";

export type SheetStatus = "loading" | "fresh" | "stale";

/**
 * Charge un planning depuis Google Sheets en distinguant trois états :
 * - `loading` : requête en cours (on affiche le fallback compilé) ;
 * - `fresh`   : données en ligne reçues ;
 * - `stale`   : requête échouée ou vide → on reste sur le fallback, qui peut
 *   être périmé. À signaler à l'utilisateur (cf. StaleBanner) pour qu'il ne
 *   lise pas un planning faux sans le savoir.
 *
 * `fetcher` est supposé stable (fonction module-level) ; il n'est appelé
 * qu'au montage.
 */
export function useSheet<T>(fetcher: () => Promise<T[]>, fallback: T[]): {
  rows: T[];
  status: SheetStatus;
} {
  const [rows, setRows] = useState<T[]>(fallback);
  const [status, setStatus] = useState<SheetStatus>("loading");

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((d) => {
        if (!alive) return;
        if (d.length) {
          setRows(d);
          setStatus("fresh");
        } else {
          setStatus("stale");
        }
      })
      .catch(() => {
        if (alive) setStatus("stale");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rows, status };
}
