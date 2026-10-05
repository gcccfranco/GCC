"use client";

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Chants se remonte par section et règle son fondu lui-même (lot U5, Q15) : remonter
  // la page à chaque chant rechargerait la liste du volet de gauche (songs/ChantsVolets).
  const cle = /^\/songs(\/|$)/.test(pathname) ? "/songs" : pathname;
  return (
    <div key={cle} className="page-fade">
      {children}
    </div>
  );
}
