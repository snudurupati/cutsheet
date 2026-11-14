// Seek-and-screenshot capture for PREVIEWS, used while `hyperframes@0.8.3 render` hangs on this
// machine (2026-10-17: every render and check, including 05-agent-swarm's known-good parts, times
// out at page.goto inside HyperFrames' own browser session, while the same headless shell loads
// HyperFrames' own served page in 124ms under plain Puppeteer). This is NOT the delivery renderer:
// the full build goes through HyperFrames once it works again, or by the human's decision.
//
// What it does is what the renderer does for a composition with no timers and no media: load
// the part, wait for fonts, then for every frame seek the part's registered paused timeline to
// i/fps (events NOT suppressed, so onUpdate count-ups fire) and screenshot with a transparent
// background. Frames go to PNG, then FFmpeg encodes ProRes 4444 with alpha.
//
//   node capture.mjs <partId> <out.mov> [scale=0.5] [workers=3]
import puppeteer from "/Users/snudurupati/.npm/_npx/678e79b7eb349f79/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os";
import { execFileSync } from "node:child_process";

const [id, out, scaleArg = "0.5", workersArg = "3"] = process.argv.slice(2);
const SCALE = +scaleArg, WORKERS = +workersArg, FPS = 30;
const CHROME = path.join(os.homedir(), ".cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7928.2/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const root = path.resolve("parts", id);
const plan = JSON.parse(fs.readFileSync("cutsheet.json", "utf8")).parts.find(p => p.id === id);
if (!plan) throw new Error(`${id} not in cutsheet.json`);
const N = plan.endFrame - plan.startFrame;                      // frames the CUT SHEET says, not the composition
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const comp = Math.round(+html.match(/data-duration="([\d.]+)"/)[1] * FPS);
if (comp !== N) throw new Error(`${id}: composition ${comp}f, cut sheet ${N}f; rebuild first`);
const opaque = plan.class === "segment";

const types = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".otf": "font/otf", ".png": "image/png", ".jpg": "image/jpeg" };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split("?")[0]));
  if (!f.startsWith(root)) { r.statusCode = 403; return r.end(); }
  fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader("content-type", types[path.extname(f)] || "application/octet-stream"); r.end(b); });
});
await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
const url = `http://127.0.0.1:${srv.address().port}/index.html`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `cap-${id}-`));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--font-render-hinting=none", "--force-color-profile=srgb"] });
const t0 = Date.now();
const work = async (w) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 3840, height: 2160, deviceScaleFactor: SCALE });
  page.on("pageerror", e => { console.error(`[${id}] PAGEERROR ${e.message}`); process.exitCode = 1; });
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  const ok = await page.evaluate(i => !!(window.__timelines && window.__timelines[i]), id);
  if (!ok) throw new Error(`${id}: no timeline registered as window.__timelines["${id}"]`);
  for (let i = w; i < N; i += WORKERS) {
    await page.evaluate((i, t) => { const tl = window.__timelines[i]; tl.seek(t, false); }, id, i / FPS);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(6, "0")}.png`), omitBackground: !opaque, clip: { x: 0, y: 0, width: 3840, height: 2160 } });
  }
  await page.close();
};
await Promise.all([...Array(WORKERS).keys()].map(work));
await browser.close(); srv.close();
const W = Math.round(3840 * SCALE), H = Math.round(2160 * SCALE);
const enc = opaque ? ["-c:v", "h264_videotoolbox", "-b:v", "30M", "-pix_fmt", "yuv420p"] : ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le"];
execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(tmp, "f%06d.png"),
  "-vf", `scale=${W}:${H}`, ...enc, "-r", String(FPS), out]);
fs.rmSync(tmp, { recursive: true, force: true });
const got = +execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames", "-of", "csv=p=0", out]).toString().trim();
console.log(`${id}: ${got}/${N} frames ${W}x${H} ${opaque ? "opaque" : "alpha"} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (got !== N) process.exit(1);
