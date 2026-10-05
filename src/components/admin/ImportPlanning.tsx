"use client";

// Planning › Import (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 1078, avec « Reprendre
// les noms du petit déj » de U3) : import initial d'un planning depuis le Sheet. Admins seuls.
import { useState } from "react";
import { authHeader } from "@/lib/firebase/setlists";
import { GRILLES } from "@/lib/planning/grilles";
import { Button } from "@/components/ui/button";

export function ImportPlanning() {
  // Import initial d’un planning (lot 17, G4) : compte rendu de /api/admin/importer-planning.
  const [importPlanningEnCours, setImportPlanningEnCours] = useState<string | null>(null);
  const [importPlanningResultat, setImportPlanningResultat] = useState("");

  async function importerPlanning(key: string) {
    setImportPlanningEnCours(key);
    setImportPlanningResultat("");
    try {
      const res = await fetch("/api/admin/importer-planning", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ key }),
      });
      const json = (await res.json()) as { importes?: number; ignores?: number; nomsNonRattaches?: string[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Import impossible");
      const noms = json.nomsNonRattaches ?? [];
      setImportPlanningResultat(
        `${json.importes ?? 0} dimanches importés, ${json.ignores ?? 0} déjà dans l'app.` +
          (noms.length ? ` Noms sans compte : ${noms.join(", ")}.` : " Tous les noms ont un compte.")
      );
    } catch (e) {
      setImportPlanningResultat(e instanceof Error ? e.message : "Import impossible");
    } finally {
      setImportPlanningEnCours(null);
    }
  }
  // Reprise du petit déj (lot U3, PD5) : compte rendu de /api/admin/reprendre-petit-dej.
  const [repriseEnCours, setRepriseEnCours] = useState(false);
  const [repriseResultat, setRepriseResultat] = useState("");

  async function reprendrePetitDej() {
    if (!window.confirm("Reprendre les noms du petit déj ? À faire une seule fois, le jour de la mise en ligne : les lignes s'écrivent dans la vraie base.")) return;
    setRepriseEnCours(true);
    setRepriseResultat("");
    try {
      const res = await fetch("/api/admin/reprendre-petit-dej", { method: "POST", headers: await authHeader() });
      const json = (await res.json()) as { reprises?: number; ignores?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Reprise impossible");
      setRepriseResultat(`${json.reprises ?? 0} dimanches repris, ${json.ignores ?? 0} déjà inscrits.`);
    } catch (e) {
      setRepriseResultat(e instanceof Error ? e.message : "Reprise impossible");
    } finally {
      setRepriseEnCours(false);
    }
  }

  return (
    <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Importer depuis le Google Sheet</h2>
      <p className="text-xs text-muted-foreground">
        Recopie dans l&apos;app les dimanches du Sheet qui n&apos;y sont pas encore (les dimanches déjà
        écrits dans l&apos;app ne bougent pas : relancer ne fait jamais de doublon). Une entrée
        d&apos;historique par import. Ensuite, le Sheet n&apos;est plus qu&apos;une archive : on exporte en CSV depuis la grille.
      </p>
      <div className="flex flex-wrap gap-2">
        {GRILLES.map((g) => (
          <button
            key={g.key}
            type="button"
            disabled={importPlanningEnCours === g.key}
            onClick={() => void importerPlanning(g.key)}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-background border-border text-muted-foreground hover:text-foreground disabled:opacity-60"
            style={{ borderColor: g.couleur, color: g.couleur }}
          >
            {importPlanningEnCours === g.key ? "Import…" : `Importer le ${g.label} depuis le Google Sheet`}
          </button>
        ))}
      </div>
      {importPlanningResultat && (
        <p className="text-sm text-foreground" aria-live="polite">{importPlanningResultat}</p>
      )}
      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Petit déj : les noms à venir de la grille Table deviennent des inscriptions, une ligne par dimanche.
          Un dimanche déjà inscrit ne bouge pas : relancer n&apos;écrit rien de plus. Une seule fois, le jour de la mise en ligne.
        </p>
        <Button onClick={() => void reprendrePetitDej()} disabled={repriseEnCours} variant="outline" className="h-11">
          {repriseEnCours ? "Reprise…" : "Reprendre les noms du petit déj"}
        </Button>
        {repriseResultat && (
          <p className="text-sm text-foreground" aria-live="polite">{repriseResultat}</p>
        )}
      </div>
    </div>
  );
}
