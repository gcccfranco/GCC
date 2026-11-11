# Cadrage : le site devient le pupitre (demande AP)

**Statut : cadrage du 11/11/2026 (session cloud). Rien de tranché, rien de codé, aucune planche publiée.** Ce
document porte l'état pour la session qui reprendra (CLAUDE.md, « Économie de contexte »). Faits vérifiés sur
`187c286` (branche `claude/corrections-design`, AO vagues 1 et 2 fusionnées).

## Demande (Timothée, 11/11/2026)

1. « Forcer tous les musiciens à utiliser le mode louange » ; la plupart utilisaient forScore et y gardent leurs
   anciennes partitions. Pistes citées : changer l'onglet Setlists pour les musiciens ; ou, comme forScore, un écran
   vide et un menu des setlists d'où l'on joue ; revoir les trois affichages (« section unique », « ordre joué »,
   « structure seule »).
2. Fusionner « Ma version » et « Adapter » ; la personne choisit si elle partage, et **à qui** (liste de personnes).
3. Comme dans forScore, une annotation reste sur le chant : dans une nouvelle setlist, on retrouve la partition annotée.
4. Beaucoup d'écrans peu pratiques (« ex. la pièce jointe ») : analyser toutes les pages, du Back-Office à l'espace
   Musiciens, sur toutes les dispositions. Capture jointe : la feuille d'une équipe (Back-Office › Équipes) au téléphone.
5. Idées d'harmonie : les déplacer dans le mode louange ; revoir l'onglet Harmonie (« pas très pratique ») ; accords,
   théorie et idées « encore plus exhaustifs » ; intégrer le number system aux partitions ; s'inspirer de
   `https://wangshubianqu.com/chord-map/`.

Timothée demande aussi de reformuler la demande selon l'article de Felix Rieseberg « How to be more ambitious »
(altitude : le résultat et non la tâche ; profondeur : matière brute, outils des meilleurs, objectif dur, juge
extérieur ; étendue : plusieurs métiers, des verbes au lieu des noms).

## Reformulation proposée (à valider par Timothée)

**But** : au culte, chaque musicien de service joue sur le site et plus sur forScore, parce que sa partition y est
meilleure : la sienne, annotée, qui le suit de dimanche en dimanche.

- Objectifs mesurables : prêt à jouer en deux touchers ; aucune annotation ni version perdue d'une setlist à
  l'autre ; six chiffres suffisent à lire le répertoire ; aucune action principale sous le premier écran au téléphone.
- Croyances à vérifier : « il faut forcer » ; « les trois affichages sont le problème » ; « il faut plus de cours ».
- Juge extérieur (jamais l'avis du modèle) : mesures Playwright (`tests/helpers/mesuresUsage.ts`), un musicien qui
  valide les fiches, un essai en répétition, le nombre de musiciens qui ouvrent le mode louange le dimanche.
- Contradicteur : le musicien resté sur forScore (ses objections sont à recueillir, question 3).

## Ce que le code montre

- **Tout ce qui est personnel est rangé par setlist.** « Ma version » : `setlists/{id}/versions/{uid}`
  (`src/lib/firebase/setlistVersions.ts`), partage = un interrupteur par chant, visible de tous, sans choix de
  personnes (`docs/spec-version-perso.md`). Annotations : `annotations/{uid}__{setlistId}__{pageKey}`
  (`src/lib/firebase/annotations.ts:5`), `pageKey` dépendant de la mise en page. Une nouvelle setlist repart de zéro :
  c'est ce que forScore fait mieux (les traits s'y accumulent). AO garde ce rangement (décision 18 de
  `spec-mode-louange-forscore-2.md` : « l'accrochage viendra avec la migration »).
- **« Adapter »** écrit dans l'élément de la setlist (`contentOverride`), pour tous, réservé à qui peut modifier la
  setlist. Même geste d'édition que « Ma version », deux boutons voisins (`SetlistDetailClient.tsx`).
- **La porte directe existe** : la carte « Ton prochain service » de l'accueil a un bouton « Mode Louange »
  (`src/components/accueil/PourMoi.tsx`, lien `?louange=1`), un toucher. Depuis l'onglet Setlists : trois touchers, et
  la page d'une setlist montre six commandes et deux vues.
- **Réglages empilés** après AO : le rôle (par compte, proposé d'après le planning : FS-C, RP), l'affichage (Ordre
  joué / Sections uniques / Structure seule, `src/lib/partitionLayoutPref.ts`) et cinq dispositions (Classique,
  Couleurs par section, Marge, Scène, Partition, `src/lib/dispositionPref.ts`). AO (vagues 1 et 2 codées, pas en
  ligne, en pause depuis le 09/11) a déjà refait la barre, les menus (dont un menu Setlist), la feuille de route du
  batteur et la demi-page : **toute planche sur le pupitre part de cet état, pas de ce qui est en ligne.**
- **Idées d'harmonie** : feuille ouverte depuis la page de la setlist (`IdeesDuChant.tsx`, `IdeesSheet.tsx`) ; décision
  du 17/09/2026 « jamais en mode louange », rouverte par cette demande.
- **Chiffres** : le moteur existe (`src/lib/harmonie/degres.ts`, « 1 · 2m · 4 · 5 · 6m »), le cours a un chapitre
  Nashville (`docs/harmonie/cours/15-…`), aucune partition ne s'affiche en chiffres.
- **Harmonie** : 69 fiches en 12 familles, **toutes au statut « à valider »** ; 24 chapitres et un glossaire, statut
  « validée » ; aucun son. Sujets absents : seulement CAGED. La page `/harmonie` au téléphone fait 14 015 px, soit
  17 écrans de défilement (capture du 11/11).
- **« Pièce jointe »** : aucun écran de ce nom. Le plus proche : images et liens du formulaire d'un évènement ou d'une
  réunion (`EvenementForm.tsx`). À faire préciser (question 1).

## Mesure du répertoire (11/11/2026, premier comptage, à contre-vérifier)

Sur les 383 chants (`content/songs/*.cho`, 381 en majeur), accords lus avec `degreDeLAccord`, basses ignorées,
répétitions consécutives fondues, suites de quatre accords comptées par section :

- 1, 2m, 3m, 4, 5, 6m font **96 %** des 18 795 accords écrits (1 : 5 254 ; 5 : 4 202 ; 4 : 4 151 ; 6m : 2 706 ;
  2m : 1 132 ; 3m : 590).
- 244 chants en majeur n'ont aucun accord hors de la tonalité ; 110 chants tiennent en quatre degrés ou moins.
- La boucle 1 5 6m 4, à une rotation près, est dans 146 chants ; 1 4 5 1 dans 102 ; 1 6m 4 5 dans 103.
- 69 % des accords sont des triades sans couleur ; puis m7 (1 090), 7 (354), sus4 (312), 2 (244), maj7 (218).

Conséquence : l'affichage en chiffres est rentable, et un parcours « six chiffres, dix boucles » couvre l'essentiel.

## Le site de référence (wangshubianqu.com/chord-map/, lu le 11/11/2026)

Outil d'un professeur d'arrangement (cours payant : textes, analyses et sons ne se copient pas). Ce qu'il a et que
GCC n'a pas : l'**écoute** de tout (avant / après, rythme de piano, batterie, tempo) ; une bibliothèque de 130
progressions **en chiffres**, avec « dans 535 chansons, N utilisent cette boucle » et des exemples ; 100 chants
décortiqués (version A / version B à l'oreille) ; « quel accord ensuite, et pourquoi » (notes communes) sur le cycle
des quintes ; huit niveaux d'exercices dont la reconnaissance d'accords à l'oreille ; 80 gammes. Ce que GCC a de plus :
des fiches ancrées dans son répertoire (« dans 61 chants »), piano et guitare, et « Essayer » sur un passage.

À reprendre, avec les chants de GCC : écouter avant / après ; l'entrée par boucle en chiffres avec le nombre de chants
de GCC ; l'oreille (reconnaître 1, 4, 5, 6m) sur des passages du répertoire. Pas « plus de texte ».

## Chantiers proposés

| # | Chantier | Reprend | Suite |
| --- | --- | --- | --- |
| 1 | **Ma partition** : une partition par personne et par chant (version, structure, annotations accrochées au texte), qui suit le chant ; partage à des personnes choisies ; « Adapter » = la même édition, pour toute la setlist | points 2 et 3, et le vrai levier du point 1 | planche `ma-partition`, puis spec ; recoupe AN (vague 3 d'AO) et la « migration » annoncée par sa décision 18 |
| 2 | **Le pupitre** : l'entrée des musiciens, une seule commande pour rôle + affichage + disposition, idées d'harmonie en répétition, accords en chiffres | points 1 et 5 | planche `pupitre-musicien`, **sur l'état AO** |
| 3 | **Écrans pratiques** : relevé mesuré de tous les écrans, feuilles et menus compris | point 4 | lancer l'outil ci-dessous, `regard` trie, `/verifier-constats`, rapport, planches de corrections |
| 4 | **Harmonie qui s'entend** : écoute, validation des 69 fiches par un musicien, boucles en chiffres, oreille ; page moins longue | point 5 | planche après le chantier 2 |

## Outil du relevé d'usage

`tests/helpers/mesuresUsage.ts`, branché sur `tests/audit-design-captures*.spec.ts` (76 écrans, comptes fictifs) :

```bash
PW_CAPTURES=<dossier>/pages PW_MESURES=<dossier>/mesures.jsonl PW_FEUILLES=<dossier>/feuilles \
  npx playwright test -c playwright.audit-design.config.ts -g "fr-clair" --trace off --workers=3
```

Une ligne JSON par écran et par disposition (cibles sous 44 px au toucher ou 24 px à la souris, textes sous 12 px,
textes coupés, écrans de défilement, place de l'action principale, champs) ; avec `PW_FEUILLES`, chaque bouton est
touché et toute feuille, menu ou fenêtre qui s'ouvre est mesuré et photographié (téléphone et ordinateur). Compter une
à deux heures : à lancer par un `testeur`, en tâche de fond. Limites : les jeux d'essai sont presque vides (une équipe
sans membre ne montre pas le défaut d'une longue liste) ; la taille d'une cible hors écran est celle de sa boîte.

Premier relevé (11/11, interrompu, sur `61d6f5b`) : Back-Office › Équipes au téléphone, 44 cibles sur 50 sous 44 px
(onglets de 30 px de haut). Capture de Timothée (feuille d'une équipe de sept membres) : la liste défile sous le
titre, « Ajouter un membre » est après toute la liste, chaque ligne porte deux ou trois lignes de rôles.

## Questions ouvertes

1. Où est la « pièce jointe » (quelle page) ?
2. Compter qui ouvre le mode louange le dimanche (une écriture par personne et par setlist), pour savoir si les
   musiciens quittent forScore ?
3. Deux ou trois objections de musiciens restés sur forScore.
4. Retirer l'export PDF aux musiciens (il alimente forScore) ?
5. AO est en pause : ce chantier le reprend-il (AN, vague 3) ou passe-t-il devant ?

## Avancement

- 11/11/2026 : cadrage, état des lieux, mesure du répertoire, lecture du site de référence, outil du relevé écrit et
  essayé. Relevé complet et planche `pupitre-musicien` lancés puis **arrêtés** : la branche locale était en retard de
  la fusion d'AO, ils travaillaient sur un état périmé. À relancer sur la tête de branche, après les réponses.
