#!/bin/bash
# Preview captures for every built part (capture.mjs), two parts at a time. Previews only.
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p previews/parts previews/.log
ls -d parts/*/ | xargs -n1 basename | xargs -P 2 -I{} sh -c 'node capture.mjs {} previews/parts/{}.mov 0.5 3 > previews/.log/{}.log 2>&1 && tail -1 previews/.log/{}.log || { echo "FAIL {}"; tail -3 previews/.log/{}.log; }'
