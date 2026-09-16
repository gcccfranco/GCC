"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Search, X, AlertTriangle, Link2, Lock, Globe, Plus, ChevronDown, ChevronUp, Check } from "lucide-react";
import Fuse from "fuse.js";
import {
  RESTRICTED_CATEGORIES,
  ALL_CATEGORIES,
  authHeader,
  createSetlist,
  updateSetlist,
  deleteSetlist,
} from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { creatableCategories, isAdminUser } from "@/lib/access";
import { loadPlanningData, setlistSeances, normalizeName, type PlanningData, type SetlistSeance } from "@/lib/planning/names";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  type FormItem,
  type FormFusionItem,
  type FormListItem,
  type FusionMixedSectionForm,
  isFormFusion,
  isFormTransition,
  makeDefaultSections,
} from "@/lib/setlist/formItems";
import { buildSetlistItems, detectSetlistLanguage } from "@/lib/setlist/buildSetlistItems";
import { historyAuthor, recordCreation, recordHistory, type HistoryPass } from "@/lib/firebase/setlistHistory";
import type { SongIndexEntry } from "@/types/song";
import { useDefaultSensors } from "@/lib/dnd/sensors";
import { nextUid } from "@/lib/uid";
import { SongRow, FusionRow, TransitionRow } from "@/components/setlists/SetlistFormRows";

const FREE_CATEGORIES = ["Groupe Paix", "Groupe Fidélité", "Groupe Bonté", "中班", "大班", "高班"];

export interface SetlistFormInitial {
  title: string;
  date: string;
  leader: string;
  category: string;
  moment?: "matin" | "soir";
  notes: string;
  isPrivate: boolean;
  ownerId: string | null;
  items: FormListItem[];
}

export interface SetlistFormProps {
  mode: "create" | "edit";
  /** Requis en mode edit */
  setlistId?: string;
  songs: SongIndexEntry[];
  /** État initial (mode edit) — lu une seule fois au montage */
  initial?: SetlistFormInitial;
}

/** Déclenche la notif « setlist prête » en mode auto après une sauvegarde.
 *  Le serveur n'envoie que si la setlist a ≥ 4 chants et n'a pas déjà prévenu
 *  l'équipe. Fire-and-forget : tout échec (réseau, droits) est silencieux. */
async function notifySetlistReady(setlistId: string): Promise<void> {
  try {
    const headers = await authHeader();
    await fetch("/api/push/notify-setlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ setlistId, auto: true }),
    });
  } catch {
    /* réseau indisponible */
  }
}

export function SetlistForm({ mode, setlistId, songs, initial }: SetlistFormProps) {
  const scrollVisible = useScrollDirection();
  const isEdit = mode === "edit";
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useProfile();
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // ── Form state ──────────────────────────────────────────
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split("T")[0]);
  const [leader, setLeader] = useState(initial?.leader ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [items, setItems] = useState<FormListItem[]>(initial?.items ?? []);
  const [moment, setMoment] = useState<"matin" | "soir" | undefined>(initial?.moment);
  const ownerId = initial?.ownerId ?? null;

  // ── Sélecteurs planning : présidence (liste) + date (manuelle) ───────────
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  const [leaderOther, setLeaderOther] = useState(false);  // présidence hors liste (saisie libre)

  // ── UI state ────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

  // ── Enregistrement automatique ──────────────────────────
  // Création : brouillon invisible (isDraft) jusqu'à « Publier ».
  // Modification : chaque changement part ~2 s après, sans bouton.
  const [autoSaveId, setAutoSaveId] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState(false);
  const autoSaveIdRef = useRef<string | null>(null);
  autoSaveIdRef.current = autoSaveId;
  // Id réellement publié (clic « Publier ») — distingue un brouillon publié d'un abandonné.
  const committedIdRef = useRef<string | null>(null);
  // Enregistrements du brouillon, l'un après l'autre. « Publier » attend celui en
  // cours et arrête les suivants : sinon, sur réseau lent, un brouillon parti
  // juste avant repasserait la setlist publiée en brouillon (invisible).
  const draftChainRef = useRef<Promise<void>>(Promise.resolve());
  const publishingRef = useRef(false);

  // Nettoyage au démontage : supprime le brouillon d'autosave s'il a été abandonné
  // (l'utilisateur quitte sans valider) ou si « Créer » a publié un autre document
  // (course). Évite l'accumulation de drafts orphelins invisibles en base.
  useEffect(() => {
    return () => {
      const draftId = autoSaveIdRef.current;
      if (!isEdit && draftId && draftId !== committedIdRef.current) {
        void deleteSetlist(draftId);
      }
    };
  }, [isEdit]);

  const loginFrom = isEdit ? `/setlists/${setlistId}/edit` : "/setlists/new";

  // Charge le planning pour proposer les séances
  useEffect(() => { loadPlanningData().then(setPlanning); }, []);

  // Séances de la catégorie choisie (clé = date|moment)
  const categorySeances = useMemo<(SetlistSeance & { key: string })[]>(() => {
    if (!planning || !category) return [];
    return setlistSeances(planning)
      .filter((s) => s.category === category)
      .map((s) => ({ ...s, key: `${s.date}|${s.moment ?? ""}` }));
  }, [planning, category]);

  // Présidents distincts des séances de la catégorie — alimente le champ Présidence.
  // Dédup par nom normalisé (accents/casse/ponctuation) → pas de "Paul W." ET "Paul W".
  const categoryLeaders = useMemo<string[]>(() => {
    const seen = new Map<string, string>(); // clé normalisée → première graphie
    for (const s of categorySeances) {
      const lead = s.leader.trim();
      if (!lead) continue;
      const k = normalizeName(lead);
      if (!seen.has(k)) seen.set(k, lead);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, "fr"));
  }, [categorySeances]);

  // Édition : si la présidence enregistrée n'est pas dans la liste, saisie libre.
  const initApplied = useRef(false);
  useEffect(() => {
    if (!isEdit || !planning || initApplied.current) return;
    initApplied.current = true;
    if (initial?.leader && !categoryLeaders.includes(initial.leader)) setLeaderOther(true);
  }, [isEdit, planning, categoryLeaders, initial]);

  const onCategoryChange = (c: string) => {
    setCategory(c);
    setLeaderOther(false);
    setMoment(undefined);
    setLeader("");
  };

  // Titre auto (éditable) tant qu'il est vide : "Catégorie JJ/MM [Soir]".
  const fillTitleIfEmpty = (dateISO: string, mom: "matin" | "soir" | undefined) => {
    if (!dateISO || title.trim() || !category) return;
    const catLabel = t("categories." + category, { defaultValue: category });
    const [, mm, dd] = dateISO.split("-");
    const m = mom ? (mom === "soir" ? " Soir" : " Matin") : "";
    setTitle(`${catLabel} ${dd}/${mm}${m}`);
  };

  // Présidence : un président de séance (pré-remplit la date avec sa prochaine
  // séance, modifiable), ou « Autre » (saisie libre).
  const onLeaderSelect = (v: string) => {
    if (v === "__other__") { setLeaderOther(true); setLeader(""); return; }
    setLeaderOther(false);
    setLeader(v);
    const key = normalizeName(v);
    const mine = categorySeances.filter((s) => normalizeName(s.leader) === key);
    if (!mine.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = mine.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = mine.filter((s) => s.date < today).sort((a, b) => b.date.localeCompare(a.date));
    const pick = upcoming[0] ?? past[0];
    if (!pick) return;
    setDate(pick.date);
    setMoment(pick.moment);
    fillTitleIfEmpty(pick.date, pick.moment);
  };

  // Date manuelle : titre auto si encore vide.
  const onDateChange = (v: string) => {
    setDate(v);
    fillTitleIfEmpty(v, moment);
  };

  // Premier champ obligatoire manquant ("" si complet).
  function missingField(): string {
    if (!title.trim()) return t("setlists.form.titleRequired");
    if (!date) return t("setlists.form.dateRequired");
    if (!leader.trim()) return t("setlists.form.leaderRequired");
    if (!category) return t("setlists.form.categoryRequired");
    return "";
  }

  const payload = {
    title: title.trim(),
    leader: leader.trim(),
    category,
    date,
    moment,
    language: detectSetlistLanguage(items),
    notes: notes.trim(),
    items: buildSetlistItems(items),
    isPrivate,
    // Création : le créateur devient propriétaire. Modification : on conserve le propriétaire.
    ownerId: isEdit ? ownerId : (user?.uid ?? null),
  };
  const payloadJson = JSON.stringify(payload);
  const invalidReason = isEdit ? missingField() : "";
  // Dernier état, lu par les minuteries et en quittant la page. L'objet
  // lui-même est envoyé (et non son JSON) : un `moment` retiré doit partir à
  // null pour effacer l'ancien.
  const latestRef = useRef({ json: payloadJson, valid: !invalidReason, payload });
  useEffect(() => {
    latestRef.current = { json: payloadJson, valid: !invalidReason, payload };
  });

  // Création : brouillon invisible dans les listes tant que « Publier » n'a pas été touché.
  useEffect(() => {
    if (isEdit) return;
    if (!user) return;
    if (!title.trim() || !category) return;
    const timer = setTimeout(() => {
      draftChainRef.current = draftChainRef.current.then(async () => {
        if (publishingRef.current) return;
        setAutoSaving(true);
        try {
          const draft = { ...latestRef.current.payload, isDraft: true };
          if (autoSaveIdRef.current) {
            await updateSetlist(autoSaveIdRef.current, draft);
          } else {
            const id = await createSetlist(draft);
            autoSaveIdRef.current = id;
            setAutoSaveId(id);
          }
          setLastSaved(new Date());
        } catch {
          // silently ignore auto-save errors
        } finally {
          setAutoSaving(false);
        }
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [isEdit, payloadJson, title, category, user]);

  // Modification : état enregistré (au montage, celui qui a été chargé).
  const savedJsonRef = useRef(payloadJson);
  const savedOnceRef = useRef(false);
  // Historique : le passage part de l'état chargé, écrit dans le format de
  // l'éditeur (comparer au document brut ferait apparaître de faux changements).
  const historyPassRef = useRef<HistoryPass | null>(null);
  const baselineJsonRef = useRef(payloadJson);

  // Les enregistrements se suivent : un envoi plus ancien ne peut pas arriver après un plus récent.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  /** Envoie l'état courant s'il diffère de l'enregistré (modification seulement). */
  const saveEdit = useCallback(() => {
    saveChainRef.current = saveChainRef.current.then(async () => {
      const { json, valid, payload: next } = latestRef.current;
      if (!isEdit || !setlistId || !valid || json === savedJsonRef.current) return;
      setAutoSaving(true);
      try {
        await updateSetlist(setlistId, { ...next, isDraft: false });
        savedJsonRef.current = json;
        savedOnceRef.current = true;
        setLastSaved(new Date());
        setAutoSaveError(false);
        const author = historyAuthor(profileRef.current);
        if (author) {
          historyPassRef.current ??= { setlistId, author, baseline: JSON.parse(baselineJsonRef.current) };
          await recordHistory(historyPassRef.current, next);
        }
      } catch {
        setAutoSaveError(true);
      } finally {
        setAutoSaving(false);
      }
    });
    return saveChainRef.current;
  }, [isEdit, setlistId]);

  useEffect(() => {
    if (!isEdit || invalidReason || payloadJson === savedJsonRef.current) return;
    const timer = setTimeout(() => void saveEdit(), 2000);
    return () => clearTimeout(timer);
  }, [isEdit, invalidReason, payloadJson, saveEdit]);

  // Quitter l'éditeur : le changement pas encore parti est envoyé, puis
  // l'équipe est prévenue si la setlist est prête (le serveur n'envoie qu'une fois).
  useEffect(() => {
    if (!isEdit) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (latestRef.current.valid && latestRef.current.json !== savedJsonRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      void saveEdit().then(() => {
        if (savedOnceRef.current && setlistId && !JSON.parse(savedJsonRef.current).isPrivate) {
          void notifySetlistReady(setlistId);
        }
      });
    };
  }, [isEdit, saveEdit, setlistId]);

  async function finishEdit() {
    await saveEdit();
    router.push(`/setlists/${setlistId}`);
  }

  // ── Song search ────────────────────────────────────────
  const addedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const item of items) {
      if (isFormTransition(item)) continue;
      if (isFormFusion(item)) {
        for (const s of item.songs) slugs.add(s.song.slug);
      } else {
        slugs.add(item.song.slug);
      }
    }
    return slugs;
  }, [items]);

  const availableSongs = useMemo(
    () => songs.filter((s) => !addedSlugs.has(s.slug)),
    [songs, addedSlugs]
  );
  const fuse = useMemo(
    () => new Fuse(availableSongs, { keys: ["title", "titlePinyin", "artist"], threshold: 0.4 }),
    [availableSongs]
  );
  const searchResults = useMemo(
    () =>
      query.trim()
        ? fuse.search(query.trim()).map((r) => r.item).slice(0, 20)
        : availableSongs,
    [query, fuse, availableSongs]
  );

  const sensors = useDefaultSensors();

  // ── Song actions ───────────────────────────────────────
  function addSong(song: SongIndexEntry) {
    setItems((prev) => [
      ...prev,
      // Un chant ajouté démarre dans la tonalité recommandée (la plus chantée à GCC).
      { uid: nextUid(), song, keyOverride: song.recommendedKey ?? null, notes: "", sectionItems: makeDefaultSections(song.sections ?? []) },
    ]);
    setExpandedSlug(null);
  }

  function addTransition() {
    setItems((prev) => [...prev, { uid: nextUid(), kind: "transition" as const, text: "" }]);
  }

  function patchTransition(uid: string, text: string) {
    setItems((prev) => prev.map((i) => (i.uid === uid && isFormTransition(i) ? { ...i, text } : i)));
  }

  function patch(uid: string, update: Partial<FormItem>) {
    setItems((prev) =>
      prev.map((i) => (i.uid === uid && !isFormFusion(i) && !isFormTransition(i) ? { ...i, ...update } : i))
    );
  }

  function patchFusionSong(fusionUid: string, songUid: string, update: Partial<FormItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== fusionUid || !isFormFusion(item)) return item;
        return { ...item, songs: item.songs.map((s) => (s.uid === songUid ? { ...s, ...update } : s)) };
      })
    );
  }

  function patchFusionMixed(fusionUid: string, mixed: FusionMixedSectionForm[] | null) {
    setItems((prev) =>
      prev.map((item) =>
        item.uid === fusionUid && isFormFusion(item) ? { ...item, mixedStructure: mixed } : item
      )
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.uid === active.id);
    const newIdx = items.findIndex((i) => i.uid === over.id);
    setItems(arrayMove(items, oldIdx, newIdx));
  }

  function toggleSelectSong(uid: string) {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  function mergeSongs() {
    const toMerge = items.filter(
      (i): i is FormItem => !isFormFusion(i) && !isFormTransition(i) && selectedUids.has(i.uid)
    );
    if (toMerge.length < 2) return;
    const firstIdx = items.findIndex((i) => i.uid === toMerge[0].uid);
    const fusion: FormFusionItem = { uid: nextUid(), kind: "fusion", songs: toMerge, mixedStructure: null };
    const remaining = items.filter((i) => !selectedUids.has(i.uid));
    remaining.splice(firstIdx, 0, fusion);
    setItems(remaining);
    setSelectedUids(new Set());
    setSelectMode(false);
  }

  function unfuse(fusionUid: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.uid === fusionUid);
      if (idx === -1) return prev;
      const fusion = prev[idx] as FormFusionItem;
      const next = [...prev];
      next.splice(idx, 1, ...fusion.songs);
      return next;
    });
  }

  // ── Publier (création) ─────────────────────────────────
  async function publish() {
    setError("");
    const missing = missingField();
    if (missing) { setError(missing); return; }
    if (!user) {
      router.push(`/login?from=${loginFrom}`);
      return;
    }

    setSaving(true);
    publishingRef.current = true;
    try {
      await draftChainRef.current;
      const published = { ...payload, isDraft: false };
      const targetId = autoSaveIdRef.current;
      let savedId: string;
      if (targetId) {
        await updateSetlist(targetId, published);
        savedId = targetId;
      } else {
        savedId = await createSetlist(published);
      }
      committedIdRef.current = savedId;
      const author = historyAuthor(profile);
      if (author) await recordCreation(savedId, author);
      // Prévient automatiquement l'équipe si la setlist est prête (≥ 4 chants),
      // une seule fois. Ne bloque pas la navigation. Jamais pour une setlist
      // privée (brouillon personnel → ne doit pas notifier l'équipe planifiée).
      if (!isPrivate) void notifySetlistReady(savedId);
      router.push(`/setlists/${savedId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("setlists.form.errorDefault"));
      setSaving(false);
      publishingRef.current = false;
    }
  }

  const needsAuth = !user && !authLoading;

  // Catégories proposées : celles où le profil peut CRÉER (+ la catégorie actuelle en édition) — admins : toutes.
  // La régie ne peut pas créer de setlist de culte : exclue ici via creatableCategories.
  const myCats = isAdminUser(user)
    ? [...ALL_CATEGORIES]
    : profile
    ? creatableCategories(profile)
    : [];
  const allowedRestricted = RESTRICTED_CATEGORIES.filter(
    (c) => myCats.includes(c) || c === initial?.category
  );
  const allowedFree = FREE_CATEGORIES.filter(
    (c) => myCats.includes(c) || c === initial?.category
  );
  const selectableItems = items.filter((i): i is FormItem => !isFormFusion(i) && !isFormTransition(i));

  // Repère d'enregistrement, à côté du bouton principal (visible aussi sur téléphone).
  function saveStatus() {
    if (error) return <span className="text-destructive">{error}</span>;
    if (invalidReason) {
      const reason = invalidReason.charAt(0).toLowerCase() + invalidReason.slice(1);
      return <span className="text-destructive">{t("setlists.form.notSaved", { reason })}</span>;
    }
    if (autoSaving) return <span className="animate-pulse">{t("setlists.form.autoSaving")}</span>;
    if (autoSaveError) return <span className="text-destructive">{t("setlists.form.errorSaveDefault")}</span>;
    if (!lastSaved) return null;
    return (
      <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
        <Check className="h-3.5 w-3.5" aria-hidden />
        {t(isEdit ? "setlists.form.autoSaved" : "setlists.form.draftSaved")}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header sticky ── */}
      <div className={`sticky top-[var(--nav-h)] z-10 material-chrome shadow-[0_1px_0_hsl(var(--border))] px-4 py-2.5 flex items-center gap-3 transition-transform duration-300 ${scrollVisible ? "translate-y-0" : "-translate-y-[calc(100%+var(--nav-h))]"}`}>
        {isEdit ? (
          <button
            type="button"
            onClick={() => void finishEdit()}
            aria-label={t("common.buttons.back")}
            className="text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            ←
          </button>
        ) : (
          <Link
            href="/setlists"
            aria-label={t("common.buttons.back")}
            className="text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            ←
          </Link>
        )}
        <span className="font-semibold text-foreground text-sm truncate">
          {title.trim() || t(isEdit ? "setlists.form.titleEdit" : "setlists.form.titleNew")}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-36 space-y-6">
        <div className="space-y-5">
        {/* ── Carte Informations ── */}
        <div className="rounded-xl bg-card shadow-soft p-5 space-y-4">

          {/* Titre + Catégorie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="setlist-title" className="block text-sm font-medium text-foreground mb-1.5">
                {t("setlists.form.titleLabel")} <span className="text-destructive">*</span>
              </label>
              <input
                id="setlist-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("setlists.form.titlePlaceholder")}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 text-[16px] sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="setlist-category" className="block text-sm font-medium text-foreground mb-1.5">
                {t("setlists.form.categoryLabel")} <span className="text-destructive">*</span>
              </label>
              <select
                id="setlist-category"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 text-[16px] sm:text-sm"
              >
                <option value="">{t("setlists.form.categoryPlaceholder")}</option>
                <optgroup label={t("setlists.form.categoryGroupRestricted")}>
                  {allowedRestricted.map((c) => (
                    <option key={c} value={c}>{t("categories." + c, { defaultValue: c })}</option>
                  ))}
                </optgroup>
                <optgroup label={t("setlists.form.categoryGroupFree")}>
                  {allowedFree.map((c) => (
                    <option key={c} value={c}>{t("categories." + c, { defaultValue: c })}</option>
                  ))}
                </optgroup>
              </select>
              {needsAuth && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    {t("setlists.form.categoryRestrictedAuthWarning")}{" "}
                    <a href={`/login?from=${loginFrom}`} className="underline font-medium">
                      {t("common.header.login")}
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Présidence (présidents de séances) + Date (saisie manuelle). La date
              reste enregistrée → notifs « setlist prête » + Mes Services OK. */}
          {category && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Présidence : présidents de séances (noms seuls) */}
              <div>
                <label htmlFor="setlist-leader" className="block text-sm font-medium text-foreground mb-1.5">
                  {t("setlists.form.leaderLabel")} <span className="text-destructive">*</span>
                </label>
                <select
                  id="setlist-leader"
                  value={leaderOther ? "__other__" : leader}
                  onChange={(e) => onLeaderSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 text-[16px] sm:text-sm"
                >
                  <option value="">{t("setlists.form.presidencePlaceholder")}</option>
                  {categoryLeaders.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="__other__">{t("setlists.form.presidenceOther")}</option>
                </select>
                {leaderOther && (
                  <input
                    type="text"
                    value={leader}
                    onChange={(e) => setLeader(e.target.value)}
                    placeholder={t("setlists.form.leaderPlaceholder")}
                    className="mt-2 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 text-[16px] sm:text-sm"
                  />
                )}
              </div>

              {/* Date : saisie manuelle (+ matin/soir pour Campus) */}
              <div>
                <label htmlFor="setlist-date" className="block text-sm font-medium text-foreground mb-1.5">
                  {t("setlists.form.dateLabel")} <span className="text-destructive">*</span>
                </label>
                <input
                  id="setlist-date"
                  type="date"
                  value={date}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="w-full min-w-0 appearance-none px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 text-[16px] sm:text-sm"
                />
                {category === "Campus" && (
                  <select
                    value={moment ?? ""}
                    onChange={(e) => setMoment((e.target.value || undefined) as "matin" | "soir" | undefined)}
                    className="mt-2 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 text-[16px] sm:text-sm"
                  >
                    <option value="">—</option>
                    <option value="matin">Matin</option>
                    <option value="soir">Soir</option>
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Visibilité */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("setlists.form.visibilityLabel")}
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 transition-colors ${
                  !isPrivate ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Partagée
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 transition-colors border-l border-border ${
                  isPrivate ? "bg-violet-600 text-white" : "bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> Privée
              </button>
            </div>
            {isPrivate && !user && !authLoading && (
              <p className="mt-1.5 text-xs text-violet-700 dark:text-violet-400">
                {t("setlists.form.privateLoginRequired")}
              </p>
            )}
            {isPrivate && user && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("setlists.form.privateToggle")}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="setlist-notes" className="block text-sm font-medium text-foreground mb-1.5">
              {t("setlists.form.notesLabel")}
            </label>
            <textarea
              id="setlist-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t("setlists.form.notesPlaceholder")}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 text-[16px] sm:text-sm resize-none"
            />
          </div>
        </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium text-muted-foreground">
              {t("common.header.songs")}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addTransition}
                className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
              >
                + {t("setlists.form.addTransition")}
              </button>
              {selectableItems.length >= 2 && (
                selectMode ? (
                  <div className="flex items-center gap-2">
                    {selectedUids.size >= 2 && (
                      <button
                        type="button"
                        onClick={mergeSongs}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Link2 className="h-3 w-3" />
                        {t("setlists.form.mergeButton", { count: selectedUids.size })}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setSelectMode(false); setSelectedUids(new Set()); }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("setlists.form.cancelSelect")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectMode(true)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("setlists.form.selectMode")}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Recherche + résultats scrollables */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("setlists.form.searchSongsPlaceholder")}
                className="w-full pl-9 pr-8 py-2.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none text-sm border-b border-border [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {availableSongs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("setlists.form.allSongsAdded")}
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {searchResults.map((song) => (
                  <div key={song.slug}>
                    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                      <button
                        type="button"
                        onClick={() => setExpandedSlug(expandedSlug === song.slug ? null : song.slug)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <span className="text-sm font-medium text-foreground truncate">{song.title}</span>
                        {song.language === "zh" && (
                          <span className="shrink-0 text-xs text-muted-foreground">{t("common.languages.zh")}</span>
                        )}
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{song.recommendedKey ?? song.originalKey}</span>
                        {expandedSlug === song.slug
                          ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => addSong(song)}
                        className="shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-xs font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("common.buttons.add")}
                      </button>
                    </div>
                    {expandedSlug === song.slug && song.sections && song.sections.length > 0 && (
                      <div className="px-3 pb-2.5 flex flex-wrap gap-1.5 bg-muted/20">
                        {song.sections.map((s) => (
                          <span key={s.id} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setlist (chants ajoutés) */}
          {items.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.uid)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items.map((item) =>
                    isFormTransition(item) ? (
                      <TransitionRow
                        key={item.uid}
                        item={item}
                        onTextChange={(text) => patchTransition(item.uid, text)}
                        onRemove={() => setItems((prev) => prev.filter((i) => i.uid !== item.uid))}
                      />
                    ) : isFormFusion(item) ? (
                      <FusionRow
                        key={item.uid}
                        item={item}
                        onUnfuse={() => unfuse(item.uid)}
                        onRemove={() => setItems((prev) => prev.filter((i) => i.uid !== item.uid))}
                        onPatchSong={(songUid, update) => patchFusionSong(item.uid, songUid, update)}
                        onChangeMixed={(mixed) => patchFusionMixed(item.uid, mixed)}
                      />
                    ) : (
                      <SongRow
                        key={item.uid}
                        item={item}
                        selectable={selectMode}
                        selected={selectedUids.has(item.uid)}
                        onToggleSelect={() => toggleSelectSong(item.uid)}
                        onRemove={() => setItems((prev) => prev.filter((i) => i.uid !== item.uid))}
                        onKeyChange={(key) => patch(item.uid, { keyOverride: key })}
                        onNoteChange={(note) => patch(item.uid, { notes: note })}
                        onSectionItemsChange={(sectionItems) => patch(item.uid, { sectionItems })}
                        onJianpuSheetChange={(jianpuSheet) => patch(item.uid, { jianpuSheet })}
                        onLastPhrase={({ contentOverride, step }) =>
                          patch(item.uid, { contentOverride, sectionItems: [...item.sectionItems, step] })
                        }
                      />
                    )
                  )}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
              {t("setlists.form.emptySongs")}
            </p>
          )}
        </div>

      </div>

      {/* ── Barre d'action ── */}
      {/* z-50 : passe DEVANT la barre d'onglets mobile (z-40, fixed bottom-0
          elle aussi) — sinon le bouton est caché derrière. Fond opaque pour
          que les onglets ne transparaissent pas. */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background">
        <div
          className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <p role="status" className="flex-1 min-w-0 text-xs text-muted-foreground">
            {saveStatus()}
          </p>
          {isEdit ? (
            <button
              type="button"
              onClick={() => void finishEdit()}
              className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {t("setlists.form.done")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void publish()}
              disabled={saving}
              className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {t(saving ? "setlists.form.publishing" : "setlists.form.publish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
