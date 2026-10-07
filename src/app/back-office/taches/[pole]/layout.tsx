"use client";

// Back-Office › Tâches d'un pôle (lot 7, docs/spec-taches.md ; lot U6, B3). Agencement v18 (B1, B2,
// docs/spec-agencement-v18.md ; planches `v18-bo-taches`, `v18-bo-tache-nouvelle`) : l'en-tête
// « Tâches » (rail des pôles avec le compte, « + Nouvelle tâche ») au-dessus de deux volets ; à
// gauche la liste du pôle (En retard · Cette semaine · Plus tard, « Terminées (n) » repliées), qui
// reste montée d'une tâche à l'autre ; à droite la page de l'adresse : la fiche
// (`[id]`), le formulaire (`nouvelle`), ou sur la liste la première tâche à faire (R11).
// Un volet (téléphone, tablette debout) : la liste, puis la fiche en page avec « ‹ Tâches » ;
// « Nouvelle tâche » ouvre la feuille d'aujourd'hui sur la liste. Réservé aux membres du pôle et
// aux admins (affichage ; poles/{pôle}/taches garde sa règle).

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
import { estSurLaListe } from "@/lib/deuxVolets";
import { useProfile } from "@/lib/firebase/users";
import { cyclerEtat, type TacheValues } from "@/lib/firebase/taches";
import { grouperLignes, lignesDeTache, type Ligne } from "@/lib/taches/echeances";
import { prevenirFait } from "@/lib/taches/prevenir";
import { cn } from "@/lib/utils";
import { TACHE_POLES, type TachePole } from "@/types/tache";

export default function PoleLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { pole: brut } = useParams<{ pole: string }>();
  const chemin = usePathname() ?? "";
  const deuxVolets = useDeuxVolets();
  const { user } = useProfile();
  const { poles, items, chargement, reload, aujourdhui, racine } = useMesTaches();
  const [feuille, setFeuille] = useState(false);
  const membres = useMembres(feuille);
  const pole = (TACHE_POLES as readonly string[]).includes(brut) && poles.includes(brut as TachePole) ? (brut as TachePole) : null;
  const racinePole = `${racine}/${brut}`;

  // Le compte du rail : les tâches qui ont encore une fois à faire (une tâche répétée compte une fois).
  const compte = (p: TachePole) => new Set(items
    .filter((x) => x.tache.pole === p)
    .flatMap(({ tache, fois }) => lignesDeTache(tache, fois, aujourdhui))
    .filter((l) => l.fois?.etat !== "terminee")
    .map((l) => l.tache.id)).size;

  async function creerDansLaFeuille(values: TacheValues, p: TachePole) {
    if (!user) return;
    await creerTache(p, values, user.uid);
    setFeuille(false);
    await reload(p);
  }

  // En un volet, la fiche est une page qui pose son propre en-tête (« ‹ Tâches »).
  const enTete = (deuxVolets || estSurLaListe(chemin, racinePole)) && (
    <EnTetePage
      titre={t("backOffice.entrees.taches")}
      sousTitre={t("taches.sousTitreBackOffice")}
      action={pole && (deuxVolets
        ? <BoutonNouveau label={t("taches.nouvelle")} href={`${racinePole}/nouvelle`} />
        : <BoutonNouveau label={t("taches.nouvelle")} onClick={() => setFeuille(true)} />)}
      onglets={poles.length > 0 && (
        <OngletsRail
          etiquette={t("taches.poles")}
          onglets={poles.map((p) => ({ id: p, label: t(`taches.pole.${p}`), href: `${racine}/${p}`, compte: chargement ? undefined : compte(p) }))}
        />
      )}
    />
  );

  if (!pole) {
    return (
      <>
        {enTete}
        {!chargement && <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("taches.pasMembre")}</p>}
      </>
    );
  }

  const lignes = items.filter((x) => x.tache.pole === pole).flatMap(({ tache, fois }) => lignesDeTache(tache, fois, aujourdhui));
  const g = grouperLignes(lignes, aujourdhui);
  const premiere = [...g.enRetard, ...g.cetteSemaine, ...g.plusTard][0];

  return (
    <>
      {enTete}
      <DeuxVolets
        racine={racinePole}
        largeurListe={380}
        liste={<ListeDuPole pole={pole} lignes={lignes} premiere={premiere} />}
        premier={chargement ? null : premiere
          ? <FicheTache pole={pole} id={premiere.tache.id} date={premiere.date} />
          : <p className="raised rounded-2xl px-5 py-4 text-sm text-muted-foreground">{t("taches.vide")}</p>}
      >
        {children}
      </DeuxVolets>
      <TacheForm open={feuille} pole={pole} initial={null} membres={membres} onSubmit={creerDansLaFeuille} onClose={() => setFeuille(false)} />
    </>
  );
}

function ListeDuPole({ pole, lignes, premiere }: { pole: TachePole; lignes: Ligne[]; premiere?: Ligne }) {
  const { t } = useTranslation();
  const router = useRouter();
  const chemin = usePathname() ?? "";
  const dateVoulue = useSearchParams().get("date");
  const deuxVolets = useDeuxVolets();
  const { user } = useProfile();
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
    const etat = await cyclerEtat(pole, l.tache.id, l.date, l.fois, { uid: user.uid, nom: parNom });
    await reload(pole);
    if (etat === "terminee" && l.tache.prevenir) {
      setRetour(texteRetour(t, await prevenirFait(pole, l.tache.id, l.date), l.tache));
    }
  }

  const rangee = (l: Ligne) => (
    <TacheLigne
      key={`${l.tache.id}-${l.date}`}
      ligne={l}
      onToggle={() => cocher(l)}
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
