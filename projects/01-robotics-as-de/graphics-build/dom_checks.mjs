// Measured checks on the parts' DOM, for the graphics checkpoint (graphics skill: "no clipped or
// overflowing text, measured on the DOM, not judged by eye"), plus the copy table.
//
// For every part it seeks to the END of the part (every entrance has landed) and to each
// cue-sized step before it, and reads in canvas px (1920x1080, the stage's own units):
//   * every visible text element: its text, its box, its card
//   * OVERFLOW   a text box that runs outside the card it sits in
//   * OVERLAP    two visible text boxes that intersect
//   * ZONE       a card on a face part that crosses the measured clear wall: x <= 780 above
//                y 660, x <= 540 below it (zones-a/b.json, 2026-10-16)
//   * EMDASH     any em-dash in visible copy (house style)
// Writes previews/copy-table.md and previews/dom-checks.json; exits 1 on any failure.
import puppeteer from "/Users/snudurupati/.npm/_npx/678e79b7eb349f79/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os";

const CHROME = path.join(os.homedir(), ".cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7928.2/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const plan = JSON.parse(fs.readFileSync("cutsheet.json", "utf8"));
const words = JSON.parse(fs.readFileSync("../outputs/transcript-cut.json", "utf8")).words.filter(w => "start" in w);
const D0 = plan._demoScene.in, D1 = plan._demoScene.out;
const types = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".otf": "font/otf", ".png": "image/png", ".jpg": "image/jpeg" };
let root = "";
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0]));
  fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader("content-type", types[path.extname(f)] || "application/octet-stream"); r.end(b); }); });
await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell", args: ["--no-sandbox"] });
const page = await browser.newPage(); await page.setViewport({ width: 3840, height: 2160, deviceScaleFactor: 0.25 });
const spoken = (t0, t1) => words.filter(w => w.start >= t0 - 0.3 && w.start < t1).map(w => w.word).join(" ");
const rows = [], fails = [], report = {};
for (const p of plan.parts) {
  if (!fs.existsSync(`parts/${p.id}/index.html`)) continue;
  root = path.resolve("parts", p.id);
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: "load" });
  await page.evaluate(async () => { await document.fonts.ready; });
  const D = (p.endFrame - p.startFrame) / 30;
  // every 0.2s, not four quarter-points: the copy table's "first seen" was up to 10s late and missed every
  // string shown briefly (all gZ5-gZ7 marks and labels; checkpoint 2026-10-17). The checks below get
  // the same density, so a one-second overlap or overflow is caught too.
  const times = [...Array(Math.floor((D - 0.05) / 0.2) + 1).keys()].map(i => +(i * 0.2).toFixed(2)).concat([+(D - 0.05).toFixed(2)]);
  const seen = new Map();
  // a takeover covers the full frame by design (the hook's g01b grows from its card to full frame)
  const faceZone = !(p.start >= D0 - 0.01 && p.end <= D1 + 0.01) && p.class === "overlay" && p.kind !== "takeover";
  for (const t of times) {
    const res = await page.evaluate((id, t) => {
      window.__timelines[id].seek(t, false);
      const stage = document.getElementById("stage").getBoundingClientRect(), k = 1920 / stage.width;
      const vis = el => { for (let e = el; e && e.id !== "stage"; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false; if (cs.clipPath && cs.clipPath.startsWith("inset(100%")) return false; } return true; };
      const R = el => { const r = el.getBoundingClientRect(); return [(r.left - stage.left) * k, (r.top - stage.top) * k, (r.right - stage.left) * k, (r.bottom - stage.top) * k].map(v => Math.round(v)); };
      const out = { texts: [], cards: [] };
      document.querySelectorAll(".sheet,.opaque").forEach(c => { if (vis(c)) out.cards.push({ id: c.id, box: R(c) }); });
      const walker = document.createTreeWalker(document.getElementById("stage"), NodeFilter.SHOW_TEXT);
      for (let n; (n = walker.nextNode());) {
        const s = n.textContent.replace(/\s+/g, " ").trim(); if (!s) continue;
        const el = n.parentElement; if (!vis(el) || el.closest("svg") && !el.closest("text")) continue;
        const rg = document.createRange(); rg.selectNodeContents(n); const rr = rg.getBoundingClientRect(); if (rr.width < 1) continue;
        const box = [(rr.left - stage.left) * k, (rr.top - stage.top) * k, (rr.right - stage.left) * k, (rr.bottom - stage.top) * k].map(v => Math.round(v));
        const card = el.closest(".sheet,.opaque");
        // ink box for OVERLAP: the range rect is the font's full content area (about 1.35em), so
        // stacked lines at a tight line height always "overlap" by it. Use the em box around the
        // line's middle instead, which is where the glyphs actually are.
        const fs = parseFloat(getComputedStyle(el).fontSize) * k, mid = (box[1] + box[3]) / 2;
        const ink = [box[0], Math.round(mid - fs * 0.45), box[2], Math.round(mid + fs * 0.45)];
        // a card that clips (overflow:hidden) hides whatever lies outside it: that is not an overflow
        const clips = card && getComputedStyle(card).overflow === "hidden";
        out.texts.push({ s, box, ink, card: card ? card.id : null, cardBox: card && !clips ? R(card) : null });
      }
      return out;
    }, p.id, t);
    for (const x of res.texts) {
      if (!seen.has(x.s)) seen.set(x.s, { t, box: x.box });
      if (x.cardBox && (x.box[0] < x.cardBox[0] - 1 || x.box[2] > x.cardBox[2] + 1 || x.box[1] < x.cardBox[1] - 1 || x.box[3] > x.cardBox[3] + 1))
        fails.push(`${p.id} t=${t} OVERFLOW "${x.s}" ${x.box} outside card ${x.card} ${x.cardBox}`);
      if (/—/.test(x.s)) fails.push(`${p.id} EMDASH "${x.s}"`);
    }
    for (let i = 0; i < res.texts.length; i++) for (let j = i + 1; j < res.texts.length; j++) {
      const a = res.texts[i].ink, b = res.texts[j].ink;
      if (a[0] < b[2] - 2 && b[0] < a[2] - 2 && a[1] < b[3] - 2 && b[1] < a[3] - 2 && res.texts[i].s !== res.texts[j].s)
        fails.push(`${p.id} t=${t} OVERLAP "${res.texts[i].s}" x "${res.texts[j].s}"`);
    }
    if (faceZone) for (const c of res.cards) {
      const [x0, y0, x1, y1] = c.box;
      const lim = y1 <= 660 ? 780 : 540;
      if (x1 > lim + 2 && !(y0 >= 660 && x1 <= 540)) fails.push(`${p.id} t=${t} ZONE card ${c.id} ${c.box} crosses the clear wall (x <= ${lim} for a card reaching y ${y1})`);
    }
  }
  report[p.id] = [...seen.entries()].map(([s, v]) => ({ s, ...v }));
  for (const [s, v] of seen) rows.push(`| ${p.id} | ${Math.floor((p.start + v.t) / 60)}:${((p.start + v.t) % 60).toFixed(1).padStart(4, "0")} | ${s.replace(/\|/g, "\\|")} | ${spoken(p.start, p.end).slice(0, 140).replace(/\|/g, "\\|")} |`);
}
await browser.close(); srv.close();
fs.mkdirSync("previews", { recursive: true });
fails.splice(0, fails.length, ...[...new Set(fails.map(f => f.replace(/ t=[0-9.]+/, "")))]);
fs.writeFileSync("previews/copy-table.md", `# On-screen copy, every string as rendered\n\n| part | first seen | text, exactly as rendered | spoken over the part |\n|---|---|---|---|\n${rows.join("\n")}\n`);
fs.writeFileSync("previews/dom-checks.json", JSON.stringify({ fails, report }, null, 1));
console.log(`${rows.length} strings across ${Object.keys(report).length} parts`);
console.log(fails.length ? "FAIL\n  " + [...new Set(fails)].join("\n  ") : "DOM checks: OK");
process.exit(fails.length ? 1 : 0);
