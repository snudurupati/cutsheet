// Shared CSS + helpers for every part. One place, so a brand change is one edit.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve brand.md from this file, not from the shell's cwd, so the build works
// wherever it is invoked from.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

export { ROOT, HERE };
export const BRAND = JSON.parse(
  fs.readFileSync(path.join(ROOT, "brand.md"), "utf8").match(/```json\n([\s\S]*?)\n```/)[1]
);
export const C = BRAND.colors;

// Panel treatments straight out of style.json panelContrast, keyed by the measurement.
export const PANEL = {
  light:           { fill: C.bg,  op: 0.92, border: 1, text: C.ink, muted: C.muted, shadow: false },
  lightReinforced: { fill: C.bg,  op: 0.92, border: 2, text: C.ink, muted: C.muted, shadow: true  },
  inverted:        { fill: C.ink, op: 0.92, border: 1, text: C.bg,  muted: "#A79E92", shadow: false },
};

const hexToRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
// `screenBacked` parts go opaque. The panelContrast table keys on MEAN LUMA alone, and
// a 55-luma terminal packed with bright syntax-coloured text is the same number as a
// 55-luma navy shirt while wanting the opposite treatment: at 8% pass-through the
// terminal's text ghosts straight through the card, and the 28px $muted sub-line
// becomes the lowest-contrast element in the video. Mean luma cannot see detail
// density, so the fix keys on what is behind the part instead.
export const panelCss = (t, screenBacked = false) => {
  const p = PANEL[t], [r, g, b] = hexToRgb(p.fill);
  const op = screenBacked ? 1 : p.op;
  return `background:rgba(${r},${g},${b},${op});border:${p.border}px solid ${
    t === "inverted" ? "rgba(247,245,241,0.18)" : C.rule
  };${p.shadow || screenBacked ? "box-shadow:0 6px 28px rgba(0,0,0,0.28);" : ""}`;
};
export const ink   = (t) => PANEL[t].text;
export const muted = (t) => PANEL[t].muted;

// Static cuts, not the variable axis: brand.md keeps them beside the variable file
// exactly so a headless render never has to load a variable font.
export const css = (t, sb = false) => `
@font-face{font-family:Satoshi;src:url('assets/Satoshi-Regular.woff2') format('woff2');font-weight:400;font-display:block}
@font-face{font-family:Satoshi;src:url('assets/Satoshi-Medium.woff2')  format('woff2');font-weight:500;font-display:block}
@font-face{font-family:Satoshi;src:url('assets/Satoshi-Bold.woff2')    format('woff2');font-weight:700;font-display:block}
@font-face{font-family:Satoshi;src:url('assets/Satoshi-Black.woff2')   format('woff2');font-weight:900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:3840px;height:2160px;overflow:hidden;background:transparent}
body{font-family:Satoshi,sans-serif;-webkit-font-smoothing:antialiased}
#root{position:relative;width:3840px;height:2160px;background:transparent}
/* Author on the 1920x1080 canvas so every number in style.md stays valid, then scale
   the stage 2x for 4K delivery. This transform is STATIC - GSAP never touches it,
   because a CSS transform and a GSAP tween must never share a property. Alpha output
   cannot use --resolution (deviceScaleFactor is not applied on the alpha path), so
   the scale has to live here. */
#stage{position:absolute;left:0;top:0;width:1920px;height:1080px;
       transform:scale(2);transform-origin:0 0}
.panel{position:absolute;${panelCss(t, sb)}border-radius:10px}
.eyebrow{font-weight:500;font-size:28px;letter-spacing:.18em;text-transform:uppercase;color:${muted(t)}}
.headline{font-weight:900;color:${ink(t)};line-height:1.05;letter-spacing:-0.015em}
.claim{font-weight:700;font-size:44px;color:${ink(t)};line-height:1.15}
.sub{font-weight:500;font-size:28px;color:${muted(t)};line-height:1.3}
.support{font-weight:700;font-size:36px;color:${muted(t)}}
.rule{position:absolute;height:2px;background:${C.accent};transform-origin:left center}
.stat{font-weight:900;font-size:160px;color:${ink(t)};line-height:1.0;font-variant-numeric:tabular-nums}
.unit{font-weight:700;font-size:52px;color:${ink(t)}}
.label{font-weight:700;font-size:36px;color:${muted(t)};letter-spacing:.04em}
.accentText{color:${C.accent}}
`;

// Every entrance is a fromTo. A bare `to` has no defined start state when the
// timeline is seeked into the middle of it.
export const WIPE_UP =
  `{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"}`;

export const page = (id, dur, bodyHtml, tlJs, treatment, sb = false) => `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=3840, height=2160"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>${css(treatment, sb)}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${dur}"
     data-width="3840" data-height="2160" data-fps="30">
<div id="stage">
${bodyHtml}
</div>
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({paused:true});
${tlJs}
window.__timelines["main"] = tl;
</script>
</body>
</html>
`;

export const HF_JSON = JSON.stringify({
  $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
  paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
}, null, 2);
