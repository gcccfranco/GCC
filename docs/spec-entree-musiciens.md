# Entrée des musiciens : le pupitre (demande AP, chantier 2)

**Statut : planche acceptée par Timothée (12/11/2026, « ok pour tout ») ; spec à écrire. Pas de spec de code, aucun code.** La spec s'écrit après les réponses de
Timothée aux questions de la planche, le code après un go (CLAUDE.md, « Design », « Go », « Coder »).
Planche : `docs/planches/planche-pupitre-musicien.html` (artefact privé : https://claude.ai/artifact/N8qza1nQJVjzPtdFf9ek7H). Cadrage d'ensemble : `docs/spec-pupitre-musicien.md`
(§ Chantiers proposés, ligne 2).

## Demande (Timothée, 11/11/2026, point 4 de sa liste)

« Les musiciens passent par le mode louange : onglet Setlists à revoir, les trois affichages à revoir, export PDF
retiré pour eux. »

Cadrage du chantier 2 : l'entrée des musiciens, **une seule commande pour rôle + affichage + disposition**, point
d'entrée des idées d'harmonie en répétition et des accords en chiffres ; planche sur l'état AO.
Réponses de Timothée qui s'y rattachent : les musiciens adorent forScore, on gagne si la partition s'ouvre aussi vite ;
export PDF retiré aux musiciens « je pense que oui », **à confirmer ici** (qui le garde ?). L'export PDF lui-même
reste gelé.

Déjà décidé, sur quoi la planche construit : piste A « Pupitre » de la vue Partitions (`spec-exemples-usage.md`,
tranches T1 à T5 en cours) ; mode louange sans aucune animation ; « Ma partition » (menu « Je lis » en tête de chaque
chant, `spec-ma-partition.md`) ; chiffres et idées d'harmonie en mode louange (`spec-harmonie-accords.md`, décisions
3 et 4, lots H5 et H6 qui attendent cette planche pour la place de la bascule).

## Ce que le code montre (tête de branche du 11/11/2026, `33b1cd4`)

1. **Onglet Setlists** (`src/app/setlists/page.tsx`) : trois onglets « À venir · Archives · Mes setlists », recherche,
   filtre « Mes services », menu des catégories, puis la liste ; rien n'y distingue un musicien d'un autre compte.
   En grand, l'aperçu à droite a déjà un bouton « Mode louange » (`src/components/setlists/ApercuSetlist.tsx:103`).
2. **Portes directes** : l'accueil (« Ton prochain service », `src/components/accueil/PourMoi.tsx:89`) et le détail
   d'un service (`src/components/mesServices/DetailService.tsx:150`) ouvrent `?louange=1`, un toucher.
3. **Page d'une setlist** (`src/app/setlists/[id]/SetlistDetailClient.tsx:1628`) : Présentation · Adapter ·
   Ma version · Modifier (ou « Dupliquer pour mes notes ») · PDF · ⋯ · Mode Louange ; au téléphone « Affichage »,
   « Accords », « Louange », ⋯ (`:1875`-`:1935`). Deux vues, Liste et Partitions.
4. **Export PDF** : bouton rond (`:1655`) et entrée du menu ⋯ (`:1925`), **sans aucune condition de droit** : tout
   compte qui voit la setlist l'exporte. Même chose sur la page d'un chant (`src/app/songs/[slug]/_components/ActionsChant.tsx:45`).
   `src/lib/access.ts` n'a aucune fonction sur le PDF.
5. **Droits voisins** (`src/lib/access.ts`) : `canEditSetlist` (:731) = créateur, admins, équipe de la setlist
   (`editeurs`) ; rôles de service `chanteur · musicien · presidence · regie` (`src/types/user.ts:1`) ; il n'existe
   pas de rôle « responsable de louange » : la présidence et l'équipe de la setlist en tiennent lieu.
6. **Mode louange, barre** (`src/components/performance/BarreHaut.tsx`) : Setlist · Repères · Je joue · (titre) ·
   Tempo · Annoter · Outils · Options d'affichage · Quitter ; au téléphone Outils passe dans Options.
7. **« Je joue »** (`PerformanceMode.tsx:1977`) réunit déjà le **rôle** (Pianiste, Guitariste, Présidence, Choriste,
   Batteur, Aucun ; badge « d'après le planning ») et l'**ordre des sections** (Ordre joué · Sections uniques ·
   Structure seule, `src/lib/partitionLayoutPref.ts`), plus « Masquer les paroles ». Il s'ouvre seul à la première
   entrée (« Choisis ce que tu joues, ton compte s'en souviendra »).
8. **La disposition** est ailleurs : menu « Options d'affichage » (`PerformanceMode.tsx:2147`, `ChoixDisposition`),
   cinq choix (Classique, Couleurs par section, Marge, Scène, Partition, `src/lib/dispositionPref.ts:15`), retenue par
   appareil ; le rôle est retenu par compte (`src/lib/performance/roleCompte.ts`), l'affichage par appareil.
   Trois réglages, trois mémoires, deux menus.
9. **Rôle → réglages** : `ROLE_PRESETS` (`PerformanceMode.tsx:352`) ne règle que accords et paroles ; il ne choisit
   ni l'affichage (sauf Batteur → Structure seule, `partitionLayoutPref.ts:4`) ni la disposition.
10. **Idées d'harmonie** : seulement sur la page de setlist (`IdeesDuChant`, `SetlistDetailClient.tsx:2026`) ;
    aucune bascule Lettres / Chiffres nulle part (lots H5, H6 non codés).

Chrome forScore du mode louange (lot FS d'AO) : codé, finitions en cours dans une autre session ; les captures
montrent la branche telle qu'elle est le 11/11 au soir.

## Captures de l'existant (compte simulé « Alix D. », pianiste ; `test-results/pupitre/`, non commitées)

Téléphone : onglet Setlists, page de setlist, mode louange (« Je joue » ouvert d'office). Tablette debout : les
mêmes, plus Options d'affichage. Tablette couchée : onglet Setlists, setlist. Ordinateur : setlist en deux volets.

## Pistes, recommandation, questions

Trois pistes (planche `docs/planches/planche-pupitre-musicien.html`) :

- **A. Le pupitre (recommandée)** : pour un musicien, l'onglet Setlists s'ouvre sur son prochain service, déjà « posé
  sur le pupitre » (les chants en rangées, un toucher ouvre le mode louange sur ce chant) ; « Plus tard », « Archives »
  et « Mes setlists » repliés dessous. Dans le mode louange, « Je joue » devient une pastille qui résume rôle, ordre et
  disposition (« Piano · Tout le chant · Classique ») et ouvre une seule feuille.
- **B. Le programme du culte** : mes services dans l'ordre du calendrier, comme un programme imprimé ; la commande unique
  est une phrase à trous (« Je joue piano, tout le chant, en classique »), chaque mot se touche.
- **C. La setlist au sol** : grosses rangées lisibles à un mètre ; deux affichages au lieu de trois ; barre basse à trois
  segments sous le pouce.

Questions posées à Timothée (propositions de la planche, corrigées par la critique) : qui garde l'export PDF ; le PDF
sur la page d'un chant ; ce qui le remplace pour un musicien (hors-ligne d'office) ; l'onglet du musicien ; les trois
affichages renommés ; où vit la commande unique ; le rôle règle les trois ; la feuille « Je joue » à la première
entrée ; place de 字母/数字 et des idées d'harmonie ; couleur par défaut des icônes du mode louange.

Fait vérifié pour la spec : l'export PDF est produit dans le navigateur (`SetlistDetailClient.tsx:780`-`830`, import
dynamique de `@/components/pdf/*`), sans route API : le retirer aux musiciens masque le bouton, sans protection serveur.

## Décisions de Timothée (12/11/2026, « ok pour tout »)

Piste **A « Le pupitre »** et les quatorze propositions de la planche (version republiée le 12/11). Ce n'est pas un go
de code : la spec vient d'abord, puis « go pour la tranche N ? ».

1. **PDF d'une setlist** : réservé à qui peut la modifier (`canEditSetlist` : créateur, équipe, admins) et à la
   présidence du service ; un musicien qui crée la setlist de son groupe le garde. Masquage seulement (PDF produit dans
   le navigateur, aucune route API).
2. **PDF d'un chant** : admins et membres de l'équipe d'au moins une setlist à venir ; le bouton disparaît sinon.
3. **À la place du PDF** : rien à toucher ; les setlists de ses services gardées hors-ligne d'office, « Prêt hors-ligne »
   (已可离线使用) dans le bloc du pupitre.
4. **Onglet Setlists** : bloc « Mon prochain service » en tête pour toute personne inscrite au planning (« Jouer »
   dedans, chants en rangées au téléphone, en vignettes dès la tablette) ; l'onglet actuel dessous, entier ; « + »
   toujours visible pour qui peut créer ; aucun bloc sans service planifié.
5. **Trois affichages renommés** : « Tout le chant » (完整顺序), « Chaque section une fois » (每段一次), « Plan du
   chant » (只看结构).
6. **Disposition déplacée** d'« Options d'affichage » vers « Je joue » (révise la décision 10 d'AO) ; Options garde
   « Sur la page », « Couleur des accords », texte, thème, métronome, couleur des icônes.
7. **Le rôle règle aussi l'ordre et la disposition** (Batteur : Plan du chant ; Pianiste, Guitariste : Tout le chant et
   Classique ; Présidence, Choriste : paroles seules) ; un choix manuel gagne jusqu'au prochain changement de rôle.
   Mémoire : rôle et ordre par compte, disposition par type d'appareil.
8. **Première entrée** : si le planning donne le rôle, une ligne « Réglé pour piano d'après le planning. Changer »
   (sans animation) au lieu du popover ouvert (révise FS-C et RP) ; le popover ne s'ouvre seul que si le planning ne
   dit rien.
9. **Lettres | Chiffres** (字母 | 数字) dans « Outils », sur la ligne de la tonalité (place de la bascule du lot H5).
10. **Rond « Idées »** dans « Sur la page », après « Paroles », éteint par défaut (point d'entrée du lot H6).
11. **« ‹ Toutes mes setlists »** en tête du menu Setlist : services à venir, les miens d'abord ; ouvre la setlist sur
    son premier chant, sans animation ; hors-ligne, seulement les setlists gardées sur l'appareil.
12. **« Jouer »** en encre sur l'onglet ; couleur du service seulement sur l'écran d'un culte (règle 5C1).
13. **Vignette 简谱 en sombre** : scan inversé et atténué, à regarder sur appareil avant la tranche.
14. **Libellés chinois** nouveaux à faire relire par un locuteur.

Également acquis (non questionnés, dits sur la planche) : « Couleur des accords » reste dans Options ; sur ordinateur,
le bloc du pupitre occupe le volet de droite (l'aperçu actuel). Non dessinés, à traiter dans la spec : Outils au
téléphone, tablette couchée hors piste A, compte sans service, « Toutes mes setlists » hors-ligne.

## Avancement

- 11/11/2026 (nuit) : code relu, huit captures prises, `/planche` lancé (sujet `pupitre-musicien`).
- 11/11/2026 (nuit) : `/planche` rendu (trois pistes, A recommandée) ; critique « à retoucher » (accent pétrole = couleur
  du culte, chrome bleu = choix par appareil, vignettes illisibles au téléphone, tablette couchée absente) ; une reprise lancée.
- 12/11/2026 : reprise faite (13 corrections : « Jouer » suit la règle 5C1, couleur des icônes du mode louange = choix
  existant, culte à six chants partout, rangées sans vignette au téléphone, pastille longue et sa troncature, mesures
  qui départagent, cadre 中文, tablette couchée de A en clair et en sombre). Relue sur les quatre dispositions, publiée
  en artefact privé, questions posées. Mesures : six chants sur six au premier écran à 390 px pour A et B, C à −4 px ;
  touchers pour changer l'ordre A 3, B 4, C 2 ; réglages lisibles sans rien ouvrir A 1/3, B 0/3, C 3/3.
  **En attente des réponses de Timothée** ; ensuite la spec, puis le go.
- 12/11/2026 : deux remarques de Timothée. (1) « Des fois des musiciens doivent créer des setlists » : vérifié, un
  musicien crée dans ses lieux (`access.ts:641`, `:666`) ; plus d'onglet « musicien » opposé à « responsable », le
  pupitre se montre en tête pour qui sert, le + reste visible. (2) « Base-toi sur le mode louange forScore » : la
  pastille qui remplaçait « Je joue » et la question sur la couleur des icônes sont retirées ; la commande unique devient
  le popover « Je joue » de FS-C enrichi de la disposition ; Lettres | Chiffres dans Outils ; rond « Idées » dans
  « Sur la page » ; « Toutes mes setlists » en tête du menu Setlist. Reprise de la planche lancée (un maquettiste).
- 12/11/2026 : planche reprise et republiée (même artefact). Pupitre en tête de l'onglet pour qui sert, + toujours
  visible, cadres de création d'une setlist ; barre FS commune, « Je joue » = rôles + ordre + disposition ; Lettres |
  Chiffres dans Outils ; rond « Idées » après « Paroles » (FS-F) ; « Couleur des accords » (CA) dans Options ;
  « Crayon » ; « ‹ Toutes mes setlists » dans le menu Setlist ; pistes B et C réduites à l'onglet. Mesures : seul l'onglet
  diffère (A 6/6 chants et un service de la liste visibles à 390 px, B 6/6, C 5/6). Quatorze questions posées.
  **En attente des réponses de Timothée.**
- 12/11/2026 : Timothée répond « ok pour tout » : piste A et les quatorze propositions (§ Décisions). Prochaine
  étape : la spec (tranches), puis un go par tranche.
