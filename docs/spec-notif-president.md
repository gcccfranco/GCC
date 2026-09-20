# Spec : lot 2 — Notification au président (lien de présentation)

Lot 2 de `feuille-de-route.md` § 2, décidé le 14/09/2026 (matin) et précisé
par la relecture (§ 7, constat 7). **Go de Timothée le 14/09/2026 (soir)**,
codé le même soir.

## Objectif

Quand la régie **pose ou remplace** le lien de la présentation d'une setlist,
le **président de la setlist** est prévenu automatiquement (push + cloche).
Retrait du lien = rien. Sans compte relié au nom du président = rien ne part,
**et la régie le voit**.

## Ce que le code montrait

`/api/setlist/presentation` écrivait `presentationUrl` et répondait `{ ok,
presentationUrl }` ; aucune notification. La cloche connaissait trois sortes
de push ponctuels (manuel, rappel, diffusion).

## Ce qui est construit

- `src/lib/setlist/presentationLink.ts` (pur) :
  - `presidentRecipients(leader, index, auteur)` : tous les comptes dont le nom
    de planning est celui du président (homonymes compris), **sauf l'auteur du
    lien** ; `linked` dit si au moins un compte porte ce nom.
  - `presentationNotifKey(setlistId, url)` : `presentation-{id}-{empreinte}`
    (FNV-1a du lien) — jamais deux fois pour le même lien.
- Route : après l'écriture, si le lien est non vide **et différent** de
  l'ancien : destinataires → préférence **« Setlist prête »** (`setlists`) →
  clé notifLog par destinataire → push « Présentation prête — <titre> » /
  « <régie> a ajouté le lien de la présentation. » (nom de planning de
  l'auteur, sinon prénom nom, sinon « La régie ») → entrée de cloche de sorte
  `presentation` → notifLog. Réponse : `{ ok, presentationUrl, notified,
  linked }` (`notified`/`linked` absents si rien n'a changé).
- Cloche : nouvelle sorte `presentation` (« Présentation prête » /
  « 幻灯片已就绪 ») dans `BellKind`, `PushNotif`, `NotificationItem`, navbar.
- Interface (`PresentationLink.tsx`) : après l'enregistrement, une ligne
  `role="status"` : « Président prévenu. » si `notified > 0` ; « Personne n'a
  été prévenu : aucun compte relié au nom du président. » si `linked` est
  faux ; rien sinon (président = auteur, déjà prévenu de ce lien, ou
  préférence désactivée).

## Hypothèses

1. Message en français (la décision ne demandait 中文 que pour les rappels).
2. Préférence « Setlist prête » réutilisée (constat 7), pas de nouveau type.
3. Le président qui pose lui-même le lien n'est pas prévenu, et la régie ne
   voit alors aucun message.

## Tests (Playwright, `tests/notif-president.spec.ts`, trois appareils)

- Fonctions pures : destinataires (homonymes, auteur exclu, nom inconnu, nom
  vide) ; clé stable par setlist et par lien.
- Interface : les trois retours à la régie (prévenu / aucun compte / rien),
  route simulée.
- La route elle-même (Admin SDK, push) n'est pas testée par Playwright.

## Commandes

```bash
npx tsc --noEmit
npm test -- tests/notif-president.spec.ts tests/setlist-regie.spec.ts
```

## Limites

- Toujours : trois appareils ; aucune écriture en production.
- Demander avant : notifier d'autres personnes que le président, changer la
  préférence utilisée.

## Critères de réussite

- La régie pose un lien Canva : Jonathan Z. (président, compte relié) reçoit
  « Présentation prête — Culte du 20 septembre » et la régie lit « Président
  prévenu. » ; le même lien re-enregistré ne renvoie rien ; un président sans
  compte → « Personne n'a été prévenu : aucun compte relié au nom du
  président. ».

## Avancement

Codé le 14/09/2026 ; 5 tests × 3 appareils verts ; captures regardées.
**À valider en local par Timothée** (l'envoi réel se vérifie en ligne).
