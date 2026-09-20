# Spec : lot 14, tâches ↔ évènements

**Statut au 19/09/2026 : go de Timothée (« je veux que tu fasses tout ce qui est
sur l'image » : les lectures retenues (a) et (e) du rapport d'audit), codé le
jour même, commit `e13662e`, 15 tests × 3 appareils verts, à valider en local.
Aucune règle Firestore à publier.**

## D'où ça vient

Christelle (WhatsApp, 17→18/09/2026) : « les tâches c'est tjrs les mêmes à
dupliquer et à remettre à la bonne date butoir de l'an prochain » ; « Tâches et
évènements : faudrait voir si c'est mieux ou pas de relier » → Timothée : « je
pense que c'est mieux » ; « les events annuels apparaissent aussi dans le
calendrier event mais ils auront pas tous des inscriptions » ; « selon le profil
si on est “interne” bah on peut ajouter des tâches ». Timothée, 19/09/2026 :
« je voulais lier les évènements et les tâches ensemble ».

**Ce que le code montrait (19/09/2026)** : une tâche vit dans
`poles/{pole}/taches/{id}` (le pôle est dans le chemin), son état par échéance
dans `fois/{date}` ; le rythme « an » du lot 13 recalcule l'échéance suivante
sans rien dupliquer ; un évènement « annuel » se duplique à la main
(`?from=<id>`, lot 6) ; aucun champ ne reliait les deux.

## Les lectures examinées

| Lecture | Verdict |
| --- | --- |
| (a) champ `evenement` facultatif sur la tâche, bloc « Tâches » sur la fiche | **retenu** |
| (b) modèle de tâches sur l'évènement annuel, échéances J-30 / J-7 | écarté : deux mécanismes de régénération, écriture croisée refusée par les règles |
| (c) vue « back office » par évènement | écarté : déjà écarté par la feuille de route, mélange deux publics |
| (d) tâche « préparer X » créée automatiquement | écarté : quel pôle, quelle échéance ? génère des tâches non demandées |
| (e) glissement des échéances à la duplication de l'évènement | **retenu** : conserve le « J-14 » sans le stocker |

La ligne du lot 14 de la feuille de route (18/09) parlait d'une « échéance
relative au jour J (J-14) » stockée : **remplacée** par (e), qui obtient le même
effet sans second champ à tenir cohérent avec `echeance`.

## Ce qui est construit

- **Donnée** : `Tache.evenement: { id, titre } | null` (`src/types/tache.ts`),
  lu `null` sur les documents d'avant, aucune migration. Le titre est recopié
  pour l'afficher sans relire la fiche (même choix que `responsableNom`).
- **Une tâche liée ne se répète pas** : dans `TacheForm`, l'évènement prend la
  place du champ Répétition ; « Détacher de l'évènement » (en modification) le
  fait revenir. Date fixe → tâche « chaque année » (lot 13) ; date qui suit un
  évènement → tâche liée, copiée avec lui.
- **Fiche d'un évènement daté** (réunions de pôle comprises, infos sans date
  exclues) : carte « Tâches » sous la fiche (`TachesEvenement.tsx`), pour les
  **membres d'un pôle et les admins**, jamais sans compte : les tâches de MES
  pôles liées à l'évènement, cochées du même geste que `/taches`, et « Nouvelle
  tâche » pré-remplie, avec le choix du pôle s'il y en a plusieurs.
- **Ligne d'une tâche** : « pour Noël 2026 » sur la page du pôle et dans Mes
  tâches (masqué sur la fiche de Noël elle-même).
- **Duplication** : après la création du nouvel évènement, « Copier aussi ses N
  tâches, aux mêmes délais ? » ; chaque échéance glisse du même nombre de jours
  que l'évènement (`tachesDupliquees`, pur : Noël +365, Pâques 2026 → 2027).
  On ne copie que les tâches de ses pôles ; ni répétition ni « fois » copiées.
- **Rien d'autre ne bouge** : ni `firestore.rules`, ni `access.ts`, ni le cron,
  ni aucune collection. Le programme de scène « Noël » (`programmes/{id}`) reste
  un objet à part : les tâches ne se lient qu'aux évènements du calendrier.

## Réponses retenues (recommandations de l'analyse, acceptées par le go)

Q1 une tâche = un évènement au plus · Q3 lient et délient les membres du pôle de
la tâche et les admins · Q4 évènement supprimé : la tâche reste, titre mémorisé ·
Q5 rien sur la fiche publique · Q6 duplication à la main, enrichie de la copie ·
Q7 pas de répétition sur une tâche liée · Q8 pas de sélecteur d'évènements
existants en V1 · Q9 échéance vide, sans borne · Q10 le rappel du matin ne nomme
pas l'évènement · Q11 datés seulement, réunions de pôle comprises · Q12 on ne
copie que les tâches de ses pôles · Q13 carte séparée sous la fiche.

**Q2 reste ouverte, hors lot** : un évènement sans inscription (Noël, Pâques)
affiche encore « Inscriptions fermées par l'organisateur · 0 déjà inscrits ».
Proposé : un mode « Sans inscription », en micro-lot à part.

## Choix faits en codant, à confirmer

1. « pour Noël 2026 » est masqué sur la fiche de Noël (il se répétait sur chaque
   ligne et passait à deux lignes sur téléphone).
2. « Détacher » n'est pas proposé dans « Nouvelle tâche » ouverte depuis la fiche.
3. Une tâche créée depuis la fiche prévient son responsable comme ailleurs ; les
   copies faites à la duplication **ne préviennent personne** (dix notifications
   d'un coup, un an à l'avance).
4. Toucher une ligne du bloc n'ouvre pas la tâche : on modifie sur la page du pôle.
5. La question de copie n'apparaît que si les deux évènements ont une date ; si
   une copie échoue, la fiche du nouvel évènement s'ouvre quand même.
6. Le titre mémorisé ne suit pas un renommage de l'évènement.
7. La fiche lit toutes les tâches de mes pôles pour en garder celles de
   l'évènement : sans souci aujourd'hui, requête filtrée si un pôle dépasse
   quelques dizaines de tâches.

Défaut ancien relevé, non touché : en modification, `TacheForm` renvoie la tâche
entière, donc le PATCH réécrit aussi `id`, `pole`, `auteurUid` et `createdAt`
(lot 7, sans effet visible).

## Tests

`tests/taches-evenements.spec.ts` (14 tests) et la duplication dans
`tests/evenements.spec.ts`, écrits avant le code et vus rouges, verts sur
ordinateur, téléphone et tablette ; captures regardées (bloc, formulaire ouvert
depuis la fiche, formulaire en modification).
