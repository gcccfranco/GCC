"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { TOUCHER_PILULE } from "@/lib/toucher44"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Le « menu » du jeu de contrôles B (lot CD, T3a, docs/spec-corrections-design/partout.md) : un choix parmi plusieurs,
// à côté du rail (choisir une vue) et des pilules (filtrer). Remplace le `<select>` habillé en pastille.
//  - Déclencheur : une pilule (28 px au pointeur fin, 32 au toucher), `--secondary`, sans bord, chevron de 14 px.
//    Quand `value` n'est plus `defaultValue`, il passe en encre pleine : un filtre posé se voit.
//  - Panneau : `material-panel`, rayon 12, `--shadow-flottant`, lignes de 36 px (44 au toucher), coche à gauche,
//    320 px de haut au plus avec défilement. Clavier de Radix : ↓ ↑ Début Fin, Entrée ou Espace choisit, Échap ferme.

export type OptionMenu<T extends string = string> = { valeur: T; libelle: string }
/** Un groupe d'options sous un titre : remplace un `<optgroup>`. Sans titre (`groupe: ""`), un simple séparateur. */
export type GroupeMenu<T extends string = string> = { groupe: string; options: OptionMenu<T>[] }
export type EntreeMenu<T extends string = string> = OptionMenu<T> | GroupeMenu<T>

const estGroupe = <T extends string>(e: EntreeMenu<T>): e is GroupeMenu<T> => "options" in e

/**
 *   <Menu label="Thème" value={theme} defaultValue="" onChange={setTheme}
 *         options={[{ valeur: "", libelle: "Tous les thèmes" }, { groupe: "Adoration", options: [{ valeur: "paix", libelle: "Paix" }] }]} />
 * `label` nomme le menu pour les lecteurs d'écran (le nom accessible est « Thème : Paix »). `defaultValue` est la valeur
 * « sans filtre » : celle qui laisse le déclencheur gris.
 */
export function Menu<T extends string = string>({
  value,
  defaultValue,
  options,
  onChange,
  label,
  surGris = false,
  texteDeclencheur,
  className,
  nom,
  prefixe,
}: {
  value: T
  /** La valeur neutre (« Tous »). Une autre valeur met le déclencheur en encre pleine. */
  defaultValue: T
  options: EntreeMenu<T>[]
  onChange: (valeur: T) => void
  /** Nom accessible du menu. */
  label: string
  /** Posé directement sur le fond gris de la page (recette de surface C) : piste `--secondary-fond` en clair. */
  surGris?: boolean
  /** Un menu d'aller-à (pas un filtre) : le déclencheur affiche ce texte (son nom accessible aussi) et reste gris ; `label` nomme alors la liste ; `value` ne sert qu'à la coche. */
  texteDeclencheur?: string
  className?: string
  /** Le nom du critère (« Service ») : tant que rien n'est posé, le déclencheur l'affiche à la place du libellé de l'option neutre. */
  nom?: string
  /** Affiché dans le déclencheur avant la valeur (une icône et « Trier par »). */
  prefixe?: React.ReactNode
}) {
  const plates = options.flatMap((e) => (estGroupe(e) ? e.options : [e]))
  // Valeur absente des options : le déclencheur retombe sur le libellé de `defaultValue`, gris.
  const courante = plates.find((o) => o.valeur === value) ?? plates.find((o) => o.valeur === defaultValue)
  const posee = !texteDeclencheur && value !== defaultValue && courante?.valeur === value
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={texteDeclencheur ?? (courante ? `${label} : ${courante.libelle}` : label)}
        data-menu=""
        data-pose={posee ? "" : undefined}
        className={cn(
          "inline-flex h-7 max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-full border-0 px-3 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:text-[14px]",
          TOUCHER_PILULE,
          posee ? "bg-primary text-primary-foreground" : cn("text-foreground active:bg-secondary/70", surGris ? "bg-secondary-fond dark:bg-secondary" : "bg-secondary"),
          className,
        )}
      >
        {prefixe}
        <span className="truncate">{texteDeclencheur ?? (!posee && nom ? nom : (courante?.libelle ?? ""))}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="material-panel max-h-[min(320px,var(--radix-dropdown-menu-content-available-height))] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-[12px] p-1"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((e, i) =>
            estGroupe(e) ? (
              <React.Fragment key={`g-${e.groupe}`}>
                {i > 0 && <DropdownMenuSeparator className="mx-1" />}
                {e.groupe && <DropdownMenuLabel className="px-3 pb-1 pt-2 text-[12px] font-semibold text-muted-foreground">{e.groupe}</DropdownMenuLabel>}
                {e.options.map((o) => <LigneMenu key={o.valeur} option={o} />)}
              </React.Fragment>
            ) : (
              <LigneMenu key={e.valeur} option={e} />
            ),
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LigneMenu({ option }: { option: OptionMenu }) {
  return (
    <DropdownMenuPrimitive.RadioItem
      value={option.valeur}
      className="relative flex h-9 cursor-default select-none items-center rounded-lg pl-8 pr-3 text-[14px] outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent [@media(pointer:coarse)]:h-11"
    >
      <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4" aria-hidden />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      <span className="truncate">{option.libelle}</span>
    </DropdownMenuPrimitive.RadioItem>
  )
}
