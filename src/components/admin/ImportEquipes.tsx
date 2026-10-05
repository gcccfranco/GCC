"use client";

// Équipes › Import (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 1137) : import de
// l'organigramme du Sheet, son compte rendu, « Recalculer depuis l'organigramme » (R4).
// Admins seuls (routes /api/equipes/*).
import { useState } from "react";
import Link from "next/link";
import { authHeader } from "@/lib/firebase/setlists";
import { Button } from "@/components/ui/button";
import { ListePuces } from "./commun";

/** Compte rendu de /api/equipes/importer (lot 16). */
type CompteRenduImport = {
  equipes: number; membres: number; rattaches: number;
  nonRattaches: string[]; inconnues: string[];
  polesHorsOrganigramme: { uid: string; nom: string; poles: string[] }[];
};

export function ImportEquipes() {
  const [importEtat, setImportEtat] = useState<"" | "busy" | "fait">("");
  const [importErreur, setImportErreur] = useState("");
  // Lot U6 (R4) : « Recalculer depuis l'organigramme » — profils mis à jour, ou null.
  const [recalcul, setRecalcul] = useState<"busy" | number | null>(null);
  const [importResultat, setImportResultat] = useState<CompteRenduImport | null>(null);

  /** Lot 16 : reprend l'onglet ORGANIGRAMME et repose les pôles (idempotent). */
  async function importerOrganigramme() {
    if (!window.confirm("Importer l'organigramme du Sheet ? La liste des membres de chaque équipe sera remplacée par celle du Sheet.")) return;
    setImportEtat("busy");
    setImportErreur("");
    try {
      const res = await fetch("/api/equipes/importer", { method: "POST", headers: await authHeader() });
      const json = (await res.json().catch(() => ({}))) as Partial<CompteRenduImport> & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setImportResultat({
        equipes: json.equipes ?? 0, membres: json.membres ?? 0, rattaches: json.rattaches ?? 0,
        nonRattaches: json.nonRattaches ?? [], inconnues: json.inconnues ?? [],
        polesHorsOrganigramme: json.polesHorsOrganigramme ?? [],
      });
      setImportEtat("fait");
    } catch (e) {
      setImportErreur(e instanceof Error ? e.message : "Import impossible.");
      setImportEtat("");
    }
  }

  /** Lot U6 (R4) : repose pôles, équipes et référents (`dansEquipes`,
   *  `referentDe`) de tous les membres des équipes — une fois pour les profils
   *  d'avant les réunions d'équipe. Idempotent : rien à confirmer. */
  async function recalculerOrganigramme() {
    setRecalcul("busy");
    setImportErreur("");
    try {
      const res = await fetch("/api/equipes/poles", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ tous: true }),
      });
      const json = (await res.json().catch(() => ({}))) as { maj?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setRecalcul(json.maj ?? 0);
    } catch (e) {
      setImportErreur(e instanceof Error ? e.message : "Recalcul impossible.");
      setRecalcul(null);
    }
  }

  /** Retire le pôle d'un compte qui n'est dans aucune équipe (D10) : le serveur
   *  recalcule depuis les équipes, donc il n'en reste aucun. */
  async function decocherPoles(uid: string) {
    setImportErreur("");
    try {
      const res = await fetch("/api/equipes/poles", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ uids: [uid] }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setImportResultat((prev) =>
        prev ? { ...prev, polesHorsOrganigramme: prev.polesHorsOrganigramme.filter((h) => h.uid !== uid) } : prev,
      );
    } catch {
      setImportErreur("Impossible de retirer le pôle.");
    }
  }

  return (
    <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Organigramme → Équipes
      </h2>
      <p className="text-sm text-muted-foreground">
        L&apos;onglet ORGANIGRAMME du Google Sheet devient les 13 équipes de l&apos;app, et
        l&apos;appartenance à une équipe donne son pôle — plus aucune case à cocher sur un profil.
        La liste des membres de chaque équipe sera <strong>remplacée</strong> par celle du Sheet ;
        le relancer ne crée pas de doublon. Les équipes se modifient ensuite depuis{" "}
        <Link href="/back-office/equipes" className="underline underline-offset-2">Équipes › Organigramme</Link>.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={importerOrganigramme} disabled={importEtat === "busy"} variant="outline" className="h-11">
          {importEtat === "busy" ? "…" : "Importer l'organigramme du Sheet"}
        </Button>
        <Button onClick={recalculerOrganigramme} disabled={recalcul === "busy"} variant="outline" className="h-11">
          {recalcul === "busy" ? "…" : "Recalculer depuis l'organigramme"}
        </Button>
        {importErreur && <p className="text-sm text-destructive">{importErreur}</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        « Recalculer » repose, sans relire le Sheet, les pôles, les équipes et les référents de
        chaque membre d&apos;une équipe : c&apos;est ce qui ouvre les réunions d&apos;équipe à leurs
        membres et leur création aux référents. À lancer une fois pour les profils existants.
      </p>
      {typeof recalcul === "number" && (
        <p className="text-sm text-foreground">{recalcul} profil{recalcul > 1 ? "s" : ""} mis à jour.</p>
      )}

      {importResultat && (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            {importResultat.equipes} équipes, {importResultat.membres} membres,{" "}
            {importResultat.rattaches} rattachés à un compte.
          </p>
          <ListePuces
            titre={`Noms non rattachés (${importResultat.nonRattaches.length})`}
            aide="Ces personnes apparaissent dans l'organigramme mais ne reçoivent rien et n'ont pas de pôle."
            items={importResultat.nonRattaches}
          />
          <ListePuces
            titre={`Équipes inconnues (${importResultat.inconnues.length})`}
            aide="Ces blocs du Sheet ne figurent pas dans la table des 13 équipes : rien n'a été créé."
            items={importResultat.inconnues}
          />
          {importResultat.polesHorsOrganigramme.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-muted-foreground">
                Pôle coché hors organigramme ({importResultat.polesHorsOrganigramme.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Ces comptes gardent un pôle sans figurer dans aucune équipe. Place-les dans une
                équipe, ou décoche ici — c&apos;est le seul endroit où on peut le faire.
              </p>
              <div className="space-y-1.5">
                {importResultat.polesHorsOrganigramme.map((h) => (
                  <div key={h.uid} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {h.nom} · {h.poles.join(" · ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => decocherPoles(h.uid)}
                      className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                    >
                      Décocher
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
