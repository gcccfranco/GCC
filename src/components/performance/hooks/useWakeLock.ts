import { useEffect } from "react";

/** Écran allumé tant que le mode louange est ouvert (redemandé au retour sur l'onglet). */
export function useWakeLock() {
  useEffect(() => {
    type WakeLock = { request: (t: string) => Promise<{ release: () => Promise<void> }> };
    let sentinel: { release: () => Promise<void> } | null = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          sentinel = await (navigator as unknown as { wakeLock: WakeLock }).wakeLock.request("screen");
        }
      } catch { /* optional feature */ }
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sentinel?.release();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
