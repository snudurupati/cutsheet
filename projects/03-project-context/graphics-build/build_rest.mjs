// Parts g004-g030. Shared scaffolding is in lib.mjs.
//
// g008, g010 and g017 are NOT here: they are FFmpeg punch-ins on the screen
// footage (kind "zoom", class "segment") and belong to the footage pass, not to
// a browser render. A zoom is pure geometry and never needs to enter a browser.
//
// Every cue time below was read out of outputs/transcript-cut.json, constrained
// to the part's own window. Cues found across the whole transcript are wrong:
// "coding standards" appears at 810s inside the demo as well as at 1391s in the
// outro, and "data models" appears at 229s in the intro.
import { C, emit, panelClass, rel, fg, dim, span, brainInJar, cardX, CARD_Y, textBox, assertClear, assertCentred} from "./lib.mjs";

const P = id => panelClass(id);           // "sheet" over the face, "opaque" over the screen
const ACC = C.accent;

// ---------------------------------------------------------------- helpers ---
// A card that lands rows on their own spoken cues. Rows never all arrive at once.
// Above the style's 20s continuous-motion floor a slow accent scan runs for the
// whole beat, because staged landings alone read as a frozen frame between cues.
function rowsCard(id, start, end, opts) {
  const D = +(end - start).toFixed(2), at = rel(start);
  const { eyebrow = "", rows = [], strike = [], w = 724, x = 96, y = 300, fs = 34 } = opts;
  const rowH = fs + 26;
  const H = 62 + (eyebrow ? 46 : 0) + rows.length * rowH + 28;
  // The strike lives INSIDE an inline-block wrapper, so the wrapper is exactly as
  // wide as its own text and the rule can run to 100% of it. It used to animate to
  // a fixed 320px, which overshot every row shorter than that and stopped short on
  // every row longer: a strike that runs past the words reads as a stray rule.
  const rowMk = rows.map((r, i) =>
    `<div id="${id}r${i}" style="position:relative;height:${rowH}px;opacity:0">
       <span id="${id}t${i}" class="med" style="position:relative;display:inline-block;
             font-size:${fs}px;line-height:1.25">${r.text}<span id="${id}s${i}"
             class="accentbar" style="position:absolute;left:0;top:${Math.round(fs*0.58)}px;
             width:0;height:3px;opacity:.9"></span></span>
     </div>`).join("\n      ");
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:${w}px;
       min-height:${H}px;padding:30px 36px;opacity:0">
    ${eyebrow ? `<div id="${id}eb" class="capt eyebrow muted" style="font-size:22px;margin-bottom:20px;opacity:0">${eyebrow}</div>` : ""}
    ${rowMk}
    ${D > 20 ? `<div id="${id}scan" class="accentbar" style="position:absolute;left:36px;bottom:16px;width:0;height:2px;opacity:.55"></div>` : ""}
  </div>
</section>`;
  let js = `
tl.fromTo("#${id}card",{opacity:0,y:18},{opacity:1,y:0,duration:0.45,ease:"power3.out"},0.00);`;
  if (eyebrow) js += `\ntl.fromTo("#${id}eb",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},0.22);`;
  rows.forEach((r, i) => {
    js += `\ntl.fromTo("#${id}r${i}",{opacity:0,x:-16},{opacity:1,x:0,duration:0.40,ease:"power3.out"},${at(r.t)});`;
  });
  strike.forEach(s => {
    // to 100% of the text wrapper, never a pixel guess
    js += `\ntl.fromTo("#${id}s${s.i}",{width:"0%"},{width:"100%",duration:0.45,ease:"power2.inOut"},${at(s.t)});`;
  });
  if (D > 20) {
    js += `\ntl.fromTo("#${id}scan",{width:0},{width:${w - 72},duration:${(D - 1.6).toFixed(2)},ease:"none"},0.60);`;
  }
  js += `
tl.to("#${id}card",{opacity:0,duration:0.35,ease:"power2.in"},${(D - 0.40).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// Two states side by side, both visible at the end. Never two separate cards.
function splitCard(id, start, end, opts) {
  const D = +(end - start).toFixed(2), at = rel(start);
  const { L, R, w = 724, x = 96, y = 300 } = opts;
  const col = (side, o, idp) => `
    <div style="flex:1">
      <div id="${idp}t" class="capt eyebrow muted" style="font-size:20px;margin-bottom:16px;opacity:0">${o.title}</div>
      ${o.rows.map((r, i) => `<div id="${idp}r${i}" class="med" style="font-size:26px;line-height:1.5;opacity:0">${r.text}</div>`).join("\n      ")}
    </div>`;
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:${w}px;
       padding:30px 36px;opacity:0">
    <div style="display:flex;gap:30px;align-items:flex-start">
      ${col("L", L, id + "L")}
      <div id="${id}div" style="width:2px;align-self:stretch;background:${C.rule};opacity:0"></div>
      ${col("R", R, id + "R")}
    </div>
    <div id="${id}rule" class="accentbar" style="margin-top:22px;width:0;height:3px"></div>
  </div>
</section>`;
  let js = `
tl.fromTo("#${id}card",{opacity:0,y:18},{opacity:1,y:0,duration:0.45,ease:"power3.out"},0.00);
tl.fromTo("#${id}div",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},0.35);
tl.fromTo("#${id}Lt",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},0.30);
tl.fromTo("#${id}Rt",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},0.45);`;
  L.rows.forEach((r, i) => { js += `\ntl.fromTo("#${id}Lr${i}",{opacity:0,x:-12},{opacity:1,x:0,duration:0.38,ease:"power3.out"},${at(r.t)});`; });
  R.rows.forEach((r, i) => { js += `\ntl.fromTo("#${id}Rr${i}",{opacity:0,x:12},{opacity:1,x:0,duration:0.38,ease:"power3.out"},${at(r.t)});`; });
  js += `\ntl.fromTo("#${id}rule",{width:0},{width:${w - 72},duration:${Math.min(D - 1.2, 6).toFixed(2)},ease:"power1.inOut"},${(D * 0.45).toFixed(2)});
tl.to("#${id}card",{opacity:0,duration:0.35,ease:"power2.in"},${(D - 0.40).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// A number that COUNTS UP and lands ON the spoken figure. Never appears already
// finished: a count-up that completes before the number is said is a spoiler,
// and one that finishes at 6s of a 19s beat is a frozen frame for 13 seconds.
function statCard(id, start, end, opts) {
  const D = +(end - start).toFixed(2), at = rel(start);
  const { from = 0, to, unit = "", label, sub = "", cue, w = 560, x = 96, y = 340 } = opts;
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:${w}px;
       padding:32px 38px;opacity:0">
    <div id="${id}eb" class="capt eyebrow muted" style="font-size:21px;margin-bottom:14px;opacity:0">${label}</div>
    <div style="display:flex;align-items:baseline;gap:12px">
      <div id="${id}n" class="disp" style="font-size:160px;line-height:1">${from}</div>
      ${unit ? `<div id="${id}u" class="disp" style="font-size:64px;opacity:0">${unit}</div>` : ""}
    </div>
    <div id="${id}rule" class="accentbar" style="margin-top:10px;width:0;height:4px"></div>
    ${sub ? `<div id="${id}sub" class="med muted" style="font-size:26px;margin-top:16px;opacity:0">${sub}</div>` : ""}
  </div>
</section>`;
  let js = `
tl.fromTo("#${id}card",{opacity:0,y:18},{opacity:1,y:0,duration:0.45,ease:"power3.out"},0.00);
tl.fromTo("#${id}eb",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},0.22);
// counts INTO the spoken number and settles on it
tl.fromTo("#${id}n",{innerText:${from}},{innerText:${to},duration:1.10,ease:"power2.out",
  snap:{innerText:1},onUpdate:function(){}},${(at(cue) - 0.9).toFixed(2)});`;
  if (unit) js += `\ntl.fromTo("#${id}u",{opacity:0},{opacity:1,duration:0.30,ease:"power2.out"},${at(cue).toFixed(2)});`;
  js += `\ntl.fromTo("#${id}rule",{width:0},{width:${w - 76},duration:0.55,ease:"power2.out"},${(at(cue) + 0.15).toFixed(2)});`;
  if (sub) js += `\ntl.fromTo("#${id}sub",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${(at(cue) + 0.35).toFixed(2)});`;
  js += `
tl.to("#${id}card",{opacity:0,duration:0.35,ease:"power2.in"},${(D - 0.40).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// A chip. Small, one accent dot, out of the screen's way.
function chip(id, start, end, label) {
  const D = +(end - start).toFixed(2);
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}c" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;
       padding:16px 26px;display:flex;align-items:center;gap:14px;opacity:0">
    <div class="accentbar" style="width:12px;height:12px;border-radius:50%"></div>
    <div class="capt" style="font-size:30px;letter-spacing:.04em">${label}</div>
  </div>
</section>`;
  const js = `
tl.fromTo("#${id}c",{opacity:0,x:-24},{opacity:1,x:0,duration:0.38,ease:"power3.out"},0.10);
tl.to("#${id}c",{opacity:0,duration:0.30,ease:"power2.in"},${(D - 0.36).toFixed(2)});
tl.set("#${id}c",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// A headline card. Type IS the content here, which is the only case that earns one.
function bigCard(id, start, end, opts) {
  const D = +(end - start).toFixed(2), at = rel(start);
  const { eyebrow = "", headline, sub = "", cue, size = 100, w = 724, x = 96, y = 330 } = opts;
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:${w}px;
       padding:34px 40px;opacity:0">
    ${eyebrow ? `<div id="${id}eb" class="capt eyebrow muted" style="font-size:21px;margin-bottom:16px;opacity:0">${eyebrow}</div>` : ""}
    <div id="${id}h" class="disp" style="font-size:${size}px;line-height:1.08;
         clip-path:inset(0 100% 0 0)">${headline}</div>
    <div id="${id}rule" class="accentbar" style="margin-top:18px;width:0;height:4px"></div>
    ${sub ? `<div id="${id}sub" class="med muted" style="font-size:27px;margin-top:18px;opacity:0">${sub}</div>` : ""}
  </div>
</section>`;
  const c = cue === undefined ? 0.35 : at(cue);
  let js = `
tl.fromTo("#${id}card",{opacity:0,y:18},{opacity:1,y:0,duration:0.45,ease:"power3.out"},0.00);`;
  if (eyebrow) js += `\ntl.fromTo("#${id}eb",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},0.22);`;
  // stepped clip-path wipe, never per-character spans: a fixed advance width
  // breaks the font's real metrics and splits words at narrow letters.
  js += `\ntl.fromTo("#${id}h",{clipPath:"inset(0 100% 0 0)"},
  {clipPath:"inset(0 0% 0 0)",duration:0.85,ease:"steps(14)"},${Math.max(c, 0.3).toFixed(2)});
tl.fromTo("#${id}rule",{width:0},{width:${w - 80},duration:0.60,ease:"power2.out"},${(Math.max(c, 0.3) + 0.5).toFixed(2)});`;
  if (sub) js += `\ntl.fromTo("#${id}sub",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${(Math.max(c, 0.3) + 0.75).toFixed(2)});`;
  js += `
tl.to("#${id}card",{opacity:0,duration:0.35,ease:"power2.in"},${(D - 0.40).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// ------------------------------------------------------------------ parts ---

// g004 TACIT KNOWLEDGE. Builds only on its cues: the old version put the drawing
// up 20s early and let it sit. Two sources feed INTO the words "tacit knowledge"
// in $accent, and a dashed path then leaves them for the model and never arrives.
// The model is the brain in a jar, the series motif, reused not redrawn.
{
  const id = "g004", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:724px;height:470px;
       padding:34px;opacity:0">
    <svg width="656" height="402" viewBox="0 0 656 402" fill="none" style="position:absolute;left:34px;top:34px">
      <path id="${id}c1" d="M28 78 H120 Q186 78 200 168" stroke="${dim(id)}" stroke-width="2.8"
            fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke-linecap="round"/>
      <path id="${id}c2" d="M28 330 H120 Q186 330 200 240" stroke="${dim(id)}" stroke-width="2.8"
            fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" stroke-linecap="round"/>
      <text id="${id}l1" x="28" y="58" fill="${dim(id)}" font-family="Satoshi" font-size="21"
            font-variation-settings="'wght' 500" opacity="0">Years At The Organization</text>
      <text id="${id}l2" x="28" y="360" fill="${dim(id)}" font-family="Satoshi" font-size="21"
            font-variation-settings="'wght' 500" opacity="0">Pipelines Debugged</text>
      <text id="${id}tk1" x="212" y="196" fill="${C.accent}" font-family="Satoshi" font-size="38"
            font-variation-settings="'wght' 900" opacity="0" clip-path="inset(0 100% 0 0)">tacit</text>
      <text id="${id}tk2" x="212" y="240" fill="${C.accent}" font-family="Satoshi" font-size="38"
            font-variation-settings="'wght' 900" opacity="0" clip-path="inset(0 100% 0 0)">knowledge</text>
      <path id="${id}gap" d="M392 214 H446" stroke="${C.accent}" stroke-width="3.4" stroke-linecap="round"
            stroke-dasharray="20 18" stroke-dashoffset="0" opacity="0"/>
      <path id="${id}stop" d="M458 184 V246" stroke="${dim(id)}" stroke-width="3.4"
            stroke-linecap="round" stroke-dasharray="6 7" opacity="0"/>
      <text id="${id}never" x="392" y="286" fill="${dim(id)}" font-family="Satoshi" font-size="19"
            font-variation-settings="'wght' 500" opacity="0">never arrives</text>
    </svg>
    ${brainInJar(id + "bj", 520, 132, 0.48)}
  </div>
</section>`;
  const js = `
tl.fromTo("#${id}card",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},0.00);
tl.set("#${id}bj",{opacity:0},0);
// "tacit knowledge" draws first, in accent, and everything else feeds into it
tl.fromTo("#${id}tk1",{opacity:1,clipPath:"inset(0 100% 0 0)"},
  {opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.55,ease:"steps(6)"},${at(108.52)});
tl.fromTo("#${id}tk2",{opacity:1,clipPath:"inset(0 100% 0 0)"},
  {opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.65,ease:"steps(10)"},${at(109.15)});
tl.fromTo("#${id}c1",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.00,ease:"power2.inOut"},${at(112.31)});
tl.fromTo("#${id}l1",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(112.60)});
tl.fromTo("#${id}c2",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.00,ease:"power2.inOut"},${at(117.61)});
tl.fromTo("#${id}l2",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(117.90)});
// the model arrives, drawn, and the knowledge never reaches it
tl.set("#${id}bj",{opacity:1},${at(122.91)});
tl.fromTo("#${id}bj-jar .o",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.10,ease:"power2.inOut"},${at(122.91)});
tl.fromTo("#${id}bj-jar .m",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.55,ease:"power2.inOut"},${at(123.80)});
tl.fromTo("#${id}bj-brain .o",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.20,ease:"power2.inOut"},${at(123.40)});
tl.fromTo("#${id}bj-brain .s",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.50,ease:"power2.inOut"},${at(124.00)});
tl.fromTo("#${id}gap",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},${at(126.20)});
tl.fromTo("#${id}stop",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},${at(127.20)});
tl.fromTo("#${id}never",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(128.20)});
// CONTINUOUS: the dash keeps trying and never lands
tl.fromTo("#${id}gap",{strokeDashoffset:0},{strokeDashoffset:-760,duration:${(D - at(126.2) - 0.9).toFixed(2)},ease:"none"},${at(126.20)});
tl.to("#${id}card",{opacity:0,duration:0.40,ease:"power2.in"},${(D - 0.45).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// g005 TWO EXPERIMENTS. Sets up the whole demo.
splitCard("g005", ...span("g005"), {
  L: { title: "RUN A", rows: [{ t: 178.6, text: "bare repo" }, { t: 180.2, text: "sample data" }, { t: 181.8, text: "basic requirements" }] },
  R: { title: "RUN B", rows: [{ t: 190.3, text: "same repo" }, { t: 191.76, text: "CONVENTIONS.md" }, { t: 193.2, text: "STANDARDS.md" }] },
});

chip("g006", ...span("g006"), "RUN A &nbsp;·&nbsp; bare repo");

// g007 annotation anchored to the real terminal output
{
  const id = "g007", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}c" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:520px;
       padding:22px 30px;opacity:0">
    <div class="capt eyebrow muted" style="font-size:20px;margin-bottom:10px">it says</div>
    <div class="disp" style="font-size:44px;line-height:1.15">6 tests. 6 passed.</div>
    <div id="${id}sub" class="med muted" style="font-size:25px;margin-top:12px;opacity:0">I check it anyway</div>
    <div id="${id}r" class="accentbar" style="margin-top:14px;width:0;height:3px"></div>
  </div>
</section>`;
  const js = `
tl.fromTo("#${id}c",{opacity:0,y:16},{opacity:1,y:0,duration:0.42,ease:"power3.out"},0.15);
tl.fromTo("#${id}r",{width:0},{width:200,duration:0.50,ease:"power2.out"},0.70);
tl.fromTo("#${id}sub",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(345.0)});
tl.to("#${id}c",{opacity:0,duration:0.32,ease:"power2.in"},${(D - 0.38).toFixed(2)});
tl.set("#${id}c",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// g009 what it wrote vs what a data engineer expects
splitCard("g009", ...span("g009"), {
  L: { title: "WHAT IT WROTE", rows: [{ t: 437.0, text: "read_csv(&#39;*.csv&#39;)" }, { t: 439.0, text: "one shape only" }, { t: 441.5, text: "job fails on drift" }] },
  R: { title: "WHAT A DATA ENGINEER EXPECTS", rows: [{ t: 448.0, text: "union_by_name = true" }, { t: 451.0, text: "all_varchar = true" }, { t: 454.0, text: "test it, do not fail it" }] },
});

bigCard("g011", ...span("g011"), { eyebrow: "run a", headline: "The biggest miss", size: 92 });

// g012 HISTORY OVERWRITTEN. Run A's cardinal failure, and the strongest drawn
// beat in the video. 38s, so the ring never stops turning.
{
  const id = "g012", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:724px;height:490px;
       padding:34px;opacity:0">
    <svg width="656" height="422" viewBox="0 0 656 422" fill="none" style="position:absolute;left:34px;top:34px">
      <circle id="${id}ring" cx="196" cy="206" r="152" stroke="${dim(id)}" stroke-opacity="0.45" stroke-width="3" fill="none"
              stroke-dasharray="955" stroke-dashoffset="955"/>
      <circle id="${id}dot" cx="196" cy="206" r="152" stroke="${C.accent}" stroke-width="8" fill="none"
              stroke-linecap="round" stroke-dasharray="18 937" stroke-dashoffset="0" opacity="0"/>
      <text x="196" y="196" text-anchor="middle" fill="${dim(id)}" font-family="Satoshi" font-size="25"
            font-variation-settings="'wght' 500" id="${id}t1" opacity="0">new data arrives</text>
      <text x="196" y="230" text-anchor="middle" fill="${dim(id)}" font-family="Satoshi" font-size="25"
            font-variation-settings="'wght' 500" id="${id}t2" opacity="0">old data is gone</text>
      <g id="${id}rows" opacity="0">
        <rect x="392" y="150" width="220" height="46" rx="4" stroke="${fg(id)}" stroke-width="3" fill="none"/>
        <text x="412" y="180" fill="${fg(id)}" font-family="Satoshi" font-size="22"
              font-variation-settings="'wght' 500">row, today</text>
      </g>
      <g id="${id}ghost" opacity="0">
        <rect x="392" y="212" width="220" height="46" rx="4" stroke="${dim(id)}" stroke-opacity="0.45" stroke-width="2.5"
              stroke-dasharray="7 7" fill="none"/>
        <rect x="392" y="272" width="220" height="46" rx="4" stroke="${dim(id)}" stroke-opacity="0.45" stroke-width="2.5"
              stroke-dasharray="7 7" fill="none"/>
      </g>
      <text x="392" y="358" fill="${dim(id)}" font-family="Satoshi" font-size="21"
            font-variation-settings="'wght' 500" id="${id}kept" opacity="0">rows kept: 1</text>
    </svg>
  </div>
</section>`;
  const js = `
tl.fromTo("#${id}card",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},0.00);
tl.fromTo("#${id}ring",{strokeDashoffset:754,opacity:1},{strokeDashoffset:0,opacity:1,duration:1.10,ease:"power2.inOut"},0.25);
tl.fromTo("#${id}rows",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},${at(526.0)});
tl.fromTo("#${id}t1",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(527.98)});
tl.fromTo("#${id}t2",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(530.4)});
// the ghosts are the history that never gets written
tl.fromTo("#${id}ghost",{opacity:0},{opacity:1,duration:0.55,ease:"power2.out"},${at(534.56)});
tl.fromTo("#${id}kept",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(536.2)});
// CONTINUOUS MOTION: the dot goes round for the whole beat and never stops,
// because the loop never stops either. ONE accent element.
tl.fromTo("#${id}dot",{opacity:0},{opacity:1,duration:0.50,ease:"none"},1.30);
tl.fromTo("#${id}dot",{strokeDashoffset:0},{strokeDashoffset:-6685,duration:${(D - 1.9).toFixed(2)},ease:"none"},1.30);
tl.to("#${id}card",{opacity:0,duration:0.40,ease:"power2.in"},${(D - 0.45).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// g013 THE ONLY DIFFERENCE. The hinge of the whole video.
{
  const id = "g013", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const same = ["dbt_project.yml", "profiles.yml", "models/", "seeds/", "tests/", "README.md", "AGENTS.md"];
  const rowsMk = same.map((f, i) =>
    `<div id="${id}s${i}" class="med" style="font-size:25px;line-height:1.6;opacity:0">${f}</div>`).join("\n      ");
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:724px;
       padding:30px 36px;opacity:0">
    <div id="${id}eb" class="capt eyebrow muted" style="font-size:21px;margin-bottom:18px;opacity:0">run a &nbsp;vs&nbsp; run b</div>
    ${rowsMk}
    <div id="${id}d1" class="med" style="font-size:29px;line-height:1.6;opacity:0">CONVENTIONS.md</div>
    <div id="${id}d2" class="med" style="font-size:29px;line-height:1.6;opacity:0">STANDARDS.md</div>
    <div id="${id}rule" class="accentbar" style="margin-top:16px;width:0;height:4px"></div>
  </div>
</section>`;
  let js = `
tl.fromTo("#${id}card",{opacity:0,y:18},{opacity:1,y:0,duration:0.45,ease:"power3.out"},0.00);
tl.fromTo("#${id}eb",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},0.22);`;
  same.forEach((_, i) => {
    js += `\ntl.fromTo("#${id}s${i}",{opacity:0},{opacity:1,duration:0.30,ease:"power2.out"},${(0.6 + i * 0.16).toFixed(2)});`;
  });
  // everything identical recedes; only the two files that differ stay
  js += `\n${same.map((_, i) => `tl.to("#${id}s${i}",{opacity:0.28,duration:0.60,ease:"power2.inOut"},${at(607.01)});`).join("\n")}
tl.fromTo("#${id}d1",{opacity:0,x:-14},{opacity:1,x:0,duration:0.45,ease:"power3.out"},${at(608.97)});
tl.fromTo("#${id}d2",{opacity:0,x:-14},{opacity:1,x:0,duration:0.45,ease:"power3.out"},${at(610.77)});
tl.fromTo("#${id}rule",{width:0},{width:640,duration:${(D - at(610.77) - 2.2).toFixed(2)},ease:"none"},${(at(610.77) + 0.5).toFixed(2)});
tl.to("#${id}card",{opacity:0,duration:0.35,ease:"power2.in"},${(D - 0.40).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

chip("g014", ...span("g014"), "RUN B &nbsp;·&nbsp; rules codified");

statCard("g015", ...span("g015"), { from: 6, to: 12, label: "tests, same repo, same prompt", cue: 707.53, sub: "6 last time. 12 now." });
statCard("g016", ...span("g016"), { from: 0, to: 15, unit: "days", label: "late arrival cutoff", cue: 796.51, sub: "a rule it could not have guessed" });

// g018 ONE OBJECT, TWO STATES. Deliberate callback to g012 so the fix reads
// against the failure rather than beside it.
{
  const id = "g018", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:724px;height:470px;
       padding:34px;opacity:0">
    <svg width="656" height="402" viewBox="0 0 656 402" fill="none" style="position:absolute;left:34px;top:34px">
      <rect x="40" y="60" width="300" height="52" rx="4" stroke="${fg(id)}" stroke-width="3" fill="none"/>
      <text x="60" y="94" fill="${fg(id)}" font-family="Satoshi" font-size="23"
            font-variation-settings="'wght' 500">row, today</text>
      <g id="${id}stack" opacity="0">
        <rect x="40" y="128" width="300" height="52" rx="4" stroke="${fg(id)}" stroke-width="3" fill="none"/>
        <text x="60" y="162" fill="${fg(id)}" font-family="Satoshi" font-size="23"
              font-variation-settings="'wght' 500">row, yesterday</text>
        <rect x="40" y="196" width="300" height="52" rx="4" stroke="${fg(id)}" stroke-width="3" fill="none"/>
        <text x="60" y="230" fill="${fg(id)}" font-family="Satoshi" font-size="23"
              font-variation-settings="'wght' 500">row, the day before</text>
      </g>
      <g id="${id}flag" opacity="0">
        <rect x="368" y="196" width="150" height="52" rx="4" stroke="${C.accent}" stroke-width="3" fill="none"/>
        <text x="386" y="230" fill="${C.accent}" font-family="Satoshi" font-size="21"
              font-variation-settings="'wght' 700">isDeleted</text>
      </g>
      <g id="${id}audit" opacity="0">
        <text x="40" y="300" fill="${dim(id)}" font-family="Satoshi" font-size="21"
              font-variation-settings="'wght' 500">inserted_at</text>
        <text x="40" y="332" fill="${dim(id)}" font-family="Satoshi" font-size="21"
              font-variation-settings="'wght' 500">updated_at</text>
        <text x="40" y="364" fill="${dim(id)}" font-family="Satoshi" font-size="21"
              font-variation-settings="'wght' 500">stg_account_key</text>
      </g>
      <path id="${id}scan" d="M40 386 H616" stroke="${dim(id)}" stroke-opacity="0.45" stroke-width="2"
            stroke-dasharray="60 1100" stroke-dashoffset="0" opacity="0"/>
    </svg>
  </div>
</section>`;
  const js = `
tl.fromTo("#${id}card",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},0.00);
// instead of overwriting, it STACKS. same object as g012, different behaviour.
tl.fromTo("#${id}stack",{opacity:0,y:-30},{opacity:1,y:0,duration:0.70,ease:"power3.out"},${at(968.5)});
tl.fromTo("#${id}flag",{opacity:0},{opacity:1,duration:0.50,ease:"power2.out"},${at(977.29)});
tl.fromTo("#${id}audit",{opacity:0},{opacity:1,duration:0.55,ease:"power2.out"},${at(984.0)});
tl.fromTo("#${id}scan",{opacity:0},{opacity:1,duration:0.50,ease:"none"},2.0);
tl.fromTo("#${id}scan",{strokeDashoffset:0},{strokeDashoffset:-4640,duration:${(D - 2.6).toFixed(2)},ease:"none"},2.0);
tl.to("#${id}card",{opacity:0,duration:0.40,ease:"power2.in"},${(D - 0.45).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// g019 THE SAME FOUR OR FIVE MISTAKES, struck through once the standards land.
rowsCard("g019", ...span("g019"), {
  eyebrow: "without the standards, every time",
  fs: 32,
  rows: [
    { t: 1066.0, text: "no union_by_name" },
    { t: 1069.0, text: "no surrogate key" },
    { t: 1072.0, text: "no audit columns" },
    { t: 1082.06, text: "no history at all" },
  ],
  strike: [
    { t: 1092.0, i: 0, w: 300 }, { t: 1095.0, i: 1, w: 280 },
    { t: 1098.0, i: 2, w: 290 }, { t: 1101.0, i: 3, w: 270 },
  ],
});

rowsCard("g020", ...span("g020"), {
  eyebrow: "but we have years of this",
  fs: 32,
  rows: [
    { t: 1155.86, text: "bug fixes in Jira" },
    { t: 1157.56, text: "Confluence pages" },
    { t: 1161.86, text: "Slack threads" },
    { t: 1164.5, text: "and nobody has time" },
  ],
});

// g021 the two files, and they are the reusable takeaway of the video
bigCard("g021", ...span("g021"), {
  eyebrow: "what I actually wrote",
  headline: "Two files.",
  sub: "CONVENTIONS.md for the business rules. STANDARDS.md for the design.",
  cue: 1188.02, size: 92,
});

// g022 IT ALREADY KNOWS, then one gap opens and fills itself with a guess
rowsCard("g022", ...span("g022"), {
  eyebrow: "it already knows",
  fs: 32,
  rows: [
    { t: 1209.34, text: "Kimball" },
    { t: 1210.48, text: "Inmon" },
    { t: 1212.72, text: "slowly changing dimensions" },
    { t: 1214.14, text: "how warehouses hold history" },
    { t: 1224.03, text: "&hellip; and it guesses the rest" },
  ],
  strike: [{ t: 1225.5, i: 4, w: 360 }],
});

statCard("g023", ...span("g023"), { from: 0, to: 7, label: "things it knew were missing", cue: 1302.75, sub: "it just had to be asked" });

bigCard("g024", ...span("g024"), {
  eyebrow: "the open question",
  headline: "How does it know its own blind spots?",
  cue: 1358.73, size: 72,
});

rowsCard("g025", ...span("g025"), {
  eyebrow: "what it was trained on",
  fs: 30,
  rows: [
    { t: 1391.6, text: "Coding Standards" },
    { t: 1392.88, text: "ETL Mapping Documents" },
    { t: 1395.19, text: "Source-to-Target Mappings" },
    { t: 1398.91, text: "Data Models" },
    { t: 1405.14, text: "Schema Definitions" },
    { t: 1410.14, text: "Kimball, Inmon, Best Practices" },
  ],
});

// g026 THE FORK. The mechanism sentence of the entire video.
{
  const id = "g026", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:724px;height:470px;
       padding:34px;opacity:0">
    <svg width="656" height="402" viewBox="0 0 656 402" fill="none" style="position:absolute;left:34px;top:34px">
      <circle cx="70" cy="201" r="13" fill="${C.ink}"/>
      <path id="${id}pa" d="M84 201 H250 Q300 201 300 128 H560" stroke="${C.muted}" stroke-width="3"
            fill="none" stroke-dasharray="560" stroke-dashoffset="560"/>
      <path id="${id}pb" d="M84 201 H250 Q300 201 300 278 H560" stroke="${C.accent}" stroke-width="3.5"
            fill="none" stroke-dasharray="560" stroke-dashoffset="560"/>
      <text x="316" y="110" fill="${C.muted}" font-family="Satoshi" font-size="22"
            font-variation-settings="'wght' 500" id="${id}la" opacity="0">sees a gap, fills it</text>
      <text x="316" y="262" fill="${C.ink}" font-family="Satoshi" font-size="22"
            font-variation-settings="'wght' 700" id="${id}lb" opacity="0">is asked, and tells you</text>
      <g id="${id}ga" opacity="0">
        <rect x="472" y="140" width="86" height="34" rx="4" stroke="${C.muted}" stroke-width="2.5"
              stroke-dasharray="6 6" fill="none"/>
      </g>
      <g id="${id}gb" opacity="0">
        <rect x="472" y="290" width="86" height="34" rx="4" stroke="${C.accent}" stroke-width="2.5" fill="none"/>
      </g>
    </svg>
  </div>
</section>`;
  const js = `
tl.fromTo("#${id}card",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},0.00);
tl.fromTo("#${id}pa",{strokeDashoffset:560,opacity:1},{strokeDashoffset:0,opacity:1,duration:1.30,ease:"power2.inOut"},${at(1441.72)});
tl.fromTo("#${id}la",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(1443.2)});
tl.fromTo("#${id}ga",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(1444.2)});
tl.fromTo("#${id}pb",{strokeDashoffset:560,opacity:1},{strokeDashoffset:0,opacity:1,duration:1.30,ease:"power2.inOut"},${at(1447.08)});
tl.fromTo("#${id}lb",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(1448.6)});
tl.fromTo("#${id}gb",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(1449.6)});
// both paths visible at the end; the taken one is the accent
tl.to("#${id}card",{opacity:0,duration:0.40,ease:"power2.in"},${(D - 0.45).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// g027 DEFINITION CARD. Credits the field, claims the application. No date: that
// absence is the human's decision, recorded 2026-09-08. Do not add one.
{
  const id = "g027", [S, E] = span(id), D = +(E - S).toFixed(2);
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:724px;
       padding:34px 40px;opacity:0">
    <div id="${id}h" class="disp" style="font-size:64px;line-height:1.1;
         clip-path:inset(0 100% 0 0)">knowledge elicitation</div>
    <div id="${id}p" class="med muted" style="font-size:22px;margin-top:8px;opacity:0">/&#618;&#716;l&#618;s&#618;&#712;te&#618;&#643;&#601;n/</div>
    <div id="${id}rule" class="accentbar" style="margin-top:16px;width:0;height:4px"></div>
    <div id="${id}pos" class="med muted" style="font-size:24px;margin-top:16px;opacity:0">noun &nbsp;·&nbsp; knowledge engineering</div>
    <div id="${id}d" class="med" style="font-size:34px;line-height:1.3;margin-top:14px;opacity:0">
      Drawing out what an expert knows<br/>but has never written down.</div>
    <div id="${id}a" class="med muted" style="font-size:26px;line-height:1.35;margin-top:18px;opacity:0">
      Applied here to an AI agent, which will<br/>list its own blind spots if you ask it to.</div>
  </div>
</section>`;
  const js = `
tl.fromTo("#${id}card",{opacity:0,y:16},{opacity:1,y:0,duration:0.40,ease:"power3.out"},0.00);
tl.fromTo("#${id}h",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.70,ease:"steps(16)"},0.18);
tl.fromTo("#${id}p",{opacity:0},{opacity:1,duration:0.30,ease:"power2.out"},0.62);
tl.fromTo("#${id}rule",{width:0},{width:640,duration:0.55,ease:"power2.out"},0.72);
tl.fromTo("#${id}pos",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},0.95);
tl.fromTo("#${id}d",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},1.25);
tl.fromTo("#${id}a",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},2.20);
tl.to("#${id}card",{opacity:0,duration:0.32,ease:"power2.in"},${(D - 0.38).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// g028 KNOWLEDGE ELICITATION, full frame. Rebuilt: the previous version redrew
// the architect and conveyed nothing at all. This one shows the MECHANISM the
// phrase names, and closes g003 by reusing its gaps.
//
// Three slots sit between the architect (left, the skyline of work he has already
// done) and the model (right, the brain in a jar). Both already hold the answer.
// Nobody asks, so both fill the slots with a guess. Then the ask arrives and the
// guesses become the real values. Same gap, same failure, same fix.
{
  const id = "g028", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const SLOTS = [
    ["Client&rsquo;s taste", "modern, probably", "Greek classical"],
    ["Firm&rsquo;s style",   "anything goes",    "classical only"],
    ["Past work",            "none on file",     "the binder of it"],
  ];
  const slotMk = SLOTS.map(([label, guess, real], i) => {
    const y = 402 + i * 116;
    return `
    <div id="${id}sl${i}" style="position:absolute;left:606px;top:${y}px;width:700px;opacity:0">
      <div class="med" style="position:absolute;left:0;top:16px;font-size:30px;color:${C.muted}">${label}</div>
      <div style="position:absolute;left:330px;top:0;width:370px;height:70px;
           border:2px dashed ${C.rule};border-radius:5px"></div>
      <div id="${id}gs${i}" class="med" style="position:absolute;left:354px;top:16px;font-size:30px;
           color:${C.muted};opacity:0">${guess}</div>
      <div id="${id}rl${i}" class="med" style="position:absolute;left:354px;top:16px;font-size:30px;
           color:${C.accent};font-variation-settings:'wght' 700;opacity:0">${real}</div>
    </div>`;
  }).join("");
  // MEASURED off the rendered art, not read off the code and not eyeballed:
  // the skyline's ink spans canvas x186-439 and the jar's x1459-1694.
  //   SKY_CX 312, JAR_CX 1576.
  // The labels are centred on those with translateX(-50%), so they stay centred
  // whatever the text width, and they sit BELOW the ground line at y700. They were
  // briefly moved to y686 to clear the accent ticks and landed inside the skyline;
  // the ticks are what had to move, not the labels.
  const SKY_CX = 312, JAR_CX = 1576;
  const LABEL_Y = 742;              // ground line is 700; buildings live above it
  const TICK_TOP = 782;             // label ink ends ~772, so the tick stops clear
  const SKY = [
    "M188 700 V648 L218 626 L248 648 V700",
    "M260 700 V616 H312 V700",
    "M324 700 V560 H366 V700",
    "M378 700 V600 H438 V700",
  ].map((d, i) => `<path id="${id}sk${i}" d="${d}" stroke="${C.muted}" stroke-width="3.4"
        fill="none" stroke-linejoin="round" opacity="0"/>`).join("\n      ");
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div style="position:absolute;inset:0;background:${C.bg}"></div>
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" style="position:absolute;left:0;top:0">
    <path d="M140 700 H520" stroke="${C.rule}" stroke-width="3" stroke-linecap="round"/>
    ${SKY}
    <path id="${id}ask" d="M250 812 H1580" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"
          pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <path id="${id}up1" d="M${SKY_CX} 812 V${TICK_TOP}" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" opacity="0"/>
    <path id="${id}up2" d="M${JAR_CX} 812 V${TICK_TOP}" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" opacity="0"/>
  </svg>
  <div id="${id}la" class="capt eyebrow" style="position:absolute;left:${SKY_CX}px;top:${LABEL_Y}px;
       transform:translateX(-50%);font-size:24px;white-space:nowrap;
       color:${C.muted};opacity:0">the architect</div>
  <div id="${id}lm" class="capt eyebrow" style="position:absolute;left:${JAR_CX}px;top:${LABEL_Y}px;
       transform:translateX(-50%);font-size:24px;white-space:nowrap;
       color:${C.muted};opacity:0">the model</div>
  ${slotMk}
  ${brainInJar(id + "bj", 1430, 330, 0.92)}
  <div id="${id}asklb" class="capt eyebrow" style="position:absolute;left:880px;top:836px;font-size:26px;
       color:${C.accent};opacity:0">ask</div>
  <div id="${id}ke" class="disp" style="position:absolute;left:606px;top:900px;font-size:64px;
       color:${C.accent};clip-path:inset(0 100% 0 0)">knowledge elicitation</div>
</section>`;
  // Build-time geometry guard, so a nudge cannot silently land on the art again.
  assertCentred(id, "the architect label", SKY_CX, 312);
  assertCentred(id, "the model label", JAR_CX, 1576);
  assertClear(id, [
    textBox("the architect", SKY_CX, LABEL_Y, 24),
    textBox("the model", JAR_CX, LABEL_Y, 24),
    { t: "skyline", x0: 186, x1: 439, y0: 540, y1: 700 },
    { t: "jar", x0: 1459, x1: 1694, y0: 340, y1: 698 },
    // The ask rule is deliberately NOT in this set: the two ticks rise out of it,
    // so they touch it by design and asserting on that pair only produces a false
    // failure. What matters is that the ticks stay clear of the labels and the art.
    { t: "tick left", x0: SKY_CX - 4, x1: SKY_CX + 4, y0: TICK_TOP, y1: 806 },
    { t: "tick right", x0: JAR_CX - 4, x1: JAR_CX + 4, y0: TICK_TOP, y1: 806 },
  ]);

  const js = `
// both sides appear, each already holding everything it knows
tl.fromTo("#${id}la",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(1495.0)});
tl.fromTo("#${id}lm",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(1507.3)});
tl.set("#${id}bj",{opacity:0},0);
${[0,1,2,3].map(i => `tl.fromTo("#${id}sk${i}",{opacity:0,scaleY:0,svgOrigin:"0 700"},{opacity:1,scaleY:1,duration:0.40,ease:"power3.out",svgOrigin:"0 700"},${at(1497.1 + i * 0.42)});`).join("\n")}
// "since we did not ask them" -> the slots are there, and they are empty
${SLOTS.map((_, i) => `tl.fromTo("#${id}sl${i}",{opacity:0,y:12},{opacity:1,y:0,duration:0.42,ease:"power3.out"},${at(1502.1 + i * 0.34)});`).join("\n")}
// "they just fill in the gaps" -> a guess in every one of them
${SLOTS.map((_, i) => `tl.fromTo("#${id}gs${i}",{opacity:0},{opacity:1,duration:0.34,ease:"power2.out"},${at(1506.3 + i * 0.26)});`).join("\n")}
// "AI models behave the same way" -> the jar draws, same slots, same gap
tl.set("#${id}bj",{opacity:1},${at(1507.3)});
tl.fromTo("#${id}bj-jar .o",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.10,ease:"power2.inOut"},${at(1507.3)});
tl.fromTo("#${id}bj-jar .m",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.55,ease:"power2.inOut"},${at(1508.2)});
tl.fromTo("#${id}bj-brain .o",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.10,ease:"power2.inOut"},${at(1507.8)});
tl.fromTo("#${id}bj-brain .s",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.40,ease:"power2.inOut"},${at(1508.6)});
// "but unless we ask" -> the ask runs to both of them
tl.fromTo("#${id}ask",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.10,ease:"power2.inOut"},${at(1512.3)});
tl.fromTo("#${id}asklb",{opacity:0},{opacity:1,duration:0.35,ease:"power2.out"},${at(1512.7)});
tl.fromTo("#${id}up1",{opacity:0},{opacity:1,duration:0.30,ease:"power2.out"},${at(1513.1)});
tl.fromTo("#${id}up2",{opacity:0},{opacity:1,duration:0.30,ease:"power2.out"},${at(1513.1)});
// and the guesses become the real thing
${SLOTS.map((_, i) => `tl.to("#${id}gs${i}",{opacity:0,duration:0.30,ease:"power2.in"},${at(1513.6 + i * 0.30)});
tl.fromTo("#${id}rl${i}",{opacity:0,x:-10},{opacity:1,x:0,duration:0.40,ease:"power3.out"},${at(1513.8 + i * 0.30)});`).join("\n")}
// the phrase lands as the answer, not as a label
tl.fromTo("#${id}ke",{clipPath:"inset(0 100% 0 0)"},
  {clipPath:"inset(0 0% 0 0)",duration:0.95,ease:"steps(20)"},${at(1517.1)});`;
  emit(id, D, body, js);
}

// g029 VERDICT. Biggest type in the video, heroLeft, answers the hook.
{
  // VERDICT. Two movements, each landing on its own spoken cue:
  // "already knows its blind spot" 1316.08, "You just have to ask it" 1318.00.
  // It sits inside the demo window now, so it is an opaque card over the screen.
  const id = "g029", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:724px;
       padding:36px 42px;opacity:0">
    <div id="${id}h1" class="disp" style="font-size:82px;line-height:1.06;clip-path:inset(0 100% 0 0)">It already knows.</div>
    <div id="${id}h2" class="disp" style="font-size:82px;line-height:1.06;margin-top:6px;clip-path:inset(0 100% 0 0)">You just have to ask.</div>
    <div id="${id}rule" class="accentbar" style="margin-top:22px;width:0;height:5px"></div>
  </div>
</section>`;
  const js = `
tl.fromTo("#${id}card",{opacity:0,y:18},{opacity:1,y:0,duration:0.45,ease:"power3.out"},${Math.max(at(1315.9),0).toFixed(2)});
tl.fromTo("#${id}h1",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.70,ease:"steps(12)"},${at(1316.08)});
tl.fromTo("#${id}h2",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.75,ease:"steps(14)"},${at(1318.00)});
tl.fromTo("#${id}rule",{width:0},{width:640,duration:0.70,ease:"power2.out"},${at(1318.9)});
tl.to("#${id}card",{opacity:0,duration:0.38,ease:"power2.in"},${(D-0.42).toFixed(2)});
tl.set("#${id}card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

// g030 END CARD. An OVERLAY beside the face: the footage never cuts away. Rows
// accumulate on their own spoken cues and none of them exit. Cue times were
// matched against the CLOSING SECTION only: "repo" fires 22 times earlier in
// this video and "GitHub" itself fires at 3:30.
{
  const id = "g030", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S);
  const ROWS = [
    ["like and subscribe", "@srnudurupati", 1564.43],
    ["github", "github.com/snudurupati", 1565.73],
    ["linkedin", "in/snudurupati", 1566.43],
    ["x", "@srnudurupati", 1567.19],
    ["blog", "nudurupati.co", 1567.19],   // never spoken: noCueFallback, lands with the final cued row
  ];
  const mk = ROWS.map(([l, v], i) => `
      <div id="${id}r${i}" style="overflow:hidden;opacity:0;margin-top:${i ? 22 : 0}px">
        <div class="capt eyebrow muted" style="font-size:23px;line-height:1;margin-bottom:3px">${l}</div>
        <div class="disp" style="font-size:34px;line-height:1.34;padding-bottom:4px;font-variation-settings:'wght' 700">${v}</div>
      </div>`).join("");
  const body = `
<section id="scene-${id}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="${id}card" class="${P(id)}" style="position:absolute;left:${cardX(id)}px;top:${CARD_Y}px;width:584px;
       padding:30px 34px;opacity:0">
    <div id="${id}rule" class="accentbar" style="width:0;height:4px;margin-bottom:22px"></div>
    ${mk}
  </div>
</section>`;
  let js = `
tl.fromTo("#${id}card",{opacity:0,x:-24},{opacity:1,x:0,duration:0.45,ease:"power3.out"},0.00);
tl.fromTo("#${id}rule",{width:0},{width:200,duration:0.50,ease:"power2.out"},0.30);`;
  ROWS.forEach(([, , t], i) => {
    js += `\ntl.fromTo("#${id}r${i}",{opacity:0,y:24},{opacity:1,y:0,duration:0.35,ease:"power3.out"},${at(t + (i === 4 ? 0.18 : 0))});`;
  });
  // holds to the LAST FRAME. no exit: the card is still on screen when the video ends.
  js += `\ntl.set("#${id}card",{opacity:1},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

console.log("done");
