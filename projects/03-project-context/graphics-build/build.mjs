// Parts g001-g003. Shared scaffolding lives in lib.mjs so there is exactly one
// definition of the CSS, the 2x stage and the timeline registration.
import { C, head, tail, emit, panelClass, rel, span, brainInJar, cardX, CARD_Y} from "./lib.mjs";

/* ------------------------------------------------------------------ g001 ---
   HOOK, rebuilt. The line is "your AI demos look brilliant and your POCs work
   great, then why do so many production AI use cases fail?", and the answer the
   video gives is: the production environment is messy and the model has no
   context for it. So that is what this draws.

   Scattered fragments of a real environment appear, unlabelled and unordered.
   The brain in a jar (the series motif for "the model") sits in the middle of
   them and cannot make sense of it: question marks rise off it and, at "fail?",
   the whole cloud goes $accent while the fragments recede.

   It does NOT draw a building. A building at 0:00 is out of context 18 seconds
   before an architect is mentioned, which is why the first two versions were
   rejected.                                                                     */
{
  const id = "g001", [S, E] = span(id), D = +(E - S).toFixed(2), SID = "hook";

  // The eleven questions the model could not answer from the repo alone, supplied
  // by the human 2026-09-08, minus one he cut on review. Case normalised to
  // initcap throughout: they arrived mixed, and a cloud reads as noise when half
  // the items start lower and half upper. These ARE the gaps: with none of them answered it
  // speculated, and every wrong thing Run A did follows from one of them.
  //
  // JAR EXCLUSION. The jar occupies SVG x 262-390, y 131-291. Nothing may cross
  // it. Long questions therefore go in the top and bottom bands, which are clear
  // of the jar's y range entirely; short ones go in the side columns. The
  // assertion below fails the build if an estimated width would reach the jar,
  // and it fired on the first attempt, which is why the phrasing is placed by
  // length rather than by eye.
  const JAR_BOX = { x0: 262, x1: 390, y0: 131, y1: 291 };
  const FS = 16;
  const FACTS = [
    // top band, clear of the jar and of the "?" slot above it
    ["Which snapshot is the truth?",   14,  32, "T"],
    ["Is that list of values fixed?", 380,  62, "T"],
    // side columns, inside the jar's y range
    ["What is one row?",               14, 150, "L"],
    ["What is the grain?",             14, 200, "L"],
    ["Who owns this feed?",            14, 250, "L"],
    ["Can this column be null?",      400, 150, "R"],
    ["How far back do we keep?",      400, 200, "R"],
    ["Who decides &quot;current&quot;?", 400, 250, "R"],
    // bottom band, clear of the jar
    ["What did it say in April?",      40, 330, "B"],
    ["Full dump or change feed?",     330, 362, "B"],
    ["One file a night, or more?",     60, 394, "B"],
  ];

  // The big "?" is a placed element like any other, so it goes in the same box
  // list and is checked the same way.
  // Centred on the jar's own axis ((262+390)/2 = 326), not eyeballed at 300, and
  // drawn bigger with a stroke so it reads as thick. Director 2026-09-09.
  const BIGQ = { x: 326, y: 114, fs: 96 };

  // Estimated boxes. Every pair is checked against every other pair AND against
  // the jar. The previous version only checked text against the jar, which is
  // exactly why the "?" ended up sitting on two of the questions: nothing was
  // looking at text-against-text at all.
  const box = (t, x, y, fs) => ({
    t, x0: x, x1: x + t.replace(/&quot;/g, '"').length * fs * 0.56,
    y0: y - fs * 0.72, y1: y + fs * 0.10,
  });
  // the ? is text-anchor:middle now, so its box straddles BIGQ.x
  const BOXES = FACTS.map(([t, x, y]) => box(t, x, y, FS))
                     .concat([box("?", BIGQ.x - BIGQ.fs * 0.28, BIGQ.y, BIGQ.fs)]);
  const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  BOXES.forEach((a, i) => {
    if (a.x1 > 650) throw new Error(`g001: "${a.t}" overflows the card (ends ${Math.round(a.x1)})`);
    if (hit(a, { x0: JAR_BOX.x0, x1: JAR_BOX.x1, y0: JAR_BOX.y0, y1: JAR_BOX.y1 }))
      throw new Error(`g001: "${a.t}" intersects the jar`);
    BOXES.slice(i + 1).forEach(b => {
      if (hit(a, b)) throw new Error(`g001: "${a.t}" overlaps "${b.t}"`);
    });
  });

  const facts = FACTS.map(([t, x, y], i) =>
    `<text id="fact${i}" x="${x}" y="${y}" font-family="Satoshi" font-size="${FS}"
           font-variation-settings="'wght' 700" fill="${C.muted}" opacity="0">${t}</text>`).join("\n      ");
  const qmarks = `<text id="bigq" x="${BIGQ.x}" y="${BIGQ.y}" font-family="Satoshi" font-size="${BIGQ.fs}"
           text-anchor="middle" font-variation-settings="'wght' 900" fill="${C.accent}"
           stroke="${C.accent}" stroke-width="3" stroke-linejoin="round" opacity="0">?</text>`;
  const body = `
<section id="scene-${SID}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="sheet" class="sheet" style="position:absolute;left:96px;top:330px;width:724px;height:490px;
       padding:34px;opacity:0">
    <svg width="656" height="422" viewBox="0 0 656 422" fill="none"
         style="position:absolute;left:34px;top:34px">
      ${facts}
      ${qmarks}
    </svg>
    ${brainInJar("brain", 296, 165, 0.40)}
  </div>
</section>`;
  const factJs = FACTS.map((_, i) =>
    `tl.fromTo("#fact${i}",{opacity:0,y:6},{opacity:1,y:0,duration:0.32,ease:"power2.out"},${(2.40 + i * 0.36).toFixed(2)});`
  ).join("\n");
  const js = `
tl.fromTo("#sheet",{opacity:0,x:-40},{opacity:1,x:0,duration:0.50,ease:"power3.out"},0.00);
// the model first, alone and drawn
tl.fromTo("#brain-jar .o",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.10,ease:"power2.inOut"},0.45);
tl.fromTo("#brain-jar .m",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.55,ease:"power2.inOut"},1.30);
tl.fromTo("#brain-jar .h",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.60,ease:"power2.inOut"},1.45);
tl.fromTo("#brain-brain .o",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.10,ease:"power2.inOut"},1.05);
tl.fromTo("#brain-brain .s",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.30,ease:"power2.inOut"},1.60);
// then everything it cannot answer from the repo, accumulating around it
${factJs}
// "fail?" at 6.62: the questions sharpen and the one accent element lands
tl.to(${JSON.stringify(FACTS.map((_, i) => `#fact${i}`).join(","))},{fill:"${C.ink}",duration:0.45,ease:"power2.inOut"},6.62);
tl.fromTo("#bigq",{opacity:0,scale:0.7,svgOrigin:"316 108"},
                  {opacity:1,scale:1,duration:0.55,ease:"back.out(2)",svgOrigin:"316 108"},6.66);
tl.to("#sheet",{opacity:0,duration:0.35,ease:"power2.in"},${(D - 0.45).toFixed(2)});
tl.set("#sheet",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

/* ------------------------------------------------------------------ g002 ---
   Lower third. heroLeft column, NOT the full-width lower band, which runs
   under the chin in this framing.                                            */
{
  const id = "g002", [S, E] = span(id), D = +(E - S).toFixed(2), SID = "lower-third";
  const body = `
<section id="scene-${SID}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div id="wrap" style="position:absolute;left:96px;top:742px;width:724px;overflow:hidden;padding-left:22px">
    <div id="ar" class="accentbar" style="position:absolute;left:0;top:6px;width:3px;height:0"></div>
    <div id="card" class="sheet" style="padding:22px 34px;border-radius:6px">
      <div class="disp" style="font-size:46px;font-variation-settings:'wght' 700;line-height:1.1">Sreeram Nudurupati</div>
      <div class="med muted" style="font-size:26px;margin-top:8px">AI for the Working Data Engineer</div>
    </div>
  </div>
</section>`;
  const js = `
tl.fromTo("#card",{yPercent:100,opacity:1},{yPercent:0,opacity:1,duration:0.38,ease:"power3.out"},0.10);
tl.fromTo("#ar",{height:0},{height:104,duration:0.35,ease:"power2.out"},0.32);
tl.to("#ar",{height:0,duration:0.26,ease:"power2.in"},${(D - 0.55).toFixed(2)});
tl.to("#card",{yPercent:100,duration:0.32,ease:"power2.in"},${(D - 0.50).toFixed(2)});
tl.set("#card",{opacity:0},${D.toFixed(2)});`;
  emit(id, D, body, js);
}

/* ------------------------------------------------------------------ g003 ---
   THE ARCHITECT, full frame. class:"segment", so it replaces the picture and
   there is no face behind it: the human's call 2026-09-08. Authored on the full
   1920x1080 canvas with an opaque $bg ground rather than in the left column.

   The building is ONE object that MORPHS. The body and the ground never change;
   the flat modern slab and its windows give way to a pediment and columns, and
   the stroke goes from $ink to $accent. It is not a cross-fade between two
   drawings: that read as two buildings side by side on the first attempt.

   The card carries the ACTUAL requirements from the transcript, not coloured
   bars. Two were given. Four were never said, and those arrive in $accent as he
   names them.                                                                  */
{
  const id = "g003", [S, E] = span(id), D = +(E - S).toFixed(2), at = rel(S), SID = "architect";
  const GIVEN = [["A budget", 42.29], ["A few basic requirements", 43.10]];
  const MISSED = [
    ["The client is a professor of Greek studies", 62.39],
    ["An avid fan of Greek architecture",          64.60],
    ["The firm deals exclusively in classical",    68.52],
    ["It does not build anything modern",          69.94],
  ];
  const givenMk = GIVEN.map(([t], i) =>
    `<div id="${id}g${i}" class="med" style="font-size:34px;line-height:1.5;opacity:0">${t}</div>`).join("\n      ");
  const missMk = MISSED.map(([t], i) =>
    `<div id="${id}m${i}" class="med" style="font-size:34px;line-height:1.5;color:${C.accent};opacity:0">${t}</div>`).join("\n      ");

  // The architect's past work. Detailed silhouettes, not bare outlines: a house
  // with a pitched roof and a door, a low-rise, a tower, an apartment block, a
  // commercial shed. "Commercial and residential" has to be legible in the
  // shapes, not only in the caption. They stand ON the main ground line at
  // y=880 rather than floating on an implied one 100px above it.
  const SKY = [
    `<path d="M140 880 V782 L185 742 L230 782 V880" stroke="${C.muted}" stroke-width="3.4"
           fill="none" stroke-linejoin="round"/>
     <rect x="172" y="824" width="26" height="56" stroke="${C.muted}" stroke-width="2.6" fill="none"/>`,
    `<path d="M250 880 V764 H346 V880" stroke="${C.muted}" stroke-width="3.4"
           fill="none" stroke-linejoin="round"/>
     <rect x="266" y="784" width="26" height="26" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="306" y="784" width="26" height="26" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="266" y="826" width="26" height="26" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="306" y="826" width="26" height="26" stroke="${C.muted}" stroke-width="2.4" fill="none"/>`,
    `<path d="M366 880 V642 H434 V880" stroke="${C.muted}" stroke-width="3.4"
           fill="none" stroke-linejoin="round"/>
     <rect x="382" y="664" width="36" height="22" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="382" y="706" width="36" height="22" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="382" y="748" width="36" height="22" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="382" y="790" width="36" height="22" stroke="${C.muted}" stroke-width="2.4" fill="none"/>`,
    `<path d="M454 880 V706 H560 V880" stroke="${C.muted}" stroke-width="3.4"
           fill="none" stroke-linejoin="round"/>
     <rect x="470" y="726" width="28" height="24" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="516" y="726" width="28" height="24" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="470" y="772" width="28" height="24" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="516" y="772" width="28" height="24" stroke="${C.muted}" stroke-width="2.4" fill="none"/>
     <rect x="494" y="824" width="26" height="56" stroke="${C.muted}" stroke-width="2.4" fill="none"/>`,
    `<path d="M580 880 V808 H690 V880" stroke="${C.muted}" stroke-width="3.4"
           fill="none" stroke-linejoin="round"/>
     <path d="M580 842 H690" stroke="${C.muted}" stroke-width="2.4"/>`,
  ].map((m, i) => `<g id="${id}s${i}" opacity="0">${m}</g>`).join("\n      ");

  const body = `
<section id="scene-${SID}" class="clip" data-start="0" data-duration="${D.toFixed(3)}" data-track-index="1">
  <div style="position:absolute;inset:0;background:${C.bg}"></div>
  <div style="position:absolute;left:120px;top:150px;width:800px">
    <div id="${id}eb" class="capt eyebrow" style="font-size:26px;color:${C.muted};opacity:0">what the architect was given</div>
    <div style="margin-top:26px">${givenMk}</div>
    <div id="${id}eb2" class="capt eyebrow" style="font-size:26px;color:${C.muted};margin-top:44px;opacity:0">what nobody told them</div>
    <div style="margin-top:26px">${missMk}</div>
  </div>
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none"
       style="position:absolute;left:0;top:0">
    <path id="${id}ground" d="M120 880 H1800" stroke="${C.rule}" stroke-width="3" stroke-linecap="round"
          pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    ${SKY}
    <!-- ONE object. body and ground persist; the roof and the walls morph. -->
    <g id="${id}bld">
      <path id="${id}body" d="M1180 880 V560 H1560 V880" stroke="${C.ink}" stroke-width="5"
            fill="none" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <path id="${id}slab" d="M1150 560 H1590 V532 H1150 Z" stroke="${C.ink}" stroke-width="5"
            fill="none" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <g id="${id}win" opacity="0">
        <rect x="1224" y="606" width="76" height="58" rx="3" stroke="${C.ink}" stroke-width="4" fill="none"/>
        <rect x="1332" y="606" width="76" height="58" rx="3" stroke="${C.ink}" stroke-width="4" fill="none"/>
        <rect x="1440" y="606" width="76" height="58" rx="3" stroke="${C.ink}" stroke-width="4" fill="none"/>
        <rect x="1224" y="716" width="76" height="58" rx="3" stroke="${C.ink}" stroke-width="4" fill="none"/>
        <rect x="1440" y="716" width="76" height="58" rx="3" stroke="${C.ink}" stroke-width="4" fill="none"/>
        <rect x="1338" y="742" width="64" height="138" rx="3" stroke="${C.ink}" stroke-width="4" fill="none"/>
      </g>
      <path id="${id}ped" d="M1128 532 L1370 396 L1612 532 Z" stroke="${C.accent}" stroke-width="5"
            fill="none" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" opacity="0"/>
      <g id="${id}cols" opacity="0">
        <path d="M1214 560 V880 M1300 560 V880 M1386 560 V880 M1472 560 V880 M1546 560 V880"
              stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>
        <path d="M1150 560 H1590" stroke="${C.accent}" stroke-width="5" stroke-linecap="round"/>
      </g>
    </g>
  </svg>
  <div id="${id}cap" class="med" style="position:absolute;left:140px;top:906px;font-size:30px;
       color:${C.muted};opacity:0">15 years. Commercial and residential.</div>
</section>`;
  const js = `
tl.fromTo("#${id}ground",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.20,ease:"power2.inOut"},${at(18.30)});
tl.fromTo("#${id}eb",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(20.16)});
${[0, 1, 2, 3, 4].map(i => `tl.fromTo("#${id}s${i}",{opacity:0,scaleY:0,svgOrigin:"0 880"},{opacity:1,scaleY:1,duration:0.42,ease:"power3.out",svgOrigin:"0 880"},${at(25.32 + i * 0.40)});`).join("\n")}
tl.fromTo("#${id}cap",{opacity:0},{opacity:1,duration:0.45,ease:"power2.out"},${at(27.40)});
${GIVEN.map(([, t], i) => `tl.fromTo("#${id}g${i}",{opacity:0,x:-16},{opacity:1,x:0,duration:0.40,ease:"power3.out"},${at(t)});`).join("\n")}
// "they come back with the design" -> the modern building draws itself
tl.fromTo("#${id}body",{strokeDashoffset:1},{strokeDashoffset:0,duration:1.60,ease:"power2.inOut"},${at(45.11)});
tl.fromTo("#${id}slab",{strokeDashoffset:1},{strokeDashoffset:0,duration:0.90,ease:"power2.inOut"},${at(46.40)});
tl.fromTo("#${id}win",{opacity:0},{opacity:1,duration:0.60,ease:"power2.out"},${at(47.40)});
// "the client is not at all satisfied"
tl.to("#${id}body",{stroke:"${C.muted}",duration:0.60,ease:"power2.inOut"},${at(54.13)});
tl.to("#${id}slab",{stroke:"${C.muted}",duration:0.60,ease:"power2.inOut"},${at(54.13)});
tl.to("#${id}win",{opacity:0.35,duration:0.60,ease:"power2.inOut"},${at(54.13)});
tl.fromTo("#${id}eb2",{opacity:0},{opacity:1,duration:0.40,ease:"power2.out"},${at(58.01)});
${MISSED.map(([, t], i) => `tl.fromTo("#${id}m${i}",{opacity:0,x:-16},{opacity:1,x:0,duration:0.45,ease:"power3.out"},${at(t)});`).join("\n")}
// THE MORPH: the slab lifts into a pediment and the walls become columns.
// Same body, same footprint, same ground. One object changing, not two drawings.
tl.to("#${id}win",{opacity:0,duration:0.50,ease:"power2.in"},${at(62.60)});
tl.to("#${id}slab",{opacity:0,duration:0.55,ease:"power2.inOut"},${at(63.10)});
tl.fromTo("#${id}ped",{opacity:1,strokeDashoffset:1},{opacity:1,strokeDashoffset:0,duration:1.30,ease:"power2.inOut"},${at(62.90)});
tl.fromTo("#${id}cols",{opacity:0},{opacity:1,duration:0.90,ease:"power2.out"},${at(68.52)});
tl.to("#${id}body",{stroke:"${C.accent}",duration:0.80,ease:"power2.inOut"},${at(69.20)});`;
  emit(id, D, body, js);
}

console.log("done");
