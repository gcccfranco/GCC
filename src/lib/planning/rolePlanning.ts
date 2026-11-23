// Lot RP (docs/spec-mode-louange-forscore-2.md, décisions 6 et 15) : le rôle de la personne pour le service d'une
// setlist, lu dans le planning déjà chargé (entrées de `findMyServices`). Pur, testé sans navigateur.
import type { RolePreset } from "@/lib/performance/roleCompte"
import { serviceCategory, type ServiceEntry } from "./names"

const VUE_DU_ROLE: Record<string, RolePreset> = {
  Piano: "pianiste",
  Guitare: "guitariste",
  Batterie: "batteur",
  Cajon: "batteur",
  "Cajon/Batterie": "batteur",
  Percussion: "batteur",
  Choriste: "choriste",
  Chant: "choriste",
  "Présidence": "presidence",
}

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

function vueDuPrefixe(prefixe: string): RolePreset | null {
  const p = sansAccent(prefixe)
  if (p.startsWith("piano") || p.startsWith("clavier")) return "pianiste"
  if (p.startsWith("guitar")) return "guitariste"
  if (p.startsWith("batterie") || p.startsWith("cajon") || p.startsWith("percu")) return "batteur"
  return null
}

const VUE_DU_JOUE: Record<string, RolePreset> = {
  piano: "pianiste", guitare: "guitariste", batterie: "batteur", cajon: "batteur",
}

/** Un service, un rôle : la vue du service de la setlist (date, catégorie, moment au Campus), ou null (aucune
 *  entrée, rôle sans vue, Musicien ambigu, ou plusieurs vues : erreur de saisie, aucune proposition). */
export function roleDuPlanning(
  entries: ServiceEntry[],
  setlist: { date?: string; category?: string; moment?: "matin" | "soir" },
  joue?: string[],
): RolePreset | null {
  if (!setlist.date || !setlist.category) return null
  const vues = new Set<RolePreset>()
  for (const e of entries) {
    if (serviceCategory(e.service) !== setlist.category) continue
    if ((e.setlistDate ?? e.date) !== setlist.date) continue
    if (e.moment && setlist.moment && e.moment !== setlist.moment) continue
    let vue: RolePreset | null | undefined
    if (e.role === "Musicien") {
      if (e.instrument) vue = vueDuPrefixe(e.instrument)
      else {
        const dist = new Set((joue ?? []).map(v => VUE_DU_JOUE[v]).filter(Boolean))
        vue = dist.size === 1 ? [...dist][0] : null
      }
      if (!vue) return null
    } else {
      vue = VUE_DU_ROLE[e.role]
    }
    if (vue) vues.add(vue)
  }
  return vues.size === 1 ? [...vues][0] : null
}

/** La personne préside-t-elle le service de la setlist ? Même filtre que `roleDuPlanning`. */
export function presideLeService(
  entries: ServiceEntry[],
  setlist: { date?: string; category?: string; moment?: "matin" | "soir" },
): boolean {
  if (!setlist.date || !setlist.category) return false
  return entries.some(e =>
    e.role === "Présidence"
    && serviceCategory(e.service) === setlist.category
    && (e.setlistDate ?? e.date) === setlist.date
    && !(e.moment && setlist.moment && e.moment !== setlist.moment))
}
