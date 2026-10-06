"use client";

import { usePathname } from "next/navigation";
import { cleDeTransition } from "@/lib/deuxVolets";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Une section en deux volets (lot U4 bis, Q2 ; Chants, lot U5, Q15) n'est remontée qu'en la
  // quittant : sa liste reste montée d'un élément à l'autre ; `DeuxVolets` (ou `ChantsVolets`)
  // fait le fondu de ses volets.
  return (
    <div key={cleDeTransition(pathname)} className="page-fade">
      {children}
    </div>
  );
}
