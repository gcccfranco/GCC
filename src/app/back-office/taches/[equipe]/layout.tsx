"use client";

// Back-Office › Tâches d'une équipe (lot 7, docs/spec-taches.md ; lot U6, B3). Agencement v18 (B1,
// B2, docs/spec-agencement-v18.md ; planches `v18-bo-taches`, `v18-bo-tache-nouvelle`) : l'en-tête
// « Tâches » (rail des équipes avec le compte, « + Nouvelle tâche ») au-dessus de deux volets ; à
// gauche la liste de l'équipe (En retard · Cette semaine · Plus tard, « Terminées (n) » repliées),
// qui reste montée d'une tâche à l'autre ; à droite la page de l'adresse : la fiche
// (`[id]`), le formulaire (`nouvelle`), ou sur la liste la première tâche à faire (R11).
// Un volet (téléphone, tablette debout) : la liste, puis la fiche en page avec « ‹ Tâches » ;
// « Nouvelle tâche » ouvre la feuille d'aujourd'hui sur la liste. Réservé aux membres de l'équipe
// (Louange élargi) et aux admins (affichage ; equipes/{équipe}/taches garde sa règle).
// Lot 1 du chantier « équipes et groupes » (EQ8, EQ9) : le rail n'a que les équipes qui ont une tâche,
// plus celles dont on est référent ; « + Nouvelle tâche » à qui crée quelque part (`equipesOuCreer`),
// dans l'équipe affichée si on y crée ; la case d'une tâche qu'on ne peut pas cocher est inerte.

import { useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OngletsRail } from "@/components/layout/Onglets";
import { FicheTache } from "@/components/taches/FicheTache";
import { TacheForm } from "@/components/taches/TacheForm";
import { TacheLigne } from "@/components/taches/TacheLigne";
import { adresseDeLaLigne, useMesTaches } from "@/components/taches/SectionTaches";
import { texteRetour } from "@/components/taches/retour";
import { creerTache, useMembres } from "@/components/taches/creerTache";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { equipesOuCreer, peutCocher } from "@/lib/access";
import { estSurLaListe } from "@/lib/deuxVolets";
import { cleNomEquipe } from "@/lib/equipes/table";
import { useProfile } from "@/lib/firebase/users";
import { cyclerEtat, type TacheValues } from "@/lib/firebase/taches";
import { equipesDuRail, grouperLignes, lignesDeTache, type Ligne } from "@/lib/taches/echeances";
import { prevenirFait } from "@/lib/taches/prevenir";
import { cn } from "@/lib/utils";

export default function EquipeLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { equipe: brut } = useParams<{ equipe: string }>();
  const chemin = usePathname() ?? "";
  const deuxVolets = useDeuxVolets();
  const { user, profile } = useProfile();
  const { equipes, items, chargement, reload, aujourdhui, racine } = useMesTaches();
  const [feuille, setFeuille] = useState(false);
  const membres = useMembres(feuille);
  const equipe = equipes.includes(brut) ? brut : null;
  const racineEquipe = `${racine}/${brut}`;
  const rail = equipesDuRail(equipes, items.map((x) => x.tache), profile?.referentDe);
  // « + Nouvelle tâche » (EQ8, EQ9) : dans l'équipe affichée si on y crée, sinon la première où l'on crée.
  const ouCreer = equipesOuCreer(user, profile);
  const depart = equipe && ouCreer.includes(equipe) ? equipe : ouCreer[0];

  // Le compte du rail : les tâches qui ont encore une fois à faire (une tâche répétée compte une fois).
  const compte = (e: string) => new Set(items
    .filter((x) => x.tache.equipe === e)
    .flatMap(({ tache, fois }) => lignesDeTache(tache, fois, aujourdhui))
    .filter((l) => l.fois?.etat !== "terminee")
    .map((l) => l.tache.id)).size;

  async function creerDansLaFeuille(values: TacheValues, e: string) {
    if (!user) return;
    await creerTache(e, values, user.uid);
    setFeuille(false);
    await reload(e);
  }

  // En un volet, la fiche est une page qui pose son propre en-tête (« ‹ Tâches »).
  const enTete = (deuxVolets || estSurLaListe(chemin, racineEquipe)) && (
    <EnTetePage
      titre={t("backOffice.entrees.taches")}
      sousTitre={t("taches.sousTitreBackOffice")}
      action={equipe && depart && (deuxVolets
        ? <BoutonNouveau label={t("taches.nouvelle")} href={`${racine}/${depart}/nouvelle`} />
        : <BoutonNouveau label={t("taches.nouvelle")} onClick={() => setFeuille(true)} />)}
      onglets={rail.length > 0 && (
        // Pendant la lecture, les seules équipes dont on est référent, sans compte.
        <OngletsRail
          etiquette={t("taches.equipes")}
          onglets={rail.map((e) => ({ id: e, label: t(cleNomEquipe(e, true)), href: `${racine}/${e}`, compte: chargement ? undefined : compte(e) }))}
        />
      )}
    />
  );

  if (!equipe) {
    return (
      <>
        {enTete}
        {!chargement && <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("taches.pasMembre")}</p>}
      </>
    );
  }

  const lignes = items.filter((x) => x.tache.equipe === equipe).flatMap(({ tache, fois }) => lignesDeTache(tache, fois, aujourdhui));
  const g = grouperLignes(lignes, aujourdhui);
  const premiere = [...g.enRetard, ...g.cetteSemaine, ...g.plusTard][0];

  return (
    <>
      {enTete}
      <DeuxVolets
        racine={racineEquipe}
        largeurListe={380}
        liste={<ListeDeLEquipe equipe={equipe} lignes={lignes} premiere={premiere} />}
        premier={chargement ? null : premiere
          ? <FicheTache equipe={equipe} id={premiere.tache.id} date={premiere.date} />
          : <p className="raised rounded-2xl px-5 py-4 text-sm text-muted-foreground">{t("taches.vide")}</p>}
      >
        {children}
      </DeuxVolets>
      {depart && (
        <TacheForm open={feuille} equipe={depart} equipes={ouCreer} initial={null} membres={membres} onSubmit={creerDansLaFeuille} onClose={() => setFeuille(false)} />
      )}
    </>
  );
}

function ListeDeLEquipe({ equipe, lignes, premiere }: { equipe: string; lignes: Ligne[]; premiere?: Ligne }) {
  const { t } = useTranslation();
  const router = useRouter();
  const chemin = usePathname() ?? "";
  const dateVoulue = useSearchParams().get("date");
  const deuxVolets = useDeuxVolets();
  const { user, profile } = useProfile();
  const { chargement, reload, aujourdhui, parNom, racine } = useMesTaches();
  const [retour, setRetour] = useState("");
  const [terminees, setTerminees] = useState(false);
  const g = grouperLignes(lignes, aujourdhui);

  // La tâche ouverte à droite : celle de l'adresse, ou sur la liste la première à faire.
  const [, , , , id] = chemin.split("/");
  const ouverte = id ? (id === "nouvelle" ? null : { id, date: dateVoulue }) : premiere ? { id: premiere.tache.id, date: premiere.date } : null;
  const estOuverte = (l: Ligne) => deuxVolets && !!ouverte && l.tache.id === ouverte.id
    && (!ouverte.date || !l.tache.repetition || ouverte.date === l.date);

  // À faire → En cours → Terminé → À faire : on ne prévient qu'à « Terminé ».
  async function cocher(l: Ligne) {
    if (!user) return;
    setRetour("");
    const etat = await cyclerEtat(equipe, l.tache.id, l.date, l.fois, { uid: user.uid, nom: parNom });
    await reload(equipe);
    if (etat === "terminee" && l.tache.prevenir) {
      setRetour(texteRetour(t, await prevenirFait(equipe, l.tache.id, l.date), l.tache));
    }
  }

  const rangee = (l: Ligne) => (
    <TacheLigne
      key={`${l.tache.id}-${l.date}`}
      ligne={l}
      // Case inerte sans le droit de cocher (EQ8, décision 41).
      onToggle={peutCocher(user, profile, l.tache) ? () => cocher(l) : undefined}
      onOpen={() => router.push(adresseDeLaLigne(l, racine))}
      actif={estOuverte(l)}
    />
  );
  const groupes: [string, Ligne[], boolean][] = [
    [t("taches.groupes.enRetard"), g.enRetard, true],
    [t("taches.groupes.cetteSemaine"), g.cetteSemaine, false],
    [t("taches.groupes.plusTard"), g.plusTard, false],
  ];

  return (
    <div className={cn("space-y-5", deuxVolets ? "px-3 py-4" : "px-[var(--marge-page)] pb-10")}>
      {retour && <p role="status" className="px-1 text-sm text-muted-foreground">{retour}</p>}
      {!chargement && lignes.length === 0 && <p className="px-1 text-sm text-muted-foreground">{t("taches.vide")}</p>}
      {groupes.filter(([, ls]) => ls.length > 0).map(([titre, ls, rouge]) => (
        <section key={titre}>
          <h2 className={cn("mb-1 px-1 text-sm font-semibold", rouge ? "text-destructive" : "text-muted-foreground")}>{titre}</h2>
          <div>{ls.map(rangee)}</div>
        </section>
      ))}
      {g.faites.length > 0 && (
        <section className="border-t border-border/70 pt-3">
          <button
            type="button"
            aria-expanded={terminees}
            onClick={() => setTerminees((o) => !o)}
            className="inline-flex items-center gap-1 px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {t("taches.terminees", { count: g.faites.length })}
            <ChevronRight className={cn("h-4 w-4 transition-transform duration-150", terminees && "rotate-90")} aria-hidden />
          </button>
          {terminees && <div className="mt-1">{g.faites.map(rangee)}</div>}
        </section>
      )}
    </div>
  );
}
