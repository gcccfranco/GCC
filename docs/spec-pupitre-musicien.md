# Cadrage : le site devient le pupitre (demande AP)

**Statut : cadrage du 11/11/2026 (session cloud), complété le même jour par les réponses de Timothée (§ Réponses).
Rien de codé, aucune planche publiée.** Ce document porte l'état pour la session qui reprendra (CLAUDE.md, « Économie
de contexte »). Faits vérifiés sur `187c286` (branche `claude/corrections-design`, AO vagues 1 et 2 fusionnées).

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

Compléments du même jour (voir § Réponses) : **toutes les pages, sans exception**, sur toutes les dispositions ;
de petites animations ; compter l'usage de toutes les fonctionnalités pour retirer celles qui ne servent pas ;
contenu des fiches d'harmonie et des cours laissé à Claude ; bibliothèque d'accords à revoir (le clavier « zoome »
quand on change d'accord).

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
- **« La pièce jointe »** est la capture jointe au message : la feuille d'une équipe (Back-Office › Équipes,
  `src/app/equipes/EquipesClient.tsx`), au téléphone. Ce n'est pas un écran du site.

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
| 4 | **Harmonie qui s'entend** : écoute, validation des 69 fiches par un musicien, boucles en chiffres, oreille ; page moins longue ; fiches manquantes ; bibliothèque d'accords (clavier qui ne bouge pas) | point 5 | planche après le chantier 2 |
| 5 | **Compter l'usage** de chaque fonctionnalité, pour retirer ensuite celles qui ne servent pas | réponse du 11/11 | spec (ce qu'on compte, où, combien de temps, ce qui reste privé) |

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

## Réponses de Timothée (11/11/2026)

1. La « pièce jointe » = la capture de la feuille d'une équipe (Back-Office › Équipes, téléphone).
2. Compter : oui, et plus large : « tu peux même compter pour toutes les fonctionnalités pour faire le tri à la fin
   des fonctionnalités qui servent à rien et les retirer » (chantier 5).
3. Objections sur forScore : aucune, « ils adorent même ». Conséquence : on ne gagne pas contre forScore en
   forçant ; on gagne si la partition du site suit le musicien (chantier 1) et s'ouvre aussi vite (chantier 2).
4. Retirer l'export PDF aux musiciens : « je pense que oui ». À confirmer sur la planche du pupitre (qui le garde :
   responsables de louange, administrateurs ?). L'export PDF lui-même reste gelé.
5. AO et sa vague 3 : « fais ce que tu penses être le mieux » (ordre recommandé ci-dessous).
6. Exemple de défaut d'usage : la vue Partitions d'une setlist sur iPad portrait laisse une bande vide à droite, les
   paroles tiennent dans le tiers gauche. « Voir toutes les pages du site sans exception » ; « peut-être ajouter des
   petites animations ».
7. Fiches d'harmonie et cours théoriques : « prends les décisions toi-même », « il manque beaucoup de choses dans les
   idées d'harmonies ». Bibliothèque d'accords : revoir l'interface (« quand on change d'accord au piano, ça fait des
   zooms sur le clavier »), en reprenant ce qui est bien sur wangshubianqu.com/chord-map (progressions, carte des
   accords).

## Décisions de Timothée après le rapport d'usage (11/11/2026, soir : « go » sur les cinq recommandations)

Rapport : `docs/audit-usage-2026-11-11.md`. Ce « go » valide les décisions et lance la spec du lot 1 et la planche ;
il ne vaut pas go de code (règle : le go de code vient après la spec, lot par lot).

1. **Par quoi commencer** : le lot 1 (retouches sans dessin) et, en même temps, une planche pour ses deux exemples
   (vue Partitions d'une setlist sur iPad debout ; feuille d'une équipe).
2. **Largeur** : la règle du 07/11/2026 (lot CD T4b, « colonne alignée à gauche ») est rouverte pour les partitions,
   qui prennent la largeur. Les listes se décident sur la planche.
3. **Liste | Partitions au toucher** : le même glisser que le geste du doigt, pas un changement immédiat.
4. **Mode louange** : aucune animation, même pour passer au chant suivant.
5. **Constats non relus** (57) : pas de nouvelle équipe d'agents ; chaque lot vérifie les siens au moment de sa spec.

## Décisions de Timothée sur la planche des deux exemples (11/11/2026, nuit : « Ok »)

Planche : `docs/planches/planche-exemples-usage.html`. Les onze questions étaient posées avec une proposition
chacune et la consigne « répondez "ok pour tout" ou seulement les numéros où vous voulez autre chose ». Timothée
répond « Ok » : lu comme un accord sur la **piste A « Pupitre »** et sur les onze propositions. Ce n'est pas un go
de code : la spec vient d'abord, puis « go pour la tranche N ? ».

1. **Deux colonnes** : lecture en rangées (Intro | Couplet 1, puis Refrain | Couplet 2).
2. **Sommaire en vue Partitions** (tablette couchée, ordinateur) : rail de numéros qui s'ouvre au toucher ; il
   reste ouvert en vue Liste.
3. **Note de la setlist** : une ligne en italique dans la barre du haut, dépliable.
4. **Vue Liste** : colonne d'environ 720 px, alignée sur le même bord gauche que les partitions (qui, elles,
   prennent la largeur : décision 2 du rapport d'usage).
5. **Retirer un membre** : depuis ses réglages dépliés (« Retirer de l'équipe »), puis « Remettre » sur la ligne
   jusqu'à l'enregistrement ; plus de croix sur chaque ligne.
6. **Feuille d'équipe en tablette debout** : feuille de formulaire centrée de 560 px.
7. **Colonne unique en tablette debout** : taille de paroles actuelle (pas d'agrandissement).
8. **Étiquettes de sections** : « Couplet 1 » en semi-gras au lieu de « COUPLET 1 » en capitales espacées, même
   couleur gelée.
9. **Seuil des deux colonnes** : vers 1 360 px (une seule colonne de 920 px à 1 280 px).
10. **Réglages d'un membre** : rôle, « Référent », « En essai », « Retirer de l'équipe ». **À vérifier dans le code
    avant d'écrire la spec** (la maquette les dessine d'après les libellés, pas d'après les champs).
11. **Téléphone** : « Mode Louange » devient un bouton rond à icône seule, pour que la bascule Liste | Partitions
    tienne dans la barre d'outils.

Aussi acquis sur la planche A : champ « Ajouter un membre » en tête de la feuille d'équipe, une ligne repliée par
membre, « Annuler » et « Enregistrer » collés en bas, « en essai » visible sur la ligne. Non dessinés, à traiter
dans la spec : 简谱 (image du scan), mode sombre à 1 440 px, mouvement (décisions 3 et 4 du rapport d'usage).

## Ordre recommandé (décision déléguée, réponse 5)

1. **Rapport d'usage sur toutes les pages** (chantier 3), puis planches de corrections : indépendant du reste.
2. **Valider puis mettre en ligne les vagues 1 et 2 d'AO** (codées, pas en ligne) : tout le reste s'appuie dessus.
3. **Ma partition** (chantier 1) avant les annotations d'AO : c'est la « migration » annoncée par la décision 18
   d'AO ; elle absorbe AN-1 (où se range un trait). AN-2 à AN-5 se codent ensuite sur ce rangement, pas avant, sinon
   les traits seraient à déplacer une seconde fois.
4. **Le pupitre** (chantier 2), sur l'état AO en ligne. CA (couleur des accords), JP-C et JP-D restent indépendants.
5. **Harmonie · Accords** (chantier 4) et **compter l'usage** (chantier 5) : sans dépendance, à glisser entre deux.

## Avancement

- 11/11/2026 : cadrage, état des lieux, mesure du répertoire, lecture du site de référence, outil du relevé écrit et
  essayé. Relevé complet et planche `pupitre-musicien` lancés puis **arrêtés** : la branche locale était en retard de
  la fusion d'AO, ils travaillaient sur un état périmé.
- 11/11/2026 (suite) : réponses de Timothée consignées ; il confirme l'ordre « un livrable à la fois », en
  commençant par le rapport sur toutes les pages. Relevé relancé sur `54da181` (76 écrans, cinq dispositions, puis
  la passe des boutons). Rapport : `docs/audit-usage-2026-11-11.md` (à venir).
- 11/11/2026 (soir) : **rapport d'usage rendu**, `docs/audit-usage-2026-11-11.md` (page illustrée en artefact privé).
  77 écrans × 5 dispositions, 386 feuilles et menus ; 149 constats (75 confirmés, 17 incertains, 57 non relus), six
  lots proposés, cinq questions à trancher. Deux réserves : (1) un piège de l'outil (une capture plus grande que la
  fenêtre coupe la simulation du toucher) avait faussé le premier passage, tout a été remesuré, le chiffre de « 43 % de
  cibles trop petites » donné en cours de route était faux (environ 25 % au toucher) ; (2) la révision par les agents
  a été arrêtée en route, à cause de la dépense signalée par Timothée (≈ 85 M de jetons, surtout les douze
  `critique-design` en Opus) : sept familles sur douze révisées, les autres gardent leurs constats du premier passage.
  **Consigne retenue : ne plus lancer d'équipe d'agents sans demande explicite de Timothée à ce moment-là.**
  Suite : Timothée choisit par quoi commencer (recommandé : lot 1 de retouches et une planche pour ses deux
  exemples) ; les autres livrables (planches « Ma partition », pupitre, Harmonie · Accords, spec du comptage d'usage)
  restent à faire, un à la fois.
- 11/11/2026 (soir, suite) : « go » de Timothée sur les cinq recommandations (section « Décisions de Timothée après
  le rapport d'usage »). **Reste à faire, par une session neuve** (celle-ci est au plafond de contexte) :
  (a) la planche des deux exemples : captures et mesures dans le rapport, § « Les deux exemples de Timothée » ;
  feuille d'équipe = `src/app/equipes/EquipesClient.tsx:244-262` et `:563-660`, ligne d'un membre =
  `src/components/equipes/OrganigrammeLouange.tsx:186-240` ; (b) la spec du lot 1 : partir des constats d'effort
  « retouche » du rapport, relire chacun dans le code avant de le garder (57 ne sont pas relus), écarter ceux qui
  déplacent quelque chose, découper en tranches ; puis demander « go pour le lot 1 ? ». Rien n'est codé.
- 11/11/2026 (soir, fin) : Timothée demande de lancer les autres chantiers en même temps, en Opus, « en consommant
  le moins de tokens possible ». Lancés : la planche des deux exemples (équipe design, consigne serrée, dans la
  session principale : `docs/planches/planche-exemples-usage.html`) et quatre sessions sur cette branche, un
  livrable chacune, dans leur propre fichier : « AP · Spec lot 1 (retouches d'usage) » → `docs/spec-retouches-usage.md` ;
  « AP · Planche Ma partition » → `docs/spec-ma-partition.md` ; « AP · Planche Harmonie et Accords » →
  `docs/spec-harmonie-accords.md` ; « AP · Spec comptage d'usage » → `docs/spec-comptage-usage.md`. Chacune pose ses
  questions à Timothée dans sa conversation. **Pas encore lancée : la planche du pupitre**, qui dépend des réponses
  sur « Ma partition » (où vivent la partition personnelle et les annotations dans le mode louange). Garde-fous de
  dépense ajoutés au CLAUDE.md (§ Économie de contexte) et aux fiches `critique-design` et `directeur-artistique`.
- 11/11/2026 (nuit) : **planche des deux exemples reprise et publiée** (`docs/planches/planche-exemples-usage.html`,
  artefact privé « Planche : deux écrans pratiques partout »). Un `/planche` (trois agents), verdict « à retoucher »
  (13 points), une reprise par un `maquettiste` (14 corrections ; un prénom de maquette changé à la relecture, il
  coïncidait avec un membre réel). Trois pistes : A « Pupitre » (recommandée), B « Conducteur », C « Livret ouvert ».
  Couplet 1 mesuré sur la maquette, piste A : 45 % du premier écran au téléphone avec l'aide de première visite
  (36 % sans ; cible 40 % non tenue), 33 % en tablette debout, 35 % couchée, 39 % à 1 280 px, 24 % à 1 440 px (deux
  colonnes de 528 px lues en rangées, seuil vers 1 360 px). Feuille d'équipe : champ d'ajout en tête, lignes d'un
  membre repliées, boutons collés en bas, feuille centrée de 560 px en tablette debout. **Onze questions posées à
  Timothée** ; pas de spec avant ses réponses, rien de codé. Non dessinés : 简谱, sombre à 1 440 px, mouvement.
- 11/11/2026 (nuit), état des quatre sessions, lu dans leurs specs : **lot 1 des retouches** : go donné, T1 et T2
  codées sur la branche (zones de 44 px), suite dans `docs/spec-retouches-usage.md` § Avancement ; **« Ma
  partition »** : planche publiée (`planche-ma-partition.html`), questions posées, réponses attendues ; **Harmonie
  et Accords** : planche publiée (`planche-harmonie-accords.html`), questions posées, réponses attendues ;
  **comptage d'usage** : spec écrite, six décisions prises, go pour T1 (session orchestratrice). **Planche du
  pupitre toujours pas lancée** (attend les réponses sur « Ma partition »). La session principale a dépassé le
  plafond de 200 000 tokens : la suite (spec des deux exemples après réponses, planche du pupitre) se reprend
  dans une session neuve à partir de ces lignes.
- 11/11/2026 (nuit, fin) : Timothée répond « Ok » aux onze questions de la planche des deux exemples : piste A et
  les onze propositions retenues (section « Décisions de Timothée sur la planche des deux exemples »). Spec confiée
  à une session neuve (« AP · Spec des deux exemples », Opus, un livrable : `docs/spec-exemples-usage.md`), la
  session principale ayant dépassé le plafond. « Ma partition » et Harmonie et Accords attendent toujours leurs
  réponses ; lot 1 des retouches : T3 codée.
- 11/11/2026 (nuit, 22 h 15 UTC) : six chantiers codaient ensemble après les go de Timothée (retouches T6, couleur
  des accords en fin de lot, deux exemples T1, comptage T3, Harmonie H1, « Ma partition » MP-1). Timothée choisit
  **trois à la fois** et en fait une règle (CLAUDE.md § Économie de contexte). Mis en attente par message : « Ma
  partition », Harmonie H1, comptage T3. Ordre de reprise : « Ma partition », puis Harmonie, puis comptage, une
  place à la fois, sur « reprends » de Timothée ou de la session principale.
- 11/11/2026 (23 h 15 UTC) : **planche du pupitre lancée** (chantier 2), les réponses de Timothée sur « Ma
  partition » étant consignées : session « AP · Planche du pupitre (entrée des musiciens) », Opus, un `/planche`,
  livrables `docs/planches/planche-pupitre-musicien.html` et `docs/spec-entree-musiciens.md`. Ce n'est pas un
  chantier de code (hors règle des trois). À 23 h 01 : trois chantiers codent (retouches T7 et T4, deux exemples
  T1, AO FS-F) ; « Ma partition », Harmonie H1 et comptage T3 attendent, dans cet ordre.
