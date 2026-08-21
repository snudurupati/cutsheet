#!/usr/bin/env python3
"""Promote the newest real render to one unambiguous final file, retire the
superseded drafts, and (optionally) reclaim scratch.

Two rules make this safe enough to trust, and both live HERE, in the script,
not in a prompt — so a future session cannot talk itself past them:

  1. Dry run by default. Nothing happens without --apply.
  2. Nothing newer than the deliverable is ever deleted, compared by mtime.

Never source footage. Never the outputs folder wholesale.

Usage:
  export.py <job-dir> [--apply] [--reclaim] [--copy-to DIR]
"""
import os, sys, shutil, json, time

# Matched by STEM, not by full name: a base cut carried as .mov (to keep audio lossless
# through to finishing) is the same durable artefact as one carried as .mp4, and naming
# only the .mp4 listed it for retirement.
KEEP_ALWAYS_STEMS = ('base-cut', 'transcript-cut', 'audio-plan', 'sections')


def _keep_always(name):
    stem = name.rsplit('.', 1)[0]
    return stem in KEEP_ALWAYS_STEMS


class _KeepAlways(tuple):
    """Behaves like the old tuple for `in` tests, but matches on stem."""
    def __contains__(self, name):
        return _keep_always(name)


KEEP_ALWAYS = _KeepAlways((
    'base-cut.mp4',            # the base cut — reopening the job needs it
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


def tree_size(p):
    if os.path.isfile(p):
        return os.path.getsize(p)
    return sum(os.path.getsize(os.path.join(r, f))
               for r, _, fs in os.walk(p) for f in fs)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    job = args[0].rstrip('/')
    apply_ = '--apply' in args
    reclaim = '--reclaim' in args
    copy_to = None
    if '--copy-to' in args:
        copy_to = os.path.expanduser(args[args.index('--copy-to') + 1])

    outdir = os.path.join(job, 'outputs')
    jobname = os.path.basename(job)

    # newest real render = newest mp4 that is not already a promoted final and
    # not an intermediate
    # KEEP_ALWAYS files are NOT promotion candidates. Without this, a second run on an
    # already-promoted job picks base-cut.mp4 as "the newest real render" and copy2()s
    # the raw cut straight over the finished deliverable — same length, same 4K, no
    # graphics, no music. The mtime guard below does not catch it, because that is an
    # overwrite of the deliverable rather than a delete of something newer.
    cands = [f for f in os.listdir(outdir)
             if f.endswith('.mp4') and not f.startswith(f'{jobname}-final')
             and f not in KEEP_ALWAYS
             and f not in ('th1080.mp4', 'sc1080.mp4', 'sc2160.mp4', 'graphics-head.mp4')]
    if not cands:
        existing = [f for f in os.listdir(outdir) if f.startswith(f'{jobname}-final')]
        if existing:
            print(f"already promoted — {existing[0]} is the deliverable. Nothing to do.")
            return 0
        print("no candidate renders found")
        return 1
    newest = max(cands, key=lambda f: os.path.getmtime(os.path.join(outdir, f)))
    src = os.path.join(outdir, newest)
    final = os.path.join(outdir, f'{jobname}-final-longform-2160p.mp4')

    print(f"{'APPLY' if apply_ else 'DRY RUN — nothing will change'}")
    print(f"\nPROMOTE  {newest}  ({human(os.path.getsize(src))})")
    print(f"      -> {os.path.basename(final)}")
    if copy_to:
        print(f"COPY     -> {os.path.join(copy_to, os.path.basename(final))}")

    deliverable_mtime = os.path.getmtime(src)

    print("\nKEEP")
    for f in sorted(os.listdir(outdir)):
        if f in KEEP_ALWAYS:
            print(f"      {f}")
    print("      transcript/ (transcript.json, cutsheet.json — durable record)")
    print("      graphics-build/ (build.mjs, cutsheet.json, renders — the real progress)")

    # PROMOTE FIRST. Nothing is deleted until the deliverable exists on disk and
    # has been size-verified against what it was promoted from.
    promoted_ok = False
    if apply_:
        shutil.copy2(src, final)
        promoted_ok = os.path.getsize(final) == os.path.getsize(src)
        if copy_to:
            os.makedirs(copy_to, exist_ok=True)
            shutil.copy2(final, os.path.join(copy_to, os.path.basename(final)))

    drafts = []
    for f in sorted(os.listdir(outdir)):
        if not f.endswith(DRAFT_SUFFIXES) or f in KEEP_ALWAYS:
            continue
        if f == os.path.basename(final):
            continue
        # the file we promoted FROM is only retired once the final is verified
        if f == newest and not promoted_ok:
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
                print(f"      SKIP {rel} — newer than the deliverable, never deleted")
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
