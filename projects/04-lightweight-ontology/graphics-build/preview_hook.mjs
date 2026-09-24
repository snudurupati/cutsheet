// Two hook candidates for the human to choose between (2026-09-22: he found the
// half-built graph did not fit and asked to see the brain-in-a-jar options).
// Both use the series' recurring "model" object (style.json recurringObjects),
// the real g01 span and the real cue times; they differ only in the failure shown.
//   g01a  confused: question marks gather and multiply; one lands in $accent
//   g01b  confidently wrong: "revenue = $7,449,106" with a tick; the tick breaks
//         and an $accent strike crosses the number (the demo's rookie-join figure)
import { C, emit, span, frames, cueIn, panelClass, fg, dim, brainInJar,
         LEFT_X0, CARD_W, wipeDown, exitAt } from "./lib.mjs";

const D = frames("g01") / 30, c = p => cueIn("g01", p);
const tHal = c("hallucinates"), tCtx = c("business context"), tData = c("your data.");
const id0 = "g01";

// shared scene: data table (left), rows streaming into the jar, unplugged context cable
const TABLE = `<svg style="position:absolute;left:34px;top:190px;overflow:visible" width="190" height="170">
  ${[0,1,2,3,4].map(r => [0,1,2].map(k => `<rect x="${k*62}" y="${r*32}" width="58" height="28" rx="4"
     fill="none" stroke="${dim(id0)}" stroke-width="2"/>`).join("")).join("")}
</svg>`;
const ROWS = [0,1,2,3,4,5].map(i => `<div id="row${i}" style="position:absolute;left:40px;top:${198 + (i % 5) * 32}px;
  width:170px;height:14px;border-radius:7px;background:${fg(id0)};opacity:0"></div>`).join("");
const CABLE = `<svg style="position:absolute;left:0;top:0;overflow:visible" width="664" height="560">
  <path id="cab" d="M496,100 C496,56 450,36 380,44 C340,48 322,64 316,86" fill="none" stroke="${fg(id0)}"
    stroke-width="4" stroke-linecap="round"/>
  <rect id="plug" x="302" y="84" width="24" height="30" rx="4" fill="${C.bg}" stroke="${fg(id0)}" stroke-width="3"/>
  <rect x="150" y="96" width="44" height="34" rx="6" fill="none" stroke="${dim(id0)}" stroke-width="3" stroke-dasharray="6 5"/>
</svg>
<div class="capt" style="position:absolute;left:112px;top:138px;width:120px;text-align:center;font-size:26px;color:${dim(id0)}">context</div>`;
const scene = extra => `
<div id="panel" class="${panelClass(id0)}" style="position:absolute;left:${LEFT_X0}px;top:150px;width:${CARD_W}px;height:560px;overflow:hidden">
  ${TABLE}${ROWS}${CABLE}
  <div id="jarw" style="position:absolute;left:0;top:0">${brainInJar("bj", 360, 96, 0.85)}</div>
  ${extra}
</div>`;
// every stroke of the jar, brain and cable already drawn on frame 0; rows move from frame 0
const baseJS = () => {
  let js = `tl.fromTo("#panel .dr, #panel .s, #panel .o",{strokeDashoffset:0},{strokeDashoffset:0,duration:0.2},0);\n`;
  // no liquid tint: at this size it muddied the brain's folds into a fist
  [0,1,2,3,4,5].forEach(i => {
    const t0 = +(i * 0.55).toFixed(2);
    // immediateRender:false, or every looping row is stamped onto the table at frame 0
    js += `tl.fromTo("#row${i}",{x:0,y:0,opacity:0.9,scaleX:1},{x:360,y:${-70 + (i % 3) * 20},opacity:0,scaleX:0.35,duration:1.4,ease:"power1.in",repeat:${Math.floor((D - t0) / 3.3)},repeatDelay:1.9,immediateRender:false},${t0});\n`;
  });
  js += `tl.fromTo("#plug",{rotation:-6,svgOrigin:"314 86"},{rotation:6,svgOrigin:"314 86",duration:1.1,yoyo:true,repeat:${Math.floor(D / 1.1)},ease:"sine.inOut"},0);\n`;
  return js;
};

// ---------------------------------------------------------------- g01a confused
{
  const Q = [[318,170,54],[590,150,48],[600,300,60],[316,330,44],[560,40,50],[470,440,46]];
  const extra = Q.map(([x, y, s], i) => `<div id="q${i}" class="disp" style="position:absolute;left:${x}px;top:${y}px;
     font-size:${s}px;font-variation-settings:'wght' 900;color:${i % 2 ? dim(id0) : fg(id0)};opacity:0">?</div>`).join("")
    + `<div id="qbig" class="disp" style="position:absolute;left:452px;top:180px;font-size:150px;font-variation-settings:'wght' 900;color:${C.accent};opacity:0">?</div>`;
  let js = baseJS();
  Q.forEach((_, i) => {
    const t = i < 3 ? tHal + i * 0.35 : tCtx - 0.6 + (i - 3) * 0.4;
    js += `tl.fromTo("#q${i}",{opacity:0,scale:0.5,y:10},{opacity:1,scale:1,y:0,duration:0.35,ease:"back.out(2)"},${t.toFixed(3)});\n`;
    js += `tl.fromTo("#q${i}",{y:0},{y:-10,duration:0.8,yoyo:true,repeat:${Math.max(1, Math.floor((D - t - 1) / 0.8))},ease:"sine.inOut"},${(t + 0.4).toFixed(3)});\n`;
  });
  js += `tl.fromTo("#bj",{rotation:-3},{rotation:3,duration:0.45,yoyo:true,repeat:${Math.floor((D - tHal) / 0.45)},ease:"sine.inOut",transformOrigin:"50% 80%"},${tHal.toFixed(3)});\n`;
  js += `tl.fromTo("#qbig",{opacity:0,scale:0.4},{opacity:1,scale:1,duration:0.4,ease:"back.out(2)"},${tData.toFixed(3)});\n`;
  js += wipeDown("#panel", exitAt(D));
  emit("g01a", D, scene(extra), js);
}

// ------------------------------------------------------- g01b confidently wrong
{
  const extra = `
  <div id="ans" style="position:absolute;left:150px;top:458px;width:470px;height:78px;border:3px solid ${fg(id0)};border-radius:10px;background:${C.bg}">
    <div class="disp" style="position:absolute;left:24px;top:16px;font-size:38px;font-variation-settings:'wght' 700;color:${fg(id0)}">revenue = $7,449,106</div>
  </div>
  <svg style="position:absolute;left:0;top:0;overflow:visible" width="664" height="560">
    <line x1="496" y1="436" x2="496" y2="458" stroke="${fg(id0)}" stroke-width="3"/>
    <path id="tickL" d="M570,494 L584,510" stroke="${fg(id0)}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path id="tickR" d="M584,510 L606,478" stroke="${fg(id0)}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <line id="strike" x1="166" y1="497" x2="556" y2="497" pathLength="1" stroke="${C.accent}" stroke-width="6" stroke-linecap="round"
      style="stroke-dasharray:1;stroke-dashoffset:1"/>
  </svg>`;
  let js = baseJS();
  js += `tl.fromTo("#ans",{opacity:1},{opacity:1,duration:0.2},0);\n`;
  // the tick breaks just after "hallucinates", the strike crosses the number
  js += `tl.fromTo("#tickL",{rotation:0,x:0,y:0,svgOrigin:"584 510"},{rotation:-35,x:-6,y:14,svgOrigin:"584 510",duration:0.35,ease:"power2.in"},${(tHal + 0.15).toFixed(3)});\n`;
  js += `tl.fromTo("#tickR",{rotation:0,x:0,y:0,svgOrigin:"584 510"},{rotation:28,x:8,y:18,svgOrigin:"584 510",duration:0.35,ease:"power2.in"},${(tHal + 0.2).toFixed(3)});\n`;
  js += `tl.fromTo(["#tickL","#tickR"],{opacity:1},{opacity:0.25,duration:0.3},${(tHal + 0.5).toFixed(3)});\n`;
  js += `tl.fromTo("#strike",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.45,ease:"power2.out"},${(tHal + 0.45).toFixed(3)});\n`;
  // "business context": the unplugged cable swings harder, pointing at the cause
  js += `tl.fromTo("#cab",{strokeWidth:4},{strokeWidth:7,duration:0.3,yoyo:true,repeat:5,ease:"sine.inOut"},${tCtx.toFixed(3)});\n`;
  js += wipeDown("#panel", exitAt(D));
  emit("g01b", D, scene(extra), js);
}
