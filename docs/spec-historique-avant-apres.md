# Spec : avant / après dans l'historique des setlists

Demande de Timothée, 17/09/2026 :

> « Pour le système d'historique des modifications c'est possible de mettre en
> évidence ce qui a été rajouté et enlevé par rapport à la structure
> précédente ? avoir un avant après »

Réponses du même jour : « 1. Les deux » (structure d'un chant **et** liste des
chants de la setlist) ; « 2. Je pense juste les structures, plus les notes
seulement ».

Statut : **Q1–Q4 : recommandations acceptées, go donné le 17/09/2026 ; H1–H3
codées le jour même, non commitées, à valider en local** (voir « Avancement »).

## Ce que le code montre (17/09/2026)

- Une entrée d'historique ne garde **que des phrases** (`HistoryChange`,
  `src/lib/setlist/history.ts`) : « Structure de Abba Père modifiée », « Notes
  de la setlist modifiées », « A ajouté … », « Ordre des chants modifié ». Aucun
  état d'avant ni d'après n'est gardé (`spec-setlist.md`, « Précisions de
  réalisation ») : **impossible de montrer un avant / après pour les entrées
  déjà écrites.**
- Chaque passage compare l'état de départ à l'état actuel ; des retouches à
  moins de 15 min d'écart rejoignent la même entrée (`mergeChanges` : « G → A »
  puis « A → B » donne « G → B », un retour à l'état de départ fait disparaître
  la phrase).
- Structure d'un chant : `structureOverride` = liste d'identifiants de
  sections, `null` = structure du chant. Le mode Adapter crée des copies de
  sections sous d'autres identifiants (`sectionOrigins`) et les sections
  « Dernière phrase » vivent dans `contentOverride` : **l'index des chants ne
  suffit pas à nommer toutes les sections** d'une setlist.
- Fusion : `mixedStructure` (chant + section) → phrase « Structure de A + B
  modifiée ».
- Les abréviations du bandeau existent déjà (`abbreviateSection` : I, C1, R, P,
  Pm, F, Dp…), identiques en français et en 中文, en pastilles aux couleurs des
  sections (`SongView.tsx`).
- L'historique s'écrit depuis l'éditeur (`SetlistForm.tsx`) et le mode Adapter
  (`SetlistDetailClient.tsx`).
- `firestore.rules` ne contrôle pas le contenu d'une entrée : **aucune règle à
  publier.**

## Décisions (17/09/2026)

| # | Décision |
| --- | --- |
| D1 | Avant / après pour **la structure de chaque chant** (fusions comprises) **et la liste des chants** de la setlist. |
| D2 | En plus des structures : **les notes**. Nuances, transitions, 升调, accords et paroles adaptés gardent leur phrase seule. |

## Questions (17/09/2026 : « ok pour les recommandations, go »)

| # | Question | Recommandation | Autre choix |
| --- | --- | --- | --- |
| Q1 | Quelles notes ? | **Les trois** : notes de la setlist, note d'un chant, notes de section | Notes de la setlist seulement |
| Q2 | Un chant ou une section **déplacé** | **Marqué « déplacé »** (↕), ni barré ni mis en évidence | Barré à l'ancienne place, mis en évidence à la nouvelle |
| Q3 | Ce qui est ouvert d'office | **Structures visibles tout de suite** (deux lignes courtes) ; chants et notes derrière **« Voir avant / après »** (sinon une setlist de 7 chants fait 16 lignes par entrée sur téléphone) | Tout visible tout de suite |
| Q4 | Marques | **Retiré** : barré et pâli ; **ajouté** : mis en évidence en vert (anneau autour de la pastille, fond vert pâle sur un texte) ; **déplacé** : ↕. Jamais la couleur seule : le lecteur d'écran lit « ajouté », « retiré », « déplacé » | Validées sur les captures, comme le look |

## Objectif

Dans la feuille d'historique, on voit **ce qui a été ajouté, retiré ou
déplacé**, en comparant l'avant et l'après, pour les structures, la liste des
chants et les notes. Les phrases d'aujourd'hui restent.

Réussite : Ruth retire le pont d'Abba Père et ajoute un final ; la feuille
montre :

```
Structure de Abba Père
Avant  I · C1 · R · C2 · R · P̶ · R          ← P barré
Après  I · C1 · R · C2 · R · R · (+F)       ← F mis en évidence
```

Elle ajoute ensuite « Mon Rédempteur » et remonte « Tu es là » :

```
A ajouté Mon Rédempteur
Ordre des chants modifié
Chants de la setlist   [Voir avant / après]
  Avant                 Après
  1 Abba Père           1 ↕ Tu es là
  2 Ma passion          2 Abba Père
  3 Tu es là            3 Ma passion
                        4 (+ Mon Rédempteur)
```

Les entrées écrites avant la mise en ligne gardent leurs phrases, sans
avant / après.

## Ce que chaque entrée garde en plus

Les changements concernés gagnent `from` et `to`, écrits au moment de la
modification :

| Changement | `from` / `to` |
| --- | --- |
| `structure` (chant) | abréviations, une par occurrence (pas de « ×2 ») ; `null` = structure du chant |
| `fusionStructure` | idem, chaque abréviation précédée du numéro du chant dans la fusion (« 1 R », « 2 C1 »), légende sous les lignes |
| liste des chants (nouveau changement, sans phrase à lui) | chants dans l'ordre ; une fusion compte pour un (« Abba Père + Ma passion ») |
| `notes`, `songNote` | texte |
| `sectionNotes` | par section : abréviation, texte d'avant, texte d'après |

- **Abréviations écrites telles qu'affichées ce jour-là** : l'entrée ne dépend
  plus du chant ni des copies du mode Adapter, et reste juste si le `.cho`
  change ensuite.
- **Même écriture avant et après** (identifiants différents, abréviations
  identiques, par exemple une copie faite par le mode Adapter) : pas de
  changement de structure, **la phrase disparaît aussi**. Aujourd'hui elle
  s'affiche alors que rien ne se voit.
- **Retouches regroupées** : l'avant de la première écriture, l'après de la
  dernière ; retour à l'avant = plus rien, comme les tonalités.
- **Comparaison** : dans l'ordre (plus longue suite commune). Ce qui sort de
  la suite commune des deux côtés sous le même nom est **déplacé** (Q2), le
  reste **retiré** ou **ajouté**. Notes : mot par mot, caractère par caractère
  en 中文.
- Taille : quelques centaines d'octets par entrée, très loin de la limite
  Firestore (1 Mio).

## Ce qui sera construit — trois tranches

### H1 — Structures
- `history.ts` : `from` / `to` sur `structure` et `fusionStructure` ; les
  abréviations viennent d'une fonction passée par l'appelant (index des
  chants, `contentOverride` via `itemAst`) ; fusion des passages.
- `SetlistForm.tsx`, `SetlistDetailClient.tsx` : fournir cette fonction.
- `SetlistHistory.tsx` : deux lignes Avant / Après en pastilles du bandeau,
  marques Q4 ; locales FR / 中文.

### H2 — Liste des chants
- Nouveau changement « liste des chants » (`from` / `to`), écrit quand les
  chants sont ajoutés, retirés, déplacés, fusionnés ou séparés.
- Feuille : « Chants de la setlist » + « Voir avant / après » (Q3), deux
  colonnes numérotées sur tablette et ordinateur, l'une sous l'autre sur
  téléphone.

### H3 — Notes
- `from` / `to` sur `notes`, `songNote`, `sectionNotes` (selon Q1).
- Feuille : « Voir avant / après » sous la phrase ; mots retirés barrés dans
  l'avant, mots ajoutés mis en évidence dans l'après.

## Tests (Playwright, `tests/setlist-history.spec.ts`, trois appareils)

Chaque test écrit d'abord et vu en échec ; 1 chant FR + 1 chant ZH.

- **H1** : pont retiré, final ajouté, section déplacée ; départ sur la
  structure du chant (`null`) ; retouche annulée dans le passage → rien ; deux
  retouches à moins de 15 min → avant de la première, après de la dernière ;
  copie du mode Adapter → aucune phrase de structure ; fusion avec numéros ;
  ancienne entrée sans `from` / `to` → phrase seule ; lecteur d'écran.
- **H2** : ajout, retrait, déplacement, fusion ; colonnes sur tablette et
  ordinateur, empilées sur téléphone.
- **H3** : mots ajoutés et retirés dans les notes de la setlist, d'un chant,
  d'une section ; note en 中文 caractère par caractère.
- Captures regardées sur les trois appareils, clair et sombre.

## Limites

- Toujours : les phrases d'aujourd'hui restent ; écrire l'historique ne fait
  jamais échouer l'enregistrement ; FR + 中文 ; trois appareils.
- Demander avant : avant / après des nuances, transitions, 升调, accords et
  paroles adaptés ; revenir à une version précédente (l'historique reste en
  consultation seule).
- Jamais : reconstituer l'avant des entrées déjà écrites.

## Avancement (17/09/2026)

| Tranche | État |
| --- | --- |
| H1 — Structures | Faite. 6 tests × 3 appareils, dont la copie d'une section répétée en mode Adapter (ajouté le 17/09/2026 au soir). |
| H2 — Liste des chants | Faite. 2 tests × 3 appareils. |
| H3 — Notes | Faite. 4 tests × 3 appareils. |
| H4 — Fusions (go du 17/09/2026, soir) | Faite. 2 tests × 3 appareils : le premier vu en échec avant le code (l'ancien écrivait « Structure de A + B modifiée ») ; le second (passage retiré) vu en échec avec un défaut introduit exprès (réglages comparés par position), puis code rétabli. |

`tests/setlist-history.spec.ts` : 25 tests × 3 appareils verts. Après H4 :
historique, éditeur, version perso, coup d'œil, régie : 231 tests verts ; mode
louange, tonalité recommandée, look louange, PDF, notification président
(avant H4, fichiers non touchés par H4) : 168 verts, 3 sautés par conception.

**Contre-épreuve** (copie dans le scratchpad : code actuel, fichiers du lot
remis à `68dee2f`, tests d'aujourd'hui) : les 11 tests nouveaux échouent, les
12 autres passent. « Structure remise comme avant » vérifie un comportement
déjà là avant le lot : vu en échec avec un bug introduit dans la copie
(comparer à la dernière écriture au lieu du début du passage).

**Limite acceptée par Timothée** (17/09/2026) : deux sections de même
abréviation (deux « Intro ») interverties ne laissent pas de phrase, « pas très
grave ».
Captures regardées sur ordinateur, téléphone et tablette, clair et sombre.
Lint sans erreur sur les fichiers touchés ; `tsc` ne signale qu'un type
généré périmé dans `.next` (route `notify-annonce` retirée), sans lien.

Précisions de réalisation :

- **Écrit au moment de la modification** : l'éditeur et le mode Adapter
  passent les sections des chants (index, ou version adaptée pour un chant
  adapté) ; sans elles, la phrase s'écrit seule comme avant.
- **Structure identique à l'écrit, identifiants différents** : plus de phrase.
  7 chants sur 370 ont deux sections de même abréviation (deux « Intro »,
  deux « Pont ») ; les intervertir ne laisse plus de phrase (limite acceptée).
- **Fusion (H4)** : l'ordre mélangé est traité comme un chant. « Structure de
  A + B modifiée » seulement si la structure change (avant / après) ; notes du
  mélange : « Notes de section de A + B modifiées » avec avant / après
  (sections « 1 R », « 2 C (2) ») ; nuances, transitions, 升调 du mélange :
  leur phrase seule. Réglages comparés passage par passage (« chant:section#n »),
  pour qu'un passage retiré ne fasse pas croire aux autres qu'ils ont changé.
  Activer le mélange recopie les notes des chants : « Notes de section … »
  apparaît alors aussi.
- **Déplacé** : marqué dans l'après seulement (↕). Ce qui reste dans l'ordre
  commun n'est pas déplacé : de « Abba Père, 一生爱你, Ma passion » à « Ma
  passion, Abba Père… », c'est Abba Père qui est déplacé.
- **Pastilles** : couleurs de la section du chant (comme le bandeau) ; retirée
  = pâlie et barrée en biais sur toute la pastille (une lettre seule barrée,
  « P », se lisait mal) ; ajoutée = anneau vert.
- **Notes** : mots comparés ponctuation à part (« culte, » ≠ « culte » faisait
  croire à un mot retiré puis ajouté) ; en 中文 caractère par caractère ; `del`
  et `ins`, lus « retiré » / « ajouté ». Notes de section nommées par
  l'abréviation, « R (2) » quand l'abréviation revient.
- **Chants de la setlist** : les phrases « A ajouté… », « Ordre des chants
  modifié » restent ; la ligne « Chants de la setlist » ouvre les deux listes
  (colonnes sur tablette et ordinateur, l'une sous l'autre sur téléphone).
- `SECTION_PALETTE_KEY` exporté de `SongView.tsx` pour les couleurs.

## Commandes

```bash
npm test -- tests/setlist-history.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```
