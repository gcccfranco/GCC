import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "../../tests/helpers/fakeSession";

export const RACINE = path.resolve(__dirname, "../..");
export const OUT = path.join(__dirname, "out");
mkdirSync(OUT, { recursive: true });
export const OFF = "http://localhost:3300";
export const ON = "http://localhost:3301";

export function ecrire(fichier: string, data: unknown) {
  appendFileSync(path.join(OUT, fichier), JSON.stringify(data) + "\n");
}

export const SONGS: { slug: string; title: string; language: string; originalKey: string; recommendedKey?: string; hasJianpu?: boolean }[] =
  JSON.parse(readFileSync(path.join(RACINE, "public/songs-index.json"), "utf8")).songs;

// Profils fictifs (CLAUDE.md : aucun nom réel).
export const MEMBRE: FakeProfile = {
  uid: "uid-lina", email: "lina@example.com", firstName: "Lina", lastName: "Vo.", planningName: "Lina Vo.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
export const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "Essai", planningName: "Admin Essai",
  dansEquipes: ["da"], referentDe: ["da"], equipes: true, plannings: ["culte"], coordination: true,
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", ...over,
});
export const SETLIST_ID = "setlist-audit";
export const SETLIST = {
  title: "Culte du 25 octobre", leader: "Présidence E.", category: "Culte Francophone", date: "2026-10-25", language: "mixed",
  notes: "Thème : la grâce.", ownerId: MEMBRE.uid, isPrivate: false, presentationUrl: "",
  items: [
    item({ songSlug: "abba-pere", position: 1, keyOverride: "G", notes: "Démarrer doux" }),
    item({ songSlug: "一生爱你", position: 2, jianpuSheet: true }),
    item({ type: "transition", songSlug: "", position: 3, transitionText: "Prière, piano doux" }),
    item({ songSlug: "a-l-agneau", position: 4 }),
  ],
  createdAt: "2026-10-20T10:00:00Z", updatedAt: "2026-10-20T10:00:00Z",
};
export const DOCS = { [`setlists/${SETLIST_ID}`]: SETLIST };

/** Coupe toute sortie vers les vrais services (Firestore, Sheets, YouTube…) : rien de réel n'est lu. */
export async function isoler(page: Page) {
  await page.context().route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.context().route(/firestore\.googleapis\.com|identitytoolkit|securetoken/, (r) =>
    r.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: 404 } }) }));
  await page.context().route(/youtube\.com|ytimg|googlevideo|spotify|apple\.com/, (r) => r.abort());
}

export type Journal = { console: string[]; pageerrors: string[]; failed: string[]; http: string[] };
export function ecouter(page: Page): Journal {
  const j: Journal = { console: [], pageerrors: [], failed: [], http: [] };
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") j.console.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => j.pageerrors.push(String(e.message || e).slice(0, 400)));
  page.on("requestfailed", (r) => { if (/youtube|ytimg|spotify|apple|googlevideo/.test(r.url())) return; j.failed.push(`${r.failure()?.errorText ?? ""} ${r.url().slice(0, 160)}`); });
  page.on("response", (r) => { if (r.status() >= 400 && !/googleapis|google\.com/.test(r.url())) j.http.push(`${r.status()} ${r.url().slice(0, 160)}`); });
  return j;
}

export async function preparer(page: Page, opts: { theme: "light" | "dark"; lang: "fr" | "zh-CN" }) {
  await page.emulateMedia({ colorScheme: opts.theme });
  await page.addInitScript((lng) => {
    try { localStorage.setItem("i18nextLng", lng); localStorage.setItem("theme", "system"); } catch { /* */ }
  }, opts.lang);
}

export async function connecter(page: Page, who: "membre" | "admin", to: string) {
  return signInAs(page, who === "admin" ? ADMIN : MEMBRE, DOCS, to.replace(/\/$/, "") || "/");
}

export async function stabiliser(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

/** Mesures prises dans la page : débordements, textes coupés, cibles tactiles, poids, LCP/CLS. */
export async function mesurer(page: Page, tactile: boolean) {
  return page.evaluate(async (tactile) => {
    const vw = document.documentElement.clientWidth;
    const sw = document.scrollingElement!.scrollWidth;
    const desc = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof (el as HTMLElement).className === "string" ? "." + (el as HTMLElement).className.split(/\s+/).filter(Boolean).slice(0, 3).join(".") : "";
      const txt = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
      const label = el.getAttribute("aria-label") || "";
      return `${el.tagName.toLowerCase()}${id}${cls}${label ? `[${label}]` : ""}${txt ? ` « ${txt} »` : ""}`;
    };
    const visible = (el: Element) => {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
      if (el.closest("[aria-hidden='true'],[inert],[hidden]")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const clippedByAncestor = (el: Element) => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const s = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true;
        if (s.position === "fixed") return false;
        p = p.parentElement;
      }
      return false;
    };
    const debordent: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if (debordent.length >= 8) break;
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if ((r.right > vw + 2 || r.left < -2) && !clippedByAncestor(el)) {
        const parent = el.parentElement?.getBoundingClientRect();
        if (parent && (parent.right > vw + 2 || parent.left < -2) && el.parentElement !== document.body) continue;
        debordent.push(`${desc(el)} (${Math.round(r.left)}→${Math.round(r.right)} / ${vw})`);
      }
    }
    const coupes: string[] = [];
    const ellipses: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if (coupes.length >= 10 && ellipses.length >= 10) break;
      const he = el as HTMLElement;
      if (!he.childNodes.length || !Array.from(he.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim())) continue;
      if (!visible(el)) continue;
      const s = getComputedStyle(el);
      if (he.scrollWidth > he.clientWidth + 1 && /(hidden|clip)/.test(s.overflowX)) {
        (s.textOverflow === "ellipsis" ? ellipses : coupes).push(desc(el));
      }
    }
    const petites: string[] = [];
    if (tactile) {
      for (const el of Array.from(document.querySelectorAll("a[href],button,[role=button],input:not([type=hidden]),select,textarea,[role=tab],[role=switch],[role=checkbox],[role=menuitem]"))) {
        if (!visible(el)) continue;
        if (el.tagName === "A" && el.closest("p,li>p,article p")) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 40) {
          // Zone de toucher agrandie par un pseudo-élément ou un parent cliquable : on ne la mesure pas, on signale.
          petites.push(`${desc(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
      }
    }
    const lcp = await new Promise<number | null>((res) => {
      let v: number | null = null;
      try {
        new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      } catch { /* */ }
      setTimeout(() => res(v), 200);
    });
    let cls = 0;
    try {
      await new Promise<void>((res) => {
        new PerformanceObserver((l) => { for (const e of l.getEntries() as PerformanceEntry[] & { value: number; hadRecentInput: boolean }[]) if (!(e as unknown as { hadRecentInput: boolean }).hadRecentInput) cls += (e as unknown as { value: number }).value; }).observe({ type: "layout-shift", buffered: true });
        setTimeout(res, 200);
      });
    } catch { /* */ }
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const octets = { total: (nav?.transferSize ?? 0), js: 0, css: 0, police: 0, image: 0, data: 0 };
    for (const r of res) {
      const t = r.transferSize || r.encodedBodySize || 0;
      octets.total += t;
      if (/\.js(\?|$)/.test(r.name)) octets.js += t;
      else if (/\.css(\?|$)/.test(r.name)) octets.css += t;
      else if (/\.(woff2?|ttf|otf)(\?|$)/.test(r.name)) octets.police += t;
      else if (/\.(png|jpe?g|webp|svg|avif|gif)(\?|$)/.test(r.name)) octets.image += t;
      else if (/\.json|\/api\//.test(r.name)) octets.data += t;
    }
    const plantage = /Application error: a client-side exception|Unhandled Runtime Error|This page could not be found/i.test(document.body.innerText);
    return {
      vw, sw, scrollH: document.scrollingElement!.scrollHeight, debordeHorizontalement: sw > vw + 1, debordent, coupes, ellipses,
      petites: petites.slice(0, 25), nbPetites: petites.length, lcp, cls: Math.round(cls * 1000) / 1000, octets,
      ttfb: nav ? Math.round(nav.responseStart) : null, dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      titre: document.title, lang: document.documentElement.lang, plantage,
      h1: Array.from(document.querySelectorAll("h1")).map((h) => (h.textContent || "").trim().slice(0, 60)),
    };
  }, tactile);
}

export async function axe(page: Page) {
  await page.addScriptTag({ path: path.join(RACINE, "node_modules/axe-core/axe.min.js") });
  return page.evaluate(async () => {
    // @ts-expect-error axe injecté
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] });
    return r.violations.map((v: { id: string; impact: string; help: string; nodes: { target: string[]; failureSummary: string }[] }) => ({
      id: v.id, impact: v.impact, help: v.help, n: v.nodes.length,
      exemples: v.nodes.slice(0, 4).map((n) => `${n.target.join(" ")} — ${(n.failureSummary || "").split("\n").slice(1, 2).join(" ").slice(0, 160)}`),
    }));
  });
}

export function nomFichier(s: string) {
  return s.replace(/^\/+|\/+$/g, "").replace(/[/?=&%"]+/g, "_") || "accueil";
}

export function tactile(info: TestInfo) {
  return /telephone|tablette/.test(info.project.name);
}
