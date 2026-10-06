import { RequireAuth } from "@/components/auth/RequireAuth";
import { CoursHarmonie } from "@/components/harmonie/cours/CoursHarmonie";

// Cours d'Harmonie (lot U4 bis, B3, Q2 et Q6) : la liste du cours vit ici, la leçon est la page.
export default function CoursLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <CoursHarmonie>{children}</CoursHarmonie>
    </RequireAuth>
  );
}
