import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { page, cutsheet } from "./build.mjs";
import * as parts from "./parts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
mkdirSync(resolve(HERE, "parts"), { recursive: true });

let n = 0;
for (const p of cutsheet.parts) {
  const fn = parts[p.id];
  if (typeof fn !== "function") { console.log(`  skip ${p.id} (not written yet)`); continue; }
  const spec = fn();
  const planned = +(p.end - p.start).toFixed(3);
  if (Math.abs(spec.duration - planned) > 0.002) {
    console.error(`  FAIL ${p.id}: composition duration ${spec.duration} != cutsheet ${planned}`);
    process.exit(1);
  }
  const html = page({ id: p.id, duration: spec.duration, body: spec.body, script: spec.script, opaque: spec.opaque });
  writeFileSync(resolve(HERE, "parts", `${p.id}.html`), html);
  console.log(`  ${p.id}  ${spec.duration.toFixed(3)}s  ${spec.opaque ? "opaque" : "transparent"}`);
  n++;
}
console.log(`emitted ${n} composition(s)`);
