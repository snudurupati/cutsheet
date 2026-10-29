// gZ6: punch-in on Rerun's observation.image panel for PushT episode 174 (the other outlier: 246
// frames). Measured by colour on the frames (_rerun.mjs); ink marks on the white image.
//   "T"        an ink ring on the T that follows it (it sits still, then the pusher moves it), kept inside
//              the image panel, and with it an ink ring on the target outline (round 3: while they are apart)
//   "mirror"   the T ring leaves; a half-turn arrow round the outline: a 180-degree arc around the
//              target, starting on the side the T came from and turning the way the T actually turned
//              (its heading, measured from its shape, goes from about -60 to about 130 degrees, turning
//              counter-clockwise on screen): it began mirror-opposite to where it had to go
//              the outline ring and the arc hold to the end of the zoom
import { emit, frames, span } from "../lib.mjs";
import { cueRel } from "../common.mjs";
import { plateauAbs } from "./_zoom.mjs";
import { track, followRing, ring, arrow, PANEL } from "./_rerun.mjs";
const ID = "gZ6";
export default function build() {
  const D = frames(ID) / 30, [P0, P1] = span(ID), [pa, pb] = plateauAbs("gZ6"), cue = k => P0 + cueRel(ID, k);
  const tr = track(P0, P1);
  const free = tr.filter(q => q.g_n > 1100 && q.G);
  if (free.length < 5) throw new Error("gZ6: the outline is never uncovered in the window");
  const G = [0, 1].map(k => free.reduce((a, q) => a + q.G[k], 0) / free.length);
  const T0 = [0, 1].map(k => tr.slice(0, 10).reduce((a, q) => a + q.T[k], 0) / 10);   // the T at rest
  // which way it turned: the unwrapped heading from rest to the end of the window
  const hs = tr.map(q => q.H).filter(h => h != null); let tot = 0;
  for (let i = 1; i < hs.length; i++) { let d = hs[i] - hs[i - 1]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; tot += d; }
  if (Math.abs(tot) < 2.4) throw new Error(`gZ6: the T turned ${(tot * 180 / Math.PI).toFixed(0)} degrees, not about a half turn`);
  const dir = Math.sign(tot);                       // image axes: negative = counter-clockwise on screen
  const off = pb - 0.3;
  // the T ring stays inside the image panel: its radius is the smaller of 140px and the T's clearance
  // to the panel's edges along the path it follows
  const tOn = Math.max(pa, cue("t")), tOff = cue("mirror") - 0.25;
  const pth = tr.filter(q => q.T && q.t >= tOn && q.t <= tOff);
  const rT = Math.min(140, ...pth.map(q => Math.min(q.T[0] - PANEL[0], PANEL[2] - q.T[0], q.T[1] - PANEL[1], PANEL[3] - q.T[1]) - 8));
  const a = followRing(`${ID}-t`, "gZ6", tr, tOn, tOff, P0, rT);
  const R = 195, a0 = Math.atan2(T0[1] - G[1], T0[0] - G[0]);
  const pts = []; for (let i = 0; i <= 36; i++) { const t = a0 + dir * Math.PI * i / 36; pts.push([G[0] + R * Math.cos(t), G[1] + R * Math.sin(t)]); }
  const c = arrow(`${ID}-m`, "gZ6", pts, cue("mirror"), off, P0);
  // round 3: the outline's ring lands WITH the T ring, while the two are clearly apart
  const b = ring(`${ID}-o`, "gZ6", G, tOn, off, P0);
  emit(ID, D, `<div style="position:absolute;inset:0">${a.html + c.html + b.html}</div>`, a.js + c.js + b.js);
  console.log(`gZ6: outline at ${G.map(Math.round)}, T rests at ${T0.map(Math.round)}, turned ${(tot * 180 / Math.PI).toFixed(0)} degrees`);
}
