# Spec : Ma partition (demande AP, chantier 1)

**Statut : planche publiée le 11/11/2026, en attente des réponses de Timothée. Pas de spec détaillée, rien de codé.**
Cadrage : `docs/spec-pupitre-musicien.md` (§ Chantiers proposés, ligne 1 ; § Ordre recommandé, point 3).
Planche : `docs/planches/planche-ma-partition.html` (artefact privé « Planche « Ma partition » — GCC Louange »).

## Demande (Timothée, 11/11/2026, points 2 et 3)

- Fusionner « Ma version » et « Adapter » en une seule partition personnelle, partageable à des personnes choisies.
- Comme dans forScore, les annotations restent sur le chant : dans une nouvelle setlist, on retrouve la partition annotée.

## Ce que le code montre (vérifié sur la tête de branche du 11/11/2026)

- « Adapter » : `contentOverride` sur l'item de setlist (`src/types/setList.ts:63-70`), pour tous, réservé à qui peut
  modifier la setlist. « Ma version » : `setlists/{id}/versions/{uid}` (`src/lib/firebase/setlistVersions.ts`), donc
  rangée par setlist. Les deux s'excluent (`SetlistDetailClient.tsx:359-374`). Le partage est un interrupteur par
  chant, visible de tous (`PartitionView.tsx:530-540`).
- Annotations : `annotations/{uid}__{setlistId}__{pageKey}` (`src/lib/firebase/annotations.ts:5`), rangées par
  setlist et par mise en page. Une nouvelle setlist repart de zéro. La décision 18 d'AO renvoie l'accrochage au chant à
  cette migration, et AN-1 en dépend.

## Pistes de la planche

- **A. Au crayon (recommandée)** : un seul geste « Crayon » (accord, paroles, ordre, trait) ; en enregistrant, un
  responsable choisit « Pour moi » ou « Pour tout le culte du … » (l'ex-Adapter), avec « Passer au culte » pour
  rattraper. Menu « Je lis : ma partition ▾ » en tête de chaque chant (la mienne, celle du culte, celles qu'on m'a
  partagées, « Partager ma partition… »). Partage : feuille « Ce dimanche avec toi » (l'équipe du planning) puis
  recherche, une case par personne, « Inclure mes traits » éteint. Mode louange : « Annoter » devient « Crayon », et
  « Je joue » gagne une ligne « Partition ».
- **B. Le carnet** : la partition vit sur la page du chant, avec des notes de marge ; la setlist l'emprunte ; un
  responsable propose son carnet comme partition du culte.
- **C. Les calques** : des calques empilés (culte, moi, une autre personne), qu'on choisit d'afficher ; la plus chère
  (fusion par ligne, priorité, origine de chaque retouche).

Réserves de la relecture (`critique-design`, verdict « à retoucher », pas de reprise lancée) : dans la piste A, les
filets « à moi » et « pour le culte » ne diffèrent que par la teinte (environ 2,6:1) ; une parole retouchée en graphite
se lit comme un mot effacé ; les maquettes tablette et ordinateur ne sont pas à la même échelle ; quelques finitions.
Elles sont écrites dans la planche et seront reprises dans la spec.

## Questions à trancher (propositions de la planche)

1. Que devient ma retouche quand la présidence ou le `.cho` change le chant ? Proposition : des différences ligne par
   ligne ; une ligne changée des deux côtés est marquée « Le chant a changé ici » jusqu'à ce que je choisisse.
2. Une partition partagée est-elle copiée ou suivie ? Proposition : suivie, avec « Garder une copie » chez celui qui
   la reçoit.
3. Un responsable peut-il imposer sa partition à toute la setlist ? Proposition : oui, pour ce culte seulement ; la
   partition personnelle d'un autre reste la sienne.
4. Faut-il pouvoir relire le chant d'origine, sans aucune retouche ? Proposition : oui, en dernière ligne de « Je lis ».
5. Partage chant par chant ou de toutes mes partitions ? Proposition : chant par chant, avec « Partager toutes mes
   partitions avec cette personne ».
6. Les traits partent-ils avec la partition partagée ? Proposition : non par défaut.
7. La tonalité et le capo font-ils partie de Ma partition ? Proposition : la tonalité oui, par chant ; le capo reste
   réglé par appareil.
8. Sur un scan 简谱 : les accords du calque et les traits seulement ; le scan reste intouchable.
9. Libellés chinois : à faire traduire ; en attendant, libellés français.

## Avancement

- 11/11/2026 : code relu, six captures de l'existant (setlist sur trois appareils, chant au téléphone, mode louange
  au téléphone et à la tablette), un seul lancement du workflow `planche` (trois agents). J'ai corrigé l'étiquette
  « Piste décidée » de B et C, ajouté la question 4 et les réserves à la planche. Publiée en artefact privé.
  Questions posées à Timothée dans la session « AP · Planche Ma partition ». Suite : ses réponses, puis la spec
  (tranches, accrochage des traits au texte, migration des documents `versions` et `annotations`, règles Firestore à
  publier à la main).
