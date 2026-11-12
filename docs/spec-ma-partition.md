# Spec : Ma partition (demande AP, chantier 1)

**Statut : spec écrite le 11/11/2026, après le « go » de Timothée sur la planche (piste A et les neuf recommandations).
Rien de codé : le go de code vient lot par lot, après lecture de cette spec.**
Cadrage : `docs/spec-pupitre-musicien.md` (§ Chantiers proposés, ligne 1 ; § Ordre recommandé, point 3).
Planche : `docs/planches/planche-ma-partition.html` (artefact privé « Planche « Ma partition » — GCC Louange »).

## Demande (Timothée, 11/11/2026, points 2 et 3)

- Fusionner « Ma version » et « Adapter » en une seule partition personnelle, partageable à des personnes choisies.
- Comme dans forScore, les annotations restent sur le chant : dans une nouvelle setlist, on retrouve la partition annotée.

## Ce que le code montre (vérifié sur la tête de branche du 11/11/2026)

- « Adapter » : `contentOverride` sur l'item de setlist (`src/types/setList.ts:63-70`), pour tous, réservé à qui peut
  modifier la setlist. « Ma version » : `setlists/{id}/versions/{uid}` (`src/lib/firebase/setlistVersions.ts`), donc
  rangée par setlist. Les deux s'excluent (`SetlistDetailClient.tsx:359-374`). Le partage est un interrupteur par
  chant, visible de tous (`PartitionView.tsx:530-540`).
- Annotations : `annotations/{uid}__{setlistId}__{pageKey}` (`src/lib/firebase/annotations.ts:5`), rangées par
  setlist et par mise en page. Une nouvelle setlist repart de zéro. La décision 18 d'AO renvoie l'accrochage au chant à
  cette migration, et AN-1 en dépend.

## Pistes de la planche

- **A. Au crayon (recommandée)** : un seul geste « Crayon » (accord, paroles, ordre, trait) ; en enregistrant, un
  responsable choisit « Pour moi » ou « Pour tout le culte du … » (l'ex-Adapter), avec « Passer au culte » pour
  rattraper. Menu « Je lis : ma partition ▾ » en tête de chaque chant (la mienne, celle du culte, celles qu'on m'a
  partagées, « Partager ma partition… »). Partage : feuille « Ce dimanche avec toi » (l'équipe du planning) puis
  recherche, une case par personne, « Inclure mes traits » éteint. Mode louange : « Annoter » devient « Crayon », et
  « Je joue » gagne une ligne « Partition ».
- **B. Le carnet** : la partition vit sur la page du chant, avec des notes de marge ; la setlist l'emprunte ; un
  responsable propose son carnet comme partition du culte.
- **C. Les calques** : des calques empilés (culte, moi, une autre personne), qu'on choisit d'afficher ; la plus chère
  (fusion par ligne, priorité, origine de chaque retouche).

Réserves de la relecture (`critique-design`, verdict « à retoucher », pas de reprise lancée) : dans la piste A, les
filets « à moi » et « pour le culte » ne diffèrent que par la teinte (environ 2,6:1) ; une parole retouchée en graphite
se lit comme un mot effacé ; les maquettes tablette et ordinateur ne sont pas à la même échelle ; quelques finitions.
Elles sont écrites dans la planche et seront reprises dans la spec.

## Questions à trancher (propositions de la planche)

1. Que devient ma retouche quand la présidence ou le `.cho` change le chant ? Proposition : des différences ligne par
   ligne ; une ligne changée des deux côtés est marquée « Le chant a changé ici » jusqu'à ce que je choisisse.
2. Une partition partagée est-elle copiée ou suivie ? Proposition : suivie, avec « Garder une copie » chez celui qui
   la reçoit.
3. Un responsable peut-il imposer sa partition à toute la setlist ? Proposition : oui, pour ce culte seulement ; la
   partition personnelle d'un autre reste la sienne.
4. Faut-il pouvoir relire le chant d'origine, sans aucune retouche ? Proposition : oui, en dernière ligne de « Je lis ».
5. Partage chant par chant ou de toutes mes partitions ? Proposition : chant par chant, avec « Partager toutes mes
   partitions avec cette personne ».
6. Les traits partent-ils avec la partition partagée ? Proposition : non par défaut.
7. La tonalité et le capo font-ils partie de Ma partition ? Proposition : la tonalité oui, par chant ; le capo reste
   réglé par appareil.
8. Sur un scan 简谱 : les accords du calque et les traits seulement ; le scan reste intouchable.
9. Libellés chinois : à faire traduire ; en attendant, libellés français.

## Décisions de Timothée (11/11/2026, « go » sur la planche)

Piste **A. Au crayon**, et les neuf propositions telles quelles (§ Questions à trancher ci-dessus) :
retouches gardées ligne par ligne contre le chant ; partage suivi, avec « Garder une copie » ; « Pour tout le culte »
pour ce culte seulement, sans écraser la partition des autres ; chant d'origine dans « Je lis » ; partage chant par
chant, plus « toutes mes partitions avec cette personne » ; traits non partagés par défaut ; tonalité dans la
partition, capo par appareil ; 简谱 : accords du calque et traits seulement ; libellés chinois à faire traduire,
français en attendant. Les réserves de la relecture (filets, graphite, échelles) sont tranchées ci-dessous (§ Signes).

## Ce qui se construit

### Rangement : un document par personne et par chant

`partitions/{uid}__{songSlug}` (nouveau module `src/lib/firebase/partitions.ts`, API REST comme le reste) :

| Champ | Contenu |
| --- | --- |
| `ownerUid`, `ownerName` | auteur (nom selon la règle d'`historyAuthor`) |
| `base` | source ChordPro sur laquelle j'ai retouché (celle du culte ou l'originale), pour la fusion ligne à ligne |
| `content` | ma source ChordPro (même forme que `VersionItem.content`) ; `null` = aucune retouche de texte |
| `structure`, `sectionOrigins`, `jianpuChords` | mêmes formes qu'aujourd'hui (`src/types/setlistVersions.ts`) |
| `key` | ma tonalité pour ce chant (Q7) ; le capo reste par appareil |
| `traits` | traits accrochés au texte (§ Traits) |
| `sharedWith` | uids des personnes à qui je la partage |
| `sharedTraits` | les traits partent-ils avec (défaut `false`) |
| `updatedAt` | horodatage |

Le choix de lecture (« Je lis ») suit le compte : `partitions/{uid}__choix`, champ `choices: { [songSlug]: "mienne" |
"culte" | "origine" | uid }`. Défaut : la mienne si elle existe, sinon celle du culte.

**Règles Firestore** (miroir client dans `src/lib/access.ts`) : écriture par le propriétaire seul (préfixe de l'id
et `ownerUid`) ; lecture par le propriétaire **ou** une personne de `sharedWith`. C'est un durcissement par rapport à
`versions/{uid}` (lu par tout connecté) : le partage à des personnes choisies l'exige. **À publier à la main par
Timothée dans la console Firebase.**

Enregistrement fiable (absorbe AN-1) : `res.ok` vérifié, `delaiMax`, file locale par compte en cas d'échec (effacée
à la déconnexion, comme `src/lib/setlist/copieHorsLigne.ts`), indicateur « Enregistré » / « En attente ».

« Pour tout le culte » (l'ex-Adapter) garde son rangement actuel, `contentOverride` et compagnie sur l'item de la
setlist (`src/types/setList.ts:63-70`), réservé à `canEditSetlist`.

### Lecture : quelle partition, et la fusion

Ordre des couches : chant d'origine (`.cho`) → retouches du culte (si la setlist en a) → ma partition. Ma partition
garde ses lignes retouchées ; toute ligne que je n'ai pas touchée suit la couche du dessous (fusion à trois sources :
`base`, source actuelle, `content`). Une ligne changée des deux côtés montre les deux versions, marquée « Le chant a
changé ici », jusqu'à ce que je choisisse (Q1). Fonction pure, testée sans navigateur.

Menu **« Je lis : ma partition ▾ »** en tête de chaque chant (page de setlist, page d'un chant, mode louange) : Ma
partition · Celle du culte · celles qu'on m'a partagées · Le chant d'origine · « Partager ma partition… ».
Il remplace le sélecteur et le badge ambre actuels (`PartitionView.tsx:30`).

### Signes (réserves de la relecture tranchées)

- Ligne retouchée par moi : filet de 2 px à gauche, graphite. Ligne retouchée pour le culte : **double filet** d'encre
  (forme distincte, pas seulement une teinte). Rien : chant d'origine.
- Une parole retouchée reste à l'encre (jamais en graphite), soulignée d'un trait fin graphite.
- En tête du chant : « Ma partition · retouchée le 2 nov. », en graphite.
- Couleurs des accords, des sections et du 简谱 : inchangées (zones gelées).

### Le Crayon

Un seul bouton « Crayon » remplace « Adapter » et « Ma version » partout où ils sont : barre large
(`SetlistDetailClient.tsx:1614-1640`), barre compacte (`:1806-1860`), menu ⋯ (`:1892-1900`), page d'un chant (à la
place de l'étincelle, rangée Vidéo · PDF), mode louange (à la place d'« Annoter »). En Crayon, barre basse : Accord ·
Paroles · Ordre · Trait, puis Enregistrer. Doigt = toucher un accord ou un mot pour le retoucher ; stylet = tracer ;
sans stylet, l'outil Trait. Pour qui a `canEditSetlist`, « Enregistrer » ouvre : « Pour moi » (défaut) / « Pour tout le
culte du … » ; une ligne enregistrée pour moi garde un lien « Passer au culte ». Mode louange : aucune animation,
entrée et sortie du Crayon comprises.

### Partage

Feuille « Partager ma partition » (feuille du bas au téléphone, popover de 380 px ailleurs) : « Ce dimanche avec
toi » (l'équipe du planning du prochain service où ce chant est joué, avec l'instrument), puis une recherche dans tous
les membres ; une case par personne ; « Inclure mes traits » (éteint) ; « Partager toutes mes partitions avec cette
personne » (ajoute l'uid à toutes mes partitions, présentes et futures : champ `partageTout` dans le document de choix).
Celui qui reçoit suit mes retouches ; « Garder une copie » les recopie dans sa propre partition. Si je retire le
partage, il revient à celle du culte, sauf s'il a gardé une copie.

### Traits accrochés au texte

Un trait s'accroche à une ancre : section, ligne, et position dans la ligne (en caractères) ; ses points sont en
unités relatives à la ligne (em), si bien qu'il suit le mot quand la ligne se recompose (téléphone ↔ tablette,
taille du texte, disposition). Un trait qui couvre plusieurs lignes est découpé ligne par ligne au tracé. Sur un
scan 简谱, l'ancre est le scan (coordonnées de l'image). Le format garde les outils du lot AO (stylo, surligneur,
épaisseurs, couleurs) ; AN-2 à AN-5 se codent ensuite sur ce rangement.

### Ce qui ne change pas

Export PDF (gelé), couleurs gelées, logo ; l'item de setlist et `contentOverride` ; les réglages par appareil autres
que la tonalité.

## Tranches proposées

| # | Tranche | Fichiers principaux | Vérification |
| --- | --- | --- | --- |
| MP-1 | Rangement : module `partitions.ts`, types, règles, `access.ts`, enregistrement fiable et file hors ligne | `src/lib/firebase/partitions.ts`, `src/types/`, `firestore.rules`, `src/lib/access.ts` | Playwright avec base simulée : écrire, relire, refus de lecture hors `sharedWith`, file rejouée au retour du réseau |
| MP-2 | Lecture : fusion à trois sources, menu « Je lis », signes (filets, souligné), tonalité dans la partition | lib de fusion, `PartitionView.tsx`, page d'un chant | tests de la fusion (ligne gardée, ligne qui suit, conflit marqué) ; captures aux quatre dispositions + 1 440 px, un chant FR et un ZH |
| MP-3 | Crayon : bouton unique, barre basse, choix « Pour moi / Pour tout le culte », « Passer au culte » | `SetlistDetailClient.tsx`, `EditLineSheet.tsx`, page d'un chant | un musicien retouche → visible dans une autre setlist ; un responsable enregistre pour le culte → visible des autres, leur partition intacte |
| MP-4 | Partage : feuille, équipe du dimanche, recherche, traits, toutes mes partitions, copie | nouvelle feuille, `partitions.ts` | deux comptes fictifs : partage, suivi, copie, retrait |
| MP-5 | Traits accrochés + Crayon du mode louange + ligne « Partition » sous « Je joue » | `useAnnotationsPage.ts`, `PerformanceMode.tsx`, `src/lib/annotations/` | un trait sur « hosanna » reste sur le mot du téléphone à la tablette ; retrouvé dans une nouvelle setlist ; aucune animation |
| MP-6 | Reprise de l'existant (§ Questions ouvertes) | script de migration ou lecture de repli | selon la réponse |

Taille : L (six tranches). Comme le veut le CLAUDE.md, le go de code se donne à une session orchestratrice neuve.

## Questions ouvertes (à trancher avant MP-6, pas avant MP-1)

1. **Les « Ma version » existantes** (par setlist) : je propose que la plus récente de chaque chant devienne ma
   partition à la première ouverture, les autres restant lisibles dans leur setlist jusqu'à leur retrait.
2. **Les annotations existantes** (en pixels, par setlist et par mise en page) : on ne peut pas les accrocher au texte
   de façon fiable. Je propose de les laisser visibles dans leur setlist, en lecture seule, avec « Les recopier dans
   ma partition » (copie posée à la première ligne de la page, à repositionner), puis de les retirer après un mois.
3. **Partage de la setlist entière** : l'ancien interrupteur « Partager ma version » (visible de tous) disparaît-il
   sans remplaçant ? Je propose oui : le partage se fait à des personnes choisies.

## Avancement

- 11/11/2026 : code relu, six captures de l'existant (setlist sur trois appareils, chant au téléphone, mode louange
  au téléphone et à la tablette), un seul lancement du workflow `planche` (trois agents). J'ai corrigé l'étiquette
  « Piste décidée » de B et C, ajouté la question 4 et les réserves à la planche. Publiée en artefact privé.
  Questions posées à Timothée dans la session « AP · Planche Ma partition ». Suite : ses réponses, puis la spec
  (tranches, accrochage des traits au texte, migration des documents `versions` et `annotations`, règles Firestore à
  publier à la main).
- 11/11/2026 (suite) : « go » de Timothée sur la planche (piste A, neuf recommandations). Spec écrite (§ Décisions,
  § Ce qui se construit, § Tranches). Restent trois questions ouvertes pour MP-6 ; le go de code n'est pas donné.
- 11/11/2026 (soir) : « go pour le lot MP » de Timothée. Session orchestratrice lancée (« AP · Lot MP « Ma partition » (orchestratrice) ») pour MP-1 à MP-5 ; MP-6 attend les réponses aux trois questions ouvertes.
- 11/11/2026 (nuit) : lot MP en attente, règle des trois chantiers (demande de la session principale AP). MP-1 avait démarré : rien de commité, le travail partiel reste dans la copie de travail de la session orchestratrice (non poussé). Reprise au début de MP-1, après `git pull --rebase` (la vue Partitions aura changé).
- 12/11/2026 : la spec d'AO avait reçu, sur une autre branche, un go pour AN sur l'ancien rangement (vague 3
  enchaînée). Branches réunies ; AN est suspendu dans la spec d'AO jusqu'à MP-5, comme le veut cette spec.
- 12/11/2026 : à suivre en MP-5 : FS-F (AO, en cours) affiche les traits pendant la demi-page (`DemiPage.tsx`, calque
  `StrokesLayer`) depuis l'ancien rangement ; ce calque est à porter sur le nouveau avec le reste.
- 12/11/2026 : décision déléguée (pilote, 12/11) : « reprends » envoyé à la session orchestratrice du lot MP pour
  MP-1. Motif : go du lot donné par Timothée le 11/11 au soir ; la troisième place de code est libre (FS-F d'AO et
  les deux exemples tournent) ; ce lot débloque AN. Questions et fin de lot : à la session de pilotage
  (`docs/feuille-de-route.md`, § État).
- 12/11/2026 : **MP-1 faite** (rangement). `partitions/{uid}__{songSlug}` et `{uid}__choix` (`src/lib/firebase/partitions.ts`, `src/types/partition.ts`) ; file locale par compte (`src/lib/partition/fileEnAttente.ts` : échec passager en file, refus remonté, écritures d'un compte en série pour qu'un rejeu lent n'écrase pas une version plus récente, file effacée avec les copies hors ligne au changement de compte) ; droits en double (`canLirePartition` / `canEcrirePartition`, bloc `match /partitions/{id}`). Relecteur « à corriger » (course au rejeu, file partagée entre comptes, 408/429, cycle d'import, id `__choix`), corrigé et couvert par deux tests de plus ; tsc, lint et 231 tests verts (trois appareils, avec `acces-regles` et `setlist-hors-ligne`). Raccourci noté : la base simulée ne filtre `where` que pour `partitions`. Pour MP-2 : `window.__gccPartitions` (hors production, `auth.ts`) est un accès de test à retirer quand l'interface existera. **`firestore.rules` à publier à la main par Timothée** (le bloc `partitions` ; sans lui, les partitions sont refusées en ligne).
