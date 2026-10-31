"use client";

// Une carte de rôle (lot 2, mise en page A, planches v19-org-groupe-a-*) : nom et 中文, places (OG11),
// « au comité », titulaires, « Ajouter un titulaire », pastilles (colonne, droits). Crayon → formulaire ;
// un clic ailleurs sur la carte → fiche du rôle (D10).

import type { MouseEvent, ReactNode } from "react";
import { Link2, Music, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { colonnesReliables } from "@/lib/groupes/organigramme";
import { etatPlaces } from "@/lib/groupes/edition";
import type { RoleGroupe, Titulaire } from "@/types/groupe";
import { Initiales } from "./Initiales";
import { styleTexteService } from "@/lib/couleurSombre"

export function Pastille({ icone, children }: { icone?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground/80">
      {icone}
      {children}
    </span>
  );
}

/** « 2 sur 3 places » avec ses points, « 3 titulaires · sans limite », « 0 sur 1 place · Personne ». */
export function LignePlaces({ role, couleur }: { role: Pick<RoleGroupe, "places" | "titulaires">; couleur: string }) {
  const { t } = useTranslation();
  const { n, total, reste } = etatPlaces(role);
  if (total === null) return <span className="text-xs text-muted-foreground">{t("groupes.places.sansLimite", { count: n })}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${reste ? "font-semibold text-orange-700 dark:text-orange-400" : "text-muted-foreground"}`}>
      <span aria-hidden className="inline-flex gap-0.5">
        {Array.from({ length: Math.min(total, 9) }, (_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full" style={i < n ? { background: couleur } : { boxShadow: `inset 0 0 0 1px ${couleur}` }} />
        ))}
      </span>
      {t("groupes.places.sur", { n, count: total })}
      {n === 0 && <> · {t("groupes.places.personne")}</>}
    </span>
  );
}

/** Les pastilles d'un rôle : colonne reliée, puis ses droits (seule « Saisit les chants des fêtes » reste, lot RS, RS-D). */
export function PastillesRole({ role, groupeId }: { role: RoleGroupe; groupeId: string }) {
  const { t } = useTranslation();
  const colonne = role.colonne ? colonnesReliables(groupeId).find((c) => c.cle === role.colonne) : undefined;
  const p: ReactNode[] = [];
  if (colonne) p.push(<Pastille key="c" icone={<Link2 className="h-3 w-3" aria-hidden />}>{t("groupes.pastille.colonne", { colonne: t(colonne.i18n) })}</Pastille>);
  if (role.droits.saisirFetes) p.push(<Pastille key="f" icone={<Music className="h-3 w-3" aria-hidden />}>{t("groupes.pastille.saisitFetes")}</Pastille>);
  return p.length ? <div className="flex flex-wrap gap-1.5">{p}</div> : null;
}

export function CarteRole({
  role, groupeId, couleur, peutTenir, grise, onFiche, onModifier, onAjouter, lecture = false, moi = "",
}: {
  role: RoleGroupe;
  groupeId: string;
  couleur: string;
  peutTenir: boolean;
  /** Un titulaire d'un autre groupe (OG3) : « Dans le Groupe Bonté », grisé ; `null` sinon. */
  grise: (t: Titulaire) => string | null;
  onFiche: () => void;
  onModifier: () => void;
  onAjouter: (ancre: DOMRect) => void;
  /** App › Équipes (OG-E) : une place libre s'affiche « Place libre », et le nom de `moi` en pastille sombre. */
  lecture?: boolean;
  moi?: string;
}) {
  const { t } = useTranslation();
  const { plein } = etatPlaces(role);
  const placesLibres = lecture && role.places !== null ? Math.min(Math.max(role.places - role.titulaires.length, 0), 9) : 0;
  const arrete = (e: MouseEvent) => e.stopPropagation();
  return (
    <section
      data-role={role.id}
      aria-label={role.nom}
      onClick={onFiche}
      className="raised mb-3 cursor-pointer break-inside-avoid space-y-2.5 rounded-2xl p-4"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">
            <button type="button" onClick={(e) => { arrete(e); onFiche(); }} className="text-left hover:underline">
              {role.nom}
              {role.nomZh && <span className="ml-1.5 text-sm font-normal text-muted-foreground">{role.nomZh}</span>}
            </button>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <LignePlaces role={role} couleur={couleur} />
            {role.comite && (
              <span className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold texte-service" style={{ background: `${couleur}1f`, ...styleTexteService(couleur) }}>
                {t("groupes.auComite")}
              </span>
            )}
          </div>
        </div>
        {peutTenir && (
          <button
            type="button"
            onClick={(e) => { arrete(e); onModifier(); }}
            aria-label={t("groupes.role.modifierNom", { nom: role.nom })}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </header>
      {(role.titulaires.length > 0 || placesLibres > 0) && (
        <ul className="space-y-1.5">
          {role.titulaires.map((x) => {
            const autre = grise(x);
            const c = !!moi && x.uid === moi;
            return (
              <li key={x.uid || x.nom} data-moi={c ? "" : undefined} className={`flex items-center gap-2 text-sm ${autre ? "opacity-50" : ""}`}>
                <Initiales nom={x.nom} pointille={!x.uid} />
                <span className={c ? "min-w-0 truncate rounded-full bg-foreground px-2 py-0.5 font-semibold text-background" : "min-w-0 truncate text-foreground"}>{x.nom}{c && <span className="sr-only"> ({t("groupes.app.toi")})</span>}</span>
                {!x.uid && <Pastille>{t("groupes.sansCompte")}</Pastille>}
                {autre && <span className="text-[11px] text-muted-foreground">{autre}</span>}
              </li>
            );
          })}
          {Array.from({ length: placesLibres }, (_, i) => (
            <li key={`libre-${i}`} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />
              {t("groupes.places.libre")}
            </li>
          ))}
        </ul>
      )}
      {peutTenir && !plein && (
        <button
          type="button"
          onClick={(e) => { arrete(e); onAjouter(e.currentTarget.getBoundingClientRect()); }}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/50">
            <Plus className="h-4 w-4" />
          </span>
          {t("groupes.ajouterTitulaire")}
        </button>
      )}
      <PastillesRole role={role} groupeId={groupeId} />
    </section>
  );
}
