# Spec : les droits de gestion viennent d'une liste « Responsabilités »

Demande de Timothée du 29/10/2026 : « je veux changer parce que là c'est trop compliqué je trouve, prend ce qui
est bien dans l'artefact, puis utilise le skill grill-me ». L'artefact est la version de travail « Droits d'accès
GCC Louange » (octobre 2026, vrais noms : il reste hors du dépôt public). L'entretien a eu lieu le 29/10/2026 (skill
*grilling*, questions Q1 à Q23), et **toutes les questions sont tranchées**. Le go pour coder a été donné le même jour.

Lot **RS**. Il fait suite au lot AO (`spec-acces-organigramme.md`), dont il garde la moitié.

## Le principe en une phrase

**L'organigramme dit qui sert où ; la liste « Responsabilités » dit qui gère quoi.** Être placé par un référent
dans une sous-équipe (Louange · Culte Franco, Musiciens · piano, Régie, un groupe, l'EDD) continue de donner les
setlists qu'on voit et qu'on crée, et Harmonie, comme le lot AO l'a fait. En revanche, **plus aucun droit de
gestion ne se déduit de l'organigramme** : remplir, publier et prévenir un planning, les évènements, les
réunions, la scène, les annonces et les notifications. Ces droits viennent désormais d'une liste courte, que les
admins règlent à un seul endroit.

## Décisions (29/10/2026)

| # | Décision |
| --- | --- |
| Q1 | Un seul modèle : une liste de responsabilités, réglée à un seul endroit, à côté de l'organigramme. Les cases des profils ne donnent plus rien. |
| Q2 | Trois niveaux : **Membre**, **Responsable de …**, **Admin**. Le « +1 » des inscriptions est une fonction des évènements, à traiter dans un lot à part. |
| Q3, Q8 | Les Admins restent les trois comptes de `ADMIN_EMAILS` (`src/lib/access.ts`), identiques dans `firestore.rules`. On n'y touche pas. |
| Q9 | Trois familles de responsabilités : **Gestionnaire d'un planning** (une par planning), **Comité Orga**, **Référent d'équipe** (un ou plusieurs par équipe de l'organigramme). Rien d'autre. |
| Q5 | Un gestionnaire remplit **toute la grille** de son planning, sans découpage par colonne, et chaque planning peut avoir plusieurs gestionnaires. `COLONNES_REGIE` disparaît. |
| Q10 | **Gestionnaire d'un planning** : il remplit, publie et prévient son planning ; il crée et modifie les setlists partagées de ce service ; il notifie l'audience de ce service. |
| Q11 | **Comité Orga** : il crée, modifie et annule tous les évènements et sorties ; il crée des réunions ; il publie des annonces ; il notifie « Tous » ; il réserve la scène. Il ne gère pas la Table d'office : il faut en être gestionnaire. |
| Q12 | **Référent d'équipe** : il crée une réunion de son équipe et ajoute ou retire quelqu'un de son équipe. Rien d'autre (la scène est réservée au Comité Orga et aux gestionnaires de planning). |
| Q14 | Les setlists partagées : quiconque sert dans le lieu (placement dans l'organigramme) les modifie, comme aujourd'hui. |
| Q6 | Tout membre voit les plannings et les noms des inscrits. Les téléphones des inscrits restent réservés à l'organisateur, au Comité Orga, aux gestionnaires de planning et aux admins. |
| Q7 | La mise en ligne se fait tout de suite, avec le back-office, qui est déjà en ligne. |
| Q15, Q20 | Une page **« Équipes › Responsabilités »**, réservée aux admins et rangée par responsabilité. La fiche d'une personne rappelle ses responsabilités en lecture seule, et offre aux admins un lien « Gérer les responsabilités ». |
| Q16 | **Les admins seuls** attribuent une responsabilité, référents compris. |
| Q21 | La reprise est automatique et relue une fois par un admin (voir « Reprise »). Le référent Régie perd Sono, Sono Live et PPT du Culte : la gestionnaire du Culte saisit la régie, et si la Régie en a besoin, on la nomme co-gestionnaire. |
| Q22 | Le back-office s'ouvre à qui a au moins une responsabilité, ou est admin. Un Membre ne le voit pas. |
| Q23 | « Qui sert où » reste l'organigramme du lot AO : **pas de formulaire de déclaration ni de confirmation**. Les décisions Q4, Q13, Q17, Q18 et Q19 de l'entretien se lisent dans ce sens : le placement par un référent vaut confirmation, et se retirer d'un service = être retiré de sa sous-équipe. |

## Les responsabilités

Toutes sont enregistrées dans un champ du profil, **`users/{uid}.responsabilites: string[]`**, écrit par les
admins seuls. Les clés possibles sont fermées :

| Clé | Responsabilité | Plannings couverts (clés de `GRILLES`) |
| --- | --- | --- |
| `planning:culte` | Gestionnaire · Culte Franco | `culte` |
| `planning:intergroupe` | Gestionnaire · Intergroupe | `intergroupe` |
| `planning:interfranco` | Gestionnaire · Interfranco | `interfranco` |
| `planning:campus` | Gestionnaire · Campus | `campusMatin`, `campusSoir` |
| `planning:table` | Gestionnaire · Table et petit déj | `table` (et le petit déj) |
| `planning:edd` | Gestionnaire · EDD | `eddZhongban`, `eddDaban`, `eddGaoban` |
| `planning:paix` | Gestionnaire · Paix | `paix` |
| `planning:fidelite` | Gestionnaire · Fidélité | `fidelite`, `fideliteMusiciens` |
| `planning:bonte` | Gestionnaire · Bonté | `bonte` |
| `orga` | Comité Orga | — |

**Référent d'équipe** : il garde sa place actuelle (`referentDe`, `referentSous`, recopiés depuis
l'organigramme). La page Responsabilités affiche les référents de chaque équipe, et c'est là qu'un admin les
change. Dans l'organigramme, « Référent » devient une simple mention, avec un lien vers la page pour les admins.

L'**audience d'un planning** est celle de son service : le lieu pour Culte, Intergroupe, Interfranco et Campus,
le groupe pour Paix, Fidélité et Bonté, les trois classes pour l'EDD, et les gestionnaires et inscrits du petit
déj pour la Table, comme aujourd'hui.

**Un planning sans gestionnaire** : seuls les admins le remplissent. La page Responsabilités l'affiche en tête,
« Sans gestionnaire ».

## Ce qui change dans le code (lieux relevés le 29/10/2026)

`src/lib/acces/organigramme.ts` lit l'organigramme et ses fonctions deviennent :

| Aujourd'hui (organigramme) | Lot RS |
| --- | --- |
| `coordination()` : référent Louange, référent EDD, Orga | `orga` seul |
| `colonnesParEquipe`, `colonnesRemplies` (référent Louange → culte, Régie → 3 colonnes, EDD, Orga → Table ; `remplitParRole`) | `planning:<x>` → `"toutes"` sur les grilles de `<x>`, sinon `null` |
| `publiePlanning`, `previentPlanning` (`publieParRole`, `notifieParRole`, Régie qui prévient) | `planning:<x>`, sauf la Table, qui ne se publie pas, comme aujourd'hui |
| `remplitUnPlanning` | au moins une clé `planning:` |
| `audiencesOrganigramme` (Orga `*`, référents leur équipe et sous-équipe, `notifieParRole`) | `orga` → `*` ; `planning:<x>` → audience du service ; les référents ne notifient plus que par les réunions de leur équipe |
| `sectionsCreables` (référent Louange → Culte Francophone, comité de groupe → son groupe) | `orga` → toutes les sections ; les autres n'en créent plus (voir « Choix pris ») |
| `tientOrganigramme` (Orga tout, référents leur équipe) | inchangé (Q12, et Orga « partout » dans l'artefact) |
| `peutChangerReferents` (Orga, référent Louange) | admins seuls (Q16) |
| `categoriesCreables`, `categoriesVisibles`, `harmonie`, F1 | **inchangés** (Q23) |

Ailleurs :
- **`src/lib/access.ts`** : `isCoordination`, `canEditPlanning`, `colonnesModifiables`, `canGererPetitDej`, `canEditPetitDej`,
  `canSaisirAbsence`, `canVoirAbsencesDeTous`, `canCreateEvenement`, `creatableEvenementPours`, `canEditEvenement`,
  `canEditCreneau`, `canReserverPour`, `estResponsable` et la vue des téléphones des inscrits suivent le tableau.
  « Modifier un évènement » : son créateur, `orga` et les admins. « Créer et modifier les setlists partagées
  du service » pour un gestionnaire : le gestionnaire est traité comme quelqu'un qui sert dans ce lieu
  (`categoriesCreables` ∪ catégories de ses plannings).
- **`src/lib/planning/releases.ts`** (`canPublishPlanning`) et **`src/lib/push/audiences.ts`** suivent le tableau.
- **`firestore.rules`** est le miroir. `responsabilites` est **écrit par les admins seuls** : la personne ne peut pas
  l'écrire, et le recopiage de l'organigramme n'y touche pas. Les fonctions de règles qui lisent `remplitParRole`,
  `publieParRole`, `notifieParRole` ou la Régie lisent `responsabilites` à la place. **Pendant la bascule**, les
  règles acceptent l'ancien et le nouveau (comme AO-C), puis la dernière tranche retire l'ancien.
- **L'ancien mode** (`backOffice: false`, cases `coordination`, `plannings`, `annonces`, `notify`, `serviceRoles`) n'est pas
  touché. C'est du code mort tant que le back-office reste en ligne : il est à signaler, pas à supprimer dans ce lot.
- **Les rôles des groupes** (V19GROUPES : « Remplit », « Publie », « Notifie » sur un rôle) ne donnent plus de droit. Le
  président et les VP d'un groupe deviennent gestionnaires du planning de leur groupe par la reprise.

## Écrans

Cette page reprend les motifs existants, la liste groupée et les puces de personnes de `PersonnesVolets` et de
l'organigramme. Aucune nouvelle direction visuelle ; une planche est possible si Timothée la demande.

- **Équipes › Responsabilités** (admins) :
  - « Sans gestionnaire » en tête s'il y en a ;
  - puis **Plannings** (une ligne par clé `planning:`, dans l'ordre du tableau), **Comité Orga** et **Référents**
    (une ligne par équipe, et par sous-équipe de Louange) ;
  - chaque ligne montre les personnes (une puce par personne, avec « Retirer » au toucher comme au survol) et
    « + Ajouter », qui cherche parmi les comptes par nom, comme le sélecteur de personnes existant ;
  - enregistrement immédiat, case par case, sans bouton « Enregistrer ».
- **Fiche d'une personne** (Personnes, organigramme) : la ligne « Responsabilités », en lecture seule, et pour un
  admin le lien « Gérer les responsabilités ».
- **Moi › Ce que tu peux faire** (`ceQueCaOuvre`) : les responsabilités y apparaissent avec leur raison (« Gestionnaire
  · Culte Franco »).
- Tout se traduit en français et en chinois. Rien ne s'affiche sans le back-office.

## Reprise

Un script, `scripts/responsabilites-reprise.ts`, s'inspire de `scripts/acces-vers-organigramme.ts`. Il tourne **à blanc
par défaut** et ne s'écrit qu'avec `--ecrire`. Il est lancé **par Timothée** : la session cloud n'a pas de secret.

| Aujourd'hui | Devient |
| --- | --- |
| référent Louange | `planning:culte`, `planning:intergroupe`, `planning:interfranco`, `planning:campus` |
| référent EDD | `planning:edd` |
| membre d'Orga | `orga` |
| `remplitParRole` ou `publieParRole` (rôles de groupe) sur un planning | `planning:<son groupe>` |
| droit coché `plannings` (ancien mode) sur une clé | `planning:<x>` correspondant |
| référent Régie | rien ; listé « perd Sono, Sono Live, PPT du Culte » |

Le script imprime une liste par personne, au format « garde / gagne / perd », pour qu'un admin la relise une
fois, puis l'admin corrige sur la page Responsabilités.

**L'ordre de la bascule** :
1. Timothée publie les règles (ancien ∪ nouveau).
2. Il lance le script à blanc, relit la liste, puis le lance avec `--ecrire`.
3. Il pousse le code.
4. Après vérification, la tranche RS-D retire l'ancien côté des règles, et Timothée les republie.

## Choix pris dans la spec (à contredire si besoin)

- **Créer un évènement** : `orga` et les admins seuls, comme dans la matrice de l'artefact (Q11 OK). Le président
  d'un groupe ne crée plus d'évènement « Groupe Paix » de lui-même : il passe par le Comité Orga. Les
  réunions restent ouvertes au référent pour son équipe.
- **Les téléphones des inscrits** (Q6, « les gestionnaires ») : lus comme organisateur + `orga` + gestionnaires de
  planning + admins.
- **Les référents notifient** seulement par leurs réunions, plus en notification libre à leur équipe (Q12, « les deux
  seulement »).

## Tranches

- **RS-A — Modèle et fonctions pures** : le champ `responsabilites` (`src/types/user.ts`), le tableau des clés et des
  plannings couverts (`src/lib/acces/responsabilites.ts`), `organigramme.ts`, `access.ts`, `releases.ts` et
  `audiences.ts` selon le tableau. Tests purs (`tests/responsabilites.spec.ts`).
- **RS-B — Règles, serveur, reprise** : `firestore.rules` (ancien ∪ nouveau), les routes API qui vérifient ces droits,
  le script de reprise et ses tests (`tests/responsabilites-reprise.spec.ts`, et `tests/acces-regles.spec.ts`
  repris).
- **RS-C — Écrans** : Équipes › Responsabilités, la fiche, Moi, la mention « Référent » dans l'organigramme. Tests
  d'écran sur trois appareils (et les cinq projets pour l'agencement de la page, `SPECS_GRAND_ECRAN`), en
  français et en chinois.
- **RS-D — Nettoyage** (après la bascule, sur ordre de Timothée) : retrait de l'ancien côté des règles, de
  `COLONNES_REGIE`, et des rôles « Remplit · Publie · Notifie » dans l'écran des groupes.

## Avancement

- 29/10/2026 : spec écrite après l'entretien, go donné, code confié à une session orchestratrice (RS-A à RS-C).
- **RS-A** (30/10/2026) : `src/lib/acces/responsabilites.ts` (clés, plannings couverts, audiences, catégories) ;
  `organigramme.ts`, `access.ts`, `releases.ts`, `audiences.ts` en nouveau mode selon le tableau ; ancien mode
  intact. Tests purs `tests/responsabilites.spec.ts`, `acces-organigramme` et `acces-moi` mis à jour là où la spec
  change le comportement ; 282 tests verts (ordinateur, téléphone, tablette).
- **Choix pris au codage** (à confirmer par Timothée) :
  - `canReserverPour` : les gestionnaires de planning réservent toujours, comme le Comité Orga (Q12) ; la
    sous-partie Scène du back-office reste au Comité Orga ;
  - `tientOrganigramme` garde Orga = placé dans l'équipe Orga (« inchangé ») ;
  - la Table n'a pas d'audience de notification libre (le petit déj garde la sienne) ;
  - les téléphones des inscrits ne sont lus nulle part dans l'app (Sheet seulement) : rien à changer ;
  - zh : 法语崇拜 pour Culte Franco, le nom déjà employé par `categories.*`.
- **RS-B** (30/10/2026) : `firestore.rules` ancien ∪ nouveau (`responsabilites()`, `gerePlanning`, `gereUnPlanning` ;
  coordination, absences, plannings, créneaux de scène, création de setlist ; `responsabilites` refusé à la création
  d'un profil, écrit par les admins seuls) ; routes vérifiées (elles passent le profil entier ; deux types élargis) ;
  la recopie de l'organigramme n'écrit jamais `responsabilites` ; reprise `scripts/responsabilites-reprise.ts`
  (logique `src/lib/acces/repriseResponsabilites.ts`, à blanc par défaut, n'ajoute que des clés, n'efface rien) ;
  `tests/responsabilites-reprise.spec.ts`, `tests/acces-regles.spec.ts` repris. 441 tests verts sur trois appareils.
  Relevé de la reprise : clés brutes (`planning:culte`) ; « perd » : une ligne « notification libre à son équipe »
  par référent, « créer les évènements du groupe » pour un comité, Régie « Sono, Sono Live, PPT du Culte ».
- **RS-C** (30/10/2026) : page **Équipes › Responsabilités** (`/back-office/equipes/responsabilites`, troisième
  onglet du rail, admins seuls) ; fiche (Personnes et organigramme) avec la ligne « Responsabilités » et le lien
  « Gérer les responsabilités » ; dans l'organigramme, « Référent » n'est plus qu'une mention (toutes les équipes,
  pour qu'un seul chemin change les référents ; l'ancien mode garde la case) ; Moi liste les responsabilités par
  `ceQueCaOuvre`. `tests/responsabilites-ecrans.spec.ts` (14 tests × 5 projets, `SPECS_GRAND_ECRAN`, fr et zh) ;
  627 tests verts sur les specs d'écran voisines (un échec de charge sur `equipes-acces.spec.ts:232`, vert seul).
  Choix : ajouter un référent de sous-équipe de Louange l'y fait entrer ; retirer un référent le laisse membre ;
  si la recopie serveur échoue, message « droits non recopiés » sans bouton « Réessayer ».
- **Règles publiées par Timothée le 30/10/2026** (ancien ∪ nouveau, celles de RS-B).
- **Reprise faite par Timothée le 30/10/2026** : à blanc relu, `--ecrire` (10 opérations), puis à blanc « 0 opération ».
  La Table reste sans gestionnaire (Q11), le référent Régie n'a rien (Q21) : à régler sur la page si besoin. Défaut
  d'affichage du relevé à corriger : un référent de l'équipe `comite-franco` y est lu comme un comité de groupe
  (« créer les évènements du groupe (franco) ») ; rien de faux n'est écrit.
- **Tests repris (31/10/2026)** : `tests/helpers/fakeSession.ts` traduit un compte fictif comme la reprise
  (`responsabilitesDeLaReprise`), `coordination()` rend `orga` ; 33 specs reprises là où la spec change le comportement
  (coordination = Comité Orga ; la Table, `planning:table` ; président de groupe : son comité seulement ; rôle
  Notifier seul : plus de Back-Office ; un gestionnaire remplit et publie). Relevé de la reprise : `comite-franco` n'est
  plus lu comme un comité de groupe. Les 50 specs rouges de la suite complète, vertes sur ordinateur (passes des
  executants) et sur téléphone et tablette (2 294 tests, puis les 6 restants repris). Suite complète entière non
  relancée.
- **Reste** : mise en ligne sur `main` sur ordre de Timothée ; puis publier les règles de RS-D.
- **RS-D codé (30/10/2026), non publié** : les règles de RS-D se publient seulement APRÈS la mise en ligne du lot RS
  sur main. Retiré : dans `firestore.rules`, l'ancien côté de `isCoordination` (case `coordination`, référents Louange /
  EDD, Orga placé), `faitDesPlannings` et `peutEcrirePlanning` (`plannings`, `remplitParRole`, référents, Orga),
  `peutEcrireLaRegie` et `seulementColonnesRegie` (dimanches et historique des plannings : `peutEcrirePlanning(key)`
  seul), `sectionCreeeParOrganigramme` et la branche `annonces` de `pourCreable` ; `COLONNES_REGIE` (Sono, Sono Live,
  PPT suivent le cas général de `equipeDeLaColonne`, donc Louange) ; dans l'écran des groupes, les cases et pastilles
  Remplit · Publie · Notifie (reste « Saisir les chants des fêtes »). `tests/acces-regles.spec.ts` redit le nouvel état.
- **Code mort signalé, non supprimé** : clés i18n `acces.ouvre.planning*`, `notifier*`, `coordination`,
  `evenementSection`, `acces.pourquoi.roleGroupe`, `presidenceGroupe` ; `estReferentLouange/Edd/Regie` hors droits.
