# Vidéo de bienvenue (première connexion)

Faite avec la méthode /brag (`latent-spaces/brag`, `/brag-slim`) le 01/11/2026 : 21 s, carré, français, **sans son**,
**une vidéo par disposition** (téléphone, tablette portrait, tablette paysage, ordinateur), mêmes scènes.
Rendus : `rendus/bienvenue-<appareil>.mp4` (720×720) et l'affiche `bienvenue.jpg` (image 0) ; ces vidéos de 21 s ne sont plus servies
(lot VB-E, 02/11/2026). Ce que le site sert : les extraits de la visite, `public/accueil/extraits/<extrait>-<disposition>.{mp4,jpg}`
(`./tout-extraits.sh`).
Spec d'intégration : `docs/spec-video-bienvenue.md`. Plan et storyboard : `plan.md`.

Refaire les vidéos (depuis ce dossier, serveur `npm run dev -- -p 3100` lancé à la racine) :

```bash
npx playwright test -c pw.config.ts            # captures du vrai site, 4 projets → shots/<appareil>/ (+ boxes.json)
node render.mjs ordinateur stills 6.5 8.9 16.9 # quelques plans fixes à regarder → stills/<appareil>/
./tout.sh                                      # 4 × 630 images + encodage sans son (≈ 8 min)
```

- `compo.html` : chaque image est `render(t)`, fonction pure du temps ; la mise en page de chaque scène se calcule
  depuis `boxes.json` (boîtes mesurées par les captures : barre de tonalité, couplet, rangées de la setlist,
  « Ensuite », barre de navigation), injecté par `render.mjs`.
- `music.py <coupes…>` : la musique d'origine (ré majeur, 96 bpm), retirée le 01/11/2026 ; gardée si le son revient.
- Les captures ne lisent jamais le vrai Firestore ni le planning (vrais noms) ; profil fictif « Nina Dubreuil ».
