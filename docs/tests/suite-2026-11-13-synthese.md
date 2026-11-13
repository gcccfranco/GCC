# Suite complète du 13/11/2026 — synthèse (pilote)

Huit bilans (`suite-2026-11-13-part-*.md`), tous sur serveur sain. Rien n'a été corrigé.

| Total | Passés | Sautés | Instables (passent au rejeu) | En échec |
|---|---|---|---|---|
| 22 735 | 20 285 | 2 255 | 101 | 94 |

Les 5 tests de frontière (`pupitre-partitions` ordinateur, `acces-migration` tablette) ont tourné : 0 échec.
Les 94 échecs sont **31 tests distincts dans 16 specs**, comptés une fois par appareil. Aucune correction sans go.

## Échecs par page (cause probable entre parenthèses : hypothèse, pas un diagnostic)
1. **Historique d'une setlist** — `setlist-history.spec.ts` (25 tests sur ordinateur, dont :200, :215, :495 aussi sur
   téléphone et tablette) et `harmonie-jianpu.spec.ts:110` (trois appareils) : bouton « Modifiée par … » introuvable.
   (Une seule cause : ce bouton a changé ou a disparu.)
2. **Libellés de sections** — `section-labels.spec.ts:11, :19, :31` (trois appareils) : liste de sections différente.
3. **Régie, « Copier les paroles »** — `setlist-regie.spec.ts:57` (puce de 44 px au lieu de 32) et `:62` (bouton
   « Copié » introuvable), cinq appareils.
4. **Statistiques** — `statistiques.spec.ts:433` (cinq appareils) : 7 écritures dans la base là où aucune n'est
   attendue. (Sans doute le comptage d'usage T4.)
5. **Programme de scène** — `programme-scene.spec.ts:177`, `scene-saison.spec.ts:623, :852` (trois appareils) : une
   écriture part alors que la réservation devait être refusée. **À regarder en premier : possible vrai défaut.**
6. **« Où l'entendre »** — `retouches-usage-t6.spec.ts:202` (trois appareils) : le lien porte `?passage=…`.
   (Le test date d'avant les passages.)
7. **Setlists, groupes** — `agencement-groupes.spec.ts:248` clair et sombre (tablette, tablette paysage, ordinateur,
   1 440 px) : texte à moins de 12 px du bord d'un groupe.
8. **Chants, deux volets** — `chants-deux-volets.spec.ts:495` (ordinateur, tablette paysage, 1 440 px) : les
   prochaines setlists sont lues deux fois au lieu d'une.
9. **Mode louange** — `louange-bandeau-lecture.spec.ts:47` (trois appareils, bouton « Quitter » invisible) ;
   `look-louange.spec.ts:320` ZH (tablette, commande « Lettres » sous 36 px) ; `louange-sections-uniques.spec.ts:769`
   (téléphone, trait non relu sur la page 2).
10. **Équipes** — `equipes-agencement.spec.ts:83` (téléphone, tablette, tablette paysage) : « Orga » coupé.
11. **Planning du back-office** — `agencement-v18-planning.spec.ts:264` (tablette, tablette paysage) : ligne de 83 px
    au lieu de 70 au plus.
12. **Isolés** — `chants-fetes-setlist.spec.ts:184` (ordinateur) ; `rappel-dp.spec.ts:243` (tablette, couleur du Dp
    en chinois) ; `page-chant-a6.spec.ts:110` (téléphone, libellé « Louange » masqué).

## Instables (101, dont 88 sur téléphone dans le morceau 10/32)
Listés dans chaque bilan ; à revoir seulement s'ils reviennent.

## Méthode mesurée (à reprendre telle quelle)
Trente-deux morceaux (`--shard=k/32 --workers=2 --trace off`), un serveur neuf par commande, une commande à la fois par
conteneur ; un quart ou un seizième d'une traite fait tomber `next dev` par manque de mémoire (16 Go). Plus de 20
`ERR_CONNECTION_REFUSED` : arrêter, ne rien rejouer, relancer le morceau. Rejeu unique des fichiers en échec. La
session ne rend pas la main tant que les tests tournent. Compter ≈ 20 min par trente-deuxième, plus le rejeu.

## Corrections (go de Timothée, 13/11/2026)
Une ligne par chantier : échec, qui avait tort (site ou test), correction, commit, specs rejouées et durée.
- C1 — `programme-scene.spec.ts:177`, `scene-saison.spec.ts:623`, `:852` (trois appareils) : **le test avait tort**.
  Le refus marche (message affiché, aucune écriture `programmes/…`) ; le POST vu était `:commit`, l'envoi
  quotidien du comptage d'usage (`docs/spec-comptage-usage.md`, même cause probable que le point 4). Assertion
  limitée aux écritures `programmes/`. Commit 35320b62. Rejoué : les deux specs, trois appareils, 294 passés,
  6 sautés, 0 échec (6 min 19 s) ; `tsc` et lint sans erreur. À décider : rien.
- C3 · `section-labels.spec.ts:11, :19, :31` : test (noms de section en casse normale depuis DP-D, `d93adcca`, spec forscore-2) ; attentes en casse normale ; d0c7098f.
- C3 · `statistiques.spec.ts:433` : test (le lot `documents:commit` est le comptage d'usage, `docs/spec-comptage-usage.md`, pour tout le site) ; exclu comme `notifPrefs/` ; 43747d74.
- C3 · `retouches-usage-t6.spec.ts:202` : test (« Où l'entendre » vise le premier passage, `?passage=`, spec harmonie § H6) ; attente du lien avec passage ; 0e41b73d.
- C3 · `chants-deux-volets.spec.ts:495` : site (la page chant, PU-1 `33d6cc32`, relisait les 30 prochaines setlists avec son propre cache) ; `equipeAVenirLue` reprend `prochainesLues` ; 3474c1dd ; `pdf-droits` voisine verte (54/54, 1,6 min).
- C3 · `chants-fetes-setlist.spec.ts:184` : test (en deux volets, l'en-tête se déplie par le titre, T3 de `docs/spec-exemples-usage.md`) ; dépli comme `jianpu-par-defaut` ; 202e8933.
- C3 · `rappel-dp.spec.ts:243` : test (tête de feuille JP-B2 : couleur au contour, fond seulement si la section est à l'écran) ; contour comparé ; e67e0aec.
- C3 · `page-chant-a6.spec.ts:110` : test (Mode Louange en rond à icône seule au téléphone, T2 exemples d'usage) ; bouton vérifié par son nom ; ebc6c8e8.
- C3 · rejeu unique des sept specs sur les cinq projets : 29 réussis, 4 sautés, 56 s ; `tsc` propre, lint 0 erreur. 1 corrigé site, 6 test, 0 à décider.
- C5 · `equipes-agencement.spec.ts:83` (téléphone, tablettes) : test (« Orga », 39,5 px de texte dans un titre de 40 px, n'est pas coupé ; seule la zone de toucher invisible de 44 px du lien, `TOUCHER_44`, spec-corrections-design § 3, dépassait de 2 px du `scrollWidth`) ; le test mesure le texte (Range) ; f1452e98.
- C5 · `agencement-v18-planning.spec.ts:264` (tablettes, horloge figée au 15/11 : rien ne dépend du jour) : **à décider**. Au toucher, le badge « Cette semaine » passe sur deux lignes : ligne de 83 px pour ≤ 70 (bo-messages-planning-10, « ≈ 64 px »). Sur une ligne, il fait ≈ 97 px dans une colonne Date figée à 96 px (`<colgroup>`, plannings-1 ; 74 px utiles) et mord sur Présidence (essayé, retiré). Choix : colonne Date à 112 px au toucher, libellé court au toucher (« Cette sem. » / 「本周」), ou critère relevé à 85 px. Proposition : colonne à 112 px au toucher (ligne ≈ 68 px, le libellé reste entier).
  **Décision déléguée (pilote, 13/11)** : colonne Date à 112 px au toucher, comme proposé (le critère « ≈ 64 px » de la spec est tenu, le libellé reste entier, une seule valeur à défaire). C5 la code.
- C5 · deux specs sur les cinq projets : 306 réussis, 54 sautés, 0 échec, 7 min (avant le retrait de l'essai sur le badge ; le planning retombe donc en échec sur tablettes, comme avant) ; `tsc` propre, lint 0 erreur. 0 corrigé site, 1 test, 1 à décider.
- C4, `louange-bandeau-lecture:47` (trois appareils, « Quitter » invisible) : **le test avait tort**. En Crayon, la barre
  d'annotation remplace la barre de titre (AN-3a, `docs/spec-mode-louange-forscore-2.md` § AN-3a) : on en sort par
  « Terminé », ce que fait déjà `basculerAnnoter` ; l'appel à `montrerChrome` avant la sortie est retiré. Commit 7c96d63.
- C4, `look-louange:320` ZH et FR (tablette, « Lettres » à 32 px) : **le site avait tort**, une seule cause pour les
  deux langues (la FR échouait aussi, pas instable). La bascule A / 1 de H7-1 (`ChoixNotation`) était en `h-8` partout,
  sous la règle des 36 px au toucher (16/09/2026) ; elle passe à `h-9 min-w-9 lg:h-8 lg:min-w-8`, comme ses voisines
  de la barre. Seule la tablette portrait change (cachée au téléphone, inchangée dès 1 024 px), capture regardée.
  Commit e3e5cfc.
- C4, `louange-sections-uniques:769` (téléphone, trait non relu) : **le test avait tort**. Il traçait à 55 % de la
  hauteur, dans le blanc sous la dernière section de la page 2 au téléphone ; un tracé à plus de 2 em de toute ligne
  n'est pas gardé (MP-5, `docs/spec-ma-partition.md`, « Reste noté »). Le tracé se pose désormais sur le texte (au plus
  60 px au-dessus du bas des sections). Commit be3be77.
- C4, rejeu : les trois specs entières sur ordinateur, téléphone et tablette, 209 passés, 34 sautés (prévus), 0 échec
  ni instable, 9 min ; `tsc` et `lint` propres.
