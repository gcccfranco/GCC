"use client";

// « Recalculer depuis l'organigramme » (lot U6, R4) : pose équipes et référents
// (`dansEquipes`, `referentDe`) de tous les membres des équipes — les pôles ne
// bougent pas. Idempotent : rien à confirmer. Admins seuls (`{ tous: true }` de
// /api/equipes/poles). Retours du 06/10/2026 : l'onglet Import qui le portait est
// retiré. Agencement v18 (B8 de docs/spec-agencement-v18.md) : le bouton passe dans
// l'en-tête d'Équipes (outil en contour), son résultat s'affiche sous l'en-tête :
// le hook rend les deux morceaux, que la page pose chacun à sa place.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { authHeader } from "@/lib/firebase/setlists";

export function useRecalculOrganigramme() {
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

  const libelle = t("equipes.recalcul.bouton");
  const bouton = (
    <button
      type="button"
      onClick={() => void recalculer()}
      disabled={etat === "busy"}
      aria-label={libelle}
      title={t("equipes.recalcul.aide")}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-background px-3 text-[14px] font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] transition-colors hover:bg-secondary disabled:opacity-60 sm:px-4"
    >
      <RefreshCw className={`h-4 w-4 shrink-0 ${etat === "busy" ? "animate-spin" : ""}`} aria-hidden />
      <span className="hidden sm:inline">{libelle}</span>
    </button>
  );

  const resultat =
    typeof etat === "number" ? (
      <p className="mt-2 text-sm text-foreground" aria-live="polite">{t("equipes.recalcul.fait", { count: etat })}</p>
    ) : erreur ? (
      <p className="mt-2 text-sm text-destructive" aria-live="polite">{erreur}</p>
    ) : null;

  return { bouton, resultat };
}
