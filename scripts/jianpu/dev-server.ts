import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { BASE_URL, PORT } from "../../playwright.config";

/** Le serveur de dev, démarré seulement s'il ne tourne pas déjà. Rend le
 *  processus à tuer, ou `null` si un serveur répondait déjà — auquel cas ce
 *  n'est pas à nous de l'arrêter. */
export async function ensureServer(): Promise<ChildProcess | null> {
  const up = await fetch(BASE_URL).then(() => true).catch(() => false);
  if (up) return null;
  console.error(`démarrage de next dev sur ${PORT}…`);
  const child = spawn("npm", ["run", "dev", "--", "-p", String(PORT)], {
    cwd: path.resolve(__dirname, "..", ".."),
    stdio: "ignore",
  });
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await fetch(BASE_URL).then(() => true).catch(() => false)) return child;
    await new Promise((r) => setTimeout(r, 1000));
  }
  child.kill();
  throw new Error("next dev n'a pas répondu en 180 s");
}
