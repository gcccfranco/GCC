# Spec : export d'une setlist pour FreeShow (régie)

Demande de Timothée du 01/11/2026 : « À l'église on utilise FreeShow, est-ce que seulement pour la régie, on peut
faire un export dans le format des documents FreeShow ? ». Réponses du même jour : **toute la setlist d'un coup**, au
format **`.project`**, chants chinois en **caractères + pinyin** ; bouton **pour la régie seulement** ; diapo de fin
**vide** (la régie y pose son image) ; **pas de traduction** des chants chinois (la régie l'ajoute à la main) ;
police **Century Gothic** par défaut. Lot **FS**. Rien de codé : le code attend un go.

## Ce que montrent les fichiers de la régie (7 projets, 13/09 → 01/11/2026)

Lus dans le `data.json` de chaque archive (un `.project` est un zip : `data.json` + images), comparés à nos `.cho`
sur 22 chants (828 diapos).

- **Projet** : `project` (nom = date « 01/11/26 », `parent: "/"`, `created`/`modified` en **millisecondes**),
  `project.shows[]` = `{ id, index }` dans l'ordre du culte ; `shows` (un show par chant) ; `categories`
  (`presentation` = « Chants ») ; `files` (chemins des images, sur `E:\Eglise ppt\Freeshow\…`). La régie ajoute
  elle-même annonces et bienvenue (shows d'images).
- **Show d'un chant** : `category: "presentation"`, `settings.activeLayout`, `template: null`, `meta` vide, une
  layout « Par défaut » qui liste les **groupes dans l'ordre chanté** ; une reprise réutilise le même groupe (même id).
- **Groupe** = une diapo de tête (`group`, `color`, `globalGroup`, `children: [ids]`) suivie de ses diapos filles
  (`group: null`). Une section du chant = un groupe.
- **Début et fin** : diapo de titre (`group: "."`, le titre seul) ; diapo vide de fin (`Rien`, image de fond posée
  par la régie dans la layout).
- **Noms et couleurs** : Couplet 1 `#39CCCC` (`verse`), Couplet 2 `#0074D9`, Couplet 3 `#001f3f`, Couplet 4
  `#7FDBFF`, Refrain 1 `#2ECC40` (`chorus`), Refrain 2 `#01FF70`, Pont `#FFFFFF` (`bridge`), Pont 2 `#d1d1d1`,
  Pré-refrain `#AAAAAA`, Dp `#FF4136` (dernière phrase).
- **Texte** : une zone `top:88px;left:50px;height:904px;width:1820px;`, `align-items:center`, `textFit:
  shrinkToFit`, `autoFontSize: 100` ; chaque ligne `text-align: center;`, style `font-size: 100px;font-weight:
  bold;text-transform: uppercase;font-family: 'Century Gothic';color: #f3f4f7;`. Fond des paroles : celui du thème
  FreeShow (aucune image dans les diapos de paroles).
- **Découpe (français)** : 788 diapos sur 1 078 ont 2 lignes, 217 une, 73 trois. Une ligne affichée fait ≈ 20
  caractères (90 % ≤ 29, max 47). Ponctuation de fin de ligne **retirée** (1 virgule restante sur 2 012 lignes).
  - Une ligne `.cho` de plus de ≈ 30 caractères → **une diapo, coupée en deux lignes** (479 cas ; coupure à la
    virgule 136 fois, sinon entre deux mots, vers le milieu) ;
  - deux lignes `.cho` courtes de suite → **une diapo, une ligne chacune** (115 cas) ;
  - une ligne courte seule → une diapo d'une ligne (141 cas).
- **Découpe (chinois, Interfranco 25/10)** : une **demi-phrase par diapo** (coupée à `，`), caractères (KaiTi 150 px)
  puis pinyin (Corbel 80 px) ; la traduction française en seconde zone est ajoutée à la main (hors export).

## Décisions

| # | Décision |
| --- | --- |
| FS1 | Bouton **« Exporter pour FreeShow »** dans la page d'une setlist, **pour la régie seulement** : même drapeau `regie` que le lien de présentation (`SetlistDetailClient.tsx`, `peutChangerPresentation`) — setlist de fête : TEAM RÉGIE (`estRegieDeFete`) ; back-office ouvert : `lieuxRegie` ∋ catégorie ; coupé : rôle `regie` dans la catégorie. Ni « peut modifier » ni admin seul. Setlist privée : pas de bouton. Hors ligne : le bouton reste (rien n'est écrit). |
| FS2 | **Toute la setlist d'un coup**, un fichier `.project` en JSON (pas de zip : aucune image), nommé `JJMMAA.project` d'après la date de la setlist (comme ceux de la régie) ; nom du projet `JJ/MM/AA`. Fabriqué **dans le navigateur** avec les chants déjà chargés : pas de route API, rien dans `firestore.rules`. |
| FS3 | Un **show par chant** dans l'ordre de la setlist (transitions exclues ; une fusion = un show, sections dans l'ordre de la fusion), `category: "presentation"`, catégorie « Chants » déclarée dans `categories`. Sections et ordre : `playedSections` (reprises comprises), la **version de la présidence** — même texte que « Copier les paroles ». |
| FS4 | Chaque show : diapo de **titre** (`group: "."`) ; un **groupe par section** (diapo de tête + filles), une reprise réutilise le même groupe ; diapo **vide de fin** `Rien`, sans image (la régie pose la sienne). Sections sans paroles (intro, instrumental) : aucune diapo. |
| FS5 | **Noms et couleurs des groupes** comme la régie : Couplet N, Refrain N, Pré-refrain, Pont (N), Post-refrain, Fin, Dp (dernière phrase, `LAST_PHRASE`) ; couleurs de la table ci-dessus, `globalGroup` `verse` / `chorus` / `bridge` pour le premier de chaque sorte. Les noms suivent la section (`type`, `number`) et non son libellé libre (`主歌/Couplet (x2)` → Couplet 1). Sortes sans couleur relevée : gris `#AAAAAA`. |
| FS6 | **Style** : celui relevé ci-dessus, **Century Gothic** 100 px, gras, majuscules, blanc `#f3f4f7`, centré, réduit si ça déborde. Chinois : caractères en **KaiTi 150 px**, pinyin en **Corbel 80 px** comme dans le projet Interfranco de la régie (correction du 01/11 : Century Gothic n'a sans doute pas les voyelles à tons ǎ ǐ ǒ ǔ ǚ). |
| FS7 | **Découpe en français** : paroles sans accords ni espaces parasites (règles de `lyricsText`), ponctuation de fin retirée. Ligne > 30 caractères → une diapo de deux lignes, coupée à la virgule la plus proche du milieu si elle tombe entre 35 % et 65 % de la ligne, sinon à l'espace le plus proche du milieu (la virgule de coupe disparaît). Ligne ≤ 30 → réunie avec la suivante de la même section si celle-ci fait aussi ≤ 30, sinon seule. Jamais deux sections sur une diapo. Les seuils sont des constantes nommées, à régler après l'essai. |
| FS8 | **Découpe en chinois** : une diapo par demi-phrase, coupée à `，`、`；`、`。` (ponctuation retirée), caractères puis pinyin de la même demi-phrase (pinyin de la ligne réparti selon le nombre de caractères chinois de chaque morceau). Pinyin syllabe par syllabe, comme nos `.cho`. Pas de traduction. |
| FS9 | La régie retouche ce qu'elle veut dans FreeShow : l'export donne un point de départ, pas un résultat figé. Aucune annonce, bienvenue ni image n'est générée. |

## Vérification

- Tests unitaires de la fabrication (Playwright, sans navigateur : `test` sur les fonctions pures) : JSON valide,
  ordre des shows, reprises = même id de groupe, titres, Dp, découpe FR (ligne longue coupée, deux courtes réunies,
  virgule de coupe retirée) et ZH (demi-phrases, pinyin réparti).
- Spec Playwright sur les **trois appareils** : le bouton paraît pour un compte régie (fausse session,
  `tests/helpers/fakeSession.ts`, noms fictifs), pas pour un musicien, un admin sans rôle régie ni un visiteur ; le
  clic télécharge un `.project` dont le contenu est relu. 1 chant FR + 1 chant ZH au moins.
- **Essai réel par la régie** : importer l'export d'une setlist récente dans FreeShow et le comparer au fichier fait
  à la main ; régler les seuils de FS7 d'après ses retours.

## Questions ouvertes

1. Pinyin syllabe par syllabe (« xǐ lè ») au lieu de la forme groupée par mot de la régie (« xǐlè ») : accepté par
   défaut (FS8), à confirmer à l'essai.
2. Fichier d'essai fait à la main avant le code (setlist du 01/11) : proposé, pas encore demandé.
