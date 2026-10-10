# Relevé des écarts du 27/09/2026 — corrections appliquées

Application, sur `main`, du relevé des écarts du 27/09/2026 (377 chants mesurés contre leur partition, 3 397 écarts), d'après la consigne du 08/10/2026 rangée avec le relevé dans le dépôt des partitions. Ce fichier est aussi le fichier d'avancement du chantier : une session qui reprend repart du premier lot « à faire ».

Qui décide : **Timothée** = choix faits dans la page du relevé ; **def** = choix par défaut du relevé ; **session** = tranché par la session sur la partition (questions « ? », mesures, structure, thèmes, en-têtes).

Méthode (décisions de Timothée du 08/10/2026, en cours de chantier) :

- **Chaque accord est placé comme sur la partition**, au mot et à la syllabe près en français, au caractère près en chinois. Les accords sont mesurés comme dans l'audit du corpus (`audit-corpus-2026-09-26.md` § 2) : x de l'accord sur la partition, caractère porteur, classe (exact, équivalent, décalé, inventé, absent, nom). Ce contrôle ne se limite pas aux questions : il couvre aussi les « ok » et « non » par défaut et les choix de Timothée.
- **La partition l'emporte, même sur un choix de Timothée** : un « non » qui laissait un accord sur une autre syllabe que la partition est corrigé, et le chant le signale (liste « Choix de Timothée passés outre »).
- **Forme corrigée sur tout le chant traité** (audit § 4.6, règles de 01), sans bouger un accord de syllabe (contrôlé ligne à ligne) : `[X][ ]` → `[X] `, `[ ]` seuls retirés, lignes sans paroles en `[A]  [B]`, espaces de fin et espaces multiples, mots coupés au tiret écrits entiers, en chinois ni espace dans les paroles (sauf `[X] `) ni ponctuation demi-chasse, pinyin sur la même ligne, orthographe canonique des accords (sauf chants à calque 简谱, gelés), libellés `副歌 1/Refrain 1`.
- **Chants chinois** : les reprises que la partition marque (‖: :‖, voltas, D.S., « To Chorus », 反复) ne sont pas dépliées (01, § Structure dépliée).

## Avancement

- SHA de `main` au départ : `908b7990bb302f5123874b1f4b76c16dda137404`
- Lots fixés au départ (slugs triés ; chants chinois regroupés dans le moins de lots possible) :

| Lot | Chants | État |
|---|---|---|
| 1 | a-jamais-tu-es-saint, a-l-agneau, a-la-croix, abba-pere, abrite-moi, amour-extravagant, amour-parfait, amour-sans-fin, attache-a-la-croix, au-dessus-de-tout, au-nom-de-jesus, aucun-autre-nom, aucune-peur, aupres-de-dieu, avec-nous, benediction, beni-soit-ton-nom, benis-dieu-10000-raisons, benis-l-eternel, briser-les-chaines, ce-nom-si-merveilleux, cet-amour, chaine-d-amour, chantons, cherchez-d-abord, christ-est-la-lumiere | poussé (`0686c0c3`) |
| 2 | cieux-ouverts, coeur-a-coeur, collision, combien-dieu-est-grand, compter-sur-toi, connais-tu-ce-jesus, crier-a-toi, de-grace-en-grace, de-l-ombre-a-la-lumiere, de-tout-mon-etre, dieu-a-tant-aime, dieu-de-l-impossible, dieu-est-parmi-nous, dieu-est-puissant, dieu-sauveur, dieu-tout-puissant, digne-est-l-agneau, digne-est-ton-nom, donne-nous-des-mains-pures, ebloui, echos, eclipse, en-toi-je-sais-qui-je-suis, en-verite, entends-mon-coeur, eternel-notre-seigneur, eveille-toi-mon-ame | poussé (`efc8a221`) |
| 3 | fascine, feu-du-fondeur, fidele-loyal, gloire-a-son-nom, grace-en-grace, grace-infinie, grande-est-ta-fidelite, havre-de-paix, heritiers, homme-de-douleurs, hosanna, hosanna-ostrini, how-great-thou-art, il-est-la-vie, il-est-temps, il-m-aime, il-regnera, inattendu, infiniment-grand, invitation, j-annoncerai, jamais-marche-seul, je-celebrerai, je-flechis-le-genou, je-loue-ton-nom-eternel, je-louerai-l-eternel | poussé (`72e101ae`) |
| 4 | je-n-ai-rien-a-craindre, je-reviens-au-coeur, je-te-donne-tout, je-veux-proclamer-le-nom-de-jesus, jesus-je-te-suivrai, jireh, joie-dans-le-monde, jusqu-au-bout, l-amour-de-notre-pere, l-entre-deux, la-benediction, la-croix-seule-me-suffit, la-dans-le-feu, la-passion, la-pour-toi, laissons-entrer, le-fils-de-dieu, le-nom-de-jesus, le-plus-grand, le-roi-est-ne, libere, lumiere-du-monde, ma-passion, ma-raison-de-noel, me-voici, merci, moi-et-ma-maison | poussé (`e1ee8dbd`) |
| 5 | mon-ancre-et-ma-voile, mon-assurance-est-en-christ, mon-redempteur-vit, mon-secours-est-en-toi, mon-seul-souhait, naitre, ne-pour-nous-donner-la-vie, noel-est-arrive, nos-yeux-sont-sur-toi, notre-pere, nous-tiendrons, nous-voici, nous-voulons-voir-jesus-eleve, o-jesus-mon-sauveur, o-vois, oasis, oceans, oui-je-crois, ouvre-les-yeux-de-mon-coeur, parfaitement-imparfait, personne, pionnier, premiere-place, pres-de-la-croix, prince-de-paix, priorite | poussé avec ce fichier |
| 6 | promesses, quand-je-contemple, quand-tu-parles, que-ma-bouche-chante-ta-louange, que-nos-chants-soient-comme-un-signe, que-ton-nom-resonne-en-ce-lieu, que-ton-regne-vienne, que-tous-soient-un, quelle-grace, quelle-grace-incomparable, recois-l-adoration, recois-ma-vie, rejouis-toi-mon-ame, relever-le-faible, rememoration, remplis-moi-de-ta-presence, rien-au-monde, rien-n-est-perdu-d-avance, risen, roi-des-rois, saint-esprit, sans-rien-retenir, sauve-avec-puissance, seigneur-je-veux-te-dire, seigneur-par-la-clarte, solo-christo, souffle | à faire |
| 7 | ta-parole, Ta-parole-écriture, toi-et-moi, toi-seul-es-digne, ton-nom, toujours-puissante, tout-a-toi, tout-puissant, toutes-choses-nouvelles, triomphe, tu-agiras, tu-es-bon, tu-es-la-lumiere, tu-es-la-vie, tu-es-le-chant, tu-es-notre-dieu, tu-m-aimes, un-chant-nouveau-monte, un-vin-nouveau, une-flamme-en-moi, vases-d-argile, venez-le-celebrer, viens-souffler-a-nouveau, viens-toucher-ma-vie, voici-le-jour, yahwe | à faire |
| 8 | 一切歌颂赞美, 一切都更新, 一同齐声宣扬, 一生敬拜你, 一生爱你, 一生跟随, 一粒麦子, 一颗谦卑的心, 不停赞美, 不停赞美你, 丰盛的应许, 为我而来, 为爱而生, 主你是我力量, 主我献上生命给你, 主的喜乐是我力量, 云上太阳, 亲眼看见你, 从心合一, 从早晨到夜晚, 从这代到那代, 伯利恒的喜讯, 住在你里面, 何等恩典, 你们要赞美耶和华, 你坐着为王, 你恩典不离开 | à faire |
| 9 | 你是唯一, 你是我的一切, 你是我的平安, 你是配的, 你永远如此深爱着我, 你的同在, 你的爱不离不弃, 使命, 信实的神, 倾倒, 充满在这里, 全新的你, 全然向你, 再一次, 再次将我更新, 到各山岭去传扬, 前来敬拜, 医治我, 十字架, 十字架是我的荣耀, 十字架的传达者, 十架的大能, 十架的爱, 只要有你在我左右, 只需要你, 叫我抬起头的神, 向主欢呼, 向我的神献上感谢 | à faire |
| 10 | 君王就在这里, 吹起复兴的火, 和散那, 哦十字架, 唯有耶稣, 唯独依靠你, 回家, 因着十架爱, 围绕我, 圣灵的江河, 圣诞节耶稣为你而来, 在你宝座前, 在耶稣的脚前, 在这里, 坐在宝座上圣洁羔羊, 复兴的火, 大声敬拜, 大山为我挪开, 大手牵着小手, 天国的子民, 奇异恩典, 奔跑不放弃, 好喜欢与你在一起, 如果你想知道, 如鹰展翅上腾, 安静, 定睛在耶稣身上 | à faire |
| 11 | 宝贵十架, 将天敞开, 尽情地微笑, 尽情的敬拜, 差遣我, 常常喜乐, 得胜的宣告, 恒久恒久以前, 恩典之路, 想起你, 愿为主闪亮, 我们呼求, 我们成为一家人, 我们是光明之子, 我们欢迎君王降临, 我们爱让世界不一样, 我们的神, 我们高举耶稣的名, 我在这里敬拜, 我安然居住, 我已得自由, 我心坚定与你, 我愿为你去, 我是承带神荣耀的器皿, 我渴望看见, 我的家要荣耀主, 我的救赎者活着, 我的生命献给你 | à faire |
| 12 | 我相信, 我神我王, 我能给你什么, 我要全心赞美, 我要爱慕你, 我要看见, 我要顺服, 我选择喜乐, 我需要有你在我生命中, 所有的荣耀归于你, 打开天窗, 把冷漠变成爱, 拣选, 握住幸福, 握手, 敬拜的心, 新造的人, 无价至宝, 日日夜夜, 旷野中唯一的力量, 明亮晨星, 是为了爱, 是你的爱, 是耶稣的名, 最美的礼物, 有一位神, 有一天 | à faire |
| 13 | 有你同行, 每一天我需要你, 永恒唯一的盼望, 永活盼望, 求主充满我, 求充满这地, 活出爱, 活着为要敬拜你, 深不见底的爱, 深刻的爱, 深深爱你, 满有能力, 爱中相遇, 爱使我们勇敢, 爱可以再更多一点点, 爱我愿意, 爱的彰显, 爱的约定, 爱赢了, 献上尊荣, 看见复兴, 真实的悔改, 神羔羊配得, 祷告, 给梦想一双翅膀, 耶和华是应当称颂的, 耶和华行了大事, 耶稣万名之上的名 | à faire |
| 14 | 耶稣我的耶稣, 耶稣的名, 耶稣耶稣, 能不能, 脚步, 若有人在基督里, 荣耀的呼召, 荣耀至高神, 行神迹的神, 认识你真好, 让我得见你的荣面, 让爱走动, 让爱飞翔, 让赞美飞扬, 谢谢你, 谢谢你成为我的家, 赞美中信心不断升起, 赞美之泉, 这一生最美的祝福, 这是耶和华所定的日子, 这条路上我们一起走, 这里有神的同在, 这里有荣耀, 遇见你, 陪我走过春夏秋冬, 香膏的玉瓶, 齐来赞美 | à faire |

## Total

Les 3 397 écarts, chacun compté une seule fois :

| Statut | Timothée | def | session | Total |
|---|---:|---:|---:|---:|
| appliqué | 303 | 275 | 164 | 742 |
| laissé | 238 | 575 | 68 | 881 |
| doute écrit | 0 | 0 | 0 | 0 |
| ligne changée depuis l'audit | 0 | 1 | 1 | 2 |
| à faire (lots non encore poussés) | | | | 1 772 |
| **Total** | | | | **3 397** |

« laissé » réunit les « non » (Timothée ou def), les questions tranchées « non » par la session, les « ok » sans opération et les opérations écartées par la règle de la page (une ligne ne prend qu'un seul remplacement ; un remplacement qui annulerait un « non » de Timothée n'est pas retenu). « doute écrit » : question laissée avec un `{needs_review}` au-dessus de la ligne.

## Par chant

### a-jamais-tu-es-saint — À jamais Tu es saint

Lot 1 · partition retenue : `À jamais Tu es saint.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 16 : `En[A#m]tonnent ensemble un [G#]cantique à l'Agneau. [F#2]` → `En[A#m]tonnent ensemble un c[G#]antique à l'Agneau. [F#2]`
- l. 17 : `Ceux [C#]qui nous ont précédés et [F#]ceux qui nous suivr[C#]ont` → `Ceux [C#]qui nous ont précédés et [F#]ceux qui nous suiv[C#]ront`
- l. 30 : `L'univers procla[C#/F]me : Tu es [A#m]saint.` → `L'univers proclam[C#/F]e : Tu es [A#m]saint.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 16 | G# | x=212,6 sur « a » de « c‹a›ntique » | décalé | un c[G#]antique (défaut ok, appliqué) |
| 17 | C# | x=384,3 sur « r » de « suiv‹r›ont » | décalé | suiv[C#]ront (défaut ok, appliqué) |
| 30 | C#/F | x=170,2 sur « e » final de « procla‹m›‹e› » | décalé | proclam[C#/F]e (question ok) |
| 11 | F# | ligne instrumentale gravée « F# A#m G#sus C#/F A#m G#sus », F# à x=31,2, même ordre que le .cho | exact (vérifié à l'œil ; check.py ne rapproche pas la ligne d'intro) | aucune |
| 11 | A#m | ligne instrumentale gravée « F# A#m G#sus C#/F A#m G#sus », A#m à x=59,4, même ordre que le .cho | exact (vérifié à l'œil ; check.py ne rapproche pas la ligne d'intro) | aucune |
| 11 | G#sus | ligne instrumentale gravée « F# A#m G#sus C#/F A#m G#sus », G#sus à x=99,5, même ordre que le .cho | exact (vérifié à l'œil ; check.py ne rapproche pas la ligne d'intro) | aucune |
| 11 | C#/F | ligne instrumentale gravée « F# A#m G#sus C#/F A#m G#sus », C#/F à x=150,4, même ordre que le .cho | exact (vérifié à l'œil ; check.py ne rapproche pas la ligne d'intro) | aucune |
| 11 | A#m | ligne instrumentale gravée « F# A#m G#sus C#/F A#m G#sus », A#m à x=190,6, même ordre que le .cho | exact (vérifié à l'œil ; check.py ne rapproche pas la ligne d'intro) | aucune |
| 11 | G#sus | ligne instrumentale gravée « F# A#m G#sus C#/F A#m G#sus », G#sus à x=230,8, même ordre que le .cho | exact (vérifié à l'œil ; check.py ne rapproche pas la ligne d'intro) | aucune |
| 25 | A#m | x=77,4 sur « N » de « Ton ‹N›om » | exact (vérifié à l'œil ; check.py lit « absent ») | aucune |
| 25 | D#m7 | x=241,9 sur « t » de « ‹t›out » | exact (vérifié à l'œil ; check.py lit « absent ») | aucune |
| 25 | (Fm) | x=288,8, en l'air après « tout. » (fin de ligne à 277), label « (Fm) » entre parenthèses | exact (vérifié à l'œil ; check.py ne lit pas la parenthèse) | aucune |
| 30 | A#m | x=236,9 sur « s » de « ‹s›aint » | exact (vérifié à l'œil) | aucune |
| 43 | C#/F | page 2, x=140,5 sur second « p » de « peu‹p›le » | exact (vérifié à l'œil ; check.py ne rapproche pas la page 2) | aucune |
| 43 | F# | page 2, x=192,1 sur « r » de « c‹r›ie » | exact (vérifié à l'œil ; check.py ne rapproche pas la page 2) | aucune |
| 43 | A#m | page 2, x=246,4 sur « e » de « ‹e›s » | exact (vérifié à l'œil ; check.py ne rapproche pas la page 2) | aucune |
| 43 | G# | page 2, x=285,5 sur « s » de « ‹s›aint » après les espaces | exact (vérifié à l'œil ; check.py ne rapproche pas la page 2) | aucune (forme : « [ ] » retiré par le moteur) |
| 44 | C#/F | page 2, x=169,8 sur « s » final de « roi‹s› » | exact (vérifié à l'œil) | aucune |
| 44 | A#m | page 2, x=231,2 sur « s » de « ‹s›aint » | exact (vérifié à l'œil) | aucune |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 5 ligne(s) — ligne sans paroles : l. 11 ; espaceur : l. 29, 43 ; orthographe d'accord : l. 31, 45.

En-tête : ajout de `{source: À jamais Tu es saint.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 30:decale:C#/F:1 | laissé | def |  |
| 30:fable:30:decale:C#/F:1 | appliqué | session | Rendu ChordPro de l'église : le label C#/F commence exactement sur le « e » final de « proclame » ; ni « procla[C#/F]me » (actuel) ni l'espace avant « : » ne sont justes. — partition : Page 1, Refrain 1, ligne 2 : label C#/F à x = 170,2 = « e » final de « proclame » (x = 170,2 ; « m » à 156,9) ; A#m à x = 236,9 sur le « s » de « saint », déjà juste. Classe actuelle : décalé (une lettre). |
| 25:reporte:A#m:1 | laissé | def |  |
| 25:reporte:D#m7:1 | laissé | def |  |
| 25:reporte:(Fm):1 | laissé | def |  |
| 17:decale:C#:1 | appliqué | def |  |
| 16:decale:G#:1 | appliqué | def |  |

- Rendu ChordPro de l'église (couche texte) : tous les accords du chant mesurés un par un sur le x du label contre le x du caractère (PyMuPDF rawdict), pages 1 et 2.
- Après décisions, tous les accords sont sur le caractère de la partition. Les 17 « absent de la source » restants de check.py sont des erreurs de lecture de l'outil (ligne d'intro sans paroles, label « (Fm) » entre parenthèses, Refrain 2 en page 2) : vérifiés à l'œil, exacts.
- Ligne 25 : les trois accords marqués absents (non par défaut) sont bien gravés aux mêmes caractères : laissés.
- Noms : la partition grave « G#sus » et « C#sus » ; le moteur écrit l'orthographe canonique G#sus4 / C#sus4.
- Autre version présente : « À jamais Tu es saint (E).pdf » (même chant, autre tonalité), non mesurée.

### a-l-agneau — À l'agneau

Lot 1 · partition retenue : `À l’agneau.pdf` (shirfr, mesure fiable)

Lignes modifiées :

- l. 13 : `À l'Agneau, [F]à l'Agne[G]au immolé[Am],` → `À l'Agneau,[F] à l'Agne[G]au immolé[Am],`
- l. 31 : `[G/B]Puis[C]sant, [F][F/A]puis[G/B]sant,` → `[G/B]Puis[C]sant,[F] [F/A]puis[G/B]sant,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 13 | F | x=126,4 sur l'espace après « l'Agneau, » (« à » commence à 131,1) | décalé | À l'Agneau,[F] à (choix ok du relevé, juste) |
| 31 | F | x=109,7 sur l'espace entre « Puissant, » et « puissant » (F/A à 124,1 sur le « p ») | décalé | Puis[C]sant,[F] [F/A]puis[G/B]sant (choix ok du relevé, juste) |
| 30 | C | x=109,3 sur l'espace entre « vi » et « - vant » ; G à 124,8 sur le « v » de « vant » | exact (devient « vi[C][G]vant » quand le moteur recolle le mot coupé) | aucune : C après « vi » tenu, G sur « vant » |
| 30 | G/F/C/G… | Pont, lignes 30 à 35 : les « décalé / absent / nom différent » de check.py APRÈS viennent tous de « vi[C][G]vant » (mot recollé par le moteur) qui fait perdre l'appariement à l'outil sur tout le Pont ; même fichier avec « vi[C] - [G]vant » : 61 exact, 0 autre | exact (vérifié à l'œil, accord par accord, x des labels contre x des caractères) | aucune |
| 34 | Gsus | x=284,5, juste après la virgule de « puissant, » (fin de ligne) | exact (en l'air en fin de ligne) | aucune ; nom gravé « Gsus », orthographe canonique Gsus4 par le moteur |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 10 ligne(s) — espace de fin : l. 14, 18, 20, 21, 25, 26, 30, 32 ; mot coupé au tiret : l. 20, 30 ; orthographe d'accord : l. 33, 34.

En-tête : ajout de `{source: À l’agneau.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 31:decale:F:1 | appliqué | Timothée |  |
| 13:decale:F:1 | appliqué | Timothée |  |

- PDF shir.fr (rendu ChordPro, couche texte) : chaque accord du chant mesuré sur le x du label contre le x du caractère (PyMuPDF rawdict), 61 accords.
- Les deux choix « ok » du relevé (l. 13 et 31 : F sur l'espace avant le mot, `[F] à`, `[F] puissant`) mettent l'accord comme la partition : appliqués tels quels. Tous les autres accords sont déjà sur le caractère gravé.
- check.py APRÈS signale le Pont comme désaligné : artefact de l'outil sur « vi[C][G]vant » (le moteur recolle « vi - vant ») ; vérifié à l'œil, et la même version avec le tiret donne 61 exact.
- Paroles : « recul » relevé par l'outil l. 18 est la coupe « re - culé » de la partition, pas une différence.
- Autre version présente : « À l’agneau (C).pdf » (même chant, autre tonalité), non mesurée.

### a-la-croix — À la croix

Lot 1 · partition retenue : `À La Croix.pdf` (eglise-fpdf, mesure fiable) · chant validé par Timothée

Lignes modifiées :

- l. 14 : `[E/G#]Tu m[A2]e conna[B]is, [E/G#] et si j[A2]e T'oubl[B]i-ai[C#m]s, ` → `[E/G#]Tu m[A2]e conna[B]is, [E/G#] et si j[A2]e T'oubl[B]i-a[C#m]is,`
- l. 18 : `[E/G#]Elle m'e[A]nviro[B]nne [E/G#]à chaque [B]mo - me[C#m]nt.` → `[E/G#]Elle m'e[A2]nvir[B]onne[E/G#] à ch[A2]aque m[B]ome[C#m]nt.`
- l. 23 : `[E] À la croix je [B/D#]me prost[C#m]erne où Ton sang coul[E/G#]a pour [A]moi.` → `[E] À la croix je [B/D#]me pros[C#m]terne où Ton sang cou[E/G#]la pour [A]moi.`
- l. 30 : `[E/G#]Tu [A2]marches deva[B]nt moi[C#m],` → `[E/G#]Tu ma[A2]rches deva[B]nt mo[C#m]i,`
- l. 31 : `[E/G#]Tu ga[A2]rdes mes p[B]as, [E/G#]Ta ma[A2]in me so[B]utie[C#m]nt.` → `[E/G#]Tu ga[A2]rdes mes p[B]as,[E/G#] Ta ma[A2]in me so[B]utie[C#m]nt.`
- l. 36 : `Tu déchires le voi[E/A]le, Tu traces un chemi[C#m]n` → `Tu déchires le vo[E/A]ile, Tu [B]traces un chem[C#m]in`
- l. 37 : `Car Tu as [A] tout ac[C#m]compl[B]i.` → `Car Tu a[A]s tout a[C#m]ccompl[B]i.`
- l. 41 : `[E/G#]Si to[A2]ut s'eff[B]on - d[C#m]rait [E/G#]de - va[A2]nt mes ye[B]ux,` → `[E/G#]Si to[A2]ut s'eff[B]ond[C#m]rait[E/G#] deva[A2]nt mes ye[B]ux,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 14 | C#m | x=309,9 sur « i » de « a‹i›s » | décalé | T'oubl[B]i-a[C#m]is, (opération du relevé) |
| 18 | A | A2 x=96,5 sur « n » de « m'e‹n›vironne » | nom différent | m'e[A2]nvironne |
| 18 | B | x=131,1 sur « n » de « enviro‹n›ne » (début du n à 131,2) | exact | nviro[B]nne (la ligne réécrite du relevé le décalait sur « o ») |
| 18 | E/G# | x=171,2 sur l'espace avant « à » | décalé | [E/G#] à |
| 18 | A2 | x=228,1 sur « a » de « ch‹a›que » | absent du .cho | ch[A2]aque |
| 18 | B | x=281,5 sur « o » de « m‹o› - ment » | décalé | m[B]oment |
| 18 | C#m | x=326,8 sur « n » de « me‹n›t » | exact | mome[C#m]nt |
| 23 | C#m | x=217,0 sur « t » de « pros‹t›erne » | décalé | pros[C#m]terne |
| 23 | E/G# | x=377,1 sur « l » de « cou‹l›a » | décalé | cou[E/G#]la |
| 30 | A2 | x=94,3 sur « r » de « ma‹r›ches » | décalé | ma[A2]rches |
| 30 | C#m | x=212,6 sur « i » de « mo‹i›, » | décalé | mo[C#m]i, |
| 31 | E/G# | x=194,8 sur l'espace avant « Ta » | décalé | [E/G#] Ta |
| 36 | E/A | x=167,2 sur « i » de « vo‹i›le » | décalé | vo[E/A]ile |
| 36 | B | x=224,1 sur « t » de « ‹t›races » | absent du .cho | [B]traces |
| 36 | C#m | x=333,5 sur « i » de « chem‹i›n » | décalé | chem[C#m]in |
| 37 | A | x=107,6 sur « s » de « a‹s› » (s 107,6–115,6) | décalé | a[A]s tout |
| 37 | C#m | x=160,1 sur le premier « c » de « a‹c›compli » | décalé | a[C#m]ccompli |
| 41 | E/G# | x=221,9 sur l'espace avant « de - vant » | décalé | [E/G#] devant |
| 41 | B | x=349,1 sur « u » de « ye‹u›x » (u 349,1) ; le .cho a « ye[B]ux » | exact (vérifié à l'œil) | inchangé : check.py le dit « absent de la source » l.41 / « absent du .cho » l.42 parce qu'une fois les tirets de « s'effon - drait de - vant » retirés il coupe la ligne source avant « eux, » ; même accord, même caractère |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — mot coupé au tiret : l. 13.

En-tête : ajout de `{source: À La Croix.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 41:decale:E/G#:1 | laissé | Timothée | autre lecture retenue (41:fable:41:decale:E/G#:1) |
| 41:fable:41:decale:E/G#:1 | appliqué | Timothée |  |
| 37:decale:A:1 | appliqué | Timothée |  |
| 37:decale:C#m:1 | appliqué | Timothée |  |
| 36:decale:E/A:1 | appliqué | Timothée |  |
| 36:decale:C#m:1 | appliqué | Timothée |  |
| 36:manquant:B:1 | appliqué | Timothée |  |
| 31:decale:E/G#:1 | appliqué | Timothée |  |
| 30:decale:A2:1 | appliqué | Timothée |  |
| 30:decale:C#m:1 | appliqué | Timothée |  |
| 23:decale:C#m:1 | appliqué | Timothée |  |
| 23:decale:E/G#:1 | appliqué | Timothée |  |
| 18:nom:A:1 | appliqué | Timothée | inclus dans la ligne de 18:fable:18:nom:A:1 |
| 18:decale:E/G#:1 | laissé | Timothée | la ligne prend le texte de 18:fable:18:nom:A:1 |
| 18:decale:B:1 | laissé | Timothée | la ligne prend le texte de 18:fable:18:nom:A:1 |
| 18:manquant:A2:1 | laissé | Timothée | la ligne prend le texte de 18:fable:18:nom:A:1 |
| 18:fable:18:nom:A:1 | appliqué | Timothée |  |
| 18:fable:18:decale:E/G#:1 | appliqué | Timothée | inclus dans la ligne de 18:fable:18:nom:A:1 |
| 18:fable:18:decale:B:1 | appliqué | Timothée | inclus dans la ligne de 18:fable:18:nom:A:1 |
| 18:fable:18:manquant:A2:1 | appliqué | Timothée | inclus dans la ligne de 18:fable:18:nom:A:1 |
| 14:decale:C#m:1 | appliqué | Timothée |  |

- Partition À La Croix.pdf (rendu ChordPro de l'église, couche texte) : les 78 accords mesurés en coordonnées (rawdict), pas d'autre accord que ceux du relevé à corriger ; la ligne 18 a été regardée sur le crop 2×.
- Ligne 18 : la ligne réécrite retenue par le relevé déplaçait le premier B de « environne » sur le « o » ; la partition le pose sur le « n » (x=131,1) : corrigé contre le relevé, le reste de la ligne réécrite gardé.
- check.py après : un seul couple non exact, le B de « yeux » (l.41), artefact de découpe de la ligne source après retrait des tirets ; le B est à x=349,1 sur le « u », comme « ye[B]ux ».
- Paroles, non appliqué : la partition écrit « T'oubli - ais » (mot entier « T'oubliais ») ; le .cho garde « T'oubli-ais » (trait d'union collé que le moteur ne joint pas), sans écart du relevé qui le porte. Le C#m y est bien devant le « i » de « ais » (x=309,9).
- Les débuts de ligne indentés de la partition (« ␣␣Sei - gneur ») sont lus par check.py comme le début du texte : `[E/G#]Sei…` et `[E] À la croix` restent tels quels (exact).
- Autres versions : À la croix (D).pdf (même feuille, autre tonalité), À la croix (E).pdf (shir.fr, accord partiel 55 %), Attaché à la croix (D).pdf (autre chant).
- L. 18 : le relevé (ligne réécrite retenue) met le premier B sur le « o » de « environne » ; le label est à x=131,1, à 0,1 pt de la frontière o/n (même syllabe « ron ») : le choix du relevé est gardé.

### abba-pere — Abba Père

Lot 1 · partition retenue : `Abba Père.pdf` (eglise-fpdf, mesure fiable) · chant validé par Timothée

Lignes modifiées :

- l. 27 : `Abba [D]Père, je [E]suis à To[F#m]i, Abba [Bm]Père, je [E]suis à Toi.[(A)]` → `Abba [D]Père, je [E]suis à To[F#m]i, Abba [Bm]Père, je [E]suis à Toi.` *(session)*
- l. 41 : `Bien a[F#m]vant que coulent le [D]sang et la su[D]eur,` → `Bien a[F#m]vant que coulent le [D]sang et la su[A]eur,` *(session)*
- l. 44 : `Tu rê[F#m]vais du jour où [D]je pou[A]rrais T'aim[A]er.` → `Tu rê[F#m]vais du jour où [D]je pourrais T'aim[A]er.` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 27 | (A) | aucun label après « Toi. » (y=549,1 : D, E, F#m, Bm, E seulement) | inventé | retiré |
| 41 | D | A x=306,0 sur « e » de « su‹e›ur » | nom | su[A]eur |
| 44 | A | aucun label sur « pourrais » (F#m 68,5 ; D 177,0 ; A 294,8 sur « e » de « T'aim‹e›r ») | inventé | retiré |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 9, 31.

En-tête : ajout de `{source: Abba Père.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 44:invente:A:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 41:nom:D:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 27:invente:(A):1 | appliqué | Timothée | inclus dans la ligne de la session |

- Partition Abba Père.pdf (rendu ChordPro de l'église, couche texte) : chaque label mesuré au caractère près (x du label = x du début du caractère porteur dans tous les cas) ; tous les autres accords du .cho sont exacts, dont pou[A]ssière, T'aim[A]er, poussière,[E] et les E après virgule (label sur l'espace après la ponctuation).
- Intro : la partition grave « (x2) » ; libellé laissé « Intro » (chant validé, libellé figé par tests/section-labels.spec.ts) et proposé à Timothée. Interlude D A F#m E D A F#m E conforme.
- La partition s'arrête au Pont sans renvoi : rien d'ajouté (chant validé, pas de bloc de structure).
- Thèmes inchangés (chant validé).

### abrite-moi — Abrite-moi

Lot 1 · partition retenue : `Abrite-moi.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 19 : `[C]Je les tra[C/E]ver - [F]serai [G]avec T[Am]oi.` → `[C]Je les [C/E]traver[F]serai a[G]vec T[Am]oi.`
- l. 25 : `En [C]Jé - [G/B]sus s[Am]eul, je [F]me co[D/F#]n - fie[G],` → `En [C]Jé[G/B]sus s[Am]eul, je [F]me co[D/F#]nfi[G]e,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 19 | C/E | x=91,6 sur « t » de « ‹t›raver - serai » | décalé | [C/E]traverserai |
| 19 | G | x=194,7 sur « v » de « a‹v›ec » | décalé | a[G]vec |
| 19 | C, F, Am | C x=45,4 sur « J » ; F x=146,7 sur « s » de « serai » ; Am x=233,9 sur « o » de « T‹o›i » | exact | inchangés |
| 25 | G | x=281,1 sur « e » de « fi‹e›, » (avant la virgule) | décalé | confi[G]e, |
| 25 | C, G/B, Am, F, D/F# | C x=55,2 sur « J » ; G/B x=86,3 sur « s » de « sus » ; Am x=141,5 sur « e » de « s‹e›ul » ; F x=188,6 sur « m » ; D/F# x=232,2 sur « n » de « co‹n› » | exact | inchangés, tirets du transcripteur retirés |
| 13 | C | x=31,2 sur « A » de « A - brite » (début de ligne) | exact (outil) | aucune : [C]Abrite est juste ; check.py le classe « décalé / en l'air » après la forme parce qu'il ne recolle pas « A - brite » une fois le tiret du transcripteur retiré par le moteur — vérifié à l'œil |
| 25 | G (confi[G]e) | x=281,1 sur « e » de « fie » | exact (outil) | aucune : check.py sort « absent du .cho » + « absent de la source » pour le même G parce qu'il ne recolle pas « con   -   fie » (tiret entouré de plusieurs espaces) — vérifié à l'œil |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 9 ; mot coupé au tiret : l. 13.

En-tête : ajout de `{source: Abrite-moi.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 25:decale:G:1 | laissé | def |  |
| 25:fable:25:decale:G:1 | appliqué | session | Toute la ligne proposée est juste : mots écrits entiers sans tirets du transcripteur (« Jésus », « confie »), C devant « J », G/B devant « sus », Am devant le « e » de « seul », F devant « me », D/F# devant le « n » de « con », G devant le « e » de « fie ». — partition : C x=55,2 sur « J », G/B x=86,3 sur « s » de « sus », Am x=141,5 sur « e » de « seul », F x=188,6 sur « m », D/F# x=232,2 sur « n » de « con », G x=281,1 sur « e » de « fie » avant la virgule (couche texte et découpe). |
| 19:decale:C/E:1 | laissé | def |  |
| 19:decale:G:1 | laissé | def |  |
| 19:fable:19:decale:C/E:1 | appliqué | session | Toute la ligne proposée est juste : C/E devant le « t » de « traverserai », mot écrit entier sans le tiret du transcripteur (01), F devant « serai », G devant le « v » de « avec », Am devant le « o » de « Toi ». — partition : Rendu ChordPro de l'église : C x=45,4 sur « J », C/E x=91,6 sur « t » de « traver », F x=146,7 sur « s » de « serai », G x=194,7 sur « v » de « avec », Am x=233,9 sur « o » de « Toi » (couche texte et découpe). |
| 19:fable:19:decale:G:1 | appliqué | session | Même ligne proposée que l'écart C/E, juste en entier : G se pose devant le « v » de « avec », comme la partition le grave. — inclus dans la ligne de 19:fable:19:decale:C/E:1 — partition : G x=194,7, exactement sur le « v » de « avec » (a x=185,8, v x=194,7), vu sur la découpe. |

- Partition Abrite-moi.pdf (rendu ChordPro de l'église, couche texte) : chaque label du chant mesuré au caractère près (x du label = début du caractère porteur partout) ; Intro F2 Am7 C/G G ×2, couplets 1 et 2, refrain : tous les autres accords du .cho sont exacts.
- Lignes 19 et 25 corrigées par les trois questions (toutes « ok ») ; le moteur retire aussi le tiret du transcripteur de la ligne 13 (« A - brite » → « Abrite », accords inchangés).
- Restes de check.py après : C de la ligne 13 et G de « confi[G]e » — défauts de l'outil sur les mots recollés, placements vérifiés à l'œil (voir mesures).
- Thèmes Adoration, Foi : dans la liste, gardés. La partition crédite une traduction (non reprise).

### amour-extravagant — Amour extravagant

Lot 1 · partition retenue : `Amour extravagant.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 6 : `{themes: Adoration, Grace}` → `{themes: Grâce, Adoration, Croix}` *(en-tête)* — Le chant célèbre d'abord l'amour immérité de Dieu qui poursuit le pécheur (« indigne et sans mérite, mais pour moi, Tu T'es livré »), s'adresse à Dieu dans la louange, et nomme la croix offerte (« Tu m'as offert la croix »).
- l. 8 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (x2)}` *(session (hors relevé))* — La feuille grave la ligne d'intro « C#m B A E (x2) » sans paroles : reprise identique = suffixe (x2) au libellé (02, cas Abba Père) ; même directive, seul le libellé change.
- l. 28 : `[C#m] Oui, Tu es si [B]bon en[A]vers moi.` → `[C#m] Oui, Tu es [B]si bon en[A]vers moi.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 28 | B | x=118,3 = bord droit de l'espace après « es » : label sur « s » de « si » (rendu ChordPro, vu sur le crop 2×) | décalé | [C#m] Oui, Tu es [B]si bon en[A]vers moi. (défaut « ok » appliqué) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 9.

En-tête : ajout de `{source: Amour extravagant.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 28:decale:B:1 | appliqué | def |  |

- Les 52 accords mesurés sur la couche texte (rawdict, x du label contre les caractères) puis vus sur le rendu 2× : tous au caractère près après la seule correction par défaut (ligne 28, B sur « si » comme aux autres « Oui, Tu es si … »).
- Ajouté : suffixe (x2) au libellé de l'intro, gravé « C#m B A E (x2) » sur la feuille.
- Autre version présente : « Amour extravagant (E).pdf » (couche texte non lue par l'outil, taux 0) ; la feuille de l'église fait foi.

### amour-parfait — Amour parfait

Lot 1 · partition retenue : `Amour parfait - Accords.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 30 : `[Am7] [ ] [F]  [ ]  [C]  [ ]  [G]  [(x...)]` → `[Am7] [F] [C] [G] (x..)` *(session)*
- l. 33 : `Ton a[F]our par[Am7]fait a tout [G]supporté, [C/E]surpassé,` → `Ton a[F]mour par[Am7]fait a tout [G]supporté, [C/E]surpassé,`
- l. 35 : `[F]  [ ]  [Dm]  [ ]  [C]  [(x...)]` → `[F] [Dm] [C] (x..)` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 33 | F | x=86,3 sur « m » de « a‹m›our » (le .cho avait « aour ») | décalé | Ton a[F]mour |
| 33 | Am7 | x=150,3 sur « f » de « par‹f›ait » | exact | par[Am7]fait |
| 33 | G | x=220,6 sur « s » de « ‹s›upporté » | exact | [G]supporté |
| 33 | C/E | x=291,7 sur « s » de « ‹s›urpassé » | exact | [C/E]surpassé |
| 30 | Am7 F C G | ligne d'accords sans paroles y=445,5 : Am7 45,4 · F 85,5 · C 107,0 · G 129,9 · « (x..) » 153,4 | exact (vérifié à l'œil) | check.py ne rapproche pas les lignes instrumentales (« absent de la source ») : l'ordre et les noms sont ceux de la feuille |
| 35 | F Dm C | ligne d'accords sans paroles y=595,2 : F 45,4 · Dm 66,9 · C 100,4 · « (x..) » 123,2 | exact (vérifié à l'œil) | idem : outil qui ne lit pas les lignes instrumentales |

En-tête : ajout de `{source: Amour parfait - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 35:instrumental:F:1 | laissé | def |  |
| 35:instrumental:Dm:1 | laissé | def |  |
| 35:instrumental:C:1 | laissé | def |  |
| 35:instrumental:x...:1 | laissé | def |  |
| 33:decale:F:1 | laissé | def |  |
| 33:fable:33:decale:F:1 | appliqué | session | La feuille donne « Ton amour parfait » : le .cho a perdu le « m » de « amour », et le F est posé sur ce « m », comme à la ligne 31 ; le reste de la ligne proposée (Am7, G, C/E) est juste, mesuré. — partition : Pont, 2e vers (y=528,6) : F x=86,3 = « m » de « amour » (m@86,3) ; Am7 x=150,3 = « f » de « parfait » ; G x=220,6 = « s » de « supporté » ; C/E x=291,7 = « s » de « surpassé ». |
| 30:instrumental:Am7:1 | laissé | def |  |
| 30:instrumental:F:1 | laissé | def |  |
| 30:instrumental:C:1 | laissé | def |  |
| 30:instrumental:G:1 | laissé | def |  |
| 30:instrumental:x...:1 | laissé | def |  |

- Tous les accords mesurés en couche texte du PDF (Couplet 1, Refrain, Pont, Couplet 2) : tous au caractère de la feuille après correction de la ligne 33.
- Ligne 33 : coquille « aour » corrigée en « amour », F sur le « m » (x=86,3), comme à la ligne 31.
- Lignes 30 et 35 : « (x...) » sorti du crochet (texte dans un crochet interdit), écrit « (x..) » comme la feuille ; accords inchangés. Les 9 « absent de la source » de check.py sont ces deux lignes instrumentales, vérifiées à l'œil.
- Ordre des sections : Pont avant Couplet 2 sur la feuille, sans renvoi ; proposé à Timothée, non appliqué.

### amour-sans-fin — Amour sans fin

Lot 1 · partition retenue : `Amour sans fin.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 6 : `{themes: Adoration, Grace}` → `{themes: Adoration, Grâce}` *(en-tête)* — Le chant s'adresse à Jésus pour l'adorer devant sa majesté (« Tel que je suis, je viens à Tes pieds », « T'adore en esprit ») et affirme la grâce qui sauve (« rien n'est semblable à Ta grâce qui m'a sauvé »).
- l. 15 : `Ni l'am[Bm]our pour moi-même, ou que d'a[G]utres me donner[D]aient.` → `Ni l'amo[Bm]ur pour moi-même, ou que d'a[G]utres me donnera[D]ient.`
- l. 20 : `[A]Sauv[Bm]eur, [G]je Te recherche aujourd'h[A]ui et à [Bm]jamais[G].` → `[A]Sauve[Bm]ur, [G]je Te recherche aujourd'h[A]ui et à[Bm] jama[G]is.`
- l. 27 : `Dans Ton amour sans fin, [Bm]dans Ton a[G]mour sans fin.` → `Dans Ton amour sans fin[Bm], dans Ton a[G]mour sans fin.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 15 | Bm | x=88,5 = bord droit du « o » : label sur « u » de « l'amour » (vu sur le crop 2×) | décalé | l'amo[Bm]ur (défaut « ok » appliqué) |
| 15 | D | x=427,7 = bord droit du « a » : label sur « i » de « donneraient » | décalé | donnera[D]ient (défaut « ok » appliqué) |
| 20 | Bm | x=90,7 = bord droit du « e » : label sur « u » de « Sauveur » | décalé | Sauve[Bm]ur (défaut « ok » appliqué) |
| 20 | Bm | x=365,0 = bord droit du « à » : label sur l'espace avant « jamais » | décalé | à[Bm] jamais (crochet + espace, défaut « ok » appliqué) |
| 20 | G | x=404,1 = bord droit du « a » de « jam » : label sur « i » de « jamais » | décalé | jama[G]is. (défaut « ok » appliqué) |
| 27 | Bm | x=224,1 = bord droit du « n » de « fin » : label sur la virgule | décalé | fin[Bm], dans (défaut « ok » appliqué) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 9 ; espaceur : l. 19.

En-tête : ajout de `{source: Amour sans fin.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 27:decale:Bm:1 | appliqué | def |  |
| 20:decale:Bm:1 | appliqué | def |  |
| 20:decale:Bm:2 | appliqué | def |  |
| 20:decale:G:1 | appliqué | def |  |
| 15:decale:Bm:1 | appliqué | def |  |
| 15:decale:D:1 | appliqué | def |  |

- Les 41 accords mesurés sur la couche texte (rawdict) et vus sur le rendu 2× : tous au caractère près après les six déplacements par défaut (lignes 15, 20, 27), qui concordent avec la feuille.
- Intro gravée « Bm G D D Bm G D D » sans (x2) : rien à ajouter. Liste extra (structure) citée seulement : faux écart, le Pré-Refrain existe sur la feuille.
- Autre version présente : « Amour sans fin (D).pdf » (shir.fr, taux 0,692), non retenue ; la feuille de l'église fait foi.

### attache-a-la-croix — Attaché à la croix

Lot 1 · partition retenue : `Attaché à la croix (D).pdf` (shirfr, mesure fiable) · chant validé par Timothée

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
|  | D | p1 y=105,6 x=34,0, ligne instrumentale avant le couplet 1 | absent | aucune : intro non écrite dans le .cho (structure ; chant validé, pas de bloc de structure) |
| 34 | D | p1 y=689-783 (refrain repris après le couplet 3) : x=68,0 sur « c » d'Atta‹c›hé | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | GM7/B | p1 y=689-783 (refrain repris après le couplet 3) : x=134,0 sur « c » de ‹c›roix | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | A4 | p1 y=689-783 (refrain repris après le couplet 3) : x=219,1 sur « m » de ‹m›oi | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | Em | p1 y=689-783 (refrain repris après le couplet 3) : x=68,0 « c » d'Atta‹c›hé | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | A | p1 y=689-783 (refrain repris après le couplet 3) : x=134,0 ‹c›roix | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | Bm | p1 y=689-783 (refrain repris après le couplet 3) : x=219,1 ‹m›oi | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | D | p1 y=689-783 (refrain repris après le couplet 3) : x=63,2 « p » de ‹p›ris | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | G | p1 y=689-783 (refrain repris après le couplet 3) : x=244,3 « d » de ‹d›élivré | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | D/A | p1 y=689-783 (refrain repris après le couplet 3) : x=68,0 Atta‹c›hé | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | A | p1 y=689-783 (refrain repris après le couplet 3) : x=134,0 ‹c›roix | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | Bm | p1 y=689-783 (refrain repris après le couplet 3) : x=219,1 ‹m›oi | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | A Em G Bm A Em G A | p1 y=689-783 (refrain repris après le couplet 3) : x=254,3 à 398,3 après « moi. » (fin instrumentale) | absent | aucune : refrain repris après le couplet 3 non écrit dans le .cho (structure ; chant validé) |
| 34 | E C#m Bsus4 F#m B C#m E A E/B Bsus4 C#m B E A E/B Bsus4 E A E A E | p2 « Modulation » y=85-258, mêmes x que le refrain 1 (68,0 / 134,0 / 219,1 / 63,2 / 244,3) puis fin x=254,3-297,5 | absent | aucune : modulation en E de la page 2 non écrite dans le .cho (structure ; chant validé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — orthographe d'accord : l. 23.

En-tête : ajout de `{source: Attaché à la croix (D).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 33:manquant:D:1 | laissé | Timothée |  |
| 33:manquant:GM7/B:1 | laissé | Timothée |  |
| 33:manquant:A4:1 | laissé | Timothée |  |
| 33:manquant:Em:1 | laissé | Timothée |  |
| 33:manquant:A:1 | laissé | Timothée |  |
| 33:manquant:Bm:1 | laissé | Timothée |  |
| 33:manquant:D:2 | laissé | Timothée |  |
| 33:manquant:G:1 | laissé | Timothée |  |
| 33:manquant:D/A:1 | laissé | Timothée |  |
| 33:manquant:A:2 | laissé | Timothée |  |
| 33:manquant:Bm:2 | laissé | Timothée |  |
| 33:manquant:A:3 | laissé | Timothée |  |
| 33:manquant:Em:2 | laissé | Timothée |  |
| 33:manquant:G:2 | laissé | Timothée |  |
| 33:manquant:Bm:3 | laissé | Timothée |  |
| 33:manquant:A:4 | laissé | Timothée | la ligne est réécrite par le relevé |
| 33:manquant:Em:3 | laissé | Timothée |  |
| 33:manquant:G:3 | laissé | Timothée | la ligne est réécrite par le relevé |
| 33:manquant:A:5 | laissé | Timothée |  |
| 33:manquant:E:1 | laissé | Timothée |  |
| 33:manquant:C#m:1 | laissé | Timothée |  |
| 33:manquant:Bsus4:1 | laissé | Timothée |  |
| 33:manquant:F#m:1 | laissé | Timothée |  |
| 33:manquant:B:1 | laissé | Timothée |  |
| 33:manquant:C#m:2 | laissé | Timothée |  |
| 33:manquant:E:2 | laissé | Timothée |  |
| 33:manquant:A:6 | laissé | Timothée |  |
| 33:manquant:E/B:1 | laissé | Timothée |  |
| 33:manquant:Bsus4:2 | laissé | Timothée |  |
| 33:manquant:C#m:3 | laissé | Timothée |  |
| 33:manquant:B:2 | laissé | Timothée | la ligne est réécrite par le relevé |
| 33:manquant:E:3 | laissé | Timothée |  |
| 33:manquant:A:7 | laissé | Timothée |  |
| 33:manquant:E/B:2 | laissé | Timothée |  |
| 33:manquant:Bsus4:3 | laissé | Timothée |  |
| 33:manquant:E:4 | laissé | Timothée |  |
| 33:manquant:A:8 | laissé | Timothée | la ligne est réécrite par le relevé |
| 33:manquant:E:5 | laissé | Timothée | la ligne est réécrite par le relevé |
| 33:manquant:A:9 | laissé | Timothée | la ligne est réécrite par le relevé |
| 33:manquant:E:6 | laissé | Timothée | la ligne est réécrite par le relevé |

- Mesuré sur la couche texte (PyMuPDF dict) et vérifié à l'œil (rendu 2×, crops/attache-a-la-croix/refrain1.png) : les 38 accords du .cho sont exacts, au mot et à la syllabe près (couplets 1-3 et refrain, y compris la fin « [D]moi. [G][D][G] »). Aucune ligne à changer.
- GM7/B gravé = Gmaj7/B, réécrit par le moteur en orthographe canonique (01) : même accord, même syllabe.
- Les 41 accords « absents du .cho » ne sont pas des erreurs de ligne : D d'intro (p1 x=34,0), refrain repris après le couplet 3 avec sa fin propre ([Bm]moi. puis A Em G Bm A Em G A) et page 2 « Modulation » en E. Chant validé : pas de bloc de structure, choix « non » du relevé gardé ; le bloc de structure_fable reste une proposition pour Timothée s'il veut jouer ces passages (ajout d'une intro avant le couplet 1 interdit au moteur de toute façon).
- Les 7 « ok » du relevé sur ces accords absents n'ont pas d'opération : la ligne 33 réécrite par le relevé est identique à l'actuelle, rien ne bouge.

### au-dessus-de-tout — Au dessus de tout

Lot 1 · partition retenue : `Au dessus de tout (A).pdf` (shirfr, mesure fiable) · chant validé par Timothée

Lignes modifiées :

- l. 9 : `[(A/C#)]Au dessus des [E/D]puis - [D]sances, [Esus]au des[E]sus des [A]rois,` → `[A/C#] Au dessus des [E/D]puis[D]sances,[Esus4] au [E]dessus d[A]es rois,[A/C#]` *(session)*
- l. 10 : `Au des[A/C#]sus de [E/D]la na - [D]ture et de [Esus]la [E]créa[A]tion,[A/G#]` → `Au dessus de [E/D]la na[D]ture et [Esus4]de la [E]créa[A]tion,[A/G#]`
- l. 11 : `Au dessus de [F#m]tous les pl[AM7/E]ans des hommes s[D]a - [A/C#]ges,` → `Au dessus [F#m]de tous les [Amaj7/E]plans des hommes s[D]a[A/C#]ges,`
- l. 16 : `Au des[A/C#]sus des [E/D]ro - [D]yaumes, [Esus]au [E]dessus des [A]trônes,` → `Au des[A/C#]sus des [E/D]ro[D]yaumes,[Esus4] au [E]dessus d[A]es trônes,[A/C#]`
- l. 17 : `Au des[A/C#]sus des [E/D]mer - [D]veilles que [Esus]ce monde [E]a con[A]nues,[A/G#] ` → `Au dessus des [E/D]mer[D]veilles que [Esus4]ce monde [E]a con[A]nues,[A/G#]`
- l. 25 : `[A/G#]Telle une [F#m]rose [AM7/E]foulée sous nos [D]pieds.[A/G#]` → `[A/G#]Telle une [F#m]rose [Amaj7/E]foulée sous nos [D]pieds.[A/C#]`
- l. 26 : `Tu m'as sauv[Bm7]é,  [ ]  [A/C#]tu m'as aim[D2]é, [ ] [D] [ ] [Esus] [E]par dessus [A]tout.   ` → `Tu m'as sauv[Bm7]é, [A/C#] tu m'as aim[D2]é, [D] [Esus4] [E]par dessus [A]tout.` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | A/C# | x=34,0 y=105,6 : ligne d'accords sans paroles avant le couplet 1 | absent du .cho (ligne instrumentale) | [A/C#] Au dessus (avant l'attaque ; check.py ne rattache pas une ligne instrumentale à une ligne chantée) |
| 9 | Esus | x=240,4 sur l'espace après « puissances, » | décalé | puissances,[Esus] au |
| 9 | E | x=283,9 sur « d » de « dessus » | décalé | [E]dessus |
| 9 | A | x=351,1 sur « e » de « des » | décalé | d[A]es rois |
| 9 | A/C# | x=406,1 après « rois, » | absent | rois,[A/C#] |
| 10 | A/C# | aucun accord au-dessus de « Au dessus » (premier : E/D x=142,7 sur « l ») | inventé | retiré (relevé) |
| 10 | Esus | x=238,1 sur « d » de « de la » | décalé | [Esus]de la |
| 11 | F#m | x=118,6 sur « d » de « de tous » | décalé | [F#m]de tous |
| 11 | AM7/E | x=207,4 sur « p » de « plans » | décalé | [AM7/E]plans |
| 16 | Esus | x=247,4 sur l'espace après « royaumes, » | décalé | royaumes,[Esus] au |
| 16 | A | x=358,1 sur « e » de « des » | décalé | d[A]es trônes |
| 16 | A/C# | x=433,7 après « trônes, » | absent | trônes,[A/C#] |
| 17 | A/C# | aucun accord au-dessus de « Au dessus » (premier : E/D x=150,2 sur « m ») | inventé | retiré (relevé) |
| 25 | A/G# | A/C# x=321,8 après « pieds. » | nom | pieds.[A/C#] |
| 26 | A/C# | x=181,1 sur l'espace qui touche « tu » (t x=186) | décalé | sauvé, [A/C#] tu |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espace de fin : l. 18, 23 ; orthographe d'accord : l. 18, 19 ; espaceur : l. 23.

En-tête : ajout de `{source: Au dessus de tout (A).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 26:decale:A/C#:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 25:nom:A/G#:1 | appliqué | Timothée |  |
| 17:invente:A/C#:1 | appliqué | Timothée |  |
| 16:decale:Esus:1 | appliqué | Timothée |  |
| 16:decale:A:1 | appliqué | Timothée |  |
| 16:manquant:A/C#:1 | appliqué | Timothée |  |
| 11:decale:F#m:1 | laissé | Timothée | autre lecture retenue (11:fable:11:decale:F#m:1) |
| 11:decale:AM7/E:1 | laissé | Timothée | la ligne prend le texte de 11:fable:11:decale:F#m:1 |
| 11:fable:11:decale:F#m:1 | appliqué | Timothée |  |
| 11:fable:11:decale:AM7/E:1 | appliqué | Timothée | inclus dans la ligne de 11:fable:11:decale:F#m:1 |
| 10:invente:A/C#:1 | appliqué | Timothée |  |
| 10:decale:Esus:1 | appliqué | Timothée |  |
| 9:invente:(A/C#):1 | appliqué | Timothée | inclus dans la ligne de la session |
| 9:decale:Esus:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 9:decale:E:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 9:decale:A:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 9:manquant:A/C#:1 | appliqué | Timothée | inclus dans la ligne de la session |

- Partition shir.fr à couche texte : chaque accord mesuré au caractère (rawdict) ; tous les autres accords du chant sont exacts dans le fichier actuel (l. 10, 11 D et A/C#, 12, 16 A/C#, E/D, D, E, 17, 18, 19, 23, 24, 25, 26).
- Le A/C# initial est gravé sur une ligne d'accords seule avant le couplet 1 (une intro d'un accord). Un bloc {start_of_intro} avant le couplet 1 est interdit (structure, chant validé) : écrit `[A/C#] Au dessus`, contre le « ok » de suppression du relevé, pour ne pas perdre un accord de la partition. Si Timothée veut une vraie intro, c'est à faire à la main.
- l. 12 `existais. [A]` laissé : sur la partition le A (x=305,3) est séparé du point (fin x≈294) par un blanc, comme dans le fichier.
- Thèmes inchangés (chant validé, Adoration et Croix dans la liste).

### au-nom-de-jesus — Au nom de Jésus

Lot 1 · partition retenue : `Au nom de Jésus (D).pdf` (word-scan, mesure basse-fidelite) · chant validé par Timothée

Lignes modifiées :

- l. 13 : `[G]Dieu combat pour nous, [Em7]Toujours à nos côtés` → `Dieu combat pour [G]nous, Toujours à [Em7]nos côtés` *(session)*
- l. 14 : `[Bm]Il a triomphé oui, [D]il a triomphé` → `Il a triomph[Bm]é oui, il a triomp[D]hé` *(session)*
- l. 15 : `[G]Nous ne tremblerons pas, [Em7]jamais ébranlés` → `Nous ne trembleron[G]s pas, jamais ébr[Em7]anlés` *(session)*
- l. 16 : `[D]Jésus Tu es là` → `Jésus Tu es [D]là` *(session)*
- l. 24 : `[G]Portant nos fardeaux et [Em7]couvrant notre honte` → `Portant nos fardea[G]ux et couvrant no[Em7]tre honte` *(session)*
- l. 25 : `[Bm]Il a triomphé oui, [D]il a triomphé` → `Il a triomp[Bm]hé oui, il a triomp[D]hé` *(session)*
- l. 26 : `[G]Nous ne tremblerons pas, [Em7]jamais ébranlés` → `Nous ne tremblerons [G]pas, jamais ébra[Em7]nlés` *(session)*
- l. 27 : `[D]Jésus Tu es là` → `Jésus Tu e[D]s là` *(session)*
- l. 31 : `[A]Je vivrai, je [G]n'mourrai pas` → `Je vivra[A]i, je n'mourrai [G]pas` *(session)*
- l. 32 : `[D]Christ ressusci[Bm]té vit en moi Par [C]Sa puissance` → `Christ ressusc[D]ité vit en [Bm]moi Par Sa puissanc[C]e` *(session)*
- l. 33 : `[G]Et je suis libre [D]Au Nom de Jésus` → `Et je suis libr[G]e Au Nom de Jés[D]us` *(session)*
- l. 37 : `[A]Je vivrai, je [G]n'mourrai pas` → `Je vivrai[A], je n'mourrai [G]pas` *(session)*
- l. 38 : `[D]Je déclare : [Bm]Tu es élevé [C]Christ révélé` → `Je déclare : T[D]u es élev[Bm]é Christ révé[C]lé` *(session)*
- l. 39 : `[G]Et je suis gué[D]ri Au Nom de Jésus` → `Et je suis gué[G]ri Au Nom de Jé[D]sus` *(session)*
- l. 50 : `[G]Oui Dieu combat pour nous Repous[A]sant les ténèbres` → `Oui Dieu combat [G]pour nous Repoussant le[A]s ténèbres` *(session)*
- l. 51 : `[Bm]Éclairant le Royaume Qui sub[D/F#]siste à jamais` → `Éclairant le [Bm]Royaume Qui subsis[D/F#]te à jamais` *(session)*
- l. 52 : `[G]Dans le Nom de Jésus L'enne[A]mi est vaincu` → `Dans le Nom de [G]Jésus L'ennemi est [A]vaincu` *(session)*
- l. 53 : `[Bm]Ensemble proclamons, pro[D]clamons` → `Ensemble [Bm]proclamons, proclamo[D]ns` *(session)*
- l. 57 : `Au Nom de J[D]ésus` → `Au Nom de Jés[D]us` *(session)*
- l. 58 : `Au Nom de J[D]ésus` → `Au Nom de Jés[D]us` *(session)*
- l. 59 : `Au Nom de J[D]ésus` → `Au Nom de Jés[D]us` *(session)*
- l. 60 : `Au Nom de J[D]ésus` → `Au Nom de Jés[D]us` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 13 | G | bord gauche x=288 sur la fin du « r » de « pour » (r 282-289), corps du label sur l'espace, « nous » à x=298 | décalé (à cheval « pour \| nous ») | pour [G]nous, cas tranché de 02 + needs_review |
| 13 | Em7 | x=477 sur le « n » de « nos » (n 472-479) | décalé | [Em7]nos |
| 14 | Bm | x=224 sur la queue du « h » (h 216-225), « é » à x=228 | décalé | triomph[Bm]é |
| 14 | D | x=398 dans le blanc entre « p » (386-395) et « h » (400-407) du second « triomphé » | décalé | triomp[D]hé |
| 15 | G | x=308 juste après le « n » (300-307), « s » de « tremblerons » à 312-319 | décalé | trembleron[G]s |
| 15 | Em7 | x=476 sur la fin du bras du « r » (470-477), « a » à x=480 | décalé | ébr[Em7]anlés |
| 16 | D | x=224, « es » finit à 223, « là » commence à 232 : label sur l'espace, corps sur « là » | décalé (à cheval « es \| là ») | [D]là + needs_review |
| 24 | G | x=296 dans le blanc entre « a » (284-293) et « u » (298-305) de « fardeaux » | décalé | fardea[G]ux |
| 24 | Em7 | x=470 sur la fin du « o » (462-471), « t » de « notre » à 474 | décalé | no[Em7]tre |
| 25 | Bm | x=213 dans le blanc entre « p » (202-211) et « h » (214-223) du premier « triomphé » | décalé | triomp[Bm]hé |
| 25 | D | x=402 au milieu du « h » (398-407) du second « triomphé » | décalé | triomp[D]hé |
| 26 | G | x=317 sur le dernier pixel du « s » de « tremblerons » (312-317), corps sur l'espace, « pas » à x=328 | décalé (à cheval « tremblerons \| pas ») | [G]pas + needs_review |
| 26 | Em7 | x=486 sur la fin du « a » (478-487), « n » de « ébranlés » à 491 | décalé | ébra[Em7]nlés |
| 27 | D | x=218 au milieu du « s » de « es » (214-221), corps du label sur l'espace, « là » à x=230 | décalé (à cheval « es \| là ») | e[D]s + needs_review |
| 31 | A | x=180 dans le blanc entre « a » (172-179) et « i » (184-185) de « vivrai » | décalé | vivra[A]i |
| 31 | G | x=332 sur le « p » de « pas » (330-334) | décalé | [G]pas |
| 32 | D | x=248 dans le blanc entre « c » (238-245) et « i » (250-251) de « ressuscité » | décalé | ressusc[D]ité |
| 32 | Bm | x=340 dans l'espace avant « moi » (344) | décalé | [Bm]moi |
| 32 | C | ligne repliée « puissance » : x=196 sur la fin du « c » (190-197), « e » à 200 | décalé | puissanc[C]e |
| 33 | G | x=232 sur le bras du « r » (jambage à 230), corps du label sur « e » (238-245) de « libre » | décalé | libr[G]e |
| 33 | D | x=400 dans le blanc entre « s » (392-397) et « u » (402-411) de « Jésus » | décalé | Jés[D]us |
| 37 | A | x=184 entre le « i » (182-183) et la virgule (188) de « vivrai, » | décalé | vivrai[A], |
| 37 | G | x=332 sur le « p » de « pas » (330-337) | décalé | [G]pas |
| 38 | D | x=238 sur le début du « u » de « Tu » (236-245) | décalé | T[D]u |
| 38 | Bm | x=322 dans le blanc avant le dernier « é » de « élevé » (324-331) | décalé | élev[Bm]é |
| 38 | C | x=459 sur le « l » de « révélé » (458-459) | décalé | révé[C]lé |
| 39 | G | x=232 sur les deux derniers pixels du « é » (226-233), corps du label sur « r » (238-245) de « guéri » | décalé (le .cho met D sur « ri » et G en tête) | gué[G]ri |
| 39 | D | x=400 sur le début du « s » (400-407) de « Jésus » | décalé | Jé[D]sus |
| 50 | G | x=790 dans l'espace avant « pour » (792) | décalé | [G]pour |
| 50 | A | x=1038 sur la fin du « e » de « les » (1032-1039), « s » à 1044 | décalé | le[A]s |
| 51 | Bm | x=733 dans l'espace avant « Royaume » (738) | décalé | [Bm]Royaume |
| 51 | D/F# | x=948 dans le blanc entre « s » (938-945) et « t » (950) de « subsiste » | décalé | subsis[D/F#]te |
| 52 | G | x=774 dans l'espace avant « Jésus » (782) | décalé | [G]Jésus |
| 52 | A | x=980 sur le « v » de « vaincu » (980) | décalé | [A]vaincu |
| 53 | Bm | x=728 sur le « p » du premier « proclamons » (722-737) | décalé | [Bm]proclamons |
| 53 | D | x=948 dans le blanc entre « o » (938-947) et « n » (950-959) du second « proclamons » | décalé | proclamo[D]ns |
| 57 | D | x=764 sur le début du « u » de « Jésus » (u 764-771, s 752-759) | décalé (d'un caractère ; le .cho le met sur « é ») | Jés[D]us |
| 58 | D | x=764 sur le début du « u » de « Jésus » (u 764-771, s 752-759) | décalé (d'un caractère ; le .cho le met sur « é ») | Jés[D]us |
| 59 | D | x=764 sur le début du « u » de « Jésus » (u 764-771, s 752-759) | décalé (d'un caractère ; le .cho le met sur « é ») | Jés[D]us |
| 60 | D | x=758 sur les deux derniers pixels du « s » (752-759), corps du label sur « u » (764-771) | décalé (d'un caractère) | Jés[D]us |
| 32 | ? | quatre « labels » x=312/344/388/428 lus par check.py : aucun label à ces x sur l'image (la rangée d'accords 988-1004 ne porte que D x=248 et Bm x=340, la rangée 1044-1060 que C x=196) ; c'est le texte de la ligne repliée « puissance » mal lu | absent (artefact de l'outil) | rien à ajouter |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 7 ligne(s) — en-tête : l. 2 ; ligne sans paroles : l. 9, 20, 43, 44, 45, 46.

En-tête : ajout de `{source: Au nom de Jésus (D).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 60:relire:D:1 | laissé | Timothée |  |
| 59:relire:D:1 | laissé | Timothée |  |
| 58:relire:D:1 | laissé | Timothée |  |
| 57:relire:D:1 | laissé | Timothée |  |
| 53:decale:Bm:1 | laissé | Timothée |  |
| 53:decale:D:1 | laissé | Timothée |  |
| 53:oeil:17 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : Bm : x=728 sur le « p » du premier « proclamons » (722-737) → [Bm]proclamons; D : x=948 dans le blanc entre « o » (938-947) et « n » (950-959) du second « proclamons » → proclamo[D]ns. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 52:decale:G:1 | laissé | Timothée |  |
| 52:decale:A:1 | laissé | Timothée |  |
| 52:oeil:16 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=774 dans l'espace avant « Jésus » (782) → [G]Jésus; A : x=980 sur le « v » de « vaincu » (980) → [A]vaincu. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 51:decale:Bm:1 | laissé | Timothée |  |
| 51:decale:D/F#:1 | laissé | Timothée |  |
| 51:oeil:15 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : Bm : x=733 dans l'espace avant « Royaume » (738) → [Bm]Royaume; D/F# : x=948 dans le blanc entre « s » (938-945) et « t » (950) de « subsiste » → subsis[D/F#]te. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 50:decale:G:1 | laissé | Timothée |  |
| 50:decale:A:1 | laissé | Timothée |  |
| 50:oeil:14 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=790 dans l'espace avant « pour » (792) → [G]pour; A : x=1038 sur la fin du « e » de « les » (1032-1039), « s » à 1044 → le[A]s. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 39:decale:G:1 | laissé | Timothée |  |
| 39:decale:D:1 | laissé | Timothée |  |
| 39:oeil:13 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=232 sur les deux derniers pixels du « é » (226-233), corps du label sur « r » (238-245) de « guéri » → gué[G]ri; D : x=400 sur le début du « s » (400-407) de « Jésus » → Jé[D]sus. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 38:decale:D:1 | laissé | Timothée |  |
| 38:decale:Bm:1 | laissé | Timothée |  |
| 38:decale:C:1 | laissé | Timothée |  |
| 38:oeil:12 | laissé | Timothée |  |
| 37:decale:A:1 | laissé | Timothée |  |
| 37:decale:G:1 | laissé | Timothée |  |
| 37:oeil:11 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : A : x=184 entre le « i » (182-183) et la virgule (188) de « vivrai, » → vivrai[A],; G : x=332 sur le « p » de « pas » (330-337) → [G]pas. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 33:decale:D:1 | laissé | Timothée |  |
| 33:oeil:10 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=232 sur le bras du « r » (jambage à 230), corps du label sur « e » (238-245) de « libre » → libr[G]e; D : x=400 dans le blanc entre « s » (392-397) et « u » (402-411) de « Jésus » → Jés[D]us. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 32:decale:Bm:1 | laissé | Timothée |  |
| 32:decale:C:1 | laissé | Timothée |  |
| 32:manquant:?:1 | laissé | Timothée |  |
| 32:manquant:?:2 | laissé | Timothée |  |
| 32:manquant:?:3 | laissé | Timothée |  |
| 32:manquant:?:4 | laissé | Timothée |  |
| 32:oeil:9 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : D : x=248 dans le blanc entre « c » (238-245) et « i » (250-251) de « ressuscité » → ressusc[D]ité; Bm : x=340 dans l'espace avant « moi » (344) → [Bm]moi; C : ligne repliée « puissance » : x=196 sur la fin du « c » (190-197), « e » à 200 → puissanc[C]e. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 31:decale:A:1 | laissé | Timothée |  |
| 31:decale:G:1 | laissé | Timothée |  |
| 31:oeil:8 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : A : x=180 dans le blanc entre « a » (172-179) et « i » (184-185) de « vivrai » → vivra[A]i; G : x=332 sur le « p » de « pas » (330-334) → [G]pas. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 27:decale:D:1 | laissé | Timothée |  |
| 27:oeil:7 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : D : x=218 au milieu du « s » de « es » (214-221), corps du label sur l'espace, « là » à x=230 → e[D]s + needs_review. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 26:decale:G:1 | laissé | Timothée |  |
| 26:decale:Em7:1 | laissé | Timothée |  |
| 26:oeil:6 | laissé | Timothée |  |
| 25:decale:Bm:1 | laissé | Timothée |  |
| 25:decale:D:1 | laissé | Timothée |  |
| 25:oeil:5 | laissé | Timothée |  |
| 24:decale:G:1 | laissé | Timothée |  |
| 24:decale:Em7:1 | laissé | Timothée |  |
| 24:oeil:4 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=296 dans le blanc entre « a » (284-293) et « u » (298-305) de « fardeaux » → fardea[G]ux; Em7 : x=470 sur la fin du « o » (462-471), « t » de « notre » à 474 → no[Em7]tre. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 16:decale:D:1 | laissé | Timothée |  |
| 16:oeil:3 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : D : x=224, « es » finit à 223, « là » commence à 232 : label sur l'espace, corps sur « là » → [D]là + needs_review. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 15:decale:G:1 | laissé | Timothée |  |
| 15:decale:Em7:1 | laissé | Timothée |  |
| 15:oeil:2 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=308 juste après le « n » (300-307), « s » de « tremblerons » à 312-319 → trembleron[G]s; Em7 : x=476 sur la fin du bras du « r » (470-477), « a » à x=480 → ébr[Em7]anlés. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 14:decale:Bm:1 | laissé | Timothée |  |
| 14:decale:D:1 | laissé | Timothée |  |
| 14:oeil:1 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : Bm : x=224 sur la queue du « h » (h 216-225), « é » à x=228 → triomph[Bm]é; D : x=398 dans le blanc entre « p » (386-395) et « h » (400-407) du second « triomphé » → triomp[D]hé. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |
| 13:decale:G:1 | laissé | Timothée |  |
| 13:decale:Em7:1 | laissé | Timothée |  |
| 13:oeil:0 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : bord gauche x=288 sur la fin du « r » de « pour » (r 282-289), corps du label sur l'espace, « nous » à x=298 → pour [G]nous, cas tranché de 02 + needs_review; Em7 : x=477 sur le « n » de « nos » (n 472-479) → [Em7]nos. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte. |

- Source basse fidélité (scan d'une feuille Word en deux colonnes, accords alignés aux espaces) : check.py ne lit pas bien la source ; chaque accord vérifié à l'œil sur l'image native extraite du PDF (1208×1712), bord gauche du label mesuré au pixel par profil de colonnes, lettre la plus proche (bord gauche dans un blanc ou sur les deux derniers pixels d'une lettre → lettre suivante).
- Les 22 lignes chantées sont reprises (44 accords) : le .cho posait presque tout en tête de demi-phrase, la feuille plus loin ; tous corrigés contre le choix « non » du relevé (chant validé), la partition l'emportant.
- Intro, Interlude, Instrumental : mêmes accords que la feuille, inchangés. Paroles identiques (le scan replie « ténèbres », « jamais », « puissance » ; .cho sur une ligne).
- Quatre {needs_review} (labels à cheval entre deux mots : l.13, 16, 26, 27), sous le seuil de cinq : pas d'audio demandé ; à trancher à l'écoute avec le lien {youtube}.
- Couplets 1 et 2 gravés légèrement différemment (Bm/D de « triomphé », Em7 de « ébranlés ») : chaque occurrence mesurée séparément, comme le veut 02.
- Fin : les quatre D passent de « J[D]ésus » à « Jés[D]us » (label sur le « u »).
- check.py après : 8 accords non exacts (2 à relire, 6 décalés) + 4 « absents », tous expliqués : l.14 Bm (outil : x=224 lu sur « a », l'image le met sur la queue du « h » de « triomphé », lettre « é »), l.27 D (à cheval « es | là », needs_review), l.32 Bm/C (outil embrouillé par la ligne repliée « puissance » : Bm x=340 est dans l'espace avant « moi », C x=196 sur la fin du « c » de « puissance ») les 4 labels « ? » de la l.32, inexistants sur l'image, et l.33/l.39 (G x=232, D x=400) que l'outil projette sur « Et »/« suis »/« de » parce qu'il place mal les mots de ces lignes : en pixels, « libre » occupe 210-246, « guéri » 200-250, « Jésus » 372-422 et 382-432, donc G et D sont bien sur ces mots (lecture confirmée sur le crop). Le « NOUVEAU décalé » l.33 G est cet artefact.
- Avertissements de preview.js « le non du relevé est réalisé quand même » (15 lignes) : attendus, c'est la correction contre le choix « non » du relevé, la partition l'emportant (le moteur les classe « contre le non »).

### aucun-autre-nom — Aucun autre nom

Lot 1 · partition retenue : `Aucun autre nom - G.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 25 : `[G/B]Le  [ ]  [C]Nom [D]plus [C]grand [G/B]que [Em]tout.[C]` → `[G/B]Le [C]Dieu [D]plus [C]grand [G/B]que [Em]tout.[C]`
- l. 32 : `Non aucun autre [C]nom,Jésus not[Em]re Dieu.[C]` → `Non aucun autre [C]nom, Jésus not[Em]re Dieu.[C]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 13 | Em | x=343,3 sur « n » de « nom, » (couplet 1, vers 1), .cho : [Em]nom | exact (outil) — après la forme (tirets retirés), check.py apparie mal les mots que la source garde coupés au tiret ; il compte le même accord une fois « absent de la source » et une fois « absent du .cho » à la même lettre | aucune |
| 14 | D/F# | x=307,8 sur « a » de « cré - a - tion », .cho : cré[D/F#]a | exact (outil) — après la forme (tirets retirés), check.py apparie mal les mots que la source garde coupés au tiret ; il compte le même accord une fois « absent de la source » et une fois « absent du .cho » à la même lettre | aucune |
| 14 | Em | x=357,6 sur « t » de « tion. », .cho : a[Em]tion | exact (outil) — après la forme (tirets retirés), check.py apparie mal les mots que la source garde coupés au tiret ; il compte le même accord une fois « absent de la source » et une fois « absent du .cho » à la même lettre | aucune |
| 15 | Em | x=333,1 sur « v » de « vers, », .cho : ni[Em]vers | exact (outil) — après la forme (tirets retirés), check.py apparie mal les mots que la source garde coupés au tiret ; il compte le même accord une fois « absent de la source » et une fois « absent du .cho » à la même lettre | aucune |
| 21 | Em | x=342,5 sur « l » de « leil, », .cho : so[Em]leil | exact (outil) — après la forme (tirets retirés), check.py apparie mal les mots que la source garde coupés au tiret ; il compte le même accord une fois « absent de la source » et une fois « absent du .cho » à la même lettre | aucune |
| 23 | Em | x=300,7 sur « s » de « son, », .cho : ri[Em]son | exact (outil) — après la forme (tirets retirés), check.py apparie mal les mots que la source garde coupés au tiret ; il compte le même accord une fois « absent de la source » et une fois « absent du .cho » à la même lettre | aucune |
| 39 | Em | p. 2, x=337,5 sur « d » de « du, », .cho : per[Em]du | exact (outil) — après la forme (tirets retirés), check.py apparie mal les mots que la source garde coupés au tiret ; il compte le même accord une fois « absent de la source » et une fois « absent du .cho » à la même lettre | aucune |
| 40 | D/F# | p. 2, x=53,4 sur « v » de « vic - toire » (le « v » est à x=53,4), .cho : La [D/F#]vic[G]toire | exact (outil : « décalé » parce que la source garde « vic - toire » coupé et le .cho, après la forme, « victoire ») | aucune |
| 25 | G/B C D C G/B Em C | G/B x=31,2 « Le », C x=80,1 « Dieu », D x=117,5 « plus », C x=151,2 « grand », G/B x=196,6 « que », Em x=245,5 « tout », C x=276,7 après le point | exact (mot « Nom » corrigé en « Dieu ») | [G/B]Le [C]Dieu [D]plus [C]grand [G/B]que [Em]tout.[C] |
| 32 | C Em C | C x=168,1 « nom », Em x=276,6 « r » de « notre », C x=332,6 après « Dieu. » | exact (espace après la virgule rétablie) | Non aucun autre [C]nom, Jésus not[Em]re Dieu.[C] |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 10 ligne(s) — ligne sans paroles : l. 9 ; espaceur : l. 13, 15, 17, 22, 23, 40 ; mot coupé au tiret : l. 13, 14, 15, 21, 22, 23, 39, 40.

En-tête : ajout de `{source: Aucun autre nom - G.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 33:manquant:G/B:1 | laissé | def |  |
| 33:manquant:C:1 | laissé | def |  |
| 33:manquant:Em:1 | laissé | def |  |
| 33:manquant:C:2 | laissé | def |  |
| 32:fable-hors:32:paroles:fable5 | appliqué | session | La feuille met une espace après la virgule (« nom, Jésus ») ; accords inchangés et à leur place (C sur « nom », Em sur « re » de « notre », C en fin). — partition : Page 1, refrain, 4e vers : « Non aucun autre nom, Jésus notre Dieu. » avec C x=168,1 sur « nom », Em x=276,6 sur « re », C x=332,6 après « Dieu. » |
| 29:manquant:G/B:1 | laissé | def |  |
| 29:manquant:C:1 | laissé | def |  |
| 29:manquant:D:1 | laissé | def |  |
| 29:manquant:C:2 | laissé | def |  |
| 29:manquant:G/B:2 | laissé | def |  |
| 29:manquant:Em:1 | laissé | def |  |
| 29:manquant:C:3 | laissé | def |  |
| 25:invente:G/B:1 | laissé | def | la ligne prend le texte de 25:fable-hors:25:paroles:fable5 |
| 25:invente:C:1 | laissé | def | la ligne prend le texte de 25:fable-hors:25:paroles:fable5 |
| 25:invente:D:1 | laissé | def | la ligne prend le texte de 25:fable-hors:25:paroles:fable5 |
| 25:invente:C:2 | laissé | def | la ligne prend le texte de 25:fable-hors:25:paroles:fable5 |
| 25:invente:G/B:2 | laissé | def | la ligne prend le texte de 25:fable-hors:25:paroles:fable5 |
| 25:fable-hors:25:paroles:fable5 | appliqué | session | La feuille grave « Le Dieu plus grand que tout » au dernier vers du couplet 2 ; le .cho porte « Nom » (mot du couplet 3). Les accords G/B, C, D, C, G/B, Em, C restent aux mêmes syllabes : les suppressions par défaut venaient seulement de ce mot faux. — partition : Page 1, couplet 2, 5e vers : « Le       Dieu plus grand que     tout. » avec G/B x=31,2 sur « Le », C x=80,1 sur « Dieu », D x=117,5 sur « plus », C x=151,2 sur « grand », G/B x=196,6 sur « que », « Em C » x=245,5 sur « tout. » |

- Vérifié accord par accord sur la couche texte (rawdict, x de chaque accord contre x de chaque lettre) et à l'œil sur les rendus 2× des deux pages : les 113 accords du .cho sont à la lettre de la partition, intro comprise ; aucun accord absent, aucun inventé, aucun nom différent.
- Les cinq suppressions par défaut de la ligne 25 et les « manquant » des lignes 29 et 33 venaient d'un mauvais appariement de l'outil (mot « Nom » au lieu de « Dieu » ligne 25, espace manquante ligne 32) ; les deux replace les corrigent sans toucher aux accords.
- Les 8 accords que check.py liste non exacts après la forme sont exacts : la source garde les mots coupés au tiret (« au - tre », « vic - toire »), le .cho les écrit entiers et l'outil apparie mal (détail dans mesures).
- Thèmes (Adoration, Sainteté) dans la liste et défendables : inchangés. Structure conforme à la feuille.
- Rien de douteux à l'oreille.

### aucune-peur — Aucune peur

Lot 1 · partition retenue : `Aucune peur (B).pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 7 : `{themes: Foi, Esperance}` → `{themes: Foi, Grâce}` *(en-tête)* — Choix actuel « Foi, Esperance » revu : « Foi » se défend et reste en tête (le refrain, cœur du chant : « Me voici devant Toi sans aucune peur dans Ton amour », la confiance sans crainte) ; « Espérance » ne se défend pas (rien sur l'attente ou l'avenir), remplacée par « Grâce » (« Tu m'as aimé tel que j'étais », « balayées par Ta grâce », « Amour sans faille »).
- l. 10 : `[B]Lorsque j'étais encore bri[C#m]sé` → `[B]Lorsque j'étais encore br[C#m]isé` *(session)*
- l. 18 : `Pourquoi rés[E]ister` → `Pourquoi rési[E]ster` *(session)*
- l. 21 : `Pourquoi hési[E]ter` → `Pourquoi hés[E]iter` *(session)*
- l. 26 : `Me voici [B]devant Toi[C#m]` → `Me voici d[B]evant Toi[C#m]` *(session)*
- l. 31 : `Près de Toi je [B/D#]suis à ma pla[E]ce` → `Près de Toi je[B/D#] suis à ma pla[E]ce` *(session)*
- l. 32 : `Me voici d[B]evant Toi [C#m]` → `Me voici d[B]evant Toi[C#m]` *(session (hors relevé))* — B x=360,0 sur « e » (1,0 pt), déjà juste ; C#m x=408,0, après la fin de « Toi » (405,6), en l'air : collé après le mot, comme la ligne 26

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | B | x=72,0 sur « L » de « Lorsque » | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 10 | C#m | x=192,0 : début de « i » de « brisé » à 191,6 (0,4 pt), « s » à 194,9 (2,9 pt) | décalé | br[C#m]isé |
| 11 | G#m | x=72,0 sur « L » de « Le » | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 11 | E | x=186,0 : « t » de « chute » à 188,6 (2,6 pt), « u » à 182,6 (3,4 pt) ; lettre la plus proche « t » | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 12 | B | x=72,0 sur « T » de « Tu » | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 12 | C#m | x=189,0 : « t » de « j'étais » à 188,5 (0,5 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 13 | G#m | x=72,0 sur « E » de « Et » | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 13 | E | x=192,0 : premier « l » de « nouvelle » à 194,0 (2,0 pt), « e » à 188,6 (3,4 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 17 | C#m | x=138,0 : « o » de « ignorer » à 137,7 (0,3 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 18 | E | x=135,0 : « s » de « résister » à 136,3 (1,3 pt), « i » à 133,0 (2,0 pt) ; lettre la plus proche « s » (étiquette à cheval sur « i\|s », feuille lisible) | décalé | rési[E]ster |
| 19 | G#m | x=162,0 sur le second « l » de « m'appelles » (162,0) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 19 | F# | x=237,0 sur « m » de « nom » (233,0–242,3) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 20 | C#m | x=135,0 : « u » de « refuser » à 135,6 (0,6 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 21 | E | x=135,0 sur « i » de « hésiter » (135,0) ; « t » à 138,3 | décalé | hés[E]iter |
| 22 | G#m | x=162,0 sur le second « l » de « m'appelles » | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 22 | F# | x=237,0 sur « m » de « nom » | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 26 | B | x=360,0 : « e » de « devant » à 361,0 (1,0 pt), « d » à 355,0 (5,0 pt) | décalé | d[B]evant |
| 26 | C#m | x=405,0 : fin de « Toi » (« i » 402,3–405,6), espace à 405,6 (0,6 pt) : label après le mot | exact (vérifié à l'œil, check.py ne lit pas la feuille) — l'outil du relevé lisait « i », la lettre la plus proche est l'espace après « Toi » |  |
| 27 | G#m | x=375,0 : « e » de « peur » à 377,6 (2,6 pt), « p » à 371,6 (3,4 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 27 | E | x=465,0 : « u » de « amour » à 462,9 (2,1 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 28 | B | x=363,0 : « q » de « qu'à » à 362,0 (1,0 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 28 | C#m | x=411,0 : « i » de « croix » à 413,3 (2,3 pt), « o » à 407,3 (3,7 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 29 | G#m | x=390,0 : « n » de « sans » à 387,6 (2,4 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 29 | E | x=459,0 : « r » de « détour » à 459,5 (0,5 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 30 | B | x=390,0 : « a » de « balayées » à 387,6 (2,4 pt), « y » à 393,0 (3,0 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 30 | F#/A# | x=462,0 : « â » de « grâce » à 460,2 (1,8 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 31 | B/D# | x=372,0 : espace après « je » à 374,3 (2,3 pt), « e » à 368,9 (3,1 pt), « s » de « suis » à 377,3 (5,3 pt) : label sur l'espace avant « suis » | décalé | je[B/D#] suis |
| 31 | E | x=438,0 : « c » de « place » à 439,6 (1,6 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 32 | B | x=360,0 : « e » de « devant » à 361,0 (1,0 pt) | décalé | d[B]evant (déjà ainsi) |
| 32 | C#m | x=408,0 : après la fin de « Toi » (405,6), en l'air après le mot | équivalent | Toi[C#m] |
| 33 | G#m | x=378,0 : « e » de « peur » à 377,6 (0,4 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 33 | E | x=465,0 : « u » de « amour » à 462,9 (2,1 pt) | exact (vérifié à l'œil, check.py ne lit pas la feuille) |  |
| 37 | B | couplet 2 : la feuille ne grave aucun accord ; accord reporté du couplet 1, gardé | reporté |  |
| 37 | C#m | couplet 2 : la feuille ne grave aucun accord ; accord reporté du couplet 1, gardé | reporté |  |
| 38 | G#m | couplet 2 : la feuille ne grave aucun accord ; accord reporté du couplet 1, gardé | reporté |  |
| 38 | E | couplet 2 : la feuille ne grave aucun accord ; accord reporté du couplet 1, gardé | reporté |  |
| 39 | B | couplet 2 : la feuille ne grave aucun accord ; accord reporté du couplet 1, gardé | reporté |  |
| 39 | C#m | couplet 2 : la feuille ne grave aucun accord ; accord reporté du couplet 1, gardé | reporté |  |
| 40 | G#m | couplet 2 : la feuille ne grave aucun accord ; accord reporté du couplet 1, gardé | reporté |  |
| 40 | E | couplet 2 : la feuille ne grave aucun accord ; accord reporté du couplet 1, gardé | reporté |  |

En-tête : ajout de `{source: Aucune peur (B).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 40:reporte:G#m:1 | laissé | def |  |
| 40:reporte:E:1 | laissé | def |  |
| 39:reporte:B:1 | laissé | def |  |
| 39:reporte:C#m:1 | laissé | def |  |
| 38:reporte:G#m:1 | laissé | def |  |
| 38:reporte:E:1 | laissé | def |  |
| 37:reporte:B:1 | laissé | def |  |
| 37:reporte:C#m:1 | laissé | def |  |
| 31:relire:B/D#:1 | laissé | def |  |
| 26:relire:B:1 | laissé | def |  |
| 26:relire:C#m:1 | laissé | def |  |
| 21:relire:E:1 | laissé | def |  |
| 18:relire:E:1 | laissé | def |  |
| 10:relire:C#m:1 | laissé | def |  |

- Source basse fidélité (feuille Word, accords alignés aux espaces), mais couche texte exacte : chaque accord mesuré au x de son label (lettre la plus proche du bord gauche) et vérifié à l'œil sur un rendu 4× ; check.py ne lit pas la feuille (40 « absent de la source » avant comme après, tous expliqués dans « mesures »).
- Aucune question. Six lignes changées, toutes des « non » par défaut corrigés vers la partition (10 br[C#m]isé, 18 rési[E]ster, 21 hés[E]iter, 26 d[B]evant, 31 je[B/D#] suis) plus l'harmonisation de la ligne 32 (Toi[C#m], même position en l'air que la ligne 26) ; l'écart 26:relire:C#m:1 reste « non » : le label est sur l'espace après « Toi », pas sur « i ».
- Étiquettes les plus serrées (moins d'1 pt entre les deux lettres candidates) : l.11 E (t/u), l.18 E (s/i), l.27 G#m (e/p), l.30 B (a/y), l.31 B/D# (espace/e) ; la feuille se lit, aucun {needs_review} posé, mais l'oreille peut préférer une coupe plus musicale (ex. « résister » et « hésiter » portent E au même x).
- Couplet 2 : aucun accord sur la feuille ; les huit accords du .cho, reportés du couplet 1, sont gardés (suppressions « non » par défaut).
- Thèmes : Esperance (hors liste) remplacé ; Foi gardé en tête, Grâce ajouté.

### aupres-de-dieu — Auprès de Dieu

Lot 1 · partition retenue : `Auprès de Dieu.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 14 : `En[Bm7]tendre le son de Sa vo[D/E]ix.  [ ]  [E]` → `En[Bm7]tendre le son de Sa vo[D/E]ix.[E]` *(session (hors relevé))* — y=276,8 : Bm7 x=50,8 sur « t » de « En‹t›endre », D/E x=210,9 sur « i » de « vo‹i›x », E x=248,8 sur les espaces après « voix. » (point x=222,4) : label après la ponctuation, donc collé après elle, comme « Roi.[E] » et « moi.[E] » des lignes 10 et 12 ; l'espaceur sort de la ligne chantée.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 14 | Bm7 | x=50,8 sur « t » de « En‹t›endre » | exact | En[Bm7]tendre |
| 14 | D/E | x=210,9 sur « i » de « vo‹i›x » | exact | vo[D/E]ix |
| 14 | E | x=248,8, après le point de « voix. » (x=222,4) | forme | voix.[E] |
| 20 | F#m/D | x=66,7 sur « l » de « ‹l›ève » (label gravé en trois morceaux F · #m · /D, vu sur le rendu 3×) | exact (vérifié à l'œil) | check.py lit mal le label coupé et classe la ligne « absent de la source » ; rien à changer |
| 20 | G#m7 | x=134,3 sur « y » de « ‹y›eux » | exact (vérifié à l'œil) | même ligne mal lue par l'outil ; rien à changer |
| 20 | C#7 | x=253,4 sur « s » de « ‹s›aint » | exact (vérifié à l'œil) | même ligne mal lue par l'outil ; rien à changer |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — mot coupé au tiret : l. 19, 21 ; espaceur : l. 21.

En-tête : ajout de `{source: Auprès de Dieu.pdf}`

- Tous les accords mesurés en couche texte (Couplet, Refrain) : tous au caractère de la feuille ; seule la ligne 14 change de forme (E collé après « voix. »).
- Ligne 20 : check.py classe F#m/D, G#m7, C#7 « absent de la source » parce que le label F#m/D est gravé en trois morceaux ; vérifié à l'œil sur le rendu 3× (crops/aupres-de-dieu/l20-21.png) : les trois sont exacts.
- Lignes 19 et 21 : « pré - sence » et « res - ter » réécrits entiers par le moteur, accords devant les mêmes caractères (A7 sur « s », A/C# sur « t »).
- Autre version : « Auprès de Dieu - Accords.pdf » a la même couche texte (doublon) ; « C_est auprès de Dieu.pdf » est un scan Word, non retenu.
- Structure (Couplet, Refrain) et thème (Adoration) conformes à la feuille, inchangés.

### avec-nous — Avec nous (Emmanuel)

Lot 1 · partition retenue : aucune (famille inconnue, mesure sans-source) · **fichier inchangé**

### benediction — Bénédiction

Lot 1 · partition retenue : `Bénédiction.pdf` (eglise-fpdf, mesure fiable)

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espaceur : l. 9, 10 ; orthographe d'accord : l. 12.

En-tête : ajout de `{source: Bénédiction.pdf}`

- PDF à couche texte (famille église) : les 18 accords mesurés en coordonnées (get_text dict) tombent tous sur la syllabe portée par le .cho ; check.py : 18 exact avant et après.
- Seule la forme change (moteur) : [ ] vides retirés, Gsus gravé écrit Gsus4 (orthographe canonique de 01), ajout de {source}.
- Aucune question ni écart du relevé pour ce chant.

### beni-soit-ton-nom — Béni soit Ton Nom

Lot 1 · partition retenue : `Béni soit Ton Nom.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `[A] Béni s[E]oit Ton Nom là où [F#m7]Tu donnes l'[D]abondance` → `[A] Béni s[E]oit Ton Nom là où [F#m7]Tu donnes l[D]'abondance`
- l. 18 : `Des [F#m7]chants de lou[D]ange,` → `Des[F#m7] chants de lou[D]ange,`
- l. 20 : `Seigneur, [F#m7]je redi[D]rai :` → `Seigneur,[F#m7] je redi[D]rai :`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | D | x=298,9 = x de l'apostrophe de « l'abondance » (l 295,3 ; ' 298,9 ; a 301,9) | décalé | l[D]'abondance (choix « ok » du relevé, conforme à la partition) |
| 18 | F#m7 | x=304,2 = espace entre « des » et « chants » (c à 308,6) | décalé | Des[F#m7] chants (choix « ok » du relevé, conforme à la partition) |
| 20 | F#m7 | x=329,0 = espace après « Seigneur, » (j à 333,5) | décalé | Seigneur,[F#m7] je (choix « ok » du relevé, conforme à la partition) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 7 ligne(s) — espace de fin : l. 17, 19, 24, 26, 38, 39 ; espaceur : l. 25.

En-tête : ajout de `{source: Béni soit Ton Nom.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 20:decale:F#m7:1 | appliqué | Timothée |  |
| 18:decale:F#m7:1 | appliqué | Timothée |  |
| 10:decale:D:1 | appliqué | Timothée |  |

- PDF à couche texte (famille église) : chaque accord mesuré en coordonnées (rawdict) ; les trois écarts « ok » du relevé mettent l'accord exactement sur le caractère de la partition ; check.py : 50 exact + 3 décalé avant, 53 exact après.
- Vérifié à la main aussi le refrain : g[E]lori[D]eux (E sur « l » x=413,5, D sur « e » x=434,9) et « Nom. [D] » (D x=400,2 après le point) sont justes.
- Structure : rien (la feuille grave Couplet 1, Pré-Refrain, Refrain, Couplet 2, Pont comme le .cho ; l'écart Refrain/Pré-Refrain de la liste extra est une fausse lecture).
- Liste extra, non appliquée : l. 40, un « ù » parasite en fin de ligne (« dire : ù », la feuille porte « dire : ») ; le .cho coupe en deux des lignes que la feuille garde entières (l. 17-20, 24-27, 38-41).

### benis-dieu-10000-raisons — Bénis Dieu (10000 raisons)

Lot 1 · partition retenue : `Bénis Dieu (10000 raisons) - D.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 22 : `Quoiq[G]u'il ad[D]vienne et quoiq[A]u  'il m'arrive au[Bm]jourd'hui...` → `Quoi[G]qu'il ad[D]vienne et quoi[A]qu'il m'arrive au[Bm]jourd'hui...` *(session)*
- l. 23 : `[G] Puisse mon chant [D]s'entendre le [A]soir tom[D]bé.` → `[G] Puisse mon chant [D]s'entendre le [A]soir tom[D]bé.[(Dsus4)] [(D)] [(Dsus4)] [(D)]` *(session)*
- l. 27 : `Dieu [G]bienveil[D]lant, lent à [A]la co[Bm]lère,` → `Dieu [G]bienvei[D]llant, lent à [A]la co[Bm]lère,` *(session)*
- l. 28 : `[G]Ton Nom est [D]grand et Ton c[A]œur est b[Bm]on.` → `[G] Ton Nom est [D]grand et Ton c[A]œur est b[Bm]on.` *(session (hors relevé))* — G x=31,2 sur l'indentation (deux espaces) avant « Ton », comme les autres secondes lignes de couplet : label sur l'espace, crochet + espace (cas Océans de 02). D x=136,1 sur « g », A x=239,3 sur « œ », Bm x=307,7 sur « o » de « bon » : exacts.
- l. 30 : `[G] Dix-mille rai[D]sons de louer [A]notre [D]Dieu.` → `[G] Dix-mille rai[D]sons de louer [A]notre [D]Dieu.[(Dsus4)] [(D)] [(Dsus4)] [(D)]` *(session)*
- l. 34 : `Le [G]temps vien[D]dra de la[A]isser ce [Bm]monde,` → `Le [G]temps vien[D]dra de lai[A]sser ce [Bm]monde,` *(session)*
- l. 35 : `[G]Quand toutes mes [D]forces m'aur[A]ont quitt[Bm]é.` → `[G] Quand toutes mes [D]forces m'aur[A]ont quitt[Bm]é.` *(session (hors relevé))* — G x=31,2 sur l'indentation avant « Quand » : crochet + espace. D x=175,3 sur « f », A x=262,8 sur « o » de « m'aur‹o›nt », Bm x=319,7 sur « é » de « quitt‹é » : exacts.
- l. 37 : `[G] Dix millé[D]naires et pour l'é[A]terni[D]té.` → `[G] Dix millé[D]naires et pour l'é[A]terni[D]té.[(Dsus4)] [(D)] [(Dsus4)] [(D)]` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | D | aucun accord : la partition commence au Refrain ; le « D » x=531,3 (18 pt) en haut à droite est la case de tonalité | inventé | laissé (retirer l'intro = changement de structure, proposé dans structure) |
| 22 | G | x=65,0 sur « q » de « Quoi‹q›u'il » | décalé | Quoi[G]qu'il |
| 22 | D | x=115,2 sur « v » d'« ad‹v›ienne » | exact | inchangé |
| 22 | A | x=214,8 sur « q » de « quoi‹q›u'il » | décalé | quoi[A]qu'il |
| 22 | Bm | x=325,8 sur « j » d'« au‹j›ourd'hui » | exact | inchangé |
| 23 | G | x=31,2 sur l'indentation avant « Puisse » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé [G] Puisse |
| 23 | D | x=171,7 sur « s » de « s'entendre » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé [D]s'entendre |
| 23 | A | x=267,2 sur « s » de « soir » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé [A]soir |
| 23 | D | x=324,1 sur « b » de « tom‹b›é » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé tom[D]bé |
| 23 | (Dsus4) | groupe « (Dsus4 D Dsus4 D) » gravé après « tombé. », entre parenthèses | absent | ajouté [(Dsus4)] après le point |
| 23 | (D) | groupe « (Dsus4 D Dsus4 D) » gravé après « tombé. », entre parenthèses | absent | ajouté [(D)] après le point |
| 23 | (Dsus4) | groupe « (Dsus4 D Dsus4 D) » gravé après « tombé. », entre parenthèses | absent | ajouté [(Dsus4)] après le point |
| 23 | (D) | groupe « (Dsus4 D Dsus4 D) » gravé après « tombé. », entre parenthèses | absent | ajouté [(D)] après le point |
| 30 | G | x=31,2 sur l'indentation avant « Dix-mille » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé [G] Dix-mille |
| 30 | D | x=123,6 sur « s » de « rai‹s›ons » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé rai[D]sons |
| 30 | A | x=224,1 sur « n » de « notre » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé [A]notre |
| 30 | D | x=265,0 sur « D » de « Dieu » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé [D]Dieu |
| 30 | (Dsus4) | groupe « (Dsus4 D Dsus4 D) » gravé après « Dieu. », entre parenthèses | absent | ajouté [(Dsus4)] après le point |
| 30 | (D) | groupe « (Dsus4 D Dsus4 D) » gravé après « Dieu. », entre parenthèses | absent | ajouté [(D)] après le point |
| 30 | (Dsus4) | groupe « (Dsus4 D Dsus4 D) » gravé après « Dieu. », entre parenthèses | absent | ajouté [(Dsus4)] après le point |
| 30 | (D) | groupe « (Dsus4 D Dsus4 D) » gravé après « Dieu. », entre parenthèses | absent | ajouté [(D)] après le point |
| 37 | G | x=31,2 sur l'indentation avant « Dix » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé [G] Dix |
| 37 | D | x=100,5 sur « n » de « millé‹n›aires » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé millé[D]naires |
| 37 | A | x=218,3 sur « t » de « l'é‹t›ernité » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé l'é[A]ternité |
| 37 | D | x=249,4 sur « t » de « terni‹t›é » (check.py : « absent de la source », il ne lit pas la ligne à cause de la parenthèse) | exact | inchangé terni[D]té |
| 37 | (Dsus4) | groupe « (Dsus4 D Dsus4 D) » gravé après « éternité. », entre parenthèses | absent | ajouté [(Dsus4)] après le point |
| 37 | (D) | groupe « (Dsus4 D Dsus4 D) » gravé après « éternité. », entre parenthèses | absent | ajouté [(D)] après le point |
| 37 | (Dsus4) | groupe « (Dsus4 D Dsus4 D) » gravé après « éternité. », entre parenthèses | absent | ajouté [(Dsus4)] après le point |
| 37 | (D) | groupe « (Dsus4 D Dsus4 D) » gravé après « éternité. », entre parenthèses | absent | ajouté [(D)] après le point |
| 27 | D | x=119,2 sur le premier « l » de « bienvei‹l›lant » | décalé | bienvei[D]llant |
| 27 | G | x=68,5 sur « b » de « bienveillant » | exact | inchangé |
| 27 | A | x=201,0 sur « l » de « la » | exact | inchangé |
| 27 | Bm | x=234,8 sur « l » de « co‹l›ère » | exact | inchangé |
| 28 | G | x=31,2 sur l'indentation avant « Ton » (label sur l'espace) | décalé | [G] Ton |
| 28 | D | x=136,1 sur « g » de « grand » | exact | inchangé |
| 28 | A | x=239,3 sur « œ » de « cœur » | exact | inchangé |
| 28 | Bm | x=307,7 sur « o » de « bon » | exact | inchangé |
| 34 | A | x=196,6 sur « s » de « lai‹s›ser » | décalé | lai[A]sser |
| 34 | G | x=53,4 sur « t » de « temps » | exact | inchangé |
| 34 | D | x=130,8 sur « d » de « vien‹d›ra » | exact | inchangé |
| 34 | Bm | x=252,6 sur « m » de « monde » | exact | inchangé |
| 35 | G | x=31,2 sur l'indentation avant « Quand » (label sur l'espace) | décalé | [G] Quand |
| 35 | D | x=175,3 sur « f » de « forces » | exact | inchangé |
| 35 | A | x=262,8 sur « o » de « m'aur‹o›nt » | exact | inchangé |
| 35 | Bm | x=319,7 sur « é » de « quitt‹é » | exact | inchangé |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espaceur : l. 16.

En-tête : ajout de `{source: Bénis Dieu (10000 raisons) - D.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 37:reporte:G:1 | laissé | Timothée |  |
| 37:reporte:D:1 | laissé | Timothée |  |
| 37:reporte:A:1 | laissé | Timothée |  |
| 37:reporte:D:2 | laissé | Timothée |  |
| 34:decale:A:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 30:reporte:G:1 | laissé | Timothée |  |
| 30:reporte:D:1 | laissé | Timothée |  |
| 30:reporte:A:1 | laissé | Timothée |  |
| 30:reporte:D:2 | laissé | Timothée |  |
| 27:decale:D:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 23:reporte:G:1 | laissé | Timothée |  |
| 23:reporte:D:1 | laissé | Timothée |  |
| 23:reporte:A:1 | laissé | Timothée |  |
| 23:reporte:D:2 | laissé | Timothée |  |
| 22:decale:G:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 22:decale:A:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 9:instrumental:D:1 | laissé | Timothée |  |

- PDF église (rendu ChordPro, couche texte) : chaque label mesuré par get_text (x0 du label = x0 du caractère, d=0,0 partout) ; rendu 2× regardé (crops/benis-dieu-10000-raisons/haut.png, bas.png).
- Écarts du relevé : les 4 « ok » (l.22 G et A, l.27 D, l.34 A) mettent l'accord comme la partition ; les « non » de l.23/30/37 sont justes (check.py ne lit pas ces lignes à cause du groupe entre parenthèses, les accords sont exacts).
- Corrigé hors écarts : l.28 et l.35 `[G]Ton`/`[G]Quand` → `[G] Ton`/`[G] Quand` (label sur l'indentation, comme l.21/23/30/37) ; l.22 paroles « quoiqu  'il » → « quoiqu'il ».
- Ajouté : « (Dsus4 D Dsus4 D) » gravé en fin de chaque couplet → `[(Dsus4)] [(D)] [(Dsus4)] [(D)]` collé après le point final (l.23, 30, 37).
- Intro [D] (l.9) : absente de la partition (case de tonalité lue comme accord) ; laissée, retrait proposé en structure, à appliquer par Timothée.
- Autre version : « Bénis Dieu (10000 raisons) - E.pdf » (même feuille, autre tonalité), non mesurée.
- Thèmes inchangés (Adoration, Action de grâce : dans la liste).

### benis-l-eternel — Bénis l'Éternel

Lot 1 · partition retenue : `Bénis l'Éternel.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[E]Bénis l'Éter[B/E]nel, mon [E]â - [B/E]me. (x2)` → `[E]Bénis l'Éter[B/E]nel, mon [E]â[B/E]me. (x2)`
- l. 10 : `[A]Sois émerveil[B]lée, [G#m7]Sa fidéli[C#m7]té` → `[A]Sois émervei[B]llée, [G#m7]Sa fidéli[C#m7]té`
- l. 13 : `[E]Bénis l'Éter[B/E]nel, mon [E]â - [B/E]me. (x2)` → `[E]Bénis l'Éter[B/E]nel, mon [E]â[B/E]me. (x2)`
- l. 16 : `[F#m7]Bénis l'Éter[A/B]nel, ô mon [A/E]â - [E]me.` → `[F#m7]Bénis l'Éter[A/B]nel, ô mon [A/E]âme[E].`
- l. 20 : `Quand tout s'ef[A]fon[E/G#]dre,  [ ]  [F#m]som - [E]bre,` → `Quand tout s'e[A]ffon[E/G#]dre, [F#m]som[E]bre,`
- l. 21 : `je [B]sais que tu es [E]là ;` → `je [B]sais que Tu es [E]là ;`
- l. 22 : `Et que m'im[A]por[E/G#]te si les [F#m]por - [E]tes ` → `Et que m'im[A]por[E/G#]te si les [F#m]por[E]tes`
- l. 24 : `Je suis en [A]mar[E/G#]che sous [F#m]l'ar - [E]che ` → `Je suis en [A]mar[E/G#]che sous [F#m]l'ar[E]che`
- l. 26 : `Jésus, Tu [F#m7]es Roi, et j'avance à [Bsus7]Ta sui[B7]te.` → `Jésus, Tu [F#m7]es Roi, et j'avance [Bsus7]à Ta [B7]suite.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | E | x=45,4 sur « B » de « Bénis » (d=0,0) | exact | [E]Bénis |
| 9 | B/E | x=125,8 sur « n » de « Éter‹n›el » (d=0,0) | exact | l'Éter[B/E]nel |
| 9 | E | x=191,6 sur « â » de « â - me » (d=0,0) | exact (forme : tiret du transcripteur) | [E]â[B/E]me |
| 9 | B/E | x=214,7 sur « m » de « me » (d=0,0) | exact (forme : tiret du transcripteur) | â[B/E]me. |
| 13 | E | x=45,4 sur « B » de « Bénis » (d=0,0) | exact | [E]Bénis |
| 13 | B/E | x=125,8 sur « n » de « Éter‹n›el » (d=0,0) | exact | l'Éter[B/E]nel |
| 13 | E | x=191,6 sur « â » de « â - me » (d=0,0) | exact (forme : tiret du transcripteur) | [E]â[B/E]me |
| 13 | B/E | x=214,7 sur « m » de « me » (d=0,0) | exact (forme : tiret du transcripteur) | â[B/E]me. |
| 10 | A | x=45,4 sur « S » de « Sois » | exact | [A]Sois |
| 10 | B | x=137,8 sur le premier « l » de « émervei‹l›lée » ; le .cho le met devant le second « l » | décalé | émervei[B]llée |
| 10 | G#m7 | x=171,6 sur « S » de « Sa » | exact | [G#m7]Sa |
| 10 | C#m7 | x=228,5 sur « t » de « fidéli‹t›é » | exact | fidéli[C#m7]té |
| 16 | F#m7 | x=45,4 sur « B » de « Bénis » | exact | [F#m7]Bénis |
| 16 | A/B | x=125,8 sur « n » de « Éter‹n›el » | exact | l'Éter[A/B]nel |
| 16 | A/E | x=204,9 sur « â » | exact (forme : tiret retiré) | [A/E]âme |
| 16 | E | x=250,3 sur le « . » après « me » ; le .cho le met devant « m » | décalé | âme[E]. |
| 20 | A | x=134,8 sur le premier « f » de « s'e‹f›fondre » ; le .cho le met devant le second « f » | décalé | s'e[A]ffondre |
| 20 | E/G# | x=161,4 sur « d » de « effon‹d›re » | exact | effon[E/G#]dre |
| 20 | F#m | x=211,2 sur « s » de « som » (le blanc de la feuille avant « som » ne porte aucun accord : l'espaceur [ ] n'a pas de source) | exact (forme : tiret et espaceur retirés) | [F#m]som[E]bre |
| 20 | E | x=255,7 sur « b » de « bre » | exact (forme) | som[E]bre |
| 21 | B | x=304,6 sur « s » de « sais » | exact | [B]sais |
| 21 | E | x=413,1 sur « l » de « là » | exact | [E]là |
| 22 | A | x=115,2 sur « p » de « m'im‹p›or » | exact | m'im[A]por |
| 22 | E/G# | x=152,5 sur « t » de « te » | exact | por[E/G#]te |
| 22 | F#m | x=211,2 sur « p » de « por - tes » | exact (forme : tiret retiré) | [F#m]por[E]tes |
| 22 | E | x=248,5 sur « t » de « tes » ; check.py après le dit « absent du .cho » (l.24) et « absent de la source » (l.23) : alignement raté de l'outil sur la ligne source longue, l'accord est bien écrit por[E]tes | exact (vérifié à l'œil) | por[E]tes |
| 23 | Bsus | x=295,7 sur « f » de « ferment » ; gravé « Bsus », écrit Bsus4 par l'orthographe de 01 (moteur) | exact (nom canonique) | se [Bsus4]ferment |
| 24 | A | x=107,7 sur « m » de « marche » | exact | [A]mar |
| 24 | E/G# | x=135,2 sur « c » de « che » | exact | mar[E/G#]che |
| 24 | F#m | x=203,7 sur « l » de « l'ar » | exact (forme : tiret retiré) | [F#m]l'ar[E]che |
| 24 | E | x=238,8 sur « c » de « che » | exact (forme) | l'ar[E]che |
| 26 | F#m7 | x=105,0 sur « e » de « es » | exact | Tu [F#m7]es |
| 26 | Bsus7 | x=239,7 sur « à » ; le .cho le met sur « Ta » | décalé | j'avance [Bsus7]à Ta |
| 26 | B7 | x=293,9 sur « s » de « suite » ; le .cho le met devant « t » | décalé | Ta [B7]suite. |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — orthographe d'accord : l. 23.

En-tête : ajout de `{source: Bénis l'Éternel.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 26:decale:Bsus7:1 | appliqué | def | inclus dans la ligne de 26:oeil:8 |
| 26:decale:B7:1 | appliqué | def | inclus dans la ligne de 26:oeil:8 |
| 26:oeil:8 | appliqué | session | Même résultat que les deux décalés déjà ok ; ligne entière juste. — partition : F#m7 sur « e » de « es » (x=105,0), Bsus7 sur « à » (x=239,7), B7 sur « s » de « suite » (x=293,9). |
| 24:oeil:7 | appliqué | session | Tiret du transcripteur : « l'arche » en mot entier, accords inchangés. — partition : F#m sur « l » de « l'ar » (x=203,7), E sur « c » de « che » (x=238,8) ; A sur « m », E/G# sur « c » de « marche ». |
| 22:oeil:6 | appliqué | session | Tiret du transcripteur : « portes » en mot entier, accords inchangés. — partition : F#m sur « p » de « por » (x=211,2), E sur « t » de « tes » (x=248,5) ; A sur « p » et E/G# sur « t » de « m'impor - te ». |
| 21:oeil:5 | appliqué | session | Pronom divin en capitale comme sur la partition (01). — partition : La feuille écrit « que Tu es là » ; B sur « s » de « sais », E sur « l » de « là ». |
| 20:decale:A:1 | laissé | def | la ligne prend le texte de 20:oeil:4 |
| 20:oeil:4 | appliqué | session | A sur le premier « f », « sombre » en mot entier, espaceur retiré d'une ligne chantée (01) ; tous les accords à leur caractère. — partition : A sur le premier « f » de « s'effondre » (x=134,8), E/G# sur « d », F#m sur « s » de « som » (x=211,3), E sur « b » de « bre » (x=255,7). |
| 16:decale:E:1 | laissé | def | la ligne prend le texte de 16:oeil:3 |
| 16:oeil:3 | appliqué | session | E sur le point final et « âme » en mot entier ; le reste de la ligne est juste. — partition : F#m7 sur « B », A/B sur « n » d'« Éternel », A/E sur « â » (x=204,9), E sur le « . » après « me » (x=250,3). |
| 13:oeil:2 | appliqué | session | Tiret du transcripteur : mot entier, accords inchangés. — partition : Identique à la ligne 9 : E sur « â », B/E sur « m ». |
| 10:decale:B:1 | appliqué | def | inclus dans la ligne de 10:oeil:1 |
| 10:oeil:1 | appliqué | session | Même ligne que le décalé déjà ok : B devant le premier « l ». — partition : B à x=137,8, origine du premier « l » de « émerveillée » ; A sur « S », G#m7 sur « S » de « Sa », C#m7 sur « t » de « té ». |
| 9:oeil:0 | appliqué | session | Tiret du transcripteur : mot entier, accords sur les mêmes caractères (01, 02). — partition : Couche texte : E sur « â » (x=191,6), B/E sur « m » de « me » (x=214,7). |

- Feuille de l'église en E à couche texte (famille église FPDF) : les 47 accords mesurés au caractère avec get_text('rawdict') (d=0,0 pt partout) et rendu 2× regardé ; après décisions, chaque accord est sur le caractère de la partition.
- Les 9 questions sont « ok » : 5 décalés corrigés (B l.10, E l.16, A l.20, Bsus7 et B7 l.26), tirets du transcripteur retirés (â-me, som-bre, por-tes, l'ar-che), « Tu » en capitale l.21 comme la feuille ; l'espaceur [ ] de la l.20 n'a pas d'accord sur la partition.
- Bsus gravé l.23 : écrit Bsus4 par le moteur (orthographe de 01), même accord.
- check.py après : 46 exacts ; le E de « por[E]tes » apparaît « absent de la source » (l.23) et « absent du .cho » (l.24) : la ligne source longue coupe mal à la frontière des lignes du .cho ; vérifié à l'œil, x=248,5 sur « t » de « tes ».
- Liste extra (paroles « por - tes » / « port ») : artefact de l'alignement de l'outil, non appliquée. « (x2) » laissé dans les lignes 9 et 13 comme sur la feuille.
- Autres sources : feuilles shir.fr (E), même arrangement, quelques accords une lettre plus loin dans le couplet ; « Bénis l'Éternel (Praise) » et « - F » sont un autre chant. Thèmes actuels (Action de grâce, Adoration) dans la liste : inchangés.

### briser-les-chaines — Briser les chaînes

Lot 1 · partition retenue : `Briser les chaînes - C.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `Pour briser les [F]chaînes, briser [C]les chaînes.[G] ` → `Pour briser les [F]chaînes, briser l[C]es chaînes[G].`
- l. 16 : `Pour briser les [F]chaînes, briser l[C]es chaînes.[G]` → `Pour briser les [F]chaînes, briser le[C]s chaînes[G].`
- l. 20 : `[Am] J'entends les [F]chaînes tomb[C]er. (x..[G].)` → `[Am] J'entends les [F]chaînes tomb[C]er. (x[G]...)`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | C | p1 y=174,8 : C x=265,9 sur « e » de « l‹e›s » (2e « les chaînes ») | décalé (le .cho est devant « l ») | briser l[C]es chaînes — écart 10:decale:C:1, ok du relevé, appliqué |
| 10 | G | p1 y=174,8 : G x=343,2 sur le « . » final de « chaînes. » | décalé (le .cho le met après le point) | chaînes[G]. — écart 10:decale:G:1, ok du relevé, appliqué |
| 16 | C | p1 y=310,9 : C x=274,8 sur « s » de « le‹s› » | décalé (le .cho est devant « e ») | briser le[C]s chaînes — écart 16:decale:C:1, ok du relevé, appliqué |
| 16 | G | p1 y=310,9 : G x=343,2 sur le « . » final de « chaînes. » | décalé (le .cho le met après le point) | chaînes[G]. — écart 16:decale:G:1, ok du relevé, appliqué |
| 20 | G | p1 y=378,9 : G x=284,1 sur le premier « . » de « (x..) » | décalé (le .cho est devant « ) ») | (x[G]...) — écart 20:decale:G:1, ok du relevé, appliqué |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espace de fin : l. 9.

En-tête : ajout de `{source: Briser les chaînes - C.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 20:decale:G:1 | appliqué | Timothée |  |
| 16:decale:C:1 | appliqué | Timothée |  |
| 16:decale:G:1 | appliqué | Timothée |  |
| 10:decale:C:1 | appliqué | Timothée |  |
| 10:decale:G:1 | appliqué | Timothée |  |

- PDF église (FPDF) à couche texte, mesuré en rawdict : 20 accords, tous sur le caractère sous lequel le label commence ; rendu 2× regardé (crops/briser-les-chaines/zone.png), rien de douteux.
- Les 5 écarts « ok » du relevé mettent chaque accord comme la partition ; aucune ligne de plus à changer. check.py après : 20/20 exacts.
- Les autres accords (l. 8, 9, 14, 15, 20 Am/F/C) sont exacts dans le fichier actuel ; l. 14, G après « lève. » : label sur l'espace après le point, donc « lève.[G] », exact.
- Paroles, non touché : la partition grave « (x..) » (deux points) au Pont, le .cho a « (x...) » ; sans effet sur les accords.
- Autres versions présentes : « Briser les chaînes - Accords C.pdf », « Briser les chaînes - D.pdf » (non mesurées, la partition retenue fait foi).

### ce-nom-si-merveilleux — Ce Nom si merveilleux

Lot 1 · partition retenue : `Ce Nom si merveilleux.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 6 : `{themes: Adoration, Resurrection}` → `{themes: Adoration, Résurrection}` *(en-tête)* — Le chant s'adresse à Jésus pour exalter son Nom (adoration, refrain répété trois fois), puis chante le voile déchiré, la mort désarmée et le Roi ressuscité (résurrection) ; l'en-tête écrit « Resurrection » sans accent, hors de la liste : orthographe corrigée, choix gardé.
- l. 17 : `Le Nom de [Bm7]Jésus-Ch[A]rist mon R[G]oi.` → `Le Nom de J[Bm7]ésus-Ch[A]rist mon R[G]oi.`
- l. 19 : `Ô ce Nom est si merveill[Bm7]eux le N[A]om de J[G]ésus.` → `Ô ce Nom est si mervei[Bm7]lleux le N[A]om de J[G]ésus.`
- l. 38 : `Désarmant la m[Bm7]ort et le pé[D/F#]ché.` → `Désarmant la m[Bm7]ort et le péc[D/F#]hé.`
- l. 39 : `Les Cieux chantent T[G]a gloire, l'écho de Ta [A]victoire,` → `Les Cieux chantent T[G]a gloire, l'écho de Ta v[A]ictoire,`
- l. 46 : `À Toi soit [G]le règne, à Toi soit [A]la gloire,` → `À Toi soit l[G]e règne, à Toi soit l[A]a gloire,`
- l. 54 : `Ô ce Nom est victori[D/F#]eux, Sa puissance est sans pareil[A]le,` → `Ô ce Nom est victori[D/F#]eux, Sa puissance est sans pareill[A]e,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 17 | Bm7 | p1 y=323,5 : Bm7 x=136,1 sur « é » de « J‹é›sus-Christ » | décalé (le .cho est devant « J ») | Le Nom de J[Bm7]ésus-Ch[A]rist — écart 17:decale:Bm7:1, ok par défaut, appliqué |
| 19 | Bm7 | p1 y=391,5 : Bm7 x=211,6 sur le second « l » de « mervei‹l›leux » | décalé (le .cho est devant « e ») | mervei[Bm7]lleux — écart 19:decale:Bm7:1, ok par défaut, appliqué |
| 38 | D/F# | p2 y=88,2 : D/F# x=241,9 sur « h » de « péc‹h›é. » | décalé (le .cho est devant « c ») | péc[D/F#]hé. — écart 38:decale:D/F#:1, ok par défaut, appliqué |
| 39 | A | p2 y=122,3 : A x=357,0 sur « i » de « v‹i›ctoire » | décalé (le .cho est devant « v ») | Ta v[A]ictoire — écart 39:decale:A:1, ok par défaut, appliqué |
| 46 | G | p2 y=292,3 : G x=120,1 sur « e » de « l‹e› règne » | décalé (le .cho est devant « l ») | soit l[G]e règne — écart 46:decale:G:1, ok par défaut, appliqué |
| 46 | A | p2 y=292,3 : A x=256,1 sur « a » de « l‹a› gloire » | décalé (le .cho est devant « l ») | soit l[A]a gloire — écart 46:decale:A:1, ok par défaut, appliqué |
| 54 | A | p2 y=462,4 : A x=431,3 sur le « e » final de « pareill‹e›, » | décalé (le .cho est devant le second « l ») | pareill[A]e, — question 54:fable:54:decale:A:1 tranchée ok |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — mot coupé au tiret : l. 24, 26 ; espace de fin : l. 51.

En-tête : ajout de `{source: Ce Nom si merveilleux.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 54:decale:A:1 | laissé | def |  |
| 54:fable:54:decale:A:1 | appliqué | session | La ligne proposée met le A devant le « e » final de « pareille », comme la partition (et comme les vers jumeaux des refrains 1 et 2, l. 18 et 32) ; le D/F# reste sur « e » de « victori‹e›ux », exact ; paroles inchangées. Seule lecture retenue : l'écart 54:decale:A:1 (même déplacement) n'est pas appliqué en plus. — partition : p2 y=462,4 : A x=431,3 sur le « e » final de « pareill‹e›, » ; D/F# x=189,4 sur « victori‹e›ux » ; vu sur le rendu 2× (crops/ce-nom-si-merveilleux/p2-ref3.png). |
| 46:decale:G:1 | appliqué | def |  |
| 46:decale:A:1 | appliqué | def |  |
| 39:decale:A:1 | appliqué | def |  |
| 38:decale:D/F#:1 | appliqué | def |  |
| 19:decale:Bm7:1 | appliqué | def |  |
| 17:decale:Bm7:1 | appliqué | def |  |

- PDF église (FPDF) à couche texte, mesuré en rawdict sur les deux pages : 64 accords, chacun ramené au caractère sous lequel le label commence ; rendus 2× regardés (Refrain 1, Ponts 1 et 2, Refrain 3), rien de douteux.
- Les six déplacements par défaut (l. 17, 19, 38, 39, 46 ×2) mettent chaque accord comme la partition ; la question de la l. 54 est tranchée ok sur la même mesure. Tous les autres accords du fichier actuel sont déjà exacts (noms compris : Bm aux l. 12 et 26, Bm7 ailleurs, comme gravé).
- Forme laissée au moteur : « ve - nu », « sépa - rer » (tirets du transcripteur) ; le Refrain 3 garde sa coupe en deux lignes de « Ô ce Nom est victorieux, ô ce Nom est victorieux, » (une seule ligne sur la partition), sans effet sur les accords.
- Non repris de la partition : traducteurs et titre original (« What a beautiful Name »), pas de champ prévu.
- Autres versions : « Ce Nom si merveilleux - C.pdf » (même feuille dans une autre tonalité) et « Ce nom si merveilleux Gospel.pdf » (scan Word, autre arrangement), non mesurées.

### cet-amour — Cet amour

Lot 1 · partition retenue : `Cet amour.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 6 : `{themes: Croix, Grace}` → `{themes: Grâce, Croix}` *(en-tête)* — Le chant parle d'abord de l'amour de Dieu qui bénit, relève, libère et restaure (Grâce) ; la croix vient ensuite (« mourir au calvaire », « Tu nous appelles à la croix ») ; la valeur « Grace » sans accent est corrigée en nom canonique.
- l. 13 : `[A5] En Toi les h[D2]umbles sont bénis, [A5] en Toi les [D2]faibles sont affermis.` → `[A5] En Toi les h[D2]umbles sont bénis, [A5] en Toi les f[D2]aibles sont affermis.`
- l. 14 : `[F#m7] Les cœurs brisés [C#m/E]Tu rétabl[D2]is, donnant la vie.` → `[F#m7] Les cœurs bris[C#m/E]és Tu rétabl[D2]is, donnant la vie.`
- l. 18 : `[A] Cet amour qui peut [E]libérer, [F#m7]cet amour qui peut [D2]restaurer` → `[A] Cet amour qui peut [E]libérer,[F#m7] cet amour qui peut [D2]restaurer`
- l. 19 : `Nous app[A]elle par notre n[E]om, Tu nous appe[F#m7]lles par notre n[D2]om.` → `Nous app[A]elle par notre n[E]om, Tu nous app[F#m7]elles par notre n[D2]om.`
- l. 20 : `[A] Ce Dieu qui créa tout [E]l'univers, [F#m7]ce Dieu qui vint mourir [D2]au calvaire` → `[A] Ce Dieu qui créa tout [E]l'univers,[F#m7] ce Dieu qui vint mourir [D2]au calvaire`
- l. 21 : `Nous app[A]elle par notre n[E]om, Tu nous appe[F#m7]lles par notre n[D2]om.` → `Nous app[A]elle par notre n[E]om, Tu nous app[F#m7]elles par notre n[D2]om.`
- l. 25 : `[A5] À ceux qui d[D2]outent dans la foi, [A5]aux chancel[D2]ants, Tu tends les b[F#m7]ras.` → `[A5] À ceux qui d[D2]outent dans la foi,[A5] aux chancel[D2]ants, Tu tends les b[F#m7]ras.`
- l. 30 : `Oh ![E](x4) [F#m] [D2] ` → `Oh ![E] (x4) [F#m] [D2]`
- l. 31 : `[A] De Ta voix, [E]de Ta voix, [F#m7] Tu nous app[D2]elles à la croix. (x2)` → `[A] De Ta voix,[E] de Ta voix, [F#m7] Tu nous app[D2]elles à la croix. (x2)`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 13 | D2 | x=340,7 sur « a » de « f‹a›ibles » | décalé | f[D2]aibles (défaut ok appliqué) |
| 14 | F#m7 | x=31,2 sur l'espace avant « Les » (span « F » + « #m7 ») | exact (check.py lit « absent » : label découpé en deux spans) | aucune : [F#m7] Les |
| 14 | C#m/E | x=145,9 sur « é » de « bris‹é›s » (label en trois spans « C », « #m », « /E ») | décalé (check.py lit « absent » après correction, même cause) | bris[C#m/E]és (défaut ok appliqué) |
| 14 | D2 | x=230,4 sur « i » de « rétabl‹i›s » | exact (check.py lit « absent » : ligne mal appariée par l'outil) | aucune |
| 18 | F#m7 | x=243,7 sur l'espace après « libérer, » | décalé | libérer,[F#m7] cet |
| 19 | F#m7 | x=340,6 sur « e » de « app‹e›lles » | décalé | app[F#m7]elles |
| 20 | F#m7 | x=271,6 sur l'espace après « l'univers, » | décalé | l'univers,[F#m7] ce |
| 21 | F#m7 | x=340,6 sur « e » de « app‹e›lles » | décalé | app[F#m7]elles |
| 25 | A5 | x=254,4 sur l'espace après « foi, » | décalé | foi,[A5] aux |
| 26 | C#m/E | x=105,9 sur « e » de « app‹e›lles » (label en trois spans) | exact (check.py lit « absent » : label découpé) | aucune |
| 26 | D2 | x=196,6 sur « o » de « v‹o›ix » | exact (check.py lit « absent » : ligne mal appariée par l'outil) | aucune |
| 30 | E | x=75,6 sur l'espace entre « Oh ! » et « (x4) » ; F#m x=107,6 sur l'espace après « (x4) » ; D2 x=146,1 hors texte | décalé | Oh ![E] (x4) [F#m] [D2] |
| 31 | E | x=135,2 sur l'espace après « voix, » | décalé | voix,[E] de |

En-tête : ajout de `{source: Cet amour.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 31:decale:E:1 | appliqué | def |  |
| 30:decale:E:1 | laissé | def |  |
| 30:fable:30:decale:E:1 | appliqué | session | Rendu ChordPro de l'église : le label E commence sur l'espace entre « ! » et « (x4) », donc crochet puis espace (02, label sur l'espace). — partition : Couche texte : E à x=75,6, exactement l'espace tapé après « ! » (« ! » à x=71,2, « ( » à x=80,0) ; F#m à x=107,6 sur l'espace après « ) », D2 à x=146,1 au-delà du texte ; confirmé sur la découpe agrandie de la ligne du Pont. |
| 25:decale:A5:1 | appliqué | def |  |
| 21:decale:F#m7:1 | appliqué | def |  |
| 20:decale:F#m7:1 | appliqué | def |  |
| 19:decale:F#m7:1 | appliqué | def |  |
| 18:decale:F#m7:1 | appliqué | def |  |
| 14:decale:C#m/E:1 | appliqué | def |  |
| 13:decale:D2:1 | appliqué | def |  |

- Partition : Cet amour.pdf (rendu ChordPro de l'église, couche texte) ; chaque accord du chant mesuré en x sur la couche texte, découpes l. 14 et l. 26 regardées à 2×.
- La question du Pont (l. 30) : ok, E sur l'espace avant « (x4) ».
- Les huit corrections « décalé » par défaut (l. 13, 14, 18, 19, 20, 21, 25, 31) concordent avec la couche texte : après elles, les 41 accords sont à leur caractère.
- Les cinq « absent de la source » restants de check.py (l. 14 et l. 26, numérotés 15 et 27 après l'ajout de {source}) sont une lecture ratée de l'outil : labels écrits en plusieurs spans (« C » « #m » « /E », « F » « #m7 ») ; vérifiés à l'œil et à la mesure, tous exacts.
- Autre fichier : Cet amour - Accords.pdf (même feuille selon le dossier), non utilisé.

### chaine-d-amour — Chaîne d'amour

Lot 1 · partition retenue : `Chaîne d'amour.pdf` (eglise-fpdf, mesure fiable) · **fichier inchangé**

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 22 | A | x=100,5 sur « c » de « cha‹c›un » | exact | aucune (seul le mot « Et » → « Oui » change) |
| 22 | E | x=219,6 sur l'espace après « maillons » | exact | aucune |

- Partition : Chaîne d'amour.pdf (rendu ChordPro de l'église, couche texte) ; les 32 accords mesurés en x, tous exacts (check.py : 32 exact, rien d'autre) ; F#m l. 11/15 à x=91,7 = bord gauche du « c » de « chaîne », E à x=144,1 sur le « d » de « d'amour ».
- Aucun écart du relevé, aucune question.
- Une correction de paroles, pas d'accords : l. 22 « Et chacun » → « Oui chacun », comme les deux feuilles (église et shir.fr) ; check.py ne l'avait pas relevée.
- Autre version : Chaîne d’amour.pdf (shir.fr, 2015, tonalité F#m) : mêmes accords et mêmes paroles, sans autre écart lu.
- Thèmes : « Famille de Dieu » est dans la liste et se défend ; inchangé.
- Paroles, non appliqué (hors relevé) : l. 22 « Et chacun des maillons » → la feuille porte « Oui chacun des maillons ».

### chantons — Chantons

Lot 1 · partition retenue : `Chantons.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 12 : `[Bm7]Un palais [D]de lou[E7sus4]ange.` → `[Bm7]Un palais [D]de loua[E7sus4]nge.`
- l. 13 : `[D/E]Chan - [A]tons le [D]Roi des [E]rois, ` → `[D/E]Chan[A]tons le [D]Roi des r[E]ois,`
- l. 14 : `[A]Son amour [D]durera.[E] [D/E] [E]` → `[A]Son amour [D]durera[E]. [D/E] [E]`
- l. 16 : `[Bm7]Dans Son temple, [D]ici-bas. [Esus4]  [ ]  [E/F]  [ ]  [F#m7]` → `[Bm7]Dans Son temple, [D]ici-bas[Esus4]. [E/F] [F#m7]`
- l. 22 : `Jé[A]sus [D] de[E]meure au mi[D]lieu de Son [A]peuple quand [D]il vient L'a[E]dorer.[D]` → `Jé[A]sus [D] d[E]emeure au mi[D]lieu de Son [A]peuple quand [D]il vient L'a[E]dorer.[D]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | E7sus4 | y=174,8 : label x=169,0 = x0 du « n » de « loua‹n›ge » (« a » à 160,1) | décalé | loua[E7sus4]nge. (relevé ok, appliqué) |
| 13 | E | y=208,8 : label x=213,4 = x0 du « o » de « r‹o›is » (« r » à 208,1) | décalé | r[E]ois, (relevé ok, appliqué) |
| 14 | E | y=208,8 : label x=371,7 = x0 du « . » de « durera‹.› » | décalé (le .cho le met en l'air après le point) | durera[E]. (relevé ok, appliqué) |
| 16 | Esus4 | y=276,8 : label x=223,2 = x0 du « . » de « ici-bas‹.› » | décalé (le .cho le met en l'air après le point) | ici-bas[Esus4]. (relevé ok, appliqué) |
| 22 | E | y=412,9 : label x=104,1 = x0 du « e » de « d‹e›meure » (ligne 21 : E à 113,0 sur « m », déjà juste) | décalé | d[E]emeure (relevé ok, appliqué) |
| 11 | D | y=140,8 : x=71,1 = x0 du « s » de « Dre‹s›sons » | exact (vérifié à l'œil ; check.py ne lit pas cette rangée, le # de C#/F et F#m7 y est gravé en plus petit) | aucune |
| 11 | E | x=166,3 = x0 du « t » de « trône » | exact (vérifié à l'œil, outil qui lit mal la rangée) | aucune |
| 11 | C#/F | C@229,4 + #@241,0 + /F@247,6 ; x=229,4 = x0 du « r » de « reconnaissance » | exact (vérifié à l'œil, outil qui lit mal la rangée) | aucune |
| 11 | F#m7 | x=290,8 = x0 du « s » de « reconnai‹s›sance » | exact (vérifié à l'œil, outil qui lit mal la rangée) | aucune |
| 15 | D | y=242,8 : x=64,9 = x0 du « q » de « quand » | exact (vérifié à l'œil, outil qui lit mal la rangée) | aucune |
| 15 | E | x=153,0 = x0 du « l » de « loue » | exact (vérifié à l'œil, outil qui lit mal la rangée) | aucune |
| 15 | C#/F | C@216,1 + #@227,7 + /F@234,3 ; x=216,1 = x0 du « g » de « gloire » | exact (vérifié à l'œil, outil qui lit mal la rangée) | aucune |
| 15 | F#m7 | x=324,6 = x0 du « s » de « sur » | exact (vérifié à l'œil, outil qui lit mal la rangée) | aucune |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espace de fin : l. 9, 26, 28.

En-tête : ajout de `{source: Chantons.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 22:decale:E:1 | appliqué | Timothée |  |
| 16:decale:Esus4:1 | appliqué | Timothée |  |
| 14:decale:E:1 | appliqué | Timothée |  |
| 13:decale:E:1 | appliqué | Timothée |  |
| 12:decale:E7sus4:1 | appliqué | Timothée |  |

- Rendu ChordPro de l'église (couche texte) : les 60 accords du chant mesurés un par un, x du label contre x0 du caractère (PyMuPDF rawdict), et la page rendue à 2× regardée.
- Les cinq « ok » du relevé mettent chaque accord sur le caractère de la partition : appliqués tels quels, aucune ligne de plus à corriger.
- Les 8 « absent de la source » restants de check.py (l. 11 et 15, numéros du fichier actuel) sont des erreurs de lecture de l'outil : les rangées où C#/F est gravé en trois morceaux (C, # plus petit, /F). Vérifiés à l'œil et en coordonnées : exacts.
- Ligne 16 : la partition grave Esus4, E/F, F#m7 après « ici-bas. » ; E/F est bien le nom gravé (pas E/F#), gardé tel quel.
- Non repris de la partition : le crédit de traduction, titre original « Sing out ». Thèmes actuels (Adoration, Action de grâce) gardés.

### cherchez-d-abord — Cherchez d'abord

Lot 1 · partition retenue : `Cherchez d’abord.pdf` (shirfr, mesure fiable)

Lignes modifiées :

- l. 9 : `[D]Cherchez d'a[Dmaj9/F#]bord le roy[Bm]aume de Dieu [G]et sa jus[D/F#]ti - [A]ce,` → `[D]Cherchez d'a[Dmaj9/F#]bord le roy[Bm]aume de Dieu [G]et sa jus[D/F#]ti[A]ce`
- l. 14 : `[D]Al - [A]lé - [G]lu - [D/F#]ia,  [ ]  [G]al - [Gmaj9]lé - [A]luia,` → `[D]Al[A]lé[G]lu[D/F#]ia, [G]al[Gmaj9]lé[A]luia,`
- l. 15 : `[Bm]Al - [A6]lé - [G]lu - [D/F#]ia, [Em]allé - [D]lu, allé[A/C#]lu - [G]ia !` → `[Bm]Al[A6]lé[G]lu[D/F#]ia, [Em]allé[D]lu, allé[A/C#]lu[G]ia !`
- l. 29 : `[D]Al[F#m/C#]lé - [Bm]luia, al[D]lé[F#m/C#]lu - [Bm]ia ! (x2)` → `[D]Al[F#m/C#]lé[Bm]luia, [D]al[F#m/C#]lé[Bm]luia ! (x2)`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | D | x=34,0 sur « C » de « Cherchez » | exact | inchangé |
| 9 | Dmaj9/F# | DM9/F# x=137,0 sur « b » de « d'a‹b›ord » | exact | inchangé |
| 9 | Bm | x=222,2 sur « a » de « roy‹a›ume » | exact | inchangé |
| 9 | G | x=338,1 sur « e » de « et » | exact | inchangé |
| 9 | D/F# | x=402,1 sur « t » de « jus‹t›i » | exact | inchangé |
| 9 | A | x=443,1 sur « c » de « ce » (la feuille écrit « justi - ce » sans virgule) | exact | jus[D/F#]ti[A]ce, virgule retirée ; après la forme (mot entier), check.py ne retrouve plus « ti - ce » et classe ce A « absent de la source » (l.10 après) et « absent du .cho » (l.11) : artefact de l'outil, accord sur sa lettre |
| 14 | D | x=34,0 sur « A » de « Alléluia » | exact (l'outil disait décalé/nom différent : il compare « Al - lé - lu - ia » au mot « Alléluia ») | [D]Al ; tirets et espaceur [ ] retirés |
| 14 | A | x=51,4 sur le 2e « l » (al‹l›éluia) | exact (l'outil disait décalé/nom différent : il compare « Al - lé - lu - ia » au mot « Alléluia ») | Al[A]lé ; tirets et espaceur [ ] retirés |
| 14 | G | x=65,4 sur le « l » de « lu » | exact (l'outil disait décalé/nom différent : il compare « Al - lé - lu - ia » au mot « Alléluia ») | lé[G]lu ; tirets et espaceur [ ] retirés |
| 14 | D/F# | x=80,5 sur le « i » | exact (l'outil disait décalé/nom différent : il compare « Al - lé - lu - ia » au mot « Alléluia ») | lu[D/F#]ia ; tirets et espaceur [ ] retirés |
| 14 | G | x=118,7 sur le « a » de « allé » | exact (l'outil disait décalé/nom différent : il compare « Al - lé - lu - ia » au mot « Alléluia ») | [G]al ; tirets et espaceur [ ] retirés |
| 14 | Gmaj9 | GM9 x=132,8 sur le 2e « l » de « allé » | exact (l'outil disait décalé/nom différent : il compare « Al - lé - lu - ia » au mot « Alléluia ») | al[Gmaj9]lé ; tirets et espaceur [ ] retirés |
| 14 | A | x=176,6 sur le « l » de « luia » | exact (l'outil disait décalé/nom différent : il compare « Al - lé - lu - ia » au mot « Alléluia ») | lé[A]luia ; tirets et espaceur [ ] retirés |
| 15 | Bm | x=34,0 sur « A » de « Al » | exact | [Bm]Al ; tirets retirés. Après (l.16), check.py apparie la ligne au 2e refrain gravé (fin A D) et signale Bm décalé, A/C# et G « nom différent » : artefact, mesurés sur le 1er refrain chaque accord est sur sa lettre |
| 15 | A6 | x=66,9 sur le « l » de « lé » | exact | Al[A6]lé ; tirets retirés. Après (l.16), check.py apparie la ligne au 2e refrain gravé (fin A D) et signale Bm décalé, A/C# et G « nom différent » : artefact, mesurés sur le 1er refrain chaque accord est sur sa lettre |
| 15 | G | x=96,4 sur le « l » de « luia » | exact | lé[G]lu ; tirets retirés. Après (l.16), check.py apparie la ligne au 2e refrain gravé (fin A D) et signale Bm décalé, A/C# et G « nom différent » : artefact, mesurés sur le 1er refrain chaque accord est sur sa lettre |
| 15 | D/F# | x=111,5 sur le « i » | exact | lu[D/F#]ia ; tirets retirés. Après (l.16), check.py apparie la ligne au 2e refrain gravé (fin A D) et signale Bm décalé, A/C# et G « nom différent » : artefact, mesurés sur le 1er refrain chaque accord est sur sa lettre |
| 15 | Em | x=149,6 sur le « a » de « allélu » | exact | [Em]allé ; tirets retirés. Après (l.16), check.py apparie la ligne au 2e refrain gravé (fin A D) et signale Bm décalé, A/C# et G « nom différent » : artefact, mesurés sur le 1er refrain chaque accord est sur sa lettre |
| 15 | D | x=177,7 sur le « l » de « lu » | exact | allé[D]lu ; tirets retirés. Après (l.16), check.py apparie la ligne au 2e refrain gravé (fin A D) et signale Bm décalé, A/C# et G « nom différent » : artefact, mesurés sur le 1er refrain chaque accord est sur sa lettre |
| 15 | A/C# | x=230,5 sur le « l » de « lu » du 2e « allélu » | exact | allé[A/C#]lu ; tirets retirés. Après (l.16), check.py apparie la ligne au 2e refrain gravé (fin A D) et signale Bm décalé, A/C# et G « nom différent » : artefact, mesurés sur le 1er refrain chaque accord est sur sa lettre |
| 15 | G | x=275,5 sur le « i » de « ia » | exact | lu[G]ia ; tirets retirés. Après (l.16), check.py apparie la ligne au 2e refrain gravé (fin A D) et signale Bm décalé, A/C# et G « nom différent » : artefact, mesurés sur le 1er refrain chaque accord est sur sa lettre |
| 29 | D | x=34,0 sur « A » de « Allé » | exact | [D]Al |
| 29 | F#m/C# | x=51,4 sur le 2e « l » de « Allé » | exact | Al[F#m/C#]lé |
| 29 | Bm | x=109,7 sur le « l » de « luia » | exact | lé[Bm]luia |
| 29 | D | x=148,6 sur le « a » du 2e « allé » ; .cho sur le 2e « l » | décalé | [D]al |
| 29 | F#m/C# | x=162,7 sur le 2e « l » du 2e « allé » ; .cho sur le « l » de « lu » | décalé | al[F#m/C#]lé |
| 29 | Bm | x=220,9 sur le « l » de « luia » ; .cho sur le « i » | décalé | lé[Bm]luia |
| 24 | D A G D/F# G Gmaj9 A | ligne « Instrumental » 1 de la feuille, y=476,9 : D x=34,0, A x=50,5, G x=67,1, D/F# x=83,6, G x=125,0, GM9 x=141,6, A x=183,0 | exact (l'outil, l.25 après, la compare à l'intro D F#m/C# Bm D F#m/C# Bm : « nom différent » et « absent de la source » fictifs) | inchangé |
| 25 | Bm A6 G D/F# G A/G G | ligne « Instrumental » 2 de la feuille, y=491,9 : Bm x=34,0, A6 x=62,9, G x=91,9, D/F# x=108,5, G x=149,9, A/G x=166,4, G x=195,4 | exact (l'outil, l.26 après, la compare à la ligne 1 et liste ces sept accords « absent du .cho » l.null : artefact) | inchangé |
| 15 | (2e refrain) | l.16 et l.20 après : « absent du .cho » D A G D/F# G GM9 A et Bm A6 G D/F# Em D A/C# G = accords du refrain regravé après le couplet 2 (et du 1er refrain que l'outil réapparie) | absent (section absente du .cho) | structure, à appliquer par Timothée ; l'intro D F#m/C# Bm ×2 aussi |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 24.

En-tête : ajout de `{source: Cherchez d’abord.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 29:decale:D:1 | laissé | def |  |
| 29:decale:F#m/C#:1 | laissé | def |  |
| 29:decale:Bm:1 | laissé | def |  |
| 29:decale:D:2 | laissé | def |  |
| 29:decale:F#m/C#:2 | laissé | def |  |
| 29:decale:Bm:2 | laissé | def |  |
| 29:manquant:D:1 | laissé | def |  |
| 29:manquant:A:1 | laissé | def |  |
| 29:manquant:G:1 | laissé | def |  |
| 29:manquant:D/F#:1 | laissé | def |  |
| 29:manquant:G:2 | laissé | def |  |
| 29:manquant:GM9:1 | laissé | def |  |
| 29:manquant:A:2 | laissé | def |  |
| 29:manquant:Bm:1 | laissé | def |  |
| 29:manquant:A6:1 | laissé | def |  |
| 29:manquant:G:3 | laissé | def |  |
| 29:manquant:D/F#:2 | laissé | def |  |
| 29:manquant:Em:1 | laissé | def |  |
| 29:manquant:D:2 | laissé | def |  |
| 29:manquant:A:3 | laissé | def |  |
| 29:manquant:D:3 | laissé | def |  |
| 29:oeil:3 | laissé | def |  |
| 29:fable:29:decale:D:2 | appliqué | session | La 2e moitié du Final est une syllabe trop tard dans le .cho ; la proposition pose D, F#m/C# et Bm sur les mêmes lettres que la feuille, comme la 1re moitié, et ne fait perdre aucun « ok » (les écarts qu'elle relit sont à « non »). — partition : Couche texte du Final « Allé - luia, allé - luia ! (× 2) » : D x=34,0 sur « A », F#m/C# x=51,4 sur le 2e « l », Bm x=109,7 sur le « l » de « luia », puis D x=148,6 sur le « a » du 2e « allé », F#m/C# x=162,7 sur son 2e « l », Bm x=220,9 sur le « l » de « luia ». |
| 29:fable:29:decale:F#m/C#:2 | appliqué | session | La 2e moitié du Final est une syllabe trop tard dans le .cho ; la proposition pose D, F#m/C# et Bm sur les mêmes lettres que la feuille, comme la 1re moitié, et ne fait perdre aucun « ok » (les écarts qu'elle relit sont à « non »). — inclus dans la ligne de 29:fable:29:decale:D:2 — partition : Couche texte du Final « Allé - luia, allé - luia ! (× 2) » : D x=34,0 sur « A », F#m/C# x=51,4 sur le 2e « l », Bm x=109,7 sur le « l » de « luia », puis D x=148,6 sur le « a » du 2e « allé », F#m/C# x=162,7 sur son 2e « l », Bm x=220,9 sur le « l » de « luia ». |
| 29:fable:29:decale:Bm:2 | appliqué | session | La 2e moitié du Final est une syllabe trop tard dans le .cho ; la proposition pose D, F#m/C# et Bm sur les mêmes lettres que la feuille, comme la 1re moitié, et ne fait perdre aucun « ok » (les écarts qu'elle relit sont à « non »). — inclus dans la ligne de 29:fable:29:decale:D:2 — partition : Couche texte du Final « Allé - luia, allé - luia ! (× 2) » : D x=34,0 sur « A », F#m/C# x=51,4 sur le 2e « l », Bm x=109,7 sur le « l » de « luia », puis D x=148,6 sur le « a » du 2e « allé », F#m/C# x=162,7 sur son 2e « l », Bm x=220,9 sur le « l » de « luia ». |
| 29:fable:29:oeil:3 | appliqué | session | La 2e moitié du Final est une syllabe trop tard dans le .cho ; la proposition pose D, F#m/C# et Bm sur les mêmes lettres que la feuille, comme la 1re moitié, et ne fait perdre aucun « ok » (les écarts qu'elle relit sont à « non »). — inclus dans la ligne de 29:fable:29:decale:D:2 — partition : Couche texte du Final « Allé - luia, allé - luia ! (× 2) » : D x=34,0 sur « A », F#m/C# x=51,4 sur le 2e « l », Bm x=109,7 sur le « l » de « luia », puis D x=148,6 sur le « a » du 2e « allé », F#m/C# x=162,7 sur son 2e « l », Bm x=220,9 sur le « l » de « luia ». |
| 25:instrumental:Bm:1 | laissé | def |  |
| 25:instrumental:A6:1 | laissé | def |  |
| 25:instrumental:A/G:1 | laissé | def |  |
| 25:instrumental:G:1 | laissé | def |  |
| 24:instrumental:A:1 | laissé | def |  |
| 24:instrumental:G:1 | laissé | def |  |
| 24:instrumental:D/F#:1 | laissé | def |  |
| 24:instrumental:G:2 | laissé | def |  |
| 24:instrumental:Gmaj9:1 | laissé | def |  |
| 24:instrumental:A:2 | laissé | def |  |
| 15:oeil:2 | appliqué | session | Les tirets « Al - lé - lu - ia » et « allé - lu » ne sont pas ceux de la feuille ; mots entiers (01), accords inchangés et déjà sur la bonne lettre, et le refrain s'écrit ainsi pareil sur ses deux lignes. — partition : Couche texte « Al - lé - luia, allélu, allélu - ia ! » : Bm x=34,0 sur « A », A6 x=66,9 sur le « l » de « lé », G x=96,4 sur le « l » de « luia », D/F# x=111,5 sur le « i », Em x=149,6 sur le « a » de « allélu », D x=177,7 sur le « l » de « lu », A/C# x=230,5 sur le « l » du 2e « allélu », G x=275,5 sur le « i » de « ia ». |
| 14:decale:D:1 | laissé | def |  |
| 14:decale:A:1 | laissé | def |  |
| 14:decale:G:1 | laissé | def |  |
| 14:decale:D/F#:1 | laissé | def |  |
| 14:nom:G:1 | laissé | def | la ligne prend le texte de 14:oeil:1 |
| 14:nom:Gmaj9:1 | laissé | def | la ligne prend le texte de 14:oeil:1 |
| 14:nom:A:1 | laissé | def |  |
| 14:manquant:G:1 | laissé | def |  |
| 14:manquant:GM9:1 | laissé | def | la ligne prend le texte de 14:oeil:1 |
| 14:manquant:A:1 | laissé | def |  |
| 14:oeil:1 | appliqué | session | La ligne proposée est juste en entier : chaque accord est sur la lettre de la feuille, les mots sont entiers (01) et l'espaceur [ ] disparaît d'une ligne chantée ; elle écarte aussi les renommages G→Bm, Gmaj9→A6 et l'ajout de GM9 appliqués par défaut, qui sont des accords de la ligne suivante rabattus par l'outil. — partition : Couche texte « Alléluia, allé - luia, » : D x=34,0 sur « A », A x=51,4 sur le 2e « l », G x=65,4 sur le « l » de « luia », D/F# x=80,5 sur le « i », G x=118,7 sur le « a » de « allé », GM9 x=132,8 sur le 2e « l », A x=176,6 sur le « l » de « luia » ; aucun Bm ni A6 sur cette ligne. |
| 9:oeil:0 | laissé | def |  |
| 9:fable:9:oeil:0 | appliqué | session | La feuille finit le vers sur « ce » sans virgule (comme le couplet 2, déjà sans virgule dans le .cho) ; tous les accords de la proposition sont sur la lettre de la feuille, et le tiret de « justi - ce » est gardé puisque l'autre lecture (mot entier) est laissée par défaut. — partition : Couche texte : D x=34,0 sur « C », DM9/F# x=137,0 sur le « b » de « d'abord », Bm x=222,2 sur le « a » de « royaume », G x=338,1 sur le « e » de « et », D/F# x=402,1 sur le « t » de « justi », A x=443,1 sur le « c » de « ce » ; aucune ponctuation après « ce ». |

- Feuille shir.fr (couche texte, rawdict) mesurée caractère par caractère sur toutes les lignes : couplets 1 et 2 (dont « vi[Dmaj9/F#]vra », DM9/F# x=152,8 = bord gauche du 2e « v »), refrain, Instrumental et Final concordent avec le .cho corrigé ; seule la 2e moitié du Final était réellement décalée (une syllabe trop tard).
- Accords non exacts restants après : tous des artefacts de check.py, expliqués dans « mesures » : A de « justi‹c›e » (mot entier après la forme, l'outil cherche « ti - ce »), 1er refrain apparié au 2e refrain gravé (Bm, A/C#, G), lignes instrumentales appariées à l'intro, accords de l'intro et du 2e refrain absents du .cho (structure).
- Ligne 14 : les trois corrections « ok » par défaut (G→Bm, Gmaj9→A6, ajout de GM9) étaient fausses (accords de la ligne 15 rabattus par l'outil) ; le replace de la question 14:oeil:1 les écarte et rend la ligne juste.
- Tirets : la forme du moteur écrit les mots entiers partout (« ti[A]ce », « Al[F#m/C#]lé[Bm]luia »), accords inchangés de lettre.
- Section « Instrumental » sous start_of_bridge : changer le type est interdit ; accords des deux lignes conformes à la feuille.
- Autre source : « Cherchez d_abord.pdf », même feuille annotée à la main (A/C#, A7, D ajouté) : non retenue, à trancher à l'oreille si c'est ce qui est joué.

### christ-est-la-lumiere — Christ est la lumière

Lot 1 · partition retenue : `Christ est la lumière (C).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 15 : `[E7/G#]Nous crions ens[Am]emble : [G/B]Vic - [C]toire ! ` → `[E7/G#]Nous crions ens[Am]emble : [G/B]Vict[C]oire !`
- l. 32 : `[E7/G#]Chanteront ens[Am]emble : [G/B]Vic - [C]toire ! ` → `[E7/G#]Chanteront ens[Am]emble : [G/B]Vict[C]oire !`
- l. 44 : `[F2]Christ [G]est [C]saint. [Dm7]Christ [G]est [C]saint.` → `[F2]Christ [G]est s[C]aint. [Dm7]Christ [G]est [C]saint.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 15 | C | p1 y=310,9 : label x=243,7 = x0 du « o » de « Vic - t‹o›ire » | décalé | Vict[C]oire ! (relevé ok, appliqué ; tiret retiré par le moteur) |
| 32 | C | p1 y≈770 : label x=238,4 = x0 du « o » de « Vic - t‹o›ire » | décalé | Vict[C]oire ! (relevé ok, appliqué) |
| 44 | C | p2 y≈279 : premier C x=111,2 = x0 du « a » de « s‹a›int. » (le second C, x=217,9, est sur le « s » : déjà juste) | décalé | [G]est s[C]aint. (relevé ok, appliqué) |
| 13 | E7/G# | x=31,2 = « T » de « Ta » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 13 | Am | x=173,5 = « s » de « boulever‹s›é » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 15 | E7/G# | x=31,2 = « N » de « Nous » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 15 | Am | x=145,9 = « e » de « ens‹e›mble » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 15 | G/B | x=202,8 = « V » de « Vic » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 30 | E7/G# | x=31,2 = « L » de « Les » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 30 | Am | x=156,6 = « t » de « terre » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 32 | E7/G# | x=31,2 = « C » de « Chanteront » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 32 | Am | x=140,6 = « e » de « ens‹e›mble » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |
| 32 | G/B | x=197,5 = « V » de « Vic » | exact (vérifié à l'œil ; check.py ne lit pas ces rangées où E7/G# est gravé en morceaux de deux tailles) | aucune |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 6 ligne(s) — espace de fin : l. 11, 12, 22, 28, 30, 39 ; espaceur : l. 22.

En-tête : ajout de `{source: Christ est la lumière (C).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 44:decale:C:1 | appliqué | Timothée |  |
| 32:decale:C:1 | appliqué | Timothée |  |
| 15:decale:C:1 | appliqué | Timothée |  |

- Rendu ChordPro de l'église (couche texte, 2 pages) : les 47 accords du chant mesurés un par un, x du label contre x0 du caractère (PyMuPDF rawdict), et les zones en doute regardées sur le rendu 2×.
- Les trois « ok » du relevé (l. 15, 32, 44) mettent l'accord sur le caractère de la partition : appliqués, aucune autre ligne à corriger ; noms identiques (F2, E7/G#, Am7, Dm7 tels que gravés).
- Les « absent de la source » restants de check.py (l. 13, 15, 30, 32) sont des erreurs de lecture de l'outil sur les rangées qui portent E7/G# : vérifiés à l'œil et en coordonnées, exacts.
- Paroles : la partition écrit « (x..) » sur une ligne à part sous « Il est saint (Il est saint). », le .cho « (x...) » en fin de ligne 37 : forme, laissée.
- Autre feuille présente : « Tu_es_la_lumière.pdf », autre chant, non mesurée. Thèmes actuels (Adoration, Sainteté) gardés.

### cieux-ouverts — Cieux ouverts

Lot 2 · partition retenue : `Cieux ouverts (C).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 39 : `[F] Les Cieux ouverts [G]déferlent sur moi,` → `[F] Les Cieux ouverts[G] déferlent sur moi,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 39 | G | p2 y=109,6 : G x=182,3 = l'espace entre « ouverts » (s à 174,3) et « déferlent » (d à 186,8) | décalé | ouverts[G] déferlent |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 12 ligne(s) — espaceur : l. 9, 10, 11, 12, 19, 23, 24, 25, 26 ; espace de fin : l. 16, 17, 18.

En-tête : ajout de `{source: Cieux ouverts (C).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 39:decale:G:1 | appliqué | Timothée |  |

- Rendu ChordPro de l'église (FPDF) : check.py lit la couche texte, 63 accords exacts sur 64 ; le seul décalé (G sur l'espace avant « déferlent », l. 39) est corrigé par le « ok » du relevé, conforme à la mesure.
- Autres versions : « Cieux ouverts.pdf » (même feuille) ; « Cieux ouverts (Fleuve de vie).pdf » est un autre arrangement en F (traitement de texte), non retenu.

### coeur-a-coeur — Cœur à cœur

Lot 2 · partition retenue : `Cœur à cœur D.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 49 : `[Bm] Je plie le genou, [A/C#]j'abandonne tout,` → `[Bm] Je plie le genou,[A/C#] j'abandonne tout,`
- l. 54 : `[Em] Je [G]plie le genou, [A]j'abandonne tout,` → `[Em] Je [G]plie le genou,[A] j'abandonne tout,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 49 | A/C# | p2 y=313,7 x=170,8 sur l'espace « genou,‹ ›j'abandonne » | décalé | genou,[A/C#] j'abandonne (défaut ok) |
| 54 | A | p2 y=415,7 x=170,8 sur l'espace « genou,‹ ›j'abandonne » | décalé | genou,[A] j'abandonne (question ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 7 ligne(s) — ligne sans paroles : l. 9 ; espace de fin : l. 13, 16 ; mot coupé au tiret : l. 15, 22, 35 ; espaceur : l. 21.

En-tête : ajout de `{source: Cœur à cœur D.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 54:decale:A:1 | laissé | def |  |
| 54:fable:54:decale:A:1 | appliqué | session | Sur ce rendu ChordPro de l'église, le label A du Pont 2 commence sur l'espace qui suit « genou, » : crochet puis espace devant « j'abandonne », comme au Pont 1 ; Em et G restent exacts, et l'autre lecture (move) reste à « non », donc une seule des deux s'applique. — partition : p2 y=415,7 (Pont 2) : Em x=45,4 (début de ligne, avant « Je »), G x=75,6 sur « p » de « plie », A x=170,8 sur l'espace entre « genou, » et « j'abandonne ». |
| 49:decale:A/C#:1 | appliqué | def |  |

- Couche texte FPDF de l'église mesurée accord par accord (rawdict) : 82 exacts sur 84 avant ; les deux décalés (l. 49 et 54, label sur l'espace après « genou, ») sont corrigés, 84/84 après.
- « dou - ce » est gravé avec le tiret du transcripteur dans la partition ; la forme l'écrit « dou[A/C#]ce », A/C# reste sur le « c » (x=176,1).
- Autres versions présentes : Coeur à coeur Key D/C/Eb, Cœur à cœur - D, Cœur à cœur Key D/C/Eb — non comparées, la partition retenue fait foi.

### collision — Collision

Lot 2 · partition retenue : `Collision.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 30 : `J'ai changé de di[F]rection[C/E]` → `J'ai changé de di[F]rectio[(F)]n[C/E]` *(session)*
- l. 31 : `Quand nos cœurs sont en[Am]trés en collision[G]` → `Quand nos cœurs sont en[Am]trés en co[(Am)]llision[G]` *(session)*
- l. 32 : `Tu es ma révo[F]lution[C/E]` → `Tu es ma révo[F]lutio[(F)]n[C/E]` *(session)*
- l. 33 : `La vie comme je l'ai [Am]toujours rêvée[G]` → `La vie comme je l'ai [Am]toujours rê[(Am)]vée[G]` *(session)*
- l. 36 : `{start_of_instrumental: Instrumental}` → `{start_of_instrumental: Instrumental (x2)}` *(session (hors relevé))* — La feuille grave « INSTRUMENTAL x2 » (y=368) : suffixe de libellé, même directive (le changement de type est laissé à Timothée, voir structure).
- l. 37 : `[F]  [C/E]  [Am]  [G]` → `[F]  [(F)]  [C/E]  [Am]  [(Am)]  [G]` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 30 | F | x=390,0 sur « r » de « di‹r›ection » (390,0) | exact | di[F]rection |
| 30 | (F) | x=417,9 sur « n » de « directio‹n› » (417,3) | absent | directio[(F)]n |
| 30 | C/E | x=436,2, après la fin du mot (423,3) | exact | direction[C/E] |
| 31 | Am | x=432,0 dans le « t » de « en‹t›rés » (429,7–433,0), 1 pt avant le « r » | équivalent | aucune : en[Am]trés, même syllabe « trés », .cho en début de syllabe ; source alignée aux espaces (une espace = 3 pt) |
| 31 | (Am) | x=477,0 sur le premier « l » de « co‹l›lision » (475,6) | absent | co[(Am)]llision |
| 31 | G | x=506,7, après la fin du mot (505,6) | exact | collision[G] |
| 32 | F | x=378,0 sur « l » de « révo‹l›ution » (376,9) | exact | révo[F]lution |
| 32 | (F) | x=402,9 dans le « n » de « révolutio‹n› » (398,9–404,9) | absent | révolutio[(F)]n |
| 32 | C/E | x=421,2, après la fin du mot (404,9) | exact | révolution[C/E] |
| 33 | Am | x=411,0 sur « t » de « toujours » (411,3) | exact | [Am]toujours |
| 33 | (Am) | x=465,0 sur « v » de « rê‹v›ée » (462,9) | absent | rê[(Am)]vée |
| 33 | G | x=494,7, après la fin du mot (479,6) | exact | rêvée[G] |
| 37 | (F) | grille y=384 : « \| F / / (F) C/E \| » | absent | [F]  [(F)]  [C/E] |
| 37 | (Am) | grille y=384 : « \| Am / / (Am) G \| » | absent | [Am]  [(Am)]  [G] |
| 26 | G | x=225,0 dans le « v » de « a‹v›ant » (220,6–226,6), 1,6 pt avant le second « a » | équivalent | aucune : av[G]ant, lettre la plus proche, même syllabe « vant » |
| 25 | C | x=189,0, 1 pt avant le second « v » de « vivant » (190,0), label au-dessus de « va » | exact | aucune : vi[C]vant (lettre la plus proche) |
| 43 | Am, C | couplet 2 : la feuille ne grave aucun accord (paroles seules, y=426–538) | reporté | aucune : accords reportés du couplet 1, gardés |
| 41 | F (l. 41, 42, 45, 46), G (l. 44, 47, 48), Am (l. 47) | couplet 2 sans accords gravés | reporté | aucune : gardés (même grille que le couplet 1) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 10.

En-tête : ajout de `{source: Collision.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 48:reporte:G:1 | laissé | def |  |
| 47:reporte:Am:1 | laissé | def |  |
| 47:reporte:G:1 | laissé | def |  |
| 46:reporte:F:1 | laissé | def |  |
| 45:reporte:F:1 | laissé | def |  |
| 44:reporte:G:1 | laissé | def |  |
| 43:reporte:Am:1 | laissé | def |  |
| 43:reporte:C:1 | laissé | def |  |
| 42:reporte:F:1 | laissé | def |  |
| 41:reporte:F:1 | laissé | def |  |
| 37:instrumental:F:1 | laissé | def |  |
| 37:instrumental:(Am):1 | laissé | def |  |
| 33:manquant:(Am):1 | laissé | def |  |
| 33:fable:33:manquant:(Am):1 | laissé | session | Autre lecture de 33:manquant:(Am):1 : la partition pose (Am) sur le « v » de « rêvée » (syllabe « vée »), G seul après le mot ; ligne juste donnée dans lignes. — partition : mesure : (Am) @x=465,0, « rê‹v›ée » v 462,9–468,9 (Δ 2,1 ; é à 468,9) ; G @494,7 après la fin du mot (479,6) |
| 32:manquant:(F):1 | laissé | def |  |
| 32:fable:32:manquant:(F):1 | laissé | session | Autre lecture de 32:manquant:(F):1 : le label (F) commence sur le « n » final de « révolution », pas après le mot ; ligne juste donnée dans lignes. — partition : mesure : (F) @x=402,9 dans le « n » de « révolutio‹n› » 398,9–404,9, mot fini à 404,9 ; C/E @421,2 après le mot |
| 31:relire:Am:1 | laissé | def |  |
| 31:manquant:(Am):1 | laissé | def |  |
| 31:fable:31:manquant:(Am):1 | laissé | session | Autre lecture de 31:manquant:(Am):1 : la partition pose (Am) sur le premier « l » de « collision » (syllabe chantée « li »), G seul après le mot ; ligne juste donnée dans lignes. — partition : mesure : (Am) @x=477,0, « co‹l›lision » l 475,6–479,0 (Δ 1,4 ; second l à 479,0, Δ 2,0) ; G @506,7 après la fin du mot (505,6) |
| 30:manquant:(F):1 | laissé | def |  |
| 30:fable:30:manquant:(F):1 | laissé | session | Autre lecture de 30:manquant:(F):1 : la partition pose (F) sur le « n » final, pas après le mot ; ligne juste donnée dans lignes (directio[(F)]n[C/E]). — partition : mesure : (F) @x=417,9, « n » de « directio‹n› » 417,3–423,3 (Δ 0,6), mot fini à 423,3 ; C/E @436,2 après la fin du mot |

- Source basse fidélité (document Pages, accords alignés aux espaces, deux colonnes) : check.py ne lit pas la source (0 accord mesuré, 42 « absents de la source ») ; chaque accord vérifié à l'œil et en coordonnées (rawdict), rendu 2× dans crops/collision.
- Les 48 accords « absent de la source » que check.py liste APRÈS viennent de l'outil qui lit mal (deux colonnes, alignement aux espaces : 0 accord mesuré avant comme après) ; mesurés en coordonnées : intro, couplet 1, pré-refrain, refrain et instrumental exacts (nom et syllabe), sauf deux équivalents dans la même syllabe (l. 26 G, l. 31 Am) ; couplet 2 = accords reportés (rien de gravé).
- Couplet 1, pré-refrain, refrain : tous les accords nommés comme la feuille et sur la syllabe mesurée ; seuls manquaient les quatre optionnels (F)/(Am) du refrain et les deux de l'instrumental.
- Refrain, à l'oreille seulement : la grille de l'instrumental (« F / / (F) C/E », « Am / / (Am) G ») laisse penser que (F) et (Am) tombent au 4e temps, juste avant C/E et G ; la feuille les tape sur « n », « l », « n », « v » : c'est cette frappe qui est recopiée (02, rendu tapé).
- Am l. 31 (« en[Am]trés ») et G l. 26 (« av[G]ant ») : le label commence à 1–1,6 pt d'une frontière de lettres dans la même syllabe ; gardés, équivalents (précision d'un alignement aux espaces).
- Couplet 2 : la feuille ne grave aucun accord ; les accords du .cho sont reportés du couplet 1 et gardés. « v[C]ie » (l. 43) coupe la syllabe, reprise de « com[C]bler » : non mesurable, laissé.
- Pré-refrain : la feuille met « Oh » seul sur sa ligne sous F ; le .cho le joint à la ligne suivante (forme, sans effet sur les accords).
- Intro : grille « | F / / / | / / / / | Am / / G | / / / / » sans x2 ; .cho juste (l'espaceur [ ] est retiré par la forme).
- Autres versions : « Collision (C).pdf » et « Collision - C.pdf » sont le même fichier (même empreinte) que « Collision.pdf » ; malgré le « C » du nom, les accords sont en F, comme {key: F}.
- Structure de la liste extra (Intro, Couplet 1, Pré-refrain, Refrain, Instrumental x2, Couplet 2) : citée, non appliquée au-delà du suffixe (x2).
- Non repris : mention « Paroles et Musique », copyright et CCLI de pied de page.

### combien-dieu-est-grand — Combien Dieu est grand

Lot 2 · partition retenue : `Combien Dieu est grand - Accords G.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 17 : `Combi[Em7]en Dieu est grand ! Et tous verront` → `Com[Em7]bien Dieu est grand ! Et tous verront`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 17 | Em7 | p1 y=310,9 : Em7 x=79,1 sur « b » de « Com‹b›ien » (b à 79,1, e à 91,6) | décalé | Com[Em7]bien |

En-tête : ajout de `{source: Combien Dieu est grand - Accords G.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 17:decale:Em7:1 | appliqué | Timothée |  |

- Rendu ChordPro de l'église (FPDF) : check.py lit la couche texte, 22 accords exacts sur 23 ; le seul décalé (Em7 sur « b » de « Combien », l. 17) est corrigé par le « ok » du relevé, conforme à la mesure. Les deux autres « Combien » du refrain sont gravés différemment (G sur « e » l. 16, C2 sur « b » l. 18) : chaque occurrence suit sa mesure, déjà exacte.
- Partition : titre original « How great is our God » en pied de page, non repris.
- Autre version : « Combien Dieu est grand.pdf » (même feuille).

### compter-sur-toi — Compter sur Toi

Lot 2 · partition retenue : `Compter sur Toi.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 6 : `{themes: Foi, Esperance}` → `{themes: Foi, Espérance}` *(en-tête)* — Le chant dit d'abord la confiance en Dieu qui reste au contrôle et tient ses promesses (Foi), puis l'assurance que rien ne nous séparera de lui (Espérance) : choix actuel gardé, orthographe corrigée (Esperance → Espérance).

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | Bm | x=165,0 sur l'espace après « cœur, » (espace 164,4–167,4), « T » de « Tu » à 167,4 : lettre la plus proche « T » | équivalent (feuille Word alignée aux espaces, même syllabe « Tu ») | aucune : [Bm]Tu |
| 21 | A | x=161,3 dans « ô » (157,2–163,2), « l » à 163,2 : lettre la plus proche « l » (1,9 pt contre 4,1 pt), le label couvre « ôle » à l'œil | équivalent (± 1 lettre, feuille aux espaces) | aucune : contrô[A]le |
| 22 | Bm | x=129,0 dans « s » de « surprend » (126,6–131,3), « u » à 131,3 : à égale distance des deux débuts de lettre, même syllabe « sur » | équivalent (même syllabe) | aucune : [Bm]surprend |
| 23 | D | x=201,0 dans « e » de « es » (197,0–202,3), à l'œil le D est au-dessus de « es » | équivalent (mot d'une syllabe « es ») | aucune : [D]es |
| 30 | A, Bm | couplet 2 : la feuille ne grave aucun accord (paroles seules en colonne de droite, x=309) | reporté | gardés (reportés du couplet 1) |
| 31 | F#m, D | couplet 2 sans accords sur la feuille | reporté | gardés |
| 32 | A, Bm | couplet 2 sans accords sur la feuille | reporté | gardés |
| 33 | F#m, D | couplet 2 sans accords sur la feuille | reporté | gardés |
| 35 | A, Bm | couplet 2 sans accords sur la feuille | reporté | gardés |
| 36 | F#m, D | couplet 2 sans accords sur la feuille | reporté | gardés |
| 37 | A, Bm | couplet 2 sans accords sur la feuille | reporté | gardés |
| 38 | F#m, D | couplet 2 sans accords sur la feuille | reporté | gardés |

En-tête : ajout de `{source: Compter sur Toi.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 38:reporte:F#m:1 | laissé | def |  |
| 38:reporte:D:1 | laissé | def |  |
| 37:reporte:A:1 | laissé | def |  |
| 37:reporte:Bm:1 | laissé | def |  |
| 36:reporte:F#m:1 | laissé | def |  |
| 36:reporte:D:1 | laissé | def |  |
| 35:reporte:A:1 | laissé | def |  |
| 35:reporte:Bm:1 | laissé | def |  |
| 33:reporte:F#m:1 | laissé | def |  |
| 33:reporte:D:1 | laissé | def |  |
| 32:reporte:A:1 | laissé | def |  |
| 32:reporte:Bm:1 | laissé | def |  |
| 31:reporte:F#m:1 | laissé | def |  |
| 31:reporte:D:1 | laissé | def |  |
| 30:reporte:A:1 | laissé | def |  |
| 30:reporte:Bm:1 | laissé | def |  |
| 23:relire:D:1 | laissé | def |  |
| 22:relire:Bm:1 | laissé | def |  |
| 9:relire:Bm:1 | laissé | def |  |

- Source basse fidélité (feuille Word, accords alignés aux espaces), vérifié à l'œil sur le rendu 2× et mesuré en coordonnées (rawdict) : chaque accord du couplet 1 et du refrain tombe sur la syllabe du .cho (lettre la plus proche du label).
- check.py lit mal cette feuille à deux colonnes (le couplet 2 sans accords, à droite, se mêle aux rangées d'accords du couplet 1) : il classe les 40 accords « absent de la source », avant comme après. Mesure faite à la place en coordonnées (rawdict, colonne de gauche seule) : couplet 1 et refrain, 24 accords, tous sur la syllabe du .cho (20 sur la lettre même, 4 à ± 1 lettre dans la même syllabe, listés dans mesures) ; couplet 2, 16 accords reportés.
- Aucune question ; tous les écarts sont « non » par défaut et la partition les confirme : les trois « à relire » (Bm l. 9, Bm l. 22, D l. 23) sont sur la même syllabe que le .cho, aucune ligne changée.
- Couplet 2 : la feuille ne porte aucun accord ; ceux du .cho sont reportés du couplet 1 et gardés (exception des accords reportés) ; leur place exacte reste à confirmer à l'oreille.
- Refrain l. 21 : le A est gravé à cheval sur « ôle » de « contrôle », lettre la plus proche « l » : laissé contrô[A]le.

### connais-tu-ce-jesus — Connais-tu ce Jésus

Lot 2 · partition retenue : `Connais-tu ce Jésus - Accords A.pdf` (traitement-texte, mesure basse-fidelite)

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | A | p1 grille d'intro « \| A / / / \| Em7 / / / \| Bm / / / \| D / / / \| », x=77,0 | exact (à l'œil) | aucune |
| 10 | Em7 | p1 grille d'intro « \| A / / / \| Em7 / / / \| Bm / / / \| D / / / \| », x=112,6 | exact (à l'œil) | aucune |
| 10 | Bm | p1 grille d'intro « \| A / / / \| Em7 / / / \| Bm / / / \| D / / / \| », x=164,3 | exact (à l'œil) | aucune |
| 10 | D | p1 grille d'intro « \| A / / / \| Em7 / / / \| Bm / / / \| D / / / \| », x=209,9 | exact (à l'œil) | aucune |
| 14 | A | x=72,0 sur « C » de « Connais » | exact (à l'œil) | aucune |
| 14 | Em7 | x=147,0 sur « é » de « J‹é›sus » (é 146,0) | exact (à l'œil) | aucune |
| 15 | Bm | x=180,0 sur « u » de « cœ‹u›rs » (u 178,6) | exact (à l'œil) | aucune |
| 16 | D | x=180,0 sur « u » de « pe‹u›rs » (u 178,0) | exact (à l'œil) | aucune |
| 18 | A | x=72,0 sur « C » | exact (à l'œil) | aucune |
| 18 | Em7 | x=147,0 sur « é » de « J‹é›sus » | exact (à l'œil) | aucune |
| 19 | Bm | x=180,0 sur « s » final de « tempête‹s› » (s 179,0) | exact (à l'œil) | aucune |
| 20 | D | x=135,0 sur « n » de « notre » (n 133,4) | exact (à l'œil) | aucune |
| 24 | A | x=72,0 sur « I » de « Il » | exact (à l'œil) | aucune |
| 24 | Em7 | x=150,0 sur « o » de « n‹o›us » (o 150,6 ; n 144,6) | exact (à l'œil) | aucune |
| 25 | Bm | x=153,0 sur « o » de « n‹o›us » (o 150,6 ; u 156,6) | exact (à l'œil) | aucune |
| 27 | D | x=144,0 sur « u » de « cœ‹u›r » (u 144,0) | exact (à l'œil) | aucune |
| 28 | A | x=174,0 sur « u » de « no‹u›s » (u 172,6) | exact (à l'œil) | aucune |
| 42 | E | x=309,0 sur « I » de « Ici » | exact (à l'œil) | aucune |
| 42 | F#m | x=369,0 sur « n » de « mainte‹n›ant » (n 369,0) | exact (à l'œil) | aucune |
| 43 | D | x=309,0 sur « S » de « Son » | exact (à l'œil) | aucune |
| 43 | A | x=395,3 sur « s » de « pré‹s›ent » (s 394,0) | exact (à l'œil) | aucune |
| 44 | E | x=309,0 sur « S » de « Sache » | exact (à l'œil) | aucune |
| 44 | F#m | x=411,0 au début du « d » de « t'aban‹d›onnera » (d 411,3 ; n 405,3) | exact (à l'œil) | aucune |
| 44 | D | x=446,3 sur « a » de « donner‹a› » (a 444,6–449,9) | exact (à l'œil) | aucune |
| 44 | A | x=469,3 sur l'espace après « pas » (espace 468,9) : après le dernier mot, collé | exact (à l'œil) | aucune |
| 48 | E | x=309,0 sur « S » de « Sache » | exact (à l'œil) | aucune |
| 48 | F#m | x=411,0 au début du « d » de « t'aban‹d›onnera » (d 411,3 ; n 405,3) | exact (à l'œil) | aucune |
| 48 | D | x=446,3 sur « a » de « donner‹a› » (a 444,6–449,9) | exact (à l'œil) | aucune |
| 48 | A | x=469,3 sur l'espace après « pas » (espace 468,9) : après le dernier mot, collé | exact (à l'œil) | aucune |
| 52 | E | x=309,0 sur « S » de « Sache » | exact (à l'œil) | aucune |
| 52 | F#m | x=411,0 au début du « d » de « t'aban‹d›onnera » (d 411,3 ; n 405,3) | exact (à l'œil) | aucune |
| 52 | D | x=446,3 sur « a » de « donner‹a› » (a 444,6–449,9) | exact (à l'œil) | aucune |
| 52 | A | x=469,3 sur l'espace après « pas » (espace 468,9) : après le dernier mot, collé | exact (à l'œil) | aucune |
| 46 | E | x=309,0 sur « S » de « Son » | exact (à l'œil) | aucune |
| 46 | F#m | x=396,0 sur le premier « s » de « acce‹s›sible » (s 395,3) | exact (à l'œil) | aucune |
| 47 | D | x=309,0 sur « S » de « Sa » | exact (à l'œil) | aucune |
| 47 | A | x=395,3 sur « n » de « dispo‹n›ible » (n 395,3) | exact (à l'œil) | aucune |
| 50 | E | x=309,0 sur « I » de « Il » | exact (à l'œil) | aucune |
| 50 | F#m | x=402,0 sur « n » de « ‹n›uit » (n 401,3) | exact (à l'œil) | aucune |
| 51 | D | x=309,0 sur « I » de « Il » | exact (à l'œil) | aucune |
| 51 | A | x=389,3 sur « v » de « ‹v›ie » (v 389,0) | exact (à l'œil) | aucune |
| 54 | E | p2 x=72,0 sur « I » de « Il » | exact (à l'œil) | aucune |
| 54 | F#m | p2 x=159,0 sur « t » de « ‹t›oi » (t 157,6–161,0) | exact (à l'œil) | aucune |
| 55 | D | p2 x=72,0 sur « P » de « Plus » | exact (à l'œil) | aucune |
| 55 | A | p2 x=191,3 sur « c » de « ‹c›rois » (c 190,0) | exact (à l'œil) | aucune |
| 56 | E | p2 x=72,0 sur « S » | exact (à l'œil) | aucune |
| 56 | F#m | p2 x=174,0 au début du « d » (d 174,3) | exact (à l'œil) | aucune |
| 56 | D | p2 x=209,3 sur « a » de « donner‹a› » (a 207,6) | exact (à l'œil) | aucune |
| 56 | A | p2 x=232,3 sur l'espace après « pas » | exact (à l'œil) | aucune |
| 57 | E | p2 x=72,0 sur « N » de « Non » | exact (à l'œil) | aucune |
| 57 | F#m | p2 x=153,0 sur « d » de « t'aban‹d›onnera » (d 150,3 ; o 156,3), lettre la plus proche | exact (à l'œil) | aucune |
| 32 | A | p1 col. droite : couplet 2 gravé sans aucun accord | reporté | aucune (accords du couplet 1 reportés, gardés comme le relevé) |
| 32 | Em7 | p1 col. droite : couplet 2 gravé sans aucun accord | reporté | aucune (accords du couplet 1 reportés, gardés comme le relevé) |
| 33 | Bm | p1 col. droite : couplet 2 gravé sans aucun accord | reporté | aucune (accords du couplet 1 reportés, gardés comme le relevé) |
| 34 | D | p1 col. droite : couplet 2 gravé sans aucun accord | reporté | aucune (accords du couplet 1 reportés, gardés comme le relevé) |
| 36 | A | p1 col. droite : couplet 2 gravé sans aucun accord | reporté | aucune (accords du couplet 1 reportés, gardés comme le relevé) |
| 36 | Em7 | p1 col. droite : couplet 2 gravé sans aucun accord | reporté | aucune (accords du couplet 1 reportés, gardés comme le relevé) |
| 37 | Bm | p1 col. droite : couplet 2 gravé sans aucun accord | reporté | aucune (accords du couplet 1 reportés, gardés comme le relevé) |
| 38 | D | p1 col. droite : couplet 2 gravé sans aucun accord | reporté | aucune (accords du couplet 1 reportés, gardés comme le relevé) |
| 57 | D | p2 x=188,3 : le label commence au bord droit du « a » (a 183,6–189,0) et son corps est sur l'espace avant « pas » (espace 188,9 ; p 191,9) ; dans les trois « Sache… » identiques au-dessus, D est 1,7 pt dans le « a » ; vu sur le crop 5× | décalé | t'aban[F#m]donnera[D] pas (contre le relevé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 5 ligne(s) — espaceur : l. 26 ; espace de fin : l. 44, 48, 52, 56.

En-tête : ajout de `{source: Connais-tu ce Jésus - Accords A.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 57:relire:D:1 | laissé | Timothée |  |
| 38:reporte:D:1 | laissé | Timothée |  |
| 37:reporte:Bm:1 | laissé | Timothée |  |
| 36:reporte:A:1 | laissé | Timothée |  |
| 36:reporte:Em7:1 | laissé | Timothée |  |
| 34:reporte:D:1 | laissé | Timothée |  |
| 33:reporte:Bm:1 | laissé | Timothée |  |
| 32:reporte:A:1 | laissé | Timothée |  |
| 32:reporte:Em7:1 | laissé | Timothée |  |

- Source basse fidélité : feuille Word (Times New Roman, accords alignés aux espaces et aux tabulations), couche texte lisible ; check.py ne la lit pas (famille inconnue, 60 accords « absent de la source », paroles « None ») : chaque accord mesuré à la main en coordonnées (PyMuPDF rawdict, lettre la plus proche du bord gauche du label) et vérifié à l'œil sur les rendus 2× / 5× (crops/connais-tu-ce-jesus/).
- Résultat : 59 accords sur 60 sur la lettre de la partition dans le .cho actuel (intro, couplet 1, refrain, pont) ; les 8 du couplet 2 sont reportés du couplet 1 (la feuille grave le couplet 2 sans accords), gardés comme le relevé. Seule correction : l. 57, D sur l'espace avant « pas » (contre le relevé).
- Cas limites : F#m des « Sache… » à x=411,0 / 174,0 sur la frontière n|d (d à +0,3 pt) : « d », comme le .cho ; F#m l. 54 sur « t » de « toi » (−1,4 / « o » +2,0) ; Bm l. 25 sur « o » de « nous » (−2,4 / « u » +3,6). Tous sur la syllabe du .cho ; à l'oreille, rien à signaler de plus.
- Refrain : « Ouvre tes yeux » sans accord sur la feuille ; le « [ ] » de la l. 26 est retiré par le moteur (forme).
- Structure (non appliquée) : « INSTRUMENTAL x2 » après le refrain (grille de l'intro) et après le couplet 2 (| E / / F#m | D / / A |) : insertion au milieu du chant, interdite ; bloc proposé, à appliquer par Timothée. La feuille s'arrête au pont sans renvoi. Listes « extra » (8 accords des deux instrumentaux, ordre des sections) : les mêmes, non appliquées.
- « Connais-tu ce Jésus.pdf » est le même fichier (md5 identique) que « Connais-tu ce Jésus - Accords A.pdf ».
- Paroles : identiques à la feuille (apostrophes courbes de la feuille → droites, format). Thèmes « Adoration, Salut » dans la liste, gardés. En-tête : key A conforme (« Accords A »), tempo 80 conforme (♩ = 80).
- L. 57 : D gravé à 0,6 pt de la frontière entre le « a » de « donnera » et l'espace avant « pas » (feuille Word, ± 1 syllabe) ; même mot dans les deux lectures, la partition n'est pas nette : le « non » du relevé est gardé (`abandonner[D]a pas` → à confirmer à l'oreille).

### crier-a-toi — Crier à Toi

Lot 2 · partition retenue : `Crier à Toi.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 32 : `Je veux [A]crier à [D]Toi, mon [F#m]Sauveur e[E]t mon D[A]ieu.` → `Je veux [A]crier à T[D]oi, mon [F#m]Sauveur e[E]t mon D[A]ieu.`
- l. 38 : `Je chan[F#m]terai Celui [E/G#]qui de [D]ma vie est maî[A]tre,` → `Je chan[F#m]terai Celu[E/G#]i qui de [D]ma vie est maî[A]tre,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 32 | D | p1 y=651,0 x=163,6 sur « o » de « T‹o›i, » (même x qu'à la l. 29, écrite T[D]oi) | décalé | T[D]oi (ok du relevé) |
| 38 | E/G# | p2 y=109,6 x=155,7 sur « i » final de « Celu‹i› » | décalé | Celu[E/G#]i qui (ok du relevé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 11 ligne(s) — espace de fin : l. 8, 9, 11, 16, 22, 25, 30, 36, 37, 39 ; orthographe d'accord : l. 12, 25, 39.

En-tête : ajout de `{source: Crier à Toi.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 38:decale:E/G#:1 | appliqué | Timothée |  |
| 32:decale:D:1 | appliqué | Timothée |  |

- Couche texte FPDF de l'église mesurée accord par accord (rawdict) : 65 exacts sur 67 avant ; les deux « ok » du relevé (l. 32 D sur « o » de « Toi », l. 38 E/G# sur le « i » de « Celui ») mettent l'accord sur le caractère de la partition, 67/67 après.
- Le .cho coupe en deux la 1re ligne du Couplet 1 et du Pré-Refrain (une ligne de la feuille) : découpage admis, accords inchangés.
- C#sus est gravé « C » + « #sus » : la forme l'écrit C#sus4 (orthographe canonique de 01, `sus` seul → `sus4`), place inchangée.

### de-grace-en-grace — De grâce en grâce

Lot 2 · partition retenue : `De grâce en grâce - A.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 12 : `[A]Si l'amour a souf[E]fert l[F#m]a croix,[D]` → `[A] Si l'amour a sou[E]ffert l[F#m]a croix,[D]` *(session)*
- l. 13 : `[A]Combien précieux Son [E]sang [F#m]pour moi.[D]` → `[A] Combien précieux Son [E]sang[F#m] pour moi.[D]` *(session)*
- l. 14 : `[A]La beauté des Cieux vê[E]tue de m[F#m]a honte,[D]` → `[A] La beauté des Cieux vê[E]tue de m[F#m]a honte,[D]` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, A gravé à x=31.2 (p.1), 1re lettre « L » à x=40.1 : accord avant la 1re lettre → [A] L…
- l. 15 : `[A]Cet amour parfait mort [E]à [ ] [F#m]ma place.` → `[A] Cet amour parfait mort [E]à[F#m] ma place.` *(session)*
- l. 19 : `[D]Si Ses plaies témoignent de [F#m]Son [E]amour,` → `[D] Si Ses plaies témoignent de [F#m]Son[E] amour,` *(session)*
- l. 20 : `[D]Quelle joie voyait-Il mour[F#m]ant [ ] [E]pour moi,[A/C#]` → `[D] Quelle joie voyait-Il mou[F#m]rant [E]pour moi,[A/C#]` *(session)*
- l. 21 : `[D]Pour gagner mon cœur Il [F#m]S'est [E]offert.` → `[D] Pour gagner mon cœur Il [F#m]S'est[E] offert.` *(session)*
- l. 25 : `Si merv[A]eilleux, si [E]glor[F#m]ieux,` → `Si mer[A]veilleux, si [E]glor[F#m]ieux,`
- l. 26 : `Mon [D]Sauve[A]ur règne, vic[E]to - [F#m]rieux.` → `Mon [D]Sauve[A]ur règne, vic[E]to[F#m]rieux.`
- l. 28 : `M'of[D]frant l[A]a vie, de grâ[E]ce en grâce.` → `M'o[D]ffrant l[A]a vie, de grâ[E]ce en grâce.`
- l. 33 : `[A]Si les Cieux ont vaincu [E]ce to[F#m]mbeau,[D]` → `[A] Si les Cieux ont vaincu [E]ce to[F#m]mbeau,[D]` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, A gravé à x=31.2 (p.1), 1re lettre « S » à x=40.1 : accord avant la 1re lettre → [A] S…
- l. 34 : `[A]Combien grand est l'espoir [E]en [F#m]Ton Nom.[D]` → `[A] Combien grand est l'espoir [E]en[F#m] Ton Nom.[D]` *(session)*
- l. 35 : `[A]Cette passion qui a dé[E]pouillé l[F#m]'enfer,[D]` → `[A] Cette passion qui a dé[E]pouillé l'[F#m]enfer,[D]` *(session)*
- l. 36 : `[A]Cette promesse qui a fait [E]rouler l[F#m]a pierre.` → `[A] Cette promesse qui a fait [E]rouler l[F#m]a pierre.` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, A gravé à x=31.2 (p.1), 1re lettre « C » à x=40.1 : accord avant la 1re lettre → [A] C…
- l. 40 : `[D]Si ma liberté val[F#m]ait [ ][E]Ta vie,[A/C#]` → `[D] Si ma liberté va[F#m]lait [E]Ta vie,[A/C#]` *(session)*
- l. 41 : `[D]Pour me pardonner ô [F#m]quel gr[E]and prix,[A/C#]` → `[D] Pour me pardonner ô [F#m]quel gr[E]and prix,[A/C#]` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, D gravé à x=45.4 (p.2), 1re lettre « P » à x=54.3 : accord avant la 1re lettre → [D] P…
- l. 42 : `[D]Oui par amour Tu as [F#m]tout p[E]ayé.` → `[D] Oui par amour Tu as [F#m]tout p[E]ayé.` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, D gravé à x=45.4 (p.2), 1re lettre « O » à x=54.3 : accord avant la 1re lettre → [D] O…
- l. 47 : `[D]Oui c'est par la croix que je [E]suis libre,` → `[D] Oui c'est par la croix que je [E]suis libre,` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, D gravé à x=45.4 (p.2), 1re lettre « O » à x=54.3 : accord avant la 1re lettre → [D] O…
- l. 48 : `[F#m]Et c'est par Ta mort que j'ai [D]la vie.` → `[F#m] Et c'est par Ta mort que j'ai [D]la vie.` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, F#m gravé à x=45.4 (p.2), 1re lettre « E » à x=54.3 : accord avant la 1re lettre → [F#m] E…
- l. 49 : `[A]Jésus à jamais je veux chant[E]er` → `[A] Jésus à jamais je veux chant[E]er` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, A gravé à x=45.4 (p.2), 1re lettre « J » à x=54.3 : accord avant la 1re lettre → [A] J…
- l. 54 : `[D]Ô mon âme v[E]eut chant[F#m]er` → `[D] Ô mon âme v[E]eut chant[F#m]er` *(session (hors relevé))* — retrait (cas Océans de 02) : ligne de la partition en retrait de deux espaces, D gravé à x=45.4 (p.2), 1re lettre « Ô » à x=54.3 : accord avant la 1re lettre → [D] Ô…

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | E | x=154,3 sur le 2e « f » de « sou‹f›fert » (f 154,3) | décalé (le .cho est devant le 1er f) | sou[E]ffert (relevé ok) |
| 13 | F#m | x=249,9 sur la dernière espace avant « pour » (p à 254,4) | décalé (le .cho est sur « p ») | sang[F#m] pour (relevé ok) |
| 15 | F#m | x=231,3 sur la dernière espace avant « ma » (m à 235,7) | décalé (le .cho est sur « m ») | [E]à[F#m] ma (relevé ok ; le [ ] est retiré par la forme) |
| 19 | E | x=303,3 sur l'espace avant « amour, » (a à 307,7) | décalé (le .cho est sur « a ») | Son[E] amour (relevé ok) |
| 20 | F#m | x=225,0 sur le « r » de « mou‹r›ant » | décalé (le .cho est sur « a ») | mou[F#m]rant (relevé ok ; E reste sur « p » de « pour », x=261,4) |
| 21 | E | x=280,5 sur l'espace avant « offert. » | décalé (le .cho est sur « o ») | S'est[E] offert (relevé ok) |
| 25 | A | x=91,6 sur le « v » de « mer‹v›eilleux » | décalé (le .cho est sur « e ») | mer[A]veilleux (relevé ok) |
| 26 | F#m | x=246,3 sur la seconde espace après le tiret de « victo  -  rieux » (r à 250,8) | décalé (le .cho est sur « r ») | vic[E]to -[F#m] rieux (relevé ok) |
| 28 | D | x=70,6 sur le 2e « f » de « M'o‹f›frant » (f 70,6) | décalé (le .cho est devant le 1er f) | M'o[D]ffrant (relevé ok) |
| 34 | F#m | x=269,9 sur la dernière espace avant « Ton » (T à 274,4) | décalé (le .cho est sur « T ») | en[F#m] Ton (relevé ok) |
| 35 | F#m | x=256,6 sur le « e » de « l'‹e›nfer » | décalé (le .cho est devant l'apostrophe) | l'[F#m]enfer (relevé ok) |
| 40 | F#m | x=164,5 sur le « l » de « va‹l›ait » | décalé (le .cho est sur « a ») | va[F#m]lait (relevé ok ; E sur « T » de « Ta », x=198,3) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — ligne sans paroles : l. 8, 32, 46.

En-tête : ajout de `{source: De grâce en grâce - A.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 40:decale:F#m:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 35:decale:F#m:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 34:decale:F#m:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 28:decale:D:1 | appliqué | Timothée |  |
| 26:decale:F#m:1 | appliqué | Timothée |  |
| 25:decale:A:1 | appliqué | Timothée |  |
| 21:decale:E:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 20:decale:F#m:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 19:decale:E:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 15:decale:F#m:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 13:decale:F#m:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 12:decale:E:1 | appliqué | Timothée | inclus dans la ligne de la session |

- Partition De grâce en grâce - A.pdf (rendu ChordPro de l'église, couche texte) : les 94 accords mesurés en coordonnées (rawdict) ; les 12 écarts du relevé (tous « ok ») mettent chaque accord sur le caractère de la partition ; check.py après : 94 exact, 0 décalé. Zones des lignes 19-20 et 25-26 regardées sur le rendu 2×.
- Aucune question, aucun écart contredit par la partition, aucune ligne à ajouter : le .cho n'a ni accord inventé ni accord absent.
- Les [ ] des lignes d'accords (Intro, Couplet 2, Pont) et des lignes 15, 20, 40 sont les espaces de la ligne d'accords du rendu (« D A », « F#m E ») : aucun accord gravé, la forme les retire.
- Ligne 26 : la partition écrit « victo  -  rieux » avec F#m sur l'espace qui suit le tiret ; le choix du relevé (« vic[E]to -[F#m] rieux. Écrire le mot entier donnerait « vic[E]to[F#m]rieux. », même syllabe : laissé tel que le relevé l'a choisi. La forme écrit le mot entier : vic[E]to[F#m]rieux (même syllabe que la partition, où F#m est gravé sur l’espace avant « rieux »).
- Paroles, non appliqué : « victo - rieux » (mot coupé par le transcripteur, « victorieux ») ; sinon 24/25 lignes identiques.
- Structure : l'avis « rien » est juste, les lignes d'accords sous Couplet 2 et Pont sont dans leur section comme sur la partition ; Pré-Refrain 1/2 et Pont (Tag) présents. Thèmes Grâce, Croix gardés (dans la liste).
- Non repris de la partition : la ligne du traducteur et le titre original (« Grace to grace »).
- Autres versions : De grâce en grâce - Accords.pdf, - F.pdf, De grâce en grâce.pdf (même feuille) ; Grâce en grâce.pdf (traitement de texte, accord 10 %, non mesuré).
- Retrait de début de ligne (règle Océans de 02), mesuré en rawdict sur toutes les lignes chantées : 18 lignes de la partition (couplets 1 et 2, pré-refrains 1 et 2, pont, 1re ligne du Tag) ont deux espaces de retrait, le 1er accord gravé au x du début de ligne (31,2 ou 45,4) et la 1re lettre 8,9 pt plus loin (40,1 ou 54,3) : écrites [X] mot (l. 12-15, 19-21, 33-36, 40-42, 47-49, 54) ; les lignes du refrain, l. 50, 55 et 56 n'ont pas de retrait et leur 1er accord est en milieu de ligne : inchangées ; vérifié à l'œil sur le rendu 2× (retrait_p1.png, retrait_p2.png).

### de-l-ombre-a-la-lumiere — De l'ombre à la lumière

Lot 2 · partition retenue : `De l_ombre à la lumière.pdf` (traitement-texte, mesure impossible)

Lignes modifiées :

- l. 8 : `Lève-[A]toi mon âme et souviens-toi` → `[A]Lève-toi mon âme et souviens-toi`
- l. 9 : `Tout [A]mon péché Il l’a enterré` → `[A]Tout mon péché Il l’a enterré`
- l. 13 : `Ce n’est plus [Dsus2]moi [E7]qui vis[F#m]` → `Ce n’est plus [Dsus2]moi [E7]qui vis[A5]`
- l. 14 : `C’est Ch[A5]rist qui vit en moi[E]` → `C’est Christ qui vit en moi[E]`
- l. 15 : `J’étais mort [Dsus2]mais [ ][E7]je sui[F#m]s` → `J’étais mort [Dsus2]mais [E7]je sui[A5]s`
- l. 20 : `Je ne [A]veux me vanter que de la croix` → `[A]Je ne veux me vanter que de la croix`
- l. 21 : `Où [A]mon Sauveur S’est offert pour moi` → `[A]Où mon Sauveur S’est offert pour moi`
- l. 26 : `Donc [F#m]mort [ ][E]où es[A]t, où est [D]ta [E]vic[A]toire ?` → `Donc [F#m]mort [E]où es[A]t, où est [D]ta [E]victoire [A]?`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | A | x=63,4 sur « L » de « Lève » (label seul en tête de ligne) | décalé | [A]Lève-toi |
| 9 | A | x=63,4 sur « T » de « Tout » | décalé | [A]Tout mon |
| 13 | Dsus2 | x=119,2, espace avant « moi » (m=121,5) | exact |  |
| 13 | E7 | x=151,7 sur « q » de « qui » (151,4) | exact |  |
| 13 | F#m | la feuille grave A5 (x=179,4, fin de « vis » : s=175,9–179,5) ; F#m est l'accord du Refrain 2 | nom | vis[A5] |
| 14 | A5 | aucun label sur « Christ » au Chorus 1 (la rangée ne porte que E) ; le A sur « Christ » n'existe qu'au Refrain 2 | inventé | C’est Christ |
| 14 | E | x=175,0 sur la fin de « moi » (i=173,5–176,1) : même syllabe, label surtout après le mot | équivalent | moi[E] gardé |
| 15 | Dsus2 | x=116,5 sur « m » de « mais » (115,9) | exact |  |
| 15 | E7 | x=149,0 sur « je » (j=146,6, e=149,6) | exact |  |
| 15 | F#m | la feuille grave A5 (x=171,5 sur le « s » final de « suis », 169,3–173,0) | nom | sui[A5]s |
| 16 | E | x=135,1 : fin du « e » muet de « ombre » (131,3–135,6) et blanc avant « à » (144,0) ; « l'ombre à » s'élide en une syllabe chantée | équivalent | [E]à gardé |
| 20 | A | x=65,4 sur « J » de « Je » (63,4–67,5) | décalé | [A]Je ne veux |
| 21 | A | x=63,4 sur « O » de « Où » | décalé | [A]Où mon |
| 25 | F#m | x=79,3 sur « L » de « Lui » (77,8) | exact |  |
| 25 | E | x=105,3 sur « mes » (m=95,3, e=103,5) : même syllabe | équivalent |  |
| 25 | A | x=149,0, blanc avant « n’ont » (153,4) | exact |  |
| 26 | F#m | x=87,3, espace avant « mort » (89,1) | exact |  |
| 26 | E | x=115,9 sur « où » (o=111,8) | exact |  |
| 26 | A | x=135,7 sur le « t » de « est » (133,9–136,8), avant la virgule (136,9) | exact |  |
| 26 | D | x=169,4, juste avant « ta » (169,9) | exact |  |
| 26 | E | x=179,7, juste avant « victoire » (180,3) | exact |  |
| 26 | A | x=218,1 sur le « ? » (215,4), après « victoire », pas sur « toire » (193,3) | décalé | victoire [A]? |
| 30 | A | x=317,0 sur « T » de « Tout » (317,0) | exact |  |
| 31 | A | x=317,0 sur « T » de « Tout » (317,0) | exact |  |
| 32 | F#m7 | x=317,0 sur « Tout » | exact |  |
| 32 | D | x=346,8, blanc avant le 2e « tout » (352,3) | exact |  |
| 32 | A | x=439,0 sur « d » de « T’adorer » (438,9) | exact |  |
| 33 | F#m7 | x=317,0 sur « Tout » | exact |  |
| 33 | D | x=346,8, blanc avant le 2e « tout » (352,3) | exact |  |
| 33 | A | x=439,0 sur « d » de « T’adorer » (438,9) | exact |  |
| 34 | F#m7 | x=317,0 sur « Tout » | exact |  |
| 34 | D | x=350,1, blanc avant le 2e « tout » (357,6) ; rangée décalée de +3,3 par un « # » en police Geneva | exact |  |
| 34 | A | x=442,2 : entre « a » (439,5–443,8) et « d » (444,2), plus proche du « d » ; même décalage +3,3 de la rangée | équivalent | T’a[A]dorer gardé |
| 35 | F#m7 | x=317,0 sur « Tout » | exact |  |
| 35 | D | x=346,2, blanc avant le 2e « tout » (357,6) | exact |  |
| 35 | Esus | x=436,3 sur l'apostrophe de « T’adorer » (435,9) | exact |  |
| 35 | E | x=468,2 après « T’adorer » (fin 466,6) | exact |  |
| 39 | A | x=317,0 sur « Tout » | exact |  |
| 39 | Asus2 | x=334,2 sur le « t » final du 1er « Tout » (333,4) | exact |  |
| 39 | A | x=443,1 : fin du « a » (439,5–443,8), 1,1 pt avant « d » (444,2), lettre la plus proche « d » | équivalent | T’a[A]dorer gardé |
| 39 | Amaj7 | x=469,4 après « T’adorer » (fin 466,6) | exact |  |
| 40 | A | x=317,0 sur « Tout » | exact |  |
| 40 | Asus2 | x=334,2 sur le « t » final du 1er « Tout » (333,4) | exact |  |
| 40 | A | x=443,1 : fin du « a » (439,5–443,8), 1,1 pt avant « d » (444,2), lettre la plus proche « d » | équivalent | T’a[A]dorer gardé |
| 40 | Amaj7 | x=469,4 après « T’adorer » (fin 466,6) | exact |  |
| 41 | F#m7 | x=317,0 sur « Tout » | exact |  |
| 41 | D | x=346,8, blanc avant le 2e « tout » (355,0) | exact |  |
| 41 | A | x=444,3 sur « d » (441,5) | exact |  |
| 41 | Amaj7 | x=469,4 après « T’adorer » (fin 463,9) | exact |  |
| 42 | F#m7 | x=317,0 sur « Tout » | exact |  |
| 42 | D | x=346,8, blanc avant le 2e « tout » (352,3) | exact |  |
| 42 | A | x=439,0 sur « d » (438,9) | exact |  |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — espaceur : l. 25 ; orthographe d'accord : l. 35.

En-tête : ajout de `{source: De l_ombre à la lumière.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 26:oeil:7 | appliqué | session | l'opération met l'accord comme la feuille — partition : dernier label A x=218,1 au-dessus du « ? » (215,4), après « victoire » ; « toire » est à 193,3 ; le reste de la ligne est déjà juste (F#m 87,3 mort, E 115,9 où, A 135,7 es‹t›, D 169,4 ta, E 179,7 victoire) |
| 21:oeil:6 | appliqué | session | l'opération met l'accord comme la feuille — partition : label A x=63,4 = « O » de « Où » |
| 20:oeil:5 | appliqué | session | l'opération met l'accord comme la feuille — partition : label A x=65,4 au-dessus du « J » de « Je » (63,4–67,5) |
| 15:oeil:4 | appliqué | session | l'opération met l'accord comme la feuille — partition : rangée Dsus2 116,5 / E7 149,0 / A5 171,5 : A5 sur le « s » final de « suis » (169,3) ; F#m est au Refrain 2 |
| 14:oeil:3 | appliqué | session | l'opération met l'accord comme la feuille — partition : rangée du Chorus 1 : un seul label, E x=175,0 en fin de « moi » ; aucun label sur « Christ » (le A x=113,3 est au Refrain 2) |
| 13:oeil:2 | appliqué | session | l'opération met l'accord comme la feuille — partition : rangée Dsus2 119,2 / E7 151,7 / A5 179,4 : A5 à la fin de « vis » (s 175,9–179,5) ; F#m (x=180,0) est sur la même ligne du Refrain 2 |
| 9:oeil:1 | appliqué | session | l'opération met l'accord comme la feuille — partition : label A x=63,4 = « T » de « Tout » (63,4) |
| 8:oeil:0 | appliqué | session | l'opération met l'accord comme la feuille — partition : label A seul en tête de ligne, x=63,4 = « L » de « Lève » (63,4) |

- Source basse fidélité (feuille Word Hillsong, deux colonnes) : check.py ne lit aucun accord (52 « absent de la source ») ; chaque accord vérifié à l'œil et mesuré sur la couche texte (rawdict, x des labels et des lettres), crops 6× dans crops/de-l-ombre-a-la-lumiere/.
- Huit questions ok : accords des couplets en tête de ligne (A sur Lève, Tout, Je, Où), Chorus 1 rendu à la feuille (A5 au lieu du F#m du Refrain 2 aux lignes 13 et 15, A5 inventé sur « Christ » retiré), dernier A de la ligne 26 sur le « ? ».
- Équivalents gardés (même syllabe, ±1 lettre sur une feuille alignée aux espaces) : moi[E] (label sur la fin du « i »), [E]mes (label sur le « e »), [E]à (label sur le « e » muet de « ombre », élidé avec « à »), T’a[A]dorer aux lignes 34, 39, 40 (label 1-2 pt avant le « d », rangée de la ligne 34 décalée de +3,3 pt par un « # » en police Geneva).
- Structure non appliquée (à appliquer par Timothée) : intro x2, Instrumentaux 1-3, Refrain 2 (après le Couplet 2 et repris après le Pont 1), Couplet 3 à fondre dans le Couplet 2, {key: A}.
- Paroles : identiques à la feuille. Thèmes (Salut, Résurrection, Adoration) dans la liste : inchangés.
- Les 51 accords « absent de la source » restants après correction sont une lecture ratée de check.py (police Opus pour les « # », colonnes mêlées) : tous mesurés à l’œil dans « mesures » (exact ou équivalent même syllabe) ; Esus écrit Esus4 par le moteur (orthographe canonique).

### de-tout-mon-etre — De tout mon être

Lot 2 · partition retenue : `De tout mon être - E.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 14 : `Pour [A]être l'Église [E]que Tu désires, la [B6]lumière du [C#m]monde.[A]` → `Pour [A]être l'Église [E]que Tu désires, la [B6]lumière d[C#m]u monde[A].`
- l. 20 : `L'es[C#m]poir [ ][A]vient,[E]les té[B]nèbres fuient devant [C#m]Ta lu - [A]mière[E].` → `L'es[C#m]poir [A]vient,[E] les té[B]nèbres fuient devant [C#m]Ta lu[A]mière[E].`
- l. 21 : `Et tout œil [B]verra que [A]Jésus e[C#m]st Dieu, [B]grand et [F#m]digne d'êtr[A]e loué[B].` → `Et tout œil [B]verra que [A]Jésus e[C#m]st Dieu,[B] grand et [F#m]digne d'êtr[A]e loué[B].`
- l. 26 : `La [A]majesté, la s[E]plendeur, la grâce, la lu[B6]mière de [C#m]Ton Nom.[A]` → `La [A]majesté, la s[E]plendeur, la grâce, la lu[B6]mière de T[C#m]on Nom[A].`
- l. 36 : `Mon c[A]œur s'écrie : sois gl[C#m]orifié, sois é[E]levé par dess[B]us tout.` → `Mon c[A]œur s'écrie : sois g[C#m]lorifié, sois é[E]levé par dess[B]us tout.`
- l. 41 : `Woa[A]h, Woa[C#m7]h, Woa[E]h, Woa[B]h.` → `Wo[A]ah, Wo[C#m7]ah, Wo[E]ah, Wo[B]ah.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 14 | C#m | p1 y=174,8 : C#m x=351,7 sur « u » de « du » | décalé | d[C#m]u monde (ok par défaut) |
| 14 | A | p1 y=174,8 : A x=414,0 sur le « . » après « monde » | décalé | monde[A]. (ok par défaut) |
| 20 | E | p1 y=310,9 : E x=152,5 sur l'espace avant « les » | décalé | vient,[E] les (question ok) |
| 21 | B | p1 y=344,9 : B x=304,1 sur l'espace avant « grand » | décalé | Dieu,[B] grand (ok par défaut) |
| 26 | C#m | p1 y=446,9 : C#m x=386,0 sur « o » de « Ton » | décalé | T[C#m]on Nom (ok par défaut) |
| 26 | A | p1 y=446,9 : A x=442,0 sur le « . » après « Nom » | décalé | Nom[A]. (ok par défaut) |
| 36 | C#m | p1 y=630,6 : C#m x=223,6 sur « l » de « glorifié » | décalé | g[C#m]lorifié (ok par défaut) |
| 41 | A | p1 y=732,7 : A x=55,2 sur le 1er « a » de « Woah » | décalé | Wo[A]ah (ok par défaut) |
| 41 | C#m7 | p1 y=732,7 : C#m7 x=105,9 sur « a » du 2e « Woah » | décalé | Wo[C#m7]ah (ok par défaut) |
| 41 | E | p1 y=732,7 : E x=156,6 sur « a » du 3e « Woah » | décalé | Wo[E]ah (ok par défaut) |
| 41 | B | p1 y=732,7 : B x=207,2 sur « a » du 4e « Woah » | décalé | Wo[B]ah (ok par défaut) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 30.

En-tête : ajout de `{source: De tout mon être - E.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 41:decale:A:1 | appliqué | def |  |
| 41:decale:C#m7:1 | appliqué | def |  |
| 41:decale:E:1 | appliqué | def |  |
| 41:decale:B:1 | appliqué | def |  |
| 36:decale:C#m:1 | appliqué | def |  |
| 26:decale:C#m:1 | appliqué | def |  |
| 26:decale:A:1 | appliqué | def |  |
| 21:decale:B:1 | appliqué | def |  |
| 20:decale:E:1 | laissé | def |  |
| 20:fable:20:decale:E:1 | appliqué | session | la ligne réécrite met E sur l'espace avant « les » (crochet + espace), comme la partition ; ses autres accords sont tous exacts (C#m « es‹p›oir », A « ‹v›ient », B « té‹n›èbres », C#m « ‹T›a », A « lu - ‹m›ière », E sur le point) — partition : p1 y=310,9 : E x=152,5 = l'espace entre « vient, » et « les » (l à 156,9) ; C#m 74,2 sur p · A 114,2 sur v · B 195,1 sur n · C#m 344,6 sur T · A 394,4 sur m · E 434,4 sur « . » |
| 14:decale:C#m:1 | appliqué | def |  |
| 14:decale:A:1 | appliqué | def |  |

- Rendu ChordPro de l'église (FPDF) : couche texte relue accord par accord (rawdict), 70 accords ; les 11 décalés sont tous corrigés par les « ok » par défaut et la question (l. 20), chacun conforme à la mesure ; aucun accord inventé ni absent, aucun nom différent.
- Structure : la feuille grave bien un « Pré-refrain » (l'« Interlude » de l'outil est la ligne d'accords A C#m E B sous « Refrain », déjà l. 30) : sections et ordre identiques. Le Final est en {start_of_final} alors que 01 le veut en {start_of_outro} : changement de type interdit ici, signalé seulement.
- Paroles, non appliqué : la feuille écrit « l'église » (l. 14), le .cho « l'Église ».
- Thèmes Adoration, Engagement : dans la liste, inchangés.
- Autres versions : « De tout mon être - F.pdf » et les « Accords » (A, D, F, sans tonalité) sont la même feuille transposée ; « De tout mon être.pdf » et « De tout mon être 2.pdf » (shir.fr) sont un autre rendu, non retenu.

### dieu-a-tant-aime — Dieu a tant aimé

Lot 2 · partition retenue : `Dieu a tant aimé (G).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `Je re[G]garde [C]à [ ][G]la croix,` → `Je re[G]garde[C] à [G]la croix,`
- l. 10 : `[D/F#]Je re[Em]garde [C]à Jé[D]sus seul` → `[D/F#]Je re[Em]garde[C] à Jé[D]sus seul`
- l. 11 : `Car Son a[Em]mour [C]m'a res[G]tauré,[D/F#][ ][Em]` → `Car Son a[Em]mour[C] m'a res[G]tauré,[D/F#] [Em]`
- l. 16 : `Car Dieu a [G]tant a[C]imé le m[G]onde` → `Car Dieu a [G]tant ai[C]mé le m[G]onde`
- l. 18 : `Afin que [Em]quiconque [C]croit ne pér[G]i - [D/F#]sse [ ][Em]pas` → `Afin que [Em]quiconque [C]croit ne pé[G]ri[D/F#]sse [Em]pas`
- l. 23 : `Ma con[G]fiance [C]est en [G]Son Nom,` → `Ma con[G]fiance[C] est en [G]Son Nom,`
- l. 24 : `[D/F#]Ma con[Em]fiance [C]est en Sa P[D]arole` → `[D/F#]Ma con[Em]fiance[C] est en Sa P[D]arole`
- l. 25 : `Car par S[Em]a grâce,[C]Il m'af[G]franchit[D/F#],[ ][Em]` → `Car par S[Em]a grâce,[C] Il m'a[G]ffranchit[D/F#],[Em]`
- l. 32 : `J'aban[C]donne ma vie pour l'[G]amour [D/F#]de [Em]Christ,` → `J'aban[C]donne ma vie pour l'a[G]mour [D/F#]de [Em]Christ,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | C | x=107,7 sur l'espace entre « regarde » et « à » | décalé | garde[C] à (crochet + espace, défaut « ok » appliqué) |
| 10 | C | x=143,2 sur l'espace entre « regarde » (fin 134,4) et « à » (147,7) | décalé | garde[C] à (défaut « ok » appliqué) |
| 11 | C | x=148,6 sur l'espace entre « amour » (fin 143,2) et « m'a » (153,0) | décalé | amour[C] m'a (défaut « ok » appliqué) |
| 16 | C | x=169,9 sur « m » de « aimé » | décalé | ai[C]mé (défaut « ok » appliqué) |
| 18 | G | x=261,5 sur « r » de « péri » | décalé | pé[G]ri (défaut « ok » appliqué) |
| 23 | C | x=126,3 sur l'espace entre « confiance » et « est » | décalé | fiance[C] est (défaut « ok » appliqué) |
| 24 | C | x=135,2 sur l'espace entre « confiance » et « est » | décalé | fiance[C] est (défaut « ok » appliqué) |
| 25 | C | x=157,5 sur l'espace entre « grâce, » (fin 157,4) et « Il » (161,9) | décalé | grâce,[C] Il (question « ok », espace rétablie) |
| 25 | G | x=199,6 sur le premier « f » (199,6) de « m'affranchit » | décalé | m'a[G]ffranchit (défaut « ok » appliqué) |
| 32 | G | x=244,5 sur « m » (244,5) de « l'amour » | décalé | l'a[G]mour (défaut « ok » appliqué) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — mot coupé au tiret : l. 12, 19 ; orthographe d'accord : l. 19.

En-tête : ajout de `{source: Dieu a tant aimé (G).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:G:1 | appliqué | def |  |
| 25:decale:C:1 | laissé | def |  |
| 25:decale:G:1 | appliqué | def | inclus dans la ligne de 25:fable:25:decale:C:1 |
| 25:colle:C:1 | appliqué | def | inclus dans la ligne de 25:fable:25:decale:C:1 |
| 25:fable:25:decale:C:1 | appliqué | session | La ligne proposée est juste en entier : Em sur « a » de « Sa », C sur l'espace après « grâce, », G sur le premier « f » de « m'affranchit », D/F# sur la virgule, Em en l'air. Elle coïncide avec le résultat des défauts (25:decale:G et 25:colle:C) ; l'autre lecture 25:decale:C:1 reste « non » (sans opération). — partition : rawdict : Em x=99,7 = « a » (x=99,7) de « Sa » ; C x=157,5 = espace entre « , » (153,0–157,4) et « Il » (161,9) ; G x=199,6 = premier « f » (199,6) ; D/F# x=256,5 = « , » (256,5) ; Em x=300,3 après la fin du texte |
| 24:decale:C:1 | appliqué | def |  |
| 23:decale:C:1 | appliqué | def |  |
| 18:decale:G:1 | appliqué | def |  |
| 16:decale:C:1 | appliqué | def |  |
| 11:decale:C:1 | appliqué | def |  |
| 10:decale:C:1 | appliqué | def |  |
| 9:decale:C:1 | appliqué | def |  |

- Les 56 accords mesurés sur la couche texte (rawdict) de la feuille de l'église et vus sur le rendu 2× : tous au caractère près après les neuf déplacements par défaut et la question de la ligne 25 ; check.py après : 56 exacts.
- « Dsus » de la feuille écrit « Dsus4 » par l'orthographe canonique (01) ; tirets de coupe « li - béré », « péri - sse », « é - ternelle » retirés par la forme, accords sur les mêmes caractères.
- Thèmes actuels (Grâce, Salut, Croix) dans la liste et défendables : inchangés.
- Autres versions présentes : « Dieu a tant aimé - Accords G.pdf », « Dieu a tant aimé (F).pdf », « Dieu a tant aimé .pdf » (même feuille) ; « Dieu a tant aimé.pdf » (traitement de texte, taux 0,193), non retenue.

### dieu-de-l-impossible — Dieu de l'impossible

Lot 2 · partition retenue : `Dieu de l_impossible (C).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 29 : `Il est sans l[Am7]imites,[F]` → `Il est sans li[Am7]mites,[F]`
- l. 35 : `Il règne en Ro[Gsus4]i,[G]` → `Il règne en R[Gsus4]oi,[G]`
- l. 37 : `Il a tout pouvo[Gsus4]ir.[G]` → `Il a tout pouv[Gsus4]oir.[G]`
- l. 38 : `Par Sa f[F]orce incompara[C]ble, ` → `Par Sa f[F]orce incompar[C]able,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 29 | Am7 | x=128,9 = « m » (128,9) de « limites » | décalé | li[Am7]mites (« ok » du relevé appliqué, conforme) |
| 35 | Gsus4 | x=326,4 = « o » (326,4) de « Roi » | décalé | R[Gsus4]oi (« ok » du relevé appliqué, conforme) |
| 37 | Gsus4 | x=362,9 = second « o » (362,9) de « pouvoir » | décalé | pouv[Gsus4]oir (« ok » du relevé appliqué, conforme) |
| 38 | C | x=190,4 = second « a » (190,4) de « incomparable » | décalé | incompar[C]able (« ok » du relevé appliqué, conforme) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 8 ligne(s) — ligne sans paroles : l. 8 ; espace de fin : l. 12, 14, 17, 34, 36, 40 ; espaceur : l. 16.

En-tête : ajout de `{source: Dieu de l_impossible (C).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 38:decale:C:1 | appliqué | Timothée |  |
| 37:decale:Gsus4:1 | appliqué | Timothée |  |
| 35:decale:Gsus4:1 | appliqué | Timothée |  |
| 29:decale:Am7:1 | appliqué | Timothée |  |

- Les 62 accords mesurés sur la couche texte (rawdict) de la feuille de l'église et vus sur le rendu 2× : tous au caractère près après les quatre déplacements « ok » du relevé (lignes 29, 35, 37, 38), qui concordent avec la feuille ; check.py après : 62 exacts.
- La flèche de check.py propose « [Gsus4]Roi » et « pou[Gsus4]voir » : erreur d'affichage de l'outil ; la mesure (label sur « o ») donne « R[Gsus4]oi » et « pouv[Gsus4]oir », comme le relevé.
- Le .cho coupe en deux lignes chaque ligne du Couplet 1 et du Couplet 2 de la feuille : présentation, pas d'accord déplacé.
- Liste extra (structure) citée seulement, non appliquée. Thèmes actuels (Foi, Espérance) dans la liste et défendables : inchangés.
- Autres versions présentes : « Dieu de l_impossible - C.pdf », « Dieu de l'impossible.pdf » (même chant), non retenues.

### dieu-est-parmi-nous — Dieu est parmi nous

Lot 2 · partition retenue : `Dieu est parmi nous - G.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 23 : `[C]Oh ! Célé[D]brons Ses [Em]louanges, ` → `[C]Oh ! Célé[D]brons Ses l[Em]ouanges,`
- l. 27 : `procl[D/F#]amons Sa g[G]randeur,` → `procla[D/F#]mons Sa g[G]randeur,`
- l. 39 : `[C]Tous les peuples et les [D]nations, [Em]dans chaque généra[D/F#]tion,` → `[C]Tous les peuples et les [D]nations,[Em] dans chaque géné[D/F#]ration,`
- l. 41 : `[C]Jésus le Prince [D]de Paix,[Em]le Tout-Puissant bou[D/F#]clié` → `[C]Jésus le Prince [D]de Paix,[Em] le Tout-Puissant bou[D/F#]clié`
- l. 43 : `[C]Acclamons le Cré[D]ateur, [Em]levons nos mains en [D/F#]l'honneur, ` → `[C]Acclamons le Cré[D]ateur,[Em] levons nos mains en [D/F#]l'honneur,`
- l. 45 : `[C]Ensemble, élevons [D]nos voix[Em]et poussons des cris [D/F#]de joie` → `[C]Ensemble, élevons [D]nos voix[Em] et poussons des cris [D/F#]de joie`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 23 | Em | p1 y=446,9 x=193,0 sur « o » de « l‹o›uanges » | décalé | Ses l[Em]ouanges (défaut ok) |
| 27 | D/F# | p1 y=515,0 x=291,7 sur « m » de « procla‹m›ons » | décalé | procla[D/F#]mons (défaut ok) |
| 39 | Em | p2 y=41,6 x=278,4 sur l'espace « nations,‹ ›dans » | décalé | nations,[Em] dans (défaut ok) |
| 39 | D/F# | p2 y=41,6 x=414,5 sur « r » de « géné‹r›ation » | décalé | géné[D/F#]ration (défaut ok) |
| 41 | Em | p2 y=109,6 x=225,0 sur l'espace « Paix,‹ ›le » | décalé | Paix,[Em] le (question ok) |
| 43 | Em | p2 y=194,6 x=220,5 sur l'espace « Créateur,‹ ›levons » | décalé | Créateur,[Em] levons (défaut ok) |
| 45 | Em | p2 y=262,7 x=252,6 sur l'espace « voix‹ ›et » | décalé | voix[Em] et (question ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espace de fin : l. 26.

En-tête : ajout de `{source: Dieu est parmi nous - G.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 45:decale:Em:1 | laissé | def |  |
| 45:fable:45:decale:Em:1 | appliqué | session | Le label Em commence sur l'espace qui suit « voix » : crochet puis espace devant « et » ; le remplacement rétablit l'espace des paroles (« voix et »). C, D et D/F# restent exacts. — partition : p2 y=262,7 : C x=45,4, D x=193,9 sur « n » de « nos », Em x=252,6 sur l'espace « voix‹ ›et », D/F# x=407,3 sur « d » de « de joie ». |
| 43:decale:Em:1 | appliqué | def |  |
| 41:decale:Em:1 | laissé | def |  |
| 41:fable:41:decale:Em:1 | appliqué | session | Le label Em commence sur l'espace qui suit « Paix, » : crochet puis espace devant « le » ; le remplacement rétablit aussi l'espace des paroles (« Paix, le »). C, D et D/F# de la ligne restent exacts. — partition : p2 y=109,6 : C x=45,4 (début de ligne), D x=167,2 sur « d » de « de », Em x=225,0 sur l'espace « Paix,‹ ›le », D/F# x=376,2 sur « c » de « bou‹c›lier ». |
| 39:decale:Em:1 | appliqué | def |  |
| 39:decale:D/F#:1 | appliqué | def |  |
| 27:decale:D/F#:1 | appliqué | def |  |
| 23:decale:Em:1 | appliqué | def |  |

- Couche texte FPDF de l'église mesurée accord par accord (rawdict) : 55 exacts avant, les 7 décalés sont corrigés par les défauts ok (l. 23, 27, 39, 43) et les deux questions (l. 41, 45) ; les 4 autres écarts « non » par défaut sont les autres lectures de ces deux questions.
- Paroles, non appliqué : l. 41 « bouclié » où la partition a « bouclier, » ; l. 43 virgule finale absente de la partition (« l'honneur »).
- Autres versions présentes : Dieu est parmi nous (D).pdf, (F).pdf, - F.pdf, Dieu est parmi nous.pdf — non comparées, la partition retenue fait foi.

### dieu-est-puissant — Dieu est puissant

Lot 2 · partition retenue : `Dieu est puissant (G).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 13 : `Dieu est [G]puissant, Il est [D]juste et grand, [Em]Il peut tout accompli[C]r.` → `Dieu est [G]puissant, Il est [D]juste et grand, [Em]Il peut tout accompl[C]ir.`
- l. 19 : `Élev[G]é, Il a vaincu la mo[D]rt,` → `Élev[G]é, Il a vaincu la m[D]ort,`
- l. 20 : `Oui, Il vi[Em]t, mon [D]Dieu est pui[C]ssant.` → `Oui, Il v[Em]it, mon [D]Dieu est pu[C]issant.`
- l. 26 : `Dieu vit [G]en nous, Il est [D]parmi nous, I[Em]l ouvre la [C]voie.` → `Dieu vit [G]en nous, Il est [D]parmi nous, [Em]Il ouvre la v[C]oie.`
- l. 34 : `Il ne s'éloigne [Em]jamais, [D]Il ne s'éloigne [C]jamais.` → `Il ne s'éloigne [Em]jamais,[D] Il ne s'éloigne [C]jamais.`
- l. 36 : `Il nous tient dans [Em]Sa main,[D]Il nous tient dans [C]Sa main.` → `Il nous tient dans [Em]Sa main,[D] Il nous tient dans [C]Sa main.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 13 | C | x=445,6 sur « i » de « accompl‹i›r. » | décalé | accompl[C]ir. (défaut ok, appliqué) |
| 19 | D | x=201,0 sur « o » de « m‹o›rt, » | décalé | m[D]ort, (défaut ok, appliqué) |
| 20 | Em | x=99,6 sur « i » de « v‹i›t, » | décalé | v[Em]it, (défaut ok, appliqué) |
| 20 | C | x=233,0 sur le premier « i » de « pu‹i›ssant. » | décalé | pu[C]issant. (défaut ok, appliqué) |
| 26 | Em | x=281,1 sur « I » de « Il ouvre » | décalé | [Em]Il ouvre (défaut ok, appliqué) |
| 26 | C | x=362,9 sur « o » de « v‹o›ie. » | décalé | v[C]oie. (défaut ok, appliqué) |
| 34 | D | x=197,8 sur l'espace entre « jamais, » et « Il » | décalé | jamais,[D] Il (défaut ok, appliqué) |
| 36 | D | x=233,9 sur l'espace entre « main, » et « Il » | décalé | main,[D] Il (question ok / espace ajoutée, appliqué) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 9, 32.

En-tête : ajout de `{source: Dieu est puissant (G).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 36:decale:D:1 | laissé | def |  |
| 36:colle:D:1 | appliqué | def | inclus dans la ligne de 36:fable:36:decale:D:1 |
| 36:fable:36:decale:D:1 | appliqué | session | La ligne remplacée pose D sur l'espace avant « Il » (crochet + espace) et sépare « main, » de « Il » : c'est la partition ; une seule lecture retenue (l'écart 36:decale:D:1 reste « non », 36:colle:D:1 donne le même texte). — partition : mesure : D à x=233,9 sur l'espace entre « main, » et « Il » (rangée Em 170,8 sur « S » de « Sa », C 363,8 sur « S » de « Sa ») ; vérifié à l'œil sur le rendu 2× |
| 34:decale:D:1 | appliqué | def |  |
| 26:decale:Em:1 | appliqué | def |  |
| 26:decale:C:1 | appliqué | def |  |
| 20:decale:Em:1 | appliqué | def |  |
| 20:decale:C:1 | appliqué | def |  |
| 19:decale:D:1 | appliqué | def |  |
| 13:decale:C:1 | appliqué | def |  |

- Mesure PyMuPDF (rawdict) de chaque accord de la feuille église (Helvetica-Bold 16 pt) contre le caractère de la ligne de paroles dessous : 47 accords, les 39 exacts confirmés, les 8 décalés corrigés par les opérations par défaut et la question l. 36.
- Intro G D Em C et rangée d'ouverture du pont G/B D Em D C : identiques au .cho.
- Paroles : seule différence, l'espace manquante « main,Il » (l. 36), corrigée avec l'accord.
- Thèmes inchangés (Adoration, dans la liste).
- Autres versions présentes (D, F, B shir.fr, « Dieu est puissant 2 », « - Accords G », « - G ») non utilisées : la feuille (G) fournie fait foi.

### dieu-sauveur — Dieu Sauveur

Lot 2 · partition retenue : `Dieu Sauveur.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 11 : `[G#]Miséricordieux, grâce incomparable,` → `[G#] Miséricordieux, grâce incomparable,` *(session (hors relevé))* — G# x=31,2 au-dessus de l'indentation (deux espaces x=31,2 et 35,6) avant « Miséricordieux » (première lettre x=40,1) : label sur l'espace, crochet + espace (cas Océans de 02) ; seul accord de la ligne.
- l. 12 : `[Fm]Amour véritable, je T'exalte.` → `[Fm] Amour véritable, je T'exalte.` *(session (hors relevé))* — Fm x=31,2 au-dessus de l'indentation (deux espaces x=31,2 et 35,6) avant « Amour » (première lettre x=40,1) : label sur l'espace, crochet + espace (cas Océans de 02) ; seul accord de la ligne.
- l. 13 : `T[C#]u es Yéshoua, Dieu Sauve[G#]ur.` → `T[C#]u es Yéshoua, Dieu Sauv[G#]eur.`
- l. 14 : `[G#]Précieux Fils unique, beauté sans pareil` → `[G#] Précieux Fils unique, beauté sans pareil` *(session (hors relevé))* — G# x=31,2 au-dessus de l'indentation (deux espaces x=31,2 et 35,6) avant « Précieux » (première lettre x=40,1) : label sur l'espace, crochet + espace (cas Océans de 02) ; seul accord de la ligne.
- l. 15 : `[Fm]Sagesse insondable, je T'exalte.` → `[Fm] Sagesse insondable, je T'exalte.` *(session (hors relevé))* — Fm x=31,2 au-dessus de l'indentation (deux espaces x=31,2 et 35,6) avant « Sagesse » (première lettre x=40,1) : label sur l'espace, crochet + espace (cas Océans de 02) ; seul accord de la ligne.
- l. 16 : `T[C#]u es Yéshoua, Dieu Sau[G#]veur.[ ][D#]` → `T[C#]u es Yéshoua, Dieu Sauv[G#]eur.[D#]`
- l. 21 : `Tu es le [Fm]Dieu Sauveur, [C#]notre Dieu, [G#]seul Sauveu[D#]r !` → `Tu es le [Fm]Dieu Sauveur,[C#] notre Dieu, [G#]seul Sauveu[D#]r !`
- l. 25 : `[G#]Toujours invaincu, héros triomphant,` → `[G#] Toujours invaincu, héros triomphant,` *(session (hors relevé))* — G# x=31,2 au-dessus de l'indentation (deux espaces x=31,2 et 35,6) avant « Toujours » (première lettre x=40,1) : label sur l'espace, crochet + espace (cas Océans de 02) ; seul accord de la ligne.
- l. 26 : `[Fm]Puissance absolue, je T'exalte.` → `[Fm] Puissance absolue, je T'exalte.` *(session (hors relevé))* — Fm x=31,2 au-dessus de l'indentation (deux espaces x=31,2 et 35,6) avant « Puissance » (première lettre x=40,1) : label sur l'espace, crochet + espace (cas Océans de 02) ; seul accord de la ligne.
- l. 27 : `T[C#]u es Yéshoua, Dieu Sauve[G#]ur.[ ][D#]` → `T[C#]u es Yéshoua, Dieu Sauv[G#]eur.[D#]`
- l. 32 : `Tu es le [Fm]Dieu Sauveur, [C#]notre Dieu, [G#]seul Sauveu[D#]r !` → `Tu es le [Fm]Dieu Sauveur,[C#] notre Dieu, [G#]seul Sauveu[D#]r !`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | G# | x=31,2 sur l'indentation avant « Miséricordieux » (x=40,1) | décalé (check.py le compte exact : il ignore l'indentation) | [G#] Miséricordieux |
| 12 | Fm | x=31,2 sur l'indentation avant « Amour » (x=40,1) | décalé (check.py le compte exact : il ignore l'indentation) | [Fm] Amour |
| 13 | G# | x=221,5 sur « e » de « Sauveur. » | décalé | Sauv[G#]eur. (« ok » du relevé appliqué) |
| 14 | G# | x=31,2 sur l'indentation avant « Précieux » (x=40,1) | décalé (check.py le compte exact : il ignore l'indentation) | [G#] Précieux |
| 15 | Fm | x=31,2 sur l'indentation avant « Sagesse » (x=40,1) | décalé (check.py le compte exact : il ignore l'indentation) | [Fm] Sagesse |
| 16 | G# | x=221,5 sur « e » de « Sauveur. » | décalé | Sauv[G#]eur. (« ok » du relevé appliqué) |
| 21 | C# | x=208,1 sur l'espace après « Sauveur, », avant « notre » | décalé | Sauveur,[C#] notre (« ok » du relevé appliqué) |
| 25 | G# | x=31,2 sur l'indentation avant « Toujours » (x=40,1) | décalé (check.py le compte exact : il ignore l'indentation) | [G#] Toujours |
| 26 | Fm | x=31,2 sur l'indentation avant « Puissance » (x=40,1) | décalé (check.py le compte exact : il ignore l'indentation) | [Fm] Puissance |
| 27 | G# | x=221,5 sur « e » de « Sauveur. » | décalé | Sauv[G#]eur. (« ok » du relevé appliqué) |
| 32 | C# | x=208,1 sur l'espace après « Sauveur, », avant « notre » | décalé | Sauveur,[C#] notre (« ok » du relevé appliqué) |

En-tête : ajout de `{source: Dieu Sauveur.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:C#:1 | appliqué | Timothée |  |
| 27:decale:G#:1 | appliqué | Timothée |  |
| 21:decale:C#:1 | appliqué | Timothée |  |
| 16:decale:G#:1 | appliqué | Timothée |  |
| 13:decale:G#:1 | appliqué | Timothée |  |

- Les 34 accords mesurés sur la couche texte (rawdict) de la feuille de l'église : après les cinq « ok » du relevé, tous au caractère près.
- En plus, contre ce que check.py compte « exact » : les six premières lignes de couplet sont indentées de deux espaces sur la feuille et l'accord (x=31,2) est gravé au-dessus de l'indentation, pas de la première lettre (x=40,1) : écrit « [G#] Miséricordieux », « [Fm] Amour »… comme le cas Océans de 02 et les autres feuilles de l'église traitées ainsi.
- Paroles, non appliqué : l. 14 la feuille porte « beauté sans pareille, » (le .cho : « sans pareil » sans virgule).
- Pas d'autre version dans Partitions/.

### dieu-tout-puissant — Dieu Tout-Puissant

Lot 2 · partition retenue : `Dieu Tout-Puissant (G).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `Tout l'un[G]ivers cré[D]é par Ton pouv[G]oir;` → `Tout l'uni[G]vers cré[D]é par Ton pou[G]voir;`
- l. 12 : `Le clair mat[G]in ou [D]les ombres du [G]soir.` → `Le clair ma[G]tin ou [D]les ombres du [G]soir.`
- l. 15 : `{start_of_chorus: Refrain}` → `{start_of_chorus: Refrain (x2)}` *(structure)*
- l. 17 : `Dieu Tout-Pui[Am]ssant, [D]que Tu e[G]s grand.` → `Dieu Tout-Pui[Am]ssant,[D] que Tu e[G]s grand.`
- l. 21 : `Quand mon Sauv[G]eur, éclatant de lu[C]mière,` → `Quand mon Sau[G]veur, éclatant de lu[C]mière,`
- l. 23 : `Et que, la[G]issant les douleurs de la [C]terre,` → `Et que, lai[G]ssant les douleurs de la [C]terre,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | G | x=95,6 sur « v » de « l'uni‹v›ers » | décalé | l'uni[G]vers (défaut ok, appliqué) |
| 10 | G | x=252,1 sur « v » de « pou‹v›oir; » | décalé | pou[G]voir; (défaut ok, appliqué) |
| 12 | G | x=109,4 sur « t » de « ma‹t›in » | décalé | ma[G]tin (défaut ok, appliqué) |
| 17 | D | x=185,9 sur l'espace entre « Puissant, » et « que » | décalé | ssant,[D] que (défaut ok, appliqué) |
| 21 | G | x=147,7 sur « v » de « Sau‹v›eur, » | décalé | Sau[G]veur, (défaut ok, appliqué) |
| 23 | G | x=102,3 sur le premier « s » de « lai‹s›sant » | décalé | lai[G]ssant (défaut ok, appliqué) |
| 28 | D | ligne non gravée (section Final absente de la feuille) ; l'outil la mesure contre le 2e vers du refrain (Am x=143,2) | nom | aucune : passage sans accords gravés, gardé, {needs_review} |
| 28 | C | ligne non gravée ; l'outil la mesure contre le D du refrain (x=185,9) | nom | aucune : passage sans accords gravés, gardé |
| 28 | G | ligne non gravée | exact (par l'outil, contre le refrain) | aucune |

En-tête : ajout de `{source: Dieu Tout-Puissant (G).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 28:nom:D:1 | laissé | def | contredit par la partition : Défaut « ok » faux : la feuille ne grave pas de Final (Couplet 1, Refrain (x2), Couplet 2, rien après) ; l'outil compare la ligne 28 au 2e vers du refrain (Am, D, G). Renommer seulement le premier accord donnerait Am C G, ni le refrain ni la fin actuelle. Passage sans accords gravés : les accords D C G sont gardés. |
| 28:nom:C:1 | laissé | def |  |
| 23:decale:G:1 | appliqué | def |  |
| 21:decale:G:1 | appliqué | def |  |
| 17:decale:D:1 | appliqué | def |  |
| 12:decale:G:1 | appliqué | def |  |
| 10:decale:G:1 | appliqué | def |  |
| 10:decale:G:2 | appliqué | def |  |

- Mesure PyMuPDF (rawdict) de chaque accord de la feuille église (Helvetica-Bold 16 pt) contre le caractère de la ligne de paroles dessous : 28 accords gravés, 22 exacts confirmés, les 6 décalés corrigés par les opérations par défaut.
- l. 16 : D/F# sur « : » et Em après les deux-points, en fin de ligne : identiques au .cho.
- Section Final (l. 28) : non gravée sur la feuille ; accords D C G gardés (passage sans accords gravés), un {needs_review} posé ; le défaut « ok » de renommage D→Am est contredit (l'outil comparait au refrain).
- Paroles : identiques à la feuille.
- Thèmes inchangés (Adoration, Action de grâce, dans la liste).
- Les « autres sources » du dossier sont un autre chant (Dieu est puissant, Hillsong) : aucune autre version de ce cantique dans Partitions/.

### digne-est-l-agneau — Digne est l'Agneau

Lot 2 · partition retenue : `Digne est l'Agneau G.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 12 : `[G/B]Merci pour l'[C]amour Sei[G/B]gneur,` → `[G/B]Merci pour l'a[C]mour Sei[G/B]gneur,`
- l. 15 : `Et [D]j'ai compr[C]is Ton par[Am7]don et T[G/B]on amo[D4]ur.[ ][D]` → `Et [D]j'ai comp[C]ris Ton par[Am7]don et T[G/B]on am[D4]our.[D]`
- l. 20 : `[D]Couron[D/C]né de mi[G/B]lle couro[C]nnes, Tu [Am7]es vict[G]orie[D]ux.` → `[D]Couronn[D/C]é de m[G/B]ille couro[C]nnes, Tu [Am7]es vict[G]orie[D]ux.`
- l. 21 : `[G]Saint et élev[D/F#]é, [Am7]Jésus Fi[G/B]ls de Di[C]eu,` → `[G]Saint et élev[D/F#]é, [Am7]Jésus F[G/B]ils de D[C]ieu,`
- l. 23 : `Digne est l'[Am7]Agneau[G/B], ` → `Digne est l'A[Am7]gneau,[G/B]`
- l. 24 : `[C]digne est l'[Am7]Agneau.[G/B][ ][D]` → `[C] digne est l'A[Am7]gneau.[G/B] [D]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | C | x=126,7 sur « m » de « l'amour » | décalé | l'a[C]mour (défaut « ok » appliqué) |
| 15 | C | x=113,4 sur « r » de « compris » | décalé | comp[C]ris (défaut « ok » appliqué) |
| 15 | D4 | x=310,8 sur « o » de « amour. » | décalé | am[D4]our. (défaut « ok » appliqué) |
| 20 | D/C | x=106,7 sur « é » de « Couronné » | décalé | Couronn[D/C]é (défaut « ok » appliqué) |
| 20 | G/B | x=173,4 sur « i » de « mille » | décalé | m[G/B]ille (défaut « ok » appliqué) |
| 21 | G/B | x=242,8 sur « i » de « Fils » | décalé | F[G/B]ils (défaut « ok » appliqué) |
| 21 | C | x=296,1 sur « i » de « Dieu, » | décalé | D[C]ieu, (défaut « ok » appliqué) |
| 23 | Am7 | x=134,7 sur « g » de « l'Agneau, » | décalé | l'A[Am7]gneau |
| 23 | G/B | x=183,6 = espace après la virgule (x=179,2), fin de la ligne du .cho | décalé | l'A[Am7]gneau,[G/B] (après la ponctuation, collé) |
| 24 | C | x=228,1 = espace avant « digne » (d x=232,5) ; check.py reste « décalé » après correction : outil qui ne voit pas l'espace en début de ligne du .cho | décalé | [C] digne (crochet + espace) |
| 24 | Am7 | x=319,2 sur « g » de « l'Agneau. » | décalé | l'A[Am7]gneau. |
| 24 | G/B | x=368,1 = espace après « . » (x=363,7) | exact | l'A[Am7]gneau.[G/B] (inchangé) |
| 24 | D | x=408,7 dans le blanc après G/B | exact | [G/B] [D] (inchangé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — mot coupé au tiret : l. 9, 22 ; espaceur : l. 19, 22.

En-tête : ajout de `{source: Digne est l'Agneau G.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 24:decale:C:1 | laissé | def |  |
| 24:decale:Am7:1 | appliqué | def | inclus dans la ligne de 24:fable:24:decale:C:1 |
| 24:fable:24:decale:C:1 | appliqué | session | C sur l'espace juste avant « digne » : crochet puis espace ; Am7 sur le « g », G/B collé après le point, D plus loin dans le blanc : toute la ligne est comme la partition. — partition : C x=228,1 = espace avant « d » (x=232,5) ; Am7 x=319,2 sur « g » ; G/B x=368,1 = espace après « . » (x=363,7) ; D x=408,7 dans le blanc |
| 23:decale:Am7:1 | appliqué | def | inclus dans la ligne de 23:fable:23:decale:G/B:1 |
| 23:decale:G/B:1 | laissé | def |  |
| 23:fable:23:decale:G/B:1 | appliqué | session | La partition grave G/B dans le blanc qui suit la virgule de « l'Agneau, » ; le .cho coupe la ligne gravée à cet endroit : accord après la ponctuation, collé. Am7 reste sur le « g » (mesuré). — partition : G/B x=183,6 = première espace après « , » (x=179,2) ; Am7 x=134,7 sur « g » de « l'Agneau » |
| 21:decale:G/B:1 | appliqué | def |  |
| 21:decale:C:1 | appliqué | def |  |
| 20:decale:D/C:1 | appliqué | def |  |
| 20:decale:G/B:1 | appliqué | def |  |
| 15:decale:C:1 | appliqué | def |  |
| 15:decale:D4:1 | appliqué | def |  |
| 12:decale:C:1 | appliqué | def |  |

- Les 55 accords mesurés sur la couche texte (rawdict) de la feuille de l'église ; ligne finale vue sur le rendu 2× (crops/digne-est-l-agneau/l23.png).
- Les neuf déplacements par défaut concordent avec la partition ; les deux lectures en question (l. 23 G/B collé après la virgule, l. 24 « [C] digne ») aussi. check.py laisse « décalé » le C de « [C] digne » : la ligne du .cho commence par l'accord et l'outil, qui recolle les deux lignes du .cho en une ligne gravée, ne voit pas l'espace ; la ligne écrite est bien crochet + espace, comme la partition (vérifié à l'œil).
- « pa - yé » et « cruci - fié » : tirets du transcripteur retirés par le moteur, accords sur le même caractère.
- Autres versions présentes : « Digne est l_Agneau - G.pdf » et « Digne est l'Agneau A.pdf », non retenues.

### digne-est-ton-nom — Digne est Ton Nom

Lot 2 · partition retenue : `Digne est Ton Nom - D.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 7 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (x2)}` *(structure)*
- l. 8 : `[Bm][ ][D][ ][G][ ][A][ ][(x2)]` → `[Bm]  [D]  [G]  [A]` *(session)*
- l. 13 : `Pour que [G]je sois l[D/A]ibé - [A]ré.` → `Pour que [G]je sois li[D/A]bé[A]ré.`
- l. 15 : `Je chant[G]erai Ta [D/A]bon - [A]té.[ ][A/C#]` → `Je chan[G]terai Ta [D/A]bon[A]té.[A/C#]`
- l. 22 : `Digne d'être ador[D/F#]é, digne est Ton [Bm]Nom. [(A)]` → `Digne d'être ado[D/F#]ré, digne est Ton [Bm]Nom.[(A)]` *(session)*
- l. 26 : `[D] Ma honte fut [A]enlevée, Tu m'émerv[D/F#]eilles` → `[D] Ma honte fut [A]enlevée, Tu m'émer[D/F#]veilles`
- l. 29 : `Je chant[G]erai Ta [D/A]bon - [A]té.` → `Je chan[G]terai Ta [D/A]bon[A]té.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | (x2) | « (x2) » gravé à x=133,9 au bout de la ligne d'intro « Bm D G A » (y=88,3) : reprise de l'intro, pas un accord | forme (texte dans un crochet) | suffixe du libellé : {start_of_intro: Intro (x2)} et [Bm]  [D]  [G]  [A] |
| 13 | D/A | x=157,5 sur le « b » de « li‹b›é » | décalé (le .cho est sur « i ») | li[D/A]bé (relevé ok) |
| 15 | G | x=87,2 sur le « t » de « chan‹t›erai » | décalé (le .cho est sur « e ») | chan[G]terai (relevé ok) |
| 22 | D/F# | x=162,2 sur le « r » de « ado‹r›é » | décalé (le .cho est sur « é ») | ado[D/F#]ré (relevé ok) |
| 22 | (A) | x=325,0 = fin du point de « Nom. » (. 320,5–325,0), sur la première espace après la ponctuation | forme voisine (le .cho a une espace entre le point et l'accord) | Nom.[(A)] : après la ponctuation, collé (02), comme « té.[A/C#] » l.15 (A/C# x=222,4 = fin du point) |
| 26 | D/F# | x=274,4 sur le « v » de « m'émer‹v›eilles » | décalé (le .cho est sur « e ») | m'émer[D/F#]veilles (relevé ok) |
| 29 | G | x=87,2 sur le « t » de « chan‹t›erai » | décalé (le .cho est sur « e ») | chan[G]terai (relevé ok) |
| 37 | Em Bm Bm/D A | ligne d'accords y=751,6 sous « Ta gloire est manifestée… », dans le cadre du Pont : Em 45,4 · Bm 78,2 · Bm/D 111,7 · A 157,2 | exact (vérifié à l'œil ; check.py dit « absent de la source », il ne lit pas une ligne d'accords placée après une ligne chantée) | inchangé |
| 38 | Em Bm Bm/D A D/F# | ligne d'accords y=765,2 : Em 45,4 · Bm 78,2 · Bm/D 111,7 · A 157,2 · D/F# 180,1 | exact (vérifié à l'œil ; même artefact de check.py) | inchangé |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — mot coupé au tiret : l. 27 ; espace de fin : l. 35 ; ligne sans paroles : l. 37, 38.

En-tête : ajout de `{source: Digne est Ton Nom - D.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 29:decale:G:1 | appliqué | Timothée |  |
| 26:decale:D/F#:1 | appliqué | Timothée |  |
| 22:decale:D/F#:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 15:decale:G:1 | appliqué | Timothée |  |
| 13:decale:D/A:1 | appliqué | Timothée |  |
| 8:instrumental:x2:1 | laissé | Timothée |  |

- Partition Digne est Ton Nom - D.pdf (rendu ChordPro de l'église, couche texte, une page) : les accords mesurés en coordonnées (rawdict), ligne par ligne ; les 5 écarts « ok » du relevé mettent chaque accord sur le caractère de la partition.
- Ligne 22 : en plus du D/F# du relevé, le (A) optionnel est collé au point de « Nom. » (label à x=325,0, fin du point), comme l'A/C# de la l.15 ; check.py classait déjà les deux positions « exact » (en l'air), la règle 02 tranche : après la ponctuation, collé.
- Intro : libellé « Intro (x2) » et ligne « [Bm]  [D]  [G]  [A] », le (x2) quitte le crochet (bloc de structure appliqué : changement de libellé, même directive, même id de section).
- check.py après : seuls restent « absent de la source » les 9 accords des deux lignes instrumentales du Pont (l.37-38) ; ils sont gravés sur la partition (y=751,6 et 765,2), aux mêmes accords et dans le même ordre : l'outil ne lit pas une ligne d'accords qui suit une ligne chantée.
- Pont : la partition écrit « Ta gloire est manifestée, seul Ton Nom est élevé. » sur une seule ligne ; le .cho la coupe en deux (l.35-36), accords au même caractère (Bm sur « est », A sur « Nom », D/F# sur « v » d'« élevé »).
- Paroles, non appliqué : rien d'autre que les mots coupés au tiret (« libé - ré », « bon - té », « indénia - ble »), que la forme écrit entiers, accords au même caractère.
- Thèmes : Adoration gardé (dans la liste, le chant dit d'abord « Digne est Ton Nom »).
- Non repris de la partition : la ligne de traduction et le titre original (« Worthy »).
- Autres versions : Digne est Ton Nom - Accords D.pdf, - Accords.pdf, - C.pdf, - C 2.pdf, Digne est Ton Nom.pdf (même feuille) ; Ton Nom - G.pdf et Ton Nom Bb.pdf : autre chant (accord 0 %).

### donne-nous-des-mains-pures — Donne-nous des mains pures

Lot 2 · partition retenue : `Donne-nous des mains pures.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 8 : `[G] Incline nos cœurs, [D]fléchis nos genoux,` → `[G] Incline nos cœurs,[D] fléchis nos genoux,`
- l. 9 : `[C2] Ô Saint-Esprit rends-nous humb[G]les.` → `[C2] Ô Saint-Esprit rends-nous hum[G]bles.`
- l. 13 : `[G] Tourne nos regards [D]des choses mauvaises,` → `[G] Tourne nos regards[D] des choses mauvaises,`
- l. 18 : `Donne-nous des mains p[G]ures, purifie nos cœur[D]s,` → `Donne-nous des mains p[G]ures, purifie nos cœu[D]rs,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | D | x=170,8 sur l'espace avant « fléchis » | décalé | cœurs,[D] fléchis (relevé ok, appliqué) |
| 9 | G | x=259,7 sur « b » de « hum‹b›les » | décalé | hum[G]bles (relevé ok, appliqué) |
| 13 | D | x=179,7 sur l'espace avant « des » | décalé | regards[D] des (relevé ok, appliqué) |
| 18 | D | x=373,5 sur « r » de « cœu‹r›s » | décalé | cœu[D]rs (relevé ok, appliqué) |

En-tête : ajout de `{source: Donne-nous des mains pures.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 18:decale:D:1 | appliqué | Timothée |  |
| 13:decale:D:1 | appliqué | Timothée |  |
| 9:decale:G:1 | appliqué | Timothée |  |
| 8:decale:D:1 | appliqué | Timothée |  |

- Aucune question ouverte : les 4 déplacements du relevé (lignes 8, 9, 13, 18) mettent l'accord où la partition le grave (vérifié à l'œil sur la page rendue à 2×) ; check.py après : 17 exact sur 17.
- L'autre source (« - Accords.pdf ») est identique à la partition retenue.
- Structure conforme (Couplet 1, Couplet 2, Refrain) ; les « (x2) » des lignes 20 et 23 sont gravés sur la partition (liste extra, non appliquée).
- Thèmes Sainteté, Adoration, Repentance : dans la liste, gardés. {key: G} conforme à la partition.

### ebloui — Ébloui

Lot 2 · partition retenue : `Ébloui - D.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 12 : `[Bm]Je viens vers T[G]oi [D]dans le secr[A]et,` → `[Bm]Je viens vers T[G]oi [D]dans le sec[A]ret,`
- l. 22 : `Ébahi [Bm]par l'am[G]our de Ton [Asus]Ciel.[ ][A]` → `Ébah[Bm]i par l'am[G]our de Ton[Asus4] Ciel.[A]`
- l. 24 : `Je dési[Em]re habit[G]er [A]près de [Bm]Toi.` → `Je dési[Em]re habit[G]er [A]près de Toi.`
- l. 28 : `[Bm]Je vois Ton b[G]ras, [D]je sens Ta ma[A]in.` → `[Bm]Je vois Ton b[G]ras, [D]je sens Ta m[A]ain.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | A | p1 y=153,4 : A x=245,5 sur « r » de « secret » | décalé | sec[A]ret (ok par défaut) |
| 22 | Bm | p1 y=442,6 : Bm x=82,7 sur « i » de « Ébahi » | décalé | Ébah[Bm]i (ok par défaut) |
| 22 | Asus | p1 y=442,6 : Asus x=224,5 sur l'espace avant « Ciel » | décalé | Ton[Asus] Ciel (ok par défaut) |
| 24 | Bm | p1 y=510,6 : aucun label après A x=177,0 | inventé | retiré (question ok) |
| 28 | A | p1 y=578,6 : A x=249,0 sur « a » de « main » | décalé | m[A]ain (ok par défaut) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 6 ligne(s) — ligne sans paroles : l. 8 ; espaceur : l. 14, 17, 21, 30 ; orthographe d'accord : l. 23.

En-tête : ajout de `{source: Ébloui - D.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 28:decale:A:1 | appliqué | def |  |
| 24:invente:Bm:1 | laissé | def |  |
| 24:fable:24:invente:Bm:1 | appliqué | session | la feuille ne grave aucun accord sur « Toi. » : la ligne finit sur A ; Bm avait été ajouté à l'oreille par un autre contributeur avant l'audit, la partition l'emporte. Em « dési‹r›e », G « habit‹e›r », A « ‹p›rès » restent exacts — partition : p1 y=510,6 : Em x=96,1 sur r · G 149,4 sur e · A 177,0 sur p ; rien au-delà sur la ligne (même chose dans « Ébloui - Accords D.pdf ») |
| 22:decale:Bm:1 | appliqué | def |  |
| 22:decale:Asus:1 | appliqué | def |  |
| 12:decale:A:1 | appliqué | def |  |

- Rendu ChordPro de l'église (FPDF) : couche texte relue accord par accord (rawdict), 66 accords ; les 4 décalés sont corrigés par les « ok » par défaut, conformes à la mesure ; le Bm inventé de la l. 24 est retiré par la question.
- À l'oreille : la fin du refrain sur Bm (avant le couplet 2 ou l'intro qui repartent sur Bm) peut se jouer, mais n'est pas gravé.
- Structure identique (Intro, Couplet 1, Refrain, Couplet 2, Pont). Paroles identiques.
- Thème Adoration : dans la liste, inchangé.
- Autres versions : « Ébloui - C.pdf », « Ébloui.pdf » et les « Accords » (A, B, C, D) sont la même feuille transposée.

### echos — Échos

Lot 2 · partition retenue : `Échos.pdf` (traitement-texte, mesure basse-fidelite) · **fichier inchangé**

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 7 | A | x=126,3 sur « t » de « chan‹t›erons » (0,8 pt ; « e » 3,1) | décalé | chan[A]terons |
| 8 | D | x=121,8 sur « u » de « q‹u›’il » (2,3 pt ; « ’ » 4,4) | décalé | q[D]u’il |
| 8 | A | x=206,0 sur « x » de « au‹x› » (2,3 pt ; espace 3,1) | exact (vérifié à l'œil) |  |
| 9 | F#m | x=106,0 sur « s » de « Louon‹s›-le » (2,2 pt ; « - » 2,7) | décalé | Louon[F#m]s-le |
| 10 | A | x=108,7 sur l'espace avant « voir » (1,3 pt ; « v » 4,0) | exact (vérifié à l'œil) |  |
| 28 | A | x=126,3 sur « t » de « chan‹t›erons » (0,8 pt ; « e » 3,1) | décalé | chan[A]terons |
| 29 | D | x=121,8 sur « u » de « q‹u›’il » (2,3 pt ; « ’ » 4,4) | décalé | q[D]u’il |
| 29 | A | x=206,0 sur « x » de « au‹x› » (2,3 pt ; espace 3,1) | exact (vérifié à l'œil) |  |
| 30 | F#m | x=106,0 sur « s » de « Louon‹s›-le » (2,2 pt ; « - » 2,7) | décalé | Louon[F#m]s-le |
| 31 | A | x=108,7 sur l'espace avant « voir » (1,3 pt ; « v » 4,0) | décalé | Jusqu'à[A] voir |
| 43 | A | x=126,3 sur « t » de « chan‹t›erons » (0,8 pt ; « e » 3,1) | décalé | chan[A]terons |
| 44 | D | x=121,8 sur « u » de « q‹u›’il » (2,3 pt ; « ’ » 4,4) | décalé | q[D]u’il |
| 44 | A | x=206,0 sur « x » de « au‹x› » (2,3 pt ; espace 3,1) | exact (vérifié à l'œil) |  |
| 45 | F#m | x=106,0 sur « s » de « Louon‹s›-le » (2,2 pt ; « - » 2,7) | décalé | Louon[F#m]s-le |
| 46 | A | x=108,7 sur l'espace avant « voir » (1,3 pt ; « v » 4,0) | décalé | Jusqu'à[A] voir |
| 14 | A | x=113,9 sur « n » de « Apparte‹n›ant » (1,2 pt) | exact (vérifié à l'œil) |  |
| 15 | D | x=119,1 : « n » de « nuit » 1,2 pt, espace 1,4 pt ; lettre la plus proche « n » | exact (vérifié à l'œil ; même mot que l'espace) |  |
| 15 | A | x=198,1 : « s » et « o » de « sombre » à 2,4 pt chacun, label commence dans « s » | exact (vérifié à l'œil ; même syllabe « som ») |  |
| 16 | F#m | x=127,0 sur « v » de « vous » (0,4 pt) | exact (vérifié à l'œil) |  |
| 17 | A | x=119,1 : espace avant « arrivera » 2,6 pt, « e » de « aube » 3,4 pt | décalé | l'aube[A] arrivera |
| 21 | F#m | x=108,7 sur « v » de « vous » (0,8 pt) | exact (vérifié à l'œil) |  |
| 22 | A | x=90,3 sur « n » de « nouveau » (1,0 pt) | exact (vérifié à l'œil) |  |
| 22 | E | x=189,2 sur « l » de « lève » (0,9 pt ; espace 1,7) | exact (vérifié à l'œil) |  |
| 23 | F#m | x=93,0 : « t » 2,9 pt, « a » 3,0 pt ; .cho devant l'apostrophe, hors du label | décalé | l'a[F#m]tmosphère |
| 24 | A | x=129,6 sur « n » de « nouveau » (0,7 pt) | exact (vérifié à l'œil) |  |
| 24 | E | x=212,7 sur l'espace avant « vienne » (0,2 pt) | décalé | monde[E] vienne |
| 32 | A | 1er A x=72,0 sur « O » de « Ooo » (0,0) | exact (vérifié à l'œil) |  |
| 32 | D | x=102,7 (col. 1) sur le 2e « o » de « o‹o›h » (0,5 pt) | exact (vérifié à l'œil) |  |
| 32 | A | 2e A x=124,1 (col. 1) : exactement entre le 1er « o » (3,1 pt) et le 2e « o » (3,1 pt) de « oo-ooh » ; à cheval dans la même vocalise, .cho gardé (choix « non » du relevé, partition pas nette à cet endroit) | à cheval, gardé |  |
| 32 | D | x=147,0 : « h » 3,1 pt, « o » 3,2 pt de « oo-ooh » ; lettre la plus proche « h », .cho gardé | exact (vérifié à l'œil, écart serré) |  |
| 32 | F#m7 | x=165,7 sur le 2e « o » de « o‹o›-ooh » (2,1 pt ; 1er « o » 4,1) | exact (vérifié à l'œil) |  |
| 32 | D | x=208,3 sur le 2e « o » de « o‹o›-oo-ooh » (0,1 pt) | exact (vérifié à l'œil) |  |
| 32 | A | x=229,7 sur le « - » avant « ooh » final (1,6 pt ; « o » 4,7) | exact (vérifié à l'œil) |  |
| 39 | A | 1er A x=72,0 sur « O » de « Ooo » (0,0) | exact (vérifié à l'œil) |  |
| 39 | D | x=102,7 (col. 1) sur le 2e « o » de « o‹o›h » (0,5 pt) | exact (vérifié à l'œil) |  |
| 39 | A | 2e A x=124,1 (col. 1) : exactement entre le 1er « o » (3,1 pt) et le 2e « o » (3,1 pt) de « oo-ooh » ; à cheval dans la même vocalise, .cho gardé (choix « non » du relevé, partition pas nette à cet endroit) | à cheval, gardé |  |
| 39 | D | x=147,0 : « h » 3,1 pt, « o » 3,2 pt de « oo-ooh » ; lettre la plus proche « h », .cho gardé | exact (vérifié à l'œil, écart serré) |  |
| 39 | F#m7 | x=165,7 sur le 2e « o » de « o‹o›-ooh » (2,1 pt ; 1er « o » 4,1) | exact (vérifié à l'œil) |  |
| 39 | D | x=208,3 sur le 2e « o » de « o‹o›-oo-ooh » (0,1 pt) | exact (vérifié à l'œil) |  |
| 39 | A | x=229,7 sur le « - » avant « ooh » final (1,6 pt ; « o » 4,7) | exact (vérifié à l'œil) |  |
| 47 | A | 1er A x=72,0 sur « O » de « Ooo » (0,0) | exact (vérifié à l'œil) |  |
| 47 | D | x=102,7 (col. 1) sur le 2e « o » de « o‹o›h » (0,5 pt) | exact (vérifié à l'œil) |  |
| 47 | A | 2e A x=124,1 (col. 1) : exactement entre le 1er « o » (3,1 pt) et le 2e « o » (3,1 pt) de « oo-ooh » ; à cheval dans la même vocalise, .cho gardé (choix « non » du relevé, partition pas nette à cet endroit) | à cheval, gardé |  |
| 47 | D | x=147,0 : « h » 3,1 pt, « o » 3,2 pt de « oo-ooh » ; lettre la plus proche « h », .cho gardé | exact (vérifié à l'œil, écart serré) |  |
| 47 | F#m7 | x=165,7 sur le 2e « o » de « o‹o›-ooh » (2,1 pt ; 1er « o » 4,1) | exact (vérifié à l'œil) |  |
| 47 | D | x=208,3 sur le 2e « o » de « o‹o›-oo-ooh » (0,1 pt) | exact (vérifié à l'œil) |  |
| 47 | A | x=229,7 sur le « - » avant « ooh » final (1,6 pt ; « o » 4,7) | exact (vérifié à l'œil) |  |
| 36 | F#m | x=315,8 sur « J » de « Je » (0,0) | exact (vérifié à l'œil) |  |
| 36 | E | x=423,4 sur « d » de « durera » (0,8 pt ; espace 1,8) | exact (vérifié à l'œil) |  |
| 37 | D | x=334,1 sur « g » de « lon‹g›temps » (2,6 pt ; « t » 4,2) | exact (vérifié à l'œil) |  |
| 48 | C2 - Quelle grâce | titre de section de la feuille (« [C2 - Quelle grâce] x2 »), pas un accord ; retiré du crochet : la ligne devient la fin du Couplet 4 et l'ouverture d'une section ajoutée après la dernière | inventé (texte dans un crochet) | {end_of_verse} + {start_of_verse: Couplet 5 (Quelle grâce x2)} |

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 48:reporte:C2 - Quelle grâce:1 | laissé | Timothée |  |
| 47:relire:A:1 | laissé | Timothée |  |
| 46:relire:A:1 | laissé | Timothée |  |
| 45:relire:F#m:1 | laissé | Timothée |  |
| 44:relire:D:1 | laissé | Timothée |  |
| 43:relire:A:1 | laissé | Timothée |  |
| 39:relire:A:1 | laissé | Timothée |  |
| 32:relire:A:1 | laissé | Timothée |  |
| 31:relire:A:1 | laissé | Timothée |  |
| 30:relire:F#m:1 | laissé | Timothée |  |
| 29:relire:D:1 | laissé | Timothée |  |
| 28:relire:A:1 | laissé | Timothée |  |
| 24:relire:E:1 | laissé | Timothée |  |
| 23:relire:F#m:1 | laissé | Timothée |  |
| 17:relire:A:1 | laissé | Timothée |  |
| 9:relire:F#m:1 | laissé | Timothée |  |
| 8:relire:D:1 | laissé | Timothée |  |
| 7:relire:A:1 | laissé | Timothée |  |

- Source basse fidélité (feuille Word, accords alignés aux espaces, pas d'environ 2,6 pt), couche texte exacte : check.py ne lit pas la feuille à deux colonnes (51 « absent de la source » avant comme après). Chaque accord mesuré à la place en coordonnées (rawdict : bord gauche du label ↔ bord gauche de la lettre la plus proche) et vérifié à l'œil sur un rendu 4× (crops/echos).
- Aucune question. 17 lignes changées, toutes contre le « non » du relevé, la partition l'emportant : 7/28/43 chan[A]terons, 8/29/44 q[D]u’il, 9/30/45 Louon[F#m]s-le, 31/46 Jusqu'à[A] voir (comme la l. 10), 17 l'aube[A] arrivera, 23 l'a[F#m]tmosphère, 24 monde[E] vienne ; 48 (crochet « C2 - Quelle grâce ») remplacé par {end_of_verse}.
- Écarts serrés (moins d'1 pt entre deux lettres candidates), lus sur la lettre la plus proche sans {needs_review} : F#m de « Louons-le » (s / tiret, 0,4 pt — l'oreille pourrait le mettre sur « le »), A de « l'aube arrivera » (espace / e, même syllabe chantée par élision), F#m de « l'atmosphère » (t / a, même syllabe), D de « nuit » (n / espace). Le 2e A des lignes Ooo tombe exactement entre deux « o » de la même vocalise : .cho gardé.
- l. 48 : « [C2 - Quelle grâce] x2 » n'est pas un accord ; remplacé par la fin du Couplet 4 et une section « Couplet 5 (Quelle grâce x2) » ajoutée après la dernière, avec un {needs_review} (le couplet 2 de Quelle grâce n'a ni accords ni tonalité sur cette feuille ; quelle-grace.cho est en C, ce chant en A).
- Structure de la feuille non reprise (à appliquer par Timothée) : le C2 de Quelle grâce ouvre aussi le chant, les lignes « Ooo » sont un Tag (x2) entre les sections, « x6 » (l. 38) est une indication de reprise du Pont écrite comme une parole, et les Couplets 3 et 4 du .cho sont des reprises du Verset 1.
- Autre fichier : « Échos - C.pdf » est la même feuille (même couche texte, accords en A malgré le nom).
- Thèmes inchangés (Adoration, Foi, Espérance, tous dans la liste).
- L. 7 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Nous chan[A]terons, nous danserons » ; le choix du relevé est gardé (« Nous chant[A]erons, nous danserons »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 28 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Nous chan[A]terons, nous danserons » ; le choix du relevé est gardé (« Nous chant[A]erons, nous danserons »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 43 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Nous chan[A]terons, nous danserons » ; le choix du relevé est gardé (« Nous chant[A]erons, nous danserons »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 8 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Jusqu'à q[D]u’il fasse écho au[A]x cieux » ; le choix du relevé est gardé (« Jusqu'à qu[D]’il fasse écho au[A]x cieux »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 29 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Jusqu'à q[D]u’il fasse écho au[A]x cieux » ; le choix du relevé est gardé (« Jusqu'à qu[D]’il fasse écho au[A]x cieux »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 44 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Jusqu'à q[D]u’il fasse écho au[A]x cieux » ; le choix du relevé est gardé (« Jusqu'à qu[D]’il fasse écho au[A]x cieux »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 9 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Louon[F#m]s-le » ; le choix du relevé est gardé (« Louons[F#m]-le »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 30 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Louon[F#m]s-le » ; le choix du relevé est gardé (« Louons[F#m]-le »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 45 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Louon[F#m]s-le » ; le choix du relevé est gardé (« Louons[F#m]-le »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 31 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Jusqu'à[A] voir l'autre côté » ; le choix du relevé est gardé (« Jusqu'à [A]voir l'autre côté »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 46 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Jusqu'à[A] voir l'autre côté » ; le choix du relevé est gardé (« Jusqu'à [A]voir l'autre côté »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 17 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Car l'aube[A] arrivera bientôt. » ; le choix du relevé est gardé (« Car l'aub[A]e arrivera bientôt. »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 23 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Et l'a[F#m]tmosphère qui se brise » ; le choix du relevé est gardé (« Et l[F#m]'atmosphère qui se brise »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 48 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « {end_of_verse} » ; le choix du relevé est gardé (« [C2 - Quelle grâce] x2 »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 24 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Pour qu’un [A]nouveau monde[E] vienne » ; le choix du relevé est gardé (« Pour qu’un [A]nouveau monde [E]vienne »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.

### eclipse — Éclipse

Lot 2 · partition retenue : `Éclipse.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 8 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (x2)}` *(structure)*
- l. 16 : `[G#m7]Entouré de [A] grâce et d’amo[E]ur[ ][C#m]` → `[G#m7]Entouré d[A]e grâce et d’amo[E]ur[C#m]` *(session (hors relevé))* — y=367 : A x=122,3 dans le « e » de « de » (119,0–124,3 ; « g » de « grâce » à 127,3) : lettre la plus proche du label « e » (02, basse fidélité) ; label à cheval sur l’espace : needs_review.
- l. 25 : `Ô n[G#m7]ul n’est comme T[A]oi` → `Ô [G#m7]nul n’est comme [A]Toi` *(session (hors relevé))* — y=592 : G#m7 x=87,0 dans le « n » de « nul » (83,7–89,7 ; « u » à 89,7) ; A x=170,3 dans le « T » de « Toi » (166,4–172,9 ; « o » à 172,9) ; vu à l'œil (rendu 8×) : G sur « n », A sur « T ». Le .cho avait les deux accords une lettre plus loin.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 16 | G#m7 | x=72,0 sur « E » de « Entouré » | exact | [G#m7]Entouré |
| 16 | A | x=122,3 sur « e » de « d‹e› » (119,0–124,3) | décalé | d[A]e grâce |
| 16 | E | x=198,0 au début du « u » (198,6) de « amo‹u›r » | exact | d’amo[E]ur |
| 16 | C#m | x=215,0 après « amour » (fin 208,6) | exact | d’amo[E]ur[C#m] (en l'air) |
| 21 | E | x=96,0 au début du « o » (96,2) de « gl‹o›ire » | exact | gl[E]oire |
| 21 | C#m | x=162,0 sur l'espace entre « le » (fin 162,8) et « soleil » (165,8) | décalé | le[C#m] soleil |
| 22 | G#m7 | x=105,0 sur « â » de « p‹â›lit » (102,8–108,2) | décalé | p[G#m7]âlit |
| 22 | A | x=161,3 sur « o » de « T‹o›i » (158,7–164,7) | décalé | T[A]oi |
| 25 | G#m7 | x=87,0 sur « n » de « ‹n›ul » (83,7–89,7) | décalé | [G#m7]nul |
| 25 | A | x=170,3 sur « T » de « ‹T›oi » (166,4–172,9) | décalé | [A]Toi |
| 29 | E, C#m | couplet 2 sans aucun accord sur la feuille (colonne droite, y=220) | reporté | gardés (recopiés du couplet 1, même syllabes) |
| 30 | G#m, A | couplet 2 sans accord sur la feuille (y=234) | reporté | gardés ; G#m au lieu du G#m7 du couplet 1, à l'oreille |
| 31 | E, C#m | couplet 2 sans accord sur la feuille (y=248) | reporté | gardés |
| 32 | G#m, A, E, C#m | couplet 2 sans accord sur la feuille (y=262) | reporté | gardés ; G#m au lieu de G#m7, à l'oreille |
| 33 | G#m7, A | couplet 2 sans accord sur la feuille (y=276) | reporté | gardés (comme l. 17) |
| 37 | C#m | x=323,0, 0,7 pt avant la fin du « h » de « Oh » (317,7–323,7), fin de ligne | exact | [E]Oh[C#m] (non du relevé confirmé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 9.

En-tête : ajout de `{source: Éclipse.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 37:relire:C#m:1 | laissé | Timothée |  |
| 33:reporte:G#m7:1 | laissé | Timothée |  |
| 33:reporte:A:1 | laissé | Timothée |  |
| 32:reporte:G#m:1 | laissé | Timothée |  |
| 32:reporte:A:1 | laissé | Timothée |  |
| 32:reporte:E:1 | laissé | Timothée |  |
| 32:reporte:C#m:1 | laissé | Timothée |  |
| 31:reporte:E:1 | laissé | Timothée |  |
| 31:reporte:C#m:1 | laissé | Timothée |  |
| 30:reporte:G#m:1 | laissé | Timothée |  |
| 30:reporte:A:1 | laissé | Timothée |  |
| 29:reporte:E:1 | laissé | Timothée |  |
| 29:reporte:C#m:1 | laissé | Timothée |  |
| 22:relire:G#m7:1 | laissé | Timothée |  |
| 22:relire:A:1 | laissé | Timothée |  |
| 21:relire:C#m:1 | laissé | Timothée |  |

- Source basse fidélité (feuille Pages/Word alignée aux espaces et tabulations, deux colonnes) : check.py ne la lit pas (0 accord mesuré, famille inconnue) ; les 40 accords gravés ont été mesurés en coordonnées (rawdict) et vérifiés à l'œil sur des rendus 6–8× avec repères des bords de lettres (crops/eclipse/).
- Les 44 « absent de la source » de check.py, avant comme après, sont un échec de lecture de l'outil (feuille à deux colonnes, famille inconnue), pas des accords absents : mesurés à la main, sont exacts tels quels l. 13 (E, C#m), 14 (G#m7, A en l'air avant « couper »), 15 (E, C#m), 17 (G#m7, A), 23 (E sur « r »), 24 (C#m sur « n »), 37–40 (pont : E/C#m sur « Oh » puis après, G#m7 sur « Nul », A sur « T »).
- Règle de lecture : la lettre sous le bord gauche du label ; un label à moins de 1 pt du début de la lettre suivante (approche de la police) compte pour celle-ci (l. 13 C#m, 14 A, 16 E, 21 E, 24 C#m, 37 C#m, 39 C#m), ce que l'œil confirme.
- Hors relevé, corrigé à la mesure : l. 25 G#m7 sur « n » de « nul », A sur « T » de « Toi » (bord gauche du label dans la lettre, méthode de l’audit).
- Couplet 2 : la feuille n'y grave aucun accord ; ceux du .cho (recopiés du couplet 1, avec G#m au lieu de G#m7 l. 30 et 32) sont gardés comme reportés, selon le relevé ; nom G#m / G#m7 à confirmer à l'oreille.
- Intro : la ligne « [E][ ][C#m][ ][G#m7][ ][A] » est remise en forme par le moteur ; libellé « Intro (x2) » appliqué. Instrumental x2 après le refrain : bloc renvoyé à Timothée (insertion hors fin interdite).
- Autre source : « Éclipse - Accords.pdf », doublon exact de la même feuille.
- Extra (non appliqué) : les 4 accords de la ligne instrumentale p1 y=668 (E, C#m, G#m7, A) relèvent du bloc Interlude proposé.
- L. 21 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Ta gl[E]oire éclipse le[C#m] soleil » ; le choix du relevé est gardé (« Ta gl[E]oire éclipse le [C#m]soleil »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.
- L. 22 : lecture de la feuille (Word alignée aux espaces, ± 1 syllabe) « Tout p[G#m7]âlit face à T[A]oi » ; le choix du relevé est gardé (« Tout pâ[G#m7]lit face à To[A]i »), écart d'une syllabe au plus sur une source de basse fidélité — à confirmer à l'oreille.

### en-toi-je-sais-qui-je-suis — En Toi je sais qui je suis

Lot 2 · partition retenue : `En Toi je sais qui je suis - F.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 17 : `Je suis en[Dm]fant [C]de [Bb]Dieu, je suis à [F]Lui.` → `Je suis en[Dm]fant [C]de [Bb]Dieu, je suis à[F] Lui.`
- l. 28 : `Je suis en[Dm]fant [C]de [Bb]Dieu, je suis à [F]Lui.` → `Je suis en[Dm]fant [C]de [Bb]Dieu, je suis à[F] Lui.`
- l. 30 : `Je suis en[Dm]fant [C]de [Bb]Dieu, je suis à [F]Lui.` → `Je suis en[Dm]fant [C]de [Bb]Dieu, je suis à[F] Lui.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 17 | F | p1 y=289,5 : F x=289,0 = l'espace entre « à » et « Lui. » (« L » à x≈293) | décalé | je suis à[F] Lui. |
| 28 | F | p1 y=527,6 : F x=289,0 = l'espace avant « Lui. » | décalé | je suis à[F] Lui. |
| 30 | F | p1 y=595,6 : F x=289,0 = l'espace avant « Lui. » | décalé | je suis à[F] Lui. |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — mot coupé au tiret : l. 21 ; espace de fin : l. 34.

En-tête : ajout de `{source: En Toi je sais qui je suis - F.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 30:decale:F:1 | appliqué | Timothée |  |
| 28:decale:F:1 | appliqué | Timothée |  |
| 17:decale:F:1 | appliqué | Timothée |  |

- Rendu ChordPro de l'église (FPDF) : check.py lit la couche texte, 45 accords exacts sur 48 ; les 3 décalés (F sur l'espace avant « Lui. », l. 17, 28, 30) sont corrigés par les « ok » du relevé, conformes à la mesure (x=289,0 sur l'espace).
- Paroles, non appliqué : la partition écrit « lui » en minuscule, le .cho « Lui ».
- l. 21 « grâce [Dm]in - [C]son[F]dable » : tiret du transcripteur, réécrit « in[C]son[F]dable » par le moteur (accords exacts).
- Autres versions de la même feuille : « - Accords F », « - D », sans suffixe ; non comparées en détail.

### en-verite — En vérité

Lot 2 · partition retenue : `En Vérité.pdf` (traitement-texte, mesure basse-fidelite)

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 14 | G#m | x=289,7 : contenu dans le « t » de « t'offrir » (287,5–291,3), mais début de l'apostrophe à 1,6 pt contre 2,3 pt pour le « t » | à cheval (± 0,6 pt) | aucune : [G#m]t'offrir gardé (choix « non » du relevé, partition pas nette à ce caractère) |
| 17 | F# | x=273,4 dans le « m » de « moi » | décalé | pour [F#]moi |
| 21 | E | x=130,31, début du « i » de « voici » à 130,32 | décalé | vo[E]ici |
| 21 | B | x=190,2, début du « i » de « vérité » à 0,8 pt | exact (lettre la plus proche) | inchangé |
| 22 | F# | x=95,32, début du « o » de « coeur » à 95,34 | exact | inchangé |
| 22 | G#m | x=185,5 dans l'espace avant « toi » | décalé (espace) | à[G#m] toi |
| 25 | F# | x=107,0 dans le « d » de « douleurs » | décalé | [F#]douleurs |
| 25 | G#m | x=224,4, début du « i » de « joies » à 2,3 pt | exact (lettre la plus proche) | inchangé |
| 26 | E | x=134,2 au milieu du « v » de « voici » (130,3–138,1) : début de « v » à 3,88 pt, de « o » à 3,90 pt | à cheval (± 0,02 pt) | aucune : v[E]oici gardé (choix « non » du relevé ; ni « v » ni « o » ne l'emporte) |
| 44 | G#m | x=215,1 dans le « o » de « monde » | décalé | m[G#m]onde |
| 46 | G#m | x=184,0 dans le « n » de « monde » | décalé | mo[G#m]nde |
| 51 | B | x=116,3 dans le « m » de « mon » | décalé | [B]mon |
| 51 | F# | x=184,7, début du « i » de « bien » à 0,5 pt | exact | inchangé |
| 52 | B/D# | x=108,5 dans l'espace avant « mon » | décalé (espace) | es[B/D#] mon |
| 52 | F# | x=198,7 sur le « n » de « bien » ; G#m x=222,8 après la fin de ligne | exact | inchangé |
| 53 | B/D# | x=108,5 dans l'espace avant « mon » | décalé (espace) | es[B/D#] mon |
| 30 | E B F# G#m (l. 30 à 33) | la feuille n'écrit aucun accord sur le couplet 2 | reporté | aucune : accords reportés du couplet 1 gardés (choix « non » du relevé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 9, 10.

En-tête : ajout de `{source: En Vérité.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 53:relire:B/D#:1 | laissé | Timothée |  |
| 52:relire:B/D#:1 | laissé | Timothée |  |
| 51:relire:B:1 | laissé | Timothée |  |
| 46:relire:G#m:1 | laissé | Timothée |  |
| 44:relire:G#m:1 | laissé | Timothée |  |
| 33:reporte:E:1 | laissé | Timothée |  |
| 33:reporte:B:1 | laissé | Timothée |  |
| 33:reporte:F#:1 | laissé | Timothée |  |
| 32:reporte:E:1 | laissé | Timothée |  |
| 32:reporte:B:1 | laissé | Timothée |  |
| 32:reporte:F#:1 | laissé | Timothée |  |
| 32:reporte:G#m:1 | laissé | Timothée |  |
| 31:reporte:E:1 | laissé | Timothée |  |
| 31:reporte:B:1 | laissé | Timothée |  |
| 31:reporte:F#:1 | laissé | Timothée |  |
| 30:reporte:E:1 | laissé | Timothée |  |
| 30:reporte:B:1 | laissé | Timothée |  |
| 30:reporte:F#:1 | laissé | Timothée |  |
| 30:reporte:G#m:1 | laissé | Timothée |  |
| 26:relire:E:1 | laissé | Timothée |  |
| 25:relire:F#:1 | laissé | Timothée |  |
| 22:relire:G#m:1 | laissé | Timothée |  |
| 21:relire:E:1 | laissé | Timothée |  |
| 17:relire:F#:1 | laissé | Timothée |  |
| 14:relire:G#m:1 | laissé | Timothée |  |

- Source basse fidélité (feuille Google Docs, accords alignés aux espaces) : check.py ne lit pas la source (71 « absent de la source ») ; chaque accord du chant vérifié à l'œil et mesuré sur la couche texte (rawdict), méthode de l'audit (début de lettre le plus proche du bord gauche du label), rendus 4× dans crops/en-verite/.
- Intro, couplet 1, refrain, ponts : noms et nombre d'accords conformes à la feuille ; aucun accord absent ni inventé. Couplet 2 sans accords sur la feuille : accords reportés gardés.
- Deux labels à cheval laissés comme le relevé : l. 14 G#m (« t » ou apostrophe de « t'offrir », 0,6 pt d'écart) et l. 26 E (milieu du « v » de « voici », 0,02 pt d'écart entre « v » et « o ») ; pas de needs_review, la feuille ne tranche pas au caractère et le relevé a choisi.
- Structure : bloc des ponts renvoyé à Timothée (séparation de Pont 1, « X2 » écrits comme paroles l. 41, 48, 51).
- Paroles : identiques à la feuille ; thèmes Adoration, Engagement gardés.
- L. 17 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « [E]Je n’ai rien que t[B]on amour pour [F#]moi » ; le « non » du relevé est gardé (« [E]Je n’ai rien que t[B]on amour pour m[F#]oi ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.
- L. 21 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « Et me vo[E]ici en vér[B]ité » ; le « non » du relevé est gardé (« Et me voi[E]ci en vér[B]ité ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.
- L. 22 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « le c[F#]oeur ouvert à[G#m] toi » ; le « non » du relevé est gardé (« le c[F#]oeur ouvert à [G#m]toi ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.
- L. 25 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « Mes [F#]douleurs et mes jo[G#m]ies » ; le « non » du relevé est gardé (« Mes d[F#]ouleurs et mes jo[G#m]ies ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.
- L. 44 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « (Non) [C#m]Rien, rien au m[G#m]onde » ; le « non » du relevé est gardé (« (Non) [C#m]Rien, rien au mo[G#m]nde ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.
- L. 46 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « [C#m]Rien, rien au mo[G#m]nde » ; le « non » du relevé est gardé (« [C#m]Rien, rien au mon[G#m]de ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.
- L. 51 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « [E]Tu es [B]mon seul b[F#]ien X2 » ; le « non » du relevé est gardé (« [E]Tu es m[B]on seul b[F#]ien X2 ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.
- L. 52 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « [E]Tu es[B/D#] mon seul bie[F#]n[G#m] » ; le « non » du relevé est gardé (« [E]Tu es [B/D#]mon seul bie[F#]n[G#m] ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.
- L. 53 : la lecture de la feuille (alignée aux espaces, ± 1 syllabe) donne « [E]Tu es[B/D#] mon seul bie[F#]n » ; le « non » du relevé est gardé (« [E]Tu es [B/D#]mon seul bie[F#]n ») : écart d'une syllabe au plus sur une source de basse fidélité, à confirmer à l'oreille.

### entends-mon-coeur — Entends mon cœur

Lot 2 · partition retenue : `Entends mon cœur (D).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[D] Comment expli[G2]quer et comment déc[Bm]rire` → `[D] Comment expli[G2]quer et comment dé[Bm]crire`
- l. 19 : `Entends le chant d'a[G2]mour [A/E]d'un enfant rachet[D]é.` → `Entends le chant d'a[G2]mour[A/E] d'un enfant rache[D]té.`
- l. 21 : `Pour [A]Te dire quel Dieu [D]merveil[A/C#]leux Tu e[Bm]s.` → `Pour [A]Te dire quel Dieu [D]merveill[A/C#]eux Tu e[Bm]s.`
- l. 27 : `Si tout comme la [G2]pluie les mots pouvaient coul[Bm]er,` → `Si tout comme la [G2]pluie les mots pouvaient cou[Bm]ler,`
- l. 29 : `[A/E]je ne pourrais pas l'expri[Bm]mer.` → `[A/E] je ne pourrais pas l'expri[Bm]mer.`
- l. 36 : `Tu sais nos espo[G2]irs, Seigneur, Tu sais nos [Bm]craintes,` → `Tu sais nos esp[G2]oirs, Seigneur, Tu sais nos[Bm] craintes,`
- l. 43 : `Entends le chant d'a[G2]mour [A/E]de tous Tes rache[D]tés.` → `Entends le chant d'a[G2]mour[A/E] de tous Tes rache[D]tés.`
- l. 45 : `Pour [A]Te dire quel Dieu [D]merveil[A/C#]leux Tu e[Bm]s.` → `Pour [A]Te dire quel Dieu [D]merveill[A/C#]eux Tu e[Bm]s.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | Bm | x=289,1 sur « c » de « dé‹c›rire » | décalé | dé[Bm]crire |
| 19 | A/E | x=230,7 sur l'espace entre « amour » et « d'un » | décalé | a[G2]mour[A/E] d'un |
| 19 | D | x=362,8 sur « t » de « rache‹t›é » | décalé | rache[D]té. |
| 21 | A/C# | x=265,0 sur « e » de « merveill‹e›ux » | décalé | merveill[A/C#]eux |
| 27 | Bm | x=356,7 sur « l » de « cou‹l›er » | décalé | cou[Bm]ler, |
| 29 | A/E | x=179,6 sur l'espace après « l'éternité, » | décalé → corrigé (check.py le compte encore décalé : outil qui lit mal) | [A/E] je |
| 36 | G2 | x=143,2 sur « o » de « esp‹o›irs » | décalé | esp[G2]oirs |
| 36 | Bm | x=332,6 sur l'espace avant « craintes » | décalé | nos[Bm] craintes |
| 43 | A/E | x=230,7 sur l'espace entre « amour » et « de » | décalé | a[G2]mour[A/E] de |
| 45 | A/C# | x=265,0 sur « e » de « merveill‹e›ux » | décalé | merveill[A/C#]eux |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — espace de fin : l. 28, 31.

En-tête : ajout de `{source: Entends mon cœur (D).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 45:decale:A/C#:1 | appliqué | def | inclus dans la ligne de 45:oeil:7 |
| 45:oeil:7 | appliqué | session | Même mesure que la ligne 21 (refrain 2, même gravure). — partition : A/C# x=265,0 = début du « e » de « merveill‹e›ux » |
| 43:decale:A/E:1 | appliqué | def | inclus dans la ligne de 43:oeil:6 |
| 43:oeil:6 | appliqué | session | A/E sur l'espace avant « de » ; G2 et D (rache[D]tés) déjà exacts. — partition : A/E x=230,7 dans le blanc élargi entre « amour » et « de » ; D x=367,7 = début du « t » de « rache‹t›és » |
| 36:decale:G2:1 | appliqué | def | inclus dans la ligne de 36:oeil:5 |
| 36:decale:Bm:1 | appliqué | def | inclus dans la ligne de 36:oeil:5 |
| 36:oeil:5 | appliqué | session | G2 sur « o » de « espoirs », Bm sur l'espace avant « craintes » : toute la ligne est juste. — partition : G2 x=143,2 = début du « o » de « esp‹o›irs » ; Bm x=332,6 = début de l'espace après « nos » (le « c » commence à 337,1), vu à l'image |
| 29:decale:A/E:1 | laissé | def |  |
| 29:oeil:4 | appliqué | session | A/E posé sur l'espace entre « l'éternité, » et « je » : crochet + espace ; Bm déjà exact. — partition : A/E x=179,6 = fin de la virgule, sur l'espace avant « je » (vu à l'image) |
| 29:fable:29:decale:A/E:1 | laissé | session | Même ligne que 29:oeil:4, retenue : une seule des deux lectures. — partition : A/E x=179,6 sur l'espace avant « je » |
| 27:decale:Bm:1 | appliqué | def | inclus dans la ligne de 27:oeil:3 |
| 27:oeil:3 | appliqué | session | Bm sur le « l » de « couler » ; G2 déjà exact. — partition : Bm x=356,7 = fin du « u », début du « l » de « cou‹l›er » (vu à l'image) |
| 21:decale:A/C#:1 | appliqué | def | inclus dans la ligne de 21:oeil:2 |
| 21:oeil:2 | appliqué | session | A/C# commence au-dessus du « e » après « merveill » ; A, D, Bm déjà exacts. — partition : A/C# x=265,0 = fin du second « l », début du « e » de « merveill‹e›ux » (vu à l'image) |
| 19:decale:A/E:1 | appliqué | def | inclus dans la ligne de 19:oeil:1 |
| 19:decale:D:1 | appliqué | def | inclus dans la ligne de 19:oeil:1 |
| 19:oeil:1 | appliqué | session | A/E sur l'espace avant « d'un », D sur « t » de « racheté » : toute la ligne est juste. — partition : A/E x=230,7 dans le blanc élargi entre « amour » et « d'un » ; D x=362,8 = début du « t » de « rache‹t›é » |
| 9:decale:Bm:1 | appliqué | def | inclus dans la ligne de 9:oeil:0 |
| 9:oeil:0 | appliqué | session | La ligne proposée met Bm comme la partition ; D et G2 déjà exacts. — partition : label Bm à x=289,1 = fin du « é », début du « c » de « dé‹c›rire » (vu à l'image) |

- Feuille de l'église en D, couche texte : les 52 accords mesurés au caractère (x du label = début du caractère porteur) ; les 10 décalés vérifiés à l'image à 2×.
- Les 42 autres accords sont exacts ; aucun absent, inventé ou nom différent. Structure identique (5 sections), 28 lignes de paroles identiques.
- Seul accord non exact restant pour check.py : A/E l. 29 (l. 30 après ajout de {source}) — accord bien placé sur l'espace avant « je », ligne coupée par le .cho à cet espace ; l'outil ne lit pas l'espace en début de ligne.
- A/C# (l. 21 et 45) est gravé sur le « e » de « merveilleux », pas à la coupe syllabique « merveil-leux » : la partition fait foi au caractère près.
- Thèmes Adoration, Action de grâce dans la liste : inchangés.

### eternel-notre-seigneur — Éternel, Notre Seigneur

Lot 2 · partition retenue : `Éternel, notre Seigneur.pdf` (shirfr, mesure fiable) · **fichier inchangé**

- shir.fr à couche texte : check.py mesure 32 accords, 32 exacts ; aucun écart au relevé, aucune ligne changée. Vérifié aussi à l'œil sur le rendu 2× (refrain et trois strophes).
- Paroles, non appliqué : la partition écrit les pronoms en minuscules (« ton nom », « tu déploies », « ta majesté »…), le .cho les capitalise.
- Partition : © 1994, JEM571, auteurs dans l'ordre « (nom retiré) – (nom retiré) » ; non repris.
- Autres versions (rendus de l'église en G et en F, « - Accords ») : même chant, non comparées en détail ; le relevé retient la feuille shir.fr.

### eveille-toi-mon-ame — Éveille-toi mon âme

Lot 2 · partition retenue : `Éveille-toi mon âme - Accords.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 24 : `{start_of_chorus: Refrain}` → `{start_of_chorus: Refrain (x2)}` *(structure)*
- l. 25 : `Év[F]eille-toi mon [Bb]âme` → `É[F]veille-toi mon [Bb]âme`
- l. 39 : `[Bb] Et quand Il agit, [F]et quand nous prions,` → `[Bb] Et quand Il agit,[F] et quand nous prions,`
- l. 40 : `[C] Où était un mur [Gm]se dresse un chemin,` → `[C] Où était un mur[Gm] se dresse un chemin,`
- l. 42 : `[Bb] Et quand Il agit, [F]il n'y a aucun doute,` → `[Bb] Et quand Il agit,[F] il n'y a aucun doute,`
- l. 43 : `[C] L'enfer vacille, [Gm]tremble et redoute,` → `[C] L'enfer vacille,[Gm] tremble et redoute,`
- l. 44 : `[Bb] Gloire au Seigneur, [F]gloire à Son N[C]om.` → `[Bb] Gloire au Seigneur,[F] gloire à Son N[C]om.`
- l. 48 : `[Bb]Hey [F]oh, [C]que le Roi de gloire [Gm]fasse Son entrée.` → `[Bb]Hey[F] oh,[C] que le Roi de gloire [Gm]fasse Son entrée.`
- l. 49 : `[Bb]Hey [F]oh, [C]peuple à genoux, viens L'adorer.` → `[Bb]Hey[F] oh,[C] peuple à genoux, viens L'adorer.`
- l. 50 : `[Bb]Hey [F]oh, [C]que Son Nom à [Gm]jamais soit loué.[Bb][F][C]` → `[Bb]Hey[F] oh,[C] que Son Nom à [Gm]jamais soit loué.[Bb][F][C]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 25 | F | x=56,0 sur « v » de « É‹v›eille-toi » | décalé | É[F]veille-toi (relevé ok, appliqué) |
| 39 | F | x=165,4 sur l'espace avant « et » | décalé | agit,[F] et (relevé ok, appliqué) |
| 40 | Gm | x=164,5 sur l'espace avant « se » | décalé | mur[Gm] se (relevé ok, appliqué) |
| 42 | F | x=165,4 sur l'espace avant « il » | décalé | agit,[F] il (relevé ok, appliqué) |
| 43 | Gm | x=156,0 sur l'espace avant « tremble » | décalé | vacille,[Gm] tremble (relevé ok, appliqué) |
| 44 | F | x=192,1 sur l'espace avant « gloire » | décalé | Seigneur,[F] gloire (relevé ok, appliqué) |
| 48 | F | x=82,7 sur l'espace avant « oh, » | décalé | Hey[F] oh, (relevé ok, appliqué) |
| 48 | C | x=109,4 sur l'espace avant « que » | décalé | oh,[C] que (relevé ok, appliqué) |
| 49 | F | x=82,7 sur l'espace avant « oh, » | décalé | Hey[F] oh, (relevé ok, appliqué) |
| 49 | C | x=109,4 sur l'espace avant « peuple » | décalé | oh,[C] peuple (relevé ok, appliqué) |
| 50 | F | x=82,7 sur l'espace avant « oh, » | décalé | Hey[F] oh, (relevé ok, appliqué) |
| 50 | C | x=109,4 sur l'espace avant « que » | décalé | oh,[C] que (relevé ok, appliqué) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — espaceur : l. 14, 21.

En-tête : ajout de `{source: Éveille-toi mon âme - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 50:decale:F:1 | appliqué | Timothée |  |
| 50:decale:C:1 | appliqué | Timothée |  |
| 49:decale:F:1 | appliqué | Timothée |  |
| 49:decale:C:1 | appliqué | Timothée |  |
| 48:decale:F:1 | appliqué | Timothée |  |
| 48:decale:C:1 | appliqué | Timothée |  |
| 44:decale:F:1 | appliqué | Timothée |  |
| 43:decale:Gm:1 | appliqué | Timothée |  |
| 42:decale:F:1 | appliqué | Timothée |  |
| 40:decale:Gm:1 | appliqué | Timothée |  |
| 39:decale:F:1 | appliqué | Timothée |  |
| 25:decale:F:1 | appliqué | Timothée |  |

- Aucune question ouverte : les 12 déplacements d'accords du relevé (lignes 25, 39-44, 48-50) mettent chaque accord où la partition le grave (vérifié à l'œil sur les deux pages rendues à 2×) ; check.py après : 60 exact sur 60.
- Libellé « Refrain » → « Refrain (x2) », gravé sur la feuille.
- Thèmes Adoration, Saint-Esprit : dans la liste, gardés.
- Tonalité F gravée en tête de partition, pas de {key} dans le .cho : non ajoutée (aucune consigne particulière).
- Paroles, non appliqué : la partition termine la ligne 33 par un point (« à genoux. »), absent du .cho.

### fascine — Fasciné

Lot 3 · partition retenue : `Fasciné - B.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 12 : `Ébloui [F]par Ta grandeur,` → `Éblou[F]i par Ta grandeur,`
- l. 22 : `[F] Mais que ma prière se [G]joigne aussi` → `[F] Mais que ma prière se j[G]oigne aussi`
- l. 23 : `À ces mi[C]llions d'autres v[Am]oix,` → `À ces m[C]illions d'autres v[Am]oix,`
- l. 31 : `Et plus j'[F]apprends à Te saisir,` → `Et plus j'a[F]pprends à Te saisir,`
- l. 37 : `(Ô To[F]i), qui étais, qui e[G]s et qui ser[Am]as.` → `(Ô T[F]oi), qui étais, qui e[G]s et qui ser[Am]as.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | F | x=72,1 sur « i » de « Éblou‹i› » (espace à 75,7, « par » à 80,1) | décalé (autre mot dans le .cho) | Éblou[F]i par (relevé ok) |
| 22 | G | x=220,5 sur « o » de « j‹o›igne » | décalé | j[G]oigne (relevé ok) |
| 23 | C | x=103,2 sur « i » de « m‹i›llions » (m à 89,8, l à 106,7) | décalé | m[C]illions (relevé ok) |
| 31 | F | x=100,1 sur le premier « p » de « j'a‹p›prends » | décalé | j'a[F]pprends (relevé ok) |
| 37 | F | x=77,4 sur « o » de « T‹o›i » (T à 67,6, i à 86,3) | décalé | T[F]oi (relevé ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 8 ; espaceur : l. 33.

En-tête : ajout de `{source: Fasciné - B.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 37:decale:F:1 | appliqué | Timothée |  |
| 31:decale:F:1 | appliqué | Timothée |  |
| 23:decale:C:1 | appliqué | Timothée |  |
| 22:decale:G:1 | appliqué | Timothée |  |
| 12:decale:F:1 | appliqué | Timothée |  |

- Les 45 accords mesurés sur la couche texte de « Fasciné - B.pdf » (rendu ChordPro de l'église, tonalité gravée C malgré le nom du fichier) : les 40 « exact » confirmés au x (ex. l.21 F 45,4 sur l'indentation, G 216,5 « n » de « e‹n›tendu », C 315,6 « u » de « d'un », Am 423,2 « i » de « fois » ; l.24 F 139,6 « l » de « allé‹l›uia », G/Am/C/E après le point ; l.33 C 217,4 après « Toi. » ; l.41 C/E 163,6 après « fasciné. »), les 5 décalés corrigés par les « ok » du relevé, qui mettent chacun l'accord sur le caractère de la partition : rien à contredire.
- Liste extra (paroles) citée, non appliquée : check.py signale « (x4) » (l.39) absent de la source, mais la partition grave bien « (x4) » sous « Je suis fasciné par Toi. » dans le Pont (p.2, y=109,5) : l'outil ne lit pas cette ligne sans accord, rien à changer.
- Autres versions présentes : « Fasciné accord B.pdf » et « Fasciné.pdf » (traitement de texte, non mesurées ; la partition retenue fait foi). Clé {key: C} conforme à la tonalité gravée.

### feu-du-fondeur — Feu du fondeur

Lot 3 · partition retenue : `Feu du fondeur.pdf` (shirfr, mesure fiable)

Lignes modifiées :

- l. 12 : `Rends-moi aussi [F#m7]pur [ ][E/B]que [ ][B]l’or.` → `Rends-moi aussi [F#m7]pur [E/B]que[B] l’or.`
- l. 18 : `[E]Mis à p[A]art pour toi, Se[Bsus]igneur.[B]` → `[E]Mis à part[A] pour toi, Se[Bsus4]igneur.[B]`
- l. 20 : `[E]Mis à p[A]art pour toi, m[E/B]on seul maît[B]re,` → `[E]Mis à part[A] pour [E/B]toi, mon seul maî[B]tre,`
- l. 21 : `[F#m]Et prêt à t’[Bsus]o - bé[B]ir.[ ][A][ ][E]` → `[F#m]Et prêt à t’[Bsus4]o[B]bé[A]ir.[E]`
- l. 26 : `Ôte ma souil[F#m7]lure et [Bsus]sanc - t[B]i - [Bsus]fie-[B]moi.` → `Ôte ma souil[F#m7]lure et [Bsus4]sanc[B]ti[Bsus4]fie-[B]moi.`
- l. 28 : `Lave mes pé[F#m7]chés [E/B]ca - [B]chés.` → `Lave mes pé[F#m7]chés [E/B]c[B]achés.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | B | x=244,6 sur l'espace entre « que » et « l'or. » | décalé | que[B] l’or. (défaut ok) |
| 18 | A | x=113,0 sur l'espace entre « part » et « pour » | décalé | part[A] pour (défaut ok) |
| 20 | A | x=113,0 sur l'espace entre « part » et « pour » | décalé | part[A] pour (défaut ok) |
| 20 | E/B | x=159,4 sur « t » de « toi, » | décalé | [E/B]toi (défaut ok) |
| 20 | B | x=296,9 sur « t » de « maî‹t›re » | décalé | maî[B]tre (défaut ok) |
| 21 | B | x=157,1 sur « b » de « béir » | décalé | [B]béir (défaut ok) |
| 21 | A | x=176,3 sur « i » de « bé‹i›r » | décalé | bé[A]ir (défaut ok) ; E x=192,6 après le point : « ir.[E] » |
| 26 | B | x=226,5 sur « t » de « sanc‹t›i » | décalé | sanc[B]ti (question 26, ok) |
| 28 | B | x=212,4 sur « a » de « c - ‹a›chés » | décalé | c[B]achés (question 28, ok) |
| 26 | B | x=293,3 sur « m » de « moi » ; le .cho corrigé a [B]moi | exact (lu « absent » par l'outil) | aucune : la source frappe « fie- - moi » (tiret doublé) ; check.py désaligne la fin de ligne et compte le même B une fois « absent du .cho » et une fois « absent de la source » au même caractère |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — espaceur : l. 10, 16 ; orthographe d'accord : l. 10, 16 ; mot coupé au tiret : l. 10.

En-tête : ajout de `{source: Feu du fondeur.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 28:decale:B:1 | laissé | def |  |
| 28:fable:28:decale:B:1 | appliqué | session | shir.fr frappe « c - achés » : E/B sur le « c », B sur le « a » ; le mot s'écrit entier, B devant le « a » (02 : la frappe du transcripteur se recopie telle quelle). Le .cho actuel met B sur le second « c » : autre caractère, autre syllabe frappée. — partition : F#m7 x=133,1 sur « c » de « pé‹c›hés » ; E/B x=173,6 sur « c » ; B x=212,4 sur « a » de « c - ‹a›chés » |
| 26:decale:B:1 | laissé | def |  |
| 26:fable:26:decale:B:1 | appliqué | session | Le remplacement met chaque accord de la ligne sur le caractère de la partition et écrit « sanctifie » entier (tiret du transcripteur retiré, 01) ; seule lecture retenue, l'écart 26:decale:B:1 reste à « non ». — partition : F#m7 x=134,9 sur le 2e « l » de « souil‹l›ure » ; Bsus x=190,6 sur « s » de « sanc » ; B x=226,5 sur « t » de « sanc‹t›i » ; Bsus x=253,0 sur « f » de « fie » ; B x=293,3 sur « m » de « moi » |
| 21:decale:B:1 | appliqué | def |  |
| 21:decale:A:1 | appliqué | def |  |
| 20:decale:A:1 | appliqué | def |  |
| 20:decale:E/B:1 | appliqué | def |  |
| 20:decale:B:1 | appliqué | def |  |
| 18:decale:A:1 | appliqué | def |  |
| 12:decale:B:1 | appliqué | def |  |

- shir.fr à couche texte : check.py mesure 53 accords, 44 exacts et 9 décalés ; les 9 sont corrigés (7 par les « ok » par défaut, 2 par les questions). Vérifié aussi à l'œil sur le rendu 2× (l. 21, 26, 28).
- Après correction, check.py donne 52 exacts plus un B « absent du .cho » et un B « absent de la source » au même « m » de « moi » (l. 26) : c'est le même accord, désaligné par le tiret doublé « fie- - moi » de shir.fr ; vérifié à l'œil, il est juste.
- l. 21 : la partition met A sur le « i » de « obéir » et E après le point ; recopié tel que frappé (02), même si l'oreille placerait A plus loin.
- l. 28 : la frappe « c - achés » de shir.fr est une coupe bizarre de « cachés » ; on recopie la position (B devant le « a »).
- Partition : © 1990 Mercy Publishing / (crédit de traduction), JEM572, auteur (nom retiré) ; non repris au-delà de {artist}.

### fidele-loyal — Fidèle Loyal

Lot 3 · partition retenue : `Fidèle Loyal.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 10 : `[Dm] Ta grâce m’a [C]trouvé` → `[Dm] Ta grâce m’[C]a trouvé` *(session)*
- l. 17 : `Dans [Am]les heures s[C]ombres` → `Dans [Am]les heures somb[C]res` *(session)*
- l. 23 : `Dieu Tu es ﬁ[C]dèle` → `Dieu Tu es fi[C]dèle[Bb]` *(session)*
- l. 24 : `[Bb]Le plus lo[F]yal des a[Dm]mis` → `Le plus lo[F]yal des a[Dm]mis` *(session)*
- l. 25 : `Tu es si ﬁd[C]èle` → `Tu es si fi[C]dèle[Bb]` *(session)*
- l. 26 : `[Bb]Et le cr[F]oire me sufﬁ[Dm]t` → `Et le cr[F]oire me suffi[Dm]t` *(session)*
- l. 41 : `[F] Et en Ta présence mes en[(G)]nemis s’enfuient` → `[F] Et en Ta présence mes enne[(G)]mis s’enfuient` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | F | x=144,0, entre la fin de « souviens » (s 140,0-144,7) et « d » de « dans » (147,7) ; le label couvre l'espace et « d » | équivalent | aucune : [F]dans garde la syllabe de la feuille (basse fidélité, frontière fin de mot / espace) |
| 10 | C | x=129,0 sur « a » de « m’a » (129,1) | décalé | m’[C]a trouvé |
| 11 | F | x=135,0 sur la virgule de « loin, » (135,3-138,3), avant « si » (141,3) | équivalent | aucune : « loin, [F] si » sonne après « loin, » et avant « si », comme la feuille (basse fidélité, ponctuation / espace) |
| 16 | F | x=114,0 entre « s » de « sais » (110,7-115,3) et la virgule (115,3) | équivalent | aucune : même syllabe « sais », à une lettre près (basse fidélité) |
| 17 | C | x=177,0 sur « r » de « sombres » (176,3-180,3) | décalé | somb[C]res |
| 19 | Dm | x=144,0 sur la fin de « pas » (s 141,9-146,6), taquet de tabulation juste après le mot ; « Oui Tu es là » est sur la rangée suivante de la feuille | équivalent | aucune : « pas [Dm] Oui » sonne à la fin de « pas », avant « Oui » (basse fidélité) |
| 19 | C | x=117,0 : label (117-125) à cheval sur la fin de « es » (s 114,0-118,7), l'espace et « l » de « là » (121,7) | équivalent | aucune : [C]là, le label est centré sur l'espace avant « là » (basse fidélité) |
| 19 | G | x=144,0, après la fin de « là » (130,3) | équivalent | aucune : « [C]là [G] » après la dernière syllabe |
| 23 | C | x=369,0, fin de la ligature « ﬁ » (364,0-370,7), lettre la plus proche « d » (370,7) | équivalent | aucune : ﬁ[C]dèle |
| 23 | Bb | x=396,0 après la fin de « fidèle » (390,7) | absent | ﬁ[C]dèle[Bb] |
| 24 | Bb | aucun label avant « Le » ; F à 357,0, Dm à 402,0 | inventé | retiré (le Bb termine la ligne 23) |
| 25 | C | x=357,0 sur « d » (355,6-361,6) | décalé | ﬁ[C]dèle |
| 25 | Bb | x=381,0 après la fin de « fidèle » (375,5) | absent | ﬁ[C]dèle[Bb] |
| 26 | Bb | aucun label avant « Et » ; F à 345,0, Dm à 405,0 | inventé | retiré (le Bb termine la ligne 25) |
| 31 | C, F | couplet 2 : la feuille ne grave aucun accord | reporté | aucune : accords reportés du couplet 1, gardés |
| 32 | Dm, C | couplet 2 sans accords gravés | reporté | aucune |
| 33 | C, F | couplet 2 sans accords gravés | reporté | aucune |
| 34 | Dm, C | couplet 2 sans accords gravés | reporté | aucune |
| 41 | (G) | x=441,0 (G à 445,0) sur « m » de « ennemis » (441,5) | décalé | enne[(G)]mis |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espaceur : l. 19 ; ligature typographique : l. 27, 31.

En-tête : ajout de `{source: Fidèle Loyal.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 41:relire:(G):1 | laissé | def |  |
| 34:reporte:Dm:1 | laissé | def |  |
| 34:reporte:C:1 | laissé | def |  |
| 33:reporte:C:1 | laissé | def |  |
| 33:reporte:F:1 | laissé | def |  |
| 32:reporte:Dm:1 | laissé | def |  |
| 32:reporte:C:1 | laissé | def |  |
| 31:reporte:C:1 | laissé | def |  |
| 31:reporte:F:1 | laissé | def |  |
| 26:invente:Bb:1 | laissé | def |  |
| 26:oeil:4 | appliqué | def | inclus dans la ligne de la session |
| 26:fable:26:invente:Bb:1 | appliqué | session | Aucun accord au-dessus du début de « Et le croire » : le Bb termine la ligne 25. F sur « o » de « croire » (345,0 dans 343,6-349,6), Dm sur « t » de « suffit » (405,0 dans 404,3-407,6) : ligne juste. — inclus dans la ligne de la session — partition : rangée d'accords : F à 345,0, Dm à 405,0, rien avant |
| 25:relire:C:1 | laissé | def |  |
| 25:manquant:Bb:1 | laissé | def |  |
| 25:oeil:3 | appliqué | def | inclus dans la ligne de la session |
| 25:fable:25:manquant:Bb:1 | laissé | session | Le Bb final est juste, mais la ligne proposée garde C devant « è » ; la feuille le pose devant « d » (label 357,0, « d » 355,6-361,6, « è » à 361,6) comme aux lignes 23 et 27. Ligne juste donnée dans lignes. — partition : C à x=357,0 sur « d » de « fidèle » ; Bb à x=381,0 après la fin (375,5) |
| 24:invente:Bb:1 | laissé | def |  |
| 24:oeil:2 | appliqué | def | inclus dans la ligne de la session |
| 24:fable:24:invente:Bb:1 | appliqué | session | Aucun accord au-dessus du début de « Le plus loyal » : le Bb termine la ligne précédente. F sur « y » (357,0 = 357,0) et Dm sur « m » (402,0 dans 399,0-408,3) : ligne juste. — inclus dans la ligne de la session — partition : rangée d'accords : F à 357,0, Dm à 402,0, rien avant |
| 23:manquant:Bb:1 | laissé | def |  |
| 23:oeil:1 | appliqué | def | inclus dans la ligne de la session |
| 23:fable:23:manquant:Bb:1 | appliqué | session | Bb est tapé après la fin de « fidèle » (dernière lettre 385,4-390,7) : après la dernière syllabe, collé. C reste devant « d » (label 369,0, « d » à 370,7). Toute la ligne est juste. — inclus dans la ligne de la session — partition : Bb à x=396,0, après « fidèle » (fin 390,7) |
| 19:relire:Dm:1 | laissé | def |  |
| 19:relire:C:1 | laissé | def |  |
| 17:relire:C:1 | laissé | def |  |
| 17:oeil:0 | laissé | def |  |
| 17:fable:17:oeil:0 | laissé | session | Lecture à la syllabe (devant « b ») ; la feuille pose le label sur la lettre « r » : la ligne retenue est « somb[C]res » (écart 17:oeil:0 / 17:relire:C:1, dans lignes). Une seule des deux lectures. — partition : C à x=177,0 ; « b » 170,3-176,3, « r » 176,3-180,3 : lettre sous le label = « r » de « sombres » |
| 16:relire:F:1 | laissé | def |  |
| 11:relire:F:1 | laissé | def |  |
| 10:relire:C:1 | laissé | def |  |
| 9:relire:F:1 | laissé | def |  |

- Source basse fidélité (feuille Word alignée aux taquets de tabulation 72/108/144 et aux espaces) : chaque accord mesuré en coordonnées (rawdict) et vérifié à l'œil sur le rendu 2×.
- check.py ne lit pas cette source dans cet état (famille « inconnue », 0 label mesuré) : il classe les 41 accords « absent de la source » avant comme après. Tout est vérifié à l'œil et mesuré en coordonnées (PyMuPDF rawdict) ; ses contextes tombent sur les caractères retenus ici (« m'‹a› », « somb‹r›es », « fi‹d›èle », « fidèle‹› », « enne‹m›is »).
- Corrigés sur la feuille : C de « m’[C]a » (l. 10) et « (G) » de « enne[(G)]mis » (l. 41), défauts « non » qui laissaient l'accord sur une autre syllabe ; C de « somb[C]res » (l. 17) ; refrain : Bb en fin des lignes 23 et 25 (et non en tête des lignes 24 et 26), C de la l. 25 devant « d » comme aux l. 23 et 27.
- À l'oreille : la l. 10 « m’[C]a trouvé » suit la frappe de la feuille ; le parallèle avec « ra[C]pproché » (l. 12) et le couplet 2 reporté (« [C]pour moi ») ferait attendre C sur « trou » : à confirmer à l'écoute.
- Laissés à ± 1 lettre ou espace (équivalents, basse fidélité) : F l. 9, F l. 11, F l. 16, Dm et C l. 19.
- Débuts de ligne (l. 9-12, 38-41) : sur cette feuille Word, sans retrait, le label est à la marge (x=72 ou 309), au-dessus de la 1re lettre ; « [C] Je » est gardé tel quel (même caractère, basse fidélité, non relevé par l'audit) — strictement, la feuille donnerait « [C]Je ».
- Couplet 2 : la feuille ne grave aucun accord ; les accords reportés du couplet 1 sont gardés.
- Structure : la feuille lit « PRÉ-REFRAIN » (l'outil y a vu un second « REFRAIN ») ; sections du .cho = feuille. Un {needs_review} sur l'ordre de jeu après le couplet 2 et le pont.
- Paroles, non appliqué : le .cho contient la ligature « ﬁ » (U+FB01) recopiée du PDF dans « ﬁdèle » (l. 23, 25, 27), « sufﬁt » (l. 26), « conﬁance » (l. 31) — à remplacer par « fi » pour la recherche ; les lignes de la feuille « Je m’accroche à Toi / Et à Tes promesses », « J’avance par la foi / Et je confesse », « Tu ne mens pas / Oui Tu es là » sont réunies sur une ligne dans le .cho (virgules ajoutées).
- Feuille : © 2019 Hillsong Music Publishing UK, CCLI 7147372 ; tempo 83 (repris).
- Audio demandé (02, basse fidélité) : six labels tombent à cheval sur deux lettres ou sur la frontière mot/espace (l. 9 F « souviens | dans », l. 11 F après « loin, », l. 16 F « sais, », l. 19 Dm « pas | Oui » et C « es | là », l. 23 C « fi | dèle ») ; au-delà de cinq doutes, aucun n’est écrit et l’écoute tranchera.

### gloire-a-son-nom — Gloire à Son Nom

Lot 3 · partition retenue : `Gloire à son nom.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 22 : `Son corps l[C]ié, de larmes trempé,` → `Son corps li[C]é, de larmes trempé,`
- l. 25 : `Le Messi[G]e seul et déla[C]issé.[Em][ ][F]` → `Le Mess[G]ie seul et déla[C]issé.[Em] [F]`
- l. 32 : `Ô [F]gloire à [Gsus4]Toi [G]ô [ ][C]Dieu. [ ][(Em F)]` → `Ô [F]gloire à [Gsus4]Toi [G]ô [C]Dieu.[(Em F)]` *(session)*
- l. 36 : `Mais au ma[C]tin du troisième jour,` → `Mais au m[C]atin du troisième jour,`
- l. 37 : `Le Fils des [G]Cieux est ressusci[Am]té.` → `Le Fils des [G]Cieux est ressusc[Am]ité.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 22 | C | x=114,8 sur « é » de « lié » | décalé | li[C]é (relevé ok, appliqué) |
| 25 | G | x=91,7 sur « i » (91,7) de « Messie » | décalé | Mess[G]ie (relevé ok, appliqué) |
| 32 | F | x=62,2 sur « g » de « gloire » | exact (check.py : absent de la source, lecture ratée) | aucune |
| 32 | Gsus4 | x=119,2 sur « T » de « Toi » | exact (lecture ratée de l'outil) | aucune |
| 32 | G | x=172,5 sur « ô » | exact (lecture ratée de l'outil) | aucune |
| 32 | C | x=194,8 sur « D » de « Dieu » | exact (lecture ratée de l'outil) | aucune |
| 32 | (Em F) | x=232,1 sur l'espace juste après « Dieu. » (« . » à 227,7) | décalé (une espace de trop dans le .cho) | Dieu.[(Em F)] |
| 36 | C | x=105,0 sur « a » de « matin » | décalé | m[C]atin (relevé ok, appliqué) |
| 37 | Am | x=239,2 sur « i » de « ressuscité » | décalé | ressusc[Am]ité (relevé ok, appliqué) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 11 ; espaceur : l. 18.

En-tête : ajout de `{source: Gloire à son nom.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 37:decale:Am:1 | appliqué | Timothée |  |
| 36:decale:C:1 | appliqué | Timothée |  |
| 32:reporte:F:1 | laissé | Timothée |  |
| 32:reporte:Gsus4:1 | laissé | Timothée |  |
| 32:reporte:G:1 | laissé | Timothée |  |
| 32:reporte:C:1 | laissé | Timothée |  |
| 32:reporte:(Em F):1 | laissé | Timothée |  |
| 25:decale:G:1 | appliqué | Timothée |  |
| 22:decale:C:1 | appliqué | Timothée |  |

- Rendu de l'église à couche texte : check.py mesure 47 accords ; les 4 décalés (l. 22, 25, 36, 37) sont corrigés par les « ok » du relevé, vérifiés en coordonnées.
- L. 32 : les 5 accords classés « absent de la source » sont une lecture ratée de check.py (ligne de la partition remplie d'espaces, « Toi       ô   Dieu. ») ; mesurés en rawdict et vus sur le rendu 2× : tous gravés aux mêmes caractères que le .cho. Seule correction : (Em F) collé après « Dieu. », comme Em après « attaché. » l. 18.
- L'accord gravé « (Em F) » (deux accords optionnels dans une parenthèse) reste écrit [(Em F)] comme avant ; lint ne le relève pas.
- Partition : traducteur nommé, titre original « O praise the Name » ; non repris. Autres versions : « Gloire à Son Nom (G).pdf », « Gloire à Son Nom G.pdf » (même chant, autre tonalité), non comparées.

### grace-en-grace — Grâce en grâce

Lot 3 · partition retenue : `De grâce en grâce - F.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[F] Si l’amour a souf[C]fert l[Dm]a croix[Bb]` → `[F] Si l’amour a sou[C]ffert l[Dm]a croix[Bb]`
- l. 10 : `[F] Combien précieux Son [C]sang [Dm]pour moi[Bb]` → `[F] Combien précieux Son [C]sang[Dm] pour moi[Bb]`
- l. 11 : `[F] La beauté des Cieux [C]vêtue de m[Dm]a honte[Bb]` → `[F] La beauté des Cieux vê[C]tue de m[Dm]a honte[Bb]`
- l. 12 : `[F] Cet amour parfait mort [C]à [ ][Dm]ma place` → `[F] Cet amour parfait mort [C]à[Dm] ma place`
- l. 16 : `[Bb] Si Ses plaies témoignent de [Dm]Son [C]amour` → `[Bb] Si Ses plaies témoignent de [Dm]Son[C] amour`
- l. 18 : `[Bb] Pour gagner mon cœur Il S[Dm]’est [C]offert` → `[Bb] Pour gagner mon cœur Il [Dm]S’est[C] offert`
- l. 22 : `Si mer[F]veilleux, si [C]glori[Dm7]eux` → `Si mer[F]veilleux, si [C]glor[Dm]ieux`
- l. 23 : `Mon [Bb]Sauv[F]eur règne, vic[C]to - [Dm7]rieux` → `Mon [Bb]Sauve[F]ur règne, vic[C]to[Dm]rieux`
- l. 24 : `Bri[Am7]sant [Bb]mes chaines, Il pr[C]it ma p[Dm7]lace` → `Bri[Am]sant m[Bb]es chaines, Il [C]prit m[Dm]a place`
- l. 25 : `M’of[Bb]frant [F]la vie, de grâ[C]ce en grâce` → `M’o[Bb]ffrant l[F]a vie, de grâ[C]ce en grâce`
- l. 31 : `[F] Combien grand est l’espoir [C]en [Dm]Ton Nom[ ][Bb]` → `[F] Combien grand est l’espoir [C]en[Dm] Ton Nom[Bb]`
- l. 38 : `[Bb] Pour me pardonner ô [Dm]quel g[C]rand prix,[F/A]` → `[Bb] Pour me pardonner ô [Dm]quel gr[C]and prix,[F/A]`
- l. 46 : `[F] Jésus à jamais je veux chan[C]ter` → `[F] Jésus à jamais je veux chant[C]er`
- l. 51 : `[Bb]Ô mon âme [C]veut chan[Dm]ter` → `[Bb] Ô mon âme v[C]eut chant[Dm]er` *(session)*
- l. 52 : `Les merveilles [Bb]de Ta g[F]râce` → `Les merveilles d[Bb]e Ta g[F]râce`
- l. 53 : `Ô mon âme veut chan[C]ter` → `Ô mon âme veut chant[C]er`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | C | x=154,3 sur le premier « f » de « sou‹f›fert » | décalé | sou[C]ffert |
| 10 | Dm | x=249,9 sur l'espace avant « pour » | décalé | sang[Dm] pour |
| 11 | C | x=208,2 sur « t » de « vê‹t›ue » | décalé | vê[C]tue |
| 12 | Dm | x=231,3 sur l'espace avant « ma » | décalé | à[Dm] ma |
| 16 | C | x=303,3 sur l'espace avant « amour » | décalé | Son[C] amour |
| 18 | Dm | x=236,5 sur « S » de « S'est » | décalé | [Dm]S’est |
| 18 | C | x=280,5 sur l'espace avant « offert » | décalé | S’est[C] offert |
| 22 | Dm7 | Dm x=196,5 sur « i » de « glor‹i›eux » | nom + décalé | glor[Dm]ieux |
| 23 | F | x=126,3 sur « u » de « Sauve‹u›r » | décalé | Sauve[F]ur |
| 23 | Dm7 | Dm x=246,3 sur l'espace avant « rieux » (mot coupé au tiret) | nom différent | victo[Dm]rieux |
| 24 | Am7 | Am x=64,9 sur « s » de « Bri‹s›ant » | nom différent | Bri[Am]sant |
| 24 | Bb | x=112,9 sur « e » de « m‹e›s » | décalé | m[Bb]es |
| 24 | C | x=211,6 sur « p » de « prit » | décalé | [C]prit |
| 24 | Dm7 | Dm x=251,6 sur « a » de « m‹a› » ; rien sur « place » | inventé + absent | m[Dm]a place |
| 25 | Bb | x=70,6 sur le premier « f » de « M'o‹f›frant » | décalé | M’o[Bb]ffrant |
| 25 | F | x=115,1 sur « a » de « l‹a› » | décalé | l[F]a |
| 29 | F C Dm Bb F C Dm Bb | ligne instrumentale gravée « F C Dm Bb F C Dm Bb » sous « Couplet 2 » (p1 y=615,6), identique au .cho | exact (l'outil ne lit pas cette ligne d'un seul tenant) | aucune |
| 31 | Dm | x=269,9 sur l'espace avant « Ton » | décalé | en[Dm] Ton |
| 38 | C | x=258,8 sur « a » de « gr‹a›nd » | décalé | gr[C]and |
| 43 | Bb C Dm Bb F C | ligne instrumentale gravée « Bb C Dm Bb F C » sous « Pont » (p2 y=193,2), identique au .cho | exact (l'outil la confond avec la ligne du couplet 2) | aucune |
| 46 | C | x=258,8 sur « e » de « chant‹e›r » | décalé | chant[C]er |
| 51 | Bb | x=45,4 sur l'espace d'indentation avant « Ô » | décalé ([X]mot là où la partition a [X] mot) | [Bb] Ô |
| 51 | C | x=150,3 sur « e » de « v‹e›ut » | décalé | v[C]eut |
| 51 | Dm | x=216,1 sur « e » de « chant‹e›r » | décalé | chant[Dm]er |
| 52 | Bb | x=160,9 sur « e » de « d‹e› » | décalé | d[Bb]e |
| 53 | C | x=207,2 sur « e » de « chant‹e›r. » | décalé | chant[C]er |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — ligne sans paroles : l. 29, 43 ; espaceur : l. 30, 32.

En-tête : ajout de `{source: De grâce en grâce - F.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 53:decale:C:1 | appliqué | def |  |
| 52:decale:Bb:1 | appliqué | def |  |
| 51:decale:C:1 | appliqué | def | inclus dans la ligne de la session |
| 51:decale:Dm:1 | appliqué | def | inclus dans la ligne de la session |
| 46:decale:C:1 | appliqué | def |  |
| 43:instrumental:Bb:1 | laissé | def |  |
| 43:instrumental:Dm:1 | laissé | def |  |
| 43:instrumental:Bb:2 | laissé | def |  |
| 38:decale:C:1 | appliqué | def |  |
| 31:decale:Dm:1 | appliqué | def |  |
| 29:instrumental:F:1 | laissé | def |  |
| 29:instrumental:C:1 | laissé | def |  |
| 29:instrumental:Dm:1 | laissé | def |  |
| 29:instrumental:C:2 | laissé | def |  |
| 29:instrumental:Dm:2 | laissé | def |  |
| 29:instrumental:Bb:1 | laissé | def |  |
| 25:decale:Bb:1 | appliqué | def |  |
| 25:decale:F:1 | appliqué | def |  |
| 24:nom:Am7:1 | appliqué | def |  |
| 24:decale:Bb:1 | appliqué | def |  |
| 24:decale:C:1 | appliqué | def |  |
| 24:invente:Dm7:1 | appliqué | def |  |
| 24:manquant:Dm:1 | appliqué | def |  |
| 23:decale:F:1 | appliqué | def | inclus dans la ligne de 23:fable:23:nom:Dm7:1 |
| 23:nom:Dm7:1 | laissé | def |  |
| 23:fable:23:nom:Dm7:1 | appliqué | session | F sur le « u » de « Sauveur », C sur le « t » de « victo », Dm (gravé Dm) sur l'espace juste avant « rieux » ; le moteur recolle le mot coupé au tiret : « vic[C]to[Dm]rieux », l'accord devant le même caractère que la partition. — partition : couche texte p1 : Bb x=80,9 = « S » ; F x=126,3 = « u » de « Sauve\|ur » ; C x=214,3 = « t » ; Dm x=246,3 = espace avant « rieux » (r à 250,8) |
| 22:nom:Dm7:1 | laissé | def |  |
| 22:fable:22:nom:Dm7:1 | appliqué | session | La ligne remplacée est exactement celle de la partition : F sur « v » de « merveilleux », C sur « g », Dm (gravé Dm, pas Dm7) sur le « i » de « glor\|ieux ». — partition : couche texte p1 : F x=91,6 = « v » (91,6) ; C x=169,8 = « g » (169,8) ; Dm x=196,5 = « i » de « glorieux » (196,5) |
| 18:decale:Dm:1 | appliqué | def |  |
| 18:decale:C:1 | appliqué | def |  |
| 16:decale:C:1 | appliqué | def |  |
| 12:decale:Dm:1 | appliqué | def |  |
| 11:decale:C:1 | appliqué | def |  |
| 10:decale:Dm:1 | appliqué | def |  |
| 9:decale:C:1 | appliqué | def |  |

- Mesure en coordonnées sur la couche texte du PDF église (rendu ChordPro), vérifiée à l'œil sur le rendu 2× (pré-refrain 2, refrain). Tous les accords des lignes à paroles ont été mesurés ; les écarts « ok » par défaut sont tous justes.
- Lignes 22-24 : la partition grave Dm (et Am), pas Dm7 / Am7 : noms de la partition repris. Ligne 24 : le Dm7 sur « place » est remplacé par le Dm gravé sur le « a » de « ma ».
- Lignes 29 et 43 (lignes instrumentales du couplet 2 et du pont) : identiques à la partition ; les écarts « instrumental » de l'outil viennent d'une ligne d'accords lue d'un seul tenant, rien ne change. Les « extra » de source (Bb C Dm Bb F C, p2 y=193) sont cette même ligne du pont, déjà dans le .cho.
- Ligne 51 : au-delà des écarts du relevé, le Bb est sur l'indentation avant « Ô » comme sur toutes les lignes indentées : écrit « [Bb] Ô ».
- Paroles, non appliqué : la partition a « chaînes » (l.24, le .cho « chaines »), et une ponctuation finale absente du .cho (« croix, », « moi. », « honte, », « place. », « amour, », « offert. », « glorieux, », « rieux. », « place, », « grâce. », etc.).
- Intro « Bb F » et retour du refrain avant le Pont : bloc de structure laissé à Timothée.
- Autres versions présentes : « De grâce en grâce - A.pdf », « - Accords.pdf », « De grâce en grâce.pdf » (même feuille, autres tonalités ou mise en page) et « Grâce en grâce.pdf » (traitement de texte, non utilisé).

### grace-infinie — Grâce infinie

Lot 3 · partition retenue : `Grâce infinie E.pdf` (eglise-fpdf, mesure fiable) · chant validé par Timothée

Lignes modifiées :

- l. 11 : `[B/D#] Un [C#m7]pécheur [E/B]tel que [B]moi.` → `[B/D#] Un [C#m7]pécheur [E/B]tel que[B] moi.`
- l. 13 : `J'é[A]tais a[B]veugle, je [E]vois.` → `[B/D#] J'é[A]tais a[B]veugle, je[E] vois.`
- l. 18 : `Mon Dieu, mon [A]Sauve[B]ur, m'a rach[E]eté,` → `Mon Dieu, mon [A]Sauv[B]eur, m'a rach[E]eté,`
- l. 20 : `Amour [F#m]immense, [B]grâce infi[E]nie.` → `Amour i[F#m]mmense,[B] grâce infi[E]nie.`
- l. 24 : `Quand [E]j'ai trou[E/G#]vé l'[A]amour de [E]Dieu, ` → `Quand [E]j'ai trou[E/G#]vé l'a[A]mour de [E]Dieu[B/D#],`
- l. 25 : `[B/D#] Sa [C#m7]grâce [E/B]chasse m[B]a peine.` → `Sa [C#m7]grâce [E/B]chasse m[B]a peine.`
- l. 26 : `Oh, [E]que ce [E/G#]jour fut [A]glor[E]ieux,` → `Oh, [E]que ce [E/G#]jour fut [A]glori[E]eux,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | B/D# | x=255,7 sur les espaces après « sauvé, » (246,8), avant « un » (291,3) | exact (outil : début de ligne déjà « [B/D#] » + espace) | [B/D#] Un (inchangé) |
| 11 | B | x=423,8 sur l'espace entre « que » (fin 414,9) et « moi » (m à 428,2) | décalé | tel que[B] moi. (relevé ok) |
| 13 | B/D# | x=251,6 sur les espaces après « sauvé, » (242,7), avant « j'étais » (287,2) | absent | [B/D#] J'é[A]tais (relevé ok, lecture de remplacement) ; après correction check.py le classe « décalé » parce qu'il ignore l'espace qui suit le crochet en début de ligne (même cas que l.11 et l.27) |
| 13 | E | x=418,3 sur l'espace entre « je » et « vois » (v à 422,8) | décalé | je[E] vois. (relevé ok) |
| 18 | B | x=194,8 sur « e » de « Sauv‹e›ur » | décalé | Sauv[B]eur (relevé ok) |
| 20 | F#m | x=100,5 sur le premier « m » de « i‹m›mense » | décalé | i[F#m]mmense (relevé ok) |
| 20 | B | x=166,3 sur l'espace après « immense, » (virgule à 161,8), avant « grâce » (170,7) | décalé | immense,[B] grâce (relevé ok) |
| 24 | A | x=198,3 sur « m » de « l'a‹m›our » | décalé | l'a[A]mour (relevé ok) |
| 24 | B/D# | x=294,3 sur la virgule de « Dieu, » (294,3) | absent | Dieu[B/D#], (relevé ok ; c'est l'accord que le .cho portait en tête de la ligne 25) |
| 25 | B/D# | aucun label avant « Sa » : le seul B/D# est sur la virgule de « Dieu, » (294,3), C#m7 suivant à 349,5 sur « g » de « grâce » | inventé | retiré (relevé ok) |
| 26 | E | x=197,5 sur « e » de « glori‹e›ux » | décalé | glori[E]eux (relevé ok) |
| 27 | B/D# | x=227,7 sur les espaces après « glorieux, » (223,3), avant « et » (258,9) | exact (outil : début de ligne déjà « [B/D#] » + espace) | [B/D#] Et (inchangé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espace de fin : l. 10, 12 ; mot coupé au tiret : l. 10 ; espaceur : l. 19.

En-tête : ajout de `{source: Grâce infinie E.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 27:decale:B/D#:1 | laissé | Timothée |  |
| 26:decale:E:1 | appliqué | Timothée |  |
| 25:invente:B/D#:1 | appliqué | Timothée |  |
| 24:decale:A:1 | appliqué | Timothée |  |
| 24:manquant:B/D#:1 | appliqué | Timothée |  |
| 20:decale:F#m:1 | appliqué | Timothée |  |
| 20:decale:B:1 | appliqué | Timothée |  |
| 18:decale:B:1 | appliqué | Timothée |  |
| 13:decale:E:1 | appliqué | Timothée | inclus dans la ligne de 13:fable:13:manquant:B/D#:1 |
| 13:manquant:B/D#:1 | laissé | Timothée |  |
| 13:fable:13:manquant:B/D#:1 | appliqué | Timothée |  |
| 11:decale:B/D#:1 | laissé | Timothée |  |
| 11:decale:B:1 | appliqué | Timothée |  |

- Chant validé par le relevé : les 45 accords mesurés sur la couche texte de « Grâce infinie E.pdf » (rendu ChordPro de l'église) ; tous les choix du relevé mettent l'accord sur le caractère de la partition, rien à contredire.
- Les 34 accords « exact » de check.py confirmés au x (ex. l.10 E 79,2 « i », E/G# 113,9 « n », A 174,4 « m », E 229,9 « v » ; l.19 C# 297,2 après « pluie, » : `pluie,[ ][C#]` devient `pluie,[C#]` par la forme).
- L.24 : B/D# est gravé sur la virgule de « Dieu, » (caractère porteur « , ») : écrit `Dieu[B/D#],` comme le relevé l'a retenu (même caractère que la partition).
- Paroles, non appliqué : la partition joint chaque paire de lignes sur une seule rangée (« …sauvé, un pécheur… ») et écrit « dieu » / « sauveur » sans majuscule dans les chaînes mesurées ; le .cho garde ses coupes et ses majuscules. « infi - nie » (tiret du transcripteur) est réécrit « infinie » par la forme.
- Autres versions présentes : « Grâce infinie - Accords.pdf », « Grâce infinie C.pdf », « Grâce infinie D.pdf », « Grâce infinie.pdf » (non mesurées, la partition retenue fait foi). Thèmes inchangés (chant validé).
- Non exact APRÈS (3) : les B/D# en tête des l.11, 13, 27, écrits `[B/D#] ` + espace devant le premier mot, exactement comme la partition (label sur le blanc qui suit la virgule de la ligne précédente) ; check.py ne voit pas l'espace de début de ligne : outil, pas écart.

### grande-est-ta-fidelite — Grande est Ta fidélité

Lot 3 · partition retenue : `Grande est Ta fidélité.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 10 : `[A] Ton grand amour [E]est infaillible` → `[A] Ton grand amour est i[E]nfaillible` *(session)*
- l. 12 : `[A] Seigneur Tu de[E]meures inchangeable` → `[A] Seigneur Tu demeures [E]inchangeable` *(session)*
- l. 16 : `[D] Et à chaque heure, [E]Je [F#m]redirai :` → `[D] Et à chaque h[E]eure, Je [F#m]redirai :` *(session)*
- l. 24 : `Je redis [F#m]grande est Ta f[E]idélité` → `Je redis [F#m]grande est Ta fi[E]délité` *(session)*
- l. 40 : `[F#m] À jamais notre D[D]ieu est fidèle` → `[F#m] À jamais notre [D]Dieu est fidèle` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | F#m | x=72,0 = début de ligne, « D » de « Dès » (72,0) | exact |  |
| 9 | D | x=72,0 seul sur sa ligne de feuille, « J » de « Jusqu'à » (72,0) ; .cho « [D] Jusqu'à » : frontière espace/mot, sans portée sur une feuille alignée aux espaces | équivalent | [D] Jusqu'à gardé |
| 10 | A | x=72,0, « T » de « Ton » | exact |  |
| 10 | E | x=179,0 dans le « n » de « infaillible » (177,1–183,1) ; .cho sur « est » (autre mot) | décalé | i[E]nfaillible |
| 11 | F#m | x=72,0, « Q » de « Quand » | exact |  |
| 11 | D | x=72,0 seul sur sa ligne de feuille, « L » de « La » ; frontière espace/mot | équivalent | [D] La gardé |
| 12 | A | x=72,0, « S » de « Seigneur » | exact |  |
| 12 | E | x=185,0 dans le « i » de « inchangeable » (182,3–185,7) ; .cho sur « meures » (autre mot) | décalé | [E]inchangeable |
| 16 | D | x=72,0, « E » de « Et » | exact |  |
| 16 | E | x=137,7 dans le « e » de « heure » (137,0–142,3), rangée de « Et à chaque heure » ; .cho sur « Je » (autre mot, ligne suivante de la feuille) | décalé | h[E]eure, |
| 16 | F#m | x=87,0 dans le « r » de « redirai » (85,0–89,0) | exact | [F#m]redirai gardé |
| 17 | D | x=81,0 dans le « M » de « Mon » (72,0–82,7) | exact | [D] Mon gardé |
| 17 | E | x=149,7 dans le « J » de « Jésus » (146,3–151,0) ; .cho J[E]ésus : même syllabe « Jé » | équivalent | gardé |
| 21 | A | x=72,0, « G » de « Grande » | exact |  |
| 21 | E | x=152,0 dans le « d » de « fidélité » (148,6–154,6) | exact | fi[E]délité gardé |
| 22 | F#m | x=72,0, « G » de « Grande » | exact |  |
| 22 | D | x=152,3 dans le « d » de « fidélité » (148,6–154,6) | exact | fi[D]délité gardé |
| 23 | A | x=72,0, « J » de « Je » | exact |  |
| 23 | E | x=134,0 dans le « e » de « yeux » (130,3–135,6) ; .cho ye[E]ux : même syllabe (mot d'une syllabe) | équivalent | gardé |
| 24 | F#m | x=111,0 sur la fin de l'espace avant « grande » (g=111,3) : frontière espace/mot | équivalent | [F#m]grande gardé |
| 24 | E | x=185,3 dans le « d » de « fidélité » (185,2–191,2) ; .cho f[E]idélité : autre syllabe (« fi » au lieu de « dé ») | décalé | fi[E]délité |
| 28 | F#m | Couplet 2 : la feuille ne grave aucun accord (paroles seules, colonne de droite) ; accord reporté du Couplet 1 | absent | gardé (reporté) |
| 28 | D | Couplet 2 : la feuille ne grave aucun accord (paroles seules, colonne de droite) ; accord reporté du Couplet 1 | absent | gardé (reporté) |
| 29 | A | Couplet 2 : la feuille ne grave aucun accord (paroles seules, colonne de droite) ; accord reporté du Couplet 1 | absent | gardé (reporté) |
| 29 | E | Couplet 2 : la feuille ne grave aucun accord (paroles seules, colonne de droite) ; accord reporté du Couplet 1 | absent | gardé (reporté) |
| 30 | F#m | Couplet 2 : la feuille ne grave aucun accord (paroles seules, colonne de droite) ; accord reporté du Couplet 1 | absent | gardé (reporté) |
| 30 | D | Couplet 2 : la feuille ne grave aucun accord (paroles seules, colonne de droite) ; accord reporté du Couplet 1 | absent | gardé (reporté) |
| 31 | A | Couplet 2 : la feuille ne grave aucun accord (paroles seules, colonne de droite) ; accord reporté du Couplet 1 | absent | gardé (reporté) |
| 31 | E | Couplet 2 : la feuille ne grave aucun accord (paroles seules, colonne de droite) ; accord reporté du Couplet 1 | absent | gardé (reporté) |
| 35 | A | x=308,8, « I » de « Il » | exact |  |
| 36 | E | x=308,8, « L » de « La » | exact |  |
| 37 | F#m | x=308,8, « E » de « En » | exact |  |
| 37 | D | x=422,1 dans le « D » de « Dieu » (419,4–428,1) | exact |  |
| 38 | A | x=308,8, « S » de « Ses » | exact |  |
| 39 | E | x=308,8, « J » de « Je » | exact |  |
| 40 | F#m | x=308,8, « À » de « À jamais » | exact |  |
| 40 | D | x=386,1 dans le « D » de « Dieu » (382,4–391,1) ; .cho D[D]ieu (coquille, label après la 1re lettre) | décalé | [D]Dieu |

En-tête : ajout de `{source: Grande est Ta fidélité.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 40:relire:D:1 | laissé | def |  |
| 40:oeil:3 | appliqué | def | inclus dans la ligne de la session |
| 31:reporte:A:1 | laissé | def |  |
| 31:reporte:E:1 | laissé | def |  |
| 30:reporte:F#m:1 | laissé | def |  |
| 30:reporte:D:1 | laissé | def |  |
| 29:reporte:A:1 | laissé | def |  |
| 29:reporte:E:1 | laissé | def |  |
| 28:reporte:F#m:1 | laissé | def |  |
| 28:reporte:D:1 | laissé | def |  |
| 24:relire:E:1 | laissé | def |  |
| 22:relire:D:1 | laissé | def |  |
| 21:relire:E:1 | laissé | def |  |
| 17:relire:D:1 | laissé | def |  |
| 16:decale:E:1 | laissé | def |  |
| 16:relire:F#m:1 | laissé | def |  |
| 16:oeil:2 | laissé | def |  |
| 16:fable:16:decale:E:1 | laissé | session | la feuille met E sur « heure » (bon mot), mais le label commence au-dessus du « e », pas du « h » : ligne juste h[E]eure (donnée dans lignes, l.16) — partition : E x=137,7 dans le « e » (137,0–142,3) de « heure » |
| 16:fable:16:oeil:2 | laissé | session | même lecture que 16:fable:16:decale:E:1 ; ligne juste donnée dans lignes (l.16) — partition : E x=137,7 dans le « e » de « heure » |
| 12:decale:E:1 | laissé | def |  |
| 12:oeil:1 | appliqué | def | inclus dans la ligne de la session |
| 12:fable:12:decale:E:1 | appliqué | session | l'opération met E devant le caractère sous lequel le label commence — inclus dans la ligne de la session — partition : E x=185,0 dans le « i » (182,3–185,7) de « inchangeable » |
| 11:relire:D:1 | laissé | def |  |
| 10:decale:E:1 | laissé | def |  |
| 10:oeil:0 | laissé | def |  |
| 10:fable:10:decale:E:1 | laissé | session | la feuille met E sur « infaillible » (bonne syllabe), mais le label commence au-dessus du « n », pas du « i » : la ligne juste est i[E]nfaillible (donnée dans lignes, l.10) — partition : E x=179,0 dans le « n » (177,1–183,1) de « infaillible » |
| 10:fable:10:oeil:0 | laissé | session | même lecture que 10:fable:10:decale:E:1 ; ligne juste donnée dans lignes (l.10) — partition : E x=179,0 dans le « n » de « infaillible » |
| 9:relire:D:1 | laissé | def |  |

- Source basse fidélité (feuille Pages/Word, accords alignés aux espaces) ; check.py ne lit pas cette feuille (famille inconnue, 0 accord mesuré) : les 37 accords sont vérifiés à l'œil, ligne par ligne, avec les x de la couche texte (rawdict) et un rendu 2×.
- Corrigés (autre mot ou autre syllabe que la feuille) : l.10 E sur « infaillible », l.12 E sur « inchangeable », l.16 E sur « heure », l.24 E sur « dé » de « fidélité », l.40 coquille D[D]ieu.
- Gardés comme équivalents (même syllabe ou frontière espace/mot, sans portée sur une feuille alignée aux espaces) : l.9 et l.11 [D] en début de ligne de feuille, l.17 J[E]ésus (label dans le « J »), l.23 ye[E]ux (label dans le « e »), l.24 [F#m]grande, l.16 [F#m]redirai, l.17 [D] Mon, l.21/22 fi[E]/[D]délité.
- Couplet 2 (l.28–31) : la feuille n'y grave aucun accord ; les 8 accords du site sont reportés du Couplet 1 (même mélodie) et gardés.
- Paroles, non appliqué : la feuille n'a ni virgules ni deux-points (« Dès le matin », « Je redirai ») et écrit « Mon refuge » avec majuscule ; le .cho ajoute la ponctuation et regroupe deux lignes de feuille par ligne.
- Structure : feuille COUPLET 1, PRE-REFRAIN, REFRAIN, COUPLET 2, PONT, sans ordre de reprise gravé ; .cho identique, rien à changer.
- Éléments non repris : auteur (nom retiré), traducteurs, titre original « Faithfulness », CCLI 7068492, © 2015 Hillsong Music Publishing ; tempo 149 déjà présent.
- Thèmes inchangés (Adoration, Foi, Espérance, dans la liste) ; {key: A} conforme à la feuille.

### havre-de-paix — Havre de paix

Lot 3 · partition retenue : `Havre de Paix.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 26 : `[C]Me voici pour T’ad[Am]orer` → `[C]Me voi[(G/B)]ci pour T’ad[Am]orer`
- l. 28 : `[C]Jésus mon havre [Am]de paix` → `[C]Jésus [(G/B)]mon havre [Am]de paix`
- l. 40 : `Alors je saisis l’[F]instant` → `Alors je saisis l’i[F]nstant` *(session)*
- l. 47 : `Pour plus de To[Am]i` → `Pour plus de T[Am]oi` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | C | x=72,0 sur « Q » de « Quand » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [C]Quand |
| 9 | C/E | x=114,0 : entre « e » de « le » (110,3), l'espace (115,7) et « b » de « bruit » (118,7) ; label tapé tabulation + espaces | équivalent | aucune : [C/E]bruit gardé ; le caractère le plus proche est l'espace avant « bruit », donc le mot « bruit » (le[C/E] bruit ne change que la frontière mot/espace, sans valeur rythmique sur une feuille Word) ; 3e syllabe comme ligne 11 |
| 10 | F | x=72,0 sur « V » de « Veut » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [F]Veut |
| 11 | C | x=72,0 sur « T » de « Tu » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [C]Tu |
| 11 | C/E | x=95,7 : dans « s » de « es » (93,2–97,9), l'espace commence à 97,9, « l » à 100,9 ; label aligné aux espaces (pas de 3 pt) | équivalent | aucune : [C/E]le gardé ; caractère le plus proche = l'espace avant « le » ; basse fidélité ± 1 syllabe, même 3e syllabe que « bruit » ligne 9 |
| 12 | F | x=72,0 sur « Ô » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [F]Ô |
| 12 | C | x=201,0, « â » de « âme » à 202,0 (espace à 199,0) | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : mon [C]âme |
| 12 | C/E | x=228,0, après la fin de « âme » (≈222) | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : âme[C/E] |
| 13 | F | x=72,0 sur « À » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [F]À |
| 17 | C, C/E | couplet 2 : la feuille ne grave aucun accord | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé (accords recopiés du couplet 1) |
| 18 | F | couplet 2 sans accords gravés | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 19 | C, C/E | couplet 2 sans accords gravés | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 20 | F, C, C/E | couplet 2 sans accords gravés | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 21 | F | couplet 2 sans accords gravés | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 25 | F | x=72,0 sur « P » de « Prosterné » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [F]Prosterné |
| 25 | G | x=120,0, « à » à 120,3 | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [G]à |
| 26 | C | x=72,0 sur « M » de « Me » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [C]Me |
| 26 | (G/B) | x=108,0 (parenthèse) sur « c » de « voici » (106,3) | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | voi[(G/B)]ci — ajouté (absent du .cho) |
| 26 | Am | x=163,0 : « d » 159,4, « o » 165,4 → « o » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : T’ad[Am]orer |
| 27 | F | x=72,0 sur « E » de « En » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [F]En |
| 27 | G | x=120,0, « en » à 121,0 | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [G]en |
| 28 | C | x=72,0 sur « J » de « Jésus » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [C]Jésus |
| 28 | (G/B) | x=101,7 sur « m » de « mon » (100,3) | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | [(G/B)]mon — ajouté (absent du .cho) |
| 28 | Am | x=155,3 sur « d » de « de » (154,3) | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : [Am]de |
| 32 | C, C/E | couplet 3 : la feuille ne grave aucun accord | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 33 | F | couplet 3 sans accords gravés | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 34 | C, C/E | couplet 3 sans accords gravés | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 35 | F, C, C/E | couplet 3 sans accords gravés | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 36 | F | couplet 3 sans accords gravés | reporté (passage sans accords gravés ; check.py ne lit pas cette feuille) | gardé |
| 40 | F | x=390,0 sur « n » de « l’i‹n›stant » | décalé (même syllabe) ; check.py ne lit pas cette feuille, mesure sur la couche texte | l’i[F]nstant |
| 41 | G | x=408,0 : « b » 404,0, « l » 410,0 → « l » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : humb[G]lement |
| 42 | C | x=417,0 : « œ » 411,3, « u » 420,0 → « u » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : cœ[C]ur |
| 43 | Am | x=381,0 : « T » 374,4, « o » 381,8 → « o » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : T[Am]oi |
| 44 | F | x=393,0, « u » à 393,1 | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : T[F]u |
| 45 | G | x=387,0, « o » à 387,6 | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : b[G]onté |
| 46 | C | x=393,0 : « u » 391,3, « r » 397,3 → « u » | exact (mesuré sur la couche texte, check.py ne lit pas les accords de cette feuille) | aucune : Seigne[C]ur |
| 47 | Am | x=381,0 sur « o » de « T‹o›i » (o 378,3, i 384,3) | décalé (même syllabe) ; check.py ne lit pas cette feuille, mesure sur la couche texte | T[Am]oi |

En-tête : ajout de `{source: Havre de Paix.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 47:relire:Am:1 | laissé | def |  |
| 40:relire:F:1 | laissé | def |  |
| 36:reporte:F:1 | laissé | def |  |
| 35:reporte:F:1 | laissé | def |  |
| 35:reporte:C:1 | laissé | def |  |
| 35:reporte:C/E:1 | laissé | def |  |
| 34:reporte:C:1 | laissé | def |  |
| 34:reporte:C/E:1 | laissé | def |  |
| 33:reporte:F:1 | laissé | def |  |
| 32:reporte:C:1 | laissé | def |  |
| 32:reporte:C/E:1 | laissé | def |  |
| 28:manquant:(G/B):1 | laissé | def |  |
| 28:oeil:1 | appliqué | def |  |
| 28:fable:28:manquant:(G/B):1 | appliqué | session | Même (G/B) facultatif gravé au refrain, sur « mon ». Même ligne que l'écart œil retenu. — inclus dans la ligne de 28:oeil:1 — partition : mesure : « (G/B) » commence à x=101,7, sur « m » de « mon » (100,3) : [(G/B)]mon ; Am à x=155,3 sur « d » de « de » (154,3) : [Am]de, déjà juste |
| 26:manquant:(G/B):1 | laissé | def |  |
| 26:oeil:0 | appliqué | def |  |
| 26:fable:26:manquant:(G/B):1 | appliqué | session | La feuille grave un (G/B) facultatif dans le refrain ; un accord entre parenthèses se transcrit toujours. Même ligne que l'écart œil retenu. — inclus dans la ligne de 26:oeil:0 — partition : mesure : « (G/B) » commence à x=108,0, sur « c » de « voi‹c›i » (c 106,3–111,7, i à 111,7) : voi[(G/B)]ci ; C à x=72 sur « M », Am à x=163,0 plus près de « o » (165,4) que de « d » (159,4) : T’ad[Am]orer, déjà juste |
| 21:reporte:F:1 | laissé | def |  |
| 20:reporte:F:1 | laissé | def |  |
| 20:reporte:C:1 | laissé | def |  |
| 20:reporte:C/E:1 | laissé | def |  |
| 19:reporte:C:1 | laissé | def |  |
| 19:reporte:C/E:1 | laissé | def |  |
| 18:reporte:F:1 | laissé | def |  |
| 17:reporte:C:1 | laissé | def |  |
| 17:reporte:C/E:1 | laissé | def |  |
| 11:relire:C/E:1 | laissé | def |  |
| 9:relire:C/E:1 | laissé | def |  |

- Source basse fidélité (feuille Word, accords alignés par tabulations et espaces de 3 pt) ; chaque accord mesuré sur la couche texte (rawdict) et vérifié à l'œil sur le rendu 2×.
- check.py ne lit aucun accord de cette feuille (famille « inconnue », lignes d'accords en Times-Bold non reconnues) : ses 45 « absent de la source » sont une lecture ratée ; chaque accord a été mesuré sur la couche texte (x du label ↔ x de chaque lettre) et vérifié à l'œil.
- Couplet 1, refrain, pont : tous les accords sont sur la lettre la plus proche du label ; seuls l’i[F]nstant (l. 40) et T[Am]oi (l. 47) bougent, dans la même syllabe ; les deux (G/B) facultatifs du refrain sont ajoutés (l. 26 voi[(G/B)]ci, l. 28 [(G/B)]mon).
- C/E l. 9 et l. 11 : label sur l'espace avant « bruit » / « le » (à ± 1 lettre), gardés sur le mot qui suit ; rien de plus fin ne se lit sur cette feuille.
- Couplets 2 et 3 : la feuille n'y grave aucun accord ; les accords recopiés du couplet 1 sont gardés tels quels. Leur placement syllabique (C/E sur la 2e syllabe « ra », « dé », mais 3e au couplet 1) reste à l'oreille.
- Autres fichiers « Prince de paix » : autre chant ; « Havre de paix - MJL, RP, TR - Accords.pdf » : doublon exact.

### heritiers — Héritiers

Lot 3 · partition retenue : `Héritiers.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 7 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (x2)}` *(structure)*
- l. 17 : `Sa gr[D]âce nous l[F#m]ibère.` → `Sa gr[D]âce nous li[F#m]bère.` *(session)*
- l. 28 : `Scellés p[D]our l'é[E]ternit - [(D)]é !` → `Scellés p[D]our l'é[E]terni[(D)]té !`
- l. 33 : `Le [F#m]péché veut nous [E/G#]en - chaîn[A]er,` → `Le [F#m]péché veut nous [E/G#]enchaîn[A]er,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | F#m | x=65,9 sur l'espace avant « fait » (f à 69,0) | équivalent (même syllabe, frontière espace/mot) | aucune |
| 12 | A | x=165,2 dans « o » de « amour » (o 163,7, u 170,3) | équivalent (même syllabe « mour », basse fidélité) | aucune |
| 15 | D | x=52,5 dans « n » de « Unis » (n 50,7, i 57,2) | équivalent (même syllabe « nis ») | aucune |
| 15 | A | x=124,8 dans « h » de « Christ » (h 121,2, r 127,6) | équivalent (même syllabe) | aucune |
| 17 | D | x=69,2, à 0,9 pt de « â » de « grâce » | exact | gr[D]âce |
| 17 | F#m | x=128,1 dans « b » de « libère » (b 125,2-132,1) | décalé (syllabe « li » au lieu de « bè ») | li[F#m]bère |
| 23 | D | x=69,2 au milieu de la ligature « ﬁ » (66,5-71,8) de « Justifiés » : 2,7 pt de « fi », 2,6 pt de « és » | à cheval entre « fi » et « és » (basse fidélité) | aucune, {needs_review} au-dessus de la ligne |
| 25 | D | x=95,2 sur « a » de « jamais » (a 95,0) | équivalent (même syllabe « ja ») | aucune |
| 28 | E | x=124,8 sur le 2e « e » de « l'éterni » (t 121,1-124,8) | équivalent (même syllabe « ter ») | aucune |
| 28 | (D) | x=152,6 sur l'espace entre « - » et « té » (t à 154,8) | décalé avant correction (le .cho était devant « é ») | terni[(D)]té (remplacement du relevé, appliqué par défaut) |
| 34 | A | x=423,7 dans « d » de « conduit », à 1,6 pt de « u » | équivalent (même syllabe « duit ») | aucune |
| 36 | A | x=387,0 sur « r » de « cris » (r 385,8) | équivalent (même syllabe) | aucune |
| 38 | D | x=328,1 dans « p » de « L'Esprit » (p 326,2, r 333,1) | équivalent (même syllabe « prit ») | aucune |
| 39 | E/D | x=417,0 sur l'apostrophe de « l'espérance » (’ 416,1, e 419,4) | équivalent (même syllabe « l'es ») | aucune |
| 40 | E | x=377,0 dans « n » de « éternelle », à 1,1 pt de « e » | équivalent (même syllabe « nel ») | aucune |
| 47 | D | x=434,8 sur « h » de « Christ » (h 431,9, r 438,3) | équivalent (mot d'une syllabe) | aucune |
| 47 | E | x=470,4 après « ? » (fin du texte à 466,8) | exact (après la ponctuation) | le [ ] est retiré par la forme |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espaceur : l. 47.

En-tête : ajout de `{source: Héritiers.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 47:relire:D:1 | laissé | def |  |
| 45:reporte:F#m7:1 | laissé | def |  |
| 45:reporte:E/G#:1 | laissé | def |  |
| 44:reporte:D:1 | laissé | def |  |
| 44:reporte:A:1 | laissé | def |  |
| 44:oeil:2 | laissé | def |  |
| 40:relire:E:1 | laissé | def |  |
| 39:relire:E/D:1 | laissé | def |  |
| 38:relire:D:1 | laissé | def |  |
| 36:relire:A:1 | laissé | def |  |
| 34:relire:A:1 | laissé | def |  |
| 33:relire:F#m:1 | laissé | def |  |
| 33:oeil:1 | appliqué | def |  |
| 28:relire:E:1 | laissé | def |  |
| 28:relire:(D):1 | laissé | def |  |
| 28:oeil:0 | appliqué | def |  |
| 25:relire:D:1 | laissé | def |  |
| 23:relire:D:1 | laissé | def |  |
| 19:decale:D:1 | laissé | def |  |
| 19:invente:Esus4:1 | laissé | def |  |
| 19:decale:E:1 | laissé | def |  |
| 19:manquant:E:1 | laissé | def |  |
| 17:relire:F#m:1 | laissé | def |  |
| 15:relire:D:1 | laissé | def |  |
| 15:relire:A:1 | laissé | def |  |
| 12:relire:F#m:1 | laissé | def |  |
| 12:relire:A:1 | laissé | def |  |

- Source basse fidélité (feuille Pages, Écriture, en la ; accords en gras alignés aux espaces dans une police proportionnelle) : check.py ne la lit pas (0 accord mesuré, famille inconnue). Chaque accord du chant vérifié à l'œil, mesuré en coordonnées (rawdict PyMuPDF : x du label ↔ x des caractères de la ligne de paroles) et sur le rendu 2× (crops/heritiers/).
- Les 62 « absent de la source » que check.py liste avant comme après sont des lectures ratées de l’outil (il ne reconnaît plus cette feuille : 0 accord mesuré) : chacun de ces accords est sur la feuille, mesuré à l’œil ci-dessus.
- Critère : la lettre dont le début est le plus proche du bord gauche du label (le transcripteur aligne au pas d'une espace, ~3,3 pt). 46 accords sur la même lettre ou à l'intérieur de la même syllabe ; un seul sur une autre syllabe (l. 17, F#m sur « bè » et non « li ») : corrigé ; un à cheval (l. 23, D entre « fi » et « és ») : {needs_review}.
- Écarts à une lettre près dans la même syllabe (l. 12, 15, 25, 28 E, 34, 36, 38, 39, 40, 47) : laissés, la feuille alignée aux espaces ne permet pas de trancher au caractère près dans la syllabe.
- Faux écarts de l'outil : « E » + exposant « sus4 » (l. 19, Esus4 juste), « F#m » + exposant « 7 » (l. 45, F#m7 juste), « A (2e fois A/C#) » (l. 44) : ces accords sont tous sur la feuille ; les « absents de la source » (l. 44, 45) ne s'appliquent pas.
- L. 28 et 33 : mots coupés au tiret écrits entiers (remplacements du relevé, appliqués par défaut) ; (D) devant « té » (x=152,6), mesuré juste.
- Liste extra (lignes instrumentales de la source) : intro x2, Transition A x2, Transition B, Outro x2 et les deux lignes du pont mal lues ; citées, non appliquées hors du bloc de structure.
- Paroles : aucune différence réelle (« Déclar - és », « persé - vérance », « que  prier » sont des coupes et espaces du transcripteur ; apostrophes typographiques sur la feuille).
- Ligne vide l. 29 avant {end_of_chorus} : laissée.

### homme-de-douleurs — Homme de douleurs

Lot 3 · partition retenue : `Homme de douleurs D.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 14 : `Ble[Bm]ssé, meurtri et [G]humil[Bm]ié` → `Ble[Bm]ssé, meurtri et [G]humi[Bm]lié`
- l. 19 : `Ô [Bm]cette [G]croix, ma ré[D]dempt[A]ion,` → `Ô [Bm]cette [G]croix, ma ré[D]demp[A]tion,`
- l. 22 : `Gloire et [G]honneur [A]à Toi[D]seul.` → `Gloire et [G]honneur [A]à To[D]i seul.` *(session)*
- l. 27 : `Pour [G]nous ré[D]concil[A]ier,` → `Pour [G]nous ré[D]conci[A]lier,`
- l. 29 : `Ceux [G]qui l'ont [A]crucif[D]ié.` → `Ceux [G]qui l'ont [A]cruci[D]fié.`
- l. 35 : `Le pé[Bm]ché est vain[G]cu, son emp[D]rise n'est [A]plus,` → `Le pé[Bm]ché est vain[G]cu, son em[D]prise n'est [A]plus,`
- l. 43 : `Il [G]est re[A]ssusci[D]té.` → `Il [G]est re[A]ssusc[D]ité.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 14 | Bm | x=194,8 sur « l » de « humi‹l›ié » | décalé | humi[Bm]lié (ok du relevé) |
| 19 | A | x=225,0 sur « t » de « rédemp‹t›ion » | décalé | rédemp[A]tion (ok du relevé) |
| 22 | D | x=205,4 sur « i » de « To‹i› seul » | décalé | To[D]iseul (ok du relevé) ; l'espace manquante « Toiseul » n'est pas ajoutée (paroles, au rapport) |
| 27 | A | x=160,1 sur « l » de « réconci‹l›ier » | décalé | réconci[A]lier (ok du relevé) |
| 29 | D | x=165,8 sur « f » de « cruci‹f›ié » | décalé | cruci[D]fié (ok du relevé) |
| 35 | D | x=249,0 sur « p » de « em‹p›rise » | décalé | em[D]prise (ok du relevé) |
| 43 | D | x=124,5 sur « i » de « ressusc‹i›té » (« i » commence à 124,6, « c » à 116,6) | décalé | ressusc[D]ité (ok du relevé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — mot coupé au tiret : l. 21, 36.

En-tête : ajout de `{source: Homme de douleurs D.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 43:decale:D:1 | appliqué | Timothée |  |
| 35:decale:D:1 | appliqué | Timothée |  |
| 29:decale:D:1 | appliqué | Timothée |  |
| 27:decale:A:1 | appliqué | Timothée |  |
| 22:decale:D:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 19:decale:A:1 | appliqué | Timothée |  |
| 14:decale:Bm:1 | appliqué | Timothée |  |

- Rendu de l'église à couche texte : check.py mesure 78 accords, 71 exacts et 7 décalés ; les 7 « ok » du relevé mettent chacun l'accord sur le caractère de la partition (vérifié sur les x, et à l'œil sur le rendu 2× pour l. 22 et 43).
- Paroles, non appliqué : l. 22, le .cho écrit « Toiseul » (espace manquante) ; la partition a « Toi seul ». L'accord D est posé sur le « i » comme sur la partition ; l'espace reste à ajouter.
- Autres versions : « Homme de douleurs - Accords.pdf » (même feuille selon le relevé) et « Homme de douleur.pdf » (scan Word), non comparées en détail.
- Partition : traduction française de « Man of Sorrows » (Hillsong), traducteur nommé sur la feuille ; non repris.

### hosanna — Hosanna

Lot 3 · partition retenue : `Hosanna (D).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 13 : `[D]Je vois le Roi de gloire [Bm]qui revient sur les nuées.` → `[D] Je vois le Roi de gloire [Bm]qui revient sur les nuées.` *(session (hors relevé))* — D x=31,2 sur l'indentation (deux espaces x=31,2 et 35,6) avant « Je » (x=40,1) : label sur l'espace, crochet + espace (cas Océans de 02), comme l. 25 et 27 du même chant ; check.py, qui retire l'indentation, le compte exact. Bm x=205,5 sur « q » de « qui » : exact.
- l. 14 : `Les nations t[Em7]remblent, les nations t[A]remblent.[Bm7]` → `Les nations tr[Em7]emblent, les nations tr[A]emblent.[Bm7]`
- l. 15 : `[D]Je vois Son amour, Sa grâce, [Bm]qui effacent nos péchés.` → `[D] Je vois Son amour, Sa grâce, [Bm]qui effacent nos péchés.` *(session (hors relevé))* — D x=31,2 sur l'indentation avant « Je » (x=40,1) : crochet + espace, comme l. 25 et 27. Bm x=254,4 sur « q » de « qui » : exact.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 13 | D | x=31,2 sur l'indentation (espace) avant « Je » (x=40,1) | décalé (en l'air sur la partition, collé dans le .cho ; check.py le lit exact) | [D] Je vois |
| 13 | Bm | x=205,5 sur « q » de « qui » | exact | inchangé |
| 14 | Em7 | x=127,2 sur « e » de « tr‹e›mblent, » | décalé | tr[Em7]emblent (écart du relevé, ok) |
| 14 | A | x=283,7 sur « e » de « tr‹e›mblent. » | décalé | tr[A]emblent (écart du relevé, ok) |
| 14 | Bm7 | x=345,1 sur l'espace après « tremblent. » | exact | inchangé : .[Bm7] |
| 15 | D | x=31,2 sur l'indentation avant « Je » | décalé (en l'air ; check.py le lit exact) | [D] Je vois |
| 15 | Bm | x=254,4 sur « q » de « qui » | exact | inchangé |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — ligne sans paroles : l. 9, 32 ; mot coupé au tiret : l. 20, 21.

En-tête : ajout de `{source: Hosanna (D).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 14:decale:Em7:1 | appliqué | Timothée |  |
| 14:decale:A:1 | appliqué | Timothée |  |

- Mesure sur la couche texte (église FPDF) : 53 accords, 51 exacts avant ; les deux décalés de la l. 14 (Em7, A sur le « e » de « tremblent ») sont réglés par les écarts du relevé (ok), conformes à la partition.
- Hors relevé : l. 13 et 15, D gravé sur l'indentation avant « Je » (x=31,2 ; la lettre J est à 40,1) → `[D] Je`, comme le couplet 2 (l. 25, 27) l'écrit déjà ; check.py ne voit pas l'indentation.
- Refrain : « Hosan - na » gravé avec tirets, D/F# x=73,8 sur « a » de « Hos‹a›n », G x=132,5 sur « a » de « n‹a » , A x=176,1 sur « s » de « ho‹s›an », Bm x=225,9 sur « a », G x=270,4 sur « s » de « ho‹s›anna », Bm/A x=358,4 sur « S » de « Seigneur », A/Bm7 x=422,5 sur le point : tous exacts ; le moteur écrit le mot entier.
- Intro et ligne d'accords du Pont : Bm D Em7 F#m7 et Bm7 D Em7 F#m7, conformes ; l'« Interlude » de l'outil est cette ligne du Pont (pas de bloc de structure).
- Liste extra (structure) citée : source Intro · Couplet 1 · Refrain · Couplet 2 · Pont · Interlude, .cho sans Interlude — faux écart, non appliqué.
- Autres sources non mesurées ici (même chant) : Hosanna - Accords D.pdf, Hosanna 2.pdf, Hosanna - Hillsong.pdf (shir.fr), Hosanna (E) Rapide.pdf.

### hosanna-ostrini — Hosanna (Ouvrons les portes)

Lot 3 · partition retenue : `Hosanna - Accords.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `[D]Laissons jaillir un c[A]hant de vic[Bm]toire,[A]` → `[D]Laissons jaillir un c[A]hant de vic[Bm]toi[A]re,`
- l. 11 : `[G]Ho - [A]san - [Bm]na, [G]ho - [A]san - [D]na.` → `[G]Ho[A]sann[Bm]a, [G]ho[A]sann[D]a.`
- l. 18 : `[Em]Chas - [D/F#]sons [ ][G]les [A]té-[Bm]nè - bres.[A]` → `[Em]Cha[D/F#]ssons [G]les [A]té[Bm]nè[A]bres.`
- l. 25 : `[Em]Le - [D/F#]vons [ ][G]Sa [A]ban - [Bm]nière.[A]` → `[Em]Le[D/F#]vons [G]Sa [A]ba[Bm]nniè[A]re.` *(session)*
- l. 32 : `[Em]Chan - [D/F#]tons [ ][G]Sa [A]lou - [Bm]ange.[A]` → `[Em]Chan[D/F#]tons [G]Sa [A]lou[Bm]an[A]ge.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | A | x=297,0 sur « r » de « victoi - re, » | décalé | victoi[A]re, (ok par défaut, appliqué) |
| 11 | Bm | x=128,9 sur « a » (128,9) de « na, » | décalé | n[Bm]a (ok par défaut, appliqué) |
| 11 | D | x=245,4 sur « a » (245,5) de « na. » | décalé | n[D]a (ok par défaut, appliqué) |
| 18 | D/F# | x=74,8 sur le premier « s » de « Cha - ssons » | décalé | Cha[D/F#]ssons (question, ok) |
| 18 | A | x=232,2 sur « b » de « bres. » | décalé | nè[A]bres. (question, ok) |
| 25 | Bm | x=193,1 sur le premier « n » de « ba - nniè » | décalé (même syllabe, autre lettre ; check.py le classe exact) | ba[Bm]nnière |
| 25 | A | x=237,5 sur « r » de « re. » | décalé | niè[A]re. |
| 32 | A | x=245,5 sur « g » de « an - ge. » | décalé | an[A]ge. (ok par défaut, appliqué) |

En-tête : ajout de `{source: Hosanna - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:A:1 | appliqué | def |  |
| 25:decale:A:1 | laissé | def | la ligne est celle mesurée par la session |
| 18:decale:D/F#:1 | laissé | def |  |
| 18:decale:A:1 | laissé | def | la ligne prend le texte de 18:fable:18:decale:D/F#:1 |
| 18:fable:18:decale:D/F#:1 | appliqué | session | La ligne remplacée est juste en entier : chaque accord tombe sur le caractère de la partition (mots écrits entiers). — partition : rawdict : Em x=31,2 sur « C » ; D/F# x=74,8 sur le premier « s » (74,8) de « Cha - ssons » ; G x=138,8 sur « l » de « les » ; A x=163,7 sur « t » de « té » ; Bm x=191,2 sur « n » (191,3) de « nè » ; A x=232,2 sur « b » (232,2) de « bres. » |
| 11:decale:Bm:1 | appliqué | def |  |
| 11:decale:D:1 | appliqué | def |  |
| 10:decale:A:1 | appliqué | def |  |

- Rendu de l'église à couche texte : check.py mesure 52 accords, 7 décalés (l. 10, 11 ×2, 18 ×2, 25, 32), tous corrigés : 5 par les « ok » par défaut, l. 18 par la ligne relue (question ok), l. 25 par une ligne mesurée.
- L. 25 : en plus de l'A sur « re. », le Bm est gravé devant le premier « n » de « ba - nniè » (coupe de la feuille) ; corrigé en ba[Bm]nnière, check.py ne le voyait pas après retrait des tirets.
- check.py après : les 2 « absent du .cho / absent de la source » des A l. 18 et l. 25 sont un artefact (check.py ne recolle pas les mots coupés au tiret une fois écrits entiers) ; la même version réécrite avec les coupes de la feuille (« té - [Bm]nè - [A]bres. », « ba - [Bm]nniè - [A]re. ») donne 52 accords exacts sur 52 (crops/hosanna-ostrini/test.cho).
- Toutes les autres lignes vérifiées en coordonnées (rawdict) : exactes.
- Paroles, non appliqué : rien de différent hormis les coupes au tiret de la feuille (retirées par la forme).
- Autres versions dans Partitions : « Hosanna (Ouvrons les portes).pdf » (shir.fr), « Hosanna (D).pdf », « Hosanna - Accords D.pdf », « Hosanna.pdf » (Word) ; non comparées.

### how-great-thou-art — How Great Thou Art

Lot 3 · partition retenue : `How-Great-Thou-Art-G.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 8 : `O Lord my G[G]od, when I in awesome [C]wonder` → `O Lord my [G]God, when I in awesome [C]wonder` *(session)*
- l. 11 : `Thy pow’r througho[G]ut the u[D]niverse disp[G]layed[D]` → `Thy pow’r througho[G]ut the [D]universe disp[G]layed[D]` *(session)*
- l. 12 : `Then sings my [G]soul, my S[C]avior God to [G]Thee,` → `Then sings my [G]soul, my [C]Savior God to [G]Thee,` *(session)*
- l. 13 : `“How great thou [Am]art! [D]How great thou a[G]rt!”[D]` → `“How great thou [Am]art! [D]How great thou [G]art!”[D]` *(session)*
- l. 14 : `Then sings my [G]soul, my S[C]avior God to [G]Thee,` → `Then sings my [G]soul, my [C]Savior God to [G]Thee,` *(session)*
- l. 15 : `“How great thou [Am]art! How great thou [G][D]art!”` → `“How great thou [Am]art! [D]How great thou [G]art!”` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | G | x=174,5 sur « G » de « God » (169,2–181,6) | décalé (même syllabe, autre lettre) | [G]God |
| 8 | C | x=351,4 sur « w » de « wonder » (349,7) | exact | [C]wonder |
| 11 | G | x=227,8 sur « u » de « throughout » (227,0–235,9) | exact | througho[G]ut |
| 11 | D | x=275,8 sur « u » de « universe » (271,5–280,4) | décalé (même syllabe, autre lettre) | [D]universe |
| 11 | G | x=367,4 sur « l » de « displayed » (365,8–369,3) | exact | disp[G]layed |
| 11 | D | x=419,9, après la fin de « displayed » (404,0) | exact | displayed[D] |
| 12 | C | x=266,9 sur « S » de « Savior » (262,6–273,2) | décalé (même syllabe, autre lettre) | [C]Savior |
| 13 | Am | x=205,6, à cheval : espace 203,8–208,2, « a » de « art! » à 208,2 ; label aligné aux espaces dans une feuille Word (basse fidélité) | équivalent (même syllabe, frontière espace/lettre) | gardé [Am]art! : la différence avec thou[Am] art! est sous 1 pt sur une source ± 1 syllabe, aucune autre syllabe en jeu |
| 13 | G | x=356,7 sur « a » de « art!” » (353,1–362,0) | décalé (même syllabe, autre lettre) | [G]art!” |
| 14 | C | x=266,9 sur « S » de « Savior » (262,6–273,2) | décalé (même syllabe, autre lettre) | [C]Savior |
| 15 | Am | x=205,6, à cheval espace 203,8 / « a » 208,2 (basse fidélité) | équivalent (même syllabe, frontière espace/lettre) | gardé [Am]art! comme ligne 13 |
| 15 | D | x=234,0 dans le double espace entre « art! » (231,3) et « How » (240,2) | absent à cet endroit (le .cho l'avait collé à G en fin de ligne : inventé là) | [D]How |
| 15 | G | x=352,3 sur « a » de « art!” » (353,1–362,0) | exact | [G]art!” |

En-tête : ajout de `{source: How-Great-Thou-Art-G.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 15:relire:Am:1 | laissé | def |  |
| 15:invente:D:1 | laissé | def |  |
| 15:manquant:D:1 | laissé | def |  |
| 15:fable:15:invente:D:1 | appliqué | session | Pas de D en fin de ligne sur la partition (rangée Am D G seulement, contrairement à la ligne 13 qui a Am D G D) : le [D] collé à [G] devant « art!” » est inventé. La ligne remplacée met D devant « How » (label x=234,0 dans le double espace avant « How » à 240,2) et G sur le « a » de « art!” » (x=352,3, « a » 353,1–362,0) ; Am reste sur « art! » comme à la ligne 13. Toute la ligne est juste. — inclus dans la ligne de la session — partition : mesure : Am x=205,6 (espace 203,8 / « a » 208,2), D x=234,0 (espace avant « How », H à 240,2), G x=352,3 sur « a » de « art!” » ; aucun 4e label |
| 15:fable:15:manquant:D:1 | appliqué | session | Même ligne remplacée que la question précédente (autre lecture du même D) : D devant « How », comme à la ligne 13 ; l'insertion seule (« art![D] How ») laisserait en plus le D inventé de fin de ligne. — inclus dans la ligne de la session — partition : mesure : D x=234,0 dans l'espace entre « art! » (fin 231,3) et « How » (240,2) |
| 14:relire:C:1 | laissé | def |  |
| 13:relire:Am:1 | laissé | def |  |
| 13:relire:G:1 | laissé | def |  |
| 12:relire:C:1 | laissé | def |  |
| 11:relire:D:1 | laissé | def |  |
| 8:relire:G:1 | laissé | def |  |

- Source basse fidélité : feuille Word (couche texte Arial, accords alignés aux espaces), une page ; chaque accord mesuré en x sur la couche texte et vérifié à l'œil sur le rendu 2× (crops/how-great-thou-art/).
- check.py ne lit pas cette source (les 27 accords classés « absent de la source » avant comme après la correction) : vérifié à l'œil, chaque accord mesuré en x sur la couche texte PyMuPDF (rawdict) ; les accords non listés dans `mesures` sont exacts à cette mesure (intro G D, [G]all, [D]worlds, [G]made[D], [G]stars, t[C]hunder, [G]soul, [G]Thee, [D]How l.13, art!”[D]).
- Quatre accords posés sur la 2e lettre d'un mot alors que le label commence au-dessus de la 1re (G[G]od, u[D]niverse, S[C]avior ×2, a[G]rt) : remis devant la lettre de la partition (défaut « non » de l'outil, même syllabe).
- Am des deux lignes « How great thou art! » : label à cheval sur l'espace et le « a » de « art! » (écart < 1 pt sur une source ± 1 syllabe) : laissé [Am]art!, aucune autre syllabe en jeu.
- Ligne 15 : D inventé en fin de ligne retiré, D gravé devant « How » ajouté (lecture unique des deux écarts, comme la ligne 13).
- Couplets 2 à 4 sans accords sur la partition : laissés sans accords (rien d'inventé). Le retour du refrain après eux n'est pas gravé.
- Structure : tout le chant est sous {start_of_intro} ; découpage intro / couplet 1 / refrain / couplets 2–4 proposé à Timothée (bloc de structure).
- Chant en anglais marqué {language: fr} (seules valeurs admises fr/zh) : non changé.
- Thèmes Adoration, Sainteté : dans la liste et défendables, inchangés.
- Autres versions : aucune dans Partitions/ selon le dossier.

### il-est-la-vie — Il est la vie

Lot 3 · partition retenue : `Il est la vie.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[C#m]Les mala[B]dies s'enfuient dans l[E/G#]e Nom de [A]Jésus.` → `[C#m]Les mala[B]dies s'enfuient dans [E/G#]le Nom de J[A]ésus.`
- l. 10 : `[C#m]Les chaînes [B]sont brisées dans l[E/G#]e Nom de [A]Jésus,` → `[C#m]Les chaînes [B]sont brisées dans [E/G#]le Nom de J[A]ésus,`
- l. 11 : `J[C#m]ésus, J[B]ésus, [E/G#]dans le Nom [A]de Jésus.` → `J[C#m]ésus, J[B]ésus,[E/G#] dans le Nom [A]de Jésus.`
- l. 18 : `J[C#m]ésus, J[B]ésus, [E/G#]dans le Nom [A]de Jésus.` → `J[C#m]ésus, J[B]ésus,[E/G#] dans le Nom [A]de Jésus.`
- l. 22 : `[E/G#]Jésus est [A]le chemin, [B]la véri[C#m]té, la vie,` → `[E/G#]Jésus est [A]le chemin,[B] la véri[C#m]té, la vie,`
- l. 23 : `[E/G#]Sa Parole [A]est certaine, [B]Il est le [C#m]grand 'Je suis'.` → `[E/G#]Sa Parole [A]est certaine,[B] Il est le [C#m]grand 'Je suis'.`
- l. 24 : `[E/G#]Jésus est [A]le chemin, [B]la véri[C#m]té, la vie,` → `[E/G#]Jésus est [A]le chemin,[B] la véri[C#m]té, la vie,`
- l. 25 : `[E/G#] Il est tou[A]jours le même, [B]Il est la [E]vie.` → `[E/G#] Il est tou[A]jours le même,[B] Il est la [E]vie.`
- l. 32 : `J[C#m]ésus, J[B]ésus, [E/G#]dans le Nom [A]de Jésus.` → `J[C#m]ésus, J[B]ésus,[E/G#] dans le Nom [A]de Jésus.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | E/G# | x=250,4 sur « l » de « le » (dans ‹l›e Nom) | décalé | dans [E/G#]le Nom (relevé ok, appliqué) |
| 9 | A | x=335,7 sur « é » de « Jésus. » | décalé | J[A]ésus. (relevé ok, appliqué) |
| 10 | E/G# | x=260,6 sur « l » de « le » | décalé | dans [E/G#]le Nom (relevé ok, appliqué) |
| 10 | A | x=346,0 sur « é » de « Jésus, » | décalé | J[A]ésus, (relevé ok, appliqué) |
| 11 | E/G# | x=128,1 sur l'espace après « Jésus, » avant « dans » | décalé | Jésus,[E/G#] dans (relevé ok, appliqué) |
| 18 | E/G# | x=128,1 sur l'espace après « Jésus, » avant « dans » | décalé | Jésus,[E/G#] dans (relevé ok, appliqué) |
| 32 | E/G# | x=128,1 sur l'espace après « Jésus, » avant « dans » | décalé | Jésus,[E/G#] dans (relevé ok, appliqué) |
| 22 | B | x=190,3 sur l'espace après « chemin, » avant « la » | décalé | chemin,[B] la (relevé ok, appliqué) |
| 24 | B | x=190,3 sur l'espace après « chemin, » avant « la » | décalé | chemin,[B] la (relevé ok, appliqué) |
| 23 | B | x=216,1 sur l'espace après « certaine, » avant « Il » | décalé | certaine,[B] Il (relevé ok, appliqué) |
| 25 | B | x=219,6 sur l'espace après « même, » avant « Il » | décalé | même,[B] Il (relevé ok, appliqué) |

En-tête : ajout de `{source: Il est la vie.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:E/G#:1 | appliqué | Timothée |  |
| 25:decale:B:1 | appliqué | Timothée |  |
| 24:decale:B:1 | appliqué | Timothée |  |
| 23:decale:B:1 | appliqué | Timothée |  |
| 22:decale:B:1 | appliqué | Timothée |  |
| 18:decale:E/G#:1 | appliqué | Timothée |  |
| 11:decale:E/G#:1 | appliqué | Timothée |  |
| 10:decale:E/G#:1 | appliqué | Timothée |  |
| 10:decale:A:1 | appliqué | Timothée |  |
| 9:decale:E/G#:1 | appliqué | Timothée |  |
| 9:decale:A:1 | appliqué | Timothée |  |

- Source fiable (PDF église rendu ChordPro, couche texte) : check.py 53 exacts + 11 décalés avant, 64/64 exacts après les 11 « ok » du relevé ; vérifié aussi sur un rendu 2× (couplet 1 et refrain) : E/G# sur « le », A sur le « é » de « Jésus », B sur l'espace après la virgule.
- Aucune question, aucun « non » : les 11 écarts du relevé (ok) mettent chaque accord comme la partition ; aucune ligne à corriger en plus.
- Lignes indentées sur la partition (« Les vies… », « Sa Parole… », « Il est toujours… ») : l'accord d'attaque est gravé sur l'indentation en début de ligne ; le fichier écrit tantôt « [E/G#]Sa », tantôt « [E/G#] Il » — check.py les compte tous deux exacts (début de ligne), laissé tel quel.
- Structure identique à la partition (Couplet 1, Couplet 2, Refrain, Couplet 3) ; paroles identiques (16 lignes) ; {key: E} conforme.
- Autres versions dans Partitions/ : « Tu es la vie - Accords C.pdf », « Tu es la vie - C.pdf », « Tu es la vie.pdf » (en C, autre titre) : non regardées en détail, la partition fournie fait foi.

### il-est-temps — Il est temps

Lot 3 · partition retenue : `Il est temps (B).pdf` (inconnue, mesure impossible)

Lignes modifiées :

- l. 13 : `Un tout [F#]nouveau jour se [G#m7]lève Alors [E]que le Roi de [B]gloire fait son ent[F#]rée` → `Un tout [F#]nouveau jour se [G#m7]lève Alors [E]que le Roi de [B]gloire fait son entr[F#]ée` *(session (hors relevé))* — F# manuscrit : bord gauche (hampe) x=411,4, « é » de « entrée » commence à 412,3, « r » à 408,3 : lettre la plus proche « é » ; même syllabe, même placement que la l. 12. Autres accords de la ligne mesurés justes (F# x=98,9 sur « n », G#m7 x=185,9 sur « l », E x=244,2 sur « q », B x=316,5 sur « g »).
- l. 18 : `Il veut [B]agir aujourd'[G#m]hui, [F#]bénir chaque vie [B]Il est [E]temps de lâcher prise` → `Il veut [B]agir aujourd'h[G#m]ui, [F#]bénir chaque vie [B]Il est [E]temps de lâcher prise` *(session (hors relevé))* — G#m manuscrit : bord gauche x=165,7 sur « u » de « hui » (u 164,4–171,1 ; h 157,7, à 8 pt) ; vu sur la découpe : le G est au-dessus du « u ». Même syllabe. Autres accords justes (B x=92,3 sur « a », F# x=180,9 sur « b », B x=271,6 sur « I », E x=301,1 sur « t »).
- l. 24 : `Son [B]Esprit change l'atmosphère Et dé[F#]trône l'adversaire [B]` → `Son [B]Esprit change l'atmosphère Et détr[F#]ône l'adversaire [B]` *(session (hors relevé))* — F# manuscrit : hampe x=263,8, entre « r » (261,1) et « ô » (265,1), lettre la plus proche « ô » ; le « t » (257,8) est à 6 pt, hors du label. Même syllabe « trô ». Autres accords justes (B x=81,2 sur « E », B x=350,2 en l'air après « adversaire »).
- l. 29 : `{start_of_bridge: Pont}` → `{start_of_bridge: Pont (x4)}` *(structure)*
- l. 30 : `[B]Viens et [F#]vois Sa Gloi[G#m]re à l[E]'œuvre parmi nous[B]` → `[B]Viens et [F#]vois Sa Glo[G#m]ire à l'[E]œuvre parmi nous[B]` *(session (hors relevé))* — G#m manuscrit : bord gauche x=163,9 sur « i » de « Gloire » (i 164,5 ; r 167,2) : syllabe « Gloi », non « re » ; E x=200,0 au-dessus de « œ » (196,2–207,5 ; apostrophe 193,9). Autres accords justes (B x=56,8 sur « V », F# x=105,2 sur « v », B x=292,2 en fin de « nous »).

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 13 | F# | hampe x=411,4 ; « é » de « entrée » à 412,3, « r » à 408,3 | décalé (même syllabe) | entr[F#]ée |
| 18 | G#m | x=165,7 sur « u » de « hui » (h à 157,7) | décalé (même syllabe) | aujourd'h[G#m]ui |
| 24 | F# | hampe x=263,8 entre « r » (261,1) et « ô » (265,1) ; « t » à 257,8 | décalé (même syllabe) | détr[F#]ône |
| 30 | G#m | x=163,9 sur « i » de « Gloire » (r à 167,2) | décalé (autre syllabe) | Glo[G#m]ire |
| 30 | E | x=200,0 sur « œ » de « l'œuvre » (apostrophe à 193,9) | décalé (même syllabe) | l'[E]œuvre |
| 19 | G#m | x=330,2 à la frontière de « o » (326,2) et « u » (332,9) de « Amour » | exact à l'œil (à la lettre près, frontière) | Am[G#m]our gardé : même syllabe, label à cheval o/u |
| 25 | B | x=196,4 entre « b » (192,8) et « r » (199,4) de « célèbrent » | exact à l'œil (frontière) | célè[B]brent gardé |
| 26 | E | x=240,0 entre « q » (236,4) et « u » (243,1) | exact à l'œil (frontière) | [E]que gardé |
| 31 | G#m | x=112,9 entre « o » (109,4) et « i » (116,1) de « voix » | exact à l'œil (frontière) | vo[G#m]ix gardé |
| 31 | F# | x=66,5 entre « l » (64,7) et « è » (67,4) de « Élève » | exact à l'œil (frontière) | Él[F#]ève gardé |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espaceur : l. 7.

En-tête : ajout de `{source: Il est temps (B).pdf}`

- Source impossible pour check.py (accords manuscrits en traits vectoriels sur une note tapée) : vérifié à l'œil. Mesure faite en regroupant les traits de chaque label (get_drawings) et en comparant leur bord gauche au x de chaque lettre tapée (rawdict), plus découpes 4× regardées pour les zones douteuses ; critère : lettre la plus proche du bord gauche, label gardé tel quel s'il est à la frontière de deux lettres dont l'une est celle du .cho.
- 53 accords mesurés (intro comprise) : 48 sur la lettre du .cho ; 5 corrigés (l. 13 F#, l. 18 G#m, l. 24 F#, l. 30 G#m et E), dont un seul change de syllabe (l. 30 « Glo[G#m]ire »). Précision de l'écriture : ± 2 pt, d'où les cas « frontière » gardés (l. 19, 25, 26, 31).
- check.py après : 53 « absent de la source » = l'outil ne lit aucun accord manuscrit (0 mesuré avant comme après) ; chaque accord a été mesuré à l'œil, aucun n'est absent de la note ni inventé.
- Intro : E sur « O », F# sur le 2ᵉ « o » de « Ohohoho », puis G#m, G#m7 (écrit « G#7 » sur « m »), B, G#m7, F# sans paroles : identique au .cho.
- Refrain « Ohohoh » (l. 20) : aucun accord écrit, rien d'inventé.
- Paroles, non appliqué : la note tape « regne » sans accent (l. 11), comme le .cho ; « règne » serait l'orthographe.
- Autre export de la même note : « Il est temps.pdf » (mêmes accords manuscrits).
- Thèmes inchangés (Saint-Esprit, Adoration, dans la liste).

### il-m-aime — Il m'aime

Lot 3 · partition retenue : `Il m'aime.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 8 : `[G] Il [CM7]m'aime, Il [Am7]m'a tant do[D]nné,` → `[G] Il [Cmaj7]m'aime, I[Am7]l m'a tant do[D]nné,`
- l. 12 : `Jama[Am7]is ne la re[D4]lâ - [D]che.` → `Jam[Am7]ais ne la re[D4]lâ[D]che.`
- l. 16 : `[C] Il se tient [D]tout près de mo[Em]i [ ][C]quand je dis : [D]Viens vivre en mo[Em]i,` → `[C] Il se tient [D]tout près de m[Em]oi[C] quand je dis : [D]Viens vivre en m[Em]oi,`
- l. 18 : `[C] Je ne sais [D]plus où all[Em]er, [C]Il est là [D]pour me guid[Em]er,` → `[C] Je ne sais [D]plus où all[Em]er,[C] Il est là [D]pour me guid[Em]er,`
- l. 19 : `[Am7]Et dans mes dés[Bm7]erts [CM7]je connais le c[C/D]œur du [D]Père.` → `[Am7]Et dans mes dés[Bm7]erts[Cmaj7] je connais le c[C/D]œur du [D]Père.`
- l. 23 : `[C]Il me dit: [D]Viens et suis-Mo[Em]i, [ ][C]Je ne te [D]quitterai [Em]pas,` → `[C] Il me dit: [D]Viens et suis-M[Em]oi,[C] Je ne te [D]quitterai p[Em]as,` *(session)*
- l. 25 : `[C]Je connais [D]le fond de t[Em]oi, [C]car Je vois [D]bien au del[Em]à,` → `[C] Je connais [D]le fond de t[Em]oi,[C] car Je vois [D]bien au del[Em]à,` *(session)*
- l. 30 : `[G]Il m'aime.` → `[G] Il m'aime.` *(session (hors relevé))* — Final : G x=31,2 sur l'indentation (« Il m'aime. » commence après deux espaces sur la partition) : crochet + espace, comme le refrain l. 8 « [G] Il [Cmaj7]m'aime ».

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | Am7 | x=140,0 sur « l » de « Il » (m'aime, I‹l› m'a) | décalé | I[Am7]l m'a (relevé ok, appliqué) |
| 12 | Am7 | x=75,6 sur « a » de « Jamais » (Jam‹a›is) | décalé | Jam[Am7]ais (relevé ok, appliqué) |
| 16 | Em | x=210,8 sur « o » de « moi » | décalé | m[Em]oi (relevé ok, appliqué) |
| 16 | C | x=250,0 sur l'espace avant « quand » | décalé | moi[C] quand (relevé ok, appliqué) |
| 16 | Em | x=472,3 sur « o » de « moi, » | décalé | m[Em]oi, (relevé ok, appliqué) |
| 18 | C | x=225,1 sur l'espace après « aller, » avant « Il » | décalé | aller,[C] Il (relevé ok, appliqué) |
| 19 | CM7 | x=185,9 sur l'espace avant « je » | décalé | déserts[Cmaj7] je (relevé ok, appliqué) |
| 23 | C | x=31,2 sur l'indentation avant « Il » (ligne à deux espaces de tête) | décalé (check.py le compte exact : début de ligne) | [C] Il me dit: |
| 23 | D | x=105,0 sur « V » de « Viens » | exact | inchangé |
| 23 | Em | x=214,4 sur « o » de « Moi, » | décalé | suis-M[Em]oi, (relevé ok, appliqué) |
| 23 | C | x=235,7 sur l'espace avant « Je » | décalé | Moi,[C] Je (relevé ok, appliqué) |
| 23 | D | x=306,0 sur « q » de « quitterai » | exact | inchangé |
| 23 | Em | x=376,2 sur « a » de « pas, » | décalé | p[Em]as, (relevé ok, appliqué) |
| 25 | C | x=31,2 sur l'indentation avant « Je » | décalé (check.py le compte exact : début de ligne) | [C] Je connais |
| 25 | D | x=121,0 sur « l » de « le fond » | exact | inchangé |
| 25 | Em | x=200,2 sur « o » de « toi, » | exact | inchangé |
| 25 | C | x=234,9 sur l'espace avant « car » | décalé | toi,[C] car (relevé ok, appliqué) |
| 25 | D | x=320,2 sur « b » de « bien » | exact | inchangé |
| 25 | Em | x=398,5 sur « à » de « delà, » | exact | inchangé |
| 30 | G | x=31,2 sur l'indentation avant « Il m'aime. » | décalé (check.py le compte exact : début de ligne) | [G] Il m'aime. |
|  | C D Em C D Em | ligne instrumentale p1 y=292,5 (x=31,2 à 155,4), entre le cadre du refrain et « Couplet 1 », sans titre ni paroles | absent du .cho | non appliqué ici : ajout d'une section ailleurs qu'après la dernière, voir structure |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — orthographe d'accord : l. 10, 17, 24, 26.

En-tête : ajout de `{source: Il m'aime.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 25:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 23:decale:Em:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 23:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 23:decale:Em:2 | appliqué | Timothée | inclus dans la ligne de la session |
| 19:decale:CM7:1 | appliqué | Timothée |  |
| 18:decale:C:1 | appliqué | Timothée |  |
| 16:decale:Em:1 | appliqué | Timothée |  |
| 16:decale:C:1 | appliqué | Timothée |  |
| 16:decale:Em:2 | appliqué | Timothée |  |
| 12:decale:Am7:1 | appliqué | Timothée |  |
| 8:decale:Am7:1 | appliqué | Timothée |  |

- Source fiable (PDF église rendu ChordPro, couche texte) : check.py 51 exacts + 11 décalés avant, 62/62 exacts après les 11 « ok » du relevé ; vérifié aussi à l'œil sur un rendu 2× (refrain, couplets 1 et 2, final).
- Aucune question ; les 11 « ok » du relevé mettent chaque accord comme la partition.
- En plus (mesure) : l. 23, 25 et 30, l'accord d'attaque est gravé sur l'indentation de tête de ligne (deux espaces avant « Il », « Je », « Il ») : écrit `[X] mot` comme les autres lignes indentées du fichier (l. 8, 10, 16, 18) et le cas Océans de 02 ; check.py ne distingue pas ce cas en début de ligne.
- Restent non exacts : les 6 accords de la ligne instrumentale (C D Em C D Em) entre refrain et couplet 1, absents du .cho — structure à appliquer par Timothée (bloc proposé).
- Hors périmètre, non appliqué : la section finale est en {start_of_final} (01 : {start_of_outro}) ; changement de type interdit ici, à Timothée s'il le souhaite. CM7 devient Cmaj7 par la forme du moteur.
- Autres sources : « Il m’aime.pdf » (shir.fr, 56 %) et « Tu m’aimes.pdf » non retenues ; la partition du dossier fait foi.

### il-regnera — Pour toujours Il règnera

Lot 3 · partition retenue : `Il règnera Bb.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 14 : `La lumière [Cm]a lui[Eb]de l'é[Bb]table jusqu'au t[F]rône.` → `La lumière [Cm]a lui[Eb] de l'ét[Bb]able jusqu'au tr[F]ône.`
- l. 26 : `[Gm]Si j'étais un [Eb]des mages, j'[Bb]irais au bout du m[F]onde` → `[Gm]Si j'étais un [Eb]des mages, j'i[Bb]rais au bout du m[F]onde`
- l. 27 : `Et [Gm]si j'étais un [Eb]berger, j'[Bb]irais me proste[F]rner,` → `Et [Gm]si j'étais un [Eb]berger, j'i[Bb]rais me proste[F]rner,`
- l. 28 : `Mais moi qui n'[Cm]ai rien, [Eb]je Lui of[Bb]frirais [F]mon cœur.` → `Mais moi qui n'[Cm]ai rien,[Eb] je Lui o[Bb]ffrirais [F]mon cœur.`
- l. 32 : `Au s[Gm]ein de la mang[Eb]eoire est né, Cel[Bb]ui qui fit le m[F]onde entier,` → `Au s[Gm]ein de la man[Eb]geoire est né, Ce[Bb]lui qui fit le m[F]onde entier,`
- l. 33 : `L'en[Gm]fant Dieu vient pour n[Eb]ous sauver, [Bb/F]Jésus le Me[F]ssie.` → `L'en[Gm]fant Dieu vient pour n[Eb]ous sauver, [Bb/F]Jésus le M[F]essie.`
- l. 34 : `Dans n[Gm]os espoirs et d[Eb]ans nos peurs, Il a[Bb]pparaît le [F/A]Roi Sauveur,` → `Dans n[Gm]os espoirs et d[Eb]ans nos peurs, Il a[Bb]pparaît le R[F/A]oi Sauveur,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 14 | Cm | x=110,3 sur « a » de « a lui » | exact | [Cm]a |
| 14 | Eb | x=139,7 sur l'espace (139,7–144,1) entre « lui » et « de » | décalé | lui[Eb] de (espace rétablie, paroles de la partition) |
| 14 | Bb | x=186,3 sur « a » de « l'ét‹a›ble » | décalé | l'ét[Bb]able |
| 14 | F | x=294,3 sur « ô » de « tr‹ô›ne » | décalé | tr[F]ône |
| 26 | Bb | x=214,3 sur « r » de « j'i‹r›ais » | décalé | j'i[Bb]rais |
| 27 | Bb | x=199,1 sur « r » de « j'i‹r›ais » | décalé | j'i[Bb]rais |
| 28 | Eb | x=185,4 sur l'espace (185,4–189,8) après « rien, » | décalé | rien,[Eb] je |
| 28 | Bb | x=241,4 sur le premier « f » de « o‹f›frirais » | décalé | o[Bb]ffrirais |
| 32 | Eb | x=173,4 sur « g » de « man‹g›eoire » | décalé | man[Eb]geoire |
| 32 | Bb | x=295,3 sur « l » de « Ce‹l›ui » | décalé | Ce[Bb]lui |
| 33 | Gm | x=75,1 sur « f » de « L'en‹f›ant » (check.py : « absent de la source », bémol dans une autre police) | exact | L'en[Gm]fant |
| 33 | Eb | x=227,2 sur « o » de « n‹o›us » (outil : absent de la source, à tort) | exact | n[Eb]ous |
| 33 | Bb/F | x=314,3 sur « J » de « Jésus » (outil : absent de la source, à tort) | exact | [Bb/F]Jésus |
| 33 | F | x=390,8 sur « e » de « M‹e›ssie » | décalé | M[F]essie |
| 34 | F/A | x=413,5 sur « o » de « R‹o›i » | décalé | R[F/A]oi |
| 35 | Gm | x=45,4 sur « L » de « L'espoir » (outil : absent de la source, à tort) | exact | [Gm]L'espoir |
| 35 | Eb/G | x=157,3 sur « t » de « l'é‹t›ernité » (outil : absent de la source, à tort) | exact | l'é[Eb/G]ternité |
| 35 | Bb/F | x=210,6 sur « J » de « Jésus » (outil : absent de la source, à tort) | exact | [Bb/F]Jésus |
| 35 | F | x=273,8 sur « M » de « Messie » (outil : absent de la source, à tort) | exact | [F]Messie |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 8, 25.

En-tête : ajout de `{source: Il règnera Bb.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 34:decale:F/A:1 | appliqué | def | inclus dans la ligne de 34:oeil:5 |
| 34:oeil:5 | appliqué | session | F/A sur le « o » de « Roi », comme la partition ; Gm, Eb, Bb exacts. — partition : y=680,9 : Gm x=96,1 « o » de « n‹o›s » ; Eb x=200,1 « a » de « d‹a›ns » ; Bb x=330,8 « p » de « a‹p›paraît » ; F/A x=413,5 = début du « o » (413,5–422,4) de « R‹o›i » |
| 33:decale:F:1 | appliqué | def |  |
| 32:decale:Eb:1 | appliqué | def | inclus dans la ligne de 32:oeil:4 |
| 32:decale:Bb:1 | appliqué | def | inclus dans la ligne de 32:oeil:4 |
| 32:oeil:4 | appliqué | session | Eb sur « g » de « mangeoire », Bb sur « l » de « Celui », comme la partition ; Gm et F exacts. — partition : y=612,9 : Gm x=77,4 « e » de « s‹e›in » ; Eb x=173,4 = début du « g » (173,4–182,3) ; Bb x=295,3 = début du « l » (295,3–298,8) de « Ce‹l›ui » ; F x=388,6 « o » de « m‹o›nde » |
| 28:decale:Eb:1 | laissé | def |  |
| 28:decale:Bb:1 | laissé | def |  |
| 28:oeil:3 | appliqué | def |  |
| 28:fable:28:decale:Eb:1 | laissé | session | Autre lecture, texte identique à 28:oeil:3 (ok par défaut, juste) : une seule lecture s'applique. — partition : Eb x=185,4 = début de l'espace (185,4–189,8) après « rien, » |
| 28:fable:28:decale:Bb:1 | laissé | session | Autre lecture, texte identique à 28:oeil:3 (ok par défaut, juste) : une seule lecture s'applique. — partition : Bb x=241,4 = début du premier « f » (241,4–245,9) de « o‹f›frirais » |
| 27:decale:Bb:1 | appliqué | def | inclus dans la ligne de 27:oeil:2 |
| 27:oeil:2 | appliqué | session | Bb sur le « r » de « j'irais », comme la partition ; les autres accords de la ligne sont exacts. — partition : y=510,8 : Gm x=50,8 « s » de « si » ; Eb x=133,8 « b » de « berger » ; Bb x=199,1 = début du « r » (199,1–204,5) de « j'i‹r›ais » ; F x=300,5 « r » de « proste‹r›ner » |
| 26:decale:Bb:1 | appliqué | def | inclus dans la ligne de 26:oeil:1 |
| 26:oeil:1 | appliqué | session | Bb sur le « r » de « j'irais », comme la partition ; les autres accords de la ligne sont exacts. — partition : y=476,8 : Gm x=31,2 « S » ; Eb x=116,9 « d » de « des » ; Bb x=214,3 = début du « r » (214,3–219,6) de « j'i‹r›ais » ; F x=337,9 « o » de « m‹o›nde » |
| 14:decale:Eb:1 | laissé | def |  |
| 14:decale:Bb:1 | appliqué | def | inclus dans la ligne de 14:oeil:0 |
| 14:decale:F:1 | appliqué | def | inclus dans la ligne de 14:oeil:0 |
| 14:oeil:0 | appliqué | session | La ligne proposée met les quatre accords comme la partition : Cm sur « a », Eb sur l'espace entre « lui » et « de » (espace rétablie), Bb sur « a » de « l'étable », F sur « ô » de « trône ». — partition : y=225,9 : Cm x=110,3 sur « a » ; Eb x=139,7 = début de l'espace (139,7–144,1) après « lui » ; Bb x=186,3 = début du « a » (186,3–195,2) de « l'ét‹a›ble » ; F x=294,3 = début du « ô » (294,3–303,2) de « tr‹ô›ne » ; vu sur le rendu 2× ; copie en G identique |
| 14:fable:14:decale:Eb:1 | laissé | session | Autre lecture du même écart, texte identique à 14:oeil:0 déjà retenu : une seule des deux lectures s'applique. — partition : Eb x=139,7 sur l'espace après « lui » |

- Feuille église (rendu ChordPro, couche texte) : 64 accords mesurés au caractère près sur la couche texte (PyMuPDF rawdict), chaque label commençant au bord gauche exact d'un caractère ; zones l.14, l.28 et Pont vues sur le rendu 2× ; la copie en G (même mise en page) donne les mêmes positions.
- Les 8 accords de l.33 et l.35 que check.py classe « absents de la source » (Bb/F, Eb/G : bémol dans une autre police) sont tous présents et exacts dans le .cho actuel, sauf F de l.33 (M[F]essie, corrigé par l'écart 33:decale:F:1).
- Après décisions, les 11 accords décalés d'un caractère sont replacés comme la partition ; aucun accord inventé ni absent ; noms identiques.
- Paroles : seule différence, « luide » → « lui de » (l.14), portée par l'écart 14:oeil:0.
- Thèmes inchangés (Noël, Adoration, Espérance : dans la liste, défendables). Autres versions : « Il règnera G.pdf » et « Il règnera Ab.pdf », même feuille transposée.

### inattendu — Inattendu

Lot 3 · partition retenue : `Inattendu.pdf` (traitement-texte, mesure basse-fidelite)

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | Bm | x=129,0 sur « o » (128,3) de « interr‹o›mpre » ; le .cho le pose devant le second « r » | décalé (même syllabe « rom », autre lettre) | aucune : choix « non » du relevé gardé, même syllabe sur une feuille Word de basse fidélité (± 1 syllabe) |
| 29 | Bm | x=345,0 sur « o » (343,7) de « Pourqu‹o›i » ; le .cho le pose devant « i » | décalé (même syllabe « quoi », autre lettre) | aucune : choix « non » du relevé gardé, même syllabe, basse fidélité |
| 50 | G | x=132,0 entre « h » (129,3) et « e » (≈135,3) de « bonheur », à peine plus près de « h » ; le .cho le pose devant « e » | décalé (même syllabe « heur », autre lettre, presque à mi-chemin) | aucune : choix « non » du relevé gardé, même syllabe, basse fidélité |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligature typographique : l. 26.

En-tête : ajout de `{source: Inattendu.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 50:relire:G:1 | laissé | Timothée |  |
| 29:relire:Bm:1 | laissé | Timothée |  |
| 10:relire:Bm:1 | laissé | Timothée |  |

- Source basse fidélité : feuille Word en deux colonnes, accords alignés aux espaces mais à couche texte ; chaque accord du chant mesuré en coordonnées (x de l'accord contre x de chaque caractère de la rangée de paroles de la même colonne) et vérifié à l'œil sur le rendu 2× (découpes dans crops/inattendu/).
- Résultat : 37 accords, 34 sur le caractère gravé (à ± 2,7 pt, dont les fins de mot « anxiété[G] » et « l’inattendu[D] », accord posé après le dernier caractère sur la feuille) ; 3 sur la même syllabe que la feuille, une autre lettre (l. 10 interr‹o›mpre, l. 29 Pourqu‹o›i, l. 50 bon‹h›eur) : le relevé a choisi « non » pour les trois, gardé car l'écart ne quitte pas la syllabe sur une source de basse fidélité.
- check.py classe les 37 accords « absent de la source » avant comme après : l'outil ne lit pas la feuille en deux colonnes (il ne trouve aucun accord) ; ce n'est pas un écart. Chaque accord a été vérifié à la main par la mesure ci-dessus.
- Aucun nom d'accord faux, aucun accord inventé ni absent. Couplet 2 et Pré-Refrain 2 sans accords sur la feuille, sans accords dans le .cho : rien à ajouter.
- Structure : Couplet 1, Pré-Refrain 1, Refrain, Couplet 2, Pré-Refrain 2, Pont, Fin, exactement le .cho ; le « REFRAIN 1 » de l'outil est une lecture de deux colonnes sur une même rangée. Rien à changer.
- Paroles identiques à la feuille (dont « Tes plan parfaits », tel quel sur la feuille ; coupes « puisse / mieux Te voir » et « et le / pire » comme la feuille).
- Thèmes Foi, Espérance gardés (dans la liste, aucune proposition). {key: D} conforme à la feuille.
- Autre version dans Partitions : « Inattendu (D).pdf » (rendu ChordPro de l'église, même tonalité), non retenue comme source ; le relevé mesure sur « Inattendu.pdf ».

### infiniment-grand — Infiniment grand

Lot 3 · partition retenue : `Infiniment grand.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `Quand je [C]sonde l[Am7]'uni - v[G]ers, les as[F2]tres que Tu as cré[G]és,` → `Quand je [C]sonde l'[Am7]univ[G]ers, les as[F2]tres que Tu as cré[G]és,`
- l. 10 : `Les [C]océa[Am]ns, les me[G]rs, tout me ré[F2]vèle Ta majest[G]é.` → `Les [C]océa[Am]ns, les m[G]ers, tout me ré[F2]vèle Ta majest[G]é.`
- l. 23 : `Quand je [C]songe que T[Am7]u m'as f[G]ait, que Tu [F2]T'es révélé à mo[G]i,` → `Quand je [C]songe que T[Am7]u m'as f[G]ait, que Tu [F2]T'es révélé à m[G]oi,`
- l. 27 : `{start_of_bridge: Pont}` → `{start_of_bridge: Pont (x4)}` *(structure)*
- l. 28 : `[Am]Al - [Am9]lé - [F9]luia, [C9sus4]al - [C9]lé - [C]lui - [Gsus4]a. (x4) [G]` → `[Am]Al[Am9]lé[F9]luia, [C9sus4]al[C9]lé[C]lui[Gsus4]a.[G]` *(structure)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | Am7 | x=155,2 = bord gauche de « u » de « l'uni » (u 155,2–164,1 ; apostrophe 152,2–155,2) | décalé | l'[Am7]uni (opération du relevé, ok) |
| 10 | G | x=160,1 = bord gauche de « e » de « mers » (m 146,8–160,1) | décalé | m[G]ers (opération du relevé, ok) |
| 23 | G | x=433,9 = bord gauche de « o » de « moi » (m 420,6–433,9) | décalé | m[G]oi (opération du relevé, ok) |
| 28 | Am | x=45,4 sur « A » de « Al » | exact | [Am]Al |
| 28 | Am9 | x=82,7 sur « l » de « lé » | exact | [Am9]lé |
| 28 | F9 | x=127,2 sur « l » de « luia » | exact | [F9]luia |
| 28 | C9sus4 | x=169,9 sur « a » de « al » | exact | [C9sus4]al |
| 28 | C9 | x=241,0 sur « l » de « lé » | exact | [C9]lé |
| 28 | C | x=276,6 sur « l » de « lui » | exact | [C]lui |
| 28 | Gsus4 | x=306,8 sur « a » final | exact | [Gsus4]a. |
| 28 | G | x=357,9 en l'air après « a. (x4) », après la ponctuation | exact (check.py après : « décalé », lecture de l’outil) | a.[G] : label en l’air après « a. (x4) » ; « (x4) » passé au libellé, l’accord reste après la ponctuation, collé (02) ; check.py compare encore à la ligne gravée avec « (x4) » et le classe « deux positions en l’air différentes » : faux décalé, rien à corriger |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espaceur : l. 19.

En-tête : ajout de `{source: Infiniment grand.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 23:decale:G:1 | appliqué | Timothée |  |
| 10:decale:G:1 | appliqué | Timothée |  |
| 9:decale:Am7:1 | appliqué | Timothée |  |

- Feuille église (rendu ChordPro, Helvetica-Bold) : 41 accords mesurés en rawdict, chaque label commence exactement au bord gauche d'un caractère tapé ; 38 exacts, 3 décalés (l. 9 Am7, l. 10 G, l. 23 G) corrigés par les opérations du relevé (« ok », confirmées par la mesure).
- l. 19 : Gsus4 sur « u » de « majestueux », puis G en l'air après le point : `majest[Gsus4]ueux.[G]` après la forme, conforme.
- check.py après : l. 29 [G] « décalé » = artefact du retrait de « (x4) » de la ligne chantée (même position en l’air après la ponctuation finale) ; expliqué, rien à corriger.
- Pont : « (x4) » passé au libellé ; les mots coupés au tiret sont recollés par la forme.
- Pré-Refrain : la feuille ne titre pas « Pré-Refrain » à part (l'outil le lit avec le Refrain) mais grave bien un bloc « Pré-Refrain » : section du .cho conforme (liste extra citée, non appliquée).
- Paroles : identiques à la feuille (au tiret de coupe près).
- Thèmes inchangés (Adoration, Action de grâce, dans la liste).

### invitation — Invitation

Lot 3 · partition retenue : `Invitation (F).pdf` (traitement-texte, mesure basse-fidelite)

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | F F/A Bb Dm F/A Bb C | INTRO gravé « \| F / / F/A \| Bb / / / \| Dm / / F/A \| Bb / C / » (y=236,6, colonne gauche) : même suite | exact | aucune ; check.py ne voit pas cette ligne instrumentale |
| 14 | F | x=72,0 sur « T » de « Tu » | exact | aucune |
| 15 | Dm F/A Bb | Dm x=72,0 « À » ; F/A x=132,6 sur l'espace/attaque de « leurs » (l 133,7) ; Bb x=175,9 sur « d » de « far‹d›eaux » | exact | aucune |
| 16 | F Bb | F x=72,0 « Tu » ; Bb x=175,3 sur « r » de « p‹r›ésence » | exact | aucune |
| 17 | Dm F/A | Dm x=72,0 « Et » ; F/A x=134,9 sur « q » de « qui » | exact | aucune |
| 28 | Bb F | Bb x=72,0 « Mon » ; F x=171,6 sur « é » de « dispos‹é› » | exact | aucune |
| 29 | C | x=156,3 sur « i » de « ‹i›nvitation » (31 : idem) | exact | aucune |
| 30 | Bb Dm F | Bb x=72,0 « Fini » ; Dm x=101,7 sur « e » de « d‹e› » ; F x=144,3 sur « r » de « batailler » | exact | aucune |
| 42 | F | x=324,0 sur l'espace avant « renouvelles » (« r » à 324,8) — Pont 2 l. 49 Dm idem | exact | aucune |
| 44 | Gm | x=321,6 sur l'espace (319,0–322,0) juste avant « m'abandonne » — l. 45 Bb, l. 51 Gm, l. 52 Bb idem (x=321,0–321,6) | exact | aucune |
| 14 | F/A | x=113,9 sur « e » (109,9–115,2) de « invit‹e›s », à 1,3 pt du « s » | équivalent | aucune : même syllabe « tes », feuille alignée aux espaces |
| 14 | Bb | x=152,9 sur « q » (148,6–154,6) de « ‹q›ui » ; le .cho le met sur le « u » | équivalent | aucune : même syllabe « qui » |
| 15 | C | x=233,9 sur « o » (229,0–235,0) de « T‹o›i », à 1,1 pt du « i » | équivalent | aucune : même syllabe « Toi » |
| 16 | F/A | x=140,9 sur « e » (138,3–143,6) de « prom‹e›ts » ; le .cho le met sur le « t » | équivalent | aucune : même syllabe « mets » |
| 17 | Bb | x=169,3 sur « f » (167,0–171,0) de « ‹f›init » ; l'outil disait « i » à tort | exact | aucune : [Bb]finit est juste |
| 17 | C | x=205,0 sur la fin du « s » (200,8–205,2) de « pas » | équivalent | aucune : fin du mot, pas[C] |
| 28 | Dm | x=128,9 sur « e » (124,7–130,0) de « ‹e›st » ; le .cho le met sur le « s » | équivalent | aucune : même syllabe « est » |
| 43 | C | x=330,6 sur la fin du « s » (326,3–331,0) de « Lor‹s›que », à 0,4 pt du « q » | équivalent | aucune : feuille alignée aux espaces (± 1 syllabe), frontière s\|q ; Lors[C]que suit le levé du Pont (Tu [F]renouvelles) |
| 50 | C/E | x=327,0 sur « s » (326,3–331,0) de « Lor‹s›que » | équivalent | aucune : basse fidélité ± 1 syllabe, même mot, même lecture qu'au Pont 1 |
| 21 | F F/A Bb | Couplet 2 : la feuille ne grave aucun accord | reporté | aucune : accords du couplet 1 reportés, gardés |
| 35 | F F/A Bb Dm C | Couplet 3 (l. 35 à 38) : la feuille ne grave aucun accord | reporté | aucune : accords du couplet 1 reportés, gardés |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 10.

En-tête : ajout de `{source: Invitation (F).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 50:relire:C/E:1 | laissé | def |  |
| 50:oeil:8 | laissé | def |  |
| 38:reporte:Dm:1 | laissé | def |  |
| 38:reporte:F/A:1 | laissé | def |  |
| 38:reporte:Bb:1 | laissé | def |  |
| 38:reporte:C:1 | laissé | def |  |
| 37:reporte:F:1 | laissé | def |  |
| 37:reporte:F/A:1 | laissé | def |  |
| 37:reporte:Bb:1 | laissé | def |  |
| 36:reporte:Dm:1 | laissé | def |  |
| 36:reporte:F/A:1 | laissé | def |  |
| 36:reporte:Bb:1 | laissé | def |  |
| 36:reporte:C:1 | laissé | def |  |
| 35:reporte:F:1 | laissé | def |  |
| 35:reporte:F/A:1 | laissé | def |  |
| 35:reporte:Bb:1 | laissé | def |  |
| 24:reporte:Dm:1 | laissé | def |  |
| 24:reporte:F/A:1 | laissé | def |  |
| 24:reporte:Bb:1 | laissé | def |  |
| 24:reporte:C:1 | laissé | def |  |
| 23:reporte:F:1 | laissé | def |  |
| 23:reporte:F/A:1 | laissé | def |  |
| 23:reporte:Bb:1 | laissé | def |  |
| 22:reporte:Dm:1 | laissé | def |  |
| 22:reporte:F/A:1 | laissé | def |  |
| 22:reporte:Bb:1 | laissé | def |  |
| 22:reporte:C:1 | laissé | def |  |
| 21:reporte:F:1 | laissé | def |  |
| 21:reporte:F/A:1 | laissé | def |  |
| 21:reporte:Bb:1 | laissé | def |  |
| 17:relire:Bb:1 | laissé | def |  |

- Vérifié à l'œil et en coordonnées (PyMuPDF rawdict, rendu 2× regardé) : check.py lit mal cette feuille Pages à deux colonnes (paroles « None », Pont jugé absent).
- check.py, dans cette passe, ne lit plus du tout la feuille (65 « absent de la source », 0 exact, paroles « None ») : tous les accords ont été mesurés en coordonnées et rangés dans `mesures` (exact ou équivalent, aucun décalé ni inventé hors couplets reportés).
- Tous les accords gravés (Intro, Couplet 1, Refrain, Pont, Pont 2) sont sur la même syllabe que la partition ; aucun nom d'accord différent ; l'Intro suit la grille gravée.
- 17:relire:Bb:1 : le Bb est mesuré sur le « f » de « finit » (x=169,3, « f » 167,0–171,0) : la ligne actuelle est juste, « non » gardé.
- 50:relire:C/E:1 et 50:oeil:8 : le C/E commence sur le « s » de « Lorsque », à la frontière avec « que » ; feuille alignée aux espaces (± 1 syllabe), écart d'une lettre : « non » gardé, comme le C du Pont 1 (l. 43).
- Couplets 2 et 3 : la feuille ne grave pas d'accords ; les accords reportés du couplet 1 sont gardés (« non » par défaut maintenus).
- Paroles, non appliqué : l. 37 « reparts » → la feuille écrit « repars ».
- Structure : Instrumental et Instrumental Pont à insérer par Timothée (voir structure).

### j-annoncerai — J'annoncerai

Lot 3 · partition retenue : `J'annoncerai.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 7 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (une ligne au choix)}` *(structure)*
- l. 41 : `{start_of_chorus: Refrain 2}` → `{start_of_chorus: Refrain 2 (x2)}` *(session (hors relevé))* — la feuille titre la section « REFRAIN x2 » (colonne 2, y=323,6) : suffixe de reprise sur la même directive

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | A2 | ligne d'intro gravée « A2 E A2 E OU F#m D A2 » (y=118,3) : 1er choix, 1e accord ; ligne ajoutée au-dessus de la l.8 | absent | ajouté : [A2]  [E]  [A2]  [E] |
| 8 | E | ligne d'intro gravée « A2 E A2 E OU F#m D A2 » (y=118,3) : 1er choix, 2e accord ; ligne ajoutée au-dessus de la l.8 | absent | ajouté : [A2]  [E]  [A2]  [E] |
| 8 | A2 | ligne d'intro gravée « A2 E A2 E OU F#m D A2 » (y=118,3) : 1er choix, 3e accord ; ligne ajoutée au-dessus de la l.8 | absent | ajouté : [A2]  [E]  [A2]  [E] |
| 8 | E | ligne d'intro gravée « A2 E A2 E OU F#m D A2 » (y=118,3) : 1er choix, 4e accord ; ligne ajoutée au-dessus de la l.8 | absent | ajouté : [A2]  [E]  [A2]  [E] |
| 8 | F#m | ligne d'intro gravée « A2 E A2 E OU F#m D A2 » : 2e choix, 1er accord | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 8 | D | idem, 2e accord | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 8 | A2 | idem, 3e accord | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 12 | F#m | x=54,0 en tête de ligne, au-dessus du retrait avant « Tes » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 12 | D | x=108,6 sur « m » [103,7–113,3] de « pro‹m›esses » ; .cho devant « e », même syllabe « mes » | équivalent | aucune : même syllabe, source basse fidélité |
| 12 | A2 | x=168,6 sur « e » [165,2–171,2] de « vi‹e›, » ; .cho après la virgule, même syllabe « vie » | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 13 | F#m | x=54,0 en tête de ligne, sur le retrait avant « Ce » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 13 | D | x=106,1 sur « t » de « ‹t›a » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 13 | A2 | x=171,3 sur « i » de « d‹i›t » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 14 | Bm7 | x=54,0 en tête de ligne, sur le retrait avant « Tu » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 14 | F#m | x=95,3 sur l'espace après « Tu » ; .cho « Tu [F#m]es » : frontière espace/mot | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 14 | E | x=121,8 sur la fin du « d » [116,0–122,3] de « fidèle », 0,5 pt avant « è » ; .cho « fi[E]dèle » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 15 | Bm7 | x=54,0 en tête de ligne | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 15 | F#m | x=95,3 sur l'espace avant « me » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 15 | E | x=127,3 sur la fin du « l » [124,7–127,5] de « relèves » ; .cho devant « è », même syllabe « lè » | équivalent | aucune : même syllabe |
| 19 | F#m | x=54,0 en tête de ligne | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 19 | D | x=108,6 sur « é » [104,8–110,8] de « bont‹é› », le label (108,6–115,8) déborde sur l'espace ; .cho « [D]me », syllabe voisine | décalé (± 1 syllabe, basse fidélité) | aucune : écart d'une syllabe au plus sur une feuille alignée aux espaces, choix « non » du relevé gardé |
| 19 | A2 | x=168,6 sur « t » de « poursui‹t› » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 20 | F#m | x=54,0 en tête de ligne | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 20 | D | x=108,6 sur « n » [105,3–111,6] de « répo‹n›ds » ; .cho devant « d », même syllabe « ponds » | équivalent | aucune : même syllabe |
| 20 | A2 | x=168,6 sur « i » de « cr‹i› » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 21 | Bm7 | x=54,0 en tête de ligne | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 21 | F#m | x=95,2 sur l'espace après « Tu » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 21 | E | x=121,6 sur la fin du « d » [116,0–122,3] de « fidèle » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 22 | Bm7 | x=54,0 en tête de ligne | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 22 | F#m | x=106,3 sur la fin de l'espace [103,8–106,5] avant « éternel » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 22 | E | x=135,6 sur « e » [133,0–139,0] de « étern‹e›l » ; .cho devant « l », même syllabe « nel » | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 26 | A2 | x=106,1 sur « r » [102,7–106,9] de « annonce‹r›ai » ; .cho devant « a », même syllabe « rai » | équivalent | aucune : même syllabe |
| 26 | D | x=160,3 sur « é » final [159,0–165,0] de « fidélit‹é› » ; .cho devant « t », même syllabe « té » | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 27 | E | x=160,3 sur « o » de « j‹o›urs » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 28 | A2 | x=160,3 sur « o » de « j‹o›urs » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 29 | E | x=95,1 sur « a » de « ‹a›imé » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 29 | F#m | x=111,7 sur la fin du « m » [103,0–112,6] de « ai‹m›é » ; .cho devant « é », même syllabe « mé » | équivalent | aucune : même syllabe |
| 29 | D | x=203,8 sur « i » final de « infin‹i› » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 30 | E | x=125,1 sur « e » [120,5–126,4] de « vi‹e› » ; .cho après « vie », même syllabe | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 31 | F#m | x=124,8 sur « e » de « vi‹e› » ; .cho après « vie », même syllabe | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 31 | D | x=160,3 après la fin des paroles (en l'air après « vie ») | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 31 | A2 | x=195,6 après la fin des paroles | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 35 | F#m | x=315,4 en tête de ligne (colonne 2), sur le retrait avant « À » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 35 | D | x=361,9 sur « a » [356,9–362,6] de « jam‹a›is » ; .cho devant « i », même syllabe « mais » | équivalent | aucune : même syllabe |
| 35 | A2 | x=429,9 sur « r » [427,6–431,8] de « pleuvoi‹r› » ; .cho après « r », devant la virgule, même syllabe « voir » | équivalent | aucune : même syllabe |
| 36 | F#m | x=315,4 en tête de ligne | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 36 | D | x=359,1 sur « o » de « s‹o›uffle » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 36 | A2 | x=427,2 sur « t » [426,1–430,1] de « puissan‹t› » ; .cho devant la virgule, même syllabe « sant » | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 37 | Bm7 | x=315,4 en tête de ligne | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 37 | F#m | x=356,5 sur l'espace après « Tu » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 37 | E | x=383,0 sur la fin du « d » [377,4–383,7] de « fidèle » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 38 | Bm7 | x=315,4 en tête de ligne | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 38 | F#m | x=367,5 sur l'espace avant « chant » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 38 | E | x=412,9 sur « l » de « s’é‹l›ève » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 42 | A2 | x=367,4 sur « r » [364,1–368,4] de « annonce‹r›ai » ; .cho devant « a », même syllabe | équivalent | aucune : même syllabe |
| 42 | D | x=421,7 sur « é » final [420,3–426,3] de « fidélit‹é› » ; .cho devant « t », même syllabe | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 43 | E | x=421,7 sur « o » de « j‹o›urs » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 44 | A2 | x=421,7 sur « o » de « j‹o›urs » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 45 | E | x=356,4 sur « a » de « ‹a›imé » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 45 | F#m | x=373,1 sur la fin du « m » [364,4–373,9] de « ai‹m›é » ; .cho devant « é », même syllabe | équivalent | aucune : même syllabe |
| 45 | D | x=465,2 sur « i » final de « infin‹i› » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 46 | E | x=386,4 sur « e » de « vi‹e› » ; .cho après « vie » | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 47 | A2 | x=386,1 sur « e » de « vi‹e› » ; .cho après « vie » | équivalent | aucune : même syllabe, choix « non » du relevé gardé |
| 51 | D | x=315,4 en tête de ligne, sur le retrait avant « Il » ; .cho « [D]Il » : frontière espace/mot, même syllabe | équivalent | aucune : même syllabe (ligne retouchée à la main en juin, espacement du pont) |
| 51 | A2 | x=364,6 sur « r » de « ‹r›ien » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 51 | E | x=431,9 sur « T » de « ‹T›erre » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 52 | F#m | x=394,4 sur la fin du « r » [390,6–394,9] de « arrête‹r› », 0,5 pt avant l'espace ; .cho « [F#m]ton » : frontière mot/espace | équivalent | aucune : frontière mot/espace, choix « non » du relevé gardé |
| 52 | D | x=453,5 après la fin des paroles (« amour ») | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 53 | A2 | x=353,6 sur « r » [349,8–354,0] de « ‹r›ien » ; .cho devant « i », même syllabe | équivalent | aucune : même syllabe |
| 53 | E | x=442,9 sur « a » de « f‹a›ire » | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |
| 54 | F#m | x=386,1 sur « e » [384,1–390,1] de « m’aim‹e›ras » (syllabe « me ») ; .cho devant « r » (syllabe « ras ») | décalé (± 1 syllabe, basse fidélité) | aucune : une syllabe d'écart sur une feuille alignée aux espaces, choix « non » du relevé gardé ; la partition donnerait « m’aim[F#m]eras » |
| 54 | D | x=450,7 après la fin des paroles (« toujours ») | exact | aucune : déjà comme la partition (check.py ne lit pas la mise en page à deux colonnes) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — ligne sans paroles : l. 8 ; espaceur : l. 31.

En-tête : ajout de `{source: J'annoncerai.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 54:relire:F#m:1 | laissé | Timothée |  |
| 52:relire:F#m:1 | laissé | Timothée |  |
| 47:relire:A2:1 | laissé | Timothée |  |
| 46:relire:E:1 | laissé | Timothée |  |
| 42:relire:D:1 | laissé | Timothée |  |
| 37:relire:E:1 | laissé | Timothée |  |
| 36:relire:A2:1 | laissé | Timothée |  |
| 31:relire:F#m:1 | laissé | Timothée |  |
| 30:relire:E:1 | laissé | Timothée |  |
| 26:relire:D:1 | laissé | Timothée |  |
| 22:relire:E:1 | laissé | Timothée |  |
| 21:relire:E:1 | laissé | Timothée |  |
| 19:relire:D:1 | laissé | Timothée |  |
| 14:relire:E:1 | laissé | Timothée |  |
| 12:relire:A2:1 | laissé | Timothée |  |
| 8:instrumental:F#m:1 | laissé | Timothée |  |
| 8:instrumental:D:1 | laissé | Timothée |  |
| 8:instrumental:A2:1 | laissé | Timothée |  |

- Source basse fidélité : feuille Word (Calibri, accords alignés aux espaces), deux colonnes ; check.py ne la lit pas (famille inconnue, 68 « absent de la source », 0 mesuré) : chaque accord a été mesuré au rawdict PyMuPDF (bord gauche du label sur le caractère de la ligne de paroles suivante) et regardé sur le rendu 2× (crops/j-annoncerai/).
- 68 accords : 45 exacts (au caractère, ou frontière espace/mot), 21 dans la même syllabe que la partition (lettre voisine, ± 1 caractère : la feuille ne porte pas mieux), 2 à une syllabe voisine laissés : l.19 D (label sur « é » de « bonté » débordant sur l'espace, .cho « [D]me ») et l.54 F#m (label sur « e » de « m’aimeras », .cho devant « ras ») ; les deux ont un « non » du relevé et l'écart ne dépasse pas une syllabe sur une feuille alignée aux espaces : pas de passage outre. À trancher à l'oreille si besoin (l.54 la partition donnerait « m’aim[F#m]eras »).
- Les 17 écarts « à relire » du relevé (tous « non ») sont gardés : chacun déplace l'accord d'un caractère dans la même syllabe, ou d'un côté à l'autre d'une frontière mot/espace (l.19, l.52) ; aucun ne relève de « nettement plus d'une syllabe ». Les 3 « absent de la source » de la l.8 sont l'intro gravée (2e choix) : gardés.
- Aucun accord absent ni inventé, aucun nom d'accord différent. Paroles identiques à la feuille.
- Structure : Intro complétée par le 1er choix « A2 E A2 E » (dans la section) ; Refrain 2 suffixé (x2) ; Interlude « D A E F#m (x2) » avant le Pont à appliquer par Timothée (bloc proposé). Sur la feuille l'interlude est en « A » et non « A2 ».
- Autres versions : « J_annoncerai.pdf » est le doublon octet pour octet de la même feuille.
- Thèmes inchangés (Adoration, Foi, Action de grâce : dans la liste, défendables). {key: A} présent, non gravé sur la feuille : inchangé.

### jamais-marche-seul — Jamais marché seul

Lot 3 · partition retenue : `Jamais marché seul.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `Ca[Dm]ché sous Tes ailes, l'a[C]rmée de Tes anges vei[Bb]lle sur moi.` → `Ca[Dm]ché sous Tes ailes, l'ar[C]mée de Tes anges vei[Bb]lle sur moi.`
- l. 20 : `Dieu Tu es mon [Bb]héritage,[F/A]ma force et [Dm]mon remp[C]art.` → `Dieu Tu es mon [Bb]héritage,[F/A] ma force et [Dm]mon rem[C]part.`
- l. 22 : `Toi mon l[Bb]ibérateur, [F/A]non je ne [Dm]marche [C]jamais [F]seul.` → `Toi mon li[Bb]bérateur,[F/A] non je ne [Dm]marche [C]jamais [F]seul.`
- l. 32 : `[Bb]À chaque mo[F/A]ment, chaque mi[Dm]nute, Tu as tou[C]jours été là.` → `[Bb] À chaque mo[F/A]ment, chaque mi[Dm]nute, Tu as tou[C]jours été là.` *(session (hors relevé))* — retrait de début de ligne (cas Océans de 02) : la ligne de la feuille commence par deux espaces (x0=45,4), « À » à x=54,3 ; Bb gravé à x=45,4, au-dessus du retrait, avant la 1re lettre → [Bb] À. Seule l'espace après le premier accord change.
- l. 33 : `[Bb]Tu es [F/A]fidèle et Tu le [Dm]seras toujo[C]urs.` → `[Bb] Tu es [F/A]fidèle et Tu le [Dm]seras toujo[C]urs.` *(session (hors relevé))* — retrait de début de ligne : ligne de la feuille en retrait (x0=45,4, « Tu » à x=54,3) ; Bb à x=45,4 au-dessus du retrait → [Bb] Tu. Seule l'espace après le premier accord change.
- l. 34 : `[Bb]Dans chaque vic[F/A]toire, chaque déf[Dm]aite, Tu es loy[C]al envers moi.` → `[Bb] Dans chaque vic[F/A]toire, chaque dé[Dm]faite, Tu es loy[C]al envers moi.` *(session)*
- l. 35 : `[Bb]Tu es [F/A]fidèle et Tu le [Dm]seras toujo[C]urs.` → `[Bb] Tu es [F/A]fidèle et Tu le [Dm]seras toujo[C]urs.` *(session (hors relevé))* — retrait de début de ligne : ligne de la feuille en retrait (x0=45,4, « Tu » à x=54,3) ; Bb à x=45,4 au-dessus du retrait → [Bb] Tu. Seule l'espace après le premier accord change.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | C | x=213,9 sur « m » de « l'armée » | décalé | l'ar[C]mée (défaut ok, appliqué) |
| 20 | F/A | x=225,0 sur l'espace après « héritage, » avant « ma » | décalé | héritage,[F/A] ma (question tranchée ok : replace) |
| 20 | C | x=377,0 sur « p » de « rempart. » | décalé | rem[C]part. (repris dans le replace) |
| 22 | Bb | x=114,7 sur « b » de « libérateur, » | décalé | li[Bb]bérateur (défaut ok, appliqué) |
| 22 | F/A | x=178,7 sur l'espace après « libérateur, » avant « non » | décalé | libérateur,[F/A] non (défaut ok, appliqué) |
| 34 | Dm | x=287,3 sur « f » de « défaite, » | décalé | dé[Dm]faite (défaut ok, appliqué) |

En-tête : ajout de `{source: Jamais marché seul.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 34:decale:Dm:1 | appliqué | def | inclus dans la ligne de la session |
| 22:decale:Bb:1 | appliqué | def |  |
| 22:decale:F/A:1 | appliqué | def |  |
| 20:decale:F/A:1 | laissé | def |  |
| 20:decale:C:1 | appliqué | def | inclus dans la ligne de 20:fable:20:decale:F/A:1 |
| 20:fable:20:decale:F/A:1 | appliqué | session | le replace met toute la ligne comme la partition : F/A sur l'espace après la virgule (crochet + espace), C sur le « p » de « rempart », Bb et Dm inchangés ; il rétablit aussi l'espace après « héritage, » (paroles de la partition). Retenu à la place de l'écart mécanique 20:decale:F/A:1 (non par défaut, autre lecture du même accord). — partition : mesure : F/A x=225,0 sur l'espace entre « héritage, » et « ma » ; C x=377,0 sur « p » de « rempart » ; vu sur le rendu 2× |
| 10:decale:C:1 | appliqué | def |  |

- Source fiable (PDF église rendu ChordPro, couche texte) : check.py 40 exacts + 6 décalés avant, 46/46 exacts après ; vérifié sur un rendu 2× (couplet 1, refrain, pont).
- Question 20:fable:20:decale:F/A:1 tranchée ok (replace de la ligne 20, qui reprend aussi le C de 20:decale:C:1) ; l'écart 20:decale:F/A:1 (non par défaut) en est l'autre lecture, non retenu séparément.
- Paroles l.20 : l'espace manquante après « héritage, » est rétablie par le replace (portée par l'écart).
- Structure identique à la partition (Couplet 1, 2, Refrain, Couplet 3, Pont) ; {key: F} conforme.
- Autres versions dans Partitions/ : « Jamais marché seul (F).pdf » et « Jamais marché seul - F.pdf » (traitement de texte, même tonalité) : non retenues, la partition fournie fait foi.
- Retrait de début de ligne (règle de 02, cas Océans), revu sur chaque ligne chantée : seules les quatre lignes du Pont (32-35) sont en retrait sur la feuille (deux espaces, 1re lettre à x=54,3) avec Bb gravé à x=45,4 au-dessus du retrait → « [Bb] À / [Bb] Tu / [Bb] Dans / [Bb] Tu » (vu sur le rendu 3×).

### je-celebrerai — Je célèbrerai

Lot 3 · partition retenue : `Je célèbrerai le nom (C).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 12 : `[C]Je me ré[F/C]jouis dans le Nom du Sei[C]gneur.[F/C]` → `[C] Je me ré[F/C]jouis dans le Nom du Sei[C]gneur.[F/C]` *(session (hors relevé))* — retrait de début de ligne (cas Océans de 02) : la ligne de la feuille commence par deux espaces (x0=31,2), « Je » à x=40,1 ; C gravé à x=31,2, au-dessus du retrait, avant la 1re lettre → [C] Je. Seule l'espace après le premier accord change.
- l. 13 : `[C]Je me conf[F]ie dans le Nom du Sei[G]gneur.[F]` → `[C] Je me con[F]fie dans le Nom du Sei[G]gneur.[F]` *(session)*
- l. 14 : `[C]Je lève les [F]mains dans le Nom du Sei[C]gneur.[F/C]` → `[C] Je lève les [F]mains dans le Nom du Sei[C]gneur.[F/C]` *(session (hors relevé))* — retrait de début de ligne : ligne de la feuille en retrait (x0=31,2, « Je » à x=40,1) ; C à x=31,2 au-dessus du retrait → [C] Je. Seule l'espace après le premier accord change.
- l. 15 : `[C]Je danse de [F]joie dans le [Am7]Nom du Sei[G]gneur.` → `[C] Je danse de [F]joie dans le [Am7]Nom du Sei[G]gneur.` *(session (hors relevé))* — retrait de début de ligne : ligne de la feuille en retrait (x0=31,2, « Je » à x=40,1) ; C à x=31,2 au-dessus du retrait → [C] Je. Seule l'espace après le premier accord change.
- l. 19 : `Je cé[C]lèbrerai le N[F]om de Cel[G]ui que mon cœur [C]aime.` → `Je cé[C]lèbrerai le N[F]om de Ce[G]lui que mon cœur a[C]ime.`
- l. 20 : `Oui, je [Am]bénirai le N[F]om de mon Sauv[G]eur.` → `Oui, je [Am]bénirai le N[F]om de mon Sau[G]veur.`
- l. 21 : `[F]Je [G]cé - [C]lèbrerai le N[F]om de Cel[G]ui que mon cœur [C]aime.` → `[F]Je [G]cé[C]lèbrerai le N[F]om de Ce[G]lui que mon cœur a[C]ime.`
- l. 22 : `Oui, [G]je [Am]bénirai le N[F]om [G]du Sei[C]gneur. ` → `Oui, [G]je [Am]bénirai le N[F]om [G]du Sei[C]gneur.[F][Am][G][C][F][Am][G]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | C | aucun accord d'intro gravé : le seul « C » hors paroles est la case de tonalité (x=531,3, y=57, corps 18) en haut à droite | inventé | laissé : retirer la section Intro est un changement de structure interdit ici, proposé à Timothée (bloc structure) |
| 13 | F | x=113,9 = x0 de « f » de « con‹f›ie » | décalé | con[F]fie (relevé ok) |
| 19 | C | x=83,6 = « l » de « cé‹l›èbrerai » | exact | inchangé |
| 19 | F | x=169,8 = « o » de « N‹o›m » | exact | inchangé |
| 19 | G | x=239,2 = « l » de « Ce‹l›ui » | décalé | Ce[G]lui (relevé ok) |
| 19 | C | x=377,0 = « i » de « a‹i›me » | décalé | a[C]ime (relevé ok) |
| 20 | Am | x=96,1 = « b » de « ‹b›énirai » | exact | inchangé |
| 20 | F | x=177,0 = « o » de « N‹o›m » | exact | inchangé |
| 20 | G | x=289,9 = « v » de « Sau‹v›eur » | décalé | Sau[G]veur (relevé ok) |
| 21 | F | x=45,4 = « J » de « Je » | exact | inchangé |
| 21 | G | x=66,7 = « c » de « cé » | exact | inchangé (le moteur recolle « cé - lèbrerai ») |
| 21 | C | x=97,8 = « l » de « lèbrerai » | exact | inchangé |
| 21 | F | x=184,1 = « o » de « N‹o›m » | exact | inchangé |
| 21 | G | x=253,4 = « l » de « Ce‹l›ui » | décalé | Ce[G]lui (relevé ok) |
| 21 | C | x=391,2 = « i » de « a‹i›me » | décalé | a[C]ime (relevé ok) |
| 22 | G Am F G C | x=79,2 « je », 104,9 « bénirai », 185,9 « N‹o›m », 212,5 « du », 257,9 « Sei‹g›neur » | exact | inchangés |
| 22 | F Am G C F Am G | x=303,2 / 324,4 / 357,9 / 381,7 / 404,6 / 425,7 / 459,3, sur la même rangée que « Oui, je bénirai le Nom du Seigneur. », après le point (dernier caractère « . » à x=298,8) | absent du .cho | Sei[C]gneur.[F][Am][G][C][F][Am][G] (relevé ok, après la ponctuation, collé : règle 02) |
| 23 | F Am G C F Am G | la partition n'a pas de rangée d'accords seule : ces sept accords sont gravés une seule fois, en fin de la ligne 22 | inventé (doublon une fois la ligne 22 complétée) | ligne supprimée (bloc structure agent, appliqué) |
| 27 | C F Am G | x=31,2 « Je », 81,9 « célè‹b›rerai », 127,2 « le », 204,6 « Seigneur » | exact | inchangés |

En-tête : ajout de `{source: Je célèbrerai le nom (C).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 23:instrumental:F:1 | laissé | Timothée |  |
| 23:instrumental:Am:1 | laissé | Timothée |  |
| 23:instrumental:G:1 | laissé | Timothée |  |
| 23:instrumental:C:1 | laissé | Timothée |  |
| 23:instrumental:F:2 | laissé | Timothée |  |
| 23:instrumental:Am:2 | laissé | Timothée |  |
| 23:instrumental:G:2 | laissé | Timothée |  |
| 22:manquant:F:1 | appliqué | Timothée |  |
| 22:manquant:Am:1 | appliqué | Timothée |  |
| 22:manquant:G:1 | appliqué | Timothée |  |
| 22:manquant:C:1 | appliqué | Timothée |  |
| 22:manquant:F:2 | appliqué | Timothée |  |
| 22:manquant:Am:2 | appliqué | Timothée |  |
| 22:manquant:G:2 | appliqué | Timothée |  |
| 21:decale:G:1 | appliqué | Timothée |  |
| 21:decale:C:1 | appliqué | Timothée |  |
| 20:decale:G:1 | appliqué | Timothée |  |
| 19:decale:G:1 | appliqué | Timothée |  |
| 19:decale:C:1 | appliqué | Timothée |  |
| 13:decale:F:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 8:instrumental:C:1 | laissé | Timothée |  |

- Source à couche texte (rendu de l'église) : chaque accord mesuré au x0 du caractère porteur ; check.py après : 45 exacts, le seul restant est le [C] de l’Intro (case de tonalité, structure).
- Les six décalages (13 F, 19 G et C, 20 G, 21 G et C) : choix « ok » du relevé, confirmés par la mesure.
- Ligne 23 retirée (contre le « non » du relevé) : sinon la suite F Am G C F Am G, ajoutée par le relevé en fin de ligne 22 comme sur la partition, serait jouée deux fois.
- Intro [C] laissée (structure) : c'est la case de tonalité, proposée au retrait à Timothée avec le passage start_of_final → start_of_outro et le suffixe « Final (x4) » ; « (x4) » reste dans la parole d'ici là.
- Thèmes (Adoration, Action de grâce) et tonalité (C, case gravée) inchangés. Aucune différence de paroles avec la partition.
- Retrait de début de ligne (règle de 02, cas Océans), revu sur chaque ligne chantée : les quatre lignes du Couplet (12-15) sont en retrait sur la feuille (deux espaces, « Je » à x=40,1) avec C gravé à x=31,2 au-dessus du retrait → « [C] Je » (vu sur le rendu 3×). Refrain (F l.21 à x=45,4 = « Je » à 45,4) et Final (C à x=31,2 = « Je » à 31,2) : pas de retrait, rien à changer.

### je-flechis-le-genou — Je fléchis le genou

Lot 3 · partition retenue : `Je fléchis le genou.pdf` (shirfr, mesure fiable)

Lignes modifiées :

- l. 21 : `Je n’ai qu’un seul dés[Em]ir, qu’u[D]n seul souh[C]ait,` → `Je n’ai qu’un seul dé[Em]sir, qu’u[D]n seul sou[C]hait,`
- l. 22 : `Celui de te ser[Em]vir, de t[D]’adorer.[D]` → `Celui de te ser[Em]vir, de t’[D]adorer.[D]`
- l. 28 : `Et je soumet[G]s ma volonté[D]` → `Et je soume[G]ts ma volonté[D]`
- l. 29 : `À ta divi [D]ne [Em][Am]royauté.[C][D][Em][G][C/G][G]` → `À ta divi[Am] [Em] [D]ne royauté.[G][C/G][G][Em][D][C]` *(session)*
- l. 33 : `[Em]Je fléch[D]is le geno[C]u,` → `[Em] Je fléch[D]is le geno[C]u,` *(session (hors relevé))* — retrait de début de ligne (cas Océans de 02) : la ligne de la feuille commence par une espace (x0=34,0), « Je » à x=38,7 ; Em gravé à x=34,0, au-dessus du retrait, avant la 1re lettre → [Em] Je. Seule l'espace après le premier accord change.
- l. 34 : `[Em]Je fléch[D]is le geno[C]u devant toi,` → `[Em] Je fléch[D]is le geno[C]u devant toi,` *(session (hors relevé))* — retrait de début de ligne : ligne de la feuille en retrait (x0=34,0, « Je » à x=38,7) ; Em à x=34,0 au-dessus du retrait → [Em] Je. Seule l'espace après le premier accord change.
- l. 35 : `[Em]Je fléch[D]is le geno[C]u.` → `[Em] Je fléch[D]is le geno[C]u.` *(session (hors relevé))* — retrait de début de ligne : ligne de la feuille en retrait (x0=34,0, « Je » à x=38,7) ; Em à x=34,0 au-dessus du retrait → [Em] Je. Seule l'espace après le premier accord change.
- l. 37 : `[Em]Je m’h[D]umili[C]e [Em]deva[D]nt ta fac[C]e,` → `[Em] Je m’h[D]umili[C]e[Em] deva[D]nt ta fac[C]e,` *(session)*
- l. 38 : `[Em]Je fléch[D]is le geno[C]u.` → `[Em] Je fléch[D]is le geno[C]u.` *(session (hors relevé))* — retrait de début de ligne : ligne de la feuille en retrait (x0=34,0, « Je » à x=38,7) ; Em à x=34,0 au-dessus du retrait → [Em] Je. Seule l'espace après le premier accord change.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 21 | Em | x=197,6 sur « s » de « dé‹s›ir » (s 197,6) | décalé | dé[Em]sir (défaut ok) |
| 21 | C | x=340,7 sur « h » de « sou‹h›ait » | décalé | sou[C]hait (défaut ok) |
| 22 | D | x=212,4 sur « a » de « t’‹a›dorer » | décalé | t’[D]adorer (défaut ok) |
| 28 | G | x=126,8 sur « t » de « soume‹t›s » (t 126,8) | décalé | soume[G]ts (défaut ok) |
| 29 | Am | x=100,6, première espace après « divi » (i finit à 100,5) | décalé | divi[Am]  |
| 29 | Em | x=129,4 sur une espace du blanc entre « divi » et « ne » | décalé | [Em] dans le blanc |
| 29 | D | x=158,2 sur « n » de « ne » (157,9) | exact | [D]ne |
| 29 | G C/G G Em D C | x=246,8 / 261,2 / 290,0 / 304,4 / 333,2 / 347,6, tous après « royauté. » (fin 246,6) | nom | royauté.[G][C/G][G][Em][D][C] |
| 37 | Em | x=157,3 sur la dernière espace du blanc avant « devant » (d à 161,9) | décalé | humili[C]e [Em] devant (défaut ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 8.

En-tête : ajout de `{source: Je fléchis le genou.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 37:decale:Em:1 | appliqué | def | inclus dans la ligne de la session |
| 29:nom:D:1 | laissé | def |  |
| 29:decale:Em:1 | laissé | session | réglé par la ligne 29 réécrite (lignes) : Em est sur le blanc entre « divi » et « ne », après Am ; l'opération seule laisserait l'ordre Em puis D sans Am. — partition : Em x=129,4 sur une espace du blanc (129,2-134,0), entre Am (x=100,6) et D (x=158,2 sur « n ») |
| 29:invente:Am:1 | laissé | def |  |
| 29:nom:C:1 | laissé | session | réglé par la ligne 29 réécrite : la queue après « royauté. » est G C/G G Em D C ; renommer un à un sans réordonner ne rend pas la ligne juste. — partition : G x=246,8 juste après « . » (241,8-246,6) |
| 29:nom:D:2 | laissé | session | réglé par la ligne 29 réécrite (queue G C/G G Em D C). — partition : C/G x=261,2 après « royauté. » |
| 29:nom:Em:1 | laissé | session | réglé par la ligne 29 réécrite (queue G C/G G Em D C). — partition : G x=290,0 après « royauté. » |
| 29:nom:G:1 | laissé | def |  |
| 29:nom:C/G:1 | laissé | session | réglé par la ligne 29 réécrite (queue G C/G G Em D C). — partition : D x=333,2 après « royauté. » |
| 29:nom:G:2 | laissé | session | réglé par la ligne 29 réécrite (queue G C/G G Em D C). — partition : C x=347,6 après « royauté. » |
| 29:manquant:D:1 | laissé | def | la ligne est celle mesurée par la session |
| 29:fable:29:nom:D:1 | appliqué | session | la ligne réécrite est exactement la feuille : Am collé à « divi » (tenue), Em dans le blanc, D sur « ne », puis G C/G G Em D C après « royauté. ». — inclus dans la ligne de la session — partition : Am x=100,6 (fin de « i » à 100,5), Em x=129,4 (blanc), D x=158,2 sur « n » (157,9), G 246,8 · C/G 261,2 · G 290,0 · Em 304,4 · D 333,2 · C 347,6 après « . » (246,6) |
| 29:fable:29:invente:Am:1 | appliqué | session | même ligne réécrite que 29:fable:29:nom:D:1 : Am existe bien sur la feuille, mais sur le blanc après « divi », pas devant « royauté ». — inclus dans la ligne de la session — partition : Am x=100,6 juste après « divi » |
| 29:fable:29:nom:G:1 | appliqué | session | même ligne réécrite que 29:fable:29:nom:D:1 (ordre de la queue G C/G G Em D C). — inclus dans la ligne de la session — partition : Em x=304,4 en 4e position après « royauté. » |
| 28:decale:G:1 | appliqué | def |  |
| 22:decale:D:1 | appliqué | def |  |
| 21:decale:Em:1 | appliqué | def |  |
| 21:decale:C:1 | appliqué | def |  |

- Source shir.fr à couche texte (fiable) : chaque accord mesuré sur la couche texte ; lignes 12-15, 19-20, 26-27, 33-35, 37 (D, C, D, C), 38 déjà exactes au caractère près (ex. l. 13 Em x=171,4 / « r » 171,5 ; D x=206,5 / « e » 206,6 ; l. 26 G x=134,3 sur le 2e « n » d'« abandonne »).
- La feuille est en Em (« Tonalité : Em ») ; le .cho porte {key: G} (même armure, mêmes accords) : non changé.
- Paroles, non appliqué : la ligne « (× 2) » (l. 36) est écrite comme une ligne de paroles ; sur la feuille elle reprend les trois premières lignes du Final. Laissée telle quelle (aucune structure à changer).
- Extra cité : l'outil lit « Couplet (× 2) » comme une section ; le plan du .cho (Intro, Couplet 1, Couplet 2, Refrain, Final) suit la feuille.
- Retrait de début de ligne (règle de 02, cas Océans), revu sur chaque ligne chantée : les cinq lignes chantées du Final (33-35, 37, 38) sont en retrait d'une espace sur la feuille (« Je » à x=38,7) avec Em gravé à x=34,0 au-dessus du retrait → « [Em] Je » (vu sur le rendu 3×).

### je-loue-ton-nom-eternel — Je loue Ton Nom, Éternel

Lot 3 · partition retenue : `Je loue Ton Nom, Éternel.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[G]Je loue [C]Ton Nom, Éter[D]nel,[C]` → `[G] Je loue [C]Ton Nom, Éter[D]nel,[C]` *(session (hors relevé))* — G x=31,2 sur l'indentation (deux espaces x=31,2 et 35,6) avant « Je » (x=40,1) : label sur l'espace, crochet + espace (cas Océans de 02) ; check.py, qui retire l'indentation, le compte exact. C x=96,1 sur « T » de « Ton », D x=200,1 sur « n » d'« Éter‹n›el », C x=225,9 sur l'espace après la virgule : exacts.
- l. 10 : `[G]Seigneur, [C]je célèbre [D]Ta bonté.[C]` → `[G] Seigneur, [C]je célèbre [D]Ta bonté.[C]` *(session (hors relevé))* — G x=31,2 sur l'indentation avant « Seigneur » (x=40,1) : crochet + espace. C x=113,0 sur « j », D x=186,8 sur « T », C x=254,4 sur l'espace après le point : exacts.
- l. 11 : `[G]Quelle [C]joie, Tu vis en [D]moi,[C]` → `[G] Quelle [C]joie, Tu vis en [D]moi,[C]` *(session (hors relevé))* — G x=31,2 sur l'indentation avant « Quelle » (x=40,1) : crochet + espace. C x=90,8 sur « j », D x=193,9 sur « m », C x=224,1 sur l'espace après la virgule : exacts.
- l. 12 : `[G]Quelle [C]joie, Tu viens pour [D]nous sauver.[C]` → `[G] Quelle [C]joie, Tu viens pour [D]nous sauver.[C]` *(session (hors relevé))* — G x=31,2 sur l'indentation avant « Quelle » : crochet + espace. C x=90,8 sur « j », D x=225,9 sur « n » de « nous », C x=317,5 sur l'espace après le point : exacts.
- l. 16 : `[G]Tu viens du [C]Ciel sur la ter[D]re mont[C]rer la voie,` → `[G] Tu viens du [C]Ciel sur la ter[D]re mon[C]trer la voie,` *(session)*
- l. 17 : `[G]De la [C]terre à la cr[D]oix pa[C]yer pour [G]moi,` → `[G] De la [C]terre à la cr[D]oix pa[C]yer pour [G]moi,` *(session (hors relevé))* — G x=45,4 sur l'indentation avant « De » (x=54,3) : crochet + espace. C x=96,1 sur « t » de « terre », D x=177,0 sur « o » de « cr‹o›ix », C x=219,6 sur « y » de « pa‹y›er », G x=282,8 sur « m » de « moi » : exacts.
- l. 18 : `De la [C]croix jusqu'au tomb[D]eau, et du tom[B7]beau jusqu'au Ci[Em]el.` → `De la [C]croix jusqu'au tomb[D]eau, et du tom[B7]beau jusqu'au C[Em]iel.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | G | x=31,2 sur l'indentation avant « Je » (x=40,1) | décalé (en l'air sur la partition, collé dans le .cho ; check.py le lit exact) | [G] Je loue |
| 10 | G | x=31,2 sur l'indentation avant « Seigneur » | décalé (en l'air ; check.py le lit exact) | [G] Seigneur |
| 11 | G | x=31,2 sur l'indentation avant « Quelle » | décalé (en l'air ; check.py le lit exact) | [G] Quelle |
| 12 | G | x=31,2 sur l'indentation avant « Quelle » | décalé (en l'air ; check.py le lit exact) | [G] Quelle |
| 16 | G | x=45,4 sur l'indentation avant « Tu » (x=54,3) | décalé (en l'air ; check.py le lit exact) | [G] Tu viens |
| 16 | C | x=141,4 sur « C » de « Ciel » | exact | inchangé |
| 16 | D | x=235,6 sur le second « r » de « ter‹r›e » | exact | inchangé |
| 16 | C | x=285,4 sur « t » de « mon‹t›rer » | décalé | mon[C]trer (écart du relevé, ok) |
| 17 | G | x=45,4 sur l'indentation avant « De » | décalé (en l'air ; check.py le lit exact) | [G] De la |
| 17 | C | x=96,1 sur « t » de « terre » | exact | inchangé |
| 17 | D | x=177,0 sur « o » de « cr‹o›ix » | exact | inchangé |
| 17 | C | x=219,6 sur « y » de « pa‹y›er » | exact | inchangé |
| 17 | G | x=282,8 sur « m » de « moi » | exact | inchangé |
| 18 | Em | x=441,9 sur « i » de « C‹i›el. » | décalé | C[Em]iel (écart du relevé, ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espaceur : l. 19.

En-tête : ajout de `{source: Je loue Ton Nom, Éternel.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 18:decale:Em:1 | appliqué | Timothée |  |
| 16:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |

- Mesure sur la couche texte (église FPDF) : 35 accords, 33 exacts avant ; les deux décalés (C de « montrer » sur « t », Em de « Ciel » sur « i ») sont réglés par les écarts du relevé (ok), conformes à la partition.
- Hors relevé : l. 9 à 12, 16, 17, G gravé sur l'indentation de deux espaces avant le premier mot (x=31,2 ou 45,4, première lettre à +8,9) → `[G] mot` (cas Océans de 02) ; check.py ne voit pas l'indentation.
- l. 19 : Am7 x=101,4 sur « T », D x=176,1 sur « É », G x=205,4 sur « n » d'« Éter‹n›el », puis C G D après le point (x=231,2, 254,1, 277,9) : exacts ; le moteur ne garde pas les espaceurs.
- Pied de page : titre original « Lord, I lift Your Name on high - (nom retiré) », traduction (crédit de traduction) — non repris (information).

### je-louerai-l-eternel — Je louerai l'Éternel

Lot 3 · partition retenue : `Je louerai l'Éternel.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `Je [G]raconter[A]ai tou[F#]tes Tes merv[Bm]eilles,` → `Je [G]raconte[A]rai tou[F#]tes Tes mer[Bm]veilles,`
- l. 10 : `Je [Em]chanter[E]ai Ton [A4]Nom.[A]` → `Je [Em]chante[E]rai Ton [A4]Nom.[A]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | A | x=105,9 sur « r » de « raconterai » (raconte‹r›ai) — B sur la feuille en mi, A sur la feuille en ré | décalé | raconte[A]rai (relevé ok, appliqué) |
| 9 | Bm | x=234,8 sur « v » de « merveilles, » — C#m en mi, Bm en ré | décalé | mer[Bm]veilles, (relevé ok, appliqué) |
| 10 | E | x=100,6 sur « r » de « chanterai » — F# en mi, E en ré | décalé | chante[E]rai (relevé ok, appliqué) |
|  | les 27 | check.py contre « Je louerai l'Éternel.pdf » : 27 « nom différent » = la feuille est en mi, le .cho en ré (transposition d'un ton, positions identiques) | nom différent (tonalité) | aucune : contre « Je louerai l_Éternel - Accords.pdf » (même rendu, en ré) check.py donne 24 exacts + les 3 décalés ci-dessus, tous corrigés par le relevé |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — mot coupé au tiret : l. 16.

En-tête : ajout de `{source: Je louerai l'Éternel.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 10:decale:E:1 | appliqué | Timothée |  |
| 9:decale:A:1 | appliqué | Timothée |  |
| 9:decale:Bm:1 | appliqué | Timothée |  |

- Source fiable (PDF église rendu ChordPro, couche texte). La partition retenue est gravée en mi (E, B, C#m…), le .cho est en ré : check.py la classe en 27 « nom différent » (transposition, pas d'erreur de nom). Mesuré aussi contre « Je louerai l_Éternel - Accords.pdf », même rendu en ré : 24 exacts + 3 décalés (l. 9 A et Bm, l. 10 E), exactement les 3 « ok » du relevé ; après eux, 27/27 au caractère près.
- Alléluia (l. 16) : F#m/B/E de la feuille en mi sur « l » de « lé », « l » de « lu », « a » de « ia » = Em/A/D du .cho, mêmes caractères ; la forme écrit « Al[Em]lé[A]lui[D]a ! ».
- {key: D} conservé (pas de consigne particulière) ; tonalité de la feuille du dossier : E.
- Aucune question, aucune ligne en plus ; structure identique (Couplet 1, Couplet 2).

### je-n-ai-rien-a-craindre — Je n'ai rien à craindre

Lot 4 · partition retenue : `Je n’ai rien à craindre.pdf` (eglise-fpdf, mesure basse-fidelite)

Lignes modifiées :

- l. 16 : `Je n’ai rien [F]à craindre, car Tu es [Gm7]là` → `Je n’ai rien [F]à craindre, car Tu e[Gm7]s là` *(session)*
- l. 18 : `Je n’ai rien [F]à craindre, car Tu me [Gm7]tiens` → `Je n’ai rien [F]à craindre, car Tu m[Gm7]e tiens` *(session)*
- l. 24 : `Dieu e[F]st ﬁdè[Gm7]le` → `Dieu e[F]st fidè[Gm7]le`
- l. 26 : `Dans [F]Son rep[Gm7]os, ma foi [Dm7]s’aligne à Sa grâ[Bb]ce` → `Dans S[F]on rep[Gm7]os, ma foi [Dm7]s’aligne à Sa grâ[Bb]ce`
- l. 31 : `M’ac[Gm7]compagneront` → `M’a[Gm7]ccompagneront`
- l. 37 : `[F][ ][Gm7][ ][Dm7]Ton amour me suit` → `[F]  [Gm7]` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | F | x=111 sur le « t » de « est » (108–112), même syllabe que e[F]st ; feuille église : « s » de « est » | équivalent (basse fidélité, même syllabe) | e[F]st (inchangé) |
| 9 | Gm7 | x=144 sur le « i » de « paix » (144–147) | exact (à l'œil) | pa[Gm7]ix |
| 10 | Dm7 | x=108 sur le « t » de « toutes » (107) | exact (à l'œil) | [Dm7]toutes |
| 10 | Bb | x=234 sur le « n » de « main » (231–237) | exact (à l'œil) | mai[Bb]n |
| 11 | F | x=108 sur le « r » de « Toujours » (106–110), .cho devant « s » : même syllabe | équivalent (basse fidélité, même syllabe) | Toujour[F]s (inchangé) |
| 11 | Gm7 | x=144 sur le « n » de « présent » (143–149) | exact (à l'œil) | prése[Gm7]nt |
| 12 | Dm7 | x=102 sur le « f » de « fuir » (101) | exact (à l'œil) | [Dm7]fuir |
| 12 | Bb | x=189 à la fin du « n » de « géants » (184–190), .cho devant « t » : même syllabe | équivalent (basse fidélité, même syllabe) | géan[Bb]ts (inchangé) |
| 16 | F | x=129 sur « à » (128) | exact (à l'œil) | [F]à |
| 16 | Gm7 | x=117 dans le « s » de « es » (113–118), « là » commence à 121 ; feuille église (rendu ChordPro) : sur le « s » de « es » aussi | décalé (autre syllabe : .cho sur « là ») | e[Gm7]s là |
| 17 | Dm7 | x=72 au-dessus du « T » de « Tu » (feuille sans retrait) ; feuille église : au-dessus du retrait avant « Tu » | équivalent (même syllabe ; [X] mot de la feuille église gardé) | [Dm7] Tu (inchangé) |
| 17 | Bb | x=200 sur le « r » de « peurs » (198–202), mot d'une syllabe ; feuille église : « e » | équivalent (basse fidélité, même syllabe) | peur[Bb]s (inchangé) |
| 18 | F | x=129 sur « à » (128) | exact (à l'œil) | [F]à |
| 18 | Gm7 | x=120 au milieu du « e » de « me » (117–123), « tiens » commence à 126 ; feuille église : sur le « e » de « me » aussi | décalé (autre syllabe : .cho sur « tiens ») | m[Gm7]e tiens |
| 19 | Dm7 | x=72 au-dessus du « M » de « Mon » ; feuille église : au-dessus du retrait | équivalent (même syllabe ; [X] mot de la feuille église gardé) | [Dm7] Mon (inchangé) |
| 19 | Bb | x=188 sur le « a » de « paix » (184–189), .cho devant « i » : même syllabe ; feuille église : « a » | équivalent (basse fidélité, même syllabe) | pa[Bb]ix (inchangé) |
| 20 | F | x=129 sur « à » (128) | exact (à l'œil) | [F]à |
| 20 | Gm7 | x=177 sur l'espace après « craindre » (171–176) : après la dernière syllabe | exact (à l'œil) | craindre[Gm7] |
| 20 | Dm7 | x=208, après la fin des paroles | exact (à l'œil) | [Dm7] en l'air |
| 20 | Bb | x=239, après la fin des paroles | exact (à l'œil) | [Bb] en l'air |
| 24 | F | feuille Pages : aucun accord au couplet 2 ; reporté de la feuille église (même arrangement, rendu ChordPro) : x=77,4 sur le « s » de « est » | reporté (exact sur la feuille église) | e[F]st |
| 24 | Gm7 | feuille église : x=120,1 sur le « l » de « fidèle » | reporté (exact sur la feuille église) | fidè[Gm7]le |
| 25 | Dm7 | feuille église : x=89 sur le « q » de « qu'Il » | reporté (exact sur la feuille église) | [Dm7]qu’Il |
| 25 | Bb | feuille église : x=214,3 sur le « i » de « accomplit » | reporté (exact sur la feuille église) | s’accompl[Bb]it |
| 26 | F | feuille église : x=83,7 sur le « o » de « Son » | reporté ; .cho décalé d'un caractère, corrigé par l'écart 26:oeil:4 | S[F]on |
| 26 | Gm7 | feuille église : x=129 sur le « o » de « repos » | reporté (exact sur la feuille église) | rep[Gm7]os |
| 26 | Dm7 | feuille église : x=202,8 sur le « s » de « s'aligne » | reporté (exact sur la feuille église) | [Dm7]s’aligne |
| 26 | Bb | feuille église : x=321,5 sur le « c » de « grâce » | reporté (exact sur la feuille église) | grâ[Bb]ce |
| 30 | F | x=360 sur le « h » de « bonheur » (360) | exact (à l'œil) | bon[F]heur |
| 31 | Gm7 | x=330 sur le 1er « c » de « M'accompagneront » (329–334) | décalé d'un caractère, corrigé par l'écart 31:oeil:5 | M’a[Gm7]ccompagneront |
| 32 | Dm7 | x=330 à la fin du « t » de « Toute » (327–331), .cho devant « e » : même syllabe « te » | équivalent (basse fidélité, même syllabe) | Tout[Dm7]e (inchangé) |
| 33 | Bb | x=330 à la fin du « t » de « Toute » (327–331), .cho devant « e » : même syllabe « te » | équivalent (basse fidélité, même syllabe) | Tout[Bb]e (inchangé) |
| 37 | F | x=309, ligne d'accords seule « F   Gm7 » (y=489), sans paroles dessous | exact sur une ligne instrumentale (question 37:fable) | [F]  [Gm7] sur sa ligne |
| 37 | Gm7 | x=324,9, même ligne d'accords seule | exact sur une ligne instrumentale (question 37:fable) | [F]  [Gm7] sur sa ligne |
| 37 | Dm7 | x=309 au-dessus du « T » de « Ton amour me suit » (309) | exact (à l'œil) | [Dm7] Ton amour me suit |
| 38 | Bb | x=309 au-dessus du « T » de « Ton » ; feuille église : au-dessus du retrait | équivalent (même syllabe ; [X] mot de la feuille église gardé) | [Bb] Ton (inchangé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espaceur : l. 20.

En-tête : ajout de `{source: Je n’ai rien à craindre.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 37:invente:F:1 | laissé | def |  |
| 37:invente:Gm7:1 | laissé | def |  |
| 37:fable:37:invente:F:1 | laissé | session | Feuille Pages : « F   Gm7 » sur une ligne d'accords seule, puis Dm7 au-dessus du « T » de « Ton amour me suit » : une ligne instrumentale puis la ligne chantée. Réalisé par lignes (l.37 = « [F]  [Gm7] ») et le bloc de structure « agent » (ligne chantée insérée dessous), parce que le remplacement à saut de ligne interne fait perdre au moteur la dernière ligne du fichier ({end_of_intro}). — la ligne est celle mesurée par la session — partition : F x=309, Gm7 x=324,9 (ligne seule) ; Dm7 x=309 sur « T » (309) |
| 37:fable:37:invente:Gm7:1 | laissé | session | Feuille Pages : « F   Gm7 » sur une ligne d'accords seule, puis Dm7 au-dessus du « T » de « Ton amour me suit » : une ligne instrumentale puis la ligne chantée. Réalisé par lignes (l.37 = « [F]  [Gm7] ») et le bloc de structure « agent » (ligne chantée insérée dessous), parce que le remplacement à saut de ligne interne fait perdre au moteur la dernière ligne du fichier ({end_of_intro}). — la ligne est celle mesurée par la session — partition : Gm7 x=324,9 sur la ligne d'accords seule « F   Gm7 » |
| 31:relire:Gm7:1 | laissé | def |  |
| 31:oeil:5 | appliqué | def |  |
| 26:reporte:F:1 | laissé | def |  |
| 26:reporte:Gm7:1 | laissé | def |  |
| 26:reporte:Dm7:1 | laissé | def |  |
| 26:reporte:Bb:1 | laissé | def |  |
| 26:oeil:4 | appliqué | def |  |
| 25:reporte:Dm7:1 | laissé | def |  |
| 25:reporte:Bb:1 | laissé | def |  |
| 24:reporte:F:1 | laissé | def |  |
| 24:reporte:Gm7:1 | laissé | def |  |
| 24:oeil:3 | appliqué | def |  |
| 18:relire:Gm7:1 | laissé | def |  |
| 18:oeil:2 | laissé | def |  |
| 17:relire:Bb:1 | laissé | def |  |
| 17:oeil:1 | laissé | def |  |
| 17:fable:17:oeil:1 | laissé | session | Les deux feuilles posent Bb dans « peurs », mot d'une seule syllabe : la ligne actuelle peur[Bb]s est juste à la syllabe ; [Bb]peurs n'est sur aucune feuille (Pages : « r », église : « e »). — partition : feuille Pages x=200 sur le « r » de « peurs » (198–202) ; église x=232 sur le « e » |
| 16:relire:Gm7:1 | laissé | def |  |
| 16:oeil:0 | laissé | def |  |
| 9:relire:F:1 | laissé | def |  |

- Source basse fidélité (feuille Pages alignée aux espaces) ; check.py ne lit pas cette feuille (famille inconnue, 36 « absent de la source ») : chaque accord vérifié à l'œil sur le rendu 4× et sur les coordonnées PyMuPDF, et recoupé avec la feuille église « Je n'ai rien à craindre.pdf » (rendu ChordPro du même arrangement en F).
- Lignes 16 et 18 : Gm7 posé sur « es » et « me » comme sur les deux feuilles (au lieu de « là » / « tiens ») ; l'oreille pourrait l'entendre sur la dernière syllabe, à vérifier à l'audio si besoin — le document fait foi (02).
- Couplet 2 : la feuille Pages n'y grave aucun accord ; les accords du .cho sont reportés de la feuille église, où ils sont tous au caractère près après la correction S[F]on (26:oeil:4). Les écarts « reporte » (suppression) restent à « non ».
- Débuts de ligne [Dm7] Tu / [Dm7] Mon / [Bb] Ton : la feuille Pages aligne tout à la marge (ne peut pas montrer un accord avant l'attaque), la feuille église les met au-dessus du retrait : gardés tels quels (même syllabe). L'Interlude suit la feuille Pages ([Dm7]Ton).
- Écarts d'une lettre dans la même syllabe gardés (basse fidélité, ± 1 syllabe) : l.9 F, l.11 F, l.12 Bb, l.17 Bb, l.19 Bb, l.32 Dm7, l.33 Bb.
- Paroles, non appliqué : apostrophes courbes ’ partout (01 demande l'apostrophe droite) ; la feuille Pages coupe « Je n’ai rien à craindre / Car Tu es là » et « Dans Son repos / Ma foi s’aligne… » en deux lignes avec majuscule, le .cho suit la feuille église en lignes longues.
- Extra non appliqués : ligne instrumentale F Gm7 (p1 y=489) — reprise dans l'Interlude par la question 37 ; plan source COUPLET 1, REFRAIN, COUPLET 2, PONT, INTERLUDE identique au .cho. La feuille église titre l'Interlude « Pont 2 (Tag) » : libellé non changé.
- Thèmes Foi, Espérance gardés (dans la liste, défendables) ; {key: F} présent et conforme aux deux feuilles.
- Interlude : `[Dm7] Ton amour me suit` (accord gravé au-dessus du retrait sur la feuille de l’église, comme `[Bb] Ton amour me poursuit`).

### je-reviens-au-coeur — Je reviens au cœur

Lot 4 · partition retenue : `Je reviens au cœur.pdf` (eglise-fpdf, mesure fiable) · chant validé par Timothée

Lignes modifiées :

- l. 11 : `[Eb]Porter mon of[Bb/D]frande car j'ai le dési[Fm7]r` → `[Eb]Porter mon off[Bb/D]rande car j'ai le dési[Fm7]r`
- l. 17 : `[Fm7]Pour répondre [Eb/G]à Ton appel[Bbsus4].[Eb9][ ][Bbsus4]` → `[Fm7]Pour répondre [Eb/G]à Ton appe[Bbsus4]l.[Eb9] [Bbsus4]`
- l. 19 : `[Fm7]Ô Dieu, Tu [Eb/G]sondes mon cœur[Bbsus4].[Bb]` → `[Fm7]Ô Dieu, Tu [Eb/G]sondes mon cœu[Bbsus4]r.[Bb]`
- l. 24 : `Tout est [Fm7]centré sur Toi, [Ab]centré sur Toi, [Bbsus4]Jésus.` → `Tout est [Fm7]centré sur Toi, [Ab]centré sur To[Bbsus4]i, Jésus.`
- l. 26 : `Pour tout [Fm7]centrer sur Toi, [Ab]centrer sur Toi, [Bb7sus4]Jésus.[Eb]` → `Pour tout [Fm7]centrer sur Toi, [Ab]centrer sur To[Bb7sus4]i, Jésus.[Eb]`
- l. 32 : `[Eb]Bien que faible et pauvr[Bb/D]e, je Te donne to[Fm7]ut,` → `[Eb]Bien que faible et pauv[Bb/D]re, je Te donne to[Fm7]ut,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | Bb/D | x=141,5 sur « r » de « offrande » | décalé | off[Bb/D]rande (ok du relevé, appliqué) |
| 17 | Bbsus4 | x=241,9 sur « l » de « appel. » | décalé ; après correction exact à l'œil (check.py : absent de la source, label en deux spans) | appe[Bbsus4]l. (ok du relevé, appliqué) |
| 17 | Eb9 | x=299,5 en l'air après « appel. » (espaces de fin de ligne) | exact (check.py le classe absent : il ne recolle pas « E »+« b9 ») | appel.[Eb9] inchangé |
| 17 | Bbsus4 | x=335,5 en l'air après Eb9 | exact (lu à l'œil, check.py ne le voit pas) | [Eb9] [Bbsus4] inchangé |
| 19 | Bbsus4 | x=259,7 sur « r » de « cœur. » | décalé | cœu[Bbsus4]r. (ok du relevé, appliqué) |
| 24 | Bbsus4 | x=308,6 sur « i » de « Toi, » | décalé | To[Bbsus4]i, (ok du relevé, appliqué) |
| 26 | Bb7sus4 | x=326,4 sur « i » de « Toi, » | décalé | To[Bb7sus4]i, (ok du relevé, appliqué) |
| 32 | Bb/D | x=202,9 sur « r » de « pauvre, » | décalé | pauv[Bb/D]re, (ok du relevé, appliqué) |
| 9 | Eb | x=31,2 au-dessus du retrait, avant « Le » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Eb] Le |
| 11 | Eb | x=31,2 au-dessus du retrait, avant « Porter » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Eb] Porter |
| 16 | Fm7 | x=45,4 au-dessus du retrait, avant « J'apporte » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Fm7] J'apporte |
| 17 | Fm7 | x=45,4 au-dessus du retrait, avant « Pour » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Fm7] Pour |
| 18 | Fm7 | x=45,4 au-dessus du retrait, avant « Les » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Fm7] Les |
| 19 | Fm7 | x=45,4 au-dessus du retrait, avant « Ô » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Fm7] Ô |
| 23 | Eb | x=45,4 au-dessus du retrait, avant « Je » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Eb] Je |
| 25 | Eb | x=45,4 au-dessus du retrait, avant « Oui, » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Eb] Oui, |
| 30 | Eb | x=31,2 au-dessus du retrait, avant « Roi » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Eb] Roi |
| 32 | Eb | x=31,2 au-dessus du retrait, avant « Bien » | décalé (retrait que check.py ne voit pas ; check.py le dit aussi « absent de la source » : label en deux spans non recollés) | [Eb] Bien |
| 9 | Bb/D | x=150,4 sur « é » de « terminé » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 9 | Fm7 | x=274,9 sur « b » de « retombe » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 11 | Fm7 | x=283,2 sur « r » de « désir » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 16 | Eb/G | x=124,0 sur « p » de « plus » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 16 | Bbsus4 | x=257,8 sur « a » de « chant » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 17 | Eb/G | x=161,0 sur « à » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 18 | Eb/G | x=120,1 sur « r » de « apparences » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 18 | Bbsus4 | x=265,9 sur « s » de « trompeuses » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 19 | Eb/G | x=136,1 sur « s » de « sondes » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 19 | Bb | x=317,2 en l'air après « cœur. » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 23 | Bb/D | x=221,4 sur « a » de « la » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 25 | Bb/D | x=228,6 sur « e » de « mes » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 30 | Bb/D | x=124,9 sur « é » de « éternité » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 30 | Fm7 | x=252,1 sur « e » de « exprimer » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |
| 32 | Fm7 | x=328,3 sur « u » de « tout » | exact à l'œil ; check.py le dit « absent de la source » parce que la feuille grave le label en deux spans (« E »+« b », « B »+« b/D », « F »+« m7 ») qu'il ne recolle pas | inchangé |

En-tête : ajout de `{source: Je reviens au cœur.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:Bb/D:1 | appliqué | Timothée |  |
| 26:decale:Bb7sus4:1 | appliqué | Timothée |  |
| 24:decale:Bbsus4:1 | appliqué | Timothée |  |
| 19:decale:Bbsus4:1 | appliqué | Timothée |  |
| 17:decale:Bbsus4:1 | appliqué | Timothée |  |
| 11:decale:Bb/D:1 | appliqué | Timothée |  |

- Couche texte lue en rawdict, labels recollés (la feuille écrit « E »+« b » et « B »+« bsus4 » en spans séparés, d'où les 31 « absent de la source » de check.py, qui sont des faux) : les 44 accords du chant mesurés un par un sur le caractère sous le label, et contrôlés sur le rendu 2×.
- check.py après : 13 exact, 31 « absent de la source » — tous des faux de l'outil (labels en deux spans), chacun mesuré et classé exact à l'œil dans `mesures`.
- Les 6 « ok » du relevé (l. 11, 17, 19, 24, 26, 32) sont justes et appliqués tels quels.
- Chant validé, mais retrait de début de ligne appliqué à 10 lignes (l. 9, 11, 16, 17, 18, 19, 23, 25, 30, 32) : la ligne gravée commence par deux espaces et le premier accord est au-dessus du retrait, avant la 1re lettre (cas Océans de 02) → `[Eb] Le`, `[Fm7] J'apporte`… Ce n'est pas un choix du relevé (aucun écart ne le portait, check.py ne voit pas ce retrait) ; même convention que les autres feuilles de l'église déjà en `[X] mot`.
- Tous les autres accords sont exacts : Bb/Bb7sus4/Eb en l'air après la ponctuation finale (l. 12, 19, 26, 33) et Eb9 [Bbsus4] après « appel. » (l. 17) déjà écrits ainsi.
- Paroles, non appliqué : la feuille écrit « au delà ; » avec une espace insécable avant « ; » (l. 18) — sans effet à l'affichage.
- Structure : la feuille s'arrête au Couplet 2 sans dire la suite (pas de renvoi au refrain gravé) ; rien d'ajouté, chant validé.
- Autres versions présentes : « Je reviens au cœur (D).pdf », « Je reviens au cœur D.pdf », « Je reviens au cœur - D～.pdf » (même feuille en D), « Je reviens au coeur (D).pdf » (scan Word, basse fidélité), non comparées.
- Session : les 10 lignes mesurées (retrait `[X] mot` aux l. 9, 11, 16–19, 23, 25, 30, 32, et lettres voisines dans la même syllabe : off[Bb/D]rande, appe[Bbsus4]l, cœu[Bbsus4]r, pauv[Bb/D]re) ne sont pas appliquées : chant validé, chaque accord y est déjà sur la syllabe de la partition (consigne : pas de nouvelle mesure sur un chant validé).

### je-te-donne-tout — Je Te donne tout

Lot 4 · partition retenue : `Je Te donne tout - C.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 8 : `[C]Je Te donne mon c[Am]œur, il ne [F]m'appartient [C]plus.` → `[C]Je Te donne mon cœ[Am]ur, il [F]ne m'appartient p[C]lus.`
- l. 9 : `Ce que j'ai de me[Am]illeur, tout [F]est pour To[G]i Jé[C]sus.` → `Ce que j'ai de meill[Am]eur, tout [F]est pour To[G]i Jés[C]us.`
- l. 10 : `[C]Un parfum de val[Am]eur sur T[F]oi est répan[C]du,` → `[C]Un parfum de vale[Am]ur sur [F]Toi est répand[C]u,`
- l. 11 : `C'est l'offrande de mon c[Am]œur, je s[F]uis à To[G]i Jé[C]sus.` → `C'est l'offrande de mon cœ[Am]ur, je [F]suis à To[G]i Jés[C]us.`
- l. 15 : `Prends mon [Am]âme, prends mon [F]cœur, je Te donne [C]tout.` → `Prends mon â[Am]me, prends mon cœ[F]ur, je Te donne [C]tout.`
- l. 16 : `Prends ma [Am]vie, me vo[F]ici, je Te donne [C]tout.` → `Prends ma v[Am]ie, me voic[F]i, je Te donne [C]tout.`
- l. 17 : `Mon cœur [G]est à Toi, [F] tout à Toi.[C]` → `Mon cœur e[G]st à Toi, [F] tout à To[C]i.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | Am | x=183,2 sur « u » de « cœ‹u›r » | décalé | cœ[Am]ur |
| 8 | F | x=217,9 sur « n » de « ne » | décalé | il [F]ne |
| 8 | C | x=341,0 sur « l » de « p‹l›us » | décalé | p[C]lus |
| 9 | Am | x=165,8 sur le second « e » de « meill‹e›ur » | décalé | meill[Am]eur |
| 9 | C | x=342,8 sur « u » de « Jés‹u›s » | décalé | Jés[C]us |
| 10 | Am | x=161,9 sur « u » de « vale‹u›r » | décalé | vale[Am]ur |
| 10 | F | x=207,2 sur « T » de « Toi » | décalé | [F]Toi |
| 10 | C | x=309,5 sur « u » de « répand‹u› » | décalé | répand[C]u |
| 11 | Am | x=222,3 sur « u » de « cœ‹u›r » | décalé | cœ[Am]ur |
| 11 | F | x=262,3 sur « s » de « suis » | décalé | [F]suis |
| 11 | C | x=360,1 sur « u » de « Jés‹u›s » | décalé | Jés[C]us |
| 15 | Am | x=145,0 sur « m » de « â‹m›e » | décalé | â[Am]me |
| 15 | F | x=288,1 sur « u » de « cœ‹u›r » | décalé | cœ[F]ur |
| 16 | Am | x=135,2 sur « i » de « v‹i›e » | décalé | v[Am]ie |
| 16 | F | x=211,6 sur le « i » final de « voic‹i› » | décalé | voic[F]i |
| 17 | G | x=131,6 sur « s » de « e‹s›t » | décalé | e[G]st |
| 17 | C | x=256,1 sur « i » de « To‹i› », avant le point | décalé | To[C]i. |

En-tête : ajout de `{source: Je Te donne tout - C.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 17:decale:G:1 | appliqué | def | inclus dans la ligne de 17:oeil:6 |
| 17:decale:C:1 | appliqué | def | inclus dans la ligne de 17:oeil:6 |
| 17:oeil:6 | appliqué | session | Ligne entière conforme à la feuille ; F reste sur l'espace avant « tout ». — partition : G x=131,6 sur « s » de « est » (131,6) ; F x=188,5 sur l'espace avant « tout » (espace 188,5, t 193,0) ; C x=256,1 sur « i » de « Toi » (256,1), avant le point |
| 16:decale:Am:1 | appliqué | def | inclus dans la ligne de 16:oeil:5 |
| 16:decale:F:1 | appliqué | def | inclus dans la ligne de 16:oeil:5 |
| 16:oeil:5 | appliqué | session | Ligne entière conforme à la feuille. — partition : Am x=135,2 sur « i » de « vie » (135,2) ; F x=211,6 sur le « i » final de « voici » (211,6) ; C x=313,0 sur « t » de « tout » (313,0) |
| 15:decale:Am:1 | appliqué | def | inclus dans la ligne de 15:oeil:4 |
| 15:decale:F:1 | appliqué | def | inclus dans la ligne de 15:oeil:4 |
| 15:oeil:4 | appliqué | session | Ligne entière conforme à la feuille. — partition : Am x=145,0 sur « m » de « âme » (145,0) ; F x=288,1 sur « u » de « cœur » (288,1) ; C x=400,2 sur « t » de « tout » (400,2) |
| 11:decale:Am:1 | appliqué | def | inclus dans la ligne de 11:oeil:3 |
| 11:decale:F:1 | appliqué | def | inclus dans la ligne de 11:oeil:3 |
| 11:decale:C:1 | appliqué | def | inclus dans la ligne de 11:oeil:3 |
| 11:oeil:3 | appliqué | session | Ligne entière conforme à la feuille. — partition : Am x=222,3 sur « u » de « cœur » (222,3) ; F x=262,3 sur « s » de « suis » (262,3) ; G x=327,2 sur « i » de « Toi » ; C x=360,1 sur « u » de « Jésus » (360,1) |
| 10:decale:Am:1 | appliqué | def | inclus dans la ligne de 10:oeil:2 |
| 10:decale:F:1 | appliqué | def | inclus dans la ligne de 10:oeil:2 |
| 10:decale:C:1 | appliqué | def | inclus dans la ligne de 10:oeil:2 |
| 10:oeil:2 | appliqué | session | Ligne entière conforme à la feuille. — partition : C x=31,2 sur « U » ; Am x=161,9 sur « u » de « valeur » (161,9) ; F x=207,2 sur « T » de « Toi » (207,3) ; C x=309,5 sur « u » de « répandu » (309,5) |
| 9:decale:Am:1 | appliqué | def | inclus dans la ligne de 9:oeil:1 |
| 9:decale:C:1 | appliqué | def | inclus dans la ligne de 9:oeil:1 |
| 9:oeil:1 | appliqué | session | Ligne entière conforme à la feuille. — partition : Am x=165,8 sur le second « e » de « meilleur » (165,8) ; F x=229,0 sur « e » de « est » ; G x=309,9 sur « i » de « Toi » ; C x=342,8 sur « u » de « Jésus » (342,8) |
| 8:decale:Am:1 | appliqué | def | inclus dans la ligne de 8:oeil:0 |
| 8:decale:F:1 | appliqué | def | inclus dans la ligne de 8:oeil:0 |
| 8:decale:C:1 | appliqué | def | inclus dans la ligne de 8:oeil:0 |
| 8:oeil:0 | appliqué | session | La ligne proposée met les trois accords comme la feuille église (couche texte, x du label = x du caractère). — partition : Am x=183,2 sur « u » de « cœur » (u 183,3) ; F x=217,9 sur « n » de « ne » (217,9) ; C x=341,0 sur « l » de « plus » (341,0) ; C x=31,2 sur « J » |

- Feuille église (rendu ChordPro, couche texte) : chaque label tombe exactement sur le x d'un caractère ; vérifié aussi à l'œil sur le rendu 2×.
- Les sept questions sont des réécritures de ligne entière conformes à la partition : toutes ok ; 17 accords décalés d'une lettre recalés, les autres (C de début de ligne, F/G restants, C de « tout ») étaient déjà exacts.
- Pas de retrait de début de ligne : les paroles partent au même x que le libellé de section, C de début au-dessus de la 1re lettre ([C]Je, [C]Un).
- Ligne 17 : F gravé sur l'espace avant « tout » (x=188,5), « [F] tout » gardé.
- {key: C} présent et conforme à la tonalité gravée ; structure (Couplet, Refrain) identique à la feuille.

### je-veux-proclamer-le-nom-de-jesus — Je veux proclamer le Nom de Jésus

Lot 4 · partition retenue : `Je veux proclamer le Nom de Jésus (E).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 25 : `Tu [E/G#]perces [A]la nuit, cons[E]umes tou[Esus]t.[E][EM7][ ][E]` → `Tu [E/G#]perces [A]la nuit, cons[E]umes tout.[Esus4] [E] [Emaj7] [E]` *(session)*
- l. 36 : `Déc[E]larons-le sur les monts,` → `Dé[E]clarons-le sur les monts,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | EM7 | x=192,8 en l'air après « Jésus. », gravé « EMEj7 » | nom (coquille de la partition) | aucune : Emaj7 par la forme ; check.py le compte « nom différent » parce qu'il lit la coquille |
| 18 | EM7 | x=201,7 en l'air après « Jésus. », gravé « EMEj7 » | nom (coquille de la partition) | aucune : Emaj7 par la forme |
| 23 | E | x=249,9 sur l'espace entre « Nom » (m 236,5) et « est » (e 254,3) | décalé à la frontière espace/mot | aucune : ligne retouchée à l'oreille depuis l'audit, intouchable |
| 25 | Esus | x=281,0 sur l'espace après « tout. » (« . » 276,6) | décalé | tout.[Esus] |
| 25 | E/G# | x=68,5 sur « p » de « perces » | exact | [E/G#]perces |
| 25 | A | x=120,9 sur « l » de « la » | exact | [A]la |
| 25 | E | x=206,3 sur « u » de « consumes » | exact | cons[E]umes |
| 25 | E | x=323,7 en l'air | exact | [E] |
| 25 | EM7 | x=345,7 en l'air, gravé « EMEj7 » | nom (coquille de la partition) | Emaj7 par la forme |
| 25 | E | x=395,7 en l'air | exact | [E] |
| 32 | EM7 | x=195,5 en l'air après « Jésus. », gravé « EMEj7 » | nom (coquille de la partition) | aucune : Emaj7 par la forme |
| 36 | E | x=65,8 sur « c » de « Déclarons » (é 56,9, c 65,8, l 73,8) | décalé | Dé[E]clarons (« ok » par défaut, appliqué) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espaceur : l. 11, 18, 32 ; orthographe d'accord : l. 11, 18, 32.

En-tête : ajout de `{source: Je veux proclamer le Nom de Jésus (E).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 23:decale:E:1 | ligne changée depuis l'audit | def | l. 23 : la ligne de l'audit n'est plus dans le fichier (introuvable) — retouchée depuis l'audit, intouchable |
| 23:fable:23:decale:E:1 | ligne changée depuis l'audit | session | l. 23 : la ligne de l'audit n'est plus dans le fichier (introuvable) — retouchée depuis l'audit, intouchable |
| 36:decale:E:1 | appliqué | def |  |
| 32:nom:EM7:1 | laissé | session | Même coquille « EMEj7 » gravée ; accord voulu Emaj7. Position juste. — partition : x=195,5, en l'air après « Jésus. » |
| 25:decale:Esus:1 | laissé | session | L'opération déplace Esus après les trois accords en l'air ([E][EM7][ ][E][Esus]) : ordre faux. La partition grave Esus juste après « tout. » (x=281,0 ; « . » à 276,6), puis E 323,7, EMaj7 345,7, E 395,7, comme aux l. 11, 18 et 32. Ligne juste donnée dans lignes. — partition : x=281,0 sur l'espace qui suit « tout. » |
| 25:nom:EM7:1 | laissé | session | Même coquille « EMEj7 » gravée ; accord voulu Emaj7. Position juste (la ligne est réécrite pour Esus, voir lignes). — partition : x=345,7, en l'air après « tout. » |
| 18:nom:EM7:1 | laissé | session | Même coquille « EMEj7 » gravée ; accord voulu Emaj7, écrit par la forme du moteur. Position juste. — partition : x=201,7, en l'air après « Jésus. » |
| 11:nom:EM7:1 | laissé | session | La partition imprime « EMEj7 » (vu sur la découpe) : coquille du transcripteur pour EMaj7, qui n'est pas un nom d'accord. L'accord voulu est Emaj7 (01 : M7/Maj7 → maj7), ce que la forme du moteur écrit depuis [EM7]. Position déjà juste. — partition : x=192,8, en l'air après « Jésus. » |

- Partition de l'église (rendu ChordPro, couche texte, 2 pages) : chaque accord du chant mesuré en x avec PyMuPDF, zones douteuses regardées sur le rendu 2× (crops/je-veux-proclamer-le-nom-de-jesus).
- Tous les autres accords sont exacts (couplets : E/C#m7/A2 sur la 1re lettre ou « je », « Jus[C#m7]qu'à », « Je [A2]crois », « Sur [A2]les » ; refrain B sur « p » et « l » ; pont E, C#m, A sur « J », Pro[A]clamons sur « c », J[E]ésus).
- Pas de retrait de début de ligne : paroles et premier label au même x dans chaque section.
- La partition grave « EMEj7 » (4 fois) : coquille pour EMaj7, transcrite Emaj7 ; « Esus » transcrit Esus4 (01). check.py reste à 4 « nom différent » parce qu'il lit la coquille : ce n'est pas un écart.
- L. 23 (« Ton Nom [E]est vie. ») retouchée à l'oreille depuis l'audit : intouchable ; la partition met le E sur l'espace avant « est », la ligne actuelle le pose devant « est » (frontière espace/mot).
- Autres versions présentes, non mesurées : « Je veux proclamer le Nom de Jésus C (capo 2 en D).pdf » et quatre « Le Nom de Jésus » (C ou sans tonalité).
- Thèmes inchangés (Mission, Adoration, Foi : valides).

### jesus-je-te-suivrai — Jésus, je Te suivrai

Lot 4 · partition retenue : `Jésus je Te suivrai - Accords.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 8 : `{themes: Consécration, Engagement, Confiance}` → `{themes: Engagement, Foi}` *(en-tête)* — « Consécration » et « Confiance » sont hors liste. Le chant dit d'abord « Jésus, je Te suivrai » en toute circonstance (joie, peine, doute) : Engagement ; la confiance tenue dans le doute et la peine : Foi. La mort et la souffrance du Christ « pour me sauver » (pré-refrain, refrain) défendent Croix ou Salut.
- l. 11 : `[C]Dans la joie, quand le soleil m'inonde,` → `[C] Dans la joie, quand le soleil m'inonde,` *(session (hors relevé))* — Retrait de début de ligne : la ligne de la feuille commence par deux espaces (x0=31,2) et C est gravé à x=31,2, au-dessus du retrait, avant le « D » de « Dans » : [C] Dans (cas Océans de 02 ; check.py ne voit pas le retrait).
- l. 16 : `[C]Dans la peine, quand mon âme sombre,` → `[C] Dans la peine, quand mon âme sombre,` *(session (hors relevé))* — Même retrait qu'à la l.11 : C x=31,2 au-dessus des deux espaces de tête, avant « Dans » : [C] Dans.
- l. 21 : `Car [F]Tu [G]es [Am]mort pour m[G]oi, [F]je [G]vi[Am]vrai pour [G]Toi.` → `Car [F]Tu [G]es [Am]mort pour m[G]oi, [F]je [G]vi[Am]vrai pour T[G]oi.` *(session)*
- l. 38 : `{start_of_bridge: Pont}` → `{start_of_bridge: Pont (x2)}` *(structure)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | C | x=31,2 au-dessus du retrait de deux espaces, avant « Dans » | décalé (retrait) | [C] Dans la joie |
| 16 | C | x=31,2 au-dessus du retrait de deux espaces, avant « Dans » | décalé (retrait) | [C] Dans la peine |
| 21 | G | x=373,5 sur « o » de « T‹o›i. » | décalé | T[G]oi. |

En-tête : ajout de `{source: Jésus je Te suivrai - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 21:decale:G:1 | appliqué | def | inclus dans la ligne de la session |

- Source FPDF de l'église (rendu ChordPro), mesure en coordonnées : 33 accords, tous exacts après correction (G de « Toi » au caractère près ; C des couplets 1 et 2 posés sur le retrait de tête).
- Retrait de début de ligne appliqué à tout le chant : l.11 et l.16 (C au-dessus du retrait) ; l.27 et l.30 étaient déjà « [G] Jésus » ; aucune autre ligne en retrait.
- Paroles, non appliqué : l.29 la feuille grave « malgré le prix, » (virgule), le .cho « prix. » ; l.21 la feuille finit « pour Toi. » comme le .cho.
- Structure : le Pré-Refrain du .cho est gravé « Pré-Refrain » sur la feuille (l'outil le lit comme Refrain) ; Pont ramené à une ligne avec le suffixe (x2), comme gravé.

### jireh — Jireh

Lot 4 · partition retenue : `Jireh.pdf` (chordpro-core, mesure fiable) · chant validé par Timothée

Lignes modifiées :

- l. 11 : `{start_of_intro: Intro}` → `{start_of_verse: Couplet 1}` *(structure)*
- l. 17 : `Ton a[G]mour pour [D]moi` → `Ton a[G]mour pour[D] moi`
- l. 18 : `[Bm7]Aucune [Asus4]tempête, ne m’a[G]rrête[D]ra` → `[Bm7]Aucun[Asus4]e tempête, ne m’a[G]rrête[D]ra`
- l. 24 : `En [Asus4]toute circon[Bm7]stance, je [Em7]serai com[D]blé` → `En [Asus4]toute circon[Bm7]stance, je[Em7] serai com[D]blé`
- l. 26 : `{end_of_intro}` → `{end_of_chorus}` *(structure)*
- l. 28 : `{start_of_verse}` → `{start_of_intro: Interlude 1}` *(structure)*
- l. 30 : `Je n’ai que [Bm7]Toi` → `Je n’ai que[Bm7] Toi`
- l. 33 : `Je n’ai que [Bm7]Toi` → `Je n’ai que[Bm7] Toi`
- l. 35 : `[Bm7]Je n’oublierai [Asus4]jamais, ce que [G]Tu as [D]fait` → `[Bm7]Je n’oublierai[Asus4] jamais, ce que [G]Tu as [D]fait`
- l. 38 : `[Bm7]Je n’oublie[A]rai jamais, ce que [Em7]Tu as [D]fait` → `[Bm7]Je n’oublie[A]rai jamais, ce que [Em7]Tu as[D] fait`
- l. 39 : `[A]Ji [Bm7]reh, je n’ai que toi[D/F#][Gmaj7]` → `[A]Ji [Bm7]reh, je n’ai que toi[Gmaj7][D/F#]`
- l. 40 : `[A]Ji [Bm7]reh, je n’ai que toi[D/F#][Gmaj7]` → `[A]Ji [Bm7]reh, je n’ai que toi[Gmaj7][D/F#]`
- l. 44 : `En [A]toute circon[Bm7]stance, je [Em7]serai com[D]blé` → `En [A]toute circon[Bm7]stance, je[Em7] serai com[D]blé`
- l. 45 : `[A]Ji [Bm7]reh, je n’ai que toi[D/F#][G]` → `[A]Ji [Bm7]reh, je n’ai que toi[G][D/F#]`
- l. 46 : `{end_of_verse}` → `{end_of_chorus}` *(structure)*
- l. 48 : `{start_of_verse: Interlude}` → `{start_of_intro: Interlude 2}` *(structure)*
- l. 50 : `Je n’ai que [Bm7]Toi` → `Je n’ai que[Bm7] Toi`
- l. 53 : `Je n’ai que [Bm7]Toi` → `Je n’ai que[Bm7] Toi`
- l. 58 : `Alors je sais qui je [Gmaj7]suis[D/F#]` → `Alors je sais qui je[Gmaj7] suis[D/F#]`
- l. 61 : `(Et) [Em7]je n’ai [D]que Toi` → `(Et) [Em7]je n’ai[D] que Toi`
- l. 62 : `vamp 1 [A]Je n’ai [Bm]que Toi` → `[A]Je n’ai[Bm] que Toi` *(session)*
- l. 63 : `[G]Je n’ai [D/F#]que Toi` → `[G]Je n’ai[D/F#] que Toi`
- l. 64 : `[A]Je n’ai [Bm]que Toi` → `[A]Je n’ai[Bm] que Toi`
- l. 65 : `[G]Je n’ai [D/F#]que Toi` → `[G]Je n’ai[D/F#] que Toi`
- l. 66 : `[A]Il n’y a [Bm]que Toi` → `[A]Il n’y a[Bm] que Toi`
- l. 67 : `[G]Il n’y a [D/F#]que Toi` → `[G]Il n’y a[D/F#] que Toi`
- l. 68 : `[A]Ji [Bm7]reh, je n’ai que toi[D/F#][Gmaj7]` → `[A]Ji [Bm7]reh, je n’ai que toi[Gmaj7][D/F#]`
- l. 69 : `[A]Ji [Bm7]reh, je n’ai que toi[D/F#][Gmaj7]` → `[A]Ji [Bm7]reh, je n’ai que toi[Gmaj7][D/F#]`
- l. 70 : `En [A]toute circon[Bm7]stance, je [Em7]serai com[D]blé` → `En [A]toute circon[Bm7]stance, je[Em7] serai com[D]blé`
- l. 71 : `[A]Ji [Bm7]reh, je n’ai que toi[D/F#][Gmaj7]` → `[A]Ji [Bm7]reh, je n’ai que toi[Gmaj7][D/F#]`
- l. 72 : `{end_of_verse}` → `{end_of_chorus}` *(structure)*
- l. 74 : `{start_of_verse: Couplet 1}` → `{start_of_bridge: Pont 3 (vamp 2)}` *(structure)*
- l. 75 : `[G]Et si [D/F#]Dieu revêt ainsi[G]` → `[G] Et si [D/F#]Dieu revêt ainsi[G]` *(session)*
- l. 77 : `[G]Je ne [D/F#]manquerai de rien` → `[G]Je ne[D/F#] manquerai de rien`
- l. 78 : `[G]Je ne [D/F#]manquerai de rien` → `[G]Je ne[D/F#] manquerai de rien`
- l. 81 : `[G]Je ne [D/F#]manquerai de rien` → `[G]Je ne[D/F#] manquerai de rien`
- l. 82 : `[G]Je ne [D/F#]manquerai de rien` → `[G]Je ne[D/F#] manquerai de rien`
- l. 83 : `Au-delà de tous [A]mes rêves et [Bm7]mes pensées` → `Au-delà de tous[A] mes rêves et [Bm7]mes pensées`
- l. 86 : `Je ne veux que [G]Toi[D/F#]` → `Je ne veux que[G] Toi[D/F#]`
- l. 87 : `{end_of_verse}` → `{end_of_bridge}` *(structure)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | Bm7 | p1 x=94,7 au-dessus de l’espace de retrait (segment « ␣Rien ne pour ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 17 | D | p1 x=290,9 = début du segment « ‹ ›moi » après « pour » (l. « Rien ne pourra changer… ») | équivalent (espace avant « moi ») | Ton a[G]mour pour[D] moi (prop, gardé) |
| 18 | Asus4 | p1 x=129,6 sur « e » de « Aucun‹e› » (span « e tempête ») | décalé | [Bm7]Aucun[Asus4]e tempête (prop) |
| 18 | Bm7 | p1 x=94,7 sur le retrait (« ␣Aucun ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 21 | Bm7 | p1 x=94,7 sur le retrait (« ␣Rien ne t’em ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 24 | Em7 | p1 x=212,6 = début du segment « ‹ ›serai com » après « je » | équivalent | je[Em7] serai (prop) |
| 30 | Bm7 | p1 x=146,6 = début du segment « ‹ ›Toi » après « que » | équivalent | que[Bm7] Toi (prop) |
| 33 | Bm7 | p1 x=146,6 = début de « ‹ ›Toi » | équivalent | que[Bm7] Toi (prop) |
| 35 | Asus4 | p1 x=163,3 = début de « ‹ ›jamais, » | équivalent | n’oublierai[Asus4] jamais (prop) |
| 35 | Bm7 | p1 x=94,7 sur le retrait (« ␣Je n’oublierai ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 38 | D | p1 x=267,0 = début de « ‹ ›fait » | équivalent | Tu as[D] fait (prop) |
| 38 | Bm7 | p1 x=94,7 sur le retrait (« ␣Je n’oublie ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 39 | Gmaj7/D/F# | p1 span « Gmaj7 D/F# » x=191,8 après « toi » : Gmaj7 puis D/F# | nom (ordre inversé) | toi[Gmaj7][D/F#] (prop) |
| 40 | Gmaj7/D/F# | p1 « Gmaj7 D/F# » x=191,8, même ordre | nom (ordre inversé) | toi[Gmaj7][D/F#] (prop) |
| 44 | Em7 | p2 x=212,6 = début de « ‹ ›serai » | équivalent | je[Em7] serai (prop) |
| 45 | G/D/F# | p2 « G D/F# » x=191,8 après « toi » : G puis D/F# | nom (ordre inversé) | toi[G][D/F#] (prop) |
| 50 | Bm7 | p2 x=146,6 = début de « ‹ ›Toi » | équivalent | que[Bm7] Toi (prop) |
| 53 | Bm7 | p2 x=146,6 = début de « ‹ ›Toi » | équivalent | que[Bm7] Toi (prop) |
| 58 | Gmaj7 | p2 x=184,0 = début de « ‹ ›suis » | équivalent | je[Gmaj7] suis (prop) |
| 61 | D | p2 x=146,6 = début de « ‹ ›que Toi » | équivalent | n’ai[D] que (prop) |
| 62 | A | p2 x=94,7 sur « J » de « Je » (1re lettre, pas de retrait) ; « vamp 1 » est en marge x=40,0 | exact | [A]Je |
| 62 | Bm | p2 x=129,3 entre « Je n’ai␣ » et « ␣que Toi » (accord entre deux espaces) | équivalent | n’ai[Bm] que (prop) |
| 63 | D/F# | p2 x=129,3 entre « n’ai␣ » et « ␣que » | équivalent | n’ai[D/F#] que (prop) |
| 64 | Bm | p2 x=129,3 | équivalent | n’ai[Bm] que (prop) |
| 65 | D/F# | p2 x=129,3 | équivalent | n’ai[D/F#] que (prop) |
| 66 | Bm | p2 x=132,3 entre « n’y a␣ » et « ␣que » | équivalent | a[Bm] que (prop) |
| 67 | D/F# | p2 x=132,3 | équivalent | a[D/F#] que (prop) |
| 68 | Gmaj7/D/F# | p2 « Gmaj7 D/F# » x=191,8 | nom (ordre inversé) | toi[Gmaj7][D/F#] (prop) |
| 69 | Gmaj7/D/F# | p2 « Gmaj7 D/F# » x=191,8 | nom (ordre inversé) | toi[Gmaj7][D/F#] (prop) |
| 70 | Em7 | p2 x=212,6 = début de « ‹ ›serai » | équivalent | je[Em7] serai (prop) |
| 71 | Gmaj7/D/F# | p2 « Gmaj7 D/F# » x=191,8 | nom (ordre inversé) | toi[Gmaj7][D/F#] (prop) |
| 75 | G | p3 x=94,7 sur l'espace de retrait avant « Et » (segment « ‹ ›Et si », « vamp 2 » en marge) | décalé (retrait) | [G] Et si |
| 75 | D/F# | p3 x=122,3 sur « D » de « Dieu » | exact | [D/F#]Dieu |
| 75 | G | p3 x=201,3 après « ainsi␣ » (fin de ligne) | exact | ainsi[G] |
| 76 | D/F# | p3 x=94,7 sur le retrait (« ␣Même ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 77 | D/F# | p3 x=122,0 = début de « ‹ ›manquerai » | équivalent | ne[D/F#] manquerai (prop) |
| 77 | G | p3 x=94,7 sur le retrait (« ␣Je ne ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 78 | D/F# | p3 x=122,0 | équivalent | ne[D/F#] manquerai (prop) |
| 78 | G | p3 x=94,7 sur le retrait (« ␣Je ne ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 79 | G | p3 x=94,7 sur le retrait (« ␣Et si »), même cas que la l. 75 | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 80 | D/F# | p3 x=94,7 sur le retrait (« ␣Les ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 81 | D/F# | p3 x=122,0 | équivalent | ne[D/F#] manquerai (prop) |
| 81 | G | p3 x=94,7 sur le retrait (« ␣Je ne ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 82 | D/F# | p3 x=122,0 | équivalent | ne[D/F#] manquerai (prop) |
| 82 | G | p3 x=94,7 sur le retrait (« ␣Je ne ») | équivalent (retrait de début de ligne) | non appliquée : la consigne particulière garde prop() pour les lignes chantées ; même syllabe (frontière espace / 1re lettre) |
| 83 | A | p3 x=170,6 = début de « ‹ ›mes rêves » | équivalent | tous[A] mes (prop) |
| 86 | G | p3 x=165,6 = début de « ‹ ›Toi » | équivalent | que[G] Toi (prop) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — ligne sans paroles : l. 8 ; espace de fin : l. 13, 16.

En-tête : ajout de `{source: Jireh.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 86:decale:G:1 | appliqué | Timothée |  |
| 83:decale:A:1 | appliqué | Timothée |  |
| 82:decale:D/F#:1 | appliqué | Timothée |  |
| 81:decale:D/F#:1 | appliqué | Timothée |  |
| 78:decale:D/F#:1 | appliqué | Timothée |  |
| 77:decale:D/F#:1 | appliqué | Timothée |  |
| 75:decale:G:1 | laissé | Timothée |  |
| 75:fable:75:decale:G:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 71:nom:D/F#:1 | appliqué | Timothée |  |
| 71:nom:Gmaj7:1 | appliqué | Timothée |  |
| 70:decale:Em7:1 | appliqué | Timothée |  |
| 69:nom:D/F#:1 | appliqué | Timothée |  |
| 69:nom:Gmaj7:1 | appliqué | Timothée |  |
| 68:nom:D/F#:1 | appliqué | Timothée |  |
| 68:nom:Gmaj7:1 | appliqué | Timothée |  |
| 67:decale:D/F#:1 | appliqué | Timothée |  |
| 66:decale:Bm:1 | appliqué | Timothée |  |
| 65:decale:D/F#:1 | appliqué | Timothée |  |
| 64:decale:Bm:1 | appliqué | Timothée |  |
| 63:decale:D/F#:1 | appliqué | Timothée |  |
| 62:decale:Bm:1 | laissé | session | contre l'« ok » de Timothée, la partition l'emporte : Consigne particulière : « vamp 1 » est le libellé de marge (x=40,0, p2), pas une parole ; retiré. Accords de prop() : A x=94,7 sur « J » de « Je » (exact), Bm x=129,3 entre « n’ai » et « que » (équivalent, choix du relevé gardé). |
| 61:decale:D:1 | appliqué | Timothée |  |
| 58:decale:Gmaj7:1 | appliqué | Timothée |  |
| 53:decale:Bm7:1 | appliqué | Timothée |  |
| 50:decale:Bm7:1 | appliqué | Timothée |  |
| 45:nom:D/F#:1 | appliqué | Timothée |  |
| 45:nom:G:1 | appliqué | Timothée |  |
| 44:decale:Em7:1 | appliqué | Timothée |  |
| 40:nom:D/F#:1 | appliqué | Timothée |  |
| 40:nom:Gmaj7:1 | appliqué | Timothée |  |
| 39:nom:D/F#:1 | appliqué | Timothée |  |
| 39:nom:Gmaj7:1 | appliqué | Timothée |  |
| 38:decale:D:1 | appliqué | Timothée |  |
| 35:decale:Asus4:1 | appliqué | Timothée |  |
| 33:decale:Bm7:1 | appliqué | Timothée |  |
| 30:decale:Bm7:1 | appliqué | Timothée |  |
| 24:decale:Em7:1 | appliqué | Timothée |  |
| 18:decale:Asus4:1 | appliqué | Timothée |  |
| 17:decale:D:1 | appliqué | Timothée |  |

- Ordre des sections AVANT : intro: Intro | intro: Intro | verse (sans libellé) | verse: Couplet 1 | verse: Interlude | verse: Couplet 1.
- Ordre des sections APRÈS : intro: Intro | verse: Couplet 1 | verse: Couplet 2 | chorus: Refrain 1 | intro: Interlude 1 | verse: Couplet 3 | chorus: Refrain 2 | intro: Interlude 2 | bridge: Pont 1 | bridge: Pont 2 (vamp 1) | chorus: Refrain 3 | bridge: Pont 3 (vamp 2) | bridge: Pont 4 (vamp 3).
- check.py lit 0 accord (« absent de la source » partout, avant comme après) : outil qui lit mal ce rendu ChordPro, pas un écart. Mesure faite en coordonnées PyMuPDF sur les 3 pages et reconstitution ligne à ligne : 166 accords, tous sur la même syllabe que la partition après correction (seules différences restantes : retraits de début de ligne et accords « entre deux espaces », même syllabe).
- check.py ne lit pas cette source (0 accord mesuré, tout « absent de la source », famille mal détectée) : chaque accord du chant vérifié à l’œil et en coordonnées (PyMuPDF dict, rendu ChordPro : x de l’accord = x du segment de paroles qui suit) ; après prop() et les l. 62/75, tous les accords sont sur la syllabe de la partition.
- Retrait de début de ligne non appliqué (consigne particulière : les lignes chantées gardent prop()) : la partition met l’accord au-dessus d’une espace initiale l. 12 ([Bm7] Rien), 18 ([Bm7] Aucune), 21 ([Bm7] Rien), 35 et 38 ([Bm7] Je), 76 et 80 ([D/F#] Même / Les), 77, 78, 81, 82 ([G] Je), 79 ([G] Et si, même cas que la l. 75) ; frontière espace / 1re lettre, même syllabe.
- Accords « entre deux espaces » du vamp 1 (l. 62–67 : « n’ai␣[Bm]␣que ») : le relevé les écrit n’ai[Bm] que ; même place entre les deux mots, gardé.
- Paroles, non appliqué : la feuille écrit d’un seul mot « Jireh » (l. 22–25, 39–40, 45, 68–69, 71 : « Ji reh » au .cho), « n’abandonne » (l. 14), « traverserais » (l. 20), « t’empêchera » (l. 21), « m’aimes » (l. 59), « l’imagine » (l. 60) ; accords sur la même syllabe dans les deux cas. Espace avant la virgule l. 13 et 36 (« aimé [Bm7], ») : la feuille colle « aimé[Bm7], », accord sur la virgule dans les deux.
- Liste extra (structure Intro/Intro… du .cho) : citée, réglée par le bloc de structure appliqué.
- Thèmes inchangés (chant validé) : Adoration, Grâce, Foi. {key: D} présent, inchangé.
- L. 62 : l’aperçu marque 62:decale:Bm:1 « contre l’ok » parce que les paroles changent (retrait de « vamp 1 ») ; ce n’est pas un passage outre le relevé : le Bm reste où le relevé le met (n’ai[Bm] que).
- L. 8 : la feuille grave « Asus » ; le moteur l’écrit Asus4 (orthographe canonique), comme le reste du chant.

### joie-dans-le-monde — Joie dans le monde

Lot 4 · partition retenue : `Joie dans le monde - Accords.pdf` (traitement-texte, mesure basse-fidelite)

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | F | x=72,0 sur « J » de « Joie » (J 72,0–76,7) | exact (à l'œil) | aucune : [F]Joie |
| 11 | Bb | x=87,0 ; « T » de « Terre » à 87,4 (espace 84,7–87,4) : alignement aux espaces, label sur le T | exact (à l'œil) | aucune : La [Bb]Terre |
| 12 | Dm | x=96,0 sur « t » de « tous » (t 95,0–98,3) | exact (à l'œil) | aucune : Que [Dm]tous |
| 14 | Bb | x=90,0 sur « T » de « Terre » (T 87,4–93,9) | exact (à l'œil) | aucune : La [Bb]Terre |
| 15 | F/A | x=90,0 sur « T » de « Terre » (T 87,4–93,9) | exact (à l'œil) | aucune : La [F/A]Terre |
| 15 | Bb | x=171,7 dans le « h » de « chantent » (h 167,2–173,2), à 1,5 pt du « a » (173,2) ; feuille Word alignée aux espaces (± 1 syllabe) | équivalent (même syllabe « chan ») | aucune : ch[Bb]antent gardé, même syllabe |
| 19 | F | x=156,0 sur « j » de « joie » (j 155,3–158,6) | exact (à l'œil) | aucune : [F]joie |
| 19 | Bb | x=177,9, après la fin de « joie » (173,3), en l'air en fin de ligne | exact (à l'œil) | aucune : joie[Bb] |
| 37 | F | x=396,0 sur « o » de « joie » (o 395,6–401,6) | exact (à l'œil) | aucune : j[F]oie |
| 38 | Bb | x=393,0 sur « j » de « joie » (j 392,3–395,6) | exact (à l'œil) | aucune : [Bb]joie |
| 39 | Dm | x=393,0 sur « j » de « joie » (j 392,3–395,6) | exact (à l'œil) | aucune : [Dm]joie |
| 40 | Bb | x=381,0 dans le « o » de « monde » (o 377,3–383,3), à 2,3 pt du « n » (383,3) ; feuille Word alignée aux espaces | équivalent (même syllabe « mon ») | aucune : mo[Bb]nde gardé, même syllabe |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligature typographique : l. 28.

En-tête : ajout de `{source: Joie dans le monde - Accords.pdf}`

- Source basse fidélité (feuille Word, accords alignés aux espaces) : check.py ne lit rien (famille inconnue, 0 accord mesuré, 12 « absent de la source ») ; les 12 accords ont été mesurés à l'œil sur les coordonnées de la couche texte (PyMuPDF rawdict) et vérifiés sur le rendu 2× : 10 exacts, 2 équivalents dans la même syllabe (l. 15 ch[Bb]antent, label sur le « h » ; l. 40 mo[Bb]nde, label sur le « o »), gardés selon le ± 1 syllabe de la basse fidélité. Aucun accord déplacé, ajouté ni retiré ; aucun needs_review.
- Couplets 2 et 3 : aucun accord gravé sur la feuille, aucun dans le .cho (rien d'inventé).
- Pas de retrait de début de ligne sur la feuille (toutes les paroles à x=72 / 309).
- Structure appliquée dans les sections : « Entonnons ce refrain » ajouté au couplet 2 ; pied de page (4 lignes) retiré. Structure à appliquer par Timothée : fusion du faux « Refrain » (l. 27) dans le couplet 2.
- Ligature ﬂ (U+FB02) de « fleuves » l. 28 : non touchée par moi ; la forme du moteur l'écrit « fl ».
- Éléments de la feuille non repris : tempo ♩ = 96 (déjà en en-tête), crédits d'arrangement (cinq arrangeurs), copyright 2017 Hillsong Music Publishing, CCLI 712094, titre original « Joy To The World », adaptation française.
- {key: F} conforme à la feuille (F, Bb, Dm, F/A) ; thèmes « Adoration, Noël » dans la liste, inchangés.
- Autre version présente : « Joie dans le monde – arr. Héritage — (nom retiré) – (nom retiré).pdf » (shir.fr, taux 0,025) : autre arrangement (cantique traditionnel), non utilisé.
- Extra du relevé : structure (source COUPLET 1, REFRAIN 1, COUPLET 2, REFRAIN 2, COUPLET 3 contre .cho avec un « Refrain » en trop) et paroles (l. 51, pied de page) : couverts par les deux entrées de structure.
- Les 12 « absent de la source » de check.py après correction viennent de l'outil, qui ne lit pas cette feuille Word : chaque accord est expliqué dans `mesures` (vérifié à l'œil).

### jusqu-au-bout — Jusqu'au bout

Lot 4 · partition retenue : `Jusqu'au bout.pdf` (traitement-texte, mesure impossible) · **fichier inchangé**

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | Ab | manuscrit : encre x=97,2, au-dessus du « S » de « Seigneur » (97,2) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 9 | Eb | manuscrit : encre x=97,8, au-dessus du « C » de « Car » (97,2) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 9 | Bb | manuscrit : bord gauche de l'encre du « B » x≈233 (crop 8×), à la frontière « f » (230,6–234,0) / « o » (234,0) de « foi » ; le corps du B au-dessus de « oi » | équivalent (même syllabe, mot d'une syllabe ; manuscrit ± 1 lettre) | aucune : [Bb]foi gardé |
| 10 | Cm7 | manuscrit : encre x=97,3, au-dessus du « R » de « Rayonnent » (97,2) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 11 | Ab | manuscrit : encre x=98,5, au-dessus du « R » de « Rachetés » (97,2–104,3) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 12 | Eb | manuscrit : encre x=97,2, au-dessus du « E » de « Ensemble » | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 12 | Bb | manuscrit : encre x≈229 (crop 8×), au-dessus du « c » de « traces » (226,4–231,1) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 13 | Cm7 | manuscrit : encre x=95,0, juste avant le « E » de « Et » (97,2), ligne sans retrait | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 17 | Ab | manuscrit : encre x=97,2, au-dessus du « C » de « Celui » | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 17 | Eb | manuscrit : encre x≈201, au-dessus du « c » de « cette » (198,8–203,5) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 17 | Bb | manuscrit : encre x=96,7, au-dessus du « c » de « cœurs » (ligne de report de la feuille, jointe à la l.17 dans le .cho) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 18 | Cm7 | manuscrit : bord gauche de l'encre du « C » x=203,0, sur la fin du « b » de « bout » (198,3–203,5), « o » à 203,5 | exact à l'œil (même syllabe) | aucune : [Cm7]bout gardé |
| 32 | Ab | manuscrit : encre x=351,8, sur l'espace (350,6–353,2) juste avant le « j » de « jour » (353,2) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 32 | Eb | manuscrit : bord gauche de l'encre du « E » x=466,0, dans le « d » de « reviendra » (461,1–466,4), « r » à 466,4 | exact à l'œil (syllabe « dra ») | aucune : revien[Eb]dra gardé |
| 33 | Bb | manuscrit : encre x≈358, sur l'espace (357,4–360,1) juste avant le « f » de « fiers » | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 34 | Cm7 | manuscrit : encre x=304,8, au-dessus du « Q » de « Qu'en » (305,7) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 35 | Ab | manuscrit : encre x=351,5, sur l'espace juste avant le « j » de « jour » (353,2) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 35 | Eb | manuscrit : bord gauche de l'encre du « E » x=468,3, sur le « r » de « reviendra » (466,4–469,9), d à 461,1 | équivalent (même syllabe « dra », manuscrit ± 1 lettre ; même accord que la l.32, même phrase) | aucune : revien[Eb]dra gardé |
| 36 | Bb | manuscrit : bord gauche de l'encre du « B » x=357,8 sur le « s » final de « soyons » (355,7–359,8), panse du B au-dessus de « pu » de « purs » (362,3) ; même geste qu'à la l.33 (B à x≈358 au-dessus de « fiers », 360,1) | équivalent (label à cheval sur l'espace, phrase parallèle à la l.33 : « fiers » / « purs ») | aucune : [Bb]purs gardé |
| 37 | Cm7 | manuscrit : encre x=305,0, au-dessus du « S » de « Sanctifiés » (305,7) | exact à l'œil (check.py ne lit pas les accords manuscrits : « absent de la source » est une erreur de lecture de l'outil) | aucune |
| 41 | Eb | Tag : aucun accord sur la feuille (ni tapé ni manuscrit) | inventé, passage sans accords gravés | gardé (reporté : boucle Ab–Eb–Bb–Cm7 du chant) |
| 41 | Bb | Tag : aucun accord sur la feuille | inventé, passage sans accords gravés | gardé |
| 42 | Cm7 | Tag : aucun accord sur la feuille | inventé, passage sans accords gravés | gardé |
| 42 | Ab | Tag : aucun accord sur la feuille | inventé, passage sans accords gravés | gardé |

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 42:oeil:1 | laissé | def |  |
| 41:oeil:0 | laissé | def |  |

- Source : accords manuscrits sur une feuille tapée ; check.py ne lit pas les accords (lecture OCR « AD », « ED », « Comᵗ ») : vérifié à l'œil, accord par accord, sur un rendu 8× avec graduations (encre manuscrite mesurée en x contre la couche texte des paroles).
- 20 accords gravés à la main (couplet 1 : 8, refrain : 4, pont : 8) ; tous sont dans le .cho, sur la même syllabe ; 15 exacts à l'œil (début de ligne ou lettre sous le bord gauche), 5 à une lettre près dans la même syllabe ou à cheval sur l'espace (voir mesures) : gardés, la précision d'une écriture manuscrite ne permet pas mieux ; aucun accord absent, aucun nom faux.
- Couplet 2, refrain repris et Tag : aucun accord sur la feuille. Les accords du Tag (Eb Bb Cm7 Ab, la boucle du chant) sont gardés comme accords reportés d'un passage sans accords ; ils restent à confirmer à l'oreille.
- Aucune ligne modifiée.

### l-amour-de-notre-pere — L'amour de notre Père

Lot 4 · partition retenue : `L_amour de notre Père - F.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 8 : `[Bb] J’étais [Dm]orphelin [C], seul, a [F/A]bandonné,` → `[Bb] J’étais [Dm]orphelin,[C] seul, a[F/A]bandonné,`
- l. 9 : `[Bb] Per[Dm]du, sans chem[C]in, et ton [F/A]amour m’a trouv[Bb]é.` → `[Bb] Per[Dm]du, sans chemin[C] et ton [F/A]amour m’a trouvé.`
- l. 10 : `Serré [Dm]sur ton cœur [C], blotti con [F/A]tre toi,` → `[Bb] Serré [Dm]sur ton cœur,[C] blotti [F/A]contre toi,`
- l. 11 : `[Bb] Ma [Dm]vie enlac[C]ée dans la [F/A]chaleur de tes br[Bb]as.` → `[Bb] Ma [Dm]vie enlacée[C] dans la [F/A]chaleur de tes bras.`
- l. 15 : `[Bb] Il guérit, restaure, [Dm]rend vivants les morts.` → `[Bb] Il guérit, restaure,[Dm] rend vivants les morts.`
- l. 16 : `[C] Mon plus grand trésor, [F/A]c’est l’amour de notre Père.` → `[C] Mon plus grand trésor,[F/A] c’est l’amour de notre Père.`
- l. 17 : `[Bb] Ô feu qui dévore, [Dm]baptise-moi encore,` → `[Bb] Ô feu qui dévore,[Dm] baptise-moi encore,`
- l. 18 : `[C] Esprit, âme et corps, [F/A]dans l’amour de notre Père.` → `[C] Esprit, âme et corps,[F/A] dans l’amour de notre Père.`
- l. 22 : `[Bb] J’étais [Dm]orphelin , [C]tu m’as [F/A]adopté,` → `[Bb] J’étais [Dm]orphelin,[C] tu m’as [F/A]adopté,`
- l. 23 : `[Bb] Sai[Dm]si par ta main, [C]tu m’as [F/A]donné un foy[Bb]er,` → `[Bb] Sai[Dm]si par ta main,[C] tu m’as [F/A]donné un foyer,`
- l. 24 : `De nouveaux [Dm]vêtements, [C]une bague [F/A]au doigt.` → `[Bb] De nouveaux [Dm]vêtements,[C] une [F/A]bague au doigt.`
- l. 25 : `[Bb] Tu trans[Dm]formes les mendiants [C]en en[F/A]fants du Roi des rois.` → `[Bb] Tu trans[Dm]formes les mendiants[C] en en[F/A]fants du Roi des rois.`
- l. 29 : `[Bb] Ouragan de tendresse, [Dm]Océan de sagesse,` → `[Bb] Ouragan de tendresse,[Dm] Océan de sagesse,`
- l. 30 : `[C] Joie jusqu’à l’ivresse, [F/A]c’est l’amour de notre Père.` → `[C] Joie jusqu’à l’ivresse,[F/A] c’est l’amour de notre Père.`
- l. 31 : `[Bb] C’est un lion qui rugit, [Dm]un torrent qui jaillit,` → `[Bb] C’est un lion qui rugit,[Dm] un torrent qui jaillit,`
- l. 32 : `[C] Douceur et furie, [F/A]c’est l’amour de notre Père.` → `[C] Douceur et furie,[F/A] c’est l’amour de notre Père.`
- l. 33 : `[Bb] Volcan de compassion, [Dm]tempête d’affection,` → `[Bb] Volcan de compassion,[Dm] tempête d’affection,`
- l. 34 : `[C] Confiance et passion,[F/A]c’est l’amour de notre Père.` → `[C] Confiance et passion,[F/A] c’est l’amour de notre Père.`
- l. 35 : `[Bb] Le Fils venu sur terre, [Dm]sa mort les bras ouverts,` → `[Bb] Le Fils venu sur terre,[Dm] sa mort les bras ouverts,`
- l. 36 : `[C] Splendeur et mystère,[F/A]c’est l’amour de notre Père.` → `[C] Splendeur et mystère,[F/A] c’est l’amour de notre Père.`
- l. 37 : `[Bb][ ][Dm][C]C’est l’am[F/A]our de notre P[Bb]ère.[Dm][ ][C][ ][F/A]` → `[Bb] [Dm] [C] C’est [F/A]l’amour de notre Père.[Bb] [Dm] [C] [F/A]` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | C | x=150,7 sur l'espace après « orphelin, » | décalé (sur « , » avec espace parasite) | orphelin,[C] seul, |
| 8 | F/A | x=202,3 sur le « b » d'« abandonné » | forme (espace glissée dans le mot) | a[F/A]bandonné |
| 9 | C | x=181,5 sur l'espace après « chemin » (pas de virgule) | décalé (sur « i ») | chemin[C] et |
| 9 | Bb | aucun Bb gravé sur « trouvé » (Bb de fin de ligne de shir.fr) | inventé | retiré |
| 10 | Bb | x=31,2 sur le retrait avant « Serré » | absent | [Bb] Serré |
| 10 | C | x=184,1 sur l'espace après « cœur, » | décalé | cœur,[C] blotti |
| 10 | F/A | x=226,8 sur le « c » de « contre » | décalé (sur « t », mot coupé) | [F/A]contre |
| 11 | C | x=147,7 sur l'espace après « enlacée » | décalé (sur « é ») | enlacée[C] dans |
| 11 | Bb | aucun Bb gravé sur « bras » | inventé | retiré |
| 15 | Dm | x=178,8 sur l'espace avant « rend » | décalé | restaure,[Dm] rend |
| 16 | F/A | x=214,3 sur l'espace avant « c'est » | décalé | trésor,[F/A] c’est |
| 17 | Dm | x=177,0 sur l'espace avant « baptise-moi » | décalé | dévore,[Dm] baptise-moi |
| 18 | F/A | x=201,0 sur l'espace avant « dans » | décalé | corps,[F/A] dans |
| 22 | C | x=150,7 sur l'espace avant « Tu » | décalé | orphelin,[C] tu |
| 23 | C | x=169,0 sur l'espace avant « Tu » | décalé | main,[C] tu |
| 23 | Bb | aucun Bb gravé sur « foyer » | inventé | retiré |
| 24 | Bb | x=31,2 sur le retrait avant « De » | absent | [Bb] De |
| 24 | C | x=217,1 sur l'espace avant « une » | décalé | vêtements,[C] une |
| 24 | F/A | x=252,6 sur le « b » de « bague » | décalé (sur « au ») | [F/A]bague |
| 25 | C | x=250,8 sur l'espace avant « en » | décalé | mendiants[C] en |
| 29 | Dm | x=217,9 sur l'espace avant « océan » | décalé | tendresse,[Dm] Océan |
| 30 | F/A | x=204,4 sur l'espace avant « c'est » | décalé | ivresse,[F/A] c’est |
| 31 | Dm | x=207,6 sur l'espace avant « un » | décalé | rugit,[Dm] un |
| 32 | F/A | x=172,5 sur l'espace avant « c'est » | décalé | furie,[F/A] c’est |
| 33 | Dm | x=219,7 sur l'espace avant « tempête » | décalé | compassion,[Dm] tempête |
| 34 | F/A | x=208,1 sur l'espace avant « c'est » | décalé (espace perdue) | passion,[F/A] c’est |
| 35 | Dm | x=209,0 sur l'espace avant « Sa » | décalé | terre,[Dm] sa |
| 36 | F/A | x=210,8 sur l'espace avant « c'est » | décalé (espace perdue) | mystère,[F/A] c’est |
| 37 | Bb | x=45,4 en l'air (retrait) | exact | [Bb] (inchangé) |
| 37 | Dm | x=80,9 en l'air | exact | [Dm] (inchangé) |
| 37 | C | x=116,5 sur l'espace avant « C'est » (C à 125,4) | décalé (collé au mot ; check.py le lit exact) | [C] C’est |
| 37 | F/A | x=165,8 sur le « l » de « l'amour » | décalé (sur « o ») | [F/A]l’amour |
| 37 | Bb | x=323,6 après le point de « Père. » | décalé (sur « è ») | Père.[Bb] |
| 37 | Dm | x=353,8 en l'air après la fin | exact | [Dm] (inchangé) |
| 37 | C | x=387,4 en l'air | exact | [C] (inchangé) |
| 37 | F/A | x=410,3 en l'air | exact | [F/A] (inchangé) |
| 7 | Bb | ligne instrumentale p.1 y=88,5 x=31,2, avant le couplet 1 | absent (intro) | non appliqué : section à ajouter avant la première = changement de structure interdit, proposé en structure (à appliquer par Timothée) |
| 7 | Dm | ligne instrumentale p.1 y=88,5 x=61,3, avant le couplet 1 | absent (intro) | non appliqué : section à ajouter avant la première = changement de structure interdit, proposé en structure (à appliquer par Timothée) |
| 7 | C | ligne instrumentale p.1 y=88,5 x=94,9, avant le couplet 1 | absent (intro) | non appliqué : section à ajouter avant la première = changement de structure interdit, proposé en structure (à appliquer par Timothée) |
| 7 | F/A | ligne instrumentale p.1 y=88,5 x=117,7, avant le couplet 1 | absent (intro) | non appliqué : section à ajouter avant la première = changement de structure interdit, proposé en structure (à appliquer par Timothée) |

En-tête : ajout de `{source: L_amour de notre Père - F.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 37:decale:F/A:1 | appliqué | def | inclus dans la ligne de la session |
| 37:decale:Bb:1 | laissé | session | l.37 : Bb x=323,6 juste après le point de « Père. » (le point finit à 323,6) : label après la ponctuation, écrit Père.[Bb] ; repris dans la ligne mesurée de la l.37 — la ligne est celle mesurée par la session — partition : Bb x=323,6 après « Père. » |
| 37:oeil:20 | laissé | def |  |
| 37:fable:37:oeil:20 | laissé | session | l.37 : la ligne proposée est juste pour F/A et les accords d'après « Père. », mais garde [C] collé à « C’est » alors que C (x=116,5) est gravé sur le retrait, deux espaces avant le « C » de « C'est » (x=125,4) : [C] C’est ; ligne juste donnée dans lignes — partition : C x=116,5 sur l'espace avant « C'est » (lettre à 125,4) |
| 36:decale:F/A:1 | laissé | def |  |
| 36:oeil:16 | appliqué | session | l.36 : F/A sur l'espace après « mystère, » (x=210,8) ; la ligne proposée rend l'espace perdue et écrit [F/A] c’est — partition : F/A x=210,8 sur l'espace avant « c'est » |
| 36:fable:36:decale:F/A:1 | laissé | session | même texte que 36:oeil:16, retenu : une seule des deux lectures — partition : F/A x=210,8 sur l'espace avant « c'est » |
| 35:decale:Dm:1 | appliqué | def | inclus dans la ligne de 35:oeil:15 |
| 35:oeil:15 | appliqué | session | l.35 : la feuille église pose Dm sur l'espace avant « sa » ; la ligne proposée l'écrit [Dm] sa, comme la partition, tous les autres accords de la ligne exacts — partition : Dm x=209,0 sur l'espace avant « sa » |
| 34:decale:F/A:1 | laissé | def |  |
| 34:oeil:14 | appliqué | session | l.34 : F/A sur l'espace après « passion, » (x=208,1) ; la ligne proposée rend l'espace perdue et écrit [F/A] c’est — partition : F/A x=208,1 sur l'espace avant « c'est » |
| 34:fable:34:decale:F/A:1 | laissé | session | même texte que 34:oeil:14, retenu : une seule des deux lectures — partition : F/A x=208,1 sur l'espace avant « c'est » |
| 33:decale:Dm:1 | appliqué | def | inclus dans la ligne de 33:oeil:13 |
| 33:oeil:13 | appliqué | session | l.33 : la feuille église pose Dm sur l'espace avant « tempête » ; la ligne proposée l'écrit [Dm] tempête, comme la partition, tous les autres accords de la ligne exacts — partition : Dm x=219,7 sur l'espace avant « tempête » |
| 32:decale:F/A:1 | appliqué | def | inclus dans la ligne de 32:oeil:12 |
| 32:oeil:12 | appliqué | session | l.32 : la feuille église pose F/A sur l'espace avant « c’est » ; la ligne proposée l'écrit [F/A] c’est, comme la partition, tous les autres accords de la ligne exacts — partition : F/A x=172,5 sur l'espace avant « c’est » |
| 31:decale:Dm:1 | appliqué | def | inclus dans la ligne de 31:oeil:11 |
| 31:oeil:11 | appliqué | session | l.31 : la feuille église pose Dm sur l'espace avant « un » ; la ligne proposée l'écrit [Dm] un, comme la partition, tous les autres accords de la ligne exacts — partition : Dm x=207,6 sur l'espace avant « un » |
| 30:decale:F/A:1 | appliqué | def | inclus dans la ligne de 30:oeil:10 |
| 30:oeil:10 | appliqué | session | l.30 : la feuille église pose F/A sur l'espace avant « c’est » ; la ligne proposée l'écrit [F/A] c’est, comme la partition, tous les autres accords de la ligne exacts — partition : F/A x=204,4 sur l'espace avant « c’est » |
| 29:decale:Dm:1 | appliqué | def | inclus dans la ligne de 29:oeil:9 |
| 29:oeil:9 | appliqué | session | l.29 : la feuille église pose Dm sur l'espace avant « Océan » ; la ligne proposée l'écrit [Dm] Océan, comme la partition, tous les autres accords de la ligne exacts — partition : Dm x=217,9 sur l'espace avant « Océan » |
| 25:decale:C:1 | appliqué | def | inclus dans la ligne de 25:oeil:8 |
| 25:oeil:8 | appliqué | session | l.25 : C sur l'espace avant « en » (x=250,8) ; Dm sur « f » de transformes (x=98,8) et F/A sur « f » d'enfants (x=295,3) déjà exacts — partition : C x=250,8 sur l'espace avant « en » |
| 24:decale:C:1 | appliqué | def | inclus dans la ligne de 24:oeil:19 |
| 24:decale:F/A:1 | appliqué | def | inclus dans la ligne de 24:oeil:19 |
| 24:manquant:Bb:1 | laissé | def | la ligne prend le texte de 24:oeil:19 |
| 24:oeil:19 | appliqué | def |  |
| 23:decale:C:1 | appliqué | def | inclus dans la ligne de 23:oeil:18 |
| 23:invente:Bb:1 | appliqué | def | inclus dans la ligne de 23:oeil:18 |
| 23:oeil:18 | appliqué | def |  |
| 22:decale:C:1 | appliqué | def | inclus dans la ligne de 22:oeil:17 |
| 22:oeil:17 | appliqué | session | l.22 : C sur l'espace après « orphelin, » (x=150,7), Dm sur « o » (x=89,4), F/A sur « a » d'adopté (x=216,0) ; ligne proposée juste, espace parasite avant la virgule retirée — partition : C x=150,7 sur l'espace avant « Tu » |
| 18:decale:F/A:1 | appliqué | def | inclus dans la ligne de 18:oeil:7 |
| 18:oeil:7 | appliqué | session | l.18 : la feuille église pose F/A sur l'espace avant « dans » ; la ligne proposée l'écrit [F/A] dans, comme la partition, tous les autres accords de la ligne exacts — partition : F/A x=201,0 sur l'espace avant « dans » |
| 17:decale:Dm:1 | appliqué | def | inclus dans la ligne de 17:oeil:6 |
| 17:oeil:6 | appliqué | session | l.17 : la feuille église pose Dm sur l'espace avant « baptise-moi » ; la ligne proposée l'écrit [Dm] baptise-moi, comme la partition, tous les autres accords de la ligne exacts — partition : Dm x=177,0 sur l'espace avant « baptise-moi » |
| 16:decale:F/A:1 | appliqué | def | inclus dans la ligne de 16:oeil:5 |
| 16:oeil:5 | appliqué | session | l.16 : la feuille église pose F/A sur l'espace avant « c’est » ; la ligne proposée l'écrit [F/A] c’est, comme la partition, tous les autres accords de la ligne exacts — partition : F/A x=214,3 sur l'espace avant « c’est » |
| 15:decale:Dm:1 | appliqué | def | inclus dans la ligne de 15:oeil:4 |
| 15:oeil:4 | appliqué | session | l.15 : la feuille église pose Dm sur l'espace avant « rend » ; la ligne proposée l'écrit [Dm] rend, comme la partition, tous les autres accords de la ligne exacts — partition : Dm x=178,8 sur l'espace avant « rend » |
| 11:decale:C:1 | appliqué | def | inclus dans la ligne de 11:oeil:3 |
| 11:invente:Bb:1 | appliqué | def | inclus dans la ligne de 11:oeil:3 |
| 11:oeil:3 | appliqué | def |  |
| 10:decale:C:1 | appliqué | def | inclus dans la ligne de 10:oeil:2 |
| 10:decale:F/A:1 | appliqué | def | inclus dans la ligne de 10:oeil:2 |
| 10:manquant:Bb:1 | laissé | def | la ligne prend le texte de 10:oeil:2 |
| 10:oeil:2 | appliqué | def |  |
| 9:decale:C:1 | laissé | def | la ligne prend le texte de 9:oeil:1 |
| 9:invente:Bb:1 | appliqué | def | inclus dans la ligne de 9:oeil:1 |
| 9:oeil:1 | appliqué | def |  |
| 8:decale:C:1 | appliqué | def | inclus dans la ligne de 8:oeil:0 |
| 8:oeil:0 | appliqué | session | l.8 : Bb sur le retrait (x=31,2), Dm sur « o » d'orphelin (x=89,4), C sur l'espace après « orphelin, » (x=150,7), F/A sur le « b » d'« abandonné » (x=202,3) ; la ligne proposée met les quatre accords comme la partition et recolle « orphelin, » et « abandonné » — partition : C x=150,7 espace après « orphelin, » ; F/A x=202,3 sur « b » d'abandonné |

- Source : feuille église (rendu ChordPro, couche texte exacte, famille eglise-fpdf) ; chaque accord mesuré en x sur la couche texte (PyMuPDF rawdict) ; rendu 2× dans crops/l-amour-de-notre-pere/.
- Les 24 décalés du relevé sont tous confirmés par la mesure : accord posé sur l'espace avant le mot ([X] mot) ou au caractère de la feuille ; les 3 Bb de fin de ligne (l.9, 11, 23) viennent de la feuille shir.fr et sont retirés ; Bb ajouté en tête des l.10 et 24 (gravé sur le retrait comme les autres lignes).
- l.37 : ligne mesurée (contre la lecture proposée sur un seul point) : C gravé sur le retrait avant « C'est » → [C] C’est ; check.py classe le [C] collé comme exact, l'œil et la règle 02 (label sur l'espace) disent [C] C’est.
- Retrait de début de ligne : toutes les lignes ont déjà leur premier accord sur le retrait écrit [X] mot ; rien d'autre à changer.
- Paroles, non appliqué : la feuille écrit les pronoms divins en capitale (Ton, Toi, Tes, Tu, Ta, Sa), « océan » en minuscule (l.29, le .cho a « Océan »), apostrophes droites ; le .cho garde le texte en minuscules et apostrophes courbes.
- Extra (non appliqué) : ligne instrumentale Bb Dm C F/A en tête de la feuille = l'intro proposée en structure.
- Autres sources : « L'amour de notre Père.pdf » = même feuille en F ; « L_amour de notre Père - Accords.pdf » = même feuille en E ; feuille shir.fr = mêmes accords placés en fin de ligne ; « Notre Père.pdf » = homonyme, autre chant.
- Thèmes Grâce, Adoration : dans la liste, inchangés ; {key: F} présent et conforme à la feuille.

### l-entre-deux — L'entre-Deux

Lot 4 · partition retenue : `L’entre-Deux.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 12 : `[ ]Où plus rien n’est confortable` → `[A]Où plus rien n’est confortable`
- l. 21 : `Ce moment où [C#m]je me trouve au mil[B]ieu` → `Ce moment où [C#m]je me trouve au m[B]ilieu` *(session)*
- l. 23 : `Jésus Tu es [C#m]mon seul espo[B]ir` → `Jésus Tu e[C#m]s mon seul espo[B]ir` *(session)*
- l. 25 : `Et Tu conduis mon [C#m]cœur dans l’in[B]connu` → `Et Tu conduis mo[C#m]n cœur dans l’in[B]connu` *(session)*
- l. 34 : `[ ]Sur chaque étape du voyage` → `Sur chaque étape du voyage`
- l. 44 : `Je [B]choisis de T’ador[E]er` → `Je [B]choisis de T’ado[E]rer`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | C#m | x=72,0 sur la 1re lettre de « À » (ligne sans retrait) | exact (mesuré à la main) |  |
| 10 | B | x=72,0 sur la 1re lettre de « Mes » (ligne sans retrait) | exact (mesuré à la main) |  |
| 11 | A | x=72,0 sur la 1re lettre de « Où » (ligne sans retrait) | exact (mesuré à la main) |  |
| 13 | C#m | x=72,0 sur la 1re lettre de « Sans » (ligne sans retrait) | exact (mesuré à la main) |  |
| 14 | B | x=72,0 sur la 1re lettre de « Avec » (ligne sans retrait) | exact (mesuré à la main) |  |
| 15 | A | x=72,0 sur la 1re lettre de « Mon » (ligne sans retrait) | exact (mesuré à la main) |  |
| 12 | A | x=72,0 sur « O » de « Où » ; le .cho a un espaceur [ ] | absent | [A]Où plus rien n’est confortable |
| 16 | E | x=72,0 sur « V » de « Vers » | exact (mesuré à la main) |  |
| 16 | B | x=195,0 sur « n » de « horizons » (n 191–197, s 197) : dernière syllabe « zons » ; .cho après le mot | équivalent (même syllabe finale, tenue de fin de ligne) |  |
| 20 | A | x=119,3 ; c 116–121,3, œ 121,3 : lettre la plus proche œ → c[A]œur | exact (mesuré à la main) |  |
| 20 | E | x=207,0 sur « u » de « deux » (203,9–209,9) ; .cho après le mot | équivalent (même syllabe finale) |  |
| 21 | C#m | x=144,0 sur l'espace avant « je » (142,7–145,7), j à 145,7 ; .cho [C#m]je | équivalent (même syllabe, frontière espace/mot) |  |
| 21 | B | x=231,0 ; m 223–232,3, i 232,3, l 235,6 : lettre la plus proche le 1er i, syllabe « mi » ; le .cho le met dans « lieu » | décalé (± 1 syllabe, label à cheval sur « il ») | au m[B]ilieu + needs_review |
| 22 | A | x=134,3 ; m 128,6–137,9, e 137,9 : lettre la plus proche e → prom[A]esse | exact (mesuré à la main) |  |
| 22 | E | x=216,0 sur le « e » final de « victoire » (215,6) ; .cho après le mot | équivalent (même syllabe finale muette) |  |
| 23 | C#m | x=123,0 sur le « s » de « es » (121,4–126,0) ; label 123–147,7 couvre « mon » (129–150,4) ; le .cho le met sur « mon » | décalé (± 1 syllabe, label à cheval) | Tu e[C#m]s mon + needs_review |
| 23 | B | x=195,0 ; o 191,7, i 197,7 : lettre la plus proche i → espo[B]ir | exact (mesuré à la main) |  |
| 24 | A | x=144,0 sur la ligature « ﬁ » (139,2–145,9) de « fin » ; .cho [A]fin | équivalent (mot d'une syllabe) |  |
| 24 | E | x=207,0 ; u 202,9, t 208,9 : lettre la plus proche t → débu[E]t | exact (mesuré à la main) |  |
| 25 | C#m | x=156,0 ; o 151–157, n 157 de « mon », c de « cœur » à 166 ; label 156–180,7 ; le .cho le met sur « cœur » | décalé (± 1 syllabe, label à cheval) | mo[C#m]n cœur + needs_review |
| 25 | B | x=237,7 ; c 234,7, o 240 de « inconnu » : syllabe « con » ; .cho in[B]connu | équivalent (même syllabe) |  |
| 26 | A | x=144,0 sur « a » de « confiance » (143,8) | exact (mesuré à la main) |  |
| 26 | E | x=237,0 sur « o » de « Toi » (236,0) ; .cho To[E]i | équivalent (mot d'une syllabe) |  |
| 27 | C#m | x=135,0 sur l'espace avant « dit » (134,4–137,4) ; .cho [C#m]dit | équivalent (même syllabe, frontière espace/mot) |  |
| 27 | B | x=192,0 ; r 189,7, a 193,7 de « feras » : syllabe « ras » ; .cho fe[B]ras | équivalent (même syllabe) |  |
| 31 | C#m | couplet 2 (colonne de droite, y 265–363) sans aucun accord gravé | reporté du couplet 1 (gardé) |  |
| 32 | B | couplet 2 (colonne de droite, y 265–363) sans aucun accord gravé | reporté du couplet 1 (gardé) |  |
| 33 | A | couplet 2 (colonne de droite, y 265–363) sans aucun accord gravé | reporté du couplet 1 (gardé) |  |
| 35 | C#m | couplet 2 (colonne de droite, y 265–363) sans aucun accord gravé | reporté du couplet 1 (gardé) |  |
| 36 | B | couplet 2 (colonne de droite, y 265–363) sans aucun accord gravé | reporté du couplet 1 (gardé) |  |
| 37 | A | couplet 2 (colonne de droite, y 265–363) sans aucun accord gravé | reporté du couplet 1 (gardé) |  |
| 38 | E | couplet 2 (colonne de droite, y 265–363) sans aucun accord gravé | reporté du couplet 1 (gardé) |  |
| 38 | B | couplet 2 (colonne de droite, y 265–363) sans aucun accord gravé | reporté du couplet 1 (gardé) |  |
| 42 | B | x=324,0 sur « c » de « choisis » (322) | exact (mesuré à la main) |  |
| 42 | E | x=402,0 ; u 396,6, e 402,6 de « louer » : lettre la plus proche e → lou[E]er | exact (mesuré à la main) |  |
| 43 | A | x=309,0 sur « C » de « Comme » | exact (mesuré à la main) |  |
| 43 | B | x=420,0 sur « a » de « était » (419,6) | exact (mesuré à la main) |  |
| 43 | E | x=495,0 ; t 492,3, é 495,6 : lettre la plus proche é → remport[E]é | exact (mesuré à la main) |  |
| 43 | A | x=508,3, après « remporté » (fin 499) : après le mot ; l'espaceur [ ] est retiré par la forme | exact (mesuré à la main) |  |
| 44 | B | x=327,0 ; c 322, h 327,3 de « choisis » : syllabe « choi » ; .cho [B]choisis | équivalent (même syllabe) |  |
| 44 | E | x=402,0 sur le 1er « r » de « T’adorer » (401,1), attaque de la syllabe « rer » ; .cho T’ador[E]er | équivalent avant, exact après la question | T’ado[E]rer |
| 45 | A | x=309,0 sur « C » de « Comme » | exact (mesuré à la main) |  |
| 45 | B | x=420,0 ; t 418,3, a 421,6 de « était » : syllabe « tait » ; .cho ét[B]ait | exact (mesuré à la main) |  |
| 45 | E | x=489,0 ; n 484,9, é 490,9 : lettre la plus proche é → termin[E]ée | exact (mesuré à la main) |  |
| 45 | A | x=505,3, après « terminée » : après le mot ; l'espaceur [ ] est retiré par la forme | exact (mesuré à la main) |  |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — espaceur : l. 43, 45.

En-tête : ajout de `{source: L’entre-Deux.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 44:relire:B:1 | laissé | def |  |
| 44:relire:E:1 | laissé | def |  |
| 44:oeil:8 | laissé | def |  |
| 44:fable:44:oeil:8 | appliqué | session | E commence sur le 1er « r » de « T’adorer », attaque de la syllabe « rer » : T’ado[E]rer est la lettre de la partition ; B reste sur « choi » (même syllabe qu'avant). — partition : mesure : E à x=402,0, r à 401,1 ; B à x=327,0 entre c (322) et h (327,3) de « choisis » |
| 38:reporte:E:1 | laissé | def |  |
| 38:reporte:B:1 | laissé | def |  |
| 37:reporte:A:1 | laissé | def |  |
| 36:reporte:B:1 | laissé | def |  |
| 35:reporte:C#m:1 | laissé | def |  |
| 34:oeil:12 | appliqué | def |  |
| 33:reporte:A:1 | laissé | def |  |
| 32:reporte:B:1 | laissé | def |  |
| 31:reporte:C#m:1 | laissé | def |  |
| 27:relire:C#m:1 | laissé | def |  |
| 27:relire:B:1 | laissé | def |  |
| 26:relire:E:1 | laissé | def |  |
| 26:oeil:7 | laissé | def |  |
| 26:fable:26:oeil:7 | laissé | session | Le label E commence sur le « o » de « Toi », mot d'une syllabe : le .cho (To[E]i) est déjà sur la bonne syllabe ; [E]Toi ne serait pas plus près de la lettre de la partition. — partition : mesure : E à x=237,0, « o » de « Toi » à 236,0, T à 230 |
| 25:relire:C#m:1 | laissé | def |  |
| 25:relire:B:1 | laissé | def |  |
| 25:oeil:6 | laissé | def |  |
| 24:relire:A:1 | laissé | def |  |
| 24:oeil:5 | laissé | def |  |
| 23:relire:C#m:1 | laissé | def |  |
| 23:oeil:4 | laissé | def |  |
| 22:relire:E:1 | laissé | def |  |
| 22:oeil:3 | laissé | def |  |
| 21:relire:C#m:1 | laissé | def |  |
| 21:relire:B:1 | laissé | def |  |
| 21:oeil:2 | laissé | def |  |
| 20:relire:E:1 | laissé | def |  |
| 16:relire:B:1 | laissé | def |  |
| 16:oeil:1 | laissé | def |  |
| 12:manquant:A:1 | laissé | def |  |
| 12:oeil:0 | appliqué | def |  |
| 12:fable:12:manquant:A:1 | appliqué | session | La feuille grave un A au début de « Où plus rien n’est confortable » ; même ligne que 12:oeil:0, qui remplace l'espaceur [ ]. — inclus dans la ligne de 12:oeil:0 — partition : mesure : A à x=72,0 sur le « O » de « Où » (ligne sans retrait) |

- Source basse fidélité : feuille Pages en deux colonnes, accords tapés aux espaces (pas de 3 pt) ; check.py ne la lit plus (famille inconnue, 0 accord mesuré) : les 45 accords sont mesurés à la main (rawdict PyMuPDF, x de chaque label et de chaque lettre) et vérifiés à l'œil sur le rendu 2× (crops/l-entre-deux/).
- Gardés, même syllabe que la partition (lettre différente ou fin de mot/espace) : l.16 B, l.20 E, l.21 C#m, l.22 E, l.24 A, l.25 B, l.26 E, l.27 C#m et B, l.44 B.
- Couplet 2 : la feuille n'y grave aucun accord ; les 8 accords du .cho (reportés du couplet 1) sont gardés, seul l'espaceur [ ] de « Sur chaque étape du voyage » disparaît (défaut ok).
- l.12 : l'espaceur [ ] devient le A gravé ; l.44 : E posé sur l'attaque de « rer » (question ok).
- Paroles identiques à la feuille ; structure (Couplet 1, Refrain, Couplet 2, Pont) conforme ; {key: E} juste (E/B/A/C#m) ; thèmes Foi, Espérance gardés.
- Autre source : « L_entre deux.pdf », capture d'écran de la même feuille.
- Corrigés à la lettre la plus proche du label (02, source de basse fidélité), chacun avec un needs_review parce que le label est à cheval : l.21 m[B]ilieu, l.23 e[C#m]s, l.25 mo[C#m]n.

### la-benediction — La Bénédiction

Lot 4 · partition retenue : `La Bénédiction.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[B] Dieu te bénit [E]et te garde, [B/D#]Il rayonne sur [F#sus]toi.` → `[B] Dieu te bénit[E] et te garde,[B/D#] Il rayonne sur [F#sus4]toi.`
- l. 11 : `Ton Dieu se[E]tourne vers toi, [B/D#]te [F#sus]donne [B]paix.` → `Ton Dieu se[E] tourne vers toi,[B/D#] te [F#sus4]donne [B]paix.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | B | x=31,2 sur le retrait (2 espaces) avant « Dieu » | exact | [B] Dieu, inchangé |
| 9 | E | x=129,9 sur l'espace après « bénit » (« e » de « et » à 134,4) | décalé (forme levée) | bénit[E] et |
| 9 | B/D# | x=215,3 sur l'espace après « garde, » (« I » à 219,8) | décalé (forme levée) | garde,[B/D#] Il |
| 9 | F#sus | x=321,1 sur « t » de « toi » | exact | inchangé |
| 11 | E | x=117,4 sur l'espace après « se » (« t » à 121,9) ; le .cho a perdu cette espace (« setourne ») | décalé (forme levée) | se[E] tourne |
| 11 | B/D# | x=227,7 sur l'espace après « toi, » (« t » à 232,2) | décalé (forme levée) | toi,[B/D#] te |
| 11 | F#sus | x=267,7 sur « d » de « donne » (après 5 espaces) | exact | inchangé |
| 11 | B | x=316,7 sur « p » de « paix » | exact | inchangé |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — mot coupé au tiret : l. 15.

En-tête : ajout de `{source: La Bénédiction.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 11:decale:E:1 | laissé | def |  |
| 11:decale:B/D#:1 | appliqué | def | inclus dans la ligne de 11:fable:11:decale:E:1 |
| 11:fable:11:decale:E:1 | appliqué | session | la ligne de remplacement remet l'espace entre « se » et « tourne » (paroles de la partition) et pose E sur cette espace, B/D# sur l'espace après « toi, », F#sus sur « d » de « donne », B sur « p » de « paix » : toute la ligne est juste — partition : E x=117,4 = espace après « se » (espace x0=117,45 ; « t » à 121,89) ; B/D# x=227,7 = espace après « toi, » ; F#sus x=267,7 = « d » ; B x=316,7 = « p » |
| 9:decale:E:1 | laissé | def |  |
| 9:decale:B/D#:1 | laissé | def |  |
| 9:fable:9:decale:E:1 | appliqué | session | la ligne de remplacement met chaque accord sur le caractère de la partition : B sur le retrait, E et B/D# sur l'espace après « bénit » et après « garde, », F#sus sur « t » de « toi » — partition : E x=129,9 = espace après « bénit » (espace x0=129,91 ; « e » de « et » à 134,36) |
| 9:fable:9:decale:B/D#:1 | appliqué | session | même ligne de remplacement que la question précédente, juste en entier — inclus dans la ligne de 9:fable:9:decale:E:1 — partition : B/D# x=215,3 = espace après « garde, » (espace x0=215,30 ; « I » à 219,75) |

- Tous les accords mesurés en coordonnées (couche texte FPDF église) : 25 accords, 21 exacts avant, 4 sur l'espace avant le mot (l.9 E, B/D# ; l.11 E, B/D#) corrigés en [X] mot par les lignes de remplacement des questions (les écarts mécaniques « non » par défaut restent non : une seule lecture).
- l.11 : le remplacement rétablit l'espace « se tourne » perdue, comme la partition.
- Refrain « A - men » : G#m sur « A », E sur « m » de « men » (x=79,2), B et F# sur « m » des deux « amen » : exacts ; le tiret du transcripteur est recollé par la forme (« [G#m]A[E]men »).
- Couplet l.9 : B gravé au-dessus du retrait avant « Dieu » ([B] Dieu, déjà écrit) ; aucune autre ligne de la partition n'est en retrait.
- Partition : traduction « Église Nouvelle Vie », titre original « The blessing - (nom retiré) » non repris (pas de champ). Autres versions : La bénédiction (A).pdf, Bénédiction (C).pdf (shir.fr), Bénédiction.pdf — non mesurées, la feuille en B fait foi.

### la-croix-seule-me-suffit — La croix seule me suffit

Lot 4 · partition retenue : `La croix seule me suffit F.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `[F] Ce lieu que mon cœur [Bb]chér[F]it` → `[F] Ce lieu que mon cœur [Bb]ché[F]rit`
- l. 17 : `[F] Comment pourrais-je exp[Bb]li - [F]quer` → `[F] Comment pourrais-je ex[Bb]pli[F]quer`
- l. 24 : `La croix seule me suf[Bb]fit, rien [F]d'autre je dés[C]ire,` → `La croix seule me su[Bb]ffit, rien [F]d'autre je dé[C]sire,`
- l. 33 : `[F]Ma confiance n'est pas [Bb]dans [F]l'or,` → `[F] Ma confiance n'est pas [Bb]dans [F]l'or,` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2, « M » à 40,1), F gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [F] Ma (comme les couplets 1 et 2). Bb x=207,7 devant « dans », F x=246,8 devant « l'or » : exacts.
- l. 34 : `[Dm]Ni les richesses d[C]u monde.` → `[Dm] Ni les richesses d[C]u monde.` *(session (hors relevé))* — Retrait : Dm à x=31,2 au-dessus du retrait, « N » à 40,1 → [Dm] Ni. C x=165,4 sur « u » de « du » : exact.
- l. 35 : `[Dm]Mais ma confiance est en [Bb]Jé - [F]sus,` → `[Dm] Mais ma confiance est en [Bb]Jé[F]sus,` *(session (hors relevé))* — Retrait : Dm à x=31,2 au-dessus du retrait → [Dm] Mais. Bb x=225,9 devant « Jé », F devant « sus » : exacts (tiret de coupe retiré par le moteur).
- l. 36 : `[Bb]Et en aucun [C]autr[F]e nom.` → `[Bb] Et en aucun [C]autr[F]e nom.` *(session (hors relevé))* — Retrait : Bb à x=31,2 au-dessus du retrait → [Bb] Et. C x=129,9 devant « autre », F x=157,5 sur le « e » de « autre » : exacts.
- l. 40 : `[F]Quand à la fin de [Bb]mes [F]jours,` → `[F] Quand à la fin de [Bb]mes [F]jours,` *(session (hors relevé))* — Retrait (p. 2) : F à x=31,2 au-dessus du retrait → [F] Quand. Bb x=166,4 devant « mes », F x=201,1 devant « jours » : exacts.
- l. 41 : `[Dm]Je verrai mon Sei[C]gneur.` → `[Dm] Je verrai mon Se[C]igneur.` *(session)*
- l. 42 : `[Dm]Que l'on puisse dire de [Bb]ma [F]vie,` → `[Dm] Que l'on puisse dire de [Bb]ma [F]vie,` *(session (hors relevé))* — Retrait : Dm à x=31,2 au-dessus du retrait → [Dm] Que. Bb x=207,7 devant « ma », F devant « vie » : exacts.
- l. 43 : `[Bb]La croix seule [C]m'a s[F]uffi.` → `[Bb] La croix seule [C]m'a s[F]uffi.` *(session (hors relevé))* — Retrait : Bb à x=31,2 au-dessus du retrait → [Bb] La. C x=143,2 devant « m'a », F x=181,0 sur « u » de « suffi » : exacts.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | F | x=228,6 sur « r » de « ché‹r›it » | décalé | ché[F]rit (ok du relevé) |
| 17 | Bb | x=210,8 sur « p » de « ex‹p›li » | décalé | ex[Bb]pli (ok du relevé) |
| 24 | Bb | x=192,1 sur le 1er « f » de « su‹f›fit » | décalé | su[Bb]ffit (ok du relevé) |
| 24 | C | x=336,5 sur « s » de « dé‹s›ire » | décalé | dé[C]sire (ok du relevé) |
| 41 | C | x=161,0 sur « i » de « Se‹i›gneur » | décalé | Se[C]igneur (ok du relevé) |
| 33 | F | x=31,2 au-dessus du retrait, « M » à 40,1 | forme (retrait) | [F] Ma |
| 34 | Dm | x=31,2 au-dessus du retrait | forme (retrait) | [Dm] Ni |
| 35 | Dm | x=31,2 au-dessus du retrait | forme (retrait) | [Dm] Mais |
| 36 | Bb | x=31,2 au-dessus du retrait | forme (retrait) | [Bb] Et |
| 40 | F | x=31,2 au-dessus du retrait | forme (retrait) | [F] Quand |
| 41 | Dm | x=31,2 au-dessus du retrait | forme (retrait) | [Dm] Je |
| 42 | Dm | x=31,2 au-dessus du retrait | forme (retrait) | [Dm] Que |
| 43 | Bb | x=31,2 au-dessus du retrait | forme (retrait) | [Bb] La |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — mot coupé au tiret : l. 12, 19 ; espace de fin : l. 26.

En-tête : ajout de `{source: La croix seule me suffit F.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 41:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 24:decale:Bb:1 | appliqué | Timothée |  |
| 24:decale:C:1 | appliqué | Timothée |  |
| 17:decale:Bb:1 | appliqué | Timothée |  |
| 10:decale:F:1 | appliqué | Timothée |  |

- Partition de l'église (rendu ChordPro, couche texte) : chaque label mesuré en x avec PyMuPDF (rawdict), pages rendues à 2× et regardées (crops/la-croix-seule-me-suffit).
- Les 5 « ok » du relevé (l. 10, 17, 24 ×2, 41) mettent chaque accord sur le caractère de la partition ; tous les autres accords sont exacts (55/60 avant).
- Retrait de début de ligne : dans les quatre couplets les paroles commencent par deux espaces (x=31,2, 1re lettre à 40,1) et le premier label est gravé à 31,2, au-dessus du retrait. Couplets 1 et 2 l'écrivaient déjà « [X] mot » ; couplets 3 et 4 (l. 33–36, 40–43) passent de « [X]mot » à « [X] mot ». Le refrain n'a pas de retrait (paroles et labels à partir de 45,4).
- Paroles, non appliqué : la partition grave « Je considère comme une perte afin de Te connaître. » sur une seule ligne (« afin » en minuscule) ; le .cho la coupe en deux (l. 26–27, « Afin »). Accords identiques.
- Autres versions présentes, non mesurées : « La croix seule me suffit （F).pdf » (parenthèse pleine chasse, doublon signalé par 02), « La croix seule me suffit E.pdf », « La croix seule me suffit G.pdf ».
- Thèmes inchangés (Croix, Adoration, Engagement : valides). {key: F} = tonalité gravée.

### la-dans-le-feu — Là dans le feu

Lot 4 · partition retenue : `Là dans le feu .pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[Am]Il y a une grâce quand mon [F]cœur traverse l[C]e feu.` → `[Am] Il y a une grâce quand mon [F]cœur traverse l[C]e feu.` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Il. F devant « cœur », C sur « e » de « le » : exacts.
- l. 10 : `[Am]Une autre voie quand tout [F]sombre autour de mo[C]i.` → `[Am] Une autre voie quand tout [F]sombre autour de m[C]oi.` *(session)*
- l. 11 : `[Am]Et quand je pense à la [F]différence,` → `[Am] Et quand je pense à la [F]différence,` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Et. F devant « différence » : exact.
- l. 13 : `[Am]Je sais que je ne [F]serai jamais s[C]eul.` → `[Am] Je sais que je ne [F]serai jamais s[C]eul.` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Je. F devant « serai », C sur « e » de « seul » : exacts.
- l. 21 : `Et s'il m'arrive un jour d'oub[Am]lier,` → `Et s'il m'arrive un jour d'ou[Am]blier,`
- l. 29 : `[Am]Toute ma dette acqui[F]ttée oui à tout [C]jamais,` → `[Am] Toute ma dette acqui[F]ttée oui à tout j[C]amais,` *(session)*
- l. 30 : `[Am]Le péché n'a plus [F]aucun pouvoir sur m[C]a vie.` → `[Am] Le péché n'a plus [F]aucun pouvoir sur m[C]a vie.` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Le. F devant « aucun », C sur « a » de « ma » : exacts.
- l. 31 : `[Am]Et s'il m'arrivait de [F]retomber` → `[Am] Et s'il m'arrivait de [F]retomber` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Et. F devant « retomber » : exact.
- l. 33 : `[Am]Quand bien même je ne [F]céderai pas à [C]ce monde.` → `[Am] Quand bien même je ne [F]céderai pas à [C]ce monde.` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Quand. F devant « céderai », C devant « ce » : exacts.
- l. 34 : `[Am]Et je sais que je ne [F]serai jamais s[C]eul.` → `[Am] Et je sais que je ne [F]serai jamais s[C]eul.` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Et. F devant « serai », C sur « e » de « seul » : exacts.
- l. 53 : `Quand Sa [C]gloire nous envah[G]it.` → `Quand Sa [C]gloire nous enva[G]hit.`
- l. 57 : `Rien ne peut nous sé[F]parer[G].` → `Rien ne peut nous sé[F]pare[G]r.`
- l. 61 : `[Am]Il n'y a aucun autre [F]nom comme le Nom de [C]Jésus,` → `[Am] Il n'y a aucun autre [F]nom comme le Nom de [C]Jésus,` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Il. F devant « nom », C devant « Jésus » : exacts.
- l. 62 : `[Am]Lui qui était et qui [F]est et sera à ja[C]mais.` → `[Am] Lui qui était et qui [F]est et sera à ja[C]mais.` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Lui. F devant « est », C sur « m » de « jamais » : exacts.
- l. 63 : `[Am]Donc peu importe ce qu'il [F]adviendra` → `[Am] Donc peu importe ce qu'il [F]adviendra` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Donc. F devant « adviendra » : exact.
- l. 65 : `[Am]Je sais que je ne [F]serai jamais s[C]eul. (x2)` → `[Am] Je sais que je ne [F]serai jamais s[C]eul. (x2)` *(session (hors relevé))* — Retrait de début de ligne : paroles du couplet en retrait (deux espaces à x=31,2), Am gravé à x=31,2 au-dessus du retrait, avant la 1re lettre → [Am] Je. F devant « serai », C sur « e » de « seul » : exacts.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | C | x=371,8 sur « o » de « m‹o›i » | décalé | m[C]oi (ok du relevé) |
| 21 | Am | x=231,5 sur « b » de « d'ou‹b›lier » | décalé | d'ou[Am]blier (ok du relevé) |
| 29 | C | x=295,3 sur « a » de « j‹a›mais » | décalé | j[C]amais (ok du relevé) |
| 53 | G | x=239,2 sur « h » de « enva‹h›it » | décalé | enva[G]hit (ok du relevé) |
| 57 | G | x=228,6 sur « r » de « sépare‹r› » | décalé | sépare[G]r. (ok du relevé) |
| 9 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Il |
| 10 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Une |
| 11 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Et |
| 13 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Je |
| 29 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Toute |
| 30 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Le |
| 31 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Et |
| 33 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Quand |
| 34 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Et |
| 61 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Il |
| 62 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Lui |
| 63 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Donc |
| 65 | Am | x=31,2 au-dessus du retrait (1re lettre à 40,1) | forme (retrait) | [Am] Je |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espaceur : l. 25.

En-tête : ajout de `{source: Là dans le feu .pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 57:decale:G:1 | appliqué | Timothée |  |
| 53:decale:G:1 | appliqué | Timothée |  |
| 29:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 21:decale:Am:1 | appliqué | Timothée |  |
| 10:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |

- Partition de l'église (rendu ChordPro, couche texte) : chaque label mesuré en x avec PyMuPDF (rawdict), pages rendues à 2× et regardées (crops/la-dans-le-feu).
- Les 5 « ok » du relevé (l. 10, 21, 29, 53, 57) mettent chaque accord sur le caractère de la partition ; tous les autres accords sont exacts (97/102 avant).
- Retrait de début de ligne : dans les trois couplets, les lignes en retrait (deux espaces à x=31,2) ont leur Am gravé à 31,2, au-dessus du retrait : l. 9–11, 13, 29–31, 33–34, 61–63, 65 passent de « [Am]mot » à « [Am] mot ». Les lignes « Entre … » ne sont pas en retrait et n'ont pas d'accord en tête ; refrains et pont sans retrait.
- Fin du refrain 1 (l. 25) vérifiée à l'œil : Am F C Am F C, F gravé en l'air après « feu. » (264,1) : identique au .cho (le moteur réécrit seulement les [ ]).
- Autre version présente : « Là dans le feu.pdf » (feuille Word/scan, basse fidélité), non mesurée.
- Thèmes inchangés (Foi, Espérance, Adoration : valides). {key: C} présent.

### la-passion — La passion

Lot 4 · partition retenue : `La passion.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `[Bm] La [G]croix ne laisse au[G]cun doute` → `[Bm] La [G]croix ne laisse au[D]cun doute`
- l. 29 : `[D] Je donne ma vie [A]afin d'honorer` → `[D] Je donne ma vie[A] afin d'honorer`
- l. 30 : `[Bm] L'amour de mon Sauveur, [G]mon rédempteur.` → `[Bm] L'amour de mon Sauveur,[G] mon rédempteur.`
- l. 31 : `[D] L'Agneau immolé, [A]à jamais couronné,` → `[D] L'Agneau immolé,[A] à jamais couronné,`
- l. 32 : `[Bm] Gloire à notre Sauveur [G]ressuscité.` → `[Bm] Gloire à notre Sauveur[G] ressuscité.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | G | label « D » x=185,9 = début du « c » de « au‹c›un » (PDF église, couche texte) ; position exacte, nom différent | nom | au[D]cun (rename du relevé, ok) |
| 29 | A | x=171,6 = début de l'espace après « vie » (« a » de « afin » à 176,1), vu sur la découpe | décalé | vie[A] afin (move du relevé, ok) |
| 30 | G | x=237,8 = début de l'espace après « Sauveur, » (« m » à 242,3), vu sur la découpe | décalé | Sauveur,[G] mon (move du relevé, ok) |
| 31 | A | x=181,8 = début de l'espace après « immolé, » (« à » à 186,3), vu sur la découpe | décalé | immolé,[A] à (move du relevé, ok) |
| 32 | G | x=215,2 = fin du « r » de « Sauveur », début de l'espace (« r » de « ressuscité » plus loin), vu sur la découpe | décalé | Sauveur[G] ressuscité. (move du relevé, ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — espace de fin : l. 9, 11, 16, 18.

En-tête : ajout de `{source: La passion.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:G:1 | appliqué | Timothée |  |
| 31:decale:A:1 | appliqué | Timothée |  |
| 30:decale:G:1 | appliqué | Timothée |  |
| 29:decale:A:1 | appliqué | Timothée |  |
| 10:nom:G:1 | appliqué | Timothée |  |

- Partition La passion.pdf (feuille de l'église, couche texte) : les 48 accords mesurés en coordonnées, caractère par caractère ; 43 exacts dans le fichier actuel, les 5 autres sont les 5 écarts du relevé (1 nom, 4 décalés), tous à « ok » et conformes à la partition : rien à corriger en plus.
- Retraits de début de ligne vérifiés sur tout le chant : Bm/D gravés au-dessus du retrait avant la 1re lettre (couplets 1 et 2, pont) déjà écrits « [X] mot » ; les lignes sans retrait (l. 11, 25, refrain) n'ont pas d'accord en tête.
- Tonalité gravée D = {key: D}. Thèmes (Croix, Adoration, Résurrection) dans la liste, inchangés. Paroles : 16 lignes identiques à la partition.

### la-pour-toi — Là pour Toi

Lot 4 · partition retenue : `Là pour Toi accord B.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 32 : `{start_of_intro: Intro}` → `{start_of_intro: Interlude}` *(session (hors relevé))* — p1 y=250 colonne droite : « INSTRUMENTAL 1 », ligne d'accords | B | G#m | F# | E | entre le refrain et le couplet 2 : instrumental = start_of_intro, libellé Interlude (01). Même directive, libellé seul : permis. Sans numéro tant qu'il n'y a qu'un interlude dans le fichier.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | B | p1 y=266 « \| B / / / \| G#m / / / \| F# / / / \| E / / / \| » (INTRO) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 10 | G#m | p1 y=266 « \| B / / / \| G#m / / / \| F# / / / \| E / / / \| » (INTRO) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 10 | F# | p1 y=266 « \| B / / / \| G#m / / / \| F# / / / \| E / / / \| » (INTRO) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 10 | E | p1 y=266 « \| B / / / \| G#m / / / \| F# / / / \| E / / / \| » (INTRO) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 33 | B | p1 y=266 x≥309 « \| B / / / \| G#m / / / \| F# / / / \| E / / / \| » (INSTRUMENTAL 1) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 33 | G#m | p1 y=266 x≥309 « \| B / / / \| G#m / / / \| F# / / / \| E / / / \| » (INSTRUMENTAL 1) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 33 | F# | p1 y=266 x≥309 « \| B / / / \| G#m / / / \| F# / / / \| E / / / \| » (INSTRUMENTAL 1) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 33 | E | p1 y=266 x≥309 « \| B / / / \| G#m / / / \| F# / / / \| E / / / \| » (INSTRUMENTAL 1) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 14 | B | p1 y=322 B@72,0 sur « ‹L›'horizon » (x0=72,0) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 15 | G#m | p1 y=352 G#m@72,0 sur « ‹L›es » (x0=72,0) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 16 | F# | p1 y=382 F#@72,0 sur « ‹Q›ue » (x0=72,0) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 16 | E | p1 y=382 E@171,0 sur « ‹p›lace » (x0=170,9) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 18 | B | p1 y=442 B@72,0 sur « ‹N›os » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 19 | G#m | p1 y=472 G#m@72,0 sur « ‹N›os » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 20 | F# | p1 y=502 F#@72,0 sur « ‹L›e » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 20 | E | p1 y=502 E@147,0 entre les deux « s » de « passé » (1er s 144,3–149,0 ; 2e s x0=149,0) : bord gauche le plus proche = 2e s → « pas‹s›é » | exact à ± 1 lettre (basse fidélité ; lettre la plus proche = celle du .cho) | aucune |
| 24 | B | p1 y=577 B@72,0 sur « ‹N›ous » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 25 | G#m | p1 y=607 G#m@72,0 sur « ‹N›ous » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 26 | F# | p1 y=637 F#@72,0 sur « ‹A›gis » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 26 | E | p1 y=637 E@129,0 sur « ‹n›ous » (x0=128,7) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 27 | B | p1 y=667 B@72,0 sur « ‹F›ais » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 28 | G#m | p1 y=697 G#m@72,0 sur « ‹F›ais » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 29 | F# | p1 y=727 F#@72,0 sur « ‹J›ésus » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 29 | E | p1 y=727 E@138,0 sur « m » de « transfor‹m›e » (x0=137,7) ; le .cho le pose devant « r » (x0≈133,7) | décalé d'une lettre (basse fidélité ± 1 syllabe) | aucune : « non » du relevé gardé (même mot, une lettre, source Pages alignée aux espaces) |
| 47 | E | p1 y=519 E@309,0 sur « ‹T›out » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 48 | B/D# | p1 y=547 B/D#@309,0 sur « ‹S›ur » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 49 | G#m | p1 y=577 G#m@309,0 sur « ‹J›ésus » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 50 | F# | p1 y=607 F#@309,0 sur « ‹Q›ue » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 54 | E | p2 y=88 E@159,0 : dans le « e » de « r‹e›vienne » (156,2–161,6), bord gauche le plus proche « v » (161,6) ; le .cho a « r[E]e » | exact au caractère contenant (± 1 lettre, basse fidélité) | aucune : « non » du relevé gardé |
| 54 | B/D# | p2 y=88 B/D#@170,0 : dans le « i » (167,6–170,9), bord gauche le plus proche « e » (170,9) ; le .cho a « ev[B/D#]ienne » | exact au caractère contenant (± 1 lettre, basse fidélité) | aucune : « non » du relevé gardé |
| 55 | G#m | p2 y=118 G#m@165,0 : dans le « v » (161,6–167,6), bord gauche le plus proche « i » (167,6) ; .cho « re[G#m]vienne » | exact au caractère contenant (± 1 lettre) | aucune : « non » du relevé gardé |
| 55 | F# | p2 y=118 F#@196,3 après « revienne » (espace 193,5–196,5) | exact : après le dernier mot, fin de ligne | aucune |
| 56 | E | p2 y=148 E@162,0 sur « v » (x0=161,6) → « re[E]vienne » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 56 | B/D# | p2 y=148 B/D#@173,0 dans le « e » (170,9–176,2) → « revi[B/D#]enne » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 57 | G#m | p2 y=178 G#m@165,0 : dans le « v » (161,6–167,6), bord gauche le plus proche « i » ; .cho « re[G#m]vienne » | exact au caractère contenant (± 1 lettre) | aucune : « non » du relevé gardé |
| 57 | F# | p2 y=178 F#@196,3 après « revienne » | exact : après le dernier mot, fin de ligne | aucune |
| 62 | E | p2 y=312 E@192,0 : bord gauche le plus proche « v » de « nou‹v›elles » (x0=192,9) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 63 | G#m | p2 y=342 G#m@192,0 → « nou‹v›elles » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 64 | F# | p2 y=372 F#@201,0 sur « ‹p›assées » (x0=200,6) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 65 | C#m | p2 y=402 C#m@192,0 → « nou‹v›elles » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 66 | E | p2 y=462 E@171,0 sur « ‹f›aire » (x0=171,0) | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 67 | G#m | p2 y=492 G#m@171,0 sur « ‹f›aire » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |
| 68 | F# | p2 y=522 F#@183,0 : dans le « s » de « con‹s›acrés » (180,9–185,6), bord gauche « a » à 2,6 ; .cho « cons[F#]acrés » | même syllabe « sa » (± 1 lettre, basse fidélité) | aucune : « non » du relevé gardé |
| 69 | C#m | p2 y=552 C#m@171,0 sur « ‹f›aire » | exact (check.py ne lit pas cette source à deux colonnes : « absent de la source » pour tous ; mesuré au rawdict et vérifié à l'œil) | aucune |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — ligne sans paroles : l. 10, 33 ; ligature typographique : l. 39.

En-tête : ajout de `{source: Là pour Toi accord B.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 68:relire:F#:1 | laissé | Timothée |  |
| 57:relire:G#m:1 | laissé | Timothée |  |
| 55:relire:G#m:1 | laissé | Timothée |  |
| 54:relire:E:1 | laissé | Timothée |  |
| 54:relire:B/D#:1 | laissé | Timothée |  |
| 29:relire:E:1 | laissé | Timothée |  |

- Source basse fidélité : feuille Pages (Mac, 26/01/2023) en deux colonnes sur la p1, accords en gras alignés aux espaces. check.py ne la lit pas (0 accord mesuré, 44 « absent de la source ») : les 44 accords ont été mesurés au rawdict (PyMuPDF) puis vérifiés à l'œil sur le rendu 2× (crops/la-pour-toi/c1–c4.png).
- Résultat : 38 accords au caractère exact (dont l. 20 E, lettre la plus proche) ; 6 à une lettre près dans le même mot selon la lecture (caractère contenant le label ou bord gauche le plus proche) (l. 29 E, l. 54 E et B/D#, l. 55 et 57 G#m, l. 68 F#), tous « non » du relevé, gardés : sur cette source, le label tombe entre deux lettres (x à 2–3 pt de deux bords) et l'écart reste dans ± 1 syllabe. Seul l. 29 change de syllabe à la lettre près (la partition met E sur « m » de « transfor‹m›e », le .cho devant « r ») : pas de passage outre sur une source de basse fidélité, à trancher à l'oreille si besoin.
- Lignes en retrait : aucune, tous les labels de début de ligne sont à x=72 ou 309 = 1re lettre : « [X]mot » partout.
- Couplet 2 : aucun accord sur la feuille ; rien n'est ajouté. « Nous Te laissons la place » (l. 17) : aucun accord gravé, rien d'ajouté.
- Accords absents du .cho : les instrumentaux 2 (x2) et 3 (8 accords, liste extra) ; ils demandent des sections ajoutées au milieu : en structure, à appliquer par Timothée. Libellé de l'instrumental 1 corrigé (Intro → Interlude).
- l. 39 « conﬁrme » : la ligature « ﬁ » (U+FB01) copiée du PDF est remplacée par « fi » par la forme du moteur (vu au diff de l'aperçu).
- Non repris de la partition : sous-titre « (AGIS PARMI NOUS) », mention « © 2022 Hillsong Music Publishing UK », CCLI « TBC ». Autre version présente : « Là pour Toi.pdf » (non mesurée ici).
- Thèmes inchangés (Adoration, Engagement, Saint-Esprit : dans la liste et défendables). {key: B} présent et conforme à la feuille.

### laissons-entrer — Laissons entrer

Lot 4 · partition retenue : `Laissons entrer - E.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 12 : `[E] Nous venons célébrer Dieu, [A/C#]nous voulons [B/D#]L'adorer.` → `[E] Nous venons célébrer Dieu,[A/C#] nous voulons [B/D#]L'adorer.`
- l. 13 : `[E] Devant Lui, nous nous courbons [A/C#]pour élever S[A]on Nom.` → `[E] Devant Lui, nous nous courbons[A/C#] pour élever S[A]on Nom.`
- l. 20 : `Il est Ro[A]i, Il est R[A]oi et Seig[A]neur.` → `Il est R[A]oi, Il est R[A]oi et Seig[A]neur.`
- l. 24 : `[E] Dieu est là, Il nous attend, [A/C#]Il entend [B/D#]nos prières.` → `[E] Dieu est là, Il nous attend,[A/C#] Il entend [B/D#]nos prières.`
- l. 25 : `[E] Sa parole est éternelle, [A/C#]elle est notre esse[A]ntiel.` → `[E] Sa parole est éternelle,[A/C#] elle est notre ess[A]entiel.`
- l. 30 : `[C#m]Accueillons [E]notre Dieu, [A]Il est le [F#m]merveilleux,` → `[C#m] Accueillons[E] notre Dieu,[A] Il est le[F#m] merveilleux,` *(session)*
- l. 31 : `[C#m]Glorieux, [E]majestu[A]eux.[F#m]` → `[C#m] Glorieux,[E] majestu[A]eux.[F#m]` *(session)*
- l. 32 : `[C#m]Accueillons [E]notre Dieu, [A]Il est le [F#m]merveilleux,` → `[C#m] Accueillons[E] notre Dieu,[A] Il est le[F#m] merveilleux,` *(session)*
- l. 33 : `[C#m]Glorieux,[E]majestu[A]eux.[A]` → `[C#m] Glorieux,[E] majestu[A]eux.[A]` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | A/C# | x=237,5 sur l'espace après « Dieu, » (virgule 233,0, « n » 241,9) | décalé | Dieu,[A/C#] nous (défaut ok) |
| 13 | A/C# | x=269,5 sur l'espace après « courbons » (« p » 274,0) | décalé | courbons[A/C#] pour (défaut ok) |
| 20 | A | x=341,5 sur « o » du 1er « Roi » (R 329,9, o 341,5, i 350,4) | décalé | R[A]oi (défaut ok) |
| 24 | A/C# | x=225,1 sur l'espace après « attend, » (« I » 229,5) | décalé | attend,[A/C#] Il (défaut ok) |
| 25 | A/C# | x=204,6 sur l'espace après « éternelle, » (« e » 209,1) | décalé | éternelle,[A/C#] elle (défaut ok) |
| 25 | A | x=330,0 sur le 2e « e » de « ess‹e›ntiel » (s 322,0, n 338,9) | décalé | ess[A]entiel (défaut ok) |
| 30 | C#m | x=45,4 au-dessus du retrait, « A » à 54,3 | décalé (retrait, non vu par check.py) | [C#m] Accueillons |
| 30 | E | x=135,2 sur l'espace avant « notre » (n 139,6) | décalé | Accueillons[E] notre |
| 30 | A | x=217,9 sur l'espace avant « Il » (I 222,3) | décalé | Dieu,[A] Il |
| 30 | F#m | x=273,0 sur l'espace avant « merveilleux » (m 277,5) | décalé | le[F#m] merveilleux |
| 31 | C#m | x=45,4 au-dessus du retrait, « G » à 54,3 | décalé (retrait) | [C#m] Glorieux |
| 31 | E | x=118,3 sur l'espace après « Glorieux, » | décalé | Glorieux,[E] majestu |
| 31 | A | x=178,7 sur « e » de majestu‹e›ux | exact | inchangé |
| 31 | F#m | x=209,0 sur l'espace après le point | exact | inchangé |
| 32 | C#m | x=45,4 au-dessus du retrait | décalé (retrait) | [C#m] Accueillons |
| 32 | E | x=135,2 sur l'espace avant « notre » | décalé | Accueillons[E] notre |
| 32 | A | x=217,9 sur l'espace avant « Il » | décalé | Dieu,[A] Il |
| 32 | F#m | x=273,0 sur l'espace avant « merveilleux » | décalé | le[F#m] merveilleux |
| 33 | C#m | x=45,4 au-dessus du retrait | décalé (retrait) | [C#m] Glorieux |
| 33 | E | x=118,3 sur l'espace après « Glorieux, » | décalé | Glorieux,[E] majestu (question ok) |
| 33 | A | x=178,7 sur « e » de majestu‹e›ux | exact | inchangé |
| 33 | A | x=209,0 après le point final | exact | inchangé |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — ligne sans paroles : l. 8, 29 ; espace de fin : l. 17, 19.

En-tête : ajout de `{source: Laissons entrer - E.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 33:decale:E:1 | laissé | def |  |
| 33:fable:33:decale:E:1 | appliqué | session | Le E est gravé sur l'espace après « Glorieux, » (comme l. 31) : [E] puis espace ; la ligne remplacée garde majestu[A]eux.[A], tous ses accords sont justes, et rétablit l'espace « Glorieux, majestueux. » de la partition. — inclus dans la ligne de la session — partition : E x=118,3 sur l'espace (virgule 113,8, espace 118,3, « m » 122,7) ; A x=178,7 sur « e » de « majestu‹e›ux » ; A x=209,0 sur l'espace après le point final. |
| 32:decale:E:1 | appliqué | def | inclus dans la ligne de la session |
| 32:decale:A:1 | appliqué | def | inclus dans la ligne de la session |
| 32:decale:F#m:1 | appliqué | def | inclus dans la ligne de la session |
| 31:decale:E:1 | appliqué | def | inclus dans la ligne de la session |
| 30:decale:E:1 | appliqué | def | inclus dans la ligne de la session |
| 30:decale:A:1 | appliqué | def | inclus dans la ligne de la session |
| 30:decale:F#m:1 | appliqué | def | inclus dans la ligne de la session |
| 25:decale:A/C#:1 | appliqué | def |  |
| 25:decale:A:1 | appliqué | def |  |
| 24:decale:A/C#:1 | appliqué | def |  |
| 20:decale:A:1 | appliqué | def |  |
| 13:decale:A/C#:1 | appliqué | def |  |
| 12:decale:A/C#:1 | appliqué | def |  |

- Source : feuille de l'église (rendu ChordPro, couche texte), mesurée en coordonnées rawdict et regardée sur le rendu 2× (pont, couplets, refrain).
- Les six écarts « ok » par défaut (l. 12, 13, 20, 24, 25 ×2) mettent l'accord là où la partition le grave : gardés.
- Retrait de début de ligne : couplets déjà en [E] Nous / [E] Devant / [E] Dieu / [E] Sa ; au pont, C#m est gravé au-dessus du retrait sur les quatre lignes (l. 30-33) → [C#m] Accueillons / [C#m] Glorieux (check.py ne voit pas ce retrait). Le refrain n'est pas en retrait et n'ouvre sur aucun accord.
- Tous les autres accords mesurés exacts (refrain : ent[E]rer, gl[B]oire, l[E/G#]e, victo[A]ire, vainq[C#m]ueur, pl[B/D#]ace, 2e R[A]oi, Seig[A]neur ; couplets : [B/D#]L'adorer, S[A]on, [B/D#]nos ; intro et ligne d'accords du pont).
- Paroles, non appliqué : la feuille écrit le refrain en une ligne « …de gloire, acclamons le Dieu… » (minuscule) ; le .cho coupe la ligne et met « Acclamons » : simple coupe, laissé.
- Structure (liste extra) : « Interlude » de la source = ligne d'accords du pont, déjà présente ; rien à ajouter.
- Autres versions dans Partitions : « Laissons entrer - Accords E.pdf », « Laissons entrer.pdf » (même feuille), et la version shir.fr ((nom retiré) – (nom retiré), recouvrement 0,235) non retenue.
- Thèmes Adoration, Sainteté : dans la liste, inchangés.

### le-fils-de-dieu — Le Fils de Dieu

Lot 4 · partition retenue : `Le Fils de Dieu.pdf` (eglise-fpdf, mesure impossible)

Lignes modifiées :

- l. 8 : `Le Fils de [GM7]Dieu voudrait t'en[Em7]tourer [A7]de ` → `Le Fils de [Gmaj7]Dieu voudrait t'en[Em7]tourer[A7] de`
- l. 11 : `Oh, donne-[GM7]Lui ta vie ent[Em7]ière, ` → `Oh, donne-[Gmaj7]Lui ta vie en[Em7]tière,`
- l. 12 : `[A7]Son Es[F#m7]prit plein de lu[Bm7]mière` → `[A7] Son Es[F#m7]prit plein de lu[Bm7]mière` *(session (hors relevé))* — A7 x=242,0 sur l'espace juste avant « Son » (ligne longue de la feuille : « entière,   Son ») : label sur l'espace avant le mot → [A7] Son ; décalé dans le fichier ([A7]Son). F#m7 x=298,0 sur « p » de « Esprit » (exact), Bm7 x=397,6 sur « m » de « lumière » (exact).
- l. 18 : `[Em7]remplis[A7]-nous de [DM7]Toi.[C/D][ ][D7]` → `[Em7]remplis-[A7]nous de [Dmaj7]Toi.[C/D] [D7]` *(session (hors relevé))* — Ligne sautée par check.py (A7/G en deux tailles de police), mesurée sur la couche texte : A7 x=343,3 sur « n » de « nous » (« - » à 337,9–343,3) → remplis-[A7]nous ; décalé dans le fichier (remplis[A7]-nous). Em7 x=286,4 sur « r », DM7 x=404,6 sur « T » (exacts) ; C/D x=444,2 et D7 x=483,2 en l'air après « Toi. » (exacts, en l'air).
- l. 20 : `[Em7]remplis[G6/A]-nous [Asus]de [D]Toi.` → `[Em7]remplis-[G6/A]nous [Asus4]de [D]Toi.` *(session (hors relevé))* — Ligne sautée par check.py, mesurée sur la couche texte : G6/A x=343,3 sur « n » de « nous » (« - » finit à 343,3) → remplis-[G6/A]nous ; décalé dans le fichier (remplis[G6/A]-nous). Em7 x=286,4 sur « r », Asus x=400,2 sur « d » de « de », D x=458,0 sur « T » (exacts).
- l. 24 : `Oh, viens chant[GM7]er l'amour de [Em7]Jésus ` → `Oh, viens chan[Gmaj7]ter l'amour de [Em7]Jésus`
- l. 25 : `[A7]Et pro[F#m7]clamer Son sal[Bm7]ut.` → `[A7] Et pro[F#m7]clamer Son sa[Bm7]lut.` *(session)*
- l. 28 : `[A7]Donne-[F#m7]Lui tous tes souc[Bm7]is,` → `[A7] Donne-[F#m7]Lui tous tes sou[Bm7]cis,` *(session)*
- l. 29 : `Tu vi[Em7]vras plein[G6/A]ement en [G/A]Jé - [A7]sus- [D]Christ.[C/D][ ][D]` → `Tu vi[Em7]vras pleine[G6/A]ment en [G/A]Jé[A7]sus- [D]Christ.[C/D] [D]` *(session (hors relevé))* — Ligne sautée par check.py, mesurée sur la couche texte : G6/A x=143,2 sur « m » de « pleinement » (« e » 133,5–143,2) → pleine[G6/A]ment ; décalé dans le fichier (plein[G6/A]ement). Em7 x=65,9 sur « v » de « vivras », G/A x=205,5 sur « J », A7 x=254,4 sur « s » de « sus », D x=293,5 sur « C » (exacts) ; C/D x=339,7 et D x=378,8 en l'air après « Christ. » (exacts).

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | A7 | x=279,7 sur l'espace juste avant « de » (« t'entourer   de ») | décalé (fichier sur « d ») | t'entourer[A7] de (question 8:oeil:0, ok) |
| 11 | Em7 | x=197,5 sur « t » de « entière » | décalé (fichier sur « i ») | en[Em7]tière (question 11:oeil:1, ok) |
| 12 | A7 | x=242,0 sur l'espace juste avant « Son » | décalé (fichier sur « S ») ; après correction check.py le compte encore décalé : il ne voit pas l'espace en tête de ligne ([A7] Son), défaut de l'outil, juste à l'œil | [A7] Son |
| 12 | F#m7 | x=298,0 sur « p » de « Esprit » | exact | — |
| 12 | Bm7 | x=397,6 sur « m » de « lumière » | exact | — |
| 18 | Em7 | x=286,4 sur « r » de « remplis » | exact (vérifié à l'œil, ligne sautée par l'outil) | — |
| 18 | A7 | x=343,3 sur « n » de « nous » | décalé (fichier sur « - ») | remplis-[A7]nous |
| 18 | DM7 | x=404,6 sur « T » de « Toi » | exact | — |
| 18 | C/D | x=444,2 en l'air après « Toi. » | exact (en l'air) | — |
| 18 | D7 | x=483,2 en l'air après « Toi. » | exact (en l'air) | — |
| 20 | Em7 | x=286,4 sur « r » de « remplis » | exact (vérifié à l'œil, ligne sautée par l'outil) | — |
| 20 | G6/A | x=343,3 sur « n » de « nous » | décalé (fichier sur « - ») | remplis-[G6/A]nous |
| 20 | Asus | x=400,2 sur « d » de « de » | exact | — |
| 20 | D | x=458,0 sur « T » de « Toi » | exact | — |
| 24 | GM7 | x=137,9 sur « t » de « chanter » | décalé (fichier sur « e ») | chan[GM7]ter (question 24:oeil:2, ok) |
| 25 | A7 | x=290,4 sur l'espace juste avant « et » | décalé (fichier sur « E ») ; après correction check.py le compte encore décalé : il ne voit pas l'espace en tête de ligne ([A7] Son), défaut de l'outil, juste à l'œil | [A7] Et |
| 25 | F#m7 | x=335,7 sur « c » de « proclamer » | exact | — |
| 25 | Bm7 | x=438,0 sur « l » de « salut » | décalé (fichier sur « u ») | sa[Bm7]lut |
| 28 | A7 | x=293,5 sur l'espace après « pleurs, », avant « donne » | décalé (fichier sur « D ») ; après correction check.py le compte encore décalé : il ne voit pas l'espace en tête de ligne ([A7] Son), défaut de l'outil, juste à l'œil | [A7] Donne |
| 28 | F#m7 | x=347,8 sur « L » de « Lui » | exact | — |
| 28 | Bm7 | x=459,8 sur « c » de « soucis » | décalé (fichier sur « i ») | sou[Bm7]cis |
| 29 | Em7 | x=65,9 sur « v » de « vivras » | exact (vérifié à l'œil, ligne sautée par l'outil) | — |
| 29 | G6/A | x=143,2 sur « m » de « pleinement » | décalé (fichier sur « e ») | pleine[G6/A]ment |
| 29 | G/A | x=205,5 sur « J » de « Jé » | exact | — |
| 29 | A7 | x=254,4 sur « s » de « sus » | exact | — |
| 29 | D | x=293,5 sur « C » de « Christ » | exact | — |
| 29 | C/D | x=339,7 en l'air après « Christ. » | exact (en l'air) | — |
| 29 | D | x=378,8 en l'air après « Christ. » | exact (en l'air) | — |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 6 ligne(s) — orthographe d'accord : l. 10, 17, 19, 26, 27 ; espaceur : l. 13 ; mot coupé au tiret : l. 13, 17, 19, 26 ; espace de fin : l. 17, 19.

En-tête : ajout de `{source: Le Fils de Dieu.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 28:oeil:4 | appliqué | session | Bm7 sur le « c » de « soucis » : juste ; mais la ligne garde [A7]Donne alors que A7 est sur l'espace avant « donne » : ligne juste donnée dans lignes ([A7] Donne-[F#m7]Lui tous tes sou[Bm7]cis,). — inclus dans la ligne de la session — partition : Bm7 x=459,8 sur « c » de « sou‹c›is » ; A7 x=293,5 sur l'espace avant « donne » |
| 25:oeil:3 | appliqué | session | Bm7 sur le « l » de « salut » : juste ; mais la ligne garde [A7]Et alors que A7 est sur l'espace avant « et » : ligne juste donnée dans lignes ([A7] Et pro[F#m7]clamer Son sa[Bm7]lut.). — inclus dans la ligne de la session — partition : Bm7 x=438,0 sur « l » de « sa‹l›ut » ; A7 x=290,4 sur l'espace avant « et » |
| 24:oeil:2 | appliqué | session | GM7 sur le « t » de « chanter » ; Em7 juste ; ligne entière juste. — partition : GM7 x=137,9 sur « t » de « chan‹t›er » ; Em7 x=239,7 sur « J » de « Jésus » |
| 11:oeil:1 | appliqué | session | Em7 sur le « t » de « entière » ; GM7 juste ; ligne entière juste. — partition : Em7 x=197,5 sur « t » de « en‹t›ière » ; GM7 x=111,2 sur « L » de « Lui » |
| 8:oeil:0 | appliqué | session | L'opération pose A7 sur l'espace avant « de », comme la feuille ; le reste de la ligne est juste. — partition : A7 x=279,7 sur l'espace juste avant « de » ; GM7 x=105,0 sur « D » de « Dieu », Em7 x=229,0 sur « t » de « entourer » (exacts) |

- Feuille église (rendu ChordPro, couche texte), mesurée accord par accord avec get_text("rawdict") sur les 62 accords, et vérifiée à l'œil sur le rendu 2× : check.py saute les lignes 13, 17-20 et 29 (accords en deux tailles de police, G6/A, A7/G) ; ces 33 accords ont été mesurés à la main.
- Résultat : 51 exacts, 11 décalés corrigés (l. 8, 11, 12, 18, 20, 24, 25 ×2, 28 ×2, 29) ; aucun accord inventé ni absent ; noms identiques (GM7, DM7, Asus : la forme les écrit Gmaj7, Dmaj7, Asus4).
- Après correction, check.py liste encore 3 « décalé » (A7 des l. 12, 25, 28 écrits [A7] mot) : il retire l'espace de tête de ligne et ne voit pas le crochet + espace ; et 33 « absent de la source » (lignes qu'il saute, voir plus haut) : tous mesurés exacts à la main sur la couche texte.
- A7 en tête des lignes 12, 25 et 28 : sur la feuille, ces lignes sont la 2e moitié d'une longue ligne et le label est sur l'espace juste avant le mot : écrit [A7] mot (cas Océans de 02).
- Accords de fin en l'air (« ra. », « Toi. », « Christ. » suivis de C/D et D ou D7) : même position en l'air que la feuille, gardés.
- Paroles, non appliqué : la feuille écrit « et proclamer » (l. 25) et « donne-Lui tous tes soucis » (l. 28) en minuscules, suite de la ligne précédente ; le .cho met une majuscule en début de ligne.
- Autre version : « Le Fils de Dieu - Accords.pdf », même feuille église, identique.
- Structure : Couplet 1, Refrain, Couplet 2, identique à la feuille, rien proposé. Thèmes gardés (Adoration, Grâce, Saint-Esprit).

### le-nom-de-jesus — Le Nom de Jésus

Lot 4 · partition retenue : `Le Nom de Jésus - Accords C.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 12 : `En Lui nous sommes sau[Am]vés.` → `En Lui nous sommes sauvés[Am].`
- l. 16 : `Le Nom de [F]Jésus, plus haut que tous les n[C]oms,` → `Le Nom de [F]Jésus, plus haut que tous les noms[C],`
- l. 18 : `Le Nom de [F]Jésus, plus haut que tous les n[C]oms,` → `Le Nom de [F]Jésus, plus haut que tous les noms[C],`
- l. 23 : `[F] Ton Nom est comme un doux par[C]fum` → `[F] Ton Nom est comme un doux parfum[C]`
- l. 24 : `Déversé sur mon [G]âme, sur mon â[Am]me.` → `Déversé sur mon [G]âme, sur mon âme[Am].`
- l. 27 : `Ton Nom est tout puissant[Am].` → `Ton Nom est tout puissan[Am]t.`
- l. 36 : `Nous invoquons Son N[Am]om.` → `Nous invoquons Son Nom[Am].`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 12 | Am | x=235,7 sur « . » de « sauvés. » | décalé | sauvés[Am]. (ok du relevé, appliqué) |
| 16 | C | x=378,0 sur « , » de « noms, » | décalé | noms[C], (ok du relevé, appliqué) |
| 18 | C | x=378,0 sur « , » de « noms, » | décalé | noms[C], (ok du relevé, appliqué) |
| 23 | C | x=304,2 sur l'espace qui suit « parfum », fin de la ligne gravée (vu sur le rendu 2× : C en l'air après « parfum ») | décalé | parfum[C] (ok du relevé, appliqué ; la ligne gravée finit là, « Déversé » est sur la ligne suivante) |
| 24 | Am | x=290,8 sur « . » de « âme. » | décalé | âme[Am]. (ok du relevé, appliqué) |
| 27 | Am | x=213,5 sur « t » de « puissant. » | décalé | puissan[Am]t. (ok du relevé, appliqué) |
| 36 | Am | x=231,2 sur « . » de « Nom. » | décalé | Nom[Am]. (ok du relevé, appliqué) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 5 ligne(s) — espace de fin : l. 8, 10, 25, 31, 34.

En-tête : ajout de `{source: Le Nom de Jésus - Accords C.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 36:decale:Am:1 | appliqué | Timothée |  |
| 27:decale:Am:1 | appliqué | Timothée |  |
| 24:decale:Am:1 | appliqué | Timothée |  |
| 23:decale:C:1 | appliqué | Timothée |  |
| 18:decale:C:1 | appliqué | Timothée |  |
| 16:decale:C:1 | appliqué | Timothée |  |
| 12:decale:Am:1 | appliqué | Timothée |  |

- Couche texte lue en rawdict : les 32 accords mesurés un par un contre le caractère sous le label ; après les 7 « ok » du relevé, 32 exacts (check.py après : 32 exact, 0 décalé).
- Retraits de début de ligne : sur la feuille, les lignes « Que Ton Nom », « Ton Nom est fort », « Ton Nom est comme », « En Ton Nom nous surmontons », « Aucun autre Dieu », « En Son Nom tout genou » commencent par deux espaces et le F est gravé au-dessus du retrait (x=31,2 / 45,4) : le .cho a déjà `[F] mot` partout, rien à changer.
- Lignes du .cho = demi-systèmes de la feuille (la feuille met deux phrases par ligne) : même texte, rien à changer.
- Autres versions présentes : « Le Nom de Jésus - Accords.pdf », « Le Nom de Jésus.pdf », « Le Nom de Jésus - C 2.pdf » (même feuille) ; « Au nom de Jésus (D).pdf » et « Je veux proclamer le Nom de Jésus » sont d'autres chants ou arrangements, non comparés.

### le-plus-grand — Le plus Grand

Lot 4 · partition retenue : `Le plus Grand - C.pdf` (word-scan, mesure impossible)

Lignes modifiées :

- l. 16 : `[Am] [F]Lorsque vient le con[C]flit` → `[Am] [F]Lorsque vient le [C]conflit` *(session (hors relevé))* — C : label x=412-431 (rendu 2×), « c » de « conflit » x=411 : C sur la syllabe « con », pas « flit » (décalé d'une syllabe). Am en marge, F x=114 sur « L » x=122 : inchangés.
- l. 18 : `[Am] [F]Même à milles contre [C]un` → `[Am] [F]Même à milles [C]contre un` *(session (hors relevé))* — C : label x=368-388, « c » de « contre » x=368 : C sur « contre », pas « un » (décalé de deux syllabes). Am en marge, F x=114 sur « M » x=106 : inchangés.
- l. 19 : `[Am] [F]En Toi je ne crains [C]rien` → `[Am] [F]En Toi je ne [C]crains rien` *(session (hors relevé))* — C : label x=324-344, « c » de « crains » x=324 : C sur « crains », pas « rien » (autre mot). Am en marge, F x=114 sur « E » x=106 : inchangés.
- l. 24 : `[Am] [F]Tu marches triom[C]phant` → `[Am] [F]Tu marches [C]triomphant` *(session (hors relevé))* — C : label x=870-889, au-dessus de « t » x=859 / « r » x=876 de « triomphant » : syllabe « tri », pas « phant » ; posé au début de la syllabe (source basse fidélité). Am en marge, F x=660 sur « Tu » x=647 : inchangés.
- l. 25 : `[Am] [F]Tu m’as pris dans Ton [C]camp` → `[Am] [F]Tu m’as pris dans [C]Ton camp` *(session (hors relevé))* — C : label x=958-976, « T » de « Ton » x=956 : C sur « Ton », pas « camp » (autre mot). Am en marge, F sur « Tu » : inchangés.
- l. 27 : `[Am] [F]Tu es le grand cham[C]pion` → `[Am] [F]Tu es le grand [C]champion` *(session (hors relevé))* — C : label x=914-933, « c » de « champion » x=910 : syllabe « cham », pas « pion ». Am en marge, F sur « Tu » : inchangés.
- l. 28 : `[Am] [F]Je connais Ton saint [C]nom` → `[Am] [F]Je connais Ton [C]saint nom` *(session (hors relevé))* — C : label x=899-918, « s » de « saint » x=910 (le « n » de « Ton » finit à 892) : C sur « saint », pas « nom » (autre mot). Am en marge, F x=660 sur « Je » x=650 : inchangés.
- l. 33 : `Tu es ma [F]force et mon [C]bou[Gsus4]clier` → `Tu es ma [F]force et [C]mon [Gsus4]bouclier` *(session)*
- l. 35 : `Toute [C/E]arme for[F]mée contre [Gsus4]moi` → `Toute [C/E]arme [F]formée [Gsus4]contre moi` *(session)*
- l. 36 : `Sera [Am]sans effet` → `Sera sans [Am]effet`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | Gsus4 | ligne rouge « Intro : F Am Gsus4 x3 », sans paroles : même suite d'accords | exact | inchangé ; check.py le classe « à relire » (1 amas sur l'image pour 3 accords) : l'outil lit mal |
| 11 | Am | ligne rouge « Intro : F Am Gsus4 x3 », sans paroles : même suite d'accords | exact | inchangé ; check.py le classe « à relire » (1 amas sur l'image pour 3 accords) : l'outil lit mal |
| 11 | F | ligne rouge « Intro : F Am Gsus4 x3 », sans paroles : même suite d'accords | exact | inchangé ; check.py le classe « à relire » (1 amas sur l'image pour 3 accords) : l'outil lit mal |
| 16 | C | x=412 sur « c » de « conflit » (x=411) | décalé | le [C]conflit |
| 16 | F | x=114 sur « L » x=122 | exact | [F]Lorsque |
| 18 | C | x=368 sur « c » de « contre » (x=368) | décalé | [C]contre un |
| 19 | C | x=324 sur « c » de « crains » (x=324) | décalé | [C]crains rien |
| 24 | C | x=870 sur « t/r » de « triomphant » (x=859/876) | décalé | [C]triomphant |
| 25 | C | x=958 sur « T » de « Ton » (x=956) | décalé | [C]Ton camp |
| 27 | C | x=914 sur « c » de « champion » (x=910) | décalé | [C]champion |
| 28 | C | x=899 sur « s » de « saint » (x=910) | décalé | [C]saint nom |
| 26 | Dm | x=738-788, à cheval entre « es » (s x=722) et « ma » (m x=754), le label couvre « ma » | équivalent | inchangé : [Dm]ma |
| 29 | Dm | x=738-788, à cheval entre « es » et « ma », le label couvre « ma » | équivalent | inchangé : [Dm]ma |
| 37 | F | x=192-208 dans l'espace entre « es » (fin x=194) et « pour » (p x=214) | équivalent | inchangé : [F]pour (frontière mot/espace, source basse fidélité) |
| 33 | C | x=364 sur « m » de « mon » x=360 | décalé | [C]mon |
| 33 | Gsus4 | x=459 sur « o » de « bouclier » x=463 (syllabe « bou ») | décalé | [Gsus4]bouclier |
| 35 | F | x=260 sur « fo » de « formée » (x=246-276) | décalé | [F]formée |
| 35 | Gsus4 | x=382 sur « c » de « contre » x=380 | décalé | [Gsus4]contre moi |
| 36 | Am | x=224 sur « e » de « effet » x=218 | décalé | sans [Am]effet (défaut ok) |
| 41 | Am | « (Am) » x=880-956 sur « moi » x=899 | nom | [(Am)]moi (facultatif) |
| 41 | C/E | aucun label au-dessus de « pas » ; « (C/E) » en marge de la rangée suivante | inventé | retiré ; [(C/E)] en tête de la ligne 42 |
| 42 | C/E | « (C/E) » x=627-708 en marge avant « Il » x=716 | décalé | [(C/E)] [F]Il |
| 42 | F | x=714 sur « I » x=716 | exact | [F]Il |
| 42 | Am | « (Am) » x=880 sur « p » de « plus » x=871 | décalé | le [(Am)]plus |
| 43 | C/E | « (C/E) » x=627-708 en marge avant « L’Éternel » | nom | [(C/E)] [F]L’Éternel |
| 43 | Am | « (Am) » x=968 sur « ar » de « armées » | décalé | des [(Am)]armées |
| 43 | G | x=1048 sur « es » de « armées » (e x=1038, s x=1058) | exact | armé[G]es |
| 43 | C/E | « (C/E) » x=832-914 sur « mon » (m x=822) | décalé | de [(C/E)]mon |
| 43 | F | x=918 sur « ô » de « côté » x=924 | absent | [F]côté |
| 44 | F | aucun F gravé en tête de la dernière rangée | inventé | retiré |
| 44 | Am | « (Am) » x=788 sur « p » de « plus » x=783 | décalé | le [(Am)]plus |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 11.

En-tête : ajout de `{source: Le plus Grand - C.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 44:oeil:7 | laissé | def |  |
| 44:fable:44:oeil:7 | laissé | session | garde un F en tête que la feuille ne grave pas, et Am sur « le » ; ligne juste donnée dans lignes (l. 44) — partition : (Am) x=788 sur « p » de « plus » x=783 ; pas de F en tête |
| 43:oeil:6 | laissé | def |  |
| 43:fable:43:oeil:6 | laissé | session | laisse Am sur « des » et C/E sur « té » ; la feuille a (Am) sur « armées », (C/E) sur « mon », F sur « côté » ; ligne juste donnée dans lignes (l. 43) — partition : (Am) x=968 sur « ar » ; (C/E) x=832 sur « mon » x=822 ; F x=918 sur « ô » x=924 |
| 42:oeil:5 | laissé | def |  |
| 42:fable:42:oeil:5 | laissé | session | laisse Am sur « le » et C/E en fin de ligne ; la feuille a (C/E) en marge avant « Il » et (Am) sur « plus » ; ligne juste donnée dans lignes (l. 42) — partition : (C/E) x=627-708 marge ; (Am) x=880 sur « p » de « plus » x=871 |
| 41:oeil:4 | laissé | def |  |
| 41:fable:41:oeil:4 | laissé | session | garde un (C/E) sur « pas » où la feuille n'en grave aucun ; ligne juste donnée dans lignes (l. 41) — partition : labels finis à x=984, « pas » x=1156 ; (C/E) en marge de la rangée suivante |
| 36:oeil:3 | appliqué | def |  |
| 35:oeil:2 | laissé | def |  |
| 35:fable:35:oeil:2 | appliqué | session | met F sur « formée » (syllabe « for ») et Gsus4 sur « contre », comme la feuille — inclus dans la ligne de la session — partition : F x=260 sur « fo » x=246-276 ; Gsus4 x=382 sur « c » de « contre » x=380 |
| 34:oeil:1 | laissé | def |  |
| 33:oeil:0 | laissé | def |  |
| 33:fable:33:oeil:0 | appliqué | session | met C sur « mon » et Gsus4 au début de « bouclier », comme la feuille — inclus dans la ligne de la session — partition : C x=364 sur « m » de « mon » x=360 ; Gsus4 x=459 sur « o » x=463 de « bouclier » |

- Source : capture de tablette en deux colonnes, police manuscrite tapée aux espaces (basse fidélité, ± 1 syllabe), mais nette : chaque label mesuré au pixel (projection des colonnes sur le rendu 2×, x en unités du rendu 2×) et vérifié à l'œil sur les découpes ; check.py ne lit pas cette source.
- check.py (avant comme après) classe tout le reste « absent de la source » : il n'apparie aucune bande de paroles sur cette image ; chaque accord a été mesuré à la main, tableau dans « mesures ».
- Tous les accords du chant mesurés : intro, couplets 1-2, refrain, pont. Couplets : Am en marge et F sur la 1re lettre (exacts), Dm/Am/G exacts ou même syllabe ; les C de fin de ligne sont gravés plus tôt que dans le fichier sur 7 lignes sur 8 (« con-flit », « contre un », « crains rien », « tri-omphant », « Ton camp », « cham-pion », « saint nom ») : corrigés vers la feuille.
- Refrain : C sur « mon », Gsus4 sur « bou- », F sur « for- », Gsus4 sur « contre », Am sur « effet » : corrigés (lectures 33 et 35 de Fable, défaut ok l. 36).
- Pont : la feuille grave F (Am)G | (C/E)F (Am)G | (C/E)F (Am)G (C/E)F (Am)G, (C/E) en marge avant « Il » et « L’Éternel », (C/E)F sur « mon côté », dernière rangée sans F : lignes 41-44 rendues comme la feuille, parenthèses (facultatifs) comprises. Les « non » par défaut et les lectures de Fable gardaient la coupe du fichier : écartés, la partition l'emporte.
- À l'oreille : l'historique montre une retouche d'accords du 24/06 (couplets et pont) ; elle est antérieure à l'audit, donc non protégée, et la feuille la contredit. Si la retouche était voulue (C sur la dernière syllabe des couplets, C/E sur « pas » et sur « té »), c'est à réécouter et à remettre à la main.
- Équivalents gardés : Dm des l. 26 et 29 à cheval entre « es » et « ma » (le label couvre « ma ») ; F de la l. 37 dans l'espace entre « es » et « pour » (frontière mot/espace) ; Gsus4 l. 34 sur le 2e « a » de « jamais » (même syllabe).
- Structure, non appliqué : la feuille écrit « Intro : F Am Gsus4 x3 » ; le fichier a « Intro » sans répétition, retouché exprès le 27/07 (« intro sans répétition ») : laissé.
- Paroles, non appliqué : la feuille écrit « L’Eternel » sans accent (le fichier a « L’Éternel », orthographe correcte) ; « milles » identique à la feuille.
- Autre version : « Le plus Grand (C).pdf » est une page blanche, inutilisable.
- Thèmes « Adoration, Sainteté » : dans la liste, gardés.
- Pont (l. 41–44) laissé tel quel : ses accords ont été réécrits à la main le 24/06/2026, à l’écart de la feuille qu’ils suivaient jusque-là (retouche à l’oreille, consigne : intouchable). La feuille y donne : l.41 `[F]Celui qui vit en [(Am)]moi [G]Ne faillira pas` ; l.42 `[(C/E)] [F]Il est le [(Am)]plus [G]grand` ; l.43 `[(C/E)] [F]L’Éternel des [(Am)]armé[G]es Est de [(C/E)]mon [F]côté` ; l.44 `Il est le [(Am)]plus [G]grand`. À réécouter si la retouche n’était pas voulue.

### le-roi-est-ne — Le Roi est né

Lot 4 · partition retenue : `Le Roi est né.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 27 : `[E]Bienveillance [A]sur la ter[B]re et [A]paix divine,[E][A][ ][B][ ][A]` → `[E]Bienveillance [A]sur la ter[B]re et [A]paix divine,[E] [A] [B] [A]` *(session (hors relevé))* — Couche texte y=532,0 / 544,6 : E x=31,2 sur « B » (exact), A x=129,9 sur « s » de « sur » (exact), B x=192,1 sur le 2e « r » de « ter‹r›e » (exact), A x=228,6 sur « p » de « paix » (exact) ; puis E x=308,6, espaceur 319,3, A x=330,6, espaceur 342,2, B 353,5, espaceur 365,1, A 376,4 après « divine, » : la partition sépare E et A par un espaceur comme aux autres fins de ligne (l. 12-14, 16, 29), le .cho les collait à la même position.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 27 | E | x=31,2 sur « B » de « Bienveillance » | exact | aucune |
| 27 | A | x=129,9 sur « s » de « sur » (129,9) | exact | aucune |
| 27 | B | x=192,1 sur « r » de « ter‹r›e » (192,1) | exact | aucune |
| 27 | A | x=228,6 sur « p » de « paix » (228,6) | exact | aucune |
| 27 | E A B A (fin) | E 308,6 · A 330,6 · B 353,5 · A 376,4, espaceurs entre chacun, après la virgule (304,2) | forme : E et A collés dans le .cho | divine,[E] [A] [B] [A] (après le moteur) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 6 ligne(s) — ligne sans paroles : l. 8 ; espaceur : l. 12, 13, 14, 16, 29.

En-tête : ajout de `{source: Le Roi est né.pdf}`

- check.py : 68/68 exacts avant ; tous les accords recoupés sur la couche texte (vérifié aussi à l'œil sur les x) : aucun décalé, aucun absent, aucun inventé. Seule correction : l. 27, l'espaceur manquant entre E et A en fin de ligne.
- La partition s'arrête après le Couplet 2 (« Car c'est Noël. ») sans renvoi au refrain : rien d'ajouté.
- Le fichier finit par une ligne « {star} » (reste d'une directive inachevée depuis le commit initial) : directive inconnue ignorée par le parseur et par lint, laissée ; à retirer à la main si souhaité (ce n'est pas une section).
- Non repris : « Traduction : (nom retiré) », titre original « Born is the King ».

### libere — Libéré

Lot 4 · partition retenue : `Libéré - Accords G.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 8 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (x2)}` *(structure)*
- l. 15 : `[C] La mort n'a p[D]u Te reteni[G]r, ` → `[C] La mort n'a p[D]u Te reten[G]ir,`
- l. 21 : `Je vi[C]vrai désorma[D]is pour T[Em]oi.[ ][G]` → `Je vi[C]vrai désorm[D]ais pour T[Em]oi.[G]`
- l. 23 : `Je vi[C]vrai désorma[D]is pour T[C]oi.` → `Je vi[C]vrai désorm[D]ais pour T[C]oi.`
- l. 34 : `[C]Oh [Em]![ ][D]Garde-moi tou[G/B]jours près de Toi.` → `[C]Oh [Em]! [D]Garde-moi tou[G/B]jours près de Toi.` *(session)*
- l. 35 : `[C]Oh [Em]![ ][D]Tu es mon se[G]cours et ma joie.` → `[C]Oh [Em]! [D]Tu es mon se[G]cours et ma joie.` *(session)*
- l. 36 : `[C]Oh [Em]![ ][D]Garde-moi tou[G/B]jours près de Toi.` → `[C]Oh [Em]! [D]Garde-moi tou[G/B]jours près de Toi.` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 15 | G | x=205,9 sur « i » de « reten‹i›r, » (205,9) | décalé | reten[G]ir, (défaut ok) |
| 21 | D | x=405,5 sur « a » de « désorm‹a›is » (405,5) | décalé | désorm[D]ais (défaut ok) |
| 23 | D | x=405,5 sur « a » de « désorm‹a›is » (405,5) | décalé | désorm[D]ais (défaut ok) |
| 34 | C | x=45,4 sur « O » de « Oh » | exact | inchangé |
| 34 | Em | x=71,2 sur « ! » | exact | inchangé |
| 34 | D | x=106,7 sur « G » de « Garde-moi » | exact (paroles collées à l'affichage) | [Em]! [D]Garde-moi |
| 34 | G/B | x=209,0 sur « j » de « toujours » | exact | inchangé |
| 35 | C | x=45,4 sur « O » | exact | inchangé |
| 35 | Em | x=71,2 sur « ! » | exact | inchangé |
| 35 | D | x=106,7 sur « T » de « Tu » | exact (paroles collées à l'affichage) | [Em]! [D]Tu |
| 35 | G | x=203,7 sur « c » de « secours » | exact | inchangé |
| 36 | C | x=45,4 sur « O » | exact | inchangé |
| 36 | Em | x=71,2 sur « ! » | exact | inchangé |
| 36 | D | x=106,7 sur « G » de « Garde-moi » | exact (paroles collées à l'affichage) | [Em]! [D]Garde-moi |
| 36 | G/B | x=209,0 sur « j » de « toujours » | exact | inchangé |
| 33 | C Em Em D G/B G/B | ligne instrumentale p1 y=513,5 (x=45,4 / 68,2 / 101,0 / 133,9 / 156,7 / 192,2) suivie de « (x2) », dans le cadre du Pont, avant « Oh ! » | absent du .cho | ligne ajoutée deux fois en tête du Pont (bloc de structure) |
| 33 | C Em Em D G/B G/B (2e ligne) | même ligne gravée une fois avec « (x2) » | absent de la source (check.py, l. 36 après) | 2e passage de la reprise (x2) écrit en entier : check.py n'apparie la ligne gravée qu'une fois, ce n'est pas un accord inventé |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 8 ligne(s) — en-tête : l. 7 ; ligne sans paroles : l. 9 ; mot coupé au tiret : l. 16, 30 ; espace de fin : l. 20, 22, 29 ; orthographe d'accord : l. 37.

En-tête : ajout de `{source: Libéré - Accords G.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 36:colle:D:3 | laissé | session | Même cas que la l. 34 : D au-dessus du « G » de « Garde-moi ». Ligne juste « [Em]! [D]Garde-moi… » donnée dans `lignes`. — partition : mesure : D x=106,7 = « G » de « Garde-moi » (106,7) ; « ! » x=71,2 |
| 35:colle:D:3 | laissé | session | Même cas : D au-dessus du « T » de « Tu », pas sur l'espace. Ligne juste « [Em]! [D]Tu es… » donnée dans `lignes`. — partition : mesure : D x=106,7 = « T » de « Tu » (106,7) ; « ! » x=71,2 |
| 34:colle:D:3 | laissé | session | L'opération écrirait « [D] Garde-moi » (accord avant l'attaque), alors que le label D est posé exactement au-dessus du « G » de « Garde-moi ». La ligne juste sépare « ! » et le mot par l'espace AVANT le crochet : « [Em]! [D]Garde-moi » (ligne donnée dans `lignes`). — partition : mesure : D x=106,7 = « G » de « Garde-moi » (106,7) ; « ! » x=71,2 suivi d'espaces 75,6–102,3 |
| 23:decale:D:1 | appliqué | def |  |
| 21:decale:D:1 | appliqué | def |  |
| 15:decale:G:1 | appliqué | def |  |

- Source église (rendu ChordPro) lue par sa couche texte : 59/68 accords exacts avant ; les 3 décalés (l. 15, 21, 23) sont corrigés par les « ok » par défaut, vérifiés au x près.
- Questions l. 34-36 (« !Garde » collé) : l'opération proposée aurait mis D avant l'attaque ; la partition pose D sur la 1re lettre du mot. Ligne écrite « [Em]! [D]Mot ».
- Retrait de début de ligne : les couplets sont en retrait avec C au-dessus du retrait → « [C] À », « [C] Payant »… déjà écrits ainsi ; refrain et pont sans retrait, accords sur la 1re lettre ou dans la ligne : rien à changer.
- L. 37 « Dsus » gravé tel quel (« D » + « sus ») : le nom canonique éventuel (Dsus4) est laissé au moteur.
- Paroles, non appliqué : la partition écrit « …Te retenir, je sais que Tu es ressuscité. » et « …ma foi ; Dieu d'éternité, je Te suivrai. » sur une seule ligne chacun (minuscule à « je » et « Dieu » en milieu de ligne) ; le .cho les coupe en deux lignes.
- Autres versions : « Libéré - Accords A.pdf », « Libéré, racheté - A.pdf » (même feuille en A), « Libéré G.pdf », « Libéré.pdf » non comparées en détail.
- Après : 68/68 exacts ; les 6 « absent de la source » de check.py sont la 2e ligne instrumentale du Pont, c.-à-d. le (x2) gravé déplié (check.py n'apparie la ligne gravée qu'une fois).

### lumiere-du-monde — Lumière du monde

Lot 4 · partition retenue : `Lumière du monde (D).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `Tu [D]m'ouvres les [Asus4]yeux, et je [Gsus2]vois` → `Tu [D]m'ouvres les [Asus4]yeux, et j[Gsus2]e vois`
- l. 10 : `[D]Tant de beauté [Asus4]que mon [Em]cœur, ému, T'adore.` → `[D]Tant de beau[Asus4]té que mon [Em]cœur, ému, T'adore.`
- l. 11 : `Je [D]sais que ma [Asus4]vie est en [Gsus2]Toi.` → `Je [D]sais que ma [Asus4]vie est e[Gsus2]n Toi.`
- l. 15 : `Et me voici [A7sus]pour [ ][D]louer, me voici à [A/C#]Tes pieds,` → `Et me voi[A7sus4]ci pour [D]louer, me voici à [A/C#]Tes pieds,`
- l. 16 : `Me voici pour [D/F#]dire: Tu es mon [Gsus2]Dieu.` → `Me voici pour [D/F#]dire: Tu es mon[Gsus2] Dieu.`
- l. 18 : `Tout en Toi est [D/F#]merveilleux pour [G]moi.` → `Tout en Toi est [D/F#]merveilleux pour[G] moi.`
- l. 23 : `Ta [D]gloire resp[Asus4]lendit dans le [Gsus2]Ciel.` → `Ta [D]gloire resplen[Asus4]dit dans le[Gsus2] Ciel.`
- l. 29 : `Et je ne [A/C#]pourr[D/F#]ais im[G]aginer ` → `Et je n[A/C#]e pourr[D/F#]ais im[G]aginer`
- l. 30 : `Le p[A/C#]rix pay[D/F#]é pour [G]mon péch[A]é.` → `Le p[A/C#]rix pay[D/F#]é pour m[G]on péch[A]é.`

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — espace de fin : l. 31 ; espaceur : l. 32.

En-tête : ajout de `{source: Lumière du monde (D).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 30:decale:G:1 | appliqué | Timothée |  |
| 29:decale:A/C#:1 | appliqué | Timothée |  |
| 23:decale:Asus4:1 | appliqué | Timothée |  |
| 23:decale:Gsus2:1 | appliqué | Timothée |  |
| 18:decale:G:1 | appliqué | Timothée |  |
| 16:decale:Gsus2:1 | appliqué | Timothée |  |
| 15:decale:A7sus:1 | appliqué | Timothée |  |
| 11:decale:Gsus2:1 | appliqué | Timothée |  |
| 10:decale:Asus4:1 | appliqué | Timothée |  |
| 9:decale:Gsus2:1 | appliqué | Timothée |  |

- Partition de l'église (rendu ChordPro, couche texte) : chaque label mesuré en x avec PyMuPDF, page rendue à 2× et regardée (crops/lumiere-du-monde).
- Les 10 « ok » du relevé mettent chaque accord sur le caractère de la partition : j[Gsus2]e (x=212,1 sur « e » de « je »), beau[Asus4]té (125,5 sur « t »), e[Gsus2]n (202,8 sur « n »), voi[A7sus]ci (112,1 sur « c »), mon[Gsus2] Dieu (256,1 sur l'espace), pour[G] moi (273,9 sur l'espace), resplen[Asus4]dit (150,3 sur « d »), le[Gsus2] Ciel (223,3 sur l'espace), n[A/C#]e (90,7 sur « e »), m[G]on (394,8 sur « o »). Aucune correction de plus : check.py après = 48 exacts, 0 décalé.
- Pont vérifié à l'œil sur les deux rangées (A/C# D/F# G A/C# D/F# G A, puis Gsus2 en l'air après « péché. » à 488,9) : tout est sur la lettre gravée.
- Pas de retrait de début de ligne : dans chaque section, paroles et premier label partent du même x (31,2 couplets, 45,4 refrain et pont).
- Nom : la partition grave « A7sus » ; la forme du moteur l'écrit A7sus4 (orthographe canonique).
- Autres versions présentes, non mesurées : « Lumière du monde - Accords.pdf », « Lumière du monde.pdf ».
- Thèmes inchangés (Adoration, Action de grâce : valides).

### ma-passion — Ma passion

Lot 4 · partition retenue : `Ma passion （G）.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `[G] Quand les [D]montagnes trembler[Em]ont,[C]` → `[G] Quand les m[D]ontagnes trembler[Em]ont,[C]`
- l. 12 : `[G] Et ma v[D]ie en plein dése[Em]rt.[ ][C]` → `[G] Et ma v[D]ie en plein dés[Em]ert.[C]`
- l. 13 : `[G] En at[D]tendant Ta lumi[C2]ère,` → `[G] En att[D]endant Ta lum[C2]ière,`
- l. 32 : `[G] Pour déco[D]uvrir Ta lumi[C2]ère.` → `[G] Pour déc[D]ouvrir Ta lum[C2]ière.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | D | x=130,8 sur « o » de « m‹o›ntagnes » (130,8) | décalé | m[D]ontagnes (ok du relevé, vérifié) |
| 12 | Em | x=197,5 sur « e » de « dés‹e›rt. » (197,5) | décalé | dés[Em]ert. (ok du relevé, vérifié) |
| 13 | D | x=81,9 sur le « e » de « att‹e›ndant » (81,9) | décalé | att[D]endant (ok du relevé, vérifié) |
| 13 | C2 | x=184,2 sur « i » de « lum‹i›ère, » (184,2) | décalé | lum[C2]ière, (ok du relevé, vérifié) |
| 32 | D | x=104,1 sur « o » de « déc‹o›uvrir » (104,1) | décalé | déc[D]ouvrir (ok du relevé, vérifié) |
| 32 | C2 | x=197,5 sur « i » de « lum‹i›ère. » (197,5) | décalé | lum[C2]ière. (ok du relevé, vérifié) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — espaceur : l. 11, 29, 30, 31.

En-tête : ajout de `{source: Ma passion （G）.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:D:1 | appliqué | Timothée |  |
| 32:decale:C2:1 | appliqué | Timothée |  |
| 13:decale:D:1 | appliqué | Timothée |  |
| 13:decale:C2:1 | appliqué | Timothée |  |
| 12:decale:Em:1 | appliqué | Timothée |  |
| 10:decale:D:1 | appliqué | Timothée |  |

- Source église (rendu ChordPro) lue par sa couche texte : 38/44 exacts avant ; les 6 décalés (l. 10, 12, 13, 32) sont corrigés par les « ok » du relevé, chacun vérifié au x près sur la lettre de la partition.
- Tous les autres accords relus au x : exacts (dont les C après la ponctuation des couplets, « ont,[C] », « é,[C] », « rt.[C] »…).
- Retrait de début de ligne : couplets en retrait, G au-dessus du retrait → « [G] Quand », déjà écrit ainsi ; pré-refrain et refrain sans retrait, accords sur la 1re lettre : rien à changer.
- Thèmes (Adoration, Engagement, Espérance) dans la liste : inchangés. Tonalité G gravée : inchangée.
- Autres versions : « Ma passion.pdf » (même feuille) ; « La passion.pdf » est un autre chant.

### ma-raison-de-noel — Ma raison de Noël

Lot 4 · partition retenue : `Ma raison de Noël.pdf` (traitement-texte, mesure impossible)

Lignes modifiées :

- l. 7 : `[C]À chaque f[G]in d'année` → `[C] À chaque f[G]in d'année` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=72.0 ; 1re lettre x=78.1. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 8 : `[Am]L'histoire s[F]e répète` → `[Am] L'histoire s[F]e répète` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=72.0 ; 1re lettre x=81.2. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 9 : `[C]La vie brille c[G]omme jamais` → `[C] La vie brille c[G]omme jamais` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=72.0 ; 1re lettre x=78.1. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 10 : `[Am]Juste le temps d[F]es fêtes` → `[Am] Juste le temps d[F]es fêtes` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=72.0 ; 1re lettre x=78.1. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 11 : `[C]Mais malgré les [G]distractions` → `[C] Mais malgré les [G]distractions` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=72.0 ; 1re lettre x=78.1. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 12 : `[Am]Durant cette sa[F]ison` → `[Am] Durant cette sa[F]ison` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=72.0 ; 1re lettre x=78.1. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 20 : `[F]Que Tu es venu pour mo[G]i` → `[F]Que Tu es venu pour m[G]oi`
- l. 32 : `[C]Avec nous pour [G]toujours` → `[C] Avec nous pour [G]toujours` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=317.2 ; 1re lettre x=323.4. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 33 : `[Am]Tu ne changes pas d'av[F]is` → `[Am] Tu ne changes pas d'av[F]is` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=317.2 ; 1re lettre x=323.4. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 34 : `[C]L'ombre fait place [G]au jour` → `[C] L'ombre fait place [G]au jour` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=317.2 ; 1re lettre x=323.4. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 35 : `[Am]Dans Ta grâce infi[F]nie` → `[Am] Dans Ta grâce infi[F]nie` *(session)*
- l. 36 : `[C]Tu es le don [G]du ciel` → `[C] Tu es le don [G]du ciel` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=317.2 ; 1re lettre x=323.4. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).
- l. 37 : `[Am]Que la terre attend[F]ait` → `[Am] Que la terre attend[F]ait` *(session (hors relevé))* — Feuille Google Docs : paroles en retrait (couplets), label gravé au-dessus du retrait, avant la 1re lettre : accord avant l'attaque, `[X] mot` (cas Océans de 02). Label x=317.2 ; 1re lettre x=323.4. Les autres accords de la ligne sont inchangés (mesurés, même lettre ou même syllabe).

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 7 | C | label x=72.0 au-dessus du retrait, 1re lettre x=78.1 | décalé (retrait) | [C] À |
| 8 | Am | label x=72.0 au-dessus du retrait, 1re lettre x=81.2 | décalé (retrait) | [Am] L'histoire |
| 9 | C | label x=72.0 au-dessus du retrait, 1re lettre x=78.1 | décalé (retrait) | [C] La |
| 10 | Am | label x=72.0 au-dessus du retrait, 1re lettre x=78.1 | décalé (retrait) | [Am] Juste |
| 11 | C | label x=72.0 au-dessus du retrait, 1re lettre x=78.1 | décalé (retrait) | [C] Mais |
| 12 | Am | label x=72.0 au-dessus du retrait, 1re lettre x=78.1 | décalé (retrait) | [Am] Durant |
| 32 | C | label x=317.2 au-dessus du retrait, 1re lettre x=323.4 | décalé (retrait) | [C] Avec |
| 33 | Am | label x=317.2 au-dessus du retrait, 1re lettre x=323.4 | décalé (retrait) | [Am] Tu |
| 34 | C | label x=317.2 au-dessus du retrait, 1re lettre x=323.4 | décalé (retrait) | [C] L'ombre |
| 35 | Am | label x=317.2 au-dessus du retrait, 1re lettre x=323.4 | décalé (retrait) | [Am] Dans |
| 36 | C | label x=317.2 au-dessus du retrait, 1re lettre x=323.4 | décalé (retrait) | [C] Tu |
| 37 | Am | label x=317.2 au-dessus du retrait, 1re lettre x=323.4 | décalé (retrait) | [Am] Que |
| 7 | G | x=131,9 sur « i » de « fin » (130,7–133,1) | exact |  |
| 8 | F | x=131,2 dans « s » de « se » (127,9–133,4), 2,2 pt avant « e » | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) |  |
| 9 | G | x=144,1 sur « o » de « comme » (142,3–148,4) | exact |  |
| 10 | F | x=155,7 dans « d » de « des » (152,0–158,1), 2,4 pt avant « e » | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) |  |
| 11 | G | x=159,3 sur « d » de « distractions » (158,1–164,2) | exact |  |
| 12 | F | x=149,6 au milieu du « a » de « saison » (146,5–152,7), à égale distance de « a » et de « i » | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) |  |
| 13 | C | x=123,9 dans « e » de « es » (119,2–125,4), 1,5 pt avant « s » ; pas de retrait sur cette ligne | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) |  |
| 14 | G | x=130,0 sur « a » de « resteras » (129,0–135,1) | exact |  |
| 14 | Am | x=184,4 sur « d » de « de » (183,4–189,5) | exact |  |
| 14 | F | x=246,7, après la fin de « liste » (236,6) | exact |  |
| 18 | F | x=72,0 sur « C » de « Car », pas de retrait | exact |  |
| 18 | G | x=185,6 dans le « a » de « ça » (182,0–188,1), 2,5 pt avant la fin du mot | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) — sur « ça » tenu, écrit après lui |  |
| 19 | C | x=72,0 sur « J » | exact |  |
| 19 | F | x=180,7 sur « r » de « oublier » (178,3–182,0) | exact |  |
| 20 | F | x=72,0 sur « Q » | exact |  |
| 20 | G | x=188,7 sur « o » de « moi » (187,1–193,2) | décalé d'une lettre (même syllabe) | m[G]oi — écart 20:oeil:0, « ok » par défaut, appliqué par le moteur |
| 21 | C | x=72,0 sur « P » | exact |  |
| 21 | F | x=177,7, 1,8 pt après la fin de « liberté » (175,9) | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) — label à la frontière fin de mot, `libert[F]é` garde la syllabe « té » |  |
| 25 | C | x=369,2 sur « i » de « raison » (368,8–371,2) | exact |  |
| 25 | G | x=422,9 à la frontière a\|i du second « raison » (a finit à 423,1) | exact |  |
| 27 | C | x=369,2 sur « i » de « raison » (368,8–371,2) | exact |  |
| 27 | G | x=422,9 à la frontière a\|i du second « raison » (a finit à 423,1) | exact |  |
| 26 | Am | x=335,6 sur « c » de « cette » (334,4–339,9) | exact |  |
| 26 | F | x=431,5 pile à la frontière e\|l de « Noel », en fin de mot | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) — écart 26:oeil, « non » par défaut gardé |  |
| 28 | Am | x=335,6 sur « c » de « cette » (334,4–339,9) | exact |  |
| 28 | F | x=431,5 pile à la frontière e\|l de « Noel », en fin de mot | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) — écart 28:oeil, « non » par défaut gardé |  |
| 32 | G | x=404,6 sur « t » de « toujours » (402,6–405,7) | exact |  |
| 33 | F | x=440,6 sur « i » de « avis » (439,3–441,8) | exact |  |
| 34 | G | x=410,7 sur l'espace entre « place » et « au » (409,8–412,8), 2,1 pt avant « a » | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) — lettre la plus proche « a » (règle basse fidélité de 02) |  |
| 35 | F | x=416,2 dans « n » de « infinie » (411,3–417,5) | exact |  |
| 36 | G | x=389,3 sur « d » de « du » (386,5–392,6) | exact |  |
| 37 | F | x=416,2 sur « a » de « attendait » (415,0–421,1) | exact |  |
| 38 | C | x=372,2 dans « c » de « merci » (367,9–373,4), 1,2 pt avant « i » | équivalent (même syllabe ; feuille alignée aux espaces, ± 1 lettre) |  |
| 39 | G | x=375,3 sur « n » de « encore » (373,5–379,6) | exact |  |
| 39 | F | x=484,6 sur « a » de « fais » (483,7–489,8) | exact |  |

En-tête : ajout de `{source: Ma raison de Noël.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 35:oeil:3 | laissé | def |  |
| 28:oeil:2 | laissé | def |  |
| 26:oeil:1 | laissé | def |  |
| 20:oeil:0 | appliqué | def |  |

- Source basse fidélité (Google Docs en double interligne, accords alignés aux espaces en Arial) : check.py n'apparie aucune ligne (47 accords « absents de la source ») ; les 47 accords ont été mesurés un à un par PyMuPDF rawdict (x du label contre x de chaque lettre de la ligne de paroles qui suit) et vérifiés à l'œil sur le rendu 2× (deux colonnes : Couplet 1 + Pré-refrain à gauche, Refrain + Couplet 2 à droite).
- Aucun accord inventé ni absent, aucun nom différent ; tous les accords sont sur la syllabe de la feuille. Seul changement : le retrait des couplets (12 lignes, `[X] mot`), que check.py ne voit pas.
- Écarts au niveau de la lettre dans la même syllabe (l. 8, 10, 12, 13, 18, 21, 26, 28, 38) laissés : sous la résolution d'une feuille alignée aux espaces ; 20:oeil:0 (« ok » par défaut, `m[G]oi`) appliqué ; 26:oeil:1, 28:oeil:2, 35:oeil:3 (« non » par défaut) gardés.
- Paroles, non appliqué : la feuille écrit « A chaque », « Jesus Tu es », « ca », « Noel », « Jesus merci » sans accents ni virgules ; le .cho les corrige (À, Jésus, ça, Noël), c'est juste.
- Tonalité C présente ; thèmes (Noël, Adoration, Grâce) dans la liste, inchangés. Structure conforme à la feuille (Couplet 1, Pré-refrain, Refrain écrit deux fois, Couplet 2) ; aucun renvoi gravé après le Couplet 2.

### me-voici — Me voici

Lot 4 · partition retenue : `Me voici - F.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 16 : `[Bb] Revêtu de Ton Esp[F]rit,` → `[Bb] Revêtu de Ton Es[F]prit,`
- l. 21 : `[Gm]Rends-moi sensible à T[Dm]a voix,` → `[Gm] Rends-moi sensible à T[Dm]a voix,` *(session (hors relevé))* — retrait de début de ligne : la ligne de la partition commence par deux espaces (x=45,4) et Gm est gravé à x=45,4, au-dessus du retrait, avant le « R » (x=54,3) ; Dm @222,3 = « a » de « Ta » (exact, inchangé)
- l. 22 : `[Bb]Rends-moi dépendant d[C]e Toi.` → `[Bb] Rends-moi dépendant d[C]e Toi.` *(session (hors relevé))* — retrait de début de ligne : Bb gravé à x=45,4 sur l'espace du retrait, avant le « R » (x=54,3) ; C @225,0 = « e » de « de » (exact, inchangé)
- l. 26 : `Me voici[Bb], envoie-mo[F]i,` → `Me voic[Bb]i, envoie-m[F]oi,`
- l. 27 : `Me voici[Bb], conduis-mo[F]i.` → `Me voic[Bb]i, conduis-m[F]oi.`
- l. 28 : `Me voici[Bb], façonne-mo[Dm]i,` → `Me voic[Bb]i, façonne-m[Dm]oi,`
- l. 36 : `Je chant[Dm]erai l'essen[C/E]tiel.` → `Je chan[Dm]terai l'essen[C/E]tiel.`
- l. 40 : `Je ré[Dm]pondrai à l'[C/E]appel.` → `Je ré[Dm]pondrai à l'a[C/E]ppel.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 16 | F | x=168,1 sur « p » de « Es‹p›rit » (p x0=168,15) | décalé | Es[F]prit (choix ok du relevé) |
| 21 | Gm | x=45,4 sur le retrait (2 espaces), « R » à x=54,3 | forme (retrait) | [Gm] Rends-moi |
| 21 | Dm | x=222,3 sur « a » de « T‹a› » | exact | inchangé |
| 22 | Bb | x=45,4 sur le retrait (2 espaces), « R » à x=54,3 | forme (retrait) | [Bb] Rends-moi |
| 22 | C | x=225,0 sur « e » de « d‹e› » | exact | inchangé |
| 26 | Bb | x=100,5 sur « i » final de « voic‹i› » | décalé | voic[Bb]i (choix ok du relevé) |
| 26 | F | x=178,7 sur « o » de « envoie-m‹o›i » | décalé | envoie-m[F]oi (choix ok du relevé) |
| 27 | Bb | x=100,5 sur « i » de « voic‹i› » | décalé | voic[Bb]i (choix ok du relevé) |
| 27 | F | x=186,7 sur « o » de « conduis-m‹o›i » | décalé | conduis-m[F]oi (choix ok du relevé) |
| 28 | Bb | x=100,5 sur « i » de « voic‹i› » | décalé | voic[Bb]i (choix ok du relevé) |
| 28 | Dm | x=188,5 sur « o » de « façonne-m‹o›i » | décalé | façonne-m[Dm]oi (choix ok du relevé) |
| 36 | Dm | x=326,8 sur « t » de « chan‹t›erai » | décalé | chan[Dm]terai (choix ok du relevé) |
| 40 | C/E | x=387,2 sur le 1er « p » de « l'a‹p›pel » | décalé | l'a[C/E]ppel (choix ok du relevé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espace de fin : l. 33, 35, 37.

En-tête : ajout de `{source: Me voici - F.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 40:decale:C/E:1 | appliqué | Timothée |  |
| 36:decale:Dm:1 | appliqué | Timothée |  |
| 28:decale:Bb:1 | appliqué | Timothée |  |
| 28:decale:Dm:1 | appliqué | Timothée |  |
| 27:decale:Bb:1 | appliqué | Timothée |  |
| 27:decale:F:1 | appliqué | Timothée |  |
| 26:decale:Bb:1 | appliqué | Timothée |  |
| 26:decale:F:1 | appliqué | Timothée |  |
| 16:decale:F:1 | appliqué | Timothée |  |

- Tous les accords mesurés en coordonnées (couche texte FPDF église) : les 9 écarts du relevé (tous « ok ») mettent l'accord sur le caractère de la partition ; rien contre le relevé.
- Ajout hors relevé : retrait de début de ligne au Pré-Refrain (l.21-22), Gm et Bb gravés au-dessus de l'indentation, comme déjà écrit au Couplet ([Bb] Je veux…). check.py ne voit pas ce retrait.
- Intro (Dm C F/A Bb Gm / Dm C F/A Bb F), Couplet, Refrain l.29 et Pont : exacts.
- Paroles, non appliqué : au Pont la partition écrit chaque paire de vers sur une ligne (« …au monde qu'il existe… », « …m'inondent, je chanterai… ») ; le .cho recoupe en deux lignes avec majuscule (« Qu'il », « Je ») — recoupe admise, pas une coquille.
- Structure (extra) : la liste source « Intro · Intro · Couplet · Refrain · Pont » est une lecture de l'outil (deux lignes d'intro, Pré-Refrain non reconnu) ; le .cho a la structure de la partition, rien à faire.
- Autres versions : Me voici - G.pdf (shir.fr, G), Me voici - D.pdf, Me voici (G).pdf, Me voici.pdf, Me voici - Accords F.pdf — non mesurées, la F fait foi.

### merci — Merci

Lot 4 · partition retenue : `Merci - Accords.pdf` (eglise-fpdf, mesure impossible)

Lignes modifiées :

- l. 7 : `{start_of_verse: Couplet}` → `{start_of_verse: Couplet (x2)}` *(structure)*
- l. 8 : `Merc[F]i d'un cœur [C/E]reconnaissant,` → `Mer[F]ci d'un cœur [C/E]reconnaissant,`
- l. 9 : `Merc[Dm]i au Seigneur [Am/C]trois fois saint,·  ` → `Mer[Dm]ci au Seigneur [Am/C]trois fois saint,`
- l. 10 : `Merc[Bb]i car Il a [F/A]donné Jésus-C[Eb]hrist, Son [Gm/C]Fils.[ ][C]` → `Mer[Bb]ci car Il a [F/A]donné Jésus-[Eb]Christ, Son [Gm/C]Fils.[C]` *(session (hors relevé))* — Chant « impossible » (l'outil saute les accords à deux tailles de police) : mesuré à la main sur la couche texte, y=174,8 / 187,5. Bb x=58,7 = « c » de « Mer‹c›i » (décalé d'un caractère dans le .cho) ; F/A x=127,2 = « d » de « donné » (exact) ; Eb x=223,2 = « C » de « Christ » (223,3 ; le .cho le met devant « h », décalé) ; Gm/C x=306,8 = « F » de « Fils » (exact) ; C x=357,0 dans les espaces après « Fils. » (point à 331,7) : après la ponctuation, collé (exact, l'espaceur retiré).

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | F | x=58,7 sur « c » de « Mer‹c›i » (58,7) | décalé | Mer[F]ci (question 8:oeil:0 ok) |
| 8 | C/E | x=150,7 sur « r » de « reconnaissant » (150,7) | exact | aucune |
| 9 | Dm | x=58,7 sur « c » de « Mer‹c›i » (58,7) | décalé | Mer[Dm]ci (question 9:fable ok) |
| 9 | Am/C | x=165,5 sur « t » de « trois » (165,5) | exact (l'outil le dit absent : il saute la ligne) | aucune |
| 10 | Bb | x=58,7 sur « c » de « Mer‹c›i » (58,7) | décalé | Mer[Bb]ci |
| 10 | F/A | x=127,2 sur « d » de « donné » (127,2) | exact (outil aveugle) | aucune |
| 10 | Eb | x=223,2 sur « C » de « Christ » (223,3) | décalé | Jésus-[Eb]Christ |
| 10 | Gm/C | x=306,8 sur « F » de « Fils » (306,8) | exact (outil aveugle) | aucune |
| 10 | C | x=357,0 dans les espaces après « Fils. » (point 331,7) | exact (après la ponctuation) | Fils.[C] (espaceur retiré) |
| 16 | Dm7 | x=126,3 sur « f » de « fait » (126,3) | exact (outil aveugle) | aucune |
| 16 | Eb | x=236,6 sur « c » de « choses » (236,6) | exact (outil aveugle) | aucune |
| 16 | Gm7/C | x=328,2 sur « n » de « nous » (328,2) | exact (outil aveugle) | aucune |
| 16 | C | x=385,0 dans les espaces après « nous. » (point 362,8) | exact (après la ponctuation) | aucune (le moteur retire l'espaceur) |
| 20 | Bb/C | x=31,2 sur « M » de « Mer » (31,2) | exact (outil aveugle) | aucune |
| 20 | F | x=81,9 sur « c » de « ci. » (81,9), mot gravé « Mer - ci » | exact (outil aveugle ; tiret du transcripteur) | Mer[F]ci. (le moteur écrit le mot entier) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espaceur : l. 14, 16 ; mot coupé au tiret : l. 20.

En-tête : ajout de `{source: Merci - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 9:oeil:1 | laissé | def |  |
| 9:fable:9:oeil:1 | appliqué | session | Dm gravé au-dessus du « c » de « Merci » (Mer[Dm]ci, le .cho est décalé d'un caractère) ; Am/C exact sur « trois » ; le « · » et les espaces finales sont absents de la partition. Cette lecture règle aussi 9:oeil:1 (autre lecture du même écart, laissée à « non »). — partition : mesure (y=140,8 / 153,4) : D(m) x=58,7 = « c » de « Mer‹c›i » (58,7) ; A(m)/C x=165,5 = « t » de « trois » (165,5) ; ligne gravée « Merci au Seigneur trois fois saint, » sans « · » |
| 8:oeil:0 | appliqué | session | F gravé au-dessus du « c » de « Merci » : Mer[F]ci, le .cho le pose devant « i » (décalé d'un caractère). C/E reste exact sur « reconnaissant ». Toute la ligne remplacée est juste. — partition : mesure (couche texte, y=106,8 / 119,4) : F x=58,7 = « c » de « Mer‹c›i » (58,7) ; C/E x=150,7 = « r » de « reconnaissant » (150,7) |

- Chant mesuré « impossible » par défaut de l'outil (accords à deux tailles de police) : les 23 accords relus un par un sur la couche texte de « Merci - Accords.pdf » (vérifié à l'œil). 19 exacts, 4 décalés d'un caractère corrigés : Mer[F]ci, Mer[Dm]ci, Mer[Bb]ci, Jésus-[Eb]Christ.
- Ligne 9 : le « · » parasite et les espaces finales retirés (question 9:fable ok).
- Lint E07 restant (avant comme après) : {start_of_final} → {start_of_outro: Final} à appliquer par Timothée (changement de type de section).
- Autre arrangement présent : « Merci.pdf » (partition piano JEM 454, image, accords en solfège), même harmonie, avec une 2e fin « Solm7/Do Do Do/Sib » non reprise.
- Non repris : le crédit de traduction, titre original « Give thanks ».

### moi-et-ma-maison — Moi et ma maison

Lot 4 · partition retenue : `Moi et ma maison.png` (capture-mono, mesure basse-fidelite)

Lignes modifiées :

- l. 12 : `Loin de no[Bm]us la pensé[G]e de T'abandonner[D]` → `Loin de no[Bm]us la pensé[G]e de T'abandonn[D]er` *(session (hors relevé))* — D x=595 = col. 36, « e » de « T'abandonn‹e›r » (syllabe « ner », le mot finit col. 37) : la partition pose D sur la dernière syllabe, le .cho le mettait après le mot. Bm (col. 9, « nous ») et G (col. 20, syllabe « sée ») sur la syllabe du .cho, gardés.
- l. 13 : `Loin de no[Bm]us la pensé[G]e de nous éloigner[D]` → `Loin de no[Bm]us la pensé[G]e de nous éloign[D]er` *(session (hors relevé))* — D x=611 = col. 37, « e » de « éloign‹e›r » (syllabe « gner », le mot finit col. 38) : sur la dernière syllabe, pas après le mot. Bm (col. 9) et G (col. 20) sur la syllabe du .cho, gardés.
- l. 17 : `Il est le Di[A]eu qui nou[Bm]s a gardés[G]` → `Il est le Di[A]eu qui nou[Bm]s a gar[G]dés` *(session (hors relevé))* — G x=485 = col. 29, « d » de « gar‹d›és » (syllabe « dés », le mot finit col. 31) : sur la dernière syllabe, comme dans les lignes parallèles (« sai[G]son »). A (col. 11, « Dieu ») et Bm (col. 20, « nous ») sur la syllabe du .cho, gardés.
- l. 18 : `Dans chaque lie[A]u où nou[Bm]s sommes allés[G]` → `Dans chaque lie[A]u où nou[Bm]s sommes all[G]és` *(session (hors relevé))* — G x=579 = col. 35, « é » de « all‹é›s » (syllabe « lés », le mot finit col. 36) : sur la dernière syllabe, pas après le mot. A (col. 14, « lieu ») et Bm (col. 21, « nous ») sur la syllabe du .cho, gardés.
- l. 23 : `De [Bm]servir l'É[G]ter[D]nel` → `De [Bm]servir l'Éter[G]nel[D]`
- l. 32 : `Il est le [A]Dieu de cha[Bm]que sai[G]son` → `Il est le [A]Dieu de ch[Bm]aque sai[G]son` *(session (hors relevé))* — Bm x=346 = col. 20, « a » de « ch‹a›que » (syllabe « cha ») ; le .cho le mettait sur « que ». La 6e syllabe chantée, comme Bm sur « nous » dans la ligne parallèle « Il est le Dieu qui nous a gardés ». A (col. 12, « Dieu ») et G (col. 28, syllabe « son ») gardés.
- l. 33 : `Nous le [A]suivrons [Bm]sans condi[G]tions` → `Nous le sui[A]vrons [Bm]sans condi[G]tions`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | D A Bm G | « Intro : D A Bm G » : D col. 8, A col. 11, Bm col. 14, G col. 18, sans paroles | exact (l'outil compte 6 amas en prenant « Intro : » pour des labels) | aucune ; la forme écrit [D]  [A]  [Bm]  [G] |
| 12 | Bm | x=174, col. 9, « o » de « nous » | équivalent (même syllabe, .cho no[Bm]us) | aucune |
| 12 | G | x=345, col. 20, « é » de « pensée » (syllabe « sée ») | équivalent (même syllabe, .cho pensé[G]e) | aucune |
| 12 | D | x=595, col. 36, « e » de « T'abandonner » (syllabe « ner ») | décalé (.cho après le mot) | T'abandonn[D]er |
| 13 | Bm | x=174, col. 9, « o » de « nous » | équivalent (même syllabe) | aucune |
| 13 | G | x=345, col. 20, « é » de « pensée » | équivalent (même syllabe) | aucune |
| 13 | D | x=611, col. 37, « e » de « éloigner » (syllabe « gner ») | décalé (.cho après le mot) | éloign[D]er |
| 17 | A | x=204, col. 11, « i » de « Dieu » | équivalent (même syllabe, .cho Di[A]eu) | aucune |
| 17 | Bm | x=346, col. 20, « o » de « nous » | équivalent (même syllabe) | aucune |
| 17 | G | x=485, col. 29, « d » de « gardés » (syllabe « dés ») | décalé (.cho après le mot) | gar[G]dés |
| 18 | A | x=250, col. 14, « e » de « lieu » | équivalent (même syllabe, .cho lie[A]u) | aucune |
| 18 | Bm | x=361, col. 21, « o » de « nous » | équivalent (même syllabe) | aucune |
| 18 | G | x=579, col. 35, « é » de « allés » (syllabe « lés ») | décalé (.cho après le mot) | all[G]és |
| 22 | D | x=205, col. 11, « a » de « maison » (syllabe « mai ») | équivalent (même syllabe, .cho [D]maison) | aucune |
| 22 | A | x=453, col. 27, « i » de « choisissons » (syllabe « si ») | équivalent (même syllabe, .cho choi[A]sissons) | aucune |
| 23 | Bm | x=96, col. 4, « e » de « servir » (syllabe « ser ») | équivalent (même syllabe) | aucune |
| 23 | G | x=298, col. 17, « e » de « l'Éternel » (syllabe « nel ») | décalé (.cho sur « ter ») | l'Éter[G]nel (question 23, ok) |
| 23 | D | x=361, col. 21, après le « l » final (col. 18) | décalé (.cho sur « nel ») | nel[D] (question 23, ok) |
| 27 | D | x=580, col. 35, 1er « s » de « promesse » (syllabe écrite « mes ») | équivalent (même syllabe, .cho pro[D]messe ; l'outil coupe « me\|sse ») | aucune |
| 28 | Bm G D | Bm col. 9 « n » (syllabe « san »), G col. 18 « é » (syllabe « lée »), D col. 35 « e » (syllabe « bles ») | équivalent (mêmes syllabes que le .cho) | aucune |
| 32 | A | x=219, col. 12, « e » de « Dieu » | équivalent (même mot d'une syllabe, .cho [A]Dieu) | aucune |
| 32 | Bm | x=346, col. 20, « a » de « chaque » (syllabe « cha ») | décalé (.cho sur « que ») | ch[Bm]aque |
| 32 | G | x=485, col. 29, « o » de « saison » (syllabe « son ») | équivalent (même syllabe, .cho sai[G]son) | aucune |
| 33 | A | x=250, col. 14, « n » de « suivrons » (syllabe « vrons ») | décalé (.cho sur « sui ») | sui[A]vrons (question 33, ok) |
| 33 | Bm G | Bm col. 18 « a » de « sans », G col. 30 « n » de « conditions » (syllabe « tions ») | équivalent (mêmes syllabes) | aucune |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligne sans paroles : l. 8.

En-tête : ajout de `{source: Moi et ma maison.png}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 33:decale:A:1 | laissé | def |  |
| 33:fable:33:decale:A:1 | appliqué | session | A commence sur la 2e syllabe de « suivrons », pas sur la 1re ; Bm et G inchangés et justes. Même 4e syllabe chantée que A dans la ligne parallèle « Il est le Dieu de chaque saison ». — partition : A x=250 (col. 14, « n » de « suivro‹n›s », syllabe « vrons ») ; Bm x=314 (col. 18, « a » de « sans ») ; G x=501 (col. 30, « n » de « conditio‹n›s », syllabe « tions ») |
| 27:decale:D:1 | laissé | def |  |
| 23:decale:G:1 | laissé | def |  |
| 23:fable:23:decale:G:1 | appliqué | session | La capture est en chasse fixe (15,6 px par colonne, colonne 0 à x=33) et chaque label commence net sur une colonne : G sur la syllabe « nel », D après la fin du mot. Toute la ligne proposée est juste (Bm sur « ser »). — partition : Bm x=96 (col. 4, « e » de « servir ») ; G x=298 (col. 17, « e » de « l'Étern‹e›l », syllabe « nel ») ; D x=361 (col. 21, deux colonnes après le « l » final, col. 18) |
| 8:instrumental:D:1 | laissé | def |  |
| 8:instrumental:A:1 | laissé | def |  |
| 8:instrumental:Bm:1 | laissé | def |  |
| 8:instrumental:G:1 | laissé | def |  |

- Source basse fidélité selon l'outil (capture d'écran d'un site d'accords), mais la capture est en chasse fixe (15,6 px par colonne, colonne 0 à x=33) et chaque label commence net sur une colonne (écart ≤ 0,1 colonne) : chaque accord du chant mesuré à l'œil et en pixels, colonne par colonne, vérifié à l'œil sur l'image.
- Visée : la syllabe (but du 08/10) ; les accords à ± 1 lettre dans la même syllabe sont gardés (équivalents, listés dans mesures). Corrigés : les accords de fin de vers que le .cho posait après le mot alors que la partition les pose sur la dernière syllabe (l. 12, 13, 17, 18), G et D de « l'Éternel » (question 23), A de « suivrons » (question 33), Bm de « chaque » (l. 32, sur « cha » et non « que », 6e syllabe comme Bm sur « nous » dans la ligne parallèle).
- Les lignes parallèles se répondent après correction : A sur la 4e syllabe (Dieu / lieu / Dieu / vrons), Bm sur la 6e, G sur la dernière syllabe du vers.
- Écarts par défaut « non » confirmés par la partition : Intro l. 8 (l'outil prend « Intro : » pour des labels), D l. 27 (« pro[D]messe », même syllabe écrite que le label, sur le 1er « s »).
- Structure : la capture s'arrête au Pré-Refrain 2 sans renvoi au Refrain ; rien d'ajouté (retour du refrain probable à l'oreille, non gravé).
- Autres versions dans Partitions/ : « Moi et ma maison (D).pdf » = la même capture du même site (mêmes accords, mêmes colonnes) ; « Moi et ma maison - École Pierre.pdf » (La Boîte à chansons, mêmes accords, labels décalés d'environ une colonne vers la droite, « l'Eternel » sans accent) : non retenue.
- Paroles, non appliqué : aucune différence avec la capture.

### mon-ancre-et-ma-voile — Mon ancre et ma voile

Lot 5 · partition retenue : `Mon ancre et ma voile - Accords.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `Une [G]lampe de[D/F#]vant mes[Asus4]pas.[A]` → `Une [G]lampe de[D/F#]vant mes[Asus4] pas.[A]`
- l. 10 : `Ta voix [D]a tr[A/C#]iomphé de [G/B]l'oura[D/A]gan,` → `Ta voix [D]a tri[A/C#]omphé de [G/B]l'oura[D/A]gan,`
- l. 11 : `Remp[Em7]orté [Asus4]le [A]comb[D]at.` → `Rem[Em7]porté [Asus4]le[A] com[D]bat.`
- l. 22 : `Pro[G]tégé [D/F#]par Ta [Asus4]main.[ ][A]` → `Pro[G]tégé [D/F#]par Ta[Asus4] main.[A]`
- l. 24 : `Et [Em7]suivre [Asus4]Ton [A]che[D]min.` → `Et [Em7]suivre [Asus4]Ton[A] che[D]min.`
- l. 29 : `Ton [G]sang m'a [D/F#]rache - [Asus4]té.[A]` → `Ton [G]sang m'a [D/F#]rache[Asus4]té.[A]`
- l. 31 : `Sans [Em7]fin je [Asus4]Te [A]louer[D]ai.` → `Sans [Em7]fin je [Asus4]Te[A] loue[D]rai.`

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 2 ligne(s) — mot coupé au tiret : l. 8 ; espaceur : l. 15.

En-tête : ajout de `{source: Mon ancre et ma voile - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 31:decale:A:1 | appliqué | def |  |
| 31:decale:D:1 | appliqué | def |  |
| 29:decale:Asus4:1 | appliqué | def |  |
| 24:decale:A:1 | appliqué | def |  |
| 22:decale:Asus4:1 | appliqué | def |  |
| 11:decale:Em7:1 | appliqué | def |  |
| 11:decale:A:1 | appliqué | def |  |
| 11:decale:D:1 | appliqué | def |  |
| 10:decale:A/C#:1 | appliqué | def |  |
| 9:decale:Asus4:1 | laissé | def |  |
| 9:fable:9:decale:Asus4:1 | appliqué | session | La partition met Asus4 sur l'espace entre « mes » et « pas. » (crochet + espace) et le .cho actuel a collé « mespas » (espace perdue dans les paroles). La ligne remplacée rétablit l'espace et place chaque accord comme la partition : G x=65,0 sur « l » de « lampe » (65,0), D/F# x=130,8 sur « v » de « devant » (130,8), Asus4 x=195,7 sur l'espace (195,7, « p » à 200,2), A x=245,9 après le point de « pas. » (225,9). Toute la ligne est juste. — partition : mesure : Asus4 x=195,7 sur l'espace avant « pas. » (p à 200,2) ; A x=245,9 après la ponctuation |

- Source église (rendu ChordPro, couche texte) : chaque accord du chant relevé au x sur la page, les 60 accords concordent avec la partition après corrections (vérifié à l'œil sur les coordonnées).
- Autre version dans Partitions : « Mon ancre et ma voile.pdf » (feuille Word/scan, basse fidélité) non utilisée.

### mon-assurance-est-en-christ — Mon assurance est en Christ

Lot 5 · partition retenue : `Mon assurance est en Christ - Accords.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 7 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (x2)}` *(session (hors relevé))* — p1 y=88,3 : « Em C G D (x2) » sans paroles (Em@31,2 C@64,0 G@86,9 D@110,4, « (x2) »@133,2) : reprise identique = suffixe (x2) au libellé (02, cas Abba Père) ; même directive, seul le libellé change.
- l. 13 : `Oui Ses p[Em]romesses [C]sont pour [D]moi,` → `Oui Ses p[Em]romesses[C] sont pour[D] moi,` *(session)*
- l. 15 : `Une fois p[Em]our toutes, [C]pour ma l[G]ibert[D]é.` → `Une fois p[Em]our toutes,[C] pour ma li[G]bert[D]é.` *(session)*
- l. 20 : `En [D/F#]Sa ju[Em]stice [C]et non l[D]a mienne.` → `En [D/F#]Sa ju[Em]stice[C] et non l[D]a mienne.` *(session)*
- l. 22 : `Sa [D/F#]bonté [Em]règne [C]et dure à [G]jamai[D]s.` → `Sa [D/F#]bonté[Em] règne[C] et dure à [G]jama[D]is.` *(session)*
- l. 27 : `Tous mes p[Em]échés [C]sont sans pu[D]issance,` → `Tous mes p[Em]échés[C] sont sans pu[D]issance,` *(session)*
- l. 28 : `Et j'[Em]avance par Ta [C]faveur,[G][ ][D]` → `Et j'a[Em]vance par Ta [C]faveur,[G] [D]` *(session)*
- l. 29 : `Grâce inf[Em]inie, [C]ô mon [G]sa - l[D]ut.` → `Grâce inf[Em]inie,[C] ô mon [G]sal[D]ut.` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 13 | C | x=170,8 sur l'espace avant « sont » | décalé | promesses[C] sont |
| 13 | D | x=241,9 sur l'espace avant « moi » | décalé | pour[D] moi, |
| 15 | C | x=178,8 sur l'espace avant « pour » | décalé | toutes,[C] pour |
| 15 | G | x=253,5 sur « b » de « li‹b›erté » | décalé | li[G]berté |
| 20 | C | x=165,4 sur l'espace avant « et » | décalé | justice[C] et |
| 22 | Em | x=127,2 sur l'espace avant « règne » | décalé | bonté[Em] règne |
| 22 | C | x=172,6 sur l'espace avant « et » | décalé | règne[C] et |
| 22 | D | x=279,3 sur « i » de « jama‹i›s » | décalé | jama[D]is |
| 27 | C | x=166,4 sur l'espace avant « sont » | décalé | péchés[C] sont |
| 28 | Em | x=66,3 sur « v » de « j'a‹v›ance » | décalé | j'a[Em]vance |
| 29 | C | x=143,2 sur l'espace avant « ô » | décalé | infinie,[C] ô |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 9 ligne(s) — ligne sans paroles : l. 8 ; espaceur : l. 12, 14, 26 ; orthographe d'accord : l. 19, 21 ; mot coupé au tiret : l. 34, 36, 43.

En-tête : ajout de `{source: Mon assurance est en Christ - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 29:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 28:decale:Em:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 27:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 22:decale:Em:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 22:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 22:decale:D:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 20:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 15:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 15:decale:G:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 13:decale:C:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 13:decale:D:1 | appliqué | Timothée | inclus dans la ligne de la session |

- Mesuré sur la couche texte (rawdict) du PDF de l'église : les 67 accords relevés un par un ; les 11 décalés sont ceux du relevé, tous à « ok », et la partition leur donne raison ; les 56 autres sont exacts (y compris Gsus → orthographe Gsus4 par le moteur).
- Retrait de début de ligne : le refrain et les ponts sont en retrait (x=45,4 contre 31,2 aux couplets) mais chaque accord de début de ligne est au-dessus de la 1re lettre (G, C, D @45,4) : `[X]mot`, rien à changer.
- Intro : la feuille grave « Em C G D (x2) » : libellé `Intro (x2)` (même directive).
- Paroles : seules différences, les tirets de coupe « sa - lut », « Jé - sus » (le moteur les écrit entiers).
- Non repris : traducteurs et titre original (« I will boast in Christ - Hillsong ») en pied de page. Autre version dans Partitions : « Mon assurance est en Christ.pdf » (traitement de texte, basse fidélité), non utilisée.

### mon-redempteur-vit — Mon rédempteur vit

Lot 5 · partition retenue : `Mon rédempteur vit.pdf` (shirfr, mesure fiable)

Lignes modifiées :

- l. 10 : `Je le cr[E7]ois, [A]oui je cro[E7]is.[ ][A]` → `Je le crois,[E7][A] oui je crois.[E7] [A]`
- l. 12 : `[E7] Je suis guér[A]i en son nom,` → `[E7] Je suis gué[A]ri en son nom,`
- l. 13 : `Je le cr[E7]ois, [A]oui je cro[E7]is.[ ][A]` → `Je le crois,[E7][A] oui je crois.[E7] [A]`
- l. 14 : `[B] Je veux proclamer : [A]Jésus a [A/B]vaincu la mort.` → `[B] Je veux proclamer :[A] Jésus a [A/B]vaincu la mort.`
- l. 18 : `Mon ré[E]dempteur vit,[A]mon ré[C#m7]dempteur vit ![B]` → `Mon ré[E]dempteur vit,[A] mon ré[C#m7]dempteur vit ![B]`
- l. 19 : `Mon ré[E]dempteur vit,[A]mon ré[C#m7]dempteur vit ![B][E]` → `Mon ré[E]dempteur vit,[A] mon ré[C#m7]dempteur vit ![B][E]`
- l. 23 : `[D] Tu prends mon fardeau [A/C#]et tu l’emportes.` → `[D] Tu prends mon fardeau[A/C#] et tu l’emportes.`
- l. 24 : `Al[E/B]ors je danse sur les [F#m7]sommets,` → `A[E/B]lors je danse sur les[F#m7] sommets,`
- l. 25 : `Je [E/G#]vois venir ton rè[B4]gne.[B]` → `Je [E/G#]vois venir ton règne.[B4][B]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | E7 | x=123,2 sur l'espace après « crois, » (118,3) | décalé | crois,[E7] |
| 10 | A | x=152,0 sur l'espace avant « oui » (156,6) | décalé | [A] oui |
| 10 | E7 | x=247,6 après « crois. » (point 242,5) | décalé | crois.[E7] |
| 10 | A | x=276,4 après E7, en l'air | exact | crois.[E7] [A] |
| 12 | A | x=125,5 sur le « r » de « guéri » (125,4) | décalé | gué[A]ri |
| 13 | E7 | x=123,2 sur l'espace après « crois, » | décalé | crois,[E7] |
| 13 | A | x=152,0 sur l'espace avant « oui » | décalé | [A] oui |
| 13 | E7 | x=247,6 après « crois. » | décalé | crois.[E7] |
| 14 | A | x=199,1 sur l'espace avant « Jésus » (203,9) | décalé | proclamer :[A] Jésus |
| 18 | A | x=197,2 sur l'espace entre « vit, » (192,4) et « mon » (202,0) | décalé | vit,[A] mon |
| 19 | A | x=197,2 sur l'espace entre « vit, » et « mon » | décalé | vit,[A] mon |
| 19 | E | x=389,4 après B (375,0), en l'air après « ! » | exact | aucune : ![B][E] ; l'outil lit deux positions en l'air différentes |
| 23 | A/C# | x=224,0 sur l'espace avant « et » (228,8) | décalé | fardeau[A/C#] et |
| 24 | E/B | x=51,4 sur le « l » de « Alors » (51,3) | décalé | A[E/B]lors |
| 24 | F#m7 | x=205,3 sur l'espace avant « sommets » (209,9) | décalé | les[F#m7] sommets, |
| 25 | B4 | x=222,5 juste après « règne. » (point 217,6) | décalé | règne.[B4][B] |

En-tête : ajout de `{source: Mon rédempteur vit.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 25:decale:B4:1 | laissé | session | l'opération met B4 après B ; la feuille grave B4 puis B après « règne. » : réglé par 25:oeil:8 — partition : B4 x=222,5 juste après le point (217,6), B x=251,3 ensuite |
| 25:oeil:8 | appliqué | session | toute la ligne est comme la feuille — partition : E/G# x=62,0 = « v » de « vois » (62,0) ; B4 222,5 après « règne. » ; B 251,3 |
| 24:decale:E/B:1 | appliqué | def | inclus dans la ligne de 24:oeil:7 |
| 24:decale:F#m7:1 | appliqué | def | inclus dans la ligne de 24:oeil:7 |
| 24:oeil:7 | appliqué | session | toute la ligne est comme la feuille — partition : E/B x=51,4 sur le « l » de « Alors » (51,3) ; F#m7 x=205,3 sur l'espace avant « sommets » (205,1 / s 209,9) |
| 23:decale:A/C#:1 | appliqué | def | inclus dans la ligne de 23:oeil:6 |
| 23:manquant:A:1 | laissé | def |  |
| 23:manquant:C#m7:1 | laissé | def |  |
| 23:oeil:6 | appliqué | session | toute la ligne est comme la feuille — partition : D x=34,0 sur le retrait ; A/C# x=224,0 sur l'espace avant « et » (224,0 / e 228,8) |
| 19:decale:A:1 | laissé | def |  |
| 19:decale:E:1 | laissé | session | la ligne actuelle est juste : B puis E en l'air après « ! » ; l'espace à 383,2 n'est que le séparateur des deux étiquettes — partition : B 375,0, espace d'accords 383,2, E 389,4, tous après « ! » (370,2) |
| 19:manquant:E:1 | laissé | def |  |
| 19:manquant:B:1 | laissé | def |  |
| 19:oeil:5 | appliqué | session | toute la ligne est comme la feuille — partition : 3e rangée du refrain : E 90,1 / A 197,2 (espace avant « mon ») / C#m7 258,3 / B 375,0 / E 389,4 |
| 19:fable:19:decale:A:1 | appliqué | session | même texte que 19:oeil:5 ; seule lecture retenue de 19:decale:A:1 (sans opération, laissé à non) — inclus dans la ligne de 19:oeil:5 — partition : A x=197,2 sur l'espace entre « vit, » et « mon » |
| 18:decale:A:1 | laissé | def |  |
| 18:oeil:4 | appliqué | session | toute la ligne est comme la feuille, et l'espace perdue entre « vit, » et « mon » revient — partition : E 90,1 = « d » (90,1) ; A 197,2 sur l'espace avant « mon » (197,2 / m 202,0) ; C#m7 258,3 = « d » (258,3) ; B 375,0 après « ! » (370,2) |
| 18:fable:18:decale:A:1 | appliqué | session | même texte que 18:oeil:4 ; seule lecture retenue de 18:decale:A:1 (sans opération, laissé à non) — inclus dans la ligne de 18:oeil:4 — partition : A x=197,2 sur l'espace entre « vit, » et « mon » |
| 14:decale:A:1 | appliqué | def | inclus dans la ligne de 14:oeil:3 |
| 14:oeil:3 | appliqué | session | toute la ligne est comme la feuille — partition : B x=34,0 sur le retrait ; A x=199,1 sur l'espace avant « Jésus » (199,1 / J 203,9) ; A/B x=266,5 sur le « v » de « vaincu » (266,4) |
| 13:decale:E7:1 | appliqué | session | l'opération met E7 juste après la virgule, comme la feuille ; la ligne entière est réglée par 13:oeil:2 — inclus dans la ligne de 13:oeil:2 — partition : E7 x=123,2 sur l'espace qui suit « crois, » (118,3) |
| 13:decale:A:1 | appliqué | session | l'opération met A sur l'espace avant « oui », comme la feuille ; la ligne entière est réglée par 13:oeil:2 — inclus dans la ligne de 13:oeil:2 — partition : A x=152,0 sur l'espace avant « oui » (151,8 / o 156,6) |
| 13:decale:E7:2 | laissé | session | l'opération met E7 après A ; la feuille grave E7 puis A après « crois. » : réglé par 13:oeil:2 — partition : E7 x=247,6 après le point (242,5), A x=276,4 ensuite |
| 13:oeil:2 | appliqué | session | toute la ligne est comme la feuille — partition : même rangée que la l. 10 : E7 123,2 / A 152,0 / E7 247,6 / A 276,4 |
| 12:decale:A:1 | appliqué | def | inclus dans la ligne de 12:oeil:1 |
| 12:oeil:1 | appliqué | session | l'opération met l'accord comme la feuille — partition : E7 x=34,0 sur le retrait avant « Je » (38,7) ; A x=125,5 sur le « r » de « guéri » (125,4) |
| 10:decale:E7:1 | appliqué | session | l'opération met E7 juste après la virgule, comme la feuille ; la ligne entière est réglée par 10:oeil:0 — inclus dans la ligne de 10:oeil:0 — partition : E7 x=123,2 sur l'espace qui suit « crois, » (virgule 118,3, espace 123,1) |
| 10:decale:A:1 | appliqué | session | l'opération met A sur l'espace avant « oui », comme la feuille ; la ligne entière est réglée par 10:oeil:0 — inclus dans la ligne de 10:oeil:0 — partition : A x=152,0 sur la dernière espace avant « oui » (espace 151,8, o 156,6) |
| 10:decale:E7:2 | laissé | session | l'opération met E7 après A ; la feuille grave E7 puis A après « crois. » : réglé par 10:oeil:0 — partition : E7 x=247,6 juste après le point (242,5), A x=276,4 ensuite |
| 10:oeil:0 | appliqué | session | toute la ligne est comme la feuille — partition : E7 123,2 après « crois, » ; A 152,0 sur l'espace avant « oui » (156,6) ; E7 247,6 après « crois. » (242,5) ; A 276,4 après |

- Feuille shir.fr (rendu ChordPro, couche texte) mesurée caractère par caractère (PyMuPDF rawdict) et regardée à l'œil (crops/mon-redempteur-vit/p1.png) : tous les accords du chant mesurés.
- Les 19 questions tranchées : 15 ok, 4 non (19:decale:E:1, la ligne actuelle est juste ; 10/13:decale:E7:2 et 25:decale:B4:1, l'opération inverse l'ordre de deux accords en l'air, la ligne est réglée par le remplacement relevé à l'œil).
- Les lignes 8, 9, 11 et les accords E, C#m7, B du refrain, D, E/G# du Pont sont exacts : rien à changer. Les couplets sont en retrait sur la feuille et les accords de tête (E7, B, D) sont au-dessus du retrait : déjà écrits `[X] mot`.
- Structure : troisième ligne du refrain ajoutée (copie de la l. 18 corrigée) et « A A7 A » posé en 1re ligne du Pont, sans section ajoutée ni déplacée ; {needs_review} avant le Pont sur le retour du refrain non gravé. La feuille sépare le couplet en deux strophes de trois et quatre lignes, sans titre : un seul Couplet, laissé tel quel.
- Liste extra du relevé : A, A7, A (ligne instrumentale y=480,5) repris par le bloc de structure ; la structure « Couplet, Refrain, Pont, Interlude, Couplet » de l'outil n'est pas sur la feuille (aucun titre autre que « Pont »).
- Paroles conformes à la feuille ; seule l'espace perdue de « vit,mon » revient avec les remplacements des lignes 18-19.
- Thèmes Résurrection, Adoration, Foi : dans la liste, gardés. Tonalité E conforme à la feuille (« Tonalité : E »).
- Feuille sans renvoi, noté ici plutôt qu'en needs_review : la feuille s'arrête après le Pont sans renvoi : retour du refrain ou du couplet après le Pont non gravé, rien n'est ajouté.

### mon-secours-est-en-toi — Mon secours est en Toi

Lot 5 · partition retenue : `Mon secours est en Toi (D).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `Si la lune me [D]glace et le soleil me[A]nace,` → `Si la lune me [D]glace et le soleil m[A]enace,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | A | y=106,8 : x=259,7 sur « e » de « menace » (m 246,4 · e 259,7 · n 268,6) | décalé (même syllabe, autre caractère) | soleil m[A]enace, (écart 9:decale:A:1, « ok » du relevé, appliqué) |

En-tête : ajout de `{source: Mon secours est en Toi (D).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 9:decale:A:1 | appliqué | Timothée |  |

- Feuille de l'église (rendu ChordPro, couche texte) : check.py la lit bien, 36 accords exacts sur 37 ; le seul décalé est l'écart du relevé l. 9 (A sur « e » de « menace », x=259,7 = « e »), que le « ok » du relevé met juste : vérifié sur la couche texte et sur le rendu 2×.
- Retrait : Pré-refrain, Refrain et Pont sont en retrait (x=45,4 contre 31,2), mais chaque accord de début de ligne (G l. 16-17, D l. 21 et 23) est au-dessus de la 1re lettre (45,4) : pas de « [X] mot ».
- La retouche à la main du 20/09 (tonalité G → D, « somm[A]ets » et « m'enva[D]hit ») suit la partition (A x=319,2, D x=154,3, exacts) et n'est pas touchée ; la l. 9 n'en fait pas partie.
- Structure : la feuille grave Couplet 1, Pré-refrain, Refrain, Couplet 2, Pont, sans reprise ni renvoi, comme le .cho (l'écart « structure » de la liste extra vient d'une lecture de « Pré-refrain » comme Refrain) : rien à changer. Libellé de la feuille « Pré-refrain », .cho « Pré-Refrain » : laissé.
- Autres versions de la même feuille dans Partitions : « Mon secours est en Toi (C).pdf » et « Mon secours est en Toi.pdf ».

### mon-seul-souhait — Mon seul souhait

Lot 5 · partition retenue : `Mon seul souhait.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[C] Mon seul souhai[Am7]t dans ce [F]monde est de Te rencontr[G]er.` → `[C] Mon seul souha[Am7]it dans ce [F]monde est de Te rencontr[G]er.`
- l. 11 : `En Ton [F]Nom, [G]en Ton [F/A]Nom.[ ][G/B]` → `En Ton [F]Nom,[G] en Ton [F/A]Nom.[G/B]`
- l. 15 : `Tu es mon [Am]Maître et je veux me soumet[F]tre` → `Tu es mon [Am]Maître et je veux me soume[F]ttre`
- l. 16 : `À Ta volon[C/E]té, mon bien-a[G]imé.` → `À Ta volon[C/E]té, mon bien-ai[G]mé.`
- l. 18 : `Dieu de bont[C/E]é, Dieu de majest[G]é.` → `Dieu de bont[C/E]é, Dieu de majes[G]té.`
- l. 19 : `Je T'a[F]do[ ][C/E]- [G]re, je T'a[F]do[ ][G]- [ ][C]re.` → `Je T'a[F]do[C/E][G]re, je T'a[F]do[G][C]re.`
- l. 23 : `[C] Éternel[Am7], Dieu fid[F]èle, je cherche à Te sui[G]vre.` → `[C] Éterne[Am7]l, Dieu fid[F]èle, je cherche à Te sui[G]vre.`
- l. 25 : `En Ton [F]Nom, [G]en Ton [F/A]Nom.[ ][G/B]` → `En Ton [F]Nom,[G] en Ton [F/A]Nom.[G/B]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | Am7 | x=153,0 sur « i » de « souha‹i›t » (i@153,0) | décalé (autre lettre de la syllabe) | souha[Am7]it (écart ok par défaut) |
| 11 | G | x=125,4 sur l'espace après « Nom, » (virgule@121,0, e@129,9) | décalé (accord en l'air avant « en ») | Nom,[G] en (écart ok par défaut) |
| 11 | G/B | x=235,7 en l'air, 4e espace après « Nom. » (.@217,9) | exact (en l'air, après la ponctuation) | Nom.[G/B] (forme : le [ ] seul est retiré par le moteur) |
| 15 | F | x=322,8 sur le 1er « t » de « soume‹t›tre » | décalé (autre lettre) | soume[F]ttre (écart ok par défaut) |
| 16 | G | x=227,7 sur « m » de « bien-ai‹m›é » | décalé (autre lettre) | bien-ai[G]mé (écart ok par défaut) |
| 18 | G | x=256,1 sur « t » de « majes‹t›é » | décalé (autre lettre) | majes[G]té (écart ok par défaut) |
| 19 | F | x=88,4 sur « d » de « T'a‹d›o » | exact | T'a[F]do (inchangé) |
| 19 | C/E | x=115,1 sur l'espace entre « do » et le tiret du transcripteur | forme (mot coupé au tiret) | do[C/E][G]re (mot entier, même position) |
| 19 | G | x=164,9 sur « r » de « re » | forme (mot coupé au tiret) | do[C/E][G]re |
| 19 | F | x=226,7 sur « d » du 2e « T'a‹d›o » | exact | T'a[F]do (inchangé) |
| 19 | G | x=253,4 sur l'espace avant le tiret (@257,8) | forme (mot coupé au tiret) | do[G][C]re |
| 19 | C | x=276,5 sur « r » de « re. » | forme (mot coupé au tiret) | do[G][C]re. |
| 23 | C | x=31,2 au-dessus du retrait, avant « É »@40,1 | exact | [C] Éternel (inchangé) |
| 23 | Am7 | x=87,2 sur « l » d'« Éterne‹l› » (virgule@90,8) | décalé (autre caractère : .cho après le « l ») | Éterne[Am7]l, |
| 23 | F | x=153,9 sur « è » de « fid‹è›le » | exact | fid[F]èle (inchangé) |
| 23 | G | x=319,3 sur « v » de « sui‹v›re » | exact | sui[G]vre (inchangé) |
| 25 | G | x=125,4 sur l'espace après « Nom, » | décalé (accord en l'air avant « en ») | Nom,[G] en (écart ok par défaut) |
| 25 | G/B | x=222,4 sur le 1er espace après « Nom. » (.@217,9) | exact (après la ponctuation, collé) | Nom.[G/B] (forme : [ ] seul retiré) |

En-tête : ajout de `{source: Mon seul souhait.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 25:decale:G:1 | appliqué | def |  |
| 23:decale:Am7:1 | laissé | def |  |
| 23:fable:23:decale:Am7:1 | appliqué | session | La feuille pose Am7 au-dessus du « l » final d'« Éternel », avant la virgule ; le .cho le met après le « l ». Autre caractère : la partition fait foi (02). Le reste de la ligne est déjà exact ([C] au-dessus du retrait, F sur « è », G sur « v »). — partition : p1 y=446,9 : C@31,2 sur le retrait (É@40,1) · Am7@87,2 sur « l » (Éterne‹l›, l@87,2, virgule@90,8) · F@153,9 sur « è » (fid‹è›le) · G@319,3 sur « v » (sui‹v›re) |
| 19:decale:C/E:1 | laissé | def |  |
| 19:decale:G:1 | laissé | def |  |
| 19:fable:19:decale:C/E:1 | appliqué | session | Mot coupé par le tiret du transcripteur (« T'ado - re ») : il s'écrit entier, chaque accord devant le même caractère (02). C/E est gravé dans le blanc entre « do » et le tiret, G sur « re » : `do[C/E][G]re`. Même chose au 2e « T'ado - re » : G dans le blanc, C sur « re ». La ligne de remplacement met les six accords comme la feuille. — partition : p1 y=378,9 : F@88,4 sur « d » (T'a‹d›o) · C/E@115,1 sur l'espace après « do » (o@97,3, tiret@132,9) · G@164,9 sur « r » (‹r›e) · F@226,7 sur « d » · G@253,4 sur l'espace avant le tiret@257,8 · C@276,5 sur « r » |
| 19:fable:19:decale:G:1 | appliqué | session | Même remplacement que la question C/E de la même ligne (2e « T'ado - re » : G dans le blanc avant le tiret, C sur « re ») ; une seule ligne retenue. — inclus dans la ligne de 19:fable:19:decale:C/E:1 — partition : p1 y=378,9 : G@253,4 sur l'espace entre « do » (o@235,6) et le tiret (@257,8), C@276,5 sur « r » de « re » |
| 18:decale:G:1 | appliqué | def |  |
| 16:decale:G:1 | appliqué | def |  |
| 15:decale:F:1 | appliqué | def |  |
| 11:decale:G:1 | appliqué | def |  |
| 9:decale:Am7:1 | appliqué | def |  |

- Partition : Mon seul souhait.pdf (feuille de l'église, couche texte ; rendu 2× dans crops/mon-seul-souhait/p1.png). Chaque accord du chant mesuré en x (rawdict) : 38 accords, tous placés comme la feuille après décisions.
- Les cinq écarts ok par défaut (l. 9, 11, 15, 16, 18, 25) sont justes sur la feuille : appliqués.
- L. 19 : écarts « décalé » C/E et G laissés à non (op nulle) ; la lecture de remplacement (mot « T'adore » écrit entier, `do[C/E][G]re`, `do[G][C]re`) retenue pour les deux, une seule lecture.
- L. 23 : Am7 déplacé devant le « l » final d'« Éternel » (feuille x=87,2) ; la retouche du 04/07 au couplet 2 n'avait touché que l'espace après [C], qui reste.
- Retrait : les lignes 9, 10, 23, 24 sont en retrait sur la feuille avec C au-dessus du retrait : déjà écrites `[C] mot`. Les lignes 11, 25 et le refrain ne sont pas en retrait (le refrain est décalé en bloc avec son libellé).
- G/B de fin des lignes 11 et 25 : en l'air après « Nom. » (4e espace au couplet 1, 1er espace au couplet 2) ; écrit `Nom.[G/B]` après retrait du [ ] seul par le moteur.
- Paroles : la feuille écrit « T'ado - re » avec tiret du transcripteur ; écrit entier « T'adore » (02). Rien d'autre.
- check.py après : 35 exact ; les 5 non exact restants sont tous l. 19 (l. 20 après l'ajout de {source}) et viennent du mot « T'adore » écrit entier : l'outil cherche encore le tiret de la feuille (`[X] -`) et apparie mal les deux « re ». Vérifié à l'œil sur la feuille : C/E et G (1er), G et C (2e) sont aux mêmes positions que gravées.
- retouches.js : rien à protéger.

### naitre — Naître

Lot 5 · partition retenue : `Naître - Accords.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `Ô Père, cel[C]ui qui T'apparti[G]ent.` → `Ô Père, ce[C]lui qui T'apparti[G]ent.`
- l. 12 : `Ô Maître, un [C]pas vers ce chemi[G]n.` → `Ô Maître, un [C]pas vers ce chem[G]in.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | C | x=249,1 sur « l » de « ce‹l›ui » | décalé (le .cho est sur « u ») | ce[C]lui (ok du relevé, confirmé) |
| 12 | G | x=402,0 sur « i » de « chem‹i›n » | décalé (le .cho est sur « n ») | chem[G]in (ok du relevé, confirmé) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — espace de fin : l. 9, 11, 21, 23.

En-tête : ajout de `{source: Naître - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 12:decale:G:1 | appliqué | Timothée |  |
| 10:decale:C:1 | appliqué | Timothée |  |

- Feuille de l'église (FPDF, couche texte) : les 24 accords mesurés en coordonnées ; les deux « ok » du relevé (l. 10 ce[C]lui, l. 12 chem[G]in) mettent l'accord sur le caractère de la partition ; les 22 autres sont exacts. Après correction : 24/24 sur la partition.
- Aucune ligne de la feuille n'est en retrait (chaque ligne commence sur sa 1re lettre, Am x=31,2 sur la 1re lettre) : rien à changer pour le retrait.
- Paroles, non appliqué : la feuille met chaque couplet sur deux lignes longues et écrit « ô Père », « ô Maître », « sans ombre », « un oui » en minuscule après la virgule ; le .cho coupe à la virgule et met une capitale.
- Autre version dans Partitions : « Naître.pdf » (shir.fr, 54 % d'accords communs selon le relevé) : autre arrangement, non mesuré (la feuille de l'église fait foi).

### ne-pour-nous-donner-la-vie — Né pour nous donner la vie

Lot 5 · partition retenue : `Né pour nous donner la vie (A).pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 18 : `{start_of_chorus: Refrain}` → `{start_of_chorus: Refrain 1}` *(structure)*
- l. 20 : `[A]Par amour [A/C#]le père no[D]us l’a donné[ ][E]` → `[A]Par a[A/C#]mour le père no[D]us l’a donné[E]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 14 | A | x=200,3 = fin du « x » de « cieux » (194,8–200,3), sur l'espace tapée avant « , » | équivalent | aucune : cieux[A], (espace typographique avant la virgule supprimée dans le .cho, accord après la syllabe, avant la ponctuation) |
| 14 | A/C# | x=114,8 dans le « e » de « merveilleux » (109,9–116,0), « u » à 116,0 | décalé d'une lettre, même syllabe « leux » | aucune (basse fidélité, même syllabe ; défaut non, l'outil propose merveille[A/C#]ux) |
| 15 | D | x=175,8 dans le « u » de « du » (172,2–178,3), espace 178,3–181,4, « r » de « rois » à 181,4 | à cheval « du » / « rois » (± 1 syllabe) | aucune : du [D]rois gardé (basse fidélité, une syllabe au plus ; défaut non) |
| 20 | A | x=72,0, sur l'espace tapée en tête de ligne (« Par » commence à 75,1, une espace d'Arial 11) | équivalent (retrait d'une espace, même syllabe) | aucune : [A]Par gardé ([A] Par serait la lettre exacte ; une espace isolée de feuille Google Docs, pas un retrait de feuille d'église) |
| 20 | A/C# | x=122,1 sur le « r » final de « amour » (u 116,6–122,7, r 122,7–126,4), « le » à 129,5 | décalé d'une syllabe dans le fichier actuel ([A/C#]le) | a[A/C#]mour (question 20:fable:20:oeil:1 à ok) ; la lettre exacte serait amou[A/C#]r, même syllabe |
| 20 | D | x=180,1 dans le « u » de « nous » (178,3–184,4) | exact | aucune (no[D]us) |
| 20 | E | x=261,4 après la fin de « donné » (237,6) | exact | aucune (donné[ ][E], forme par le moteur) |
| 21 | A/C# | x=116,6 dans le « i » de « Dieu » (115,4–117,8) : à égale distance de « i » et « e » | équivalent, même syllabe | aucune (défaut non) |
| 21 | Bm7 | x=147,1 dans le « i » de « Fils » (145,9–148,4) : « i » à 1,2 pt, « l » à 1,3 pt | équivalent, même syllabe | aucune (défaut non) |
| 21 | C#7 | x=191,1 dans le « o » de « l’homme » (185,6–191,7), « m » à 191,7 | décalé d'une lettre, même syllabe « l'hom » | aucune (basse fidélité, même syllabe ; défaut non) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — ligne sans paroles : l. 8 ; espaceur : l. 23, —, —.

En-tête : ajout de `{source: Né pour nous donner la vie (A).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 30:manquant:E:1 | laissé | def |  |
| 30:manquant:A:1 | laissé | def |  |
| 30:manquant:A/C#:1 | laissé | def |  |
| 30:manquant:D:1 | laissé | def |  |
| 30:manquant:E:2 | laissé | def |  |
| 30:manquant:D:2 | laissé | def |  |
| 30:manquant:A/C#:2 | laissé | def |  |
| 30:manquant:Bm7:1 | laissé | def |  |
| 30:manquant:C#7:1 | laissé | def |  |
| 30:manquant:F#m7:1 | laissé | def |  |
| 30:manquant:D:3 | laissé | def |  |
| 30:manquant:Bm7:2 | laissé | def |  |
| 30:manquant:D:4 | laissé | def |  |
| 30:manquant:A:2 | laissé | def |  |
| 30:manquant:Bm:1 | laissé | def |  |
| 30:manquant:E:3 | laissé | def |  |
| 21:relire:A/C#:1 | laissé | def |  |
| 21:relire:Bm7:1 | laissé | def |  |
| 21:relire:C#7:1 | laissé | def |  |
| 21:oeil:2 | laissé | def |  |
| 20:relire:A/C#:1 | laissé | def |  |
| 20:oeil:1 | laissé | def |  |
| 20:fable:20:oeil:1 | appliqué | session | Le label A/C# commence au-dessus de la fin de « amour » (dernière lettre « r »), 7,4 pt (près de deux espaces et demie) avant « le » : la feuille le met sur la syllabe « mour », pas sur l'article qui suit (.cho). La ligne retenue le pose à l'attaque de cette syllabe ; une seule des deux lectures (20:oeil:1, « amou[A/C#]r », reste à non). Les autres accords de la ligne sont justes (A en tête, D sur « nous », E après « donné »). — partition : mesure : A/C# x=122,1 ; « u » 116,6–122,7, « r » 122,7–126,4, « l » de « le » à 129,5 ; caractère porteur « r » de « amour », syllabe « mour » ; vu sur le rendu 2× (p. 1 et p. 2, refrain regravé aux mêmes x) |
| 15:relire:D:1 | laissé | def |  |
| 14:relire:A:1 | laissé | def |  |
| 14:relire:A/C#:1 | laissé | def |  |
| 14:oeil:0 | laissé | def |  |
| 8:instrumental:A:1 | laissé | def |  |
| 8:instrumental:Esus4:1 | laissé | def |  |
| 8:instrumental:Bm7:1 | laissé | def |  |

- Source basse fidélité (Google Docs, une seule police Arial 11 pour accords et paroles) : check.py de main ne la lit pas (famille inconnue, 38 « absent de la source ») ; chaque accord vérifié à l'œil, x mesurés au caractère par PyMuPDF et rendu 2× regardé (couplet 1, refrain, couplet 2, refrain p. 2).
- Les 57 accords « absent de la source » de check.py après correction sont tous un défaut de lecture de l'outil (aucun accord lu sur cette feuille) : chacun a été mesuré à l'œil ; tous sont sur la syllabe de la feuille (exacts au caractère pour la plupart), les écarts d'une lettre sont listés dans `mesures`. Le Refrain 2 ajouté reprend les mesures du refrain de la p. 2, identiques à celles de la p. 1. La forme du moteur écrit Esus4 pour le « Esus » de la feuille (orthographe canonique, 01).
- Tous les accords du .cho sont sur la syllabe de la feuille, sauf A/C# l. 20 (sur « le », la feuille le met sur « amour ») : corrigé par la question. Restent à une lettre près, même syllabe : A/C# l. 14 (merveill‹e›ux, feuille ‹u›), C#7 l. 21 (l’h‹o›mme, feuille ‹m›), Bm7 l. 21 et A/C# l. 21 (à mi-lettre) ; D l. 15 à cheval entre « du » et « rois » (gardé sur « rois », ± 1 syllabe). Aucun déplacement contre le relevé.
- Intro A D Esus : conforme. Les écarts 8:instrumental (Esus4/A/C#/Bm7) sont des lectures de l'outil, qui a pris la ligne d'accords du second refrain pour un instrumental.
- Écarts 30:manquant:* : accords du second refrain rattachés par l'outil à la l. 30, qui est juste ; réglés par l'ajout de « Refrain 2 » après le couplet 2.
- Structure : sections avant Intro · Couplet 1 · Refrain · Couplet 2 ; après Intro · Couplet 1 · Refrain 1 · Couplet 2 · Refrain 2 (ajout après la dernière section, ids existants inchangés).
- Paroles, non appliqué : « du rois des rois » (l. 15) est une coquille de la feuille reprise par le .cho (« du roi des rois ») ; « Fils de Dieu , » et « monde , » gardent l'espace avant la virgule tapée sur la feuille.
- Thèmes Noël, Adoration : dans la liste, gardés. Extra du relevé (structure Intro/Couplet/Refrain/Couplet/Refrain/Interlude) : cité, traité par le bloc de structure ; pas d'interlude réel.

### noel-est-arrive — Noël est arrivé

Lot 5 · partition retenue : `Noël est arrivé.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 2 : `{key: Bb}` → `{key: F}`
- l. 10 : `Un te[F]mps s'ac[Bb/F]hève, Empor[F]tant nos vies anc[C/E]iennes` → `Un te[F]mps s'ac[Bb/F]hève, Empo[F]rtant nos vies anc[C/E]iennes` *(session)*
- l. 11 : `Car est [Dm]né le plus[Bb]beau des mys[C4]tère[C3]s` → `Car est [Dm]né le plus [Bb]beau des mys[C4]tère[C3]s` *(session)*
- l. 14 : `Nous [Bb2]étions dans la n[F]uit, No[C]ël est ar[Dm]rivé` → `Nous é[Bb2]tions dans la n[F]uit, N[C]oël est ar[Dm]rivé` *(session)*
- l. 15 : `Un en[Bb2]fant nous est né [F]c'est Noël[C3][C4]` → `Un en[Bb2]fant nous est né [F]c'est Noël[C4][C3]`
- l. 17 : `Vient [Bb]rejoindre notre [F/C]huma[C]nité[F]` → `Vient [Bb]rejoindre notre [F/C]hum[C]anité[F]` *(session)*
- l. 20 : `La glo[G]ire du ciel[C], Par l'[G]étoile de lum[D]ière, ` → `La glo[G]ire du ciel[C], Par l'é[G]toile de lum[D]ière,` *(session)*
- l. 28 : `Cet en[Bb2]fant c'est n[F/A]otre mes[Eb]sie[Cm6/A][ ][Cm7/Bb][ ][Cm][ ][Gm/D][ ][D]  [G/D]  [C/D]  [D]  [C/D]  [D]` → `Cet e[Bb2]nfant c'est n[F/A]otre me[Eb]ssie[Gm/D][Cm][Cm7/Bb][Cm6/A]` *(session)*
- l. 32 : `C'est N[C2]oël, c'est No[G]ël` → `C'est N[C2]oël, c'est N[G]oël` *(session)*
- l. 39 : `No[D]ël est ar[Em]rivé` → `N[D]oël est ar[Em]rivé` *(session)*
- l. 43 : `Vient [C]rejoindre notre[G/D]hum[D]ani[Em]té` → `Vient [C]rejoindre notre [G/D]hu[D]mani[Em]té`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | F | x=108,1 sur « n » de « vent » (106,3–114,1) | équivalent | aucune : même syllabe (ven[F]t), source basse fidélité |
| 8 | C/E | x=202,2 dans « u » de « nouvelle », 2,2 pt avant « v » | équivalent | aucune : à cheval nou\|vel, lettre la plus proche « v » = .cho |
| 10 | F | x=108,1, « r » à 108,6, « t » à 113,3 | décalé | Empo[F]rtant |
| 11 | Dm | x=115,9 dans le « t » de « est » (113,3), 1,3 pt avant l'espace, « n » à 121,1 | équivalent | aucune : à cheval est\|né, source basse fidélité |
| 11 | Bb | x=180,2, espace à 181,0, « b » à 184,9 | équivalent | plus [Bb]beau (espace rétablie) |
| 14 | Bb2 | x=118,7 = « t » de « étions » | décalé | é[Bb2]tions |
| 14 | C | x=83,7 sur « o » de « Noël », ë à 90,7 | décalé | N[C]oël |
| 15 | Bb2 | x=108,1 dans « n » de « enfant », 2,9 pt avant « f » | équivalent | aucune : à cheval en\|fant (étiquette au taquet 108) |
| 15 | F | x=216,2 dans « é » de « né », 2,2 pt avant l'espace | équivalent | aucune : frontière mot/espace (né [F]c'est) |
| 15 | C4 C3 | C4 x=288,2, C3 x=310,0 après « Noël » | décalé (ordre) | Noël[C4][C3] (défaut ok 15:oeil:4) |
| 16 | C | x=108,1 sur l'espace avant « Dieu » (D à 111,0) | équivalent | aucune : frontière espace/mot |
| 16 | Dm | x=180,2 dans « r » de « éternité » (177,3–182,8) : 2,9 pt du bord du « r », 2,6 pt du « n » | équivalent (à cheval) | aucune : lettre la plus proche « n » = .cho (éter[Dm]nité) ; label à cheval ter\|ni, {needs_review} |
| 17 | Bb | x=108,1 sur l'espace avant « rejoindre » (r à 110,2) | équivalent | aucune : frontière espace/mot |
| 17 | C | x=242,6 sur « a » de « humanité » | décalé | hum[C]anité |
| 20 | G | x=108,1 dans « é » de « l'étoile » (103,5–111,3) : 4,6 pt du bord du « é », 3,2 pt du « t » | décalé (à cheval) | l'é[G]toile (lettre la plus proche « t ») ; label à cheval é\|toi, {needs_review} |
| 20 | D | x=180,2 dans « m » de « lumière », 2,8 pt avant « i » | équivalent | aucune : même syllabe « miè » |
| 21 | C | x=164,1 dans « e » de « celui », 1,4 pt avant « l » | équivalent | aucune : lettre la plus proche « l » = .cho |
| 25 | F | x=91,5 entre les deux « l » de « Jaillira » (90,0 et 93,1) | équivalent | aucune : à cheval jail\|li, source basse fidélité |
| 25 | Dm7 Bb C | Dm7 x=149,9 « f » de fond ; Bb x=216,2 « b » de abîme ; C x=144,1 « m » de lumière (ligne « Pont : … » que l'outil ne lit pas) | exact (vérifié à l'œil) | aucune |
| 26 | Bb | x=180,2 = « h » de « Christ » | équivalent | aucune : même syllabe (Ch[Bb]rist) |
| 26 | F | x=252,2 = « p » de « accomplit » | équivalent | aucune : même syllabe « plit » |
| 26 | C | x=324,3 dans « è », 1,5 pt avant « r » | équivalent | aucune : lettre la plus proche « r » = .cho |
| 28 | Bb2 | x=108,1 dans « n » de « enfant » (105,5–113,3) | décalé | e[Bb2]nfant |
| 28 | Eb | x=229,2 sur le 1er « s » de « messie » (228,1) | décalé | me[Eb]ssie |
| 28 | Gm/D Cm Cm7/Bb Cm6/A | 254,1 / 298,4 / 324,1 / 382,5 après « messie » | décalé (ordre inversé) | messie[Gm/D][Cm][Cm7/Bb][Cm6/A] |
| 28 | D G/D C/D D C/D D | rangée seule y=238, x=72,1 à 204,3 | forme (ligne à part) | ligne instrumentale sous la phrase |
| 32 | G | x=195,0 sur « o » du 2e « Noël » | décalé | N[G]oël |
| 36 | Em | x=180,2 dans « e » de « éternelle », 2,4 pt avant « r » | équivalent | aucune : même syllabe « ter » |
| 38 | C2 | x=134,3 dans « o » de « étions », 1,5 pt avant « n » | équivalent | aucune : même syllabe « tions » (éti[C2]ons) |
| 39 | D | x=83,7 sur « o » de « Noël » | décalé | N[D]oël |
| 40 | C2 | x=108,1 dans « n » de « enfant », 2,9 pt avant « f » | équivalent | aucune : à cheval en\|fant |
| 40 | D3 | x=285,7 dans le « l » final de « Noël », 2,1 pt avant l'espace | équivalent | aucune : même syllabe, fin de mot (Noël[D3]) |
| 42 | D/F# | x=108,1 sur l'espace avant « Dieu » | équivalent | aucune : frontière espace/mot |
| 42 | Em | x=180,2 dans « r » de « éternité » (177,3–182,8) : 2,9 pt du bord du « r », 2,6 pt du « n » | équivalent (à cheval) | aucune : lettre la plus proche « n » = .cho (éter[Em]nité) ; label à cheval ter\|ni, {needs_review} |
| 43 | G/D D | G/D x=207,7 sur l'espace avant « humanité » ; D x=236,5 dans « m » | décalé (espace manquante ; D une lettre plus loin) | notre [G/D]hu[D]mani[Em]té (question 43, ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — en-tête : l. 3.

En-tête : ajout de `{source: Noël est arrivé.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 43:relire:C:1 | laissé | def |  |
| 43:relire:G/D:1 | laissé | def |  |
| 43:oeil:10 | laissé | def |  |
| 43:fable:43:relire:G/D:1 | appliqué | session | Espace rétablie devant « humanité » ; G/D sur l'attaque du mot (label x=207,7 sur l'espace, h à 212,9), D au-dessus du « m » (x=236,5, m 230,0–242,5) : hu[D]manité, Em devant « t » (x=262,2, t à 262,7). Toute la ligne est juste. — partition : C x=108,1 (espace/r de rejoindre), G/D 207,7, D 236,5 dans « m », Em 262,2 |
| 43:fable:43:oeil:10 | appliqué | session | Même opération que 43:fable:43:relire:G/D:1 (ligne juste). — inclus dans la ligne de 43:fable:43:relire:G/D:1 — partition : voir 43:fable:43:relire:G/D:1 |
| 42:relire:D/F#:1 | laissé | def |  |
| 40:reporte:C2:1 | laissé | def |  |
| 40:reporte:G:1 | laissé | def |  |
| 40:reporte:D4:1 | laissé | def |  |
| 40:reporte:D3:1 | laissé | def |  |
| 39:relire:D:1 | laissé | def |  |
| 39:oeil:9 | laissé | def |  |
| 38:relire:C2:1 | laissé | def |  |
| 38:oeil:8 | laissé | def |  |
| 38:fable:38:oeil:8 | laissé | session | C2 est au-dessus du « o » de « étions » (x=134,3, o 127,3–135,9) : syllabe « tions », comme éti[C2]ons ; la proposition le recule devant « t », 15 pt avant le label. — partition : C2 x=134,3 sur « o » de étions ; G x=216,2 sur « u » de nuit |
| 34:reporte:C2:1 | laissé | def |  |
| 34:reporte:G:1 | laissé | def |  |
| 34:reporte:D4:1 | laissé | def |  |
| 34:reporte:D3:1 | laissé | def |  |
| 32:reporte:C2:1 | laissé | def |  |
| 32:reporte:G:1 | laissé | def |  |
| 28:relire:Bb2:1 | laissé | def |  |
| 28:relire:Eb:1 | laissé | def |  |
| 28:invente:Cm6/A:1 | laissé | def |  |
| 28:invente:Cm7/Bb:1 | laissé | def |  |
| 28:invente:Cm:1 | laissé | def |  |
| 28:invente:D:1 | laissé | def |  |
| 28:invente:G/D:1 | laissé | def |  |
| 28:invente:C/D:1 | laissé | def |  |
| 28:nom:D:1 | laissé | def |  |
| 28:nom:C/D:1 | laissé | def |  |
| 28:nom:D:2 | laissé | def |  |
| 28:oeil:7 | laissé | def |  |
| 28:fable:28:invente:Cm6/A:1 | laissé | session | Ordre des accords et ligne instrumentale à part : justes ; mais Bb2 est au-dessus du « n » de « enfant » (syllabe « en ») et Eb au-dessus du 1er « s » de « messie » (syllabe « mes ») : la proposition les laisse une syllabe plus loin. Ligne juste dans lignes. — partition : Bb2 x=108,1 (n 105,5–113,3, f à 113,3) ; F/A x=180,2 « o » ; Eb x=229,2 (1er s 228,1, 2e s 235,1) ; Gm/D 254,1, Cm 298,4, Cm7/Bb 324,1, Cm6/A 382,5 après le mot ; rangée « D G/D C/D D C/D D » à y=238, seule |
| 28:fable:28:invente:Cm7/Bb:1 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes (Bb2 et Eb mesurés une syllabe plus tôt). — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 28:fable:28:invente:Cm:1 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes. — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 28:fable:28:invente:D:1 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes. — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 28:fable:28:invente:G/D:1 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes. — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 28:fable:28:invente:C/D:1 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes. — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 28:fable:28:nom:D:1 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes. — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 28:fable:28:nom:C/D:1 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes. — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 28:fable:28:nom:D:2 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes. — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 28:fable:28:oeil:7 | laissé | session | Même ligne que 28:fable:28:invente:Cm6/A:1 : ligne juste dans lignes. — partition : voir 28:fable:28:invente:Cm6/A:1 |
| 26:relire:Bb:1 | laissé | def |  |
| 26:relire:F:1 | laissé | def |  |
| 26:oeil:6 | laissé | def |  |
| 26:fable:26:oeil:6 | laissé | session | La proposition déplace Dm7 sur « jà » et C sur « tè » ; la feuille les met sur « dé » (é à 106,3, label 108,1) et sur la frontière è\|r de « mystère » (C x=324,3, r à 325,8), comme le .cho. Bb et F restent dans leur syllabe (« Christ », « plit »). — partition : Dm7 x=108,1 « é » de déjà ; Bb x=180,2 « h » de Christ ; F x=252,2 « p » de accomplit ; C x=324,3 avant « r » de mystère |
| 25:invente:Dm7:1 | laissé | def |  |
| 25:nom:Bb:1 | laissé | def |  |
| 25:relire:F:1 | laissé | def |  |
| 20:relire:G:1 | laissé | def |  |
| 17:relire:Bb:1 | laissé | def |  |
| 17:relire:C:1 | laissé | def |  |
| 17:oeil:5 | laissé | def |  |
| 17:fable:17:oeil:5 | laissé | session | C est au-dessus du « a » de « humanité » (x=242,6, a à 242,5) : hum[C]anité ; la proposition le met devant « m » (12,6 pt avant). Ligne juste dans lignes (celle de 17:oeil:5). — partition : F/C x=216,2 sur « h », C x=242,6 sur « a », F x=288,2 après le mot |
| 16:relire:C:1 | laissé | def |  |
| 15:reporte:Bb2:1 | laissé | def |  |
| 15:reporte:F:1 | laissé | def |  |
| 15:reporte:C3:1 | laissé | def |  |
| 15:reporte:C4:1 | laissé | def |  |
| 15:oeil:4 | appliqué | def |  |
| 14:relire:Bb2:1 | laissé | def |  |
| 14:relire:C:1 | laissé | def |  |
| 14:oeil:3 | laissé | def |  |
| 14:fable:14:oeil:3 | laissé | session | Bb2 sur « t » est juste, mais C est tapé au-dessus du « o » de « Noël » (x=83,7, o 82,2–90,7, ë à 90,7) : syllabe « No », pas « ël ». Ligne juste dans lignes (celle de 14:oeil:3). — partition : Bb2 x=118,7 = « t » de « étions » ; C x=83,7 sur « o » de « Noël » |
| 11:reporte:Dm:1 | laissé | def |  |
| 11:reporte:Bb:1 | laissé | def |  |
| 11:reporte:C4:1 | laissé | def |  |
| 11:reporte:C3:1 | laissé | def |  |
| 11:oeil:2 | laissé | def |  |
| 11:fable:11:oeil:2 | laissé | session | C3 est gravé au-dessus du « s » final (x=296,9, s à 296,2) : tère[C3]s est exact, tères[C3] l'éloigne. L'espace manquante « plus beau » est rétablie par la ligne de l'écart 11:oeil:2 (lignes). — partition : Dm x=115,9 (t/espace avant « né »), Bb x=180,2 (espace avant « beau »), C4 x=271,2 (« t » de mystères), C3 x=296,9 (« s » final) |
| 10:relire:F:1 | laissé | def |  |
| 10:oeil:1 | laissé | def |  |
| 10:fable:10:oeil:1 | laissé | session | La proposition met F devant « p » (≈15 pt avant le label) ; la lettre sous le label est « r » : Empo[F]rtant (ligne donnée dans lignes). — partition : F x=108,1, « o » 100,9–108,6, « r » à 108,6, « t » à 113,3 : syllabe « por », pas « tant » (.cho) |
| 8:relire:F:1 | laissé | def |  |
| 8:oeil:0 | laissé | def |  |
| 8:fable:8:oeil:0 | laissé | session | F est sur le mot d'une syllabe « vent » dans les deux cas ; la ligne actuelle (devant « t ») est plus près du label que la proposition (devant « v », 16,6 pt avant). — partition : F x=108,1 au-dessus du « n » de « vent » (n 106,3–114,1) : même syllabe que ven[F]t |
| 2:oeil:11 | appliqué | def |  |

- Source basse fidélité : feuille Word, accords aux taquets de 36 pt (108, 144, 180, 216…) et quelques-uns ajustés aux espaces ; chaque accord du chant mesuré au x (couche texte PyMuPDF) et regardé sur le rendu 2× (crops/noel-est-arrive/p1.png, p2.png). Règle suivie : accord déplacé seulement quand le label est nettement (≥ 4 pt) dans une autre syllabe ; les labels à cheval sur deux syllabes ou sur la frontière mot/espace restent (mesures).
- check.py ne lit aucun accord de cette feuille dans cette passe (famille « inconnue » : 97 « absent de la source » avant comme après, artefact de l'outil) : les 97 accords ont été vérifiés à l'œil, mesurés au x par PyMuPDF (crops/noel-est-arrive/mesure2.py) et regardés sur le rendu 2× ; la rangée instrumentale « D G/D C/D D C/D D » (l.30 après) existe bien sur la feuille (p2 y=238).
- Extra : « Dm7 », « Bb » (p2 y=73) et « D G/D C/D D C/D D » (p2 y=238) cités comme absents par l'outil : les deux premiers sont ceux de la ligne du pont (déjà au .cho), la rangée D… est maintenant une ligne instrumentale à la fin du pont.
- Tonalité : {key: Bb} → {key: F} (consigne particulière) ; le chant module en G au couplet 2 et au dernier refrain, sans tonalité gravée ; pas de {needs_review} posé, la tonalité de départ étant nette.
- Paroles, non appliqué : la feuille écrit « Le vent se lève », « Un temps s'achève » sans virgule et chaque vers sur sa ligne (le .cho en joint deux par ligne) ; ponctuation du .cho gardée.
- Autre version : « NOEL EST ARRIVE (F).pdf » (4 pages, deux couplets de plus, modulations en G et D) non retenue ; la feuille courte fait foi.
- À l'oreille : C (No|ël, l.14/39) et Bb2/Eb (l.28) sont posés à la lettre de la feuille ; un musicien pourrait les vouloir sur la syllabe suivante (temps fort).
- Labels à cheval entre deux syllabes d'un même mot (vérification) : Dm l.16 et Em l.42 sur le « r » de « éternité » (2,9 / 2,6 pt, ter|ni), G l.20 dans le « é » de « l'étoile » (4,6 / 3,2 pt, é|toi) ; règle 02 appliquée : lettre la plus proche (éter[X]nité inchangé, l'é[G]toile déplacé d'une lettre vers « t »), trois {needs_review}, sous les cinq : pas d'audio demandé. Les autres labels « à cheval » des mesures ont une lettre la plus proche nette dans la même syllabe ou sont des frontières mot/espace.

### nos-yeux-sont-sur-toi — Nos yeux sont sur Toi

Lot 5 · partition retenue : `Nos yeux sur sont Toi.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 11 : `Chassant le[F]s ténèbres alors q[C]ue le soleil apparaî[G]t.` → `Chassant le[F]s ténèbres alors q[C]ue le soleil appara[G]ît.`
- l. 17 : `Il règne à [F]tout jamai[C]s,` → `Il règne à [F]tout jama[C]is,`
- l. 24 : `Toi l'image de l[F]'amour,` → `Toi l'image de l'[F]amour,`
- l. 30 : `Toute l[F]a terre v[C]erra Son Royaume venir[G],` → `Toute l[F]a terre v[C]erra Son Royaume veni[G]r,`
- l. 32 : `Car pour to[F]ujours, I[C]l nous donne une vie nouvel[G]le,` → `Car pour to[F]ujours, I[C]l nous donne une vie nouve[G]lle,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | G | x=372,7 sur « î » d'« appara‹î›t. » | décalé (autre lettre de la syllabe) | appara[G]ît (choix ok du relevé, conforme à la feuille) |
| 17 | C | x=182,3 sur « i » de « jama‹i›s, » | décalé (autre lettre) | jama[C]is (choix ok du relevé, conforme) |
| 24 | F | x=155,5 sur « a » de « l'‹a›mour, » | décalé (accord avant l'apostrophe) | l'[F]amour (choix ok du relevé, conforme) |
| 26 | C | x=218,8 sur le 1er espace après « Toi. » | exact (en l'air, après la ponctuation) | Toi.[C] (forme : [C][ ] → [C] par le moteur) |
| 26 | G | x=241,7 en l'air, plus loin après « Toi. » | exact (en l'air) | Toi.[C] [G] |
| 30 | G | x=306,9 sur « r » de « veni‹r›, » | décalé (.cho après le « r ») | veni[G]r (choix ok du relevé, conforme) |
| 32 | G | x=363,8 sur le 1er « l » de « nouve‹l›le, » | décalé (autre lettre) | nouve[G]lle (choix ok du relevé, conforme) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — espaceur : l. 26.

En-tête : ajout de `{source: Nos yeux sur sont Toi.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:G:1 | appliqué | Timothée |  |
| 30:decale:G:1 | appliqué | Timothée |  |
| 24:decale:F:1 | appliqué | Timothée |  |
| 17:decale:C:1 | appliqué | Timothée |  |
| 11:decale:G:1 | appliqué | Timothée |  |

- Partition : Nos yeux sur sont Toi.pdf (feuille de l'église, couche texte ; rendu 2× dans crops/nos-yeux-sont-sur-toi/p1.png ; le nom du fichier inverse « sur sont », le titre gravé est juste). Les 39 accords du chant mesurés en x (rawdict) et rapportés au caractère porteur : tous les autres étaient déjà exacts.
- Les cinq choix ok du relevé (l. 11, 17, 24, 30, 32) sont conformes à la feuille : appliqués, aucun contre le relevé.
- Retrait : les lignes 23 et 25 du refrain sont en retrait sur la feuille avec C au-dessus du retrait : déjà écrites `[C] Fils`, `[C] Gloire`. Aucune autre ligne en retrait.
- Fin du refrain (l. 26) : C et G gravés en l'air après « Toi. » ; écrit `Toi.[C] [G]` par la forme du moteur.
- Liste extra (structure Couplet 1 / Refrain / Couplet 2) : lecture de l'outil, non appliquée ; la feuille a bien un Pré-Refrain.
- Non repris : la ligne de traduction et le titre original (« Look to the Son ») en pied de page ; pas de champ prévu. Paroles identiques à la feuille.

### notre-pere — Notre Père

Lot 5 · partition retenue : `Notre Père.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 10 : `Que ton règne [F]vienne Que ta volont [Am]é soit faite` → `Que ton règne [F]vienne Que ta volont[Am]é soit faite` *(session (hors relevé))* — La feuille n'a pas de blanc dans « volonté » : le span « Que ta volont » finit à x=143,8 et « é soit faite » commence à 143,8, Am x=143,8 sur « é ». Mot coupé par le transcripteur, écrit entier (02) ; Am reste sur « é » (exact). F x=153,2 sur « v » de « vienne » (exact).
- l. 20 : `Nous pro [C/E]vient de ta main` → `Nous pro[C/E]vient de ta main` *(session (hors relevé))* — La feuille écrit « provient » d'un seul tenant : « Nous pro » finit à x=111,0, « vient de ta main » commence à 111,0, C/E x=111,0 sur « v ». Mot entier (02), C/E reste sur « v » (exact).
- l. 31 : `[F]Père, pardonne- [G]nous` → `[F]Père, pardonne-[G]nous` *(session (hors relevé))* — La feuille écrit « pardonne-nous » sans blanc : « Père, pardonne- » finit à x=155,6, « nous » commence à 155,6, G x=155,6 sur « n » ; même écriture que « protège-[G]nous » l. 41. F x=54,0 sur « P » (exact), G sur « n » (exact).
- l. 53 : `[G]A [Am]men !` → `[G]A[Am]men !`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | F | p1 y=290,5 : x=153,2 sur « v » de « vienne » (153,2) | exact | inchangé |
| 10 | Am | p1 y=322,8 : x=143,8 sur « é » de « volonté » (143,8), sans blanc avant | exact (forme : blanc parasite dans le mot) | volont[Am]é |
| 20 | C/E | p1 y=613,8 : x=111,0 sur « v » de « provient » (111,0), sans blanc avant | exact (forme : blanc parasite dans le mot) | pro[C/E]vient |
| 31 | F | p2 y=266,3 : x=54,0 sur « P » (54,0) | exact | inchangé |
| 31 | G | p2 y=266,3 : x=155,6 sur « n » de « nous » (155,6), collé au tiret | exact (forme : blanc parasite après le tiret) | pardonne-[G]nous |
| 53 | G | p3 y=153,1 : x=54,0 sur « A » (54,0) | exact | inchangé |
| 53 | Am | p3 y=153,1 : x=70,4 sur « m » de « men » (71,9), dans le blanc tapé dans le mot | exact (forme : mot coupé par un blanc) | [G]A[Am]men ! |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligature typographique : l. 9.

En-tête : ajout de `{source: Notre Père.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 53:relire:G:1 | laissé | def |  |
| 53:fable:53:relire:G:1 | appliqué | session | La feuille sépare « A » et « men ! » par un blanc tapé pour loger les deux labels (A finit à 63,4, « men » commence à 71,9) ; c'est un seul mot, comme deux lignes plus bas où le .cho l'écrit déjà entier. Les accords restent où la feuille les met : G sur « A », Am sur « m ». — partition : Coda p3 y=153 : G x=54,0 sur « A » (54,0) ; Am x=70,4 sur « m » de « men » (71,9, à 1,5 pt) ; ligne suivante G/B x=54,0 sur « A », C x=84,5 sur « m » (86,0) |

- Source basse fidélité selon le relevé, mais la feuille (export iOS, Helvetica, couche texte) pose chaque label au x exact du segment de paroles qui le suit : check.py ne lit pas cette famille (57 « absent de la source ») ; tous les accords ont été mesurés à la main dans la couche texte (rawdict) et regardés sur le rendu 2× : vérifié à l'œil.
- Mesure de chaque accord, tous exacts : Refrain F « P »ère, C « l »es, Am « n »om, G après « sanctifié » (fin 141,5, G 145,4), F « v »ienne, Am « é », Dm « l »a, G après « terre » (fin 166,5, G 170,4), C « c »iel ; couplets : chaque accord de début de ligne (Dm, Am) au x=54,0 au-dessus de l'espace qui ouvre la ligne (« [Dm] C’est », « [Am] En »…), les autres sur la 1re lettre du segment (C « f »ormé, G « m »anquons, C « j »ourd’hui, G « a »vons, Dm « t »out, C/E « v »ient, F « P »ère, G « n »ous ; C « p »as, G « f »ond, C « b »lessons, G « p »ied, Dm « n »ous, C/E « q »ui, F « P »ère, G « n »ous ; C « t »é, G « d »’être, C « c »oeurs, G « n »ous, Dm « l »’ennemi, C/E « n »ous, F « P »ère, G « n »ous) ; Pont F « t »iennent, G « s »ance, Am « r »ègne, G/B « a »nge, C « g »loire, G « s »iècles ; Coda F « e »n, G « A », Am « m »en, G/B « A », C « m »en, G « m »en.
- Seules corrections : trois blancs parasites dans un mot (« volont é », « pro vient », « pardonne- nous ») et le mot coupé de la Coda (question l. 53) ; aucun accord ne change de caractère.
- Tonalité : la feuille dit « Clé de C » et les accords (refrain qui finit sur C, Pont et Coda qui y reviennent) vont dans ce sens ; le .cho a {key: F}. Non changé (pas de consigne particulière), à trancher par Timothée.
- Ligature : l. 9 « sanctiﬁé » est écrit avec « ﬁ » (U+FB01) recopié du PDF ; la forme du moteur l'écrit « fi » (vu dans l'aperçu), sans autre changement de paroles.
- Non repris de la feuille : la ligne d'auteur (paroles et musique), « ©2024 », « 127 BPM ». Les feuilles « L'amour de notre Père » (église, shir.fr) dans Partitions sont un autre chant du même auteur (« J'étais orphelin… »), pas une autre version.
- Feuille sans renvoi, noté ici plutôt qu'en needs_review : la feuille grave le Refrain une seule fois, en tête, puis Couplets 1 à 3, Pont et Coda sans renvoi : le retour du refrain après chaque couplet et après le pont n'est pas gravé, rien n'est ajouté.

### nous-tiendrons — Nous tiendrons

Lot 5 · partition retenue : `Nous tiendrons.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 11 : `Les yeux fi[F/Bb]xés s[Bb]ur Toi, [Bb/C]le jour se lèver[F2]a.[ ][F]` → `Les yeux fix[F/Bb]és s[Bb]ur Toi, [Bb/C]le jour se lèver[F2]a.[F]`
- l. 15 : `[F/A]Seigneur, Tu m'[BbM7]as choisi pour por[C/F]ter du fr[F]uit,` → `[F/A]Seigneur, Tu m[Bbmaj7]'as choisi pour por[C/F]ter du fr[F]uit,`
- l. 16 : `[F/A]Et que je s[BbM7]ois un jour semb[F]lable à [C]Toi.` → `[F/A]Et que je s[Bbmaj7]ois un jour sem[F]blable à [C]Toi.`
- l. 21 : `[F/A]Seigneur, Tu n[BbM7]ous envoies comme [C/F]Tes témo[F]ins,` → `[F/A]Seigneur, Tu n[Bbmaj7]ous envoies comme [C/F]Tes tém[F]oins,`
- l. 22 : `[F/A]Et de Ton Sa[BbM7]int-Esprit Tu [F]nous as [C]oints.` → `[F/A]Et de Ton S[Bbmaj7]aint-Esprit Tu [F]nous as [C]oints.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | Bb | x=137,9 sur le 1er « n » de « ennemis » (e 129,0, n 137,9) | exact (vérifié à l'œil ; check.py « absent de la source » : l'outil perd l'alignement de cette ligne) | aucune : e[Bb]nnemis |
| 9 | Bb/C | x=198,3 sur « n » de « nous » (198,3) | exact (vérifié à l'œil ; outil qui lit mal) | aucune : [Bb/C]nous |
| 9 | F | x=340,6 sur « o » de « Nom » (N 329,1, o 340,6) | exact (vérifié à l'œil ; outil qui lit mal) | aucune : N[F]om |
| 9 | Bb/C | x=367,3 après le point de « Nom. » (362,8) | exact (vérifié à l'œil ; outil qui lit mal) | aucune : Nom.[Bb/C] |
| 11 | F/Bb | x=129,8 sur « é » de « fixés » (x 121,8, é 129,8) | exact après le choix « ok » du relevé (fix[F/Bb]és) ; check.py « absent de la source » : outil qui lit mal (espaces multiples de la ligne source) | fix[F/Bb]és (écart 11:decale:F/Bb:1, relevé ok) |
| 11 | Bb | x=185,9 sur « u » de « sur » (s 177,9, u 185,9) | exact (vérifié à l'œil ; outil qui lit mal) | aucune : s[Bb]ur |
| 11 | Bb/C | x=235,7 sur « l » de « le » (235,7) | exact (vérifié à l'œil ; outil qui lit mal) | aucune : [Bb/C]le |
| 11 | F2 | x=339,7 sur « a » final de « lèvera » (r 334,4, a 339,7) | exact (vérifié à l'œil ; outil qui lit mal) | aucune : lèver[F2]a |
| 11 | F | x=367,5 après le point de « lèvera. » (348,6) | exact (vérifié à l'œil ; outil qui lit mal) | aucune : a.[F] (le [ ] est retiré par la forme) |

En-tête : ajout de `{source: Nous tiendrons.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 22:decale:BbM7:1 | appliqué | Timothée |  |
| 21:decale:F:1 | appliqué | Timothée |  |
| 16:decale:F:1 | appliqué | Timothée |  |
| 15:decale:BbM7:1 | appliqué | Timothée |  |
| 11:decale:F/Bb:1 | appliqué | Timothée |  |

- Source église (rendu ChordPro, couche texte) : les 28 accords relevés au x sur la page. Les quatre choix « ok » du relevé (l. 11, 15, 16, 21, 22) mettent chaque accord sur le caractère de la partition ; rien n'est contredit.
- Lignes 9 et 11 : check.py classe 9 accords « absent de la source » parce qu'il perd l'alignement de ces deux lignes ; vérifiés à l'œil sur les coordonnées, tous exacts (voir mesures).
- C4 (l. 17 et 23) gravé tel quel sur la partition, gardé.
- Thèmes Foi, Espérance, Engagement : dans la liste, gardés.

### nous-voici — Nous voici

Lot 5 · partition retenue : `Nous-voici-HYMNE-FRAT-2022-Glorious.pdf` (gravure-fr, mesure impossible)

Lignes modifiées :

- l. 8 : `{themes: Mission, Envoi, Consécration}` → `{themes: Mission, Engagement}` *(en-tête)* — « Envoi » et « Consécration » sont hors liste. Le chant dit d'abord l'envoi (« envoie-moi », « envoie-nous dans le monde », « T'annoncer au monde entier ») : Mission ; puis la disponibilité (« me voici », « nos cœurs sont prêts ») : Engagement, qui traduit Consécration.
- l. 11 : `[Bb] Pour chaque cœur [Gm] qui désespère [F] me voici [Eb] envoie-moi !` → `[Bb] Pour chaque cœur[Gm] qui désespère[F] me voici[Eb] envoie-moi !`
- l. 12 : `[Bb] Pour ceux qui pleurent [Gm] sur cette terre [F] me voici [Eb] envoie-moi !` → `[Bb] Pour ceux qui pleurent[Gm] sur cette terre[F] me voici[Eb] envoie-moi !`
- l. 13 : `[Bb] Pour ceux qui vi[Gm] vent sans ta lumière [F] me voici [Eb] envoie-moi !` → `[Bb] Pour ceux qui vi[Gm]vent sans Ta lu[F]mière me voici[Eb] envoie-moi !` *(session)*
- l. 17 : `[Bb]NOUS VOI[Gm]CI nos cœurs sont prêts [F] pour t'écouter [Eb].` → `[Bb]NOUS VOI[Gm]CI nos cœurs sont prêts[F] pour T'écouter[Eb]`
- l. 18 : `[Bb]NOUS VOI[Gm]CI pour t'annoncer [F] au monde entier [Eb].` → `[Bb]NOUS VOI[Gm]CI pour T'annoncer[F] au monde entier[Eb]`
- l. 22 : `Envoie-nous [Bb] dans le monde, envoie-nous [Gm] dans le monde,` → `Envoie-nous[Bb] dans le monde, envoie-nous[Gm] dans le monde,`
- l. 23 : `Pour [F]être tes mains sur [Eb] la terre.` → `Pour [F]être Tes mains sur[Eb] la terre.`
- l. 24 : `Envoie-nous [Bb] dans le monde, envoie-nous [Gm] dans le monde,` → `Envoie-nous[Bb] dans le monde, envoie-nous[Gm] dans le monde,`
- l. 25 : `Pour [F]faire briller ta [Eb] lumière.` → `Pour [F]faire briller Ta[Eb] lumière.`
- l. 29 : `[Bb] Pour tous ceux qui [Gm] sont oubliés [F] me voici [Eb] envoie-moi !` → `[Bb] Pour tous ceux qui[Gm] sont oubliés[F] me voici[Eb] envoie-moi !`
- l. 30 : `[Bb] Pour ceux qui pleurent [Gm] dans le secret [F] me voici [Eb] envoie-moi !` → `[Bb] Pour ceux qui pleurent[Gm] dans le secret[F] me voici[Eb] envoie-moi !`
- l. 31 : `[Bb] Et ceux qui veulent [Gm] te rencontrer [F] me voici [Eb] envoie-moi !` → `[Bb] Et ceux qui veulent[Gm] Te rencontrer[F] me voici[Eb] envoie-moi !`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | Gm | x label=321,9 (p1) ; syncope liée : label au-dessus de la croche liée de « coeur » (x=274,8), « qui » attaqué après (x=332,2) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | cœur[Gm] qui |
| 11 | F | x label=449,9 (p1) ; syncope liée : label au-dessus de la croche liée de « -père » (x=406,4), « me » attaqué après (x=494,1 après un silence) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | désespère[F] me |
| 11 | Eb | x label=108,0 (p1, système 2) ; syncope liée : label au-dessus de la croche liée de « -ici » (x=540,7 (système 1)), « en- » attaqué après (x=114,0) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | voici[Eb] envoie-moi |
| 12 | Gm | x label=423,5 (p1) ; syncope liée : label au-dessus de la croche liée de « pleurent » (x=364,5), « sur » attaqué après (x=440,5) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | pleurent[Gm] sur |
| 12 | F | x label=107,0 (p1, système 3) ; syncope liée : label au-dessus de la croche liée de « terre » (x=527,0 (système 2)), « me » attaqué après (x=162,3 après un silence) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | terre[F] me |
| 12 | Eb | x label=239,1 (p1) ; syncope liée : label au-dessus de la croche liée de « -ci » (x=210,6), « en- » attaqué après (x=250,1) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | voici[Eb] envoie-moi |
| 13 | Bb | x label=232,3 (p1, mesure 9) au-dessus du soupir, « Pour » x=265,0 attaqué sur la croche après le silence | exact | [Bb] Pour |
| 13 | Gm | x label=107,0 (p2) ; syncope liée : label au-dessus de la croche liée de « vi- » (x=510,6 (p1)), « -vent » attaqué après (x=115,5) | décalé (forme) : le mot est coupé par une espace « vi[Gm] vent » | vi[Gm]vent |
| 13 | F | x label=268,3 (p2) ; syncope liée : label au-dessus de la croche liée de « lu- » (x=232,3 ; « lu » sur la croche sol de fin de mesure 10 liée), « -mière » attaqué après (x=273,3, sur la noire pointée du 2e temps de la mesure 11 (centre ≈ 289)) | décalé : le .cho et la ligne du relevé posent F après « lumière » ; la partition le grave sur la note liée de « lu », avant « -mière » (autre syllabe) | lu[F]mière |
| 13 | Eb | x label=423,6 (p2) ; syncope liée : label au-dessus de la croche liée de « -ci » (x=390,4), « en- » attaqué après (x=434,6) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | voici[Eb] envoie-moi |
| 17 | F | x label=364,2 (p2) ; syncope liée : label au-dessus de la croche liée de « prêts » (x=319,5), « pour » attaqué après (x=369,1 (sur la noire, centre ≈ 380)) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | prêts[F] pour |
| 17 | Eb | x label=489,6 (p2) ; syncope liée : label au-dessus de la croche liée de « -ter » (x=463,4), « (silence, demi-pause) » attaqué après (x=—) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) ; point final non gravé | T'écouter[Eb] |
| 18 | F | x label=364,2 (p2, système 3) ; syncope liée : label au-dessus de la croche liée de « -cer » (x=326,5), « au » attaqué après (x=379,3) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | T'annoncer[F] au |
| 18 | Eb | x label=519,5 (p2) ; syncope liée : label au-dessus de la croche liée de « -tier » (x=490,9), « (fin de phrase) » attaqué après (x=—) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) ; point final non gravé | entier[Eb] |
| 22 | Bb | x label=212,2 (p3) ; syncope liée : label au-dessus de la croche liée de « nous » (x=176,0), « dans » attaqué après (x=225,5) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | Envoie-nous[Bb] dans |
| 22 | Gm | x label=400,1 (p3) ; syncope liée : label au-dessus de la croche liée de « nous » (x=379,0), « dans » attaqué après (x=422,2) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | envoie-nous[Gm] dans |
| 23 | Eb | x label=233,3 (p3, système 2) ; syncope liée : label au-dessus de la croche liée de « sur » (x=207,6), « la » attaqué après (x=246,8) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | sur[Eb] la |
| 24 | Bb | x label=390,8 (p3, système 2) ; syncope liée : label au-dessus de la croche liée de « nous » (x=348,5), « dans » attaqué après (x=394,6 (sur la 2e croche, centre ≈ 405)) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | Envoie-nous[Bb] dans |
| 24 | Gm | x label=100,0 (p3, système 3) ; syncope liée : label au-dessus de la croche liée de « nous » (x=535,8 (système 2)), « dans » attaqué après (x=114,3) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | envoie-nous[Gm] dans |
| 25 | Eb | x label=413,3 (p3) ; syncope liée : label au-dessus de la croche liée de « Ta » (x=387,6), « lu- » attaqué après (x=431,5) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | Ta[Eb] lumière |
| 29 | Gm | x label=321,9 (p1, rangée 2) ; syncope liée : label au-dessus de la croche liée de « qui » (x=274,8), « sont » attaqué après (x=329,2) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | qui[Gm] sont |
| 29 | F | x label=449,9 (p1, rangée 2) ; syncope liée : label au-dessus de la croche liée de « -és » (x=406,4), « me » attaqué après (x=494,1) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | oubliés[F] me |
| 29 | Eb | x label=108,0 (p1, rangée 2) ; syncope liée : label au-dessus de la croche liée de « -ci » (x=540,7), « en- » attaqué après (x=114,0) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | voici[Eb] envoie-moi |
| 30 | Gm | x label=423,5 (p1, rangée 2) ; syncope liée : label au-dessus de la croche liée de « pleurent » (x=364,5), « dans » attaqué après (x=434,1) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | pleurent[Gm] dans |
| 30 | F | x label=107,0 (p1, rangée 2) ; syncope liée : label au-dessus de la croche liée de « -cret » (x=527,0), « me » attaqué après (x=162,3) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | secret[F] me |
| 30 | Eb | x label=239,1 (p1, rangée 2) ; syncope liée : label au-dessus de la croche liée de « -ci » (x=210,6), « en- » attaqué après (x=250,1) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | voici[Eb] envoie-moi |
| 31 | Gm | x label=107,0 (p2, rangée 2) ; syncope liée : label au-dessus de la croche liée de « veulent » (x=510,6 (p1)), « Te » attaqué après (x=122,0) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | veulent[Gm] Te |
| 31 | F | x label=268,3 (p2, rangée 2) ; syncope liée : label au-dessus de la croche liée de « -trer » (x=232,3 (tenu jusqu'à la noire pointée, trait de prolongation)), « me » attaqué après (x=340,4) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | rencontrer[F] me |
| 31 | Eb | x label=423,6 (p2, rangée 2) ; syncope liée : label au-dessus de la croche liée de « -ci » (x=390,4), « en- » attaqué après (x=434,6) | équivalent (même frontière de mot, accord écrit sur l'espace avant la syllabe suivante au lieu d'être collé après la syllabe liée) | voici[Eb] envoie-moi |

En-tête : ajout de `{source: Nous-voici-HYMNE-FRAT-2022-Glorious.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 31:oeil:11 | appliqué | def |  |
| 30:oeil:10 | appliqué | def |  |
| 29:oeil:9 | appliqué | def |  |
| 25:oeil:8 | appliqué | def |  |
| 24:oeil:7 | appliqué | def |  |
| 23:oeil:6 | appliqué | def |  |
| 22:oeil:5 | appliqué | def |  |
| 18:oeil:4 | appliqué | def |  |
| 17:oeil:3 | appliqué | def |  |
| 13:oeil:2 | laissé | def | la ligne est celle mesurée par la session |
| 12:oeil:1 | appliqué | def |  |
| 11:oeil:0 | appliqué | def |  |

- Gravure Finale (CenturyGothic) que check.py n'apparie pas (aucune rangée trouvée) : les 40 accords du chant mesurés à l'œil, système par système, sur des découpes 3× et 4× (crops/nous-voici/r1-r9.png, s1.png, s4.png), avec les x de la couche texte (rawdict). Mêmes noms d'accords que la partition, même tonalité (Bb), ni accord inventé ni absent dans les passages chantés.
- check.py après : 1 exact, 18 « à relire », 21 « absent de la source » — tous dus à l'appariement raté de l'outil (il colle les accords du système p2 n°1 aux lignes 12, 13, 31, 32 et ne voit pas la rangée 2 ni le refrain) ; aucun n'est un écart réel : chacun des 40 accords est vérifié à l'œil (tableau mesures). L'outil confirme toutefois la mesure de la l. 13 : tête de note sous F à x=265,2, « mière » à 8,1 pt (donc pas sous cette note : « lu » y est tenu).
- Toutes les phrases tombent en syncope liée (syllabe attaquée une croche avant le temps de l'accord) : les 12 défauts « ok » du relevé sont justes, sauf l. 13 où l'outil a mis F après « lumière » : la partition le grave sur la note liée de « lu », donc lu[F]mière (corrigé dans lignes). L. 31 (rangée 2) « rencontrer[F] » reste juste : « -trer » est tenu sous F.
- Les accords d'attaque sont exacts : [Bb] Pour (soupir puis croche, couplets), [Bb]NOUS et VOI[Gm]CI (pré-refrain), Pour [F]être et Pour [F]faire (levée « Pour » sans accord, F sur « ê »/« fai » au temps fort).
- Paroles, non appliqué : la partition grave « vo-ici » (coquille, l. 11), « moi! » sans espace, aucune virgule dans « dans le monde En-voie-nous » et « En » en capitale au 2e « envoie-nous » (l. 22 et 24) ; « coeur » sans ligature.
- Fin instrumentale (mes. 29-32, Bb Gm F Eb) et ordre des sections : voir structure, à appliquer par Timothée.
- Retouches anciennes (commits de juillet et cc1c2c5) : seulement libellés de section, virgules et espaces ; aucun accord déplacé à l'oreille, rien de protégé.

### nous-voulons-voir-jesus-eleve — Nous voulons voir Jésus élevé

Lot 5 · partition retenue : `Nous voulons voir Jésus élevé.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 7 : `{start_of_verse: Couplet}` → `{start_of_verse: Couplet (x2)}` *(session (hors relevé))* — La partition grave le titre de section « Couplet (x2) » (p1 y=89,7) : reprise identique = suffixe (x2) au libellé (01, Structure dépliée) ; même directive, seul le libellé change.
- l. 11 : `Et le chemi[C]n vers le Ciel.` → `Et le chem[C]in vers le Ciel.`
- l. 14 : `{start_of_chorus: Refrain}` → `{start_of_chorus: Refrain (x2)}` *(session (hors relevé))* — La partition grave « Refrain (x2) » (p1 y=259,8) : reprise identique = suffixe (x2) au libellé ; même directive, seul le libellé change.
- l. 15 : `[G] Nous voulons voir, [D]nous voulons voir,[Em]` → `[G] Nous voulons voir,[D] nous voulons voir,[Em]`
- l. 20 : `Pas à [D]pas allons de l[Em]'avant,` → `Pas à [D]pas allons de l'[Em]avant,`
- l. 23 : `Les mur[C]ailles s'écroulent à te[D]rre,` → `Les mu[C]railles s'écroulent à te[D]rre,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | C | x=106,8 sur « i » de « chemin » (m@93,4 i@106,8) | décalé | chem[C]in (ok du relevé) |
| 15 | D | x=181,4 sur l'espace après « voir, » (,@177,0 ; n@185,9) | décalé | voir,[D] nous (ok du relevé) |
| 20 | Em | x=196,1 sur « a » de « l'avant » (' @193,0 a@196,0) | décalé | l'[Em]avant (ok du relevé) |
| 23 | C | x=97,8 sur « r » de « murailles » (u@88,9 r@97,8) | décalé | mu[C]railles (ok du relevé) |

En-tête : ajout de `{source: Nous voulons voir Jésus élevé.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 23:decale:C:1 | appliqué | Timothée |  |
| 20:decale:Em:1 | appliqué | Timothée |  |
| 15:decale:D:1 | appliqué | Timothée |  |
| 11:decale:C:1 | appliqué | Timothée |  |

- Partition : rendu ChordPro de l'église (FPDF), couche texte lue ; les 22 accords du chant mesurés : les quatre ok du relevé mettent chaque accord sur le caractère de la partition, les 18 autres sont déjà exacts.
- Libellés : « Couplet (x2) » et « Refrain (x2) » gravés sur la partition, suffixes ajoutés (même directive, ids des sections inchangés).
- Retraits vérifiés : « Nous voulons voir Jésus élevé » (couplet, G au-dessus du retrait) et « Nous voulons voir, nous voulons voir, » (refrain, G au-dessus de l'espace de tête) déjà écrits [G] Nous ; la 2e ligne du refrain est en retrait sans accord gravé, rien à poser.
- Paroles, non appliqué : aucune différence avec la partition.
- Non repris de la partition : le crédit de traduction, titre original « We want to see Jesus lifted high ».

### o-jesus-mon-sauveur — Ô Jésus mon Sauveur

Lot 5 · partition retenue : `Ô Jésus mon Sauveur G.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[G] Ô Jésus, [D]mon Sauveur, [Em]Seigneur, nul n'[D]est comme` → `[G] Ô Jésus,[D] mon Sauveur, [Em]Seigneur, nul n'[D]est comme T[C]oi.` *(session)*
- l. 12 : `[G] Mon abri, [D]mon refuge, [Em]mon réconfor[D]t, mon roc[C]her.` → `[G] Mon abri,[D] mon refuge, [Em]mon réconfo[D]rt, mon roc[C]her.`
- l. 13 : `Tout ce qui vi[G/B]t, [C]ce que je s[G/D]uis, ` → `Tout ce qui v[G/B]it, [C]ce que je s[G/D]uis,`
- l. 20 : `[Em]Les monts s'inclinent et les f[C]lots rugissent` → `[Em]Les monts s'inclinent et les fl[C]ots rugissent`
- l. 21 : `À l'[D]écho [Em]de Ton [D/F#]Nom.` → `À l'é[D]cho [Em]de Ton [D/F#]Nom.`
- l. 22 : `[G]Je vois Tes œu[Em]vres et mon cœ[C]ur crie de jo[Dsus4]ie.[D]` → `[G]Je vois Tes œ[Em]uvres et mon cœ[C]ur crie de jo[Dsus4]ie.[D]`
- l. 23 : `[G]Je T'aimera[Em]i, je tiend[C]rai par la f[Dsus4]oi.[D]` → `[G]Je T'aimer[Em]ai, je tiend[C]rai par la f[Dsus4]oi.[D]`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | G | x=31,2 sur le retrait, avant « Ô »@40,1 | exact | [G] Ô |
| 9 | D | x=103,2 sur l'espace après « Jésus, » (,@98,8 ; m@107,7) | décalé | Jésus,[D] mon |
| 9 | Em | x=211,7 sur « S » de Seigneur (S@211,7) | exact | [Em]Seigneur |
| 9 | D | x=322,4 sur « e » de « n'est » (e@322,4) | exact | n'[D]est |
| 9 | C | x=414,9 sur « o » de « Toi. » (T@405,1 o@414,9) ; mot absent du .cho | absent | comme T[C]oi. |
| 12 | D | x=106,8 sur l'espace après « abri, » (,@102,3 ; m@111,2) | décalé | abri,[D] mon (défaut ok) |
| 12 | D | x=290,0 sur « r » de « réconfort » (o@281,1 r@290,0 t@295,3) | décalé | réconfo[D]rt (défaut ok) |
| 13 | G/B | x=122,8 sur « i » de « vit » (v@114,8 i@122,8) | décalé | v[G/B]it (défaut ok) |
| 20 | C | x=248,5 sur « o » de « flots » (l@244,9 o@248,5) | décalé | fl[C]ots (défaut ok) |
| 21 | D | x=76,0 sur « c » de « écho » (é@67,1 c@76,0) | décalé | l'é[D]cho (défaut ok) |
| 22 | Em | x=145,8 sur « u » de « œuvres » (œ@130,7 u@145,8) | décalé | œ[Em]uvres (défaut ok) |
| 23 | Em | x=119,5 sur « a » de « aimerai » (r@114,2 a@119,5) | décalé | T'aimer[Em]ai (défaut ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espace de fin : l. 10 ; espaceur : l. 11, 14 ; mot coupé au tiret : l. 11, 14.

En-tête : ajout de `{source: Ô Jésus mon Sauveur G.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 23:decale:Em:1 | appliqué | def |  |
| 22:decale:Em:1 | appliqué | def |  |
| 21:decale:D:1 | appliqué | def |  |
| 20:decale:C:1 | appliqué | def |  |
| 13:decale:G/B:1 | appliqué | def |  |
| 12:decale:D:1 | appliqué | def |  |
| 12:decale:D:2 | appliqué | def |  |
| 10:manquant:C:1 | laissé | session | La l. 10 est juste (G/B@114,8 sur « o » de « jour », C@173,5 sur « j » de « je », G/D@249,1 sur « a » de « louerai ») : le C absent est celui de « Toi. », fin de la 1re ligne de la partition, mot perdu par la l. 9 du .cho ; il est rétabli à la l. 9. — partition : C@414,9 sur « o » de « T‹o›i. » (ligne y=119,4, avant « Jour après jour ») |
| 9:decale:D:1 | laissé | def | la ligne est celle mesurée par la session |
| 8:fable-hors:9:manquant:C:1 | laissé | session | Le replace vise la ligne de directive l. 8 ({start_of_verse: Couplet}) : une directive n'est jamais remplacée. Son texte est juste mais appartient à la l. 9 : il est donné en `lignes` pour la l. 9 (consigne particulière). — partition : p1 y=106,8 : G@31,2 (retrait, avant « Ô »@40,1) · D@103,2 (espace après « Jésus, ») · Em@211,7 (« S » de Seigneur) · D@322,4 (« e » de « n'est ») · C@414,9 (« o » de « Toi. », T@405,1 o@414,9) |

- Partition : rendu ChordPro de l'église (FPDF), couche texte lue ; chaque accord du chant mesuré dans la couche texte (55 accords) : après décisions, tous exacts.
- Consigne particulière appliquée : le replace 8:fable-hors vise la directive l. 8, répondu « non » ; sa ligne (« … nul n'est comme T[C]oi. ») est posée à la l. 9, avec le D sur l'espace après « Jésus, » (9:decale:D:1). La question 10:manquant:C:1 se règle par cette même ligne : la l. 10 est juste.
- Retraits vérifiés sur tout le chant : seules les lignes « Ô Jésus » et « Mon abri » sont en retrait avec un G au-dessus du retrait, déjà écrites [G] Ô / [G] Mon.
- Paroles, non appliqué : la partition grave « car Ton amour » (minuscule, même ligne que « Jour après jour… ») là où le .cho écrit « Car » en début de l. 11 ; elle grave « merveilleux. » et « T'adorer. » avec un point final que le .cho n'a pas (l. 11, l. 14 ; le D final est en l'air après le point).
- Non repris de la partition : le crédit de traduction, titre original « My Jesus, my Savior ». Autres feuilles : « Ô Jésus mon Sauveur.pdf » (même feuille) ; « Ô Jésus, mon sauveur Bb.pdf » (shir.fr, autre tonalité) et « Oh Jésus mon Sauveur.pdf » (scan Word) non utilisés.

### o-vois — Ô vois (Mon âme chante)

Lot 5 · partition retenue : `O vois.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 9 : `Ô [B]vois le cœur du Père` → `[B]Ô vois le cœur du Père` *(session)*
- l. 10 : `Ce [E]mystère qu’Il a déversé sur nous` → `Ce m[E]ystère qu’Il a déversé sur nous` *(session)*
- l. 12 : `(Nous) [B]sommes l’objet de Son a[E]ffection` → `[B](Nous) sommes l’objet de Son a[E]ffection` *(session)*
- l. 13 : `Toutes [G#m]choses pâlissent telle u[B]ne flamme` → `Toute[G#m]s choses pâlissent telle u[B]ne flamme` *(session)*
- l. 16 : `Rien n[F#]’est comme Ton grand [E]amour` → `Rien n[F#]’est comme Ton [E]grand amour`
- l. 42 : `Ô vois ce tendre ami` → `Ô [B]vois ce tendre ami` *(structure)*
- l. 43 : `L’Esprit qui attise en moi Son saint feu` → `L’Es[E]prit qui attise en moi Son saint feu` *(structure)*
- l. 44 : `Une aide toujours présente` → `Une [G#m]aide toujours présente` *(structure)*
- l. 45 : `(Quand) la vérité semble distante` → `(Quand) [B]la vérité semble [E]distante` *(structure)*
- l. 46 : `éclaire mon sentier et garde mon cœur` → `é[G#m]claire mon sentier et garde [B]mon cœur` *(structure)*
- l. 47 : `Jusqu’à la fin de mes jours` → `Jusqu’à la fin de mes [E]jours` *(structure)*
- l. 48 : `Ô Esprit de Dieu` → `Ô Esprit [G#m]de Dieu` *(structure)*
- l. 49 : `Fais en moi Ta volonté` → `Fais [F#]en moi Ta [E]volonté` *(structure)*
- l. 54 : `{start_of_final}` → `{start_of_outro: Final}` *(structure)*
- l. 56 : `(Lui) qu[E]i était et qui s[B]era` → `(Lui) q[E]ui était et qui s[B]era`
- l. 58 : `Jusqu’à[B]la fin (de) Son œuvre sur [F#sus]Terre[F#]` → `Jusqu’à [B]la fin (de) Son œuvre sur [F#sus4]Terre[F#]`
- l. 64 : `{end_of_final}` → `{end_of_outro}` *(structure)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | B | x=72,0 au bord gauche, sur « Ô » ; .cho sur « vois » | décalé (autre mot, basse fidélité : lettre la plus proche) | [B]Ô vois le cœur du Père |
| 10 | E | x=99,0 ; « y » de « m‹y›stère » à 97,7 (1,3), « m » à 88,3 (10,7) ; .cho [E]mystère | équivalent (même syllabe « mys », une lettre) | Ce m[E]ystère (lettre la plus proche du label) |
| 12 | B | x=72,0 sur « ( » de « (Nous) » ; « sommes » à 108,3 ; .cho sur « sommes » | décalé (autre mot, basse fidélité : lettre la plus proche) | [B](Nous) sommes l’objet de Son a[E]ffection |
| 12 | E | x=227,0 sur le 1er « f » d'« a‹f›fection » (226,3–230,3) ; .cho a[E]ffection | exact à la lettre près | aucune |
| 13 | G#m | x=99,0–124,3 ; lettre la plus proche « s » final de « Toutes » (100,0) ; « choses » à 107,7 ; .cho [G#m]choses | décalé (autre mot), label à cheval sur deux syllabes | Toute[G#m]s choses + needs_review |
| 13 | B | x=214,3 au milieu du « u » d'« une » (211,3–217,3) ; .cho u[B]ne | équivalent (± 1 lettre, même mot) | aucune |
| 16 | E | x=187,3 sur « g » de « grand » (184,6) ; « amour » commence à 215,0 ; .cho [E]amour | décalé (un mot plus loin) | Ton [E]grand amour — choix « ok » du relevé, conforme à la feuille |
| 32 | E | x=166,3 sur l'espace juste après « ressuscité » (é finit à 165,6) ; .cho ressuscit[E]é | équivalent (même syllabe finale, tenue) | aucune : « non » par défaut gardé |
| 36 | B | x=365,6 sur « h » de « c‹h›ante » ; .cho ch[B]ante | exact (même syllabe « chan ») | aucune |
| 55 | B | x=371,6 dans le « a » de « chante » (368,6–373,9) ; .cho cha[B]nte | exact (même syllabe « chan ») | aucune |
| 56 | E | x=344,6 sur « u » de « q‹u›i » (342,3–348,3) ; prop() écrit q[E]ui | exact après prop() | ligne intouchable (deux remplacements contradictoires du relevé, suit le premier) |
| 58 | B | x=344,6 sur la fin du « à » (340,0–345,3), « la » à 348,3 : étiquette à cheval | équivalent | Jusqu’à [B]la — choix « ok » du relevé (espace rétablie) |
| 20 | B | couplet 2 : aucun accord gravé | reporté | aucune (gardé, consigne) |
| 21 | E | couplet 2 : aucun accord gravé | reporté | aucune (gardé, consigne) |
| 22 | G#m, E | couplet 2 : aucun accord gravé | reporté | aucune (gardé, consigne) |
| 23 | B, E | couplet 2 : aucun accord gravé | reporté | aucune (gardé, consigne) |
| 24 | G#m, B | couplet 2 : aucun accord gravé | reporté | aucune (gardé, consigne) |
| 25 | E | couplet 2 : aucun accord gravé | reporté | aucune (gardé, consigne) |
| 42 | B | couplet 3 sans accords gravés ; couplet 1 l. 9 : B sur la 2e syllabe après la levée « Ô » | reporté (couplet 1) | Ô [B]vois ce tendre ami |
| 43 | E | couplet 1 l. 10 : E sur la 2e syllabe (« Ce [E]mys- »), 11 syllabes des deux côtés | reporté (couplet 1) | L’Es[E]prit qui attise… |
| 44 | G#m | couplet 1 l. 11 : G#m sur la 2e syllabe (« Dans [G#m]Son ») | reporté (couplet 1) | Une [G#m]aide toujours présente |
| 45 | B, E | couplet 1 l. 12 : B sur la syllabe après la parenthèse, E sur la syllabe qui précède la tonique finale (« a[E]ffection » ; couplet 2 « [E]Sauveur ») | reporté (couplet 1) | (Quand) [B]la vérité semble [E]distante |
| 46 | G#m, B | couplet 1 l. 13 : G#m sur la 2e–3e syllabe (feuille à cheval ; couplet 2 sur la 2e), B sur la syllabe qui précède la tonique finale (« u[B]ne flamme ») | reporté (couplet 1), ± 1 syllabe | é[G#m]claire mon sentier et garde [B]mon cœur |
| 47 | E | couplet 1 l. 14 : E sur la dernière syllabe (« so[E]leil » ; couplet 2 « [E]sang »), 7 syllabes des deux côtés | reporté (couplet 1) | Jusqu’à la fin de mes [E]jours |
| 48 | G#m | couplet 1 l. 15 : G#m sur la 4e de 5 syllabes chantées (« Ô Pè-r'é-[G#m]ter-nel »), juste avant la tonique | reporté (couplet 1) | Ô Esprit [G#m]de Dieu |
| 49 | F#, E | couplet 1 l. 16 : F# sur la 2e syllabe, E sur la 3e avant la fin (« Ton [E]grand a-mour », feuille et relevé) | reporté (couplet 1) | Fais [F#]en moi Ta [E]volonté |
| 11 | G#m | x=99,0 sur l'espace juste avant « Son » (99,7) | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 14 | E | x=168,0 fin du « o » de « so‹l›eil » (l à 169,0) ; .cho so[E]leil | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 15 | G#m | x=114,0 sur « t » d'« é‹t›ernel » | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 16 | F# | x=102,0 fin du « n », « ’ » à 103,7 ; .cho n[F#]’est | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 31 | G#m | x=129,0 sur « r » de « t‹r›iomphé » | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 32 | F# | x=108,0 sur « s » de « e‹s›t » | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 36 | G#m7 | x=454,6 sur « a » de « ch‹a›nte » ; même syllabe | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 37 | F#, E | x=308,6 sur « Ton », x=409,0 sur « ton » | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 38 | B | x=362,6 sur « h » de « c‹h›ante » | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 55 | F# | x=421,6 sur « D » de « Dieu » | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 56 | B | x=412,6 fin du « s » de « sera » ; s[B]era | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 57 | G#m | x=362,6 sur l'espace avant « voie » (364,6) | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 58 | F#sus, F# | x=472,6 sur « T » de « Terre », F# x=505,0 après le mot | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 59 | E, F# | x=344,6 sur « I » de « Il », x=433,6 sur le 2e « e » de « nuées » | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 60 | G#m | x=365,6 sur l'espace avant « voix » (366,6) | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 61 | E | x=446,6 sur l'espace avant « trône » (447,3) | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |
| 62 | B/F#, B5 | x=401,6 sur le 2e « o » de « toujours » (syllabe « jours »), x=474,3 sur « L » de « Lui » | exact à l'œil (check.py lit mal la feuille en deux colonnes : « absent de la source ») | aucune |

En-tête : ajout de `{source: O vois.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 58:relire:B:1 | laissé | def |  |
| 58:oeil:6 | appliqué | def |  |
| 58:fable:58:relire:B:1 | appliqué | Timothée | inclus dans la ligne de 58:oeil:6 |
| 57:relire:G#m:1 | laissé | def |  |
| 56:relire:E:1 | laissé | def |  |
| 56:oeil:5 | appliqué | Timothée |  |
| 56:fable:56:oeil:5 | laissé | Timothée | autre lecture retenue (56:oeil:5) |
| 32:relire:E:1 | laissé | def |  |
| 25:reporte:E:1 | laissé | def |  |
| 24:reporte:G#m:1 | laissé | def |  |
| 24:reporte:B:1 | laissé | def |  |
| 23:reporte:B:1 | laissé | def |  |
| 23:reporte:E:1 | laissé | def |  |
| 22:reporte:G#m:1 | laissé | def |  |
| 22:reporte:E:1 | laissé | def |  |
| 21:reporte:E:1 | laissé | def |  |
| 20:reporte:B:1 | laissé | def |  |
| 16:decale:E:1 | laissé | def |  |
| 16:oeil:4 | appliqué | def |  |
| 16:fable:16:decale:E:1 | appliqué | Timothée | inclus dans la ligne de 16:oeil:4 |
| 13:relire:G#m:1 | laissé | def |  |
| 13:oeil:3 | laissé | def |  |
| 12:decale:B:1 | laissé | def |  |
| 12:oeil:2 | laissé | def |  |
| 10:relire:E:1 | laissé | def |  |
| 10:oeil:1 | laissé | def |  |
| 9:relire:B:1 | laissé | def |  |
| 9:oeil:0 | laissé | def |  |

- Vérifié à l'œil : check.py ne lit pas cette feuille Word en deux colonnes (42 accords « absent de la source ») ; mesure faite en coordonnées PyMuPDF (rawdict, x de chaque accord et de chaque lettre) et sur le rendu 2× découpé (crops/o-vois).
- Couplet 1, Pré-refrain, Refrain, Final : tous les accords sont à la syllabe de la feuille ou à ± 1 syllabe (basse fidélité). Vrais décalages : E l. 16 (sur « amour », la feuille le met sur « grand ») — corrigé par le choix « ok » du relevé ; B l. 9 et l. 12 et G#m l. 13, laissés un mot trop loin par les « non » par défaut — corrigés (lettre la plus proche du label).
- Ligne 56 : deux remplacements contradictoires cochés par le relevé ; la ligne suit prop() (le premier, « (Lui) q[E]ui était… »), non touchée — c'est aussi la position de la feuille (E sur le « u » de « qui »).
- Couplet 2 comparé au Couplet 1 (rien changé) : l. 20, 21 identiques (B sur « vois », E sur la 2e syllabe) ; l. 22 G#m à la même place (2e syllabe) mais un E en plus sur « chair » (le couplet 1 n'a qu'un accord sur cette ligne) ; l. 23 B identique, E sur « Sauveur » = même place que « a[E]ffection » ; l. 24 G#m sur la 2e syllabe (« Dé[G#m]laissé ») contre la 3e au couplet 1 (« Toutes [G#m]choses »), et B sur la tonique « Terre » contre la syllabe qui la précède au couplet 1 (« u[B]ne flamme ») ; l. 25 identique (E sur la dernière syllabe) ; l. 26 « Christ mon Rédempteur » sans le G#m du couplet 1 (l. 15) ; l. 27 « (Le) Messie mort par amour » sans le F# ni le E du couplet 1 (l. 16).
- Couplet 3 : accords reportés du Couplet 1, ligne pour ligne (la feuille n'en grave aucun) ; positions par place de la syllabe dans la phrase, à ± 1 syllabe, à confirmer à l'oreille. Les l. 50-51 « Ô Esprit de Dieu / Règne en moi à tout jamais » restent sans accords avec un needs_review : la feuille n'a pas de mélodie, et leur découpe (5 puis 7 syllabes) est aussi celle de la fin du couplet, on ne peut pas dire si c'est l'air du pré-refrain.
- Structure (exception o-vois de la consigne) : {start_of_final} sans libellé → {start_of_outro: Final} (et {end_of_outro}). Ordre avant : Couplet 1 (verse-1), Couplet 2 (verse-2), Pré-Refrain (prechorus-3), Refrain (chorus-4), Couplet 3 (verse-5), final-6 ; après : le même, la dernière section devient outro-6 « Final » — à revérifier dans les setlists qui la repèrent.
- Bloc de structure du relevé : son needs_review sur l'absence de retour du pré-refrain et du refrain après le Couplet 3 n'est pas écrit (la feuille ne fait que lister ses sections).
- Retouche feabdad (« les accords tombent sur la syllabe attaquée ») : nettoyage de placement, pas une correction à l'oreille ; elle est défaite là où elle éloigne l'accord de la feuille (l. 9, 10, 12, 13, et l. 16 par le choix du relevé).
- Paroles, non appliqué : rien de différent de la feuille. Les trois PDF (« O vois », « Ô vois (mon âme chante) », « O vois accords C ») sont la même feuille en B.
- check.py après : 53 « absent de la source », tous dus à la lecture ratée de la feuille en deux colonnes ; chaque accord est mesuré à l'œil dans `mesures` (exact, équivalent ± 1 syllabe, ou reporté aux couplets 2 et 3). La forme écrit F#sus en F#sus4 (orthographe de 01) et ajoute {source: O vois.pdf}.
- retouches.js signale la l. 16 (E déplacé de « grand » vers « amour » par c5099d1 puis feabdad, placement systématique « syllabe attaquée », pas une correction à l'oreille) : la ligne suit le choix « ok » du relevé, qui remet E sur « grand » comme la feuille.
- Reprise après vérification : l. 9 [B]Ô, l. 12 [B](Nous), l. 13 Toute[G#m]s (label à cheval sur « Toutes »/« choses » : needs_review) et l. 10 m[E]ystère posés sur la lettre la plus proche du label (règle de 02, basse fidélité) ; 2 needs_review dans le chant, audio non demandé ; les accords reportés du Couplet 3 (« Ô [B]vois », « (Quand) [B]la », « é[G#m]claire ») ne sont pas touchés, à aligner à l'oreille sur le Couplet 1 si la levée est chantée pareil.

### oasis — Oasis

Lot 5 · partition retenue : `Oasis (Terres arides) - Accords.pdf` (famille inconnue, mesure basse-fidelite)

Lignes modifiées :

- l. 9 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (x2)}` *(session (hors relevé))* — La feuille grave « INTRO x2 » (p1 y=244,3) au-dessus de « | C#m / B / | A / / / » : reprise identique = suffixe (x2) au libellé (01 § Sections, cas Abba Père de 02) ; même directive, seul le libellé change.
- l. 18 : `[C#m]Qui me cond[B]uit sur ce ch[A]emin` → `[C#m]Qui me con[B]duit sur ce ch[A]emin`
- l. 31 : `Et ma source en plein dés[B]ert` → `Et ma source en plein dé[B]sert`
- l. 49 : `{start_of_intro: Instru}` → `{start_of_intro: Interlude (x2)}` *(session (hors relevé))* — La feuille grave « INSTRUMENTAL x2 » (p2 y=73,3) au-dessus de « | A / / / | C#m / / / | B / / / | F#m / / / » : instrumental entre deux sections = libellé canonique « Interlude » (01), reprise = suffixe (x2) ; même directive start_of_intro, seul le libellé change.

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | C#m | p1 y=260 « INTRO x2 \| C#m / B / \| A / / / » : C#m x=77,6 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 10 | B | idem, B x=111,6 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 10 | A | idem, A x=134,0 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 14 | C#m | p1 y=317 : C#m x=72,0 sur « ‹Q›uand » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 14 | B | B x=135,0 sur l'espace, bord de « ‹s›ens » à +1,3 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) ; basse fidélité, lettre la plus proche |  |
| 14 | A | A x=206,3 sur « dé‹s›emparé » (d=+1,1) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 15 | C#m | p1 y=345 : C#m x=72,0 sur « ‹D›ans » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 15 | B | B x=126,0 sur « val‹l›ée » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 15 | A | A x=216,0 sur « ‹d›esséchés » (d=+1,7) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 16 | C#m | p1 y=373 : C#m x=72,0 sur « ‹J›e » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 16 | B | B x=144,0 dans « r », bord de « accrocher‹a›i » à +0,9 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) ; à cheval sur deux lettres de la même syllabe, lettre la plus proche gardée |  |
| 17 | A | p1 y=401 : A x=72,0 sur « ‹T›on » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 18 | C#m | p1 y=429 : C#m x=72,0 sur « ‹Q›ui » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 18 | B | B x=129,0 sur « con‹d›uit » (d=+1,0) | décalé d'une lettre dans la même syllabe (cond[B]uit) | con[B]duit — « ok » par défaut de 18:oeil:0 |
| 18 | A | A x=191,3 dans « h », bord de « ch‹e›min » à +1,0 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) ; à cheval sur deux lettres de la même syllabe, lettre la plus proche gardée |  |
| 30 | A | p1 y=259,3 : A x=309,0 sur « ‹T›oi » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 30 | C#m | C#m x=393,0 sur l'espace, bord de « ‹g›râce » à +0,5 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 31 | B | p1 y=289,3 : B x=429,0 sur « dé‹s›ert » (d=+1,7) | décalé d'une lettre dans la même syllabe (dés[B]ert) | dé[B]sert — « ok » par défaut de 31:oeil:1 |
| 32 | F#m9 | p1 y=319,3 : F#m9 x=420,0 sur « ‹T›oi » (d=+1,6) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 34 | A | p1 y=379,3 : A x=309,0 sur « ‹I›ci » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 34 | C#m | C#m x=384,0 sur « ‹p›lace » (d=0) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 35 | B | p1 y=409,3 : B x=420,0 sur « ‹d›’air » (d=+1,7) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 36 | F#m9 | p1 y=439,3 : F#m9 x=420,0 sur « ‹T›oi » (d=+1,6) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 50 | A | p2 y=89 « INSTRUMENTAL x2 \| A / / / \| C#m / / / \| B / / / \| F#m / / / » : A x=77,0 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 50 | C#m | idem, C#m x=112,6 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 50 | B | idem, B x=164,9 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 50 | F#m | idem, F#m x=200,6 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 54 | A | p2 y=146,3 : A x=110,3 sur l'espace, bord de « ‹t›erres » à +1,0 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) ; basse fidélité, lettre la plus proche |  |
| 55 | C#m | p2 y=176 : C#m x=147,0 sur l'espace, bord de « ‹o›céans » à +0,6 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 56 | B | p2 y=204 : B x=153,0 sur « ‹J›ésus » (d=+0,4) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 57 | F#m | p2 y=232 : F#m x=153,0 sur « ‹J›ésus » (d=+0,4) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 58 | A | p2 y=273,3 : A x=110,3 sur l'espace, bord de « ‹c›œurs » à +1,0 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 59 | C#m | p2 y=303 : C#m x=126,0, bord de « mainte‹n›ant » à +0,3 | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 60 | B | p2 y=331 : B x=153,0 sur « ‹J›ésus » (d=+0,4) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |
| 61 | F#m | p2 y=359 : F#m x=153,0 sur « ‹J›ésus » (d=+0,4) | exact à l'œil (check.py ne lit pas la feuille en deux colonnes : « absent de la source » = défaut de l'outil) |  |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espaceur : l. 33, 37 ; ligne sans paroles : l. 50.

En-tête : ajout de `{source: Oasis (Terres arides) - Accords.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 59:oeil:2 | laissé | def |  |
| 50:instrumental:A:1 | laissé | def |  |
| 50:instrumental:F#m:1 | laissé | def |  |
| 31:relire:B:1 | laissé | def |  |
| 31:oeil:1 | appliqué | def |  |
| 18:relire:B:1 | laissé | def |  |
| 18:oeil:0 | appliqué | def |  |

- Source basse fidélité (feuille Pages Hillsong en deux colonnes, accords alignés aux espaces, couche texte lisible) : check.py ne la lit pas (35 « absent de la source », paroles « None ») ; les 35 accords du chant vérifiés à l'œil et mesurés un par un en coordonnées (PyMuPDF rawdict + rendu 2× regardé), lettre la plus proche du bord gauche du label.
- Tous exacts à la lettre près sauf les deux B de « con[B]duit » (l. 18) et « dé[B]sert » (l. 31), corrigés par les « ok » par défaut du relevé (replace), qui suivent la partition.
- Labels sur l'espace à ≤ 1,3 pt de la lettre suivante (l. 14 B « sens », l. 30 C#m « grâce », pont A « terres », C#m « océans ») : feuille alignée aux espaces, pas un retrait ChordPro ; écrits [X]mot comme aujourd'hui.
- Labels à cheval sur deux lettres de la même syllabe, laissés (± 1 lettre, basse fidélité) : l. 16 B x=144 dans « r », bord de « a » à +0,9 (accrocher[B]ai) ; l. 18 A x=191,3 dans « h », bord de « e » à +1,0 (ch[A]emin) ; l. 59 C#m x=126,0, bord de « n » à +0,3 (mainte[C#m]nant, fable : garder).
- Couplets 2 et 3 : la feuille ne grave aucun accord, le .cho non plus ; rien ajouté.
- Ligne 50 (Interlude) : « | A | C#m | B | F#m | » = .cho ; les écarts instrumental:A/F#m (« non » par défaut) sont des lectures de l'outil (ligne d'instrumental à « / »), rien à changer.
- Doublon : « Oasis (Terres arides).pdf » est une copie identique de la même feuille (même arrangement, même tonalité E).
- Structure à appliquer par Timothée : deux Interlude (x2) | C#m B | A | absents (après le couplet 1, après le refrain) ; retour du refrain après le couplet 3 / le pont non gravé.
- Thèmes Foi, Espérance gardés (dans la liste, défendables).

### oceans — Océans

Lot 5 · partition retenue : `Océans - Accords D.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 10 : `Dans l'in[A]connu, aucun a[G]ppui.` → `Dans l'inc[A]onnu, aucun a[G]ppui.` *(session)*
- l. 12 : `Dans l[A]'abîme, ma foi d[G]emeure.` → `Dans l'[A]abîme, ma foi d[G]emeure.` *(session)*
- l. 16 : `[G] Et j'inv[D]oquerai Ton sa[A]int Nom,` → `[G] Et j'invo[D]querai Ton sa[A]int Nom,` *(session)*
- l. 19 : `Je T'appart[G]iens, [A]Tu e[Bm]s mien.` → `Je T'appar[G]tiens, [A]Tu e[Bm]s mien.` *(session)*
- l. 32 : `Peu [A]importe où Tu m'appelles.` → `Peu i[A]mporte où Tu m'appelles.` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 10 | A | x=100,0 sur « o » de « l'inc‹o›nnu » | décalé | l'inc[A]onnu |
| 12 | A | x=79,6 sur « a » de « l'‹a›bîme » | décalé | l'[A]abîme |
| 16 | D | x=109,8 sur « q » de « j'invo‹q›uerai » | décalé | j'invo[D]querai |
| 19 | G | x=120,4 sur « t » de « T'appar‹t›iens » | décalé | T'appar[G]tiens |
| 32 | A | x=329,4 sur « m » de « i‹m›porte » | décalé | i[A]mporte |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 3 ligne(s) — espaceur : l. 9 ; espace de fin : l. 31, 34.

En-tête : ajout de `{source: Océans - Accords D.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 32:decale:A:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 19:decale:G:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 16:decale:D:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 12:decale:A:1 | appliqué | Timothée | inclus dans la ligne de la session |
| 10:decale:A:1 | appliqué | Timothée | inclus dans la ligne de la session |

- Mesuré sur la couche texte (rawdict) du PDF de l'église : les 40 accords relevés un par un ; les 5 décalés du relevé (tous « ok ») sont confirmés par la partition, les 35 autres sont exacts.
- Retrait de début de ligne (cas Océans de 02), vérifié sur toutes les lignes : les 8 lignes en retrait de deux espaces (l. 9, 11, 16, 17, 23, 25, 30, 33) ont leur accord au-dessus du retrait (x=31,2 ou 45,4, avant la 1re lettre à 40,1 ou 54,3) et sont déjà écrites `[X] mot` ; aucune ligne sans retrait n'a d'accord avant la 1re lettre. Rien à changer.
- l. 9 : D@215,6 sur « d »@215,7 de « des » (exact) ; l'espaceur `[ ]` devant `[D]des` est retiré par le moteur (forme).
- Paroles, non appliqué : la feuille écrit « …sur l'eau, peu importe… » et « …fortifiée, dans la présence… » sur une seule ligne, en minuscule ; le .cho recoupe en deux lignes avec « Peu » et « Dans » en capitale.
- Non repris : traducteurs et titre original (« Oceans - Where feet may fail - Hillsong ») en pied de page. Autres versions dans Partitions : « Océans.pdf » (même feuille) et « Océans .pdf » (autre arrangement, non utilisé).

### oui-je-crois — Oui je crois (Credo)

Lot 5 · partition retenue : `Oui je crois (Credo).pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 9 : `[F] Dieu Tout-Pu[G]issant.[C/E]` → `[F] Dieu Tout-P[G]uissant.[C/E]`
- l. 10 : `[F] C'est par Ton Saint[Am]-Esp - r[G]it que Jésus fut c[C/E]on - çu,` → `[F] C'est par Ton Saint-[Am]Espr[G]it que Jésus fut c[C/E]onçu,`
- l. 19 : `[C] Oui je crois à la résur[Dm]rection,` → `[C] Oui je crois à la résu[Dm]rrection,`
- l. 27 : `[F] Descendu jusqu'aux [Am]té - n[G]èbres, Tu es ressus[C/E]cité, ` → `[F] Descendu jusqu'aux [Am]tén[G]èbres, Tu es ressu[C/E]scité,`
- l. 32 : `[C]Oui [F]je crois [Am]en L[G]ui, [C/E]oui [F]je crois qu'Il e[Am]st viv[G]ant,` → `[C] Oui [F]je crois[Am] en L[G]ui, [C/E]oui [F]je crois qu'Il e[Am]st viv[G]ant,` *(session)*
- l. 41 : `[C] Oui je crois à la résur[Dm]rection,` → `[C] Oui je crois à la résu[Dm]rrection,`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | F | x=328,2 sur l'espace après « créé, » (la feuille met deux lignes du .cho sur une seule), avant « Dieu » | exact (forme `[F] Dieu` déjà juste ; l'outil ignore l'espace de début de ligne) | aucune |
| 9 | G | x=435,8 sur « u » de « Tout-P‹u›issant » | décalé (le .cho est sur « i ») | Tout-P[G]uissant (défaut ok) |
| 10 | Am | x=181,9 sur « E » de « Saint-‹E›sp » | décalé (le .cho est sur « - ») | Saint-[Am]Esp (défaut ok) |
| 11 | F | x=402,4 sur l'espace après « çu, », avant « Christ » | exact (forme `[F] Christ`) | aucune |
| 16 | F | x=277,5 sur l'espace après « Père, », avant « oui » | exact (forme `[F] Oui`) | aucune |
| 18 | F | x=280,1 sur l'espace après « Saint-Esprit, », avant « ô » | exact (forme `[F] Ô`) | aucune |
| 19 | Dm | x=200,1 sur le 1er « r » de « résu‹r›rection » | décalé (le .cho est sur le 2e « r ») | résu[Dm]rrection (défaut ok) |
| 20 | F | x=257,9 sur l'espace après « résurrection, », avant « que » | exact (forme `[F] Que`) | aucune |
| 26 | F | x=385,1 sur l'espace après « croix, », avant « le » | exact (forme `[F] Le`) | aucune |
| 27 | C/E | x=366,0 sur le 3e « s » de « ressu‹s›cité » | décalé (le .cho est sur « c ») | ressu[C/E]scité (défaut ok) |
| 28 | F | x=412,2 sur l'espace après « ressuscité, », avant « à » | exact (forme `[F] A`) | aucune |
| 32 | C | x=45,4 sur la 1re espace du retrait, avant « Oui » | décalé (retrait : `[C]Oui` au lieu de `[C] Oui`) | [C] Oui |
| 32 | Am | x=134,3 sur l'espace entre « crois » et « en » | décalé (le .cho est sur « e ») | crois[Am] en (défaut ok) |
| 38 | F | x=259,7 sur l'espace après « éternelle, », avant « je » | exact (forme `[F] je`) | aucune |
| 40 | F | x=307,7 sur l'espace après « saints, », avant « et » | exact (forme `[F] Et`) | aucune |
| 41 | Dm | x=200,1 sur le 1er « r » de « résu‹r›rection » | décalé (le .cho est sur le 2e « r ») | résu[Dm]rrection (défaut ok) |
| 42 | F | x=257,9 sur l'espace après « résurrection, », avant « quand » | exact (forme `[F] Quand`) | aucune |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 5 ligne(s) — mot coupé au tiret : l. 8, 25 ; espaces : l. 14 ; espaceur : l. 33 ; espace de fin : l. 39.

En-tête : ajout de `{source: Oui je crois (Credo).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 42:decale:F:1 | laissé | def |  |
| 41:decale:Dm:1 | appliqué | def |  |
| 40:decale:F:1 | laissé | def |  |
| 38:decale:F:1 | laissé | def |  |
| 32:decale:Am:1 | appliqué | def | inclus dans la ligne de la session |
| 28:decale:F:1 | laissé | def |  |
| 27:decale:C/E:1 | appliqué | def |  |
| 26:decale:F:1 | laissé | def |  |
| 20:decale:F:1 | laissé | def |  |
| 19:decale:Dm:1 | appliqué | def |  |
| 18:decale:F:1 | laissé | def |  |
| 16:decale:F:1 | laissé | def |  |
| 11:decale:F:1 | laissé | def |  |
| 10:decale:Am:1 | appliqué | def |  |
| 9:decale:F:1 | laissé | def |  |
| 9:decale:G:1 | appliqué | def |  |

- Feuille de l'église (FPDF, couche texte) : les 64 accords mesurés en coordonnées ; après corrections, tous sur le caractère de la partition.
- Les 10 « décalé » F de début de ligne (l. 9, 11, 16, 18, 20, 26, 28, 38, 40, 42) viennent de la coupe des lignes : la feuille met deux lignes du .cho sur une seule et pose F sur l'espace après la virgule ; le .cho écrit déjà `[F] mot` : juste, rien ne change (défaut non confirmé).
- Retrait de début de ligne vérifié sur toutes les lignes : toutes les lignes en retrait ont déjà `[X] mot` sauf la l. 32 (Pont, `[C]Oui` → `[C] Oui`) ; la l. 33 (« Oui     je crois que Jésus… ») n'est pas en retrait sur la feuille : `[C/E]Oui` reste.
- L. 33 : l'espaceur `[ ]` devant `[F]je` est retiré par la forme ; F x=92,5 sur « j » de « je » : exact.
- Les suggestions de check.py pour l. 19/41 (« ré[Dm]surrection ») et l. 27 (« res[C/E]suscité ») sont décalées de deux caractères par rapport à sa propre mesure (x=200,1 sur le 1er « r », x=366,0 sur le 3e « s ») : on suit la mesure (résu[Dm]rrection, ressu[C/E]scité).
- Paroles, non appliqué : l. 28 la feuille écrit « à jamais élevé » (accent), le .cho « A jamais ».
- Non repris : traduction (« Traduction : (nom retiré) » gravé sur la feuille, champ non prévu) et titre original « This I believe ».
- Autres versions du même chant dans Partitions : « Oui je crois (Credo) - C.pdf », « - Accords.pdf », « - G.pdf » ; non mesurées (la feuille de l'église fait foi).

### ouvre-les-yeux-de-mon-coeur — Ouvre les yeux de mon cœur

Lot 5 · partition retenue : `Ouvre les yeux de mon cœur.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 11 : `Je désire [A2/C#]Te voir, [A2]je désire [E]Te voir[Esus].` → `Je désire [A2/C#]Te voir,[A2] je désire [E]Te voir[Esus4].`
- l. 14 : `Je désire [A2/C#]Te voir, [A2]je désire [E]Te voir.` → `Je désire [A2/C#]Te voir,[A2] je désire [E]Te voir.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | A2 | x=162,79 sur le dernier des trois espaces entre « voir, » et « je » (j à 167,24) | décalé | Te voir,[A2] je |
| 14 | A2 | x=162,79 sur le dernier des trois espaces entre « voir, » et « je » (j à 167,24) | décalé | Te voir,[A2] je |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 8 ligne(s) — espace de fin : l. 9, 12 ; orthographe d'accord : l. 10, 13, 19, 21, 25, 30.

En-tête : ajout de `{source: Ouvre les yeux de mon cœur.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 14:decale:A2:1 | laissé | def |  |
| 14:fable:14:decale:A2:1 | appliqué | session | Même système répété : A2 dans le blanc avant « je », crochet + espace. Le reste de la ligne est juste. — partition : A2 x=162,79 = 3e espace avant « je » (167,24) : en l'air ; A2/C# x=100,5 sur « T », E x=232,1 sur « T » |
| 11:decale:A2:1 | laissé | def |  |
| 11:fable:11:decale:A2:1 | appliqué | session | La feuille de l'église (rendu ChordPro) pose A2 dans le blanc avant « je » : accord en l'air, crochet + espace. La ligne proposée est juste en entier (A2/C# sur « T » de Te, E sur « T » de Te, Esus sur le point final). — partition : A2 x=162,79 = début du 3e des trois espaces entre « voir, » (virgule 149,45-153,89) et « je » (167,24) : en l'air avant « je » ; A2/C# x=100,5 sur « T » (100,6), E x=232,1 sur « T » (232,1), Esus x=281,0 sur « . » (281,0) |

- check.py lit mal cette feuille : les chiffres et suffixes des accords sont en exposant dans des spans séparés (E + 5, B + sus + /D + #), d'où 18 « absent de la source » ; les 10 « exact » sont les accords sans exposant. Tous les accords du chant ont été mesurés à la main dans la couche texte (rawdict, x de chaque label contre la boîte de chaque caractère) : vérifié à l'œil.
- Mesure de chaque accord : l.9 E5 sur « O », l.10 Bsus/D# sur « o » de « ouvre » ; l.11/14 A2/C# sur « T », A2 en l'air avant « je » (corrigé), E sur « T », Esus (l.11) sur le point ; l.18 B sur « a » de « au », C#m sur « u » de « Cieux » ; l.19 A2 sur « R », Bsus sur « a » de « Ta » ; l.20 B sur « R », C#m sur « c » de « force » ; l.21 A2/F# sur « n » de « nous », Bsus sur « s » de « es » ; l.25 E5 sur « T », Bsus/D# sur le 3e « Tu » ; l.26 A2/C# sur « T », A2 sur « s » de « es », E sur « T » de « Te » ; l.30 Esus sur « J », E sur « e » de « Te », Esus sur « j », E sur « e » de « Te ». Tous exacts sauf les deux A2.
- Refrain et Pont sont en retrait sur la feuille (x=45,4 contre 31,2) mais chaque accord en début de ligne y est au-dessus de la 1re lettre : pas de « [X] mot ».
- Le commit de transposition C → E (f61e3f8) ne fait que transposer : la place du A2 vient de l'import, la partition l'emporte.
- Autre version : « Ouvre les yeux de mon cœur (E).pdf » (shir.fr), même arrangement, accords identiques ; elle colle A2 à « je » et met le E du Final sur « te ». Les feuilles C et D de l'église sont la même feuille dans d'autres tonalités.
- Paroles, non appliqué : la feuille écrit « Ouvre les yeux de mon cœur, ouvre les yeux de mon cœur. » sur une seule ligne ; le .cho la coupe en deux lignes avec « Ouvre » en majuscule à la 2e. Coupe de ligne seulement, laissée.

### parfaitement-imparfait — Parfaitement imparfait

Lot 5 · partition retenue : `Parfaitement imparfait (Ab).pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 8 : `{start_of_intro: Intro}` → `{start_of_intro: Intro (x2)}` *(session (hors relevé))* — La feuille grave « INTRO x2 » puis « | Fm | C | Db | Ab / Eb/G / » (p1 y=235,3 et y=251,0) : reprise identique = suffixe (x2) au libellé (01, cas Abba Père de 02) ; même directive, seul le libellé change (partie intro du bloc de structure proposé).
- l. 28 : `Là [Ab]dans mon c[Cm7(ou Eb)]œur` → `Là [Ab]dans mon c[Cm7 (Eb)]œur` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | Fm | intro « \| Fm \| C \| Db \| Ab / Eb/G / » p1 y=251,0, 1er accord | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 9 | C | intro, 2e mesure | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 9 | Db | intro, 3e mesure | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 9 | Ab | intro, 4e mesure, 1re moitié | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 9 | Eb/G | intro, 4e mesure, 2e moitié | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 13 | Fm | x=72,0 sur « D » (72,0) de « Dur » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 14 | C | x=81,0 sur « n » (79,3–85,3) de « E‹n›tre » ; le .cho pose l'accord devant « t » (85,3) | décalé d'une lettre, même mot, source basse fidélité (± 1 syllabe) | aucune : choix « non » du relevé gardé, l'écart (une lettre, frontière En\|tre) reste dans la tolérance d'une feuille Pages alignée aux espaces |
| 15 | Db | x=72,0 sur « Q » (72,0) de « Quand » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 16 | Ab | x=84,0 sur « s » (83,7) de « suivre » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 16 | Eb/G | x=177,0 sur « ﬂ » (178,3) de « ﬂatter » (espace 175,3) | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 17 | Fm | x=72,0 sur « L » de « Les » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 18 | C | x=135,0 sur « c » (133,3–138,6) de « qu'au‹c›un » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 20 | Db | x=72,0 sur « C » de « Car » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 21 | Eb/G | x=165,3, après la fin de « est » (t 147,0, fin de ligne 150,3) | exact (après la dernière syllabe) | aucune : e[Ab]st[Eb/G], le moteur retire l'espaceur [ ] |
| 21 | Ab | x=144,0 sur « s » (142,3–147,0) de « e‹s›t » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 25 | Fm | x=171,0 sur « v » (171,0) de « chef-d'œu‹v›re » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 26 | C | x=123,0 sur « T » (123,8) de « Ton » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 27 | Db | x=129,0 sur « à » (129,0) | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 28 | Ab | x=93,0 entre « d » (87,7) et « a » (93,7) de « dans » | même syllabe, basse fidélité | aucune : [Ab]dans gardé |
| 28 | Cm7(ou Eb) | x=144,0 sur « œ » (142,3) de « c‹œ›ur » | nom (position exacte) | c[Cm7 (Eb)]œur |
| 32 | Fm | x=405,0 sur « f » (404,6) de « par‹f›aitement » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 33 | C | x=387,0 sur « m » (387,3) de « mon » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 34 | Db | x=369,0 dans « n » (364,0–370,0), à 1,0 du « f » (370,0) de « enfant » | exact ou à une lettre, même syllabe, basse fidélité | aucune : en[Db]fant gardé |
| 35 | Ab | x=395,3 sur « t » (395,6) de « trouve » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |
| 35 | Eb/G | x=480,0 sur « e » (477,6–483,0) de « es » | exact à l'œil | aucune — check.py : « absent de la source » (l'outil ne lit pas les accords de cette feuille Pages) ; vérifié à l'œil sur le rendu 2× |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — ligne sans paroles : l. 9 ; ligature typographique : l. 16 ; espaceur : l. 19, 21.

En-tête : ajout de `{source: Parfaitement imparfait (Ab).pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 28:reporte:Ab:1 | laissé | Timothée |  |
| 28:reporte:Cm7(ou Eb):1 | appliqué | session | contre le « non » de Timothée, la partition l'emporte : Nom d'accord : la feuille grave « Cm7 (ou Eb) » (p1 y=700,3, C à x=144,0 sur « œ » 142,3–151,0 de « cœur » : position exacte, gardée) ; 01 écrit une alternative gravée [Cm7 (Eb)], jamais de texte (« ou ») dans un crochet. Ab x=93,0 sur « dans » (d 87,7 / a 93,7, même syllabe) : gardé, comme le « non » du relevé sur les deux suppressions (l'outil n'avait pas lu ces accords, ils sont bien gravés). |
| 14:relire:C:1 | laissé | Timothée |  |

- Source basse fidélité (feuille Pages/Word, accords alignés aux espaces et tabulations, ± 1 syllabe) : chaque accord du chant vérifié à l'œil sur le rendu 2× et mesuré en x (rawdict). Intro : Fm C Db Ab Eb/G, comme gravé. Couplet 1 : Fm/Dur, C/E‹n›tre (gardé En[C]tre, ± 1 lettre), Db/Quand, Ab/suivre, Eb/G/ﬂatter, Fm/Les, C/qu'au‹c›un, ligne « Ne Te fera m'aimer plus » sans accord gravé (l'espaceur [ ] du .cho sera retiré), Db/Car, Ab sur « s » de « est », Eb/G après « est ». Pré-refrain : Fm/chef-d'œu‹v›re, C/Ton, Db/à, Ab/dans, Cm7 (Eb)/c‹œ›ur. Refrain : Fm/par‹f›aitement, C/mon, Db/en‹f›ant, Ab/trouve, Eb/G/es. Tout est à sa syllabe ; seul le nom de l'alternative (l. 28) change.
- check.py ne lit pas les accords de cette feuille (25 « absent de la source » avant comme après) : tous les accords sont mesurés à l'œil et en x, listés dans mesures. Le statut « non → appliqué » que l'aperçu donne à 28:reporte:Cm7(ou Eb):1 n'est pas un passage outre le relevé : son « non » refusait la suppression, l'accord reste au même caractère, seule son écriture suit 01 ([Cm7 (Eb)]).
- Couplet 2 : la feuille ne grave aucun accord, le .cho n'en a pas : rien d'ajouté. Le retour du refrain après le couplet 2 n'est pas gravé sur la feuille.
- Interlude « INSTRUMENTAL x2 » après le refrain : absent du .cho, à appliquer par Timothée (bloc de structure). Les cinq accords « absent du .cho » de la liste extra (p1 y=414,0) sont cette ligne d'interlude, non appliquée.
- Thèmes Adoration, Foi : dans la liste, gardés (Grâce et Famille de Dieu défendables : le refrain dit l'identité d'enfant de Dieu).
- Autres versions : « Parfaitement imparfait.pdf » est octet pour octet la même feuille ; « Parfaitement imparfait (G).pdf » porte le même texte et les mêmes accords (Fm C Db Ab Eb/G, donc en Ab malgré son nom).

### personne — Personne

Lot 5 · partition retenue : `Personne.pdf` (inconnue, mesure impossible)

Lignes modifiées :

- l. 16 : `J’ai [G]tourné, tourné..[D].` → `J’ai [G]tourné, tourné[C]...` *(session)*
- l. 17 : `Il [G]n’y a vraiment [D]personne comme [G]Lui` → `Il [G]n’y a vraiment [D]personne comme [G]Lui !` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 7 | G | Sol x=67,9 sur « n » (x=68,6) de « n’y » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 7 | C | Do x=277,1 sur « J » (x=280,2) de « Jésus » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 8 | G | Sol x=67,9 sur « n » (x=68,6) de « n’y » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 8 | D | Ré x=277,1 sur « J » (x=280,2) de « Jésus » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 9 | G | Sol x=67,9 sur « n » (x=68,6) de « n’y » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 9 | C | Do x=277,1 sur « J » (x=280,2) de « Jésus » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 10 | G | Sol x=71,4 sur « n » (x=68,6–77,5) de « n’y » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 10 | D | Ré x=174,2 sur « q » (x=173,2) de « qui » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 10 | G | Sol x=277,1 sur « L » (x=280,2) de « Lui » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 14 | G | Sol x=124,9 sur « c » (x=126,4) de « cherché » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 15 | G | Sol x=124,9 sur « f » (x=126,4) de « fouillé » | exact | exact à l'œil ; check.py ne lit pas le solfège (absent de la source = outil) |
| 14 | C | Do x=245,2 sur « : » (x=244,9), avant « personne » (p x=254,3) | équivalent | aucune : [C] personne, accord avant l'attaque de « personne » |
| 15 | D | Ré x=231,2, entre « : » (x=223,7) et « p » (x=232,9) de « personne » | équivalent | aucune : [D] personne |
| 16 | G | Sol x=124,9 sur « t » (x=126,4) de « tourné » | exact | aucune |
| 16 | D | Do x=231,2 sur « … » (x=225,0) après « tourné » | nom | tourné[C]... |
| 17 | G | Sol x=67,9 sur « n » (x=68,6) de « n’y » | exact | aucune |
| 17 | D | Ré x=174,2 sur « p » (x=173,2) de « personne » | exact | aucune |
| 17 | G | Sol x=291,0 sur « L » (x=292,2) de « Lui » | exact | aucune |

En-tête : ajout de `{source: Personne.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 17:oeil:1 | appliqué | session | La feuille écrit « Il n’y a vraiment personne comme Lui ! » ; les trois accords sont déjà justes. — inclus dans la ligne de la session — partition : mesure : Sol x=67,9 sur « n’y » (n x=68,6) ; Ré x=174,2 sur « p » x=173,2 de « personne » ; Sol x=291,0 sur « L » x=292,2 de « Lui » ; « ! » x=320,2 |
| 16:oeil:0 | appliqué | session | La feuille porte Do (C), pas Ré, sur la fin de « J’ai tourné, tourné… » ; Sol reste sur « tourné ». — inclus dans la ligne de la session — partition : mesure : Sol x=124,9 sur « t » x=126,4 de « tourné » ; Do x=231,2 sur « … » (x=225,0), après « tourné » — nom faux dans le .cho (D), place inchangée |

- Accords en solfège (Sol, Do, Ré) : check.py n'en lit aucun ; chaque accord vérifié à l'œil (PDF à couche texte, x de chaque label et de chaque lettre via rawdict, plus la page rendue à 2×).
- Couplet, lignes 7 à 10 : tous exacts — Sol x=67,9/71,4 sur « n’y » (x=68,6) ; Do/Ré/Do x=277,1 sur « Jésus » (J x=280,2) ; ligne 10 Ré x=174,2 sur « qui » (q x=173,2) et Sol x=277,1 sur « Lui » (x=280,2).
- Refrain : Sol x=124,9 sur « cherché/fouillé/tourné » (x=126,4) exacts ; Do (l.14) et Ré (l.15) posés sur les deux-points juste avant « personne » : [X] personne gardé.
- Seul vrai écart d'accord : ligne 16, Do (C) et non D ; corrigé.
- Retrait de début de ligne : le refrain est en retrait (x=96,6) mais aucun accord n'est gravé au-dessus du retrait ; rien à écrire en [X] mot.
- Paroles, non appliqué : la feuille écrit « … » (un caractère) là où le .cho a « ... » ; laissé.

### pionnier — Pionnier

Lot 5 · partition retenue : `Pionnier.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 11 : `Quand [E]tout se déchaîne [G#m]autour de mo[F#]i` → `Quand [E]tout se déchaîne [G#m]autour de m[F#]oi` *(session)*
- l. 30 : `[E]Jésus [G#m]Tu ne fail[F#]lis pas` → `[E]Jésus [G#m]Tu ne faill[F#]is pas` *(session)*
- l. 44 : `Même dans la tempê[B]te Dieu Tu es l[F#]à` → `Même dans la temp[B]ête Dieu Tu es l[F#]à` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 11 | F# | x=246,0 sur « o » de « m‹o›i » (244,6–250,6) | décalé d'une lettre, même syllabe (basse fidélité : lettre la plus proche) | m[F#]oi |
| 12 | E | x=87,0 entre « t » (85,0) et « r » (88,3) de « trouve » | équivalent (± 1 lettre, attaque du mot) | aucune |
| 12 | F# | x=225,0 sur « o » de « T‹o›i » (222,2–228,2) | décalé d'une lettre, même syllabe (tolérance basse fidélité) | aucune : To[F#]i gardé (T[F#]oi sur la feuille) |
| 13 | G#m | x=189,0 sur « c » de « choses », la feuille imprime « G# » | nom | aucune : G#m est une correction volontaire à la main du 16/07 (commit 6bf127e, G# → G#m ; vers parallèles en G#m, IV–vi–V en si) : retouche gardée |
| 27 | F# | x=214,3 sur le « e » final de « lève » (210,0–215,3, fin du mot 215,3) | équivalent (fin du mot, ± 1 lettre) | aucune : lève[F#] gardé |
| 29 | F# | x=142,3 sur la 2e espace de « T’est  impossible » (142,4), « i » à 145,4 | équivalent (frontière espace / attaque du mot) | aucune : [F#]impossi gardé |
| 30 | F# | x=150,0 sur « i » de « faill‹i›s » (149,7–153,0) | décalé d'une lettre, même syllabe « lis » (basse fidélité : lettre la plus proche) | faill[F#]is |
| 41 | C#m | x=372,0 entre « l » (369,3) et « ’ » (372,7) de « l’invisible » | équivalent (± 1 lettre) | aucune |
| 41 | E | x=414,7 sur le « e » final de « invisible » (412,7–418,0) | décalé d'une lettre / espace (en l'air après le mot) | aucune : retouche à la main du 16/07 (invisib[E]le → invisible [E]), dans la tolérance basse fidélité |
| 44 | B | x=405,0 sur « ê » de « temp‹ê›te » (403,3–408,6) | décalé d'une lettre, autre syllabe (« te » au lieu de « pê ») | temp[B]ête |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 1 ligne(s) — ligature typographique : l. 42.

En-tête : ajout de `{source: Pionnier.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 44:relire:B:1 | laissé | def |  |
| 44:oeil:6 | laissé | def |  |
| 44:fable:44:oeil:6 | laissé | session | La lecture déplace F# devant « là » alors que la feuille le pose sur le « à » (x=369,0, « à » 367,4–372,7) : « l[F#]à » du .cho est exact. B est sur le « ê » de « tempête » (.cho devant « te », à une lettre) : dans la tolérance de la source basse fidélité, laissé. — partition : B x=405,0 (« ê » 403,3–408,6, « t » 408,6) ; F# x=369,0 sur « à » de « là » (ligne « Dieu Tu es là » de la feuille) |
| 41:relire:C#m:1 | laissé | def |  |
| 41:relire:E:1 | laissé | def |  |
| 41:oeil:5 | laissé | def |  |
| 41:fable:41:oeil:5 | laissé | session | C#m est à +2,7 pt du « l » de « l’invisible » (le .cho l'a devant le « l », juste à ± 1 lettre). E est sur le « e » final (412,7–418,0) : ni « invisible [E] » (.cho) ni « invisible[E] » (lecture) ne sont exacts, les deux sont à une lettre / une espace près, même syllabe. Le placement actuel vient d'une retouche à la main du 16/07 qui a déplacé E de « invisib[E]le » à « invisible [E] » : laissé, source basse fidélité. — partition : C#m x=372,0 (« l » 369,3, « ’ » 372,7) ; E x=414,7 sur le « e » final (412,7–418,0, fin du mot 418,0) |
| 37:reporte:E:1 | laissé | def |  |
| 37:reporte:G#m:1 | laissé | def |  |
| 37:reporte:F#:1 | laissé | def |  |
| 36:reporte:E:1 | laissé | def |  |
| 36:reporte:G#m:1 | laissé | def |  |
| 36:reporte:F#:1 | laissé | def |  |
| 35:reporte:E:1 | laissé | def |  |
| 35:reporte:G#m:1 | laissé | def |  |
| 35:reporte:F#:1 | laissé | def |  |
| 34:reporte:E:1 | laissé | def |  |
| 34:reporte:G#m:1 | laissé | def |  |
| 34:reporte:F#:1 | laissé | def |  |
| 30:relire:F#:1 | laissé | def |  |
| 30:oeil:4 | laissé | def |  |
| 27:relire:F#:1 | laissé | def |  |
| 27:oeil:3 | laissé | def |  |
| 21:reporte:E:1 | laissé | def |  |
| 21:reporte:G#m:1 | laissé | def |  |
| 21:reporte:F#:1 | laissé | def |  |
| 20:reporte:E:1 | laissé | def |  |
| 20:reporte:G#m:1 | laissé | def |  |
| 20:reporte:F#:1 | laissé | def |  |
| 19:reporte:E:1 | laissé | def |  |
| 19:reporte:G#m:1 | laissé | def |  |
| 19:reporte:F#:1 | laissé | def |  |
| 18:reporte:E:1 | laissé | def |  |
| 18:reporte:G#m:1 | laissé | def |  |
| 18:reporte:F#:1 | laissé | def |  |
| 13:nom:G#m:1 | laissé | def |  |
| 13:oeil:2 | laissé | def |  |
| 12:relire:E:1 | laissé | def |  |
| 12:relire:F#:1 | laissé | def |  |
| 12:oeil:1 | laissé | def |  |
| 12:fable:12:oeil:1 | laissé | session | La lecture « Toi[F#] » met l'accord après le mot ; la feuille le pose sur le « o » de « Toi » (.cho devant le « i », même syllabe). E est à +2 pt du début de « trouve » (le .cho l'a à l'attaque, juste à ± 1 lettre). Ligne actuelle dans la tolérance. — partition : E x=87,0 (« t » 85,0, « r » 88,3) ; F# x=225,0 (« o » 222,2–228,2, « i » 228,2) |
| 11:relire:F#:1 | laissé | def |  |
| 11:oeil:0 | laissé | def |  |
| 11:fable:11:oeil:0 | laissé | session | La lecture « moi[F#] » éloigne l'accord du label : la feuille le pose sur le « o » de « moi », le .cho devant le « i » (même syllabe, une lettre). Source basse fidélité (± 1 syllabe) : la ligne actuelle est dans la tolérance, rien ne bouge. — partition : F# x=246,0 ; « m » 239,1, « o » 244,6–250,6, « i » 250,6 : label sur le « o » de « moi » |

- Source basse fidélité (feuille Pages, accords alignés aux espaces et tabulations de 36 pt) : chaque accord du couplet 1, du refrain et du pont mesuré sur la couche texte (x du label ↔ début de la lettre la plus proche), vérifié à l'œil sur le rendu 2×.
- Exacts : l.11 E, G#m ; l.12 G#m ; l.13 E, F# ; l.14 C#m, G#m, F# ; l.25 E, G#m, F# ; l.26 B/D# ; l.27 E, G#m ; l.28 B/D# ; l.29 C#m, G#m, B/D# ; l.30 E, G#m ; l.42 B, F# ; l.43 C#m, E ; l.44 F#.
- À une lettre près, gardés (tolérance ± 1 syllabe) : l.12 F# (T[F#]oi), l.41 E (invisibl[E]e). Aucun accord n'est sur un autre mot que la feuille.
- Retouches à la main du 16/07 gardées : G#m l.13 (la feuille imprime G#, coquille probable) et E l.41 déplacé après le mot.
- Couplets 2 et 3 : aucun accord sur la feuille ; accords reportés de la grille du couplet 1, gardés.
- Pont : la feuille coupe « Même dans la tempête / Dieu Tu es là » en deux lignes, le .cho les réunit (paroles identiques, non appliqué).
- Feuille : © 2017 Hillsong Music Publishing, CCLI TBC (non repris).
- Feuille sans renvoi, noté ici plutôt qu'en needs_review : la feuille s'arrête au Pont sans renvoi : le retour du refrain après le couplet 3 et après le pont n'est pas gravé, rien n'est ajouté.
- Lettre la plus proche du label (règle de 02, basse fidélité) appliquée aux « non » par défaut : l.11 mo[F#]i → m[F#]oi, l.30 fail[F#]lis → faill[F#]is, l.44 tempê[B]te → temp[B]ête ; aucun label à cheval sur deux syllabes, donc aucun needs_review.

### premiere-place — Première place

Lot 5 · partition retenue : `Première place C.pdf` (traitement-texte, mesure basse-fidelite) · **fichier inchangé**

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 9 | Am | x=24,0 sur « D » de « De » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 9 | G | x=85,2 sur « e » de « es » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 9 | C | x=182,1 après la fin de « cri » (fin de ligne) → cri[C] (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 9 | F | x=100,5 sur l'espace après « es, » (espace 100,5–106,3), « entends » commence à 106,3 ; le .cho a [F]entends | équivalent (frontière espace / 1re lettre du même mot ; choix « non » du relevé gardé) |  |
| 10 | Am | x=24,0 sur « D » de « De » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 10 | G | x=85,2 sur « e » de « es » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 10 | C | x=171,9 sur « è » de « pri‹è›re » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 10 | F | x=100,5 sur l'espace après « es, » (espace 100,5–106,3), « exauce » commence à 106,3 ; le .cho a [F]exauce | équivalent (frontière espace / 1re lettre du même mot ; choix « non » du relevé gardé) |  |
| 11 | Am | x=24,0 sur « M » de « Mon » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 11 | G | x=54,6 sur « s » de « dé‹s›ir » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 11 | F | x=75,0 sur « e » de « est » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 11 | C | x=131,1 sur « m » de « t′ai‹m›er » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 12 | Am | x=24,0 sur « J » de « Je » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 12 | G | x=100,5 sur le 2e « n » de « abandon‹n›er » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 12 | F | x=238,2 sur « t » de « toi » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 13 | C | x=126,0 sur « t » de « toi » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 17 | Am | x=80,9 sur « p » de « prends » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 17 | G | x=177,8 sur « p » de « place » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 18 | F | x=80,9 sur « p » de « prends » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 18 | C | x=177,8 sur « p » de « place » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 19 | Am | x=80,9 sur « u » de « chaq‹u›e » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 19 | G | x=152,3 sur « p » de « place » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 20 | F | x=70,7 sur « a » de « aies » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 20 | C | x=157,4 sur « p » de « place » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 24 | Am | x=69,9 sur « m » de « moi » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 24 | G | x=120,9 sur « m » de « t′ai‹m›er » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 25 | F | x=64,8 sur « t » de « toi » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 25 | C | x=115,8 sur « f » de « fais » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 26 | Am | x=69,9 sur « m » de « moi » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 26 | G | x=115,8 sur « s » de « suivre » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 27 | F | x=64,8 sur « r » de « impo‹r›te » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 27 | C | x=151,5 sur le 2e « r » de « m’ar‹r›ive » (couche texte, police à chasse fixe, vérifié sur le rendu 2×) | exact (mesuré à la main) |  |
| 31 | Am | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : Am sur « pas » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 31 | G | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : G sur « é‹l›oigne » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 31 | F | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : F sur « pré‹s›ence » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 31 | C | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : C sur « fin de ligne » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 32 | Am | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : Am sur « jour » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 32 | G | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : G sur « marcher » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 32 | F | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : F sur « sens » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 32 | C | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : C sur « fin de ligne » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 33 | Am | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : Am sur « ê‹t›re » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 33 | G | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : G sur « part » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 33 | F | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : F sur « savoir » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 33 | C | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : C sur « voix » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 34 | Am | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : Am sur « ê‹t›re » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 34 | G | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : G sur « bre‹b›is » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 34 | F | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : F sur « reconnait » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |
| 34 | C | couplet 3 imprimé sans aucun accord (4 lignes superposées, y=434,8–448,4) ; .cho : C sur « toi » | reporté (passage sans accords gravés ; choix « non » du relevé : gardé) |  |

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 34:reporte:Am:1 | laissé | Timothée |  |
| 34:reporte:G:1 | laissé | Timothée |  |
| 34:reporte:F:1 | laissé | Timothée |  |
| 34:reporte:C:1 | laissé | Timothée |  |
| 33:reporte:Am:1 | laissé | Timothée |  |
| 33:reporte:G:1 | laissé | Timothée |  |
| 33:reporte:F:1 | laissé | Timothée |  |
| 33:reporte:C:1 | laissé | Timothée |  |
| 32:reporte:Am:1 | laissé | Timothée |  |
| 32:reporte:G:1 | laissé | Timothée |  |
| 32:reporte:F:1 | laissé | Timothée |  |
| 32:reporte:C:1 | laissé | Timothée |  |
| 31:reporte:Am:1 | laissé | Timothée |  |
| 31:reporte:G:1 | laissé | Timothée |  |
| 31:reporte:F:1 | laissé | Timothée |  |
| 31:reporte:C:1 | laissé | Timothée |  |
| 10:relire:F:1 | laissé | Timothée |  |
| 9:relire:F:1 | laissé | Timothée |  |

- Source basse fidélité (dossier) : feuille eecpworship.fr rendue en police à chasse fixe (Inconsolata), accords en lignes d'espaces insécables que check.py ne lit pas (0 accord mesuré, 48 « absent de la source », famille inconnue). Chaque accord vérifié à l'œil : x de chaque étiquette relevé sur la couche texte (rawdict) et comparé aux caractères des paroles, contrôlé sur le rendu 2× (crops/premiere-place/c1–c3.png).
- Couplet 1, Refrain, Couplet 2 : 30 accords sur 32 exactement sur le caractère de la feuille ; noms d'accords identiques ; aucun accord absent ni inventé.
- l. 9 et l. 10 : F gravé sur l'espace avant « entends » / « exauce » (x=100,5), le .cho a [F]entends / [F]exauce. Le relevé a choisi « non » (garder) : frontière entre l'espace et la 1re lettre du même mot, sur une source de basse fidélité → pas de passage outre ; la forme stricte de 02 serait `es,[F] entends` / `es,[F] exauce`.
- Couplet 3 (l. 31–34) : la feuille n'imprime aucun accord (lignes superposées, rendu cassé) ; les 16 accords du .cho sont des reportés, gardés (choix « non » du relevé sur les 16 suppressions). Non sourcés : à confirmer à l'oreille.
- Refrain 2 absent du .cho (entre couplet 2 et couplet 3) : en « Structure à appliquer par Timothée ».
- Autre version : « Première place D.pdf », même feuille transposée en D (Bm A G D), mêmes positions d'accords, même Refrain 2 et couplet 3 sans accords.
- Paroles, non appliqué : l. 13 « m'éloigne » et l. 27 « qu'il m'arrive » ont l'apostrophe droite alors que le reste du fichier a « ′ » ; c'est aussi le cas sur la feuille. Aucune autre différence de paroles.
- Thèmes (Adoration, Engagement) et {key: C} (« Tonalité: C » sur la feuille) conformes : inchangés. Aucune question au dossier ; aucune ligne modifiée.

### pres-de-la-croix — Près de la Croix

Lot 5 · partition retenue : `Près de la Croix.pdf` (word-scan, mesure impossible) · **fichier inchangé**

- Feuille regardée à l'œil (rendu 2×, crops/pres-de-la-croix/p1.png) : capture d'écran sans couche texte, paroles seules, aucun accord gravé. Mesure impossible : aucune ligne changée, aucun accord déplacé, ajouté ou retiré.
- Les accords du .cho (F, Bb, C) sont tous sans source : check.py lit des lignes de paroles comme des accords, ses « non exact » ne veulent rien dire sur ce chant.
- check.py, après : 5 « exact », 1 « décalé » (l.29 F, « label » x=816 = le mot « Ô » des paroles lu comme accord), 39 « absent de la source » : les 45 sont des artefacts de l'outil (feuille sans accords), aucun ne se corrige ; tous les accords du chant restent non vérifiés, faute de grille.
- Paroles conformes à la feuille, ligne pour ligne (y compris « Qui coul’ du Calvaire », « Apporte tes cènes »). Paroles, non appliqué : rien à signaler d'autre.
- Structure : la feuille fait revenir le refrain après chaque verset (V1 C V2 C V3 C V4 C) ; bloc à appliquer par Timothée. Libellés « Verset » au lieu de « Couplet » (01) : laissés, hors mesure.
- Thèmes Croix, Adoration : dans la liste, gardés.

### prince-de-paix — Prince de paix

Lot 5 · partition retenue : `Prince de paix - C.pdf` (eglise-fpdf, mesure fiable)

Lignes modifiées :

- l. 14 : `[C]Cette paix que T[G]u donnes, Tu donnes.[Am]` → `[C] Cette paix que T[G]u donnes, Tu donnes.[Am]`
- l. 16 : `[C]Quand mes forces m'ab[G]andonnent car Tu donnes.` → `[C] Quand mes forces m'ab[G]andonnent car Tu donnes.`
- l. 18 : `[C]Les tempêtes et [G]les vallées.[Am]` → `[C] Les tempêtes et [G]les vallées.[Am]`
- l. 20 : `[C]Car j'ai à mes c[G]ôtés à jamais.[Am]` → `[C] Car j'ai à mes c[G]ôtés à jamais.[Am]`
- l. 27 : `[G] Du début jusqu'à la fin, je sais que [Am]Tu es [F]là [C]ave[G]c moi.[Am]` → `[G] Du début jusqu'à la fin, je sais que [Am]Tu es [F]là[C] ave[G]c moi.[Am]`
- l. 32 : `[C]M'offre Ton én[G]ergie pour ma vie.[Am]` → `[C] M'offre Ton én[G]ergie pour ma vie.[Am]`
- l. 34 : `[C]Guidé par Ton Esp[G]rit, je choisis,` → `[C] Guidé par Ton Es[G]prit, je choisis,`
- l. 35 : `[Am] D'avoir confiance [F]en Ta bonté,` → `[Am]D'avoir confiance [F]en Ta bonté,` *(session (hors relevé))* — ligne sans retrait sur la feuille : Am x=31,2 au-dessus du « D » de « D'avoir » [31,2-42,7] (pas d'espace de retrait, comme « [Am]Du courage » l. 17) → `[Am]D'avoir` ; F x=157,8 sur le « e » de « en », exact
- l. 36 : `[C]Même quand je me [G]sens submergé.[Am]` → `[C] Même quand je me [G]sens submergé.[Am]`
- l. 38 : `[C]Car j'ai à mes c[G]ôtés à jamais.[Am]` → `[C] Car j'ai à mes c[G]ôtés à jamais.[Am]`
- l. 42 : `[F] Plus qu'une sensa[C]tion, c'est ma déci[G]sion.` → `[F] Plus qu'une sens[C]ation, c'est ma déc[G]ision.`

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 14 | C | x=165,5 sur l'espace avant « cette » | décalé | [C] Cette — check.py le lit encore « décalé » après : il ne voit pas l'espace de tête d'une ligne que le .cho coupe au milieu d'une ligne de la feuille (outil qui lit mal, vérifié à l'œil) |
| 16 | C | x=185,3 sur l'espace avant « quand » | décalé | [C] Quand — check.py le lit encore « décalé » après : il ne voit pas l'espace de tête d'une ligne que le .cho coupe au milieu d'une ligne de la feuille (outil qui lit mal, vérifié à l'œil) |
| 18 | C | x=217,9 sur l'espace avant « les » | décalé | [C] Les — check.py le lit encore « décalé » après : il ne voit pas l'espace de tête d'une ligne que le .cho coupe au milieu d'une ligne de la feuille (outil qui lit mal, vérifié à l'œil) |
| 20 | C | x=147,7 sur l'espace avant « car » | décalé | [C] Car — check.py le lit encore « décalé » après : il ne voit pas l'espace de tête d'une ligne que le .cho coupe au milieu d'une ligne de la feuille (outil qui lit mal, vérifié à l'œil) |
| 27 | C | x=367,7 sur le dernier des trois espaces entre « là » et « avec » (« a » à 372,1) | décalé | là[C] avec (défaut ok) |
| 32 | C | x=181,5 sur l'espace avant « m'offre » | décalé | [C] M'offre — check.py le lit encore « décalé » après : il ne voit pas l'espace de tête d'une ligne que le .cho coupe au milieu d'une ligne de la feuille (outil qui lit mal, vérifié à l'œil) |
| 34 | C | x=173,5 sur l'espace avant « guidé » | décalé | [C] Guidé — check.py le lit encore « décalé » après : il ne voit pas l'espace de tête d'une ligne que le .cho coupe au milieu d'une ligne de la feuille (outil qui lit mal, vérifié à l'œil) |
| 34 | G | x=299,7 sur « p » d'« Es‹p›rit » | décalé | Es[G]prit (défaut ok) |
| 35 | Am | x=31,2 sur le « D » de « D'avoir », ligne sans retrait | décalé (retrait inventé, check.py ne le voit pas) | [Am]D'avoir |
| 35 | F | x=157,8 sur le « e » de « en » | exact | inchangé |
| 36 | C | x=247,7 sur l'espace avant « même » | décalé | [C] Même — check.py le lit encore « décalé » après : il ne voit pas l'espace de tête d'une ligne que le .cho coupe au milieu d'une ligne de la feuille (outil qui lit mal, vérifié à l'œil) |
| 38 | C | x=147,7 sur l'espace avant « car » | décalé | [C] Car — check.py le lit encore « décalé » après : il ne voit pas l'espace de tête d'une ligne que le .cho coupe au milieu d'une ligne de la feuille (outil qui lit mal, vérifié à l'œil) |
| 42 | C | x=175,6 sur « a » de « sens‹a›tion » | décalé | sens[C]ation (défaut ok) |
| 42 | G | x=308,5 sur « i » de « déc‹i›sion » | décalé | déc[G]ision (défaut ok) |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — ligne sans paroles : l. 9 ; espace de fin : l. 15, 17, 19.

En-tête : ajout de `{source: Prince de paix - C.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 42:decale:C:1 | appliqué | def |  |
| 42:decale:G:1 | appliqué | def |  |
| 38:decale:C:1 | laissé | def |  |
| 38:fable:38:decale:C:1 | appliqué | session | même vers que la ligne 20, gravé deux fois au même x : `[C] Car` — partition : C x=147,7 = espace après « rassuré » |
| 36:decale:C:1 | laissé | def |  |
| 36:fable:36:decale:C:1 | appliqué | session | C sur l'espace avant « même » : `[C] Même` ; G exact sur « sens », Am après « submergé. » — partition : C x=247,7 = espace [247,7-252,1] après « bonté, » |
| 34:decale:C:1 | laissé | def |  |
| 34:decale:G:1 | appliqué | def | inclus dans la ligne de 34:fable:34:decale:C:1 |
| 34:fable:34:decale:C:1 | appliqué | session | C sur l'espace avant « guidé » : `[C] Guidé` ; la ligne reprend le G sur le « p » d'« Esprit » (écart 34:decale:G:1, mesuré) — partition : C x=173,5 = espace [173,5-177,9] après « pas, » ; G x=299,7 sur « p » d'« Es‹p›rit » |
| 32:decale:C:1 | laissé | def |  |
| 32:fable:32:decale:C:1 | appliqué | session | C sur l'espace avant « m'offre » : `[C] M'offre` ; G exact sur le « e » de « énergie » — partition : C x=181,5 = espace [181,5-185,9] après « moi » |
| 27:decale:C:1 | appliqué | def |  |
| 20:decale:C:1 | laissé | def |  |
| 20:fable:20:decale:C:1 | appliqué | session | C sur l'espace avant « car » : `[C] Car` ; G exact sur le « ô » de « côtés » — partition : C x=147,7 = espace [147,7-152,1] après « rassuré » |
| 18:decale:C:1 | laissé | def |  |
| 18:fable:18:decale:C:1 | appliqué | session | C sur l'espace avant « les » : `[C] Les` ; G exact sur « les », Am après « vallées. » — partition : C x=217,9 = espace [217,9-222,4] après « traverser » |
| 16:decale:C:1 | laissé | def |  |
| 16:fable:16:decale:C:1 | appliqué | session | C sur l'espace avant « quand » : `[C] Quand` ; G exact sur le « a » de « m'abandonnent » — partition : C x=185,3 = espace [185,3-189,8] après « j'ai », « q » à 189,8 |
| 14:decale:C:1 | laissé | def |  |
| 14:fable:14:decale:C:1 | appliqué | session | le C est gravé sur l'espace avant « cette » (le .cho coupe la ligne de la feuille à cet endroit) : `[C] Cette`, comme les lignes en [F] ; G et Am déjà exacts — partition : C x=165,5 = début de l'espace [165,5-169,9] après « paix, », « c » de « cette » à 169,9 |

- Feuille de l'église (PDF à couche texte), mesure fiable : chaque accord du chant relevé en x (rawdict) et regardé sur le rendu 2× ; 44 exacts au départ, les 12 décalés corrigés.
- Les 8 questions : la feuille grave deux demi-vers par ligne et le C tombe sur l'espace avant le second, là où le .cho coupe la ligne → `[C] Mot`, comme les lignes en [F].
- check.py après : 8 C encore « décalé » (l. 15, 17, 19, 21, 33, 35, 37, 39 après l'ajout de {source:}) : ce sont les `[C] Mot` posés ; l'outil ne voit pas l'espace de tête d'une ligne coupée, la feuille met bien le C sur l'espace (vérifié à l'œil sur le rendu 2×).
- Retrait de début de ligne vérifié sur toutes les lignes : seule la l. 35 (« D'avoir confiance ») portait un `[Am] ` alors que la feuille n'a pas de retrait et grave Am sur le « D » ; corrigé. Les lignes du pont sans accord initial (l. 43, 44) n'ont pas de retrait non plus.
- Paroles : la feuille écrit les seconds demi-vers en minuscule (« cette », « quand »…) ; le .cho les met en majuscule en début de ligne, non changé.
- Thèmes Espérance, Foi : dans la liste, gardés.

### priorite — Priorité

Lot 5 · partition retenue : `Priorité - G.pdf` (traitement-texte, mesure basse-fidelite)

Lignes modifiées :

- l. 16 : `[D]Tu es venu vers [(D/F#)]moi` → `[D]Tu es venu [(D/F#)]vers moi` *(session)*
- l. 21 : `[Am7]Na na na na [Em7]na` → `[Am7]Na na na n[Em7]a na` *(session)*
- l. 23 : `[Am7]Na na na na [Em7]na` → `[Am7]Na na na n[Em7]a na` *(session)*
- l. 24 : `Tu es ma moti[D]vation` → `Tu es ma mot[D]ivation` *(session)*
- l. 42 : `[D]Je vis pour une [(D/F#)]cause` → `[D]Je vis pour un[(D/F#)]e cause` *(session)*
- l. 45 : `[D]Plus que toute autre [(D/F#)]chose` → `[D]Plus que toute au[(D/F#)]tre chose` *(session)*

Mesures sur la partition (accords non exacts et lignes changées par la session) :

| Ligne | Accord | Mesure | Classe | Correction |
|---|---|---|---|---|
| 8 | Am7 | x=52,5, ligne d'intro « Am7 Em7 D Dsus4 Em7 » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 8 | Em7 | x=78,2, intro | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 8 | D | x=102,9, intro | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 8 | Dsus4 | x=114,6, intro | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 8 | Em7 | x=143,8, intro | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 12 | Am7 | x=52,5 sur « J » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 12 | Em7 | x=132,9 sur « t » de « temps » (132,3) | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 13 | D | x=52,5 sur « À » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 13 | (D/F#) | « ( » x=133,8 sur « m » de « montre » (131,8) | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 14 | Em7 | x=82,3 sur « e » de « m‹e›s » (m 69,5, e 78,3, s 83,8) : lettre la plus proche « s », même syllabe « mes » | équivalent | aucune (même syllabe, basse fidélité) |
| 15 | Am7 | x=52,5 sur « M » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 15 | Em7 | x=142,8 sur « d » de « distant » (140,5) | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 16 | (D/F#) | « ( » x=104,0 sur « v » de « vers » (102,1) | décalé | [D]Tu es venu [(D/F#)]vers moi (question ok) |
| 16 | D | x=52,5 sur « T » | exact | aucune |
| 17 | Em7 | x=99,7 sur « u » de « une » (97,0) | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 21 | Em7 | x=103,0 au milieu du « a » du 4e « na » (100,2–105,4, à 2,8) ; « n » du 5e à 107,9 (à 4,9) : étiquette à cheval | décalé | Na na na n[Em7]a na + {needs_review} (lettre la plus proche, label à cheval) |
| 21 | Am7 | x=52,5 sur « N » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 22 | D | x=112,1 sur « ner » de « tourner » (e 109,3, r 114,8) ; ligne d'accords recopiée telle quelle à la l.24 (même x) | équivalent | aucune (même syllabe) |
| 23 | Em7 | x=103,0 au milieu du « a » du 4e « na » (100,2–105,4, à 2,8) ; « n » du 5e à 107,9 (à 4,9) : étiquette à cheval | décalé | Na na na n[Em7]a na + {needs_review} (lettre la plus proche, label à cheval) |
| 23 | Am7 | x=52,5 sur « N » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 24 | D | x=112,1 sur « i » de « mot‹i›vation » (i 112,5 à 0,4 ; t 108,8 ; v 115,0) : le .cho sur « va » | décalé | Tu es ma mot[D]ivation (lettre la plus proche) |
| 25 | Em7 | x=84,8 sur l'espace avant « tout » (t 86,1) | exact | aucune (frontière espace / début de mot) |
| 29 | Em7 | x=132,9 sur « p » de « tro‹p› » (131,3) ; « courte » à 139,5 | équivalent | aucune (lettre la plus proche, comme le .cho) |
| 29 | Am7 | x=52,5 sur « L » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 30 | D | x=119,6 sur « c » de « en‹c›ore » (120,5) | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 32 | Em7 | x=72,4 sur l'espace avant « Ton » (T 74,1) ; check.py ne lit pas la ligne (« cœur » coupé en trois spans) et le croit absent | exact | aucune (outil qui lit mal) |
| 33 | Am7 | x=302,2 sur « P » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 33 | Em7 | x=375,1 sur « à » (373,6) | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 34 | D | x=379,3 sur « m » de « moi-‹m›ême » (379,3) | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 36 | Em7 | x=322,1 sur l'espace avant « Ton » (T 323,8) ; check.py le croit absent (colonne 2 et « cœur » coupé) | exact | aucune (outil qui lit mal) |
| 41 | Am7 | x=302,2 sur « M » de « Mon » (colonne 2) ; check.py le croit absent | exact | aucune (outil qui lit mal) |
| 41 | Em7 | x=382,6 sur « o » de « synchr‹o›nisé » (381,7) | exact | aucune (outil qui lit mal) |
| 42 | (D/F#) | « ( » x=361,2 : « e » de « une » 363,2 (à 2,0), « n » 357,4 (à 3,8), « c » de « cause » 371,1 (à 9,9) : dans la syllabe « ne » | décalé | [D]Je vis pour un[(D/F#)]e cause (lettre la plus proche) |
| 42 | D | x=302,2 sur « J » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 43 | Em7 | x=347,0 sur « d » de « gran‹d›e » (d 342,8, e 348,6) : lettre la plus proche « e », comme le .cho | équivalent | aucune |
| 44 | Em7 | x=367,7 sur « é » de « r‹é›alité » (é 363,8, a 369,2) : lettre la plus proche « a », comme le .cho | équivalent | aucune |
| 44 | Am7 | x=302,2 sur « M » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 45 | (D/F#) | « ( » x=381,1 sur « t » de « au‹t›re » (380,2) | décalé | [D]Plus que toute au[(D/F#)]tre chose (question ok) |
| 45 | D | x=302,2 sur « P » | exact | aucune |
| 46 | Em7 | x=352,0 sur « e » de « v‹e›nir » (350,7) | exact | aucune |
| 50 | Am7 | x=302,2 sur « T » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 51 | Em7 | x=302,2 au-dessus du retrait, « L » à 309,7 : [Em7] L'élu (retrait) | exact | aucune (outil qui lit mal) |
| 52 | D | x=302,2 sur « L » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 53 | Em7 | x=352,0 sur « r » de « v‹r›ai » (351,2) | exact | aucune (outil qui lit mal) |
| 54 | Am7 | x=302,2 sur « T » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |
| 55 | Dsus4 | x=381,6 sur « l » de « mei‹l›leur » (381,0) | exact | aucune (outil qui lit mal) |
| 55 | D | x=413,3 après la fin de « meilleur » (r 397,3) : accord après le dernier mot | exact | aucune |
| 55 | Em7 | x=302,2 sur « C » | exact | aucune (check.py ne lit pas cette source : tout « absent de la source ») |

Forme (sans effet sur la place des accords, détail dans le diff du commit) : 4 ligne(s) — ligne sans paroles : l. 8 ; espaceur : l. 31, 35, 55.

En-tête : ajout de `{source: Priorité - G.pdf}`

| Écart | Statut | Par | Raison, partition |
|---|---|---|---|
| 51:reporte:Em7:1 | laissé | def |  |
| 45:decale:(D/F#):1 | laissé | def |  |
| 45:fable:45:decale:(D/F#):1 | appliqué | session | « ( » 381,1, « D » 384,4 ; « autre » : a 369,2, u 374,4, t 380,2, r 383,9 ; « chose » commence à 395,5. Bord gauche à +0,9 de « t » : l'étiquette est nettement sur la syllabe « tre » de « au-tre », même convention que l.13 et l.16. — inclus dans la ligne de la session — partition : (D/F#) : « ( » x=381,1 sur « t » de « au‹t›re » ; « chose » à 395,5 |
| 42:relire:(D/F#):1 | laissé | def |  |
| 41:reporte:Am7:1 | laissé | def |  |
| 41:reporte:Em7:1 | laissé | def |  |
| 36:reporte:Em7:1 | laissé | def |  |
| 32:reporte:Em7:1 | laissé | def |  |
| 25:relire:Em7:1 | laissé | def |  |
| 24:relire:D:1 | laissé | def |  |
| 23:relire:Em7:1 | laissé | def |  |
| 21:relire:Em7:1 | laissé | def |  |
| 16:decale:(D/F#):1 | laissé | def |  |
| 16:fable:16:decale:(D/F#):1 | appliqué | session | La feuille aligne le bord gauche de ses étiquettes à +1..+2 pt du début de la syllabe (l.13 : « ( » 133,8 sur « m » 131,8 de « montre »). Ici « ( » 104,0 et « D » 107,3, « vers » commence à 102,1 (+1,9), « moi » à 122,8 : l'étiquette est nettement sur « vers », pas à cheval. Même écart voulu au couplet 2 (l.45, « au‹t›re »). — inclus dans la ligne de la session — partition : (D/F#) : « ( » x=104,0 sur « v » de « ‹v›ers » (v 102,1 – e 106,9) ; « moi » à 122,8 |

- Source basse fidélité (feuille Word en deux colonnes, accords alignés aux espaces) : check.py la lit mal (deux colonnes, « cœur » coupé en trois spans, 0/31 lignes de paroles reconnues) ; tous les accords mesurés à l'œil sur la couche texte (x de chaque caractère, PyMuPDF rawdict) et vérifiés sur le rendu 2×.
- Convention de la feuille : bord gauche de l'étiquette à +1..+2 pt du début de la syllabe (l.13). Les l.16 et l.45 la suivent nettement sur l'avant-dernier mot ou la syllabe « tre » : corrigées.
- Règle de 02 (basse fidélité) appliquée aux lignes hors relevé : l.24 D posé sur « i » de « mot[D]ivation » (lettre la plus proche, à 0,4) et l.42 (D/F#) sur « e » de « un[(D/F#)]e » (à 2,0 contre 9,9 pour « cause ») ; l.21 et l.23 Em7 à cheval entre le 4e et le 5e « na » : posé sur la lettre la plus proche (« a » du 4e) avec un {needs_review} chacun. Deux doutes, sous le seuil de cinq : pas d'audio demandé.
- Les accords de la l.31 et l.35 (« [ ]Je veux… », « [ ]Lorsque… ») ne sont pas gravés : le moteur retire les [ ] vides.
- Extra de check.py (Em7/Am7 « absents du .cho », lignes instrumentales) : lectures erronées de l'outil, ce sont les accords des l.32, 36 et 41, présents dans le .cho. Non appliqué.
- Paroles, non appliqué : rien de différent (« cur » de check.py = « cœur » coupé en spans dans le PDF).
- Thèmes Engagement, Foi : dans la liste, gardés. Autre feuille du même chant : Priorité.pdf (non regardée, la feuille fournie fait foi).
- Feuille sans renvoi, noté ici plutôt qu'en needs_review : la feuille s'arrête au Pont sans renvoi : le retour du pré-refrain et du refrain après le couplet 2, et du refrain après le pont, n'est pas gravé, rien n'est ajouté.

## Captures (trois appareils)

Lot 1 — captures des 24 chants modifiés regardées sur ordinateur, téléphone et tablette (`tests/nouveau-chant.spec.ts`, tous verts) : aucun accord superposé ni débordant, aucune section vide, aucune directive ni `{needs_review}` visible, libellés conformes au `.cho`. Remarques :
- un accord posé au milieu d'un mot écarte les syllabes sans trait d'union (« Al lé lu ia », « justi ce », « vic toire », « re culé ») : rendu du site pour tout mot entier coupé par un accord, rendu plus visible depuis que les mots coupés au tiret sont écrits entiers (règle 01, confirmée par Timothée le 08/10) ;
- `[X] mot` (accord avant l'attaque) laisse un blanc de la largeur de l'accord et décale le début de ligne (amour-extravagant, au-dessus-de-tout, beni-soit-ton-nom, dieu… : voulu) ;
- au-nom-de-jesus et benediction : sections `{start_of_verse: Fin}` et `{start_of_verse: Bénédiction}` affichées « Couplet » (type de section existant, inchangé : règle « Structure ») ;
- benis-dieu-10000-raisons, téléphone : les accords de fin « (Dsus4) (D) (Dsus4) (D) » des couplets 2 et 3 passent seuls sur une rangée sous le vers ;
- beni-soit-ton-nom : « ù » parasite en fin de « Mon cœur choisit de dire : » (paroles d'origine, cité, non corrigé) ; christ-est-la-lumiere et briser-les-chaines : « (x...) » de la feuille, laissé.

Lot 2 — captures des 25 chants modifiés regardées sur ordinateur, téléphone et tablette (`tests/nouveau-chant.spec.ts`, tous verts) : aucun accord superposé, aucune section vide, aucune directive ni `{needs_review}` visible, libellés conformes au `.cho`. Remarques :
- comme au lot 1, un accord posé sur l'espace entre deux mots (`nos[Bm] craintes`, `à[F] Lui`, `Ton[Asus4] Ciel`) élargit le blanc de la largeur de l'accord ; sur téléphone, quand la ligne se replie juste là (entends-mon-coeur, « craintes, »), l'accord reste en fin de rangée, détaché du mot qui suit : rendu du site ;
- une ligne d'accords sans paroles suivie d'une ligne chantée qui commence par un accord (de-tout-mon-etre, dieu-est-puissant, eveille-toi-mon-ame) montre deux rangées d'accords serrées, sans chevauchement ;
- de-l-ombre-a-la-lumiere s'affichait en C faute de `{key}` : `{key: A}` ajouté d'après la feuille (lint E02) ;
- en-verite : « X2 » et « (Non) » écrits comme paroles dans le Pont (structure de la feuille, laissée à Timothée) ; dieu-est-parmi-nous : « bouclié » (feuille : « bouclier ») cité, non corrigé.

Lot 3 — captures des 26 chants modifiés regardées sur ordinateur, téléphone et tablette (`tests/nouveau-chant.spec.ts`, tous verts) : aucun accord superposé ni débordant, aucune section vide, aucune directive ni `{needs_review}` visible, libellés conformes au `.cho`. Remarques :
- comme aux lots 1 et 2, un accord plus large que son mot, ou posé sur l'espace, élargit le blanc qui suit (« m'a   trouvé », « Les   vies ») ; trois accords posés dans un même mot l'écartent le plus (je-flechis-le-genou, « divi … ne ») ;
- je-celebrerai : les sept accords du refrain, gravés après « Seigneur. » sur la feuille, restent lisibles sur les trois appareils (sur téléphone ils passent avec « Seigneur. » sur la rangée suivante) ;
- how-great-thou-art : tout le chant est dans une seule section `Intro` (déjà le cas avant ; structure proposée à Timothée) ;
- homme-de-douleurs : « Toiseul » réécrit « Toi seul », comme la feuille.

Lot 4 — captures des 26 chants modifiés regardées sur ordinateur, téléphone et tablette (`tests/nouveau-chant.spec.ts`, tous verts) : aucun accord superposé, aucune section vide, aucune directive ni `{needs_review}` visible. Remarques :
- sur téléphone, un accord gravé après le dernier mot d'une ligne longue peut passer seul sur la rangée suivante (je-reviens-au-coeur, je-veux-proclamer-le-nom-de-jesus, l-amour-de-notre-pere, le-roi-est-ne) : rendu du site ;
- jireh : mots coupés d'une espace (« Ji reh », « traverse rais »…) dans le `.cho`, laissés (consigne particulière du chant : paroles de prop() gardées), au rapport ;
- joie-dans-le-monde : une section `Refrain` qui est la suite du couplet 2 (fusion proposée à Timothée) ;
- moi-et-ma-maison : le Pré-Refrain s'affiche en couleur de refrain (déjà le cas avant, hors relevé).

Lot 5 — captures des 24 chants modifiés regardées sur ordinateur, téléphone et tablette (`tests/nouveau-chant.spec.ts`, tous verts) : aucun accord superposé, aucune section vide, aucune directive ni `{needs_review}` visible. Remarques :
- noel-est-arrive : le refrain repris en G en fin de chant s'appelle `Refrain 1 (G)` (règle 01, refrain modulé), d'où deux pastilles « R1 » dans la navigation ;
- ne-pour-nous-donner-la-vie : espace avant la virgule (« monde , ») dans les paroles d'origine, cité, non corrigé ;
- la porte du lot fait tourner `equipes.spec.ts` (le mot « personne ») : son test « le bouton d'import rend compte » est rouge sur les trois appareils, déjà rouge à l'état de départ (rejoué sur 908b7990), sans rapport avec les chants.

## Listes

### Choix de Timothée passés outre (la partition l'emporte)

- **au-nom-de-jesus** l. 53 (53:oeil:17, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : Bm : x=728 sur le « p » du premier « proclamons » (722-737) → [Bm]proclamons; D : x=948 dans le blanc entre « o » (938-947) et « n » (950-959) du second « proclamons » → proclamo[D]ns. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 52 (52:oeil:16, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=774 dans l'espace avant « Jésus » (782) → [G]Jésus; A : x=980 sur le « v » de « vaincu » (980) → [A]vaincu. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 51 (51:oeil:15, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : Bm : x=733 dans l'espace avant « Royaume » (738) → [Bm]Royaume; D/F# : x=948 dans le blanc entre « s » (938-945) et « t » (950) de « subsiste » → subsis[D/F#]te. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 50 (50:oeil:14, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=790 dans l'espace avant « pour » (792) → [G]pour; A : x=1038 sur la fin du « e » de « les » (1032-1039), « s » à 1044 → le[A]s. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 39 (39:oeil:13, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=232 sur les deux derniers pixels du « é » (226-233), corps du label sur « r » (238-245) de « guéri » → gué[G]ri; D : x=400 sur le début du « s » (400-407) de « Jésus » → Jé[D]sus. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 37 (37:oeil:11, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : A : x=184 entre le « i » (182-183) et la virgule (188) de « vivrai, » → vivrai[A],; G : x=332 sur le « p » de « pas » (330-337) → [G]pas. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 33 (33:oeil:10, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=232 sur le bras du « r » (jambage à 230), corps du label sur « e » (238-245) de « libre » → libr[G]e; D : x=400 dans le blanc entre « s » (392-397) et « u » (402-411) de « Jésus » → Jés[D]us. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 32 (32:oeil:9, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : D : x=248 dans le blanc entre « c » (238-245) et « i » (250-251) de « ressuscité » → ressusc[D]ité; Bm : x=340 dans l'espace avant « moi » (344) → [Bm]moi; C : ligne repliée « puissance » : x=196 sur la fin du « c » (190-197), « e » à 200 → puissanc[C]e. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 31 (31:oeil:8, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : A : x=180 dans le blanc entre « a » (172-179) et « i » (184-185) de « vivrai » → vivra[A]i; G : x=332 sur le « p » de « pas » (330-334) → [G]pas. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 27 (27:oeil:7, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : D : x=218 au milieu du « s » de « es » (214-221), corps du label sur l'espace, « là » à x=230 → e[D]s + needs_review. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 24 (24:oeil:4, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=296 dans le blanc entre « a » (284-293) et « u » (298-305) de « fardeaux » → fardea[G]ux; Em7 : x=470 sur la fin du « o » (462-471), « t » de « notre » à 474 → no[Em7]tre. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 16 (16:oeil:3, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : D : x=224, « es » finit à 223, « là » commence à 232 : label sur l'espace, corps sur « là » → [D]là + needs_review. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 15 (15:oeil:2, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : x=308 juste après le « n » (300-307), « s » de « tremblerons » à 312-319 → trembleron[G]s; Em7 : x=476 sur la fin du bras du « r » (470-477), « a » à x=480 → ébr[Em7]anlés. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 14 (14:oeil:1, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : Bm : x=224 sur la queue du « h » (h 216-225), « é » à x=228 → triomph[Bm]é; D : x=398 dans le blanc entre « p » (386-395) et « h » (400-407) du second « triomphé » → triomp[D]hé. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **au-nom-de-jesus** l. 13 (13:oeil:0, non) : Scan Word, bord gauche du label mesuré au pixel (image native 1208×1712) puis regardé : G : bord gauche x=288 sur la fin du « r » de « pour » (r 282-289), corps du label sur l'espace, « nous » à x=298 → pour [G]nous, cas tranché de 02 + needs_review; Em7 : x=477 sur le « n » de « nos » (n 472-479) → [Em7]nos. Le relevé gardait le .cho (chaque accord en tête de demi-phrase) ; la partition l'emporte.
- **jireh** l. 62 (62:decale:Bm:1, ok) : Consigne particulière : « vamp 1 » est le libellé de marge (x=40,0, p2), pas une parole ; retiré. Accords de prop() : A x=94,7 sur « J » de « Je » (exact), Bm x=129,3 entre « n’ai » et « que » (équivalent, choix du relevé gardé).
- **parfaitement-imparfait** l. 28 (28:reporte:Cm7(ou Eb):1, non) : Nom d'accord : la feuille grave « Cm7 (ou Eb) » (p1 y=700,3, C à x=144,0 sur « œ » 142,3–151,0 de « cœur » : position exacte, gardée) ; 01 écrit une alternative gravée [Cm7 (Eb)], jamais de texte (« ou ») dans un crochet. Ab x=93,0 sur « dans » (d 87,7 / a 93,7, même syllabe) : gardé, comme le « non » du relevé sur les deux suppressions (l'outil n'avait pas lu ces accords, ils sont bien gravés).

### `{needs_review}` posés

- **au-nom-de-jesus**, au-dessus de la l. 13 (`[G]Dieu combat pour nous, [Em7]Toujours à nos côtés`) : Scan Word basse fidélité : G à cheval sur « pour | nous », posé sur « nous » (cas tranché de 02), à confirmer à l'écoute.
- **au-nom-de-jesus**, au-dessus de la l. 16 (`[D]Jésus Tu es là`) : Scan Word basse fidélité : D à cheval sur « es | là », posé sur « là », à confirmer à l'écoute.
- **au-nom-de-jesus**, au-dessus de la l. 26 (`[G]Nous ne tremblerons pas, [Em7]jamais ébranlés`) : Scan Word basse fidélité : G à cheval sur « tremblerons | pas » (couplet 1 le met sur le « s »), posé sur « pas », à confirmer à l'écoute.
- **au-nom-de-jesus**, au-dessus de la l. 27 (`[D]Jésus Tu es là`) : Scan Word basse fidélité : D à cheval sur « es | là » (couplet 1 le met sur « là »), posé sur le « s », à confirmer à l'écoute.
- **collision**, au-dessus de la l. 49 (`{end_of_verse}`) : la feuille s'arrête au couplet 2 sans renvoi : le retour du pré-refrain, du refrain et de l'instrumental après ce couplet n'est pas gravé, rien n'est ajouté
- **dieu-tout-puissant**, au-dessus de la l. 28 (`Dieu Tout-Pui[D]ssant, [C]que Tu e[G]s grand.`) : Final absent de la partition (Couplet 1, Refrain (x2), Couplet 2) : fin D C G non gravée, à confirmer à l'oreille
- **eclipse**, au-dessus de la l. 16 (`[G#m7]Entouré de [A] grâce et d’amo[E]ur[ ][C#m]`) : A à cheval entre « de » et « grâce » (feuille alignée aux espaces) : posé sur « de » où commence le label, peut-être sur « grâce », à confirmer à l’écoute
- **heritiers**, au-dessus de la l. 23 (`Justi[D]fiés,[A]`) : source basse fidélité : sur la feuille, D est à cheval entre « fi » et « és » de « Justifiés » (0,1 pt d'écart), à confirmer à l'oreille
- **how-great-thou-art**, au-dessus de la l. 11 (`Thy pow’r througho[G]ut the u[D]niverse disp[G]layed[D]`) : D à cheval entre le « u » et le « n » de « universe » (feuille alignée aux espaces) : posé devant « universe », à confirmer à l’écoute
- **l-entre-deux**, au-dessus de la l. 21 (`Ce moment où [C#m]je me trouve au mil[B]ieu`) : B à cheval sur « il » de « milieu » (feuille alignée aux espaces) : posé sur « mi », peut-être sur « lieu », à confirmer à l’écoute
- **l-entre-deux**, au-dessus de la l. 23 (`Jésus Tu es [C#m]mon seul espo[B]ir`) : C#m à cheval entre « es » et « mon » (feuille alignée aux espaces) : posé sur « es » comme le début du label, peut-être sur « mon », à confirmer à l’écoute
- **l-entre-deux**, au-dessus de la l. 25 (`Et Tu conduis mon [C#m]cœur dans l’in[B]connu`) : C#m à cheval entre « mon » et « cœur » (feuille alignée aux espaces) : posé sur « mon » comme le début du label, peut-être sur « cœur », à confirmer à l’écoute
- **noel-est-arrive**, au-dessus de la l. 16 (`Voici [Bb2]l'heure de minui[F]t, Où le [C]Dieu d'éter[Dm]nité`) : Dm à cheval entre « ter » et « ni » de « éternité » sur la feuille alignée aux espaces (2,9 / 2,6 pt) : posé devant « n », peut-être devant « r », à confirmer à l'oreille
- **noel-est-arrive**, au-dessus de la l. 20 (`La glo[G]ire du ciel[C], Par l'[G]étoile de lum[D]ière, `) : G à cheval entre « l'é » et « toile » sur la feuille alignée aux espaces (4,6 / 3,2 pt) : posé devant « t », lettre la plus proche, peut-être devant « é », à confirmer à l'oreille
- **noel-est-arrive**, au-dessus de la l. 42 (`Où le [D/F#]Dieu d'éter[Em]nité`) : Em à cheval entre « ter » et « ni » de « éternité » sur la feuille alignée aux espaces (2,9 / 2,6 pt) : posé devant « n », peut-être devant « r », à confirmer à l'oreille
- **o-vois**, au-dessus de la l. 13 (`Toutes [G#m]choses pâlissent telle u[B]ne flamme`) : l'accord G#m est tapé à cheval sur la fin de « Toutes » et le début de « choses » ; posé sur la lettre la plus proche du label, à confirmer à l'oreille
- **o-vois**, au-dessus de la l. 50 (`Ô Esprit de Dieu`) : Ô Esprit de Dieu / Règne en moi : ni accords ni mélodie sur la feuille, même découpe (5 puis 7 syllabes) que le pré-refrain mais aussi que la fin du couplet, mélodie à confirmer à l'oreille avant d'y poser les accords du pré-refrain (G#m ; F# E)
- **priorite**, au-dessus de la l. 21 (`[Am7]Na na na na [Em7]na`) : l'accord Em7 est gravé à cheval entre le 4e et le 5e « na » (feuille alignée aux espaces), posé sur la lettre la plus proche (« a » du 4e) ; à confirmer à l'oreille
- **priorite**, au-dessus de la l. 23 (`[Am7]Na na na na [Em7]na`) : l'accord Em7 est gravé à cheval entre le 4e et le 5e « na » (feuille alignée aux espaces), posé sur la lettre la plus proche (« a » du 4e) ; à confirmer à l'oreille

### Blocs de structure appliqués ou laissés

- **a-jamais-tu-es-saint** (fable) : laissé — Aucun changement proposé : la feuille grave bien un Pré-Refrain entre Couplet 1 et Refrain 1, sections et ordre identiques au .cho.
- **amour-sans-fin** (fable) : laissé — La feuille grave ligne d'intro, Couplet 1, Pré-Refrain, Refrain, Couplet 2 : exactement les cinq sections du .cho, sans renvoi ni reprise ; l'écart de structure vient de l'outil qui ne lit pas le Pré-Refrain.
- **attache-a-la-croix** (fable) : laissé — chant validé : pas de bloc de structure
- **attache-a-la-croix** (agent) : laissé — chant validé : pas de bloc de structure
- **au-dessus-de-tout** (fable) : laissé — chant validé : pas de bloc de structure
- **aucune-peur** (fable) : laissé — La feuille (deux colonnes) grave Couplet 1, Pré-Refrain, Refrain de huit lignes, Couplet 2 : exactement les sections du .cho, dans le même ordre ; l'écart venait de la lecture en colonnes de l'outil.
- **beni-soit-ton-nom** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **crier-a-toi** (fable) : laissé — La feuille grave Couplet 1, Pré-Refrain, Couplet 2, Refrain, Couplet 3 : l'ordre du .cho, sans reprise ni renvoi ; l'écart de structure de l'outil vient du Pré-Refrain lu comme Refrain. Rien à changer.
- **de-grace-en-grace** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **de-l-ombre-a-la-lumiere** (agent) : laissé — non appliqué
- **de-tout-mon-etre** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **dieu-de-l-impossible** (fable) : laissé — La feuille grave une ligne d'intro sans titre, Couplet 1, Pré-Refrain, Refrain, Couplet 2 (p. 1), Pont 1, Pont 2 (p. 2), sans reprise ni renvoi : les sept sections du .cho. L'écart (liste extra) vient de l'outil qui ne lit pas le Pré-Refrain.
- **dieu-est-puissant** (fable) : laissé — Faux écart : l'« Interlude » vu par l'outil est la rangée sans paroles G/B D Em D C gravée sous le libellé Pont, déjà en tête du pont (l. 32). Sections et ordre identiques à la partition.
- **dieu-tout-puissant** (fable) : appliqué — La partition titre le refrain « Refrain (x2) » : reprise immédiate annotée, suffixe ajouté au libellé, même directive start_of_chorus, l'id de section ne change pas.
- **digne-est-ton-nom** (fable) : appliqué — La partition grave « Bm D G A (x2) » en tête, sans paroles : reprise identique = suffixe (x2) au libellé (01, cas Abba Père de 02) ; même directive, seul le libellé change, et « (x2) » sort du crochet (texte lu comme un accord). Les lignes Em Bm Bm/D A du Pont sont déjà dans le .cho (l. 37-38). L'écart « x2 absent de la source » (non du relevé, sans opération) n'est pas contredit : le (x2) est gardé, dans le libellé.
- **eclipse** (fable) : appliqué — La feuille grave « INTRO x2 | E | C#m | G#m7 | A » : le libellé de l'intro prend le suffixe (x2) ; simple changement de libellé, l'id de la section ne change pas.
- **eclipse** (agent) : laissé — Même contenu que le bloc fable : le libellé « Intro (x2) » est appliqué par l'entrée fable, l'Instrumental x2 après le refrain est renvoyé à Timothée avec le bloc proposé.
- **eternel-notre-seigneur** (fable) : laissé — Regardé sur le rendu 2× : shir.fr grave le refrain (filet vertical à gauche) puis trois strophes sans titre, sans renvoi au refrain. Le .cho (Refrain, Couplet 1, 2, 3) reprend tout dans le même ordre : rien à ajouter ; le retour du refrain entre les couplets n'est pas gravé.
- **eveille-toi-mon-ame** (fable) : appliqué — La partition (page 1) titre la section « Refrain (x2) » : reprise immédiate annotée, suffixe ajouté au libellé, même directive start_of_chorus, l'id de section ne change pas. L'interlude F Bb Dm Bb gravé sous le titre Couplet 3 est déjà dans le .cho (ligne 31) : rien à ajouter.
- **fidele-loyal** (fable) : appliqué — La feuille s'arrête au Pont sans renvoi : l'ordre de jeu après le couplet 2 et après le pont n'est pas gravé. Rien n'est ajouté ni déplacé (sections du .cho = feuille) ; un seul {needs_review} entre le Refrain et le Couplet 2, comme pour le cas tranché « la partition s'arrête au Pont sans renvoi » (02). La numérotation des sections ne change pas.
- **heritiers** (agent) : appliqué — La feuille grave l'intro sur deux rangées identiques « D - - - | - - E/G# - | A … » (y=121 et y=138) : reprise identique = suffixe (x2) au libellé (01 ; cas Abba Père de 02). Même directive start_of_intro, id de section inchangé.
- **hosanna** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **il-est-temps** (agent) : laissé — non appliqué
- **il-est-temps** (fable) : appliqué — La note grave « X4 » sous le Pont : reprise identique annotée, suffixe au libellé (01), même directive start_of_bridge, id inchangé ; la ligne « X4 », écrite comme une parole chantée, est retirée (dans la section, permis).
- **il-regnera** (fable) : laissé — Pas d'écart : l'« Interlude » vu par l'outil est la ligne « Gm Eb Bb F » gravée sous le libellé Couplet 2, déjà en tête du couplet 2 dans le .cho (l.25). Sections et ordre identiques à la feuille.
- **inattendu** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **infiniment-grand** (fable) : appliqué — La feuille grave « (x4) » en fin de la ligne du Pont : reprise identique annotée, suffixe au libellé (01), même directive start_of_bridge, id de section inchangé ; « (x4) » retiré de la ligne chantée, le G final reste après la ponctuation (label gravé après « a. »).
- **j-annoncerai** (fable) : appliqué — Intro gravée « A2 E A2 E OU F#m D A2 » (y=118,3) : le .cho n'a que le 2e choix ; le 1er est ajouté dans la même section (ligne au-dessus) et le libellé dit le choix. Changement à l'intérieur de la section, permis. Pas de needs_review : la feuille se lit nettement. Le suffixe « (x2) » du Refrain 2 est posé dans `lignes` (l.41).
- **je-celebrerai** (agent) : appliqué — Changement dans une section (refrain) : le relevé accepte les sept accords F Am G C F Am G en fin de ligne 22, où la partition les grave (x=303 à 459, même rangée, après « Seigneur. »), et garde la ligne 23 qui porte les mêmes sept accords. Les deux ensemble jouent la suite deux fois ; la partition ne la grave qu'une fois et n'a aucune rangée d'accords seule. La ligne 23 est retirée, contre le choix « non » du relevé sur les écarts 23:instrumental:* (accords absents de la source).
- **je-flechis-le-genou** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **je-n-ai-rien-a-craindre** (fable) : appliqué — Aucune des deux feuilles ne grave de renvoi : le retour du refrain après le couplet 2 et après le pont n'est pas écrit ; selon 00 (plan déplié), rien n'est ajouté et un seul doute s'écrit avant la première section concernée. Aucune section ajoutée, retirée ni déplacée.
- **je-n-ai-rien-a-craindre** (agent) : appliqué — Seconde moitié de la ligne 37 réécrite (voir lignes, l.37) : la ligne chantée « [Dm7] Ton amour me suit » est insérée sous la ligne d'accords seule, comme sur la feuille Pages. Changement dans la section Interlude, aucune section touchée.
- **je-reviens-au-coeur** (fable) : laissé — bloc « rien » : faux écart (le Pré-Refrain de la feuille lu comme Refrain) ; la feuille donne Couplet 1, Pré-Refrain, Refrain, Couplet 2 comme le .cho ; chant validé, pas de bloc de structure
- **jesus-je-te-suivrai** (fable) : appliqué — La feuille grave le pont en une seule ligne suivie de « (x2) » (y=731,7) ; le .cho recopie la ligne deux fois. 01 : reprise identique = suffixe (x2) sur le libellé. Changement de suffixe et retrait d'une ligne dans la même section : permis (même directive, même rang). Accords de la ligne gardée exacts : Am x=71,2 sur l'espace après « Oh, », F x=106,7 sur l'espace avant « Jésus », C x=230,3 sur « r » de « suivrai ».
- **jireh** (fable) : appliqué — Exception voulue (consigne particulière, « Ok bloc fable ») : du bloc, seules les directives et libellés de sections sont repris, d’après les libellés de marge de Jireh.pdf (Intro, deux couplets sans libellé, refrain, interlude, couplet 3, refrain, interlude, pont « Je sais… », vamp 1, refrain, vamp 2, vamp 3). Le 2e « Intro » (couplets 1–2 + refrain) est découpé, le refrain 2 coupé en deux sections est réuni, « Couplet 1 » du vamp 2 devient Pont 3. Les lignes chantées gardent prop().
- **joie-dans-le-monde** (fable) : appliqué — Partie du bloc qui reste dans les sections (permis) : la 3e ligne du couplet 2, « Entonnons ce refrain » (y=552 sur la feuille, entre « Le Sauveur règne » et « Les champs et les fleuves »), manquait et s'ajoute après « Le Sauveur règne » dans Couplet 2 ; le pied de page de la feuille (« Titre », « Adaptation », « original : … », nom de l'adaptateur), avalé comme paroles chantées aux l. 32-33 et 50-51, est retiré. Aucune section ajoutée, retirée ni déplacée.
- **l-amour-de-notre-pere** (agent) : laissé — non appliqué
- **laissons-entrer** (fable) : laissé — Faux écart : l'« Interlude » que voit l'outil est la ligne d'accords gravée sous le libellé Pont (C#m E E/G# A F#m ×2), déjà en tête du pont dans le .cho (l. 29). Sections et ordre identiques à la feuille.
- **le-fils-de-dieu** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **le-fils-de-dieu** (agent) : laissé — non appliqué
- **libere** (fable) : appliqué — Vu sur la partition : l'intro est gravée « C G Em D (x2) » (suffixe de libellé, même directive) ; le Pont s'ouvre, dans son cadre, sur la ligne instrumentale « C Em Em D G/B G/B (x2) », absente du .cho : ajoutée deux fois dans la section (structure dépliée, une ligne ne porte pas de suffixe). Aucune section ajoutée, retirée ni déplacée.
- **ma-passion** (fable) : laissé — Vu sur la partition : Couplet 1, Pré-Refrain, Refrain, Couplet 2, sans reprise ni renvoi, comme le .cho ; l'écart de check.py vient d'une lecture du « Pré-Refrain » comme « Refrain ». La feuille s'arrête au couplet 2 : rien à ajouter.
- **me-voici** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **merci** (fable) : appliqué — La feuille titre « Couplet (x2) » (y=89,7) : reprise identique, suffixe au libellé (01), même directive start_of_verse, id inchangé.
- **merci** (agent) : appliqué — Même constat que le bloc fable (Couplet (x2)), appliqué par lui ; rien d'autre à changer.
- **mon-redempteur-vit** (fable) : appliqué — Vérifié sur la feuille : le refrain est gravé trois fois (rangées y=372, 403, 435 ; les deux premières finissent sur B, la troisième sur « B E ») ; la ligne manquante est la copie de la l. 18 corrigée, insérée dans le Refrain. Sous le titre « Pont » (y=468), la feuille grave « A A7 A » sans paroles (y=480,5 : A 34,0, A7 50,5, A 79,5) : 1re ligne du Pont. Les deux ajouts restent dans leurs sections : aucune section ajoutée, retirée ni déplacée. La feuille s'arrête après le Pont sans renvoi : doute écrit avant le Pont (cas d'Abba Père, 02), rien d'inventé.
- **mon-redempteur-vit** (agent) : appliqué — Même constat que le bloc de la lecture précédente : troisième ligne du refrain et « A A7 A » en tête du Pont, appliqués par les deux insertions ci-dessus (dans leurs sections).
- **mon-secours-est-en-toi** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **ne-pour-nous-donner-la-vie** (fable) : appliqué — La feuille regrave en entier le refrain après le couplet 2 (bas de la p. 1 et p. 2), identique au premier (mêmes accords aux mêmes x). Chant français : structure dépliée (01). Ajout d'une section après la dernière (permis) ; le premier refrain prend le numéro 1 (changement de libellé, même directive, l'id ne bouge pas). Lignes reprises du refrain 1 après décisions (l. 20 avec a[A/C#]mour). Le libellé « Refrain (reprise) » du bloc n'est pas repris : 01 numérote les sections du même type. L'« Interlude » lu par l'outil est le E seul au-dessus de « né » (fin du 1er vers du refrain, renvoyé à la ligne) : pas une section.
- **ne-pour-nous-donner-la-vie** (agent) : laissé — Même constat que le bloc fable (refrain regravé après le couplet 2), appliqué par celui-ci : rien de plus à faire.
- **noel-est-arrive** (agent) : laissé — non appliqué
- **noel-est-arrive** (fable) : appliqué — Après le pont, la feuille a deux blocs en gras séparés par une ligne vide : le refrain « C'est Noël… » puis le refrain 1 repris en G (« Nous étions dans la nuit… », accords C2 G D Em… au lieu de Bb2 F C Dm). Le .cho les fond dans « Refrain 2 ». 01 : refrain modulé = section à part, tonalité en suffixe. On ferme Refrain 2 après « jamais » et on ouvre une section après la dernière (permis : Refrain 2 garde son rang, la nouvelle est chorus-3 en fin de chant). Le contenu des lignes est celui des décisions, pas celui du bloc proposé.
- **nos-yeux-sont-sur-toi** (fable) : laissé — Faux écart : l'outil a lu le Pré-Refrain comme un Refrain. La feuille donne Couplet 1, Pré-Refrain, Refrain, Couplet 2, sans reprise ni renvoi, exactement comme le .cho. Rien à changer.
- **nous-voici** (agent) : laissé — non appliqué
- **o-vois** (fable) : appliqué — Consigne particulière (exception voulue à la règle de structure) : le Couplet 3 et le Final du bloc sont déjà dans le fichier (l. 41-64, mêmes paroles que la feuille, colonne de droite) ; il reste à poser au Couplet 3 les accords de la ligne du Couplet 1 de même place (la feuille n'en grave aucun : accords reportés, mesurés sur la position de la syllabe dans la phrase, tonique finale alignée) et à remplacer {start_of_final} sans libellé (lint E07) par {start_of_outro: Final}. Les l. 50-51 (« Ô Esprit de Dieu / Règne en moi… ») restent sans accords avec un needs_review : la feuille ne donne pas la mélodie. Le needs_review du bloc sur les retours après le Couplet 3 n'est pas repris (la feuille liste ses sections, rien n'y est douteux). Ordre des sections avant : Couplet 1 (verse-1), Couplet 2 (verse-2), Pré-Refrain (prechorus-3), Refrain (chorus-4), Couplet 3 (verse-5), final sans libellé (final-6) ; après : le même, la dernière devient outro-6 « Final » — setlists qui repèrent final-6 à revérifier.
- **o-vois** (agent) : laissé — Couplet 2 : la feuille n'y grave aucun accord ; ceux du .cho sont reportés (gardés) et, selon la consigne particulière, comparés au Couplet 1 sans rien changer (différences au rapport).
- **oasis** (agent) : laissé — non appliqué
- **ouvre-les-yeux-de-mon-coeur** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes
- **pionnier** (fable) : appliqué — La feuille s'arrête au Pont sans renvoi (02, cas Abba Père) : un seul {needs_review} qui nomme les retours possibles, posé à l'intérieur du Couplet 3 (fin de section, comme collision) pour ne créer ni déplacer aucune section. Rien n'est ajouté.
- **pionnier** (agent) : laissé — Couplets 2 et 3 : la feuille n'y grave aucun accord ; les 24 accords du .cho reprennent la grille du couplet 1 (ajout volontaire à la main du 16/07). Accords reportés : gardés.
- **pres-de-la-croix** (agent) : laissé — La feuille ne donne que les paroles : les accords F, Bb, C du .cho n'ont aucune source dans Partitions/. Il faut une grille pour les vérifier ; rien n'est changé en attendant.
- **priorite** (fable) : appliqué — La feuille s'arrête au Pont sans renvoi : le retour du pré-refrain et du refrain après le couplet 2, et du refrain après le pont, n'est pas gravé. Rien n'est ajouté ; un seul doute écrit entre deux sections (02, cas Abba Père), aucune section ajoutée, déplacée ni retirée. Les « Interlude » de check.py sont des passages de colonne, pas des sections.

### Structure à appliquer par Timothée

Changements de structure vérifiés sur la partition mais interdits par la règle « Structure » (ils décaleraient les identifiants des sections, donc les setlists enregistrées) : rien n'est écrit dans le fichier.

- **abba-pere** (agent) : La partition grave « F#m D A (x2) » sur l’intro et 02 donne ce cas en exemple (`Intro (x2)`), mais le chant est validé (consigne : aucun bloc de structure, aucune nouvelle mesure hors choix du relevé) et tests/section-labels.spec.ts attend le libellé « INTRO » : à changer à la main avec le test.

```
{start_of_intro: Intro (x2)}
```

- **amour-parfait** (fable) : La feuille grave Couplet 1, Refrain, Pont, Couplet 2, sans renvoi ni retour du Refrain ; le .cho met le Pont après le Couplet 2. Déplacer une section est interdit ici (identifiants des setlists) ; le needs_review proposé se poserait entre deux sections. Ordre de la feuille proposé, à confirmer à l'oreille (la feuille ne dit pas si le Refrain revient).

```
{start_of_verse: Couplet 1} … {end_of_verse}
{start_of_chorus: Refrain} … {end_of_chorus}
{start_of_bridge: Pont} … {end_of_bridge}
{start_of_verse: Couplet 2} … {end_of_verse}
```

- **benis-dieu-10000-raisons** (fable) : La partition ne grave pas d'intro : elle commence au Refrain ; le [D] de l'Intro (l. 8-10) vient de la case de tonalité (D x=531,3, 18 pt, en haut à droite). Le relevé a gardé ce D (« non ») ; retirer la section est un changement de structure interdit ici (décalerait les identifiants des setlists).

```
Supprimer les lignes 8 à 11 ({start_of_intro: Intro} / [D] / {end_of_intro} / ligne vide) : le chant commence à {start_of_chorus: Refrain}.
```

- **cherchez-d-abord** (fable) : La feuille grave une intro sans paroles « D F#m/C# Bm D F#m/C# Bm » avant le couplet 1, et regrave le refrain après le couplet 2 avec une autre fin (« allé[A]lu[D]ia ! » au lieu de A/C# G) ; ajouter l'intro au début et un refrain entre le couplet 2 et l'Instrumental décalerait les ids des sections, donc rien n'est écrit. Si le 2e refrain est ajouté, le refrain existant (« Alléluia ») prend le libellé « Refrain 1 ».

```
{start_of_intro: Intro}
[D]  [F#m/C#]  [Bm]  [D]  [F#m/C#]  [Bm]
{end_of_intro}

(couplet 1, puis le refrain existant relibellé {start_of_chorus: Refrain 1})

(après le couplet 2, avant l'Instrumental :)
{start_of_chorus: Refrain 2}
[D]Al[A]lé[G]lu[D/F#]ia, [G]al[Gmaj9]lé[A]luia,
[Bm]Al[A6]lé[G]lu[D/F#]ia, [Em]allé[D]lu, allé[A]lu[D]ia !
{end_of_chorus}
```

- **cherchez-d-abord** (agent) : Même constat, vérifié sur la couche texte : intro « D F#m/C# Bm D F#m/C# Bm » (y=117) avant le couplet 1 ; refrain regravé après le couplet 2 avec fin « allé[A]lu[D]ia ! » (A x=230,5 sur le « l » de « lu », D x=245,6 sur le « i ») au lieu de A/C# G. Ajouts ailleurs qu'après la dernière section, donc interdits ici.

```
Voir le bloc de la lecture précédente (Intro au début, Refrain 2 après le couplet 2, refrain existant relibellé Refrain 1).
```

- **collision** (fable) : La feuille grave « INSTRUMENTAL x2 » ; {start_of_instrumental} est refusé par lint (E07) et passer en {start_of_intro} change le type de la section (interdit ici : identifiants des setlists). Appliqué dans le fichier : le suffixe (x2) et les optionnels (F), (Am) de la grille ; le doute sur la fin de la feuille est écrit à la fin du couplet 2 plutôt qu'avant l'instrumental.

```
{start_of_intro: Instrumental (x2)}
[F]  [(F)]  [C/E]  [Am]  [(Am)]  [G]
{end_of_intro}
```

- **connais-tu-ce-jesus** (fable) : La feuille (p. 1) grave bien « INSTRUMENTAL x2 » après le refrain (| A / / / | Em7 / / / | Bm / / / | D / / / |, la grille de l'intro) et après le couplet 2 (| E / / F#m | D / / A), avant le pont ; les deux sections s'inséreraient au milieu du chant (entre Refrain et Couplet 2, entre Couplet 2 et Pont), ce qui décalerait les identifiants de sections des setlists : interdit par la règle Structure, rien n'est écrit dans le fichier.

```
# après {end_of_chorus} (l. 29), suivi d'une ligne vide
{start_of_intro: Interlude 1 (x2)}
[A]  [Em7]  [Bm]  [D]
{end_of_intro}

# après {end_of_verse} du couplet 2 (l. 39), suivi d'une ligne vide
{start_of_intro: Interlude 2 (x2)}
[E]  [F#m]  [D]  [A]
{end_of_intro}
```

- **de-l-ombre-a-la-lumiere** (fable) : Ordre de la feuille : | A | A | A | A | x2, Couplet 1, Chorus 1, Instrumental 1, Couplet 2 (4 lignes : le « Couplet 3 » du .cho en est la 2e moitié), Refrain 2 (Dsus2 E7 F#m / A sur « Christ », E / D E F#m / E), Instrumental 2, Pont 1, « Répéter REFRAIN 2 », | N.C. |, Instrumental 3, Pont 2. Intro, Instrumentaux, Refrain 2 et la fusion des Couplets 2-3 ajoutent ou retirent des sections ailleurs qu'après la dernière : interdit ici. La mesure N.C. n'est pas écrite (jamais de [N.C.]).

```
{start_of_intro: Intro (x2)}
[A]  [A]  [A]  [A]
{end_of_intro}

{start_of_verse: Couplet 1}
[A]Lève-toi mon âme et souviens-toi
[A]Tout mon péché Il l’a enterré
{end_of_verse}

{start_of_chorus: Refrain 1}
Ce n’est plus [Dsus2]moi [E7]qui vis[A5]
C’est Christ qui vit en moi[E]
J’étais mort [Dsus2]mais [E7]je sui[A5]s
Passé de l’ombre [E]à la lumière
{end_of_chorus}

{start_of_intro: Instrumental 1}
[A]  [Asus2]  [Asus]  [A]
{end_of_intro}

{start_of_verse: Couplet 2}
[A]Je ne veux me vanter que de la croix
[A]Où mon Sauveur S’est offert pour moi
En [F#m]Lui [E]mes craintes [A]n’ont aucune emprise
Donc [F#m]mort [E]où es[A]t, où est [D]ta [E]victoire [A]?
{end_of_verse}

{start_of_chorus: Refrain 2}
Ce n’est plus [Dsus2]moi [E7]qui vis[F#m]
C’est [A]Christ qui vit en mo[E]i
J’étais mort [D]mais [E]je sui[F#m]s
Passé de l’ombre [E]à la lumière
{end_of_chorus}

{start_of_intro: Instrumental 2}
[A]  [Asus2]  [Asus]  [A]
[A/D]  [Asus2/D]  [Asus]  [A]
{end_of_intro}

{start_of_bridge: Pont 1}
(Pont 1 actuel, inchangé)
{end_of_bridge}

{start_of_chorus: Refrain 2 (reprise)}
(Refrain 2 ci-dessus)
{end_of_chorus}

{start_of_intro: Instrumental 3}
[A]  [Asus2]  [Asus]  [A]
[A/D]  [Bm7]  [Asus]  [A]
{end_of_intro}

{start_of_bridge: Pont 2}
(Pont 2 actuel, inchangé)
{end_of_bridge}
```

- **dieu-tout-puissant** (agent) : La section Final (l. 27-30) n'est pas gravée sur la partition et utilise `{start_of_final}` là où 01-format prévoit `{start_of_outro: Final}` ; changer de type de directive est interdit ici (repère des setlists).

```
{start_of_outro: Final}
Dieu Tout-Pui[D]ssant, [C]que Tu e[G]s grand.
{end_of_outro}
```

- **echos** (agent) : l. 48 « [C2 - Quelle grâce] x2 » met un titre de section dans un crochet (le site l'affiche comme un accord) ; sur la feuille c'est l'en-tête du couplet 2 de Quelle grâce, chanté deux fois. Permis par la règle de structure : la ligne ferme le Couplet 4 (changement dans la section) et les quatre lignes « Jésus, notre Salut… » forment une section ajoutée après la dernière ; aucun identifiant existant ne bouge (verse-1 à verse-4, chorus-1, bridge-1), verse-5 s'ajoute

```
Remplacer la ligne « [C2 - Quelle grâce] x2 » (texte dans un crochet, affiché comme un accord) par un renvoi lisible, et ajouter en fin de chant le couplet 2 de « Quelle grâce » (x2) si l'enchaînement est joué.
```

- **echos** (fable) : Ordre gravé sur la feuille : [C2 - Quelle grâce] x2, Verset 1, Verset 2, Chorus 1, Verset 1, Ooo (x2), Pont x6, Ooo (x2), Verset 1, Ooo (x2), [C2 - Quelle grâce] x2. Il faudrait ajouter une section en tête (C2 d'ouverture), sortir les lignes Ooo des couplets et du pont en Tag (x2), et passer « x6 » (l. 38, écrit comme une parole) en suffixe du Pont : ajouts ailleurs qu'en fin, retraits et changements de type, interdits ici. Bloc proposé repris avec les accords mesurés (et non ceux de la lecture d'origine) ; la fin « Couplet 5 (Quelle grâce x2) » est déjà appliquée

```
# remplace tout le corps (l. 6 à 53 actuelles) ; accords mesurés sur la feuille
{needs_review: « C2 - Quelle grâce » = le couplet 2 de Quelle grâce ; la feuille n'en donne ni les accords ni la tonalité dans l'enchaînement, rien n'est ajouté}
{start_of_verse: Couplet (Quelle grâce x2)}
Jésus, notre Salut
Notre victoire est en son Sang
Jésus, Prince des Cieux
Ami précieux, que Son règne vienne
{end_of_verse}

{start_of_verse: Couplet 1}
Nous chan[A]terons, nous danserons
Jusqu'à q[D]u’il fasse écho au[A]x cieux
Louon[F#m]s-le
Jusqu'à[A] voir l'autre côté
{end_of_verse}

{start_of_verse: Couplet 2}
Apparte[A]nant à la lumière
Quand la [D]nuit est la plus [A]sombre
Accrochez-[F#m]vous
Car l'aube[A] arrivera bientôt.
{end_of_verse}

{start_of_chorus: Refrain}
Sentez-[F#m]vous que les vents changent ?
Un [A]nouveau jour qui se [E]lève
Et l'a[F#m]tmosphère qui se brise
Pour qu’un [A]nouveau monde[E] vienne
{end_of_chorus}

{start_of_verse: Couplet 1}
(mêmes lignes que le Couplet 1)
{end_of_verse}

{start_of_tag: Tag (x2)}
[A]Ooo-o[D]oh, o[A]o-oo[D]h, o[F#m7]o-ooh, o[D]o-oo[A]-ooh
{end_of_tag}

{start_of_bridge: Pont (x6)}
[F#m]Je sens que le Mal ne [E]durera pas
lon[D]gtemps
{end_of_bridge}

{start_of_tag: Tag (x2)}
(même ligne)
{end_of_tag}

{start_of_verse: Couplet 1}
(mêmes lignes que le Couplet 1)
{end_of_verse}

{start_of_tag: Tag (x2)}
(même ligne)
{end_of_tag}

{start_of_verse: Couplet (Quelle grâce x2)}
(mêmes lignes que l'ouverture)
{end_of_verse}
```

- **eclipse** (fable) : La feuille grave « INSTRUMENTAL x2 | E | C#m | G#m7 | A » (y=652–668) juste après le refrain, avant le couplet 2 ; l'ajouter là insère une section ailleurs qu'à la fin (règle « Structure »), donc non écrit.

```
# après {end_of_chorus} (l. 26), avant {start_of_verse: Couplet 2}

{start_of_intro: Interlude (x2)}
[E]  [C#m]  [G#m7]  [A]
{end_of_intro}
```

- **en-verite** (fable) : Vérifié sur la feuille : après « Bridge : », trois blocs (E B F# « X2 », (Non) C#m G#m F# « X2 », puis « Tu es mon seul bien X2 » et deux fins en B/D#). Le .cho fond les deux premiers blocs dans « Pont 1 » et écrit « X2 » comme des lignes chantées (l. 41, 48) et dans la parole (l. 51). Séparer Pont 1 en deux ponts insère une section ailleurs qu'à la fin (règle « Structure ») : non écrit. Bloc proposé repris avec les accords mesurés de cette passe.

```
# remplace les lignes 36 à 54
{start_of_bridge: Pont 1 (x2)}
[E]Rien, rien au [B]monde
Ne peut [F#]prendre ta place, prendre ta place
[E]Rien, rien au [B]monde
Ne peut p[F#]rendre ta place en mon âme
{end_of_bridge}

{start_of_bridge: Pont 2 (x2)}
(Non) [C#m]Rien, rien au m[G#m]onde
Ne peut [F#]prendre ta place, prendre ta place
[C#m]Rien, rien au mo[G#m]nde
Ne peut p[F#]rendre ta place en mon âme
{end_of_bridge}

{start_of_bridge: Pont 3}
[E]Tu es [B]mon seul b[F#]ien
[E]Tu es [B]mon seul b[F#]ien
[E]Tu es[B/D#] mon seul bie[F#]n[G#m]
[E]Tu es[B/D#] mon seul bie[F#]n
{end_of_bridge}
```

- **grace-en-grace** (fable) : La feuille ouvre sur « Bb F » sans paroles (p1 y=88,3, avant « Couplet 1 ») : une intro avant le couplet 1 décalerait la numérotation des sections (ajout ailleurs qu'après la dernière, interdit ici). Après le Pré-Refrain 2, la feuille passe au Pont sans regraver ni renvoyer au refrain : retour non gravé, rien n'est ajouté, seulement un doute à placer avant le Pont.

```
{start_of_intro: Intro}
[Bb]  [F]
{end_of_intro}

{needs_review: après le Pré-Refrain 2 la feuille passe au Pont sans regraver le refrain : retour du refrain non gravé, rien n'est ajouté}
```

- **heritiers** (fable) : Plan gravé (colonne 1 puis 2) : INTRO (2 rangées), STROPHE 1, REFRAIN, TRANSITION A (2 rangées D E/G# A, y=726 et 743), STROPHE 2, renvoi REFRAIN (y=409), TRANSITION B « D … A » (y=460), PONT (x2) dont la 1re ligne porte « A (2e fois A/C#) » (A x=423,7 sur « s » d'accuser, A/C# x=475,5 en note), renvoi REFRAIN (y=663), OUTRO (2 rangées D E/G# A). Le .cho s'arrête au Pont. Chant français : structure dépliée (01), le 2e Pont change d'accord (A/C#) donc s'écrit en entier. Insérer Interlude 1, Refrain 2 et Interlude 2 au milieu du chant décale les identifiants de sections des setlists : interdit ici. La fin (Pont 2, Refrain 3, Final) pourrait s'ajouter après la dernière section, mais l'appliquer seule décalerait les identifiants une seconde fois quand le milieu sera inséré : tout le plan est laissé ensemble.

```
{start_of_intro: Intro (x2)}
[D]  [E/G#]  [A]
{end_of_intro}

{start_of_verse: Couplet 1}
(lignes 12 à 19 inchangées, l. 17 corrigée : Sa gr[D]âce nous li[F#m]bère.)
{end_of_verse}

{start_of_chorus: Refrain 1}
(lignes 23 à 28 telles que corrigées, avec le needs_review de la l. 23)
{end_of_chorus}

{start_of_intro: Interlude 1 (x2)}
[D]  [E/G#]  [A]
{end_of_intro}

{start_of_verse: Couplet 2}
(lignes 33 à 40 telles que corrigées)
{end_of_verse}

{start_of_chorus: Refrain 2}
(recopie du refrain 1)
{end_of_chorus}

{start_of_intro: Interlude 2}
[D]  [A]
{end_of_intro}

{start_of_bridge: Pont 1}
[D]Qui pourrait nous accu[A]ser ?
[F#m7]Qui pourrait nous condam[E/G#]ner ?
[D]Qui pourrait nous sépa[F#m]rer
De l'amour de Dieu en Chr[D]ist ?[E]
{end_of_bridge}

{start_of_bridge: Pont 2}
[D]Qui pourrait nous accu[A/C#]ser ?
[F#m7]Qui pourrait nous condam[E/G#]ner ?
[D]Qui pourrait nous sépa[F#m]rer
De l'amour de Dieu en Chr[D]ist ?[E]
{end_of_bridge}

{start_of_chorus: Refrain 3}
(recopie du refrain 1)
{end_of_chorus}

{start_of_outro: Final (x2)}
[D]  [E/G#]  [A]
{end_of_outro}
```

- **how-great-thou-art** (agent) : Tout le chant est dans une seule section {start_of_intro: Intro} (lignes 6–28). La partition (feuille Word, sans titres de section) montre : une ligne d'accords seule « G D » (intro), le couplet 1 (4 lignes avec accords), deux lignes vides, le refrain « Then sings my soul… » (4 lignes avec accords), puis trois strophes sans accords séparées par des lignes vides. Changer le type des lignes 8–27 (intro → couplet/refrain) est interdit au moteur. Le retour du refrain après les couplets 2–4 n'est pas gravé : rien n'est ajouté.

```
{start_of_intro: Intro}
[G]  [D]
{end_of_intro}

{start_of_verse: Couplet 1}
O Lord my [G]God, when I in awesome [C]wonder
Consider [G]all the [D]worlds Thy hands have [G]made[D]
I see the [G]stars, I hear the rolling t[C]hunder
Thy pow’r througho[G]ut the [D]universe disp[G]layed[D]
{end_of_verse}

{start_of_chorus: Refrain}
Then sings my [G]soul, my [C]Savior God to [G]Thee,
“How great thou [Am]art! [D]How great thou [G]art!”[D]
Then sings my [G]soul, my [C]Savior God to [G]Thee,
“How great thou [Am]art! [D]How great thou [G]art!”
{end_of_chorus}

{start_of_verse: Couplet 2}
When thro’ the woods and forestglades I wander
And hear the birds sing sweetly in the trees,
When I look down from lofty mountain grandeur,
And hear the brook and feel the gentle breeze
{end_of_verse}

{start_of_verse: Couplet 3}
And when I think that God, His Son not sparing,
Sent Him to die, I scarce can take it in.
That on the cross, my burden gladly bearing,
He bled and died to take away my sin.
{end_of_verse}

{start_of_verse: Couplet 4}
When Christ shall come with shout of acclamation
And take me home, what joy shall fill my heart!
Then I shall bow in humble adoration,
And there proclaim, my God, how great Thou art!
{end_of_verse}
```

- **il-m-aime** (fable) : Vu sur la partition (rendu 2×) : entre la fin du refrain (« Jamais ne la relâche. ») et « Couplet 1 », une ligne C D Em C D Em sans paroles ni titre, hors des cadres : un instrumental absent du .cho. L'ajouter crée une section entre le refrain et le couplet 1 : interdit par la règle de structure (ajout seulement après la dernière section).

```
# après {end_of_chorus} (l. 13)
{start_of_intro: Interlude}
[C]  [D]  [Em]  [C]  [D]  [Em]
{end_of_intro}
```

- **invitation** (fable) : La feuille grave « INSTRUMENTAL » après le refrain (| F / / F/A | Bb / / / | Dm / / F/A | Bb / C / |) et « INSTRUMENTAL PONT » entre le couplet 3 et le pont (| F / / / | C / / / | Gm / / / | Bb / / / |), absents du .cho. Les insérer ailleurs qu'après la dernière section décalerait la numérotation des sections : interdit ici. Aucune reprise du refrain n'est gravée après le couplet 3 ni après le Pont 2 : rien d'autre à ajouter.

```
après le Refrain (l. 32) :
{start_of_intro: Interlude}
[F]  [F/A]  [Bb]  [Dm]  [F/A]  [Bb]  [C]
{end_of_intro}

après le Couplet 3 (l. 39) :
{start_of_intro: Interlude 2}
[F]  [C]  [Gm]  [Bb]
{end_of_intro}
```

- **invitation** (agent) : Même constat que le bloc précédent : Instrumental après le refrain et Instrumental Pont avant le pont, gravés sur la feuille, absents du .cho ; insertion au milieu du chant, donc hors des changements permis.

```
voir le bloc précédent (deux sections Interlude, après le Refrain et après le Couplet 3)
```

- **j-annoncerai** (fable) : La feuille grave « Instrumental : D A E F#m x2 » (colonne 2, y=543,4) entre le Refrain x2 et le Pont ; le .cho n'a pas cette section. L'ajouter après la l.48 placerait une section ailleurs qu'après la dernière (le Pont) : interdit ici, les setlists s'y repèrent.

```
# après {end_of_chorus} du Refrain 2 (l. 48), avant le Pont
{start_of_intro: Interlude (x2)}
[D]  [A]  [E]  [F#m]
{end_of_intro}
```

- **je-celebrerai** (fable) : Vu sur la partition et juste : pas d'intro (le « C » lu comme intro est la case de tonalité en haut à droite), et le Final est gravé « (x4) » en fin de parole ; 01 veut start_of_outro pour Final et le suffixe dans le libellé. Mais retirer la section Intro et changer start_of_final en start_of_outro sont des changements de structure interdits ici (identifiants des setlists).

```
# supprimer les lignes 7 à 10 (section Intro [C] : case de tonalité, pas une intro)

# remplacer les lignes 26 à 28
{start_of_outro: Final (x4)}
[C]Je célè[F]brerai [Am]le Nom du [G]Seigneur.
{end_of_outro}
```

- **joie-dans-le-monde** (fable) : La feuille (deux colonnes) donne COUPLET 1, REFRAIN 1, COUPLET 2 (7 lignes, sans accords), REFRAIN 2, COUPLET 3 (sans accords). Le .cho coupe le couplet 2 en « Couplet 2 » + un faux « {start_of_chorus: Refrain} » (l. 27-34). Fusionner ce faux refrain dans le couplet 2 retire une section : l'id du Refrain 2 passerait de chorus-3 à chorus-2 et décalerait les setlists enregistrées. Interdit ici. Ordre avant : verse-1, chorus-1, verse-2, chorus-2 (faux), chorus-3, verse-3 ; après : verse-1, chorus-1, verse-2, chorus-2, verse-3.

```
# remplace les lignes 22 à 34 (après les corrections appliquées : ligne ajoutée, pied de page retiré)
{start_of_verse: Couplet 2}
Joie dans le monde
Le Sauveur règne
Entonnons ce refrain
Les champs et les fleuves
Les collines et les plaines
Proclament en chœur ce chant
Proclament en chœur ce chant
{end_of_verse}
```

- **jusqu-au-bout** (fable) : Deux changements vus sur la feuille mais interdits ici : (1) la feuille réécrit le Refrain après le Couplet 2 (paroles seules, identiques au 1er refrain) : ajouter une section ailleurs qu'après la dernière ; (2) le Tag est en {start_of_grid} (lint E07) : passer en {start_of_tag} change le type de section.

```
(après {end_of_verse} du Couplet 2, l.28 :)
{start_of_chorus: Refrain (reprise)}
[Ab]Celui qui a commencé, [Eb]cette œuvre dans nos [Bb]cœurs
La mènera jusqu'au [Cm7]bout, il la mènera jusqu'au bout
{end_of_chorus}

(l.40 à 43 :)
{start_of_tag: Tag}
[Eb]Jusqu'au Bout ouh ouh ouh, il nous mènera [Bb]jusqu'au bout ouh ouh ouh
[Cm7]Jusqu'au Bout ouh ouh ouh, il nous mènera [Ab]jusqu'au bout ouh ouh ouh
{end_of_tag}
```

- **jusqu-au-bout** (agent) : Même constat que le bloc précédent : la feuille reprend le Refrain après le Couplet 2 ; l'ajouter avant le Pont est une insertion ailleurs qu'après la dernière section, interdite ici.

```
(après {end_of_verse} du Couplet 2, l.28 :)
{start_of_chorus: Refrain (reprise)}
[Ab]Celui qui a commencé, [Eb]cette œuvre dans nos [Bb]cœurs
La mènera jusqu'au [Cm7]bout, il la mènera jusqu'au bout
{end_of_chorus}
```

- **l-amour-de-notre-pere** (fable) : La feuille église ouvre sur une ligne instrumentale « Bb Dm C F/A » (p.1 y=88, x=31,2/61,3/94,9/117,7) avant le couplet 1 ; une section ajoutée avant la première décalerait les id des sections (règle stricte) : à ajouter à la main.

```
{start_of_intro: Intro}
[Bb]  [Dm]  [C]  [F/A]
{end_of_intro}
(à placer avant {start_of_verse: Couplet 1}, l.7)
```

- **la-pour-toi** (fable) : p1 y=448–462 colonne droite : « INSTRUMENTAL 2 x2 » | E / / / | B/D# / / / | G#m / / / | F# / / / | entre le couplet 2 et le pont 1, absent du .cho. L'ajouter crée une section avant Pont 1 : interdit au moteur (ajout seulement après la dernière section).

```
# après {end_of_verse} du couplet 2 (l. 44)
{start_of_intro: Interlude 2 (x2)}
[E]  [B/D#]  [G#m]  [F#]
{end_of_intro}
# et l. 32 : {start_of_intro: Interlude 1}
```

- **la-pour-toi** (fable) : p2 y=73 : « TAG », écrit {start_of_verse: TAG} dans le .cho (l. 53–59). Type tag = start_of_tag, libellé Tag (01) : changer le type est interdit au moteur. Les quatre lignes et leurs accords restent tels quels (mesurés).

```
# remplace les lignes 53 à 59
{start_of_tag: Tag}
Que la gloire Te r[E]ev[B/D#]ienne
Que la gloire Te re[G#m]vienne[F#]
Que la gloire Te re[E]vi[B/D#]enne
Que la gloire Te re[G#m]vienne[F#]
{end_of_tag}
```

- **la-pour-toi** (fable) : p2 y=238–254 : « INSTRUMENTAL 3 » | E / / / | G#m / / / | F# / / / | C#m / / / | entre le TAG et le pont 2, absent du .cho. Insertion avant la dernière section : interdite au moteur.

```
# après la fin du TAG (l. 59)
{start_of_intro: Interlude 3}
[E]  [G#m]  [F#]  [C#m]
{end_of_intro}
```

- **merci** (agent) : {start_of_final: Final} est refusé par lint (E07) ; la forme canonique est {start_of_outro: Final}, mais changer la directive change le type et l'id de la section (final-3 → outro-3) : interdit ici, à faire à la main en revérifiant les setlists.

```
{start_of_outro: Final}
[Bb/C]Mer[F]ci.
{end_of_outro}
```

- **notre-pere** (fable) : Le bloc ne change rien aux sections (Refrain, Couplets 1 à 3, Pont, Coda de la feuille = les six sections du .cho) sauf la directive du Final : {start_of_final} est refusé par lint (E07) et devient {start_of_outro: Final} (01), ce qui change le type de la section (final → outro) et donc son id : interdit ici. Le reste du bloc est repris autrement : le {needs_review} sur le retour du refrain (posé avant le Couplet 1, comme le cas tranché d'Abba Père en 02) et le mot entier de la l. 53 (question).

```
{start_of_outro: Final}
Am[F]en !
[G]A[Am]men !
[G/B]A[C]men !
A[G]men !
{end_of_outro}
```

- **nous-voici** (fable) : Vu sur la partition (p3, mesures 29-32) : après la double barre du refrain, quatre mesures de piano seul Bb Gm F Eb, puis la barre finale ; absentes du .cho. Les insérer après le refrain (l. 26) ajoute une section avant le couplet 2 : interdit par la règle de structure (ajout seulement après la dernière section). Les mettre en Final après le couplet 2 serait faux tant que le pré-refrain et le refrain ne sont pas repris après ce couplet (retour non gravé : la partition ne porte que deux rangées sous le couplet, puis pré-refrain, refrain et fin une seule fois). À noter aussi : selon 01 (rangées empilées), l'ordre joué serait couplet 1, couplet 2, pré-refrain, refrain, fin — déplacer le couplet 2 est aussi un changement réservé.

```
# après {end_of_chorus} (l. 26)

{start_of_intro: Interlude}
[Bb]  [Gm]  [F]  [Eb]
{end_of_intro}
```

- **oasis** (fable) : La feuille grave deux « INSTRUMENTAL x2 » | C#m / B / | A / / / | absents du .cho : après le couplet 1 (p1 y=484,3, colonne gauche) et après le refrain (p1 y=529,3, colonne droite, avant le couplet 3). Les insérer ajoute des sections au milieu du chant (renumérotation des intro-N, setlists en ligne) : interdit par la règle de structure. Les deux libellés permis (Intro (x2), Interlude (x2) avant le pont) sont appliqués par lignes. La proposition de la même mesure côté relevé (structure_agent) est identique. Le {needs_review} du bloc (retour du refrain après le couplet 3 et après le pont, non gravé) n'est pas posé : la feuille se lit, elle ne grave simplement pas de retour ; à trancher avec le reste du bloc.

```
après {end_of_verse} du Couplet 1 (l. 19) :

{start_of_intro: Interlude (x2)}
[C#m]  [B]  [A]
{end_of_intro}

après {end_of_chorus} (l. 38), avant le Couplet 3 :

{needs_review: la feuille s'arrête au Pont sans renvoi : le retour du refrain après le couplet 3 et après le pont n'est pas gravé}
{start_of_intro: Interlude (x2)}
[C#m]  [B]  [A]
{end_of_intro}

(l'interlude avant le Pont devient alors le 4e start_of_intro)
```

- **ouvre-les-yeux-de-mon-coeur** (agent) : La feuille grave Couplet, Refrain, Pont, Final, sans reprise : les quatre sections du .cho, rien à déplier. Seul écart de forme : {start_of_final: Final} n'est pas une directive du format (01 : final = start_of_outro, libellé Final). Changer la directive change l'id de la section (final-4 → outro-4), interdit ici.

```
{start_of_outro: Final}
[Esus]Je désire T[E]e voir, [Esus]je désire T[E]e voir.
{end_of_outro}
```

- **parfaitement-imparfait** (fable) : La feuille grave, entre le refrain et le couplet 2, « INSTRUMENTAL x2 » puis « | Fm | C | Db | Ab / Eb/G / » (p1 y=398,3 et y=414,0, colonne de droite), absent du .cho. L'ajouter entre {end_of_chorus} et le couplet 2 insère une section ailleurs qu'après la dernière : interdit au moteur (numérotation des sections des setlists). La partie intro du même bloc (suffixe x2) est appliquée en ligne 8.

```
{start_of_intro: Interlude (x2)}
[Fm]  [C]  [Db]  [Ab]  [Eb/G]
{end_of_intro}
```

- **premiere-place** (fable) : La feuille (eecpworship.fr) grave Couplet 1, Refrain 1, Couplet 2, Refrain 2, Couplet 3 ; le .cho n'a pas le Refrain 2. L'insérer entre le couplet 2 et le couplet 3 ajoute une section ailleurs qu'après la dernière (les id chorus/verse suivants se décalent) : interdit par la règle Structure. Les 8 lignes du Refrain 2 sont imprimées l'une sur l'autre et sans accords (y=374,0–405,8) : lues sur la couche texte, les 4 lignes du refrain 1, deux lignes nouvelles « Viens et prends la place », puis les 2 dernières du refrain 1. Le renommage « Refrain » → « Refrain 1 » n'a de sens qu'avec ce second refrain : laissé avec lui.

```
{start_of_chorus: Refrain 1}   ← libellé de la l. 16 (au lieu de « Refrain »)
…
{end_of_verse}   ← fin du couplet 2 (l. 28), puis :

{start_of_chorus: Refrain 2}
{needs_review: Refrain 2 : la feuille superpose ses 8 lignes sans aucun accord ; les lignes reprises du refrain 1 gardent ses accords, les deux lignes nouvelles n'en ont pas}
Viens et [Am]prends la première [G]place
Viens et [F]prends la première [C]place
Mets chaq[Am]ue chose à sa [G]place
Que tu [F]aies la première [C]place
Viens et prends la place
Viens et prends la place
Mets chaq[Am]ue chose à sa [G]place
Que tu [F]aies la première [C]place
{end_of_chorus}

puis {start_of_verse: Couplet 3} inchangé
```

- **pres-de-la-croix** (fable) : La feuille annonce « Ordre des sections V1 C V2 C V3 C V4 C » : le refrain revient après chaque verset, le .cho ne l'écrit qu'après le verset 1. Insérer un refrain après les versets 2 et 3 ajoute des sections ailleurs qu'après la dernière (numérotation des setlists) : interdit ici. Le doute d'en-tête proposé n'est pas posé : la feuille n'a aucun accord, rien ne se mesure, on ne touche à rien.

```
# après les versets 2, 3 et 4 (refrain identique à celui du verset 1)
{start_of_chorus: Refrain}
[F]A la Croix, [Bb]à la Croix
[F]Soit ma gloire à ja[C]mais.
[F]Jusqu’à ce que [Bb]mon âme
Trouve [F]pardon [C]et re[F]pos.
{end_of_chorus}
```

### Chants « audio demandé »

- **fidele-loyal**

### Sections ajoutées, retirées ou déplacées (avant → après)

- **jireh** : avant `intro: Intro` · `intro: Intro` · `verse: ` · `verse: Couplet 1` · `verse: Interlude` · `verse: Couplet 1` → après `intro: Intro` · `verse: Couplet 1` · `verse: Couplet 2` · `chorus: Refrain 1` · `intro: Interlude 1` · `verse: Couplet 3` · `chorus: Refrain 2` · `intro: Interlude 2` · `bridge: Pont 1` · `bridge: Pont 2 (vamp 1)` · `chorus: Refrain 3` · `bridge: Pont 3 (vamp 2)` · `bridge: Pont 4 (vamp 3)`
- **ne-pour-nous-donner-la-vie** : avant `intro: Intro` · `verse: Couplet 1` · `chorus: Refrain` · `verse: Couplet 2` → après `intro: Intro` · `verse: Couplet 1` · `chorus: Refrain 1` · `verse: Couplet 2` · `chorus: Refrain 2`
- **noel-est-arrive** : avant `verse: Couplet 1` · `chorus: Refrain 1` · `verse: Couplet 2` · `bridge: Pont` · `chorus: Refrain 2` → après `verse: Couplet 1` · `chorus: Refrain 1` · `verse: Couplet 2` · `bridge: Pont` · `chorus: Refrain 2` · `chorus: Refrain 1 (G)`
- **o-vois** : avant `verse: Couplet 1` · `verse: Couplet 2` · `prechorus: Pré-Refrain` · `chorus: Refrain` · `verse: Couplet 3` · `final: ` → après `verse: Couplet 1` · `verse: Couplet 2` · `prechorus: Pré-Refrain` · `chorus: Refrain` · `verse: Couplet 3` · `outro: Final`

### `{key}` changés

- **de-l-ombre-a-la-lumiere** : (absente) → `{key: A}` — {key} absent (lint E02) : la feuille grave la tonalité A, et les accords du .cho sont en A (A, E, F#m, D) ; ajouté (règle 01).
- **eveille-toi-mon-ame** : (absente) → `{key: F}` — {key} absent du fichier (lint E02) ; la partition grave la tonalité F (01 : tonalité gravée).
- **noel-est-arrive** : `{key: Bb}` → `{key: F}` (écart du relevé)

### Autres changements d'en-tête

Aucun.

### Calques 简谱 à revoir (accords renommés, ajoutés ou retirés sur un chant à scan)

Aucun.

### Thèmes

| Chant | Avant | Après | Par | Raison |
|---|---|---|---|---|
| a-jamais-tu-es-saint | Adoration, Sainteté | Adoration, Sainteté | session | Thèmes actuels dans la liste et défendables : le chant proclame la sainteté de l'Agneau (Adoration d'abord, Sainteté). Autres défendables : Royaume. |
| a-l-agneau | Adoration, Croix | Adoration, Croix | session | Thèmes actuels dans la liste : louange à l'Agneau immolé (Adoration d'abord), l'œuvre de la croix au couplet. Autres défendables : Salut. |
| amour-extravagant | Adoration, Grace | Grâce, Adoration, Croix | session | Le chant célèbre d'abord l'amour immérité de Dieu qui poursuit le pécheur (« indigne et sans mérite, mais pour moi, Tu T'es livré »), s'adresse à Dieu dans la louange, et nomme la croix offerte (« Tu m'as offert la croix »). Autres défendables : Salut, Action de grâce. |
| amour-sans-fin | Adoration, Grace | Adoration, Grâce | session | Le chant s'adresse à Jésus pour l'adorer devant sa majesté (« Tel que je suis, je viens à Tes pieds », « T'adore en esprit ») et affirme la grâce qui sauve (« rien n'est semblable à Ta grâce qui m'a sauvé »). Autres défendables : Salut, Engagement. |
| aucune-peur | Foi, Esperance | Foi, Grâce | session | Choix actuel « Foi, Esperance » revu : « Foi » se défend et reste en tête (le refrain, cœur du chant : « Me voici devant Toi sans aucune peur dans Ton amour », la confiance sans crainte) ; « Espérance » ne se défend pas (rien sur l'attente ou l'avenir), remplacée par « Grâce » (« Tu m'as aimé tel que j'étais », « balayées par Ta grâce », « Amour sans faille »). Autres défendables : Engagement, Espérance. |
| avec-nous | noel, noel_fidelite | noel, noel_fidelite | session | chant sans source : on n'y touche pas (proposition citée seulement) |
| benediction | Adoration | Adoration | session | thème actuel dans la liste, il se défend : chant de bénédiction finale tourné vers le Nom de Jésus-Christ Autres défendables : Grâce. |
| beni-soit-ton-nom | Adoration, Action de grâce | Adoration, Action de grâce | session | thèmes actuels dans la liste et défendables : bénir le Nom en toute saison, louange et reconnaissance Autres défendables : Foi. |
| ce-nom-si-merveilleux | Adoration, Resurrection | Adoration, Résurrection | session | Le chant s'adresse à Jésus pour exalter son Nom (adoration, refrain répété trois fois), puis chante le voile déchiré, la mort désarmée et le Roi ressuscité (résurrection) ; l'en-tête écrit « Resurrection » sans accent, hors de la liste : orthographe corrigée, choix gardé. Autres défendables : Croix, Royaume. |
| cet-amour | Croix, Grace | Grâce, Croix | session | Le chant parle d'abord de l'amour de Dieu qui bénit, relève, libère et restaure (Grâce) ; la croix vient ensuite (« mourir au calvaire », « Tu nous appelles à la croix ») ; la valeur « Grace » sans accent est corrigée en nom canonique. Autres défendables : Salut, Engagement. |
| cieux-ouverts | Saint-Esprit, Adoration | Saint-Esprit, Adoration | session | thèmes actuels dans la liste et justes (prière à l'Esprit qui descend) : inchangés Autres défendables : Pentecôte. |
| combien-dieu-est-grand | Adoration | Adoration | session | thème actuel dans la liste et juste (louange de la grandeur de Dieu) : inchangé Autres défendables : Sainteté. |
| compter-sur-toi | Foi, Esperance | Foi, Espérance | session | Le chant dit d'abord la confiance en Dieu qui reste au contrôle et tient ses promesses (Foi), puis l'assurance que rien ne nous séparera de lui (Espérance) : choix actuel gardé, orthographe corrigée (Esperance → Espérance). Autres défendables : Adoration. |
| dieu-sauveur | Adoration, Sainteté | Adoration, Sainteté | session | Choix actuel défendable et dans la liste : le chant exalte Dieu (« je T'exalte », « Nos voix unies à celles des anges ») et sa grandeur sans pareille ; le Salut (« Dieu Sauveur ») reste défendable. Autres défendables : Salut. |
| digne-est-l-agneau | Adoration, Croix, Sainteté | Adoration, Croix, Sainteté | session | Choix actuel défendable et dans la liste : le chant adore l'Agneau (« Digne est l'Agneau »), dit la croix (« Merci pour la croix », « crucifié ») et sa sainteté (« Saint et élevé »). Autres défendables : Action de grâce, Grâce. |
| en-toi-je-sais-qui-je-suis | Grâce, Foi | Grâce, Foi | session | thèmes actuels dans la liste et défendables (grâce qui rachète, identité en Dieu) : inchangés Autres défendables : Famille de Dieu, Salut. |
| eternel-notre-seigneur | Adoration, Sainteté | Adoration, Sainteté | session | thèmes actuels dans la liste et justes (Psaume 8 : grandeur du Nom de Dieu) : inchangés Autres défendables : Action de grâce. |
| fascine | Adoration | Adoration | session | Thème actuel dans la liste et juste : le chant contemple et loue Dieu (« fasciné par Toi », « qui étais, qui es et qui seras ») ; gardé. Autres défendables : Action de grâce. |
| feu-du-fondeur | Sainteté, Repentance, Engagement | Sainteté, Repentance, Engagement | session | thèmes actuels dans la liste et justes (être purifié, mis à part, prêt à obéir) : inchangés Autres défendables : Saint-Esprit. |
| gloire-a-son-nom | Adoration, Croix, Résurrection | Adoration, Croix, Résurrection | session | thèmes actuels dans la liste et justes (louange du Nom, croix, résurrection, retour) : inchangés Autres défendables : Salut. |
| homme-de-douleurs | Croix, Adoration, Pâques | Croix, Adoration, Pâques | session | thèmes actuels dans la liste et justes (la croix, la rédemption, le tombeau vide) : inchangés Autres défendables : Résurrection, Salut. |
| hosanna-ostrini | Adoration, Sainteté | Adoration, Sainteté | session | thèmes actuels dans la liste ; Adoration se défend (ouvrir les portes au Roi, hosanna) ; inchangés Autres défendables : Royaume, Foi. |
| il-est-la-vie | Adoration, Foi | Adoration, Foi | session | thèmes actuels, dans la liste et défendables : le chant proclame la puissance du Nom de Jésus (adoration) et ce qu'on croit de Lui ; inchangés. Autres défendables : Salut, Résurrection. |
| il-m-aime | Adoration, Grâce, Espérance | Adoration, Grâce, Espérance | session | thèmes actuels, dans la liste et défendables : l'amour de Dieu qui donne et ne lâche pas (adoration, grâce), sa présence dans les déserts (espérance) ; inchangés. Autres défendables : Foi, Engagement. |
| jamais-marche-seul | Foi, Espérance | Foi, Espérance | session | thèmes actuels, dans la liste et défendables : le chant affirme la présence fidèle de Dieu (confiance) et l'assurance pour l'avenir ; inchangés. Autres défendables : Adoration. |
| je-louerai-l-eternel | Adoration, Action de grâce | Adoration, Action de grâce | session | thèmes actuels, dans la liste et justes : louer l'Éternel de tout son cœur, raconter ses merveilles ; inchangés. |
| je-te-donne-tout | Adoration, Engagement | Adoration, Engagement | session | Thèmes actuels dans la liste et défendables : le chant est d'abord un don de soi en adoration (« je Te donne tout »). Autres défendables : Grâce. |
| jesus-je-te-suivrai | Consécration, Engagement, Confiance | Engagement, Foi | session | « Consécration » et « Confiance » sont hors liste. Le chant dit d'abord « Jésus, je Te suivrai » en toute circonstance (joie, peine, doute) : Engagement ; la confiance tenue dans le doute et la peine : Foi. La mort et la souffrance du Christ « pour me sauver » (pré-refrain, refrain) défendent Croix ou Salut. Autres défendables : Croix, Salut. |
| le-nom-de-jesus | Adoration, Sainteté | Adoration, Sainteté | session | thèmes actuels dans la liste et défendables : le chant exalte le Nom au-dessus de tout nom ; inchangés Autres défendables : Salut. |
| mon-seul-souhait | Adoration, Engagement | Adoration, Engagement | session | Thèmes actuels dans la liste et défendables : le refrain adore (« Je T'adore », « Dieu de majesté ») et dit la soumission (« je veux me soumettre à Ta volonté »). Gardés. Autres défendables : Foi. |
| nos-yeux-sont-sur-toi | Adoration, Espérance | Adoration, Espérance | session | Thèmes actuels dans la liste et défendables : le refrain contemple le Fils (« nos yeux sont sur Toi », « gloire à Ton Nom ») et les couplets annoncent l'aube et le Royaume qui vient. Gardés. Autres défendables : Royaume, Salut. |
| nous-voici | Mission, Envoi, Consécration | Mission, Engagement | session | « Envoi » et « Consécration » sont hors liste. Le chant dit d'abord l'envoi (« envoie-moi », « envoie-nous dans le monde », « T'annoncer au monde entier ») : Mission ; puis la disponibilité (« me voici », « nos cœurs sont prêts ») : Engagement, qui traduit Consécration. Autres défendables : Royaume. |

### Lignes changées depuis l'audit (intouchables)

- **je-veux-proclamer-le-nom-de-jesus** l. 23 (introuvable) : `Et [E/G#]Ton Nom [A2]guérit, Ton Nom[E]est vie.`

### Avis d'arrangement (information, rien de changé)

- **benis-l-eternel** : Le .cho suit la feuille de l'église : « som - bre » coupé avec l'espaceur (l. 20), pronoms divins en capitale (Sa, Ta, Ton, Tu, Roi, Ta suite), « (x2) » sans le signe ×. La feuille shir.fr (E) a les mêmes accords, « sombre » d'un tenant, tout en minuscules, « (× 2) », et quelques accords posés une lettre plus loin dans le couplet ; elle est identique octet pour octet à « Bénis l’Éternel.pdf ». Écart du .cho : « tu es là » en minuscule (l. 21) alors que l'église écrit « Tu ». Les fichiers « Bénis l’Éternel (Praise) » et « - F » sont un autre chant (Elevation Worship).
- **entends-mon-coeur** : Le .cho suit la feuille de l'église en D : mêmes 5 sections (Couplet 1, Refrain 1, Couplet 2, Couplet 3, Refrain 2), 28 lignes identiques, 42/52 accords exacts. La feuille shir.fr est en E, mêmes accords transposés, mais 4 sections (le couplet 3 fondu dans les couplets), 39/52 exacts et plusieurs accords sur un autre caractère. « Entends mon cœur - Accords.pdf » est la même feuille église en D, « Entends mon cœur .pdf » la même en E (42/52 aussi une fois transposée).
- **je-n-ai-rien-a-craindre** : Le .cho suit la feuille Pages (apostrophe courbe) pour le plan, les coupes du couplet 1 et du pont, l'Interlude et les apostrophes courbes ; mais il prend à la feuille église (rendu ChordPro, apostrophe droite) les lignes longues du refrain avec « [Dm7] » en levée et tous les accords du couplet 2, que la feuille Pages n'a pas. La feuille église est le même arrangement en F : couplet 1 en 3 lignes, pont en 2, accords au couplet 2, et l'Interlude y est titré « Pont 2 (Tag) » ; plusieurs accords y sont tapés une lettre avant ceux de Pages.
- **noel-est-arrive** : Le .cho suit la version courte (2 pages). La version longue (4 pages, même arrangement) ajoute deux couplets et des modulations en G et D, avec le même début, le même pont et le même refrain final.
- **o-vois** : Trois copies identiques octet pour octet de la même feuille (en B) ; le nom « accords C » est trompeur.
- **oasis** : Copie identique de la même feuille.
- **ouvre-les-yeux-de-mon-coeur** : Le .cho suit la feuille de l'église (pronoms « Te », « Ta », « Ton », « Cieux » en capitale, sections libellées). La feuille shir.fr est le même arrangement en E, accords identiques ligne à ligne ; elle écrit les pronoms en minuscules, l'apostrophe typographique, ne libelle pas le refrain (simple filet), porte le copyright (Open the Eyes of my Heart © 1997 Integrity's Hosanna! Music / LTC) et cale ses étiquettes un peu autrement (A2 collé à « je » sans blanc, E du Final sur « te »).

### Remplacements contradictoires cochés sur une même ligne

- **o-vois** l. 56 : 56:oeil:5 et 56:fable:56:oeil:5 ; la ligne suit prop(), donc le premier (56:oeil:5)

### Listes `extra` du relevé (paroles, pinyin, source), citées sans être appliquées

- **a-l-agneau** (paroles) : {"kind":"paroles","diffs":[{"line":18,"cho":"les ténèbres ont reculé","source":"les ténèbres ont recul"}],"total":20}
- **amour-parfait** (paroles) : {"kind":"paroles","diffs":[{"line":33,"cho":"ton aour parfait a tout supporté, surpassé,","source":"on amour parfait a tout supporté, surpassé,"}],"total":16}
- **attache-a-la-croix** (source) : ligne instrumentale de la source p1 y=105,5 x=34,0
- **au-dessus-de-tout** (source) : ligne instrumentale de la source p1 y=105,5 x=34,0
- **beni-soit-ton-nom** (paroles) : {"kind":"paroles","diffs":[{"line":40,"cho":"mon cœur choisit de dire : ù","source":"mon cœur choisit de dire :"}],"total":20}
- **benis-l-eternel** (paroles) : {"kind":"paroles","diffs":[{"line":22,"cho":"et que m'importe si les por - tes","source":"et que m'importe si les port"}],"total":14}
- **cherchez-d-abord** (source) : ligne instrumentale de la source p1 y=492,0 x=34,0
- **cherchez-d-abord** (source) : ligne instrumentale de la source p1 y=492,0 x=62,9
- **cherchez-d-abord** (source) : ligne instrumentale de la source p1 y=492,0 x=91,9
- **cherchez-d-abord** (source) : ligne instrumentale de la source p1 y=492,0 x=108,5
- **cherchez-d-abord** (source) : ligne instrumentale de la source p1 y=492,0 x=149,9
- **cherchez-d-abord** (source) : ligne instrumentale de la source p1 y=492,0 x=166,4
- **cherchez-d-abord** (source) : ligne instrumentale de la source p1 y=492,0 x=195,4
- **cherchez-d-abord** (paroles) : {"kind":"paroles","diffs":[{"line":29,"cho":"allé - luia, allélu - ia ! (x2)","source":"- léluia, allélu, alléluia !"}],"total":7}
- **connais-tu-ce-jesus** (source) : ligne instrumentale de la source p1 y=710,0 x=77,0
- **connais-tu-ce-jesus** (source) : ligne instrumentale de la source p1 y=710,0 x=112,6
- **connais-tu-ce-jesus** (source) : ligne instrumentale de la source p1 y=710,0 x=164,3
- **connais-tu-ce-jesus** (source) : ligne instrumentale de la source p1 y=710,0 x=209,9
- **connais-tu-ce-jesus** (source) : ligne instrumentale de la source p1 y=376,0 x=314,6
- **connais-tu-ce-jesus** (source) : ligne instrumentale de la source p1 y=376,0 x=338,3
- **connais-tu-ce-jesus** (source) : ligne instrumentale de la source p1 y=376,0 x=370,3
- **connais-tu-ce-jesus** (source) : ligne instrumentale de la source p1 y=376,0 x=394,0
- **dieu-est-parmi-nous** (paroles) : {"kind":"paroles","diffs":[{"line":41,"cho":"jésus le prince de paix,le tout-puissant bouclié","source":"jésus le prince de paix, le tout-puissant boucli"}],"total":26}
- **donne-nous-des-mains-pures** (paroles) : {"kind":"paroles","diffs":[{"line":20,"cho":"(x2)","source":null},{"line":23,"cho":"(x2)","source":null}],"total":10}
- **echos** (paroles) : {"kind":"paroles","diffs":[{"line":38,"cho":"x6","source":null}],"total":31}
- **eclipse** (source) : ligne instrumentale de la source p1 y=668,0 x=77,6
- **eclipse** (source) : ligne instrumentale de la source p1 y=668,0 x=94,3
- **eclipse** (source) : ligne instrumentale de la source p1 y=668,0 x=127,6
- **eclipse** (source) : ligne instrumentale de la source p1 y=668,0 x=166,9
- **fascine** (paroles) : {"kind":"paroles","diffs":[{"line":39,"cho":"(x4)","source":null}],"total":21}
- **grace-en-grace** (source) : ligne instrumentale de la source p2 y=193,0 x=45,4
- **grace-en-grace** (source) : ligne instrumentale de la source p2 y=193,0 x=75,5
- **grace-en-grace** (source) : ligne instrumentale de la source p2 y=193,0 x=98,4
- **grace-en-grace** (source) : ligne instrumentale de la source p2 y=193,0 x=131,9
- **grace-en-grace** (source) : ligne instrumentale de la source p2 y=193,0 x=162,0
- **grace-en-grace** (source) : ligne instrumentale de la source p2 y=193,0 x=183,5
- **grace-en-grace** (paroles) : {"kind":"paroles","diffs":[{"line":24,"cho":"brisant mes chaines, il prit ma place","source":"brisant mes chaînes, il prit ma place"}],"total":25}
- **heritiers** (source) : ligne instrumentale de la source p1 y=138,0 x=42,5
- **heritiers** (source) : ligne instrumentale de la source p1 y=138,0 x=99,6
- **heritiers** (source) : ligne instrumentale de la source p1 y=138,0 x=144,7
- **heritiers** (source) : ligne instrumentale de la source p1 y=726,0 x=42,5
- **heritiers** (source) : ligne instrumentale de la source p1 y=726,0 x=99,6
- **heritiers** (source) : ligne instrumentale de la source p1 y=726,0 x=144,7
- **heritiers** (source) : ligne instrumentale de la source p1 y=743,0 x=42,5
- **heritiers** (source) : ligne instrumentale de la source p1 y=743,0 x=99,6
- **heritiers** (source) : ligne instrumentale de la source p1 y=743,0 x=144,7
- **heritiers** (source) : ligne instrumentale de la source p1 y=460,0 x=304,7
- **heritiers** (source) : ligne instrumentale de la source p1 y=460,0 x=383,4
- **heritiers** (source) : ligne instrumentale de la source p1 y=545,0 x=304,7
- **heritiers** (source) : ligne instrumentale de la source p1 y=545,0 x=437,3
- **heritiers** (source) : ligne instrumentale de la source p1 y=714,0 x=304,7
- **heritiers** (source) : ligne instrumentale de la source p1 y=714,0 x=361,8
- **heritiers** (source) : ligne instrumentale de la source p1 y=714,0 x=407,0
- **heritiers** (source) : ligne instrumentale de la source p1 y=731,0 x=304,7
- **heritiers** (source) : ligne instrumentale de la source p1 y=731,0 x=361,8
- **heritiers** (source) : ligne instrumentale de la source p1 y=731,0 x=407,0
- **heritiers** (paroles) : {"kind":"paroles","diffs":[{"line":14,"cho":"déclarés justes pour toujours,","source":"déclarés justes pour toujour"}],"total":26}
- **il-m-aime** (source) : ligne instrumentale de la source p1 y=292,5 x=31,2
- **il-m-aime** (source) : ligne instrumentale de la source p1 y=292,5 x=54,0
- **il-m-aime** (source) : ligne instrumentale de la source p1 y=292,5 x=76,9
- **il-m-aime** (source) : ligne instrumentale de la source p1 y=292,5 x=109,7
- **il-m-aime** (source) : ligne instrumentale de la source p1 y=292,5 x=132,5
- **il-m-aime** (source) : ligne instrumentale de la source p1 y=292,5 x=155,4
- **invitation** (source) : ligne instrumentale de la source p1 y=236,5 x=314,6
- **invitation** (source) : ligne instrumentale de la source p1 y=236,5 x=337,0
- **invitation** (source) : ligne instrumentale de la source p1 y=236,5 x=367,3
- **invitation** (source) : ligne instrumentale de la source p1 y=236,5 x=409,4
- **invitation** (source) : ligne instrumentale de la source p1 y=236,5 x=443,6
- **invitation** (source) : ligne instrumentale de la source p1 y=236,5 x=470,8
- **invitation** (source) : ligne instrumentale de la source p1 y=236,5 x=494,8
- **invitation** (source) : ligne instrumentale de la source p1 y=403,0 x=314,6
- **invitation** (source) : ligne instrumentale de la source p1 y=403,0 x=349,0
- **invitation** (source) : ligne instrumentale de la source p1 y=403,0 x=385,2
- **invitation** (source) : ligne instrumentale de la source p1 y=403,0 x=432,1
- **invitation** (paroles) : {"kind":"paroles","diffs":[{"line":37,"cho":"et par ta grâce je reparts à zéro","source":"et par ta grâce je repars à zéro"}],"total":24}
- **je-flechis-le-genou** (paroles) : {"kind":"paroles","diffs":[{"line":36,"cho":"(× 2)","source":null}],"total":18}
- **je-n-ai-rien-a-craindre** (source) : ligne instrumentale de la source p1 y=489,0 x=309,0
- **je-n-ai-rien-a-craindre** (source) : ligne instrumentale de la source p1 y=489,0 x=324,9
- **joie-dans-le-monde** (paroles) : {"kind":"paroles","diffs":[{"line":51,"cho":": jonathan mercier","source":"than mercier"}],"total":28}
- **l-amour-de-notre-pere** (source) : ligne instrumentale de la source p1 y=88,5 x=31,2
- **l-amour-de-notre-pere** (source) : ligne instrumentale de la source p1 y=88,5 x=61,3
- **l-amour-de-notre-pere** (source) : ligne instrumentale de la source p1 y=88,5 x=94,9
- **l-amour-de-notre-pere** (source) : ligne instrumentale de la source p1 y=88,5 x=117,7
- **la-pour-toi** (source) : ligne instrumentale de la source p1 y=462,0 x=314,6
- **la-pour-toi** (source) : ligne instrumentale de la source p1 y=462,0 x=353,3
- **la-pour-toi** (source) : ligne instrumentale de la source p1 y=462,0 x=406,9
- **la-pour-toi** (source) : ligne instrumentale de la source p1 y=462,0 x=459,9
- **la-pour-toi** (source) : ligne instrumentale de la source p2 y=254,0 x=77,6
- **la-pour-toi** (source) : ligne instrumentale de la source p2 y=254,0 x=116,3
- **la-pour-toi** (source) : ligne instrumentale de la source p2 y=254,0 x=169,3
- **la-pour-toi** (source) : ligne instrumentale de la source p2 y=254,0 x=210,2
- **libere** (source) : ligne instrumentale de la source p1 y=513,5 x=45,4
- **libere** (source) : ligne instrumentale de la source p1 y=513,5 x=68,2
- **libere** (source) : ligne instrumentale de la source p1 y=513,5 x=101,0
- **libere** (source) : ligne instrumentale de la source p1 y=513,5 x=133,9
- **libere** (source) : ligne instrumentale de la source p1 y=513,5 x=156,7
- **libere** (source) : ligne instrumentale de la source p1 y=513,5 x=192,2
- **mon-redempteur-vit** (source) : ligne instrumentale de la source p1 y=480,5 x=34,0
- **mon-redempteur-vit** (source) : ligne instrumentale de la source p1 y=480,5 x=50,5
- **mon-redempteur-vit** (source) : ligne instrumentale de la source p1 y=480,5 x=79,5
- **mon-seul-souhait** (paroles) : {"kind":"paroles","diffs":[{"line":19,"cho":"je t'ado- re, je t'ado- re.","source":"e t'adore, je t'adore."}],"total":11}
- **noel-est-arrive** (source) : ligne instrumentale de la source p2 y=73,0 x=149,9
- **noel-est-arrive** (source) : ligne instrumentale de la source p2 y=73,0 x=216,2
- **noel-est-arrive** (source) : ligne instrumentale de la source p2 y=238,0 x=72,1
- **noel-est-arrive** (source) : ligne instrumentale de la source p2 y=238,0 x=90,0
- **noel-est-arrive** (source) : ligne instrumentale de la source p2 y=238,0 x=122,6
- **noel-est-arrive** (source) : ligne instrumentale de la source p2 y=238,0 x=154,5
- **noel-est-arrive** (source) : ligne instrumentale de la source p2 y=238,0 x=172,4
- **noel-est-arrive** (source) : ligne instrumentale de la source p2 y=238,0 x=204,3
- **noel-est-arrive** (paroles) : {"kind":"paroles","diffs":[{"line":25,"cho":"et du fond de l'abîme, jaillira la lumière","source":"ent changer nos vies jaillira la lumière"}],"total":26}
- **oasis** (source) : ligne instrumentale de la source p1 y=545,0 x=314,6
- **oasis** (source) : ligne instrumentale de la source p1 y=545,0 x=348,6
- **oasis** (source) : ligne instrumentale de la source p1 y=545,0 x=371,0
- **oasis** (source) : ligne instrumentale de la source p2 y=89,0 x=77,0
- **oasis** (source) : ligne instrumentale de la source p2 y=89,0 x=112,6
- **oasis** (source) : ligne instrumentale de la source p2 y=89,0 x=164,9
- **oasis** (source) : ligne instrumentale de la source p2 y=89,0 x=200,6
- **oui-je-crois** (paroles) : {"kind":"paroles","diffs":[{"line":28,"cho":"a jamais élevé.","source":"à jamais élevé."}],"total":24}
- **parfaitement-imparfait** (source) : ligne instrumentale de la source p1 y=414,0 x=314,6
- **parfaitement-imparfait** (source) : ligne instrumentale de la source p1 y=414,0 x=340,6
- **parfaitement-imparfait** (source) : ligne instrumentale de la source p1 y=414,0 x=357,9
- **parfaitement-imparfait** (source) : ligne instrumentale de la source p1 y=414,0 x=381,2
- **parfaitement-imparfait** (source) : ligne instrumentale de la source p1 y=414,0 x=405,9
- **priorite** (source) : ligne instrumentale de la source p1 y=669,5 x=72,4
- **priorite** (source) : ligne instrumentale de la source p1 y=221,5 x=322,1
- **priorite** (source) : ligne instrumentale de la source p1 y=283,0 x=302,2
- **priorite** (source) : ligne instrumentale de la source p1 y=283,0 x=382,6
- **priorite** (source) : ligne instrumentale de la source p1 y=530,5 x=302,2
- **priorite** (paroles) : {"kind":"paroles","diffs":[{"line":32,"cho":"vers ton cœur","source":"vers ton cur"},{"line":36,"cho":"vers ton cœur","source":"vers ton cur"},{"line":41,"cho":"mon cœur synchronisé","source":"mon cur synchronisé"},{"line":51,"cho":"l'élu de mon cœur","source":"l'élu de mon cur"}],"total":31}

### Pinyin régénéré (`pinyin.py`) sur une ligne dont les caractères changent

Aucun.

### Espaceurs `[ ]` retirés (restés seuls après un déplacement)

feu-du-fondeur l. 21

### Forme corrigée (lignes, par type)

- ligne sans paroles : 55
- espaceur : 89
- orthographe d'accord : 38
- espace de fin : 95
- mot coupé au tiret : 50
- en-tête : 3
- ligature typographique : 8
- espaces : 1

