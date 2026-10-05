import { ChoisisUnChant } from "./ChoisisUnChant";

export const dynamic = "force-static";

// /songs : la liste vit dans le layout (songs/layout.tsx, lot U5, docs/spec-deux-volets.md,
// Q15) ; la page, c'est le volet de droite avant d'avoir choisi un chant.
export default function SongsPage() {
  return <ChoisisUnChant />;
}
