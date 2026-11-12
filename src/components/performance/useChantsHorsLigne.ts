"use client";

import { useEffect, useState } from "react";

/** Hors ligne, seuls les chants déjà chargés (`slugsCharges`) ou dont `/api/song/{slug}` est en cache s'ouvrent.
 *  `disponible(slug)` est toujours vrai en ligne. */
export function useChantsHorsLigne(slugs: string[], slugsCharges: string[]) {
  const [enLigne, setEnLigne] = useState(true);
  const [enCache, setEnCache] = useState<Set<string>>(new Set());
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => { window.removeEventListener("online", maj); window.removeEventListener("offline", maj); };
  }, []);
  const cle = slugs.join("\n");
  useEffect(() => {
    if (enLigne || typeof caches === "undefined") return;
    let annule = false;
    void Promise.all(slugs.map((s) => caches.match("/api/song/" + s).then((r) => (r ? s : null), () => null)))
      .then((ok) => { if (!annule) setEnCache(new Set(ok.filter((s): s is string => !!s))); });
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `cle` résume `slugs`
  }, [enLigne, cle]);
  const charges = new Set(slugsCharges);
  return { enLigne, disponible: (slug: string) => enLigne || charges.has(slug) || enCache.has(slug) };
}
