import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { OUT, ON, OFF, axe, connecter, ecouter, ecrire, isoler, mesurer, nomFichier, preparer, stabiliser, tactile, SETLIST_ID } from "./lib";

// Parcours : chaque page × chaque disposition, clair FR partout ; sombre FR et clair 中文 sur téléphone et ordinateur.
type Qui = "visiteur" | "membre" | "admin";
const ROUTES: { path: string; qui: Qui }[] = [
  ...["/", "/songs/", "/songs/abba-pere/", "/songs/一生爱你/", "/songs/a-l-agneau/", "/accords/", "/harmonie/", "/harmonie/cours/", "/harmonie/rd2000/",
    "/login/", "/signup/", "/evenements/", "/questionnaire/", "/nexistepas/"].map((p) => ({ path: p, qui: "visiteur" as Qui })),
  ...["/planning/", "/planning/culte/", "/planning/table/", "/planning/groupes/", "/planning/edd/", "/planning/campus/", "/planning/intergroupe/",
    "/planning/interfranco/", "/mes-services/", "/setlists/", `/setlists/${SETLIST_ID}/`, `/setlists/${SETLIST_ID}/edit/`, "/setlists/new/", "/moi/",
    "/profil/", "/guide/", "/annonces/", "/evenements/", "/harmonie/", "/songs/abba-pere/"].map((p) => ({ path: p, qui: "membre" as Qui })),
  ...["/back-office/", "/back-office/calendrier/", "/back-office/equipes/", "/back-office/equipes/personnes/", "/back-office/evenements/",
    "/back-office/evenements/nouveau/", "/back-office/evenements/reunions/", "/back-office/evenements/scene/", "/back-office/messages/",
    "/back-office/messages/notifier/", "/back-office/messages/questionnaire/", "/back-office/planning/", "/back-office/planning/sans-compte/",
    "/back-office/plus/", "/back-office/reunions/", "/back-office/reunions/nouvelle/", "/back-office/statistiques/", "/back-office/taches/",
    "/equipes/", "/taches/", "/admin/", "/notifier/", "/evenements/scene/"].map((p) => ({ path: p, qui: "admin" as Qui })),
];

const VARIANTES = [
  { nom: "clair-fr", theme: "light" as const, lang: "fr" as const, projets: null as string[] | null, axe: ["telephone", "ordinateur"] },
  { nom: "sombre-fr", theme: "dark" as const, lang: "fr" as const, projets: ["telephone", "ordinateur"], axe: ["telephone"] },
  { nom: "clair-zh", theme: "light" as const, lang: "zh-CN" as const, projets: ["telephone", "ordinateur"], axe: [] as string[] },
];

for (const qui of ["visiteur", "membre", "admin"] as Qui[]) {
  test.describe(qui, () => {
    if (qui === "admin") test.use({ baseURL: ON });
    else test.use({ baseURL: OFF });
    for (const r of ROUTES.filter((x) => x.qui === qui)) {
      for (const v of VARIANTES) {
        test(`${qui} ${r.path} ${v.nom}`, async ({ page }, info) => {
          if (v.projets && !v.projets.includes(info.project.name)) test.skip();
          const j = ecouter(page);
          await isoler(page);
          await preparer(page, { theme: v.theme, lang: v.lang });
          const t0 = Date.now();
          if (qui === "visiteur") await page.goto(r.path);
          else await connecter(page, qui, r.path);
          await stabiliser(page);
          const m = await mesurer(page, tactile(info));
          let violations: unknown[] = [];
          if (v.axe.includes(info.project.name)) violations = await axe(page).catch((e) => [{ id: "axe-erreur", help: String(e) }]);
          const dossier = path.join(OUT, "shots", info.project.name, v.nom);
          mkdirSync(dossier, { recursive: true });
          const base = path.join(dossier, `${qui}-${nomFichier(r.path)}`);
          await page.screenshot({ path: `${base}.png` });
          if (m.scrollH <= 6000 && v.nom === "clair-fr") await page.screenshot({ path: `${base}-pleine.png`, fullPage: true }).catch(() => {});
          ecrire("crawl.jsonl", { qui, route: r.path, variante: v.nom, projet: info.project.name, urlFinale: page.url(), ms: Date.now() - t0, ...m, axe: violations, ...j });
        });
      }
    }
  });
}
