"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

/** Les menus du mode louange (FS-B) : un seul est ouvert à la fois (`popoverOuvert` de PerformanceMode). */
export type MenuId = "setlist" | "reperes" | "outils" | "options" | "tempo";

/** Largeur de la dernière disposition où les menus sont des feuilles du bas (md de Tailwind). */
const MD = "(min-width: 768px)";

function useAuMoinsMd(): boolean {
  const [md, setMd] = useState(() => {
    try { return window.matchMedia(MD).matches; } catch { return true; }
  });
  useEffect(() => {
    let mq: MediaQueryList;
    try { mq = window.matchMedia(MD); } catch { return; }
    const maj = () => setMd(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);
  return md;
}

/** Zone qui défile dans la hauteur disponible ; un fondu léger en bas tant qu'il reste du contenu dessous. */
function ZoneDefilante({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fondu, setFondu] = useState(false);
  const maj = useCallback(() => {
    const el = ref.current;
    if (el) setFondu(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  }, []);
  useEffect(() => {
    maj();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [maj]);
  const masque = "linear-gradient(to bottom, black calc(100% - 2rem), transparent)";
  return (
    <div
      ref={ref}
      onScroll={maj}
      className={className}
      style={fondu ? { maskImage: masque, WebkitMaskImage: masque } : undefined}
    >
      <div>{children}</div>
    </div>
  );
}

/** Un menu de la barre de titre : à partir de md un popover sous son icône (ancré sous la barre, à la verticale
 *  de l'icône), sous md une feuille depuis le bas. Rôle `dialog`, nom accessible = `titre`. Tout toucher dans le menu
 *  s'arrête ici (il ne tourne pas la page) ; le toucher dehors est géré par PerformanceMode (ferme sans tourner).
 *  `couleur` : `--couleur-icones` corrigée, reposée sur le menu (le Portal sort de la racine du mode). */
export function MenuLouange({
  id,
  titre,
  ouvert,
  onOuvertChange,
  align = "end",
  couleur,
  titreCache = false,
  children,
}: {
  id: MenuId;
  titre: string;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  /** Côté de l'icône où le menu s'aligne : « start » pour les boutons de gauche, « end » pour ceux de droite. */
  align?: "start" | "end";
  couleur: string;
  /** Téléphone : le titre de la feuille reste pour les lecteurs d'écran, le contenu porte déjà son en-tête. */
  titreCache?: boolean;
  children: ReactNode;
}) {
  const md = useAuMoinsMd();
  // Ancre virtuelle : la largeur et la place de l'icône, la hauteur de la barre (le menu s'ouvre sous la barre).
  const ancre = useRef({
    getBoundingClientRect: () => {
      const bouton = document.querySelector(`[data-menu-declencheur="${id}"]`);
      const barre = document.querySelector("[data-barre-haut]");
      if (!bouton || !barre) return new DOMRect();
      const b = bouton.getBoundingClientRect();
      const h = barre.getBoundingClientRect();
      return new DOMRect(b.left, h.top, b.width, h.height);
    },
  });
  const rendreLeFocus = (e: Event) => {
    e.preventDefault();
    document.querySelector<HTMLElement>(`[data-menu-declencheur="${id}"]`)?.focus({ preventScroll: true });
  };
  const style = { "--couleur-icones": couleur } as CSSProperties;
  const arreter = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
  };

  if (!md) {
    return (
      <Drawer open={ouvert} onOpenChange={onOuvertChange}>
        <DrawerContent
          className="z-[10000]"
          overlayClassName="z-[10000] bg-black/40"
          aria-describedby={undefined}
          data-menu-louange={id}
          style={style}
          onCloseAutoFocus={rendreLeFocus}
          {...arreter}
        >
          <DrawerTitle className={titreCache ? "sr-only" : "px-4 pt-3 text-center text-base"}>{titre}</DrawerTitle>
          <ZoneDefilante className="mx-auto w-full max-w-md overflow-y-auto px-4 pt-3 max-h-[calc(85dvh-4rem)]">
            <div style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>{children}</div>
          </ZoneDefilante>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={ouvert} onOpenChange={onOuvertChange}>
      <PopoverAnchor virtualRef={ancre} />
      <PopoverContent
        aria-label={titre}
        side="bottom"
        align={align}
        sideOffset={10}
        collisionPadding={8}
        data-menu-louange={id}
        style={style}
        className="z-[10000] w-[min(26rem,calc(100vw-1rem))] border-border bg-background p-0 dark:bg-[hsl(var(--raised))]"
        onOpenAutoFocus={(e) => {
          // Le focus va au menu lui-même : le premier bouton ne s'allume pas à l'ouverture.
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus({ preventScroll: true });
        }}
        onCloseAutoFocus={rendreLeFocus}
        {...arreter}
      >
        <ZoneDefilante className="max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl p-3">{children}</ZoneDefilante>
        <PopoverArrow width={18} height={9} className="fill-background stroke-border dark:fill-[hsl(var(--raised))]" />
      </PopoverContent>
    </Popover>
  );
}
