# Calque 简谱 d'une page : de l'inventaire au gel

Référence consultée depuis le runbook `00-nouveau-chant.md`, pour un chant
chinois dont la partition fournie est un **scan 简谱** (chiffres). Le site
affiche l'image du scan et redessine les accords par-dessus quand on
transpose ; ce calque se construit, se relit à l'œil et se gèle page par
page. Le pourquoi de chaque outil et l'histoire de ses pièges sont dans
`scripts/jianpu/LOOP.md` ; ici, la suite des gestes pour **une** page.

Pas de calque pour une portée à cinq lignes (五线谱) ni pour une feuille
d'accords sans chiffres : le `.cho` seul suffit, l'inventaire ne change pas.

Toutes les commandes se lancent depuis `GCCLouange/`. Quand plusieurs
sessions travaillent en même temps, poser le verrou avant chaque commande
qui écrit `chords.json` ou `scripts/jianpu/debug/` (`build-chords`,
`propose-extra`, `measure-*`, `bandes`, `freeze`) et le rendre après, planches
copiées dans un dossier à soi :

```bash
mkdir scripts/jianpu/.verrou || { echo "une autre session écrit"; exit 1; }
…
rmdir scripts/jianpu/.verrou
```

## 1. Inventaire

Ajouter l'entrée dans `scripts/jianpu/inventaire.json` (liste triée par
slug) : `slug` = nom du `.cho` sans extension, `titre`, `cle_cho` = `{key}`
du `.cho`, et **soit** `pdf` **soit** `images` (une par page, dans l'ordre),
noms tels qu'ils sont dans `../Partitions/` :

```json
{ "slug": "安静", "titre": "安静", "cle_cho": "D", "images": ["安静 简谱.jpg"] }
```

Fini quand : `python3 -c "import json;json.load(open('scripts/jianpu/inventaire.json'))"` passe et l'entrée est unique.

## 2. Image

```bash
python3 scripts/jianpu/build-images.py ../Partitions
```

Rend `public/jianpu/<slug>-p<n>.webp` et `public/jianpu/index.json`
(marges rognées, largeur ramenée à ~1 600 px : c'est **ce repère** que tout
le reste utilise, pas celui du scan). Fini quand : l'image existe, s'ouvre,
et ses étiquettes d'accords font au moins 15 px de haut (sinon demander un
meilleur scan : une définition insuffisante n'est pas une page difficile).

## 3. Lire l'en-tête avant toute mesure

Regarder la page (Read sur le webp) et noter : le cadre « 1= X » (ou « X 4/4 »,
« X=1 »), une mention «（X调）» ou « 原调 » dans le titre, une mention de série
« [共3张：D/E/F调] », un second « 1= » au milieu de la page (modulation), une
seconde rangée d'accords au-dessus des chiffres (capo, autre tonalité), une
phrase en prose qui annonce une tonalité (« 后面升Eb调 »). Si la lettre gravée
n'est pas `{key}` du `.cho`, créer `scripts/jianpu/gold/<slug>.json` avec
`"printed_key": "X"` **maintenant** : sans elle, la lecture cherche des noms
que la page n'écrit pas.

Fini quand : la tonalité gravée est écrite quelque part (`printed_key` ou
« = `{key}` » dans le rapport), et chaque annotation de tonalité est
listée.

## 4. Lecture automatique

```bash
python3 scripts/jianpu/build-chords.py <slug>
```

Découpe la page en rangées, classe (accords / chiffres / paroles), lit
chaque amas d'une rangée d'accords contre le vocabulaire du `.cho`, et
publie `public/jianpu/chords.json[<slug>]`. Fini quand : l'entrée existe et
`labels` n'est pas vide.

## 5. Compter les systèmes

C'est le seul détecteur fiable des rangées manquées, et il est manuel :
compter sur l'image les rangées de chiffres ; **chaque** rangée de chiffres a
sa rangée d'accords au-dessus. Comparer au nombre de rangées distinctes dans
`labels` (valeurs de `y`). Puis :

```bash
python3 scripts/jianpu/worklist.py                       # rangées rangées ailleurs
python3 scripts/jianpu/bandes.py <slug>                   # bandes que rien ne porte
python3 scripts/jianpu/propose-extra.py <slug> --all --hidden   # amas restants + rangées cachées
```

Fini quand : chaque rangée de chiffres comptée a des étiquettes dans
`labels`, ou est nommée dans le rapport avec sa raison (portée, seconde
tonalité, prose).

## 6. Planche, puis correctifs dans `gold/<slug>.json`

```bash
npm run jianpu:audit <slug>            # navigateur, fait foi
python3 scripts/jianpu/audit-page.py <slug>   # rendu PIL de secours, sans serveur
```

Sortie `scripts/jianpu/debug/_pw-<slug>-<n>.png` : tranches qui se
recouvrent, gravé au-dessus, transposé dessous, **cadre rouge sur chaque
accord converti**. Lire chaque tranche : **un accord sans cadre n'est pas
converti**, un accord encadré mais mal lu est un faux accord publié. Ce que
l'on écrit dans `gold/<slug>.json`, dans la **convention du `.cho`** (les noms
tels qu'ils seraient dans le `.cho`, même si la page est gravée dans une
autre tonalité) :

| Ce qu'on voit | Champ | Forme |
|---|---|---|
| accord lu faux | `corrections` | `{"x,y": "Accord"}` avec le `x,y` de l'étiquette dans `labels` |
| accord non détecté, rangée présente | `extra_labels` | `[{"x": …, "y": …, "w": …, "h": …, "c": "Accord"}]`, boîte mesurée sur le webp |
| accord gravé qui n'est pas dans le `.cho` | `extra_chords` | `["D7/G", …]` puis relire ; le `.cho` est moins précis que la gravure, la gravure a raison |
| amas qui n'est pas un accord (segno, 【Chorus】, « D.S. ») | `not_labels` | `["x,y", …]` |
| rangée entière qui n'est pas des accords | `not_rows` | `[y, …]` |
| rangée d'accords dans une **autre** tonalité (capo, seconde version) | `mask_rows` | `[y, …]` : masquée, rien n'est réécrit |
| second jeu d'accords à proposer au sélecteur | `alt_labels` / `alt`, `opt` | voir LOOP.md, itérations 54 et 64 |
| cadre « 1= X » de l'en-tête | `key_label` | `measure-keylabel.py <slug>` propose, `--pick <slug>=<n>` écrit ; confronter la lettre gravée à `printedKey` ; boîte à la main si la page écrit « X 4/4 » ou « X=1 » |
| mention «（X调）» du titre | `title_key` | `measure-titlekey.py <slug>` puis `--pick` |

Une étiquette gravée à deux tonalités (« F [E] ») reste une **composite
entière** ; une ligne d'intro ou une phrase (« 后面升Eb调 ») se traite comme
une étiquette composite : `transposeLabel` réécrit la ligne entière.

Après chaque série de correctifs : `build-chords.py <slug>` puis la planche
à nouveau. Fini quand : sur la planche, chaque accord gravé porte un cadre et
un nom juste dans la tonalité transposée, aucune rangée n'est restée dans la
tonalité d'origine, le cadre « 1= » est réécrit.

## 7. Certifier, geler, passer au banc

Écrire dans `gold/<slug>.json` la phrase `verified` : ce qui a été regardé
(tonalité de la planche, nombre de tranches, nombre d'accords et de rangées,
thèmes clair/sombre si vus), la date. Puis, **tout de suite** :

```bash
python3 scripts/jianpu/freeze.py <slug>      # fige les étiquettes relues
PW_SLUGS=<slug> npm test                     # banc : demi-ton, débordements, troncatures
```

Le banc voit ce que la planche ne montre pas (une étiquette qui déborde de
la page, une voisine effacée). Un rouge se corrige dans `gold/` (`fh` sur
l'étiquette, composite fusionnée) puis `build-chords.py <slug>`, `freeze.py
<slug>`, banc à nouveau. Fini quand : `verified` et `frozen_labels` sont dans
le gold, le banc est vert, et `python3 scripts/jianpu/worklist.py
--certifiées` ne signale rien pour la page.

## 8. Fichiers du calque à livrer

`scripts/jianpu/inventaire.json`, `scripts/jianpu/gold/<slug>.json`,
`public/jianpu/<slug>-p<n>.webp`, `public/jianpu/index.json`,
`public/jianpu/chords.json`. Rien d'autre : `scripts/jianpu/debug/` reste
hors commit.
