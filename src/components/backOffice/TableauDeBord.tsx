"use client";

// Tableau de bord du Back-Office (lot U6, B4, docs/spec-back-office.md § Widgets) : la
// disposition de `backOffice/{uid}` (sinon le défaut du rôle, Q11), en grille de 4, 2 ou 1
// colonne selon l'appareil (Q10). Personnaliser arrive avec B5.
import { useTranslation } from "react-i18next";
import { lirePreferencesBackOffice } from "@/lib/firebase/backOffice";
import { useProfile } from "@/lib/firebase/users";
import { dispositionAffichee } from "@/lib/tableauDeBord/disposition";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget, WidgetId } from "@/types/backOffice";
import { GRILLE_WIDGETS, Message } from "./widgets/Cadre";
import { WidgetAFaire } from "./widgets/WidgetAFaire";
import { WidgetCasesVides } from "./widgets/WidgetCasesVides";
import { WidgetComptes } from "./widgets/WidgetComptes";
import { WidgetDimanche } from "./widgets/WidgetDimanche";
import { WidgetEvenements } from "./widgets/WidgetEvenements";
import { WidgetPetitDej } from "./widgets/WidgetPetitDej";
import { WidgetRaccourcis } from "./widgets/WidgetRaccourcis";
import { WidgetScene } from "./widgets/WidgetScene";
import { WidgetSetlists } from "./widgets/WidgetSetlists";

/** Calendrier (U8) et Chants les plus joués (U7) arrivent avec leur lot (Q17). */
const COMPOSANTS: Record<WidgetId, ((p: { widget: Widget }) => React.ReactNode) | null> = {
  dimanche: WidgetDimanche,
  calendrier: null,
  afaire: WidgetAFaire,
  setlists: WidgetSetlists,
  planning: WidgetCasesVides,
  evenements: WidgetEvenements,
  chants: null,
  petitdej: WidgetPetitDej,
  scene: WidgetScene,
  comptes: WidgetComptes,
  raccourcis: WidgetRaccourcis,
};

export function TableauDeBord() {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const uid = user?.uid ?? "";
  // Enveloppé : `null` = lecture en cours ; `{ prefs: null }` = pas de document.
  const { valeur } = useLecture(async () => ({ prefs: uid ? await lirePreferencesBackOffice(uid) : null }), uid);

  if (!valeur) return <Message>{t("common.loading")}</Message>;
  const widgets = dispositionAffichee(valeur.prefs, user, profile);
  if (widgets.length === 0) return <Message>{t("tableauDeBord.aucunWidget")}</Message>;
  return (
    <div data-testid="grille-widgets" className={GRILLE_WIDGETS}>
      {widgets.map((w) => {
        const Composant = COMPOSANTS[w.id];
        return Composant ? <Composant key={w.id} widget={w} /> : null;
      })}
    </div>
  );
}
