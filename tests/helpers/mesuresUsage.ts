import { appendFileSync, mkdirSync } from "node:fs";
import { test, type Page } from "@playwright/test";

// Audit d'usage (11/11/2026) : relevé MESURÉ de chaque écran photographié par audit-design-captures*.spec.ts.
// Rien n'est vérifié, on mesure. Deux passes :
//   PW_MESURES=<fichier.jsonl>  une ligne par page et par disposition (cibles, textes, défilement, action principale) ;
//   PW_FEUILLES=<dossier>       en plus, chaque bouton de la page est touché : si une feuille, un menu ou une fenêtre
//                               s'ouvre, on la mesure et on la photographie ; si la page change (onglet, bascule),
//                               c'est une « vue », mesurée et photographiée aussi (téléphone, tablette, ordinateur).
// La taille d'une cible est celle de sa boîte, élargie par un ::before / ::after absolu quand il y en a un.

const PROJETS_FEUILLES = ["telephone", "tablette", "ordinateur"];
const MAX_BOUTONS = 22;
// Boutons qu'on ne touche pas : ils suppriment, envoient, exportent ou quittent.
const A_EVITER = /supprim|d[ée]connex|retirer|effacer|quitter|envoyer|notifier|publier|export|pdf|imprimer|t[ée]l[ée]charg|partager|copier|fusionner|enregistrer|valider|cr[ée]er|dupliquer|archiver|vider/i;
const SURCOUCHE = "[role=dialog], [role=alertdialog], [role=menu], [role=listbox], [data-vaul-drawer]";

type Releve = Record<string, unknown>;

/** Relevé d'une racine (la page, ou une feuille ouverte) — exécuté dans le navigateur. */
function relever({ tactile, racine }: { tactile: boolean; racine: string | null }): Releve {
  const root = (racine ? document.querySelector(racine) : document.body) as HTMLElement | null;
  if (!root) return { absent: true };
  const vw = innerWidth, vh = innerHeight;
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
  };
  const nomDe = (el: Element) =>
    (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.getAttribute("title") || el.getAttribute("placeholder") || el.tagName)
      .trim().replace(/\s+/g, " ").slice(0, 40);
  const px = (v: string) => (v.endsWith("px") ? parseFloat(v) : 0);
  /** Boîte touchable : la boîte, élargie par un pseudo-élément absolu à marges négatives. */
  const zone = (el: Element) => {
    const r = el.getBoundingClientRect(); let w = r.width, h = r.height;
    for (const p of ["::before", "::after"]) {
      const s = getComputedStyle(el, p);
      if (s.content === "none" || s.position !== "absolute") continue;
      w = Math.max(w, r.width - px(s.left) - px(s.right)); h = Math.max(h, r.height - px(s.top) - px(s.bottom));
    }
    // Cible à l'écran : on demande au navigateur ce qu'un doigt posé à 21 px du centre toucherait.
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const touche = (x: number, y: number) => { const t = document.elementFromPoint(x, y); return !!t && (el.contains(t) || t.contains(el) && t.closest("label") !== null); };
    if (cx > 0 && cx < vw && cy > 21 && cy < vh - 21) {
      if (h < 44 && touche(cx, cy - 21) && touche(cx, cy + 21)) h = 44;
      if (w < 44 && cx > 21 && cx < vw - 21 && touche(cx - 21, cy) && touche(cx + 21, cy)) w = 44;
    }
    return { w: Math.round(w), h: Math.round(h), top: r.top + scrollY };
  };
  const cibles = [...root.querySelectorAll<HTMLElement>(
    "a[href], button, [role=button], [role=tab], [role=switch], [role=checkbox], [role=menuitem], [role=radio], [role=option], input:not([type=hidden]), select, textarea, summary",
  )].filter((el) => visible(el) && !el.closest("[aria-hidden=true]") && !(el as HTMLButtonElement).disabled && !el.closest("nextjs-portal"));
  const seuil = tactile ? 44 : 24;
  const sous: string[] = []; let sousSeuil = 0, tresPetites = 0;
  for (const el of cibles) {
    const z = zone(el); const min = Math.min(z.w, z.h);
    if (min >= seuil) continue;
    sousSeuil++; if (min < (tactile ? 32 : 20)) tresPetites++;
    if (sous.length < 10) sous.push(`${nomDe(el)} ${z.w}×${z.h}`);
  }
  // Textes : éléments qui portent du texte en propre, sous 12 px.
  const petits: string[] = []; let textesPetits = 0;
  const marche = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const vus = new Set<Element>();
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    const el = n.parentElement; const t = (n.textContent ?? "").trim();
    if (!el || t.length < 2 || vus.has(el) || !visible(el) || el.closest("[aria-hidden=true], nextjs-portal, .sr-only")) continue;
    vus.add(el);
    const f = parseFloat(getComputedStyle(el).fontSize);
    if (f < 12) { textesPetits++; if (petits.length < 6) petits.push(`${t.slice(0, 30)} ${f}px`); }
  }
  // Textes coupés par des points de suspension.
  const coupes: string[] = []; let textesCoupes = 0;
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const s = getComputedStyle(el);
    const ellipse = s.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1;
    const pince = s.webkitLineClamp !== "none" && s.webkitLineClamp !== "" && el.scrollHeight > el.clientHeight + 1;
    if ((ellipse || pince) && visible(el) && el.innerText.trim()) { textesCoupes++; if (coupes.length < 6) coupes.push(el.innerText.trim().replace(/\s+/g, " ").slice(0, 40)); }
  }
  // Action principale : bouton d'envoi ou bouton plein (encre).
  const pleins = cibles.filter((el) =>
    !el.closest("nav, [role=tablist], [role=radiogroup]") && !el.hasAttribute("aria-current") && !el.hasAttribute("aria-selected") && !el.hasAttribute("aria-pressed") && !el.hasAttribute("aria-checked") &&
    ((el as HTMLButtonElement).type === "submit" || /(^|\s)(bg-primary|bg-foreground)(\s|$)/.test(el.className?.toString() ?? "")));
  const action = pleins[0];
  let principale: Releve | null = null;
  if (action) {
    const r = action.getBoundingClientRect();
    let colle = false;
    for (let p: HTMLElement | null = action; p; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === "fixed" || pos === "sticky") { colle = true; break; } }
    principale = { nom: nomDe(action), aEcrans: +((r.top + scrollY) / vh).toFixed(2), colle, nb: pleins.length };
  }
  // Barres fixes ou collantes : part de la hauteur d'écran qu'elles prennent.
  let barres = 0;
  for (const el of document.querySelectorAll<HTMLElement>("body *")) {
    const s = getComputedStyle(el);
    if ((s.position !== "fixed" && s.position !== "sticky") || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= vw * 0.6 && r.height < vh * 0.4 && (r.top <= 4 || r.bottom >= vh - 4) && !el.parentElement?.closest("[data-audit-barre]")) { el.setAttribute("data-audit-barre", ""); barres += r.height; }
  }
  // Place prise par le contenu : marges vides à gauche et à droite, et part de la largeur que le texte occupe
  // (des paroles tassées dans le tiers gauche d'une tablette donnent une médiane basse).
  const zoneLue = (racine ? root : document.querySelector<HTMLElement>("main") ?? root).getBoundingClientRect();
  let gauche = vw, droite = 0; const bordsDroits: number[] = [];
  for (const el of vus) {
    if (!(racine ? root : document.querySelector("main") ?? root).contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.bottom < 0 || r.top > vh * 3) continue;
    gauche = Math.min(gauche, r.left); droite = Math.max(droite, r.right);
    const plage = document.createRange(); plage.selectNodeContents(el);
    const rt = plage.getBoundingClientRect();
    if (rt.width > 0) bordsDroits.push(rt.right);
  }
  // Bande vide à droite : où s'arrêtent les grands blocs (au moins la moitié de l'écran) de la zone lue.
  const fins: number[] = [];
  for (const el of (racine ? root : document.querySelector<HTMLElement>("main") ?? root).querySelectorAll<HTMLElement>("*")) {
    const r = el.getBoundingClientRect();
    if (r.width >= vw * 0.5 && r.height >= 40 && r.height < vh * 2 && visible(el)) fins.push(Math.round(r.right));
  }
  fins.sort((x, y) => x - y);
  const finBlocs = fins.length ? fins[Math.floor(fins.length / 2)] : 0;
  bordsDroits.sort((x, y) => x - y);
  const mediane = bordsDroits.length ? bordsDroits[Math.floor(bordsDroits.length / 2)] : 0;
  const place = droite > gauche ? {
    videGauche: Math.round(Math.max(0, gauche)), videDroite: Math.round(Math.max(0, vw - droite)),
    zone: [Math.round(zoneLue.left), Math.round(zoneLue.right)],
    texteMedian: +((mediane - gauche) / Math.max(1, droite - gauche)).toFixed(2),
    videDroiteBlocs: finBlocs ? Math.max(0, vw - finBlocs) : null,
  } : null;
  const champs = cibles.filter((el) => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !/checkbox|radio|file/.test((el as HTMLInputElement).type ?? "")).length;
  return {
    vw, vh,
    ecrans: +(document.documentElement.scrollHeight / vh).toFixed(2),
    debordeX: Math.max(0, document.documentElement.scrollWidth - vw),
    cibles: cibles.length, ciblesPremierEcran: cibles.filter((el) => el.getBoundingClientRect().top < vh).length,
    sousSeuil, tresPetites, sous, champs, textesPetits, petits, textesCoupes, coupes, principale,
    barres: +(barres / vh).toFixed(2), place,
  };
}

/** Géométrie d'une feuille ouverte (marquée `data-audit-feuille`). */
function geometrie(): Releve {
  const el = document.querySelector<HTMLElement>("[data-audit-feuille]");
  if (!el) return {};
  const r = el.getBoundingClientRect(); const vh = innerHeight;
  let defile = 1;
  for (const d of [el, ...el.querySelectorAll<HTMLElement>("*")]) {
    const s = getComputedStyle(d);
    if (/(auto|scroll)/.test(s.overflowY) && d.scrollHeight > d.clientHeight + 8) defile = Math.max(defile, +(d.scrollHeight / d.clientHeight).toFixed(2));
  }
  const fermer = !!el.querySelector('[aria-label*="ermer" i], [aria-label*="close" i]') || /annuler|fermer/i.test(el.innerText);
  return {
    role: el.getAttribute("role") ?? "feuille", titre: (el.querySelector("h1, h2, h3, [role=heading]") as HTMLElement | null)?.innerText?.trim().slice(0, 50) ?? "",
    hauteur: +(r.height / vh).toFixed(2), largeur: +(r.width / innerWidth).toFixed(2), defile, fermer,
    horsEcran: r.bottom > vh + 1 || r.top < -1,
  };
}

export async function mesurerUsage(page: Page, nom: string) {
  const projet = test.info().project.name;
  const tactile = projet.startsWith("telephone") || projet.startsWith("tablette");
  const sortie = process.env.PW_MESURES!;
  const m = await page.evaluate(relever, { tactile, racine: null });
  appendFileSync(sortie, JSON.stringify({ type: "page", projet, nom, ...m }) + "\n");
  if (process.env.PW_FEUILLES && PROJETS_FEUILLES.includes(projet)) await toucherLesBoutons(page, nom, projet, tactile, sortie);
}

/** Touche chaque bouton de la page ; mesure et photographie ce qui s'ouvre par-dessus. */
async function toucherLesBoutons(page: Page, nom: string, projet: string, tactile: boolean, sortie: string) {
  test.setTimeout(420_000);
  const dossier = `${process.env.PW_FEUILLES}/${projet}`;
  mkdirSync(dossier, { recursive: true });
  const url = page.url();
  const marquer = () => page.evaluate(({ eviter, max }) => {
    const re = new RegExp(eviter, "i");
    const zone = document.querySelector("main") ?? document.body;
    const out: { i: number; nom: string }[] = []; let i = 0;
    for (const el of zone.querySelectorAll<HTMLElement>("button, [role=button], summary")) {
      el.removeAttribute("data-audit-i");
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || s.visibility === "hidden" || (el as HTMLButtonElement).disabled || el.closest("[aria-hidden=true]")) continue;
      if ((el as HTMLButtonElement).type === "submit") continue;
      const n = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 40);
      if (!n || re.test(n)) continue;
      // « Modifier Orga », « Modifier DA »… ouvrent la même feuille : deux boutons au plus par premier mot.
      const mot = n.split(" ")[0];
      const memes = out.filter((o) => o.nom.split(" ")[0] === mot).length;
      if (memes >= 2) continue;
      el.setAttribute("data-audit-i", String(i)); out.push({ i, nom: n }); i++;
      if (i >= max) break;
    }
    return out;
  }, { eviter: A_EVITER.source, max: MAX_BOUTONS });

  const boutons = await marquer();
  const dejaVues = new Set<string>();
  // `propre` : la page est dans son état de départ. Une bascule dans la page (onglet, pastille) la change : on recharge.
  let propre = true;
  for (const b of boutons) {
    try {
      if (!propre || page.url() !== url || (await page.locator(SURCOUCHE).filter({ visible: true }).count()) > 0) {
        await page.goto(url); await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(500);
        propre = true;
      }
      const encore = await marquer();
      if (!encore.some((e) => e.i === b.i && e.nom === b.nom)) { if (process.env.PW_AUDIT_DEBUG) console.log("forme", b.i, b.nom); continue; } // la page a changé de forme : on passe
      const signature = () => page.evaluate(() => `${(document.querySelector("main") ?? document.body).innerText.length}:${document.documentElement.scrollHeight}`);
      const avant = await signature();
      await page.locator(`[data-audit-i="${b.i}"]`).click({ timeout: 2500 });
      await page.waitForTimeout(550);
      if (new URL(page.url()).pathname !== new URL(url).pathname) { appendFileSync(sortie, JSON.stringify({ type: "bouton", projet, nom, bouton: b.nom, effet: "navigue", vers: new URL(page.url()).pathname }) + "\n"); continue; }
      const marquee = await page.evaluate((sel) => {
        document.querySelectorAll("[data-audit-feuille]").forEach((e) => e.removeAttribute("data-audit-feuille"));
        const ouvertes = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; });
        const f = ouvertes[ouvertes.length - 1]; if (!f) return null;
        f.setAttribute("data-audit-feuille", "");
        return (f.innerText ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
      }, SURCOUCHE);
      if (marquee === null) {
        // Rien par-dessus : un onglet ou une bascule. Si la page a changé, c'est une autre vue du même écran.
        propre = false;
        if ((await signature()) !== avant) {
          const fichier = `${nom}__${String(b.i).padStart(2, "0")}-${b.nom.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 24)}__vue.png`;
          const m = await page.evaluate(relever, { tactile, racine: null });
          await page.screenshot({ path: `${dossier}/${fichier}`, fullPage: true });
          appendFileSync(sortie, JSON.stringify({ type: "vue", projet, nom, bouton: b.nom, capture: fichier, ...m }) + "\n");
        }
        continue;
      } // bascule dans la page : rien par-dessus
      if (dejaVues.has(marquee)) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); continue; }
      dejaVues.add(marquee);
      const g = await page.evaluate(geometrie);
      const m = await page.evaluate(relever, { tactile, racine: "[data-audit-feuille]" });
      const fichier = `${nom}__${String(b.i).padStart(2, "0")}-${b.nom.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 24)}.png`;
      await page.screenshot({ path: `${dossier}/${fichier}` });
      appendFileSync(sortie, JSON.stringify({ type: "feuille", projet, nom, bouton: b.nom, capture: fichier, ...g, ...m }) + "\n");
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    } catch (e) {
      // Bouton recouvert ou disparu : on passe au suivant.
      if (process.env.PW_AUDIT_DEBUG) console.log("raté", b.i, b.nom, String(e).slice(0, 160));
    }
  }
}
