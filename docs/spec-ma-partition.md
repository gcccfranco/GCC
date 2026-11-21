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

**Décisions déléguées (session MP-4, 12/11)**, à corriger par Timothée d'un mot :
- « Partager ma partition… » est la dernière entrée du menu « Je lis », offerte seulement si j'ai une partition pour
  ce chant (rien à partager sinon ; « toutes mes partitions » couvre les suivantes).
- Chaque case s'enregistre aussitôt (pas de bouton « Valider »), par la même file que les retouches.
- « Ce dimanche avec toi » : le service de la setlist ouverte ; sur la page d'un chant ouverte hors setlist, la
  première setlist à venir (`getSetlistsFrom`) qui contient le chant ; noms du planning (`equipeDuService`) appariés
  aux comptes par `planningName`, moi exclu, avec le libellé du rôle (l'instrument du musicien quand la case le dit).
  Sans service à venir ou sans planning : la section ne s'affiche pas, la recherche reste.
- « Partager toutes mes partitions avec cette personne » : ajoute l'uid à `partageTout` et au `sharedWith` de toutes
  mes partitions présentes ; une partition **neuve** reçoit `partageTout` à sa création. Décocher retire l'uid des
  deux. Décocher une seule partition laisse `partageTout` tel quel (la case du chant prime pour ce chant).
- « Garder une copie » : sous le menu, quand je lis une partition partagée ; la copie (base, texte, structure,
  tonalité, traits si partagés) devient ma partition et mon choix passe à « Ma partition ». Si j'en ai déjà une
  retouchée, une confirmation la remplace.
- Les anciennes « Ma version » partagées (`versions/{uid}`, visibles de tous) restent en l'état jusqu'à MP-6
  (§ Questions ouvertes, 3) ; le test sauté de `setlist-version.spec.ts` est retiré, le partage se teste dans
  `tests/ma-partition-partage.spec.ts`.
- Clé de comptage `cmd.chant.partagerPartition`, comptée à l'ouverture de la feuille.

### Traits accrochés au texte

Un trait s'accroche à une ancre : section, ligne, et position dans la ligne (en caractères) ; ses points sont en
unités relatives à la ligne (em), si bien qu'il suit le mot quand la ligne se recompose (téléphone ↔ tablette,
taille du texte, disposition). Un trait qui couvre plusieurs lignes est découpé ligne par ligne au tracé. Sur un
scan 简谱, l'ancre est le scan (coordonnées de l'image). Le format garde les outils du lot AO (stylo, surligneur,
épaisseurs, couleurs) ; AN-2 à AN-5 se codent ensuite sur ce rangement.

**Décisions déléguées (session MP-5, 12/11)**, à corriger par Timothée d'un mot :
- **Où** : les traits se tracent et se lisent au mode louange (le pupitre, là où vivaient les annotations d'AO). La
  barre du Crayon de la page de setlist et de la page d'un chant reste Accord · Paroles · Ordre : tracer au doigt sur
  une page qui défile se bat avec le défilement. Au mode louange, le Crayon trace seulement (stylo, surligneur, gomme,
  annuler, loupe d'AO) ; retoucher accords et paroles se fait sur la page de setlist. Réversible : l'outil Trait pourra
  s'ajouter à la barre plus tard.
- **Ancre** : `slug` implicite (le document), `section` = id de la section du chant (`ChordProSection.id`), `ligne` =
  rang de la ligne dans la section, `car` = rang du caractère des paroles (accords et pinyin non comptés) le plus
  proche du début du trait ; points et épaisseur en em de la ligne. Une section jouée plusieurs fois montre ses traits
  à chaque passage ; gommer un passage gomme le trait (le champ `passage` d'UP-1 a été retiré le 21/11/2026). Scan
  简谱 : `{ scan: true, image }`, points en fraction de la largeur de l'image.
- **Quels traits** : les miens, toujours (c'est moi qui joue), plus ceux de la partition partagée que je lis si son
  auteur a coché « Inclure mes traits » (lecture seule : ma gomme ne les touche pas). Tracer écrit toujours ma
  partition (créée au besoin, texte inchangé).
- **Anciennes annotations** (par setlist et par page) : affichées comme avant, en lecture seule, jusqu'à MP-6 ; plus
  rien ne s'y écrit.
- **« Partition » dans « Je joue »** : dernière rubrique, les choix du menu « Je lis » du chant affiché (Ma partition ·
  Celle du culte · partagées · Le chant d'origine), en boutons radio comme les autres rubriques ; ni « Partager… » ni
  « Garder une copie » (ils restent sur la page de setlist).
- Le mode louange montre aussi les signes de MP-2 (filet, double filet, souligné), laissés de côté en MP-2.

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

**Réponses de Timothée (12/11/2026, 17 h UTC)** :
1. « Pas besoin » : les anciennes « Ma version » ne sont **pas** reprises dans « Ma partition » (aucune conversion à la
   première ouverture). Confirmé par Timothée (« Elles restent lisibles ») : elles restent lisibles dans leur
   setlist jusqu'à leur retrait, sans migration.
2. « Ok » : proposition retenue (lecture seule dans la setlist, « Les recopier dans ma partition », retrait après un mois).
3. « Oui » : l'interrupteur « Partager ma version » disparaît sans remplaçant.
**Go de Timothée pour MP-6 (12/11/2026, « Oui go pour MP6 »)** : inscrit dans la file, après AN.

## Un passage ou tous (Timothée, 21/11/2026) — go du 21/11/2026

> **CORRECTION du 21/11/2026, 17 h 50 UTC — elle l'emporte sur tout ce qui suit dans cette section.**
> Timothée : « Alors on a un problème de compréhension entre nous, les sections c'est seulement pour le mode crayon
> pas le dessin les annotations ». La session d'origine avait confondu le **Crayon** (Accord · Paroles · Ordre,
> `BarreCrayon.tsx`) avec le stylo des annotations. La règle « un passage ou tous » ne vaut **que pour les accords et
> les paroles retouchés au Crayon**. Les dessins et annotations (traits, surligneur, texte, tampons) **ne changent
> pas** : accrochés à la section, montrés à chaque passage, comme décidé le 11/11.
> Confirmé par Timothée (« Oui ») : **UP-1 annulée** (code retiré par un commit d'annulation), **UP-2 abandonnée**
> (arrêtée avant tout commit), **UP-3 gardée**, **UP-4 gardée, limitée au Crayon**. Les questions 2, 3 et 6
> (dessins) n'ont plus d'objet ; aucun champ `passage` dans l'ancre d'un trait.


**Demande (ses mots)** : « quand j'utilise la fonction "crayon" et que je modifie une section, ça modifie pour toutes
les sections or ce n'est pas ce que je veux » ; « pour les paroles aussi il faut que ce soit comme ça si je veux
modifier les paroles d'une seule section ou bien l'appliquer à toutes les sections ».

**Ce que le code fait (vérifié le 21/11)** :
- *Dessins* (trait, surligneur, texte, tampon) : l'ancre est `{ section, ligne, car }`, `section` = id de la section
  du chant ; le dessin se montre donc à chaque passage de la section (§ « Traits accrochés au texte », décision du
  11/11). Aucun choix n'est proposé.
- *Accords et paroles* : la feuille d'une ligne propose « Toutes les répétitions | Seulement ce passage »
  (`EditLineSheet`, `repeatScope`), « Toutes » choisi d'avance, et seulement sur la page setlist
  (`SetlistDetailClient.tsx:2559`) quand le plan répète la section (`repeatedSectionId`). « Seulement ce passage »
  copie la section (`materializeMine`, `sectionOrigins`). La page chant ne passe pas ce choix à la feuille.

**Proposition** (une règle, les deux gestes) : *ce que je fais au Crayon vaut pour le passage que je touche ; je
peux l'étendre à toutes les répétitions.*
- Dessins : l'ancre gagne un champ facultatif `passage` (rang du passage de la section dans l'ordre lu, 0 = le
  premier). Présent : le dessin ne se montre qu'à ce passage. Absent : à tous (c'est le format d'aujourd'hui).
- Accords et paroles : le choix de la feuille s'affiche partout où la section revient ; il ne change pas de forme.

**Questions (la proposition en premier)** :
1. *Choix d'avance* : « Seulement ce passage », pour les dessins comme pour le texte (c'est « Toutes » qui a
   surpris). Autre voie : garder « Toutes » d'avance pour le texte.
2. *Étendre un dessin à tous les passages* : un bouton « Ce passage | Toutes les répétitions » dans la barre du
   Crayon, lu au moment de tracer. Autre voie : pas de bouton, un dessin vaut toujours pour son passage.
3. *Dessins déjà faits* : ils n'ont pas de `passage`, donc restent sur tous les passages ; rien n'est converti.
   Autre voie : les ramener au premier passage (perd des dessins voulus partout).
4. *Ordre « Une fois chacune » ou « Plan »* (chaque section montrée une seule fois) : ce qu'on y fait vaut pour
   tous les passages, sans choix (on ne voit pas de passage). Autre voie : le premier passage.
5. *Page chant, hors setlist* : même choix pour le texte si le chant répète la section ; à vérifier par
   l'orchestratrice (la copie de section existe pour la setlist, pas encore pour « Ma partition » seule).
6. *Gommer* : la gomme enlève le dessin là où il vaut (son passage, ou tous).

**Réponses de Timothée (21/11/2026)** : questions 1, 2 et 3 : « ok » (la proposition). Question 4 : pas la
proposition ; ses mots : « quand c'est une fois chacune ou plan mettre une petite note et ajouter la section je sais pas
si tu vois ce que je veux dire ». Lecture à lui faire confirmer avant tout go : dans ces deux ordres, un passage
retouché seul s'ajoute comme une section à part, avec une petite note qui dit de quel passage il s'agit.
Questions 5 et 6 : sans réponse, la proposition tient.
**Question 4 tranchée (Timothée, 21/11, « oui » deux fois)** : avec l'ordre « Une fois chacune » ou « Plan »,
- un passage retouché seul s'ajoute à l'écran comme une section à part, sous la section normale, avec une petite note
  qui dit de quel passage il s'agit (« Refrain · 2ᵉ fois ») ; la section normale reste montrée une fois pour les autres ;
- dans la structure (la rangée des pastilles C R P…), une note marque le passage concerné (« on ajoute une note pour
  dire que c'est pour ce refrain là ») ;
- comme on ne voit pas quel passage on touche, le Crayon montre la structure et demande pour lequel (« on affiche la
  structure et on demande c'est pour quelle Refrain, Couplet, Pont ») : on touche la pastille du passage, ou « Toutes ».
**Go de Timothée pour le lot (21/11/2026, « go pour les deux »)**, sessions Opus en parallèle (« tu lances des
sessions en parallèle, avec opus en orchestrateur »).

**Tranches** (une session par tranche, `CLAUDE.md` § Coder ; chacune écrit sa ligne dans § Avancement) :
- **UP-1 — Dessins par passage** : champ facultatif `passage` dans l'ancre (`src/types/partition.ts`, calculs
  `src/lib/annotations/ancres.ts`), écrit au tracé d'après le passage touché, lu au rendu (absent = tous les
  passages), gomme (question 6). Page setlist, page chant, mode louange, ordre « Tout le chant ». Scans 简谱 : inchangés.
- **UP-2 — Le choix dans la barre du Crayon** : « Ce passage | Toutes les répétitions » (`BarreCrayon.tsx`, barre
  d'annotation du mode louange), « Ce passage » d'avance (questions 1 et 2), montré seulement si la section revient.
- **UP-3 — Accords et paroles** : « Seulement ce passage » d'avance (question 1) ; le choix de la feuille montré
  aussi sur la page chant quand le chant répète la section (question 5 : dire dans § Avancement si la copie de
  section pour « Ma partition » seule demande plus qu'une tranche, et s'arrêter là dans ce cas).
- **UP-4 (telle que corrigée le 21/11, Crayon seulement)** : avec l'ordre « Une fois chacune » ou « Plan », quand on
  retouche un accord ou une parole au Crayon dans une section qui revient, la feuille montre la structure (les
  pastilles du plan) et demande pour quel passage (on touche la pastille, ou « Toutes les répétitions ») ; le passage
  retouché seul s'ajoute à l'écran comme une section à part, sous la section normale, avec une petite note qui dit
  lequel (« Refrain · 2ᵉ fois ») ; dans la structure, une note marque ce passage. Pages setlist et chant (là où UP-3
  a mis le choix). Change l'apparence : captures aux quatre dispositions, `critique-design` après la tranche.
  *Texte d'origine, remplacé par ce qui précède :*
- **UP-4 — Ordres « Une fois chacune » et « Plan »** (question 4) : le Crayon montre la structure et demande le
  passage ; le passage retouché s'ajoute comme section à part avec sa note ; note sur la pastille de la structure.
  Change l'apparence : captures aux quatre dispositions, `critique-design` après la tranche.
Ordre d'origine : UP-1 puis UP-2, UP-3 à part, UP-4 après. Depuis la correction : il ne reste qu'UP-4, après UP-3.
**Fin du lot** (Timothée, 21/11, « Oui ») : la session qui pousse UP-4 lance ensuite la session **R5b** (tests déjà
rouges du mode louange et des annotations : `docs/spec-retouches-2026-11-21.md`, § R5 ; même branche, Opus, consigne :
lire `CLAUDE.md` puis ce § R5, une tranche, ligne d'Avancement dans ce fichier-là), puis s'arrête.

**UP-5 — Finitions d'UP-4** (go de Timothée du 21/11 soir, sur la liste des restes : « Go pour corriger tout ça ») :
Crayon seulement, aucun dessin touché. (1) Le badge « retouché seul » et le numéro de position ne se chevauchent
plus au coin d'une pastille de la structure (les trois ordres, les cinq largeurs). (2) En « Tout le chant » sur la
page setlist, la pastille de ma copie porte aussi le badge dans la rangée de structure (`SongView.tsx`, le
`shortcut:` de la rangée) ; si c'est impossible sans décision nouvelle, le dire ici et s'arrêter sur ce point.
(3) Thème sombre et interface en 中文 : capturer la feuille « Pour quel passage ? », la section « Refrain · 2ᵉ fois »
et la rangée de structure, les regarder, corriger ce qui cloche (contraste du badge, libellé coupé). (4) Libellés
zh-CN (`改哪一次？`, `第{{n}}次`, `单独修改`) : vérifier qu'ils s'accordent avec les mots déjà employés dans
`zh-CN.json` (`所有重复`, `nthTime`) ; la relecture par un sinophone reste à Timothée.

**UP-6 — Souligné d'une parole retouchée, lignes chinoises** (go de Timothée du 21/11, nuit : « Go fait tout en même
temps ») : sur une ligne chinoise, le trait fin graphite d'une parole retouchée (`globals.css`,
`[data-retouche="paroles"]`) tombe entre les caractères et le pinyin. Quand le pinyin est affiché, le trait passe sous
le pinyin (sous la ligne entière) ; sans pinyin, et sur une ligne française, rien ne change. Retouche (CSS et un test).

Format : `passage` est facultatif, une version ancienne du site l'ignore et montre le dessin partout
(§ « Compatibilité du format », AN-4). `firestore.rules` : à relire, le champ est dans `traits` (liste libre).

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
- 12/11/2026 : passage de main (plafond de contexte de l'orchestratrice, avant MP-2). Une orchestratrice neuve reprend à MP-2, sur la même place de code. Note pour elle : une session lancée hors du dossier du dépôt ne charge pas les agents de `.claude/agents/` (« agent type 'executant' not found ») ; la lancer avec le dépôt en source, ou envelopper les rôles dans `general-purpose` avec la fiche de l'agent et son modèle.
- 12/11/2026 : **MP-2 faite** (lecture). Fusion à trois sources, fonction pure (`src/lib/partition/fusion.ts`, `lecture.ts`) ; menu « Je lis : … ▾ » (`src/components/partition/MenuJeLis.tsx`) à la place du sélecteur et du badge ambre, page de setlist et page d'un chant ; signes (`--graphite`, filet de 2 px, double filet du culte, parole soulignée) par `data-marque` sur les lignes de `SongView` ; conflit « Le chant a changé ici » avec « Garder la mienne » / « Prendre celle du chant » ; `suivreLaFile` branché à la connexion ; « · En attente » dans la ligne graphite. Décisions d'orchestratrice (déléguées) : les anciennes « Ma version » restent lisibles dans le menu, groupe « Dans cette setlist », jusqu'à MP-6 (aucune perte avant la migration) ; tonalité de ma partition par défaut sur la page d'un chant, enregistrée seulement quand je lis la mienne (regroupée, 800 ms), la tonalité de la setlist prévalant dans une setlist ; accord retouché sans changement de graisse (les accords sont déjà en gras : 600 l'aurait allégé). Relecteur « à corriger » (choix réécrit sans relecture, état d'un autre compte, tonalité), corrigé. Tests : `ma-partition-lecture` 85/85 (cinq projets), `setlist-version` 57/57 (aide `basculerMode` en nom exact, écriture attendue), `harmonie-ma-version` et `ma-partition-rangement` verts ; tsc et lint propres. Captures regardées aux quatre dispositions et à 1 440 px. Restent : `window.__gccPartitions` jusqu'à MP-3 ; mode louange sans signes (MP-5) ; souligné et filet à la ligne entière, pas au mot ; en chinois le souligné touche aussi le pinyin (à revoir avec le `critique-design` de MP-3) ; hors ligne, ma partition non relue (chant d'origine affiché). Aucune modification de `firestore.rules`.
- 12/11/2026 : **MP-3 codée, NON VÉRIFIÉE** (commit « Ma partition, MP-3 : le Crayon (non vérifiée, à tester et relire) »). Le workflow `/tranche` a été coupé par la limite de dépense du mois après le premier tour de tests et une correction : la seconde passe du testeur, le relecteur, les captures et le `critique-design` n'ont pas tourné ; `tsc` passe. Puis Timothée a demandé que la suite parte dans une session neuve (pilote, 12/11). **Contenu** : un seul état `crayon` remplace `editPartitions`/`editMine` (`SetlistDetailClient.tsx`) ; bouton « Crayon » (barre large, compacte, menu ⋯ sous 431 px), offert à tout connecté ; barre basse `src/components/partition/BarreCrayon.tsx` (Accord · Paroles · Ordre · Terminé) ; choix « Pour moi / Pour tout le culte du … » `ChoixDestination.tsx` pour `canEditSetlist` (Pour tout le culte = `persistOverride`) ; « Pour moi » écrit `partitions/{uid}__{slug}` (`versions/{uid}` n'est plus écrit) ; « Passer au culte » (`passerAuCulte`, `rangDansLaCourante` dans `fusion.ts`, lien sous les lignes `moi` dans `SongView`) ; page d'un chant : Crayon dans `ActionsChant.tsx`, toujours Pour moi ; `window.__gccPartitions` retiré, `ma-partition-rangement` réécrit par l'interface ; nouveau `tests/ma-partition-crayon.spec.ts` (dans `SPECS_GRAND_ECRAN`) ; une vingtaine de specs adaptées à « Crayon » via `tests/helpers/menuSetlist.ts` (`choisirDestination`). **Décisions d'orchestratrice** (déléguées) : retouche enregistrée à la validation de la feuille de ligne, la barre finit par « Terminé » (pas de brouillon en bloc) ; pas d'outil Trait ni de Crayon du mode louange avant MP-5 ; l'étincelle de la page d'un chant reste (c'est « Idées d'harmonie », pas l'ancien bouton d'édition), le Crayon s'ajoute à côté ; retoucher en lisant une partition partagée écrit la mienne. **Raccourcis notés par l'executant, à juger** : feuille de choix en feuille du bas à toutes les tailles (la spec dit popover hors téléphone) ; page d'un chant ouverte depuis `?setlist=` sans « Pour tout le culte » ; « Ordre » écrit Pour moi seulement (la structure du culte perdrait notes, transitions et nuances clés par `${id}-${index}`) ; « Accord » ne cible pas l'accord touché ; badges ambres, puces « Sections » et « Partager ma version » retirés (test de partage en `test.skip` jusqu'à MP-4) ; « Pour tout le culte » refuse une ligne qui n'existe que chez moi ; retoucher pendant un conflit inscrit les deux versions dans mon contenu. **Pièges** : le workflow coûte cher (≈ 520 000 jetons d'agents pour MP-3 jusqu'à la coupure) ; `.next/dev/types` à supprimer si tsc s'y plaint ; `next-env.d.ts` à remettre avant chaque commit. **Pour la session neuve** : faire passer le testeur sur `ma-partition-crayon`, `ma-partition-rangement`, `ma-partition-lecture` et toutes les specs adaptées (`git diff --name-only 9a636da -- tests`), puis le relecteur, les captures (quatre dispositions + 1 440 px) et le `critique-design` (et le souligné du pinyin en chinois noté en MP-2), avant MP-4.
- 12/11/2026 : **MP-3 vérifiée et corrigée** (session neuve). Testeur : 21 specs sur cinq projets, 1 417 cas, 15 échecs en 37,6 min (+ 5,2 min de relance) ; second tour sur les specs en échec et les voisines des corrections, 587 passés, 1 échec en 17 min ; dernier tour ciblé (`setlist-history` H1, `adapter-sections`, `harmonie-ma-version`, `ma-partition-crayon`, `ma-partition-lecture`) : 162/162 en 4,5 min. tsc et lint propres (0 erreur). Relecteur « à corriger », sans bloquant ; `regard` sur 25 captures, `critique-design` sur douze, quatre retouches faites ; captures regardées aux quatre dispositions et à 1 440 px, FR (Abba Père) et ZH (一生爱你). **Corrections** : Crayon en icône seule dans la rangée de la page d'un chant (son libellé faisait tomber celui d'« Accords » à 1 440 px) ; étiquette « Pinyin » reliée à son champ (`EditLineSheet`) ; la feuille de la ligne se ferme avant « Enregistrer la retouche » (les deux feuilles s'empilaient ; « Annuler » laisse la retouche de côté) ; « Tous les passages / Seulement ce passage » vaut aussi pour le culte (test H1 adapté : il demande « Seulement ce passage ») ; souligné posé sur le seul texte des paroles (plus sous les blancs des accords ni sous le pinyin, la réserve de MP-2) ; barre basse ancrée en bas sur fond opaque (plus de jour entre elle et la barre d'onglets) ; « Passer au culte » à 44 px de haut sans chevauchement, icône, sans souligné ; bandeau du Crayon opaque, texte plein ; radios à l'encre ; bloc `maPartition` traduit en chinois (`zh-CN.json`, il était en français depuis MP-2) ; clé de comptage `cmd.chant.partagerVersion` retirée du registre et de l'inventaire de `docs/spec-comptage-usage.md` (la commande n'existe plus ; le partage de MP-4 aura sa clé, décision déléguée du pilote, 12/11) ; tests adaptés (`look-louange` six boutons, `harmonie-jianpu` à ±4 px près de l'arrondi du clic). **Décisions déléguées (session MP-3, 12/11)** : ci-dessus, Crayon en icône, feuille fermée avant le choix, choix des passages valable pour le culte. Le raccourci « feuille de choix en feuille du bas à toutes tailles » n'en est pas un : le popover de 380 px est celui du Partage (MP-4). **Reste noté** : `jianpu-integration` « L3-T5a annotations » instable (clé `j2`/`j3` au lieu de `j4-…`, appareils changeants), mode louange que MP-3 ne touche pas : à revoir en MP-5 ; pilules inactives de la barre basse au contraste juste (4,67:1) ; souligné haché caractère par caractère en chinois ; « Accord » ouvre la ligne, pas l'accord touché (MP-5 avec le Trait) ; page d'un chant ouverte depuis une setlist sans « Pour tout le culte » ; code mort à retirer en MP-6 (`canHaveSetlistVersion`, `withMineItem`, `myStructureOf`, clés `setlists.myVersion.*` et `setlists.contentEdit.toggle/hint`) ; une ancienne « Ma version » perd sa structure quand une partition neuve existe pour le chant (MP-6) ; avant toute mise en ligne, les partages `versions/{uid}` déjà faits ne se retirent plus jusqu'à MP-4. Aucune modification de `firestore.rules`.
- 12/11/2026 : **MP-4 faite** (le Partage). Entrée « Partager ma partition… » dans le menu « Je lis » (seulement si j'ai une partition), feuille du bas au téléphone, popover de 380 px ailleurs (`src/components/partition/PartagerMaPartition.tsx`) : « Ce dimanche avec toi » (équipe du service, moi exclu), « Déjà partagée avec », recherche (8 résultats au plus), « Inclure mes traits », « Partager toutes mes partitions avec cette personne » ; chaque case s'enregistre aussitôt (`useMesPartitions` : `partagerAvec`, `partagerTraits`, `partagerTout`, `garderUneCopie` ; `lireMesPartitions` dans `partitions.ts`) ; « Garder une copie » avec confirmation devant ma partition retouchée (page d'un chant et setlist) ; clé `cmd.chant.partagerPartition` comptée à l'ouverture ; libellés fr et zh-CN (`maPartition.partage.*`) ; nouveau `tests/ma-partition-partage.spec.ts` (deux comptes fictifs : partage, suivi, copie, retrait, toutes mes partitions, chant ZH, feuille ; dans `SPECS_GRAND_ECRAN`) ; `test.skip` de `setlist-version` levé. Décisions déléguées : bloc « Décisions déléguées (session MP-4, 12/11) » ci-dessus. Relecteur « à corriger » : clics rapides sur deux cases qui s'écrasaient (état lu périmé) et « toutes mes partitions » qui pouvait écraser une retouche en file d'attente, corrigés (miroir `mesRef`, version locale prioritaire, choix écrit après les partitions). Tests : premier tour sur les specs touchées et voisines, 298/301 en 8,3 min (deux échecs `ordinateur` : `ma-partition-rangement` « rejeu lent », `setlist-version` « Crayon, pour moi ») ; après correction, `ma-partition-partage` (cinq projets) et les deux échecs : 43/43 en 2,2 min. tsc propre, lint sans nouvel avertissement. Captures regardées : téléphone, tablette portrait, tablette paysage (ZH), 1 440 px. **Reste noté** : les anciens partages `versions/{uid}` restent tels quels jusqu'à MP-6 ; rendu des traits partagés (`sharedTraits`) avec MP-5 ; mineurs du relecteur : partition « neuve » mal reconnue si la première lecture a échoué, « Garder une copie » remet à zéro les partages de la copie remplacée, échec silencieux de la copie sur la page d'un chant, `setTimeout` non nettoyé dans `MenuJeLis`, partager touche `updatedAt` de toutes mes partitions ; avertissement Radix « Missing Description » sur une `DialogContent`. Aucune modification de `firestore.rules`.
- 12/11/2026 : **MP-5 faite** (traits accrochés, Crayon du mode louange, « Partition » dans « Je joue ») ; **fin du lot MP-1..MP-5** (MP-6 attend son go et les réponses aux questions ouvertes). Décisions : bloc « Décisions déléguées (session MP-5, 12/11) » du § Traits. **Contenu** : `Trait` définitif (`src/types/partition.ts`) ; calcul pur `src/lib/annotations/ancres.ts` (découpe ligne par ligne, écran ↔ em, scan en fraction de largeur) ; repères `data-trait-slug/section/ligne` sur les lignes de `SectionView`, `data-trait-scan` sur les pages de `JianpuSheet` ; projection DOM → traits écran `src/components/performance/hooks/useTraitsAncres.ts` (refaite à la pagination, au redimensionnement, aux polices ; loupe ramenée à l'échelle 1 ; aperçu de la page suivante ignoré ; demi-page rognée par zone) ; « Annoter » devient « Crayon » (画笔) au mode louange, `AnnotationCanvas` d'AO réutilisé, traits écrits dans ma partition par `SetlistDetailClient` (regroupés 800 ms, écrits tout de suite à la sortie du mode, au `pagehide` et en arrière-plan) ; anciennes annotations par page en lecture seule (`useAnnotationsPage` n'écrit plus) ; traits d'une partition partagée affichés si `sharedTraits` ; rubrique « Partition » (乐谱) dans « Je joue » ; signes de MP-2 au mode louange. Firestore refuse un tableau dans un tableau : `points` écrits à plat et relus en paires (`partitions.ts`). **Relecteur « à corriger »**, corrigé : un trait tracé avant la lecture de ma partition (ou après une lecture en échec) réécrivait la partition sans son texte ni ses partages (`useMesPartitions` expose `charges` et `lireLocale` ; Crayon offert seulement une fois la partition lue ; test « lecture lente ») ; `car` changeait avec l'affichage des accords (espace `data-copy-ignore` comptée) ; traits locaux jamais oubliés ; minuterie perdue à la fermeture. **Tests** : premier tour, 14 specs touchées et voisines, cinq projets : 1 758 passés, 9 échecs (deux tests : liste chinoise de la barre de titre, `setViewportSize` en plein écran), 1,2 h ; après corrections, tour sur les quatre specs en échec ou modifiées (`ma-partition-traits`, `louange-barre-titre`, `rappel-ordre-joue`, `louange-je-joue`), cinq projets : 410 passés, 17 échecs en 39 min ; second tour de corrections (test « lecture lente » qui ne suspendait pas la lecture, tracés de `rappel-ordre-joue` posés dans le blanc à plus de 2 em d'une ligne, marges de temps des tests qui ouvrent deux ou trois fois le mode louange), puis les échecs relancés sur leurs projets : verts, sauf `louange-barre-titre` « couleur des icônes … framboise » (ordinateur, 1 440 : délai dépassé), **qui échoue de même sur la tête de branche d'avant MP-5** (vérifié dans une copie, 4 échecs sur 4) : à reprendre hors de ce lot. tsc propre, lint sans erreur. Suite complète non tournée (règle du 12/11 après-midi : elle tourne une fois, quand tous les chantiers sont finis). Captures regardées aux quatre dispositions et à 1 440 px, FR (Abba Père) et ZH (一生爱你) : traits au même endroit du texte partout ; `regard` sur 30 captures, une retouche faite (séparateur avant « Partition ») ; `critique-design` non lancé (rien de plus que des finitions déjà connues). **Reste noté** : `nettoie()` retire les « - » de syllabes quand les accords sont masqués, `car` peut glisser sur un chant qui en a ; un tracé à plus de 2 em de toute ligne est ignoré (`shortcut:`) ; ancre par rang de ligne : une ligne ajoutée ou retirée dans ma partition décale les traits suivants (MP-6) ; traits des autres et anciennes annotations masqués sous la loupe ; barre d'outils d'AO qui couvre la marge droite (déjà là) ; code mort : `saveAnnotation` (`src/lib/firebase/annotations.ts`), `setTailleAnnotee` ; avertissements lint existants. Aucune modification de `firestore.rules`.
- 13/11/2026 : **MP-6 faite** (reprise de l'existant) ; **lot MP fini**. Pas de migration des anciennes « Ma version »
  (réponse 1 de Timothée) : elles restent lisibles dans leur setlist. **Contenu** : la structure du corps suit la lecture
  choisie (`viewOf`, `itemsDe` dans `SetlistDetailClient.tsx`) : « Ma partition » → sa structure, à défaut celle du
  culte ; « Celle du culte » → celle du culte ; « Le chant d'origine » → l'ordre naturel du chant ; une ancienne
  version → sa structure, à défaut celle du culte (corrige « une ancienne Ma version perd sa structure quand une
  partition neuve existe ») ; les anciennes « Ma version » partagées par d'autres ne sont plus proposées
  (`songVersionView`), seule la mienne reste dans « Dans cette setlist » ; mode louange, « Je joue » › « Partition » :
  « Recopier mes anciennes annotations dans ma partition » (将旧批注复制到我的乐谱) quand la page affichée en a :
  chaque ancien tracé est ancré à la première ligne du chant qui le contient (`ancrerSurPremiereLigne`,
  `useTraitsAncres.ts` ; scan 简谱 à défaut de ligne), **ajouté** aux traits sans rien retirer (texte, tampons et
  éléments inconnus gardés), écrit tout de suite, puis l'ancien document est supprimé (`deleteAnnotation`) seulement
  après un enregistrement réussi ; en cas de refus, rien n'est supprimé et le message d'échec existant s'affiche ;
  code mort retiré (`saveAnnotation`, `setTailleAnnotee`, `canHaveSetlistVersion`, `withMineItem`, `myStructureOf`,
  clés `setlists.contentEdit.toggle/hint` et neuf clés `setlists.myVersion.*`) ; clé React en double des groupes sans
  titre corrigée (`ui/menu.tsx`) ; nouveau `tests/ma-partition-reprise.spec.ts` (structure d'une ancienne version,
  partage ancien plus proposé, recopie FR et ZH, refus d'écriture). Tests retirés parce que leur seul objet n'existe
  plus : deux de `setlist-version` (choisir la version partagée d'un autre), un de `pdf-ma-version`, trois de
  `harmonie-ma-version` (passage retouché d'un autre replacé dans ma structure : `structureWithCopies` ne sert plus
  que pour ma propre version, code laissé). **Décisions déléguées (session MP-6, 13/11)**, à corriger par Timothée
  d'un mot : partages anciens retirés de la lecture (leur auteur ne peut plus les retirer depuis que l'interrupteur
  a disparu, réponse 3) ; le bouton « Recopier » vit dans « Je joue » (pas dans la barre du Crayon, gelée par AN) ;
  « retrait après un mois » (réponse 2) = une ligne datée dans la feuille de route, pas de code : un mois après la
  mise en ligne, retirer la lecture des anciennes annotations (`useAnnotationsPage`, `loadAnnotation`, bloc
  `annotations` de `firestore.rules`). **Relecteur « à corriger »**, corrigé : l'ancien document partait avant
  l'écriture réelle (regroupée 800 ms) ; deux chants à l'écran rattachaient tout au premier ; branche morte dans
  `viewOf`. **Tests** : premier tour, 13 specs du lot et des pages touchées (`ma-partition-*`, `setlist-version`,
  `annotations-forscore`, `jianpu-integration`, `harmonie-ma-version`, `pdf-ma-version`, `nettoyage-setlist-pures`,
  `louange-je-joue`), cinq projets : 942 passés, 0 échec en 28 min ; après corrections, `ma-partition-reprise`,
  `ma-partition-traits`, `annotations-forscore`, `louange-je-joue`, cinq projets : 403 passés, 0 échec en 14 min.
  tsc propre, lint 0 erreur (142 avertissements). Captures regardées (spec temporaire supprimée) : téléphone (ZH),
  tablette portrait, tablette paysage (FR), 1 440 px (ZH) ; une retouche (bouton aligné sur les options, teinte
  d'action). **Reste noté** : une écriture mise en file locale (erreur passagère) compte comme réussie et l'ancien
  document est supprimé, la copie se rejouant depuis la file de l'appareil ; échec de la suppression silencieux
  (`shortcut:`, traits en double à la réouverture) ; cas à deux chants à l'écran non testé ; décalage des traits quand
  une ligne est ajoutée ou retirée dans ma partition (noté en MP-5) : hors de la reprise, à reprendre dans un lot à
  venir ; le changement de lecture vers une ancienne version écrit encore `versions/{uid}.choices` (voulu). Aucune
  modification de `firestore.rules` hors d'un commentaire (rien à publier pour MP-6).
- 13/11/2026 : **retouche « crayon absent »** (go de Timothée, « Go », relayé par le pilote). Cause : une lecture de
  `partitions/{uid}__{slug}` en échec (le plus probable : bloc `partitions` de `firestore.rules` pas encore publié,
  403) laissait `chantsCharges` à faux sans nouvel essai, donc ni Crayon, ni stylet, ni appui long pour la séance.
  `useMesPartitions` distingue désormais l'échec (`echecs`) de la lecture en cours et relit seul les échecs (5 s, 15 s,
  45 s, puis à chaque retour du réseau) ; tant qu'elle échoue, le Crayon reste visible mais désactivé
  (`aria-disabled`, barre et ligne du menu au téléphone) et son toucher affiche « Partition indisponible pour le
  moment » (zh « 乐谱暂时无法使用 », **à faire relire**) ; stylet et appui long ne font rien. Lecture en cours :
  comportement inchangé (Crayon absent, quelques secondes au plus). Non connecté, hors ligne, chant ajouté depuis
  « Tous les chants » : inchangés. Spec `louange-crayon-indispo` (403 simulé puis lecture acceptée) sur les trois
  appareils ; voisines (Ma partition ×6, `annotations-forscore`, `louange-barre-titre`) : 464 passés, 0 échec (≈ 21 min). **La vraie correction reste à Timothée : publier `firestore.rules`.**
- 21/11/2026 : **UP-3 faite** (accords et paroles, un passage ou tous). Page setlist : la feuille d'une ligne d'une
  section répétée s'ouvre sur « Seulement ce passage » (`repeatScope` à `"one"`, `SetlistDetailClient.tsx`), pour moi
  comme pour le culte ; rien d'autre ne change. Page chant (question 5, décision déléguée (session, 21/11) : la
  proposition) : la copie de section tient dans la tranche. Le Crayon propose le même choix quand la structure affichée
  répète la section (« Seulement ce passage » d'avance) ; ce passage copie la section dans ma partition
  (`materializeSectionCopy`, `structure` et `sectionOrigins` écrits comme en setlist), et la page lit la structure de
  ma partition quand je lis la mienne (`SongDetailClient.tsx`). Une ligne inchangée ne copie rien. **Reste** (`shortcut:`) :
  page chant ouverte avec `?structure=` (lien d'une setlist), aucun choix, la retouche vaut pour toutes les répétitions
  (sinon la copie serait invisible, l'URL gagne) ; pas de test ZH sur la page chant. Relecteur « à corriger » (clic
  de test faux, copie invisible avec `?structure=`, structure ancienne sans rang, copie sans retouche), corrigé.
  Tests adaptés : `harmonie-ma-version` (« Seulement » pressé d'avance, « Toutes » cliqué) ; deux tests page chant dans
  `ma-partition-crayon`. Tests : `ma-partition-crayon`, `harmonie-ma-version`, `adapter-sections`, `setlist-history`,
  `ma-partition-lecture` sur les trois appareils, 198 passés, 0 échec en 9,6 min ; tsc propre, lint 0 erreur.
  UP-4 non lancée ici : la ligne d'UP-2 n'existe pas encore (UP-2 la lancera).
- 21/11/2026 : **UP-1 — Dessins par passage** (go de Timothée du 21/11). L'ancre texte d'un dessin (trait, surligneur,
  texte, tampon) gagne `passage` facultatif (`src/types/partition.ts`) : rang du passage de la section dans l'ordre lu,
  0 = le premier. Il est posé au rendu en `data-trait-passage`, au mode louange (`numeroterPassages`,
  `src/lib/performance/blocks.ts`, rang par chant en ordre joué) et dans `SongView` (boucle des passages), seulement si
  la section revient. Au tracé, il s'écrit d'après la ligne touchée (`useTraitsAncres.ts`, option `tousLesPassages`
  prête pour UP-2). Au rendu, un dessin sans `passage` va partout, comme avant ; les dessins déjà faits ne sont pas
  convertis (question 3). Un dessin avec `passage` ne va qu'à ce passage ; un `passage` invalide est ignoré, et le
  trait se dessine partout. Gomme (question 6) : elle passait déjà par le trait d'origine, sans changement. **Décision
  déléguée (session, 21/11)** : en ordre « Une fois chacune » ou « Plan », un dessin à `passage` ne se montre pas sur
  la section normale ; UP-4 l'ajoutera comme section à part avec sa note. Le rang suit l'ordre de la setlist ouverte :
  un trait `passage: 1` se montre au 2ᵉ refrain d'une autre setlist du même chant (même partition). Scans 简谱 :
  inchangés. `firestore.rules` : rien à changer (le champ vit dans `traits`). Spec nouvelle
  `ma-partition-passage` (FR, sans cas ZH : aucun chant chinois n'a de section répétée simple à prendre). Avec les
  voisines (`ma-partition-traits`, `ma-partition-crayon`, `annotations-forscore`, `louange-sections-uniques`) :
  526 passés, 3 échecs (≈ 23 min, plus 6 min de relances). Deux échecs sont déjà rouges sur la base :
  `annotations-forscore` (z) au téléphone, `louange-sections-uniques:358` (C1) sur ordinateur-1440. Le troisième,
  (v) préréglages sur ordinateur-1440, est instable sous charge : il passe seul. Reste : UP-2 (le choix dans la barre),
  puis UP-4 (UP-3 est faite).
- 21/11/2026, soir : **UP-1 annulée, UP-2 abandonnée** (correction de Timothée : la règle « un passage ou tous » ne
  vaut que pour les accords et les paroles du Crayon, pas pour les dessins). Le commit d'UP-1 (`cdf9ebb`) est annulé
  par un commit d'annulation : le champ `passage`, `numeroterPassages`, `data-trait-passage`, `tousLesPassages` et la
  spec `ma-partition-passage` sont retirés ; un dessin se montre de nouveau à chaque passage de sa section. Aucun
  dessin n'a pu garder ce champ en ligne (rien n'est allé sur `main`). UP-2 a été arrêtée avant tout commit.
  Vérification : tsc propre ; `ma-partition-traits`, `ma-partition-crayon`, `annotations-forscore` sur les cinq
  projets : 353 passés, 2 échecs, 5 sautés en 14 min. Les deux échecs étaient déjà là avant : (z) au téléphone (rouge
  sur la base) et (v) sur ordinateur-1440 (instable sous charge), tous deux dans R5b. Reste : UP-4, Crayon seulement.
- 21/11/2026, soir : **UP-4 faite** (Crayon seulement, accords et paroles ; aucun dessin ni annotation touché, pas de
  `firestore.rules`). Avec l'ordre « Une fois chacune », la feuille d'une ligne d'une section que la structure répète
  demande « Pour quel passage ? » : les pastilles du plan (seules celles de la section touchée actives, cible de 44 px)
  et « Toutes les répétitions » ; une pastille copie la section comme en UP-3, « Toutes » retouche partout. Le passage
  retouché seul s'affiche juste sous sa section d'origine, son libellé devient « Refrain · 2ᵉ fois » (dans l'en-tête de
  sa carte, couleur de la section) ; dans la rangée de structure, sa pastille garde l'abréviation de l'origine et porte
  un badge de la couleur de la section (« retouché seul »), aussi en « Plan ». Pages chant (ma partition, hors
  `?structure=`) et setlist (pour moi et pour le culte). Code : `src/lib/setlist/passages.ts` (nouveau), `EditLineSheet`,
  `SongView` (corps et `StructureStrip`), `SetlistDetailClient`, `SongDetailClient`, `PartitionView`, locales fr et zh-CN.
  Le passage est gardé par l'identité de la copie dans la structure (comme UP-3), le rang « 2ᵉ fois » n'est que calculé
  à l'affichage. **Décisions déléguées (session, 21/11)** : (1) dans ces ordres, rien n'est choisi d'avance (« on demande
  c'est pour quelle ») et l'enregistrement reste désactivé jusqu'au choix ; une pastille choisie montre son nom ;
  (2) ordre « Plan » : sur la page chant aucune ligne n'est montrée, donc rien à toucher, seul le badge de la structure
  s'applique ; sur la page setlist le Crayon garde l'ordre joué forcé en « Plan » (lignes et dessins comme avant) ;
  (3) page setlist : le Crayon ne force plus l'ordre joué en « Une fois chacune » (sans quoi UP-4 n'y existait pas) —
  renverse en partie le choix du coup d'œil « Crayon = ordre joué », test `coup-d-oeil` adapté ; (4) avec ma propre
  structure, le corps suit aussi « Une fois chacune » (avant : ordre joué), pour que corps et feuille s'accordent.
  `critique-design` : note dans l'en-tête de la carte (elle se détachait en deux colonnes à 1 440 px), badge coloré
  au lieu d'un point noir, nom du passage dans la feuille ; faits. Tests : nouvelle spec `ma-partition-passage-unique`
  (12 tests : FR page chant et setlist, accord et paroles, « Toutes », culte, ZH 一生爱你 en paroles, « Tout le chant »
  inchangé, badge dans les trois ordres) ; avec `coup-d-oeil`, `ma-partition-crayon`, `ma-partition-lecture`,
  `harmonie-ma-version` sur les trois appareils : 167 passés, 14 échecs en 6,0 min au premier tour (attentes de test
  fausses, `sectionOrigins` perdu par `viewOf` en lecture « mienne », écriture culte lue trop tôt : corrigés) ; second
  tour `ma-partition-passage-unique` + `ma-partition-lecture` : 87 passés, 0 échec en 2,4 min ; après la retouche
  design, `ma-partition-passage-unique` + `ma-partition-crayon` : 63 passés, 0 échec en 2,5 min. Reste rouge `coup-d-oeil:215` (libellé « Chaque section une fois » dans le mode louange, rouge
  avant la tranche, mode louange : R5b). tsc propre, eslint 0 erreur. **Reste / finitions** : en « Tout le chant » sur
  la page setlist, la rangée garde la structure de la présidence, sans badge sur ma copie (`shortcut:`) ; badge et
  numéro de position peuvent se superposer au coin d'une pastille ; libellés zh-CN (« 改哪一次？ », « 第2次 »,
  « 单独修改 ») à faire relire ; interface en 中文 et mode sombre non capturés ; soulignement des lignes retouchées
  entre caractères et pinyin (antérieur). Captures aux cinq largeurs regardées par `regard`. Lot « Un passage ou tous »
  fini ; R5b lancée ensuite (`docs/spec-retouches-2026-11-21.md`).
- 21/11/2026, nuit : **UP-5 faite** (finitions d'UP-4, Crayon seulement ; aucun dessin, annotation, mode louange ni
  `firestore.rules` touché). (1) Dans la rangée de structure, le badge « retouché seul » passe au coin **haut gauche**
  de la pastille, le numéro de position reste en haut à droite : plus de chevauchement (toutes dispositions de pastille,
  trois ordres). (2) « Tout le chant », page setlist : la rangée garde la structure de la présidence ; **décision
  déléguée (session, 21/11)** : le badge de ma copie s'y pose aux positions alignées (ma structure de même longueur, ma
  copie à la place d'une étape de son origine), en plus des badges déjà calculés sur la structure lue (copie « pour tout
  le culte ») ; structures non alignées : pas de badge, comme avant. Le `shortcut:` de `SongView` est levé. Test ajouté
  (`ma-partition-passage-unique`, présidence [V, R, V, R], badge sur la 4ᵉ pastille seule). (3) Sombre + 中文 et clair
  + FR, aux quatre dispositions (390, 810, 1080, 1440), 24 captures regardées par `regard` : feuille « 改哪一次？ »,
  rangée (badge et numéro ensemble) et copie « 副歌 · 第2次 » lisibles, rien de coupé, contraste du badge suffisant en
  sombre : **aucune correction nécessaire**. Les pastilles C1/C2 pâles de la feuille sont les passages désactivés voulus
  par UP-4. `critique-design` non lancé (seul changement visible : le badge change de coin). (4) Libellés zh-CN
  cohérents avec l'existant (`第{{n}}次`/`第1次` = `view.nthTime`/`firstTime`, « 所有重复 » = clé partagée
  `harmonie.toutesRepetitions`, « 单独修改 » s'accorde avec « 仅此处 ») : rien changé ; **relecture par un sinophone
  laissée à Timothée**. Tests : `ma-partition-passage-unique`, `ma-partition-crayon`, `ma-partition-lecture`,
  `coup-d-oeil` (+ voisine `statistiques-chant`), cinq projets : 294 passés, 5 échecs (tous `coup-d-oeil:215`, connu,
  R5b), 10 sautés, 9,2 min ; après la correction du relecteur (badges existants gardés en « Tout le chant »),
  `ma-partition-passage-unique` : 39 passés, 0 échec en 1,6 min. tsc propre, eslint 0 erreur. **Restes** : relecture
  zh-CN par Timothée ; soulignement des lignes retouchées entre caractères et pinyin (antérieur) ; R5b (`coup-d-oeil:215`).
- 21/11/2026, nuit : **UP-6 faite** (session d'origine ; `executant`, puis tests et captures par la session). CSS seul
  (`globals.css`, règle `[data-retouche="paroles"]`) : un caractère suivi de son pinyin ne porte plus le trait, c'est
  le pinyin (`[data-ligne="pinyin"]`) qui le porte ; sans pinyin et en français, inchangé. Deux tests ajoutés dans
  `ma-partition-lecture` (pinyin affiché, pinyin masqué) ; les tests « chant ZH » sur les cinq projets : 15 passés en
  39 s ; captures regardées au téléphone et à l'ordinateur. Limites : le trait suit la largeur de chaque syllabe de
  pinyin (trait en morceaux, comme avant sous les caractères) ; le mode louange n'a pas été regardé (aucun
  `data-retouche` sous `src/components/performance`).
