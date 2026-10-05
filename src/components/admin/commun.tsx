"use client";

// Briques des blocs d'administration (sortis de `admin/page.tsx` au lot U6, B2 : chaque
// bloc vit désormais à sa place du Back-Office, et l'ancienne page les assemble encore
// tant que l'interrupteur est coupé). Anciens blocs : en français seulement (Q16).
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

export function Pill({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
        color ? "" : "bg-muted text-muted-foreground"
      }`}
      style={color ? { background: `${color}15`, color, border: `1px solid ${color}4d` } : undefined}
    >
      {label}
    </span>
  );
}

/** Liste courte en puces ambre, comme « Planning sans compte ». */
export function ListePuces({ titre, aide, items }: { titre: string; aide: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-muted-foreground">{titre}</h3>
      <p className="text-xs text-muted-foreground">{aide}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((n) => (
          <span
            key={n}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

/** « Page réservée aux administrateurs. », avec « Se connecter » pour un visiteur. */
export function ReserveAuxAdmins({ connecte, retour }: { connecte: boolean; retour: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
      <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{t("backOffice.adminReserve")}</p>
      {!connecte && (
        <Link href={`/login?from=${retour}`} className="text-sm text-foreground underline underline-offset-2 hover:text-muted-foreground">
          {t("backOffice.seConnecter")}
        </Link>
      )}
    </div>
  );
}
