# Spec — Compter l'usage des fonctionnalités (chantier 5 de la demande AP)

Cadrage : `docs/spec-pupitre-musicien.md` (§ Chantiers proposés, ligne 5 ; § Réponses de Timothée, point 2).
Mots de Timothée (11/11/2026) : « tu peux même compter pour toutes les fonctionnalités pour faire le tri à la fin
des fonctionnalités qui servent à rien et les retirer ».

Statut : **validée** (Timothée, 11/11/2026 : « suis tes recommandations, go pour T1 »). Go pour **T1 seulement**.

## Objectif

Savoir, au bout de quelques mois, quelles fonctionnalités du site **ne servent pas**, pour que Timothée décide
lesquelles retirer. On compte des usages, pas des personnes.

Critères de succès vérifiables :
- chaque fonctionnalité de l'inventaire ci-dessous a une clé ; une fonctionnalité jamais utilisée apparaît **à 0**
  dans l'écran de lecture (elle n'est pas absente) ;
- un appareil actif coûte **au plus une écriture Firestore par jour** ;
- aucun envoi ne porte d'identifiant de personne (uid, courriel, nom) ni d'heure ;
- rien ne se perd hors-ligne : ce qui est compté pendant un service sans réseau part à la connexion suivante.

## Ce qui existe

- Aucun compteur d'usage (ni analytics, ni `increment`) dans `src/`, `public/` ou `package.json`. Les
  « statistiques » (`src/lib/stats/`) comptent les chants joués d'après les setlists, pas les visites.
- Firestore par l'API REST : `FS_BASE`, `authHeader`, `checkRest` dans `src/lib/firebase/setlists.ts`
  (l. 36-131), importés par les autres modules. Aucune écriture n'utilise encore `fieldTransforms` (`increment`).
- `public/sw.js` ne met en cache que des lectures : aucune file d'attente d'écritures.
- Quota (spec LF, `docs/spec-lectures-firestore.md`) : 359 écritures par jour mesurées le 30/10 (quota gratuit
  20 000) ; les lectures, elles, frôlent le quota (50 000) : l'écran de lecture doit lire très peu.

## Ce qu'on compte

Deux sortes d'évènements, chacun avec une **clé** stable (`ecran.…` ou `cmd.…`) :
- **ouverture d'un écran** : comptée par un seul crochet dans le gabarit racine, au changement de route ; la route
  est normalisée (`/songs/[slug]`, pas le nom du chant). Couvre les 60 pages d'un coup ;
- **usage d'une commande** : un appel `compter("cmd.…")` dans le gestionnaire du bouton, du menu ou du geste.
  Une commande se compte quand elle **agit** (transposer, exporter), pas quand son menu s'ouvre.

Pour chaque clé, deux nombres par mois :
- `n` : nombre d'usages ;
- `j` : **jours-appareils**, nombre de couples (appareil, jour) où la clé a servi au moins une fois. C'est le
  chiffre qui décide : un seul musicien qui transpose 200 fois pèse 1 par jour, pas 200.

Plus `_actif.j` : jours-appareils où le site a été ouvert, pour rapporter chaque clé à l'usage total.

Le registre des clés (`CLES_USAGE`, un fichier, avec le libellé FR de chaque clé) fait foi : l'écran de lecture
part du registre, pas des champs présents, et un test refuse une clé comptée qui n'y est pas.

### Inventaire (une ligne par fonctionnalité)

Relevé du 11/11/2026 par grep des écrans et des libellés ; à compléter pendant le codage de chaque tranche si une
commande manque (elle s'ajoute au registre, sans nouvelle décision). Les écrans (`ecran.*`) sont tous comptés par
le crochet de T1 et ne sont pas relistés ici, sauf quand l'écran est la fonctionnalité.

| Domaine | Fonctionnalité | Clé | Tranche |
| --- | --- | --- | --- |
| Accueil | « Ce dimanche » (ouvrir la setlist) | `cmd.accueil.ceDimanche` | T3 |
| Accueil | « Pour moi » (ouvrir un élément) | `cmd.accueil.pourMoi` | T3 |
| Chants | Recherche (une recherche aboutie : résultat ouvert) | `cmd.chants.recherche` | T2 |
| Chants | Bascule 中文 de la liste | `cmd.chants.basculeZh` | T2 |
| Chants | Statistiques (bouton ou page) | `ecran.songs/statistiques`, `cmd.chants.statsDuChant` | T2 |
| Chants | Proposer un chant (envoi) | `cmd.chants.proposer` | T2 |
| Chant | Transposer (± ou tonalité choisie) | `cmd.chant.transposer` | T2 |
| Chant | Revenir à la tonalité d'origine | `cmd.chant.toniqueOrigine` | T2 |
| Chant | Capo | `cmd.chant.capo` | T2 |
| Chant | Choix de disposition | `cmd.chant.disposition` | T2 |
| Chant | Largeur de coupure | `cmd.chant.largeur` | T2 |
| Chant | Partition 简谱 (scan affiché) | `cmd.chant.jianpu` | T2 |
| Chant | Copier les paroles | `cmd.chant.copierParoles` | T2 |
| Chant | Export PDF (par mise en page choisie) | `cmd.chant.pdf` | T2 |
| Chant | Partager | `cmd.chant.partager` | T2 |
| Chant | Toucher un accord (panneau d'accord) | `cmd.chant.accord` | T2 |
| Chant | Ma version : enregistrer | `cmd.chant.maVersion` | T2 |
| Chant | Ma version : partager | `cmd.chant.partagerVersion` | T2 |
| Chant | Ma version : rétablir l'original | `cmd.chant.retablir` | T2 |
| Chant | Adapter | `cmd.chant.adapter` | T2 |
| Chant | Ligne instrumentale, transitions | `cmd.chant.transitions` | T2 |
| Chant | Annoter (trait enregistré) | `cmd.chant.annoter` | T2 |
| Chant | Ajouter à une setlist / « Je joue » | `cmd.chant.jeJoue` | T2 |
| Mode louange | Ouvrir | `cmd.louange.ouvrir` | T2 |
| Mode louange | Plein écran | `cmd.louange.pleinEcran` | T2 |
| Mode louange | Affichage « section unique » / « ordre joué » / « structure seule » | `cmd.louange.affichage.<valeur>` | T2 |
| Mode louange | Chant suivant / précédent | `cmd.louange.chantSuivant` | T2 |
| Mode louange | Métronome visuel | `cmd.louange.metronome` | T2 |
| Mode louange | Tempo ± / effacer | `cmd.louange.tempo` | T2 |
| Mode louange | Cercle chromatique | `cmd.louange.cercle` | T2 |
| Mode louange | Feuille de route | `cmd.louange.feuilleDeRoute` | T2 |
| Mode louange | Repères, curseur de page | `cmd.louange.reperes` | T2 |
| Mode louange | Demi-page | `cmd.louange.demiPage` | T2 |
| Mode louange | Thème de scène | `cmd.louange.themeScene` | T2 |
| Setlists | Créer une setlist | `cmd.setlist.creer` | T2 |
| Setlists | Éditeur : ajouter un chant (bibliothèque) | `cmd.setlist.ajouterChant` | T2 |
| Setlists | Éditeur : modifier une ligne | `cmd.setlist.modifierLigne` | T2 |
| Setlists | Vue Liste / vue Partitions | `cmd.setlist.vue.<liste\|partitions>` | T2 |
| Setlists | Sommaire | `cmd.setlist.sommaire` | T2 |
| Setlists | Idées du chant | `cmd.setlist.idees` | T2 |
| Setlists | Historique / versions | `cmd.setlist.historique` | T2 |
| Setlists | Partager | `cmd.setlist.partager` | T2 |
| Setlists | Présentation (FreeShow) | `cmd.setlist.presentation` | T2 |
| Setlists | Notifier l'équipe | `cmd.setlist.notifier` | T2 |
| Setlists | Corbeille : mettre, restaurer, supprimer | `cmd.setlist.corbeille.<action>` | T2 |
| Planning | Onglet de planning (lequel) | `ecran.planning/*` | T1 |
| Planning | Choisir son nom | `cmd.planning.choisirNom` | T3 |
| Planning | Prévenir d'un changement | `cmd.planning.prevenir` | T3 |
| Planning | Petit-déjeuner : cocher | `cmd.planning.petitDej` | T3 |
| Planning | Changer d'année | `cmd.planning.annee` | T3 |
| Planning | Grille : copie, historique, ajouter une date | `cmd.planning.grille.<action>` | T3 |
| Planning | Exporter le modèle | `cmd.planning.export` | T3 |
| Planning | Publier | `cmd.planning.publier` | T3 |
| Harmonie | Catalogue : recherche, filtre | `cmd.harmonie.filtre` | T3 |
| Harmonie | Fiche ouverte | `ecran.harmonie/[...fiche]` | T1 |
| Harmonie | Suggestion écartée / remise | `cmd.harmonie.suggestion` | T3 |
| Harmonie | Idée : ajouter, modifier, supprimer | `cmd.harmonie.idee.<action>` | T3 |
| Harmonie | RD-2000 | `ecran.harmonie/rd2000*` | T1 |
| Harmonie | Cours : cocher un chapitre | `cmd.harmonie.chapitre` | T3 |
| Harmonie | Avis sur la langue | `cmd.harmonie.avisLangue` | T3 |
| Compte | Absences : ajouter, supprimer | `cmd.compte.absence` | T3 |
| Compte | Réglages de notifications | `cmd.compte.notifPrefs` | T3 |
| Compte | Activer les notifications push | `cmd.compte.push` | T3 |
| Compte | Visite guidée (onboarding) | `cmd.compte.onboarding` | T3 |
| Compte | Guide | `ecran.guide` | T1 |
| Équipes, tâches | Fiches, listes | `ecran.equipes*`, `ecran.taches*` | T1 |
| Évènements | Créer, modifier, s'inscrire, compte rendu | `cmd.evenement.<action>` | T3 |
| Évènements | Scène | `ecran.evenements/scene*` | T1 |
| Annonces | Bascule « annonce » | `cmd.annonce.bascule` | T3 |
| Notifications | Ouvrir la cloche | `cmd.cloche.ouvrir` | T3 |
| Notifications | Envoyer (Notifier) | `cmd.notifier.envoyer` | T3 |
| Questionnaire | Envoyer | `cmd.questionnaire.envoyer` | T3 |
| Chant | Signaler un problème | `cmd.chant.signaler` | T3 |
| Général | Langue FR / 中文 | `cmd.general.langue` | T3 |
| Général | Thème clair / sombre / auto | `cmd.general.theme` | T3 |
| Général | Tirer pour rafraîchir | `cmd.general.rafraichir` | T3 |
| Général | Site installé (PWA) au lancement | `cmd.general.pwa` | T1 |
| Back-office | Chaque écran (équipes, personnes, tâches, évènements, réunions, calendrier, planning, messages, admin) | `ecran.back-office/*`, `ecran.admin` | T1 |

## Où c'est rangé, ce que ça coûte

**Sur l'appareil** (`localStorage`, clé `gcc-usage`) : `{ "AAAA-MM-JJ": { "<clé>": n } }`. `compter()` n'écrit que
là : aucun réseau, aucun coût, marche hors-ligne. Les jours se gardent tant qu'ils ne sont pas envoyés (au plus
60 jours, au-delà on jette le plus ancien).

**Envoi** : quand l'onglet passe en arrière-plan (`visibilitychange` → `hidden`) ou à l'ouverture suivante, **au
plus une fois par jour et par appareil**, et seulement si un compte est connecté (jeton Firebase). Une requête REST
`documents:commit` vers **`usage/{AAAA-MM}`** (un document par mois), avec des `fieldTransforms` `increment` :
`<clé>.n += n`, `<clé>.j += 1` pour chaque clé utilisée ce jour-là, `_actif.j += 1`. Plusieurs jours en attente
partent dans le même commit (un document par mois concerné). Succès → les jours envoyés sont effacés ; échec (hors
réseau, 401) → ils restent pour la fois suivante. Jamais le SDK Firestore.

**Coût** :
- écritures : une par appareil actif et par jour, soit quelques dizaines à 150 par jour (quota 20 000 ; 359
  aujourd'hui). Un document reçoit au plus quelques écritures par minute, bien sous la limite d'une par seconde ;
- lectures : aucune côté membres ; l'écran de lecture lit un document par mois affiché (≤ 12) ;
- taille : ≈ 150 clés × 2 nombres, quelques kilo-octets par mois.

**Hors-ligne** : rien à changer dans `public/sw.js` (pas de nouvelle stratégie de cache, donc pas de nouvelle
version `gcc-louange-v6`) : la file d'attente est le `localStorage` ci-dessus.

**Règle Firestore** (nouvelle, dans `firestore.rules` **et** côté client `src/lib/access.ts` pour l'écran) :

```
match /usage/{mois} {
  allow read: if isAdmin();
  allow create, update: if signedIn() && mois.matches('^[0-9]{4}-[0-9]{2}$');
  allow delete: if false;
}
```

Les règles ne savent pas vérifier qu'un `increment` est petit : un membre pourrait gonfler un compteur. Risque
accepté (membres de l'église, données sans enjeu). ⚠ **Cette règle ne prend effet qu'une fois publiée à la main
par Timothée dans la console Firebase** ; tant qu'elle ne l'est pas, les envois échouent (403) et les comptes
restent sur les appareils, sans perte ni gêne visible. Le comptage ne commence en ligne qu'après une mise en ligne
sur `main`, sur ordre de Timothée.

## Confidentialité

On compte des usages, pas des personnes :
- aucun uid, courriel, nom, ni identifiant d'appareil n'est envoyé ; le jeton sert seulement à passer la règle ;
- aucune heure : le jour reste sur l'appareil, Firestore ne connaît que le mois ;
- aucun nom de chant ni de setlist : la route est normalisée (`/songs/[slug]`) ;
- les jours-appareils comptent des appareils, pas des personnes (une personne avec un iPad et un téléphone compte
  deux fois ; deux personnes sur un même iPad, une fois).

Conséquence assumée : on ne pourra pas dire « qui » n'utilise pas une fonctionnalité (« les musiciens n'exportent
jamais le PDF ») ; voir la question 2, qui propose une ventilation grossière.

Phrase à ajouter dans `/guide` (ou `/moi`) : « Le site compte, sans savoir qui, quelles fonctions servent, pour
retirer celles qui ne servent pas. »

## Où ça se lit

Un écran du back-office, `/back-office/usage`, derrière `BACK_OFFICE` et réservé aux administrateurs (même
condition que la règle). Contenu minimal : une ligne par clé du registre, son libellé, `j` et `n` par mois sur la
période choisie, la part de `_actif.j`, triée **de la moins utilisée à la plus utilisée** ; les clés sous le seuil
(ci-dessous) marquées « candidate au retrait ». Aucun graphique dans la première version. Le dessin est la
question 4.

## Quand décider, sur quel seuil

- **Durée** : au moins **trois mois pleins** de comptage en ligne, comprenant au moins douze dimanches et une
  fête (pour ne pas juger sur une période creuse). Premier bilan proposé : le mois qui suit.
- **Seuil** : une fonctionnalité est **candidate au retrait** si, sur la période, ses jours-appareils restent
  **sous 1 % de `_actif.j`** *et* **sous 4 par mois** (moins d'une fois par semaine sur tout le site).
- **Exceptions** (rares par nature, jamais candidates d'office) : corbeille (restaurer, supprimer), signaler un
  problème, publier un planning, admin et comptes, questionnaire, notifier, création d'évènement. Elles sont
  affichées à part.
- **Rien n'est retiré automatiquement** : le bilan liste les candidates, Timothée décide une par une ; un retrait
  est un lot ordinaire (spec, go). Retirer d'abord du menu, observer un mois, puis supprimer le code.

## Découpage en tranches

Chaque tranche se teste sur les trois appareils (Playwright), sur un chant FR et un chant ZH quand elle touche la
page chant. Les tests interceptent `**/documents:commit` (`page.route`) avec `tests/helpers/fakeSession.ts` :
aucune vraie écriture.

**T1 — Le compteur et les écrans.** `src/lib/usage.ts` (`compter`, registre `CLES_USAGE`, envoi quotidien),
crochet de route dans le gabarit racine, `cmd.general.pwa`, règle `usage/{mois}` (à publier par Timothée).
Tests : ouvrir trois écrans, passer en arrière-plan → **un** commit, avec `increment` sur `ecran.…` et `_actif` ;
le corps ne contient ni uid ni courriel ni slug ; second passage le même jour → aucun commit ; envoi refusé
(route coupée) → les comptes restent et partent au passage suivant ; sans compte connecté → aucun commit, comptes
gardés ; une clé hors registre fait échouer un test unitaire du registre.

**T2 — Le dimanche** : commandes de la page chant, du mode louange et des setlists (lignes T2 de l'inventaire).
Tests : chaque commande, déclenchée une fois, apparaît dans le commit suivant avec `n = 1` ; mode louange compté
sans aucune animation ni délai ajoutés ; un chant FR et un chant ZH.

**T3 — Le reste** : planning, harmonie, compte, évènements, notifications, langue, thème (lignes T3).
Tests : un échantillon par domaine (une commande chacun), plus un test qui vérifie que chaque `compter("…")` du
code cite une clé du registre (grep dans le test).

**T4 — L'écran de lecture** `/back-office/usage` (après la question 4). Tests : avec deux mois simulés
(lectures interceptées), la liste suit le registre, une clé jamais utilisée apparaît à 0, le tri commence par la
moins utilisée, la marque « candidate » suit le seuil ; un membre non admin n'y accède pas ; `BACK_OFFICE` coupé →
écran absent. Agencement : regardé à l'œil sur les quatre dispositions ; spec ajoutée à `SPECS_GRAND_ECRAN`.

Ordre : T1 → T2 → T3 → T4. T1 et T2 suffisent pour que le comptage commence sur l'essentiel ; T4 n'est utile
qu'après quelques semaines de données.

## Questions à trancher (Timothée) — tranchées le 11/11/2026 : les six recommandations

1. **Visiteurs sans compte** : (a) **ne compter que les appareils où un compte est connecté** (les comptes faits
   avant connexion partent quand on se connecte) — *recommandé* : simple, aucune règle ouverte à tous ; (b) passer
   par une route API serveur pour compter aussi les visiteurs anonymes (une route de plus, ouverte au spam).
2. **Ventilation** : (a) **par disposition** (téléphone, tablette, ordinateur) seulement — *recommandé* : anonyme
   et utile pour le design ; (b) en plus par grand rôle (musicien / responsable-administrateur), pour juger par
   exemple l'export PDF des musiciens : avec deux ou trois administrateurs, un chiffre « administrateurs »
   désigne presque une personne ; (c) aucune ventilation.
3. **Seuil et durée** : *recommandé* trois mois avec douze dimanches et une fête, seuil « sous 1 % des
   jours-appareils et sous 4 par mois », liste d'exceptions ci-dessus. D'accord, ou autre chiffre ?
4. **Écran de lecture** : (a) **un simple tableau trié, sans planche** — *recommandé* : outil de bilan pour un
   administrateur, quelques fois par an ; (b) une planche d'abord (règle « Design » du CLAUDE.md), si tu veux un
   écran plus soigné (courbes par mois, par exemple).
5. **Phrase d'information** dans `/guide` (ou `/moi`) : la mettre — *recommandé* — ou non ?
6. **Qui lit** : administrateurs seulement — *recommandé* — ou aussi les responsables de louange ?

**Go pour le lot (T1 puis T2, T3, T4) ?** Le go de chaque tranche reste à donner ; T4 attend la réponse 4.

## Avancement

- 11/11/2026 — spec écrite (session dédiée, demande AP chantier 5), inventaire relevé par grep. Attend les
  réponses aux questions 1 à 6 et un go. Aucun code.
- 11/11/2026 — Timothée : « suis tes recommandations, go pour T1 ». Décisions : (1) appareils connectés seulement ;
  (2) ventilation par disposition seulement (téléphone, tablette, ordinateur : à ajouter en T1, champ
  `<clé>.d.<disposition>` en jours-appareils) ; (3) trois mois, douze dimanches, une fête, seuil « sous 1 % et
  sous 4 par mois » ; (4) tableau trié, sans planche ; (5) phrase d'information dans `/guide` ; (6) administrateurs
  seulement. T1 confiée à une session orchestratrice neuve (règle « Coder » du CLAUDE.md).
- 11/11/2026 — **T1 codée** (session orchestratrice, `/tranche`) : `src/lib/usageCles.ts` (registre `CLES_USAGE`,
  une clé `ecran.…` par page, `normaliserRoute`), `src/lib/usage.ts` (`compter`, `envoyerUsage` : un commit REST par
  jour et par appareil, `increment` sur `<clé>.n/.j/.d.<disposition>` et `_actif`, verrou entre onglets, délai de
  15 s), `src/components/UsageCompteur.tsx` monté dans `src/app/layout.tsx` (route, `cmd.general.pwa`, envoi au
  montage, à la connexion et au passage en arrière-plan), règle `usage/{mois}` dans `firestore.rules` + miroir
  `peutLireUsage` (`src/lib/access.ts`), phrase fr/中文 en fin de `/guide`, `tests/usage.spec.ts` (trois appareils).
  Disposition : seuils de `useDisposition` (ordinateur = deux volets, tablette ≥ 768 px). Reste faible : le test
  « clé hors registre » vérifie le registre en Node mais n'appelle pas `compter` dans la page. ⚠ La règle est à
  publier à la main par Timothée ; le comptage ne commence en ligne qu'après une mise en ligne sur `main`. Attend
  le go de T2.
- 11/11/2026 — Timothée : « Go » pour T2. **T2 codée** (même session orchestratrice, `/tranche`) : 47 clés `cmd.*`
  au registre (valeurs réelles : `cmd.louange.affichage.unique|played|structure`, `cmd.setlist.vue.liste|partitions`,
  `cmd.setlist.corbeille.mettre|restaurer|supprimer`), `compter()` posé dans les gestionnaires qui agissent (page
  chant, liste des chants, mode louange, setlists), aucun changement visible. Tests `tests/usage-dimanche.spec.ts` :
  15 commandes par l'interface (page chant sur un chant FR et un chant ZH), plus un test qui vérifie que chaque clé
  `cmd.…` du code est au registre et que chaque clé du registre est comptée quelque part. Relecture : comptes en
  trop corrigés (rôle rétabli par « Annuler », touche maintenue sur le cercle et le curseur de page, disposition
  déjà choisie). **Absentes du code, non comptées** : `cmd.chant.largeur` (pas de commande, seulement une mesure),
  `cmd.chant.partager` (pas de partage sur la page chant), « ajouter à une setlist » depuis la page chant (seul
  « Je joue » existe), « chant précédent » (seule la pastille « Suivant » existe). **Choix faits, à confirmer** :
  capo et transitions comptés dans le mode louange (seul endroit où ils existent) ; `cmd.chant.accord` compte aussi
  les accords touchés dans la vue Partitions et le dictionnaire ; `cmd.chant.copierParoles` compte aussi les copies
  de setlist ; `cmd.setlist.presentation` compte l'export FreeShow et l'enregistrement d'un lien ; une retouche
  简谱 en « ma version » compte `maVersion`, côté présidence `adapter` ; `modifierLigne` se compte une fois par
  rafale de saisie (3 s). Le test « vue Partitions » se saute en deux volets (pas de bascule). Attend le go de T3.
- 11/11/2026 — Timothée : « Go » pour T3. `/tranche` T3 lancée, arrêtée avant toute modification : limite de
  dépense mensuelle atteinte (aucun agent n'a tourné). Rien de T3 n'est codé ; à relancer telle quelle quand la
  limite le permet (consigne : lignes T3 de l'inventaire, règles de pose tirées de la relecture de T2, tests
  `tests/usage-reste.spec.ts` sur trois appareils).
- 11/11/2026 — T3 relancée après la remise à zéro de la limite, puis **mise en attente** (règle des trois chantiers
  décidée par Timothée ; ordre de reprise : « Ma partition », Harmonie, puis le comptage). Rien de T3 n'est commité ;
  reprise au début de T3 (même consigne), après `git pull --rebase`.
