# Comparaison forScore / mode louange du site

Date : 26/10/2026. Entrées : `01-releve-forscore.md` (forScore, avec sources) et
`02-mode-louange-actuel.md` (inventaire du code, vérifié le 26/10/2026 sur
`src/components/performance/PerformanceMode.tsx`). Planche : `planche.html`. Spec : `../spec-mode-louange-forscore.md`.

Pédalier Bluetooth, MIDI, AirTurn, gestes de tête et de visage : **hors périmètre** (l'équipe n'en utilise pas).
Les raccourcis clavier du mode (flèches, Espace) restent, ils servent à l'ordinateur.

Légende état : **existe** (déjà équivalent) · **partiel** · **manque** · **n/a** (ne s'adapte pas au web, ou sans objet pour un culte).
Taille : S (moins d'une journée), M (un à deux jours), L (plus, à découper).
Gain : ★★★ = sert chaque dimanche à chaque musicien sur pupitre ; ★★ = souvent ; ★ = parfois.

## 1. Écart trait par trait

| Trait forScore (source du relevé) | État | Ce que fait le mode louange aujourd'hui | Adaptation proposée | Taille | Gain |
| --- | --- | --- | --- | --- | --- |
| Écran de lecture nu, commandes cachées [G15 p.2] | partiel | Barre haute et basse qui s'effacent après 3 s (`:868`, `:1467`) ; toucher au centre les rappelle | Barre qui **reste ouverte** jusqu'à un second toucher au centre (pas de minuterie), et plus aucune ligne d'état permanente (piste A) | S | ★★★ |
| Tourner la page d'un toucher sur les côtés [G15 p.2] | existe | Tiers gauche / droit (`:1020-1027`), seuils 40 px et 500 ms | Garder ; zones à régler (question 2 de la planche) | S | ★★★ |
| Balayage gauche / droite [G15 p.2] | manque | Pas de balayage (inventaire §2, vérifié) | Balayage horizontal > 40 px, mêmes règles que le toucher ; ne pas gêner le zoom à deux doigts ni l'annotation | S | ★★ |
| Zone centrale = commandes [G15 p.2] | existe | Centre = barre (`:1028-1034`) | Garder. **Corriger** : les barres, bien qu'invisibles (`opacity 0`), restent `pointer-events-auto` (`:1476`, `:1538`) et avalent les touchers sur leurs bandes ; hors barre, bande haute et basse ne tournent pas la page | S | ★★★ |
| Mode « Perform » : tout est verrouillé sauf précédent / suivant, sortie par une croix [KB-perf] | partiel | Pas de verrou ; la barre est faite de boutons toujours touchables quand elle est visible | **Lecture verrouillée** : en lecture seuls les côtés agissent ; le centre ouvre la barre, seule à porter Quitter, Réglages, Annoter | S | ★★★ |
| Demi-tour de page (portrait), ligne de coupure glissable et mémorisée par page [KB-2up] | manque | Pages entières calculées par mesure (`:689-807`) ; la fin d'une page n'est visible qu'en la quittant. Le rappel de structure en tête des pages 2+ (`RAPPEL_RESERVE`) aide un peu | Étape 1 : **aperçu des 3 premières lignes** de la page suivante au pied de la page, en portrait (M). Étape 2, si l'équipe le demande : vrai demi-tour, ligne glissable mémorisée par chant (L) | M puis L | ★★★ |
| Défilement continu en paysage, « best fit » [G15 p.2] | n/a | Chaque page tient à l'écran (pas de défilement) ; 2 colonnes en grand écran | Rien : la pagination mesurée sert déjà le même but. Surveiller seulement les chants longs en paysage | n/a | - |
| Deux pages côte à côte (paysage) [KB-2up] | partiel | « 2 colonnes » (`columns.ts`) : colonnes d'un même flux, pas deux pages | Garder, et faire avancer par colonnes entières sur tablette paysage (réglage « avancer d'une / deux colonnes ») | S | ★★ |
| Barre de recherche de page, points de chant [G15 Basics] | partiel | Points de progression du chant en cours, 8 pages au plus (`:1503-1514`) ; Sommaire en tiroir | **Curseur** sur toute la setlist, avec un repère au début de chaque chant, dans la barre basse | M | ★★ |
| Enchaînement « comme un livre » (Flip between scores) [G15 Réglages › Navigation] | existe | Les pages de tous les chants sont une seule suite ; passer la dernière page du chant ouvre le suivant | Rien. Ne pas ajouter de verrou : il n'y a pas de piste audio à protéger | - | - |
| « Up next » : titre du morceau suivant à la dernière page [G15] | partiel | Pastille « → Suivant : titre + tonalité » (`:1392-1404`) mais **non touchable** (`pointer-events-none`), grise, petite, absente quand le scan 简谱 est en colonne (`!colonneScan`) | Bandeau clair « Ensuite : titre · tonalité », visible sur toutes les dispositions, le toucher à droite passe au chant. Rien à confirmer par un second geste (le dimanche : un geste, un résultat) | S | ★★★ |
| Pincement pour zoomer, double toucher pour revenir [G15 p.2] | existe | « Loupe » remise à 100 % à chaque changement de page (`:885`) | Garder | - | - |
| Appui long = annoter [G15 Annotation] | manque | Bouton « Annoter » dans la barre, connecté seulement (`:1558`) | Option, derrière la question 4 : l'appui long ouvre l'annotation. Risque : menu de sélection du système sur le texte | S | ★ |
| Annotations sur page fixe, calques, tampons [G15 Annotation, Layers] | partiel | Stylo, surligneur, gomme ; traits vectoriels `{w,h,strokes}` ; clé de page = blocs + signature d'affichage dont `z<taille>` (`blocks.ts:420`) | **Voir § 3** (problème de clé). Calques et tampons : hors périmètre pour un culte | M | ★★★ (perte de traits) |
| Annoter au stylet sans que le doigt dessine [G15 Apple Pencil] | partiel | Le stylet est ignoré par les gestes de page (`:1006`, `:1014`) ; multi-touch pour zoom | Option « le doigt ne dessine pas » (doigt = zoom, stylet = trait) | S | ★ |
| Liens et boutons sur la page (reprises, coda) [G15 Links] | n/a | La reprise est déjà écrite dans la structure du chant (×2, ordre joué) | Rien : la structure remplace les liens | n/a | - |
| Réorganiser les pages (reprises à plat) [G15 Rearrange] | existe | « Ordre joué » déplie les reprises | Rien | - | - |
| Recadrage de page, modes de cadrage [G15 Crop] | n/a | Mise en page recalculée par taille de texte, pas de page figée | Rien : un chant est du texte, pas un PDF. Les scans 简谱 gardent leur cadrage | n/a | - |
| Sépia, mode sombre, « page dimming » [G15 Appearance] | partiel | Thème clair / sombre en réglage (`:1819-1838`) | Garder ; un fond « atténué » (sombre plus doux) est une idée, pas une demande | S | ★ |
| Anti-veille [G15 Auto-lock] | existe | Wake Lock (`:839-857`) | Rien | - | - |
| Plein écran, barre d'état masquée | existe | `requestFullscreen` à l'ouverture (`SetlistDetailClient.tsx:1402`) ; sur iPad sans API plein écran, installer la PWA | Rien ; le dire dans la spec | - | - |
| Métronome visible (bordure qui pulse), tempo par morceau [G15 Metronome] | manque | Aucun métronome ; tempo `{tempo}` affiché seulement sur les pages de scan 简谱 (`:1259-1263`) | **Tempo sur toutes les pages** (S), puis liseré qui bat à la mesure, silencieux (S à M). Jamais de son (les musiciens ont leur retour) | S à M | ★★ |
| Tap tempo (double toucher au centre) [G15 Metronome] | n/a | - | Hors périmètre : le tempo vient du fichier | n/a | - |
| Autoturn au métronome [G15 Metronome] | n/a | - | Hors périmètre : danger pour un culte, le tempo varie | n/a | - |
| Diapason, accordeur, enregistreur [KB-pitch, G15] | n/a | - | Le diapason (une note de départ) pourrait servir la présidence ; non demandé, à noter seulement | n/a | ★ |
| Piste audio liée, vitesse, boucle [G15 Audio] | n/a | Lien YouTube dans les fichiers, hors mode louange | Hors périmètre | n/a | - |
| Setlists : réordonner, dupliquer, partager [G15 Setlists] | existe | Éditeur de setlist et version perso (`spec-version-perso.md`) hors du mode | Rien dans le mode louange | - | - |
| Recherche globale, bibliothèque, onglets [G15 Search] | n/a | Sommaire du mode = la setlist en cours | Rien : en culte on joue la setlist | n/a | - |
| Cue : leader / suiveurs synchronisés [G12 Cue] | manque | Aucun partage de position entre appareils | **Hors lot** : demanderait Firestore ou un canal temps réel ; en REST seulement et sans coût, cela se ferait par sondage, fragile (le dimanche ne casse jamais). Noter l'idée dans la feuille de route | L | ★ |
| Rôle de l'appareil (pianiste, batteur…) | existe | 5 préréglages (`ROLE_PRESETS`) : plus riche que forScore | Garder | - | - |
| Repli si le nouveau mode gêne | à créer | - | Réglage « Style de lecture : Classique / forScore » par appareil | S | ★★★ (sécurité) |

## 2. Gains les plus forts pour un musicien sur pupitre

1. **Lecture verrouillée, barre ouverte à la demande** : aucune action involontaire en jouant (S, déjà presque là).
2. **Corriger les bandes de barre qui avalent les touchers** quand elles sont invisibles (S) : un bug réel du comportement actuel.
3. **« Ensuite » touchable et clair** en dernière page, sur toutes les dispositions (S).
4. **Aperçu de la page suivante** en portrait (M) : ce que forScore fait de mieux pour ne pas perdre la fin de page.
5. **Annotations qui survivent à la taille du texte** (§ 3).
6. **Tempo sur toutes les pages**, puis métronome visuel (S, puis S à M).
7. **Repli vers l'ancien mode** : condition de mise en ligne, pas un gain.

## 3. Le problème des annotations qui disparaissent

**Constat** (vérifié dans `blocks.ts:398-420`) : la signature d'affichage entre dans la clé de page et contient `z<taille × 100>` ; changer la taille du texte change la clé, donc les traits d'avant ne sont plus lus. Même chose pour accords, transitions, paroles masquées, capo, tonalité choisie, affichage. forScore n'a pas ce défaut parce que la page PDF est **fixe** : les traits sont des coordonnées sur une image.

**Pourquoi c'est dur ici** : le texte se recoupe en pages différemment à chaque réglage ; un trait en « x, y de la page 3 » n'a plus de sens sur la page 4 d'une autre mise en page.

**Pistes**

| Piste | Principe | Taille | Limites |
| --- | --- | --- | --- |
| a. Accrocher au bloc | Chaque trait garde l'identifiant du bloc le plus proche (section ou occurrence, comme `ancreDeLecture`, `blocks.ts:444`) et sa position **relative** dans ce bloc ; la clé devient « chant + setlist », sans signature. Un changement de taille remet le trait au bon endroit du bloc | M à L, avec migration | Un trait qui encercle un mot dans un bloc qui s'étire se déforme un peu ; accords masqués : la hauteur du bloc change, le trait glisse. Les anciens traits (ancienne clé) restent lisibles en repli, migrés au premier passage |
| b. Une taille de texte par chant, figée à l'annotation | La taille du texte est mémorisée **par chant** sur l'appareil ; dès qu'on annote, elle sert de taille « de ce chant » et ne change plus sans prévenir. La clé garde `z` mais celle-ci ne varie plus par mégarde | S | Ne règle pas accords, capo, tonalité ; un message « annotations masquées » pour ces cas |
| c. Garder le défaut | Dire à l'écran « des annotations existent à une autre taille » avec un bouton « Revenir à cette taille » | S | Aucune récupération en un geste pour le changement de capo ou de tonalité |

**Recommandation** : **b maintenant** (c'est le plus petit pas qui supprime la plupart des pertes, parce que la taille est le réglage que les musiciens changent le plus), **plus c** (l'avertissement) ; **a** seulement si Timothée juge la perte encore gênante après b. Dans tous les cas, ne pas casser les anciens traits.

## 4. Points de l'inventaire vérifiés dans le code

- Confirmés : zones en tiers et seuils (`:1020-1034`), clavier (`:977-1002`), barre auto-masquée 3 s (`:868`), stylet ignoré, aucun métronome, tempo seulement sur scan, signature d'affichage avec la taille du texte.
- **À corriger dans l'inventaire (§ 2)** : « bouton « Suivant : … » » est une **pastille non interactive** (`pointer-events-none`, `:1395`). Elle n'est pas un bouton ; seul le toucher du tiers droit passe au chant suivant.
- **À ajouter à l'inventaire** : le chrome masqué n'est pas inerte, ses deux barres restent `pointer-events-auto` (`:1476`, `:1538`) avec arrêt de propagation (`:1482-1483`, `:1544-1545`) : un toucher dans ces bandes, barre invisible, ne tourne pas la page. La spec de 2026 le dit déjà à propos du bouton « Revenir à X » ; l'inventaire ne le relie pas aux zones de toucher.
