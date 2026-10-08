# Spec — 简谱 mieux intégrés, affichés par défaut, et « Sections uniques » en mode louange (08/10/2026)

## Origine

Demande de Timothée du 08/10/2026, mot pour mot :

> « Pour les 简谱 j'aimerai qu'ils soient mieux intégrés au site que l'image soit mieux intégré […] Il faut que ce soit
> effectif en partout où il y a les jianpu. il faudrait aussi ajouter la possibiltié d'avoir dans le mode louange,
> l'affichage uniquement des sections, et quand on affiche seulement les sections, il faut qu'on ait la structure du
> chant qui s'affiche aussi. »

- Planche : artefact <https://claude.ai/artifact/1d4ZW7Y9NVHcsLB9YrrbrA>, **version 26**, rangées **R19** (简谱 :
  pistes A, B et C) et **R19B** (mode louange : Sections uniques et structure).
- Aperçus de la planche, décrits image par image : [`chantier-jianpu/maquettes.md`](chantier-jianpu/maquettes.md)
  (48 images dans `chantier-jianpu/maquettes/`). **Seule la piste A est retenue** ; les écrans B et C, et la variante
  « rail vertical », sont gardés pour mémoire.
- État du code relevé avant la planche : `ui/apple-design` = `5878ce15`, `origin/main` = `908b7990` (merge-base
  `fc986d68`). Les numéros de ligne de cette spec ont été vérifiés le 08/10/2026 sur les deux branches.

Rien n'est codé sans le **go de Timothée**, lot par lot.

## Décisions du 08/10/2026

Réponses de Timothée aux questions Q1 à Q18 de la planche v20.

| # | Question | Réponse de Timothée | Ce que la réponse retient |
|---|---|---|---|
| D1 | Quelle piste ? | « A » | **A** (« Fondu dans la page ») |
| D2 | Sur quelles surfaces le 简谱 s'affiche-t-il par défaut ? | « Partout » | **Partout** : page chant, setlist (Partitions et Aperçu), mode louange, PDF de setlist |
| D3 | Quelle forme prend le réglage ? | « Oui » | **Oui** : un interrupteur « Partition 简谱 », préférence d'appareil allumée par défaut, qui remplace le segment à 3 choix. Reprise : Jamais → éteint ; Toujours et Choix du responsable → allumé |
| D4 | Le « Jouer sur : Paroles » du responsable l'emporte-t-il sur l'interrupteur allumé ? | « Non le choix de la personne prime » | **Non, le choix de la personne prime** : la préférence de la personne (son appareil) l'emporte sur le « Jouer sur : Paroles » du responsable. **Lecture retenue, confirmée le 08/10/2026** (question O1) : le choix du responsable ne vaut que pour une personne qui n'a jamais touché l'interrupteur ; dès qu'elle l'a réglé, son réglage gagne. La préférence doit donc distinguer « jamais réglée » d'« allumée » |
| D5 | Où se place la bascule sur la page chant ? | « oui » | **Oui** : un segment « 简谱 · Paroles » dans la page, sous les pastilles, retenu sur l'appareil, même réglage que l'interrupteur |
| D6 | Faut-il une bascule par chant sur la setlist ? | « Non » | **Non** : un seul interrupteur, dans Affichage |
| D7 | Que coupe-t-on de l'en-tête gravé ? | « ok » | **Ok** : couper titre, album, versets, « （C调） », « [共3张…] » ; garder la ligne « 1=X 4/4 » ; garder le pied gravé (la ligne « 灵栖清泉制谱…请勿翻印 » et le petit mouton dessiné à côté) |
| D8 | Comment traiter les filigranes ? | « ok » | **Ok** : accepter la limite des filigranes |
| D9 | Quelle couleur pour les accords réécrits sur le scan ? | « ok » | **Ok** : accords réécrits à l'encre, comme les gravés |
| D10 | Quel rendu en thème sombre ? | « Ok » | **Ok** : encre `#e4e4e7` sur noir en sombre |
| D11 | Comment afficher « Sections uniques » en mode louange ? | « Oui » | **Oui** : bandeau complet en tête de la page 1, rappel de 24 px sur les pages suivantes avec les sections de la page cerclées |
| D12 | Bandeau de pastilles en tête de chaque chant aussi en Ordre joué ? | « Oui » | **Oui** : bandeau de pastilles en tête de chaque chant aussi en Ordre joué |
| D13 | Que devient le 简谱 en Sections uniques et en Structure seule ? | « oui » | **Oui** : Sections uniques → scan inchangé, bandeau avec détails ; Structure seule → le scan s'efface, structure en grand ; le batteur perd le scan |
| D14 | Les pastilles rondes `StructureStrip` remplacent-elles `JianpuStructureStrip` en mode louange ? | « Oui » | **Oui** : `StructureStrip` remplace `JianpuStructureStrip` en mode louange ; rouvre la spec coup d'œil |
| D15 | Où ranger « Affichage » dans les Réglages du mode louange ? | « Oui » | **Oui** : Affichage sous « Vue » renommée « Rôle », même préférence `partition-layout` que la setlist |
| D16 | Corrige-t-on dans le même lot les défauts relevés ? | « Oui » | **Oui** : K1, K2, K3, et K4 par un simple avertissement « accords d'origine » sur la page 2 de 为我而来, sans nouveau calque |
| D17 | Le scan dans le PDF d'un chant seul ? | « Non » | **Non** : pas de scan dans le PDF du chant seul |
| D18 | Sur quelle branche ? | « Ok » | **Ok** : lot 1 « 简谱 par défaut » d'abord sur `main` (petit, dans l'ancien look), fusionné ensuite dans `ui/apple-design` ; intégration de l'image (piste A) et Sections uniques sur `ui/apple-design`. Rien ne part sur `main` sans un ordre explicite de Timothée donné au moment même |

Rappel des défauts K (plan de la planche, § 0) : **K1** en mode louange sur tablette et iPad paysage, le scan passe
sous les barres ; **K2** sur la page chant au téléphone, la barre d'onglets cache la fin de la feuille ; **K3** un chant
sur scan n'a pas l'en-tête du site ; **K4** la page 2 de 为我而来 n'a pas de calque (transposée, elle garde ses accords
gravés sans le dire).

## Règles du dépôt pour ce chantier

- **Branches** : tout se fait sur `ui/apple-design`, **sauf le lot 1**, codé sur `main` (D18) puis fusionné dans
  `ui/apple-design` par `git merge` (jamais de rebase de `main`). Aucune autre branche.
- **Push sur `main`** : seulement sur un **ordre explicite de Timothée donné au moment même** (un « oui » à une autre
  question n'en est pas un). `git pull --rebase` sur la branche juste avant chaque push ; jamais de `push --force`.
- **Couleurs gelées** : `serviceColors`, accords `#3f63cf`, 简谱 `#B91C1C`, sections `#EA580C`, logo. L'encre du scan
  n'est pas une couleur de marque : encre du scan = nouveau jeton `--jianpu-encre` dans `globals.css` : `#1c1c1e` dans
  `:root` (= `--foreground`), `#e4e4e7` dans `.dark` (encre adoucie choisie en D10, distincte de `--foreground`
  `#f2f2f7`, `globals.css:250`) (D9, D10). Les écritures du calque utilisent `hsl(var(--jianpu-encre))` (jeton au format HSL des
  autres jetons de `globals.css`). Les deux filtres SVG (clair, sombre) codent en dur ces deux valeurs
  RVB. Le thème de scène passe par `.dark` (`PerformanceMode.tsx:406`), donc le même jeton s'applique.
- **Firestore = REST** (`fetch` + jeton), jamais le SDK WebChannel. Aucune modification de `firestore.rules` n'est
  prévue (le champ `jianpuSheet` des items n'y est pas contrôlé ; vérifié le 08/10/2026). Si une tranche en découvre
  une : double modification `access.ts` + `firestore.rules`, **publication à la main par Timothée**, et le dire.
- **Aucun nom réel** dans les tests, fixtures, specs ou commits : noms fictifs (Ruth K., Léa M., Noé T.).
- **Un commit par tranche ou par lot**, message en français ; indexer par nom ; ne jamais commiter `next-env.d.ts` ni
  `tsconfig.json` réécrits par un serveur de test, `test-results/`, `.next*/`.
- **Go de Timothée avant de coder**, lot par lot. Tests Playwright écrits avant le code et vus rouges.
- Aucune partie du chantier n'est du back-office : rien ne passe derrière `BACK_OFFICE`.
- Libellés nouveaux en FR **et** 中文 (中文 relu par Timothée).
- `chords.json` (calques certifiés et gelés) **ne change pas** ; aucune coordonnée d'étiquette ne bouge.

## Commandes

```bash
npx playwright install --with-deps chromium        # en début de session cloud
npm test -- tests/<spec>.spec.ts                   # trois appareils : ordinateur, telephone, tablette
npm test -- tests/<spec>.spec.ts --project=tablette-paysage --project=ordinateur-1440   # + grand écran (specs listées dans SPECS_GRAND_ECRAN)
PW_SLUGS=all npm test -- tests/jianpu-sheet.spec.ts                 # les partitions 简谱 certifiées
PW_CHANTS_ZH=all npm test -- tests/lignes-chinoises.spec.ts --project=telephone --workers=2
npm run jianpu:audit <slug> [tonalité] [--dark]    # planche d'audit dans le navigateur (scripts/jianpu/debug/)
npx tsc --noEmit && npm run lint && npm run validate
```

Les captures regardées à l'œil se font aux **trois tailles** (et aux cinq pour l'agencement grand écran), sur au moins
un chant FR (Abba Père) et un chant ZH (一生爱你 ; 为我而来 pour les deux pages).

---

## Lot 1 — « 简谱 par défaut » (branche `main`, petit, ancien look)

**But** : un chant chinois qui a un scan s'ouvre **sur son scan**, partout (D2), sans action de personne ; un
interrupteur « Partition 简谱 » allumé par défaut remplace le segment à trois choix (D3) ; le choix de la personne
prime sur le « Paroles » du responsable (D4, lecture confirmée en O1). Rien ne change dans le rendu du scan (rectangle
blanc, titre gravé en double : c'est l'ancien look, D18).

Écart avec Q18 (b), qui décrivait le lot 1 comme « défaut Toujours + page chant qui lit la préférence » : le lot ajoute
l'interrupteur de D3 (sinon `main` garderait un segment à 3 choix que D3 supprime) et, selon O1, le « Paroles » du
responsable à trois états. À confirmer avec le go du lot 1.

**Où se code le lot 1** : en session locale (ou, en session cloud, Timothée donne l'ordre de pousser `main` en fin de
session : un commit sur `main` non poussé disparaît avec la session cloud). Fusionner `main` local dans
`ui/apple-design` n'est pas pousser `main` : L1-T6 peut suivre le commit du lot 1 sans attendre la mise en ligne. Le
lot 2 démarre après L1-T6, puisqu'il réécrit le même bloc Réglages. Si Timothée tient à ne fusionner qu'après le push,
le lot 2 attend la mise en ligne du lot 1.

### Le modèle

**Préférence d'appareil** (`src/lib/jianpu/preference.ts`, identique sur les deux branches) : on garde la clé
`jianpu-sheet-pref` et ses trois valeurs, avec un nouveau sens. Aucune migration, aucune écriture au chargement.

| Valeur stockée | État | L'interrupteur montre | Le chant à scan s'affiche… |
|---|---|---|---|
| absente, ou `auto` | **non réglée** | allumé | sur le scan, **sauf** si le responsable a choisi « Paroles » pour cet item (`jianpuSheet: false`) |
| `always` | **allumée** (réglée) | allumé | sur le scan, toujours |
| `never` | **éteinte** (réglée) | éteint | en paroles, toujours |

- Reprise (D3) : « Jamais » (`never`) → éteint ; « Toujours » (`always`) → allumé ; « Choix du responsable » (`auto`)
  → allumé. L'`auto` déjà stocké est lu comme **non réglé** (affiché allumé, suit le responsable) : question **O2**.
- Toucher l'interrupteur (ou le bouton 谱 de la page chant au lot 1, le segment au lot 3) écrit `always` ou `never` :
  la préférence devient **réglée**. Il n'y a pas de retour à « non réglée » depuis l'interface (O1).
- `sheetEnabled(pref, itemChoice)` (`preference.ts:26`) : `always` → vrai ; `never` → faux ; non réglée →
  `itemChoice !== false` (aujourd'hui `Boolean(itemChoice)`). C'est le seul changement de règle ; tous les lecteurs
  (vue Partitions, Liste, mode louange, PDF, message Harmonie, Sommaire et Aperçu sur la branche) le suivent.
- Deux petites fonctions à côté, par exemple `interrupteurAllume(pref) = pref !== "never"` et
  `prefDepuisInterrupteur(on) = on ? "always" : "never"`, pour que l'interrupteur et le bouton ne recodent pas la règle.
- Lecture au montage, comme `chart-style` (`src/lib/chartStylePref.ts`) : `useState` d'une valeur par défaut puis
  `useEffect` qui lit le stockage (pas d'écart d'hydratation) ; stockage indisponible → non réglée.

**Item de setlist à trois états** (`jianpuSheet?: boolean`, `src/types/setList.ts:53`) : `true` = Partition 简谱 ;
`false` = **Paroles, choisi par le responsable** ; absent = non réglé, donc scan. Aujourd'hui `false` n'est jamais
écrit : `formItems.ts` (`main` :121/:134, branche :124/:137) et `buildSetlistItems.ts:115` ne gardent la clé que si elle
vaut `true`. Le lot les fait écrire `false` aussi, **sans jamais écrire `false` pour un item où la clé est absente**
(détail en L1-T4 : sinon le premier enregistrement automatique de l'éditeur passerait toute la setlist en « Paroles »).

### Ce qui change pour les setlists existantes

- Aucun item n'a jamais écrit `false` : **tous les chants qui ont un scan** (189 entrées de `public/jianpu/index.json`)
  passent au scan pour chaque appareil dont la préférence est absente, `auto` ou `always`. Les appareils réglés sur
  « Jamais » restent en paroles. Rien n'est écrit dans Firestore par le lot. Un « 简谱 » coché puis décoché autrefois
  par un responsable n'a laissé aucune trace (l'ancien code n'écrit jamais `false`) : il repasse au scan comme les
  autres.
- **Sur `main`, K1, K2 et K3 deviennent visibles par défaut jusqu'au lot 3** : ils ne touchaient que les appareils
  réglés sur « Toujours » ; avec le scan par défaut, ils deviennent l'expérience de tout le monde en ligne jusqu'à la
  mise en ligne de la branche (K2 : fin de feuille sous la barre d'onglets du téléphone ; K3 : la page chant n'a plus
  d'en-tête du site, `SongDetailClient.tsx:547` remplace tout `SongView` ; K1 : en mode louange sur tablette, scan sous
  les barres). Question **O14**.
- **Hors ligne** : voir Cas limites et question **O15** (les scans ne sont pas mis en cache par le service worker).
- PDF de setlist plus lourd et plus long à fabriquer : chaque page de scan est ré-encodée en PNG (`images.ts:152`).
- Mode louange : ces chants deviennent une page de scan par page de partition (au lieu de leurs sections).
- PDF de setlist : ces chants s'impriment sur leur scan (une page A4 par page de scan), le PDF change de longueur.
- Un chant **adapté** (`contentOverride`) ou joué en **Ma version** et qui a un scan affiche le scan, avec le badge
  existant « Adaptation masquée par le 简谱 » / « Ma version masquée par le 简谱 » (`PartitionView`) : question **O4**.
- Annotations du mode louange posées sur les pages en paroles de ces chants : elles restent enregistrées mais ne se
  voient plus (la page n'est plus la même) ; elles reviennent si la personne repasse en paroles.
- Idées d'harmonie appliquées sur un de ces chants : le message « À reporter sur la partition 简谱 » s'affiche
  désormais (règle `sheetEnabled`).
- Page chant : un chant à scan s'ouvre sur son scan, **dans sa tonalité recommandée** (comportement d'aujourd'hui de
  la page) : si elle diffère de l'originale, le calque est actif dès l'ouverture.
- Historique : la première fois qu'un responsable choisit « Paroles » sur un ancien item, l'entrée « {chant} joué sur
  les paroles » apparaît (passage de « absent » à `false`).

### Fichiers sur `main` (et ce qui diffère de `ui/apple-design`)

| Rôle | `origin/main` | `ui/apple-design` (pour la fusion) |
|---|---|---|
| Préférence et règle | `src/lib/jianpu/preference.ts:7-30` | identique |
| Page chant : état du scan, bouton 谱, rendu | `src/app/songs/[slug]/SongDetailClient.tsx:99-100`, `:440-453` (libellé `hidden sm:inline`), `:547-557` | `:102-103`, `:476-489` (libellé `libelle-chant`, deux volets), `:611-633` |
| Setlist : état, lecture, changement | `src/app/setlists/[id]/SetlistDetailClient.tsx:149`, `:234`, `:257-260` | `:231`, `:351`, `:378-381` |
| Setlist : réglage 简谱 (3 choix) | même fichier `:1127-1145`, dans le menu ⋯ de la vue Partitions | `:1403-1425`, dans `reglagesAffichage` (`:1373`), partagé par le bouton « Affichage » (G) et le sous-menu du ⋯ (deux volets) |
| Setlist : PDF, message Harmonie | `:364`, `:380` ; `:1395` | `:743`, `:759` ; `:2018` |
| Vue Partitions, Liste | `PartitionView.tsx:397`, `ListView.tsx:266` | `PartitionView.tsx:408`, `ListView.tsx:263` |
| Sommaire, Aperçu | absents | `Sommaire.tsx:72, 125`, `ApercuSetlist.tsx:100` |
| Mode louange : état, réglage (segment) | `src/components/performance/PerformanceMode.tsx:453-457`, `:1413-1431` | `:434-438`, `:1486-1505` |
| Blocs du mode louange | `src/lib/performance/blocks.ts:116, 123, 270` | identique |
| PDF de setlist | `src/components/pdf/SetlistFullPDF.tsx:124-127` | identique |
| Éditeur : choix du responsable | ancien formulaire : `src/components/setlists/SetlistForm.tsx:888`, bouton « 谱 简谱 » `SetlistFormRows.tsx:846-859` | éditeur piste 2 : radiogroupe « Jouer sur » `src/components/setlists/editeur/Volets.tsx:111-136`, badge `ListeCourte.tsx:171-175` |
| Données de l'item, historique | `formItems.ts:121, 134` ; `buildSetlistItems.ts:115` ; `history.ts:196, 304` ; `SetlistHistory.tsx:73` | `formItems.ts:124, 137` ; le reste identique |
| Libellés | `src/locales/fr.json:479-483` (`performance.jianpuPref.*`), `zh-CN.json` | `fr.json:597-601` |

### Tranches

| Tranche | Ce qui change | Où |
|---|---|---|
| L1-T1 | Règle et préférence : `sheetEnabled` (non réglée → `itemChoice !== false`), fonctions de l'interrupteur, commentaires d'en-tête mis à jour. Tests purs d'abord | `src/lib/jianpu/preference.ts` |
| L1-T2 | Page chant : `showScore` est **dérivé** de la préférence lue au montage (`sheetEnabled(pref, undefined)`), sans `useState` séparé, pour qu'il ne puisse pas diverger de la préférence ; le bouton 谱 (`SongDetailClient.tsx` `main` :441, branche :477) porte `aria-pressed={showScore}` et écrit `always` / `never` à chaque bascule. Le bouton reste dans la barre (ancien look ; le segment D5 arrive au lot 3, question **O13**). Item d'une setlist ouverte en `?setlist=…&item=…` : question **O3** | `SongDetailClient.tsx` |
| L1-T3 | Setlist et mode louange : « Partition 简谱 » devient **un interrupteur** (D3, D6) — `DropdownMenuCheckboxItem` dans le menu ⋯ de la vue Partitions (comme « Couleurs par section »), `Switch` dans les Réglages du mode louange — affiché seulement si un chant de la setlist a un scan (`hasJianpuSheets`, inchangé). **Un seul état partagé** : `PerformanceMode` reçoit `jianpuPref` et `onJianpuPrefChange` en props (montage dans `SetlistDetailClient`, `main` ≈:1590, branche :2120-2130) et supprime son `useState` local (`main` :453, branche :434), pour que le menu de la setlist soit à jour en sortant du mode. Dans les Réglages, `SettingRow` (`PerformanceMode.tsx:1599-1606`) ne relie pas son libellé au contrôle : `<Switch aria-label={t('performance.jianpuSheet')} checked={jianpuPref !== 'never'} onCheckedChange={(on) => changeJianpuPref(on ? 'always' : 'never')} />`. Clés `performance.jianpuPref.*` retirées (FR et 中文), devenues orphelines. Aide sous l'interrupteur : texte à valider (**O1**) | `SetlistDetailClient.tsx`, `PerformanceMode.tsx`, `fr.json`, `zh-CN.json` |
| L1-T4 | Éditeur et données : le bouton « 谱 简谱 » de l'ancien formulaire est **actif quand `jianpuSheet !== false`** (présélectionné pour un chant à scan) ; le toucher écrit `false` (Paroles) ou `true` ; `formItems.ts` et `buildSetlistItems.ts` gardent `false` **sans en inventer** (détail ci-dessous) ; `history.ts:196` compare `jianpuSheet !== false` (absent ↔ `true` ne fait pas d'entrée ; vers `false` → « joué sur les paroles ») | `SetlistFormRows.tsx`, `formItems.ts`, `buildSetlistItems.ts`, `history.ts` |
| L1-T5 | Tests existants mis à jour (tableaux ci-dessous) ; suites lancées projet par projet (`npm test -- --project=<appareil> --shard=i/4`, un projet ou un quart par commande), ou suite complète lancée en local par Timothée ; en session cloud, les specs touchées sur les trois projets ; captures aux trois tailles (Abba Père, 一生爱你, 为我而来) | `tests/` |
| L1-T6 | Sur `ui/apple-design`, `git merge main` (`main` local : la fusion n'attend pas le push, voir « Où se code le lot 1 »). Lancer `git merge --no-commit main` puis `git diff --name-only --diff-filter=U` avant toute résolution. Détail ci-dessous | `ui/apple-design` |

**Détail de L1-T4** (bloquant : aujourd'hui `toFormItem` a un paramètre par défaut `jianpuSheet = false`, donc tout
item sans clé arrive au formulaire avec `false` ; l'éditeur enregistre tout seul et réécrit toute la liste par
`buildSetlistItems(buildFormItems(...))` — `EditSetlistClient.tsx:45` → `SetlistForm.tsx:239` sur `main`, :261 sur la
branche. Se contenter de « garder `false` » écrirait `jianpuSheet: false` sur tous les chants au premier
enregistrement) :

1. `formItems.ts:121` (branche :124) : `jianpuSheet?: boolean,` sans valeur par défaut ;
2. `formItems.ts:134` (branche :137) : `...(jianpuSheet !== undefined ? { jianpuSheet } : {})` ;
3. l'appel des fusions dans `buildFormItems` (`:205` sur `main`, argument `false`) passe `undefined` ;
4. `buildSetlistItems.ts:115` : `...(item.jianpuSheet !== undefined ? { jianpuSheet: item.jianpuSheet } : {})` ;
5. bouton « 谱 简谱 » (`origin/main:src/components/setlists/SetlistFormRows.tsx:849-852`, aujourd'hui
   `onClick={() => onJianpuSheetChange(!item.jianpuSheet)}`, qui demanderait deux touchers pour obtenir « Paroles » sur
   un item absent affiché actif) : `const actif = item.jianpuSheet !== false;` puis
   `onClick={() => onJianpuSheetChange(!actif)}`, la classe conditionnée par `actif`, et `aria-pressed={actif}`.

**Détail de L1-T6** :

- **Conflits sûrs** : `SetlistDetailClient.tsx` (garder `reglagesAffichage`, y poser le `DropdownMenuCheckboxItem`) ;
  `SetlistFormRows.tsx` (la branche a supprimé la ligne de chant de l'ancien formulaire, 1269 → 722 lignes, plus de
  `jianpuSheet` : garder la version de la branche, sans bouton) ; `formItems.ts` (`main` modifie :121, la branche a
  modifié :122, type `adapted` avec `jianpuChords` : version de la branche + les changements de L1-T4).
- **Conflits possibles** : `SongDetailClient.tsx` (bouton, `libelle-chant`), `tests/fusions-dp.spec.ts`,
  `tests/performance-mode.spec.ts`.
- `PerformanceMode.tsx` : le bloc Réglages est identique sur les deux branches (`main` :1413-1431 = branche
  :1486-1505), la fusion passera probablement sans conflit ; l'interrupteur arrive là où le lot 2 (L2-T2) va réécrire.
- Report sur les fichiers propres à la branche : `Volets.tsx` (`on = (item.jianpuSheet !== false) === sur`, « Partition
  简谱 » présélectionné), `ListeCourte.tsx` (le badge suit `jianpuSheet !== false` en attendant **O6**) ; `Sommaire.tsx`
  et `ApercuSetlist.tsx` suivent `sheetEnabled` sans changement.
- Après fusion, adapter `tests/jianpu-par-defaut.spec.ts` sur la branche : test 5 via
  `barre(page).getByRole('button', { name: 'Affichage' })` (`setlist-g.spec.ts:278`) ; test 8 via le `radiogroup`
  « Jouer sur » (`setlist-editeur-piste2.spec.ts:244-250`, qui passe de `toBeFalsy()` à `toBe(false)`) ; test 9 avec la
  ligne de référence de la branche (`export-pdf.spec.ts:255`). Tests propres à la branche mis à jour.

### Comportement attendu, écran par écran

- **Page chant, chant ZH à scan** (téléphone, tablette, ordinateur ; deux volets sur la branche après L1-T6) : à la
  première visite (stockage vide), le scan est affiché, les paroles non ; le bouton 谱 est actif. Le toucher passe en
  paroles et écrit `never` ; recharger garde les paroles ; le retoucher écrit `always`. Chant FR ou chant ZH sans scan :
  inchangé, pas de bouton.
- **Setlist, vue Partitions** : un item sans `jianpuSheet` s'affiche sur son scan ; un item `jianpuSheet: false`
  s'affiche en paroles **pour une préférence non réglée**, sur son scan pour `always`, en paroles pour `never` (D4).
  Menu Affichage : « Ordre joué · Sections uniques · Structure seule » (inchangés) puis l'interrupteur « Partition
  简谱 », coché par défaut ; plus de « Choix du responsable · Toujours · Jamais ».
- **Vue Liste** (`main`) : la pastille « 谱 简谱 » suit la règle, donc s'affiche sur presque tous les chants à scan
  (marque d'exception : O6, après le lot 1).
- **Mode louange** : même règle ; Réglages : « Partition 简谱 » est un interrupteur à côté de « Couleurs par
  section », allumé par défaut ; l'éteindre repasse aussitôt les chants à scan en paroles (pagination refaite) et écrit
  `never`, partagé avec la setlist.
- **PDF de setlist** : les chants à scan s'impriment sur leur scan selon la même règle et la préférence de l'appareil
  qui fabrique le PDF.
- **Éditeur** (`main` : ancien formulaire) : pour un chant à scan, « 谱 简谱 » est actif d'office ; le désactiver écrit
  `jianpuSheet: false`.

### Cas limites

- Stockage local indisponible (navigation privée, erreur) → non réglée : scan, sauf `false` du responsable.
- Valeur inconnue dans `jianpu-sheet-pref` → non réglée.
- Fusions : inchangées (une fusion n'a pas de scan, `PartitionView` et `blocks.ts` les traitent à part).
- Un item `jianpuSheet: true` (setlists d'avant) reste sur le scan pour tous sauf `never`.
- Chant dont le scan n'est pas encore chargé (manifeste en cours) : paroles d'abord, puis bascule au scan à l'arrivée
  du manifeste, comme aujourd'hui avec « Toujours ».
- **Hors ligne** : le service worker ne met en cache ni `/jianpu/index.json`, ni `/jianpu/chords.json`, ni les images
  (servies par `next/image` : `/_next/image?url=%2Fjianpu%2F…`) ; elles tombent dans « réseau, repli cache » sans jamais
  être écrites dans le cache (`public/sw.js:136-137`). Les paroles, elles, sont en cache (`/api/song/*`). Avec le scan
  par défaut, un mode louange ouvert avec un réseau faible à l'église peut afficher des pages de scan vides, là où les
  paroles marchaient. Question **O15**. Rien ne se met en cache sur `localhost` : une vérification se fait en ligne.

### Tests

Nouvelle spec **`tests/jianpu-par-defaut.spec.ts`**, trois appareils (setlist et session simulées par
`tests/helpers/fakeSession.ts`, noms fictifs) :

1. Règle pure : `sheetEnabled` pour les 3 états de
   préférence × 3 états d'item (`true`, `false`, absent) — 9 cas, dont « non réglée + `false` → paroles » et
   « `always` + `false` → scan ».
2. Page chant 一生爱你, stockage vide : `[data-jianpu-page] img` visible, aucune ligne de paroles `[data-copy-line]` ;
   bouton 谱 `aria-pressed="true"` ; page `abba-pere` : paroles, pas de bouton 谱.
3. Page chant : toucher 谱 → paroles, `aria-pressed="false"` et `localStorage["jianpu-sheet-pref"] === "never"` ;
   recharger → paroles ; retoucher → scan et `"always"`.
4. Vue Partitions, trois items à scan (absent, `true`, `false`) : préférence
   absente → scan, scan, paroles ; `always` → trois scans ; `never` → trois paroles.
5. Menu de la vue Partitions (sur `main` : le ⋯ `getByRole('button', { name: "Plus d'actions" })`, il n'y a pas de
   bouton « Affichage » ; sur la branche après L1-T6 : `barre(page).getByRole('button', { name: 'Affichage' })`) :
   `menuitemcheckbox` « Partition 简谱 » coché ; aucun `menuitemradio` « Choix du responsable », « Toujours »,
   « Jamais ». Le décocher → paroles, `"never"`.
6. Reprise : `auto` stocké → interrupteur coché, item `false` en paroles ;
   `always` → coché ; `never` → décoché.
7. Mode louange : chant à scan sans `jianpuSheet` → page `[data-jianpu-page]` (compter avec `onStage(page, sel)`,
   `tests/performance-mode.spec.ts:51-52`, à déplacer dans `tests/helpers/` : la copie de mesure `aria-hidden` contient
   aussi les `[data-jianpu-page]` et `[data-section]`) ; Réglages → `getByRole('switch', { name: 'Partition 简谱' })`
   coché ; l'éteindre → plus de `[data-jianpu-page]`, des `[data-section]` ; quitter le mode, ouvrir le menu →
   `menuitemcheckbox` « Partition 简谱 » non coché, **sans `page.reload()`**.
8. Éditeur (ancien formulaire sur `main`, « Jouer sur » sur la branche) : chant à scan → choix « 简谱 » actif d'office
   (sur `main` : `expect(bouton).toHaveAttribute('aria-pressed', 'true')`) ; un clic → l'item enregistré porte
   `jianpuSheet: false` (strictement) ; l'historique montre « joué sur les paroles ». Cas pur :
   `buildSetlistItems(buildFormItems([item sans jianpuSheet]))[0]` n'a pas la clé (`'jianpuSheet' in x === false`), et
   un item `false` reste `false`.
9. PDF de setlist, en appelant `SetlistFullPDF({...})` comme `tests/export-pdf.spec.ts:224` (`main`) / `:255`
   (branche) : passer `contents` pour 一生爱你 (lu dans `content/songs/` ; sans lui, `SetlistFullPDF.tsx:117-118` sort
   l'item avant de regarder le scan), `jianpuSheets` = `public/jianpu/index.json`,
   `jianpuImages = { '一生爱你-p1.webp': 'data:image/png;base64,' }` (sans elle, `:130` retombe sur les paroles), et
   compter les enfants dont `type === JianpuPDFPage` : préférence non réglée → une page 简谱 pour l'item sans
   `jianpuSheet`, aucune pour l'item `false`.

**Tests existants qui changent** (cherchés le 08/10/2026 par `grep` dans `tests/`) :

| Fichier | Pourquoi | Changement |
|---|---|---|
| `tests/helpers/jianpu.ts:66` (`openSheet`, utilisé par `jianpu-sheet`, `jianpu-tonalite-cho`, `nouveau-chant`, `nouveaux-membres` et les scripts `scripts/jianpu/audit-browser.ts`, `sweep-browser.ts:128`, `zoom-browser.ts:35`) | le clic sur « 简谱 » **éteindrait** le scan | `page.addInitScript(() => localStorage.setItem('jianpu-sheet-pref', 'always'))` avant `goto`, sans clic, puis attendre `[data-jianpu-page]` : les scripts hors test restent déterministes quel que soit le défaut |
| `tests/fusions-dp.spec.ts` (`main` :402, branche :424) | même clic sur la page chant | supprimer le clic |
| `tests/chants-deux-volets.spec.ts:281` (branche) | clic sur « 简谱 » dans `barre-outils` | supprimer le clic |
| `tests/setlist-g.spec.ts:282` (branche) | menu : « Choix du responsable », « Toujours », « Jamais » | trois `menuitemradio` + un `menuitemcheckbox` « Partition 简谱 » |
| `tests/setlist-editeur-piste2.spec.ts:248-250` (branche) | « Paroles » doit écrire `false` | `toBe(false)` au lieu de `toBeFalsy()` |
| `tests/setlist-g.spec.ts:312`, `tests/setlist-deux-volets.spec.ts:192` (branche) | marques « 谱 简谱 » / « Partition 简谱 » | inchangés au lot 1 ; à revoir si O6 change les marques |
| `tests/performance-mode.spec.ts` (« reprise des réglages », 一生爱你 sans `jianpuSheet`, lit le pinyin) | le chant passerait au scan | `addInitScript` qui pose `jianpu-sheet-pref = never`, ou item `jianpuSheet: false` |
| `tests/harmonie-setlist.spec.ts:123, 134` | posent déjà `always` | inchangés |

**Candidats à vérifier**, recensés par les slugs de `public/jianpu/index.json` présents dans `tests/` (ils ouvrent une
page chant, une setlist ou le mode louange avec un chant à scan sans `jianpuSheet` et peuvent lire des paroles ; par
exemple `section-labels.spec.ts:17` ouvre `/songs/我神我王` et lit « Pré-refrain » dans les paroles : rouge certain ;
`harmonie-setlist.spec.ts:44`, setlist avec 一生爱你 sans clé, pour ses autres tests) :

| Branche | Fichiers |
|---|---|
| `main` (25 fichiers) | `accords-voisins-zh`, `copy-lyrics`, `coup-d-oeil`, `fusions-dp`, `harmonie-idees`, `harmonie-ma-version`, `harmonie-setlist`, `lignes-accords`, `lignes-chinoises` (`PW_CHANTS_ZH=all`), `look-barres`, `look-halo`, `look-louange`, `look-recents`, `performance-mode`, `pinyin-espace`, `recommended-key`, `section-labels`, `setlist-editor` (`:41`), `setlist-history`, `setlist-regie`, `setlist-version`, plus les `jianpu-*` et `harmonie-jianpu` |
| `ui/apple-design` (41 fichiers) | les mêmes, plus `agencement-barre-reduite` (`:25`), `agencement-v18-chants`, `chants-deux-volets`, `deux-volets-finitions`, `navigation-grand-ecran`, `pages-en-grand-accueil`, `pages-en-grand-setlists`, `setlist-bibliotheque`, `setlist-deux-volets`, `setlist-fusionner`, `setlist-g`, `statistiques` |

`nouveau-chant` (`PW_CHANT=<slug zh>`) passe par `openSheet` (tableau ci-dessus). Règle : un test rouge **à cause du nouveau défaut** reçoit `jianpu-sheet-pref = never` (ou un item `false`) s'il
porte sur les paroles ; **jamais** une assertion affaiblie ni un test retiré.

### Critères de fini (lot 1)

- [ ] Préférence absente : page chant, vue Partitions, mode louange et PDF de setlist montrent le scan d'un chant qui
      en a un (trois appareils).
- [ ] « Partition 简谱 » est un interrupteur dans le menu Affichage et dans les Réglages du mode louange ; plus aucun
      « Choix du responsable / Toujours / Jamais » à l'écran.
- [ ] Reprise D3 vérifiée par test (`never`, `always`, `auto`).
- [ ] Le « Paroles » du responsable s'écrit `false` et vaut pour une préférence non réglée ; une préférence réglée
      l'emporte (D4, confirmé en O1).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run validate`, suite complète verte sur les trois appareils (projet par
      projet ou par quarts, voir L1-T5) ; `PW_SLUGS=all` sur `jianpu-sheet.spec.ts` vert.
- [ ] Un commit sur `main` ; **push seulement sur ordre de Timothée** ; puis L1-T6 (fusion de `main` local et report)
      sur `ui/apple-design`, suite de la branche verte (cinq projets pour les specs `SPECS_GRAND_ECRAN`).

---

## Lot 2 — Sections uniques et structure en mode louange (`ui/apple-design`)

**But** : dans le mode louange, choisir **Ordre joué · Sections uniques · Structure seule** (même réglage que la
setlist, D15) ; en Sections uniques, chaque section une fois, avec la structure du chant en tête (D11) ; le bandeau de
pastilles en tête de chaque chant aussi en Ordre joué (D12) ; un seul langage de structure, les pastilles rondes (D14).
Ce lot ne dépend pas du rendu du scan : il démarre après L1-T6.

**Ce qui change pour les appareils existants** : aujourd'hui `PerformanceMode` ne lit pas `partition-layout`. Un
`partition-layout` déjà réglé dans la setlist s'applique désormais au mode louange : un appareil qui a choisi
« Sections uniques » ou « Structure seule » dans la setlist verra son mode louange changer sans rien toucher (un
pianiste qui regardait « Structure seule » en coup d'œil ouvrira le mode louange sans paroles ni scan). Question
**O16**.

Maquettes : `v20-ml-reglages-telephone`, `v20-ml-reglages-ipad-paysage`, `v20-ml-ordre-telephone`,
`v20-ml-uniques-telephone`, `v20-ml-uniques-p2-telephone`, `v20-ml-uniques-tablette`,
`v20-ml-uniques-p2-sombre-tablette`, `v20-ml-uniques-ipad-paysage`, `v20-ml-uniques-sombre-ordinateur`,
`v20-ml-uniques-zh-telephone`, `v20-ml-structure-zh-telephone` (voir `chantier-jianpu/maquettes.md`).

### Tranches

| Tranche | Ce qui change | Où |
|---|---|---|
| L2-T1 | **Blocs** : `buildPerformanceBlocks` reçoit l'affichage par un **objet d'options** (par exemple `{ affichage }`), pas en 8e argument positionnel. `played` : inchangé. `unique` : `uniqueSections(occurrences, playedKey)` (`src/lib/setlist/uniqueSections.ts:11`), une nouvelle impression par tonalité de 升调 ; notes, nuances et transitions ne sont plus portées par les sections ; fusions en structure mixte : même filtre que `PartitionView.tsx:184-190`. `structure` : un chant à scan ne produit **pas** de bloc `jianpu-sheet` mais ses sections (D13). `SongHeaderBlock` porte `steps` (déroulé joué, modulation vers la tonalité jouée neutralisée, comme les blocs de scan aujourd'hui) ; `SectionBlock` porte `occurrenceUids` (les occurrences qu'il représente). Tests purs d'abord | `src/lib/performance/blocks.ts` |
| L2-T2 | **Réglages** : la rangée « Vue » devient « **Rôle** » (`performance.view`, `PerformanceMode.tsx:1389`) ; dessous, une rangée « **Affichage** » : segment Ordre joué · Sections uniques · Structure seule (libellés `setlists.detail.layout.*`). État nommé **`affichage`** (le nom `layout` est déjà pris dans `PerformanceMode`, `:385`, `const [layout, setLayout] = useState<PerfPage[]>`) = la préférence `partition-layout` (`src/lib/partitionLayoutPref.ts`), **un seul état** partagé avec la setlist : `SetlistDetailClient` passe la valeur et son setter à `PerformanceMode` (montage `:2119-2131`), pour que le menu Affichage de la setlist soit à jour en sortant du mode. Le rôle Batteur pose `structure` (et l'écrit) ; toucher Affichage désélectionne le rôle, comme « Accords » aujourd'hui. Vue structure = `affichage === "structure"` (cas de « Masquer les paroles » + « Accords » coupés : **O7** ; autres rôles : **O5**). Aujourd'hui `structureMode = hideLyrics && !showChords` (`:491`) et le Batteur pose `hideLyrics: true, chords: false` (`:301`) : **choisir Ordre joué ou Sections uniques depuis la vue structure remet `hideLyrics=false` et `showChords=true` (et les écrit)**, puis désélectionne le rôle ; sinon, avec O7, « Structure seule » reviendrait aussitôt. « 2 colonnes » reste coupé en Structure seule (inchangé, `:505`) | `PerformanceMode.tsx`, `SetlistDetailClient.tsx`, `fr.json`, `zh-CN.json` |
| L2-T3 | **Bandeau en tête du chant** : `SongHeader` (`PerformanceMode.tsx:132-194`) rend `StructureStrip` (`src/components/song/SongView.tsx:445`), pastilles de 32 px sous 640 px, 44 px au-delà : **sans détails en Ordre joué** (D12), **avec détails en Sections uniques** (D11 : ×N, « → X », notes et transitions numérotées sous un filet). En Structure seule, pas de bandeau : la structure est déjà en grand (maquette `v20-ml-structure-zh-telephone`). Il est mesuré avec l'en-tête, donc en deux colonnes il reste en pleine largeur au-dessus des colonnes (`paginateColumns` inchangé). Pages de scan : `StructureStrip` remplace `JianpuStructureStrip` (D14 ; détails : **O8**) ; `src/components/jianpu/JianpuStructureStrip.tsx`, devenu orphelin, est supprimé | `PerformanceMode.tsx`, `SongView.tsx`, `JianpuStructureStrip.tsx` |
| L2-T4 | **Rappel** (Sections uniques seulement) : sur les pages 2 et suivantes d'un même chant, une rangée de pastilles de **24 px**, sans détails, collée en haut de la **page** (pas dans la barre : elle ne s'escamote pas) ; les pastilles des sections présentes sur la page sont **cerclées d'encre** (2 px ; `#f2f2f7` en thème de scène), chacune à sa **première occurrence** (`occurrenceUids`), les reprises ne le sont pas. La pagination réserve 32 px sur ces pages : `pagesUneColonne(flow, heights, pageHeight, breakBefore)` et `paginateColumns` (`src/lib/performance/columns.ts:53`, `:68`) reçoivent une seule hauteur et ne savent pas où commence un chant ; ajouter un paramètre `reserveSuite: number` (32 px en Sections uniques, 0 sinon) : toute page dont le premier bloc n'est pas dans `breakBefore` (début de chant) a pour hauteur `pageHeight − reserveSuite`. Tests purs dans `columns` : un chant de 3 pages en `unique` donne les pages 2 et 3 avec 32 px de moins. Pas de rappel en Ordre joué ni en Structure seule | `PerformanceMode.tsx`, `src/lib/performance/columns.ts`, `SongView.tsx` (variante compacte de `StructureStrip` : taille 24 px, sans détails, `cerclees`) |
| L2-T5 | **Annotations** : la signature `layoutSig` (construite dans le composant, `PerformanceMode.tsx:801`) sort dans une fonction pure de `blocks.ts` (par exemple `signatureAffichage({ showChords, …, affichage })`), qui prend un marqueur de l'affichage (par exemple `au` en Sections uniques, `as` en Structure seule ; rien en Ordre joué, pour que les clés d'aujourd'hui ne changent pas) ; voir **O12** | `PerformanceMode.tsx`, `src/lib/performance/blocks.ts` |
| L2-T6 | **Libellés et documents** : `performance.view` = « Rôle » (中文 à relire), aide de la rangée Affichage (« Le même réglage que le menu Affichage de la setlist »), feuille « Choix du rôle » relue (le Batteur y dit déjà « Structure du chant en grand ») ; `docs/spec-coup-d-oeil.md` : la règle « le mode louange garde son bandeau 简谱 » (« Ce qui est construit », point 2 ; « Hypothèses », point 3 : « Le mode louange ne change pas, y compris son bandeau 简谱 ») est remplacée par D14 ; fiche du mode louange du guide (`fr.json` `guide…`) : une phrase sur Affichage si elle décrit les réglages | `fr.json`, `zh-CN.json`, `docs/spec-coup-d-oeil.md` |

### Comportement attendu, écran par écran

Données d'exemple (fictives) : setlist « Culte du 11 octobre », 1 为我而来 (C), 2 一生爱你 (D, gravé en E), 3 Abba Père
(A, I · C1 · R · Pm · C2 · R · P · R ×2, transition après C2 « Montée de la batterie », note sur le 2e R « Piano seul,
voix douces »).

- **Téléphone** (`v20-ml-ordre-telephone`, `-uniques-telephone`, `-uniques-p2-telephone`, `-reglages-telephone`,
  `-uniques-zh-telephone`, `-structure-zh-telephone`) :
  - Ordre joué, Abba Père page 1 : en-tête (n° 3, titre, auteur, tonalité), bandeau de 8 pastilles **sans** liste de
    notes, puis Intro, Couplet 1… avec leurs notes sur les sections, comme aujourd'hui.
  - Sections uniques, page 1 : même bandeau, numéros ① ② accrochés aux pastilles et la liste « ① → Montée de la
    batterie · ② Piano seul, voix douces » sous un filet ; puis chaque section une fois (6 cartes).
  - Sections uniques, page 2 : rappel de 24 px en haut, R et Pm cerclés (premières occurrences imprimées sur la page).
  - Chant sur scan en Sections uniques : bandeau avec détails, scan inchangé (D13).
  - Structure seule, chant sur scan : **pas de scan** ; l'en-tête du chant puis les cadres INTRO, COUPLET, REFRAIN,
    COUPLET, REFRAIN ×2 en grand, avec la note ①.
- **Tablette** (`v20-ml-uniques-tablette`, `-uniques-p2-sombre-tablette`) : pastilles de 44 px ; thème de scène : teintes
  `--sec-*-tint` sombres déjà définies, cercle `#f2f2f7`.
- **iPad paysage et ordinateur** (`v20-ml-uniques-ipad-paysage`, `-uniques-sombre-ordinateur`, `-reglages-ipad-paysage`) :
  en deux colonnes, en-tête et bandeau **en pleine largeur au-dessus des colonnes** ; rappel en pleine largeur aussi sur
  les pages suivantes. Réglages en grand : même feuille, le rôle Batteur allume Structure seule.

### Cas limites

- Un chant à une seule page : pas de rappel. Un chant dont toutes les sections sont différentes : Sections uniques =
  Ordre joué (sans les notes sur les sections, elles sont dans le bandeau).
- 升调 : la section rejouée dans une autre tonalité est réimprimée (règle de `uniqueSections`) ; sa pastille porte
  « → X ».
- Une section très longue qui ne tient pas sur une page : réduite comme aujourd'hui (jamais coupée) ; le rappel
  compte dans la hauteur.
- Fusions en structure mixte : un en-tête de fusion, le bandeau porte les passages des deux chants (même logique que
  `PartitionView`).
- Changer d'affichage pendant la lecture garde l'ancre de lecture (`readingRef`) sur le premier bloc de la page lue
  quand il existe encore ; sinon, première page du chant courant.
- Structure seule et « Suivant » : la place réservée en bas (`NEXT_PILL_RESERVE`) reste.
- Mode louange ouvert avec `?louange=1` depuis l'accueil : lit la préférence `partition-layout` comme le reste.

### Tests

Nouvelle spec **`tests/louange-sections-uniques.spec.ts`**, trois appareils **et** les deux projets grand écran
(ajoutée à `SPECS_GRAND_ECRAN` dans `playwright.config.ts` : l'en-tête au-dessus des deux colonnes est de
l'agencement) :

1. Pur : `buildPerformanceBlocks` en `unique` sur Abba Père → 6 blocs `section` (I, C1, R, Pm, C2, P) sans `note`
   ni `transition-intra` ; en `played` → 9 occurrences avec la note et la transition ; en `structure` avec un chant à
   scan → aucun bloc `jianpu-sheet`.
2. Réglages : un libellé « Rôle », pas de « Vue » ; un `radiogroup` « Affichage » à trois choix ; choisir Sections
   uniques → `localStorage["partition-layout"] === "unique"` ; quitter le mode → le menu Affichage de la setlist a
   « Sections uniques » coché sans recharger.
3. Batteur → « Structure seule » coché et `"structure"` écrit ; toucher « Ordre joué » → aucun rôle `aria-pressed`,
   et `onStage(page, '[data-section]')` contient des paroles.
4. Ordre joué : `getByRole("list", { name: "Structure" })` visible dans l'en-tête de chaque chant, 8 étapes pour Abba
   Père, aucune ligne « Piano seul, voix douces » sous le bandeau (elle est sur la section).
5. Sections uniques, page 1 : la liste des détails contient « Montée de la batterie » et « Piano seul, voix douces » ;
   `[data-section]` du chant = 6 au total sur ses pages (compter avec `onStage(page, sel)`, déplacé dans
   `tests/helpers/` au lot 1 : la copie de mesure `aria-hidden` contient aussi des `[data-section]`).
6. Sections uniques, page 2 : `[data-rappel]` visible en haut de la page, pastilles de 24 ± 1 px (mesurées par
   `offsetHeight`, ou par `boundingBox` à `fontScale = 1`, texte réinitialisé : le rappel est sous
   `transform: scale(fontScale)`, `PerformanceMode.tsx:1033`) ; les pastilles
   cerclées (`[data-cerclee]`) correspondent exactement aux sections de la page à leur première occurrence ; le 2e R et
   « R ×2 » ne sont pas cerclés ; la barre escamotée, le rappel reste visible.
7. Grand écran (deux colonnes) : la boîte du bandeau couvre au moins 90 % de la largeur de contenu et son bas est
   au-dessus du haut des deux colonnes.
8. Chant sur scan : Sections uniques → `[data-jianpu-page]` visible et bandeau `list` « Structure » avec détails ;
   Structure seule → zéro `[data-jianpu-page]`, des `[data-section]` en cadres, le titre du chant (`h2`) visible, aucun
   `list` « Structure » dans l'en-tête du chant. Comptes par `onStage(page, sel)`.
9. Plus de bandeau texte : aucun élément du composant `JianpuStructureStrip` (le fichier n'existe plus ; `tsc` le
   garantit).
10. Thème de scène : la couleur calculée du cercle d'une pastille cerclée vaut `rgb(242, 242, 247)`.
11. Pur : `signatureAffichage` (L2-T5) en `played` donne la même chaîne qu'aujourd'hui ; en `unique` et en
    `structure`, une chaîne différente ; `computePageKey` donne donc deux clés différentes pour la même page en
    `played` et en `unique`.

**Tests existants qui changent** :

| Fichier | Pourquoi | Changement |
|---|---|---|
| `tests/performance-mode.spec.ts` (vue structure du batteur, `:99-173` ; reprise des réglages `:213-289`) | le Batteur pose aussi `partition-layout` ; « Vue » devient « Rôle » | assertions de libellé ; la vue structure reste testée par le rôle et par Affichage |
| `tests/mode-louange-colonnes.spec.ts:240-262` (scan entier sur sa page) | le bandeau de la page de scan change de composant | sélecteur du bandeau ; le reste au lot 3 (K1) |
| `tests/mode-louange-colonnes.spec.ts:264` (vue structure sans interrupteur) | Structure seule peut venir d'Affichage | ajouter le cas « Affichage › Structure seule » |
| `tests/coup-d-oeil.spec.ts:156-251` (modes d'affichage, batteur → structure) | la préférence est désormais écrite aussi par le mode louange | vérifier ; ajouter « choix fait dans le mode louange → retrouvé dans la setlist » |
| `tests/look-louange.spec.ts:458-479` (pastilles 32/44 px, neuf étapes sur une rangée) | les pastilles arrivent dans le mode louange | même assertion ajoutée côté mode louange |

### Critères de fini (lot 2)

- [ ] Les trois affichages marchent dans le mode louange et partagent `partition-layout` avec la setlist (dans les deux
      sens, sans recharger).
- [ ] Bandeau sans détails en Ordre joué, avec détails en Sections uniques, en tête de chaque chant ; rappel de 24 px
      cerclé sur les pages suivantes en Sections uniques.
- [ ] Structure seule : aucun scan, la structure en grand pour un chant sur scan comme pour un chant en paroles.
- [ ] `JianpuStructureStrip` supprimé ; `docs/spec-coup-d-oeil.md` à jour.
- [ ] Suites vertes : trois appareils pour tout, cinq projets pour `louange-sections-uniques` et les specs grand écran ;
      captures regardées aux trois tailles (et cinq), Abba Père + 一生爱你, clair et thème de scène.

---

## Lot 3 — Piste A dans `JianpuSheet` et sur toutes les surfaces, PDF compris, avec K1 à K4 (`ui/apple-design`)

**But** : le scan devient une page du site (D1) : **de l'encre, pas du papier**, sans en-tête gravé, sous l'en-tête du
site, dans la colonne des paroles ; partout où il s'affiche (D2) ; avec les corrections K1 à K4 (D16). Référence de
conception : `piste-A.md` (P1 à P8) et le plan de la planche (§ 1 greffes, § 3 calcul des coordonnées), repris
ci-dessous.

Maquettes : toutes les `v20-jp-a-*` (voir `chantier-jianpu/maquettes.md`), plus `v20-ml-uniques-zh-ipad-paysage`.

### Le rendu A

- **Filtre** (P1, D9, D10) : un filtre SVG en ligne « luminance → alpha » : RVB = l'encre, A = alpha − luminance, puis
  seuil `feFuncA slope 2.33 intercept −0.28`. Encre `#1c1c1e` en clair, `#e4e4e7` en sombre (jeton `--jianpu-encre`,
  voir « Couleurs gelées ») ; le groupe filtré porte `data-jianpu-filtre`. Le papier
  blanc devient transparent ; le fond du site (blanc, halo, noir de scène) passe à travers. Ni `mix-blend-mode` (il ne
  voit rien sous un ancêtre en `transform: scale()`, et la page chant en a un), ni `dark:invert dark:hue-rotate-180`
  (supprimés, `JianpuSheet.tsx:375-379`).
- **Deux couches aux mêmes coordonnées** (P2) : chaque boîte du calque d'aujourd'hui (étiquette, cadre « 1=X »,
  « （X调） ») se dédouble : une **gomme** blanche **dans** le groupe filtré (le filtre la rend transparente : elle efface
  l'accord gravé au lieu de le couvrir) et une **écriture** au-dessus, non filtrée, en couleur d'encre. Les deux couches
  sortent de la même fonction, des mêmes `x, y, w, h`, du même `cqw` ; l'ordre de peinture actuel (rangs, `zIndex`) est
  gardé dans chaque couche. La gomme est blanche quel que soit le thème (plus de `dark:bg-black`). Attributs : les
  gommes portent `data-jianpu-gomme` (sans `data-jianpu-label`, `aria-hidden`) ; les écritures gardent
  `data-jianpu-label`, `data-jianpu-keylabel` et les mêmes `left/top` (`JianpuSheet.tsx:427-428`, `:510-511`). Ainsi
  `overlayLabels` et `troncatures` ne comptent pas chaque accord deux fois, et les oracles d'aujourd'hui (dont les ~80
  tests `PW_SLUGS=all`) restent valables sans réécriture ; `troncatures` ignore les gommes.
- **Fenêtre** (P3, D7) : la page est posée dans une fenêtre `overflow: hidden` dont le ratio est `w / (h − top)` ; la
  page **et son calque** remontent ensemble de `top` (`translate`). Aucune étiquette n'est recalculée. `top` s'arrête
  au-dessus de la ligne « 1=X 4/4 », qui reste ; le pied et son petit mouton restent (D7). Ce qui disparaît : titre, album,
  versets, « （C调） » (le `titleKey` réécrit tombe dans la partie coupée), « [共3张…] ».
- **Colonne** (P5) : le scan prend la largeur de la colonne des paroles ; la marge de 14 px rognée à la source est
  compensée (`margin-inline` négative de `14 / w`) pour que le bord de l'encre tombe sur le bord des paroles (page chant,
  vue Partitions ; pas en mode louange `fit`, où la page est centrée).
- **Messages** (P7) : les bandeaux ambre (`jouerEn`, `partiel`, sélecteur « D seul | D et F », `JianpuSheet.tsx:291-336`)
  passent en jetons du site : surface `--secondary`, texte encre, rayon 12 px ; le choix devient le segmenté du site.
  Les « accords en bleu » d'un calque partiel gardent leur bleu (cas qui n'arrive sur aucune page aujourd'hui).
- **Bascule** (P8) : entre 简谱 et paroles, fondu croisé de 150 ms ; `prefers-reduced-motion` → bascule sèche. Aucune
  animation sur le scan.

### Tranches

| Tranche | Ce qui change | Où |
|---|---|---|
| L3-T1 | **Recadrage, donnée certifiée** : un script calcule `top` par page : la **dernière rangée entièrement blanche** (pixels ≥ 245, sur le WebP) au-dessus de `min(keyLabel.y, 1re étiquette.y)` ; repli `min(keyLabel.y, 1re étiquette.y) − 0,6 × labelH` ; pages 2 et suivantes : 0. Rangement : **O9**. La planche `npm run jianpu:audit <slug>` montre la ligne de coupe et la fenêtre ; **les 190 pages (189 chants) se certifient à l'œil** par lots, suivant `scripts/jianpu/LOOP.md` (une ligne de crédits ou le haut d'un « 4/4 » tranché = page refusée, valeur corrigée à la main). Les valeurs de la planche (一生爱你 173 ou 176, 为我而来 128, 一生跟随 112) ne sont que des exemples à recontrôler. `chords.json` ne change pas (empreinte vérifiée par test) | `scripts/jianpu/` (nouveau script ; `bandes.py` pour le profil d'encre), `scripts/jianpu/audit-browser.ts`, donnée dans `public/jianpu/` |
| L3-T2 | **`JianpuSheet` en piste A** : filtre (deux `id`, clair et sombre), deux couches, fenêtre, compensation, messages P7 ; retouches (`chordEdits`) et cible du doigt (`cibleRetouche`) sur la couche écriture, aux mêmes coordonnées (Adapter, Ma version) ; **K4** : sur une page d'index > 0 **sans calque**, quand le calque serait actif (tonalité jouée ≠ gravée, ou capo), un avertissement « accords d'origine » au-dessus de cette page (nouvelle clé, par exemple `jianpu.accordsOriginePage` : « Page {{n}} : les accords imprimés sont ceux d'origine ({{key}}) et ne suivent pas la transposition ; les chiffres, eux, restent justes. », 中文 à relire). Aucun nouveau calque (D16) | `src/components/jianpu/JianpuSheet.tsx`, `src/lib/jianpu/images.ts` (lecture du recadrage), `fr.json`, `zh-CN.json` |
| L3-T3 | **Page chant** (K2, K3, D5) : l'en-tête du site **reste** au-dessus du scan (`SongView` : titre, pinyin, auteurs, ♩ `{tempo}`, pastille de tonalité, bandeau de pastilles) ; sous les pastilles, aligné à droite, le segment « **简谱 · Paroles** » (32 px, piste `--secondary`, segment actif en encre), qui lit et écrit la préférence du lot 1 ; le bouton 谱 quitte la barre d'outils (`SongDetailClient.tsx:476-489`) ; sous la feuille, la place de la barre d'onglets du téléphone (cale `78 px + --tabbar-bottom`, comme `globals.css:731-734`) pour que la fin de la feuille se lise (K2). Pas de bascule par chant ailleurs (D6) | `SongDetailClient.tsx`, `src/components/song/SongView.tsx` (point d'insertion du segment et du scan sous le bandeau) |
| L3-T4 | **Setlist, vue Partitions** : un chant sur scan a le **même en-tête qu'un chant en paroles** (n°, titre lié, auteurs, ♩, pastille, bandeau avec détails), aussi en Structure seule (K3 ; aujourd'hui petit titre à droite des pastilles, `PartitionView.tsx:512-531`) ; bandeaux « 升调 » en jetons du site ; le chant suivant commence au même bord gauche, au même écart. Adapter et Ma version : retouches sur la couche écriture | `src/app/setlists/[id]/_components/PartitionView.tsx` |
| L3-T5 | **Mode louange** (K1, K3, greffe de la piste A) : sur une page de scan (`fit`), la zone du scan **exclut la hauteur des deux barres** (haut et bas, mesurées ; elle ne change pas quand elles s'escamotent) : le scan tient entre elles (K1). En tête, l'en-tête du chant **sur une ligne** (n°, titre, ♩, pastille de tonalité) puis le `StructureStrip` du lot 2 (K3). En **paysage sur grand écran** (iPad paysage, ordinateur), le bandeau passe **en colonne dans la marge gauche** (≈ 200 px : pastilles empilées avec leur nom, ×N, « → X », notes numérotées, puis « Suivant ») et le scan prend toute la hauteur. Thème de scène : filtre sombre | `PerformanceMode.tsx` (`splitSheetPages`, rendu `page.fit` `:1069-1099`, `renderPadding` `:929-937`) |
| L3-T6 | **PDF de setlist** : le scan est coupé sous l'en-tête gravé dans `jianpuPngDataUrl` (canvas de hauteur `h − top`, `drawImage` décalé de `−top`) ; les `y` du calque PDF sont décalés de `−top` (seul endroit où un recadrage devient un décalage de coordonnées) ; l'en-tête maison (titre KaiTi, pastille) est gardé : plus de titre en double ; encre noire (impression), fond blanc gardé ; K4 dans le PDF : **O11**. Le PDF du chant seul reste sans scan (D17) | `src/lib/jianpu/images.ts:152`, `src/components/pdf/SongPDF.tsx` (`JianpuPDFPage`), `SetlistDetailClient.tsx:743-763` |
| L3-T7 | **Vérification d'ensemble** : `PW_SLUGS=all` sur `jianpu-sheet.spec.ts`, planche d'audit à l'œil en clair et en sombre sur un échantillon (dont les ~6 pages à filigrane gris, D8, et les gravures fines 有一天, 一生跟随), captures aux trois tailles et cinq projets ; mesure du défilement de la vue Partitions avec plusieurs scans sur l'iPad de Timothée (test local, voir Risques) | `tests/`, `scripts/jianpu/` |

**Découpage en sessions** (une session cloud = 4 vCPU, 1 worker : L3-T1, L3-T2 et L3-T5 sont trop gros pour une
tranche chacun) :

- **L3-T1a** : script de `top` + `cadrage.json` + planche d'audit ; **L3-T1b à L3-T1e** : certification à l'œil par
  lots d'environ 48 pages, une session chacun, liste des slugs fixée d'avance (190 pages, dont 189 premières pages
  recadrées et 为我而来 p. 2 à `top = 0`).
- **L3-T2a** : filtre + gommes/écritures sans fenêtre (tests 1-4, 6, 11) ; **L3-T2b** : fenêtre + compensation +
  lecture de `cadrage.json` (test 5 ; en `fit`, la largeur devient `min(100%, calc(100cqh * w / (h − top)))` au lieu de
  `page.h`, `JianpuSheet.tsx:357-360`) ; **L3-T2c** : messages P7 + K4 (test 9).
- **L3-T5a** : K1 + en-tête d'une ligne ; **L3-T5b** : colonne paysage.
- **Suites de tests** : `npm test -- --project=<appareil> --shard=i/4`, un projet ou un quart par commande, ou suite
  complète lancée en local par Timothée ; en session cloud, les specs touchées sur les trois (ou cinq) projets. La
  suite de la branche (≈ 2 000 tests par projet × 3, plus 2 projets grand écran) dépasse plusieurs heures à 1 worker.

### Comportement attendu, écran par écran

- **Page chant, téléphone** (`v20-jp-a-chant-telephone`, `-chant-sombre-telephone`) : 一生爱你 s'ouvre sur le scan ;
  en-tête du site, pastilles I · C · R, segment « 简谱 · Paroles » ; le scan commence à « 1= E 4/4 » sans titre gravé,
  sans rectangle blanc ; la fin de la feuille passe au-dessus de la barre d'onglets en fin de défilement. En sombre :
  encre `#e4e4e7` sur noir, plus de bloc noir à bord net ; le grand mouton en filigrane du fond s'efface (seuil du
  filtre), le petit mouton du pied reste.
- **Page chant, tablette** (`v20-jp-a-chant-tablette`) : transposée en D, « 1=D » et les accords réécrits à l'encre,
  aucun pavé visible ; pastille D, « orig. E ».
- **Page chant, iPad paysage** (`v20-jp-a-chant-ipad-paysage`, dessinée en C, tonalité gravée) : deux pages de 为我而来
  l'une sous l'autre, 24 px d'écart, repère « 2 / 2 » gris. Transposée, la page 2 porterait l'avertissement K4
  au-dessus d'elle (non dessiné sur la planche ; texte en L3-T2).
- **Page chant, ordinateur** (`v20-jp-a-chant-ordinateur`) : le scan à la largeur de la fiche, sur le halo, sans
  rectangle blanc.
- **Setlist** (`v20-jp-a-setlist-telephone`, `-setlist-ipad-paysage`, `-setlist-ordinateur`) : en-têtes identiques pour
  un chant sur scan et un chant en paroles, même bord gauche ; menu Affichage avec l'interrupteur (lot 1).
- **Mode louange** (`v20-jp-a-louange-telephone`, `-louange-tablette`, `-louange-sombre-ipad-paysage`,
  `-louange-ordinateur`, `v20-ml-uniques-zh-ipad-paysage`) : téléphone : en-tête d'une ligne, pastilles, scan en `fit`
  qui commence sous les pastilles ; tablette : scan entre les barres ; iPad paysage et ordinateur : structure en colonne
  à gauche, scan sur toute la hauteur ; « 2 colonnes » sans effet sur une page de scan (inchangé).
- **Adapter** (`v20-jp-a-adapter-telephone`) : toucher un accord du scan ouvre le pavé d'accords ; la retouche s'écrit
  à l'encre, sa gomme efface le gravé.
- **Éditeur** (`v20-jp-a-editeur-telephone`) : « Jouer sur : Partition 简谱 · Paroles », 简谱 présélectionné (lot 1) ;
  le texte d'aide suit la réponse à O1.
- **PDF** (`v20-jp-a-pdf-a4`) : en-tête maison, ligne compacte des étapes, scan coupé sous l'en-tête gravé, calque
  décalé.
- **Limite** (`v20-jp-a-limite-tablette`) : 一生跟随 — trame et filigrane clair effacés, tampon gris moyen restant (D8).

### Cas limites

- **Accord au-dessus de « 1=X »** (neuf pages) : le `min` du calcul de `top` le garde dans la fenêtre.
- **Page sans `keyLabel`** ou chant sans calque : `top` vient du profil d'encre seul, certifié à l'œil ; à défaut, 0.
- **Pages paysage** (ratio 0,84 : 你们要赞美耶和华, 赞美之泉, 伯利恒的喜讯, 到各山岭去传扬) : même règle ; en mode louange
  elles restent bornées par la largeur.
- **Sélecteur « deux tonalités »** (7 chants à `opt`) : la rangée masquée l'est dans les deux couches.
- **Filigranes gris moyens et photocopies** (~6 pages) : restent gris (D8) ; vérifiés un par un à l'audit, aucun seuil
  par page.
- **Zoom A−/A+** de la page chant : le `transform: scale` du `<main>` s'applique à la fenêtre et au filtre ensemble ;
  vérifier qu'un filtre sous `scale` ne floute pas (capture à 150 %).
- **Impression du navigateur** (`print:`) : le filtre est gardé ou retiré à l'impression ? Garder l'encre noire sur
  blanc : à vérifier par une capture `emulateMedia({ media: "print" })`.
- **为我而来 page 2** : `top = 0` (pas d'en-tête gravé) ; avertissement K4 seulement si le calque serait actif.

### Risques

- **Filtre SVG sur iOS Safari** : calculé hors GPU ; une page fixe du mode louange ne pose pas de problème, le
  défilement de la vue Partitions avec plusieurs scans est à mesurer **sur l'iPad de Timothée** (les projets Playwright
  sont tous sous Chromium). Repli prévu (piste A § 6) : composer une fois page + gommes dans un `<canvas>`
  (`destination-out` pour les gommes, `source-in` pour l'encre), à refaire à chaque tonalité. On ne code le repli que
  si la mesure le demande.
- **Seuil trop fort sur les gravures fines** (有一天, 一生跟随) : vérification à l'œil sur dix pages ciblées.
- **Le calque passe sous un filtre qui n'est pas le sien** : d'où les tests au pixel ci-dessous, clair et sombre, trois
  appareils.

### Tests

Nouvelle spec **`tests/jianpu-integration.spec.ts`**, trois appareils **et** les deux projets grand écran (ajoutée à
`SPECS_GRAND_ECRAN` : page chant en deux volets, mode louange en paysage) :

1. **Papier transparent** : sur une capture de la page chant 一生爱你, un pixel d'une zone sans encre de la fenêtre a
   la couleur du même pixel d'une capture prise avec `[data-jianpu-filtre]{visibility:hidden}`, à ± 3 près (en clair,
   le halo est un dégradé : on compare au même pixel, pas à une couleur fixe ; en sombre aussi).
2. **Plus d'inversion** : `getComputedStyle(img).filter` ne contient pas `invert` ; le groupe filtré porte `url(#…)`.
3. **Gomme invisible** (transposé en D) : au coin d'une gomme, hors du texte de l'écriture, le pixel est celui du
   même point de la capture de référence `[data-jianpu-filtre]{visibility:hidden}` à ± 3 (aucun pavé), en clair et en
   sombre.
4. **Écriture à l'encre** : la couleur calculée d'une écriture vaut `rgb(28, 28, 30)` en clair, `rgb(228, 228, 231)` en
   sombre (D9, D10).
5. **Fenêtre** : `[data-jianpu-fenetre]` a un ratio `w / (h − top)` à 1 % près ; « 1=D » (`[data-jianpu-keylabel]`)
   est entièrement dans la fenêtre ; le titre gravé est hors de la fenêtre (boîte de l'image au-dessus du bord haut de
   la fenêtre de `top × échelle` à 1 px près).
6. **Calque inchangé** : pour chaque étiquette, `(gauche − gauche de l'image) / largeur de l'image` = `(x − 3) / w` à
   0,2 % près (mêmes formules qu'aujourd'hui) ; l'empreinte SHA-256 de `public/jianpu/chords.json`, écrite en
   constante dans le test, vaut `b657b56ee7ae7dcbda6d63ea254a1d0a07a53dbb79c421094b6940caf27e99ca` (identique sur
   `main` et la branche le 08/10/2026).
7. **Page chant** : `h1` du site visible au-dessus du scan ; `radiogroup` « 简谱 · Paroles » sous les pastilles ;
   aucun bouton « 简谱 » dans `barre-outils` ; téléphone : bas de la dernière page du scan ≤ haut de la barre
   d'onglets en fin de défilement (K2).
8. **Mode louange** (K1) : sur tablette, tablette paysage, ordinateur et ordinateur 1 440, la boîte du scan est sous
   le bas de la barre du haut et au-dessus du haut de la barre du bas, barres affichées **et** escamotées ; en paysage
   grand écran, la colonne de structure est à gauche du scan et contient « Suivant ».
9. **K4** : 为我而来 en D → le texte de l'avertissement est au-dessus de `[data-jianpu-page="1"]` et absent de la page
   0 ; en C (tonalité gravée) → absent.
10. **PDF** : `SetlistFullPDF({...})` avec 一生爱你 en D → l'image de la page 简谱 a la hauteur `h − top` (à l'échelle)
    et le « 1=D » du calque est décalé de `−top`.
11. **Adapter** : toucher une écriture ouvre `JianpuChordSheet` sur la bonne étiquette (même index qu'avant le lot).

**Tests existants qui changent** :

| Fichier | Pourquoi | Changement |
|---|---|---|
| `tests/helpers/jianpu.ts` (`openSheet`, `overlayLabels`, `troncatures` `:147`) | deux couches ; la fenêtre | aucune réécriture des oracles : seules les écritures portent `[data-jianpu-label]` (les gommes portent `data-jianpu-gomme`) ; `troncatures` ignore les gommes ; l'image peut dépasser la fenêtre en haut |
| `tests/jianpu-sheet.spec.ts:109` (débord), `:127` (rognure), `:134` (pas d'avertissement) | fenêtre, couches, K4 sur 为我而来 | débord mesuré dans la page entière ; nouvel oracle de chevauchement ; « pas d'avertissement » limité à la page 1 pour un chant à plusieurs pages |
| `tests/look-louange.spec.ts:313` (« chant à six commandes ») | le bouton 谱 quitte la barre | cinq commandes |
| `tests/chants-deux-volets.spec.ts:281-284` (scan dans le volet) | plus de bouton ; en-tête gardé | scan visible sans clic, toujours dans le volet |
| `tests/mode-louange-colonnes.spec.ts:240-262` (scan entier) | K1 et colonne de gauche | bornes = barres, pas la fenêtre ; colonne à gauche |
| `tests/coup-d-oeil.spec.ts:115-124` (bandeau sur un scan, vue Partitions) | en-tête complet au-dessus du scan | vérifier ; ajouter le titre du chant |
| `tests/harmonie-jianpu.spec.ts`, `tests/fusions-dp.spec.ts` (retouches sur le scan) | cible sur la couche écriture | sélecteurs à revoir, mêmes assertions |
| `scripts/jianpu/audit-browser.ts`, `scripts/jianpu/sweep-browser.ts` | fenêtre et couches | la planche montre la page entière, la ligne de coupe `top`, et les écritures encadrées |

### Critères de fini (lot 3)

- [ ] Plus aucun rectangle blanc ni bloc noir : le scan est de l'encre sur le fond du site, en clair et en sombre, sur
      page chant, vue Partitions, mode louange ; encre noire au PDF.
- [ ] En-tête gravé coupé au-dessus de « 1=X 4/4 » sur les 190 pages (dont 189 premières pages recadrées et 为我而来
      p. 2 à `top = 0`), **certifié à l'œil** à la planche d'audit ; pied
      gardé ; `chords.json` intact ; `PW_SLUGS=all` vert.
- [ ] K1 (barres), K2 (barre d'onglets), K3 (en-tête du site au-dessus de tout scan), K4 (avertissement page 2) vérifiés
      par test aux trois appareils (et cinq projets pour K1).
- [ ] Segment « 简谱 · Paroles » sous les pastilles de la page chant, même préférence que l'interrupteur ; bouton 谱
      retiré.
- [ ] Mesure iOS faite par Timothée (défilement de la vue Partitions) ; repli canvas seulement si elle le demande.
- [ ] Captures regardées aux trois tailles et cinq projets, Abba Père + 一生爱你 + 为我而来 + 一生跟随.

---

## Hors périmètre

- **Piste C « Système par système »** (le scan découpé en tranches par section) : non retenue ; **suite possible**
  au-dessus de A (le filtre, les gommes séparées et la fenêtre de ce chantier en sont le socle). Elle demanderait une
  donnée nouvelle (coupes et sections de 190 pages, ≈ 4,5 jours de certification) avant 2 à 3 semaines de code.
- **Piste B** et la **variante « rail vertical »** du mode louange (D11).
- **PDF du chant seul** : pas de scan (D17).
- **Calque de la page 2 de 为我而来** : pas de nouveau calque, un avertissement seulement (D16).
- **Retouches `jianpuChords` absentes du mode louange et du PDF** (`blocks.ts` ne les transmet pas, le PDF ne les
  dessine pas) : lot à part.
- **Seuil de filtre réglé par page** (D8 : on accepte la limite).
- Capo sur le scan de la page chant (non transmis aujourd'hui) : écart connu, non demandé.

## Suites

- Lot « retouches 简谱 partout » : `item.jianpuChords` dans le mode louange et dans le PDF de setlist.
- Piste C, si « remonter dans la feuille » gêne encore après quelques dimanches avec A.
- Selon O10 : la pastille « Fin de la setlist » sous le dernier chant du mode louange.
- Feuille de route (`docs/feuille-de-route.md`) : inscrire le chantier et ses trois lots quand Timothée donne le go.

## Questions tranchées le 08/10/2026

Timothée a accepté toutes les recommandations (« Je suis d'accord ») : chaque *Recommandation* ci-dessous est la
décision. Pour O1, c'est la lecture retenue, et non la lecture littérale.

- **O1 — D4 confirmé.** Lecture retenue : le « Paroles » du responsable ne vaut que pour une personne qui n'a
  **jamais** touché l'interrupteur ; dès qu'elle l'a réglé, son réglage gagne. Conséquences, acceptées :
  (a) toucher le bouton 谱 (lot 1) ou le segment « 简谱 · Paroles » (lot 3) de la **page chant** règle aussi la
  préférence, donc fait gagner son choix sur les « Paroles » du responsable dans toutes les setlists ;
  (b) il n'y a pas de retour à « suivre le responsable » depuis l'interface ;
  (c) les textes d'aide dessinés sur la planche disent l'inverse et sont à réécrire — menu Affichage : « Allumé par
  défaut, retenu sur cet appareil. Un chant marqué « Paroles » par le responsable reste en paroles **tant que tu n'as
  pas choisi toi-même entre 简谱 et Paroles (ici ou sur la page d'un chant)**. » ; éditeur « Jouer sur » : « Chaque
  musicien voit la partition 简谱. « Paroles » vaut pour ceux qui n'ont pas choisi eux-mêmes. »
  **Lecture littérale possible** (option (b) de Q4, « c'est l'appareil qui décide », et Q18 (b), « défaut « Toujours »
  quand rien n'est stocké ») : le « Paroles » du responsable n'a plus d'effet sur l'affichage. Préférence absente =
  `always`, `sheetEnabled(pref) = pref !== "never"`. Le radiogroupe « Jouer sur » de l'éditeur est retiré (ou devient
  purement indicatif), et L1-T4, l'entrée d'historique, O6 et la ligne grise de `v20-jp-a-setlist-ordinateur`
  disparaissent. (Dans le plan de la planche, § 7, le « Non » de Q4 correspond à cette option (b) ; l'option (a),
  « l'item de setlist passe à trois états », est celle que la lecture retenue réintroduit.)
  *Recommandation, acceptée* : la lecture retenue, qui garde un usage au « Jouer sur » existant, avec (a) et (b) tels quels (une
  seule préférence, pas de quatrième état). **Tranché : la lecture retenue.**
- **O2 — Reprise de « Choix du responsable » déjà stocké** (`auto`). D3 dit « → allumé ». Le lire comme « allumé non
  réglé » (affiché allumé, suit encore le « Paroles » du responsable) ou comme « allumé réglé » (`always`) ?
  *Recommandation, acceptée* : non réglé — la personne avait choisi de suivre le responsable, et aucune écriture n'est nécessaire.
- **O3 — Page chant ouverte depuis une setlist** (`?setlist=…&item=…`, version de la setlist) : suit-elle le
  « Paroles » de l'item ? *Recommandation, acceptée* : non, la page chant ne suit que la préférence ; le choix du responsable vaut
  dans la setlist.
- **O4 — Chant adapté ou en Ma version, qui a un scan** : par défaut, le scan masque l'adaptation (badge existant).
  *Recommandation, acceptée* : rien de plus ; le responsable choisit « Paroles » s'il veut que son adaptation se voie.
- **O5 — Rôles autres que Batteur et l'affichage** : quand l'affichage est Structure seule (posé par le Batteur),
  choisir Pianiste, Guitariste, Présidence ou Choriste ramène-t-il « Ordre joué » ? *Recommandation, acceptée* : oui, et
  seulement depuis Structure seule (Sections uniques reste).
- **O6 — Marques dans la Liste, le Sommaire, l'Aperçu et la liste courte de l'éditeur.** Avec le scan par défaut, la
  pastille « 谱 简谱 » / « Partition 简谱 » serait sur presque tous les chants chinois. Garder, ou ne marquer que
  l'exception « Paroles » (`jianpuSheet: false`), comme la maquette `v20-jp-a-setlist-ordinateur` ? *Recommandation, acceptée* :
  ne marquer que l'exception « Paroles » choisie par le responsable (même marque pour tous), à faire au lot 3 ; le
  lot 1 garde la marque d'aujourd'hui. La ligne grise « Le responsable a choisi les paroles pour ce chant. » sous les
  pastilles de la fiche (même maquette) suit la même réponse : codée au lot 3 avec la marque d'exception si O6 est
  acceptée, sinon non. Elle n'apparaît que pour un appareil à préférence non réglée (O1).
- **O7 — Vue structure implicite** (« Masquer les paroles » allumé + « Accords » coupés, sans rôle) : aujourd'hui c'est
  la vue structure. *Recommandation, acceptée* : la garder comme un chemin vers Structure seule (le segment Affichage montre alors
  « Structure seule »), pour ne rien retirer aux batteurs sans rôle.
- **O8 — Bandeau d'une page de scan.** Le scan ne peut pas porter les notes. Appliquer D12 tel quel (Ordre joué = sans
  détails) les ferait disparaître, alors que `JianpuStructureStrip` les montre aujourd'hui. La maquette
  `v20-jp-a-louange-telephone` accroche ① à R×2 sans écrire la note. Proposition, **en exception à D12 et à D11** : sur
  une page de scan, détails toujours (comme la vue Partitions, `PartitionView.tsx:513`), et bandeau complet sur chaque
  page de scan, à la place du rappel de 24 px. *Recommandation, acceptée* : accepter l'exception ; sinon, D12 et D11 s'appliquent
  aux scans comme aux paroles.
- **O9 — Où ranger `top`.** `index.json` est régénéré par `scripts/jianpu/build-images.py`. *Recommandation, acceptée* : un
  fichier à part, `public/jianpu/cadrage.json` (`{ slug: [top page 1, top page 2…] }`), écrit par le script de L3-T1 et
  certifié ; absent → 0 (pas de recadrage) ; `index.json` et `chords.json` inchangés.
- **O10 — « Fin de la setlist ».** Les maquettes `v20-ml-uniques-ipad-paysage`, `-uniques-sombre-ordinateur` et
  `-variante-rail-ordinateur` dessinent une pastille « Fin de la setlist » sous le dernier chant (aujourd'hui rien ne
  s'affiche). Aucune décision ne la couvre. *Recommandation, acceptée* : hors de ce chantier (suites), sauf si Timothée la veut
  au lot 2.
- **O11 — K4 dans le PDF de setlist.** *Recommandation, acceptée* : oui, une ligne sous l'en-tête maison de la page 2 de 为我而来
  quand le calque serait actif, avec le même texte.
- **O12 — Annotations en Sections uniques.** Une page en Sections uniques a sa propre clé : les traits posés en Ordre
  joué ne s'y voient pas (comme pour « 2 colonnes » aujourd'hui). *Recommandation, acceptée* : accepter.
- **O13 — Page chant au lot 1.** Le lot 1 (ancien look) garde le bouton 谱 dans la barre, branché sur la préférence ;
  le segment « 简谱 · Paroles » sous les pastilles (D5) arrive au lot 3 avec l'en-tête du site (K3), puisque sur `main`
  le scan remplace encore tout l'en-tête. *Recommandation, acceptée* : d'accord avec cet ordre.
- **O14 — Cale K2 dès le lot 1 sur `main` ?** Avec le scan par défaut, K1, K2 et K3 deviennent l'expérience de tout le
  monde en ligne jusqu'au lot 3 (voir « Ce qui change pour les setlists existantes »). Proposition : ajouter au lot 1 la
  seule cale K2 sur la page chant de `main` (`pb-[calc(78px+var(--tabbar-bottom))]` sous `JianpuSheet` au téléphone),
  avec le test « bas de la dernière `[data-jianpu-page]` ≤ haut de la barre d'onglets en fin de défilement », projet
  `telephone`. *Recommandation, acceptée* : oui (K1 et K3 restent au lot 3).
- **O15 — Scans hors ligne.** Le service worker ne garde pas les scans (voir Cas limites du lot 1). Soit accepter, soit
  ajouter au lot 1, dans `public/sw.js`, une règle stale-while-revalidate pour `url.pathname.startsWith('/jianpu/')` et
  pour `/_next/image` dont `url.searchParams.get('url')` commence par `/jianpu/`, et passer le cache à
  `gcc-louange-v4`. Rien ne se met en cache sur `localhost` : la vérification se fait en ligne. *Recommandation, acceptée* :
  l'ajouter au lot 1 (le scan devient le défaut, le réseau de l'église est faible).
- **O16 — `partition-layout` déjà réglé et mode louange.** Avec D15, un réglage fait dans la setlist s'applique au mode
  louange (voir « Ce qui change pour les appareils existants », lot 2). Soit l'accepter, soit ne lire la préférence
  dans le mode louange qu'une fois qu'on y a touché. *Recommandation, acceptée* : l'accepter (D15 dit « même préférence ») et le
  dire dans les notes de version.

## Avancement

Rien n'est codé. Questions O1–O16 tranchées le 08/10/2026. Prochaine étape : le go de Timothée, lot par lot.
