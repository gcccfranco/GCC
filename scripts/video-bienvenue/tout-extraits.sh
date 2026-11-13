#!/bin/bash
# Extraits de la visite, sans son, en boucle, 640×360 → ../../public/accueil/extraits/<extrait>-<appareil>.mp4 (+ .jpg)
#   apercu   (Bienvenue, 8 s)          onglets (Où trouver quoi, 5 s)    musicien (tonalité puis Mode Louange, 9,6 s)
#   melange  (recherche puis setlist : choriste, présidence, régie, membre, C'est parti, 8,4 s)
#   taches   (équipe, référent, 5 s)   planning (responsabilités, notifications, 5 s)
# Les séries d'images complètes ne sont pas refaites (effacer frames-extraits/<appareil>/<scène> pour la refaire).
set -e
cd "$(dirname "$0")"
OUT=../../public/accueil/extraits
mkdir -p $OUT
enc() { ffmpeg -y -loglevel error "$@" -an -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart; }
for d in telephone tablette tablette-paysage ordinateur; do
  for c in louange tonalite setlist chants taches fin planning apercu; do
    n=$([ $c = apercu ] && echo 240 || echo 150)
    [ "$(ls frames-extraits/$d/$c 2>/dev/null | wc -l)" = "$n" ] || { rm -rf frames-extraits/$d/$c; node render-extraits.mjs $d $c frames; }
  done
  F=frames-extraits/$d
  for c in apercu taches planning; do
    enc -framerate 30 -i $F/$c/%04d.png -vf scale=640:360:flags=lanczos $OUT/$c-$d.mp4
  done
  enc -framerate 30 -i $F/fin/%04d.png -vf scale=640:360:flags=lanczos $OUT/onglets-$d.mp4
  enc -framerate 30 -i $F/tonalite/%04d.png -framerate 30 -i $F/louange/%04d.png \
    -filter_complex "[0][1]xfade=transition=fade:duration=0.4:offset=4.6,fade=t=out:st=9.3:d=0.3:color=white,scale=640:360:flags=lanczos" $OUT/musicien-$d.mp4
  enc -framerate 30 -i $F/chants/%04d.png -framerate 30 -i $F/setlist/%04d.png \
    -filter_complex "[0]trim=end_frame=114,setpts=PTS-STARTPTS[a];[1]setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=0.4:offset=3.4,fade=t=out:st=8.1:d=0.3:color=white,scale=640:360:flags=lanczos" $OUT/melange-$d.mp4
  for c in apercu onglets musicien melange taches planning; do
    src=$c; case $c in onglets) src=fin;; musicien) src=tonalite;; melange) src=chants;; esac
    ffmpeg -y -loglevel error -i $F/$src/0000.png -vf scale=640:360 -q:v 4 $OUT/$c-$d.jpg
  done
  echo "$d ok"
done
# Anciens noms, remplacés par les assemblages ci-dessus.
rm -f $OUT/louange-* $OUT/tonalite-* $OUT/setlist-* $OUT/chants-* $OUT/jianpu-* $OUT/fin-*
