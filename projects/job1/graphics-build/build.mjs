#!/usr/bin/env node
/**
 * job1 graphics build.
 *
 * One script holds the shared CSS, the per-graphic markup and the per-graphic
 * animation, and emits one composition file per part. Compositions are never
 * hand-written (.claude/skills/graphics, Part B).
 *
 * Authoring canvas is 1920x1080 — every number in styles/editorial/style.md is a
 * canvas number. Delivery is 3840x2160, reached by scaling the stage 2x in CSS.
 * The stage transform is static and GSAP never touches it (never put a CSS
 * transform and a GSAP tween on the same property).
 *
 * Timeline contract honoured throughout: one paused master timeline per part,
 * absolute seconds, fromTo on every entrance, explicit opacity kill on every
 * exit that lands on a boundary, no randomness, no timers, no CSS blur/grayscale
 * filters, no class-name tweens, no emoji, minimum 0.2s on instant changes.
 */
import { mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// One project per part: hyperframes lint/check/render all take a project DIR,
// so each composition gets its own directory with an index.html.
const OUT = join(HERE, 'parts');
mkdirSync(OUT, { recursive: true });
const FONT_SRC = join(HERE, 'overlays', 'assets', 'fonts', 'Satoshi-Variable.ttf');
const HF_JSON = JSON.stringify({
  $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
  paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
  media: { autoProxy: true },
}, null, 2) + '\n';

const brand = JSON.parse(
  readFileSync(join(HERE, '..', '..', '..', 'brand.md'), 'utf8')
    .split('```json')[1].split('```')[0]
);
const C = brand.colors;
const TAIL = 0.5;   // assets outlast their window
const plan = JSON.parse(readFileSync(join(HERE, 'cutsheet.json'), 'utf8'));

const CSS = `
@font-face {
  font-family: 'Satoshi';
  src: url('assets/fonts/Satoshi-Variable.ttf') format('truetype-variations');
  font-weight: 300 900;
  font-style: normal;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 3840px; height: 2160px; overflow: hidden;
  background: transparent;                 /* overlays composite over footage */
  font-family: 'Satoshi', sans-serif;
  -webkit-font-smoothing: antialiased;
}
#root { width: 3840px; height: 2160px; position: relative; }
#stage {
  position: absolute; top: 0; left: 0;
  width: 1920px; height: 1080px;
  transform: scale(2); transform-origin: top left;  /* static: GSAP never tweens this */
}
.panel {
  background: ${C.bg}EB;                   /* 92% — reads on its own fill, no backdrop blur */
  border: 1px solid ${C.rule};
  border-radius: 16px;
}
.eyebrow {
  font-weight: 500; font-size: 28px; letter-spacing: 0.18em;
  text-transform: uppercase; color: ${C.muted};
}
.kicker {
  font-weight: 700; font-size: 22px; letter-spacing: 0.14em;
  text-transform: uppercase; color: ${C.muted};
}
.headline { font-weight: 900; color: ${C.ink}; line-height: 1.05; }
.sub      { font-weight: 500; color: ${C.muted}; }
.accentbar { background: ${C.accent}; }
.rulebar   { background: ${C.rule}; }
.mask { overflow: hidden; display: block; }
.mask > span { display: block; }
.word { display: inline-block; white-space: pre; }
`;

/* ---------- helpers ---------- */
const words = (t, cls = '') =>
  t.split(' ').map(w => `<span class="word ${cls}">${w}</span>`).join(' ');
const maskLine = (id, inner, style = '') =>
  `<span class="mask" id="${id}"><span style="${style}">${inner}</span></span>`;

/** Every entrance is a fromTo; every exit that lands on the boundary gets a hard
 *  opacity kill at that exact time so an unresolved tween cannot pop. */
const enterUp = (sel, at, d = 0.5, y = 24) =>
  `tl.fromTo("${sel}",{opacity:0,y:${y}},{opacity:1,y:0,duration:${d},ease:"power3.out"},${at});`;
const enterMask = (sel, at, d = 0.5) =>
  `tl.fromTo("${sel} > span",{yPercent:110},{yPercent:0,duration:${d},ease:"power3.out"},${at});`;
const drawX = (sel, at, d = 0.45) =>
  `tl.fromTo("${sel}",{scaleX:0,transformOrigin:"left center"},{scaleX:1,duration:${d},ease:"power2.out"},${at});`;
const wordsIn = (sel, at, stagger = 0.05, d = 0.45) =>
  `tl.fromTo("${sel} .word",{opacity:0,y:18},{opacity:1,y:0,duration:${d},ease:"power3.out",stagger:${stagger}},${at});`;
const fadeOut = (sel, at, d = 0.35) =>
  `tl.fromTo("${sel}",{opacity:1},{opacity:0,duration:${d},ease:"power2.in"},${at});` +
  `tl.set("${sel}",{opacity:0},${(at + d).toFixed(3)});`;

/* ---------- per-part content ---------- */
const B = {};

B.g001 = d => ({
  html: `
    <div id="hook" class="panel" style="position:absolute;left:192px;top:600px;width:1180px;padding:48px 56px 56px">
      <div class="eyebrow" id="eyebrow">AI + Data engineering</div>
      <div class="headline" id="head" style="font-size:96px;margin-top:22px">${words('Is AI going to take all our jobs?')}</div>
      <div class="accentbar" id="rule" style="height:4px;width:280px;margin-top:34px"></div>
    </div>`,
  js: [
    enterUp('#hook', 0.0, 0.55, 28),
    `tl.fromTo("#eyebrow",{opacity:0,x:-18},{opacity:1,x:0,duration:0.4,ease:"power3.out"},0.25);`,
    wordsIn('#head', 0.65, 0.06),
    drawX('#rule', 1.5, 0.45),
    fadeOut('#hook', d - 0.45, 0.4),
  ],
});

B.g002 = d => ({
  html: `
    <div id="chip" class="panel" style="position:absolute;left:192px;top:806px;width:760px;padding:30px 38px;border-radius:12px;overflow:hidden">
      <div class="accentbar" id="bar" style="position:absolute;left:0;top:0;width:6px;height:100%"></div>
      <div class="headline" style="font-size:44px;font-weight:700" id="name">Sreeram</div>
      <div class="sub" id="role" style="font-size:26px;margin-top:8px">Data engineer &middot; two years into AI</div>
    </div>`,
  js: [
    `tl.fromTo("#chip",{opacity:0,y:90},{opacity:1,y:0,duration:0.35,ease:"power3.out"},0);`,
    `tl.fromTo("#bar",{scaleY:0,transformOrigin:"top center"},{scaleY:1,duration:0.3,ease:"power2.out"},0.35);`,
    `tl.fromTo("#role",{opacity:0},{opacity:1,duration:0.3,ease:"none"},0.5);`,
    fadeOut('#chip', d - 0.4, 0.3),
  ],
});

B.g003 = d => ({
  html: `
    <div id="quote" class="panel" style="position:absolute;left:1040px;top:300px;width:690px;padding:52px 48px">
      <div class="headline" style="font-size:64px">
        ${maskLine('q1', 'A full video game.')}
        ${maskLine('q2', 'One prompt.')}
      </div>
      <div class="sub" id="src" style="font-size:24px;margin-top:30px">Opus 5 launch, seen on X</div>
    </div>`,
  js: [
    `tl.fromTo("#quote",{opacity:0,x:40},{opacity:1,x:0,duration:0.45,ease:"power3.out"},0);`,
    enterMask('#q1', 0.3, 0.5),
    enterMask('#q2', 0.7, 0.5),
    `tl.fromTo("#src",{opacity:0},{opacity:1,duration:0.3,ease:"none"},1.1);`,
    fadeOut('#quote', d - 0.4, 0.35),
  ],
});

B.g004 = d => ({
  html: `
    <div id="punch" class="panel" style="position:absolute;left:192px;top:680px;width:1536px;padding:44px 56px 52px;text-align:center">
      <div class="rulebar" id="hair" style="height:1px;width:100%;margin-bottom:34px"></div>
      <div class="headline" id="line" style="font-size:72px">
        <span class="word">Data</span> <span class="word">analytics</span> <span class="word">is</span>
        <span class="word" style="color:${C.accent}">NOT</span>
        <span class="word">software</span> <span class="word">engineering.</span>
      </div>
    </div>`,
  js: [
    drawX('#hair', 0.0, 0.5),
    wordsIn('#line', 0.5, 0.09, 0.4),
    `tl.fromTo("#line",{opacity:1},{opacity:0,duration:0.25,ease:"power2.in"},${(d - 0.5).toFixed(3)});`,
    `tl.set("#line",{opacity:0},${(d - 0.25).toFixed(3)});`,
    `tl.fromTo("#hair",{scaleX:1,transformOrigin:"right center"},{scaleX:0,duration:0.3,ease:"power2.in"},${(d - 0.3).toFixed(3)});`,
  ],
});

B.g005 = d => {
  const nodes = ['Ingest', 'Cleanse', 'Transform', 'Warehouse', 'Reverse ETL'];
  const html = `
    <div id="pipe" style="position:absolute;left:192px;top:150px;width:1536px;display:flex;align-items:center;justify-content:space-between">
      ${nodes.map((n, i) => `
        ${i ? `<div class="rulebar conn" id="c${i}" style="height:2px;flex:1;margin:0 14px"></div>` : ''}
        <div class="panel node" id="n${i}" style="padding:22px 30px;border-radius:999px;white-space:nowrap${
          i === nodes.length - 1 ? `;border-color:${C.accent};border-width:2px` : ''}">
          <span style="font-weight:700;font-size:26px;color:${C.ink}">${n}</span>
        </div>`).join('')}
    </div>`;
  const js = [];
  nodes.forEach((_, i) => {
    const at = i * 0.75;
    js.push(`tl.fromTo("#n${i}",{opacity:0,scale:0.94},{opacity:1,scale:1,duration:0.45,ease:"power3.out"},${at});`);
    if (i) js.push(drawX(`#c${i}`, at - 0.3, 0.3));
  });
  js.push(`tl.fromTo(".node",{opacity:1},{opacity:0,duration:0.4,ease:"power2.in",stagger:0.06},${(d - 0.6).toFixed(3)});`);
  js.push(`tl.fromTo(".conn",{opacity:1},{opacity:0,duration:0.3,ease:"power2.in"},${(d - 0.6).toFixed(3)});`);
  js.push(`tl.set("#pipe",{opacity:0},${(d - 0.1).toFixed(3)});`);
  return { html, js };
};

B.g006 = d => {
  const cards = [
    ['ERP', 'orders, products, branches'],
    ['CRM', 'Salesforce'],
    ['E-commerce', 'web sales'],
    ['POS', 'walk-in tills'],
  ];
  const html = `
    <div id="grid" style="position:absolute;left:1000px;top:230px;width:728px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
      ${cards.map(([t, s], i) => `
        <div class="panel card" id="k${i}" style="padding:28px 26px;border-radius:12px;position:relative;overflow:hidden">
          ${i === 3 ? `<div class="accentbar" style="position:absolute;left:0;top:0;width:5px;height:100%"></div>` : ''}
          <div class="headline" style="font-size:34px;font-weight:700">${t}</div>
          <div class="sub" style="font-size:22px;margin-top:8px">${s}</div>
        </div>`).join('')}
    </div>`;
  const js = cards.map((_, i) =>
    `tl.fromTo("#k${i}",{opacity:0,y:26},{opacity:1,y:0,duration:0.45,ease:"power3.out"},${(i * 0.4).toFixed(2)});`);
  js.push(`tl.fromTo(".card",{opacity:1},{opacity:0,duration:0.3,ease:"power2.in",stagger:0.05},${(d - 0.6).toFixed(3)});`);
  js.push(`tl.set("#grid",{opacity:0},${(d - 0.1).toFixed(3)});`);
  return { html, js };
};

const patternChip = (n, title, sub, accentNum) => d => ({
  html: `
    <div id="chip" class="panel" style="position:absolute;left:192px;top:770px;width:900px;padding:32px 40px;border-radius:12px">
      <div class="kicker" id="kick">How data arrives &middot;
        <span style="color:${accentNum ? C.accent : C.muted}">${n}</span></div>
      <div class="headline" id="title" style="font-size:48px;margin-top:14px">${title}</div>
      <div class="sub" id="sub" style="font-size:26px;margin-top:12px">${sub}</div>
    </div>`,
  js: [
    `tl.fromTo("#chip",{opacity:0,y:90},{opacity:1,y:0,duration:0.35,ease:"power3.out"},0);`,
    `tl.fromTo("#sub",{opacity:0},{opacity:1,duration:0.3,ease:"none"},0.65);`,
    fadeOut('#chip', d - 0.4, 0.3),
  ],
});
B.g007 = patternChip(1, 'Change data capture', 'every change, marked insert / update / delete', false);
B.g008 = patternChip(2, 'Daily full snapshot', 'diff today against yesterday to find the delta', true);
B.g009 = patternChip(3, 'POS deltas only', 'new sales, exchanges, refunds &mdash; that day', true);

B.g010 = d => {
  const rows = [['dbt', 'transformation', 0.5], ['DuckDB', 'warehouse', 4.1], ['Claude Opus 5', 'the engineer', 13.2]];
  const html = `
    <div id="stack" class="panel" style="position:absolute;left:1100px;top:280px;width:628px;padding:44px 42px">
      <div class="eyebrow">The stack</div>
      ${rows.map(([n, r], i) => `
        ${i ? `<div class="rulebar row-div" id="d${i}" style="height:1px;width:100%;margin:26px 0"></div>` : '<div style="height:26px"></div>'}
        <div class="row" id="r${i}" style="position:relative;padding-left:${i === 2 ? '22px' : '0'}">
          ${i === 2 ? `<div class="accentbar" style="position:absolute;left:0;top:4px;width:5px;height:calc(100% - 8px)"></div>` : ''}
          ${maskLine(`rn${i}`, `<span class="headline" style="font-size:56px">${n}</span>`)}
          <div class="sub" style="font-size:24px;margin-top:6px">${r}</div>
        </div>`).join('')}
    </div>`;
  const js = [enterUp('#stack', 0.0, 0.5, 24)];
  rows.forEach(([, , at], i) => {
    js.push(`tl.fromTo("#r${i}",{opacity:0},{opacity:1,duration:0.2,ease:"none"},${at});`);
    js.push(enterMask(`#rn${i}`, at, 0.5));
    if (i) js.push(drawX(`#d${i}`, at - 0.35, 0.35));
  });
  // continuous motion across the full 19.7s beat — nothing may sit frozen
  js.push(`tl.fromTo("#stack",{scale:1.0},{scale:1.02,duration:${(d - 0.5).toFixed(2)},ease:"none",transformOrigin:"center center"},0.2);`);
  js.push(fadeOut('#stack', d - 0.45, 0.4));
  return { html, js };
};

const demoChip = (kick, title, sub) => d => ({
  html: `
    <div id="chip" class="panel" style="position:absolute;left:120px;top:110px;width:820px;padding:28px 34px;border-radius:12px">
      <div class="kicker" style="color:${C.accent}">${kick}</div>
      <div class="headline" id="t" style="font-size:38px;font-weight:700;margin-top:10px">${title}</div>
      ${sub ? `<div class="sub" id="s" style="font-size:24px;margin-top:8px">${sub}</div>` : ''}
    </div>`,
  js: [
    `tl.fromTo("#chip",{opacity:0,x:-32},{opacity:1,x:0,duration:0.4,ease:"power3.out"},0);`,
    ...(sub ? [`tl.fromTo("#s",{opacity:0},{opacity:1,duration:0.3,ease:"none"},0.6);`] : []),
    `tl.fromTo("#chip",{opacity:1,x:0},{opacity:0,x:-24,duration:0.3,ease:"power2.in"},${(d - 0.4).toFixed(3)});`,
    `tl.set("#chip",{opacity:0},${(d - 0.1).toFixed(3)});`,
  ],
});
B.g012 = demoChip('Live demo', 'Claude Code &middot; dbt &middot; DuckDB', '');
B.g013 = demoChip('The context layer', 'conventions.md &mdash; the business rules', 'plus coding and naming standards');

B.g014 = d => ({
  html: `
    <div id="stat" class="panel" style="position:absolute;left:1100px;top:280px;width:628px;padding:44px 46px 50px">
      <div class="headline" id="num" style="font-size:220px;line-height:0.9">0</div>
      <div class="accentbar" id="rule" style="height:4px;width:220px;margin:18px 0 22px"></div>
      ${maskLine('lab', `<span class="headline" style="font-size:44px;font-weight:700">iterations</span>`)}
      <div class="sub" id="sub" style="font-size:26px;margin-top:16px">brilliant every time.<br>stupid every time.</div>
    </div>`,
  js: [
    `var counter={v:0};`,
    `tl.fromTo("#num",{opacity:0},{opacity:1,duration:0.2,ease:"none"},0);`,
    `tl.fromTo(counter,{v:0},{v:10,duration:1.1,ease:"power2.out",onUpdate:function(){document.getElementById("num").textContent=Math.round(counter.v);}},0.1);`,
    drawX('#rule', 0.1, 1.1),
    enterMask('#lab', 1.6, 0.5),
    `tl.fromTo("#sub",{opacity:0},{opacity:1,duration:0.3,ease:"none"},2.0);`,
    fadeOut('#stat', d - 0.45, 0.4),
  ],
});

const finding = (kick, line, accent) => d => ({
  html: `
    <div id="find" class="panel" style="position:absolute;left:192px;top:700px;width:1536px;padding:40px 52px 48px">
      <div style="display:flex;align-items:center;gap:18px">
        <div id="tick" class="${accent ? 'accentbar' : 'rulebar'}" style="height:3px;width:64px"></div>
        <div class="kicker">${kick}</div>
      </div>
      <div class="headline" id="line" style="font-size:64px;margin-top:20px">${words(line)}</div>
    </div>`,
  js: [
    drawX('#tick', 0.0, 0.35),
    `tl.fromTo(".kicker",{opacity:0},{opacity:1,duration:0.25,ease:"none"},0.3);`,
    wordsIn('#line', 0.6, 0.05),
    fadeOut('#find', d - 0.45, 0.4),
  ],
});
B.g015 = finding('What it got right', 'Anything you can codify, it infers.', true);
B.g016 = finding('What it missed', 'Tribal knowledge. Years of debugging.', false);

B.g017 = d => ({
  html: `
    <div id="verdict" class="panel" style="position:absolute;left:192px;top:596px;width:1536px;padding:44px 56px 56px;text-align:center">
      <div class="kicker" id="kick">Is AI replacing data engineering?</div>
      ${maskLine('ans', `<span class="headline" style="font-size:160px">Not yet<span style="color:${C.accent}">.</span></span>`,
        'margin-top:26px')}
    </div>`,
  js: [
    `tl.fromTo("#kick",{opacity:0,y:14},{opacity:1,y:0,duration:0.4,ease:"power3.out"},0);`,
    enterMask('#ans', 0.5, 0.5),
    `tl.fromTo("#verdict",{scale:1},{scale:0.98,duration:0.4,ease:"power2.in",transformOrigin:"center center"},${(d - 0.45).toFixed(3)});`,
    fadeOut('#verdict', d - 0.45, 0.4),
  ],
});

B.g018 = d => ({
  html: `
    <div id="end" class="panel" style="position:absolute;left:192px;top:672px;width:960px;padding:44px 48px 52px">
      <div class="headline" id="line" style="font-size:56px">${words("What's been your experience?")}</div>
      <div class="sub" id="cta" style="font-size:30px;margin-top:20px">Tell me in the comments</div>
      <div class="accentbar" id="rule" style="height:4px;width:200px;margin-top:20px"></div>
    </div>`,
  js: [
    wordsIn('#line', 0.1, 0.05),
    `tl.fromTo("#cta",{opacity:0},{opacity:1,duration:0.3,ease:"none"},0.9);`,
    drawX('#rule', 1.2, 0.4),
    // no exit: this card holds to the last frame, the video ends under it
  ],
});

/* ---------- emit ---------- */
const page = (id, dur, html, js) => `<!doctype html>
<html lang="en" data-resolution="landscape-4k">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=3840, height=2160" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>${CSS}</style>
</head>
<body>
<div id="root" data-composition-id="${id}" data-start="0" data-duration="${dur.toFixed(3)}"
     data-width="3840" data-height="2160" data-fps="60">
  <div id="stage" class="clip" data-start="0" data-duration="${dur.toFixed(3)}" data-track-index="1">
${html}
  </div>
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
${js.join('\n')}
window.__timelines["${id}"] = tl;
</script>
</body>
</html>
`;

let n = 0;
for (const p of plan.parts) {
  if (p.class !== 'overlay') continue;
  const dur = +(p.end - p.start + TAIL).toFixed(3);
  const build = B[p.id];
  if (!build) { console.error(`no builder for ${p.id}`); continue; }
  const { html, js } = build(dur);
  const dir = join(OUT, p.id);
  mkdirSync(join(dir, 'assets', 'fonts'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), page(p.id, dur, html, js));
  writeFileSync(join(dir, 'hyperframes.json'), HF_JSON);
  copyFileSync(FONT_SRC, join(dir, 'assets', 'fonts', 'Satoshi-Variable.ttf'));
  n++;
}
console.log(`emitted ${n} part projects to graphics-build/parts/`);
