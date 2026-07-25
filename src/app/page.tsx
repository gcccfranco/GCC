"use client";

// Aiguillage de la racine : visiteurs → /songs (contenu public),
// membres connectés → /planning. L'auth n'est connue que côté client
// (Firebase), d'où le composant client plutôt qu'un redirect serveur.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/planning" : "/songs");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-muted-foreground">…</p>
    </div>
  );
}
