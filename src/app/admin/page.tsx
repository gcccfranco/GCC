"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, DoorOpen, ExternalLink, FileText, Inbox, MessageSquareHeart, Network, Play, Search, ShieldCheck, Trash2, UserRound, Users, X, type LucideIcon } from "lucide-react";
import { useProfile, listProfiles, saveProfile, getRegistrationOpen, setRegistrationOpen } from "@/lib/firebase/users";
import { getSongProposals, setProposalStatus, deleteSongProposal } from "@/lib/firebase/songProposals";
import type { SongProposal } from "@/types/songProposal";
import { getReports, setReportStatus, deleteReport } from "@/lib/firebase/reports";
import type { Report } from "@/types/report";
import { isAdminUser } from "@/lib/access";
import { authHeader } from "@/lib/firebase/setlists";
import {
  loadPlanningData,
  collectPlanningNames,
  deriveServiceRolesFromPlanning,
  type PlanningData,
  normalizeName,
} from "@/lib/planning/names";
import { ProfileFields, type ProfileFormValue } from "@/components/auth/ProfileFields";
import { SurveyResults } from "@/components/admin/SurveyResults";
import { SERVICE_ROLE_LABELS, SERVICE_LIEUX, GROUPES, POLE_LABELS, type ServiceRole, type UserProfile } from "@/types/user";
import { listEquipes } from "@/lib/firebase/equipes";
import { EQUIPES, polesDesEquipes } from "@/lib/equipes/organigramme";
import type { Equipe } from "@/types/equipe";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import { NOTIFY_ALL, NOTIFY_GROUPS, audienceLabel } from "@/lib/push/audiences";
import { GRILLES } from "@/lib/planning/grilles";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { BACK_OFFICE } from "@/lib/backOffice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

function profileToForm(p: UserProfile): ProfileFormValue {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    planningName: p.planningName,
    serviceRoles: p.serviceRoles,
  };
}

function Pill({ label, color }: { label: string; color?: string }) {
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

/** Pôles d'un membre, en lecture seule : ils viennent des équipes (lot 16, D9). */
function PolesDuMembre({ profile, equipes }: { profile: UserProfile; equipes: Equipe[] }) {
  const siennes = equipes.filter((e) => e.membres.some((m) => m.uid === profile.uid));
  const poles = polesDesEquipes(profile.uid, equipes);
  const coches = (profile.poles ?? []).filter((x) => !poles.includes(x));
  return (
    <>
      <p className="text-xs text-foreground">
        {poles.length > 0 ? poles.map((x) => POLE_LABELS[x]).join(" · ") : "Aucun"}
        {siennes.length > 0 && (
          <>
            {" — via "}
            <Link href="/equipes" className="underline underline-offset-2">
              {siennes.map((e) => EQUIPES.find((d) => d.id === e.id)?.nom ?? e.id).join(", ")}
            </Link>
          </>
        )}
      </p>
      {coches.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Coché hors organigramme : {coches.map((x) => POLE_LABELS[x]).join(" · ")} — à régler depuis l&apos;onglet Équipes.
        </p>
      )}
    </>
  );
}

/** Liste courte en puces ambre, comme « Planning sans compte ». */
function ListePuces({ titre, aide, items }: { titre: string; aide: string; items: string[] }) {
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

const FILTERS = ["Tous", ...SERVICE_LIEUX, "EDD", ...GROUPES, "Ne sert pas"] as const;

// Une inscription est « nouvelle » pendant ses 7 premiers jours.
const NEW_DAYS = 7;
function isRecent(d?: Date): boolean {
  return !!d && Date.now() - d.getTime() < NEW_DAYS * 86_400_000;
}

type AdminTab = "reception" | "membres" | "inscriptions" | "planning" | "equipes" | "questionnaire";

/** Compte rendu de /api/equipes/importer (lot 16). */
type ImportEquipes = {
  equipes: number; membres: number; rattaches: number;
  nonRattaches: string[]; inconnues: string[];
  polesHorsOrganigramme: { uid: string; nom: string; poles: string[] }[];
};

export default function AdminPage() {
  const { user, loading } = useProfile();
  const admin = isAdminUser(user);

  const [regOpen, setRegOpen] = useState<boolean | null>(null);
  const [togglingReg, setTogglingReg] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [proposals, setProposals] = useState<SongProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalBusy, setProposalBusy] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportBusy, setReportBusy] = useState<string | null>(null);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormValue | null>(null);
  const [annonceRights, setAnnonceRights] = useState<string[]>([]);
  const [notifyRights, setNotifyRights] = useState<string[]>([]);
  const [equipesRight, setEquipesRight] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
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
  const [importEtat, setImportEtat] = useState<"" | "busy" | "fait">("");
  const [importErreur, setImportErreur] = useState("");
  const [importResultat, setImportResultat] = useState<ImportEquipes | null>(null);
  const [planningRights, setPlanningRights] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tous");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [tab, setTab] = useState<AdminTab>("membres");
  const [showResolvedReports, setShowResolvedReports] = useState(false);
  const [showResolvedProposals, setShowResolvedProposals] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;
    getRegistrationOpen().then(setRegOpen);
    listProfiles().then(setProfiles).finally(() => setLoadingProfiles(false));
    getSongProposals().then(setProposals).finally(() => setLoadingProposals(false));
    getReports().then(setReports).finally(() => setLoadingReports(false));
    listEquipes().then(setEquipes);
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, [admin]);

  const deriveFromPlanning = planningData
    ? (name: string) => deriveServiceRolesFromPlanning(planningData, name)
    : undefined;

  const displayed = useMemo(() => {
    const q = normalizeName(query.trim());
    const byName = (a: UserProfile, b: UserProfile) =>
      a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr");
    return profiles
      .filter((p) => {
        if (q) {
          const hay = normalizeName(`${p.firstName} ${p.lastName} ${p.email} ${p.planningName}`);
          if (!hay.includes(q)) return false;
        }
        if (filter === "Tous") return true;
        if (filter === "EDD") return (EDD_CLASSES as readonly string[]).some((c) => c in p.serviceRoles);
        if (filter === "Ne sert pas") return Object.keys(p.serviceRoles).length === 0;
        // Lieux + groupes : la catégorie est une clé de serviceRoles
        return filter in p.serviceRoles;
      })
      .sort((a, b) => {
        if (sort === "name") return byName(a, b);
        // Récents d'abord ; les comptes sans date (anciens) en dernier, par nom
        if (a.createdAt && b.createdAt) return b.createdAt.getTime() - a.createdAt.getTime();
        if (a.createdAt) return -1;
        if (b.createdAt) return 1;
        return byName(a, b);
      });
  }, [profiles, query, filter, sort]);

  const stats = useMemo(() => {
    const allRoles = (p: UserProfile): ServiceRole[] => Object.values(p.serviceRoles).flat();
    const musiciens = profiles.filter((p) => allRoles(p).includes("musicien")).length;
    const chanteurs = profiles.filter((p) => allRoles(p).includes("chanteur")).length;
    const presidences = profiles.filter((p) => allRoles(p).includes("presidence")).length;
    return { musiciens, chanteurs, presidences };
  }, [profiles]);

  // Noms présents dans les plannings mais liés à aucun compte (planningName) :
  // ces personnes échappent aux rappels et aux notifs « setlist prête » (ciblage
  // par nom de planning, cf. src/lib/push/recipients.ts). Visibilité pour l'admin.
  const unlinkedNames = useMemo(() => {
    const linked = new Set(
      profiles.map((p) => normalizeName(p.planningName.trim())).filter(Boolean)
    );
    return planningNames.filter((n) => !linked.has(normalizeName(n.trim())));
  }, [planningNames, profiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user || !admin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Page réservée aux administrateurs.</p>
        {!user && (
          <Link href="/login?from=/admin" className="text-sm text-foreground underline underline-offset-2 hover:text-muted-foreground">
            Se connecter
          </Link>
        )}
      </div>
    );
  }

  /** Lot 16 : reprend l'onglet ORGANIGRAMME et repose les pôles (idempotent). */
  async function importerOrganigramme() {
    if (!window.confirm("Importer l'organigramme du Sheet ? La liste des membres de chaque équipe sera remplacée par celle du Sheet.")) return;
    setImportEtat("busy");
    setImportErreur("");
    try {
      const res = await fetch("/api/equipes/importer", { method: "POST", headers: await authHeader() });
      const json = (await res.json().catch(() => ({}))) as Partial<ImportEquipes> & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setImportResultat({
        equipes: json.equipes ?? 0, membres: json.membres ?? 0, rattaches: json.rattaches ?? 0,
        nonRattaches: json.nonRattaches ?? [], inconnues: json.inconnues ?? [],
        polesHorsOrganigramme: json.polesHorsOrganigramme ?? [],
      });
      setImportEtat("fait");
      listEquipes().then(setEquipes);
      listProfiles().then(setProfiles);
    } catch (e) {
      setImportErreur(e instanceof Error ? e.message : "Import impossible.");
      setImportEtat("");
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
      listProfiles().then(setProfiles);
    } catch {
      setImportErreur("Impossible de retirer le pôle.");
    }
  }

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

  function startEdit(p: UserProfile) {
    setEditingUid(p.uid);
    setForm(profileToForm(p));
    setAnnonceRights(p.annonces ?? []);
    setNotifyRights(p.notify ?? []);
    setEquipesRight(p.equipes ?? false);
    setPlanningRights(p.plannings ?? []);
    setError("");
  }

  async function saveEdit(p: UserProfile) {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      // Seuls les champs tenus ici sont écrits (saveProfile n’envoie que le
      // masque) : `poles` vient des équipes (lot 16, D9) et n’est jamais renvoyé,
      // même périmé. Jusqu’au 19/09/2026 le document entier était remplacé.
      const patch = { uid: p.uid, ...form, annonces: annonceRights, notify: notifyRights, equipes: equipesRight, plannings: planningRights };
      await saveProfile(patch);
      const updated: UserProfile = { ...p, ...patch };
      setProfiles((prev) => prev.map((x) => (x.uid === p.uid ? updated : x)));
      setEditingUid(null);
      setForm(null);
    } catch {
      setError("Erreur lors de l'enregistrement du profil.");
    } finally {
      setSaving(false);
    }
  }

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

  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedProposals = proposals.filter((p) => p.status !== "pending");
  const resolvedReports = reports.filter((r) => r.status !== "pending");
  const visibleProposals = showResolvedProposals ? proposals : pendingProposals;
  const visibleReports = showResolvedReports ? reports : pendingReports;

  const TABS: { key: AdminTab; label: string; Icon: LucideIcon; count?: number; always?: boolean }[] = [
    { key: "reception", label: "Réception", Icon: Inbox, count: pendingReports.length + pendingProposals.length },
    { key: "membres", label: "Membres", Icon: Users, count: profiles.length, always: true },
    { key: "inscriptions", label: "Inscriptions", Icon: DoorOpen },
    { key: "planning", label: "Planning", Icon: CalendarDays, count: unlinkedNames.length },
    { key: "equipes", label: "Équipes", Icon: Network },
    { key: "questionnaire", label: "Questionnaire", Icon: MessageSquareHeart },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">Administration</h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Onglets ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {TABS.map(({ key, label, Icon, count, always }) => {
            const active = tab === key;
            const showCount = count !== undefined && (always || count > 0);
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {showCount && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : always
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Réception : signalements ── */}
        {tab === "reception" && (
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
        )}

        {/* ── Réception : propositions de chants ── */}
        {tab === "reception" && (
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
        )}

        {/* ── Inscriptions ── */}
        {tab === "inscriptions" && (
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
        )}

        {/* ── Membres ── */}
        {tab === "membres" && (
        <div className="rounded-xl bg-card shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Membres
            </h2>
            <span className="text-xs text-muted-foreground">
              {profiles.length} inscrit(s) · {stats.musiciens} musicien(s) · {stats.chanteurs}{" "}
              chanteur(s) · {stats.presidences} présidence(s)
            </span>
          </div>

          {/* Recherche + filtre */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un membre (nom, email, nom de planning)…"
                className="h-11 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {FILTERS.map((f) => {
                const active = filter === f;
                const color =
                  f === "EDD" ? "#3b6d11" : f !== "Tous" && f !== "Ne sert pas" ? categoryColor(f) : undefined;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      active && !color
                        ? "bg-foreground text-background border-transparent"
                        : active
                        ? "border-transparent text-white"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                    style={active && color ? { background: color } : undefined}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="font-semibold text-muted-foreground">Trier :</span>
              {(["recent", "name"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-2.5 py-1 rounded-full font-semibold border transition-colors ${
                    sort === s
                      ? "bg-foreground text-background border-transparent"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "recent" ? "Récents" : "A–Z"}
                </button>
              ))}
            </div>
          </div>

          {loadingProfiles ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
          ) : displayed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
              {profiles.length === 0 ? "Aucun profil pour l'instant." : "Aucun membre ne correspond."}
            </p>
          ) : (
            <div className="space-y-2">
              {displayed.map((p) => {
                const isEditing = editingUid === p.uid;
                return (
                  <div key={p.uid} className="rounded-xl bg-card">
                    <button
                      onClick={() => (isEditing ? setEditingUid(null) : startEdit(p))}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left"
                    >
                      <span className="h-8 w-8 mt-0.5 rounded-full bg-secondary text-foreground text-xs font-bold flex items-center justify-center shrink-0 uppercase">
                        {(p.firstName[0] ?? "") + (p.lastName[0] ?? "") || <UserRound className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.firstName} {p.lastName}
                          {isAdminUser(p) && (
                            <span className="ml-2 text-xs font-semibold text-muted-foreground">admin</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.email}
                          {p.planningName ? ` · planning : ${p.planningName}` : ""}
                          {p.createdAt ? ` · inscrit le ${p.createdAt.toLocaleDateString("fr-FR")}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {isRecent(p.createdAt) && <Pill label="Nouveau" color="#16a34a" />}
                          {Object.entries(p.serviceRoles).map(([cat, roles]) => (
                            <Pill
                              key={cat}
                              label={`${categoryLabel(cat)}${
                                roles.length ? " · " + roles.map((r) => SERVICE_ROLE_LABELS[r]).join("/") : ""
                              }`}
                              color={categoryColor(cat)}
                            />
                          ))}
                          {Object.keys(p.serviceRoles).length === 0 && <Pill label="Ne sert pas" />}
                        </div>
                      </div>
                      {isEditing ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                      )}
                    </button>

                    {isEditing && form && (
                      <div className="border-t border-border px-4 py-4 space-y-4">
                        <ProfileFields
                          value={form}
                          onChange={setForm}
                          planningNames={planningNames}
                          deriveFromPlanning={deriveFromPlanning}
                        />

                        {/* Back-office coupé (lot 18) : ces trois droits n'ont pas d'objet en ligne. */}
                        {BACK_OFFICE && (<>
                        {/* Pôles : donnés par les équipes depuis le lot 16 (D9) — plus aucune
                            case ici, l'organigramme est la seule vérité. */}
                        <div className="rounded-lg border border-dashed border-border p-3 space-y-1">
                          <p className="text-sm font-semibold text-muted-foreground">
                            Pôles (donnés par les équipes ; Louange : automatique avec un rôle de service) :
                          </p>
                          <PolesDuMembre profile={p} equipes={equipes} />
                        </div>

                        {/* Droit de tenir l'organigramme (lot 16, D4) — réservé aux admins */}
                        <div className="rounded-lg border border-dashed border-border p-3">
                          <p className="text-sm font-semibold text-muted-foreground mb-2">
                            Peut modifier l&apos;organigramme :
                          </p>
                          <button
                            type="button"
                            onClick={() => setEquipesRight((v) => !v)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                              equipesRight
                                ? "bg-secondary border-foreground/30 text-foreground"
                                : "bg-background border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {equipesRight ? "✓ " : ""}Équipes (tout l&apos;organigramme)
                          </button>
                        </div>

                        {/* Qui remplit les plannings dans l'app (lot 17) — réservé aux admins.
                            Ne donne pas le droit de PUBLIER un trimestre (droits de notification). */}
                        <div className="rounded-lg border border-dashed border-border p-3">
                          <p className="text-sm font-semibold text-muted-foreground mb-2">
                            Peut remplir les plannings :
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {GRILLES.map((pl) => {
                              const checked = planningRights.includes(pl.key);
                              const color = pl.couleur;
                              return (
                                <button
                                  key={pl.key}
                                  type="button"
                                  onClick={() =>
                                    setPlanningRights((prev) =>
                                      checked ? prev.filter((x) => x !== pl.key) : [...prev, pl.key]
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                    checked ? "" : "bg-background border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                  style={checked ? { background: `${color}15`, borderColor: color, color } : undefined}
                                >
                                  {checked ? "✓ " : ""}{pl.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        </>)}

                        {BACK_OFFICE && (<>
                        {/* Droits de publication d'annonces — réservé aux admins */}
                        <div className="rounded-lg border border-dashed border-border p-3">
                          <p className="text-sm font-semibold text-muted-foreground mb-2">
                            Peut créer des évènements et des infos pour :
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ANNONCE_SECTIONS.map((s) => {
                              const checked = annonceRights.includes(s);
                              const color = categoryColor(s);
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() =>
                                    setAnnonceRights((prev) =>
                                      checked ? prev.filter((x) => x !== s) : [...prev, s]
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                    checked ? "" : "bg-background border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                  style={checked ? { background: `${color}15`, borderColor: color, color } : undefined}
                                >
                                  {checked ? "✓ " : ""}{categoryLabel(s)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        </>)}

                        {/* Droits d'envoi de notifications manuelles — réservé aux admins */}
                        <div className="rounded-lg border border-dashed border-border p-3">
                          <p className="text-sm font-semibold text-muted-foreground mb-2">
                            Peut envoyer des notifications à :
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[NOTIFY_ALL, ...NOTIFY_GROUPS.flatMap((g) => g.audiences)].map((a) => {
                              const checked = notifyRights.includes(a);
                              const color = a === NOTIFY_ALL ? undefined : categoryColor(a);
                              return (
                                <button
                                  key={a}
                                  type="button"
                                  onClick={() =>
                                    setNotifyRights((prev) =>
                                      checked ? prev.filter((x) => x !== a) : [...prev, a]
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                    !checked
                                      ? "bg-background border-border text-muted-foreground hover:text-foreground"
                                      : color
                                      ? ""
                                      : "bg-secondary border-foreground/30 text-foreground"
                                  }`}
                                  style={checked && color ? { background: `${color}15`, borderColor: color, color } : undefined}
                                >
                                  {checked ? "✓ " : ""}{audienceLabel(a)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => { setEditingUid(null); setForm(null); }}
                            className="h-11"
                          >
                            Annuler
                          </Button>
                          <Button onClick={() => saveEdit(p)} disabled={saving} className="h-11">
                            {saving ? "Enregistrement…" : "Enregistrer"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* ── Noms du planning sans compte ── */}
        {BACK_OFFICE && tab === "planning" && (
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
        </div>
        )}

        {tab === "planning" && (
        <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Planning sans compte ({unlinkedNames.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Ces noms apparaissent dans les plannings mais ne sont liés à aucun compte —
            ces personnes ne reçoivent ni rappels ni notification « setlist prête ».
          </p>
          {planningData == null ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : unlinkedNames.length === 0 ? (
            <p className="text-sm text-foreground">
              ✅ Tous les noms du planning sont liés à un compte.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {unlinkedNames.map((n) => (
                <span
                  key={n}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ── Organigramme → Équipes (lot 16) ── */}
        {BACK_OFFICE && tab === "equipes" && (
        <div className="rounded-xl bg-card shadow-soft p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Organigramme → Équipes
          </h2>
          <p className="text-sm text-muted-foreground">
            L&apos;onglet ORGANIGRAMME du Google Sheet devient les 13 équipes de l&apos;app, et
            l&apos;appartenance à une équipe donne son pôle — plus aucune case à cocher sur un profil.
            La liste des membres de chaque équipe sera <strong>remplacée</strong> par celle du Sheet ;
            le relancer ne crée pas de doublon. Les équipes se modifient ensuite depuis{" "}
            <Link href="/equipes" className="underline underline-offset-2">Équipes</Link>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={importerOrganigramme} disabled={importEtat === "busy"} variant="outline" className="h-11">
              {importEtat === "busy" ? "…" : "Importer l'organigramme du Sheet"}
            </Button>
            {importErreur && <p className="text-sm text-destructive">{importErreur}</p>}
          </div>

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
        )}

        {/* ── Questionnaire ── */}
        {tab === "questionnaire" && <SurveyResults />}
      </div>
    </div>
  );
}
