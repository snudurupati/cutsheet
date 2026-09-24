#!/usr/bin/env node
/**
 * job1 graphics build.
 *
 * Emits one HyperFrames project per part into parts/<id>/ so each can be linted,
 * checked, snapshotted and re-rendered on its own. Shared CSS and shared geometry
 * live here, not in the emitted files.
 *
 * THE OBJECT. One drawn object carries the video: a pipe that becomes a ring. It is
 * introduced jammed (g001), explained (g004), closed into a ring (g005), fed (g006),
 * tooled (g010), run ten times (g014) and cleared by a person (g017). PIPE and RING
 * below are the single source of that geometry. Every scene imports the same numbers,
 * which is what makes it read as one object returning rather than six diagrams.
 *
 * HyperFrames contract honoured throughout:
 *   - one master timeline, created paused, every tween at an absolute second
 *   - fromTo for every entrance (a bare `to` has no start state when seeked into)
 *   - no random values, no setTimeout, no rAF; everything comes off timeline position
 *   - no CSS transform and GSAP tween on the same property
 *   - no blur/grayscale filters, no emoji glyphs (both hang or silently drop)
 *   - instant state changes get a real 0.2-0.35s duration
 *   - fonts and gsap are INSIDE the project root, copied per part
 *   - authored on 1920x1080, stage scaled 2x in static CSS for 4K delivery
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const cut   = JSON.parse(fs.readFileSync(path.join(HERE, 'cutsheet.json'), 'utf8'));
const zones = JSON.parse(fs.readFileSync(path.join(HERE, 'zones.json'), 'utf8'));

// ---------------------------------------------------------------- brand tokens
const brandMd = fs.readFileSync(path.join(HERE, '../../../brand.md'), 'utf8');
const T = {};
for (const [, tok, hex] of brandMd.matchAll(/^\|\s*`([a-z-]+)`\s*\|[^|]*\|\s*`(#[0-9A-Fa-f]{6})`/gm))
  T[tok] = hex;
for (const k of ['bg','rule','accent','accent-soft','ink','muted'])
  if (!T[k]) throw new Error(`brand.md is missing colour token ${k}`);
const C = { bg:T.bg, rule:T.rule, accent:T.accent, soft:T['accent-soft'], ink:T.ink, muted:T.muted };

const FPS = 60;
const CANVAS_W = 1920, CANVAS_H = 1080, SCALE = 2;   // 4K delivery via a static stage scale

// ------------------------------------------------------------- shared geometry
// The pipe. Every scene that shows it uses these numbers, unchanged.
const PIPE = {
  x0: 200, x1: 1560, yTop: 596, yBot: 736,    // the barrel: 140px bore, not 60
  flowY: 666,
  stroke: 11,                                  // reads after a 4K -> phone downscale
  pinchX: 1380, pinchTop: 632, pinchBot: 700,  // the constriction the jam builds against
  inletY: 236,
  inlets: [560, 790, 1020, 1250],
  dotR: 16,
};
// The ring. Same barrel, bent round.
const RING = { cx: 960, cy: 540, r: 300 };
const RING_NODES = ['INGEST','CLEANSE','TRANSFORM','WAREHOUSE','ACTIVATE'];
const ringPt = (i, n = 5, r = RING.r) => {
  const a = (-90 + i * (360 / n)) * Math.PI / 180;
  return { x: RING.cx + r * Math.cos(a), y: RING.cy + r * Math.sin(a) };
};

// ------------------------------------------------------------------ CSS shared
const css = () => `
@font-face{font-family:'Satoshi';src:url('assets/fonts/Satoshi-Black.otf') format('opentype');font-weight:900;font-display:block}
@font-face{font-family:'Satoshi';src:url('assets/fonts/Satoshi-Bold.otf') format('opentype');font-weight:700;font-display:block}
@font-face{font-family:'Satoshi';src:url('assets/fonts/Satoshi-Medium.otf') format('opentype');font-weight:500;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${CANVAS_W * SCALE}px;height:${CANVAS_H * SCALE}px;overflow:hidden;background:transparent}
#stage{width:${CANVAS_W}px;height:${CANVAS_H}px;position:relative;transform:scale(${SCALE});transform-origin:top left;font-family:'Satoshi',sans-serif}
.page{position:absolute;inset:0;background:${C.bg}}
.grid{position:absolute;inset:0;opacity:.06;
  background-image:linear-gradient(${C.rule} 1px,transparent 1px),linear-gradient(90deg,${C.rule} 1px,transparent 1px);
  background-size:80px 80px}
.radial{position:absolute;inset:0;opacity:.08;
  background:radial-gradient(circle at 50% 45%, ${C.soft} 0%, transparent 60%)}
svg{position:absolute;inset:0;width:${CANVAS_W}px;height:${CANVAS_H}px;overflow:visible}
.lbl{position:absolute;font-weight:700;font-size:34px;color:${C.muted};letter-spacing:.01em;white-space:nowrap}
.eyebrow{position:absolute;font-weight:500;font-size:28px;color:${C.muted};letter-spacing:.18em;text-transform:uppercase}
.hero{position:absolute;font-weight:900;color:${C.ink};line-height:1.02}
.cap{position:absolute;font-weight:500;font-size:22px;color:${C.muted}}
.job{position:absolute;font-weight:900;font-size:56px;color:${C.ink};letter-spacing:.005em;white-space:nowrap}
.heroJob{position:absolute;font-weight:900;font-size:104px;color:${C.ink};letter-spacing:.003em;white-space:nowrap}
.mono{position:absolute;font-weight:900;color:${C.ink};line-height:1}
.ghost{position:absolute;font-weight:500;color:${C.soft};line-height:1}
.caret{position:absolute;width:7px;height:100px;background:${C.accent}}
.typed{position:absolute;line-height:1;white-space:nowrap;letter-spacing:.002em}
.arrowWrap{position:absolute;width:60px;height:80px}
.chip{position:absolute;background:${C.ink};border-radius:12px}
.chipName{position:absolute;font-weight:700;font-size:44px;color:${C.bg};white-space:nowrap}
.chipRole{position:absolute;font-weight:500;font-size:28px;color:${C.bg};opacity:.72;white-space:nowrap}
.chipOpaque{position:absolute;background:${C.ink};border-radius:12px}
.chipKick{position:absolute;font-weight:700;font-size:22px;color:${C.accent};letter-spacing:.14em}
.hdr{position:absolute;font-weight:700;font-size:26px;color:${C.muted};letter-spacing:.14em}
.row{position:absolute;font-weight:700;font-size:38px;color:${C.ink};white-space:nowrap}
.rowGone{color:${C.ink}}
.tickMark{position:absolute;font-weight:700;font-size:34px;color:${C.muted}}
.verdict{position:absolute;font-weight:900;font-size:180px;color:${C.ink};line-height:1}
.verdict span{color:${C.accent}}
.endPanel{position:absolute;background:${C.ink};border-radius:12px}
.endHead{position:absolute;font-weight:900;font-size:40px;color:${C.bg};line-height:1.14}
.endSub{position:absolute;font-weight:500;font-size:22px;color:${C.bg};opacity:.75;white-space:nowrap}
.endHandle{position:absolute;font-weight:700;font-size:22px;color:${C.accent};white-space:nowrap}
.toolName{position:absolute;font-weight:700;font-size:34px;color:${C.ink};white-space:nowrap;transform:translateX(-50%)}
.wireLbl{position:absolute;font-weight:500;font-size:24px;color:${C.muted};white-space:nowrap}
.laneName{position:absolute;font-weight:900;font-size:40px;color:${C.ink};white-space:nowrap}
.laneSub{position:absolute;font-weight:500;font-size:24px;color:${C.muted};white-space:nowrap}
.mark{position:absolute;font-weight:700;font-size:20px;color:${C.bg};width:30px;text-align:center;margin-left:-15px}
.nodeLbl{position:absolute;font-weight:700;font-size:30px;color:${C.muted};white-space:nowrap;transform:translate(-50%,-50%)}
`;

// -------------------------------------------------------------- svg primitives
let uid = 0;
const nid = (p = 'e') => `${p}${++uid}`;
const line = (x1,y1,x2,y2,o={}) =>
  `<line id="${o.id||nid('l')}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke||C.ink}" stroke-width="${o.w||6}" stroke-linecap="${o.cap||'round'}" class="${o.cls||''}"/>`;
const pathEl = (d,o={}) =>
  `<path id="${o.id||nid('p')}" d="${d}" fill="${o.fill||'none'}" stroke="${o.stroke||C.ink}" stroke-width="${o.w||6}" stroke-linecap="round" stroke-linejoin="round" class="${o.cls||''}"/>`;
const circ = (cx,cy,r,o={}) =>
  `<circle id="${o.id||nid('c')}" cx="${cx}" cy="${cy}" r="${r}" fill="${o.fill||'none'}" stroke="${o.stroke||C.ink}" stroke-width="${o.w||6}" class="${o.cls||''}"/>`;

/** The four feed glyphs. Four shapes so the eye can tell the feeds apart at a glance. */
const inletGlyph = (i, x, y, id) => {
  const s = 30;
  if (i === 0) return circ(x, y, s, { id, w: 8 });
  if (i === 1) return `<rect id="${id}" x="${x-s}" y="${y-s}" width="${s*2}" height="${s*2}" fill="none" stroke="${C.ink}" stroke-width="8"/>`;
  if (i === 2) return pathEl(`M ${x} ${y-s-2} L ${x+s} ${y+s-4} L ${x-s} ${y+s-4} Z`, { id, w: 8 });
  return pathEl(`M ${x+s} ${y} A ${s} ${s} 0 1 1 ${x-s*0.2} ${y-s*0.97}`, { id, w: 8 });
};

/** The barrel of the pipe, as two rails plus a left cap and a right outlet arrow. */
const pipeBarrel = () => {
  const w = PIPE.stroke;
  // Each rail is ONE path: cap, run, pinch, outlet. Drawing them as a single stroke
  // means the outlet can never appear detached from the barrel mid-draw.
  const top = `M ${PIPE.x0} ${PIPE.yTop} L ${PIPE.pinchX - 90} ${PIPE.yTop} `
            + `Q ${PIPE.pinchX} ${PIPE.yTop} ${PIPE.pinchX + 40} ${PIPE.pinchTop} `
            + `L ${PIPE.x1} ${PIPE.pinchTop}`;
  const bot = `M ${PIPE.x0} ${PIPE.yBot} L ${PIPE.pinchX - 90} ${PIPE.yBot} `
            + `Q ${PIPE.pinchX} ${PIPE.yBot} ${PIPE.pinchX + 40} ${PIPE.pinchBot} `
            + `L ${PIPE.x1} ${PIPE.pinchBot}`;
  return `<g id="barrel">
    ${pathEl(top, { id: 'pipeTop', w })}
    ${pathEl(bot, { id: 'pipeBot', w })}
    ${line(PIPE.x0, PIPE.yTop, PIPE.x0, PIPE.yBot, { id: 'pipeCap', w })}
  </g>`;
};

/** GSAP helper emitted into every part: draw an SVG stroke on, seek-safely. */
const RUNTIME = `
  var SCALE_K = 2;
  // Draw-on for any stroked SVG element. Uses stroke-dashoffset, which is a real CSS
  // property GSAP can tween, never a class-name swap, which does not survive a seek.
  function drawOn(tl, sel, at, dur, ease){
    document.querySelectorAll(sel).forEach(function(el){
      var len = el.getTotalLength ? el.getTotalLength() : 2000;
      el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
      tl.fromTo(el, {strokeDashoffset: len}, {strokeDashoffset: 0, duration: dur, ease: ease||'power2.out'}, at);
    });
  }
  // Hard kill on a boundary: an unresolved tween pops instead of finishing.
  function killAt(tl, sel, at){ tl.to(sel, {opacity: 0, duration: 0.25, ease:'power1.in'}, at); }
  // Fit a strike to the text it crosses. A character-count estimate overshoots on
  // narrow letters and undershoots on wide ones, so the rules came out ragged.
  function fitStrike(textSel, lineSel, pad){
    var el = document.querySelector(textSel), ln = document.querySelector(lineSel);
    if (!el || !ln) return 0;
    var r = el.getBoundingClientRect(), st = document.getElementById('stage');
    var sr = st.getBoundingClientRect(), k = SCALE_K;
    var x0 = (r.left - sr.left) / k, w = r.width / k;
    ln.setAttribute('x1', x0 - (pad||8));
    ln.setAttribute('x2', x0 + w + (pad||8));
    return x0 + w + (pad||8);
  }
`;

// ============================================================ SCENES
// Each returns {markup, anim} where anim is JS source appended into the master
// timeline. Times are ABSOLUTE SECONDS RELATIVE TO THE PART START, never frames.
const SCENES = {};

/* ---------------------------------------------------------------- g001 HOOK
 * "The pipe that chokes." One clean pipe flowing, four mismatched feeds crash in,
 * the junction jams and holds. No headline card: he asks the question out loud and
 * repeating it on screen spends the one moment the audience is deciding.
 */
/* ---------------------------------------------------------------- g001 HOOK
 * "The autocomplete that gives up." The title is typed, then an AI suggestion
 * races in to replace it three times. The first two delete themselves; the THIRD
 * stalls half-deleted and stays stuck, so the question is left open rather than
 * answered nine minutes before the verdict.
 *
 * Everything is seek-safe: the caret blink is a repeating GSAP tween with a
 * stepped ease, never setInterval, and every character is its own span revealed
 * by an opacity stagger rather than by mutating textContent.
 */
SCENES.g001 = (part) => {
  const A = (abs) => +(abs - part.start).toFixed(3);
  const X = 300, BASE_Y = 470;
  // One element per word, revealed by a STEPPED clip-path wipe. Per-character spans
  // with a fixed advance width broke kerning ("ENGI NEER"): Satoshi's real metrics
  // are not uniform. clip-path keeps the font's own spacing and a steps() ease still
  // reveals one character at a time, so it reads as typing.
  const typed = (id, text, x, y, size, weight, color) =>
    `<div class="typed" id="${id}" style="left:${x}px;top:${y}px;font-size:${size}px;` +
    `font-weight:${weight};color:${color}">${text}</div>`;

  let m = `<div class="page"></div><div class="grid"></div><div class="radial"></div><svg>`;
  m += line(X - 10, BASE_Y + 132, 1620, BASE_Y + 132, { id: 'inputRule', stroke: C.rule, w: 3 });
  m += `</svg>`;
  m += typed('title', 'DATA ENGINEER', X, BASE_Y, 96, 900, C.ink);
  m += `<div class="arrowWrap" id="arrowWrap"><svg style="overflow:visible">`
     + pathEl('M 0 40 L 54 40 M 36 22 L 54 40 L 36 58', { id: 'arrow', stroke: C.muted, w: 5 })
     + `</svg></div>`;
  ['AUTOMATED', 'DEPRECATED', 'OPTIONAL'].forEach((g, k) => {
    m += typed(`ghost${k}`, g, 0, 16, 76, 500, C.soft);
  });
  m += `<div class="caret" id="caret" style="left:${X}px;top:${BASE_Y + 2}px"></div>`;
  m += `<div class="eyebrow" id="eyebrowC" style="left:${X}px;top:${BASE_Y + 196}px">attempting to replace</div>`;

  const wipeIn  = (id, n, at, dur) =>
    `  tl.fromTo('#${id}', {clipPath:'inset(0 100% 0 0)'}, {clipPath:'inset(0 0% 0 0)', duration:${dur}, ease:'steps(${n})'}, ${at});`;
  const wipeOut = (id, n, at, dur) =>
    `  tl.to('#${id}', {clipPath:'inset(0 100% 0 0)', duration:${dur}, ease:'steps(${n})'}, ${at});`;

  const anim = `
  // The ghost words and the arrow are positioned from the MEASURED width of the
  // title, so nothing depends on a guessed advance width.
  (function place(){
    var st = document.getElementById('stage'), sr = st.getBoundingClientRect(), k = SCALE_K;
    var tr = document.getElementById('title').getBoundingClientRect();
    var endX = (tr.right - sr.left) / k;
    document.getElementById('arrowWrap').style.left = (endX + 44) + 'px';
    document.getElementById('arrowWrap').style.top  = ${BASE_Y} + 'px';
    for (var i = 0; i < 3; i++) {
      var g = document.getElementById('ghost' + i);
      g.style.left = (endX + 130) + 'px';
      g.style.top  = ${BASE_Y + 16} + 'px';
    }
    window.__titleEnd = endX;
  })();

  gsap.set(['#ghost0','#ghost1','#ghost2'], {clipPath:'inset(0 100% 0 0)'});
  gsap.set(['#arrowWrap','#eyebrowC'], {opacity:0});

  // Caret blinks for the whole part: a stepped repeating tween, never a timer, so
  // every seek lands on a defined state.
  tl.fromTo('#caret', {opacity:1}, {opacity:0, duration:0.5, ease:'steps(1)',
      repeat:${Math.ceil((part.end - part.start) / 0.5)}, yoyo:true}, 0);

  // 0.05  the title types itself, the caret riding the reveal.
${wipeIn('title', 13, 0.05, 0.86)}
  tl.to('#caret', {x:function(){return window.__titleEnd - ${X} + 6;}, duration:0.86,
      ease:'steps(13)'}, 0.05);
  tl.fromTo('#arrowWrap', {opacity:0, x:-14}, {opacity:1, x:0, duration:0.32, ease:'power2.out'}, 1.15);
  tl.fromTo('#eyebrowC', {opacity:0}, {opacity:0.85, duration:0.4}, 1.30);

  // 1.55 / 2.80 / 4.05  three suggestions race in and delete themselves.
${wipeIn('ghost0', 9, 1.55, 0.40)}
${wipeOut('ghost0', 9, 2.35, 0.30)}
${wipeIn('ghost1', 10, 2.80, 0.42)}
${wipeOut('ghost1', 10, 3.60, 0.30)}
${wipeIn('ghost2', 8, 4.05, 0.36)}
  // The third deletion STALLS at 50% and never finishes. "OPTI" stays stuck.
  tl.to('#ghost2', {clipPath:'inset(0 50% 0 0)', duration:0.20, ease:'steps(4)'}, 4.80);
  tl.to('#ghost2', {clipPath:'inset(0 56% 0 0)', duration:0.28, ease:'sine.inOut'}, 5.05);
  tl.to('#ghost2', {clipPath:'inset(0 52% 0 0)', duration:0.34, ease:'sine.inOut'}, 5.33);
  // 5.70 it gives up mid-word. The fragment holds, unresolved, to the last frame.
  tl.to('#ghost2', {opacity:0.62, duration:0.45, ease:'power1.out'}, ${A(5.700)});

  // 5.70  it gives up: the label goes, the arrow stays pointing at the stuck fragment.
  tl.to('#eyebrowC', {opacity:0, duration:0.40}, ${A(5.700)});
  tl.to('#arrowWrap', {opacity:0.45, duration:0.40}, ${A(5.700)});
  // 5.94  his cue, "I am a data engineer by training". Nothing replaced it. The
  // caret just sits after the title, still blinking, to the end.
  tl.to('#caret', {x:function(){return window.__titleEnd - ${X} + 26;}, duration:0.35,
      ease:'power2.out'}, ${A(5.940)});
  `;
  return { markup: m, anim };
};


/* ------------------------------------------------------------- g002 LOWER THIRD
 * Type IS the content for a name, so this stays a chip. It sits in the MEASURED
 * tertiary zone: the style's stored lower band runs under the chin on this framing.
 * Zone luma is 208, well over the 150 threshold, so the panel is INVERTED.
 */
SCENES.g002 = () => {
  const z = zones.zones.tertiary;
  const X = z.x[0], Y = z.y[0], W = z.x[1] - z.x[0], H = z.y[1] - z.y[0];
  let m = `<div class="chip" id="chip" style="left:${X}px;top:${Y}px;width:${W}px;height:${H}px"></div>`;
  m += `<svg>${line(X, Y, X, Y + H, { id: 'chipBar', stroke: C.accent, w: 8 })}</svg>`;
  m += `<div class="chipName" id="chipName" style="left:${X + 34}px;top:${Y + 44}px">Sreeram Nudurupati</div>`;
  m += `<div class="chipRole" id="chipRole" style="left:${X + 34}px;top:${Y + 100}px">AI for the Working Data Engineer</div>`;
  const anim = `
  gsap.set(['#chipName','#chipRole'], {opacity:0});
  gsap.set('#chipBar', {opacity:0});
  // Wipes up from behind its own lower edge.
  tl.fromTo('#chip', {clipPath:'inset(100% 0 0 0)'}, {clipPath:'inset(0% 0 0 0)',
      duration:0.35, ease:'power3.out'}, 0.10);
  tl.fromTo('#chipName', {opacity:0, y:10}, {opacity:1, y:0, duration:0.32, ease:'power2.out'}, 0.34);
  tl.fromTo('#chipRole', {opacity:0, y:10}, {opacity:1, y:0, duration:0.32, ease:'power2.out'}, 0.46);
  tl.fromTo('#chipBar', {opacity:0}, {opacity:1, duration:0.20}, 0.65);
  drawOn(tl, '#chipBar', 0.65, 0.30);           // the one accent element
  tl.to(['#chipName','#chipRole','#chipBar'], {opacity:0, duration:0.25}, 5.55);
  tl.to('#chip', {clipPath:'inset(100% 0 0 0)', duration:0.30, ease:'power3.in'}, 5.62);
  `;
  return { markup: m, anim };
};

/* -------------------------------------------------------------- g003 ONE PROMPT
 * The graphic performs the claim instead of quoting it: a prompt types itself,
 * contracts to a point, and a whole GAME assembles out of that point.
 *
 * First attempt was an abstract grid of shapes blooming outward. It rendered fine
 * and said nothing -- a regular cycle of squares and triangles reads as wallpaper,
 * not as a video game. A recognisable game screen reads instantly.
 */
SCENES.g003 = () => {
  const SX = 470, SY = 250, SW = 980, SH = 560;          // the game screen
  const GY = SY + SH - 70;                                // ground line
  const plats = [[SX+120, GY-150, 180], [SX+430, GY-250, 210], [SX+740, GY-120, 150]];
  const coins = [[SX+205, GY-200], [SX+540, GY-300], [SX+810, GY-170]];
  const HX = SX + 34, HY = SY + 40;
  let m = `<div class="page"></div><div class="grid"></div><div class="radial"></div><svg>`;
  m += `<rect id="screen" x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="14" fill="none" stroke="${C.ink}" stroke-width="8"/>`;
  m += line(SX + 24, GY, SX + SW - 24, GY, { id: 'ground', w: 8 });
  plats.forEach((p, i) => { m += line(p[0], p[1], p[0] + p[2], p[1], { id: `plat${i}`, w: 8 }); });
  // the character: head, body, two legs, drawn as one group so it can hop
  m += `<g id="hero">`
     + circ(SX + 90, GY - 96, 22, { id: 'heroHead', w: 6 })
     + line(SX + 90, GY - 74, SX + 90, GY - 26, { id: 'heroBody', w: 7 })
     + line(SX + 90, GY - 26, SX + 72, GY - 2, { id: 'heroLegA', w: 6 })
     + line(SX + 90, GY - 26, SX + 108, GY - 2, { id: 'heroLegB', w: 6 })
     + `</g>`;
  coins.forEach((c, i) => { m += circ(c[0], c[1], 17, { id: `coin${i}`, w: 6, stroke: C.accent }); });
  m += `<g id="cloud">`
     + pathEl(`M 0 0 q 26 -30 56 -8 q 28 -22 46 10 q 24 4 8 22 l -118 0 q -18 -14 8 -24 z`,
              { id: 'cloudP', w: 5, stroke: C.rule })
     + `</g>`;
  m += `<rect id="hudTrack" x="${HX}" y="${HY}" width="240" height="16" rx="8" fill="none" stroke="${C.muted}" stroke-width="4"/>`;
  m += `<rect id="hudFill" x="${HX+3}" y="${HY+3}" width="0" height="10" rx="5" fill="${C.accent}"/>`;
  [0,1,2].forEach(i => {
    const x = SX + SW - 50 - i * 44;
    m += pathEl(`M ${x} ${HY+16} l -15 -15 a 10.6 10.6 0 0 1 15 -15 a 10.6 10.6 0 0 1 15 15 z`,
                { id: `life${i}`, w: 5 });
  });
  m += circ(960, 520, 13, { id: 'seed', fill: C.accent, stroke: 'none', w: 0 });
  m += `</svg>`;
  m += `<div class="typed" id="prompt" style="left:530px;top:496px;font-size:44px;font-weight:500;color:${C.muted}">build me a video game</div>`;
  m += `<div class="cap" id="attrib" style="left:470px;top:880px">seen on X, Opus 5 launch</div>`;

  const pop = (sel, at, ox, oy) =>
    `  tl.fromTo('${sel}', {opacity:0, scale:0.5, svgOrigin:'${ox} ${oy}'}, {opacity:1, scale:1, ` +
    `duration:0.30, ease:'back.out(2.2)'}, ${at});`;
  const anim = `
  gsap.set(['#screen','#ground','#plat0','#plat1','#plat2','#hero','#coin0','#coin1','#coin2',
            '#hudTrack','#hudFill','#life0','#life1','#life2','#cloud','#seed','#attrib'], {opacity:0});

  // 0.05-1.10  the prompt types itself.
  tl.fromTo('#prompt', {clipPath:'inset(0 100% 0 0)'}, {clipPath:'inset(0 0% 0 0)',
      duration:1.05, ease:'steps(20)'}, 0.05);
  // 1.30  it contracts to a single accent point.
  tl.to('#prompt', {scaleX:0.02, scaleY:0.06, opacity:0, transformOrigin:'50% 50%',
      duration:0.55, ease:'power3.in'}, 1.30);
  tl.fromTo('#seed', {opacity:0, scale:0.2, svgOrigin:'960 520'},
      {opacity:1, scale:1, duration:0.28, ease:'back.out(3)'}, 1.70);

  // 1.95  the game assembles out of it.
  tl.fromTo('#screen', {opacity:0, scale:0.35, svgOrigin:'960 520'},
      {opacity:1, scale:1, duration:0.45, ease:'power3.out'}, 1.95);
  tl.to('#seed', {opacity:0, duration:0.25}, 2.05);
  tl.fromTo('#ground', {opacity:0}, {opacity:1, duration:0.20}, 2.35);
  drawOn(tl, '#ground', 2.35, 0.40);
${plats.map((p,i)=>`  tl.fromTo('#plat${i}', {opacity:0}, {opacity:1, duration:0.18}, ${(2.60+i*0.16).toFixed(2)});
  drawOn(tl, '#plat${i}', ${(2.60+i*0.16).toFixed(2)}, 0.26);`).join('\n')}
${pop('#hero', 3.15, SX+90, GY-50)}
${coins.map((c,i)=>pop(`#coin${i}`, 3.42+i*0.15, c[0], c[1])).join('\n')}
  tl.fromTo('#hudTrack', {opacity:0}, {opacity:1, duration:0.25}, 3.95);
${[0,1,2].map(i=>pop(`#life${i}`, 4.05+i*0.10, SX+SW-50-i*44, HY+2)).join('\n')}

  // 4.35-7.50  it KEEPS PLAYING. Nothing on screen is ever still.
  tl.fromTo('#hudFill', {opacity:1, attr:{width:0}}, {attr:{width:234}, duration:2.6,
      ease:'none'}, 4.35);
  tl.to('#hero', {y:-46, duration:0.42, ease:'power2.out', yoyo:true, repeat:7,
      overwrite:'auto'}, 4.35);
${coins.map((c,i)=>`  tl.to('#coin${i}', {scaleX:0.15, svgOrigin:'${c[0]} ${c[1]}', duration:0.5,
      ease:'sine.inOut', yoyo:true, repeat:9, overwrite:'auto'}, ${(4.35+i*0.17).toFixed(2)});`).join('\n')}
  tl.fromTo('#cloud', {opacity:1, x:${SX+40}, y:${SY+70}}, {x:${SX+SW-180}, duration:6.0,
      ease:'none'}, 2.60);
  tl.fromTo('#attrib', {opacity:0, y:8}, {opacity:1, y:0, duration:0.4}, 4.60);
  `;
  return { markup: m, anim };
};

/* Draw the pipe at an arbitrary origin and scale, as an SVG <g> transform. The
 * wrapper's transform is STATIC and GSAP never touches it -- a CSS/SVG transform
 * and a GSAP tween must never share a property. */
const pipeAt = (sx, sy, k, sfx) => {
  const w = PIPE.stroke / k * 0.9;
  const top = `M ${PIPE.x0} ${PIPE.yTop} L ${PIPE.pinchX - 90} ${PIPE.yTop} `
            + `Q ${PIPE.pinchX} ${PIPE.yTop} ${PIPE.pinchX + 40} ${PIPE.pinchTop} L ${PIPE.x1} ${PIPE.pinchTop}`;
  const bot = `M ${PIPE.x0} ${PIPE.yBot} L ${PIPE.pinchX - 90} ${PIPE.yBot} `
            + `Q ${PIPE.pinchX} ${PIPE.yBot} ${PIPE.pinchX + 40} ${PIPE.pinchBot} L ${PIPE.x1} ${PIPE.pinchBot}`;
  return `<g transform="translate(${sx},${sy}) scale(${k})">
    ${pathEl(top, { id: `pT${sfx}`, w })}
    ${pathEl(bot, { id: `pB${sfx}`, w })}
    ${line(PIPE.x0, PIPE.yTop, PIPE.x0, PIPE.yBot, { id: `pC${sfx}`, w })}
    ${PIPE.inlets.map((x, n) => line(x, PIPE.inletY + 38, x, PIPE.yTop - 2,
        { id: `fL${sfx}${n}`, w: w * 0.75 })).join('')}
    ${PIPE.inlets.map((x, n) => inletGlyph(n, x, PIPE.inletY, `fG${sfx}${n}`)).join('')}
    ${Array.from({ length: 7 }, (_, n) => circ(0, PIPE.flowY, PIPE.dotR,
        { id: `fD${sfx}${n}`, fill: C.accent, stroke: 'none', w: 0 })).join('')}
    ${Array.from({ length: 9 }, (_, n) => circ(PIPE.pinchX - 60 - n * 34, PIPE.flowY, PIPE.dotR,
        { id: `jm${sfx}${n}`, fill: n < 3 ? C.accent : C.soft, stroke: 'none', w: 0 })).join('')}
  </g>`;
};

/* ------------------------------------------------------------------ g004 CONTRAST
 * The same object twice, changed -- never two different pictures. Left is the clean
 * one-inlet pipe; right is the SAME pipe at the SAME scale with four mismatched
 * feeds converging, which is the jam the hook never explained. Both hold together.
 */
SCENES.g004 = (part) => {
  const A = (abs) => +(abs - part.start).toFixed(3);
  const K = 0.40, LY = 300, LX = -60, RX = 900;
  let m = `<div class="page"></div><div class="grid"></div><div class="radial"></div><svg>`;
  m += line(960, 90, 960, 990, { id: 'divider', stroke: C.rule, w: 3 });
  m += pipeAt(LX, LY, K, 'L');
  m += pipeAt(RX, LY, K, 'R');
  m += `</svg>`;
  m += `<div class="lbl" id="lblL" style="left:120px;top:820px">software engineering</div>`;
  m += `<div class="lbl" id="lblR" style="left:1060px;top:820px">data analytics</div>`;
  const cues = [60.350, 62.600, 64.000, 64.760];
  const anim = `
  gsap.set(['#lblL','#lblR'], {opacity:0});
  gsap.set('[id^=fLR],[id^=fGR],[id^=jmR]', {opacity:0});
  gsap.set('[id^=fLL],[id^=fGL],[id^=jmL]', {opacity:0});
  gsap.set('[id^=pTR],[id^=pBR],[id^=pCR]', {opacity:0});
  gsap.set('#fLL0,#fGL0', {opacity:1});

  // 0.00  the divider draws DOWN FIRST, so the split exists before either side fills.
  drawOn(tl, '#divider', 0.00, 0.50, 'power2.inOut');
  // 0.50  LEFT: the clean pipe, one inlet, flowing.
  drawOn(tl, '#pTL,#pBL,#pCL', 0.50, 0.70);
  drawOn(tl, '#fLL0', 0.95, 0.30);
  tl.fromTo('#lblL', {opacity:0, y:10}, {opacity:1, y:0, duration:0.35}, 1.05);
${Array.from({length:7},(_,n)=>`  gsap.set('#fDL${n}', {attr:{cx:${PIPE.x0+40}}, opacity:0});
  tl.fromTo('#fDL${n}', {attr:{cx:${PIPE.x0+40}}, opacity:1}, {attr:{cx:${PIPE.x1}}, opacity:1,
      duration:1.35, ease:'none', repeat:6}, ${(0.85+n*0.19).toFixed(2)});`).join('\n')}
${Array.from({length:7},(_,n)=>`  gsap.set('#fDR${n}', {opacity:0});`).join('\n')}

  // ${cues[0]}  RIGHT: the SAME pipe appears at the SAME scale, on "external context".
  tl.fromTo('[id^=pTR],[id^=pBR],[id^=pCR]', {opacity:0}, {opacity:1, duration:0.25}, ${A(cues[0])});
  drawOn(tl, '#pTR,#pBR,#pCR', ${A(cues[0])}, 0.70);
  tl.fromTo('#lblR', {opacity:0, y:10}, {opacity:1, y:0, duration:0.35}, ${A(cues[0]+0.30)});
  // the four feeds arrive on their own measured cues
${cues.map((c,n)=>`  tl.fromTo('#fGR${n}', {opacity:0, scale:1.4, transformOrigin:'50% 50%'},
      {opacity:1, scale:1, duration:0.28, ease:'power4.out'}, ${A(c)});
  tl.fromTo('#fLR${n}', {opacity:0}, {opacity:1, duration:0.18}, ${A(c+0.14)});
  drawOn(tl, '#fLR${n}', ${A(c+0.14)}, 0.24, 'power4.in');`).join('\n')}
  // and the jam builds, so the right side becomes the hook's unexplained picture
${Array.from({length:9},(_,n)=>`  tl.fromTo('#jmR${n}', {opacity:0, attr:{cx:${PIPE.pinchX+40}}},
      {opacity:1, attr:{cx:${PIPE.pinchX-60-n*34}}, duration:0.40, ease:'power3.out'}, ${A(64.900+n*0.075)});`).join('\n')}
  // BOTH STATES HOLD to the end: the contrast is the frame, not a memory of it.
  tl.to('[id^=jmR]', {attr:{cx:'+=8'}, duration:0.55, ease:'sine.inOut', yoyo:true, repeat:3,
      overwrite:'auto'}, ${A(66.400)});
  `;
  return { markup: m, anim };
};

/* ---------------------------------------------------------------------- g005 LOOP
 * The four-inlet pipe bends round into a closed ring, so this is the same object
 * continuing rather than a new graphic. A ring because reverse ETL genuinely
 * returns data to the operational systems, which is what he says.
 */
SCENES.g005 = (part) => {
  const A = (abs) => +(abs - part.start).toFixed(3);
  const pts = RING_NODES.map((_, i) => ringPt(i));
  let m = `<div class="page"></div><div class="grid"></div><div class="radial"></div><svg>`;
  m += circ(RING.cx, RING.cy, RING.r, { id: 'ring', w: 10, stroke: C.muted });
  pts.forEach((p, i) => { m += circ(p.x, p.y, 30, { id: `node${i}`, w: 8, fill: C.bg }); });
  m += `<g id="orbit">${circ(RING.cx + RING.r, RING.cy, 17, { id: 'orbDot', fill: C.accent, stroke: 'none', w: 0 })}</g>`;
  m += `</svg>`;
  pts.forEach((p, i) => {
    // Push labels clear of the 30px node plus its stroke; side nodes need more
    // horizontal room than vertical because the text runs outward.
    const dx = (p.x - RING.cx) / RING.r, dy = (p.y - RING.cy) / RING.r;
    const off = 62 + Math.abs(dx) * (RING_NODES[i].length * 9);
    m += `<div class="nodeLbl" id="lbl${i}" style="left:${p.x + dx * off}px;top:${p.y + dy * off}px">${RING_NODES[i]}</div>`;
  });
  const cue = [73.340, 74.360, 75.040, 77.130, 79.210];
  const anim = `
  gsap.set('[id^=node]', {opacity:0});
  gsap.set('[id^=lbl]', {opacity:0});
  gsap.set('#orbit', {opacity:0});
  // 0.00  the circuit closes.
  drawOn(tl, '#ring', 0.00, 1.20, 'power2.inOut');
${[0,1,2,3,4].map(i=>`  tl.fromTo('#node${i}', {opacity:0, scale:0.6, transformOrigin:'${ringPt(i).x}px ${ringPt(i).y}px'},
      {opacity:1, scale:1, duration:0.30, ease:'back.out(2)'}, ${(0.55+i*0.16).toFixed(2)});
  tl.fromTo('#lbl${i}', {opacity:0}, {opacity:1, duration:0.28}, ${(0.70+i*0.16).toFixed(2)});`).join('\n')}
  // CONTINUOUS MOTION: a dot travels the circuit for the whole part and never stops.
  tl.fromTo('#orbit', {opacity:0}, {opacity:1, duration:0.3}, 1.45);
  tl.to('#orbit', {rotation:360, svgOrigin:'${RING.cx} ${RING.cy}', duration:4.2,
      ease:'none', repeat:4}, 1.45);
  // exactly ONE node is accent at a time, so the one-accent rule holds without a special case
${cue.map((c,i)=>`  tl.to('#node${i}', {stroke:'${C.accent}', strokeWidth:13, duration:0.28}, ${A(c)});
  tl.to('#lbl${i}', {color:'${C.ink}', duration:0.28}, ${A(c)});
  tl.to('#node${i}', {stroke:'${C.ink}', strokeWidth:8, duration:0.30}, ${A((cue[i+1]||80.6)-0.06)});
  tl.to('#lbl${i}', {color:'${C.muted}', duration:0.30}, ${A((cue[i+1]||80.6)-0.06)});`).join('\n')}
  // 78.210 the reverse-ETL return arc: the circuit visibly closes back on itself.
  tl.fromTo('#ring', {stroke:'${C.rule}'}, {stroke:'${C.muted}', duration:0.5}, ${A(78.210)});
  `;
  return { markup: m, anim };
};


/* ------------------------------------------------------- g006 FOUR ARRIVAL RHYTHMS
 * Merges the old 2x2 source-system grid and three identical pattern chips into ONE
 * 55.8s scene. The point is not the four names, it is that they arrive at four
 * DIFFERENT CADENCES -- which is a thing only motion can say, and which is exactly
 * the line "not every data source is the same" at 131.190.
 *
 * All four run simultaneously for the whole beat; that simultaneity IS the content,
 * and it also satisfies continuous motion without anything decorative.
 */
SCENES.g006 = (part) => {
  const A = (abs) => +(abs - part.start).toFixed(3);
  const DUR = part.end - part.start;
  const LANES = [
    { k: 'erp',  y: 250, name: 'ERP',        sub: 'change data capture',  cue: 120.960, det: 135.110 },
    { k: 'crm',  y: 420, name: 'CRM',        sub: 'daily full snapshot',  cue: 121.660, det: 152.690 },
    { k: 'ecom', y: 590, name: 'E-COMMERCE', sub: 'continuous web events',cue: 122.630, det: null    },
    { k: 'pos',  y: 760, name: 'POS',        sub: 'new sales only',       cue: 124.720, det: 167.410 },
  ];
  const X0 = 620, X1 = 1430, HUB = { x: 1620, y: 505 };
  let m = `<div class="page"></div><div class="grid"></div><div class="radial"></div><svg>`;
  LANES.forEach(L => {
    m += line(X0, L.y, X1, L.y, { id: `rail_${L.k}`, stroke: C.rule, w: 4 });
    m += pathEl(`M ${X1} ${L.y} Q ${X1 + 110} ${L.y} ${HUB.x - 34} ${HUB.y}`,
                { id: `feed_${L.k}`, stroke: C.rule, w: 4 });
  });
  m += circ(HUB.x, HUB.y, 34, { id: 'hub', w: 8, fill: C.bg });
  // ERP: a steady drip, every dot marked insert / update / delete
  for (let i = 0; i < 9; i++) {
    m += `<g id="erpG${i}">` + circ(0, 250, 15, { id: `erpD${i}`, fill: C.ink, stroke: 'none', w: 0 })
       + `</g>`;
  }
  // CRM: one big block every four seconds, with the previous one ghosted beside it
  for (let i = 0; i < 3; i++)
    m += `<rect id="crmB${i}" x="-70" y="374" width="132" height="92" rx="8" fill="none" stroke="${C.ink}" stroke-width="6"/>`;
  m += `<rect id="crmGhost" x="0" y="374" width="132" height="92" rx="8" fill="none" stroke="${C.soft}" stroke-width="6"/>`;
  // E-COMMERCE: a stream too fast to count
  for (let i = 0; i < 20; i++)
    m += circ(0, 590, 10, { id: `ecoD${i}`, fill: C.ink, stroke: 'none', w: 0 });
  // POS: irregular bursts
  for (let i = 0; i < 12; i++)
    m += circ(0, 760, 13, { id: `posD${i}`, fill: C.ink, stroke: 'none', w: 0 });
  m += `</svg>`;
  LANES.forEach(L => {
    m += `<div class="laneName" id="nm_${L.k}" style="left:170px;top:${L.y - 34}px">${L.name}</div>`;
    m += `<div class="laneSub"  id="sb_${L.k}" style="left:170px;top:${L.y + 10}px">${L.sub}</div>`;
  });
  LANES[0].glyphs = ['I','U','D'];
  for (let i = 0; i < 9; i++)
    m += `<div class="mark" id="erpM${i}" style="left:0px;top:${250 - 13}px">${['I','U','D'][i % 3]}</div>`;
  m += `<div class="lbl" id="hubLbl" style="left:1560px;top:${HUB.y + 60}px">one pipeline</div>`;

  const travel = (sel, y, dur, at, rep) =>
    `  gsap.set('${sel}', {attr:{cx:${X0}}, opacity:0});\n` +
    `  tl.fromTo('${sel}', {attr:{cx:${X0}}, opacity:1}, {attr:{cx:${X1}}, opacity:1, ` +
    `duration:${dur}, ease:'none', repeat:${rep}}, ${at});`;

  const anim = `
  gsap.set(['#hub','#hubLbl','#crmGhost'], {opacity:0});
${LANES.map(L=>`  gsap.set(['#nm_${L.k}','#sb_${L.k}'], {opacity:0});
  gsap.set('#rail_${L.k}', {opacity:0});
  gsap.set('#feed_${L.k}', {opacity:0});`).join('\n')}

  // the hub and the four rails arrive as he names each system
${LANES.map(L=>`  tl.fromTo('#rail_${L.k}', {opacity:0}, {opacity:1, duration:0.25}, ${A(L.cue)});
  drawOn(tl, '#rail_${L.k}', ${A(L.cue)}, 0.45);
  tl.fromTo('#feed_${L.k}', {opacity:0}, {opacity:1, duration:0.25}, ${A(L.cue+0.30)});
  drawOn(tl, '#feed_${L.k}', ${A(L.cue+0.30)}, 0.40);
  tl.fromTo('#nm_${L.k}', {opacity:0, x:-18}, {opacity:1, x:0, duration:0.32, ease:'power2.out'}, ${A(L.cue)});
  tl.fromTo('#sb_${L.k}', {opacity:0, x:-18}, {opacity:0.9, x:0, duration:0.32, ease:'power2.out'}, ${A(L.cue+0.18)});`).join('\n')}
  tl.fromTo('#hub', {opacity:0, scale:0.6, svgOrigin:'${HUB.x} ${HUB.y}'},
      {opacity:1, scale:1, duration:0.35, ease:'back.out(2)'}, ${A(126.400)});
  tl.fromTo('#hubLbl', {opacity:0}, {opacity:1, duration:0.35}, ${A(126.700)});

  // ---- ERP: a STEADY DRIP. One marked row every 0.42s, for the whole beat.
${Array.from({length:9},(_,i)=>{
  const at=(A(133.600)+i*0.42).toFixed(2), rep=Math.ceil((DUR-parseFloat(at))/3.8);
  return `  gsap.set('#erpD${i}', {attr:{cx:${X0}}});
  gsap.set('#erpM${i}', {opacity:0});
  tl.fromTo('#erpD${i}', {attr:{cx:${X0}}, opacity:1}, {attr:{cx:${X1}}, opacity:1, duration:3.8,
      ease:'none', repeat:${rep}}, ${at});
  tl.fromTo('#erpM${i}', {x:${X0}, opacity:1}, {x:${X1}, opacity:1, duration:3.8,
      ease:'none', repeat:${rep}}, ${at});`;}).join('\n')}

  // ---- CRM: NOTHING, then one whole snapshot lands with a thud. Every four seconds.
${Array.from({length:3},(_,i)=>{
  const at=(A(151.900)+i*4.0).toFixed(2), rep=Math.max(0,Math.ceil((DUR-parseFloat(at))/12.0)-1);
  return `  tl.fromTo('#crmB${i}', {attr:{x:${X0-70}}, opacity:1}, {attr:{x:${X1-70}}, opacity:1,
      duration:1.1, ease:'power2.in', repeat:${rep}, repeatDelay:10.9}, ${at});`;}).join('\n')}
  // the previous day's snapshot ghosts beside the new one: that overlap IS the diff
  // he describes at 162.730 ("compare today with yesterday").
  tl.fromTo('#crmGhost', {opacity:0, attr:{x:${X1-70}}}, {opacity:1, attr:{x:${X1-210}},
      duration:0.5, ease:'power2.out'}, ${A(162.730)});
  tl.to('#crmGhost', {opacity:0.45, duration:0.6, ease:'sine.inOut', yoyo:true, repeat:9,
      overwrite:'auto'}, ${A(163.400)});

  // ---- E-COMMERCE: a continuous stream, dots too close to count.
${Array.from({length:20},(_,i)=>{
  const at=(A(131.000)+i*0.115).toFixed(3), rep=Math.ceil((DUR-parseFloat(at))/2.3);
  return `  gsap.set('#ecoD${i}', {attr:{cx:${X0}}});
  tl.fromTo('#ecoD${i}', {attr:{cx:${X0}}, opacity:1}, {attr:{cx:${X1}}, opacity:1, duration:2.3,
      ease:'none', repeat:${rep}}, ${at});`;}).join('\n')}

  // ---- POS: irregular BURSTS. Three tight, then a gap, at uneven intervals.
${[0,1,2,3].flatMap((b,bi)=>[0,1,2].map(k=>{
  const at=(A(166.900)+[0,3.4,5.1,9.2][bi]+k*0.16).toFixed(2);
  const idx=bi*3+k, rep=Math.max(0,Math.ceil((DUR-parseFloat(at))/13.0)-1);
  return `  gsap.set('#posD${idx}', {attr:{cx:${X0}}});
  tl.fromTo('#posD${idx}', {attr:{cx:${X0}}, opacity:1}, {attr:{cx:${X1}}, opacity:1, duration:2.6,
      ease:'none', repeat:${rep}, repeatDelay:10.4}, ${at});`;})).join('\n')}

  // ONE accent element: whichever feed is being narrated right now.
${[['erp',131.190,151.500],['crm',151.900,166.500],['pos',166.900,173.600],['ecom',173.780,176.300]]
  .map(([k,on,off])=>`  tl.to('#nm_${k}', {color:'${C.accent}', duration:0.30}, ${A(on)});
  tl.to('#rail_${k}', {stroke:'${C.accent}', duration:0.30}, ${A(on)});
  tl.to('#nm_${k}', {color:'${C.ink}', duration:0.30}, ${A(off)});
  tl.to('#rail_${k}', {stroke:'${C.rule}', duration:0.30}, ${A(off)});`).join('\n')}
  // 173.780 "each one comes with its own quirks and caveats": all four at once.
  tl.to('#hub', {scale:1.10, svgOrigin:'${HUB.x} ${HUB.y}', duration:0.5, ease:'sine.inOut',
      yoyo:true, repeat:3, overwrite:'auto'}, ${A(173.780)});
  `;
  return { markup: m, anim };
};


/* ------------------------------------------------------ g010 THE STACK, INTO THE RING
 * The ring returns and the tools slot into the nodes they own, rather than listing
 * themselves as three rows of type. The model does NOT take a node: it stands
 * OUTSIDE the ring with three lines running to it. That geometry is the argument of
 * the whole video, made without a word of commentary, and it sets up g017.
 * Names are set in Satoshi -- assets/logos/ is empty and a redrawn mark is forbidden.
 */
SCENES.g010 = (part) => {
  const A = (abs) => +(abs - part.start).toFixed(3);
  const R2 = { cx: 760, cy: 540, r: 250 };
  const pt = (i) => { const a = (-90 + i * 72) * Math.PI / 180;
    return { x: R2.cx + R2.r * Math.cos(a), y: R2.cy + R2.r * Math.sin(a) }; };
  const FIG = { x: 1560, y: 540 };
  let m = `<div class="page"></div><div class="grid"></div><div class="radial"></div><svg>`;
  m += circ(R2.cx, R2.cy, R2.r, { id: 'ring2', w: 8, stroke: C.rule });
  [0,1,2,3,4].forEach(i => { const p = pt(i);
    m += circ(p.x, p.y, 26, { id: `n${i}`, w: 7, fill: C.bg }); });
  m += `<g id="orbit2">${circ(R2.cx + R2.r, R2.cy, 14, { id: 'orb2', fill: C.accent, stroke: 'none', w: 0 })}</g>`;
  // the model, outside the circuit
  m += `<g id="figure">`
     + circ(FIG.x, FIG.y - 92, 26, { id: 'figHead', w: 7 })
     + line(FIG.x, FIG.y - 66, FIG.x, FIG.y - 6, { id: 'figBody', w: 8 })
     + line(FIG.x, FIG.y - 6, FIG.x - 22, FIG.y + 34, { id: 'figLegA', w: 7 })
     + line(FIG.x, FIG.y - 6, FIG.x + 22, FIG.y + 34, { id: 'figLegB', w: 7 })
     + `</g>`;
  [0,1,2].forEach(i => {
    m += pathEl(`M ${R2.cx + R2.r + 30} ${R2.cy - 90 + i * 90} L ${FIG.x - 70} ${FIG.y - 40 + i * 40}`,
                { id: `wire${i}`, stroke: C.rule, w: 4 });
  });
  m += `</svg>`;
  const tools = [[2,'dbt',192.790], [3,'DuckDB',195.010]];
  tools.forEach(([n, name]) => { const p = pt(n);
    m += `<div class="toolName" id="tool${n}" style="left:${p.x}px;top:${p.y + 46}px">${name}</div>`; });
  ['the prompt','the context','the instructions'].forEach((s, i) => {
    m += `<div class="wireLbl" id="wl${i}" style="left:${R2.cx + R2.r + 60}px;top:${R2.cy - 118 + i * 90}px">${s}</div>`;
  });
  m += `<div class="lbl" id="figLbl" style="left:${FIG.x - 78}px;top:${FIG.y + 74}px">Claude Opus 5</div>`;
  const anim = `
  gsap.set(['#figure','#figLbl'], {opacity:0});
  gsap.set(['#tool2','#tool3','#wl0','#wl1','#wl2'], {opacity:0});
  gsap.set(['#wire0','#wire1','#wire2'], {opacity:0});
  // the ring is already known, so it arrives faint and fast
  tl.fromTo('#ring2', {opacity:0}, {opacity:1, duration:0.5}, 0.10);
${[0,1,2,3,4].map(i=>`  tl.fromTo('#n${i}', {opacity:0, scale:0.6, svgOrigin:'${pt(i).x} ${pt(i).y}'},
      {opacity:1, scale:1, duration:0.26, ease:'back.out(2)'}, ${(0.30+i*0.10).toFixed(2)});`).join('\n')}
  // CONTINUOUS MOTION: the dot keeps travelling for the whole 21.5s.
  tl.to('#orbit2', {rotation:360, svgOrigin:'${R2.cx} ${R2.cy}', duration:5.0, ease:'none',
      repeat:5}, 0.60);
  // the tools SLOT INTO the nodes they own, on their measured cues
${tools.map(([n,name,cue])=>`  tl.to('#n${n}', {stroke:'${C.ink}', strokeWidth:11, duration:0.30}, ${A(cue)});
  tl.fromTo('#tool${n}', {opacity:0, y:-14}, {opacity:1, y:0, duration:0.34, ease:'back.out(2)'}, ${A(cue)});`).join('\n')}
  // the model enters OUTSIDE the ring and is wired in, never given a node
${[['wire0','wl0',200.630],['wire1','wl1',201.910],['wire2','wl2',203.830]].map(([w,l,c])=>`  tl.fromTo('#${w}', {opacity:0}, {opacity:1, duration:0.2}, ${A(c)});
  drawOn(tl, '#${w}', ${A(c)}, 0.40);
  tl.fromTo('#${l}', {opacity:0, x:-12}, {opacity:0.95, x:0, duration:0.32}, ${A(c+0.15)});`).join('\n')}
  tl.fromTo('#figure', {opacity:0, x:40}, {opacity:1, x:0, duration:0.45, ease:'power3.out'}, ${A(207.150)});
  tl.fromTo('#figLbl', {opacity:0}, {opacity:1, duration:0.35}, ${A(207.500)});
  // 210.390 "cloud builds the reusable environment" -- the figure is the one accent
  tl.to(['#figHead','#figBody','#figLegA','#figLegB'], {stroke:'${C.accent}', duration:0.35}, ${A(210.390)});
  tl.to('#figLbl', {color:'${C.accent}', duration:0.35}, ${A(210.390)});
  `;
  return { markup: m, anim };
};

/* ------------------------------------------------------------------ g014 TEN RUNS
 * He says he ran ten iterations and each had variance, and the VARIANCE is the
 * content -- a 220px "10" counting up says the number and hides the finding. Ten
 * miniature rings resolve one at a time, a different node failing on every run,
 * and then one accent line threads the node that never failed: the common thread,
 * drawn literally.
 */
SCENES.g014 = (part) => {
  const A = (abs) => +(abs - part.start).toFixed(3);
  const COLS = 5, R = 78, X0 = 400, Y0 = 380, DX = 290, DY = 330;
  // Deterministic, not random: the same frame must render identically on every seek.
  const FAIL = [1, 3, 2, 4, 1, 3, 4, 2, 3, 1];      // which node fails on each run
  const cell = (i) => ({ x: X0 + (i % COLS) * DX, y: Y0 + Math.floor(i / COLS) * DY });
  const npt = (c, n) => { const a = (-90 + n * 72) * Math.PI / 180;
    return { x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) }; };
  let m = `<div class="page"></div><div class="grid"></div><div class="radial"></div><svg>`;
  for (let i = 0; i < 10; i++) {
    const c = cell(i);
    m += circ(c.x, c.y, R, { id: `mr${i}`, w: 5, stroke: C.rule });
    for (let n = 0; n < 5; n++) {
      const p = npt(c, n);
      m += circ(p.x, p.y, 13, { id: `mn${i}_${n}`, w: 4, fill: C.bg });
      m += pathEl(`M ${p.x-7} ${p.y} L ${p.x-2} ${p.y+6} L ${p.x+8} ${p.y-6}`,
                  { id: `tick${i}_${n}`, w: 4, stroke: C.muted });
      m += pathEl(`M ${p.x-6} ${p.y-6} L ${p.x+6} ${p.y+6} M ${p.x+6} ${p.y-6} L ${p.x-6} ${p.y+6}`,
                  { id: `cross${i}_${n}`, w: 4, stroke: C.accent });
    }
  }
  // the common thread: node 0 is ticked on every single run
  const th = Array.from({ length: 10 }, (_, i) => { const p = npt(cell(i), 0); return `${p.x} ${p.y}`; });
  m += pathEl(`M ${th.slice(0,5).join(' L ')}`, { id: 'thread0', stroke: C.accent, w: 6 });
  m += pathEl(`M ${th.slice(5).join(' L ')}`,   { id: 'thread1', stroke: C.accent, w: 6 });
  m += `</svg>`;
  m += `<div class="lbl" id="threadLbl" style="left:400px;top:940px">the one thing it never got wrong</div>`;
  const anim = `
  gsap.set('[id^=tick],[id^=cross]', {opacity:0});
  gsap.set(['#thread0','#thread1','#threadLbl'], {opacity:0});
${Array.from({length:10},(_,i)=>`  gsap.set(['#mr${i}'].concat(${JSON.stringify([0,1,2,3,4].map(n=>`#mn${i}_${n}`))}), {opacity:0});`).join('\n')}

  // 478.070  ten runs draw in, 0.22s apart.
${Array.from({length:10},(_,i)=>`  tl.fromTo('#mr${i}', {opacity:0, scale:0.7, svgOrigin:'${cell(i).x} ${cell(i).y}'},
      {opacity:1, scale:1, duration:0.30, ease:'back.out(1.8)'}, ${(A(478.070)+i*0.22).toFixed(2)});
${[0,1,2,3,4].map(n=>`  tl.fromTo('#mn${i}_${n}', {opacity:0}, {opacity:1, duration:0.22}, ${(A(478.070)+i*0.22+0.14+n*0.03).toFixed(2)});`).join('\n')}`).join('\n')}

  // 485.05-490.52  each run RESOLVES: mostly ticks, and a different node crossed
  // every time. That is "brilliant each time" and "stupid each time".
${Array.from({length:10},(_,i)=>[0,1,2,3,4].map(n=>{
  const at=(A(485.050)+i*0.50+n*0.05).toFixed(2);
  return n===FAIL[i]
    ? `  tl.fromTo('#cross${i}_${n}', {opacity:0, scale:1.6, svgOrigin:'${npt(cell(i),n).x} ${npt(cell(i),n).y}'}, {opacity:1, scale:1, duration:0.26, ease:'power3.out'}, ${at});`
    : `  tl.fromTo('#tick${i}_${n}', {opacity:0}, {opacity:1, duration:0.24}, ${at});`;
}).join('\n')).join('\n')}

  // 491.600  "there was a common thread" -- drawn as an actual thread.
  tl.fromTo('#thread0', {opacity:0}, {opacity:1, duration:0.2}, ${A(491.600)});
  drawOn(tl, '#thread0', ${A(491.600)}, 0.55, 'power2.inOut');
  tl.fromTo('#thread1', {opacity:0}, {opacity:1, duration:0.2}, ${A(492.000)});
  drawOn(tl, '#thread1', ${A(492.000)}, 0.55, 'power2.inOut');
  tl.fromTo('#threadLbl', {opacity:0, y:10}, {opacity:1, y:0, duration:0.35}, ${A(492.100)});
  `;
  return { markup: m, anim };
};


/* --------------------------------------------------------------- g012 / g013 CHIPS
 * Small labels over the demo screen recording. A part sitting over a screen
 * recording goes OPAQUE regardless of measured luma: mean luma cannot see detail
 * density, and at 92% a dark terminal full of bright text ghosts straight through.
 */
const demoChip = (kicker, title, sub, dur) => () => {
  const X = 96, Y = 96, W = 720, H = 190;
  let m = `<div class="chipOpaque" id="chip" style="left:${X}px;top:${Y}px;width:${W}px;height:${H}px"></div>`;
  m += `<svg>${line(X, Y, X, Y + H, { id: 'chipBar', stroke: C.accent, w: 8 })}</svg>`;
  m += `<div class="chipKick" id="k" style="left:${X + 32}px;top:${Y + 30}px">${kicker}</div>`;
  m += `<div class="chipName" id="n" style="left:${X + 32}px;top:${Y + 70}px">${title}</div>`;
  m += `<div class="chipRole" id="s" style="left:${X + 32}px;top:${Y + 126}px">${sub}</div>`;
  const anim = `
  gsap.set(['#k','#n','#s','#chipBar'], {opacity:0});
  tl.fromTo('#chip', {clipPath:'inset(0 100% 0 0)'}, {clipPath:'inset(0 0% 0 0)',
      duration:0.38, ease:'power3.out'}, 0.10);
  tl.fromTo('#k', {opacity:0, y:8}, {opacity:0.85, y:0, duration:0.28}, 0.36);
  tl.fromTo('#n', {opacity:0, y:10}, {opacity:1, y:0, duration:0.30}, 0.46);
  tl.fromTo('#s', {opacity:0, y:10}, {opacity:0.75, y:0, duration:0.30}, 0.58);
  tl.fromTo('#chipBar', {opacity:0}, {opacity:1, duration:0.2}, 0.72);
  drawOn(tl, '#chipBar', 0.72, 0.30);
  tl.to(['#k','#n','#s','#chipBar'], {opacity:0, duration:0.25}, ${(dur - 0.50).toFixed(2)});
  tl.to('#chip', {clipPath:'inset(0 100% 0 0)', duration:0.30, ease:'power3.in'}, ${(dur - 0.35).toFixed(2)});
  `;
  return { markup: m, anim };
};
SCENES.g012 = demoChip('LIVE DEMO', 'The state of the project', 'asking Claude what already exists', 7.0);
SCENES.g013 = demoChip('THE CONTEXT LAYER', 'conventions.md', 'the business rules, written down', 7.0);

/* ------------------------------------------------------------- g015 STRIKE-LIST
 * The absence beat and the payoff. This is the ONE picture-in-picture entry in the
 * video: FFmpeg reframes his face into the PiP box and this layer renders with alpha
 * beside it. Four rows land and STAY; five land and are STRUCK -- the strike is the
 * content, the rows arrive in order to be crossed out.
 */
SCENES.g015 = (part) => {
  const A = (abs) => +(abs - part.start).toFixed(3);
  const X = 856, W = 950;
  const KEEP = [['the business rules', 494.190], ['the naming standards', 505.790],
                ['past mistakes, out of JIRA', 507.750], ['a markdown file, or MCP', 512.390]];
  const GONE = [['tribal knowledge', 525.970], ['what will not fit in a markdown file', 528.750],
                ['knowing when it will hallucinate', 535.560], ['answering what it cannot', 544.020],
                ['years of debugging, pipeline after pipeline', 553.310]];
  let yy = 150;
  let m = `<div class="hdr" id="hdrKeep" style="left:${X}px;top:${yy}px">CAN HAND OVER</div>`;
  m += `<svg>${line(X, yy + 44, X + 300, yy + 44, { id: 'hdrRule', stroke: C.accent, w: 5 })}`;
  m += line(X - 34, 226, X - 34, 226, { id: 'spine', stroke: C.accent, w: 5 });
  const rows = [];
  yy = 226;
  KEEP.forEach((r, i) => { rows.push({ id: `k${i}`, y: yy, cue: r[1], strike: false }); yy += 74; });
  const divY = yy + 22;
  m += line(X, divY, X + W, divY, { id: 'divider', stroke: C.rule, w: 3 });
  yy = divY + 76;
  GONE.forEach((r, i) => { rows.push({ id: `g${i}`, y: yy, cue: r[1], strike: true }); yy += 74; });
  rows.forEach(r => { m += line(X - 8, r.y + 30, X + 40, r.y + 30,
      { id: `st_${r.id}`, stroke: r.strike ? C.muted : C.muted, w: r.strike ? 5 : 0 }); });
  m += `</svg>`;
  m += `<div class="hdr" id="hdrGone" style="left:${X}px;top:${divY + 18}px">CANNOT</div>`;
  KEEP.forEach((r, i) => { const row = rows[i];
    m += `<div class="row" id="k${i}" style="left:${X}px;top:${row.y}px">${r[0]}</div>`;
    m += `<div class="tickMark" id="tk${i}" style="left:${X + W - 40}px;top:${row.y}px">&#10003;</div>`; });
  GONE.forEach((r, i) => { const row = rows[4 + i];
    m += `<div class="row rowGone" id="g${i}" style="left:${X}px;top:${row.y}px">${r[0]}</div>`; });

  const anim = `
  gsap.set(['#hdrKeep','#hdrGone','#hdrRule','#divider'], {opacity:0});
  gsap.set(${JSON.stringify(KEEP.map((_,i)=>`#k${i}`).concat(KEEP.map((_,i)=>`#tk${i}`),
            GONE.map((_,i)=>`#g${i}`)))}, {opacity:0});
  gsap.set('[id^=st_]', {opacity:0});

  tl.fromTo('#hdrKeep', {opacity:0, y:10}, {opacity:1, y:0, duration:0.35}, ${A(492.417)});
  tl.fromTo('#hdrRule', {opacity:0}, {opacity:1, duration:0.2}, ${A(492.600)});
  drawOn(tl, '#hdrRule', ${A(492.600)}, 0.40);   // the ONE accent element for the stack

  // four rows land on their own cues and STAY.
${KEEP.map((r,i)=>`  tl.fromTo('#k${i}', {opacity:0, clipPath:'inset(100% 0 0 0)'},
      {opacity:1, clipPath:'inset(0% 0 0 0)', duration:0.35, ease:'power3.out'}, ${A(r[1])});
  tl.fromTo('#tk${i}', {opacity:0, scale:0.5, transformOrigin:'50% 50%'},
      {opacity:0.8, scale:1, duration:0.28, ease:'back.out(2)'}, ${A(r[1]+0.30)});`).join('\n')}

  // 519.460  the divider, and the turn.
  tl.fromTo('#divider', {opacity:0}, {opacity:1, duration:0.2}, ${A(519.460)});
  drawOn(tl, '#divider', ${A(519.460)}, 0.60);
  tl.fromTo('#hdrGone', {opacity:0, y:10}, {opacity:1, y:0, duration:0.35}, ${A(519.900)});

  // five rows land the same way, and a strike DRAWS through each 0.3s after it lands.
${GONE.map((r,i)=>`  tl.fromTo('#g${i}', {opacity:0, clipPath:'inset(100% 0 0 0)'},
      {opacity:1, clipPath:'inset(0% 0 0 0)', duration:0.35, ease:'power3.out'}, ${A(r[1])});
  tl.fromTo('#st_g${i}', {opacity:0}, {opacity:1, duration:0.18}, ${A(r[1]+0.30)});
  tl.to('#st_g${i}', {attr:{x2:function(){var e=document.querySelector('#g${i}').getBoundingClientRect(),
      s=document.getElementById('stage').getBoundingClientRect();
      return (e.right-s.left)/SCALE_K + 14;}}, duration:0.38, ease:'power2.inOut'}, ${A(r[1]+0.30)});
  tl.to('#g${i}', {opacity:0.5, duration:0.35}, ${A(r[1]+0.55)});`).join('\n')}

  // 553.31 onward: an accent SPINE grows down the left edge into the verdict, so
  // the last 8s of a 69s graphic is never a frozen frame. It runs beside the rows,
  // never across them.
  tl.fromTo('#spine', {attr:{y2:226}}, {attr:{y2:${yy - 30}}, duration:6.6, ease:'none'},
      ${A(553.310)});
  `;
  return { markup: m, anim };
};

/* ------------------------------------------------------------------ g017 VERDICT
 * The object closes. The ring returns still blocked, exactly as g010 left it, and
 * the figure who stood OUTSIDE it walks in and clears the jam on the spoken cue.
 * The type is a caption on that, not the graphic itself.
 */
SCENES.g017 = (part) => {
  const A = (abs) => +(abs - part.start).toFixed(3);
  const R2 = { cx: 1180, cy: 470, r: 240 };
  const pt = (i) => { const a = (-90 + i * 72) * Math.PI / 180;
    return { x: R2.cx + R2.r * Math.cos(a), y: R2.cy + R2.r * Math.sin(a) }; };
  let m = `<div class="page"></div><div class="grid"></div><div class="radial"></div><svg>`;
  m += circ(R2.cx, R2.cy, R2.r, { id: 'ring3', w: 8, stroke: C.muted });
  [0,1,2,3,4].forEach(i => { const p = pt(i); m += circ(p.x, p.y, 26, { id: `v${i}`, w: 7, fill: C.bg }); });
  // the blockage at INGEST, the picture the hook and g004 both left unresolved
  for (let i = 0; i < 6; i++)
    m += circ(R2.cx - 96 + i * 32, R2.cy - R2.r, 13,
              { id: `blk${i}`, fill: i < 2 ? C.accent : C.soft, stroke: 'none', w: 0 });
  m += `<g id="orbit3">${circ(R2.cx + R2.r, R2.cy, 15, { id: 'orb3', fill: C.accent, stroke: 'none', w: 0 })}</g>`;
  m += `<g id="fig3">`
     + circ(1760, 470 - 92, 26, { id: 'f3h', w: 7 })
     + line(1760, 470 - 66, 1760, 470 - 6, { id: 'f3b', w: 8 })
     + line(1760, 470 - 6, 1738, 470 + 34, { id: 'f3la', w: 7 })
     + line(1760, 470 - 6, 1782, 470 + 34, { id: 'f3lb', w: 7 })
     + `</g></svg>`;
  m += `<div class="eyebrow" id="vKick" style="left:150px;top:700px">is AI replacing data engineering?</div>`;
  m += `<div class="verdict" id="vAns" style="left:150px;top:748px">Not yet<span id="vDot">.</span></div>`;
  const anim = `
  gsap.set(['#vKick','#vAns'], {opacity:0});
  gsap.set('#orbit3', {opacity:0});
  // the ring arrives ALREADY blocked -- it is the picture the hook never resolved
  tl.fromTo('#ring3', {opacity:0}, {opacity:1, duration:0.4}, 0.05);
${[0,1,2,3,4].map(i=>`  tl.fromTo('#v${i}', {opacity:0}, {opacity:1, duration:0.25}, ${(0.15+i*0.05).toFixed(2)});`).join('\n')}
${Array.from({length:6},(_,i)=>`  tl.fromTo('#blk${i}', {opacity:0}, {opacity:1, duration:0.22}, ${(0.30+i*0.05).toFixed(2)});`).join('\n')}
  tl.fromTo('#fig3', {opacity:0, x:60}, {opacity:1, x:0, duration:0.45, ease:'power3.out'}, 0.30);
  tl.fromTo('#vKick', {opacity:0, y:10}, {opacity:1, y:0, duration:0.35}, ${A(561.700)});

  // 561.520  the figure walks to the blockage.
  tl.to('#fig3', {x:-380, duration:1.60, ease:'power2.inOut'}, ${A(561.520)});
  // 563.600  it clears, and the flow starts and never stops.
${Array.from({length:6},(_,i)=>`  tl.to('#blk${i}', {opacity:0, attr:{cy:${R2.cy - R2.r - 40}}, duration:0.40,
      ease:'power2.out'}, ${(A(563.600)+i*0.045).toFixed(3)});`).join('\n')}
  tl.fromTo('#orbit3', {opacity:0}, {opacity:1, duration:0.3}, ${A(563.700)});
  tl.to('#orbit3', {rotation:720, svgOrigin:'${R2.cx} ${R2.cy}', duration:5.4, ease:'none'}, ${A(563.700)});
  // the type LANDS on the cue, never before it.
  tl.fromTo('#vAns', {opacity:0, clipPath:'inset(100% 0 0 0)'},
      {opacity:1, clipPath:'inset(0% 0 0 0)', duration:0.50, ease:'power3.out'}, ${A(563.600)});
  `;
  return { markup: m, anim };
};

/* ----------------------------------------------------------------- g018 END CARD
 * Type IS the content for an end card, so this stays a card rather than a drawn
 * scene. But it sits in the MEASURED clear zone, not where the old plan put it:
 * the previous box (x150-1150, y600-880) measured detail 67.2 across this window,
 * which is his face. That is the same mistake the verdict card made in the shipped
 * video, and it survived into this build because the end card was never re-zoned.
 *
 * The speaker stays on camera full frame (tech-video-editor outro spec), the type
 * stays off his face (style.json heroTypeNeverCoversFace), and the right 40% stays
 * genuinely empty for YouTube's end-screen cards. On this framing all three can
 * only hold together at a smaller type size -- which is the 50mm recording defect
 * showing up one last time, not a design choice.
 */
SCENES.g018 = () => {
  const z = zones.zones.secondary;                    // measured: x0-420, y420-780
  const X = z.x[0] + 36, Y = z.y[0] + 10;
  const W = (z.x[1] - z.x[0]) - 56, H = (z.y[1] - z.y[0]) - 20;
  let m = `<div class="endPanel" id="ep" style="left:${X}px;top:${Y}px;width:${W}px;height:${H}px"></div>`;
  m += `<svg>`;
  m += line(X, Y, X, Y + H, { id: 'endSpine', stroke: C.accent, w: 6 });
  m += line(X + 26, Y + 214, X + 26, Y + 214, { id: 'endRule', stroke: C.accent, w: 5 });
  m += circ(X, Y, 9, { id: 'endDot', fill: C.accent, stroke: 'none', w: 0 });
  m += `</svg>`;
  m += `<div class="endHead" id="eh" style="left:${X + 26}px;top:${Y + 40}px;width:${W - 52}px">What's been your experience?</div>`;
  m += `<div class="endSub"  id="es" style="left:${X + 26}px;top:${Y + 238}px">Tell me in the comments</div>`;
  m += `<div class="endHandle" id="ehn" style="left:${X + 26}px;top:${Y + 284}px">@srnudurupati</div>`;
  const anim = `
  gsap.set(['#eh','#es','#ehn','#endRule','#endDot'], {opacity:0});
  tl.fromTo('#ep', {clipPath:'inset(0 100% 0 0)'}, {clipPath:'inset(0 0% 0 0)',
      duration:0.42, ease:'power3.out'}, 0.05);
  tl.fromTo('#endSpine', {opacity:0}, {opacity:1, duration:0.2}, 0.10);
  drawOn(tl, '#endSpine', 0.10, 0.45);
  tl.fromTo('#eh', {opacity:0, y:12}, {opacity:1, y:0, duration:0.42, ease:'power3.out'}, 0.34);
  tl.fromTo('#endRule', {opacity:0}, {opacity:1, duration:0.2}, 0.78);
  tl.fromTo('#endRule', {attr:{y2:${Y + 214}}}, {attr:{y2:${Y + 214}}, duration:0.01}, 0.78);
  tl.to('#endRule', {attr:{x2:${X + 26 + 180}}, duration:0.45, ease:'power2.out'}, 0.78);
  tl.fromTo('#es',  {opacity:0, y:10}, {opacity:0.85, y:0, duration:0.32}, 1.00);
  tl.fromTo('#ehn', {opacity:0, y:10}, {opacity:0.95, y:0, duration:0.32}, 1.18);
  // continuous motion to the last frame: an accent dot runs down the spine. The
  // video ends under this card, so there is no exit.
  tl.fromTo('#endDot', {opacity:0}, {opacity:1, duration:0.25}, 0.55);
  tl.fromTo('#endDot', {attr:{cy:${Y}}}, {attr:{cy:${Y + H}}, duration:2.1, ease:'sine.inOut',
      yoyo:true, repeat:1}, 0.60);
  `;
  return { markup: m, anim };
};

// ============================================================ EMIT
const partsDir = path.join(HERE, 'parts');

// Write / copy ONLY when the bytes change: render.sh re-renders a part whenever any
// file in its folder is newer than its render, and rewriting every file on every
// build made every part stale (the 04-lightweight-ontology finding, 2026-09-23).
const writeIfChanged = (p, s) => {
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === s) return false;
  fs.writeFileSync(p, s); return true;
};
const copyIfChanged = (a, b) => {
  if (fs.existsSync(b) && fs.readFileSync(a).equals(fs.readFileSync(b))) return false;
  fs.copyFileSync(a, b); return true;
};
let unchanged = 0;

function emit(part) {
  const scene = SCENES[part.id];
  if (!scene) return false;
  const { markup, anim } = scene(part);
  const dur = +(part.end - part.start).toFixed(3);
  const dir = path.join(partsDir, part.id);
  fs.mkdirSync(path.join(dir, 'assets', 'fonts'), { recursive: true });

  // Fonts and gsap must live INSIDE the project root: the renderer serves the
  // project directory as its web root, so a path climbing out of it is never
  // fetched and the browser silently falls back to a system font.
  let changed = false;
  for (const f of ['Satoshi-Black.otf', 'Satoshi-Bold.otf', 'Satoshi-Medium.otf'])
    changed = copyIfChanged(path.join(HERE, 'vendor', 'fonts', f), path.join(dir, 'assets', 'fonts', f)) || changed;
  changed = copyIfChanged(path.join(HERE, 'vendor', 'gsap.min.js'), path.join(dir, 'assets', 'gsap.min.js')) || changed;

  const isOverlay = part.class === 'overlay' || part.alpha === true;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${CANVAS_W * SCALE}, height=${CANVAS_H * SCALE}" />
<title>job1 ${part.id} ${part.scene}</title>
<script src="assets/gsap.min.js"></script>
<style>${css()}${isOverlay ? '\n.page{display:none}.grid{display:none}.radial{display:none}' : ''}</style>
</head>
<body>
<!-- Composition declared at DELIVERY size with the canvas on a statically scaled
     stage. --resolution is rejected for alpha formats, so the DPR shortcut is
     unavailable and the scale has to live in CSS. GSAP never touches this
     transform: a CSS transform and a GSAP tween must not share a property. -->
<div id="root" data-composition-id="${part.id}" data-start="0" data-duration="${dur}"
     data-width="${CANVAS_W * SCALE}" data-height="${CANVAS_H * SCALE}">
  <div id="stage">
${markup}
  </div>
</div>
<script>
${RUNTIME}
// ONE master timeline, created PAUSED. Compositions are seeked, not played.
var tl = gsap.timeline({paused: true});
${anim}
window.__timelines = window.__timelines || {};
window.__timelines["${part.id}"] = tl;
</script>
</body>
</html>`;
  changed = writeIfChanged(path.join(dir, 'index.html'), html) || changed;
  changed = writeIfChanged(path.join(dir, 'hyperframes.json'), JSON.stringify({
    $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
    paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
  }, null, 2)) || changed;
  if (!changed) unchanged++;
  return true;
}

const VARIANTS = [];
let built = 0, skipped = [];
for (const p of [...cut.parts, ...VARIANTS]) {
  const before = unchanged;
  if (emit(p)) { built++; console.log(`  ${unchanged > before ? 'unchanged' : 'emit     '} ${p.id}  ${p.scene.padEnd(20)} ${(p.end-p.start).toFixed(2)}s`); }
  else skipped.push(p.id);
}
console.log(`\nbuilt ${built} part(s)`);
if (skipped.length) console.log(`not yet written: ${skipped.join(', ')}`);
