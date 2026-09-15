# Spec : lot 3 — Structure « coup d'œil »

Lot 3 de `feuille-de-route.md` § 2. La tranche S1 avait été codée le
14/09/2026 sur une phrase prise à tort pour un feu vert ; **go donné par
Timothée le 14/09/2026 (soir)** pour les lots dans l'ordre décidé : S2 et S3
codées dans la foulée, S1 conservée. **À valider en local par Timothée.**
Décisions : `intent/vision-site.md` (« Coup d'œil, après relecture ») ;
constats de la relecture : `feuille-de-route.md` § 7 (1, 2, 3, 5, 8, 16, 17).

## Objectif

Suivre la structure de la présidence sans faire défiler la partition. Dans la
vue partitions d'une setlist, chaque chant montre en tête un **bandeau**
(structure abrégée, nuance sous chaque étape) et, par défaut, **chaque
section une seule fois**. Les batteurs n'ont que le bandeau. La présidence
peut ajouter une **« Dernière phrase » (Dp)** dans l'éditeur.

## Ce que le code montre (14/09/2026)

- `SongView.tsx` rend une ligne « ORDRE » (noms complets, ordre joué) sous
  l'en-tête de chaque chant : page du chant et vue partitions.
  `JianpuStructureStrip.tsx` rend un bandeau (noms complets, « ×2 »,
  nuances) au-dessus des scans 简谱, dans la vue partitions et en mode louange.
- Les étapes viennent de `resolveStructureOverride` (uid `<sectionId>-<n>`)
  et `resolveSectionOccurrences` (note, transition, nuance, modulation **par
  occurrence**) ; `isRepeatOf` définit « ×2 ».
- Mode Adapter : copies de sections matérialisées dans `contentOverride`
  (`materializeSectionCopy`), provenance dans `sectionOrigins` ; l'éditeur
  relit ces sections (`itemSections`), donc elles survivent à l'enregistrement
  automatique. Une étape inconnue du modèle, elle, disparaît.
- Sommaire (`SetlistOutline.tsx`) : clic et surlignage par **rang** de
  `[data-section]` dans le chant.
- Rôle mémorisé du mode louange : `localStorage` `perf-role-preset`.
- `SectionSummary` de l'index n'a pas les lignes : l'éditeur ne connaît pas le
  texte d'un chant (il faut `/api/song/[slug]`, `fetchSongAST`).

## Ce qui est construit

1. **Abréviations** (`src/lib/chordpro/abbreviations.ts`,
   `abbreviateSection`) : intro **I** ; couplet **C** + numéro ; pré-refrain
   **Pr** ; refrain **R** (+ numéro s'il y en a un) ; post-refrain **Po** ;
   pont **P** ; interlude / instrumental **Pm** ; outro / coda **F** ; tag
   **Tag** ; « Dernière phrase » **Dp** ; autre → nom écrit. Même table en
   中文. Suit le nom écrit comme `formatSectionName` (un
   `{start_of_intro: Interlude}` donne Pm).
2. **Bandeau** (`src/components/song/StructureStrip.tsx`) : remplace la ligne
   ORDRE de `SongView` (page du chant et vue partitions) et
   `JianpuStructureStrip` dans la vue partitions (le mode louange garde le
   sien). Une étape = abréviation dans la couleur de son type, « ×2 » (règle
   `isRepeatOf`), « → A » pour une modulation, **nuance dessous** ; notes et
   transitions sur une ligne fine sous le bandeau, préfixées par l'abréviation
   de leur étape. Grille qui passe à la ligne sur téléphone.
3. **Menu d'affichage** de la vue partitions (menu « ⋯ », groupe
   « Affichage ») : **Ordre joué / Sections uniques / Structure seule** ;
   `localStorage` `partition-layout` ; défaut « uniques », ou « structure » si
   `perf-role-preset` = batteur et aucun choix. Mode Adapter : ordre joué
   forcé, bandeau conservé.
   - *Sections uniques* : première occurrence de chaque (section, tonalité
     effective) ; le corps n'affiche ni nuance, ni note, ni transition
     d'occurrence (elles sont dans le bandeau) ; une section rejouée dans une
     autre tonalité est réimprimée dans cette tonalité.
   - *Structure seule* : bandeau, notes et transitions ; pas de corps ; sur un
     scan 简谱, pas de scan.
   - Fusions : chaque chant fusionné suit le mode ; structure mélangée :
     toujours l'ordre joué, avec le bandeau (« uniques » hors lot).
4. **Sommaire** : chaque section affichée porte `data-section-uids`
   (occurrences qu'elle représente) ; clic et surlignage par uid. Libellés
   inchangés (noms complets).
5. **Dp dans l'éditeur** (`SectionStructureEditor`) : bouton « + Dernière
   phrase » → feuille : section source (défaut : dernière étape), 1 à 3
   lignes, aperçu (accords et paroles) → `materializeLastPhrase(source,
   sectionId, n)` ajoute `{start_of_other: Dernière phrase (Refrain)} …
   {end_of_other}` au `contentOverride` (créé depuis le chant s'il n'existe
   pas), et l'étape à la structure. Pas dans `sectionOrigins`. Badge
   « Version modifiée » masqué quand `contentOverride` = chant original +
   blocs Dp seulement (`isLastPhraseOnly`). Historique : une phrase
   « Dernière phrase ajoutée » plutôt que « accords adaptés ».
   - Fusions : pas de Dp (hors lot).

## Hypothèses (à corriger en testant)

1. Le bandeau remplace aussi la ligne ORDRE de la **page du chant** (même
   composant ; il n'y a de nuances que si la page en reçoit dans l'URL).
2. Vue liste et sommaire gardent les **noms complets** (place disponible) ;
   seules les règles de reprise et de nuance sont partagées.
3. Le **mode louange** ne change pas, y compris son bandeau 简谱.
4. Le **PDF** ne change pas (« compact » = lot 5).
5. Dp = lignes entières du fichier (avec leur `{jianpu:}` et leur pinyin
   séparé) ; 1 à 3 lignes ; type `other`, nom **« Dernière phrase – R »**
   (abréviation de la section source, sans numéro) : le parseur relit un mot
   de section entre parenthèses comme sorte de section (« (Refrain) » →
   refrain), une parenthèse comme suffixe répété, un chiffre comme numéro.
6. « Rétablir l'original » retire aussi les Dp (accepté).
7. Le menu d'affichage vit dans le menu « ⋯ », à côté de « couleurs par
   section » et du réglage 简谱.

## Découpage

Une tranche = un test écrit d'abord et vu en échec, puis vert, captures
regardées sur les trois appareils (1 chant FR + 1 chant ZH).

| Tranche | Contenu | Fichiers principaux |
| --- | --- | --- |
| S1 | abréviations ; bandeau à la place de ORDRE (chant normal et scan), notes et transitions | `abbreviations.ts`, `StructureStrip.tsx`, `SongView.tsx`, `PartitionView.tsx`, locales |
| S2 | menu d'affichage ; sections uniques ; structure seule ; présélection batteur ; Adapter → ordre joué ; sommaire par uid | `partitionLayoutPref.ts`, `uniqueSections.ts`, `SetlistDetailClient.tsx`, `PartitionView.tsx`, `SongView.tsx`, `SetlistOutline.tsx`, locales |
| S3 | Dp : éditeur, matérialisation, badge, historique | `editSource.ts`, `lastPhrase.ts`, `SetlistFormRows.tsx`, `formItems.ts`, `PartitionView.tsx`, `history.ts`, locales |

## Seams testés (Playwright, `tests/coup-d-oeil.spec.ts`, trois appareils)

- Fonctions pures : `abbreviateSection`, `uniqueSections`,
  `materializeLastPhrase`, `isLastPhraseOnly`.
- Vue partitions d'une setlist simulée (`abba-pere` FR ; `一生爱你` ZH sur son
  scan) : bandeau, absence de « ORDRE », modes d'affichage, présélection
  batteur, Adapter, sommaire.
- Éditeur : ajout d'un Dp et écriture enregistrée (`contentOverride` +
  structure), puis rendu dans la setlist sans badge.

## Commandes

```bash
npx tsc --noEmit
npm run lint
npm test -- tests/coup-d-oeil.spec.ts
npm test            # suite complète avant de rendre la main
```

## Limites

- Toujours : 1 chant FR + 1 chant ZH ; captures regardées sur trois
  appareils ; aucune écriture en production.
- Demander avant : toucher au mode louange, au PDF, à la vue liste, aux
  couleurs gelées.
- Jamais : commit sans demande ; retouche des calques 简谱.

## Critères de réussite

- Abba Père avec C1 · R · R : bandeau « C1 · R ×2 », plus de ligne ORDRE,
  refrain imprimé une fois par défaut ; « Ordre joué » le réimprime.
- Rôle Batteur mémorisé sur l'appareil : la vue partitions s'ouvre en
  « Structure seule ».
- Dp ajouté depuis l'éditeur : la setlist montre « Dp » dans le bandeau et la
  dernière ligne du refrain avec ses accords, sans badge « Version modifiée ».

## Avancement

| Tranche | État |
| --- | --- |
| S1 | Codée le 14/09/2026 (avant le go) : `abbreviations.ts` (+ `sectionKindOfName` exporté), `StructureStrip` dans `SongView.tsx` à la place de la ligne ORDRE, cas du scan dans `PartitionView.tsx`, clés `songs.view.structure` / `firstTime` / `nthTime` (FR, 中文). Conservée avec le go du soir. |
| S2 | Codée le 14/09/2026 (soir, sur go) : `partitionLayoutPref.ts` (`partition-layout`, défaut « uniques », « structure » si `perf-role-preset` = batteur), `uniqueSections.ts`, `SongView` (prop `layout`, corps par mode, `data-section-uids` sur chaque section imprimée), `PartitionView` (Adapter → ordre joué ; structure seule = pas de scan ; bandeau sur la structure mélangée d'une fusion), menu « ⋯ » (« Affichage : Ordre joué / Sections uniques / Structure seule »), sommaire par uid (`SetlistOutline`). 8 tests. |
| S3 | Codée le 14/09/2026 (soir, sur go) : `lastPhrase.ts` (`materializeLastPhrase`, `isLastPhraseOnly`, `withoutLastPhrases`), `LastPhraseSheet.tsx` (section source, 1–3 lignes, aperçu transposé dans la tonalité de la setlist), bouton « Dernière phrase » dans `SectionStructureEditor`, `SongRow.onLastPhrase` → `patch({ contentOverride, sectionItems })`, badge « Version modifiée » masqué (`isLastPhraseOnly`), historique « Dernière phrase ajoutée à … » (`history.ts`, sorte `lastPhrase`). 4 tests. Pas de Dp sur les fusions (hors lot). |
| Retours de Timothée (14/09/2026, test local) | **Bandeau agrandi** (abréviations 17 px comme les paroles, notes 13 px) ; **nuances en texte seul** sous l'abréviation (14 px, sans fond) : « discrète mais qu'on la voie bien », la structure doit rester ce qu'on voit d'abord — les pastilles restent dans le corps et en mode louange. **Nuancier passé en neutre** (gris clair → gris → noir, indications en contour seul) : le violet se confondait avec le pont ; la couleur est réservée aux sections. Le PDF garde son violet (`NUANCE_COLOR`) en attendant le chantier PDF. Dans le bandeau, **crescendo et decrescendo = leur flèche seule** (nom en info-bulle et `aria-label`) ; les pastilles du corps et du mode louange gardent le libellé. **Forme du bandeau (maquette de Timothée)** : chaque étape est une **pastille ronde aux couleurs de sa section** (fond `--sec-*-tint`, lettre `--sec-*`), « ×2 » dans la pastille, nuance en texte dessous ; **notes et transitions = numéro noir** accroché à la pastille et repris dans une liste numérotée sous un filet (plus de « P (3e fois) — … »). Les clés `songs.view.firstTime` / `nthTime` ne sont plus utilisées. **Sommaire** : il glisse en haut de l'écran quand les barres s'escamotent au défilement (il gardait leur place vide) ; la ligne de lecture, elle, ne bouge pas. |
| Tests | `tests/coup-d-oeil.spec.ts` : 16 tests × 3 appareils verts ; suite complète verte (deux attentes de `performance-mode.spec.ts` ajustées : écriture de la langue dans `notifPrefs` hors du décompte des écritures de setlist ; badge « ff » mesuré dans le corps, le bandeau en porte un aussi). Captures regardées sur trois appareils. Non commité. |
