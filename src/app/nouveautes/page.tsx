"use client";

import { useTranslation } from "react-i18next";
import { Sparkles, Plus, Wrench, ArrowUp } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { CHANGELOG, type ChangeCategory } from "@/data/changelog";

const CATEGORY_META: Record<
  ChangeCategory,
  { Icon: typeof Plus; className: string }
> = {
  added: {
    Icon: Plus,
    className: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  fixed: {
    Icon: Wrench,
    className: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  improved: {
    Icon: ArrowUp,
    className: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
};

export default function NouveautesPage() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh-CN";
  const fmt = new Intl.DateTimeFormat(isZh ? "zh-CN" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-6">
          <header className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">{t("nouveautes.title")}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{t("nouveautes.subtitle")}</p>
          </header>

          {CHANGELOG.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("nouveautes.empty")}</p>
          ) : (
            <div className="space-y-5">
              {CHANGELOG.map((entry) => (
                <section key={entry.date} className="rounded-xl bg-card shadow-soft p-4 space-y-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-foreground capitalize">
                      {fmt.format(new Date(entry.date))}
                    </h2>
                    {entry.version && (
                      <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                        {entry.version}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2.5">
                    {entry.changes.map((c, i) => {
                      const { Icon, className } = CATEGORY_META[c.category];
                      return (
                        <li key={i} className="flex items-start gap-2.5">
                          <span
                            className={`shrink-0 mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${className}`}
                          >
                            <Icon className="h-3 w-3" />
                            {t(`nouveautes.categories.${c.category}`)}
                          </span>
                          <span className="text-sm text-foreground/90 leading-relaxed">
                            {isZh ? c.zh : c.fr}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
