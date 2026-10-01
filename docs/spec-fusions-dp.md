# Fusions et Dernière phrase (Dp) — retours du 27/09/2026

Signalé par Timothée le 27/09/2026 : « Pour les chants fusionnés, on ne peut pas afficher la
structure seule et on ne peut pas ajouter de Dernière phrase comme pour les chants non
fusionnés. Un autre problème avec le dp : affiché que dans le mode avec tous les chants,
c'est écrit *other* et pas *dp* dans la liste des chants, pas affiché quand on clique sur le
chant dans la setlist. »

Quatre décisions prises le même jour (recommandations acceptées). Lot prévu la semaine
suivante (Timothée, 27/09/2026) : **attend le go**.

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
