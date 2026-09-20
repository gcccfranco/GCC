# Spec : lot 5 — Export PDF (classique · couleurs par section · compact)

Lot 5 de `feuille-de-route.md` § 2 (chantier 6). Demandé le 13/09/2026
(« l'export des PDF mais avec la vue couleur par section ») et le 14/09/2026
(Christelle : structure « en 1 coup d'œil » aussi sur le PDF, § 3.A et 3.I).
Entretien du 16/09/2026 (questions Q1 à Q7, recommandations toutes
acceptées). **Go donné le 16/09/2026** (« Go pour tous les lots 5, 7 et 8 »).

## Objectif

Au téléchargement, choisir **quel PDF** :

- un chant : **Classique** · **Couleurs par section** ;
- une setlist (vue partitions) : **Classique** · **Couleurs par section** ·
  **Compact**.

Réussite : Timothée télécharge les trois PDF d'une setlist qui mélange un
chant FR, un chant ZH, un scan 简谱, une fusion et une transition, les ouvre,
et les valide ; Christelle retrouve dans le compact la structure « en 1 coup
d'œil ».

## Ce que le code montre (16/09/2026)

- `SongDetailClient.tsx` et `SetlistDetailClient.tsx` : l'entrée
  « Télécharger le PDF » du menu ⋯ génère directement le fichier
  (`handleDownload`, `@react-pdf/renderer` chargé à la demande). En vue liste,
  la setlist sort `SetlistOverviewPDF` ; en vue partitions, `SetlistFullPDF`.
- `SongPDF.tsx` (1 143 lignes) : `SongPDFPage` (paroles), `FusionPDFPage`
  (structure mélangée), `TransitionPDFPage` (une page par transition),
  `JianpuPDFPage` (scan + calque d'accords). Une couleur d'accent par langue
  (bleu FR, rouge ZH) ; encadrés seulement pour refrain, post-refrain, final,
  coda (rempli), pont (contour), pré-refrain (barre) ; ligne « ORDRE » aux noms
  complets ; nuances en **violet** `NUANCE_COLOR`.
- Écran, « Couleurs par section » (`SongView.tsx`, `getChartSectionStyle`) :
  **chaque section dans un cadre fin de 1 px à sa couleur**, coins arrondis,
  titre de section à sa couleur, **accords et 简谱 en noir** (couleur du
  texte) ; pas de fond teinté. Palette `--sec-*` de `globals.css` (clair) :
  intro `#5b7fa6`, couplet `#2c8a7d`, pré-refrain `#c1871f`, refrain /
  post-refrain / final `#e0560a`, pont `#7a5bcb`, instrumental / interlude /
  autre `#6b7280`, outro / coda `#4f6477`, tag `#bd476a`.
- Écran, « Sections uniques » (`PartitionView.tsx`) : bandeau `StructureStrip`
  (pastilles abrégées aux couleurs des sections, fond `--sec-*-tint`, « ×2 »,
  nuance en texte dessous, crescendo / decrescendo = flèche seule, notes et
  transitions = numéros repris dans une liste), puis `uniqueSections` (une
  impression par section et par tonalité). Fusion à structure mélangée :
  bandeau puis sections dans l'ordre mélangé, sans dédoublonnage. Fusion
  enchaînée : chaque chant en sections uniques. Scan 简谱 : bandeau au-dessus.
  Élément « transition » de la setlist : bandeau `TransitionBanner` entre deux
  chants.
- Nuancier écran (gris) : doux `stone-200` fond / `stone-700` texte, moyen
  `stone-400` / `stone-950`, fort `stone-800` / blanc ; indications = contour
  `stone-400`, texte `stone-700`.
- Aucun test ne couvre les PDF aujourd'hui.

## Décisions (entretien du 16/09/2026)

| # | Décision |
| --- | --- |
| Q1 | « Télécharger le PDF » ouvre une petite fenêtre « Quel PDF ? » ; deux choix pour un chant, trois pour une setlist en vue partitions ; **le dernier choix est présélectionné sur l'appareil**. La vue liste garde son PDF liste, sans choix. |
| Q2 | Les nuances du PDF **classique** passent au nuancier gris (seule retouche du PDF gelé). |
| Q3 | « Couleurs par section » = **identique à l'écran**, en clair : cadre fin à la couleur de la section, accords et 简谱 en noir (confirmé, voir ci-dessous). |
| Q4 | « Compact » = la vue partitions en « Sections uniques », imprimée, en couleurs par section : en-tête, bandeau, chaque section une fois ; mêmes règles qu'à l'écran (Dernière phrase, modulations réimprimées, fusions, transitions). |
| Q5 | Compact : **chaque chant commence sur une nouvelle page**. |
| Q6 | Scan 简谱 dans le compact : le scan tel quel, **bandeau au-dessus** sur sa première page. En couleurs par section, le scan est inchangé. |
| Q7 | Pas de PDF « structure seule ». |

## Écart relevé en écrivant la spec — tranché

En Q3, la proposition décrivait « un encadré teinté, barre à gauche, accords
inchangés ». **L'écran ne fait pas ça** : cadre fin à la couleur de la
section, sans fond, accords et 简谱 en noir. Timothée, 16/09/2026 : « il faut
que ce soit identique à l'écran » → cadre fin, accords et 简谱 en noir.

## Ce qui sera construit — trois tranches

### P1 — Choix au téléchargement + nuancier gris

- `src/lib/pdfStylePref.ts` : préférence par appareil (`localStorage`,
  lectures et écritures dans `try/catch`) : `"classic" | "colors" | "compact"`,
  défaut `"classic"` ; « compact » demandé pour un chant retombe sur
  « classic ».
- `src/components/pdf/PdfChoiceSheet.tsx` : feuille (composant `Drawer`
  existant sur tactile, même rendu sur ordinateur) avec les choix en lignes
  groupées (`Group` / `GroupRow`), une phrase d'aide sous chacun, bouton plein
  « Télécharger » ; état « … » pendant la génération.
- `SongDetailClient.tsx`, `SetlistDetailClient.tsx` : l'entrée du menu ouvre
  la feuille en vue partitions ; en vue liste de la setlist, rien ne change.
  Nom du fichier : `<slug>-<ton>.pdf` (classique, inchangé),
  `<slug>-<ton>-couleurs.pdf` ; setlist `<titre>-partitions.pdf` (inchangé),
  `-couleurs.pdf`, `-compact.pdf`.
- `SongPDF.tsx` : pastilles de nuance au nuancier gris (trois intensités,
  indications en contour), dans tous les PDF.
- Libellés FR et 中文 dans `locales`.

### P2 — Couleurs par section

- `SongPDF.tsx` : prop `sectionStyle?: "classic" | "colors"` (défaut
  `classic`, donc rien ne bouge pour le classique) passée à `SectionBlock` ;
  en `colors` : cadre 1 pt à la couleur du type (palette ci-dessus, même
  correspondance que `CHART_TYPE_COLOR`, recopiée en hexadécimal), rayon 8,
  titre de section à cette couleur, accords et 简谱 en noir. En-tête, badge de
  tonalité, pied de page : inchangés.
- `FusionPDFPage` et les pages de fusion enchaînée suivent la même prop ;
  `SetlistFullPDF` la reçoit et la transmet. `SongPDF` (chant seul) aussi.

### P3 — Compact (setlist seulement)

- `src/components/pdf/StructureStripPDF.tsx` : le bandeau en react-pdf —
  pastilles abrégées (`abbreviations.ts`), fond teinté et lettre à la couleur
  de la section, « ×2 » (`isRepeatOf`), nuance en texte sous la pastille
  (nuancier gris ; crescendo / decrescendo en flèche), numéros des notes et
  transitions repris en liste sous un filet. Passe à la ligne si besoin (pire
  cas : 12 étapes).
- `SetlistFullPDF.tsx` : prop `layout: "played" | "unique"`. En `unique` :
  - chant : en-tête, bandeau (`resolveSectionOccurrences`), puis
    `uniqueSections` en couleurs par section, sans notes ni nuances
    d'occurrence dans le corps (le bandeau les porte) ;
  - fusion enchaînée : chaque chant en sections uniques ; fusion mélangée :
    bandeau + sections dans l'ordre mélangé (comme l'écran) ;
  - scan 简谱 : bandeau au-dessus du scan sur sa première page (hauteur
    d'en-tête agrandie, le scan se réduit pour tenir) ;
  - chaque chant sur une nouvelle page (Q5) ;
  - élément « transition » : **imprimé en bas de la page du chant qui le
    précède**, pas sur une page à lui (hypothèse 2).
- Le compact suit la version de la présidence (décision du lot 3 ter : le
  PDF reste sur la présidence).

## Hypothèses

1. La préférence est **par appareil** et commune au chant et à la setlist.
2. Compact : une transition ne prend pas une page entière ; elle finit la
   page du chant d'avant. Le classique garde sa page de transition.
3. Les polices du PDF ne changent pas (le PDF garde les siennes, décision du
   13/09/2026). La flèche de crescendo utilise un glyphe présent dans
   `DejaVuSans` ; sinon une petite flèche dessinée.
4. Réglages d'affichage de l'appareil (accords, pinyin, 简谱) : pris en compte
   comme aujourd'hui dans les trois PDF.

## Tests (Playwright, `tests/export-pdf.spec.ts`, trois appareils)

Écrits d'abord, vus en échec, puis verts.

- Feuille de choix : deux choix pour un chant, trois pour une setlist en vue
  partitions, aucune en vue liste ; le dernier choix revient présélectionné
  après rechargement.
- Téléchargement : l'évènement `download` part avec le bon nom de fichier pour
  chaque choix ; le fichier est un PDF non vide.
- Contenu du compact : ce que `SetlistFullPDF` reçoit à imprimer est calculé
  par une fonction pure (étapes du bandeau + sections à imprimer) ; un chant
  dont le refrain est joué trois fois donne trois étapes et **une** impression
  du refrain ; une modulation donne une seconde impression.
- Fonctions pures : correspondance type de section → couleur ; préférence
  (valeur inconnue, stockage bloqué).
- **Vérification à l'œil** : les PDF téléchargés par le test sont rendus en
  PNG (PyMuPDF, déjà installé côté Python, simple visionneuse) pour
  une setlist de test (1 chant FR, 1 chant ZH, 1 scan 简谱, 1 fusion, 1
  transition) et pour un chant FR + un chant ZH seuls ; images regardées avant
  de dire « fait ».

## Limites

- Toujours : le PDF classique reste identique hors nuances (comparaison des
  pages avant / après) ; FR + ZH testés ; trois appareils.
- Demander avant : toute retouche du classique au-delà des nuances ; une
  nouvelle dépendance.
- Jamais : toucher aux calques 简谱 certifiés, aux couleurs des sections ou
  des accords de l'écran.

## Commandes

```bash
npm test -- tests/export-pdf.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

**Codé le 16/09/2026**, sur le go du même jour, en trois tranches test d'abord
(rouge puis vert) : `tests/export-pdf.spec.ts`, 13 tests × 3 appareils ;
suites voisines (coup d'œil, version perso, copie des paroles) vertes, 147 au
total ; lint sans erreur. **PDF regardés à l'œil** (rendu PyMuPDF) : chant FR
et ZH en classique et en couleurs, setlist de test (FR avec nuances, note,
modulation ; transition ; ZH ; scan 简谱 ; fusion) dans les trois styles.

| Tranche | Construit |
| --- | --- |
| P1 | `src/lib/pdfStylePref.ts` (préférence `pdf-style`, nom de fichier), `src/components/pdf/PdfChoiceSheet.tsx` (feuille, choix en boutons radio), `src/lib/pdf/colors.ts` (nuancier gris), branchés dans la page chant et la setlist ; `NUANCE_COLOR` (violet) retiré, devenu inutile. |
| P2 | `SongPDF.tsx` : `sectionStyle` (`classic` / `colors`) sur les pages chant et fusion ; `SetlistFullPDF` le transmet ; palette `sectionPdfPalette` (même correspondance que l'écran : le tag et l'instrumental tombent sur « autre », comme `CHART_TYPE_COLOR`). |
| P3 | `src/lib/pdf/compact.ts` (plan des sections, repli « ×2 », transitions), `StructureStripPDF.tsx` (bandeau), `SongPDFPage` en `layout="unique"`, bandeau au-dessus de la fusion mélangée (sans liste de notes, comme l'écran) et du scan 简谱 (place estimée, retirée de la hauteur du scan). |

Écarts et précisions :

- Une transition **en tête de setlist** (aucun chant avant elle) garde sa page ;
  après un scan 简谱, elle va sous la dernière page du scan.
- Les libellés du PDF de setlist restent en français, comme avant (la setlist
  ne transmet pas la langue de l'interface au PDF).
- La palette du tag : la spec citait `#bd476a`, mais l'écran en « couleurs par
  section » met le tag en gris « autre » ; le PDF suit l'écran.
