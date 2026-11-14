#!/usr/bin/env python3
"""Measure the g01c hook's data from the simulated ALOHA insertion dataset (lerobot/aloha_sim_insertion_human).

Writes, per episode: the frame where each gripper first clamps (the open plateau falls by more than
0.15 below its running maximum, after first opening past 60% of its peak) and the episode's
whole-arm speed (z-scored) for the "noise" texture. NB: this is the SIMULATED ALOHA insertion set
(human teleop in sim), so nothing built on it may say "real robot". Asserts the claim the card prints
(left clamps first in every episode) before writing anything; if the data stops saying it, the
build stops.

Needs pyarrow (run with the physical-ai-data-architect venv's python):
  ~/Projects/physical-ai-data-architect/.venv/bin/python -I make_aloha_hook.py \
      --data ~/.cache/huggingface/lerobot/lerobot/aloha_sim_insertion_human --out aloha-hook.json
"""
import argparse, glob, json, os
import numpy as np, pyarrow.parquet as pq

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--step", type=int, default=1)
a = ap.parse_args()

info = json.load(open(os.path.join(a.data, "meta/info.json")))
names = info["features"]["observation.state"]["names"]["motors"]
LG, RG = names.index("left_gripper"), names.index("right_gripper")
files = sorted(glob.glob(os.path.join(a.data, "data/chunk-*/*.parquet")))
cols = ["observation.state", "episode_index", "frame_index"]
tabs = [pq.read_table(f, columns=cols).to_pandas() for f in files]
import pandas as pd
t = pd.concat(tabs).sort_values(["episode_index", "frame_index"])
S, E = np.stack(t["observation.state"].values), t["episode_index"].values
n_ep = info["total_episodes"]
assert len(np.unique(E)) == n_ep, f"{len(np.unique(E))} episodes in the parquet, meta says {n_ep}"

def clamp_frame(g):
    pk = np.where(g > 0.6 * g.max())[0][0]
    run = np.maximum.accumulate(g)
    b = np.where((np.arange(len(g)) > pk) & (g < run - 0.15))[0]
    if not len(b): raise SystemExit("an episode never clamps: the detector or the data changed")
    return int(b[0])

# The noise texture (composition review 2026-10-28: one slow joint read as ruled lines): the episode's
# whole-arm SPEED, the frame-to-frame change of all 14 joints summed in absolute value, at full 50 fps,
# z-scored per episode. Jittery, and it spikes around the grabs the card then marks.
eps = []
for e in range(n_ep):
    x = S[E == e]
    v = np.abs(np.diff(x, axis=0)).sum(1); v = (v - v.mean()) / v.std()
    eps.append({"episode": e, "frames": len(x), "left": clamp_frame(x[:, LG]), "right": clamp_frame(x[:, RG]),
                "trace": [round(float(q), 3) for q in v[::a.step]]})
first = sum(ep["left"] < ep["right"] for ep in eps)
assert first == n_ep, f"left clamps first in {first}/{n_ep}: the card's claim no longer holds"
fps = info["fps"]
out = {"_doc": "g01c hook data, measured by make_aloha_hook.py from " + a.data,
       "dataset": "lerobot/aloha_sim_insertion_human", "fps": fps, "episodes": n_ep,
       "leftFirst": first, "trace": "speed, sum |d joint| over 14 joints, z per episode", "traceStep": a.step,
       "leftMeanS": round(np.mean([e["left"] for e in eps]) / fps, 2),
       "rightMeanS": round(np.mean([e["right"] for e in eps]) / fps, 2), "eps": eps}
json.dump(out, open(a.out, "w"))
print(f"left first {first}/{n_ep}; left mean {out['leftMeanS']}s, right mean {out['rightMeanS']}s; wrote {a.out}")
