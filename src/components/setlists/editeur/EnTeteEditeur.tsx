"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarDays, ChevronDown, Globe, Lock, Mic, Pencil } from "lucide-react";
import { categoryColor } from "@/lib/serviceColors";

// En-tête compact de l'éditeur (lot U5 bis, T3, Q5) : le formulaire devient l'en-tête de la
// colonne setlist — titre modifiable, puces Catégorie · Date (+ Matin / Soir au Campus) ·
// Présidence · Visibilité, ligne « Notes pour l'équipe ». Les règles des champs restent
// celles de SetlistForm (titre automatique, présidence du planning, « Autre »).

export interface ChampsEnTete {
  isEdit: boolean;
  title: string;
  setTitle: (v: string) => void;
  category: string;
  onCategoryChange: (c: string) => void;
  categoriesReservees: string[];
  categoriesLibres: string[];
  date: string;
  onDateChange: (v: string) => void;
  moment: "matin" | "soir" | undefined;
  setMoment: (m: "matin" | "soir" | undefined) => void;
  leader: string;
  setLeader: (v: string) => void;
  leaderOther: boolean;
  categoryLeaders: string[];
  onLeaderSelect: (v: string) => void;
  isPrivate: boolean;
  setIsPrivate: (v: boolean) => void;
  notes: string;
  setNotes: (v: string) => void;
  /** Pas connecté : la catégorie demande une connexion. */
  needsAuth: boolean;
  /** Connecté, ou chargement fini sans compte (message de la setlist privée). */
  connecte: boolean;
  authLoading: boolean;
  loginFrom: string;
}

const puce =
  "relative inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background pl-3.5 pr-9 text-sm font-semibold text-foreground focus-within:ring-2 focus-within:ring-ring/40";
// `field-sizing` : la puce prend la largeur du choix affiché, pas celle de la plus longue option.
const selectDePuce = "appearance-none bg-transparent pr-0 focus:outline-none cursor-pointer [field-sizing:content]";

function Chevron() {
  return <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />;
}

function Puce({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <span className={puce}>
      {icone}
      {children}
      <Chevron />
    </span>
  );
}

/** « Dim. 18 octobre » (fr), « 10月18日周日 » (中文). */
function jourCourt(iso: string, langue: string): string {
  if (!iso) return "";
  const texte = new Intl.DateTimeFormat(langue === "zh-CN" ? "zh-CN" : "fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T12:00:00`));
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export function EnTeteEditeur({ champs: c }: { champs: ChampsEnTete }) {
  const { t, i18n } = useTranslation();
  const titreRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3.5">
      <nav aria-label={t("setlists.editeur.fil")} className="text-[13px] text-muted-foreground">
        <Link href="/setlists" className="hover:text-foreground hover:underline">{t("common.header.setlists")}</Link>
        <span aria-hidden> › </span>
        <span>{t(c.isEdit ? "setlists.form.titleEdit" : "setlists.form.titleNew")}</span>
      </nav>

      <div className="flex items-center gap-2">
        <input
          ref={titreRef}
          type="text"
          value={c.title}
          onChange={(e) => c.setTitle(e.target.value)}
          aria-label={t("setlists.form.titleLabel")}
          placeholder={t("setlists.form.titlePlaceholder")}
          className="min-w-0 max-w-full rounded-lg bg-transparent text-[28px] [field-sizing:content] font-bold leading-tight tracking-tight text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => titreRef.current?.focus()}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Puce icone={<span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.category ? categoryColor(c.category) : "hsl(var(--muted-foreground))" }} aria-hidden />}>
          <select
            value={c.category}
            onChange={(e) => c.onCategoryChange(e.target.value)}
            aria-label={t("setlists.form.categoryLabel")}
            className={selectDePuce}
          >
            <option value="">{t("setlists.form.categoryPlaceholder")}</option>
            <optgroup label={t("setlists.form.categoryGroupRestricted")}>
              {c.categoriesReservees.map((cat) => (
                <option key={cat} value={cat}>{t("categories." + cat, { defaultValue: cat })}</option>
              ))}
            </optgroup>
            <optgroup label={t("setlists.form.categoryGroupFree")}>
              {c.categoriesLibres.map((cat) => (
                <option key={cat} value={cat}>{t("categories." + cat, { defaultValue: cat })}</option>
              ))}
            </optgroup>
          </select>
        </Puce>

        {c.category && (
          <>
            {/* Date : le jour écrit en clair ; le champ de date, transparent, est posé dessus. */}
            <span className={puce}>
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span aria-hidden>{jourCourt(c.date, i18n.language) || t("setlists.form.dateLabel")}</span>
              <input
                ref={dateRef}
                type="date"
                value={c.date}
                onChange={(e) => c.onDateChange(e.target.value)}
                onClick={() => {
                  try { dateRef.current?.showPicker(); } catch { /* navigateur sans showPicker */ }
                }}
                aria-label={t("setlists.form.dateLabel")}
                className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
              />
              <Chevron />
            </span>

            {c.category === "Campus" && (
              <Puce icone={null}>
                <select
                  value={c.moment ?? ""}
                  onChange={(e) => c.setMoment((e.target.value || undefined) as "matin" | "soir" | undefined)}
                  aria-label={t("setlists.entree.moment")}
                  className={selectDePuce}
                >
                  <option value="">—</option>
                  <option value="matin">{t("setlists.entree.matin")}</option>
                  <option value="soir">{t("setlists.entree.soir")}</option>
                </select>
              </Puce>
            )}

            <Puce icone={<Mic className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}>
              <select
                value={c.leaderOther ? "__other__" : c.leader}
                onChange={(e) => c.onLeaderSelect(e.target.value)}
                aria-label={t("setlists.form.leaderLabel")}
                className={selectDePuce}
              >
                <option value="">{t("setlists.form.presidencePlaceholder")}</option>
                {c.categoryLeaders.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="__other__">{t("setlists.form.presidenceOther")}</option>
              </select>
            </Puce>
            {c.leaderOther && (
              <input
                type="text"
                value={c.leader}
                onChange={(e) => c.setLeader(e.target.value)}
                aria-label={t("setlists.editeur.nomPresidence")}
                placeholder={t("setlists.form.leaderPlaceholder")}
                className="h-10 w-40 rounded-full border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            )}
          </>
        )}

        <Puce icone={c.isPrivate ? <Lock className="h-4 w-4 shrink-0 text-violet-600" aria-hidden /> : <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}>
          <select
            value={c.isPrivate ? "privee" : "partagee"}
            onChange={(e) => c.setIsPrivate(e.target.value === "privee")}
            aria-label={t("setlists.form.visibilityLabel")}
            className={selectDePuce}
          >
            <option value="partagee">{t("setlists.editeur.partagee")}</option>
            <option value="privee">{t("setlists.editeur.privee")}</option>
          </select>
        </Puce>
      </div>

      {c.needsAuth && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {t("setlists.form.categoryRestrictedAuthWarning")}{" "}
            <a href={`/login?from=${c.loginFrom}`} className="font-medium underline">{t("common.header.login")}</a>
          </span>
        </p>
      )}
      {c.isPrivate && (
        <p className={`text-xs ${c.connecte ? "text-muted-foreground" : "text-violet-700 dark:text-violet-400"}`}>
          {c.connecte ? t("setlists.form.privateToggle") : !c.authLoading ? t("setlists.form.privateLoginRequired") : null}
        </p>
      )}

      <label className="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 text-sm focus-within:ring-2 focus-within:ring-ring/30">
        <span className="shrink-0 text-muted-foreground">{t("setlists.editeur.notes")}</span>
        <input
          type="text"
          value={c.notes}
          onChange={(e) => c.setNotes(e.target.value)}
          placeholder={t("setlists.form.notesPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
      </label>
    </div>
  );
}
