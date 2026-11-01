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

1. **Fichiers** : déplacer `docs/video-bienvenue/bienvenue.{mp4,jpg}` dans `public/accueil/`.
2. **`Accueil.tsx`, écran 1** : en mode `premiere` et `revoir`, **et** langue `fr`, le `visuel` devient un composant
   `VideoBienvenue` (nouveau, `src/components/onboarding/VideoBienvenue.tsx`) :
   - `<video src="/accueil/bienvenue.mp4" poster="/accueil/bienvenue.jpg" muted playsInline autoPlay preload="metadata">`,
     carré, pleine largeur du corps (`w-full max-w-sm`, ≈ 326 px sur téléphone, 384 px sur tablette et ordinateur),
     `rounded-2xl`, ombre `raised` ;
   - **une lecture** (pas de `loop`), puis l'image finale reste ; un bouton « Revoir » apparaît à la fin (Q1) ;
   - bouton **« Son »** en bas à droite, sur la vidéo (pilule sombre, icône `Volume2` / `VolumeX`), `aria-pressed` ;
     activer le son **ne remet pas** la vidéo au début ;
   - `aria-label` qui décrit la vidéo (« Vidéo de bienvenue : … ») ; la vidéo n'a pas de paroles, pas de sous-titres
     à prévoir ;
   - `prefers-reduced-motion: reduce` ou `navigator.connection.saveData` : **pas de lecture auto**, l'affiche avec un
     bouton lecture ;
   - échec du chargement (hors ligne, erreur) : l'affiche seule, rien de cassé ;
   - quitter l'écran 1 (Suivant, glissé) met la vidéo en **pause** ; y revenir la reprend. Le glissé horizontal de la
     visite continue de marcher sur la vidéo.
3. **Mode `retour`** (comptes du lot 8, « Bonjour … » + « Ce qui a changé ») et **langue 中文** : le logo, comme
   aujourd'hui (Q2).
4. **Libellés** (`fr.json` et `zh-CN.json`, même si la vidéo n'est montrée qu'en français) : `accueil.video.label`,
   `accueil.video.son`, `accueil.video.muet`, `accueil.video.revoir`, `accueil.video.lire`.
5. **Service worker** (`public/sw.js`) : aujourd'hui tout ce qui n'est pas listé passe par la dernière branche,
   `event.respondWith(fetch(request).catch(…))`. Une vidéo se lit par requêtes **Range** (réponses 206), que Safari
   iOS gère mal à travers `respondWith`. Ajouter avant cette branche : `if (url.pathname.startsWith("/accueil/")) return;`
   (le navigateur charge la vidéo lui-même, pas de cache). Le cache **reste en `gcc-louange-v5`** : les stratégies
   des fichiers en cache ne changent pas. `VERSION_VISITE` **ne change pas** (Q4) : la visite ne se rouvre pas pour les comptes existants ;
   la vidéo se voit par « Moi › Revoir la visite ».
6. **Tests Playwright** (`tests/video-bienvenue.spec.ts`, ajoutée à `SPECS_GRAND_ECRAN`) — compte neuf
   (`accueil: true`) :
   - la vidéo est là, muette, `paused === false` peu après l'ouverture ; « Son » bascule `muted` ;
   - `reducedMotion: "reduce"` : pas de lecture auto, l'affiche et le bouton lecture ;
   - `zh-CN` : le logo, pas de vidéo ; mode `retour` : le logo ;
   - « Suivant » met la vidéo en pause ;
   - captures sur les cinq projets (téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px), regardées
     à l'œil : rien ne déborde, « Suivant » reste visible sans défiler sur téléphone (plein écran, 844 px de haut).

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
