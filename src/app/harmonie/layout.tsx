import { RequireAuth } from "@/components/auth/RequireAuth";
import { EnTeteHarmonie } from "@/components/harmonie/EnTeteHarmonie";

// Harmonie en onglets (agencement v18, A16, docs/spec-agencement-v18.md) : l'en-tête « Harmonie » et
// le rail Fiches · Cours · Sons du RD-2000, au-dessus des trois layouts de U4 bis (`(catalogue)`,
// `cours`, `rd2000`), qui gardent chacun leurs deux volets.
export default function HarmonieLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <EnTeteHarmonie />
      {children}
    </RequireAuth>
  );
}
