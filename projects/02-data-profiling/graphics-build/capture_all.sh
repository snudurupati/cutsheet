#!/bin/bash
# Preview captures (capture.mjs), KEYED: only parts whose composition folder, frame range or the
# capture script changed are recaptured, two at a time (make_reel.py --capture-only; graphics skill,
# "The checkpoint loop is incremental too"). Previews only. FORCE: ./capture_all.sh --force
set -uo pipefail
cd "$(dirname "$0")"
exec python3.14 make_reel.py --capture-only "$@"
