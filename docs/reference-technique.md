# Référence technique — GCC Louange

Détail descriptif sorti de `CLAUDE.md` le 10/11/2026 (Timothée : alléger ce qui est relu à chaque requête). Les
**règles** restent dans `CLAUDE.md` ; ce fichier se lit à la demande, par section (`grep -n '^## '` puis la plage).
Les diagrammes du code sont dans `docs/ARCHITECTURE.md` (fichier généré, 60 000 caractères : par section aussi).

## Tests : commandes rares

```bash
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

## Tests : serveurs, helpers et pièges

- **Deux serveurs de test** : le second (`PW_PORT + 1`, interrupteur du back-office coupé) a son propre dossier de build `.next-coupe` — Next 16 refuse deux `next dev` dans le même dossier. Au démarrage il peut réécrire une ligne de `next-env.d.ts` (chemin des types) : **ne pas la commiter**, un `npm run dev` ordinaire la remet.
- `tests/helpers/jianpu.ts` : ouvrir un chant, afficher sa 简谱, lire le calque.
- La page chant lit ses paramètres d'URL en **JSON** : `?key=%22F%22`, pas `?key=F`.
- Viser `localhost` et non `127.0.0.1` : `next dev` bloque ses ressources en
  cross-origin et la page arrive **non hydratée** — visible mais morte.
- Pièges vus : le service worker charge lui-même polices, `songs-index.json` et `/api/song/*`, hors de portée de
  `page.route` (`test.use({ serviceWorkers: "block" })` pour les substituer) ; lire `db.writes` **après** un signe à
  l'écran (`toBeVisible`) — un test qui rougit sur un appareil différent à chaque passe est une course ; en mode
  louange, viser la scène avec le helper `onStage` de `tests/performance-mode.spec.ts` (une copie de mesure
  invisible double chaque bloc).

## Routes API

- **Routes API** (20, toutes sous `src/app/api/`) : `/api/song/[slug]` (contenu d'un chant), `/api/report` (signalement : écrit dans Firestore `reports` puis push aux admins ; aucun e-mail), `/api/cron/reminders` (seul cron), `/api/push/*` (notify-setlist, notify-evenement, notify-audience, broadcast), `/api/setlist/presentation`, `/api/evenements/{inscription,desinscription}`, `/api/scene/conflit`, `/api/taches/{assigne,fait}`, `/api/equipes/{rattachement,groupes}`, `/api/planning/{release,changements}`, `/api/fetes/{droits,saisir,musiques}`

## PWA et service worker

- **PWA** : service worker `public/sw.js` — push + cache hors-ligne. Cache versionné (`gcc-louange-v6`, purgé à l'activation ; le changer à la main quand les stratégies changent). **Rien n'est mis en cache sur un serveur local** (`localhost`, `127.0.0.1`, IP privées, `*.local` ; le banc `scripts/rude-epreuve` vise `127.0.0.2` pour voir le service worker travailler) : en développement les fichiers de Next n'ont pas de nom hashé, et le cache servait l'ancien code après chaque modification (16/09/2026). Stratégies : HTML **network-first avec une course de 3 s** (réseau lent, hors ligne ou 5xx → la copie en cache, rafraîchie en fond ; page jamais ouverte → `public/hors-ligne.html`), `/_next/static/*` **cache-first** (content-hashé, immuable), polices + `songs-index.json` + `/api/song/*` + scans 简谱 (`/jianpu/*`) **stale-while-revalidate**, reste réseau-seul ; plafonds de 300 entrées (`/_next/static`) et 250 (`/jianpu/`), les moins utilisées partent d'abord. Les JSON de `/jianpu/` (systemes, sections, marges) restent hors de ce plafond. Préchargés à l'installation : `/songs/`, `songs-index.json`, `/logo.png`, `hors-ligne.html`. La page d'une setlist ouverte en ligne envoie un message « precache » : le service worker garde son adresse, la liste, ses chants et leurs scans 简谱. La setlist elle-même (Firestore) est gardée par la page (`src/lib/setlist/copieHorsLigne.ts`, IndexedDB) : copie liée au compte, effacée à la déconnexion ou au changement de compte, 14 jours, servie en lecture seule avec un bandeau. Firestore/Sheets/YouTube (autres origines) jamais interceptés.

## Hébergement (Vercel, Previews)

- **Hébergement** : Vercel. La CI GitHub (`.github/workflows/deploy.yml`) fait typecheck + validate.
  **Seul `main` se déploie** (Timothée, 31/10/2026) : `vercel.json` → `git.deploymentEnabled` coupe tous les
  Previews (`*` et `**` à `false`, `main` à `true`), qui saturaient le stockage des déploiements (7,9 Go / 10 Go,
  offre Hobby). Ne pas réactiver les Previews ni retirer cette règle sans demande de Timothée ; une branche se vérifie
  en local (`npm run dev`, Playwright), pas sur une URL Preview. Rétention réglée dans Vercel : 1 jour pour les
  déploiements annulés, en erreur et de pré-production.

## Interrupteur du back-office

- **Interrupteur du back-office** (lot 18, 20/09/2026, `docs/spec-mise-en-ligne.md`) : `BACK_OFFICE` (`src/lib/backOffice.ts`) = `NEXT_PUBLIC_BACK_OFFICE === "1"`. Posé à `1` dans `.env.local` **et en ligne** depuis la fusion de fin octobre 2026 (Timothée, 29/10/2026) : le back-office est ouvert sur le site. Coupé (variable absente), tâches, équipes, planning en grille, section Évènements, scène et blocs admin associés disparaissent (entrées masquées, pages et routes en 404, planning = `AncienTableau.tsx` lu dans le Sheet seul, rappel du matin réduit aux services). Toute nouvelle fonctionnalité de back-office passe derrière cette constante. ⚠ Local et en ligne partagent le même Firestore.

## Couleurs

Le CSS fait foi (`src/app/globals.css`).

- Accords : `#3f63cf` (bleu, `--chord-color` dans `globals.css` ; le `#2563EB` du cahier des charges n'est plus utilisé)
- Sections : variables `--sec-*` de `globals.css` (le CSS fait foi), p. ex. refrain `--sec-chorus` `#e0560a` (orange) en clair, `#fb923c` en sombre ; le `#EA580C` du cahier des charges n'est plus utilisé
- Jianpu : `--jianpu-color` `#b3261d` (rouge foncé) en clair, `#ff7d72` en sombre ; le `#B91C1C` du cahier des charges n'est plus utilisé
- Accords en sombre : `--chord-color` `#8fb0ff`

## Délégation : agents et workflows

Rôles détaillés (texte du `CLAUDE.md` avant le 10/11/2026). Depuis, la conversation principale ne relit plus tout le
diff ni toutes les captures : règle « Captures et diff » du `CLAUDE.md`.

- **Déléguer** aux agents de `.claude/agents/` : `chercheur` (Haiku) pour une recherche qui parcourt plusieurs
  fichiers, `testeur` (Haiku) pour lancer une suite de tests et en rapporter les échecs, `executant` (Sonnet) pour
  appliquer une modification déjà décidée et décrite, `relecteur` (Sonnet) pour contre-vérifier un diff ou un constat,
  `regard` (Sonnet) pour trier des captures ; équipe design : `directeur-artistique` (Opus) pour proposer des pistes,
  `maquettiste` (Sonnet) pour les rendre en planche, `critique-design` (Opus, 03/11/2026) pour les critiquer. La conversation principale garde le jugement : specs, planches,
  débogage, relecture du diff, regard sur les captures et les 简谱.
- **Workflows** de `.claude/workflows/` (24/10/2026, `docs/orchestration.md`) : `/tranche` code une tranche décidée
  (executant → testeur → corrections → conseil Opus si ça résiste → relecteur, sans commit) ; `/verifier-constats`
  contre-vérifie des constats avant un rapport ; `/planche` fait une planche de design (sans commit ni publication) ; `/audit-code` refait l'audit en 11 dimensions (≈ 60 agents, sur
  demande seulement). Un fichier ajouté sous `.claude/` s'indexe avec `git add -f` (le dossier est ignoré).

## Build : détail de `build:index`

npm run build:index  # build-glyph-widths (largeurs de glyphes → glyphWidths.json) + build-index (content/songs/*.cho → public/songs-index.json)
                     # + build-harmonie (docs/harmonie/*.md → public/harmonie-index.json) + build-cours (docs/harmonie/cours/*.md → public/harmonie-cours/)

## Données, comptes et confidentialité (texte complet)

- **Chants** : fichiers `.cho` (ChordPro) dans `content/songs/`, parsés au build → `public/songs-index.json` (utilisé côté client pour liste/recherche)
- **Setlists, profils, annonces** : Firestore — voir `src/lib/firebase/`
- **Firestore = API REST uniquement** (`fetch` + token Firebase Auth). Jamais le SDK WebChannel côté navigateur (bloqué sur certains réseaux). Seul `firebase/auth` est utilisé du SDK.
- **Comptes & rôles** : profils dans `users/{uid}` (rôles, lieux de service, EDD, groupe). Permissions client dans `src/lib/access.ts`, miroir serveur dans `firestore.rules`.
- **`firestore.rules`** : versionné ici mais doit être **publié manuellement dans la console Firebase** pour prendre effet. La liste des admins doit rester synchronisée avec `ADMIN_EMAILS` dans `src/lib/access.ts`.
- **Confidentialité (choix assumé)** : les rules autorisent `read: if signedIn()` sur **toutes** les setlists et tous les profils. Le filtrage `isPrivate` / visibilité par service (`canSeeSetlist`, `src/lib/access.ts`) est **côté client uniquement** — un membre connecté peut techniquement lire en REST une setlist privée ou un profil. Acceptable pour un outil interne de confiance ; ne pas re-signaler comme faille sans nouvelle demande de durcissement.
- **Planning** : Google Sheet public lu en CSV (`src/lib/planning/sheets.ts`) + données statiques (`data.ts`)

## Formats de chant (texte complet)

- ChordPro : `[accord]paroles` dans les lignes, `{directive: valeur}` en en-tête — règles complètes dans `docs/chants/01-format-cho.md` (format, tables) et `docs/chants/02-placement-accords.md` (placement mesuré)
- **Nouveau chant depuis une partition** (fr ou zh, `.cho` + calque 简谱) : suivre `docs/chants/00-nouveau-chant.md`, seul point d'entrée ; outils `scripts/cho/` (`inspect`, `lint`, `pinyin`, `check`, `draft`) ; décisions dans `docs/spec-guidelines-cho.md`. Aucun accord ne se place à l'œil : `check.py` mesure, et tout doute s'écrit `{needs_review: …}`
- Tonalité recommandée : `{recommended_key: D}` en en-tête, sous `{key}` — la plus chantée à GCC, **validée par Timothée** (`docs/tonalites-recommandees.md`, recalcul en lecture seule : `npx tsx scripts/recommended-keys.ts`) ; affichée par défaut, et un chant ajouté à une setlist y démarre
- Chinois : `[C]caractères   pinyin` (3 espaces min entre chars et pinyin)
- Jianpu simple : `{jianpu: 3 3 5 6 5}` sur la ligne juste au-dessus des paroles
- Partition 简谱 : **l'image du scan**, avec un calque des accords (approche image,
  `src/components/jianpu/JianpuSheet.tsx`, `public/jianpu/`, protocole dans
  `scripts/jianpu/LOOP.md`). Le bloc `{start_of_jianpu}…{end_of_jianpu}` est encore
  lu par le parseur mais plus rendu (l'ancien `JianpuScore.tsx` n'existe plus)

## Sessions cloud : origine des règles

Une session cloud n'a pas la mémoire des sessions locales : ces règles valent pour elle comme pour les autres
(complétées le 13/10/2026 avec celles qui n'étaient qu'en mémoire locale). Une nouvelle consigne durable de Timothée
s'écrit ici, pas seulement en mémoire.
