// g01b: HOOK candidate B, "the curve that hides two". No type. Same HERO card as g01a (an alternate).
// 206 ink dots (one per PushT episode) drop into a heap as the card lands on "you", then sort left to right
// into the sideways S of the real episode lengths (sorted: q1 99, q3 148, min 49, flat middle, steep ends;
// the two longest are the real ones from the notebook, 229 and 246). On "God" those two lift out of the
// curve and pulse accent, unlabelled: the question the demo answers (episodes 184 and 174). On "study" a
// dashed line draws at the upper fence (221.5, the notebook's 1.5 x IQR), so the two sit alone above it.
// Moving: fall 0-0.45, sort 0.36-0.97, lift on "God", then the two pulse with expanding halos to the end.
import { C, emit, frames, panelClass, fg, dim, wipeUp } from "../lib.mjs";
import { drawAll, cueRel, exitIfFree, HERO, prng, f3 } from "../common.mjs";

const ID = "g01b";
export default function build() {
  const D = frames(ID) / 30;
  const tGod = cueRel(ID, "god"), tStudy = cueRel(ID, "study");
  const F = fg(ID), M = dim(ID);
  const X = HERO.x, Y = HERO.y, W = HERO.w, H = HERO.h, IW = W - 12, IH = H - 12;
  const r = prng(206174184);

  // ---- the sorted episode lengths (rank 0..205)
  const KN = [[0, 49], [0.02, 58], [0.08, 75], [0.25, 99], [0.5, 121], [0.75, 148], [0.9, 172], [0.97, 198], [1, 212]];
  const qf = p => { for (let k = 1; k < KN.length; k++) if (p <= KN[k][0]) { const [p0, a] = KN[k - 1], [p1, b] = KN[k]; return a + (b - a) * (p - p0) / (p1 - p0); } return 212; };
  const N = 206, L = [...Array(N).keys()].map(i => i < 204 ? qf(i / 203) : (i === 204 ? 229 : 246));
  const X0 = 56, X1 = 524, YB = 410, YT = 110;
  const px = i => X0 + (X1 - X0) * i / (N - 1), py = v => YB - (v - 49) / (246 - 49) * (YB - YT);
  const BASE = 432, DR = 3.2;

  // ---- heap: a mound at the bottom centre; each heap dot takes a seeded rank
  const heap = [];
  while (heap.length < N) {
    const dx = (2 * r() - 1) * 125, h = 74 * Math.pow(Math.max(0, 1 - Math.abs(dx) / 125), 0.8);
    heap.push({ x: 290 + dx, y: BASE - 5 - r() * h, y0: -30 - r() * 140, t0: r() * 0.12 });
  }
  const rank = [...Array(N).keys()];
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rank[i], rank[j]] = [rank[j], rank[i]]; }
  const isTop = k => k >= 204;

  const dots = heap.map((h, i) => `<circle id="${ID}-d${i}" cx="${f3(h.x)}" cy="${f3(h.y0)}" r="${DR}" fill="${F}"/>`).join("");
  const tops = heap.map((h, i) => isTop(rank[i]) ? i : -1).filter(i => i >= 0);
  const lifted = { 204: [494, py(229) - 36], 205: [528, py(246) - 30] };
  const halos = tops.map(i => { const [x, y] = lifted[rank[i]];
    return `<circle id="${ID}-h${rank[i]}" cx="${f3(x)}" cy="${f3(y)}" r="6" fill="none" stroke="${C.accent}" stroke-width="2.5" opacity="0"/>`; }).join("");
  const yF = py(221.5);
  const body = `
<div id="${ID}-card" class="${panelClass(ID)}" style="position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px">
  <div style="position:absolute;left:0;top:0;width:${IW}px;height:${IH}px;overflow:hidden">
    <svg style="position:absolute;left:0;top:0" width="${IW}" height="${IH}">
      <line id="${ID}-base" class="dr" pathLength="1" x1="36" y1="${BASE}" x2="${IW - 36}" y2="${BASE}" stroke="${M}" stroke-width="2.5" stroke-linecap="round"/>
      <g id="${ID}-fw" opacity="0"><line x1="36" y1="${f3(yF)}" x2="${IW - 36}" y2="${f3(yF)}" stroke="${M}" stroke-width="2.5" stroke-dasharray="8 9"/></g>
      ${halos}${dots}
    </svg>
  </div>
</div>`;

  let js = "";
  js += wipeUp(`#${ID}-card`, 0, 0.35);
  js += drawAll(`#${ID}-base`, 0.1, 0.5);
  heap.forEach((h, i) => {
    const k = rank[i];
    // fall into the heap
    js += `tl.fromTo("#${ID}-d${i}",{attr:{cy:${f3(h.y0)}}},{attr:{cy:${f3(h.y)}},duration:0.32,ease:"power2.in"},${f3(isTop(k) ? 0 : h.t0)});\n`;
    // sort into the curve, left to right (the two longest go first so they are in place for "God")
    const ts = isTop(k) ? 0.33 : 0.44 + (k / (N - 1)) * 0.1;
    js += `tl.fromTo("#${ID}-d${i}",{attr:{cx:${f3(h.x)},cy:${f3(h.y)}}},{attr:{cx:${f3(px(k))},cy:${f3(py(L[k]))}},duration:0.45,ease:"power3.inOut",immediateRender:false},${f3(ts)});\n`;
    if (isTop(k)) {
      const [lx, ly] = lifted[k];
      js += `tl.fromTo("#${ID}-d${i}",{attr:{cx:${f3(px(k))},cy:${f3(py(L[k]))},r:${DR}},fill:"${F}"},{attr:{cx:${f3(lx)},cy:${f3(ly)},r:6},fill:"${C.accent}",duration:0.45,ease:"back.out(1.6)",immediateRender:false},${f3(Math.max(0.79, tGod - 0.05) + (k - 204) * 0.08)});\n`;
      // pulse and halo, to the end
      const t0 = tGod + 0.6 + (k - 204) * 0.35, per = 0.7, n = Math.max(1, Math.floor((D - t0) / per));
      js += `tl.fromTo("#${ID}-d${i}",{attr:{r:6}},{attr:{r:7.5},duration:${per},ease:"sine.inOut",yoyo:true,repeat:${n - 1},immediateRender:false},${f3(t0)});\n`;
      const hp = 1.4, hn = Math.max(1, Math.floor((D - t0) / hp));
      js += `tl.fromTo("#${ID}-h${k}",{attr:{r:6},opacity:0.85},{attr:{r:26},opacity:0,duration:${hp},ease:"power1.out",repeat:${hn - 1},immediateRender:false},${f3(t0)});\n`;
    }
  });
  // "study": the upper fence draws across, the two alone above it
  js += `tl.fromTo("#${ID}-fw",{opacity:0,clipPath:"inset(0 100% 0 0)"},{opacity:1,clipPath:"inset(0 0% 0 0)",duration:0.6,ease:"power2.out"},${f3(tStudy)});\n`;
  // an alternate is not in the parts list; its exit follows g01a's slot
  js += exitIfFree("g01a", D, [`#${ID}-card`]);
  emit(ID, D, body, js);
}
