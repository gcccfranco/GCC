"use client"

import { Link2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { roleDeColonne } from "@/lib/groupes/organigramme"
import { groupeDef } from "@/lib/groupes/table"
import type { ColonneGrille, DefinitionGrille } from "@/lib/planning/grilles"
import type { OrganigrammeGroupe } from "@/types/groupe"

/** L'en-tête de la grille (ordinateur, tablette) : la date, puis une colonne par rôle ; l'icône de lien marque
 *  une colonne reliée à l'organigramme du groupe (OG31). Sorti de `PlanningGrille` (lot N, N6b). */
export function GrilleEnTete({
  app,
  couleur,
  colonnes,
  groupe,
  definition,
}: {
  app: boolean
  couleur: string
  colonnes: ColonneGrille[]
  groupe?: OrganigrammeGroupe
  definition: DefinitionGrille
}) {
  const { t, i18n } = useTranslation()
  return (
    <thead>
      <tr data-testid="grille-colonnes" className={app ? "bg-secondary text-muted-foreground" : "text-white"}>
        <th
          className={`sticky left-0 z-20 px-2.5 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap ${app ? "bg-secondary" : ""}`}
          style={app ? undefined : { background: couleur }}
        >
          {t("planning.roles.date")}
        </th>
        {colonnes.map((c) => (
          <th key={c.cle} title={t(c.i18n)} className="overflow-hidden text-ellipsis px-2.5 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap" style={app ? undefined : { background: couleur }}>
            {t(c.i18n)}
            {!app && groupe && groupeDef(groupe.id)?.planning === definition.key && roleDeColonne(groupe, c.cle) && (
              <Link2
                role="img"
                aria-label={t("groupes.choisir.reliee", { role: (i18n.language === "zh-CN" && roleDeColonne(groupe, c.cle)!.nomZh) || roleDeColonne(groupe, c.cle)!.nom })}
                className="ml-1 inline h-3 w-3 align-[-1px] opacity-80"
              />
            )}
          </th>
        ))}
      </tr>
    </thead>
  )
}
