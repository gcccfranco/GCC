# Audit du corpus `.cho` — état au 26/09/2026

> **Ce que ce rapport est / n'est pas**
>
> - C'est un **constat** : les écarts entre dix `.cho` et leur partition, mesurés
>   en coordonnées (points PDF ou pixels du scan), plus les anomalies
>   d'inventaire relevées sur les 371 chants par grep et script. Chaque écart est
>   donné avec sa ligne, sa mesure et une correction proposée.
> - **Aucune correction n'a été faite.** Aucun `.cho`, aucune source de
>   `../Partitions/`, aucun fichier du site n'a été modifié. Les corrections sont
>   à faire par Timothée, ou par un chantier de correction distinct, sur go.
> - Ce n'est pas la règle : les règles sont dans `01-format-cho.md` et
>   `02-placement-accords.md` (chantier `docs/spec-guidelines-cho.md`, 40 questions
>   tranchées le 26/09/2026). Les corrections proposées ici appliquent ces
>   décisions ; là où elles ne suffisent pas, la ligne dit « à trancher ».
> - L'outil qui rejouera ces mesures est `scripts/cho/check.py` (à venir). Son
>   critère de succès est de retrouver les écarts de ce rapport sans faux positif
>   sur les placements déclarés exacts.

Version lisible sur téléphone : https://claude.ai/artifact/XxPedHAxLUC4qaysLQmWyH (même contenu, régénérée depuis ce fichier).

Chants audités : fr à couche texte `abba-pere`, `oceans`, `yahwe`, `tu-es-bon` ;
zh scannés `一粒麦子`, `我们的神`, `安静` ; zh vectoriels `只要有你在我左右`,
`荣耀的呼召` ; fr scanné `au-nom-de-jesus` — dix chants, treize couples `.cho` ↔
source (`abba-pere`, `yahwe` et `tu-es-bon` ont chacun deux PDF, église et
shir.fr). Rapports sources dans le scratchpad (§ 5).

## 1. Synthèse chiffrée

> **Décision de Timothée du 26/09/2026 au soir, postérieure aux mesures** : un
> accord « équivalent » (même syllabe que la partition, autre caractère :
> `mo[A]i` écrit `[A]moi`, `pou[A]ssière` écrit `[A]poussière`) doit être
> **exactement comme la partition**, au caractère près. Les 19 équivalents fr
> et les formes voisines des tableaux ci-dessous sont donc des corrections à
> faire, pas des tolérances ; `scripts/cho/check.py` les classe désormais
> « décalé » et dit devant quel caractère la partition pose l'accord. Les
> taux « exacts + équivalents » restent ceux de la mesure d'origine.


| Famille de source | Chants | Accords comparés | Exacts | Équivalents | Exacts + équivalents | Écarts nets |
|---|---|---|---|---|---|---|
| fr, PDF à couche texte (rendus ChordPro : église FPDF, shir.fr) | abba-pere, oceans, yahwe, tu-es-bon | 205 | 176 (85,9 %) | 19 (même syllabe, autre caractère) | 195 (95,1 %) | 2 décalés d'une syllabe · 1 nom d'accord faux · 3 inventés (absents du PDF) · 4 absents du .cho (arrangement shir.fr) |
| zh, scans 简谱 (calque `public/jianpu/chords.json`) | 一粒麦子, 我们的神, 安静 | 123 | 116 (94,3 %) | 4 (syncopes liées) | 120 (97,6 %) | 3 décalés (tous dans 一粒麦子) · 1 optionnel omis · 2 structures non dépliées |
| zh, PDF vectoriels (exports Finale) | 只要有你在我左右, 荣耀的呼召 | 77 | 67 | 5 (levées / tenues conformes à la règle) | 72 (93,5 %) | 2 décalés · 1 accord absent · 2 noms simplifiés (Bb pour Bb/C) |
| fr, scan Word aligné par espaces | au-nom-de-jesus | 40 | 0 | 4 ambigus (Fin) | 0 à 4 (0–10 %) | 36 sur un autre segment : deux conventions de placement, à trancher à l'oreille |

Lecture des classes : **exact** = accord sur le même caractère (fr), la même
note ou le même chiffre (zh) ; **équivalent** = même syllabe chantée, ou forme
prévue par la règle (levée `[X] `, tenue après la syllabe, syncope liée) ;
**décalé** = autre syllabe ou autre caractère ; **inventé** = accord sans source ;
**forme** = sans effet musical (espaces, pinyin, libellés, ponctuation).

Ce que les mesures ont établi sur les sources elles-mêmes :

- Les PDF fr de l'église (« Église Protestante Chinoise de Paris © », FPDF) et
  ceux de shir.fr sont des **rendus ChordPro** : l'accord est à 0,0–0,3 pt du
  caractère tapé, sur les 205 accords. Ils mesurent la frappe du transcripteur,
  pas une position musicale : le seul critère utile est la syllabe.
- Les PDF zh vectoriels (赞美之泉, Finale) posent l'accord sur la tête de note
  à 0,2 pt et le caractère sous la note à moins de 1 pt : source la plus précise
  du corpus.
- Sur les scans zh, `chords.json` donne la boîte exacte de chaque étiquette
  (jamais plus d'un pixel d'écart sur 12 crops vérifiés) ; l'étiquette est à
  −8…+6 px du chiffre du jianpu. Il ne manque que la position des caractères.

## 2. Écarts par chant audité

Unités : points PDF (page 595 × 842, origine en haut à gauche) pour les fr à
couche texte ; pixels du `public/jianpu/<slug>-p1.webp` pour les scans zh ;
points (612 × 792) pour les Finale ; pixels de l'image 1208 × 1712 pour le scan fr.
`x` = bord gauche de l'accord ; `d` = écart avec le bord gauche du caractère
porteur. Les lignes exactes ne sont pas listées : les comptes les couvrent.

### 2.1 `abba-pere.cho` (A) ↔ `Abba Père.pdf` (FPDF église, 07/01/2023)

79 comparaisons : 76 exacts, 1 nom d'accord faux, 2 inventés. Paroles : 24
lignes identiques mot à mot. Structure : même ordre, rien d'omis.

| Ligne | Contenu actuel | Mesure (PDF) | Classe | Correction proposée |
|---|---|---|---|---|
| 41 | `le [D]sang et la su[D]eur` | p2 y=58,6 : **A** @x=306,0 sur « su‹e›ur » ; shir.fr (`Abba Père (A).pdf`) : A @343,3 aussi | **nom d'accord faux** | `le [D]sang et la su[A]eur` |
| 44 | `je pou[A]rrais T'aim[A]er` | p2 y=160,6 : F#m@68,5 · D@177,0 · A@294,8 seulement ; shir.fr idem (F#m@70,2 · D@191,8 · A@321,2) | **inventé** | `je pourrais T'aim[A]er` (comme l.21, 22, 43) |
| 27 | `je [E]suis à Toi.[(A)]` | y=532,0 : D@87,2 · E@146,8 · F#m@211,7 · Bm@265,9 · E@325,5 — aucun A dans les deux PDF | inventé (optionnel sans source) | retirer `[(A)]` ; ou le garder si l'équipe le joue, avec un commentaire qui le dit |
| 9 | `[F#m] [D] [A]` (Intro) | p1 y=88,3 : « F#m D A **(x2)** » | structure : reprise perdue | `{start_of_intro: Intro (x2)}` (le « (x2) » est un suffixe de libellé) |
| 30–31 | `{start_of_intro: Interlude}` / `[D] [A] [F#m] [E] [D] [A] [F#m] [E]` | y=581,6 : ligne d'accords sans libellé ; shir.fr : 7 accords (sans le D initial) | info : libellé ajouté, conforme à la table des sections | aucune |

Note : `Abba Père (A).pdf` (shir.fr, 2020) est un **autre arrangement** (refrain
D A / D C#m F#m / Bm7 E4 D, section « Final » absente du FPDF, pronoms en
minuscules, E de fin de vers posé sur la virgule). Le `.cho` suit le FPDF sans
le dire : `{source: Abba Père.pdf}` à ajouter quand la directive sera adoptée.

### 2.2 `oceans.cho` (D) ↔ `Océans - Accords D.pdf` (FPDF, 28/01/2023)

40 comparaisons : 35 exacts, 4 équivalents, 1 décalé. Paroles identiques
(deux vers du pont recoupés en deux lignes).

| Ligne | Contenu actuel | Mesure (PDF) | Classe | Correction proposée |
|---|---|---|---|---|
| 16 | `Et j'inv[D]oquerai Ton sa[A]int Nom,` | y=276,8 : D @109,8 sur « q » (« j'invo‹q›uerai ») → syllabe « que » | **décalé d'une syllabe** (le .cho est sur « vo ») | `Et j'invo[D]querai Ton sa[A]int Nom,` |
| 12 | `Dans l[A]'abîme` | y=208,8 : A @79,6 sur « a » (« l'‹a›bîme ») | équivalent : accord avant l'apostrophe | `Dans l'[A]abîme` |
| 19 | `Je T'appart[G]iens` | y=378,9 : G @120,4 sur « t » (« T'appar‹t›iens ») | équivalent : coupe dans la syllabe « tiens » | `Je T'appar[G]tiens` |
| 10 | `Dans l'in[A]connu` | y=140,8 : A @100,0 sur « o » (« l'inc‹o›nnu ») | équivalent : le .cho est au début de la syllabe, c'est le PDF qui coupe après la consonne | aucune |
| 32 | `Peu [A]importe` | y=651,0 : A @329,4 sur « m » (« i‹m›porte ») | équivalent, idem | aucune |
| 9 | `par-[A/C#]delà [ ][D]des eaux,` | y=119,5 : D @215,6 = x0 du « d » de « des », après 3 espaces | forme : `[ ]` dans une ligne chantée (réservé aux intros) | `par-[A/C#]delà [D]des eaux,` |
| 31, 34 | `…sur l'eau, ` / `…fortifiée, ` | — | forme : espace en fin de ligne | retirer |

Note : traducteurs (« Marie Makaya-Phagan & Jonathan Mercier ») et titre
original (« Oceans – Where feet may fail ») du PDF non repris ; pas de champ
prévu. Pas de tempo dans le PDF.

### 2.3 `yahwe.cho` (A) ↔ `Yahwé A.pdf` (FPDF, 14/05/2026)

59 comparaisons : 46 exacts, 12 équivalents, 1 décalé. Paroles identiques
(six vers recoupés). Les 12 équivalents sont un seul motif : le PDF pose
l'accord un caractère à l'intérieur de la dernière syllabe, le `.cho` après la
voyelle ou avant la ponctuation.

| Ligne | Contenu actuel | Mesure (PDF) | Classe | Correction proposée |
|---|---|---|---|---|
| 35 | `Tu fais briller [D]sur moi Ton soleil[A].` | p2 y=41,6 : D @247,2 sur le « r » final de « briller » (tenue de « -ller ») ; shir.fr idem (D @239,4) | **décalé** : le .cho met D sur « sur » | `Tu fais briller[D] sur moi Ton soleil[A].` (tenue : juste après la syllabe tenue) |
| 18 | `M'accompagner[C#m]ont` | y=310,9 : C#m @153,3 sur « r » (« compagne‹r›ont ») | équivalent : coupe dans la syllabe « ront » | `M'accompagne[C#m]ront` |
| 42 | `Bient[A]ôt` | p2 y=211,6 : A @63,2 sur « t » (« Bien‹t›ôt ») | équivalent : coupe dans la syllabe « tôt » | `Bien[A]tôt` |
| 19 | `tellement de [E]joies !` | y=344,9 : E @426,9 sur « e » (« joi‹e›s ») | équivalent : le PDF met E *pendant* « joies », le .cho *au début* | à trancher à l'oreille ; si l'accord tombe sur la tenue → `tellement de joies[E] !` |
| 20 | `de mo[A]i,` | y=378,9 : A @288,5 sur « o » | équivalent : coupe dans la syllabe | `de moi[A],` |
| 22 | `je reviendra[A]i, je reviendra[E]i.` | y=446,9 : A @273,0 et E @369,0 sur « a » | équivalent | `je reviendrai[A], je reviendrai[E].` |
| 31 | `De Son amou[A]r, de Son amou[E]r.` | y=617,0 : A @120,1 et E @229,5 sur « u » | équivalent | `De Son amour[A], de Son amour[E].` |
| 9, 43 | `manquerai[F#m].`, `j'habiterai[F#m].` | F#m sur « i » (« manquera‹i›. », « habitera‹i›. ») | équivalent : forme « tenue » de la règle | aucune |
| 27, 35 | `la mort[F#m],`, `Ton soleil[A].` | F#m sur « t » (« mor‹t›, »), A sur « l » (« solei‹l›. ») | équivalent : forme « tenue » | aucune |
| 8, 11, 26, 29, 42, 45 | fin de ligne | — | forme : espace de fin de ligne sur chaque vers recoupé | retirer (la recoupe elle-même est admise : découpage par sens) |

Notes : pas de `{youtube}`, pas de `{tempo}` (aucun des six PDF de Yahwé n'en
donne). `Yahwe (A).pdf` (shir.fr) est inutilisable comme référence : voir
anomalie 3.6.

### 2.4 `tu-es-bon.cho` (G) ↔ `Tu es bon - G.pdf` (shir.fr, 2016) et `Tu es bon.pdf` (FPDF, 14/09/2025)

Contre shir.fr : 27 comparaisons, 19 exacts, 3 équivalents, 4 absents du
`.cho`, 1 absent du PDF. Contre le FPDF : 23 comparaisons, 19 exacts,
4 équivalents, rien d'absent. Le `.cho` est la copie de la structure du FPDF
(même esperluette dans l'artiste, même « Refrain (x2) » mal recopié).

| Ligne | Contenu actuel | Mesure (PDF) | Classe | Correction proposée |
|---|---|---|---|---|
| 32 | `Un cri [Am7]sur mes lèvres, ma vie[C]Te célèbre.` | FPDF y=617,0 : C @251,6 **sur l'espace** entre « vie » et « Te » ; shir.fr y=604,8 : « ma vie te » | **paroles** : espace perdu ; le parseur du site rend « ma vie**Te** célèbre » (vérifié avec `parseLyricLine`) | `ma vie[C] Te célèbre.` (accord en l'air avant « Te », forme du FPDF) |
| 18 | `{start_of_chorus: Refrain 2}` | FPDF y=293,8 : « Refrain **(x2)** » ; shir.fr : « (× 2) » y=388,4 | **libellé faux** : indexé comme un second refrain (`songs-index.json` : name « Refrain 2 », number « 2 ») | `{start_of_chorus: Refrain (x2)}` |
| 34 | `Vent, sol[Am7]eil ou pluie` | Am7 @98,7 (shir.fr) / @104,1 (FPDF) sur « l » (« so‹l›eil ») | équivalent : coupe dans la syllabe « leil » | `Vent, so[Am7]leil ou pluie` |
| 15, 28 | `Ton amour m'émerveil[D]le.` | D @215,5 / @195,2 sur le premier « l » (« émervei‹l›le ») | équivalent ; coupe des consonnes doubles incohérente avec `abba-pere` l.48 `émervei[F#m]llé` | `m'émervei[D]lle.` — à unifier par la règle de coupe de `02-placement-accords.md` |
| 20 | `Et je [G]danse car Tu es bon.` | shir.fr : pas de G sur « danse », **G/F#** @155,0 sur « tu » (y=310,6) ; FPDF : G @81,8 sur « d » | absent de shir.fr, présent dans le FPDF | aucune (le FPDF fait foi) |
| 20, 25, 26 | — | shir.fr seulement : **G/F#** (« tu es bon », 2ᵉ ligne du refrain), **G/E** @295,1 et **G/D** @325,4 (« se compare », y=437,7), **C/D** @292,4 (« de ta gloire », y=469,1) | absents du .cho : accords de passage de l'arrangement shir.fr, absents aussi du FPDF | aucune tant que le FPDF est la source ; à ajouter si Timothée retient l'arrangement shir.fr |
| 22 | après le refrain | shir.fr y=406,3 : interlude « G C G C G C G C G » ; FPDF : rien | structure (arrangement shir.fr) | idem |
| 8 | `[G][ ][C][ ][G][ ][C][ ]…` (Intro) | « G C G C G C G C G » | forme : intro à espaceurs, alors qu'`abba-pere` écrit `[F#m] [D] [A]` | une seule notation d'intro (à fixer dans `01-format-cho.md`) |

Note : shir.fr écrit les pronoms en minuscules (« ta bonté », « tu es bon »),
le `.cho` capitalise comme le FPDF. Pas de tempo dans les trois PDF.

### 2.5 `一粒麦子.cho` (F) ↔ `一粒麦子.pdf` (scan 1=F ; calque `一粒麦子-p1.webp`, 1600 × 2353)

40 ancres : 33 exacts, 4 syncopes liées (équivalents), 3 décalés ; 1 accord
optionnel omis ; structure non dépliée. Paroles et pinyin : comptes justes
(28/28, 28/28, 27/27, 27/27, 12/12, 12/12). Nota : `一粒麦子 F.pdf` est une autre
gravure (accords capo entre parenthèses), pas celle du calque.

| Ligne | Contenu actuel | Mesure (webp) | Classe | Correction proposée |
|---|---|---|---|---|
| 17 | `失丧生命必反得[Csus4]生[C]命！` | Csus4 @1127 sur le « 6 » lié du 1ᵉʳ temps, 生 attaqué @1032 une croche avant (d=+95, `z_ylmz_S5_csus4.png`) ; C @1358 sur le tiret du 3ᵉ temps, 命 attaqué @1183 (d=+181) | Csus4 : syncope liée (équivalent) ; **C : décalé (tenue)** | `失丧生命必反得生[Csus4]命[C]！` |
| 22 | `[Am]应得的[Dm]权利` | rangée 2 des systèmes S4–S5 : Am @59 → 得 @56 (应 est sous le dernier « 4 » de S4, x=1514) ; Dm @291 → 利 @287, 权 @223 (d=+68, `r_ylmz_S5a.png`) | **décalé d'un caractère, deux fois** (rangée 2 recopiée « à la phrase ») | `为应[Am]得的权[Dm]利` |
| 27 | `呼召如此[Gm]崇高，` | Gm @1371 sur le 2ᵉ « 3 » (temps 3), 崇 @1323 attaqué une double-croche avant (arc, d=+48, `z_ylmz_S6_chong.png`) | syncope liée (équivalent) | `呼召如此崇[Gm]高，` (règle : après la syllabe qui anticipe) |
| 27 | `[C]种子何等[F]渺小，` | F @373 sur le 2ᵉ « 4 », 渺 @283 (d=+90, `z_ylmz_S7_miao.png`) ; **(C/E)** @464 sur le 2ᵉ « 3 » de 小, absent du .cho | syncope (équivalent) + optionnel omis | `[C]种子何等渺[F]小[(C/E)]，` |
| 29 | `定睛标竿[Gm]直跑，` | Gm @859 sur le 2ᵉ « 3 », 直 @814 (d=+45, `z_ylmz_S7_zhi.png`) | syncope (équivalent) | `定睛标竿直[Gm]跑，` |
| 17 | `主，我愿意，让自己` | scan (S4, x≈823–860) : « 主，我愿意**！**让 » | ponctuation | `主，我愿意！让自己` |
| 26–31 | pont écrit une fois ; chant fini après le pont | scan : `‖:` pont `:‖` (deux fois), puis **D.S. al Fine** avec l'annotation « [Bridge回来 Gm代替Bb] [Gm] » (y 1044–1116) au-dessus du Bb du refrain | **structure non dépliée** : le retour change l'harmonie | `{start_of_bridge: 桥段 (x2)/Pont (x2)}` ; ajouter `副歌 1 (D.S.)/Refrain 1 (D.S.)` et `副歌 2 (D.S.)/Refrain 2 (D.S.)` avec `[Gm]让自己` / `[Gm]放下` à la place de `[Bb]` |
| 16, 21 | `副歌1/Refrain1`, `副歌2/Refrain2` | — | forme : libellé | `副歌 1/Refrain 1`, `副歌 2/Refrain 2` |
| 11, 13, 18, 23, 28, 30 | pinyin sur la ligne suivante | — | forme | même ligne : `hanzi   pinyin` |
| 7 | `{themes: 奉献, 舍己, 信心}` | — | thèmes chinois, invisibles dans le filtre (anomalie 3.2) | `{themes: Foi, …}` (奉献, 舍己 sans équivalent dans la liste : à trancher) |

### 2.6 `我们的神.cho` (G) ↔ `我们的神.pdf` (scan 1=G ; webp 1460 × 2139)

52 ancres : **52 exacts**. Deux choix de nom non signalés ; la fin du chant
n'est pas dépliée.

| Ligne | Contenu actuel | Mesure (webp) | Classe | Correction proposée |
|---|---|---|---|---|
| 24, 30 | `命立就[G/B]立` | scan : « G或G/B » @1176 → 立 @1173 | nom : seconde branche d'une alternative, choix non signalé | `命立就[G (G/B)]立` |
| 32 | `[C]圣哉! 圣[Dsus4]哉！` (fin du chant) | après la volta 2 : « (0· 3 3 5 ‖ 1=A ‖ 5 -) » = **« (我们的神！) » optionnel**, levée **E** @1118 (étiquette #42), « To Chorus », puis **dernier refrain en la** : « [最后一遍副歌] F#m E/G# D/A A/C# » (y 747) et « A E/G# F#m A/E D A/C# / Bm E A E/G# F#m A/E D A/C# / Bm E A » (étiquettes #49–65, `c:""`, masquées) | **structure non dépliée** : modulation et refrain final absents | ajouter `{start_of_chorus: 副歌 (A调)/Refrain final (A)}` avec les accords gravés, précédé de la levée `[E]` et de « (我们的神！) » optionnel |
| 32 | `圣哉!` | — | ponctuation demi-chasse | `圣哉！` |
| 14, 15, 19, 20, 24–26, 30–32 | espace après chaque ponctuation (16 occurrences : « 神， [D/F#]坐在 ») et « 述说 天父的 » (l.14) | — | forme : aucun espace hors séparateur pinyin | retirer |
| 19 | `[D][ ]我们的[G]神` | D @272 sur le premier « 0 » de la levée, 我 @397 (`z_wmds_S3_D.png`) | exact (levée) ; forme `[X][ ]` en ligne chantée | `[D] 我们的[G]神` |
| 25, 31 | `路[D/F#] [Em]亚` | D/F# @1167 sur le « 2 » du mélisme de 路 (arc, `z_wmds_S6_DF.png`) | exact (forme mélisme) | aucune |
| 10 | `[G]  [Em]  [C]  [D]` | intro gravée G·G·Em·Em·C·C·D | forme : deux espaces (`安静` en met trois), durées non écrites | aucune tant que la notation d'intro n'est pas fixée |
| 3 | `{artist: 赞美之泉}` | scan : 郑懋柔、游智婷 词 / 游智婷 曲 | info (règle : nom sous lequel le chant est connu) | aucune |
| — | pas de `{themes}` | — | métadonnée | à compléter (1 à 3 `name_fr`) |

### 2.7 `安静.cho` (D) ↔ `安静 简谱.jpg` (webp 1363 × 1651)

31 ancres : **31 exacts** (0–2 px du chiffre ; cette gravure aligne les
caractères sous les notes). Rien à corriger sur les accords.

| Ligne | Contenu actuel | Mesure (webp) | Classe | Correction proposée |
|---|---|---|---|---|
| 13, 14 | `[D]安[D/F#]静 让[G]平安…`, `[D]风浪 让[G]我灵…` | — | forme : espace dans les paroles (tenue avant la levée « 让 ») | `安[D/F#]静让[G]平安`, `风浪让[G]我灵` |
| 18 | `应许之[A]处；` | scan : « 处. » | ponctuation : « ； » pour « 。 » | `应许之[A]处。` (mineur) |
| 9 | `[D]   [D/F#]   [G] …` | intro : 10 étiquettes, même ordre | forme : trois espaces = séparateur pinyin | aucune tant que la notation d'intro n'est pas fixée |
| 3 | `{artist: 赞美之泉}` | scan : 詞 鄭懋柔 / 曲 游智婷, sans 赞美之泉 ; sous-titre « Be Still » | info | aucune |
| — | pas de `{themes}` | — | métadonnée | à compléter |
| 13–19 | 祢 → 你 (×4) | scan : 祢 | conforme | aucune |

### 2.8 `只要有你在我左右.cho` (G) ↔ `只要有你在我左右.pdf` (Finale, 612 × 792 pt)

35 placements (intro 8/8 à part) : 31 exacts, 1 équivalent, 2 décalés,
1 accord absent. Paroles identiques après 繁→简 et 祢→你. Pont déplié
correctement (voltas 1 et 2).

| Ligne | Contenu actuel | Mesure (PDF) | Classe | Correction proposée |
|---|---|---|---|---|
| 24 | `[Am]可颂可畏，[G]施行奇事。` | y=552,6 : **C/D** @310,0 sur 施 (note 309,8) ; **G** @373,8 sur la ronde liée depuis 事 (aucun caractère dessous, 。 à −7,4) | **décalé** + accord **absent** | `[Am]可颂可畏，[C/D]施行奇事[G]。` |
| 29 | `[Am]神所拣[D]选的。` | y=648,9 : D @536,4 sur **只** (levée « 只要 » du retour au refrain) ; 選 ≈ 36 pt avant | **décalé** : doublon de la levée déjà écrite l.21 `[D]只要` | `[Am]神所拣选的。` |
| 17 | `能力，[D][ ]显出荣[G]耀。` | D @91,1 (y=389,2) sur une noire pointée sans parole (liaison depuis 力), 显 21 pt plus loin | équivalent (levée) ; forme `[X][ ]` | `能力，[D] 显出荣[G]耀。` |
| 16 | pinyin `nǐ shì wǒ de lì liáng` | 13 hanzi (« 你是我力量 ») | **pinyin** : 14 syllabes, « de » en trop | `nǐ shì wǒ lì liáng` |
| 14, 21, 23, 28 | `天军；`, `惧怕；` (×2), `拣选的；` | PDF : `。` (天軍。, 懼怕。×2) et `，` (揀選的，) | ponctuation | reprendre celle du PDF |
| 10 | `[Gsus]   [G]   [Gsus]   [G]   …` | intro : 8 accords identiques | forme : `Gsus` → orthographe canonique ; trois espaces = séparateur pinyin | `[Gsus4] [G] [Gsus4] [G] …` |
| 3 | `{artist: 赞美之泉}` | PDF : 詞 陳麒安、游智婷 / 曲 陳麒安 | info | aucune |
| — | pas de `{themes}` | — | métadonnée | à compléter |

### 2.9 `荣耀的呼召.cho` (F) ↔ `荣耀的呼召.pdf` (Finale)

42 placements : 36 exacts, 4 en l'air conformes à la règle, 2 noms différents,
0 décalé. Paroles et pinyin justes (6/6 lignes au bon compte).

| Ligne | Contenu actuel | Mesure (PDF) | Classe | Correction proposée |
|---|---|---|---|---|
| 25, 26 | `[Gm]我爱[Bb]你， 耶[F]稣。` | y=559,9 : **Bb/C** @425,5 (note 431,1 ; 祢 429,7) ; y=644,1 : Bb/C @402,8 | **nom simplifié** (Bb pour Bb/C), incohérent avec l.16 et l.21 qui gardent `Bb/C` | `[Gm]我爱[Bb/C]你，耶[F]稣。` |
| 16 | `恩[Edim]惠` | note de bas de page « 愛心小提醒 Edim 可用 C/E 代替 » | alternative non reportée | `恩[Edim (C/E)]惠` |
| 15 | `祭，[Dm][ ]作主` | Dm @272,5 entre 祭 @232,9 (blanche) et 作 @291,9 : temps 3 sans note | exact (levée) ; forme `[X][ ]` | `祭，[Dm] 作主` |
| 20 | `[Bb/C][ ]高举` | Bb/C @524,3 (y=295,6) après F @500,3 sur 力 tenu, avant la levée 高舉 @543,1 | exact (levée déplacée en tête de refrain) ; forme | `[Bb/C] 高举` |
| 15, 20 | `器[Csus4]皿[C]，`, `耶[Csus4]稣[C]，` | C @517,8 / @517,0 sur le temps 4 de la blanche pointée | exact (tenue, accord avant la ponctuation) | aucune |
| 16, 21, 25, 26 | « 我， 使我 », « 主， 全心 », « 耶稣， [Am] » | — | forme : espace après la ponctuation | retirer |
| 25, 26 | pinyin `yē sū  ài wǒ` | — | forme : double espace | un seul |
| 7 | `{themes: 敬拜, 呼召, 信心}` | — | thèmes chinois, invisibles dans le filtre | `{themes: Adoration, Foi}` (呼召 sans équivalent : à trancher) |

### 2.10 `au-nom-de-jesus.cho` (D) ↔ `Au nom de Jésus (D).pdf` (scan Word, 1208 × 1712 px, deux colonnes)

40 accords, mêmes noms partout : 0 exact, 4 ambigus, 36 décalés dont 34 sur
un autre mot (seuils rescalés à cette image : exact < 14 px, ambigu 14–30,
décalé > 30). Paroles : 22 lignes identiques. Le scan met l'accord **là où il
change** (syllabe accentuée en fin de segment : « nous », « -phé », « -lés »,
« là », « pas », « moi ») ; le `.cho` le met **au début du segment** qu'il
gouverne, un cran plus tôt. Un alignement Word par espaces vaut ±1 syllabe :
ces 36 lignes ne sont pas des erreurs prouvées mais une lecture divergente,
**à trancher à l'oreille** (`{youtube}` l.5), pas mécaniquement. La colonne
« Lecture du scan » n'est donc pas une correction proposée.

| Ligne | Contenu actuel | Position dans le scan (x px) | Δ (px) | Lecture du scan |
|---|---|---|---|---|
| 13 | `[G]Dieu combat pour nous, [Em7]Toujours à nos côtés` | G @288 fin de « pour » / « nous » ; Em7 @477 « ‹n›os » | +178 / +121 | `Dieu combat pour [G]nous, Toujours à [Em7]nos côtés` |
| 14, 25 | `[Bm]Il a triomphé oui, [D]il a triomphé` | Bm @224 / 212 « triom‹phé› » ; D @398 / 402 second « triom‹phé› » | +114 / +104 ; +104 / +110 | `Il a triom[Bm]phé oui, il a triom[D]phé` |
| 15, 26 | `[G]Nous ne tremblerons pas, [Em7]jamais ébranlés` | G @308 / 317 « tremble‹rons› » ; Em7 @476 / 486 « é‹bran›lés » | +198 / +102 ; +209 / +114 | `Nous ne tremble[G]rons pas, jamais é[Em7]branlés` |
| 16, 27 | `[D]Jésus Tu es là` | D @224 / 218 après « es » → « là » | +110 / +105 | `Jésus Tu es [D]là` |
| 24 | `[G]Portant nos fardeaux et [Em7]couvrant notre honte` | G @296 « far‹deaux› » ; Em7 @470 « ‹no›tre » | +188 / +118 | `Portant nos far[G]deaux et couvrant [Em7]notre honte` |
| 31 | `[A]Je vivrai, je [G]n'mourrai pas` | A @180 « viv‹rai› » ; G @332 « ‹pas› » | +74 / +108 | `Je vi[A]vrai, je n'mourrai [G]pas` |
| 32 | `[D]Christ ressusci[Bm]té vit en moi Par [C]Sa puissance` | D @248 « ressus‹ci›té » ; Bm @340 « ‹moi› » ; C @196 « puis‹sance› » (ligne suivante du scan) | +142 / +88 / autre ligne | `Christ ressus[D]cité vit en [Bm]moi Par Sa puis[C]sance` |
| 33 | `[G]Et je suis libre [D]Au Nom de Jésus` | G @232 « li‹bre› » ; D @400 « Jé‹sus› » | +125 / +146 | `Et je suis li[G]bre Au Nom de Jé[D]sus` |
| 37 | `[A]Je vivrai, je [G]n'mourrai pas` | A @184 « vivrai‹,› » ; G @332 « ‹pas› » | +78 / +110 | `Je vivrai[A], je n'mourrai [G]pas` |
| 38 | `[D]Je déclare : [Bm]Tu es élevé [C]Christ révélé` | D @238 « T‹u› » ; Bm @322 « éle‹vé› » ; C @459 « révé‹lé› » | +132 / +102 / +115 | `Je déclare : [D]Tu es éle[Bm]vé Christ révé[C]lé` |
| 39 | `[G]Et je suis gué[D]ri Au Nom de Jésus` | G @232 « gué‹ri› » ; D @400 « J‹é›sus » | +126 / +171 | `Et je suis gué[G]ri Au Nom de J[D]ésus` |
| 50 | `[G]Oui Dieu combat pour nous Repous[A]sant les ténèbres` | G @790 « ‹pour› » ; A @1038 « l‹e›s » (colonne droite) | +172 / +68 | `Oui Dieu combat [G]pour nous Repoussant [A]les ténèbres` |
| 51 | `[Bm]Éclairant le Royaume Qui sub[D/F#]siste à jamais` | Bm @733 « ‹Ro›yaume » ; D/F# @948 « subsis‹te› » | +115 / +32 (limite) | `Éclairant le [Bm]Royaume Qui subsis[D/F#]te à jamais` |
| 52 | `[G]Dans le Nom de Jésus L'enne[A]mi est vaincu` | G @774 après « de » → « Jésus » ; A @980 « ‹vain›cu » | +156 / +68 | `Dans le Nom de [G]Jésus L'ennemi est [A]vaincu` |
| 53 | `[Bm]Ensemble proclamons, pro[D]clamons` | Bm @728 « ‹pro›clamons » ; D @948 second « procla‹mons› » | +110 / +60 | `Ensemble [Bm]proclamons, procla[D]mons` |
| 57–60 | `Au Nom de J[D]ésus` (×4) | D @764 / 764 / 764 / 758, à 61 % du mot « Jésus » | +20 / +14 (ambigu) | `Au Nom de Jé[D]sus`, ou inchangé |

Autres écarts du même fichier, ceux-là mécaniques :

| Ligne | Contenu actuel | Mesure | Classe | Correction proposée |
|---|---|---|---|---|
| 2 | `{artist:  Sinach }` | — | métadonnée : espaces parasites | `{artist: Sinach}` |
| 19, 42, 56 | `{start_of_verse: Interlude}`, `{start_of_verse: Instrumental}`, `{start_of_verse: Fin}` | scan : [Interlude], [Instrumental], [Fin] | structure : sections instrumentales typées « couplet » | `{start_of_intro: Interlude}`, `{start_of_intro: Instrumental}`, `{start_of_outro: Final}` (table de `01-format-cho.md`) |

## 3. Anomalies d'inventaire

Comptes vérifiés le 26/09/2026 par grep et scripts Python sur
`content/songs/` : 372 fichiers `.cho` dont `_template.cho` (exclu de l'index
par `getSongSlugs`), soit **371 chants** ; `public/songs-index.json` construit
en compte 370 (`avec-nous.cho`, non versionné, est postérieur au dernier
`build:index`).

### 3.1 Deux chants « Ta parole »

> **Corrigé par Timothée le 26/09/2026** : `Ta parole.cho` supprimé, le chant « Écriture » vit maintenant dans `content/songs/Ta-parole-écriture.cho` (nom hors slug kebab de 01 : majuscule et accent, adresse `/songs/Ta-parole-%C3%A9criture`). Le constat ci-dessous décrit l'état d'avant.

| Fichier | Tonalité | Artiste | Tempo | Thèmes | Slug dans l'index |
|---|---|---|---|---|---|
| `content/songs/Ta parole.cho` (1 295 o, 25/06) | Bb | Écriture | 132 | Foi, Espérance | `Ta parole` (espace dans le nom → URL `/songs/Ta%20parole`) |
| `content/songs/ta-parole.cho` (1 280 o, 30/05) | F | Pierre-Nicolas de Katow | — | Foi, Adoration | `ta-parole` |

Deux chants différents, tous deux indexés, même `{title: Ta parole}` : deux
entrées identiques dans la liste. À trancher : renommer `Ta parole.cho` en slug
kebab (⚠ le slug est la clé des items de setlist dans Firestore et de l'URL :
vérifier les setlists qui le référencent avant), ou distinguer les titres
(`{title: Ta parole (Écriture)}` par exemple).

### 3.2 Thèmes que le filtre ne voit pas

Mécanisme (vérifié) : le filtre de `src/app/songs/SongListClient.tsx` ne
propose que les entrées de `content/themes.json` dont le `slug` est présent
dans l'index (l.206–207) et filtre par `s.themes.includes(slug)` (l.141–142) ;
les thèmes d'un `.cho` sont passés par `slugifyTheme` (`src/lib/content/loadSongs.ts`
l.9–19 : minuscules, espaces → « - », accents é è ê à â ù û ô ó î ï retirés —
**pas le « ë »**). Un thème dont le slug n'est pas dans `themes.json` (18
entrées) n'apparaît nulle part. L'index porte 82 slugs distincts ; 16 sont
reconnus.

**Thèmes chinois : 56 chants zh, 60 mots distincts, tous invisibles.** Sur
189 fichiers zh, 58 ont `{themes}` (56 en chinois, 2 en français), 131 n'en ont
pas. Dix de ces mots sont le `name_zh` d'un thème de la liste et se traduisent
mécaniquement :

| Mot | Chants | name_fr | Mot | Chants | name_fr |
|---|---|---|---|---|---|
| 敬拜 | 20 | Adoration | 圣诞 | 2 | Noël |
| 盼望 | 11 | Espérance | 委身 | 2 | Engagement |
| 信心 | 10 | Foi | 圣灵 | 1 | Saint-Esprit |
| 感恩 | 5 | Action de grâce | 十字架 | 1 | Croix |
| 恩典 | 4 | Grâce | 宣教 | 1 | Mission |

Les 50 autres n'ont pas d'équivalent dans la liste et sont à trancher :
赞美 (20), 宣告 (13), 奉献 (5), 喜乐 (5), 依靠 (4), 爱 (3), 被爱 (3), 跟随 (3),
颂赞, 歌唱, 力量, 救赎, 仰望, 信靠, 得胜, 复兴, 呼召, 十架, 感谢 (2 chacun),
puis 更新, 爱慕, 舍己, 谦卑, 生命, 拯救, 应许, 旨意, 磐石, 避难所, 保护, 称谢,
平安, 和散那, 祭坛, 同行, 转化, 医治, 土地, 门徒, 亲密, 尊崇, 渴慕, 顺服, 宝座,
荣耀, 梦想, 欢呼, 友情, 家庭, 陪伴 (1 chacun).

Les 56 fichiers : 一切歌颂赞美, 一切都更新, 一同齐声宣扬, 一生敬拜你, 一生爱你,
一生跟随, 一粒麦子, 一颗谦卑的心, 不停赞美, 不停赞美你, 丰盛的应许, 主你是我力量,
主我献上生命给你, 云上太阳, 从早晨到夜晚, 何等恩典, 你坐着为王, 你恩典不离开,
你是我的平安, 你永远如此深爱着我, 全新的你, 叫我抬起头的神, 向我的神献上感谢,
吹起复兴的火, 和散那, 哦十字架, 围绕我, 我愿为你去, 我选择喜乐, 无价至宝, 日日夜夜,
有你同行, 求充满这地, 活出爱, 爱中相遇, 爱的彰显, 爱的约定, 爱赢了, 神羔羊配得,
耶和华是应当称颂的, 耶稣万名之上的名, 能不能, 脚步, 荣耀的呼召, 荣耀至高神,
行神迹的神, 认识你真好, 让我得见你的荣面, 让爱飞翔, 让赞美飞扬, 谢谢你,
谢谢你成为我的家, 赞美中信心不断升起, 赞美之泉, 陪我走过春夏秋冬, 齐来赞美.

**Thèmes français hors liste : 6 mots, 13 chants.**

| Thème écrit | Slug produit | Chants | Proposition |
|---|---|---|---|
| Noël | `noël` (≠ `noel` : le « ë » n'est pas traité) | 7 : il-regnera, joie-dans-le-monde, le-roi-est-ne, ma-raison-de-noel, ne-pour-nous-donner-la-vie, noel-est-arrive, roi-des-rois | les `.cho` sont corrects (« Noël » est le `name_fr`) ; c'est `slugifyTheme` qui manque le « ë » — correction côté code, hors périmètre de ce rapport, à trancher |
| Consécration | `consecration` | 2 : jesus-je-te-suivrai, nous-voici | Engagement |
| Confiance | `confiance` | 1 : jesus-je-te-suivrai | Foi |
| Création | `creation` | 1 : quand-tu-parles | à trancher (pas d'équivalent) |
| Envoi | `envoi` | 1 : nous-voici | Mission |
| Victory | `victory` | 1 : risen | Résurrection (déjà présent sur ce chant) → retirer |

Variantes sans accent **reconnues** malgré tout (le slug tombe juste) : Grace
(3 : amour-extravagant, amour-sans-fin, cet-amour), Esperance (2 : aucune-peur,
compter-sur-toi), Resurrection (2 : ce-nom-si-merveilleux, risen) — à réécrire
avec l'accent par propreté, sans urgence. « Pâques » (homme-de-douleurs) est
dans la liste et reconnu.

### 3.3 Directives de section inconnues du parseur → type « other »

`SECTION_TYPE_MAP` (`src/lib/chordpro/parser.ts` l.72–84) connaît `verse`,
`chorus`, `bridge`, `intro`, `outro`, `prechorus`/`pre_chorus`,
`postchorus`/`post_chorus`, et envoie `tab` et `grid` sur `other` ; tout autre
mot tombe aussi sur `other` (l.87), puis le libellé peut requalifier le type
(l.118–135 : couplet, refrain, pont, intro, outro/coda, pré-refrain). « Final »,
« Tag », « Instrumental » ne matchent rien et restent `other`.

| Directive | Fichiers | Détail |
|---|---|---|
| `{start_of_final}` | **20** (une par fichier) | de-tout-mon-etre, dieu-tout-puissant, inattendu, il-m-aime, merci, je-flechis-le-genou, je-celebrerai, o-vois, ouvre-les-yeux-de-mon-coeur, notre-pere, rejouis-toi-mon-ame, ta-parole, toujours-puissante, risen, recois-l-adoration, voici-le-jour, quand-tu-parles, un-chant-nouveau-monte, tout-puissant, tu-m-aimes |
| `{start_of_grid}` | **1** | `jusqu-au-bout.cho` l.40 `{start_of_grid: Tag}` |
| `{start_of_instrumental}` | 1 | `collision.cho` l.36 |
| `{start_of_coda}` | 1 | `爱赢了.cho` l.74 `{start_of_coda: 尾奏/Outro}` — requalifié `outro` grâce au libellé |
| `{start_of_jianpu}` | 1 | `爱赢了.cho` l.9–46 : bloc obsolète, lu mais plus rendu |

Effets d'un type `other` : couleur de section « other » dans la vue chant
(`SongView.tsx` l.469 — l'entrée `final: "chorus"` de `SECTION_PALETTE_KEY`
l.75 ne sert jamais, le parseur ne produit pas ce type) et dans le PDF
(`src/lib/pdf/colors.ts` l.63) ; abréviation d'historique déduite du nom seul
(`src/lib/chordpro/abbreviations.ts` l.28) ; harmonie : section ignorée sauf si
le nom contient « interlude »/« instrument » (`src/lib/harmonie/motifs.ts`
l.60–62). Dans l'index, `ta-parole` → section (« Final », `other`).

Correction : `{start_of_final: Final}` → `{start_of_outro: Final}` (20
fichiers) ; `{start_of_instrumental: Instrumental}` → `{start_of_intro: Instrumental}` ;
`{start_of_grid: Tag}` → selon la table de `01-format-cho.md`. À noter pour le
chantier des guidelines : `start_of_tag` de cette table n'est pas non plus dans
`SECTION_TYPE_MAP` (type `other` aujourd'hui).

### 3.4 Pinyin sur la ligne suivante

Le format attendu est `hanzi   pinyin` sur la même ligne (3 espaces minimum).
**11 fichiers zh** mettent tout le pinyin sur la ligne suivante : 一切歌颂赞美,
一切都更新, 一同齐声宣扬, 一生敬拜你, 一生爱你, 一粒麦子, 爱使我们勇敢,
爱可以再更多一点点, 爱我愿意, 爱的约定, 爱赢了. **`爱的彰显.cho` mélange les deux** :
couplets en ligne (l.14–31, séparateur large), refrain et pont en ligne suivante
(l.35–38, 42–45). Les 177 autres sont en ligne. Correction mécanique par
`scripts/cho/pinyin.py --file` (à venir), à relire.

### 3.5 Espaceur après accord dans une ligne chantée

`[X][ ]` dans une ligne qui porte des paroles : **160 fichiers** (29 fr,
131 zh), **825 occurrences** — 194 fichiers et 1 069 occurrences si l'on compte
les intros, où `[ ]` reste toléré. Les plus chargés : 你是我的平安 (29),
荣耀至高神 (22), 敬拜的心 (21), 奇异恩典 (18), 我愿为你去 (18), le-roi-est-ne (17),
打开天窗 (16), 一切都更新 (15), 让我得见你的荣面 (15), 求充满这地 (14),
若有人在基督里 (14). Sens visé : l'accord sonne avant l'attaque de la voix ;
forme retenue par la spec : `[X] ` (crochet puis espace). Remplacement
mécanique possible ; `lint.py` le signalera en `E`.

### 3.6 `Partitions/Yahwe (A).pdf` : « Tonalité A » avec des accords de si

Vérifié par PyMuPDF : en-tête « shir.fr 25/12/15 – ENC1103 CCO1414 JEM970 »,
« Tonalité A » ; accords en gras trouvés : A, D, E, **G#m** (×12), **D#m** (×2),
**Em** (×1) ; F#m et C#m absents. `Yahwé - B.pdf` porte B E G#m : la version
« (A) » de shir.fr est la version B dont seuls les accords majeurs ont été
transposés (B→A, E→D, F#→E), les mineurs restant en si. Le `.cho` suit le FPDF
`Yahwé A.pdf`, correct (F#m, C#m, E). Correction : ne pas renommer la source
(règle), mais la marquer inutilisable dans l'inventaire des partitions ;
`inspect.py` devrait contrôler « accords diatoniques à la tonalité annoncée ».

### 3.7 Quatre PDF « zh/texte » aux hanzi illisibles

`pdf_kinds.json` classe 70 PDF « zh/texte ». Pour quatre d'entre eux, la couche
texte n'a pas de table Unicode pour les caractères chinois (vérifié par
extraction PyMuPDF, nombre de hanzi lisibles) :

| PDF | Pages | Hanzi lisibles | Comparaison |
|---|---|---|---|
| `深不见底的爱.pdf` | 1 | 1 (« 粚 », bruit) | `只要有你在我左右.pdf` : 185 |
| `我是承带神荣耀的器皿.pdf` | 2 | 1 (« 牦 », bruit) | `荣耀的呼召.pdf` : 154 |
| `爱的约定.pdf` | 2 | 0 | |
| `荣耀至高神.pdf` | 2 | 0 | |

Seules les positions x des accords et des notes y sont exploitables. Les quatre
chants ont un scan 简谱 (`… 简谱.png`) : c'est la voie « scan » qui s'applique.
Correction : reclasser ces quatre entrées dans l'inventaire ; `inspect.py`
(champ `hanzi_lisibles`) doit avertir.

### 3.8 `tu-es-bon.cho` : espace perdu et faux « Refrain 2 »

- l.32 `ma vie[C]Te célèbre.` : `parseLyricLine` produit les jetons
  « sur mes lèvres, ma vie » / `C` / « Te célèbre. » → affiché « ma vieTe
  célèbre » (rejoué avec `audit-fr/parse_check.ts`). Les deux PDF ont l'espace
  (FPDF : C sur l'espace, x=251,6). Correction : `ma vie[C] Te célèbre.`
- l.18 `{start_of_chorus: Refrain 2}` : le FPDF dit « Refrain (x2) », shir.fr
  « (× 2) ». L'index en fait un second refrain (name « Refrain 2 », number
  « 2 »). Correction : `{start_of_chorus: Refrain (x2)}`.

### 3.9 `CHORDPRO_GUIDELINES.md` a perdu les glyphes 祢 / 祂 (contexte)

Vérifié le 26/09/2026 sur le fichier tel qu'il était encore dans l'arbre
(18 289 o, dernier commit `ec59e0a`) : 0 occurrence de 祢 et 0 de 祂. Au moment
où ce rapport est écrit, le chantier des guidelines l'a déjà retiré de l'arbre
(`git status` : ` D CHORDPRO_GUIDELINES.md`) ; il reste lisible dans l'historique.
La règle §1 l.8 se lisait « Nous n'utilisons plus les pronoms honorifiques divins
`你` (ou `你的`) et `他`. Tous les chants doivent utiliser … `你` … `他` », et
l'exemple l.10 « Avant : `你是我的[D]主` ➔ Corrigé : `你是我的[D]主` » : une
tautologie. Les `.cho` audités appliquent pourtant bien 祢 → 你 (安静 ×4,
只要有你在我左右, 荣耀的呼召). Ce fichier est supprimé par le chantier des
guidelines ; la règle est reprise dans `01-format-cho.md` avec les bons
glyphes. Rien à corriger dans le corpus à ce titre.

### 3.10 `au-nom-de-jesus.cho` : 36 accords sur 40 sur un autre mot que le scan

Voir § 2.10. Source basse fidélité (Word aligné par espaces) : deux conventions
de placement, pas une erreur mesurable à la syllabe. À trancher à l'oreille par
Timothée ; aucune correction mécanique.

## 4. Ordre de correction suggéré

1. **Erreurs franches** (une ligne chacune, sans ambiguïté) :
   `abba-pere` l.41 `su[D]eur` → `su[A]eur` ; `abba-pere` l.44 accord inventé
   `pou[A]rrais` ; `abba-pere` l.27 `[(A)]` sans source ; `tu-es-bon` l.32
   `vie[C]Te` ; `tu-es-bon` l.18 « Refrain 2 » ; `只要有你在我左右` l.24
   (`[C/D]` absent, `[G]` sur la ronde) et l.29 (`[D]` doublon) ;
   `荣耀的呼召` l.25–26 `Bb` → `Bb/C` ; `只要有你在我左右` l.16 pinyin « de » en
   trop ; doublon « Ta parole » (§ 3.1) ; `au-nom-de-jesus` l.2 artiste.
2. **Décalages d'une syllabe ou d'un caractère** : `oceans` l.16
   `j'invo[D]querai` ; `yahwe` l.35 `briller[D] sur` ; `一粒麦子` l.22
   `为应[Am]得的权[Dm]利` et l.17 `生[Csus4]命[C]`.
3. **Syncopes liées** (dès que `02-placement-accords.md` porte l'option B) :
   `一粒麦子` l.27 `崇[Gm]高`, `渺[F]小[(C/E)]`, l.29 `直[Gm]跑`.
4. **Structure non dépliée** : `abba-pere` intro (x2) ; `一粒麦子` pont ×2,
   D.S. et « Gm 代替 Bb » ; `我们的神` refrain final en la, levée E,
   « (我们的神！) » ; `au-nom-de-jesus` Interlude / Instrumental / Fin ;
   `tu-es-bon` interlude et accords de passage shir.fr **seulement si**
   Timothée retient cet arrangement ; les 20 `{start_of_final}` + `grid` +
   `instrumental` (§ 3.3).
5. **Thèmes** : 56 chants zh (10 mots traduisibles par table, 50 à trancher) ;
   6 thèmes fr hors liste (13 chants) ; Noël côté code ; 131 zh + `我们的神`,
   `安静`, `只要有你在我左右` sans thème du tout (§ 3.2).
6. **Forme, sans effet musical** (mécanisable, à relire) : `[X][ ]` en ligne
   chantée (160 fichiers) ; pinyin ligne suivante (11 + `爱的彰显`) ; espaces
   dans les paroles zh (`我们的神`, `安静`, `荣耀的呼召`) ; ponctuation demi-chasse
   ou différente du scan ; espaces de fin de ligne (`oceans`, `yahwe`) ;
   `Gsus` → `Gsus4` ; `[G (G/B)]`, `[Edim (C/E)]` ; libellés `副歌1` → `副歌 1` ;
   coupes de syllabe à unifier (`yahwe` ×6, `oceans` ×2, `tu-es-bon` ×3) ;
   notation d'intro unique.
7. **À l'oreille** : `au-nom-de-jesus` (36 accords) ; `yahwe` l.19 `[E]joies`.

## 5. Preuves (scratchpad de la session du 26/09/2026)

Racine : `/private/tmp/claude-501/-Users-timothee-Desktop-Site-partitions-GCCLouange/86eea5ce-6afc-429d-8d37-1a470b1a82cb/scratchpad/`
(temporaire : à copier si l'on veut les garder).

- `pdf_kinds.json` — classement des 795 PDF de `Partitions/` (fr/texte 460,
  fr/image 28, zh/image 237, zh/texte 70).
- `brief-outillage.md` — contrat des scripts `scripts/cho/*` (à venir).
- `audit-fr/` : `rapport-audit-fr.md` ; `audit_fr.py` (script d'audit) ;
  `dump_*.txt` (couche texte brute : spans, x, police, taille, couleur) ;
  `pdf_*.txt` (chaque PDF reconstruit en ChordPro avec coordonnées) ;
  `cmp_abba_fpdf`, `cmp_abba_shir`, `cmp_oceans`, `cmp_yahwe_fpdf`,
  `cmp_yahwe_shir`, `cmp_tuesbon_shir`, `cmp_tuesbon_fpdf` (`.txt` lisible +
  `.json`) — comparaisons ligne à ligne et comptes ; `render_*.png` (11 pages à
  110 dpi) ; `parse_check.ts` (`vie[C]Te` et `[ ]` dans le parseur du site).
- `audit-zh/` : `rapport-audit-zh.md` ; `match_zh.py` et ses traces
  `match_一粒麦子.txt`, `match_我们的神.txt`, `match_安静.txt` (distance
  étiquette ↔ caractère, chaque ancre) ; `verif_labels.py` + `verif_*.png`
  (boîtes de `chords.json` sur le webp) ; `ruler.py` et crops à règle
  `r_ylmz_*.png`, `z_ylmz_*.png`, `z_wmds_*.png` (syncopes, tenues, rangée 2) ;
  images de travail `*_p1.png`, `*_webp.png`, `anjing.jpg`.
- `audit-mixte/` : `rapport-audit-mixte.md` ; `dump_text_layer.py` →
  `spans_只要有你在我左右.json`, `spans_荣耀的呼召.json` ; `audit_zh_textlayer.py`
  → `match_只要有你在我左右.json`, `match_荣耀的呼召.json` ; `align_zh.py`,
  `lines03_只要有你在我左右.txt` ; `audit_fr_pixel.py` →
  `match_fr_au_nom_de_jesus.json` (40 accords, position dans le mot) ;
  `crop_fr_C1.png`, `crop_fr_R1R2.png`, `crop_fr_pont.png` ; rendus
  `zh_*_render2x.png`, `fr_*_p1.png`.

Comptes d'inventaire (§ 3) vérifiés le jour même par grep et scripts Python
inline sur `content/songs/`, `content/themes.json`, `public/songs-index.json`,
`src/lib/content/loadSongs.ts`, `src/lib/chordpro/parser.ts`,
`src/app/songs/SongListClient.tsx`, `CHORDPRO_GUIDELINES.md` (avant sa
suppression par l'autre session), et par PyMuPDF sur les PDF cités.
