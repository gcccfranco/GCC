# Spec : lot TB2 — le tableau de bord, version 3 de la planche

**Statut** : spec réécrite le 23/10/2026 (soir) sur la version 3 de la planche, validée par Timothée (« Vas y go on
fait ça ») ; **le code attend un go donné après cette spec**. Planche : https://claude.ai/artifact/34HGM6n5LSXC14MkSWiuTK.
Feuille de route § 3.AD. Le chantier des fiches (`spec-coulisses.md`) est **en pause** ; le Culte Franco n'est pas un
évènement mais un planning parmi d'autres (`intent/vision-site.md`, correction du 23/10/2026).

## Mots de Timothée

> « J'aime pas l'apparence du Dashboard […] j'ai l'impression que les données qu'on mets servent à rien. »
> « Tout ce que je veux modifier c'est juste le Dashboard […] sans toucher à trop de choses. » — « Piste A et choix B. »
> « Le culte franco le prend pas comme un événement […] c'est là pour travailler sur les événements mais aussi tous
> les plannings, les réunions et tout. »

## Objectif

Le tableau de bord ressemble au Back-Office : **Plannings, Évènements, Tâches, Réunions**, chaque widget ne montrant
que **ce qui demande une action**, plus un petit **« Ce dimanche »** en coup d'œil. On change le contenu des widgets et
la disposition par défaut ; le système de widgets (personnaliser, glisser, Monter / Descendre, S M L, réglages,
retirer, barre du bas) **ne change pas**. Ensuite, 2 ou 3 responsables l'essaient avant toute autre refonte.

## Décisions

| # | Décision |
| --- | --- |
| T1 | **On garde le système de widgets** (`TableauDeBord.tsx`, `OutilsWidget.tsx`, `src/lib/tableauDeBord/disposition.ts`). |
| T2 | **Aucune donnée nouvelle**, aucune collection, **aucune règle Firestore**. |
| T3 | **Ce dimanche** (`dimanche`, S) : une ligne par service ou planning du dimanche qui nous concerne (réglage « services » gardé) : « prêt » ou « n choses manquent » (lesquelles, en court), lien « Voir ». Plus la liste des noms. |
| T4 | **Cases vides → Plannings** (`planning`, L) : dans les plannings qu'on remplit (règle actuelle `planningsCasesVides`) : les cases vides du prochain dimanche, chacune avec **qui relancer** et « Copier le rappel » ; les **absences en conflit** (une personne planifiée qui s'est déclarée absente) avec « Remplacer » ; une ligne « n cases vides d'ici le {date} » pour les 4 dimanches suivants. |
| T5 | **Prochains évènements → Évènements** (`evenements`, M) : d'abord ceux qu'on organise ou que porte une de ses équipes, puis les autres ; inscriptions en pastille, « ferme bientôt », créneaux de scène vides ; **les réunions en sortent**. |
| T6 | **À faire → Tâches** (`afaire`, M) : les siennes d'abord, puis celles de ses équipes ; en retard en premier. |
| T7 | **Nouveau widget Réunions** (`reunions`, S) : ses réunions à venir (celles dont on est, `estDeLaReunion`) avec leur nombre de sujets ; une réunion passée sans lien de compte rendu. Permis comme l'entrée Réunions. |
| T8 | **Comptes** (`comptes`, S, admins) : deux nombres (« noms sans compte », « nouveaux cette semaine ») et « Voir ». |
| T9 | **Disposition par défaut**, filtrée par les droits comme aujourd'hui : Ce dimanche (S), Plannings (L), Évènements (M), Tâches (M), Réunions (S), Comptes (S). Setlists à préparer, Petit déj, Scène, Calendrier, Chants les plus joués, Raccourcis **sortent du défaut** et restent dans « Ajouter un widget », inchangés. |
| T10 | **Dispositions déjà enregistrées** : remplacées une fois par le nouveau défaut (`versionTableau: 2` dans `backOffice/{uid}` ; absente = défaut). `barreDuBas` n'est pas touché. |

## Règles (pures, `src/lib/tableauDeBord/donnees.ts`)

- **Prochain dimanche** : aujourd'hui compris jusqu'à midi.
- **Ce qui manque, par service** : postes non optionnels vides de la grille ; pour un culte, aussi la setlist publiée
  (`!isPrivate && !isDraft`) et la présentation (`presentationUrl`) ; pour la table, le petit déj. Une lecture en
  échec n'est jamais « prêt » : « Lecture impossible ».
- **Qui relancer** pour une case vide : poste de Louange → référent de la sous-équipe (Présidence, Musiciens,
  Choristes : `referentSous`), sinon référent Louange ; autre colonne → référent de l'équipe qui la remplit ; sans
  référent → pas de bouton.
- **Absence en conflit** : un nom de la ligne dont le profil (`planningName`) a une absence couvrant la date ; le
  widget Plannings n'est vu que de qui remplit un planning, donc de qui voit déjà les absences de tous
  (`canVoirAbsencesDeTous`) ; le motif n'apparaît jamais.
- **Rappel copié** (français) : « Salut {prénom}, pour le {service} de dimanche {date}, il manque encore quelqu'un
  {au poste}. Tu peux t'en occuper d'ici samedi ? Merci ! {lien du planning} ». `navigator.clipboard.writeText` dans
  le geste, repli sur sélection du texte ; « Copié ».

## Ce qui sera construit

| Tranche | Contenu | Vérifié par |
| --- | --- | --- |
| TB2-a | Règles pures (ce qui manque, qui relancer, absences en conflit, texte du rappel, tri des évènements et des tâches). | Tests rouges sur fonctions vides puis verts. |
| TB2-b | Widgets Ce dimanche, Plannings (« Copier le rappel », « Remplacer »), Évènements, Tâches, Comptes. | Écrans sur jeu d'essai, 4 dispositions + 1 440 px ; presse-papier. |
| TB2-c | Widget Réunions ; nouveau défaut ; `versionTableau` ; libellés FR et 中文. | Défauts de chaque rôle ; disposition ancienne remplacée une fois ; 中文. |

## Tests

`tests/tableau-de-bord.spec.ts` mis à jour (déjà dans `SPECS_GRAND_ECRAN`) : trois appareils, cinq projets ; Firestore
et Sheet simulés ; noms fictifs inventés ; captures regardées.

## Hors périmètre

Fiches, modèles, nombre par trimestre, jour J, communication, menu, rappel du matin, liste « À régler » unifiée (à
revoir après l'essai par 2 ou 3 responsables). `access.ts` ne change que dans `widgetsPermis` (widget Réunions).

## Avancement

- 23/10/2026 : planche version 3 et spec. Le code attend un go.
