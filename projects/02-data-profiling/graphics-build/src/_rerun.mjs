// Rerun's observation.image panel (PushT), measured on the screen track for gZ5 / gZ6. Rerun's labels
// are too small for OCR, so the T, its target outline and the pusher are found by colour on the real
// frames: the T is grey (r ~ g ~ b, mid luma), the outline green, the pusher blue. The T moves while the
// episode plays, so its ring FOLLOWS it: its centre is measured 10 times a second and keyed into the
// timeline. Coordinates are source px (3840x2160).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
export const PANEL = [1424, 966, 2280, 1820];          // make_demo_spec.py BOX_FROM_FRAME.RERUN_IMAGE
const SCENE = JSON.parse(readFileSync("demo-scene.json", "utf8"));
const S = SCENE.enters.cutSeconds, K = 4, FPS = 10;    // 4x downscale, 10 samples a second
// The T's heading (radians, image axes): its axis of symmetry, pointed by the third moment. A T is
// mirror-symmetric about its stem, so along that axis its mass is skewed (bar at one end) and across it
// the skew is ~0; the eigen-direction with the larger |skew|, signed by it, is the heading. Used only to
// say which way the T turned (gZ6's half turn), never drawn as a measurement.
const heading = (ps, c) => {
  if (!c || ps.length < 50) return null;
  let xx = 0, yy = 0, xy = 0;
  for (const [x, y] of ps) { const dx = x - c[0], dy = y - c[1]; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
  const th = 0.5 * Math.atan2(2 * xy, xx - yy);
  const sk = a => { let s3 = 0; const u = [Math.cos(a), Math.sin(a)]; for (const [x, y] of ps) { const d = (x - c[0]) * u[0] + (y - c[1]) * u[1]; s3 += d * d * d; } return s3 / ps.length; };
  const a = sk(th), b = sk(th + Math.PI / 2);
  return Math.abs(a) >= Math.abs(b) ? (a >= 0 ? th : th + Math.PI) : (b >= 0 ? th + Math.PI / 2 : th - Math.PI / 2);
};
export const track = (t0, t1) => {
  const [x0, y0, x1, y1] = PANEL, W = Math.round((x1 - x0) / K), H = Math.round((y1 - y0) / K), kx = (x1 - x0) / W, ky = (y1 - y0) / H;
  const buf = execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-ss", (t0 - S).toFixed(3), "-t", (t1 - t0).toFixed(3),
    "-i", "../outputs/base-screen.mp4", "-vf", `fps=${FPS},crop=${x1 - x0}:${y1 - y0}:${x0}:${y0},scale=${W}:${H}:flags=area,format=rgb24`,
    "-f", "rawvideo", "-"], { maxBuffer: 1 << 30 });
  const n = W * H * 3, out = [];
  for (let f = 0; f * n + n <= buf.length; f++) {
    const T = [], G = [], B = [];
    for (let i = 0; i < W * H; i++) {
      const r = buf[f * n + 3 * i], g = buf[f * n + 3 * i + 1], b = buf[f * n + 3 * i + 2];
      const x = x0 + (i % W + 0.5) * kx, y = y0 + (Math.floor(i / W) + 0.5) * ky;
      if (Math.abs(r - g) < 22 && Math.abs(g - b) < 30 && g > 95 && g < 200 && b >= r) T.push([x, y]);
      else if (g - r > 40 && g - b > 40) G.push([x, y]);
      else if (b - r > 60 && b - g > 30) B.push([x, y]);
    }
    const c = ps => ps.length ? [ps.reduce((a, p) => a + p[0], 0) / ps.length, ps.reduce((a, p) => a + p[1], 0) / ps.length] : null;
    const rad = (ps, cc) => { if (!cc) return 0; const d = ps.map(p => Math.hypot(p[0] - cc[0], p[1] - cc[1])).sort((a, b) => a - b); return d[Math.floor(d.length * 0.95)] || 0; };
    const tc = c(T), gc = c(G);
    out.push({ t: +(t0 + f / FPS).toFixed(3), t_n: T.length, T: tc, Tr: rad(T, tc), g_n: G.length, G: gc, Gr: rad(G, gc), P: c(B), H: heading(T, tc) });
  }
  return out;
};

// ---- marks on the panel. The PushT image is WHITE, so these marks are INK: paper marks (style.md
// 2026-09-29, for dark terminals) would vanish on it. Every position is a measured one.
import { C, zoomItem, markSVG } from "../lib.mjs";
import { mapZoom } from "./_zoom.mjs";
import { drawAll, hide, f3 } from "../common.mjs";
const pt = (zid, [x, y]) => { const b = mapZoom(zid, [x, y, x, y]); return [b[0], b[1]]; };
const rOut = (zid, r) => r * zoomItem(zid).zoom / 2;
// smoothed T centres (median of 3) for samples inside [a, b]
export const tPath = (tr, a, b) => {
  const s = tr.filter(q => q.T && q.t >= a - 0.11 && q.t <= b + 0.11);
  return s.map((q, i) => {
    const w = s.slice(Math.max(0, i - 1), i + 2).map(z => z.T);
    const m = k => w.map(v => v[k]).sort((p, r) => p - r)[w.length >> 1];
    return { t: q.t, p: [m(0), m(1)] };
  });
};
// a ring that FOLLOWS the T from on to off (cut seconds), its centre keyed every 0.1s
export const followRing = (id, zid, tr, on, off, P0, r = 140, w = 5) => {
  const path = tPath(tr, on, off), c0 = pt(zid, path[0].p), R = rOut(zid, r);
  const html = markSVG(c0[0] - R, c0[1] - R, c0[0] + R, c0[1] + R,
    `<circle id="${id}" cx="${c0[0].toFixed(1)}" cy="${c0[1].toFixed(1)}" r="${R.toFixed(1)}" pathLength="1" fill="none" stroke="${C.ink}" stroke-width="${w}" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`, 30);
  let js = `tl.fromTo("#${id}",{opacity:0},{opacity:1,duration:0.2},${f3(on - P0)});\n` + drawAll(`#${id}`, on - P0, 0.4);
  for (let i = 1; i < path.length; i++) {
    const c = pt(zid, path[i].p);
    // start and duration from the SAME rounded times, so consecutive keys touch and never overlap
    const s0 = +(path[i - 1].t - P0).toFixed(3), s1 = +(path[i].t - P0).toFixed(3);
    js += `tl.to("#${id}",{x:${(c[0] - c0[0]).toFixed(1)},y:${(c[1] - c0[1]).toFixed(1)},duration:${(s1 - s0 - 0.001).toFixed(3)},ease:"none"},${s0.toFixed(3)});\n`;
  }
  js += hide(`#${id}`, off - P0, 0.25);
  return { html, js, path };
};
// a still ring (the target outline does not move), settling 6px as it draws (the seek check reads geometry)
export const ring = (id, zid, c, on, off, P0, r = 140, w = 5) => {
  const cc = pt(zid, c), R = rOut(zid, r);
  const html = markSVG(cc[0] - R, cc[1] - R, cc[0] + R, cc[1] + R,
    `<circle id="${id}" cx="${cc[0].toFixed(1)}" cy="${cc[1].toFixed(1)}" r="${R.toFixed(1)}" pathLength="1" fill="none" stroke="${C.ink}" stroke-width="${w}" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`, 30);
  const js = `tl.fromTo("#${id}",{opacity:0},{opacity:1,duration:0.2},${f3(on - P0)});\n` + drawAll(`#${id}`, on - P0, 0.4) + `tl.fromTo("#${id}",{y:6},{y:0,duration:0.4,ease:"power2.out"},${f3(on - P0)});\n` + hide(`#${id}`, off - P0, 0.25);
  return { html, js };
};
// an arrow along source points pts (a measured path, or a drawn arc), arrowhead at the end
export const arrow = (id, zid, pts, on, off, P0, w = 5, col = C.ink, startDot = false) => {
  const q = pts.map(p => pt(zid, p));
  const d = "M" + q.map(p => p.map(v => v.toFixed(1)).join(",")).join(" L");
  const [a, b] = [q[q.length - 2], q[q.length - 1]], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 22;
  const h = [ang + 2.6, ang - 2.6].map(t => [b[0] + L * Math.cos(t), b[1] + L * Math.sin(t)]);
  const head = `M${h[0].map(v => v.toFixed(1)).join(",")} L${b.map(v => v.toFixed(1)).join(",")} L${h[1].map(v => v.toFixed(1)).join(",")}`;
  const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
  const html = markSVG(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys),
    `<g id="${id}" style="opacity:0"><path class="ln" d="${d}" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`
    + `<path class="hd" d="${head}" pathLength="1" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`
    + (startDot ? `<circle class="st" cx="${q[0][0].toFixed(1)}" cy="${q[0][1].toFixed(1)}" r="9" fill="${col}" style="opacity:0"/>` : "") + `</g>`, 40);
  // round caps at dash offset 1 paint dots: the arrow's group stays at opacity 0 until it draws
  const js = `tl.fromTo("#${id}",{opacity:0},{opacity:1,duration:0.2},${f3(on - P0)});\n`
    + (startDot ? `tl.fromTo("#${id} .st",{opacity:0},{opacity:1,duration:0.25},${f3(on - P0)});\n` : "")
    + drawAll(`#${id} .ln`, on - P0, 0.9) + drawAll(`#${id} .hd`, on - P0 + 0.85, 0.2)
    + `tl.fromTo("#${id}",{y:6},{y:0,duration:0.9,ease:"power2.out"},${f3(on - P0)});\n` + hide(`#${id}`, off - P0, 0.25);
  return { html, js };
};
