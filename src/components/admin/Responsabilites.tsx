"use client";

// Équipes › Responsabilités (lot RS, tranche RS-C ; docs/spec-responsabilites.md, « Écrans »). Qui gère quoi, au même
// endroit : « Sans gestionnaire » en tête s'il y en a, puis Plannings, Comité Orga et Référents. Chaque ligne montre ses
// personnes (une puce, avec son « Retirer ») et « + Ajouter », qui cherche parmi les comptes. Enregistrement immédiat,
// case par case : `users/{uid}.responsabilites` pour les plannings et le Comité Orga, `equipes/{id}` (puis la recopie
// serveur, comme l'organigramme) pour les référents. Admins seuls ; la page les prévient en amont.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, X } from "lucide-react";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Initiales } from "@/components/groupes/Initiales";
import { ListePuces } from "./commun";
import { RailEquipes } from "@/app/back-office/equipes/RailEquipes";
import { changerResponsabilites, listProfiles, useProfile } from "@/lib/firebase/users";
import { listEquipes, majRattachement, saveEquipe } from "@/lib/firebase/equipes";
import { ModifieEntreTemps } from "@/lib/firebase/programmes";
import { ORGA, RESPONSABILITES_PLANNING, responsabilitesDe } from "@/lib/acces/responsabilites";
import { cleNomEquipe } from "@/lib/equipes/table";
import {
  LIGNES_REFERENTS, avecReferent, cleLigne, referentsDe, sansReferent, type LigneReferents,
} from "@/lib/equipes/responsabilites";
import type { Equipe } from "@/types/equipe";
import type { UserProfile } from "@/types/user";

const nomComplet = (p: UserProfile) => `${p.firstName} ${p.lastName}`.trim() || p.planningName || p.email;

type Puce = { cle: string; uid: string; nom: string };
type Ligne = {
  cle: string;
  titre: string;
  puces: Puce[];
  ajouter: (p: UserProfile) => Promise<void>;
  retirer: (puce: Puce) => Promise<void>;
};

export function Responsabilites() {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const [profils, setProfils] = useState<UserProfile[] | null>(null);
  const [equipes, setEquipes] = useState<Record<string, Equipe> | null>(null);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);

  const lire = useCallback(async () => {
    try {
      const [ps, es] = await Promise.all([listProfiles(), listEquipes({ strict: true })]);
      setProfils(ps);
      setEquipes(Object.fromEntries(es.map((e) => [e.id, e])));
    } catch {
      setErreur(t("responsabilites.erreurLecture"));
    }
  }, [t]);
  useEffect(() => { void lire(); }, [lire]);

  const parUid = useMemo(() => new Map((profils ?? []).map((p) => [p.uid, p])), [profils]);
  const nomDe = (uid: string, repli: string) => (uid && parUid.get(uid) ? nomComplet(parUid.get(uid)!) : repli);

  /** Un geste = une écriture ; l'erreur s'affiche en haut, la page garde ce qu'elle montrait. */
  async function ecrire(cle: string, action: () => Promise<void>) {
    setErreur("");
    setEnCours(cle);
    try {
      await action();
    } catch (e) {
      if (e instanceof ModifieEntreTemps) {
        setErreur(e.prenom ? t("planning.programme.modifieEntreTemps", { prenom: e.prenom }) : t("planning.programme.modifieEntreTempsSansNom"));
        void lire();
      } else {
        setErreur(t("responsabilites.erreur"));
      }
    } finally {
      setEnCours(null);
    }
  }

  // ── Responsabilités du profil (plannings, Comité Orga) ────────────────────
  function ligneProfil(cleResp: string, titre: string): Ligne {
    const avec = (profils ?? []).filter((p) => responsabilitesDe(p).includes(cleResp as never));
    const poser = async (p: UserProfile, present: boolean) => {
      const cles = present ? [...responsabilitesDe(p), cleResp] : responsabilitesDe(p).filter((c) => c !== cleResp);
      await changerResponsabilites(p.uid, cles);
      const suivantes = cles as string[];
      setProfils((prev) => (prev ?? []).map((x) => (x.uid === p.uid ? { ...x, responsabilites: suivantes } : x)));
    };
    return {
      cle: cleResp,
      titre,
      puces: avec.map((p) => ({ cle: p.uid, uid: p.uid, nom: nomComplet(p) })),
      ajouter: (p) => ecrire(cleResp, () => poser(p, true)),
      retirer: (puce) => ecrire(cleResp, () => poser(parUid.get(puce.uid)!, false)),
    };
  }

  // ── Référents (équipes, sous-équipes de Louange) ──────────────────────────
  function ligneReferents(l: LigneReferents): Ligne {
    // Préfixe : l'équipe `orga` ne se confond pas avec la ligne `orga` du Comité.
    const cle = `ref:${cleLigne(l)}`;
    const equipe = equipes?.[l.equipe];
    const nomEquipe = t(cleNomEquipe(l.equipe));
    const poser = async (personne: { uid: string; nom: string }, present: boolean) => {
      if (!user) return;
      const avant = equipe?.membres ?? [];
      const apres = present ? avecReferent(avant, personne, l.sous) : sansReferent(avant, personne, l.sous);
      const nom = profile ? nomComplet(profile) : (user.email ?? "");
      const version = await saveEquipe(l.equipe, apres, { uid: user.uid, nom }, equipe?.version ?? null);
      setEquipes((prev) => ({
        ...(prev ?? {}),
        [l.equipe]: {
          id: l.equipe, membres: apres, updatedAt: new Date().toISOString(), parUid: user.uid, parNom: nom,
          ...((version ?? equipe?.version) ? { version: (version ?? equipe?.version)! } : {}),
        },
      }));
      // Le profil reste fermé au navigateur : le serveur recopie `referentDe` / `referentSous`.
      if (personne.uid) {
        try {
          await majRattachement([personne.uid], l.equipe);
        } catch {
          setErreur(t("groupes.droitsNonRecopies"));
        }
      }
    };
    return {
      cle,
      titre: l.sous ? t("responsabilites.sousLouange", { sous: t(`acces.sousEquipe.${l.sous}`) }) : nomEquipe,
      puces: referentsDe(equipe?.membres ?? [], l.sous).map((r) => ({ cle: r.uid || `nom:${r.nom}`, uid: r.uid, nom: nomDe(r.uid, r.nom) })),
      ajouter: (p) => ecrire(cle, () => poser({ uid: p.uid, nom: nomComplet(p) }, true)),
      retirer: (puce) => ecrire(cle, () => poser({ uid: puce.uid, nom: puce.nom }, false)),
    };
  }

  const chargee = profils !== null && equipes !== null;
  const lignesPlannings = RESPONSABILITES_PLANNING.map((r) =>
    ligneProfil(r.cle, t("responsabilites.gestionnaire", { planning: t(`acces.responsabilite.${r.cle.slice("planning:".length)}`) })));
  const sansGestionnaire = lignesPlannings.filter((l) => l.puces.length === 0);

  return (
    <>
      <EnTetePage titre={t("backOffice.entrees.equipes")} sousTitre={t("responsabilites.sousTitre")} onglets={<RailEquipes />} />
      <div className="px-[var(--marge-page)] pb-16">
        <div className="max-w-[760px] space-y-6">
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
          {!chargee ? (
            !erreur && <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <>
              {sansGestionnaire.length > 0 && (
                <div data-testid="sans-gestionnaire">
                  <ListePuces
                    titre={t("responsabilites.sansGestionnaire")}
                    aide={t("responsabilites.sansGestionnaireAide")}
                    items={sansGestionnaire.map((l) => l.titre)}
                  />
                </div>
              )}
              <Section titre={t("responsabilites.plannings")} lignes={lignesPlannings} profils={profils} enCours={enCours} />
              <Section titre={t("acces.responsabilite.orga")} lignes={[ligneProfil(ORGA, t("acces.responsabilite.orga"))]} profils={profils} enCours={enCours} sansEntete />
              <Section titre={t("responsabilites.referents")} lignes={LIGNES_REFERENTS.map(ligneReferents)} profils={profils} enCours={enCours} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Un bloc : son titre, puis une ligne par clé, dans une carte (même carte que la fiche de Personnes). */
function Section({
  titre, lignes, profils, enCours, sansEntete = false,
}: {
  titre: string;
  lignes: Ligne[];
  profils: UserProfile[];
  enCours: string | null;
  /** Une seule ligne qui porte déjà le titre : pas de titre de section en plus. */
  sansEntete?: boolean;
}) {
  return (
    <section aria-label={titre} className="space-y-2">
      {!sansEntete && <h2 className="text-[16px] font-bold text-foreground">{titre}</h2>}
      <div className="raised divide-y divide-border rounded-2xl px-4 sm:px-5">
        {lignes.map((l) => <LigneResponsabilite key={l.cle} ligne={l} profils={profils} occupee={enCours === l.cle} />)}
      </div>
    </section>
  );
}

function LigneResponsabilite({ ligne, profils, occupee }: { ligne: Ligne; profils: UserProfile[]; occupee: boolean }) {
  const { t } = useTranslation();
  const [recherche, setRecherche] = useState<string | null>(null);
  const q = (recherche ?? "").trim().toLowerCase();
  const deja = new Set(ligne.puces.map((p) => p.uid).filter(Boolean));
  const resultats = q ? profils.filter((p) => !deja.has(p.uid) && nomComplet(p).toLowerCase().includes(q)).slice(0, 6) : [];

  return (
    <div role="group" aria-label={ligne.titre} aria-busy={occupee} data-testid={`resp-${ligne.cle}`} className="space-y-2 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="min-w-[8rem] flex-1 text-[15px] font-semibold text-foreground">{ligne.titre}</h3>
        <button
          type="button"
          aria-expanded={recherche !== null}
          disabled={occupee}
          onClick={() => setRecherche((r) => (r === null ? "" : null))}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-background px-3.5 text-[14px] font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("responsabilites.ajouter")}
        </button>
      </div>

      {ligne.puces.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("responsabilites.personne")}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {ligne.puces.map((p) => (
            <li key={p.cle} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary py-1 pl-1.5 pr-1 text-sm font-semibold text-foreground">
              <Initiales nom={p.nom} />
              <span>{p.nom}</span>
              <button
                type="button"
                aria-label={t("responsabilites.retirer", { nom: p.nom })}
                disabled={occupee}
                onClick={() => void ligne.retirer(p)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {recherche !== null && (
        <div className="space-y-1">
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="search"
              aria-label={t("responsabilites.chercher")}
              placeholder={t("responsabilites.chercher")}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="h-11 w-full rounded-full bg-secondary pl-8 pr-3 text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/30 sm:text-sm"
            />
          </div>
          {q && resultats.length === 0 && <p className="px-1.5 py-1 text-sm text-muted-foreground">{t("responsabilites.aucunCompte")}</p>}
          {resultats.length > 0 && (
            <ul>
              {resultats.map((p) => (
                <li key={p.uid}>
                  <button
                    type="button"
                    onClick={() => { setRecherche(null); void ligne.ajouter(p); }}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left hover:bg-secondary"
                  >
                    <Initiales nom={nomComplet(p)} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground sm:text-sm">{nomComplet(p)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
