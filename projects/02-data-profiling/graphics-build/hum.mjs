// The series ROBOT (style.json recurringObjects.robot, settled 2026-10-16): a line-art humanoid.
// Faceless rounded visor head, neck, segmented torso, arms that bend at shoulder and elbow with
// two-finger grippers, hips and knees, two feet. Hardware, so it never shares a head or a base
// with the AGENT (jar head, wheels; lib.mjs robot()).
//
// Rigged like the agent: every moving part is its own group, pivots in the SVG's own 240x520 user
// space, rotated with svgOrigin (never transformOrigin, graphics skill).
//   #{id}-armL/R   upper arm, pivot at the shoulder
//   #{id}-foreL/R  forearm,   pivot at the elbow
//   #{id}-gripL/R  fingers,   pivot at the wrist
//   #{id}-legL/R   thigh,     pivot at the hip
//   #{id}-shinL/R  shin+foot, pivot at the knee
//   #{id}-head     visor head (small tilt), pivot at the neck
// Honest motion (style.md 2026-10-16): feet stay planted unless it steps; what it moves, it holds.
import { C } from "./lib.mjs";

export const HUM = {
  box: [240, 520],
  shoulder: { L: [72, 134], R: [168, 134] }, elbow: { L: [60, 214], R: [180, 214] },
  wrist: { L: [56, 288], R: [184, 288] },
  hip: { L: [102, 286], R: [138, 286] }, knee: { L: [100, 390], R: [140, 390] },
  ankle: { L: [100, 488], R: [140, 488] },
};
const _f = v => (+v).toFixed(3);

export const humanoid = (id, left, top, scale = 1, { fill = C.bg, stroke = "currentColor", visor = C.ink, sw = 3.5, accentPart = null } = {}) => {
  const s = (w = sw) => `fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const H = HUM;
  const arm = k => {
    const [S, E, W] = [H.shoulder[k], H.elbow[k], H.wrist[k]];
    const d = k === "L" ? -1 : 1;
    return `<g id="${id}-arm${k}">
      <path d="M${S[0]},${S[1]} L${E[0]},${E[1]}" ${s(sw * 3.2)} stroke="${stroke}"/>
      <path d="M${S[0]},${S[1]} L${E[0]},${E[1]}" fill="none" stroke="${fill}" stroke-width="${sw * 1.6}" stroke-linecap="round"/>
      <circle cx="${S[0]}" cy="${S[1]}" r="${sw * 2.4}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <g id="${id}-fore${k}">
        <path d="M${E[0]},${E[1]} L${W[0]},${W[1]}" ${s(sw * 2.8)}/>
        <path d="M${E[0]},${E[1]} L${W[0]},${W[1]}" fill="none" stroke="${fill}" stroke-width="${sw * 1.2}" stroke-linecap="round"/>
        <circle cx="${E[0]}" cy="${E[1]}" r="${sw * 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
        <g id="${id}-grip${k}">
          <path d="M${W[0]},${W[1]} C${W[0] - 9},${W[1] + 6} ${W[0] - 10},${W[1] + 16} ${W[0] - 5},${W[1] + 22}" ${s()}/>
          <path d="M${W[0]},${W[1]} C${W[0] + 9},${W[1] + 6} ${W[0] + 10},${W[1] + 16} ${W[0] + 5},${W[1] + 22}" ${s()}/>
        </g>
      </g></g>`;
  };
  const leg = k => {
    const [Hp, K, A] = [H.hip[k], H.knee[k], H.ankle[k]];
    const toe = k === "L" ? -1 : 1;
    return `<g id="${id}-leg${k}">
      <path d="M${Hp[0]},${Hp[1]} L${K[0]},${K[1]}" ${s(sw * 3.6)}/>
      <path d="M${Hp[0]},${Hp[1]} L${K[0]},${K[1]}" fill="none" stroke="${fill}" stroke-width="${sw * 2}" stroke-linecap="round"/>
      <g id="${id}-shin${k}">
        <path d="M${K[0]},${K[1]} L${A[0]},${A[1]}" ${s(sw * 3.2)}/>
        <path d="M${K[0]},${K[1]} L${A[0]},${A[1]}" fill="none" stroke="${fill}" stroke-width="${sw * 1.6}" stroke-linecap="round"/>
        <circle cx="${K[0]}" cy="${K[1]}" r="${sw * 2.2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
        <path d="M${A[0] - 12 + toe * 4},${A[1] + 4} L${A[0] + 12 + toe * 10},${A[1] + 4} C${A[0] + 16 + toe * 10},${A[1] + 4} ${A[0] + 16 + toe * 10},${A[1] + 16} ${A[0] + 10 + toe * 10},${A[1] + 16} L${A[0] - 12 + toe * 4},${A[1] + 16} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      </g></g>`;
  };
  const head = `<g id="${id}-head">
      <path d="M120,6 C146,6 160,24 160,50 L160,74 C160,94 146,104 120,104 C94,104 80,94 80,74 L80,50 C80,24 94,6 120,6 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <path d="M90,40 C90,30 102,26 120,26 C138,26 150,30 150,40 L150,62 C150,74 138,80 120,80 C102,80 90,74 90,62 Z" fill="${visor}" stroke="${stroke}" stroke-width="${sw * 0.8}"/>
      <path d="M100,38 C108,33 122,32 132,34" fill="none" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round" opacity="0.8"/>
    </g>`;
  const torso = `
    <path d="M110,104 L110,118 M130,104 L130,118" ${s()}/>
    <path d="M70,124 C70,118 76,116 84,116 L156,116 C164,116 170,118 170,124 L162,200 C160,214 152,222 140,226 L100,226 C88,222 80,214 78,200 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
    <path d="M92,158 C108,164 132,164 148,158 M96,186 C110,191 130,191 144,186" ${s(sw * 0.8)}/>
    <path d="M100,226 L98,250 M140,226 L142,250" ${s()}/>
    <path d="M94,250 L146,250 C152,250 154,254 152,262 L146,286 L94,286 L88,262 C86,254 88,250 94,250 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  return `<div id="${id}" style="position:absolute;left:${left}px;top:${top}px;width:${Math.round(240 * scale)}px;height:${Math.round(520 * scale)}px">
  <svg viewBox="0 0 240 520" width="${Math.round(240 * scale)}" height="${Math.round(520 * scale)}" style="overflow:visible;color:${stroke}">
    ${leg("L")}${leg("R")}${torso}${head}${arm("L")}${arm("R")}
  </svg></div>`;
};

// pose an arm: shoulder a, elbow b (degrees), grip g 0 open .. 1 closed
export const humArm = (id, k, from, to, t, d, ease = "power2.inOut") => {
  const [S, E, W] = [HUM.shoulder[k], HUM.elbow[k], HUM.wrist[k]];
  return `tl.fromTo("#${id}-arm${k}",{rotation:${from.a},svgOrigin:"${S.join(" ")}"},{rotation:${to.a},svgOrigin:"${S.join(" ")}",duration:${d},ease:"${ease}",immediateRender:false},${_f(t)});\n`
    + `tl.fromTo("#${id}-fore${k}",{rotation:${from.b},svgOrigin:"${E.join(" ")}"},{rotation:${to.b},svgOrigin:"${E.join(" ")}",duration:${d},ease:"${ease}",immediateRender:false},${_f(t)});\n`
    + `tl.fromTo("#${id}-grip${k}",{scaleX:${1 - 0.5 * (from.g || 0)},svgOrigin:"${W.join(" ")}"},{scaleX:${1 - 0.5 * (to.g || 0)},svgOrigin:"${W.join(" ")}",duration:${Math.min(d, 0.3)},ease:"power2.out",immediateRender:false},${_f(t + Math.max(0, d - 0.3))});\n`;
};
// forward kinematics: where the fingertips are for a pose, in user space
export const humHand = (k, { a, b }) => {
  const rot = (p, o, deg) => { const r = deg * Math.PI / 180, x = p[0] - o[0], y = p[1] - o[1];
    return [o[0] + x * Math.cos(r) - y * Math.sin(r), o[1] + x * Math.sin(r) + y * Math.cos(r)]; };
  const [S, E, W] = [HUM.shoulder[k], HUM.elbow[k], HUM.wrist[k]];
  const tip = [W[0], W[1] + 22];
  const E2 = rot(E, S, a), T1 = rot(tip, S, a);
  return rot(T1, E2, b);
};
// inverse kinematics by search, for reaching a target point with the fingertips
export const humReach = (k, target, prefer = { a: 0, b: 0 }, tol = 3) => {
  let best = null;
  for (let a = -170; a <= 170; a++) for (let b = -150; b <= 150; b++) {
    const [x, y] = humHand(k, { a, b }), e = Math.hypot(x - target[0], y - target[1]);
    const cost = (e > tol ? 1000 + e : e) + 0.01 * (Math.abs(a - prefer.a) + Math.abs(b - prefer.b));
    if (!best || cost < best.cost) best = { a, b, e, cost };
  }
  if (best.e > tol) throw new Error(`humReach ${k}: [${target}] out of reach (miss ${best.e.toFixed(1)})`);
  return { a: best.a, b: best.b };
};
// WALK by dx canvas px over d seconds. Honest steps: the stride length is fixed in user space
// (STRIDE * scale canvas px per step), the body moves a stride per step, and on each step the
// swing leg rotates forward while the stance leg rotates back by the same angle, so the planted
// foot travels backward relative to the body exactly as far as the body travels forward.
const STRIDE = 70, LEGLEN = 202;                           // hip to ankle, user px
export const humWalk = (id, x0, x1, t, d, scale = 1, y = 0) => {
  // A front-facing SIDE-STEP with planted feet (spot review 2026-10-17: the eased legs against a
  // linear body made both feet skate). Each step moves the body one stride at constant speed while
  // the stance leg rotates LINEARLY from ahead to behind, so the stance foot's world x holds within
  // a pixel or two (sin is near-linear at these angles). The settle is a half step: the lead foot
  // stays planted, the body moves half a stride, the trailing foot lifts and closes in.
  const dist = Math.abs(x1 - x0), dir = Math.sign(x1 - x0) || 1, S = STRIDE * scale;
  const steps = Math.max(1, Math.round((dist - S / 2) / S));
  const ang = Math.asin(Math.min(0.9, (STRIDE / 2) / LEGLEN)) * 180 / Math.PI;
  const tSettle = 0.32, dt = (d - tSettle) / steps;
  const xEnd = x0 + dir * (steps * S + S / 2);
  const AHEAD = -dir * ang, BEHIND = dir * ang;
  let js = `tl.fromTo("#${id}",{x:${x0.toFixed(1)},y:${y}},{x:${(x0 + dir * steps * S).toFixed(1)},y:${y},duration:${_f(steps * dt)},ease:"none",immediateRender:false},${_f(t)});\n`;
  for (let i = 0; i < steps; i++) {
    const swing = i % 2 ? "L" : "R", stance = i % 2 ? "R" : "L";
    const sw0 = i === 0 ? 0 : BEHIND, st0 = i === 0 ? 0 : AHEAD;
    js += `tl.fromTo("#${id}-leg${swing}",{rotation:${sw0},svgOrigin:"${HUM.hip[swing].join(" ")}"},{rotation:${AHEAD},svgOrigin:"${HUM.hip[swing].join(" ")}",duration:${_f(dt)},ease:"none",immediateRender:false},${_f(t + i * dt)});\n`;
    js += `tl.fromTo("#${id}-leg${stance}",{rotation:${st0},svgOrigin:"${HUM.hip[stance].join(" ")}"},{rotation:${BEHIND},svgOrigin:"${HUM.hip[stance].join(" ")}",duration:${_f(dt)},ease:"none",immediateRender:false},${_f(t + i * dt)});\n`;
    js += `tl.fromTo("#${id}-shin${swing}",{rotation:0,svgOrigin:"${HUM.knee[swing].join(" ")}"},{rotation:${-16 * dir},svgOrigin:"${HUM.knee[swing].join(" ")}",duration:${_f(dt / 2)},ease:"sine.out",yoyo:true,repeat:1,immediateRender:false},${_f(t + i * dt)});\n`;
    // the arms counter-swing a little with each step
    js += `tl.fromTo("#${id}-arm${stance}",{rotation:0,svgOrigin:"${HUM.shoulder[stance].join(" ")}"},{rotation:${8 * dir},svgOrigin:"${HUM.shoulder[stance].join(" ")}",duration:${_f(dt / 2)},ease:"sine.inOut",yoyo:true,repeat:1,immediateRender:false},${_f(t + i * dt)});\n`;
  }
  const lead = (steps - 1) % 2 ? "L" : "R", trail = lead === "L" ? "R" : "L", ts = t + steps * dt;
  js += `tl.fromTo("#${id}",{x:${(x0 + dir * steps * S).toFixed(1)}},{x:${xEnd.toFixed(1)},duration:${_f(tSettle)},ease:"none",immediateRender:false},${_f(ts)});\n`;
  js += `tl.fromTo("#${id}-leg${lead}",{rotation:${AHEAD},svgOrigin:"${HUM.hip[lead].join(" ")}"},{rotation:0,svgOrigin:"${HUM.hip[lead].join(" ")}",duration:${_f(tSettle)},ease:"none",immediateRender:false},${_f(ts)});\n`;
  js += `tl.fromTo("#${id}-leg${trail}",{rotation:${BEHIND},svgOrigin:"${HUM.hip[trail].join(" ")}"},{rotation:0,svgOrigin:"${HUM.hip[trail].join(" ")}",duration:${_f(tSettle)},ease:"none",immediateRender:false},${_f(ts)});\n`;
  js += `tl.fromTo("#${id}-shin${trail}",{rotation:0,svgOrigin:"${HUM.knee[trail].join(" ")}"},{rotation:${-16 * dir},svgOrigin:"${HUM.knee[trail].join(" ")}",duration:${_f(tSettle / 2)},ease:"sine.out",yoyo:true,repeat:1,immediateRender:false},${_f(ts)});\n`;
  return js;
};
export const humWalkEnd = (x0, x1, scale = 1) => {
  const dist = Math.abs(x1 - x0), dir = Math.sign(x1 - x0) || 1, S = STRIDE * scale;
  const steps = Math.max(1, Math.round((dist - S / 2) / S));
  return x0 + dir * (steps * S + S / 2);
};
// idle: arms sway a little, head tilts, seek-safe (one tween each)
export const humIdle = (id, t0, t1, amp = 3) => {
  const n = Math.max(1, Math.floor((t1 - t0) / 1.6));
  return ["L", "R"].map((k, i) => `tl.fromTo("#${id}-arm${k}",{rotation:0,svgOrigin:"${HUM.shoulder[k].join(" ")}"},{rotation:${i ? -amp : amp},svgOrigin:"${HUM.shoulder[k].join(" ")}",duration:0.8,yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${_f(t0 + i * 0.4)});\n`).join("")
    + `tl.fromTo("#${id}-head",{rotation:0,svgOrigin:"120 104"},{rotation:3,svgOrigin:"120 104",duration:0.8,yoyo:true,repeat:${2 * n - 1},ease:"sine.inOut",immediateRender:false},${_f(t0)});\n`;
};
