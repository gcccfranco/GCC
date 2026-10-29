"use client";

// « Ajouter un titulaire », « Nommer » et « Relier à un compte » (lot 2, OG7, OG14, OG16) : une seule
// recherche — les comptes d'abord (du groupe, sans groupe qui y entrera, déjà titulaire grisé, d'un
// autre groupe grisé et inactif), puis « Ajouter « … » sans compte » quand le geste l'admet. Menu contre
// le bouton dès 1 024 px, feuille en dessous, comme « Choisir » du planning.

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useOrdinateur } from "@/components/planning/ChoisirNom";
import type { Candidat } from "@/lib/groupes/edition";
import { groupeDef } from "@/lib/groupes/table";
import type { Titulaire } from "@/types/groupe";
import { Initiales } from "./Initiales";

export type OuvertureRecherche = {
  titre: string;
  sousTitre: string;
  /** Le bouton cliqué, pour poser le menu contre lui (ordinateur). */
  ancre: DOMRect | null;
  /** « Ajouter « … » sans compte » est offert (pas pour « Relier à un compte »). */
  sansCompte: boolean;
};

const LARGEUR = 320;
const HAUTEUR = 420;

export function RechercheTitulaire({
  ouverture, groupeId, candidats, onChoisir, onFermer,
}: {
  ouverture: OuvertureRecherche | null;
  groupeId: string;
  candidats: (recherche: string) => Candidat[];
  onChoisir: (t: Titulaire) => void;
  onFermer: () => void;
}) {
  const ordinateur = useOrdinateur();
  const changer = (o: boolean) => { if (!o) onFermer(); };
  const contenu = ouverture && (
    <Liste key={ouverture.titre} ouverture={ouverture} groupeId={groupeId} candidats={candidats} onChoisir={onChoisir} />
  );

  if (ordinateur) {
    const a = ouverture?.ancre;
    const enHaut = !!a && a.bottom + HAUTEUR > window.innerHeight && a.top > window.innerHeight - a.bottom;
    const place = a
      ? { left: Math.max(8, Math.min(a.left, window.innerWidth - LARGEUR - 8)), ...(enHaut ? { bottom: window.innerHeight - a.top + 4 } : { top: a.bottom + 4 }) }
      : { left: `calc(50% - ${LARGEUR / 2}px)`, top: 120 };
    return (
      <DialogPrimitive.Root open={!!ouverture} onOpenChange={changer}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            style={{ ...place, width: LARGEUR }}
            className="fixed z-50 rounded-2xl border bg-popover p-2 text-popover-foreground shadow-lg"
          >
            <DialogPrimitive.Title className="px-1.5 pt-1 text-sm font-semibold">{ouverture?.titre}</DialogPrimitive.Title>
            <p className="px-1.5 pb-2 text-xs text-muted-foreground">{ouverture?.sousTitre}</p>
            {contenu}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Drawer open={!!ouverture} onOpenChange={changer}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="pb-1 text-left">
          <DrawerTitle>{ouverture?.titre}</DrawerTitle>
          <DrawerDescription>{ouverture?.sousTitre}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto px-4 pb-6">{contenu}</div>
      </DrawerContent>
    </Drawer>
  );
}

function Liste({
  ouverture, groupeId, candidats, onChoisir,
}: {
  ouverture: OuvertureRecherche;
  groupeId: string;
  candidats: (recherche: string) => Candidat[];
  onChoisir: (t: Titulaire) => void;
}) {
  const { t } = useTranslation();
  const [recherche, setRecherche] = useState("");
  const liste = candidats(recherche);
  const groupe = t(`categories.${groupeDef(groupeId)?.categorie ?? ""}`);
  const nomLibre = recherche.trim();

  const ligne = (c: Candidat) => {
    const actif = c.etat === "groupe" || c.etat === "entrera";
    const detail = c.etat === "groupe" ? groupe
      : c.etat === "entrera" ? t("groupes.recherche.entrera", { groupe })
      : c.etat === "deja" ? t("groupes.recherche.deja")
      : t("groupes.recherche.autre", { groupe: t(`categories.${groupeDef(c.autre ?? "")?.categorie ?? ""}`) });
    return (
      <li key={c.uid}>
        <button
          type="button"
          disabled={!actif}
          onClick={() => onChoisir({ nom: c.nom, uid: c.uid })}
          className="flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left enabled:hover:bg-secondary disabled:opacity-50"
        >
          <Initiales nom={c.nom} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-foreground sm:text-sm">{c.nom}</span>
            <span className="block text-xs text-muted-foreground">{detail}</span>
          </span>
          {actif && <span className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">{t("groupes.recherche.ajouter")}</span>}
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          type="search"
          aria-label={t("groupes.recherche.chercher")}
          placeholder={t("groupes.recherche.chercher")}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="h-10 w-full rounded-full bg-secondary pl-8 pr-3 text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/30 sm:text-sm"
        />
      </div>
      {liste.length > 0 && (
        <section aria-label={t("groupes.recherche.comptes")}>
          <h3 className="px-1.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("groupes.recherche.comptes")}</h3>
          <ul>{liste.map(ligne)}</ul>
        </section>
      )}
      {ouverture.sansCompte && nomLibre && (
        <section aria-label={t("groupes.recherche.sansCompte")}>
          <h3 className="px-1.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("groupes.recherche.sansCompte")}</h3>
          <button
            type="button"
            onClick={() => onChoisir({ nom: nomLibre, uid: "" })}
            className="flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left hover:bg-secondary"
          >
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground">
              <Plus className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-foreground sm:text-sm">{t("groupes.recherche.ajouterSansCompte", { nom: nomLibre })}</span>
              <span className="block text-xs text-muted-foreground">{t("groupes.recherche.sansCompteAide")}</span>
            </span>
          </button>
        </section>
      )}
    </div>
  );
}
