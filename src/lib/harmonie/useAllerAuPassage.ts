"use client";

// Harmonie (H6-2) : la page chant ouverte depuis une fiche (`?passage=<uid JSON>`) fait défiler la section visée
// au centre et l'entoure 2,5 s, comme « Montrer ». Une fois ; section introuvable : rien.

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { idDeSection } from "@/lib/setlist/sectionOrigins";

export function useAllerAuPassage() {
  const brut = useSearchParams().get("passage");
  const fait = useRef(false);
  useEffect(() => {
    if (!brut || fait.current) return;
    let uid: unknown;
    try { uid = JSON.parse(brut); } catch { return; }
    if (typeof uid !== "string") return;
    let essais = 0;
    let retrait: ReturnType<typeof setTimeout> | undefined;
    // La partition arrive après le premier rendu : on attend la section (quelques secondes au plus).
    const minuteur = setInterval(() => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section-uids]"));
      const uids = (el: HTMLElement) => (el.dataset.sectionUids ?? "").split(" ");
      const el =
        sections.find((s) => uids(s).includes(uid)) ??
        sections.find((s) => uids(s).some((u) => idDeSection(u) === idDeSection(uid)));
      if (el) {
        clearInterval(minuteur);
        fait.current = true;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.add("harmonie-surligne");
        retrait = setTimeout(() => el.classList.remove("harmonie-surligne"), 2500);
      } else if (++essais >= 40) clearInterval(minuteur);
    }, 250);
    return () => { clearInterval(minuteur); clearTimeout(retrait); };
  }, [brut]);
}
