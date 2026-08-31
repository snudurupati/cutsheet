// Emits one standalone HyperFrames composition per part in cutsheet.json.
// Shared CSS + per-part markup + per-part animation live here, never hand-written HTML.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");            // video-editor/
const cutsheet = JSON.parse(readFileSync(resolve(HERE, "cutsheet.json"), "utf8"));

// ---- brand tokens, parsed from brand.md's machine-readable block -------------
const brandMd = readFileSync(resolve(ROOT, "brand.md"), "utf8");
const brand = JSON.parse(brandMd.match(/```json\n([\s\S]*?)\n```/)[1]);
const C = brand.colors;
const FONT_DIR = "../fonts";  // copied into the project: the render server is rooted at
                              // graphics-build/, so ../../../../assets escapes the web root
                              // and the @font-face silently falls back to a system sans.

const GSAP = "../vendor/gsap.min.js";                 // relative to parts/*.html

// ---- shared CSS -------------------------------------------------------------
const css = (opts = {}) => `
@font-face{font-family:"Satoshi";src:url("${FONT_DIR}/Satoshi-Variable.ttf") format("truetype");
  font-weight:300 900;font-style:normal;font-display:block}
@font-face{font-family:"SatoshiBold";src:url("${FONT_DIR}/Satoshi-Bold.otf") format("opentype");
  font-weight:700;font-style:normal;font-display:block}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:${opts.opaque ? C.bg : "transparent"}}
#root{position:relative;width:3840px;height:2160px;overflow:hidden;background:transparent}
/* Author in 1920x1080 canvas units (every px in style.md is a canvas number) but rasterise
   at 3840x2160. Alpha renders cannot use --resolution, so the scale happens here instead;
   Chrome rasterises AFTER the transform, so text is crisp at 2x rather than upscaled. */
#stage{position:absolute;left:0;top:0;width:1920px;height:1080px;
  transform:scale(2);transform-origin:top left}
.clip{position:absolute;inset:0}
.disp{font-family:"Satoshi",sans-serif;font-variation-settings:"wght" 900}
.capt{font-family:"SatoshiBold","Satoshi",sans-serif;font-weight:700}
.med {font-family:"Satoshi",sans-serif;font-variation-settings:"wght" 500}

/* panel treatments, chosen per part by MEASURED background luma (style.md) */
.panel-light   {background:${C.bg}EB;border:1px solid ${C.rule};color:${C.ink}}
.panel-reinf   {background:${C.bg}EB;border:2px solid ${C.rule};color:${C.ink};
                box-shadow:0 10px 34px rgba(0,0,0,.20)}
.panel-inverted{background:${C.ink}EB;border:1px solid rgba(255,255,255,.10);color:${C.bg}}
.panel-opaque  {background:${C.ink};border:1px solid rgba(255,255,255,.12);color:${C.bg}}
.panel-inverted .muted,.panel-opaque .muted{color:#B9B2A8}
.panel-light .muted,.panel-reinf .muted{color:${C.muted}}
.accent{background:${C.accent}}
.eyebrow{letter-spacing:.18em;text-transform:uppercase;font-size:28px}
.rule2{height:2px;transform-origin:left center;width:100%}
`;

// full-frame texture, only for opaque takeovers
const texture = `
<div class="tex" style="position:absolute;inset:0;background:${C.bg}"></div>
<div class="tex" style="position:absolute;inset:0;
  background:radial-gradient(1100px 700px at 22% 28%, ${C.accentSoft ?? C["accent-soft"]}14, transparent 70%)"></div>
<div class="tex" style="position:absolute;inset:0;opacity:.06;
  background-image:linear-gradient(${C.rule} 1px,transparent 1px),linear-gradient(90deg,${C.rule} 1px,transparent 1px);
  background-size:60px 60px"></div>`;

// ---- page wrapper -----------------------------------------------------------
function page({ id, duration, body, script, opaque = false }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=1920, height=1080"/>
<title>${id}</title>
<script src="${GSAP}"></script>
<style>${css({ opaque })}</style></head>
<body>
<div id="root" data-composition-id="${id}" data-start="0" data-width="3840" data-height="2160"
     data-duration="${duration.toFixed(3)}" data-fps="30">
<div id="stage">
${body}
</div>
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
${script}
window.__timelines["${id}"] = tl;
</script>
</body></html>`;
}

export { page, texture, C, brand, cutsheet, HERE, ROOT };
