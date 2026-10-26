# Spec : mode louange « façon forScore »

**Statut : tranché par Timothée le 26/10/2026 (piste A, recommandations des questions 2 à 8 retenues), go pour les lots L0 à L7 le 26/10/2026.**
Rédigé le 26/10/2026 (session cloud). Pièces du chantier : `chantier-forscore/01-releve-forscore.md` (ce que fait
forScore, sourcé), `02-mode-louange-actuel.md` (inventaire du code), `03-comparaison.md` (écarts, tailles),
`chantier-forscore/planche.html` (trois pistes maquettées, à ouvrir dans un navigateur).
Spec de départ du mode : `spec-mode-louange.md`.

## Contexte et demande

Demande de Timothée du 26/10/2026 : que le mode louange ressemble **au maximum à forScore**, l'application iPad de
partitions que l'équipe aime, adaptée au site. L'équipe n'utilise **pas de pédalier Bluetooth** : tout ce qui s'y
rapporte est hors périmètre (les flèches et l'Espace au clavier restent pour l'ordinateur).

## Ce qui est rouvert (zone gelée)

`audit-ui-apple-design.md` § 2 liste « le mode louange » parmi les zones gelées ; le dégel du 13/09/2026 n'ouvrait que
le chrome (barre d'outils). **Cette demande explicite de Timothée rouvre le mode louange** pour : la façon de tourner
les pages, l'écran de lecture et ses commandes, l'annonce du chant suivant, le tempo, les annotations (clé de page).

Restent gelés (limites de `spec-mode-louange.md`) : couleurs de sections, d'accords (`#3f63cf`) et de 简谱 ; calques 简谱
certifiés ; le PDF ; l'éditeur de setlist ; le look 5C1 (`spec-look.md`), dont le mode reprend les matériaux et les
polices tels quels. Les permissions n'ont aucune raison de changer.

## Principes

1. **Le dimanche ne casse jamais** (`feuille-de-route.md`) : chaque lot laisse le mode actuel intact derrière un
   réglage de repli, et se livre seul.
2. **Un geste, un sens** : côtés = tourner ; centre = commandes. Rien d'ambigu, rien d'inactif qui avale un toucher.
3. **L'écran de lecture est nu** : la musique d'abord ; les commandes à la demande.
4. **Sur les quatre dispositions** (téléphone, tablette portrait, tablette paysage à barre latérale réduite, ordinateur,
   lecture plafonnée à 1 440 px) et sur les quatre systèmes : tout survol a un équivalent au toucher ; jamais ⌘ seul.
5. **Coût nul, Firestore en REST seulement** : aucune nouvelle dépendance, aucun temps réel.
6. **Un nouveau réglage qui change la mise en page entre dans `signatureAffichage`** (`src/lib/performance/blocks.ts`),
   sinon les annotations se mélangent.
7. Aucune fonction de forScore sans objet pour un culte (liens, boutons, recadrage, bibliothèque, autoturn, audio, Cue).

## Piste retenue

**A « forScore fidèle »** (planche), derrière un réglage de repli. Choisie par Timothée le 26/10/2026 (« Fait la piste A »). B (ligne
d'état permanente) et C (évolution minimale) sont maquettées pour comparaison ; les lots 1, 3, 4 et 5 valent pour les
trois pistes.

## Découpage en lots

Chaque lot est livrable, testable et réversible seul. Ordre proposé : sécurité d'abord, puis le gain par taille.

| Lot | Contenu | Taille | Fichiers principaux |
| --- | --- | --- | --- |
| L0 | **Repli** : réglage par appareil « Style de lecture : Classique / forScore », `localStorage` (try/catch), défaut « Classique » ; dans Réglages du mode. Les lots suivants s'activent par ce réglage, sauf L3 et L4 | S | `PerformanceMode.tsx`, nouveau `src/lib/performance/lecturePref.ts` |
| L1 | **Lecture verrouillée et barre à la demande** (style forScore) : plus de minuterie de 3 s, la barre reste jusqu'au second toucher au centre ; en lecture seuls les côtés agissent. **Correction** : les bandes des barres invisibles ne captent plus les touchers (aujourd'hui `pointer-events-auto` à `opacity 0`, `:1476`, `:1538`) | S | `PerformanceMode.tsx` (chrome) |
| L2 | **Zones et balayage** : largeur des zones selon la question 2 ; balayage horizontal (≥ 40 px, ≤ 500 ms, plus long que haut), sans gêner zoom ni annotation  | S | `PerformanceMode.tsx` (`handlePointerDown/Up`) |
| L3 | **« Ensuite : titre · tonalité »** : bandeau clair, touchable, présent sur toutes les dispositions (y compris scan 简谱 en colonne), toucher à droite = chant suivant, aucune confirmation | S | `PerformanceMode.tsx` (`:1392-1404`, `colonneScan`) |
| L4 | **Tempo sur toutes les pages**, puis **métronome visuel** (liseré qui bat, silencieux, tempo du fichier, réglable par chant sur l'appareil ; réduit sans animation si `prefers-reduced-motion`). Pas de son | S puis S à M | `PerformanceMode.tsx`, `src/lib/performance/` |
| L5 | **Annotations stables** : taille du texte mémorisée par chant sur l'appareil, figée dès qu'on annote ; avertissement « des annotations existent à une autre taille » avec bouton « Revenir à cette taille » (voir `03-comparaison.md` § 3) ; anciens traits intacts | S à M | `fontScalePref.ts`, `PerformanceMode.tsx`, `blocks.ts` |
| L6 | **Aperçu de la page suivante** en portrait (3 premières lignes sous une ligne bleue) | M | `PerformanceMode.tsx`, `columns.ts` |
| L7 | **Barre de recherche de page** : curseur sur la setlist, repères de début de chant, dans la barre basse | M | `PerformanceMode.tsx` |

Hors lots, à décider plus tard : **vrai demi-tour de page** (ligne glissable mémorisée par chant, L), **annotations
accrochées au bloc** (M à L, migration), **appui long = annoter** (question 4), **Cue** (position partagée entre
appareils, L, risque pour le dimanche), diapason (une note de départ), balayage-zoom à un doigt.

## Critères de succès (Playwright, trois appareils + grand écran)

Tous les tests visent `localhost`, simulent la session (`tests/helpers/fakeSession.ts`), utilisent `onStage` pour
cibler la scène (la copie de mesure invisible double chaque bloc) et des noms de membres fictifs. La spec
d'agencement s'ajoute à `SPECS_GRAND_ECRAN` (déjà le cas pour `performance-mode.spec.ts` ; une nouvelle spec
`tests/mode-louange-forscore.spec.ts` doit y être ajoutée) : cinq projets (ordinateur 1 440, téléphone, tablette
portrait, tablette paysage, ordinateur). Test propre à un appareil : le dit dans son titre.

- **L0** : appareil vierge = mode actuel, pixel pour pixel (comparaison de captures avant / après) ; réglage forScore
  retenu après rechargement ; localStorage bloqué = mode classique sans erreur.
- **L1** : barre masquée, un toucher sur la bande haute et sur la bande basse **tourne** (ou ne fait rien) mais n'arrête
  jamais le geste ; centre = barre visible et elle **y reste** 5 s ; second toucher = masquée ; aucune erreur console.
- **L2** : toucher à 15 % et à 85 % tournent, à 50 % ouvre la barre ; balayage de 80 px vers la gauche = page suivante,
  vers la droite = précédente ; balayage vertical court et zoom à deux doigts n'ont aucun effet de page ; annotation
  ouverte = aucun balayage de page.
- **L3** : dernière page d'un chant : le bandeau « Ensuite » affiche le titre et la tonalité du suivant et se touche ;
  vérifié aussi sur une page de scan 简谱 en colonne et sur le dernier chant (pas de bandeau).
- **L4** : un chant avec `{tempo: N}` affiche ♩ N sur une page texte ; le liseré change de largeur sur 2 s ; avec
  `prefers-reduced-motion` il ne bouge pas ; un chant sans tempo : pas de métronome.
- **L5** : dessiner un trait, changer la taille du texte, revenir : le trait est là ; sans retour, l'avertissement est
  visible et le bouton ramène à la taille d'origine ; un trait ancien (ancienne clé) se lit encore.
- **L6** : en portrait, les premières lignes de la page suivante sont visibles ; elles ne chevauchent pas la dernière
  ligne de la page courante (mesure `getBoundingClientRect`) ; absentes en paysage et sur téléphone.
- **L7** : le curseur saute au chant visé ; les repères correspondent aux débuts de chant.
- **Transverse** : à 390, 768, 1 024 et 1 440 px, aucun défilement horizontal de page ; rien sous la barre d'état
  (`--sat`, `--sab`) ; captures **à regarder** sur les quatre dispositions, FR et 中文, clair et sombre ; les
  couleurs d'accords et de sections n'ont pas bougé ; `tests/performance-mode.spec.ts` (27 blocs) reste vert.
- Commande type : `npm test -- tests/performance-mode.spec.ts tests/mode-louange-forscore.spec.ts`. Pas
  d'installation de serveur de test supplémentaire.

## Risques

| Risque | Parade |
| --- | --- |
| Le dimanche, un musicien est déstabilisé par un autre geste | L0 : repli par appareil, défaut « Classique » jusqu'à accord écrit de Timothée ; l'ancien code reste en place un mois après le défaut « forScore » ; essai un jeudi de répétition |
| Barre sans minuterie : un musicien oublie qu'elle est ouverte et recouvre la fin de page | Bandeaux fins (≈ 56 px) ; une page peut se tourner barre ouverte (les côtés restent actifs sauf sous les bandes) ; question 1 : B garde une ligne d'état |
| Tourner par erreur en voulant annoter | Zone centrale plus large (question 2) ; l'annotation s'ouvre par bouton (question 4) |
| Toucher avalé : arrêts de propagation oubliés sur un nouvel élément | Un test par nouvel élément touchable (« la page ne tourne pas ») ; règle du fichier : tout nouvel élément arrête la propagation |
| Aperçu de page : pagination faussée (hauteurs mesurées, `:689-807`) | L6 après les autres ; si l'aperçu déborde, il se retire, jamais le texte principal |
| Annotations : mauvaise clé, traits mélangés | Tout réglage de mise en page entre dans `signatureAffichage` ; incrémenter `j2/j3` à la main si le scan change ; anciens traits jamais supprimés ; prévenir l'équipe avant mise en ligne |
| iPad sans plein écran natif | Documenter l'installation en PWA ; le plein écran n'est pas un critère |
| Service worker : page périmée | HTML en réseau d'abord déjà acquis ; incrémenter `gcc-louange-vN` au dépôt du lot qui change du code client |
| Back-office / Firestore partagé local-en-ligne | Rien ne passe par `BACK_OFFICE` : le mode louange est public. Annotations toujours en REST ; une base partagée : aucune écriture de test hors session simulée |
| Taille : `PerformanceMode.tsx` fait 1 887 lignes | Chaque lot extrait ses nouveaux morceaux dans `src/lib/performance/` ou un composant voisin ; pas de refonte du fichier |

## Décisions (Timothée, 26/10/2026)

Les huit questions de la planche, tranchées : piste A, et les recommandations retenues pour les sept autres.

1. **Piste** : A « forScore fidèle », derrière le repli.
2. **Largeur des zones** : 30 / 40 / 30 sur tablette ; tiers égaux (33 / 34 / 33) sur téléphone et ordinateur.
3. **Demi-tour de page** (portrait) : aperçu fixe des premières lignes de la page suivante (L6) ; le vrai demi-tour seulement si l'équipe le réclame après essai.
4. **Annoter** : par le bouton de la barre (comme aujourd'hui) ; pas d'appui long pour l'instant.
5. **Annotations et taille du texte** : taille mémorisée par chant sur l'appareil, figée dès qu'on annote, avec l'avertissement « Revenir à cette taille » (L5).
6. **Repli** : réglage « Style de lecture : Classique / forScore » par appareil, **« Classique » par défaut** jusqu'à nouvel accord de Timothée.
7. **Métronome** : tempo affiché sur toutes les pages, puis liseré qui bat. Jamais de son.
8. **Barre de recherche de page** : curseur sur toute la setlist, repères au début de chaque chant (L7).

## Avancement

| Lot | État |
| --- | --- |
| L0 | **Fait (26/10/2026).** `src/lib/performance/lecturePref.ts` (clé `perf-style-lecture`, défaut « classique »), ligne « Style de lecture » dans Réglages après « Thème », attribut `data-style-lecture` sur la racine du mode ; aucun effet sur la lecture pour l'instant. `tests/mode-louange-forscore.spec.ts` (ajouté à `SPECS_GRAND_ECRAN`). Suite mode louange : 187 passés, 1 course sans rapport (`performance-mode.spec.ts:375`, sélecteur ambigu, vert à la relance). |
| L1 | **Fait (26/10/2026).** Correction des deux styles : barres masquées en `pointer-events-none` (plus de bande invisible qui capte). Style forScore : plus de minuterie de 3 s, la barre reste jusqu'au toucher au centre. Tests ajoutés dans `tests/mode-louange-forscore.spec.ts` (35/35 sur cinq projets) ; `performance-mode.spec.ts` inchangé, une course sous charge (`:243`, tablette) verte à la relance. |
| L2 | **Fait (26/10/2026).** `src/lib/performance/gestes.ts` ; style forScore : zones 30/40/30 sur tablette (tactile grossier et plus petit côté ≥ 600 px), tiers ailleurs ; balayage horizontal (≥ 40 px, ≤ 500 ms, plus long que haut) ; un second doigt annule le geste ; aucun balayage en annotation. 175 passés, 5 ignorés (tests propres à un appareil), 0 échec sur `mode-louange-forscore` + `performance-mode`. |
| L3 | **Fait (26/10/2026), valable pour les deux styles.** L'annonce du chant suivant (pastille du bas et bloc de la colonne 简谱) devient un bouton « Ensuite : titre · tonalité » (≥ 44 px) qui va à la 1ʳᵉ page du chant suivant sans confirmation ; clé i18n `performance.next` passée à « Ensuite : » (zh : 接下来：). Suites `mode-louange-forscore` + `performance-mode` + `jianpu-integration` : 419 passés, 2 échecs sans lien (`jianpu-integration` « 3 gomme invisible » tablette, rouge aussi sans le lot ; `performance-mode` polices ZH, course verte en isolation). |
| L4 | **Fait (26/10/2026), valable pour les deux styles.** Tempo « ♩ N » dans la barre haute sur toute page d'un chant qui en a un (`SectionBlock.tempo`) ; métronome visuel : `src/lib/performance/tempo.ts`, `LiseretTempo.tsx`, `@keyframes liseret-battement` (`globals.css`), lignes « Métronome visuel » et « Tempo de ce chant » dans Réglages. Jamais de son. |
| L5 | **Fait (26/10/2026), style forScore seulement.** `src/lib/performance/tailleAnnotee.ts` : la taille du texte à laquelle on a annoté est mémorisée par chant et par appareil (au premier trait) ; à l'entrée en annotation elle est rétablie, A−/A+ sont figés ; hors annotation, bannière « Des annotations existent à une autre taille » + bouton « Revenir à cette taille ». Clé de page et anciens traits inchangés. Suite `mode-louange-forscore` + `performance-mode` : 256 passés, 2 échecs d'un test Classique corrigés (barre qui s'efface), verts en isolation. |
| L6 à L7 | Go de Timothée le 26/10/2026. Codés par une session orchestratrice sur `ui/apple-design`, un commit par lot. |

### Choix faits en codant

- L0 : le test « localStorage bloqué » ne fait lever que les clés `perf-*` (le formulaire de connexion simulé a besoin du reste du stockage).
- L1 : à l'ouverture du mode (et à la sortie de l'annotation), en style forScore la barre est visible et y reste jusqu'au premier toucher au centre ; option la plus prudente (découvrable). Les tests ignorent les « Failed to load resource » (404 sans rapport) dans les erreurs console.

- L2 : la tablette se reconnaît par `(pointer: coarse)` et un plus petit côté ≥ 600 px ; sans `matchMedia`, tiers égaux. Le zoom à deux doigts et l'annulation par second doigt ne sont couverts que par la logique (la souris ne simule pas deux pointeurs).
- L3 : en style forScore, la barre du bas (z 20) recouvre le bandeau « Ensuite » tant qu'elle est ouverte ; il se touche barre masquée (la barre a déjà son propre bouton « chant suivant »). Option la plus prudente : on ne déplace rien. À voir à l'essai. Le libellé « Suivant : » devient « Ensuite : » aussi en Classique (la spec dit que L3 vaut pour les deux styles).
- L4 : le métronome visuel est **inactif par défaut** (il change l'écran de lecture ; clé `perf-metronome` = « 1 »). Le tempo réglé sur l'appareil (`perf-tempo-<slug>`, 30 à 240) prime sur celui du fichier ; sans tempo ni réglage, les − / + partent de 72. La barre haute affiche le tempo du fichier, non celui réglé sur l'appareil. Un chant fusionné (sans slug) n'a pas de réglage de tempo. Le liseré n'entre pas dans `signatureAffichage`. Sous `prefers-reduced-motion` : bande pleine à opacité réduite, sans animation.
- L4 : la barre haute montre le tempo du fichier, le liseré celui réglé sur l'appareil s'il existe (ils peuvent différer) ; à aligner si l'essai le réclame.
- L5 : la bannière « autre taille » (z 6) passe sous la barre haute tant que celle-ci est ouverte ; en forScore la barre reste ouverte jusqu'à un toucher au centre, donc l'avertissement ne se touche qu'une fois la barre masquée. Option la plus prudente (rien déplacé) ; à voir à l'essai. La taille mémorisée n'est appliquée qu'à l'entrée en annotation. Un chant fusionné (sans slug) n'a ni taille mémorisée ni bannière.
