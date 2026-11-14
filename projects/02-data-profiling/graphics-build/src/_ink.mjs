// Glyph-ink measurement for the punch-in marks (gZ0-gZ7). Marks snap to the pixels, not to OCR
// (style.md 2026-09-30, "marks by the pixels"; within 3px): OCR gives one box per run and a
// substring's position inside it is a character-count guess, which put gZ2's 246 box through the
// "6", took the "|" into 49's box and started the 124 underline inside the "1" (composition review
// 2026-10-28). Here a mark's box is read off the real screen frame at the moment the mark is on:
// the glyph blobs of the text line, with table pipes and trailing punctuation excluded.
//
// Frames come from ../outputs/base-screen.mp4, which starts at the demo scene's first frame
// (demo-scene.json enters.frame); the screen's frame count is gated against the demo scene's span
// before anything is read (hard rule 12).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SCREEN = "../outputs/base-screen.mp4";
const SCENE = JSON.parse(readFileSync("demo-scene.json", "utf8"));
const F0 = SCENE.enters.frame, F1 = SCENE.leaves.frame;
let gated = false;
const gate = () => {
  if (gated) return;
  const n = +execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
    "stream=nb_read_packets", "-of", "csv=p=0", SCREEN]).toString().trim();
  if (n !== F1 - F0) throw new Error(`base-screen.mp4 has ${n} frames, the demo scene spans ${F1 - F0}: wrong screen file`);
  gated = true;
};

const cache = new Map();
// gray crop [x0, y0, x1, y1] (source px) of the screen frame shown at cut time t
export const crop = (t, [x0, y0, x1, y1]) => {
  gate();
  x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0));
  x1 = Math.min(3840, Math.round(x1)); y1 = Math.min(2160, Math.round(y1));
  const i = Math.round(t * 30) - F0;
  if (i < 0 || i >= F1 - F0) throw new Error(`ink: cut ${t} is outside the demo scene`);
  const key = `${i}:${x0},${y0},${x1},${y1}`;
  if (cache.has(key)) return cache.get(key);
  const W = x1 - x0, H = y1 - y0;
  const buf = execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-ss", ((i + 0.25) / 30).toFixed(4), "-i", SCREEN,
    "-frames:v", "1", "-vf", `crop=${W}:${H}:${x0}:${y0},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 1 << 28 });
  if (buf.length !== W * H) throw new Error(`ink: short frame read at ${t}`);
  const r = { W, H, x0, y0, px: (x, y) => buf[y * W + x] };
  cache.set(key, r); return r;
};

const median = a => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };

// The text line nearest est (an OCR estimate, source px) at cut time t, as glyph blobs.
// Returns {blobs:[{x0,x1,y0,y1,kind}], top, bottom, below, above} with below/above the nearest ink
// rows under/over the line in its x-range (a table border or the next line), for clearance.
export const line = (t, est, opts = {}) => {
  const { thr = 60, padX = 260 } = opts;
  const [ex0, ey0, ex1, ey1] = est;
  const c = crop(t, [ex0 - padX, ey0 - 60, ex1 + padX, ey1 + 60]);
  const bg = median(Array.from({ length: 4000 }, (_, k) => c.px((k * 7919) % c.W, (k * 104729) % c.H)));
  const on = (x, y) => Math.abs(c.px(x, y) - bg) > thr;
  // rows inked inside the estimate's x-range (narrowed so a neighbouring column's text does not count)
  // (10px of slack: a one-glyph estimate a few px off its glyph read only half a "3" and broke its rows)
  const xa = Math.max(0, Math.round(ex0 - c.x0 - 10)), xb = Math.min(c.W, Math.round(ex1 - c.x0 + 10));
  const rowInk = Array.from({ length: c.H }, (_, y) => { let n = 0; for (let x = xa; x < xb; x++) if (on(x, y)) n++; return n; });
  // contiguous inked runs (1px gaps bridged); the text run is the THICK one nearest the estimate's middle
  const runs = []; let s = -1;
  for (let y = 0; y <= c.H; y++) {
    const ink = y < c.H && (rowInk[y] > 0 || (s >= 0 && rowInk.slice(y + 1, y + 4).some(v => v > 0)));   // bridge gaps up to 3px
    if (ink && s < 0) s = y; else if (!ink && s >= 0) { runs.push([s, y - 1]); s = -1; }
  }
  const mid = (ey0 + ey1) / 2 - c.y0;
  const thick = runs.filter(([a, b]) => b - a >= 9);
  if (!thick.length) throw new Error(`ink: no text line near ${est.map(Math.round)} at ${t}`);
  const [a, b] = thick.reduce((p, q) => Math.abs((p[0] + p[1]) / 2 - mid) <= Math.abs((q[0] + q[1]) / 2 - mid) ? p : q);
  // a blob's height is read a little beyond the line's own rows (never into the next run), so a pipe
  // or cursor that overshoots the digits reads as taller than them
  const prevEnd = Math.max(-1, ...runs.filter(r => r[1] < a).map(r => r[1]));
  const nextBeg = Math.min(c.H, ...runs.filter(r => r[0] > b).map(r => r[0]));
  const ea = Math.max(0, a - 10, prevEnd + 3), eb = Math.min(c.H - 1, b + 10, nextBeg - 3);
  // glyph blobs along the line: columns with ink in rows a..b, split on empty columns
  const colInk = Array.from({ length: c.W }, (_, x) => { for (let y = a; y <= b; y++) if (on(x, y)) return true; return false; });
  const blobs = [];
  for (let x = 0; x < c.W; x++) {
    if (!colInk[x]) continue;
    let e = x; while (e + 1 < c.W && colInk[e + 1]) e++;
    let y0 = b, y1 = a;
    for (let xx = x; xx <= e; xx++) for (let y = ea; y <= eb; y++) if (on(xx, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    blobs.push({ x0: x, x1: e + 1, y0, y1: y1 + 1 }); x = e;
  }
  const hs = blobs.filter(g => g.x1 - g.x0 > 6).map(g => g.y1 - g.y0);
  const hMed = hs.length ? median(hs) : b - a;
  for (const g of blobs) {
    const w = g.x1 - g.x0, h = g.y1 - g.y0;
    // a table pipe is 3-4px wide and overshoots the digits; the text cursor (an I-beam, ~12px)
    // overshoots by 30%+; brackets (6-7px) overshoot by ~20% and stay glyphs
    // opts.prose: proportional text (a markdown table) has no pipes, and its "l", "i", "t" overshoot too
    g.kind = !opts.prose && ((w <= 5 && h >= 1.15 * hMed) || (w <= 14 && h >= 1.3 * hMed)) ? "pipe"
           : (h < 0.45 * hMed && w <= 9) ? "punct" : "glyph";
  }
  const near = (from, dir) => {
    const xs = blobs.length ? [Math.min(...blobs.map(g => g.x0)), Math.max(...blobs.map(g => g.x1))] : [xa, xb];
    for (let y = from; y >= 0 && y < c.H; y += dir) {
      let n = 0; for (let x = Math.max(xa - 40, 0); x < Math.min(xb + 40, c.W); x++) if (on(x, y)) n++;
      if (n > 0) return y + c.y0;
    }
    return null;
  };
  const off = g => ({ ...g, x0: g.x0 + c.x0, x1: g.x1 + c.x0, y0: g.y0 + c.y0, y1: g.y1 + c.y0 });
  return { blobs: blobs.map(off), top: a + c.y0, bottom: b + 1 + c.y0, hMed,
           below: near(b + 2, 1), above: near(a - 2, -1) };
};

// The glyph box of one token (a run of glyphs between pipes or spaces) nearest the estimate, or a
// slice of its glyphs. opts.glyphs = [i, j] keeps glyphs i..j-1 ("124" of "124.51456310679612");
// opts.phrase = true merges every token overlapping the estimate (a multi-word cell). Pipes and
// trailing punctuation never count. Returns [x0, y0, x1, y1] of the ink, source px.
export const ink = (t, est, opts = {}) => {
  const L = line(t, est, opts);
  // opts.keepPipes: a whole table ROW, its border pipes included (gZ2's agree box, gZ3's outlier rows)
  const gl = L.blobs.filter(g => opts.keepPipes ? !(g.kind === "pipe" && g.x1 - g.x0 > 5) : g.kind !== "pipe");
  const gapTok = opts.gap ?? Math.max(8, 0.5 * L.hMed);
  const toks = [];
  for (const g of gl) {
    const last = toks.at(-1);
    const pipeBetween = !opts.keepPipes && last && L.blobs.some(p => p.kind === "pipe" && p.x0 >= last.at(-1).x1 && p.x1 <= g.x0);
    if (last && !pipeBetween && g.x0 - last.at(-1).x1 <= gapTok) last.push(g); else toks.push([g]);
  }
  const [e0, , e1] = est, ec = (e0 + e1) / 2;
  const cx = tk => (tk[0].x0 + tk.at(-1).x1) / 2;
  let pick;
  if (opts.phrase) {
    pick = toks.filter(tk => tk.at(-1).x1 > e0 && tk[0].x0 < e1);
    if (!pick.length) throw new Error(`ink: no text inside ${est.map(Math.round)} at ${t}`);
    pick = [pick.flat()];
  } else {
    // a glyph slice is anchored on the token's START (the estimate's left edge); a whole token on its centre
    const d = tk => opts.glyphs ? Math.abs(tk[0].x0 - e0) : Math.abs(cx(tk) - ec);
    pick = [toks.reduce((p, q) => d(p) <= d(q) ? p : q)];
  }
  let gs = pick[0];
  while (gs.length > 1 && gs.at(-1).kind === "punct") gs = gs.slice(0, -1);   // trailing "." "," ":"
  while (gs.length > 1 && gs[0].kind === "punct") gs = gs.slice(1);
  if (opts.glyphs) gs = gs.slice(...opts.glyphs);
  if (!gs.length) throw new Error(`ink: empty glyph slice near ${est.map(Math.round)} at ${t}`);
  const box = [Math.min(...gs.map(g => g.x0)), Math.min(...gs.map(g => g.y0)), Math.max(...gs.map(g => g.x1)), Math.max(...gs.map(g => g.y1))];
  box.line = L; box.n = gs.length;
  // the nearest ink straight under / over the chosen glyphs (a table border, a dashed rule, the next
  // line): an underline keeps clear of it
  const c = crop(t, [box[0], box[1] - 60, box[2], box[3] + 60]), bgc = median(Array.from({ length: 2000 }, (_, k) => c.px((k * 7919) % c.W, (k * 104729) % c.H)));
  const rowOn = y => { for (let x = 0; x < c.W; x++) if (Math.abs(c.px(x, y) - bgc) > (opts.thr ?? 60)) return true; return false; };
  box.below = null; for (let y = box[3] - c.y0 + 1; y < c.H; y++) if (rowOn(y)) { box.below = y + c.y0; break; }
  box.above = null; for (let y = box[1] - c.y0 - 2; y >= 0; y--) if (rowOn(y)) { box.above = y + c.y0 + 1; break; }
  return box;
};
