# Spec : plus d'écran « Chargement… » au démarrage

Demande de Timothée du 31/10/2026, avec trois captures sur téléphone (Évènements, Planning, Louange) : « quand les
pages se chargent y'a ça qui apparaît avant, j'aimerais qu'il n'y ait pas ça ». Questions posées le même jour,
réponses : ce qui gêne, ce sont **les deux** (l'en-tête des visiteurs qui clignote et le mot « Chargement… ») ; à la
place, **la vraie mise en page, vide**. Go le 31/10/2026. Lot **CH**.

## Ce que le code montre (31/10/2026)

- `useAuth` (`src/lib/firebase/auth.ts`) part de `user = null, loading = true` jusqu'au premier `onAuthStateChanged` de
  Firebase, qui lit la session dans IndexedDB : un instant à chaque ouverture, plus sur un téléphone lent.
- Pendant cet instant, `Navbar` dessine l'en-tête des visiteurs (« GCC Louange », bouton FR), `MobileTabBar` ne
  dessine rien (`if (… loading …) return null`), et chaque page affiche `t("common.loading")` (« Chargement… »,
  une trentaine d'endroits).

## Décisions

| # | Décision |
| --- | --- |
| C1 | **Se souvenir qu'on était connecté** : une marque locale (`localStorage`, lue dans un try/catch) posée quand Firebase rend un compte, effacée à la déconnexion et quand Firebase rend « personne ». Au démarrage, marque présente : l'en-tête, la barre latérale et la barre du bas **du membre** se dessinent tout de suite ; marque absente : rien ne change pour un visiteur. La marque ne donne aucun droit : elle choisit seulement ce qu'on dessine pendant l'attente. |
| C2 | Pendant l'attente (connexion ou profil), les entrées qui dépendent des droits (Back-Office, entrées du back-office) n'apparaissent pas puis disparaissent : on dessine la forme commune, et on complète sans saut. |
| C3 | **Plus de mot « Chargement… »** au chargement d'une page : à la place, des blocs gris discrets (squelette) dans la mise en page de la page, aux couleurs du site (clair et sombre), sans animation forte (`prefers-reduced-motion` respecté), qui laissent la place au contenu sans saut. Un seul composant partagé. |
| C4 | Les autres « Chargement… » (un bouton qui travaille, une liste qui se recharge à l'intérieur d'une page déjà là) restent : seul l'écran d'attente d'une page entière change. |
| C5 | Si Firebase répond « personne » alors que la marque disait « connecté » (session expirée), la page passe à l'état visiteur comme aujourd'hui, et la marque s'efface. |
| C6 | (Timothée, 31/10/2026, « go ») **Se souvenir aussi de la forme** : en plus de « connecté », le téléphone retient ce que le profil a fait dessiner la dernière fois — responsable ou non (sélecteur App · Back-Office, boîte de réception, cloche) et les entrées du Back-Office et de sa barre du bas. Pendant l'attente, on dessine cette forme-là ; le profil arrivé, on la recalcule (et on retient la nouvelle). Comme la marque : aucun droit, seulement ce qu'on dessine ; effacée à la déconnexion. |

## Vérification

Playwright sur les trois appareils et les quatre dispositions : un membre (marque posée) ne voit jamais l'en-tête des
visiteurs ni « Chargement… » pendant l'attente (attente de Firebase prolongée par le test) ; un visiteur voit l'en-tête
des visiteurs ; la déconnexion efface la marque ; français et chinois ; captures regardées à l'œil.

## Avancement

- 31/10/2026 : spec écrite, go donné, codé. Marque `gcc-connecte` (`src/lib/marqueConnecte.ts`, script inline
  `marqueConnecteScript.ts` qui pose `<html data-connecte>` avant le premier dessin ; le CSS cache le bouton de
  connexion des visiteurs) ; `Navbar`, `MobileTabBar`, `BarreLaterale` dessinent la forme du membre pendant l'attente
  (gabarits gris à la place de l'avatar et de la cloche) ; `Squelette` remplace « Chargement… » dans une vingtaine
  de pages entières ou de corps de page ; les « Chargement… » de boutons, listes et panneaux internes restent (C4).
  `tests/chargement.spec.ts` (cinq projets, fr et zh) vert. Limite : au Back-Office, les entrées n'apparaissent
  qu'avec le profil.
- 31/10/2026 : **C6 codé** — la forme retenue (`gcc-forme` : responsable, messages, entrées du Back-Office), écrite
  quand le profil est là, effacée avec la marque ; pendant l'attente, le sélecteur App · Back-Office, l'icône des
  messages et les entrées du Back-Office (barre latérale, barre du bas) se dessinent tout de suite ; avant
  l'hydratation, `<html data-responsable>` garde la place du sélecteur. Captures téléphone et ordinateur regardées ;
  `chargement`, `barre-back-office`, `back-office-espace` verts sur trois appareils.
