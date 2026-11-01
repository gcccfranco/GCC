# Vidéo de bienvenue (première connexion)

Faite avec la méthode /brag (`latent-spaces/brag`, `/brag-slim`) le 01/11/2026 : 21 s, carré, français, musique originale.
Rendu publié : `docs/video-bienvenue/bienvenue.mp4` (720×720, 1,1 Mo) et `bienvenue.jpg` (affiche = image 0).
Spec d'intégration : `docs/spec-video-bienvenue.md`. Plan et storyboard : `plan.md`.

Refaire la vidéo (depuis ce dossier, serveur `npm run dev -- -p 3100` lancé à la racine) :

```bash
npx playwright test -c pw.config.ts          # captures du vrai site → shots/ (session et noms inventés)
node render.mjs stills 30 21 1.2 6.4 8.9      # quelques plans fixes à regarder → stills/
node render.mjs frames 30 21                  # 630 images → frames/ (≈ 2 min)
python3 music.py 2.5 5 6.25 10 12.5 15 16.25 17.5   # music.wav ; arguments = carillons sur les coupes
node render.mjs stills 30 21 1.6 && cp stills/t1.60.png frames/0000.png   # affiche en image 0
ffmpeg -y -framerate 30 -i frames/%04d.png -i music.wav -t 21 -af "afade=t=out:st=19.6:d=1.4" \
  -vf scale=720:720:flags=lanczos -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -c:a aac -b:a 96k \
  -movflags +faststart ../../docs/video-bienvenue/bienvenue.mp4
```

`compo.html` : chaque image est `render(t)`, fonction pure du temps (légendes, zooms, toucher simulé sur « + »).
Les captures ne lisent jamais le vrai Firestore ni le planning (vrais noms) ; profil fictif « Nina Dubreuil ».
