#!/usr/bin/env python3
"""Emit the human-readable half of the graphics plan (the machine half is
cutsheet.json). Plan and build stay separate; this is the review artefact."""
import json, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
plan = json.load(open('cutsheet.json'))
ts = lambda t: f"{int(t // 60)}:{t % 60:05.2f}"

rows = ["# job1 — graphics plan",
        "",
        f"Canvas {plan['canvas'][0]}x{plan['canvas'][1]} (authoring) -> delivery "
        f"{plan['deliver'][0]}x{plan['deliver'][1]}, {plan['fps']} fps, runtime {ts(plan['runtime'])}.",
        "Style: `styles/editorial`. Colours are brand tokens; type is Satoshi throughout.",
        "",
        "Beats with no graphic are not in this list — a graphic on every line is wrong.",
        "",
        "| id | in | out | dur | kind | class | what |",
        "|----|----|-----|-----|------|-------|------|"]

for p in plan['parts']:
    what = p['direction'].split('.')[0]
    rows.append(f"| `{p['id']}` | {ts(p['start'])} | {ts(p['end'])} | "
                f"{p['end']-p['start']:.1f}s | {p['kind']} | {p['class']} | {what} |")

rows += ["", "## Full direction", ""]
for p in plan['parts']:
    rows += [f"### {p['id']} — {ts(p['start'])} to {ts(p['end'])} ({p['kind']}, {p['class']})",
             "", p['direction'], ""]
    if p.get('notes'):
        rows += [f"_{p['notes']}_", ""]

open('PLAN.md', 'w').write("\n".join(rows) + "\n")
print(f"wrote PLAN.md — {len(plan['parts'])} parts")
