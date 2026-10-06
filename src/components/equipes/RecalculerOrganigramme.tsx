"use client";

// « Recalculer depuis l'organigramme » (lot U6, R4) : pose équipes et référents
// (`dansEquipes`, `referentDe`) de tous les membres des équipes — les pôles ne
// bougent pas. Idempotent : rien à confirmer. Admins seuls (`{ tous: true }` de
// /api/equipes/poles). Retours du 06/10/2026 : l'onglet Import qui le portait est
// retiré ; le bouton passe au bas de Équipes › Organigramme, discret.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authHeader } from "@/lib/firebase/setlists";
import { Button } from "@/components/ui/button";

export function RecalculerOrganigramme() {
  const { t } = useTranslation();
  const [etat, setEtat] = useState<"busy" | number | null>(null);
  const [erreur, setErreur] = useState("");

  async function recalculer() {
    setEtat("busy");
    setErreur("");
    try {
      const res = await fetch("/api/equipes/poles", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ tous: true }),
      });
      const json = (await res.json().catch(() => ({}))) as { maj?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setEtat(json.maj ?? 0);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t("equipes.recalcul.erreur"));
      setEtat(null);
    }
  }

  return (
    <div className="mt-8 border-t border-border pt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void recalculer()} disabled={etat === "busy"} variant="outline" size="sm">
          {etat === "busy" ? "…" : t("equipes.recalcul.bouton")}
        </Button>
        {typeof etat === "number" && (
          <p className="text-sm text-foreground" aria-live="polite">{t("equipes.recalcul.fait", { count: etat })}</p>
        )}
        {erreur && <p className="text-sm text-destructive" aria-live="polite">{erreur}</p>}
      </div>
      <p className="text-xs text-muted-foreground max-w-prose">{t("equipes.recalcul.aide")}</p>
    </div>
  );
}
