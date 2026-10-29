"use client";

// Messages dans l'en-tête (piste A, BO2) : sur téléphone et tablette en portrait, la barre du bas du
// Back-Office a cinq onglets fixes et Messages n'y est pas ; c'est une icône à pastille à côté de la
// cloche, pour qui a l'entrée Messages. Sur grand écran, la barre latérale porte l'entrée (la barre
// du haut est cachée par le CSS). Monté seulement quand il sert : les comptes ne sont lus qu'alors.
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";
import { entreeBackOffice } from "@/lib/navigation";
import { usePastilles } from "@/lib/tableauDeBord/usePastilles";

export function IconeMessages({ boutonClassName }: { boutonClassName: string }) {
  const { t } = useTranslation();
  const n = usePastilles(["messages"]).messages ?? 0;
  return (
    <Link
      href={entreeBackOffice("messages").href}
      data-testid="icone-messages"
      aria-label={n > 0 ? t("backOffice.barre.messagesNonLus", { count: n }) : t("backOffice.entrees.messages")}
      className={`relative ${boutonClassName}`}
    >
      <Inbox className="h-[18px] w-[18px]" aria-hidden />
      {n > 0 && (
        <span
          data-testid="pastille"
          aria-hidden
          className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-destructive px-1 text-center text-[11px] font-bold leading-[18px] text-destructive-foreground"
        >
          {n}
        </span>
      )}
    </Link>
  );
}
