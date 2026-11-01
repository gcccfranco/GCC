#!/bin/bash
# Rend les quatre vidéos (une par disposition) → ../../docs/video-bienvenue/bienvenue-<appareil>.mp4 + .jpg
set -e
cd "$(dirname "$0")"
python3 music.py 2.5 5 6.25 10 12.5 15 16.25 17.5
for d in telephone tablette tablette-paysage ordinateur; do
  rm -rf frames/$d stills/$d
  node render.mjs $d frames
  node render.mjs $d stills 1.6
  cp stills/$d/t1.60.png frames/$d/0000.png   # affiche en image 0
  ffmpeg -y -loglevel error -framerate 30 -i frames/$d/%04d.png -i music.wav -t 21 -af "afade=t=out:st=19.6:d=1.4" \
    -vf scale=720:720:flags=lanczos -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -c:a aac -b:a 96k \
    -movflags +faststart ../../docs/video-bienvenue/bienvenue-$d.mp4
  echo "$d ok"
done
python3 -c "from PIL import Image; Image.open('stills/telephone/t1.60.png').convert('RGB').resize((720,720)).save('../../docs/video-bienvenue/bienvenue.jpg', quality=85)"
