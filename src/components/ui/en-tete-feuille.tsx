import type { ElementType, ReactNode, Ref } from "react";
import { X } from "lucide-react";

/** En-tête commun des feuilles et menus : titre à gauche, × de 44 px à droite (CI-7, B1). `Titre` : l'élément du titre
 *  (`DrawerTitle` pour une feuille Radix, `h2` sinon). */
export function EnTeteFeuille({ titre, Titre = "h2", onFermer, labelFermer, titreId, refFermer, className = "" }: {
  titre: ReactNode;
  Titre?: ElementType;
  onFermer: () => void;
  labelFermer: string;
  titreId?: string;
  refFermer?: Ref<HTMLButtonElement>;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-center justify-between gap-2 ${className}`}>
      <Titre {...(titreId ? { id: titreId } : {})} className="min-w-0 truncate text-base font-semibold">{titre}</Titre>
      <button
        ref={refFermer}
        type="button"
        aria-label={labelFermer}
        onClick={onFermer}
        className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
