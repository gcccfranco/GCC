# Lot AT — Glissement Liste ↔ Partitions d'une setlist, en un seul mouvement

Session : `session_01UMdfucrLf9MPoP3AvGEFyN` (lancée par la session « Scène : créneaux et occupation des salles »).
Branche : `claude/corrections-design`. Pas de mise en ligne dans ce lot.

## 1. Les mots de Timothée et le go (17/11/2026)

« Les animations sont pas très en raccord et pas très fluides. » Vidéo d'iPhone (4,5 s) : page d'une setlist, il
touche un chant de la Liste et la partition s'ouvre. Proposition qu'il a acceptée (« go ») :
- la liste part à gauche pendant que la partition arrive de la droite, en un seul mouvement, sans vide ;
- la partition est préparée avant le départ, pour que rien n'attende en chemin ;
- le haut de la page bouge avec le reste ;
- pareil au retour, à la bascule « Liste | Partitions » et au glissement du doigt.

## 2. Constat

Vidéo lue image par image (24 i/s) : la liste sort à gauche (≈ 0,17 s) ; ≈ 0,3 s de vide sous l'en-tête (titre,
métadonnées et bascule restent) ; l'en-tête change d'un coup et la partition entre par la droite. ≈ 0,75 s en tout.

Cause (`src/hooks/useSwipeViews.ts`) : `valider` fait sortir la vue **en entier** par un ressort en
`requestAnimationFrame`, puis seulement `aller()` change de vue ; la nouvelle est montée ensuite et l'effet d'entrée
la fait venir du bord. Les deux vues ne sont jamais ensemble à l'écran ; le vide est le montage des Partitions. L'en-tête
de la Liste (`#entete-setlist`, bascule) et la barre d'outils (fixe) ne sont pas dans l'élément qui glisse. Enfin le
ressort tourne sur le fil principal : il saccade dès que le montage ou les scans 简谱 l'occupent.

Mesure (`next dev`, Chromium, profil téléphone, setlist de 4 chants FR et ZH, toucher d'une ligne) : le passage
Liste → Partitions est **une tâche longue de 880 ms** (6,9 s avec le processeur ralenti ×4), puis deux de 148 et
51 ms (scans, mise en place). Le build de production est plusieurs fois plus rapide, mais l'ordre de grandeur
dit l'essentiel : aucun mouvement écrit en JavaScript ne peut tourner pendant ce montage.

## 3. Décisions

- **AT1 — View Transitions** (décision déléguée, session, 17/11). Le changement de vue passe par
  `document.startViewTransition` : le navigateur fige l'image de la page (barre, en-tête, bascule, liste compris),
  React monte la nouvelle vue **pendant que l'image reste affichée** (rien ne bouge, rien n'est vide), puis l'ancienne
  image et la nouvelle page glissent ensemble, côte à côte, sur le compositeur (fluide même si le fil principal est
  occupé). C'est ce que demande la proposition : préparée avant le départ, haut de page compris. Écartée : monter la
  vue d'arrivée hors écran dans le DOM (deux défilements de page à réconcilier, observateurs des Partitions qui
  liraient une vue cachée, barre fixe hors de l'élément).
- **AT2 — Ce qui glisse** : la racine (`::view-transition-old(root)` et `-new(root)`), donc toute la colonne, barre de
  la setlist comprise. Restent en place, nommées le temps du glissement seulement (attribut `data-glisse-vues` sur
  `<html>`) : la barre latérale (`.barre-laterale`), la barre d'onglets du téléphone, la barre du haut (`.barre-haut`)
  si elle est affichée. Les deux images ont la largeur de la fenêtre et restent bord à bord : l'ancienne de 0 à
  ∓ largeur, la nouvelle de ± largeur à 0, sens de Q13 (Liste à gauche, Partitions à droite).
- **AT3 — Durée et courbe** : 350 ms, `cubic-bezier(0.32, 0.72, 0, 1)` (départ franc, arrivée douce, sans
  rebond), au toucher d'un chant, à la bascule (les deux sens) et au bouton « Liste ». Le temps de montage s'ajoute
  avant, image figée (comme une page iOS qu'on pousse). Au doigt (AT5), la fin du geste dure 350 ms × la part qui
  reste, au moins 120 ms.
- **AT4 — Toucher d'un chant de la Liste** : il passe par le même glissement (aujourd'hui `onOpen` appelle
  `versPartitions` sans mouvement). `glisser(sens, aller?)` prend un rappel optionnel.
- **AT5 — Au doigt** (tranche T2) : dès que le geste s'engage vers une vue voisine (seuils Q13 inchangés),
  la transition démarre et la vue change (historique compris, par `versPartitions` / `versListe` comme aujourd'hui) ;
  les deux images suivent alors le doigt (animations en pause, `currentTime` tenu par le doigt). Au lâcher,
  `issueDuGeste` décide : la suite part au bout ; sinon tout revient en place et la vue d'origine est rendue par
  l'inverse (`versListe` après `versPartitions`, et l'inverse), défilement d'origine remis, **pendant** que l'image
  couvre encore l'écran (une animation de maintien garde la transition ouverte jusqu'au bout). Un doigt posé pendant un
  glissement (toucher ou geste) le reprend où il en est. Vers un côté sans voisin : l'élastique d'aujourd'hui.
- **AT6 — Mouvement réduit** : pas de transition, la nouvelle vue apparaît en fondu (150 ms), comme aujourd'hui.
- **AT7 — Sans View Transitions** (iOS avant 18, vieux navigateurs) : la vue change tout de suite et la nouvelle entre
  du bord (l'effet d'entrée actuel, sans la sortie de l'ancienne) ; au doigt, le comportement actuel sans la sortie.
  Plus de vide d'attente dans aucun cas.
- **AT8 — Retour du navigateur** (bouton ou bord de l'écran sur iOS) : inchangé, sans glissement (Safari anime déjà
  son propre retour au bord ; deux mouvements se contrediraient).
- **AT9 — Tests** : la vue est « posée » quand `<html>` n'a plus `data-glisse-vues` et que `[data-vue]` n'a plus de
  `transform` (`vuePosee` des helpers suit les deux). iOS ne se teste pas ici (Chromium seulement) : Timothée vérifie
  sur son iPhone.

## 4. Critères de réussite (en tests avant le code)

1. Aucune image vide : à mi-course, `::view-transition-old(root)` et `-new(root)` sont toutes deux en partie à l'écran
   et bord à bord (transforms lus par `getComputedStyle(html, pseudo)` à chaque `requestAnimationFrame` : écart
   new − old = largeur ± 2 px, old dans ]−largeur, 0[ à au moins une image).
2. L'en-tête ne saute pas : il est dans l'image qui glisse (aucune image où la barre ou `#entete-setlist` change sans
   transition en cours).
3. Glissement de 350 ms ± 1 image, mesuré des animations (`getAnimations()`), au toucher d'un chant, à la bascule
   dans les deux sens.
4. (T2) Au doigt : à mi-geste, les deux images sont à l'écran et suivent le doigt ; au lâcher, pas de vide ; geste
   annulé : vue, adresse et défilement d'origine ; un doigt posé pendant le glissement le reprend.
5. Mouvement réduit : aucune transition, fondu.
6. Rien de perdu : historique et retour du navigateur, chant lu (`?chant=`), retour à la ligne d'origine, focus de la
   bascule au clavier, défilement ; mode louange et deux volets inchangés (aucune transition).
7. Setlist de test avec un chant FR et un chant ZH ; trois appareils (`tests/setlist-g.spec.ts` n'est pas une spec
   d'agencement).

## 5. Tranches

- **T1 — Toucher, bascule, retour** (`useSwipeViews.ts`, `SetlistDetailClient.tsx` lignes de `glisser` et `ListView`
  `onOpen`, `globals.css`, `tests/helpers/setlist.ts`, `tests/setlist-g.spec.ts`). `glisser(sens, aller?)` :
  inactif → `aller()` ; mouvement réduit → fondu ; sans `startViewTransition` → AT7 ; sinon
  `html.dataset.glisseVues = sens`, `startViewTransition(async () => { flushSync(aller); await nouvelle cle (≤ 1 s) })`,
  puis sur `ready` deux `html.animate` (pseudo-éléments old/new, 350 ms, AT3, `fill: "both"`) ; à `finished`,
  attribut retiré. Vue inchangée après 1 s → `skipTransition()`. CSS : sous `[data-glisse-vues]`,
  `::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal }` et les noms
  d'AT2. Le doigt garde son code actuel en T1, sortie retirée (AT7) si besoin pour ne pas mêler deux mouvements.
- **T2 — Au doigt** (`useSwipeViews.ts`, tests du glissement de `setlist-g.spec.ts`) : AT5, une seule mécanique pour
  le toucher et le doigt (toucher = transition lancée puis menée au bout ; doigt = menée par le doigt), interruption.

## 6. Avancement

- 17/11 : spec écrite, mesure faite (§ 2), sonde View Transitions dans Chromium : `requestAnimationFrame` ne tourne
  pas pendant le rappel de mise à jour (rendu suspendu ; la mise en place de la ligne en Liste, faite dans un
  `requestAnimationFrame`, arrive donc à la première image du glissement, quand la Liste est encore hors écran) ;
  les transforms des pseudo-éléments se lisent par `getComputedStyle` ; une animation en pause garde la transition
  ouverte.
