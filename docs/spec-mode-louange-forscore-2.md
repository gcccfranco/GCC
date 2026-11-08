# Spec : mode louange façon forScore, apparence comprise (lot AO)

**Statut : spec écrite le 08/11/2026 (session cloud), décisions de Timothée du 07 et du 08/11/2026 reportées ; à relire,
puis go lot par lot.** Rien n'est codé.

Pièces :
- planches (artefact unique https://claude.ai/artifact/AuYFVmjUN6UAZhUVxBHBr8) :
  - `docs/planches/planche-mode-louange-forscore-2.html` : barre et menus façon forScore, pistes A, B, C, partie
    « 简谱 dans le mode louange » ;
  - `docs/planches/planche-dispositions-partition.html` : dispositions de partition, règle de coupure au téléphone ;
  - `docs/planches/planche-mode-louange-paroles-site.html` : paroles du site sous la barre forScore ;
- études : `docs/chantier-forscore/01-releve-forscore.md` (forScore, sourcé), `04-role-suggere.md` (rôle proposé
  d'après le planning) ;
- spec précédente du chantier : `docs/spec-mode-louange-forscore.md` (L0 à L7 : les gestes, faits le 26/10/2026) ;
- feuille de route § 3.AO.

## Contexte et demande

Timothée, 07/11/2026 : « j'aime pas le mode louange, je trouve qu'il ressemble pas assez à forScore alors que je t'avais
[dit] de faire tout comme forScore, de la navigation à l'apparence etc. ; l'UI du mode louange est bof, que ce soit la
vue des musiciens ou autre. En gros tout le mode louange. » La vue des musiciens = les vues par rôle du mode louange.

Le chantier d'octobre n'avait repris de forScore que les gestes (zones de toucher, barre à la demande, « Ensuite »,
curseur, tempo) et gardé l'apparence du site. Cette demande rouvre **toute l'apparence du mode louange**. Puis, le
même soir et le lendemain, elle s'est étendue aux **dispositions de partition du site entier** (« on va mettre 3-4 types
que les gens peuvent choisir sur le site »), avec un premier critère : **« les partitions doivent être lisibles, on
doit pouvoir bien voir la structure des chants et tout »**.

## Décisions de Timothée

Du 07/11/2026 :
1. Le mode louange **ressemble à forScore**, navigation et apparence : barre de titre à commandes, menus en petites
   fenêtres sous leur icône, rangée de points en bas, options d'affichage en boutons ronds (piste A de la planche).
2. La page du mode louange garde **les paroles du site** sous cette barre, pas la « partition imprimée » de la piste A
   seule (planche « paroles du site », Q1).
3. Le mode louange **suit le réglage d'affichage du site** : un seul réglage partagé par la page du chant, la vue
   partitions de la setlist et le mode louange (c'est déjà le cas pour « Couleurs par section »,
   `src/lib/chartStylePref.ts`).
4. Les **pastilles de structure** restent en tête de chant ; le menu Repères les reprend.
5. Le **chinois reste rouge** dans la disposition Classique.
6. **Rôle proposé d'après le planning, jamais imposé** ; cajon, Cajon/Batterie et Percussion → vue Batteur ; **un
   service, un rôle** (plusieurs services le même jour sont dans des lieux différents) ; **rôle retenu par compte** sur
   un appareil partagé.
7. **Réglages synchronisés entre appareils : reportés** après la migration de la base hors de Firebase. **Rien de
   nouveau n'est écrit dans Firestore** par ce lot.

Du 08/11/2026 :
8. **Cinq dispositions au menu**, avec une miniature de la page à côté de chaque nom : **Classique** (l'actuelle
   « Bleu »), **Couleurs par section** (l'actuelle), **Repères** (repères en marge), **Scène** (bandes de section de la
   piste B, thème clair) et **Partition** (page gravée de la piste A). Écartées : Bandeaux, Grille, Une section par
   écran, Pour chanter, Recueil.
9. Un **appareil neuf** démarre en **Classique**.
10. Le choix se fait dans les **options d'affichage du mode louange** et dans le **menu ⋯ de la page du chant** ; la vue
    partitions suit ; **retenu par appareil**. Les traits d'annotation sont rangés **par disposition**.
11. **Règle de coupure des vers corrigée** pour toutes les dispositions, français et chinois (« corrige ça d'abord »),
    avec un **débordement de 8 px** avant de couper ; mots chinois de deux caractères par **découpage automatique +
    liste d'exceptions vérifiée**.
12. **Couleur des icônes de la barre au choix de chacun, dans une palette.**
13. **Pas de sépia** pour l'instant.
14. Bouton **« Je joue »** et **pastille du planning** ; **menu Repères** ; en paysage et sur ordinateur, les **deux
    colonnes actuelles** du site pour le texte.
15. Rôle « Musicien » sans instrument : l'instrument écrit dans la case du Campus (« Piano: … ») ou celui du profil
    (`joue`) s'il n'y en a qu'un, sinon aucune proposition.
16. 简谱 : **au téléphone en portrait, chaque ligne du scan coupée en deux**, lignes entières en paysage ; **tablette en
    paysage, une seule feuille de scan large** ; **ordinateur, une seule feuille plus grande** ; **le début de chaque
    section est noté par scan** ; **choriste et présidence : paroles + pinyin par défaut** sur un chant à scan, le
    简谱 à leur choix.
17. Piste B de la planche : thème clair par défaut (n'a d'effet que sur la disposition Scène, claire).

## Ce qui change, ce qui reste gelé

Rouvert par cette demande : tout le chrome du mode louange (barres, menus, réglages, choix du rôle), la disposition des
paroles sur le site entier (page du chant, vue partitions, mode louange), la coupure des vers, l'affichage des scans 简谱
dans le mode louange (pas l'intérieur du calque).

Restent gelés : couleurs des accords (`--chord-color` #3f63cf / #8fb0ff), des sections (`--sec-*`) et du 简谱
(`--jianpu-color`) — une disposition choisit où et combien de couleur elle met, pas les teintes ; l'intérieur du calque
简谱 et les calques certifiés ; **le PDF** (il ne lit pas `chartStylePref`, ses styles viennent de `pdfStylePref`,
`src/lib/pdfStylePref.ts:7`, et ses clés `pdf.choice.*` ne bougent pas) ; le logo ; les gestes acquis d'octobre (zones
30/40/30, balayage, `gestes.ts`) ; les permissions (aucune).

## Principes

1. **Le dimanche ne casse jamais** : chaque lot se livre seul, et rien ne bascule sous les yeux d'un musicien sans
   geste de sa part (rôle proposé, jamais appliqué seul).
2. **Lisible et structure visible d'abord** : tout choix se juge à la lecture de loin au pupitre et à la vue de la
   structure (début et type de chaque section, reprises, où l'on en est).
3. **Un seul réglage d'affichage, partagé** par la page du chant, la vue partitions et le mode louange, **par appareil**
   (localStorage, try/catch, comme `pinyinPref.ts`).
4. **Aucune écriture Firestore nouvelle** (migration de la base en cours). Les annotations gardent leur stockage
   (`src/lib/firebase/annotations.ts:6-8`, `:31-47`) ; seules leurs clés de page peuvent gagner un suffixe.
5. **Quatre dispositions d'écran + 1 440 px**, FR et 中文, clair et sombre, trois appareils pour chaque test, cinq
   projets pour les specs d'agencement (`SPECS_GRAND_ECRAN`).
6. **Tout réglage qui change la mise en page entre dans `signatureAffichage`** (`src/lib/performance/blocks.ts:420-436`)
   sans changer les clés existantes de Classique et de Couleurs par section.
7. Gestes sur les quatre systèmes : tout survol a son équivalent au toucher ; ⌘ sur Apple, Ctrl ailleurs ; cibles de
   44 px au moins.

## Découpage en lots

Ordre proposé : la coupure d'abord (elle sert tout le site et toutes les dispositions), puis les dispositions, puis le
chrome forScore, puis le rôle proposé, puis le 简谱. Chaque lot, et chaque tranche, se livre seul et sur go.

| Lot | Contenu | Taille |
| --- | --- | --- |
| **CV** | Coupure des vers, français et chinois, site entier | M |
| **DP** | Cinq dispositions de partition (DP-A socle et menu, DP-B Repères, DP-C Scène, DP-D Partition) | L |
| **FS** | Chrome forScore du mode louange (FS-A barre et points, FS-B menus et options, FS-C Je joue et rôle par compte, FS-D feuille de route du batteur) | L |
| **RP** | Rôle proposé d'après le planning | S à M |
| **JP** | 简谱 dans le mode louange (JP-A données des scans, JP-B tranches et feuille, JP-C téléphone, JP-D rôles) | L |

### CV — Coupure des vers (site entier)

Aujourd'hui : `src/components/song/ChordLine.tsx` découpe en mots insécables, puis en groupes ouverts par un accord ; la
ligne ne passe à la ligne qu'avant un accord (`:78-91`), par `flex-wrap` (`:134-153`), sans mesure. D'où l'escalier
« Ton / E Nom est tout-puissant » et le mot seul « suivront ». La ligne chinoise (`ZhLine`,
`src/components/song/SongView.tsx:187-352`) pose une colonne par caractère, regroupe ponctuation et lettres latines
avec le caractère précédent (`:226-241`), ouvre une rangée sur chaque accord (`:243-262`), sans notion de mot.

Règle (planche des dispositions, encart « Règle de coupure au téléphone ») :
- **R1** Une ligne qui ne tient pas se coupe en **deux rangées équilibrées** (la plus courte fait au moins 40 % de la
  plus longue), de préférence juste après une ponctuation (`, ; : ! ?` et `，。；：！？、`), sinon entre deux mots ;
  jamais au milieu d'un mot ; jamais une rangée d'un seul mot ; **pas de coupure juste après un mot d'une ou deux
  lettres** (un, le, la, les, à, de, ce, ma, ta, sa, je, tu, il). En chinois, plusieurs rangées sont permises quand
  deux ne suffisent pas, **jamais une rangée de moins de trois caractères** (ponctuation comprise), **jamais entre les
  deux caractères d'un mot**.
- **R2** Chaque accord reste au-dessus de sa syllabe (de son caractère). La rangée de suite peut commencer par des mots
  sans accord : sa rangée d'accords se replie si elle est vide. Une ligne d'accords sans paroles n'a pas de rangée de
  paroles (ni de pinyin) vide dessous.
- **R3** Une fin de ligne faite d'accords sans paroles (« Asus4 A ») peut déborder dans la marge droite plutôt que de
  couper le vers.
- **R4** Avant de couper, une ligne peut **déborder de 8 px** dans la marge droite ; au-delà, si elle dépasse de 5 %
  au plus, on **resserre l'interlettrage** (au plus 0,03 em, jamais les espaces ni la taille du texte).
- **R5** La rangée de suite est en **retrait de 1 em**.

Mots chinois : `Intl.Segmenter("zh-CN", { granularity: "word" })` (absent de `src/` aujourd'hui) avec repli sans
segmentation si l'API manque, plus une **liste d'exceptions par chant**, vérifiée sur les 188 chants (script en lecture
seule qui liste les mots coupés et sort une planche d'audit, comme `npm run jianpu:audit`). Le pinyin reste apparié
caractère par caractère (`pyWords[pIdx++]`, `SongView.tsx:195-222`) : le regroupement en mots ne change que la coupure,
jamais l'appariement.

Mesure : l'équilibrage demande la largeur de la ligne. Mesure au rendu et au redimensionnement (un `ResizeObserver` par
conteneur de chant, pas par ligne), hors de la copie de mesure du mode louange ; la pagination du mode louange mesure
déjà les blocs entiers (`PerformanceMode.tsx:600-625`) et absorbe la nouvelle hauteur sans changement.

Fichiers : `ChordLine.tsx` (toChunks, rangée d'accords vide `:194-196`, tiret `TiretLiaison :97-118` gardé),
`SongView.tsx` (ZhLine), un module pur nouveau `src/lib/song/coupure.ts` (choix du point de coupure, testable seul),
la liste d'exceptions chinoises (`content/` ou `src/lib/song/`, à trancher par l'exécutant selon le build).

Critères (trois appareils) :
- Au téléphone 390 et 412 px, sur « À jamais Tu es saint » (A) et « 一生爱你 » : aucun mot seul sur une rangée, aucune
  rangée d'accords vide, aucune rangée chinoise de moins de trois caractères, aucun mot de deux caractères coupé ;
  « Ton Nom est le plus grand, / Ton Nom est tout-puissant, » ; « 亲爱的宝贵耶稣， / 你爱何等的甘甜， ».
- Les tests existants restent verts : `tests/lignes-chinoises.spec.ts` (orphelins, ponctuation en tête, débordement),
  `tests/page-chant-a6.spec.ts` (tiret), `tests/paroles-sans-accords.spec.ts` (« àLui »), `tests/lignes-accords.spec.ts`,
  `tests/accords-voisins-zh.spec.ts`. `lignes-chinoises` gagne les deux contraintes chinoises ; la passe complète
  `PW_CHANTS_ZH=all` sur les 188 chants.
- Aucun débordement de la page à 390 px ; la copie d'une ligne ne contient ni retrait ni tiret.

### DP — Cinq dispositions de partition

Aujourd'hui : un booléen `chart-style` (`src/lib/chartStylePref.ts:5-18`, absence de clé = Couleurs par section), lu
par la page du chant (`SongDetailClient.tsx:278-282`, après montage), la vue partitions
(`_hooks/usePreferencesAffichage.ts:16-30`) et le mode louange (`PerformanceMode.tsx:345`, lecture synchrone), relayé à
`SectionView` qui choisit `getChartSectionStyle` (`SongView.tsx:77`) ou `getSectionStyle` (`:121`). Case à cocher dans
`MenuChant.tsx:10-24` et `MenusSetlist.tsx:66-112`, interrupteur dans les Réglages du mode louange.

**DP-A Socle et menu** (M) :
- `src/lib/dispositionPref.ts` remplace le booléen : `"classique" | "sections" | "reperes" | "scene" | "partition"`.
  Reprise : `chart-style = "1"` → `sections`, `"0"` → `classique`. **Clé absente** : si l'appareil porte déjà une autre
  clé du site (`perf-*`, `gcc.showPinyin`, `partition-layout`, `jianpu-sheet-pref`, `pdf-style`, `barre-laterale`),
  c'est un appareil déjà utilisé, qui voyait Couleurs par section : il garde `sections` ; sinon c'est un appareil neuf :
  `classique` (décision 9). Écriture de la nouvelle clé, l'ancienne laissée en place (lecture seule).
- Lecture après montage partout (le mode louange aussi, comme la page du chant) pour éviter un écart d'hydratation.
- Menu à miniatures : dans le menu ⋯ de la page du chant, dans `MenusSetlist` (vue partitions) et dans les options
  d'affichage du mode louange, cinq entrées avec une miniature dessinée de la page (SVG statique ou capture embarquée) et
  le nom ; l'entrée choisie est marquée. Libellés FR / 中文 (clés `dispositions.*`), l'ancienne `performance.chartStyle`
  retirée ; `pdf.choice.colors` intouchée.
- `SectionView` reçoit la disposition ; Classique et Couleurs par section rendent **exactement** comme aujourd'hui
  (captures avant/après au pixel près, hors règle CV).
- Annotations : `signatureAffichage` reçoit la disposition ; `sections` garde `s1`, `classique` reste sans suffixe ;
  `reperes`, `scene`, `partition` ajoutent `dR`, `dS`, `dP` (traits rangés par disposition, décision 10). Aucun repli
  `cleAncienne` (`hooks/useAnnotationsPage.ts:42-45`) nécessaire pour les deux existantes, puisque leurs clés ne
  changent pas.

**DP-B Repères** (M) : planche des dispositions n° 3. Sigle de la section (I, C1, Pr, R1…) dans une pastille de sa
couleur (`--sec-*`), lettre à l'encre (#0e0e10 en clair) pour le contraste, dans une gouttière à gauche ; un filet de
la même couleur descend le long de la section (3 px, 5 px pour refrain, post-refrain et fin) ; plus de rangée
d'intitulé ; « ×2 » sous la pastille, à l'encre ; accords dans la couleur de la langue comme en Classique. Gouttière de
36 px au téléphone (pastille 24 px, filet à 3 px, texte à 6 px du filet), 44 px de case sur tablette. Le nom complet de
la section reste au toucher (et dans le `title`).

**DP-C Scène** (M) : planche forScore, piste B, page en thème clair. Bandes de section pleine largeur, fond teinté
`--sec-*-tint`, grande lettre de section dans une colonne de gauche (lettre à 70 % de la couleur mêlée de noir pour AA),
nom sous la lettre, accords bleus, reprises « ×2 » à côté de la lettre. En sombre : les teintes sombres de la piste B.

**DP-D Partition** (M) : planche forScore, piste A. Titre du chant centré en serif (Gelasio, déjà dans `public/fonts`,
à passer en woff2 ; les titres chinois gardent le Kai), « ♩ = 72 » et tonalité à gauche, compositeur en italique à
droite, feuille de route en repères encadrés, chaque section ouverte par son repère encadré (lettres à l'encre, cadre de
la couleur de section) et son nom en casse normale, sections séparées par du blanc. Sur la page du chant, l'en-tête du
site (titre, outils) reste au-dessus : seule la partition prend la disposition.

Critères (DP) : une spec d'agencement `tests/dispositions-partition.spec.ts` ajoutée à `SPECS_GRAND_ECRAN` (cinq
projets) : chaque disposition × page du chant, vue partitions, mode louange ; FR et ZH ; clair et sombre ; captures à
**regarder** ; reprise des anciennes clés (`chart-style` 0/1/absente avec et sans autres clés) ; choix retenu après
rechargement ; une disposition choisie sur la page du chant se retrouve dans le mode louange ; signature des
annotations : Classique et Couleurs inchangées (test pur de `louange-sections-uniques.spec.ts:816-830` étendu) ;
`tests/lignes-accords.spec.ts:84`, `setlist-deux-volets.spec.ts:174`, `setlist-g.spec.ts:343` mis à jour (libellés du
menu).

### FS — Chrome forScore du mode louange

Aujourd'hui : `BarreHaut.tsx` (titre, tonalité, points, deux colonnes), `BarreBas.tsx` (curseur, Liste des chants,
Réglages, Annoter, ‹ ›, Quitter), Réglages en tiroir vaul (`PerformanceMode.tsx:1370-1641`), `SommaireChants.tsx`
(tiroir gauche), `FeuilleRole.tsx` (tiroir). Icônes `lucide-react`. Aucun composant popover dans `src/components/ui/`.

**FS-A Barre de titre et rangée de points** (M) :
- Barre de titre (piste A) : à gauche **Setlist**, **Repères**, **Je joue** (icône de l'instrument, libellé court sur
  tablette et ordinateur) ; au centre le titre et, dessous, compositeur · tonalité ; à droite **♩ tempo**, **Annoter**
  (connecté et en ligne seulement, condition de `PerformanceMode.tsx:1360` gardée), **Outils**, **Options
  d'affichage**, **✕**. Au téléphone : Setlist, Repères, Je joue | titre | Options, ✕ (Annoter, ♩ et Outils passent dans
  Outils).
- En bas, **seulement la rangée de points** (un point par page de toute la setlist, écart entre deux chants, poignée
  ronde, vignette de la page pendant le glissé) : `CurseurPage.tsx` garde son fonctionnement (rôle `slider`, repères de
  chant, PageUp/PageDown/Espace) et change d'apparence. Plus de « page 1/4 » ni de ‹ ›.
- **Couleur des icônes au choix** (décision 12) : palette par appareil `src/lib/performance/couleurIcones.ts`
  (localStorage) ; six teintes proposées (question Q1 ci-dessous), défaut le bleu des accords ; s'applique aux icônes et
  à la poignée, jamais à la page.
- Garde-fous : la barre reste sous le bloc `inert` / `aria-hidden` / `opacity` quand elle est masquée
  (`PerformanceMode.tsx:1266-1274`, test `mode-louange-forscore.spec.ts:914-920`) ; ses mesures (`barreHautRef`,
  `barreBasRef`, `:526-535`) continuent d'alimenter le liseré du tempo et l'annotation ; barre masquée à l'ouverture
  sauf la toute première fois (`barreVue.ts`).

**FS-B Menus et options** (M à L) :
- Primitive **popover** : `@radix-ui/react-popover` (même famille que `dropdown-menu`, déjà installé) ou un wrapper
  maison sur `dialog` ; au téléphone, feuille depuis le bas (vaul, déjà installé). Tout popover arrête la propagation
  des pointeurs (`onPointerDown`/`onPointerUp`) et est exclu de `classerGeste` (le conteneur fixe traite les touchers,
  `PerformanceMode.tsx:925-962`, `:1078-1079`).
- **Setlist** (remplace `SommaireChants`) : en-tête nom de la setlist, date, nombre de chants ; lignes titre +
  compositeur ou pinyin + tonalité ; chant en cours coché.
- **Repères** : les sections du chant en cours (sigle, nom, page) ; un toucher va à la section.
- **Outils** : tonalité − / + (ronds de 44 px) et « Revenir à X » seulement si la tonalité diffère, capo pour la
  guitare, transitions, plein écran ; raccourcis clavier affichés seulement sur ordinateur ou clavier détecté.
- **Options d'affichage** (remplace le tiroir Réglages) : boutons ronds « Sur la page » (Accords, Pinyin, 简谱,
  Annotations, Demi-page, Deux colonnes), **Disposition** (les cinq, à miniatures, DP-A), A− taille A+, Clair / Sombre,
  Métronome visuel, Couleur des icônes. Le dialogue garde le nom accessible « Réglages » ou le helper `ouvrirReglages`
  (`tests/helpers/louange.ts:22-34`) et les douze specs qui le citent sont mises à jour dans la même tranche.

**FS-C Je joue et rôle par compte** (M) :
- Popover **Je joue** (remplace `FeuilleRole.tsx`) : cinq rôles en lignes (icône, nom, ce que la vue montre : accords
  et paroles, paroles seules, feuille de route), puis Ordre joué / Sections uniques / Structure seule. À la toute
  première ouverture, il s'ouvre seul avec la phrase « Choisis ce que tu joues, ton compte s'en souviendra. »
- **Rôle retenu par compte sur l'appareil** (décision 6) : clé `perf-role-preset-<uid>` quand on est connecté
  (`useAuth()`, `PerformanceMode.tsx:311`), `perf-role-preset` sinon ; au premier passage d'un compte, la clé d'appareil
  sert de valeur de départ. **`src/lib/partitionLayoutPref.ts:9-15` lit aussi `perf-role-preset`** (Structure seule pour
  un batteur) : il lit la même clé par compte.

**FS-D Feuille de route du batteur** (S à M) : la vue Batteur montre une ligne par section dans l'ordre joué (grand
repère, nom, ×2, nuance en grosse pastille, note de transition), lignes à la hauteur de l'écran ; plus de grands cadres
vides.

Critères (FS) : `tests/mode-louange-forscore.spec.ts` (54 tests) et `performance-mode.spec.ts` verts après mise à jour
des libellés ; nouveaux tests : chaque popover s'ouvre sous son icône et ne tourne jamais la page (toucher à 15 %, 50 %,
85 % dans le popover) ; Échap ferme le popover puis le mode ; barre masquée sans élément focalisable ; palette retenue
après rechargement ; rôle par compte : deux comptes simulés (noms inventés) sur le même appareil gardent chacun leur
rôle ; la vue partitions d'un batteur passe en Structure seule avec la clé par compte. Captures sur les cinq projets,
FR et 中文, clair et sombre, **regardées**.

### RP — Rôle proposé d'après le planning

Selon `docs/chantier-forscore/04-role-suggere.md` (règle, correspondance, risques), avec les décisions 6 et 15 :
- Source : le planning déjà chargé sur la page de la setlist (`SetlistDetailClient.tsx:159-171`, si `BACK_OFFICE` et
  `planningName`) ; `findMyServices` (`src/lib/planning/names.ts:309`) filtré sur la date, la catégorie et, au Campus,
  le moment de la setlist ; le préfixe d'instrument des cellules Campus lu avant `splitNames` (`:150-158`) ; `joue` en
  repli. Un service, un rôle ; deux rôles pour le même service → aucune proposition.
- Affichage : la pastille « Planning : Batterie aujourd'hui · Passer en vue Batteur ✕ », centrée en haut de la feuille
  dans la zone centrale, disparaît au premier tour de page ; dans Je joue, l'étiquette « d'après le planning » sur le
  rôle du planning. Rien ne bascule sans toucher ; accepter = choisir ce rôle (et « Annuler » juste après, une vue
  Batteur posant aussi Structure seule).
- Pas de pastille : sans compte, hors ligne, sans `planningName`, setlist sans date, catégorie sans planning, quand les
  accords ont été changés sur la page juste avant, quand l'affichage de l'appareil contredit déjà le rôle, quand
  l'appareil a répondu « Aucun ».
- Tranche 2 (plus tard) : paramètre de rôle dans les liens « Pour moi » et « Mes services », lu avant le `replaceState`
  de `useEntreeLouange.ts:19-20`.

Critères : Sheet simulé (`page.route` sur l'origine Google, `serviceWorkers: "block"`), noms inventés ; cas Piano,
Batterie, Cajon, Percussion, Musicien sans instrument, deux rôles le même service ; jamais de bascule sans toucher ;
trois appareils.

### JP — 简谱 dans le mode louange

Aujourd'hui : une page de scan = une page d'écran (`src/lib/performance/pagination.ts:42`, « un scan ne se coupe pas en
deux », `PageScan.tsx:6-7`), mise à l'échelle de la hauteur (`JianpuSheet.tsx:611-635`) ; au téléphone, le chiffre fait
environ 10 px. Aucune donnée de ligne (système), de barre de mesure ni de début de section dans `public/jianpu/`
(`index.json`, `cadrage.json`, `marges.json`, `chords.json`).

**Règle de lecture : jamais un chiffre du 简谱 sous 17 px de hauteur de chiffre à l'œil.** Un scan ne se rapetisse
pas pour tenir : il se coupe entre deux lignes (au téléphone en portrait, au milieu d'une ligne, sur une barre de
mesure).

**JP-A Données des scans** (M, données certifiées à l'œil) : un script `scripts/jianpu/systemes.py` (sur le modèle de
`cadrage.py` : `propose` puis `certifier`) écrit `public/jianpu/systemes.json` (pour chaque page : les y de début et de
fin de chaque ligne, et les x des barres de mesure de chaque ligne, tirés de `unbarred()`, `segment.py:57-75`, qui les
retire aujourd'hui sans les garder) et `public/jianpu/sections.json` (pour chaque chant : la ligne du scan où commence
chaque section du `.cho`). Certification par la planche d'audit (`npm run jianpu:audit <slug>`, rendu réel, à
**regarder**), scan par scan ; tant qu'un scan n'est pas certifié, il garde l'affichage d'aujourd'hui. Les nouveaux
fichiers JSON passent par la stratégie du service worker pour `/jianpu/*` (à vérifier) ; `CACHE` passe à
`gcc-louange-v7` si une stratégie change (`public/sw.js:34`, test `service-worker.spec.ts:110`).

**JP-B Tranches et feuille** (L) : `JianpuSheet` affiche une **tranche** `y0-y1` de la page (le calque décalé de `y0`
comme `cadrage.top` aujourd'hui, `:616-630`, ses coordonnées inchangées ; attributs `data-jianpu-page`,
`data-jianpu-fenetre`, `data-jianpu-label` gardés) ; la pagination coupe un scan entre deux lignes selon la hauteur
disponible ; **tête de feuille** sur chaque écran de scan, de la hauteur exacte de la barre (la barre ouverte ne
recouvre jamais une ligne d'accords) : feuille de route de ce dimanche (repères encadrés, « ×2 » dans le repère à
l'encre, Dp en pointillé), ♩ et « 1 = E » (« gravé en E » quand transposé) ; la ligne courante allumée dans la feuille de
route grâce à `sections.json` ; **demi-page** sur les scans (la ligne bleue tombe entre deux lignes) ; **tablette en
paysage : une seule feuille de scan large** ; **ordinateur : une seule feuille plus grande** ; thème sombre par le
filtre d'encre existant ; le menu Repères saute à la ligne de la section.

**JP-C Téléphone** (M) : en portrait, chaque ligne du scan coupée en deux sur la barre de mesure la plus proche du
milieu (`systemes.json`), les deux moitiés empilées ; en paysage, lignes entières ; sans coupes certifiées, lignes
entières et la pastille « Tourne le téléphone pour lire le 简谱 en grand ». Ligne de crédit du scan coupée dans les
découpes.

**JP-D Rôles** (S) : choriste et présidence voient **paroles + pinyin** par défaut sur un chant à scan, et peuvent
allumer le 简谱 (bouton « 简谱 » des options, qui vaut pour tous les chants de l'appareil) ; la règle s'ajoute au point
d'appel de `sheetEnabled` (`src/lib/jianpu/preference.ts:27-31`) sans changer D4 (le choix de la personne l'emporte sur
celui du responsable).

Critères (JP) : les 79 tests `tests/jianpu-*.spec.ts` verts ; nouveaux tests (trois appareils, cinq pour l'agencement) :
hauteur de chiffre ≥ 17 px mesurée sur la tranche à 390, 768, 1 024 et 1 440 px ; la barre ouverte ne recouvre aucune
ligne d'accords ; un scan non certifié s'affiche comme aujourd'hui ; transposition : le calque reste aligné sur chaque
tranche ; **planches `npm run jianpu:audit` regardées** pour chaque scan certifié.

## Questions encore ouvertes (avec proposition)

- **Q1 Palette des icônes** : six teintes — bleu des accords #3f63cf (défaut), encre #1c1c1e, vert #1f7a5c, violet
  #6d4bc3, framboise #c2185b, gris #636872 ; en sombre, leurs versions claires. Proposition : celles-ci.
- **Q2 Appareils sans clé `chart-style`** : un appareil déjà utilisé (autres clés du site présentes) garde Couleurs par
  section, un appareil vraiment neuf démarre en Classique. Proposition : oui (sinon, des musiciens qui n'ont jamais
  touché ce réglage verraient leur page changer du jour au lendemain).
- **Q3 Ordre des lots** : CV, puis DP, puis FS, puis RP, puis JP. Proposition : celui-ci ; JP-A (données des scans)
  peut commencer en parallèle, il ne touche pas au site.

## Hors périmètre

Sépia ; réglages synchronisés entre appareils (après la migration de la base) ; Cue (pages partagées) ; pédalier ;
son ; bibliothèque de partitions ; liens et boutons sur la page ; recadrage ; dispositions écartées (Bandeaux, Grille,
Une section par écran, Pour chanter, Recueil) ; le PDF.

## Risques

| Risque | Parade |
| --- | --- |
| Des traits d'annotation ne s'affichent plus là où on les attend | Classique et Couleurs gardent leurs clés ; les nouvelles dispositions ont leur suffixe ; la coupure CV change la composition des pages, donc certaines clés : prévenir l'équipe avant la mise en ligne de CV et de DP ; aucun trait supprimé |
| Coupure chinoise fausse (mot mal reconnu) | Liste d'exceptions par chant, vérifiée sur les 188 chants par une planche d'audit ; repli sans segmentation si `Intl.Segmenter` manque |
| Coût de mesure de la coupure | Mesure par conteneur, au rendu et au redimensionnement seulement ; pas dans la copie de mesure du mode louange |
| Popover qui tourne la page | Arrêt de propagation sur tout popover, test par popover |
| Coupe d'un scan au milieu d'une portée | Données certifiées à l'œil scan par scan ; non certifié = affichage actuel |
| Hydratation (lecture synchrone de la préférence dans le mode louange) | Lecture après montage partout |
| Base de données en migration | Aucune écriture Firestore nouvelle ; annotations au même format |
| Service worker qui sert l'ancien code | HTML en réseau d'abord ; incrémenter `gcc-louange-vN` si une stratégie change |
| `PerformanceMode.tsx` (1 655 lignes) | Chaque tranche extrait ses morceaux (`src/components/performance/`, `src/lib/performance/`) |

## Méthode

Sur go, lot par lot : une session orchestratrice (`create_session`, CLAUDE.md « Coder = une session orchestratrice »)
code la tranche avec `/tranche` (executant → testeur → relecteur), sur la branche de la session ; la conversation
principale relit le diff, **regarde** les captures (quatre dispositions + 1 440 px, FR et 中文, clair et sombre) et
lance `critique-design` après une tranche qui change l'apparence. Un commit par tranche, message en français. Aucun
nom réel de membre dans les tests. Mise en ligne sur ordre de Timothée seulement.

## Avancement

| Lot | État |
| --- | --- |
| CV | spec écrite, en attente de go |
| DP | spec écrite, en attente de go |
| FS | spec écrite, en attente de go |
| RP | spec écrite, en attente de go |
| JP | spec écrite, en attente de go |
