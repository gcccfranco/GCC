# Fusions et Dernière phrase (Dp) — retours du 27/09/2026

Signalé par Timothée le 27/09/2026 : « Pour les chants fusionnés, on ne peut pas afficher la
structure seule et on ne peut pas ajouter de Dernière phrase comme pour les chants non
fusionnés. Un autre problème avec le dp : affiché que dans le mode avec tous les chants,
c'est écrit *other* et pas *dp* dans la liste des chants, pas affiché quand on clique sur le
chant dans la setlist. »

Quatre décisions prises le même jour (recommandations acceptées). **Go donné le 01/10/2026**
(« Fait la spec »), codé le jour même : voir « Avancement » en fin de document.

## Diagnostic

| Symptôme | Cause |
|---|---|
| Fusion : « Structure seule » sans effet | `PartitionView` rend une fusion à structure mélangée « toujours dans l'ordre joué » ; le menu Affichage n'y est pas lu. Une fusion sans structure mélangée, elle, le suit déjà. |
| Fusion : pas de bouton « Dernière phrase » | Choix du lot 3 (`LastPhraseTarget` : « absent = pas de Dp (fusions) ») : une fusion lit les chants d'origine, sans version adaptée par chant. |
| Liste : « other » au lieu de « Dp » | `ListView` cherche les sections dans l'index du chant **d'origine**, où la Dp (qui n'existe que dans `contentOverride`) manque ; il affiche alors le type tiré de l'identifiant. David a changé le format le 26/09 (`226da23`, `start_of_other` → `start_of_Dp`) : les nouvelles Dp s'affichent « Dp » par ce détour, les anciennes restent « other », et `coup-d-oeil.spec.ts` échoue depuis. |
| Chant touché dans la liste : pas de Dp | Le lien vers `/songs/[slug]` transmet structure, notes, nuances et tonalités, **pas** `contentOverride`. La page affiche le chant d'origine ; les adaptations du mode Adapter sont perdues de la même façon. Seule la vue partitions, qui passe par `itemAst`, montre la Dp. |

## Décisions

1. **Chant ouvert depuis la setlist** : la page du chant lit la setlist (elle en reçoit déjà
   l'identifiant, `?setlist=`) et affiche la version adaptée de ce chant. Même page, même
   navigation. Le lien porte en plus la position de l'élément (un chant peut revenir deux
   fois). Sans session ou si la lecture échoue : le chant d'origine, comme aujourd'hui.
2. **Affichage d'une fusion à structure mélangée** : les trois choix du menu, comme un chant
   seul. Ordre joué (aujourd'hui), Sections uniques (chaque section une fois), Structure
   seule (le bandeau seul, pour les batteurs).
3. **Dp sur une fusion** : oui, par chant. Chaque chant d'une fusion peut porter sa version
   adaptée (`FusionSong.contentOverride`, champ nouveau et facultatif). Dans l'éditeur, le
   bouton « Dernière phrase » apparaît pour chaque chant de la fusion, en structure par chant
   comme en structure mélangée ; en structure mélangée, la Dp s'ajoute à la suite.
4. **« other »** : la liste lit les noms de sections dans la version adaptée quand il y en a
   une : « Dp » pour les anciennes comme pour les nouvelles. L'historique reconnaît les deux
   formats (`start_of_other` et `start_of_Dp`) ; `coup-d-oeil.spec.ts` est remis au format
   de David.

## Tranches (test d'abord, trois appareils, un chant fr + un chant zh)

- **T1 « Dp » dans la liste** : `ListView` résout les sections par `itemAst` ; `DP_BLOCK`
  accepte les deux formats ; test remis à jour.
- **T2 Chant ouvert depuis la setlist** : `?item=` dans le lien (chant seul et chant d'une
  fusion) ; `SongDetailClient` lit la setlist et prend la version adaptée de l'élément.
- **T3 Affichage des fusions mélangées** : `PartitionView` applique `layout` à la structure
  mélangée.
- **T4 Dp sur une fusion** : `FusionSong.contentOverride` ; rendu (`PartitionView`, PDF,
  copie des paroles, historique) par `itemAst` sur chaque chant ; boutons de l'éditeur.

## Hors lot

- Les règles Firestore ne valident pas la forme des éléments : rien à republier.
- Le mode louange reprend la vue partitions : il suit sans code à part.

## Avancement (01/10/2026)

T1 à T4 codées, plus une tranche demandée le même jour (T5). Tests :
`tests/fusions-dp.spec.ts` (21 tests × 3 appareils, chant FR Abba Père + chant ZH 一生爱你),
vus rouges avant chaque tranche ; `coup-d-oeil.spec.ts` remis au format `start_of_Dp`.
**Non commité, à valider en local.**

- **T1** : la liste lit les sections dans la version adaptée (`itemSections`, partagé avec
  l'éditeur) ; `DP_BLOCK` reconnaît `start_of_other` et `start_of_Dp`.
- **T2** : le lien de la liste porte `item` (position) pour un chant seul **et** pour un chant
  de fusion à la suite (qui ne portait jusque-là aucun réglage) ; la page du chant relit la
  setlist et parse la version adaptée. Sans session ou si la lecture échoue : le chant
  d'origine. Une fusion mélangée n'a pas de lien par chant dans la liste (inchangé).
- **T3** : la fusion mélangée suit le menu Affichage ; « Sections uniques » dédoublonne par
  chant, section et tonalité ; le bandeau porte alors notes et transitions.
- **T4** : `FusionSong.contentOverride` ; bouton « Dernière phrase » dans la carte de chaque
  chant (structure par chant) et dans l'éditeur du mélange (la Dp s'ajoute à la suite).
  Lue partout par `itemAst` : vue partitions, PDF, copie des paroles, historique (« Dernière
  phrase ajoutée à … », comme un chant seul), liste, **et mode louange** : contrairement à
  « Hors lot », `blocks.ts` a son propre code de fusion, il a fallu le changer aussi.
- **T5, idées d'harmonie sur une fusion** (Timothée, 01/10/2026 : « Absence des idées
  d'harmonies pour les chants fusionnés ») : un bouton « Idées d'harmonie · <titre> » par chant
  de la fusion ouvre la feuille de ce chant, dans sa tonalité et sa version adaptée. Elles se
  lisent ; « Essayer dans Ma version » et « Appliquer à la setlist » restent réservés aux
  chants seuls (ils modifient l'élément). Revient sur « pas de suggestions sur les fusions »
  (`spec-harmonie.md`, points complétés).

**Relecture du 01/10/2026** (deux relectures indépendantes, standards et conformité à la
spec), corrigé le jour même :

- **Une Dp retirée de la structure se jouait encore** (défaut des chants seuls depuis le
  lot 3, étendu aux fusions par T4) : la structure revenue « par défaut » s'écrivait `null`,
  et le défaut d'une version adaptée contient sa Dp. Une version adaptée écrit désormais
  toujours sa structure (`buildSetlistItems`, chant seul et chant de fusion).
- **Fusion mélangée** : la Dp va au mélange seulement, plus à la structure propre du chant
  (elle y créait un faux « Structure modifiée » dans l'historique).
- **Page du chant** : elle reprend aussi les accords retouchés sur le scan (mode Adapter).
- **Liste** : dans une fusion mélangée, chaque titre ouvre la page du chant (T2 complète).
- Tests ajoutés : Dp d'un chant chinois dans une fusion, page sans session (chant
  d'origine), Dp retirée, lien d'une fusion mélangée, retouches du scan sur la page.

Limites connues, laissées telles quelles :

- La tonalité choisie sur la page d'un chant de fusion est retenue pour ce chant dans la
  setlist (comme pour un chant seul), mais le mode louange d'une fusion ne la lit pas.
- Sur la page d'un chant de fusion mélangée, la Dp ne s'affiche pas : elle appartient au
  mélange, la page montre la structure propre du chant.
- PDF : aucun test ne lit le PDF produit ; le rendu suit `itemAst` comme la vue partitions.

