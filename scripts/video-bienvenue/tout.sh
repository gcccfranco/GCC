#!/bin/bash
# Rend les quatre vidéos (une par disposition), sans son → rendus/bienvenue-<appareil>.mp4 + bienvenue.jpg (plus servis : lot VB-E, ils ne sont plus dans public/)
# Une série d'images complète (630) n'est pas refaite : effacer frames/<appareil> pour la refaire.
set -e
cd "$(dirname "$0")"
mkdir -p rendus
for d in telephone tablette tablette-paysage ordinateur; do
  if [ "$(ls frames/$d 2>/dev/null | wc -l)" != "630" ]; then rm -rf frames/$d; node render.mjs $d frames; fi
  node render.mjs $d stills 1.6
  cp stills/$d/t1.60.png frames/$d/0000.png   # affiche en image 0
  ffmpeg -y -loglevel error -framerate 30 -i frames/$d/%04d.png -t 21 -an \
    -vf scale=720:720:flags=lanczos -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
    -movflags +faststart rendus/bienvenue-$d.mp4
  echo "$d ok"
done
python3 -c "from PIL import Image; Image.open('stills/telephone/t1.60.png').convert('RGB').resize((720,720)).save('rendus/bienvenue.jpg', quality=85)"
