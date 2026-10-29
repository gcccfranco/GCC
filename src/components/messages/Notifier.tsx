"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Trans, useTranslation } from "react-i18next";
import { Send, Lock } from "lucide-react";
import { ChampRecherche } from "@/components/layout/ChampRecherche";
import { useProfile, listProfiles } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { normalizeName } from "@/lib/planning/names";
import { authHeader } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";
import { NOTIFY_ALL, NOTIFY_GROUPS, audiencesNotifiables } from "@/lib/push/audiences";
import { estDuGroupe } from "@/lib/groupes/organigramme";
import { PUBLISHABLE_PLANNINGS, canPublishPlanning } from "@/lib/planning/releases";
import { PublishPlanningPanel } from "@/components/planning/PublishPlanningPanel";
import { Pilules } from "@/components/layout/Onglets";
import { categoryColor } from "@/lib/serviceColors";
import { libelleAudience } from "@/components/admin/libelles";
import { ApercuNotification, DerniersEnvois } from "./ApercuNotification";

// Au-delà de ce nombre de destinataires (ou « tout le monde »), on demande confirmation.
const CONFIRM_THRESHOLD = 20;

// Destinations possibles au clic sur la notification (chemins internes sûrs).
const DESTINATIONS: { value: string; cle: string }[] = [
  { value: "/mes-services", cle: "common.header.myServices" },
  { value: "/planning", cle: "common.header.planning" },
  { value: "/annonces", cle: "common.header.annonces" },
];

/** Composer une notification manuelle. On choisit une audience (tout le monde / un
 *  culte / un groupe / une classe EDD) ; la liste des personnes de cette audience
 *  s'affiche, toutes cochées par défaut — on peut en décocher pour ne viser que
 *  certaines. Réservé aux admins et aux comptes ayant des droits `notify`.
 *
 *  Lot U6, B2 : sorti de `/notifier` pour Messages › Notifier (`backOffice`). Là, ni
 *  « Publier un planning » (passé à Planning, « Publier le T… » de U2) ni la destination
 *  « Annonces » (404 en ligne, question 13) ; l'ancienne page les garde tant que
 *  l'interrupteur est coupé. `titre` : l'en-tête de l'ancienne page.
 *  Agencement v18 (B11 de docs/spec-agencement-v18.md ; planche `v18-bo-messages-notifier`) : au
 *  Back-Office, le formulaire en carte à gauche (audience en pilules, pied « Annuler · Envoyer à
 *  n personnes »), à droite l'aperçu de la notification puis les derniers envois. */
export function Notifier({ backOffice = false, titre }: { backOffice?: boolean; titre?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === "zh-CN";
  const aud = (a: string) => libelleAudience(t, zh, a);
  const { user, profile, loading } = useProfile();
  const admin = isAdminUser(user);
  // Lot 2 (OG24) : les audiences de `notify` et celles d'un rôle de groupe (`notifieParRole`).
  const rights = useMemo(() => audiencesNotifiables(profile), [profile]);
  // « Publier un planning » (ancienne page seulement) garde la seule liste `notify` (OG23).
  const notifyRights = useMemo(() => profile?.notify ?? [], [profile]);
  const canAll = admin || rights.includes(NOTIFY_ALL);
  const allows = (a: string) => admin || rights.includes(NOTIFY_ALL) || rights.includes(a);

  const groups = useMemo(
    () =>
      NOTIFY_GROUPS.map((g) => ({
        label: g.label,
        audiences: g.audiences.filter(allows),
      })).filter((g) => g.audiences.length > 0),
    [rights, admin] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const canPublishAny = useMemo(
    () => PUBLISHABLE_PLANNINGS.some((p) => canPublishPlanning(p, admin, notifyRights)),
    [admin, notifyRights]
  );

  const [mode, setMode] = useState<"notif" | "publish">("notif");
  const [audience, setAudience] = useState("");
  const [profiles, setProfiles] = useState<UserProfile[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [peopleQuery, setPeopleQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dest, setDest] = useState("/mes-services");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  /** Back-Office : le groupe d'audiences choisi dans la première rangée de pilules. */
  const [groupe, setGroupe] = useState<string | null>(null);
  /** Relit « Derniers envois » après un envoi. */
  const [envois, setEnvois] = useState(0);

  // Personnes de l'audience choisie (tout le monde = tous les profils).
  const pool = useMemo(() => {
    if (!profiles || !audience) return [];
    return audience === NOTIFY_ALL ? profiles : profiles.filter((p) => estDuGroupe(p, audience));
  }, [profiles, audience]);

  const shownPool = useMemo(() => {
    const q = normalizeName(peopleQuery.trim());
    return q
      ? pool.filter((p) => normalizeName(`${p.firstName} ${p.lastName} ${p.planningName}`).includes(q))
      : pool;
  }, [pool, peopleQuery]);

  // Charge les profils dès qu'une audience est choisie.
  useEffect(() => {
    if (audience && profiles === null) {
      listProfiles().then(setProfiles).catch(() => setProfiles([]));
    }
  }, [audience, profiles]);

  // Au changement d'audience (ou au chargement des profils), tout sélectionner.
  useEffect(() => {
    if (!profiles || !audience) {
      setSelected(new Set());
      return;
    }
    const p =
      audience === NOTIFY_ALL ? profiles : profiles.filter((x) => estDuGroupe(x, audience));
    setSelected(new Set(p.map((x) => x.uid)));
    setPeopleQuery("");
  }, [audience, profiles]);

  const allSelected = pool.length > 0 && selected.size === pool.length;
  const broadcast = audience === NOTIFY_ALL && allSelected;
  const canSend = !!title.trim() && !!body.trim() && !busy && selected.size > 0;
  const needsConfirm = broadcast || selected.size > CONFIRM_THRESHOLD;
  const recipLabel = broadcast ? t("notifier.toutLeMondeMin") : t("notifier.personnesN", { count: selected.size });

  // Toute édition referme une éventuelle confirmation en attente.
  useEffect(() => setConfirmOpen(false), [audience, selected, title, body, dest]);

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function attemptSend() {
    if (!canSend) return;
    if (needsConfirm && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    doSend();
  }

  async function doSend() {
    setBusy(true);
    setFeedback("");
    setConfirmOpen(false);
    try {
      const headers = await authHeader();
      // « Tout le monde » avec tous cochés → diffusion à tous les abonnés ; sinon, liste d'uids.
      const base = { title: title.trim(), body: body.trim(), url: dest };
      const reqBody = broadcast ? { audience: NOTIFY_ALL, ...base } : { uids: [...selected], ...base };
      const res = await fetch("/api/push/notify-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(reqBody),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback(t("notifier.envoye", { n: data.sent ?? 0 }));
        setTitle("");
        setBody("");
        setEnvois((n) => n + 1);
      } else {
        setFeedback(data.error || t("notifier.echec"));
      }
    } catch {
      setFeedback(t("notifier.echec"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user || (!admin && rights.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("notifier.nonAutorise")}
        </p>
        {!user && (
          <Link href={`/login?from=${backOffice ? "/back-office/messages/notifier" : "/notifier"}`} className="text-sm text-foreground underline underline-offset-2 hover:text-muted-foreground">
            {t("backOffice.seConnecter")}
          </Link>
        )}
      </div>
    );
  }

  const selectAudience = (
    <>
      <div className="space-y-1.5">
        <label htmlFor="notif-audience" className="text-sm font-medium text-foreground">
          {t("notifier.audience")}
        </label>
        <select
          id="notif-audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full h-11 px-3 rounded-lg border border-transparent bg-secondary text-foreground text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value="">{t("notifier.choisir")}</option>
          {canAll && <option value={NOTIFY_ALL}>{aud(NOTIFY_ALL)}</option>}
          {groups.map((g) => (
            <optgroup key={g.label} label={t(`notifier.groupe.${g.label}`)}>
              {g.audiences.map((a) => (
                <option key={a} value={a}>
                  {aud(a)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </>
  );
  const destinataires = (
    <>
      {/* Personnes de l'audience — toutes cochées par défaut, décochables */}
      {audience && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              {t("notifier.destinataires")}
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {selected.size} / {pool.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelected(allSelected ? new Set() : new Set(pool.map((p) => p.uid)))
                }
                className="text-xs font-semibold text-foreground underline underline-offset-2 hover:text-muted-foreground"
              >
                {allSelected ? t("notifier.toutDecocher") : t("notifier.toutCocher")}
              </button>
            </div>
          </div>
          <ChampRecherche
            value={peopleQuery}
            onChange={setPeopleQuery}
            placeholder={t("notifier.filtrerPlaceholder")}
            label={t("notifier.filtrerLabel")}
          />
          <div className="max-h-64 overflow-y-auto rounded-xl bg-card divide-y divide-border">
            {profiles === null ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("common.loading")}</p>
            ) : shownPool.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("notifier.aucunMembre")}</p>
            ) : (
              shownPool.map((p) => {
                const checked = selected.has(p.uid);
                return (
                  <button
                    key={p.uid}
                    type="button"
                    onClick={() => toggle(p.uid)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
                  >
                    <span
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 text-xs ${
                        checked ? "bg-foreground border-foreground text-background" : "border-border"
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
                          {t("notifier.planningNom", { nom: p.planningName })}
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
    </>
  );
  const champs = (
    <>
      <div className="space-y-1.5">
        <label htmlFor="notif-titre" className="text-sm font-medium text-foreground">
          {t("notifier.titre")}
        </label>
        <input
          id="notif-titre"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder={t("notifier.titrePlaceholder")}
          className="w-full h-11 px-3 rounded-lg border border-transparent bg-secondary text-foreground placeholder:text-muted-foreground text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notif-message" className="text-sm font-medium text-foreground">
          {t("notifier.message")}
        </label>
        <textarea
          id="notif-message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder={t("notifier.messagePlaceholder")}
          className="w-full px-3 py-2.5 rounded-lg border border-transparent bg-secondary text-foreground placeholder:text-muted-foreground text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notif-destination" className="text-sm font-medium text-foreground">
          {t("notifier.ouvreAuClic")}
        </label>
        <select
          id="notif-destination"
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          className="w-full h-11 px-3 rounded-lg border border-transparent bg-secondary text-foreground text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          {DESTINATIONS.filter((d) => !backOffice || d.value !== "/annonces").map((d) => (
            <option key={d.value} value={d.value}>
              {t(d.cle)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
  const envoi = (
    <>

      {confirmOpen ? (
        <div className="rounded-xl bg-card p-3 space-y-3">
          <p className="text-sm text-foreground">
            <Trans i18nKey="notifier.confirmer" values={{ dest: recipLabel }} components={{ b: <span className="font-semibold" /> }} />
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="h-9 px-4 rounded-full bg-secondary text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              {t("common.buttons.cancel")}
            </button>
            <button
              onClick={doSend}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {busy ? t("notifier.envoi") : t("common.buttons.confirm")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={attemptSend}
            disabled={!canSend}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {busy ? t("notifier.envoi") : t("notifier.envoyer")}
          </button>
        </div>
      )}
    </>
  );

  if (backOffice) {
    // Agencement v18 (B11) : audience en pilules (tout le monde, puis un groupe et l'une de ses
    // audiences), pied « Annuler · Envoyer à n personnes », aperçu et derniers envois à droite.
    const groupeChoisi = groups.find((g) => g.label === groupe) ?? null;
    const annuler = () => {
      setTitle("");
      setBody("");
      setAudience("");
      setGroupe(null);
      setDest("/mes-services");
      setFeedback("");
    };
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 px-[var(--marge-page)] pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
        <div className="raised rounded-2xl p-5 space-y-4 sm:p-6">
          <div>
            <h2 className="text-[18px] font-bold text-foreground">{t("notifier.prevenir")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("notifier.prevenirAide")}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t("notifier.aQui")}</p>
            <Pilules
              etiquette={t("notifier.audience")}
              options={[
                ...(canAll ? [{ cle: NOTIFY_ALL, nom: aud(NOTIFY_ALL) }] : []),
                ...groups.map((g) => ({ cle: g.label, nom: t(`notifier.groupe.${g.label}`) })),
              ]}
              valeur={audience === NOTIFY_ALL ? NOTIFY_ALL : groupe}
              choisir={(v) => {
                setGroupe(v === NOTIFY_ALL ? null : v);
                setAudience(v === NOTIFY_ALL ? NOTIFY_ALL : "");
              }}
            />
            {groupeChoisi && (
              <Pilules
                etiquette={t(`notifier.groupe.${groupeChoisi.label}`)}
                options={groupeChoisi.audiences.map((a) => ({ cle: a, nom: aud(a), couleur: categoryColor(a) }))}
                valeur={audience || null}
                choisir={(v) => setAudience(v ?? "")}
              />
            )}
          </div>
          {destinataires}
          {champs}
          {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
          {confirmOpen ? (
            envoi
          ) : (
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={annuler}
                className="h-10 rounded-full bg-background px-4 text-sm font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary"
              >
                {t("common.buttons.cancel")}
              </button>
              <button
                type="button"
                onClick={attemptSend}
                disabled={!canSend}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden />
                {busy
                  ? t("notifier.envoi")
                  : selected.size === 0
                  ? t("notifier.envoyer")
                  : t("notifier.envoyerA", { count: selected.size })}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <ApercuNotification titre={title} message={body} />
          <DerniersEnvois cle={envois} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {titre}
      <p className="text-sm text-muted-foreground">
        {t("notifier.aideAncienne")}
      </p>

      {canPublishAny && (
        <div className="flex gap-2">
          {(
            [
              ["notif", t("notifier.modeNotification")],
              ["publish", t("notifier.modePublier")],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-colors ${
                mode === m
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "publish" ? (
        <PublishPlanningPanel isAdmin={admin} notifyRights={notifyRights} />
      ) : (
      <div className="rounded-xl bg-card shadow-soft p-5 space-y-4">
        {selectAudience}
        {destinataires}
        {champs}
        {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
        {envoi}
      </div>
      )}
    </div>
  );
}
