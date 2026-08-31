#!/usr/bin/env python3
"""Count EXACT duplicate frames in the composited output.

The skill's version cannot fire. It uses `mpdecimate=hi=64:lo=32:frac=0.001`, whose
thresholds are 12x below FFmpeg's defaults, so almost nothing is ever called a duplicate:
on a provably frozen 200s screen window it reported 0% while default mpdecimate reported
99.9%. It then greps `drop_count`, which -loglevel debug prints for EVERY frame, not just
dropped ones. Two independent reasons it always passes.

This counts exactly-identical consecutive frames by hash. Real footage carries sensor
noise, so genuine duplicates are ~0%; the eof_action judder bug shows up around 25%.
"""
import subprocess, sys, hashlib, os
def main():
    path=sys.argv[1]; limit=float(sys.argv[2]) if len(sys.argv)>2 else 8.0
    md5=os.path.join("/tmp", os.path.basename(path)+".framemd5")
    subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-i",path,"-map","0:v:0",
                    "-f","framemd5",md5],check=True)
    prev=None; dup=0; tot=0
    for line in open(md5):
        if line.startswith("#"): continue
        h=line.rsplit(",",1)[-1].strip()
        tot+=1
        if prev is not None and h==prev: dup+=1
        prev=h
    pct=100.0*dup/max(tot,1)
    print(f"  frames {tot}, exact duplicates {dup} ({pct:.2f}%), limit {limit}%")
    print("  " + ("PASS" if pct<=limit else "FAIL -- looks like the eof_action judder bug"))
    sys.exit(0 if pct<=limit else 1)
if __name__=="__main__": main()
