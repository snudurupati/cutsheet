// 2.2-learning-chaos graphics build. One composition project per part under
// parts/<id>/, generated from here, never hand-written per graphic.
//
// Every timing is DERIVED: part spans from cutsheet.json (span/frames), cue times
// from outputs/transcript-cut-v9.json (cueIn), punch-in geometry from
// demo-spec.json + screen-ocr.json (mapZoom/plateau), panel treatment from
// panels.json (measure_panels.py, never by eye), composite boxes from
// gen_cutsheet.py's boxes block (rule 12: geometry read from the cutsheet).
//
// GSAP contract: one paused timeline per part on window.__timelines[id]; absolute
// seconds; every entrance a fromTo; no runtime randomness; no CSS transform on a
// property GSAP tweens; clip-path wipes, never blur; svgOrigin for SVG rotation;
// visibility by opacity tween.
//
// Canvas geometry (cutsheet.json boxes, canvas px):
//   hero  x 60-660, y 200-820    right plate x 1548-1888, y 120-760
//   end card x 96-680, y 660-1020   lower third x 40-380, y 880-990 (inside g01)
// Accent budget (style.json accentElementsPerScene = 1): exactly ONE accent per
// part, noted in each scene's header comment.
import "./scenes-a.mjs";
import "./scenes-b.mjs";
import "./scenes-c.mjs";
import "./scenes-d.mjs";
