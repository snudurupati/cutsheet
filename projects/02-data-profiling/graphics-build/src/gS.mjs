// gS: DuckDB last week, PySpark this week (added after the composition review: 8:03-9:40 had 97s
// with no graphic). Opaque contrast card in the notebook's right margin.
// Left: a drawn database cylinder, DuckDB, "just write SQL" (on "DuckDB.", "SQL."). Right, shown
// dimmed from the start (a contrast shows both sides): the notebook glyph, PySpark, lifting on
// "PySpark", "complex data" on "complex". On "scale" the card grows down (step-build) and the one
// accent, a drawn arrow, runs from the notebook into three cluster nodes; three copies of the
// notebook ride it out. DATABRICKS on "Databricks", AWS EMR on "EMR", YOUR OWN on "cluster".
// Placement: measured on base-screen.mp4 across the window (the screen holds "Part 4 Profile
// PushT" and the Spark session cell): x 1340-1880 is empty from y 130 down to the warnings output at
// y ~540; the kernel label "physical-ai-data-architect (3.11.x)" sits at y 100-122, so the card
// starts at y 136 and is 330 tall (bottom y 466).
// Motion: 2.5-19s the parts landing; 20-29s the accent stem creeps down toward "scale"; from "PySpark" a running-cell bar sweeps the notebook glyph;
// from "scale" a paper pulse runs the accent arrow.
import { C, emit, frames, panelClass, fg, dim, PANELS } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, cueRel, exitIfFree, f3 } from "../common.mjs";
import { slides, drawIn, stepCard } from "./_demo1.mjs";

const ID = "gS";
const POS = { x: 1340, y: 136 };
export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  // gS is not in panels.json yet (added after the measurement pass), and panelClass falls back to the
  // light sheet; every part over the screen recording is opaque, so an unmeasured gS is too
  const OPQ = !PANELS[ID] || panelClass(ID) === "opaque";
  const CLS = OPQ ? "opaque" : panelClass(ID), F = OPQ ? C.bg : fg(ID), M = OPQ ? "#B9B2A8" : dim(ID);
  const W = 540, H = 330, HA = 200;              // full card, and the card before "scale"
  const NX = [96, 270, 444], NY = 226;           // cluster node centres x, node top y (padding box)
  const st = `stroke="${F}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" fill="none"`;

  const cyl = `<svg id="${ID}-cyl" style="position:absolute;left:28px;top:62px;overflow:visible" width="60" height="76" viewBox="0 0 60 76">
    <ellipse cx="30" cy="12" rx="27" ry="9" ${st}/><path d="M3,12 V62 C3,67 15,71 30,71 C45,71 57,67 57,62 V12" ${st}/>
    <path d="M3,37 C3,42 15,46 30,46 C45,46 57,42 57,37" ${st}/></svg>`;
  // the notebook glyph: a page of three cells, the run marks on the left; reused small for copies
  const nb = (id, x, y, s = 1, extra = "") => `<svg id="${id}" style="position:absolute;left:${x}px;top:${y}px;overflow:visible" width="${48 * s}" height="${72 * s}" viewBox="0 0 48 72">
    <rect x="2" y="2" width="44" height="68" rx="6" ${st}/>
    ${[14, 32, 50].map(yy => `<path d="M10,${yy} H14 M19,${yy} H38" ${st}/>`).join("")}${extra}</svg>`;
  const runbar = `<rect id="${ID}-run" x="18" y="10" width="22" height="8" rx="3" fill="${F}" opacity="0.45"/>`;
  const stemD = `M310,140 V204`;
  const arrowD = `M${NX[0]},204 H${NX[2]} M${NX[0]},204 V${NY - 2} M${NX[1]},204 V${NY - 2} M${NX[2]},204 V${NY - 2}`;
  const tree = `<svg id="${ID}-tree" style="position:absolute;left:0;top:0;overflow:visible" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <path id="${ID}-stem" class="dr" pathLength="1" opacity="0" d="${stemD}" fill="none" stroke="${C.accent}" stroke-width="4" stroke-linecap="round"/>
    <path id="${ID}-arr" class="dr" pathLength="1" opacity="0" d="${arrowD}" fill="none" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="${ID}-arrp" class="pl" pathLength="1" d="M310,140 V204 H${NX[2]} V${NY - 2}" fill="none" stroke="${C.bg}" stroke-width="3" stroke-linecap="round" opacity="0"/></svg>`;
  const node = (i) => `<div id="${ID}-nd${i}" style="position:absolute;left:${NX[i] - 60}px;top:${NY}px;width:120px;height:46px">
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="120" height="46" viewBox="0 0 120 46"><rect x="1.5" y="1.5" width="117" height="43" rx="8" ${st}/>
      ${[0, 1, 2].map(k => `<circle cx="${94 + k * 0}" cy="${12 + k * 11}" r="3" fill="${F}"/>`).join("")}<path d="M78,6 V40" stroke="${M}" stroke-width="2"/></svg></div>`;
  const labels = [["DATABRICKS", "databricks"], ["AWS EMR", "emr"], ["YOUR OWN", "cluster"]];
  const lab = (i) => `<div id="${ID}-lb${i}" style="position:absolute;left:${NX[i] - 90}px;top:${NY + 58}px;width:180px;text-align:center;font-family:Satoshi,sans-serif;font-variation-settings:'wght' 700;font-size:20px;letter-spacing:.14em;color:${F}">${labels[i][0]}</div>`;
  // three notebook copies that ride the arrow into the nodes (start hidden on the big glyph)
  const copies = [0, 1, 2].map(i => nb(`${ID}-cp${i}`, 296, 112, 0.42)).join("");

  const step = stepCard(`#${ID}-card`, `${ID}-fb`, W, H, HA, c("scale") - 0.2);
  const body = `
<div id="${ID}-w" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
<div id="${ID}-card" class="${CLS}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${W}px;height:${H}px">
  ${EYEBROW("Last week, this week", 24, 18, M, `${ID}-eb`)}
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="10" height="10"><path id="${ID}-div" class="dr" pathLength="1" opacity="0" d="M270,64 V176" stroke="${M}" stroke-width="2" stroke-linecap="round"/></svg>
  <div id="${ID}-L">${cyl}
    ${T("DuckDB", 104, 64, 28, { weight: 900, color: F, id: `${ID}-ln` })}
    ${T("just write SQL", 104, 104, 22, { weight: 500, color: M, id: `${ID}-ls` })}</div>
  <div id="${ID}-R">${nb(`${ID}-nb`, 290, 62, 1, runbar)}
    ${T("PySpark", 352, 64, 28, { weight: 900, color: F, id: `${ID}-rn` })}</div>
  ${T("complex data", 352, 104, 22, { weight: 500, color: M, id: `${ID}-rs` })}
  ${tree}${node(0)}${node(1)}${node(2)}${lab(0)}${lab(1)}${lab(2)}${copies}
  ${step.html}
</div></div>`;

  const tDuck = c("duckdb"), tSql = c("sql"), tPy = c("pyspark"), tCx = c("complex"), tSc = c("scale");
  const tLb = [c("databricks"), c("emr"), c("cluster")];
  // review round 2: the card enters ~1s before "DuckDB" with its first content
  const tIn = tDuck - 1.0;
  let js = slides(`#${ID}-w`, [[tIn, null]]);
  // the card shows only its top HA px until "scale", then grows down (stepCard)
  js += step.js;
  js += rowUp(`#${ID}-eb`, tIn + 0.15) + drawIn(`#${ID}-div`, tIn + 0.35, 0.5);
  // both sides from the first frame; the right is dimmed until "PySpark"
  js += `tl.fromTo("#${ID}-R",{opacity:0},{opacity:0.28,duration:0.35,ease:"power2.out"},${f3(tIn + 0.5)});\n`;
  js += `tl.fromTo("#${ID}-R",{opacity:0.28},{opacity:1,duration:0.3,ease:"power2.out",immediateRender:false},${f3(tPy)});\n`;
  js += `tl.fromTo("#${ID}-cyl",{opacity:0,y:10},{opacity:1,y:0,duration:0.35,ease:"power3.out"},${f3(tDuck - 0.1)});\n`;
  js += rowUp(`#${ID}-ln`, tDuck) + rowUp(`#${ID}-ls`, tSql) + rowUp(`#${ID}-rs`, tCx);
  // running-cell bar: steps down the three cells, from "PySpark" to the end
  const nRun = Math.max(1, Math.floor((D - tPy - 0.5) / 2.4));
  js += `tl.fromTo("#${ID}-run",{attr:{y:10}},{attr:{y:46},duration:2.4,ease:"steps(2)",repeat:${nRun - 1},immediateRender:false},${f3(tPy + 0.5)});\n`;
  // "scale": the arrow draws (the one accent), nodes land, three copies ride out
  // review round 2: the arrow's stem starts down from the notebook after "complex" and creeps through
  // the static stretch before "scale" (its lower end is under the card's clip until the grow), then
  // the bus and drops draw on "scale"
  js += drawIn(`#${ID}-stem`, tCx + 1.0, tSc + 0.2 - (tCx + 1.0)).replace(/ease:"power2.out"/, 'ease:"sine.inOut"');
  js += drawIn(`#${ID}-arr`, tSc + 0.3, 0.8);
  [0, 1, 2].forEach(i => { js += `tl.fromTo("#${ID}-nd${i}",{opacity:0,scale:0.7},{opacity:1,scale:1,duration:0.3,ease:"power3.out"},${f3(tSc + 0.9 + i * 0.15)});\n`; });
  [0, 1, 2].forEach(i => {
    const t0 = tSc + 1.1 + i * 0.2, dx = NX[i] - 50 - 296, cpY = NY + 6 - 112;
    js += `tl.fromTo("#${ID}-cp${i}",{opacity:0,x:0,y:0},{opacity:1,x:0,y:${204 - 112 - 15},duration:0.4,ease:"power1.in"},${f3(t0)});\n`;
    js += `tl.fromTo("#${ID}-cp${i}",{x:0,y:${204 - 112 - 15}},{x:${dx},y:${204 - 112 - 15},duration:0.5,ease:"power1.inOut",immediateRender:false},${f3(t0 + 0.4)});\n`;
    js += `tl.fromTo("#${ID}-cp${i}",{y:${204 - 112 - 15}},{y:${cpY},duration:0.3,ease:"power2.out",immediateRender:false},${f3(t0 + 0.9)});\n`;
  });
  const nP = Math.max(1, Math.floor((D - tSc - 2) / 1.8));
  js += `tl.fromTo("#${ID}-arrp",{opacity:0.9,strokeDashoffset:1},{opacity:0.9,strokeDashoffset:-0.07,duration:1.8,ease:"none",repeat:${nP - 1},immediateRender:false},${f3(tSc + 1.6)});\n`;
  js += `tl.fromTo("#${ID}-arrp",{opacity:0},{opacity:0,duration:0.2,immediateRender:true},0);\n`;
  tLb.forEach((t, i) => { js += rowUp(`#${ID}-lb${i}`, t); });
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
