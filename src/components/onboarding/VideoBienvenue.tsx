"use client";

// Vidéo de bienvenue de l'écran 1 de la visite (lot VB, docs/spec-video-bienvenue.md) : une vidéo par disposition,
// sans son, lue d'elle-même sauf mouvement réduit ou économie de données ; « Revoir » à la fin.

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ORDINATEUR, TABLETTE_PAYSAGE } from "@/lib/deuxVolets";

type Etat = "lecture" | "fin" | "arret" | "erreur";

const CADRE = "relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl raised";
const BOUTON = "bg-black/55 text-white backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

function disposition(): string {
  const m = (q: string) => window.matchMedia(q).matches;
  if (m(ORDINATEUR)) return "ordinateur";
  if (m(TABLETTE_PAYSAGE)) return "tablette-paysage";
  if (m("(min-width: 768px)")) return "tablette";
  return "telephone";
}

export function VideoBienvenue() {
  const { t } = useTranslation();
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [etat, setEtat] = useState<Etat>("lecture");

  // Choix de la disposition une seule fois, au montage.
  useEffect(() => {
    setSrc(`/accueil/bienvenue-${disposition()}.mp4`);
  }, []);

  // La vidéo existe dès que `src` est posé : lecture automatique, sauf mouvement réduit ou économie de données.
  useEffect(() => {
    const video = ref.current;
    if (!src || !video) return;
    const economie = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || economie) {
      setEtat("arret");
      return;
    }
    video.muted = true;
    video.play().catch(() => setEtat("arret"));
  }, [src]);

  function lire(depuis0: boolean) {
    const video = ref.current;
    if (!video) return;
    if (depuis0) video.currentTime = 0;
    video.muted = true;
    setEtat("lecture");
    video.play().catch(() => setEtat("arret"));
  }

  if (!src || etat === "erreur") {
    // eslint-disable-next-line @next/next/no-img-element
    return <div className={CADRE}><img src="/accueil/bienvenue.jpg" alt="" className="h-full w-full object-cover" /></div>;
  }

  return (
    <div className={CADRE}>
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        preload="metadata"
        poster="/accueil/bienvenue.jpg"
        aria-label={t("accueil.video.label")}
        onEnded={() => setEtat("fin")}
        onError={() => setEtat("erreur")}
        className="h-full w-full object-cover"
      />
      {etat === "arret" && (
        <button
          type="button"
          onClick={() => lire(false)}
          aria-label={t("accueil.video.lire")}
          className={`absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${BOUTON}`}
        >
          <Play className="h-7 w-7" fill="currentColor" aria-hidden />
        </button>
      )}
      {etat === "fin" && (
        <button
          type="button"
          onClick={() => lire(true)}
          className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${BOUTON}`}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {t("accueil.video.revoir")}
        </button>
      )}
    </div>
  );
}
