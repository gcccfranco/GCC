"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useProfile } from "@/lib/firebase/users";
import { getOnboardingSeen, markOnboardingSeen } from "@/lib/firebase/onboarding";
import { stepsForProfile } from "@/lib/onboarding/steps";
import { OnboardingTour } from "./OnboardingTour";

interface OnboardingCtx {
  /** Rouvre le guide de bienvenue à la demande (bouton « Revoir le guide »). */
  openTour: () => void;
}

const Ctx = createContext<OnboardingCtx>({ openTour: () => {} });

/** Accès au déclencheur du guide depuis n'importe quel composant client. */
export function useOnboarding() {
  return useContext(Ctx);
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useProfile();
  const [open, setOpen] = useState(false);
  // Une seule vérification « déjà vu » par utilisateur et par session.
  const checkedFor = useRef<string | null>(null);

  // Auto-ouverture à la première connexion (profil complété, guide jamais vu).
  useEffect(() => {
    if (loading || !user || !profile) return;
    if (checkedFor.current === user.uid) return;
    checkedFor.current = user.uid;
    getOnboardingSeen(user.uid).then((seen) => {
      if (!seen) setOpen(true);
    });
  }, [user, profile, loading]);

  const openTour = useCallback(() => setOpen(true), []);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (user) void markOnboardingSeen(user.uid);
  }, [user]);

  const steps = user ? stepsForProfile(user, profile) : [];

  return (
    <Ctx.Provider value={{ openTour }}>
      {children}
      {open && steps.length > 0 && (
        <OnboardingTour steps={steps} onClose={handleClose} />
      )}
    </Ctx.Provider>
  );
}
