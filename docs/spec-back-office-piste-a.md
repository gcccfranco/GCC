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
