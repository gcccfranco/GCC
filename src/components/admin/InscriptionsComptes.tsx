"use client";

// Équipes › Inscriptions (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 761) : ouvrir ou
// fermer la création de comptes. Admins seuls (config/app).
// Agencement v18 (B9 de docs/spec-agencement-v18.md) : en tête de Back-Office › Équipes ›
// Personnes, la version courte (`court`) : un interrupteur, l'état, les comptes de la semaine et
// « Voir les n » ; l'ancienne administration garde la carte d'avant.
import { useEffect, useState } from "react";
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
      setError("Impossible de modifier l'état des inscriptions. Vérifie que les règles Firestore sont publiées.");
    } finally {
      setTogglingReg(false);
    }
  }

  if (court) {
    return (
      <section aria-label="Inscriptions" className="raised rounded-2xl px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Switch
            checked={!!regOpen}
            disabled={regOpen === null || togglingReg}
            onCheckedChange={() => void toggleRegistration()}
            aria-label={regOpen ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground">
              {regOpen === null ? "Chargement…" : regOpen ? "Inscriptions ouvertes" : "Inscriptions fermées"}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {regOpen
                ? "Un nouveau membre peut créer son compte. Ferme-les une fois l'équipe au complet."
                : "Personne ne peut créer de compte."}
            </p>
          </div>
          {nouveaux > 0 && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                {nouveaux > 1 ? `${nouveaux} nouveaux comptes` : "1 nouveau compte"}
              </span>
              {onVoir && (
                <button
                  type="button"
                  onClick={onVoir}
                  className="h-9 rounded-full bg-background px-3.5 text-[13px] font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary"
                >
                  Voir {nouveaux > 1 ? `les ${nouveaux}` : "le compte"}
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
        Inscriptions
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
              ? "Chargement…"
              : regOpen
              ? "Les inscriptions sont ouvertes."
              : "Les inscriptions sont fermées."}
          </p>
        </div>
        <Button
          onClick={toggleRegistration}
          disabled={regOpen === null || togglingReg}
          variant={regOpen ? "outline" : "default"}
          className={`shrink-0 h-11 ${regOpen ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`}
        >
          {togglingReg ? "…" : regOpen ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}
        </Button>
      </div>
    </div>
    </div>
  );
}
