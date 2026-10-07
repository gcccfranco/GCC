"use client";

// Équipes › Personnes (lot U6, B2 ; bloc « Membres » sorti de `admin/page.tsx`,
// l. 794-1075) : liste, fiche, pôles en lecture, droits. Admins seuls (users/{uid}).
// Agencement v18 (B9 de docs/spec-agencement-v18.md) : les morceaux (données, filtres, ligne,
// formulaire) sont exportés pour `PersonnesVolets` (Back-Office › Équipes › Personnes, en deux
// volets) ; `Personnes` les assemble comme avant pour l'ancienne administration.
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Pilules } from "@/components/layout/Onglets";
import { Pill } from "./commun";

export function profileToForm(p: UserProfile): ProfileFormValue {
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
export function PolesDuMembre({ profile, equipes, onDecoche }: { profile: UserProfile; equipes: Equipe[]; onDecoche: () => Promise<void> }) {
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

export const FILTERS = ["Tous", ...SERVICE_LIEUX, "EDD", ...GROUPES, "Ne sert pas"] as const;

// Une inscription est « nouvelle » pendant ses 7 premiers jours.
const NEW_DAYS = 7;
export function isRecent(d?: Date): boolean {
  return !!d && Date.now() - d.getTime() < NEW_DAYS * 86_400_000;
}

/** Les données de Personnes : profils, équipes, plannings (lues une fois). */
export function useDonneesPersonnes() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [equipes, setEquipes] = useState<Equipe[]>([]);

  useEffect(() => {
    listProfiles().then(setProfiles).finally(() => setLoadingProfiles(false));
    listEquipes().then(setEquipes);
    loadPlanningData().then((d) => {
      setPlanningData(d);
      setPlanningNames(collectPlanningNames(d));
    });
  }, []);

  const stats = useMemo(() => {
    const allRoles = (p: UserProfile): ServiceRole[] => Object.values(p.serviceRoles).flat();
    const musiciens = profiles.filter((p) => allRoles(p).includes("musicien")).length;
    const chanteurs = profiles.filter((p) => allRoles(p).includes("chanteur")).length;
    const presidences = profiles.filter((p) => allRoles(p).includes("presidence")).length;
    const nouveaux = profiles.filter((p) => isRecent(p.createdAt)).length;
    return { musiciens, chanteurs, presidences, nouveaux };
  }, [profiles]);

  return { profiles, setProfiles, loadingProfiles, planningNames, planningData, equipes, stats };
}

/** Recherche, filtre et tri de la liste. */
export function useFiltresPersonnes(profiles: UserProfile[]) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tous");
  const [sort, setSort] = useState<"recent" | "name">("recent");

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

  return { query, setQuery, filter, setFilter, sort, setSort, displayed };
}

/** Recherche, filtres en pilules (R4), tri Récents · A–Z. */
export function FiltresPersonnes({ f }: { f: ReturnType<typeof useFiltresPersonnes> }) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          value={f.query}
          onChange={(e) => f.setQuery(e.target.value)}
          placeholder="Rechercher un membre (nom, email, nom de planning)…"
          className="h-11 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {f.query && (
          <button
            onClick={() => f.setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Pilules
        etiquette="Filtrer les membres"
        options={FILTERS.map((x) => ({
          cle: x,
          nom: x === "Tous" || x === "EDD" || x === "Ne sert pas" ? x : categoryLabel(x),
          couleur: x === "EDD" ? "#3b6d11" : x !== "Tous" && x !== "Ne sert pas" ? categoryColor(x) : undefined,
        }))}
        valeur={f.filter}
        choisir={(v) => f.setFilter(v ?? "Tous")}
        obligatoire
      />
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="font-semibold text-muted-foreground">Trier :</span>
        {(["recent", "name"] as const).map((x) => (
          <button
            key={x}
            onClick={() => f.setSort(x)}
            aria-pressed={f.sort === x}
            className={`px-2.5 py-1 rounded-full font-semibold border transition-colors ${
              f.sort === x
                ? "bg-foreground text-background border-transparent"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {x === "recent" ? "Récents" : "A–Z"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Initiales d'un membre (ou l'icône). */
export function Avatar({ p, grand }: { p: UserProfile; grand?: boolean }) {
  return (
    <span
      className={`${grand ? "h-14 w-14 text-lg" : "h-8 w-8 mt-0.5 text-xs"} rounded-full bg-secondary text-foreground font-bold flex items-center justify-center shrink-0 uppercase`}
    >
      {(p.firstName[0] ?? "") + (p.lastName[0] ?? "") || <UserRound className="h-4 w-4" />}
    </span>
  );
}

/** Les services d'un membre en étiquettes (« Nouveau » d'abord). */
export function ServicesDuMembre({ p }: { p: UserProfile }) {
  return (
    <div className="flex flex-wrap gap-1">
      {isRecent(p.createdAt) && <Pill label="Nouveau" color="#16a34a" />}
      {Object.entries(p.serviceRoles).map(([cat, roles]) => (
        <Pill
          key={cat}
          label={`${categoryLabel(cat)}${roles.length ? " · " + roles.map((r) => SERVICE_ROLE_LABELS[r]).join("/") : ""}`}
          color={categoryColor(cat)}
        />
      ))}
      {Object.keys(p.serviceRoles).length === 0 && <Pill label="Ne sert pas" />}
    </div>
  );
}

/** Une ligne de la liste : avatar, nom, e-mail, services. `fin` : chevron ou autre. */
export function LignePersonne({
  p, onClick, compact, actif, deplie, fin,
}: {
  p: UserProfile;
  onClick: () => void;
  /** Deux volets (B9) : avatar, nom, services ; l'e-mail et la date sont dans la fiche. */
  compact?: boolean;
  /** Choisie dans les deux volets (`aria-current`). */
  actif?: boolean;
  /** Dépliée sur place (un volet, `aria-expanded`). */
  deplie?: boolean;
  fin?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={actif ? "true" : undefined}
      aria-expanded={deplie}
      className="w-full flex items-start gap-3 px-4 py-3 text-left"
    >
      <Avatar p={p} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground truncate">
          {p.firstName} {p.lastName}
          {isAdminUser(p) && (
            <span className="ml-2 text-xs font-semibold text-muted-foreground">admin</span>
          )}
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground truncate">
            {p.email}
            {p.planningName ? ` · planning : ${p.planningName}` : ""}
            {p.createdAt ? ` · inscrit le ${p.createdAt.toLocaleDateString("fr-FR")}` : ""}
          </p>
        )}
        <ServicesDuMembre p={p} />
      </div>
      {fin}
    </button>
  );
}

/** Le formulaire d'un membre (identité, services, pôles en lecture, droits) : il tient son
 *  brouillon, n'écrit que ses champs (`saveProfile`, masque) et rend le profil à jour. */
export function FormulairePersonne({
  p, equipes, planningData, planningNames, onAnnule, onEnregistre, onPoles,
}: {
  p: UserProfile;
  equipes: Equipe[];
  planningData: PlanningData | null;
  planningNames: string[];
  onAnnule: () => void;
  onEnregistre: (maj: UserProfile) => void;
  /** Pôles reposés depuis les équipes (« Décocher »). */
  onPoles: (poles: UserProfile["poles"]) => void;
}) {
  const [form, setForm] = useState<ProfileFormValue>(() => profileToForm(p));
  const [annonceRights, setAnnonceRights] = useState<string[]>(p.annonces ?? []);
  const [notifyRights, setNotifyRights] = useState<string[]>(p.notify ?? []);
  const [equipesRight, setEquipesRight] = useState(p.equipes ?? false);
  const [planningRights, setPlanningRights] = useState<string[]>(p.plannings ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const deriveFromPlanning = planningData
    ? (name: string) => deriveServiceRolesFromPlanning(planningData, name)
    : undefined;

  async function saveEdit() {
    setSaving(true);
    setError("");
    try {
      // Seuls les champs tenus ici sont écrits (saveProfile n’envoie que le
      // masque) : `poles` vient des équipes (lot 16, D9) et n’est jamais renvoyé,
      // même périmé. Jusqu’au 19/09/2026 le document entier était remplacé.
      const patch = { uid: p.uid, ...form, annonces: annonceRights, notify: notifyRights, equipes: equipesRight, plannings: planningRights };
      await saveProfile(patch);
      onEnregistre({ ...p, ...patch });
    } catch {
      setError("Erreur lors de l'enregistrement du profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
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
            onPoles(polesDesEquipes(p.uid, equipes));
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
        <Button variant="outline" onClick={onAnnule} className="h-11">
          Annuler
        </Button>
        <Button onClick={() => void saveEdit()} disabled={saving} className="h-11">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

/** Ancienne administration (`/admin`, interrupteur coupé) : la carte « Membres », chaque
 *  membre se déplie sur place. `onCompte` : nombre d'inscrits (pastille de l'onglet). */
export function Personnes({ onCompte }: { onCompte?: (n: number) => void }) {
  const d = useDonneesPersonnes();
  const f = useFiltresPersonnes(d.profiles);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const { profiles, stats } = d;

  useEffect(() => {
    onCompte?.(profiles.length);
  }, [onCompte, profiles.length]);

  return (
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

      <FiltresPersonnes f={f} />

      <ListePersonnes d={d} f={f} deplie={editingUid} setDeplie={setEditingUid} />
    </div>
  );
}

/** La liste, un membre déplié sur place avec son formulaire (un volet). */
export function ListePersonnes({
  d, f, deplie, setDeplie,
}: {
  d: ReturnType<typeof useDonneesPersonnes>;
  f: ReturnType<typeof useFiltresPersonnes>;
  deplie: string | null;
  setDeplie: (uid: string | null) => void;
}) {
  const { profiles, loadingProfiles } = d;
  const maj = (u: UserProfile) => d.setProfiles((prev) => prev.map((x) => (x.uid === u.uid ? u : x)));
  if (loadingProfiles) return <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>;
  if (f.displayed.length === 0)
    return (
      <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
        {profiles.length === 0 ? "Aucun profil pour l'instant." : "Aucun membre ne correspond."}
      </p>
    );
  return (
    <div className="space-y-2">
      {f.displayed.map((p) => {
        const isEditing = deplie === p.uid;
        return (
          <div key={p.uid} className="rounded-xl bg-card">
            <LignePersonne
              p={p}
              deplie={isEditing}
              onClick={() => setDeplie(isEditing ? null : p.uid)}
              fin={isEditing
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />}
            />
            {isEditing && (
              <div className="border-t border-border px-4 py-4">
                <FormulairePersonne
                  p={p}
                  equipes={d.equipes}
                  planningData={d.planningData}
                  planningNames={d.planningNames}
                  onAnnule={() => setDeplie(null)}
                  onEnregistre={(u) => { maj(u); setDeplie(null); }}
                  onPoles={(poles) => maj({ ...p, poles })}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
