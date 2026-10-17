"use client";

// La fiche d'un rôle (lot 2, D10 ; contenu des planches v19-org-groupe-b-*) : titulaires (« ⋯ » :
// Retirer, Relier à un compte), planning de la colonne reliée, droits du rôle, « Modifier » et
// « ⋯ › Supprimer le rôle ». En lecture pour qui ne tient pas le groupe.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Link2, Music, Pencil, Plus, Send, SquarePen, Trash2, UserMinus, UserRoundCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MenuActions } from "@/components/layout/MenuActions";
import { fetchGrille } from "@/lib/planning/grille";
import { grilleDe } from "@/lib/planning/grilles";
import { colonnesReliables } from "@/lib/groupes/organigramme";
import { etatPlaces, rolesDe } from "@/lib/groupes/edition";
import { groupeDef } from "@/lib/groupes/table";
import type { OrganigrammeGroupe, RoleGroupe, Titulaire } from "@/types/groupe";
import { Initiales } from "./Initiales";
import { LignePlaces, Pastille } from "./CarteRole";
import { Panneau } from "./Panneau";

/** Les trois prochains dimanches écrits dans la grille du groupe, avec la case de la colonne. */
function useProchains(groupeId: string, colonne: string | null): { date: string; nom: string }[] {
  const [lignes, setLignes] = useState<{ date: string; nom: string }[]>([]);
  useEffect(() => {
    const planning = groupeDef(groupeId)?.planning;
    const def = planning ? grilleDe(planning) : undefined;
    const col = def?.colonnes.find((c) => c.cle === colonne);
    if (!planning || !col) return;
    let vivant = true;
    const aujourdhui = new Date().toISOString().slice(0, 10);
    fetchGrille(planning).then((rows) => {
      if (vivant) setLignes(rows.filter((r) => r[0] >= aujourdhui).slice(0, 3).map((r) => ({ date: r[0], nom: r[col.index] ?? "" })));
    }).catch(() => { /* rien à montrer : la fiche garde son lien vers le planning */ });
    return () => { vivant = false; };
  }, [groupeId, colonne]);
  return colonne ? lignes : [];
}

export function FicheRole({
  groupe, role, couleur, peutTenir, admin, grise, alerte, enCours, onFermer, onModifier, onSupprimer, onAjouter, onRetirer, onRelier,
}: {
  groupe: OrganigrammeGroupe;
  role: RoleGroupe | null;
  couleur: string;
  peutTenir: boolean;
  admin: boolean;
  grise: (t: Titulaire) => string | null;
  /** L'erreur d'un geste fait depuis la fiche (aussi sous l'en-tête, caché par le panneau). */
  alerte: string;
  /** Un geste est en cours : les actions de la fiche attendent. */
  enCours: boolean;
  onFermer: () => void;
  onModifier: () => void;
  onSupprimer: () => void;
  onAjouter: (ancre: DOMRect) => void;
  onRetirer: (t: Titulaire) => void;
  onRelier: (t: Titulaire) => void;
}) {
  const { t, i18n } = useTranslation();
  const prochains = useProchains(groupe.id, role?.colonne ?? null);
  const def = groupeDef(groupe.id);
  const nomGroupe = t(`categories.${def?.categorie ?? ""}`);
  const colonne = role?.colonne ? colonnesReliables(groupe.id).find((c) => c.cle === role.colonne) : undefined;
  const date = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { day: "numeric", month: "short" });

  const droit = (icone: React.ReactNode, libelle: string, oui: boolean) => (
    <li className="flex items-center gap-2 border-t border-border py-2 text-sm">
      {icone}
      <span className="flex-1 text-foreground">{libelle}</span>
      <span className="text-xs text-muted-foreground">{oui ? t("groupes.fiche.oui") : t("groupes.fiche.non")}</span>
    </li>
  );

  return (
    <Panneau
      ouvert={role !== null}
      onFermer={onFermer}
      titre={role ? <>{role.nom}{role.nomZh && <span className="ml-1.5 text-base font-normal text-muted-foreground">{role.nomZh}</span>}</> : ""}
      outils={role && peutTenir ? (
        <>
          <Button variant="outline" onClick={onModifier} className="h-9 gap-1.5"><Pencil className="h-3.5 w-3.5" aria-hidden />{t("groupes.fiche.modifier")}</Button>
          <MenuActions actions={[{
            label: t("groupes.role.supprimer"), icone: Trash2, destructif: true, onSelect: onSupprimer,
            confirmer: { titre: t("groupes.role.supprimerTitre", { nom: role.nom }), texte: t("groupes.role.supprimerTexte"), action: t("groupes.role.supprimer") },
          }]} />
        </>
      ) : undefined}
    >
      {role && (
        <div className="space-y-5" aria-busy={enCours}>
          {alerte && <p role="alert" className="text-sm text-destructive">{alerte}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <LignePlaces role={role} couleur={couleur} />
            {colonne && <Pastille icone={<Link2 className="h-3 w-3" aria-hidden />}>{t("groupes.pastille.colonne", { colonne: t(colonne.i18n) })}</Pastille>}
          </div>

          <section aria-label={t("groupes.fiche.titulaires")} className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">{t("groupes.fiche.titulaires")}</h3>
            <ul className="space-y-1">
              {role.titulaires.map((x) => {
                const aussi = rolesDe(groupe, x, role.id);
                const autre = grise(x);
                const actions = peutTenir ? [
                  ...(admin && !x.uid ? [{ label: t("groupes.relier.action"), icone: UserRoundCheck, ouvreUnChamp: true, onSelect: () => onRelier(x) }] : []),
                  { label: t("groupes.retirer"), icone: UserMinus, destructif: true, onSelect: () => onRetirer(x) },
                ] : [];
                return (
                  <li key={x.uid || x.nom} className={`flex items-center gap-2 border-t border-border py-2 ${autre ? "opacity-50" : ""}`}>
                    <Initiales nom={x.nom} pointille={!x.uid} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {x.nom}{!x.uid && <span className="ml-1.5"><Pastille>{t("groupes.sansCompte")}</Pastille></span>}
                      </span>
                      {aussi.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {t("groupes.fiche.aussi", { roles: aussi.map((r) => (r.comite ? `${r.nom} · ${t("groupes.auComite")}` : r.nom)).join(", ") })}
                        </span>
                      )}
                      {autre && <span className="block text-xs text-muted-foreground">{autre}</span>}
                    </span>
                    {actions.length > 0 && <MenuActions label={t("groupes.fiche.actionsDe", { nom: x.nom })} actions={actions} />}
                  </li>
                );
              })}
            </ul>
            {peutTenir && !etatPlaces(role).plein && (
              <button
                type="button"
                onClick={(e) => onAjouter(e.currentTarget.getBoundingClientRect())}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/50"><Plus className="h-4 w-4" /></span>
                {t("groupes.ajouterTitulaire")}
              </button>
            )}
          </section>

          {colonne && (
            <section aria-label={t("groupes.fiche.planning")} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground">{t("groupes.fiche.planning")}</h3>
                <Link href="/back-office/planning/groupes" className="text-sm font-semibold underline underline-offset-2">{t("groupes.fiche.ouvrirPlanning")}</Link>
              </div>
              {role.titulaires.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("groupes.fiche.dansColonne", { colonne: t(colonne.i18n), noms: role.titulaires.map((x) => x.nom).join(", ") })}
                </p>
              )}
              <ul>
                {prochains.map((p) => (
                  <li key={p.date} className="flex items-center gap-3 border-t border-border py-2 text-sm">
                    <span className="w-14 shrink-0 text-xs font-semibold" style={{ color: couleur }}>{date(p.date)}</span>
                    {p.nom ? <span className="text-foreground">{p.nom}</span>
                      : <span className="font-semibold text-orange-700 dark:text-orange-400">{t("groupes.places.personne")}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label={t("groupes.fiche.droits")}>
            <h3 className="pb-1 text-sm font-bold text-foreground">{t("groupes.fiche.droits")}</h3>
            <ul>
              {def?.planning && droit(<SquarePen className="h-4 w-4 text-muted-foreground" aria-hidden />, t("groupes.droit.remplir"), role.droits.remplir || role.droits.publier)}
              {def?.planning && droit(<Send className="h-4 w-4 text-muted-foreground" aria-hidden />, t("groupes.droit.publier"), role.droits.publier)}
              {droit(<Bell className="h-4 w-4 text-muted-foreground" aria-hidden />, t("groupes.droit.notifier"), role.droits.notifier)}
              {droit(<Music className="h-4 w-4 text-muted-foreground" aria-hidden />, t("groupes.droit.saisirFetes"), role.droits.saisirFetes)}
            </ul>
            <p className="pt-2 text-xs text-muted-foreground">{t("groupes.fiche.recoivent", { groupe: nomGroupe })}</p>
          </section>
        </div>
      )}
    </Panneau>
  );
}
