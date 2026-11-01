// Rend compo.html image par image pour une disposition : chaque image = render(t), fonction pure du temps.
//   node render.mjs <appareil> stills 1.2 6.4 …   → stills/<appareil>/t1.20.png …
//   node render.mjs <appareil> frames             → frames/<appareil>/0000.png … (30 i/s, 21 s)
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ici = path.dirname(new URL(import.meta.url).pathname);
const [, , device = "telephone", mode = "stills", ...rest] = process.argv;
const FPS = 30, DUREE = 21;
const boxes = JSON.parse(fs.readFileSync(path.join(ici, "shots", device, "boxes.json"), "utf8"));
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
await p.addInitScript((cfg) => { window.CFG = cfg; }, { device, boxes });
await p.goto("file://" + path.join(ici, "compo.html"));
await p.evaluate(() => window.ready);
const list = mode === "stills" ? rest.map(Number) : Array.from({ length: FPS * DUREE }, (_, i) => i / FPS);
const out = path.join(ici, mode, device);
fs.mkdirSync(out, { recursive: true });
for (let i = 0; i < list.length; i++) {
  await p.evaluate((t) => window.render(t), list[i]);
  const nom = mode === "stills" ? `t${list[i].toFixed(2)}` : String(i).padStart(4, "0");
  await p.screenshot({ path: path.join(out, nom + ".png") });
}
await b.close();
