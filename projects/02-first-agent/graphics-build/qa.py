#!/usr/bin/env python3
"""Technical QA on a finished render. Every claim here is a measurement."""
import argparse, json, os, re, subprocess, sys, hashlib
from PIL import Image, ImageChops, ImageStat

def sh(cmd): return subprocess.run(cmd,capture_output=True,text=True).stdout.strip()
def err(cmd): return subprocess.run(cmd,capture_output=True,text=True).stderr

def probe(f,stream,field,count=False):
    c=["ffprobe","-v","error","-select_streams",stream]
    if count: c+=["-count_frames"]
    return sh(c+["-show_entries",f"stream={field}","-of","default=nw=1:nk=1",f])

def main():
    ap=argparse.ArgumentParser()
    for x in ("render","base","raw","cutsheet","gcutsheet","work"): ap.add_argument("--"+x,required=True)
    ap.add_argument("--expect-frames",type=int,required=True)
    a=ap.parse_args(); os.makedirs(a.work,exist_ok=True)
    fails=[]; def_ok=lambda n,c,d: (print(f"  {'PASS' if c else 'FAIL'}  {n}: {d}"), fails.append(n) if not c else None)

    print("== counts ==")
    vf=int(probe(a.render,"v:0","nb_read_frames",True))
    sa=int(probe(a.render,"a:0","duration_ts"))
    def_ok("frame count", vf==a.expect_frames, f"{vf} vs {a.expect_frames}")
    def_ok("audio samples", sa==vf*1600, f"{sa} vs {vf*1600}")
    drift=abs(vf/30 - sa/48000)*1000
    def_ok("a/v drift", drift<=40, f"{drift:.4f} ms")
    def_ok("resolution", probe(a.render,"v:0","width")=="3840", probe(a.render,"v:0","width")+"x"+probe(a.render,"v:0","height"))

    print("== duplicate frames ==")
    md5=os.path.join(a.work,"q.md5")
    subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-i",a.render,"-map","0:v:0","-f","framemd5",md5],check=True)
    prev=None;dup=tot=0
    for line in open(md5):
        if line.startswith("#"): continue
        h=line.rsplit(",",1)[-1].strip(); tot+=1
        if h==prev: dup+=1
        prev=h
    pct=100*dup/max(tot,1)
    def_ok("exact duplicates", pct<=8.0, f"{dup}/{tot} = {pct:.2f}% (limit 8%)")

    print("== video order, render vs RAW FOOTAGE (non-circular) ==")
    cs=json.load(open(a.cutsheet)); segs=[s for s in cs["segments"] if s.get("keep",True)]
    m=[];off=0
    for s in segs:
        n=s["endFrame"]-s["startFrame"]; m.append((off,off+n,s["startFrame"],s["id"])); off+=n
    picks=[2]+[int(off*(k+0.5)/11) for k in range(11)]
    worst=0
    for f in picks:
        seg=next((x for x in m if x[0]<=f<x[1]),None)
        if not seg or f>=a.expect_frames: continue
        a0,_,sf,sid=seg; ct=f/30; st=(sf+(f-a0))/30
        for tag,src,t in (("r",a.base,ct),("s",a.raw,st)):
            subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-ss",f"{t:.3f}","-i",src,
                "-frames:v","1","-vf","scale=480:-2","-update","1",os.path.join(a.work,f"{tag}.png")],check=True)
        d=ImageStat.Stat(ImageChops.difference(
            Image.open(os.path.join(a.work,"r.png")).convert("L"),
            Image.open(os.path.join(a.work,"s.png")).convert("L"))).mean[0]
        worst=max(worst,d)
        print(f"     cut {ct:7.2f} -> src {st:7.2f}  {sid}  diff {d:5.2f}")
    def_ok("video order (base vs raw)", worst<3.0, f"worst diff {worst:.2f} (a match is ~0.1-1.5, a mismatch ~3+)")

    print("== every graphic present in the composite ==")
    g=json.load(open(a.gcutsheet))
    for p in g["parts"]:
        dur=p["end"]-p["start"]; t=p["start"]+min(dur*0.8,dur-0.6)
        if t*30>=a.expect_frames: continue
        subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-ss",f"{t:.2f}","-i",a.render,
            "-frames:v","1","-vf","scale=480:-2","-update","1",os.path.join(a.work,"g.png")],check=True)
        subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-ss",f"{t:.2f}","-i",a.base,
            "-frames:v","1","-vf","scale=480:-2","-update","1",os.path.join(a.work,"gb.png")],check=True)
        gi=Image.open(os.path.join(a.work,"g.png")).convert("L")
        bi=Image.open(os.path.join(a.work,"gb.png")).convert("L")
        bx=p.get("box")
        if bx: crop=(bx["x"][0]//4,bx["y"][0]//4,bx["x"][1]//4,bx["y"][1]//4)
        elif p.get("zone")=="leftColumn": crop=(24,25,175,245)
        elif p["class"]=="segment": crop=None
        else: crop=(24,180,456,243)
        if crop: gi,bi=gi.crop(crop),bi.crop(crop)
        d=ImageStat.Stat(ImageChops.difference(gi,bi)).mean[0]
        ok = d>10.0
        print(f"     {p['id']}  {int(p['start']//60)}:{p['start']%60:05.2f}  delta vs base {d:6.2f}  {'visible' if ok else 'NOT VISIBLE'}")
        if not ok: fails.append(p["id"])
    print("\n" + ("QA: PASS" if not fails else "QA: FAIL -> " + ", ".join(fails)))
    sys.exit(0 if not fails else 1)

if __name__=="__main__": main()
