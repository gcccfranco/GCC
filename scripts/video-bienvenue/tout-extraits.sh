#!/bin/bash
# Rend les extraits des cartes (7 × 4 dispositions), sans son, en boucle → ../../docs/video-bienvenue/extraits/<extrait>-<appareil>.mp4
set -e
cd "$(dirname "$0")"
mkdir -p ../../docs/video-bienvenue/extraits
for d in telephone tablette tablette-paysage ordinateur; do
  for c in louange tonalite jianpu setlist chants taches fin; do
    rm -rf frames-extraits/$d/$c
    node render-extraits.mjs $d $c frames
    ffmpeg -y -loglevel error -framerate 30 -i frames-extraits/$d/$c/%04d.png -an \
      -vf scale=640:360:flags=lanczos -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart \
      ../../docs/video-bienvenue/extraits/$c-$d.mp4
    ffmpeg -y -loglevel error -i frames-extraits/$d/$c/0000.png -vf scale=640:360 -q:v 4 ../../docs/video-bienvenue/extraits/$c-$d.jpg
  done
  echo "$d ok"
done
