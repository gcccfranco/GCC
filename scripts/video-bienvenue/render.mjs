// Rend compo.html image par image : chaque image = render(t), fonction pure du temps.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
const __dirname = path.dirname(new URL(import.meta.url).pathname);
(async () => {
  const [,, mode = "stills", fps = "30", dur = "21"] = process.argv;
  const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  await p.goto("file://" + path.resolve(__dirname, "compo.html"));
  await p.evaluate(() => window.ready);
  const times = mode === "stills" ? process.argv.slice(5).map(Number) : null;
  const list = times ?? Array.from({ length: Math.round(+fps * +dur) }, (_, i) => i / +fps);
  fs.mkdirSync(path.join(__dirname, mode), { recursive: true });
  for (let i = 0; i < list.length; i++) {
    await p.evaluate((t) => window.render(t), list[i]);
    await p.screenshot({ path: path.join(__dirname, mode, (mode === "stills" ? `t${list[i].toFixed(2)}` : String(i).padStart(4, "0")) + ".png") });
  }
  await b.close();
})();
