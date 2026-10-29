// gZ5: punch-in on Rerun's observation.image panel while PushT episode 184 plays (an outlier: 229
// frames). Positions are measured on the frames by colour (_rerun.mjs): the T grey, its target outline
// green. The PushT image is white, so the marks are ink (paper would vanish on it).
// Round 3 (composition review): by "T" (849.5) the T already sits on the outline, so marks keyed to the
// words showed nothing. The one moment the point is visible is the start of the window, when the T is
// still clearly apart from the outline (it rests until ~847.4, then the pusher drives it in). So: one
// short ink arrow from where the T rests to the outline's centre, drawn as the zoom lands and cleared
// before the T has travelled under it (the T reaches the outline at ~852): the T simply started a little
// way off. Then live playback, unmarked.
import { emit, frames, span } from "../lib.mjs";
import { plateauAbs } from "./_zoom.mjs";
import { track, arrow } from "./_rerun.mjs";
const ID = "gZ5";
export default function build() {
  const D = frames(ID) / 30, [P0, P1] = span(ID), [pa] = plateauAbs("gZ5");
  const tr = track(P0, P1);
  const free = tr.filter(q => q.g_n > 900 && q.G);
  if (free.length < 5) throw new Error("gZ5: the outline is never uncovered in the window");
  const G = [0, 1].map(k => free.reduce((a, q) => a + q.G[k], 0) / free.length);
  // where the T rests: its centre while it is still (moves < 6px between samples), before it is pushed
  const rest = tr.filter(q => q.T && q.t <= pa + 0.4);
  const S0 = [0, 1].map(k => rest.reduce((a, q) => a + q.T[k], 0) / rest.length);
  const on = pa + 0.3, off = on + 2.0;                          // 847.0 -> 849.0, cleared by 849.25
  const moved = tr.filter(q => q.T && q.t >= on && q.t <= off + 0.25).map(q => Math.hypot(q.T[0] - S0[0], q.T[1] - S0[1]));
  // a gently bowed arrow, stopping 30px short of the outline's centre so its head reads
  const dx = G[0] - S0[0], dy = G[1] - S0[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const C1 = [(S0[0] + G[0]) / 2 + nx * 0.25 * L, (S0[1] + G[1]) / 2 + ny * 0.25 * L];
  const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([0, 1].map(k => (1 - u) ** 2 * S0[k] + 2 * (1 - u) * u * C1[k] + u * u * G[k])); }
  const keep = pts.filter(p => Math.hypot(p[0] - G[0], p[1] - G[1]) > 30);
  const c = arrow(`${ID}-m`, "gZ5", keep, on, off, P0, 5, undefined, true);
  emit(ID, D, `<div style="position:absolute;inset:0">${c.html}</div>`, c.js);
  console.log(`gZ5: T rests at ${S0.map(Math.round)}, outline at ${G.map(Math.round)} (${Math.round(L)}px apart); the T moves at most ${Math.round(Math.max(...moved))}px while the arrow shows`);
}
