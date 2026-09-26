# Plan de réalisation : règles et outillage « Nouveau chant »

Spec : `docs/spec-guidelines-cho.md` (tout tranché le 26/09/2026 ; **go à
donner**). Tâches : `tasks/todo-guidelines-cho.md`. Le plan du lot 4
(`tasks/plan.md`, `tasks/todo.md`) est laissé intact.

## Vue d'ensemble

Quatre lots, un commit par lot. Le lot A écrit les règles (docs), le lot B
les rend mécaniques (scripts + spec Playwright), le lot C prouve qu'un agent
froid les suit (contre-épreuve sur deux chants existants, dans le scratchpad),
le lot D consigne les écarts du corpus pour un chantier séparé. Aucun `.cho`
existant n'est modifié.

## Décisions d'architecture

- **Le runbook est le seul point d'entrée** (`docs/chants/00-nouveau-chant.md`) :
  il ordonne les étapes et pointe vers 01/02/03 ; les tables et les seuils ne
  vivent qu'à un endroit chacun.
- **`check.py` avant `draft.py`** : la fiabilité vient du contrôle, pas de la
  génération. `draft.py` ne couvre que les PDF à couche texte (460 fr + 66 zh
  lisibles) ; pour un scan, le `.cho` s'écrit à la main et `check.py` juge.
- **Pour un scan zh, `chords.json` est la source des positions** : le calque
  se fait d'abord (recette `03-calque-jianpu.md`), puis `check.py` apparie les
  étiquettes du calque aux caractères de la bande paroles.
- **Le corpus reste tel quel** : `audit-corpus-2026-09-26.md` liste les écarts
  avec coordonnées, `check.py` servira au chantier de correction.
- Dépendances Python : `pypinyin`, `pyphen` (`pip install --user`), autorisé
  par Timothée (Q19) ; rien dans `package.json`.

## Ordre et dépendances

```
A1 format ─┐
A2 placement ─┼─→ A4 runbook ─→ A5 pointeurs ─→ [commit A]
A3 calque  ─┘
B1 inspect ─→ B2 lint ─→ B3 pinyin ─→ B4 check ─→ B5 draft ─→ B6 spec PW ─→ [commit B]
C1 contre-épreuve fr ─→ C2 contre-épreuve zh ─→ C3 corrections docs ─→ [commit C]
D1 audit corpus ─→ [commit D]
```

A et D peuvent commencer tout de suite ; B4 dépend de A2 (seuils) ; C dépend
de A et B.

## Risques

| Risque | Impact | Parade |
|---|---|---|
| `pyphen` coupe une syllabe autrement que le chant (e muet, diérèse) | accords fr au mauvais endroit | `check.py` classe « à relire » tout accord dont le label tombe à ± 1 lettre d'une frontière de syllabe ; table d'exceptions dans 01 |
| Bande paroles zh : caractères soudés, ponctuation collée | index de caractère faux | scission des amas > 1,6 × largeur médiane, contrôle du décompte contre le texte du `.cho` (méthode validée sur 3 chants) |
| PDF « zh/texte » aux hanzi illisibles (4 connus) | `draft.py` sort du bruit | `inspect.py` détecte la police sans table Unicode et bascule sur x seuls + texte à saisir |
| Une autre session travaille dans le même arbre (iCloud, doublons « 2 ») | fichiers écrasés | indexer par nom, ne commiter que les fichiers du lot |
| Le runbook est trop long pour être suivi | étapes sautées | critère de fin explicite par étape ; contre-épreuve C avec un agent froid |

## Points de contrôle

- Après A : aucune contradiction entre 00–03, `CLAUDE.md`, skill, `LOOP.md` ;
  `CHORDPRO_GUIDELINES.md` supprimé ; dossier hors repo réduit au README.
- Après B : `check.py` rejoue les 12 chants audités et retrouve les mêmes
  écarts ; spec Playwright vert 3 appareils sur `abba-pere` et `一粒麦子`.
- Après C : agent froid ≥ 98 % même syllabe sur les deux contre-épreuves, le
  reste listé dans son rapport.
- Après D : rapport relu par Timothée, aucun `.cho` touché.
