// g19: ALOHA explained with the series' SO-101 line art, doubled. Opaque card over the notebook.
// "insertion": a peg and a socket lie on the table. On "arms" two arms face each other, grippers
// down on the objects; they lift them (the object rides INSIDE the forearm group, counter-rotated so
// it stays level: what the gripper moves it holds). On "insert" both arms reach in and the peg seats
// in the socket. Between, the two arms bob together. On "tandem" every joint ring on both arms
// pulses at once and the line lands. The peg is the one accent.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, cueRel, exitIfFree, f3 } from "../common.mjs";
import { arm } from "./_demo1.mjs";

const ID = "g19";
const POS = { x: 1340, y: 56 };
export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  const F = fg(ID), M = dim(ID);
  const W = 540, H = 380, SY = 58;               // scene top inside the card
  const L = 18, R = 300;                         // arm SVG lefts; right arm mirrored (gap math below)
  const rot = ([x, y], [cx, cy], a) => { const r = a * Math.PI / 180, dx = x - cx, dy = y - cy;
    return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)]; };
  const wristAt = (u, f) => rot(rot([187, 84], [91, 84], f), [91, 188], u);   // wrist pivot, arm space
  // Review 2026-10-28: meet at an angle with the elbows bent, not a flat bridge. Insert pose: forearms
  // tilt BETA down, the wrists turn -BETA so peg and socket stay level and collinear (symmetric arms).
  // The peg tip (wrist + 47) must pass the socket mouth (mirrored wrist + 51) by 20px:
  // 2 * wristX = 424  ->  91 + 104 sin U + 96 cos BETA = 212.
  const BETA = 25, U = Math.asin((212 - 91 - 96 * Math.cos(BETA * Math.PI / 180)) / 104) * 180 / Math.PI;
  // pickup pose: the wrist keeps the object level on the table; the right arm sets the table (socket
  // outer edge 15 below its centre), the left arm's shoulder is solved so the peg (6) rests on it too
  const uR = 25, fR = 45, TOP = wristAt(uR, fR)[1] + 15;
  let uL = uR; for (let u = 10; u <= 45; u += 0.05) { if (Math.abs(wristAt(u, fR)[1] + 6 - TOP) < Math.abs(wristAt(uL, fR)[1] + 6 - TOP)) uL = u; }
  const xP = wristAt(uL, fR)[0] + 27, xS = wristAt(uR, fR)[0] + 29;
  const tableX0 = L + xP - 40, tableX1 = R + 220 - xS + 40;   // spans both resting objects

  const peg = `<g id="${ID}-peg"><rect x="194" y="78" width="40" height="12" rx="3" fill="${C.accent}" stroke="${C.accent}" stroke-width="2"/></g>`;
  const sock = `<g id="${ID}-sock"><path d="M238,71 H198 Q194,71 194,75 V93 Q194,97 198,97 H238" fill="none" stroke="${F}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></g>`;
  const table = `<svg id="${ID}-table" style="position:absolute;left:0;top:${SY}px;overflow:visible" width="${W}" height="260" viewBox="0 0 ${W} 260">
    <path d="M${f3(tableX0)},${f3(TOP)} H${f3(tableX1)} M${f3(tableX0 + 16)},${f3(TOP)} V242 M${f3(tableX1 - 16)},${f3(TOP)} V242" fill="none" stroke="${M}" stroke-width="3" stroke-linecap="round"/>
    <path d="M0,242 H${W - 12}" stroke="${M}" stroke-width="2" opacity="0.6"/></svg>`;
  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${W}px;height:${H}px">
  ${EYEBROW("ALOHA sim insertion", 24, 18, M, `${ID}-eb`)}
  ${table}
  <div id="${ID}-armL" style="position:absolute;left:0;top:${SY}px;width:${W}px;height:260px">${arm(`${ID}-L`, L, 0, F, peg, false, [71, 97])}</div>
  <div id="${ID}-armR" style="position:absolute;left:0;top:${SY}px;width:${W}px;height:260px">${arm(`${ID}-R`, R, 0, F, sock, true, [62, 106])}</div>
  ${T("two arms, one task, in tandem", 24, 326, 24, { weight: 700, color: F, id: `${ID}-lbl` })}
</div>`;

  const tAl = 1280.2 - 1278.8667, tIns = 1281.1 - 1278.8667;     // "Aloha", "insertion" (transcript-cut.json)
  const tArms = c("arms"), tInsert = c("insert"), tTan = c("tandem");
  // review 2026-10-28: the lift eases over ~1.2s (it whipped in 0.4s); the jaws close on the object
  // first (peg clamped between them, socket gripped from outside)
  const tGrip = tArms + 0.35, tLift = tArms + 0.75, dLift = 1.2, dIns = 0.9;
  let js = wipeUp(`#${ID}-card`, Math.max(0, tAl - 1.0), 0.35);   // enters ~1s before "Aloha"
  js += rowUp(`#${ID}-eb`, tAl);
  js += show(`#${ID}-table`, tIns - 0.3, 0.35);
  const CLOSE = { L: 5, R: 5 };                  // jaw travel: L 71/97 -> 76/92 (peg 78-90), R 62/106 -> 67/101
  const pose = (s, u, f) => {
    const at = (sel, svg, a0, a1, t, d, ease = "sine.inOut", ir = false, extra = "") =>
      `tl.fromTo("#${ID}-${s}-${sel}",{rotation:${f3(a0)},svgOrigin:"${svg}"},{rotation:${f3(a1)},svgOrigin:"${svg}",duration:${d},ease:"${ease}",immediateRender:${ir}${extra}},${f3(t)});\n`;
    let j = "";
    // hold the pickup pose from frame 0 (wrist keeps the object level), grip, lift, insert
    j += at("u", "91 188", u, u, 0, 0.2, "none", true) + at("f", "91 84", f, f, 0, 0.2, "none", true) + at("w", "187 84", -(u + f), -(u + f), 0, 0.2, "none", true);
    j += `tl.fromTo("#${ID}-${s}-jt",{y:0},{y:${CLOSE[s]},duration:0.3,ease:"power2.out"},${f3(tGrip)});\n`;
    j += `tl.fromTo("#${ID}-${s}-jb",{y:0},{y:${-CLOSE[s]},duration:0.3,ease:"power2.out"},${f3(tGrip)});\n`;
    j += at("u", "91 188", u, 0, tLift, dLift) + at("f", "91 84", f, 0, tLift, dLift) + at("w", "187 84", -(u + f), 0, tLift, dLift);
    j += at("u", "91 188", 0, U, tInsert, dIns) + at("f", "91 84", 0, BETA - U, tInsert, dIns) + at("w", "187 84", 0, -BETA, tInsert, dIns);
    // 12-16s: the arms work together, a slow shared wrist-and-forearm nod (tips stay level)
    const bob0 = tInsert + dIns + 0.4, n = Math.max(1, Math.floor((tTan - 0.3 - bob0) / 1.6));
    j += at("f", "91 84", BETA - U, BETA - U + 4, bob0, 0.8, "sine.inOut", false, `,yoyo:true,repeat:${2 * n - 1}`);
    j += at("w", "187 84", -BETA, -BETA - 4, bob0, 0.8, "sine.inOut", false, `,yoyo:true,repeat:${2 * n - 1}`);
    // "tandem": every joint ring on both arms pulses at once
    j += [0, 1].map(k => `tl.fromTo("#${ID}-${s}-j${k}",{attr:{r:10}},{attr:{r:15},duration:0.25,ease:"power2.out",yoyo:true,repeat:3,immediateRender:false},${f3(tTan)});\n`).join("");
    return j;
  };
  // the peg seats: after the meet it works the last few px home and back, through 12-16s
  js += `tl.fromTo("#${ID}-peg",{x:0},{x:6,duration:1.0,ease:"sine.inOut",yoyo:true,repeat:5,immediateRender:false},${f3(tInsert + dIns + 0.8)});\n`;
  js += pose("L", uL, fR) + pose("R", uR, fR);
  // the arm bodies appear on "arms" (the held objects are visible earlier, on the table)
  // review 2026-10-28: no ~6s of empty card before "arms": the arms are drawn dimmed from the
  // eyebrow on, and lift to full on "arms"
  js += [ "L", "R" ].map(s => `tl.fromTo(".${ID}-${s}-bp",{opacity:0},{opacity:0.3,duration:0.35,ease:"power2.out"},${f3(tAl + 0.4)});\n`
    + `tl.fromTo(".${ID}-${s}-bp",{opacity:0.3},{opacity:1,duration:0.35,ease:"power2.out",immediateRender:false},${f3(tArms)});\n`).join("");
  js += [ "L", "R" ].map(s => `tl.fromTo("#${ID}-${s}-obj",{opacity:0},{opacity:1,duration:0.3,ease:"power2.out"},${f3(tIns)});\n`).join("");
  js += rowUp(`#${ID}-lbl`, tTan);
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
