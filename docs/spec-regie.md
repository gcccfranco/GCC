# Spec : chantier Régie

Chantier n° 1 de `docs/intent/vision-site.md` (« Ordre des chantiers »).
Réalisation choisie par Timothée le 13/09/2026.

## Objectif

La régie (Sono et PPT) prépare les diapos **avant le culte, sur ordinateur**,
depuis la setlist. Elle doit pouvoir :

1. copier les paroles proprement vers PowerPoint ou Canva ;
2. voir le déroulé d'un coup d'œil et sauter à un chant ou une section ;
3. ranger le lien de la présentation dans la setlist.

## Ce qui est construit

### 1. Copie propre des paroles

- **Sélection à la souris** (partout où un chant s'affiche) : une ligne de chant
  par ligne collée, sans accords, **sans les noms de section**. Chinois : la
  ligne de caractères, puis sa ligne de pinyin, **même si le pinyin est masqué
  à l'écran**.
- **Bouton « Copier les paroles »**, seulement dans la **vue partitions de la
  setlist**, à côté du numéro de chaque chant (fusions comprises). Il copie les
  sections **dans l'ordre joué, reprises comprises**, avec **une ligne vide
  entre deux sections**. Il marche aussi quand le scan 简谱 remplace les paroles
  à l'écran (le texte vient du chant, pas de l'écran), et reprend la version
  adaptée du chant (`contentOverride`) quand elle existe.

### 2. Déroulé (sommaire latéral)

- Vue partitions de la setlist, **sur ordinateur seulement** (écran large) : une
  colonne fixe à gauche liste les chants numérotés et, sous chacun, ses sections
  dans l'ordre joué.
- Un clic amène au chant ou à la section. Le chant en cours de lecture est
  surligné. Rien ne change sur téléphone ni tablette.

### 3. Lien de présentation

- Champ `presentationUrl` sur la setlist. **Tout lien `https://`** est accepté
  (Canva, Google Slides, PowerPoint en ligne…).
- Affiché dans l'en-tête de la setlist : bouton « Présentation », ouvert dans un
  nouvel onglet. **Visible par tout membre qui voit la setlist.**
- Peuvent l'ajouter, le changer ou le retirer :
  - la **régie inscrite au planning ce jour-là** (colonnes Sono et PPT ; Campus :
    colonne régie de la séance) ;
  - ceux qui peuvent déjà modifier la setlist ;
  - les admins.
- L'écriture passe par une route serveur (`POST /api/setlist/presentation`) :
  elle seule peut lire le planning pour vérifier la régie du jour. La régie est
  reconnue par le **nom de planning de son profil**.
- Le bouton « Ajouter » s'affiche pour les membres qui ont le rôle régie dans la
  catégorie ; le serveur tranche (message clair si la personne n'est pas de
  service ce jour-là).
- Ajouter le lien **ne compte pas comme une modification** de la setlist
  (`updatedAt` inchangé : pas de repère « setlist mise à jour »).
- Dupliquer une setlist ne recopie pas le lien.

## Commandes

```bash
npx tsc --noEmit
npm run lint
npm test -- tests/copy-lyrics.spec.ts tests/setlist-regie.spec.ts
```

## Tests (Playwright)

- `tests/copy-lyrics.spec.ts` : sélection FR et ZH (pinyin), sans noms de section.
- `tests/setlist-regie.spec.ts` : page setlist avec connexion Firebase et
  Firestore **simulés** (`tests/helpers/fakeSession.ts`, aucune écriture en
  production) : bouton de copie, sommaire, lien de présentation.
- Règle d'autorisation du lien testée comme fonction pure.

## Limites

- Toujours : un chant FR + un chant ZH dans les tests ; permissions en double
  (`src/lib/access.ts` et commentaire de `firestore.rules`).
- Demander avant : toute retouche du mode louange, du PDF, du style d'ensemble
  (chantiers suivants).
- Jamais : écriture dans le Firestore de production depuis les tests.

## Critères de réussite

- Un couplet FR sélectionné et collé donne ses lignes, sans accords ni « COUPLET 1 ».
- Un chant ZH copié donne caractères puis pinyin, ligne par ligne, pinyin affiché ou non.
- Le bouton copie un refrain repris deux fois, séparé par des lignes vides.
- Sur un écran ≥ 1280 px, le sommaire liste chants et sections et y amène au clic.
- Un lien ajouté apparaît dans l'en-tête ; un lien non `https://` est refusé.
