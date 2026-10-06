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
  "md:static md:h-10 md:w-auto md:gap-2 md:px-[18px] md:text-[14.5px] md:font-semibold",
);

export function BoutonNouveau({ label, href, onClick }: { label: string; href?: string; onClick?: () => void }) {
  const contenu = (
    <>
      <Plus className="h-6 w-6 shrink-0 md:h-4 md:w-4" strokeWidth={2.4} aria-hidden />
      <span className="sr-only md:not-sr-only">{label}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} className={CLASSE}>
        {contenu}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={CLASSE}>
      {contenu}
    </button>
  );
}
