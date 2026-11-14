// gZ0: legibility punch-in on the notebook's own nine-checks table (the real asset behind g11). The
// punch-in alone makes the table legible: NO marks. Round 2 (2026-10-28): his cursor points at row A,
// then at Outcomes, exactly where the underlines landed ("no mark goes where the speaker is already
// pointing", style.md 2026-10-17), so they were dropped. The zoom itself is FFmpeg (demo-spec.json):
// it pushes in after his scroll onto the table settles and zooms out on his next scroll at 482.10.
// The part carries only the transparent clock, so its composition still seeks and renders.
import { emit, frames } from "../lib.mjs";
import { marks } from "./_zoom.mjs";
const ID = "gZ0";
export default function build() {
  const D = frames(ID) / 30, M = marks(ID);
  const [ch, cj] = M.clock(D);
  emit(ID, D, `<div style="position:absolute;inset:0">${ch}</div>`, cj);
}
