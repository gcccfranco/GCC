# Format d'un fichier `.cho`

Référence consultée depuis le runbook `00-nouveau-chant.md`. Une entrée par
table, une orthographe par entrée : ce fichier est la **seule** source de ces
conventions, `scripts/cho/lint.py` les applique telles quelles.

## Fichier

- Emplacement : `content/songs/<nom>.cho`, encodage UTF-8, fins de ligne `\n`.
- Nom : français → slug kebab du titre, sans accent (`œ` → `oe`), sans
  apostrophe ni parenthèses (`a-jamais-tu-es-saint.cho`,
  `o-jesus-mon-sauveur.cho`) ; chinois → le titre tel quel (`我能给你什么.cho`).
  Le nom devient l'adresse `/songs/<nom>` ; il existe déjà si
  `content/songs/<nom>.cho` existe.
- Un chant = un fichier, même s'il existe en plusieurs tonalités : la
  transposition est faite par le site.

## En-tête

Dans cet ordre, une directive par ligne, puis une ligne vide :

```
{title: 我能给你什么}
{title_pinyin: Wǒ néng gěi nǐ shén me}     ← chinois seulement
{artist: 赞美之泉}
{key: F}
{tempo: 67}
{language: zh}
{themes: Engagement, Action de grâce}
{youtube: https://www.youtube.com/watch?v=…}
{source: 我能给你什么 (F).pdf}
```

| Directive | Valeur | Absente de la partition |
|---|---|---|
| `title` | titre exact de la partition, en casse de phrase (capitale initiale, noms propres et pronoms divins en capitale, le reste en minuscules : `La croix seule me suffit`, `Ô Jésus mon Sauveur`), même si la partition le grave en capitales ; pronoms 你/他 | — |
| `title_pinyin` | pinyin du titre (`pinyin.py`), initiale mise en capitale à la main | — |
| `artist` | le nom sous lequel le chant est connu : l'interprète ou le groupe (Samuel Olivier, Hillsong, 赞美之泉). Les auteurs gravés (詞/曲, « paroles et musique ») ne sont repris que s'ils sont aussi l'interprète. Si la partition fournie ne nomme pas le groupe : le prendre sur une autre feuille du même chant dans `Partitions/`, ou du groupe connu de l'auteur, et le dire dans le rapport | ligne omise |
| `key` | tonalité gravée sur la partition fournie (`1= F`, case « D », « Tonalité : A ») ; majuscule, `b`/`#` ; mineure : `Am`. Rien de gravé (gravure chorale, hymnaire) : déduite de l'**armure** et de l'**accord final** (armure vide et dernier accord `Do` → `C` ; armure vide et dernier accord `Lam` → `Am` ; un bémol et dernier accord `Fa` → `F`), et toujours un `{needs_review: tonalité déduite de l'armure et de l'accord final}` dans l'en-tête | — |
| `tempo` | le `♩=` de la partition, ou la valeur donnée par Timothée | ligne omise |
| `language` | `fr` ou `zh` | — |
| `themes` | 1 à 3 `name_fr` de `content/themes.json`, séparés par `, `, **même pour un chant chinois** (le filtre du site ne reconnaît que ces noms). Critère : ce que le chant dit d'abord (à qui il s'adresse, ce qu'il affirme), thème principal en premier ; les autres thèmes défendables vont dans le rapport, pas dans le fichier | — |
| `youtube` | lien fourni par Timothée | ligne omise |
| `source` | nom du fichier dans `Partitions/` (voir « Source »), tel quel | — |
| `recommended_key` | jamais à la création : posée par Timothée après validation | — |

Une valeur inconnue s'omet ; on n'écrit ni `?`, ni une directive vide, ni un
tempo estimé, ni un lien cherché ailleurs. Un thème absent de `themes.json`
se propose dans le rapport, il ne s'invente pas dans le fichier.

## Doute écrit

```
{needs_review: la partition s'arrête au Pont sans renvoi : le retour du refrain n'est pas gravé, rien n'est ajouté}
```

Une directive `{needs_review: …}` juste au-dessus de la ligne, de la section
ou de la directive concernée, n'importe où dans le fichier (en-tête
comprise). Le parseur du site l'ignore, `lint.py` la compte, le rapport les
reprend toutes. Pas de `}` dans le texte. Une ligne `#` n'est possible
qu'**en dehors** des sections : à l'intérieur, le site l'afficherait comme
une parole.

## Sections

```
{start_of_verse: 主歌 1/Couplet 1}
…lignes chantées…
{end_of_verse}
```

| Type | Directive | Libellé fr | Libellé zh |
|---|---|---|---|
| intro | `start_of_intro` | `Intro` | `前奏/Intro` |
| couplet | `start_of_verse` | `Couplet 1` | `主歌 1/Couplet 1` |
| pré-refrain | `start_of_prechorus` | `Pré-Refrain` | `预备副歌/Pré-Refrain` |
| refrain | `start_of_chorus` | `Refrain` | `副歌/Refrain` |
| post-refrain | `start_of_postchorus` | `Post-Refrain` | `后副歌/Post-Refrain` |
| pont | `start_of_bridge` | `Pont` | `桥段/Pont` |
| interlude | `start_of_intro` | `Interlude` | `间奏/Interlude` |
| final | `start_of_outro` | `Final` | `结尾/Final` |
| tag | `start_of_tag` | `Tag` | `Tag` |

- Le libellé écrit est celui affiché ; la directive fait le type (couleur,
  identifiants des setlists). Une ligne d'accords sans paroles ni libellé
  entre deux sections est un instrumental : `start_of_intro` avec le libellé
  `Interlude`, sans doute à écrire.
- Numéro seulement s'il y a plusieurs sections du même type, séparé par une
  espace, des deux côtés du `/` : `Couplet 2`, `副歌 2/Refrain 2`.
- Suffixe entre parenthèses pour ce que la partition annote, **une seule
  fois, à la fin du libellé** : `Refrain (x2)`, `副歌/Refrain (D.S.)`,
  `副歌/Refrain (A)`. Le site l'affiche tel quel dans les deux langues (un
  suffixe posé de chaque côté du `/` s'afficherait deux fois, et les mots
  hors parenthèses de la partie française sont remplacés par le nom du
  type : `Refrain final (A)` s'affiche « Refrain (A) »).
- Le libellé `Final` sous `start_of_outro` s'affiche « Final » (« 结尾 » en
  中文) depuis le 26/09/2026 ; le type reste outro pour les couleurs et les
  setlists.
- **Structure dépliée** : l'ordre des sections est celui du chant joué.
  Reprise identique → suffixe `(x2)` ; retour (D.S., « To Chorus ») dont les
  accords ou les paroles changent → section écrite en entier avec son
  suffixe ; refrain modulé → section écrite dans la nouvelle tonalité, avec
  la tonalité en suffixe. Une section reste juste affichée **seule** : la
  levée qui ouvre un refrain va dans le refrain, pas à la fin du couplet.
- Deux rangées de paroles sous un même système = deux sections (couplet 1 et
  2), chacune avec ses accords **mesurés**, jamais recopiés de l'autre rangée.
- Deux strophes d'un même couplet séparées par une ligne vide sur la
  partition : une seule section, la ligne vide conservée.
- **Couplets empilés** (gravure d'hymne : rangées `1.` `2.` `3.` `4.` sous la
  même mélodie, souvent en italique une rangée sur deux pour la lisibilité) :
  le couplet n est la **rangée n de chaque système, mise bout à bout** dans
  l'ordre des systèmes ; ses accords sont ceux gravés au-dessus de la mélodie,
  posés sur la syllabe de sa rangée. Une phrase gravée une seule fois en gras
  à côté des rangées (« que ma bouche chante ta louange ») appartient à
  chaque couplet et s'y répète. L'italique n'est pas une autre voix.
- **Refrain des couplets empilés**, gravé une seule fois sous les rangées :
  il se chante après chaque couplet, mais s'écrit **une fois, après le
  dernier couplet**, sans `{needs_review}` (Que ma bouche chante ta louange,
  十字架 ; décision du 26/09/2026).
- Gravure à plusieurs voix (soprano, alto, ténor, basse) : seule la portée
  qui porte les paroles compte ; pas de calque.

## Lignes chantées

- Une ligne = une phrase musicale, en général un système de la partition ;
  la levée qui ouvre la phrase suivante va avec elle. Un mot ou une
  expression ne se coupe pas sur deux lignes ; les couplets successifs sont
  coupés pareil.
- L'accord s'écrit `[X]` **devant le caractère** au-dessus duquel la
  partition le met, au caractère près ; les positions déduites du rythme
  (levée, tenue, syncope) sont dans `02-placement-accords.md`. Un mot gravé
  coupé par des tirets, syllabation d'hymnaire (`Sei - gneur`, `at - ten - dons`)
  ou tiret du transcripteur (`sa - lut`), s'écrit entier, l'accord devant la
  même syllabe : `Sei[C]gneur`, `sa[F]lut`.
- Français : pronoms divins en capitale comme sur la partition (`Tu`, `Ton`),
  apostrophe droite `'`, ponctuation de la partition ; aucune espace en fin de
  ligne.
- Chinois : caractères simplifiés, 祢 → 你 et 祂 → 他 partout ; les signes de
  ponctuation gravés, écrits en pleine chasse `，。！？；：` (même si la
  partition les grave en demi-chasse) ; **aucune espace** dans les paroles
  (ni après une ponctuation, ni comme indice rythmique) ; puis 3 espaces et
  le pinyin :

```
我[F]能给你什么[C/E]，回[Dm7]应你所给的[Cm7]。   wǒ néng gěi nǐ shén me huí yìng nǐ suǒ gěi de
```

- Lignes sans paroles (intro, interlude) : les accords séparés par deux
  espaces, dans l'ordre gravé, un par accord gravé même répété :
  `[G]  [G]  [Em]  [Em]  [C]  [C]  [D]`. L'espaceur `[ ]` n'y est pas
  nécessaire et n'a pas sa place dans une ligne chantée.

## Accords

L'accord s'écrit **tel que gravé**, à l'orthographe près d'un même symbole :

| Gravé | Écrit | Gravé | Écrit |
|---|---|---|---|
| `M7`, `Maj7`, `7M`, `Δ`, `△7` | `maj7` | `°`, `o` | `dim` |
| `Maj9`, `M9` | `maj9` | `ø`, `m7(b5)` | `m7b5` |
| `sus` seul | `sus4` | `+`, `#5` seul | `aug` |
| `(b9)`, `7(b9)` | `7b9` | `add2`, `2` | tel que gravé |

- Altérations et basses telles que gravées : `Bb` reste `Bb`, `C#/F` reste
  `C#/F` (c'est une grille, pas une gravure enharmonique).
- Noms en **solfège** (gravures françaises) → lettres, suffixe conservé :
  `Do` C · `Ré` D · `Mi` E · `Fa` F · `Sol` G · `La` A · `Si` B ; `Lam` → `Am`,
  `Rém` → `Dm`, `Sib` → `Bb`, `Fa#` → `F#`, `Sol7` → `G7`. Un `.cho` n'écrit
  jamais de solfège.
- Accord entre parenthèses sur la partition (optionnel, passage) → `[(C/E)]`.
- Alternative gravée « G或G/B », « Edim 可用 C/E 代替 » → `[G (G/B)]`,
  `[Edim (C/E)]` : l'accord principal, puis l'alternative entre parenthèses
  dans le même crochet.
- Jamais de hanzi, de nom de section ni de texte dans un crochet.

## Pinyin

- Généré par `python3 scripts/cho/pinyin.py "<ligne>"` (pypinyin, mode
  phrase), puis **relu** caractère par caractère : un groupe par hanzi, dans
  l'ordre, ponctuation ignorée, tons en diacritiques, ton du dictionnaire
  (pas de sandhi : `bù`, `yī`), particules au ton neutre (`de`, `le`, `zhe`,
  `ma`, `ne`, `ba`).
- Compte : autant de groupes que de hanzi sur la ligne. `lint.py` le vérifie.
- Une lecture contextuelle qui contredit pypinyin se règle **ici**, dans la
  table que `pinyin.py` lit ; on ne corrige pas à la main dans le `.cho` sans
  l'y ajouter.

### Exceptions pinyin

| mot | pinyin |
|---|---|
| 降服 | xiáng fú |
| 模样 | mú yàng |
| 什么 | shén me |
| 哦 | ó |
| 用尽 | yòng jìn |
| 之处 | zhī chù |
| 应许 | yīng xǔ |
| 子粒 | zǐ lì |
| 不住 | bù zhù |
| 钉十架 | dìng shí jià |
| 钉死 | dìng sǐ |
| 人子 | rén zǐ |

## Source

- Une partition déjà présente dans `../Partitions/` garde son nom, quel
  qu'il soit, et c'est ce nom qui va dans `{source:}`.
- Une partition nouvelle est copiée dans `../Partitions/` sous
  `<Titre> (<Tonalité>).<ext>` : `Abba Père (A).pdf`, `我能给你什么 (F).pdf`,
  parenthèses ASCII, extension d'origine. Si ce nom est déjà pris par un
  autre arrangement du même chant, ajouter l'origine :
  `Abba Père (A, église).pdf`. Plusieurs pages ou images →
  `<Titre> (<Tonalité>) p1.jpg`, `… p2.jpg`. On n'écrase jamais un fichier.
- `check.py` lit `{source:}` pour retrouver la partition.

## Gabarits

Extraits de deux chants mesurés (26/09/2026, `check.py` : 88/88 et 31/31
exacts). Français, `Abba Père.pdf` (église) :

```
{title: Abba Père}
{artist: Samuel Olivier}
{key: A}
{language: fr}
{themes: Adoration, Grâce}
{source: Abba Père.pdf}

{start_of_intro: Intro (x2)}
[F#m]  [D]  [A]
{end_of_intro}

{start_of_verse: Couplet 1}
Bien a[F#m]vant le chant qui [D]créa l'uni[A]vers,
Bien a[F#m]vant l'Esprit qui [D]planait sur la [A]terre,
Bien a[F#m]vant que Tu me [D]formes de la pou[A]ssière,[E]
Tu rê[F#m]vais du jour où [D]Tu pourrais m'aim[A]er.
{end_of_verse}

{start_of_chorus: Refrain}
Abba [D]Père, je suis à To[A]i, Abba [D]Père, je suis à To[A]i,
{end_of_chorus}

{needs_review: la partition s'arrête au Pont sans renvoi : le retour du refrain après le couplet 2 et après le pont n'est pas gravé, rien n'est ajouté}

{start_of_intro: Interlude}
[D]  [A]  [F#m]  [E]  [D]  [A]  [F#m]  [E]
{end_of_intro}
```

Chinois, `安静 简谱.jpg` (scan 简谱, 1=D) :

```
{title: 安静}
{title_pinyin: Ān jìng}
{artist: 赞美之泉}
{key: D}
{tempo: 62}
{language: zh}
{themes: Foi, Espérance}
{source: 安静 简谱.jpg}

{start_of_intro: 前奏/Intro}
[D]  [D/F#]  [G]  [D/F#]  [A]  [D]  [G]  [D/F#]  [A7]  [D]
{end_of_intro}

{start_of_verse: 主歌/Couplet}
[D]安[D/F#]静让[G]平安入我心，深[D/F#]深知道你是我的[A]神。   ān jìng ràng píng ān rù wǒ xīn shēn shēn zhī dào nǐ shì wǒ de shén
{end_of_verse}

{start_of_chorus: 副歌/Refrain}
我不[D]害[D/F#]怕，我[G]仍然要敬拜，   wǒ bù hài pà wǒ réng rán yào jìng bài
{end_of_chorus}
```
