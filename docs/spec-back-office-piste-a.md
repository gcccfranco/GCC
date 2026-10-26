# Spec — Back-Office, piste A : cinq entrées, un écran « À faire »

**Origine** : planche du 24/10/2026, https://claude.ai/artifact/TJ3c31CvYE9bMb9fWXZbTL (pistes A, B, C aux trois
tailles), écrite à partir du code et des écrans du back-office, pas des anciennes specs. Timothée, le même jour :
« est-ce qu'un dashboard est utile ? » puis **« Piste A, tranche les questions toi-même et code-la »** (go).
Les décisions ci-dessous sont donc prises par Claude sur délégation, datées, et rouvrables par Timothée.
**Rappel** : le back-office reste coupé en ligne (`BACK_OFFICE`) ; tout ce lot vit derrière l'interrupteur.

## 1. Décisions (24/10/2026)

| # | Décision |
| --- | --- |
| BO1 | **Cinq entrées**, dans cet ordre : **À faire**, **Calendrier**, **Planning**, **Équipes**, **Messages**. Sortent du menu : Tableau de bord (remplacé par À faire), Tâches et Réunions (dans la page de chaque équipe), Évènements (dans Calendrier), Statistiques (côté Chants, BO3), la page « Plus ». |
| BO2 | **Messages** (question 2 de la planche) : une entrée de la barre latérale, avec sa pastille de non-lus, sur tablette couchée et ordinateur. Sur téléphone et tablette debout, la barre du bas a **cinq onglets fixes** : À faire, Calendrier, Planning, Équipes, App ; Messages est une icône à pastille dans l'en-tête. « Personnaliser la barre » disparaît (le réglage enregistré est ignoré, pas effacé). |
| BO3 | **Statistiques** (question 3) : côté Chants, pour qui `canVoirStatistiques` — un bouton « Statistiques » dans l'en-tête de la liste des chants. L'adresse `/back-office/statistiques` ne change pas ; sa page gagne un retour « ‹ Chants ». |
| BO4 | **Un simple membre d'équipe** (question 4) n'a plus de Back-Office ni d'interrupteur App / Back-Office (`entreesBackOffice` ne lui rend rien). Il retrouve ses équipes dans **Moi › Mes équipes**, et chaque équipe ouvre sa page dans l'app, `/equipes/<id>` (mêmes sections que BO7, sans les actions de responsable). L'interrupteur reste pour les responsables (`estResponsable`). |
| BO5 | **Essai réel** (question 5) : on code d'abord ; puis Timothée fait essayer la piste A à 2 ou 3 responsables, une semaine, sur un aperçu Vercel interrupteur ouvert, avant de l'ouvrir en ligne. |
| BO6 | **À faire** remplace le tableau de bord à `/back-office` : **une seule liste**, une action par ligne, la plus urgente en premier. Groupes : « En retard », « Cette semaine », « Plus tard », « À lire ou à relier ». Sources (fonctions existantes de `src/lib/tableauDeBord/donnees.ts` et voisines, réunies par une fonction pure testée) : cases vides des plannings qu'on remplit avant leur publication (avec « qui relancer »), tâches de ses équipes (en retard d'abord, les siennes marquées), inscriptions qui ferment bientôt sur ses évènements, passages de scène vides, réunion passée sans compte rendu, signalements et propositions non lus, noms du planning sans compte (pour qui gère les comptes). Chaque ligne : icône, titre, une ligne de contexte, **un bouton au verbe précis** (« Remplir », « Fait », « Voir les inscrits », « Attribuer », « Écrire le compte rendu », « Lire », « Relier ») qui mène à l'endroit exact. Filtre « Tout · Mes équipes ». Rien à faire : **une phrase**, pas de cartes. À droite sur grand écran : « Ce dimanche » (qui sert) et « Prochaine réunion ». Les widgets, leur personnalisation et les raccourcis disparaissent ; les fonctions de données restent. |
| BO7 | **Équipes** : l'organigramme et Personnes comme aujourd'hui ; chaque équipe ouvre **sa page**, `/back-office/equipes/<id>` : Tâches (avec « Nouvelle tâche »), Réunions (prochaine, passées avec compte rendu, « Nouvelle réunion »), Membres. Les adresses `/back-office/taches/<équipe>` redirigent vers la page de l'équipe ; le détail d'une tâche et d'une réunion garde son adresse. « Planning sans compte » (`/back-office/planning/sans-compte`) passe dans Équipes › Personnes (section « Noms du planning sans compte ») ; son ancienne adresse redirige. Les pages d'équipe sont **neuves** (ni `/back-office/equipes/<id>` ni `/equipes/<id>` n'existent au 24/10). |
| BO8 | **Calendrier** absorbe Évènements et Réunions : vues Mois et Agenda, filtres (Tout, Évènements, Réunions, Services, Scène) ; **« Ajouter »** propose « Évènement » ou « Réunion », chacun **son** formulaire (`/back-office/evenements/nouveau`, `/back-office/reunions/nouvelle` : corrige G12 de l'audit et `agencement-v18-calendrier.spec.ts:170`). Les fiches d'évènement gardent leurs adresses ; la scène de Pâques et Noël s'ouvre depuis la fiche de la fête et depuis À faire, et par un lien « Scène des fêtes » dans l'en-tête du Calendrier pour la coordination. `/back-office/evenements` et `/back-office/reunions` redirigent vers l'Agenda filtré. |
| BO9 | **Plus de volet vide** : une mise en page en deux volets n'affiche le second que lorsqu'un élément est choisi ; sinon, la liste prend toute la largeur avec **un seul** message vide (Messages, et toute liste qui gardait ce motif). |
| BO10 | La note « les évènements de 2026 restent dans le Sheet » n'apparaît **qu'une fois**, dans le Calendrier, et plus du tout à partir du 1er janvier 2027 ; les entrées du Sheet portent une petite étiquette « Sheet ». |
| BO11 | Planning : l'aide clavier passe derrière un bouton « ? » (ordinateur) au lieu d'être toujours affichée ; le reste de la grille ne change pas. |
| BO12 | Textes : français tutoyé et 中文 pour chaque libellé neuf ; noms accessibles ; contrastes de l'audit ; aucune donnée nouvelle dans Firestore ; si une règle doit changer, `access.ts` et `firestore.rules` en double, et Timothée la publie. |

## 2. Tranches

| Tranche | Contenu | Tests |
| --- | --- | --- |
| BO-A | Navigation : nouvelle liste d'entrées (`src/types/backOffice.ts`, `entreesBackOffice`, `widgetsPermis` retiré ou réduit), barre latérale, barre du bas fixe à cinq onglets et icône Messages (BO2), fin de « Personnaliser la barre » et de la page Plus (redirection), interrupteur réservé aux responsables (BO4), redirections des anciennes adresses. | `barre-back-office`, `back-office-espace`, `back-office-admin`, `back-office-coupe`, `navigation-grand-ecran` repris ; cinq projets |
| BO-B | À faire (BO6) : fonction pure d'agrégation + ses tests, la page, la colonne « Ce dimanche », l'état vide. Remplace le tableau de bord et ses widgets (composants retirés à la fin de la tranche). | nouvelle spec `a-faire.spec.ts` (cinq projets) ; `tableau-de-bord.spec.ts`, `calendrier-widget.spec.ts` et les specs de widgets **remplacées par des assertions équivalentes sur À faire**, jamais simplement supprimées |
| BO-C | Calendrier (BO8, BO10) : « Ajouter » à deux choix, filtres, redirections, note du Sheet. | `calendrier*.spec`, `evenements*.spec`, `reunions-back-office`, `agencement-v18-calendrier`, `-t2a`, `-t2b` |
| BO-D | Équipes (BO7, BO4) : page d'une équipe dans le back-office et dans l'app, Moi › Mes équipes qui y mène, « sans compte » dans Personnes. | `equipes*.spec`, `equipes-taches`, `equipes-reunions`, `acces-moi`, `taches` |
| BO-E | BO9 (volets), BO11 (aide clavier), BO3 (Statistiques côté Chants), nettoyage du code mort laissé par BO-A à BO-D, traductions. | `statistiques`, `planning-clavier`, `pages-en-grand-*` concernées |
| BO-F | Vérification d'ensemble : suite complète, banc `scripts/rude-epreuve` (crawl sur le serveur du back-office, captures aux cinq dispositions, FR / 中文, clair / sombre), `regard` puis la session sur les captures, comparaison avec la planche. | suite complète verte |

## 3. Qui code

Le lot s'ajoute au **flux B « surface »** (session orchestratrice déjà en cours, `spec-corrections-audit.md` § 4), **après
B6** : c'est lui qui possède les pages et composants touchés, ce qui évite trois sessions dans les mêmes fichiers. Pour
ce lot, le flux B prend aussi `src/types/backOffice.ts`, `src/lib/tableauDeBord/**` et, dans `src/lib/access.ts`,
`entreesBackOffice`, `widgetsPermis` et leurs voisines de menu ; le flux A n'y touche pas. Le § 4 bis de
`spec-corrections-audit.md` (ne pas réorganiser le back-office) est levé **pour ce lot**.

## 4. Avancement

| Tranche | État | Commit |
| --- | --- | --- |
| — | spec écrite le 24/10/2026 ; confiée au flux B après B6 | — |
| BO-A | fait (flux B) : entrées À faire (`/back-office`, encore le tableau de bord jusqu'à BO-B), Calendrier, Planning, Équipes, Messages ; `droitsDesPages` (access.ts) garde les anciens droits des pages Tâches, Évènements, Réunions pour les widgets, raccourcis et la fiche d'évènement ; barre du bas fixe (onglets permis + App), icône Messages à pastille dans l'en-tête (téléphone, tablette debout) ; « Personnaliser la barre » et la page Plus retirées (réglage `barreDuBas` ignoré, pas effacé ; `/back-office/plus` redirige) ; BO4 : un non-responsable n'a ni interrupteur ni back-office. Tests repris : barre-back-office, back-office-espace (cinq projets), back-office-admin, agencement-v18-t2a et sept specs d'accès ; 2544 verts sur les specs voisines | `047f620` |
| BO-A bis | fait : les dix specs de l'ancienne navigation que BO-A n'avait pas relancées, remises sur la nouvelle (BO4, BO1, BO2, BO9) ; `PublishPlanningPanel` sous `t()`, FR inchangé et 中文 ; captures du guide déjà refaites sans vrai nom (B6b) | `4e66a79` |
| BO-B | fait : écran « À faire » (BO6), fonction pure `aFaire` (cases vides avec qui relancer, tâches, inscriptions, scène, compte rendu manquant, messages, noms sans compte), quatre groupes, filtre « Tout · Mes équipes », verbe précis par ligne, colonne « Ce dimanche » ; pastille de l'entrée ; widgets, personnalisation et raccourcis retirés ; specs de widgets converties en assertions sur À faire | `239ab39` |
| BO-C | fait : le Calendrier absorbe Évènements et Réunions (BO8) : filtre Tout · Évènements · Réunions · Services · Scène, « Ajouter » à choix, « Scène des fêtes » pour la coordination, anciennes adresses redirigées ; BO10 : note du Sheet seulement ici et plus rien à partir du 01/01/2027, étiquette « Sheet » | `eaeb6b2` |
| BO-D | fait : page de chaque équipe (BO7), `/back-office/equipes/<id>` et `/equipes/<id>` (BO4), composant partagé `PageEquipe` (Tâches, Réunions, Membres) ; `peutVoirEquipe` (affichage seulement, règles inchangées) ; redirections des tâches ; « Planning sans compte » en sous-page de Personnes ; Moi › Mes équipes | `2dea05b` |
| BO-E1 | fait : BO3 (bouton Statistiques dans l'en-tête de Chants, « ‹ Chants »), BO9 (Réception et Questionnaire sans volet vide), BO11 (aide clavier du planning derrière « ? ») ; textes `backOffice.boE1.*` fr / 中文 | `02a9e3d` |
| BO-E2 | fait : back-office-admin remis sur la nouvelle organisation ; code mort retiré (`ecrireBarreDuBas`, `ecrireTableauDeBord`, `ApercuEquipes`, 119 clés fr / 114 中文) ; BO9 pour Personnes et Tâches ; zones de toucher de 44 px | `92af5d8` |
| BO-G | fait : finitions après le regard des captures (17 points) : largeur commune `LargeurBO`, filtres du Calendrier, « Ajouter » Évènement · Réunion · Tâche, organigramme, sans compte, barre réduite en icônes, dates 中文, Moi au back-office, en-tête « GCC Back-Office », rails à 44 px ; le point 18 non reproduit (test ajouté) | `d14145f` |
| BO-F (BO-F2) | suite complète sur `d14145f` en 4 morceaux, par projet ; relecture de fin en trois angles (spec, dépôt public et droits, back-office coupé) : aucun bloquant, `firestore.rules` inchangé, aucun vrai nom ; correction des rouges : _à compléter_ | _à compléter_ |

### Laissés (fin du lot, 26/10/2026)

- **Antérieurs au lot** : colonnes de la grille du planning ; CLS du planning.
- **À trancher par Timothée** : les absences en conflit de l'ancien widget Plannings ne sont pas reprises dans « À faire » (hors BO6).
- **Gardés exprès** : `src/lib/tableauDeBord/{disposition,colonnes,reglages}.ts`, que cinq specs importent encore.
- **Écart de forme** : les réunions de la page d'équipe sont des lignes à chevron, pas les boutons de la planche.
- **Écarts voulus, absents des décisions** : « Ajouter » propose aussi « Tâche » (BO8 n'en citait que deux) ; « sans compte » est une sous-page de Personnes, pas une section (BO7), pour ne pas faire défiler Personnes.
- **Vus par BO-G, hors consigne** : à 1 440 px, la 4e colonne d'Équipes déborde en fondu ; en 中文 à 1 440 px, la carte du volet du jour du Calendrier dépasse la marge d'environ 20 px ; Statistiques : retour « ‹ Chants » sans entrée de menu active ; téléphone, À faire : un titre long se coupe tôt à côté de « Écrire le compte rendu ».
- **Relecture de fin, mineurs** : dans « À faire », une tâche mène à la page de l'équipe, pas à la tâche ; « Nouvelle réunion » depuis la page d'une équipe ne transmet pas l'équipe ; code mort restant (`src/lib/firebase/backOffice.ts` plus importé, branches de `VoletsGestion` que les redirections rendent inatteignables, une trentaine de clés de traduction orphelines) ; `back-office-coupe` ne liste pas `/back-office/equipes/personnes/sans-compte`, `/back-office/plus` ni `/equipes/louange` (code bien gardé).
- **Seul changement visible en ligne**, voulu : « Publier un trimestre » (/notifier) s'affiche en 中文 pour un visiteur en chinois.
- **Essai réel (BO5)** : à faire par Timothée, avec 2 ou 3 responsables, sur un aperçu Vercel interrupteur ouvert, avant toute ouverture en ligne.

### Relais (25/10/2026, après BO-A) — pour la session neuve qui fait BO-B à BO-F (historique : tout est repris par les tranches ci-dessus)

- **Reste** : BO-B (À faire), BO-C (Calendrier), BO-D (Équipes, et page d'équipe dans l'app pour un simple membre), BO-E, BO-F, selon le § 2. Méthode : `/tranche` par tranche (`.claude/workflows/tranche.js`), un commit par tranche, une ligne par tranche à la session principale.
- **Perdu par un simple membre d'équipe entre BO-A et BO-D** : `/back-office/taches` et `/back-office/reunions` (garde « Réservé aux responsables »), le lien de `SectionTaches` vers le back-office, la redirection d'une réunion vers sa fiche du back-office ; il garde `/taches` et `/evenements/<id>` dans l'app. BO-D le lui rend par Moi › Mes équipes.
- **Laissé par BO-A** : la page `/back-office` s'intitule encore « Tableau de bord » (BO-B) ; la pastille Tâches revient avec À faire (BO-B) ; pastille Messages visible seulement sur la barre latérale dépliée ; code mort pour BO-E : `ecrireBarreDuBas` (`src/lib/firebase/backOffice.ts`), clés `backOffice.barre.*` (sauf `app`, `appAria`, `messagesNonLus`), `backOffice.plus.*`, `entrees.tableau` ; `barre-back-office.spec.ts` n'est pas dans `SPECS_GRAND_ECRAN` (son commentaire le dit à tort ; les cas grand écran sont dans `back-office-espace`).
- **Specs pas relancées après BO-A**, qui touchent l'ancienne navigation (Plus, Personnaliser, menu Tâches ou Statistiques) : `agencement-v18-regles` (ouvre `/back-office/plus`, l. 74), `equipes-agencement`, `equipes-migration`, `halo-partout`, `look-navigation`, `tableau-de-bord`, `agencement-v18-fondations`, `agencement-v18-t6`, `agencement-v18-taches`, `pages-en-grand-taches`, `retouches-v18-pilules-stats`. À lancer au début de BO-B et à mettre à jour.
- **Captures de BO-A non regardées** (effacées par un passage suivant) : BO-F les refait aux cinq dispositions, FR / 中文, clair / sombre, et les compare à la planche.
- **Deux points de la relecture de fin, pas encore faits** (fichiers du flux B) : (1) `public/guide/planning.png` et `services.png` montrent un vrai nom tiré du repli de `src/lib/planning/data.ts` (`CULTE_FALLBACK`) : simuler le planning avec des noms inventés dans `tests/guide-captures.spec.ts`, refaire ces captures (`GUIDE_CAPTURES=1 npx playwright test tests/guide-captures.spec.ts --project=ordinateur`), puis regarder les 13 PNG du guide (aucun nom de `data.ts`) ; (2) `src/components/planning/PublishPlanningPanel.tsx` en français en dur (libellés, « Échec. », « Échec — vérifie ta connexion. », vers l. 161 et 165), alors que /notifier est en ligne : sous `t()`, FR et 中文.
- Un run de toute la suite sur cinq projets sature le conteneur : lancer par projet, trois workers au plus.

