# Audit UX / code — GCC Louange

*Audit du 13 juillet 2026, branche `ux-mobile` (commit `904feab`).*

**Méthode et limite importante** : la session n'avait pas d'accès à Chrome. L'audit couvre (1) la totalité du code des routes et composants, et (2) le rendu livré par https://grace-church-chinese.vercel.app vérifié via fetch HTTP (HTML serveur, redirections, headers, tailles de ressources). Ce qui n'a **pas** pu être vérifié visuellement : interactions tactiles réelles, animations, dark mode à l'écran, rendu exact du responsive. Les problèmes de layout signalés ci-dessous sont déduits du code (classes, valeurs magiques) — fiables mais à confirmer à l'écran. Pour une passe visuelle, ajouter le MCP Chrome DevTools dans une session interactive.

---

## 1. Synthèse

Le site est **globalement en bonne santé** : le cœur du produit (fiche chant, setlists, mode Louange) est soigné, pensé pour le pupitre (wake lock, pédales Bluetooth, annotations, presets de rôle, safe-areas iOS), et les états vide/erreur des flux principaux existent. Les trois faiblesses majeures sont : **le hors-ligne est mort** (le service worker ne cache plus rien, critique pour une PWA utilisée en culte avec réseau instable), **le bilinguisme est à deux vitesses** (tout le planning, les annonces et une partie des setlists restent en français quel que soit le réglage 中文, alors que les fichiers de traduction sont à parité parfaite 435/435 clés), et **le poids réseau des polices CJK** (~19 Mo chargés dès qu'une partition s'affiche, + 33 Mo de polices mortes déployées). S'y ajoutent un crash potentiel par URL partagée (JSON.parse non protégé), l'absence totale de `error.tsx`/`not-found.tsx`, et pas de réinitialisation de mot de passe — bloquant pour un public non technique.

## 2. Cartographie des routes

Source : `src/app/` (rien d'autre que le router — pas de rewrites dans `next.config.ts`, qui ne définit que `trailingSlash: true` et `images.unoptimized`).

### Pages (17)

| Route | Fichier | Accès | Vue |
|---|---|---|---|
| `/` | [page.tsx](src/app/page.tsx) | redirect → `/planning` | — |
| `/login`, `/signup`, `/profil` | [(auth)/](src/app/(auth)/) | public / public / garde inline | code + HTML live |
| `/songs` | [songs/page.tsx](src/app/songs/page.tsx) | **public**, SSG (`force-static`) | code + HTML live (369 chants rendus serveur ✓) |
| `/songs/[slug]` | [songs/[slug]/page.tsx](src/app/songs/[slug]/page.tsx) | public, SSG (`generateStaticParams`) | code |
| `/setlists`, `/setlists/new`, `/setlists/[id]`, `/setlists/[id]/edit` | [setlists/](src/app/setlists/) | `RequireAuth` (layout) + gardes inline | code |
| `/planning` + `culte`, `table`, `groupes`, `edd`, `campus`, `intergroupe`, `interfranco` | [planning/](src/app/planning/) | `RequireAuth` (layout) | code |
| `/mes-services` | [mes-services/page.tsx](src/app/mes-services/page.tsx) | garde inline | code |
| `/annonces` | [annonces/page.tsx](src/app/annonces/page.tsx) | garde inline | code |
| `/notifier` | [notifier/page.tsx](src/app/notifier/page.tsx) | rôle `notify` / admin | code (survolé) |
| `/admin` | [admin/page.tsx](src/app/admin/page.tsx) | admin | code (survolé) |
| `/guide` | [guide/page.tsx](src/app/guide/page.tsx) | `RequireAuth` inline | code |

### API (8)

`/api/song/[slug]` (contenu ChordPro), `/api/report` (Resend), `/api/planning/release`, `/api/push/{broadcast,notify-annonce,notify-audience,notify-setlist}`, `/api/cron/reminders`.

### Constats structurels immédiats

- **Aucun** `error.tsx`, `not-found.tsx`, `loading.tsx` dans tout `src/app` — voir T4.
- Overlays hors router : mode Louange ([PerformanceMode.tsx](src/components/performance/PerformanceMode.tsx), plein écran z-9999), sheet d'édition de ligne, panneau de personnalisation.
- Vérifié en live : `/` → 307 `/planning` ; `/songs` → 308 `/songs/` (trailingSlash) ; `/songs/` = 43 Ko compressé, contenu complet en SSR.

---

## 3. Problèmes transversaux

Classés par rentabilité (impact × effort). Barème impact : 🟥 bloquant / 🟧 gênant / 🟨 cosmétique.

### T1 — 🟥 La PWA ne fonctionne plus du tout hors ligne · effort : heures

- **Symptôme** : en cave, en sous-sol d'église ou en 3G instable, *rien* ne charge — pas même un chant déjà consulté ou la setlist du jour. Pour l'usage « pendant le culte », c'est le pire moment pour échouer.
- **Cause** : [public/sw.js:1-13](public/sw.js#L1-L13) — le service worker est devenu volontairement « push-only » (le cache provoquait l'affichage de déploiements périmés). Aucune stratégie de repli n'a remplacé le cache retiré. Le CLAUDE.md décrit encore l'ancien comportement (« cache-first assets, stale-while-revalidate pages »), donc la régression est facile à oublier.
- **Correctif** : réintroduire un cache **versionné par déploiement** pour régler le problème d'origine au lieu de tout supprimer : nom de cache dérivé d'un build ID injecté au build (`next.config` env → `sw.js` généré, ou Serwist/Workbox avec precache manifest), stratégie network-first avec repli cache pour les pages, cache-first pour `/fonts`, `/songs-index.json` et `/api/song/*` (contenu immuable entre deux déploiements). Au minimum : cacher `songs-index.json` + les `/api/song/*` consultés + le shell.
- **Note** : mettre à jour CLAUDE.md dans la foulée.

### T2 — 🟥 Bilinguisme à deux vitesses : planning, annonces et morceaux de setlists ignorent le réglage 中文 · effort : heures (mécanique)

- **Symptôme** : un membre sinophone bascule l'app en 中文 ; les chants, mes-services, le guide suivent… mais **tout le planning** (8 pages), **toutes les annonces**, les onglets/placeholder/états vides de `/setlists`, « Chargement… », « Relâcher pour actualiser », « Mes dates », « Cette semaine », « Aucune donnée », « Notifier », « Signaler un problème » restent en français. La convention du projet (« les deux langues également navigables ») est rompue précisément sur les pages logistiques que les non-francophones consultent le plus.
- **Cause** : ces fichiers n'importent pas `useTranslation` du tout ou mélangent `t()` et littéraux :
  - [planning/page.tsx](src/app/planning/page.tsx) (« Bienvenue », « Ton prochain service », « Ce dimanche », libellés Présidence/Piano/…), les 7 sous-pages, [PlanningTable.tsx:81,101,118,141](src/components/planning/PlanningTable.tsx#L81), [PlanningTabs.tsx:10-19](src/components/planning/PlanningTabs.tsx#L10-L19)
  - [annonces/page.tsx](src/app/annonces/page.tsx) (0 appel à `t()`, dates forcées `fr-FR` ligne 22)
  - [setlists/page.tsx:117-122,227,262,269](src/app/setlists/page.tsx#L117-L122)
  - [Navbar.tsx:262,275,551](src/components/layout/Navbar.tsx#L262), [RequireAuth.tsx:23](src/components/auth/RequireAuth.tsx#L23), [PullToRefresh.tsx:57](src/components/layout/PullToRefresh.tsx#L57)
- Les fichiers de locale sont pourtant **à parité parfaite** (435 clés FR = 435 ZH, vérifié par script) — l'infrastructure existe, seul le câblage manque.
- **Correctif** : passe mécanique d'extraction vers `fr.json`/`zh-CN.json`. Pour le planning, les libellés de rôles (Présidence, Piano…) peuvent devenir des clés `planning.roles.*` réutilisées par les 8 pages. `/admin` et `/notifier` (0 `t()` aussi) peuvent rester FR si les rôles concernés sont francophones — à trancher explicitement.

### T3 — 🟥 Pas de réinitialisation de mot de passe · effort : < 1 h

- **Symptôme** : un musicien qui oublie son mot de passe est définitivement bloqué (le public visé n'ira pas chercher un admin). Aucun lien « mot de passe oublié » sur [login/page.tsx](src/app/(auth)/login/page.tsx), et `grep sendPasswordReset` ne retourne rien dans tout `src/`.
- **Cause** : fonctionnalité jamais câblée ; Firebase Auth la fournit pourtant (`sendPasswordResetEmail`).
- **Correctif** : lien sous le formulaire → prompt email → `sendPasswordResetEmail(auth, email)` + message de confirmation. Deux traductions à ajouter.

### T4 — 🟧 Aucun filet d'erreur : ni `error.tsx`, ni `not-found.tsx`, ni `loading.tsx` · effort : < 1 h

- **Symptôme** : toute exception non rattrapée dans un composant client (voir T5) = page blanche sans issue. URL de chant erronée (`notFound()` dans [songs/[slug]/page.tsx:22](src/app/songs/[slug]/page.tsx#L22)) = 404 Next.js par défaut, en anglais, sans navigation pour revenir.
- **Correctif** : un `src/app/error.tsx` (message + bouton recharger) et un `src/app/not-found.tsx` (FR/ZH + lien `/songs`) suffisent. `loading.tsx` optionnel (les pages gèrent leur propre état).

### T5 — 🟥 Crash de la fiche chant par URL partagée (JSON.parse non protégé) · effort : minutes

- **Symptôme** : les liens de chants générés depuis une setlist embarquent du JSON en query (`?structure=[...]&sectionNotes={...}`, construits par [ListView.tsx:81-94](src/app/setlists/[id]/_components/ListView.tsx#L81-L94)). Ces URLs sont longues ; tronquées ou altérées au partage (WhatsApp/WeChat coupent), la page lève une exception au rendu → page blanche (aggravé par T4).
- **Cause** : [SongDetailClient.tsx:93-95](src/app/songs/[slug]/SongDetailClient.tsx#L93-L95) `JSON.parse(searchParams.get("structure")!)` exécuté à chaque rendu sans try/catch ; idem `sectionNotes` (l.101-103) et `key` (l.120-122).
- **Correctif** : wrapper `safeParse` qui retombe sur la valeur par défaut, et mémoïser (le parse tourne actuellement à chaque rendu).

### T6 — 🟧 ~19 Mo de polices CJK non subsettées chargées avec chaque partition, + 33 Mo de polices mortes · effort : heures

- **Symptôme** : première visite d'une fiche chant sur données mobiles = téléchargement de KaiTi.ttf (11 Mo) et Han-source.otf (7,9 Mo), **même pour un chant français** (les `localFont` de [SongView.tsx:61-78](src/components/song/SongView.tsx#L61-L78) sont déclarées au niveau module, donc préchargées par toute page qui rend une partition).
- **Causes** :
  1. Polices TTF/OTF brutes non subsettées, non woff2.
  2. `public/fonts/` contient 33 Mo **jamais référencés** (vérifié par grep) : ArialUnicode.ttf 22 Mo, NotoSansSC-Regular.ttf 10 Mo, NotoSans-*.ttf, SpaceMono, JianpuASCII — déployés chez Vercel pour rien.
  3. Les copies `public/fonts/*` servies aux PDF ont `cache-control: max-age=0, must-revalidate` (vérifié en live) — re-validation à chaque génération de PDF.
- **Correctif** : (1) supprimer les polices orphelines ; (2) convertir KaiTi/Han-source en woff2 subsettés (le corpus de caractères est fini : il est extractible de `content/songs/*.cho` au build — un subset couvrant les chants + interface pèserait ~500 Ko–1 Mo) ; (3) garder les TTF complets uniquement pour react-pdf (qui en a besoin), avec un header `Cache-Control: immutable` via `vercel.json`/`next.config headers`.

### T7 — 🟧 `@react-pdf/renderer` embarqué statiquement dans le bundle de la page la plus visitée · effort : minutes

- **Symptôme** : la fiche chant paie au chargement une lib PDF (~1,5 Mo minifiée + ses polices Registry) que 95 % des visites n'utilisent pas.
- **Cause** : [SongDetailClient.tsx:17-18](src/app/songs/[slug]/SongDetailClient.tsx#L17-L18) importe `pdf` et `SongPDF` statiquement — alors que [SetlistDetailClient.tsx:158-160](src/app/setlists/[id]/SetlistDetailClient.tsx#L158-L160) fait déjà, correctement, un `await import(...)` dans `handleDownload`.
- **Correctif** : aligner sur le pattern de SetlistDetailClient (import dynamique dans `handleDownload`).

### T8 — 🟧 Le planning peut afficher silencieusement des données périmées · effort : heures

- **Symptôme** : les pages planning affichent d'abord les **fallbacks statiques** compilés ([lib/planning/data.ts](src/lib/planning/data.ts)) puis les écrasent quand le CSV Google Sheets arrive. Si le fetch échoue (réseau, sheet renommée), l'utilisateur lit un planning **faux sans aucun indice** — pour vérifier qui sert dimanche, c'est le pire mode de défaillance possible.
- **Cause** : pattern répété partout : `fetchCulte().then(d => { if (d.length) setRows(d) })` ([planning/culte/page.tsx:31](src/app/planning/culte/page.tsx#L31), [planning/page.tsx:59-70](src/app/planning/page.tsx#L59-L70), etc.) — l'échec et le vide sont indistincts, aucun `.catch`, la page d'accueil planning n'a même pas d'indicateur de chargement.
- **Correctif** : distinguer trois états (chargement / données fraîches / repli) et afficher un bandeau discret « planning hors-ligne, données du JJ/MM » quand on est sur le fallback. Centraliser le pattern fetch+fallback dans un hook (il est copié dans 8 fichiers).

### T9 — 🟧 Barres d'outils fixes à offsets magiques : contenu recouvert quand la barre s'enroule · effort : heures

- **Symptôme** : sur petit écran, la barre d'outils de la setlist (`flex-wrap`, [SetlistDetailClient.tsx:576](src/app/setlists/[id]/SetlistDetailClient.tsx#L576)) passe sur deux lignes dès que « Adapter / Accords / Mode Louange / Prévenir » sont visibles, mais la marge de compensation du contenu reste `mt-[54px]` fixe ([l.746](src/app/setlists/[id]/SetlistDetailClient.tsx#L746)) → le haut de la setlist passe **sous** la barre. Même famille de valeurs magiques sur la fiche chant : `mt-[48px]` ([SongDetailClient.tsx:361](src/app/songs/[slug]/SongDetailClient.tsx#L361)) et `mt-[82px]` pour l'embed YouTube (l.347).
- **Cause** : hauteur de barre supposée constante alors qu'elle est fluide.
- **Correctif** : soit rendre la barre non-wrappante (elle l'est déjà quasi : tout passer en icônes sous `sm`), soit mesurer sa hauteur réelle (ref + `ResizeObserver` → variable CSS, comme `--nav-h`).

### T10 — 🟧 Couleurs de service définies à trois endroits · effort : minutes

- **Symptôme** : risque de dérive déjà visible — l'onglet « Groupes » de [PlanningTabs.tsx:14](src/components/planning/PlanningTabs.tsx#L14) n'a pas de couleur alors que chaque groupe en a une, et chaque page planning redéclare son `COLOR` en dur ([culte/page.tsx:20](src/app/planning/culte/page.tsx#L20), [groupes/page.tsx:22-26](src/app/planning/groupes/page.tsx#L22-L26)…), en parallèle de [serviceColors.ts](src/lib/serviceColors.ts) qui est censé être la « source unique ».
- **Correctif** : faire importer `serviceColors.ts` (ou un `PLANNING_COLORS` qui y vit) par PlanningTabs et les pages. Attention : les couleurs elles-mêmes sont gelées (contrainte de la refonte 2026), il s'agit seulement de dédupliquer.

### T11 — 🟧 Cibles tactiles sous les minima sur plusieurs pages · effort : minutes par cas

Contexte d'usage : debout, une main occupée. Minimum recommandé 44 px (Apple) / 24 px (WCAG 2.5.8).

- Index alphabétique flottant : boutons **28×17 px** ([SongListClient.tsx:341-348](src/app/songs/SongListClient.tsx#L341-L348)). C'est la pire cible du site, sur la page la plus utilisée. → passer à `h-6`/`w-8` minimum, ou zone de drag continue.
- Boutons éditer/supprimer d'une annonce : 28×28 px ([annonces/page.tsx:262,285](src/app/annonces/page.tsx#L262)).
- Boutons du mode Louange : 36 px sur mobile (`h-9 sm:h-11`, [PerformanceMode.tsx:1142](src/components/performance/PerformanceMode.tsx#L1142)) — inverser la logique : c'est sur téléphone qu'on vise mal.
- Croix « effacer la recherche » : `p-2` autour d'une icône h-4 = ~32 px ([setlists/page.tsx:230-237](src/app/setlists/page.tsx#L230-L237)).

### T12 — 🟧 `<html lang="fr">` figé, même en 中文 · effort : minutes

- **Symptôme** : lecteurs d'écran en prononciation française sur du chinois ; surtout, les navigateurs **choisissent les glyphes han selon `lang`** — sans `lang="zh-CN"`, certains caractères peuvent s'afficher avec des variantes japonaises selon la police de repli.
- **Cause** : [layout.tsx:40](src/app/layout.tsx#L40) statique ; [I18nProvider.tsx](src/lib/I18nProvider.tsx) change la langue i18next sans toucher au DOM. Le `manifest.webmanifest` est aussi `"lang": "fr"`.
- **Correctif** : dans I18nProvider, `useEffect` sur `i18n.language` → `document.documentElement.lang = lang`. Noter `lang="zh-CN"` sur les blocs de paroles chinoises dans SongView serait le complément propre (les sections connaissent leur langue).

### T13 — 🟧 PWA verrouillée en portrait · effort : minutes

- **Symptôme** : `"orientation": "portrait"` dans [manifest.webmanifest](public/manifest.webmanifest). Sur Android installé, la tablette posée en **paysage sur un pupitre** — cas d'usage explicite du mode Louange et de son layout 2 colonnes — reste coincée en portrait.
- **Correctif** : `"any"` (ou supprimer la clé). Vérifier au passage `theme_color #EA580C` vs primary réel `#e0560a` (cosmétique).

### T14 — 🟨 Duplication du pattern « état de liste dans l'URL + restauration du scroll » · effort : heures (refactor opportuniste)

- **Cause** : [SongListClient.tsx:36-82](src/app/songs/SongListClient.tsx#L36-L82) et [useSetlistsNavState.ts](src/hooks/useSetlistsNavState.ts) sont le même code copié (init depuis l'URL, `history.replaceState`, `sessionStorage` scroll, clé `lastListPath` partagée). Le mécanisme `lastListPath` sert aussi de bouton retour aux fiches chant/setlist — il fonctionne, mais trois écritures concurrentes de la même clé sans convention documentée ([SetlistDetailClient.tsx:102-108](src/app/setlists/[id]/SetlistDetailClient.tsx#L102-L108) le filtre, [SongDetailClient.tsx:60-63](src/app/songs/[slug]/SongDetailClient.tsx#L60-L63) prend tout) : fragile au prochain contributeur.
- **Correctif** : un hook `useListNavState(storageKey)` unique + un commentaire de contrat sur `lastListPath`.

### T15 — 🟨 Trois générations de barres d'outils / boutons coexistent · effort : refonte progressive

- **Symptôme** : la fiche chant utilise `Button` shadcn h-9/h-8, la setlist des `<button>` artisanaux h-8 rounded-[8px], la navbar des h-[34px] rounded-[9px] ; tailles de texte 12.5/13/13.5px selon la page. C'est le symptôme classique de pages écrites à des époques différentes — cohérent avec la direction « sobre » mais pas unifié.
- **Correctif** : non prioritaire ; à traiter via la refonte UI 2026 déjà en mémoire (composant `ToolbarButton` partagé).

### T16 — 🟨 Chargements « texte centré plein écran » et flashs blancs · effort : heures

- Tous les états de chargement sont un `<p>Chargement…</p>` centré ; la fiche chant a un `Suspense fallback={null}` ([songs/[slug]/page.tsx:18](src/app/songs/[slug]/page.tsx#L18)) → écran blanc pendant l'hydratation, doublé du fade de [PageTransition](src/components/layout/PageTransition.tsx). Des skeletons (liste de chants, cartes setlists) rendraient la perf perçue bien meilleure sur mobile lent. Non bloquant.

---

## 4. Problèmes par page

Classés par impact × effort au sein de chaque page.

### `/songs` (liste des chants)

1. 🟧 **Rail de couleur FR en dur, sans variante dark** — `#3f63cf` inline ([SongListClient.tsx:246,281](src/app/songs/SongListClient.tsx#L246)) alors que le rouge zh passe par `var(--jianpu-color)` qui s'adapte au dark (`#ff7d72`). En sombre, le bleu FR reste le bleu clair du light. Correctif : `var(--chord-color)` (déjà défini dans les deux thèmes). Minutes.
2. 🟧 **Index A–Z : cibles 17 px de haut** — voir T11. C'est le point noir ergonomique de la page.
3. 🟨 **Compensation `pr-7` copiée trois fois** (l.233, 256, 271) pour éviter l'index A-Z — un wrapper suffirait. Minutes.
4. 🟨 La recherche ne couvre ni les paroles ni un éventuel titre traduit (Fuse sur `title`, `titlePinyin`, `artist` — [l.84-92](src/app/songs/SongListClient.tsx#L84-L92)). Chercher un chant par un bout de refrain est un réflexe courant de musicien. L'index contient-il les premières lignes ? Si oui, les ajouter aux clés Fuse est trivial ; sinon, à générer dans `build:index`. Heures.

### `/songs/[slug]` (fiche chant)

1. 🟥 **JSON.parse non protégé** → T5.
2. 🟧 **Bundle PDF** → T7. **Polices** → T6.
3. 🟧 Le sélecteur de tonalité `<select>` n'a pas de bouton « revenir à l'original » d'un tap — il faut retrouver l'option « (orig) » dans la liste. En répétition, un reset visible à côté du `+`/`−` économise des allers-retours. Minutes ([SongDetailClient.tsx:206-222](src/app/songs/[slug]/SongDetailClient.tsx#L206-L222)).
4. 🟨 Le `useEffect` de restauration de structure (l.105-117) tourne une fois au montage avec un tableau de dépendances vide mais lit `structureOverride`/`sectionsNote` recalculés à chaque rendu — fonctionne par chance (remontage à chaque navigation de slug), fragile si la navigation devient client-side sur la même route. À sécuriser en même temps que T5.
5. 🟨 Bonnes pratiques déjà en place à noter : tap-pour-rappeler-la-barre, `recentSongs` localStorage, zoom persistant, `enterKeyHint`, taille 16px anti-zoom iOS.

### `/setlists` (liste)

1. 🟧 **Chaînes FR en dur** (états vides, placeholder, optgroups) → T2, lignes précises en T2.
2. 🟧 **Onglet « Mes setlists » sans état de chargement** : `loading && tab !== "mine"` ([setlists/page.tsx:290](src/app/setlists/page.tsx#L290)) — si `getMySetlists` est lent, l'onglet affiche « aucune » à tort pendant le fetch. Minutes.
3. 🟨 Toggle « Mes services » : l'état coché n'est signalé que par « ✓ » dans le texte — ajouter `aria-pressed` ([l.242-253](src/app/setlists/page.tsx#L242-L253)). Minutes.
4. 🟨 Double garde d'accès : le layout `RequireAuth` redirige déjà vers `/login`, mais la page réaffiche son propre écran « connecte-toi » (l.140-164) — code mort en pratique. À simplifier.

### `/setlists/[id]` (détail)

1. 🟧 **`<button>` imbriqué dans `<Link>`** ([SetlistDetailClient.tsx:579-586](src/app/setlists/[id]/SetlistDetailClient.tsx#L579-L586)) : HTML invalide (interactif dans interactif), double focus clavier, comportement lecteur d'écran indéfini. Correctif : styler le `Link` directement. Minutes.
2. 🟧 **Barre qui wrappe sous `mt-[54px]` fixe** → T9.
3. 🟧 **« Prévenir l'équipe » désactivé sans explication au tactile** : la raison (« ajoute au moins 4 chants ») n'est fournie qu'en `title` ([l.674-680](src/app/setlists/[id]/SetlistDetailClient.tsx#L674-L680)), invisible sur mobile. Afficher le hint sous la barre ou dans un toast au tap. Minutes. (Le seuil de 4 chants mériterait d'être expliqué quelque part — il surprendra.)
4. 🟧 **Mode Louange avec contenus partiellement chargés** : le bouton ne recharge que si `Object.keys(contents).length === 0` ([l.658-660](src/app/setlists/[id]/SetlistDetailClient.tsx#L658-L660)). Si un seul chant a été chargé (visite interrompue de la vue Partitions, ou échec réseau d'un `fetchSongAST`), on entre en mode Louange avec des chants **absents sans aucun message** (PartitionView/PerformanceMode sautent silencieusement les items sans contenu). Correctif : toujours appeler `loadContents` (elle ne re-télécharge que les manquants) et afficher un bandeau si un chant n'a pas pu être chargé. ~1 h.
5. 🟨 Setlist vide (0 items) : `ListView` rend une liste vide sans message. Cas rare (brouillon), mais un « Aucun chant pour l'instant — Modifier » serait mieux. Minutes.
6. ✅ À souligner : gestion de conflit d'édition concurrente ([persistOverride, l.353-402](src/app/setlists/[id]/SetlistDetailClient.tsx#L353-L402)), retry sur erreur de chargement, partage bloqué pour les setlists privées avec explication — c'est du travail soigné.

### Mode Louange (PerformanceMode)

1. 🟧 Boutons 36 px sur téléphone → T11.
2. 🟨 Le thème scène manipule directement `document.documentElement.classList` ([l.333-344](src/components/performance/PerformanceMode.tsx#L333-L344)) en contournant next-themes : si le thème système change pendant le culte, next-themes peut réécrire la classe sous le mode. Faible probabilité, conséquence = flash de thème. À noter, pas à corriger en urgence.
3. ✅ Wake lock, pédales (flèches/PageUp/Down), tap par tiers d'écran, annotations persistées par page, presets de rôle, capo par chant, safe-areas, « Suivant : … » — le composant est à l'état de l'art pour l'usage visé. Rien de bloquant trouvé à la lecture.

### `/planning/*` (8 pages)

1. 🟥 **FR-only** → T2. 🟧 **Fallback silencieux** → T8. 🟧 **Couleurs dupliquées** → T10.
2. 🟧 **« Mon prénom » à retaper dans chaque table** : [PlanningTable.tsx:35-44](src/components/planning/PlanningTable.tsx#L35-L44) gère son propre `localStorage.planningName` alors que le profil Firestore contient déjà `planningName` — l'app demande à l'utilisateur connecté une information qu'elle possède. Correctif : préremplir depuis `useProfile()` (garder le champ éditable pour les non-connectés/invités). ~1 h.
3. 🟧 **Onglets scrollables sans affordance** : 8 onglets dans un `overflow-x-auto` sans ombre de débordement ni auto-scroll vers l'onglet actif ([PlanningTabs.tsx:45](src/components/planning/PlanningTabs.tsx#L45)) — sur téléphone, « Campus / Intergroupe / Interfranco » sont invisibles et rien n'indique qu'on peut scroller ; arriver sur `/planning/interfranco` laisse l'onglet actif hors-champ. Correctif : `el.scrollIntoView({inline:"center"})` dans l'effet existant + masque dégradé aux bords. ~1 h.
4. 🟨 L'accueil planning lance 10 fetches CSV au montage sans indicateur — combiné à T8. La page `/planning` recharge les mêmes CSV que chaque sous-page visitée ensuite (pas de cache mémoire partagé entre pages). Un petit module de cache (promesse mémoïsée par sheet) réduirait les données mobiles. Heures.

### `/mes-services`

1. ✅ Page bien construite (i18n complète, regroupement par mois, badge « Aujourd'hui », lien setlist avec désambiguïsation campus matin/soir, refus de lier en cas d'ambiguïté). 
2. 🟨 `fdJour`/mois via `MOIS`/`JOURC` français en dur ([l.23-27](src/app/mes-services/page.tsx#L23-L27)) — la page est traduite *sauf* ses dates. Utiliser `Intl.DateTimeFormat(i18n.language)` comme le fait déjà `formatDate` côté setlists. Minutes.

### `/annonces`

1. 🟧 **FR-only + dates `fr-FR`** → T2.
2. 🟨 Le badge « non lu » de la navbar est éteint dès le montage de la page, avant même que les annonces soient chargées et *a fortiori* lues ([annonces/page.tsx:64-66](src/app/annonces/page.tsx#L64-L66) s'exécute avec `annonces=[]`). Effet : ouvrir la page une seconde et repartir marque tout lu. Acceptable, mais si le badge doit signifier quelque chose, ne marquer qu'après le chargement. Minutes.
3. 🟨 Images d'annonces : `<img>` sans `loading="lazy"` ni contrainte de poids ([l.322-331](src/app/annonces/page.tsx#L322-L331)) — combiné à `images.unoptimized` global, une annonce avec photos lourdes plombe la page. Minutes.

### `/login`, `/signup`, `/profil`

1. 🟥 **Pas de « mot de passe oublié »** → T3.
2. 🟨 Message d'erreur unique « identifiants invalides » quel que soit l'échec (compte inexistant, réseau coupé) — [login/page.tsx:42-44](src/app/(auth)/login/page.tsx#L42-L44). Distinguer au moins l'erreur réseau (« vérifie ta connexion »). Minutes.
3. 🟨 Après enregistrement du profil, redirection systématique vers `/setlists` ([profil/page.tsx:93](src/app/(auth)/profil/page.tsx#L93)) même quand on venait de `/mes-services` ou d'un simple passage par « Profil ». Honorer un `?from=`. Minutes.

### `/`, navigation globale

1. 🟧 **Visiteur non connecté : la racine mène au login** — `/` → `/planning` (RequireAuth) → `/login`. Le contenu public le plus précieux (`/songs`, indexé, SSG) n'est jamais proposé au premier contact ; la navbar sait pourtant faire la distinction (le logo pointe vers `/songs` pour les visiteurs, [Navbar.tsx:130](src/components/layout/Navbar.tsx#L130)). Correctif minimal : dans `RequireAuth`, rediriger `/planning` non connecté vers `/songs` plutôt que `/login` quand `from=/planning`, ou faire de `/songs` la cible de `/` pour les non-connectés (petit composant client). ~1 h.
2. 🟨 La MobileTabBar disparaît entièrement pour les visiteurs ([MobileTabBar.tsx:39](src/components/layout/MobileTabBar.tsx#L39)) — un visiteur mobile n'a que le hamburger. Une tab bar réduite (Chants / Connexion) serait plus accueillante. Heures.
3. 🟨 Le menu Louange desktop s'ouvre au survol **et** au clic avec états qui peuvent se désynchroniser (`group-hover` + `dropdownOpen`, [Navbar.tsx:168-213](src/components/layout/Navbar.tsx#L168-L213)) ; le reste du site utilise le DropdownMenu Radix (clavier, aria, focus gérés). Unifier. Minutes.
4. ✅ Bien : badge notifications, retour visuel des scroll-direction bars, backdrop du menu mobile, `safe-area-inset` partout.

### `/guide`, `/admin`, `/notifier`

- `/guide` : ✅ rien à signaler (i18n complète, ancres, sommaire).
- `/admin`, `/notifier` : FR-only assumé ? (0 appel `t()`). Fonctionnellement riches, hors du parcours musicien ; seul point notable : ce sont des pages de 900 et 400 lignes d'un seul tenant — à découper si elles doivent encore grossir. 🟨

---

## 5. Récapitulatif priorisé (impact × effort)

| # | Problème | Impact | Effort |
|---|---|---|---|
| T5 | Crash fiche chant par URL (JSON.parse) | 🟥 | minutes |
| T3 | Pas de reset de mot de passe | 🟥 | < 1 h |
| T4 | Pas d'error.tsx / not-found.tsx | 🟧 | < 1 h |
| T7 | react-pdf dans le bundle fiche chant | 🟧 | minutes |
| T13 | Manifest verrouillé portrait | 🟧 | minutes |
| T12 | `<html lang>` figé | 🟧 | minutes |
| T11 | Cibles tactiles (index A–Z en tête) | 🟧 | minutes/cas |
| Setlist#1 | button dans Link | 🟧 | minutes |
| Setlist#3/4 | « Prévenir » muet au tactile · mode Louange contenus partiels | 🟧 | ~1 h |
| T1 | Offline mort (SW push-only) | 🟥 | heures |
| T2 | Planning/annonces/setlists non traduits | 🟥 | heures |
| T6 | 19 Mo de polices CJK + 33 Mo mortes | 🟧 | heures |
| T8 | Fallback planning silencieusement périmé | 🟧 | heures |
| T9 | Barres fixes à offsets magiques | 🟧 | heures |
| Planning#2/3 | Prénom à retaper · onglets sans affordance | 🟧 | heures |
| Nav#1 | Racine → login pour les visiteurs | 🟧 | ~1 h |
| T10/T14 | Duplication couleurs / nav-state | 🟨 | minutes–heures |
| T15/T16 | Cohérence boutons · skeletons | 🟨 | refonte progressive |
