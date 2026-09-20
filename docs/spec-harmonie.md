# Spec : Harmonie — aides à la réharmonisation pour pianistes et guitaristes

Demande de Timothée du 17/09/2026 : « mettre à disposition des musiciens
(pianistes et guitaristes) des aides pour qu'ils fassent des réharmonisations,
pour ajouter du nouveau dans les chants ». Cadrée le jour même par un entretien
en sept tours (skill *grilling*), **toutes les questions tranchées** (détail
dans `feuille-de-route.md` § 3.P et `intent/vision-site.md`, journal).
Décision du premier tour : **la spec s'écrit maintenant, le code attend la
validation des lots en cours** et un go explicite par lot.

**État : spec écrite le 17/09/2026, à relire par Timothée.** Rien n'est codé.

## Objectif

Donner aux **pianistes et guitaristes** de l'équipe de louange de quoi
réharmoniser les chants : **se former** sur la durée et **trouver une idée
concrète** en préparant un dimanche. Deux outils qui se répondent :

1. un **catalogue « Harmonie »** : ce qu'on peut faire (progressions,
   substitutions, montées, fins, modulations…), chaque fiche avec la sensation
   qu'elle donne, écrite pour le piano et pour la guitare ;
2. des **suggestions par chant** : sur un chant donné, les endroits où une
   fiche s'applique, à essayer dans « Ma version ».

En **préparation et en répétition seulement** : rien en mode louange. **Aucun
son** : le navigateur ne joue rien. Français et 中文.

Réussite :
- Jo prépare le dimanche : sur *Ta parole* dans la setlist, « Idées
  d'harmonie » propose 5 idées dans l'ordre du chant ; il touche « Fin du
  dernier refrain : Bb – C – D », l'endroit se surligne, il l'essaie dans
  « Ma version » (seulement ce passage) et la partage ; Éloïse la choisit.
- Éloïse ouvre la fiche « Le 6m à la place du 1 répété » côté guitare, capo 2
  retenu pour ce chant : diagrammes en formes, pas en tonalité réelle.
- Esther suit « Par où commencer » du début à la fin.
- Sur un chant chinois affiché en scan 简谱, Christelle touche un accord imprimé
  et le remplace ; Timothée, présidence, fait de même dans « Adapter ».
- Un chanteur ou un batteur ne voit **ni** le bouton ni l'onglet.

## Ce que le code montre (17/09/2026)

- **Répertoire** : 371 chants (183 FR, 188 中文), **tous** avec accords et
  `{key}` ; ~333 écritures d'accords, surtout accords simples, basses
  (`D/F#`), quelques 7, sus, 2, maj7. 240 chants ont des `{themes}`, dont
  « Adoration » sur 139 : **les thèmes ne départagent rien**. **Pas de barres
  de mesure** dans les `.cho` : le rythme harmonique ne se détecte pas.
- **Degrés** : `src/lib/transpose.ts` sait situer un accord par rapport à la
  tonique (`noteToIndex`, `FLAT_DEGREES` pour b3 et b6) ; `transposeLabel`
  réécrit une étiquette entière. Base des règles et du choix de tonalité.
- **Aucune IA, aucun diagramme d'accord, aucun son** dans le site.
- **Rôles** : `serviceRoles` ne connaît que `musicien` (pas l'instrument).
  **L'instrument est dans les plannings** : colonnes Piano / Guitare
  (`src/lib/planning/names.ts`, `findMyServices` → rôle « Piano »,
  « Guitare »), reliées au compte par `profile.planningName`. Admins :
  `ADMIN_EMAILS` / `isAdminUser` (`src/lib/access.ts`).
- **Ma version** (`src/lib/firebase/setlistVersions.ts`) : `VersionItem =
  { content, structure, shared }` dans `setlists/{id}/versions/{uid}` ;
  **une retouche dans une section répétée touche toutes ses répétitions**
  (hypothèse 3 de `spec-version-perso.md`, tranchée le 14/09/2026).
- **Adapter** sait retoucher **une seule** occurrence :
  `materializeSectionCopy` (`src/lib/chordpro/editSource.ts`) copie la
  section, `sectionOrigins` garde la trace de l'original.
- **Modulation (升调)** : `SetlistItem.sectionKeys` (uid d'occurrence →
  tonalité cible), posée dans l'éditeur de setlist ; les musiciens de la
  catégorie ont le niveau `edit` (`categoryLevel`).
- **Scans 简谱** : `public/jianpu/chords.json` (134 chants) donne pour chaque
  accord imprimé son texte `c` et sa boîte `x, y, w, h`, plus `sp` (place
  libre) ; `JianpuSheet.tsx` masque l'accord imprimé et réécrit l'étiquette
  (`fitFont` réduit la police si elle déborde). **Aucun lien** entre un accord
  imprimé et un accord du `.cho`. `JianpuSheet` ne reçoit que `playedKey` :
  **un 升调 ne se voit pas sur un scan**. Retouches d'Adapter et de Ma
  version : « non visibles sur la partition 简谱 ». Calques **certifiés et
  gelés** : on ne les modifie pas.
- **Capo** : seulement en mode louange, retenu par chant sur l'appareil
  (`localStorage` `perf-capos`).
- **Chants les plus joués** : `scripts/recommended-keys.ts` les compte sur
  les setlists (compte de service, hors ligne) ; côté navigateur,
  `getSetlists()` lit toutes les setlists (règles : `read: if signedIn()`).
- **Fusions** : exclues d'Adapter et du Dp ; on fait pareil.

## Décisions (entretien du 17/09/2026)

**But et usage.** Former **et** inspirer un dimanche. Préparation et
répétition, jamais en mode louange. Pas de son. Bilingue, français d'abord.

**Vocabulaire.** Noms d'accords **dans la tonalité jouée** (« remplace G par
Em7 »), degré en petit à côté, **écrit en chiffres** (1 4 5 6m b7). Les
musiciens connaissent les accords enrichis.

**Catalogue, 12 familles.**

| # | Famille | Exemple en D | Suggestion par chant |
| --- | --- | --- | --- |
| 1 | Substitutions | G → Em7, D → Bm, D → F#m ; cadence rompue A → Bm | oui |
| 2 | Couleurs | D → Dadd9, Dmaj7, D6/9 ; A → Asus4 → A | oui |
| 3 | Basses | D – D/C# – Bm – Bm/A – G ; D – G/D – A/D | oui |
| 4 | Accords de passage | F#7 avant Bm, D7 avant G, D – D#dim – Em | oui |
| 5 | Emprunts au mineur | Bb – C – D ; G – Gm – D | oui |
| 6 | Montées | Em7 – G/A, Asus4 – A avant un refrain | oui |
| 7 | Intros, interludes et fins | fin plagale G – D, fin sur Dadd9, Bb – C – D | oui |
| 8 | Modulations dans un chant | dernier refrain en E, amené par B7 | oui (« Appliquer à la setlist ») |
| 9 | Transitions entre deux chants | D → E par B7 ; même tonalité : enchaîner sans couper | dans la setlist (lot H4) |
| 10 | Voicings | quinte-octave main gauche, 3-7 ; formes haut du manche | catalogue seul |
| 11 | Rythme harmonique | tenir D deux mesures ; un accord de plus au 3e temps | catalogue seul |
| 12 | Boucles pour la prière libre | D – A/C# – Bm – G ; Dmaj7 – G/D | catalogue seul |

Écartées : notes tenues dans l'aigu, épurer, jouer à deux.

**Sensations (12)** : Épique · Majesté · Tension · Repos · Surprise · Suspendu
et planant · Émerveillement · Douceur et intimité · Tendresse et nostalgie ·
Gravité et recueillement · Lumière et espérance · Joie et élan.
**Moments (7)** : Intro · Couplet · Montée · Refrain · Pont · Fin ·
Transition. Deux filtres **combinables**, plus le niveau.

**Une fiche** : nom parlant ; sensations, moments, niveau (facile /
intermédiaire / avancé) ; **avant → après** en accords avec degré ; **choix de
tonalité** (D par défaut) ; pourquoi ça marche (une phrase) ; quand l'éviter ;
**tous les chants du répertoire qui l'utilisent déjà**, du plus chanté à GCC
au moins chanté, FR et 中文 mélangés, avec un compteur et une liste qui défile.

**Piano et guitare.** Même base harmonique ; le **comment le jouer**, le
**niveau** et les **pièges** sont écrits par instrument, plus des fiches
propres à un instrument. Chacun voit **son instrument d'abord**, avec un
sélecteur. **Diagrammes guitare et clavier piano** là où la position compte.
Côté guitare, **réglage capo** : accords et diagrammes en formes, **repris du
capo retenu pour ce chant sur l'appareil** (`perf-capos`). « Difficile à la
guitare » signalé.

**Parcours « Par où commencer »** : 8 à 10 fiches dans l'ordre, sans suivi.

**Taille** : le catalogue **le plus complet possible d'emblée (60 fiches et
plus)**.

**Contenu et validation.** Fiches **dans le dépôt**. Claude les écrit dans
`docs/harmonie/`, **Timothée les valide famille par famille** (français, puis
中文 de la famille validée) ; Christelle relit les parties guitare si elle
veut bien. Rien n'est publié sans validation. **Le catalogue ouvre dès les
premières familles validées** ; « Par où commencer » est validé en premier.
Pas d'éditeur dans l'app.

**Accès.** **Pianistes et guitaristes seulement**, d'après les colonnes
Piano / Guitare des plannings (nom de planning du compte), **plus les admins,
toujours**. Filtrage côté navigateur, comme le reste du site (choix de
confiance déjà fait).

**Portes d'entrée.** Bouton **« Idées d'harmonie »** sur la page du chant et
sur la ligne du chant dans la setlist ; **« Harmonie »** dans l'onglet Chants.
Invisibles pour les autres. Jamais en mode louange.

**Suggestions par chant.**
- **Règles automatiques** portées par les fiches des familles 1 à 8 ;
  étiquette **« À vérifier en jouant »** (les règles n'entendent pas la
  mélodie).
- Liste **dans l'ordre du chant**, **5 au plus** puis « Voir plus ». Une même
  règle déclenchée plusieurs fois dans une section = **une** suggestion
  (« dans le couplet, 4 endroits »). Toucher une suggestion **surligne
  l'endroit** dans la partition.
- **Essayer** : dans une setlist, **« Essayer dans Ma version »** ; sur la
  page du chant, lecture seule. Une suggestion qui vise un passage précis
  (fin du dernier refrain, montée avant le dernier refrain) choisit « Seulement
  ce passage » d'elle-même.
- **Modulation (famille 8)** : **« Appliquer à la setlist »**, pour qui peut
  modifier la setlist : 升调 existant posé sur le dernier refrain + accord
  d'approche ajouté en fin de section précédente (copie d'occurrence
  d'Adapter). Les autres lisent l'idée.
- **« Ne marche pas sur ce chant »** : tout pianiste ou guitariste ; la
  suggestion disparaît **pour tout le monde** sur ce chant, avec son nom ;
  **annulable par son auteur ou un admin**.
- **Fusions** : ni suggestions ni transition.

**Ma version : retoucher un seul passage.** À l'enregistrement d'une retouche
dans une section répétée : **« Toutes les répétitions »** (par défaut, comme
aujourd'hui) ou **« Seulement ce passage »** (mécanisme d'Adapter). Version
partagée : la retouche d'un seul passage s'affiche **au même endroit** de la
structure que suit l'autre : **la dernière occurrence reste la dernière**
(Christelle retouche son 2e et dernier refrain, Éloïse en a trois : le 3e
chez Éloïse) ; toute autre occurrence se repère par son **rang depuis le
début**, et ne s'affiche pas si ce rang n'existe pas.

**Scans 简谱.**
- **Toucher un accord imprimé** pour le changer ou l'effacer ; **toucher la
  ligne d'accords** pour en ajouter un, à la hauteur des autres accords de la
  ligne. Dans **« Ma version » et dans « Adapter »**, même geste. Stocké dans
  la version ou l'item, jamais dans `chords.json`.
- Un accord imprimé vaut pour **toutes** les fois où il est joué (la reprise
  est imprimée une fois) : pas de « Seulement ce passage » sur un scan.
- **Suggestion essayée sur un chant affiché en scan** : appliquée à la
  version texte + message **« À reporter sur la partition 简谱 : G → Em7 »**.
- **Modulation sur un scan** : bandeau au-dessus du scan, **« Dernier
  refrain : on monte en E »**.

**Transitions (famille 9).** Dans les « Idées d'harmonie » **du chant qui
précède**, dans la setlist, **en lecture seule**, **toujours proposées** :
modulation si les tonalités diffèrent, enchaînement sans couper si c'est la
même.

**Idées de l'équipe.** Attachées **au chant** (toutes setlists). Texte libre,
**avant → après facultatif** (enregistré en tonalité d'origine, transposé à
l'affichage), lien facultatif vers une fiche. Visibles des pianistes et
guitaristes, **instrument de l'auteur affiché**. Modifiables par leur auteur ;
les admins peuvent supprimer. Ajout depuis la page du chant **et** la setlist.
**Pas de notification** ; mention **« nouveau »** tant qu'on ne l'a pas vue
sur cet appareil.

**Tests.** Playwright, **trois appareils**, au moins un chant FR et un chant
中文 (dont un affiché en scan pour le lot 简谱).

## Libellés

| Où | Français | 中文 (proposé, relu par Timothée) |
| --- | --- | --- |
| Catalogue (onglet Chants, titre) | Harmonie | 和声 |
| Bouton sur un chant | Idées d'harmonie | 和声灵感 |
| Parcours | Par où commencer | 从这里开始 |
| Étiquette des règles | À vérifier en jouant | 请弹奏确认 |
| Essayer | Essayer dans Ma version | 在我的版本中试试 |
| Modulation | Appliquer à la setlist | 应用到歌单 |
| Retirer une suggestion | Ne marche pas sur ce chant | 不适合这首歌 |
| Choix à l'enregistrement | Toutes les répétitions · Seulement ce passage | 所有重复 · 仅此处 |
| Scan | À reporter sur la partition 简谱 : G → Em7 | 请在简谱上改为：G → Em7 |
| Bandeau de scan | Dernier refrain : on monte en E | 最后一遍副歌：升到 E |
| Idée récente | nouveau | 新 |

## Règles de calcul (fonctions pures, `src/lib/harmonie/`)

- **Degrés** : chaque accord du chant (après `itemAst`, dans la tonalité
  jouée) devient `{ degré, qualité, basse }` relativement à la tonalité de
  l'item (ou de l'occurrence si un 升调 s'applique). Accord non reconnu =
  ignoré, jamais d'erreur.
- **Une règle** = `{ id, ficheId, famille, portée, motif, remplacement,
  sûreté }` écrits **en degrés**, donc valables dans toutes les tonalités.
  Portées : *dans une ligne*, *fin de section*, *avant une section de type X*
  (montée avant refrain), *dernière occurrence* (dernier refrain, fin du
  chant), *première ligne* (intro).
- **Regroupement** : une règle × une section = une suggestion, avec la liste
  de ses endroits.
- **Choix des 5** : les 5 suggestions **les plus sûres puis les plus
  faciles** ; affichées **dans l'ordre du chant** ; « Voir plus » donne le
  reste, toujours dans l'ordre du chant.
- **Exclusions** : items de type fusion ; suggestions marquées « ne marche
  pas » sur ce chant.
- **Exemples du répertoire** : pour chaque fiche, les chants dont le `.cho`
  contient déjà le motif *après* ; calculé au build (`npm run build:index`)
  dans l'index de l'harmonie ; **ordre** : nombre de passages en setlist,
  décroissant, **compté dans le navigateur** à partir des setlists déjà
  lisibles (`getSetlists`), donc à jour sans script. Fiches sans motif détectable
  (voicings, rythme harmonique) : pas de liste d'exemples.
- **Transitions** : tonalité jouée de l'item *i* et du prochain item qui est
  un chant (items `transition` sautés) ; aucune si l'un des deux est une
  fusion ou s'il n'y a pas de chant suivant.

## Données

- **Fiches** : relues dans `docs/harmonie/<famille>.md` (lot H0), puis
  converties en `content/harmonie/<famille>.json` (FR + 中文, statut
  `validée`) ; seules les fiches validées entrent dans
  `public/harmonie-index.json`, construit par `npm run build:index` avec les
  exemples du répertoire.
- **Accès** : `canUseHarmonie(user, profile, planning)` dans `access.ts` →
  `{ piano: boolean, guitare: boolean }` ; admin = les deux.
- **Ma version, un seul passage** : `VersionItem` gagne `sectionOrigins`
  (même forme que sur `SetlistItem`) ; copies faites par
  `materializeSectionCopy` dans `content`.
- **Scans 简谱** : sur `SetlistItem` **et** `VersionItem`,
  `jianpuChords?: { changed: Record<number, string>; added: { page: number;
  x: number; y: number; c: string }[] }` — index d'étiquette de `chords.json`
  → texte en **tonalité d'origine** (`""` = effacé) ; ajouts en coordonnées du
  scan. `chords.json` n'est jamais écrit.
- **Firestore** (règles **en double** `access.ts` + `firestore.rules`,
  publiées par Timothée) :
  - `harmonie/{songSlug}/rejets/{regleId__sectionId}` : `{ uid, auteur,
    creeLe }` (lot H2) ;
  - `harmonie/{songSlug}/idees/{id}` : `{ uid, auteur, instrument, texte,
    avant?, apres?, ficheId?, creeLe, modifieLe }` (lot H3).
  - Lecture : connecté. Création : connecté, `uid == auth.uid`. Modification :
    l'auteur (idées). Suppression : l'auteur ou un admin.
- **Appareil** (`localStorage`, lectures et écritures sous `try/catch`) :
  `harmonie-instrument` (dernier instrument regardé), `harmonie-vues` (idées
  déjà vues) ; capo lu dans `perf-capos`.

## Ce qui sera construit — sept lots

Ordre tranché, **un go et un commit par lot**, après validation des lots en
cours.

### H0 — Fiches (documents, pas de code)
Les fiches des 12 familles écrites en français dans `docs/harmonie/`, une
famille par fichier, « Par où commencer » en tête ; règle en degrés notée sous
chaque fiche concernée. Timothée valide famille par famille ; 中文 de chaque
famille validée ensuite.
*Fini quand* : « Par où commencer » et au moins les premières familles sont
validées (les suivantes continuent pendant H1).

### H1 — Catalogue « Harmonie »
Page `/harmonie` (liste, filtres sensation × moment × niveau, parcours) et
`/harmonie/[fiche]` (avant → après, tonalité, sélecteur piano / guitare, capo
côté guitare, diagrammes et clavier, exemples du répertoire) ; lien dans
l'onglet Chants ; accès pianistes, guitaristes, admins ; build de l'index.
*Où* : `src/app/harmonie/`, `src/lib/harmonie/`,
`src/components/harmonie/` (diagramme guitare, clavier), `scripts/build-index.ts`
(ou script dédié appelé par `build:index`), `content/harmonie/`, `access.ts`,
page de l'onglet Chants, locales.

### MV — Ma version : retoucher un seul passage
Choix « Toutes les répétitions / Seulement ce passage » à l'enregistrement
d'une retouche dans une section répétée ; partage au même endroit ; mode
louange et vue partitions suivent. Met à jour l'hypothèse 3 de
`spec-version-perso.md`.
*Où* : `setlistVersions.ts`, `editSource.ts` (réutilisé), `PartitionView.tsx`,
`blocks.ts`, feuille d'édition de Ma version, locales ; tests de
`spec-version-perso` repris.

### 简谱 — Retoucher un accord sur le scan
Toucher un accord imprimé (changer, effacer), toucher la ligne d'accords
(ajouter), dans Ma version et Adapter ; rendu transposé comme les accords
imprimés ; historique de la setlist pour Adapter (même phrase que les
retouches d'Adapter). Bandeau « Dernier refrain : on monte en E » quand un
升调 touche un chant affiché en scan.
*Où* : `JianpuSheet.tsx`, types `SetlistItem` / `VersionItem`, flux Adapter
et Ma version, `setlistHistory`, locales. Contrôle à l'œil : `npm run
jianpu:audit <slug>`, trois appareils.

### H2 — Suggestions par chant
Règles des familles 1 à 8, feuille « Idées d'harmonie » (page du chant, ligne
de setlist), surlignage, « Essayer dans Ma version » (et « Seulement ce
passage » d'office quand la règle vise un passage), « Appliquer à la
setlist » pour la modulation, message « À reporter sur la partition 简谱 »,
« Ne marche pas sur ce chant » (Firestore `rejets`).
*Où* : `src/lib/harmonie/regles.ts`, `src/components/harmonie/`,
`SongView.tsx`, ligne de setlist, `PartitionView.tsx`, `firestore.rules` +
`access.ts`, locales.

### H3 — Idées de l'équipe
Ajouter, modifier, supprimer une idée depuis la feuille « Idées d'harmonie »
(page du chant et setlist), mention « nouveau » par appareil.
*Où* : `src/lib/firebase/harmonie.ts`, `src/components/harmonie/`,
`firestore.rules` + `access.ts`, locales.

### H4 — Transitions entre chants
Idée de transition vers le chant suivant dans les « Idées d'harmonie » d'un
chant de setlist, en lecture seule.
*Où* : `src/lib/harmonie/transitions.ts`, feuille « Idées d'harmonie »,
locales.

## Hypothèses (à corriger en testant)

1. Un compte présent dans **les deux** colonnes (Piano et Guitare) voit les
   deux instruments ; l'instrument montré d'abord est le dernier regardé sur
   l'appareil, sinon le piano.
2. Toutes les colonnes Piano / Guitare comptent (Franco, Campus, EDD,
   Fidélité…), passées ou à venir.
3. Une retouche d'Adapter sur un scan entre dans l'historique de la setlist
   avec la phrase existante des retouches d'Adapter ; une retouche de Ma
   version sur un scan n'y entre pas (comme Ma version aujourd'hui).
4. « Appliquer à la setlist » pour une modulation écrit dans l'historique de
   la setlist (phrase existante du 升调).
5. Le catalogue affiche seulement les fiches validées ; une famille sans fiche
   validée n'apparaît pas dans les filtres.
6. Un accord ajouté sur un scan prend la taille des accords imprimés de sa
   ligne ; s'il chevauche les chiffres, c'est accepté en V1 et vérifié sur la
   planche d'audit.

## Tests (Playwright, trois appareils)

- `tests/harmonie-catalogue.spec.ts` (H1) : accès refusé à un chanteur et à un
  batteur, accordé à un pianiste, un guitariste (planning) et un admin ;
  filtres combinés ; changement de tonalité ; capo côté guitare repris de
  `perf-capos` ; exemples du répertoire triés ; FR et 中文.
- `tests/version-perso.spec.ts` repris + cas « Seulement ce passage » (MV) :
  retouche d'un seul refrain, partage, structure différente chez l'autre.
- `tests/jianpu-retouche.spec.ts` (简谱) : changer, effacer, ajouter un accord
  sur un scan dans Ma version et dans Adapter, transposé ; bandeau de
  modulation ; planche `npm run jianpu:audit` regardée sur les trois tailles.
- `tests/harmonie-suggestions.spec.ts` (H2) : un chant FR et un chant 中文 ;
  5 suggestions dans l'ordre, « Voir plus », regroupement par section,
  surlignage, Essayer dans Ma version, Appliquer à la setlist (modulation),
  message de scan, « Ne marche pas » partagé puis annulé ; fusions exclues.
- `tests/harmonie-idees.spec.ts` (H3) : ajout depuis la page du chant et la
  setlist, transposition de l'avant → après, droits de l'auteur et de
  l'admin, « nouveau ».
- `tests/harmonie-transitions.spec.ts` (H4) : tonalités différentes, même
  tonalité, item transition sauté, fusion exclue.
- Règles en degrés : cas simples dans ces fichiers (pas de test unitaire hors
  Playwright, consigne du projet).

## Limites

- Les règles **n'entendent pas la mélodie** : des suggestions fausses
  existeront ; « À vérifier en jouant » et « Ne marche pas sur ce chant » en
  sont la contrepartie.
- Pas de son : la sensation passe par le texte, les dessins et les exemples.
- Les suggestions **ne se posent pas seules sur un scan 简谱** (aucun lien
  entre accord imprimé et `.cho`) ; le 升调 ne s'y voit que par le bandeau.
- Filtrage d'accès côté navigateur : les fiches sont publiques dans le
  bundle, comme les chants.
- La qualité du catalogue dépend de la relecture : c'est le goulot du
  chantier (60 fiches et plus, deux instruments, deux langues).

## Après le code (à faire par Timothée)

- Valider les fiches, famille par famille (H0, puis en continu).
- Publier `firestore.rules` après H2 puis après H3.
- Montrer le catalogue et les suggestions à Christelle.

## Commandes

```bash
npm run build:index      # chants + index de l'harmonie
npx tsc --noEmit
npm run lint
npm test -- tests/harmonie-catalogue.spec.ts
npm test -- tests/version-perso.spec.ts
npm test -- tests/jianpu-retouche.spec.ts
npm run jianpu:audit <slug>   # planche à regarder, trois tailles
```

## Questions ouvertes

Aucune. Les trois questions laissées à la relecture ont été tranchées le
17/09/2026 (propositions acceptées) : « même endroit » dans une version
partagée, compte des chants les plus chantés dans le navigateur, degrés en
chiffres.

## Avancement

- 17/09/2026 : entretien en sept tours, spec écrite. Les trois questions
  ouvertes sont tranchées le jour même. Aucun code.
- 17/09/2026 : **go pour H0**. Écrits dans `docs/harmonie/` : `README.md`
  (mode d'emploi de la relecture, vocabulaire, plan du catalogue en 69 fiches),
  `00-par-ou-commencer.md` (10 étapes) et `01-substitutions.md` (6 fiches,
  exemples vérifiés dans les `.cho`). **À valider par Timothée** avant
  d'écrire les familles suivantes.
- 17/09/2026 (suite) : « continue » : les **12 familles sont écrites**
  (`02-couleurs.md` à `12-boucles-priere-libre.md`, **69 fiches**), exemples
  vérifiés dans les `.cho`, doigtés guitare vérifiés note par note. Toutes
  « à valider » ; le 中文 attend la validation du français.

- 17/09/2026 (soir) : **go pour le lot 9 en entier**. Construit :

| Tranche | Construit | Tests |
| --- | --- | --- |
| Fondations | `lib/harmonie/degres.ts` (accord → degré, degré en chiffres), `lib/harmonie/motifs.ts` (chercher un motif dans un chant : partout / ligne / fin de ligne / fin de section / avant un refrain / toute fin / accord tenu, filtre par type de section), `lib/harmonie/regles.ts` (**40 règles + 5 modulations écrites en degrés**) | 6 + 7 + 7 tests |
| H1 | `lib/harmonie/fiches.ts` (lecture des 69 fiches de `docs/harmonie/`, vocabulaire vérifié — une coquille arrête le build), `scripts/build-harmonie.ts` → `public/harmonie-index.json` (appelé par `npm run build:index`), page `/harmonie` (parcours, filtres sensation × moment × niveau, familles), page `/harmonie/<fiche>` (avant → après transposable, pourquoi, pièges, piano / guitare, **diagrammes de guitare et clavier**, capo, exemples du répertoire classés par nombre de passages en setlist), `canUseHarmonie` dans `access.ts`, entrée dans l'onglet Chants | 24 tests × 3 appareils |
| H2 | `lib/harmonie/suggestions.ts` (une règle × une section = une idée, cinq au plus **les plus sûres puis les plus faciles**, toujours dans l'ordre du chant), `lib/harmonie/appliquer.ts` (poser l'idée dans le source), feuille **« Idées d'harmonie »** (page du chant), « Montrer » qui entoure la section, « Ne marche pas sur ce chant » (`harmonie/{slug}/rejets`) | 7 + 6 + 7 tests |
| H3 | Idées de l'équipe dans la même feuille (`harmonie/{slug}/idees`), instrument de l'auteur, « nouveau » par appareil, modification par l'auteur, suppression par l'auteur ou un admin | dans les 7 tests de la feuille |
| H2 (setlist) | Bouton « Idées d'harmonie » sur chaque chant de la vue partitions ; **« Essayer dans Ma version »** pose l'idée dans mon source (jamais dans la setlist) ; **« Appliquer à la setlist »** pose le 升调 sur le dernier refrain et l'accord d'approche à la fin d'avant, pour qui peut modifier la setlist ; **« À reporter sur la partition 简谱 »** quand le chant se lit sur son scan ; **bandeau « on monte en … »** au-dessus d'un scan modulé | 7 tests × 3 appareils |
| H4 | `lib/harmonie/transitions.ts` (même tonalité, vers le 4, vers le 5, un ton plus haut / plus bas, tonalité éloignée) + affichage en lecture seule dans la feuille d'une setlist | 2 tests |

**Relu par un relecteur à contexte vierge** (18/09/2026, comme le § 7 de la
feuille de route). Douze défauts prouvés sur le vrai répertoire, **tous
corrigés** :

| # | Ce qui était faux | Corrigé par |
| --- | --- | --- |
| 1 | Un motif à cheval sur deux lignes n'était posé que sur la première : **917 « Essayer » sur 17 450 ne changeaient rien**, en silence | l'endroit porte la place de **chaque** accord ; mesure refaite : **0 sans effet** |
| 2 | En tonalité mineure (`Am`), la modulation proposait « on monte en Am » et l'accord `Am/Am` | la tonique est lue avant tout calcul ; une seule fabrique d'étiquette pour les deux usages |
| 3 | S4 « cadence rompue » était proposée à la **toute fin de 119 chants**, ce que la fiche exclut | drapeau « jamais sur la dernière section » |
| 4 | Le remplacement réécrivait des accords que la règle ne change pas : **3 019 basses ou couleurs écrasées** (`Eb/G` → `Eb`) | les pas inchangés gardent l'étiquette du chant ; `basse: null` là où la fiche parle d'un accord en position fondamentale |
| 5 | C2 « le sus4 qui se résout » perdait… la résolution (`5sus4 → 1` au lieu de `5sus4 – 5 → 1`) | le « après » suit la fiche |
| 6 | Un `Asus4` écrit tel quel ne correspondait **jamais** à un pas « sus » : M2 affichait 0 exemple au lieu de 19 | la qualité « sus » est acceptée quand le pas demande un sus |
| 7 | Le 7m7b5 sortait « Emb5 » (un autre accord) | « m7b5 » |
| 8 · 9 | S5 et S2 ignoraient « ni le premier accord de la section » / « pas le dernier » : 293 + 15 endroits fautifs | deux drapeaux, plus un test qui lit la phrase de la fiche |
| 10 | Un batteur qui ouvrait `/harmonie` lisait « common.noAccess » | la phrase existe, en FR et en 中文 |
| 11 | Rejouer « Ne marche pas » était refusé par les règles Firestore | l'update est permis tant que l'auteur ne change pas |
| 12 | Cinq chants finissant sur une section sans accord n'avaient **aucune** idée de fin | « toute fin du chant » = la dernière section qui porte des accords |

Quatre écarts à la spec ont été comblés au passage : le **degré en chiffres**
s'affiche à côté des accords (il n'était nulle part) ; les **idées de l'équipe**
s'enregistrent en tonalité d'origine et se relisent dans la tonalité lue ; le
**lien vers une fiche** existe ; les textes restés en français dur sont passés
en libellés. Quatre tests qui ne mordaient pas ont été refaits — dont celui qui
compare désormais **les degrés écrits dans la fiche** à ceux du code, vu rouge
en y remettant exprès deux des bugs ci-dessus.

**Écarts assumés** (à corriger d'un mot si tu n'es pas d'accord) :

1. **Les fiches sont publiées avec leur statut**, pas retenues jusqu'à
   validation : sans ça le catalogue serait vide. Chaque fiche non validée
   porte une étiquette « à relire », et une ligne le dit en haut du catalogue.
   Passer une famille à `Statut | validée` dans son `.md` fait disparaître
   l'étiquette — aucun code à toucher.
2. **Le 中文 des fiches attend la validation du français**, comme la spec le
   demande (H0). Les libellés de l'app, les 12 sensations, les 7 moments et
   les niveaux sont bilingues dès maintenant.
3. **La tonalité ne transpose que les accords écrits entre accents graves.**
   Transposer les explications donnait des phrases à moitié justes (« E, » et
   « E » ne se transposent pas pareil ; « main droite F#-A-D » restait en D) :
   pire que rien. Une ligne le dit quand la tonalité choisie n'est plus D.
4. **Le capo ne transpose rien non plus** : il dit en quelle tonalité sonnent
   les formes écrites (« capo 2 : ces formes sonnent en E »). Le capo « repris
   du chant » de la spec suppose un chant : il n'y en a pas dans le catalogue.
5. **Cinq idées différentes d'abord** : la même fiche trouvée dans trois
   sections mangeait trois des cinq places. À sûreté et difficulté égales, on
   montre cinq fiches différentes avant de répéter.
6. **Les fiches gardent leurs exemples écrits à la main**, mais sans leur
   compte : le compte affiché est celui **calculé** sur les 371 chants (les
   nombres écrits en relecture étaient des estimations).
7. Sur la page d'un chant, « Idées d'harmonie » est une **entrée du menu ⋯**
   et non un bouton de plus dans la barre : à 390 px elle est déjà pleine
   (retour tactile du 16/09/2026). Dans une setlist, c'est un lien discret sur
   la carte du chant, à côté de « Sections » et « Rétablir l'original ».
8. **« Essayer dans Ma version » n'apparaît qu'en mode « Ma version »** : c'est
   le seul endroit où une retouche ne touche personne d'autre. Ailleurs, l'idée
   se lit sans s'appliquer.
9. Le **中文 des libellés de l'harmonie** (12 sensations, 7 moments, niveaux,
   boutons, section du guide) est **à relire** comme le reste du 中文 : il n'a
   pas encore de relecture humaine. Les termes musicaux (升调, 变调夹, 和弦)
   suivent ceux déjà employés dans le site.
10. Le **surlignage** de l'endroit visé se fait avec « Montrer » : la feuille se
   ferme, la section défile au centre et s'entoure deux secondes. Elle
   s'appuie sur `data-section-uids`, déjà posé pour le sommaire — `SongView`
   n'a pas été touché.
- 18/09/2026 : **tranche MV codée** (« Ma version : retoucher un seul
  passage »). Choix de portée dans la feuille d'édition d'une section
  répétée ; « Seulement ce passage » réutilise `materializeSectionCopy` et
  écrit `structure` + `sectionOrigins` dans mon document ; placement « au même
  endroit » pour qui lit une version partagée (`structureWithCopies`, dans
  `src/lib/setlist/sectionOrigins.ts`) ; vue partitions, sommaire et mode
  louange suivent. `tests/harmonie-ma-version.spec.ts` : 8 tests × 3 appareils,
  `tests/setlist-version.spec.ts` (18 × 3) toujours verte. Non commité.
