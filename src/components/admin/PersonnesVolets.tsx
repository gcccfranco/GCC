"use client";

// Back-Office › Équipes › Personnes (agencement v18, B9 de docs/spec-agencement-v18.md ; planche
// `v18-bo-equipes-personnes`). En-tête commun : « Équipes », le compte des inscrits, le rail, et
// dans sa rangée la carte des inscriptions (version courte de `InscriptionsComptes`). En grand,
// deux volets (`DeuxVolets`) : la liste (recherche, filtres en pilules, tri) et la personne
// choisie, lue dans l'adresse (`?uid=`, remplacée sans entrée d'historique) ; la première de la
// liste d'office. « Modifier » montre le formulaire d'aujourd'hui dans le volet. Un volet
// (tablette debout, téléphone) : la liste, puis la personne en page entière (planche).
// Bilingue depuis B5b (docs/spec-corrections-audit.md).
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/lib/firebase/users";
import { useTranslation } from "react-i18next";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, KeyRound, Link2, Pencil, PenLine, ShieldCheck, UserRound, Users } from "lucide-react";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { buttonVariants } from "@/components/ui/button";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { useDisposition } from "@/hooks/useDisposition";
import { isAdminUser } from "@/lib/access";
import { useConfirmer } from "@/components/layout/Confirmer";
import { Panneau } from "@/components/groupes/Panneau";
import { changerGroupeDe } from "@/lib/firebase/groupes";
import { groupeDe } from "@/lib/groupes/organigramme";
import { droitsParRoles, libellePoste, nombreSansGroupe, postesDeCompte } from "@/lib/groupes/personnes";
import { TABLE_GROUPES, groupeDef } from "@/lib/groupes/table";
import type { OrganigrammeGroupe } from "@/types/groupe";
import { findMyServices, type PlanningData } from "@/lib/planning/names";
import { GRILLES, grilleDe } from "@/lib/planning/grilles";
import { categoryColor } from "@/lib/serviceColors";
import { todayIso } from "@/lib/scene/dimanches";
import type { UserProfile } from "@/types/user";
import { BACK_OFFICE } from "@/lib/backOffice";
import { RailEquipes } from "@/app/back-office/equipes/RailEquipes";
import { CeQueCaOuvre } from "@/components/equipes/OrganigrammeLouange";
import { libellesResponsabilites } from "@/lib/equipes/responsabilites";
import { InscriptionsComptes } from "./InscriptionsComptes";
import { libelleRole, libelleRolePlanning, libelleService, libelleServicePlanning } from "./libelles";
import {
  Avatar, FiltresPersonnes, FormulairePersonne, LignePersonne, ListePersonnes, isRecent,
  useDonneesPersonnes, useFiltresPersonnes,
} from "./Personnes";

const RACINE = "/back-office/equipes/personnes";
const nom = (p: UserProfile) => `${p.firstName} ${p.lastName}`.trim() || p.email;

export function PersonnesVolets() {
  const { t } = useTranslation();
  const d = useDonneesPersonnes();
  const admin = isAdminUser(useProfile().user);
  const f = useFiltresPersonnes(d.profiles);
  const grand = useDisposition() === "grand";
  const router = useRouter();
  const uid = useSearchParams().get("uid");
  const [modif, setModif] = useState(false);

  const choisi = d.profiles.find((p) => p.uid === uid) ?? f.displayed[0] ?? null;
  const choisir = (u: string | null) => {
    setModif(false);
    router.replace(u ? `${RACINE}?uid=${encodeURIComponent(u)}` : RACINE, { scroll: false });
  };
  const maj = (u: UserProfile) => d.setProfiles((prev) => prev.map((x) => (x.uid === u.uid ? u : x)));
  const voirNouveaux = () => {
    f.setQuery("");
    f.setFilter("Tous");
    f.setSort("recent");
    // Un volet : choisir quelqu'un ouvrirait sa page entière et cacherait la liste filtrée.
    choisir(!grand ? null : d.profiles.filter((p) => isRecent(p.createdAt)).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())[0]?.uid ?? null);
  };

  const { stats } = d;
  const ouvertHorsGrand = !grand && uid ? d.profiles.find((p) => p.uid === uid) ?? null : null;
  const entete = (
    <EnTetePage
      titre={t("backOffice.entrees.equipes")}
      sousTitre={d.loadingProfiles ? undefined : [
        t("equipes.compte.inscrits", { count: d.profiles.length }),
        t("groupes.personnes.groupesSansGroupe", { count: nombreSansGroupe(d.profiles) }),
      ].join(" · ")}
      // Piste A (BO7) : l'ancienne page Planning › Sans compte, dans Personnes.
      outils={<Link href="/back-office/equipes/personnes/sans-compte" className={buttonVariants({ variant: "outline", size: "sm" })}>{t("backOffice.equipe.sansCompte")}</Link>}
      onglets={<RailEquipes />}
      apres={<InscriptionsComptes court nouveaux={stats.nouveaux} onVoir={voirNouveaux} />}
    />
  );

  // Un volet (téléphone, tablette debout) : la personne choisie occupe la page entière (planche).
  if (!grand && ouvertHorsGrand)
    return (
      <div className="px-[var(--marge-page)] pb-10 pt-4 space-y-4">
        <button
          type="button"
          onClick={() => choisir(null)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t("groupes.personnes.retour")}
        </button>
        {modif ? (
          <div className="raised rounded-2xl p-4 space-y-4">
            <h2 className="text-[22px] font-bold leading-tight text-foreground">{nom(ouvertHorsGrand)}</h2>
            <FormulairePersonne
              key={ouvertHorsGrand.uid}
              p={ouvertHorsGrand}
              planningData={d.planningData}
              planningNames={d.planningNames}
              onAnnule={() => setModif(false)}
              onEnregistre={(u) => { maj(u); setModif(false); }}
            />
          </div>
        ) : (
          <FicheDuMembre key={ouvertHorsGrand.uid} p={ouvertHorsGrand} planning={d.planningData} groupes={d.groupes} admin={admin} relire={d.relire} onModifier={() => setModif(true)} />
        )}
      </div>
    );

  if (!grand)
    return (
      <>
        {entete}
        <div className="px-[var(--marge-page)] pb-10">
          <div className="raised rounded-2xl p-3 space-y-3 sm:p-4">
            <FiltresPersonnes f={f} />
            {/* Un volet : la personne de l'adresse s'ouvre en page entière (ci-dessus). */}
            <ListePersonnes d={d} f={f} deplie={null} setDeplie={choisir} />
          </div>
        </div>
      </>
    );

  // Dans la colonne de 400 px, les filtres se replient sur plusieurs lignes (planche) au lieu de
  // défiler en largeur comme la rangée de `Pilules` le fait ailleurs.
  const liste = (
    <div className="p-3 space-y-3 [&_[data-onglets=pilules]]:mx-0 [&_[data-onglets=pilules]]:flex-wrap [&_[data-onglets=pilules]]:overflow-visible [&_[data-onglets=pilules]]:px-0">
      <FiltresPersonnes f={f} />
      {d.loadingProfiles ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : f.displayed.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {d.profiles.length === 0 ? t("admin.membre.aucunProfil") : t("admin.membre.aucunCorrespond")}
        </p>
      ) : (
        <div className="space-y-0.5">
          {f.displayed.map((p) => {
            const actif = choisi?.uid === p.uid;
            return (
              <div key={p.uid} className={`rounded-xl transition-colors ${actif ? "bg-secondary" : "hover:bg-secondary/60"}`}>
                <LignePersonne
                  p={p}
                  compact
                  groupes={d.groupes}
                  actif={actif}
                  onClick={() => choisir(p.uid)}
                  fin={<ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // BO9 : sans personne choisie (liste vide ou sans correspondance), la liste prend seule la colonne et dit
  // elle-même pourquoi : un seul message.
  const droite = !choisi ? null : modif ? (
    <div className="max-w-[760px] space-y-4">
      <div className="flex items-center gap-4">
        <Avatar p={choisi} grand />
        <h2 className="text-[24px] font-bold leading-tight tracking-tight text-foreground">{nom(choisi)}</h2>
      </div>
      <div className="raised rounded-2xl p-5">
        <FormulairePersonne
          key={choisi.uid}
          p={choisi}
          planningData={d.planningData}
          planningNames={d.planningNames}
          onAnnule={() => setModif(false)}
          onEnregistre={(u) => { maj(u); setModif(false); }}
        />
      </div>
    </div>
  ) : (
    <FicheDuMembre
      key={choisi.uid}
      p={choisi}
      planning={d.planningData}
      groupes={d.groupes}
      admin={admin}
      relire={d.relire}
      // La personne passe dans l'adresse dès « Modifier » : sans `?uid=`, la choisie est la
      // première de la liste filtrée, et chercher ou trier remonterait le formulaire sur une autre.
      onModifier={() => { choisir(choisi.uid); setModif(true); }}
    />
  );

  return (
    <>
      {entete}
      <DeuxVolets racine={RACINE} liste={liste} premier={droite} largeurListe={400} colonneSeule={!choisi}>
        {null}
      </DeuxVolets>
    </>
  );
}

/** Une carte de la fiche : titre, puis ses lignes. */
function Carte({ titre, note, children, className }: { titre: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-label={titre} className={`raised rounded-2xl px-5 py-4 ${className ?? ""}`}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[16px] font-bold text-foreground">{titre}</h3>
        {note && <span className="text-[12px] text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** La personne choisie : services et rôles, droits, prochains services. */
function FicheDuMembre({
  p, planning, groupes, admin, relire, onModifier,
}: {
  p: UserProfile;
  planning: PlanningData | null;
  groupes: OrganigrammeGroupe[] | null;
  admin: boolean;
  relire: () => void;
  onModifier: () => void;
}) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === "zh-CN";
  const confirmer = useConfirmer();
  const [feuille, setFeuille] = useState(false);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const g = groupeDe(p);
  const def = g ? groupeDef(g) : undefined;
  const nomGroupe = def ? t(`categories.${def.categorie}`) : "";
  const postes = def ? postesDeCompte(groupes?.find((x) => x.id === def.id), p.uid) : [];
  const parRoles = droitsParRoles(p);
  // Les audiences recopiées sur le profil, pas `groupeDe` : les deux peuvent différer avant la recopie.
  const notifie = (p.notifieParRole ?? []).map((a) => t(`categories.${a}`));

  async function changer(vers: string) {
    setFeuille(false);
    const versNom = vers ? t(`categories.${groupeDef(vers)!.categorie}`) : t("groupes.personnes.sansGroupe");
    const ok = await confirmer({
      titre: t("groupes.personnes.changerConfirmer", { nom: nom(p), vers: versNom }),
      texte: postes.length ? t("groupes.personnes.changerTexteRoles", { groupe: nomGroupe }) : t("groupes.personnes.changerTexteAucun"),
      action: t("groupes.personnes.changer"),
    });
    if (!ok) return;
    setErreur("");
    setEnCours(true);
    try {
      await changerGroupeDe(p.uid, vers);
      relire();
    } catch {
      setErreur(t("groupes.personnes.changerErreur"));
    } finally {
      setEnCours(false);
    }
  }
  const aujourdhui = todayIso();
  const services = planning && p.planningName
    ? findMyServices(planning, p.planningName).filter((s) => s.date >= aujourdhui).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
    : [];
  // Un droit d'un planning retiré (« fideliteMusiciens », lot F) ne s'affiche plus.
  const plannings = (p.plannings ?? []).flatMap((k) => { const l = GRILLES.find((g) => g.key === k)?.label; return l ? [libelleServicePlanning(t, zh, l)] : []; });
  const ligne = "flex items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0";

  return (
    <article className="space-y-4">
      <header className="flex items-center gap-4">
        <Avatar p={p} grand />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[24px] font-bold leading-tight tracking-tight text-foreground">{nom(p)}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {p.email}
            {p.createdAt ? ` · ${t("admin.membre.inscritLe", { date: p.createdAt.toLocaleDateString(zh ? "zh-CN" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }) })}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onModifier}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-background px-4 text-[14px] font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {t("common.buttons.edit")}
        </button>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
        {(groupes !== null || BACK_OFFICE) && (
        <div className="space-y-4">
          <Carte
            titre={t("groupes.personnes.groupe")}
            note={admin && (
              <button
                type="button"
                onClick={() => setFeuille(true)}
                disabled={enCours}
                aria-busy={enCours}
                className="inline-flex h-9 items-center rounded-full bg-background px-3 text-[13px] font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary"
              >
                {t("groupes.personnes.changer")}
              </button>
            )}
          >
            <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: def ? categoryColor(def.categorie) : "#94a3b8" }} />
                {def ? nomGroupe : t("groupes.personnes.sansGroupe")}
              </span>
              <span className="text-muted-foreground">{t("groupes.personnes.unSeul")}</span>
            </p>
            <p className="mt-2 text-[12px] text-muted-foreground">
              {def ? t("groupes.personnes.changerAide", { groupe: nomGroupe }) : t("groupes.personnes.changerAideSans")}
            </p>
            {erreur && <p role="alert" className="mt-2 text-[12px] text-destructive">{erreur}</p>}
          </Carte>
          {def && (
            <Carte
              titre={t("groupes.personnes.rolesDans", { groupe: nomGroupe })}
              note={<Link href={`/back-office/equipes?groupe=${def.id}`} className="font-semibold text-foreground underline underline-offset-2">{t("groupes.personnes.organigramme")}</Link>}
            >
              {postes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("groupes.aucunRole")}</p>
              ) : postes.map((x, i) => {
                const col = x.role?.colonne && def.planning
                  ? t(grilleDe(def.planning)?.colonnes.find((c) => c.cle === x.role!.colonne)?.i18n ?? x.role.colonne)
                  : "";
                return (
                  <div key={x.fixe ?? x.role.id} className={ligne}>
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-foreground">{libellePoste(t, zh, x)}</span>
                      {x.role && zh && x.role.nomZh && <span className="text-muted-foreground">{x.role.nom}</span>}
                      {x.role && !zh && x.role.nomZh && <span className="text-muted-foreground">{x.role.nomZh}</span>}
                    </span>
                    <span className="flex flex-wrap justify-end gap-1.5 text-[11px] font-semibold">
                      {x.role?.comite && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{t("groupes.auComite")}</span>}
                      {col && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                          <Link2 className="h-3 w-3" aria-hidden />{t("groupes.pastille.colonne", { colonne: col })}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </Carte>
          )}
        </div>
        )}
        <Carte
          titre={BACK_OFFICE ? t("groupes.personnes.servicesEquipes") : t("admin.membre.servicesRoles")}
          note={BACK_OFFICE ? t("groupes.personnes.transition") : undefined}
        >
          {/* Lot AO-B : en nouveau mode, ni `serviceRoles` ni rôles déclarés — seulement l'organigramme. */}
          {BACK_OFFICE ? (
            (p.dansEquipes ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("equipes.organigramme.personnes.sansEquipe")}</p>
          ) : Object.keys(p.serviceRoles).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.membre.neSertPasPoint")}</p>
          ) : (
            Object.entries(p.serviceRoles).map(([cat, roles]) => (
              <div key={cat} className={ligne}>
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: categoryColor(cat) }} />
                  {libelleService(t, zh, cat)}
                </span>
                <span className="text-muted-foreground">{roles.map((r) => libelleRole(t, zh, r)).join(" · ") || "—"}</span>
              </div>
            ))
          )}
          {BACK_OFFICE && (p.dansEquipes ?? []).map((id) => (
            <div key={id} className={ligne}>
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {t(`equipes.team.${id}`, { defaultValue: id })}
              </span>
              <span className="text-right text-muted-foreground">
                {[
                  (p.referentDe ?? []).includes(id) ? t("groupes.personnes.referent") : t("groupes.personnes.membre"),
                  ...(id === "louange" ? (p.sousEquipes ?? []).map((x) => t(`acces.sousEquipe.${x}`)) : []),
                ].join(" · ")}
              </span>
            </div>
          ))}
        </Carte>
        <div className="space-y-4">
          <Carte titre={t("admin.membre.droits")}>
            <div className={ligne}>
              <span className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" aria-hidden />{t("admin.membre.adminMaj")}</span>
              <span className="text-foreground">{isAdminUser(p) ? t("admin.membre.oui") : t("admin.membre.non")}</span>
            </div>
            {/* Lot 1 du chantier « équipes et groupes » (EQ26) : la case cochée par un admin. Lot AO-B : plus de case
                en nouveau mode, les droits viennent de l'organigramme (« Ce que ça lui ouvre », plus bas). */}
            {!BACK_OFFICE && (<>
              <div className={ligne}>
                <span className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" aria-hidden />{t("personnes.coordination")}</span>
                <span className="text-foreground">{p.coordination ? t("admin.membre.oui") : t("admin.membre.non")}</span>
              </div>
              <div className={ligne}>
                <span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4" aria-hidden />{t("admin.membre.ecritDans")}</span>
                <span className="text-right text-foreground">{plannings.length ? plannings.join(", ") : "—"}</span>
              </div>
            </>)}
            {BACK_OFFICE && (<>
              <div className={ligne}>
                <span className="flex items-center gap-2 text-muted-foreground"><PenLine className="h-4 w-4" aria-hidden />{t("groupes.personnes.parRoles")}</span>
                <span className="text-right text-foreground">
                  {parRoles.publie ? t("groupes.personnes.remplitPublie") : parRoles.remplit ? t("groupes.personnes.remplit") : "—"}
                </span>
              </div>
              <div className={ligne}>
                <span className="flex items-center gap-2 text-muted-foreground"><Bell className="h-4 w-4" aria-hidden />{t("groupes.personnes.notifications")}</span>
                <span className="text-right text-foreground">
                  {notifie.length ? notifie.map((n) => t("groupes.personnes.celles", { groupe: n })).join(", ") : "—"}
                </span>
              </div>
            </>)}
            {/* Lot RS : lecture seule ; l'admin les change sur la page Responsabilités. */}
            {BACK_OFFICE && (
              <div className={ligne} data-testid="fiche-responsabilites">
                <span className="flex items-center gap-2 text-muted-foreground"><KeyRound className="h-4 w-4" aria-hidden />{t("responsabilites.ligne")}</span>
                <span className="text-right text-foreground">
                  {libellesResponsabilites(p, (c, o) => t(c, o)).join(" · ") || t("responsabilites.aucune")}
                </span>
              </div>
            )}
            {BACK_OFFICE && admin && (
              <p className="pt-1 text-[12px]">
                <Link href="/back-office/equipes/responsabilites" className="font-semibold text-foreground underline underline-offset-2">{t("responsabilites.gerer")}</Link>
              </p>
            )}
            <div className={ligne}>
              <span className="flex items-center gap-2 text-muted-foreground"><UserRound className="h-4 w-4" aria-hidden />{t("admin.membre.nomAuPlanning")}</span>
              <span className="text-foreground">{p.planningName || "—"}</span>
            </div>
          </Carte>
        </div>
      </div>

      {BACK_OFFICE && (
        <section aria-label={t("equipes.organigramme.ceQueCaOuvre")} className="raised space-y-3 rounded-2xl px-5 py-4">
          <CeQueCaOuvre profil={p} />
          <p className="text-[12px] text-muted-foreground">
            <Link href="/back-office/equipes" className="font-semibold text-foreground underline underline-offset-2">{t("equipes.organigramme.voir")}</Link>
          </p>
        </section>
      )}

      <Carte titre={t("admin.membre.prochainsServices")} note={<Link href="/planning" className="font-semibold text-foreground underline underline-offset-2">{t("common.header.planning")}</Link>}>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {planning ? t("admin.membre.aucunService") : t("common.loading")}
          </p>
        ) : (
          services.map((s, i) => {
            const date = new Date(`${s.date}T12:00:00`);
            return (
              <div key={`${s.date}-${s.service}-${s.role}-${i}`} className={ligne}>
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-secondary leading-none">
                    <span className="text-[15px] font-bold text-foreground">{date.getDate()}</span>
                    <span className="text-[10px] text-muted-foreground">{date.toLocaleDateString(zh ? "zh-CN" : "fr-FR", { month: "short" })}</span>
                  </span>
                  <span className="font-semibold text-foreground">{libelleServicePlanning(t, zh, s.service)}</span>
                </span>
                <span className="text-muted-foreground">{libelleRolePlanning(t, zh, s.role)}</span>
              </div>
            );
          })
        )}
      </Carte>
      <Panneau
        ouvert={feuille}
        onFermer={() => setFeuille(false)}
        titre={t("groupes.personnes.changer")}
        sousTitre={t("groupes.personnes.changerSousTitre", { nom: nom(p) })}
      >
        <div className="space-y-1">
          {[...TABLE_GROUPES.map((x) => x.id as string), ""].map((id) => {
            const actuel = (g ?? "") === id;
            const label = id ? t(`groupes.court.${id}`) : t("groupes.personnes.sansGroupe");
            return (
              <button
                key={id || "sans"}
                type="button"
                disabled={actuel}
                onClick={() => void changer(id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: id ? categoryColor(groupeDef(id)!.categorie) : "#94a3b8" }} />
                  {label}
                </span>
                {actuel && <span className="text-[12px] font-normal text-muted-foreground">{t("groupes.personnes.actuel")}</span>}
              </button>
            );
          })}
        </div>
      </Panneau>
    </article>
  );
}
