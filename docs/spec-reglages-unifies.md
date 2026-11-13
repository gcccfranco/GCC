# Spec : un seul rangement pour les réglages et la tonalité (lot RU)

Statut : **go de Timothée (13/11/2026, « Ok go »)**, donné en réponse au résumé de la planche et de ses recommandations :
RU-Q1 = **B**, RU-Q2 = **pour moi seulement**, avec « Changer pour toute l'équipe » pour qui édite la setlist,
RU-Q3 = **oui** (le rôle sur les trois écrans). Le go vaut pour les cinq tranches (`CLAUDE.md`, § Go).
Planche : `docs/planches/planche-reglages-unifies.html`, artefact privé https://claude.ai/artifact/A8JBDX9ktoBN6ToTKe4Hbk.
Source : `docs/parcours-oeil-2026-11-13.md`, « Les cinq choses » 2 et 3 (constats 6, 7, 8 et 12).

## Demande (Timothée, 13/11/2026, ses mots)

« il y a tellement d'incohérences et truc pas pratiques sur le site […] surtout sur les setlists et les chants, il faut
que ce soit le plus pratique pour tout le monde à l'utilisation ». Go pour la planche le même jour (« go pour les
deux », `docs/feuille-de-route.md`, § État) ; pas de code avant son choix.

But : **un seul rangement, un seul nom et une seule forme** des réglages d'affichage et de la tonalité, repris tels
quels sur la page chant, la vue d'une setlist et le mode louange. Pendant le culte, transposer et changer de notation
en un ou deux touchers ; les réglages ne couvrent pas la partition ; choriste et présidence voient moins de réglages.

## Inventaire (prouvé par un `chercheur`, 13/11)

Écrans : **A** page chant (`src/app/songs/[slug]/`), **B** vue d'une setlist (`src/app/setlists/[id]/`), **C** mode
louange (`src/components/performance/PerformanceMode.tsx`). « Compte » = clé `localStorage` suffixée par l'uid
(rien en Firestore), donc retenue *pour ce compte sur cet appareil*.

| Réglage | A page chant | B setlist | C mode louange | Portée réelle (clé) |
|---|---|---|---|---|
| Disposition | menu ⋯, vignettes (`MenuChant.tsx:18`) | menu Affichage (`MenusSetlist.tsx:113`) | « Je joue » (`PerformanceMode.tsx:2626-2650`) | appareil, `disposition`, **partagée** |
| Couleur des accords | menu ⋯ (`ChoixCouleurAccords.tsx:132`) | Affichage | Options (`PerformanceMode.tsx:2735`) | compte, `accords-couleurs-<uid>`, partagée |
| Notation Lettres / Chiffres | menu ⋯ (`ChoixNotation.tsx:51`) | Affichage | **absente** | compte, `accords-notation-<uid>` |
| Ordre des sections | panneau Personnaliser, **non retenu** (`CustomizePanel.tsx:120-175`) | Affichage, radio (`partitionLayoutPref.ts:13`) | « Je joue », segment | compte, `partition-layout-<uid>` (B et C) |
| 简谱 / Paroles | bascule de barre, **non retenue** (`SongDetailClient.tsx:707`) | Affichage, interrupteur | Options | appareil, `jianpu-sheet-pref` (B et C) |
| Pinyin | bouton « 拼 », **non retenu** (`SongDetailClient.tsx:629`) | case « ✓ Pinyin » | bouton rond | appareil, `gcc.showPinyin` (B et C) |
| Taille du texte | A− / A+ dans la barre | **absente** | Options, A− % A+ | appareil, `perf-font-scale` |
| Accords affichés | icône ♪ | mot « Accords » dans la barre | bouton (initialisé par le rôle) | **en mémoire partout** |
| Rôle « Je joue » | — | — | menu Je joue (`PerformanceMode.tsx:2564-2617`) | compte, `perf-role-preset-<uid>` |
| Propres au louange | — | — | Paroles, Annotations, 2 colonnes, Demi-page, Idées d'harmonie, Thème, Métronome, Couleur des icônes, Capo | appareil (capo par chant) |

Trois mentions de portée coexistent : « Retenue sur cet appareil » (disposition), « Retenue pour ce compte sur cet
appareil » (couleur), « Allumé par défaut, retenu sur cet appareil » (简谱). Les autres réglages n'en ont pas.

**Tonalité**

| Écran | Ce qu'on voit | Où on la change | Portée |
|---|---|---|---|
| A page chant | pilule « − Ton A + » dans la barre, pastille « A » près du titre, « 1=C » sous le titre en chinois | pilule, demi-ton par demi-ton (`PiluleTonalite.tsx`) | en mémoire ; revient à `recommended_key` |
| B setlist | lettre bleue seule (`ListView.tsx:217-260`, `PartitionView.tsx:272`) | **éditeur seulement** : grille de douze touches légendées « orig. » et « reco. » (`Reglages.tsx:63-106`) | Firestore `keyOverride`, **pour toute l'équipe** |
| C mode louange | « · A » en sous-titre ; pastille « setlist : X » si on s'en écarte (`BarreHaut.tsx:97`) | menu Outils (clé à molette), − / + (`ContenusMenus.tsx:499-515`) | **pour moi**, par setlist et par appareil (`perf-personal-keys`) |

Il y a donc deux tonalités : celle de l'équipe (setlist) et la mienne (page chant en mémoire, mode louange par
appareil). Rien ne les distingue à l'écran hors de la petite pastille du mode louange.

**Rôle** : préréglages par rôle (accords, paroles, ordre, disposition) à `PerformanceMode.tsx:377-381`, appliqués au
choix du rôle (`:627-648`) ; batteur → ordre « structure » (`partitionLayoutPref.ts:26`) ; choriste et présidence
sans accords. Le rôle ne règle que le mode louange : d'où le constat 12 (la choriste voit les accords dans la setlist).

## Pistes (planche)

- **A. Le rebord du pupitre** : une barre basse identique sur les trois écrans, tonalité « − A + » au centre, Accords,
  ABC | 123, Pinyin, 简谱 | 歌词, Réglages ; une feuille monte du rebord et repousse la musique. *Contre* : 52 px de
  plus en permanence au téléphone (le constat 5 reprochait déjà 130 px de commandes), conflit avec les points de
  page du mode louange, et G → D demande cinq touchers.
- **B. L'armure et la marge (recommandée)** : la tonalité est une **armure accrochée au titre** (« Abba Père [A] »,
  « 1=C » pour un chant chinois), au même endroit sur les trois écrans ; la toucher ouvre la **grille de douze touches
  de l'éditeur** (déjà jugée simple, constat 13) avec Lettres | Chiffres et le capo dessous. Les réglages vivent dans
  une **marge « Affichage » / 显示**, colonne de 320 px à droite en grand écran, feuille basse au téléphone et en
  tablette portrait, qui **repousse** la musique ; trois groupes : « Je joue » (le rôle), « Ce que je lis » (Accords,
  Pinyin, 简谱 | Paroles, Ordre), « La page » (Disposition, Taille, Couleur des accords, et au mode louange : 2
  colonnes, Demi-page, Thème, Couleur des icônes). « Options » et le menu ⋯ des réglages disparaissent.
- **C. Ma place dans l'équipe** : une pilule du poste (« Piano », « Chœur »…) au même coin des trois écrans ouvre un
  volet qui ne montre que ce que ce poste règle ; la tonalité « − A + » à côté. *Contre* : le poste écrase-t-il ce
  qu'on a réglé à la main, deux objets au lieu d'un, pilule loin du pouce.

## Recommandation : B

1. **Une seule forme pour la tonalité, là où l'œil est déjà** : l'armure remplace la pilule, la pastille, la lettre
   bleue et « · A » d'un coup, et supprime le « 1=C » en double. Pleine = « ma tonalité », au contour = celle de
   l'équipe (ou la recommandée sur la page chant) : la différence se voit sans couleur ni jargon.
2. **Deux touchers pour toute tonalité** : la grille de douze touches existe et plaît ; avec − / + (pistes A et C),
   G → D en coûte cinq. Lettres | Chiffres est dans la même fenêtre (les chiffres se lisent depuis la tonalité).
3. **Rien ne couvre la musique** : la marge pousse, elle ne se pose pas dessus (constats 1 et 2).
4. **La barre du téléphone tient sur une ligne** (constat 5) : la tonalité et A− / A+ la quittent.
5. **Un nom, trois groupes, une mention de portée par groupe** ; le rôle en tête masque ce qui ne concerne pas
   choriste et présidence.

Coût : environ cinq tranches (ci-dessous). Risque principal : la marge de 320 px resserre la musique en tablette
paysage au mode louange ; les deux colonnes se replient en une tant que la marge est ouverte (règle : deux colonnes
si chacune garde 340 px), et le 简谱 sur deux volets suit le même repli. Aucune zone gelée n'est touchée (le bleu du
chrome du mode louange passe à l'encre, ce n'est pas `--chord-color`).

## Questions à Timothée (la recommandation en premier)

- **RU-Q1 — Piste** : **B** (recommandée), A ou C.
- **RU-Q2 — Tonalité changée hors de l'éditeur** : **pour moi seulement**, partout (page chant : le temps de la page,
  elle revient ensuite à la recommandée ; setlist et mode louange : par setlist et par appareil, la même tonalité dans
  la vue setlist et au mode louange), et la fenêtre de l'armure offre « Changer pour toute l'équipe » aux seules
  personnes qui peuvent éditer la setlist (recommandé). Ou : dans une setlist, changer la tonalité la change pour toute
  l'équipe (plus direct, mais un musicien qui transpose pour lui changerait celle des autres).
- **RU-Q3 — Rôle « Je joue » sur les trois écrans** : **oui** (recommandé) : un seul réglage, corrige le constat 12 ;
  changer de rôle réapplique son préréglage, avec une ligne « Réglé pour Choriste, modifié à la main » quand on s'en
  est écarté. Ou : le rôle reste propre au mode louange.

**Décisions déléguées (session planche, 13/11, faciles à défaire)**, prises selon la proposition de la planche :
- Les réglages que la page chant garde en mémoire (pinyin, 简谱 | Paroles, ordre, accords affichés) deviennent
  retenus, avec les mêmes clés que la setlist et le mode louange ; **une seule mention**, « Retenu sur cet appareil /
  保存在本设备 », une fois par groupe (toutes les clés vivent sur l'appareil ; « pour ce compte » n'apporte rien au
  musicien). La fenêtre de l'armure dit « Pour moi, le temps de la page » (page chant) ou « Pour moi, sur cet
  appareil » (setlist, mode louange).
- **Noms chinois : on garde ceux déjà en place** (我演奏, 排版, 文字, 钢琴手…) ; seuls les nouveaux (显示, groupes de la
  marge, « 仅本页有效 », « 本队用 G 调 ») sont à faire relire par quelqu'un qui lit le chinois.
- « Chaque section une fois » devient « Une fois chacune » dans la marge (place) ; 每段一次 inchangé.
- Mode louange, barre cachée : l'armure flotte dans le coin haut **seulement quand le titre est sorti de l'écran**.
- Tablette paysage (1 080 px) au mode louange, marge ouverte : chaque colonne tomberait à 332 px (< 340), donc **une
  colonne** tant que la marge est ouverte ; deux colonnes dès 1 096 px.
- Nouveaux libellés zh à faire relire : 显示, 阅读内容, 页面, 仅本页有效, 仅本设备, 保存在本设备, 本队用 G 调,
  为整个团队更改.
- Le menu ⋯ de la page chant ne garde que Personnaliser et Signalement ; « Outils » du mode louange garde métronome,
  annotations, idées d'harmonie (la tonalité et le capo passent dans la fenêtre de l'armure).

## Tranches (après go seulement ; une session par tranche, `CLAUDE.md` § Coder)

Ordre imposé par les chantiers en cours : RU-4 (mode louange) **après** TC-4 et JV-4/JV-5, jamais pendant qu'une autre
session modifie `PerformanceMode.tsx`.

### RU-1 — L'armure et sa fenêtre (M)
Composant partagé `Armure` (+ fenêtre) : grille de douze touches reprise de `Reglages.tsx:63-106` (légendes « orig. »,
« reco. », « équipe », « moi »), Lettres | Chiffres (`ChoixNotation`), capo pour le guitariste, « Changer pour toute
l'équipe » si `canEditSetlist`. Pleine si tonalité personnelle ≠ équipe, au contour sinon ; « 1=C » pour un chant
chinois. Lecture seule pour choriste et présidence (« L'équipe joue en G / 本队用 G 调 »). Libellés fr et zh.
Critères : deux touchers de la fermeture à n'importe quelle tonalité ; ♯ et ♭ jamais sur deux lignes ; Échap et toucher
dehors ferment ; flèches dans la grille (`role="radiogroup"`). Spec Playwright : `armure.spec.ts` (composant monté
sur la page chant d'un chant FR et d'un chant ZH, trois appareils).

### RU-2 — La marge « Affichage » (M)
Composant partagé `MargeAffichage` et un crochet unique `useReglagesAffichage` qui lit les clés existantes (aucune
migration de clé) ; trois groupes, une mention de portée par groupe ; colonne de 320 px qui pousse le contenu dès la
tablette paysage, feuille basse opaque sans voile en dessous (60 % au téléphone, 560 px en tablette portrait), qui
défile. Aucune animation au mode louange ; ressort sans rebond ailleurs ; fondu 150 ms si mouvement réduit.
Critères : rien de la musique sous la marge (mesure des rectangles) ; aucun bas coupé à 412 × 700. Spec :
`marge-affichage.spec.ts`, cinq projets (`SPECS_GRAND_ECRAN`).

### RU-3 — Page chant (M)
`SongDetailClient.tsx` : barre sur une ligne (←, Harmonie, Vidéo, Crayon, Affichage), armure à la place de la pilule
et de la pastille, plus de « 1=C » sous le titre ; pinyin, 简谱 | Paroles, ordre et accords retenus ; `MenuChant.tsx`
réduit à Personnaliser et Signalement ; `CustomizePanel.tsx` garde l'ordre personnalisé (non retenu, `?structure=`).
Critères : barre sur une ligne à 412 px en français et en chinois ; tonalité jamais tronquée. Specs touchées :
`barre-chant`, `chant-*`, nouvelle `page-chant-reglages.spec.ts`, cinq projets.

### RU-4 — Vue d'une setlist (S à M)
`SetlistDetailClient.tsx`, `MenusSetlist.tsx` (le menu Affichage devient la marge), `ListView.tsx`, `PartitionView.tsx`
(armure à côté du titre, plus de lettre bleue seule ; tonalité personnelle par setlist, même clé que le mode louange).
Critères : transposer pour soi sans éditer la setlist ; l'éditeur reste seul à changer `keyOverride` sauf « Changer
pour toute l'équipe ». Specs : `setlist-*` touchées, `setlist-tonalite-perso.spec.ts`.

### RU-5 — Mode louange (M à L, après TC-4, JV-4 et JV-5)
`PerformanceMode.tsx` (Je joue et Options fusionnés dans la marge, environ 300 lignes déplacées), `BarreHaut.tsx`
(titre et armure ; armure en coin barre cachée ; bouton Affichage à la place de Je joue et de T), `ContenusMenus.tsx`
(Tonalité et Capo quittent Outils), chrome bleu passé à l'encre. Deux colonnes et 简谱 sur deux volets se replient
en une tant que la marge est ouverte et qu'une colonne ferait moins de 340 px. Si RU-Q3 = oui, le rôle s'applique aussi
aux écrans A et B (`roleCompte.ts`). Critères : transposer et passer en Chiffres en deux touchers, barre montrée ;
rien de couvert ; choriste sans Accords, Lettres | Chiffres ni Couleur des accords. Specs : `louange-menus`,
`louange-*` touchées, cinq projets ; captures aux quatre dispositions et 1 440.

Fin de lot : specs du lot et des trois pages, sur les trois appareils (la suite complète tourne à part, `CLAUDE.md`).
Aucune règle Firestore touchée (tonalité personnelle en `localStorage`).

## Avancement

- 13/11 : **go de Timothée** (« Ok go ») ; RU-1 lancée par la session de la planche. Ordre : RU-1, RU-2, puis RU-3
  **après** les corrections du parcours (constat 5 : barre de la page chant, même fichier `SongDetailClient.tsx`), RU-4,
  puis RU-5 après TC-4, JV-4 et JV-5.

- 13/11 : inventaire (`chercheur`), planche (`/planche`, critique « à retoucher » : la recommandée était la moins
  dessinée ; une reprise du maquettiste : feuille au téléphone, tablette paysage au mode louange, barre cachée,
  choriste, armure dans une setlist, mentions de portée alignées), regardée aux quatre tailles, publiée, spec. Attend
  le choix de Timothée.
- 13/11 : **RU-1 faite** (session RU-1). Composant `src/components/song/Armure.tsx` (armure pleine / au contour / en
  pointillé, « 1=E » en chinois, fenêtre Radix de douze touches en `radiogroup` avec flèches, légendes équipe / reco. /
  orig. / moi, Lettres | Chiffres par la nouvelle variante `fenetre` de `ChoixNotation`, capo et « Changer pour toute
  l'équipe » en props optionnelles, lecture seule « L'équipe joue en G »), libellés fr et zh. Branchée sur la page chant
  par une prop `armure` de `SongView` qui remplace la pastille (barre et pilule non touchées : RU-3). *Décision
  déléguée (session RU-1, 13/11)* : capo, lecture seule et « toute l'équipe » ne sont pas branchés sur la page chant
  (pas de rôle ni d'éditeur ici avant RU-4 et RU-5) ; ils seront testés là. En passant : l'espace fine de
  `jianpuSheetHint` (fr.json), qui faisait échouer `coherence.spec.ts` depuis JV-1. Tests : `armure.spec.ts` 24/24 sur
  les trois appareils (51 s) ; voisines (`barre-chant`, `entete-chant-jianpu`, `jianpu-tonalite-cho`,
  `statistiques-chant`, `coherence`, `nouveau-chant`, `chants-fetes`) vertes, environ 9 min de tests dans la tranche.
  À regarder en RU-3 : le `jianpuKey` d'un `.cho` (« 1=bB ») n'est plus montré par l'armure, qui écrit « 1= » + tonalité.
- 13/11 : **RU-2 faite** (session RU-2). Crochet `src/hooks/useReglagesAffichage.ts` (clés existantes seulement :
  disposition, notation, ordre, 简谱, pinyin, taille, rôle ; « Accords affichés » en mémoire ; évènement de fenêtre
  `gcc:reglages-affichage` pour garder deux instances synchrones) et composant `src/components/song/MargeAffichage.tsx`
  (trois groupes, une mention « Retenu sur cet appareil / 保存在本设备 » chacun ; colonne de 320 px qui pousse la musique
  dès 1 024 px ; feuille opaque de 60 dvh sans voile, 560 px dès 768 px, au-dessus de la barre d'onglets, réserve en bas
  de la musique ; louange sans transition, ressort 300 ms sans rebond, fondu 150 ms en mouvement réduit ; emplacement
  `groupePage` pour RU-5). `ChoixCouleurAccords` gagne `sansMention`. *Décisions déléguées (session RU-2, 13/11)* : banc de
  montage `/banc/marge-affichage` (`notFound()` en production ; à retirer quand RU-3 monte la marge) faute d'écran
  montable sans toucher SongDetailClient, PerformanceMode ni la setlist ; choisir un rôle n'écrit que le rôle (préréglages :
  RU-5) ; Lettres | Chiffres = `ChoixNotation` variante `fenetre`. À voir plus tard : `getRole` déclenche la migration
  existante de `roleCompte.ts` ; « Accords affichés » (variable de module) ne se remet pas à oui au changement de compte.
  Nouveaux libellés zh à faire relire : 显示, 关闭显示, 保存在本设备. Tests : `marge-affichage.spec.ts` 60/60 sur les cinq
  projets, `armure` et `coherence` vertes (120 passés, 3 sautés) ; environ 5 min de tests hors workflow (≈ 26 min de
  tranche en tout). Captures des cinq dispositions regardées.
