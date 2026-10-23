# Spec : lot TB2 — le tableau de bord, version 2

**Statut** : spec écrite le 23/10/2026 ; **aucun go**. Planche : https://claude.ai/artifact/34HGM6n5LSXC14MkSWiuTK.
Feuille de route § 3.AD. Ce lot est la seule partie retenue pour l'instant du chantier « coulisses »
(`spec-coulisses.md`, **en pause**) : il en reprend l'esprit (piste A) sans aucune donnée nouvelle.

## Mots de Timothée

> « J'aime pas l'apparence du Dashboard […] j'ai l'impression que les données qu'on mets servent à rien. »
> « Tout ce que je veux modifier c'est juste le Dashboard […] juste pour le moment on améliore le Dashboard sans
> toucher à trop de choses. » — « Piste A et choix B » (23/10/2026).

## Objectif

Le tableau de bord répond d'abord à « le prochain Culte Franco est-il prêt, et qui relancer ? », puis à « qu'est-ce
que je dois faire ? ». On change **le contenu des widgets et la disposition par défaut** ; le système de widgets
(personnaliser, glisser, Monter / Descendre, S M L, réglages, retirer, barre du bas) **ne change pas**.

## Décisions

| # | Décision |
| --- | --- |
| T1 | **Choix B** : on garde le système de widgets (`TableauDeBord.tsx`, `OutilsWidget.tsx`, `src/lib/tableauDeBord/disposition.ts`). |
| T2 | **Aucune donnée nouvelle**, aucune collection, **aucune règle Firestore** : tout se lit avec ce qui existe. |
| T3 | **Ce dimanche → Prochain culte** (id `dimanche` gardé, libellé changé, L par défaut) : le prochain Culte Franco ; état « n sur 6 » calculé (setlist publiée, présentation prête, postes de la grille remplis, orateur et traduction, petit déj, absences en conflit) ; **seulement ce qui manque**, avec **qui relancer** et « Copier le rappel » ; « Copier tous les rappels » ; une ligne « Prêt : … ». Plus la liste des noms. Le réglage « services » reste (défaut : Culte Franco). |
| T4 | **Setlists à préparer → Prochains cultes** (id `setlists` gardé, M) : les 3 dimanches suivants du même service, chacun avec son anneau et ce qui manque. Plus de « aucune » répété. |
| T5 | **Nouveau widget Pour toi** (`pourtoi`, S) : tes tâches (dont tu es responsable, en retard en rouge) et tes 2 prochains services. Permis à tout responsable. |
| T6 | **Nouveau widget Tes équipes** (`equipes`, S) : par équipe dont on est membre, la prochaine réunion et son nombre de sujets, le nombre de tâches en retard. Permis à tout responsable. |
| T7 | **Comptes** : deux nombres (« noms sans compte », « nouveaux cette semaine ») et « Voir ». Plus la liste des noms. |
| T8 | **Prochains évènements** : inchangé, l'état des inscriptions passe en pastille. |
| T9 | **Défaut pour tous** (filtré par les droits, comme aujourd'hui) : Prochain culte (L), Pour toi (S), Prochains cultes (M), Prochains évènements (M), Tes équipes (S), Comptes (S, admins). Les autres (À faire, Cases vides, Petit déj, Scène, Calendrier, Chants les plus joués, Raccourcis) **restent dans « Ajouter un widget »**, inchangés. |

## Règles de calcul (pures, `src/lib/tableauDeBord/donnees.ts`)

- **Prochain culte** = le prochain dimanche (aujourd'hui compris jusqu'à midi) de la grille `culte`
  (`src/lib/planning/grilles.ts:108`).
- **Les 6 points** : (1) setlist publiée pour ce service et cette date (`!isPrivate && !isDraft`) ; (2) présentation
  prête (`presentationUrl`) ; (3) postes remplis = colonnes non optionnelles de la grille hors orateur et traduction
  (une ligne par poste vide) ; (4) orateur et traduction remplis ; (5) petit déj (`lirePetitDej`) ; (6) aucune absence
  en conflit (un nom de la ligne dont le profil, par `planningName`, a une absence ce jour-là). Une lecture en échec
  n'est jamais « prêt » : la ligne dit « Lecture impossible ».
- **Qui relancer** : poste de Louange → référent de la sous-équipe (Présidence, Musiciens, Choristes : `referentSous`),
  sinon référent Louange ; autre colonne → référent de l'équipe qui la remplit ; setlist → la présidence du jour ;
  présentation → la personne de la colonne PPT ; sans référent : rien (pas de bouton).
- **Absences en conflit** : visibles seulement de qui voit les absences de tous (`canVoirAbsencesDeTous`) ; pour les
  autres, la ligne dit « {poste} : à confirmer », sans nom. Le motif n'apparaît jamais.
- **Rappel copié** (français seulement dans ce lot) : « Salut {prénom}, pour le Culte Franco de dimanche {date}, il
  manque encore : {postes}. Tu peux t'en occuper d'ici samedi ? Merci ! {lien} », lien vers la page de l'App où l'on
  agit (planning du culte ou setlist). Copie par `navigator.clipboard.writeText` dans le geste, repli sur sélection
  du texte ; confirmation « Copié ».

## Dispositions déjà enregistrées

`backOffice/{uid}.tableauDeBord` est **remplacé une fois** par le nouveau défaut : une clé `versionTableau: 2` écrite
au premier affichage ; absente ou inférieure à 2 = on prend le défaut. Le Back-Office n'est pas en ligne : seuls des
testeurs ont une disposition. La barre du bas (`barreDuBas`) n'est pas touchée.

## Ce qui sera construit

| Tranche | Contenu | Vérifié par |
| --- | --- | --- |
| TB2-a | Règles pures (6 points, qui relancer, texte du rappel, prochains cultes) + tests unitaires Playwright sur jeu d'essai. | Tests rouges sur fonctions vides puis verts. |
| TB2-b | Widgets Prochain culte, Prochains cultes, Comptes, Prochains évènements (pastille) ; « Copier le rappel ». | Écrans sur jeu d'essai, 4 dispositions + 1 440 px ; presse-papier. |
| TB2-c | Widgets Pour toi et Tes équipes ; défauts ; `versionTableau` ; libellés FR et 中文. | Défauts de chaque rôle ; disposition v1 remplacée une fois ; 中文. |

## Tests

`tests/tableau-de-bord.spec.ts` mis à jour (défauts, données des widgets, captures), trois appareils, déjà dans
`SPECS_GRAND_ECRAN` ; noms fictifs inventés ; Firestore et Sheet simulés.

## Hors périmètre

Fiches de préparation, modèles, coches manuelles, nombre par trimestre, jour J, communication, menu, rappel du matin :
tout le reste de `spec-coulisses.md`. Pas de changement de `firestore.rules` ni de `access.ts` au-delà de
`widgetsPermis` (deux widgets ajoutés, permis à tout responsable).

## Questions ouvertes

Aucune : les trois questions de la planche sont prises sur les recommandations ci-dessus, sauf avis contraire.

## Avancement

- 23/10/2026 : planche et spec. Aucun go.
