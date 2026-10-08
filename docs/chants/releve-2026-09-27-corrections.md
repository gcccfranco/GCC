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
| 1 | a-jamais-tu-es-saint, a-l-agneau, a-la-croix, abba-pere, abrite-moi, amour-extravagant, amour-parfait, amour-sans-fin, attache-a-la-croix, au-dessus-de-tout, au-nom-de-jesus, aucun-autre-nom, aucune-peur, aupres-de-dieu, avec-nous, benediction, beni-soit-ton-nom, benis-dieu-10000-raisons, benis-l-eternel, briser-les-chaines, ce-nom-si-merveilleux, cet-amour, chaine-d-amour, chantons, cherchez-d-abord, christ-est-la-lumiere | poussé avec ce fichier |
| 2 | cieux-ouverts, coeur-a-coeur, collision, combien-dieu-est-grand, compter-sur-toi, connais-tu-ce-jesus, crier-a-toi, de-grace-en-grace, de-l-ombre-a-la-lumiere, de-tout-mon-etre, dieu-a-tant-aime, dieu-de-l-impossible, dieu-est-parmi-nous, dieu-est-puissant, dieu-sauveur, dieu-tout-puissant, digne-est-l-agneau, digne-est-ton-nom, donne-nous-des-mains-pures, ebloui, echos, eclipse, en-toi-je-sais-qui-je-suis, en-verite, entends-mon-coeur, eternel-notre-seigneur, eveille-toi-mon-ame | à faire |
| 3 | fascine, feu-du-fondeur, fidele-loyal, gloire-a-son-nom, grace-en-grace, grace-infinie, grande-est-ta-fidelite, havre-de-paix, heritiers, homme-de-douleurs, hosanna, hosanna-ostrini, how-great-thou-art, il-est-la-vie, il-est-temps, il-m-aime, il-regnera, inattendu, infiniment-grand, invitation, j-annoncerai, jamais-marche-seul, je-celebrerai, je-flechis-le-genou, je-loue-ton-nom-eternel, je-louerai-l-eternel | à faire |
| 4 | je-n-ai-rien-a-craindre, je-reviens-au-coeur, je-te-donne-tout, je-veux-proclamer-le-nom-de-jesus, jesus-je-te-suivrai, jireh, joie-dans-le-monde, jusqu-au-bout, l-amour-de-notre-pere, l-entre-deux, la-benediction, la-croix-seule-me-suffit, la-dans-le-feu, la-passion, la-pour-toi, laissons-entrer, le-fils-de-dieu, le-nom-de-jesus, le-plus-grand, le-roi-est-ne, libere, lumiere-du-monde, ma-passion, ma-raison-de-noel, me-voici, merci, moi-et-ma-maison | à faire |
| 5 | mon-ancre-et-ma-voile, mon-assurance-est-en-christ, mon-redempteur-vit, mon-secours-est-en-toi, mon-seul-souhait, naitre, ne-pour-nous-donner-la-vie, noel-est-arrive, nos-yeux-sont-sur-toi, notre-pere, nous-tiendrons, nous-voici, nous-voulons-voir-jesus-eleve, o-jesus-mon-sauveur, o-vois, oasis, oceans, oui-je-crois, ouvre-les-yeux-de-mon-coeur, parfaitement-imparfait, personne, pionnier, premiere-place, pres-de-la-croix, prince-de-paix, priorite | à faire |
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
| appliqué | 57 | 26 | 40 | 123 |
| laissé | 104 | 94 | 0 | 198 |
| doute écrit | 0 | 0 | 0 | 0 |
| ligne changée depuis l'audit | 0 | 0 | 0 | 0 |
| à faire (lots non encore poussés) | | | | 3 076 |
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
- Non repris de la partition : « Traduction : LTC », titre original « Sing out ». Thèmes actuels (Adoration, Action de grâce) gardés.

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

## Captures (trois appareils)

Lot 1 — captures des 24 chants modifiés regardées sur ordinateur, téléphone et tablette (`tests/nouveau-chant.spec.ts`, tous verts) : aucun accord superposé ni débordant, aucune section vide, aucune directive ni `{needs_review}` visible, libellés conformes au `.cho`. Remarques :
- un accord posé au milieu d'un mot écarte les syllabes sans trait d'union (« Al lé lu ia », « justi ce », « vic toire », « re culé ») : rendu du site pour tout mot entier coupé par un accord, rendu plus visible depuis que les mots coupés au tiret sont écrits entiers (règle 01, confirmée par Timothée le 08/10) ;
- `[X] mot` (accord avant l'attaque) laisse un blanc de la largeur de l'accord et décale le début de ligne (amour-extravagant, au-dessus-de-tout, beni-soit-ton-nom, dieu… : voulu) ;
- au-nom-de-jesus et benediction : sections `{start_of_verse: Fin}` et `{start_of_verse: Bénédiction}` affichées « Couplet » (type de section existant, inchangé : règle « Structure ») ;
- benis-dieu-10000-raisons, téléphone : les accords de fin « (Dsus4) (D) (Dsus4) (D) » des couplets 2 et 3 passent seuls sur une rangée sous le vers ;
- beni-soit-ton-nom : « ù » parasite en fin de « Mon cœur choisit de dire : » (paroles d'origine, cité, non corrigé) ; christ-est-la-lumiere et briser-les-chaines : « (x...) » de la feuille, laissé.

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

### `{needs_review}` posés

- **au-nom-de-jesus**, au-dessus de la l. 13 (`[G]Dieu combat pour nous, [Em7]Toujours à nos côtés`) : Scan Word basse fidélité : G à cheval sur « pour | nous », posé sur « nous » (cas tranché de 02), à confirmer à l'écoute.
- **au-nom-de-jesus**, au-dessus de la l. 16 (`[D]Jésus Tu es là`) : Scan Word basse fidélité : D à cheval sur « es | là », posé sur « là », à confirmer à l'écoute.
- **au-nom-de-jesus**, au-dessus de la l. 26 (`[G]Nous ne tremblerons pas, [Em7]jamais ébranlés`) : Scan Word basse fidélité : G à cheval sur « tremblerons | pas » (couplet 1 le met sur le « s »), posé sur « pas », à confirmer à l'écoute.
- **au-nom-de-jesus**, au-dessus de la l. 27 (`[D]Jésus Tu es là`) : Scan Word basse fidélité : D à cheval sur « es | là » (couplet 1 le met sur « là »), posé sur le « s », à confirmer à l'écoute.

### Blocs de structure appliqués ou laissés

- **a-jamais-tu-es-saint** (fable) : laissé — Aucun changement proposé : la feuille grave bien un Pré-Refrain entre Couplet 1 et Refrain 1, sections et ordre identiques au .cho.
- **amour-sans-fin** (fable) : laissé — La feuille grave ligne d'intro, Couplet 1, Pré-Refrain, Refrain, Couplet 2 : exactement les cinq sections du .cho, sans renvoi ni reprise ; l'écart de structure vient de l'outil qui ne lit pas le Pré-Refrain.
- **attache-a-la-croix** (fable) : laissé — chant validé : pas de bloc de structure
- **attache-a-la-croix** (agent) : laissé — chant validé : pas de bloc de structure
- **au-dessus-de-tout** (fable) : laissé — chant validé : pas de bloc de structure
- **aucune-peur** (fable) : laissé — La feuille (deux colonnes) grave Couplet 1, Pré-Refrain, Refrain de huit lignes, Couplet 2 : exactement les sections du .cho, dans le même ordre ; l'écart venait de la lecture en colonnes de l'outil.
- **beni-soit-ton-nom** (fable) : laissé — la lecture du bloc conclut à « rien » : sections déjà justes

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

### Chants « audio demandé »

Aucun.

### Sections ajoutées, retirées ou déplacées (avant → après)

Aucun.

### `{key}` changés

Aucun. (Les setlists déjà enregistrées afficheraient autrement un chant dont la tonalité change.)

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

### Lignes changées depuis l'audit (intouchables)

Aucun.

### Avis d'arrangement (information, rien de changé)

- **benis-l-eternel** : Le .cho suit la feuille de l'église : « som - bre » coupé avec l'espaceur (l. 20), pronoms divins en capitale (Sa, Ta, Ton, Tu, Roi, Ta suite), « (x2) » sans le signe ×. La feuille shir.fr (E) a les mêmes accords, « sombre » d'un tenant, tout en minuscules, « (× 2) », et quelques accords posés une lettre plus loin dans le couplet ; elle est identique octet pour octet à « Bénis l’Éternel.pdf ». Écart du .cho : « tu es là » en minuscule (l. 21) alors que l'église écrit « Tu ». Les fichiers « Bénis l’Éternel (Praise) » et « - F » sont un autre chant (Elevation Worship).

### Remplacements contradictoires cochés sur une même ligne

Aucun.

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

### Pinyin régénéré (`pinyin.py`) sur une ligne dont les caractères changent

Aucun.

### Espaceurs `[ ]` retirés (restés seuls après un déplacement)

Aucun.

### Forme corrigée (lignes, par type)

- ligne sans paroles : 14
- espaceur : 16
- orthographe d'accord : 9
- espace de fin : 27
- mot coupé au tiret : 16
- en-tête : 1

