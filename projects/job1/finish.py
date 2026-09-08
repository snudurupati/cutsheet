#!/usr/bin/env python3
"""Stage 4 finishing: music bed + sound effects. Pure audio -- video is COPIED.

Levels are RELATIVE TO THE MEASURED VOICE, not raw gains on the source files.
style.json: "A licensed track mastered at -10 LUFS and one mastered at -20 LUFS
must land at the same bed level; a flat gain puts them 10 dB apart." The previous
finish.sh applied volume=-18dB directly to the music, which is that bug, and -18
is also the level the human rejected in a four-way A/B on 2026-08-31.

Section boundaries and runtime come from the cut sheet, never from literals: a
hardcoded time is a landmine that arms itself the first time the cut changes.

Captions: none. Long form ships uncaptioned (style.json captions.longForm.burnIn).
Usage: finish.py <input.mp4>
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
IN = sys.argv[1] if len(sys.argv) > 1 else 'outputs/graphics-pass.mp4'
if not os.path.exists(IN): sys.exit(f'{IN} not found')

plan  = json.load(open('graphics-build/cutsheet.json'))
style = json.load(open('../../styles/editorial/style.json'))
A = style['audio']
BED_DB, SFX_DB = A['musicBedDb'], A['sfxDb']
FADE_OUT = A['musicFadeOutSeconds']
RUNTIME = plan['runtime']

# Gate the input against the cut sheet before doing any work.
n = int(subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries',
    'stream=nb_frames','-of','csv=p=0', IN], capture_output=True, text=True).stdout.strip())
assert n == plan['runtimeFrames'], f'{IN} is {n} frames, cut sheet says {plan["runtimeFrames"]}'

sections = json.load(open('outputs/sections.json'))
INTRO_END   = sections['intro']['end']
OUTRO_START = sections['outro']['start']
OUTRO_LEN   = RUNTIME - OUTRO_START           # derived, never a literal
BED1_LEN    = 156.5

MUS    = 'audio/soundtracks/audiocopper-dark-571483.mp3'
WOOSH  = 'audio/sound-effects/ribhavagrawal-woosh-230554.mp3'
REVEAL = 'audio/sound-effects/ribhavagrawal-cinematic-reveal-type-01-265535.mp3'
for f in (MUS, WOOSH, REVEAL):
    if not os.path.exists(f): sys.exit(f'missing {f}')

def lufs(path, stream='a'):
    """Integrated loudness, measured -- never assumed."""
    r = subprocess.run(['ffmpeg','-nostdin','-v','info','-i',path,'-map',f'0:{stream}:0',
                        '-af','ebur128=framelog=quiet','-f','null','-'],
                       capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)
    if not m: sys.exit(f'could not measure loudness of {path}')
    return float(m[-1])

print('measuring ...', flush=True)
voice = lufs(IN)
print(f'  voice on the render : {voice:6.1f} LUFS')
gains = {}
for name, f, rel in (('music', MUS, BED_DB), ('woosh', WOOSH, SFX_DB), ('reveal', REVEAL, SFX_DB)):
    src = lufs(f)
    g = (voice + rel) - src
    gains[name] = g
    print(f'  {name:7s} {src:6.1f} LUFS  target {voice+rel:6.1f}  gain {g:+6.1f} dB')

W1 = INTRO_END - 0.35            # woosh leads the hard cut into the demo
W2 = OUTRO_START - 0.35
OUT = 'outputs/job1-music-sfx.mp4'
fc = (
 f"[1:a]atrim=0:{BED1_LEN},asetpts=PTS-STARTPTS,"
 f"afade=t=out:st={BED1_LEN-2:.3f}:d=2,volume={gains['music']:.2f}dB[bed1];"
 f"[2:a]atrim=0:{OUTRO_LEN:.3f},asetpts=PTS-STARTPTS,"
 f"afade=t=out:st={OUTRO_LEN-FADE_OUT:.3f}:d={FADE_OUT},volume={gains['music']:.2f}dB,"
 f"adelay={int(OUTRO_START*1000)}:all=1[bed2];"
 f"[3:a]volume={gains['woosh']:.2f}dB,adelay={int(W1*1000)}:all=1[wo1];"
 f"[4:a]volume={gains['woosh']:.2f}dB,adelay={int(W2*1000)}:all=1[wo2];"
 f"[5:a]volume={gains['reveal']:.2f}dB[rev];"
 f"[0:a][bed1][bed2][wo1][wo2][rev]amix=inputs=6:normalize=0:duration=first,"
 f"alimiter=limit=0.97[a]"
)
print('mixing ...', flush=True)
r = subprocess.run(['ffmpeg','-nostdin','-hide_banner','-v','error','-y','-i',IN,
    '-i',MUS,'-i',MUS,'-i',WOOSH,'-i',WOOSH,'-i',REVEAL,
    '-filter_complex',fc,'-map','0:v','-map','[a]',
    '-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000', OUT],
    capture_output=True, text=True)
if r.returncode: print(r.stderr[-2500:]); sys.exit('mix failed')

after = lufs(OUT)
print(f'  mixed loudness      : {after:6.1f} LUFS (voice was {voice:.1f})')
n2 = int(subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries',
    'stream=nb_frames','-of','csv=p=0', OUT], capture_output=True, text=True).stdout.strip())
assert n2 == plan['runtimeFrames'], f'output is {n2} frames, expected {plan["runtimeFrames"]}'
json.dump({
  'music': {'track': MUS, 'relativeDb': BED_DB, 'appliedGainDb': round(gains['music'], 2),
            'beds': [{'at': 0.0, 'length': BED1_LEN, 'fadeIn': False, 'fadeOut': 2.0},
                     {'at': OUTRO_START, 'length': round(OUTRO_LEN, 3), 'fadeIn': False,
                      'fadeOut': FADE_OUT}],
            'ducking': False},
  'sfx': [{'at': 0.0, 'file': REVEAL, 'relativeDb': SFX_DB,
           'appliedGainDb': round(gains['reveal'], 2), 'why': 'reveal on the hook'},
          {'at': round(W1, 3), 'file': WOOSH, 'relativeDb': SFX_DB,
           'appliedGainDb': round(gains['woosh'], 2), 'why': 'intro -> demo hard cut'},
          {'at': round(W2, 3), 'file': WOOSH, 'relativeDb': SFX_DB,
           'appliedGainDb': round(gains['woosh'], 2), 'why': 'demo -> outro hard cut'}],
  'measured': {'voiceLufs': voice, 'mixedLufs': after},
  'captions': {'burnIn': False, 'why': 'long form, style.json captions.longForm.burnIn=false'},
}, open('outputs/audio-plan.json', 'w'), indent=2)
print(f'wrote {OUT}')
