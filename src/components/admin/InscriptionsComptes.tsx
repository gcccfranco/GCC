"use client";

// Équipes › Inscriptions (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 761) : ouvrir ou
// fermer la création de comptes. Admins seuls (config/app).
// Agencement v18 (B9 de docs/spec-agencement-v18.md) : en tête de Back-Office › Équipes ›
// Personnes, la version courte (`court`) : un interrupteur, l'état, les comptes de la semaine et
// « Voir les n » ; l'ancienne administration garde la carte d'avant.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/firebase/users";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InscriptionsComptes({
  court = false,
  nouveaux = 0,
  onVoir,
}: {
  court?: boolean;
  /** Comptes créés ces sept derniers jours (« Nouveau » dans la liste). */
  nouveaux?: number;
  /** « Voir les n » : montre les nouveaux comptes dans la liste. */
  onVoir?: () => void;
}) {
  const { t } = useTranslation();
  const [regOpen, setRegOpen] = useState<boolean | null>(null);
  const [togglingReg, setTogglingReg] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getRegistrationOpen().then(setRegOpen);
  }, []);

  async function toggleRegistration() {
    if (regOpen === null) return;
    setTogglingReg(true);
    setError("");
    try {
      await setRegistrationOpen(!regOpen);
      setRegOpen(!regOpen);
    } catch {
      setError(t("admin.inscr.erreur"));
    } finally {
      setTogglingReg(false);
    }
  }

  if (court) {
    return (
      <section aria-label={t("admin.inscriptions")} className="raised rounded-2xl px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Switch
            checked={!!regOpen}
            disabled={regOpen === null || togglingReg}
            onCheckedChange={() => void toggleRegistration()}
            // Un nom fixe : l'interrupteur annonce lui-même son état (activé, désactivé).
            aria-label={t("admin.inscr.ouvertes")}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground">
              {regOpen === null ? t("common.loading") : regOpen ? t("admin.inscr.ouvertes") : t("admin.inscr.fermees")}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {regOpen ? t("admin.inscr.aideOuvertes") : t("admin.inscr.aideFermees")}
            </p>
          </div>
          {nouveaux > 0 && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                {t("admin.inscr.nouveaux", { count: nouveaux })}
              </span>
              {onVoir && (
                <button
                  type="button"
                  onClick={onVoir}
                  className="h-9 rounded-full bg-background px-3.5 text-[13px] font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary"
                >
                  {t("admin.inscr.voir", { count: nouveaux })}
                </button>
              )}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {t("admin.inscriptions")}
      </h2>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              regOpen === null ? "bg-muted" : regOpen ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <p className="text-sm text-foreground">
            {regOpen === null
              ? t("common.loading")
              : regOpen
              ? t("admin.inscr.phraseOuvertes")
              : t("admin.inscr.phraseFermees")}
          </p>
        </div>
        <Button
          onClick={toggleRegistration}
          disabled={regOpen === null || togglingReg}
          variant={regOpen ? "outline" : "default"}
          className={`shrink-0 h-11 ${regOpen ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`}
        >
          {togglingReg ? "…" : regOpen ? t("admin.inscr.fermer") : t("admin.inscr.ouvrir")}
        </Button>
      </div>
    </div>
    </div>
  );
}
