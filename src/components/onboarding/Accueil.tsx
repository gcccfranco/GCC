"use client";

// Accueil de première connexion (lot 8, docs/spec-nouveaux-membres.md) : cinq
// écrans au plus, vus une fois par compte (onboarding/{uid}), jamais sans
// compte. Plein écran sur téléphone, fenêtre centrée sur tablette et
// ordinateur. « Passer » partout ; on avance avec « Suivant » ou d'un glissé.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BellRing, BookOpen, CalendarDays, ListMusic, Music, Ticket, UserRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/firebase/users";
import { getAccueilVu, setAccueilVu } from "@/lib/firebase/onboarding";
import { isIOS, isPushSupported, isStandalone, isSubscribed, subscribeToPush } from "@/lib/push/client";

type Notifs = "proposer" | "iphone" | "masquer";

const ONGLETS: { key: string; texte: string; Icon: LucideIcon }[] = [
  { key: "common.header.songs", texte: "accueil.ou.chants", Icon: Music },
  { key: "common.header.setlists", texte: "accueil.ou.setlists", Icon: ListMusic },
  { key: "common.header.planning", texte: "accueil.ou.planning", Icon: CalendarDays },
  { key: "common.header.evenements", texte: "accueil.ou.evenements", Icon: Ticket },
  { key: "common.header.moi", texte: "accueil.ou.moi", Icon: UserRound },
];

function Pastille({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
      <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function Accueil() {
  const { user, profile, loading } = useProfile();
  const [ouvert, setOuvert] = useState(false);
  const [notifs, setNotifs] = useState<Notifs>("masquer");

  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    (async () => {
      // Écriture refusée plus tôt dans la session : ne pas le rouvrir à chaque page.
      try {
        if (sessionStorage.getItem(`accueil-vu-${user.uid}`)) return;
      } catch { /* stockage indisponible */ }
      if (await getAccueilVu(user.uid)) return;
      let n: Notifs = "masquer";
      if (isIOS() && !isStandalone()) n = "iphone";
      else if (isPushSupported() && !(await isSubscribed().catch(() => true))) n = "proposer";
      if (!alive) return;
      setNotifs(n);
      setOuvert(true);
    })();
    return () => {
      alive = false;
    };
  }, [loading, user]);

  if (!ouvert || !user) return null;

  const roles = Object.values(profile?.serviceRoles ?? {}).flat();
  const role = roles.includes("presidence") ? "presidence" : roles.some((r) => r === "musicien" || r === "chanteur") ? "musicien" : "autre";

  async function fermer() {
    setOuvert(false);
    if (!(await setAccueilVu(user!.uid))) {
      try { sessionStorage.setItem(`accueil-vu-${user!.uid}`, "1"); } catch { /* stockage indisponible */ }
    }
  }

  return <Ecrans role={role} notifs={notifs} uid={user.uid} onFermer={fermer} />;
}

function Ecrans({ role, notifs, uid, onFermer }: {
  role: "presidence" | "musicien" | "autre";
  notifs: Notifs;
  uid: string;
  onFermer: () => void;
}) {
  const { t } = useTranslation();
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

  const ecrans: { titre: string; corps: ReactNode; visuel: ReactNode }[] = [
    {
      titre: t("accueil.bienvenue.titre"),
      visuel: <Image src="/logo.png" alt="" width={72} height={72} className="rounded-full" priority />,
      corps: <p>{t("accueil.bienvenue.texte")}</p>,
    },
    {
      titre: t("accueil.ou.titre"),
      visuel: null,
      corps: (
        <ul className="space-y-3 text-left">
          {ONGLETS.map(({ key, texte, Icon }) => (
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
    {
      titre: t(`accueil.${role}.titre`),
      visuel: <Pastille Icon={role === "autre" ? Ticket : ListMusic} />,
      corps: <p>{t(`accueil.${role}.texte`)}</p>,
    },
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

        <div key={etape} className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-8 py-8 text-center motion-safe:animate-[accueil-in_220ms_ease-out] md:min-h-[26rem]">
          {ecran.visuel}
          <h2 className="text-2xl font-bold leading-tight tracking-[-0.01em] text-foreground text-balance">{ecran.titre}</h2>
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
