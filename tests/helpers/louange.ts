import type { Page } from "@playwright/test";

/** Page affichée du mode louange : sans la page setlist restée dessous, ni la
 *  copie invisible qui sert à mesurer les hauteurs (elle contient aussi des
 *  `[data-jianpu-page]` et des `[data-section]`). */
export const onStage = (page: Page, selector: string) =>
  page.locator(`[data-performance-mode] ${selector}:not([aria-hidden=true] *)`);
