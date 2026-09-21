// Shared scaffolding for every part of ontologies-dont-work.
//
// This is a PURE motion graphic: no rough cut, no footage, no voiceover. Every
// part is class=segment, full frame, opaque. That removes the alpha/overlay half
// of the graphics skill and keeps everything else.
//
// Constraints baked in here, every one of which fails SILENTLY if broken:
//   * one master timeline, created paused, registered on window.__timelines[id]
//     where id === data-composition-id. An unregistered timeline renders a still.
//   * fonts live INSIDE each part root. The renderer serves the project directory
//     as its web root, so an @font-face path that climbs out of it is never
//     fetched and the render silently falls back to a system sans.
//   * no CSS blur, no grayscale, no class-name tweens, no tween under 0.2s,
//     no raw emoji, svgOrigin (never transformOrigin) for SVG rotation.
//   * every entrance is a fromTo whose destination states the VISIBLE end.
import { writeFileSync, mkdirSync, copyFileSync, readFileSync } from "node:fs";

export const C = { bg:"#F7F5F1", rule:"#DCD6CC", accent:"#E8542F",
                   accentSoft:"#F7B9A5", ink:"#14110E", muted:"#6E665C" };

// ---------------------------------------------------------------- the frame
// 4:5 for a LinkedIn feed on a phone, authored at 1080x1350 and rendered at 2x
// so Chrome rasterises type at full resolution. style.json canvas is 1920x1080
// and delivery is 3840x2160; neither shape exists here, so both are adapted and
// reported rather than edited. See REPORT.md, adaptation 3.
export const CANVAS_W = 1080, CANVAS_H = 1350, SCALE = 2, FPS = 30;

// Brief: keep key visuals inside a 60px side margin; the top and bottom 100px
// are background only because the player draws its controls there.
export const SAFE_X0 = 60, SAFE_X1 = 1020, SAFE_W = SAFE_X1 - SAFE_X0;   // 960
export const SAFE_Y0 = 100, SAFE_Y1 = 1250;

// The art field and the type plaque. Fixed in every beat, so the eye never hunts.
export const ART_X = 60, ART_Y = 190, ART_W = 960, ART_H = 600;
export const PLAQUE_X = 60, PLAQUE_Y = 830, PLAQUE_W = 960, PLAQUE_MAX_Y = 1240;
// The 0 16px 52px shadow decays about 68px past the plaque's own box, and the
// bottom 100px of the canvas is background only. So a plaque is lifted whenever
// its box plus that tail would cross y1250.
export const SHADOW_TAIL = 68, BAND_TOP = 1250;

// ---------------------------------------------------------------- treatment
// NOT a taste call. The page is $bg #F7F5F1, which measures luma 245. style.json
// graphics.panelContrast keys the treatment off measured background luma, and
// 245 > 150 selects `inverted`: $ink fill at 92%, $bg text, a 6px $bg border and
// the heavier 0.50 shadow. A $bg-at-92% panel on a $bg page would be invisible.
export const PLAQUE_FILL = C.ink + "EB";          // 92%
export const PLAQUE_TEXT = C.bg;
export const PLAQUE_DIM  = "#B9B2A8";             // the inverted muted, same as 03-project-context

// Art sits on the PAGE, not on the plaque, so it strokes $ink. Keeping these as
// named functions rather than literals is what stopped g012/g018 on the previous
// job rendering $ink strokes onto an $ink panel: invisible, with every gate green.
export const fgArt  = C.ink;
export const dimArt = C.muted;

// ---------------------------------------------------------------- typography
// Sizes are VERIFIED against the real font files by check_copy.py before any
// part is emitted. Nothing here is estimated from a character count: Satoshi
// renders "DATA ENGINEER" as "DATA ENGI NEER" if you position per character,
// and a strike rule sized from character count comes out visibly ragged.
// The brief's floor for hook and end text is 88px. MEASURED against the real
// font, the hook's copy cannot reach it: the best possible two-line split of
// "Enterprise knowledge graphs can't work." is "Enterprise knowledge" /
// "graphs can't work.", whose longest line is 925px at 88px against an 860px
// text column. Every other split is worse (59.2px and 61.0px). So 80px is the
// largest size that fits, and the shortfall is REPORTED, never silently taken.
// At a 390px phone width 80px on this canvas renders at 28.9px.
export const HOOK_PX = 80;
export const END_PX  = 100;
export const BODY_PX = { g002: 62, g003: 58, g004: 62, g005: 72, g006: 64 };
export const SUPPORT_PX = 58;  // brief floor: body >= 56px
export const EYEBROW_PX = 46;

// ---------------------------------------------------------------- the head
export const head = (id, dur) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=${CANVAS_W}, height=${CANVAS_H}"/>
<title>${id}</title>
<script src="vendor/gsap.min.js"></script>
<style>
@font-face{font-family:"SatoshiBlack";src:url("fonts/Satoshi-Black.otf") format("opentype");
  font-weight:900;font-style:normal;font-display:block}
@font-face{font-family:"SatoshiBold";src:url("fonts/Satoshi-Bold.otf") format("opentype");
  font-weight:700;font-style:normal;font-display:block}
@font-face{font-family:"SatoshiMedium";src:url("fonts/Satoshi-Medium.otf") format("opentype");
  font-weight:500;font-style:normal;font-display:block}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:${C.bg}}
#root{position:relative;width:${CANVAS_W*SCALE}px;height:${CANVAS_H*SCALE}px;
  overflow:hidden;background:${C.bg}}
#stage{position:absolute;left:0;top:0;width:${CANVAS_W}px;height:${CANVAS_H}px;
  transform:scale(${SCALE});transform-origin:top left;background:${C.bg}}
.clip{position:absolute;inset:0}

/* Texture, style.md: never a flat background. An $accent-soft radial at 8%, a
   1px $rule grid at 60px pitch and 6%, and 3% monochrome grain. The grain is a
   pre-rendered deterministic tile, NOT a CSS filter: blur and grayscale filters
   are not render-safe and feTurbulence is the same family of risk. */
.page{position:absolute;inset:0;background:${C.bg}}
.radial{position:absolute;inset:0;
  background:radial-gradient(60% 42% at 50% 34%, ${C.accentSoft} 0%, rgba(247,185,165,0) 70%);
  opacity:.08}
.grid{position:absolute;inset:0;opacity:.06;
  background-image:linear-gradient(to right, ${C.rule} 1px, transparent 1px),
                   linear-gradient(to bottom, ${C.rule} 1px, transparent 1px);
  background-size:60px 60px}
.grain{position:absolute;inset:0;background-image:url("assets/grain.png");
  background-repeat:repeat;background-size:128px 128px}

/* The type plaque. Inverted treatment, selected by measurement (page luma 245
   > the 150 threshold). Every card carries a 6px border and a real drop shadow:
   a card must read as an OBJECT in front of the page, not a rectangle painted
   on it, and the previous 2px/.20 combination MEASURED as invisible. */
.plaque{position:absolute;left:${PLAQUE_X}px;top:${PLAQUE_Y}px;width:${PLAQUE_W}px;
  background:${PLAQUE_FILL};border:6px solid ${C.bg};border-radius:4px;
  box-shadow:0 16px 52px rgba(0,0,0,.50);color:${PLAQUE_TEXT};
  padding:40px 44px}
.hl{font-family:"SatoshiBlack",sans-serif;font-weight:900;line-height:1.05;
  color:${PLAQUE_TEXT};white-space:nowrap}
.sup{font-family:"SatoshiMedium",sans-serif;font-weight:500;line-height:1.3;
  color:${PLAQUE_DIM};white-space:nowrap}
.eyebrow{font-family:"SatoshiBold",sans-serif;font-weight:700;letter-spacing:.16em;
  text-transform:uppercase;color:${PLAQUE_DIM};line-height:1.2;white-space:nowrap}
.arule{height:3px;background:${C.accent}}

/* Art-field labels live on the PAGE, so they take $ink / $muted. */
.lbl{font-family:"SatoshiBold",sans-serif;font-weight:700;color:${fgArt};white-space:nowrap}
.lblm{font-family:"SatoshiBold",sans-serif;font-weight:700;color:${dimArt};
  letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
.q{font-family:"SatoshiBlack",sans-serif;font-weight:900;line-height:1}

/* Draw-on helpers. pathLength="1" on every path means a draw-on is always
   offset 1 -> 0 regardless of the real path length. The dash values are SVG
   ATTRIBUTES on the element, never a gsap.set: a tl.set() with no position
   parameter lands at the timeline's current END, not at 0, which on the
   previous job made a building draw itself and then vanish. */
</style></head>
<body>
<div id="root" data-composition-id="${id}" data-start="0" data-width="${CANVAS_W*SCALE}"
     data-height="${CANVAS_H*SCALE}" data-duration="${dur.toFixed(3)}" data-fps="${FPS}">
<div id="stage">
<div class="page"></div><div class="radial"></div><div class="grid"></div><div class="grain"></div>`;

export const tail = (id, js) => `</div></div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
${js}
window.__timelines["${id}"] = tl;
</script>
</body></html>
`;

// One small PROJECT per part, so each can be linted, checked and re-rendered alone.
export const emit = (id, dur, body, js) => {
  const d = `parts/${id}`;
  mkdirSync(`${d}/fonts`, { recursive: true });
  mkdirSync(`${d}/vendor`, { recursive: true });
  mkdirSync(`${d}/assets`, { recursive: true });
  for (const f of ["Satoshi-Black.otf", "Satoshi-Bold.otf", "Satoshi-Medium.otf"])
    copyFileSync(`fonts/${f}`, `${d}/fonts/${f}`);
  copyFileSync("vendor/gsap.min.js", `${d}/vendor/gsap.min.js`);
  copyFileSync("assets/grain.png",   `${d}/assets/grain.png`);
  writeFileSync(`${d}/hyperframes.json`, JSON.stringify(
    { $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
      media: { autoProxy: false } }, null, 2) + "\n");
  writeFileSync(`${d}/index.html`, head(id, dur) + body + tail(id, js));
  console.log(`  wrote ${d}/index.html  (${dur.toFixed(2)}s)`);
};

// ---------------------------------------------------------------- the plan
// Part timings are DERIVED from the validated cut sheet, never retyped into the
// build script. Rule 12: a hardcoded path or duration is a landmine that arms
// itself the first time the plan changes, and the render would be internally
// consistent and simply the wrong length, with every gate passing.
const CUTSHEET = JSON.parse(readFileSync("cutsheet.json", "utf8"));
export const part = id => {
  const p = CUTSHEET.parts.find(x => x.id === id);
  if (!p) throw new Error(`${id} is not in cutsheet.json`);
  return p;
};
export const dur = id => { const p = part(id); return +(p.end - p.start).toFixed(3); };

// ---------------------------------------------------------------- motion
// Continuous motion on every beat, and no frozen holds: the brief asks for it on
// every part, which is stricter than style.json's 20s floor. Oscillators use a
// FINITE repeat count computed to cover the beat. An infinite repeat would make
// the timeline's own duration infinite.
export const cycles = (period, from, until) => Math.max(1, Math.ceil((until - from) / period));
export const osc = (sel, vars, period, from, until, extra = {}) => {
  const n = cycles(period, from, until);
  return { sel, vars, period, n, from, extra };
};

// Hard kill at the part boundary. Every exit that lands on a boundary needs an
// explicit opacity set to zero AT AN EXPLICIT POSITION; an unresolved tween pops
// instead of finishing, and a tl.set() with no position lands at the end.
export const KILL = (t) => `tl.set(".killable", { opacity: 0 }, ${t.toFixed(3)});`;

// ---------------------------------------------------------------- geometry guard
// Every gate downstream counts frames, samples and pixels. NONE of them can see
// that one element was nudged on top of another. Declare the boxes a scene cares
// about and assert at BUILD time: it is the only check that runs before anything
// expensive happens.
export const box = (t, x0, y0, x1, y1) => ({ t, x0, y0, x1, y1 });
export const assertClear = (id, boxes, pad = 0) => {
  const hit = (a, b) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad
                     && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++)
      if (hit(boxes[i], boxes[j]))
        throw new Error(`${id}: "${boxes[i].t}" overlaps "${boxes[j].t}"`);
};
export const assertInside = (id, boxes, x0 = SAFE_X0, y0 = SAFE_Y0, x1 = SAFE_X1, y1 = SAFE_Y1) => {
  for (const b of boxes)
    if (b.x0 < x0 || b.y0 < y0 || b.x1 > x1 || b.y1 > y1)
      throw new Error(`${id}: "${b.t}" (${b.x0},${b.y0})-(${b.x1},${b.y1}) leaves the safe area `
                    + `(${x0},${y0})-(${x1},${y1})`);
};

// ---------------------------------------------------------------- the object
// THE recurring object of this piece: a knowledge graph. style.md says where an
// object recurs, the hook is its first unresolved appearance, so its return is a
// payoff rather than an introduction. It builds (g002), freezes and goes stale
// (g003), has no owner (g004), fractures (g005) and shrinks into small files
// (g006). Coordinates are the 960x600 art-field viewBox.
export const NODES = [
  [480, 290], [200, 120], [760, 130], [115, 385],
  [835, 400], [325, 500], [655, 500], [480,  55], [480, 555],
];
export const EDGES = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,7],[2,7],[3,5],[4,6],[5,8],[6,8],
];
export const NR = 26;

// Nodes and edges as separate id-addressable elements so any one of them can be
// snapped, stamped, drained or accented on its own.
export const graphSVG = (p, { n = 9, edges = EDGES, r = NR, sw = 3, drawn = false,
                              preSnap = [], gap = 40, preShift = {}, preDrawn = [] } = {}) => {
  const off = drawn ? 0 : 1;
  // preDrawn: edges authored already drawn while the rest still arrive.
  const use = edges.filter(([a, b]) => a < n && b < n);
  const e = use.map(([a, b], i) => {
    const [x1, y1] = NODES[a], [x2, y2] = NODES[b];
    let mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    if (preSnap.includes(i)) {
      // Authored broken, not tweened broken: the state has to exist on frame 0.
      const pull = (px, py) => {
        const dx = mx - px, dy = my - py, L = Math.hypot(dx, dy);
        return [ +(mx - gap * dx / L).toFixed(1), +(my - gap * dy / L).toFixed(1) ];
      };
      const [ax, ay] = pull(x1, y1), [bx, by] = pull(x2, y2);
      return `<line id="${p}-e${i}a" x1="${x1}" y1="${y1}" x2="${ax}" y2="${ay}"
      stroke="${dimArt}" stroke-width="5" stroke-linecap="round" pathLength="1"
      stroke-dasharray="1" stroke-dashoffset="0"/>
    <line id="${p}-e${i}b" x1="${x2}" y1="${y2}" x2="${bx}" y2="${by}"
      stroke="${dimArt}" stroke-width="5" stroke-linecap="round" pathLength="1"
      stroke-dasharray="1" stroke-dashoffset="0"/>`;
    }
    // Two halves per edge, so a snap can open a real gap in the middle by
    // tweening the inner endpoints back toward their nodes. Tweening an SVG
    // ATTRIBUTE, never a transform, keeps this away from the transform conflict.
    return `<line id="${p}-e${i}a" x1="${x1}" y1="${y1}" x2="${mx}" y2="${my}"
      stroke="${fgArt}" stroke-width="${sw}" stroke-linecap="round" pathLength="1"
      stroke-dasharray="1" stroke-dashoffset="${preDrawn.includes(i) ? 0 : off}"/>
    <line id="${p}-e${i}b" x1="${x2}" y1="${y2}" x2="${mx}" y2="${my}"
      stroke="${fgArt}" stroke-width="${sw}" stroke-linecap="round" pathLength="1"
      stroke-dasharray="1" stroke-dashoffset="${preDrawn.includes(i) ? 0 : off}"/>`;
  }).join("\n");
  const nd = NODES.slice(0, n).map(([x, y], i) => {
    // A node whose edge is authored broken is authored displaced to match. This
    // is an ATTRIBUTE transform and the node carries no GSAP tween, so the two
    // can never collide on the same property.
    const sh = preShift[i] ? ` transform="translate(${preShift[i][0]},${preShift[i][1]})"` : "";
    return `<g id="${p}-n${i}"${sh}><circle id="${p}-n${i}c" cx="${x}" cy="${y}" r="${r}"
       fill="${C.bg}" stroke="${fgArt}" stroke-width="${sw}"/></g>`;
  }).join("\n");
  return { edges: e, nodes: nd, count: use.length };
};

export const svgOpen = (id, x = ART_X, y = ART_Y, w = ART_W, h = ART_H) =>
  `<svg id="${id}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px"
     viewBox="0 0 ${ART_W} ${ART_H}" xmlns="http://www.w3.org/2000/svg">`;
export const svgClose = `</svg>`;
