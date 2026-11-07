import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Un champ de formulaire du Back-Office (docs/spec-corrections-design/bo-reunions-taches.md, -13) : le libellé
 *  de 13 px semi-gras gris, à 6 px au-dessus du champ (`<Input className="h-11">`, `<select className="h-11 …">`,
 *  `<Textarea>`). Sans `id` (rail, pilules, valeur en lecture), le libellé est un `<p>`. */
export function Champ({ id, label, children, className }: { id?: string; label: ReactNode; children: ReactNode; className?: string }) {
  const classe = "text-sm font-semibold text-muted-foreground"
  return (
    <div className={cn("space-y-1.5", className)}>
      {id ? <label htmlFor={id} className={classe}>{label}</label> : <p className={classe}>{label}</p>}
      {children}
    </div>
  )
}
