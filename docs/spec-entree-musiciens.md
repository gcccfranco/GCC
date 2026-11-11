# Entrée des musiciens : le pupitre (demande AP, chantier 2)

**Statut : planche en cours (11/11/2026). Pas de spec de code, aucun code.** La spec s'écrit après les réponses de
Timothée aux questions de la planche, le code après un go (CLAUDE.md, « Design », « Go », « Coder »).
Planche : `docs/planches/planche-pupitre-musicien.html`. Cadrage d'ensemble : `docs/spec-pupitre-musicien.md`
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

À remplir après la planche.

## Avancement

- 11/11/2026 (nuit) : code relu, huit captures prises, `/planche` lancé (sujet `pupitre-musicien`).
