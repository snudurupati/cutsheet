// gZ9: punch-in on Rerun's observation.images.top panel for ALOHA (sim insertion), added 2026-10-28 because the
// finished-cut composition review found 24:50-25:51 with no graphic (60s) and ALOHA with no Rerun punch-in
// against Push-T's two (gZ5, gZ6). Zoom 2.0, left of the face inset (make_demo_spec.py RERUN_ALOHA).
// The two blocks are pure colours on a grey render, so they are FOUND, not placed: the blue and the red
// block's centres are measured on the screen track 10 times a second (as _rerun.mjs tracks the T) and
// each paper ring follows its block, keyed into the timeline.
//   "blue rectangle" (1525.53)  a ring follows the blue block      "red rectangle" (1529.43)  the red block
//   both leave as he re-runs (1539.40: the episode restarts and the blocks jump back)
//   "the blue one picks it up" (1542.20) blue again; "the red one picks it up" (1543.60) red again
//   "the red one inserts" (1547.90): the red ring hands over to the ACCENT ring on the red block as it goes
//   in, held to the plateau's end. One accent, at the payoff.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { C, emit, frames, span, markSVG } from "../lib.mjs";
import { cueRel, drawAll, hide, f3 } from "../common.mjs";
import { mapZoom, plateauAbs } from "./_zoom.mjs";

const ID = "gZ9";
const S = JSON.parse(readFileSync("demo-scene.json", "utf8")).enters.cutSeconds;
const BOX = [480, 1130, 1650, 1660], K = 2, FPS = 10;          // the panel, 2x downscale, 10 samples a second

// centres of the blue and red blocks, every 0.1s across [t0, t1] (cut seconds); null where not visible
const track = (t0, t1) => {
  const w = (BOX[2] - BOX[0]) / K, h = (BOX[3] - BOX[1]) / K;
  const buf = execFileSync("ffmpeg", ["-v", "error", "-ss", (t0 - S).toFixed(3), "-t", (t1 - t0).toFixed(3), "-i", "../outputs/base-screen.mp4",
    "-vf", `fps=${FPS},crop=${BOX[2] - BOX[0]}:${BOX[3] - BOX[1]}:${BOX[0]}:${BOX[1]},scale=${w}:${h}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 30 });
  const n = w * h * 3, out = [];
  for (let f = 0; f * n + n <= buf.length; f++) {
    const acc = { b: [0, 0, 0], r: [0, 0, 0] };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = f * n + 3 * (y * w + x), R = buf[i], G = buf[i + 1], B = buf[i + 2];
      if (B > 170 && R < 70 && G < 70) { acc.b[0] += x; acc.b[1] += y; acc.b[2]++; }
      if (R > 170 && G < 70 && B < 70) { acc.r[0] += x; acc.r[1] += y; acc.r[2]++; }
    }
    const c = a => a[2] >= 12 ? [BOX[0] + K * a[0] / a[2], BOX[1] + K * a[1] / a[2]] : null;
    out.push({ t: +(t0 + f / FPS).toFixed(3), B: c(acc.b), R: c(acc.r) });
  }
  return out;
};

export default function build() {
  const D = frames(ID) / 30, [P0, P1] = span(ID), cue = k => P0 + cueRel(ID, k), rel = t => +(t - P0).toFixed(3);
  const [pa, pb] = plateauAbs("gZ9"), off = pb - 0.3;
  const tr = track(pa, pb);
  const pt = c => { const m = mapZoom("gZ9", [c[0], c[1], c[0], c[1]]); return [m[0], m[1]]; };
  const Rr = 70 * (mapZoom("gZ9", [0, 0, 100, 0])[2] - mapZoom("gZ9", [0, 0, 0, 0])[2]) / 100;   // 70 source px
  let html = "", js = "";
  // a ring that follows key ("B" blue, "R" red, "M" the pair's midpoint) from on to off; a sample where a
  // block is hidden holds its last position. r: radius in canvas px.
  const posOf = (q, key) => key === "M" ? (q.B && q.R ? [(q.B[0] + q.R[0]) / 2, (q.B[1] + q.R[1]) / 2] : null) : q[key];
  const follow = (id, key, on, off2, col = C.bg, w = 6, r = Rr, fade = 0.25) => {
    const path = tr.filter(q => q.t >= on - 0.05 && q.t <= off2 + 0.05);
    let last = null; const pos = path.map(q => { const p = posOf(q, key); if (p) last = p; return last; });
    if (pos.filter(Boolean).length < 3) throw new Error(`${ID}: ${key} is not visible ${on}-${off2}`);
    const c0 = pt(pos.find(Boolean));
    html += markSVG(c0[0] - r, c0[1] - r, c0[0] + r, c0[1] + r,
      `<circle id="${id}" cx="${f3(c0[0])}" cy="${f3(c0[1])}" r="${f3(r)}" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`, 30);
    js += `tl.fromTo("#${id}",{opacity:0},{opacity:1,duration:0.2},${rel(on)});\n` + drawAll(`#${id}`, on - P0, 0.4);
    for (let i = 1; i < path.length; i++) {
      if (!pos[i]) continue;
      const c = pt(pos[i]), s0 = rel(Math.max(on, path[i - 1].t)), s1 = rel(Math.max(on, path[i].t));
      if (s1 <= s0) continue;
      js += `tl.to("#${id}",{x:${f3(c[0] - c0[0])},y:${f3(c[1] - c0[1])},duration:${(s1 - s0 - 0.001).toFixed(3)},ease:"none"},${s0.toFixed(3)});\n`;
    }
    js += hide(`#${id}`, off2 - P0, fade);
  };
  // Composition review 2026-10-28 (fixed here): two rings overlapping ~70% for 7s read as double vision,
  // and on "inserts" the accent and paper rings crossed like a Venn diagram. Separate rings only while
  // the blocks are APART (centres more than CLOSE source px); once they close in, ONE ring encloses the
  // pair (radius 1.35 rings); on "inserts" that pair ring hands over to the accent, held >= 1.5s.
  const CLOSE = 90, RP = 1.35 * Rr;
  const dist = q => q.B && q.R ? Math.hypot(q.B[0] - q.R[0], q.B[1] - q.R[1]) : 1e9;
  const tRerun = cue("rerun") - 0.2, tIns = cue("inserts"), offAcc = pb - 0.25;
  const tMerge = (tr.find(q => q.t >= cue("redone") && dist(q) < CLOSE) || {}).t;
  if (!tMerge || tMerge > tIns - 0.5) throw new Error(`${ID}: the blocks never close in before "inserts" (${tMerge})`);
  if (tr.filter(q => q.t >= cue("red") && q.t <= tRerun).some(q => dist(q) > CLOSE + 25))
    throw new Error(`${ID}: the blocks separate between "red rectangle" and the re-run; the pair ring would lie`);
  follow(`${ID}-b1`, "B", cue("blue"), cue("red"), C.bg, 6, Rr, 0.2);
  follow(`${ID}-p1`, "M", cue("red"), tRerun, C.bg, 6, RP);
  follow(`${ID}-b2`, "B", cue("blueone"), tMerge, C.bg, 6, Rr, 0.2);
  follow(`${ID}-r2`, "R", cue("redone"), tMerge, C.bg, 6, Rr, 0.2);
  follow(`${ID}-p2`, "M", tMerge, tIns, C.bg, 6, RP, 0.2);
  follow(`${ID}-ins`, "M", tIns, offAcc, C.accent, 7, RP);
  if (offAcc - tIns < 1.5) throw new Error(`${ID}: the accent holds ${(offAcc - tIns).toFixed(2)}s, want >= 1.5`);
  console.log(`${ID}: blocks merge at ${tMerge}; accent ${tIns.toFixed(2)}-${offAcc.toFixed(2)}`);
  html += `<div id="${ID}-clock" style="position:absolute;left:0;top:0;width:2px;height:2px"></div>`;
  js += `tl.fromTo("#${ID}-clock",{x:0},{x:200,duration:${f3(D)},ease:"none"},0);\n`;
  emit(ID, D, `<div style="position:absolute;inset:0">${html}</div>`, js);
  const seen = k => tr.filter(q => q[k]).length;
  console.log(`${ID}: ${tr.length} samples, blue seen ${seen("B")}, red seen ${seen("R")}; ring radius ${Rr.toFixed(0)}px`);
}
