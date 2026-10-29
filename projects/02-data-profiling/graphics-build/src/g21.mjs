// g21: aha 6 setup. The card enters 1s before 'same' with the eight 500-frame bars already stacked,
// dimmed; on 'same' they light together (all the same length). 'fixed': a stopwatch whose hand runs
// from then on. 'improbable': every bar ends on one dashed 500 line. 'failed': one bar empties from
// halfway (the robot stopped, the recording ran on): a dashed hollow segment. 'tail': the last 100
// frames of every bar shade (muted) inside a TAIL bracket; '100': LAST / 100 inside the bracket.
// 'hunch': the hunch takes the lower card, "an idle tail means a failed episode", HUNCH in accent.
// The hypothesis ring is NOT drawn here (composition review 2026-10-28: its return in g22 lands
// harder if g21 only states the hunch).
// What moves when: one playhead sweep on 'fixed'; the stopwatch hand turns from 'fixed' to the end.
// The card enters sized to the bars and grows to full height on 'hunch' (cards that build in steps). One accent at a time: stopwatch hand -> the hollow failed segment -> (none) -> HUNCH.
import { C, emit, frames, panelClass, fg, dim, SHADOW_PAD } from "../lib.mjs";
import { T, EYEBROW, rowUp, show, drawAll, cueRel, exitIfFree, f3 } from "../common.mjs";
import { POS, CW, CH, BX0, BX1, BY0, BH, NB, TX, fx, barY, stackSVG, chg } from "./_demo2.mjs";

const ID = "g21";
export default function build() {
  const D = frames(ID) / 30, F = fg(ID), M = dim(ID);
  const c = k => cueRel(ID, k);
  const tSame = c("same"), tFixed = c("fixed"), tImp = c("improbable"), tFail = c("failed"),
        tTail = c("tail"), tHunch = c("hunch"), t100 = c("100");
  const FAIL = 5, YB = barY(NB - 1) + BH;          // last bar bottom (277)
  const tIn = tSame - 1.0, SHORT = 312;    // card height while it holds only the bars
  const fy = barY(FAIL), f0 = fx(250);

  const watch = `<svg id="${ID}-sw" style="position:absolute;left:356px;top:6px;overflow:visible" width="52" height="56" viewBox="0 0 52 56">
    <path d="M20,4 H32 M26,4 V11 M42,14 L46,10" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="26" cy="32" r="19" fill="none" stroke="${F}" stroke-width="3"/>
    <g id="${ID}-hand"><line id="${ID}-handl" x1="26" y1="32" x2="26" y2="18" stroke="${C.accent}" stroke-width="3.5" stroke-linecap="round"/></g>
    <circle cx="26" cy="32" r="3" fill="${F}"/></svg>`;
  const marks = `<svg id="${ID}-mk" style="position:absolute;left:0;top:0;overflow:visible" width="528" height="428" viewBox="0 0 528 428">
    <g id="${ID}-fail" opacity="0"><rect x="${f3(f0)}" y="${fy}" width="${f3(BX1 - f0)}" height="${BH}" rx="4" fill="${C.ink}"/>
      <rect id="${ID}-failr" x="${f3(f0 + 1.5)}" y="${fy + 1.5}" width="${f3(BX1 - f0 - 3)}" height="${BH - 3}" rx="3" fill="none" stroke="${C.accent}" stroke-width="3" stroke-dasharray="7 5"/></g>
    <line id="${ID}-ph" x1="${BX0}" y1="${BY0 - 4}" x2="${BX0}" y2="${YB + 4}" stroke="${C.ink}" stroke-width="2.5"/>
    <line id="${ID}-end" class="dr" pathLength="1" x1="${BX1}" y1="${BY0 - 8}" x2="${BX1}" y2="${YB + 8}" stroke="${M}" stroke-width="2" stroke-dasharray="0.04 0.03"/>
    <path id="${ID}-tb" class="dr" pathLength="1" d="M${BX1 + 10},${BY0} h6 V${YB} h-6" fill="none" stroke="${F}" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`;

  const inner = `
    ${EYEBROW("ALOHA episodes", 24, 20, M, `${ID}-eb`)}
    ${watch}
    ${stackSVG(ID, F, M)}
    ${marks}
    ${T("500", BX1 - 30, BY0 - 32, 20, { w: 60, align: "center", weight: 700, color: M, id: `${ID}-500` })}
    ${T("TAIL", BX1 + 22, 120, 20, { weight: 700, color: F, ls: 0.1, id: `${ID}-tl` })}
    ${T("LAST<br>100", BX1 + 22, 158, 20, { weight: 700, color: M, ls: 0.06, lh: 1.25, id: `${ID}-l100` })}
    <div id="${ID}-edge" style="position:absolute;left:-6px;top:${SHORT - 12}px;width:${CW}px;height:6px;background:${C.bg}"></div>
    ${T("HUNCH", 24, 306, 22, { weight: 700, color: C.accent, ls: 0.14, id: `${ID}-hh` })}
    ${T("an idle tail means<br>a failed episode", 24, 338, 34, { w: 480, weight: 700, color: F, lh: 1.15, id: `${ID}-ht` })}`;
  const body = `<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${POS.x}px;top:${POS.y}px;width:${CW}px;height:${CH}px">${inner}</div>`;

  let js = "";
  // a card that builds in steps: it enters sized to the bars (SHORT tall) and grows down to full
  // height when the hunch arrives. The clip hides the lower part; a 6px paper edge rides the clip's
  // bottom so the short card still reads as a bordered object.
  const cut = CH - SHORT, shortClip = `inset(-90px -90px ${cut}px -90px)`;
  js += `tl.fromTo("#${ID}-card",{clipPath:"inset(100% 0px 0px 0px)",opacity:0},{clipPath:"inset(100% 0px 0px 0px)",opacity:0,duration:${f3(tIn)},immediateRender:true},0);\n`;
  js += `tl.fromTo("#${ID}-card",{clipPath:"inset(0px 0px ${CH}px 0px)",opacity:1},{clipPath:"${shortClip}",opacity:1,duration:0.35,ease:"power3.out",immediateRender:false},${f3(tIn)});\n`;
  js += `tl.fromTo("#${ID}-card",{clipPath:"${shortClip}"},{clipPath:"inset(${SHADOW_PAD})",duration:0.5,ease:"power3.inOut",immediateRender:false},${f3(tHunch - 0.55)});\n`;
  js += `tl.fromTo("#${ID}-edge",{y:0},{y:${cut},duration:0.5,ease:"power3.inOut",immediateRender:false},${f3(tHunch - 0.55)});\n`;
  js += `tl.fromTo("#${ID}-edge",{opacity:1},{opacity:0,duration:0.2,immediateRender:false},${f3(tHunch - 0.05)});\n`;
  js += rowUp(`#${ID}-eb`, tIn + 0.15);
  // the bars are there, dimmed, from the entrance; on 'same' they light together
  js += `tl.fromTo("#${ID}-stack g[id^='${ID}-bar']",{opacity:0.25},{opacity:0.25,duration:0.2,immediateRender:true},0);\n`;
  js += chg(`#${ID}-stack g[id^='${ID}-bar']`, `{opacity:0.25}`, `{opacity:1,stagger:0.05}`, tSame, 0.35);
  // 'fixed': the stopwatch, its hand running from here on (one turn per 5s)
  js += show(`#${ID}-sw`, tFixed, 0.3, "scale:0.8,transformOrigin:'50% 50%'", "scale:1,transformOrigin:'50% 50%'");
  const nH = Math.max(1, Math.floor((D - tFixed) / 5));
  js += `tl.fromTo("#${ID}-hand",{rotation:0,svgOrigin:"26 32"},{rotation:360,svgOrigin:"26 32",duration:5,ease:"none",repeat:${nH - 1}},${f3(tFixed)});\n`;
  // one playhead sweep on 'fixed' (the fixed clock), stopping at the bar end, then gone
  js += `tl.fromTo("#${ID}-ph",{opacity:0},{opacity:0.85,duration:0.25},${f3(tFixed)});\n`;
  js += `tl.fromTo("#${ID}-ph",{x:0},{x:${BX1 - BX0},duration:3,ease:"none"},${f3(tFixed)});\n`;
  js += chg(`#${ID}-ph`, `{opacity:0.85}`, `{opacity:0}`, tFixed + 3.1);
  // 'improbable': every bar ends on the same dashed line, labelled 500
  js += drawAll(`#${ID}-end`, tImp, 0.5);
  js += rowUp(`#${ID}-500`, tImp + 0.1);
  // 'failed': the stopwatch hand gives up the accent; one bar empties from halfway, wiping right
  js += chg(`#${ID}-handl`, `{stroke:"${C.accent}"}`, `{stroke:"${F}"}`, tFail - 0.1);
  js += `tl.fromTo("#${ID}-fail",{opacity:1,clipPath:"inset(-4px 100% -4px 0px)"},{opacity:1,clipPath:"inset(-4px 0% -4px 0px)",duration:0.8,ease:"power2.inOut"},${f3(tFail)});\n`;
  // 'tail': the failed segment settles to muted; the tails shade muted inside the TAIL bracket
  js += chg(`#${ID}-failr`, `{stroke:"${C.accent}"}`, `{stroke:"${M}"}`, tTail - 0.1);
  js += `tl.fromTo("#${ID}-stack rect[id^='${ID}-t']",{opacity:0},{opacity:1,duration:0.3,stagger:0.04},${f3(tTail)});\n`;
  js += drawAll(`#${ID}-tb`, tTail + 0.1, 0.4);
  js += rowUp(`#${ID}-tl`, tTail + 0.2);
  // 'hunch': the one accent, on HUNCH
  js += rowUp(`#${ID}-hh`, tHunch);
  js += rowUp(`#${ID}-ht`, tHunch + 0.15);
  // '100': LAST 100 inside the bracket
  js += rowUp(`#${ID}-l100`, t100);
  js += exitIfFree(ID, D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
