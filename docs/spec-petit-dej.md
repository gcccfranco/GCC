# Spec : inscription au petit déj dans l'app (lot 15)

Christelle et Timothée, WhatsApp du 18/09/2026 :

> « du coup tout le monde doit se créer un compte alors ? ou est-ce que tu
> laisses petit dej visible et inscription sans connexion » — « faut les forcer
> un peu à s'inscrire » — « ouais » ; « si c'est pas google sheets* » — « Le
> faire sur le site » ; « Soit onglet petit dej et les gens choisissent la date
> pour s'inscrire » ; « et tant qu'il reste des places toutes les semaines ça
> envoie une notif aux gens pour s'inscrire au petit dej » ; « Après le truc
> c'est que le petit déj pas tout le monde est chaud pour faire ».

Statut : **spec écrite le 18/09/2026, rien n'est codé ; attend le go de Timothée.**

## Ce que le code montre (18/09/2026)

- Le petit déj est **lu, jamais écrit** : `parsePetitDej`
  (`src/lib/planning/sheets.ts` l. 117-133) prend les paires DATE / NOM de
  l'onglet `Franco_Table_PtD` (colonnes 17-18 pour janvier → juin, 19-20 pour
  juillet → décembre), coupe les cases sur « & » et rend des lignes
  `[date ISO, noms]`. `fetchPetitDej` (l. 135-138) réutilise l'onglet de la
  Prépa. Table, donc le cache mémoire évite un second appel.
- `PlanningData.petitDej` (`src/lib/planning/names.ts` l. 17-18) n'a **aucune
  donnée de secours** (l. 40-41) : il n'apparaît que s'il est lu.
- Le petit déj est **déjà un service à part entière** :
  `scan(data.petitDej, "Petit déj", [[1, "Équipe"]])` (`names.ts` l. 261) le met
  dans « Ce dimanche », « Mes services » et les rappels ; « Équipe » est un rôle
  muet (`SILENT_ROLES`, `src/lib/push/reminderMessage.ts` l. 26) et « Petit
  déj » se traduit déjà 早餐 (l. 50). `servantsForDate` (`names.ts` l. 411-412)
  le compte comme une présence simple, sans catégorie ni rôle.
- Écrans : « Ce dimanche » n'affiche la ligne que si la case est remplie
  (`src/app/planning/page.tsx` l. 59, 76, 107, 200-205). L'onglet **Table**
  (`src/app/planning/table/page.tsx`) ne lit que `fetchDejeuner` : il ignore le
  petit déj, alors que c'est **le même onglet du Sheet**. Il filtre par
  trimestre (`filterByTri`, `getCurrentTri`, `src/lib/planning/utils.ts`
  l. 22-29) et marque le dimanche en cours (`currentSundayStr`, l. 62-68).
- **Aucune couleur à ajouter** : `serviceColor` (`src/lib/serviceColors.ts`
  l. 54-56) donne déjà au « Petit déj » l'orange de la Prépa. Table (`#c87941`)
  « aucune couleur nouvelle n'est introduite (palette gelée) ». Le fichier gelé
  n'est pas touché.
- Préférences de notification : `NOTIF_TYPES` (`src/types/user.ts` l. 73) pilote
  tout — la lecture (`src/lib/firebase/notifPrefs.ts` l. 16), les valeurs par
  défaut (l. 77-83), les libellés (l. 89-95) et la liste de bascules
  (`src/components/push/PushToggle.tsx` l. 133-141, construite par `.map`). Côté
  serveur, `filterUidsByNotifPref` (`src/lib/push/recipients.ts` l. 87-93)
  **garde tout uid qui n'a pas explicitement mis le type à `false`** : un type
  nouveau est donc actif par défaut, sans migration.
- Le cron est **unique et quotidien** (`vercel.json` : `0 8 * * *`, Hobby = 2
  crons au plus). `src/app/api/cron/reminders/route.ts` sait déjà fondre une
  ligne dans le message du matin : les tâches (l. 160-166, 219) et les
  ouvertures d'inscriptions (l. 167-175, 219) sont des `Map<uid, …>` ajoutées au
  rappel de service, et envoyées seules seulement si la personne n'a rien
  d'autre ce jour-là (l. 236-272). L'anti-doublon est un document `notifLog`
  par clé et par uid (l. 48-75). `db.collectionGroup("taches").get()` sans
  filtre (l. 96) montre qu'une lecture de groupe de collections passe telle
  quelle.
- `firestore.rules` : `evenements/{id}/inscriptions` existe déjà (l. 158-164) —
  une sous-collection nommée `inscriptions` ailleurs se mélangerait dans une
  requête de groupe. `setlists/{id}/versions/{uid}` (l. 238-244) est le patron
  exact d'un document par personne écrit par son propriétaire.
- Écriture client : tout passe par REST (`FS_BASE`,
  `src/lib/firebase/setlists.ts` l. 48) ; `src/lib/firebase/harmonie.ts`
  l. 46-63 montre le `runQuery` et le `DELETE` d'une sous-collection.

## Décisions de Timothée (18/09/2026) — à ne pas rouvrir

| # | Décision |
| --- | --- |
| T1 | **Compte obligatoire** pour s'inscrire (« faut les forcer un peu à s'inscrire »). Sans compte, on lit, on ne s'inscrit pas. |
| T2 | **Pas de compteur de places** (« ça peut être une personne ou 4 c'est variable ») : un dimanche est **« Libre »** ou porte une **équipe**. |
| T3 | S'inscrire ajoute une **ligne pré-remplie à son nom**, **réécrivable librement** (« Famille Chung », « Les jeunes du Campus »). |
| T4 | Chacun retire **sa** ligne tant que le dimanche n'est pas passé ; un admin retire n'importe laquelle. **Seul endroit du site où l'on se retire soi-même** — pour le planning, qui n'est pas dispo envoie un message. |
| T5 | Notification **le mercredi**, **fondue dans le rappel groupé du matin** (jamais une notification de plus, règle du lot 1c), seulement si le dimanche qui vient est **libre**, préférence « Petit déj » **activée par défaut**, « Ne plus recevoir » dans le corps. |
| T6 | **Pas de 9e onglet** : le petit déj vit dans l'onglet **Table** du planning — c'est déjà le même onglet du Sheet (`Franco_Table_PtD`). |
| T7 | **L'app fait foi** pour les dimanches à venir ; le Sheet reste lu **en repli** pour les dates que personne n'a prises dans l'app. |

## Décisions prises ici, avec la raison lue dans le code

| # | Décision |
| --- | --- |
| Q1 | **Une sous-collection, un document par personne** : `petitDej/{AAAA-MM-JJ}/equipe/{uid}`, et non un document par dimanche avec un tableau. Un tableau se réécrit en entier (`PATCH` REST, aucune transaction dans ce projet) : deux personnes qui se retirent en même temps s'effacent l'une l'autre. Avec l'uid pour nom de document, s'inscrire est un `PATCH` isolé, se retirer un `DELETE` d'un seul chemin, et une seconde inscription écrase la sienne au lieu de créer un doublon — le patron de `setlists/{id}/versions/{uid}` (`firestore.rules` l. 238-244). La sous-collection s'appelle **`equipe`** et non `inscriptions`, parce que `evenements/{id}/inscriptions` existe déjà (l. 158-164) et qu'une requête de groupe les mélangerait. |
| Q2 | **Aucune limite d'avance au-delà de ce que l'onglet montre** : les quatre trimestres de l'année en cours (`filterByTri`, `getCurrentTri`). Une seconde borne (« huit semaines ») serait une règle invisible qui afficherait un dimanche sans laisser le prendre. La seule borne est le **passé** : un dimanche `< currentSundayStr()` ne se prend ni ne se libère (le dimanche même reste ouvert jusqu'à ce qu'il soit passé). |
| Q3 | **Repli explicite, dimanche par dimanche** : `app.length ? app : sheet`. Un dimanche est **« Libre »** seulement si **ni** l'app **ni** le Sheet ne portent de nom — la notification du mercredi ne peut donc pas contredire le tableau. Une ligne venue du Sheet s'affiche avec la mention **« au tableau »** et ne se retire pas depuis l'app. Parce que la première inscription de l'app **remplace** l'affichage du Sheet, la confirmation nomme ce qu'elle remplace : « Le tableau indique déjà : Julien. Tu prends la suite ? » — une phrase, pas un écran. |
| Q4 | **Oui, le petit déj reste un service comme les autres** (« Mes services », rappels J-7 / J-3 / J-1) : c'est déjà le cas (`names.ts` l. 261) et le supprimer serait une régression. Mais le rattachement se fait aujourd'hui sur le **texte** de la case : une ligne réécrite « Famille Chung » ne correspondrait plus à personne. La ligne de l'app garde donc le **nom de planning de son auteur** dans une **colonne cachée** (index 2), et le petit déj se scanne sur les colonnes 1 **et** 2. Les doublons éventuels se replient déjà (`groupEntries` de « Mes services », `reminderServicesFor`). `servantsForDate` continue de ne lire que la colonne 1 : elle sert au rattachement setlist / régie, où le petit déj n'entre pas. |
| Q5 | **Libellé « Petit déj »** dans les réglages (`NOTIF_TYPE_LABELS` est en français pour les cinq types existants : on ne crée pas une exception). Corps du mercredi, une ligne de plus dans le message du matin : FR « Dimanche 20 septembre : personne pour le petit déj. » / 中文 « 9月20日星期日：还没有人负责早餐。» ; puis « Ne plus recevoir : Moi › Mon profil › Notifications › Petit déj » / « 不再接收：我 › 我的资料 › 通知 › 早餐 ». Un push ne porte pas de lien cliquable dans son corps : on dit **où** couper, et la notification ouvre `/planning/table`. |
| Q6 | **Un admin n'inscrit pas quelqu'un à sa place.** Écrire sous l'uid d'un autre demanderait une route serveur (Admin SDK), comme `evenements/{id}/inscriptions` dont les règles interdisent toute écriture client (l. 163) — beaucoup de machinerie pour un besoin que le texte libre couvre déjà : l'admin pose **sa** ligne et écrit « Famille Chung ». Ce qu'il gagne, et qui suffit : **retirer** et **réécrire** n'importe quelle ligne. |

## Objectif

1. On s'inscrit au petit déj **dans l'app**, avec un compte, depuis l'onglet
   **Table** du planning, sur le dimanche de son choix.
2. Un dimanche est **« Libre »** ou porte une **équipe** ; la ligne se **réécrit**
   librement et se **retire** par celui qui l'a posée (ou un admin).
3. Le petit déj reste un **service** : « Ce dimanche », « Mes services »,
   rappels J-7 / J-3 / J-1, en français et en 中文.
4. Le **mercredi**, si le dimanche qui vient est libre, une **ligne de plus** dans
   le rappel du matin — jamais une notification de plus.

Réussite : sur un dimanche à venir sans nom, l'onglet Table affiche « Libre » ;
un membre connecté clique « Je m'inscris », la ligne apparaît à son nom, il la
réécrit « Famille Chung », elle est encore là après rechargement, il la retire
et le dimanche redevient « Libre » ; un second membre pose sa ligne sans effacer
la première ; un visiteur sans compte lit les deux lignes et ne voit aucun
bouton ; le dimanche pris disparaît de la liste des dimanches libres et le
mercredi n'en parle plus ; le mercredi d'un dimanche libre, le rappel du matin
de chaque membre porte **une ligne de plus** et **pas une notification de plus**.

## Modèle

`petitDej/{AAAA-MM-JJ}/equipe/{uid}` — le document parent n'est jamais écrit
(comme `harmonie/{slug}`).

| Champ | Type | Sens |
| --- | --- | --- |
| `uid` | `string` | auteur de la ligne, égal au nom du document |
| `nom` | `string` | texte affiché, pré-rempli au nom de la personne, réécrivable |
| `planningName` | `string` | nom de planning de l'auteur au moment de l'inscription, pour « Mes services » et les rappels ; `""` s'il n'en a pas |
| `dimanche` | `string` | `AAAA-MM-JJ`, recopié pour lire sans découper le nom du document |
| `creeLe`, `modifieLe` | `string` | ISO |

- **Lecture** : client, `runQuery` sur le groupe de collections `equipe`
  (`allDescendants: true`), filtré en mémoire — au plus 52 dimanches par an ;
  serveur (cron), `db.collectionGroup("equipe").get()`, comme les tâches
  (`route.ts` l. 96).
- **Fusion** (pure, testable), `src/lib/petitdej/fusion.ts` :
  `fusionnerPetitDej(sheet: string[][], app: LignePetitDej[]): string[][]` rend
  des lignes `[dimanche, texte affiché, noms de planning]` — les lignes de l'app
  si le dimanche en porte au moins une, sinon la ligne du Sheet (colonne 2 =
  colonne 1, un nom du Sheet **est** un nom de planning).
- **Branchement** : `loadPlanningData(petitDejApp: string[][] = [])` fusionne à
  l'assemblage ; les dix appelants qui ne passent rien gardent le comportement
  d'aujourd'hui.
- **Rattachement** : `names.ts` l. 261 devient
  `scan(data.petitDej, "Petit déj", [[1, "Équipe"], [2, "Équipe"]])`.
- **Préférence** : `"petitDej"` ajouté à `NOTIF_TYPES`, `DEFAULT_NOTIF_PREFS`
  (`true`) et `NOTIF_TYPE_LABELS` (« Petit déj ») ; la bascule apparaît seule
  dans `PushToggle` et `filterUidsByNotifPref` la respecte sans migration.

Règle proposée (`firestore.rules`) :

```
// Petit déj (lot 15, docs/spec-petit-dej.md) : un dimanche porte une ou
// plusieurs lignes, une par personne — le nom du document EST l'uid, pour
// qu'un retrait n'écrase jamais la ligne d'un autre. Sous-collection
// « equipe » et non « inscriptions » : evenements/{id}/inscriptions existe
// déjà et une requête de groupe les mélangerait. Chacun écrit et retire la
// sienne ; un admin retire ou réécrit n'importe laquelle. La borne « dimanche
// passé » reste côté client (canEditPetitDej, src/lib/access.ts), comme le
// reste du filtrage du site. Miroir : src/lib/access.ts.
match /petitDej/{dimanche} {
  allow read: if signedIn();
  allow write: if false;

  match /equipe/{uid} {
    allow read: if signedIn();
    allow create: if signedIn() && request.auth.uid == uid
      && request.resource.data.uid == uid
      && request.resource.data.dimanche == dimanche;
    allow update: if signedIn()
      && request.resource.data.dimanche == dimanche
      && (
        (request.auth.uid == uid && request.resource.data.uid == uid)
        || (isAdmin() && request.resource.data.uid == resource.data.uid)
      );
    allow delete: if signedIn() && (request.auth.uid == uid || isAdmin());
  }
}
```

Miroir client (`src/lib/access.ts`), en double comme le veut le CLAUDE.md :

```ts
/** Réécrire ou retirer une ligne de petit déj : son auteur tant que le dimanche
 *  n'est pas passé, un admin toujours. Miroir serveur :
 *  petitDej/{dimanche}/equipe/{uid} dans firestore.rules. */
export function canEditPetitDej(
  user: AuthUser | null,
  ligne: { uid: string; dimanche: string },
  dimancheEnCours: string,
): boolean
```

## Écrans

**Onglet Table** (`/planning/table`) — le tableau « Prépa. Table » ne bouge pas ;
un second tableau **« Petit déj »** s'ajoute en dessous, même forme, même
filtre T1–T4, même orange, même pastille « Cette semaine ».

| Cas | Ce qu'on voit |
| --- | --- |
| Dimanche libre, connecté | « Libre » en gris et le bouton **« Je m'inscris »** |
| Ma ligne | le texte, modifiable sur place (enregistré à la sortie du champ), et **« Retirer »** |
| La ligne d'un autre | le texte seul ; **« Retirer »** pour un admin |
| Ligne du Sheet | le texte et la mention **« au tableau »**, aucun bouton de retrait ; « Je m'inscris » demande « Le tableau indique déjà : Julien. Tu prends la suite ? » |
| Dimanche passé | lecture seule, aucun bouton |
| Sans compte | les lignes, « Libre », et **« Connecte-toi pour t'inscrire »** (lien) |

- **« Ce dimanche »** (`/planning`) : inchangé, sinon que la ligne peut venir de
  l'app. La règle d'aujourd'hui tient — pas de ligne quand personne n'est
  inscrit (on n'écrit pas « Libre » sur cette page).
- **« Mes services »** : inchangé (le petit déj y est déjà une carte).
- **Profil › Notifications** : la bascule **« Petit déj »**, active par défaut.

## Ce qui sera construit — quatre tranches

### PD1 — Modèle, droits, fusion
`src/types/petitDej.ts` ; `src/lib/firebase/petitDej.ts` (REST : lire le groupe
`equipe`, s'inscrire, renommer, retirer) ; `src/lib/petitdej/serveur.ts`
(Admin, pour le cron) ; `fusionnerPetitDej` ; `loadPlanningData` avec son
argument facultatif ; `names.ts` l. 261 sur deux colonnes ; règle Firestore et
`canEditPetitDej` en double.

### PD2 — Onglet Table
Second tableau « Petit déj » dans `src/app/planning/table/page.tsx` (lecture
fusionnée, « Libre », « Je m'inscris », champ de texte en ligne, « Retirer »,
mention « au tableau », confirmation de reprise), libellés FR et 中文
(`planning.petitDej.*` dans `src/locales/fr.json` et `zh-CN.json`).

### PD3 — Ce dimanche et Mes services
Les lignes de l'app rejoignent `petitDej` dans `src/app/planning/page.tsx` et
dans le chargement de `/mes-services` ; une ligne réécrite reste rattachée à son
auteur par la colonne cachée.

### PD4 — Le mercredi
`"petitDej"` dans `NOTIF_TYPES` / `DEFAULT_NOTIF_PREFS` / `NOTIF_TYPE_LABELS` ;
`src/lib/petitdej/rappel.ts` (pur) : `estMercredi(today)`,
`prochainDimanche(today)`, `lignePetitDej(dimanche, lang)`, `petitDejTitre(lang)`,
`ligneNePlusRecevoir(lang)` ; dans `cron/reminders`, une `Map<uid, …>` bâtie sur
le modèle des ouvertures d'inscriptions (l. 167-175), fondue par `avecLignes`
dans le message du matin (l. 219), envoyée seule à ceux qui n'ont rien d'autre
(l. 255-272), anti-doublon `petit-dej-<dimanche>`, destinataires = tous les
comptes filtrés par la préférence, `url: "/planning/table"`.

## Tests (Playwright, trois appareils, écrits avant le code)

Dans `tests/planning-petit-dej.spec.ts` — les quatre tests du lot 1b doivent
rester verts.

- **Fusion** (pur) : app seule ; Sheet seul ; les deux sur le même dimanche →
  l'app gagne ; deux lignes d'app sur un dimanche ; dimanche sans rien → libre ;
  la colonne 2 porte le nom de planning de l'auteur, la colonne 1 le texte libre.
- **Droits** (pur) : son auteur peut réécrire et retirer un dimanche à venir ;
  pas un autre membre ; un admin, oui ; personne sur un dimanche passé.
- **Onglet Table** : « Libre » sur un dimanche vide ; « Je m'inscris » pose la
  ligne à mon nom ; la réécrire en « Famille Chung » tient après rechargement ;
  « Retirer » rend « Libre » ; la ligne d'un autre n'a pas de bouton ; la ligne
  du Sheet porte « au tableau » ; sans compte, aucun bouton et le lien de
  connexion ; capture regardée à l'œil sur les trois appareils.
- **Ce dimanche / Mes services** : une ligne posée dans l'app apparaît dans
  « Ce dimanche » et dans « Mes services » ; réécrite « Famille Chung », elle y
  reste (colonne cachée) ; rien dans « Ce dimanche » quand personne n'est
  inscrit.
- **Rappels** : `reminderBody` donne toujours « Dimanche 20 septembre (demain) :
  Petit déj » et 早餐 pour l'inscrit de l'app.
- **Mercredi** (fonctions pures) : `estMercredi` ; `prochainDimanche` un
  mercredi = J+4 ; ligne produite si le dimanche est libre, rien s'il est pris
  dans l'app, rien s'il est pris au tableau, rien un jeudi ; texte FR et 中文,
  avec le « Ne plus recevoir ».
- **Préférence** : la bascule « Petit déj » apparaît dans le profil, active par
  défaut ; mise à `false`, `filterUidsByNotifPref` écarte l'uid.

## Hors périmètre

- Toujours : l'app fait foi, le Sheet en repli ; FR + 中文 ; trois appareils ;
  **une seule notification par personne et par jour**.
- Demander avant : un compteur de places et un état « Complet » (T2 dit le
  contraire aujourd'hui) ; inscrire quelqu'un à sa place (route serveur Admin,
  Q6) ; une relance le samedi ; une liste des dimanches libres ailleurs que dans
  l'onglet Table.
- Jamais : une notification de plus (règle du lot 1c) ; écrire dans le Google
  Sheet depuis l'app ; une couleur nouvelle dans `serviceColors.ts` (gelé, et le
  « Petit déj » y a déjà l'orange de la Table) ; se retirer soi-même ailleurs
  dans le planning (écarté le 18/09/2026).

## Commandes

```bash
npm test -- tests/planning-petit-dej.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

Rien n'est codé : la spec attend le go de Timothée.
