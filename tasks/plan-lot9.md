# Plan : go du 17/09/2026 — lot 9 Harmonie, lot 1b, index A–Z, capo, heure

Go de Timothée (17/09/2026) : « Fait le lot 9 en entier, le lot 1b sans le
sheet, fait la finition index A–Z, on retire l'idée du capo conseillé. Le
format de l'heure en 12:00 ».

Specs : `docs/spec-harmonie.md` (lot 9), `docs/spec-planning-petits-lots.md`
(1b), `docs/spec-look.md` D7 (index A–Z), `docs/spec-evenements-look.md` § 5
(heure). Le `tasks/plan.md` du lot 4 n'est pas touché (T6.2 et T6.4 y restent
ouverts) ; ce plan vit à part.

## Hypothèses posées (à corriger d'un mot)

1. **« Lot 1b sans le sheet »** = sans attendre le nouveau fichier de
   Christelle : on lit le bloc **« PETIT DÉJEUNER 2026 »** qui existe déjà
   dans l'onglet `Franco_Table_PtD` (colonnes 17 DATE / 18 NOM pour janvier →
   juin, 19 DATE / 20 NOM pour juillet → décembre), jamais lu jusqu'ici. Le
   jour où le fichier à part arrive, seul le parseur change.
2. **« Finition index A–Z »** : les trois points de D7 (lettre sous le doigt,
   barre du haut fixe, marge de défilement) ont été codés dans la tranche T0
   du lot 4 (15/09, commit `de882b7`, `tests/songs-index.spec.ts` §
   « finitions (lot T0) »). Reste à le **vérifier sur les trois appareils** et
   à corriger la ligne périmée de la feuille de route. Si un point manque, il
   est codé ici.
3. **« Format de l'heure en 12:00 »** = on garde l'écriture du site partout,
   la maquette ne l'emporte pas. Décision à inscrire, rien à coder sauf si un
   « 12h00 » traîne quelque part.
4. **Fiches d'harmonie** : le go couvre leur publication. **Fait autrement que
   prévu** : pas de `content/harmonie/*.json` intermédiaire — le build lit
   directement `docs/harmonie/*.md`, là où Timothée relit, et n'a donc qu'une
   source. Chaque fiche garde son `Statut` : tant qu'il n'est pas `validée`,
   elle s'affiche avec une étiquette « à relire ». Changer ce mot dans le `.md`
   suffit, sans toucher au code.
5. **中文 des fiches** : la spec le range **après** la validation du français
   (H0). Les libellés de l'app et le vocabulaire structuré (sensations,
   moments, niveaux) sont bilingues tout de suite ; le corps des 69 fiches
   reste en français jusqu'à la validation. Ce n'est pas un raccourci : c'est
   la décision du 17/09.

## Décisions d'architecture

- **Fiches = données de build.** `docs/harmonie/*.md` (la seule source, celle
  de la relecture) → `public/harmonie-index.json` par `npm run build:index`,
  avec les exemples du répertoire calculés en parcourant les `.cho`. Même
  chaîne que `songs-index.json` : rien de nouveau à apprendre. Un mot de
  vocabulaire inconnu **arrête le build** plutôt que de passer inaperçu.
- **Règles = degrés, pas accords.** Une règle se lit sur la suite des degrés
  d'une section ; elle vaut donc dans toutes les tonalités et sur les deux
  instruments. `src/lib/harmonie/degres.ts` s'appuie sur `transpose.ts`.
- **Accès** : `canUseHarmonie(profile, planning)` dans `access.ts` → `{ piano,
  guitare }`, d'après les colonnes Piano / Guitare des plannings + admins.
  Aucune règle Firestore pour le catalogue (fichiers publics) ; règles pour les
  rejets et les idées (H2, H3).
- **Un seul passage (MV)** : on réutilise `materializeSectionCopy` d'Adapter,
  pas un second mécanisme. `VersionItem` gagne `sectionOrigins`.
- **简谱** : les retouches vivent sur l'item / la version
  (`jianpuChords`), jamais dans `chords.json` (calques gelés).

## Tâches

### Bloc A — Décisions et vérifications (avant le code)
- [x] A1 Index A–Z : `tests/songs-index.spec.ts` vert sur les trois appareils
- [x] A2 Capo conseillé retiré : feuille de route § 2 et § 5, vision, mémoire
- [x] A3 Heure « 12:00 » tranchée : `spec-evenements-look.md`, vérif qu'aucun
      « 12h00 » ne traîne dans le code ou les locales
- [x] Commit A — **non** : le projet commite sur demande de Timothée seulement

### Bloc B — Lot 1b, petit déj (S)
- [x] B1 Test rouge : `tests/planning-petit-dej.spec.ts` (Ce dimanche rempli /
      vide, Mes services, rappel FR + 中文, noms « A & B » séparés)
- [x] B2 `sheets.ts` : `fetchPetitDej()` (deux blocs date/nom, « & » → deux noms)
- [x] B3 `names.ts` : `petitDej` dans `PlanningData`, `findMyServices`,
      `servantsForDate` ; `reminderMessage.ts` : libellé FR / 中文
- [x] B4 `planning/page.tsx` : ligne « Petit déj » dans Ce dimanche si remplie
- [x] B5 Vert 3 appareils ; tsc ; lint ; captures ; commit B

### Bloc C — H1, catalogue Harmonie (L, découpé)
- [x] C1 `content/harmonie/*.json` (69 fiches) + `scripts/build-harmonie.ts`
      appelé par `build:index` → `public/harmonie-index.json`
- [x] C2 `access.ts` : `canUseHarmonie` + test
- [x] C3 Page `/harmonie` : liste, filtres sensation × moment × niveau,
      « Par où commencer »
- [x] C4 Page `/harmonie/[fiche]` : avant → après, tonalité, piano / guitare,
      capo, diagrammes, exemples du répertoire
- [x] C5 Entrée dans l'onglet Chants ; invisible pour les autres
- [x] C6 Vert 3 appareils ; captures ; commit C

### Bloc D — MV, « Seulement ce passage » (M)
- [x] D1 Test rouge (retouche d'une section répétée, version partagée)
- [x] D2 `setlistVersions.ts` + `editSource.ts` réutilisé + feuille d'édition
- [x] D3 Vert 3 appareils ; commit D

### Bloc E — 简谱, retoucher un accord sur le scan (M)
- [x] E1 fait (agent) : 6 tests, vus rouges d'abord
- [x] E2 fait (agent) : `JianpuChordSheet`, `retouches.ts`, historique
- [x] E3 fait (agent) : planche d'audit regardée (1400 px et 390 px), 18 tests × 3

### Bloc F — H2, suggestions par chant (L)
- [x] F1 Règles des familles 1 à 8 (`regles.ts`) + tests purs
- [x] F2 Feuille « Idées d'harmonie » : 5 + « Voir plus », surlignage
- [x] F3 branché dans la setlist : « Essayer dans Ma version », « Appliquer à la setlist », message « À reporter sur la partition 简谱 », bandeau de modulation au-dessus d'un scan
- [x] F4 « Ne marche pas sur ce chant » (Firestore + règles)
- [x] F5 Vert 3 appareils (168 tests) ; pas de commit (sur demande)

### Bloc G — H3 idées de l'équipe, H4 transitions (M)
- [x] G1 Idées : ajout, modification, suppression, « nouveau » par appareil
- [x] G2 Transitions entre chants (lecture seule, setlist)
- [x] G3 Vert 3 appareils ; pas de commit (sur demande)

### Bloc H — Livraison
- [x] H1 **Suite complète : 1331 verts, 8 sautés** (18/09/2026, 11,5 min) ;
      `tsc` propre (hors type généré périmé de `.next`), lint 0 erreur,
      `npm run validate` : 370 chants valides. Les 2 rouges du run complet
      (historique, tablette, fenêtres de 15 min) repassent verts seuls :
      saturation de `next dev`, pas une régression (25/25 sur tablette)
- [x] H2 Specs à jour (`spec-harmonie`, `spec-planning-petits-lots`, `spec-setlist`, `spec-mode-louange`, `spec-evenements-look`), feuille de route (§ 1, § 2, § 5, journal) et vision
- [x] H3 `firestore.rules` : bloc `harmonie/{chant}` ajouté — **à publier par Timothée**

## Risques

| Risque | Portée | Parade |
| --- | --- | --- |
| Les règles automatiques proposent des bêtises (pas de mélodie) | Moyenne | Étiquette « À vérifier en jouant » ; sûreté par règle ; « Ne marche pas » |
| Retouche d'un accord sur un scan : calques gelés | Haute | On n'écrit jamais `chords.json` ; audit visuel obligatoire |
| `sectionOrigins` dans Ma version casse les versions existantes | Haute | Champ facultatif ; lecture compatible ; tests de `spec-version-perso` rejoués |
| Index de l'harmonie lourd côté navigateur | Faible | Fiches sans exemples volumineux ; comptage des setlists déjà en mémoire |

## Questions ouvertes

Aucune bloquante. Les hypothèses 1 à 5 ci-dessus suffisent pour avancer ;
une correction d'un mot suffit à les défaire.
