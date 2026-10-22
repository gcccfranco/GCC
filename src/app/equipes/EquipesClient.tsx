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
import { listEquipes, majRattachement, saveEquipe } from "@/lib/firebase/equipes";
import {
  canEditerEquipes, isAdminUser, peutChangerReferents, peutModifierEquipe, peutPlacerMembre, peutPlacerSousEquipe,
} from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { CeQueCaOuvre, CorpsLouange, MembreOrganigramme, ligneGrise, majuscule, resume } from "@/components/equipes/OrganigrammeLouange";
import { COLONNE_LIEU, porteDesLieux, referentSousDe, sousEquipesDe } from "@/lib/equipes/louange";
import { EQUIPES, type EquipeDef } from "@/lib/equipes/organigramme";
import {
  COLONNES_MUSICIENS, matriceMusiciens, matriceMusiciensOrganigramme, type LigneMusicien,
} from "@/lib/equipes/musiciens";
import { findMyServices, loadPlanningData, type PlanningData } from "@/lib/planning/names";
import { categoryLabel } from "@/lib/serviceColors";
import { SERVICE_LIEUX, SERVICE_ROLE_LABELS, type UserProfile } from "@/types/user";
import { SOUS_EQUIPES, type Equipe, type MembreEquipe } from "@/types/equipe";

const nomComplet = (p: UserProfile) =>
  `${p.firstName} ${p.lastName}`.trim() || p.planningName || p.email;

/** Référents d'abord, puis l'ordre du Sheet. */
const referentsDabord = (a: MembreEquipe, b: MembreEquipe) =>
  Number(b.referent) - Number(a.referent);

export function EquipesClient({
  gestion = false,
  enTete,
  selecteur,
}: {
  gestion?: boolean;
  /** Le sélecteur Église · Paix · … des organigrammes (lot 2, OG-C) : à gauche, Équipes · Musiciens
   *  à droite (en dessous sur téléphone et tablette debout). */
  selecteur?: ReactNode;
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
    // Nouveau mode (lot AO) : ni le planning ni `serviceRoles` ne servent plus ici, l'organigramme suffit.
    if (!BACK_OFFICE) loadPlanningData().then(setPlanning);
  }, []);

  const peutEditer = gestion && canEditerEquipes(user, profile);
  // Lot AO-B : le crayon n'apparaît que sur les cartes qu'on peut modifier (Orga, référent de l'équipe, référent
  // d'une sous-équipe de Louange) ; l'ancien mode garde le droit « Équipes » pour toutes.
  const modifiable = (id: string) =>
    !peutEditer ? false
      : !BACK_OFFICE ? true
      : peutModifierEquipe(user, profile, id) || (id === "louange" && SOUS_EQUIPES.some((s) => peutPlacerSousEquipe(user, profile, s)));
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
      peutEditer={modifiable(def.id)}
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
            {selecteur ? (
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">{selecteur}</div>
                <div className="shrink-0">{vues}</div>
              </div>
            ) : vues}
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
              <Matrice profils={profils} equipes={equipes} planning={planning} onFiche={setFiche} />
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
  // Lot 2 (OG-E) : le sélecteur Église · Paix · … à gauche, Équipes · Musiciens à droite, et le sous-titre des organigrammes.
  const enTeteApp = (
    <EnTetePage
      titre={t("equipes.title")}
      sousTitre={selecteur ? t("groupes.app.sousTitre") : t("equipes.sousTitre")}
      apres={selecteur ? (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">{selecteur}</div>
          <div className="shrink-0">{vues}</div>
        </div>
      ) : vues}
    />
  );
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
          <Matrice profils={profils} equipes={equipes} planning={planning} onFiche={setFiche} />
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
  const membres = equipe?.membres ?? [];
  const soustitre = t(`equipes.soustitre.${def.id}`);
  const groupes = [...new Set(membres.map((m) => m.groupe))];
  const enColonnes = enBandeau && !!def.sousColonnes;
  const nom = t(`equipes.team.${def.id}`);

  // Lot AO-B : Louange en trois sous-équipes, lignes grises des lieux pour Louange et Régie.
  const nouveauLouange = BACK_OFFICE && def.id === "louange";
  const nouveauRegie = BACK_OFFICE && def.id === "regie";

  const groupe = (g: string) => (
    <div key={g} className="break-inside-avoid space-y-0.5">
      {g && (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
      )}
      {membres.filter((m) => m.groupe === g).sort(referentsDabord).map((m, i) => (
        <LigneMembre key={`${m.nom}-${i}`} membre={m} onFiche={onFiche} detail={nouveauRegie ? ligneGrise(t, m, false) : undefined} />
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
          {membres.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {t("equipes.membres", { count: membres.length })}
            </span>
          )}
        </div>
      </header>

      {membres.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("equipes.aucunMembre")}</p>
      ) : nouveauLouange ? (
        <CorpsLouange
          membres={membres}
          ligne={(m, { referent, detail }) => <LigneMembre membre={m} onFiche={onFiche} referentTexte={referent} detail={detail} />}
        />
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

function LigneMembre({
  membre, onFiche, detail, referentTexte,
}: {
  membre: MembreEquipe;
  onFiche: (uid: string) => void;
  /** Lot AO-B : la ligne grise sous le nom (lieux, instruments). */
  detail?: string;
  /** Lot AO-B (Louange) : le nom en gras avec « — Référent·e » ; `null` = pas référent ici ; absent = l'ancien affichage. */
  referentTexte?: string | null;
}) {
  const { t } = useTranslation();
  const nouveau = referentTexte !== undefined;
  const gras = nouveau ? referentTexte !== null : membre.referent;
  const contenu = (
    <>
      <span className={gras ? "font-semibold" : ""}>{membre.nom}</span>
      {membre.mention && <span className="text-muted-foreground"> — {membre.mention}</span>}
      {nouveau && referentTexte && <span className="text-muted-foreground"> — {referentTexte}</span>}
      {!nouveau && membre.referent && !/^R[ée]f/i.test(membre.mention) && (
        <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground">{t("equipes.referent")}</span>
      )}
      {membre.essai && (
        <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          {t("equipes.essai")}
        </span>
      )}
      {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
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

const cleMembre = (m: MembreEquipe) => `${m.uid}|${m.nom}`;

function EditionEquipe({
  def, membres, profils, onClose, onEnregistre,
}: {
  def: EquipeDef;
  membres: MembreEquipe[];
  profils: UserProfile[];
  onClose: () => void;
  onEnregistre: (e: Equipe) => void;
}) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const [brouillon, setBrouillon] = useState<MembreEquipe[]>(membres);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  // Lot AO-B (B3, F2) : en nouveau mode, Louange et Régie s'éditent par pastilles, et les droits se lisent
  // dans access.ts. Orga, admin, référent de l'équipe : tout ; un référent de sous-équipe : les membres de la
  // sienne seulement.
  const nouveau = BACK_OFFICE;
  const aLieux = nouveau && porteDesLieux(def.id);
  const louange = def.id === "louange";
  const droits = {
    equipe: !nouveau || peutModifierEquipe(user, profile, def.id),
    sous: (s: (typeof SOUS_EQUIPES)[number]) => peutPlacerSousEquipe(user, profile, s),
    referents: !nouveau || peutChangerReferents(user, profile, def.id),
  };
  const siennes = SOUS_EQUIPES.filter((s) => droits.sous(s));
  const peutAjouter = !nouveau || droits.equipe || (louange && siennes.length > 0);
  const peutOuvrir = (m: MembreEquipe) => (louange ? peutPlacerMembre(user, profile, "louange", sousEquipesDe(m)) : droits.equipe);
  // Qui s'ouvre est décidé sur la ligne d'arrivée : décocher sa propre sous-équipe ne ferme pas la ligne.
  const originaux = useMemo(() => new Map(membres.map((m) => [cleMembre(m), m])), [membres]);
  const [ajoutes, setAjoutes] = useState<Set<string>>(() => new Set());
  const ouvrable = (m: MembreEquipe) => ajoutes.has(cleMembre(m)) || peutOuvrir(originaux.get(cleMembre(m)) ?? m);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const q = recherche.trim().toLowerCase();
  const deja = new Set(brouillon.map((m) => m.uid).filter(Boolean));
  const resultats = q
    ? profils.filter((p) => !deja.has(p.uid) && nomComplet(p).toLowerCase().includes(q)).slice(0, 5)
    : [];

  const change = (i: number, champ: Partial<MembreEquipe>) =>
    setBrouillon((prev) => prev.map((m, j) => (j === i ? { ...m, ...champ } : m)));

  function ajoute(m: MembreEquipe) {
    // Un référent de sous-équipe place quelqu'un dans la sienne (F2).
    const arrivee: MembreEquipe = aLieux && louange && !droits.equipe && siennes.length > 0 ? { ...m, sousEquipes: [siennes[0]] } : m;
    setBrouillon((prev) => [...prev, arrivee]);
    setAjoutes((prev) => new Set(prev).add(cleMembre(arrivee)));
    if (aLieux) setOuvert(cleMembre(arrivee));
    setRecherche("");
  }

  function retire(i: number) {
    const m = brouillon[i];
    // Un référent de sous-équipe retire de SA sous-équipe ; la ligne ne disparaît que s'il ne reste aucune autre.
    if (louange && nouveau && !droits.equipe) {
      const reste = sousEquipesDe(m).filter((s) => !droits.sous(s));
      if (reste.length > 0) {
        change(i, { sousEquipes: reste, referentSous: referentSousDe(m).filter((s) => reste.includes(s)) });
        return;
      }
    }
    setBrouillon((prev) => prev.filter((_, j) => j !== i));
  }

  async function enregistrer() {
    if (!user) return;
    setEnCours(true);
    setErreur("");
    try {
      const nom = profile ? nomComplet(profile) : (user.email ?? "");
      await saveEquipe(def.id, brouillon, { uid: user.uid, nom });
      // Le rattachement se repose côté serveur : le navigateur n'écrit pas un profil.
      const touches = [...membres, ...brouillon].map((m) => m.uid).filter(Boolean);
      await majRattachement([...new Set(touches)]);
      onEnregistre({
        id: def.id, membres: brouillon,
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
      <div className="space-y-1.5">
        {brouillon.map((m, i) => aLieux ? (
          <MembreOrganigramme
            key={`${m.nom}-${i}`}
            equipe={def.id as "louange" | "regie"}
            m={m}
            profil={profils.find((p) => p.uid === m.uid)}
            ouvert={ouvert === cleMembre(m)}
            ouvrable={ouvrable(m)}
            onBascule={() => setOuvert((o) => (o === cleMembre(m) ? null : cleMembre(m)))}
            droits={droits}
            onChange={(champ) => change(i, champ)}
            onRetirer={() => retire(i)}
          />
        ) : (
          <div key={`${m.nom}-${i}`} className="rounded-lg border border-border p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{m.nom}</span>
              <button
                type="button"
                aria-label={t("equipes.retirer", { nom: m.nom })}
                onClick={() => retire(i)}
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
                <input type="checkbox" checked={m.referent} disabled={!droits.referents} onChange={(e) => change(i, { referent: e.target.checked })} />
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

      {peutAjouter && (
        <Input
          value={recherche}
          placeholder={t("equipes.ajouterMembre")}
          onChange={(e) => setRecherche(e.target.value)}
          className="h-10"
        />
      )}
      {peutAjouter && q && (
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
  profils, equipes, planning, onFiche,
}: {
  profils: UserProfile[];
  equipes: Equipe[];
  planning: PlanningData | null;
  onFiche: (uid: string) => void;
}) {
  if (BACK_OFFICE) return <MatriceOrganigramme equipes={equipes} onFiche={onFiche} />;
  return <MatriceAncienne profils={profils} planning={planning} onFiche={onFiche} />;
}

/** Lot AO-B : les Musiciens de l'organigramme, ce qu'ils jouent et où ils servent (plus de `serviceRoles` ni de planning). */
function MatriceOrganigramme({ equipes, onFiche }: { equipes: Equipe[]; onFiche: (uid: string) => void }) {
  const { t } = useTranslation();
  const lignes = useMemo(() => matriceMusiciensOrganigramme(equipes), [equipes]);
  const instruments = (joue: readonly string[]) => joue.map((i) => majuscule(t(`acces.instrument.${i}`))).join(", ");
  const nom = (l: (typeof lignes)[number]) =>
    l.uid ? <button type="button" onClick={() => onFiche(l.uid)} className="hover:underline">{l.nom}</button> : <span>{l.nom}</span>;
  if (lignes.length === 0) return <p className="text-sm text-muted-foreground">{t("equipes.matriceVide")}</p>;
  return (
    <>
      <div data-testid="matrice-table" className="hidden sm:block overflow-x-auto rounded-xl bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 bg-card">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t("equipes.nom")}</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">{t("equipes.organigramme.ceQuIlJoue")}</th>
              {SERVICE_LIEUX.map((l) => (
                <th key={l} className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">{t(`equipes.colonne.${COLONNE_LIEU[l]}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.cle} className="border-t border-border">
                <th scope="row" className="px-3 py-1.5 text-left font-semibold">{nom(l)}</th>
                <td className="px-2 py-1.5 text-xs text-muted-foreground">{instruments(l.joue)}</td>
                {SERVICE_LIEUX.map((lieu) => (
                  <td key={lieu} className="px-2 py-1.5 text-xs text-muted-foreground">
                    {l.lieux.includes(lieu) && <span aria-label={t("equipes.organigramme.sertLa")}>●</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div data-testid="matrice-cartes" className="sm:hidden space-y-2">
        {lignes.map((l) => (
          <div key={l.cle} className="rounded-xl bg-card p-3 space-y-1">
            <p className="text-sm font-semibold text-foreground">{nom(l)}</p>
            {l.joue.length > 0 && <p className="text-xs text-muted-foreground">{instruments(l.joue)}</p>}
            {l.lieux.length > 0 && <p className="text-xs text-muted-foreground">{l.lieux.map((x) => t(`equipes.colonne.${COLONNE_LIEU[x]}`)).join(" · ")}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

function MatriceAncienne({
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
  // Nouveau mode (lot AO-B) : ni `serviceRoles` ni le planning, seulement l'organigramme.
  const roles = !BACK_OFFICE && planning && p?.planningName
    ? [...new Set(findMyServices(planning, p.planningName).map((s) => s.role))]
    : [];
  const anciensServices = !BACK_OFFICE && p && Object.keys(p.serviceRoles).length > 0;

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
                const m = e.membres.filter((x) => x.uid === uid).reduce((a, b) => ({
                  ...a, referent: a.referent || b.referent, essai: a.essai && b.essai,
                  sousEquipes: [...(a.sousEquipes ?? []), ...(b.sousEquipes ?? [])],
                  referentSous: [...(a.referentSous ?? []), ...(b.referentSous ?? [])],
                  lieux: [...(a.lieux ?? []), ...(b.lieux ?? [])],
                  joue: [...(a.joue ?? []), ...(b.joue ?? [])],
                }));
                // Louange et Régie : les sous-équipes, les lieux et les instruments de sa ligne.
                const detail = BACK_OFFICE && porteDesLieux(e.id) ? resume(t, e.id, m) : "";
                return (
                  <p key={e.id} className="text-sm text-foreground">
                    {t(`equipes.team.${e.id}`)}
                    {!detail && m.referent && <span className="ml-1.5 text-xs text-muted-foreground">{t("equipes.referent")}</span>}
                    {m.essai && <span className="ml-1.5 text-xs text-muted-foreground">{t("equipes.essai")}</span>}
                    {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
                  </p>
                );
              })}
            </section>
          )}
          {BACK_OFFICE && p && <CeQueCaOuvre profil={p} />}
          {anciensServices && p && (
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
          {siennes.length === 0 && roles.length === 0 && !anciensServices && !BACK_OFFICE && (
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
