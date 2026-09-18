# Spec : le planning rempli dans l'app (lot 17)

Demande de Timothée, 18/09/2026 (en listant ce qu'il reste à faire) :

> « Est ce que tu peux faire en sorte que le planning qu'on fait sur le site ait
> la même apparence que le google sheet qu'on a aujourd'hui. Et aussi avoir un
> organigramme et tout ? » ; « on ouvre maintenant dans l'app » ; « il faudrait
> que l'admin puisse choisir qui est autorisé à modifier les plannings et
> lesquels » ; « Le découpage en trimestre c'est pour savoir qui va servir quand
> et où ce trimestre » ; « Tout le monde : lit, et peut se retirer du planning du
> petit dej. mais sinon le reste il faut envoyer un message si on est pas
> dispo » ; « si on fait tout dans l'app on a pas besoin de ça » (à propos d'une
> fenêtre de conflit).

Statut : **la forme est arrêtée — planche cliquable publiée et validée par
Timothée le 18/09/2026 (« Le planning comme ça c'est OK »),
https://claude.ai/artifact/BFqAet6GiSsY5z3FyX4LLn. Rien n'est codé : la spec
attend le go.**

## Ce que le code montre (18/09/2026)

- **Le planning est lu, jamais écrit.** `fetchSheet`
  (`src/lib/planning/sheets.ts` l. 70-83) interroge le classeur `SHEET_ID`
  (l. 4) onglet par onglet en CSV gviz, **sans authentification** : les données
  sont déjà publiques. Cache mémoire de 5 minutes (l. 67-68) et repli sur le
  dernier cache en cas d'échec (l. 78-82).
- **La grille du Culte est déjà un tableau de chaînes.** `fetchCulte` (l. 88-95)
  rend `[date ISO, présidence, choriste 1, choriste 2, piano, guitare, batterie,
  sono, PPT, orateur, traduction, sainte cène]` — **une ligne par dimanche,
  douze cases**, les colonnes au-delà étant des notes de travail. C'est
  exactement la forme qu'une grille écrite dans l'app doit produire.
- **Dix appelants dépendent de cette forme, aucun ne dépend de Google.**
  `loadPlanningData` (`src/lib/planning/names.ts` l. 29-51) assemble
  `PlanningData` (l. 14-27) ; en descendent `findMyServices` (l. 244),
  `servantsForDate` (l. 387), `setlistSeances` (l. 328),
  `deriveServiceRolesFromPlanning` (l. 177), `collectPlanningNames` (l. 122),
  `rehearsalsForDate` (l. 444). Les appelants : `mes-services`, `admin`,
  `setlists`, `signup`, `profil`, `SetlistForm`, `useHarmonie`,
  `api/taches/fait`, `api/setlist/presentation`, `api/push/notify-setlist`,
  `api/cron/reminders` (l. 156). **Changer la source sans changer la forme ne
  touche aucun d'eux.**
- **Les noms sont du texte libre depuis toujours.** `splitNames` (`names.ts`
  l. 81-91) découpe une case sur `, ; /`, jette ce qui a un chiffre ou figure
  dans `NON_NAMES` (l. 56-60) ; `normalizeName` (l. 76-78) plie accents, casse
  et ponctuation ; `loadPlanningNameIndex` (`src/lib/push/recipients.ts`
  l. 24-36) apparie ces noms aux comptes par `planningName`. « Pasteur ZHOU »,
  « Belka », « Hewei » sont déjà dans les données de secours
  (`src/lib/planning/data.ts` l. 3-30) et ne correspondent à aucun compte : le
  site le supporte déjà, et l'administration les affiche sous « Planning sans
  compte » (`src/app/admin/page.tsx` l. 149-157 et 939-968).
- **Les onglets fragiles existent bel et bien** : `fetchPaix` (l. 154-156) lit
  `Paix_T1`, `Paix _T2`, `Paix _T3`, `Paix_T4` — deux noms sur quatre portent
  une espace parasite ; `fetchBonte` (l. 171-173) de même. Un renommage dans le
  classeur vide silencieusement un trimestre : `fetchMulti` (l. 140-152) ignore
  ce qu'il ne sait pas dater.
- **Les dates du Sheet n'ont pas d'année.** `parseDate` (l. 48-62) accepte
  `JJ/MM` et complète par `inferYear` (l. 39-46), qui ne bascule d'année qu'au
  voisinage du nouvel an. Une grille écrite dans l'app n'a pas ce problème : la
  date y est l'identifiant.
- **L'écran existe déjà à moitié.** `PlanningTable`
  (`src/components/planning/PlanningTable.tsx`) fait **table sur `sm:` et plus,
  cartes par date sur téléphone** (l. 114-167 et l. 170-235), avec le champ
  « Mon prénom » mémorisé sur l'appareil (l. 41-52), le filtre « Mes dates »
  (l. 100-110), les séparateurs de mois (l. 61-68) et la pastille « Cette
  semaine » (l. 128, 147-149). Lui manquent : la colonne des dates **figée**, la
  grille **continue** (il est alimenté trimestre par trimestre), le bandeau et
  toute écriture.
- **Le découpage en trimestre n'est pas cosmétique** : il porte la publication.
  `triVisibilities` (`src/lib/planning/releases.ts` l. 70-81) masque aux membres
  un trimestre futur non publié ; `getPublishedQuarters` (l. 90-102) lit
  `planningReleases/{key}_{year}` **en REST public, sans compte** ; la page Culte
  applique la règle en filtrant les lignes par `filterByTri`
  (`src/app/planning/culte/page.tsx` l. 39-45). Une grille continue qui
  oublierait cette règle **révélerait le trimestre suivant à tout le monde**.
- **Le profil porte déjà le patron de droits demandé** : `annonces: string[]`
  (`src/types/user.ts` l. 52-55) et `notify: string[]` (l. 56-59), cochés par un
  admin seul (`src/app/admin/page.tsx` l. 853-880 et 882-915, enregistrés par
  `saveEdit` l. 223), refusés à la création de son propre profil
  (`firestore.rules` l. 67-73 : `annonces == []`, `notify == []`,
  `poles == []`), modifiables par les admins seuls (l. 75).
- **L'historique nommé existe, données d'un côté, phrases de l'autre.**
  `HistoryChange` (`src/lib/setlist/history.ts` l. 20-41) est une union de
  changements **stockés en données** et traduits à l'affichage ;
  `setlists/{id}/history` (`firestore.rules` l. 223-236) se lit par tout
  connecté et s'écrit par qui peut modifier, sous son propre nom ;
  `historyAuthor` (`src/lib/firebase/setlistHistory.ts` l. 70-78) prend le
  **nom de planning** en priorité ; `SAME_PASS_MS` (l. 20) regroupe en une entrée
  les retouches d'une même personne à moins de 15 minutes.
- **L'écriture d'une seule case est un geste connu** : PATCH REST avec
  `updateMask.fieldPaths` — `src/lib/firebase/programmes.ts` l. 84-87
  (« PATCH limité aux champs donnés (updateMask) : le reste du document est
  conservé »), repris par `notifPrefs.ts` l. 23-28 et `evenements.ts` l. 150-154.
  **Aucune transaction n'existe dans ce projet** : tout passe par `FS_BASE`
  (`src/lib/firebase/setlists.ts` l. 48) en REST.
- **Le bouton d'import a un modèle exact** : « Migrer les annonces vers le
  calendrier » (`src/app/admin/page.tsx` l. 182-192 et 669-686) appelle
  `/api/admin/migrer-annonces` — `ADMIN_EMAILS` vérifié (route l. 23), Admin SDK,
  identifiant fixe et saut si le document existe (l. 29-30), donc **rejouable
  sans doublon**. `/api/planning/release` (l. 21-60) montre l'autre moitié :
  vérification du token puis des droits `notify` du profil.
- **Le cron tourne en Node et fait déjà des `fetch` réseau** :
  `loadPlanningData()` y est appelé tel quel (`src/app/api/cron/reminders/route.ts`
  l. 156) et va chercher les dix onglets par HTTP ; `servantsForDate` et
  `rehearsalsForDate` (l. 185-190) puis `loadPlanningNameIndex` + `normalizeName`
  (l. 195) font le reste. Admin SDK et `fetch` cohabitent dans la même route.
- **`src/lib/serviceColors.ts` est gelé** : `PLANNING_COLORS` (l. 7-20) donne
  déjà `culte: "#2d5a65"` et une couleur à chacun des huit plannings. **Le lot 17
  n'ajoute aucune couleur.**
- **Le Planning reste à 8 onglets** (`PlanningTabs.tsx` l. 9-18, décision Q26 du
  18/09/2026) : la grille remplace le contenu de l'onglet Culte, elle n'en crée
  pas un neuvième.

## Décisions de Timothée (18/09/2026) — à ne pas rouvrir

| # | Décision |
| --- | --- |
| T1 | **Trois tranches, dans cet ordre** : (1) grille **en lecture** — l'app affiche `Franco_Louange` comme le Sheet, Christelle écrit toujours dans Google, risque nul ; (2) **écriture sur le seul Culte Franco** — import initial, export CSV, le Sheet devient l'archive, les 7 autres plannings continuent d'être lus depuis Google sans rien changer ; (3) **les groupes et le reste**, seulement après trois dimanches sans incident. |
| T2 | **Apparence** : grille complète sur **ordinateur et tablette** (mêmes colonnes, même ordre que le Sheet, colonne des dates **figée** au défilement horizontal) ; **une carte par dimanche sur téléphone** (11 colonnes ne tiennent pas dans 390 px). |
| T3 | **Droits** : nouveau champ `plannings: string[]` sur le profil, coché par un **admin**, **planning par planning**, sur le modèle exact de `annonces` et `notify`. Les autres **lisent seulement** : pas de bouton « je me retire », qui n'est pas dispo **envoie un message**. Se retirer soi-même n'existe que pour le petit déj (lot 15). |
| T4 | **Trimestre conservé** : groupe + période + jour, en **bandeau** au-dessus d'une grille **continue** (les 3 mois à venir par défaut, « Voir plus tôt » / « Voir plus tard »). **Plus de découpage en quatre onglets.** |
| T5 | **Noms sans compte acceptés** : autocomplétion sur les comptes, **saisie libre autorisée** (« Pasteur ZHOU », « Belka », « Hewei ») ; un nom libre ne déclenche ni notification ni « Mes services », et ressort dans « Planning sans compte » de l'administration. |
| T6 | **Enregistrement case par case**, **pas de fenêtre de conflit** ; chaque modification laisse une **ligne d'historique nommée** (« Christelle a remplacé Eva Y. par Esther C. au piano du 4 octobre »). |
| T7 | **Colonnes en dur** par planning (les 11 de Franco, celles d'EDD…), **pas d'éditeur de colonnes**. |
| T8 | **Import initial** par bouton d'administration (modèle : la migration des annonces), rattachement par `planningName` avec `normalizeName`, liste des noms non rattachés, **rejouable sans doublon**. **Export CSV** dans la même tranche que l'écriture. |

## Décisions prises ici, avec la raison lue dans le code

| # | Décision |
| --- | --- |
| D1 | **Un document par dimanche, une case par champ** : `plannings/{key}/dimanches/{AAAA-MM-JJ}`, et non un document par trimestre ni une sous-collection de cases. Un document par trimestre se réécrirait en entier à chaque case (aucune transaction dans ce projet, tout est PATCH REST) : deux personnes qui saisissent deux colonnes en même temps s'effaceraient. Une sous-collection de cases coûterait 11 lectures par dimanche, soit **143 lectures par trimestre** au lieu de 13. Avec un document par dimanche, écrire une case est un `PATCH ?updateMask.fieldPaths=piano` qui ne touche qu'elle (patron de `programmes.ts` l. 84-87), et lire les trois mois affichés coûte **13 lectures**, un trimestre 13, l'année 52. `key` reprend les clés de `PUBLISHABLE_PLANNINGS` (`releases.ts` l. 29-34) et de `planningReleases/{key}_{year}` — une seule nomenclature. |
| D2 | **La bascule de source se fait dans `fetchCulte`, pas chez les appelants.** `fetchCulte()` devient : lire la grille de l'app ; si elle est vide, lire `Franco_Louange` comme aujourd'hui. La forme rendue est **identique** (date ISO + 11 cases), donc `loadPlanningData` et ses dix appelants ne voient rien. Les 7 autres plannings appellent la même fonction gabarit avec `ecritDansLApp = false` et continuent de lire Google mot pour mot. Une liste unique `PLANNINGS_APP` (tranche 2 : `["culte"]` ; tranche 3 : le reste) est le seul interrupteur. |
| D3 | **Le cron n'a rien de spécial à faire.** La grille se lit en **REST public** (`allow read: if true`), exactement comme `planningReleases` (`firestore.rules` l. 346-349) dont le commentaire dit pourquoi : « les pages planning, consultées sans compte ». Ce n'est pas un relâchement — le CSV gviz d'aujourd'hui est déjà public et sans jeton. Le `fetch` de `fetchCulte` fonctionne donc **tel quel** dans le runtime Node du cron, qui appelle déjà `loadPlanningData()` (l. 156) et va chercher dix onglets par HTTP. Pas de lecture Admin SDK, pas de seconde implémentation à garder synchrone. Le cache mémoire de 5 minutes ne gêne pas : le cron démarre à froid une fois par jour. |
| D4 | **Les données de secours de `data.ts` restent en place en tranche 1** (rien ne change de source) et **cessent d'alimenter le Culte en tranche 2** : `CULTE_FALLBACK` date de 2026 ; l'afficher quand la grille est vide ferait lire un planning faux sans le dire, ce que `StaleBanner` et `useSheet` (l. 18-47) ont justement été écrits pour éviter. La grille vide affiche « Planning à venir » et la bannière d'indisponibilité, pas des noms périmés. Le fichier **n'est pas supprimé** : il sert encore aux 7 autres plannings, et `CULTE_FALLBACK` devient du code mort **signalé, pas effacé** (règle du CLAUDE.md) le jour où la tranche 3 passe. L'import initial recopie de toute façon ces dimanches dans la grille. |
| D5 | **Le CSV exporté reproduit l'onglet, ligne d'en-tête comprise.** Le Sheet a une ligne de titres (que `fetchCulte` saute déjà, faute de date en colonne A), donc un fichier qui la porte se recolle dans un onglet vide et **redonne `Franco_Louange`**. Format : séparateur **virgule** (celui que `parseCSV` sait relire, l. 11-32), **UTF-8 avec BOM** (sinon Sheets et Excel abîment les accents), guillemets seulement autour des cases contenant une virgule, dates en **`JJ/MM`** — la graphie du Sheet, celle que `parseDate` lit l. 58-60 —, cases vides **vides** et non « — », colonne « Sainte cène » présente seulement si une case de la plage est remplie (même règle que la page Culte, l. 46-50). Nom du fichier : `Culte_Franco_2026-10-01_2026-12-27.csv`. Généré **dans le navigateur** à partir des lignes déjà chargées : aucune route, aucun coût serveur. **Le test est l'aller-retour** : exporter, relire le fichier avec `parseCSV` + `fetchCulte`, retrouver les mêmes lignes. |
| D6 | **Un droit retiré en cours de saisie : c'est le serveur qui tranche, et l'écran le dit.** Aucun écouteur temps réel n'existe dans ce projet (REST seul) : le client ne saura rien avant sa prochaine écriture, qui sera **refusée par `firestore.rules`**. La case revient alors à sa valeur précédente et une ligne s'affiche : « Tu n'as plus le droit de modifier ce planning. » avec un bouton « Recharger » ; au rechargement, `useProfile` rapporte le `plannings` à jour et la grille est en lecture seule. Ce qui a été écrit avant le retrait **reste écrit** et figure dans l'historique à son nom. Pas de sondage périodique, pas de verrou : le refus du serveur est l'information. |
| D7 | **La règle de publication par trimestre survit à la grille continue**, appliquée **ligne par ligne** au lieu d'onglet par onglet : un dimanche dont `getTri(date)` désigne un trimestre futur non publié est **retiré des lignes** pour les membres, et montré aux publieurs avec le badge « Non publié » existant (`planning.unpublishedTooltip`). `triVisibilities` et `getPublishedQuarters` ne changent pas ; seul leur consommateur change. Sans cela, supprimer les onglets de trimestre publierait tout le monde d'un coup. |
| D8 | **Une entrée d'historique par passage, pas par case.** Même règle que les setlists (`SAME_PASS_MS`, 15 minutes, même personne) : Christelle qui remplit un trimestre laisse **une** entrée listant ses cases, pas trois cents. L'import initial en laisse **une** (« Christelle a importé le planning depuis le Google Sheet — 52 dimanches »). Les changements sont **stockés en données** et les phrases construites à l'affichage, comme `HistoryChange` (l. 20-41), pour qu'elles existent en français et en 中文. Aucune purge : l'historique des setlists n'en a pas non plus. |
| D9 | **Nouveau composant `PlanningGrille`, `PlanningTable` intact.** `PlanningTable` sert **sept** onglets (Culte, Table, Groupes, EDD, Campus, Intergroupe, Interfranco) et une suite de tests (`tests/look-planning.spec.ts`). Lui ajouter colonne figée, grille continue, bandeau et édition le rendrait dangereux pour six écrans qui ne demandent rien. La grille reprend de lui ce qui a fait ses preuves — « Mon prénom » mémorisé, « Mes dates », séparateurs de mois, pastille « Cette semaine », badge Sainte Cène, cartes sur téléphone — et le laisse en place. La tranche 3 fera l'inverse : les onglets restants passeront à `PlanningGrille`, et `PlanningTable` deviendra supprimable — **signalé ce jour-là, pas supprimé ici**. |
| D10 | **`plannings` ne se confond pas avec `notify`.** Publier un trimestre (et notifier) reste gouverné par `notify` via `canPublishPlanning` (`releases.ts` l. 49-55) ; **écrire dans les cases** est gouverné par `plannings`. Deux gestes différents, deux droits : Christelle peut écrire sans avoir le droit de notifier toute l'église, et réciproquement. Les admins ont les deux. |
| D11 | **L'horaire du bandeau est une donnée en dur du planning**, à côté de ses colonnes : il n'existe nulle part dans le code aujourd'hui (vérifié le 18/09/2026, aucun « 13h », aucun « 10:30 » dans `src/app/planning`) — il ne vit que dans la ligne d'en-tête du Sheet (« GROUPE PAIX · Janvier à Mars 2026 · Dimanche de 13h à 14h30 »). Écrit **« 10:30 »**, jamais « 10h30 » (règle du site, écartée le 17/09/2026). |
| D12 | **L'autocomplétion est une `datalist` native, pas un composant.** La liste = `collectPlanningNames(data)` (`names.ts` l. 122-149, déjà écrit) ∪ les `planningName` des comptes. Une `datalist` **suggère sans contraindre** : la saisie libre reste possible sans un seul réglage, ce qui est exactement T5. Aucune bibliothèque, aucun menu maison à rendre accessible au clavier. |

## Objectif

1. Le planning du Culte Franco s'affiche **dans l'app comme dans le Sheet** :
   mêmes colonnes, même ordre, grille complète sur ordinateur et tablette,
   une carte par dimanche sur téléphone, colonne des dates **figée**.
2. **Qui l'admin a désigné, et lui seul, écrit dedans**, case par case, dans le
   navigateur, sans passer par Google ; tous les autres lisent.
3. Chaque modification laisse une **ligne d'historique nommée**.
4. Le planning de 2026 **entre dans l'app** par un bouton d'administration
   rejouable, et en **ressort en CSV** recollable dans le Sheet de Christelle.
5. **Rien d'autre ne bouge** : « Ce dimanche », « Mes services », les rappels,
   les setlists et les 7 autres plannings continuent exactement comme avant.

Réussite, vérifiable en local : sur `/planning/culte`, un membre sans droit voit
la grille des trois mois à venir, fait défiler horizontalement sans perdre la
colonne des dates, et ne voit **aucun** champ de saisie ; un admin coche
« Culte Franco » sur le profil de Christelle ; Christelle clique la case Piano du
4 octobre, tape « Esther C. » proposée par l'autocomplétion, sort du champ, et la
case est encore là après rechargement **et** dans un autre navigateur ; le
panneau « Historique » affiche « Christelle a remplacé Eva Y. par Esther C. au
piano du 4 octobre » ; elle tape « Pasteur ZHOU », nom sans compte : la case
s'écrit, aucune notification ne part, et le nom apparaît dans « Planning sans
compte » de l'administration ; le bouton d'import écrit les 52 dimanches de 2026,
relancé il n'en écrit aucun de plus et n'écrase pas la case du 4 octobre ; le CSV
exporté, relu par `parseCSV` puis `fetchCulte`, redonne exactement les lignes
affichées ; l'admin décoche Christelle, sa modification suivante est refusée et
l'écran le lui dit ; sur téléphone, le 4 octobre est une carte lisible sans
défilement horizontal.

## Modèle

### La grille

`plannings/{key}/dimanches/{AAAA-MM-JJ}` — le document parent n'est jamais écrit
(comme `harmonie/{slug}`).

| Champ | Type | Sens |
| --- | --- | --- |
| `date` | `string` | `AAAA-MM-JJ`, recopié pour lire sans découper le nom du document |
| une clé **par colonne** (`presidence`, `choriste1`, `choriste2`, `piano`, `guitare`, `batterie`, `sono`, `ppt`, `orateur`, `traduction`, `sainteCene`) | `string` | texte de la case, `""` si vide ; **jamais un tableau** — une case du Sheet est une chaîne, et `splitNames` sait déjà y lire plusieurs noms |
| `modifieLe` | `string` | ISO, écrit avec chaque case |
| `modifiePar` | `string` | nom affiché de la dernière personne à avoir écrit (pour l'infobulle de la case) |

### Les colonnes, en dur

`src/lib/planning/grilles.ts` (module **pur**, aucune dépendance Firebase) :

```ts
export type ColonneGrille = { cle: string; i18n: string; index: number };
export type DefinitionGrille = {
  key: string;            // "culte", "paix"… — mêmes clés que PUBLISHABLE_PLANNINGS
  i18nTitre: string;      // "planning.pages.culte"
  i18nHoraire: string;    // "planning.horaires.culte" → « Dimanche 10:30 »
  couleur: string;        // PLANNING_COLORS.culte — aucune couleur nouvelle
  colonnes: ColonneGrille[];
};
```

- `index` est **la position dans la ligne rendue par `fetchCulte`** : c'est lui
  qui garantit que grille et Sheet produisent le même tableau, et il est
  directement comparable à `CULTE_ROLES` (`names.ts` l. 100-104). Un test compare
  les deux listes, comme le lot 9 compare les règles des docs et du code.
- Les libellés réutilisent `planning.roles.*`, déjà traduits en 中文
  (`src/locales/zh-CN.json` : 司会, 和声 1, 钢琴, 吉他, 架子鼓, 音控, 投影,
  讲员, 翻译, 圣餐). **Rien à traduire côté colonnes.**

### Lecture et écriture

`src/lib/planning/grille.ts` :

- `fetchGrille(key, debut, fin): Promise<string[][]>` — `runQuery` REST **sans
  jeton** sur la sous-collection `dimanches`, borné par `date`, rendu **dans la
  forme de `fetchCulte`** (date ISO puis les cases dans l'ordre des `index`),
  trié, avec le **même cache mémoire de 5 minutes** que `fetchSheet` (l. 67-83)
  et le même repli sur le dernier cache en cas d'échec réseau.
- `ecritDansLApp(key)` — `PLANNINGS_APP.includes(key)`. Tranche 2 : `["culte"]`.
- `fetchCulte()` (`sheets.ts`) devient : `ecritDansLApp("culte")` → grille ;
  vide → lecture `Franco_Louange` comme aujourd'hui. **Signature inchangée.**

`src/lib/firebase/planningGrille.ts` (client, jeton obligatoire) :

- `ecrireCase(key, date, colonne, valeur)` — PATCH
  `?updateMask.fieldPaths=<colonne>&updateMask.fieldPaths=modifieLe&updateMask.fieldPaths=modifiePar&updateMask.fieldPaths=date`,
  patron de `programmes.ts` l. 84-87. Le document se crée s'il n'existe pas.

### Les droits

`src/types/user.ts` gagne un champ, sur le modèle exact de `annonces` (l. 52-55)
et `notify` (l. 56-59) :

```ts
/** Plannings que la personne peut remplir dans l'app (clés de PLANNINGS,
 *  ex. « culte ») — attribué par les admins uniquement, planning par planning
 *  (lot 17). Absent = aucun. Cf. canEditPlanning (src/lib/access.ts). */
plannings?: string[];
```

Miroir client (`src/lib/access.ts`), en double comme le veut le CLAUDE.md :

```ts
/** Remplir les cases d'un planning : les admins, et les profils dont
 *  `plannings` contient sa clé. Ne donne pas le droit de PUBLIER un trimestre
 *  (canPublishPlanning, lib/planning/releases.ts, qui dépend de `notify`).
 *  Miroir serveur : plannings/{key}/dimanches dans firestore.rules. */
export function canEditPlanning(
  user: { email?: string | null } | null,
  profile: { plannings?: string[] } | null,
  key: string
): boolean {
  return isAdminUser(user) || (profile?.plannings ?? []).includes(key);
}
```

Règle proposée (`firestore.rules`) :

```
// Planning rempli dans l'app (lot 17, docs/spec-planning-grille.md). Un
// document par dimanche, une case par champ : une écriture ne porte que sur
// sa colonne (updateMask), donc deux personnes ne s'effacent jamais.
// Lecture PUBLIQUE, comme planningReleases : les pages planning se consultent
// sans compte, et le CSV gviz du Google Sheet l'est déjà aujourd'hui.
// Écriture : les admins, et les profils dont `plannings` porte la clé.
// Miroir client : canEditPlanning (src/lib/access.ts).
function peutEcrirePlanning(key) {
  return isAdmin() || (hasProfile() && key in profile().get('plannings', []));
}

match /plannings/{key} {
  allow read: if true;
  allow write: if false;

  match /dimanches/{date} {
    allow read: if true;
    allow create, update: if peutEcrirePlanning(key)
      && request.resource.data.date == date;
    allow delete: if false;
  }

  // Historique nommé : lu par tout connecté, écrit par qui peut remplir,
  // sous son propre nom et sur ses propres entrées (patron de
  // setlists/{id}/history).
  match /history/{entryId} {
    allow read: if signedIn();
    allow create: if peutEcrirePlanning(key)
      && request.resource.data.authorUid == request.auth.uid;
    allow update: if peutEcrirePlanning(key)
      && resource.data.authorUid == request.auth.uid
      && request.resource.data.authorUid == request.auth.uid;
    allow delete: if false;
  }
}
```

Et, à la création d'un profil (l. 67-73), une ligne de plus dans la même
liste : `request.resource.data.get('plannings', []) == []`.

### L'historique

`plannings/{key}/history/{entryId}` — mêmes champs que
`setlists/{id}/history` : `authorUid`, `authorName`, `at`, `changes`.

```ts
// src/lib/planning/historique.ts — module PUR, comme lib/setlist/history.ts
export type ChangementGrille =
  | { kind: "case"; date: string; colonne: string; from: string; to: string }
  | { kind: "import"; dimanches: number };
```

- `authorName` = `historyAuthor(profile)` (`setlistHistory.ts` l. 70-78),
  **réutilisé tel quel** : le nom de planning d'abord, sinon prénom + initiale.
- Regroupement : `SAME_PASS_MS` (15 min) et `newEntryId` repris du même fichier.
- Phrases construites à l'affichage, jamais stockées :
  FR « {{auteur}} a remplacé {{avant}} par {{apres}} au {{colonne}} du
  {{date}} », « {{auteur}} a mis {{apres}} au {{colonne}} du {{date}} » (case
  vide au départ), « {{auteur}} a effacé le {{colonne}} du {{date}} ».

## Écrans

### Onglet Culte Franco (`/planning/culte`)

Bandeau, puis grille continue. Le bandeau remplace les quatre pilules de
trimestre :

> **Culte Francophone** · Octobre à Décembre 2026 · Dimanche 10:30

- **Période affichée** : les 3 mois à venir à partir du dimanche en cours
  (`currentSundayStr`, `utils.ts` l. 62-68). « Voir plus tôt » et « Voir plus
  tard » élargissent d'un trimestre chacun, sans recharger la page ; le libellé
  du bandeau suit (`moisName`, l. 42-44, déjà localisé).
- **Colonne des dates figée** (`position: sticky; left: 0`) avec le fond de la
  ligne, pour qu'elle ne soit pas traversée par les cases au défilement.
- Conservés de `PlanningTable` : champ « Mon prénom » mémorisé sur l'appareil,
  filtre « Mes dates », séparateurs de mois, pastille « Cette semaine », badge
  « Sainte Cène » sur le premier dimanche du mois.
- **Téléphone** : une carte par dimanche, en-tête coloré avec la date, puis une
  ligne par colonne remplie — la forme que `PlanningTable` a déjà (l. 192-234).
  Les colonnes vides ne s'affichent pas ; en mode modification, elles
  s'affichent toutes, pour pouvoir les remplir.

| Cas | Ce qu'on voit |
| --- | --- |
| Sans compte, ou membre sans droit | la grille, aucun champ, aucun bouton |
| Trimestre futur non publié | rien pour les membres ; les lignes avec le badge « Non publié » pour les publieurs (règle d'aujourd'hui, D7) |
| Avec le droit, mode lecture | la grille et un bouton **« Modifier »** |
| Avec le droit, mode modification | chaque case devient cliquable ; cliquée, elle devient un champ avec autocomplétion ; **Entrée** ou sortie du champ enregistre, **Échap** annule |
| Case en cours d'enregistrement | la case grisée une fraction de seconde, puis un discret **« Enregistré »** |
| Écriture refusée | la case reprend sa valeur d'avant, et sous la grille : « Tu n'as plus le droit de modifier ce planning. » + **« Recharger »** (D6) |
| Hors ligne | même message, « Modification impossible : pas de réseau. » |
| Panneau **« Historique »** | replié sous la grille, entrées les plus récentes d'abord, nom et phrase |

Ce que la grille **n'a pas** : aucun bouton « je me retire », aucune
réservation, aucune demande d'échange (T3). Un pied de grille rappelle la
règle : « Pas disponible un dimanche ? Préviens la personne qui tient le
planning. »

### Administration (`/admin`)

- Sur la fiche d'un profil, un **quatrième bloc** de cases à cocher, entre les
  pôles (l. 823-851) et les annonces (l. 853-880), rigoureusement dans le même
  style : **« Peut remplir les plannings : »** avec une pastille par planning,
  teintée de sa couleur `PLANNING_COLORS`.
- Onglet Planning : un bouton **« Importer le planning du Culte depuis le Google
  Sheet »**, à côté de « Migrer les annonces » (l. 669-686), avec le même
  `window.confirm` et le même compte rendu : « 52 dimanches importés, 0 déjà
  présents. 6 noms sans compte : Pasteur ZHOU, Belka, Hewei… ».
- La carte **« Planning sans compte »** (l. 939-968) n'est pas touchée : elle
  part de `collectPlanningNames(planningData)`, donc elle liste les noms de la
  grille **dès que la source bascule**, sans une ligne de code.

### Ailleurs

- **« Ce dimanche »** (`/planning`), **« Mes services »**, les rappels, les
  setlists : **aucun changement visible**. La ligne du Culte vient de la grille
  au lieu du Sheet ; la forme est la même.

## Ce qui sera construit — trois tranches, six lots

### Tranche 1 — La grille en lecture (risque nul)

**G1 · `PlanningGrille`.** `src/lib/planning/grilles.ts` (définitions, pur) ;
`src/components/planning/PlanningGrille.tsx` (bandeau, grille continue, colonne
figée, « Voir plus tôt / plus tard », cartes téléphone, reprises de
`PlanningTable`) ; `src/app/planning/culte/page.tsx` bascule dessus et applique
la publication **ligne par ligne** (D7) ; libellés FR et 中文
(`planning.grille.*`, `planning.horaires.*`). **La source reste le Google Sheet.
Christelle continue d'écrire dans Google.**

### Tranche 2 — L'écriture, sur le seul Culte Franco

**G2 · Droits et modèle.** `plannings?: string[]` dans `src/types/user.ts` ;
`canEditPlanning` dans `src/lib/access.ts` ; règles Firestore (grille +
historique + `plannings == []` à la création) **à publier dans la console** ;
bloc de cases à cocher dans `/admin` ; `src/lib/planning/grille.ts`
(`fetchGrille`, `ecritDansLApp`) et `src/lib/firebase/planningGrille.ts`
(`ecrireCase`).

**G3 · Écriture case par case.** Mode « Modifier » dans `PlanningGrille` ;
champ avec `datalist` (D12) ; enregistrement à la sortie du champ ; messages de
refus (D6) ; `src/lib/planning/historique.ts` (pur) +
`src/lib/firebase/planningHistorique.ts` (écriture, regroupement 15 min) ;
panneau « Historique ».

**G4 · Import et export.** `/api/admin/importer-planning` (POST `{ key, year }`,
`ADMIN_EMAILS` vérifié, Admin SDK, saute les dimanches déjà présents, rend
`{ importes, ignores, nomsNonRattaches }`), bouton dans `/admin`, une entrée
d'historique « import » ; `src/lib/planning/csv.ts` (pur, `versCSV(lignes,
definition)`) et bouton **« Exporter en CSV »** dans la grille.

**G5 · Bascule de la source.** `PLANNINGS_APP = ["culte"]` ; `fetchCulte` lit la
grille puis le Sheet en repli ; `CULTE_FALLBACK` retiré du Culte (D4) ; le cron
et les dix appelants **ne changent pas**. Fait **en dernier**, après un import
vérifié à l'œil : jusque-là, rien ne dépend de l'app.

### Tranche 3 — Les autres plannings

**G6 · Le reste**, seulement **après trois dimanches sans incident** : une
définition par planning dans `grilles.ts`, les onglets restants passent à
`PlanningGrille`, `PLANNINGS_APP` s'allonge, `PlanningTable` devient supprimable
(signalé, pas supprimé). Les onglets fragiles `Paix _T2`, `Bonté _T3` et
l'heuristique `inferYear` disparaissent alors d'eux-mêmes.

## Libellés nouveaux (FR / 中文)

| Clé | FR | 中文 |
| --- | --- | --- |
| `planning.grille.modifier` | Modifier | 修改 |
| `planning.grille.termine` | Terminé | 完成 |
| `planning.grille.enregistre` | Enregistré | 已保存 |
| `planning.grille.plusTot` | Voir plus tôt | 查看更早 |
| `planning.grille.plusTard` | Voir plus tard | 查看更晚 |
| `planning.grille.aVenir` | Planning à venir | 服事表待定 |
| `planning.grille.pasDispo` | Pas disponible un dimanche ? Préviens la personne qui tient le planning. | 某个主日无法服事？请联系负责排表的同工。 |
| `planning.grille.droitRetire` | Tu n'as plus le droit de modifier ce planning. | 你已没有修改此服事表的权限。 |
| `planning.grille.horsLigne` | Modification impossible : pas de réseau. | 无法修改：网络不可用。 |
| `planning.grille.recharger` | Recharger | 重新加载 |
| `planning.grille.exporter` | Exporter en CSV | 导出 CSV |
| `planning.grille.historique` | Historique des modifications | 修改记录 |
| `planning.grille.remplace` | {{auteur}} a remplacé {{avant}} par {{apres}} au {{colonne}} du {{date}} | {{auteur}} 把 {{date}} 的{{colonne}}从 {{avant}} 改为 {{apres}} |
| `planning.grille.ajoute` | {{auteur}} a mis {{apres}} au {{colonne}} du {{date}} | {{auteur}} 把 {{apres}} 安排在 {{date}} 的{{colonne}} |
| `planning.grille.efface` | {{auteur}} a effacé le {{colonne}} du {{date}} | {{auteur}} 清空了 {{date}} 的{{colonne}} |
| `planning.grille.importe` | {{auteur}} a importé le planning depuis le Google Sheet ({{n}} dimanches) | {{auteur}} 从 Google 表格导入了服事表（{{n}} 个主日） |
| `planning.horaires.culte` | Dimanche 10:30 | 主日 10:30 |

Les noms de colonnes réutilisent `planning.roles.*`, déjà traduits. Aucune
couleur nouvelle : `PLANNING_COLORS.culte` suffit (fichier gelé).

## Tests (Playwright, trois appareils, écrits avant le code)

Dans `tests/planning-grille.spec.ts`. Les suites existantes
(`planning-accueil`, `planning-sainte-cene`, `planning-petit-dej`,
`look-planning`, `rappels-regroupes`) doivent **rester vertes** — c'est la
preuve que la forme n'a pas bougé.

- **Définitions** (pur) : les `index` des colonnes du Culte correspondent
  exactement à `CULTE_ROLES` (`names.ts` l. 100-104) ; onze colonnes plus la
  date ; aucune couleur hors `PLANNING_COLORS`.
- **Grille en lecture** : les colonnes sont dans l'ordre du Sheet ; la colonne
  des dates reste visible après un défilement horizontal (ordinateur et
  tablette) ; sur téléphone, une carte par dimanche et **aucun défilement
  horizontal de page** ; « Voir plus tôt » ajoute des dimanches antérieurs ; le
  bandeau nomme la période et l'horaire ; « Mes dates » filtre encore ; la
  pastille « Cette semaine » et le badge « Sainte Cène » sont là. Captures
  regardées à l'œil sur les trois appareils.
- **Publication (D7)** : un dimanche d'un trimestre futur non publié est absent
  pour un membre, présent avec « Non publié » pour un publieur ; le trimestre
  courant est toujours là.
- **Droits** (pur, `canEditPlanning`) : admin partout ; profil avec
  `plannings: ["culte"]` sur le Culte seulement ; profil sans le champ, nulle
  part ; `notify` ne donne **pas** le droit d'écrire, `plannings` ne donne
  **pas** le droit de publier (D10).
- **Écriture** : sans droit, aucun bouton « Modifier » et aucune case cliquable ;
  avec le droit, une case s'écrit, tient après rechargement, et la case voisine
  **n'est pas touchée** (deux écritures successives sur la même ligne) ; un nom
  libre s'écrit ; Échap annule ; la `datalist` propose les noms du planning et
  des comptes.
- **Droit retiré en cours de route (D6)** : écriture refusée → la case revient à
  sa valeur, le message et « Recharger » s'affichent, ce qui a été écrit avant
  reste.
- **Historique** (pur + écran) : un remplacement, une mise à jour d'une case
  vide, un effacement donnent les trois phrases, avec le **nom de planning** de
  l'auteur ; deux cases modifiées à moins de 15 minutes par la même personne
  font **une** entrée ; par deux personnes, **deux** entrées ; phrases en FR et
  en 中文.
- **Import** (pur + route) : le rattachement par `normalizeName` apparie
  « Chloé W. » et « Chloe W » ; les noms sans compte ressortent ; relancer
  n'écrit rien de plus et **n'écrase pas** une case modifiée entre-temps ;
  l'import laisse une seule entrée d'historique.
- **Export (D5)** : `versCSV` met la ligne de titres, des dates `JJ/MM`, des
  cases vides vides, des guillemets seulement autour d'une case contenant une
  virgule ; la colonne Sainte cène n'apparaît que si elle est remplie ;
  **aller-retour** : `parseCSV(versCSV(lignes))` relu comme `fetchCulte` redonne
  les mêmes lignes.
- **Bascule de source (G5)** : grille pleine → `fetchCulte` rend ses lignes ;
  grille vide → `fetchCulte` rend celles du Sheet ; dans les deux cas
  `findMyServices`, `servantsForDate` et `setlistSeances` rendent **exactement
  la même chose** qu'avec le Sheet seul (comparaison ligne à ligne).
- **Ce dimanche / Mes services / rappels** : une case écrite dans l'app apparaît
  dans « Ce dimanche », dans « Mes services » et dans `reminderServicesFor`
  pour le compte rattaché ; un nom libre **n'y apparaît pas** et **ne déclenche
  aucune notification**.

## Hors périmètre

- **Toujours** : les dix appelants de `loadPlanningData` ne changent pas ; FR +
  中文 ; trois appareils ; une seule notification par personne et par jour
  (règle du lot 1c) ; les colonnes en dur.
- **Demander avant** : un éditeur de colonnes (T7 dit le contraire) ; une
  demande d'échange ou un bouton « je ne suis pas dispo » (T3 dit le contraire) ;
  un modèle de rotation qui proposerait les noms tout seul ; une notification à
  la personne qu'on vient d'inscrire dans une case ; l'écriture des 7 autres
  plannings avant les trois dimanches sans incident (T1) ; une purge de
  l'historique.
- **Jamais** : écrire dans le Google Sheet depuis l'app (l'export CSV est le
  seul chemin de retour) ; une fenêtre de conflit (écarté le 18/09/2026, Q28) ;
  une couleur nouvelle dans `src/lib/serviceColors.ts` (gelé) ; un neuvième
  onglet de planning (Q26) ; supprimer un dimanche de la grille
  (`allow delete: if false` — on vide les cases, on ne perd pas l'historique) ;
  laisser `CULTE_FALLBACK` de 2026 s'afficher comme un planning à jour.

## Commandes

```bash
npm test -- tests/planning-grille.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

Rien n'est codé : la forme est validée (planche du 18/09/2026), la spec attend
le go de Timothée.
