// 02-data-profiling graphics build. One composition project per part under parts/<id>/, generated
// from src/<id>.mjs (one file per part, so parallel builders never touch the same file), never
// hand-written. Shared helpers: common.mjs (lifted from 01), lib.mjs, hum.mjs, art.mjs.
// ref-01-build.mjs is 01's whole build, kept READ-ONLY as the worked reference.
//
// GSAP contract (graphics skill, part C): one paused timeline per part on window.__timelines[id];
// absolute seconds; every entrance a fromTo; no random (seeded PRNG at build time), no timers; no
// CSS transform on a property GSAP tweens; clip-path wipes, never blur; instant changes >= 0.2s;
// svgOrigin for SVG rotation; visibility by opacity tween.
//
//   node build.mjs            build every part
//   node build.mjs g04,g05    build only these
import { readdirSync } from "node:fs";
const ONLY = process.argv[2] || "";
const want = id => !ONLY || ONLY.split(",").includes(id);
const files = readdirSync("src").filter(f => f.endsWith(".mjs") && !f.startsWith("_")).sort();   // _x.mjs = shared, not a part
let n = 0, failed = [];
for (const f of files) {
  const id = f.replace(/\.mjs$/, "");
  if (!want(id)) continue;
  try { const m = await import(`./src/${f}`); await m.default(); n++; }
  catch (e) { failed.push(id); console.error(`  FAILED ${id}: ${e.stack || e}`); }
}
console.log(`built ${n} part(s)${failed.length ? `, FAILED: ${failed.join(",")}` : ""}`);
if (failed.length) process.exit(1);
