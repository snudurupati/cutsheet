// Shared mark helpers for the punch-ins gZ0-gZ7 (02-data-profiling). Marks are PAPER ($bg) on the
// dark VS Code screen (style.md 2026-09-29), one accent at a time, each in its own small SVG (markSVG),
// mapped through its stop's measured zoom (demo-spec.json).
//
// Composition review 2026-10-28 (fixed here, hard rule 10):
//   * a mark belongs to ONE stop and lives inside that stop's plateau. Stops end on the speaker's
//     scrolls (make_demo_spec.py), so a mark can no longer outlive the text under it. The gate below
//     fails the build if a mark is on outside its plateau, or if its target moves while it is on
//     (OCR run > 5px, or the measured glyph ink > 3px).
//   * a mark's edges come from the GLYPH INK of the real frame at its landing time (_ink.mjs), with
//     table pipes and trailing punctuation excluded, never from an OCR character-count estimate.
import { readFileSync } from "node:fs";
import { C, zoomItem, markSVG, span } from "../lib.mjs";

// source box (3840x2160 px) -> canvas box (1920x1080) at a stop's full zoom, as FFmpeg's zoompan
// actually crops: it truncates the window's width and height to whole pixels (w = int(iw / zoom)) and
// its origin to whole pixels (the crop starts at int(x), int(y)), then scales that window to 3840x2160.
// lib.mapZoom keeps them fractional, which put marks up to Z/2 px left of their text (measured on the
// preview clips 2026-10-28: underlines 2-3px left of their digits).
export const mapZoom = (zid, [x0, y0, x1, y1]) => {
  const z = zoomItem(zid), W = 3840, H = 2160, Z = z.zoom;
  const w = Math.trunc(W / Z), h = Math.trunc(H / Z);
  const sx = Math.trunc(Math.min(Math.max(z.cx - W / Z / 2, 0), W - W / Z));
  const sy = Math.trunc(Math.min(Math.max(z.cy - H / Z / 2, 0), H - H / Z));
  const kx = 1920 / w, ky = 1080 / h;
  return [(x0 - sx) * kx, (y0 - sy) * ky, (x1 - sx) * kx, (y1 - sy) * ky];
};
import { drawAll as _draw, hide as _hide, f3 } from "../common.mjs";
import { ink, crop } from "./_ink.mjs";

export const PAPER = C.bg;
const OCRD = JSON.parse(readFileSync("screen-ocr.json", "utf8"));

// a stop's plateau (fully zoomed), ABSOLUTE cut seconds, exactly as demo_scene.py ramps it
export const plateauAbs = zid => {
  const z = zoomItem(zid), f = Math.round((z.end - z.start) * 30);
  const r = Math.min(z.ramp || 36, Math.floor(f / 3));
  const ri = Math.min(z.rampIn ?? r, Math.floor(f / 3)) / 30, ro = Math.min(z.rampOut ?? r, Math.floor(f / 3)) / 30;
  return [+(z.start + ri).toFixed(3), +(z.end - ro).toFixed(3)];
};

// the OCR run matching re at the sample nearest t INSIDE [lo, hi] (a stop's plateau: a sample from
// before a scroll would place the mark on the old position), optionally a substring of it
export const ocrAt = (t, re, { sub = null, subRe = null, ymin = 0, ymax = 2160, xmin = 0, xmax = 3840, within = [0, 1e9] } = {}) => {
  const c = OCRD.filter(d => d.t >= within[0] && d.t <= within[1]).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t));
  for (const d of c) {
    const r = d.runs.find(r => re.test(r[4]) && r[1] >= ymin && r[1] <= ymax && r[0] >= xmin && r[0] <= xmax);
    if (!r) continue;
    let [x, y, w, h, txt] = r;
    if (sub) { const i = txt.indexOf(sub); if (i < 0) continue; const cw = w / txt.length; x += i * cw; w = sub.length * cw; }
    if (subRe) { const m = txt.match(subRe); if (!m) continue; const cw = w / txt.length; x += m.index * cw; w = m[0].length * cw; }
    return [x, y, x + w, y + h];
  }
  throw new Error(`OCR: /${re.source}/${sub ? ` (${sub})` : ""} not found in ${within}`);
};

// Every mark of a part goes through marks(): it measures, draws, schedules and gates.
//   M.ul(key, zid, {re, sub, ocr, glyphs, phrase, on, off, col, w, at})  underline
//   M.box(key, zid, {targets: [{re, sub, ...}], on, off, col, w, padX, padY}) box round the union
// on / off are ABSOLUTE cut seconds; off defaults to the stop's plateau end. Returns html; M.js() the
// timeline code; M.check() runs the gate (throws).
export const marks = (pid) => {
  const P0 = span(pid)[0], list = [];
  const rel = t => +(t - P0).toFixed(3);
  // The speaker points at each number with the I-beam as he reads it (gZ1: on 25650 at its word, on
  // 10 at its word), and an I-beam over a glyph splits the token. The ink is therefore measured on a
  // frame of the same plateau with no cursor on the line (the screen is still inside a plateau, which
  // the gate proves): the landing frame first, then frames across the plateau.
  const measure = (zid, tg, t) => {
    const within = plateauAbs(zid);
    // tg.est: an explicit source box, for a cell OCR never reads (gZ4's lone "2" and "0"s), built from
    // OCR'd neighbours (its column header's x, its row label's y); the glyph ink still decides the edges
    let est = tg.est ?? ocrAt(t, tg.re, { ...tg, within });
    if (tg.estX) est = [tg.estX[0], est[1], tg.estX[1], est[3]];     // a whole row: OCR's y, the table's x
    const [pa, pb] = within, cand = [t, pa + 0.2, ...Array.from({ length: 9 }, (_, k) => pa + (pb - pa) * (k + 0.5) / 9)];
    for (const tm of cand) {
      const b = ink(tm, est, tg);
      const cur = b.line.blobs.some(g => g.kind === "pipe" && g.x1 - g.x0 > 5 && g.x1 > est[0] - 120 && g.x0 < est[2] + 120);
      if (!cur) return { est, b, tm };
    }
    throw new Error(`${pid}: the cursor is on /${tg.re.source}/ in every frame tried`);
  };
  const reg = (key, zid, kind, o, targets, geo, html) => {
    const [pa, pb] = plateauAbs(zid);
    // a cue up to 0.5s before the zoom lands draws as it lands (gZ4's "fps" is the stop's first word)
    const on = o.on < pa && o.on > pa - 0.5 ? pa : o.on, off = o.off ?? pb - 0.3;
    list.push({ key, zid, kind, on, off, targets, geo, pa, pb, d: o.d ?? (kind === "box" ? 0.45 : 0.35), accent: o.col === C.accent });
    return html;
  };
  const M = {
    ul(key, zid, o) {
      // one target, or o.targets (a table row: the check name AND its question), underlined as one
      const ts = (o.targets ?? [o]).map(tg => ({ ...tg, ...measure(zid, tg, o.on) }));
      const w = o.w ?? 5;
      const bs = ts.map(t => mapZoom(zid, t.b.slice(0, 4)));
      const [x0, y0, x1, y1] = [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))];
      const bl = ts.map(t => t.b.below).filter(v => v != null);
      const below = bl.length ? mapZoom(zid, [0, Math.min(...bl), 0, Math.min(...bl)])[1] : y1 + 40;
      // the underline sits under the glyphs, clear of the next ink below (a table border or dashed rule):
      // centred in the gap, 4-9px under the ink; o.at = "border" keeps its bottom edge 7px above the border
      let y = o.at === "border" ? below - 7 - w / 2 : y1 + Math.max(4 + w / 2, Math.min(9, (below - y1) / 2));
      if (y + w / 2 > below - 2) throw new Error(`${pid}/${key}: no room for an underline between the text (${y1.toFixed(1)}) and the ink below (${below.toFixed(1)})`);
      const xa = x0 + w / 2, xb = x1 - w / 2;                    // round caps: the stroke's ends land on the ink's
      const html = markSVG(x0, y - w, x1, y + w, `<line id="${pid}-${key}" x1="${xa.toFixed(1)}" y1="${y.toFixed(1)}" x2="${xb.toFixed(1)}" y2="${y.toFixed(1)}" pathLength="1" stroke="${o.col ?? PAPER}" stroke-width="${w}" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`);
      return reg(key, zid, "ul", o, ts, [x0, y - w / 2, x1, y + w / 2], html);
    },
    box(key, zid, o) {
      const ts = o.targets.map(tg => ({ ...tg, ...measure(zid, tg, o.on) }));
      let w = o.w ?? 5;
      const bs = ts.map(t => mapZoom(zid, t.b.slice(0, 4)));
      let [x0, y0, x1, y1] = [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))];
      // the stroke's INNER edge sits padX / padY px outside the ink (style: marks follow the line pitch,
      // vertical pad at most half the leading)
      // left / right: the stroke stays clear of the NEXT glyph or pipe on the line (gZ2's 246 and 124
      // boxes met across their pipe; 49's and the motors box rode the "|" after them): at most padX
      // outside the ink, and never past the middle of the gap to the neighbour
      const Z = zoomItem(zid).zoom / 2;
      const lt = ts.reduce((p, q) => q.b[0] < p.b[0] ? q : p), rt = ts.reduce((p, q) => q.b[2] > p.b[2] ? q : p);
      const nb = (t, side) => {
        const o2 = t.b.line.blobs.filter(g => side < 0 ? g.x1 <= t.b[0] - 1 : g.x0 >= t.b[2] + 1);
        if (!o2.length) return 99;
        const g = side < 0 ? Math.max(...o2.map(g => g.x1)) : Math.min(...o2.map(g => g.x0));
        return Math.abs(side < 0 ? t.b[0] - g : g - t.b[2]) * Z;
      };
      const want = o.padX ?? 6;
      // the same pad both sides, so a box sits centred on its text (the tighter side sets it)
      const room = Math.min(nb(lt, -1), nb(rt, 1)) / 2 - 1;      // px from the ink to the gap's middle
      if (room - w / 2 < 3) w = Math.max(3, Math.min(w, 2 * (room - 2.5)));   // a tight cell gets a thinner stroke, not a cramped one
      const pad = Math.max(1.5, Math.min(want, room - w / 2));
      const pl = pad + w / 2, pr = pad + w / 2;
      const py = (o.padY ?? 5) + w / 2;
      x0 -= pl; x1 += pr; y0 -= py; y1 += py;
      const html = markSVG(x0, y0, x1, y1, `<rect id="${pid}-${key}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" rx="6" pathLength="1" fill="none" stroke="${o.col ?? PAPER}" stroke-width="${w}" style="stroke-dasharray:1;stroke-dashoffset:1;opacity:0"/>`);
      return reg(key, zid, "box", o, ts, [x0, y0, x1, y1], html);
    },
    // a win's label (style.md: wins are marked as loudly as misses): tracked caps beside its mark with a
    // drawn tick, paper on the dark screen. at = [left, vertical centre] in canvas px; placed by the part
    // in measured empty screen, and gated like a mark (inside its stop's plateau).
    label(key, zid, o) {
      const col = o.col ?? PAPER, [x, y] = o.at;
      const html = `<div id="${pid}-${key}" class="capt" style="position:absolute;left:${x.toFixed(1)}px;top:${(y - 22).toFixed(1)}px;height:44px;display:flex;align-items:center;gap:14px;color:${col};font-size:30px;letter-spacing:0.14em;white-space:nowrap;opacity:0">${o.text}`
        + `<svg width="36" height="32" viewBox="0 0 36 32" style="overflow:visible"><path class="tk" d="M3 17 L13 27 L33 4" pathLength="1" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1;stroke-dashoffset:1"/></svg></div>`;
      return reg(key, zid, "label", o, [], [x, y - 22, x + 220, y + 22], html);
    },
    // a veil that DIMS a row the speaker is talking past (gZ4: "success_episodes NaN" while he says "no
    // NaN values"): the screen's own dark ($ink) at 65%, over the row's measured ink plus a few px
    veil(key, zid, o) {
      const ts = o.targets.map(tg => ({ ...tg, ...measure(zid, tg, o.on) }));
      const bs = ts.map(t => mapZoom(zid, t.b.slice(0, 4)));
      const [x0, y0, x1, y1] = [Math.min(...bs.map(b => b[0])) - 10, Math.min(...bs.map(b => b[1])) - 6, Math.max(...bs.map(b => b[2])) + 10, Math.max(...bs.map(b => b[3])) + 6];
      const html = `<div id="${pid}-${key}" style="position:absolute;left:${x0.toFixed(1)}px;top:${y0.toFixed(1)}px;width:${(x1 - x0).toFixed(1)}px;height:${(y1 - y0).toFixed(1)}px;background:${C.ink};border-radius:6px;opacity:0"></div>`;
      return reg(key, zid, "veil", o, ts, [x0, y0, x1, y1], html);
    },
    js() {
      // the seek check reads GEOMETRY, not paint: every mark settles 6px as it draws
      // a stroke at dash offset 1 is not empty: a round-capped line paints its cap as a DOT and a rect a
      // 1px sliver at its path start (both found on the alpha of the renders, on screen from frame 0 until
      // the mark drew). Every mark stays at opacity 0 until it draws.
      return list.map(m => m.kind === "veil"
        ? `tl.fromTo("#${pid}-${m.key}",{opacity:0,y:6},{opacity:0.65,y:0,duration:0.35,ease:"power2.out"},${f3(rel(m.on))});\n`
          + `tl.fromTo("#${pid}-${m.key}",{opacity:0.65},{opacity:0,duration:0.25,immediateRender:false},${f3(rel(m.off))});\n`
        : m.kind === "label"
        ? `tl.fromTo("#${pid}-${m.key}",{opacity:0,y:14},{opacity:1,y:0,duration:0.35,ease:"power3.out"},${f3(rel(m.on))});\n`
          + _draw(`#${pid}-${m.key} .tk`, rel(m.on) + 0.2, 0.3) + _hide(`#${pid}-${m.key}`, rel(m.off), 0.25)
        : `tl.fromTo("#${pid}-${m.key}",{opacity:0},{opacity:1,duration:0.2},${f3(rel(m.on))});\n`
        + _draw(`#${pid}-${m.key}`, rel(m.on), m.d)
        + `tl.fromTo("#${pid}-${m.key}",{y:6},{y:0,duration:${Math.max(m.d, 0.3)},ease:"power2.out"},${f3(rel(m.on))});\n`
        + _hide(`#${pid}-${m.key}`, rel(m.off), 0.25)).join("");
    },
    // A 2px transparent element travelling the whole part. The check's seek sweep compares element
    // GEOMETRY at a handful of sample times; a part whose marks all draw and leave between those samples
    // read as a frozen timeline (gZ0, 2026-10-28). This proves the timeline advances under seek; it is
    // never seen: it has no background, border or content (opacity 1, because the sweep skips elements
    // under 0.2 opacity).
    clock(D) {
      return [`<div id="${pid}-clock" style="position:absolute;left:0;top:0;width:2px;height:2px"></div>`,
              `tl.fromTo("#${pid}-clock",{x:0},{x:200,duration:${f3(D)},ease:"none"},0);\n`];
    },
    list,
    check() {
      const bad = [];
      for (const m of list) {
        // 1. inside its own stop's plateau: drawn after the zoom lands, gone before the zoom (or the page) moves
        if (m.on < m.pa - 0.01 || m.off + 0.25 > m.pb + 0.01)
          bad.push(`${m.key}: on ${m.on}-${m.off + 0.25} outside ${m.zid}'s plateau ${m.pa}-${m.pb}`);
        // 2. accent: one at a time
        // 3. the target holds still while the mark is on: OCR (every sample, 5px) and the glyph ink (3px)
        for (const tg of m.targets) {
          if (!tg.re) { tg.re = /(?!)/; }                // no OCR run to follow: the pixel check below still runs
          // OCR: the run's top in every sample while the mark is on, against their median. Samples whose
          // box height is off the median by 4px+ are skipped: the I-beam joining a run stretches its box
          const smp = [];
          for (const d of OCRD.filter(d => d.t >= m.on && d.t <= m.off + 0.25)) {
            const rs = d.runs.filter(r => tg.re.test(r[4]) && r[0] >= (tg.xmin ?? 0) && r[0] <= (tg.xmax ?? 3840) && Math.abs(r[1] - tg.est[1]) < 200);
            if (rs.length) smp.push([d.t, rs.reduce((p, q) => Math.abs(p[1] - tg.est[1]) <= Math.abs(q[1] - tg.est[1]) ? p : q)]);
          }
          if (smp.length) {
            const med = a => [...a].sort((p, q) => p - q)[a.length >> 1];
            // and samples whose TEXT differs from the run's usual reading: the I-beam over a glyph turns
            // "1.1504" into "1.1Ñ04" and shifts the box 6px with the screen perfectly still (gZ7 at 1473)
            const cnt = {}; for (const s of smp) cnt[s[1][4]] = (cnt[s[1][4]] || 0) + 1;
            const txt = Object.entries(cnt).sort((p, q) => q[1] - p[1])[0][0];
            const mt = med(smp.map(s => s[1][1])), mh = med(smp.map(s => s[1][3]));
            for (const [t, r] of smp) if (Math.abs(r[3] - mh) < 4 && r[4] === txt && Math.abs(r[1] - mt) > 5)
              bad.push(`${m.key}: OCR target /${tg.re.source}/ moves ${r[1] - mt}px at ${t} while the mark is on`);
          }
          // pixels: has the TEXT moved? The glyphs' crop (4px margin) at the measured frame against
          // mid-hold and the last frame the mark shows, as a vertical shift: the I-beam the speaker points
          // with changes pixels but does not shift every row the same way; a scroll does
          const R = [tg.b[0] - 4, tg.b[1] - 10, tg.b[2] + 4, tg.b[3] + 10], A = crop(tg.tm, R);
          for (const t of [(m.on + m.off) / 2, m.off + 0.2]) {
            const B = crop(t, R), md = sh => { let s = 0, n = 0;
              for (let y = 8; y < A.H - 8; y++) for (let x = 0; x < A.W; x++) { s += Math.abs(A.px(x, y) - B.px(x, y + sh)); n++; } return s / n; };
            const d0 = md(0), best = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].reduce((p, q) => md(q) < md(p) ? q : p, -6);
            if (md(best) < 0.6 * d0 && d0 > 4) bad.push(`${m.key}: the text under the mark shifts ${best}px between ${tg.tm.toFixed(2)} and ${t.toFixed(2)}`);
          }
        }
      }
      const acc = list.filter(m => m.accent).sort((a, b) => a.on - b.on);
      for (let i = 1; i < acc.length; i++) if (acc[i].on < acc[i - 1].off + 0.25) bad.push(`two accent marks at once: ${acc[i - 1].key}, ${acc[i].key}`);
      if (bad.length) throw new Error(`${pid} mark gate FAILED:\n  ` + bad.join("\n  "));
      if (process.env.MARKS_DUMP) for (const m of list)          // for verification on the render
        console.log("MARK " + JSON.stringify({ pid, key: m.key, kind: m.kind, on: m.on, off: m.off, geo: m.geo.map(v => +v.toFixed(1)),
          ink: m.targets.map(t => mapZoom(m.zid, t.b.slice(0, 4)).map(v => +v.toFixed(1))) }));
      return `${pid}: ${list.length} marks pass the gate`;
    },
  };
  return M;
};
export const abs = (pid, t) => span(pid)[0] + t;
