// 7s motion preview of the robot agent for the human's approval (2026-09-29): rolls in (wheels
// turn by distance), reaches down, grabs a token, lifts it (it lights $accent), waves, idles.
import { emit, C, robot, robotRoll, robotArm, robotHand, robotIdle } from "./lib.mjs";
const SC = 0.9, X = 700, Y = 300;
const reach = { a: 0, b: -60, g: 0 }, grab = { ...reach, g: 1 }, lift = { a: -110, b: -50, g: 1 }, rest = { a: 0, b: 0, g: 0 };
const toCanvas = ([x, y]) => [X + x * SC, Y + y * SC];
const [hx0, hy0] = toCanvas(robotHand("R", reach)), [hx1, hy1] = toCanvas(robotHand("R", lift));
const body = `
<div style="position:absolute;inset:0;background:${C.bg}"></div>
<svg style="position:absolute;left:0;top:0" width="1920" height="1080"><line x1="120" y1="${Y + 540 * SC}" x2="1800" y2="${Y + 540 * SC}" stroke="${C.ink}" stroke-width="3"/></svg>
<div class="disp" style="position:absolute;left:120px;top:90px;font-size:44px;font-variation-settings:'wght' 800">Robot agent: motion preview</div>
<div class="capt" style="position:absolute;left:120px;top:150px;font-size:24px;color:${C.muted}">rolls in, reaches, grabs, lifts, waves, idles</div>
<div id="tokw" style="position:absolute;left:${hx0 - 26}px;top:${hy0 - 10}px;width:52px;height:52px">
  <svg viewBox="-30 -30 60 60" width="52" height="52" style="overflow:visible"><path id="tok" d="M0,-24 L22,18 L-22,18 Z" fill="${C.bg}" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/></svg></div>
${robot("rb", 0, Y, SC)}
<div style="position:absolute;left:1260px;top:${Y + 150}px">${robot("rs", 0, 0, 0.3, { icon: true, name: "ERP" })}</div>
<div class="capt" style="position:absolute;left:1260px;top:${Y + 330}px;font-size:22px;color:${C.muted}">swarm size, with a name band</div>`;
let js = "";
js += robotRoll("rb", -420, X, 0, 1.8, SC);
js += robotRoll("rs", -60, 0, 0.2, 1.2, 0.3);   // the small one rolls a little too
js += robotArm("rb", "R", rest, reach, 2.0, 0.5);
js += robotArm("rb", "R", reach, grab, 2.5, 0.3);
js += robotArm("rb", "R", grab, lift, 2.9, 0.7);
js += `tl.fromTo("#tokw",{x:0,y:0},{x:${(hx1 - hx0).toFixed(1)},y:${(hy1 - hy0).toFixed(1)},duration:0.7,ease:"power2.inOut",immediateRender:false},2.9);\n`;
js += `tl.fromTo("#tok",{fill:"${C.bg}",stroke:"${C.ink}"},{fill:"${C.accent}",stroke:"${C.accent}",duration:0.3,immediateRender:false},3.6);\n`;
js += robotArm("rb", "L", rest, { a: 110, b: 50, g: 0 }, 3.8, 0.5);
js += `tl.fromTo("#rb-foreL",{rotation:50,svgOrigin:"2 477"},{rotation:15,svgOrigin:"2 477",duration:0.3,yoyo:true,repeat:3,ease:"sine.inOut",immediateRender:false},4.3);\n`;
js += robotArm("rb", "L", { a: 110, b: 50, g: 0 }, rest, 5.6, 0.5);
js += robotIdle("rs", 1.6, 6.8, 6);
js += `tl.fromTo("#rb-head",{y:0},{y:-5,duration:0.5,yoyo:true,repeat:1,ease:"sine.inOut",immediateRender:false},6.1);\n`;
emit("mockrobot", 7, body, js);
