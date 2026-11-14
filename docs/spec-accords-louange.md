# Spec — toucher un accord partout, 简谱 et mode louange compris

Demande de Timothée (13/11/2026, ses mots) : « Quand il y a le jianpu qui est affiché il faut aussi pouvoir cliquer
et obtenir les idées d'harmonie », puis « quand on touche un accord il faut même en mode louange pouvoir montrer
comment il se joue comme quand on est sur un chant. Donc ça va se chevaucher ».
Statut : **spec, pas de code. Go à recevoir** (Timothée ou pilote). Pas de planche : on réutilise le panneau d'accord
tel qu'il est ; seul change l'endroit où il s'ouvre.

## 1. Constat (état au 13/11, tête `f90a0346`)

- **Page chant et vue Partitions : les accords sont touchables.** `AccordsProvider` actif
  (`src/app/songs/[slug]/SongDetailClient.tsx:532` ; `src/app/setlists/[id]/_components/PartitionView.tsx:219`,
  `actif={!editMode}`). Un accord ouvre le panneau d'accord (`PanneauAccord`, feuille `Drawer` ou bulle).
- **Sur le scan 简谱, les accords du calque le sont aussi, hors retouche** :
  `src/components/jianpu/JianpuSheet.tsx:304` (`accordsTouchables = useOuvrirAccord().actif && !retouchable`),
  `:589` et `:610` (`rendreBoite` pose un `AccordTouchable` sur les étiquettes et les ajouts).
- **Mais sur le scan, le panneau n'a pas de ligne « Ici »** (le chemin vers les idées de la section). La section
  d'un accord se lit au DOM : `src/components/accords/AccordsProvider.tsx:211-213` cherche un ancêtre
  `[data-section-uids]`, que seul le texte du chant porte (`src/components/song/SongView.tsx:1078`, `:1122`,
  `:1180`, `:1215`). Une boîte du scan n'en a pas : `sectionUids` vide, et `LigneIci` ne rend rien
  (`src/components/accords/LigneIci.tsx:61`). « Ensuite » (accord suivant) manque pour la même raison
  (`AccordsProvider.tsx:212`, `accordSuivant` lit la section au DOM).
- **La section d'une ligne du scan est pourtant connue** : `JianpuSheet.tsx:311-321` la retrouve déjà pour les
  étiquettes du rail (JV-5c), par `sections.json` (`useJianpuSections`), `systemes.json` et `passageDeSection`
  (`src/lib/jianpu/etiquettesSections.ts:61`), pour les scans certifiés.
- **Mode louange : accords inertes.** Aucun `AccordsProvider` dans `src/components/performance/` ; le contexte par
  défaut est inactif (`AccordsProvider.tsx:86`, `Rien`, `actif: false`). Seuls le nom de section et l'étiquette du
  rail ouvrent la fenêtre des idées, réglage « Idées d'harmonie » allumé (`src/components/performance/VoletHarmonie.tsx:94-121`,
  `NomsTouchables`, `ScanTouchable` ; ils arrêtent `pointerdown`/`pointerup` pour que la page ne tourne pas).
- **Le toucher tourne la page en louange** : `src/components/performance/PerformanceMode.tsx:1818-1856`
  (`handlePointerUp` : zone latérale → `tourner(±1)`, centre → barre affichée ou cachée ; balayage → page).
- **L'appui long et le stylet ouvrent le Crayon** (`PerformanceMode.tsx:1762-1800`) ; `surPage` exclut déjà
  `[role=button]` (`:1764`), donc un accord touchable (`role="button"`) ne lancerait plus le Crayon à l'appui long.
- **En louange, le Crayon dessine** (canvas d'annotation, `PerformanceMode.tsx:2469-2492`) ; il ne change pas les
  accords. C'est sur la page chant et la vue Partitions que le Crayon change les accords (`retouchable`,
  `JianpuSheet.tsx:301`), et là les accords ne s'ouvrent déjà plus.

## 2. Proposition

1. **Partout, mode louange compris, toucher un accord (scan ou paroles) ouvre le panneau d'accord**, comme sur un
   chant : comment il se joue (instrument, renversements, « Écouter »). Motif : c'est la question qu'on se pose en
   jouant, et le geste est déjà appris sur la page chant ; en louange il manque justement au moment où l'on joue.
2. **Le panneau mène aux idées de sa section par la ligne « Ici »** (existante, H5-2). Sur le scan, la section de
   l'accord se retrouve par sa ligne : `sections.json` + `systemes.json` + `passageDeSection`, comme les étiquettes
   du rail ; la boîte porte alors `data-section-uids` (ou la demande `ouvrir` reçoit `sectionUids`), et « Ici » se
   rend. En louange, « Ici » ouvre la fenêtre des idées (`VoletHarmonieLouange`) au bloc du passage, sans tourner la
   page. Motif : une seule porte vers les idées depuis un accord, la même partout ; c'est le « chevauchement » que
   Timothée annonce, réglé par un chemin (accord → panneau → Ici → idées) plutôt que par deux gestes concurrents.
3. **Le nom et l'étiquette de section restent la porte directe vers les idées** (inchangés).
4. **Conflits en louange, réglés ainsi** :
   - *Tourner la page* : un accord touché ouvre le panneau et ne tourne pas la page (arrêt de propagation, comme
     `NomsTouchables`). Dans les bandes latérales de page (`largeurZoneLaterale`), **le toucher tourne la page même
     sur un accord** : tourner ne doit jamais rater en plein chant (voir Q1). Le balayage tourne toujours.
   - *Toucher hors du panneau* : le ferme, sans tourner la page ni basculer la barre (comme la fenêtre des idées).
   - *Crayon* : en Crayon, les accords sont inertes (`AccordsProvider actif={!annotateMode}`) ; l'appui long sur un
     accord ouvre toujours le Crayon (on retire `[data-accord-touchable]` de l'exclusion de `surPage`) ; le stylet
     n'ouvre jamais le panneau.
   - *Page chant / Partitions en Crayon (retouche)* : inchangé, les accords se modifient, ils ne s'ouvrent pas.

## 3. Questions à trancher (recommandation en premier)

- **Q1. Bandes latérales en louange.** (a) **Recommandé** : la bande latérale tourne la page même sur un accord ;
  l'accord s'ouvre au centre. (b) Un accord s'ouvre partout, la page ne tourne que hors accord (risque : page qui ne
  tourne pas en plein chant). (c) Accords touchables seulement quand la barre est affichée.
- **Q2. Faut-il un réglage pour les accords touchables en louange ?** (a) **Recommandé** : non, toujours actifs (la
  demande dit « même en mode louange » ; rien ne change à l'écran). (b) Les lier au réglage « Idées d'harmonie ».
  (c) Un réglage à part, éteint par défaut.
- **Q3. « Ici » en louange, réglage « Idées d'harmonie » éteint.** (a) **Recommandé** : « Ici » paraît dès qu'on a
  l'accès Harmonie (le réglage ne règle que les noms touchables ; le panneau est déjà une demande explicite).
  Coût : aujourd'hui les `ici` du louange ne sont calculés que réglage allumé (`PerformanceMode.tsx:905`,
  `useIcisDuLouange(…, ideesActives && !annotateMode, …)`) ; il faut les calculer dès l'accès, en gardant les noms
  inertes réglage éteint. (b) « Ici » seulement réglage allumé (rien à changer).
- **Q4. « Ensuite » sur le scan.** (a) **Recommandé** : absent sur le scan dans cette spec (l'ordre des accords d'une
  ligne de scan n'est pas lu aujourd'hui) ; à ajouter plus tard si on le demande. (b) Le calculer depuis le calque.
- **Q5. Scan non certifié (pas de `sections.json`).** (a) **Recommandé** : panneau sans « Ici », comme aujourd'hui.
  (b) Pas d'accord touchable du tout.

## 4. Tranches

- **AL-1 — « Ici » sur le scan (page chant, Partitions).** `JianpuSheet.tsx` : section de chaque boîte touchable par
  sa ligne (même calcul que `etiquettes`), passée au panneau ; « Ici » se rend. Tests : `accords-toucher`,
  `harmonie-jianpu` (accord du scan → « Ici » → volet au bloc de la section), FR et ZH. ⚠ La session des pastilles du
  rail touche le même fichier : ajouts courts, après elle.
- **AL-2 — Accords touchables en louange.** `PerformanceMode.tsx` : `AccordsProvider actif={!annotateMode}` autour
  des pages ; arrêt de propagation sur `[data-accord-touchable]` hors bandes latérales (Q1) ; appui long → Crayon ;
  « Ici » → `VoletHarmonieLouange`. Tests : nouvelle spec `louange-accords.spec.ts` (paroles et scan ; toucher au
  centre ouvre le panneau sans tourner ; bande latérale tourne ; hors panneau ferme sans tourner ; Crayon inerte ;
  appui long → Crayon ; FR et ZH), ajoutée à `SPECS_GRAND_ECRAN`, cinq projets ; voisines `louange-harmonie`,
  `mode-louange-forscore`. Après MT-3 (même fichier).

## 5. Avancement

- 13/11/2026 : spec écrite (session lancée par la session des Finitions JV). Attend le go.
- 14/11/2026 : **go de Timothée** (« go », en citant les cinq réponses recommandées) : Q1 (a) les bandes latérales
  tournent la page même sur un accord ; Q2 (a) aucun réglage ; Q3 (a) « Ici » dès l'accès Harmonie ; Q4 (a) pas
  d'« Ensuite » sur le scan ; Q5 (a) scan non certifié : panneau sans « Ici ». Le go vaut pour AL-1 et AL-2. AL-1
  part quand la session des pastilles du rail a fini (`JianpuSheet.tsx`) ; AL-2 quand MT-3 a fini
  (`PerformanceMode.tsx`), avant RU-5 ou après, jamais en même temps.
- 14/11/2026 : **AL-1 fait** (commit ci-dessous, « AL-1 : « Ici » sur le scan 简谱 »). La section d'un accord du scan se
  déduit de sa ligne (`sectionDeLaBoite`, `JianpuSheet.tsx`, même calcul que les pastilles du rail) et part dans la
  demande `ouvrir` (`sectionUids`) ; « Ici » se rend sans « Ensuite » (Q4) ; sans étiquettes (scan non certifié, sans
  accès Harmonie, retouche) : pas d'« Ici » (Q5). Correctif : `ChantDesAccords` joint son `chant` à la demande (vue
  Partitions : « Ici » n'avait pas de slug) ; effet de bord assumé : les accords des paroles en Partitions gagnent
  aussi « Ici » et « Signaler » visent le chant. Tests : `harmonie-jianpu` (4 tests AL-1, FR et ZH, cinq projets),
  `accords-toucher`, `harmonie-porte1`, `harmonie-volet-section` : 9,4 min ; puis AL-1 seuls après correction, 20/20
  en 55 s. `tsc` et `lint` propres. Captures du panneau (FR, 中文, cinq projets) regardées. Non vérifié : le cas
  scan non certifié (Q5) n'a pas de test propre ; les accords hors de tout intervalle de ligne ou ajoutés (`ajout-`)
  n'ont pas d'« Ici » (non testé) ; le calque n'existe que transposé, donc « Ici » sur le scan aussi ; `harmonie-porte1`
  ZH (ordinateur) a échoué à la première passe puis passé seul (course probable). Hors tranche, signalé : en 中文, le
  sous-titre de l'idée sous « 这里 » reste en français (« Le 2m7 à la place du 4 », `harmonie-index.json`).
- 14/11/2026 : **AL-2 fait** (commits « AL-2 (en cours) » `3283dedd` et « AL-2 : finitions »). En louange,
  `AccordsProvider actif={!annotateMode} louange` entoure le mode (panneau en `z-[10000]`). Un accord touché au centre
  ouvre le panneau sans tourner la page ni basculer la barre ; dans une bande latérale le toucher tourne la page et le
  click de l'accord est bloqué (`bloquerBande`, `VoletHarmonie.tsx` ; pas au clavier) ; toucher hors du panneau le ferme
  sans tourner (`menuAuToucher`) ; Crayon : accords inertes ; appui long sur un accord → Crayon. « Ici » dès l'accès
  Harmonie (Q3) : `ChantDesAccords sansNoms` garde noms et pastilles du rail inertes réglage éteint (`iciAccords`,
  `useIciDesAccords`), la place du rail n'est réservée que réglage allumé. Tests : nouvelle `louange-accords.spec.ts`
  (cinq projets, `SPECS_GRAND_ECRAN`) ; `accords-toucher:233` remis au comportement AL-2 ; `louange-harmonie` ouvre le
  réglage par Outils (reste de RU-5) ; helper `toucherCentre` (`tests/helpers/louange.ts`) évite un accord au centre.
  Durée : passe du workflow 8,3 + 5,0 min ; passe finale `louange-accords`, `louange-menus`, `accords-toucher:233`
  sur cinq projets 19,7 min (330 passés, 16 ignorés, 2 rouges à 1 440 px rejoués seuls : `louange-menus:309` passe,
  `louange-menus:449` dure 28 à 32 s **aussi sans AL-2**, à la limite de 30 s : instable, hors tranche). `tsc`, `lint`
  propres. Captures FR, 中文, scan aux cinq projets triées par `regard`. Non vérifié : `harmonie-jianpu` et
  `mode-louange-forscore` non relancées ; les 17 specs qui touchent le centre de la page par `mouse.click` (hors helper)
  peuvent tomber sur un accord (la suite complète le dira) ; appui long tactile réel et stylet non testés ; capo sur scan
  certifié non testé. Constaté : sur ordinateur, la bulle n'a pas la place au-dessus ni au-dessous (720 à 900 px de
  haut) et se pose sans flèche sur l'accord touché (placement existant de `Bulle`, comme sur la page chant).
