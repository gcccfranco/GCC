# Nouveau chant : de la partition au `.cho` (et au calque 简谱)

Point d'entrée unique. Timothée fournit une partition, la session produit
le chant sur le site. Les références : `01-format-cho.md` (format, tables),
`02-placement-accords.md` (règles, mesure, seuils), `03-calque-jianpu.md`
(page 简谱). Les décisions derrière ces règles sont dans
`docs/spec-guidelines-cho.md`.

**Doute écrit.** Tout ce qui se lit sur la partition sans se mesurer
(structure, levée, accord illisible) s'écrit : une directive
`{needs_review: …}` dans le fichier, juste au-dessus de la ligne ou de la
section concernée, et une ligne dans le rapport. Le parseur du site ignore
cette directive partout ; une ligne `#`, elle, n'est ignorée qu'en dehors
des sections et serait **rendue comme une parole** à l'intérieur. Timothée
tranche ; la session ne choisit jamais en silence. Les choix éditoriaux
(thèmes, casse du titre) se font d'après 01 et se justifient dans le rapport. Un `.cho` fini avec des
questions vaut mieux qu'un `.cho` sans questions et faux.

Toutes les commandes se lancent depuis `GCCLouange/`. Les fichiers de
travail (rendus, crops) vont dans le scratchpad de la session, jamais dans
le dépôt.

## 0. Réception

Ce qu'il faut avoir avant de commencer : le ou les fichiers de la
partition ; la langue ; la tonalité à retenir **si** plusieurs partitions du
même chant sont fournies (sinon celle de la partition) ; un lien YouTube
seulement s'il est donné. Le tempo vient de la partition (`♩=`), ou de
Timothée, sinon il manque.

La source : si le fichier est **déjà** dans `../Partitions/` (sous n'importe
quel nom), il y reste tel quel et ce nom va dans `{source:}`. Sinon, le
copier sous `<Titre> (<Tonalité>).<ext>` ; si ce nom est déjà pris par une
autre partition du même chant (autre arrangement, autre éditeur), ajouter
l'origine : `<Titre> (<Tonalité>, église).pdf`. On n'écrase jamais un
fichier de `Partitions/`.

Le slug (règle « Fichier » de 01) :

```bash
ls content/songs/<slug>.cho
```

S'il existe déjà, ce runbook s'arrête : le dire à Timothée avec le nom du
fichier trouvé. Une correction d'un chant existant se fait sur ce fichier,
avec `check.py` (étape 5) et son rapport, sur sa demande.

Fini quand : la source est dans `Partitions/` sous le nom que portera
`{source:}` et le slug est libre.

## 1. Nature de la source

```bash
python3 scripts/cho/inspect.py "../Partitions/<source>"
```

Le JSON nomme la famille et la **voie** : `texte` (PDF à couche texte : église,
shir.fr, exports Finale chinois, gravures françaises d'hymnaire), `scan-zh`
(scan 简谱), `image-fr` (scan, photo, capture d'écran). Lire les avertissements et s'arrêter dès que l'un d'eux
dit que la source ne porte pas l'information : inclinaison > 3°, étiquettes
< 15 px, hanzi illisibles sans autre source. Dans ce cas, demander un
meilleur scan à Timothée, avec le chiffre mesuré. Une source de basse
fidélité (`word-scan`, `capture-mono`) continue, mais son rapport le dira
(02, « Sources de basse fidélité »). Un avertissement « logo » sur un PDF à
couche texte ne change rien : la voie reste `texte`.

Sur une image, `inspect.py` ne distingue pas une portée à cinq lignes d'un
简谱 : c'est l'œil qui le dit à l'étape 2 (portée → pas de calque).

Fini quand : la voie est choisie et chaque avertissement a une réponse.

## 2. Lire la partition en entier

D'abord la rendre visible : un PDF se rend en PNG dans le scratchpad
(PyMuPDF, `page.get_pixmap(matrix=fitz.Matrix(2, 2))`, une image par page),
une image se lit telle quelle ; puis **Read** sur chaque page. Sur un scan,
découper en plus chaque système en un crop agrandi 2× : c'est là que se
lisent les levées, les liaisons et les caractères décalés de leur chiffre,
que `check.py` ne voit pas. Sur un PDF à couche texte, `page.get_text()`
donne les paroles et les noms d'accords, sans leur position : la position,
c'est `draft.py` et `check.py` qui la mesurent.

Une passe complète, avant d'écrire une ligne : les sections et leur ordre,
les reprises et voltas, les renvois (D.S., D.C., « To Chorus », Coda, Fine),
les deux rangées de paroles sous un même système, une seconde tonalité
(cadre, «（X调）», rangée d'accords parenthésée, prose), les accords entre
parenthèses et les notes de bas de page, les levées en fin de système, les
lignes d'accords sans paroles (intro, interlude).

Écrire le **plan déplié** en tête du rapport : chaque section dans l'ordre
joué, avec l'endroit de la partition qu'elle couvre et ce qui change au
retour (accords, paroles, tonalité). Une ligne d'accords sans libellé entre
deux sections est un `Interlude` (01) : ce n'est pas un doute. Une partition
qui s'arrête sans renvoi ne dit pas si le refrain revient : rien n'est
ajouté, et le doute s'écrit : un seul `{needs_review: …}`, avant la première
section concernée, qui nomme tous les retours possibles.
Le chant zh sur portée 五线谱 ou sur feuille d'accords : le noter, il n'aura
pas de calque.

Fini quand : chaque système de la partition est rattaché à une section du
plan, et chaque renvoi est déplié.

## 3. Écrire le `.cho`

- Voie `texte` : `python3 scripts/cho/draft.py "../Partitions/<source>" > content/songs/<slug>.cho`
  puis relire **chaque ligne** du brouillon contre la partition : l'en-tête
  (les thèmes sont à choisir, `{themes: }` vide ne passe pas `lint.py` ;
  l'artiste et le tempo s'ils manquent, la casse du titre), les libellés de
  sections, les `{needs_review}` posés par le brouillon, la ponctuation, les
  levées, les mots coupés au tiret par le transcripteur (écrits entiers).
- Voie `scan-zh` et `image-fr` : écrire le fichier à la main d'après le plan
  déplié et les gabarits de 01 ; pour le chinois, la ligne pinyin de chaque
  vers vient de `python3 scripts/cho/pinyin.py "<ligne>"`, relue caractère
  par caractère. Sur une image, le placement est provisoire jusqu'à l'étape
  5 : poser d'après les crops de l'étape 2, `check.py` mesure ensuite.
- Les `.cho` déjà dans `content/songs/` ne sont **pas** des gabarits : leur
  forme est antérieure aux règles (pinyin sur la ligne suivante, thèmes
  chinois, espaceurs). Seuls les gabarits de 01 font foi.
- Chaque accord se pose d'après 02 (« Les sept positions ») ; les
  métadonnées d'après 01 ; rien d'inventé, et chaque doute en
  `{needs_review: …}`.

```bash
python3 scripts/cho/lint.py <slug>
```

Fini quand : `lint.py` ne rend aucune ligne `E`, et chaque doute est écrit
en `{needs_review}`.

## 4. Calque 简谱 (chant zh, scan 简谱 seulement)

Suivre `03-calque-jianpu.md` de bout en bout, jusqu'au gel et au banc vert.
Il passe **avant** le contrôle du `.cho` : le calque devient la source des
positions d'accords pour l'étape 5.

Fini quand : `gold/<slug>.json` porte `verified` et `frozen_labels`, et
`PW_SLUGS=<slug> npm test` est vert.

## 5. Mesurer le `.cho` contre la partition

```bash
python3 scripts/cho/check.py <slug>
```

Le rapport classe chaque accord : exact, à relire, décalé, absent du `.cho`,
absent de la source, nom différent (seuils par famille dans 02). Corriger
tout **décalé**, **absent** et **nom différent** ; trancher chaque **à
relire** sur un crop de la zone (la ligne du rapport donne le x et le
contexte ; le crop se fait soi-même : rendu PyMuPDF 2× pour un PDF, découpe
du `.webp` pour un scan), et le transformer en `{needs_review}` si l'œil ne
tranche pas. Relancer jusqu'au code de retour 0.

« Exact » veut dire : le même caractère que la partition (02). Lire aussi
les lignes structure (voie texte : la suite des libellés lus doit être celle
du `.cho` ; scan : chaque système à paroles doit correspondre à une ligne
du `.cho`, deux rangées de paroles = deux sections), paroles (identiques,
sinon dire pourquoi) et pinyin (comptes justes, écarts avec pypinyin
expliqués ou ajoutés à la table de 01).

Fini quand : `check.py` rend 0, et la liste des « à relire » est vide ou
entièrement passée en `{needs_review}`.

## 6. Le site

```bash
npm run validate
npm run build:index
PW_CHANT=<slug> npm test -- tests/nouveau-chant.spec.ts
```

Le spec ouvre le chant sur ordinateur, téléphone et tablette, vérifie les
libellés de sections, la présence de chaque accord, la transposition d'un
demi-ton, et dépose les captures dans `test-results/nouveau-chant/` (la 简谱
aussi si le chant a un calque). **Regarder** les captures (Read) et dire ce
qu'elles montrent : une ligne trop longue, un accord qui déborde, une
section vide se voient là et nulle part ailleurs.

Fini quand : les trois commandes sont vertes et chaque capture a été
regardée et décrite.

## 7. Rapport à Timothée

Le rapport suit 02, « Le rapport » : sortie de `check.py`, plan déplié,
`{needs_review}` avec ce qu'il faudrait pour trancher, éléments de la
partition non repris, autres versions présentes dans `Partitions/`,
captures. Puis attendre ses réponses, les appliquer, et refaire 5 et 6 si
un accord a bougé ; si un **nom** d'accord a changé sur un chant à calque,
refaire aussi 03 § 4 (le calque lit contre le vocabulaire du `.cho`) avant 5.

Fini quand : il ne reste aucun `{needs_review}` dans le fichier, ou Timothée
a dit de les laisser.

## 8. Commit, sur go

Indexer **par nom** (jamais `git add -A`) : `content/songs/<slug>.cho`, et
pour un calque les cinq fichiers listés en 03 § 8. Un commit par chant ou
par lot de chants, message `content: <titre> — nouveau chant`, avec le
calque s'il y en a un. Puis `graphify update .`. Pas de branche ; David
pousse sur `origin/main` : fusionner, jamais rebaser.

Fini quand : le hash du commit est dans le message de fin, avec le nombre
d'accords mesurés et le nombre de `{needs_review}` restants.
