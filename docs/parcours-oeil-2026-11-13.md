# Parcours à l'œil du site, 13/11/2026

Parcours fait sans toucher au code, sur l'accord de Timothée du 13/11/2026 (« oui fait ça »), recentré par le pilote
le même jour sur **les setlists et les chants**, et sur ce qui est **peu pratique ou incohérent**, pas seulement ce qui
se voit mal. Session simulée (`tests/helpers/fakeSession.ts`), noms fictifs, `next dev` local, captures Playwright à
`deviceScaleFactor: 1`. Premier tri par l'agent `regard`, chaque constat retenu ouvert et jugé ici.

**Version 1 (setlists et chants, ordinateur et téléphone).** La version 2 ajoutera tablettes, chinois, sombre, le reste
du site et le compte des gestes des quatre tâches réelles.

Déjà relevé par Timothée, donc absent d'ici : 简谱 sur une colonne en écran large, zigzag et habillages dépareillés de la
vue partitions, ligne « 4 → 4maj7 · F → Fmaj7 », pas d'idées d'harmonie sur la 简谱, menu Setlist du mode louange,
vignette vide d'un chant sans scan, son du bouton Écouter.

Dispositions : **tel** (412 px), **tabP** (tablette portrait 810 px), **tabL** (tablette paysage 1 080 px), **ordi**
(1 280 px), **1440**.

## Les cinq choses à changer en premier

1. **Les réglages du mode louange débordent de l'écran et couvrent la partition** (Options, Je joue) : pendant le culte,
   on règle à tâtons un panneau dont le bas est coupé, sur la moitié de la musique.
2. **Un même réglage est rangé à trois endroits, chaque fois autrement** : disposition, couleur des accords, ordre des
   sections, Lettres / Chiffres sont dans le menu ⋯ de la page chant, dans « Affichage » de la setlist, et coupés en
   deux menus (Je joue et Options) dans le mode louange.
3. **La tonalité n'a pas la même place ni la même forme sur les trois écrans** : barre « Ton A − + » plus pastille sur
   la page chant, petite lettre seule sur la setlist, lettre en sous-titre (« Samuel Olivier · A ») au mode louange.
4. **Le choriste voit des cadres vides** pour l'intro et l'interlude au mode louange : des boîtes titrées sans rien
   dedans, qui prennent la place des paroles.
5. **La barre du chant au téléphone tient sur deux lignes et coupe la tonalité** (« T… A », « ㅣC ») : la commande la plus
   utilisée est la moins lisible.

## Constats

Classés par gêne, celle qui touche le jeu pendant le culte d'abord. « Spec » dit si c'est voulu.

### Gêne forte (pendant le culte)

**1. Mode louange, menu Options : panneau trop long, coupé en bas, posé sur la partition.** ordi, 1440, tabL, tabP,
tel. Le panneau couvre la moitié droite de la musique ; « Couleur des accords », puis Thème, Métronome et Couleur des
icônes sont sous le bord sans signe qu'il défile ; « Partition 简谱 » et « Annotations » se touchent, « Demi-page » se
coupe en deux lignes ; un paragraphe d'aide de cinq lignes est au milieu des boutons.
Spec : le contenu est voulu (`docs/spec-entree-musiciens.md` l. 101 en dresse la liste), la hauteur et le recouvrement
non. ![](parcours-oeil-2026-11-13/louange-options-ordi.webp)

**2. Mode louange, menu Je joue : la « Disposition » est coupée.** tabL, ordi, tel. Les vignettes de disposition
sortent par le bas ; le menu mêle « ce que je joue » (rôle), l'ordre des sections et la disposition de la page.
Spec : l'ordre des sections ici est voulu (`docs/spec-jianpu-integration.md` L2, « même réglage que le menu Affichage
de la setlist ») ; la coupe non. ![](parcours-oeil-2026-11-13/louange-je-joue-tabL.webp)

**3. Mode louange, choriste : intro et interlude en cadres vides.** Toutes dispositions. Le rôle Choriste (paroles
seules) garde les sections sans paroles comme des boîtes titrées vides, de la hauteur d'une ligne.
Spec : non prévu (`docs/spec-mode-louange-forscore-2.md` replie une rangée d'accords vide, rien sur une section vide).
![](parcours-oeil-2026-11-13/louange-choriste-tabP.webp)

**4. Mode louange : changer de chant sans savoir où on va.** Toutes dispositions. Le bas de l'écran n'a que des points
(treize pour cinq chants à l'ordinateur), groupés par chant mais sans numéro ni titre ; aucune capture ne montre le titre du
chant suivant avant d'y arriver. Spec : les points sont voulus (curseur de page) ; l'absence de repère du
chant suivant n'est écrite nulle part.

### Gêne moyenne (préparer, retrouver, régler)

**5. Page chant au téléphone : barre d'outils sur deux lignes, tonalité tronquée.** tel. « T… A » en français, « ㅣC »
en chinois ; Vidéo, Crayon et ⋯ passent à la ligne, la page commence sous 130 px de commandes.
Spec : aucune ne prévoit une tonalité tronquée.
![](parcours-oeil-2026-11-13/chant-fr-tel.webp) ![](parcours-oeil-2026-11-13/chant-zh-tel.webp)

**6. La tonalité, trois écrans, trois formes.** Page chant : « Ton A − + » dans la barre **et** une pastille « A » à
droite du titre (en chinois s'y ajoute « 1=C » sous le titre : trois fois la même information). Setlist : une lettre
« A » bleue sans cadre, seule, en haut à droite. Mode louange : « · A » à la fin du sous-titre, en petit. On ne voit pas
où transposer dans la setlist ni au mode louange. Comparer `chant-fr-ordi`, `setlist-ordi`, `louange-options-ordi`.
Spec : chaque place est décrite séparément ; aucune spec ne les met en regard.
![](parcours-oeil-2026-11-13/chant-fr-ordi.webp) ![](parcours-oeil-2026-11-13/setlist-ordi.webp)

**7. Les réglages d'affichage, trois menus pour la même chose.** Page chant : menu ⋯ (Disposition, Couleur des accords,
Notation, Personnaliser, Signalement). Setlist : bouton « Affichage » (Ordre, Pinyin, Disposition, Couleur, Notation).
Mode louange : partagés entre Je joue (Ordre, Disposition) et Options (Accords, Paroles, Pinyin, Couleur…). Même
contenu, trois noms (⋯, Affichage, Options d'affichage), trois découpages, et trois mentions de portée différentes
(« Retenue sur cet appareil », « Retenue pour ce compte sur cet appareil », « retenu sur cet appareil ») qu'un
musicien ne peut pas démêler. Spec : chaque menu est voulu par son lot ; l'ensemble n'est jamais comparé.
![](parcours-oeil-2026-11-13/chant-menu-plus-tel.webp) ![](parcours-oeil-2026-11-13/setlist-affichage-tel.webp)

**8. Même commande, autre nom ou autre forme.** Pinyin : bouton « 拼 » sur la page chant, case « ✓ Pinyin » dans
Affichage de la setlist, bouton rond « Pinyin » au mode louange. Accords : icône ♪ seule sur la page chant, mot
« Accords » dans la barre de la setlist au téléphone, bouton « Accords » au mode louange. Aide « touche un accord » :
bulle flottante avec « OK » sur la page chant (posée sur les paroles), bandeau gris avec « × » dans la setlist.
Spec : non comparé. ![](parcours-oeil-2026-11-13/setlist-partitions-tel.webp)

**9. Titre du chant : trois habillages.** Setlist : « 1 Abba Père » ; mode louange barre cachée : « ABBA PÈRE » en
capitales avec une pastille ronde « 1 » ; barre montrée : « Abba Père » centré, en petit. tel, toutes dispositions.
Spec : non voulu explicitement. ![](parcours-oeil-2026-11-13/louange-titre-tel.webp)

**10. Création d'une setlist à l'ordinateur : la barre « Publier » cache des boutons.** ordi. Sous les chants, deux
boutons (« Ajouter des chants », « Transition ») sont à moitié masqués par la barre collée du bas. Le champ date
n'apparaît qu'une fois la catégorie choisie, alors que l'écran précédent promettait « Choisir le service et la date
soi-même » (`src/components/setlists/editeur/EnTeteEditeur.tsx` l. 240). Spec : non voulu.
![](parcours-oeil-2026-11-13/creation-setlist-ordi.webp)

**11. « Mon prochain service » écrit deux fois** dans l'onglet Setlists en grand écran : pastille grise en tête de la
colonne de gauche, titre de la colonne de droite ; la colonne de gauche laisse un grand vide dessous. tabL, ordi, 1440.
Spec : le volet de droite est voulu (`docs/spec-entree-musiciens.md`, PU-2), le doublon non.

**12. Choriste : la setlist montre les accords, le mode louange non.** Vue partitions d'une choriste : accords affichés,
« Accords » allumé ; au mode louange, le même rôle voit les paroles seules. Spec : le rôle ne règle que le mode louange
(`docs/spec-jianpu-integration.md`) ; l'écart se comprend mal.

### Gêne faible

**13. Création d'une setlist : changer une tonalité est simple**, à noter comme modèle : toucher le chant, toucher la
tonalité, OK (trois gestes au téléphone, deux à l'ordinateur). ![](parcours-oeil-2026-11-13/creation-tonalite-tel.webp)
Seul défaut : la tonalité d'origine est marquée « orig. » sous la touche, pas la tonalité recommandée quand elle existe
(à vérifier sur un chant qui en a une).

## Pas encore ouvert (version 2)

Tablettes en détail, interface chinoise (les premières captures 中文 étaient prises en français : clé de langue fausse
dans le script, corrigée), thème sombre des pages de lecture, historique d'une setlist (le bouton n'a pas été trouvé
par le script, à reprendre), recherche au téléphone, planning, harmonie, Moi, et le compte des gestes : musicien qui
joue dimanche, choriste qui cherche un chant chinois, passage au chant suivant.
