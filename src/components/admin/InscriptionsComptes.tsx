"use client";

// Équipes › Inscriptions (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 761) : ouvrir ou
// fermer la création de comptes. Admins seuls (config/app).
import { useEffect, useState } from "react";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/firebase/users";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InscriptionsComptes() {
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
