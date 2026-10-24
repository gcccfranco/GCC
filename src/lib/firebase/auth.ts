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
import { balayerLesCopies, effacerToutesLesCopies, suivreLeCompte } from "@/lib/setlist/copieHorsLigne";

// Copies hors ligne liées au compte : un seul écouteur pour tout le site, installé une fois côté navigateur.
// Le premier événement est le compte restauré par le SDK (rien n'est effacé) ; un autre identifiant ensuite,
// ou aucun, efface les copies. Au démarrage, les copies de plus de 14 jours sont aussi balayées.
if (typeof window !== "undefined") {
  const suivre = suivreLeCompte(() => void effacerToutesLesCopies());
  onAuthStateChanged(auth, (u) => suivre(u?.uid ?? null));
  void balayerLesCopies();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

export async function signIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut(): Promise<void> {
  // Les copies hors ligne des setlists (privées comprises) ne survivent pas à la session.
  await effacerToutesLesCopies();
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
