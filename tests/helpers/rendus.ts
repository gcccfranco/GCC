import type { Page } from "@playwright/test";

type Fenetre = Window & { __rendus: string[] };

/** Compte les rendus que React valide, grâce au crochet de ses outils de développement,
 *  posé avant que React ne se charge (à appeler avant d'ouvrir la page). Sert à vérifier
 *  qu'un défilement ne re-rend pas toute la page à chaque image (relecture de U5). Chaque
 *  rendu validé est noté avec les composants qui s'y sont refaits, pour le message d'échec. */
export async function compterLesRendus(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown> & { __rendus: string[] };
    w.__rendus = [];
    type Fibre = { type: unknown; flags: number; alternate: Fibre | null; memoizedState: unknown; memoizedProps: unknown; child: Fibre | null; sibling: Fibre | null };
    const refaits = (racine: Fibre | null) => {
      const noms = new Set<string>();
      const pile: Fibre[] = racine ? [racine] : [];
      while (pile.length) {
        const f = pile.pop()!;
        // Refait dans ce rendu (PerformedWork), avec des props ou un état neufs.
        if (typeof f.type === "function" && f.alternate && f.flags & 1 && (f.memoizedState !== f.alternate.memoizedState || f.memoizedProps !== f.alternate.memoizedProps)) {
          const t = f.type as { displayName?: string; name?: string };
          noms.add(t.displayName || t.name || "?");
        }
        if (f.sibling) pile.push(f.sibling);
        if (f.child) pile.push(f.child);
      }
      return [...noms].slice(0, 6).join(",");
    };
    w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: false,
      supportsFiber: true,
      renderers: new Map(),
      inject: () => 1,
      onCommitFiberRoot: (_id: number, racine: { current: Fibre }) => {
        w.__rendus.push(refaits(racine.current.child));
      },
      onCommitFiberUnmount: () => {},
      onPostCommitFiberRoot: () => {},
      checkDCE: () => {},
    };
  });
  const lire = () => page.evaluate(() => (window as unknown as Fenetre).__rendus.slice());
  return {
    /** Rendus validés depuis l'ouverture. */
    lire,
    /** Attend que la page ne rende plus rien pendant 500 ms (scans, polices, barres). */
    async attendreLeCalme() {
      let avant = -1;
      for (let i = 0; i < 20; i++) {
        const n = (await lire()).length;
        if (n === avant) return;
        avant = n;
        await page.waitForTimeout(500);
      }
    },
  };
}

/** Fait défiler la fenêtre de `pas` pixels, `fois` fois, une image après l'autre. */
export async function defilerImageParImage(page: Page, pas: number, fois: number) {
  for (let i = 0; i < fois; i++) {
    await page.evaluate(
      (dy) =>
        new Promise((r) => {
          window.scrollBy(0, dy);
          requestAnimationFrame(() => requestAnimationFrame(r));
        }),
      pas,
    );
  }
}
