import { RequireAuth } from "@/components/auth/RequireAuth";
import { Rd2000Harmonie } from "@/components/harmonie/rd2000/Rd2000Harmonie";

// Sons du RD-2000 (lot U4 bis, B3, Q2 et Q6) : la liste vit ici, le son est la page.
export default function Rd2000Layout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Rd2000Harmonie>{children}</Rd2000Harmonie>
    </RequireAuth>
  );
}
