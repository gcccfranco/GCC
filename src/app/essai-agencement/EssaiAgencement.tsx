"use client";

// Les composants communs de l'agencement v18 réunis sur une page (voir page.tsx) : en-tête complet,
// rail, pilules, action principale, « ⋯ », confirmation dans le site, deux volets. Données fictives.

import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { useConfirmer } from "@/components/layout/Confirmer";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { MenuActions } from "@/components/layout/MenuActions";
import { OngletsRail, Pilules } from "@/components/layout/Onglets";
import { PLANNING_COLORS } from "@/lib/serviceColors";

const ESSAIS = ["Premier essai", "Deuxième essai", "Troisième essai"];

export function EssaiAgencement() {
  const confirmer = useConfirmer();
  const [vue, setVue] = useState("avenir");
  const [filtre, setFiltre] = useState<"tous" | "culte" | "groupes" | null>("tous");
  const [resultat, setResultat] = useState("");
  const [reponse, setReponse] = useState("");

  return (
    <div className="relative">
      <EnTetePage
        retour={{ href: "/moi", label: "Moi" }}
        titre="Essai d'agencement"
        sousTitre="Les composants communs de la v18"
        outils={
          <MenuActions
            actions={[
              { label: "Dupliquer", icone: Copy, onSelect: () => setResultat("dupliqué") },
              {
                label: "Supprimer", icone: Trash2, destructif: true, onSelect: () => setResultat("supprimé"),
                confirmer: { titre: "Supprimer l'essai ?", texte: "Il disparaît de la liste.", action: "Supprimer" },
              },
            ]}
          />
        }
        action={<BoutonNouveau label="Nouvel essai" onClick={() => setResultat("nouveau")} />}
        onglets={
          <OngletsRail
            etiquette="Période"
            onglets={[{ id: "avenir", label: "À venir", compte: 3 }, { id: "passes", label: "Passés" }]}
            actif={vue}
            choisir={setVue}
          />
        }
        apres={
          <Pilules
            etiquette="Filtres"
            options={[{ cle: "tous", nom: "Tous" }, { cle: "culte", nom: "Culte", couleur: PLANNING_COLORS.culte }, { cle: "groupes", nom: "Groupes" }]}
            valeur={filtre}
            choisir={setFiltre}
          />
        }
      />
      <DeuxVolets
        racine="/essai-agencement"
        liste={
          <ul className="px-[var(--marge-page)] py-2 [[data-deux-volets]_&]:px-2">
            {ESSAIS.map((e) => (
              <li key={e} className="rounded-xl px-3 py-2.5 text-[15px] font-semibold">{e}</li>
            ))}
          </ul>
        }
        premier={<h2 className="text-2xl font-bold">{ESSAIS[0]}</h2>}
      >
        {null}
      </DeuxVolets>
      <section className="space-y-3 px-[var(--marge-page)] pb-10">
        <p>Vue : <span data-testid="vue">{vue}</span> · Résultat : <span data-testid="resultat">{resultat}</span></p>
        <button
          type="button"
          className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold"
          onClick={async () => setReponse(String(await confirmer({ titre: "Retirer l'essai ?", texte: "Il ne sera plus dans la liste.", action: "Retirer", destructif: true })))}
        >
          Demander
        </button>
        <p>Réponse : <span data-testid="reponse">{reponse}</span></p>
        <OngletsRail
          etiquette="Adresses"
          onglets={[{ id: "ici", label: "Ici", href: "/essai-agencement" }, { id: "ailleurs", label: "Ailleurs", href: "/moi" }]}
        />
      </section>
    </div>
  );
}
