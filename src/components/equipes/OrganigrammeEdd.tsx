"use client";

// Sous-équipes de l'EDD (docs/spec-edd-sous-equipes.md, E3, E4) : les pastilles à bascule de la ligne d'un membre
// dans le panneau d'édition. Mêmes pastilles que Louange, sans référent de sous-équipe, sans lieux, sans droits.

import { useTranslation } from "react-i18next";
import { Groupe, Pastille } from "@/components/equipes/OrganigrammeLouange";
import { sousEquipesEddDe } from "@/lib/equipes/edd";
import { SOUS_EQUIPES_EDD, type MembreEquipe, type SousEquipeEdd } from "@/types/equipe";

export function PastillesEdd({ m, onChange }: { m: MembreEquipe; onChange: (champ: Partial<MembreEquipe>) => void }) {
  const { t } = useTranslation();
  const actuelles = sousEquipesEddDe(m);
  // La liste complète, ordre E1, depuis la lecture (un ancien `groupe` repart de la bonne base) ; `groupe` n'est pas effacé.
  const bascule = (s: SousEquipeEdd) =>
    onChange({ sousEquipesEdd: SOUS_EQUIPES_EDD.filter((x) => (x === s ? !actuelles.includes(s) : actuelles.includes(x))) });
  return (
    <Groupe titre={t("equipes.organigramme.sousEquipes")}>
      {SOUS_EQUIPES_EDD.map((s) => (
        <Pastille key={s} actif={actuelles.includes(s)} onClick={() => bascule(s)}>
          {t(`equipes.sousEquipeEdd.${s}`)}
        </Pastille>
      ))}
    </Groupe>
  );
}
