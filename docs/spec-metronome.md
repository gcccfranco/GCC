# Spec — Métronome du mode louange (lot MT)

État : **go de Timothée pour la piste A (13/11/2026, « go pour A »)**, lot MT en quatre tranches (§ Tranches).
Planche : `docs/planches/planche-metronome-2.html` (seconde planche, refaite d'après les applications de métronome ;
artefact privé https://claude.ai/artifact/G1e9txeUQrtE8XW5i5yC83). La première (`planche-metronome.html`) est
dépassée. Recherche : `docs/recherche-metronomes.md`.

## Demande (Timothée, 13/11/2026, ses mots)

> « il faudrait aussi un métronome avec du son et un métronome plus visuel qu'un simple trait qui bouge, il faudrait
> pouvoir choisir si c'est binaire ternaire, les temps fort et tout, en gros tout comme une vrai application de
> métronome dans le mode louange quoi »

Puis, en voyant la première planche (13/11) :

> « Regarde comment les sites / applications de métronomes fonctionnent ce qu'elles ont comme fonctionnalités et
> refais la planche »

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

Ce que font Soundbrenner, Pro Metronome, Tempo, Planning Center Music Stand et forScore, et ce qu'on en reprend :
`docs/recherche-metronomes.md`. En bref : tout ce qu'une vraie application a pour régler et pour s'entraîner, sauf la
vibration (Safari ne la permet pas sur iPhone), les polyrythmes et la synchronisation entre appareils.

| Réglage | Valeurs | Départ | Retenu |
|---|---|---|---|
| Marche / arrêt | bouton « ♩ 72 ▶ / ■ » (barre en grand écran, bout de la bande au téléphone), Marche / Arrêt du panneau, Espace sur ordinateur | arrêt | non : arrêté à chaque chant ouvert |
| Indicateur affiché | la bande des temps, allumée ou non (entrée « Métronome » d'Outils) | non | par appareil (`perf-metronome`, existant) |
| Tempo | 30 à 240 ; grand chiffre (toucher = pavé numérique), − / +, **réglette** graduée tous les 10 (suivi au doigt, élan, arrêt sur un entier), **Taper** ; « Revenir au tempo du chant » | `{tempo}` du chant, sinon 72 | par chant et par appareil (`perf-tempo-<id>`, existant) |
| Mesure | 2/4, 3/4, 4/4, 6/8, 12/8, Autre (1 à 12 temps, unité noire ou croche) | `{time}` du chant, sinon 4/4 | par chant et par appareil |
| Accents | une pastille par temps, touchée pour tourner **fort → moyen → faible → muet** (quatre niveaux, comme Soundbrenner et Pro Metronome) | 1 fort ; en 6/8 1 fort et 4 moyen ; en 12/8 1 fort, 4, 7, 10 moyens | par chant et par appareil |
| Binaire / ternaire | deux boutons nommés ainsi (二分 / 三分), puis les subdivisions en notes : Binaire → aucune, croches, doubles, croche pointée ; Ternaire → triolets | Binaire ; Ternaire d'office en 6/8 et 12/8 | par chant et par appareil |
| Son | interrupteur à part (seul avec Marche / Arrêt à porter la couleur d'accent) ; trois sons : **Clic, Bois, Cloche** ; volume | **coupé** | le son allumé : **jamais retenu** (Q5) ; le son choisi et le volume : par appareil |
| Décompte | aucun, 1 mesure, 2 mesures, sur la bande même | aucun | par appareil |
| S'entraîner (replié) | **mesures muettes** (« jouer 4 mesures, puis 4 en silence ») ; **accélération** (« de 60, +2 toutes les 4 mesures, jusqu'à 80 ») ; **minuteur** (« s'arrêter après 10 minutes ») ; chaque ligne est une phrase avec ses nombres à toucher et une case | tout éteint | par appareil ; éteint à la sortie du mode louange |

Tout reste dans `localStorage`, sous des clés `perf-metro-*` ajoutées à `src/lib/performance/tempo.ts` (même style
try/catch). **Aucun effet sur Firestore, sur les setlists ni sur les permissions** : `access.ts` et `firestore.rules`
ne changent pas. Dans une setlist, le tempo, la mesure et les accents **suivent chaque chant** et changent seuls au
chant suivant (comme Planning Center et forScore) ; le métronome s'arrête au changement de chant.

Mesure composée (6/8, 12/8) : le tempo compte la **noire pointée** (« ♩. = 74 », Q2), mais la bande montre **six ou
douze pastilles groupées par trois**, ce qui rend le ternaire visible.

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
- Trois sons **synthétisés**, sans fichier (Clic : bruit bref filtré ; Bois : sinus court grave ; Cloche : deux
  partiels à décroissance longue), chacun avec trois hauteurs ou intensités pour fort, moyen et faible, et une
  version douce pour les subdivisions. Hors-ligne sans rien ajouter au cache du service worker (`sw.js` ne change pas).
- iOS : l'interrupteur « silencieux » du téléphone coupe Web Audio. Le panneau le dit en une ligne sous le bouton son,
  sur iPhone et iPad seulement : « Rien n'est entendu ? Vérifiez le bouton silencieux de l'appareil. »
- **Le son se coupe tout seul** (proposition du pilote, Q5) quand on change de chant, quand on quitte le mode louange,
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

Le rangement des réglages est décidé (`docs/spec-reglages-unifies.md`, piste B, go de Timothée le 13/11) : une marge
« Affichage » / 显示 qui **repousse** la musique (colonne de 320 px à droite en grand écran, feuille basse au
téléphone et en tablette portrait), et « Outils » du mode louange garde le métronome. Le panneau Métronome prend
**la forme du menu « Setlist »** (décision de Timothée, 13/11, ci-dessous) : c'est un outil qu'on ouvre et ferme pendant qu'on joue.

- **Ouvrir le panneau** : toucher la bande des temps, ou la pastille « ♩ 72 » de la barre (tablette, ordinateur),
  ou « Métronome » dans Outils.
- **Lancer / arrêter sans ouvrir** : le ▶ / ■ de la pastille (grand écran) ou du bouton au bout de la bande
  (téléphone).
- **Forme (décision de Timothée, 13/11, remplace la colonne et la feuille à deux crans)** : une fenêtre comme le menu
  « Setlist » du mode louange (`MenuLouange` : popover sous ♩ de la barre dès 768 px, feuille du bas au téléphone) ;
  toucher ailleurs ou Échap la ferme. La musique ne bouge pas.
- Un seul menu ou panneau ouvert à la fois (`popoverOuvert`), marge « Affichage » comprise quand RU-5 la montera.

## Indicateur visuel et panneau (planche)

Seconde planche (`docs/planches/planche-metronome-2.html`), avec l'encadré « ce que font les apps → ce qu'on
reprend ». Trois pistes : **A · « Un, deux, trois, quatre »** (recommandée), B · « Le cadran » (un petit cadran
dans la barre, le même en grand qu'on tourne pour le tempo, comme Soundbrenner), C · « La mesure écrite » (« ♩ = 72 »,
la signature et une note par temps, en rythme 简谱 dans un chant chinois). B se voit mal du coin de l'œil (44 px dans
un coin) et le cadran se tourne mal à la souris ; C se lit moins vite qu'un chiffre et demande deux écritures. Le
cadre qui pulse de forScore n'est pas repris : en sombre, c'est un grand aplat clair qui clignote vers la salle, et
il ne dit pas quel temps on joue. La critique a demandé des retouches, faites une fois par la conversation
principale (temps muet tramé, contraste à l'arrêt, 12/8 au téléphone, cibles de 44 px, coupure du chinois, piste C
à quatre temps en grand écran).

### Piste A, « Un, deux, trois, quatre »

- **La bande** : sous la barre (au ras de la zone sûre quand la barre se cache), 36 px de haut, **une pastille
  chiffrée par temps** ; la page descend de 36 px, rien n'est couvert (ni partition, ni scan 简谱). On voit « on est
  sur 3 » d'un coup d'œil, et la même bande sert au décompte. C'est le « Visual Metronome » de Planning Center, en
  chiffres. Pastilles réparties sur la largeur de la musique, 160 px au plus chacune.
- **Accents par la forme au repos** : fort 28 px de haut, contour de 2,5 px, chiffre gras ; moyen 24 px ; faible
  20 px ; muet, contour en tirets (on continue de compter). Au repos, contour et chiffre à 60 % de l'encre (≥ 3:1 en
  clair et en sombre).
- **Le battement** : la pastille du temps s'allume d'un coup (pleine d'encre, chiffre couleur du fond ; en sombre, à
  85 % de #f2f2f7 pour ne pas éclairer la salle) et revient au repos sur 60 % du temps. Temps muet en cours : **trame**
  à l'encre et contour plein, sans aplat. Aucune teinte : ni orange (`--sec-chorus`), ni rouge (简谱, logo).
- **6/8 et 12/8** : six ou douze pastilles groupées par trois (écart de 16 px entre groupes). Au téléphone en 12/8,
  pastilles de 24 px, chiffrées seulement au début de chaque groupe (1, 4, 7, 10) et sur le temps en cours.
- **À l'arrêt** : les pastilles gardent leur contraste de repos (on vérifie mesure et accents avant de lancer) ;
  rien n'est allumé ; le bouton montre ▶.
- **Mouvement réduit** : la pastille passe d'un temps à l'autre par paliers, sans fondu ; la bande ne glisse plus
  quand la barre se cache (fondu de 150 ms). Un changement d'état n'est pas un mouvement : le métronome bat toujours.
- **Le panneau**, de haut en bas : grand tempo (64 px, chiffres tabulaires, « ♩ / min ») avec − / + de 44 px ;
  réglette ; Taper (56 px) et Marche / Arrêt (accent) ; Mesure ; Temps (les mêmes pastilles, **cible fixe de 44 px**,
  l'accent porté par le contour et la graisse, légende « Touchez un temps pour changer : fort, moyen, faible,
  muet ») ; Binaire | Ternaire puis subdivisions en notes ; Son (interrupteur à l'accent ; Clic | Bois | Cloche ;
  volume, grisés son coupé) ; Décompte ; « S'entraîner » (replié) ; pied « Retenu pour ce chant sur cet appareil » et
  « Revenir au tempo du chant ». Raccourcis sur ordinateur : Espace (Marche / Arrêt), T (Taper).
- **Polices** : celle du système (chiffres tabulaires) ; chiffres arabes aussi en chinois (on compte et on écrit le
  简谱 ainsi). Les glyphes de notes (♩ ♪ ♫ ♬, croche pointée, soupir) manquent au sous-ensemble Noto Music de
  `globals.css` (♯ ♭ ♮ seulement) : on les dessine en SVG (quelques icônes), plutôt que d'élargir la police.
- **Libellés zh** : 节拍器, 速度, 拍号, 拍, 重 / 中 / 弱 / 静音, 细分, 二分 | 三分, 声音, 音量, 打拍, 开始 / 停止,
  预备拍, 练习, 静音小节, 渐快, 计时 ; relancer `python3 scripts/build-fonts.py`.

Non vu par la planche (à regarder en tranche, sur le vrai site) : des chiffres au-dessus d'un vrai scan 简谱 (risque
qu'on les lise comme des degrés : ils restent dans la bande du chrome, en pastilles, à l'encre, jamais sur le scan) ;
le son sur iPhone avec l'interrupteur silencieux (`navigator.audioSession`, à essayer).

## Questions à Timothée (la recommandation en premier)

1. **Quelle piste ?** **Recommandation : A, « un, deux, trois, quatre »** (une pastille chiffrée par temps sous la
   barre, comme le « Visual Metronome » de Planning Center), avec le panneau complet décrit ci-dessus.
2. **6/8 et 12/8 : le tempo compte-t-il la noire pointée ?** **Recommandation : oui** (« ♩. = 74 »), avec six ou
   douze pastilles groupées par trois. Seuls trois chants sont concernés ; leur `{tempo}` est relu en MT-1.
3. **Téléphone : où lance-t-on et où règle-t-on ?** **Recommandation** : un bouton « ♩ 72 ▶ » au bout de la bande
   pour lancer et arrêter, toucher la bande pour ouvrir le panneau ; « Métronome » dans Outils fait apparaître la
   bande.
4. **Mouvement réduit : la bande bat-elle encore ?** **Recommandation : oui**, par paliers, sans fondu (un métronome
   figé ne sert à rien).
5. **Le son se coupe-t-il au changement de chant, même en répétant toute une setlist ?** **Recommandation : oui**
   (proposition du pilote), **sauf si « S'entraîner » est ouvert** : en répétition, le son et l'entraînement
   continuent d'un chant à l'autre ; pendant le culte (S'entraîner fermé), un clic ne repart jamais tout seul.

## Tranches

Chaque tranche : `/tranche`, specs Playwright sur les trois appareils (ordinateur, téléphone, tablette) ; celles qui
touchent l'agencement s'ajoutent à `SPECS_GRAND_ECRAN` (cinq projets). Tests sur un chant FR et un chant ZH avec
`{tempo}` et un chant en 6/8. Le son se vérifie en remplaçant `AudioContext` par un faux dans la page
(`addInitScript`) qui enregistre les `start(t)` : aucune écoute réelle dans les tests.

### MT-1 — La bande des temps, sans son (M)

- `src/lib/performance/metronome.ts` (nouveau) : position dans la mesure à partir d'une horloge (`performance.now()`
  ici, Web Audio en MT-3), tempo, mesure, accents à quatre niveaux, groupes 3 + 3 ; changement de tempo au temps
  suivant, de mesure à la mesure suivante. `{time}` porté du parseur jusqu'au mode louange (vérifier
  `songs-index.json` et `blocks.ts`). Relire le `{tempo}` des trois chants en 6/8 et 12/8 (Q2).
- `LiseretTempo.tsx` remplacé par la bande (pastilles, accents par la forme, trame du temps muet, arrêt, 12/8 au
  téléphone, mouvement réduit) ; `globals.css:906-917` remplacé ; la page descend de 36 px. Pastille « ♩ 72 ▶ / ■ » de
  la barre (grand écran) et bouton au bout de la bande (téléphone) ; arrêt au changement de chant.
- Critères : à 120 en 4/4, la pastille allumée avance d'un temps toutes les 500 ms (`page.clock`) ; 3/4 → trois
  pastilles, 6/8 → six en deux groupes, 12/8 → douze, chiffrées 1, 4, 7, 10 au téléphone ; temps muet tramé ;
  `prefers-reduced-motion` → aucune transition CSS sur les pastilles, le temps avance toujours ; aucun chevauchement
  entre la bande et le premier élément de la page (partition texte et scan 简谱), aux cinq projets ; contraste des
  pastilles au repos ≥ 3:1 en clair et en sombre.
- Specs : `tests/metronome-bande.spec.ts` (nouvelle, dans `SPECS_GRAND_ECRAN`) ; mise à jour des tests L4 de
  `tests/mode-louange-forscore.spec.ts`. Un chant FR, un ZH, un 6/8.

### MT-2 — Le panneau, sans son ni entraînement (M)

- Panneau à la forme de la marge RU (colonne de 320 px qui repousse ; feuille basse à deux crans au téléphone et en
  tablette portrait), remplace la feuille Tempo (`ContenusMenus.tsx:420-445`). Tempo (pavé, − / + avec appui long par
  5, réglette, Taper : moyenne des quatre derniers appuis, remise à zéro après 2 s, compté à l'appui), « Revenir au
  tempo du chant », Mesure et Autre, Temps (quatre niveaux), Binaire / ternaire et subdivisions, Décompte. Icônes de
  notes en SVG. Réglages `perf-metro-*`. Libellés fr / zh (`i18n-sync`), `build-fonts.py`.
- Critères : chaque réglage change la bande et survit à un rechargement, au bon niveau (chant ou appareil) ; un autre
  chant garde les siens ; dans une setlist, le chant suivant arrive avec son tempo et sa mesure ; Taper à 500 ms
  d'écart donne 120 ; toutes les cibles font 44 px ; aucun texte coupé en zh à 390 px ; `aria-pressed` et nom
  (« Temps 1, fort ») sur les temps ; marge « Affichage » et panneau jamais ouverts ensemble.
- Specs : `tests/metronome-panneau.spec.ts` (nouvelle, dans `SPECS_GRAND_ECRAN`) ; voisines
  `tests/louange-menus.spec.ts`, `tests/usage-dimanche.spec.ts` (compteur `cmd.louange.metronome`), et la spec de la
  marge RU.

### MT-3 — Le son (M)

- Création de l'`AudioContext` sortie de `synthese.ts` dans une fonction commune (un seul contexte) ; ordonnanceur
  en avance (réveil 25 ms, horizon 100 ms) qui pilote aussi l'image ; trois sons synthétisés, quatre niveaux,
  subdivisions douces ; volume ; bascule d'horloge sans saut quand le son s'allume en marche. Bloc Son du panneau,
  son coupé à chaque ouverture, coupure au changement de chant (sauf S'entraîner ouvert, Q5), à la sortie du mode
  louange et sur `visibilitychange` ; avis « Son coupé » ; ligne sur l'interrupteur silencieux (iPhone, iPad).
- Critères (faux `AudioContext` injecté par `addInitScript`, qui enregistre chaque `start(t)` et sa fréquence) : son
  coupé, aucun contexte créé ; son allumé à 120 en 4/4 pendant 10 s, 20 clics, écart à l'instant théorique sous
  2 ms ; fort, moyen, faible distincts ; muet sans clic ; Ternaire → trois clics par temps ; changer de chant, cacher
  la page ou quitter le mode louange → plus aucun `start` ; à la réouverture, son coupé. L'écoute d'harmonie marche
  toujours.
- Specs : `tests/metronome-son.spec.ts` (nouvelle) ; voisine `tests/harmonie-ecoute.spec.ts`.

### MT-4 — Décompte, S'entraîner et clavier (M)

- Décompte d'une ou deux mesures sur la bande (clics si le son est allumé), puis la suite sans arrêt. « S'entraîner »
  : mesures muettes (X jouées, Y en silence : la bande continue, tramée), accélération (de N, +k toutes les n mesures,
  jusqu'à M), minuteur (arrêt après T minutes) ; tout éteint à la sortie du mode louange. Espace et T sur ordinateur
  (pas quand un champ a le focus), annoncés seulement avec un clavier.
- Critères : décompte d'une mesure à 120 en 4/4 → 1 à 4 pendant 2 s, puis la suite ; « 4 jouées, 4 muettes » → aucun
  `start` pendant les mesures 5 à 8, la bande bat toujours ; « de 60, +2 toutes les 4 mesures, jusqu'à 80 » → 62 au
  début de la mesure 5, plafonné à 80 ; minuteur d'une minute → arrêt à 60 s (`page.clock`) ; Espace lance et arrête ;
  rien ne se déclenche dans un champ.
- Specs : `tests/metronome-entrainement.spec.ts` (nouvelle). Fin de lot : les specs du lot et les voisines, trois
  appareils (cinq projets pour les specs d'agencement).

## Avancement

- 14/11/2026 : **MT-4 faite, lot MT fini** (décompte, S'entraîner, clavier). Décompte de 1 ou 2 mesures fixé à l'appui sur
  Marche, sur la même horloge (aucun saut) : la bande porte `data-decompte`, temps allumé en contour épais ; son allumé,
  un clic par temps (un muet y sonne faible), sans subdivision. Bloc « S'entraîner » replié après Décompte
  (`EntrainementMetronome.tsx`, `useEntrainement.ts`) : mesures muettes (aucun `start`, bande tramée `data-muette`),
  accélération (`changerTempoAMesure` dans `metronome.ts` : 62 pile au premier temps de la mesure 5, plafond à « jusqu'à »),
  minuteur (temps restant m:ss) ; valeurs retenues par appareil (`perf-metro-entrainement`), cases éteintes à chaque
  ouverture. Q5 : S'entraîner ouvert, le changement de chant ne coupe ni la marche ni le son. Taper partagé
  (`useTaper.ts`) entre le bouton et la touche T ; `<kbd>` Espace / T seulement avec un clavier, `aria-keyshortcuts`
  toujours. **Décisions déléguées (session MT-4, 14/11)** : Espace lance et arrête le métronome **seulement quand la bande
  est affichée ou la fenêtre ouverte** (sinon Espace tourne la page comme avant, pour les pédales) ; rien dans un champ ;
  le tempo de l'accélération est passager (jamais écrit dans `perf-tempo-<id>`, retour au tempo du chant à l'arrêt ; le
  grand chiffre du panneau garde le tempo du chant, la bande et ♩ montrent le tempo joué) ; « jusqu'à » plus bas que
  « de » : pas de ralentissement ; cocher les muettes ou l'accélération en marche compte les mesures depuis l'appui sur
  Marche (le tempo saute au palier atteint) ; la ponctuation qui suit un champ reste collée à lui (« ，直到 » ne commence
  plus une ligne). Non fait, à noter : pas de singulier (« Jouer 1 mesures », « après 1 minutes ») ; le haut de la
  fenêtre en popover rogne le contenu qui défile, sans fondu (existait depuis MT-2) ; les interrupteurs éteints en sombre
  ont le bouton noir du style existant. Libellés zh neufs à faire relire : 练习, 演奏, 静音, 起始速度, 目标速度, 每次增加,
  间隔小节数, 剩余, 空格. Tests : `metronome-entrainement` (nouvelle, 14 cas) ; fin de lot `metronome-son`,
  `metronome-panneau`, `metronome-bande`, `harmonie-ecoute`, `louange-menus`, `mode-louange-forscore` : 745 verts en
  37 min, deux rouges en passe chargée (`metronome-panneau:303` au téléphone, `mode-louange-forscore:889` à 1 440 px),
  verts seuls (10/10 en 54 s) ; `metronome-entrainement` revue après la retouche de ponctuation : 42/42 en 3 min 24 s.
  Captures `regard` (cinq dispositions, clair, sombre, FR, 为我而来).

- 14/11/2026, nuit : **MT-3 faite** (le son). `src/lib/audio/contexte.ts` : un seul `AudioContext`, partagé avec l'écoute
  d'harmonie (`synthese.ts`), créé dans le geste qui allume le son (`audioSession.type = "playback"` essayé), jamais
  fermé ; rien n'est créé son coupé. `hooks/useMetronome.ts` (appelé dans PerformanceMode) : horloge `performance.now()`
  son coupé, `currentTime` son allumé, bascule sans saut par un décalage ; ordonnanceur 25 ms / 100 ms sur
  `creerHorloge().debuts()` (instants t0 + k × durée, changements en attente compris) ; le temps en cours passe par un
  petit store lu par `BandeTemps` (`useSyncExternalStore`) pour ne pas re-rendre tout le mode louange à chaque temps.
  `sonMetronome.ts` : Clic (bruit filtré), Bois (sinus), Cloche (deux partiels), fort / moyen / faible en hauteur et en
  gain, subdivisions douces, muet sans clic ; en 6/8 et 12/8, un clic par pastille. Bloc Son du panneau (en fenêtre
  depuis MT-2) entre Subdivision et Décompte ; `perf-metro-son` et `perf-metro-volume` par appareil ; son coupé à chaque
  ouverture, au changement de chant, page cachée et à la sortie, avis « Son coupé » (3 s) ; ligne du bouton silencieux
  sur iPhone et iPad. **Décisions déléguées (session MT-3, 14/11)** : Bois en sinus 550 à 900 Hz (aigu de bois plutôt que
  grave sourd, plus audible sur un haut-parleur de téléphone) ; Segment, volume grisés **et désactivés** son coupé ;
  `Segment` (MargeAffichage) prend `min-w-11` partout (« 铃 » faisait 37 px) et une prop `desactive` ; réglette de
  volume à la couleur du texte. L'exception « S'entraîner ouvert » de Q5 reste pour MT-4. Non fait, à noter : gains non
  observés par le test (le faux AudioParam ignore les rampes), critère « 60 s à 120 » vérifié sur 10 s ; accents d'une
  mesure changée en cours appliqués un instant avant le changement d'horloge ; avis « Son coupé » et avis du crayon au
  même endroit (rares ensemble). Libellés zh neufs à faire relire : 声音, 咔嗒, 木鱼, 铃, 音量, 声音已关闭. Tests :
  `metronome-son` (nouvelle, 11 cas), `metronome-panneau`, `metronome-bande`, `harmonie-ecoute` : verts (165 + 5 après
  la correction de « 铃 ») ; ≈ 5 min 20 s pour la passe, 4 min 10 s pour le dernier tour (`metronome-son` et `metronome-panneau` ; « jamais ouverts ensemble » rouge une fois au téléphone, vert seul).

- 13/11/2026, nuit : **décision de Timothée (13/11, transmise par le pilote)** : « Fait une fenêtre comme pour les setlists
  dans le mode louange, il faudrait que le métronome aussi soit comme ça c'est à dire une fenêtre comme pour les
  setlists. » Le panneau Métronome est donc converti : il s'ouvre dans `MenuLouange` (`id="metronome"`), la même
  primitive que le menu « Setlist » (popover ancré sous ♩ de la barre dès 768 px, feuille du bas au téléphone), avec ses
  bords et sa fermeture (toucher ailleurs, Échap). Plus de colonne de 320 px qui repousse la musique, plus de feuille à
  deux crans ni de poignée : les § « Où il se range » et MT-2 sont dépassés sur ce point. Le contenu ne change pas ; la
  bande des temps non plus. Un toucher hors de la fenêtre la ferme sans tourner la page, comme les autres menus.
  Fait dans la session MT-2 : tests `metronome-panneau` (cinq projets, le test de forme remplace ceux de la colonne et de
  la feuille), `metronome-bande`, `louange-menus`, `usage-dimanche` verts ; ≈ 22 min. Captures regardées (tablette
  portrait et paysage, téléphone, clair et sombre, FR et 为我而来).

- 13/11/2026, nuit : **MT-2 faite** (le panneau, sans son ni entraînement). `PanneauMetronome.tsx` (colonne de 320 px qui
  repousse la musique dès 1 024 px, deux colonnes repliées en une ; feuille pleine largeur à deux crans dessous, « moyen »
  60 dvh et « grand » qui s'arrête sous la bande), `IconeNote.tsx` (notes en SVG), réglages `perf-metro-*` dans `tempo.ts`
  et `useTempoChant.ts` (mesure, accents, subdivision par chant ; décompte par appareil ; la mesure changée remet les
  accents aux défauts). Tempo : − / + (appui long par 5), pavé, réglette, Taper (quatre derniers intervalles, remise à
  zéro après 2 s) ; « Revenir au tempo du chant ». La feuille Tempo et `LignesTempo` sont retirées ; au téléphone, Outils
  a une ligne « Métronome » ; la pastille ♩ et la bande ouvrent le panneau (`popoverOuvert = "metronome"` : un seul menu
  ou panneau à la fois ; il remplacera la marge « Affichage » quand RU-5 la montera). Restes de MT-1 : fort au repos à
  2 px, chiffres à 15 / 17 px dès 1 024 px, temps muet tramé testé, bande sans plafond de 1 440 px (mêmes marges que la
  musique). **Décisions déléguées (session MT-2, 13/11)** : subdivisions et décompte retenus mais sans effet sur la bande
  (son en MT-3, décompte en MT-4) ; après `critique-design` : « Marche » à `--couleur-icones` (l'accent du mode louange),
  l'interrupteur « Métronome visuel » en ligne libellée avec un interrupteur (plus un rond muet dans l'en-tête), pastilles
  de la bande à 96 px au plus (à 160 px, le fort se lisait comme un onglet choisi), feuille pleine largeur en tablette
  portrait (à 560 px elle coupait la musique de part et d'autre ; même choix que le volet Harmonie de JV-5b), grand cran
  sous la bande. Non retenu : « Autre » seul sur sa ligne dans la colonne, « Je joue » sur deux lignes en paysage quand la
  colonne est ouverte. Le test de chevauchement de MT-1 suit le scan de JV-5c (enveloppe `display: contents`). Libellés
  zh neufs à faire relire : 视觉节拍器, 打拍, 预备拍, 本设备为此歌保存, 恢复歌曲速度. Tests : `metronome-panneau` (nouvelle,
  cinq projets), `metronome-bande`, `louange-menus`, `usage-dimanche`, `mode-louange-forscore` : verts (Repères à 1 440 px
  rouge deux fois en fin de passe chargée, vert seul) ; ≈ 75 min en deux passes plus les relances.

- 13/11/2026, soir : **MT-1 faite** (bande des temps, sans son). `metronome.ts` (mesure, accents par défaut, horloge :
  tempo au temps suivant, mesure à la mesure suivante), `BandeTemps.tsx` à la place du liseré, `{time}` porté jusqu'au
  mode louange, ▶ / ■ dans la barre (grand écran) et au bout de la bande (téléphone), arrêt au changement de chant, page
  descendue de 36 px (scan compris). Q2 relue sur les scans : 为我而来 et 活出爱 portent bien « ♩. = 74 / 63 » ; 十字架
  n'a pas de tempo. **Décisions déléguées (session MT-1, 13/11)** : un chant sans tempo affiche la bande à ♩ 72 (départ
  de § Réglages) ; la pastille ♩ de la barre montre le tempo joué (réglage de l'appareil, sinon le fichier), le même que
  la bande ; toucher la bande ouvre la feuille Tempo (Outils au téléphone) jusqu'au panneau de MT-2. Retouches après
  `critique-design` : 12/8 au téléphone resserré (le « 10 » tenait mal), ♩ du bouton à la taille de la barre, chiffres au
  repos à 65 % en clair (≥ 4,5:1), chiffre clair gardé 40 % du fondu. **Reste pour MT-2** : critère du temps muet tramé
  (accents pas réglables avant MT-2 ; CSS écrit), largeur de la bande calée sur la musique à 1 440 px (aujourd'hui la
  zone de 1 440 px), chiffres un peu plus grands en grand écran, temps fort qui peut se lire comme un onglet choisi ;
  fondu de 150 ms de la bande en mouvement réduit non fait (elle ne glisse pas). Le liseré coupé en haut du scan de
  活出爱 existait avant la bande. Tests : `metronome-bande`, `mode-louange-forscore`, `louange-menus` (+ `coherence`),
  trois appareils et cinq projets pour la bande : verts (deux courses relancées seules, vertes) ; ≈ 40 min en deux passes.

- 13/11/2026, 17 h 55 UTC : **go de Timothée, « go pour A »** (question 1). Questions 2 à 5 : **décision déléguée
  (session de cadrage, 13/11)**, prises selon la recommandation de cette spec, parce qu'elle est motivée et facile à
  défaire : noire pointée en 6/8 et 12/8 ; bouton « ♩ 72 ▶ » au bout de la bande au téléphone ; la bande bat
  toujours en mouvement réduit, par paliers ; son coupé au changement de chant sauf si « S'entraîner » est ouvert.
  **Ordre** : MT-1 tout de suite (fichiers neufs et un montage court dans `PerformanceMode.tsx`, à côté de TC-4,
  JV-5 et des corrections du parcours : règle des zones différentes, `git pull --rebase` avant de coder, avant les
  tests finaux et avant de pousser) ; **MT-2 attend RU-2** (la marge « Affichage », dont le panneau reprend la forme
  et le composant) ; MT-3 et MT-4 suivent.

- 13/11/2026 : constat, première planche, puis, à la demande de Timothée, recherche sur les applications de
  métronome et seconde planche (retouchée une fois après critique) ; spec réécrite d'après elle. Session de cadrage,
  sans code. Attend les réponses aux questions 1 à 5 et le go de Timothée pour le lot MT (quatre tranches).
