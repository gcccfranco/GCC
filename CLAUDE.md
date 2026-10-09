# CLAUDE.md — GCC Louange

Site de partitions de louange pour l'église GCC. Spec complète dans `cahier-des-charges-site-louange.md`.
Specs de fonctionnalités en attente : `docs/` (ex. `docs/spec-ajouter-un-chant.md`).
Feuille de route (fait / à venir / demandes à trancher, avec l'historique) :
`docs/feuille-de-route.md` ; vision produit : `docs/intent/vision-site.md`.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Firebase Auth + Firestore · Resend (emails) · Vercel

## Commandes
```bash
npm run dev          # Serveur de développement
npm run build        # build:index + next build
npm run build:index  # Parse content/songs/*.cho → public/songs-index.json
npm run validate     # Valide les fichiers .cho (métadonnées, parsing)
npm run lint         # ESLint (flat config, eslint.config.mjs)
npx tsc --noEmit     # Vérification TypeScript (c'est ce que fait la CI)
```

## Tests — Playwright
```bash
npm test                          # suite Playwright (tests/), démarre next dev sur :3100
npm test -- --ui                  # mode interactif
PW_SLUGS=all npm test             # les 80 partitions 简谱 certifiées (~2 min)
PW_CHANTS_ZH=all npm test -- tests/lignes-chinoises.spec.ts --project=telephone --workers=2
                                  # lignes chinoises coupées, les 188 chants (~4 min)
npm run jianpu:audit <slug>       # planche d'audit visuel d'une 简谱, dans le navigateur
npm test -- tests/back-office-coupe.spec.ts   # le site tel qu'en ligne : second serveur (PW_PORT + 1) sans l'interrupteur
PW_CHANT=<slug> npm test -- tests/nouveau-chant.spec.ts   # un chant : sections, accords, +1 demi-ton, captures 3 appareils
```
**Tout test passe par Playwright, y compris la vérification à l'œil des
简谱** : la planche `npm run jianpu:audit <slug>` rend la page transposée
telle que le navigateur l'affiche (tranches qui se recouvrent, gravé
au-dessus, rendu dessous, cadre rouge sur chaque accord converti) et sort des
PNG dans `scripts/jianpu/debug/` — à *regarder*, jamais à croire sur parole.
Les rendus PIL de `scripts/jianpu/*.py` restent des dépannages hors ligne :
ils ne voient pas le composant réel. Détail du protocole dans
`scripts/jianpu/LOOP.md`.

- **Trois appareils, toujours** (consigne de Timothée du 14/09/2026) : tout test
  Playwright tourne sur **ordinateur, téléphone et tablette** (un projet par
  appareil dans `playwright.config.ts`, tous sous Chromium : WebKit écarté). Les captures regardées à l'œil aussi :
  les trois tailles. Un test propre à un appareil le dit dans son titre.
- **Deux serveurs de test** : le second (`PW_PORT + 1`, interrupteur du back-office coupé) a son propre dossier de build `.next-coupe` — Next 16 refuse deux `next dev` dans le même dossier. Au démarrage il peut réécrire une ligne de `next-env.d.ts` (chemin des types) : **ne pas la commiter**, un `npm run dev` ordinaire la remet.
- `tests/helpers/jianpu.ts` : ouvrir un chant, afficher sa 简谱, lire le calque.
- La page chant lit ses paramètres d'URL en **JSON** : `?key=%22F%22`, pas `?key=F`.
- Viser `localhost` et non `127.0.0.1` : `next dev` bloque ses ressources en
  cross-origin et la page arrive **non hydratée** — visible mais morte.

## Architecture clé
- **Chants** : fichiers `.cho` (ChordPro) dans `content/songs/`, parsés au build → `public/songs-index.json` (utilisé côté client pour liste/recherche)
- **Setlists, profils, annonces** : Firestore — voir `src/lib/firebase/`
- **Firestore = API REST uniquement** (`fetch` + token Firebase Auth). Jamais le SDK WebChannel côté navigateur (bloqué sur certains réseaux). Seul `firebase/auth` est utilisé du SDK.
- **Comptes & rôles** : profils dans `users/{uid}` (rôles, lieux de service, EDD, groupe). Permissions client dans `src/lib/access.ts`, miroir serveur dans `firestore.rules`.
- **`firestore.rules`** : versionné ici mais doit être **publié manuellement dans la console Firebase** pour prendre effet. La liste des admins doit rester synchronisée avec `ADMIN_EMAILS` dans `src/lib/access.ts`.
- **Confidentialité (choix assumé)** : les rules autorisent `read: if signedIn()` sur **toutes** les setlists et tous les profils. Le filtrage `isPrivate` / visibilité par service (`canSeeSetlist`, `src/lib/access.ts`) est **côté client uniquement** — un membre connecté peut techniquement lire en REST une setlist privée ou un profil. Acceptable pour un outil interne de confiance ; ne pas re-signaler comme faille sans nouvelle demande de durcissement.
- **Routes API** (18, toutes sous `src/app/api/`) : `/api/song/[slug]` (contenu d'un chant), `/api/report` (signalement par email via Resend — env `RESEND_API_KEY`, `MAIL_TO`, `EMAIL_FROM` sur Vercel), `/api/cron/reminders` (seul cron), `/api/push/*` (notify-setlist, notify-evenement, notify-audience, broadcast), `/api/setlist/presentation`, `/api/evenements/{inscription,desinscription}`, `/api/scene/conflit`, `/api/taches/{assigne,fait}`, `/api/equipes/{importer,poles}`, `/api/planning/release`, `/api/admin/{migrer-annonces,importer-planning}`
- **Planning** : Google Sheet public lu en CSV (`src/lib/planning/sheets.ts`) + données statiques (`data.ts`)
- **PWA** : service worker `public/sw.js` — push + cache hors-ligne. Cache versionné (`gcc-louange-vN`, purgé à l'activation). **Rien n'est mis en cache sur un serveur local** (`localhost`, `127.0.0.1`, réseau local) : en développement les fichiers de Next n'ont pas de nom hashé, et le cache servait l'ancien code après chaque modification (16/09/2026). Stratégies : HTML **network-first** (le déploiement en ligne gagne toujours → pas de page périmée), `/_next/static/*` **cache-first** (content-hashé, immuable), polices + `songs-index.json` + `/api/song/*` + scans 简谱 (`/jianpu/*` et leurs `/_next/image`, gardés hors ligne depuis qu'ils s'affichent par défaut) **stale-while-revalidate**, reste réseau-seul. Firestore/Sheets/YouTube (autres origines) jamais mis en cache.
- **Hébergement** : Vercel. La CI GitHub (`.github/workflows/deploy.yml`) fait typecheck + validate.
- **Interrupteur du back-office** (lot 18, 20/09/2026, `docs/spec-mise-en-ligne.md`) : `BACK_OFFICE` (`src/lib/backOffice.ts`) = `NEXT_PUBLIC_BACK_OFFICE === "1"`. Posé à `1` dans `.env.local`, **absent sur Vercel** : en ligne, tâches, équipes, planning en grille, section Évènements, scène et blocs admin associés sont coupés (entrées masquées, pages et routes en 404, planning = `AncienTableau.tsx` lu dans le Sheet seul, rappel du matin réduit aux services). Toute nouvelle fonctionnalité de back-office passe derrière cette constante. ⚠ Local et en ligne partagent le même Firestore.

## Formats importants
- ChordPro : `[accord]paroles` dans les lignes, `{directive: valeur}` en en-tête — règles complètes dans `docs/chants/01-format-cho.md` (format, tables) et `docs/chants/02-placement-accords.md` (placement mesuré)
- **Nouveau chant depuis une partition** (fr ou zh, `.cho` + calque 简谱) : suivre `docs/chants/00-nouveau-chant.md`, seul point d'entrée ; outils `scripts/cho/` (`inspect`, `lint`, `pinyin`, `check`, `draft`) ; décisions dans `docs/spec-guidelines-cho.md`. Aucun accord ne se place à l'œil : `check.py` mesure, et tout doute s'écrit `{needs_review: …}`
- Tonalité recommandée : `{recommended_key: D}` en en-tête, sous `{key}` — la plus chantée à GCC, **validée par Timothée** (`docs/tonalites-recommandees.md`, recalcul en lecture seule : `npx tsx scripts/recommended-keys.ts`) ; affichée par défaut, et un chant ajouté à une setlist y démarre
- Chinois : `[C]caractères   pinyin` (3 espaces min entre chars et pinyin)
- Jianpu simple : `{jianpu: 3 3 5 6 5}` sur la ligne juste au-dessus des paroles
- Partition 简谱 : **l'image du scan**, avec un calque des accords (approche image,
  `src/components/jianpu/JianpuSheet.tsx`, `public/jianpu/`, protocole dans
  `scripts/jianpu/LOOP.md`). Le bloc `{start_of_jianpu}…{end_of_jianpu}` est encore
  lu par le parseur mais plus rendu (l'ancien `JianpuScore.tsx` n'existe plus)

## Couleurs spec
- Accords : `#3f63cf` (bleu, `--chord-color` dans `globals.css` ; le `#2563EB` du cahier des charges n'est plus utilisé)
- Sections : `#EA580C` (orange)
- Jianpu : `#B91C1C` (rouge foncé)

## Règles
- Un commit par étape ou par lot, pas un commit par fichier (consigne de Timothée du 13/09/2026)
- Tester sur au moins 1 chant FR + 1 chant ZH avant de valider une étape
- Toute modif des permissions doit être faite en double : `src/lib/access.ts` (client) **et** `firestore.rules` (serveur)

## Sessions cloud (claude.ai/code) — règles de Timothée (08/10/2026)
Une session cloud n'a pas la mémoire des sessions locales : ces règles valent pour elle comme pour les autres.
- **Branches** : `ui/apple-design` = le travail en cours. Tout s'y fait, directement : **aucune autre branche**, pas de
  branche de lot à fusionner. `main` = le site en ligne (Vercel déploie chaque push) : n'y pousser **que sur un ordre
  explicite de Timothée, donné au moment même** (un « oui » à une autre question n'en est pas un). Une correction faite
  sur `main` est ensuite reportée sur `ui/apple-design` par une fusion (jamais de rebase de `main`).
- **Pousser** : `git pull --rebase` sur la branche juste avant chaque push (d'autres sessions poussent aussi) ; jamais de
  `push --force`, jamais de suppression de branche. Indexer **par nom** (jamais `git add -A`) ; ne jamais commiter
  `next-env.d.ts` ni `tsconfig.json` réécrits par un serveur de test, `test-results/`, `.next*/`.
- **Secrets** : l'environnement cloud ne contient que les variables `NEXT_PUBLIC_*` (configuration web, publique).
  Aucune lecture de la vraie base Firestore, aucune vraie notification : tout est simulé dans les tests
  (`tests/helpers/fakeSession.ts`). Une modification de `firestore.rules` se publie à la main par Timothée : le dire.
- **Dépôt public** : aucun nom réel de membre dans les tests, fixtures, specs ou commits ; des noms fictifs.
- **Tests** : `npx playwright install --with-deps chromium` au début de la session, puis les règles « Tests — Playwright »
  ci-dessus (trois appareils toujours ; les cinq projets pour les specs d'agencement).
- **Méthode** : specs dans `docs/`, feuille de route `docs/feuille-de-route.md` ; on ne code un lot qu'après le go de
  Timothée ; un commit par lot ou par tranche, message en français.

## Comportement (guidelines Karpathy)

### Penser avant de coder
- Expliciter les hypothèses avant d'implémenter. Si incertain, demander.
- Si plusieurs interprétations existent, les présenter — ne pas choisir silencieusement.
- Si une approche plus simple existe, la proposer. Pousser en arrière si justifié.
- Si quelque chose est flou, s'arrêter et nommer ce qui est confus.

### Simplicité d'abord
- Minimum de code qui résout le problème. Rien de spéculatif.
- Pas de features au-delà de ce qui est demandé.
- Pas d'abstractions pour du code à usage unique.
- Pas de gestion d'erreurs pour des scénarios impossibles.

### Changements chirurgicaux
- Ne toucher que ce qui est nécessaire. Ne pas "améliorer" le code adjacent.
- Correspondre au style existant, même si on ferait différemment.
- Si du code mort est repéré, le mentionner — ne pas le supprimer.
- Nettoyer uniquement les imports/variables rendus orphelins par SES propres changements.

### Exécution orientée objectif
- Définir des critères de succès vérifiables avant de commencer.
- Pour les tâches multi-étapes, énoncer un plan bref avec vérification à chaque étape.

## Agent skills

### Issue tracker

Pas d'issues GitHub : le travail se suit dans `docs/feuille-de-route.md` et une spec par lot dans `docs/spec-*.md`. Voir `docs/agents/issue-tracker.md`.

### Triage labels

Les cinq étiquettes par défaut : `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Voir `docs/agents/triage-labels.md`.

### Domain docs

Un seul contexte : `CONTEXT.md` et `docs/adr/` à la racine, créés au besoin. Voir `docs/agents/domain.md`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
