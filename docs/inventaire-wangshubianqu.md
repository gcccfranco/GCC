# Inventaire de wangshubianqu.com (11/11/2026)

Demande de Timothée : « tout le site de A à Z », pour refaire l'onglet Harmonie (l'entrée par boucles de la planche
`planche-harmonie-accords.html` est écartée). Lu dans un navigateur (Playwright) : 200 pages parcourues depuis
l'accueil, puis les huit onglets de la carte d'accords, une leçon de solfège, un exercice, un chant décortiqué, une
leçon du manuel, la salle de groove, au téléphone et à l'ordinateur. **C'est un cours payant : on reprend des
fonctions et des formes d'interface, jamais ses textes, ses analyses ni ses sons.** Classement : **Prendre** (tel quel
dans l'idée) · **Adapter** (avec les chants de GCC) · **Laisser** (hors sujet pour la louange).

## Ce qu'est le site

Une école d'arrangement d'un professeur : un manuel de 106 leçons, un solfège interactif de 63 leçons, des outils
dans le navigateur (carte des accords, salle de groove, synthé, studio), des tutoriels de logiciels et de l'actualité.
Les textes « concept » sont publics ; analyses, exercices corrigés et sons des leçons sont réservés aux élèves. Tout
se fait **à l'oreille** : presque chaque écran a un bouton pour écouter. Interface sombre, dense, chiffres et lettres
côte à côte, réglages gardés dans le navigateur, partage par lien.

## A. La carte des accords (`/chord-map/`), cœur de l'harmonie

Une barre fixe en bas sur tous les onglets : **lecture** (tempo, mesure, rythme d'accompagnement « un coup par
temps »…, batterie oui/non, instrument), **« Ma progression »** (une rangée de mesures, chaque case = un accord avec
son degré et sa fonction), annuler / historique, « comparer », vue piano-roll. Tout ce qu'on touche ailleurs s'y
écrit et s'y écoute.

| Onglet | Ce qu'on fait | Verdict |
| --- | --- | --- |
| **Écrire une progression** | tonalité, piano ou guitare ; recherche (« 1645 », « C G/B Am F ») ; les accords rangés en **cinq cercles** : dans la tonalité (7), empruntés (24), dominantes secondaires (14), substitutions (12), lointains (15) ; chaque accord : mini-clavier, degré, fonction (tonique / sous-dominante / dominante), « courant » ; en tête, **l'explication de chaque enchaînement de ma progression** (« 2 notes communes », « sous-dominante ») ; volet de droite « pourquoi ça s'enchaîne » | **Adapter** : c'est la bonne entrée. Un musicien part *d'un chant* (sa grille) et on lui explique chaque passage ; les cinq cercles = nos familles, triées par distance à la tonalité |
| **Bibliothèque de progressions** | 130 progressions classées (de base, pop, emprunts, mineur, jazz…) ; filtres tonalité, **ressenti** (chaleureux, mélancolique, élan / résolution, couleur / surprise), **usage** (couplet, refrain, fin) ; chaque carte : accords avec fonction, chiffres, une phrase, « N chansons sur 535 l'utilisent », **Écouter**, « charger », « insérer après la mesure 1 » ; version triades / avec septièmes | **Adapter** : filtres par ressenti et par usage, compteur dans *nos* chants, écoute ; pas une entrée par boucle mais une bibliothèque qu'on feuillette |
| **Chants décortiqués** | 100 chants + 2 expériences d'écoute, du plus simple au plus avancé ; un chant = sa progression, **« Écouter A (avant) / Écouter B (après) »**, ce que B change, tonalité changeable, tempo | **Adapter, priorité 1** : nos fiches ont déjà « Avant → après » ; il manque l'écoute A/B et les chants *de GCC* comme exemples |
| **Cycle des quintes** | roue (majeurs dehors, mineurs dedans, chiffres sous chaque accord) ; toucher un accord = l'écouter et voir **jusqu'à six suites numérotées** sur la roue et en liste : « dans le sens de la résolution », « voix au plus près », « hors tonalité », avec les notes gardées et les notes qui bougent ; « écouter seul » / « écrire dans la case » | **Adapter** : la liste « et ensuite ? » avec notes communes, utile en répétition ; la roue elle-même en option (grand écran) |
| **Carte complète des accords** | tous les accords de la tonalité en cartes (clavier, renversement, degré, fonction) | **Prendre** : c'est notre bibliothèque d'accords, avec le chiffre dans la tonalité |
| **Toutes les combinaisons** | toutes les suites de 2 à 8 accords d'un ensemble choisi, triées « courant → rare », « voix les plus douces », « les plus aimées » ; noms des progressions connues ; compteur | **Laisser** (outil de compositeur) |
| **Exercices** | 8 niveaux liés au manuel : qualité d'un accord **à l'oreille** (majeur, mineur, diminué, augmenté), fonctions, substitutions, variantes, septièmes et sus, cadences, accords hors tonalité, écrire sa progression ; tout reste utilisable sans passer les niveaux ; progrès gardés dans le navigateur | **Adapter** : deux ou trois exercices d'oreille sur des passages de nos chants |
| **Modes et gammes** | 80 gammes (dont pentatoniques chinoises) ; choisir la tonique, écouter la gamme, une phrase, des accords dessus | **Adapter, petit** : la pentatonique chinoise et le majeur suffisent (chants chinois, intros) |

Ailleurs sur la page : un **piano 3D jouable** (sons de piano modélisé, réverbération, pédale), un lecteur « lis-moi »
qui dit le texte à voix haute, **raccourcis** (espace = écouter, 1–7 = accords de la tonalité, flèches = case
suivante, clavier d'ordinateur = clavier de piano, clavier MIDI branché). Au téléphone : mêmes onglets en rangée qui
défile, barre du bas réduite ; **la fenêtre du piano 3D s'ouvre par-dessus au chargement et cache la page**.

## B. Solfège interactif (`/theory`, 63 leçons gratuites) et « exercices de solfège » (`/theory-practice`)

Chaque leçon : **1. exercice de création** (on modifie une note sur un piano-roll ou un clavier, on écoute « avant /
après », on garde sa version), 2. texte et exemples, 3. exercices, 4. historique. Une idée par leçon (« comparer
majeur et mineur : bouger la tierce »). Les exercices de solfège : 7 épisodes en mondes (« la mine des temps »,
« le labo du majeur »…), un clavier qui sonne, des défis en étapes, des « gemmes » de progression, un indice à la
demande. **Adapter** : la forme « je touche une note, j'entends la différence » pour nos fiches ; pas un cours de
solfège complet (nos 24 chapitres existent).

## C. Le manuel (`/read`, 106 leçons en 12 chapitres)

Textes « concept » publics, chaque leçon : durée de lecture, schémas, glossaire, « compléments » repliés, progression
« lu 0/10 ». Chapitres utiles à la louange, à reprendre **comme sujets de nos fiches et cours, pas comme textes** :
1 rythme et groove (temps forts, syncopes, swing, plusieurs instruments ensemble) ; 3 basse ; 4 mélodie et
harmonisation (fonctions, extensions et sus, cadences, harmoniser une mélodie, accords hors tonalité) ; 5 piano
(**disposition des accords, main gauche / main droite, laisser la fondamentale à la basse**, piano harmonique / rythmique /
arpèges, contre-chants) ; 6 guitare (doigtés, rythmique, arpèges, **deux guitares ensemble**) ; 10 **rôles des
instruments dans l'ensemble, « plans » (qui est devant)** ; 11 **forme : intro, interlude, pont, fin ; passer un rôle
d'un instrument à l'autre**. **Adapter** : c'est ce qui manque à GCC (jouer *ensemble*, pas seulement l'accord juste).
Laisser : 2 batterie en MIDI, 7 timbres, 8 cordes, 9 synthés, 12 mixage.

## D. Salle de groove (`/groove-room/`)

50 styles (pop, soul, rock, country…) chacun avec un tempo et un kit ; on écoute une boucle de batterie et
d'accompagnement. **Adapter, petit** : quatre ou cinq grooves de louange (ballade, 6/8, pop 4/4, gospel) pour
répéter une grille au bon tempo.

## E. Le reste, une ligne chacun (tout **Laisser**)

Arrangement « style chinois » (guzheng, dizi, erhu… avec écriture MIDI) ; synthé dans le navigateur et cours de
synthé ; studio dans le navigateur et cours de six logiciels (Cubase, Logic, Live, Studio One, Reaper, FL) ;
traductions de banques de sons ; actualités de logiciels et promotions ; atlas des instruments ; carte de 1 309 styles
musicaux ; plugin gratuit de traduction ; vidéos ; quiz et devoirs (réservés aux élèves) ; tableau des élèves.

## Ce qu'il en ressort pour GCC

1. **Partir d'un chant, pas d'un catalogue** : l'onglet « écrire une progression » explique *chaque enchaînement* de
   la grille qu'on a sous les yeux. Pour GCC : ouvrir un chant du répertoire et voir, passage par passage, sa fonction,
   ses notes communes et les idées qui s'y appliquent.
2. **L'oreille partout** : un bouton Écouter sur chaque accord, chaque suite, chaque « avant / après » ; un tempo et
   un accompagnement simple. Sans son, nos 69 fiches restent du texte.
3. **Feuilleter par ressenti et par usage** (couplet, refrain, fin ; chaleureux, élan, couleur), avec le compteur dans
   nos chants : remplace l'entrée par familles ou par boucles.
4. **« Et ensuite ? »** : depuis l'accord où l'on est, les suites possibles avec ce qui reste et ce qui bouge.
5. **Jouer ensemble** : rôles, plans, deux guitares, laisser la basse au bassiste, intro / pont / fin.
6. **Petits exercices d'oreille** sur nos chants, sans niveaux obligatoires, progrès dans le navigateur.
7. À éviter : la densité (dix réglages à l'écran), la fenêtre qui s'ouvre seule au téléphone, le sombre imposé.
