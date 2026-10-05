"use client";

import { usePathname } from "next/navigation";
import { cleDeTransition } from "@/lib/deuxVolets";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Une section en deux volets (lot U4 bis, Q2) n'est remontée qu'en la quittant : sa liste
  // reste montée d'un élément à l'autre ; `DeuxVolets` fait le fondu de ses volets.
  return (
    <div key={cleDeTransition(pathname)} className="page-fade">
      {children}
    </div>
  );
}
