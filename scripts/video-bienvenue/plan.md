# /brag — GCC, vidéo de bienvenue (première connexion)

**Angle** : un accueil, pas une pub. La vidéo ouvre l'écran « Bienvenue dans GCC » de la visite
(Accueil.tsx, à la place du logo) et montre en 21 s ce qu'un nouveau membre trouvera, avec le vrai site.
**Ton** : `polished` adouci — chaleureux, sobre (5C1 Encre · Relief), tutoiement, mots du site.
**Format** : carré 1080×1080, 30 i/s, ~21 s ; lu muet par défaut, musique au bouton « son ».
**Lisibilité** : affichée ~340 px de large sur téléphone → légendes ≥ 68 px dans le cadre (≈ 21 px à l'écran).
**Musique** : originale, synthétisée (numpy) — ré majeur (tonalité recommandée la plus fréquente), I–V–vi–IV
(D A Bm G), 96 bpm, mesure = 2,5 s ; chaque coupe tombe sur un temps fort, carillon dans la tonalité.
**Données** : captures Playwright du vrai site (serveur local, session simulée) ; profil fictif « Nina »,
présidence « Océane R. » (inventés) ; aucune donnée Firestore réelle, pas de planning (vrais noms).

| # | Temps | Légende (écran) | Image |
|---|---|---|---|
| 1 | 0–2,5 | **Bienvenue dans GCC** · L'app de l'église. | logo, halos rouge/bleu de `.panneau-marque` |
| 2 | 2,5–5 | Tous les chants, en français et en 中文. | téléphone : la liste des chants défile |
| 3 | 5–10 | Dans ta tonalité, en un geste. | Gloire à Son Nom ; toucher sur « + » à 6,25 s, G → A♭, zoom sur les accords |
| 4 | 10–12,5 | Les partitions 简谱, transposées sur le scan. | 十架的大能, scan + calque d'accords |
| 5 | 12,5–15 | Les chants du culte, dans l'ordre. | setlist, les 4 chants arrivent sur le temps |
| 6 | 15–17,5 | Et le dimanche, le Mode Louange. | téléphone entier, « Ensuite : 十架的大能 » |
| 7 | 17,5–21 | **C'est parti.** | logo + la vraie barre d'onglets |

Accroche : le logo et « Bienvenue » posés dès 0,5 s — pour un nouveau membre, la première seconde doit dire
« c'est chez toi ». Chute : « C'est parti. », le mot de la fin de la visite actuelle.
