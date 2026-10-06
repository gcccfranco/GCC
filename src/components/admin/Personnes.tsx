"use client";

// Équipes › Personnes (lot U6, B2 ; bloc « Membres » sorti de `admin/page.tsx`,
// l. 794-1075) : liste, fiche, pôles en lecture, droits. Admins seuls (users/{uid}).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Search, UserRound, X } from "lucide-react";
import { listProfiles, saveProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import {
  loadPlanningData,
  collectPlanningNames,
  deriveServiceRolesFromPlanning,
  type PlanningData,
  normalizeName,
} from "@/lib/planning/names";
import { ProfileFields, type ProfileFormValue } from "@/components/auth/ProfileFields";
import { SERVICE_ROLE_LABELS, SERVICE_LIEUX, GROUPES, POLE_LABELS, type ServiceRole, type UserProfile } from "@/types/user";
import { listEquipes, majPoles } from "@/lib/firebase/equipes";
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
import { Pill } from "./commun";

function profileToForm(p: UserProfile): ProfileFormValue {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    planningName: p.planningName,
    serviceRoles: p.serviceRoles,
  };
}

/** Pôles d'un membre, en lecture seule : ils viennent des équipes (lot 16, D9).
 *  Un pôle coché hors organigramme se décoche ici (D10) : le serveur repose les
 *  pôles depuis les équipes. Seul endroit depuis le retrait de l'import (06/10/2026). */
function PolesDuMembre({ profile, equipes, onDecoche }: { profile: UserProfile; equipes: Equipe[]; onDecoche: () => Promise<void> }) {
  const [decoche, setDecoche] = useState<"" | "busy" | "erreur">("");
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
            <Link href="/back-office/equipes" className="underline underline-offset-2">
              {siennes.map((e) => EQUIPES.find((d) => d.id === e.id)?.nom ?? e.id).join(", ")}
            </Link>
          </>
        )}
      </p>
      {coches.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Coché hors organigramme : {coches.map((x) => POLE_LABELS[x]).join(" · ")}
          </p>
          <button
            type="button"
            disabled={decoche === "busy"}
            onClick={async () => {
              setDecoche("busy");
              try {
                await onDecoche();
                setDecoche("");
              } catch {
                setDecoche("erreur");
              }
            }}
            className="text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-60"
          >
            {decoche === "busy" ? "…" : "Décocher"}
          </button>
          {decoche === "erreur" && <p className="text-xs text-destructive">Impossible de retirer le pôle.</p>}
        </div>
      )}
    </>
  );
}

const FILTERS = ["Tous", ...SERVICE_LIEUX, "EDD", ...GROUPES, "Ne sert pas"] as const;

// Une inscription est « nouvelle » pendant ses 7 premiers jours.
const NEW_DAYS = 7;
function isRecent(d?: Date): boolean {
  return !!d && Date.now() - d.getTime() < NEW_DAYS * 86_400_000;
}

/** `onCompte` : nombre d'inscrits (pastille de l'onglet). */
export function Personnes({ onCompte }: { onCompte?: (n: number) => void }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormValue | null>(null);
  const [annonceRights, setAnnonceRights] = useState<string[]>([]);
  const [notifyRights, setNotifyRights] = useState<string[]>([]);
  const [equipesRight, setEquipesRight] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [planningRights, setPlanningRights] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tous");
  const [sort, setSort] = useState<"recent" | "name">("recent");

  useEffect(() => {
    listProfiles().then(setProfiles).finally(() => setLoadingProfiles(false));
    listEquipes().then(setEquipes);
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, []);

  useEffect(() => {
    onCompte?.(profiles.length);
  }, [onCompte, profiles.length]);

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

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                      <PolesDuMembre
                        profile={p}
                        equipes={equipes}
                        onDecoche={async () => {
                          await majPoles([p.uid]);
                          const poles = polesDesEquipes(p.uid, equipes);
                          setProfiles((prev) => prev.map((x) => (x.uid === p.uid ? { ...x, poles } : x)));
                        }}
                      />
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
    </div>
  );
}
