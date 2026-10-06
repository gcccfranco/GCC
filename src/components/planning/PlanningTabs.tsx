"use client"

import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { SectionTabs } from "@/components/layout/SectionTabs"
import { EnTetePage } from "@/components/layout/EnTetePage"
import { Pilules } from "@/components/layout/Onglets"

// `key` = clé i18n (planning.tabs.*), `color` = couleur de service reprise par
// l'indicateur d'onglet actif (source unique : PLANNING_COLORS).
export const PLANNING_TABS: { key: string; href: string; color?: string }[] = [
  { key: "accueil", href: "/planning" },
  { key: "culte", href: "/planning/culte", color: PLANNING_COLORS.culte },
  { key: "table", href: "/planning/table", color: PLANNING_COLORS.table },
  { key: "groupes", href: "/planning/groupes" },
  { key: "edd", href: "/planning/edd", color: PLANNING_COLORS.edd },
  { key: "campus", href: "/planning/campus", color: PLANNING_COLORS.campus },
  { key: "intergroupe", href: "/planning/intergroupe", color: PLANNING_COLORS.intergroupe },
  { key: "interfranco", href: "/planning/interfranco", color: PLANNING_COLORS.interfranco },
]

// Les deux dispositions de la barre latérale (globals.css, « Lot U4 ») : ordinateur et tablette couchée.
const EN_GRAND_SEULEMENT =
  "hidden [@media(pointer:fine)_and_(min-width:1024px)]:block [@media(pointer:coarse)_and_(orientation:landscape)_and_(min-width:1024px)]:block"
const HORS_GRAND =
  "[@media(pointer:fine)_and_(min-width:1024px)]:hidden [@media(pointer:coarse)_and_(orientation:landscape)_and_(min-width:1024px)]:hidden"

/** L'en-tête de la section Planning de l'App (agencement v18, A1, A2, R6) : « Planning », son
 *  sous-titre, puis les huit plannings — en grand, en pilules dans l'en-tête, l'actif à la couleur
 *  de son service ; sur téléphone et tablette portrait, la barre collante de V7 (feuille en tuiles
 *  sur téléphone), posée sous le titre. Le service ouvert se titre en h2 dans la rangée de sa grille. */
export function PlanningTabs() {
  const { t } = useTranslation()
  const chemin = (usePathname() ?? "").replace(/\/$/, "")
  const actif = PLANNING_TABS.find((tab) => (tab.href === "/planning" ? chemin === "/planning" : chemin.startsWith(tab.href)))?.key ?? null
  return (
    <>
      <EnTetePage
        titre={t("common.header.planning")}
        sousTitre={t("planning.barre.sousTitre")}
        apres={
          <div className={EN_GRAND_SEULEMENT}>
            <Pilules
              etiquette={t("backOffice.plannings")}
              valeur={actif}
              choisir={() => {}}
              obligatoire
              options={PLANNING_TABS.map((tab) => ({ cle: tab.key, nom: t(`planning.tabs.${tab.key}`), couleur: tab.color, href: tab.href }))}
            />
          </div>
        }
      />
      <SectionTabs
        className={`mb-4 ${HORS_GRAND}`}
        rootHref="/planning"
        pleineLargeur
        menuLabel={t("planning.choisirPlanning")}
        tabs={PLANNING_TABS.map((tab) => ({ href: tab.href, label: t(`planning.tabs.${tab.key}`), color: tab.color }))}
      />
    </>
  )
}
