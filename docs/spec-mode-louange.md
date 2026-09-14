# Spec : chantier Mode louange

Chantier n° 2 de `docs/intent/vision-site.md` (« Ordre des chantiers »).
Réalisation choisie par Timothée le 13/09/2026.

## Objectif

Le mode louange sert le dimanche, sur téléphone et sur tablette posée sur le
pupitre. Chacun doit y trouver sa vue sans rien régler :

1. un **nuancier** : doux, moyen ou fort se voient d'un coup d'œil ;
2. une **vue structure** pour les batteurs, en grand ;
3. le **choix du rôle** demandé à la première ouverture ;
4. la **reprise des réglages** faits juste avant (page setlist, page du chant) ;
5. une **police** des chants et des accords plus lisible, partout.

## Ce que le code montre (13/09/2026)

- **Nuances** : un seul composant, `NuanceBadge` (`src/components/song/SongView.tsx`),
  utilisé par la page chant, la vue partitions, le mode louange et le bandeau
  简谱. Tout est violet, en 10 px. Le PDF a son propre rendu (`NUANCE_COLOR`).
- **Vue ossature** : existe déjà. Préréglage Batteur = paroles et accords
  masqués → un chant par page, sections seules (`layoutSong` dans
  `PerformanceMode.tsx`). Mais la page n'est **jamais agrandie**, seulement
  réduite si elle déborde : sur tablette (1024 × 768), trois étiquettes de
  0,75 rem occupent le haut de l'écran et le reste est vide.
- **Rôle** : réglages ▸ Vue, mémorisé sur l'appareil (`perf-role-preset`). Rien
  n'est demandé à la première ouverture.
- **Réglages** : couleurs par section et 简谱 sont déjà partagés sur l'appareil.
  Le pinyin a deux réglages séparés (`gcc.showPinyin` sur la setlist,
  `perf-show-pinyin` en mode louange). La taille du texte aussi
  (`song-font-scale`, `perf-font-scale`). Pour les accords, la page setlist
  transmet son choix, mais un rôle mémorisé l'emporte.
- **Tonalité** : le lien d'un chant depuis la vue liste de la setlist ouvre la
  page du chant dans la tonalité de la setlist. Une tonalité choisie ensuite
  n'est gardée nulle part, et la page du chant ne sait pas de quelle setlist
  elle vient. Aucun capo sur la page du chant.
- **Police** : paroles FR en Inter, accords en Space Grotesk, paroles ZH en
  Source Han, polices locales (`public/fonts/`).

## Ce qui est construit

### 1. Nuancier

- **Une couleur (le violet actuel), trois intensités** :
  - doux (pp, p) : fond pâle, texte violet ;
  - moyen (mp, mf) : fond violet moyen, texte violet foncé ;
  - fort (f, ff) : fond violet plein, texte blanc.
- **cresc. / decresc.** : intensité moyenne, avec une flèche qui monte ou qui descend.
- **Indications** (a cappella, instrumental, voix seule, tous, spontané,
  break) : style neutre (gris) avec une icône.
- Partout où `NuanceBadge` s'affiche. **En mode louange, badges plus grands et
  plus gras.**
- **Hors lot** : le PDF (export actuel gelé) et les puces de l'éditeur de
  setlist (chantier 4).

### 2. Vue structure (batteurs)

- Quand paroles et accords sont masqués (préréglage Batteur), la structure du
  chant **remplit la page** : les sections sont agrandies jusqu'à occuper
  l'écran, sur une ou deux colonnes, comme aujourd'hui mais vers le haut aussi.
- **Reprises** : deux passages consécutifs de la même section, avec les mêmes
  nuances et la même note, deviennent une seule ligne « Refrain ×2 ». Si les
  nuances diffèrent, chaque passage garde sa ligne.
- Notes de section et transitions restent affichées.
- Un chant joué sur son scan 简谱 garde sa page de scan et son bandeau de
  structure (inchangé).

### 3. Choix du rôle à la première ouverture

- Si l'appareil n'a jamais choisi, le mode louange s'ouvre sur la question :
  Pianiste, Guitariste, Présidence, Choriste, Batteur, ou « Aucun, je règle
  moi-même ». Mention : « Tu pourras changer dans Réglages ».
- Le choix est retenu sur l'appareil et n'est plus redemandé. Un appareil qui
  a déjà un rôle mémorisé n'est pas interrogé.

### 4. Reprise des réglages

- **Pinyin** : un seul réglage sur l'appareil, pour la page setlist et le mode
  louange (reprend la valeur de la page setlist).
- **Taille du texte** : une seule taille sur l'appareil, pour la page du chant
  et le mode louange. Au premier passage, la taille du mode louange est gardée
  si elle existe (annotations), sinon celle de la page du chant.
- **Accords** : un changement des accords sur la page setlist, juste avant
  d'ouvrir le mode louange, l'emporte sur le rôle (le rôle est alors
  désélectionné, comme quand on touche aux accords dans les réglages du mode).
  Sans changement, le rôle décide.
- Couleurs par section et 简谱 : déjà partagés, rien à faire.

**Revers accepté** : une annotation est liée à la taille du texte. Si la taille
change sur la page du chant, les annotations dessinées à l'ancienne taille ne
s'affichent plus, jusqu'au retour à cette taille.

### 5. Tonalité choisie sur la page du chant

- Le lien d'un chant depuis la setlist dit de quelle setlist il vient.
- Sur la page du chant ouverte ainsi, changer la tonalité la **retient pour ce
  chant dans cette setlist, sur cet appareil**. Revenir à la tonalité de la
  setlist efface ce choix.
- En mode louange, le chant est joué dans cette tonalité, avec un repère visible
  « A · setlist : G » dans l'en-tête du chant et dans la barre du haut. Le
  bouton « Revenir à G » est dans **Réglages** (ligne « Tonalité », à côté du
  capo) : l'en-tête passe sous la barre du haut, qui intercepte les touchers
  même masquée, un bouton y serait intouchable.
- Sur une page de scan 简谱, le repère est dans le bandeau de structure.
- Les modulations (升调) suivent le même écart. Les autres appareils et la
  setlist enregistrée ne changent pas.
- Chants fusionnés : hors lot (leur lien n'ouvre pas la page du chant avec les
  réglages de la setlist).
- Capo sur la page du chant : chantier 4 (capo conseillé).

### 6. Police

- 2 ou 3 polices candidates, montrées en captures (page chant, vue partitions,
  mode louange, FR et 中文, clair et sombre). **Timothée choisit avant toute
  application.**
- Appliquée partout : page chant, vue partitions, mode louange. Polices locales
  (hors ligne, PWA). Le PDF ne change pas.
- **Avant la mise en ligne** : prévenir l'équipe que les annotations existantes
  vont se décaler.

## Découpage

Un lot par partie, dans cet ordre (du plus isolé au plus large). Chaque lot
laisse le site fonctionnel et a ses tests.

| Lot | Contenu | Fichiers principaux | Vérification |
| --- | --- | --- | --- |
| 1 | Nuancier | `nuances.ts`, `SongView.tsx` (`NuanceBadge`), `PerformanceMode.tsx` | test des niveaux ; captures clair/sombre, page chant + mode louange |
| 2 | Vue structure | `PerformanceMode.tsx`, `blocks.ts` | test « remplit la page » + « ×2 » ; captures téléphone et tablette |
| 3 | Choix du rôle | `PerformanceMode.tsx`, locales | test 1re ouverture, puis plus redemandé |
| 4 | Reprise des réglages | `SetlistDetailClient.tsx`, `SongDetailClient.tsx`, `PerformanceMode.tsx`, nouveaux petits modules de préférence | tests pinyin, taille, accords |
| 5 | Tonalité perso | `ListView.tsx`, `SongDetailClient.tsx`, `blocks.ts`, `PerformanceMode.tsx` | test FR + ZH : page du chant → mode louange, repère, retour |
| 6 | Police | `SongView.tsx`, `public/fonts/` | **arrêt** : captures soumises à Timothée avant d'appliquer |

Points d'arrêt : captures regardées à chaque lot ; validation de Timothée avant
le lot 6 et avant tout commit.

## Avancement (13/09/2026)

| Lot | État |
| --- | --- |
| 1 à 5 | Faits, testés (`tests/performance-mode.spec.ts`, 19 tests), captures regardées. Commités le 14/09/2026 (`5397908`, suite complète : 240 tests sur trois appareils). |
| 6 | Choix faits sur captures le 13/09/2026 et appliqués (voir ci-dessous), commités avec les lots 1 à 5. **Pinyin agrandi validé le 14/09/2026, avec un espace garanti** : sur captures (有一位神, trois appareils), à 0,7 × les syllabes longues se touchaient (« quánnéngchuàng », « shuāngshǒu ») ; une marge de 0,15 em de chaque côté du pinyin les sépare (`tests/pinyin-espace.spec.ts`). Reste, sur téléphone : une ligne trop longue passe à la ligne et son dernier accord frôle le pinyin du dessus (« 。 » seul avec A7 dans 有一位神), déjà le cas avant la marge. |

Lot 6, choix de Timothée (13/09/2026, sur captures) :

| Texte | Avant | Après |
| --- | --- | --- |
| Paroles FR, accords, titres et libellés | Inter + Space Grotesk | **Atkinson Hyperlegible Next** Regular / Bold (OFL, `public/fonts/`) |
| Caractères chinois | Source Han Sans CN **Light** | **Source Han Sans CN Medium** (OFL) |
| Pinyin (paroles, titre) | Inter (police générale) | **Andika** Regular, version web officielle SIL (OFL) ; tous les tons et ü vérifiés |
| Taille par défaut des paroles et accords | 0,88 rem | **+10 % sur téléphone, +20 % dès 768 px** (`--lyric-size`, écran seulement) |
| Pinyin | 0,6 × la taille de base | **0,7 ×** |

Écartées : Source Sans 3 et Inter partout (FR) ; LXGW WenKai (25 Mo) et LXGW Neo
XiHei (licence IPA : pas d'allègement possible sans contraintes) pour le chinois ;
Noto Sans pour le pinyin. Le PDF garde ses polices (Space Grotesk, Source Han
Light, Liberation). Non modifiés : le 简谱 simple sur une ligne (`JianpuLine`,
caractères en chasse fixe ; seul son pinyin passe en Andika) et le titre chinois
en KaiTi.

Fichiers devenus inutilisés, supprimés le 14/09/2026 à la demande de Timothée :
`public/fonts/Han-source.otf` (8 Mo) et `public/fonts/inter-latin-ext-400-normal.ttf`
(aucune référence dans le code, les scripts ni le service worker ; le PDF et
`scripts/build-glyph-widths.ts` utilisent `SourceHanSansCN-Light.ttf` et `Inter-Regular.ttf`, conservés).

Précisions de réalisation :

- **Vue structure** : agrandissement plafonné à ×3, et limité pour qu'aucun
  libellé ne passe à la ligne (largeur naturelle mesurée). Après affichage, si
  la page déborde encore (longues consignes sur petit téléphone), l'échelle est
  réduite jusqu'à ce que tout tienne. Un chant court (2 lignes) ne remplit donc
  pas tout l'écran.
- **« ×2 »** : même règle dans le bandeau 简谱 (auparavant : seulement sans
  aucune nuance).
- **Rôle** : le choisir ou le retirer (Réglages) vaut réponse à la question de
  la première ouverture.
- **Accords repris** : si le rôle retiré était Batteur, les paroles
  réapparaissent (comme sur la page setlist).
- **Modulations** : suivent l'écart de la tonalité choisie ; orthographe de la
  transposition du site (ex. Db plutôt que C#).

Défauts trouvés et corrigés en route :

- Échap dans une feuille (Réglages) pouvait **quitter le mode louange** quand le
  focus était retombé sur la page (ex. après « Revenir à G ») : un Échap déjà
  traité par la feuille est maintenant ignoré.
- Le bouton « Mode Louange » n'avait pas de nom accessible sur téléphone
  (libellé masqué) : `aria-label` ajouté.

Corrigé ensuite (14/09/2026, à la demande de Timothée) :

- **Erreur d'hydratation en 中文** (connexion, page du chant) : la langue
  basculait sur l'instance i18next globale pendant que les parties sous
  `<Suspense>` n'étaient pas encore hydratées. La langue passe maintenant par
  un état React (`I18nProvider`, une instance par langue) ; la barre de
  navigation utilise `useSetLanguage()`. Test : `tests/i18n-hydration.spec.ts`.
- **Libellé contredisant le nom écrit** (« Interlude » affiché « Intro »,
  19 sections dans 17 chants) : `formatSectionName` suit le nom écrit quand il
  désigne une autre sorte de section. Le type ne change pas (ids, couleurs,
  setlists) : les « Pré-refrain » écrits sous `start_of_verse` gardent la
  couleur du refrain. Test : `tests/section-labels.spec.ts`.

Tests sur trois appareils (14/09/2026, consigne de Timothée) : projets
`ordinateur`, `telephone` (Pixel 7) et `tablette` (iPad, Chromium) ; 3 navigateurs
en parallèle. La suite (240 tests) a révélé et fait corriger :

- 13 boutons réduits à leur icône sur téléphone sans nom accessible (setlist,
  page du chant, barre de navigation) : `aria-label` ajoutés ;
- la position de la liste des chants perdue si l'on avait fait défiler avant
  l'hydratation : elle est aussi enregistrée au clic dans la liste ;
- des tests trop pressés (formulaire rempli avant l'hydratation, carte choisie
  avant le filtre de l'adresse, défilement pendant l'animation du menu).

Remarqué, sans y toucher :
- Textes 中文 ajoutés (question du rôle, tonalité) : à relire par un sinophone.

## Commandes

```bash
npx tsc --noEmit
npm run lint
npm test -- tests/performance-mode.spec.ts
npm test            # suite complète avant de rendre la main
```

## Tests (Playwright)

- `tests/performance-mode.spec.ts` : setlist simulée (`tests/helpers/fakeSession.ts`,
  aucune écriture en production), un chant FR (`abba-pere`) et un chant ZH.
- Chaque lot : un test qui échoue avant, passe après.

## Limites

- Toujours : un chant FR + un chant ZH ; captures regardées, pas seulement les tests.
- Demander avant : la police (lot 6), tout changement du PDF, de l'éditeur de
  setlist, du style d'ensemble.
- Jamais : écriture dans le Firestore de production depuis les tests ; retouche
  des calques 简谱 certifiés ; changement des couleurs de section, d'accords,
  de 简谱 ou de services.

## Critères de réussite

- Un badge `ff` se distingue d'un badge `p` sans lire le texte ; `cresc.` porte
  une flèche qui monte.
- En vue Batteur sur tablette, la structure d'un chant de 3 sections occupe
  l'essentiel de la hauteur ; deux refrains identiques s'affichent « Refrain ×2 ».
- Première ouverture sur un appareil vierge : la question du rôle apparaît ;
  à la deuxième, non.
- Pinyin masqué sur la setlist → masqué en mode louange. Texte agrandi sur la
  page du chant → agrandi en mode louange.
- Chant passé de G à A sur la page du chant ouverte depuis la setlist → joué en A
  en mode louange, repère « A · setlist : G », retour à G possible.
