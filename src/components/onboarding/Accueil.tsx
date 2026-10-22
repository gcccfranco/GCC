"use client";

// Visite de première connexion (lot 8, docs/spec-nouveaux-membres.md ; visite par rôle,
// docs/spec-visite-par-role.md) : Bienvenue, Où trouver quoi, au plus trois cartes tirées du profil
// (`cartesDeLaVisite`), Notifications si à proposer, C'est parti — sept écrans au plus. Vue une fois par
// compte (onboarding/{uid}, avec sa version), remontrée aux comptes du lot 8 quand le back-office est
// ouvert, jamais sans compte. Plein écran sur téléphone, fenêtre centrée sur tablette et ordinateur.
// « Passer » partout ; on avance avec « Suivant » ou d'un glissé. Le mode « revoir » (VR-C) n'écrit rien.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BACK_OFFICE } from "@/lib/backOffice";
import Image from "next/image";
import Link from "next/link";
import { Trans, useTranslation } from "react-i18next";
import {
  BellRing, BookOpen, Bookmark, CalendarDays, GraduationCap, KeyRound, Languages, LayoutDashboard, ListChecks, ListMusic,
  MessageSquare, MonitorPlay, Music, Network, Presentation, Search, ShieldCheck, SlidersHorizontal, Ticket, UserRound, Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { entreesBackOffice } from "@/lib/access";
import { cleNomEquipe } from "@/lib/equipes/table";
import { getAccueilVu, setAccueilVu, VERSION_VISITE } from "@/lib/firebase/onboarding";
import { useProfile } from "@/lib/firebase/users";
import { cartesDeLaVisite, type Carte, type Ligne } from "@/lib/onboarding/visite";
import { isIOS, isPushSupported, isStandalone, isSubscribed, subscribeToPush } from "@/lib/push/client";
import { categoryLabel } from "@/lib/serviceColors";
import type { ServiceRole } from "@/types/user";

type Notifs = "proposer" | "iphone" | "masquer";
/** « premiere » : compte neuf ; « retour » : compte qui avait vu l'accueil du lot 8 ; « revoir » : à la demande, sans écriture. */
type Mode = "premiere" | "retour" | "revoir";

// Back-office coupé (lot 18) : l'accueil ne présente pas une section qui n'est pas en ligne.
const ONGLETS: { key: string; texte: string; Icon: LucideIcon }[] = [
  { key: "common.header.songs", texte: "accueil.ou.chants", Icon: Music },
  { key: "common.header.setlists", texte: "accueil.ou.setlists", Icon: ListMusic },
  { key: "common.header.planning", texte: "accueil.ou.planning", Icon: CalendarDays },
  { key: "common.header.evenements", texte: "accueil.ou.evenements", Icon: Ticket },
  { key: "common.header.moi", texte: "accueil.ou.moi", Icon: UserRound },
].filter((o) => BACK_OFFICE || o.key !== "common.header.evenements");

/** Les trois gestes de chaque carte, avec leur icône. */
const GESTES: Record<string, LucideIcon[]> = {
  presidence: [ListMusic, KeyRound, BellRing],
  musicien: [MonitorPlay, SlidersHorizontal, GraduationCap],
  chanteur: [MonitorPlay, Languages, Bookmark],
  regie: [ListMusic, Presentation, CalendarDays],
  equipe: [ListChecks, MessageSquare, Network],
  referent: [ListChecks, Users, Ticket],
  membre: [CalendarDays, Ticket, Search],
};
const ICONES_LIGNES: Record<Ligne["kind"], LucideIcon> = {
  coordination: ShieldCheck, groupe: Users, planning: CalendarDays, messages: BellRing, evenements: Ticket,
};
/** « Voir dans le guide » : l'ancre de /guide que vise chaque carte. */
const ANCRES: Record<string, string> = {
  presidence: "compose", musicien: "performance", chanteur: "performance", regie: "setlists",
  equipe: "taches", referent: "taches", resp: "roles", membre: "planning",
};

function Pastille({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
      <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

/** La petite pastille de texte, en tête d'un écran. */
function Etiquette({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">{children}</span>;
}

const GRAS = { b: <strong className="font-semibold text-foreground" /> };

function Geste({ Icon, children }: { Icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="pt-1 text-base leading-snug">{children}</span>
    </li>
  );
}

export function Accueil() {
  const { user, loading } = useProfile();
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<Mode>("premiere");
  const [notifs, setNotifs] = useState<Notifs>("masquer");

  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    (async () => {
      // Écriture refusée plus tôt dans la session : ne pas le rouvrir à chaque page.
      try {
        if (sessionStorage.getItem(`accueil-vu-${user.uid}`) === String(VERSION_VISITE)) return;
      } catch { /* stockage indisponible */ }
      // Jamais vue : on l'ouvre ; vue au lot 8 : seulement back-office ouvert (VR8).
      const version = await getAccueilVu(user.uid);
      if (!(version === 0 || (BACK_OFFICE && version < VERSION_VISITE))) return;
      let n: Notifs = "masquer";
      if (isIOS() && !isStandalone()) n = "iphone";
      else if (isPushSupported() && !(await isSubscribed().catch(() => true))) n = "proposer";
      if (!alive) return;
      setNotifs(n);
      setMode(version === 0 ? "premiere" : "retour");
      setOuvert(true);
    })();
    return () => {
      alive = false;
    };
  }, [loading, user]);

  if (!ouvert || !user) return null;

  async function fermer() {
    setOuvert(false);
    // Revoir la visite n'écrit rien.
    if (mode === "revoir") return;
    if (!(await setAccueilVu(user!.uid))) {
      try { sessionStorage.setItem(`accueil-vu-${user!.uid}`, String(VERSION_VISITE)); } catch { /* stockage indisponible */ }
    }
  }

  return <Ecrans mode={mode} notifs={notifs} uid={user.uid} onFermer={fermer} />;
}

function Ecrans({ mode, notifs, uid, onFermer }: {
  mode: Mode;
  notifs: Notifs;
  uid: string;
  onFermer: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const [etape, setEtape] = useState(0);
  const [push, setPush] = useState<"" | "busy" | "ok" | "erreur">("");
  const dialog = useRef<HTMLDivElement>(null);
  const toucheX = useRef<number | null>(null);

  useEffect(() => {
    dialog.current?.focus();
  }, []);

  async function activer() {
    setPush("busy");
    try {
      await subscribeToPush(uid);
      setPush("ok");
    } catch {
      setPush("erreur");
    }
  }

  const zh = i18n.language === "zh-CN";
  const sep = zh ? "、" : ", ";
  const lieu = (l: string) => (zh ? t(`categories.${l}`) : categoryLabel(l));
  const roleMin = (r: ServiceRole) => t(`accueil.role.${r}`).toLowerCase();
  const equipe = (id: string) => t(cleNomEquipe(id, true));
  const audience = (a: string) =>
    a === "*" ? t("accueil.toutLEglise")
    : a.startsWith("equipe:") ? equipe(a.slice("equipe:".length))
    : a.startsWith("louange:") ? t(`acces.sousEquipe.${a.slice("louange:".length)}`)
    : lieu(a);

  const cartes = cartesDeLaVisite(user, profile, BACK_OFFICE);
  const backOffice = BACK_OFFICE && entreesBackOffice(user, profile).length > 0;
  const prenom = profile?.firstName?.trim();

  /** Le gabarit d'une carte : pastille de texte, titre, « Tu peux » et ses gestes, filet, la ligne « c'est … », lien guide. */
  function ecranCarte(id: string, titre: string, pastille: string | null, gestes: { Icon: LucideIcon; texte: ReactNode }[], role: string | null) {
    return {
      titre,
      gauche: true,
      visuel: pastille ? <div className="w-full max-w-sm"><Etiquette>{pastille}</Etiquette></div> : null,
      corps: (
        <div className="space-y-4">
          <div className="space-y-3">
            {role !== null && <p className="text-xs font-bold text-muted-foreground">{t("accueil.tuPeux")}</p>}
            <ul className="space-y-3">
              {gestes.map(({ Icon, texte }, i) => <Geste key={i} Icon={Icon}>{texte}</Geste>)}
            </ul>
          </div>
          {role !== null && <p className="border-t border-border pt-4 text-sm">{role}</p>}
          <Link href={`/guide#${ANCRES[id]}`} onClick={onFermer} className="inline-block text-sm font-semibold text-foreground underline underline-offset-4">
            {t("accueil.voirGuide")}
          </Link>
        </div>
      ),
    };
  }

  const peut = (id: string, icones: LucideIcon[], valeurs?: Record<string, string>, cles?: string[]) =>
    icones.map((Icon, i) => ({
      Icon,
      texte: <Trans i18nKey={cles?.[i] ?? `accueil.carte.${id}.peut.${i + 1}`} values={valeurs} components={GRAS} />,
    }));

  function ecranDeLaCarte(c: Carte) {
    if (c.kind === "service") {
      const lieux = c.lieux.map(lieu).join(", ");
      const aussi = c.aussi.length > 0 ? t("accueil.aussi", { roles: c.aussi.map(roleMin).join(sep) }) : "";
      const pastille = [t(`accueil.role.${c.role}`), lieux, aussi].filter(Boolean).join(" · ");
      return ecranCarte(c.role, t(`accueil.carte.${c.role}.titre`), pastille, peut(c.role, GESTES[c.role]), t(`accueil.carte.${c.role}.role`));
    }
    if (c.kind === "equipe") {
      const noms = c.equipes.map(equipe);
      if (c.referentDe.length > 0) {
        const valeurs = { equipe: equipe(c.referentDe[0]) };
        return ecranCarte(
          "referent", t("accueil.carte.referent.titre", valeurs), [noms.join(sep), t("accueil.referent")].join(" · "),
          peut("referent", GESTES.referent), t("accueil.carte.referent.role"),
        );
      }
      const titre = c.equipes.length === 1
        ? t("accueil.carte.equipe.titre", { equipe: noms[0] })
        : t("accueil.carte.equipe.titres", { equipes: noms.join(sep) });
      return ecranCarte(
        "equipe", titre, [noms.join(sep), t("accueil.membre")].join(" · "),
        peut("equipe", GESTES.equipe), t("accueil.carte.equipe.role", { equipe: noms.join(sep) }),
      );
    }
    if (c.kind === "responsabilites") {
      const gestes = c.lignes.map((l) => {
        const valeurs: Record<string, string> =
          l.kind === "groupe" ? { groupe: lieu(l.groupe) }
          : l.kind === "planning" ? { plannings: l.plannings.map((o) => t(`planning.tabs.${o}`)).join(sep) }
          : l.kind === "messages" ? { audiences: l.audiences.map(audience).join(sep) }
          : l.kind === "evenements" ? { sections: l.sections.map(lieu).join(sep) }
          : {};
        return { Icon: ICONES_LIGNES[l.kind], texte: <Trans i18nKey={`accueil.carte.resp.${l.kind}`} values={valeurs} components={GRAS} /> };
      });
      return ecranCarte("resp", t("accueil.carte.resp.titre"), null, gestes, null);
    }
    // Membre : back-office coupé, la section Évènements est absente — le geste devient la lecture des setlists.
    const cles = [1, 2, 3].map((n) => (n === 2 && !BACK_OFFICE ? "accueil.carte.membre.peutSetlists" : `accueil.carte.membre.peut.${n}`));
    const icones = GESTES.membre.map((Icon, i) => (i === 1 && !BACK_OFFICE ? ListMusic : Icon));
    return ecranCarte("membre", t("accueil.carte.membre.titre"), null, peut("membre", icones, undefined, cles), t("accueil.carte.membre.role"));
  }

  const ecrans: { titre: string; corps: ReactNode; visuel: ReactNode; gauche?: boolean }[] = [
    {
      titre: mode === "retour" && prenom ? t("accueil.bonjour", { prenom }) : t("accueil.bienvenue.titre"),
      visuel: (
        <>
          <Image src="/logo.png" alt="" width={72} height={72} className="rounded-full" priority />
          {mode === "retour" && <Etiquette>{t("accueil.change")}</Etiquette>}
        </>
      ),
      corps: <p>{t(mode === "premiere" ? "accueil.bienvenue.texte" : "accueil.bienvenue.retour")}</p>,
    },
    {
      titre: t("accueil.ou.titre"),
      visuel: null,
      corps: (
        <ul className="space-y-3 text-left">
          {[
            ...ONGLETS,
            ...(backOffice ? [{ key: "backOffice.selecteur.backOffice", texte: "accueil.ou.backOffice", Icon: LayoutDashboard }] : []),
          ].map(({ key, texte, Icon }) => (
            <li key={key} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" strokeWidth={1.75} aria-hidden />
              <span>
                <span className="block font-semibold text-foreground">{t(key)}</span>
                <span className="block text-sm">{t(texte)}</span>
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    ...cartes.map(ecranDeLaCarte),
    ...(notifs === "masquer"
      ? []
      : [{
          titre: t("accueil.notifs.titre"),
          visuel: <Pastille Icon={BellRing} />,
          corps: (
            <div className="space-y-4">
              <p>{t("accueil.notifs.texte")}</p>
              {notifs === "iphone" ? (
                <p className="text-sm">{t("accueil.notifs.iphone")}</p>
              ) : push === "ok" ? (
                <p role="status" className="text-sm font-semibold text-foreground">{t("accueil.notifs.actives")}</p>
              ) : (
                <>
                  <Button type="button" variant="secondary" className="w-full" disabled={push === "busy"} onClick={activer}>
                    {push === "busy" ? "…" : t("accueil.notifs.activer")}
                  </Button>
                  {push === "erreur" && <p role="alert" className="text-sm">{t("accueil.notifs.erreur")}</p>}
                </>
              )}
            </div>
          ),
        }]),
    {
      titre: t("accueil.fin.titre"),
      visuel: <Pastille Icon={BookOpen} />,
      corps: (
        <div className="space-y-4">
          <p>{t("accueil.fin.texte")}</p>
          <Link href="/guide" onClick={onFermer} className="inline-block font-semibold text-foreground underline underline-offset-4">
            {t("accueil.fin.guide")}
          </Link>
        </div>
      ),
    },
  ];
  const total = ecrans.length;
  const dernier = etape === total - 1;
  const ecran = ecrans[etape];
  const aller = (i: number) => setEtape(Math.max(0, Math.min(total - 1, i)));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center md:p-6">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t("accueil.nom")}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onFermer();
          if (e.key === "ArrowRight") aller(etape + 1);
          if (e.key === "ArrowLeft") aller(etape - 1);
        }}
        onTouchStart={(e) => { toucheX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (toucheX.current === null) return;
          const dx = e.changedTouches[0].clientX - toucheX.current;
          toucheX.current = null;
          if (Math.abs(dx) > 50) aller(etape + (dx < 0 ? 1 : -1));
        }}
        className="flex h-[100dvh] w-full flex-col bg-background outline-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:h-auto md:max-h-[90dvh] md:max-w-md md:rounded-2xl md:shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="sr-only">{t("accueil.etape", { n: etape + 1, total })}</span>
          <div className="flex gap-1.5" aria-hidden>
            {ecrans.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-200 ${i === etape ? "w-5 bg-foreground" : "w-1.5 bg-muted-foreground/30"}`} />
            ))}
          </div>
          <button type="button" onClick={onFermer} className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            {t("accueil.passer")}
          </button>
        </div>

        <div key={etape} className={`flex flex-1 flex-col items-center gap-5 overflow-y-auto px-8 py-8 motion-safe:animate-[accueil-in_220ms_ease-out] md:min-h-[26rem] ${ecran.gauche ? "justify-start text-left md:justify-center" : "justify-center text-center"}`}>
          {ecran.visuel}
          <h2 className={`text-2xl font-bold leading-tight tracking-[-0.01em] text-foreground text-balance ${ecran.gauche ? "w-full max-w-sm" : ""}`}>{ecran.titre}</h2>
          <div className="w-full max-w-sm text-base leading-relaxed text-muted-foreground">{ecran.corps}</div>
        </div>

        <div className="flex items-center gap-3 px-5 pb-5">
          {etape > 0 ? (
            <Button type="button" variant="ghost" onClick={() => aller(etape - 1)}>{t("accueil.retour")}</Button>
          ) : <span />}
          <Button type="button" className="ml-auto min-w-[8rem]" onClick={() => (dernier ? onFermer() : aller(etape + 1))}>
            {dernier ? t("accueil.commencer") : t("accueil.suivant")}
          </Button>
        </div>
      </div>
    </div>
  );
}
