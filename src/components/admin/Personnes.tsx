"use client";

// Équipes › Personnes (lot U6, B2 ; bloc « Membres » sorti de `admin/page.tsx`,
// l. 794-1075) : liste, fiche, droits. Admins seuls (users/{uid}).
// Agencement v18 (B9 de docs/spec-agencement-v18.md) : les morceaux (données, filtres, ligne,
// formulaire) sont exportés pour `PersonnesVolets` (Back-Office › Équipes › Personnes, en deux
// volets) ; `Personnes` les assemble comme avant pour l'ancienne administration.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, UserRound } from "lucide-react";
import { listProfiles, saveProfile } from "@/lib/firebase/users";
import { listGroupes } from "@/lib/firebase/groupes";
import { groupeDe } from "@/lib/groupes/organigramme";
import { FILTRE_SANS_GROUPE, correspondAuFiltreGroupe, filtresPersonnes, libellePoste, postesDeCompte } from "@/lib/groupes/personnes";
import { groupeDef } from "@/lib/groupes/table";
import type { OrganigrammeGroupe } from "@/types/groupe";
import { isAdminUser } from "@/lib/access";
import {
  loadPlanningData,
  collectPlanningNames,
  deriveServiceRolesFromPlanning,
  type PlanningData,
  normalizeName,
} from "@/lib/planning/names";
import { IdentityFields, PlanningNameField, ProfileFields, type ProfileFormValue } from "@/components/auth/ProfileFields";
import Link from "next/link";
import { CeQueCaOuvre } from "@/components/equipes/OrganigrammeLouange";
import { SERVICE_LIEUX } from "@/types/user";
import { SERVICE_ROLE_LABELS, type ServiceRole, type UserProfile } from "@/types/user";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { NOTIFY_ALL, NOTIFY_GROUPS, audienceLabel } from "@/lib/push/audiences";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { BACK_OFFICE } from "@/lib/backOffice";
import { Button } from "@/components/ui/button";
import { ChampRecherche } from "@/components/layout/ChampRecherche";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pilules } from "@/components/layout/Onglets";
import { Pill } from "./commun";
import { EtatVide } from "@/components/layout/EtatVide"

export function profileToForm(p: UserProfile): ProfileFormValue {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    planningName: p.planningName,
    serviceRoles: p.serviceRoles,
  };
}

/** Les filtres de la liste : Amour, Joie et « Sans groupe » s'y ajoutent interrupteur ouvert (OG-D). */
export const FILTERS = filtresPersonnes();

// Une inscription est « nouvelle » pendant ses 7 premiers jours.
const NEW_DAYS = 7;
export function isRecent(d?: Date): boolean {
  return !!d && Date.now() - d.getTime() < NEW_DAYS * 86_400_000;
}

/** Les données de Personnes : profils, plannings (lus une fois). */
export function useDonneesPersonnes() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [planningNames, setPlanningNames] = useState<string[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  /** Les organigrammes des groupes (interrupteur ouvert) ; `null` = pas lus (ou lecture en échec) : l'écran s'en passe. */
  const [groupes, setGroupes] = useState<OrganigrammeGroupe[] | null>(null);

  /** Relit comptes et groupes après « Changer de groupe » ; la liste reste affichée pendant ce temps. */
  const relire = useCallback(() => {
    listProfiles().then(setProfiles).catch(() => {});
    if (BACK_OFFICE) listGroupes().then((l) => setGroupes(l.map((x) => x.groupe))).catch(() => setGroupes(null));
  }, []);

  useEffect(() => {
    listProfiles().then(setProfiles).finally(() => setLoadingProfiles(false));
    if (BACK_OFFICE) listGroupes().then((l) => setGroupes(l.map((x) => x.groupe))).catch(() => setGroupes(null));
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

  return { profiles, setProfiles, loadingProfiles, planningNames, planningData, stats, groupes, relire };
}

/** Recherche, filtre et tri de la liste. */
export function useFiltresPersonnes(profiles: UserProfile[]) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("Tous");
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
        // Lot AO-B : les filtres lisent l'organigramme (équipes recopiées, lieux), plus `serviceRoles`.
        if (BACK_OFFICE && filter === "EDD") return (p.dansEquipes ?? []).includes("edd");
        if (BACK_OFFICE && filter === "Ne sert pas") return (p.dansEquipes ?? []).length === 0;
        if (BACK_OFFICE && (SERVICE_LIEUX as readonly string[]).includes(filter)) {
          return [...(p.lieuxLouange ?? []), ...(p.lieuxRegie ?? [])].includes(filter);
        }
        if (filter === "EDD") return (EDD_CLASSES as readonly string[]).some((c) => c in p.serviceRoles);
        if (filter === "Ne sert pas") return Object.keys(p.serviceRoles).length === 0;
        // Groupes : `groupeDe` interrupteur ouvert, la clé de serviceRoles sinon (OG-D).
        const groupe = correspondAuFiltreGroupe(p, filter);
        if (groupe !== null) return groupe;
        // Lieux : la catégorie est une clé de serviceRoles
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
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <ChampRecherche
        value={f.query}
        onChange={f.setQuery}
        placeholder="Rechercher un membre (nom, email, nom de planning)…"
        label="Rechercher un membre (nom, email, nom de planning)"
      />
      <Pilules
        etiquette="Filtrer les membres"
        options={FILTERS.map((x) => ({
          cle: x,
          nom: x === FILTRE_SANS_GROUPE ? t("groupes.personnes.sansGroupe") : BACK_OFFICE && x === "Ne sert pas" ? t("equipes.organigramme.personnes.sansEquipe") : x === "Tous" || x === "EDD" || x === "Ne sert pas" ? x : categoryLabel(x),
          couleur: x === "EDD" ? "#3b6d11" : x !== "Tous" && x !== "Ne sert pas" && x !== FILTRE_SANS_GROUPE ? categoryColor(x) : undefined,
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

/** Les services d'un membre en étiquettes (« Nouveau » d'abord). Interrupteur ouvert : « Groupe Paix ·
 *  Responsable louange, Musiciens » (rôles lus dans `groupes` s'ils le sont) ou « Sans groupe » remplace les
 *  étiquettes de clé de groupe de `serviceRoles` (OG-D). */
export function ServicesDuMembre({ p, groupes }: { p: UserProfile; groupes?: OrganigrammeGroupe[] | null }) {
  const { t, i18n } = useTranslation();
  const avecGroupes = BACK_OFFICE;
  const g = avecGroupes ? groupeDe(p) : null;
  const def = g ? groupeDef(g) : undefined;
  const postes = def ? postesDeCompte(groupes?.find((x) => x.id === def.id), p.uid) : [];
  // Lot AO-B : en nouveau mode, ni `serviceRoles` ni rôles déclarés — les sous-équipes et les lieux de l'organigramme.
  const roles = avecGroupes ? [] : Object.entries(p.serviceRoles);
  const lieux = SERVICE_LIEUX.filter((l) => [...(p.lieuxLouange ?? []), ...(p.lieuxRegie ?? [])].includes(l));
  return (
    <div className="flex flex-wrap gap-1">
      {isRecent(p.createdAt) && <Pill label="Nouveau" color="#16a34a" />}
      {avecGroupes && (def
        ? <Pill
            label={[t(`categories.${def.categorie}`), ...(postes.length ? [postes.map((x) => libellePoste(t, i18n.language === "zh-CN", x)).join(", ")] : [])].join(" · ")}
            color={categoryColor(def.categorie)}
          />
        : <Pill label={t("groupes.personnes.sansGroupe")} />)}
      {avecGroupes && (p.sousEquipes ?? []).map((x) => <Pill key={x} label={`${t("equipes.public.louange")} · ${t(`acces.sousEquipe.${x}`)}`} />)}
      {avecGroupes && lieux.map((l) => <Pill key={l} label={categoryLabel(l)} color={categoryColor(l)} />)}
      {roles.map(([cat, roles]) => (
        <Pill
          key={cat}
          label={`${categoryLabel(cat)}${roles.length ? " · " + roles.map((r) => SERVICE_ROLE_LABELS[r]).join("/") : ""}`}
          color={categoryColor(cat)}
        />
      ))}
      {Object.keys(p.serviceRoles).length === 0 && !avecGroupes && <Pill label="Ne sert pas" />}
    </div>
  );
}

/** Une ligne de la liste : avatar, nom, e-mail, services. `fin` : chevron ou autre. */
export function LignePersonne({
  p, onClick, compact, actif, deplie, fin, groupes,
}: {
  p: UserProfile;
  groupes?: OrganigrammeGroupe[] | null;
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
        <ServicesDuMembre p={p} groupes={groupes} />
      </div>
      {fin}
    </button>
  );
}

/** Le formulaire d'un membre (identité, services, droits) : il tient son
 *  brouillon, n'écrit que ses champs (`saveProfile`, masque) et rend le profil à jour. */
export function FormulairePersonne({
  p, planningData, planningNames, onAnnule, onEnregistre,
}: {
  p: UserProfile;
  planningData: PlanningData | null;
  planningNames: string[];
  onAnnule: () => void;
  onEnregistre: (maj: UserProfile) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ProfileFormValue>(() => profileToForm(p));
  const [notifyRights, setNotifyRights] = useState<string[]>(p.notify ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const deriveFromPlanning = planningData
    ? (name: string) => deriveServiceRolesFromPlanning(planningData, name)
    : undefined;

  async function saveEdit() {
    setSaving(true);
    setError("");
    try {
      // Lot AO-B : en nouveau mode, l'identité seule — aucun droit ni rôle de service ne s'écrit d'ici.
      if (BACK_OFFICE) {
        const identite = { uid: p.uid, firstName: form.firstName, lastName: form.lastName, planningName: form.planningName };
        await saveProfile(identite);
        onEnregistre({ ...p, ...identite });
        return;
      }
      // Seuls les champs tenus ici sont écrits (saveProfile n’envoie que le
      // masque) : `dansEquipes` et `referentDe` viennent des équipes (lot 16, D9) et ne sont
      // jamais renvoyés, même périmés. Jusqu’au 19/09/2026 le document entier était remplacé.
      const patch = { uid: p.uid, ...form, annonces: p.annonces ?? [], notify: notifyRights, equipes: p.equipes ?? false, coordination: p.coordination ?? false, plannings: p.plannings ?? [] };
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
      {BACK_OFFICE ? (
        <div className="space-y-6">
          <IdentityFields value={form} onChange={setForm} />
          <PlanningNameField value={form} onChange={setForm} planningNames={planningNames} />
          <CeQueCaOuvre profil={p} />
          <p className="text-sm text-muted-foreground">
            {t("equipes.organigramme.personnes.aide")}{" "}
            <Link href="/back-office/equipes" className="font-semibold text-foreground underline underline-offset-2">
              {t("equipes.organigramme.voir")}
            </Link>
          </p>
        </div>
      ) : (
      <ProfileFields
        value={form}
        onChange={setForm}
        planningNames={planningNames}
        deriveFromPlanning={deriveFromPlanning}
      />
      )}

      {/* Lot AO-B (A2) : plus de case de droit (Équipes, Coordination, plannings, évènements) — les droits viennent de
          l'organigramme ; hors du nouveau mode, ces cases n'existaient pas non plus (lot 18). */}

      {/* Droits d'envoi de notifications manuelles — réservé aux admins */}
      {!BACK_OFFICE && (
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
      )}

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
      <EtatVide compact>{profiles.length === 0 ? "Aucun profil pour l'instant." : "Aucun membre ne correspond."}</EtatVide>
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
              groupes={d.groupes}
              onClick={() => setDeplie(isEditing ? null : p.uid)}
              fin={isEditing
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />}
            />
            {isEditing && (
              <div className="border-t border-border px-4 py-4">
                <FormulairePersonne
                  p={p}
                  planningData={d.planningData}
                  planningNames={d.planningNames}
                  onAnnule={() => setDeplie(null)}
                  onEnregistre={(u) => { maj(u); setDeplie(null); }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
