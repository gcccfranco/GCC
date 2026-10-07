"use client";

// Back-Office › Messages › Réception en grand (lot U4 bis, B7 ; docs/spec-pages-en-grand.md, Q15 ;
// planches `bo-reception-*`). En grand (deux volets, U5 Q1) : la liste à gauche avec les filtres
// « Tout · Signalements · Propositions », le message choisi à droite ; sans choix, le premier en
// attente de la liste filtrée (Q3). Tablette portrait : les deux cartes côte à côte, un message se
// déplie dans sa carte. Téléphone : les filtres, une carte, le message qui se déplie. Données et
// actions : `useReception` (mêmes lectures et écritures que l'ancien bloc).
// Agencement v18 (B10 de docs/spec-agencement-v18.md ; planche `v18-bo-messages-reception`) : en
// grand, `DeuxVolets` (la liste en carte) sous l'en-tête commun de Messages ; « Supprimer » passe
// dans « ⋯ » (confirmé dans le site) ; sous le message, « Le chant signalé » (titre, tonalité,
// sections, lus dans l'index) et « Du même membre » (lus dans la liste déjà chargée).
import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronRight, ChevronUp, ExternalLink, FileText, Link2, Music, Play, Trash2 } from "lucide-react";
import { MenuActions } from "@/components/layout/MenuActions";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { useSongsIndex } from "@/hooks/useSongsIndex";
import type { Report } from "@/types/report";
import type { SongProposal } from "@/types/songProposal";
import { useReception } from "@/components/admin/Reception";
import { Pilules } from "@/components/layout/Onglets";
import { useDisposition } from "@/hooks/useDisposition";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Filtre = "tout" | "signalements" | "propositions";
/** Un message de la Réception : un signalement ou une proposition de chant. */
type Message = { cle: string; r: Report; p?: never } | { cle: string; p: SongProposal; r?: never };

const signalement = (r: Report): Message => ({ cle: `s:${r.id}`, r });
const proposition = (p: SongProposal): Message => ({ cle: `p:${p.id}`, p });
const enAttente = (m: Message) => (m.r ?? m.p).status === "pending";

const BOUTON = "inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-sm font-semibold text-foreground ring-1 ring-inset ring-border transition-transform duration-150 active:scale-[.97] disabled:opacity-50";

export function ReceptionVolets() {
  const { t, i18n } = useTranslation();
  const disposition = useDisposition();
  const rec = useReception();
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [choix, setChoix] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [traitesVus, setTraitesVus] = useState({ s: false, p: false });
  // L'index des chants, pour « Le chant signalé » (en grand seulement).
  const { songs } = useSongsIndex(disposition === "grand");

  // Tablette portrait : les deux cartes, sans filtres.
  const voirS = disposition === "tablette" || filtre !== "propositions";
  const voirP = disposition === "tablette" || filtre !== "signalements";
  const signalements = rec.reports.map(signalement);
  const propositions = rec.proposals.map(proposition);
  const tous = [...(voirS ? signalements : []), ...(voirP ? propositions : [])];
  const choisi = tous.find((m) => m.cle === choix) ?? tous.find(enAttente) ?? null;

  const date = (d: Date | null) => (d ? ` · ${d.toLocaleDateString(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR")}` : "");
  const auteur = (m: Message) => (m.r ? m.r.authorName : t("backOffice.reception.proposePar", { nom: m.p.authorName })) + date((m.r ?? m.p).createdAt);

  function badges(m: Message, inverse?: boolean) {
    const statut = (m.r ?? m.p).status;
    return (
      <>
        {m.r && <Etiquette couleur={m.r.kind === "song" ? "#2563eb" : "#9333ea"} plein={inverse}>{t(`backOffice.reception.${m.r.kind === "song" ? "chant" : "site"}`)}</Etiquette>}
        {(statut === "resolved" || statut === "accepted") && <Etiquette couleur="#16a34a" plein={inverse}>{t("backOffice.reception.traite")}</Etiquette>}
        {statut === "rejected" && <Etiquette couleur="#dc2626" plein={inverse}>{t("backOffice.reception.refuse")}</Etiquette>}
      </>
    );
  }

  /** Description, liens et actions d'un message ; en grand, agir garde ce message choisi (sinon
   *  le volet passerait au suivant en attente). */
  function corps(m: Message, grand?: boolean) {
    const occupe = m.r ? rec.reportBusy === m.r.id : rec.proposalBusy === m.p.id;
    const garder = () => grand && setChoix(m.cle);
    const lien = "inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-2";
    const liens: ReactNode[] = m.r
      ? [
          m.r.kind === "song" && m.r.songSlug && (
            <Link key="chant" href={`/songs/${m.r.songSlug}`} className={lien}>
              <Music className="h-3.5 w-3.5" aria-hidden />{m.r.songTitle || t("backOffice.reception.voirChant")}
            </Link>
          ),
          m.r.pageUrl && (
            <a key="page" href={m.r.pageUrl} target="_blank" rel="noopener noreferrer" className={lien}>
              <Link2 className="h-3.5 w-3.5" aria-hidden />{t("backOffice.reception.page")}
            </a>
          ),
        ]
      : [
          <a key="yt" href={m.p.youtubeUrl} target="_blank" rel="noopener noreferrer" className={lien}>
            <Play className="h-3.5 w-3.5" aria-hidden />YouTube<ExternalLink className="h-3 w-3" aria-hidden />
          </a>,
          m.p.pdfUrl && (
            <a key="pdf" href={m.p.pdfUrl} target="_blank" rel="noopener noreferrer" className={lien}>
              <FileText className="h-3.5 w-3.5" aria-hidden />{t("backOffice.reception.partition")}<ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ),
        ];
    const texte = m.r?.description;
    const contenu = (
      <>
        {texte && <p className={cn("whitespace-pre-wrap text-foreground", grand ? "text-[15px] leading-[23px]" : "text-sm leading-[21px]")}>{texte}</p>}
        {liens.some(Boolean) && <div className={cn("flex flex-wrap gap-x-4 gap-y-2", texte && "mt-3")}>{liens}</div>}
      </>
    );
    const statut = (m.r ?? m.p).status;
    const actions = (
      <div className="flex flex-wrap items-center gap-2">
        {statut === "pending" || (m.p && statut === "rejected") ? (
          <button type="button" disabled={occupe} className={BOUTON}
            onClick={() => { garder(); if (m.r) rec.handleReportStatus(m.r, "resolved"); else rec.handleProposalStatus(m.p, "accepted"); }}>
            <Check className="h-4 w-4" aria-hidden />{t("backOffice.reception.marquerTraite")}
          </button>
        ) : (
          m.r && (
            <button type="button" disabled={occupe} className={BOUTON} onClick={() => { garder(); rec.handleReportStatus(m.r, "pending"); }}>
              {t("backOffice.reception.rouvrir")}
            </button>
          )
        )}
        {m.p && statut === "pending" && (
          <button type="button" disabled={occupe} className={BOUTON} onClick={() => { garder(); rec.handleProposalStatus(m.p, "rejected"); }}>
            {t("backOffice.reception.refuser")}
          </button>
        )}
        <MenuActions
          actions={[{
            label: t("common.buttons.delete"),
            icone: Trash2,
            destructif: true,
            onSelect: () => (m.r ? rec.handleReportDelete(m.r) : rec.handleProposalDelete(m.p)),
            confirmer: {
              titre: `${t(m.r ? "backOffice.reception.supprimerSignalement" : "backOffice.reception.supprimerProposition")} ?`,
              texte: (m.r ?? m.p).title,
              action: t("common.buttons.delete"),
            },
          }]}
        />
      </div>
    );
    if (grand)
      return (
        <>
          {(texte || liens.some(Boolean)) && <div className="raised rounded-2xl px-5 py-[18px]">{contenu}</div>}
          <div className="mt-4">{actions}</div>
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-4">
            {chantSignale(m)}
            {memeMembre(m)}
          </div>
        </>
      );
    return (
      <div className="space-y-3 pb-3">
        {contenu}
        {actions}
      </div>
    );
  }

  /** « Le chant signalé » : titre, tonalité et sections lus dans l'index, lien vers la partition. */
  function chantSignale(m: Message) {
    if (!m.r || m.r.kind !== "song" || !m.r.songSlug) return null;
    const chant = songs?.find((c) => c.slug === m.r!.songSlug);
    const id = `chant-${m.r.id}`;
    return (
      <section aria-labelledby={id} className="raised rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h3 id={id} className="text-[15px] font-bold text-foreground">{t("backOffice.reception.chantSignale")}</h3>
          <Link href={`/songs/${m.r.songSlug}`} className={BOUTON}>
            <FileText className="h-4 w-4" aria-hidden />{t("backOffice.reception.ouvrirPartition")}
          </Link>
        </div>
        <p className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm">
          <Music className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-semibold text-foreground">{chant?.title ?? m.r.songTitle}</span>
          {chant && (
            <span className="text-muted-foreground">
              · {t("backOffice.reception.tonalite", { cle: chant.recommendedKey ?? chant.originalKey })}
              {chant.sections?.length ? ` · ${t("backOffice.reception.sections", { count: chant.sections.length })}` : ""}
            </span>
          )}
        </p>
      </section>
    );
  }

  /** « Du même membre » : ses autres signalements et propositions, déjà chargés. */
  function memeMembre(m: Message) {
    const auteurId = (m.r ?? m.p).authorId;
    if (!auteurId) return null;
    const autres = [...signalements, ...propositions].filter((x) => x.cle !== m.cle && (x.r ?? x.p).authorId === auteurId);
    if (autres.length === 0) return null;
    const id = `meme-${m.cle}`;
    const statut = (x: Message) => {
      const st = (x.r ?? x.p).status;
      return t(st === "pending" ? "backOffice.reception.enAttenteCourt" : st === "rejected" ? "backOffice.reception.refuseCourt" : "backOffice.reception.traiteCourt");
    };
    return (
      <section aria-labelledby={id} className="raised rounded-2xl px-5 py-4">
        <h3 id={id} className="text-[15px] font-bold text-foreground">{t("backOffice.reception.memeMembre")}</h3>
        <ul className="mt-2">
          {autres.map((x) => (
            <li key={x.cle} className="border-t border-border first:border-t-0">
              <button type="button" onClick={() => { setFiltre("tout"); setChoix(x.cle); }} className="block w-full py-2 text-left">
                <span className="block text-sm font-semibold text-foreground hover:underline">
                  {x.r ? x.r.title : t("backOffice.reception.proposition", { titre: x.p.title })}
                </span>
                <span className="block text-[12px] text-muted-foreground">{statut(x)}{date((x.r ?? x.p).createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  function ligne(m: Message) {
    const titre = (m.r ?? m.p).title;
    const traite = !enAttente(m);
    if (disposition === "grand") {
      const actif = choisi?.cle === m.cle;
      return (
        <button type="button" aria-current={actif ? "true" : undefined} onClick={() => setChoix(m.cle)}
          className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150",
            actif ? "bg-foreground text-background" : "hover:bg-secondary", traite && !actif && "opacity-60")}>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{titre}</span>
            <span className={cn("block truncate text-[13px]", actif ? "text-background/75" : "text-muted-foreground")}>{auteur(m)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">{badges(m, actif)}</span>
          <ChevronRight className={cn("h-4 w-4 shrink-0", actif ? "text-background" : "text-muted-foreground/60")} aria-hidden />
        </button>
      );
    }
    const deplie = ouvert === m.cle;
    return (
      <div className={cn("border-t border-border", traite && !deplie && "opacity-60")}>
        <button type="button" aria-expanded={deplie} onClick={() => setOuvert(deplie ? null : m.cle)}
          className="flex w-full items-center gap-2.5 py-2.5 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold text-foreground">{titre}</span>
            <span className="block truncate text-[13px] text-muted-foreground">{auteur(m)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">{badges(m)}</span>
          {deplie ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        </button>
        {deplie && corps(m)}
      </div>
    );
  }

  function section(type: "s" | "p") {
    const messages = type === "s" ? signalements : propositions;
    const chargement = type === "s" ? rec.loadingReports : rec.loadingProposals;
    const attente = messages.filter(enAttente);
    const vus = traitesVus[type] ? messages : attente;
    const traites = messages.length - attente.length;
    const id = `reception-${type}`;
    const grand = disposition === "grand";
    return (
      <section aria-labelledby={id} className={cn(disposition === "tablette" && "raised min-w-0 rounded-2xl px-[18px] py-3.5")}>
        <div className={cn("flex items-center gap-2", grand ? "px-2.5 pb-1 pt-3" : "pb-1")}>
          <h2 id={id} className={grand ? "text-[13px] font-semibold text-muted-foreground" : "text-[15px] font-bold text-foreground"}>
            {t(type === "s" ? "backOffice.reception.titreSignalements" : "backOffice.reception.titrePropositions")}
          </h2>
          {attente.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              {t("backOffice.reception.enAttente", { n: attente.length })}
            </span>
          )}
        </div>
        {disposition === "tablette" && (
          <p className="mb-2 text-[13px] text-muted-foreground">{t(type === "s" ? "backOffice.reception.aideSignalements" : "backOffice.reception.aidePropositions")}</p>
        )}
        {chargement ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : messages.length === 0 ? (
          <p className={cn("py-3 text-sm text-muted-foreground", grand ? "px-2.5" : "border-t border-border")}>
            {t(type === "s" ? "backOffice.reception.aucunSignalement" : "backOffice.reception.aucuneProposition")}
          </p>
        ) : (
          <>
            <div className={grand ? "space-y-0.5" : undefined}>{vus.map((m) => <Fragment key={m.cle}>{ligne(m)}</Fragment>)}</div>
            {traites > 0 && (
              <button type="button" onClick={() => setTraitesVus((v) => ({ ...v, [type]: !v[type] }))}
                className={cn("block w-full border-t border-border py-2.5 text-left text-[13px] font-semibold text-muted-foreground hover:text-foreground", grand && "px-2.5")}>
                {traitesVus[type] ? t("backOffice.reception.masquerTraites") : t("backOffice.reception.voirTraites", { n: traites })}
              </button>
            )}
          </>
        )}
      </section>
    );
  }

  const erreur = rec.error && (
    <Alert variant="destructive" className="mb-4"><AlertDescription>{t("backOffice.reception.erreur")}</AlertDescription></Alert>
  );
  const pilules = (
    <Pilules<Filtre>
      etiquette={t("backOffice.reception.filtres")}
      options={(["tout", "signalements", "propositions"] as const).map((cle) => ({ cle, nom: t(`backOffice.reception.${cle}`) }))}
      valeur={filtre}
      choisir={(v) => v && setFiltre(v)}
      obligatoire
    />
  );
  const sections = (
    <>
      {voirS && section("s")}
      {voirP && section("p")}
    </>
  );

  function detail(m: Message) {
    return (
      <div>
        <div className="flex gap-1.5">{badges(m)}</div>
        <h2 className="mt-2 text-[24px] font-bold leading-[30px] tracking-tight text-foreground text-balance">{(m.r ?? m.p).title}</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">{auteur(m)}</p>
        {corps(m, true)}
      </div>
    );
  }

  if (disposition === "grand")
    return (
      <DeuxVolets
        racine="/back-office/messages"
        largeurListe={380}
        liste={
          <div className="px-2.5 pb-4 pt-3">
            <div className="px-2.5 pb-1">{pilules}</div>
            {sections}
          </div>
        }
        premier={
          <section aria-label={t("backOffice.reception.message")} className="min-w-0">
            {erreur}
            {choisi ? detail(choisi) : <p className="text-sm text-muted-foreground">{t("backOffice.reception.aucunEnAttente")}</p>}
          </section>
        }
      >
        {null}
      </DeuxVolets>
    );

  return (
    <div className="px-[var(--marge-page)] pb-10">
      {erreur}
      {disposition === "tablette" ? (
        <div className="grid grid-cols-2 items-start gap-3.5">{sections}</div>
      ) : (
        <>
          <div className="mb-3">{pilules}</div>
          <div className="raised space-y-4 rounded-2xl px-4 py-3">{sections}</div>
        </>
      )}
    </div>
  );
}

function Etiquette({ couleur, plein, children }: { couleur: string; plein?: boolean; children: ReactNode }) {
  return (
    <span className="rounded-full px-1.5 py-px text-[11px] font-bold"
      style={{ color: couleur, background: plein ? "#fff" : `${couleur}17`, boxShadow: `inset 0 0 0 1px ${couleur}4d` }}>
      {children}
    </span>
  );
}
