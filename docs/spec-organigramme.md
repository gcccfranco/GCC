# Spec : organigramme, source des pôles (lot 16)

Demande de Timothée, 18/09/2026 (en listant ce qu'il reste à faire) :

> « Est ce que tu peux faire en sorte que le planning qu'on fait sur le site ait
> la même apparence que le google sheet qu'on a aujourd'hui. Et aussi avoir un
> organigramme et tout ? »

Demande de Christelle, 18/09/2026 (conversation WhatsApp de la nuit) :

> « selon le profil si on est “interne” bah on peut ajouter des taches fin voir
> la vue back office/outil »

Statut : **tranché le 18/09/2026 (feuille de route, lot 16) ; spec écrite,
rien n'est codé — le lot attend le go de Timothée.**

## Ce que le code montre (18/09/2026)

- **Les pôles existent déjà, au nombre de cinq.** `POLES` (`src/types/user.ts`
  l. 36) vaut `da`, `media`, `orga`, `evenement` ; `TACHE_POLES`
  (`src/types/tache.ts` l. 6) y ajoute `louange`. Les libellés sont dans
  `POLE_LABELS` (`user.ts` l. 38) et traduits sous `taches.pole.*`
  (`src/locales/fr.json` l. 1639-1645, `zh-CN.json` l. 1639-1645).
- **`louange` n'est jamais stocké** : `polesDe` (`src/lib/access.ts` l. 37-42)
  le rajoute dès que `serviceRoles` n'est pas vide, et `firestore.rules`
  l. 104-109 (`isTachePole`) fait exactement la même chose côté serveur. C'est
  le précédent d'un pôle **dérivé** : le lot 16 s'y range au lieu de le défaire.
- **Le pôle se coche à la main, profil par profil** : bloc « Pôles (Louange :
  automatique avec un rôle de service) » dans `src/app/admin/page.tsx`
  l. 823-851, enregistré dans `users/{uid}.poles` (`user.ts` l. 62) par
  `saveEdit` (l. 223). C'est le geste que le lot supprime.
- **Seul un admin peut écrire un profil** : `firestore.rules` l. 75
  (`allow update: if isAdmin()`), et la création interdit de s'attribuer un
  pôle (l. 72, `poles == []`). Toute écriture de `poles` par quelqu'un d'autre
  demanderait une route serveur.
- **`serviceRoles` ne porte pas l'instrument.** `ServiceRole` vaut
  `chanteur` / `musicien` / `presidence` / `regie` (`user.ts` l. 1). L'instrument
  est dans les colonnes Piano / Guitare / Batterie des plannings — c'est écrit
  noir sur blanc dans `canUseHarmonie` (`access.ts` l. 150-166 : « L'instrument
  n'est pas dans le profil »), et `findMyServices` (`src/lib/planning/names.ts`
  l. 244) rend ces rôles-là (`CULTE_ROLES` l. 100-104 : `[4, "Piano"]`,
  `[5, "Guitare"]`, `[6, "Batterie"]`). **La matrice des musiciens se calcule
  donc depuis deux sources déjà lues, pas une** — voir D6.
- **Le rattachement nom du Sheet → compte existe déjà** : `planningName`
  (`user.ts` l. 45), `normalizeName` (`names.ts` l. 76-78, plie accents, casse
  et ponctuation), et la carte « Planning sans compte » de l'administration
  (`admin/page.tsx` l. 152 pour le calcul, l. 939-968 pour l'affichage). Le lot
  16 réutilise les trois tels quels.
- **Le modèle du bouton d'import existe** : « Migrer les annonces vers le
  calendrier » (`admin/page.tsx` l. 182-192 et 669-686) appelle
  `/api/admin/migrer-annonces` (route serveur, `ADMIN_EMAILS` vérifié,
  Admin SDK, identifiant fixe `annonce-{id}` donc rejouable sans doublon).
- **L'onglet ORGANIGRAMME n'est pas lu.** `fetchSheet` (`sheets.ts` l. 71-84)
  interroge le classeur **par nom d'onglet** (`BASE_URL`, l. 5, gviz), avec un
  cache mémoire de 5 minutes et un repli sur le dernier cache. Vérifié le
  18/09/2026 : `fetchSheet("ORGANIGRAMME")` répond, sur le même `SHEET_ID`
  (l. 4) que les 8 onglets de planning. Rien d'autre à brancher.
- **La page *Moi* est une liste de lignes** (`src/app/moi/page.tsx` l. 51-59) :
  « Mes services », « Mes tâches » (affichée seulement si `polesDe` n'est pas
  vide), « Profil ». Une ligne de plus ne coûte rien.
- **Il n'existe aucune fiche publique de personne** : le seul écran qui montre
  un membre est `/admin`, réservé aux admins.

## Ce que l'onglet ORGANIGRAMME contient (relevé le 18/09/2026)

85 lignes, 18 colonnes. Des blocs posés côte à côte, pas un tableau :

- **13 équipes**, repérables par une cellule qui commence par `TEAM ` (ou vaut
  `COMITÉ FRANCO`) : ORGA (l. 3), COMITÉ FRANCO (l. 3, col. 9), DA, MÉDIAS,
  DÉVELOPPEMENT (l. 8), RÉGIE, TRADUCTION, THÉOLOGIE (l. 12), ÉVÉNEMENTIEL,
  DÉCORATION, ACCUEIL J1 (l. 17), LOUANGE (l. 20), EDD (l. 28).
- Le nom d'équipe porte parfois **un sous-titre** après un tiret cadratin
  (« TEAM DA — Direction Artistique », « TEAM MÉDIAS - Photo, Vidéo ») et
  parfois **son référent dans la même cellule**, séparé par une longue suite
  d'espaces : « TEAM LOUANGE (FRANCO / INTER)           Jonathan Z. — Référent ».
- Un membre s'écrit `Nom` ou `Nom — mention` : « Charlie L. — Référente »,
  « Stéphane Z. — Prés. Paix », « Christelle C. — Orga/Inscriptions »,
  « Jonathan Z. — Salle & Petit-déj. ».
- **« (en essai) »** en suffixe : Justine C. (DA), Mathys S. (Régie),
  Karémy X. (Choristes), Maëlice D. (Batterie).
- LOUANGE et EDD ont des **sous-colonnes** (Présidences · Choristes ·
  Pianistes · Guitaristes · Batteu(r/se) ; Professeurs louange · Professeurs
  cours · Pianistes · Guitaristes · Cajon).
- Graphies **fragiles**, à connaître avant d'écrire le rattachement :
  trois noms sans initiale (« Stéphane — Référent », « Karémy — Orga/Zoom »,
  « Isabelle »), des noms en caractères chinois (周小秋, 翁云丹, 徐欢乐), un
  double espace avant « (en essai) », et **« Kitty S. » dans la matrice contre
  « Ketty S. » dans TEAM LOUANGE** — la même personne, deux orthographes.
- Enfin, l. 56-85, **« TEAM MUSICIENS — vue d'ensemble (quand ils jouent,
  d'après ROLES_PAR_GROUPE) »** : 28 noms × 8 colonnes (Paix, Bonté, Fidélité,
  Campus, EDD, Franco, Intergroupe, Interfranco), cases « Chant », « Piano »,
  « Guit. », « Batt. », parfois deux (« Batt., Piano »). Son en-tête le dit
  lui-même : **c'est déjà un calcul**, fait à la main depuis un autre onglet.

## Décisions déjà tranchées (Timothée, 18/09/2026) — à ne pas rouvrir

| # | Décision |
| --- | --- |
| T1 | L'organigramme est **tenu dans l'app**, pas une image ni une lecture en direct du Sheet : c'est une **donnée**. |
| T2 | Placer quelqu'un dans une équipe **lui donne le pôle correspondant** : fin du cochage à la main sur chaque profil. |
| T3 | La matrice TEAM MUSICIENS n'est **pas ressaisie** : elle est **calculée**, cases cliquables vers la fiche de la personne. |
| T4 | Entrée **« Équipes » dans *Moi***, pas un onglet de Planning (le Planning reste à 8 onglets, Q26). |
| T5 | **Import initial par bouton d'administration**, sur le modèle de la migration des annonces : lit l'onglet ORGANIGRAMME, rattache par `planningName`, **affiche les noms non rattachés**, rejouable sans doublon. |

## Décisions à trancher — recommandations

| # | Question | Recommandation |
| --- | --- | --- |
| D1 | 13 équipes contre 5 pôles : créer des pôles ? | **Non. Aucun pôle nouveau.** L'équipe est un **niveau à part** (`equipes/{id}`), et chaque équipe **désigne** un pôle existant, ou aucun. Un pôle de plus, c'est un onglet de plus dans *Tâches*, une audience de plus pour les réunions de pôle (`pour: "pole:<id>"`, `firestore.rules` l. 152), une cible de plus dans les rappels du cron, et deux libellés dans chaque langue — pour des équipes de deux ou trois personnes qui n'ont aucune tâche. Si la Traduction réclame plus tard son tableau, on ajoute son pôle ce jour-là : une ligne dans `TACHE_POLES` et deux libellés. |
| D2 | Quelle correspondance équipe → pôle ? | Voir le tableau **« Les 13 équipes »** ci-dessous. Cinq équipes donnent un pôle (ORGA, COMITÉ FRANCO → `orga` ; DA, DÉCORATION → `da` ; MÉDIAS → `media` ; THÉOLOGIE → `orga` ; ÉVÉNEMENTIEL, ACCUEIL J1 → `evenement`) ; les autres n'en donnent aucun. **DÉCORATION et THÉOLOGIE sont les deux à confirmer d'un coup d'œil** : la décoration sert surtout les évènements, et la Théologie n'est qu'une équipe d'organisation de cours. |
| D3 | LOUANGE, RÉGIE, EDD donnent-elles le pôle `louange` ? | **Elles ne l'écrivent jamais.** `louange` reste **dérivé** de `serviceRoles` (`access.ts` l. 40-41, `firestore.rules` l. 107) : leurs membres l'ont déjà, par leur planning. L'équipe reste affichée, elle est simplement **descriptive**. Écrire `louange` dans `poles` créerait un deuxième chemin vers le même droit — exactement la deuxième vérité qu'on veut éviter. |
| D4 | Qui modifie l'organigramme ? | **Les admins seuls, en V1**, depuis un onglet « Équipes » de `/admin`. Raison de code, pas de principe : placer quelqu'un dans une équipe écrit `users/{uid}.poles`, or `firestore.rules` l. 75 réserve l'écriture d'un profil aux admins. Ouvrir ce geste à un référent voudrait dire, soit lui donner le droit d'écrire n'importe quel profil, soit une route serveur de plus. Les 13 équipes bougent quelques fois par an. **À demander avant**, si Timothée le veut : « le référent modifie son équipe », via une route serveur. |
| D5 | Ce que voit un membre ordinaire, ce que voit un admin | **Tout membre connecté voit l'organigramme entier** — c'est l'objet de la demande — plus la matrice des musiciens, plus la fiche d'une personne. **Rien pour un visiteur sans compte** (l'écran est nominatif) : `read: if signedIn()`, comme les profils. L'admin voit **en plus** le bouton d'import, l'édition d'une équipe, les noms non rattachés et les écarts. Aucun droit d'écriture ne s'affiche à qui ne l'a pas. |
| D6 | Comment calculer la matrice, puisque `serviceRoles` ne porte pas l'instrument ? | **Deux sources, toutes deux déjà lues, aucune saisie.** La **présence** d'une case vient de `serviceRoles` (la catégorie est une clé du profil) ; le **libellé** de la case vient du planning quand il nomme l'instrument (`findMyServices` : Piano, Guitare, Batterie, Cajon, Chant, Présidence, Sono/PPT), et retombe sur « Musicien » sinon. Ce repli est visible dans le Sheet lui-même : les colonnes Campus, Paix et Bonté des plannings n'ont qu'une case « musicien », c'est un humain qui y a écrit « Guit., Piano ». Mieux vaut afficher « Musicien » que d'inventer un instrument. |
| D7 | Que devient « en essai » ? | Un **booléen par membre d'équipe**, affiché en puce discrète à côté du nom. Il **ne change aucun droit** : le pôle est donné quand même. Dans le Sheet, c'est une information d'équipe, pas une permission — Mathys S. « en essai » fait déjà la régie. En faire un demi-droit obligerait à le tester partout (tâches, réunions, notifications). |
| D8 | Une équipe inconnue à l'import ? | **Signalée, jamais créée.** Les 13 identifiants et leur pôle sont une table en dur (`EQUIPES` dans `src/lib/equipes/organigramme.ts`). Une cellule `TEAM …` qui n'y figure pas ressort dans le compte rendu (« Équipe inconnue : TEAM X — ignorée ») et rien n'est écrit. Une équipe sans pôle choisi n'aurait aucun sens pour les tâches, et une équipe fantôme se remarque moins qu'une ligne de rapport. L'admin la crée ensuite à la main s'il la veut, et choisit son pôle. |
| D9 | L'organigramme remplace-t-il le cochage, ou le double ? | **Il le remplace. Le champ reste, le geste disparaît.** `users/{uid}.poles` continue d'exister — c'est lui que lisent `polesDe` et `isTachePole`, et les règles n'ont pas à changer — mais il n'est plus **écrit qu'à un seul endroit** : l'écran Équipes, qui recalcule `poles` pour chaque personne touchée. Le bloc « Pôles » de la fiche membre (`admin/page.tsx` l. 823-851) devient un **affichage en lecture seule** : « DA · Orga — via TEAM DA, TEAM ORGA », avec un lien vers l'équipe. Dériver `poles` à la volée serait plus pur, mais obligerait `isTachePole` à parcourir les 13 équipes à chaque lecture de tâche, dans `firestore.rules`. |
| D10 | Et les pôles cochés aujourd'hui, sans équipe ? | **Rien n'est retiré en silence.** L'import ne recalcule `poles` que pour les comptes qu'il rattache ; les autres gardent leur pôle et ressortent dans le compte rendu sous « Pôle coché hors organigramme : Prénom N. (Orga) ». L'admin arbitre : soit il place la personne dans une équipe, soit il décoche — le décochage reste possible **une seule fois**, dans cette liste, jamais sur la fiche. |
| D11 | 中文 | **Les 13 noms d'équipe sont traduits**, comme les pôles le sont déjà (`taches.pole.*`) : clés `equipes.team.<id>` dans `fr.json` et `zh-CN.json`, plus les libellés d'écran (« Référent », « en essai », « Équipes », les 8 colonnes de la matrice, les instruments). **Ne sont jamais traduits** : les noms de personnes (une seule graphie, 周小秋 comme Charlie L.) et la mention libre saisie après le tiret (« Orga/Inscriptions », « Repas dim. soir ») — même règle que la prose des fiches d'harmonie. Proposition de traductions, à relire par Timothée : 统筹组 (Orga), 法语堂委员会 (Comité Franco), 美工组 (DA), 媒体组 (Médias), 开发组 (Développement), 音控组 (Régie), 翻译组 (Traduction), 神学组 (Théologie), 活动组 (Événementiel), 布置组 (Décoration), 迎新组 (Accueil J1), 敬拜组 (Louange), 主日学 (EDD). |

### Les 13 équipes

| Identifiant | Nom (Sheet) | Pôle donné | Pourquoi |
| --- | --- | --- | --- |
| `orga` | TEAM ORGA — Coordination générale | `orga` | Présidences et vice-présidences des groupes |
| `comite-franco` | COMITÉ FRANCO | `orga` | Même travail, même tableau de tâches |
| `da` | TEAM DA — Direction Artistique | `da` | Le pôle porte déjà son nom |
| `medias` | TEAM MÉDIAS - Photo, Vidéo | `media` | Idem |
| `developpement` | TEAM DÉVELOPPEMENT | aucun | Trois personnes, dont deux comptes admin ; aucune tâche de pôle |
| `regie` | TEAM RÉGIE — Sono Live & PPT | aucun (`louange` dérivé) | Ses membres ont `serviceRoles.regie`, donc déjà `louange` (D3) |
| `traduction` | TEAM TRADUCTION | aucun | Trois personnes, aucune tâche ; pôle à créer le jour où elles en demandent un |
| `theologie` | TEAM THÉOLOGIE | `orga` | Ses lignes sont « Orga/Inscriptions », « Salle & Petit-déj. », « Repas dim. soir » — de l'organisation (à confirmer) |
| `evenementiel` | TEAM ÉVÉNEMENTIEL | `evenement` | Le pôle existe pour ça (lot 3 bis, `isCoordination`) |
| `decoration` | TEAM DÉCORATION | `da` | Le décor est de la direction artistique (à confirmer : `evenement` se défend) |
| `accueil-j1` | TEAM ACCUEIL J1 (Campus) | `evenement` | Accueil d'un évènement |
| `louange` | TEAM LOUANGE (FRANCO / INTER) | aucun (`louange` dérivé) | D3 |
| `edd` | TEAM EDD — École du Dimanche | aucun (`louange` dérivé) | D3 ; les classes 中班 / 大班 / 高班 sont déjà des clés de `serviceRoles` |

## Objectif

1. **Voir l'organigramme dans l'app** : les 13 équipes avec leur référent,
   leurs membres et les « en essai », plus la vue d'ensemble des musiciens.
2. **Une seule vérité pour les pôles** : on place une personne dans une équipe,
   elle reçoit le pôle ; plus aucune case à cocher sur un profil.
3. **Une reprise du Sheet en un bouton**, rejouable, qui dit franchement ce
   qu'elle n'a pas su rattacher.

Réussite : un import lancé sur l'onglet ORGANIGRAMME du 18/09/2026 crée les
**13 équipes**, rattache les noms qu'il reconnaît et affiche les autres
(« Kitty S. » en fait partie, faute d'orthographe dans le Sheet) ; le relancer
ne crée ni équipe ni membre en double. Placer un compte dans TEAM DA depuis
l'administration lui ouvre le pôle **DA** dans *Tâches* à la connexion
suivante, **sans qu'aucune case n'ait été cochée sur son profil** ; l'en
retirer le referme. Un membre connecté ouvre *Moi → Équipes*, voit les 13
équipes et la matrice ; un clic sur la case « Piano » de la colonne Franco
ouvre la fiche de la personne. Sur téléphone, la matrice s'affiche en cartes et
la page ne défile pas horizontalement.

## Modèle

### `equipes/{id}` (nouvelle collection Firestore, 13 documents)

| Champ | Type | Sens |
| --- | --- | --- |
| `id` | identifiant fixe (`da`, `comite-franco`…) | Rejouabilité de l'import (comme `annonce-{id}`) |
| `nom` | `string` | « TEAM DA » |
| `soustitre` | `string` | « Direction Artistique », `""` si absent |
| `pole` | `Pole` · `null` | Pôle donné par l'appartenance (tableau ci-dessus) |
| `ordre` | `number` | Ordre du Sheet, pour l'affichage |
| `membres` | `MembreEquipe[]` | Liste complète, réécrite en bloc |
| `updatedAt`, `parUid`, `parNom` | | Qui a touché en dernier |

### `MembreEquipe`

| Champ | Type | Sens |
| --- | --- | --- |
| `nom` | `string` | Graphie du Sheet : « Charlie L. », « 周小秋 » |
| `uid` | `string` | `""` tant que le nom n'est pas rattaché à un compte |
| `mention` | `string` | Texte libre après le tiret : « VP Paix », « Repas dim. soir », `""` |
| `referent` | `boolean` | Vrai si la mention commence par « Réf » |
| `essai` | `boolean` | « (en essai) » |
| `groupe` | `string` | Sous-colonne de LOUANGE et EDD (« Pianistes »), `""` sinon |

### Ce qui ne change pas

- `POLES`, `POLE_LABELS`, `TACHE_POLES` : **aucun ajout**.
- `users/{uid}.poles` : même champ, même type. Seul son **auteur** change.
- `polesDe` et `isTachePole` : inchangés, y compris la dérivation de `louange`.

### Ce qui se calcule, et n'est donc stocké nulle part

- **Les pôles d'une personne** : `poles` recalculé à chaque écriture d'équipe
  comme l'union des pôles des équipes où elle figure, plus les pôles hors
  organigramme qu'elle avait déjà (D10).
- **La matrice des musiciens** : lignes = comptes avec au moins une clé de
  `serviceRoles` ; colonnes = Paix · Bonté · Fidélité · Campus · EDD · Franco ·
  Intergroupe · Interfranco (l'ordre du Sheet) ; case = les rôles du planning
  pour cette catégorie (`findMyServices` sur `planningName`), sinon le rôle de
  `serviceRoles` en toutes lettres. Aucune écriture, aucun document.

### Règles Firestore (à publier à la main, CLAUDE.md)

```
match /equipes/{id} {
  allow read: if signedIn();
  allow create, update, delete: if isAdmin();
}
```

`users/{uid}` ne bouge pas (l. 61-77) : l'écriture de `poles` reste admin,
c'est-à-dire l'écran Équipes. Miroir client : `canVoirEquipes` (connecté) et
`canEditerEquipes` (admin) dans `src/lib/access.ts`, à côté de `isCoordination`.

## Écrans

### *Moi* — une ligne

Dans le premier groupe de `src/app/moi/page.tsx`, entre « Mes services » et
« Mes tâches » : **« Équipes »**, icône `Users`, chevron, vers `/equipes`.
Visible de **tout membre connecté**, sans condition de pôle (à la différence de
« Mes tâches », l. 53).

### `/equipes` — Équipes · Musiciens

Titre « Équipes », sous-titre « Organigramme GCC Franco 2026 ». Deux onglets,
mêmes pilules que le reste du site (lot 4).

**Onglet Équipes** — une carte blanche par équipe, dans l'ordre du Sheet :
- en-tête : nom traduit, sous-titre en gris, pastille du pôle quand il y en a
  un (« Donne le pôle DA ») ;
- les référents d'abord, en gras, avec « Référent » ; puis les membres, par
  ordre du Sheet ; la mention libre en gris à la suite du nom ;
- « en essai » en petite puce ambre, comme « Planning sans compte » ;
- un nom rattaché à un compte est **cliquable** (fiche) ; un nom non rattaché
  est en texte simple, sans marque particulière — ce n'est pas au membre de
  voir la plomberie ;
- LOUANGE et EDD affichent leurs **sous-colonnes** en petits intertitres
  (Présidences, Choristes…), une colonne sur téléphone.

Une colonne sur téléphone, deux sur tablette, trois sur ordinateur.

**Onglet Musiciens** — la vue d'ensemble, calculée :
- ordinateur et tablette : le tableau 8 colonnes, en-têtes collantes, une ligne
  par personne, groupées comme le Sheet (Chant, puis Piano, Guitare, Batterie) ;
- **téléphone : une carte par personne** (nom, puis ses catégories et ce qu'elle
  y fait). Huit colonnes ne tiennent pas dans 390 px — même choix qu'au lot 17 ;
- chaque case et chaque nom ouvrent la fiche.

**Fiche d'une personne** — un panneau qui glisse (pas une route de plus, pas
une page publique de profil) : nom, ses équipes (avec « Référent », « en
essai »), ses rôles de service par catégorie, ses instruments d'après le
planning. Pour un admin seulement : « Ouvrir dans l'administration ».

### `/admin` — onglet « Équipes »

- Carte **« Organigramme → Équipes »**, écrite sur le modèle de « Annonces →
  Évènements » (l. 669-686) : une phrase d'explication, le bouton **« Importer
  l'organigramme du Sheet »**, une confirmation qui prévient que **la liste des
  membres de chaque équipe sera remplacée par celle du Sheet**, puis le compte
  rendu : « 13 équipes, 96 membres, 81 rattachés à un compte ».
- **« Noms non rattachés (15) »** : les mêmes puces ambre que « Planning sans
  compte » (l. 955-962), avec la phrase qui dit ce que ça coûte (« ces personnes
  apparaissent dans l'organigramme mais ne reçoivent rien et n'ont pas de
  pôle »).
- **« Équipes inconnues »** et **« Pôle coché hors organigramme »** : deux
  listes courtes, avec un bouton « Décocher » sur la seconde (D10).
- **Édition d'une équipe** : ajouter un membre (recherche dans les comptes, ou
  nom libre), le retirer, cocher Référent / en essai, écrire la mention, changer
  le pôle de l'équipe. Chaque enregistrement **recalcule `poles`** pour les
  comptes ajoutés et retirés.
- **Fiche membre, bloc « Pôles » (l. 823-851) : en lecture seule.** « DA · Orga
  — via TEAM DA, TEAM ORGA », chaque équipe cliquable. Plus aucune case.

## Ce qui sera construit — cinq tranches

### O1 — Modèle, lecture, règles
`src/types/equipe.ts` (`Equipe`, `MembreEquipe`), table `EQUIPES` (13 entrées :
identifiant, nom, sous-titre, pôle, ordre) dans `src/lib/equipes/organigramme.ts`,
`src/lib/firebase/equipes.ts` en REST (`listEquipes`, `saveEquipe`), `polesDesEquipes`
(union des pôles d'une personne), `canVoirEquipes` / `canEditerEquipes` dans
`access.ts`, bloc `equipes/{id}` dans `firestore.rules`.

### O2 — Import
Parseur **pur** `parseOrganigramme(rows)` dans `src/lib/equipes/organigramme.ts` :
repère les en-têtes `TEAM …` / `COMITÉ FRANCO`, délimite les blocs, sépare
`Nom — mention`, retire « (en essai) », lit le référent collé à l'en-tête,
saute les intertitres de sous-colonnes et **saute entièrement le bloc TEAM
MUSICIENS**. Puis la route `POST /api/admin/importer-organigramme` (Admin SDK,
`ADMIN_EMAILS`, sur le modèle de `migrer-annonces`) : `fetchSheet("ORGANIGRAMME")`,
rattachement par `normalizeName(planningName)` puis, à défaut, par **prénom seul
quand il ne désigne qu'un compte** (pour « Stéphane », « Karémy », « Isabelle »),
écriture des 13 documents, recalcul des `poles` rattachés, et un compte rendu
`{ equipes, membres, rattaches, nonRattaches, inconnues, polesHorsOrganigramme }`.
Carte et listes dans `/admin`.

### O3 — Page Équipes
`src/app/equipes/page.tsx` (onglet Équipes), cartes d'équipe, panneau fiche,
ligne « Équipes » dans *Moi*, libellés FR et 中文.

### O4 — Matrice des musiciens
`matriceMusiciens(profils, planning)` dans `src/lib/equipes/musiciens.ts`
(fonction pure : profils + `PlanningData` → lignes et cases), tableau sur
ordinateur et tablette, cartes sur téléphone, cases cliquables.

### O5 — Fin du cochage
Édition d'une équipe dans `/admin` avec recalcul des `poles`, bloc « Pôles » de
la fiche membre passé en lecture seule avec le renvoi vers les équipes, liste
« Pôle coché hors organigramme » et son bouton « Décocher ».

## Tests (Playwright, `tests/equipes.spec.ts`, trois appareils, écrits avant le code)

**Parseur** (fonctions pures, sur une copie figée du CSV dans
`tests/fixtures/organigramme.csv` — jamais le réseau) :
- 13 équipes trouvées, dans l'ordre, avec leur sous-titre ;
- TEAM MUSICIENS **absente** du résultat ;
- « Justine C. (en essai) » → nom « Justine C. », `essai` vrai, mention vide ;
- « Charlie L. — Référente » → mention « Référente », `referent` vrai ;
- « TEAM LOUANGE (FRANCO / INTER)           Jonathan Z. — Référent » → équipe
  `louange` **et** un référent Jonathan Z. ;
- sous-colonnes de LOUANGE et EDD reportées dans `groupe`, intertitres jamais
  pris pour des noms ;
- une ligne « TEAM XYZ » inventée ressort dans `inconnues`, sans équipe créée ;
- deux passages du même CSV donnent le même résultat, au membre près.

**Rattachement** : « Charlie L. » trouve son compte ; « Stéphane » (prénom seul,
un seul compte) le trouve aussi ; un prénom porté par deux comptes ne rattache
rien ; **« Kitty S. » reste non rattaché** et figure dans la liste.

**Pôles** : placer un compte dans TEAM DA écrit `da` dans `poles` et lui ouvre
le pôle DA dans `/taches` ; l'en retirer le referme ; TEAM LOUANGE **n'écrit
rien** et « louange » reste dérivé de `serviceRoles` ; un compte avec un pôle
coché mais aucune équipe garde son pôle et apparaît dans « hors organigramme ».

**Page** : un membre ordinaire voit les 13 équipes, la matrice, aucune commande
d'édition et aucun bouton d'import ; un admin voit les deux ; « en essai »
affiché ; un nom rattaché ouvre la fiche, un nom libre ne l'ouvre pas.

**Matrice** : une personne « Piano » au Culte Franco a « Piano » dans la colonne
Franco ; la même sans instrument nommé (Campus) a « Musicien » ; une personne
sans `serviceRoles` est absente ; sur téléphone la matrice est en cartes et
`document.body.scrollWidth` ne dépasse pas la largeur de l'écran.

**中文** : les 13 noms d'équipe, « Référent », « en essai », les 8 colonnes et
les instruments sont traduits ; les noms de personnes et les mentions libres
sont **identiques** dans les deux langues.

Trois appareils pour tous, captures regardées en 390, 820 et 1280 px.

## Hors périmètre

- **Toujours** : permissions en double (`src/lib/access.ts` **et**
  `firestore.rules`, règles à publier à la main) ; FR + 中文 ; trois appareils ;
  un seul commit pour le lot.
- **Demander avant** : ouvrir la modification aux **référents** (route serveur,
  D4) ; créer un **pôle nouveau** (Traduction, Théologie, Décoration…) ;
  calculer entièrement TEAM LOUANGE et TEAM EDD depuis `serviceRoles` au lieu de
  les tenir (aujourd'hui l'écart est **montré**, pas masqué) ; une **page
  publique de profil** ; un **export** de l'organigramme en PDF ou en image ;
  un vrai **arbre** dessiné (boîtes et traits) — ici ce sont des cartes.
- **Jamais** : ressaisir la matrice des musiciens ; stocker « louange » dans
  `poles` ; **écrire dans le Google Sheet** (l'app lit, le Sheet reste à
  Christelle) ; retirer un pôle à quelqu'un sans l'écrire à l'écran.

## Commandes

```bash
npm test -- tests/equipes.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

Rien n'est codé : la spec attend le go de Timothée.
