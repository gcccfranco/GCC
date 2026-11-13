import { notFound } from "next/navigation";
import { loadSong } from "@/lib/content/loadSongs";
import { BancMarge } from "./BancMarge";

// Banc de montage de la marge « Affichage » (RU-2) : aucun écran ne peut la monter sans toucher les fichiers de RU-3 à RU-5
// (décision déléguée, 13/11/2026). Jamais en production.
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ slug?: string; mode?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { slug = "abba-pere", mode } = await searchParams;
  let song;
  try { song = loadSong(slug); } catch { notFound(); }
  return <BancMarge song={song} mode={mode === "louange" ? "louange" : "page"} />;
}
