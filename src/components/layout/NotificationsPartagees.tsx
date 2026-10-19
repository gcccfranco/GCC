"use client";

// Une seule cloche (lot U4, Q7) : le hook des notifications interroge Firestore toutes
// les 10 min et au retour sur la page. Il est appelé une fois, au-dessus des barres
// (layout.tsx), et partagé : la navbar et la barre latérale sont montées ensemble, deux
// appels doubleraient les lectures (offre gratuite).
import { createContext, useContext } from "react";
import { useNotifications } from "@/hooks/useNotifications";

type Notifications = ReturnType<typeof useNotifications>;

const Contexte = createContext<Notifications | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const notifications = useNotifications();
  return <Contexte.Provider value={notifications}>{children}</Contexte.Provider>;
}

export function useNotificationsPartagees(): Notifications {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error("useNotificationsPartagees hors de NotificationsProvider");
  return valeur;
}
