"use client";

// Lot AO-B (docs/spec-acces-organigramme.md, C1, D1 à D4, E1, B3, F2) : les écrans de l'organigramme pour
// Louange (trois sous-équipes) et Régie. La carte (colonnes, lignes grises), la ligne de membre du panneau
// d'édition (pastilles à bascule) et l'encadré « Ce que ça lui ouvre », calculé par `ceQueCaOuvre`.

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ceQueCaOuvre, type ProfilOrganigramme } from "@/lib/acces/organigramme";
import {
  COLONNE_LIEU, colonnesLouange, joueDe, lieuxDe, profilSimule, referentSousDe, sousEquipesDe, type EquipeALieux,
} from "@/lib/equipes/louange";
import { INSTRUMENTS, SOUS_EQUIPES, type MembreEquipe, type SousEquipe } from "@/types/equipe";
import { SERVICE_LIEUX, type ServiceLieu } from "@/types/user";
import { cn } from "@/lib/utils";

export const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const bascule = <T,>(liste: readonly T[] | undefined, v: T): T[] => ((liste ?? []).includes(v) ? (liste ?? []).filter((x) => x !== v) : [...(liste ?? []), v]);

const nomLieu = (t: TFunction, l: ServiceLieu) => t(`equipes.colonne.${COLONNE_LIEU[l]}`);

/** Ligne grise sous un nom : pour les Musiciens, les instruments puis les lieux ; ailleurs, les lieux. */
export function ligneGrise(t: TFunction, m: MembreEquipe, avecInstruments: boolean): string {
  const instruments = avecInstruments ? joueDe(m).map((i) => majuscule(t(`acces.instrument.${i}`))) : [];
  return [...instruments, ...lieuxDe(m).map((l) => nomLieu(t, l))].join(" · ");
}

/** « Présidence, référent·e · Franco · Interfranco » : la ligne de résumé d'un membre replié. */
export function resume(t: TFunction, equipe: EquipeALieux, m: MembreEquipe): string {
  const parts: string[] = [];
  if (equipe === "louange") {
    if (m.referent) parts.push(t("equipes.organigramme.referentLouange"));
    const refs = referentSousDe(m);
    const sous = sousEquipesDe(m).map((s) => t(`acces.sousEquipe.${s}`) + (refs.includes(s) ? `, ${t("equipes.organigramme.referentSous").toLowerCase()}` : ""));
    if (sous.length) parts.push(sous.join(" / "));
    parts.push(...joueDe(m).map((i) => majuscule(t(`acces.instrument.${i}`))));
  } else if (m.referent) parts.push(t("equipes.referent"));
  parts.push(...lieuxDe(m).map((l) => nomLieu(t, l)));
  return parts.join(" · ");
}

// ── Encadré « Ce que ça lui ouvre » ─────────────────────────────────────────

/** `nu` (fiche de Personnes, bo-equipes-8) : posé dans une carte qui est déjà la sienne, sans pastille grise ; le titre y est un
 *  titre de carte ordinaire (pas de capitales) et `note` se pose à sa droite. */
export function CeQueCaOuvre({
  profil, sansCompte = false, nu = false, note,
}: { profil: ProfilOrganigramme | null | undefined; sansCompte?: boolean; nu?: boolean; note?: ReactNode }) {
  const { t } = useTranslation();
  const acces = sansCompte ? [] : ceQueCaOuvre(profil, (c) => t(c));
  return (
    <div data-testid="ce-que-ca-ouvre" className={nu ? "space-y-2" : "space-y-1.5 rounded-xl bg-secondary/70 p-3"}>
      {nu ? (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold leading-[21px] text-foreground">{t("equipes.organigramme.ceQueCaOuvre")}</h3>
          {note}
        </div>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("equipes.organigramme.ceQueCaOuvre")}</p>
      )}
      {sansCompte ? (
        <p className="text-sm text-muted-foreground">{t("equipes.organigramme.sansCompte")}</p>
      ) : acces.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("equipes.organigramme.rienDePlus")}</p>
      ) : (
        <ul className="space-y-1">
          {acces.map((a, i) => (
            <li key={`${a.cle}-${i}`} className="text-sm leading-snug text-foreground">
              {t(a.cle, a.params)}
              <span className="text-muted-foreground"> — {t(a.pourquoi, a.params)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── La carte TEAM LOUANGE : référents, puis trois colonnes ──────────────────

export function CorpsLouange({
  membres, ligne,
}: {
  membres: MembreEquipe[];
  /** Une ligne de membre : le nom (cliquable), son éventuel « — Référent·e », sa ligne grise. */
  ligne: (m: MembreEquipe, opts: { referent: string | null; detail: string }) => ReactNode;
}) {
  const { t } = useTranslation();
  const { parSous, sans, referents } = colonnesLouange(membres);
  const colonne = (id: string, titre: string, liste: MembreEquipe[], sous: SousEquipe | null) => (
    <div key={id} data-testid={`louange-${id}`} className="break-inside-avoid space-y-0.5">
      <p className="break-words hyphens-auto text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titre}</p>
      {liste.map((m, i) => (
        <div key={`${m.uid || m.nom}-${i}`}>
          {ligne(m, {
            referent: sous && referentSousDe(m).includes(sous) ? t("equipes.organigramme.referentSous") : null,
            detail: ligneGrise(t, m, sous === "musiciens"),
          })}
        </div>
      ))}
    </div>
  );
  return (
    <div className="space-y-3">
      {referents.length > 0 && (
        <div data-testid="louange-referents" className="space-y-0.5">
          {referents.map((m, i) => (
            <div key={`${m.uid || m.nom}-${i}`}>{ligne(m, { referent: t("equipes.organigramme.referentLouange"), detail: "" })}</div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
        {SOUS_EQUIPES.map((s) => colonne(s, t(`acces.sousEquipe.${s}`), parSous[s], s))}
        {sans.length > 0 && <div className="sm:col-span-3">{colonne("sans", t("equipes.organigramme.sansSousEquipe"), sans, null)}</div>}
      </div>
    </div>
  );
}

// ── Pastilles à bascule ─────────────────────────────────────────────────────

export function Pastille({ actif, disabled, onClick, children }: { actif: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        actif ? "border-foreground/30 bg-secondary text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {actif && <span aria-hidden className="mr-1">✓</span>}
      {children}
    </button>
  );
}

export function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={titre} className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{titre}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** Lot RS (docs/spec-responsabilites.md) : « Référent » ne se coche plus dans l'organigramme, il se lit ici ; les
 *  référents se changent sur la page Équipes › Responsabilités (lien pour les admins). Rien si la personne n'est pas
 *  référente et que le lien n'est pas offert. */
export function MentionReferent({ m, louange, gerer }: { m: MembreEquipe; louange: boolean; gerer: boolean }) {
  const { t } = useTranslation();
  const mentions = louange
    ? [
        ...(m.referent ? [t("responsabilites.referentEquipe", { equipe: t("equipes.public.louange") })] : []),
        ...referentSousDe(m).map((s) => t("responsabilites.referentSous", { sous: t(`acces.sousEquipe.${s}`) })),
      ]
    : m.referent ? [t("equipes.referent")] : [];
  if (mentions.length === 0 && !gerer) return null;
  return (
    <div data-testid="mention-referent" className="space-y-1">
      {mentions.length > 0 && <p className="text-sm font-semibold text-foreground">{mentions.join(" · ")}</p>}
      {gerer && (
        <Link href="/back-office/equipes/responsabilites" className="block text-sm font-semibold text-foreground underline underline-offset-2">
          {t("responsabilites.gerer")}
        </Link>
      )}
    </div>
  );
}

type DroitsMembre = {
  /** Tient toute l'équipe (Orga, admin, référent de l'équipe) : mention, essai, retrait. */
  equipe: boolean;
  /** Tient cette sous-équipe de Louange. */
  sous: (s: SousEquipe) => boolean;
  /** Change les référents (Orga, référent Louange, admin). */
  referents: boolean;
};

/** La ligne d'un membre dans la feuille d'équipe (T7) : repliée, UN bouton de 52 px (nom, « en essai », chevron, résumé
 *  sur une ligne) ; dépliée, ses réglages (`children`) puis « Retirer » ; retirée, pâlie, avec « Remettre ». */
export function LigneMembreEdition({
  m, resumeTexte, ouvert, ouvrable, retire, libelleRetirer, onBascule, onRetirer, onRemettre, children,
}: {
  m: MembreEquipe;
  resumeTexte: string;
  ouvert: boolean;
  ouvrable: boolean;
  /** Marqué retiré (brouillon) : pâli, non ouvrable, « Remettre » à droite. */
  retire: boolean;
  libelleRetirer: string;
  onBascule: () => void;
  onRetirer: () => void;
  onRemettre: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const interactive = ouvrable && !retire;
  // Après « Remettre », le focus revient sur la ligne (le bouton « Remettre » disparaît).
  const ligne = useRef<HTMLButtonElement>(null);
  const etaitRetire = useRef(retire);
  useEffect(() => {
    if (etaitRetire.current && !retire) ligne.current?.focus();
    etaitRetire.current = retire;
  }, [retire]);
  const contenu = (
    <>
      <span className="flex items-center gap-1.5 text-sm font-semibold leading-5 text-foreground">
        <span className="truncate">{m.nom}</span>
        {m.essai && <span className="shrink-0 rounded-full bg-secondary px-1.5 text-[11px] font-medium leading-4 text-muted-foreground">{t("equipes.essai")}</span>}
        {interactive && (ouvert ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />)}
      </span>
      {resumeTexte && <span className="block truncate text-xs leading-4 text-muted-foreground">{resumeTexte}</span>}
    </>
  );
  const forme = "flex min-h-[50px] w-full min-w-0 flex-col justify-center px-2 py-1 text-left";
  return (
    <div className="rounded-lg border border-border" data-testid={`membre-${m.uid || m.nom}`}>
      <div className="flex items-center gap-2">
        <div className={cn("min-w-0 flex-1 transition-opacity duration-200 motion-reduce:duration-150", retire && "opacity-55")}>
          {interactive ? (
            <button ref={ligne} type="button" onClick={onBascule} aria-expanded={ouvert} className={forme}>{contenu}</button>
          ) : (
            <div className={forme}>
              {contenu}
              {retire && <span className="sr-only">{t("equipes.retireALEnregistrement", { nom: m.nom })}</span>}
            </div>
          )}
        </div>
        {retire && (
          // Dessin de 32 px, zone de toucher de 44 px (pseudo-élément) ; focus ici : sinon il se perd avec le bouton « Retirer ».
          <button
            type="button"
            autoFocus
            aria-label={t("equipes.remettreNom", { nom: m.nom })}
            onClick={onRemettre}
            className="relative mr-2 h-8 shrink-0 rounded-full border border-border bg-background px-3.5 text-sm font-semibold text-foreground before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']"
          >
            {t("equipes.remettre")}
          </button>
        )}
      </div>
      {interactive && ouvert && (
        <div className="deplie-membre">
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-3 px-2 pb-1 pt-1">
              {children}
              <button type="button" onClick={onRetirer} className="flex h-11 items-center text-sm font-semibold text-destructive">
                {libelleRetirer}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Un membre de Louange ou de Régie dans le panneau d'édition : replié, sa ligne de résumé ; ouvert, la mention,
 *  « en essai » et les pastilles. `ouvrable` : le droit d'ouvrir (un référent de sous-équipe n'ouvre que les siens). */
export function MembreOrganigramme({
  equipe, m, profil, ouvert, ouvrable, onBascule, droits, gerer = false, onChange, onRetirer, retire, sousSeulement, onRemettre,
}: {
  equipe: EquipeALieux;
  m: MembreEquipe;
  profil: ProfilOrganigramme | null | undefined;
  ouvert: boolean;
  ouvrable: boolean;
  onBascule: () => void;
  droits: DroitsMembre;
  /** Lot RS : lien « Gérer les responsabilités » (admins). */
  gerer?: boolean;
  onChange: (champ: Partial<MembreEquipe>) => void;
  onRetirer: () => void;
  retire: boolean;
  /** Qui modifie est référent de sous-équipe sans droit sur toute l'équipe : « Retirer de ma sous-équipe ». */
  sousSeulement: boolean;
  onRemettre: () => void;
}) {
  const { t } = useTranslation();
  const louange = equipe === "louange";
  const sous = sousEquipesDe(m);
  const refSous = referentSousDe(m);
  const lignes = resume(t, equipe, m);

  const changeSous = (s: SousEquipe) => {
    const prochaines = bascule(m.sousEquipes, s);
    // Sortir d'une sous-équipe en retire aussi la référence ; « Ce qu'il joue » reste en mémoire.
    onChange({ sousEquipes: prochaines, ...(prochaines.includes(s) ? {} : { referentSous: refSous.filter((x) => x !== s) }) });
  };

  return (
    <LigneMembreEdition
      m={m} resumeTexte={lignes} ouvert={ouvert} ouvrable={ouvrable} retire={retire}
      libelleRetirer={t(sousSeulement ? "equipes.retirerDeMaSousEquipe" : "equipes.retirerDeLEquipe")}
      onBascule={onBascule} onRetirer={onRetirer} onRemettre={onRemettre}
    >
      {droits.equipe && (
        <>
          <Input value={m.mention} placeholder={t("equipes.mention")} onChange={(e) => onChange({ mention: e.target.value })} className="h-11" />
          <Pastille actif={m.essai} onClick={() => onChange({ essai: !m.essai })}>{t("equipes.essai")}</Pastille>
        </>
      )}

      {louange && (
        <>
          <Groupe titre={t("equipes.organigramme.sousEquipes")}>
            {SOUS_EQUIPES.map((s) => (
              <Pastille key={s} actif={sous.includes(s)} disabled={!droits.sous(s)} onClick={() => changeSous(s)}>
                {t(`acces.sousEquipe.${s}`)}
              </Pastille>
            ))}
          </Groupe>
          <MentionReferent m={m} louange gerer={gerer} />
        </>
      )}
      {!louange && <MentionReferent m={m} louange={false} gerer={gerer} />}

      <Groupe titre={t("equipes.organigramme.ouIlSert")}>
        {SERVICE_LIEUX.map((l) => (
          <Pastille key={l} actif={lieuxDe(m).includes(l)} onClick={() => onChange({ lieux: bascule(m.lieux, l) })}>
            {nomLieu(t, l)}
          </Pastille>
        ))}
      </Groupe>
      {louange && sous.includes("musiciens") && (
        <Groupe titre={t("equipes.organigramme.ceQuIlJoue")}>
          {INSTRUMENTS.map((i) => (
            <Pastille key={i} actif={(m.joue ?? []).includes(i)} onClick={() => onChange({ joue: bascule(m.joue, i) })}>
              {majuscule(t(`acces.instrument.${i}`))}
            </Pastille>
          ))}
        </Groupe>
      )}

      <CeQueCaOuvre profil={profilSimule(equipe, m, profil)} sansCompte={!m.uid} />
    </LigneMembreEdition>
  );
}
