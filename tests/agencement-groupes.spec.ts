import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs } from "./helpers/agencement";

// Garde-fou d'agencement (reprise R2, règle de Timothée du 05/11/2026, docs/orchestration.md § 4 « Relire les captures ») :
// une douzaine de pages représentatives, mesurées au lieu d'être regardées, pour que les défauts de surface qui ont échappé
// à la recette (gris sur gris, groupe blanc sur page blanche, texte collé au bord d'un groupe, voisins désalignés, page
// courte qui défile dans le vide) ne reviennent pas. Cinq projets (`SPECS_GRAND_ECRAN`). Connecté par `signInAs` (noms
// fictifs), Sheet coupé (une feuille vide, sauf le culte), horloge figée.
//
// Cinq mesures, par page :
//  (a) aucun élément visible dont le fond calculé est `--secondary` et dont le premier ancêtre peint est `--fond-groupe` ;
//  (b) aucun `.carte-groupe` visible dont le fond est celui de la page qu'il touche (sans ombre ni liseré) ;
//  (c) dans chaque `.carte-groupe`, chaque ligne de texte visible est à 12 px au moins des bords gauche et droit du groupe ;
//  (d) deux `.carte-groupe` frères, côte à côte dans la même rangée, ont le même haut (± 1 px) ;
//  (e) une page courte (tout son contenu et la cale de la barre du bas tiennent dans l'écran) ne défile pas de plus de 24 px.
// Les exceptions s'écrivent dans EXEMPTIONS, une par une, avec leur raison : rien d'autre ne les couvre.

/** Une exception : page (nom), mesure (a à e) et motif à retrouver dans le descriptif du nœud ; `raison` dit pourquoi c'est voulu. */
type Exemption = { page: string; mesure: "a" | "b" | "c" | "d" | "e"; contient: string; raison: string };
const EXEMPTIONS: Exemption[] = [];

const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", planningName: "Alix D.",
  dansEquipes: ["da", "louange"], referentDe: ["da"], plannings: ["culte"], lieuxLouange: ["culte"], joue: ["piano"],
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const tache = (titre: string, echeance: string, over: Record<string, unknown> = {}) => ({
  equipe: "da", titre, responsableUid: null, responsableNom: "", echeance, repetition: null, lien: "", note: "",
  prevenir: null, evenement: null, auteurUid: "uid-admin", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...over,
});
const EV = {
  titre: "Pique-nique de rentrée", type: "loisir", pour: "eglise", date: "2026-11-14", heure: "12:00", heureFin: "16:00", dateFin: "",
  lieu: "Parc de la Villette", description: "Chacun apporte un plat à partager.", liens: [], images: [], placesMax: 40,
  inscriptions: "auto", inscriptionOuverte: true, sansCompte: false, contact: "Alix D.", organisateurUid: "uid-admin",
  organisateurNom: "Alix D.", epingle: false, expiresAt: null, inscrits: 12, createdAt: "2026-10-20T10:00:00Z", updatedAt: "2026-10-20T10:00:00Z",
};
const profil = (uid: string, prenom: string, nom: string, over: Record<string, unknown> = {}) => ({
  uid, email: `${prenom.toLowerCase()}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`,
  serviceRoles: {}, annonces: [], notify: [], ...over,
});
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const membre = (nom: string, uid: string, over: Record<string, unknown> = {}) => ({ nom, uid, mention: "", referent: false, essai: false, groupe: "", ...over });
const equipe = (pole: string | null, membres: unknown[]) => ({ pole, membres, updatedAt: "2026-09-01T10:00:00Z", parUid: "uid-zoe", parNom: "Zoé F." });

const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da/taches/t1": tache("Préparer les affiches de Noël", "2026-11-08", { responsableUid: "uid-admin", responsableNom: "Alix D.", note: "Format A3, deux versions." }),
  "equipes/da/taches/t2": tache("Fond PPT du culte", "2026-11-12", { responsableUid: "uid-zoe", responsableNom: "Zoé F." }),
  "equipes/da": equipe("da", [membre("Alix D.", "uid-admin", { referent: true }), membre("Zoé F.", "uid-zoe")]),
  "equipes/louange": equipe(null, [membre("Alix D.", "uid-admin", { groupe: "Pianistes" }), membre("Mathis R.", "uid-mathis")]),
  "evenements/pique-nique": EV,
  "users/uid-admin": profil("uid-admin", "Alix", "D.", { email: ADMIN_EMAIL, dansEquipes: ["da", "louange"], referentDe: ["da"] }),
  "users/uid-zoe": profil("uid-zoe", "Zoé", "F.", { dansEquipes: ["da"] }),
  "users/uid-mathis": profil("uid-mathis", "Mathis", "R.", { dansEquipes: ["louange"], serviceRoles: { "Culte Francophone": ["chanteur"] } }),
  "setlists/s1": {
    title: "Culte du 8 novembre", leader: "Alix D.", category: "Culte Francophone", date: "2026-11-08", language: "mixed",
    notes: "Intro douce, enchaîner sans pause.", ownerId: "uid-admin", isPrivate: false,
    items: [item("hosanna", 1), item("abba-pere", 2)],
  },
};

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const culte = (date: string, pres: string, piano: string) =>
  [date, pres, "Mathis R.", "Lina O.", piano, "Elias G.", "Maëlle S.", "Zoé F.", "Mathis R.", "Lina O.", "Elias G.", "", ""];
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([ENTETE_CULTE, culte("08/11", "Zoé F.", "Alix D."), culte("15/11", "Zoé F.", "Maëlle S."), culte("22/11", "Lina O.", "Alix D.")]),
};

/** Les pages mesurées ; `sombre` : mesurées aussi en sombre (trois d'entre elles). */
const PAGES: { nom: string; chemin: string; sombre?: boolean }[] = [
  { nom: "accueil", chemin: "/", sombre: true },
  { nom: "songs", chemin: "/songs" },
  { nom: "chant", chemin: "/songs/abba-pere" },
  { nom: "setlists", chemin: "/setlists", sombre: true },
  { nom: "setlists_new", chemin: "/setlists/new" },
  { nom: "planning", chemin: "/planning" },
  { nom: "planning_culte", chemin: "/planning/culte" },
  { nom: "mes-services", chemin: "/mes-services" },
  { nom: "moi", chemin: "/moi" },
  { nom: "evenements", chemin: "/evenements" },
  { nom: "harmonie", chemin: "/harmonie" },
  { nom: "back-office", chemin: "/back-office" },
  { nom: "back-office_messages", chemin: "/back-office/messages", sombre: true },
  { nom: "back-office_equipes", chemin: "/back-office/equipes" },
  { nom: "taches_equipe_id", chemin: "/taches/da/t1" },
];

type Mesures = { a: string[]; b: string[]; c: string[]; d: string[]; e: string[] };

/** Les cinq mesures, prises dans la page : chaque défaut est une ligne qui décrit le nœud (balise, classes, texte) et la mesure. */
function mesurer(page: Page): Promise<Mesures> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const resultat: Mesures = { a: [], b: [], c: [], d: [], e: [] };

    // Une couleur du thème en « rgb(...) » tel que le navigateur la calcule (les jetons sont des triplets HSL).
    const sonde = document.createElement("div");
    sonde.style.cssText = "position:fixed;left:-99px;top:-99px;width:1px;height:1px";
    document.body.appendChild(sonde);
    const couleur = (jeton: string) => { sonde.style.backgroundColor = `hsl(var(${jeton}))`; return getComputedStyle(sonde).backgroundColor; };
    const secondary = couleur("--secondary");
    const fondGroupe = couleur("--fond-groupe");
    sonde.remove();

    const visible = (el: Element) => {
      if (!(el as HTMLElement).checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1 && r.right > 0 && r.left < doc.clientWidth;
    };
    const decrire = (el: Element, texte = "") => {
      const classes = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).slice(0, 4).join(".");
      const t = (texte || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
      return `<${el.tagName.toLowerCase()}${classes ? "." + classes : ""}> « ${t} »`;
    };
    const peint = (c: string) => c !== "rgba(0, 0, 0, 0)" && c !== "transparent";
    /** Le fond du premier ancêtre peint ; le blanc de la toile sinon. */
    const fondDessous = (el: Element) => {
      for (let a = el.parentElement; a; a = a.parentElement) {
        const c = getComputedStyle(a).backgroundColor;
        if (peint(c)) return c;
      }
      return "rgb(255, 255, 255)";
    };

    const tout = Array.from(document.body.querySelectorAll("*")).filter((el) => !el.closest("nextjs-portal, script, style, [data-nextjs-toast]"));

    // (a) un aplat `--secondary` posé sur le gris : invisible (#f2f2f4 sur #f2f2f7 en clair). En sombre `--secondary` (#2c2c2e) se
    //     détache du noir de `--fond-groupe` : « gris sur gris » veut dire deux fonds qui ne s'écartent pas de 12 sur un canal.
    const canaux = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const proches = (c: string, d: string) => canaux(c).every((v, i) => Math.abs(v - canaux(d)[i]) < 12);
    for (const el of tout) {
      if (getComputedStyle(el).backgroundColor !== secondary || !visible(el)) continue;
      const dessous = fondDessous(el);
      if (dessous === fondGroupe && proches(secondary, dessous)) resultat.a.push(`${decrire(el)} : aplat --secondary sur --fond-groupe`);
    }

    // (b) un groupe dont le fond est celui de la page qu'il touche, sans ombre ni liseré.
    const groupes = tout.filter((el) => el.classList.contains("carte-groupe") && visible(el));
    for (const g of groupes) {
      const s = getComputedStyle(g);
      const sansRelief = s.boxShadow === "none" && parseFloat(s.borderTopWidth) === 0;
      if (sansRelief && s.backgroundColor === fondDessous(g)) resultat.b.push(`${decrire(g)} : fond ${s.backgroundColor} = celui de la page, sans ombre`);
    }

    // (c) chaque ligne de texte visible d'un groupe est à 12 px au moins de ses bords gauche et droit.
    const MARGE = 12;
    const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
      const texte = (n.textContent ?? "").trim();
      const parent = n.parentElement;
      if (!texte || !parent || parent.closest("nextjs-portal, script, style, [data-nextjs-toast]") || !visible(parent)) continue;
      const g = parent.closest(".carte-groupe");
      if (!g) continue;
      const cadre = g.getBoundingClientRect();
      const plage = document.createRange();
      plage.selectNodeContents(n);
      for (const r of Array.from(plage.getClientRects())) {
        if (r.width < 1 || r.height < 1 || r.right <= cadre.left || r.left >= cadre.right) continue; // hors du groupe (défilé, rogné)
        // Un défilant qui a encore de la place d'un côté (grille du planning, rails) coupe par conception le texte de ce côté,
        // sous son fondu : on ne mesure que le côté d'où il ne peut plus défiler.
        let [coupeGauche, coupeDroite] = [false, false];
        for (let a: Element | null = parent; a && a !== g.parentElement; a = a.parentElement) {
          if (!/auto|scroll/.test(getComputedStyle(a).overflowX) || a.scrollWidth <= a.clientWidth + 1) continue;
          if (a.scrollLeft > 1) coupeGauche = true;
          if (a.scrollLeft + a.clientWidth < a.scrollWidth - 1) coupeDroite = true;
        }
        const gauche = coupeGauche ? Infinity : r.left - cadre.left;
        const droite = coupeDroite ? Infinity : cadre.right - r.right;
        if (gauche < MARGE - 0.5 || droite < MARGE - 0.5) {
          resultat.c.push(`${decrire(parent, texte)} : ${Math.round(gauche)} px à gauche, ${Math.round(droite)} px à droite du groupe ${decrire(g).slice(0, 36)}`);
          break;
        }
      }
    }

    // (d) deux groupes frères côte à côte (même parent, rangées qui se recouvrent) ont le même haut, à 1 px près.
    for (let i = 0; i < groupes.length; i++) {
      for (let j = i + 1; j < groupes.length; j++) {
        const [p, q] = [groupes[i], groupes[j]];
        if (p.parentElement !== q.parentElement) continue;
        const [r, s] = [p.getBoundingClientRect(), q.getBoundingClientRect()];
        const apart = r.right <= s.left + 1 || s.right <= r.left + 1;
        const recouvrement = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
        if (!apart || recouvrement < Math.min(r.height, s.height) / 2) continue;
        if (Math.abs(r.top - s.top) > 1) resultat.d.push(`${decrire(p)} et ${decrire(q)} : hauts à ${Math.round(r.top)} et ${Math.round(s.top)} px`);
      }
    }

    // (e) une page courte ne défile pas dans le vide : si le contenu et la cale de la barre du bas tiennent dans l'écran,
    //     le document dépasse l'écran de 24 px au plus. Le bas du contenu : le dernier texte, image ou contrôle de `main`.
    const barre = document.querySelector<HTMLElement>('[data-testid="barre-du-bas"]');
    const cale = barre && visible(barre) ? (barre.previousElementSibling as HTMLElement | null) : null;
    const hauteurCale = cale && getComputedStyle(cale).display !== "none" ? cale.getBoundingClientRect().height : 0;
    let basContenu = 0;
    for (const el of Array.from(document.querySelectorAll("main :is(h1, h2, h3, p, span, li, a, button, input, textarea, select, img, svg, label, td, th)"))) {
      if (!visible(el) || el.closest('[aria-hidden="true"], nextjs-portal')) continue;
      let fixe = false;
      for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).position === "fixed") fixe = true;
      if (!fixe) basContenu = Math.max(basContenu, el.getBoundingClientRect().bottom + window.scrollY);
    }
    const defile = doc.scrollHeight - window.innerHeight;
    if (basContenu + hauteurCale <= window.innerHeight && defile > 24) {
      resultat.e.push(`le document défile de ${defile} px (contenu fini à ${Math.round(basContenu)} px, cale ${Math.round(hauteurCale)} px, écran ${window.innerHeight} px)`);
    }
    return resultat;
  });
}

async function ouvrir(page: Page, chemin: string, sombre: boolean) {
  interdireDialoguesNatifs(page);
  await page.emulateMedia({ colorScheme: sombre ? "dark" : "light" });
  await page.addInitScript(([s]) => {
    localStorage.setItem("i18nextLng", "fr");
    localStorage.setItem("theme", s ? "dark" : "light");
  }, [sombre] as const);
  await page.clock.setFixedTime(new Date("2026-11-02T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (r) => {
    const feuille = new URL(r.request().url()).searchParams.get("sheet") ?? "";
    return r.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  await signInAs(page, ADMIN, DOCS, "/setlists");
  await page.goto(chemin);
  await expect(page.locator("main").first()).toBeVisible();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => { const st = document.createElement("style"); st.textContent = "nextjs-portal { display: none !important; }"; document.head.appendChild(st); });
  // Les apparitions (`page-fade`, ouverture des cartes) doivent être finies : un élément à demi transparent n'est pas mesuré.
  await page.waitForTimeout(600);
  // (sans les animations infinies — un indicateur de chargement —, dont `finished` ne se résout jamais)
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
}

const garde = (nom: string, mesure: Exemption["mesure"], lignes: string[]) =>
  lignes.filter((l) => !EXEMPTIONS.some((x) => x.page === nom && x.mesure === mesure && l.includes(x.contient)));

for (const p of PAGES) {
  for (const sombre of p.sombre ? [false, true] : [false]) {
    test(`${p.nom}${sombre ? " (sombre)" : ""} : groupes lisibles, marges, voisins alignés, pas de vide`, async ({ page }) => {
      test.setTimeout(240_000);
      await ouvrir(page, p.chemin, sombre);
      const m = await mesurer(page);
      // PW_CAPTURES=<dossier> : la page mesurée, à regarder à l'œil (une par appareil).
      if (process.env.PW_CAPTURES) await page.screenshot({ path: `${process.env.PW_CAPTURES}/groupes-${p.nom}${sombre ? "-sombre" : ""}-${test.info().project.name}.png`, fullPage: true });
      expect.soft(garde(p.nom, "a", m.a), "(a) aplat --secondary sur le gris de la page").toEqual([]);
      expect.soft(garde(p.nom, "b", m.b), "(b) groupe de la couleur de la page, sans relief").toEqual([]);
      expect.soft(garde(p.nom, "c", m.c), "(c) texte à moins de 12 px du bord d'un groupe").toEqual([]);
      expect.soft(garde(p.nom, "d", m.d), "(d) groupes voisins de hauts différents").toEqual([]);
      expect.soft(garde(p.nom, "e", m.e), "(e) page courte qui défile dans le vide").toEqual([]);
    });
  }
}
