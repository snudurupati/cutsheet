// Comparison sheet for the jar-with-limbs redesign (human 2026-09-29: "the jar with arms just
// looks ugly and it's used multiple places"). Four columns: the CURRENT drawing and three
// options, each at hero size (g01's 0.62) and as a row of four at swarm size (g02/g11/gB ~0.25),
// where the small row uses a clean ICON version (no bolts, liquid or highlights, heavier strokes).
// Static: one frame, rendered with `hyperframes snapshot`. Not part of the cut sheet.
import { emit, C, brainInJar, BRAIN_SIMPLE } from "./lib.mjs";

const S = (w) => `fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const JAR_BODY = "M90,72 C50,88 34,122 34,172 L34,318 C34,354 60,376 98,376 L222,376 C260,376 286,354 286,318 L286,172 C286,122 270,88 230,72";
const LID = "M66,6 L254,6 C262,6 268,12 268,20 L268,34 C268,42 262,48 254,48 L66,48 C58,48 52,42 52,34 L52,20 C52,12 58,6 66,6 Z";

// ---- arms that ATTACH at the jar's shoulders: upper arm, elbow, forearm, two-finger gripper
const arms = (w) => {
  const one = (m) => `<g transform="${m}">
    <path d="M36,196 C8,206 -14,228 -18,262" ${S(w)}/>
    <circle cx="-18" cy="262" r="${w * 1.6}" fill="currentColor"/>
    <path d="M-18,262 C-20,292 -12,318 2,336" ${S(w)}/>
    <path d="M2,336 C-8,344 -10,356 -6,364 M2,336 C14,340 20,350 18,360" ${S(w)}/></g>`;
  return one("") + one("translate(320,0) scale(-1,1)");
};
// ---- a name band across the glass
const band = (w, name, fs) => `<rect x="58" y="266" width="204" height="58" rx="12" fill="${C.bg}" stroke="currentColor" stroke-width="${w}"/>
  <text x="160" y="${295 + fs * 0.35}" text-anchor="middle" font-family="SatoshiBold" font-size="${fs}" fill="currentColor">${name}</text>`;
// ---- the jar as a robot's head: collar, body, arms from the body, wheeled base
const robot = (w) => `
  <rect x="112" y="376" width="96" height="18" rx="6" ${S(w)}/>
  <rect x="72" y="394" width="176" height="96" rx="22" fill="${C.bg}" stroke="currentColor" stroke-width="${w}"/>
  <circle cx="118" cy="428" r="${w * 1.8}" fill="currentColor"/><path d="M142,420 L200,420 M142,440 L186,440" ${S(w * 0.8)}/>
  <path d="M72,412 C44,418 26,436 24,462 L30,494 M30,494 C22,500 20,510 24,516 M30,494 C40,498 44,506 42,514" ${S(w)}/>
  <path d="M248,412 C276,418 294,436 296,462 L290,494 M290,494 C298,500 300,510 296,516 M290,494 C280,498 276,506 278,514" ${S(w)}/>
  <path d="M96,490 L96,506 M224,490 L224,506" ${S(w)}/>
  <circle cx="96" cy="520" r="20" fill="${C.bg}" stroke="currentColor" stroke-width="${w}"/>
  <circle cx="224" cy="520" r="20" fill="${C.bg}" stroke="currentColor" stroke-width="${w}"/>`;

// hero: the library jar (bolts, liquid, highlights) + the simple brain, plus the option's extra
const hero = (id, extra) => `<div style="position:relative;width:320px;height:560px;color:${C.ink}">
  <div style="position:absolute;left:0;top:0">${brainInJar(id, 0, 0, 1, false)}</div>
  <svg viewBox="0 0 320 560" width="320" height="560" style="position:absolute;left:0;top:0;overflow:visible">${extra}</svg></div>`;
// icon: lid + glass + a clean brain, heavy strokes so it survives at 1/4 size
const icon = (extra) => `<svg viewBox="-40 0 400 560" width="400" height="560" style="overflow:visible;color:${C.ink}">
  <path d="${LID}" ${S(10)}/><path d="M90,48 L90,72 M230,48 L230,72" ${S(9)}/><path d="${JAR_BODY}" ${S(10)}/>
  <g transform="translate(46,108) scale(0.88)">
    <path d="M30,138 C12,126 8,98 24,78 C14,54 38,30 66,34 C76,14 112,8 130,26 C150,10 188,16 198,42 C224,48 236,76 220,98 C232,116 224,142 202,150 C196,166 172,174 152,166 C146,180 120,184 106,172 C84,182 52,176 44,158 C34,158 30,148 30,138 Z" ${S(10)}/>
    <path d="M130,28 C124,60 136,92 128,124 C122,146 128,160 126,172" ${S(8)}/></g>
  ${extra}</svg>`;

const COLS = [
  ["Now", "jar + floating stick limbs",
   `<div style="position:relative;width:320px;height:560px;color:${C.ink}">${brainInJar("cur", 0, 0, 1, true)}</div>`,
   k => `<div style="position:relative;width:400px;height:560px;color:${C.ink}">${brainInJar("cs" + k, 40, 0, 1, true)}</div>`],
  ["1  Proper arms", "attached at the shoulders, elbow, gripper",
   hero("h1", arms(3.5)), k => icon(arms(10))],
  ["2  Name band", "no arms; the band names the agent",
   hero("h2", band(3.5, "ERP", 34)), k => icon(band(9, ["ERP", "ECOM", "CRM", "POS"][k], 48))],
  ["3  Robot body", "the jar is the head; arms and wheels",
   hero("h3", robot(3.5)), k => icon(robot(10))],
];
const body = `
<div style="position:absolute;inset:0;background:${C.bg}"></div>
${COLS.map(([t, sub, h, small], c) => `
<div style="position:absolute;left:${40 + c * 470}px;top:30px;width:450px;height:1020px">
  <div class="disp" style="position:absolute;left:0;top:0;font-size:38px;font-variation-settings:'wght' 800">${t}</div>
  <div class="capt" style="position:absolute;left:0;top:50px;font-size:22px;color:${C.muted}">${sub}</div>
  <div style="position:absolute;left:40px;top:110px;transform:scale(0.62);transform-origin:top left">${h}</div>
  <div class="capt" style="position:absolute;left:0;top:470px;font-size:20px;color:${C.muted}">hero size (opening card)</div>
  <div style="position:absolute;left:0;top:${c === 0 ? 520 : 520}px;width:450px;height:180px">
    ${[0, 1, 2, 3].map(k => `<div style="position:absolute;left:${k * 110}px;top:0;transform:scale(0.25);transform-origin:top left">${small(k)}</div>`).join("")}
  </div>
  <div class="capt" style="position:absolute;left:0;top:680px;font-size:20px;color:${C.muted}">swarm size x4 (hook scene, message diagram, aha)</div>
  <div style="position:absolute;left:0;top:730px;width:450px;height:200px">
    ${[0, 1].map(k => `<div style="position:absolute;left:${40 + k * 170}px;top:0;transform:scale(0.16);transform-origin:top left">${small(k + 2)}</div>`).join("")}
  </div>
  <div class="capt" style="position:absolute;left:0;top:840px;font-size:20px;color:${C.muted}">smallest (use-case list icons)</div>
</div>`).join("")}
<style>.dr{stroke-dashoffset:0 !important}</style>`;
emit("mockjars", 1, body, "");
