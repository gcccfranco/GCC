import * as fs from "fs";
import * as path from "path";
import { ChantsVolets } from "./ChantsVolets";
import type { Theme } from "@/types/song";

// Chants (lot U5, docs/spec-deux-volets.md, Q15) : la liste vit ici et reste montée d'un
// chant à l'autre en deux volets (recherche, filtres, position). Les chants viennent de
// `/songs-index.json`, lu par le navigateur : seuls les thèmes, légers, passent d'ici.
export default function SongsLayout({ children }: { children: React.ReactNode }) {
  const themesPath = path.join(process.cwd(), "content", "themes.json");
  const themes: Theme[] = JSON.parse(fs.readFileSync(themesPath, "utf-8")).themes;
  return <ChantsVolets themes={themes}>{children}</ChantsVolets>;
}
