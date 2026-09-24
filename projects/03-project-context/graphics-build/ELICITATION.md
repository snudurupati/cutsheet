# Unattended run, 2026-09-08 night

Every question I would have asked, and how I resolved it without asking. Order is
the order I hit them. Anything marked **FLAG** is a real judgement call the human
should look at, not a mechanical decision.

## Footage pass

**Q. The screen has to be cut the same way as the camera. Where do the cuts come from?**
The cutsheet already carries `screenStartFrame`/`screenEndFrame` per segment, derived
from the 1-frame head trim. Nothing new to decide; the screen splice reads the same
file the camera splice did.

**Q. Punch-in crops.** style.md non-negotiable 5: measure, never estimate, and
verify the crop CONTAINS its target rather than merely being stable. A blank region
scores 0.0 drift and is perfectly stable while sitting on empty page. So each crop
is rendered and read before it ships.

**Q. Inset corner during the demo.** Already measured: bottom-right is occupied
1.91% on average against bottom-left's 5.53% across 1220 demo keyframes. Stays
bottom-right for the whole run, no repositioning, so it never bounces.

**Q. Does the inset need to hide anywhere?** demo-scene.json flags user-prompt
beats as candidates. Resolved: hide it only where a punch-in reads a right-aligned
user message, because that is the one place the inset lands on the thing being read.

## Face-forward compositing

**Q. Which parts need the subject matte?** Only overlays whose box actually
overlaps him, in the section where he is on camera. The demo-window parts sit over
the screen recording and never touch him. Running `remove-background` over the whole
video would be ~80 minutes and ~35GB for no benefit, so it runs per span.

**Q. Is the matte good enough?** Verified on a real frame before committing: the
card runs behind his shoulder with no halo at the edge. 2.1 fps at 4K.

## Audio

**Q. Delivery loudness.** Not in style.json. Inherited from 02-first-agent's
approach: measure the voice on the assembled render, then set music and sfx
RELATIVE to it, exactly as style.json `audio._levelsAreRelativeToVoice` requires.
Absolute target is -14 LUFS integrated with true peak -1.5 dBTP, which is the
platform normalisation point, so nothing gets turned down on upload.

**Q. Voice EQ.** style.json `audio._voiceEq` records 140Hz +1, 280Hz -3 (Q1.1),
3400Hz +4.0 (Q2.0), then a de-esser, chosen by ear for this speaker in this room on
a previous job. Same speaker, same room, so it applies. The style also warns the
presence bell must stay NARROW: Q0.9 at 3.8kHz read as harsh and sibilant.

**Q. Rumble.** Measured -71.3 to -72.5 dB against a -75 target. style.json is
explicit: do NOT add a corrective filter to chase a marginal spec number. An 80Hz
high-pass moved it 3 dB and cost ~1 dB of chest. Left alone.

**Q. Music bed.** One track in the job, so no choice to make. `musicBedDb: -9`
relative to the measured voice, no ducking, 1.5s fade out. Intro and outro only.

**Q. SFX.** `sfxPerVideoMax: 6`, sparse, on transitions and the hook. Placed on the
structural beats only: hook, demo scene in, demo scene out, the two full-frame
takeovers in and out. Gains computed per file from its measured source LUFS,
because the library spans 14 dB.

**Q. Captions.** brand.md and style.json both say long form ships with no burn-in.
None.

## Open flags for the morning

**FLAG 1.** The verdict card now sits over the screen recording rather than as the
biggest type in the video over his face. That was his call (cue placement outranks
visual weight) but it is worth seeing in context.

**FLAG 2.** g004 is the weakest part I built. It is legible and it carries the
thesis, but it is a diagram where most of the video is drawn objects.

**FLAG 3.** 134s is the longest stretch with no graphic (13:52-16:06), inside the
demo. Acceptable under hard rule 10's spirit, but it is the quietest passage.

## Overnight run, 2026-09-09

**g029 treatment.** panels.json was stale: g029 had moved into the demo window
(1315.5-1332.5, demo runs 205.33-1351.73) but still carried `lightReinforced`, a
92% card. Over a bright document that is the exact failure style.json warns about,
and the frame confirmed it: the document's headings and body text read straight
through the card. Rebuilt as `opaque` and re-composited. This was the third stale
derived file on this job, so validate_cutsheet.py now recomputes every overlay's
overScreen from the demo window and fails on disagreement.

**The composite bug that the counting gates could not see.** The re-composite was
pointed at a demo scene path that did not exist. assemble.py skipped the layer
silently, the raw talking head played for 19 minutes in place of the screen
recording, and the file still exited 0 at exactly 47272 frames, exactly 75635200
samples, and within 0.002% of the correct size. It was caught by pulling one frame
and looking at it. Two fixes: a missing demo scene or matte is now fatal, and
verify_composite.py samples every span against the layer that is supposed to be
there (a present layer matches at 0.0-0.4 and differs from the base by ~113).

**Audio.** Two real defects, both found by measuring the output rather than
trusting the command. loudnorm runs at 192kHz internally and emitted 192kHz, which
silently broke the invariant that one frame is 1600 samples; fixed with an
aresample before the limiter. And single-pass loudnorm landed 1.0 dB under target,
so the mix is now two-pass.

**Delivery level, a decision rather than a defect.** The mix sits at -14.7 LUFS
against a -14.0 target, with true peak exactly on the -1.5 ceiling. The material
needs +10.1 dB of gain to reach -14.0 and its peaks are only 7 dB down, so the
true-peak ceiling binds first. Closing the 0.7 dB would mean compressing the voice,
which is a taste decision. Left as is; mix_audio.py now reports which constraint
bound instead of printing a target it did not hit.

**Music level, a stale number in the skill.** plan_audio derived a -9 dB bed from
style.json while the finishing skill still said -18 in three places. style.json is
authoritative and records the human's 2026-08-31 four-way A/B that moved it, so the
skill was corrected to read the number from the style file rather than repeat it.
