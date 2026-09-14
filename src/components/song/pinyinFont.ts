import localFont from "next/font/local";

// Pinyin : Andika (SIL, OFL), dessinée pour apprendre à lire — ɑ et ɡ à une
// boucle comme dans les manuels de pinyin, tons bien détachés ; couvre les
// quatre tons et ü (ǖ ǘ ǚ ǜ). Choisie par Timothée le 13/09/2026 sur captures
// (docs/spec-mode-louange.md). Chargée à la demande : seuls les chants zh
// l'utilisent.
export const pinyin_font = localFont({ src: "../../../public/fonts/Andika-Regular.woff2", preload: false });
