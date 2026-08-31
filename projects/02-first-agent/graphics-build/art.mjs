// High-fidelity line art, drawn as SVG with stroke-dashoffset draw-on.
// pathLength="1" everywhere, so a draw is always a 1 -> 0 offset regardless of real length.
const p = (d, cls="o", w=3) => `<path class="dr ${cls}" d="${d}" pathLength="1" fill="none"
  stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---- BRAIN: lobed cerebrum, 14 sulci, cerebellum, stem. 260x210 -------------
const SULCI = [
 "M66,34 C70,56 58,66 62,86 C66,104 56,116 58,142",
 "M96,26 C92,50 104,60 98,82 C92,102 104,116 96,150",
 "M130,26 C126,52 140,62 134,84 C128,104 140,120 130,164",
 "M164,30 C160,54 172,66 166,86 C160,106 172,122 162,164",
 "M198,42 C190,64 202,78 194,96 C188,112 198,132 190,150",
 "M24,78 C42,84 46,100 38,116",
 "M220,98 C204,104 200,120 208,134",
 "M40,100 C70,94 100,98 128,92",
 "M44,126 C76,120 106,126 136,118",
 "M150,50 C170,46 186,52 196,62",
 "M78,52 C96,46 112,50 122,60",
 "M60,150 C86,144 110,150 128,144"
];
export const BRAIN = (id) => `
<svg id="${id}" viewBox="0 0 260 210" width="260" height="210" style="overflow:visible">
  ${p("M30,138 C12,126 8,98 24,78 C14,54 38,30 66,34 C76,14 112,8 130,26 C150,10 188,16 198,42 \
C224,48 236,76 220,98 C232,116 224,142 202,150 C196,166 172,174 152,166 C146,180 120,184 106,172 \
C84,182 52,176 44,158 C34,158 30,148 30,138 Z","o",3.5)}
  ${SULCI.map(d=>p(d,"s",2.4)).join("")}
  ${p("M152,166 C168,156 188,160 194,174 C188,188 166,192 152,182","o",2.8)}
  ${p("M160,170 C170,168 180,170 186,176","s",2)}
  ${p("M158,178 C168,178 178,180 184,184","s",2)}
  ${p("M128,170 C130,186 128,196 124,206","o",3)}
  <!-- pulse overlay: a short dash that travels the folds once they are drawn -->
  ${SULCI.slice(0,5).map((d,i)=>`<path id="${id}-pl${i}" class="pl" d="${d}" pathLength="1" fill="none"
    stroke="currentColor" stroke-width="3.2" stroke-linecap="round"
    style="stroke-dasharray:0.07 0.93;stroke-dashoffset:1;opacity:0"/>`).join("")}
</svg>`;

// ---- JAR: bolted lid, neck, shouldered glass body, liquid, bubbles ---------
export const JAR = (id) => `
<svg id="${id}" viewBox="0 0 320 400" width="320" height="400" style="overflow:visible">
  <defs><clipPath id="${id}-clip"><path d="M90,72 C50,88 34,122 34,172 L34,318 C34,354 60,376 98,376
    L222,376 C260,376 286,354 286,318 L286,172 C286,122 270,88 230,72 Z"/></clipPath></defs>
  ${p("M66,6 L254,6 C262,6 268,12 268,20 L268,34 C268,42 262,48 254,48 L66,48 \
C58,48 52,42 52,34 L52,20 C52,12 58,6 66,6 Z","o",3.2)}
  ${[86,124,162,200,238].map(x=>`<circle class="dr o" cx="${x}" cy="27" r="4.5" fill="none"
     stroke="currentColor" stroke-width="2.2" pathLength="1"/>`).join("")}
  ${p("M90,48 L90,72","o",3)} ${p("M230,48 L230,72","o",3)}
  ${p("M90,72 C50,88 34,122 34,172 L34,318 C34,354 60,376 98,376 L222,376 \
C260,376 286,354 286,318 L286,172 C286,122 270,88 230,72","o",3.5)}
  <g clip-path="url(#${id}-clip)">
    <g id="${id}-bubbles" style="opacity:0">
      ${[[70,7],[112,5],[152,8],[196,6],[236,7],[92,4],[176,5],[254,6]].map((b,i)=>
        `<circle id="${id}-b${i}" cx="${b[0]}" cy="360" r="${b[1]}" fill="none"
         stroke="currentColor" stroke-width="2" opacity="0.55"/>`).join("")}
    </g>
    <path id="${id}-liq" d="M20,148 C90,138 230,138 300,148 L300,390 L20,390 Z"
      fill="currentColor" opacity="0" style="opacity:0"/>
  </g>
  ${p("M34,148 C90,138 230,138 286,148","m",2.6)}
  ${p("M62,186 C56,226 56,296 64,340","h",2.4)}
  ${p("M254,196 C260,226 260,266 254,296","h",2)}
</svg>`;

// ---- TERMINAL: bezel, screen, stand, prompt -------------------------------
export const TERMINAL = (id) => `
<svg id="${id}" viewBox="0 0 280 210" width="280" height="210" style="overflow:visible">
  ${p("M18,10 L262,10 C270,10 276,16 276,24 L276,140 C276,148 270,154 262,154 \
L18,154 C10,154 4,148 4,140 L4,24 C4,16 10,10 18,10 Z","o",3.2)}
  ${p("M16,32 L264,32","s",2)}
  ${p("M126,154 L126,182","o",3)} ${p("M80,188 L200,188","o",3)}
  ${p("M32,66 L52,80 L32,94","s",2.6)}
  ${p("M66,96 L150,96","s",2.4)}
  <rect id="${id}-caret" x="160" y="84" width="14" height="18" fill="currentColor" opacity="0"/>
</svg>`;

// ---- DOC: AGENTS.md, folded corner, lines that write themselves -----------
export const DOC = (id) => `
<svg id="${id}" viewBox="0 0 160 200" width="160" height="200" style="overflow:visible">
  ${p("M16,8 L106,8 L146,48 L146,184 C146,190 142,194 136,194 L26,194 \
C20,194 16,190 16,184 L16,18 C16,12 20,8 26,8 Z","o",3.2)}
  ${p("M106,8 L106,44 C106,46 108,48 110,48 L146,48","o",2.6)}
  ${[76,100,124,148].map((y,i)=>`<path id="${id}-ln${i}" class="ln" d="M34,${y} L${i===3?104:124},${y}"
    pathLength="1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
    style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
</svg>`;

// ---- LIMB: shoulder, upper arm, elbow, forearm, hand ----------------------
export const LIMB = (id, flip=false) => `
<svg id="${id}" viewBox="0 0 170 90" width="170" height="90"
     style="overflow:visible${flip?";transform:scaleX(-1)":""}">
  ${p("M6,44 L56,44","o",3.2)}
  <circle class="dr o" cx="56" cy="44" r="8" fill="none" stroke="currentColor" stroke-width="2.6" pathLength="1"/>
  <g id="${id}-fore" style="transform-origin:56px 44px">
    ${p("M56,44 L116,26","o",3.2)}
    <circle class="dr o" cx="116" cy="26" r="7" fill="none" stroke="currentColor" stroke-width="2.4" pathLength="1"/>
    ${p("M116,26 L146,18","o",2.8)} ${p("M146,18 L162,10","o",2.4)}
    ${p("M146,18 L162,22","o",2.4)} ${p("M146,18 L158,30","o",2.4)}
  </g>
</svg>`;

// ---- SPINE: chassis rails, segments, a signal that runs down --------------
export const SPINE = (id) => `
<svg id="${id}" viewBox="0 0 100 230" width="100" height="230" style="overflow:visible">
  ${p("M32,6 L32,224","o",3)} ${p("M68,6 L68,224","o",3)}
  ${[30,64,98,132,166,200].map(y=>p(`M32,${y} L68,${y}`,"s",2.4)).join("")}
  <rect id="${id}-sig" x="30" y="22" width="40" height="14" rx="3" fill="currentColor" opacity="0"/>
</svg>`;

// ---- Tool icons the limbs reach for -------------------------------------
export const FOLDER = (id) => `
<svg id="${id}" viewBox="0 0 150 120" style="overflow:visible">
  ${p("M8,26 C8,20 12,16 18,16 L58,16 L72,32 L132,32 C138,32 142,36 142,42 L142,102 \
C142,108 138,112 132,112 L18,112 C12,112 8,108 8,102 Z","o",3)}
  ${p("M8,50 L142,50","s",2.2)}
  ${p("M28,72 L74,72","s",2.2)} ${p("M28,90 L100,90","s",2.2)}
</svg>`;

export const TERMWIN = (id) => `
<svg id="${id}" viewBox="0 0 150 120" style="overflow:visible">
  ${p("M8,10 L142,10 C146,10 150,14 150,18 L150,102 C150,106 146,110 142,110 \
L8,110 C4,110 0,106 0,102 L0,18 C0,14 4,10 8,10 Z","o",3)}
  ${p("M0,32 L150,32","s",2.2)}
  ${p("M22,56 L38,68 L22,80","s",2.8)} ${p("M50,82 L104,82","s",2.6)}
</svg>`;

export const GLOBE = (id) => `
<svg id="${id}" viewBox="0 0 130 130" style="overflow:visible">
  <circle class="dr o" cx="65" cy="65" r="56" fill="none" stroke="currentColor" stroke-width="3" pathLength="1"/>
  ${p("M9,65 L121,65","s",2.2)}
  ${p("M65,9 C40,34 40,96 65,121","s",2.2)}
  ${p("M65,9 C90,34 90,96 65,121","s",2.2)}
  ${p("M22,34 C48,48 82,48 108,34","s",2)}
  ${p("M22,96 C48,82 82,82 108,96","s",2)}
</svg>`;

export const DATABASE = (id) => `
<svg id="${id}" viewBox="0 0 130 140" style="overflow:visible">
  ${p("M10,28 C10,16 34,8 65,8 C96,8 120,16 120,28 C120,40 96,48 65,48 C34,48 10,40 10,28 Z","o",3)}
  ${p("M10,28 L10,112 C10,124 34,132 65,132 C96,132 120,124 120,112 L120,28","o",3)}
  ${p("M10,70 C10,82 34,90 65,90 C96,90 120,82 120,70","s",2.2)}
</svg>`;

export const SCROLL = (id) => `
<svg id="${id}" viewBox="0 0 170 200" style="overflow:visible">
  ${p("M18,14 L134,14 L152,32 L152,178 C152,186 146,192 138,192 L32,192 \
C24,192 18,186 18,178 Z","o",3)}
  ${p("M134,14 L134,28 C134,32 138,36 142,36 L152,36","o",2.4)}
  ${[62,90,118,146].map((y,i)=>`<path id="${id}-r${i}" d="M38,${y} L${i===3?102:130},${y}"
    pathLength="1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
    style="stroke-dasharray:1;stroke-dashoffset:1"/>`).join("")}
</svg>`;

// A limb: a curved cord ending in a connector node ON the tool it reaches.
// Hands were tried first and read as stray arrowheads at this scale.
export const CORD = (id, d, hx, hy) => `
<g id="${id}">
  <path class="dr o" d="${d}" pathLength="1" fill="none" stroke="currentColor"
        stroke-width="3.4" stroke-linecap="round"/>
  <circle id="${id}-node" cx="${hx}" cy="${hy}" r="9" fill="none"
          stroke="currentColor" stroke-width="3" opacity="0"/>
  <circle id="${id}-dot" cx="${hx}" cy="${hy}" r="3.5" fill="currentColor" opacity="0"/>
</g>`;
