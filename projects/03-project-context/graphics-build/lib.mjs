// Shared scaffolding for every composition: colours, CSS, the 2x stage, the
// timeline registration, and the per-part project emitter. One definition, so a
// change to the shared CSS cannot drift between build scripts.
//
// Constraints baked in here, every one of which fails SILENTLY if broken:
//   * one master timeline, created paused, registered on window.__timelines[id]
//     where id === data-composition-id. An unregistered timeline renders a still.
//   * authored in 1920x1080 canvas units on a stage scaled 2x, because alpha
//     renders reject --resolution and would emit composition-resolution frames.
//   * fonts and gsap live INSIDE each part root. The renderer serves the project
//     directory as its web root, so an @font-face path that climbs out of it is
//     never fetched and the render falls back to a system font with no error.
import { writeFileSync, mkdirSync, copyFileSync, readFileSync } from "node:fs";

export const C = { bg:"#F7F5F1", rule:"#DCD6CC", accent:"#E8542F",
                   accentSoft:"#F7B9A5", ink:"#14110E", muted:"#6E665C" };

// Panel treatment is MEASURED per part on the base cut by measure_panels.py,
// never chosen by eye. A part over the screen recording goes opaque regardless
// of measured luma: mean luma cannot see detail density, so a dark terminal full
// of bright syntax-coloured text measures the same as a dark shirt and wants the
// opposite treatment.
export const PANELS = JSON.parse(readFileSync("panels.json", "utf8"));
export const panelClass = id => (PANELS[id]?.treatment === "opaque" ? "opaque"
                               : PANELS[id]?.treatment === "inverted" ? "opaque"
                               : "sheet");

export const head = (id, dur) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=1920, height=1080"/>
<title>${id}</title>
<script src="vendor/gsap.min.js"></script>
<style>
@font-face{font-family:"Satoshi";src:url("fonts/Satoshi-Variable.ttf") format("truetype");
  font-weight:300 900;font-style:normal;font-display:block}
@font-face{font-family:"SatoshiBold";src:url("fonts/Satoshi-Bold.otf") format("opentype");
  font-weight:700;font-style:normal;font-display:block}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent}
#root{position:relative;width:3840px;height:2160px;overflow:hidden;background:transparent}
#stage{position:absolute;left:0;top:0;width:1920px;height:1080px;
  transform:scale(2);transform-origin:top left}
.clip{position:absolute;inset:0}
.disp{font-family:"Satoshi",sans-serif;font-variation-settings:"wght" 900}
.med{font-family:"Satoshi",sans-serif;font-variation-settings:"wght" 500}
.capt{font-family:"SatoshiBold","Satoshi",sans-serif;font-weight:700}
/* over the speaker: measured 138-145 luma, lightReinforced */
/* Edge treatment, director 2026-09-09. The old 2px $rule border and .20 shadow
   MEASURED as invisible: across the card's bottom edge the frame went 147 -> 142
   luma over 140px, so the card read as a flat rectangle butted against the wall. */
.sheet{background:${C.bg}EB;border:6px solid #FFFFFF;
  box-shadow:0 16px 52px rgba(0,0,0,.38);color:${C.ink};border-radius:4px}
.sheet .muted{color:${C.muted}}
/* over the screen recording: OPAQUE, not 92%. At 92% a terminal's text ghosts
   through the card and the muted sub-line becomes the lowest-contrast element
   in the video. */
.opaque{background:${C.ink};border:6px solid ${C.bg};
  box-shadow:0 16px 52px rgba(0,0,0,.50);color:${C.bg};border-radius:4px}
.opaque .muted{color:#B9B2A8}
.accentbar{background:${C.accent}}
.eyebrow{letter-spacing:.16em;text-transform:uppercase}\n.dr{stroke-dasharray:1;stroke-dashoffset:1}\n.pl{stroke-dasharray:0.07 0.93;stroke-dashoffset:1}
</style></head>
<body>
<div id="root" data-composition-id="${id}" data-start="0" data-width="3840" data-height="2160"
     data-duration="${dur.toFixed(3)}" data-fps="30">
<div id="stage">`;

export const tail = (id, js) => `</div></div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
${js}
window.__timelines["${id}"] = tl;
</script>
</body></html>
`;

// One small PROJECT per part, so each can be linted, checked, snapshotted and
// re-rendered on its own.
export const emit = (id, dur, body, js) => {
  const d = `parts/${id}`;
  mkdirSync(`${d}/fonts`, { recursive: true });
  mkdirSync(`${d}/vendor`, { recursive: true });
  copyFileSync("fonts/Satoshi-Variable.ttf", `${d}/fonts/Satoshi-Variable.ttf`);
  copyFileSync("fonts/Satoshi-Bold.otf",     `${d}/fonts/Satoshi-Bold.otf`);
  copyFileSync("vendor/gsap.min.js",         `${d}/vendor/gsap.min.js`);
  writeFileSync(`${d}/hyperframes.json`, JSON.stringify(
    { $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
      media: { autoProxy: false } }, null, 2) + "\n");
  writeFileSync(`${d}/index.html`, head(id, dur) + body + tail(id, js));
  console.log(`  wrote ${d}/index.html  (${dur.toFixed(2)}s)`);
};

// Cue helper: every card that quotes spoken content lands ON the cue measured
// from outputs/transcript-cut.json, never on the card's entrance. Offsets are
// relative to the part start.
export const rel = (start) => (t) => +(t - start).toFixed(2);

// Part timings are DERIVED from the validated plan, never retyped into the build
// script. Hardcoding them meant every plan change needed a matching code edit, and
// a missed one would have rendered a part at the wrong length with every gate
// passing: the render is internally consistent, it is just the wrong duration.
const CUTSHEET = JSON.parse(readFileSync("cutsheet.json", "utf8"));
export const span = id => {
  const p = CUTSHEET.parts.find(x => x.id === id);
  if (!p) throw new Error(`${id} is not in cutsheet.json`);
  return [p.start, p.end];
};

// SVG foreground keyed to the MEASURED panel treatment. A hardcoded stroke of
// $ink on an opaque $ink panel is invisible, and it fails silently: the render
// succeeds, lint passes, the frame count is right, and the card comes out empty.
// Found on g012 and g018 during the full review pass, where the entire drawing
// had disappeared and only the accent and muted elements survived.
export const fg  = id => (panelClass(id) === "opaque" ? C.bg : C.ink);
export const dim = id => (panelClass(id) === "opaque" ? "#B9B2A8" : C.muted);

// The series motif, REUSED from 02-first-agent's art.mjs rather than redrawn.
// That library has a properly lobed cerebrum with 14 sulci, a cerebellum and a
// stem, and a bolted-lid jar with liquid, bubbles and highlights. Every path
// carries pathLength="1" so a draw-on is always offset 1 -> 0 regardless of the
// real path length, and everything strokes currentColor, which means the art
// inherits the panel's text colour and cannot repeat the invisible-on-dark bug.
export { BRAIN, JAR, LIMB, TERMINAL, DOC, SPINE, FOLDER, TERMWIN, GLOBE, DATABASE, SCROLL, CORD } from "./art.mjs";
import { BRAIN as _B, JAR as _J, LIMB as _L } from "./art.mjs";

// Jar and brain are separate SVGs layered in divs, exactly as 02-first-agent
// composed them (jar at 20,0; brain at 50,96, i.e. +30,+96 inside it).
export const brainInJar = (id, left, top, scale = 1, limbs = false) => `
<div id="${id}" style="position:absolute;left:${left}px;top:${top}px;width:${Math.round(320*scale)}px;
     height:${Math.round(400*scale)}px">
  <div style="position:absolute;left:0;top:0;width:320px;height:400px;
       transform:scale(${scale});transform-origin:top left">
    <div style="position:absolute;left:0;top:0">${_J(id + "-jar")}</div>
    <div id="${id}-brainwrap" style="position:absolute;left:30px;top:96px">${_B(id + "-brain")}</div>
    ${limbs ? `<div style="position:absolute;left:-150px;top:250px">${_L(id + "-l1")}</div>
    <div style="position:absolute;left:300px;top:250px">${_L(id + "-l2", true)}</div>` : ""}
  </div>
</div>`;

// The draw-on CSS the art library expects. Include once per composition.
export const ART_CSS = `.dr{stroke-dasharray:1;stroke-dashoffset:1}
.pl{stroke-dasharray:0.07 0.93;stroke-dashoffset:1}`;

// ---------------------------------------------------------------- card geometry
// Director 2026-09-09, after watching the first finished cut.
//   1. Through the demo the face inset sits LEFT (demo-spec.json inset.reposition,
//      354-1242), so every card in that window moves to the RIGHT column.
//   2. Every card top-aligns with the RUN A / RUN B chips at y=120; they were the
//      only parts at that height and the rest sat 130-580px lower.
export const CARD_W = 724;
export const CARD_X_LEFT = 96;
export const CARD_X_RIGHT = 1920 - 96 - CARD_W;   // 1100
export const CARD_Y = 120;
// Two windows, not one: between the RUN B chip at 9:22 and 11:36 the inset returns
// to its default right corner, so the cards in that gap (g014, g013) stay LEFT.
const PIP_LEFT = [[354.0, 562.0], [696.0, 1242.0]];
export const cardX = id => {
  const [s, e] = span(id);
  return PIP_LEFT.some(([lo, hi]) => s < hi && e > lo) ? CARD_X_RIGHT : CARD_X_LEFT;
};

// ---------------------------------------------------------------- geometry guard
// Twice now a "small" nudge has moved one element on top of another and shipped:
// the hook's "?" landed on two questions, and g028's side labels were lifted 56px
// to clear the accent ticks and landed IN the skyline instead. Both were invisible
// to every gate downstream, because a card that overlaps itself still renders, still
// has the right frame count and still passes the composite check.
//
// So: declare the boxes a scene cares about and assert on them AT BUILD TIME.
// textBox estimates an uppercase eyebrow's advance width; it is deliberately
// generous, because a false failure costs a rebuild and a miss costs a re-render.
export const textBox = (text, cx, top, fs, tracking = 0.16) => {
  const w = text.length * fs * (0.62 + tracking);
  return { t: text, x0: cx - w / 2, x1: cx + w / 2, y0: top, y1: top + fs * 1.25 };
};
export const assertClear = (id, boxes, pad = 0) => {
  const hit = (a, b) => a.x0 < b.x1 + pad && b.x0 < a.x1 + pad
                     && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++)
      if (hit(boxes[i], boxes[j]))
        throw new Error(`${id}: "${boxes[i].t}" overlaps "${boxes[j].t}"`);
};
export const assertCentred = (id, what, got, want, tol = 6) => {
  if (Math.abs(got - want) > tol)
    throw new Error(`${id}: ${what} centre is ${got}, should be ${want} `
                  + `(off by ${Math.round(got - want)}px)`);
};
