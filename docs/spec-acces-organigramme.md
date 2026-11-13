# Spec : les accès viennent de l'organigramme

Demande de Timothée du 21/10/2026 : « au début la logique c'était qu'on se base sur le planning pour avoir les accès
[…] maintenant qu'il y a l'organigramme ça change tout, il faut changer le mode ». Cadrée le jour même par un
entretien (skill *grilling*), tours A à F, **toutes les questions tranchées**. Inventaire des accès et doublons :
https://claude.ai/artifact/RVnkQYaFbyyBgZ8ti4ET6s (privé, liste des points faibles des règles : il reste hors du
dépôt public).

Lot **AO**. Planche : https://claude.ai/artifact/9vupGveKJDw5BnzGfHf1wV. **État : spec écrite et planche faite le
21/10/2026, refaite dans le style du site le 22/10/2026 ; go le 22/10/2026 (AO-A à AO-F), session orchestratrice. Préalable levé le 22/10/2026** :
règles publiées par Timothée, relevé V19EQUIPES à « 0 opération » (rien à migrer).

## Mots de Timothée

> « Au début la logique c'était qu'on se base sur le planning pour avoir les accès, dis-moi si je me trompe. Mais
> maintenant qu'il y a l'organigramme ça change tout. Il faut changer le mode. » (21/10/2026)
>
> « Les membres des groupes doivent pouvoir créer et voir les setlists. Les setlists doivent être comme aujourd'hui,
> c'est-à-dire les personnes du groupe voient la setlist du jour pour le groupe, pour le culte ceux qui servent pour
> le culte voient la setlist, c'est pas un truc louange. »

## Ce que le code montre (21/10/2026)

Trois sources d'accès qui se recouvrent :
- **Le planning** : à l'inscription et au profil, `deriveServiceRolesFromPlanning` (`src/lib/planning/names.ts:249`)
  pré-remplit `serviceRoles` ; Harmonie lit les colonnes Piano / Guitare (`canUseHarmonie`, `src/lib/access.ts:463`) ;
  Mes services et les rappels lisent le planning.
- **Le profil** : `serviceRoles` (catégorie → chanteur · musicien · présidence · régie), **libre à la création**
  (`firestore.rules` ne le contrôle pas) ; il fait la visibilité et la création des setlists (`visibleCategories`,
  `creatableCategories`, `categoryLevel`, `access.ts:474-500`) et l'appartenance élargie à `louange`
  (`equipesDe`, `access.ts:62-66`). Droits cochés à la main par un admin : `coordination`, `annonces`, `notify`,
  `plannings`, `equipes`.
- **L'organigramme** (`equipes/{id}`, 13 équipes en dur, `src/lib/equipes/table.ts:27-39` ; `groupes/{id}`, 5
  groupes) : `dansEquipes`, `referentDe` recopiés par le serveur (`/api/equipes/rattachement`) ; `remplitParRole`,
  `publieParRole`, `notifieParRole`, `tientGroupe` depuis les rôles des groupes (lot V19GROUPES). Rattachement par
  **uid** ; le nom du planning ne sert qu'à relier un nom à un compte.
- `MembreEquipe` (`src/types/equipe.ts`) : `nom`, `uid`, `mention` (texte libre), `referent`, `essai`, `groupe` =
  **sous-colonne** de LOUANGE (Présidences · Choristes · Pianistes · Guitaristes · Batteurs) et d'EDD (Professeurs
  louange · Professeurs cours · Pianistes · Guitaristes · Cajon), simple intertitre d'affichage aujourd'hui.
- L'organigramme **ne connaît pas le lieu de service** (Culte francophone, Intergroupe, Interfranco, Campus).
  L'onglet ORGANIGRAMME du Sheet a une matrice « TEAM MUSICIENS — vue d'ensemble » (personnes × Paix, Bonté,
  Fidélité, Campus, EDD, Franco, Intergroupe, Interfranco) : source pour la migration.
- **V19EQUIPES** (pôles → équipes) : code fait le 12/10/2026, **séance de bascule pas faite** (relevé, règles,
  migration, coordination cochée : `spec-equipes-sans-poles.md`, « Ordre de la bascule »). V19GROUPES et le partage
  de setlist attendent la même publication de `firestore.rules`. Tout le module Équipes est coupé en ligne
  (`BACK_OFFICE`).

## Décisions (tranchées le 21/10/2026)

**Principe**

| # | Décision |
| --- | --- |
| A1 | **L'organigramme décide qui a accès à quoi.** Le planning ne dit plus que *qui sert quand* (Mes services, rappels) et n'ouvre aucun droit — sauf F1. Le profil ne garde que l'identité. |
| A2 | **Plus aucun droit coché à la main** (`coordination`, `annonces`, `notify`, `plannings`, `equipes`) : chaque droit vient d'une équipe ou d'un poste de l'organigramme. Remplace la décision de septembre « la coordination jamais par une équipe ». |
| A3 | **Les trois admins fondateurs** restent écrits dans le code et dans les règles (`ADMIN_EMAILS`), seule exception. |
| A4 | **Les rôles du profil (`serviceRoles`) disparaissent** : on ne se déclare plus soi-même. Nul ne se place soi-même dans l'organigramme. |
| A5 | La refonte part **en ligne avec l'organigramme** ; d'ici là le site en ligne garde l'ancien mode. |
| F3 | **Ordre** : la séance V19EQUIPES d'abord, vérifiée ; la refonte ensuite. Les deux sont en ligne ensemble. |

**Structure**

| # | Décision |
| --- | --- |
| D1 | **Régie reste une équipe à part** (`regie`, « Sono Live & PPT »), avec son référent. |
| D1, D2 | **Louange a trois sous-équipes, chacune avec son référent** : **Présidence**, **Musiciens**, **Choristes**. |
| D4 | **Un référent Louange** au-dessus des trois. |
| C1, D3 | **Deux listes à cocher sur la ligne du membre, dans l'organigramme** (pas de sous-équipe par lieu ni par instrument) : **« Où il sert »** (les 4 lieux du culte) pour tout membre de Louange et de Régie ; **« Ce qu'il joue »** (piano, guitare, basse, batterie, cajon…) pour les Musiciens seulement. |
| E1 | **Une personne peut être dans plusieurs sous-équipes** et cumule ce qu'elles ouvrent. |
| C4 | **EDD** : pas de classe par membre (beaucoup de roulement) ; tout membre voit et crée les setlists des trois classes. |
| B3, F2 | **Qui coche** : le référent Louange (toute la Louange), **chaque référent de sous-équipe pour la sienne**, le référent Régie pour la Régie, et les membres d'Orga partout. |

**Ce que chacun ouvre**

| Accès | Qui, demain |
| --- | --- |
| Setlists d'un lieu du culte : **voir et créer** (C3) | Membre de Louange (toute sous-équipe) qui sert à ce lieu |
| Setlists d'un lieu du culte : **voir** (C2) | Membre de Régie qui sert à ce lieu |
| **Setlist d'une date où l'on sert** : voir (F1) | Toute personne inscrite au planning de cette date pour cette catégorie — lecture seule, cette setlist seulement |
| Setlists d'un groupe : voir et créer | Membre du groupe (organigramme des groupes, champ `groupe`) |
| Setlists de l'EDD (3 classes) : voir et créer | Membre d'`edd` |
| Harmonie (catalogue, cours, idées) | Musiciens avec piano ou guitare ; RD-2000 : piano |
| Coordination : scène, fêtes, évènements de toute l'Église (D5) | Référent Louange, référent EDD, membres d'Orga |
| Remplir, publier, prévenir : planning du **culte** | Référent Louange (toutes les colonnes) ; référent Régie (Sono, PPT). **Pas** le référent Musiciens (E2) |
| Remplir, publier, prévenir : planning de l'**EDD** | Référent EDD |
| Remplir, publier, prévenir : planning d'un **groupe** | Les rôles définis dans l'organigramme des groupes (inchangé, V19GROUPES) |
| Notifier | Un référent : son équipe ou sa sous-équipe ; référent Louange : toute la Louange ; membres d'Orga : toute l'Église |
| Créer un évènement de section | Groupe : président et VP ; culte : référent Louange ; EDD : référent EDD |
| Créer un évènement pour toute l'Église | La coordination (D5) |
| Tenir l'organigramme | Orga : tout ; chaque référent : son équipe ; référent Louange : ses sous-équipes ; président et VP : leur groupe (E2) |
| Tout compte sans équipe | Chants, Accords, planning en lecture, Mes services, setlists de fête, ses propres setlists — comme aujourd'hui |

**Passage**

| # | Décision |
| --- | --- |
| B4 | **Un script remplit l'organigramme depuis l'existant** (rôles des profils, sous-colonnes Louange, matrice des musiciens, colonnes du planning, droits cochés) : **relevé à blanc** relu par Timothée, puis écriture. Personne ne perd un accès le jour de la bascule. |
| B5 | Quelqu'un au planning mais dans **aucune équipe** garde Mes services et ses rappels, et la lecture de ses dates (F1), sans autre accès. Le relevé les liste pour qu'on les place avant la bascule. |

## Tranché le 21 et le 22/10/2026

- **Rappel aux référents** : **gardé** (Timothée, 22/10/2026) — chaque semaine, au référent concerné, dans le rappel
  du matin existant (`/api/cron/reminders`), « N personnes au planning de ce mois ne sont dans aucune équipe », avec
  leurs noms et le lien vers l'organigramme. Pas de notification de plus.

- **« Ce que tu peux faire » dans Moi** : **oui** (Timothée, 21/10/2026) — la liste de ses accès avec leur raison
  (« Voir et créer les setlists du Campus — Louange, où tu sers ») et « Un accès te manque ? Demande à ton
  référent » ; la même liste sous « Ce que ça lui ouvre » dans la fiche d'un membre.
- **Liste « Ce qu'il joue »** : piano, guitare, basse, batterie, cajon, autre — **validée** (21/10/2026).
- La sous-équipe s'appelle **Choristes** (Timothée, 21/10/2026), pas « Chanteurs/Choristes ».

## Modèle

- `equipes/louange` garde **un document** ; `MembreEquipe` gagne :
  - `sousEquipes: ("presidence" | "musiciens" | "choristes")[]` (remplace l'intertitre `groupe` pour Louange) ;
  - `referentDe: ("louange" | "presidence" | "musiciens" | "choristes")[]` pour la Louange (le booléen `referent`
    reste pour les autres équipes ; « référent Louange » = `referentDe` contient `louange`) ;
  - `lieux: ServiceLieu[]` (Louange et Régie) ;
  - `joue: Instrument[]` (Musiciens).
  Alternative plus simple à évaluer au codage : garder `referent` et ajouter `referentSous`. Le choix appartient à
  l'exécution, pas à la décision.
- Le serveur recopie sur le profil, comme `dansEquipes` : `referentDe` étendu (`louange`, `louange/musiciens`…),
  `lieux` (union), `joue` (union). Les règles lisent ces champs recopiés ; jamais un champ écrit par la personne.
- `serviceRoles`, `annonces`, `notify`, `plannings`, `equipes`, `coordination` : **lus une dernière fois par le
  script de migration**, puis plus lus par le code ; suppression des champs dans un second temps (étape AO-F).

## Tranches

- **AO-0 — Séance V19EQUIPES** — **faite le 22/10/2026** : règles publiées, relevé à « 0 opération » (lancé avec
  `--env-file=.env`, la clé de service est dans `.env` et non `.env.local`). (Timothée, sur son Mac) : relevé, publication de `firestore.rules`, migration
  `--ecrire`, « 0 opération », coordination cochée (`spec-equipes-sans-poles.md`). Préalable à tout le reste.
- **AO-A — Modèle et fonctions pures** : champs ci-dessus ; `src/lib/access.ts` réécrit sur l'organigramme
  (`visibleCategories`, `creatableCategories`, `canSeeSetlist` + F1, `canUseHarmonie`, `isCoordination`,
  `canEditPlanning`, notifier, évènements, `canEditerEquipes`) ; tests sans page de chaque ligne du tableau.
- **AO-B — Écrans de l'organigramme** (après la planche et le go) : carte Louange en trois sous-équipes, référents,
  « Où il sert » et « Ce qu'il joue » sur la ligne du membre, édition par les référents de sous-équipe ; fiche d'une
  personne ; Personnes sans les cases de droits.
- **AO-C — Serveur et règles** : recopie (`/api/equipes/rattachement`), `firestore.rules` miroir de `access.ts`
  (création de setlist limitée aux catégories ouvertes, `users` create sans champ de droit), routes API (planning,
  notifier, présentation). **Règles à publier à la main par Timothée.**
- **AO-D — Script de migration** `scripts/acces-vers-organigramme.ts`, à blanc par défaut : listes « garde son
  accès », « perd un accès », « au planning sans équipe », « droit coché sans équivalent ».
- **AO-E — Rappel aux référents** (gardé le 22/10/2026).
- **AO-F — Nettoyage** : profil et inscription sans rôles, plus de `deriveServiceRolesFromPlanning` pour les droits,
  champs morts retirés après une saison.

## Vérification

- Tests sans page : chaque ligne du tableau « Ce que chacun ouvre », dans les deux sens (a / n'a pas), avec des
  profils fictifs.
- Playwright, trois appareils (cinq pour l'organigramme, `SPECS_GRAND_ECRAN`) : un référent de sous-équipe coche
  « Campus » sur un musicien, qui voit alors les setlists du Campus ; un membre au planning d'une date voit cette
  setlist seulement ; un compte sans équipe ne voit pas les setlists d'un lieu ; le planning ne donne plus Harmonie.
- Règles : émulateur ou tests REST simulés de `firestore.rules` pour la création de setlist et la création de profil.

## Choix d'exécution (session orchestratrice, 22/10/2026)

Pris au codage, dans le cadre des décisions ci-dessus ; les écarts sont repris dans « Avancement ».

**Deux modes, un interrupteur.** Chaque fonction de `src/lib/access.ts` dont la réponse change prend un dernier
paramètre `backOffice: boolean = BACK_OFFICE` (patron déjà suivi par `audiencesNotifiables`, `droitsDePublication`) :
`false` = l'ancien mode, **code d'aujourd'hui inchangé** ; `true` = le nouveau, qui ne lit plus `serviceRoles` ni les
droits cochés (`coordination`, `annonces`, `notify`, `plannings`, `equipes`). Un test pur passe le mode lui-même. Le
nouveau mode est écrit dans un module pur, `src/lib/acces/organigramme.ts`, que `access.ts` appelle.

**Modèle retenu (alternative simple de la spec).**
- `MembreEquipe` (`src/types/equipe.ts`) gagne, optionnels : `sousEquipes?: SousEquipe[]` et `referentSous?:
  SousEquipe[]` (Louange), `lieux?: ServiceLieu[]` (Louange, Régie), `joue?: Instrument[]` (Musiciens).
  `SOUS_EQUIPES = ["presidence", "musiciens", "choristes"]`, `INSTRUMENTS = ["piano", "guitare", "basse",
  "batterie", "cajon", "autre"]`. Sur `equipes/louange`, le booléen `referent` existant = **référent Louange** (D4) ;
  ailleurs il garde son sens. `groupe` (intertitre) reste lu pour l'ancien affichage et par la migration.
- Le profil reçoit, **recopiés par le serveur seul** (`recalculerRattachement`, comme `dansEquipes`) : `sousEquipes`,
  `referentSous`, `lieuxLouange`, `lieuxRegie`, `joue` (seulement si `musiciens` ∈ `sousEquipes`). `referentDe`
  garde son sens (ids d'équipes) : un id composé (`louange/musiciens`) aurait fui dans les tâches et les réunions.
- Rien n'est jamais écrit par la personne : `users` create refuse ces champs comme les autres.

**Ce que le nouveau mode calcule** (`src/lib/acces/organigramme.ts`, une fonction par ligne du tableau) :
- Setlists : créer = `lieuxLouange` (membre de `louange`) ∪ catégorie du `groupe` ∪ les trois classes EDD (membre
  d'`edd`) ; voir = créer ∪ `lieuxRegie` (membre de `regie`). F1 : `canSeeSetlist` reçoit en option les dates
  servies (`{ date, categorie }[]`, tirées du planning par `findMyServices`) et ouvre la lecture de la setlist de
  cette date et de cette catégorie seulement.
- Harmonie : `musiciens` ∈ `sousEquipes` et `joue` ∋ piano / guitare (RD-2000 : piano).
- Coordination (D5) : `referentDe` ∋ `louange` ou `edd`, ou `dansEquipes` ∋ `orga`.
- Plannings « du culte » = les plannings des quatre lieux : `culte`, `intergroupe`, `interfranco`, `campusMatin`,
  `campusSoir`. Référent Louange : remplir (toutes colonnes), publier, prévenir. Référent Régie : remplir les seules
  colonnes `sono`, `sonoLive`, `ppt`, publier et prévenir (lecture littérale du tableau). Référent EDD : les trois
  plannings EDD. Groupes : `remplitParRole`, `publieParRole`, `notifieParRole` (inchangé). Planning **Table** :
  aucune ligne du tableau ne le nomme — membres d'Orga (« coordination générale »), à confirmer par Timothée.
- Notifier : nouvelles audiences `equipe:<id>` (membres de l'équipe) et `louange:<sous-équipe>` ; un référent notifie
  son équipe (`equipe:<id>`), un référent de sous-équipe la sienne, le référent Louange `equipe:louange`, Orga `*` ;
  plus `notifieParRole` (groupes).
- Évènements de section (sections = `ANNONCE_SECTIONS`) : référent Louange → Culte Francophone ; président et VP
  (`referentDe` ∋ `comite-<g>`) → la catégorie de leur groupe. Il n'existe pas de section EDD : rien pour le
  référent EDD tant qu'il n'y en a pas (écart signalé).
- Tenir l'organigramme : Orga, tout ; un référent, son équipe ; le référent Louange, toute la Louange ; un référent
  de sous-équipe, les membres de sa sous-équipe (ajouter, retirer de la sienne, cocher lieux et instruments) ; seuls
  Orga, le référent Louange et les admins changent les référents. Président et VP : leur groupe (inchangé).
- « Ce que tu peux faire » / « Ce que ça lui ouvre » : une fonction pure rend la liste (quoi, pourquoi) en clés i18n.

**Règles (`firestore.rules`) : ancien ∪ nouveau.** Local et en ligne partagent Firestore et `main` tourne encore
dans l'ancien mode : chaque règle touchée accepte l'ancien droit **ou** le nouveau, jamais l'un sans l'autre. Elles
restent donc compatibles avec `main` et se publient quand Timothée veut ; le jour de la mise en ligne de la refonte,
une dernière passe retirera l'ancien côté (AO-F, « après une saison »). Effet en ligne dès la publication, à
connaître : les référents Louange et EDD et les membres d'Orga reçoivent dans Firestore les écritures de la
coordination, et la création d'une setlist **publique** n'est plus permise que dans une catégorie ouverte (ancien
ou nouveau mode) — ce que l'écran en ligne fait déjà ; une setlist privée (copie) reste libre.

## Avancement

**AO-A à AO-F codés et poussés sur `ui/apple-design` les 22 et 23/10/2026 (session orchestratrice), à valider par
Timothée.** Tout passe derrière `BACK_OFFICE` : interrupteur coupé (en ligne), le comportement d'aujourd'hui est
intact (`tests/back-office-coupe.spec.ts`).

| Tranche | Commit | Ce qui est fait |
| --- | --- | --- |
| AO-A | `994226c` | `src/lib/acces/organigramme.ts` ; `access.ts`, `audiences.ts`, `releases.ts` bimodes ; F1 ; `tests/acces-organigramme.spec.ts` |
| AO-C | `3cd3407` | recopie des cinq champs ; `firestore.rules` ancien ∪ nouveau ; routes (audiences `equipe:`/`louange:`, setlist prête, présentation par la Régie du lieu, droit de tenir l'organigramme) ; `tests/acces-regles.spec.ts` |
| AO-D | `40b0559` | `scripts/acces-vers-organigramme.ts` (logique `src/lib/acces/migration.ts`), à blanc par défaut ; `tests/acces-migration.spec.ts` |
| AO-E | `aedd73b` | le lundi, dans le rappel du matin, liste des noms du planning sans équipe au référent Louange, Régie ou EDD ; `tests/acces-rappel.spec.ts` |
| AO-B | `2e24e4f`, `909b7a9` | carte Louange en trois sous-équipes, panneau (Sous-équipes, Référent de, Où il sert, Ce qu'il joue, Ce que ça lui ouvre), fiche, Personnes sans cases, vue Musiciens ; Moi (Mes équipes, Ce que tu peux faire) ; grille : la Régie n'édite que Sono, Sono Live, PPT |
| AO-F | `909b7a9`, `3fcdfca` | inscription et profil sans rôles ; lectures de `serviceRoles` remplacées (accueil, rappel push, calendrier, tableau de bord, partage, « Choisir ») ; tests d'écran repris (`fakeSession` traduit un profil fictif à l'ancienne comme la migration). Aucun champ supprimé. |

**Tranché par Timothée le 23/10/2026** (questions ouvertes au codage)
1. Planning **Table** : les membres d'Orga — **oui**.
2. **Référent Régie** : remplit Sono / Sono Live / PPT des cinq plannings du culte et prévient des changements ; il
   **ne publie pas** le trimestre (`publiePlanning` exige toutes les colonnes ; `previentPlanning` à part). Il ne
   retire pas de date.
3. **Section EDD** pour les évènements : **non** — le référent EDD crée pour toute l'Église par la coordination.
4. Noms 中文 : Intergroupe = **联合聚会**, Interfranco = **法语联合聚会** (catégories, organigramme, rappels).
5. La migration fait entrer aux **Musiciens** ceux que le planning montre au piano ou à la guitare (groupes compris),
   pour qu'ils gardent Harmonie — **oui**.

**Autres lectures, sans question ouverte** : `canSeeEvenement` voit une section par les catégories qu'on voit en
setlists ; dans les fêtes (`src/lib/fetes/droits.ts`), la règle « rôle musicien du groupe » lit encore `serviceRoles`
(transition D17), la règle par les colonnes du planning couvre le cas.

**Ce que Timothée fait lui-même**
1. Publier `firestore.rules` (console Firebase) quand il veut : ancien ∪ nouveau, compatible avec le code en ligne.
   Effet dès la publication : référents Louange et EDD et membres d'Orga ont les écritures de la coordination ; une
   setlist **publique** ne naît que dans une catégorie ouverte (ce que l'écran en ligne fait déjà).
2. Avant la mise en ligne de la refonte : `npx tsx --env-file=.env scripts/acces-vers-organigramme.ts` (à blanc), lire
   le relevé (garde / perd un accès, au planning sans équipe, droit coché sans équivalent), placer à la main ce qui
   manque, puis `… --ecrire`, puis de nouveau à blanc (« 0 opération »).
3. Mise en ligne (push sur `main`) : sur son ordre ; ensuite, après une saison, retirer l'ancien côté des règles et
   les champs morts (`serviceRoles`, cases cochées).

**Tests** : tests sans page de chaque ligne du tableau (a / n'a pas) ; écrans de l'organigramme et Moi sur les cinq
projets ; suite reprise sur le projet ordinateur (139 fichiers : 128 entièrement verts ; les rouges restants sont
antérieurs au lot — comités dans la liste de l'admin, empreinte `chords.json`, libellé « Intro (x2) », bulle d'aide
des accords sur « Quel PDF ? », fuseau UTC de la machine — ou instables sous charge et verts seuls).
