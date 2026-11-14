// Scenes B: the demo's first half. Punch-in mark scenes (gZ1,gZ2,gZ3,gZ5,gZ7):
// NO card. An opaque card over the punch-in hides the very line being marked, so
// these are marks on the footage itself: ink marks on the light notebook, mapped
// through mapZoom (the same clamp demo_scene.py renders), living only inside
// plateau(), plus small opaque pills for labels placed away from the zoomed line.
// The drawn over-screen cards (gZ2b,gZ4,gZ6,gZ7b,gZ8,gZ8a,gZ8b) are hero-box
// opaque panels (any part over screen is opaque: panels.json, measured).
import { C, emit, span, frames, cueIn, panelClass, fg, dim, wipeUp, boxOf, struck, strikeIn } from "./lib.mjs";
import { T, EYEBROW, statLine, cardHTML, chipHTML, show, hide, drawOn, rowUp, pop, countUp,
         tickSVG, tickIn, barHTML, barIn, A, f3, exitIfFree, underlineM, boxM, leaderM, leaderIn, zm, TI } from "./hb.mjs";
import { zoomItem, plateau } from "./lib.mjs";
import { want } from "./only.mjs";
const dur = id => frames(id) / 30;
const INK = C.bg;       // human review 2026-11-13 finding 6: the notebook is a DARK
                        // editor theme, not a light page: marks over code go paper-light,
                        // ink-on-black was invisible. Opaque pills keep their own dark
                        // chip (they reference C.ink directly).
// an opaque label pill over the footage. Final review 2026-11-13 (finding 3):
// pills were 22px canvas (44 real px at 4K) next to 2.6x zoomed code and read
// illegibly small. Default 30px (60 real px at 4K); stack offsets adjusted to match.
const pill = (id, x, y, txt, { col = C.bg, size = 30, border = null } = {}) =>
  `<div id="${id}" style="position:absolute;left:${x}px;top:${y}px;padding:10px 20px;background:${C.ink};border:3px solid ${border || C.bg};border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.4);opacity:0">
     <span style="display:block;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:${size}px;color:${col};white-space:nowrap">${txt}</span></div>`;

// mark lifecycle: draw on at p0+t, fade out by p1 (the plateau end)
const markLife = (sel, p0, t = 0.15, p1 = null, w = 0.25) =>
  `tl.fromTo(${JSON.stringify(sel)},{strokeDashoffset:1},{strokeDashoffset:0,duration:0.3,ease:"power2.out",immediateRender:false},${f3(p0 + t)});\n`
  + (p1 === null ? "" : `tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:0,duration:${f3(w)},immediateRender:false},${f3(Math.max(p0 + t + 0.3, p1 - w))});\n`);
const showIn = (sel, t, p1, d = 0.3, fade = 0.25) =>
  `tl.fromTo(${JSON.stringify(sel)},{opacity:0},{opacity:1,duration:${d},ease:"power2.out",immediateRender:false},${f3(t)});\n`
  + `tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:0,duration:${f3(fade)},immediateRender:false},${f3(Math.max(t + d, p1 - fade))});\n`;

// =================================================================== gZ1
// Punch-in (zoom 2.6) on the ONLY line of the env block on screen here:
// 'env = gym.make("gym_pusht/PushT-v0", ...)' (OCR-confirmed 943,1010). Underline
// the 'gym_pusht' package as he names it; pills: 'MuJoCo' struck out vs 'Pymunk
// 2D physics' active (ONE accent: Pymunk). Everything lives inside the plateau.
// Copy pass 2026-11-12: pill reads "Pymunk 2D physics", matching g08's
// "Pymunk 2D" in scenes-a. The spelling must be identical across both cards.
if (want("gZ1")) {
  const id = "gZ1", D = dur(id);
  const zid = "gZ1";
  const [p0, p1] = plateau(zid, span(id)[0]);
  const gyp = zm(zid, [943 + 130, 1010, 943 + 130 + 220, 1043]);   // "gym_pusht/PushT-v0"
  const body = underlineM("uGym", gyp, INK, 6)
    + pill("mj", 40, 40, "MuJoCo", { col: "#B9B2A8", border: "#6E665C" })
    + `<div id="mjs" style="position:absolute;left:61px;top:67px;width:143px;height:5px;background:#B9B2A8;border-radius:2px;transform:scaleX(0);transform-origin:left center"></div>`
    + pill("pm", 40, 122, "Pymunk 2D physics", { col: C.accent });
  let js = markLife("#uGym", p0, 0.1, p1);
  js += showIn("#mj", p0 + 0.4, p1) + showIn("#pm", p0 + 0.7, p1);
  js += `tl.fromTo("#mjs",{scaleX:0},{scaleX:1,duration:0.25,ease:"power2.out",immediateRender:false},${f3(p0 + 0.7)});\n`;
  emit(id, D, body, js);
}

// =================================================================== gZ2
// Punch-in on the SAME env line 9s later (no PAN cross-ramp: not time-adjacent).
// Underline 'PushT-v0' (accent, the one) and 'obs_type="state"' as he reads them;
// pill 'version 0, state observations'.
if (want("gZ2")) {
  const id = "gZ2", D = dur(id);
  const zid = "gZ2";
  const [p0, p1] = plateau(zid, span(id)[0]);
  const bPush = zm(zid, [943 + 230, 1010, 943 + 350, 1043]);       // PushT-v0
  const bObs = zm(zid, [943 + 372, 1010, 943 + 545, 1043]);        // obs_type="state"
  const body = underlineM("uPush", bPush, C.accent, 7) + underlineM("uObs", bObs, INK, 5)
    + pill("v0", 40, 40, "version 0, state observations");
  let js = markLife("#uPush", p0, 0.15, p1) + markLife("#uObs", p0, 0.55, p1);
  js += showIn("#v0", p0 + 0.3, p1);
  emit(id, D, body, js);
}

// =================================================================== gZ2b
// 'collect data instead of running a sim for a human observation': two tiles,
// 'render for eyes' greyed + slashed vs 'collect frames' ACTIVE (ONE accent).
if (want("gZ2b")) {
  const id = "gZ2b", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  // pass-2 F1/F6 + cheek: card w 600->550 (measured hold frames: the speaker's
  // forehead/cheek reaches canvas x636-637 at card rows; edge 610 = 26px clear,
  // review bar is >=20). Height fits the content (410 vs 620: the old 490px
  // dead black is gone); tiles grow to 230 square, sub-lines 20->22px on a
  // 2-line wrap (1080p floor clearance).
  const CW = 550, CH = 410;
  const frames3 = () => [0, 1, 2].map(k => `<div style="position:absolute;left:${18 + k * 66}px;top:168px;width:54px;height:40px;border:3px solid currentColor;border-radius:4px"></div>`).join("");
  const body = cardHTML(id, x, y, CW, CH,
    EYEBROW("capture, don't watch", 44, 36, M, "hd", 26) +
    `<div id="tA" style="position:absolute;left:40px;top:130px;width:230px;height:230px;border:3px solid ${M};border-radius:12px;color:${M};opacity:0">
       ${T("render for eyes", 18, 18, 26, { weight: 700, color: M })}${T("a human watching the sim", 18, 54, 22, { w: 200, weight: 500, color: M })}
       ${frames3()}
       <svg style="position:absolute;left:0;top:0;overflow:visible" width="230" height="230"><path id="slp" d="M14,14 L216,216" pathLength="1" fill="none" stroke="${M}" stroke-width="6" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg></div>` +
    `<div id="tB" style="position:absolute;left:290px;top:130px;width:230px;height:230px;border:4px solid ${C.accent};border-radius:12px;color:${C.accent};opacity:0">
       ${T("collect frames", 18, 18, 26, { weight: 900, cls: "disp", color: C.accent })}${T("the dataset gets built", 18, 54, 22, { w: 200, weight: 500, color: M })}
       ${frames3()}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.08, 0.3);
  // the tile comes up as he says 'instead of running' so the slash (cue+0.1,
  // 0.35s) draws ACROSS a visible tile: the grey-vs-accent argument is the slash.
  js += show("#tA", cueIn(id, "instead of running"), 0.3);
  js += drawOn("slp", cueIn(id, "instead of running") + 0.1, 0.35);
  js += show("#tB", cueIn(id, "collect data"), 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ3
// Punch-in on the action-space print '[0. 0.] [512. 512.]' (OCR 893,1093): a 5x5
// grid draws over the output, axes 0..5, ONE accent: the single lit cell on
// 'highest'. Ink over the light page.
if (want("gZ3")) {
  const id = "gZ3", D = dur(id);
  const zid = "gZ3";
  const [p0, p1] = plateau(zid, span(id)[0]);
  const out = zm(zid, [893, 1093, 1194, 1126]);                    // [0. 0.] [512. 512.]
  const G = 44, gx = Math.min(Math.max(60, out[0]), 1920 - 5 * G - 60), gy = Math.max(150, out[1] - 5 * G - 46);
  const grid = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="1920" height="1080" viewBox="0 0 1920 1080">`
    + [...Array(6).keys()].map(k =>
        `<line id="gv${k}" x1="${gx + k * G}" y1="${gy}" x2="${gx + k * G}" y2="${gy + 5 * G}" pathLength="1" stroke="${INK}" stroke-width="2.5" opacity=".7" style="stroke-dasharray:1;stroke-dashoffset:1"/>`
      + `<line id="gh${k}" x1="${gx}" y1="${gy + k * G}" x2="${gx + 5 * G}" y2="${gy + k * G}" pathLength="1" stroke="${INK}" stroke-width="2.5" opacity=".7" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")
    + `<rect id="cell" x="${gx + 4 * G + 3}" y="${gy + 3}" width="${G - 6}" height="${G - 6}" rx="4" fill="${C.accent}" opacity="0"/>`
    + `</svg>`;
  const ax = [...Array(6).keys()].map(k =>
      T(String(k), gx + k * G - 5, gy + 5 * G + 8, 20, { weight: 700, color: INK, id: `ax${k}` }))
    .join("");
  const body = grid + ax + underlineM("uOut", out, INK, 5)
    + pill("cap", 40, 40, "action space = 5 x 5");
  let js = "";
  js += markLife("#uOut", p0, 0.1, p1);
  js += showIn("#cap", p0, p1);
  for (let k = 0; k < 6; k++) js += drawOn(`gv${k}`, p0 + 0.25 + k * 0.05, 0.25) + drawOn(`gh${k}`, p0 + 0.25 + k * 0.05, 0.25);
  [...Array(6).keys()].forEach(k => { js += showIn(`#ax${k}`, p0 + 0.4, p1, 0.25, 0.2); });
  js += pop("#cell", cueIn(id, "highest") + 0.05, 0.3);
  emit(id, D, body, js);
}
// punch parts have no card to wipe: entrance is the marks drawing themselves

// =================================================================== gZ4
// Over the Push-T board (no zoom: the board sits right of the notebook, the card
// keeps the left column free). Coordinate labels land as he reads them; the task
// legend names each part once. ONE accent: the goal angle count-up (0.79 rad).
if (want("gZ4")) {
  const id = "gZ4", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  const t390 = cueIn(id, "and 304");
  const tOut = cueIn(id, "where the actual block is");
  const tAng = cueIn(id, "degree angle");
  const tGoal = cueIn(id, "goal");
  const board = byCol => `
    <svg style="overflow:visible" width="120" height="120" viewBox="0 0 150 150">
      <rect x="8" y="8" width="134" height="134" rx="10" fill="none" stroke="${byCol}" stroke-width="3" opacity=".8"/>
      <path d="M42,34 L108,34 M75,34 L75,96" fill="none" stroke="${byCol}" stroke-width="9" stroke-linecap="round" opacity="0.9"/>
      <circle cx="40" cy="112" r="13" fill="${byCol}"/>
    </svg>`;
  const legItem = (ix, k, col, txt) => `<div id="lg${k}" style="position:absolute;left:${ix}px;top:120px;width:120px;height:156px;opacity:0">
      ${board(col)}${T(txt, 0, 124, 20, { w: 120, align: "center", weight: 700, color: M })}</div>`;
  const row = (iy, key, val, opts = {}) =>
    `<div id="${key}" style="position:absolute;left:44px;top:${iy}px;display:flex;align-items:baseline;gap:14px;opacity:0">
       ${TI(val, opts.size || 34, { weight: 900, cls: "disp", color: opts.color || "currentColor" })}
       ${TI(opts.what, 20, { weight: 500, color: M })}
     </div>`;
  const body = cardHTML(id, x, y, w, h,
      EYEBROW("the push-t task", 44, 36, M, "ey", 22) +
      legItem(44, 0, F, "pusher") + legItem(196, 1, F, "t block") + legItem(348, 2, M, "outline") +
      row(300, "c390", "390, 304", { what: "     pusher x, y" }) +
      row(368, "c241", "241.5, 268.5", { what: "     outline x, y", size: 30 }) +
      `<div id="cang" style="position:absolute;left:44px;top:436px;display:flex;align-items:baseline;gap:14px;opacity:0">
         ${TI("3.3 deg", 30, { weight: 900, cls: "disp" })}${TI("outline angle", 20, { weight: 500, color: M })}</div>` +
      `<div id="cgoal" style="position:absolute;left:330px;top:436px;display:flex;align-items:baseline;gap:8px;opacity:0"><span id="gnum" style="font-family:Satoshi;font-variation-settings:'wght' 900;font-size:30px;color:${C.accent};white-space:nowrap">0.00</span>${TI("rad goal angle", 20, { weight: 500, color: M })}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.35);
  js += show("#lg0", cueIn(id, "where the actual block is"), 0.3);
  js += show("#lg1", cueIn(id, "where the actual block is") + 0.25, 0.3);
  js += show("#lg2", cueIn(id, "outline is sitting"), 0.3);
  js += rowUp("#c390", t390, 0.3);
  js += rowUp("#c241", tOut + 0.2, 0.3);
  js += rowUp("#cang", tAng, 0.3);
  js += show("#cgoal", tGoal, 0.3) + countUp("#gnum", 0, 0.785, tGoal + 0.1, 1.1, 3, "", "");
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ5
// Punch-in on 'def run_policy(make_action, n_episodes=100):' (OCR 943,775):
// underline the n_episodes=100 argument (ONE accent) + a '100 episodes' counter
// in an opaque pill block at the top-left, away from the zoomed line (y ~518).
if (want("gZ5")) {
  const id = "gZ5", D = dur(id);
  const zid = "gZ5";
  const [p0, p1] = plateau(zid, span(id)[0]);
  const bArg = zm(zid, [943 + 396, 775, 943 + 560, 808]);           // n_episodes=100
  const body = underlineM("uArg", bArg, C.accent, 7)
    + `<div id="blk" style="position:absolute;left:40px;top:40px;padding:18px 26px;background:${C.ink};border:3px solid ${C.bg};border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0">
         <span id="cnt" style="display:block;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:120px;line-height:1.15;color:${C.bg}">0</span>
         <div id="ep" style="font-family:Satoshi;font-variation-settings:'wght' 900;font-size:44px;line-height:1.3;color:${C.accent}">episodes</div></div>`;
  let js = markLife("#uArg", p0, 0.1, p1);
  js += showIn("#blk", p0 + 0.15, p1, 0.3, 0.3);
  js += countUp("#cnt", 0, 100, p0 + 0.25, 0.9);
  emit(id, D, body, js);
}

// =================================================================== gZ6
// Seed diagram over the loop: three boards, each with pusher/block somewhere new,
// ONE accent: the seed chip feeding them. 'each episode starts somewhere new'.
if (want("gZ6")) {
  const id = "gZ6", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id), F = fg(id);
  // composition pass: content filled only the top ~55% of the 620 card, bottom
  // ~280px dead black. Whole stack shifted +115: measured span now card y155-480
  // (even 140-155px margins). The feed fan also moved off the chip: it used to
  // start at chip mid-height (y1 106 inside the chip's 84-133) and sliced through
  // "seed = episode" (frame t=6.5); it now starts at the chip's bottom-centre and
  // fans to the board tops with a 28px drop.
  const board = (k, px, py, bx, by) => `
    <svg id="b${k}" style="position:absolute;left:${30 + k * 190}px;top:278px;overflow:visible;opacity:0" width="150" height="150" viewBox="0 0 150 150">
      <rect x="8" y="8" width="134" height="134" rx="10" fill="none" stroke="${F}" stroke-width="3" opacity=".8"/>
      <path d="M${bx},${by} L${bx + 52},${by} M${bx + 26},${by} L${bx + 26},${by + 54}" fill="none" stroke="${F}" stroke-width="8" stroke-linecap="round" opacity=".75"/>
      <circle cx="${px}" cy="${py}" r="12" fill="${F}"/></svg>`;
  const feed = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${[0, 1, 2].map(k => `<line id="feed${k}" x1="372" y1="250" x2="${105 + k * 190}" y2="278" pathLength="1" stroke="${C.accent}" stroke-width="3" style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      T("each episode starts somewhere new", 44, 149, 34, { w: 520, weight: 900, cls: "disp", id: "hd" }) +
      `<div id="seed" style="position:absolute;left:264px;top:193px;padding:8px 18px;border:3px solid ${C.accent};border-radius:20px;opacity:0">
         ${TI("seed = episode", 24, { weight: 900, cls: "disp", color: C.accent })}</div>` +
      board(0, 40, 112, 46, 34) + board(1, 96, 52, 60, 70) + board(2, 58, 84, 40, 62) + feed +
      T("episode 1   episode 2   episode 3", 74, 450, 20, { w: 500, align: "center", weight: 500, color: M, id: "row3" }));
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.08, 0.3);
  js += show("#seed", cueIn(id, "what the seed does"), 0.3);
  [0, 1, 2].forEach(k => {
    js += drawOn(`feed${k}`, cueIn(id, "change the seed") + 0.1 + k * 0.18, 0.3);
    js += show(`#b${k}`, cueIn(id, "change the seed") + 0.1 + k * 0.18, 0.3);
  });
  js += rowUp("#row3", cueIn(id, "change the seed") + 0.8, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ7
// Punch-in on 'while not done and n < 300' (OCR 1066,1105): underline it (ink);
// a step meter fills toward a dashed ceiling '300' in an opaque block below the
// zoomed line (y ~521); on 'status of done' a second exit arrow 'done' lights
// (ONE accent). rampOut 12f keeps the ceiling up as he finishes the line.
if (want("gZ7")) {
  const id = "gZ7", D = dur(id);
  const zid = "gZ7";
  const [p0, p1] = plateau(zid, span(id)[0]);
  const bWhile = zm(zid, [1066, 1105, 1495, 1133]);          // while not done and n < 300
  const M = "#B9B2A8", F = C.bg;
  const blk = `<div id="blk" style="position:absolute;left:40px;top:640px;width:640px;padding:22px 26px;background:${C.ink};border:3px solid ${C.bg};border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0">
      <div style="font-family:Satoshi;font-variation-settings:'wght' 700;font-size:20px;letter-spacing:.12em;text-transform:uppercase;color:${M}">the step budget</div>
      <div style="position:relative;margin-top:14px;height:16px;border-top:4px dashed ${M}"></div>
      <div style="position:absolute;right:22px;top:44px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:28px;color:${F}">300</div>
      <div id="meter" style="margin-top:10px;height:26px;border-radius:6px;background:${F};transform:scaleX(0);transform-origin:left center"></div>
    </div>`;
  const doneA = `<svg id="doneA" style="position:absolute;left:600px;top:560px;overflow:visible;opacity:0" width="160" height="160" viewBox="0 0 160 160">
       <path id="doneP" d="M20,150 C60,150 100,120 118,52" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
       <path id="doneH" d="M104,66 L120,44 L132,68" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
     </svg>` +
    `<div id="doneT" style="position:absolute;left:740px;top:548px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:30px;color:${C.accent};opacity:0">done</div>`;
  const body = underlineM("uW", bWhile, INK, 5) + blk + doneA;
  let js = markLife("#uW", p0, 0.1, p1);
  js += showIn("#blk", p0, p1, 0.3, 0.3);
  js += `tl.fromTo("#meter",{scaleX:0},{scaleX:1,duration:${f3(Math.min(4.5, Math.max(1.5, p1 - p0 - 1.2)))},ease:"power2.out",immediateRender:false},${f3(p0 + 0.3)});\n`;
  const tDone = cueIn(id, "you get a status of done");
  js += show("#doneA", tDone, 0.01) + drawOn("doneP", tDone, 0.4) + drawOn("doneH", tDone + 0.3, 0.25) + show("#doneT", tDone + 0.25, 0.3);
  emit(id, D, body, js);
}

// =================================================================== gZ7b
// 'This is not a real policy': two stacked flow diagrams. Top (real): read state
// -> decide -> step. Bottom (his): sample(action_space) -> go, a DASHED BYPASS
// skipping state (ONE accent). Lands as he defines a policy; the random-policy
// line closes it.
if (want("gZ7b")) {
  const id = "gZ7b", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const box = (bx, by, bw, txt, col) => `<rect x="${bx}" y="${by}" width="${bw}" height="46" rx="8" fill="none" stroke="${col}" stroke-width="3.5"/>
      <text x="${bx + bw / 2}" y="${by + 30}" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 700" font-size="21" fill="${col}">${txt}</text>`;
  const arrow = (x0, y0, x1, y1, idn, col = F) => `<path id="${idn}" d="M${x0},${y0} L${x1 - 10},${y1}" pathLength="1" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1">
      </path><path id="${idn}-h" d="M${x1 - 12},${y1 - 6} L${x1},${y1} L${x1 - 12},${y1 + 6}" pathLength="1" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>`;
  const top = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="330" viewBox="0 0 ${w} 330">
      ${box(44, 120, 150, "read state", F)}${box(234, 120, 150, "decide action", F)}${box(424, 120, 120, "step", F)}
      ${arrow(194, 143, 234, 143, "a1")}${arrow(384, 143, 424, 143, "a2")}
    </svg>`;
  const bot = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="330" viewBox="0 0 ${w} 330">
      <rect x="44" y="120" width="150" height="46" rx="8" fill="none" stroke="${M}" stroke-width="3.5" stroke-dasharray="10 8" opacity=".7"/>
      <text x="119" y="150" text-anchor="middle" font-family="Satoshi" font-variation-settings:'wght' 500" font-size="21" fill="${M}" opacity=".7">read state</text>
      ${box(234, 120, 220, "sample(action_space)", F)}${box(494, 120, 60, "go", F)}
      ${arrow(454, 143, 494, 143, "a3")}
      <path id="byp" d="M119,166 C119,214 300,214 524,172" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="4.5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      T("this is not a real policy", 44, 30, 34, { w: 520, weight: 900, cls: "disp", id: "hd" }) +
      T("a policy reads the state first", 44, 78, 22, { weight: 500, color: M, id: "l1" }) + top +
      `<div style="position:absolute;left:44px;top:258px;width:512px;height:2px;background:${M};opacity:.4"></div>` +
      T("his: skip the state, sample", 44, 274, 22, { weight: 500, color: M, id: "l2" }) +
      `<div style="position:absolute;top:330px;left:0">${bot}</div>`);
  let js = wipeUp(`#${id}`, 0, 0.35) + rowUp("#hd", 0.08, 0.3);
  js += rowUp("#l1", cueIn(id, "not a real policy") + 0.4, 0.3);
  js += drawOn("a1", cueIn(id, "read the current state") + 0.1, 0.3) + drawOn("a1-h", cueIn(id, "read the current state") + 0.3, 0.2);
  js += drawOn("a2", cueIn(id, "truly random") + 0.3, 0.3) + drawOn("a2-h", cueIn(id, "truly random") + 0.5, 0.2);
  js += rowUp("#l2", cueIn(id, "truly random"), 0.3);
  js += drawOn("a3", cueIn(id, "sample of the action space") + 0.1, 0.3) + drawOn("a3-h", cueIn(id, "sample of the action space") + 0.3, 0.2);
  js += drawOn("byp", cueIn(id, "sample of the action space") + 0.45, 0.7);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ8
// Random policy scorecard: '0 / 100' 160px; 'max coverage 0.115' muted with a
// tiny 11.5% fill bar (ONE accent: the bar). The payoff of the baseline.
if (want("gZ8")) {
  const id = "gZ8", D = dur(id), [x, y, w, h] = boxOf(id);
  const M = dim(id);
  const t0 = cueIn(id, "zero successes");
  const tc = cueIn(id, "max coverage");
  // pass-2 F1/F6 + cheek: height-fit (the covbar bottom is 408; 620 left ~212px
  // dead black) and w 600->575 (hold frames: face edge canvas x659-661 at card
  // rows; edge 610 = 26px clear of the cheek (face measured at x636-637)).
  const CW = 550, CH = 454;
  const body = cardHTML(id, x, y, CW, CH,
      EYEBROW("random policy, 100 rolls", 44, 36, M, "ey", 22) +
      `<span id="sc" style="position:absolute;left:44px;top:74px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:160px;line-height:1;opacity:0">0</span>
       <div id="of" style="position:absolute;left:44px;top:258px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:56px;color:${M};opacity:0">/ 100 successes</div>` +
      T("max coverage 0.115", 44, 350, 30, { weight: 700, color: M, id: "cov" }) +
      `<div id="covbg" style="position:absolute;left:44px;top:392px;width:420px;height:14px;border:2px solid ${M};border-radius:7px;opacity:0"></div>` +
      `<div id="covbar" style="position:absolute;left:48px;top:396px;width:${Math.round(0.115 * 412)}px;height:6px;border-radius:3px;background:${C.accent};transform:scaleX(0);transform-origin:left center"></div>`);
  let js = wipeUp(`#${id}`, 0, 0.3);
  js += `tl.fromTo("#sc",{opacity:0},{opacity:1,duration:0.01,immediateRender:false},${f3(t0)});\n` + countUp("#sc", 8, 0, t0, 0.7);
  js += rowUp("#of", t0 + 0.3, 0.35);
  js += rowUp("#cov", tc, 0.3) + show("#covbg", tc, 0.3) + barIn("covbar", tc + 0.2, 0.5);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ8a
// 'pure chaos does not create order': left, scattered dots in free motion
// (ONE accent: the scatter), right, the same dots refusing to form the T, dashed
// target ghost staying empty. Learning needs chaos; chaos alone builds nothing.
if (want("gZ8a")) {
  const id = "gZ8a", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  const R = (seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; })(41);
  const chaos = [...Array(9).keys()].map(k => {
    const px = 60 + R() * 180, py = 190 + R() * 160;
    return `<circle id="dc${k}" cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" r="9" fill="${C.accent}" opacity="0"/>`; }).join("");
  const dots = [...Array(9).keys()].map(k => {
    const px = 60 + ((k * 53) % 190), py = 190 + ((k * 97) % 170);
    return `<circle id="rd${k}" cx="${px}" cy="${py}" r="9" fill="${F}" opacity="0"/>`; }).join("");
  const svg = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${chaos}${dots}
      <path d="M352,220 L452,220 M402,220 L402,300" pathLength="1" fill="none" stroke="${M}" stroke-width="10" stroke-linecap="round" stroke-dasharray="12 10" opacity=".8"/>
      <rect x="316" y="176" width="176" height="176" rx="10" fill="none" stroke="${M}" stroke-width="3" stroke-dasharray="10 8"/>
      <rect x="44" y="176" width="212" height="176" rx="10" fill="none" stroke="${M}" stroke-width="3" opacity=".55"/>
    </svg>`;
  const body = cardHTML(id, x, y, w, h,
      T("pure chaos does not create order", 44, 34, 36, { w: 520, weight: 900, cls: "disp", id: "hd" }) +
      T("chaos", 118, 148, 22, { w: 80, align: "center", weight: 700, color: C.accent, id: "lc" }) +
      T("the T, never formed", 344, 148, 22, { w: 180, align: "center", weight: 700, color: M, id: "lt" }) + svg);
  let js = wipeUp(`#${id}`, 0, 0.3) + rowUp("#hd", 0.08, 0.3);
  const tC = cueIn(id, "pure chaos does not create order");
  [...Array(9).keys()].forEach(k => {
    js += `tl.fromTo("#dc${k}",{opacity:0,x:0,y:0},{opacity:1,x:${(R() * 46 - 23).toFixed(0)},y:${(R() * 36 - 18).toFixed(0)},duration:0.5,ease:"power1.out",immediateRender:false},${f3(tC + k * 0.06)});\n`;
    js += `tl.fromTo("#rd${k}",{opacity:0},{opacity:0.8,duration:0.3,immediateRender:false},${f3(tC + 0.9 + k * 0.05)});\n`;
  });
  js += show("#lc", tC + 0.1, 0.3) + show("#lt", tC + 1.1, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}

// =================================================================== gZ8b
// The hand-coded plan drawn: pusher bottom-left, star top-right, arrow one draws
// 'go to star', arrow two 'push in a straight line', ghost outline at the goal.
// ONE accent: the straight-line push. Dashed 'that should work' chip lands on
// "It should work, should happen."
if (want("gZ8b")) {
  const id = "gZ8b", D = dur(id), [x, y, w, h] = boxOf(id);
  const F = fg(id), M = dim(id);
  // pass-2 F1/F6 + cheek: "expected overlap" 19->20 (the only sub-floor run;
  // "that should work" is 24px already); board +20 so the dashed "that should
  // work" chip sits between headline descender (y74) and board top (y140) with
  // 10px clear each (its old top 64 grazed the 'p' of "plan"); card w 600->575
  // (hold frames: face edge canvas x636-637; edge 610 = 26px clear).
  const CW = 550;
  const svg = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="${CW}" height="${h}" viewBox="0 0 ${CW} ${h}">
      <rect x="44" y="140" width="380" height="352" rx="14" fill="none" stroke="${F}" stroke-width="3" opacity=".85"/>
      <path d="M300,200 L380,200 M340,200 L340,270" fill="none" stroke="${M}" stroke-width="10" stroke-linecap="round" stroke-dasharray="12 10" opacity=".8"/>
      <g id="star" style="opacity:0"><path d="M340,170 l8,17 19,3 -14,14 3,19 -16,-9 -16,9 3,-19 -14,-14 19,-3 Z" fill="${M}" stroke="${F}" stroke-width="2"/></g>
      <circle id="pusher" cx="100" cy="460" r="16" fill="${F}"/>
      <path id="ar1" d="M114,446 C160,400 240,320 300,240" pathLength="1" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <path id="ar2" d="M300,234 L452,188" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
      <path id="ar2h" d="M442,176 L456,187 L440,198" pathLength="1" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/>
    </svg>`;
  const body = cardHTML(id, x, y, CW, h,
      T("the hand-coded plan", 44, 30, 34, { w: 460, weight: 900, cls: "disp", id: "hd" }) +
      // labels sit above the card floor: probe had s3 box bottom 816 grazing
      // the 6px inner border band (814-820). Board height 380->352 and the trio
      // moved up 16: s1 top 718 clears the board bottom (692) by 26, s3 descender
      // bottom 800 clears the border by 14.
      T("1  go to the star", 44, 512, 22, { weight: 700, color: F, id: "s1" }) +
      T("2  push in a straight line", 44, 542, 22, { weight: 700, color: C.accent, id: "s2" }) +
      T("expected overlap", 44, 572, 20, { weight: 500, color: M, id: "s3" }) +
      svg +
      `<div id="chk" style="position:absolute;left:290px;top:84px;width:236px;height:46px;border:3px dashed ${M};border-radius:24px;opacity:0"></div>` +
      T("that should work", 310, 92, 24, { weight: 700, color: M, id: "chkT" }));
  let js = wipeUp(`#${id}`, 0, 0.35) + rowUp("#hd", 0.08, 0.3);
  js += `tl.fromTo("#star",{opacity:0},{opacity:1,duration:0.3,immediateRender:false},${f3(cueIn(id, "where the star is"))});\n`;
  js += drawOn("ar1", cueIn(id, "where the star is") + 0.15, 0.8) + rowUp("#s1", cueIn(id, "where the star is") + 0.3, 0.3);
  js += drawOn("ar2", cueIn(id, "straight line") + 0.1, 0.7) + drawOn("ar2h", cueIn(id, "straight line") + 0.65, 0.25) + rowUp("#s2", cueIn(id, "straight line") + 0.2, 0.3);
  js += rowUp("#s3", cueIn(id, "straight line") + 1.0, 0.3);
  const tW = cueIn(id, "should work");
  js += show("#chk", tW, 0.3) + show("#chkT", tW, 0.3);
  js += exitIfFree(id, D, [`#${id}`]);
  emit(id, D, body, js);
}
