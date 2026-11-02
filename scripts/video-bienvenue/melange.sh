#!/bin/bash
# Extrait « mélange » de l'écran C'est parti : la recherche d'un chant (3,8 s), fondu vers la setlist qui se remplit (5 s),
# fondu au blanc à la fin pour boucler. Images déjà rendues par tout-extraits.sh (chants, setlist).
set -e
cd "$(dirname "$0")"
for d in telephone tablette tablette-paysage ordinateur; do
  ffmpeg -y -loglevel error -framerate 30 -i frames-extraits/$d/chants/%04d.png -framerate 30 -i frames-extraits/$d/setlist/%04d.png \
    -filter_complex "[0]trim=end_frame=114,setpts=PTS-STARTPTS[a];[1]setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=0.4:offset=3.4,fade=t=out:st=8.1:d=0.3:color=white,scale=640:360:flags=lanczos,format=yuv420p" \
    -an -c:v libx264 -preset slow -crf 25 -movflags +faststart ../../docs/video-bienvenue/extraits/melange-$d.mp4
  cp ../../docs/video-bienvenue/extraits/chants-$d.jpg ../../docs/video-bienvenue/extraits/melange-$d.jpg
  echo "$d $(ffprobe -v error -show_entries format=duration -of csv=p=0 ../../docs/video-bienvenue/extraits/melange-$d.mp4)"
done
