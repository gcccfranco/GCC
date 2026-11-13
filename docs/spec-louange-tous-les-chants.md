# Spec : tous les chants dans le mode louange (lot TC)

**Statut : go de Timothée (12/11/2026, soir, « Go ») ; questions tranchées (un seul bouton Setlist) ; se code après AN, MP-6 et Harmonie H8 (`PerformanceMode.tsx`).**
Planche : `docs/planches/planche-louange-tous-les-chants.html` (artefact privé
https://claude.ai/artifact/TJjUgVoEPRcPPa8FEgpTQU), section « Version retenue » en tête.

## Demande et décisions

- **Demande (Timothée, 12/11/2026)** : « Dans le mode louange […] ce serait bien de pouvoir avoir accès à tous les
  chants directement dans le mode louange tout comme les setlist et avoir les idées d'harmonies pour chaque chants
  intégrés dedans aussi. » Les idées d'harmonie sont le lot H8 (`docs/spec-harmonie-accords.md`, décision 4 et
  tableau « Lots »), déjà décidé : ce lot n'en redessine rien.
- **Décisions de Timothée (12/11/2026, soir)**, sur la planche :
  1. **Piste A** : en tête du menu Setlist, une commande segmentée « Cette setlist | Tous les chants » ; le chant
     touché dans « Tous les chants » s'insère dans la suite, juste après le chant en cours.
  2. **Bouton à part « Tous les chants »** dans la barre du haut, à côté de Setlist : il ouvre directement le menu
     sur l'onglet « Tous les chants ».
  3. **Interrupteur « Avec 简谱 / Sans »** en tête de la liste : le chant s'ouvre dans la version choisie ; le bouton
     简谱 des Options d'affichage reste pour changer en cours de chant.

## Ce que le code montre (12/11/2026)

- Barre du haut : `src/components/performance/BarreHaut.tsx` ; bouton Setlist `:72`, `onMenu("setlist")` ; menus
  nommés par `MenuId` (`MenuLouange.tsx:8` : `setlist | reperes | jejoue | outils | options | tempo`).
- Menu Setlist : `ContenuSetlist` (`ContenusMenus.tsx:207-276`) : « ‹ Toutes mes setlists » (PU-6) en tête, puis
  l'en-tête de la setlist et la liste des chants (`songEntries`, coche sur le chant en cours).
- Le mode louange reçoit ses chants de la page setlist : `items={stageItems}` et `contents`
  (`src/app/setlists/[id]/SetlistDetailClient.tsx:2574-2610`) ; un chant se charge par `fetchSongAST(slug)`
  (`src/lib/api/songs.ts:12`, `GET /api/song/{slug}`).
- Liste et recherche des chants : `useSongsIndex` (`src/hooks/useSongsIndex.ts`, `/songs-index.json`) et Fuse avec
  `OPTIONS_RECHERCHE_CHANTS` (`src/lib/setlist/bibliotheque.ts:40`), comme la page `/songs`.
- 简谱 : préférence d'appareil `JianpuPref` (`auto | always | never`, `src/lib/jianpu/preference.ts`) et choix du
  responsable par item (`SetlistItem.jianpuSheet`, `src/types/setList.ts:51`) ; `sheetEnabled(pref, itemChoice)`.
- Annotations : un document par `uid__setlistId__pageKey` (`src/lib/firebase/annotations.ts:4`).

## Ce qui se construit

1. **Bouton « Tous les chants »** dans `BarreHaut`, juste à droite de Setlist : icône seule au téléphone, icône et
   « Chants » sur tablette et ordinateur ; nouveau `MenuId` `chants`, qui ouvre le même popover (feuille au
   téléphone) que Setlist, sur l'onglet « Tous les chants ». Sur ordinateur, « / » l'ouvre aussi, champ actif.
2. **Menu Setlist à deux onglets** : sous « ‹ Toutes mes setlists », la commande segmentée « Cette setlist | Tous les
   chants » (zh : « 本歌单 | 全部诗歌 », à relire par l'équipe). « Cette setlist » = le contenu actuel.
3. **Liste « Tous les chants »** : champ de recherche (Fuse, `OPTIONS_RECHERCHE_CHANTS` : titre fr, caractères,
   pinyin) ; sous lui l'interrupteur « Avec 简谱 / Sans » ; lignes titre + pinyin ou artiste + tonalité, marque « 简 »
   sur les chants qui ont un calque ; « Dans la setlist » sur ceux qui y sont déjà ; index au pouce (A à Z, chants
   chinois rangés à la lettre de leur pinyin) au bord droit.
4. **Toucher un chant** : il s'insère juste après le chant en cours (ajout local, voir Q1) et la page va à sa
   première page ; le menu se ferme. Un chant déjà dans la setlist n'est pas inséré : on y va. Un chant déjà ajouté :
   on y va, sans doublon.
5. **Marques d'un chant ajouté** : dans la rangée de points, ses pages sont des points creux (anneau) ; dans « Cette
   setlist », un « + » à la place du numéro et une action « Retirer » (Q2). En tête de « Cette setlist », tant qu'un
   ajout est ouvert : « Revenir à {chant}, page {n} », qui ramène où l'on était avant le premier ajout.
6. **Hors ligne** : seuls les chants dont la réponse `/api/song/{slug}` est en cache s'ouvrent ; les autres restent
   dans la liste, grisés, « Pas sur cet appareil » ; une phrase en tête de liste le dit.
7. **Raccord H8** : un chant ajouté est un item comme les autres ; le point en marge et la bande d'H8 s'y montrent si
   le musicien les a activés. H8 doit donc lire les idées par `songSlug` des items affichés, ajouts compris.

## Décisions déléguées (session planche, 12/11)

- **Interrupteur 简谱** : il règle le choix de l'item ajouté (`jianpuSheet: true | false`), et pour un chant ajouté
  ce choix gagne sur la préférence d'appareil ; sa dernière valeur est mémorisée par appareil (nouvelle clé
  localStorage). Le bouton 简谱 des Options d'affichage, touché sur un chant ajouté, change ce chant et la
  préférence, comme aujourd'hui. Motif : Timothée veut choisir « à l'ouverture » sans changer toute la setlist.
  Défaut : « Avec ».
- **Annoter** est masqué sur un chant ajouté : il n'a pas d'item dans la setlist, donc pas de clé d'annotation
  stable ; les pages des autres chants gardent leurs clés (l'ajout ne décale pas `pageKey`, à vérifier en TC-1).
- **Échap** inchangé : menu, puis mode (pas d'état « visite » dans la piste A).
- **Téléphone** : six boutons ne tiennent pas à 390 px (mesuré sur la planche : 78 px de titre) ; Repères passe en
  tête de la feuille Options, comme Outils aujourd'hui. Barre : Setlist, Chants, Je joue | titre | Options, ✕.
- **Marque « 简 »** sur les lignes des chants qui ont un calque, à `--jianpu-color` (couleur gelée, réutilisée).
- **Libellés** : « Chants » (zh « 诗歌 »), icône lucide `library` ; Setlist garde son libellé actuel.
- **Bouton « Tous les chants » dans un mode louange ouvert hors setlist** : sans objet, le mode louange s'ouvre
  toujours depuis une setlist.

## Tranches (une par session ; tests sur les trois appareils, cinq projets pour l'agencement)

### TC-1 — Liste « Tous les chants », bouton et insertion (M à L)
- **Fichiers** : `BarreHaut.tsx`, `MenuLouange.tsx` (`MenuId` `chants`), `ContenusMenus.tsx` (onglets,
  `ContenuTousLesChants`), `PerformanceMode.tsx` (prop `onJouerChant(slug, avecJianpu)`, ouverture de l'onglet),
  `SetlistDetailClient.tsx` (état `ajoutsLocaux`, `fetchSongAST`, items étendus), `src/lib/jianpu/preference.ts`
  (choix mémorisé), locales fr et zh.
- **Critères** : le bouton ouvre la liste ; la recherche trouve « Lumière du monde » par « lum », 你的同在 par
  « 你的 » et par « ni de » ; « Avec 简谱 » ouvre 你的同在 sur son calque, « Sans » en grille ; le chant arrive après
  le chant en cours et la page y va ; un toucher dans le menu ne tourne jamais la page ; Échap ferme le menu.
- **Tests** : nouvelle `tests/louange-tous-les-chants.spec.ts`, ajoutée à `SPECS_GRAND_ECRAN` (cinq projets), un
  chant FR et un chant ZH ; voisines : `louange-menus`, `louange-barre-titre`, `louange-toutes-setlists`.

### TC-2 — Marques, retrait, retour, hors ligne (M)
- **Fichiers** : `CurseurPage.tsx` (points creux), `ContenusMenus.tsx` (« + », « Retirer », « Revenir à … »),
  `PerformanceMode.tsx` (Annoter masqué sur un ajout), `SetlistDetailClient.tsx` (retrait, liste hors ligne), locales.
- **Critères** : points creux et « + » sur un ajout ; « Retirer » l'enlève et la page revient au chant précédent ;
  « Revenir à … » ramène à la page notée ; hors ligne (contexte Playwright `offline`), un chant non gardé est grisé
  et ne s'ouvre pas ; fermer le mode efface les ajouts.
- **Tests** : la même spec, plus `mode-louange-forscore` (Échap) et `louange-annotations` s'il existe ; fin de lot :
  les specs du lot et des pages qu'il touche, pas la suite complète.

### TC-3 — Raccord H8 (S, après H8)
- Un test : un chant ajouté qui a une idée d'harmonie montre le point en marge et la bande quand le réglage d'H8 est
  allumé. Rien à coder si H8 lit déjà les items par `songSlug` ; sinon le corriger là.

## Questions tranchées

1. **Ajout local** : oui, à cet appareil, le temps du mode louange, effacé à la fermeture (Timothée, 12/11/2026 : « Oui »).
2. **Retrait** : une action « Retirer » (44 px) sur sa ligne dans « Cette setlist », sans glissé (Timothée, 12/11/2026 : « oui »).

3. **Un seul bouton** (Timothée, 12/11/2026, après « L'icône bibliothèque doit ouvrir juste la liste de tous les
   chants […] est-ce que c'est mieux de fusionner les deux icônes ») : pas de bouton « Chants ». Setlist ouvre un menu à
   deux onglets « Cette setlist | Tous les chants », qui se rouvre sur le **dernier onglet utilisé** (mémorisé pour la
   session du mode louange). La barre reste celle d'aujourd'hui, Repères compris au téléphone. **Cela remplace** le
   point 1 de « Ce qui se construit », la décision 2 du § Demande et la décision déléguée « Téléphone » ; en TC-1,
   `BarreHaut.tsx` et `MenuLouange.tsx` ne changent pas (pas de `MenuId` `chants`) ; « / » sur ordinateur ouvre le menu
   sur « Tous les chants », champ actif.

## Avancement

- 12/11/2026 : planche (trois pistes), choix de Timothée (piste A, bouton à part, interrupteur 简谱), spec écrite.
- 12/11/2026, soir : Timothée tranche les questions 1 et 2 (oui) et choisit un seul bouton (Setlist à deux onglets) ;
  plus de question ouverte, le lot attend son go.
- 12/11/2026, soir : **TC-1 faite** (session `session_01UMdfuZmdnz7GpDir59knoe`). Menu Setlist à deux onglets
  (`TousLesChants.tsx`, `useJouerChant.ts`, `ajoutsLocaux.ts` neufs ; dans `PerformanceMode.tsx`, des ajouts groupés et
  le « + » du rond d'en-tête), choix 简谱 à l'ajout plus fort que la préférence (`choixScan`, `blocks.ts`), « / » à
  l'ordinateur. Un chant ajouté prend une position fractionnaire (milieu entre le chant en cours et le suivant) : il
  ne s'écrit nulle part (ni Firestore, ni « Ma version »), et les clés d'annotation des autres chants ne bougent pas
  (`computePageKey` ne lit que les uid de section). Bug trouvé et corrigé : on rejoignait le chant ajouté pendant une
  pagination provisoire, puis la mise en page refaite laissait la page sur le chant suivant ; on attend désormais que
  la mise en page réponde aux blocs (même règle que `chantInitial`). Tests : `louange-tous-les-chants` 37 passés,
  3 ignorés (« / » hors ordinateur), cinq projets, 2,2 min ; voisines (`louange-menus`, `louange-barre-titre`,
  `louange-toutes-setlists`, `mode-louange-forscore`, `louange-roles-jianpu`) 490 passés, 0 échec, trois appareils,
  17 min. Aucun conflit avec AN (AN-2 déjà sur la branche au départ ; H7-2 arrivé en cours, sans recouvrement).
  **Décisions déléguées (session TC-1, 12/11)** : (a) le Crayon est refusé dès TC-1 sur un chant ajouté
  (`chantsCharges` faux) : sans clé d'annotation, ses traits se perdaient en silence ; TC-2 le masque pour de bon ;
  (b) le rond d'en-tête d'un chant ajouté dit « + » (il disait « 1.5 ») ; (c) l'interrupteur porte le libellé
  « Ouvrir » (zh « 打开 ») devant « Avec 简谱 | Sans », pour ne pas se lire comme un filtre de la liste
  (`critique-design`) ; (d) la tonalité de chaque ligne en gras et en noir, sur une colonne fixe, pour ne pas se
  confondre avec l'index A–Z ; (e) l'index se rétrécit pour tenir entier dans la part visible du menu.
  Reste pour plus tard (critique, finition) : fondu au bas de la liste, « Dans la setlist » plus lisible, chant en
  cours marqué dans la liste.
- 12/11/2026, nuit : **TC-2 faite** (session `session_01UMdfudVWocXk16NNnNUmDD`). Points creux (anneaux de 2 px,
  `data-ajout`) sur les pages d'un ajout dans la rangée de points, pleins comme en piste continue ; « Retirer » (44 px,
  bleu, bouton frère de la ligne) dans « Cette setlist », qui ne ferme pas le menu et rend le focus à la ligne d'avant :
  retiré en cours → première page du chant précédent, sinon même chant et même page ; « Revenir à « {chant} », page
  {n} » en tête de « Cette setlist » tant que le chant en cours est un ajout (point noté au premier passage d'un chant
  de la setlist vers un ajout, seulement si l'ajout réussit ; oublié à l'usage ou quand le dernier ajout est retiré) ;
  Crayon masqué par `surAjout` sur la condition `crayonPret`, gestes intacts ; hors ligne (`useChantsHorsLigne.ts`,
  neuf : `navigator.onLine` + `caches.match('/api/song/…')` + chants déjà chargés), lignes non gardées grisées,
  inertes, « Pas sur cet appareil » avec l'icône `CloudOff`, phrase en tête. Logique dans `useJouerChant.ts` ; dans
  `PerformanceMode.tsx`, des ajouts groupés près de ceux de TC-1. Relecture : point de retour posé avant l'échec d'un
  ajout, test « Revenir » qui ne prouvait rien, retrait d'un ajout non courant non testé : corrigés. Critique de
  design : bande de la ligne en cours étendue à « Retirer », colonne des tonalités gardée alignée (place réservée),
  anneaux à 2 px, tonalité des lignes grisées lisible, titre entre guillemets dans « Revenir à » : corrigés.
  Tests : `louange-tous-les-chants` 81 passés, 4 ignorés (« / » et Crayon hors ordinateur/tablette), cinq projets,
  4,5 min ; voisines (`louange-menus`, `louange-barre-titre`, `louange-toutes-setlists`, `mode-louange-forscore`,
  `annotations-forscore`, `louange-roles-jianpu`) 578 passés, 0 échec, trois appareils, 20 min. Un échec isolé du test
  TC-1 « onglets sous Toutes mes setlists » au téléphone, non reproduit dans deux passes suivantes (instable, à
  surveiller). Conflits avec AN : aucun (AN-3b arrivé en cours de tranche, rebase sans recouvrement).
  Reste pour plus tard (finition) : « Ouvrir » ressemble à un troisième segment de la commande « Avec 简谱 | Sans »
  (TC-1 ; le sortir du fond gris), thème sombre et largeur de « 移除 » non regardés. **TC-3 attend H8** : la session
  qui finit H8 la fait (`docs/feuille-de-route.md`, File, point 7).
- 13/11/2026 : **TC-3 faite, lot TC fini** (session de H8). Test « chant ajouté par Tous les chants » dans
  `tests/louange-harmonie.spec.ts` (FR et ZH, trois appareils) : point et bande s'y montrent, réglage allumé ; rien à
  coder, H8 lit les blocs par `songSlug`, ajouts compris.
