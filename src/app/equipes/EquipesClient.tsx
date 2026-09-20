"use client";

// Organigramme (lot 16, docs/spec-organigramme.md). Deux onglets : les 13
// équipes telles qu'elles sont tenues, et la vue d'ensemble des musiciens, qui
// est un calcul (D6) — elle n'est jamais ressaisie. L'édition ne s'affiche
// qu'à qui a le droit (admins + droit « Équipes » du profil, D4).

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, X } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { FilterButtons } from "@/components/planning/FilterButtons";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile, listProfiles } from "@/lib/firebase/users";
import { listEquipes, majPoles, saveEquipe } from "@/lib/firebase/equipes";
import { canEditerEquipes, isAdminUser } from "@/lib/access";
import { EQUIPES, type EquipeDef } from "@/lib/equipes/organigramme";
import { COLONNES_MUSICIENS, matriceMusiciens, type LigneMusicien } from "@/lib/equipes/musiciens";
import { findMyServices, loadPlanningData, type PlanningData } from "@/lib/planning/names";
import { categoryLabel } from "@/lib/serviceColors";
import { PLANNING_COLORS } from "@/lib/serviceColors";
import { POLES, SERVICE_ROLE_LABELS, type Pole, type UserProfile } from "@/types/user";
import type { Equipe, MembreEquipe } from "@/types/equipe";

const nomComplet = (p: UserProfile) =>
  `${p.firstName} ${p.lastName}`.trim() || p.planningName || p.email;

/** Référents d'abord, puis l'ordre du Sheet. */
const referentsDabord = (a: MembreEquipe, b: MembreEquipe) =>
  Number(b.referent) - Number(a.referent);

export function EquipesClient() {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [profils, setProfils] = useState<UserProfile[]>([]);
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  const [fiche, setFiche] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<"equipes" | "musiciens">("equipes");

  useEffect(() => {
    listEquipes().then(setEquipes);
    listProfiles().then(setProfils);
    loadPlanningData().then(setPlanning);
  }, []);

  const peutEditer = canEditerEquipes(user, profile);
  const onglets = [t("equipes.onglet.equipes"), t("equipes.onglet.musiciens")];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-10 space-y-5">
      <PageTitle title={t("equipes.title")} subtitle={t("equipes.sousTitre")} />
      <FilterButtons
        options={onglets}
        active={onglets[onglet === "equipes" ? 0 : 1]}
        onChange={(v) => setOnglet(v === onglets[0] ? "equipes" : "musiciens")}
      />

      {onglet === "equipes" ? (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-3">
          {EQUIPES.map((def) => (
            <CarteEquipe
              key={def.id}
              def={def}
              equipe={equipes.find((e) => e.id === def.id) ?? null}
              profils={profils}
              peutEditer={peutEditer}
              onFiche={setFiche}
              onEnregistre={(maj) =>
                setEquipes((prev) => [...prev.filter((e) => e.id !== maj.id), maj])
              }
            />
          ))}
        </div>
      ) : (
        <Matrice profils={profils} planning={planning} onFiche={setFiche} />
      )}

      <FichePersonne
        uid={fiche}
        profils={profils}
        equipes={equipes}
        planning={planning}
        admin={isAdminUser(user)}
        onClose={() => setFiche(null)}
      />
    </div>
  );
}

// ── Une équipe ──────────────────────────────────────────────────────────────

function CarteEquipe({
  def, equipe, profils, peutEditer, onFiche, onEnregistre,
}: {
  def: EquipeDef;
  equipe: Equipe | null;
  profils: UserProfile[];
  peutEditer: boolean;
  onFiche: (uid: string) => void;
  onEnregistre: (e: Equipe) => void;
}) {
  const { t } = useTranslation();
  const [edition, setEdition] = useState(false);
  const pole = equipe?.pole ?? def.pole;
  const membres = equipe?.membres ?? [];
  const soustitre = t(`equipes.soustitre.${def.id}`);
  const groupes = [...new Set(membres.map((m) => m.groupe))];

  return (
    <section
      data-testid={`equipe-${def.id}`}
      className="mb-3 break-inside-avoid rounded-xl bg-card shadow-soft p-4 space-y-2.5"
    >
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">{t(`equipes.team.${def.id}`)}</h2>
          {peutEditer && !edition && (
            <button
              type="button"
              onClick={() => setEdition(true)}
              className="inline-flex items-center gap-1 shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
              {t("equipes.modifier")}
            </button>
          )}
        </div>
        {soustitre && <p className="text-xs text-muted-foreground">{soustitre}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          {pole && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${PLANNING_COLORS.scene}15`, color: PLANNING_COLORS.scene }}
            >
              {t("equipes.donnePole", { pole: t(`taches.pole.${pole}`) })}
            </span>
          )}
          {membres.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {t("equipes.membres", { count: membres.length })}
            </span>
          )}
        </div>
      </header>

      {edition ? (
        <EditionEquipe
          def={def}
          pole={pole}
          membres={membres}
          profils={profils}
          onClose={() => setEdition(false)}
          onEnregistre={(e) => { onEnregistre(e); setEdition(false); }}
        />
      ) : membres.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("equipes.aucunMembre")}</p>
      ) : (
        <div className="space-y-2">
          {groupes.map((g) => (
            <div key={g} className="space-y-0.5">
              {g && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
              )}
              {membres.filter((m) => m.groupe === g).sort(referentsDabord).map((m, i) => (
                <LigneMembre key={`${m.nom}-${i}`} membre={m} onFiche={onFiche} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LigneMembre({ membre, onFiche }: { membre: MembreEquipe; onFiche: (uid: string) => void }) {
  const { t } = useTranslation();
  const contenu = (
    <>
      <span className={membre.referent ? "font-semibold" : ""}>{membre.nom}</span>
      {membre.mention && <span className="text-muted-foreground"> — {membre.mention}</span>}
      {membre.referent && !/^R[ée]f/i.test(membre.mention) && (
        <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground">{t("equipes.referent")}</span>
      )}
      {membre.essai && (
        <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          {t("equipes.essai")}
        </span>
      )}
    </>
  );
  if (!membre.uid) return <p className="text-sm text-foreground">{contenu}</p>;
  return (
    <button
      type="button"
      onClick={() => onFiche(membre.uid)}
      className="block w-full text-left text-sm text-foreground underline-offset-2 hover:underline"
    >
      {contenu}
    </button>
  );
}

// ── Édition (droit « Équipes ») ─────────────────────────────────────────────

function EditionEquipe({
  def, pole, membres, profils, onClose, onEnregistre,
}: {
  def: EquipeDef;
  pole: Pole | null;
  membres: MembreEquipe[];
  profils: UserProfile[];
  onClose: () => void;
  onEnregistre: (e: Equipe) => void;
}) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const [brouillon, setBrouillon] = useState<MembreEquipe[]>(membres);
  const [poleChoisi, setPoleChoisi] = useState<Pole | null>(pole);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  const q = recherche.trim().toLowerCase();
  const deja = new Set(brouillon.map((m) => m.uid).filter(Boolean));
  const resultats = q
    ? profils.filter((p) => !deja.has(p.uid) && nomComplet(p).toLowerCase().includes(q)).slice(0, 5)
    : [];

  const change = (i: number, champ: Partial<MembreEquipe>) =>
    setBrouillon((prev) => prev.map((m, j) => (j === i ? { ...m, ...champ } : m)));

  function ajoute(m: MembreEquipe) {
    setBrouillon((prev) => [...prev, m]);
    setRecherche("");
  }

  async function enregistrer() {
    if (!user) return;
    setEnCours(true);
    setErreur("");
    try {
      const nom = profile ? nomComplet(profile) : (user.email ?? "");
      await saveEquipe(def.id, { pole: poleChoisi, membres: brouillon }, { uid: user.uid, nom });
      // Les pôles se reposent côté serveur : le navigateur n'écrit pas un profil.
      const touches = [...membres, ...brouillon].map((m) => m.uid).filter(Boolean);
      await majPoles([...new Set(touches)]);
      onEnregistre({
        id: def.id, pole: poleChoisi, membres: brouillon,
        updatedAt: new Date().toISOString(), parUid: user.uid, parNom: nom,
      });
    } catch {
      setErreur(t("equipes.erreur"));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-2.5 border-t border-border pt-3">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-muted-foreground">{t("equipes.poleEquipe")}</span>
        <select
          value={poleChoisi ?? ""}
          onChange={(e) => setPoleChoisi((e.target.value || null) as Pole | null)}
          className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
        >
          <option value="">{t("equipes.aucunPole")}</option>
          {POLES.map((p) => (
            <option key={p} value={p}>{t(`taches.pole.${p}`)}</option>
          ))}
        </select>
      </label>

      <div className="space-y-1.5">
        {brouillon.map((m, i) => (
          <div key={`${m.nom}-${i}`} className="rounded-lg border border-border p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{m.nom}</span>
              <button
                type="button"
                aria-label={t("equipes.retirer", { nom: m.nom })}
                onClick={() => setBrouillon((prev) => prev.filter((_, j) => j !== i))}
                className="h-8 w-8 rounded-full bg-secondary text-muted-foreground hover:text-destructive flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Input
              value={m.mention}
              placeholder={t("equipes.mention")}
              onChange={(e) => change(i, { mention: e.target.value })}
              className="h-9"
            />
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={m.referent} onChange={(e) => change(i, { referent: e.target.checked })} />
                {t("equipes.referent")}
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={m.essai} onChange={(e) => change(i, { essai: e.target.checked })} />
                {t("equipes.essai")}
              </label>
            </div>
          </div>
        ))}
      </div>

      <Input
        value={recherche}
        placeholder={t("equipes.ajouterMembre")}
        onChange={(e) => setRecherche(e.target.value)}
        className="h-10"
      />
      {q && (
        <div className="space-y-1">
          {resultats.map((p) => (
            <button
              key={p.uid}
              type="button"
              onClick={() => ajoute({ nom: nomComplet(p), uid: p.uid, mention: "", referent: false, essai: false, groupe: "" })}
              className="block w-full rounded-lg bg-secondary px-2.5 py-1.5 text-left text-sm text-foreground"
            >
              {nomComplet(p)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => ajoute({ nom: recherche.trim(), uid: "", mention: "", referent: false, essai: false, groupe: "" })}
            className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-muted-foreground"
          >
            {t("equipes.nomLibre", { nom: recherche.trim() })}
          </button>
        </div>
      )}

      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} className="h-10">{t("equipes.annuler")}</Button>
        <Button onClick={enregistrer} disabled={enCours} className="h-10">{t("equipes.enregistrer")}</Button>
      </div>
    </div>
  );
}

// ── Vue d'ensemble des musiciens ────────────────────────────────────────────

function Matrice({
  profils, planning, onFiche,
}: {
  profils: UserProfile[];
  planning: PlanningData | null;
  onFiche: (uid: string) => void;
}) {
  const { t } = useTranslation();
  const lignes = useMemo(
    () => (planning ? matriceMusiciens(profils, planning) : []),
    [profils, planning],
  );
  const cases = (l: LigneMusicien, c: (typeof COLONNES_MUSICIENS)[number]) =>
    l.cases[c].map((r) => t(`equipes.role.${r}`)).join(", ");

  if (lignes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("equipes.matriceVide")}</p>;
  }

  return (
    <>
      <div data-testid="matrice-table" className="hidden sm:block overflow-x-auto rounded-xl bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 bg-card">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t("equipes.nom")}</th>
              {COLONNES_MUSICIENS.map((c) => (
                <th key={c} className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                  {t(`equipes.colonne.${c}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.uid} className="border-t border-border">
                <th scope="row" className="px-3 py-1.5 text-left font-semibold">
                  <button type="button" onClick={() => onFiche(l.uid)} className="hover:underline">{l.nom}</button>
                </th>
                {COLONNES_MUSICIENS.map((c) => (
                  <td key={c} className="px-2 py-1.5 text-xs text-muted-foreground">
                    {l.cases[c].length > 0 && (
                      <button type="button" onClick={() => onFiche(l.uid)} className="hover:underline">
                        {cases(l, c)}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div data-testid="matrice-cartes" className="sm:hidden space-y-2">
        {lignes.map((l) => (
          <div key={l.uid} className="rounded-xl bg-card p-3 space-y-1">
            <button type="button" onClick={() => onFiche(l.uid)} className="text-sm font-semibold text-foreground">
              {l.nom}
            </button>
            {COLONNES_MUSICIENS.filter((c) => l.cases[c].length > 0).map((c) => (
              <p key={c} className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{t(`equipes.colonne.${c}`)}</span> · {cases(l, c)}
              </p>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Fiche d'une personne ────────────────────────────────────────────────────

function FichePersonne({
  uid, profils, equipes, planning, admin, onClose,
}: {
  uid: string | null;
  profils: UserProfile[];
  equipes: Equipe[];
  planning: PlanningData | null;
  admin: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const p = profils.find((x) => x.uid === uid) ?? null;
  const siennes = equipes.filter((e) => e.membres.some((m) => m.uid === uid));
  const roles = planning && p?.planningName
    ? [...new Set(findMyServices(planning, p.planningName).map((s) => s.role))]
    : [];

  return (
    <Drawer open={uid !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent data-testid="fiche" className="max-h-[85vh] md:max-w-lg md:mx-auto">
        <DrawerHeader className="pb-1">
          <DrawerTitle>{p ? nomComplet(p) : ""}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {siennes.length > 0 && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("equipes.fiche.equipes")}</h3>
              {siennes.map((e) => {
                const m = e.membres.find((x) => x.uid === uid)!;
                return (
                  <p key={e.id} className="text-sm text-foreground">
                    {t(`equipes.team.${e.id}`)}
                    {m.referent && <span className="ml-1.5 text-xs text-muted-foreground">{t("equipes.referent")}</span>}
                    {m.essai && <span className="ml-1.5 text-xs text-muted-foreground">{t("equipes.essai")}</span>}
                  </p>
                );
              })}
            </section>
          )}
          {p && Object.keys(p.serviceRoles).length > 0 && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("equipes.fiche.services")}</h3>
              {Object.entries(p.serviceRoles).map(([cat, r]) => (
                <p key={cat} className="text-sm text-foreground">
                  {categoryLabel(cat)} · {r.map((x) => SERVICE_ROLE_LABELS[x]).join(", ")}
                </p>
              ))}
            </section>
          )}
          {roles.length > 0 && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("equipes.fiche.planning")}</h3>
              <p className="text-sm text-foreground">{roles.join(", ")}</p>
            </section>
          )}
          {siennes.length === 0 && roles.length === 0 && (!p || Object.keys(p.serviceRoles).length === 0) && (
            <p className="text-sm text-muted-foreground">{t("equipes.fiche.rien")}</p>
          )}
          {admin && p && (
            <a href="/admin" className="block text-sm font-semibold text-foreground underline underline-offset-2">
              {t("equipes.fiche.admin")}
            </a>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
