"use client";

// Organigramme (lot 16, docs/spec-organigramme.md). Deux onglets : les 13
// équipes telles qu'elles sont tenues, et la vue d'ensemble des musiciens, qui
// est un calcul (D6) — elle n'est jamais ressaisie. L'édition ne s'affiche
// qu'à qui a le droit (admins + droit « Équipes » du profil, D4).
// Lot U6, B2 (question 4) : l'édition passe au Back-Office (Équipes ›
// Organigramme, `gestion`) ; dans l'App, l'organigramme se lit, même un admin.
// Agencement v18 (B8 de docs/spec-agencement-v18.md) : au Back-Office aussi, le bandeau,
// sous l'en-tête commun (`enTete`) ; une carte s'édite dans un panneau (420 px à droite en
// grand, feuille sinon), pour garder des cartes de hauteur fixe.

import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Pencil, X } from "lucide-react";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Pilules } from "@/components/layout/Onglets";
import { useDisposition } from "@/hooks/useDisposition";
import { Halo } from "@/components/layout/Halo";
import { BandeauEquipes } from "@/components/equipes/BandeauEquipes";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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

export function EquipesClient({
  gestion = false,
  enTete,
}: {
  gestion?: boolean;
  /** Au Back-Office : l'en-tête commun (titre, sous-titre, outils, rail) ; `sousEnTete` se pose
   *  sous les pilules Équipes · Musiciens (le résultat de « Recalculer »). */
  enTete?: Omit<ComponentProps<typeof EnTetePage>, "apres"> & { sousEnTete?: ReactNode };
}) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [profils, setProfils] = useState<UserProfile[]>([]);
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  const [fiche, setFiche] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<"equipes" | "musiciens">("equipes");
  const [editee, setEditee] = useState<string | null>(null);

  useEffect(() => {
    listEquipes().then(setEquipes);
    listProfiles().then(setProfils);
    loadPlanningData().then(setPlanning);
  }, []);

  const peutEditer = gestion && canEditerEquipes(user, profile);
  const onglets = [t("equipes.onglet.equipes"), t("equipes.onglet.musiciens")];
  // Lot U4 bis, B6 (Q12) : l'organigramme est un bandeau qui défile de gauche à droite et la
  // page tient dans la hauteur de l'écran. Au Back-Office aussi depuis la v18 (B8) : l'édition
  // n'est plus dans la carte mais dans un panneau.
  const bandeau = onglet === "equipes";
  const equipeDe = (id: string) => equipes.find((e) => e.id === id) ?? null;
  const enregistre = (maj: Equipe) => setEquipes((prev) => [...prev.filter((e) => e.id !== maj.id), maj]);

  const carte = (def: (typeof EQUIPES)[number]) => (
    <CarteEquipe
      key={def.id}
      def={def}
      equipe={equipeDe(def.id)}
      peutEditer={peutEditer}
      enBandeau={bandeau}
      onFiche={setFiche}
      onModifier={() => setEditee(def.id)}
    />
  );

  // Équipes · Musiciens : un sous-onglet, en pilules (agencement v18, R4), App et Back-Office.
  const vues = (
    <Pilules
      etiquette={t("equipes.vue")}
      options={[
        { cle: "equipes" as const, nom: onglets[0] },
        { cle: "musiciens" as const, nom: onglets[1] },
      ]}
      valeur={onglet}
      choisir={(v) => v && setOnglet(v)}
      obligatoire
    />
  );

  const fichePersonne = (
    <FichePersonne
      uid={fiche}
      profils={profils}
      equipes={equipes}
      planning={planning}
      admin={isAdminUser(user)}
      onClose={() => setFiche(null)}
    />
  );

  if (gestion) {
    // Back-Office (agencement v18, B8) : l'en-tête commun, Équipes · Musiciens en pilules
    // (un sous-onglet, R4) ; le bandeau sous l'en-tête, ou la matrice des musiciens.
    const defEditee = EQUIPES.find((d) => d.id === editee) ?? null;
    const entete = (
      <EnTetePage
        {...enTete}
        titre={enTete?.titre ?? t("equipes.title")}
        apres={
          <>
            {vues}
            {enTete?.sousEnTete}
          </>
        }
      />
    );
    return (
      <>
        {bandeau ? (
          <div className="equipes-ecran flex flex-col">
            {entete}
            <BandeauEquipes
              cartes={EQUIPES.map((def) => ({ id: def.id, large: !!def.sousColonnes, carte: carte(def) }))}
            />
          </div>
        ) : (
          <>
            {entete}
            <div className="px-[var(--marge-page)] pb-10">
              <Matrice profils={profils} planning={planning} onFiche={setFiche} />
            </div>
          </>
        )}
        {fichePersonne}
        {peutEditer && (
          <PanneauEquipe
            def={defEditee}
            equipe={defEditee ? equipeDe(defEditee.id) : null}
            profils={profils}
            onClose={() => setEditee(null)}
            onEnregistre={(e) => { enregistre(e); setEditee(null); }}
          />
        )}
      </>
    );
  }

  // App (agencement v18, tranche Z) : l'en-tête commun, Équipes · Musiciens dessous.
  const enTeteApp = <EnTetePage titre={t("equipes.title")} sousTitre={t("equipes.sousTitre")} apres={vues} />;
  if (bandeau) {
    return (
      <div className="relative">
        <Halo variant="moi" color="hsl(var(--foreground))" />
        <div className="equipes-ecran relative flex flex-col">
          {enTeteApp}
          <BandeauEquipes
            cartes={EQUIPES.map((def) => ({ id: def.id, large: !!def.sousColonnes, carte: carte(def) }))}
          />
        </div>
        {fichePersonne}
      </div>
    );
  }

  // App, vue des musiciens.
  return (
    <div className="relative">
      <Halo variant="moi" color="hsl(var(--foreground))" />
      <div className="relative">
        {enTeteApp}
        <div className="px-[var(--marge-page)] pb-10">
          <Matrice profils={profils} planning={planning} onFiche={setFiche} />
        </div>
        {fichePersonne}
      </div>
    </div>
  );
}

// ── Panneau d'édition (Back-Office, droit « Équipes ») ─────────────────────

/** Agencement v18 (B8) : l'édition d'une équipe s'ouvre à côté du bandeau, 420 px à droite
 *  en grand, en feuille sur tablette debout et téléphone ; la carte garde sa hauteur. */
function PanneauEquipe({
  def, equipe, profils, onClose, onEnregistre,
}: {
  def: EquipeDef | null;
  equipe: Equipe | null;
  profils: UserProfile[];
  onClose: () => void;
  onEnregistre: (e: Equipe) => void;
}) {
  const { t } = useTranslation();
  const aDroite = useDisposition() === "grand";
  const sousTitre = def ? t(`equipes.soustitre.${def.id}`) : "";
  return (
    <Drawer open={def !== null} onOpenChange={(o) => !o && onClose()} direction={aDroite ? "right" : "bottom"}>
      <DrawerContent
        // Le sous-titre de l'équipe décrit le panneau ; sans lui, pas de description (Radix).
        {...(sousTitre ? {} : { "aria-describedby": undefined })}
        className={aDroite
          ? "left-auto top-0 bottom-0 mt-0 h-full w-[420px] rounded-none rounded-l-2xl border-y-0 border-r-0 [&>div:first-child]:hidden"
          : "max-h-[90dvh]"}
      >
        {def && (
          <>
            <DrawerHeader className="pb-1 text-left">
              <DrawerTitle>{t(`equipes.team.${def.id}`)}</DrawerTitle>
              {sousTitre && <DrawerDescription>{sousTitre}</DrawerDescription>}
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              <EditionEquipe
                key={def.id}
                def={def}
                pole={equipe?.pole ?? def.pole}
                membres={equipe?.membres ?? []}
                profils={profils}
                onClose={onClose}
                onEnregistre={onEnregistre}
              />
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ── Une équipe ──────────────────────────────────────────────────────────────

function CarteEquipe({
  def, equipe, peutEditer, enBandeau, onFiche, onModifier,
}: {
  def: EquipeDef;
  equipe: Equipe | null;
  peutEditer: boolean;
  /** Dans le bandeau (U4 bis, B6 ; Back-Office depuis la v18) : carte en relief ; Louange et
   *  EDD rangent leurs sous-groupes sur trois colonnes, sous le référent. */
  enBandeau: boolean;
  onFiche: (uid: string) => void;
  /** Crayon : ouvre le panneau d'édition (B8). */
  onModifier: () => void;
}) {
  const { t } = useTranslation();
  const pole = equipe?.pole ?? def.pole;
  const membres = equipe?.membres ?? [];
  const soustitre = t(`equipes.soustitre.${def.id}`);
  const groupes = [...new Set(membres.map((m) => m.groupe))];
  const enColonnes = enBandeau && !!def.sousColonnes;
  const nom = t(`equipes.team.${def.id}`);

  const groupe = (g: string) => (
    <div key={g} className="break-inside-avoid space-y-0.5">
      {g && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
      )}
      {membres.filter((m) => m.groupe === g).sort(referentsDabord).map((m, i) => (
        <LigneMembre key={`${m.nom}-${i}`} membre={m} onFiche={onFiche} />
      ))}
    </div>
  );

  return (
    <section
      data-testid={`equipe-${def.id}`}
      className={enBandeau
        ? "raised rounded-2xl p-4 space-y-2.5"
        : "mb-3 break-inside-avoid rounded-xl bg-card shadow-soft p-4 space-y-2.5"}
    >
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-bold text-foreground">{nom}</h2>
          {peutEditer && (
            <button
              type="button"
              onClick={onModifier}
              aria-label={t("equipes.modifierEquipe", { nom })}
              title={t("equipes.modifier")}
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] transition-colors hover:bg-secondary"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
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

      {membres.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("equipes.aucunMembre")}</p>
      ) : enColonnes ? (
        <div>
          {groupes.includes("") && <div className="pb-2">{groupe("")}</div>}
          <div className="columns-3 gap-4 [&>div]:pb-2">{groupes.filter((g) => g).map(groupe)}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {groupes.map(groupe)}
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
            <Link href={`/back-office/equipes/personnes?uid=${encodeURIComponent(p.uid)}`} className="block text-sm font-semibold text-foreground underline underline-offset-2">
              {t("equipes.fiche.admin")}
            </Link>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
