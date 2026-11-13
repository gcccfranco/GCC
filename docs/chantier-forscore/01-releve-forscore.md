# Relevé forScore (sources publiques)

Date du relevé : 26/10/2026. Objet : décrire ce que fait forScore (app iPad/iPhone/Mac de lecture de partitions) pour
rapprocher le « mode louange » du site de cette expérience. Aucune rétro-ingénierie : uniquement les guides et
articles publiés par l'éditeur.

## Sources

- **[G15]** Guide utilisateur v15.0 : https://forscore.co/forScore15-0.pdf (le plus récent trouvé ; pages lues en texte + schéma des zones de toucher, p. 2).
- **[G12]** Guide v12.1 : https://forscore.co/forScore12-1.pdf (utilisé là où G15 est moins détaillé : barre de commandes, Cue, Pro).
- **[KB-perf]** https://forscore.co/kb/performance-mode/ (mode « Perform »).
- **[KB-2up]** https://forscore.co/kb/2-up/ (deux pages ou plus).
- **[KB-geste]** https://forscore.co/gestures/ (appui long, toucher à 2 et 3 doigts).
- **[KB-pitch]** https://forscore.co/forscore-9-audio-utilities (métronome, diapason, accordeur).
- **[Turners]** https://forscore.co/page-turners/ (moyens de tourner les pages).
- **[Accueil]** https://forscore.co/ ; manuels : https://forscore.co/user-guides/ ; support : https://forscore.co/support/.
- Le guide v12.1 date de 2020 pour la mise en page mais est « mis à jour pour la 12.1 » ; le G15 est la référence quand les deux divergent.

Les termes anglais d'origine sont gardés entre guillemets quand ils aident à retrouver la source.

## 1. Gestes et interactions de lecture (priorité)

### Tourner la page
- Deux familles de gestes : **balayage** gauche/droite (comme un livre) ou **toucher d'un côté de l'écran** [G15 p.2]. Souris/trackpad : clic sur les côtés ou molette.
- **Zones de toucher** (schéma officiel, G15 p.2) : les **côtés (bleu)** tournent la page, le **centre (jaune)** montre/cache les commandes, et un **appui long n'importe où** ouvre l'annotation. Le guide 12.1 avait un schéma différent : zones rouges = tourner, zone verte centrale = commandes, **coins bleus = rouvrir le dernier menu consulté** [G12 p.2].
- Les proportions exactes ne sont pas écrites. Sur le schéma, le centre fait grosso modo un tiers de la largeur ; non mesuré, à ne pas prendre comme une cote.
- Page précédente / suivante : côté gauche / côté droit (implicite dans le schéma ; le texte dit « either side »).
- **Passage d'un morceau au suivant, « comme un livre »** : le réglage « Flip between scores » choisit quand on passe de la fin d'un morceau au début du suivant [G15, Réglages › Navigation]. Le réglage « Up next » affiche le titre du morceau suivant dans la barre d'état quand on atteint la dernière page [G15, idem].
- **Verrou audio** : si on peut passer d'un morceau à l'autre en tournant, l'icône cadenas du lecteur audio empêche de basculer par accident tant que la piste joue [G15, Audio › Locking].
- Entrées alternatives : clavier (flèches, espace, retour, page haut/bas), pédales, MIDI, double toucher du Pencil 2, tête (AirPods Pro/Max), visage (Pro) : voir §6-7 [G15, Accessories].

### Demi-tour de page (« half page turns », portrait)
- En portrait, la **moitié haute de la page suivante apparaît pendant qu'on joue encore la moitié basse de la page courante** [KB-2up, recoupé avec résumé du KB « half page »].
- Une **ligne de séparation bleue** marque la coupure ; on la **glisse** par sa poignée (trois traits). La position est **mémorisée page par page** (chaque page se coupe toujours au même endroit). Source : recherche sur la base de connaissances forScore ; l'article lui-même n'a pas pu être relu dans cette session (voir « Non vérifié »).
- Activation : bouton dans la superposition « Display Options » (fond clair = actif) ; par défaut sur iPad c'est aussi le premier raccourci de la barre de titre en portrait [G12 p.3, G15 p.2].
- Cue transmet les demi-tours : seuls les appareils en portrait avec demi-tours activés les appliquent [G12 « Device-Specific Considerations »].

### Défilement et paysage
- Paysage sans mode deux pages : la page remplit la largeur et **s'étend vers le bas** ; balayer ou toucher fait **défiler de haut en bas puis d'une page à l'autre**, ou on **glisse la page au doigt** [G15 p.2].
- Réglage « Landscape scrolling » : défiler d'une demi-page ou d'un tiers de page à la fois (iPad Pro 11 pouces uniquement) [G15 Réglages › Navigation].
- Mode « best fit » : réduit la page pour qu'elle tienne entière à l'écran en paysage, au lieu du défilement [G15 p.2].
- « Page transitions » : choix de l'animation du changement de page [G15 Réglages › Navigation].

### Commandes, barre du haut, plein écran
- **Les commandes sont masquées par défaut** ; un **toucher simple au milieu de la page** les montre/cache [G15 p.2]. L'écran de lecture est donc plein écran la plupart du temps.
- Barre du haut (G15 p.2) : à gauche **Partitions, Signets, Setlists** ; à droite **Recherche, utilitaires audio (métronome, diapason…), menu Outils**. Au milieu : titre et compositeur du morceau, avec à gauche l'icône des « Display Options » (grille) et à droite un menu d'actions du morceau. Sur la 12.1 : deux raccourcis réorganisables (par défaut demi-tour/deux pages sur iPad, Reflow sur iPhone), appui long pour les changer [G12 p.3].
- **Barre de recherche de page (« seek bar »)** : curseur en bas pour prévisualiser et sauter à n'importe quelle page ; le nom du signet flotte au-dessus du point blanc. Normalement cachée avec la barre du haut ; option « Always show seek bar » pour la garder [G15 Basics, Réglages › Appearance].
- Barre d'état système masquable (« Show status bar ») [G15 Réglages › Appearance].
- Anti-veille : option « Auto-lock » pour empêcher la mise en veille de l'iPad [G15 Réglages › General].

### Zoom, double toucher
- **Pincement à deux doigts** pour zoomer. **Double toucher en zoom avant : retour à la taille normale ; en zoom arrière : affiche les options d'affichage** [G15 p.2].
- **Double toucher au centre** (ou icône grille) : superposition « Display Options » [G15 p.2].
- Autres gestes configurables : **appui long** (annotation par défaut), **toucher à deux doigts** et **à trois doigts** (rien par défaut), tous affectables dans Réglages › Gestures [KB-geste].

### Mode « Perform » (performance)
- Désactive la plupart des gestes et fonctions annexes ; ne reste que **page suivante / précédente**. La **zone de page suivante est élargie aux deux tiers droits de l'écran** (la taille de la zone « précédent » n'est pas donnée). Objectif : aucune annotation ou autre action déclenchée par erreur [KB-perf ; G12 « Tools › Perform » ; G15 p.2].
- Entrée : Display Options (double toucher au centre ou icône grille) puis bouton du mode. **Sortie : croix bleue en haut à droite** [KB-perf].

## 2. Setlists et bibliothèque

- **Setlists manuelles** (≠ menu Partitions, généré par les métadonnées) : « + » puis un titre ; on les réordonne, les renomme [G15 Setlists].
- **Tri** d'une setlist : manuel, alphabétique, ou « fresh » (moins récemment jouée) ; contenu aussi **aléatoire**, remélangé en tirant la liste vers le bas jusqu'au contrôle d'actualisation [G12 Setlists].
- **Éditeur de setlist** plein écran : setlist à gauche, bibliothèque à droite ; toucher un morceau à droite l'ajoute ; un point signale ce qui y est déjà ; on **remplace** un élément en le touchant (il pulse) puis en touchant un autre ; boutons : ajouter le morceau courant, **créer un espace réservé nommé**, tout ajouter [G15, G12].
- **Réordonner** : glisser-déposer, ou « Modifier » puis la poignée à trois traits (appui maintenu, la ligne se détache, on la lâche à sa place) ; fonctionne seulement en tri manuel [G15 « Rearranging Setlists »].
- **Supprimer / retirer** : balayage droite→gauche ; « Retirer » (orange) ne touche pas l'original ; « Supprimer » (rouge) pour une setlist [G15].
- **Dossiers de setlists**, **dupliquer** une setlist (variante d'un programme habituel), **partager** (texte, fichier 4SS pour d'autres utilisateurs forScore avec ou sans les PDF, ou PDF unique avec ou sans annotations figées) [G12 Setlists].
- Glisser-déposer : déposer des morceaux dans la liste crée une setlist ; sur le nom d'une setlist ajoute à la fin [G12 Drag & Drop].
- **Bibliothèque** : Partitions classées par Compositeurs, Genres, Étiquettes (« tags »), Labels ; tri par date d'ajout, note, difficulté, référence, tonalité (« key »), durée/mesure, titre ; « All Scores » liste tout ; filtre avancé par règles (inclure/exclure catégories ou setlists) ; **index latéral** (lettre) ; barre de recherche cachée en tirant la liste vers le bas ; **plusieurs bibliothèques** séparées (ex. un groupe chacune) [G15 Scores].
- **Métadonnées par morceau** : titre, note, difficulté, référence, mesure, durée, tonalité, compositeurs, genres, tags, labels ; ils alimentent les listes [G15 Metadata].
- **Signets** : renvoi à une page ou « signet d'élément » (plage de pages comptée comme un morceau, ajoutable à une setlist) [G15 Bookmarks].
- **Recherche globale** : une seule fenêtre cherche titres, signets, setlists, catégories, actions, texte des annotations/notes de page et texte du PDF ; elle montre d'abord les **derniers éléments ouverts** (5 par défaut) [G15 Search].
- **Onglets** : plusieurs morceaux ouverts à la fois (barre d'onglets) [G15 Drag & Drop, Réglages › Appearance].

## 3. Annotations, liens et boutons

- **Entrée** : « Annotate » du menu Outils, ou **appui long** sur la page [G15 Annotation]. Barre d'outils déplaçable ; Annuler/Terminer ; boutons page précédente/suivante pour continuer à annoter sans sortir.
- **Outils** : dessin avec **préréglages** illimités (teinte, saturation, transparence, taille, mode de superposition), **tampons** (stamps) et **formes** (shapes), **règle** (rotation à deux doigts, aimantation aux angles droits/diagonaux), **sélection** (déplacer, dupliquer, copier, couper, ajuster la couleur, effacer, y compris vers un autre fichier), **texte**, **gomme** (supprime aussi liens et boutons), **annuler/rétablir**, **tout effacer** [G15 Annotation].
- **Tampons** : bibliothèque de symboles musicaux, teinte de couleur, **tampons personnels** créés par dessin ou à partir d'un PNG (144 × 144 px conseillé), réorganisables ; une seconde page de tampons est réservée à l'abonnement Pro [G15, G12].
- **Calques** : séparer les annotations (par ex. chef vs soi) ; calques de partition valables sur toutes les pages, masquables, dupliquables, fusionnables, copiables d'un morceau à l'autre [G15 Layers].
- **Stylet / doigt** : avec Apple Pencil, « live annotation » (entrer dans l'annotation dès que le Pencil touche, sortir après un temps d'inactivité), option **« prevent finger drawing »** (seul le Pencil dessine, le doigt sert à zoomer/changer d'outil), double toucher du Pencil 2 : bascule outil/gomme ou outil précédent, largeur variable selon pression/inclinaison (doigt : vitesse) [G15 Apple Pencil].
- **Liens (« Links »)** : un lien = un **cercle bleu** (point d'activation, toujours visible, qui mène à la destination) + un **cercle orange** (cible, clignote deux fois à l'arrivée puis invisible). Typiquement pour les **reprises / renvois** ; peut servir d'aide visuelle sur la même page (en paysage, la page défile au besoin). Création : outil « Link », deux copies de la partition côte à côte, on touche à gauche (bleu) et à droite (orange) ; loupe en appui long pour positionner [G15 Links]. Seul le point bleu se déplace après coup (pour le orange : recréer).
- **Boutons (« Buttons »)** : points tactiles seuls, avec action au choix et couleur par type : ouvrir un morceau/signet, envoyer du MIDI, lancer/arrêter le métronome ou changer le tempo, piloter la piste audio, jouer une note (diapason), afficher une note texte, etc. Appui long pour modifier [G15 Buttons].
- **Réorganiser les pages (« Rearrange »)** : réordonner/dupliquer/supprimer des pages pour que la page suivante soit toujours la bonne (reprises « à plat », utile avec pédale ou autoturn) [G15 Rearrange].
- **Notes** par page : outil « Notes » ; indexées par la recherche [G15 Tools, Search].

## 4. Outils de pratique

- **Métronome** : modes **audible**, **visible** (bordure noire qui pulse autour de la partition) ou les deux ; BPM et mesure **mémorisés par morceau** ; réglage par molette, +/−, ou **double toucher au centre pour taper le tempo** ; choix du canal G/D/les deux ; « Count In » ; **autoturn** (nombre de temps ou de mesures par page, la page se tourne seule ; en paysage elle défile à la moitié du nombre de temps) [G15 Metronome].
- **Diapason (« Pitch Pipe »)** : trois octaves (do-do ou fa-fa), sons piano/clarinette ou sinus à fréquence réglable ; cadran circulaire, haut-parleur pour jouer la note [KB-pitch ; ajouté en 3.1]. L'**Accordeur** (« Tuner ») est dans le même panneau ; **piano virtuel** dans Outils [G15].
- **Enregistreur** : Outils › Record ; micro avec vumètre rouge ; l'enregistrement est **lié au morceau courant** et réécoutable/partageable [G15 Recording].
- **Piste audio liée** : lier une piste (bibliothèque Musique ou fichier) à un morceau ; le lecteur se met à jour à chaque tourne de page ; **vitesse 25–200 %** et **hauteur ±1 octave** réglables indépendamment (mémorisées par morceau) ; **boucle** entre deux poignées ; **Replay** : on enregistre ses tournes de page pendant la lecture, elles se rejouent ensuite au bon moment [G15 Audio].
- **Minuteur** : aucun minuteur ou chronomètre dédié trouvé dans les guides. Le « Dashboard » mesure seulement le temps de lecture par morceau (analyse, objectifs, rapports) [G15 Dashboard].

## 5. Réglages d'affichage

- **Recadrage (« Crop »)** : par page, sans modifier le PDF ; déplacement au doigt, pincement ; **cadrage automatique** de toute la partition, ou « comme celle-ci » pour toutes ; correction d'inclinaison (« de-skew ») ; guide montrant le rendu portrait et paysage ; retour possible (« Uncrop ») [G15 Crop]. Le recadrage l'emporte sur le réglage de marge global du morceau.
- **Modes de cadrage** : « standard » (ratio 3:4 identique sur tous les appareils), « best fit » (meilleure vue, peut rogner des annotations), « zoomed » (page la plus grande possible, peut rogner les bords gauche/droit) [G15 p.2].
- **Sépia** : teinte chaude de toute l'interface, dans Display Options ou Réglages [G15]. **Mode sombre** de l'interface (clair/sombre/système) + **« Page dimming »** qui assombrit les pages en mode sombre pour réduire le contraste [G15 Réglages › Appearance]. Pas de véritable inversion noir/blanc de la partition relevée dans ces textes.
- **Deux pages côte à côte (« two-up »)** : en paysage (ou fenêtre trop basse) ; bouton dans Display Options (fond clair = actif) ; nombre de pages calculé d'après la page portrait courante, appui long pour fixer 2 ou 3 pages, jusqu'à 5 à partir de la 14.1 ; réglage « Two-up page advance » : avancer d'une ou de deux pages ; option pour repasser en une page pendant l'annotation [KB-2up ; G15 Réglages].
- **Reflow** (téléprompteur horizontal) : détecte les zones de musique et les met bout à bout ; mode page (un toucher décale d'une moitié d'écran) ou défilement continu (toucher à gauche ralentit, à droite accélère, au centre pause) ; par défaut sur iPhone [G15 Reflow].
- **Zoom** : voir §1. **Fenêtre externe** (écran/projecteur) pour montrer une page à un public [G15 External Windows].

## 6. Partage et synchronisation entre appareils

- **Cue** (« remote control ») : liaison sans fil (Wi-Fi + Bluetooth, **sans Internet requis**). Rôles : **Leader** (tourne les pages et change de morceau) et **Follower** (suit les tournes de page, les changements de morceau, ou les deux). Un « changement de programme » = ouvrir un autre morceau ou passer de la fin d'un morceau au début du suivant [G12 Cue ; G15 Cue].
- Précisions : un leader en **paysage** n'envoie des haut/bas que reçus par des appareils en paysage ; les demi-tours ne sont appliqués que par les appareils en portrait avec demi-tours activés [G12 Cue].
- **Dual Page** avec l'appli Cue distincte : une page sur l'appareil principal, la suivante sur le second ; toucher ou balayer sur l'un ou l'autre avance de deux pages ; liens et boutons actifs sur les deux [G12 Cue].
- Autres : partage de setlist (4SS), de partition annotée (4SC), sauvegardes (4SB) ; synchronisation iCloud (accès anticipé, abonnement Pro à la 12.1) [G12 Pro, Backups].

## 7. Pédalier

L'équipe n'utilise pas de pédalier Bluetooth : on note seulement que forScore en gère (AirTurn, iRig BlueBoard, clavier, MIDI) [G15 Accessories ; Turners], sans en tenir compte pour le mode louange du site.

## Non vérifié / limites

- Proportions exactes des zones de toucher (schéma seulement) ; taille de la zone « précédent » en mode Perform.
- L'article « half page turns » n'a pas été relu intégralement (résumé de recherche) ; comportement de la ligne bleue à confirmer sur l'app ou la vidéo.
- Comportement détaillé de l'avance en mode « two-up » (la page KB ne le dit pas ; seul le réglage « une ou deux pages » est documenté).
- Aucun minuteur trouvé. Aucune vidéo ni article de revue consulté.
- Les guides sont en anglais et décrivent des versions différentes (12.1, 15.0) ; un point peut avoir changé depuis. Le guide v15 est en ligne avec l'app actuelle mais je n'ai pas pu confirmer qu'il s'agit de la toute dernière version (le KB cite la 15.1.2).

## Les 10 traits qui font l'expérience forScore (par importance, pour un musicien sur pupitre en culte)

1. **Écran de lecture nu** : commandes cachées par défaut, un toucher au centre les rappelle ; la musique occupe tout l'écran.
2. **Tourner la page d'un toucher sur les côtés** (ou balayage), jamais d'action ambiguë ; centre réservé aux commandes.
3. **Mode Perform** : tout est désactivé sauf page suivante/précédente, grande zone « suivant » (deux tiers droits), sortie par une croix.
4. **Demi-tour de page en portrait** avec ligne de coupure réglable et mémorisée par page : on ne perd jamais la fin de la page courante.
5. **Enchaînement des morceaux d'une setlist « comme un livre »** (Flip between scores) avec le titre du suivant annoncé (Up next) et verrou anti-saut.
6. **Setlists simples** : ajout par un toucher, glisser pour réordonner, dupliquer pour une variante, espaces réservés.
7. **Liens et boutons sur la page** (reprises, coda) : un toucher saute et la cible clignote ; réorganiser les pages en alternative.
8. **Deux pages côte à côte en paysage** + recadrage par page : maximiser la musique visible.
9. **Annotation immédiate** (appui long ou Pencil), avec calques et tampons musicaux : chacun marque sa partition.
10. **Outils musicien intégrés** : métronome (par morceau, visible), diapason, piste audio liée, enregistreur ; et **Cue** pour synchroniser les pages d'un leader sur d'autres appareils.
