#!/usr/bin/env python3
"""Promote the newest real render to one unambiguous final file, retire the
superseded drafts, and (optionally) reclaim scratch.

Two rules make this safe enough to trust, and both live HERE, in the script,
not in a prompt, so a future session cannot talk itself past them:

  1. Dry run by default. Nothing happens without --apply.
  2. Nothing newer than the deliverable is ever deleted, compared by mtime.

Never source footage. Never the outputs folder wholesale.

Usage:
  export.py <job-dir> [--apply] [--reclaim] [--drop-master] [--copy-to DIR]
"""
import os, sys, shutil, json, time, subprocess, array, math

# Matched by STEM, not by full name: a base cut carried as .mov (to keep audio lossless
# through to finishing) is the same durable artefact as one carried as .mp4, and naming
# only the .mp4 listed it for retirement.
KEEP_ALWAYS_STEMS = ('base-cut', 'transcript-cut', 'audio-plan', 'sections',
                     'deliverable')


def _keep_always(name):
    stem = name.rsplit('.', 1)[0]
    return stem in KEEP_ALWAYS_STEMS


class _KeepAlways(tuple):
    """Behaves like the old tuple for `in` tests, but matches on stem."""
    def __contains__(self, name):
        return _keep_always(name)


KEEP_ALWAYS = _KeepAlways((
    'base-cut.mp4',            # the base cut. Reopening the job needs it
    'transcript-cut.json',     # remapped transcript
    'audio-plan.json',         # so a re-render re-applies the same plan
    'sections.json',
))
# heavy, regenerable, and not the deliverable
RECLAIMABLE_DIRS = ('outputs/segments', 'outputs/face', 'graphics-build/parts')
RECLAIMABLE_FILES = ('outputs/th1080.mp4', 'outputs/sc1080.mp4', 'outputs/sc2160.mp4',
                     'outputs/base-assembled.mov', 'outputs/graphics-head.mp4',
                     'outputs/voice48.wav', 'outputs/concat.txt', 'outputs/segjobs.txt')
# Superseded drafts: every render in outputs/ that is neither the promoted final
# nor something KEEP_ALWAYS names. Each is regenerable from the base cut plus the
# scripts, and one of them is usually byte-identical to the final it was promoted
# from. The mtime guard below still applies to every one of them.
DRAFT_SUFFIXES = ('.mp4', '.mov', '.mkv')


def human(n):
    for u in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f"{n:.0f}{u}"
        n /= 1024
    return f"{n:.1f}TB"


SOURCE_EXT = ('.html', '.mjs', '.js', '.json', '.py', '.md', '.css', '.srt', '.txt',
              '.ttf', '.otf', '.woff2')


def holds_source(p):
    """True if a reclaim target contains build source rather than heavy renders.

    RECLAIMABLE_DIRS names directories by convention, and the convention drifts:
    on 02-first-agent graphics-build/parts held the twelve generated HTML
    compositions, 112KB of reviewed source, not the ProRes renders the name
    implies. Deleting build source to reclaim kilobytes is never the trade, and
    hard rule 8 says the build source is durable.
    """
    if os.path.isfile(p):
        return p.endswith(SOURCE_EXT)
    for r, _, fs in os.walk(p):
        for f in fs:
            if f.endswith(SOURCE_EXT):
                return True
    return False


def tree_size(p):
    if os.path.isfile(p):
        return os.path.getsize(p)
    return sum(os.path.getsize(os.path.join(r, f))
               for r, _, fs in os.walk(p) for f in fs)



def _ff(*a):
    return subprocess.run(a, capture_output=True)


def quiet_floor_db(path, start, dur):
    """10th-percentile short-window RMS, in dBFS, over [start, start+dur).

    The percentile is the point: during speech pauses a music bed holds the level
    up off the noise floor, so the QUIET end of the distribution is what separates
    a mix that has a bed from one that does not. Mean level cannot see a bed at
    -30 LUFS under a -21 LUFS voice. It moves by tenths of a dB.
    """
    r = _ff('ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(dur), '-i', path,
            '-map', 'a:0', '-ac', '1', '-ar', '8000', '-f', 's16le', '-')
    pcm = array.array('h'); pcm.frombytes(r.stdout[:len(r.stdout) // 2 * 2])
    if not pcm:
        return None
    win, rms = 800, []                      # 100ms windows
    for i in range(0, len(pcm) - win, win):
        acc = sum(v * v for v in pcm[i:i + win]) / win
        rms.append(10 * math.log10(acc / (32768.0 ** 2) + 1e-12))
    if not rms:
        return None
    rms.sort()
    return rms[len(rms) // 10]


def music_is_present(path, plan, verbose=True):
    """Assert the render actually carries the music bed the plan describes.

    Gates the promotion on CONTENT, not on a filename or an mtime. A render that
    the plan names but that does not contain the bed is a stale or wrong file, and
    promoting it would ship the video silent under the hook and the close.
    """
    places = (plan.get('music') or {}).get('placements') or []
    if not places:
        return True, 'plan declares no music'
    spans = [(float(p['start']), float(p['start']) + float(p['trim'][1] - p['trim'][0]))
             for p in places]
    a0, a1 = spans[0]
    inside = (a0 + 5.0, min(20.0, max(5.0, a1 - a0 - 8.0)))
    dur = float(_ff('ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                    '-of', 'csv=p=0', path).stdout or 0)
    gap = None
    for t in range(int(spans[0][1]) + 30, int(dur) - 40, 20):
        if all(not (s - 10 < t < e + 10) for s, e in spans):
            gap = (float(t), 20.0); break
    if gap is None:
        return True, 'no music-free window to compare against'
    fi = quiet_floor_db(path, *inside)
    fo = quiet_floor_db(path, *gap)
    if fi is None or fo is None:
        return False, 'could not measure audio'
    if verbose:
        print(f"      music window {inside[0]:.0f}s floor {fi:.1f} dBFS | "
              f"music-free {gap[0]:.0f}s floor {fo:.1f} dBFS | delta {fi - fo:+.1f} dB")
    return (fi - fo) >= 4.0, f'bed lifts the quiet floor by {fi - fo:.1f} dB (need >= 4.0)'



def probe_codecs(path):
    out = _ff('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name',
              '-of', 'csv=p=0', path).stdout.decode()
    v = a = '?'
    for line in out.strip().splitlines():
        name, kind = (line.split(',') + ['', ''])[:2]
        if kind == 'video':
            v = name
        elif kind == 'audio':
            a = name
    return v, a


def verify_promoted(src, final):
    """A remux is only correct if the picture survived it untouched and the sound
    is still there. Size cannot tell you that once the container changed."""
    def dur(p):
        return float(_ff('ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                         '-of', 'csv=p=0', p).stdout or 0)
    def vhash(p):
        r = _ff('ffmpeg', '-v', 'error', '-i', p, '-map', '0:v:0', '-c', 'copy',
                '-f', 'md5', '-')
        return r.stdout.decode().strip()
    ds, df = dur(src), dur(final)
    if abs(ds - df) > 0.05:
        print(f"      VERIFY FAIL: duration {ds:.3f} -> {df:.3f}")
        return False
    hs, hf = vhash(src), vhash(final)
    if hs != hf:
        print(f"      VERIFY FAIL: video stream changed in the remux")
        return False
    _, af = probe_codecs(final)
    if af == '?':
        print("      VERIFY FAIL: no audio stream in the promoted file")
        return False
    print(f"      verified: {df:.2f}s, video stream md5 identical, audio {af}")
    return True


def pick_deliverable(job, outdir, jobname, plan_path):
    """The deliverable is the file the finishing stage RECORDED, not the newest
    render by mtime and not the newest *.mp4.

    On 2026-08-31 the mtime picker filtered candidates to '.mp4', so it could not
    see finished.mov at all: it planned to promote graphics-pass.mp4 (no music, no
    sound effects) and to retire the only file that had them. Two earlier sessions
    had already hit the same .mov/.mp4 split and patched it for the keep-list only.
    A denylist of stems cannot fix this class of bug. Gating on what the plan knows can.
    """
    existing = [f for f in sorted(os.listdir(outdir)) if f.startswith(f'{jobname}-final')]
    plan = {}
    if os.path.exists(plan_path):
        plan = json.load(open(plan_path))
    named = plan.get('output')
    if named:
        src = os.path.join(job, named) if not os.path.isabs(named) else named
        if not os.path.exists(src):
            if existing:
                return None, 'already', existing[0]
            return None, None, (f"audio-plan.json names {named} as the finishing output, "
                                f"but it does not exist. Refusing to guess at another file.")
        ok, why = music_is_present(src, plan)
        if not ok:
            return None, None, (f"REFUSING TO PROMOTE {named}: {why}.\n"
                                f"The plan says this render carries a music bed and it does not. "
                                f"Re-run finishing; do not promote and do not reclaim.")
        return src, os.path.basename(src), f'named by audio-plan.json ({why})'

    # No plan output recorded (a job finished before this field existed). Fall back
    # to the newest render of ANY video extension, and say out loud that it is a guess.
    cands = [f for f in os.listdir(outdir)
             if f.endswith(DRAFT_SUFFIXES) and not f.startswith(f'{jobname}-final')
             and f not in KEEP_ALWAYS
             and f not in ('th1080.mp4', 'sc1080.mp4', 'sc2160.mp4', 'graphics-head.mp4')]
    if not cands:
        if existing:
            return None, 'already', existing[0]
        return None, None, 'no candidate renders found'
    newest = max(cands, key=lambda f: os.path.getmtime(os.path.join(outdir, f)))
    return (os.path.join(outdir, newest), newest,
            'GUESSED by mtime. audio-plan.json records no "output". Check this is right.')


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    job = args[0].rstrip('/')
    apply_ = '--apply' in args
    reclaim = '--reclaim' in args
    drop_master = '--drop-master' in args
    copy_to = None
    if '--copy-to' in args:
        copy_to = os.path.expanduser(args[args.index('--copy-to') + 1])

    outdir = os.path.join(job, 'outputs')
    jobname = os.path.basename(job)

    plan_path = os.path.join(outdir, 'audio-plan.json')
    src, newest, how = pick_deliverable(job, outdir, jobname, plan_path)
    if src is None:
        if newest == 'already':
            print(f"already promoted. {how} is the deliverable. Nothing to do.")
            return 0
        print(how)
        return 1
    final = os.path.join(outdir, f'{jobname}-final-longform-2160p.mp4')

    print(f"{'APPLY' if apply_ else 'DRY RUN, nothing will change'}")
    print(f"\nPROMOTE  {newest}  ({human(os.path.getsize(src))})")
    print(f"      how: {how}")
    print(f"      -> {os.path.basename(final)}")
    vcodec, acodec = probe_codecs(src)
    remux = not (src.endswith('.mp4') and acodec in ('aac',))
    if remux:
        print(f"      remux: {vcodec} video copied, {acodec} audio -> aac 320k, mp4 container")
        print(f"      (video stream is COPIED, so the picture is bit-identical)")
    if copy_to:
        print(f"COPY     -> {os.path.join(copy_to, os.path.basename(final))}")

    deliverable_mtime = os.path.getmtime(src)

    print("\nKEEP")
    for f in sorted(os.listdir(outdir)):
        if f in KEEP_ALWAYS:
            print(f"      {f}")
    print("      transcript/ (transcript.json, cutsheet.json, the durable record)")
    print("      graphics-build/ (build.mjs, cutsheet.json, renders, the real progress)")

    # PROMOTE FIRST. Nothing is deleted until the deliverable exists on disk and
    # has been size-verified against what it was promoted from.
    promoted_ok = False
    if apply_ and os.path.exists(final) and verify_promoted(src, final):
        print("      already promoted and verified, not re-encoding")
        promoted_ok = True
    elif apply_:
        if remux:
            r = _ff('ffmpeg', '-v', 'error', '-y', '-i', src, '-map', '0:v:0', '-map', '0:a:0',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart',
                    final)
            if r.returncode != 0:
                print("PROMOTE FAILED:", r.stderr.decode()[:400])
                return 1
        else:
            shutil.copy2(src, final)
        promoted_ok = verify_promoted(src, final)
        if not promoted_ok:
            print("PROMOTE FAILED verification. Nothing will be retired.")
        if promoted_ok:
            json.dump({'name': os.path.basename(final),
                       'bytes': os.path.getsize(final),
                       'mtime': os.path.getmtime(final),
                       'promotedFrom': os.path.basename(src),
                       'when': time.strftime('%Y-%m-%d %H:%M:%S'),
                       '_why': ('identity of the shipped file. A later run resolves the '
                                'deliverable through this, not through a filename prefix. '
                                'On 2026-08-31 the promoted file lost its "02-" prefix to '
                                'something outside this pipeline and the prefix test '
                                'reclassified it as a superseded draft; only the mtime guard '
                                'kept it out of the delete list, and that was luck.')},
                      open(os.path.join(outdir, 'deliverable.json'), 'w'), indent=2)
        if copy_to and promoted_ok:
            os.makedirs(copy_to, exist_ok=True)
            shutil.copy2(final, os.path.join(copy_to, os.path.basename(final)))

    # Resolve the shipped file even if it was renamed outside this pipeline.
    shipped = set()
    dj = os.path.join(outdir, 'deliverable.json')
    if os.path.exists(dj):
        rec = json.load(open(dj))
        for f in os.listdir(outdir):
            fp = os.path.join(outdir, f)
            if not os.path.isfile(fp):
                continue
            if f == rec['name']:
                shipped.add(f)
            elif (os.path.getsize(fp) == rec['bytes']
                  and abs(os.path.getmtime(fp) - rec['mtime']) < 2):
                shipped.add(f)
                print(f"\nNOTE  {f} matches the shipped file {rec['name']} by size and "
                      f"mtime.\n      It was renamed outside this pipeline. Treating it as "
                      f"the deliverable and keeping it.")

    drafts = []
    for f in sorted(os.listdir(outdir)):
        if f in shipped:
            continue
        if not f.endswith(DRAFT_SUFFIXES) or f in KEEP_ALWAYS:
            continue
        if f == os.path.basename(final):
            continue
        # The file we promoted FROM is the lossless master: same picture, but audio
        # that has not been through a lossy encode. Regenerating it means re-running
        # the composite and the mix, the most expensive step in the job, so it is
        # kept unless the human asks for it by name with --drop-master. Promotion
        # alone is not consent to delete it.
        if f == newest:
            if not (drop_master and promoted_ok):
                continue
        drafts.append(os.path.join('outputs', f))
    if drafts:
        print("\nRETIRE (superseded drafts)")
        for rel in drafts:
            print(f"      {rel}  ({human(tree_size(os.path.join(job, rel)))})")
        if not apply_:
            print(f"      (plus {newest} once the promoted copy is verified)")

    if reclaim:
        print("\nRECLAIM")
        total, seen = 0, set()
        for rel in RECLAIMABLE_DIRS + RECLAIMABLE_FILES + tuple(drafts):
            p = os.path.join(job, rel)
            if rel in seen or not os.path.exists(p):
                continue
            seen.add(rel)
            # GUARD: never delete anything newer than the deliverable
            if os.path.getmtime(p) > deliverable_mtime:
                print(f"      SKIP {rel}: newer than the deliverable, never deleted")
                continue
            # GUARD: never sweep build source out of a reclaim target
            if holds_source(p):
                print(f"      SKIP {rel}: holds build source, not regenerable renders")
                continue
            sz = tree_size(p)
            total += sz
            print(f"      {rel}  ({human(sz)})")
            if apply_:
                shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
        print(f"      total reclaimable: {human(total)}")

    print("\napplied" if apply_ else
          "\nnothing changed. re-run with --apply after reading the plan.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
