"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { listProfiles } from "@/lib/firebase/users";
import { candidatsDeLEquipe, nomCourt, roleParDefaut, type RolePartage } from "@/lib/setlist/partage";
import { TitreVolet } from "@/components/setlists/editeur/feuille";
import type { UserProfile } from "@/types/user";

// La vue « L'équipe de cette setlist » du volet (docs/spec-partage-setlist.md, PS3) : les comptes
// choisis par le propriétaire, qui voient et modifient la setlist. Pour les autres : en lecture.

export interface EtatEquipe {
  editeurs: string[];
  roles: Record<string, RolePartage>;
  /** Le propriétaire (ou un admin) choisit ; les autres lisent. */
  peutChanger: boolean;
  categorie: string;
  ownerId: string | null;
  ajouter: (uid: string, role: RolePartage) => void;
  retirer: (uid: string) => void;
  changerRole: (uid: string, role: RolePartage) => void;
}

const bouton =
  "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function VoletEquipe({ equipe }: { equipe: EtatEquipe }) {
  const { t } = useTranslation();
  const [profils, setProfils] = useState<UserProfile[] | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [tous, setTous] = useState(false);
  const [requete, setRequete] = useState("");

  useEffect(() => {
    let vivant = true;
    listProfiles().then((p) => vivant && setProfils(p)).catch(() => vivant && setProfils([]));
    return () => { vivant = false; };
  }, []);

  const parUid = useMemo(() => new Map((profils ?? []).map((p) => [p.uid, p])), [profils]);
  // Un uid sans profil garde sa ligne (nom neutre) : sans elle, la puce le compte mais rien ne permet de le retirer.
  // Tant que les profils n'ont pas répondu, aucune ligne : tout le monde serait « Membre inconnu » avec des « Retirer » identiques.
  const membres = profils === null ? [] : equipe.editeurs.map((uid) => ({ uid, nom: parUid.has(uid) ? nomCourt(parUid.get(uid)!) : t("setlists.equipe.inconnu") }));
  const { duService, tous: tousLesComptes } = useMemo(
    () => candidatsDeLEquipe(profils ?? [], equipe.categorie, equipe.ownerId),
    [profils, equipe.categorie, equipe.ownerId],
  );
  const q = requete.trim().toLowerCase();
  const filtre = (liste: UserProfile[]) => (q ? liste.filter((p) => nomCourt(p).toLowerCase().includes(q)) : liste);

  function choix(p: UserProfile) {
    const deja = equipe.editeurs.includes(p.uid);
    return (
      <li key={p.uid}>
        <button
          type="button"
          disabled={deja}
          onClick={() => {
            equipe.ajouter(p.uid, roleParDefaut(p, equipe.categorie));
            setOuvert(false);
            setTous(false);
            setRequete("");
          }}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-secondary disabled:opacity-60"
        >
          <span>{nomCourt(p)}</span>
          {deja && <span className="text-xs text-muted-foreground">{t("setlists.equipe.dejaLa")}</span>}
        </button>
      </li>
    );
  }

  const groupe = filtre(duService);
  const comptes = filtre(tousLesComptes);

  return (
    <div className="space-y-4">
      <TitreVolet className="text-xl font-bold tracking-tight">{t("setlists.equipe.titre")}</TitreVolet>
      <p className="text-sm text-muted-foreground">{t("setlists.equipe.aide")}</p>
      {!equipe.peutChanger && <p className="text-sm font-medium">{t("setlists.equipe.lectureSeule")}</p>}

      {membres.length > 0 ? (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {membres.map((p) => {
            const role = equipe.roles[p.uid] ?? "musicien";
            return (
              <li key={p.uid} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                <span className="text-sm font-semibold">{p.nom}</span>
                <span className="flex items-center gap-1.5">
                  {(["musicien", "chanteur"] as const).map((r) =>
                    equipe.peutChanger ? (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={role === r}
                        onClick={() => equipe.changerRole(p.uid, r)}
                        className={`${bouton} ${role === r ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                      >
                        {t(r === "musicien" ? "equipes.role.musicien" : "performance.roles.choriste")}
                      </button>
                    ) : role === r ? (
                      <span key={r} className={`${bouton} bg-secondary`}>
                        {t(r === "musicien" ? "equipes.role.musicien" : "performance.roles.choriste")}
                      </span>
                    ) : null,
                  )}
                  {equipe.peutChanger && (
                    <button
                      type="button"
                      onClick={() => equipe.retirer(p.uid)}
                      aria-label={t("setlists.equipe.retirer", { nom: p.nom })}
                      className={`${bouton} text-muted-foreground hover:text-foreground`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        profils !== null && <p className="text-sm text-muted-foreground">{t("setlists.equipe.personne")}</p>
      )}

      {equipe.peutChanger && (
        <div className="space-y-3">
          <button
            type="button"
            aria-expanded={ouvert}
            onClick={() => setOuvert((o) => !o)}
            className="flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("setlists.equipe.ajouter")}
          </button>
          {ouvert && (
            <div className="space-y-2 rounded-2xl border border-border p-3">
              <input
                type="search"
                value={requete}
                onChange={(e) => setRequete(e.target.value)}
                placeholder={t("setlists.equipe.recherche")}
                aria-label={t("setlists.equipe.recherche")}
                className="h-10 w-full rounded-full border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              {equipe.categorie && groupe.length > 0 && (
                <div>
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("setlists.equipe.duService", { categorie: t("categories." + equipe.categorie, { defaultValue: equipe.categorie }) })}
                  </p>
                  <ul>{groupe.map(choix)}</ul>
                </div>
              )}
              {!tous && (
                <button
                  type="button"
                  onClick={() => setTous(true)}
                  className="px-3 py-2 text-sm font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {t("setlists.equipe.tous")}
                </button>
              )}
              {tous && (comptes.length > 0 ? <ul>{comptes.map(choix)}</ul> : <p className="px-3 text-sm text-muted-foreground">{t("setlists.equipe.aucunResultat")}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
