# Spec : suppression groupée des setlists (lot 10)

Demande de Christelle, WhatsApp de la nuit du 17 au 18/09/2026 (capture
transmise par Timothée le 18/09, la capture montre la **liste** des setlists) :

> « dans les setlist privés possibilité d'ajouter une fonctionnalité de
> supprimer sans forcément aller dans la setlist ? genre d'ici j'ai un bouton de
> suppression groupée »

Statut : **décisions de Timothée du 18/09/2026 prises ; spec écrite le
18/09/2026 ; rien n'est codé, la spec attend le go.**

## Ce que le code montre (18/09/2026)

Ce qui existe déjà :

- **La suppression n'existe que sur la fiche.** `SetlistDetailClient.tsx`
  l. 1162-1171 : l'entrée « Supprimer » du menu ⋯, affichée si `canEdit` ;
  l. 1375-1389 : la confirmation (`AlertDialog`), dont le texte est
  `setlists.detail.deleteConfirm` = « Confirmer ? » — elle **ne nomme pas** la
  setlist ; l. 384-391 : `handleDelete`, qui appelle `deleteSetlist(id)` puis
  `router.push("/setlists")`.
- **Le droit exact** est `canEditSetlist` (`src/lib/access.ts` l. 249-259) :
  propriétaire (`ownerId`), sinon — et seulement si la setlist n'est **pas**
  privée — admin ou niveau « edit » sur la catégorie (musicien, présidence).
  Il n'existe **aucune** fonction `canDeleteSetlist` : la fiche se sert de
  `canEditSetlist` (l. 899, `const canEdit = canEditSetlist(...)`).
- **La règle serveur** : `firestore.rules` l. 214-218, `allow delete` =
  propriétaire, admin, ou `isEditorOf(resource.data.category)`.
- **L'onglet « Mes setlists »** est exactement ce que Christelle montre :
  `getMySetlists` (`src/lib/firebase/setlists.ts` l. 199-230) interroge
  `ownerId == uid` puis garde `isPrivate === true && !isDraft`. **Dans cet
  onglet, tout appartient à la personne connectée** — donc tout y est
  supprimable.
- **La liste** : `src/app/setlists/page.tsx` l. 97-116 (`displayed`, un `useMemo`
  recalculé depuis l'onglet, la recherche, la catégorie et « Mes services »),
  l. 313-319 (le `<ul>` et la boucle sur `SetlistCard`). L'état de navigation
  vit dans `useSetlistsNavState` (`src/hooks/useSetlistsNavState.ts`) : onglet,
  recherche et catégorie dans l'URL (l. 55-67), « Mes services » dans
  `localStorage` (l. 46-52).
- **La ligne** : `SetlistCard.tsx` l. 22-47 — la ligne entière est un `<Link>`
  vers `/setlists/{id}`, hauteur minimale 64 px, vignette `Tile` à gauche.
- Une case à cocher maison existe déjà : `src/components/ui/checkbox.tsx`
  (utilisée par `TacheLigne.tsx`).

Ce qui manque, et deux pièges trouvés dans le code :

- **Rien dans la liste** : pas de sélection, pas de case, pas de suppression.
  Pour effacer cinq brouillons privés il faut ouvrir cinq fiches, cinq menus ⋯,
  cinq confirmations.
- **`deleteSetlist` avale les échecs.** `src/lib/firebase/setlists.ts`
  l. 294-297 : `await fetch(..., { method: "DELETE", headers })` et rien
  d'autre. Pas de `checkRest`, contrairement à `createSetlist` (l. 263) et
  `updateSetlist` (l. 291). Un refus des règles (403) **résout la promesse
  comme une réussite** : le `catch` de `handleDelete` (l. 388-390) n'est
  jamais atteint, la fiche redirige vers `/setlists` et la setlist est
  toujours là. C'est déjà faux aujourd'hui pour une suppression ; ce serait
  intenable pour un lot de trois.
- **Les sous-collections survivent.** Firestore ne supprime pas en cascade :
  effacer `setlists/{id}` laisse `setlists/{id}/history/*` (historique) et
  `setlists/{id}/versions/*` (versions perso) intacts. Et les règles
  **interdisent** de les nettoyer depuis le navigateur : `history/{entryId}`
  (`firestore.rules` l. 223-232) déclare `read`, `create`, `update` et **aucun
  `allow delete`** ; `versions/{uid}` (l. 238-243) n'autorise la suppression
  que par son propriétaire (`request.auth.uid == uid`), jamais celle des
  autres. C'est vrai **depuis la fiche aussi, aujourd'hui** : le lot 10 ne crée
  pas le problème, il le multiplie.

## Décisions (Timothée, 18/09/2026)

| # | Décision |
| --- | --- |
| D1 | Un bouton **« Sélectionner »** en tête de la liste des setlists fait apparaître les cases à cocher. |
| D2 | Les cases n'apparaissent que sur les setlists qu'on a le **droit** de supprimer (les siennes ; tout pour un admin). Les autres lignes **n'ont pas de case du tout** — jamais de case grisée, jamais de refus après coup. |
| D3 | Bouton **« Supprimer (3) »** avec une confirmation qui **nomme** les setlists concernées. |
| D4 | Un commit pour le lot ; tests Playwright sur les **trois appareils**. |

## Décisions prises dans cette spec (recommandations à valider)

| # | Question | Recommandation |
| --- | --- | --- |
| R1 | La sélection survit-elle à un changement d'onglet ou de filtre ? | **Non : la sélection est l'intersection de ce qui est coché et de ce qui est affiché.** Une règle unique, pas deux. |
| R2 | Une suppression refusée au milieu du lot ? | **Réparer `deleteSetlist` (`checkRest`), supprimer une par une, continuer après un échec**, nommer les ratées et les **laisser cochées**. |
| R3 | Même forme sur téléphone ? | **Oui, un seul code pour les trois appareils.** Ni appui long ni balayage. |
| R4 | Sous-collections (`versions`, `history`) ? | **Hors périmètre du lot 10** : impossible depuis le navigateur sous les règles actuelles, et invisible. Dette notée, correctif nommé. |

### R1 — La sélection ne contient que ce qui est à l'écran

`displayed` (`page.tsx` l. 97-116) est recalculé à chaque changement d'onglet,
de recherche, de catégorie ou de « Mes services ». Si la sélection était un
simple `Set` d'identifiants gardé à côté, on pourrait cocher trois setlists
dans « À venir », basculer sur « Archives », taper une recherche, et
supprimer trois setlists **qu'on ne voit plus**. Le garde-fou de D3 (la
confirmation nomme les setlists) rattraperait le coup, mais mal : on lirait
des titres sans rapport avec l'écran.

Règle retenue, une seule ligne : **la sélection effective est
`displayed.filter(s => coché.has(s.id))`**. Elle est dérivée, comme
`displayed` ; elle ne peut pas dériver. Conséquences, toutes voulues :

- changer d'onglet **vide** la sélection (aucun identifiant commun entre
  « À venir » et « Mes setlists ») ;
- filtrer ou chercher **retire** de la sélection ce qui disparaît, et le
  compteur « Supprimer (n) » baisse sous les yeux — il dit toujours la vérité ;
- « Supprimer (0) » est **désactivé**, jamais caché (la barre ne saute pas).

Le **mode** « Sélectionner », lui, **reste actif** : c'est un mode, on en sort
par « Annuler » ou par une suppression. Il n'est pas gardé dans l'URL
(`useSetlistsNavState` n'y met que ce qui doit survivre au retour navigateur) :
revenir d'une fiche ramène la liste normale.

### R2 — Un échec au milieu du lot

D'abord la réparation, une ligne, dans `deleteSetlist`
(`src/lib/firebase/setlists.ts` l. 294-297) : `await checkRest(res);`, comme
`createSetlist` et `updateSetlist`. Sans elle, un lot de trois annoncerait
« 3 setlists supprimées » alors qu'une est restée.

Ensuite le lot : **séquentiel, et on continue après un échec.** Une suppression
Firestore ne s'annule pas — un « tout ou rien » est impossible, seule la
réussite partielle est honnête. Séquentiel plutôt que `Promise.allSettled` :
l'ordre du message reste celui de la liste, et on n'envoie pas dix DELETE d'un
coup depuis un téléphone en 3G.

À l'arrivée :

- les réussies disparaissent de la liste **et** de la sélection ;
- les ratées **restent cochées**, le mode sélection reste ouvert : réessayer,
  c'est un seul appui ;
- un message nomme les ratées, pas un code d'erreur :
  « 2 setlists supprimées. « Culte du 21 septembre » n'a pas pu être supprimée. »
- la liste n'est pas rechargée depuis Firestore : les deux effets de
  chargement (`page.tsx` l. 71-78 et l. 80-84) ne dépendent que de `user`, ils
  ne se rejoueraient pas. On retire les identifiants supprimés de `setlists` et
  de `mySetlists` en état local.

**Effet de bord à tester** : réparé, `deleteSetlist` rend enfin le `catch` de
la fiche (`SetlistDetailClient.tsx` l. 388-390) atteignable. Une suppression
refusée depuis la fiche cessera de rediriger vers une liste où la setlist est
encore là. C'est une correction, pas une régression, mais elle mérite son test.

### R3 — Même forme sur les trois appareils

Oui, un seul code. Ce que le code interdit :

- **appui long** : la ligne est un `<Link>` (`SetlistCard.tsx` l. 23) ; un
  appui long y ouvre le menu contextuel du navigateur (« Copier le lien »,
  « Ouvrir dans un nouvel onglet ») — on se bat contre iOS pour un geste que
  personne ne devine ;
- **balayage** : il entre en conflit avec le geste « retour » du navigateur et
  avec `PullToRefresh` (`page.tsx` l. 188).

« Sélectionner » est visible, réversible et identique partout. Deux
conséquences de code, parce que la ligne est un lien :

- en mode sélection, `SetlistCard` rend **le même balisage dans un
  `<button type="button">`** au lieu du `<Link>` : sinon un appui navigue au
  lieu de cocher. Toute la ligne bascule la case (cible de 64 px de haut, celle
  d'aujourd'hui) ;
- les lignes **sans droit** gardent leur `<Link>` et reçoivent un **espace de
  la largeur d'une case** à gauche, pour que les vignettes `Tile` restent
  alignées.

Adaptations d'appareil, pas de forme :

- la barre « Supprimer (n) · Annuler » est **collée en bas** sur téléphone,
  **au-dessus** de `MobileTabBar` (fixée en bas, 56 px + `safe-area`,
  `MobileTabBar.tsx` l. 62-65) : `bottom-[calc(56px+env(safe-area-inset-bottom))]` ;
- sur ordinateur et tablette elle est **en tête de liste**, à côté de
  « Sélectionner » ;
- case de 24 px dans une zone d'appui de 44 px, au rythme du lot 4 (pilules
  40 px, commandes 36 px).

### R4 — Les sous-collections d'une setlist supprimée

Aujourd'hui, effacer une setlist depuis sa fiche laisse derrière elle son
historique (`setlists/{id}/history/*`) et les versions perso de chacun
(`setlists/{id}/versions/*`). Trois raisons de **ne pas** ouvrir ce chantier
dans le lot 10 :

1. **C'est impossible depuis le navigateur.** `firestore.rules` l. 223-232 ne
   déclare aucun `allow delete` sur `history` : tout DELETE est refusé.
   L. 238-243, une version perso ne s'efface que par son propriétaire — un
   admin ne peut pas nettoyer celles des autres. Le faire demanderait de
   modifier les règles **et** de lister chaque sous-collection avant chaque
   suppression (deux requêtes de plus par setlist, dans une boucle).
2. **C'est invisible.** `getSetlistHistory` (`setlistHistory.ts` l. 28-29) et
   `getSetlistVersions` (`setlistVersions.ts` l. 39-40) interrogent
   `setlists/{id}:runQuery`, sous le parent. Aucune requête `collectionGroup`
   dans le code : sans document parent, ces documents ne sont jamais lus par
   personne.
3. **Ce n'est pas nouveau.** Le lot 10 supprime exactement ce que la fiche
   supprime déjà, ni plus ni moins.

**Dette notée, correctif nommé** : une route `DELETE /api/setlist/[id]` en
Firebase Admin (`recursiveDelete`), sur le modèle de
`/api/setlist/presentation` qui écrit déjà en Admin. À demander avant de le
faire : c'est un lot en soi, et il touche la fiche autant que la liste.

## Objectif

1. Depuis la **liste** des setlists, en effacer plusieurs d'un coup, sans
   ouvrir une seule fiche.
2. Ne proposer la case **que** là où le droit existe : on ne coche jamais
   quelque chose pour se voir refuser après.
3. La confirmation **nomme** ce qui va disparaître.
4. Une suppression qui échoue **le dit**, et ne se fait pas passer pour une
   réussite.

Réussite (vérifiable) : dans « Mes setlists », avec cinq setlists privées,
« Sélectionner » puis trois cases puis « Supprimer (3) » affiche une
confirmation **portant les trois titres** ; après « Oui, supprimer », la liste
en montre deux, la base a reçu **trois** DELETE et rien d'autre. Dans « À
venir », une setlist d'un autre membre qu'on ne peut pas supprimer **n'a pas de
case** ; le compteur ne peut donc jamais l'englober. Si la deuxième des trois
est refusée (403), la liste en montre **trois** (les deux supprimées en moins,
la refusée restée), le message nomme la refusée, et sa case est **encore
cochée**.

## Modèle

Aucun champ Firestore, aucune collection, **aucune règle à publier** :
`firestore.rules` l. 214-218 autorise déjà la suppression demandée, une
setlist à la fois. Tout est de l'état d'écran.

Dans `page.tsx` :

| État | Rôle |
| --- | --- |
| `selectionMode: boolean` | « Sélectionner » est actif. Hors URL, hors `localStorage`. |
| `coches: Set<string>` | Les identifiants cochés, tels quels. |
| `enCours: boolean` | Une suppression tourne (boutons désactivés). |
| `echecs: string[]` | Titres des setlists refusées, pour le message. |

Deux valeurs dérivées, jamais stockées :

- `selection = displayed.filter((s) => coches.has(s.id) && peutSupprimer(s))` —
  R1 et D2 dans la même ligne ;
- `supprimables = displayed.filter(peutSupprimer)` (pour « Tout sélectionner »,
  s'il est retenu — voir « Hors périmètre »).

Le droit, `peutSupprimer(s) = canDeleteSetlist(user, profile, s)` :

- **nouvel alias** dans `src/lib/access.ts`, `export const canDeleteSetlist =
  canEditSetlist;`, sur le modèle exact de `canHaveSetlistVersion =
  canSeeSetlist` (l. 247) ;
- il ne crée **aucun droit nouveau** : c'est le droit de la fiche
  (`SetlistDetailClient.tsx` l. 899), mis sous son vrai nom pour que la liste
  et la fiche ne puissent pas diverger ;
- dans « Mes setlists », il est vrai partout (`ownerId === uid` par
  construction, `getMySetlists` l. 209-214) : toutes les lignes portent une
  case, ce que demandait Christelle.

**Écart client / serveur à signaler, pas à corriger ici** : la règle
`allow delete` (l. 214-218) n'a **pas** le garde-fou `isPrivate` que porte
`canEditSetlist` (l. 255) et que porte `canEditSetlistDoc` (l. 249-253). Un
musicien du même service peut donc, en REST, supprimer une setlist privée qu'il
ne voit pas dans l'app. Le client est **plus strict** que le serveur : le lot 10
ne change rien à cet écart, et il relève de la confidentialité assumée du
`CLAUDE.md` (« ne pas re-signaler comme faille sans nouvelle demande »). Noté
ici pour mémoire.

## Écrans

### Liste, mode normal (`page.tsx`, autour de la l. 257-289)

Un bouton **« Sélectionner »** rejoint la ligne de la catégorie et de
« Nouvelle », à gauche du sélecteur. Il n'apparaît que si **au moins une** ligne
affichée est supprimable — sinon il ne servirait à rien (une régie pure, par
exemple, qui ne crée ni ne supprime : `canCreate` est déjà caché pour elle,
l. 279).

### Liste, mode sélection

- « Sélectionner » devient **« Annuler »**.
- Chaque ligne supprimable porte une case à gauche de la vignette
  (`components/ui/checkbox.tsx`), étiquetée du titre de la setlist
  (`aria-label`) ; toute la ligne bascule la case.
- Les lignes non supprimables restent des liens, sans case, décalées d'un
  espace de la largeur d'une case.
- La barre d'action affiche **« Supprimer (n) »** en rouge (`destructive`,
  comme le menu ⋯, l. 1165) et **« Annuler »**. À `n = 0` : désactivée, pas
  cachée.
- Les onglets, la recherche, la catégorie et « Mes services » **restent
  utilisables** — R1 s'en charge.

### Confirmation (D3)

Le même `AlertDialog` que la fiche, avec un texte qui **nomme** :

- titre : « Supprimer 3 setlists ? » (une seule : « Supprimer cette
  setlist ? ») ;
- corps : la **liste à puces des titres**, chacun avec sa date, comme la ligne
  les affiche ;
- au-delà de **8** titres : les 8 premiers puis « … et 4 autres » (une
  confirmation ne doit pas défiler sur un téléphone) ;
- une phrase : « Cette action est définitive. » ;
- boutons : « Annuler » et « Oui, supprimer » (clés existantes
  `setlists.detail.deleteCancel` / `deleteYes`), « … » pendant `enCours`.

### Après coup

- Tout réussi : le mode sélection se referme ; message « 3 setlists
  supprimées. »
- Échec partiel : le mode reste ouvert, les ratées restent cochées, message
  « 2 setlists supprimées. « Titre » n'a pas pu être supprimée. »
- Message en pastille flottante, comme `shareFeedback`
  (`SetlistDetailClient.tsx` l. 1392-1396).

### Langues

Nouvelles clés dans `src/locales/fr.json` **et** `src/locales/zh-CN.json`, sous
`setlists.list` : `select`, `selectCancel`, `deleteSelected` (avec `{{count}}`),
`deleteSelectedTitle_one` / `_other`, `deleteSelectedBody`, `deleteMore`
(« … et {{count}} autres »), `deleteDone`, `deleteFailed`.

## Ce qui sera construit — trois tranches

### S1 — Le droit et la suppression fiable
- `src/lib/access.ts` : `canDeleteSetlist` (alias de `canEditSetlist`).
- `src/lib/firebase/setlists.ts` : `checkRest` dans `deleteSetlist`
  (l. 294-297).
- `deleteSetlists(ids)` : séquentiel, continue après un échec, rend
  `{ ok: string[]; ko: string[] }`.
- `SetlistDetailClient.tsx` : la fiche passe à `canDeleteSetlist` pour l'entrée
  « Supprimer » (l. 1162-1171) — même droit, nom juste.

### S2 — La sélection dans la liste
- `page.tsx` : « Sélectionner », les quatre états, `selection` dérivée de
  `displayed`, la barre d'action.
- `SetlistCard.tsx` : trois propriétés facultatives (`selectable`, `selected`,
  `onToggle`) ; sans elles, la ligne est le `<Link>` d'aujourd'hui, au pixel
  près.

### S3 — Confirmation, résultat, langues
- La confirmation qui nomme (troncature à 8), le message de résultat, les
  ratées qui restent cochées, les clés FR et 中文.

## Tests (Playwright, `tests/setlist-suppression-groupee.spec.ts`, trois appareils, écrits avant le code)

Base simulée par `tests/helpers/fakeSession.ts` — `FakeDb.writes` enregistre
déjà les `DELETE` (« Écritures reçues, dans l'ordre (PATCH, POST, DELETE) »),
ce qui permet de compter exactement ce qui part.

Droits (D2) :
1. « Mes setlists », 5 setlists privées à soi : 5 cases.
2. « À venir », une setlist d'un autre membre dans une catégorie où l'on est
   simple choriste : la ligne **n'a pas de case** et reste un lien vers la
   fiche.
3. Même liste en admin : toutes les lignes ont une case.
4. Musicien du service : case sur les setlists publiques de sa catégorie,
   aucune sur les privées des autres (`canEditSetlist` l. 255).

Sélection (R1) :
5. Cocher 3, changer d'onglet : « Supprimer (0) », désactivé ; revenir : rien
   n'est coché.
6. Cocher 3, taper une recherche qui en cache 2 : « Supprimer (1) ».
7. « Annuler » : les cases disparaissent, la ligne redevient un lien.
8. En mode sélection, appuyer sur une ligne **coche** au lieu de naviguer
   (l'URL ne bouge pas).

Confirmation (D3) :
9. « Supprimer (3) » : la confirmation porte **les trois titres** et leurs
   dates.
10. Une seule : « Supprimer cette setlist ? », le titre dans le corps.
11. Douze cochées : 8 titres puis « … et 4 autres ».
12. « Annuler » dans la confirmation : **aucun** DELETE dans `db.writes`.

Suppression (R2) :
13. Trois cochées confirmées : exactement 3 DELETE, sur les 3 bons chemins, et
    rien d'autre ; la liste passe de 5 lignes à 2 ; le mode se referme.
14. La 2ᵉ renvoie 403 : 3 DELETE partis, la liste montre 3 lignes, le message
    nomme la refusée, sa case est encore cochée, les deux autres non.
15. La 1ʳᵉ renvoie 403 : les deux suivantes partent quand même (on ne
    s'arrête pas au premier échec).
16. Fiche : `deleteSetlist` refusée → on **reste** sur la fiche (le `catch`
    l. 388-390 devenu atteignable), pas de redirection vers `/setlists`.

Apparence (R3, les trois appareils) :
17. Téléphone : la barre « Supprimer (n) » est visible et ne recouvre pas
    `MobileTabBar`.
18. Ordinateur et tablette : la barre est en tête de liste.
19. Une ligne sans case garde sa vignette alignée sur celle d'une ligne avec
    case.

中文 : 20. la confirmation et le message de résultat en `zh-CN`.

## Hors périmètre

- **Les sous-collections** `setlists/{id}/versions/*` et
  `setlists/{id}/history/*` : voir R4. Route Admin `recursiveDelete` à
  demander.
- **« Tout sélectionner »** : pas demandé. `supprimables` est prévu dans le
  modèle pour que ce soit une case en plus, pas une refonte, le jour où
  Christelle le demandera.
- **Annuler une suppression** (corbeille, 30 jours) : un modèle de données en
  plus (`deletedAt`, filtrage de toutes les lectures) pour une demande qui
  parle de brouillons privés. À demander avant.
- **La même sélection groupée ailleurs** (chants, évènements, tâches) : chaque
  page a ses droits ; on n'abstrait pas sur un seul cas d'usage.
- **Toucher l'écart client / serveur** de la règle `allow delete` (voir
  « Modèle ») : confidentialité assumée, `CLAUDE.md`.
- **Modifier le droit de suppression** : le lot réutilise celui de la fiche,
  tel quel.

## Commandes

```bash
npm test -- tests/setlist-suppression-groupee.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

Rien n'est codé : la spec attend le go de Timothée.
