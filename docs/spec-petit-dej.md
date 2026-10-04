# Spec : lot U3 (ex-lot 15) — inscription au petit déj dans l'app

Spec écrite le 18/09/2026, révisée le 04/10/2026 ; rien n'est codé. Attend la validation de Timothée, puis son go.

Révisée le 04/10/2026 : les inscriptions deviennent la seule source (plus de repli sur le Sheet), la case « Petit déj »
de la grille Table les affiche, les écrivains du planning Table et les admins posent et retirent des lignes pour
d'autres, les noms à venir de la grille sont repris une fois ; d'où un document par ligne, une règle « écrivain Table »,
un rattachement par compte, une reprise, le lot derrière l'interrupteur. Chemins revérifiés sur le code du 04/10.

## Mots

Christelle et Timothée, WhatsApp du 18/09/2026 :

> « du coup tout le monde doit se créer un compte alors ? ou est-ce que tu laisses petit dej visible et inscription
> sans connexion » — « faut les forcer un peu à s'inscrire » — « ouais » ; « si c'est pas google sheets* » — « Le
> faire sur le site » ; « Soit onglet petit dej et les gens choisissent la date pour s'inscrire » ; « et tant qu'il
> reste des places toutes les semaines ça envoie une notif aux gens pour s'inscrire au petit dej » ; « Après le truc
> c'est que le petit déj pas tout le monde est chaud pour faire ».

Timothée, 03/10/2026 : « Le planning du petit déjeuner. » Tranché au deuxième tour de l'entretien
(`feuille-de-route.md` § 3.U) : T8 à T11. Écran validé : planche des designs, version 10, « Petit déj · Planning ›
Table (téléphone) » (`petit-dej-telephone`).

## Ce que le code montre (04/10/2026)

- **Deux sources, aucune inscription.** `fetchTable` (`src/lib/planning/sheets.ts:158-160`) fusionne dimanche par
  dimanche la grille « table » de l'app et l'onglet `Franco_Table_PtD` (`fusionnerLignes`,
  `src/lib/planning/grilles.ts:237-241`) : colonne 1 l'équipe, colonne 2 le petit déj (`GRILLE_TABLE`, l. 135-142),
  pris dans le bloc « PETIT DÉJEUNER » du Sheet (`parsePetitDej`, `sheets.ts:131-141`) ou tapé dans la grille par un
  porteur du droit `table`. `fetchPetitDej` (l. 168-170) en tire `[date, noms]` pour `loadPlanningData`
  (`src/lib/planning/names.ts:29-52`, douze appelants) et « Ce dimanche » (`src/app/planning/page.tsx:77`).
- **Interrupteur coupé** (en ligne) : `grilleDeLApp` (`sheets.ts:7-10`) ne lit pas la grille, le petit déj vient du
  Sheet ; la page Table sert `AncienTableau` (`src/app/planning/table/page.tsx:58`), Prépa. Table seule
  (`AncienTableau.tsx:21`). **Ouvert** (local) : `PlanningGrille` (`table/page.tsx:26-55`), « Modifier » pour qui a le
  droit (`canEditPlanning`, `src/lib/access.ts:185-192`), export ; une case s'écrit dans
  `plannings/table/dimanches/{date}` (`ecrireCase`, `src/lib/firebase/planningGrille.ts:31-51`), qui recopie les
  autres cases d'un dimanche absent (`semer`, l. 38-42) ; l'import G4 écrit toutes les colonnes (`documentDimanche`,
  `src/lib/planning/import.ts:25-34`).
- **Le planning exige un compte** : `RequireAuth` (`src/app/planning/layout.tsx:8`). La ligne « Sans compte » du
  18/09 ne pouvait pas exister ; les commentaires « consultées sans compte » (`firestore.rules:30-31`, l. 388-389 ;
  `src/lib/planning/grille.ts:3-5`) sont périmés, on n'y touche pas ici.
- **Un service, rattaché par le nom seulement.** `findMyServices` (`names.ts:264`) et `servantsForDate`
  (l. 414-420) lisent la colonne 1 ; « Ce dimanche » n'affiche le petit déj que s'il est rempli
  (`planning/page.tsx:201-206`) ; rôle « Équipe » muet, 早餐 (`src/lib/push/reminderMessage.ts:25`, l. 50) ; orange
  de la Table (`src/lib/serviceColors.ts:54-56`, gelé). Un compte sans `planningName` n'a rien : « Mes services » lui
  dit de choisir son nom (`src/app/mes-services/page.tsx:184`), « Ce dimanche » ne cherche pas son service
  (`planning/page.tsx:91`), le cron tire ses destinataires des noms de `servantsForDate`
  (`src/app/api/cron/reminders/route.ts:202-212`). L'assemblée n'a en général pas de nom de planning.
- **Droit d'écrire un planning** : `plannings: string[]` coché par un admin (`src/types/user.ts:67-71`) ; côté
  serveur, `peutEcrirePlanning(key)` (`firestore.rules:392-394`) lit le profil (l. 51-57) : une lecture facturée par
  requête, même citée deux fois (page « Firestore pricing » ; gratuit : 50 000 lectures par jour).
- **REST** : `fetchGrille` lit `plannings/*` sans jeton (`grille.ts:37-82`, `read: if true`, `firestore.rules:396-401`)
  pour les pages et le cron, et rend le dernier cache ou rien sur erreur (l. 66, 79-80) ; `ajouterIdee` (POST, id
  automatique), `modifierIdee` (`updateMask`), `supprimerIdee` (`src/lib/firebase/harmonie.ts:124-154`).
- **Préférences** : `NOTIF_TYPES`, `DEFAULT_NOTIF_PREFS`, `NOTIF_TYPE_LABELS` (`types/user.ts:86-106`, libellés en
  français seulement), bascules `src/components/push/PushToggle.tsx:133-143` ; `filterUidsByNotifPref`
  (`src/lib/push/recipients.ts:87-93`) garde tout uid qui n'a pas mis le type à `false` : actif par défaut.
- **Rappel du matin** (un seul cron, `vercel.json`, 08:00 UTC) : tâches et ouvertures d'inscriptions sont des
  `Map<uid, …>` fondues dans la première notification de service (`route.ts:177-192`, l. 236), envoyées seules sinon
  (l. 253-289), anti-doublon `notifLog` (l. 50-77), coupées avec l'interrupteur (l. 174-185) ; les créneaux de scène
  sont rattachés **par `auteurUid`** (l. 214-224).

## Décisions de Timothée — à ne pas rouvrir

| # | Décision |
| --- | --- |
| T1 | **Compte obligatoire** pour s'inscrire (« faut les forcer un peu à s'inscrire »). *(Le planning entier exige déjà un compte.)* |
| T2 | **Pas de compteur de places** (« ça peut être une personne ou 4 c'est variable ») : un dimanche est **« Libre »** ou porte une **équipe**. |
| T3 | S'inscrire ajoute une **ligne pré-remplie à son nom**, **réécrivable librement** (« Famille Chung », « Les jeunes du Campus »). |
| T4 | Chacun retire **sa** ligne tant que le dimanche n'est pas passé. **Seul endroit du site où l'on se retire soi-même** — pour le planning, qui n'est pas dispo envoie un message. ~~Un admin retire n'importe laquelle~~ : élargi le 03/10/2026 par T10. |
| T5 | Notification **le mercredi**, **fondue dans le rappel du matin** (jamais une notification de plus), seulement si le dimanche qui vient est **libre**, préférence « Petit déj » **activée par défaut**, « Ne plus recevoir » dans le corps. |
| T6 | **Pas de 9e onglet** : le petit déj vit dans l'onglet **Table** du planning (redit le 18/09 : le Planning reste à 8 onglets). |
| ~~T7~~ | ~~**L'app fait foi** pour les dimanches à venir ; le Sheet reste lu **en repli**.~~ Remplacée le 03/10/2026 par T8. |
| T8 | *03/10/2026.* Les inscriptions sont la **seule source** ; **plus de secours par le Sheet**. |
| T9 | *03/10/2026.* La **case « Petit déj » de la grille Table** affiche les inscriptions. |
| T10 | *03/10/2026.* Les **écrivains du planning Table et les admins** ajoutent ou retirent des lignes, pour d'autres aussi. |
| T11 | *03/10/2026.* Les **noms à venir déjà présents dans la grille** sont repris en lignes, une seule fois. |
| T12 | *03–04/10/2026.* Rien ne part en ligne avant la fin du chantier : on retire alors l'interrupteur et on fusionne sur `main`. |

## Décisions prises ici, avec la raison lue dans le code

| # | Décision |
| --- | --- |
| ~~Q1~~ | ~~Sous-collection `petitDej/{date}/equipe/{uid}`, un document par personne.~~ Remplacée le 04/10/2026 par Q7 : un écrivain pose la ligne d'un autre (T10), l'uid ne peut plus nommer le document. |
| Q2 | **Seule borne : le passé.** Un dimanche `< currentSundayStr()` (`src/lib/planning/utils.ts:62-68`) ne se prend ni ne se libère, pour personne ; le dimanche même reste ouvert jusqu'à ce qu'il soit passé. Pas de limite d'avance au-delà de ce que l'onglet montre. *(Gardée.)* |
| ~~Q3~~ | ~~Repli dimanche par dimanche, mention « au tableau », « Le tableau indique déjà : Julien. Tu prends la suite ? ».~~ Tombe avec T7 (03/10/2026). |
| Q4 | **Le petit déj reste un service** : « Ce dimanche », « Mes services », rappels J-7 / J-3 / J-1. *(Gardée.)* ~~Colonne cachée portant le nom de planning de l'auteur~~ : remplacée le 04/10/2026 par Q9. |
| Q5 | **Libellé « Petit déj »** dans les réglages ; le mercredi, une ligne de plus : FR « Dimanche 20 septembre : personne pour le petit déj. » / 中文 « 9月20日星期日：还没有人负责早餐。» ; puis « Ne plus recevoir : Moi › Mon profil › Notifications › Petit déj » / « 不再接收：我 › 我的资料 › 通知 › 早餐 ». Un push n'a pas de lien dans son corps : on dit où couper ; seule, la notification ouvre `/planning/table`. *(Gardée ; traduction de la liste : question 7.)* |
| ~~Q6~~ | ~~Un admin n'inscrit pas quelqu'un à sa place.~~ Remplacée le 03/10/2026 par T10. Aucune route serveur pour autant : la règle le permet (Q8). |
| Q7 | **Un document par ligne, collection plate** : `petitDej/{id}`, id automatique (POST, comme `ajouterIdee`). Plate plutôt qu'une sous-collection par dimanche : lire un groupe de collections exige une règle `match /{path=**}/…` que la version du 18/09 n'avait pas (sa lecture dans le navigateur aurait été refusée), et la base simulée des tests (`tests/helpers/fakeSession.ts:146-230` : POST, PATCH, DELETE, `runQuery` sur une collection) ne le fait pas. Chaque ligne étant son document, deux personnes ne s'effacent jamais. |
| Q8 | **Droits** : poser **sa** ligne, tout connecté (T1) ; poser une ligne pour quelqu'un, réécrire ou retirer n'importe laquelle : `peutEcrirePlanning('table')`, le droit qui remplit déjà la grille Table. Aucun droit nouveau. Au plus une lecture facturée par écriture (le profil). Miroir client : `canGererPetitDej`, `canEditPetitDej`. La borne du passé reste côté client (Q2), comme le reste du filtrage du site. |
| Q9 | **Rattachement par le compte** (question 4) : une ligne posée par « Je m'inscris » porte l'`uid` de l'inscrit et compte pour lui dans « Mes services », « Ce dimanche » et les rappels, même réécrite (« Famille Chung ») et sans nom de planning, sur le patron des créneaux de scène (`route.ts:214-224`). Une ligne posée par un écrivain ou par la reprise (`uid` vide) se rattache par son **texte**, comme une case de planning. La colonne cachée du 18/09 ne servait qu'aux comptes ayant un nom de planning et ratait les rappels : le cron tire ses noms de `servantsForDate`, que le 18/09 laissait sur la colonne 1. |
| Q10 | **Une lecture, sans jeton** (question 3) : `lirePetitDej()` lit la collection en REST public, comme `fetchGrille` : pages et cron, même code, cache de cinq minutes oublié après chaque écriture. **Une lecture en échec n'est pas « personne »** : la carte le dit, sans « Libre » ni bouton, et la ligne du mercredi ne part pas. |
| Q11 | **Les dimanches de la carte** : tous ceux du trimestre choisi (`sundaysBetween`, `src/lib/scene/dimanches.ts:17-25`), pas les lignes du Sheet. « Je m'inscris » seulement sur un dimanche à venir sans ligne (planche) ; juste avant d'écrire, l'app relit le dimanche et, si quelqu'un vient de s'inscrire, le dit et n'écrit rien (patron des créneaux de scène). |
| Q12 | **La case de la grille affiche, sans se modifier** (T9 ; question 1) : un champ `lectureSeule` sur `ColonneGrille` (`grilles.ts:21-30`), posé sur la colonne `petitDej`. `PlanningGrille` l'affiche en texte même en « Modifier » (`laCase`, `PlanningGrille.tsx:212-230`) ; `semer`, `documentDimanche` et `nomsNonRattaches` (`import.ts:41-57`) la sautent. `fetchTable` y met les lignes, jointes par « , » : l'export CSV et PDF suit, celui de U2 (`docs/spec-planning-2027.md`) aussi. Tranche l'écart (2) de `spec-planning-grille.md`. |
| Q13 | **La reprise** (T11 ; question 5) : un bouton admin sur le patron de l'import G4 (`src/app/api/admin/importer-planning/route.ts`). Elle lit la grille **telle qu'elle s'affichait avant ce lot** (`fusionnerLignes(fetchGrille("table"), lireTableSheet())`, colonne 2), garde les dimanches ≥ `currentSundayStr()` dont la case est remplie et qui n'ont aucune ligne, et écrit **une ligne par case**, texte tel quel, `uid` vide. Relancer n'écrit rien de plus ; seul risque, un dimanche repris puis libéré reprendrait son nom : d'où une seule reprise. |
| Q14 | **Derrière l'interrupteur** (question 6) : coupé, rien ne change (petit déj lu dans le Sheet, `AncienTableau`, ni carte, ni ligne du mercredi, ni bascule « Petit déj », route de reprise en 404). Ouvert, les lignes sont la seule source. Même raison que `grilleDeLApp` : Firestore est partagé entre le local et le site en ligne. |
| Q15 | **Contraste** : « Je m'inscris » prend le fond `serviceButtonFill(PLANNING_COLORS.table)` (5C1 : bouton à la couleur de l'écran). Un libellé blanc sur `#c87941` ne donne que 3,35:1 (AA : 4,5) : une entrée de plus dans `FONDS_FONCES` (`src/lib/serviceButton.ts:10-12`), la teinte assombrie comme l'Intergroupe (≈ 83 %, `#a66436`, 4,67:1, à confirmer par le test). Date passée en `text-muted-foreground` (5,2:1), pas le gris de la planche (`#c7c7cc`, 1,7:1). `serviceColors.ts` n'est pas touché. |

## Objectif

1. Chacun s'inscrit au petit déj dans l'app, depuis Planning › Table : « Je m'inscris » sur un dimanche libre ; sa
   ligne se réécrit et se retire.
2. Les lignes sont la seule source : carte, case de la grille, « Ce dimanche », « Mes services », rappels, export.
3. Les écrivains du planning Table et les admins posent, réécrivent et retirent des lignes pour d'autres.
4. Une reprise, une fois, change en lignes les noms à venir de la grille.
5. Le mercredi, si le dimanche qui vient est libre, une ligne de plus dans le rappel du matin.

Réussite : un dimanche à venir sans ligne affiche « Libre » et « Je m'inscris » ; un membre clique, la ligne apparaît
à son nom, il la réécrit « Famille Chung » (elle tient au rechargement), la retire, et le dimanche redevient « Libre » ;
la ligne d'un autre n'a aucun bouton pour lui ; un écrivain du planning Table ajoute « Les jeunes du Campus » et retire
n'importe quelle ligne ; la case de la grille montre les mêmes textes sans se modifier ; un nom du Sheet n'apparaît
plus nulle part ; « Famille Chung » reste dans « Mes services » de son auteur, même sans nom de planning ; la reprise
crée une ligne par dimanche à venir porté par la grille, et rien la seconde fois ; le mercredi d'un dimanche libre,
une ligne de plus dans le rappel du matin, pas une notification de plus ; coupé, le site est celui d'aujourd'hui.

## Modèle et règles

`petitDej/{id}`, id automatique, une ligne par document ; `nom` pré-rempli au nom de planning, sinon « Prénom N. » :

```ts
/** Une ligne du petit déj : une équipe, un dimanche (docs/spec-petit-dej.md). */
export type LignePetitDej = {
  id: string
  dimanche: string   // AAAA-MM-JJ
  nom: string        // texte affiché, 1 à 80 caractères, réécrivable
  uid: string        // l'inscrit par « Je m'inscris » ; "" : posée par un écrivain ou par la reprise
  auteurUid: string  // qui a posé la ligne
  creeLe: string     // ISO
  modifieLe: string  // ISO
}
```

Règle proposée (`firestore.rules`, placée après `peutEcrirePlanning`) :

```
// Petit déj (lot U3, docs/spec-petit-dej.md). Lecture publique, comme plannings/*. Sa ligne : tout connecté ;
// une ligne pour quelqu'un (uid vide), réécrire ou retirer : écrivains du planning Table et admins. Dimanche,
// inscrit et auteur figés ; borne du passé côté client. Miroir : canGererPetitDej, canEditPetitDej (access.ts).
match /petitDej/{id} {
  allow read: if true;
  allow create: if signedIn()
    && request.resource.data.auteurUid == request.auth.uid
    && request.resource.data.dimanche.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')
    && request.resource.data.nom.size() > 0 && request.resource.data.nom.size() <= 80
    && (request.resource.data.uid == request.auth.uid
        || (request.resource.data.uid == '' && peutEcrirePlanning('table')));
  allow update: if signedIn()
    && request.resource.data.dimanche == resource.data.dimanche
    && request.resource.data.uid == resource.data.uid
    && request.resource.data.auteurUid == resource.data.auteurUid
    && request.resource.data.nom.size() > 0 && request.resource.data.nom.size() <= 80
    && (resource.data.uid == request.auth.uid || peutEcrirePlanning('table'));
  allow delete: if signedIn()
    && (resource.data.uid == request.auth.uid || peutEcrirePlanning('table'));
}
```

Miroir client (`src/lib/access.ts`), en double comme le veut le CLAUDE.md :

```ts
/** Poser une ligne pour quelqu'un, réécrire ou retirer n'importe laquelle : canEditPlanning(user, profile, "table"). */
export function canGererPetitDej(user: AuthUser | null, profile: { plannings?: string[] } | null): boolean
/** Réécrire ou retirer une ligne : l'inscrit (ligne.uid) ou canGererPetitDej, tant que le dimanche n'est pas passé. */
export function canEditPetitDej(user: AuthUser | null, profile: { plannings?: string[] } | null,
  ligne: { uid: string; dimanche: string }, dimancheEnCours: string): boolean
```

Lecture : `lirePetitDej()` (REST public, `runQuery` sur `petitDej` trié par `dimanche`, erreur si la lecture
échoue) ; `rangeesPetitDej(lignes)` rend `[dimanche, textes joints par « , »]`, la forme de `PlanningData.petitDej`
(`names.ts:17-18`) : `loadPlanningData` et ses douze appelants ne changent pas. Ouvert, `fetchPetitDej` = ces
rangées (vide si la lecture échoue) et `fetchTable` met les lignes en colonne 2 ; coupé, les deux restent au Sheet.

## Écrans

**Planning › Table** (`/planning/table`, interrupteur ouvert ; planche `petit-dej-telephone`). Sous les boutons
T1–T4, gardés, la carte **« Petit déj »** : icône tasse sur fond teinté de la Table, titre, « Trimestre 4 » à droite
(le trimestre choisi). Une rangée par dimanche du trimestre : date courte (« 4 oct. », « 1er nov. » ; 中文
« 10月4日 »), le texte ou « Libre » en ambre (`text-amber-700`, 5:1), les boutons. Sous la liste, l'astuce.

| Cas | Ce qu'on voit |
| --- | --- |
| Dimanche à venir sans ligne | « Libre » et **« Je m'inscris »** (bouton plein, Q15) |
| Ma ligne, dimanche à venir | le texte, **✎** (réécrire sur place ; Entrée ou sortie du champ enregistre, Échap annule, vide refusé) et **« Retirer »** (« Retirer cette ligne ? ») |
| La ligne d'un autre | le texte seul |
| Écrivain du planning Table, admin | en plus, **＋ « Ajouter une ligne »** sur chaque dimanche à venir (champ libre, noms des comptes suggérés par `useGrilleApp`), ✎ et « Retirer » sur toutes les lignes à venir |
| Plusieurs lignes | empilées sous la date, chacune avec ses boutons |
| Dimanche passé | date en gris secondaire, texte, aucun bouton |
| Lecture impossible | « Inscriptions illisibles pour l'instant. », ni « Libre » ni bouton |

Dessous, la grille d'aujourd'hui (`PlanningGrille`), sa colonne Petit déj en lecture (Q12 ; question 8). Téléphone :
la planche ; tablette portrait : la même, plus grande ; tablette paysage et ordinateur : la carte en largeur de lecture
(`max-w-lg`, celle de l'ancien tableau), la grille en pleine largeur. **Non dessinés** : la vue d'un écrivain, la
tablette, l'ordinateur, l'erreur de lecture ; décrits d'après l'écran voisin.

- **« Ce dimanche »** (`/planning`) : inchangé ; la ligne « Petit déj » n'apparaît que s'il y a au moins une ligne.
  Le prochain service de la personne compte ses lignes (Q9).
- **« Mes services »** : inchangé pour qui a un nom de planning ; un compte sans nom de planning qui a des lignes
  voit la page avec ses petits déj (sous-titre : prénom et nom), au lieu de « choisis ton nom » (question 4).
- **Mon profil › Notifications** : la bascule « Petit déj », active par défaut.
- **Administration › Planning** : « Reprendre les noms du petit déj », à côté des imports (`src/app/admin/page.tsx:1078-1104`),
  compte rendu « 9 dimanches repris, 3 déjà inscrits. » (français) ; il suivra l'import au Back-Office (U6).

Libellés `planning.petitDej.*`, à relire en 中文 par Timothée ; le titre reprend `planning.tabs.petitDej` (早餐),
les refus d'écriture `planning.grille.droitRetire` et `horsLigne` :

| Clé | FR | 中文 |
| --- | --- | --- |
| `trimestre` | Trimestre {{n}} | 第{{n}}季度 |
| `libre` | Libre | 空闲 |
| `inscrire` | Je m'inscris | 我来报名 |
| `modifier` | Modifier (étiquette du ✎) | 修改 |
| `retirer` / `confirmerRetrait` | Retirer / Retirer cette ligne ? | 移除 / 移除这一行？ |
| `ajouter` | Ajouter une ligne | 添加一行 |
| `astuce` | Tu peux écrire « Famille … » à la place de ton nom. | 可以写“某某家庭”代替你的名字。 |
| `vientDeSInscrire` | {{nom}} vient de s'inscrire. | {{nom}} 刚刚报名了。 |
| `illisible` | Inscriptions illisibles pour l'instant. | 暂时无法读取报名。 |

## Ce qui sera construit — cinq tranches

U3 se code après U2 : si U2 a touché à `fetchTable`, à l'export ou à `PlanningGrille`, U3 s'y branche sans les refaire.

- **PD1 — Modèle, droits, lecture.** `src/types/petitDej.ts` ; `src/lib/petitdej/lignes.ts` (lecture REST publique,
  cache, `oublierPetitDej` ; pures : `rangeesPetitDej`, `estLibre`, `servicesPetitDejDuCompte`, `planifierReprise`) ;
  `src/lib/firebase/petitDej.ts` (REST avec jeton : `inscrire`, `ajouterLigne`, `renommerLigne`, `retirerLigne`) ;
  règle `petitDej/{id}` et `canGererPetitDej` / `canEditPetitDej` en double ; `fetchPetitDej`, `fetchTable` derrière
  `BACK_OFFICE`.
- **PD2 — Onglet Table.** La carte (`src/components/planning/PetitDejCarte.tsx`) en tête de `table/page.tsx` ;
  `lectureSeule` respecté par `laCase`, `semer`, `documentDimanche`, `nomsNonRattaches` ; l'entrée Table de
  `FONDS_FONCES` ; libellés FR et 中文.
- **PD3 — Ce dimanche, Mes services, rappels.** `servicesPetitDejDuCompte` dans `planning/page.tsx` (prochain service,
  sans doublon) et `mes-services/page.tsx` (liste ; page ouverte sans nom de planning) ; dans le cron, « Petit déj »
  ajouté par `uid` aux dates J-7, J-3, J-1, sans doublon, sur le patron des créneaux de scène.
- **PD4 — Le mercredi.** `"petitDej"` dans `NOTIF_TYPES`, `DEFAULT_NOTIF_PREFS` (`true`), `NOTIF_TYPE_LABELS` ;
  `src/lib/petitdej/rappel.ts` (pur : `estMercredi`, `prochainDimanche`, `lignesMercredi`, `petitDejTitre`) ; dans le
  cron, une `Map<uid, lignes>` fondue par `avecLignes` (`route.ts:236`), seule sinon, anti-doublon
  `petit-dej-libre-<dimanche>`, tous les comptes filtrés par la préférence, `url: "/planning/table"`, rien si la
  lecture a échoué.
- **PD5 — La reprise.** `planifierReprise` ; `src/app/api/admin/reprendre-petit-dej/route.ts` (POST, admins,
  firebase-admin, un lot d'écritures, `{ reprises, ignores }`, 404 coupé) ; le bouton de l'administration.

## Tests (Playwright, trois appareils, écrits avant le code)

Dans `tests/planning-petit-dej.spec.ts`, base simulée (`signInAs` + documents `petitDej/*`), horloge fixée :

- **Pur** : `rangeesPetitDej` (textes joints par « , » dans l'ordre d'inscription, dimanche sans ligne absent) ;
  droits (l'inscrit sur sa ligne à venir oui, un autre membre non, écrivain `table` oui, admin oui, personne un
  dimanche passé) ; `servicesPetitDejDuCompte` (« Famille Chung » reste un service de son inscrit, pas de doublon si
  le texte porte déjà son nom de planning) ; `planifierReprise` (à venir seulement, case vide ou dimanche déjà pris
  ignorés, relancer = rien, une ligne par case) ; le mercredi (`prochainDimanche` = J+4, ligne si libre, rien s'il
  est pris, si la lecture a échoué ou un jeudi ; FR et 中文 avec « Ne plus recevoir »).
- **Carte** : « Libre » et « Je m'inscris » ; le clic écrit `uid` et `auteurUid` = moi ; ✎ « Famille Chung » tient au
  rechargement ; « Retirer » rend « Libre » ; aucun bouton sur la ligne d'un autre ni un dimanche passé ; une ligne
  arrivée entre-temps : message, aucune écriture ; un écrivain `table` ajoute « Les jeunes du Campus » (`uid` vide)
  et retire la ligne d'un autre, un membre n'a pas de ＋ ; lecture en échec : ni « Libre » ni bouton ; un nom du
  Sheet n'apparaît pas ; 中文 (« 空闲 », « 我来报名 ») ; captures regardées sur les trois appareils.
- **Grille** : la case Petit déj montre les lignes, n'est pas un bouton en « Modifier », n'est pas recopiée par
  `semer` ; l'export CSV porte les lignes.
- **Ailleurs** : une ligne apparaît dans « Ce dimanche », rien sans ligne ; « Famille Chung » reste dans « Mes
  services » de son inscrit ; un compte sans nom de planning voit ses petits déj ; `reminderBody` donne toujours
  « Dimanche 20 septembre (demain) : Petit déj » et 早餐 ; la bascule « Petit déj » est active par défaut et
  l'éteindre écrit `notifPrefs/{uid}.petitDej = false` ; le bouton de reprise appelle la route (simulée, comme
  `planning-import.spec.ts`) et affiche son compte rendu.

**Tests changés parce que la source change (T8), pas affaiblis** : les 4 tests d'écran du lot 1b (Ce dimanche ×2, Mes
services, 中文) passent dans `back-office-coupe.spec.ts`, où le petit déj vient encore du Sheet, plus « la page Table
n'a pas de carte Petit déj » ; les tests 1 à 3 de `planning-table.spec.ts` lisent la case dans les lignes ; les 3
tests purs du lot 1b restent. **Vérifiable seulement en ligne** : le cron et la route de reprise, relus mais pas
exécutés, comme le reste du cron.

## Hors périmètre

- Toujours : les lignes, seule source (interrupteur ouvert) ; FR + 中文 pour l'assemblée ; trois appareils ; une
  notification par personne et par jour.
- Demander avant : un compteur de places ou « Complet » (T2) ; inscrire un compte choisi à la place d'un texte ; « Je
  m'inscris » sur un dimanche déjà pris ; une relance le samedi ; un historique nommé des lignes ; toute dépendance
  npm (aucune prévue : la tasse est dans lucide).
- Jamais : une notification de plus ; écrire dans le Google Sheet ; relire le Sheet du petit déj interrupteur ouvert ;
  une couleur nouvelle dans `serviceColors.ts` ; se retirer soi-même ailleurs dans le planning.
- Ailleurs, en relisant `lirePetitDej` et `estLibre` : widget « Petit déj », carte compacte « Prépa. Table » et
  planning de l'App en lecture (`docs/spec-back-office.md`, U6) ; source « Petit déj » du calendrier
  (`docs/spec-calendrier.md`, U8) ; export PDF et .xlsx au modèle du Sheet (`docs/spec-planning-2027.md`, U2) ;
  barre latérale et largeurs (`docs/spec-navigation-grand-ecran.md`, U4).

## À la mise en ligne

1. Timothée publie la règle `petitDej` **avant** la validation en local : les essais locaux écrivent dans le vrai
   Firestore, sous les vraies règles. Une ligne posée en local existe vraiment : à retirer si c'était un essai.
2. Le jour du retrait de l'interrupteur (fin du chantier), un admin lance la reprise, une fois.

## Commandes

```bash
npm test -- tests/planning-petit-dej.spec.ts tests/planning-table.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npm test -- tests/back-office-coupe.spec.ts   # le site tel qu'en ligne, interrupteur coupé
npx tsc --noEmit
npm run lint
```

## Questions ouvertes

1. **Les écrivains gèrent les lignes dans la carte**, la case de la grille ne fait qu'afficher (T9) ? *Recommandation :
   oui* — un seul endroit ; une case qui gère une liste serait une exception dans `PlanningGrille`. U6 met le planning
   de l'App en lecture mais garde cette carte dans l'App, commandes des écrivains comprises (`spec-back-office.md`, Q14).
2. **Une ligne posée pour quelqu'un** ne se retire que par les écrivains et les admins ; la personne nommée prévient,
   comme pour le reste du planning ? *Recommandation : oui* — on retire ce qu'on a posé soi-même (T4), et cette ligne
   n'est liée à aucun compte.
3. **Lecture publique des lignes** (textes et identifiants de compte lisibles sans connexion par l'API, comme
   `plannings/*` ; les noms sont déjà dans le Sheet public) ? *Recommandation : oui* — sinon deux lecteurs (navigateur
   avec jeton, serveur avec firebase-admin) et trois appelants de `loadPlanningData` à changer.
4. **Rattachement par le compte** : une inscription compte pour son auteur dans « Mes services », « Ce dimanche » et
   les rappels, même réécrite et sans nom de planning, et « Mes services » s'ouvre alors avec ses seuls petits déj ?
   *Recommandation : oui* — sinon l'assemblée, en général sans nom de planning, n'a ni « Mes services » ni rappel.
5. **La reprise une seule fois, le jour de la mise en ligne**, pas pendant la validation en local (Firestore partagé) ?
   En local, les dimanches que seul le Sheet porte paraissent donc « Libre ». *Recommandation : oui.*
6. **Tout le lot derrière l'interrupteur** : coupé, le petit déj d'aujourd'hui (lu dans le Sheet), sans carte ni ligne
   du mercredi, jusqu'à la fin du chantier ? *Recommandation : oui* — même raison que la grille : Firestore partagé.
7. **Traduire la liste « Recevoir »** de Mon profil (titre et libellés en français seulement aujourd'hui, même en
   中文), puisque l'assemblée y verra « Petit déj » ? *Recommandation : oui* (six clés : le titre et les cinq types) ;
   sinon « Petit déj » reste en français comme les autres (Q5).
8. **La grille reste sous la carte dans ce lot** ; la carte compacte « Prépa. Table du Seigneur » de la planche
   (lecture seule) vient avec U6, qui sépare l'écriture de la lecture ? *Recommandation : oui* — U3 passe avant U6, et
   la grille garde la saisie de la colonne Équipe.

## Avancement

Rien n'est codé : la spec attend la validation de Timothée, puis son go.
