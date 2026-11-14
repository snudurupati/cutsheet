#!/bin/bash
# The graphics checkpoint's measured DOM checks (CLAUDE.md hard rule 13): every
# part from the cut sheet through dom_checks.mjs, PASS/FAIL lines collected into
# checkpoints/dom-report.txt for the human's checkpoint pack.
#
# The cut sheet is an ARGUMENT (--cutsheet, default ./cutsheet.json, hard rule
# 12) and ids come from ITS parts[] list. dom_checks.mjs takes a part id
# (node dom_checks.mjs <id>) and prints one PASS/FAIL/SKIP line for it; one
# node process per part so a crash in one part cannot silence the rest, and a
# crash still lands in the report as a FAIL line.
set -uo pipefail

CUTSHEET="./cutsheet.json"
OUT="checkpoints/dom-report.txt"
ONLY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --cutsheet) [ $# -ge 2 ] || { echo "usage: check_all.sh [--cutsheet PATH] [--out PATH] [--only id,id]" >&2; exit 2; }
                CUTSHEET="$2"; shift 2 ;;
    --cutsheet=*) CUTSHEET="${1#*=}"; shift ;;
    --out)      [ $# -ge 2 ] || { echo "usage: check_all.sh [--cutsheet PATH] [--out PATH] [--only id,id]" >&2; exit 2; }
                OUT="$2"; shift 2 ;;
    --out=*)    OUT="${1#*=}"; shift ;;
    --only)     [ $# -ge 2 ] || { echo "usage: check_all.sh [--cutsheet PATH] [--out PATH] [--only id,id]" >&2; exit 2; }
                ONLY="$2"; shift 2 ;;
    --only=*)   ONLY="${1#*=}"; shift ;;
    -h|--help)  echo "usage: check_all.sh [--cutsheet PATH] [--out PATH] [--only id,id]"; exit 0 ;;
    *) echo "unknown argument: $1 (see --help)" >&2; exit 2 ;;
  esac
done
# resolve BEFORE cd so relative paths keep meaning the caller's cwd
CUTSHEET=$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$CUTSHEET")
[ -f "$CUTSHEET" ] || { echo "no cut sheet at $CUTSHEET" >&2; exit 1; }
cd "$(dirname "$0")"
OUT=$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$OUT")
export CUTSHEET
mkdir -p "$(dirname "$OUT")"

if [ ! -f dom_checks.mjs ]; then echo "no dom_checks.mjs next to check_all.sh" >&2; exit 1; fi

# ids from the cut sheet, --only filters (comma-separated)
ids=$(python3 - "$ONLY" <<'PY'
import json, os, sys
only = {x for x in sys.argv[1].split(",") if x}
ids = [p["id"] for p in json.load(open(os.environ["CUTSHEET"]))["parts"]]
print(" ".join(i for i in ids if not only or i in only))
PY
)
missing=$(python3 - "$ONLY" <<'PY'
import json, os, sys
only = {x for x in sys.argv[1].split(",") if x}
have = {p["id"] for p in json.load(open(os.environ["CUTSHEET"]))["parts"]}
print(" ".join(sorted(only - have)))
PY
)
for id in $missing; do echo "unknown part id '$id', not in $CUTSHEET" >&2; done
[ -z "$missing" ] || exit 2
[ -n "$ids" ] || { echo "no parts to check" >&2; exit 1; }

{
  echo "# dom checks  $(date '+%Y-%m-%d %H:%M:%S')  cutsheet=$CUTSHEET  node=$(node --version)"
  echo "#"
} >"$OUT"

fails=0; passes=0; skips=0
for id in $ids; do
  echo "  checking $id"
  line=$(node dom_checks.mjs "$id" 2>&1)
  rc=$?
  # take the tool's own verdict line(s); a crash with no verdict is still a FAIL
  vline=$(printf '%s\n' "$line" | grep -E "^(PASS|FAIL|SKIP) " | head -3)
  if [ -z "$vline" ]; then
    vline="FAIL $id: dom_checks.mjs exited $rc with no verdict: $(printf '%s\n' "$line" | tail -1)"
  fi
  if printf '%s\n' "$vline" | grep -q "^FAIL "; then fails=$((fails+1));
  elif printf '%s\n' "$vline" | grep -q "^PASS "; then passes=$((passes+1));
  else skips=$((skips+1)); fi
  printf '%s\n' "$vline" >>"$OUT"
done

total=$((passes+fails+skips))
if [ "$fails" -eq 0 ] && [ "$passes" -gt 0 ]; then
  echo "# ALL PASS: $passes passed, $skips skipped of $total parts" >>"$OUT"
  echo "---"
  echo "ALL DOM CHECKS PASS ($passes passed, $skips skipped of $total parts) -> $OUT"
elif [ "$fails" -eq 0 ]; then
  # nothing built yet: say so, do not let an all-SKIP run read as a green checkpoint
  echo "# CHECKPOINT NOT RUN: 0 passed, $skips of $total parts skipped (parts/ not built)" >>"$OUT"
  echo "---"
  echo "NO CHECKPOINT: 0 of $total parts passed (all skipped: build parts first) -> $OUT"
  exit 1
else
  echo "# $fails of $total parts FAILED ($passes passed, $skips skipped)" >>"$OUT"
  echo "---"
  echo "DOM CHECK FAILURES: $fails of $total parts -> $OUT"
  exit 1
fi
