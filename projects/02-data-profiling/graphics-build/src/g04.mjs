// g04: the model as the series brain in a jar (recurringObjects.model), HERO light card.
//   0      card wipes in: three classic-ML boxes (tree, line fit, k-means) and a small jar beside them
//   "ML"   ("down with classic ML" starts on the part's first frame) the boxes slide out to the left
//   bazillion  the jar swells to fill the card; its label band counts up to 1,000,000,000,000
//   rule   an accent crown drops onto the lid (bounce.out): the one accent, for as long as it stays
//   wait   the crown tilts
//   inconsistent  a question mark drops into the jar
//   every  three answers come out one after another (42%, 37%, 51%: deliberately different)
//   hallucinate  a fourth bubble holds a drawn unicorn
//   forget the bubbles pop in reverse; the crown MORPHS into a knight's helm (the human, 2026-10-28:
//          "turn the brain in a jar into a forgetful knight"), its plume the one accent now the crown
//          is gone; "SIR / Forget-a-lot" lands in the freed right column, and a small "?" bobs by the
//          helm (he forgets). The helm keeps the crown's tilt, is drawn 1.5x as a great helm, taller than wide,
//          a pointed (sugarloaf) top, a centre ridge, a wide dark eye band, a thin nose bar and a dot grid of breathing holes (round 2: line slots read as a text glyph); a round top with a full cross read as a gravestone (review: a wider helm with dot pairs read as a toaster or robot) and the ONE MODEL eyebrow leaves as it lands to
//          give it room; the plume trails down the back. The name sits beside the jar, not across the card.
//   AI     the helm slides off the lid and away (as the crown did); label and "?" leave with it
// Continuous motion: bubbles rise in the jar's liquid for the whole part.
import { C, emit, frames, panelClass, fg, dim, wipeUp, brainInJar } from "../lib.mjs";
import { readFileSync } from "node:fs";
import { planPart } from "../common.mjs";
import { T, EYEBROW, rowUp, show, hide, drawAll, countUp, cueRel, exitIfFree, HERO, f3 } from "../common.mjs";

const ID = "g04";
export default function build() {
  const D = frames(ID) / 30;
  const c = k => cueRel(ID, k);
  const tBz = c("bazillion"), tRule = c("rule"), tWait = c("wait"), tInc = c("inconsistent"), tEv = c("every"),
        tHal = c("hallucinate"), tFor = c("forget"), tAI = c("ai");
  const tML = cueRel(ID, "ml");                       // "ML" in "down with classic ML", from the plan (re-cut safe)
  // words the plan carries no cue for, found in the cut transcript inside this part's own span
  // (range-checked: a word outside the part throws rather than rendering nothing)
  const P = planPart(ID), WORDS = JSON.parse(readFileSync("../outputs/transcript-cut.json", "utf8")).words;
  const word = (w, after = 0) => {
    const hit = WORDS.find(x => x.start >= P.start + after && x.start < P.end && x.word.toLowerCase().replace(/[^a-z]/g, "") === w);
    if (!hit) throw new Error(`${ID}: no "${w}" after ${after}s in the part`);
    return +(hit.start - P.start).toFixed(3);
  };
  const tData = c("data"), tStop = word("stopped", tData), tFun = word("fun", tData);
  const F = fg(ID), M = dim(ID);
  const { x: X, y: Y, w: W, h: H } = HERO;
  const s = (w = 3) => `fill="none" stroke="${F}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

  // ---- the classic-ML boxes
  const box = (x, inner, label) => `<div style="position:absolute;left:${x}px;top:150px;width:112px;height:150px">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="112" height="112" viewBox="0 0 112 112">
        <rect x="2" y="2" width="108" height="108" rx="8" fill="${C.bg}" ${s(3).replace('fill="none" ', "")}/>${inner}</svg>
      ${T(label, 0, 120, 20, { w: 112, align: "center", weight: 700, color: M, ls: 0.1, upper: true })}</div>`;
  const tree = `<circle cx="56" cy="24" r="8" ${s(3)}/><circle cx="32" cy="58" r="8" ${s(3)}/><circle cx="80" cy="58" r="8" ${s(3)}/>
    <circle cx="20" cy="90" r="6" ${s(2.5)}/><circle cx="44" cy="90" r="6" ${s(2.5)}/>
    <path d="M51,30 L37,52 M61,30 L75,52 M28,65 L22,84 M36,65 L42,84" ${s(2.5)}/>`;
  const fit = `${[[22, 84], [32, 74], [40, 78], [50, 62], [60, 58], [70, 48], [78, 50], [88, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${F}"/>`).join("")}
    <path d="M14,90 L96,28" ${s(3)}/>`;
  const km = `${[[28, 34], [38, 28], [34, 44], [22, 42], [76, 72], [84, 82], [72, 86], [88, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${F}"/>`).join("")}
    <circle cx="31" cy="37" r="20" ${s(2.5)} stroke-dasharray="5 5"/><circle cx="80" cy="78" r="20" ${s(2.5)} stroke-dasharray="5 5"/>`;
  const ML = `<div id="${ID}-ml" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">
      ${EYEBROW("Classic ML", 32, 24, M)}
      ${box(24, tree, "tree")}${box(148, fit, "line fit")}${box(272, km, "k-means")}</div>`;

  // ---- the jar, in its own 320x400 space; crown and band ride with it
  const JL = 16, JT = 74;                               // big pose (card-local)
  const CROWN = `<svg id="${ID}-crown" style="position:absolute;left:0;top:0;overflow:visible;opacity:0" width="320" height="10" viewBox="0 0 320 10">
      <g id="${ID}-cg"><g id="${ID}-cr"><path d="M118,6 L114,-40 L138,-20 L160,-52 L182,-20 L206,-40 L202,6 Z" fill="${C.accent}" stroke="${F}" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="160" cy="-54" r="5" fill="${F}"/></g>
      <g id="${ID}-hm" opacity="0"><g transform="translate(160,10) scale(1.5) translate(-160,-6)">
        <path d="M192,-58 C216,-66 232,-48 230,-22 C224,-38 212,-44 198,-42 Z" fill="${C.accent}" stroke="${F}" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M108,6 L118,-6 L118,-40 Q122,-66 160,-84 Q198,-66 202,-40 L202,-6 L212,6 Z" fill="${C.bg}" stroke="${F}" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="M118,-6 H202" fill="none" stroke="${F}" stroke-width="2" stroke-linecap="round"/>
        <path d="M160,-82 V-38 M160,-28 V-6" fill="none" stroke="${F}" stroke-width="2" stroke-linecap="round"/>
        <path d="M124,-39 H196 V-28 H124 Z" fill="${F}"/>
        ${[174, 181, 188].flatMap(x => [-22, -16, -10].map(y => `<circle cx="${x}" cy="${y}" r="1.6" fill="${F}"/>`)).join("")}
      </g></g></g></svg>
    <div id="${ID}-hq" style="position:absolute;left:64px;top:-88px;width:40px;text-align:right;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:56px;line-height:56px;color:rgba(20,17,14,.55);opacity:0">?</div>`;
  const BAND = `<div id="${ID}-band" style="position:absolute;left:22px;top:298px;width:276px;height:66px;background:${C.bg};border:3px solid ${F};border-radius:12px;opacity:0">
      <div id="${ID}-n" style="position:absolute;left:0;top:4px;width:270px;text-align:center;font-family:Satoshi;font-variation-settings:'wght' 800;font-size:25px;line-height:30px;color:${F};font-variant-numeric:tabular-nums">0</div>
      <div style="position:absolute;left:0;top:34px;width:270px;text-align:center;font-family:SatoshiBold,Satoshi;font-weight:700;font-size:20px;letter-spacing:.16em;color:${M}">PARAMETERS</div></div>`;
  const Q = `<div id="${ID}-q" style="position:absolute;left:196px;top:-40px;font-family:Satoshi;font-variation-settings:'wght' 900;font-size:72px;line-height:72px;color:${F};opacity:0"><span id="${ID}-qi">?</span></div>`;
  const JAR = `<div id="${ID}-jw" style="position:absolute;left:${JL}px;top:${JT}px;width:320px;height:400px">
      ${brainInJar(`${ID}-j`, 0, 0, 1)}${BAND}${Q}${CROWN}</div>`;

  // ---- answer bubbles, right column, tails toward the jar
  const BX0 = 352, BY0 = 92, BW = 208, BH = 76, BP = 92;
  const bubble = (k, inner) => `<div id="${ID}-bb${k}" style="position:absolute;left:${BX0}px;top:${BY0 + k * BP}px;width:${BW}px;height:${BH}px;opacity:0">
      <svg style="position:absolute;left:0;top:0;overflow:visible" width="${BW}" height="${BH}" viewBox="0 0 ${BW} ${BH}">
        <path d="M24,2 H${BW - 14} Q${BW - 2},2 ${BW - 2},14 V${BH - 14} Q${BW - 2},${BH - 2} ${BW - 14},${BH - 2} H24 Q12,${BH - 2} 12,${BH - 14} V${BH / 2 + 10} L-8,${BH / 2} L12,${BH / 2 - 10} V14 Q12,2 24,2 Z" fill="${C.bg}" stroke="${F}" stroke-width="3" stroke-linejoin="round"/>
        ${inner}</svg></div>`;
  const num = v => `<text x="${(BW + 10) / 2}" y="${BH / 2 + 15}" text-anchor="middle" font-family="Satoshi" style="font-variation-settings:'wght' 900" font-size="42" fill="${F}">${v}</text>`;
  const unicorn = `<g transform="translate(${(BW + 10) / 2 - 34},6)">
      <path d="M12,62 C8,46 12,30 24,22 L30,12 L34,20 C44,18 56,24 60,34 C64,42 62,48 56,48 C50,48 46,44 40,46 C38,52 40,58 44,64" ${s(3)}/>
      <path d="M33,16 L46,-4 L38,19" ${s(2.6)}/><circle cx="44" cy="30" r="2.6" fill="${F}"/>
      <path d="M24,22 C14,26 10,36 12,44 M20,30 C14,36 13,44 15,52" ${s(2.4)}/></g>`;
  const BUBS = ["42%", "37%", "51%"].map((v, k) => bubble(k, num(v))).join("") + bubble(3, unicorn);

  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">
  <div style="position:absolute;left:0;top:0;width:${W - 12}px;height:${H - 12}px;overflow:hidden">${ML}</div>
  ${EYEBROW("One model", 32, 24, M, `${ID}-eb`)}
  <div id="${ID}-sir" style="position:absolute;left:286px;top:106px;width:260px;opacity:0">
    ${T("Sir", 0, 0, 26, { weight: 800, color: F })}
    ${T("Forget-a-lot", 0, 30, 36, { weight: 800, color: F })}</div>
  <div id="${ID}-ds" style="position:absolute;left:404px;top:244px;width:132px;height:200px;color:${F};opacity:0">
    <svg style="position:absolute;left:0;top:0;overflow:visible" width="132" height="160" viewBox="0 0 132 160">
      <defs><clipPath id="${ID}-dsc"><path d="M6,4 H100 L126,30 V156 H6 Z"/></clipPath></defs>
      <path d="M6,4 H100 L126,30 V156 H6 Z M100,4 V30 H126" fill="${C.bg}" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M20,48 H112 M20,74 H112 M20,100 H112 M20,126 H112 M54,48 V140 M88,48 V140" fill="none" stroke="currentColor" stroke-width="2.4"/>
      <path d="M20,36 H70" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
      <path id="${ID}-dstrike" class="dr" pathLength="1" d="M0,150 L132,10" fill="none" stroke="${M}" stroke-width="5" stroke-linecap="butt" clip-path="url(#${ID}-dsc)"/></svg>
    ${T("data", 0, 168, 22, { w: 132, align: "center", weight: 700, color: "currentColor", ls: 0.14, upper: true })}

  </div>
  ${JAR}
  ${BUBS}
</div>`;

  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  // the jar draws itself in (small), liquid and rising bubbles start and never stop
  // the jar enters at its final size and place, drawing itself in as the classic-ML boxes leave
  js += `tl.fromTo("#${ID}-jw",{x:130,y:44,scale:0.9,transformOrigin:"0 0"},{x:130,y:44,scale:0.9,transformOrigin:"0 0",duration:0.1,immediateRender:true},0);\n`;
  js += drawAll(`#${ID}-j .dr`, tML + 0.25, 0.8);
  js += `tl.fromTo("#${ID}-j-jar-liq",{opacity:0},{opacity:0.1,duration:0.4,immediateRender:true},${f3(tML + 0.8)});\n`;
  js += show(`#${ID}-j-jar-bubbles`, tML + 0.8, 0.4);
  [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => {
    const per = 2.6 + (i % 4) * 0.45, t0 = 0.8 + i * 0.31;
    js += `tl.fromTo("#${ID}-j-jar-b${i}",{y:0},{y:-230,duration:${f3(per)},ease:"none",repeat:${Math.max(0, Math.floor((D - t0) / per) - 1)},immediateRender:true},${f3(t0)});\n`;
  });
  // "ML": the classic boxes slide out of the card to the left
  js += `tl.fromTo("#${ID}-ml",{x:0,opacity:1},{x:-${W},opacity:1,duration:0.7,ease:"power2.in",immediateRender:false},${f3(tML)});\n`;
  js += hide(`#${ID}-ml`, tML + 0.7, 0.2);
  // bazillion: the jar swells to fill the card, the band counts up
  // (the jar does not travel: it is drawn in place as the boxes leave)
  js += rowUp(`#${ID}-eb`, tML + 0.45);       // ONE MODEL takes CLASSIC ML's place as it leaves
  js += show(`#${ID}-band`, tBz + 0.2, 0.3);
  js += countUp(`#${ID}-n`, 0, 1e12, tBz + 0.2, 2.6);
  // it is a joke, not a figure: the low digits keep spinning for the rest of the beat
  js += countUp(`#${ID}-n`, 1e12, 1e12 + Math.round((D - tBz - 2.8) * 7919377), tBz + 2.8, D - tBz - 2.8, 0, "", "", false).replace('ease:"power2.out"', 'ease:"none"');
  // rule: the crown drops onto the lid; wait: it tilts
  js += `tl.fromTo("#${ID}-crown",{opacity:0},{opacity:0,duration:${f3(tRule - 0.35)},immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-crown",{opacity:1,y:-150},{opacity:1,y:0,duration:0.7,ease:"bounce.out",immediateRender:false},${f3(tRule - 0.35)});\n`;
  js += `tl.fromTo("#${ID}-cg",{rotation:0,svgOrigin:"118 6"},{rotation:-10,svgOrigin:"118 6",duration:0.45,ease:"back.out(2)",immediateRender:false},${f3(tWait)});\n`;
  // inconsistent: a question goes in
  js += `tl.fromTo("#${ID}-q",{opacity:0},{opacity:0,duration:${f3(tInc)},immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-q",{opacity:1,y:0},{opacity:1,y:190,duration:0.6,ease:"power2.in",immediateRender:false},${f3(tInc)});\n`;
  js += hide(`#${ID}-qi`, tInc + 0.45, 0.25);   // the glyph fades as it passes the lid; its wrapper falls;
  // before the answers come out, the jar steps left to make room for them
  js += `tl.fromTo("#${ID}-jw",{x:130,y:44,scale:0.9},{x:0,y:44,scale:0.9,duration:0.6,ease:"power2.inOut",immediateRender:false},${f3(tEv - 0.75)});
`;
  // every: three different answers come out, one after another; hallucinate: a unicorn
  [tEv, tEv + 0.45, tEv + 0.9, tHal].forEach((t, k) => {
    js += `tl.fromTo("#${ID}-bb${k}",{opacity:0,scale:0.6,transformOrigin:"0% 50%"},{opacity:1,scale:1,transformOrigin:"0% 50%",duration:0.35,ease:"back.out(2)"},${f3(t)});\n`;
  });
  // forget: they pop in reverse
  // (review 2026-10-28: they start 0.45s early and faster, so the knight's name can land ~0.45s after "forget")
  [3, 2, 1, 0].forEach((k, j) => {
    js += `tl.fromTo("#${ID}-bb${k}",{opacity:1,scale:1},{opacity:0,scale:0.4,duration:0.22,ease:"power2.in",immediateRender:false},${f3(tFor - 0.45 + j * 0.15)});\n`;
  });
  // "data stopped being fun": a data sheet arrives in the freed right half, greys on "stopped",
  // takes a $muted strike on "fun"
  js += `tl.fromTo("#${ID}-ds",{opacity:0,y:14},{opacity:1,y:0,duration:0.35,ease:"power3.out"},${f3(tData - 0.05)});\n`;
  js += `tl.fromTo("#${ID}-ds",{color:"${F}"},{color:"${M}",duration:0.5,ease:"power1.inOut",immediateRender:false},${f3(tStop)});\n`;
  js += drawAll(`#${ID}-dstrike`, tFun, 0.35);
  // forget: the crown flips into a knight's helm (squash out, helm springs up from the lid), then the
  // name lands once the last answer bubble (top row, under it) has popped; a "?" bobs by the helm
  const tM = tFor + 0.22;                              // the helm lands with the name, on "a lot"
  // the helm settles from the crown's -10 tilt to -3, seated on the lid (review round 2)
  js += `tl.fromTo("#${ID}-cg",{rotation:-10,svgOrigin:"118 6"},{rotation:-3,svgOrigin:"118 6",duration:0.4,ease:"power2.out",immediateRender:false},${f3(tM + 0.08)});\n`;
  js += `tl.fromTo("#${ID}-cr",{scaleY:1,svgOrigin:"160 6"},{scaleY:0,svgOrigin:"160 6",duration:0.18,ease:"power2.in",immediateRender:false},${f3(tM)});\n`;
  js += `tl.fromTo("#${ID}-hm",{opacity:1,scaleY:0.3,svgOrigin:"160 6"},{opacity:1,scaleY:1,svgOrigin:"160 6",duration:0.34,ease:"back.out(1.4)",immediateRender:false},${f3(tM + 0.08)});\n`;
  // the knight's name takes over from the ONE MODEL eyebrow, which leaves to give the bigger helm room
  // round 3: ONE MODEL is gone before the helm lands (no "ONE" ghost behind it); the name follows at once
  js += hide(`#${ID}-eb`, tM - 0.25, 0.2);
  js += rowUp(`#${ID}-sir`, tM);
  js += `tl.fromTo("#${ID}-hq",{opacity:0,scale:0.4,rotation:-12,transformOrigin:"50% 100%"},{opacity:1,scale:1,rotation:-12,transformOrigin:"50% 100%",duration:0.3,ease:"back.out(2.4)",immediateRender:false},${f3(tFor + 1.4)});\n`;
  { const per = 1.8, t0 = tFor + 1.7, n = Math.max(1, Math.floor((tAI - t0) / per));
    js += `tl.fromTo("#${ID}-hq",{y:0,rotation:-12},{y:-2,rotation:-10,duration:${per / 2},ease:"sine.inOut",yoyo:true,repeat:${2 * n - 1},immediateRender:false},${f3(t0)});\n`; }
  // AI: the helm slides off the lid and out; its name and the "?" go with it
  // (review round 2: it lifts clear of the lid first, then leaves; it no longer ghosts through the lid)
  js += `tl.fromTo("#${ID}-cg",{x:0,y:0,rotation:-3,svgOrigin:"118 6"},{x:0,y:-12,rotation:-3,svgOrigin:"118 6",duration:0.3,ease:"power2.out",immediateRender:false},${f3(tAI - 0.08)});\n`;
  js += `tl.fromTo("#${ID}-cg",{x:0,y:-12,rotation:-3,svgOrigin:"118 6"},{x:240,y:-8,rotation:24,svgOrigin:"118 6",duration:0.5,ease:"power2.in",immediateRender:false},${f3(tAI + 0.22)});\n`;
  js += hide(`#${ID}-crown`, tAI + 0.42, 0.3);
  js += hide(`#${ID}-hq`, tAI + 0.1, 0.25) + hide(`#${ID}-sir`, tAI + 0.15, 0.3);      // they leave WITH the lift, not before it
  js += `tl.fromTo("#${ID}-eb",{opacity:0,y:14},{opacity:1,y:0,duration:0.35,ease:"power3.out",immediateRender:false},${f3(tAI + 0.85)});\n`;              // ONE MODEL returns once the knight has left: never untitled
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
