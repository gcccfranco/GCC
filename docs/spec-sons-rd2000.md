# Spec : Sons du RD-2000 — le catalogue du clavier dans Harmonie

Demande de Timothée du 01–02/10/2026 : « je veux que tu listes tous les sons du piano aussi sur le
site pour aider les pianistes ». Contenu fourni : son classeur `RD2000 Catalogue Sons.xlsx`
(dossier `Site partitions/`, hors dépôt), le catalogue du Roland RD-2000 de l'église.

**État : spec écrite le 02/10/2026, questions tranchées le jour même** (« Décisions » en fin de
document). Rien n'est codé ; code tranche par tranche, après un go explicite.

## La demande

Mettre dans l'app, pour les pianistes, ce que dit le classeur : tous les sons du clavier et leur
note « Louange », quel son sortir à quel moment du culte, comment régler les sons essentiels, ce
que fait chaque paramètre. À lire en préparant le culte et devant le clavier, sur téléphone.

**« Aucun son » tient toujours** (décision du 17/09/2026, `spec-harmonie.md`) : lister les sons du
clavier n'est pas jouer de l'audio. La page affiche des noms, des numéros et des réglages ; ni
lecteur, ni extrait, ni enregistrement.

Réussite :
- Jo, au clavier avant le culte : Chants → « Harmonie » → « Sons du RD-2000 » ; sous « Louange —
  morceaux rapides », « Refrain : 0017 Comp Brill Grand + 0340 Slow FullStrings » ; il tape 0017.
- Esther cherche « upright » : 0028 Upright Piano ★★★ en tête ; sa fiche se règle dans l'ordre
  (Piano Designer : String Resonance 22, Duplex Scale 15, Hammer Noise +1…).
- Un guitariste ou un chanteur ne voit pas la ligne, et l'adresse lui est refusée. En 中文 :
  libellés chinois, contenu en français annoncé par une ligne.

## Ce que contient le classeur (lu en entier le 02/10/2026)

Cinq onglets, chacun avec titre, sous-titre et en-têtes en ligne 4 ; aucune formule.

| Onglet | Colonnes | Contenu |
| --- | --- | --- |
| 1 Tous les sons | N°, Nom, Catégorie, Sous-catégorie, Louange, Commentaire, Édition possible, MSB, LSB, PC | **1 155 sons** : 17 pianos premium S01–S17, 1 113 internes 0001–1113, 25 d'extension 2001–2025. ★★★ 53 · ★★ 344 · ★ 359 · — 399. 10 catégories, 54 sous-catégories. Aucune cellule vide, aucun N° en double. |
| 2 Guide par moment | Moment, son principal + N°, layer éventuel + N°, conseil | 7 groupes (accueil, louange rapide, louange lente, adoration, cantiques, gospel, intros et transitions), **23 moments** dont 10 avec layer, une règle générale. 28 sons cités (20 ★★★, 8 ★★), tous dans l'onglet 1 sous le même nom. |
| 3 Réglages par son | N°, nom ou recette, écran, paramètre, valeur proposée, pourquoi | 7 recettes par famille R1–R7 (« pour tout son qui n'a pas sa fiche », 71 réglages), puis **53 fiches = exactement les 53 ★★★** (7 à 13 réglages chacune, 523 en tout). Chaque bloc s'ouvre sur « ◆ INTENTION ». |
| 4 Paramètres | Paramètre, plage, ce que ça fait, réglage conseillé louange, priorité | **99 paramètres**, 2 parties, 15 groupes (Piano Designer, Tone Designer, Sym. Resonance, Zone Edit, Key Touch, EQ…). Priorité ★★★ 41 · ★★ 34 · ★ 24. |
| 5 Légende & méthode | Élément, signification | 10 sections, 32 lignes : sens des étoiles, points techniques, méthode, trois pièges. Plusieurs lignes parlent du tableur (« filtre la colonne N° », « les 5 onglets »). |

Par catégorie (sons, dont ★★★) : CONCERT 44 (26) · STUDIO 41 (9) · VINTAGE 83 (3) · MODERN 42 (2) ·
CLAV 86 (0) · ORGAN 85 (2) · STRINGS 45 (4) · PAD/CHOIR 137 (7) · BASS 105 (0) · OTHER 487 (0).
*Après correction (02/10/2026) : 0627–0691 (guitares, cordes pincées) passent d'OTHER à BASS,
comme dans la Sound List Roland : BASS 170 · OTHER 422.*

Exemples : `S01 · Stage Grand · CONCERT / Concert Piano (premium) · ★★★ · « ★ LE piano principal… »
· Piano Designer + Individual Voicing · 84 / 16 / 1` ; fiche S01 : « Piano Designer · Lid · 4 ·
au-delà de 4 le piano devient agressif en façade ».

À savoir :
- **Commentaires et notes souvent par famille** : 140 textes pour 1 155 sons, 89 propres à un son,
  les autres en série (« Leads de synthé — quelques soft leads utilisables en solo » × 122) ; les
  67 E.Organ autres que RotaryOrgan1 sont tous ★★, Surf Monkeys compris ; Chipmunk est ★★
  « Chœurs — très efficace en louange ». 18 commentaires commencent par « ★ » (tous ★★★) : gardés.
- **MSB / LSB / PC** : S01–S17 = 84 / 16 / 1–17, puis une seule suite 84 / 0–8 / 1–128 de 0001 à
  2025, extension comprise (2001 = 84 / 8 / 90) : **vérifié le 02/10/2026 sur les 1 155 sons** contre la Sound List Roland. PC affiché 1–128 ; en
  MIDI, retirer 1 (onglet 5).
- Noms Roland en anglais, comme à l'écran (« Rox Organ Ph » et « Rox Organ PH » sont deux sons).
  Fiches pas tout à fait dans l'ordre du catalogue (0028–0039 avant 0019–0027). 39 « pourquoi »
  vides, tous dans les recettes.

**Écarts entre onglets : corrigés le 02/10/2026** (Q8 : « fais tes recherches et corrige les
incohérences »), d'après la documentation Roland (Sound List, Parameter Guide, Owner's Manual).
Copie corrigée `../RD2000 Catalogue Sons — corrigé.xlsx` (l'original n'est pas touché), détail
cellule par cellule et sources dans `../RD2000 corrections.md`. 1 141 cellules, aucune note ★ changée :
- **Écrans** : Sym. Resonance n'existe que sur les 34 pianos SuperNATURAL (note *2 de la Sound
  List) : retirée de l'« Édition possible » de 956 sons, et 12 fiches (0019–0027, 0040, 0041, 0111)
  disent « Indisponible ». 64 sons étaient rangés à tort au Piano Designer (14), à l'écran E.Piano
  (42) ou CLAV (8). Tone Color des recettes R1–R3 au Piano Designer, réglages EP de R4 au Tone Designer.
- **Catégorie** : 0627–0691 (guitares, instruments pincés) sont sous le bouton BASS dans les deux
  listes Roland : BASS 170 sons, OTHER 422.
- **Textes** : 15 « pourquoi » de série réécrits pour suivre la valeur choisie (Hammer Noise +1,
  Lid 5, Tremolo/Amp et Mod FX OFF) ; légende « — » alignée sur les notes ; titre des fiches = ordre
  réel ; onglet 4 : Indiv. Voicing, Sym. Resonance, PRESET, ROTARY Type2 (v1.50).
- **Vérifié conforme** : les 1 155 noms et MSB / LSB / PC (2001 = 84 / 8 / 90 compris) ; PC affiché
  1–128, en MIDI PC − 1.
- **À confirmer par Timothée** (liste dans le fichier) : 0019 ★★★ mais « dépannage » ; notes posées
  par famille (E.Organ ★★, Chipmunk ★★) ; les 18 « ★ » de commentaire ; le bouton BASS au clavier.

## Proposition

| Point | Proposition |
| --- | --- |
| Où | Dans Harmonie (Q1) : ligne « Sons du RD-2000 » en tête de `/harmonie` (à côté de « Cours » si `spec-cours-harmonie.md` est retenue) → `/harmonie/rd2000`. Page d'un son ou d'une recette : `/harmonie/rd2000/<N°>` (`S01`, `0017`, `R4`). Le dossier `rd2000/` passe avant `[...fiche]`, dont les ids ont deux segments. |
| Qui | Pianistes et admins (Q2) : `useAccesHarmonie().piano`, déjà calculé (colonne Piano des plannings ; admin = les deux instruments). Aucune règle nouvelle. Si `/harmonie` s'ouvre à d'autres pour les cours, la ligne reste aux pianistes. |
| Vues | Trois pilules (`Pilules`, comme les filtres d'Harmonie) : **Par moment** (par défaut) · **Tous les sons** · **Paramètres** ; « Mode d'emploi » (Q3) en pied de page. Mêmes composants que `/harmonie` (`PageTitle`, `Group`, `GroupRow`). |
| Par moment | 7 groupes, 23 moments : le moment, puis le son principal et le layer éventuel (« 0017 Comp Brill Grand », « + 0340 Slow FullStrings »), chacun touchable vers sa page ; le conseil en petit ; la règle générale en pied. |
| Tous les sons | Recherche par nom ou N° (casse et espaces ignorés), **toujours sur les 1 155**. Sans recherche : filtre Louange ★★★ par défaut (53 sons), puis « ★★ et plus », « ★ et plus », « Tous » (Q4) ; filtre catégorie ; groupes par catégorie, étoiles puis ordre du classeur. Ligne : N° en gros (chiffres tabulaires), nom, étoiles, commentaire sur une ligne. |
| Page d'un son | N° en gros, nom, catégorie › sous-catégorie, étoiles et leur sens, commentaire, édition possible, MIDI (Q5). **Réglages** : pour un ★★★, sa fiche (intention, puis les réglages dans l'ordre du classeur, un titre par écran ; valeur en gros, pourquoi en petit) ; sinon « Pas de fiche pour ce son : pars de la recette de sa famille » et les 7 recettes. |
| Recette | R1–R7 : nom, intention, sons d'exemple en liens, réglages. |
| Paramètres | 99 lignes en 2 parties et 15 groupes : nom, plage, ce que ça fait, réglage conseillé, priorité en étoiles. |
| Deux touches | Depuis l'onglet Chants : « Harmonie », « Sons du RD-2000 » → la vue Par moment, le N° à taper en tête de chaque son. Une touche de plus : la fiche du son. |
| Jamais | Ni en mode louange, ni sur la page d'un chant ou d'une setlist ; rien n'est joué. |

| Libellé | Français | 中文 (proposé, relu par Timothée) |
| --- | --- | --- |
| Ligne de `/harmonie` | Sons du RD-2000 · 53 essentiels sur 1 155 | RD-2000 音色 · 精选 53 个（共 1155 个） |
| Vues | Par moment · Tous les sons · Paramètres | 按环节 · 全部音色 · 参数 |
| Filtre | Louange : ★★★ · ★★ et plus · ★ et plus · Tous | 敬拜：★★★ · ★★ 以上 · ★ 以上 · 全部 |
| Recherche | Nom ou numéro | 名称或编号 |
| Sans fiche | Pas de fiche pour ce son : pars de la recette de sa famille. | 此音色没有专门设置，请参考同类的通用设置。 |
| Pied, contenu | Mode d'emploi · Contenu en français. | 使用说明 · 内容为法文。 |

## Données

- **Conversion** (Q6) : `scripts/rd2000/convertir.py`, Python, bibliothèque standard seulement
  (`zipfile` + `xml.etree`), lancé à la main, **hors build**, comme `scripts/jianpu/build-chords.py`
  → `public/rd2000.json`, commité. Une ligne par son, moment, recette, fiche, paramètre : un
  changement du classeur = un diff lisible. ≈ 460 Ko, ≈ 35 Ko compressé ; un seul fichier, chargé
  comme `harmonie-index.json`.
- **Forme** : `sons[{ n, nom, categorie, sousCategorie, louange: 0–3, commentaire, edition, msb,
  lsb, pc }]`, `moments[{ groupe, moment, son, layer, conseil }]`, `regleMoments`, `recettes[{ n,
  nom, intention, pourquoi, exemples, reglages[{ ecran, parametre, valeur, pourquoi? }] }]`,
  `fiches[]` (même forme, sans nom ni exemples), `parametres[{ partie, groupe, nom, plage, effet,
  conseil, priorite: 1–3 }]`, `legende[{ section, element, texte }]`. Textes **tels quels**.
- **Contrôles** (un échec = rien n'est écrit) : 10 colonnes remplies, étoiles connues, N° uniques ;
  chaque son du guide et chaque exemple de recette existe sous le même nom ; fiches = exactement
  les ★★★ ; chaque bloc s'ouvre sur « ◆ INTENTION ». Brouillon fait hors dépôt le 02/10 : vert.
- Rien dans Firestore, aucune règle, rien en `localStorage` en V1 (ni vue ni filtre retenus).
  Accès filtré côté navigateur, comme le catalogue : le JSON est public, comme les chants.
- **Hors ligne** (Q9) : réseau nécessaire, comme le catalogue (le service worker ne garde pas
  `/harmonie-index.json`). L'accès se lit dans les plannings (Google Sheets, jamais en cache) :
  hors ligne, un pianiste non admin ne passerait pas le contrôle. La setlist demande déjà le réseau.
- **中文** (Q7) : libellés bilingues dès S1 ; contenu en français (≈ 645 textes, 30 000 signes)
  annoncé par « 内容为法文。» ; noms des sons et catégories en anglais, comme à l'écran du clavier.

## Tranches (test d'abord, trois appareils, interface FR + 中文)

**S0 — Données.** `scripts/rd2000/convertir.py`, `public/rd2000.json`.
`tests/rd2000-donnees.spec.ts` (lit `/rd2000.json`) : 1 155 sons (17 · 1 113 · 25) ; 53 · 344 ·
359 · 399 ; 23 moments en 7 groupes, chaque son cité existe ; 7 recettes ; 53 fiches = les ★★★ ;
99 paramètres.

**S1 — Tous les sons.** Ligne dans `/harmonie`, `/harmonie/rd2000` (vue Tous les sons), recherche,
filtres, accès, libellés. *Où* : `src/app/harmonie/page.tsx`, `src/app/harmonie/rd2000/`,
`src/lib/harmonie/rd2000.ts` (types, chargement), locales. `tests/rd2000.spec.ts` (`signInAs`,
comme `harmonie-catalogue.spec.ts`) :
- pianiste et admin voient la ligne et la page ; guitariste, chanteur, batteur ni l'une ni
  l'autre (`common.noAccess`) ;
- par défaut 53 sons en 7 catégories, « Tous » → 1 155 ; « 0675 » trouve Harp (★★) même filtré sur
  ★★★, « stage grand » trouve S01 ; à 412 px rien ne déborde ; en 中文, libellés et « 内容为法文。».

**S2 — Par moment.** Vue par défaut. Tests : 7 groupes, 23 moments ; « Refrain » des morceaux
rapides montre 0017 et 0340 ; toucher 0340 ouvre sa page ; la règle générale en pied.

**S3 — Page d'un son, recettes.** `src/app/harmonie/rd2000/[n]/`. Tests : S01 → intention puis
13 réglages dans l'ordre, titres « Piano Designer », « Zone Edit », « Key Touch » ; 0675 → « Pas de
fiche » et 7 recettes ; R4 → 4 sons d'exemple en liens ; MIDI selon Q5 ; N° inconnu → « Son
introuvable ».

**S4 — Paramètres, mode d'emploi.** Tests : 99 paramètres, 15 groupes, 2 parties ; mode d'emploi
selon Q3 (aucune ligne « filtre la colonne » si Q3 = b).

Un commit par tranche, ou le lot entier sur un seul go.

## Hors périmètre

- Aucun son joué ; pas de son conseillé par chant ni par setlist (le classeur raisonne par moment
  du culte) ; pas d'éditeur, de favoris ni de « mes scènes ».
- Pas de lien réglage → « Paramètres » (20 des 46 noms diffèrent : « REV (Reverb Send) » / « REV
  (Reverb Send Level) ») ; pas de correspondance son → recette, que le classeur ne donne pas.

## Questions à trancher

1. **Où ?** (a) dans Harmonie, ligne en tête de `/harmonie` ; (b) une entrée de plus dans l'onglet
   Chants ; (c) une section dans « Moi ». Recommandation : (a), c'est la section des pianistes ;
   deux touches depuis l'onglet Chants, qui reste tel quel.
2. **Qui ?** (a) pianistes + admins ; (b) tout Harmonie, guitaristes compris ; (c) tout compte
   connecté. Recommandation : (a), la demande vise les pianistes et `useAccesHarmonie` le sait
   déjà ; un guitariste aussi pianiste dans un planning le voit.
3. **Quels onglets en ligne ?** (a) les cinq tels quels ; (b) 1 à 4, et le 5 sans ses lignes de
   tableur (« Les 5 onglets », « Méthode en trois temps », « Filtre la colonne Louange… ») ; (c) 1
   et 2 d'abord. Recommandation : (b) ; les fiches sont ce qui sert devant le clavier.
4. **Tous les sons d'emblée ?** (a) les 1 155, ★★★ en tête ; (b) ★★★ par défaut, filtre jusqu'à
   « Tous », recherche toujours sur les 1 155 ; (c) seulement ★ et plus (756) ; (d) seulement ★★★.
   Recommandation : (b), tout y est et le premier écran suit la méthode du classeur (« ★★★ »).
5. **MSB / LSB / PC ?** (a) non affichés ; (b) une ligne sur la page d'un son, avec « en MIDI :
   PC − 1 » ; (c) aussi dans la liste. Recommandation : (b) si quelqu'un pilote le clavier en MIDI
   (MainStage), sinon (a) ; avant d'afficher, vérifier deux valeurs au clavier ou sur la Sound
   List Roland, dont 2001 (84 / 8 / 90 dans le classeur).
6. **Source et mise à jour ?** (a) conversion unique, puis le JSON du dépôt est la source, retouché
   par Claude ; (b) le classeur reste la source, chez toi : je relance `convertir.py` à ta demande,
   tu relis le diff, commit ; (c) le `.xlsx` commité, lu au build (dépendance npm, diff illisible).
   Recommandation : (b), le tableur reste l'outil pour 1 155 lignes, le dépôt garde l'historique.
7. **中文 ?** (a) libellés seulement, contenu en français + une ligne ; (b) traduire aussi le
   contenu (≈ 645 textes) après validation du français ; (c) rien. Recommandation : (a), puis (b)
   si un pianiste sinophone le demande : même règle que les fiches, le français d'abord.
8. **Écarts du classeur ?** (a) tu corriges le classeur avant S0 ; (b) publié tel quel, « à
   vérifier au clavier » sur chaque fiche ; (c) je corrige dans le JSON. Recommandation : (a) pour
   1 à 4, des faits à vérifier au clavier ; 5 et 6 sont des choix de notation, à toi de voir ;
   (c) contredirait Q6 = b.
9. **Hors ligne ?** (a) réseau nécessaire, comme Harmonie ; (b) garder `/rd2000.json` dans le
   service worker **et** retenir l'accès sur l'appareil. Recommandation : (a) en V1 ; (b) si un
   pianiste bute dessus à l'église.
10. **En ligne ?** (a) en ligne comme Harmonie, après ta validation en local ; (b) derrière
    `BACK_OFFICE`. Recommandation : (a), ce n'est pas un outil de responsables.

## Commandes

```bash
python3 scripts/rd2000/convertir.py      # lit « RD2000 Catalogue Sons — corrigé.xlsx »
npx tsc --noEmit && npm run lint
npm test -- tests/rd2000-donnees.spec.ts tests/rd2000.spec.ts
```

## Décisions (Timothée, 02/10/2026)

| # | Question | Décision |
| --- | --- | --- |
| 1 | Où | **Dans Harmonie** : ligne « Sons du RD-2000 » en tête de `/harmonie`. |
| 2 | Qui | **Pianistes + admins.** |
| 3 | Onglets | **1 à 4**, et le 5 sans ses lignes propres au tableur. |
| 4 | Par défaut | **★★★ d'abord**, filtre jusqu'à « Tous », recherche sur les 1 155. |
| 5 | MIDI | **Oui** : une ligne MSB / LSB / PC sur la page d'un son, valeurs vérifiées d'abord contre la documentation Roland. |
| 6 | Source | **Le classeur reste la source** ; `convertir.py` relancé à la demande, diff relu par Timothée. |
| 7 | 中文 | Libellés seulement, contenu en français + une ligne (recommandation retenue, non posée). |
| 8 | Écarts du classeur | « Fais tes recherches et corrige les incohérences » : copie corrigée du classeur à côté de l'original (`RD2000 Catalogue Sons — corrigé.xlsx`) et `RD2000 corrections.md` (avant / après / source) ; les notes ★ restent celles de Timothée. |
| 9 | Hors ligne | Réseau nécessaire, comme Harmonie (recommandation retenue, non posée). |
| 10 | En ligne | **En ligne**, après validation en local. |
| 11 | Six points du classeur (02/10/2026, après S4) | 0019 reste ★★★ sans « dépannage » ; notes par famille gardées ; les 18 « ★ » en tête de commentaire = **badge « Premier choix »** (champ `premier` du JSON) ; guitares sous BASS vérifiées dans la Sound List ; valeurs gardées ; les 12 lignes « Indisponible » **retirées** du classeur. Détail : `RD2000 corrections.md`. |

**Attend le go**, et que Timothée adopte la copie corrigée comme nouvelle source (S0 l'importe).

## Avancement (02/10/2026)

Go donné le 02/10/2026 ; S0 à S4 codées le jour même, **non commitées, à valider en local**.

- **Classeur corrigé** contre la documentation Roland (Sound List, Parameter Guide, Owner's
  Manual, supplément v1.50, MIDI Implementation) : 1 141 cellules, aucune note ★ touchée ;
  copie `RD2000 Catalogue Sons — corrigé.xlsx` et `RD2000 corrections.md` (avant · après ·
  source) à côté de l'original, intact. Les six points à confirmer ont été tranchés le 02/10/2026
  (décision 11) : badge « Premier choix » codé, testé sur 3 appareils, non commité.
- **S0** : `scripts/rd2000/convertir.py` (bibliothèque standard, lit la copie corrigée),
  `public/rd2000.json`, `tests/rd2000-donnees.spec.ts`. Champs ajoutés : `moments[].sonNom`,
  `layerNom`, `legende[].tableur` (9 lignes propres au tableur, cachées par la page).
- **S1–S4** : ligne « Sons du RD-2000 » dans `/harmonie` (pianistes et admins), page
  `/harmonie/rd2000` (Par moment · Tous les sons · Paramètres, mode d'emploi en pied), page
  d'un son ou d'une recette `/harmonie/rd2000/<N°>` (fiche par écran, MIDI, recettes),
  `tests/rd2000.spec.ts` (8 tests × 3 appareils).

