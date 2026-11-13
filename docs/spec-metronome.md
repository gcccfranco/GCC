# Spec — Métronome du mode louange (lot MT)

État : **cadrage, sans code** (session de planche du 13/11/2026). Rien ne se code avant le go de Timothée.
Planche : `docs/planches/planche-metronome.html` (artefact privé : https://claude.ai/artifact/G1e9txeUQrtE8XW5i5yC83).

## Demande (Timothée, 13/11/2026, ses mots)

> « il faudrait aussi un métronome avec du son et un métronome plus visuel qu'un simple trait qui bouge, il faudrait
> pouvoir choisir si c'est binaire ternaire, les temps fort et tout, en gros tout comme une vrai application de
> métronome dans le mode louange quoi »

Décisions déjà prises par lui (13/11) : « chacun un métronome, pas de son pendant le culte, un son quand ils veulent
s'entrainer ».
- **Un métronome par appareil**, réglé par chacun : rien de partagé, rien d'imposé par le responsable, rien dans
  Firestore.
- **Silencieux par défaut** : le visuel seul ; le son s'allume à la demande, pour répéter.

## Constat (prouvé, 13/11/2026)

- Le « Métronome visuel » actuel (lot L4, `docs/spec-mode-louange-forscore.md`) est un **liseré de 3 px**
  (`src/components/performance/LiseretTempo.tsx:6-21`) qui se remplit de gauche à droite en un battement
  (`--battement = 60/tempo s`), en CSS pur (`src/app/globals.css:906-917`, `@keyframes liseret-battement`, sans
  JavaScript de timing). Il s'affiche sous la barre du haut, ou sous la zone de sécurité quand la barre est masquée
  (`PerformanceMode.tsx:2465`). « Réduire les animations » : bande pleine à 35 % d'opacité (`globals.css:913-916`).
  Il ignore la mesure : pas de temps fort, pas de 3/4, pas de 6/8.
- Réglage : bouton rond « Métronome visuel » / « 视觉节拍器 » (`src/locales/fr.json:783`, `zh-CN.json:778`), dans la
  feuille Tempo et les Options (`ContenusMenus.tsx:436-440`) et dans le panneau de réglages
  (`PerformanceMode.tsx:2813-2814`). Stockage local : `perf-metronome` (`"1"`/`"0"`, inactif par défaut) et
  `perf-tempo-<id>` pour le tempo réglé par chant (`src/lib/performance/tempo.ts:9-48`, bornes 30 à 240, départ 72).
- Tempo : `{tempo}` est lu par `parser.ts:371-372` ; `useTempoChant.ts:9-13` préfère le réglage de l'appareil au
  fichier. La pastille « ♩ 76 » (`BarreHaut.tsx:108-113`, `data-tempo-barre`) ouvre la feuille Tempo, et n'existe que
  si le chant a un tempo.
- Mesure : `{time}` est lu (`parser.ts:377-378`) mais **personne ne s'en sert**. Sur 384 chants : 233 ont un
  `{tempo}` (57 à 172), 190 un `{time}` (187 en 4/4, 2 en 6/8, 1 en 12/8).
- Son : `src/lib/audio/synthese.ts` (147 lignes) ne sert qu'à l'écoute d'harmonie (`BoutonEcouter.tsx`). Il a un
  `AudioContext` de module créé au premier geste (`jouer`, l. 76-82, `resume()` dans le geste pour iOS) et un piano
  échantillonné. Rien pour un clic ni pour un ordonnancement régulier.
- Tests existants : `tests/mode-louange-forscore.spec.ts` (L4), `tests/louange-menus.spec.ts:294-320` et `:655-675`,
  `tests/usage-dimanche.spec.ts:218-223` (compteur `cmd.louange.metronome`).

## Ce que fait le métronome

### Réglages

| Réglage | Valeurs | Départ | Retenu |
|---|---|---|---|
| Marche / arrêt du métronome | — | arrêt | par appareil (comme `perf-metronome` aujourd'hui) |
| Tempo | 30 à 240, − / + par 1 (appui long : par 5), saisie au clavier numérique, « tap tempo » | `{tempo}` du chant, sinon 72 | par chant et par appareil (`perf-tempo-<id>`, existant) |
| Mesure | 2/4, 3/4, 4/4, 6/8, 9/8, 12/8, et « autre » (2 à 12 temps, unité noire ou croche) | `{time}` du chant, sinon 4/4 | par chant et par appareil |
| Temps forts | un réglage par temps : fort, normal, muet (toucher un temps fait tourner les trois) | 1er temps fort | par chant et par appareil (ils dépendent de la mesure) |
| Binaire / ternaire | groupe du panneau à ce nom : Binaire (croches), Ternaire (triolets), Doubles croches ; il règle le ressenti et les coches de subdivision (un 4/4 ternaire est le « shuffle » des louanges) | Binaire ; Ternaire d'office en 6/8, 9/8, 12/8 | par chant et par appareil |
| Taille de l'indicateur | grande, discrète | **grande** (Q3) | par appareil |
| Décompte | aucun, 1 mesure, 2 mesures (le visuel compte « 1 2 3 4 » en grand, puis le métronome continue) | aucun | par appareil |
| Son | coupé / allumé | **coupé** | **jamais retenu** : coupé à chaque ouverture (voir Q1) |
| Volume | 0 à 100 % | 70 % | par appareil |
| Sonorité | une seule au départ : clic synthétisé (temps fort plus aigu, subdivision plus douce et seulement si le son est allumé) | — | — |

Tout reste dans `localStorage`, sous des clés `perf-metro-*` ajoutées à `src/lib/performance/tempo.ts` (même style
try/catch). **Aucun effet sur Firestore, sur les setlists ni sur les permissions** : `access.ts` et `firestore.rules`
ne changent pas.

Unité du tempo en mesure composée (6/8, 12/8) : le tempo compte la **pulsation** (noire pointée), et la pastille
affiche « ♩. 60 » (Q2). Un 6/8 a donc deux traits, un 12/8 quatre, avec **deux** coches entre deux traits (la noire
pointée vaut trois croches, dont celle du trait ; la planche en dessinait trois, corrigé ici).

### Précision du battement

- Le son est réglé sur l'**horloge de Web Audio** (`AudioContext.currentTime`) avec un ordonnancement en avance : un
  minuteur réveille l'ordonnanceur toutes les 25 ms et programme les clics des 100 ms suivantes
  (`OscillatorNode` + enveloppe de gain, `start(t)` à l'instant exact). Jamais un `setInterval` qui joue le son
  lui-même : il dérive de plusieurs millisecondes et saute quand la page est chargée.
- Le visuel suit la **même horloge** : chaque image (`requestAnimationFrame`) lit l'instant courant et en déduit le
  temps et la fraction de temps en cours. Son coupé, l'horloge est `performance.now()` (aucun `AudioContext` n'est
  créé : rien à débloquer, aucune batterie dépensée). Quand le son s'allume en cours de route, le temps en cours est
  conservé : on bascule d'horloge sans saut.
- Changer le tempo pendant que ça joue prend effet au temps suivant ; changer la mesure, à la mesure suivante.
- Critère : sur 60 s à 120, l'écart entre l'instant programmé de chaque clic et l'instant théorique reste sous 2 ms
  (mesuré dans un test sur les instants passés à `start()`).

### Son

- Un `AudioContext` **partagé avec `synthese.ts`** (on en sort la création dans une petite fonction commune, pour ne
  pas en avoir deux : iOS en limite le nombre). Il est créé et repris (`resume()`) dans le geste qui allume le son :
  c'est le déblocage iOS.
- Clic synthétisé, sans fichier : il marche hors-ligne sans rien ajouter au cache du service worker (`sw.js` ne
  change pas).
- iOS : l'interrupteur « silencieux » du téléphone coupe Web Audio. Le panneau le dit en une ligne sous le bouton son,
  sur iPhone et iPad seulement : « Rien n'est entendu ? Vérifiez le bouton silencieux de l'appareil. »
- **Le son se coupe tout seul** (proposition du pilote, Q1) quand on change de chant, quand on quitte le mode louange,
  quand la page passe à l'arrière-plan ou quand l'écran se verrouille (`visibilitychange`). Il ne se rallume pas
  seul au retour : le visuel, lui, reprend.

### Arrière-plan, verrouillage, hors-ligne

- Page cachée : l'ordonnanceur s'arrête, le son se coupe (ci-dessus), rien ne tourne. Au retour, le visuel repart
  calé sur l'horloge (pas de rattrapage de temps manqués).
- Hors-ligne : tout est local (réglages, clic synthétisé) ; rien ne dépend du réseau.
- Le mode louange garde déjà l'écran allumé ; le métronome n'y ajoute rien.

### Accessibilité et langues

- « Réduire les animations » : aucun mouvement, le temps en cours change d'état d'un coup (couleur pleine / vide),
  sans glissement ni pulsation (voir la planche, état réduit).
- Zones de toucher de 44 px au moins ; les temps du réglage des temps forts sont des boutons avec `aria-pressed` et
  un nom (« Temps 1, fort »).
- L'indicateur est `aria-hidden` (il bat quatre fois par seconde : un lecteur d'écran ne doit pas le lire) ; le
  panneau annonce l'état (« Métronome en marche, 76, 4/4 »).
- Tous les libellés en fr et en zh (`fr.json`, `zh-CN.json`, skill `i18n-sync`).

## Où il se range dans le mode louange

`docs/spec-reglages-unifies.md` n'existe pas encore (planche en cours dans une autre session). Hypothèse de cette
spec : les réglages du mode louange se rangent dans **un seul panneau** au même endroit sur les trois écrans, fait de
sections. Le métronome y est **une section, « Métronome »**, et la pastille ♩ de la barre ouvre ce panneau
directement sur elle. En attendant cette spec, la section prend la place de l'actuelle feuille Tempo
(`ContenusMenus.tsx:436-440`) : même déclencheur, même endroit. Si la spec des réglages unifiés range autrement, la
section se déplace sans changer de contenu.

À l'arrêt, la pastille ♩ montre ▶ et la mesure reste dessinée, pâle : un toucher sur la mesure la lance sans ouvrir
le panneau (le seul accès rapide au téléphone, où la pastille n'a pas de place, Q4).

## Indicateur visuel et panneau (planche)

Planche : `docs/planches/planche-metronome.html` (artefact privé :
https://claude.ai/artifact/G1e9txeUQrtE8XW5i5yC83). Trois pistes : **A · La mesure** (recommandée), B · Le cadre (le
bord de l'écran s'éclaire à chaque temps), C · La battue (la figure du chef de chœur parcourue par un point). B se
voit de la salle, ce qui est le contraire de « discret pendant le culte » ; C demande un mouvement continu qui tire
l'œil hors de la partition et coûte nettement plus. La critique a demandé une reprise, faite une fois (§ « Reprise
après la critique » de la planche).

### Piste A, telle que reprise

- **L'indicateur** est une mesure dessinée sous la barre du haut : un trait par temps, le temps fort plus épais. Le
  temps en cours passe à 100 % de l'encre net sur le battement, puis redescend vers 75 % sur 60 % de la pulsation ;
  au repos les traits sont à 50 % (3,3:1 sur blanc, seuil de 3:1 tenu en clair et en sombre). Temps muet : un
  contour. Aucune teinte : l'encre seule (`--foreground`), ni orange (réservé à « Refrain », `--sec-chorus`) ni rouge
  (简谱 et logo).
- **Taille grande** (par défaut) : quatre traits sur toute la largeur de la colonne lue, 8 px (temps fort 12 px),
  écart 8 px, dans une bande de 28 px sous la barre (`top` = `barres.haut`, ou `var(--sat)` barre masquée), plafonnée
  à 320 px de large à partir de la tablette paysage et centrée sur la page plafonnée à 1 440 px, pas sur la fenêtre.
  **La page descend de la hauteur de la bande** : ni la partition ni le scan 简谱 ne sont couverts. **Taille discrète**
  : traits de 26 × 3 px (fort 26 × 6), bande de 18 px.
- **Subdivisions** : des coches fines entre les traits, qui ne s'allument pas. Au 12/8, quatre traits avec deux coches
  chacun, jamais douze traits.
- **À l'arrêt** : la mesure reste dessinée, pâle (22 à 30 %) ; la pastille ♩ montre ▶ ; un toucher lance.
- **Décompte** : la rangée affiche 1 2 3 4 au-dessus des traits, puis le métronome continue sans s'arrêter.
- **Mouvement réduit** : la mesure bat toujours (sinon elle ne sert plus), mais chaque trait change d'état d'un coup,
  sans fondu ni grossissement ; seule l'opacité change, rien ne se déplace.
- **Le panneau** (section « Métronome ») reprend les mêmes traits : ce qu'on règle est ce qu'on voit. Dans l'ordre :
  « ♩ = 72 » en grand avec − / + (44 px) et la mention « ce chant » ; Marche / Arrêt et Taper ; Mesure (2/4, 3/4,
  4/4, 6/8, 12/8, autre) ; Temps forts (les traits en grand, 44 px, un toucher fait tourner fort → normal → muet) ;
  Binaire / ternaire ; Décompte (aucun, 1 mesure, 2 mesures) ; Taille ; puis, séparé par un filet, le bloc **Son**
  (interrupteur ; le volume n'apparaît que son allumé ; « Le son se coupe quand vous changez de chant »).
  **Une seule couleur d'accent** (`--couleur-icones`, décision 23 du lot AO) : Marche / Arrêt et le Son. Les choix
  (mesure, binaire / ternaire, décompte) sont marqués à l'encre.
- **Formats** : téléphone, feuille (vaul) ; tablette portrait, popover de 360 px sous la pastille ♩ ; tablette
  paysage et ordinateur, popover de 380 px, Temps forts et Binaire / ternaire côte à côte ; sur ordinateur, avec un
  clavier, Espace lance ou arrête et T sert à taper.
- **Chiffres** : « ♩ = 72 » comme sur une partition, ♩ en Noto Music (déjà chargée), chiffres en Source Serif 4
  réduite aux chiffres et au signe = (quelques Ko, seule seconde famille du mode louange). Libellés zh : 节拍器, 速度,
  拍号, 强拍, 二分 / 三分, 预备拍, 声音, 音量, 轻点测速, 开始 / 停止, 本曲 ; relancer `python3 scripts/build-fonts.py`.

Non vu par la planche (à regarder en tranche, sur le vrai site) : la marge haute réelle des scans 简谱 sous la bande ;
la rangée de points des pages (`CurseurPage`, en bas) à côté des traits ; le son sur iPhone avec l'interrupteur
silencieux (`navigator.audioSession`, à essayer). Finitions de la planche non reprises (pistes B et C : vignette
12/8 de C, légende qui touche un chiffre) : sans effet sur le choix.

## Questions à Timothée (la recommandation en premier)

1. **Le son se coupe-t-il quand on change de chant**, même en répétant toute une setlist ? **Recommandation : oui**
   (proposition du pilote), avec un avis bref « Son coupé » et un toucher pour le rallumer ; il se coupe aussi en
   quittant le mode louange et au verrouillage. C'est la garantie qu'aucun clic ne part pendant le culte.
2. **6/8 et 12/8 : le tempo compte-t-il la noire pointée ?** **Recommandation : oui** (« ♩. = 60 », deux traits en 6/8,
   quatre en 12/8). Seuls trois chants sont concernés ; leur `{tempo}` est relu en MT-1 et corrigé si c'était la
   croche.
3. **Taille de l'indicateur par défaut.** **Recommandation : grande** (toute la largeur de la colonne, traits de
   8 à 12 px) : c'est elle qui répond à « plus visuel qu'un simple trait » ; « discrète » reste au choix de chacun.
4. **Téléphone : où s'ouvre le métronome ?** La pastille ♩ n'a pas de place dans la barre à 390 px.
   **Recommandation** : section « Métronome » des réglages (Options aujourd'hui, réglages unifiés demain) et un
   raccourci dans Outils ; à l'arrêt, un toucher sur la mesure elle-même la lance.
5. **Chant sans tempo (151 sur 384).** **Recommandation** : aucun indicateur ; la pastille montre « ♩ — » et ouvre
   le panneau sur Taper ; le tempo trouvé s'enregistre sur l'appareil pour ce chant.

## Tranches

Chaque tranche : `/tranche`, specs Playwright sur les trois appareils (ordinateur, téléphone, tablette) ; celles qui
touchent l'agencement s'ajoutent à `SPECS_GRAND_ECRAN` (cinq projets). Tests sur un chant FR et un chant ZH avec
`{tempo}` et un chant en 6/8. Le son se vérifie en remplaçant `AudioContext` par un faux dans la page
(`addInitScript`) qui enregistre les `start(t)` : aucune écoute réelle dans les tests.

### MT-1 — L'indicateur « mesure », sans son (M)

- `src/lib/performance/metronome.ts` (nouveau) : position dans la mesure à partir d'une horloge (`performance.now()`
  ici, Web Audio en MT-3), tempo, mesure, temps forts, binaire / ternaire ; changement de tempo au temps suivant, de
  mesure à la mesure suivante. `{time}` porté du parseur jusqu'au mode louange (vérifier `songs-index.json` et
  `blocks.ts`). Relire le `{tempo}` des trois chants en 6/8 et 12/8 (Q2).
- `LiseretTempo.tsx` remplacé par l'indicateur (grande / discrète, arrêt, muet, coches, mouvement réduit) ;
  `globals.css:906-917` remplacé ; la page descend de la hauteur de la bande. Pastille ♩ avec ▶ à l'arrêt.
- Critères : à 120 et en 4/4, le temps allumé avance d'un trait toutes les 500 ms (horloge de Playwright,
  `page.clock`) ; 3/4 → trois traits, 6/8 → deux traits et deux coches, 12/8 → quatre ; temps muet en contour ;
  `prefers-reduced-motion` → aucune transition CSS sur les traits, le temps avance toujours ; aucun
  chevauchement entre la bande et le premier élément de la page (partition texte et scan 简谱), aux cinq projets.
- Specs : `tests/metronome-indicateur.spec.ts` (nouvelle, dans `SPECS_GRAND_ECRAN`) ; mise à jour des tests L4 de
  `tests/mode-louange-forscore.spec.ts`. Un chant FR, un ZH, un 6/8.

### MT-2 — Le panneau « Métronome » (M)

- La feuille Tempo (`ContenusMenus.tsx:420-445`) devient la section « Métronome » (contenu ci-dessus, sans le bloc
  Son, qui vient en MT-3) ; accès depuis la pastille ♩, les Options et Outils au téléphone. Saisie au pavé
  numérique, − / + (appui long : par 5), Taper (moyenne des quatre derniers appuis, remise à zéro après 2 s, compté à
  l'appui). Réglages `perf-metro-*` dans `tempo.ts`. Libellés fr / zh (`i18n-sync`), `build-fonts.py`, police des
  chiffres.
- Critères : chaque réglage change l'indicateur et survit à un rechargement, au bon niveau (chant ou appareil) ; un
  autre chant garde ses propres réglages ; Taper à 500 ms d'écart donne 120 ; toutes les cibles font 44 px au moins ;
  aucun texte coupé en zh à 390 px ; `aria-pressed` sur les temps.
- Specs : `tests/metronome-panneau.spec.ts` (nouvelle, dans `SPECS_GRAND_ECRAN`) ; voisines
  `tests/louange-menus.spec.ts`, `tests/usage-dimanche.spec.ts` (compteur `cmd.louange.metronome`).

### MT-3 — Le son (M)

- Création de l'`AudioContext` sortie de `synthese.ts` dans une fonction commune (un seul contexte) ; ordonnanceur
  en avance (réveil 25 ms, horizon 100 ms), clic par oscillateur (fort, normal, subdivision), volume ; bascule
  d'horloge sans saut quand le son s'allume en marche. Bloc Son du panneau, son coupé à chaque ouverture, coupure
  au changement de chant, à la sortie du mode louange et sur `visibilitychange` ; avis « Son coupé » ; ligne sur
  l'interrupteur silencieux (iPhone, iPad).
- Critères (faux `AudioContext` injecté par `addInitScript`, qui enregistre chaque `start(t)` et sa fréquence) : son
  coupé, aucun contexte créé ; son allumé à 120 en 4/4 pendant 10 s, 20 clics, écart à l'instant théorique sous
  2 ms, temps fort plus aigu, temps muet sans clic ; Ternaire → trois clics par temps ; changer de chant, cacher la
  page ou quitter le mode louange → plus aucun `start` ; à la réouverture, son coupé. L'écoute d'harmonie marche
  toujours.
- Specs : `tests/metronome-son.spec.ts` (nouvelle) ; voisine `tests/harmonie-ecoute.spec.ts`.

### MT-4 — Décompte et clavier (S, peut partager la session de MT-3)

- Décompte d'une ou deux mesures (1 2 3 4 au-dessus des traits, clics si le son est allumé, puis la suite sans
  arrêt) ; Espace et T sur ordinateur (pas quand un champ a le focus), affichés seulement avec un clavier.
- Critères : décompte d'une mesure à 120 en 4/4 → chiffres 1 à 4 pendant 2 s, puis les traits ; Espace lance et
  arrête ; T règle le tempo ; rien ne se déclenche dans un champ de saisie.
- Specs : `tests/metronome-panneau.spec.ts` (complétée). Fin de lot : les quatre specs du lot et les voisines,
  trois appareils (cinq projets pour les specs d'agencement).

## Avancement

- 13/11/2026 : constat, planche (une reprise après critique) et spec, par la session de cadrage, sans code. Attend
  les réponses aux questions 1 à 5 et le go de Timothée pour le lot MT (quatre tranches).
