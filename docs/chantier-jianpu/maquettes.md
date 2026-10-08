# Maquettes du chantier 简谱 (planche v20, 08/10/2026)

Aperçus exportés de la planche v20 (artefact privé de Timothée
<https://claude.ai/artifact/1d4ZW7Y9NVHcsLB9YrrbrA>, version 26 : rangée **R19** pour le 简谱, rangée **R19B** pour
le mode louange). Ils sont rendus par `scripts/planche/jianpu_integration.py` et `scripts/planche/louange_sections.py`
(local, hors de git) sur les vrais scans de `public/jianpu/` et le vrai calque `chords.json`. Les personnes sont
fictives (Ruth K., Léa M., Noé T.). La spec qui s'en sert : [`../spec-jianpu-integration.md`](../spec-jianpu-integration.md).

**Seule la piste A « Fondu dans la page » est retenue** (décision D1 du 08/10/2026). Les écrans des pistes B et C
sont gardés **pour mémoire** : ils ne décrivent rien à coder. Dans la rangée R19B, la **variante « rail vertical »**
n'est pas retenue non plus (D11).

Les petites pastilles grises et les cartouches des images sont des notes de planche, pas de l'interface.

## Piste A « Fondu dans la page » (retenue)

- [`v20-jp-a-notes.png`](maquettes/v20-jp-a-notes.png) — Carte de notes de la piste A : de l'encre au lieu du papier,
  gommes et écritures aux coordonnées de `chords.json`, en-tête gravé coupé par une fenêtre, corrections K1 à K4,
  limite du filtre. **Attention** : la liste « À trancher » de la carte date d'avant les réponses ; sa ligne
  « Q4 · « Jouer sur : Paroles » du responsable l'emporte » est **contredite par D4** (le choix de la personne prime).
- [`v20-jp-a-chant-telephone.png`](maquettes/v20-jp-a-chant-telephone.png) — Page chant 一生爱你 sur téléphone,
  ouverte **sur le scan sans action** (D2, D3) : en-tête du site (titre, pinyin, auteurs, ♩ = 65, pastille E), pastilles
  I · C · R, segment « 简谱 · Paroles » sous les pastilles (D5), fenêtre qui commence à « 1= E 4/4 » (D7), pied gardé,
  fin de feuille au-dessus de la barre d'onglets (K2). L'icône « 谱 » a quitté la barre d'outils.
- [`v20-jp-a-chant-sombre-telephone.png`](maquettes/v20-jp-a-chant-sombre-telephone.png) — Même page en thème
  sombre : encre `#e4e4e7` sur noir, mouton filigrane éteint (D10) ; vignette « avant » (bloc noir).
- [`v20-jp-a-chant-tablette.png`](maquettes/v20-jp-a-chant-tablette.png) — Page chant transposée en D sur tablette :
  « 1=D » et les 34 accords réécrits **à l'encre**, sans pavé visible (D9) ; pastille D, « orig. E ».
- [`v20-jp-a-chant-ipad-paysage.png`](maquettes/v20-jp-a-chant-ipad-paysage.png) — Page chant 为我而来 sur iPad
  paysage (deux volets) : jonction des deux pages du scan, repère « 2 / 2 », même encre.
- [`v20-jp-a-chant-ordinateur.png`](maquettes/v20-jp-a-chant-ordinateur.png) — Page chant sur ordinateur : plus de
  rectangle blanc sur le halo, le scan prend la largeur de la fiche.
- [`v20-jp-a-setlist-telephone.png`](maquettes/v20-jp-a-setlist-telephone.png) — Setlist, vue Partitions, téléphone
  (page défilée) : fin de 为我而来, 一生爱你 en D sur scan avec son bandeau et sa note, puis Abba Père au **même bord
  gauche** et au même écart (D2 « partout »).
- [`v20-jp-a-setlist-ipad-paysage.png`](maquettes/v20-jp-a-setlist-ipad-paysage.png) — Setlist sur iPad paysage,
  menu Affichage ouvert : « Partition 简谱 » devient **un interrupteur allumé** (D3, D6). **Attention** : l'aide
  dessinée sous l'interrupteur (« Un chant marqué « Paroles » par le responsable reste en paroles ») ne vaut, avec
  D4, que pour une personne qui n'a jamais réglé l'interrupteur : à réécrire (question ouverte O1 de la spec).
- [`v20-jp-a-setlist-ordinateur.png`](maquettes/v20-jp-a-setlist-ordinateur.png) — Setlist sur ordinateur :
  l'exception « Paroles » choisie par le responsable pour 为我而来, marquée dans le Sommaire, la fiche en paroles et
  la ligne grise « Le responsable a choisi les paroles pour ce chant ». Avec D4, ce rendu ne vaut que pour une
  personne qui n'a jamais réglé l'interrupteur (O1) ; la marque d'exception dans le Sommaire est la question O6.
- [`v20-jp-a-louange-telephone.png`](maquettes/v20-jp-a-louange-telephone.png) — Mode louange, téléphone, Ordre
  joué : en-tête du chant sur une ligne (K3), pastilles (D12, D14), scan sans en-tête gravé, « Suivant ».
  Le bandeau y porte le numéro ① sur R×2, mais la note elle-même n'est écrite nulle part : question O8.
- [`v20-jp-a-louange-tablette.png`](maquettes/v20-jp-a-louange-tablette.png) — Mode louange, tablette : le scan tient
  **entre les deux barres** (K1 corrigé).
- [`v20-jp-a-louange-sombre-ipad-paysage.png`](maquettes/v20-jp-a-louange-sombre-ipad-paysage.png) — Mode louange,
  iPad paysage, thème de scène : encre claire sur noir (D10), structure **en colonne dans la marge gauche** (greffe de
  la piste A), « Suivant » en bas de la colonne.
- [`v20-jp-a-louange-ordinateur.png`](maquettes/v20-jp-a-louange-ordinateur.png) — Même chose en clair sur
  ordinateur ; montre honnêtement la taille obtenue (scan d'environ 545 px de large, « 2 colonnes » sans effet).
- [`v20-jp-a-adapter-telephone.png`](maquettes/v20-jp-a-adapter-telephone.png) — Adapter, téléphone : retoucher un
  accord sur le scan ; la retouche « A/C# » s'écrit à l'encre et sa gomme efface le gravé (D9).
- [`v20-jp-a-editeur-telephone.png`](maquettes/v20-jp-a-editeur-telephone.png) — Éditeur de setlist, téléphone :
  « Jouer sur : **Partition 简谱** · Paroles », 简谱 présélectionné sans rien cocher (D2, D3). **Attention** : l'aide
  dessinée (« « Paroles » l'impose à tous pour ce chant ») est **contredite par D4** : à réécrire (O1).
- [`v20-jp-a-pdf-a4.png`](maquettes/v20-jp-a-pdf-a4.png) — PDF de setlist, page 简谱 (D2) : en-tête maison, scan coupé
  sous l'en-tête gravé, encre noire, calque décalé du recadrage (la valeur « −173 px » de la planche se certifie à
  l'audit, lot 3).
- [`v20-jp-a-limite-tablette.png`](maquettes/v20-jp-a-limite-tablette.png) — La limite du filtre sur 一生跟随 : trame et
  filigrane clair effacés, tampon gris moyen restant (D8, environ 6 scans). La ligne « 1=F 4/4 ♩=80 » et les auteurs
  gravés y doublent l'en-tête du site : c'est la règle D7 (on garde la ligne « 1=X »).

## Mode louange « Sections uniques » et structure (rangée R19B, retenue sauf la variante)

- [`v20-ml-notes.png`](maquettes/v20-ml-notes.png) — Carte de notes : « Affichage » dans le mode louange, bandeau et
  rappel, scan inchangé en Sections uniques, scan effacé en Structure seule.
- [`v20-ml-reglages-telephone.png`](maquettes/v20-ml-reglages-telephone.png) — Réglages, téléphone : « Vue » renommée
  **« Rôle »**, rangée **« Affichage »** dessous (Ordre joué · Sections uniques · Structure seule), « Partition 简谱 »
  en interrupteur (D3, D15).
- [`v20-ml-reglages-ipad-paysage.png`](maquettes/v20-ml-reglages-ipad-paysage.png) — Réglages, iPad paysage : le rôle
  Batteur pose Structure seule ; toucher Affichage ensuite désélectionne le rôle ; même préférence que la setlist (D15).
- [`v20-ml-ordre-telephone.png`](maquettes/v20-ml-ordre-telephone.png) — Ordre joué, téléphone, Abba Père : bandeau de
  pastilles **sans détails** en tête du chant (D12), puis les sections dans l'ordre joué.
- [`v20-ml-uniques-telephone.png`](maquettes/v20-ml-uniques-telephone.png) — Sections uniques, téléphone, page 1 :
  bandeau **avec détails** (① transition, ② note) puis chaque section une fois (D11).
- [`v20-ml-uniques-p2-telephone.png`](maquettes/v20-ml-uniques-p2-telephone.png) — Sections uniques, téléphone, page
  2 : **rappel de 24 px** collé en haut de la page, R et Pm cerclés (sections de la page, à leur 1re occurrence ; les
  reprises ne le sont pas) (D11).
- [`v20-ml-uniques-tablette.png`](maquettes/v20-ml-uniques-tablette.png) — Sections uniques, tablette, page 1 :
  pastilles de 44 px avec détails.
- [`v20-ml-uniques-p2-sombre-tablette.png`](maquettes/v20-ml-uniques-p2-sombre-tablette.png) — Sections uniques,
  tablette, thème de scène, page 2 : rappel avec C2 et P cerclés en `#f2f2f7`.
- [`v20-ml-uniques-ipad-paysage.png`](maquettes/v20-ml-uniques-ipad-paysage.png) — Sections uniques, iPad paysage,
  2 colonnes : en-tête et bandeau pleine largeur au-dessus des colonnes. La pastille « Fin de la setlist » dessinée
  sous le dernier chant n'est tranchée par aucune décision : question O10.
- [`v20-ml-uniques-sombre-ordinateur.png`](maquettes/v20-ml-uniques-sombre-ordinateur.png) — Même chose sur
  ordinateur, thème de scène (même remarque sur « Fin de la setlist »).
- [`v20-ml-uniques-zh-telephone.png`](maquettes/v20-ml-uniques-zh-telephone.png) — Sections uniques, chant sur scan,
  téléphone : scan inchangé, bandeau avec détails (D13).
- [`v20-ml-uniques-zh-ipad-paysage.png`](maquettes/v20-ml-uniques-zh-ipad-paysage.png) — Sections uniques, chant sur
  scan, iPad paysage : bandeau en colonne dans la marge gauche, scan sur toute la hauteur (greffe de la piste A).
- [`v20-ml-structure-zh-telephone.png`](maquettes/v20-ml-structure-zh-telephone.png) — Structure seule, chant sur scan
  (batteur) : **pas de scan**, en-tête du site puis la structure en grand (D13 ; le batteur perd le scan).
- [`v20-ml-variante-rail-ipad-paysage.png`](maquettes/v20-ml-variante-rail-ipad-paysage.png) — *Pour mémoire* :
  variante « rail vertical » sur iPad paysage, **non retenue** (D11).
- [`v20-ml-variante-rail-ordinateur.png`](maquettes/v20-ml-variante-rail-ordinateur.png) — *Pour mémoire* : variante
  « rail vertical » sur ordinateur, **non retenue** (D11).

## Piste B « La partition comme objet » (non retenue, pour mémoire)

- [`v20-jp-b-notes.png`](maquettes/v20-jp-b-notes.png) — Carte de notes de la piste B.
- [`v20-jp-b-chant-telephone.png`](maquettes/v20-jp-b-chant-telephone.png) — Page chant, téléphone : feuille posée,
  en-tête gravé gardé, segment dans la barre d'outils qui pousse « ⋯ » à la ligne.
- [`v20-jp-b-chant-ordinateur.png`](maquettes/v20-jp-b-chant-ordinateur.png) — Page chant, ordinateur : feuille de
  640 px avec ombre et bouton « Agrandir ».
- [`v20-jp-b-chant-sombre-tablette.png`](maquettes/v20-jp-b-chant-sombre-tablette.png) — Page chant, tablette,
  sombre : papier `#1c1c1c`, deux feuilles empilées.
- [`v20-jp-b-visionneuse-telephone.png`](maquettes/v20-jp-b-visionneuse-telephone.png) — Visionneuse plein écran,
  zoom 2×.
- [`v20-jp-b-louange-telephone.png`](maquettes/v20-jp-b-louange-telephone.png) — Mode louange, téléphone : bureau gris,
  feuille ajustée.
- [`v20-jp-b-louange-sombre-ipad-paysage.png`](maquettes/v20-jp-b-louange-sombre-ipad-paysage.png) — Mode louange,
  iPad paysage, sombre : feuille à gauche, structure dans la marge droite.

## Piste C « Système par système » (non retenue, pour mémoire ; suite possible au-dessus de A)

- [`v20-jp-c-notes.png`](maquettes/v20-jp-c-notes.png) — Carte de notes de la piste C (étape 2 au-dessus de A).
- [`v20-jp-c-chant-telephone.png`](maquettes/v20-jp-c-chant-telephone.png) — Page chant, téléphone : le scan en trois
  tranches encadrées (Intro, Couplet, Refrain), pied coupé.
- [`v20-jp-c-chant-ordinateur.png`](maquettes/v20-jp-c-chant-ordinateur.png) — Page chant, ordinateur : tranches
  encadrées, A− / A+ actifs.
- [`v20-jp-c-setlist-ipad-paysage.png`](maquettes/v20-jp-c-setlist-ipad-paysage.png) — Setlist, iPad paysage : l'ordre
  joué rejoue les tranches, calque en D dans chacune.
- [`v20-jp-c-setlist-telephone.png`](maquettes/v20-jp-c-setlist-telephone.png) — Setlist, téléphone : sections
  uniques, chaque tranche une fois.
- [`v20-jp-c-louange-telephone.png`](maquettes/v20-jp-c-louange-telephone.png) — Mode louange, téléphone : tranches
  paginées.
- [`v20-jp-c-louange-sombre-ipad-paysage.png`](maquettes/v20-jp-c-louange-sombre-ipad-paysage.png) — Mode louange,
  iPad paysage, sombre : Sections uniques en deux colonnes.
- [`v20-jp-c-repli-tablette.png`](maquettes/v20-jp-c-repli-tablette.png) — Le repli « page entière » pour une page à
  renvois (大手牵着小手).
- [`v20-jp-c-donnees-ordinateur.png`](maquettes/v20-jp-c-donnees-ordinateur.png) — La donnée nouvelle qu'il faudrait
  certifier (coupes et sections de 190 pages).
