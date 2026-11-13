"use client";

// Extrait de la visite (lot VB-E, docs/spec-video-bienvenue.md) : une courte vidéo en boucle, sans son ni légende, au pied
// de chaque écran de la visite sauf Bienvenue ; une version par disposition (public/accueil/extraits). Lue d'elle-même,
// sauf mouvement réduit, économie de données ou lecture refusée : l'affiche et un bouton « Lire la vidéo ».

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ORDINATEUR, TABLETTE_PAYSAGE } from "@/lib/deuxVolets";

export type Extrait = "apercu" | "onglets" | "musicien" | "melange" | "taches" | "planning";

type Etat = "lecture" | "arret" | "erreur";

/** Lecture refusée : le bouton lecture, sauf si la vidéo est en erreur (une 404 rejette aussi `play()`, après l'erreur). */
const refusee = (e: Etat): Etat => (e === "erreur" ? e : "arret");

const CADRE = "relative aspect-video w-full max-w-sm overflow-hidden rounded-xl bg-secondary";
const BOUTON = "bg-black/55 text-white backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

function disposition(): string {
  const m = (q: string) => window.matchMedia(q).matches;
  if (m(ORDINATEUR)) return "ordinateur";
  if (m(TABLETTE_PAYSAGE)) return "tablette-paysage";
  if (m("(min-width: 768px)")) return "tablette";
  return "telephone";
}

export function ExtraitVisite({ extrait }: { extrait: Extrait }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLVideoElement>(null);
  const [dispo, setDispo] = useState<string | null>(null);
  const [etat, setEtat] = useState<Etat>("lecture");
  const base = dispo ? `/accueil/extraits/${extrait}-${dispo}` : null;

  // Choix de la disposition une seule fois, au montage.
  useEffect(() => {
    setDispo(disposition());
  }, []);

  // La vidéo existe dès que la disposition est choisie : lecture automatique, sauf mouvement réduit ou économie de données.
  useEffect(() => {
    const video = ref.current;
    if (!dispo || !video) return;
    const economie = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || economie) {
      setEtat("arret");
      return;
    }
    video.muted = true;
    video.play().catch(() => setEtat(refusee));
  }, [dispo]);

  function lire() {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    setEtat("lecture");
    // Le bouton cliqué disparaît : le focus passe à la vidéo, au lieu de retomber sur la page.
    video.focus();
    video.play().catch(() => setEtat(refusee));
  }

  // Avant le choix de la disposition : le cadre vide, de la même taille (pas de saut).
  if (!base) return <div className={CADRE} />;

  if (etat === "erreur") {
    // eslint-disable-next-line @next/next/no-img-element
    return <div className={CADRE}><img src={`${base}.jpg`} alt="" className="h-full w-full object-cover" /></div>;
  }

  return (
    <div className={CADRE}>
      <video
        ref={ref}
        src={`${base}.mp4`}
        muted
        loop
        playsInline
        preload="metadata"
        poster={`${base}.jpg`}
        aria-label={t(`accueil.video.extrait.${extrait}`)}
        tabIndex={-1}
        onError={() => setEtat("erreur")}
        className="h-full w-full object-cover outline-none"
      />
      {etat === "arret" && (
        <button
          type="button"
          onClick={lire}
          aria-label={t("accueil.video.lire")}
          className={`absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${BOUTON}`}
        >
          <Play className="h-7 w-7" fill="currentColor" aria-hidden />
        </button>
      )}
    </div>
  );
}
