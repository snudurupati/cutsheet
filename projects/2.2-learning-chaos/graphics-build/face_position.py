#!/usr/bin/env python3
"""Where does the face sit? Column profile of detail (within-frame stdev) over many frames.
Usage: face_position.py <video> <out.json> [n_frames]
Rule 12: args in, probed duration asserted."""
import subprocess, sys, json, statistics, os, tempfile
from PIL import Image
video, out = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 12
dur = float(subprocess.run(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=duration","-of","csv=p=0",video],capture_output=True,text=True).stdout.strip() or 0)
assert dur > 0, f"cannot probe {video}"
W,H = 384,216
cols_all=[]
with tempfile.TemporaryDirectory() as tmp:
    for i in range(1,n+1):
        t = round(dur*i/(n+1),2)
        p=os.path.join(tmp,f"f{t}.png")
        subprocess.run(["ffmpeg","-v","error","-ss",str(t),"-i",video,"-frames:v","1","-vf",f"scale={W}:{H}","-y",p],check=True)
        im=Image.open(p).convert("L")
        px=im.load()
        cols=[statistics.pstdev([px[x,y] for y in range(20,H-20)]) for x in range(W)]
        cols_all.append(cols)
mean_cols=[statistics.mean(c[x] for c in cols_all) for x in range(W)]
# a column is "face-like" if its mean detail > 40 (wall < 10)
thresh=40
xs=[x for x,c in enumerate(mean_cols) if c>thresh]
scale=3840/W
print(f"{os.path.basename(video)}")
print("  detail profile (every 24 cols ~ 240 src px):")
line="".join("#" if c>40 else ("+" if c>18 else ".") for c in [mean_cols[x] for x in range(0,W,24)])
print("  "+line)
if xs:
    x0,x1=min(xs),max(xs)
    print(f"  face detail columns x {int(x0*scale)}-{int(x1*scale)} (4K px), n={n} frames")
json.dump({"video":video,"frames":n,"probedDuration":dur,
           "colDetail":[round(c,2) for c in mean_cols],
           "faceColumns4K":[int(min(xs)*scale),int(max(xs)*scale)] if xs else None},
          open(out,"w"))
