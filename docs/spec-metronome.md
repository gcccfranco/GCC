# Spec — Métronome du mode louange (lot MT)

État : **cadrage, sans code** (session de planche du 13/11/2026). Rien ne se code avant le go de Timothée.
Planche : `docs/planches/planche-metronome.html` (artefact privé, lien dans `docs/feuille-de-route.md`).

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
| Binaire / ternaire | déduit de la mesure (6/8, 9/8, 12/8 = ternaire) ; en binaire, la subdivision « triolets » donne un ternaire sur 4/4 (le « shuffle » des louanges) | selon la mesure | avec la mesure |
| Temps forts | un réglage par temps : fort, normal, muet (toucher un temps fait tourner les trois) | 1er temps fort ; en 6/8 temps 1 et 4 ; en 12/8 temps 1, 4, 7, 10 (1 plus fort) | par chant et par appareil |
| Subdivision | aucune, croches, triolets, doubles croches | aucune | par appareil |
| Décompte | aucun, 1 mesure, 2 mesures (le visuel compte « 1 2 3 4 » en grand, puis le métronome continue) | aucun | par appareil |
| Son | coupé / allumé | **coupé** | **jamais retenu** : coupé à chaque ouverture (voir Q1) |
| Volume | 0 à 100 % | 70 % | par appareil |
| Sonorité | une seule au départ : clic synthétisé (temps fort plus aigu, subdivision plus douce) | — | — |

Tout reste dans `localStorage`, sous des clés `perf-metro-*` ajoutées à `src/lib/performance/tempo.ts` (même style
try/catch). **Aucun effet sur Firestore, sur les setlists ni sur les permissions** : `access.ts` et `firestore.rules`
ne changent pas.

Unité du tempo en mesure composée (6/8, 12/8) : le tempo compte la **pulsation** (noire pointée), et la pastille
affiche « ♩. 60 ». Voir Q2 pour les trois chants concernés.

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

La pastille ♩ de la barre devient aussi un **interrupteur rapide** : un appui long (ou le petit bouton ▶ à côté, selon
la piste) lance ou arrête le métronome sans ouvrir le panneau. Voir la planche.

## Indicateur visuel et panneau (planche)

<!-- complété après la planche -->

## Questions à Timothée (la recommandation en premier)

<!-- complété après la planche -->

## Tranches

Chaque tranche : `/tranche`, specs Playwright sur les trois appareils (ordinateur, téléphone, tablette) ; celles qui
touchent l'agencement s'ajoutent à `SPECS_GRAND_ECRAN` (cinq projets). Tests sur un chant FR et un chant ZH avec
`{tempo}` et un chant en 6/8. Le son se vérifie en remplaçant `AudioContext` par un faux dans la page
(`addInitScript`) qui enregistre les `start(t)` : aucune écoute réelle dans les tests.

<!-- découpage complété après la planche -->

## Avancement

- 13/11/2026 : constat, planche et spec (session de cadrage, sans code). Attend le go de Timothée.
