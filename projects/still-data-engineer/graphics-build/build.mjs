// Emits one HyperFrames project per part. Compositions are generated, never
// hand-written per graphic, so a change to the shared look is one edit here.
import fs from "node:fs";
import path from "node:path";
import { C, PANEL, ink, muted, page, HF_JSON, HERE, ROOT } from "./shared.mjs";

const JOB = path.resolve(HERE, "..");
const CUT = JSON.parse(fs.readFileSync(path.join(HERE, "cutsheet.json"), "utf8"));
const PARTS = path.join(HERE, "parts");
const FONTS = path.join(ROOT, "assets", "fonts", "satoshi");

// ---------- small builders -------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Per-letter reveal. CSS blur filters are not render-safe, so the reveal is an
// opacity stagger at the style's 0.045s letter cadence.
const letters = (text, cls) =>
  `<span class="${cls}">` +
  text.split("").map((ch) => ch === " "
    ? `<span class="ltr" style="display:inline-block">&nbsp;</span>`
    : `<span class="ltr" style="display:inline-block">${esc(ch)}</span>`).join("") +
  `</span>`;

// A counter that ticks off timeline position - never a real-time timer.
const counter = (id, to, dur, at) => `
{const el=document.getElementById("${id}");const o={v:0};
 tl.fromTo(o,{v:0},{v:${to},duration:${dur},ease:"power2.out",
   onUpdate:()=>{el.textContent=Math.round(o.v);}},${at});
 tl.set(el,{textContent:"${to}"},${at + dur});}`;

// ---------- parts ----------------------------------------------------------
const B = {};

B.g001 = (p, d) => {                       // hook
  const t = p.panel.treatment;
  // Left column, stacked. The lower band cuts across the jaw on this framing - which is
  // the exact failure the band was introduced to prevent - so hero type moves to the
  // measured negative space instead. Stacking also lets the type stay large in a 744px
  // column. The card enters AFTER the voice so the sound effect, the line and the card
  // are not three simultaneous events at t=0.
  const LINES = ["Can AI", "really replace", "my job?"];
  const html = `
  <div id="card" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;top:236px;width:744px;height:608px;padding:44px 40px">
    <div id="eb" class="eyebrow" style="font-size:26px">AN AI-ASSISTED MODERN DATA STACK</div>
    <div id="hl" class="headline" style="font-size:84px;line-height:1.08;margin-top:26px">
      ${LINES.map((l, i) => `<div class="hl-line">${letters(l, "w" + i)}</div>`).join("")}
    </div>
    <div id="rl" class="rule" style="left:40px;bottom:118px;width:340px"></div>
    <div id="sp" class="support" style="position:absolute;left:40px;bottom:52px;font-size:32px">18 years in data</div>
  </div>`;
  const js = `
  tl.fromTo("#card",{opacity:0,x:-26},{opacity:1,x:0,duration:0.4,ease:"power2.out"},0.9);
  tl.fromTo("#eb",{opacity:0},{opacity:1,duration:0.3},1.05);
  tl.fromTo("#hl .ltr",{opacity:0,y:12},{opacity:1,y:0,duration:0.3,stagger:0.02,ease:"power2.out"},1.2);
  tl.fromTo("#rl",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.out"},2.1);
  tl.fromTo("#sp",{opacity:0},{opacity:1,duration:0.3},2.3);
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g002 = (p, d) => {                       // lower third
  const t = p.panel.treatment;
  const html = `
  <div id="lt" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;top:696px;width:524px;height:160px;padding:24px 30px">
    <div id="nm" class="headline" style="font-size:44px;white-space:nowrap">Sreeram Nudurupati</div>
    <div id="rr" class="eyebrow" style="margin-top:14px">18 years in data</div>
  </div>`;
  const js = `
  tl.fromTo("#lt",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},0);
  tl.fromTo("#nm",{opacity:0},{opacity:1,duration:0.3},0.2);
  tl.fromTo("#rr",{opacity:0},{opacity:1,duration:0.3},0.45);
  tl.set("#lt",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

// The two tweet panels. Real assets, never a redrawn approximation.
//
// These live in the LEFT COLUMN, not the content column. The content column is the
// geometry of a `panel` SCENE, which reframes the face to picture-in-picture first -
// and this job composites the face in FFmpeg, so no reframe happens. A 1008px panel
// centred at x816 therefore sat straight over the speaker's face for the whole beat.
// The left column is the measured negative space in this room and keeps the face full
// frame and clear.
//
// The panel is sized FROM THE ASSET so it can never overflow: a 1154x1128 tweet in a
// 960px content box needs 938px of height in a 936px box, and with no overflow:hidden
// it poked out of the panel and was then cut off by the frame edge.
const tweetPanel = (p, d, src, isVideo, aw, ah) => {
  const t = p.panel.treatment;
  // Sized so the asset lands at 1:1 pixels at 4K delivery - as large as it can be
  // without upscaling past native. The column is wider than style.json's x620 bound
  // because the subject edge on THIS take measures x~900, not the x700 the file
  // assumes: vertical luma strips read 140-165 (wall) out to x820 and only drop to
  // ~100 (subject) at x980. style.md says to re-measure the zones when the framing
  // changes, so they were re-measured.
  const PAD = 24;
  const mw = Math.round(aw / 2);
  const mh = Math.round(ah * mw / aw);
  const COLW = mw + PAD * 2;
  const ph = mh + PAD * 2;
  const top = Math.round((1080 - ph) / 2);
  // The <video> is the timed clip and its wrapper is NOT timed. A <video> with
  // data-start nested inside another element with data-start cannot have its
  // playback managed by the framework - it renders frozen, silently.
  const media = isVideo
    ? `<video id="tw" class="clip" data-start="0" data-duration="${d}" data-track-index="1"
              src="assets/${src}" muted playsinline
              style="width:${mw}px;height:${mh}px;border-radius:8px;display:block"></video>`
    : `<img id="tw" src="assets/${src}" style="width:${mw}px;height:${mh}px;border-radius:8px;display:block"/>`;
  const html = `
  <div id="wrap" style="position:absolute;left:96px;top:${top}px;width:${COLW}px;height:${ph}px">
    <div id="pnl" class="panel${isVideo ? "" : " clip"}"${isVideo ? "" : ` data-start="0" data-duration="${d}" data-track-index="1"`}
         style="left:0;top:0;width:${COLW}px;height:${ph}px;padding:${PAD}px;overflow:hidden">
      ${media}
    </div>
  </div>`;
  // Drift on the WRAPPER div, never on the <video> itself: a transform on a <video> is
  // composited away by the headless renderer, and left/top snap to integer device
  // pixels and stutter under seek-by-frame capture. A transform on the wrapper does
  // neither. Verified by pulling frames and confirming the inner video advances.
  const js = `
  tl.fromTo("#wrap",{opacity:0,x:-28},{opacity:1,x:0,duration:0.4,ease:"power2.out"},0);
  tl.fromTo("#wrap",{scale:1.0},{scale:1.03,duration:${d},ease:"none"},0.4);
  tl.set("#wrap",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g003 = (p, d) => tweetPanel(p, d, "intro-tweet.mp4", true, 1154, 1128);
B.g015 = (p, d) => tweetPanel(p, d, "outro-tweet.png", false, 1208, 460);

// Stat cards. Numbers count up, never appear.
// Positioned absolutely rather than in flow: a 220px number in a 290px band overlaps
// its own label and sub-line, which the layout check caught on all three.
const statCard = (p, d, nums, label, sub) => {
  const cue = p.cues || {};
  const t = p.panel.treatment;
  // The number owns the left of the card and the sub-line sits in the right column
  // rather than under it. Stacking label + 160px number + sub inside a 290px band
  // leaves the glyph box overlapping its own label, which the layout check caught.
  // Laid out in flow, not on a fixed 470px pitch: "8 MODELS" followed by a fixed gap
  // before "119 TESTS" reads as an oversight rather than a decision.
  const cols = nums.map((n, i) => `
    <div style="display:flex;align-items:baseline;gap:14px${i ? ";margin-left:104px" : ""}">
      <div class="stat"><span id="n${i}">0</span></div>
      <div class="unit">${esc(n.unit)}</div>
    </div>`).join("");
  const html = `
  <div id="card" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;top:690px;width:1204px;height:290px">
    <div id="lb" class="label" style="position:absolute;left:44px;top:26px">${esc(label)}</div>
    <div id="rl" class="rule" style="left:44px;top:74px;width:${nums.length > 1 ? 620 : 420}px"></div>
    <div id="row" style="position:absolute;left:44px;top:96px;height:170px;display:flex;align-items:baseline">${cols}</div>
    ${sub ? `<div id="sb" class="sub" style="position:absolute;left:664px;top:120px;width:496px">${esc(sub)}</div>` : ""}
  </div>`;
  let js = `
  tl.fromTo("#card",{opacity:0,y:22},{opacity:1,y:0,duration:0.35,ease:"power2.out"},0);
  tl.fromTo("#lb",{opacity:0},{opacity:1,duration:0.3},0.15);`;
  // Land the count-up's END on the spoken number where there is one, else stagger by
  // the style's 0.4s minimum so two numbers never arrive simultaneously.
  const at = nums.map((n, i) => cue[`n${i}`] != null
    ? Math.max(0.3, +(cue[`n${i}`] - p.start - 1.2).toFixed(2))
    : 0.3 + i * 0.4);
  nums.forEach((n, i) => { js += counter(`n${i}`, n.v, 1.2, at[i]); });
  const lastAt = Math.max(...at) + 1.2;
  js += `
  tl.fromTo("#rl",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.out"},${Math.min(lastAt, 1.5)});`;
  if (sub) js += `
  tl.fromTo("#sb",{opacity:0,x:14},{opacity:1,x:0,duration:0.35,ease:"power2.out"},${Math.min(lastAt + 0.3, 2.6)});`;
  js += `
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g004 = (p, d) => statCard(p, d, [{ v: 40, unit: "TESTS" }], "WRITTEN UNASKED, ALL PASSING", null);
B.g007 = (p, d) => statCard(p, d, [{ v: 41, unit: "MINUTES" }], "WAITING FOR THE AGENT",
  "13 waits · longest 15 minutes · 53% of the recording");
B.g008 = (p, d) => statCard(p, d, [{ v: 8, unit: "MODELS" }, { v: 119, unit: "TESTS" }], "THE STAGING LAYER", null);

// Findings. One vocabulary so the demo reads as a scorecard.
const finding = (p, d, kind, claim, sub, second) => {
  const t = p.panel.treatment;
  const isMiss = kind !== "UNPROMPTED WIN";
  const h = second ? 340 : 230;
  const html = `
  <div id="card" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;top:${980 - h}px;width:1204px;height:${h}px;padding:26px 40px">
    <div id="bar" style="position:absolute;left:0;top:0;bottom:0;width:14px;border-radius:10px 0 0 10px;background:${isMiss ? C.accent : C.ink}"></div>
    ${second ? `<div id="eb0" class="eyebrow" style="color:${ink(t)};font-weight:700">MISS</div>` : ""}
    <div id="eb" class="eyebrow" style="color:${muted(t)};font-weight:700${second ? ";margin-top:12px" : ""}">${esc(kind)}</div>
    <div id="c1" class="claim" style="margin-top:8px">${esc(claim)}</div>
    ${second
      ? `<div id="eb2" class="eyebrow" style="margin-top:14px">THE CONVENTION SAYS</div>
         <div id="c2" class="claim" style="font-size:38px;margin-top:4px">${esc(second)}</div>`
      : `<div id="sb" class="sub" style="margin-top:10px">${esc(sub)}</div>`}
  </div>`;
  let js = `
  tl.fromTo("#card",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},0);
  tl.fromTo("#bar",{scaleY:0},{scaleY:1,duration:0.4,ease:"power3.out",transformOrigin:"bottom"},0.1);
  tl.fromTo("#eb",{opacity:0},{opacity:1,duration:0.3},0.2);
  tl.fromTo("#c1",{opacity:0,y:12},{opacity:1,y:0,duration:0.35,ease:"power2.out"},0.4);`;
  if (second) js += `
  tl.fromTo("#eb0",{opacity:0},{opacity:1,duration:0.3},0.15);`;
  js += second
    ? `
  tl.fromTo("#eb2",{opacity:0},{opacity:1,duration:0.3},0.8);
  tl.fromTo("#c2",{opacity:0,y:12},{opacity:1,y:0,duration:0.35,ease:"power2.out"},0.95);`
    : `
  tl.fromTo("#sb",{opacity:0},{opacity:1,duration:0.3},0.8);`;
  // Anything 20s or longer carries motion for its whole duration, or it reads as a
  // frozen frame for the remainder.
  // 1.00 -> 1.02 over 20s measured as +6px on screen - technically motion, practically a
  // frozen frame. A slow lateral drift is unambiguous at the same subtlety.
  if (d >= 20) js += `
  tl.fromTo("#card",{x:0},{x:14,duration:${d},ease:"none"},0);`;
  js += `
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g005 = (p, d) => finding(p, d, "UNPROMPTED WIN", "union by name", "not in the prompt, not in the standards");
B.g006 = (p, d) => finding(p, d, "UNPROMPTED WIN", "a freshness check", "I didn't ask for it");
// The eyebrow is the ATTRIBUTION, not the verdict. Built as "MISS" the card read
// "MISS / two tills can share a transaction ID / THE CONVENTION SAYS / ...never within
// one" - line 2 had no owner, so the card asserted the claim and then contradicted
// itself. This is the card the whole outro thesis rests on.
B.g010 = (p, d) => finding(p, d, "CLAUDE SAID", "two tills in a branch can share a transaction ID", null,
  "transactions may repeat across branches — never within one");
B.g011 = (p, d) => finding(p, d, "MISS", "surrogate key built on the grain", "it collides exactly when the transactions do");
B.g012 = (p, d) => finding(p, d, "MISS", "hierarchical partitioning", "still rate-limits you on real object storage");

const chip = (p, d, head, sub) => {
  const t = p.panel.treatment;
  const html = `
  <div id="chip" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;bottom:100px;width:auto;height:auto;padding:24px 36px">
    <div style="font-weight:700;font-size:44px;color:${ink(t)};line-height:1.1">${esc(head)}</div>
    <div class="eyebrow" style="font-size:24px;margin-top:8px">${esc(sub)}</div>
  </div>`;
  const js = `
  tl.fromTo("#chip",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},0);
  tl.set("#chip",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g009 = (p, d) => {                       // the shutdown chip
  const t = p.panel.treatment;
  const html = `
  <div id="chip" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;bottom:100px;width:auto;height:auto;padding:26px 38px">
    <div class="eyebrow" style="font-size:32px;font-weight:700;color:${ink(t)}">THE CAMERA OVERHEATED · WE'RE BACK</div>
  </div>`;
  const js = `
  tl.fromTo("#chip",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},0);
  tl.set("#chip",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g013 = (p, d) => {                       // the threefold pattern, 83s
  const t = p.panel.treatment;
  // Rows at 38px wrapped in a 512px measure and orphaned their last word - four
  // dangling orphans stacked. 30px fits the longest row on one line.
  const rows = [
    { at: 0.1,  txt: "Conventions give it a head start" },
    { at: 32.0, txt: "Markdown is the wrong medium" },
    { at: 46.0, txt: "A better model fixes some of it" },
  ];
  const PAD = 34, HEAD = 96, ROWH = 92, PAYH = 108;
  const FULL = PAD * 2 + HEAD + rows.length * ROWH + PAYH;
  // The panel GROWS with its rows instead of reserving the final height from frame
  // one - a 584x600 black rectangle held one two-line row for 32 seconds.
  const hAt = (n, pay) => PAD * 2 + HEAD + n * ROWH + (pay ? PAYH : 0);
  const sy = (n, pay) => (hAt(n, pay) / FULL).toFixed(4);
  const payAt = 81.5;
  const html = `
  <div id="stack" class="clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="position:absolute;left:96px;top:${Math.round((1080 - FULL) / 2)}px;width:584px;height:${FULL}px">
    <div id="pnl" class="panel" style="left:0;top:0;width:584px;height:${FULL}px;transform-origin:top center"></div>
    <div class="eyebrow" style="position:absolute;left:${PAD}px;top:${PAD}px">THE PATTERN</div>
    <div id="rl" style="position:absolute;left:${PAD}px;top:${PAD + 42}px;width:170px;height:2px;background:${C.rule};transform-origin:left center"></div>
    ${rows.map((r, i) => `<div id="r${i}" class="claim" style="position:absolute;left:${PAD}px;top:${PAD + HEAD + i * ROWH}px;width:${584 - PAD * 2}px;font-size:30px;line-height:1.25">${esc(r.txt)}</div>`).join("")}
    <div id="pay" class="headline accentText" style="position:absolute;left:${PAD}px;top:${PAD + HEAD + rows.length * ROWH + 14}px;width:${584 - PAD * 2}px;font-size:40px;line-height:1.1">Not the tribal knowledge</div>
  </div>`;
  // Exactly ONE accent element: the payoff. The rule under THE PATTERN was a second
  // one, which style.json accentElementsPerScene forbids.
  let js = `
  tl.fromTo("#stack",{opacity:0},{opacity:1,duration:0.35},0);
  tl.fromTo("#pnl",{scaleY:${sy(0, false)}},{scaleY:${sy(1, false)},duration:0.35,ease:"power3.out"},${rows[0].at});
  tl.fromTo("#rl",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.out"},0.3);`;
  rows.forEach((r, i) => { js += `
  tl.fromTo("#r${i}",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},${r.at});` +
    (i ? `
  tl.to("#pnl",{scaleY:${sy(i + 1, false)},duration:0.35,ease:"power3.out"},${r.at});` : ""); });
  js += `
  tl.to("#pnl",{scaleY:1,duration:0.35,ease:"power3.out"},${payAt});
  tl.fromTo("#pay",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},${payAt});`;
  // 2% over 83s is invisible. A continuous slow drift across the WHOLE beat, plus the
  // rule breathing, which the direction named and the previous build never had.
  js += `
  tl.fromTo("#stack",{x:0},{x:16,duration:${d},ease:"none"},0);
  tl.fromTo("#rl",{scaleX:1},{scaleX:1.9,duration:${(d - 1) / 2},ease:"sine.inOut",yoyo:true,repeat:1},0.9);
  tl.set("#stack",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g014 = (p, d) => {                       // verdict - biggest type in the video
  const t = p.panel.treatment;
  // Stacked in the left column. Freed from the 1728x290 band it goes to 200px - larger
  // than the 180px it managed there, and unambiguously bigger than the 160px stats it
  // used to tie with. The hero still lands on the spoken cue, not on the entrance.
  const HERO = Math.max(0.5, +((p.cues.hero - 0.55) - p.start).toFixed(2));
  const LINES = ["VERY", "MUCH", "YES"];
  const html = `
  <div id="card" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;top:170px;width:744px;height:740px;padding:40px">
    <div id="q" style="position:absolute;left:40px;top:32px;font-size:36px;font-weight:500;color:${muted(t)}">Am I still a data engineer?</div>
    <div id="v" class="headline" style="position:absolute;left:40px;top:96px;font-size:180px;line-height:1.06">
      ${LINES.map((l, i) => `<div>${letters(l, "v" + i)}</div>`).join("")}
    </div>
    <div id="rl" class="rule" style="left:40px;top:690px;width:340px"></div>
  </div>`;
  const js = `
  tl.fromTo("#card",{opacity:0,x:-26},{opacity:1,x:0,duration:0.4,ease:"power2.out"},0);
  tl.fromTo("#q",{opacity:0},{opacity:1,duration:0.3},0.15);
  tl.fromTo("#v .ltr",{opacity:0,y:16},{opacity:1,y:0,duration:0.3,stagger:0.045,ease:"power2.out"},${HERO});
  tl.fromTo("#rl",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.out"},${(HERO + 0.9).toFixed(2)});
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g016 = (p, d) => {                       // end card - cue-triggered rows
  const t = p.panel.treatment;
  // From the cutsheet, re-derived from the transcript on every build - hardcoding these
  // left them stale the moment the cut was re-timed.
  const CUES = p.cues;
  const order = ["github", "youtube", "blog", "linkedin", "x"];
  const by = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, "brand.md"), "utf8")
    .match(/```json\n([\s\S]*?)\n```/)[1]).links.map((l) => [l.id, l]));
  // The full URL at 36px overflows a 516px row and the final character is sliced off -
  // on the primary call to action, for the whole 55 seconds. Dropping the scheme is a
  // presentation choice; the value in brand.md is untouched and still the source.
  const display = (v) => v.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const PAD = 34, HEAD = 96, ROWH = 96;
  const FULL = PAD * 2 + HEAD + order.length * ROWH;
  const rows = order.map((id, i) => {
    const l = by[id];
    return `<div id="row${i}" style="position:absolute;left:${PAD}px;top:${PAD + HEAD + i * ROWH}px;width:${584 - PAD * 2}px">
      <div class="eyebrow" style="font-size:26px">${esc(l.label)}</div>
      <div style="font-weight:700;font-size:36px;color:${ink(t)};margin-top:2px;white-space:nowrap">${esc(display(l.value))}</div>
    </div>`;
  }).join("");
  const html = `
  <div id="card" class="clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="position:absolute;left:96px;top:${Math.round((1080 - FULL) / 2)}px;width:584px;height:${FULL}px">
    <div id="pnl" class="panel" style="left:0;top:0;width:584px;height:${FULL}px;transform-origin:top center"></div>
    <div class="eyebrow" style="position:absolute;left:${PAD}px;top:${PAD}px">FIND ME</div>
    <div id="rl" class="rule" style="left:${PAD}px;top:${PAD + 42}px;width:170px"></div>
    ${rows}
  </div>`;
  const S = p.start;
  const sy = (n) => ((PAD * 2 + HEAD + n * ROWH) / FULL).toFixed(4);
  // The panel grows downward as rows land, instead of reserving the final height from
  // frame one and sitting two-thirds empty ink for 37 seconds.
  let js = `
  tl.fromTo("#pnl",{opacity:0,scaleY:${sy(0)}},{opacity:1,scaleY:${sy(1)},duration:0.35,ease:"power3.out"},0);
  tl.fromTo("#rl",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.out"},0.2);`;
  order.forEach((id, i) => {
    const at = (CUES[id] - S).toFixed(2);
    js += `
  tl.fromTo("#row${i}",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},${at});`;
    if (i) js += `
  tl.to("#pnl",{scaleY:${sy(i + 1)},duration:0.35,ease:"power3.out"},${at});`;
  });
  // continuous motion across a 54.8s beat
  js += `
  tl.fromTo("#card",{x:0},{x:14,duration:${d},ease:"none"},0);
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

// ---------- the five parts added after review ----------

B.g017 = (p, d) => {                       // pipeline diagram
  const t = p.panel.treatment;
  // The narration names the stages and the slide shows none. Lower band, x96-1300 so it
  // clears the face inset at x1368. Boxes land on the words as they are spoken; times
  // are offsets into the part, measured from outputs/transcript-cut.json.
  const S = p.start;
  // Absolute seconds on the edited timeline, from outputs/transcript-cut.json:
  //   "data ingestion" 200.90 | "integration" 202.17 | "cleansing" 203.43
  //   "transformations" 204.55 | "cloud data warehouse" 206.81 | "reverse ETL" 209.97
  const NODES = [
    { at: 196.30, l1: "Data",          l2: "Sources" },
    { at: 200.90, l1: "1. Ingestion",  l2: "" },
    { at: 203.43, l1: "2. Storage &",  l2: "Cleansing" },
    { at: 204.55, l1: "3. Transform-", l2: "ation" },
    { at: 206.81, l1: "4. Storage",    l2: "" },
    { at: 209.97, l1: "5. Reverse ETL", l2: "& Activation" },
  ];
  const W = 1204, PAD = 30, GAP = 22;
  const BW = Math.floor((W - PAD * 2 - GAP * 5) / 6);
  const html = `
  <div id="card" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;top:690px;width:${W}px;height:290px">
    <div id="lb" class="label" style="position:absolute;left:${PAD}px;top:26px;font-size:30px">THE PIPELINE A DATA ENGINEER WOULD BUILD</div>
    ${NODES.map((n, i) => `
      <div id="n${i}" style="position:absolute;left:${PAD + i * (BW + GAP)}px;top:96px;width:${BW}px;height:140px;
           border:2px solid ${C.rule};border-radius:8px;padding:16px 12px;display:flex;flex-direction:column;justify-content:center">
        <div style="font-weight:700;font-size:20px;color:${ink(t)};line-height:1.22">${esc(n.l1)}</div>
        ${n.l2 ? `<div style="font-weight:700;font-size:20px;color:${ink(t)};line-height:1.22">${esc(n.l2)}</div>` : ""}
      </div>
      ${i < 5 ? `<div id="a${i}" style="position:absolute;left:${PAD + i * (BW + GAP) + BW + 4}px;top:164px;width:${GAP - 8}px;height:2px;background:${i === 4 ? C.accent : C.rule};transform-origin:left center"></div>` : ""}
    `).join("")}
  </div>`;
  let js = `
  tl.fromTo("#card",{opacity:0,y:20},{opacity:1,y:0,duration:0.35,ease:"power2.out"},0);
  tl.fromTo("#lb",{opacity:0},{opacity:1,duration:0.3},0.15);`;
  NODES.forEach((n, i) => {
    const at = Math.max(0.4, +(n.at - S).toFixed(2));
    if (at > d - 0.3) {
      throw new Error(`${p.id} node ${i} cues at ${at.toFixed(2)}s but the part is only ` +
        `${d.toFixed(2)}s long - the cue is outside its own part and would never render.`);
    }
    js += `
  tl.fromTo("#n${i}",{clipPath:"inset(0% 100% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.3,ease:"power3.out"},${at});`;
    if (i < 5) js += `
  tl.fromTo("#a${i}",{scaleX:0},{scaleX:1,duration:0.2,ease:"power2.out"},${(at + 0.15).toFixed(2)});`;
  });
  js += `
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g018 = (p, d) => chip(p, d, "dbt + DuckDB", "OPEN SOURCE \u00b7 NO SIGNUP, NO PAYWALL");
B.g019 = (p, d) => chip(p, d, "Claude Opus 5", "HIGH EFFORT \u00b7 PRO SUBSCRIPTION");

B.g020 = (p, d) => finding(p, d, "UNPROMPTED WIN", "ran dbt debug", "to check its own work. Not in the prompt.");

B.g023 = (p, d) => finding(p, d, "MISS", "argued the point, went on tangents",
  "I had to tell it how I'd do it myself");

B.g024 = (p, d) => {                       // the thesis, in two lines
  const t = p.panel.treatment;
  const A = +(1629.31 - p.start).toFixed(2), B2 = +(1636.53 - p.start).toFixed(2);
  const html = `
  <div id="card" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;top:300px;width:744px;height:480px;padding:44px 40px">
    <div id="eb" class="eyebrow">EVERY ITERATION</div>
    <div id="l1" class="headline" style="font-size:54px;line-height:1.18;margin-top:34px">brilliant in certain ways</div>
    <div id="l2" class="headline accentText" style="font-size:54px;line-height:1.18;margin-top:26px">and sometimes really stupid</div>
    <div id="rl" style="position:absolute;left:40px;bottom:56px;width:260px;height:2px;background:${C.rule};transform-origin:left center"></div>
  </div>`;
  const js = `
  tl.fromTo("#card",{opacity:0,x:-24},{opacity:1,x:0,duration:0.4,ease:"power2.out"},0);
  tl.fromTo("#eb",{opacity:0},{opacity:1,duration:0.3},0.2);
  tl.fromTo("#l1",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},${A});
  tl.fromTo("#l2",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},${B2});
  tl.fromTo("#rl",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.out"},${(B2 + 0.5).toFixed(2)});
  tl.fromTo("#card",{x:0},{x:14,duration:${d},ease:"none"},0.4);
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g021 = (p, d) => {                       // the method
  const t = p.panel.treatment;
  const ROWS = [
    { f: "conventions.md", s: "how this business works" },
    { f: "standards.md",   s: "how we do data engineering here" },
  ];
  const html = `
  <div id="card" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:96px;top:260px;width:744px;height:560px;padding:40px">
    <div id="eb" class="eyebrow">WHAT I GAVE IT</div>
    ${ROWS.map((r, i) => `
      <div id="r${i}" style="position:absolute;left:40px;top:${132 + i * 150}px;width:664px">
        <div style="font-weight:700;font-size:46px;color:${ink(t)}">${esc(r.f)}</div>
        <div class="sub" style="margin-top:8px">${esc(r.s)}</div>
      </div>`).join("")}
    <div id="rl" class="rule" style="left:40px;top:${132 + ROWS.length * 150 + 20}px;width:300px"></div>
    <div id="pay" style="position:absolute;left:40px;top:${132 + ROWS.length * 150 + 46}px;width:664px;font-weight:700;font-size:34px;color:${ink(t)};line-height:1.25">everything I'd give a junior developer</div>
  </div>`;
  let js = `
  tl.fromTo("#card",{opacity:0,x:-24},{opacity:1,x:0,duration:0.4,ease:"power2.out"},0);
  tl.fromTo("#eb",{opacity:0},{opacity:1,duration:0.3},0.2);`;
  ROWS.forEach((r, i) => { js += `
  tl.fromTo("#r${i}",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.35,ease:"power3.out"},${(0.4 + i * 0.4).toFixed(2)});`; });
  js += `
  tl.fromTo("#rl",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.out"},1.4);
  tl.fromTo("#pay",{opacity:0,y:10},{opacity:1,y:0,duration:0.35,ease:"power2.out"},1.6);
  tl.fromTo("#card",{x:0},{x:14,duration:${d},ease:"none"},0.4);
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

B.g022 = (p, d) => {                       // "2024" -> 2023 correction
  const t = p.panel.treatment;
  const html = `
  <div id="card" class="panel clip" data-start="0" data-duration="${d}" data-track-index="1"
       style="left:700px;top:762px;width:auto;height:auto;padding:22px 34px">
    <div class="eyebrow" style="font-size:24px">CORRECTION</div>
    <div style="font-weight:700;font-size:56px;color:${ink(t)};line-height:1.05;margin-top:4px">* 2023</div>
  </div>`;
  const js = `
  tl.fromTo("#card",{clipPath:"inset(100% 0% 0% 0%)",opacity:0},{clipPath:"inset(0% 0% 0% 0%)",opacity:1,duration:0.3,ease:"power3.out"},0);
  tl.set("#card",{opacity:1},${d - 0.01});`;
  return { html, js, t };
};

// ---------- emit -----------------------------------------------------------
const TAIL = 0.5;    // assets outlast their window, so a late boundary never exposes a gap
fs.rmSync(PARTS, { recursive: true, force: true });
for (const p of CUT.parts) {
  const d = +(p.end - p.start + TAIL).toFixed(3);
  const dir = path.join(PARTS, p.id);
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  for (const f of ["Satoshi-Regular.woff2", "Satoshi-Medium.woff2", "Satoshi-Bold.woff2", "Satoshi-Black.woff2"])
    fs.copyFileSync(path.join(FONTS, f), path.join(dir, "assets", f));
  if (p.id === "g003") fs.copyFileSync(path.join(JOB, "assets", "intro-tweet.mp4"), path.join(dir, "assets", "intro-tweet.mp4"));
  if (p.id === "g015") fs.copyFileSync(path.join(JOB, "assets", "outro-tweet.png"), path.join(dir, "assets", "outro-tweet.png"));
  const { html, js, t } = B[p.id](p, d);
  fs.writeFileSync(path.join(dir, "index.html"), page(p.id, d, html, js, t, !!p.screenBacked));
  fs.writeFileSync(path.join(dir, "hyperframes.json"), HF_JSON);
  console.log(`${p.id}  ${d.toFixed(2)}s  ${t}${p.screenBacked ? " (opaque, over screen)" : ""}`);
}
console.log(`\n${CUT.parts.length} parts emitted to graphics-build/parts/`);
