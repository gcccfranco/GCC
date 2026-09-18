# Spec — Onglet Évènements au look de la maquette (lot 6 bis)

**Demande de Timothée, 16/09/2026** : quatre écrans de maquette (formulaire,
liste, vue organisateur, fiche), « j'aimerais que l'onglet Évènements
ressemble un peu à ça, un truc dans le genre ». Statut : **go donné le
16/09/2026 avec les quatre recommandations ; L1–L4 codées le jour même, test
d'abord, trois appareils (`tests/evenements.spec.ts`, § « Lot 6 bis ») ; non
commité, à valider en local.**

Le module Évènements (lot 6, `spec-evenements.md`) garde ses données, ses
droits et ses règles : cette spec ne touche qu'à la présentation et à
l'ordre des champs. Le QR code du calendrier a été retiré le 16/09/2026 ;
celui de la fiche reste, la maquette le confirme (« Lien d'inscription »).

## 1. Ce que la maquette montre, ce qui existe, ce qui change

### Liste (onglet Évènements)
- **Maquette** : carte blanche, vignette de date à gauche, titre, une ligne
  « 12h00 · Salle polyvalente », puis l'état d'inscription : badge vert
  « Inscrit », sinon bouton « S'inscrire » à droite. Pas de badge de type ni
  de public sur la carte.
- **Aujourd'hui** (`EvenementCard.tsx`) : vignette de date, titre, ligne
  « heure · lieu · N places », badges type + public.
- **Change** : badges retirés de la carte (gardés sur la fiche), état
  d'inscription ajouté (« Inscrit » en vert, « S'inscrire », ou « Complet »),
  places affichées seulement si une limite existe. Une info (sans date)
  garde sa carte actuelle.

### Fiche, vue d'un membre
- **Maquette** : bannière en tête (image ou zone grise), badges type +
  public, titre, trois lignes à icône (date, horaire début – fin, lieu),
  filet, « Pour plus d'infos : responsable », bouton plein « S'inscrire »
  sur toute la largeur, « 12 déjà inscrits » dessous.
- **Aujourd'hui** (`EvenementClient.tsx`, `Inscriptions.tsx`) : lien
  retour, titre, badges, encart date · heure / lieu, description, liens,
  galerie d'images, bloc Inscriptions (places, champs nom + invités,
  bouton « Je participe », désinscription), « Organisé par … · Contact ».
- **Change** : la première image devient la bannière en tête (les autres
  restent en galerie sous la description), lignes à icône, contact et
  organisateur sur la ligne « Pour plus d'infos », bouton plein
  d'inscription avec le compteur dessous, badge « Inscrit » à la place du
  bouton quand on participe (la désinscription reste).

### Fiche, vue de l'organisateur
- **Maquette** : titre, badges, Modifier / Dupliquer / Supprimer en
  pilules, panneau « Inscriptions » avec l'état « Ouvertes » et le compteur
  en grand, filet, QR + « Lien d'inscription ».
- **Aujourd'hui** : mêmes actions, liste des inscrits avec retrait, bouton
  ouvrir / fermer, bouton « QR code ».
- **Change** : panneau compteur + état (le bouton ouvrir / fermer dedans),
  lien de la fiche copiable avec le QR à côté (au lieu du bouton qui
  déplie), liste des inscrits repliée sous le panneau.

### Formulaire (nouveau / modifier)
- **Maquette** : Nom, Catégorie · Public, Date · Horaire, Lieu, Responsable,
  Description, zone « Ajouter une bannière », interrupteur « Inscriptions
  ouvertes », Enregistrer.
- **Aujourd'hui** (`EvenementForm.tsx`) : Titre, Type · Pour, Date · Heure ·
  Heure de fin · Date de fin, Lieu, Description, Liens, Images, Places, Sans
  compte, Épingle, Expiration, Contact.
- **Change** : ordre et libellés de la maquette pour les champs courants ;
  heure de fin, date de fin, liens, places, sans compte, épingle et
  expiration repliés sous « Plus d'options » ; la zone d'image prend le nom
  « bannière » (première image) et garde les images suivantes ; le champ
  « Responsable » reprend le contact libre d'aujourd'hui, pré-rempli avec le
  nom du créateur.

## 2. Ce qui ne bouge pas (hypothèses)
- **Couleurs du site, pas celles de la maquette** : rouge du logo pour les
  boutons pleins (règle du lot 4), vignettes et badges dans les couleurs de
  service. Le bleu et le lavande de la maquette ne sont pas repris.
- **Aucun champ nouveau** en base : la bannière est `images[0]`, le
  responsable est `contact` / `organisateurNom`.
- Droits, `firestore.rules`, inscriptions sans compte, invités, rappels de
  la veille, cloche, onglet Scène : inchangés.

## 3. Questions à trancher
| # | Question | Recommandation |
|---|---|---|
| Q1 | « S'inscrire » sur la carte de la liste : inscrit directement (un tap, sans invité) ou ouvre la fiche ? | Ouvre la fiche : on voit la date, le lieu et les places avant de s'engager, et le champ invités reste possible. Un tap de plus, zéro inscription involontaire. |
| Q2 | Invités : champ visible d'emblée (comme aujourd'hui) ou derrière le bouton ? | Derrière : bouton plein « S'inscrire », puis la ligne « invités » et la confirmation. Deux taps au plus, fiche plus calme. |
| Q3 | Responsable : texte libre (aujourd'hui) ou sélecteur parmi les membres ? | Texte libre pré-rempli. Un sélecteur de membres est un chantier à part (liste des comptes, droits). |
| Q4 | « Plus d'options » repliées dans le formulaire ? | Oui : les sept champs rares sous un repli, le formulaire tient sur un écran de téléphone. |

## 4. Tranches (test d'abord, trois appareils, FR + 中文)
| Tranche | Contenu | Test |
|---|---|---|
| L1 liste | carte sans badges, état d'inscription, places si limite | `evenements.spec.ts` : Inscrit / S'inscrire / Complet sur la carte, plus de badge |
| L2 fiche | bannière, lignes à icône, ligne info, bouton plein + compteur, badge Inscrit | inscription puis désinscription, compteur, bannière = première image |
| L3 organisateur | panneau compteur + état, lien + QR, inscrits repliés | ouvrir / fermer, lien copiable, QR visible |
| L4 formulaire | ordre et libellés, « Plus d'options », bannière | création avec les champs courants seuls ; champs rares sous le repli |
| L5 livraison | captures 4 formats × clair / sombre, docs, feuille de route | suite complète verte |
| L6 même rendu partout | carte blanche autour de la fiche, zone d'attente de bannière, formulaire d'un seul bloc, plus aucune structure qui change au point de rupture | carte blanche et bannière sur les trois appareils, une seule carte de formulaire, compteur écrit une seule fois |

Taille **M** (une soirée).

## 5. Avancement (16/09/2026)
- **L1** `EvenementCard.tsx` (état d'inscription à droite, badges retirés), `CalendrierClient.tsx` (mes inscriptions : une lecture par évènement daté).
- **L2** `EvenementClient.tsx` (bannière = première image, badges puis titre, lignes à icône, galerie des images suivantes, « Pour plus d'infos : contact ou organisateur »), `Inscriptions.tsx` (bouton plein « S'inscrire » → invités et nom sans compte → « Confirmer » / « Annuler » ; badge « Inscrit » ; « N déjà inscrits · places »).
- **L3** `Inscriptions.tsx` (panneau « Inscriptions » : état Ouvertes / Fermées, compteur, ouvrir / fermer, « Voir les inscrits (N) »), `QrCode.tsx` (`QrCodeLink` : QR visible en petit, un tap l'agrandit, adresse à côté).
- **L4** `EvenementForm.tsx` (ordre de la maquette, libellés Nom de l'évènement · Catégorie · Public · Horaire · Responsable, zone « Ajouter une bannière », interrupteur « Inscriptions ouvertes », `<details>` « Plus d'options » : fin, liens, places, sans compte ; épingle et expiration restent visibles pour une info), `NouveauClient.tsx` (responsable pré-rempli avec le nom du créateur).
- Libellés FR + 中文 ajoutés dans `src/locales`. Boutons pleins en rouge du logo (plus de couleur de scène en dur sur ces boutons).
- **L5** captures 4 formats (téléphone clair / sombre, tablette portrait / paysage), suite complète, feuille de route.
- **L6** (16/09/2026, « je veux que ce soit comme ça qu'on soit sur ordinateur, téléphone, tablette ») : la fiche et la vue organisateur passent dans une **carte blanche** (`fiche-carte`), la bannière montre une **zone d'attente** avec une icône quand il n'y a pas d'image, le formulaire devient **un seul bloc blanc** (`form-carte`) avec filets de séparation, le panneau des inscriptions passe en gris dans la carte et le compteur n'est plus écrit deux fois pour l'organisateur. Les `sm:grid-cols-2` restants ont disparu : la structure est identique sur ordinateur, téléphone et tablette.

**Tranché le 17/09/2026** : la maquette écrit les heures « 12h00 », le site écrit « 12:00 » partout (planning compris) — Timothée : « Le format de l'heure en 12:00 ». Le site garde son écriture, la maquette ne l'emporte pas ; aucun « 12h00 » ne traîne dans le code ni dans les locales (vérifié), rien à changer.

## 6. Retour de Timothée (17/09/2026)

« Pourquoi l'onglet évènement s'affiche toujours comme ça ? […] je veux la
même DA mais adapté au site. Il faut aussi que celui qui crée l'évènement
puisse aussi s'inscrire. » Captures sur téléphone d'un évènement de test
commencé depuis la veille.

**Diagnostic.**
- Le créateur **pouvait** s'inscrire (ni la page ni le serveur ne l'en
  empêchent) ; son évènement avait commencé, et un évènement commencé refuse
  les inscriptions. Mais le panneau de l'organisateur affichait « Ouvertes »
  juste sous « Inscriptions fermées » : il ne lisait que l'interrupteur.
- La vue organisateur mélangeait en une carte ce que la maquette sépare ;
  « Supprimer » sans bord, date en gras, « Lien de la fiche » avec l'adresse
  complète ; formulaire aux libellés gras, listes blanches à bord à côté de
  champs gris, boutons hors de la carte.

**Tranché (question du 17/09/2026)** : pour l'organisateur, la **carte de
gestion en haut** (titre, badges, Modifier · Dupliquer · Supprimer en pilules
à bord, panneau « Inscriptions » avec état et compteur, tuile QR + « Lien
d'inscription »), **puis la fiche des membres** sans répéter titre ni badges,
avec « S'inscrire ».

**Fait** (test d'abord, trois appareils) :
- `EvenementClient.tsx` : `gestion-carte` au-dessus de `fiche-carte` pour
  l'organisateur ; date sans gras.
- `Inscriptions.tsx` : `Inscriptions` (fiche) et `PanneauInscriptions`
  (gestion) séparés ; un évènement commencé est « Fermées » dans le panneau,
  sans bouton pour rouvrir ; l'inscription de l'organisateur fait relire la
  liste, le retrait de sa propre place fait relire la fiche.
- `EvenementCard.tsx` : « Inscrit » sous l'heure et le lieu.
- `QrCode.tsx` : tuile à bord, « Lien d'inscription » (« Lien de la fiche »
  pour une info ou une réunion de pôle), adresse sans `https://`.
- `EvenementForm.tsx` : libellés discrets, listes au style des champs du site,
  « Prévenir les membres » en interrupteur dans la carte, boutons pleine
  largeur dans la carte.
- Adapté au site plutôt que copié : champs gris, boutons en pilule, cartes
  sans bord, rouge du logo.
- Tests `evenements.spec.ts` § « Retour de Timothée du 17/09/2026 » (7 tests ;
  « le créateur s'inscrit » passait déjà, il reste en garde-fou) ; suite
  Évènements 159 verts.

**Suite du 17/09/2026 : qui voit les inscrits.** Timothée : « montrer le nombre
[d'inscrits et] qui est inscrit pour tout le monde, pas seulement à la personne
qui a créé l'évènement » ; question posée (sans compte aussi ?), réponse :
« visible que pour les membres connectés ». Fait : `canSeeInscrits` (connecté)
dans `access.ts`, lecture de `evenements/{id}/inscriptions` ouverte aux
connectés dans `firestore.rules` (**à publier**), « Voir les inscrits (N) » en
lecture seule sous « N déjà inscrits » dans la fiche d'un membre ; sans compte,
le nombre seul ; retirer une place reste à l'organisateur et à la coordination
(liste commune `ListeInscrits`). Tests : « membre connecté : voit qui est
inscrit… », droit `canSeeInscrits` ; « fiche sans compte : aucun nom » inchangé.
La carte de la liste « comme ça » attend l'image, qui n'est pas arrivée.

**Suite du 17/09/2026 : la liste en grandes cartes.** Timothée : « je veux que
la page avec les évènements ait une carte comme ça pour l'évènement » (maquette
`../图片_20260916093643_1235_30.jpg`, hors dépôt : la carte « Brunch de
rentrée » du 16/09) ; question posée (liste, fiche ou les deux), réponse :
**la liste**. Fait : `EvenementCarte` pour chaque évènement à venir (bannière,
badges, titre, date · horaire · lieu, « Pour plus d'infos », « Inscrit » /
« Complet » / « Inscriptions fermées » / « S'inscrire » pleine largeur, « N
déjà inscrits ») ; toute la carte mène à la fiche ; réunion de pôle : ni bouton
ni compteur ; infos épinglées et passés gardent la ligne compacte. Haut de
carte commun avec la fiche (`EnteteEvenement`, `PlusInfos`) ; date avec
majuscule à l'écran. Tests : « un évènement à venir est une grande carte comme
la maquette », « ligne compacte », « réunion de pôle ». Contrôle : ordre et
alignements lus sur les captures des trois appareils, identiques à la maquette
(sauf « 12:00 » contre « 12h00 », toujours à trancher).
