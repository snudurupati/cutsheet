#!/usr/bin/env python3
"""Keep a style's prose and its knobs from contradicting each other.

style.json is authoritative for WHETHER. style.md is authoritative for HOW.
This checks the boundary mechanically:

  1. style.md must not contain constraint language about whether something is
     allowed. "never dissolves" describes a mechanic and passes; "long form
     never reframes" is a constraint and fails — it belongs in style.json.
  2. Colours in style.md must be tokens, never hex.
  3. style.json must parse, and must carry the keys the pipeline reads.

Why this exists: on 2026-08-18 style.md said long form "never reframes" while
the same file specified long-form PiP geometry and head->panel transitions. The
prose line was used to override a direct request. A contradiction between these
two files is a bug in the style, not a decision to make.

Usage: check_style.py [styles/<name> ...]      (default: every style)
"""
import json, re, sys, os, glob

# Constraint language about *whether*. Each pattern must be paired with a
# style.json key, or moved there outright.
CONSTRAINT_PATTERNS = [
    (r'\bnever\s+(?:reframes?|uses?|allows?|ships?|gets?|runs?|appears?)\b', 'never + verb about permission'),
    (r'\balways\s+(?:reframes?|uses?|ships?|gets?|runs?)\b', 'always + verb about permission'),
    (r'\bis\s+not\s+allowed\b', 'explicit prohibition'),
    (r'\bmust\s+not\s+(?:be|use|have)\b', 'explicit prohibition'),
    (r'\bonly\s+ever\b', 'exclusivity constraint'),
]
# Mechanics that legitimately read like constraints — describing HOW a thing
# moves, not WHETHER it is permitted.
MECHANIC_ALLOWLIST = [
    r'never dissolves', r'never fades? out early', r'never just appears?',
    r'never appear\b', r'never a redrawn', r'never an ad-hoc', r'never transformed',
    r'never actually still', r'never enters', r'never a hex', r'never a decision',
    r'never zooms? back out', r'never mid-clause', r'never both',
]
REQUIRED_JSON_KEYS = ['name', 'canvas', 'delivery', 'graphics', 'audio', 'learned']


def check(style_dir):
    errs, warns = [], []
    md_path, json_path = os.path.join(style_dir, 'style.md'), os.path.join(style_dir, 'style.json')
    if not (os.path.exists(md_path) and os.path.exists(json_path)):
        return [f"{style_dir}: missing style.md or style.json"], []

    try:
        cfg = json.load(open(json_path))
    except Exception as e:
        return [f"{json_path}: invalid JSON — {e}"], []

    for k in REQUIRED_JSON_KEYS:
        if k not in cfg:
            errs.append(f"style.json: missing required key '{k}'")

    d = cfg.get('delivery', {})
    if not d.get('neverDownscaleBelowSource'):
        warns.append("style.json: delivery.neverDownscaleBelowSource is not set — "
                     "a render can silently ship below source resolution")

    lines = open(md_path).read().split('\n')
    in_quote = False
    for i, line in enumerate(lines, 1):
        # the authority header quotes the rules it is defining; skip it
        if line.startswith('>'):
            in_quote = True
            continue
        if in_quote and not line.strip():
            in_quote = False
        low = line.lower()
        if re.search(r'#[0-9a-f]{6}\b', low):
            errs.append(f"style.md:{i}: hex colour in prose — use a $token")
        # quoted text is a record of what a rule USED to say, not a live rule
        low = re.sub(r'["“”][^"“”]*["“”]', '', low)
        if any(re.search(a, low) for a in MECHANIC_ALLOWLIST):
            continue
        for pat, what in CONSTRAINT_PATTERNS:
            if re.search(pat, low):
                errs.append(f"style.md:{i}: {what} — constraints belong in style.json\n"
                            f"    {line.strip()[:96]}")
    return errs, warns


def main():
    dirs = sys.argv[1:] or sorted(
        d for d in glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), '*'))
        if os.path.isdir(d))
    bad = 0
    for d in dirs:
        errs, warns = check(d)
        name = os.path.basename(d.rstrip('/'))
        for w in warns:
            print(f"  WARN  [{name}] {w}")
        for e in errs:
            print(f"  ERROR [{name}] {e}")
        if errs:
            bad += 1
        else:
            print(f"  OK    [{name}] prose and knobs agree")
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
