// Per-part markup + animation. One export per part id; build.mjs wires them up.
import { C, texture } from "./build.mjs";
import { BRAIN, JAR, TERMINAL, DOC, LIMB, SPINE, FOLDER, TERMWIN, GLOBE, DATABASE, SCROLL, CORD } from "./art.mjs";

const A = C.accent, INK = C.ink, BG = C.bg, RULE = C.rule, MUT = C.muted;

// helper: per-letter spans, stagger derived from the 0.8s landing budget (style _staggerDerivation)
export function letters(text, cls = "") {
  return [...text].map((ch, i) =>
    `<span class="ltr ${cls}" data-i="${i}" style="display:inline-block;white-space:pre">${ch === " " ? "&nbsp;" : ch}</span>`
  ).join("");
}
export function stagger(nChars, tween = 0.45, startAt = 0.1, budget = 0.8) {
  return Math.min(0.045, Math.max(0.006, (budget - tween - startAt) / Math.max(1, nChars - 1)));
}

// ---------- g001 hook card -------------------------------------------------
export const g001 = () => ({
  duration: 7.130, opaque: false,
  body: `
<section id="g001-scene" class="clip" data-start="0" data-duration="7.130" data-track-index="1">
  <!-- heroLeft zone: title/hook/verdict cards live in the LEFT negative space, never in the
       full-width lower band, which runs under the chin. Measured 164-168 luma -> inverted. -->
  <div id="card" class="panel-inverted" style="position:absolute;left:96px;top:566px;width:716px;
       padding:30px 36px 32px;border-radius:8px;opacity:0">
    <div id="hl" class="disp" style="font-size:76px;line-height:1.06;letter-spacing:-.018em">
      <div id="l1">${letters("Anything I can do")}</div>
      <div id="l2">${letters("on my computer")}</div>
    </div>
    <div id="rl" class="accent rule2" style="margin-top:16px"></div>
    <div id="sup" class="med" style="font-size:32px;margin-top:12px;color:#B9B2A8">can be done by AI agents</div>
  </div>
</section>`,
  script: `
const st = ${stagger(17)};
tl.fromTo("#card",{opacity:0,x:-24},{opacity:1,x:0,duration:0.45,ease:"power3.out"},0.10);
tl.fromTo("#l1 .ltr",{opacity:0,y:20},{opacity:1,y:0,duration:0.42,ease:"power3.out",stagger:st},0.16);
tl.fromTo("#l2 .ltr",{opacity:0,y:20},{opacity:1,y:0,duration:0.42,ease:"power3.out",stagger:st},0.34);
tl.fromTo("#rl",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.inOut"},0.86);
tl.fromTo("#sup",{opacity:0,y:12},{opacity:1,y:0,duration:0.40,ease:"power3.out"},1.26);
tl.to("#card",{y:-6,duration:5.0,ease:"none"},1.7);
tl.set("#card",{opacity:1},7.129);`
});

// ---------- g002 lower third ----------------------------------------------
export const g002 = () => ({
  duration: 6.000, opaque: false,
  body: `
<section class="clip" data-start="0" data-duration="6.000" data-track-index="1">
  <div id="wrap" style="position:absolute;left:96px;top:812px;overflow:hidden;padding-left:22px">
    <div id="ar" class="accent" style="position:absolute;left:0;top:6px;width:2px;height:0"></div>
    <div id="card" class="panel-reinf" style="padding:20px 34px;border-radius:6px">
      <div class="disp" style="font-size:44px;font-variation-settings:'wght' 700;line-height:1.1">Sreeram Nudurupati</div>
      <div class="med muted" style="font-size:28px;margin-top:6px">AI for the Working Data Engineer</div>
    </div>
  </div>
</section>`,
  script: `
tl.fromTo("#card",{yPercent:100},{yPercent:0,duration:0.35,ease:"power3.out"},0.10);
tl.fromTo("#ar",{height:0},{height:96,duration:0.35,ease:"power2.out"},0.30);
tl.to("#card",{yPercent:100,duration:0.30,ease:"power2.in"},5.55);
tl.to("#ar",{height:0,duration:0.25,ease:"power2.in"},5.55);`
});

// ---------- g003 the copy-paste loop ---------------------------------------
export const g003 = () => ({
  duration: 18.700, opaque: false,
  body: `
<section id="g003-scene" class="clip" data-start="0" data-duration="18.700" data-track-index="1">
  <div id="p3" class="panel-inverted" style="position:absolute;left:96px;top:296px;width:564px;
       padding:26px 30px 30px;border-radius:8px;opacity:0">
    <div class="capt muted eyebrow">The chatbot loop</div>
    <div style="position:relative;height:322px;margin-top:22px">
      <div id="n-me" class="disp" style="position:absolute;left:0;top:0;width:250px;padding:16px 0;
           font-size:40px;font-variation-settings:'wght' 700;text-align:center;
           border:1px solid rgba(255,255,255,.22);border-radius:6px">Me</div>
      <div id="n-gpt" class="disp" style="position:absolute;left:0;top:250px;width:250px;padding:16px 0;
           font-size:40px;font-variation-settings:'wght' 700;text-align:center;
           border:1px solid rgba(255,255,255,.22);border-radius:6px">ChatGPT</div>
      <div id="a-down" style="position:absolute;left:124px;top:74px;width:2px;height:0;
           background:rgba(255,255,255,.30)"></div>
      <div id="a-up"   style="position:absolute;left:262px;top:74px;width:2px;height:0;
           background:rgba(255,255,255,.30)"></div>
      <div id="l-down" class="capt muted" style="position:absolute;left:150px;top:104px;font-size:24px;opacity:0">paste the error</div>
      <div id="l-up"   class="capt muted" style="position:absolute;left:288px;top:180px;font-size:24px;opacity:0">copy the fix</div>
      <div id="dot" class="accent" style="position:absolute;left:118px;top:70px;width:14px;height:14px;
           border-radius:50%;opacity:0"></div>
    </div>
  </div>
</section>`,
  script: `
tl.fromTo("#p3",{opacity:0,x:-24},{opacity:1,x:0,duration:0.45,ease:"power3.out"},0.10);
tl.fromTo("#n-me",{opacity:0,y:14},{opacity:1,y:0,duration:0.40,ease:"power3.out"},0.35);
tl.fromTo("#n-gpt",{opacity:0,y:14},{opacity:1,y:0,duration:0.40,ease:"power3.out"},0.75);
/* cue: "copy my error messages" at rel 3.29 */
tl.fromTo("#a-down",{height:0},{height:176,duration:0.50,ease:"power2.inOut"},3.29);
tl.fromTo("#l-down",{opacity:0,x:-10},{opacity:1,x:0,duration:0.35,ease:"power3.out"},3.55);
/* cue: "paste it back into my code base" at rel 10.27 */
tl.fromTo("#a-up",{height:0},{height:176,duration:0.50,ease:"power2.inOut"},10.27);
tl.fromTo("#l-up",{opacity:0,x:10},{opacity:1,x:0,duration:0.35,ease:"power3.out"},10.53);
/* continuous motion: the dot circulates so an 18.7s beat is never still. finite repeat. */
tl.set("#dot",{opacity:1},3.35);
const loop = gsap.timeline({repeat:4});
loop.fromTo("#dot",{x:0,y:0},{x:0,y:176,duration:1.30,ease:"power1.inOut"})
    .to("#dot",{x:144,y:176,duration:0.30,ease:"none"})
    .to("#dot",{x:144,y:0,duration:1.30,ease:"power1.inOut"})
    .to("#dot",{x:0,y:0,duration:0.30,ease:"none"});
tl.add(loop,3.35);
tl.to("#p3",{opacity:0,duration:0.30,ease:"power2.in"},18.40);
tl.set("#dot",{opacity:0},18.69);`
});

// ---------- g004 what I use agents for -------------------------------------
export const g004 = () => {
  const rows = [["market analysis",4.13],["deep research",13.46],["flights and hotels",20.36]];
  return {
  duration: 28.070, opaque: false,
  body: `
<section id="g004-scene" class="clip" data-start="0" data-duration="28.070" data-track-index="1">
  <div id="p4" class="panel-inverted" style="position:absolute;left:96px;top:322px;width:564px;
       padding:26px 30px 30px;border-radius:8px;opacity:0">
    <div class="capt muted eyebrow">Today</div>
    <div id="r4rule" class="accent rule2" style="margin-top:16px;width:120px"></div>
    ${rows.map(([t],i)=>`<div id="r4-${i}" class="disp" style="font-size:46px;
        font-variation-settings:'wght' 700;margin-top:${i?24:26}px;opacity:0">${t}</div>`).join("")}
  </div>
</section>`,
  script: `
tl.fromTo("#p4",{opacity:0,x:-24},{opacity:1,x:0,duration:0.45,ease:"power3.out"},0.10);
tl.fromTo("#r4rule",{scaleX:0},{scaleX:1,duration:0.40,ease:"power2.inOut"},0.40);
${rows.map(([,c],i)=>
`tl.fromTo("#r4-${i}",{opacity:0,yPercent:60,clipPath:"inset(100% 0 0 0)"},
   {opacity:1,yPercent:0,clipPath:"inset(0% 0 0 0)",duration:0.35,ease:"power3.out"},${c.toFixed(2)});`).join("\n")}
tl.to("#p4",{y:-10,duration:22.0,ease:"none"},4.5);
tl.to("#p4",{opacity:0,duration:0.30,ease:"power2.in"},27.77);`
  };
};

// ---------- g006 the episode chip ------------------------------------------
export const g006 = () => ({
  duration: 6.000, opaque: false,
  body: `
<section id="g006-scene" class="clip" data-start="0" data-duration="6.000" data-track-index="1">
  <div id="chipwrap" style="position:absolute;left:96px;top:800px;overflow:hidden;padding-left:20px">
    <div id="chiprule" class="accent" style="position:absolute;left:0;top:4px;width:2px;height:0"></div>
    <div id="chip" class="panel-reinf capt" style="padding:14px 26px;border-radius:5px;font-size:28px;
         letter-spacing:.10em;text-transform:uppercase">Part 1 &middot; Claude Code</div>
  </div>
</section>`,
  script: `
/* cue: "last week" at rel 0.23 */
tl.fromTo("#chip",{yPercent:100},{yPercent:0,duration:0.35,ease:"power3.out"},0.23);
tl.fromTo("#chiprule",{height:0},{height:56,duration:0.30,ease:"power2.out"},0.43);
tl.to("#chip",{yPercent:100,duration:0.30,ease:"power2.in"},5.55);
tl.to("#chiprule",{height:0,duration:0.25,ease:"power2.in"},5.55);`
});

// ---------- g005 the card that builds itself from its own code -------------
// Measured: fingertip x415 y775; card box x130-660 y230-700 reads 166-167 luma
// for the whole beat, so INVERTED. 75px clearance above the finger.
export const g005 = () => {
  // The blueprint draws, the real source types itself on, then it COLLAPSES and the card
  // resolves to "This one." The build is the show; the resting frame is the punchline.
  const CODE = [
    [["gsap",1],[".fromTo(",0],["card",2],[",",0]],
    [["  { ",0],["y",2],[": ",0],["24",3],[", ",0],["opacity",2],[": ",0],["0",3],[" },",0]],
    [["  { ",0],["y",2],[": ",0],["0",3],[",  ",0],["opacity",2],[": ",0],["1",3],[",",0]],
    [["    ",0],["duration",2],[": ",0],["0.6",3],[", ",0],["ease",2],[": ",0],['"power3.out"',4],[" });",0]]
  ];
  const TONE=["rgba(20,17,14,.52)","rgba(20,17,14,.95)","rgba(20,17,14,.95)","rgba(20,17,14,.72)","rgba(20,17,14,.82)"];
  const BUILD={left:130,top:300,w:530,h:300};   // the blueprint stage, while the code is up
  const CARD ={left:130,top:404,w:530,h:196};   // what it collapses into
  const RULE ={left:164,top:548,w:240};
  const TIP  ={left:409,top:769};
  return {
  duration: 6.800, opaque: false,
  body: `
<section id="g005-scene" class="clip" data-start="0" data-duration="6.800" data-track-index="1">
  <div id="spark" class="accent" style="position:absolute;left:${TIP.left}px;top:${TIP.top}px;
       width:12px;height:12px;border-radius:50%;opacity:0;z-index:10"></div>

  <div id="bpwrap" style="position:absolute;left:${BUILD.left}px;top:${BUILD.top}px;
       width:${BUILD.w}px;height:${BUILD.h}px;opacity:0">
    <div id="bp" style="position:absolute;inset:0;border:1px dashed rgba(20,17,14,.45);border-radius:8px"></div>
    <div id="bpdim" class="capt" style="position:absolute;left:0;top:-32px;font-size:21px;
         color:rgba(20,17,14,.55);letter-spacing:.06em">${BUILD.w} &times; ${BUILD.h}</div>
    ${[["left:-9px;top:-9px;width:20px;height:1px"],["left:-9px;top:-9px;width:1px;height:20px"],
       ["right:-9px;bottom:-9px;width:20px;height:1px"],["right:-9px;bottom:-9px;width:1px;height:20px"]]
      .map((c,i)=>`<div id="bpt${i}" style="position:absolute;${c};background:rgba(20,17,14,.45)"></div>`).join("")}
    <div id="code5" style="position:absolute;left:34px;top:44px;width:466px;opacity:0">
      ${CODE.map((ln,i)=>`<div id="cl-${i}" class="capt" style="font-size:23px;line-height:1.9;
        white-space:pre;opacity:0">${ln.map(([t,k])=>
          `<span style="color:${"${TONE["+k+"]}"}">${t.replace(/</g,"&lt;")}</span>`).join("")}</div>`).join("")}
    </div>
  </div>

  <div id="card5" class="panel-inverted" style="position:absolute;left:${CARD.left}px;top:${CARD.top}px;
       width:${CARD.w}px;height:${CARD.h}px;border-radius:8px;opacity:0"></div>
  <div id="eyebrow5" class="capt eyebrow" style="position:absolute;left:164px;top:434px;
       color:#B9B2A8;opacity:0">Made by the agent</div>
  <div id="hl5" class="disp" style="position:absolute;left:164px;top:466px;font-size:72px;
       line-height:1.05;color:${BG};opacity:0">This one.</div>
</section>`,
  script: `
const TONE=${JSON.stringify(TONE)};
/* Retimed to 6.8s: the card used to hold for eleven seconds after it resolved. The build
   still reads, and "This one." now holds ~1.7s instead of lingering. */
tl.fromTo("#spark",{opacity:0,scale:0.4},{opacity:1,scale:1,duration:0.20,ease:"power2.out"},0.33);
tl.to("#spark",{x:${RULE.left-TIP.left},y:${RULE.top-TIP.top},duration:0.50,ease:"power2.out"},0.55);
tl.set("#bpwrap",{opacity:1},1.00);
tl.fromTo("#bp",{clipPath:"inset(100% 0 0 0)"},{clipPath:"inset(0% 0 0 0)",duration:0.45,ease:"power3.out"},1.05);
tl.fromTo(["#bpt0","#bpt1","#bpt2","#bpt3"],{opacity:0},{opacity:1,duration:0.20,stagger:0.05},1.35);
tl.fromTo("#bpdim",{opacity:0,x:-8},{opacity:1,x:0,duration:0.25,ease:"power3.out"},1.50);
tl.set("#code5",{opacity:1},1.70);
${CODE.map((_,i)=>`tl.fromTo("#cl-${i}",{opacity:0,clipPath:"inset(0 100% 0 0)"},
  {opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.42,ease:"none"},${(1.70+i*0.42).toFixed(2)});`).join("\n")}
/* the collapse */
tl.to("#code5",{opacity:0,y:-12,duration:0.30,ease:"power2.in"},3.60);
tl.to("#bpwrap",{clipPath:"inset(35% 0 0 0)",opacity:0,duration:0.40,ease:"power2.inOut"},3.72);
tl.fromTo("#card5",{opacity:0,scaleY:0.8},{opacity:1,scaleY:1,duration:0.40,ease:"power3.out",transformOrigin:"50% 100%"},3.90);
tl.fromTo("#eyebrow5",{opacity:0,y:8},{opacity:1,y:0,duration:0.30,ease:"power3.out"},4.14);
tl.fromTo("#hl5",{opacity:0,y:16},{opacity:1,y:0,duration:0.38,ease:"power3.out"},4.28);
tl.to("#spark",{width:${RULE.w},height:2,borderRadius:0,duration:0.42,ease:"power2.inOut"},4.62);
tl.to(["#card5","#eyebrow5","#hl5"],{y:-5,duration:1.7,ease:"none"},5.10);
tl.to("#spark",{y:${RULE.top-TIP.top-5},duration:1.7,ease:"none"},5.10);
tl.to(["#card5","#eyebrow5","#hl5","#spark"],{opacity:0,duration:0.28,ease:"power2.in"},6.50);`
  };
};

// ---------- g007 what ChatGPT cannot see (over the screen -> OPAQUE) -------
export const g007 = () => {
  const rows = [["your environment",0.36],["your code base",2.46],["your conventions",3.42],["your standards",4.28]];
  return {
  duration: 20.670, opaque: false,
  body: `
<section id="g007-scene" class="clip" data-start="0" data-duration="20.670" data-track-index="1">
  <div id="p7" class="panel-opaque" style="position:absolute;left:96px;top:300px;width:564px;
       padding:26px 30px 32px;border-radius:8px;opacity:0">
    <div class="capt muted eyebrow">ChatGPT cannot read</div>
    <div id="r7rule" class="accent rule2" style="margin-top:16px;width:140px"></div>
    ${rows.map(([t],i)=>`
    <div style="margin-top:${i?20:26}px">
      <span id="r7-${i}" class="disp" style="position:relative;display:inline-block;
            font-size:42px;font-variation-settings:'wght' 700;opacity:0">${t}<span
            id="s7-${i}" style="position:absolute;left:0;top:54%;height:2px;width:100%;
            background:rgba(255,255,255,.6);transform-origin:left center;transform:scaleX(0)"></span></span>
    </div>`).join("")}
  </div>
</section>`,
  script: `
tl.fromTo("#p7",{opacity:0,x:-24},{opacity:1,x:0,duration:0.45,ease:"power3.out"},0.05);
tl.fromTo("#r7rule",{scaleX:0},{scaleX:1,duration:0.40,ease:"power2.inOut"},0.25);
${rows.map(([,c],i)=>`
tl.fromTo("#r7-${i}",{opacity:0,yPercent:50},{opacity:1,yPercent:0,duration:0.35,ease:"power3.out"},${c.toFixed(2)});
tl.to("#s7-${i}",{scaleX:1,duration:0.40,ease:"power2.inOut"},${(c+0.30).toFixed(2)});`).join("")}
tl.to("#p7",{y:-10,duration:14.0,ease:"none"},5.2);
tl.to("#p7",{opacity:0,duration:0.30,ease:"power2.in"},20.37);`
  };
};

// ---------- g008 THE ANALOGY (full-frame opaque takeover, 71.16s) ----------
// Approved exception to the style's 6-20s takeover ceiling: the screen underneath measures
// 3.9% activity across this span. Art is dense drawn line work, animated continuously so
// no part of the 71s is ever a still frame.
export const g008 = () => ({
  duration: 71.160, opaque: true,
  body: `
<section id="g008-scene" class="clip" data-start="0" data-duration="71.160" data-track-index="1">
  ${texture}
  <style>
    .dr{stroke-dasharray:1;stroke-dashoffset:1}
    #g008-scene svg{width:100%;height:100%;display:block}
    .col{position:absolute;color:${INK}}
    .cap{position:absolute;font-size:26px;color:${MUT};letter-spacing:.02em}
  </style>

  <!-- CHATBOT: jar wired to a terminal that only talks back -->
  <div id="m1" class="col" style="left:560px;top:250px;width:800px;opacity:0">
    <div id="lbl1" class="capt eyebrow" style="position:absolute;left:0;top:-64px;width:360px;
         text-align:center;color:${MUT};opacity:0">Chatbot</div>
    <div style="position:absolute;left:20px;top:0;width:320px;height:400px">${JAR("jar1")}</div>
    <div id="brainwrap1" style="position:absolute;left:50px;top:96px;width:260px;height:210px">${BRAIN("brain1")}</div>
    <svg id="cable1" viewBox="0 0 200 160" style="position:absolute;left:306px;top:150px;width:220px;height:160px;color:${INK};overflow:visible">
      <path class="dr o" d="M0,60 C50,60 58,104 100,104 C142,104 150,74 200,74" pathLength="1"
            fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>
    </svg>
    <div style="position:absolute;left:508px;top:172px;width:292px;height:219px">${TERMWIN("term1")}</div>
    <div id="chatOut" style="position:absolute;left:660px;top:404px;width:300px;opacity:0">
      <div class="capt" style="font-size:30px;color:${MUT};line-height:1.5">Q&amp;A only.<br/>It just talks.</div>
    </div>
  </div>
  <div id="quote1" class="disp" style="position:absolute;left:300px;top:906px;width:1320px;
       text-align:center;font-size:44px;font-variation-settings:'wght' 700;color:${INK};opacity:0">
    only as smart as the question you ask</div>
  <div id="divider" style="position:absolute;left:880px;top:120px;width:2px;height:0;background:${RULE}"></div>

  <!-- AGENT: four limbs, each reaching a NAMED tool -->
  <div id="m2" class="col" style="left:920px;top:80px;width:960px;opacity:0">
    <div id="lbl2" class="capt eyebrow" style="position:absolute;left:280px;top:-58px;width:400px;
         text-align:center;color:${MUT};opacity:0">AI Agent</div>
    <div style="position:absolute;left:340px;top:0;width:280px;height:350px">${JAR("jar2")}</div>
    <div id="brainwrap2" style="position:absolute;left:366px;top:84px;width:228px;height:184px">${BRAIN("brain2")}</div>

    <!-- harness: the bundle out of the jar, then four cords to four tools -->
    <svg id="nerves" viewBox="0 0 960 620" style="position:absolute;left:0;top:330px;width:960px;height:620px;color:${INK};overflow:visible">
      <path id="bundle" class="dr" d="M480,10 L480,150" pathLength="1" fill="none"
            stroke="${A}" stroke-width="6" stroke-linecap="round"/>
      ${CORD("c1","M480,150 C400,150 290,168 190,168",190,168)}
      ${CORD("c2","M480,150 C400,170 290,360 190,368",190,368)}
      ${CORD("c3","M480,150 C560,150 670,168 780,168",780,168)}
      ${CORD("c4","M480,150 C560,170 670,360 785,368",785,368)}
    </svg>
    <div id="harnessLbl" class="cap capt" style="left:512px;top:396px;opacity:0">harness</div>

    <div id="tool1" style="position:absolute;left:10px;top:430px;width:170px;height:136px;opacity:0">${FOLDER("ic1")}</div>
    <div id="tool1l" class="cap capt" style="left:0px;top:580px;width:190px;text-align:center;opacity:0">file system</div>
    <div id="tool2" style="position:absolute;left:10px;top:630px;width:170px;height:136px;opacity:0">${TERMWIN("ic2")}</div>
    <div id="tool2l" class="cap capt" style="left:0px;top:780px;width:190px;text-align:center;opacity:0">terminal &middot; dbt &middot; git</div>
    <div id="tool3" style="position:absolute;left:790px;top:424px;width:150px;height:150px;opacity:0">${GLOBE("ic3")}</div>
    <div id="tool3l" class="cap capt" style="left:770px;top:588px;width:190px;text-align:center;opacity:0">web search</div>
    <div id="tool4" style="position:absolute;left:795px;top:626px;width:140px;height:151px;opacity:0">${DATABASE("ic4")}</div>
    <div id="tool4l" class="cap capt" style="left:770px;top:790px;width:190px;text-align:center;opacity:0">database &middot; MCP</div>

    <div id="docw" style="position:absolute;left:380px;top:640px;width:200px;height:235px;opacity:0">${SCROLL("doc")}</div>
    <div id="docLbl" class="cap capt" style="left:330px;top:888px;width:300px;text-align:center;opacity:0">AGENTS.md &middot; personality</div>
  </div>
  <div id="quote2" class="disp" style="position:absolute;left:96px;top:876px;width:740px;
       text-align:left;font-size:40px;line-height:1.18;font-variation-settings:'wght' 700;color:${INK};opacity:0">
    achieves tasks end to end, in a bounded manner</div>
</section>`,
  script: `
const draw=(sel,d,at)=>tl.fromTo(sel,{strokeDashoffset:1},{strokeDashoffset:0,duration:d,ease:"power2.inOut"},at);

/* ---- MOVEMENT 1: the chatbot ---- */
tl.fromTo("#m1",{opacity:0},{opacity:1,duration:0.5,ease:"power2.out"},4.40);
draw("#jar1 .o",1.50,4.80);
tl.fromTo("#jar1-liq",{opacity:0},{opacity:0.07,duration:0.9},5.60);
draw("#jar1 .m",0.70,5.60); draw("#jar1 .h",0.90,6.00);
draw("#brain1 .o",1.70,5.72); draw("#brain1 .s",2.20,6.40);
draw("#cable1 .o",1.10,8.00);
draw("#term1 .o",1.00,8.70); draw("#term1 .s",0.80,9.10);
tl.fromTo("#lbl1",{opacity:0,y:10},{opacity:1,y:0,duration:0.40,ease:"power3.out"},9.20);
tl.fromTo("#chatOut",{opacity:0,x:-12},{opacity:1,x:0,duration:0.45,ease:"power3.out"},10.20);

/* CONTINUOUS: brain breathes, bubbles rise, folds pulse */
{const b=gsap.timeline({repeat:15});
 b.to("#brainwrap1",{scale:1.022,duration:2.2,ease:"sine.inOut",transformOrigin:"50% 50%"})
  .to("#brainwrap1",{scale:1.0,duration:2.2,ease:"sine.inOut",transformOrigin:"50% 50%"});
 tl.add(b,7.4);}
tl.set("#jar1-bubbles",{opacity:1},6.4);
${[0,1,2,3,4,5,6,7].map(i=>{const d=(4.2+i*0.55).toFixed(2),dl=(6.4+i*0.9).toFixed(2),r=Math.max(2,Math.floor(60/(4.2+i*0.55)));
 return `{const b=gsap.timeline({repeat:${r}});b.fromTo("#jar1-b${i}",{attr:{cy:362},opacity:0.55},{attr:{cy:152},opacity:0,duration:${d},ease:"none"});tl.add(b,${dl});}`}).join("\n")}
${[0,1,2,3,4].map(i=>`{const q=gsap.timeline({repeat:9});
 q.fromTo("#brain1-pl${i}",{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:0.75,duration:2.6,ease:"none"}).to("#brain1-pl${i}",{opacity:0,duration:0.3});
 tl.add(q,${(9.0+i*0.9).toFixed(2)});}`).join("\n")}

/* cue "prompt engineering" at rel 31.19 */
tl.fromTo("#quote1",{opacity:0,y:16},{opacity:1,y:0,duration:0.5,ease:"power3.out"},31.19);

/* ---- MOVEMENT 2: the agent, built limb by limb ---- */
tl.to("#m1",{x:-500,y:-40,scale:0.80,duration:0.9,ease:"power2.inOut",transformOrigin:"50% 50%"},36.40);
tl.to("#quote1",{opacity:0,duration:0.4,ease:"power2.in"},36.40);
tl.fromTo("#divider",{height:0},{height:820,duration:0.7,ease:"power2.inOut"},36.80);
tl.fromTo("#m2",{opacity:0,x:40},{opacity:1,x:0,duration:0.7,ease:"power3.out"},37.20);
draw("#jar2 .o",1.10,37.40);
tl.fromTo("#jar2-liq",{opacity:0},{opacity:0.07,duration:0.8},37.90);
draw("#jar2 .m",0.60,37.90); draw("#jar2 .h",0.80,38.10);
draw("#brain2 .o",1.20,37.90); draw("#brain2 .s",1.60,38.40);
tl.set("#jar2-bubbles",{opacity:1},38.6);
${[0,1,2,3,4,5].map(i=>{const d=(4.0+i*0.6).toFixed(2),dl=(38.6+i*0.8).toFixed(2),r=Math.max(2,Math.floor(30/(4.0+i*0.6)));
 return `{const b=gsap.timeline({repeat:${r}});b.fromTo("#jar2-b${i}",{attr:{cy:362},opacity:0.55},{attr:{cy:152},opacity:0,duration:${d},ease:"none"});tl.add(b,${dl});}`}).join("\n")}
{const b=gsap.timeline({repeat:7});
 b.to("#brainwrap2",{scale:1.022,duration:2.2,ease:"sine.inOut",transformOrigin:"50% 50%"})
  .to("#brainwrap2",{scale:1.0,duration:2.2,ease:"sine.inOut",transformOrigin:"50% 50%"});
 tl.add(b,39.0);}

/* cue "tools for its limbs" 39.30: the bundle drops, then FOUR cords reach FOUR named tools */
draw("#bundle",0.60,39.30);
${[["c1","tool1","tool1l",39.90],["c2","tool2","tool2l",40.60],["c3","tool3","tool3l",41.30],["c4","tool4","tool4l",42.00]]
 .map(([c,t,l,at])=>`draw("#${c} .o",0.70,${at});
tl.fromTo("#${t}",{opacity:0,scale:0.9},{opacity:1,scale:1,duration:0.40,ease:"power3.out"},${(at+0.55).toFixed(2)});
draw("#${t} .o",0.70,${(at+0.55).toFixed(2)}); draw("#${t} .s",0.60,${(at+0.85).toFixed(2)});
tl.fromTo("#${l}",{opacity:0},{opacity:1,duration:0.35},${(at+1.0).toFixed(2)});`).join("\n")}

/* traffic pulses along each limb, on its own cycle so they never sync */
${[["c1",190,168,2.6],["c2",190,368,3.1],["c3",780,168,2.8],["c4",785,368,3.4]].map(([c,hx,hy,dur],i)=>
`tl.fromTo(["#${c}-node","#${c}-dot"],{opacity:0,scale:0.6},{opacity:1,scale:1,duration:0.35,ease:"power3.out",transformOrigin:"50% 50%"},${(40.6+i*0.7).toFixed(2)});
{const h=gsap.timeline({repeat:7});
 h.fromTo("#${c}-dot",{attr:{cx:480,cy:150},opacity:0},{opacity:1,duration:0.2})
  .to("#${c}-dot",{attr:{cx:${hx},cy:${hy}},duration:${dur},ease:"sine.inOut"})
  .to("#${c}-dot",{opacity:0,duration:0.25});
 tl.add(h,${(43.5+i*0.55).toFixed(2)});}`).join("\n")}


/* cue "a harness for its central nervous system" 42.92 */
tl.fromTo("#harnessLbl",{opacity:0},{opacity:1,duration:0.35},42.92);

/* AGENTS.md writes its own rules, on a loop */
tl.fromTo("#docw",{opacity:0},{opacity:1,duration:0.30},45.60);
draw("#doc .o",1.00,45.60);
{const wr=gsap.timeline({repeat:5});
 ${[0,1,2,3].map(i=>`wr.fromTo("#doc-r${i}",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.55,ease:"none"},${(i*0.6).toFixed(2)});`).join("\n ")}
 wr.to("#doc [id^='doc-r']",{strokeDashoffset:1,duration:0.35,ease:"none"},3.1);
 tl.add(wr,46.30);}
tl.fromTo("#docLbl",{opacity:0},{opacity:1,duration:0.35},46.80);
tl.fromTo("#lbl2",{opacity:0,y:10},{opacity:1,y:0,duration:0.40,ease:"power3.out"},47.20);

/* cue "bounded manner" at rel 70.20 */
tl.fromTo("#quote2",{opacity:0,y:16},{opacity:1,y:0,duration:0.5,ease:"power3.out"},69.20);
tl.set(["#m1","#m2","#quote2","#divider"],{opacity:1},71.159);`
});

// ---------- g009 the agent loop (over the demo scene -> OPAQUE panel) ------
export const g009 = () => {
  const nodes = [["Inspect",25.36],["Act",44.67],["Observe",49.36],["Decide",82.28]];
  const pos = [[130,6],[268,140],[130,282],[-8,140]];   // ring positions, centred on each node
  return {
  duration: 86.840, opaque: false,
  body: `
<section id="g009-scene" class="clip" data-start="0" data-duration="86.840" data-track-index="1">
  <div id="p9" class="panel-opaque" style="position:absolute;left:96px;top:280px;width:470px;
       padding:26px 30px 32px;border-radius:8px;opacity:0">
    <div class="capt muted eyebrow">The agent loop</div>
    <div style="position:relative;height:404px;margin-top:20px">
      <div id="ring" style="position:absolute;left:55px;top:52px;width:300px;height:300px;
           border:2px solid rgba(255,255,255,.22);border-radius:50%;
           clip-path:inset(0 0 100% 0)"></div>
      ${nodes.map(([n],i)=>`<div id="nd-${i}" class="disp" style="position:absolute;
        left:${pos[i][0]}px;top:${pos[i][1]}px;width:150px;text-align:center;
        font-size:34px;font-variation-settings:'wght' 700;color:rgba(255,255,255,.42);opacity:0">${n}</div>`).join("")}
      <!-- a rotating zero-size orbit traces an exact circle; waypoint tweens cut the corners -->
      <div id="dotorb" style="position:absolute;left:205px;top:202px;width:0;height:0">
        <div id="dot9" class="accent" style="position:absolute;left:-7px;top:-157px;
             width:14px;height:14px;border-radius:50%;opacity:0"></div>
      </div>
    </div>
  </div>
</section>`,
  script: `
tl.fromTo("#p9",{opacity:0,x:-24},{opacity:1,x:0,duration:0.45,ease:"power3.out"},0.20);
/* cue "inspect, act, observe, and decide" at rel 15.42 -- the ring draws */
tl.fromTo("#ring",{clipPath:"inset(0 0 100% 0)"},{clipPath:"inset(0 0 0% 0)",duration:1.20,ease:"power2.inOut"},15.42);
${nodes.map(([,c],i)=>`tl.fromTo("#nd-${i}",{opacity:0,scale:0.9},{opacity:1,scale:1,duration:0.35,ease:"power3.out"},${(15.6+i*0.42).toFixed(2)});`).join("\n")}
/* each stage lights to accent on its cue and dims when he moves on:
   exactly one node is accent at a time, so accentElementsPerScene holds */
${nodes.map(([,c],i)=>`
tl.to("#nd-${i}",{color:"${A}",duration:0.30},${c.toFixed(2)});
${i<nodes.length-1?`tl.to("#nd-${i}",{color:"rgba(255,255,255,.42)",duration:0.30},${nodes[i+1][1].toFixed(2)});`:""}`).join("")}
/* the dot runs the ring continuously so an 86.8s beat is never still. A rotating orbit
   is a true circle; the previous 8-waypoint tween visibly cut corners between points. */
tl.set("#dot9",{opacity:1},16.8);
{const run=gsap.timeline({repeat:13});
 run.fromTo("#dotorb",{rotate:0},{rotate:360,duration:5.0,ease:"none"});
 tl.add(run,16.8);}
tl.set(["#p9","#dot9"],{opacity:1},86.839);`
  };
};

// ---------- g010 the tools it used (abuts g009 exactly) --------------------
export const g010 = () => {
  const used = [["Terminal",2.23],["dbt",3.77],["DuckDB",4.77],["Git",5.77],["file system",8.57]];
  const maybe = [["MCP server",21.83],["web search",23.07]];
  return {
  duration: 28.000, opaque: false,
  body: `
<section id="g010-scene" class="clip" data-start="0" data-duration="28.000" data-track-index="1">
  <div id="p10" class="panel-opaque" style="position:absolute;left:96px;top:300px;width:470px;
       padding:26px 30px 32px;border-radius:8px">
    <div class="capt muted eyebrow">Tools</div>
    ${used.map(([t],i)=>`<div id="t10-${i}" class="disp" style="font-size:40px;
      font-variation-settings:'wght' 700;margin-top:${i?16:22}px;opacity:0">${t}</div>`).join("")}
    <div id="div10" class="accent rule2" style="margin-top:26px;width:150px"></div>
    ${maybe.map(([t],i)=>`<div id="m10-${i}" class="disp" style="font-size:36px;
      font-variation-settings:'wght' 500;margin-top:${i?12:20}px;opacity:0;color:rgba(255,255,255,.55)">${t}</div>`).join("")}
  </div>
</section>`,
  script: `
/* abuts g009 exactly: the ring shrinks into this card's header rather than cutting */
tl.fromTo("#p10",{opacity:0,scale:0.97},{opacity:1,scale:1,duration:0.40,ease:"power3.out"},0.00);
${used.map(([,c],i)=>`tl.fromTo("#t10-${i}",{opacity:0,yPercent:50},{opacity:1,yPercent:0,duration:0.32,ease:"power3.out"},${c.toFixed(2)});`).join("\n")}
tl.fromTo("#div10",{scaleX:0},{scaleX:1,duration:0.40,ease:"power2.inOut"},20.40);
${maybe.map(([,c],i)=>`tl.fromTo("#m10-${i}",{opacity:0,yPercent:40},{opacity:0.85,yPercent:0,duration:0.32,ease:"power3.out"},${c.toFixed(2)});`).join("\n")}
tl.to("#p10",{y:-10,duration:16.0,ease:"none"},9.5);
tl.to("#p10",{opacity:0,duration:0.30,ease:"power2.in"},27.70);`
  };
};

// ---------- g011 the verdict ----------------------------------------------
export const g011 = () => ({
  duration: 13.000, opaque: false,
  body: `
<section id="g011-scene" class="clip" data-start="0" data-duration="13.000" data-track-index="1">
  <!-- heroLeft, not the lower band: the verdict covered the speaker's face in the last pass -->
  <div id="v11" class="panel-inverted" style="position:absolute;left:96px;top:578px;width:716px;
       padding:30px 36px 32px;border-radius:8px;opacity:0">
    <div id="vhl" class="disp" style="font-size:88px;line-height:1.04;letter-spacing:-.022em">
      <div>Bounded,</div><div>not autonomous.</div>
    </div>
    <div id="vrule" class="accent rule2" style="margin-top:18px"></div>
  </div>
</section>`,
  script: `
/* cue "semi-autonomously" at rel 2.47. Arrives as one unit, so it reads as a verdict. */
tl.fromTo("#v11",{opacity:0,x:-22},{opacity:1,x:0,duration:0.45,ease:"power3.out"},2.47);
tl.fromTo("#vhl",{opacity:0,y:16},{opacity:1,y:0,duration:0.50,ease:"power3.out"},2.55);
tl.fromTo("#vrule",{scaleX:0},{scaleX:1,duration:0.45,ease:"power2.inOut"},3.15);
tl.to("#v11",{y:6,duration:8.2,ease:"none"},3.8);
tl.to("#v11",{opacity:0,duration:0.30,ease:"power2.in"},12.70);`
});

// ---------- g012 the end card (cue-triggered rows, accumulate, never exit) --
export const g012 = () => {
  const rows = [
    ["github",   "github",            "github.com/snudurupati",  0.00],
    ["youtube",  "like and subscribe","@srnudurupati",           4.13],
    ["linkedin", "linkedin",          "in/snudurupati",          5.32],
    ["x",        "x",                 "@srnudurupati",           6.95],
    ["blog",     "blog",              "nudurupati.co",           7.35]
  ];
  return {
  duration: 31.390, opaque: false,
  body: `
<section id="g012-scene" class="clip" data-start="0" data-duration="31.390" data-track-index="1">
  <div id="p12" class="panel-inverted" style="position:absolute;left:96px;top:300px;width:584px;
       padding:26px 30px 30px;border-radius:8px;opacity:0">
    ${rows.map(([id,label,val],i)=>`
    <div id="row-${id}" style="margin-top:${i?22:0}px;opacity:0;overflow:hidden">
      <div class="capt muted" style="font-size:28px;letter-spacing:.06em">${label}</div>
      <div class="disp" style="font-size:36px;font-variation-settings:'wght' 700;margin-top:4px">${val}</div>
      ${i===0?`<div id="er" class="accent rule2" style="margin-top:14px;width:180px"></div>`:""}
    </div>`).join("")}
  </div>
</section>`,
  script: `
tl.fromTo("#p12",{opacity:0,x:-20},{opacity:1,x:0,duration:0.40,ease:"power3.out"},0.00);
${rows.map(([id,,,c],i)=>
`tl.fromTo("#row-${id}",{opacity:0,clipPath:"inset(100% 0 0 0)"},
  {opacity:1,clipPath:"inset(0% 0 0 0)",duration:0.35,ease:"power3.out"},${c.toFixed(2)});`).join("\n")}
tl.fromTo("#er",{scaleX:0},{scaleX:1,duration:0.40,ease:"power2.inOut"},0.45);
/* rows accumulate and HOLD to the last frame; none of them exit */
tl.set("#p12",{opacity:1},31.389);`
  };
};
