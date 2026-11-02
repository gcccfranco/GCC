# Spec — Vidéo de bienvenue à la première connexion

> Demande de Timothée du 01/11/2026 : « https://github.com/latent-spaces/brag utilise ce repo pour me faire une vidéo
> quand les gens se connectent pour la première fois sur le site. »

Planche (01/11/2026) : https://claude.ai/artifact/C9JexoTnCrVbEnvUHXbkHL — la vidéo, l'écran Bienvenue aux trois
tailles, le comportement, quatre questions à trancher.

## Décisions déjà prises (01/11/2026, réponses de Timothée)

| # | Décision |
| --- | --- |
| VB1 | **Français seulement** : une seule vidéo, en français. |
| VB2 | **Dans l'écran Bienvenue** de la visite (`src/components/onboarding/Accueil.tsx`, écran 1) : la vidéo **remplace le logo**. Pas d'écran de plus. |
| VB3 | ~~Musique, démarrage muet~~ → **sans son** (Timothée, 01/11/2026, « retire le son ») : les vidéos n'ont plus de piste audio, pas de bouton « Son ». |
| VB4 | **Une vidéo par disposition** (Timothée, 01/11/2026, « une vidéo pour chaque responsive ») : téléphone, tablette portrait, tablette paysage, ordinateur. Mêmes scènes, même montage, même format carré ; les captures montrent le site **tel qu'il est sur cet appareil** (barre du bas, barre latérale réduite ou dépliée, deux volets). Chacun voit la sienne. |

## La vidéo (faite)

- Méthode /brag (`/brag-slim`) : captures du **vrai site** (serveur local, session simulée, profil fictif « Nina
  Dubreuil », présidence « Océane R. »), composées image par image ; aucune donnée Firestore réelle, aucun planning
  (vrais noms). Sources et recette : `scripts/video-bienvenue/README.md` ; storyboard : `scripts/video-bienvenue/plan.md`.
- 21 s, carré, 30 i/s, quatre rendus web (720×720, H.264 sans son, ≈ 1 Mo chacun, faststart) :
  `docs/video-bienvenue/bienvenue-{telephone,tablette,tablette-paysage,ordinateur}.mp4` ; une affiche commune
  `bienvenue.jpg`, qui est aussi l'image 0 de chaque vidéo (logo + « Bienvenue dans GCC », identique partout).
  `scripts/video-bienvenue/tout.sh` refait les quatre.
- Sans son (VB3). Le montage garde la grille d'une musique à 96 bpm (coupes toutes les 2,5 s) ; `music.py` reste dans
  les sources si le son revient un jour.
- Scènes : Bienvenue dans GCC · Tous les chants, en français et en 中文 · Dans ta tonalité, en un geste (toucher sur
  « + », G → Ab) · Les partitions 简谱, transposées sur le scan · Les chants du culte, dans l'ordre · Et le dimanche,
  le Mode Louange · C'est parti. (avec la vraie barre d'onglets).
- Légendes à 66–120 px dans le cadre de 1080 : lisibles (≥ 20 px) dans les 326 px de l'écran du téléphone.

## Ce qui est à construire (lot VB, sur go)

1. **Fichiers** : déplacer (`git mv`) les quatre `bienvenue-*.mp4` et `bienvenue.jpg` dans `public/accueil/` —
   ≈ 4 Mo de plus dans le dépôt et le déploiement, accepté ; chaque visiteur n'en charge qu'une ;
   `docs/video-bienvenue/` disparaît.
2. **Choix de la vidéo** (au montage du composant, `matchMedia`, mêmes requêtes que `src/lib/deuxVolets.ts` et
   `globals.css`) : `(pointer: fine) and (min-width: 1024px)` → `ordinateur` ; `(pointer: coarse) and (orientation:
   landscape) and (min-width: 1024px)` → `tablette-paysage` ; sinon `(min-width: 768px)` (la visite devient une
   fenêtre) → `tablette` ; sinon `telephone`. Pas de changement en cours de lecture si l'appareil tourne : la
   vidéo choisie reste jusqu'au prochain montage.
3. **`Accueil.tsx`, écran 1** : en mode `premiere` et `revoir`, **et** langue `fr`, le `visuel` devient un composant
   `VideoBienvenue` (nouveau, `src/components/onboarding/VideoBienvenue.tsx`) :
   - `<video src="/accueil/bienvenue-<disposition>.mp4" poster="/accueil/bienvenue.jpg" muted playsInline autoPlay preload="metadata">`,
     carré **`aspect-square w-full max-w-sm`** (sans `aspect-square`, le cadre s'effondre avant les métadonnées et
     l'affiche fait sauter la mise en page) : largeur de la fenêtre − 64 px (`px-8`), soit ≈ 326 px sur un iPhone de
     390 px, 348 px sur le Pixel 7 du projet `telephone`, 384 px dans la fenêtre `md:max-w-md` ; `rounded-2xl`,
     ombre `raised` ;
   - **muet posé en JavaScript** (même sans piste audio) : React ne rend pas l'attribut `muted` dans le HTML, et iOS refuse alors la lecture
     auto. `ref.current.muted = true` avant `ref.current.play()` ;
   - **lecture auto refusée** (mode économie d'énergie d'iOS…) : `play().catch(…)` affiche l'affiche et un bouton
     lecture, comme le mouvement réduit ;
   - **une lecture** (pas de `loop`), puis l'image finale reste ; un bouton « Revoir » apparaît à la fin (Q1) ;
   - `aria-label` qui décrit la vidéo (« Vidéo de bienvenue : … ») ; la vidéo n'a pas de paroles, pas de sous-titres
     à prévoir ;
   - `prefers-reduced-motion: reduce` ou `navigator.connection.saveData` : **pas de lecture auto**, l'affiche avec un
     bouton lecture ;
   - échec du chargement de la vidéo (hors ligne, erreur) : l'affiche seule, rien de cassé (l'affiche est gardée
     par le service worker, point 6) ;
   - **changer d'écran démonte la vidéo** : `Accueil.tsx` pose `key={etape}` sur le corps, donc « Suivant » ou un
     glissé retire le `<video>` (la lecture s'arrête) et « Retour » en remonte un neuf, qui **repart du début, muet**.
     C'est voulu (aucun code de pause/reprise, pas d'état à garder dans `Ecrans`). Le glissé est sur la fenêtre et
     marche sur la vidéo (pas de contrôles natifs) ; un toucher sur « Revoir » (dx ≈ 0) ne change pas
     d'écran.
4. **Mode `retour`** (comptes du lot 8, « Bonjour … » + « Ce qui a changé ») et **langue 中文** : le logo, comme
   aujourd'hui (Q2).
5. **Libellés** (`fr.json` et `zh-CN.json`, même si la vidéo n'est montrée qu'en français) : `accueil.video.label`,
   `accueil.video.revoir`, `accueil.video.lire`.
6. **Service worker** (`public/sw.js`) : aujourd'hui tout ce qui n'est pas listé passe par la dernière branche,
   `event.respondWith(fetch(request).catch(…))`. Une vidéo se lit par requêtes **Range** (réponses 206), que Safari
   iOS gère mal à travers `respondWith`. Deux lignes :
   - avant la dernière branche : `if (url.pathname.startsWith("/accueil/") && url.pathname.endsWith(".mp4")) return;` (le navigateur charge la
     vidéo lui-même, rien en cache) ;
   - `url.pathname === "/accueil/bienvenue.jpg"` ajouté à la liste **stale-while-revalidate** (à côté de
     `/logo.png`) : hors ligne, l'affiche reste là, comme le logo aujourd'hui.
   Le cache **reste en `gcc-louange-v5`** : les stratégies
   des fichiers en cache ne changent pas. `VERSION_VISITE` **ne change pas** (Q4) : la visite ne se rouvre pas pour les comptes existants ;
   la vidéo se voit par « Moi › Revoir la visite ».
7. **Tests Playwright** (`tests/video-bienvenue.spec.ts` ; `/video-bienvenue\.spec\.ts/` ajouté aux regex de
   `SPECS_GRAND_ECRAN`, `playwright.config.ts`) — compte neuf (`accueil: true`) :
   - la vidéo est là, `muted === true`, `paused === false` et `currentTime > 0` peu après l'ouverture (le Chromium
     de la session lit le H.264 : `canPlayType('video/mp4; codecs="avc1.640020, mp4a.40.2"')` = `probably`, vérifié
     le 01/11/2026 ; si une machine répond `""`, le test le dit et vérifie seulement les attributs) ;
   - `reducedMotion: "reduce"` : pas de lecture auto, l'affiche et le bouton lecture ; `play()` refusé (simulé par
     un `addInitScript` qui fait rejeter `HTMLMediaElement.prototype.play`) : même résultat ;
   - `zh-CN` (posé par `localStorage "i18nextLng" = "zh-CN"`, comme `tests/nouveaux-membres.spec.ts`) : le logo,
     pas de vidéo ; mode `retour` (`accueilLot8: true`, serveur à interrupteur ouvert) : le logo ;
   - chaque projet charge **sa** vidéo (`telephone` → `bienvenue-telephone.mp4`, `tablette`, `tablette-paysage`,
     `ordinateur`, `ordinateur-1440` → `bienvenue-ordinateur.mp4`) ;
   - « Suivant » : plus aucun `<video>` dans le DOM ; « Retour » : un neuf, muet, qui repart de ~0 ;
   - captures sur les cinq projets (téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px) **et à
     375 × 667** (iPhone SE), regardées à l'œil : rien ne déborde ; à 667 px le corps défile (titre sous la vidéo),
     « Suivant » reste visible (pied hors de la zone qui défile, par construction) ;
   - **relancer les specs voisines** qui ouvrent la visite : `tests/nouveaux-membres.spec.ts`,
     `tests/visite-par-role.spec.ts`, `tests/back-office-coupe.spec.ts` ; une attente du logo sur l'écran 1 d'un
     compte neuf en français se corrige (vidéo), pas en chinois ni en `retour`.

## Tranché (go du 01/11/2026)

Go de Timothée pour le lot VB le 01/11/2026, avec l'ordre de pousser sur `main` ; les quatre questions de la
planche n'ayant pas reçu de réponse, **les recommandations s'appliquent** (Q1 une lecture puis « Revoir », Q2 le logo
en chinois, Q3 montage tel quel, Q4 rien d'imposé).

### Questions de la planche

| # | Question | Recommandation |
| --- | --- | --- |
| Q1 | Fin de la vidéo : une lecture puis « Revoir », ou en boucle ? | Une lecture, image finale + « Revoir ». |
| Q2 | En chinois : logo, ou la vidéo française quand même ? | Le logo (VB1). |
| Q3 | Montage : tel quel, ou retoucher une scène / un autre ton ? | Tel quel. |
| Q4 | Comptes déjà inscrits : rien d'imposé, ou rouvrir la visite une fois ? | Rien d'imposé (Revoir la visite). |

## Hors périmètre

- Une version 中文 de la vidéo (VB1) ; la refaire plus tard = mêmes sources, légendes traduites.
- Toute autre page que l'écran Bienvenue (le Guide, la page de connexion).
- Rien à publier dans Firebase, aucune règle touchée.

## Lot VB-R — Remontrer la visite à tout le monde (Timothée, 02/11/2026)

« Reset aussi la première connexion pour tout le monde. » Remplace Q4 (« rien d'imposé »).

- Pas d'écriture dans Firestore (aucun accès depuis les sessions) : le reset passe par la version de la visite.
  `VERSION_VISITE` passe de **2 à 3** (`src/lib/firebase/onboarding.ts`). Tout compte dont `onboarding/{uid}` est
  absent ou porte une version < 3 voit la visite **une fois** à sa prochaine ouverture du site ; la fermer écrit 3.
- **Pour tout le monde**, interrupteur du back-office ouvert ou coupé : la condition d'ouverture devient
  `version < VERSION_VISITE` (le `BACK_OFFICE &&` de VR8 tombe).
- **Mode « première » pour tous** (écran 1 avec la vidéo en français, le logo en chinois). Le mode « retour »
  (« Bonjour … », étiquette « Ce qui a changé ») n'a plus de cas : son code, rendu orphelin par ce changement, part ;
  les clés de traduction `accueil.bonjour`, `accueil.change`, `accueil.bienvenue.retour` restent (signalées).
- Tests : `tests/helpers/fakeSession.ts` écrit par défaut `version: VERSION_VISITE` (importée), sinon chaque compte
  simulé verrait la visite ; `accueilLot8` garde son sens (document sans version) et ouvre désormais la visite en mode
  première. À adapter : `tests/visite-par-role.spec.ts` (compte du lot 8), `tests/video-bienvenue.spec.ts` (compte du
  lot 8 : vidéo, plus le logo), `tests/back-office-coupe.spec.ts` (serveur coupé : la visite s'ouvre aussi). Ajouter :
  un compte en version 2 voit la visite, et sa fermeture écrit 3.

## Lot VB-E — Un extrait sur chaque écran de la visite (Timothée, 02/11/2026)

Planche (version 6) : https://claude.ai/artifact/C9JexoTnCrVbEnvUHXbkHL. Remplace l'écran 1 du lot VB (la vidéo de 21 s
faisait doublon avec le titre « Bienvenue dans GCC »). Go de Timothée le 02/11/2026 ; ses mots : « découper la vidéo
en petites sections et les insérer dans chaque partie », « les choristes regardent l'écran devant eux, pas les
partitions », « la page présidence doit être vue par tout le monde tout comme la page des chants : fais un mix des
deux », « il faut une vidéo sur chaque page », « pour les musiciens je veux les deux », « pour la page Bienvenue pas de
clip ». Questions restées sans réponse : recommandations appliquées (E8 à E10).

| # | Décision |
| --- | --- |
| E1 | **Écran 1 (Bienvenue)** : le logo de l'église seul, comme avant le lot VB. Plus de vidéo, plus de `VideoBienvenue` à cet endroit. |
| E2 | **Tous les autres écrans** ont un extrait : 16:9, sans son, sans légende, **en boucle**, une version par disposition (`telephone`, `tablette`, `tablette-paysage`, `ordinateur`, même choix par `matchMedia` qu'au lot VB). |
| E3 | Où trouver quoi → `onglets` (la barre de navigation, un anneau passe sur chaque onglet). Sur téléphone l'écran défile un peu : accepté. |
| E4 | Carte **musicien** → `musicien` (tonalité « + / − » puis Mode Louange, 9,6 s). |
| E5 | Cartes **chanteur (choriste)**, **présidence**, **régie**, **membre** → `melange` (recherche d'un chant, puis la setlist qui se remplit, 8,4 s). |
| E6 | Cartes **équipe** et **référent** → `taches` ; carte **responsabilités** et écran **Notifications** → `planning`. |
| E7 | **C'est parti** → `melange`, vu par tout le monde. |
| E8 | Place : **sous le texte** de l'écran (sous « Voir dans le guide » sur une carte, sous la liste d'Où trouver quoi, sous le bouton d'Notifications, sous « Ouvrir le guide » sur C'est parti) ; le texte ne bouge pas. |
| E9 | C'est parti pour qui a déjà vu `melange` sur une de ses cartes : l'extrait `apercu` à la place (quatre écrans du site en fondu, 8 s), pas deux fois le même. |
| E10 | **En chinois aussi** : les extraits n'ont pas de légende (l'interface filmée reste en français). |

### Ce qui est à construire

1. **Fichiers** : `git mv docs/video-bienvenue/extraits public/accueil/extraits` (24 `.mp4` + 24 `.jpg`, 5,5 Mo :
   `<extrait>-<disposition>.{mp4,jpg}`, extraits `apercu`, `onglets`, `musicien`, `melange`, `taches`, `planning`). Les
   vidéos du lot VB (`public/accueil/bienvenue-*.mp4`, `bienvenue.jpg`) ne servent plus : à supprimer, avec leur
   mention dans `scripts/video-bienvenue/README.md` mise à jour.
2. **Composant** : `VideoBienvenue.tsx` devient `ExtraitVisite.tsx` (`{ extrait }`), mêmes règles qu'au lot VB (muet posé
   en JS avant `play()`, lecture refusée / mouvement réduit / `saveData` → affiche + bouton lecture, erreur → affiche,
   `playsInline`, `preload="metadata"`, `aria-label` par extrait) mais **en boucle** (`loop`, plus de « Revoir ») et cadre
   **`aspect-video w-full max-w-sm rounded-xl`**. L'affiche est `<extrait>-<disposition>.jpg`.
3. **`Accueil.tsx`** : écran 1 = le logo seul (en `premiere` et `revoir`, en français et en chinois) ; chaque autre
   écran reçoit son extrait selon E3–E9, placé à la fin du corps (E8). La carte → extrait suit le `kind` de
   `cartesDeLaVisite` (`service` : `musicien` → `musicien`, `chanteur` / `presidence` / `regie` → `melange` ;
   `equipe` → `taches` ; `responsabilites` → `planning` ; `membre` → `melange`). E9 se calcule dans `Ecrans` à partir
   des cartes affichées.
4. **Libellés** (`fr.json` et `zh-CN.json`) : `accueil.video.extrait.<extrait>` (six descriptions pour `aria-label`) ;
   `accueil.video.revoir` et `accueil.video.label` deviennent orphelins : les retirer.
5. **Service worker** : la règle `/accueil/*.mp4` (réseau, pas de cache) couvre les extraits ; les affiches
   `/accueil/**/*.jpg` passent en stale-while-revalidate (à la place de la seule `bienvenue.jpg`).
6. **Tests** (`tests/video-bienvenue.spec.ts`, renommé `tests/extraits-visite.spec.ts`, reste dans
   `SPECS_GRAND_ECRAN`) : écran 1 = logo, aucune vidéo ; chaque écran suivant porte le bon extrait pour un profil
   musicien, un choriste, une présidence, un référent, un membre ; E9 (C'est parti = `apercu` si `melange` déjà vu) ;
   chinois : extraits présents ; boucle (`loop`), muet, lecture ; mouvement réduit → affiche + bouton ; chaque projet
   charge **sa** disposition ; « Suivant » visible à 375×667. Relancer `visite-par-role`, `nouveaux-membres`,
   `back-office-coupe`. Captures des cinq dispositions + 375×667 sur trois écrans (Où trouver quoi, une carte, C'est
   parti), regardées à l'œil.

### Remontrée à tous (Timothée, 02/11/2026)

« Reset la première connexion de tout le monde » : `VERSION_VISITE` passe de 3 à 4 (`src/lib/firebase/onboarding.ts`,
recopiée dans `tests/helpers/fakeSession.ts`). Même règle qu'au lot VB-R : tout compte dont la version vue est < 4
revoit la visite une fois, en mode première, avec les extraits ; la fermer écrit 4.
