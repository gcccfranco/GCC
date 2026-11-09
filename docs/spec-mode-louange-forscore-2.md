# Spec : mode louange façon forScore, apparence comprise (lot AO)

**Statut : spec écrite le 08/11/2026 (session cloud), décisions de Timothée du 07 et du 08/11/2026 reportées,
contre-vérifiée le même jour (trois relecteurs : faits du code, fidélité aux décisions, risque du dimanche) et corrigée ;
go lot par lot.** Rien n'est codé.

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
19. Couleur des icônes : **les six teintes proposées et un cercle chromatique** pour choisir vraiment sa couleur.
20. Q2 à Q5 ci-dessous acceptées telles que proposées ; **sessions en parallèle** pour aller plus vite (Timothée,
    08/11/2026).
14. Bouton **« Je joue »** et **pastille du planning** ; **menu Repères** ; en paysage et sur ordinateur, les **deux
    colonnes actuelles** du site pour le texte.
15. Rôle « Musicien » sans instrument : l'instrument écrit dans la case du Campus (« Piano: … ») ou celui du profil
    (`joue`) s'il n'y en a qu'un, sinon aucune proposition.
16. 简谱 : **au téléphone en portrait, chaque ligne du scan coupée en deux**, lignes entières en paysage ; **tablette en
    paysage, une seule feuille de scan large** ; **ordinateur, une seule feuille plus grande** ; **le début de chaque
    section est noté par scan** ; **choriste et présidence : paroles + pinyin par défaut** sur un chant à scan, le
    简谱 à leur choix.
17. Piste B de la planche : thème clair par défaut, le sombre en option : la disposition Scène suit le thème de
    l'appareil, clair par défaut.
18. **Annotations façon forScore** : lot à part (AN), option (a) — les outils maintenant, sans changer le stockage ;
    l'accrochage des traits à la ligne ou à la section avec la migration de la base ; calques plus tard.
21. **Annotations : piste A « Barre forScore »** de la planche des annotations ; les autres propositions acceptées
    telles quelles : « le doigt ne dessine pas » coupé au départ et allumé au premier trait au stylet, sortie
    automatique après 8 s seulement si l'on est entré au stylet, tourner la page par les côtés et jamais au stylet,
    repères au-dessus de l'encre, « seul » / « tutti » dans la langue de l'interface, cinq préréglages (trois visibles
    au téléphone), barre en haut sur tablette et ordinateur et en bas au téléphone, pas de blanc « correcteur ».
22. **Couleur des stylos au choix de chacun** : chaque préréglage se règle à sa guise (couleur avec les teintes prêtes et
    le cercle chromatique, épaisseur, transparence) ; aucune couleur n'est interdite. Remplace la question des encres.
23. **Couleur personnelle pour toute la barre et les actions** (Timothée, 08/11/2026 : « pour la barre d'outils du mode
    louange aussi, pour les actions et tout, il faut qu'ils puissent choisir leur propre ton de couleur ») : la couleur
    choisie (décision 19) vaut pour tout le chrome du mode louange (icônes, actions des menus, boutons allumés, poignée
    de la rangée de points) et pour la barre d'annotation ; jamais pour la page.
24. **Scans 简谱 sans coupe propre** (十字架, 大手牵着小手, 荣耀至高神) : **découpés eux aussi, à la main**, pour être
    lisibles au téléphone comme les autres (en page entière, leurs chiffres feraient environ 8 px à 390 px de large) :
    barres de mesure placées à l'œil pour 十字架 ; pour les deux autres, chaque ligne porte des **masques** qui cachent,
    dans sa tranche, ce qui appartient à la ligne voisine. Jamais une tranche qui laisse dépasser une ligne voisine
    (Timothée, 08/11/2026 : « fais ce qui est bien selon toi », puis « pour les pages entières, ça dépend du
    responsive ? »).
25. **Section reprise dans une autre tonalité sans être regravée** (« Refrain 2 (G) ») : **gardée dans les repères**,
    elle renvoie à la ligne où sa musique est gravée, et son nom porte la tonalité (même réponse).
26. **Questions de la vague 1, tranchées comme proposé** (Timothée, 09/11/2026 : « pour les questions en attente je
    suis ok avec toi ») : garde-fou de contraste de la couleur personnelle à **4,5:1** (elle sert aussi pour du texte) ;
    au téléphone, **Outils en tête de la feuille Options d'affichage** ; tolérance de **8 px** avant de couper un vers
    (décision 11 gardée) ; un vers français trop long passe sur **trois ou quatre rangées** plutôt que d'écrire plus
    petit ; la marque **`v2` seulement sur les pages où un vers est vraiment coupé** ; les cinq chants dont le `.cho`
    n'a pas les accords du scan se tranchent **plus tard, chant par chant**. FS-E (demi-page) attend toujours un go
    explicite.
27. **Demande : couleur des accords au choix de chacun** (Timothée, 09/11/2026 : « peut être qu'il serait bien de
    pouvoir personnaliser les couleurs des accords pour que chacun ait une couleur qui lui plaise. Faire comme pour les
    autres personnalisation de couleur, mettre un cercle chromatique pour qu'ils mettent la couleur d'accords qu'ils
    souhaitent »). Même geste que la couleur des icônes (FS-A) et des stylos (AN-4) : teintes prêtes et cercle
    chromatique, garde de lisibilité au rendu. **Planche à faire** (`docs/planches/planche-couleur-accords.html`), puis
    spec du lot CA, puis code sur go.
28. **Planche de la couleur des accords acceptée** (Timothée, 09/11/2026 : « je suis ok avec la planche ») : piste A et
    ses quatre recommandations. **Une couleur par langue** (français, chinois) ; elle s'applique dans **les cinq
    dispositions** dès qu'on l'a choisie, et tant qu'on n'a rien choisi chaque disposition garde sa couleur d'origine ;
    une couleur proche de celle d'une section est **acceptée telle quelle** ; **retenue par compte sur l'appareil**,
    comme le rôle et les stylos, et **la couleur des icônes passe aussi par compte** ; en Classique, **l'étiquette, le
    filet et le fond des sections suivent la couleur** choisie. Spec : section « CA » ci-dessous.
29. **La disposition « Repères » s'appelle « Marge »** (Timothée, 09/11/2026 : « ok » à la proposition) : « Repères »
    nommait aussi le bouton signet de la barre (menu des sections, FS-B), et en chinois 段落 et 段落标记 se ressemblaient.
    Libellé seulement : « Marge » / « 页边标记 » (à relire par un responsable sinophone) ; l'identifiant `reperes`, la clé
    de stockage et le suffixe d'annotation `dR` ne changent pas. Le bouton de la barre garde « Repères » / « 段落 ». Dans
    cette spec, « Repères » désigne encore la disposition dans les sections écrites avant (DP-B, CA).

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
   (`src/lib/firebase/annotations.ts:4-6`, `:31-47`) ; seules leurs clés de page peuvent gagner un suffixe.
5. **Quatre dispositions d'écran + 1 440 px**, FR et 中文, clair et sombre, trois appareils pour chaque test, cinq
   projets pour les specs d'agencement (`SPECS_GRAND_ECRAN`).
6. **Tout réglage qui change la mise en page entre dans `signatureAffichage`** (`src/lib/performance/blocks.ts:420-436`)
   sans changer les clés existantes de Classique et de Couleurs par section.
7. Gestes sur les quatre systèmes : tout survol a son équivalent au toucher ; ⌘ sur Apple, Ctrl ailleurs ; cibles de
   44 px au moins.

## Découpage en lots

Ordre proposé : la coupure d'abord (elle sert tout le site et toutes les dispositions), puis les dispositions, puis le
chrome forScore, puis le rôle proposé, puis le 简谱 ; AN après sa planche. Chaque lot, et chaque tranche, se livre seul
et sur go. **Avant chaque go**, l'orchestrateur liste par recherche (`grep` des libellés, sélecteurs et attributs
touchés) les specs Playwright à mettre à jour et les écrit dans la consigne de la tranche ; les sélecteurs du mode
louange passent par un seul helper (`tests/helpers/louange.ts`).

| Lot | Contenu | Taille |
| --- | --- | --- |
| **CV** | Coupure des vers, français et chinois, site entier | M |
| **DP** | Cinq dispositions de partition (DP-A socle et menu, DP-B Repères, DP-C Scène, DP-D Partition) | L |
| **FS** | Chrome forScore du mode louange (FS-A barre et points, FS-B menus et options, FS-C Je joue et rôle par compte, FS-D feuille de route du batteur) | L |
| **RP** | Rôle proposé d'après le planning | S à M |
| **JP** | 简谱 dans le mode louange (JP-A données des scans, JP-B tranches et feuille, JP-C téléphone, JP-D rôles) | L |
| **AN** | Annotations façon forScore (AN-1 enregistrement fiable, AN-2 entrer et sortir, AN-3 barre d'annotation, AN-4 préréglages et couleurs, AN-5 texte, tampons et formes) | L |

### CV — Coupure des vers (site entier)

Aujourd'hui : `src/components/song/ChordLine.tsx` découpe en mots insécables, puis en groupes ouverts par un accord ; la
ligne ne passe à la ligne qu'avant un accord (`:78-91`), par `flex-wrap` (`:134-153`), sans mesure. D'où l'escalier
« Ton / E Nom est tout-puissant » et le mot seul « suivront ». La ligne chinoise (`ZhLine`,
`src/components/song/SongView.tsx:187-348`) pose une colonne par caractère, regroupe ponctuation et lettres latines
avec le caractère précédent (`:228-237`), ouvre une rangée sur chaque accord (`:239-253`), sans notion de mot.

Règle (planche des dispositions, encart « Règle de coupure au téléphone ») ; le débordement de 8 px et le découpage des
mots chinois sont décidés (décision 11), **les autres seuils (40 %, mots d'une ou deux lettres, trois caractères,
0,03 em) sont ceux de la planche, à confirmer à l'essai** :
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
segmentation si l'API manque, plus une **liste d'exceptions par chant**, vérifiée sur tous les chants chinois (194 aujourd'hui) (script en lecture
seule qui liste les mots coupés et sort une planche d'audit, comme `npm run jianpu:audit`). Le pinyin reste apparié
caractère par caractère (`pyWords[pIdx++]`, `SongView.tsx:195-222`) : le regroupement en mots ne change que la coupure,
jamais l'appariement.

Mesure : l'équilibrage demande la largeur de la ligne. Mesure au rendu et au redimensionnement (un `ResizeObserver` par
conteneur de chant, pas par ligne). **La copie de mesure du mode louange et le rendu affiché appellent le même calcul**
(module pur `coupure.ts`, avec la même largeur de colonne : `contentW` en une colonne, la largeur d'une colonne en deux),
sinon la pagination (`PerformanceMode.tsx:600-625`, mesure par bloc) se fonde sur des hauteurs fausses ; un test compare,
pour chaque bloc, la hauteur dans la copie et à l'écran. À une bascule de largeur (rotation, barre latérale), la
coupure se recalcule.

Fichiers : `ChordLine.tsx` (toChunks, rangée d'accords vide `:194-196`, tiret `TiretLiaison :97-118` gardé),
`SongView.tsx` (ZhLine), un module pur nouveau `src/lib/song/coupure.ts` (choix du point de coupure, testable seul),
la liste d'exceptions chinoises (`content/` ou `src/lib/song/`, à trancher par l'exécutant selon le build).

Critères (trois appareils) :
- Au téléphone 390 et 412 px, sur « À jamais Tu es saint » (A) et « 一生爱你 » : aucun mot seul sur une rangée, aucune
  rangée d'accords vide, aucune rangée chinoise de moins de trois caractères, aucun mot de deux caractères coupé ;
  « Ton Nom est le plus grand, / Ton Nom est tout-puissant, » ; « 亲爱的宝贵耶稣， / 你爱何等的甘甜， ».
- Les nouvelles assertions d'agencement (coupure) rejoignent `SPECS_GRAND_ECRAN` : vérifiées aussi en tablette
  paysage et à 1 440 px, où les lignes tiennent en général sur une rangée.
- Les tests existants restent verts : `tests/lignes-chinoises.spec.ts` (orphelins, ponctuation en tête, débordement),
  `tests/page-chant-a6.spec.ts` (tiret), `tests/paroles-sans-accords.spec.ts` (« àLui »), `tests/lignes-accords.spec.ts`,
  `tests/accords-voisins-zh.spec.ts`. `lignes-chinoises` gagne les deux contraintes chinoises ; la passe complète
  `PW_CHANTS_ZH=all` sur tous les chants chinois.
- Aucun débordement de la page à 390 px ; la copie d'une ligne ne contient ni retrait ni tiret.

### DP — Cinq dispositions de partition

Aujourd'hui : un booléen `chart-style` (`src/lib/chartStylePref.ts:5-18`, absence de clé = Couleurs par section), lu
par la page du chant (`SongDetailClient.tsx:278-282`, après montage), la vue partitions
(`_hooks/usePreferencesAffichage.ts:16-30`) et le mode louange (`PerformanceMode.tsx:345`, lecture synchrone), relayé à
`SectionView` qui choisit `getChartSectionStyle` (`SongView.tsx:77`) ou `getSectionStyle` (`:121`). Case à cocher dans
`MenuChant.tsx:10-24` et `MenusSetlist.tsx:66-112`, interrupteur dans les Réglages du mode louange.

**DP-A Socle et menu** (M) :
- `src/lib/dispositionPref.ts` remplace le booléen : `"classique" | "sections" | "reperes" | "scene" | "partition"`.
  Reprise, **une seule fois, à la première lecture** (la valeur dérivée est écrite aussitôt dans la nouvelle clé, avec
  une marque de migration, pour qu'un réglage touché ensuite ne la fasse plus changer) : `chart-style`, sinon l'ancienne
  `perf-chart-style` (`chartStylePref.ts:5-9`) : `"1"` → `sections`, `"0"` → `classique`. **Les deux absentes** : si
  l'appareil porte une autre clé du site, y compris celles posées sans geste (`recentSongs`, `i18nextLng`,
  `perf-barre-vue`, puis `perf-*` hors `perf-chart-style`, `gcc.showPinyin`, `partition-layout`, `jianpu-sheet-pref`,
  `pdf-style`, `barre-laterale`), c'est un appareil déjà utilisé, qui voyait Couleurs par section : il garde `sections` ;
  sinon c'est un appareil neuf : `classique` (décision 9). L'heuristique est approximative (question Q2). Les anciennes
  clés restent en place, en lecture seule.
- Lecture : synchrone dans le mode louange (surcouche rendue côté client seulement, comme aujourd'hui,
  `PerformanceMode.tsx:345`) ; après montage sur la page du chant et la vue partitions (rendues côté serveur).
- Menu à miniatures : dans le menu ⋯ de la page du chant, dans `MenusSetlist` (vue partitions) et dans les options
  d'affichage du mode louange, cinq entrées avec une miniature dessinée de la page (SVG statique ou capture embarquée) et
  le nom ; l'entrée choisie est marquée. Libellés FR / 中文 (clés `dispositions.*`), l'ancienne `performance.chartStyle`
  retirée ; `pdf.choice.colors` intouchée.
- `SectionView` reçoit la disposition ; Classique et Couleurs par section rendent **exactement** comme aujourd'hui
  (captures avant/après au pixel près, hors règle CV).
- Annotations : `signatureAffichage` reçoit la disposition ; `sections` garde `s1`, `classique` reste sans suffixe ;
  `reperes`, `scene`, `partition` ajoutent `dR`, `dS`, `dP` (traits rangés par disposition, décision 10). La
  disposition seule ne change pas les clés des deux existantes ; **la coupure CV, elle, change la composition de
  certaines pages** (voir « Annotations et coupure » plus bas).

**DP-B Repères** (M) : planche des dispositions n° 3. Sigle de la section (I, C1, Pr, R1…) dans une pastille de sa
couleur (`--sec-*`), lettre à l'encre (#0e0e10 en clair) pour le contraste, en blanc sur les pastilles trop foncées pour
l'encre (pont, fin, coda, autre en clair : l'encre y tombe sous 4,5:1, relecture du 09/11/2026), dans une gouttière à gauche ; un filet de
la même couleur descend le long de la section (3 px, 5 px pour refrain, post-refrain et fin) ; plus de rangée
d'intitulé ; « ×2 » sous la pastille, à l'encre ; accords dans la couleur de la langue comme en Classique. Gouttière de
36 px au téléphone (pastille 24 px, filet à 3 px, texte à 6 px du filet), 44 px de case sur tablette. Le nom complet de
la section reste au toucher (et dans le `title`).

**DP-C Scène** (M) : planche forScore, piste B ; suit le thème de l'appareil, clair par défaut (décision 17). Bandes de section pleine largeur, fond teinté
`--sec-*-tint`, grande lettre de section dans une colonne de gauche (lettre à 70 % de la couleur mêlée de noir pour AA),
nom sous la lettre, accords bleus, reprises « ×2 » à côté de la lettre. En sombre : les teintes sombres de la piste B (case « Thème sombre (option) » de la planche).

**DP-D Partition** (M) : planche forScore, piste A. Titre du chant centré en serif (Gelasio, déjà dans `public/fonts`,
à passer en woff2 ; les titres chinois gardent le Kai), « ♩ = 72 » et tonalité à gauche, compositeur en italique à
droite, feuille de route en repères encadrés, chaque section ouverte par son repère encadré (lettres à l'encre, cadre de
la couleur de section) et son nom en casse normale, sections séparées par du blanc. Sur la page du chant, l'en-tête du
site (titre, outils) reste au-dessus : seule la partition prend la disposition.

Critères (DP) : une spec d'agencement `tests/dispositions-partition.spec.ts` ajoutée à `SPECS_GRAND_ECRAN` (cinq
projets) : chaque disposition × page du chant, vue partitions, mode louange ; FR et ZH ; clair et sombre ; captures à
**regarder** ; reprise des anciennes clés (`chart-style` et `perf-chart-style` à 0, 1 ou absentes, avec et sans autres
clés ; appareil vierge → Classique → on pose `gcc.showPinyin` → rechargement → toujours Classique) ; **le texte du mode
louange garde les deux colonnes actuelles en tablette paysage et à 1 440 px** (décision 14) ; choix retenu après
rechargement ; une disposition choisie sur la page du chant se retrouve dans le mode louange ; signature des
annotations : Classique et Couleurs inchangées (test pur de `louange-sections-uniques.spec.ts:816-830` étendu) ;
`tests/lignes-accords.spec.ts:84`, `setlist-deux-volets.spec.ts:174`, `setlist-g.spec.ts:343` mis à jour (libellés du
menu).

### FS — Chrome forScore du mode louange

Aujourd'hui : `BarreHaut.tsx` (titre, tonalité, points, deux colonnes), `BarreBas.tsx` (curseur, Liste des chants,
Réglages, Annoter, ‹ ›, Quitter), Réglages en tiroir vaul (`PerformanceMode.tsx:1370-1641`), `SommaireChants.tsx`
(tiroir gauche), `FeuilleRole.tsx` (tiroir). Icônes `lucide-react`. Aucun composant popover dans `src/components/ui/`.

**FS-A Barre de titre et rangée de points** (M) :
- Barre de titre (piste A) : à gauche **Setlist**, **Repères** (bouton ajouté en FS-B avec son menu), **Je joue** (icône de l'instrument, libellé court sur
  tablette et ordinateur) ; au centre le titre et, dessous, compositeur · tonalité ; à droite **♩ tempo**, **Annoter**
  (connecté et en ligne seulement, condition de `PerformanceMode.tsx:1360` gardée), **Outils**, **Options
  d'affichage**, **✕**. Au téléphone : Setlist, Repères, Je joue | titre | Options, ✕ (Annoter, ♩ et Outils passent dans
  Outils).
- En bas, **seulement la rangée de points** (un point par page de toute la setlist, écart entre deux chants, poignée
  ronde, vignette de la page pendant le glissé) : `CurseurPage.tsx` garde son fonctionnement (rôle `slider`, repères de
  chant, PageUp/PageDown/Espace) et change d'apparence. Plus de « page 1/4 » ni de ‹ ›.
- **Couleur des icônes au choix** (décisions 12 et 19) : réglage par appareil `src/lib/performance/couleurIcones.ts`
  (localStorage) ; **six teintes prêtes** (bleu des accords #3f63cf par défaut, encre #1c1c1e, vert #1f7a5c, violet
  #6d4bc3, framboise #c2185b, gris #636872) **et un cercle chromatique** pour choisir n'importe quelle couleur (teinte
  au tour du cercle, aperçu au centre, luminosité juste dessous ; au toucher comme à la souris, réglable au clavier) ; **garde-fou de
  contraste** : la couleur choisie est éclaircie ou assombrie automatiquement pour garder au moins 4,5:1 (et non 3:1 : « Setlist », « Je joue », « ♩ 94 » sont du texte ; relevé en codant FS-A) contre le fond de
  la barre, en clair comme en sombre, et l'aperçu le montre ; s'applique aux icônes, à la poignée et, avec FS-B, aux actions des menus et aux boutons
  ronds allumés (décision 23) ; jamais à la page.
- Garde-fous : la barre reste sous le bloc `inert` / `aria-hidden` / `opacity` quand elle est masquée
  (`PerformanceMode.tsx:1328-1335`, test `mode-louange-forscore.spec.ts:914-920`) ; ses mesures (`barreHautRef`,
  `barreBasRef`, `:526-535`) continuent d'alimenter le liseré du tempo et l'annotation ; barre masquée à l'ouverture
  sauf la toute première fois (`barreVue.ts`).

**FS-B Menus et options** (M à L) :
- Primitive **popover** : `@radix-ui/react-popover` (même famille que `dropdown-menu`, déjà installé) ou un wrapper
  maison sur `dialog` ; au téléphone, feuille depuis le bas (vaul, déjà installé). Tout popover arrête la propagation
  des pointeurs (`onPointerDown`/`onPointerUp`) et est exclu de `classerGeste` (le conteneur fixe traite les touchers,
  `PerformanceMode.tsx:925-962`, `:1078-1079`). **Un seul état `popoverOuvert`**, lu par les trois gardes (toucher,
  clavier `:880`, Échap) : popover ouvert, un toucher hors du popover le ferme **sans** tourner la page ni basculer la
  barre, les flèches du clavier ne tournent pas la page, Échap ferme le popover puis, au second appui, le mode.
- **Setlist** (remplace `SommaireChants`) : en-tête nom de la setlist, date, nombre de chants ; lignes titre +
  compositeur ou pinyin + tonalité ; chant en cours coché.
- **Repères** : les sections du chant en cours (sigle, nom, page) ; un toucher va à la section.
- **Outils** : tonalité − / + (ronds de 44 px) et « Revenir à X » seulement si la tonalité diffère, capo pour la
  guitare, transitions, plein écran ; raccourcis clavier affichés seulement sur ordinateur ou clavier détecté.
- **Options d'affichage** (remplace le tiroir Réglages) : boutons ronds « Sur la page » (Accords, Pinyin, 简谱,
  Annotations, Demi-page, Deux colonnes), **Disposition** (les cinq, à miniatures, DP-A), A− taille A+, Clair / Sombre,
  Métronome visuel, Couleur des icônes. **Les actions des menus** (« Revenir à X », tonalité − / +, capo, liens) **et les
  boutons ronds allumés prennent la couleur choisie** (décision 23), avec le même garde-fou de contraste. Le dialogue garde le nom accessible « Réglages », ou le helper `ouvrirReglages`
  (`tests/helpers/louange.ts:22-34`) et les specs qui le citent sont mises à jour dans la même tranche : celles qui
  utilisent `ouvrirReglages` ou écrivent « Réglages » en dur pour le mode louange (`coup-d-oeil`, `guide-captures`,
  `jianpu-par-defaut`, `louange-sections-uniques`, `mode-louange-forscore`, `performance-mode`, et, à vérifier,
  `setlist-hors-ligne`, `planning-petit-dej`, `back-office-coupe` ; `agencement-v18-moi` et `pages-en-grand-moi`
  visent la page Moi, pas le mode louange).

**FS-C Je joue et rôle par compte** (M) :
- Popover **Je joue** (remplace `FeuilleRole.tsx`) : cinq rôles en lignes (icône, nom, ce que la vue montre : accords
  et paroles, paroles seules, feuille de route), puis Ordre joué / Sections uniques / Structure seule. À la toute
  première ouverture, il s'ouvre seul avec la phrase « Choisis ce que tu joues, ton compte s'en souviendra. »
- **Rôle retenu par compte sur l'appareil** (décision 6) : clés `perf-role-preset-<uid>` **et `perf-role-asked-<uid>`**
  quand on est connecté (`useAuth()`, `PerformanceMode.tsx:311` ; aujourd'hui `:314`, `:406`, `:421`, `:430`),
  `perf-role-preset` et `perf-role-asked` sinon. La clé d'appareil sert de valeur de départ **au seul premier compte qui
  ouvre le mode sur l'appareil** (marque de migration) ; un second compte n'hérite de rien et voit la phrase d'accueil.
  **`src/lib/partitionLayoutPref.ts:9-15` lit aussi `perf-role-preset`** (Structure seule pour un batteur) : il reçoit
  l'uid et attend le compte avant de lire. La taille annotée (`perf-annot-scale-<setlist>-<slug>`,
  `tailleAnnotee.ts`) passe aussi par compte. Les autres réglages d'affichage (accords, disposition, taille du texte)
  restent par appareil.

**FS-D Feuille de route du batteur** (S à M) : la vue Batteur montre une ligne par section dans l'ordre joué (grand
repère, nom, ×2, nuance en grosse pastille, note de transition), lignes à la hauteur de l'écran ; plus de grands cadres
vides.

**FS-E Demi-page** (M ; ajoutée le 08/11/2026 : le bouton « Demi-page » des options d'affichage n'avait pas de
fonction derrière lui, et Timothée a répondu « faut la coder je pense ») :
- Ce qui existe : pas de bouton, mais l'**aperçu de la page suivante du lot L6** (octobre 2026,
  `docs/spec-mode-louange-forscore.md` § L6 et Q3) : en **tablette portrait seulement**, une bande fixe de 96 px en bas
  montre les premières lignes de la page suivante sous une ligne bleue (`apercuActif`, `PerformanceMode.tsx:554`,
  suffixe `ap` de la clé de page) ; à l'époque, « le vrai demi-tour seulement si l'équipe le réclame après essai ». La
  planche forScore-2 montre la case « Demi-page activée » (filet bleu fin et poignée à trois traits).
- Comportement proposé, **comme forScore** (décision 1) : interrupteur rond « Demi-page » dans les options
  d'affichage, retenu par appareil (`perf-demi-page`, localStorage). Activé, **un tour de page avance d'une demi-page** :
  la moitié haute de l'écran montre déjà le haut de la page suivante, la moitié basse garde la fin de la page en cours,
  séparées par le filet bleu (couleur des icônes) et sa poignée à trois traits ; le tour suivant achève le passage.
  Ainsi on lit la fin d'une page pendant que le début de la suivante est déjà là. Un tour arrière défait d'une
  demi-page. La pagination ne change pas (mêmes pages, mêmes clés d'annotation) : seul l'affichage passe par un état
  intermédiaire. La ligne tombe **entre deux blocs** (jamais au milieu d'une ligne d'accords) : la coupe se cale sur le
  bord de bloc le plus proche de la moitié. Le filet se déplace au doigt (poignée) pour régler la proportion, retenue.
- **Aperçu L6 et demi-page** (relecture du 08/11/2026) : demi-page **coupée**, la tablette portrait garde l'aperçu L6
  tel qu'aujourd'hui ; demi-page **allumée**, l'aperçu L6 se retire (la demi-page montre déjà le haut de la page
  suivante) et la pagination reprend la hauteur de la bande. La clé de page suit l'état réel de l'aperçu (suffixe `ap`
  présent seulement quand la bande est là), donc des traits posés avec l'aperçu ne s'affichent pas en demi-page sur
  la même page ; le bandeau du lot L5 le dit.
- Hors champ : les pages de scan 简谱 (demi-page désactivée dessus, comme aujourd'hui ; JP-B l'ouvre sur les scans,
  ligne entre deux systèmes) ; l'annotation (l'annotation se fait sur une page entière : activer « Annoter » remet la
  page entière).
- Critères : trois appareils + cinq projets pour l'agencement ; avec la demi-page, tour avant = moitié haute de la
  page suivante au-dessus du filet, fin de la page en cours dessous ; second tour = page suivante
  entière ; tour arrière symétrique ; curseur et rangée de points comptent toujours des pages entières ; filet jamais
  sur une ligne de texte (mesure) ; réglage retenu après rechargement ; désactivée sur un scan ; FR et 中文, clair et
  sombre, captures regardées.

Critères (FS) : tous les tests de `tests/mode-louange-forscore.spec.ts` et de `performance-mode.spec.ts` verts après mise
à jour des libellés ; les specs qui lisent l'étiquette « page 1 / N », « Page suivante », « Page précédente » et
« Liste des chants » (`mode-louange-forscore`, `guide-captures`, `rappel-indice`) suivent la nouvelle barre ; le
curseur garde un nom accessible ; nouveaux tests : chaque popover s'ouvre sous son icône et ne tourne jamais la page (toucher à 15 %, 50 %,
85 % dans le popover) ; Échap ferme le popover puis le mode ; barre masquée sans élément focalisable ; palette retenue
après rechargement ; rôle par compte : deux comptes simulés (noms inventés) sur le même appareil gardent chacun leur
rôle, et le second voit la phrase d'accueil ; la vue partitions d'un batteur passe en Structure seule avec la clé par compte. Captures sur les cinq projets,
FR et 中文, clair et sombre, **regardées**.

### RP — Rôle proposé d'après le planning

Selon `docs/chantier-forscore/04-role-suggere.md` (règle, correspondance, risques), avec les décisions 6 et 15 :
- Source : le planning chargé sur la page de la setlist (`SetlistDetailClient.tsx:159-171`, si `BACK_OFFICE` et
  `planningName`). Aujourd'hui la page n'en garde que `datesServies` (date, catégorie, moment) et jette le rôle : la
  tranche garde aussi les rôles (un état de plus, sans second `loadPlanningData`). `findMyServices`
  (`src/lib/planning/names.ts:309`) filtré sur la date, la catégorie et, au Campus, le moment de la setlist, **entrées
  Campus séance et répétition dédoublonnées** (`:349-351`) ; le préfixe d'instrument des cellules Campus lu avant `splitNames` (`:150-158`) ; `joue` en
  repli. Un service, un rôle ; deux rôles pour le même service → aucune proposition.
- Affichage : **si un rôle est déjà retenu et diffère de celui du planning**, la pastille « Planning : Batterie
  aujourd'hui · Passer en vue Batteur ✕ », centrée en haut de la feuille dans la zone centrale, disparaît au premier
  tour de page ; **sans rôle retenu**, pas de pastille : c'est Je joue, ouvert à la première fois, qui porte l'étiquette
  « d'après le planning » sur le rôle du planning. Un planning arrivé après l'ouverture n'affiche que la pastille. Rien ne bascule sans toucher ; accepter = choisir ce rôle (et « Annuler » juste après, une vue
  Batteur posant aussi Structure seule).
- Pas de pastille : sans compte, hors ligne, Sheet en panne (données de secours sans date commune), trimestre non
  publié, sans `planningName`, setlist sans date, catégorie sans planning, quand les
  accords ont été changés sur la page juste avant, quand l'affichage de l'appareil contredit déjà le rôle, quand
  l'appareil a répondu « Aucun ».
- Tranche 2 (plus tard) : paramètre de rôle dans les liens « Pour moi » et « Mes services », lu avant le `replaceState`
  de `useEntreeLouange.ts:19-20`.

Critères : Sheet simulé (`page.route` sur l'origine Google, `serviceWorkers: "block"`), noms inventés ; cas Piano,
Batterie, Cajon, Percussion, Musicien sans instrument, deux rôles le même service, séance et répétition du Campus ;
Sheet qui répond après l'ouverture (pastille, aucun changement de vue) ; jamais de bascule sans toucher ;
trois appareils.

### JP — 简谱 dans le mode louange

Aujourd'hui : une page de scan = une page d'écran (`src/lib/performance/pagination.ts:42`, « un scan ne se coupe pas en
deux », `PageScan.tsx:10-12`), mise à l'échelle de la hauteur (`JianpuSheet.tsx:611-635`) ; au téléphone, le chiffre fait
environ 10 px. Aucune donnée de ligne (système), de barre de mesure ni de début de section dans `public/jianpu/`
(`index.json`, `cadrage.json`, `marges.json`, `chords.json`).

**Règle de lecture (proposition de la planche, à confirmer à l'essai) : jamais un chiffre du 简谱 sous 17 px de hauteur
de chiffre à l'œil.** Un scan ne se rapetisse
pas pour tenir : il se coupe entre deux lignes (au téléphone en portrait, au milieu d'une ligne, sur une barre de
mesure).

**JP-A Données des scans** (M, données certifiées à l'œil) : un script `scripts/jianpu/systemes.py` (sur le modèle de
`cadrage.py` : `propose` puis `certifier`) écrit `public/jianpu/systemes.json` (pour chaque page : les y de début et de
fin de chaque ligne, et les x des barres de mesure de chaque ligne, tirés de `unbarred()`, `segment.py:57-75`, qui les
retire aujourd'hui sans les garder ; une ligne imbriquée dans sa voisine porte en plus des `masques`, rectangles
`[x0, y0, x1, y1]` en pixels image à couvrir dans sa tranche, décision 24) et `public/jianpu/sections.json` (pour chaque chant : la ligne du scan où commence
chaque section du `.cho`). Certification par la planche d'audit (`npm run jianpu:audit <slug>`, rendu réel, à
**regarder**), scan par scan ; tant qu'un scan n'est pas certifié, il garde l'affichage d'aujourd'hui. **Fait en JP-B**
(reporté le 08/11/2026 : la session de JP-A ne touchait pas à `public/sw.js`) : les nouveaux fichiers JSON s'ajoutent à la liste gardée hors ligne pour une setlist (`urlsJianpuAGarder`, `public/sw.js`, qui ne
connaît aujourd'hui que `index.json`, `chords.json`, `cadrage.json`), avec une version dans le JSON vérifiée contre
`index.json`, hors du plafond des 250 entrées ; hors ligne, un scan certifié dont les données manquent retombe sur
l'affichage d'aujourd'hui ; `CACHE` passe à
`gcc-louange-v7` si une stratégie change (`public/sw.js:34`, test `service-worker.spec.ts:110`).

**JP-B Tranches et feuille** (L) : `JianpuSheet` affiche une **tranche** `y0-y1` de la page (le calque décalé de `y0`
comme `cadrage.top` aujourd'hui, `:616-630`, ses coordonnées inchangées ; attributs `data-jianpu-page`,
`data-jianpu-fenetre`, `data-jianpu-label` gardés) ; **chaque tranche a sa propre clé d'annotation** (aujourd'hui un
bloc de scan retombe sur `idx:<indice>` dans `computePageKey`, et plusieurs tranches auraient la même clé) : indice et
`y0` de la tranche dans la clé (`j4-<y0>`), un scan non certifié gardant `j2` / `j3` ; la pagination coupe un scan entre deux lignes selon la hauteur
disponible ; **tête de feuille** sur chaque écran de scan, de la hauteur exacte de la barre (la barre ouverte ne
recouvre jamais une ligne d'accords) : feuille de route de ce dimanche (repères encadrés, « ×2 » dans le repère à
l'encre, Dp en pointillé), ♩ et « 1 = E » (« gravé en E » quand transposé) ; la ligne courante allumée dans la feuille de
route grâce à `sections.json` ; **demi-page** sur les scans (la ligne bleue tombe entre deux lignes) ; **tablette en
paysage : une seule feuille de scan large** ; **ordinateur : une seule feuille plus grande** ; thème sombre par le
filtre d'encre existant ; le menu Repères saute à la ligne de la section ; les **masques** d'une ligne (décision 24)
sont couverts de la couleur du fond de la page, sous le filtre d'encre (donc justes en sombre), et une étiquette du
calque qui tombe dans un masque n'est pas affichée dans cette tranche.

**JP-C Téléphone** (M) : en portrait, chaque ligne du scan coupée en deux sur la barre de mesure la plus proche du
milieu (`systemes.json`), les deux moitiés empilées ; en paysage, lignes entières ; sans coupes certifiées, lignes
entières et la pastille « Tourne le téléphone pour lire le 简谱 en grand ». Ligne de crédit du scan coupée dans les
découpes.

**JP-D Rôles** (S) : choriste et présidence voient **paroles + pinyin** par défaut sur un chant à scan, et peuvent
allumer le 简谱 (bouton « 简谱 » des options, qui vaut pour tous les chants de l'appareil) ; la règle s'ajoute au point
d'appel de `sheetEnabled` (`src/lib/jianpu/preference.ts:30-33`) sans changer D4 (le choix de la personne l'emporte sur
celui du responsable).

Critères (JP) : tous les tests `tests/jianpu-*.spec.ts` verts (dont `jianpu-integration.spec.ts:820-830`, suffixe
`j2`/`j3`, étendu à `j4`) ; deux tranches d'un même scan ne mélangent pas leurs traits ; nouveaux tests (trois appareils, cinq pour l'agencement) :
hauteur de chiffre ≥ 17 px mesurée sur la tranche à 390, 768, 1 024 et 1 440 px ; la barre ouverte ne recouvre aucune
ligne d'accords ; un scan non certifié s'affiche comme aujourd'hui ; transposition : le calque reste aligné sur chaque
tranche ; **planches `npm run jianpu:audit` regardées** pour chaque scan certifié.

### AN — Annotations façon forScore

Planche : `docs/planches/planche-annotations-forscore.html` (artefact, carte 3), **piste A « Barre forScore »**
(décisions 21 à 23). Aujourd'hui : bouton « Annoter » (connecté, setlist qui ne vient pas de la copie hors ligne :
`PerformanceMode.tsx:1360`), barre d'outils fixe dans `AnnotationCanvas.tsx` (514 lignes : loupe, stylo, surligneur,
gomme, trois épaisseurs `SIZES` l.27, sept couleurs `COLORS` l.25, annuler sur 30 états l.118 et l.338, tout effacer) ;
un stylet ne fait rien hors annotation (`PerformanceMode.tsx:910` et `:933`, `if (e.pointerType === "pen") return`) ;
traits vectoriels `{w, h, strokes, rappel?}` (`src/lib/annotations/strokes.ts`), sérialisés dans le champ `strokes` du
document `annotations/{uid}__{setlistId}__{pageKey}` (`src/lib/firebase/annotations.ts`) ; un document par écran, deux
colonnes comprises (suffixe `x2` de la clé, `PerformanceMode.tsx:804`).

**Ce qui ne change pas** (décision 18) : le document, son nom, son champ `strokes` et son enveloppe JSON ; aucune autre
écriture Firestore ; pas de calques ni de partage d'annotations ; les traits restent en pixels d'écran sous la clé de
page (l'accrochage viendra avec la migration). Les nouveautés tiennent dans la liste `strokes` (types d'AN-5, champ
optionnel `alpha` d'AN-4) ou restent sur l'appareil (préréglages, position de la barre, « le doigt ne dessine pas »).

Dépendances : FS-A (barre de titre, réglage de couleur et sélecteur à cercle chromatique), FS-B (popover, état
`popoverOuvert`), DP (traits rangés par disposition), CV (marque `v2`). Vague 3.

**AN-1 Enregistrement fiable** (S) : `saveAnnotation` vérifie `res.ok`, a un délai maximal (`delaiMax`) et ne se tait
plus ; un enregistrement en échec va dans une file locale par compte (effacée à la déconnexion ou au changement de compte,
comme `src/lib/setlist/copieHorsLigne.ts`), renvoyée au retour du réseau ; un petit indicateur « Enregistré » /
« En attente » dans la barre d'annotation. Même document, même format.

**AN-2 Entrer et sortir** (M) :
- **Appui long** n'importe où sur la page (hors barre et popovers) : un anneau se remplit sous le doigt de 200 à
  500 ms ; à 500 ms on entre en annotation ; un toucher rapide ne montre rien. Les gestes acquis (côtés = tourner,
  centre = barre, balayage) ne changent pas. Nouveau geste pur dans `src/lib/performance/gestes.ts`, testé.
- **Stylet** : le trait commence dès que le stylet touche la page (le `return` des lignes 910 et 933 est levé pour ce
  cas) ; le mode annotation s'ouvre avec ce premier trait.
- **« Le doigt ne dessine pas »** : coupé sur un appareil neuf ; s'allume seul au premier trait fait au stylet sur
  l'appareil, avec un avis une seule fois (« Le doigt tourne et zoome, le stylet dessine ») ; interrupteur dans le
  menu ⋯ de la barre ; retenu par appareil (localStorage).
- **Sortir** : « Terminé », Échap ; sortie automatique après 8 s sans toucher **seulement** si l'on est entré au stylet.
- Le bouton Annoter de la barre de titre (FS-A) reste ; l'appui long et le stylet suivent la même condition que lui
  (connecté, pas sur la copie hors ligne) et ne font rien sinon.

**AN-3 Barre d'annotation** (L) :
- Attachée, elle **prend la place de la barre de titre** (même hauteur, même matière opaque, les contenus changent en
  fondu enchaîné, la barre ne bouge pas) sur la tablette et l'ordinateur (ordinateur : capsule centrée dans la colonne
  de lecture de 1 440 px) ; **en bas au téléphone**, avec en haut Annuler, Rétablir · ‹ p. 1/2 › · Terminé.
- Tablette portrait (768 px) : poignée (zone de 44 × 44 px), ‹ ›, Annuler, Rétablir | les cinq préréglages en
  **traits témoins** (le trait qu'on va faire, à sa couleur, son épaisseur et sa transparence) | Gomme, Texte, Tampons
  et formes (un seul menu) | ⋯ (Loupe, « Le doigt ne dessine pas », Modifier les préréglages, Raccourcis, Tout
  effacer…), Terminé. La Loupe sort du menu ⋯ à partir de 1 024 px. Téléphone : trois préréglages, Gomme, Tampons, ⋯.
- **Détacher** par la poignée : suivi 1:1 (capture du pointeur) ; au lâcher, la barre s'accroche au point le plus
  proche (haut, bas, bord gauche, bord droit, en colonne contre un bord latéral, contenus en fondu, sans rotation) ou
  reste libre si on la lâche lentement ; ressort, élastique aux bords ; position retenue par appareil.
  `prefers-reduced-motion` : fondus de 150 ms, pas de ressort.
- **Tourner la page en annotant** : ‹ › de la barre, ← → au clavier, et les côtés : onglets de 44 px aux bords quand
  le doigt dessine, zones latérales habituelles quand il ne dessine pas ; **le stylet ne tourne jamais la page**. La
  page suivante charge ses traits (état « chargement » visible ; rien ne s'enregistre avant la fin du chargement, comme
  aujourd'hui avec `loadAnnotation`). En deux colonnes, le trait va à la feuille sous la pointe, dans le document de
  l'écran.
- **Annuler / Rétablir** par page, historique gardé en changeant de page pendant la séance ; ⌘Z / ⇧⌘Z sur Apple,
  Ctrl+Z / Ctrl+Y ailleurs (les deux combinaisons acceptées partout, libellés selon le système).
- **Tout effacer** (la page) avec confirmation. Bulles d'aide au survol, montrées aussi à l'appui long sur un outil.
- En annotation, les **repères de section passent au-dessus de l'encre** et sont inertes ; l'onglet de page passe
  devant eux (en Scène, il se pose sur la colonne de gauche).

**AN-4 Préréglages et couleurs** (M), décisions 22 et 23 :
- **Cinq préréglages**, chacun réglable à sa guise : outil (stylo ou surligneur), **couleur** (teintes prêtes et le
  cercle chromatique de FS-A ; aucune couleur interdite), **épaisseur** (curseur), **transparence** (curseur). Un
  toucher prend le préréglage ; un second toucher, ou un appui long, ouvre son réglage ; « Modifier les préréglages »
  dans ⋯. Par défaut : Graphite fin (#2b2b2e), Magenta moyen (#b8188c), Vert moyen (#1d7a3e), Surligneur jaune
  (#ffd60a), Graphite épais. Teintes prêtes du réglage : celles-ci, la Menthe (#6ee7a8) et quelques autres ; le blanc
  « correcteur » n'est plus proposé (le cercle le permet toujours).
- Retenus **par compte sur l'appareil** (`annot-prereglages-<uid>`, localStorage), comme le rôle (FS-C) ; rien dans
  Firestore.
- Le trait garde la couleur choisie (champ `color`) ; la transparence va dans un champ optionnel `alpha` du trait
  (absent = rendu d'aujourd'hui : 1 pour le stylo, 0,35 pour le surligneur). Les anciens traits gardent leur couleur.
- **Garde de lisibilité au rendu**, jamais à l'enregistrement : un trait de stylo à moins de 3:1 contre le fond de la
  page est dessiné éclairci ou assombri, même teinte (c'est ce qui rend lisible en sombre un ancien #1a1a1a) ; le
  surligneur a son rendu sombre (fusion « écran », 45 %). Même calcul que le garde-fou de la couleur des icônes.
- **Couleur de la barre** (décision 23) : la barre d'annotation suit la couleur choisie dans FS-A (icônes, ‹ ›,
  Annuler, Rétablir, Terminé, pastille de l'outil actif avec un glyphe à la couleur du fond si le contraste l'exige),
  avec le même garde-fou de 3:1.

**AN-5 Texte, tampons et formes** (M) :
- **Texte** : une note courte tapée, posée là où l'on touche ; police système demi-gras, 17 px à la loupe 100 %,
  liseré de 3 px de la couleur du fond ; déplaçable et modifiable tant qu'on annote ; la gomme l'efface.
- **Tampons** : p, mf, f, ff, crescendo, decrescendo, respiration, point d'orgue, ×2, seul, tutti ; **formes** :
  flèche, cercle, trait. Un seul menu « Tampons et formes » ; sous chaque signe, son sens (piano, mezzo-forte, forte,
  fortissimo, crescendo, decrescendo, respiration, point d'orgue, reprise, solo, tous ensemble ; 中文 : 弱, 中强, 强,
  很强, 渐强, 渐弱, 换气, 延长, 反复, 单独, 全体).
- Enregistrement : formes, soufflets, respiration et point d'orgue sont des traits `pen` ordinaires (aucun type
  nouveau) ; nuances, ×2, seul et tutti sont un élément `{tool: "stamp", kind, points: [[x, y]], size, color}` ; le
  texte est `{tool: "text", text, points: [[x, y]], size, color}`. Une ancienne version (copie en cache du service
  worker) les dessine au pire comme un point, sans planter. Seul et tutti s'affichent dans la langue de l'interface
  (seul, tutti ; 独, 齐) : on enregistre le genre, pas le texte. `drawStrokes`, `strokeHitTest` (gomme),
  `serializeAnnotations` et `deserializeAnnotations` les gèrent ; nouveau `src/lib/annotations/tampons.ts`.
- Glyphes Noto Music U+1D18F à U+1D193, U+1D110 et U+1D112 ajoutés au sous-ensemble (`scripts/build-fonts.py`),
  couverture vérifiée au build ; la police est chargée avant de dessiner sur le canvas.

Critères (AN) : nouvelle spec `tests/annotations-forscore.spec.ts`, ajoutée à `SPECS_GRAND_ECRAN` (cinq projets) :
l'appui long entre en annotation, un toucher rapide non ; un stylet simulé (`pointerType: "pen"`) dessine dès le contact
et ne tourne jamais la page ; « le doigt ne dessine pas » s'allume au premier trait au stylet ; tourner la page en
annotant garde les traits des deux pages ; Annuler / Rétablir ; Échap = Terminé ; un préréglage modifié est retenu après
rechargement, par compte (deux comptes simulés, noms inventés) ; tampon et texte enregistrés dans le même document
(`db.writes` lu après un signe à l'écran) et relus ; un ancien document (sept couleurs, sans `alpha`) s'affiche comme
avant ; un document avec `stamp` et `text` ne fait pas planter la lecture ; aucune écriture hors
`annotations/{uid}__…` ; un enregistrement en échec affiche « En attente » puis part au retour du réseau ; repères
au-dessus de l'encre ; la barre tient à 768 px sans débordement ; la barre et ses actions prennent la couleur choisie.
Tests existants d'annotation verts (`performance-mode`, `mode-louange-forscore`, `jianpu-integration` pour les clés
`j2`, `j3`, `j4`). Captures **regardées** : quatre dispositions + 1 440 px, FR et 中文, clair et sombre, une page
Classique et un scan 简谱. Libellés chinois nouveaux relus par un responsable sinophone avant la mise en ligne. Essai
sur un iPad avec Apple Pencil (pression, paume posée sur l'écran) par Timothée avant la mise en ligne : Playwright ne
le voit pas.

### CA — Couleur des accords au choix de chacun

Planche : `docs/planches/planche-couleur-accords.html` (artefact, carte 4), **piste A** et ses quatre recommandations
(décisions 27 et 28) ; spec contre-vérifiée le 09/11/2026 (trois relecteurs : références, planche, trous).

**Aujourd'hui** : les accords français prennent `--chord-color` (#3f63cf clair, #8fb0ff sombre) par la classe
`.font-chord` (`ChordLine.tsx:338`, `globals.css:459-461`), classe que partagent l'Harmonie (`FicheHarmonie.tsx:236`,
`TexteFiche.tsx:44`, `LecteurCours.tsx:118`, `IdeesSheet.tsx:261`) ; les accords chinois prennent `--jianpu-color`
(#b3261d, #ff7d72) en style en ligne (`ZhLine`, `SongView.tsx:450`). Ces deux variables sont globales (`globals.css:260-261`
et `331-332`) et servent aussi hors de la partition (chiffres `{jianpu:}` par `.font-jianpu`, contour « Montrer » de
l'Harmonie, pastilles de langue de la liste des chants, `langAccent`, badge de tonalité `SongView.tsx:1188` et `:1291`).
Couleurs par section les remplace par la couleur du texte sur chaque section (`getChartSectionStyle`, `SongView.tsx:88-89`) ;
Scène pose `--jianpu-color: var(--chord-color)` sur chaque bande (`SongView.tsx:1051`) ; Partition le posera aussi après
la seconde relecture de DP (point 15 : accords chinois bleus, comme la planche A). En Classique, l'étiquette, le filet et
le fond des sections suivent la langue par `LANG_THEME` (`SongView.tsx:48-58` : `--fr-accent` / `--zh-accent`,
`--*-box-fill`, `--*-box-border`, constantes de `globals.css:282-287` et `350-355`), que lisent aussi Repères (`:969`),
Partition (`:1006`) et Scène (`:1048`). La couleur des icônes (FS-A) est retenue par appareil (`perf-couleur-icones`,
`src/lib/performance/couleurIcones.ts`), corrigée par `garderContraste` contre des constantes de fond (`FOND_CLAIR`,
`FOND_SOMBRE`) et le thème de la scène (`stageTheme`, `PerformanceMode.tsx:516-518`) ; son réglage est un `radiogroup`
qui garde ses flèches (`PerformanceMode.tsx:1992-2011`).

**Ce qui ne change pas** : les variables globales, `.font-chord` et tout ce qui les lit hors de la partition (Harmonie,
liste des chants, badges de tonalité, bouton « Accords », miniatures du menu, contour « Montrer ») ; les chiffres
`{jianpu:}` ; les étiquettes du calque d'un scan 简谱 (encre du scan, ou bleu fixe quand le calque est partiel,
`JianpuSheet.tsx:537`) ; l'éditeur de setlist et ses aperçus (`Bibliotheque.tsx`, `EditLineSheet.tsx`, `ChordPad.tsx`,
`LastPhraseSheet.tsx`), le panneau et la bulle du dictionnaire d'accords (`PanneauAccord.tsx`) ; la feuille de route du
batteur (FS-D, sans accords) ; `JianpuLine.tsx` (inatteignable : `useJianpu` est toujours faux) ; l'export PDF ; les
couleurs de section (`--sec-*`, pastilles de Repères, bandes de Scène, cadres de Partition, et `LANG_THEME` dans ces trois
dispositions) ; la clé des annotations (la couleur ne change pas la mise en page : rien dans `signatureAffichage`) ;
aucune écriture Firestore.

**CA-A Socle** (M) :
- **Stockage** : `src/lib/couleurAccords.ts` (nouveau), `{ fr: string | null, zh: string | null }` (hex normalisé par
  `normaliserHex`, `null` = couleur d'origine), **par compte sur l'appareil** : `accords-couleurs-<uid>` ; sans compte
  (visiteur non connecté), `accords-couleurs`. Lecture et écriture dans un `try/catch` comme `roleCompte.ts` : stockage
  indisponible ou valeur illisible = couleur d'origine, sans exception ; un choix qui ne peut pas s'enregistrer s'applique
  quand même pour la séance.
- **Compte pas encore connu** : `useAuth` démarre sans utilisateur (`loading`, `src/lib/firebase/auth.ts:35-45`). Tant que
  `loading` est vrai, on n'applique que la couleur d'origine et le réglage est grisé : rien ne s'écrit sous une mauvaise
  clé ; à l'arrivée de l'uid, la couleur du compte s'applique avant la peinture suivante. Dans le mode louange, l'uid
  arrive en prop (`PerformanceMode.tsx:353`) : lecture synchrone à l'ouverture. À la déconnexion, les clés restent sur
  l'appareil : le même compte retrouve sa couleur, un autre compte n'en hérite pas.
- **Couleur des icônes par compte** (décision 28) : `perf-couleur-icones-<uid>` ; la clé d'appareil `perf-couleur-icones`
  devient la valeur de départ du **premier compte**, avec la **même marque** que le rôle (`perf-role-migre`) : `migrer` de
  `roleCompte.ts` recopie aussi cette clé, et `estPremierCompte` vaut pour les deux réglages (un seul compte reprend
  l'ancien état de l'appareil ; rien n'étant en ligne, aucun appareil réel ne porte encore la marque). Sans compte, la clé
  d'appareil. Les specs qui lisent ou écrivent `perf-couleur-icones` (`tests/louange-menus.spec.ts:454`, `:507`,
  `tests/louange-barre-titre.spec.ts:48`, `:307`, `:336`, `:363-376`) passent à la clé du compte simulé.
- **Couleur d'origine** (rien de choisi), par disposition : français bleu (`--chord-color`), couleur du texte en Couleurs
  par section ; chinois rouge (`--jianpu-color`) en Classique et Repères, bleu en Scène et Partition, couleur du texte en
  Couleurs par section. C'est le rendu du code une fois la seconde relecture de DP faite.
- **Couleur choisie** : elle remplace la couleur d'origine de sa langue dans **les cinq dispositions**, sur la page du
  chant, la vue partitions et le mode louange, et **l'emporte** sur les surcharges de section (`--chord-color` /
  `--jianpu-color` posées par Couleurs par section et Scène, qui ne servent plus que de repli). Elle se pose en deux
  variables, `--accord-fr` et `--accord-zh`, sur la **racine de `SongView`** (page du chant et vue partitions,
  `SongDetailClient.tsx:478`, `PartitionView.tsx:316` et `:571`) et sur la **racine `data-performance-mode`** du mode
  louange (`PerformanceMode.tsx:1415`, qui porte déjà `--couleur-icones`) ; jamais sur `:root`. Un hook partagé
  `useCouleursAccords(uid, theme, disposition)` rend le style des deux variables. Le span d'accord de `ChordLine` lit
  `color: var(--accord-fr, var(--chord-color))` en style (ou une classe dédiée `.accord-partition`) ; `ZhLine` lit
  `var(--accord-zh, var(--jianpu-color, #b3261d))`. `.font-chord` n'est pas modifiée.
- **Garde de lisibilité au rendu, jamais à l'enregistrement** : **une seule couleur affichée par langue**, calculée une
  fois par thème et par disposition : `garderContraste(choix, fond)` à 4,5:1 (décision 26) contre le **fond le plus
  défavorable** de la disposition, en constantes hex comme `FOND_CLAIR` / `FOND_SOMBRE` : la page (#ffffff, #000000)
  en Classique, Repères, Partition et Couleurs par section ; en Scène, la teinte `--sec-*-tint` la plus sombre du thème
  clair et la plus claire du thème sombre (valeurs de `globals.css:270-280` et `338-348`). Aucun calcul par section.
  Thème : `stageTheme` dans le mode louange, `resolvedTheme` ailleurs ; recalcul quand le thème ou la disposition change.
  L'encre (#1c1c1e) devient la couleur du texte en sombre, comme pour les icônes. Une couleur proche de celle d'une
  section reste telle quelle (décision 28).
- **Classique** (décision 28) : avec une couleur choisie, `getSectionStyle` (`SongView.tsx:138-175`, Classique seulement)
  prend pour accent la couleur affichée de la langue (étiquette, filet) et dérive le fond et la bordure des sections
  pleines et du pont par `color-mix(in srgb, <couleur affichée> X%, <fond de page>)`, X et Y choisis pour que le bleu
  d'origine redonne `--fr-box-fill` / `--fr-box-border` à ± 2 par canal, en clair et en sombre (≈ 15 % et ≈ 30 % en
  clair). La garde se fait contre le fond de la page, jamais contre ce fond dérivé. Sans choix : `LANG_THEME` et ses
  constantes, inchangés. Repères, Scène et Partition gardent `LANG_THEME`.

**CA-B Réglage** (M) :
- Composant `src/components/song/ChoixCouleurAccords.tsx` : rubrique « Couleur des accords » / « 和弦颜色 » **sous la
  rubrique Disposition** dans les trois endroits où se règle l'affichage : options d'affichage du mode louange
  (`PerformanceMode.tsx`, après `ChoixDisposition variante="panneau"`), menu ⋯ de la page du chant (`MenuChant.tsx`),
  réglages d'affichage de la vue partitions (`ReglagesAffichage`, `MenusSetlist.tsx`).
- Deux rangées, « Chants en français » / « 法语歌曲 » et « Chants en chinois » / « 中文歌曲 », chacune un
  `role="radiogroup"` nommé par son libellé (`aria-labelledby`), de **sept pastilles de 44 px**, réparties sur la largeur
  avec **6 px d'écart au moins** (`justify-between`, comme la rangée des icônes) : la pastille d'origine (dessinée avec les
  couleurs qu'elle prend : français bleu / texte, chinois rouge / bleu / texte ; nom « Couleur d'origine (selon la
  disposition) » / « 原色（随排版而定） »), cinq teintes prêtes (encre #1c1c1e, vert #1f7a5c, violet #6d4bc3, framboise
  #c2185b, gris #636872 : celles des icônes sans le bleu, noms repris de `performance.iconColors.*`), puis le bouton
  arc-en-ciel « Autre couleur » / « 其他颜色 » (`performance.iconColors.autre`) qui ouvre `CercleChromatique` (aperçus clair et sombre) **sous la rangée de
  sa langue, un seul cercle ouvert à la fois**. Les pastilles se dessinent corrigées contre la surface du menu, comme
  celles des icônes.
- État : la pastille retenue est marquée (`role="radio"`, `aria-checked`, tabindex itinérant) ; pendant que le cercle est
  ouvert, son bouton est marqué ; une couleur venue du cercle, même égale au bleu d'origine, reste un choix (bouton du
  cercle marqué, valeur hex dans son nom accessible).
- Clavier : flèches ← ↑ → ↓ en boucle dans la rangée, avec `preventDefault` et `stopPropagation` sur le radiogroup comme
  `PerformanceMode.tsx:1996-2008` (les flèches ne tournent pas la page du mode louange) ; dans les menus Radix
  (`MenuChant`, `ReglagesAffichage`), la rubrique n'entre pas dans la navigation du menu (le groupe garde ses flèches, le
  choix ne ferme pas le menu) ; le cercle se règle au pointeur et au clavier (`CercleChromatique.tsx`) ; rien n'est offert
  au survol seul.
- Lien « Couleurs d'origine » / « 恢复原色 », 44 px de haut, grisé tant que rien n'est choisi ; ligne de rétention
  « Retenue pour ce compte sur cet appareil » / « 仅用于此账号，保存在本设备上 » quand un compte est connecté, et
  « Retenue sur cet appareil » / « 仅在本设备上保存 » (clé existante `dispositions.retenue`) sinon. Clés nouvelles dans
  `fr.json` et `zh-CN.json` (titre, deux rangées, pastille d'origine, lien, ligne de rétention du compte),
  libellés chinois relus par un responsable sinophone avant la mise en ligne.
- Largeur : le contenu des trois emplacements fait au moins 344 px (sept pastilles et six écarts) ; au téléphone, le menu ⋯
  et le menu Affichage prennent `min(374 px, 100vw − 16 px)` (planche, mesurée à 390 px) ; quand la place manque (fenêtre
  de 360 px), la rangée passe sur deux lignes, sans réduire les pastilles ; aucun débordement horizontal.
- Un choix fait dans un endroit se retrouve dans les deux autres (même stockage) et s'applique sans rechargement.

Critères (CA) : nouvelle spec `tests/couleur-accords.spec.ts`, ajoutée à `SPECS_GRAND_ECRAN` (`playwright.config.ts:16`,
avec un commentaire de lot comme ses voisines), sur la mécanique de `tests/louange-je-joue.spec.ts` (deux comptes
`signInAs` successifs, `addInitScript` pour poser une clé d'appareil) :
- choisir une teinte dans chacun des trois endroits colore les accords de sa langue (couleur calculée) sur la page du
  chant, la vue partitions et le mode louange, dans les cinq dispositions ; l'autre langue ne bouge pas ;
- sans choix, et après « Couleurs d'origine » : couleurs calculées des accords identiques à celles d'avant le lot, par
  disposition ; en Classique, fonds et bordures de section identiques à ± 2 par canal ;
- comptes : A choisit violet, déconnexion, B (noms inventés) voit les accords d'origine, reconnexion d'A : violet ; sans
  compte, la clé d'appareil ; pendant le chargement de l'authentification, réglage grisé et rien d'écrit ; la couleur des
  icônes passe par compte et la clé d'appareil n'est reprise que par le premier compte (même marque que le rôle) ;
- stockage qui lève (script de test) : aucune exception, couleur d'origine, le choix s'applique pour la séance ; valeur
  illisible dans `accords-couleurs-<uid>` : couleur d'origine ;
- garde : un jaune #ffd60a s'affiche assombri sur page claire et en Scène claire (≥ 4,5:1 contre la teinte la plus
  sombre), tel quel en sombre ; en Classique, l'étiquette et le filet d'une section suivent la couleur ;
- mode louange : mêmes couleurs dans la copie de mesure et à l'écran en deux colonnes, dans les deux moitiés de la
  demi-page (FS-E), et hors ligne (setlist en copie locale, `serviceWorkers: "block"` pour les substituts) ; la feuille de
  route du batteur ne change pas ; les flèches dans une rangée ne tournent pas la page ;
- menus : au clavier, flèches dans la rangée, le menu reste ouvert au choix, Échap ferme d'abord le cercle ; aucun
  débordement horizontal à 360 et 390 px dans les trois emplacements ;
- hors partition, la pastille de langue de la liste des chants, le badge de tonalité, les chiffres `{jianpu:}`, l'Harmonie
  (`.font-chord`) et le calque d'un scan 简谱 (à l'encre et partiel, en bleu) gardent leur couleur ; aucune écriture
  Firestore ; `signatureAffichage` inchangée ;
- specs voisines relancées sur les cinq projets : `louange-menus`, `louange-barre-titre`, `dispositions-partition`,
  `louange-je-joue`, `performance-mode`, `mode-louange-forscore`.
Captures **regardées** : quatre dispositions + 1 440 px (et 360 px pour les menus), FR et 中文, clair et sombre, avec une
couleur choisie et sans.

Dépendances : FS-A (cercle, garde, rangée des icônes), FS-C (`roleCompte.ts` et sa marque), DP et sa seconde relecture
(qui touche `SongView.tsx`, `ChoixDisposition.tsx`, `MenuChant.tsx`, et rend les accords chinois bleus en Partition). Une
session, deux tranches (CA-A puis CA-B).

## Annotations et coupure

Aujourd'hui, un trait est enregistré en pixels de l'écran sous une clé de page faite des sections de la page et de la
signature d'affichage (`blocks.ts:420-436`, `:489-507`) : il est attaché à l'écran, pas au contenu. La coupure CV change
la composition de certaines pages (des vers passent sur deux rangées), donc certaines clés, et des traits posés avant ne
s'afficheront plus sur ces pages. Ils ne sont pas supprimés. Le 13/09/2026, Timothée avait accepté la même conséquence
pour le changement de typographie (« on prévient l'équipe avant », `docs/intent/vision-site.md`). Parade de ce lot :
une marque de version de composition (`v2`) entre dans la signature avec CV ; pour une page dont l'ancienne clé a des
traits et la nouvelle aucun, le bandeau du lot L5 (« Des annotations existent avec l'ancienne mise en page ») s'affiche ;
on prévient l'équipe avant la mise en ligne de CV. La vraie solution (traits accrochés à la ligne ou à la section, comme
sur un PDF fixe) vient avec la migration de la base (décision 18). Enregistrement : `saveAnnotation` ne regarde pas
`res.ok` et avale les erreurs (`annotations.ts:31-47`) ; un trait peut donc se perdre sans rien dire sur un réseau qui
coupe : à corriger dans le lot AN (tranche AN-1), sans changer le format.

## Questions tranchées le 08/11/2026

- **Q1 Palette des icônes** : les six teintes et un cercle chromatique (décision 19).
- **Q2 Appareils sans clé `chart-style`** : oui — un appareil déjà utilisé (une clé du site présente, y compris
  `recentSongs` ou `i18nextLng`) garde Couleurs par section, un appareil vraiment neuf démarre en Classique ; un appareil
  dont le stockage a été vidé passe en Classique.
- **Q3 Traits déjà posés et coupure** : oui — des traits ne s'afficheront plus sur les pages dont la coupure change
  (bandeau, équipe prévenue, rien de supprimé) jusqu'à l'accrochage des traits avec la migration.
- **Q4 Annoter dans une autre orientation** : oui — les traits restent rangés par orientation, le bandeau le dit.
- **Q5 Ordre des lots** : oui, et des sessions en parallèle quand les lots ne touchent pas les mêmes fichiers (voir
  « Méthode »).

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

**Parallélisme** (décision 20) : vague 1 en parallèle, sur des fichiers disjoints — **CV** (`ChordLine.tsx`, `ZhLine`
dans `SongView.tsx`, `src/lib/song/coupure.ts`, tests de lignes), **JP-A** (`scripts/jianpu/`, `public/jianpu/`, données
seulement) et **FS-A + FS-B** (`src/components/performance/*`, chrome et options de `PerformanceMode.tsx`,
`tests/helpers/louange.ts`) ; vague 2 : **DP** (après CV : `SectionView` dans le même fichier que `ZhLine`, et le choix
de disposition dans les options de FS-B), **FS-C + FS-D** puis **RP** (après FS-B), **JP-B** (après JP-A et FS-B) ;
vague 3 : **JP-C**, **JP-D**, **AN**. Toutes les sessions poussent sur la branche de la session avec `git pull --rebase`
avant chaque push (CLAUDE.md) ; trois sessions au plus en même temps (limite de dépense).


Sur go, lot par lot : une session orchestratrice (`create_session`, CLAUDE.md « Coder = une session orchestratrice »)
code la tranche avec `/tranche` (executant → testeur → relecteur), sur la branche de la session ; la conversation
principale relit le diff, **regarde** les captures (quatre dispositions + 1 440 px, FR et 中文, clair et sombre) et
lance `critique-design` après une tranche qui change l'apparence. Un commit par tranche, message en français. Aucun
nom réel de membre dans les tests. Mise en ligne sur ordre de Timothée seulement.

## Avancement

Vague 2 (go de Timothée le 09/11/2026 : « Go, deux sessions à la fois ») : **d'abord DP et FS-C + FS-D + FS-E** en
parallèle, **puis RP et JP-B** ; JP-C, JP-D et AN restent en vague 3, sur un nouveau go.

| Lot | État |
| --- | --- |
| CV | **go le 08/11/2026** (vague 1). **CV-1 fait** (08/11) : module pur `src/lib/song/coupure.ts`, vers français en rangées (`ChordLine.tsx`), un `ResizeObserver` par chant (`LargeurCoupure.tsx`), tests `coupure-pures` et `coupure-vers` (cinq projets). Essai : à 390 px « Ton Nom est le plus grand, / Ton Nom est tout-puissant, » ; à 412 px le vers tient dans les 8 px de R4 et reste sur une rangée. Écart voulu à la planche : un vers français qui ne tient pas en deux rangées passe à trois ou quatre (le corps ne baisse pas seul sur le site). Seuils 40 %, mots courts, 0,03 em gardés. **CV-2 fait** (08/11) : `ZhLine` en rangées par mots (`Intl.Segmenter`, repli sans), rangées d'au moins trois caractères, pinyin toujours apparié caractère par caractère, exceptions par chant `src/lib/song/motsChinois.ts` (2 relevées par l'audit : 心得/得着 dans 大手牵着小手, 人像 dans 爱赢了), audit en lecture seule `npm run coupure:audit` (planche `scripts/coupure-zh-audit/planche.html`, non versionnée) ; passe `PW_CHANTS_ZH=all` verte (1 160 tests) après correction d'un défaut vu à l'essai (accord posé sur une espace : « 释[E2/G#] 放 » cassait le mot). « 亲爱的宝贵耶稣， / 你爱何等的甘甜， » à 390 et 412 px. Le mode louange ne passe pas encore le slug : la segmentation s'y applique, pas les exceptions. **CV-3 fait** (08/11) : la copie de mesure et l'écran posent les mêmes rangées (`ConteneurCoupure` autour des copies et de la page, test qui compare les hauteurs bloc par bloc, après A+ et après rotation) ; la pagination attend que les coupures ne bougent plus (signal `src/lib/song/coupureSignal.ts`). Choix fait en codant : la marque `v2` s'ajoute à la **clé de page** (comme `x2`) et seulement sur une page dont une ligne n'est pas sur une rangée — une page sans ligne coupée a la même composition qu'avant et garde ses traits ; `signatureAffichage` inchangée. Bandeau « Des annotations existent avec l'ancienne mise en page » (`data-alerte-composition`, lecture seule de l'ancienne clé). Vu à l'essai : texte agrandi, la première section d'un chant peut ne plus tenir avec l'en-tête (page qui ne porte que l'en-tête) ; la barre de FS-A y montre déjà le titre du chant. Lot CV codé ; à prévenir l'équipe avant la mise en ligne |
| DP | **go le 09/11/2026** (vague 2, première paire de sessions) ; **lot DP codé le 09/11/2026** : **DP-A** (be00c34) `src/lib/dispositionPref.ts` (cinq dispositions, retenue par appareil, reprise une seule fois de `chart-style` / `perf-chart-style`, appareil neuf en Classique, migration au chargement du module importé par `I18nProvider` pour passer avant les clés posées sans geste), choix à miniatures dans le menu ⋯ du chant, le sous-menu Affichage de la vue partitions et les Options du mode louange (`ChoixDisposition.tsx`, `MiniatureDisposition.tsx`), signature d'annotation : Classique et Couleurs inchangées, `dR` / `dS` / `dP` ; **DP-B Repères** (8948d56 ; sigle blanc sur les pastilles foncées, 4839dea) ; **DP-C Scène** (b02a0e9) ; **DP-D Partition** (d93adcc, Gelasio en woff2) ; **corrections de relecture et finitions** (7c503e1 : les 14 points de la relecture de la vague 2 et les deux critiques de design) ; **finitions après critique** de Scène et Partition (d0b6227). Spec d'agencement `tests/dispositions-partition.spec.ts` (cinq projets) ; copie de mesure et écran comparés dans les cinq dispositions (`tests/louange-coupure.spec.ts`). Choix faits en codant : chaque tranche n'ajoute au menu que sa disposition une fois rendue ; encre du sigle de Repères choisie par couleur (≥ 4,5:1) ; en Scène, accords bleus en chinois aussi (Repères et Partition gardent la couleur de la langue), nom de section caché au téléphone et lisible au toucher de la lettre, bandes de bord à bord (`--marge-bande`, nulle en deux colonnes) ; en Partition, la page du chant garde l'en-tête du site, l'en-tête gravé est compact dans le mode louange ; sections « tag » dans leur couleur `--sec-tag` (aussi en Couleurs par section) ; toucher une pastille de Repères ou la lettre de Scène ne tourne pas la page. Passe de fin de lot (37 specs qui rendent une partition, 2 693 tests, cinq projets) : 2 443 réussis, 232 ignorés, 18 échecs, **aucun dû à DP** (vérifié par bissection) : `look-louange:104`, `jianpu-integration:777` et `:804`, `mode-louange-colonnes:251` déjà rouges avant la vague 2 (en-tête du chant masqué sous la barre ouverte à l'entrée du mode louange) ; `rappel-dp:278` cassé par 744d0c0 (finitions FS-D) ; `accords-toucher:139` est une course. Rien en ligne |
| FS | **go le 08/11/2026 pour FS-A et FS-B** (vague 1) ; **FS-A et FS-B codées** (barre de titre, rangée de points, couleur des icônes + cercle ; menus Setlist, Repères, Outils, Tempo, Options d'affichage ; au téléphone Outils en tête d'Options) ; tests verts sur cinq projets ; FS-C, FS-D et FS-E (demi-page, spec écrite le 08/11/2026) en attente de go ; **go le 09/11/2026 pour FS-C, FS-D et FS-E** (vague 2, première paire de sessions) ; **FS-C, FS-D et FS-E codées le 09/11/2026** : **FS-C** (d348e1c, finitions 731adf0) popover « Je joue » à la place de `FeuilleRole.tsx` (cinq rôles avec ce que la vue montre, « Aucun » comme sixième choix, puis Ordre des sections et Masquer les paroles sortis des Options), ouverture seule à la première entrée avec « Choisis ce que tu joues, ton compte s'en souviendra. », rôle retenu par compte (`src/lib/performance/roleCompte.ts`, `perf-role-preset-<uid>` / `perf-role-asked-<uid>`, marque `perf-role-migre` : seul le premier compte qui ouvre le **mode louange** hérite de la clé d'appareil ; la vue partitions lit sans migrer), taille annotée par compte ; **FS-D** (8482c3c, finitions 744d0c0) feuille de route du batteur (`FeuilleDeRoute.tsx`, `layoutFeuilleDeRoute` à la place de `layoutSong`) : une ligne par section dans l'ordre joué, titre puis « ♩ = tempo · Tonalité » en tête, repère de 64 px à lettre d'encre, nuance en 22 px gras, transition dans la ligne de sa section, le texte grandit avant l'air (×1,6 au plus) puis les lignes s'étirent selon la longueur de leur section (×3 au plus), 880 px au plus sur ordinateur ; clé de page Structure marquée `f2` (bandeau L5 pour les traits posés sur les anciennes cartes) ; **FS-E** (7d183c2, finitions 45ff3ab, corrections c9bfccf) demi-page (`DemiPage.tsx`, `demiPage.ts`, `perf-demi-page`, `perf-demi-page-part`) : interrupteur dans Sur la page, tour avant = haut de la page suivante au-dessus d'un filet de 1,5 px à la couleur personnelle et fin de la page en cours dessous, coupe jamais au milieu d'une rangée, rappel du nom de section à la reprise, poignée en contour à droite (glissé et flèches, une part sans coupe possible est refusée), **en deux colonnes la demi-page avance d'une colonne** (filet vertical dans la gouttière ; un nouveau chant pleine largeur garde la coupe horizontale), désactivée sur les scans 简谱 et en annotation, aperçu L6 retiré quand elle est allumée, traits d'annotation masqués pendant la demi-page ; corrections de relecture f432d02 ; sous-ensemble Source Han Sans régénéré (7c5bad7, `npm run validate` vert) ; tests de l'en-tête lu barre fermée (9eca009). Questions ouvertes dans le compte rendu du 09/11 |
| RP | **go le 09/11/2026** (vague 2, seconde paire de sessions, après FS-C) |
| JP | **go le 08/11/2026 pour JP-A** (vague 1, données seulement) : JP-A1 fait (`scripts/jianpu/systemes.py`, planche `npm run jianpu:audit -- --systemes`, `public/jianpu/systemes.json` : 11 scans du pilote certifiés à l'œil) ; JP-A2 fait (`scripts/jianpu/sections.py`, `public/jianpu/sections.json` : sections des 11 chants du pilote certifiées, 4 corrigées à la main) ; JP-A3 fait (**187 scans sur 190 certifiés à l'œil**, lignes et sections ; 十字架, 大手牵着小手, 荣耀至高神 laissés non certifiés, raisons dans `scripts/jianpu/LOOP.md`) ; **relu le 08/11 : lignes et barres bonnes dans l'ensemble, sections à reprendre** (une trentaine de sections sur la mauvaise ligne ou avec une anacrouse dans le mauvais sens, tempo d'en-tête dans L1 sur 4 scans, étiquettes du calque hors ligne sur 3 scans, certificateur trop permissif) ; **corrections faites** (74014c1 : 20 lignes sur 17 chants, sections de 29 chants ; `systemes.py verifier` 0 refus, `sections.py controle` 0 écart non justifié, 18 exceptions écrites dans LOOP.md ; planches regardées) ; les trois derniers scans découpés à la main (décision 24 révisée ; masques pour 大手牵着小手 et 荣耀至高神) : **190 scans sur 190 certifiés, JP-A terminé** ; JP-B à JP-D en attente de go ; **go le 09/11/2026 pour JP-B** (vague 2, seconde paire de sessions, après DP et FS-E) |
| AN | planche tranchée le 08/11 (piste A, couleurs au choix : décisions 21 à 23), spec écrite ; en attente de go (vague 3, après FS-A, FS-B et DP) |
| CA | demande du 09/11 (décision 27), planche acceptée le 09/11 (décision 28), spec écrite ; en attente de go (après la seconde relecture de DP, qui touche les mêmes fichiers) |
