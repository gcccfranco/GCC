# Spec : chantier Setlist

Chantier n° 4 de `docs/intent/vision-site.md` (« Ordre des chantiers »).
Réalisation choisie par Timothée le 14/09/2026. **Capo mis en attente** le même
jour : Timothée demande d'abord des informations à l'équipe.

## Objectif

Les responsables préparent ou modifient une setlist sur téléphone, tablette ou
ordinateur. Trois changements :

1. **Page unique** : l'assistant en 3 étapes devient une seule page, enregistrée
   automatiquement.
2. **Historique des modifications** : tout le monde voit qui a changé quoi, et quand.
3. **Tonalité recommandée** : la tonalité la plus chantée à Grace Church est
   inscrite dans le chant et affichée par défaut.

## Ce que le code montre (14/09/2026)

- **Éditeur** (`src/components/setlists/SetlistForm.tsx`) : 3 étapes animées
  (Infos, Chants, Révision), barre du bas Retour / Suivant / Créer. En création,
  un brouillon invisible (`isDraft`) est enregistré 4 s après chaque changement,
  et « Créer » le publie. En modification, rien n'est enregistré avant le bouton.
  La notification « setlist prête » part à chaque enregistrement ; le serveur ne
  l'envoie qu'une fois, quand la setlist a au moins 4 chants.
- **Écritures d'une setlist** : l'éditeur, et le mode « Adapter » de la page
  setlist (`persistOverride`, accords et paroles adaptés). Le lien de
  présentation passe par le serveur et n'est pas une modification (spec Régie).
- **Historique** : rien. La setlist n'a qu'une date `updatedAt` (cloche).
- **Tonalités** : un chant n'a que `{key: …}`. Les setlists enregistrent la
  tonalité jouée (`keyOverride`, `null` = originale). Sur 92 setlists publiées
  (24/05 → 20/09/2026), 32 chants ont une tonalité la plus jouée différente de
  l'originale : liste dans `docs/tonalites-recommandees.md`.

## Ce qui est construit

### 1. Page unique

- **Une seule page** : infos en haut (titre, catégorie, présidence, date,
  visibilité, notes), chants en dessous (recherche, liste, transitions,
  fusion). Plus d'étapes, plus de récapitulatif, plus de « Suivant ».
- **Création** : le brouillon s'enregistre tout seul (dès qu'il y a un titre et
  une catégorie), un seul bouton **« Publier »**. Publier ouvre la setlist, comme
  aujourd'hui « Créer ».
- **Modification** : chaque changement est enregistré **~2 s après**, sans
  bouton. Un repère dit « Enregistrement… » puis « Enregistré ». Un bouton
  « Terminé » ramène à la setlist (en terminant l'enregistrement en cours).
- **Champ obligatoire vidé** (titre, date, présidence, catégorie) : rien n'est
  enregistré et le repère dit ce qui manque.
- **Quitter la page** avec un changement pas encore parti : il est envoyé quand
  même ; fermer l'onglet pendant un enregistrement demande confirmation.
- **Notification « setlist prête »** : en création, à « Publier » ; en
  modification, en quittant l'éditeur (plus à chaque enregistrement, sinon
  l'équipe serait prévenue dès le 4e chant ajouté, avant la fin).
- Le style reste celui d'aujourd'hui : le nouveau look est le chantier 5.

### 2. Historique des modifications

- **Enregistré à chaque écriture** : éditeur (modification et publication) et
  mode « Adapter ». Pas pendant le brouillon ; la publication écrit « a créé la
  setlist ».
- **Une entrée par passage** : les changements d'une même personne à moins de
  15 min d'écart forment une seule entrée (qui, quand, puis ses phrases). Les
  phrases comparent l'état **avant le passage** à l'état actuel : un changement
  annulé dans le même passage disparaît.
- **Phrases** :
  - en détail : chant ajouté ou retiré, ordre des chants, tonalité
    (« Tonalité de Ma passion : G → A »), titre, date, présidence, catégorie,
    visibilité, notes de la setlist, chants fusionnés ou séparés, transitions
    entre chants ;
  - une phrase par sorte de réglage d'un chant : structure, notes de section,
    transitions de section, nuances, 升调, note du chant, accords adaptés,
    partition 简谱 ou paroles.
- **Nom affiché** : le nom du planning du profil (« Ruth K. »), sinon prénom +
  initiale, sinon « Quelqu'un ».
- **Où** : une ligne sous le titre de la setlist, « Modifiée par Ruth K. il y a
  2 h ». Un appui ouvre une feuille : la dernière entrée, puis « Voir plus »
  (5 dernières), puis « Tout voir ». Consultation seulement. Français et 中文.
- **Stockage** : sous-collection `setlists/{id}/history` (auteur, date,
  phrases). Un passage qui rejoint une entrée fusionne ses phrases avec les
  siennes (voir « Précisions de réalisation »).
- **Permissions** : lecture par tout connecté (comme les setlists) ; écriture
  par qui peut modifier la setlist, sous son propre nom, sur ses propres entrées
  seulement. `firestore.rules` **à publier dans la console** ; tant que ce n'est
  pas fait, l'historique ne s'écrit pas, mais l'enregistrement de la setlist
  n'échoue jamais à cause de lui.
- **Pas d'historique antérieur** : il commence à la mise en ligne.

### 3. Tonalité recommandée

- **Liste** : `docs/tonalites-recommandees.md`, recalculable par
  `npx tsx scripts/recommended-keys.ts` (lecture seule). Timothée corrige la
  colonne « Décision » ; les « oui » sont inscrits dans les chants par
  `{recommended_key: D}`, puis se changent à la main.
- **Page du chant** : démarre dans la recommandée ; le sélecteur marque
  « (orig.) » et « (reco.) » ; le bouton de retour ramène à la
  recommandée. Ouverte depuis une setlist : tonalité de la setlist, comme
  aujourd'hui.
- **Liste des chants** et recherche de l'éditeur : affichent la recommandée.
- **Éditeur de setlist** : un chant ajouté démarre dans la recommandée. Les
  setlists existantes ne changent pas.
- `npm run validate` vérifie la tonalité recommandée.

### En attente

- **Capo conseillé** (page du chant, setlist, mode louange) : stand-by, décision
  de Timothée du 14/09/2026.

## Hypothèses

1. Les entrées d'historique d'une setlist supprimée restent en base, invisibles.
2. Deux personnes qui modifient la même setlist en même temps : le dernier
   enregistrement gagne, comme aujourd'hui (plus fréquent avec l'enregistrement
   automatique). Hors lot.
3. Le lien d'un chant fusionné, qui n'emporte pas la tonalité de la setlist,
   ouvrira la page du chant dans la recommandée au lieu de l'originale.

## Découpage

| Lot | Contenu | Fichiers principaux | Vérification |
| --- | --- | --- | --- |
| 1 | Page unique | `SetlistForm.tsx`, locales | tests création (Publier) et modification (enregistrement auto, champ vidé, Terminé) |
| 2 | Historique | `src/lib/setlist/history.ts`, `SetlistForm.tsx`, `SetlistDetailClient.tsx`, `firestore.rules`, locales | tests : phrases d'un passage, regroupement, feuille sur la setlist, FR + 中文 |
| 3 | Tonalité recommandée | `parser.ts`, `loadSongs.ts`, types, `validate-songs.ts`, `SongDetailClient.tsx`, `SongListClient.tsx`, `SetlistForm*.tsx`, `.cho` validés | **arrêt** : liste validée par Timothée ; tests page chant FR + ZH, ajout à une setlist |

Chaque lot : test écrit d'abord et vu en échec, captures regardées sur les trois
appareils. Commit sur demande seulement, un par lot.

## Avancement (14/09/2026)

| Lot | État |
| --- | --- |
| 1. Page unique | Fait. `tests/setlist-editor.spec.ts` (6 tests × 3 appareils, dont « Publier » sur réseau lent et la sortie sans « Terminé »), captures regardées. |
| 2. Historique | Fait. `tests/setlist-history.spec.ts` (11 tests × 3 appareils, dont le mode Adapter, l'éditeur resté ouvert et le 中文), captures regardées. **`firestore.rules` à publier dans la console** avant la mise en ligne. |
| 3. Tonalité recommandée | Fait. Liste validée telle quelle par Timothée : **15 chants** inscrits (voir ci-dessous). `tests/recommended-key.spec.ts` (8 tests × 3 appareils) ; `tests/key-selector.spec.ts` adapté. |

Précisions de réalisation :

- **Page unique** : le repère d'enregistrement et le bouton principal
  (« Publier » / « Terminé ») sont dans la barre du bas, visible aussi sur
  téléphone ; l'erreur de publication s'y affiche. La flèche du haut, en
  modification, fait comme « Terminé ». L'enregistrement du brouillon passe
  de 4 s à 2 s. Les champs de l'éditeur ont maintenant un libellé relié
  (lecteurs d'écran), les sélecteurs de tonalité un nom (« Tonalité de … »).
- **Historique** : chaque passage compare l'état de départ et l'état actuel
  **écrits dans le même format** (l'éditeur réécrit le format des réglages en
  relisant une setlist : comparer au document brut ferait de fausses phrases).
  Les entrées ne gardent donc pas d'instantané : un passage qui rejoint une
  entrée fusionne ses phrases avec les siennes (ajout puis retrait
  s'annulent, « G → A » puis « A → B » donne « G → B »). La feuille : boutons
  « Voir plus » / « Tout voir » pleine largeur (cible au doigt).
- **Nom affiché** : écrit par le client ; les règles vérifient l'auteur
  (`authorUid`), pas le nom. Acceptable pour un outil interne.
- **Tonalité recommandée** : directive `{recommended_key: D}` (validée par
  `npm run validate` : tonalité valide, différente de `{key}`). Libellé
  « D (reco.) » dans le sélecteur, à côté de « Eb (orig.) » (« recommandée »
  en entier était coupé sur téléphone). L'originale reste dans le sélecteur
  même quand elle s'écrit autrement (C#, G#). Bouton de retour : « Revenir à
  la tonalité recommandée ».
- **Liste recalculée** : l'index des chants était périmé (29/08). *Ouvre les
  yeux de mon cœur*, proposé « C → E », est en réalité déjà en E dans son
  fichier : retiré du calcul, rien à inscrire. 15 chants au lieu de 16.
- **Textes 中文 ajoutés** (historique, enregistrement, 推荐) : à relire par un
  sinophone.

Corrigé après la revue (standards + spec, 14/09/2026) :

- **« Publier » juste après une retouche, sur réseau lent** : l'enregistrement
  du brouillon pouvait repasser la setlist publiée en brouillon (invisible).
  Les brouillons s'enregistrent maintenant l'un après l'autre et « Publier »
  attend celui en cours puis arrête les suivants. Défaut antérieur, aggravé par
  le délai de 2 s.
- **Éditeur resté ouvert** : une retouche plus de 15 min après la précédente
  ouvre une nouvelle entrée (l'entrée était gardée jusqu'à la sortie).
- **Mode Adapter** : les adaptations successives depuis la page forment un seul
  passage tant que personne d'autre n'a touché la setlist ; adapter puis
  rétablir ne laisse plus de phrase.
- **Règles** : l'historique d'une setlist privée ne s'écrit que par son
  propriétaire (miroir exact de `canEditSetlist`).
- **Nom affiché** : plus de repli sur le début de l'adresse email ; « Quelqu'un »
  si le profil n'a ni nom de planning ni prénom.
- L'heure d'une entrée vient de l'appareil (non vérifiée par les règles) : le
  regroupement dépend des horloges. Accepté.

Remarqué, sans y toucher :

- Dans l'éditeur, la liste de recherche des chants s'intercale entre les infos
  et les chants déjà choisis (ordre repris de l'ancienne étape « Chants ») ; à
  revoir avec le nouveau look (chantier 5).
- Textes inutilisés déjà avant ce chantier : `setlists.form.publishButton`,
  `saveDraftButton`, `draftButton`, `draftSaving` (non supprimés). Ceux rendus
  inutilisés par ce chantier (`createButton`, `creating`, `saveButton`,
  `saving`) sont supprimés, ainsi que l'animation d'étape `.wiz-*`.
- Page du chant : pendant l'hydratation, un chant à tonalité recommandée
  s'affiche un instant dans l'originale (comme un lien de setlist avec `key`
  aujourd'hui).

## Commandes

```bash
npx tsc --noEmit
npm run lint
npm run validate
npm test -- tests/setlist-editor.spec.ts
npm test            # suite complète avant de rendre la main
```

## Tests (Playwright, trois appareils)

Session et Firestore simulés (`tests/helpers/fakeSession.ts`), écritures
interceptées et lues dans le test : **aucune écriture en production**.

## Limites

- Toujours : un chant FR + un chant ZH ; captures regardées ; tests sur
  ordinateur, téléphone et tablette.
- Demander avant : toute retouche du style d'ensemble (chantier 5), tout
  changement des permissions au-delà de l'historique, l'inscription des
  tonalités recommandées non validées.
- Jamais : écriture dans le Firestore de production ; changement des couleurs
  gelées ; retour à une version précédente (consultation seulement).

## Critères de réussite

- Nouvelle setlist : aucune étape ; « Publier » la rend visible.
- Setlist ouverte en modification : passer Ma passion de G à A l'enregistre sans
  bouton ; la page de la setlist affiche « Modifiée par … » et la feuille dit
  « Tonalité de Ma passion : G → A ».
- Trois retouches en 5 min par la même personne : une seule entrée.
- Je reviens au cœur : page du chant en D, « Eb (orig.) » et « D (reco.) » dans
  le sélecteur ; ajouté à une setlist, il démarre en D.
