"use client";

// La cloche des notifications (sortie de la Navbar au lot U4) : la même dans la barre du
// haut et dans la barre latérale. Les données viennent du hook partagé (une seule
// cloche interroge Firestore, voir NotificationsPartagees).
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import type { NotificationItem } from "@/hooks/useNotifications";
import { useNotificationsPartagees } from "@/components/layout/NotificationsPartagees";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOTIF_KIND_KEYS: Record<NotificationItem["kind"], string> = {
  "annonce": "notifications.annonce",
  "setlist-created": "notifications.setlistCreated",
  "setlist-updated": "notifications.setlistUpdated",
  "manual": "notifications.manual",
  "reminder": "notifications.reminder",
  "broadcast": "notifications.broadcast",
  "presentation": "notifications.presentation",
  "scene": "notifications.scene",
  "evenement": "notifications.evenement",
  "tache": "notifications.tache",
};

export function Cloche({
  boutonClassName,
  side = "bottom",
  align = "end",
  sideOffset,
}: {
  /** Forme du bouton, propre à chaque barre. */
  boutonClassName: string;
  /** Côté où s'ouvre le menu : sous la navbar, à côté de la barre latérale. */
  side?: "bottom" | "right";
  align?: "start" | "end";
  /** Écart entre le bouton et le menu (barre latérale : jusqu'à son bord). */
  sideOffset?: number;
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh-CN";
  const { items: notifItems, unreadCount, markAllSeen } = useNotificationsPartagees();

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) markAllSeen(); }}>
      <DropdownMenuTrigger asChild>
        <button aria-label={t("notifications.title")} className={`relative ${boutonClassName}`}>
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} sideOffset={sideOffset} className="w-80 max-w-[90vw]">
        <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {notifItems.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              {t("notifications.empty")}
            </p>
          ) : (
            notifItems.map((n) => (
              <DropdownMenuItem key={n.id} asChild>
                <Link href={n.href} className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium text-foreground truncate w-full">
                    {n.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(NOTIF_KIND_KEYS[n.kind])}
                    {n.category && (
                      <>
                        {" · "}
                        {t("categories." + n.category, { defaultValue: n.category })}
                      </>
                    )}
                    {" · "}
                    {new Intl.DateTimeFormat(isZh ? "zh-CN" : "fr-FR", {
                      day: "numeric",
                      month: "short",
                    }).format(n.date)}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
