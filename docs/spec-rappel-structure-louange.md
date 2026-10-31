# Spec — Rappel de structure du mode louange (lot RS)

Demande de Timothée du 31/10/2026, captures de **Prince de paix** en mode louange : « la barre supérieure est un peu
bizarre et pas très lisible ». Puis : des couleurs différentes pour les Dp quand ils sont différents, le même Dp une
seule fois, « quelque chose pour chaque mode du mode louange ». Les Dp peuvent venir d'un refrain, d'un pont ou d'un
couplet.

Planche : https://claude.ai/artifact/F4KLwJYLVBnbTmWKuhi6JN (`docs/planches/planche-rappel-mode-louange.html`,
version 2). Piste C retenue ; A et B écartées. Les questions restées ouvertes ont été tranchées par la session, sur
consigne de Timothée (« fais ce que tu penses est le mieux », 31/10/2026) : voir « Décisions ».

## Constat (code au 31/10/2026)

- Le **rappel** (`StructureStrip compacte`, `src/components/song/SongView.tsx`) n'existe qu'en **Sections uniques**,
  en haut des pages 2 et suivantes d'un chant (`PerformanceMode.tsx`, `rappel`, réserve `RAPPEL_RESERVE = 32`,
  mesurée). Pastilles de 24 px, lettres de 11 px, aucune nuance ; les sections imprimées sur la page sont cerclées de
  noir à leur 1ʳᵉ occurrence (`cerclees`).
- **Ordre joué** : rien en haut des pages 2 et suivantes. **Structure seule** : pas de bandeau, la page est la
  structure. **Scan 简谱** : bandeau avec détails au-dessus du scan, ou en colonne (`colonne`) en paysage sur grand
  écran.
- Les **Dp** (« Dernière phrase – R », `src/lib/setlist/lastPhrase.ts`) sont des sections « autre » : gris
  (`--sec-other`), abréviation « Dp » pour toutes (`abbreviateSection`). Le nom porte l'abréviation de la section
  source, sans chiffre (« R », « C », « P »).
- Deux étapes de suite ne se regroupent en « ×2 » que si le nom, la note, la nuance et la modulation sont égaux
  (`isRepeatOf`, `src/lib/setlist/sectionSteps.ts`) : deux Dp identiques à nuance différente restent deux pastilles.

## Règles communes (bandeau de 1ʳᵉ page, rappel, colonne du scan, Structure seule)

1. **Couleur d'un Dp = couleur de sa section d'origine**, lue dans son nom : « – R » → `--sec-chorus`, « – C » →
   `--sec-verse`, « – P » → `--sec-bridge`, « – Pr » → `--sec-prechorus`, et ainsi de suite par
   `SECTION_PALETTE_KEY` ; origine illisible → gris comme aujourd'hui. Les couleurs gelées sont réutilisées, aucune
   nouvelle couleur.
2. **Dp différents de la même origine** : numérotés dans l'ordre de leur 1ʳᵉ apparition (Dp1, Dp2). Un seul Dp d'une
   origine reste « Dp ».
3. **Le même Dp** (même section) **joué plusieurs fois de suite = une étape « Dp ×n »**, même si la nuance ou la note
   change ; les nuances différentes s'écrivent dans l'ordre, séparées par « → » (« mp ↗ → mf »). Les autres sections
   gardent `isRepeatOf` tel quel.
4. **La colonne du scan** écrit le nom de l'origine en entier : « Dernière phrase – Refrain ».

## Le rappel, par mode

Rangée en haut des pages 2 et suivantes d'un chant, **pastilles de 30 px, lettres de 14 px** (26 et 13 px sous
640 px de large). **Pleine** = jouée sur cette page (fond de la couleur de la section, lettre de la couleur du fond),
avec sa nuance dessous en 12 px gras ; **claire** = ailleurs, sans nuance. Plus de cercle noir. Sur tablette et
ordinateur, le **titre du chant** ouvre la rangée (13 px, capitales, gris, tronqué) ; pas sur téléphone.

| Mode | Rappel |
| --- | --- |
| **Ordre joué** | **Nouveau.** Étapes avant la page : **points** de 8 px de leur couleur (opacité 0,45). Étapes de la page : pleines. Étapes suivantes : claires. |
| **Sections uniques** | **Refait.** Pas de points (la page n'est pas un moment du chant) : **chaque passage** d'une section imprimée sur la page est plein, avec sa nuance ; les autres claires. **Téléphone** : seulement les pastilles pleines, dans l'ordre joué. Une ligne le plus souvent ; deux quand la page porte beaucoup de passages (Prince de paix, page 2 : neuf passages), ce qu'on accepte. |
| **Structure seule** | Aucun rappel. Règles des Dp seulement. |
| **Scan 简谱** | Aucun rappel ajouté. Règles des Dp seulement (bandeau et colonne). |

**Indice, une seule fois** (décision D6) : la 1ʳᵉ fois qu'un rappel s'affiche, une bulle sous la rangée explique
le code, puis ne revient plus sur cet appareil. Une clé par mode, puisque le code diffère (`perf-astuce-rappel-joue`,
`perf-astuce-rappel-unique`, localStorage, même principe que `perf-role-asked`) :
- Ordre joué : « Points : déjà joué · Pleines : sur cette page, avec leur nuance » ;
- Sections uniques : « Pleines : sur cette page, avec leur nuance ».
Libellés i18n FR et 中文 (« 圆点：已唱过 · 实心：在本页，下方为力度 » ; « 实心：在本页，下方为力度 »). La bulle
part d'elle-même à la page suivante, ou d'un toucher sur elle ; elle n'arrête aucun geste de page (principe 2 du
mode louange) et ne prend pas de place dans la pagination (posée par-dessus le haut de la page, sous la rangée).
Hors du mode louange (page d'un chant), pas d'indice.

La réserve passe de 32 px à la hauteur mesurée du nouveau rappel (≈ 50 px), en Ordre joué comme en Sections uniques.

## Corps de la page

En **Ordre joué**, le même Dp joué plusieurs fois de suite n'est imprimé **qu'une fois**, avec « ×n » à côté de son
nom (même règle 3). Le bloc garde les uids de toutes ses occurrences : annotations et reprise de lecture continuent de
le retrouver. En Sections uniques il n'est déjà imprimé qu'une fois.

## Décisions (31/10/2026, sur « fais ce que tu penses est le mieux »)

- **D1** Ordre joué reçoit le rappel (pages 2 et suivantes).
- **D2** Le même Dp joué de suite est imprimé une fois en Ordre joué, avec « ×n ».
- **D3** Une Dp tirée du refrain garde exactement l'orange du R : la couleur dit l'origine, les lettres font la
  différence, et un Dp de pont ou de couplet se distingue tout seul. Pas de style à part.
- **D4** Téléphone en Sections uniques : seulement les pastilles pleines. La rangée tient le plus souvent sur une
  ligne ; elle en prend deux quand la page porte beaucoup de passages, ce qu'on accepte.
- **D5** Pistes A et B écartées.
- **D6** (Timothée, 31/10/2026) Pas de légende permanente : un indice à la première ouverture, une seule fois, et la
  rangée reste propre ensuite.

## Hors champ

Couleurs `--sec-*`, accords, 简谱 (gelés) ; PDF ; éditeur de setlist ; page d'un chant hors mode louange (le bandeau
de la page chant prend les règles des Dp puisqu'il partage `StructureStrip`, rien d'autre ne change).

## Découpage

- **RS-A** Règles des Dp : origine et couleur, numérotation, regroupement « ×n » à nuances différentes. Partout où
  `StructureStrip` est utilisé, et blocs de Structure seule.
- **RS-B** Rappel refait en Sections uniques (pleines par passage, titre, tailles, téléphone réduit aux pleines).
- **RS-C** Rappel en Ordre joué (points, pleines, claires), réserve mesurée, et Dp imprimé une fois dans le corps.
- **RS-D** Indice à la première apparition du rappel, une clé par mode.

## Critères de succès (Playwright, trois appareils + les deux projets grand écran)

- Prince de paix d'une setlist simulée (`tests/helpers/fakeSession.ts`, noms fictifs) avec cinq « Dernière phrase –
  R » : bandeau de 1ʳᵉ page = 12 étapes, `Dp ×2` en tête et en fin, nuances « mp ↗ → mf ».
- Un chant avec une Dp « – R » et une Dp « – P » : couleurs calculées différentes (orange et violet).
- Deux Dp « – R » différentes : « Dp1 » et « Dp2 ».
- Sections uniques, page 2 : pastilles pleines = tous les passages des sections de la page ; nuance sous chacune ;
  aucune `data-cerclee`. Sur téléphone : seulement les pleines.
- Ordre joué, page 3 : points avant, pleines sur la page, claires après ; rien sur la 1ʳᵉ page.
- Ordre joué : le Dp joué deux fois de suite n'est imprimé qu'une fois, avec « ×2 ».
- Indice : visible la 1ʳᵉ fois qu'un rappel paraît, absent à la page suivante et au rechargement ; une clé par mode ;
  une page se tourne d'un toucher sur le côté pendant que la bulle est ouverte.
- Un trait d'annotation dessiné sur une page 2 avant le changement reste sur sa section.
- Chant FR et chant ZH, thème clair et sombre ; captures aux quatre dispositions + 1 440 px, regardées à l'œil.
- `npx tsc --noEmit`, `npm run lint`.

## Risques

- **Fins de page déplacées** par un rappel plus haut (Ordre joué, Sections uniques) : une page tournée au mauvais
  endroit un dimanche. Critère d'annotation ci-dessus et captures.
- **Regroupement de Dp à nuances différentes** : le batteur perd la nuance par passage dans le corps ; elle reste
  écrite dans le bandeau et le rappel, dans l'ordre.

## Avancement

- 31/10/2026 : planche v2 et spec. go de Timothée le même jour (« go pour le lot RS »).
- 31/10/2026 : **lot RS codé** sur `claude/laughing-euler-q28fye` (pas en ligne) : RS-A `6b576b1` (règles des Dp,
  `src/lib/setlist/dp.ts`), RS-B `5c2a9ff` (rappel Sections uniques), RS-D `63aecbc` (indice, `IndiceRappel.tsx`),
  RS-C `2ad6b2d` (rappel Ordre joué, Dp imprimé une fois), passe finale `6826bef`, corrections de relecture `299efb4`.
  Passe finale aux cinq projets : 785 réussis, 63 ignorés (propres à un appareil), 2 échecs expliqués (test ZH des
  Sections uniques sans page 2 en deux colonnes, désormais ignoré). 70 captures (quatre dispositions + 1 440 px,
  clair et sombre, Prince de paix FR et un chant ZH) triées puis regardées à l'œil.
- **Choix faits en codant** :
  - Annotations (décision de Timothée) : chaque annotation garde la hauteur du rappel au tracé (`rappel`,
    `src/lib/annotations/strokes.ts`, `recaler`) ; les traits se décalent de l'écart (annotation d'avant le lot :
    32 px × échelle en Sections uniques, 0 en Ordre joué). Une page recomposée sans annotation relit celle de
    l'ancienne pagination dont la page commence par la même section ; sauvegarde sous la nouvelle clé, l'ancienne
    jamais effacée. Pages 2+ recomposées (6 chants, 100/150 %, 3 appareils) : Ordre joué 19/106, Sections uniques
    6/101. Puis Timothée : « on peut perdre les annotations, c'est pas grave » — donc pas de parade de plus pour
    les pages contenant un Dp fusionné en Ordre joué (elles changent de clé).
  - Réserve du rappel mesurée au pire cas (toutes pastilles pleines avec nuance), plancher 50 px.
  - Bulle d'indice : clé écrite dès qu'elle paraît ; posée par-dessus le haut de la page, elle couvre le libellé de
    la 1re section jusqu'au toucher ou à la page suivante (voulu : hors pagination).
  - Couleur d'origine des Dp dans le corps : en Structure seule seulement (Ordre joué garde le cadre gris).
- **Reste / connu** : réserve surestimée quand le rappel réel est plus court (points, téléphone) ; ancienne réserve
  approximée à 32 px (un ancien rappel sur deux lignes n'est pas modélisé) ; un balayage commencé sur la bulle ne
  tourne pas la page ; deux Dp de chants différents au même id peuvent se confondre dans une fusion en structure
  mixte ; Structure seule au téléphone à 150 % : libellés longs et pastilles de nuance débordent du cadre (déjà
  avant le lot) ; le premier « Dp ×2 » du bandeau s'élargit de sa ligne de nuances (« mp ↗ → mf »). Mise en ligne :
  sur ordre de Timothée.
