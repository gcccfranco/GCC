# CLAUDE.md — GCC Louange

Site de partitions de louange pour l'église GCC. Spec complète dans `cahier-des-charges-site-louange.md` (hors dépôt).
Specs de fonctionnalités : `docs/spec-*.md` ; vision produit : `docs/intent/vision-site.md`.
Feuille de route : `docs/feuille-de-route.md` (état courant et index, court) ; l'historique est dans
`docs/archive/feuille-de-route-2026.md`, à consulter par grep ou par section, jamais en entier.
Détail technique (lu à la demande, par section) : `docs/reference-technique.md`, « référence » ci-dessous.

Stack : Next.js 16 (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Firebase Auth + Firestore · Vercel

## Commandes
```bash
npm run dev          # Serveur de développement
npm run build        # build:index + next build
npm run build:index  # glyphes, songs-index.json, harmonie (détail : référence § Build)
npm run validate     # Valide les fichiers .cho (métadonnées, parsing)
python3 scripts/build-fonts.py  # polices chinoises (woff2) : à relancer après tout ajout de texte chinois (chant,
                     # traduction) ; npm run validate signale un caractère manquant ; Vercel ne peut pas le lancer
npm run lint         # ESLint (flat config, eslint.config.mjs)
npx tsc --noEmit     # Vérification TypeScript (c'est ce que fait la CI)
npm test             # Playwright (tests/), next dev sur :3100 ; npm test -- tests/x.spec.ts pour une spec
npm run jianpu:audit <slug>     # planche d'audit visuel d'une 简谱, dans le navigateur
```
Commandes de test rares (80 简谱 certifiées, lignes chinoises, site sans back-office, un chant) : référence § Tests.

## Tests — Playwright
- **Tout test passe par Playwright, y compris la vérification à l'œil des 简谱** : `npm run jianpu:audit <slug>` sort
  des PNG dans `scripts/jianpu/debug/`, à *regarder*, jamais à croire sur parole (protocole : `scripts/jianpu/LOOP.md`).
- **Trois appareils, toujours** (consigne de Timothée du 14/09/2026) : tout test Playwright tourne sur **ordinateur,
  téléphone et tablette** (un projet par appareil dans `playwright.config.ts`, tous sous Chromium : WebKit écarté).
  Un test propre à un appareil le dit dans son titre.
- **Quatre dispositions** (`docs/spec-navigation-grand-ecran.md`, Q1) : téléphone, tablette portrait, tablette
  paysage (barre latérale réduite), ordinateur ; lecture plafonnée à 1 440 px. Toute modification d'interface se
  regarde à l'œil sur les quatre, plus 1 440 px pour une page de lecture. Une spec qui teste l'agencement d'une page
  s'ajoute à `SPECS_GRAND_ECRAN` (`playwright.config.ts`) : sans ça, elle ne tourne que sur trois appareils.
- Le second serveur de test (`PW_PORT + 1`, back-office coupé) peut réécrire une ligne de `next-env.d.ts` : **ne pas
  la commiter**. Paramètres d'URL de la page chant en **JSON** (`?key=%22F%22`) ; viser `localhost`, jamais `127.0.0.1`.
  Autres pièges et helpers : référence § Tests, à lire avant d'écrire une spec.

## Architecture clé
- **Chants** : `.cho` (ChordPro) dans `content/songs/`, parsés au build → `public/songs-index.json` (liste, recherche côté client)
- **Setlists, profils, annonces** : Firestore, `src/lib/firebase/`
- **Firestore = API REST uniquement** (`fetch` + token Firebase Auth). Jamais le SDK WebChannel côté navigateur (bloqué sur certains réseaux). Seul `firebase/auth` est utilisé du SDK.
- **Comptes & rôles** : profils dans `users/{uid}`. Permissions client dans `src/lib/access.ts`, miroir serveur dans `firestore.rules`.
- **`firestore.rules`** : versionné ici mais **publié manuellement dans la console Firebase** pour prendre effet. La liste des admins reste synchronisée avec `ADMIN_EMAILS` (`src/lib/access.ts`).
- **Confidentialité (choix assumé)** : les rules autorisent `read: if signedIn()` sur toutes les setlists et tous les profils ; le filtrage (`isPrivate`, `canSeeSetlist`) est côté client uniquement. Ne pas re-signaler comme faille sans nouvelle demande de durcissement.
- **Routes API** : 20, toutes sous `src/app/api/` ; liste dans la référence § Routes API.
- **Planning** : Google Sheet public lu en CSV (`src/lib/planning/sheets.ts`) + données statiques (`data.ts`)
- **PWA** : service worker `public/sw.js` (push + cache hors-ligne). Cache versionné (`gcc-louange-v6`) : **le changer à la main quand les stratégies changent**. Avant de toucher `sw.js` : référence § PWA.
- **Hébergement** : Vercel ; la CI GitHub fait typecheck + validate. **Seul `main` se déploie** (Timothée, 31/10/2026) : `vercel.json` coupe tous les Previews. Ne pas les réactiver ni retirer cette règle sans demande de Timothée ; une branche se vérifie en local (`npm run dev`, Playwright). Détail : référence § Hébergement.
- **Interrupteur du back-office** (`docs/spec-mise-en-ligne.md`) : `BACK_OFFICE` (`src/lib/backOffice.ts`), ouvert en local **et en ligne** (Timothée, 29/10/2026). **Toute nouvelle fonctionnalité de back-office passe derrière cette constante.** ⚠ Local et en ligne partagent le même Firestore. Détail : référence § Interrupteur.

## Formats importants
- ChordPro : `[accord]paroles`, `{directive: valeur}` en en-tête ; règles dans `docs/chants/01-format-cho.md` et `docs/chants/02-placement-accords.md`
- **Nouveau chant depuis une partition** (fr ou zh, `.cho` + calque 简谱) : suivre `docs/chants/00-nouveau-chant.md`, seul point d'entrée ; outils `scripts/cho/` (`inspect`, `lint`, `pinyin`, `check`, `draft`) ; décisions dans `docs/spec-guidelines-cho.md`. Aucun accord ne se place à l'œil : `check.py` mesure, et tout doute s'écrit `{needs_review: …}`
- Tonalité recommandée : `{recommended_key: D}` sous `{key}`, **validée par Timothée** (`docs/tonalites-recommandees.md`) ; affichée par défaut, et un chant ajouté à une setlist y démarre
- Chinois : `[C]caractères   pinyin` (3 espaces min entre chars et pinyin)
- Jianpu simple : `{jianpu: 3 3 5 6 5}` sur la ligne juste au-dessus des paroles
- Partition 简谱 : **l'image du scan** avec un calque des accords (`src/components/jianpu/JianpuSheet.tsx`, `public/jianpu/`). Le bloc `{start_of_jianpu}…{end_of_jianpu}` est encore lu par le parseur mais plus rendu
- Couleurs : le CSS fait foi (`globals.css` : `--chord-color`, `--sec-*`, `--jianpu-color`), pas le cahier des charges ; valeurs : référence § Couleurs

## Règles
- Un commit par étape ou par lot, pas un commit par fichier (consigne de Timothée du 13/09/2026)
- Tester sur au moins 1 chant FR + 1 chant ZH avant de valider une étape
- Toute modif des permissions doit être faite en double : `src/lib/access.ts` (client) **et** `firestore.rules` (serveur)
- Gestes sur les quatre systèmes (Windows, Android, iOS, macOS) : raccourcis par les évènements du navigateur (copy, paste), jamais par ⌘ seul ; Suppr et ⌫ font la même chose ; tout ce qui s'offre au survol a un équivalent au toucher ; les libellés disent ⌘ sur Apple, Ctrl ailleurs.

## Sessions cloud (claude.ai/code) — règles de Timothée (08/10/2026)
Valables pour toutes les sessions (complétées le 13/10/2026). Une nouvelle consigne durable de Timothée s'écrit ici,
pas seulement en mémoire.
- **Branches** (Timothée, 29/10/2026) : on ne passe plus par `ui/apple-design` (fusionnée). `main` = le site en ligne
  (Vercel déploie chaque push) : n'y pousser **que sur un ordre explicite de Timothée, donné au moment même** (un
  « oui » à une autre question n'en est pas un). En attendant, le travail reste sur la branche de la session.
- **Pousser** : `git pull --rebase` juste avant chaque push (d'autres sessions poussent aussi) ; jamais de
  `push --force`, jamais de suppression de branche. Indexer **par nom** (jamais `git add -A`) ; ne jamais commiter
  `next-env.d.ts` ni `tsconfig.json` réécrits par un serveur de test, `test-results/`, `.next*/`. Un fichier sous
  `.claude/` s'indexe avec `git add -f` (dossier ignoré). Un commit par lot ou par tranche, message en français.
- **Secrets** : l'environnement cloud n'a que les variables `NEXT_PUBLIC_*` (publiques). Aucune lecture de la vraie
  base Firestore, aucune vraie notification : tout est simulé dans les tests (`tests/helpers/fakeSession.ts`). Une
  modification de `firestore.rules` se publie à la main par Timothée : le dire.
- **Dépôt public** : aucun nom réel de membre dans les tests, fixtures, specs ou commits ; des noms fictifs, inventés
  pour chaque nouveau test (les lignes de `src/lib/planning/data.ts`, recopiées dans d'anciens tests, sont de vrais noms).
- **Tests** : `npx playwright install --with-deps chromium` au début de la session ; trois appareils toujours, les
  cinq projets pour les specs d'agencement.
- **Go** : un lot se code sur un mot explicite de Timothée, donné **après** la spec (« go », « feu vert », « vas-y pour
  le lot N ») ; une phrase au futur ou au conditionnel (« tu peux le coder », « je le montrerai ») décrit un plan. Un go
  vaut pour un lot, pas pour le suivant, ni pour une mise en ligne. Dans le doute, demander « go pour le lot N ? ».
- **Design** : une demande qui change l'apparence ou l'organisation des écrans commence par une planche (pistes aux
  trois tailles, recommandation marquée, questions à trancher), puis la spec, puis le code sur go. Planche = workflow
  `/planche` (équipe design, 02/11/2026, `docs/orchestration.md` § 4) ; la conversation principale relit, publie
  l'artefact et pose les questions. Après une `/tranche` qui change l'apparence, elle lance aussi `critique-design`.
  Zones gelées sauf demande explicite : § 2 « Restent gelés » de `docs/audit-ui-apple-design.md`.
- **Coder** (Timothée, 18/10/2026 ; seuil du 10/11/2026) : une tranche de spec ou plus → la session qui reçoit le go
  ne code pas ; elle lance une **nouvelle session** orchestratrice (`create_session`, même branche, spec et décisions
  dans la consigne) et garde la spec, les planches et le suivi. Une retouche (trois fichiers au plus, pas de spec,
  pas de décision nouvelle) → la session courante lance directement un `executant` puis un `testeur`, sans nouvelle
  session. Le go reste requis dans les deux cas.
- **Économie de contexte** (règles issues de l'audit des sessions, validées par Timothée le
  10/11/2026, à ajuster après deux ou trois lots) :
  - *Plafond* : toute session, principale comme orchestratrice, passe la main avant 200 000 tokens (≈ deux ou trois
    tranches) : elle écrit l'état dans le § Avancement de la spec ou dans la feuille de route, puis une session
    neuve reprend de là.
  - *Pas de réveil* : une orchestratrice n'envoie pas de message de suivi à la session d'origine ; elle écrit une
    ligne datée par tranche dans la spec et pousse. Un message seulement pour une question bloquante ou la fin du lot.
  - *Lire par section* : une spec ou un document de plus de 30 000 caractères se lit par section (grep des titres
    puis la plage), jamais en entier ; la consigne d'un agent cite la section.
  - *Captures et diff* : `regard` ouvre toutes les captures ; la conversation principale n'ouvre que celles qu'il
    signale, et au moins une par disposition (les quatre, plus 1 440 px pour une page de lecture). Elle lit le verdict du `relecteur` et `git diff --stat`, puis
    seulement les passages signalés.
  - *Attentes* : un agent ne reste pas en attente de plus de 5 minutes en avant-plan (son cache expire) : Playwright
    est lancé par le `testeur`, les suites longues en tâche de fond ou en fragments.
- **Agents en parallèle** : quelques-uns à la fois (neuf d'un coup ont épuisé la limite de dépense du mois, le
  04/10/2026) ; un agent coupé se reprend par SendMessage, contexte intact.
- **Déléguer** aux agents de `.claude/agents/` : `chercheur`, `testeur` (Haiku) ; `executant`, `relecteur`, `regard`,
  `maquettiste` (Sonnet) ; `directeur-artistique`, `critique-design` (Opus). Workflows (`docs/orchestration.md`) :
  `/tranche`, `/verifier-constats`, `/planche` (aucun ne commite) ; `/audit-code` (≈ 60 agents) sur demande seulement.
  Rôles : référence § Délégation. La conversation principale garde le jugement : specs, planches, débogage,
  agencement, 简谱.

## Comportement (guidelines Karpathy)
- **Penser avant de coder** : expliciter les hypothèses ; incertain ou flou → s'arrêter, nommer ce qui est confus,
  demander. Plusieurs interprétations → les présenter, ne pas choisir en silence. Approche plus simple → la proposer,
  pousser en arrière si justifié.
- **Simplicité d'abord** : le minimum de code qui résout le problème ; rien de spéculatif, pas de features non
  demandées, pas d'abstraction pour un usage unique, pas de gestion d'erreurs pour des scénarios impossibles.
- **Changements chirurgicaux** : ne toucher que le nécessaire, sans « améliorer » le code adjacent ; suivre le style
  existant ; code mort repéré → le mentionner, ne pas le supprimer ; ne nettoyer que les imports et variables rendus
  orphelins par ses propres changements.
- **Orienté objectif** : critères de succès vérifiables avant de commencer ; tâche multi-étapes → plan bref avec
  vérification à chaque étape.

## Agent skills
Pas d'issues GitHub : suivi dans `docs/feuille-de-route.md` et une spec par lot (`docs/agents/issue-tracker.md`) ;
cinq étiquettes de triage par défaut (`docs/agents/triage-labels.md`) ; un seul contexte, `CONTEXT.md` et `docs/adr/`
à la racine, créés au besoin (`docs/agents/domain.md`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
