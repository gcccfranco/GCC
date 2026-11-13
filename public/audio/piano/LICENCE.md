# Notes de piano : source et licence

Les douze fichiers `48.mp3` à `81.mp3` (nom = numéro MIDI : 48 = do3, 60 = do du milieu, 81 = la5 ; une note par
tierce mineure) viennent du **Salamander Grand Piano V3**, piano à queue Yamaha C5 enregistré par
**Alexander Holm** (2011).

- Source : <https://archive.org/details/SalamanderGrandPianoV3> (archive `SalamanderGrandPianoV3_OggVorbis.tar.bz2`,
  fichiers `C3v8.ogg` … `A5v8.ogg`, couche de vélocité 8 sur 16).
- Licence : **Creative Commons Attribution 3.0 Unported (CC-BY 3.0)**,
  <https://creativecommons.org/licenses/by/3.0/>, écrite dans le `README` de l'archive et dans les métadonnées
  d'archive.org (`licenseurl`), vérifiées le 13/11/2026.
- Modifications (13/11/2026) : coupées à 2,5 s avec un fondu de sortie de 0,6 s, passées en mono 44,1 kHz,
  compressées en MP3 64 kbit/s (ffmpeg). Le site les transpose (`playbackRate`) pour jouer les accords des fiches
  d'harmonie (`src/lib/audio/synthese.ts`).

Mention : « Piano : Salamander Grand Piano V3, Alexander Holm, CC-BY 3.0 ».
