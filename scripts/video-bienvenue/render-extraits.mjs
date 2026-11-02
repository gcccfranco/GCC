// Rend les extraits des cartes (extraits.html), 1280×720, 30 i/s, 5 s.
//   node render-extraits.mjs <appareil> <extrait> stills 0.5 2.5 …  → stills-extraits/<appareil>/<extrait>-t0.50.png
//   node render-extraits.mjs <appareil> <extrait> frames            → frames-extraits/<appareil>/<extrait>/0000.png …
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ici = path.dirname(new URL(import.meta.url).pathname);
const [, , device, clip, mode = "stills", ...rest] = process.argv;
const FPS = 30, DUREE = 5;
const boxes = JSON.parse(fs.readFileSync(path.join(ici, "shots", device, "boxes.json"), "utf8"));
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.addInitScript((cfg) => { window.CFG = cfg; }, { device, boxes, clip });
await p.goto("file://" + path.join(ici, "extraits.html"));
await p.evaluate(() => window.ready);
const list = mode === "stills" ? rest.map(Number) : Array.from({ length: FPS * DUREE }, (_, i) => i / FPS);
const out = mode === "stills" ? path.join(ici, "stills-extraits", device) : path.join(ici, "frames-extraits", device, clip);
fs.mkdirSync(out, { recursive: true });
for (let i = 0; i < list.length; i++) {
  await p.evaluate((t) => window.render(t), list[i]);
  const nom = mode === "stills" ? `${clip}-t${list[i].toFixed(2)}` : String(i).padStart(4, "0");
  await p.screenshot({ path: path.join(out, nom + ".png") });
}
await b.close();
