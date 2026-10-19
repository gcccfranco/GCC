"use client";

// Back-Office › Équipes › Organigramme d'un groupe (lot 2 du chantier « équipes et groupes »,
// docs/spec-organigrammes-groupes.md, tranche OG-C ; mise en page A, planches v19-org-groupe-a-*) :
// en tête (président, VP), le comité, puis les rôles en cartes ; fiche, formulaire, « Nommer »,
// « Ajouter un titulaire », « Relier à un compte ». Chaque enregistrement réécrit groupes/{id} avec la
// précondition d'OG37, puis demande la recopie des droits à /api/equipes/groupes.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Link2, Lock } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Halo } from "@/components/layout/Halo";
import { libellePoste, postesDeCompte } from "@/lib/groupes/personnes";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { Button } from "@/components/ui/button";
import { useDisposition } from "@/hooks/useDisposition";
import { listProfiles, useProfile } from "@/lib/firebase/users";
import { enregistrerGroupe, listGroupes, majGroupe, ModifieEntreTemps, type GroupeLu } from "@/lib/firebase/groupes";
import { canTenirGroupe, isAdminUser } from "@/lib/access";
import { groupeDe, membresComite, relierACompte } from "@/lib/groupes/organigramme";
import {
  ajouterTitulaire, candidatsTitulaire, comptesCites, enregistrerRole, nombrePersonnes, retirerTitulaire,
  supprimerRole, trierRoles,
} from "@/lib/groupes/edition";
import { groupeDef } from "@/lib/groupes/table";
import { categoryColor } from "@/lib/serviceColors";
import type { OrganigrammeGroupe as Groupe, RoleGroupe, Titulaire } from "@/types/groupe";
import type { UserProfile } from "@/types/user";
import { CarteRole } from "./CarteRole";
import { FicheRole } from "./FicheRole";
import { FormulaireRole } from "./FormulaireRole";
import { FeuilleNommer, type PlaceNommer } from "./FeuilleNommer";
import { Initiales } from "./Initiales";
import { Panneau } from "./Panneau";
import { RechercheTitulaire, type OuvertureRecherche } from "./RechercheTitulaire";

const nomComplet = (p: UserProfile) => `${p.firstName} ${p.lastName}`.trim() || p.planningName || p.email;

/** Les cinq groupes et les comptes, lus une fois pour tous les onglets du sélecteur. */
export function useOrganigrammes() {
  const [lus, setLus] = useState<GroupeLu[] | null>(null);
  const [profils, setProfils] = useState<UserProfile[]>([]);
  const [erreur, setErreur] = useState(false);
  const relire = useCallback(() => {
    listGroupes().then((l) => { setErreur(false); setLus(l); }).catch(() => setErreur(true));
  }, []);
  useEffect(() => {
    relire();
    listProfiles().then(setProfils).catch(() => setProfils([]));
  }, [relire]);
  const remplacer = useCallback((lu: GroupeLu) => setLus((l) => l?.map((x) => (x.groupe.id === lu.groupe.id ? lu : x)) ?? l), []);
  return { lus, profils, erreur, relire, remplacer };
}

type Recherche =
  | { mode: "ajouter"; roleId: string }
  | { mode: "nommer"; place: PlaceNommer }
  | { mode: "relier"; nom: string };

export function OrganigrammeGroupe({
  lu, profils, selecteur, onglets, onLu, onRelire, app = false,
}: {
  /** App › Équipes (OG-E) : tout se lit, rien ne se modifie, même pour un admin ; bandeau « Toi ». */
  app?: boolean;
  lu: GroupeLu;
  profils: UserProfile[];
  /** Le sélecteur Église · Paix · …, sous l'en-tête. */
  selecteur: ReactNode;
  /** Le rail Organigramme · Personnes (admins). */
  onglets?: ReactNode;
  onLu: (lu: GroupeLu) => void;
  onRelire: () => void;
}) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === "zh-CN";
  const { user, profile } = useProfile();
  const groupe = lu.groupe;
  const def = groupeDef(groupe.id)!;
  const nomGroupe = t(`categories.${def.categorie}`);
  const couleur = categoryColor(def.categorie);
  const admin = !app && isAdminUser(user, profile);
  const peutTenir = !app && canTenirGroupe(user, profile, groupe.id);
  const telephone = useDisposition() === "telephone";

  const [ficheId, setFicheId] = useState<string | null>(null);
  const [form, setForm] = useState<{ role: RoleGroupe | null } | null>(null);
  const [nommer, setNommer] = useState<Pick<Groupe, "president" | "vp" | "maxVp"> | null>(null);
  const [recherche, setRecherche] = useState<(Recherche & OuvertureRecherche) | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreurForm, setErreurForm] = useState("");
  const [alerte, setAlerte] = useState("");
  /** Les comptes du dernier appel de la route qui a échoué : « Réessayer » les renvoie. */
  const [aRecopier, setARecopier] = useState<string[] | null>(null);

  const profilDe = useMemo(() => new Map(profils.map((p) => [p.uid, p])), [profils]);
  const grise = (x: Titulaire): string | null => {
    const p = x.uid ? profilDe.get(x.uid) : undefined;
    const g = p ? groupeDe(p) : null;
    return g && g !== groupe.id ? t("groupes.dansGroupe", { groupe: t(`categories.${groupeDef(g)!.categorie}`) }) : null;
  };
  const roles = trierRoles(groupe.roles);
  const comite = membresComite(groupe);
  const personnes = nombrePersonnes(groupe, profils);
  const fiche = groupe.roles.find((r) => r.id === ficheId) ?? null;

  /** Écrit le document (précondition d'OG37), puis demande la recopie. Rend un message d'erreur, ou "". */
  async function ecrire(nouveau: Groupe): Promise<string> {
    if (!user) return t("equipes.erreur");
    const par = { uid: user.uid, nom: profile ? nomComplet(profile) : (user.email ?? "") };
    setEnCours(true);
    try {
      const version = await enregistrerGroupe(nouveau, lu.version, par);
      onLu({ groupe: { ...nouveau, updatedAt: new Date().toISOString(), parUid: par.uid, parNom: par.nom }, version });
    } catch (e) {
      setEnCours(false);
      if (e instanceof ModifieEntreTemps) {
        return e.prenom ? t("planning.programme.modifieEntreTemps", { prenom: e.prenom }) : t("planning.programme.modifieEntreTempsSansNom");
      }
      return t("equipes.erreur");
    }
    await recopier([...comptesCites(groupe), ...comptesCites(nouveau)]);
    setEnCours(false);
    return "";
  }

  async function recopier(uids: string[]) {
    try {
      await majGroupe(groupe.id, uids);
      setAlerte("");
      setARecopier(null);
    } catch {
      setAlerte(t("groupes.droitsNonRecopies"));
      setARecopier(uids);
    }
  }

  /** Un geste fait hors d'un formulaire (ajouter, retirer, relier, supprimer) : l'erreur sous l'en-tête. */
  async function geste(nouveau: Groupe) {
    if (enCours) return false;
    const e = await ecrire(nouveau);
    if (e) setAlerte(e);
    return !e;
  }

  const ouvrirRecherche = (r: Recherche, ancre: DOMRect | null) => {
    const role = r.mode === "ajouter" ? groupe.roles.find((x) => x.id === r.roleId) : undefined;
    const titre = r.mode === "relier" ? t("groupes.relier.titre", { nom: r.nom }) : t(r.mode === "nommer" ? "groupes.enTete.nommer" : "groupes.ajouterTitulaire");
    const sousTitre = r.mode === "relier" ? t("groupes.relier.sousTitre", { groupe: nomGroupe })
      : role ? `${role.nom} · ${role.places === null ? t("groupes.places.sansLimite", { count: role.titulaires.length }) : t("groupes.places.sur", { n: role.titulaires.length, count: role.places })}`
      : nomGroupe;
    setRecherche({ ...r, titre, sousTitre, ancre, sansCompte: r.mode !== "relier" });
  };

  const candidats = (q: string) => {
    if (!recherche) return [];
    const deja = recherche.mode === "ajouter"
      ? (groupe.roles.find((r) => r.id === recherche.roleId)?.titulaires ?? []).map((x) => x.uid)
      : recherche.mode === "nommer" && nommer ? [nommer.president, ...nommer.vp].map((x) => x?.uid ?? "") : [];
    return candidatsTitulaire(q, profils, groupe.id, deja.filter(Boolean));
  };

  async function choisir(x: Titulaire) {
    const r = recherche;
    setRecherche(null);
    if (!r) return;
    if (r.mode === "ajouter") await geste(ajouterTitulaire(groupe, r.roleId, x));
    else if (r.mode === "relier") await geste(relierACompte(groupe, r.nom, x));
    else if (nommer) {
      if (r.place.poste === "president") setNommer({ ...nommer, president: x });
      else setNommer({ ...nommer, vp: [...nommer.vp.filter((v) => v.uid !== x.uid || !x.uid), x] });
    }
  }

  const carte = (r: RoleGroupe) => (
    <CarteRole
      key={r.id}
      role={r}
      groupeId={groupe.id}
      couleur={couleur}
      peutTenir={peutTenir}
      lecture={app}
      moi={app ? user?.uid : undefined}
      grise={grise}
      onFiche={() => setFicheId(r.id)}
      onModifier={() => { setErreurForm(""); setForm({ role: r }); }}
      onAjouter={(ancre) => ouvrirRecherche({ mode: "ajouter", roleId: r.id }, ancre)}
    />
  );
  const colonnes = "columns-1 gap-3 md:columns-2 lg:columns-3 min-[1440px]:columns-4";
  const libelleRole = (x: Titulaire) =>
    groupe.president && (groupe.president.uid ? groupe.president.uid === x.uid : groupe.president.nom === x.nom) ? t("groupes.enTete.president")
      : groupe.vp.some((v) => (v.uid ? v.uid === x.uid : v.nom === x.nom)) ? t("groupes.enTete.vicePresident")
      : groupe.roles.filter((r) => r.comite && r.titulaires.some((y) => (y.uid ? y.uid === x.uid : y.nom === x.nom))).map((r) => r.nom).join(", ");
  const membreDuComite = admin || (profile?.dansEquipes ?? []).includes(def.comite);
  // « Toi » (OG-E) : le bandeau de la personne sur son propre groupe.
  const moi = app ? user?.uid : undefined;
  const moiPostes = app && user && profile && groupeDe(profile) === groupe.id ? postesDeCompte(groupe, user.uid).map((x) => libellePoste(t, zh, x)) : null;
  const bandeauMoi = moiPostes && (
    <p data-moi-bandeau="" className="mx-[var(--marge-page)] mb-4 rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground">
      <Trans
        i18nKey={moiPostes.length ? (telephone ? "groupes.app.toiRoles" : "groupes.app.toiDansRoles") : "groupes.app.toiDans"}
        values={{ groupe: nomGroupe, roles: moiPostes.join(", ") }}
        components={{ lien: <Link href="/mes-services" className="font-semibold underline underline-offset-2" /> }}
      />
    </p>
  );

  const enTete = (
    <section aria-label={t("groupes.enTete.titre")} className="raised rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="whitespace-nowrap text-base font-bold text-foreground">{t("groupes.enTete.titre")}</h2>
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"><Lock className="h-3 w-3" aria-hidden />{t("groupes.enTete.nommesParAdmin")}</span>
        {admin && (
          <Button variant="outline" className="ml-auto h-8" onClick={() => { setErreurForm(""); setNommer({ president: groupe.president, vp: groupe.vp, maxVp: groupe.maxVp }); }}>
            {t("groupes.enTete.nommer")}
          </Button>
        )}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{t("groupes.enTete.president")}{!zh && <span className="ml-1 font-normal text-muted-foreground">主席</span>}</h3>
      <Personne t={groupe.president} vide={t("groupes.enTete.aNommer")} moi={moi} />
      <h3 className="mt-3 text-sm font-semibold text-foreground">{t("groupes.enTete.vicePresidents")}{!zh && <span className="ml-1 font-normal text-muted-foreground">副主席</span>}</h3>
      {groupe.vp.length ? groupe.vp.map((v) => <Personne key={v.uid || v.nom} t={v} vide="" moi={moi} />) : <Personne t={null} vide={t("groupes.enTete.aNommer")} />}
    </section>
  );

  const carteComite = (
    <section aria-label={t("groupes.comite.titre")} className="raised rounded-2xl p-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-base font-bold text-foreground">{t("groupes.comite.titre")}</h2>
        <span className="text-xs text-muted-foreground">{t("groupes.comite.personnes", { count: comite.length })}</span>
        {membreDuComite && (
          <Link href={`/back-office/taches/${def.comite}`} className="ml-auto text-sm font-semibold underline underline-offset-2">
            {t("groupes.comite.reunions")}
          </Link>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("groupes.comite.aide")}</p>
      {comite.length > 0 && (
        telephone ? (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex-1">{comite.map((x) => x.nom).join(" · ")}</span>
            {membreDuComite && (
              <Link href={`/back-office/taches/${def.comite}`} aria-label={t("groupes.comite.reunions")}>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Link>
            )}
          </p>
        ) : (
          <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
            {comite.map((x) => (
              <li key={x.uid || x.nom} className="flex items-center gap-2 border-t border-border py-2 text-sm">
                <Initiales nom={x.nom} pointille={!x.uid} />
                <span data-moi={app && user && x.uid === user.uid ? "" : undefined} className={app && user && x.uid === user.uid ? "rounded-full bg-foreground px-2 py-0.5 font-semibold text-background" : "font-semibold text-foreground"}>{x.nom}</span>
                <span className="truncate text-xs text-muted-foreground">{libelleRole(x)}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );

  const aucun = (
    <div className="raised rounded-2xl p-6 text-center">
      <p className="text-sm text-muted-foreground">{t("groupes.aucunRole")}</p>
      {peutTenir && <Button className="mt-3 h-10" onClick={() => { setErreurForm(""); setForm({ role: null }); }}>{t("groupes.role.nouveau")}</Button>}
    </div>
  );

  const page = (
    <>
      <EnTetePage
        titre={app ? t("equipes.title") : t("backOffice.entrees.equipes")}
        sousTitre={app ? t("groupes.app.sousTitre") : t("groupes.sousTitre", { groupe: nomGroupe, count: personnes })}
        action={peutTenir ? <BoutonNouveau label={t("groupes.role.nouveau")} onClick={() => { setErreurForm(""); setForm({ role: null }); }} /> : undefined}
        onglets={onglets}
        apres={
          <>
            {selecteur}
            {alerte && (
              <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">
                {alerte}
                {aRecopier
                  ? <button type="button" onClick={() => recopier(aRecopier)} className="font-semibold underline">{t("groupes.reessayer")}</button>
                  : <button type="button" onClick={() => { setAlerte(""); onRelire(); }} className="font-semibold underline">{t("groupes.recharger")}</button>}
              </p>
            )}
          </>
        }
      />
      {bandeauMoi}
      <div className="space-y-6 px-[var(--marge-page)] pb-10">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {enTete}
          {!telephone && carteComite}
        </div>
        {telephone ? (
          <>
            <section aria-label={t("groupes.comite.titreN", { n: comite.length })} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{t("groupes.comite.titreN", { n: comite.length })}</h2>
              {carteComite}
              {roles.filter((r) => r.comite).map(carte)}
            </section>
            {(roles.length === 0 || roles.some((r) => !r.comite)) && (
              <section aria-label={t("groupes.autresRoles", { n: roles.filter((r) => !r.comite).length })} className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">{t("groupes.autresRoles", { n: roles.filter((r) => !r.comite).length })}</h2>
                {roles.length === 0 ? aucun : roles.filter((r) => !r.comite).map(carte)}
              </section>
            )}
          </>
        ) : (
          <section aria-label={t("groupes.roles", { n: roles.length })} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-foreground">{t("groupes.roles", { n: roles.length })}</h2>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" aria-hidden />{t("groupes.legende.relie")}</span>
                <span className="inline-flex items-center gap-1"><span aria-hidden className="h-3 w-3 rounded-full border border-dashed border-muted-foreground/60" />{t("groupes.sansCompte")}</span>
              </span>
            </div>
            {roles.length === 0 ? aucun : <div data-roles="" className={colonnes}>{roles.map(carte)}</div>}
          </section>
        )}
      </div>

      <FicheRole
        groupe={groupe}
        role={form ? null : fiche}
        couleur={couleur}
        peutTenir={peutTenir}
        admin={admin}
        grise={grise}
        alerte={alerte}
        enCours={enCours}
        onFermer={() => setFicheId(null)}
        onModifier={() => { setErreurForm(""); setForm({ role: fiche }); }}
        onSupprimer={async () => { if (fiche && (await geste(supprimerRole(groupe, fiche.id)))) setFicheId(null); }}
        onAjouter={(ancre) => fiche && ouvrirRecherche({ mode: "ajouter", roleId: fiche.id }, ancre)}
        onRetirer={(x) => fiche && geste(retirerTitulaire(groupe, fiche.id, x))}
        onRelier={(x) => ouvrirRecherche({ mode: "relier", nom: x.nom }, null)}
        lienPlanning={app ? "/planning/groupes" : undefined}
      />

      {peutTenir && (
        <Panneau
          ouvert={form !== null}
          onFermer={() => setForm(null)}
          titre={form?.role ? t("groupes.role.modifier") : t("groupes.role.nouveau")}
          pleineHauteur
        >
          {form && (
            <FormulaireRole
              key={form.role?.id ?? "nouveau"}
              groupe={groupe}
              role={form.role}
              enCours={enCours}
              erreur={erreurForm}
              onRecharger={() => { setErreurForm(""); onRelire(); }}
              onAnnuler={() => setForm(null)}
              onEnregistrer={async (r) => {
                const e = await ecrire(enregistrerRole(groupe, r));
                if (e) setErreurForm(e);
                else setForm(null);
              }}
            />
          )}
        </Panneau>
      )}

      {admin && nommer && (
        <FeuilleNommer
          ouvert
          enCours={enCours}
          erreur={erreurForm}
          onRecharger={() => { setErreurForm(""); onRelire(); }}
          brouillon={nommer}
          setBrouillon={setNommer}
          onFermer={() => setNommer(null)}
          onChercher={(place, ancre) => ouvrirRecherche({ mode: "nommer", place }, ancre)}
          onEnregistrer={async () => {
            const e = await ecrire({ ...groupe, ...nommer });
            if (e) setErreurForm(e);
            else setNommer(null);
          }}
        />
      )}

      <RechercheTitulaire
        ouverture={recherche}
        groupeId={groupe.id}
        candidats={candidats}
        onChoisir={choisir}
        onFermer={() => setRecherche(null)}
      />
    </>
  );
  if (!app) return page;
  return (
    <div className="relative">
      <Halo variant="moi" color="hsl(var(--foreground))" />
      <div className="relative">{page}</div>
    </div>
  );
}

function Personne({ t, vide, moi = "" }: { t: Titulaire | null; vide: string; moi?: string }) {
  const { t: tr } = useTranslation();
  if (!t) return vide ? <p className="mt-1.5 text-sm text-muted-foreground">{vide}</p> : null;
  const c = !!moi && t.uid === moi;
  return (
    <p data-moi={c ? "" : undefined} className="mt-1.5 flex items-center gap-2 text-sm text-foreground">
      <Initiales nom={t.nom} pointille={!t.uid} />
      <span className={c ? "rounded-full bg-foreground px-2 py-0.5 font-semibold text-background" : undefined}>{t.nom}{c && <span className="sr-only"> ({tr("groupes.app.toi")})</span>}</span>
    </p>
  );
}
