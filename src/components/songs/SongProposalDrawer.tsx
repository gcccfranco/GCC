"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Music4 } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { createSongProposal } from "@/lib/firebase/songProposals";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Bouton « Proposer un nouveau chant » + tiroir de saisie.
 *  Visible uniquement pour les utilisateurs connectés. La proposition est
 *  envoyée aux admins (inbox in-app), aucun fichier n'est stocké. */
export function SongProposalDrawer() {
  const { t } = useTranslation();
  const { user, profile, loading } = useProfile();
  const [open, setOpen] = useState(false);
  useStandaloneScrollLock(open);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (loading || !user) return null;

  const authorName =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : user.email ?? t("proposition.utilisateur");

  function reset() {
    setTitle("");
    setYoutubeUrl("");
    setPdfUrl("");
    setError("");
    setDone(false);
  }

  async function handleSubmit() {
    setError("");
    if (!title.trim()) {
      setError(t("proposition.erreurNom"));
      return;
    }
    if (!youtubeUrl.trim()) {
      setError(t("proposition.erreurYoutube"));
      return;
    }
    if (!isHttpUrl(youtubeUrl)) {
      setError(t("proposition.erreurYoutubeLien"));
      return;
    }
    if (pdfUrl.trim() && !isHttpUrl(pdfUrl)) {
      setError(t("proposition.erreurPartitionLien"));
      return;
    }
    setSaving(true);
    try {
      await createSongProposal({
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        pdfUrl: pdfUrl.trim(),
        authorId: user!.uid,
        authorName,
      });
      setDone(true);
    } catch {
      setError(t("proposition.erreurEnvoi"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-2 hover:underline"
      >
        <Music4 className="h-4 w-4" />
        {t("proposition.titre")}
      </button>

      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{t("proposition.titre")}</DrawerTitle>
          <DrawerDescription>{t("proposition.description")}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm text-foreground">
                {t("proposition.envoyee")}
              </p>
              <Button onClick={() => setOpen(false)} className="h-11">
                {t("signalement.fermer")}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("proposition.nom")} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("proposition.nomExemple")}
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("proposition.youtube")} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="url"
                  inputMode="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("proposition.partition")}{" "}
                  <span className="text-muted-foreground/70">{t("signalement.optionnel")}</span>
                </label>
                <Input
                  type="url"
                  inputMode="url"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  placeholder={t("proposition.partitionExemple")}
                  className="h-11"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="h-11"
                >
                  {t("signalement.annuler")}
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-11"
                >
                  {saving ? t("signalement.envoi") : t("proposition.envoyer")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
