"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authHeader } from "@/lib/firebase/setlists";
import { parsePresentationUrl } from "@/lib/setlist/presentationLink";

/** Lien de la présentation (PPT) de la setlist : ouvert par tous, ajouté ou
 *  changé par la régie du jour et ceux qui modifient la setlist (le serveur
 *  vérifie). Voir docs/spec-regie.md. */
export function PresentationLink({
  setlistId,
  url,
  canChange,
  onSaved,
}: {
  setlistId: string;
  url?: string;
  canChange: boolean;
  onSaved: (url: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Ce qui s'est passé côté président au dernier enregistrement (lot 2) :
  // prévenu, ou aucun compte relié à son nom — la régie doit le savoir.
  const [notice, setNotice] = useState<"notified" | "unlinked" | null>(null);
  // Qui modifie la setlist peut aussi écrire ce champ en REST, sans la route :
  // on n'affiche jamais un lien qui ne serait pas https.
  const href = url ? parsePresentationUrl(url) : null;

  if (!href && !canChange) return null;

  function open() {
    setDraft(url ?? "");
    setError(null);
    setEditing(true);
  }

  async function save(next: string) {
    if (next.trim() && !parsePresentationUrl(next)) {
      setError(t("setlists.detail.presentationInvalid"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/setlist/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ setlistId, url: next.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("setlists.detail.presentationError"));
        return;
      }
      onSaved(data.presentationUrl ?? undefined);
      setNotice(data.notified > 0 ? "notified" : data.linked === false ? "unlinked" : null);
      setEditing(false);
    } catch {
      setError(t("setlists.detail.presentationError"));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form
        className="mt-3 space-y-2 print:hidden"
        onSubmit={(e) => {
          e.preventDefault();
          save(draft);
        }}
      >
        <label htmlFor={inputId} className="block text-xs font-medium text-muted-foreground">
          {t("setlists.detail.presentationLabel")}
        </label>
        <Input
          id={inputId}
          type="text"
          inputMode="url"
          autoFocus
          placeholder="https://www.canva.com/…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "…" : t("setlists.detail.presentationSave")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {t("common.cancel", { defaultValue: "Annuler" })}
          </Button>
          {url && (
            <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" disabled={saving} onClick={() => save("")}>
              {t("setlists.detail.presentationRemove")}
            </Button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
      {notice && (
        <p role="status" className="basis-full text-xs text-muted-foreground">
          {notice === "notified" ? t("setlists.detail.presentationNotified") : t("setlists.detail.presentationUnlinked")}
        </p>
      )}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 px-3 rounded-sm border border-border bg-card text-[12.5px] font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
        >
          <Presentation className="h-3.5 w-3.5 text-foreground" />
          {t("setlists.detail.presentation")}
          <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </a>
      ) : null}
      {canChange && (
        <button
          type="button"
          onClick={open}
          className="h-8 px-2 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          {url ? t("setlists.detail.presentationChange") : t("setlists.detail.presentationAdd")}
        </button>
      )}
    </div>
  );
}
