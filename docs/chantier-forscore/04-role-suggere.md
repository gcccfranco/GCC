# Vue par rôle proposée d'après le planning

Date : 07/11/2026 (session cloud). Question de Timothée, à propos des vues par rôle du mode louange (pianiste,
guitariste, présidence, choriste, batteur ; `ROLE_PRESETS`, `src/components/performance/PerformanceMode.tsx:267`) :
« est-ce que c'est possible de rendre automatique ? Ou bien c'est mieux de le laisser manuel ». Étude en lecture
seule : trois lectures du code, une synthèse, deux relectures adversariales (faits du code ; risque du dimanche).
Rien n'est codé. Spec à venir avec celle de l'apparence (`../feuille-de-route.md` § 3.AO).

## Décisions de Timothée (07/11/2026)

1. **Proposer, pas imposer** : le planning propose une vue, la personne choisit ; rien ne bascule sans un geste.
2. **Cajon → vue Batteur.** La question couvrait Cajon (EDD), Cajon/Batterie (Intergroupe, Interfranco) et
   Percussion (groupes) ; la réponse « Batteur pour le cajon » est appliquée aux trois, Percussion à confirmer.
3. **iPad partagé : oui**, le rôle se retient **par compte** sur un appareil partagé (aujourd'hui `perf-role-preset`
   est une clé d'appareil, sans uid : `PerformanceMode.tsx:314`, `:405-421`).
4. **Plusieurs services le même jour sont toujours dans des lieux différents** : jamais présidence et piano, ni
   guitare et présidence au même service. Le rôle se lit donc dans le seul service de la setlist (date, catégorie,
   moment au Campus) : un service, un rôle. Si les données en donnaient quand même deux pour ce service (erreur de
   saisie), aucune proposition.

Restent à trancher (propositions de l'étude) : « Musicien » sans instrument ; Percussion ; accepter la
suggestion = mémoriser le rôle (proposé : oui, comme un choix dans Réglages) ; pas de suggestion pour un appareil qui a
répondu « Aucun, je règle moi-même » (proposé : aucune) ; place et apparence de la pastille (planche).

## Sources, par priorité

1. **Le rôle déjà connu de l'entrée** « Pour moi » ou « Mes services » (`ServiceDuJour.roles`,
   `src/lib/planning/accueil.ts:10-17`). Les liens ne passent aujourd'hui que l'id (`PourMoi.tsx:89`,
   `DetailService.tsx:148`, `ApercuSetlist.tsx:103`) ; un paramètre de rôle ne coûte aucune lecture. À lire avant
   `history.replaceState`, qui nettoie l'adresse (`src/app/setlists/[id]/_hooks/useEntreeLouange.ts:19-20`).
2. **Le planning déjà chargé sur la page de la setlist** : `loadPlanningData()` y tourne dès que `BACK_OFFICE` est
   actif (en ligne depuis le 29/10/2026) et que le profil a un `planningName` (`SetlistDetailClient.tsx:159-171`).
   `findMyServices` (`src/lib/planning/names.ts:309`) filtré sur la date, la catégorie et, au Campus, le moment de
   la setlist, comme `datesServies` (`names.ts:387-399`), qui jette aujourd'hui le rôle. **Aucune lecture Firestore
   en plus.**
3. **En appoint**, pour « Musicien » sans instrument : le préfixe des cellules Campus (« Piano: … », à lire avant
   `splitNames`, `names.ts:150-157`), puis le champ de profil `joue` (`src/types/user.ts:80`) s'il ne contient qu'un
   instrument utile.

Écartés : `serviceRoles` (catégorie sans date ni instrument) ; les données de secours de `data.ts` (dates passées ;
la règle doit exiger une date commune, pas compter sur leur absence : `names.ts:50-51`).

## Correspondance (vérifiée dans `names.ts:171-193`, Campus `:346-349`)

| Planning | Vue proposée |
| --- | --- |
| Piano | Pianiste |
| Guitare | Guitariste (capo en plus) |
| Batterie, Cajon, Cajon/Batterie, Percussion | Batteur (décision 2) |
| Choriste, Chant (Campus) | Choriste |
| Présidence | Présidence (même réglage que Choriste) |
| Musicien | préfixe Campus ou `joue`, sinon rien |
| Orateur, Traduction, Sono, PPT, Sainte cène, Suppléant, Cours, Équipe, Régie | rien |

## Règle proposée

1. Rôle suggéré : celui du lien, sinon celui du planning à la date et dans la catégorie de la setlist (entrées Campus
   séance et répétition dédoublonnées d'abord, `names.ts:349-351`), sinon rien. Rien non plus : sans compte, hors
   ligne ou Sheet en panne, sans `planningName`, setlist sans date, catégorie sans planning, trimestre non publié.
2. Un service, un rôle (décision 4) : seuls les rôles du service de la setlist comptent, les services du même jour
   ailleurs sont ignorés. Deux rôles pour ce même service (erreur de saisie) → **rien** (mieux vaut pas de
   suggestion qu'une mauvaise, comme `accueil.ts:41-43`).
3. Appareil (et compte) sans rôle retenu : la feuille de rôle s'ouvre comme aujourd'hui, le rôle du planning en tête,
   marqué « d'après le planning » ; rien ne s'applique sans toucher.
4. Rôle déjà retenu : il s'applique comme aujourd'hui ; si le planning dit autre chose, une pastille propose la
   bascule (« Planning : Batterie aujourd'hui · Passer en vue Batteur »), ignorable. Pas de pastille quand les accords
   ont été changés sur la page juste avant (`initialShowChords`) ni quand l'Affichage de l'appareil contredit déjà le
   rôle (seconde condition de `roleOverridden`, `PerformanceMode.tsx:320-326`).
5. Accepter = `applyRolePreset` (`PerformanceMode.tsx:411-425`), avec « Annuler » juste après : une vue Batteur pose
   aussi « Structure seule » sur la vue partitions (`:419`, `partitionLayoutPref.ts:11-18`).
6. Rien ne bascule une fois le mode ouvert : un planning arrivé en retard ne fait qu'afficher la pastille.

## Risques retenus

- **Annotations** : la clé d'une page dépend des accords, des paroles et du capo (`signatureAffichage`,
  `src/lib/performance/blocks.ts:420-441`). Changer de vue masque les traits de l'autre vue ; ils restent enregistrés
  (`src/lib/firebase/annotations.ts`). D'où : jamais de bascule sans geste, et la pastille hors des zones qui tournent
  la page.
- **Remplaçant de dernière minute** : le planning se trompe sans que l'app le sache ; le libellé dit « d'après le
  planning », pas plus.
- **Couverture** : seuls les membres reliés au planning par un admin (`planningName`, `src/components/admin/Personnes.tsx`)
  auront une suggestion ; leur nombre n'a pas été mesuré (pas d'accès à la vraie base depuis une session cloud).
- **iPad partagé** (décision 3) : la clé du rôle retenu devient propre au compte ; sans compte, la clé d'appareil
  actuelle. L'ancienne clé `perf-role-preset` sert de valeur de départ au premier compte qui ouvre le mode sur
  l'appareil (aucun rôle perdu).
- **Tests** : les specs voisines posent le rôle par `localStorage` (`tests/performance-mode.spec.ts`,
  `tests/coup-d-oeil.spec.ts`, `tests/louange-sections-uniques.spec.ts`) : à garder vertes ; nouveaux tests avec un
  Sheet simulé (`page.route` sur l'origine Google, `serviceWorkers: "block"`) et des noms inventés.

## Coût

S pour la première tranche (fonction pure de suggestion sous `src/lib/planning/`, calcul sur le planning déjà chargé
dans `SetlistDetailClient.tsx`, prop pour `PerformanceMode.tsx`, pastille, feuille de rôle, rôle retenu par compte,
locales FR et 中文, tests sur trois appareils) ; M avec le paramètre de rôle des liens « Pour moi » et « Mes
services », le préfixe Campus et `joue`. Aucune lecture Firestore en plus.
