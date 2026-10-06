"use client";

// Messages › Réception (lot U6, B2 ; bloc sorti de `admin/page.tsx`, l. 475 et 621) :
// signalements et propositions de chants, admins seuls (règles : reports, songProposals).
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, FileText, Play, Trash2 } from "lucide-react";
import { getSongProposals, setProposalStatus, deleteSongProposal } from "@/lib/firebase/songProposals";
import type { SongProposal } from "@/types/songProposal";
import { getReports, setReportStatus, deleteReport } from "@/lib/firebase/reports";
import type { Report } from "@/types/report";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pill } from "./commun";

/** Signalements et propositions de chants, avec leurs actions : lus une fois, mis à jour sur
 *  place après chaque écriture (règles : reports, songProposals, admins). Partagé par l'ancien
 *  bloc (interrupteur coupé) et la Réception du Back-Office (U4 bis, B7). */
export function useReception() {
  const [proposals, setProposals] = useState<SongProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalBusy, setProposalBusy] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportBusy, setReportBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSongProposals().then(setProposals).finally(() => setLoadingProposals(false));
    getReports().then(setReports).finally(() => setLoadingReports(false));
  }, []);

  async function handleProposalStatus(p: SongProposal, status: SongProposal["status"]) {
    setProposalBusy(p.id);
    setError("");
    try {
      await setProposalStatus(p.id, status);
      setProposals((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    } catch {
      setError("Impossible de mettre à jour la proposition. Règles Firestore publiées ?");
    } finally {
      setProposalBusy(null);
    }
  }

  async function handleProposalDelete(p: SongProposal) {
    setProposalBusy(p.id);
    setError("");
    try {
      await deleteSongProposal(p.id);
      setProposals((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      setError("Impossible de supprimer la proposition. Règles Firestore publiées ?");
    } finally {
      setProposalBusy(null);
    }
  }

  async function handleReportStatus(r: Report, status: Report["status"]) {
    setReportBusy(r.id);
    setError("");
    try {
      await setReportStatus(r.id, status);
      setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)));
    } catch {
      setError("Impossible de mettre à jour le signalement. Règles Firestore publiées ?");
    } finally {
      setReportBusy(null);
    }
  }

  async function handleReportDelete(r: Report) {
    setReportBusy(r.id);
    setError("");
    try {
      await deleteReport(r.id);
      setReports((prev) => prev.filter((x) => x.id !== r.id));
    } catch {
      setError("Impossible de supprimer le signalement. Règles Firestore publiées ?");
    } finally {
      setReportBusy(null);
    }
  }

  return {
    proposals, loadingProposals, proposalBusy, reports, loadingReports, reportBusy, error,
    handleProposalStatus, handleProposalDelete, handleReportStatus, handleReportDelete,
  };
}

/** `onEnAttente` : signalements et propositions en attente (pastille de l'onglet). */
export function Reception({ onEnAttente }: { onEnAttente?: (n: number) => void }) {
  const {
    proposals, loadingProposals, proposalBusy, reports, loadingReports, reportBusy, error,
    handleProposalStatus, handleProposalDelete, handleReportStatus, handleReportDelete,
  } = useReception();
  const [showResolvedReports, setShowResolvedReports] = useState(false);
  const [showResolvedProposals, setShowResolvedProposals] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedProposals = proposals.filter((p) => p.status !== "pending");
  const resolvedReports = reports.filter((r) => r.status !== "pending");
  const visibleProposals = showResolvedProposals ? proposals : pendingProposals;
  const visibleReports = showResolvedReports ? reports : pendingReports;

  useEffect(() => {
    onEnAttente?.(pendingReports.length + pendingProposals.length);
  }, [onEnAttente, pendingReports.length, pendingProposals.length]);

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Réception : signalements ── */}
      <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Signalements
          </h2>
          {pendingReports.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
              {pendingReports.length} en attente
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Problèmes signalés par les membres (chant ou site). Déplie un signalement
          pour le détailler, et marque-le comme traité une fois résolu.
        </p>

        {loadingReports ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
            Aucun signalement pour l&apos;instant.
          </p>
        ) : (
          <div className="space-y-2">
            {visibleReports.map((r) => {
              const busy = reportBusy === r.id;
              const expanded = expandedReport === r.id;
              return (
                <div
                  key={r.id}
                  className={`rounded-xl bg-card ${
                    r.status !== "pending" ? "opacity-60" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedReport(expanded ? null : r.id)}
                    className="w-full flex items-start justify-between gap-2 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.authorName}
                        {r.createdAt ? ` · ${r.createdAt.toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Pill
                        label={r.kind === "song" ? "Chant" : "Site"}
                        color={r.kind === "song" ? "#2563eb" : "#9333ea"}
                      />
                      {r.status === "resolved" && <Pill label="Traité" color="#16a34a" />}
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-border px-4 py-3 space-y-2">
                      {r.description && (
                        <p className="text-xs text-foreground whitespace-pre-wrap">{r.description}</p>
                      )}

                      {((r.kind === "song" && r.songSlug) || r.pageUrl) && (
                        <div className="flex flex-wrap gap-3">
                          {r.kind === "song" && r.songSlug && (
                            <Link
                              href={`/songs/${r.songSlug}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground underline underline-offset-2 hover:text-muted-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {r.songTitle || "Voir le chant"}
                            </Link>
                          )}
                          {r.pageUrl && (
                            <a
                              href={r.pageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Page
                            </a>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {r.status === "pending" ? (
                          <Button
                            variant="outline"
                            onClick={() => handleReportStatus(r, "resolved")}
                            disabled={busy}
                            className="h-9 text-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            Marquer traité
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleReportStatus(r, "pending")}
                            disabled={busy}
                            className="h-9 text-xs"
                          >
                            Rouvrir
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleReportDelete(r)}
                          disabled={busy}
                          className="h-9 w-9 rounded-full bg-secondary text-muted-foreground hover:text-destructive flex items-center justify-center disabled:opacity-50"
                          aria-label="Supprimer le signalement"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {resolvedReports.length > 0 && (
              <button
                type="button"
                onClick={() => setShowResolvedReports((v) => !v)}
                className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5"
              >
                {showResolvedReports
                  ? "Masquer les traités"
                  : `Voir les traités (${resolvedReports.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Réception : propositions de chants ── */}
      <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Propositions de chants
          </h2>
          {pendingProposals.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground">
              {pendingProposals.length} en attente
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Chants proposés par les membres. Déplie une proposition pour ses liens,
          et marque-la comme traitée après ajout au répertoire.
        </p>

        {loadingProposals ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
            Aucune proposition pour l&apos;instant.
          </p>
        ) : (
          <div className="space-y-2">
            {visibleProposals.map((p) => {
              const busy = proposalBusy === p.id;
              const expanded = expandedProposal === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl bg-card ${
                    p.status !== "pending" ? "opacity-60" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedProposal(expanded ? null : p.id)}
                    className="w-full flex items-start justify-between gap-2 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Proposé par {p.authorName}
                        {p.createdAt ? ` · ${p.createdAt.toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.status === "accepted" && <Pill label="Traité" color="#16a34a" />}
                      {p.status === "rejected" && <Pill label="Refusé" color="#dc2626" />}
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-border px-4 py-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={p.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground underline underline-offset-2 hover:text-muted-foreground"
                        >
                          <Play className="h-3.5 w-3.5" />
                          YouTube
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {p.pdfUrl && (
                          <a
                            href={p.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground underline underline-offset-2 hover:text-muted-foreground"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Partition PDF
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {p.status !== "accepted" && (
                          <Button
                            variant="outline"
                            onClick={() => handleProposalStatus(p, "accepted")}
                            disabled={busy}
                            className="h-9 text-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            Marquer traité
                          </Button>
                        )}
                        {p.status === "pending" && (
                          <Button
                            variant="outline"
                            onClick={() => handleProposalStatus(p, "rejected")}
                            disabled={busy}
                            className="h-9 text-xs"
                          >
                            Refuser
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleProposalDelete(p)}
                          disabled={busy}
                          className="h-9 w-9 rounded-full bg-secondary text-muted-foreground hover:text-destructive flex items-center justify-center disabled:opacity-50"
                          aria-label="Supprimer la proposition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {resolvedProposals.length > 0 && (
              <button
                type="button"
                onClick={() => setShowResolvedProposals((v) => !v)}
                className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5"
              >
                {showResolvedProposals
                  ? "Masquer les traités"
                  : `Voir les traités (${resolvedProposals.length})`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
