# Grille de critique — GCC Louange

Condensé (Timothée, 10/11/2026) de cinq références. On n'en rouvre une que pour trancher un point précis, par section (`grep -n`, puis `Read` avec `offset`/`limit`), jamais en entier :
- `.claude/skills/impeccable/reference/critique.md` : heuristiques de Nielsen, charge cognitive, personas ;
- `.claude/skills/impeccable/reference/audit.md` : audit technique du code ;
- `.claude/skills/avoid-ai-design/references/ai-tells-catalog.md` : signes par identifiant (SD, T, C, L, K, S, M, I, CP, IM, X), détection et correction ;
- `.claude/skills/web-design-guidelines/guidelines.md` : règles de code d'interface ;
- `.claude/skills/unslop/references/signs.md` : signes couplés à leur correction.

Aucune commande `impeccable` de ces références ne se lance (programme non installé) ; seul outil, sur du code : `avoid-ai-design/scripts/detect.mjs`.

## 0. Le produit

Application d'une église : chants, setlists, planning, évènements. Surface de **travail et de lecture** : clarté, cohérence et gestes connus passent avant l'expression ; le caractère tient aux détails. Next.js + Tailwind + shadcn : on est **à l'intérieur d'un système**, les jetons de `src/app/globals.css` font foi. Une critique ne propose pas une autre direction. Direction « Sobre sur crème » rouverte le 13/09/2026 (sobre, mais moins fade et moins « document ») ; Timothée la tranche.

Gelé (`docs/audit-ui-apple-design.md` § 2) : couleurs de `serviceColors.ts`, logo, `--chord-color`, `--jianpu-color`, `--sec-*`, l'intérieur du calque 简谱 (`JianpuSheet`), l'export PDF. Un défaut vu là se note `gelé`, sans correction.

## 1. Hiérarchie et charge

- En deux secondes on nomme l'élément principal de l'écran et l'action principale. Un seul bouton plein par vue ; une ou deux actions secondaires ; le reste dans un menu.
- Plus de quatre choix de même poids au même endroit, ou plus de cinq entrées de navigation : à grouper.
- Capture réduite à 25 % : si tous les blocs pèsent pareil, la hiérarchie est plate.
- L'endroit où l'on est se voit (onglet actif, titre) ; rien à retenir d'un écran pour agir sur le suivant.
- Pas de carte dans une carte.
- Libellés dans les mots de l'équipe (chant, setlist, service) ; une icône seule de navigation a un libellé ; sur téléphone, l'action principale est atteignable au pouce.

## 2. Typographie

- Peu de tailles par écran, avec un vrai écart entre titre et corps ; pas de graisse 800-900 ni d'italique d'emphase.
- Aucune capitale « Title Case », ni en français ni en chinois ; pas d'étiquette en MAJUSCULES espacées ; pas de chasse fixe décorative.
- Français : `…` et non `...`, guillemets « », espace insécable avant `: ; ? !` et entre nombre et unité, apostrophe courbe. Chiffres en `tabular-nums` dans les colonnes.
- Chinois : pas de césure au milieu d'un mot ou d'une ponctuation, pas d'italique ni d'interlettrage sur les caractères, même corps perçu que le français voisin. Un caractère tombé en police de repli se voit sur la capture (forme ou graisse différente) : le signaler.
- Pas de mot seul sur la dernière ligne d'un titre ; un texte long se tronque ou passe à la ligne sans pousser ses voisins.

## 3. Couleur et contraste

- Contraste mesuré, pas estimé : 4,5:1 pour le texte, 3:1 pour le grand texte et les contours de contrôle, **en clair et en sombre**. D'abord le texte atténué (`--muted-foreground`) et les textes sur une teinte (`--sec-*-tint`, couleurs de services).
- Une couleur d'accent, réservée aux actions et à l'état, une ou deux fois par écran. `--sec-chorus` et l'orange d'action partagent une teinte : le signaler si l'écran les rapproche.
- Aucune information portée par la couleur seule (service, section, erreur).
- Dans le code : pas de couleur en dur hors jetons ; en sombre, pas de gris sur gris ni de bordure blanche à 10 % pour toute séparation.

## 4. Espacement et composition

- Pas de valeur arbitraire (`mt-[13px]`) ; un rythme : plus serré dans un groupe qu'entre deux groupes ; lignes d'une même liste de même hauteur ; mêmes marges dans des cartes sœurs.
- Rayon et ombre disent le rôle (jetons : 8, 12, 16 `--radius-groupe`, pilule) ; pas le même rayon, la même ombre ou le même filet gris autour de tout.
- Icônes dans une colonne de largeur fixe, bords communs entre blocs voisins.
- Aucun défilement horizontal, texte coupé, chevauchement, ni contrôle sous une barre collée ou hors des zones sûres.

## 5. États et accessibilité

- Chaque contrôle a : survol, focus visible (`:focus-visible`, jamais `outline-none` sans remplacement), appui, désactivé, chargement, erreur. Chaque vue a son état vide (avec quoi faire), son erreur (problème et remède, près du champ) et son hors-ligne.
- Cibles tactiles d'au moins 44 × 44 px, espacées ; tout ce qui s'offre au survol ou au geste (glisser, balayer) a un équivalent au tap et au clavier.
- `<button>` pour une action, `<a>`/`<Link>` pour une navigation ; bouton d'icône avec `aria-label` ; champ avec `<label>` ; titres hiérarchisés ; `aria-live` pour un toast.
- Action destructrice : confirmation ou annulation possible ; chaque action confirme son résultat ; toute feuille se ferme par Échap et par un bouton.
- Mouvement : `prefers-reduced-motion` respecté (repli en fondu) ; `transform` et `opacity` seulement ; pas de `transition: all` ; pas de rebond ; pas de `animate-pulse` hors direct. Zoom jamais bloqué.
- Formulaires : bon `type`/`inputmode`, collage jamais bloqué ; libellés ⌘ sur Apple, Ctrl ailleurs.

## 6. Cohérence : dispositions, langues, thèmes

- **Quatre dispositions**, chacune regardée : téléphone, tablette portrait, tablette paysage (barre latérale réduite), ordinateur ; plus 1 440 px pour une page de lecture (lecture plafonnée). Sans capture : « non vérifié ».
- **Deux langues** : un libellé chinois plus court ne laisse pas de trou, un français plus long ne casse ni ne tronque bouton, onglet ou barre d'outils.
- **Deux thèmes** : contrastes et séparations de surface revus en sombre ; un scan ne fait pas une tache claire.
- **Dérive** (X1) : un nouvel écran reprend les jetons, la navigation, les rayons et les composants des écrans voisins ; un jeton réinventé, une police ou une couleur nouvelle sans décision est le défaut le plus grave ici.
- **Sur une planche** : chaque piste aussi soignée que la recommandée, la recommandée marquée, les trois tailles présentes, contenus plausibles, aucun nom réel de membre.

## 7. Signes d'un design « fait par une IA »

Un signe montre un choix par défaut, pas un auteur. On juge les **combinaisons** : isolé, c'est une finition ; trois ensemble font un gabarit. Ce que Timothée a choisi n'est pas un signe.

**Premier ordre** (un non-initié le reconnaît) :
- dégradé violet/indigo vers bleu, texte de titre en dégradé (`bg-clip-text`), lueurs et halos colorés ;
- shadcn laissé tel quel (base `zinc`/`slate`, `--primary` et `--radius` d'origine), Inter ou Geist seule ;
- en-tête centré sous une pastille, puis trois cartes identiques à icône ;
- icône dans un carré arrondi teinté, `Sparkles`, emoji en guise d'icônes ;
- carte à liseré coloré à gauche ou en haut ; verre dépoli (`backdrop-blur`) hors d'une barre qui passe sur du contenu ;
- même fondu montant sur chaque bloc ; `hover:scale` sur cartes et boutons ;
- textes creux : « Bon retour ! », superlatifs, `→` collé aux libellés, bouton « Valider » au lieu de l'action et de son objet.

**Second ordre** (l'échappée « de bon goût », devenue un défaut à son tour) :
- **fond crème + accent terracotta ou argile + grande serif contrastée** (SD1) : touche « Sobre sur crème » ; à signaler s'il se voit, sans en faire à lui seul un rejet ;
- fond presque noir + un seul accent vert acide ou vermillon (SD2) ;
- pastiche de journal : filets partout, rayon zéro, colonnes denses (SD3) ;
- habillage de gabarit : surtitres en capitales espacées, métadonnées en `A · B · C`, étiquettes « MOT — fragment » (SD4) ;
- un mot du titre mis à part par couleur, italique ou surligné (SD5) ; numéros 01/02/03 sur ce qui n'est pas une suite (SD6) ; émeraude par défaut pour fuir le violet (SD8) ;
- pastilles d'état sur chaque ligne sans état réel derrière (K12) ; grille « bento » sans raison.

Épreuve finale : cet écran irait-il tel quel à un autre produit en changeant le nom ? Si oui, dire ce qui manque du monde du site (partition, accords, 简谱, service). Une sobriété tenue est un choix : la dire en qualité.

## 8. Verdict

1. Verdict : `à reprendre`, `à retoucher` ou `bon` ; dans le doute, `à retoucher`.
2. Chaque point : le constat, sa **preuve** (capture + endroit dans l'image, ou `chemin:ligne`), sa nature (`vu`, `lu dans le code`, `déduit sans rendu`), sa gravité (`visible au premier coup d'œil`, `à regarder de près`, `finition`, `gelé`), la correction en une phrase. Sans preuve, pas de point.
3. Les qualités réelles, une ligne chacune.
4. Ce qui n'a pas pu être vérifié (disposition, langue, thème, état).

Trois à cinq points principaux d'abord ; peu de finitions.
