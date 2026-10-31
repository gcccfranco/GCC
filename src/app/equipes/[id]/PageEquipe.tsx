"use client";

// Page d'une équipe (piste A, docs/spec-back-office-piste-a.md, BO4 et BO7) : `/back-office/equipes/<id>`
// pour un responsable, `/equipes/<id>` dans l'app pour un simple membre. Trois sections, une colonne :
// Tâches, Réunions, Membres. « Nouvelle tâche » et « Nouvelle réunion » ne sont que du Back-Office.
// Réservé aux membres de l'équipe, à ses référents et aux admins (`peutVoirEquipe`) : affichage seulement,
// equipes/{id}/taches et evenements/{id} gardent leurs règles. Un comité (COMITES) n'a pas de document
// equipes/{id} : ses membres se lisent dans l'organigramme de son groupe.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronRight, Plus } from "lucide-react";
import { LargeurBO } from "@/components/backOffice/LargeurBO";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { buttonVariants } from "@/components/ui/button";
import { TacheLigne, dateCourte } from "@/components/taches/TacheLigne";
import { adresseDeLaLigne } from "@/components/taches/SectionTaches";
import { texteRetour } from "@/components/taches/retour";
import { creatableEvenementPours, equipesOuCreer, peutCocher, peutVoirEquipe } from "@/lib/access";
import { isPast } from "@/lib/evenements/agenda";
import { cleNomEquipe, EQUIPES } from "@/lib/equipes/table";
import { COMITES, TABLE_GROUPES } from "@/lib/groupes/table";
import { EVENEMENTS_CHANGED, listReunionsDu } from "@/lib/firebase/evenements";
import { listEquipes } from "@/lib/firebase/equipes";
import { cyclerEtat } from "@/lib/firebase/taches";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { grouperLignes, lignesDeTache, type Ligne } from "@/lib/taches/echeances";
import { prevenirFait } from "@/lib/taches/prevenir";
import { useTaches } from "@/lib/taches/useTaches";
import { cn } from "@/lib/utils";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import type { Equipe } from "@/types/equipe";
import type { Evenement } from "@/types/evenement";
import { Squelette } from "@/components/layout/Squelette";

const idValide = (id: string) => EQUIPES.some((e) => e.id === id) || COMITES.includes(id);
const CARTE = "raised rounded-2xl px-4 py-2";
const LIEN_LIGNE = "flex min-h-[52px] items-center gap-3 px-1 py-2";

export function PageEquipe({ id, backOffice }: { id: string; backOffice: boolean }) {
  const { t } = useTranslation();
  const { user, profile, loading } = useProfile();
  const retour = backOffice
    ? { href: "/back-office/equipes", label: t("backOffice.entrees.equipes") }
    : { href: "/moi", label: t("moi.title") };
  const connue = idValide(id);
  const droit = connue && !loading && peutVoirEquipe(user, profile, id);
  const nom = connue ? t(cleNomEquipe(id, true)) : t("equipes.page.introuvable");

  if (!connue) {
    return <EnTetePage retour={retour} titre={t("equipes.page.introuvable")} />;
  }
  if (loading) return <Squelette />;
  if (!droit) {
    return (
      <>
        <EnTetePage retour={retour} titre={nom} />
        <p role="status" className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("equipes.page.reserve")}</p>
      </>
    );
  }
  return <CorpsEquipe id={id} nom={nom} retour={retour} backOffice={backOffice} />;
}

function CorpsEquipe({ id, nom, retour, backOffice }: { id: string; nom: string; retour: { href: string; label: string }; backOffice: boolean }) {
  const { t } = useTranslation();
  const [equipe, setEquipe] = useState<Equipe | null>(null);
  const [lue, setLue] = useState(false);

  useEffect(() => {
    let vivant = true;
    listEquipes().then((l) => { if (vivant) { setEquipe(l.find((e) => e.id === id) ?? null); setLue(true); } })
      .catch(() => { if (vivant) setLue(true); });
    return () => { vivant = false; };
  }, [id]);

  const membres = useMemo(
    () => [...(equipe?.membres ?? [])].sort((a, b) => Number(b.referent) - Number(a.referent)),
    [equipe],
  );
  const referents = membres.filter((m) => m.referent).map((m) => m.nom);
  const sousTitre = !equipe || membres.length === 0 ? undefined
    : referents.length > 0
      ? t("equipes.page.sousTitre", { count: membres.length, referents: t("equipes.page.referents", { count: referents.length, noms: referents.join(", ") }) })
      : t("equipes.page.sousTitreSeul", { count: membres.length });

  return (
    <div className="pb-16">
      {/* BO-G, 2 : la largeur d'À faire (LargeurBO), plus de plafond à 720 px. */}
      <LargeurBO>
        <EnTetePage retour={retour} titre={nom} sousTitre={sousTitre} />
        <div className="space-y-8 px-[var(--marge-page)]">
          <SectionTachesEquipe id={id} backOffice={backOffice} />
          <SectionReunions id={id} backOffice={backOffice} />
          <SectionMembres id={id} membres={membres} lue={lue} backOffice={backOffice} />
        </div>
      </LargeurBO>
    </div>
  );
}

function TitreSection({ id, titre, action }: { id: string; titre: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex min-h-9 items-center gap-3">
      <h2 id={id} className="min-w-0 flex-1 text-[17px] font-semibold text-foreground">{titre}</h2>
      {action}
    </div>
  );
}

function BoutonSection({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}>
      <Plus aria-hidden />
      {label}
    </Link>
  );
}

// ── Tâches ──────────────────────────────────────────────────────────────────

function SectionTachesEquipe({ id, backOffice }: { id: string; backOffice: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile } = useProfile();
  const { items, loading: chargement, reload } = useTaches([id]);
  const [retour, setRetour] = useState("");
  const [terminees, setTerminees] = useState(false);
  const aujourdhui = todayIso();
  const racine = backOffice ? "/back-office/taches" : "/taches";
  const parNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user?.email ?? "";
  const lignes = items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, aujourdhui));
  const g = grouperLignes(lignes, aujourdhui);
  const peutCreer = backOffice && equipesOuCreer(user, profile).includes(id);

  // À faire → En cours → Terminé → À faire : on ne prévient qu'à « Terminé ».
  async function cocher(l: Ligne) {
    if (!user) return;
    setRetour("");
    const etat = await cyclerEtat(id, l.tache.id, l.date, l.fois, { uid: user.uid, nom: parNom });
    await reload(id);
    if (etat === "terminee" && l.tache.prevenir) {
      setRetour(texteRetour(t, await prevenirFait(id, l.tache.id, l.date), l.tache));
    }
  }

  const rangee = (l: Ligne) => (
    <TacheLigne
      key={`${l.tache.id}-${l.date}`}
      ligne={l}
      // Case inerte sans le droit de cocher (EQ8, décision 41).
      onToggle={peutCocher(user, profile, l.tache) ? () => cocher(l) : undefined}
      onOpen={() => router.push(adresseDeLaLigne(l, racine))}
    />
  );
  const groupes: [string, Ligne[], boolean][] = [
    [t("taches.groupes.enRetard"), g.enRetard, true],
    [t("taches.groupes.cetteSemaine"), g.cetteSemaine, false],
    [t("taches.groupes.plusTard"), g.plusTard, false],
  ];

  return (
    <section aria-labelledby="equipe-taches">
      <TitreSection id="equipe-taches" titre={t("equipes.page.taches")} action={peutCreer && <BoutonSection href={`/back-office/taches/${id}/nouvelle`} label={t("taches.nouvelle")} />} />
      <div className={cn(CARTE, "space-y-4 py-3")}>
        {retour && <p role="status" className="px-1 text-sm text-muted-foreground">{retour}</p>}
        {chargement && <p className="px-1 text-sm text-muted-foreground">{t("common.loading")}</p>}
        {!chargement && lignes.length === 0 && <p className="px-1 text-sm text-muted-foreground">{t("taches.vide")}</p>}
        {groupes.filter(([, ls]) => ls.length > 0).map(([titre, ls, rouge]) => (
          <div key={titre} role="group" aria-label={titre}>
            <h3 className={cn("mb-1 px-1 text-sm font-semibold", rouge ? "text-destructive" : "text-muted-foreground")}>{titre}</h3>
            <div>{ls.map(rangee)}</div>
          </div>
        ))}
        {g.faites.length > 0 && (
          <div role="group" aria-label={t("taches.terminees", { count: g.faites.length })} className="border-t border-border/70 pt-3">
            <button
              type="button"
              aria-expanded={terminees}
              onClick={() => setTerminees((o) => !o)}
              className="inline-flex min-h-[44px] items-center gap-1 px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {t("taches.terminees", { count: g.faites.length })}
              <ChevronRight className={cn("h-4 w-4 transition-transform duration-150", terminees && "rotate-90")} aria-hidden />
            </button>
            {terminees && <div className="mt-1">{g.faites.map(rangee)}</div>}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Réunions ────────────────────────────────────────────────────────────────

function SectionReunions({ id, backOffice }: { id: string; backOffice: boolean }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const [reunions, setReunions] = useState<Evenement[] | null>(null);
  const peutCreer = backOffice && creatableEvenementPours(user, profile, ANNONCE_SECTIONS).includes(`equipe:${id}`);

  useEffect(() => {
    // Les relectures se croisent : seule la dernière demandée s'affiche ; un échec garde la liste déjà là.
    let derniere = 0;
    let vivant = true;
    const lire = () => {
      const n = ++derniere;
      listReunionsDu(`equipe:${id}`)
        .then((l) => { if (vivant && n === derniere) setReunions(l); })
        .catch(() => { if (vivant && n === derniere) setReunions((l) => l ?? []); });
    };
    lire();
    window.addEventListener(EVENEMENTS_CHANGED, lire);
    return () => { vivant = false; window.removeEventListener(EVENEMENTS_CHANGED, lire); };
  }, [id]);

  const today = todayIso();
  const aVenir = (reunions ?? []).filter((e) => !isPast(e, today)).sort((a, b) => `${a.date} ${a.heure ?? ""}`.localeCompare(`${b.date} ${b.heure ?? ""}`));
  const passees = (reunions ?? []).filter((e) => isPast(e, today)).sort((a, b) => b.date.localeCompare(a.date));
  const href = (e: Evenement) => (backOffice ? `/back-office/reunions/${e.id}` : `/evenements/${e.id}`);

  const ligne = (e: Evenement, etiquette: string | null, passee: boolean) => (
    <Link key={e.id} href={href(e)} className={LIEN_LIGNE}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{e.titre}</span>
        <span className="block truncate text-[13px] text-muted-foreground">
          {[e.date ? dateCourte(e.date, i18n.language) : null, e.heure || null, passee ? (e.compteRendu ? t("equipes.page.compteRendu") : t("equipes.page.sansCompteRendu")) : null].filter(Boolean).join(" · ")}
        </span>
      </span>
      {etiquette && <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[12px] font-semibold text-foreground">{etiquette}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  );

  return (
    <section aria-labelledby="equipe-reunions">
      <TitreSection id="equipe-reunions" titre={t("equipes.page.reunions")} action={peutCreer && <BoutonSection href={`/back-office/reunions/nouvelle?equipe=${encodeURIComponent(id)}`} label={t("backOffice.nouvelleReunion")} />} />
      <div className={cn(CARTE, "space-y-3")}>
        {reunions === null && <p className="py-1 text-sm text-muted-foreground">{t("common.loading")}</p>}
        {reunions !== null && reunions.length === 0 && <p className="py-1 text-sm text-muted-foreground">{t("equipes.page.aucuneReunion")}</p>}
        {aVenir.length > 0 && (
          <div>
            <h3 className="px-1 text-sm font-semibold text-muted-foreground">{t("equipes.page.aVenir")}</h3>
            <div className="divide-y divide-border/60">{aVenir.map((e, i) => ligne(e, i === 0 ? t("equipes.page.prochaine") : null, false))}</div>
          </div>
        )}
        {passees.length > 0 && (
          <div>
            <h3 className="px-1 text-sm font-semibold text-muted-foreground">{t("equipes.page.passees")}</h3>
            <div className="divide-y divide-border/60">{passees.map((e) => ligne(e, null, true))}</div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Membres ─────────────────────────────────────────────────────────────────

function SectionMembres({ id, membres, lue, backOffice }: { id: string; membres: Equipe["membres"]; lue: boolean; backOffice: boolean }) {
  const { t } = useTranslation();
  const groupe = TABLE_GROUPES.find((g) => g.comite === id);
  const sansDocument = lue && membres.length === 0 && !!groupe;
  return (
    <section aria-labelledby="equipe-membres">
      <TitreSection id="equipe-membres" titre={t("equipes.page.membres")} />
      <div className={cn(CARTE, "py-3")}>
        {!lue && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
        {sansDocument && (
          <>
            <p className="mb-1 text-sm text-muted-foreground">{t("equipes.page.comiteAide")}</p>
            <Link href={`${backOffice ? "/back-office" : ""}/equipes?groupe=${groupe.id}`} className={cn(LIEN_LIGNE, "text-[15px] font-semibold text-foreground")}>
              <span className="min-w-0 flex-1">{t("equipes.page.organigrammeGroupe")}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
            </Link>
          </>
        )}
        {lue && !groupe && membres.length === 0 && <p className="text-sm text-muted-foreground">{t("equipes.aucunMembre")}</p>}
        {membres.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {membres.map((m, i) => (
              <li key={`${m.nom}-${i}`} className="rounded-full bg-secondary px-3 py-1 text-[14px] text-foreground">
                {m.referent ? `${m.nom}, ${t("equipes.referent").toLowerCase()}` : m.nom}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
