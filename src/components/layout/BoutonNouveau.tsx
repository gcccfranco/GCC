// L'action principale d'une page (agencement v18, R7 de docs/spec-agencement-v18.md) : une seule par
// page, « + Nouvelle tâche ». Dès 768 px, pilule noire à libellé dans l'en-tête (`EnTetePage action`) ;
// sur téléphone, rond noir de 52 px en bas à droite, au-dessus de la barre d'onglets
// (`--tabbar-bottom` + ses 64 px + 12 px), le libellé pour les lecteurs d'écran seulement.
// Un seul élément : il se pose dans l'en-tête et le CSS le sort en rond sur téléphone.
//
//   <EnTetePage titre="Tâches" action={<BoutonNouveau label="Nouvelle tâche" href="/back-office/taches/da/nouvelle" />} />
//   <BoutonNouveau label="Nouvel évènement" onClick={() => setOuvert(true)} />
//
// Exceptions de R7 : Chants garde « Proposer un chant » en bas de liste sur téléphone, Profil garde
// « Enregistrer » en bas ; ce n'est pas ce composant.

import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const CLASSE = cn(
  // Téléphone : le rond, fixe.
  "fixed bottom-[calc(var(--tabbar-bottom)+76px)] right-4 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full",
  "bg-primary text-primary-foreground max-md:[box-shadow:var(--shadow-raised)] transition-transform duration-150 active:scale-[.97] print:hidden",
  // Dès 768 px : la pilule à libellé, dans le flux de l'en-tête.
  "md:static md:h-10 md:w-auto md:gap-2 md:px-[18px] md:text-base md:font-semibold",
);

// `dansLeFlux` (agenda des évènements, téléphone) : pas de rond fixe qui couvre le contenu, une pilule de 44 px
// posée dans le flux, en bas de la liste (comme « Proposer un chant » sur Chants) ; dès 768 px elle disparaît, la
// pilule d'en-tête prend le relais.
const CLASSE_FLUX =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground transition-transform duration-150 active:scale-[.97] md:hidden print:hidden";

export function BoutonNouveau({ label, href, onClick, dansLeFlux = false }: { label: string; href?: string; onClick?: () => void; dansLeFlux?: boolean }) {
  const contenu = dansLeFlux ? (
    <>
      <Plus className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden />
      <span>{label}</span>
    </>
  ) : (
    <>
      <Plus className="h-6 w-6 shrink-0 md:h-4 md:w-4" strokeWidth={2.4} aria-hidden />
      <span className="sr-only md:not-sr-only">{label}</span>
    </>
  );
  const classe = dansLeFlux ? CLASSE_FLUX : CLASSE;
  if (href) {
    return (
      <Link href={href} aria-label={label} className={classe}>
        {contenu}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={classe}>
      {contenu}
    </button>
  );
}
