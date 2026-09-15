# Spec : version perso d'un chant dans une setlist

Demande de Timothée du 14/09/2026 (soir), cadrée par un entretien en quatre
tours (`intent/vision-site.md`, journal). Intention confirmée ; le « go » du
soir vaut pour **cette spec**, pas pour le code. **Go sur la spec donné le
14/09/2026 (tard) ; les trois tranches sont codées le 15/09/2026, à valider en
local par Timothée** (voir « Avancement »). **Tranché par Timothée le
14/09/2026 (soir)** : position = **lot 3 ter** de `feuille-de-route.md` § 2,
avant le look ; en V1, une retouche dans une section répétée **touche toutes
ses répétitions** (hypothèse 3, confirmée après un aller-retour) ; libellés
« Ma version », « Version de Christelle », « Présidence », « Partager ma
version », « Sections ».

## Objectif

Un musicien ouvre une setlist et se fait **sa version** d'un chant : les
sections qu'il veut voir et dans quel ordre (par exemple C R P, une fois
chacune), et des accords ou des paroles retouchés. Elle ne change rien pour
les autres : la structure et la version préparées par la présidence restent
celles de la liste, du bandeau, du PDF, du lien de présentation et des autres
musiciens. S'il **partage** sa version, elle devient « Version de Christelle »,
que chacun voit et peut choisir à la place de celle de la présidence, en
gardant son propre choix. La structure perso, elle, ne se partage jamais. La
version vit **dans cette setlist seulement**.

Réussite : Christelle simplifie ses accords et les partage ; Éloïse choisit
« Version de Christelle » sur son téléphone ; Timothée ne voit rien changer ;
la liste, le bandeau et le lien de présentation montrent toujours la
structure de la présidence.

## Ce que le code montre (14/09/2026)

- **Réglages par appareil** de la vue partitions, en `localStorage` : accords,
  pinyin, couleurs par section (`chart-style`), affichage (`partition-layout` :
  ordre joué / sections uniques / structure seule), 简谱 auto / toujours /
  jamais ; tonalité perso (`perf-personal-keys`) et capo par chant en mode
  louange. Aucun n'est retrouvé sur un autre appareil ni visible des autres.
- **Mode Adapter = partagé** : `SetlistItem.contentOverride` (source ChordPro
  complet, tonalité d'origine) écrit dans le document de la setlist
  (`persistOverride` : relecture, conflit, historique) ; réservé à
  `canEditSetlist` ; badge « Version modifiée » ; « Rétablir l'original ».
- **Structure de la présidence** : `SetlistItem.structureOverride` (ids de
  sections, copies `<id>-<n>`), éditée par `SectionStructureEditor`
  (`SetlistFormRows.tsx` : glisser-déposer, notes, nuances, transitions, Dp).
- **Tous les rendus** passent par `itemAst(item, content)`
  (`src/lib/chordpro/itemContent.ts`) puis
  `resolveStructureOverride(ast.sections, item.structureOverride)` :
  `PartitionView.tsx`, `blocks.ts` (mode louange), `SetlistOutline.tsx`,
  `playedSections.ts` (copie des paroles), `SetlistFullPDF.tsx`. Remplacer ces
  deux champs sur un item suffit à changer ce qu'une vue affiche ; une étape
  de structure dont la section n'existe pas est ignorée.
- **Données perso par compte** existent déjà : annotations du mode louange
  (`annotations/{uid}__{setlistId}__{pageKey}`,
  `src/lib/firebase/annotations.ts`, lues et écrites par leur propriétaire
  seul) ; sous-collection `setlists/{id}/history` (`runQuery` + `PATCH`,
  `src/lib/firebase/setlistHistory.ts`). Nom affiché : `historyAuthor` (nom du
  planning, sinon prénom + initiale, sinon « Quelqu'un »).
- **Fusions** : rendu à part (`fusionSongs`, `mixedStructure`) ; le mode
  Adapter et le Dp les excluent déjà.
- **Tests** : le faux Firestore de `tests/helpers/fakeSession.ts` sert
  `runQuery` sur une sous-collection et `PATCH` avec `updateMask`.

## Ce qui est construit

### 1. Stockage : un document par personne et par setlist

- `setlists/{id}/versions/{uid}` :
  `{ authorUid, authorName, updatedAt, items: { [songSlug]: { content, structure, shared } }, choices: { [songSlug]: … } }`
  - `content` : source ChordPro complet, tonalité d'origine, même convention
    que `contentOverride` ; `null` = accords et paroles de la présidence.
  - `structure` : même forme que `structureOverride` ; `null` = structure de
    la présidence.
  - `shared` : mes accords et paroles sont proposés aux autres. La structure
    n'est jamais partagée.
  - `choices[songSlug]` : `"presidence"` ou l'`uid` de la version choisie ;
    absent = ma version si j'en ai une, sinon la présidence.
- **Règles** (`firestore.rules`) : lecture par tout connecté, comme la setlist
  et l'historique ; création, modification et suppression par le propriétaire
  seul (`request.auth.uid == uid` et `authorUid == uid`). Miroir client dans
  `src/lib/access.ts` : qui voit la setlist (`canSeeSetlist`) peut avoir une
  version. **À publier dans la console** avant la mise en ligne.
- **Confidentialité** : une version non partagée est lisible en REST par un
  connecté, comme une setlist privée aujourd'hui (choix assumé du
  `CLAUDE.md`). Le sélecteur ne la montre pas.
- **Chargement** : `runQuery` sur `setlists/{id}/versions` à l'ouverture de la
  page setlist (donc avant le mode louange). Échec de lecture : page inchangée,
  versions ignorées.
- **Écriture** : `PATCH` du document entier après chaque changement (petit
  document). Ni historique de setlist, ni notification : ce n'est pas une
  modification de la setlist.

### 2. Ma version : accords et paroles

- Bouton **« Ma version »** dans la barre de la vue partitions, pour tout
  connecté qui voit la setlist (« Adapter » reste réservé aux responsables).
  Il ouvre le même mode qu'« Adapter » : taper une ligne ouvre la feuille
  d'édition (accords, paroles, ligne instrumentale, suppression de ligne),
  mais l'écriture va dans **mon document**, jamais dans la setlist.
- **Point de départ** : la version de la présidence au moment de ma première
  retouche (`contentOverride`, Dp compris, sinon le chant original). Édition
  dans la tonalité affichée, stockage en tonalité d'origine, comme Adapter.
- **Section répétée** (tranché le 14/09/2026, après un aller-retour) : en
  V1, retoucher une ligne change toutes ses répétitions dans ma version (pas
  de copie matérialisée : hypothèse 3).
- **« Rétablir »** retire `content` (retour à la présidence). Une version
  redevenue identique à celle de la présidence est retirée d'elle-même.
- **Badge** sur le chant : « Ma version » (ambre, comme « Version modifiée »).
  Sur un scan 简谱 : « version non visible sur la partition 简谱 », même règle
  qu'Adapter.

### 3. Ma structure

- Dans le mode « Ma version », un bouton **« Sections »** par chant ouvre une
  feuille avec `SectionStructureEditor` (sans notes ni Dp) : je garde, retire,
  réordonne ou répète des sections. Sections proposées = celles de la version
  affichée, copies et Dp de la présidence comprises. « Réinitialiser » =
  structure de la présidence.
- **Effet** : le **corps** du chant, en vue partitions et en mode louange,
  suit ma structure telle quelle. Les notes, nuances et transitions
  d'occurrence de la présidence ne s'affichent pas dans le corps (elles restent
  dans le bandeau, comme en « Sections uniques »). Menu Affichage :
  « Structure seule » masque toujours le corps ; « Ordre joué » et « Sections
  uniques » sont sans effet sur un chant à structure perso, qui est déjà ce
  que je veux voir.
- Le **sommaire** suit ce qui est affiché (il sert à y aller). Le bandeau, la
  vue liste, le PDF, le lien de présentation et la copie des paroles pour la
  régie restent sur la présidence.
- Ma structure s'applique quelle que soit la version d'accords choisie (la
  mienne, celle de la présidence ou celle d'un autre) ; une section absente de
  la version choisie est ignorée.

### 4. Partager et choisir une version

- Dans « Ma version », interrupteur **« Partager ma version »** par chant
  (accords et paroles seulement). Partagée, elle apparaît chez les autres sous
  mon nom (`authorName`, règle d'`historyAuthor`). Retirer le partage la fait
  disparaître chez les autres : ceux qui l'avaient choisie reviennent à la
  présidence.
- **Sélecteur de version** en tête du chant, seulement s'il existe au moins
  une alternative (ma version ou une version partagée) : « Présidence · Moi ·
  Christelle… ». Le choix est enregistré dans mon document (`choices`) et suit
  mon compte, du téléphone à la tablette. Par défaut : ma version si j'en ai
  une, sinon la présidence.
- **Mode louange** : joue la version choisie et ma structure. Ses réglages par
  appareil (tonalité perso, capo, rôle) restent.
- **Mode Adapter** (présidence) : affiche et modifie la version de la
  présidence ; les versions perso sont mises de côté pendant l'édition.

### Ne change pas

Vue liste, bandeau, PDF (chant et setlist), lien de présentation, copie des
paroles pour la régie (possible seulement en suivant la présidence : le
bouton disparaît sur une autre version), notifications, historique de la
setlist, éditeur de setlist. Fusions : pas de version perso (V1). Le Dp de la présidence apparaît
dans ma version comme une section ordinaire.

## Hypothèses (à corriger en testant)

1. Un chant n'apparaît qu'une fois par setlist (hors fusion) : la version est
   clé par `songSlug`, comme la tonalité perso et le capo.
2. Chant retiré de la setlist par la présidence : ma version reste dans mon
   document, sans effet ; elle revient si le chant est remis.
3. Section répétée : l'édition d'une ligne touche toutes les répétitions dans
   ma version (pas de `materializeSectionCopy` en V1). Si c'est gênant,
   reprendre le mécanisme d'Adapter ensuite. **Confirmée par Timothée le
   14/09/2026**, après un aller-retour (d'abord refusée, puis « je me suis
   trompé, c'était bien comme tu avais fait »).
4. La présidence adapte le chant après moi : ma version reste la mienne ; le
   sélecteur « Présidence » me permet d'aller voir. Pas de repère « la
   présidence a modifié depuis » en V1.
5. Deux appareils du même compte : dernier enregistrement gagne (document
   entier), comme les setlists.
6. Hors-ligne : les versions sont lues au chargement ; sans réseau, la page
   affiche la présidence et l'enregistrement échoue avec le message d'Adapter
   (« Échec de l'enregistrement — réessaie »).
7. Setlist privée : seuls ceux qui la voient chargent ses versions ; les
   règles restent `read: if signedIn()`, comme pour la setlist.

## Découpage

| Lot | Contenu | Fichiers principaux | Vérification (Playwright, 3 appareils, 1 chant FR + 1 chant ZH) |
| --- | --- | --- | --- |
| V1 | Document Firestore, règles, bouton « Ma version » (accords et paroles), badge, mode louange | `src/lib/firebase/setlistVersions.ts` (nouveau), `firestore.rules`, `src/lib/access.ts`, `SetlistDetailClient.tsx`, `PartitionView.tsx`, `blocks.ts`, `PerformanceMode.tsx`, locales | une retouche fait un `PATCH` sur `versions/{uid}` et **aucun** sur `setlists/{id}` ; une ligne retouchée dans une section répétée change toutes ses répétitions ; badge ; mode louange joue ma version ; « Rétablir » ; pinyin conservé ; « Adapter » inchangé pour un responsable |
| V2 | Ma structure (feuille `SectionStructureEditor`) | `SetlistDetailClient.tsx`, `PartitionView.tsx`, `blocks.ts`, `SetlistOutline.tsx` | C R P dans le corps ; bandeau et vue liste inchangés ; notes d'occurrence absentes du corps ; sommaire suit ; « Structure seule » masque ; mode louange suit |
| V3 | Partage, sélecteur, choix persistant | `setlistVersions.ts`, `PartitionView.tsx`, locales | un second compte voit « Version de Ruth K. », la choisit (`PATCH` de `choices`), la retrouve au rechargement et en mode louange ; retrait du partage → retour à la présidence |

Chaque lot : test écrit d'abord et vu en échec, captures regardées sur les
trois appareils. Commit sur demande, un par lot. `firestore.rules` à publier
avant la mise en ligne de V1.

## Commandes

```bash
npm test -- tests/setlist-version.spec.ts   # à écrire, un fichier pour les trois lots
npx tsc --noEmit
npm run lint
```

## Questions ouvertes

- ~~Position~~ et ~~libellés~~ : tranchés le 14/09/2026 (en tête). Textes
  中文 à relire par un sinophone.
- ~~Go pour le code~~ : donné le 14/09/2026 (tard).

## Avancement (15/09/2026)

| Lot | État |
| --- | --- |
| V1. Ma version : accords et paroles | Fait. Bouton « Ma version » (tout connecté qui voit la setlist), mêmes gestes qu'Adapter, écrit dans `setlists/{id}/versions/{uid}` ; badge « Ma version » ; « Revenir à la présidence » ; mode louange. |
| V2. Ma structure | Fait. Lien « Sections » → feuille (`MyStructureSheet.tsx`, réutilise `SectionStructureEditor` sans notes ni Dp) ; le corps suit ma structure (`bodyStructure` de `SongView`), bandeau et liste sur la présidence, sommaire et mode louange sur la mienne. |
| V3. Partage et sélecteur | Fait. Case « Partager ma version » (accords et paroles) ; sélecteur natif « Version » en tête du chant dès qu'il y a une alternative (Présidence · Moi · Ruth K.…) ; choix enregistré dans `choices` ; badge « Version de Ruth K. ». Calcul dans `src/lib/setlist/versionChoice.ts`. |

`tests/setlist-version.spec.ts` : **18 tests × 3 appareils** (54), avec un
second compte pour le partage ; captures regardées sur les trois tailles ;
suites voisines (historique, mode louange, sélecteur de tonalité) vertes ;
`npx tsc --noEmit` et `npm run lint` propres. **Rien n'est commité**
(commit sur demande) ; **`firestore.rules` à publier dans la console** avant la
mise en ligne (sans ça, l'enregistrement d'une version échoue avec le message
d'Adapter, la page reste utilisable).

Précisions de réalisation :

- **Items affichés** : la page calcule des items « affichés » (accords et
  paroles de la version choisie ; en mode « Ma version », la mienne) pour la
  vue partitions, et des items « de scène » (ma structure en plus, sans les
  notes, nuances et transitions d'occurrence) pour le sommaire et le mode
  louange. Liste, PDF, historique et éditeur gardent `setlist.items`.
- **Copier les paroles** (régie) n'est proposé que si le chant affiché suit
  la setlist de la présidence : le bouton disparaît sur ma version, ma
  structure ou la version d'un autre (Timothée, 15/09/2026).
- **Ma structure** est enregistrée comme liste d'ids de sections (répétitions
  permises) ; les copies de sections et le Dp de la présidence y sont des
  sections ordinaires. Une structure identique à celle de la présidence n'est
  pas enregistrée.
- **Document entier** réécrit à chaque changement (`PATCH` sans masque) : un
  chant retiré de ma version disparaît bien du document.
- **Chargement** : les versions sont lues avec la setlist (même `Promise.all`),
  pour qu'aucune page ne s'affiche d'abord en présidence puis en ma version.
- **Sélecteur** : `<select>` natif (lisible au doigt, au clavier et par les
  lecteurs d'écran), masqué en mode d'édition.
- **Sommaire** : masqué par CSS sous 1280 px mais toujours rendu, il suit
  ma structure sur tous les appareils.

Remarqué, sans y toucher :

- Le bouton « corbeille » d'une ligne de l'éditeur de structure
  (`SortableSectionRow`) n'a pas de nom accessible ; le test le vise par sa
  ligne. À nommer avec le nouveau look.
- Trois avertissements lint antérieurs (`setState` dans des effets) dans
  `SetlistDetailClient.tsx`.
