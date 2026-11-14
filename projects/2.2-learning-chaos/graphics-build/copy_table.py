#!/usr/bin/env python3
"""The graphics checkpoint's copy table (CLAUDE.md hard rule 13).

Every visible on-screen string of every part, as one markdown table for the
human to read WITHOUT opening a single file: part id | time range from the cut
sheet | copy string, one row per string. House style bans em-dashes in on-screen
copy (CLAUDE.md "No em-dashes") and this job's fact-check bans the literal
"1915"; the final section lists every row containing either and the tool prints
FAIL and exits 1 if that section is not empty.

    python3 copy_table.py --parts parts --out checkpoints/copy-table.md \
        [--cutsheet cutsheet.json]

Extraction is textual (html.parser, stdlib): the text content of elements, with
<style>/<script> contents and all attributes excluded (attributes are never
copy), tags stripped, entities unescaped, whitespace collapsed, deduped per
part in first-seen order. This is the cheap pre-check; dom_checks.mjs remains
the DOM-accurate version that also measures overflow/overlap/zone.
"""
import argparse
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

FORBIDDEN = ["\u2014", "1915"]          # em-dash (house style), the literal year


class CopyExtractor(HTMLParser):
    SKIP = {"style", "script", "textarea", "title", "noscript"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.strings = []
        self._skip_depth = 0
        self._buf = []

    def handle_starttag(self, tag, attrs):     # attrs are never read: not copy
        if tag in self.SKIP:
            self._skip_depth += 1

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip_depth:
            self._skip_depth -= 1
        if self._buf and not self._skip_depth:
            self._flush()

    def handle_data(self, data):
        if not self._skip_depth:
            self._buf.append(data)

    def _flush(self):
        s = re.sub(r"\s+", " ", html.unescape("".join(self._buf))).strip()
        self._buf = []
        # visible copy has letters or digits in it: rules, brackets, glyphs are not
        if s and re.search(r"[A-Za-z0-9]", s):
            self.strings.append(s)

    def close(self):
        super().close()
        if self._buf and not self._skip_depth:
            self._flush()


def mmss(t):
    return f"{int(t) // 60}:{t % 60:04.1f}"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--parts", default="parts", help="directory of parts/<id>/index.html")
    ap.add_argument("--out", default="checkpoints/copy-table.md")
    ap.add_argument("--cutsheet", default="cutsheet.json")
    a = ap.parse_args()

    cs = json.load(open(a.cutsheet))
    plan = {p["id"]: p for p in cs["parts"]}
    missing_dir = not os.path.isdir(a.parts)
    if missing_dir:
        print(f"WARN: no {a.parts}/ directory yet (parts not built): the table lists every "
              f"cut-sheet part with (no index.html)")

    rows, offenders, n_parts = [], [], 0
    for pid, p in plan.items():                                   # cut-sheet order
        f = os.path.join(a.parts, pid, "index.html")
        rng = f"{mmss(p['start'])}-{mmss(p['end'])}"
        if missing_dir or not os.path.exists(f):
            rows.append((pid, rng, "(no index.html)"))
            continue
        n_parts += 1
        x = CopyExtractor()
        x.feed(open(f, encoding="utf-8").read())
        x.close()
        seen = set()
        for s in x.strings:
            if s in seen:
                continue
            seen.add(s)
            rows.append((pid, rng, s))
            bad = [w for w in FORBIDDEN if w in s]
            if bad:
                offenders.append((pid, rng, s, bad))

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    lines = [
        "# On-screen copy table",
        "",
        f"Every visible string per part, read from {a.parts}/<id>/index.html; times from "
        f"`{a.cutsheet}` ({n_parts}/{len(plan)} parts built). "
        "Forbidden in copy: em-dash (house style) and the literal \"1915\".",
        "",
        "| part | time | copy |",
        "|---|---|---|",
    ]
    for pid, rng, s in rows:
        lines.append(f"| {pid} | {rng} | {s.replace('|', chr(92) + '|')} |")
    lines += ["", "## Forbidden strings (must be empty)", ""]
    if offenders:
        lines.append("| part | time | copy | contains |")
        lines.append("|---|---|---|---|")
        for pid, rng, s, bad in offenders:
            lines.append(f"| {pid} | {rng} | {s.replace('|', chr(92) + '|')} | {', '.join(repr(b) for b in bad)} |")
    else:
        lines.append("none")
    lines.append("")
    open(a.out, "w", encoding="utf-8").write("\n".join(lines))

    print(f"wrote {a.out}: {len(rows)} rows across {n_parts} built part(s), "
          f"{len(plan)} in the cut sheet")
    if offenders:
        print(f"FAIL: {len(offenders)} copy string(s) contain a forbidden token:")
        for pid, rng, s, bad in offenders:
            print(f"  {pid} {rng}  {s}  [{', '.join(bad)}]")
        sys.exit(1)
    print("copy check: OK (no em-dash, no literal 1915)")


main()
