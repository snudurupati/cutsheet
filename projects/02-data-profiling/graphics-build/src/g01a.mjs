// g01a: HOOK candidate A, "the lens finds the T". No type. HERO card (light-reinforced sheet).
// A field of 220 muted dots jitters like noise from frame 1. On "you" (the part's first frame) a drawn
// magnifier (330px lens, 6px white border, card shadow, a handle) slides in from the card's left edge and
// settles over the middle on "God". Through the glass the same dots are magnified 1.35x and sharp (ink);
// the magnified image is a real magnifier's (it shifts by -s*dx against the lens as it travels). On "God"
// the 40 nearest dots inside it pull into the PushT T-block (the one accent element) with the round
// pusher (a solid ink disc touching the stem); the other dots in the glass fade back. Outside, the field stays noise.
// "study": the lens holds and the T breathes. Moving throughout: the noise field, a dashed ring turning
// inside the rim, then the breathing T.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { cueRel, exitIfFree, HERO, prng, f3, rowUp, EYEBROW } from "../common.mjs";
import { vhs } from "./_vhs.mjs";

const ID = "g01a";
export default function build() {
  const D = frames(ID) / 30;
  const tGod = cueRel(ID, "god"), tStudy = cueRel(ID, "study");
  const F = fg(ID), M = dim(ID);
  const X = HERO.x, Y = HERO.y, W = HERO.w, H = HERO.h, IW = W - 12, IH = H - 12;
  const r = prng(20261028);

  // ---- the noise field (card-inner coordinates)
  const N = 220, s = 1.35, DR = 2.6;
  const dots = [...Array(N).keys()].map(() => ({
    x: 14 + r() * (IW - 28), y: 14 + r() * (IH - 28),
    ax: 4 + r() * 6, ay: 4 + r() * 6, u1: r(), u2: r(), u3: r(), u4: r(),
    px: 0.9 + r() * 0.8, py: 0.9 + r() * 0.8 }));

  // ---- the lens: final centre, radius, slide
  const c1 = { x: 282, y: 232 }, LR = 165, LI = LR - 6;         // outer radius, inner (content) radius
  const cx0 = -LR - 40, dx0 = cx0 - c1.x;                        // fully outside the card's left edge (the exit)
  const dxIn = 40 - c1.x;                                        // review 2026-10-28: enters already a third in
  const tIn = 0.06, dIn = 0.78;                                  // settles at ~0.84 = "God"
  const q = d => ({ x: LI + s * (d.x - c1.x), y: LI + s * (d.y - c1.y) });   // magnified, lens-local

  // ---- the T-block and pusher targets (lens-local), PushT's T: bar 4 units x 1, stem 1 x 3
  // Z = 1.5 (round 2 review: the T filled a third of the lens); the T + disc group is centred in the glass
  const Z = 1.5, SP = 15 * Z, TR = 6 * Z, tc = { x: LI + 8, y: LI + 2 }, ang = -16 * Math.PI / 180;
  const raw = [];
  for (let row = 0; row < 2; row++) for (let col = 0; col < 8; col++) raw.push([(-52.5 + col * 15) * Z, (-52.5 + row * 15) * Z]);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 2; col++) raw.push([(-7.5 + col * 15) * Z, (-22.5 + row * 15) * Z]);
  const Tpts = raw.map(([x, y]) => ({ x: tc.x + x * Math.cos(ang) - y * Math.sin(ang), y: tc.y + x * Math.sin(ang) + y * Math.cos(ang) }));
  // the pusher: a SOLID disc touching the stem's right side (review 2026-10-28: a ring of dots read as
  // a lowercase "o"). Its dots gather into the disc's centre and the filled disc lands over them.
  const rot = ([x, y]) => ({ x: tc.x + x * Math.cos(ang) - y * Math.sin(ang), y: tc.y + x * Math.sin(ang) + y * Math.cos(ang) });
  // round 2 review: the solid disc sat on the stem for 9s and read as a blob over the letter (and an
  // outlined puck reads "T o"); the pusher now stays out of the hook and slides in on "Working"
  const PR = 15 * Z, pc = rot([7.5 * Z + TR + PR + 2, 34 * Z]);
  const Ppts = [...Array(12).keys()].map(k => ({ x: pc.x + (k % 2 ? 10 : 4) * Math.cos(k * Math.PI / 6), y: pc.y + (k % 2 ? 10 : 4) * Math.sin(k * Math.PI / 6) }));
  // guard: the whole group stays inside the dashed ring (LI - 10)
  for (const p of [...Tpts.map(q => [q.x, q.y, TR]), [pc.x, pc.y, PR]]) {
    const d = Math.hypot(p[0] - LI, p[1] - LI) + p[2]; if (d > LI - 14) throw new Error(`${ID}: T group reaches ${d.toFixed(1)} of ${LI - 14}`); }
  const targets = [...Tpts.map(p => ({ ...p, kind: "T" })), ...Ppts.map(p => ({ ...p, kind: "P" }))];
  // the nearest dots to the lens centre take the targets; each target goes to the nearest free dot
  const order = dots.map((d, i) => [Math.hypot(d.x - c1.x, d.y - c1.y), i]).sort((a, b) => a[0] - b[0]).slice(0, targets.length).map(v => v[1]);
  const free = new Set(order), assign = new Map();
  for (const tg of targets) {
    let best = null, bd = 1e9;
    for (const i of free) { const m = q(dots[i]), dd = Math.hypot(m.x - tg.x, m.y - tg.y); if (dd < bd) { bd = dd; best = i; } }
    free.delete(best); assign.set(best, tg);
  }

  // ---- the opening (2026-10-28): the T's goal outline, upright, a little up-right of where the T sits
  const GO = { x: 6, y: -12 }, gx = tc.x + GO.x, gy = tc.y + GO.y, mg = TR + 3;
  const bx = 52.5 * Z + mg, by0 = -52.5 * Z - mg, by1 = -37.5 * Z + mg, sx_ = 7.5 * Z + mg, sy = 52.5 * Z + mg;
  const goalD = `M${f3(gx - bx)},${f3(gy + by0)} H${f3(gx + bx)} V${f3(gy + by1)} H${f3(gx + sx_)} V${f3(gy + sy)} H${f3(gx - sx_)} V${f3(gy + by1)} H${f3(gx - bx)} Z`;
  for (const [x, y] of [[gx - bx, gy + by0], [gx + bx, gy + by0], [gx + sx_, gy + sy], [gx - sx_, gy + sy]])
    if (Math.hypot(x - LI, y - LI) > LI - 12) throw new Error(`${ID}: goal outline corner leaves the glass`);

  // ---- markup
  const outer = dots.map((d, i) => `<circle id="${ID}-o${i}" cx="${f3(d.x)}" cy="${f3(d.y)}" r="${DR}" fill="${M}" opacity="0.5"/>`).join("");
  const innerRest = [], innerT = [], innerP = [];
  dots.forEach((d, i) => { const m = q(d);
    if (assign.has(i)) (assign.get(i).kind === "T" ? innerT : innerP).push(`<circle id="${ID}-i${i}" cx="${f3(m.x)}" cy="${f3(m.y)}" r="${f3(DR * s)}" fill="${F}"/>`);
    else innerRest.push(`<circle id="${ID}-i${i}" cx="${f3(m.x)}" cy="${f3(m.y)}" r="${f3(DR * s)}" fill="${F}"/>`); });
  // handle: down-right from the rim at 45 degrees, under the lens
  const hA = Math.PI / 4, hx = c1.x + (LR - 4) * Math.cos(hA), hy = c1.y + (LR - 4) * Math.sin(hA), HL = 104, HW = 26;
  const ux = Math.cos(hA), uy = Math.sin(hA), nx = -uy, ny = ux;
  const P = (a, b) => `${f3(hx + ux * a + nx * b)},${f3(hy + uy * a + ny * b)}`;
  const handle = `<polygon points="${P(0, -HW / 2 + 4)} ${P(HL, -HW / 2)} ${P(HL, HW / 2)} ${P(0, HW / 2 - 4)}" fill="${C.bg}" stroke="${F}" stroke-width="4" stroke-linejoin="round"/>
    <line x1="${P(26, -HW / 2 + 3).split(",")[0]}" y1="${P(26, -HW / 2 + 3).split(",")[1]}" x2="${P(26, HW / 2 - 3).split(",")[0]}" y2="${P(26, HW / 2 - 3).split(",")[1]}" stroke="${F}" stroke-width="3" stroke-linecap="round"/>`;

  // ---- the opening's second half, in the same card (2026-10-28: "the opening is not put together"; the
  // hook card used to leave at 7.4s and 17s of talk ran bare into Blockbuster). Card-inner coordinates.
  // Composition review 2026-10-28 (13 findings, all fixed): VHS not a cassette; tag hole at its tip, not a
  // minus sign; tag drops to an outline when the accent leaves; labels 24-26px; no REWARD line; 40px of air
  // between chart and poster; the poster drops and pins, no crossfade; bars grow together (no reshuffle);
  // the T fades before the lens leaves; a paper strip behind the eyebrow; the label goes accent in one step
  // on "called"; the lens drifts through the hook's hold; the lens enters a third in; no hand-off overlaps;
  // and g02 match-cuts out of this card carrying the tape.
  const BASE = 380, BARS = [70, 112, 164, 236].map((h, i) => ({ x: 40 + i * 50, w: 34, h }));
  const TAGP = { x: BARS[3].x + BARS[3].w, y: BASE - BARS[3].h };            // the tag hangs off the tallest bar
  const font = (sz, wt, col, extra = "") => `font-family="Satoshi" style="font-variation-settings:'wght' ${wt}" font-size="${sz}" fill="${col}" ${extra}`;
  const chart = `<g id="${ID}-chx"><g id="${ID}-ch" opacity="0">
      <line x1="24" y1="${BASE}" x2="${BARS[3].x + BARS[3].w + 16}" y2="${BASE}" stroke="${F}" stroke-width="3" stroke-linecap="round"/>
      ${BARS.map((b, i) => `<rect class="${ID}-bar" x="${b.x}" y="${BASE - b.h}" width="${b.w}" height="${b.h}" rx="3" fill="${C.bg}" stroke="${F}" stroke-width="3"/>`).join("")}
      <text x="${(24 + BARS[3].x + BARS[3].w + 16) / 2}" y="${BASE + 38}" text-anchor="middle" ${font(26, 800, M, 'letter-spacing="2.4"')} id="${ID}-an" opacity="0">ANALYTICS</text>
      <g id="${ID}-tag" opacity="0">
        <line x1="${TAGP.x}" y1="${TAGP.y}" x2="${TAGP.x + 10}" y2="${TAGP.y + 40}" stroke="${F}" stroke-width="2"/>
        <path id="${ID}-tagf" d="M${TAGP.x - 4},${TAGP.y + 40} h70 a6,6 0 0 1 6,6 v40 a6,6 0 0 1 -6,6 h-70 l-16,-26 Z" fill="${C.accent}" stroke="${F}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="${TAGP.x + 10}" cy="${TAGP.y + 46}" r="3.5" fill="${C.bg}" stroke="${F}" stroke-width="2"/>
        <text id="${ID}-tagt" x="${TAGP.x + 34}" y="${TAGP.y + 76}" text-anchor="middle" ${font(30, 900, C.bg)}>$$$</text>
      </g>
    </g></g>`;
  const PX = 440, PY0 = 66, PW = 200, PH = 300;     // svgOrigin on the drop left a +36px offset that clipped it; now transformOrigin
  const poster = `<g id="${ID}-wp" opacity="0"><g transform="rotate(3 ${PX} ${PY0 + PH / 2})">
      <rect x="${PX - PW / 2}" y="${PY0}" width="${PW}" height="${PH}" rx="4" fill="${C.bg}" stroke="${F}" stroke-width="3" style="filter:drop-shadow(0 8px 14px rgba(20,17,14,.22))"/>
      <circle cx="${PX}" cy="${PY0 + 14}" r="7" fill="${F}"/>
      <text id="${ID}-wt" x="${PX}" y="${PY0 + 70}" text-anchor="middle" ${font(40, 900, F, 'letter-spacing="2"')}>WANTED</text>
      <line x1="${PX - 76}" y1="${PY0 + 88}" x2="${PX + 76}" y2="${PY0 + 88}" stroke="${F}" stroke-width="2"/>
      <circle cx="${PX}" cy="${PY0 + 158}" r="32" fill="${C.bg}" stroke="${F}" stroke-width="3"/>
      <path d="M${PX - 32},${PY0 + 150} A32,32 0 0 1 ${PX + 32},${PY0 + 150} Z" fill="${M}" stroke="${F}" stroke-width="3" stroke-linejoin="round"/>
      <line x1="${PX - 42}" y1="${PY0 + 150}" x2="${PX + 42}" y2="${PY0 + 150}" stroke="${F}" stroke-width="5" stroke-linecap="round"/>
      <path d="M${PX - 62},${PY0 + 244} Q${PX},${PY0 + 180} ${PX + 62},${PY0 + 244}" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round"/>
      <text x="${PX}" y="${PY0 + 280}" text-anchor="middle" ${font(22, 800, F, 'letter-spacing="0.5"')}>DATA ENGINEER</text>
    </g></g>`;
  const TX = 290, TY = 248;                                       // the tape, centred on the card
  const OPENING = `${EYEBROW("Data was fun once.", 24, 14, M, `${ID}-eb`)}
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${IH}">${chart}${poster}${vhs(ID, TX, TY)}</svg>
    <style>#${ID}-eb{opacity:0}</style>`;

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">
  <div style="position:absolute;left:0;top:0;width:${IW}px;height:${IH}px;overflow:hidden">
    <svg id="${ID}-out" style="position:absolute;left:0;top:0" width="${IW}" height="${IH}">${outer}</svg>
    <div id="${ID}-lw" style="position:absolute;left:0;top:0;width:${IW}px;height:${IH}px">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${IW}" height="${IH}">${handle}</svg>
      <div style="position:absolute;left:${c1.x - LR}px;top:${c1.y - LR}px;width:${2 * LR}px;height:${2 * LR}px;border-radius:50%;overflow:hidden;background:${C.bg};border:6px solid #FFFFFF;box-shadow:0 16px 52px rgba(0,0,0,.38), inset 0 0 0 3px ${F}">
        <svg id="${ID}-mag" style="position:absolute;left:0;top:0;overflow:visible" width="${2 * LI}" height="${2 * LI}">
          <g id="${ID}-rest">${innerRest.join("")}</g>
          <path id="${ID}-goal" d="${goalD}" fill="none" stroke="${M}" stroke-width="3" stroke-dasharray="7 7" stroke-linejoin="round" opacity="0"/>
          <g id="${ID}-Tg"><g id="${ID}-Tt">${innerT.join("")}</g><g id="${ID}-Pg">${innerP.join("")}<circle id="${ID}-disc" cx="${f3(pc.x)}" cy="${f3(pc.y)}" r="${f3(PR)}" fill="${F}" opacity="0"/></g></g>
        </svg>
        <svg style="position:absolute;left:0;top:0;overflow:visible" width="${2 * LI}" height="${2 * LI}">
          <circle id="${ID}-ring" cx="${LI}" cy="${LI}" r="${LI - 10}" fill="none" stroke="${C.rule}" stroke-width="2.5" stroke-dasharray="3 11"/></svg>
      </div>
    </div>
    ${OPENING}
  </div>
</div>`;

  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  // noise: every dot (outside and its magnified twin) wanders on two seeded yoyo axes
  const jit = (sel, a, b, per, prop, t1) => {
    const n = Math.max(1, Math.ceil(t1 / per));
    return `tl.fromTo("${sel}",{${prop}:${f3(a)}},{${prop}:${f3(b)},duration:${f3(per)},ease:"sine.inOut",yoyo:true,repeat:${n - 1},immediateRender:true},0);\n`; };
  dots.forEach((d, i) => {
    const a1 = -d.ax * d.u1, b1 = d.ax * (0.4 + d.u2), a2 = -d.ay * d.u3, b2 = d.ay * (0.4 + d.u4);
    js += jit(`#${ID}-o${i}`, a1, b1, d.px, "x", D) + jit(`#${ID}-o${i}`, a2, b2, d.py, "y", D);
    if (!assign.has(i)) js += jit(`#${ID}-i${i}`, a1 * s, b1 * s, d.px, "x", D) + jit(`#${ID}-i${i}`, a2 * s, b2 * s, d.py, "y", D);
  });
  // the lens slides in from the left edge; its magnified image moves -s*dx against it (same ease, same time)
  js += `tl.fromTo("#${ID}-lw",{x:${f3(dxIn)}},{x:0,duration:${dIn},ease:"power2.out",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-mag",{x:${f3(-s * dxIn)}},{x:0,duration:${dIn},ease:"power2.out",immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-ring",{rotation:0,svgOrigin:"${LI} ${LI}"},{rotation:90,svgOrigin:"${LI} ${LI}",duration:${f3(D - tIn)},ease:"none",immediateRender:true},${tIn});\n`;
  // "God": the dots in the glass pull into the T and the pusher; the rest of the glass fades back
  const tPull = tGod - 0.12;
  [...assign.entries()].forEach(([i, tg], k) => {
    const isT = tg.kind === "T", st = tPull + (k % 7) * 0.03;
    js += `tl.fromTo("#${ID}-i${i}",{attr:{cx:${f3(q(dots[i]).x)},cy:${f3(q(dots[i]).y)},r:${f3(DR * s)}},fill:"${F}"},{attr:{cx:${f3(tg.x)},cy:${f3(tg.y)},r:${isT ? TR : 4.5 * Z}},fill:"${isT ? C.accent : F}",duration:0.8,ease:"power3.inOut",immediateRender:false},${f3(st)});\n`;
  });
  js += `tl.fromTo("#${ID}-disc",{opacity:0,attr:{r:${f3(PR * 0.5)}}},{opacity:1,attr:{r:${f3(PR)}},duration:0.35,ease:"back.out(1.6)",immediateRender:false},${f3(tPull + 0.55)});\n`;
  js += `tl.fromTo("#${ID}-rest",{opacity:1},{opacity:0.28,duration:0.6,ease:"power2.out",immediateRender:false},${f3(tPull + 0.1)});\n`;
  // "study": the lens holds, the T breathes
  // "study": the disc nudges the T (push the T): disc 8px along the stem's normal, the T follows 7px
  const px_ = -Math.cos(ang), py_ = -Math.sin(ang);
  js += `tl.fromTo("#${ID}-Pg",{x:0,y:0},{x:${f3(8 * px_)},y:${f3(8 * py_)},duration:0.3,ease:"power2.in",immediateRender:false},${f3(tStudy)});\n`;
  js += `tl.fromTo("#${ID}-Tt",{x:0,y:0},{x:${f3(7 * px_)},y:${f3(7 * py_)},duration:0.35,ease:"power2.out",immediateRender:false},${f3(tStudy + 0.22)});\n`;
  // the group breathes from the moment it has formed, so the glass is never still
  const tB = tPull + 1.0, per = 0.9, nB = Math.max(1, Math.floor((D - tB) / per));
  js += `tl.fromTo("#${ID}-Tg",{scale:1,svgOrigin:"${f3(LI)} ${f3(LI)}"},{scale:1.04,svgOrigin:"${f3(LI)} ${f3(LI)}",duration:${per},ease:"sine.inOut",yoyo:true,repeat:${nB - 1},immediateRender:false},${f3(tB)});\n`;
  // ================================================================ the opening, after the hook
  const c_ = k => cueRel(ID, k);
  const tFun = c_("fun"), tWork = c_("working"), tJoy = c_("joyful"), tFirst = c_("first"), tEnt = c_("enterprises"), tPay = c_("pay"),
        tAna = c_("analytics"), tEng = c_("engineers"), tCov = c_("coveted"), tAns = c_("answer"), tFav = c_("favorite"), tWk = c_("weekend"), tCall = c_("called");
  const NL = "\n";
  // the hook's hold is alive: the lens drifts 16px right and back across the T (the magnified image moves against it)
  const tD0 = tGod + 1.1, dD = Math.max(0.8, (tFun - 0.4 - tD0) / 2);
  js += `tl.fromTo("#${ID}-lw",{x:0},{x:16,duration:${f3(dD)},ease:"sine.inOut",yoyo:true,repeat:1,immediateRender:false},${f3(tD0)});${NL}`;
  js += `tl.fromTo("#${ID}-mag",{x:0},{x:${f3(-s * 16)},duration:${f3(dD)},ease:"sine.inOut",yoyo:true,repeat:1,immediateRender:false},${f3(tD0)});${NL}`;
  // "Data was fun once." the eyebrow the verdict card (g25) answers at the end
  // round 2 review: a paper plate behind the eyebrow read as a sticker; the noise in the top band clears instead
  const topDots = dots.map((d, i) => d.y < 66 ? `#${ID}-o${i}` : null).filter(Boolean).join(",");
  if (topDots) js += `tl.to("${topDots}",{opacity:0,duration:0.4,ease:"power1.out"},${f3(tFun - 0.45)});${NL}`;
  js += rowUp(`#${ID}-eb`, tFun - 0.25);
  // "Working with data": the T's goal outline appears; "joyful": the pusher slides the T home (the game PushT is)
  js += `tl.fromTo("#${ID}-goal",{opacity:0},{opacity:0.9,duration:0.4,ease:"power2.out",immediateRender:false},${f3(tWork)});${NL}`;
  // the pusher: hidden through the hook, slides in from the right on "Working", ready to push
  js += `tl.set("#${ID}-Pg",{opacity:0},0);${NL}`;
  js += `tl.fromTo("#${ID}-Pg",{opacity:1,x:${f3(8 * px_ + 150)},y:${f3(8 * py_)}},{opacity:1,x:${f3(8 * px_)},y:${f3(8 * py_)},duration:0.45,ease:"power2.out",immediateRender:false},${f3(tWork)});${NL}`;
  const tMove = tJoy - 0.75;
  js += `tl.fromTo("#${ID}-Tt",{x:${f3(7 * px_)},y:${f3(7 * py_)},rotation:0,svgOrigin:"${f3(tc.x)} ${f3(tc.y)}"},{x:${GO.x},y:${GO.y},rotation:16,svgOrigin:"${f3(tc.x)} ${f3(tc.y)}",duration:0.8,ease:"power2.inOut",immediateRender:false},${f3(tMove)});${NL}`;
  js += `tl.fromTo("#${ID}-Pg",{x:${f3(8 * px_)},y:${f3(8 * py_)}},{x:${f3(GO.x + 8 * px_)},y:${f3(GO.y + 8 * py_)},duration:0.8,ease:"power2.inOut",immediateRender:false},${f3(tMove - 0.04)});${NL}`;
  js += `tl.fromTo("#${ID}-goal",{opacity:0.9,stroke:"${M}"},{opacity:0.9,stroke:"${C.accent}",duration:0.15,immediateRender:false},${f3(tMove + 0.8)});${NL}`;
  js += `tl.fromTo("#${ID}-goal",{opacity:0.9},{opacity:0,duration:0.5,ease:"power1.in",immediateRender:false},${f3(tMove + 1.1)});${NL}`;
  js += `tl.to("#${ID}-Pg",{x:"+=46",opacity:0,duration:0.3,ease:"power2.in"},${f3(tMove + 0.95)});${NL}`;
  // "The first time I asked": the T fades first, then the lens slides out the way it came; the chart's first
  // frame overlaps the exit so the card is never empty
  js += `tl.fromTo("#${ID}-Tg, #${ID}-rest",{opacity:1},{opacity:0,duration:0.5,ease:"power1.in",immediateRender:false},${f3(tFirst - 0.36)});${NL}`;
  js += `tl.fromTo("#${ID}-lw",{x:0},{x:${f3(dx0)},duration:0.65,ease:"power2.in",immediateRender:false},${f3(tFirst - 0.42)});${NL}`;
  // the glass carries its contents out with it (no magnifier counter-shift on the exit: that cropped the T)
  js += `tl.fromTo("#${ID}-out, #${ID}-eb",{opacity:1},{opacity:0,duration:0.5,immediateRender:false},${f3(tFirst - 0.1)});${NL}`;
  // "why do enterprises pay so much for analytics?": the bars grow together (one tween, so the shape never
  // reshuffles), centred; the price tag swings onto the tallest on "pay"; ANALYTICS under it
  const tBars = tFirst + 0.25, CHX = 150;          // the lens is fully out at tFirst + 0.23
  js += `tl.fromTo("#${ID}-chx",{x:${CHX}},{x:-24,duration:0.6,ease:"power2.inOut",immediateRender:true},${f3(tEng - 0.9)});${NL}`;
  js += `tl.fromTo("#${ID}-ch",{opacity:0},{opacity:1,duration:0.15,immediateRender:false},${f3(tBars)});${NL}`;
  js += `tl.fromTo(".${ID}-bar",{scaleY:0,transformOrigin:"50% 100%"},{scaleY:1,duration:0.6,ease:"power3.out",immediateRender:false},${f3(tBars)});${NL}`;
  js += `tl.fromTo("#${ID}-tag",{opacity:0,rotation:-70,svgOrigin:"${TAGP.x} ${TAGP.y}"},{opacity:1,rotation:0,svgOrigin:"${TAGP.x} ${TAGP.y}",duration:0.9,ease:"elastic.out(1,0.45)",immediateRender:false},${f3(tPay - 0.12)});${NL}`;
  js += `tl.fromTo("#${ID}-tag",{rotation:0,svgOrigin:"${TAGP.x} ${TAGP.y}"},{rotation:-5,svgOrigin:"${TAGP.x} ${TAGP.y}",duration:0.8,ease:"sine.inOut",yoyo:true,repeat:${Math.max(1, 2 * Math.floor((tAns - tPay - 1) / 1.6) - 1)},immediateRender:false},${f3(tPay + 0.8)});${NL}`;
  js += rowUp(`#${ID}-an`, tAna - 0.2);
  // "why are data engineers so coveted?": the chart has already slid left; the poster drops in from above the
  // card, swings once on its pin and settles (no crossfade); on "coveted" the accent moves to WANTED and the
  // tag drops to an outline
  js += `tl.fromTo("#${ID}-wp",{opacity:1,y:-420,rotation:-7,transformOrigin:"50% 3%"},{opacity:1,y:0,rotation:0,transformOrigin:"50% 3%",duration:0.7,ease:"back.out(1.4)",immediateRender:false},${f3(tEng - 0.25)});${NL}`;
  js += `tl.fromTo("#${ID}-tagf",{fill:"${C.accent}"},{fill:"${C.bg}",duration:0.2,immediateRender:false},${f3(tCov)});${NL}`;
  js += `tl.fromTo("#${ID}-tagt",{fill:"${C.bg}"},{fill:"${F}",duration:0.2,immediateRender:false},${f3(tCov)});${NL}`;
  js += `tl.fromTo("#${ID}-wt",{fill:"${F}"},{fill:"${C.accent}",duration:0.2,immediateRender:false},${f3(tCov)});${NL}`;
  // "The answer showed up in my favorite weekend pastime called...": chart and poster go up and out, THEN the
  // tape rises into the clear card; WEEKEND is written on "weekend"; the label goes accent in one step on
  // "called"; g02 match-cuts out of this card carrying the tape
  js += `tl.fromTo("#${ID}-ch, #${ID}-wp",{y:0,opacity:1},{y:-60,opacity:0,duration:0.45,ease:"sine.inOut",immediateRender:false},${f3(tAns)});${NL}`;
  js += `tl.fromTo("#${ID}-vhs",{opacity:1,y:330},{opacity:1,y:0,duration:0.7,ease:"power3.out",immediateRender:false},${f3(tAns + 0.35)});${NL}`;
  js += `tl.fromTo("#${ID}-lbr",{attr:{width:0}},{attr:{width:312},duration:0.6,ease:"power1.inOut",immediateRender:false},${f3(tWk - 0.05)});${NL}`;
  js += `tl.set("#${ID}-lab",{fill:"${C.accent}"},${f3(tCall)});${NL}`;
  [0, 1].forEach(n => { const ox = TX + (n ? 88 : -88), oy = TY - 93 + 128;
    js += `tl.fromTo("#${ID}-reel${n}",{rotation:0,svgOrigin:"${ox} ${oy}"},{rotation:${f3(-200 * (D - tAns))},svgOrigin:"${ox} ${oy}",duration:${f3(D - tAns - 0.3)},ease:"none",immediateRender:false},${f3(tAns + 0.3)});${NL}`; });
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
