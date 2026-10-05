"use client";

// L'administration d'avant le Back-Office, servie tant que l'interrupteur est coupé (en
// ligne). Lot U6, B2 : ses blocs vivent dans `src/components/admin/`, chacun à sa place du
// Back-Office (table Q3) ; cette page les assemble encore en onglets, comme avant. Tous
// les blocs sont montés (onglets masqués par `hidden`) : leurs données se chargent dès
// l'ouverture et les pastilles des onglets sont justes, comme avant.
import { useCallback, useState } from "react";
import { CalendarDays, DoorOpen, Inbox, MessageSquareHeart, Network, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { SurveyResults } from "@/components/admin/SurveyResults";
import { Reception } from "@/components/admin/Reception";
import { Personnes } from "@/components/admin/Personnes";
import { InscriptionsComptes } from "@/components/admin/InscriptionsComptes";
import { ImportPlanning } from "@/components/admin/ImportPlanning";
import { SansCompte } from "@/components/admin/SansCompte";
import { ImportEquipes } from "@/components/admin/ImportEquipes";
import { ReserveAuxAdmins } from "@/components/admin/commun";

type AdminTab = "reception" | "membres" | "inscriptions" | "planning" | "equipes" | "questionnaire";

export function AncienneAdmin() {
  const { user, loading } = useProfile();
  const admin = isAdminUser(user);
  const [tab, setTab] = useState<AdminTab>("membres");
  const [enAttente, setEnAttente] = useState(0);
  const [inscrits, setInscrits] = useState(0);
  const [sansCompte, setSansCompte] = useState(0);
  const surEnAttente = useCallback((n: number) => setEnAttente(n), []);
  const surInscrits = useCallback((n: number) => setInscrits(n), []);
  const surSansCompte = useCallback((n: number) => setSansCompte(n), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user || !admin) return <ReserveAuxAdmins connecte={!!user} retour="/admin" />;

  const TABS: { key: AdminTab; label: string; Icon: LucideIcon; count?: number; always?: boolean }[] = [
    { key: "reception", label: "Réception", Icon: Inbox, count: enAttente },
    { key: "membres", label: "Membres", Icon: Users, count: inscrits, always: true },
    { key: "inscriptions", label: "Inscriptions", Icon: DoorOpen },
    { key: "planning", label: "Planning", Icon: CalendarDays, count: sansCompte },
    { key: "equipes", label: "Équipes", Icon: Network },
    { key: "questionnaire", label: "Questionnaire", Icon: MessageSquareHeart },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-bold text-foreground">Administration</h1>
        </div>

        {/* ── Onglets ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {TABS.map(({ key, label, Icon, count, always }) => {
            const active = tab === key;
            const showCount = count !== undefined && (always || count > 0);
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {showCount && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : always
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div hidden={tab !== "reception"}><Reception onEnAttente={surEnAttente} /></div>
        <div hidden={tab !== "membres"}><Personnes onCompte={surInscrits} /></div>
        <div hidden={tab !== "inscriptions"}><InscriptionsComptes /></div>
        <div hidden={tab !== "planning"} className="space-y-5">
          {BACK_OFFICE && <ImportPlanning />}
          <SansCompte onCompte={surSansCompte} />
        </div>
        <div hidden={tab !== "equipes"}>{BACK_OFFICE && <ImportEquipes />}</div>
        {tab === "questionnaire" && <SurveyResults />}
      </div>
    </div>
  );
}
