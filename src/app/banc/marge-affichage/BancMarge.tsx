"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MargeAffichage } from "@/components/song/MargeAffichage";
import { useReglagesAffichage } from "@/hooks/useReglagesAffichage";
import { useAuth } from "@/lib/firebase/auth";
import { parseChordPro } from "@/lib/chordpro/parser";
import type { Song } from "@/types/song";

// Montage de test : le titre et les lignes du chant (accords, paroles, pinyin) réglés par `useReglagesAffichage`.
export function BancMarge({ song, mode }: { song: Song; mode: "page" | "louange" }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const uid = loading ? undefined : user?.uid ?? null;
  const r = useReglagesAffichage(uid);
  const [ouvert, setOuvert] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const ast = useMemo(() => parseChordPro(song.chordProSource), [song.chordProSource]);
  const zh = song.language === "zh";
  const choriste = r.role === "choriste" || r.role === "presidence";

  return (
    <MargeAffichage ouvert={ouvert} onFermer={() => setOuvert(false)} zh={zh} aJianpu={song.hasJianpu} uid={uid} mode={mode} retourFocus={bouton}>
      <div data-testid="musique" style={{ padding: 16, fontSize: `${r.taille}rem` }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{song.title}</h1>
          <button ref={bouton} type="button" className="min-h-11 rounded-full border border-border px-4 text-sm" onClick={() => setOuvert((o) => !o)}>
            {t("margeAffichage.titre")}
          </button>
        </div>
        {ast.sections.map((s) => (
          <div key={s.uid} className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground">{s.name}</p>
            {s.lines.map((l, i) => (
              <div key={i} className="mb-2">
                {r.accords && !choriste && (
                  <div data-ligne="accords" className="font-semibold" style={{ color: "var(--chord-color)" }}>
                    {l.tokens.filter((k) => k.type === "chord").map((k) => k.value).join("  ")}
                  </div>
                )}
                <div data-ligne="paroles">{l.tokens.filter((k) => k.type === "lyric").map((k) => k.value).join("")}</div>
                {zh && r.pinyin && l.pinyin && <div data-ligne="pinyin" className="text-sm text-muted-foreground">{l.pinyin}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </MargeAffichage>
  );
}
