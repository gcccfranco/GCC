# Spec : période d'inscription d'un évènement

Demande de Timothée, 17/09/2026 (en testant l'onglet Évènements) :

> « La date de fin ici c'est la date de fin d'inscription ou de l'évènement ?
> Il faudrait aussi pouvoir faire une date de début et de fin d'inscription qui
> ouvrent ou ferment automatiquement les inscriptions. Et laisser la
> possibilité au responsable de forcer l'ouverture des inscriptions. D'ailleurs
> je ne sais pas pourquoi même en ayant coché « inscriptions ouvertes » ça me
> marque quand même inscriptions fermées et je ne peux pas m'inscrire. »

Statut : **go donné le 17/09/2026 ; P1 à P4 codées le jour même, test d'abord, trois appareils (voir « Avancement »), non commité, à valider en local.**

## Ce que le code montre (17/09/2026)

- « Date de fin » et « Heure de fin » du formulaire sont la **fin de
  l'évènement** (camp, retraite), pas celle des inscriptions.
- Les inscriptions se ferment **toutes seules au début de l'évènement**
  (`aCommence`, lot 6 : « fermeture automatique au début »), quel que soit
  l'interrupteur « Inscriptions ouvertes », qui ne sert qu'à fermer plus tôt.
- Cas de Timothée, lu dans la base : évènement « lqkfjlk », le 17/09/2026 à
  14:37, consulté à 14:42 : il avait commencé, donc fermé. **Rien à l'écran ne
  dit pourquoi**, d'où la confusion.
- Le refus est calculé par `refusInscription` (`lib/evenements/agenda.ts`),
  partagé par la page et la route serveur `/api/evenements/inscription` : une
  seule règle à changer pour les deux.
- `firestore.rules` : la modification d'un évènement ne contrôle pas ses
  champs ; aucune règle à publier.

## Décisions (questions du 17/09/2026, recommandations acceptées sauf Q4)

| # | Décision |
| --- | --- |
| Q1 | « Forcer l'ouverture » : inscriptions ouvertes **hors dates et même après le début**, mais le **nombre de places tient** (« Complet » bloque encore). |
| Q2 | Sans date de fin d'inscription : fermeture **au début de l'évènement** (comme aujourd'hui). |
| Q3 | Dates d'inscription : **jour obligatoire, heure facultative** (sans heure : ouverture à 00:00, fin à 23:59). |
| Q4 | **Prévenir les membres** le jour où les inscriptions s'ouvrent, **dans le rappel du jour** (notification du matin, pas à l'heure exacte). |

## Objectif

1. Le responsable choisit **quand** on peut s'inscrire : ouverture et fin
   d'inscription, ou rien (dès maintenant jusqu'au début de l'évènement).
2. Il peut **forcer** : « Ouvertes » (hors dates, places respectées) ou
   « Fermées ».
3. **La page dit toujours pourquoi** on ne peut pas s'inscrire.
4. Les membres concernés sont **prévenus le matin** du jour d'ouverture.

Réussite : un évènement dont les inscriptions ouvrent le 1er octobre à 10:00
refuse une inscription le 30 septembre (page et serveur) et l'accepte le 1er à
10:00 ; un évènement commencé en mode « Ouvertes » accepte encore une
inscription tant qu'il reste des places ; chaque refus est expliqué ; le
matin du 1er octobre, les membres qui voient l'évènement reçoivent la ligne
« Inscriptions ouvertes ».

## Modèle

`evenements/{id}` gagne trois champs :

| Champ | Valeurs | Défaut |
| --- | --- | --- |
| `inscriptions` | `"auto"` · `"ouvertes"` · `"fermees"` | `"auto"` |
| `inscriptionDebut` | `""` · `"AAAA-MM-JJ"` · `"AAAA-MM-JJTHH:MM"` | `""` = dès la publication |
| `inscriptionFin` | idem | `""` = au début de l'évènement |

- **Compatibilité** : un évènement sans `inscriptions` se lit
  `inscriptionOuverte ? "auto" : "fermees"`. `inscriptionOuverte` n'est plus
  écrit ; aucune migration.
- **Règle unique** (`agenda.ts`), dans l'ordre :
  1. info ou réunion de pôle → pas d'inscription ;
  2. `fermees` → **fermées par le responsable** ;
  3. places dépassées → **complet** ;
  4. `ouvertes` → ouvertes ;
  5. `auto` : avant `inscriptionDebut` → **pas encore** (« à partir du … ») ;
     après `inscriptionFin` (23:59 sans heure) → **terminées** (« closes
     le … ») ; sans fin, après le début de l'évènement → **l'évènement a
     commencé** ; sinon ouvertes.
- Désinscription : inchangée (jusqu'au début de l'évènement).

## Ce qui sera construit — quatre tranches

### P1 — Règle et serveur
- `types/evenement.ts`, `lib/firebase/evenements.ts` (lecture compatible,
  écriture des trois champs), `lib/evenements/agenda.ts` (`etatInscriptions`,
  `refusInscription` étendu), route `inscription` (messages des nouveaux refus,
  FR / 中文).

### P2 — Formulaire
- Bloc « Inscriptions » : choix **Automatique · Ouvertes · Fermées** (remplace
  l'interrupteur) ; en Automatique, « Ouverture des inscriptions » et « Fin des
  inscriptions » (date + heure facultative), aides « Vide : dès la
  publication » / « Vide : au début de l'évènement ».
- « Date de fin » → **« Fin de l'évènement (date) »**, « Heure de fin » →
  **« Fin de l'évènement (heure) »**.

### P3 — Affichage
- Fiche : la raison sous le bouton ou à sa place : « Inscriptions à partir du
  jeudi 1 octobre à 10:00 », « Inscriptions closes le … », « Inscriptions
  fermées : l'évènement a commencé », « Inscriptions fermées par
  l'organisateur ».
- Panneau de l'organisateur : état calculé (Ouvertes · Bientôt · Fermées) et
  sa raison ; le choix Automatique · Ouvertes · Fermées remplace « Fermer /
  Ouvrir les inscriptions ».
- Carte de la liste : « Inscriptions à partir du 1 oct. » à la place de
  « S'inscrire » quand elles ne sont pas encore ouvertes.

### P4 — Rappel du jour
- `cron/reminders` : les évènements dont `inscriptionDebut` tombe aujourd'hui
  (mode Automatique) ajoutent « Inscriptions ouvertes : titre (dès 10:00) » au
  message du matin de chaque membre qui voit l'évènement et a la préférence
  « Évènements » ; sans autre rappel ce jour-là, notification seule ;
  anti-doublon par évènement ; FR / 中文.

## Tests (Playwright, `tests/evenements.spec.ts`, trois appareils)

- Règle : pas encore / ouvertes / terminées / commencé / forcées ouvertes après
  le début / forcées fermées / complet même forcé / compatibilité
  `inscriptionOuverte` ; heure absente = 00:00 et 23:59.
- Route : refus « pas encore » et « terminées » ; acceptation forcée après le
  début.
- Formulaire : choix et dates écrits ; libellés « Fin de l'évènement ».
- Fiche, panneau, carte : chaque raison affichée ; changer le mode dans le
  panneau.
- Rappel : ligne ajoutée le jour d'ouverture, rien la veille ni le lendemain,
  pas deux fois ; langue du destinataire.

## Limites

- Toujours : une seule règle pour la page et le serveur ; FR + 中文 ; trois
  appareils.
- Demander avant : notifier à l'heure exacte (tâche planifiée en plus) ; une
  liste d'attente quand c'est complet.
- Jamais : ignorer le nombre de places, même forcé.

## Commandes

```bash
npm test -- tests/evenements.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement (17/09/2026)

| Tranche | Construit | Tests |
| --- | --- | --- |
| P1 | `ModeInscriptions`, `inscriptionDebut`, `inscriptionFin` (facultatifs) dans `types/evenement.ts` ; `modeInscriptions`, `borneInscription`, `refusInscription` (refus `pasEncore`, `terminee`) dans `agenda.ts` ; lecture compatible dans `firebase/evenements.ts` ; messages du serveur | 4 tests de règle |
| P2 | `EvenementForm` : réglage Automatique · Ouvertes · Fermées, « Ouverture des inscriptions » et « Fin des inscriptions » (jour + heure facultative, aides), refus d'une fin avant l'ouverture, dates effacées hors automatique ; « Fin de l'évènement (date / heure) » ; duplication sans les dates d'inscription | 2 tests + 5 adaptés (création, info, réunion de pôle, L4, L6) |
| P3 | `ChoixInscriptions` et `useRaisonInscription` (nouveau fichier partagé) ; raison sur la fiche (aussi sans compte), la carte (« Inscriptions à partir du 5 oct. à 10:00 ») et le panneau (état Ouvertes · Bientôt · Fermées, réglage à la place de « Fermer / Ouvrir ») | 4 tests + 3 adaptés |
| P4 | `ouvertureDuJour`, `ligneOuverture`, `ouverturesTitre`, `avecLignes` (`rappel.ts`) ; `destinatairesEvenement` mis en commun (`evenements/serveur.ts`, repris par `notify-evenement`) ; cron : ligne ajoutée au message de service ou de tâches du jour, sinon notification seule, anti-doublon `ouverture-inscriptions-<id>` | 2 tests (fonctions pures) |

Écarts :
- Les messages de refus du serveur restent en français, comme les autres
  messages de la route : la page vérifie la même règle avant d'envoyer, ils
  n'apparaissent qu'en cas de course.
- Route et cron non testés de bout en bout (Firebase Admin absent des tests,
  comme pour les rappels existants) : leurs règles et messages le sont.
- Le forçage « Ouvertes » n'autorise pas la désinscription après le début
  (inchangée).
