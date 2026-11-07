"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { BellRing, X } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { visibleCategories } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import {
  isPushSupported,
  isStandalone,
  isIOS,
  isSubscribed,
  subscribeToPush,
} from "@/lib/push/client";

const DISMISS_KEY = "pushPromptDismissed";

/** Invite à activer les notifications push, affichée aux personnes qui servent
 *  (serviceRoles non vide) mais pas encore abonnées. Push uniquement → c'est le
 *  levier d'adoption. Rejetable (localStorage). Gère la contrainte iOS (PWA). */
export function PushPrompt({ surGris }: { surGris?: boolean } = {}) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const [show, setShow] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Lot AO (AO-F) : au Back-Office, « sert » = voit une catégorie par l'organigramme, ou figure au planning
  // (nom de planning). Interrupteur coupé : `visibleCategories` rend les clés de `serviceRoles`, comme avant.
  const hasServices = !!profile && (visibleCategories(profile).length > 0 || (BACK_OFFICE && profile.planningName.trim() !== ""));

  useEffect(() => {
    if (!user || !hasServices || !isPushSupported()) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* stockage indisponible */
    }
    if (dismissed) return;
    setNeedsInstall(isIOS() && !isStandalone());
    isSubscribed()
      .then((sub) => setShow(!sub))
      .catch(() => {});
  }, [user, hasServices]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* stockage indisponible */
    }
    setShow(false);
  }

  async function enable() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await subscribeToPush(user.uid);
      setShow(false);
    } catch (e) {
      console.warn(e);
      setError(t(e instanceof Error && e.message === "Permission refusée" ? "push.refuse" : "push.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("relative rounded-2xl px-4 py-3", surGris ? "carte-groupe" : "bg-secondary")}>
      <button
        onClick={dismiss}
        aria-label={t("signalement.fermer")}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground [@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:-inset-3.5 [@media(pointer:coarse)]:after:content-['']"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <BellRing className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-base font-semibold text-foreground">{t("push.promptTitle")}</p>
          {needsInstall ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("push.iosInstall")}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("push.promptText")}
            </p>
          )}
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          {!needsInstall && (
            <button
              onClick={enable}
              disabled={busy}
              className="mt-2 h-8 [@media(pointer:coarse)]:h-11 px-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "…" : t("accueil.notifs.activer")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
