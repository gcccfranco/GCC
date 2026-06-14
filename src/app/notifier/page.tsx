"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Send, Megaphone, Lock, Search, X } from "lucide-react";
import { useProfile, listProfiles } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { authHeader } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";
import { NOTIFY_ALL, NOTIFY_GROUPS, audienceLabel } from "@/lib/push/audiences";

type Mode = "audience" | "people";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Composer une notification manuelle vers une audience (tout le monde / un culte /
 *  un groupe / une classe EDD) ou vers des personnes précises. Réservé aux admins et
 *  aux comptes ayant des droits `notify`. */
export default function NotifierPage() {
  const { user, profile, loading } = useProfile();
  const admin = isAdminUser(user);
  const rights = useMemo(() => profile?.notify ?? [], [profile]);
  const canAll = admin || rights.includes(NOTIFY_ALL);
  const allows = (a: string) => admin || rights.includes(NOTIFY_ALL) || rights.includes(a);
  // Catégories que l'expéditeur peut cibler (null = toutes — admin ou « tout le monde »).
  const allowedCats = useMemo<string[] | null>(
    () => (canAll ? null : rights.filter((r) => r !== NOTIFY_ALL)),
    [canAll, rights]
  );

  const groups = useMemo(
    () =>
      NOTIFY_GROUPS.map((g) => ({
        label: g.label,
        audiences: g.audiences.filter(allows),
      })).filter((g) => g.audiences.length > 0),
    [rights, admin] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [mode, setMode] = useState<Mode>("audience");
  const [audience, setAudience] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Mode « personnes » : liste des membres ciblables (chargée à la 1ʳᵉ ouverture).
  const [profiles, setProfiles] = useState<UserProfile[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [peopleQuery, setPeopleQuery] = useState("");

  useEffect(() => {
    if (mode === "people" && profiles === null) {
      listProfiles().then(setProfiles).catch(() => setProfiles([]));
    }
  }, [mode, profiles]);

  const targetable = useMemo(() => {
    if (!profiles) return [];
    const list = profiles.filter((p) =>
      allowedCats === null
        ? true
        : Object.keys(p.serviceRoles).some((c) => allowedCats.includes(c))
    );
    const q = normalize(peopleQuery.trim());
    return q
      ? list.filter((p) => normalize(`${p.firstName} ${p.lastName} ${p.planningName}`).includes(q))
      : list;
  }, [profiles, allowedCats, peopleQuery]);

  const canSend =
    !!title.trim() &&
    !!body.trim() &&
    !busy &&
    (mode === "audience" ? !!audience : selected.size > 0);

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function send() {
    if (!canSend) return;
    setBusy(true);
    setFeedback("");
    try {
      const headers = await authHeader();
      const reqBody =
        mode === "audience"
          ? { audience, title: title.trim(), body: body.trim() }
          : { uids: [...selected], title: title.trim(), body: body.trim() };
      const res = await fetch("/api/push/notify-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(reqBody),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback(`Envoyé (${data.sent ?? 0} notification(s)).`);
        setTitle("");
        setBody("");
        setSelected(new Set());
      } else {
        setFeedback(data.error || "Échec de l'envoi.");
      }
    } catch {
      setFeedback("Échec de l'envoi.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user || (!admin && rights.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Tu n&apos;as pas l&apos;autorisation d&apos;envoyer des notifications.
        </p>
        {!user && (
          <Link href="/login?from=/notifier" className="text-sm text-primary hover:underline">
            Se connecter
          </Link>
        )}
      </div>
    );
  }

  const segBtn = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${
        mode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10 space-y-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Envoyer une notification</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Prévenir une audience d&apos;un changement de planning, ou de la mise en ligne du
          planning du trimestre.
        </p>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {/* Choix du mode : audience large ou personnes précises */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            {segBtn("audience", "Une audience")}
            <div className="w-px bg-border" />
            {segBtn("people", "Des personnes")}
          </div>

          {mode === "audience" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Audience
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Choisir…</option>
                {canAll && <option value={NOTIFY_ALL}>{audienceLabel(NOTIFY_ALL)}</option>}
                {groups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.audiences.map((a) => (
                      <option key={a} value={a}>
                        {audienceLabel(a)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Personnes
                </label>
                {selected.size > 0 && (
                  <span className="text-xs font-semibold text-primary">{selected.size} sélectionnée(s)</span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                  placeholder="Rechercher un membre…"
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {peopleQuery && (
                  <button
                    onClick={() => setPeopleQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {profiles === null ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>
                ) : targetable.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun membre.</p>
                ) : (
                  targetable.map((p) => {
                    const checked = selected.has(p.uid);
                    return (
                      <button
                        key={p.uid}
                        type="button"
                        onClick={() => toggle(p.uid)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
                      >
                        <span
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                          }`}
                        >
                          {checked && "✓"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-sm text-foreground truncate block">
                            {p.firstName} {p.lastName}
                          </span>
                          {p.planningName && (
                            <span className="text-xs text-muted-foreground truncate block">
                              planning : {p.planningName}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Ex. Changement de planning"
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Ex. Le planning du Culte a été mis à jour, vérifie tes dates."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}

          <div className="flex justify-end">
            <button
              onClick={send}
              disabled={!canSend}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {busy ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
