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
     data-duration="${(Math.floor(dur * 1e6) / 1e6).toFixed(6)}" data-fps="30">
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
export const emit = (id, dur, body, js, assets = []) => {
  const d = `parts/${id}`;
  mkdirSync(`${d}/fonts`, { recursive: true });
  mkdirSync(`${d}/vendor`, { recursive: true });
  copyFileSync("fonts/Satoshi-Variable.ttf", `${d}/fonts/Satoshi-Variable.ttf`);
  copyFileSync("fonts/Satoshi-Bold.otf",     `${d}/fonts/Satoshi-Bold.otf`);
  copyFileSync("vendor/gsap.min.js",         `${d}/vendor/gsap.min.js`);
  if (assets.length) mkdirSync(`${d}/assets`, { recursive: true });
  for (const f of assets) copyFileSync(`assets/${f}`, `${d}/assets/${f}`);   // served from the part root
  writeFileSync(`${d}/hyperframes.json`, JSON.stringify(
    { $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
      media: { autoProxy: false } }, null, 2) + "\n");
  writeFileSync(`${d}/index.html`, head(id, dur) + body + tail(id, js));
  console.log(`  wrote ${d}/index.html  (${dur.toFixed(2)}s)`);
};

// Card wipes. A clip-path clips EVERYTHING outside the element's own box,
// including its box-shadow: on 2026-09-22 technical QA found every card's shadow
// missing, and the alpha channel read exactly 0 one pixel past the card edge,
// because the wipe's resting state was inset(0%). So wipes rest on NEGATIVE
// insets that reach past the shadow (16px offset + 52px blur, rounded up).
export const SHADOW_PAD = "-90px -90px -110px -90px";   // top right bottom left
// reentry: a SECOND entrance of the same card after a wipeDown. It must not get the
// hold, which runs from frame 0 and would hide the FIRST entrance: g04's first 30s
// never rendered that way (composition review 2026-09-23). The wipeDown's opacity 0
// already keeps the card hidden between exit and re-entry.
export const wipeUp = (sel, t, d = 0.35, reentry = false) => {
  // A card that enters LATE is held hidden from frame 0 until its entrance. Without
  // this, a later exit tween's creation-time state (fully visible) won the seek and
  // the g21 poll showed fully formed, flickered to a bar, then wiped in "again"
  // (composition + technical review 2026-09-22).
  // Any entrance after frame 0 gets the hold. It was t >= 0.25 until the g22 end card
  // entered at 0.07s and showed fully formed on frame 0, blinked out, then wiped in
  // (technical review 2026-09-23).
  const hold = +t > 0 && !reentry
    ? `tl.fromTo(${JSON.stringify(sel)},{clipPath:"inset(100% 0px 0px 0px)",opacity:0},{clipPath:"inset(100% 0px 0px 0px)",opacity:0,duration:${(+t).toFixed(3)},immediateRender:true},0);\n` : "";
  return hold + `tl.fromTo(${JSON.stringify(sel)},{clipPath:"inset(100% 0px 0px 0px)",opacity:1},{clipPath:"inset(${SHADOW_PAD})",opacity:1,duration:${d},ease:"power3.out",immediateRender:false},${t});`;
};
// A wipe-out ALSO ends at opacity 0: its clip rests on a box that still contains
// the band where the shadow falls (the 18s ghost stripe after g04, review
// 2026-09-22). immediateRender:false so its FROM state (visible) is never stamped
// onto the card at creation, which is what made late cards appear early.
export const wipeDown = (sel, t, d = 0.3) =>
  `tl.fromTo(${JSON.stringify(sel)},{clipPath:"inset(${SHADOW_PAD})",opacity:1},{clipPath:"inset(100% 0px 0px 0px)",opacity:1,duration:${d},ease:"power2.in",immediateRender:false},${t});
tl.fromTo(${JSON.stringify(sel)},{opacity:1},{opacity:0,duration:0.2,immediateRender:false},${(+t + d).toFixed(3)});`;
// An exit that must be COMPLETE by the part's last frame starts d + one frame early.
export const exitAt = (D, d = 0.3) => +(D - d - 1 / 30).toFixed(3);

// 3% monochrome grain for FULL-FRAME graphics only (style.md Texture; none on
// overlays over footage). A fixed-seed noise tile, moved in whole-tile STEPS off
// the timeline position so it changes every frame and is identical on every seek.
export const GRAIN_HTML = `<div id="grain" style="position:absolute;inset:0;opacity:.03;
  background:url(assets/grain.png);background-size:256px 256px;mix-blend-mode:multiply"></div>`;
// background-position, not a transform: a transform would move under a pixel a
// frame and read as a texture sliding, not grain. The tile repeats, so a 97x61px
// jump every frame is a fresh pattern each frame with no edge to run into.
export const grainJS = D => { const n = Math.round(D * 30);
  return `tl.fromTo("#grain",{backgroundPosition:"0px 0px"},{backgroundPosition:"${n*97}px ${n*61}px",duration:${D},ease:"steps(${n})"},0);`; };

// Cue helper: every card that quotes spoken content lands ON the cue measured
// from outputs/transcript-cut.json, never on the card's entrance. Offsets are
// relative to the part start.
export const rel = (start) => (t) => +(t - start).toFixed(2);

// Part timings are DERIVED from the validated plan, never retyped into the build
// script. Hardcoding them meant every plan change needed a matching code edit, and
// a missed one would have rendered a part at the wrong length with every gate
// passing: the render is internally consistent, it is just the wrong duration.
const CUTSHEET = JSON.parse(readFileSync("cutsheet.json", "utf8"));
// Durations are WHOLE FRAMES. g01's span ended at 8.0667s, was written as "8.067",
// and 8.067 x 30 = 242.01 rendered as 243 frames against 242 expected. So a part's
// length is round(end*30) - round(start*30) frames, and data-duration is written
// TRUNCATED to 6 places so the renderer's round-up lands exactly on that count.
export const frames = id => { const [s, e] = span(id); return Math.round(e * 30) - Math.round(s * 30); };
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

// A CLEANER brain for small sizes (2026-09-22). The library brain's 14 sulci cross
// into a grid and read as a clenched fist at hook size (the human saw it on the two
// hook previews). Same 260x210 box, same lobed outline, but a central fissure and
// six gyri that flow and never cross, so it reads as a brain at 240px.
const bp = (d, w = 3) => `<path class="dr" d="${d}" pathLength="1" fill="none" stroke="currentColor"
  stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const BRAIN_SIMPLE = (id) => `
<svg id="${id}" viewBox="0 0 260 210" width="260" height="210" style="overflow:visible">
  ${bp("M30,138 C12,126 8,98 24,78 C14,54 38,30 66,34 C76,14 112,8 130,26 C150,10 188,16 198,42 C224,48 236,76 220,98 C232,116 224,142 202,150 C196,166 172,174 152,166 C146,180 120,184 106,172 C84,182 52,176 44,158 C34,158 30,148 30,138 Z", 4)}
  ${bp("M130,28 C124,60 136,92 128,124 C122,146 128,160 126,172", 3)}
  ${bp("M58,62 C74,56 90,64 96,80", 2.6)}
  ${bp("M42,108 C60,98 82,104 92,120", 2.6)}
  ${bp("M62,146 C78,138 96,142 104,154", 2.6)}
  ${bp("M198,64 C182,58 166,66 160,82", 2.6)}
  ${bp("M214,108 C196,98 174,104 164,120", 2.6)}
  ${bp("M192,144 C176,138 160,142 152,154", 2.6)}
  ${bp("M128,170 C130,186 128,196 124,206", 3)}
</svg>`;

// Jar and brain are separate SVGs layered in divs, exactly as 02-first-agent
// composed them (jar at 20,0; brain at 50,96, i.e. +30,+96 inside it).
export const brainInJar = (id, left, top, scale = 1, limbs = false, simple = true) => `
<div id="${id}" style="position:absolute;left:${left}px;top:${top}px;width:${Math.round(320*scale)}px;
     height:${Math.round(400*scale)}px">
  <div style="position:absolute;left:0;top:0;width:320px;height:400px;
       transform:scale(${scale});transform-origin:top left">
    <div style="position:absolute;left:0;top:0">${_J(id + "-jar")}</div>
    <div id="${id}-brainwrap" style="position:absolute;left:30px;top:96px">${simple ? BRAIN_SIMPLE(id + "-brain") : _B(id + "-brain")}</div>
    ${limbs ? `<div style="position:absolute;left:-150px;top:250px">${_L(id + "-l1")}</div>
    <div style="position:absolute;left:300px;top:250px">${_L(id + "-l2", true)}</div>` : ""}
  </div>
</div>`;

// The draw-on CSS the art library expects. Include once per composition.
export const ART_CSS = `.dr{stroke-dasharray:1;stroke-dashoffset:1}
.pl{stroke-dasharray:0.07 0.93;stroke-dashoffset:1}`;

// ---------------------------------------------------------------- card geometry
// 04-lightweight-ontology, measured 2026-09-22 (zones.json, on the deflickered
// base cut's talking-head spans): clear wall x 0-780, y 0-840 canvas, luma ~104.
// That is TIGHTER than style.md's generic heroLeft (y to 940): below y 840 this
// frame holds the shirt and the mic, so the measurement wins, per style.md
// ("zones.json is authoritative").
export const ZONE = JSON.parse(readFileSync("zones.json", "utf8"));
export const LEFT_X0 = 96, LEFT_X1 = 760, TOP_Y = 96, BOTTOM_Y = 820;
export const CARD_W = LEFT_X1 - LEFT_X0;           // 664
// Demo inset windows where it sits bottom-LEFT (measured occlusion, see
// demo-spec.json inset.reposition). A card over the screen in those windows
// goes to the right instead. Derived, not retyped: read from demo-spec.json.
const DEMO = (() => { try { return JSON.parse(readFileSync("demo-spec.json", "utf8")); }
                      catch { return null; } })();
const PIP_LEFT = DEMO ? DEMO.inset.reposition.map(r => [r.start, r.end]) : [];
export const insetLeftDuring = id => {
  const [s, e] = span(id);
  return PIP_LEFT.some(([lo, hi]) => s < hi && e > lo);
};

// Cue times come from outputs/transcript-cut.json AT BUILD TIME, never typed in.
// cue("hallucinates", 0) -> start of the first "hallucinates" at or after 0s.
// A cue that is not found, or falls outside its own part, throws: style.md says a
// cue outside its part "renders nothing and errors nowhere".
const WORDS = JSON.parse(readFileSync("../outputs/transcript-cut.json", "utf8")).words;
const norm = w => w.toLowerCase().replace(/[^a-z0-9%.$']/g, "").replace(/[.]$/, "");
export const cue = (phrase, after = 0, which = "start") => {
  const p = phrase.toLowerCase().split(/\s+/).map(norm);
  for (let i = 0; i + p.length <= WORDS.length; i++) {
    if (WORDS[i].start < after) continue;
    if (p.every((w, k) => norm(WORDS[i + k].word) === w))
      return which === "end" ? WORDS[i + p.length - 1].end : WORDS[i].start;
  }
  throw new Error(`cue "${phrase}" not found after ${after}s`);
};
export const cueIn = (id, phrase, which = "start") => {
  const [s, e] = span(id);
  const t = cue(phrase, s - 0.5, which);
  if (t < s - 0.5 || t > e) throw new Error(`${id}: cue "${phrase}" at ${t} is outside ${s}-${e}`);
  return +(t - s).toFixed(3);                       // relative to the part
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

// ---------------------------------------------------------------- zoom marks
// Marks (underlines, boxes, strikes, labels) that sit ON a punch-in's zoomed text.
// Positions come from screen-ocr.json and are mapped through the SAME geometry
// demo_scene.py uses (zoompan clamps its source origin to [0, iw - iw/zoom]), so a
// mark lands on the zoomed text, not on the unzoomed screen. Composition review
// 2026-09-22: g12's label had been placed by eye and sat on the wrong number.
const OCR = JSON.parse(readFileSync("screen-ocr.json", "utf8"));
const SPEC = JSON.parse(readFileSync("demo-spec.json", "utf8"));
export const zoomItem = zid => {
  const z = SPEC.punchIns.items.find(x => x.id === zid);
  if (!z) throw new Error(`no punch-in ${zid} in demo-spec.json`);
  return z;
};
// first OCR run matching re at the sample nearest t; sub = a substring inside a
// monospace terminal line (its x is interpolated from the line box)
export const ocrBox = (t, re, sub = null) => {
  const d = OCR.reduce((a, b) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
  const r = d.runs.find(r => re.test(r[4]));
  if (!r) throw new Error(`OCR: /${re.source}/ not on screen at ${t}s (nearest sample ${d.t})`);
  let [x, y, w, h, txt] = r;
  if (sub) {
    const i = txt.indexOf(sub);
    if (i < 0) throw new Error(`OCR: "${sub}" not inside "${txt}"`);
    const cw = w / txt.length; x = x + i * cw; w = sub.length * cw;
  }
  return [x, y, x + w, y + h];
};
// source box (3840x2160 px) -> canvas box (1920x1080) at the punch-in's full zoom
export const mapZoom = (zid, [x0, y0, x1, y1]) => {
  const z = zoomItem(zid), W = 3840, H = 2160, Z = z.zoom;
  const sx = Math.min(Math.max(z.cx - W / Z / 2, 0), W - W / Z);
  const sy = Math.min(Math.max(z.cy - H / Z / 2, 0), H - H / Z);
  const m = (v, s) => (v - s) * Z / 2;
  return [m(x0, sx), m(y0, sy), m(x1, sx), m(y1, sy)];
};
// the window a punch-in is FULLY zoomed, relative to its own part start
export const plateau = (zid, partStart) => {
  const z = zoomItem(zid), f = Math.round((z.end - z.start) * 30);
  // the SAME ramp rules as demo_scene.py: ramp, then rampIn / rampOut per end
  const r = Math.min(z.ramp || 36, Math.floor(f / 3));
  const ri = Math.min(z.rampIn ?? r, Math.floor(f / 3)) / 30, ro = Math.min(z.rampOut ?? r, Math.floor(f / 3)) / 30;
  return [+(z.start + ri - partStart).toFixed(3), +(z.end - ro - partStart).toFixed(3)];
};

// A mark lives in its OWN small SVG, sized to its box plus a margin. A full-frame
// SVG layered over a composition hid the motion beneath it from the seek check
// ("timeline did not advance", g09 and g01 on 2026-09-22), and it is also simply
// heavier than it needs to be. inner is drawn in canvas coordinates.
export const markSVG = (x0, y0, x1, y1, inner, pad = 20) =>
  `<svg style="position:absolute;left:${(x0 - pad).toFixed(1)}px;top:${(y0 - pad).toFixed(1)}px;overflow:visible"
     width="${(x1 - x0 + 2 * pad).toFixed(1)}" height="${(y1 - y0 + 2 * pad).toFixed(1)}"
     viewBox="${(x0 - pad).toFixed(1)} ${(y0 - pad).toFixed(1)} ${(x1 - x0 + 2 * pad).toFixed(1)} ${(y1 - y0 + 2 * pad).toFixed(1)}">${inner}</svg>`;
