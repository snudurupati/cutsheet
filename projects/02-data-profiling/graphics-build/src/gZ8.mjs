// gZ8: two punch-ins on the notebook's Push-T plots, added 2026-10-28 because the finished-cut composition
// review found 11:13-12:26 with no graphic (72s, over the 60s demo rule). Framings split at his measured
// re-runs and scrolls (make_demo_spec.py: gZ8a 686.6-698.0, gZ8b 710.7-734.33).
// The plots are images, so OCR cannot place anything on them. Every mark is placed on the PLOT ITSELF,
// measured on a frame of its own plateau: the curve is matplotlib's default blue (31,119,180) and its
// dashed percentile lines are the same blue, found column by column.
//   gZ8a  the sorted episode lengths. "sideways S curve" (687.57): an ink trace along the measured curve;
//         "most of the episodes" (690.67): an ink bracket round the flat middle (episodes ~50-150);
//         "outliers" (696.36): the accent ring on the steep top end. All leave before the plateau ends.
//   gZ8b  the percentile plot. "99" / "122" / "148" (717.57 / 719.73 / 722.53): an ink ring where each
//         dashed line meets the curve; then "bottom end" (728.90) an ink ring on the curve's low start and
//         "top end" (729.73) the accent ring on its high end, held to the plateau's end.
// Ink on the plot's white panel (as gZ5/gZ6 on Rerun's white image), one accent at a time.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { C, emit, frames, span, markSVG } from "../lib.mjs";
import { cueRel, drawAll, hide, f3 } from "../common.mjs";
import { mapZoom, plateauAbs } from "./_zoom.mjs";

const ID = "gZ8";
const S = JSON.parse(readFileSync("demo-scene.json", "utf8")).enters.cutSeconds;

// one frame of the screen track, a source-px region, as rgb rows
const grab = (t, [x0, y0, x1, y1]) => {
  const w = x1 - x0, h = y1 - y0;
  const buf = execFileSync("ffmpeg", ["-v", "error", "-ss", (t - S).toFixed(3), "-i", "../outputs/base-screen.mp4", "-frames:v", "1",
    "-vf", `crop=${w}:${h}:${x0}:${y0}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 28 });
  const isBlue = (x, y) => { const i = 3 * ((y - y0) * w + (x - x0)), r = buf[i], g = buf[i + 1], b = buf[i + 2];
    return b > 140 && b - r > 70 && g > 70 && g < 170; };
  return { isBlue };
};

// the curve: per column, the mean y of its blue pixels, skipping columns that are a dashed line
const curve = (t, box, dashX = []) => {
  const { isBlue } = grab(t, box), pts = [];
  for (let x = box[0] + 2; x < box[2] - 2; x += 3) {
    if (dashX.some(d => Math.abs(d - x) < 6)) continue;
    const ys = []; for (let y = box[1]; y < box[3]; y++) if (isBlue(x, y)) ys.push(y);
    if (ys.length && ys.length < 60) pts.push([x, ys.reduce((a, b) => a + b, 0) / ys.length]);
  }
  if (pts.length < 100) throw new Error(`${ID}: the curve was not found at ${t}s (${pts.length} columns)`);
  return pts;
};
// dashed vertical lines: columns with blue in many rows spread over the plot's height
const dashes = (t, box) => {
  const { isBlue } = grab(t, box), cols = [];
  for (let x = box[0]; x < box[2]; x++) { let n = 0; for (let y = box[1]; y < box[3]; y += 2) n += isBlue(x, y); cols.push([x, n]); }
  const hot = cols.filter(([, n]) => n > 30)   // an antialiased line splits over two columns (the 50th: 45 + 8)
  .map(([x]) => x), groups = [];
  for (const x of hot) { if (groups.length && x - groups[groups.length - 1].at(-1) <= 3) groups[groups.length - 1].push(x); else groups.push([x]); }
  return groups.map(g => g.reduce((a, b) => a + b, 0) / g.length);
};
const yAt = (pts, x) => pts.reduce((a, b) => Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a)[1];

export default function build() {
  const D = frames(ID) / 30, P0 = span(ID)[0], cue = k => P0 + cueRel(ID, k), rel = t => f3(t - P0);
  const pt = (zid, [x, y]) => { const m = mapZoom(zid, [x, y, x, y]); return [m[0], m[1]]; };
  const scale = zid => { const a = mapZoom(zid, [0, 0, 100, 0]); return (a[2] - a[0]) / 100; };
  let html = "", js = "";
  const ring = (id, zid, c, r, on, off, col = C.ink, w = 5) => {
    const q = pt(zid, c), R = r * scale(zid);
    html += markSVG(q[0] - R, q[1] - R, q[0] + R, q[1] + R,
      `<circle id="${id}" cx="${f3(q[0])}" cy="${f3(q[1])}" r="${f3(R)}" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`, 30);
    js += `tl.fromTo("#${id}",{opacity:0},{opacity:1,duration:0.2},${rel(on)});\n` + drawAll(`#${id}`, on - P0, 0.45)
        + `tl.fromTo("#${id}",{y:6},{y:0,duration:0.4,ease:"power2.out"},${rel(on)});\n` + hide(`#${id}`, off - P0, 0.25);
  };
  const path = (id, zid, pts, on, off, d = 0.9, col = C.ink, w = 7, op = 0.55) => {
    const q = pts.map(p => pt(zid, p)), xs = q.map(p => p[0]), ys = q.map(p => p[1]);
    html += markSVG(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys),
      `<path id="${id}" d="M${q.map(p => p.map(f3).join(",")).join(" L")}" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`, 30);
    js += `tl.fromTo("#${id}",{opacity:0},{opacity:${op},duration:0.15},${rel(on)});\n` + drawAll(`#${id}`, on - P0, d) + hide(`#${id}`, off - P0, 0.25);
  };
  // review 2026-10-28: a box the curve ran corner to corner through said nothing; a span bracket UNDER the
  // curve (horizontal, end ticks pointing up at it) says "this stretch of episodes"
  const bracket = (id, zid, x0, x1, y, on, off, tick = 28) => {
    const a = pt(zid, [x0, y]), b = pt(zid, [x1, y]), tk = tick * scale(zid);
    html += markSVG(a[0], a[1] - tk, b[0], b[1],
      `<path id="${id}" d="M${f3(a[0])},${f3(a[1] - tk)} V${f3(a[1])} H${f3(b[0])} V${f3(b[1] - tk)}" pathLength="1" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`, 30);
    js += `tl.fromTo("#${id}",{opacity:0},{opacity:1,duration:0.2},${rel(on)});\n` + drawAll(`#${id}`, on - P0, 0.6) + hide(`#${id}`, off - P0, 0.25);
  };

  // ---------------------------------------------------------------- gZ8a, the S-curve
  const [a0, a1] = plateauAbs("gZ8a"), offA = a1 - 0.3, offTop = a1 - 0.05;   // the top ring holds into the zoom-out
  const SC = [908, 791, 2142, 1725], crvA = curve(692.0, SC);
  const xL = crvA[0][0], xR = crvA.at(-1)[0];
  path(`${ID}-tr`, "gZ8a", crvA, Math.max(a0 + 0.05, cue("sideways")), offA, 1.0);
  // episodes 0..205 span the curve's columns: the bracket covers episodes 25-175, 30 source px under the
  // lowest point of the curve in that stretch (the curve rises left to right, so that is its left end)
  const xEp = ep => xL + (xR - xL) * ep / 205, span_ = crvA.filter(([x]) => x >= xEp(25) && x <= xEp(175));
  bracket(`${ID}-mid`, "gZ8a", xEp(25), xEp(175), Math.max(...span_.map(p => p[1])) + 30, cue("most"), offA);
  // the steep top end: a smaller ring (85 source px) on the KNEE where the outliers begin (episode ~194),
  // inside the white plot (right edge 2142) and below the tip where his cursor hovers
  const PLOT_R = 2142, RT = 85;
  const knee = A => { const c = [xEp(194), yAt(A, xEp(194))]; c[0] = Math.min(c[0], PLOT_R - RT - 14); return c; };
  const tOut = cue("top") - 0.84;                                       // "outliers" (696.36), the plateau ends at 697.45
  ring(`${ID}-top`, "gZ8a", knee(crvA), RT, tOut, offTop, C.accent, 6);
  if (offTop - tOut < 1.0) throw new Error(`${ID}: the top-end ring would be on for under 1s`);

  // ---------------------------------------------------------------- gZ8b, the percentile plot
  const [b0, b1] = plateauAbs("gZ8b"), offB = b1 - 0.3;
  // the curve's near-vertical top end (x ~2068) also reads as a column of blue: keep lines left of x 2000
  const PB = [908, 882, 2142, 1816], dx = dashes(720.0, PB).filter(x => x < 2000);
  if (dx.length !== 3) throw new Error(`${ID}: found ${dx.length} dashed percentile lines at 720.0, want 3 (${dx.map(Math.round)})`);
  const crvB = curve(720.0, PB, dx);
  const pts = dx.map(x => [x, yAt(crvB, x)]);
  [["p99", 0], ["p122", 1], ["p148", 2]].forEach(([k, i]) => ring(`${ID}-${k}`, "gZ8b", pts[i], 46, cue(k), cue("bottom") - 0.4));
  // review 2026-10-28: the bottom ring crossed the y axis and its "50"; the top ring spilt past the plot.
  // Bottom: 60 source px, centred on the curve ~3 percentiles in (clear of the axis at x ~1100); top: the
  // knee at the 96th percentile, 85 px, kept inside the plot's right edge
  const xB0 = crvB[0][0], xB1 = crvB.at(-1)[0], xPc = q => xB0 + (xB1 - xB0) * q / 100;
  const loC = [xPc(4) + 10, yAt(crvB, xPc(4)) - 12];
  ring(`${ID}-lo`, "gZ8b", loC, 60, cue("bottom"), offB);
  const hiC = [Math.min(xPc(96), PLOT_R - RT - 14), yAt(crvB, xPc(96))];
  ring(`${ID}-hi`, "gZ8b", hiC, RT, cue("topend"), offB, C.accent, 6);
  for (const [k, t] of [["sideways", cue("sideways")], ["p99", cue("p99")], ["topend", cue("topend")]])
    if (!((t >= a0 && t <= a1) || (t >= b0 && t <= b1))) throw new Error(`${ID}: cue ${k} at ${t} lands outside both plateaus`);

  // a 2px clock across the whole part, as _zoom.marks().clock: the seek check needs motion on every frame
  html += `<div id="${ID}-clock" style="position:absolute;left:0;top:0;width:2px;height:2px"></div>`;
  js += `tl.fromTo("#${ID}-clock",{x:0},{x:200,duration:${f3(D)},ease:"none"},0);\n`;
  emit(ID, D, `<div style="position:absolute;inset:0">${html}</div>`, js);
  console.log(`${ID}: S-curve ${crvA.length} cols, knee ring at ${knee(crvA).map(Math.round)}; dashes at ${dx.map(Math.round)}, meeting the curve at y ${pts.map(p => Math.round(p[1]))}`);
}
