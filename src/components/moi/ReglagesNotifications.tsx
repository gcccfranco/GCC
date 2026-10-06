"use client";

// Moi › Réglages › Notifications (lot U4 bis, B5, docs/spec-pages-en-grand.md, Q9) : la ligne
// dit si les notifications sont activées sur cet appareil et ouvre les réglages de `PushToggle`,
// qui ont quitté le profil (Q10). Feuille posée en bas sur téléphone (planche
// `notifications-telephone`), panneau à droite dès la tablette.

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import { Drawer, DrawerContent, DrawerOverlay, DrawerPortal, DrawerTitle } from "@/components/ui/drawer";
import { GroupRow } from "@/components/ui/group";
import { PushToggle } from "@/components/push/PushToggle";
import { isPushSupported, isSubscribed } from "@/lib/push/client";

export function ReglagesNotifications({ feuille }: { feuille: boolean }) {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  const [activees, setActivees] = useState<boolean | null>(null);

  const lire = useCallback(() => {
    (isPushSupported() ? isSubscribed() : Promise.resolve(false)).then(setActivees, () => setActivees(false));
  }, []);
  useEffect(lire, [lire]);

  const changer = (o: boolean) => {
    setOuvert(o);
    if (!o) lire(); // l'interrupteur a pu changer dans le panneau
  };

  const titre = t("moi.notifications");
  const contenu = (
    <>
      <DrawerTitle className="px-4 pb-3 pt-4 text-xl font-bold">{titre}</DrawerTitle>
      <div className="overflow-y-auto px-4 pb-[calc(1.5rem+var(--sab,0px))]">
        <PushToggle />
      </div>
    </>
  );

  return (
    <>
      <GroupRow
        onClick={() => setOuvert(true)}
        leading={<Bell />}
        trailing={activees === null ? undefined : activees ? t("moi.activees") : t("moi.desactivees")}
        chevron
      >
        {titre}
      </GroupRow>
      {feuille ? (
        <Drawer open={ouvert} onOpenChange={changer}>
          <DrawerContent aria-describedby={undefined} className="max-h-[88vh] bg-secondary">
            {contenu}
          </DrawerContent>
        </Drawer>
      ) : (
        <Drawer direction="right" shouldScaleBackground={false} open={ouvert} onOpenChange={changer}>
          <DrawerPortal>
            <DrawerOverlay />
            <DrawerPrimitive.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-[90vw] flex-col bg-secondary pt-[var(--sat,0px)] shadow-2xl outline-none"
            >
              {contenu}
            </DrawerPrimitive.Content>
          </DrawerPortal>
        </Drawer>
      )}
    </>
  );
}
