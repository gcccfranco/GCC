"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./config";
import { poserMarqueConnecte, useMarqueConnecte } from "@/lib/marqueConnecte";
import { balayerLesCopies, effacerToutesLesCopies, suivreLeCompte } from "@/lib/setlist/copieHorsLigne";

// Copies hors ligne liées au compte : un seul écouteur pour tout le site, installé une fois côté navigateur.
// Le premier événement est le compte restauré par le SDK (rien n'est effacé) ; un autre identifiant ensuite,
// ou aucun, efface les copies. Au démarrage, les copies de plus de 14 jours sont aussi balayées.
if (typeof window !== "undefined") {
  const suivre = suivreLeCompte(() => void effacerToutesLesCopies());
  onAuthStateChanged(auth, (u) => {
    suivre(u?.uid ?? null);
    // Lot CH (C1, C5) : la marque « était connecté » suit la réponse de Firebase.
    poserMarqueConnecte(!!u);
  });
  void balayerLesCopies();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Lot CH : marque locale « était connecté », pour dessiner la forme du membre pendant l'attente (sans droit).
  const probablementConnecte = useMarqueConnecte();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading, probablementConnecte };
}

export async function signIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut(): Promise<void> {
  // Les copies hors ligne des setlists (privées comprises) ne survivent pas à la session.
  await effacerToutesLesCopies();
  poserMarqueConnecte(false);
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
