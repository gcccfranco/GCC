"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { arrayMove } from "@dnd-kit/sortable";
import { Check } from "lucide-react";
import {
  RESTRICTED_CATEGORIES,
  ALL_CATEGORIES,
  authHeader,
  createSetlist,
  updateSetlist,
  deleteSetlist,
} from "@/lib/firebase/setlists";
import { useProfile } from "@/lib/firebase/users";
import { creatableCategories, isAdminUser } from "@/lib/access";
import { loadPlanningData, setlistSeances, normalizeName, type PlanningData, type SetlistSeance } from "@/lib/planning/names";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { DragEndEvent } from "@dnd-kit/core";
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
import type { SectionsOf } from "@/lib/setlist/history";
import type { SongIndexEntry } from "@/types/song";
import { nextUid } from "@/lib/uid";
import type { Preremplissage } from "@/lib/setlist/prochainsServices";

import { FREE_CATEGORIES } from "@/lib/firebase/setlists";
import { useEditeurDeuxColonnes } from "@/hooks/useEditeurDeuxColonnes";
import { EditeurDeuxColonnes, type ProprietesEditeur } from "@/components/setlists/editeur/EditeurDeuxColonnes";
import { EditeurFeuilles } from "@/components/setlists/editeur/EditeurFeuilles";

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
  /** Création depuis « Pour quel service ? » (lot U5 bis) : catégorie, date et
   *  moment du service ; la présidence est relue au planning. Lu au montage. */
  prefill?: Preremplissage;
}

/** Titre automatique « Catégorie JJ/MM [Soir] » (éditable). */
function titreAuto(t: TFunction, category: string, dateISO: string, mom: "matin" | "soir" | undefined): string {
  const catLabel = t("categories." + category, { defaultValue: category });
  const [, mm, dd] = dateISO.split("-");
  const m = mom ? (mom === "soir" ? " Soir" : " Matin") : "";
  return `${catLabel} ${dd}/${mm}${m}`;
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

export function SetlistForm({ mode, setlistId, songs, initial, prefill }: SetlistFormProps) {
  // Ordinateur et tablette en paysage : la piste 2 en deux colonnes (lot U5 bis, T3) ;
  // téléphone et tablette en portrait : la liste en grand et des feuilles (T4).
  const deuxColonnes = useEditeurDeuxColonnes();
  const isEdit = mode === "edit";
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useProfile();
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // ── Form state ──────────────────────────────────────────
  const [title, setTitle] = useState(
    initial?.title ??
      (prefill?.category && prefill.date ? titreAuto(t, prefill.category, prefill.date, prefill.moment) : ""),
  );
  const [date, setDate] = useState(initial?.date ?? prefill?.date ?? new Date().toISOString().split("T")[0]);
  const [leader, setLeader] = useState(initial?.leader ?? "");
  const [category, setCategory] = useState(initial?.category ?? prefill?.category ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [items, setItems] = useState<FormListItem[]>(initial?.items ?? []);
  const [moment, setMoment] = useState<"matin" | "soir" | undefined>(initial?.moment ?? prefill?.moment);
  const ownerId = initial?.ownerId ?? null;

  // ── Sélecteurs planning : présidence (liste) + date (manuelle) ───────────
  const [planning, setPlanning] = useState<PlanningData | null>(null);
  const [leaderOther, setLeaderOther] = useState(false);  // présidence hors liste (saisie libre)

  // ── UI state ────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        // `deleteSetlist` lève désormais sur un refus (lot 10) : personne
        // n'attend ce nettoyage, on ne laisse pas la promesse rejeter seule.
        void deleteSetlist(draftId).catch(() => {});
      }
    };
  }, [isEdit]);

  const loginFrom = isEdit ? `/setlists/${setlistId}/edit` : "/setlists/new";

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
    setTitle(titreAuto(t, category, dateISO, mom));
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

  // Création : le brouillon part au premier changement (un chant, un champ),
  // pas au préremplissage (docs/spec-editeur-setlist.md, Q4) — ouvrir
  // « Préparer » puis fermer l'onglet ne laisse rien en base. L'état de départ
  // est repris quand la présidence arrive du planning.
  const pristineJsonRef = useRef(payloadJson);
  const rebaselineRef = useRef(false);
  const touchedRef = useRef(false);

  // Création : brouillon invisible dans les listes tant que « Publier » n'a pas été touché.
  useEffect(() => {
    if (isEdit) return;
    if (rebaselineRef.current) {
      rebaselineRef.current = false;
      pristineJsonRef.current = payloadJson;
    }
    if (!touchedRef.current && payloadJson === pristineJsonRef.current) return;
    touchedRef.current = true;
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

  // Charge le planning pour proposer les séances. Création préremplie
  // (« Préparer ») : la présidence du service y est relue, dans la graphie de
  // la liste des présidences ; ce n'est pas un changement (pas de brouillon).
  const prefillRef = useRef(prefill);
  useEffect(() => {
    loadPlanningData().then((p) => {
      setPlanning(p);
      const pre = prefillRef.current;
      if (!pre?.category || !pre.date || latestRef.current.payload.leader) return;
      const seances = setlistSeances(p).filter((s) => s.category === pre.category);
      const nom = seances
        .find((s) => s.date === pre.date && (s.moment ?? null) === (pre.moment ?? null))
        ?.leader.trim();
      if (!nom) return;
      const graphie = seances.map((s) => s.leader.trim()).find((l) => normalizeName(l) === normalizeName(nom)) ?? nom;
      setLeader(graphie);
      rebaselineRef.current = true;
    });
  }, []);

  // Modification : état enregistré (au montage, celui qui a été chargé).
  const savedJsonRef = useRef(payloadJson);
  const savedOnceRef = useRef(false);
  // Historique : le passage part de l'état chargé, écrit dans le format de
  // l'éditeur (comparer au document brut ferait apparaître de faux changements).
  const historyPassRef = useRef<HistoryPass | null>(null);
  const baselineJsonRef = useRef(payloadJson);
  // Sections des chants (avant / après des structures), à jour des chants reçus.
  const sectionsOfRef = useRef<SectionsOf>(() => undefined);
  useEffect(() => {
    sectionsOfRef.current = (slug) => songs.find((s) => s.slug === slug)?.sections;
  });

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
          await recordHistory(historyPassRef.current, next, sectionsOfRef.current);
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

  // ── Song actions ───────────────────────────────────────
  function addSong(song: SongIndexEntry) {
    setItems((prev) => [
      ...prev,
      // Un chant ajouté démarre dans la tonalité recommandée (la plus chantée à GCC).
      { uid: nextUid(), song, keyOverride: song.recommendedKey ?? null, notes: "", sectionItems: makeDefaultSections(song.sections ?? []) },
    ]);
  }

  function addTransition() {
    const uid = nextUid();
    setItems((prev) => [...prev, { uid, kind: "transition" as const, text: "" }]);
    return uid;
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

  const proprietes: ProprietesEditeur = {
    isEdit,
    items,
    setItems,
    songs,
    champs: {
      isEdit,
      title,
      setTitle,
      category,
      onCategoryChange,
      categoriesReservees: allowedRestricted,
      categoriesLibres: allowedFree,
      date,
      onDateChange,
      moment,
      setMoment,
      leader,
      setLeader,
      leaderOther,
      categoryLeaders,
      onLeaderSelect,
      isPrivate,
      setIsPrivate,
      notes,
      setNotes,
      needsAuth,
      connecte: !!user,
      authLoading,
      loginFrom,
    },
    actions: {
      addSong,
      addTransition,
      patch,
      patchTransition,
      patchFusionSong,
      patchFusionMixed,
      unfuse,
      onDragEnd: handleDragEnd,
    },
    statut: saveStatus(),
    saving,
    onPublier: () => void publish(),
    onTerminer: () => void finishEdit(),
  };

  return deuxColonnes ? <EditeurDeuxColonnes {...proprietes} /> : <EditeurFeuilles {...proprietes} />;
}
