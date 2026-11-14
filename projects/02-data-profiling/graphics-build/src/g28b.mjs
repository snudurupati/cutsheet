// g28b (ALTERNATE of g28, the human's direction 2026-10-28): festive instead of a ring on the pumpkin.
// Drawn pumpkins, ghosts and fall leaves rain across the frame, in brand tokens only (the accent is
// already pumpkin orange). A few leaves drift on "spiders and pumpkin things", the rain builds on
// "time of the year", and "Happy Halloween!" in Creepster (assets/fonts/creepster, OFL; the human
// asked for a scary font, a one-off outside brand.md's two fonts) drops in letter by letter from the first
// "Halloween" ("celebrate Halloween") so it is whole by "happy Halloween" in the left zone, clear of the face. Everything fades over the last 0.35s, so
// nothing is mid-air when g29 starts on the next frame.
// Seeded at build time: every position, size, period and start is a baked number (seek-safe).
import { C, emit, frames } from "../lib.mjs";
import { f3, prng, planPart } from "../common.mjs";
import { readFileSync } from "node:fs";

const ID = "g28b";
const r = prng(1031);
const rr = (a, b) => a + (b - a) * r();

const cueWord = (word, nth = 0) => {
  const p = planPart(ID);
  const ws = JSON.parse(readFileSync("../outputs/transcript-cut.json", "utf8")).words
    .filter(w => "start" in w && w.start >= p.start - 0.05 && w.start < p.end && w.word.toLowerCase().replace(/[^a-z]/g, "") === word);
  if (!ws[nth]) throw new Error(`${ID}: no "${word}" #${nth} inside the part`);
  return +(ws[nth].start - p.start).toFixed(3);
};

// ---------------------------------------------------------------- the drawn objects (centred on 0,0)
const pumpkin = s => {
  const rx = s / 2, ry = s * 0.4;
  return `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${C.accent}" stroke="${C.ink}" stroke-width="3"/>
  <path d="M0,${-ry} Q${-s * 0.22},0 0,${ry} M0,${-ry} Q${s * 0.22},0 0,${ry} M${-rx * 0.55},${-ry * 0.82} Q${-rx * 0.9},0 ${-rx * 0.55},${ry * 0.82} M${rx * 0.55},${-ry * 0.82} Q${rx * 0.9},0 ${rx * 0.55},${ry * 0.82}" fill="none" stroke="${C.ink}" stroke-width="2" opacity=".55"/>
  <path d="M-3,${-ry + 2} L-2,${-ry - s * 0.16} Q4,${-ry - s * 0.2} 6,${-ry - s * 0.12} L3,${-ry + 2} Z" fill="${C.ink}"/>
  <path d="M${-s * 0.22},${-s * 0.06} L${-s * 0.12},${-s * 0.18} L${-s * 0.04},${-s * 0.06} Z M${s * 0.04},${-s * 0.06} L${s * 0.12},${-s * 0.18} L${s * 0.22},${-s * 0.06} Z" fill="${C.ink}"/>
  <path d="M${-s * 0.24},${s * 0.06} L${-s * 0.14},${s * 0.16} L${-s * 0.06},${s * 0.08} L0,${s * 0.17} L${s * 0.06},${s * 0.08} L${s * 0.14},${s * 0.16} L${s * 0.24},${s * 0.06} L${s * 0.14},${s * 0.2} L0,${s * 0.24} L${-s * 0.14},${s * 0.2} Z" fill="${C.ink}"/>`;
};
const ghost = s => {
  const w = s * 0.42, h = s * 0.55, sc = (2 * w) / 3;
  let d = `M${-w},0 A${w},${w} 0 0 1 ${w},0 L${w},${h}`;
  for (let i = 0; i < 3; i++) { const x0 = w - i * sc; d += ` Q${f3(x0 - sc / 4)},${f3(h + 10)} ${f3(x0 - sc / 2)},${h} Q${f3(x0 - 3 * sc / 4)},${f3(h - 10)} ${f3(x0 - sc)},${h}`; }
  d += " Z";
  return `<path d="${d}" fill="${C.bg}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="${-w * 0.36}" cy="${-w * 0.1}" rx="${s * 0.06}" ry="${s * 0.09}" fill="${C.ink}"/>
  <ellipse cx="${w * 0.36}" cy="${-w * 0.1}" rx="${s * 0.06}" ry="${s * 0.09}" fill="${C.ink}"/>
  <ellipse cx="0" cy="${w * 0.4}" rx="${s * 0.05}" ry="${s * 0.07}" fill="${C.ink}"/>`;
};
const MAPLE = "M50,96 L50,76 L29,81 L34,66 L8,56 L19,48 L4,29 L27,33 L30,19 L42,31 L45,6 L50,14 L55,6 L58,31 L70,19 L73,33 L96,29 L81,48 L92,56 L66,66 L71,81 L50,76";
const leaf = (s, fill) => `<g transform="scale(${f3(s / 100)}) translate(-50,-52)">
  <path d="${MAPLE} Z" fill="${fill}" stroke="${C.ink}" stroke-width="${f3(250 / s)}" stroke-linejoin="round"/>
  <path d="M50,92 L50,24 M50,62 L24,42 M50,62 L76,42" fill="none" stroke="${C.ink}" stroke-width="${f3(180 / s)}" opacity=".5"/></g>`;

export default function build() {
  const D = frames(ID) / 30;
  const tThings = cueWord("pumpkin"), tYear = cueWord("time"), tHappy = cueWord("happy"), tHal0 = cueWord("halloween", 0);
  // review 2026-10-28: the fade ends on the last frame (no dead beat before g29)
  const tOut = +(D - 0.36).toFixed(3);
  // review 2026-10-28: the title was solid for only ~0.45s; it now drops from the FIRST "Halloween"
  // ("celebrate Halloween") and is whole before "happy Halloween", solid ~1.2s
  const tTtl = tHal0 - 0.05;

  // ------------------------------------------------------------ the rain: who falls, when, where
  const items = [];
  // Composition review 2026-10-28, each rule below is one of its findings:
  //  * never over the face: no face matte on this job, so nothing falls through the head and shoulder
  //    column (head x ~780-1300; a ghost landed on an eye at 1240);
  //  * the title box stays clean: a left-side item whose path crosses the title (y 36-400 with its
  //    sprite) while the title is up is dropped;
  //  * the real pumpkin, spider and candle (x ~1380-1700, y 600-900) he is pointing at stay mostly
  //    visible: the right third weights its spawns to x 1700-1890;
  //  * no stacked clusters: a spawn within 90px of one spawned in the previous 0.4s is re-drawn;
  //  * leaves are 70-110px in accent and accent-soft only (muted ones read as dirt and bugs).
  const size = kind => kind === "pumpkin" ? rr(66, 96) : kind === "ghost" ? rr(64, 90) : rr(70, 110);
  const fallOf = kind => kind === "pumpkin" ? rr(2.9, 3.8) : kind === "ghost" ? rr(4.2, 5.4) : rr(4.6, 6.4);
  const crossesTitle = (t, fall) => { const a = t + fall * (166 / 1340), b = t + fall * (530 / 1340); return b > tTtl - 0.3 && a < D; };
  const rightX = () => r() < 0.7 ? rr(1700, 1890) : rr(1520, 1700);   // QA + review: leaves sway up to 70px and he leans right; the head reaches x ~1400
  const add = (kind, t, s = null) => {
    s = s ?? size(kind); const fall = fallOf(kind);
    let x;
    for (let k = 0; k < 14; k++) {
      x = r() < 0.6 ? rr(30, 620) : rightX();   // final check: a left-lane leaf swaying from 690 touched his left ear
      if (!items.some(o => Math.abs(o.x - x) < 90 && Math.abs(o.t - t) < 0.4)) break;
    }
    // dropped, not moved: moving them right piled the late rain onto the real pumpkin (frame 10.2)
    if (x < 700 && crossesTitle(t, fall)) return;
    items.push({ kind, t, x, s, fall });
  };
  for (let i = 0; i < 5; i++) add("leaf", Math.max(0, tThings - 1.8) + i * 0.45, rr(95, 115));               // a first few leaves, the largest
  const kinds = ["leaf", "leaf", "leaf", "pumpkin", "ghost"];
  for (let i = 0; i < 44; i++) add(kinds[Math.floor(r() * kinds.length)], tYear - 0.6 + (i / 44) * (tOut - 2.4 - tYear) + rr(-0.15, 0.15));
  for (let i = 0; i < 4; i++) add(i % 2 ? "ghost" : "pumpkin", tHappy - 1.1 + i * 0.25);       // a little burst into "happy Halloween"

  let body = `<style>@font-face{font-family:"Creepster";src:url("assets/Creepster-Regular.ttf") format("truetype");font-display:block}
.hl{display:inline-block;color:${C.accent};-webkit-text-stroke:5px ${C.ink};paint-order:stroke fill;opacity:0}</style>
<div id="${ID}-all" style="position:absolute;left:0;top:0;width:1920px;height:1080px">`;
  let js = `tl.fromTo("#${ID}-all",{opacity:1},{opacity:1,duration:0.2,immediateRender:true},0);\n`;
  items.forEach((it, i) => {
    const { s, fall } = it;
    const fill = r() < 0.6 ? C.accent : C.accentSoft;
    const art = it.kind === "pumpkin" ? pumpkin(s) : it.kind === "ghost" ? ghost(s) : leaf(s, fill);
    const op = it.kind === "ghost" ? 0.92 : 1;
    body += `
  <div id="${ID}-f${i}" style="position:absolute;left:${f3(it.x)}px;top:-130px;width:0;height:0">
    <div id="${ID}-s${i}"><svg id="${ID}-r${i}" style="position:absolute;left:-60px;top:-60px;overflow:visible;opacity:${op}" width="120" height="120" viewBox="-60 -60 120 120">${art}</svg></div></div>`;
    const t0 = Math.max(0, it.t), dy = 1080 + 260;
    // the fall: linear at a constant speed, so a pumpkin reads heavy and a leaf floats
    js += `tl.fromTo("#${ID}-f${i}",{y:0},{y:${dy},duration:${f3(fall)},ease:"none",immediateRender:true},${f3(t0)});\n`;
    // sway and turn: one seeded yoyo each, a leaf flutters wide, a ghost bobs, a pumpkin tumbles
    const per = it.kind === "leaf" ? rr(0.7, 1.1) : it.kind === "ghost" ? rr(1.0, 1.5) : rr(1.4, 2.0);
    const amp = it.kind === "leaf" ? rr(36, 70) : it.kind === "ghost" ? rr(18, 34) : rr(6, 14);
    const n = Math.max(2, Math.ceil(fall / per));
    js += `tl.fromTo("#${ID}-s${i}",{x:${f3(-amp)}},{x:${f3(amp)},duration:${f3(per)},ease:"sine.inOut",yoyo:true,repeat:${n - 1},immediateRender:true},${f3(t0)});\n`;
    if (it.kind === "pumpkin") {
      const dir = r() < 0.5 ? -1 : 1;
      js += `tl.fromTo("#${ID}-r${i}",{rotation:${f3(rr(-30, 30))}},{rotation:"+=${f3(dir * rr(90, 200))}",duration:${f3(fall)},ease:"none",immediateRender:true},${f3(t0)});\n`;
    } else {
      const a = it.kind === "leaf" ? rr(28, 48) : rr(6, 12);
      js += `tl.fromTo("#${ID}-r${i}",{rotation:${f3(-a)}},{rotation:${f3(a)},duration:${f3(per)},ease:"sine.inOut",yoyo:true,repeat:${n - 1},immediateRender:true},${f3(t0)});\n`;
    }
  });

  // ------------------------------------------------------------ the title, Creepster, left zone
  const line = (txt, id) => [...txt].map((ch, k) => `<span class="hl" id="${ID}-${id}${k}">${ch === " " ? "&nbsp;" : ch}</span>`).join("");
  body += `
  <div id="${ID}-ttl" style="position:absolute;left:72px;top:96px;width:620px;font-family:Creepster,serif;font-size:118px;line-height:1.02;letter-spacing:0.02em;filter:drop-shadow(0 8px 16px rgba(20,17,14,.35))">
    <div>${line("Happy", "a")}</div><div>${line("Halloween!", "b")}</div>
  </div>
</div>`;
  const drop = (pre, n, t) => { for (let k = 0; k < n; k++) {
    js += `tl.fromTo("#${ID}-${pre}${k}",{opacity:0,y:-70,rotation:${f3(rr(-24, 24))}},{opacity:1,y:0,rotation:0,duration:0.42,ease:"back.out(2.2)",immediateRender:true},${f3(t + k * 0.04)});\n`; } };
  drop("a", 5, tTtl);
  drop("b", 10, tTtl + 0.3);
  // a slow shiver while it holds
  js += `tl.fromTo("#${ID}-ttl",{skewX:-2},{skewX:2,duration:0.45,ease:"sine.inOut",yoyo:true,repeat:${Math.max(1, Math.floor((tOut - tTtl - 1.1) / 0.45))},immediateRender:false},${f3(tTtl + 1.1)});\n`;
  js += `tl.fromTo("#${ID}-all",{opacity:1},{opacity:0,duration:0.33,ease:"power1.in",immediateRender:false},${f3(tOut)});\n`;
  emit(ID, D, body, js, ["Creepster-Regular.ttf"]);
}
