"use client";

// Lot AO-B (docs/spec-acces-organigramme.md, C1, D1 à D4, E1, B3, F2) : les écrans de l'organigramme pour
// Louange (trois sous-équipes) et Régie. La carte (colonnes, lignes grises), la ligne de membre du panneau
// d'édition (pastilles à bascule) et l'encadré « Ce que ça lui ouvre », calculé par `ceQueCaOuvre`.

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ceQueCaOuvre, type ProfilOrganigramme } from "@/lib/acces/organigramme";
import {
  COLONNE_LIEU, colonnesLouange, joueDe, lieuxDe, profilSimule, referentSousDe, sousEquipesDe, type EquipeALieux,
} from "@/lib/equipes/louange";
import { INSTRUMENTS, SOUS_EQUIPES, type MembreEquipe, type SousEquipe } from "@/types/equipe";
import { SERVICE_LIEUX, type ServiceLieu } from "@/types/user";

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

export function CeQueCaOuvre({ profil, sansCompte = false }: { profil: ProfilOrganigramme | null | undefined; sansCompte?: boolean }) {
  const { t } = useTranslation();
  const acces = sansCompte ? [] : ceQueCaOuvre(profil, (c) => t(c));
  return (
    <div data-testid="ce-que-ca-ouvre" className="space-y-1.5 rounded-xl bg-secondary/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("equipes.organigramme.ceQueCaOuvre")}</p>
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
      <p className="break-words hyphens-auto text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{titre}</p>
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

export type DroitsMembre = {
  /** Tient toute l'équipe (Orga, admin, référent de l'équipe) : mention, essai, retrait. */
  equipe: boolean;
  /** Tient cette sous-équipe de Louange. */
  sous: (s: SousEquipe) => boolean;
  /** Change les référents (Orga, référent Louange, admin). */
  referents: boolean;
};

/** Un membre de Louange ou de Régie dans le panneau d'édition : replié, sa ligne de résumé ; ouvert, la mention,
 *  « en essai » et les pastilles. `ouvrable` : le droit d'ouvrir (un référent de sous-équipe n'ouvre que les siens). */
export function MembreOrganigramme({
  equipe, m, profil, ouvert, ouvrable, onBascule, droits, gerer = false, onChange, onRetirer,
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
    <div className="space-y-1.5 rounded-lg border border-border p-2" data-testid={`membre-${m.uid || m.nom}`}>
      <div className="flex items-start justify-between gap-2">
        {ouvrable ? (
          <button type="button" onClick={onBascule} aria-expanded={ouvert} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              {m.nom}
              {ouvert ? <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden /> : <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />}
            </span>
            {lignes && <span className="block text-xs text-muted-foreground">{lignes}</span>}
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{m.nom}</p>
            {lignes && <p className="text-xs text-muted-foreground">{lignes}</p>}
          </div>
        )}
        {ouvrable && (
          <button
            type="button"
            aria-label={t("equipes.retirer", { nom: m.nom })}
            onClick={onRetirer}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {ouvrable && ouvert && (
        <div className="space-y-3 pt-1">
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
        </div>
      )}
    </div>
  );
}
