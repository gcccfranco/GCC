# Spec — Corrections du design (lot CD)

**Date** : 03/11/2026 · **Origine** : audit du design (`docs/audit-design-2026-11-02.md`) et dix-sept planches de
corrections (`docs/planches/planche-corrections-*.html`, publiées en artefact).
**Décision de Timothée (03/11/2026)** : « comme recommandé pour tout ». Chaque constat retenu prend la proposition
marquée « recommandée » sur sa planche ; les quatre préférences du matin (surface C, contrôles B, titres C, halos B)
deviennent des décisions. **Go donné le même jour**, avec ces consignes : sur une **nouvelle branche**
(`claude/corrections-design`), commits et push **sur cette branche seulement**, rien sur `main`.

Le détail constat par constat est dans `docs/spec-corrections-design/<groupe>.md` (17 annexes, 204 entrées) : décision,
consigne de code avec `chemin:ligne`, critères, test. Cette page-ci fixe ce qui les relie : l'ordre, les arbitrages
entre annexes, les règles communes.

## 1. Tranches

Une tranche = un commit sur `claude/corrections-design`, après `/tranche` (executant → testeur → corrections →
relecteur) et, pour toute tranche qui change l'apparence, `critique-design` sur les captures des quatre dispositions
(plus 1 440 px pour une page de lecture). Tests sur les trois appareils ; les specs d'agencement sur les cinq projets.

| Tranche | Contenu (entrées « Tranche : T1 » des annexes, sauf mention) |
|---|---|
| **T1a** Navigation commune | `partout` (sélecteur d'espace, icône Musiciens, 我的服事), `back-office-1`, `dimanche-20`, `evenements-app-6` (retour à 44 px), `back-office-8` + `equipes-app-1` (fusionnés), règle 44 px (§ 3) |
| **T1b** Titres et halos | `partout-q1` (casse normale sur la page chant, capitales en mode louange), `partout-q2` (halos : seulement ceux qui portent une couleur de service ou de section ; le lavis du chant et de la liste des chants part), `tests/halo-partout.spec.ts` adapté |
| **T1c** Chants | `chants.md` (T1) |
| **T1d** Le dimanche | `dimanche.md` (T1), dont le mode louange |
| **T1e** Quotidien, Église, Musiciens | `quotidien.md`, `eglise.md`, `musiciens.md` (T1) |
| **T1f** Compte, services, App | `compte.md`, `services.md`, `equipes-app.md`, `evenements-app.md` (T1) |
| **T1g** Plannings et Harmonie | `plannings.md`, `harmonie.md` (T1) |
| **T1h** Back-office | `back-office.md`, `bo-equipes.md`, `bo-evenements.md`, `bo-messages-planning.md`, `bo-reunions-taches.md` (T1) |
| **T2a / T2b** Recette de surface C | `partout.md` § surface : jetons et trois écrans pilotes (accueil téléphone, setlists téléphone, À faire 1 280) regardés à l'œil, puis le reste (`.raised`, `shadow-soft`) |
| **T3a / T3b / T3c** Contrôles jeu B | `partout.md` § contrôles, puis les entrées T3 des annexes |
| **T4a / T4b** Typographie et largeurs | `partout.md` § échelle B, P12/P13, L1, puis les entrées T4 |
| **T5** Contenu chinois | captures du guide en 中文 (`eglise-5`, repli C), bandeau d'Harmonie (`harmonie-5`) |

Les tranches T1 se codent dans l'ordre ; T2 à T5 dans l'ordre aussi, chacune après la précédente (T5 en dernier pour
ne pas refaire les captures du guide).

## 2. Arbitrages entre annexes (relecture de cohérence du 03/11/2026)

Quand deux annexes touchent le même code, **ceci fait foi** :

1. **Sans compte** (`SansCompte.tsx`) : `bo-equipes-12` (liste de lecture) en T1 ; la feuille « Relier » de
   `bo-messages-planning-5` sort du lot (spec à part). Le lien de retour `toutesLesPersonnes` est repris dans T1.
2. **Interrupteur Piano | Guitare** : `musiciens-3` (garder celui de la liste, retirer celui de la fiche) ; `harmonie-9`
   abandonnée ; `musiciens-2` (T3) s'aligne sur `musiciens-3`.
3. **Segmenté « Équipes · Musiciens »** : rail (`OngletsRail`), comme `back-office-7` ; `bo-equipes-5` et
   `partout.md` sont corrigés en ce sens.
4. **Bouton `outline` en sombre** : `back-office-3` seul (fond `--pose` `#3a3a3c`), en T1 ; `bo-messages-planning-6` ne
   garde que l'« Annuler » de Notifier, traité par l'arbitrage 8 ; `button.tsx` n'est changé qu'une fois.
5. **Segment actif** : un seul jeton, `--pose` (`#3a3a3c` en sombre), pour `SelecteurEspace` et le curseur d'`Onglets` ;
   la valeur `#636366` de `quotidien-14` est abandonnée.
6. **Sélecteur d'espace** (`SelecteurEspace.tsx`) : une seule entrée fusionnée en T1a — ordinateur selon `chants-1` A
   (segments `flex-auto min-w-0`, 8 px, 12 px semi-gras), téléphone selon `back-office-1` C (icônes pour les espaces
   non choisis, libellé pour l'espace courant), icône Musiciens `Drum` (import ligne 13), ombre selon `back-office-3`.
7. **Colonne de droite du Back-office** (`ColonneDroite.tsx`) : `bo-messages-planning-4` ; `compte-9` supprimée.
8. **« Annuler » de Notifier** : `compte-12` (« Effacer », conditionnel) ; « Envoyer » désactivé suit la règle globale
   `disabled:bg-secondary` de `bo-reunions-taches-16`.
9. **Grille de planning** (`PlanningGrille.tsx`) : `plannings-1`, plus la pastille « Cette semaine » de
   `bo-messages-planning-1`.
10. **Avis « contenu en français »** : `harmonie-5` (composant unique, T5) ; `musiciens-10` et `partout-q3-harmonie`
    y renvoient.
11. **Setlists** (`dimanche-21`) : suit `partout.md` — « Tous les services », « Sélectionner » en texte souligné.
12. **Formulaires** : `partout.md` dit lesquels passent au `Menu` (T3) ; `TacheForm` en fait partie (`bo-reunions-taches-12`).
13. **`EvenementForm`** : `evenements-app-5` se livre après `bo-reunions-taches-13` (composant `Champ`), même tranche T1f/T1h
    dans cet ordre, ou fondu dans T1h.
14. **`ModifierClient.tsx`** : `bo-reunions-taches-9` pour les réunions, `evenements-app-8` pour les évènements, dans la
    même tranche.
15. **Panneau de marque de la connexion** : `partout-q2` (halos retirés, fond uni) ; `eglise-12` réduite au `py-8` → `py-6` ;
    `compte-14` (panneau caché sous `lg` à l'inscription) gardé.
16. **`RangeeAFaire.tsx`** : `compte-10` (la ligne « Relier » devient un lien) ; `back-office-9` ne garde que « Fait ».
17. **`BandeauEquipes.tsx`** : `back-office-5` ne livre que le dessin des flèches ; l'index suit `bo-equipes-5` (T3).
18. **Doublons à coder une fois** : `chants-7` = `dimanche-20` (icône) ; `evenements-app-4` = `bo-reunions-taches-7`
    (`textarea` aligné sur `input`, `py-2.5`) ; `eglise-5` = `partout-q3-guide` ; `back-office-9` (retour) =
    `evenements-app-6`.
19. **Dépendances vers T3** : `bo-reunions-taches-10`, `-20` et `bo-equipes-6` se livrent en T1 pour le clair, le sombre
    suit `--pose` (arbitrage 5) ; `chants-5` se scinde (`5a` T1 boutons, `5b` T3 menu « Thème ») ; `quotidien-10` garde un
    actif noir seulement si c'est de la navigation (règle § 3).
20. **`equipes-app-1`** : vérifier avant de coder que le libellé ajouté à `labelDeSection` ne touche pas une zone gelée
    (`docs/audit-ui-apple-design.md` § 2) ; sinon, s'en passer.

## 3. Règles communes

- **Cible de 44 px** : pseudo-élément `::after` (jamais `::before`), appliqué au toucher (`@media (pointer: coarse)`), sur
  le modèle existant de `TOUCHER_44` ; une seule définition, utilisée partout.
- **Actif noir** (`--primary`) = navigation (barre du bas, barre latérale, onglet de section) ; un choix dans un segmenté
  utilise le curseur `--pose`.
- **Zones gelées** intouchables (`docs/audit-ui-apple-design.md` § 2) : couleurs des services, des accords, du 简谱 et
  des sections, logo, intérieur du calque 简谱, export PDF.
- **Deux langues** : tout libellé nouveau a sa clé dans `src/locales/fr.json` et `zh-CN.json` ; toute traduction chinoise
  nouvelle est marquée à faire relire par un lecteur de 中文 dans le commit. `python3 scripts/build-fonts.py` après
  tout ajout de texte chinois.
- **Tests** : une spec existante qui lit l'ancien rendu s'adapte dans la même tranche (les annexes les nomment) ; aucun
  test n'est désactivé ni affaibli.
- **Interrupteur `BACK_OFFICE`** : rien ne change de ce côté.

## 4. Points restés ouverts dans les annexes

Chaque annexe liste en tête ses points « à confirmer au code » (largeurs Mac / Windows, valeur de `--shadow-flottant`,
mécanisme du plancher P13, clé `songs.list.filterThemeNom`…). La tranche concernée les tranche au moment de coder et le
dit dans son commit.

## État

**Méthode, accordée par Timothée le 03/11/2026 (« oui pour 1, 2, 3, 4 »)** : `/tranche` attend la fin de Playwright, ne
relance que les specs rouges, borne les specs voisines à quatre (lues par texte) ; les petites tranches se groupent (T1b
fait un seul passage avec la suivante quand c'est possible) ; T1c, T1e et T1g tournent dans des sessions parallèles.

### T1a · Navigation commune — fait
- Sélecteur d'espace : segments de la barre latérale resserrés (`flex-auto min-w-0`, `px-2`, 12 px, 30 px) ; au
  téléphone (< 640 px), icône seule de 36 px pour les espaces non courants ; Musiciens en `Drum` ; rail réduit : filet de
  1 px × 32 px sous les espaces, actif sans ombre (chants-1, chants-7, back-office-1, dimanche-20).
- « Moi » allumé sur `/equipes` et ses fiches, retour « ‹ Moi » sur l'index Équipes de l'App, marque « GCC Équipes » /
  « GCC 团队 » (clé `common.header.equipes` créée) (back-office-8 + equipes-app-1, arbitrage 20 : la liste des labels
  s'étend d'une entrée, comportement inchangé).
- Retour « ‹ … » : zone de 44 px au toucher (evenements-app-6 = volet retour de back-office-9).
- Règle des 44 px : une seule définition, `src/lib/toucher44.ts` (`TOUCHER_44`, `TOUCHER_RETOUR`, `TOUCHER_SEGMENT`), en
  `::after` sous `[@media(pointer:coarse)]` ; l'ancien `songs/[slug]/_components/toucher44.ts` (en `max-sm:` et
  `::before`) est supprimé, ses trois usages pointent sur le module partagé.
- zh-CN : `setlists.list.myServicesFilter` 我的服侍 → 我的服事 (partout-servir).
- **Tranché au code** : un écran Tailwind `coarse` brut fait disparaître toutes les variantes `max-*` (Tailwind 3.4) →
  variante arbitraire ; la pastille glissante de back-office-1 n'est pas faite (fondu `duration-150` gardé) ; au-dessus
  de 640 px la barre du haut ne change pas (`max-sm:gap-2`).
- **Écarts / reste** : `SetlistDetailClient.tsx` garde sa propre copie de l'ancienne recette 44 px (`max-sm:` +
  `::before`), à ramener sur `src/lib/toucher44.ts` (T3) ; d'autres occurrences de 服侍 restent dans `zh-CN.json` hors de
  la clé visée ; largeurs des segments mesurées sous Linux seulement (Segoe et SF à regarder).
- **Échecs connus, déjà rouges sur la base `da0b3ef`** : `tests/navigation-grand-ecran.spec.ts:52` (« un retour sur la
  page relance une seule requête de notifications », 0 au lieu de 1, cinq projets). Courses vues sous charge, vertes
  seules : `organigrammes-groupes.spec.ts:816`, `reunions.spec.ts:268`, `:274`. Lint : deux `require("node:fs")` des specs
  de captures de l'audit design passés en `import` (erreurs antérieures à la tranche).

### T1b · Titres et halos — fait
- Page chant : titre en casse normale, `tracking-[-0.02em]` ; mode louange et PDF gardent les capitales (partout-q1).
- Halos (partout-q2, décision B ; point à confirmer n° 1 tranché : chant et liste des chants partent) : retirés de
  `HaloParDefaut` (supprimé, avec `.halo-defaut` et `--halo-back-office`), Moi, Équipes, guide, questionnaire,
  organigramme, chant, liste des chants (`--halo-chants`), setlists ; `Halo.tsx` ne garde que `page` et `fiche`.
  Restent : Planning, fiche de setlist, scène des évènements (dans le code, le calendrier et les fiches d'évènements
  n'en avaient déjà pas). Une règle `:root:not(:has(.halo:not(.barre-halo))) .barre-halo { display: none }` empêche
  toute copie sous les barres d'une page sans halo.
- Connexion : panneau de marque uni, `--secondary / 0.5` posé sur `--background` (la teinte seule laissait
  transparaître deux blocs derrière le panneau `sticky`, vu à 1 440 px).
- Tests adaptés : `halo-partout`, `look-halo`, `look-halo-defilement`, `look-louange` (titre `none` sur la page,
  `uppercase` sur la scène, qui est un `h2`), `navigation-grand-ecran` (halo mesuré sur Planning), `look-barres`
  (premier affichage sans React : aucune copie de halo sous la navbar), `agencement-v18-fondations`, `helpers/agencement`.
  `look-louange` : la barre de la setlist se mesure à l'arrêt (course de sous-pixel sous charge, 31,999996 px).
- **Écarts** : en clair, le panneau de marque a presque le gris de la barre latérale (critique : finition) ; valeur
  de la spec gardée. Aucun test ne prouve que « Proposer un chant » redevient `#1c1c1e` (rien ne le teinte plus).

### Découpage parallèle (03/11/2026)
T1c, T1e et T1g tournent dans trois sessions parallèles. `musiciens.md` passe de T1e à T1g : elle partage `Catalogue`,
`EnTeteHarmonie`, `FicheHarmonie` et `SommaireCours` avec `harmonie.md`. T1e = `quotidien.md` + `eglise.md`.

### T1c · Chants — fait (`6b9cd5a`, session parallèle)
- chants-2, -3, -4, -5a, -8 (trois blocs en volets, tablette debout à 28 px), -9, -10, -11, -14 ; chants-5b et chants-6
  restent en T3. Clés nouvelles : `customize.panel.keyCourt`, `stats.aucuneSetlistPeriodeTitre`, `stats.voirDepuisDebut`
  (zh à faire relire).
- **Tranché au code** : « Nouveaux au répertoire » prend toute la ligne dès 520 px de contenu ; la racine de « Choisis un
  chant » perd son `pr` (marge comptée deux fois) ; en deux volets tactiles, 6 px de tolérance sur `scrollWidth` (zone
  `::after` de 44 px), aucune au téléphone. Critique prise : au téléphone « Statistiques » devient un lien texte comme
  « Proposer » ; 4 px entre les pastilles Accords et Pinyin actives ; « Ton » se coupe avant la lettre.
- **Écarts** : ♩ petit et suivi d'un vide sous Linux (police de repli), à regarder sur un vrai téléphone ; `EtatVide`
  `role=status` englobe le bouton (finition) ; les états vides `tousJoues`, `choisirDebut`, `aucunARedecouvrir` restent en
  carte ; `stats.aucuneSetlistPeriode` est du code mort (signalé, non supprimé).
- **Question pour Timothée** : « 调 D » ou l'usage « D调 » ?
