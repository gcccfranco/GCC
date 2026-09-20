# Spec : lot 11 — inscription externe (Google Forms) sur un évènement

Demande de Christelle, WhatsApp du 18/09/2026, à propos des inscriptions aux
cours de théologie :

> « on pourra aussi s'inscrire via l'onglet évènement mais c'est ce que je
> trouvais que c'était mieux de pouvoir mettre un lien cliquable vers google
> forms ou sheets »
>
> « y'a un QR code que tu peux mettre sur les affiches »

Statut : **spec écrite le 18/09/2026, rien n'est codé, en attente du go de
Timothée.**

## Ce que le code montre (18/09/2026)

- Un évènement n'a aujourd'hui **aucun champ de lien d'inscription**.
  `types/evenement.ts` porte `liens` (ligne 32), `placesMax` (36),
  `inscriptions` / `inscriptionDebut` / `inscriptionFin` (41 à 45),
  `sansCompte` (49) et `inscrits` (58, « tenu par le serveur seulement »).
- `liens` n'est pas le bon endroit : c'est une **liste d'informations**, rendue
  en petits liens sous la description (`EvenementClient.tsx` lignes 105 à 111).
  Le lien d'inscription, lui, commande le **grand bouton**.
- Le grand bouton est `Inscriptions.tsx` ligne 141
  (`<Button size="lg" className="w-full">S'inscrire</Button>`) ; il ouvre le
  choix des invités, puis `/api/evenements/inscription`.
- **Une seule règle** décide de tout, page et serveur :
  `refusInscription` (`lib/evenements/agenda.ts` lignes 84 à 96), appelée par
  la fiche (`Inscriptions.tsx` 78), le panneau (200), la carte
  (`EvenementCard.tsx` 120) et la route serveur
  (`api/evenements/inscription/route.ts` 53), qui traduit le refus par `REFUS`
  (17 à 23). Un refus ajouté là est tenu partout.
- Le QR code encode **l'adresse de la fiche** : `QrCode.tsx` ligne 15
  (`window.location.origin + path`) et `EvenementClient.tsx` ligne 96
  (`path` = `/evenements/<id>`). Le libellé à côté est
  `evenements.lienInscription` (« Lien d'inscription ») quand l'évènement a des
  inscriptions, `evenements.lienFiche` sinon (`QrCode.tsx` 37, drapeau
  `avecInscriptions` calculé `EvenementClient.tsx` 68).
- Le rappel de la veille lit **la sous-collection `inscriptions`**
  (`api/cron/reminders/route.ts` 283 à 289) : sans inscrit dans l'app, la
  boucle n'envoie rien, sans erreur.
- Le formulaire range les inscriptions dans un bloc à lui (`EvenementForm.tsx`
  219 à 235, ordre de la maquette du lot 6 bis) ; « Places » et « sans compte »
  sont sous « Plus d'options » (287 à 299). Les URLs des liens sont validées
  par `/^https?:\/\//i` (113 à 114).
- La duplication recopie tout le reste de la fiche (`NouveauClient.tsx` 32) et
  n'efface que les dates.
- `firestore.rules` : la modification d'un évènement ne contrôle que `inscrits`
  (lignes 153 à 155). **Aucune règle à publier** pour un champ de plus.
- `firebase/evenements.ts` (41 à 49) lit chaque champ avec un défaut : un
  évènement d'avant le lot 11 se lira sans migration.

## Décisions de Timothée (18/09/2026, non rouvertes)

| # | Décision |
| --- | --- |
| D1 | Nouveau champ **« Lien d'inscription externe »** sur un évènement. |
| D2 | Rempli : le grand bouton de la fiche devient **« S'inscrire » et ouvre le lien externe**. |
| D3 | L'app ne compte alors **ni places ni inscrits**. |
| D4 | Le **QR code continue de pointer vers la fiche GCC**, jamais vers le Google Forms : l'affiche fait entrer les gens dans l'app, la fiche les envoie au formulaire. |

## Décisions prises ici (recommandations, à confirmer au go)

| # | Question | Décision proposée |
| --- | --- | --- |
| R1 | Période d'inscription, « Complet », mode Automatique · Ouvertes · Fermées | **Ils ne s'appliquent plus, et l'écran le dit.** Le lien externe est un refus de plus, `"externe"`, placé **en premier** dans `refusInscription` : il passe avant `fermee`, `complet` et la période, qui ne sont jamais évalués. Une seule règle sert encore la page et le serveur. |
| R2 | Lien externe **et** places remplis | **Le lien gagne** : « Places » et « sans compte » restent visibles mais **désactivés**, sous une phrase qui dit pourquoi. La valeur reste dans la fiche, jamais lue tant que le lien est là : retirer le lien rend l'ancien réglage. Pas d'effacement silencieux (à l'inverse des dates hors mode automatique, `EvenementForm.tsx` 123 à 126, qui seraient fausses une fois passées). |
| R3 | Un évènement qui a **déjà des inscrits** dans l'app | **Le formulaire refuse** d'ajouter un lien externe tant que `inscrits > 0` : « Cet évènement a déjà N inscrits dans l'app. Retire-les dans le panneau des inscriptions avant de passer à un formulaire externe. » Un évènement n'a ainsi **qu'un seul endroit où l'on s'inscrit**, jamais deux. Les places déjà prises ne sont ni perdues ni ignorées en silence. |
| R4 | Carte de la liste (« Inscrit », « Complet »…) | La carte montre la **pilule pleine « S'inscrire »**, comme un évènement ouvert, et **rien d'autre** : ni « N déjà inscrits », ni places, ni « Complet ». Elle reste un lien vers la fiche (`EvenementCard.tsx` 149) : **le formulaire externe ne s'ouvre jamais depuis la liste**, comme le QR (D4). |
| R5 | Rappel de la veille aux inscrits | **Rien à coder, et on le dit.** L'app ne connaît pas les inscrits : la boucle du cron ne trouve aucune place et n'envoie rien (route 283 à 289). On **n'écrit pas** un repli « prévenir tout le monde » : ce serait une notification à toute l'église. L'aide du champ prévient l'organisateur : « pas de rappel la veille ». |
| R6 | Place du champ dans le formulaire | **Premier champ du bloc « Inscriptions »**, au-dessus du choix Automatique · Ouvertes · Fermées : c'est lui qui décide si le reste s'applique. Pas sous « Plus d'options » : pour Christelle c'est le cas courant, un champ replié serait manqué. |
| R7 | Visiteur sans compte | **Tout le monde voit le bouton**, connecté ou non. Le formulaire externe gère l'identité ; l'affiche vise des gens qui n'ont pas de compte. La phrase « Connecte-toi pour t'inscrire » (`Inscriptions.tsx` 143 à 150) et la case « sans compte » ne servent plus. |
| R8 | Adresse acceptée | La **même règle que les liens** (`EvenementForm.tsx` 113 à 114) : `http://` ou `https://` obligatoire, même message d'erreur (`annonces.form.errorLink`). Pas de contrôle « c'est bien un Google Forms » : Sheets, Framaforms ou autre marchent pareil. |
| R9 | Duplication | Le lien est **recopié** (`NouveauClient.tsx` 32 le fait déjà par `...rest`) : un cours qui revient garde son formulaire, et il s'efface en un geste. Les dates d'inscription restent effacées, elles seraient passées. |
| R10 | 中文 | Nouvelles clés dans `src/locales/zh-CN.json` (voir « Modèle ») ; la clé `evenements.lienInscription` existante (报名链接, libellé du QR) **n'est pas touchée** pour éviter la collision. |

## Objectif

1. Un organisateur colle l'adresse de son Google Forms dans la fiche de
   l'évènement.
2. La fiche montre alors **« S'inscrire »**, et ce bouton **ouvre le
   formulaire** dans un nouvel onglet, pour tout le monde.
3. L'app **ne prétend rien compter** : ni places, ni inscrits, ni période ; les
   écrans disent que l'inscription se passe ailleurs.
4. Le **QR code de l'affiche reste celui de la fiche GCC** : on entre par
   l'app, on repart vers le formulaire.

Réussite : un évènement dont le lien externe vaut `https://forms.gle/abc`
affiche sur sa fiche un bouton « S'inscrire » dont `href` est
`https://forms.gle/abc` (nouvel onglet), sans compteur, sans places et sans
phrase de période ; la carte du calendrier montre la même pilule et rien
d'autre ; le QR de l'organisateur encode toujours `…/evenements/<id>` ; un POST
sur `/api/evenements/inscription` pour cet évènement répond **409** ; le
formulaire refuse le lien si l'évènement a déjà un inscrit ; le tout sur
ordinateur, téléphone et tablette.

## Modèle

`evenements/{id}` gagne un champ :

| Champ | Valeurs | Défaut |
| --- | --- | --- |
| `lienExterne` | `""` · une URL `http(s)://…` | `""` = inscription dans l'app |

- **Compatibilité** : lu `(data.lienExterne as string) ?? ""` dans
  `firebase/evenements.ts`, comme les autres. Aucune migration, aucune règle à
  publier (les rules ne contrôlent que `inscrits`, lignes 153 à 155).
- **Règle unique** (`agenda.ts`), `RefusInscription` gagne `"externe"`, testé
  **avant tout le reste** dans `refusInscription` :
  1. lien externe non vide → **`externe`** ;
  2. info ou réunion de pôle, ou mode `fermees` → `fermee` ;
  3. places dépassées → `complet` ;
  4. … (le reste inchangé : `ouvertes`, `pasEncore`, `terminee`, `commencee`).
- `useRaisonInscription` (`ChoixInscriptions.tsx`) rend `"externe"` comme les
  autres refus datés : une phrase sans date, « Inscriptions sur un formulaire
  externe ». Seul `"complet"` reste exclu.
- Le bouton est un **lien** (`<a href target="_blank" rel="noopener
  noreferrer">`) habillé par `buttonVariants({ size: "lg" })`, comme la pilule
  de la carte (`EvenementCard.tsx` 131), pas un `<button>`.

Nouvelles clés (FR · 中文) :

| Clé | Français | 中文 |
| --- | --- | --- |
| `evenements.form.lienExterne` | Lien d'inscription externe | 外部报名链接 |
| `evenements.form.lienExterneAide` | Google Forms, Sheets… L'app ne compte alors ni places ni inscrits, et n'envoie pas de rappel la veille. Le QR code mène toujours à cette fiche. | 如 Google Forms、Sheets…… 应用不再统计名额和报名人数，也不会在前一天发送提醒。二维码仍然指向本活动页面。 |
| `evenements.form.lienExterneOccupe` | Cet évènement a déjà {{n}} inscrits dans l'app. Retire-les dans le panneau des inscriptions avant de passer à un formulaire externe. | 本活动在应用内已有 {{n}} 人报名。请先在报名面板中移除，再改用外部表单。 |
| `evenements.form.placesExterne` | Inscription sur un formulaire externe : ces réglages ne s'appliquent pas. | 报名在外部表单进行：这些设置不适用。 |
| `evenements.raison.externe` | Inscriptions sur un formulaire externe | 通过外部表单报名 |
| `evenements.externe` | Formulaire externe | 外部表单 |

Le bouton garde `evenements.sinscrire` (« S'inscrire » · 报名).

## Écrans

### Formulaire (`EvenementForm.tsx`)

- Bloc « Inscriptions », **premier champ** : « Lien d'inscription externe »
  (`ev-lien-externe`, `type="url"`, `placeholder="https://…"`) et son aide.
- Le champ rempli, le choix Automatique · Ouvertes · Fermées et les deux dates
  **disparaissent** du bloc, remplacés par l'aide.
- Sous « Plus d'options » : « Places » et « Les personnes sans compte peuvent
  s'inscrire » restent affichés, **désactivés**, sous
  `form.placesExterne` (R2).
- À l'envoi : URL contrôlée comme les liens (R8) ; refus avec
  `form.lienExterneOccupe` si `inscrits > 0` (R3) ; le lien est nettoyé
  (`trim()`), les autres champs d'inscription restent tels quels.
- Une info et une réunion de pôle n'ont toujours pas de bloc « Inscriptions »,
  donc pas de lien externe.

### Fiche (`Inscriptions.tsx`)

- Refus `"externe"` : à la place de tout le reste de la section, **le grand
  bouton lien « S'inscrire »**, puis, en petit et gris,
  `raison.externe`.
- Ni compteur « N déjà inscrits », ni places, ni « Complet », ni liste des
  inscrits, ni « Connecte-toi pour t'inscrire ».

### Panneau de l'organisateur (`PanneauInscriptions`)

- Pilule d'état : **« Formulaire externe »** (`evenements.externe`), gris comme
  « Fermées ».
- Sous elle, `raison.externe` et **l'adresse, cliquable**.
- Le réglage Automatique · Ouvertes · Fermées et le compteur **ne s'affichent
  pas** : ils ne veulent rien dire ici.
- La tuile QR, juste en dessous, est **inchangée** : elle encode la fiche
  (D4).

### Carte du calendrier (`EvenementCard.tsx`, `PiedCarte`)

- Refus `"externe"` : la pilule pleine « S'inscrire », **sans la ligne du
  compteur** (R4). Toute la carte reste un lien vers la fiche.

## Ce qui ne change pas

- `QrCode.tsx` et l'appel de `EvenementClient.tsx` (96) : même adresse, même
  libellé « Lien d'inscription » — il reste vrai, la fiche est bien l'endroit
  où l'on s'inscrit.
- Le **rappel de la veille** du cron : aucune ligne (R5) — l'app ne connaît
  aucun inscrit, la boucle n'envoie rien. (La ligne « Inscriptions ouvertes »
  du matin, elle, a dû être corrigée : voir l'avancement.)
- `firestore.rules` : rien à publier.
- Les évènements sans lien externe : rien ne bouge, période comprise
  (`spec-inscriptions-periode.md`).

## Tests (Playwright, `tests/evenements.spec.ts`, trois appareils, écrits avant le code)

- **Règle** (fonction pure) : un lien externe rend `"externe"` ; il gagne sur
  `fermees`, sur `complet` (places pleines) et sur une période pas encore
  ouverte ; un lien vide laisse la règle d'aujourd'hui intacte.
- **Route** : POST sur un évènement à lien externe → 409, message « Les
  inscriptions se font sur un formulaire externe. »
- **Formulaire** : le lien saisi est écrit dans la fiche ; le bloc des modes et
  des dates disparaît ; « Places » et « sans compte » sont désactivés ; une
  adresse sans `http(s)://` est refusée ; un évènement avec un inscrit refuse
  le lien avec le message qui compte les inscrits.
- **Fiche** : le bouton « S'inscrire » a pour `href` l'adresse externe et
  `target="_blank"` ; ni compteur, ni places, ni période à l'écran ; **un
  visiteur sans compte voit le même bouton** et non « Connecte-toi ».
- **Panneau** : pilule « Formulaire externe », adresse cliquable, pas de
  réglage de mode ; le **QR encode `/evenements/<id>`**, pas l'adresse externe
  (contrôle de D4).
- **Carte** : pilule « S'inscrire » seule, sans « N déjà inscrits » ; un clic
  ouvre la fiche, pas le formulaire externe.
- **中文** : la fiche et le formulaire en 中文 montrent les nouveaux libellés.

## Hors périmètre

- **Lire les réponses du Google Forms** : l'app ne va pas chercher les inscrits
  ailleurs, ni pour le compteur, ni pour le rappel de la veille.
- **Un QR vers le formulaire** : tranché (D4), ne pas le proposer.
- **Deux inscriptions à la fois** (app + formulaire externe sur le même
  évènement) : refusé par R3, une seule porte à la fois.
- **Un formulaire d'inscription maison** (questions libres dans l'app) :
  autre chantier, à demander.
- **Suivre les clics** vers le formulaire : aucune mesure.

## Commandes

```bash
npm test -- tests/evenements.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

**Codé le 18/09/2026** (go de Timothée, R1 à R10 retenues), 10 tests écrits
avant le code et vus rouges, puis verts sur les trois appareils (30 exécutions) ;
`tests/evenements.spec.ts` en entier reste verte (79 × 3).

| Pièce | Ce qui est fait |
| --- | --- |
| Modèle | `lienExterne: string` (`types/evenement.ts`), lu avec un défaut `""` (`firebase/evenements.ts`) : aucune migration, aucune règle à publier. |
| Règle | `RefusInscription` gagne `"externe"`, testé **en premier** dans `refusInscription` (`agenda.ts`) ; la route `/api/evenements/inscription` répond 409 « Les inscriptions se font sur un formulaire externe. » par le même chemin. |
| Formulaire | Champ « Lien d'inscription externe » en tête du bloc « Inscriptions » (`type="url"`, aide) ; rempli, le mode et les deux dates disparaissent ; « Places » et « sans compte » restent sous « Plus d'options », désactivés, sous `form.placesExterne` ; refus si `inscrits > 0` (nouvelle prop `inscrits`, passée par `ModifierClient`). |
| Fiche | `Inscriptions` : grand bouton **lien** `buttonVariants({ size: "lg" })`, `target="_blank" rel="noopener noreferrer"`, puis `raison.externe` ; ni compteur, ni places, ni « Connecte-toi ». |
| Panneau | Pilule « Formulaire externe » (grise), `raison.externe`, l'adresse cliquable ; ni réglage, ni compteur. Le QR reste celui de la fiche. |
| Carte | `PiedCarte` : la pilule « S'inscrire » seule, sans la ligne du compteur. |
| Libellés | 7 clés FR + 中文 (`lienExterneOccupe` en `_one` / `_other`). |
| Cron | `ouvertureDuJour` (`rappel.ts`) ne déclenche plus la ligne « Inscriptions ouvertes » pour un évènement à formulaire externe (voir les écarts). |

Écarts avec la spec, et pourquoi :

- `lienExterneOccupe` s'écrit avec `{{count}}` et non `{{n}}` : la règle du
  projet veut `_one` **et** `_other` dans les deux langues, et i18next ne
  pluralise que sur `count`.
- La 409 de la route n'est **pas** testée de bout en bout : les tests n'ont pas
  Firebase Admin (même écart que la période d'inscription et les rappels). La
  règle partagée est testée, et `Record<RefusInscription, string>` force le
  message à exister à la compilation.
- Le contrôle d'URL de l'app (R8) est doublé par le `type="url"` du champ : le
  navigateur refuse déjà une adresse sans schéma. La règle de l'app reste
  nécessaire — `javascript:…` est une URL valide pour le navigateur — et c'est
  elle que le test exerce.
- `sansInscription` (info, réunion de pôle) efface aussi `lienExterne`, comme
  les autres champs d'inscription : sans cela une fiche passée en « info »
  garderait un lien caché qui changerait la règle.
- **Ajout à la spec** (repéré à la relecture, tranché par Timothée le
  18/09/2026) : `ouvertureDuJour` (`rappel.ts`, P4) regarde désormais le lien
  externe. Le champ « Ouverture des inscriptions » est masqué mais **pas
  effacé** (R2) : sans cette ligne, un évènement à formulaire externe aurait
  encore annoncé « Inscriptions ouvertes » à toute l'église le matin venu,
  alors que l'app n'inscrit plus personne. C'est ce lot qui créait
  l'incohérence, c'est lui qui la referme. R5 tient toujours pour le **rappel
  de la veille** : rien à coder, la boucle ne trouve aucun inscrit.
