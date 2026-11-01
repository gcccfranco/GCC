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
| VB3 | **Musique, démarrage muet** : lecture auto muette, bouton « Son » ; tout se comprend sans le son. |

## La vidéo (faite)

- Méthode /brag (`/brag-slim`) : captures du **vrai site** (serveur local, session simulée, profil fictif « Nina
  Dubreuil », présidence « Océane R. »), composées image par image ; aucune donnée Firestore réelle, aucun planning
  (vrais noms). Sources et recette : `scripts/video-bienvenue/README.md` ; storyboard : `scripts/video-bienvenue/plan.md`.
- 21 s, carré, 30 i/s. Rendu web : `docs/video-bienvenue/bienvenue.mp4` (720×720, H.264 + AAC, 1,1 Mo, faststart) ;
  affiche `bienvenue.jpg` (36 Ko), qui est aussi l'image 0 de la vidéo (logo + « Bienvenue dans GCC »).
- Musique originale (numpy) : ré majeur, D A Bm G, 96 bpm ; chaque coupe tombe sur un temps.
- Scènes : Bienvenue dans GCC · Tous les chants, en français et en 中文 · Dans ta tonalité, en un geste (toucher sur
  « + », G → Ab) · Les partitions 简谱, transposées sur le scan · Les chants du culte, dans l'ordre · Et le dimanche,
  le Mode Louange · C'est parti. (avec la vraie barre d'onglets).
- Légendes à 66–120 px dans le cadre de 1080 : lisibles (≥ 20 px) dans les 326 px de l'écran du téléphone.

## Ce qui est à construire (lot VB, sur go)

1. **Fichiers** : déplacer (`git mv`) `docs/video-bienvenue/bienvenue.{mp4,jpg}` dans `public/accueil/` — 1,1 Mo
   de plus dans le dépôt et le déploiement, accepté ; `docs/video-bienvenue/` disparaît.
2. **`Accueil.tsx`, écran 1** : en mode `premiere` et `revoir`, **et** langue `fr`, le `visuel` devient un composant
   `VideoBienvenue` (nouveau, `src/components/onboarding/VideoBienvenue.tsx`) :
   - `<video src="/accueil/bienvenue.mp4" poster="/accueil/bienvenue.jpg" muted playsInline autoPlay preload="metadata">`,
     carré **`aspect-square w-full max-w-sm`** (sans `aspect-square`, le cadre s'effondre avant les métadonnées et
     l'affiche fait sauter la mise en page) : largeur de la fenêtre − 64 px (`px-8`), soit ≈ 326 px sur un iPhone de
     390 px, 348 px sur le Pixel 7 du projet `telephone`, 384 px dans la fenêtre `md:max-w-md` ; `rounded-2xl`,
     ombre `raised` ;
   - **muet posé en JavaScript** : React ne rend pas l'attribut `muted` dans le HTML, et iOS refuse alors la lecture
     auto. `ref.current.muted = true` avant `ref.current.play()` ;
   - **lecture auto refusée** (mode économie d'énergie d'iOS…) : `play().catch(…)` affiche l'affiche et un bouton
     lecture, comme le mouvement réduit ;
   - **une lecture** (pas de `loop`), puis l'image finale reste ; un bouton « Revoir » apparaît à la fin (Q1) ;
   - bouton **« Son »** en bas à droite, sur la vidéo (pilule sombre, icône `Volume2` / `VolumeX`), `aria-pressed` ;
     activer le son **ne remet pas** la vidéo au début ;
   - `aria-label` qui décrit la vidéo (« Vidéo de bienvenue : … ») ; la vidéo n'a pas de paroles, pas de sous-titres
     à prévoir ;
   - `prefers-reduced-motion: reduce` ou `navigator.connection.saveData` : **pas de lecture auto**, l'affiche avec un
     bouton lecture ;
   - échec du chargement de la vidéo (hors ligne, erreur) : l'affiche seule, rien de cassé (l'affiche est gardée
     par le service worker, point 5) ;
   - **changer d'écran démonte la vidéo** : `Accueil.tsx` pose `key={etape}` sur le corps, donc « Suivant » ou un
     glissé retire le `<video>` (la lecture s'arrête) et « Retour » en remonte un neuf, qui **repart du début, muet**.
     C'est voulu (aucun code de pause/reprise, pas d'état à garder dans `Ecrans`). Le glissé est sur la fenêtre et
     marche sur la vidéo (pas de contrôles natifs) ; un toucher sur « Son » ou « Revoir » (dx ≈ 0) ne change pas
     d'écran.
3. **Mode `retour`** (comptes du lot 8, « Bonjour … » + « Ce qui a changé ») et **langue 中文** : le logo, comme
   aujourd'hui (Q2).
4. **Libellés** (`fr.json` et `zh-CN.json`, même si la vidéo n'est montrée qu'en français) : `accueil.video.label`,
   `accueil.video.son`, `accueil.video.muet`, `accueil.video.revoir`, `accueil.video.lire`.
5. **Service worker** (`public/sw.js`) : aujourd'hui tout ce qui n'est pas listé passe par la dernière branche,
   `event.respondWith(fetch(request).catch(…))`. Une vidéo se lit par requêtes **Range** (réponses 206), que Safari
   iOS gère mal à travers `respondWith`. Deux lignes :
   - avant la dernière branche : `if (url.pathname === "/accueil/bienvenue.mp4") return;` (le navigateur charge la
     vidéo lui-même, rien en cache) ;
   - `url.pathname === "/accueil/bienvenue.jpg"` ajouté à la liste **stale-while-revalidate** (à côté de
     `/logo.png`) : hors ligne, l'affiche reste là, comme le logo aujourd'hui.
   Le cache **reste en `gcc-louange-v5`** : les stratégies
   des fichiers en cache ne changent pas. `VERSION_VISITE` **ne change pas** (Q4) : la visite ne se rouvre pas pour les comptes existants ;
   la vidéo se voit par « Moi › Revoir la visite ».
6. **Tests Playwright** (`tests/video-bienvenue.spec.ts` ; `/video-bienvenue\.spec\.ts/` ajouté aux regex de
   `SPECS_GRAND_ECRAN`, `playwright.config.ts`) — compte neuf (`accueil: true`) :
   - la vidéo est là, `muted === true`, `paused === false` et `currentTime > 0` peu après l'ouverture (le Chromium
     de la session lit le H.264 : `canPlayType('video/mp4; codecs="avc1.640020, mp4a.40.2"')` = `probably`, vérifié
     le 01/11/2026 ; si une machine répond `""`, le test le dit et vérifie seulement les attributs) ; « Son »
     bascule `muted` sans remettre `currentTime` à 0 ;
   - `reducedMotion: "reduce"` : pas de lecture auto, l'affiche et le bouton lecture ; `play()` refusé (simulé par
     un `addInitScript` qui fait rejeter `HTMLMediaElement.prototype.play`) : même résultat ;
   - `zh-CN` (posé par `localStorage "i18nextLng" = "zh-CN"`, comme `tests/nouveaux-membres.spec.ts`) : le logo,
     pas de vidéo ; mode `retour` (`accueilLot8: true`, serveur à interrupteur ouvert) : le logo ;
   - « Suivant » : plus aucun `<video>` dans le DOM ; « Retour » : un neuf, muet, qui repart de ~0 ;
   - captures sur les cinq projets (téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px) **et à
     375 × 667** (iPhone SE), regardées à l'œil : rien ne déborde ; à 667 px le corps défile (titre sous la vidéo),
     « Suivant » reste visible (pied hors de la zone qui défile, par construction) ;
   - **relancer les specs voisines** qui ouvrent la visite : `tests/nouveaux-membres.spec.ts`,
     `tests/visite-par-role.spec.ts`, `tests/back-office-coupe.spec.ts` ; une attente du logo sur l'écran 1 d'un
     compte neuf en français se corrige (vidéo), pas en chinois ni en `retour`.

## À trancher (planche)

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
