# Spec — Setlist au seul créateur, corbeille, absences dans le planning

> Demande de Timothée du 18/10/2026 :
> « Seul le créateur de la setlist peut modifier ET supprimer la setlist, le reste ne peuvent que visualiser et sinon
> ils dupliquent en setlist privé pour ajouter leurs notes. Créer une corbeille ou sinon intégrer dans l'archives les
> setlists supprimées (parfois par erreur ça peut sauver des vies). Pouvoir renseigner les congés (absences ponctuelles
> et vacances) dans GCC et adapter automatiquement la liste déroulante lors de l'élaboration des plannings : les
> personnes disponibles apparaissent en premier, suivis d'une section « Absent » regroupant les personnes
> indisponibles sur les dates. »

**État : Q1, Q2, Q3, Q8, Q9, Q11 tranchées le 18/10/2026** (voir « Décisions ») ; planche pour les lots 2 et 3, puis go
lot par lot. **Go le 18/10/2026 pour SC1, SC2 et SC3, sans planche** (choix de Timothée) : codés par une
session orchestratrice.

Trois lots indépendants, dans cet ordre (du plus petit au plus gros) :

| Lot | Objet | Taille | Back-office ? |
|-----|-------|--------|---------------|
| SC1 | Setlist : modifier et supprimer = son créateur seul ; les autres voient et dupliquent en privé | S | non (en ligne) |
| SC2 | Corbeille des setlists supprimées, restaurables | M | non (en ligne) |
| SC3 | Congés et absences ; « Choisir » du planning trie disponibles / « Absent » | L | **oui** pour le tri (planning en grille coupé en ligne) |

## Ce qui existe aujourd'hui

- **Droits** (`src/lib/access.ts:516-545`, miroir `firestore.rules:442-455`) :
  - `canDeleteSetlist` = propriétaire (`ownerId`) **ou** (non privée **et** (admin **ou** niveau « edit » dans la
    catégorie, c.-à-d. musiciens et présidence du service)) **ou** coordination pour une setlist de fête.
  - `canEditSetlist` = `canDeleteSetlist` **ou** membre de l'équipe de la setlist (`editeurs`, décision 39,
    `docs/spec-partage-setlist.md` PS8).
  - Donc aujourd'hui **beaucoup de monde modifie et supprime** une setlist publique : tous les musiciens et la
    présidence du service, les admins.
- **Dupliquer** (`canDuplicateSetlist`, `access.ts:471`) : réservé à qui peut **créer** dans la catégorie ; la copie
  est déjà **privée** et appartient au duplicateur (`duplicateSetlist`, `src/lib/firebase/setlists.ts:446`).
- **Notes personnelles sans dupliquer** : la *version perso* d'un chant (`docs/spec-version-perso.md`) existe déjà
  pour qui voit la setlist.
- **Suppression** : `DELETE` REST définitif (`deleteSetlist`, `setlists.ts:417`), simple ou groupée
  (`docs/spec-suppression-groupee.md`). Aucun retour possible.
- **Archives** : onglet « Archives » de `/setlists` = les setlists **passées** (`src/app/setlists/page.tsx:402`).
- **Absences** : rien. Le « Choisir » du planning (`src/lib/planning/choisir.ts`, `ChoisirNom.tsx`) propose d'abord
  les comptes qui ont le rôle de la colonne, puis les autres. Le planning en grille est derrière l'interrupteur du
  back-office : **en ligne, il n'existe pas** (planning = Google Sheet en lecture).

## Lot SC1 — Le créateur seul modifie et supprime

| # | Règle |
|---|-------|
| SC1.1 | `canEditSetlist` = `canDeleteSetlist` = **`ownerId === uid`** (+ exceptions tranchées en Q1 à Q3). Les musiciens, la présidence du service et l'équipe de la setlist perdent la modification et la suppression. |
| SC1.2 | Miroir serveur : `canEditSetlistDoc` et `canDeleteSetlistDoc` (`firestore.rules`) suivent à l'identique. **À publier à la main par Timothée** dans la console Firebase. |
| SC1.3 | Tout qui **voit** la setlist peut la **dupliquer** : `canDuplicateSetlist` ne demande plus le droit de créer dans la catégorie (sauf setlist de fête, inchangé). La copie reste **privée**, au duplicateur, titre « {titre} (copie) ». Règle `allow create` : à vérifier qu'elle accepte une setlist privée dans une catégorie où l'on ne sert pas (Q4). |
| SC1.4 | Ce qui suit `canEditSetlist` sans code à part suit le changement : éditeur, « Prévenir l'équipe », lien de présentation (sauf la régie du jour, Q5), historique. |
| SC1.5 | Textes : la ligne des droits de la page dit « Modifiable par son créateur seulement » ; le bouton « Modifier » devient « Dupliquer pour mes notes » pour les autres. FR + 中文. |
| SC1.6 | Tests : `tests/coherence.spec.ts` (client ↔ règles) et la page setlist sur trois appareils, avec un créateur, un musicien de la catégorie, un admin. |

## Lot SC2 — Corbeille

Recommandation : **une corbeille** (suppression douce), visible comme une section en bas de l'onglet « Archives »,
plutôt qu'un onglet de plus.

| # | Règle |
|---|-------|
| SC2.1 | « Supprimer » ne fait plus de `DELETE` : il écrit `supprimeeLe` (date) et `supprimeePar` (uid) sur la setlist. |
| SC2.2 | Une setlist avec `supprimeeLe` disparaît de partout (À venir, Archives, Mes setlists, accueil, notifications, rappels du cron, statistiques) et n'apparaît que dans **Corbeille**. |
| SC2.3 | Corbeille = section repliée en bas de « Archives » : titre, date, « supprimée le … », boutons **Restaurer** et **Supprimer définitivement**. On n'y voit que les setlists qu'on pourrait supprimer (donc les siennes, après SC1). |
| SC2.4 | Restaurer retire `supprimeeLe` / `supprimeePar`. Suppression définitive = le `DELETE` d'aujourd'hui, avec confirmation. |
| SC2.5 | Purge automatique après **30 jours** (Q7) par le cron existant `/api/cron/reminders` (Admin SDK), pas de nouveau cron. |
| SC2.6 | Règles : écrire `supprimeeLe` = droit de supprimer ; rien d'autre ne change de forme. |
| SC2.7 | Après « Supprimer », un bandeau « Setlist mise à la corbeille — Annuler » pendant quelques secondes. |

## Lot SC3 — Congés et absences

| # | Règle |
|---|-------|
| SC3.1 | Modèle : sous-collection `users/{uid}/absences/{id}` = `{ du: "AAAA-MM-JJ", au: "AAAA-MM-JJ", motif?: string }`. Une absence ponctuelle = `du === au`. |
| SC3.2 | Saisie : dans **Mon profil**, section « Mes absences » : liste, « Ajouter une absence » (du / au, motif facultatif), supprimer. Q8 : qui d'autre peut en saisir pour quelqu'un. |
| SC3.3 | Droits : chacun écrit les siennes ; lecture = qui peut modifier un planning (Q9). Double : `access.ts` + `firestore.rules`. |
| SC3.4 | « Choisir » du planning : pour la case cliquée (date de la ligne), les propositions se rangent en **Disponibles** (ordre d'aujourd'hui : du rôle d'abord, puis les autres) puis une section **« Absent »** repliée/grisée, avec la période sous le nom (« absent du 12/10 au 26/10 »). Fonction pure dans `src/lib/planning/choisir.ts`, testée seule. |
| SC3.5 | Choisir une personne absente reste **possible** (on ne bloque pas), avec un mot « Absent ce jour-là ». |
| SC3.6 | Une case déjà remplie par une personne qui pose ensuite une absence : marque discrète dans la grille (Q10). |
| SC3.7 | La saisie des absences (SC3.2) peut être en ligne ; le tri de « Choisir » ne sert qu'avec le planning en grille, donc **seulement en local** tant que le back-office est coupé (Q11). |

## Décisions (Timothée, 18/10/2026)

| Q | Décision |
|---|----------|
| Q1 | Les **admins** gardent modifier et supprimer sur toutes les setlists. |
| Q2 | L'**équipe de la setlist** (`editeurs`) garde la **modification**, pas la suppression (déjà le cas). |
| Q3 | Les **setlists de fête** gardent leur régime (coordination), hors du lot. |
| Q8, Q9 | **Ceux qui font les plannings** (`plannings` non vide sur le profil) **et les admins** saisissent une absence pour quelqu'un d'autre et voient les absences de tous. |
| Q11 | La **saisie des absences est en ligne** dès SC3 ; le tri de « Choisir » reste derrière l'interrupteur du back-office. |

Donc SC1.1 devient : `canDeleteSetlist` = propriétaire **ou** admin (**ou** coordination pour une fête) ;
`canEditSetlist` = `canDeleteSetlist` **ou** `editeurs ∋ uid`. Le niveau « edit » de la catégorie (musiciens,
présidence) ne donne plus ni modification ni suppression. Q4, Q5, Q6, Q7, Q10, Q12 : recommandations retenues sauf
avis contraire.

## Avancement

### SC1 — codé le 18/10/2026

- **Droits** (`src/lib/access.ts`) : `canDeleteSetlist` = propriétaire, admin sur une setlist non privée, coordination
  sur une fête ; `canEditSetlist` = cela **ou** l'équipe (`editeurs`). Le niveau « edit » de la catégorie (musiciens,
  présidence) ne donne plus rien sur la setlist d'un autre. `canDuplicateSetlist` = qui **voit** la setlist (sauf
  fête) ; la copie reste privée, au duplicateur, dans la même catégorie (Q4).
- **Miroir** (`firestore.rules`) : `canDeleteSetlistDoc` sans `isEditorOf` ; changer la catégorie = propriétaire ou
  admin (la clause « musicien de la nouvelle catégorie » n'avait plus d'effet, retirée). **À publier à la main par
  Timothée** dans la console Firebase.
- **Écrans** : ligne des droits « Modifiable par son créateur seulement (et les admins) » (ou « … et son équipe… ») ;
  pour qui ne peut pas modifier, la pastille « Dupliquer pour mes notes » (setlist en deux volets) et l'entrée du menu
  ⋯ du même nom ; message de l'éditeur refusé réécrit. FR + 中文.
- **Écart assumé** : une copie privée dans une catégorie où l'on ne crée pas (choriste, régie) garde la visibilité
  « Privée » verrouillée dans l'éditeur, tant qu'elle n'est pas déplacée dans une catégorie à soi — sinon la copie
  « pour mes notes » aurait pu être publiée là où l'on ne sert pas. Garde côté navigateur seulement, comme la
  création (la règle `allow create` ne regarde pas la catégorie).
- **Q1, lu à la lettre** : l'admin garde modifier et supprimer sur les setlists **non privées** ; une privée d'autrui
  reste au seul créateur (l'admin ne la voit pas non plus), comme avant.
- Régie du jour (Q5) : inchangée, `canSetPresentationLink` garde sa clause régie.
- **Tests** : `tests/coherence.spec.ts` (client ↔ règles, créateur / musicien / présidence / choriste / équipe /
  admin), `tests/setlist-partage.spec.ts` (musicien hors équipe : lecture seule, « Dupliquer pour mes notes »). Les
  suites de l'éditeur ouvraient la setlist d'un autre avec un profil musicien : leur setlist est désormais la sienne.

### SC2 — codé le 18/10/2026

- **Supprimer** (fiche ou sélection de `/setlists`) écrit `supprimeeLe` / `supprimeePar` (PATCH à deux champs, sans
  toucher `updatedAt`) ; bandeau « Setlist mise à la corbeille — Annuler » 8 s sur `/setlists`
  (`BandeauCorbeille.tsx`). Une setlist de **fête** reste supprimée pour de bon (Q3), avec ses textes d'avant.
- **Partout ailleurs** : filtre `horsCorbeille` dans toutes les lectures de `src/lib/firebase/setlists.ts`
  (`getSetlist` rend `null`) ; `notify-setlist` et `setlist/presentation` répondent « introuvable ».
- **Corbeille** : section repliée « Corbeille (N) » en bas d'« Archives », seulement si elle contient une setlist que
  la personne pourrait supprimer ; Restaurer, Supprimer définitivement (confirmation). FR + 中文.
- **Purge** : `/api/cron/reminders` supprime (avec `history` et `versions`) les setlists à la corbeille depuis plus
  de 30 jours, hors interrupteur du back-office ; un échec ne coupe pas les rappels.
- **Règles** : poser ou retirer `supprimeeLe` / `supprimeePar` = droit de supprimer, `supprimeePar` = soi.
  **À publier à la main par Timothée.**
- Regardé à l'œil : bandeau et corbeille dépliée sur téléphone, tablette portrait et paysage, ordinateur, 1 440 px.
- **Tests** : `tests/setlist-corbeille.spec.ts` (nouveau), `tests/setlist-suppression-groupee.spec.ts` (PATCH au
  lieu de DELETE).

## Questions à trancher

| Q | Question | Recommandation |
|---|----------|----------------|
| Q1 | **Les admins** gardent-ils modifier/supprimer sur toutes les setlists (dépannage, membre parti) ? | **Oui** : sans eux, une setlist d'un compte supprimé est figée à jamais. |
| Q2 | **L'équipe de la setlist** (`editeurs`, partage choisi par le créateur, décision 39) : garde-t-elle la modification ? | **Oui pour modifier, non pour supprimer** : c'est le créateur qui l'a choisie ; sinon le partage ne sert plus qu'à voir. À défaut, le partage est retiré. |
| Q3 | **Setlists de fête** (Noël, Pâques : pas de créateur, gérées par la coordination) : on garde le régime actuel ? | **Oui**, hors du lot. |
| Q4 | Dupliquer : dans **quelle catégorie** va la copie d'un choriste qui ne sert pas dans cette catégorie ? | La même catégorie, **privée** (visible de lui seul). |
| Q5 | La **régie du jour** garde-t-elle le droit de poser le lien de présentation (PPT) ? | **Oui**, ce n'est pas « modifier la setlist ». |
| Q6 | Plutôt que dupliquer pour des notes, la **version perso** d'un chant existe déjà : on garde les deux ? | Oui, les deux ; le bouton « Dupliquer » le dit simplement. |
| Q7 | Durée de la corbeille avant purge ? | **30 jours**. |
| Q8 | Qui saisit une absence pour quelqu'un d'autre (membre sans compte actif, oubli) ? | La personne, plus **qui peut modifier ce planning** (`plannings` du profil). |
| Q9 | Qui **voit** les absences des autres ? | Ceux qui font un planning et les admins ; le motif n'est vu que de la personne et des admins. |
| Q10 | Absence posée après coup sur une case déjà remplie : marquer la case ? prévenir ? | Marque discrète dans la grille, pas de notification (plus tard si besoin). |
| Q11 | Le tri « Absent » ne sert qu'au planning en grille, coupé en ligne. On met **la saisie des absences en ligne** tout de suite, pour que les données s'accumulent avant l'ouverture du planning ? | **Oui**, la saisie en ligne ; le tri reste derrière l'interrupteur. |
| Q12 | Le Google Sheet (planning en ligne aujourd'hui) n'est pas touché ? | Non touché. |

## Suite

1. Réponses aux Q1–Q12.
2. Planche (artefact HTML) pour SC2 (corbeille dans Archives) et SC3 (« Mes absences », « Choisir » avec la section
   « Absent »), aux trois tailles. SC1 n'a pas d'écran nouveau.
3. Go lot par lot.
