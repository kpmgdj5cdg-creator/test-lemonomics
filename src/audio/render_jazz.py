"""Evening Current: original instrumental jazz, 3:20 at 96 BPM.
Synthesized electric piano, rounded bass, sax-like lead and lightly swung drums.
No vocal, recording samples, artist imitation or external services. Requires
numpy, scipy and ffmpeg. Run to regenerate the editable original composition.
"""
from pathlib import Path
import json
import subprocess
import wave

import numpy as np
from scipy.signal import butter, sosfilt

OUT = Path(__file__).resolve().parent
SR = 44100
BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 80
DURATION = BARS * BAR
RNG = np.random.default_rng(74325)
mix = np.zeros((round((DURATION + 3) * SR), 2), dtype=np.float32)
echo = np.zeros_like(mix)


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def lowpass(signal, cutoff, order=2):
    return sosfilt(butter(order, cutoff, fs=SR, output='sos'), signal).astype(np.float32)


def highpass(signal, cutoff):
    return sosfilt(butter(2, cutoff, btype='highpass', fs=SR, output='sos'), signal).astype(np.float32)


def envelope(n, attack=.01, release=.1):
    e = np.ones(n, dtype=np.float32)
    a, r = min(round(attack * SR), n // 2), min(round(release * SR), n // 2)
    if a:
        e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        e[-r:] = np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    return e


def add(sound, time, gain=1, pan=0, send=0):
    start = round(time * SR)
    sound = sound[:max(0, len(mix) - start)]
    if not len(sound):
        return
    if sound.ndim == 1:
        angle = (pan + 1) * np.pi / 4
        sound = sound[:, None] * np.array([np.cos(angle), np.sin(angle)], dtype=np.float32)
    mix[start:start + len(sound)] += sound * gain
    if send:
        echo[start:start + len(sound)] += sound * gain * send


def voice(note, seconds, kind='piano'):
    n = round(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = hz(note)
    if kind == 'piano':
        phase = 2 * np.pi * f * t
        y = np.sin(phase + 1.4 * np.sin(phase * 2) * np.exp(-t * 7))
        y += .15 * np.sin(phase * 3.003) * np.exp(-t * 9)
        y *= np.exp(-t * 1.65) * envelope(n, .006, .22)
        return lowpass(y, 4300)
    if kind == 'bass':
        y = np.sin(2 * np.pi * f * t) + .27 * np.sin(2 * np.pi * f * 2 * t)
        y += .1 * np.sin(2 * np.pi * f * 3 * t)
        return y * np.exp(-t * 3.1) * envelope(n, .009, .12)
    if kind == 'pad':
        l = np.sin(2 * np.pi * f * .998 * t) + .19 * np.sin(2 * np.pi * f * 2 * t)
        r = np.sin(2 * np.pi * f * 1.002 * t) + .19 * np.sin(2 * np.pi * f * 2.003 * t)
        return np.stack([l, r], axis=1) * envelope(n, .5, .8)[:, None]
    # Original breathy reed-like synthesizer; no sampled saxophone performance.
    vibrato = .0033 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(t * 3, 1)
    frequency = f * (1 + vibrato - .018 * np.exp(-t * 17))
    phase = 2 * np.pi * np.cumsum(frequency) / SR
    y = np.zeros(n, dtype=np.float32)
    for h, gain in [(1, 1), (2, .5), (3, .29), (4, .19), (5, .1), (6, .055)]:
        y += np.sin(phase * h + .15 * h) * gain
    breath = lowpass(RNG.normal(0, 1, n).astype(np.float32), 4300) * .035
    y = lowpass(y + breath, 3800)
    return y * envelope(n, .045, min(.18, seconds / 3))

def make_drums():
    t = np.arange(round(.5 * SR)) / SR
    phase = 2 * np.pi * (47 * t + 95 * .023 * (1 - np.exp(-t / .023)))
    kick = np.sin(phase) * np.exp(-t * 9)
    kick += RNG.normal(0, 1, len(t)) * np.exp(-t * 320) * .09
    kick *= envelope(len(t), .001, .025)
    t = np.arange(round(.62 * SR)) / SR
    noise = highpass(RNG.normal(0, 1, len(t)).astype(np.float32), 1100)
    snare = noise * np.exp(-t * 17) * .7
    snare += np.sin(2 * np.pi * (180 * t - 13 * t * t)) * np.exp(-t * 22) * .46
    # Gated stereo-style drum room is baked into the original generated hit.
    room = lowpass(noise, 6500) * np.exp(-t * 5) * .13
    room[t > .27] *= np.exp(-(t[t > .27] - .27) * 60)
    snare += room
    snare *= envelope(len(t), .001, .035)
    t = np.arange(round(.09 * SR)) / SR
    hat = highpass(RNG.normal(0, 1, len(t)).astype(np.float32), 8000)
    hat *= np.exp(-t * 75) * envelope(len(t), .001, .02)
    t = np.arange(round(.35 * SR)) / SR
    open_hat = highpass(RNG.normal(0, 1, len(t)).astype(np.float32), 6500)
    open_hat *= np.exp(-t * 14) * envelope(len(t), .002, .08)
    t = np.arange(round(2.1 * SR)) / SR
    crash = highpass(RNG.normal(0, 1, len(t)).astype(np.float32), 5200)
    crash *= np.exp(-t * 2.8) * envelope(len(t), .003, .3)
    return kick, snare, hat, open_hat, crash


kick, snare, hat, open_hat, crash = make_drums()
chords = [
    (38, [53, 57, 60, 64]), (43, [53, 59, 64, 69]),
    (36, [52, 55, 59, 62]), (45, [55, 61, 64, 70]),
    (38, [53, 57, 60, 64]), (43, [53, 59, 64, 69]),
    (40, [55, 59, 62, 66]), (45, [55, 61, 64, 69]),
]
melody = [
    [(.5, .65, 69), (1.5, .5, 72), (2.25, .45, 76), (3, .8, 74)],
    [(0, .8, 71), (1.25, .45, 69), (2, .65, 67), (3, .8, 64)],
    [(.5, 1.1, 67), (2, .45, 71), (2.75, .8, 74)],
    [(0, .8, 73), (1, .45, 76), (1.75, .45, 70), (2.75, 1, 69)],
    [(0, .5, 72), (.75, .5, 74), (1.5, .8, 76), (3, .8, 77)],
    [(.5, .65, 76), (1.5, .45, 74), (2.25, .45, 71), (3, .75, 69)],
    [(0, .8, 71), (1.25, .45, 74), (2, 1.4, 78)],
    [(0, .7, 76), (1, .45, 73), (1.75, .4, 70), (2.5, 1.1, 69)],
]
sections = [(0, 8, 'Evening / intro'), (8, 24, 'First conversation'),
            (24, 40, 'Current / theme'), (40, 48, 'Electric piano interlude'),
            (48, 64, 'Second conversation'), (64, 72, 'Last light / theme'),
            (72, 80, 'Goodnight / outro')]

for bar in range(BARS):
    base = bar * BAR
    root, notes = chords[bar % 8]
    theme = 24 <= bar < 40 or 64 <= bar < 72
    interlude = 40 <= bar < 48
    energy = .62 if bar < 8 or bar >= 72 else .88 if interlude else 1
    # Comping changes its rhythm across the phrases instead of repeating an arp.
    pattern = [(0, .92), (1.65, .58), (3.2, .65)] if bar % 2 == 0 else [(.65, .7), (2.5, 1.0)]
    for offset, hold in pattern:
        for j, note in enumerate(notes):
            add(voice(note, hold * BEAT + .65), base + offset * BEAT + j * .008,
                .058 * energy, -.26 + j * .1, send=.18)
    if theme or bar < 8 or bar >= 72:
        for note in [notes[0], notes[2]]:
            add(voice(note, BAR + .6, 'pad'), base, .018 * energy, send=.21)
    if 4 <= bar < 78:
        next_root = chords[(bar + 1) % 8][0]
        line = [root, root + 7, root + 12, next_root - 1 if next_root > root else next_root + 1]
        for beat, note in enumerate(line):
            add(voice(note, BEAT * .88, 'bass'), base + beat * BEAT,
                .145 * energy * (1 if beat % 2 == 0 else .83), -.04)
    if 8 <= bar < 76:
        for offset, gain in [(0, .34), (1.65, .16), (2.5, .28), (3.65, .13)]:
            add(kick, base + offset * BEAT, gain * energy)
        for beat in (1.03, 3.03):
            add(snare, base + beat * BEAT, .105 * energy, -.12, send=.12)
        for step in range(8):
            # A light 60:40 swing, rather than straight dance eighth notes.
            offset = step // 2 + (.6 if step % 2 else 0)
            add(hat, base + offset * BEAT, .048 * (1 if step % 2 else .62), .32)
        if bar % 4 == 3:
            add(open_hat, base + 3.6 * BEAT, .028, .3)
        if bar % 8 == 7:
            add(snare, base + 3.65 * BEAT, .055, .1, send=.1)
    if bar in (8, 24, 48, 64, 72):
        add(crash, base, .041, -.4, send=.18)
    if 16 <= bar < 40 or 48 <= bar < 72:
        for offset, length, note in melody[bar % 8]:
            if not theme and bar % 4 == 3 and offset > 1:
                continue
            if bar >= 56 and bar % 8 in (0, 2, 4):
                note += 12 if offset == .5 else 0
            add(voice(note, length * BEAT + .12, 'reed'), base + offset * BEAT,
                .087 if theme else .069, .12, send=.25)
    if interlude or 8 <= bar < 16:
        pattern = [0, 2, 1, 3, 2, 1]
        for i, j in enumerate(pattern):
            add(voice(notes[j] + 12, .55), base + (.6 + i * .5) * BEAT,
                .037 if interlude else .022, .25, send=.28)
    if bar % 8 == 0:
        print(f'Rendered bar {bar + 1}/{BARS}', flush=True)

# Short stereo room plus a restrained musical delay for a warm intimate mix.
for seconds, gain, swap in [(.11, .18, True), (.17, .12, False), (.27, .1, True),
                             (BEAT * .75, .17, True), (BEAT * 1.5, .09, False)]:
    delay = round(seconds * SR)
    source = echo[:-delay, ::-1] if swap else echo[:-delay]
    mix[delay:] += source * gain
for channel in range(2):
    mix[:, channel] = highpass(mix[:, channel], 27)
mix = np.tanh(mix * 1.12)
mix *= .87 / np.max(np.abs(mix))
fade = round(2 * SR)
mix[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)[:, None]
start = round((DURATION - 9) * SR)
mix[start:] *= np.linspace(1, 0, len(mix) - start, dtype=np.float32)[:, None] ** 1.5
mix = mix[:round(DURATION * SR)]
raw = OUT / 'evening-current-premaster.wav'
with wave.open(str(raw), 'wb') as wav:
    wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(SR)
    wav.writeframes((mix * 32767).astype('<i2').tobytes())
master = OUT / 'Evening-Current-Instrumental.wav'
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-af',
                'loudnorm=I=-16:TP=-1.5:LRA=10', '-ar', str(SR), '-c:a', 'pcm_s24le',
                '-metadata', 'title=Evening Current', '-metadata',
                'artist=Lemonomics Original Instrumental', '-metadata', 'genre=Jazz', str(master)], check=True)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-c:a', 'libmp3lame',
                '-b:a', '256k', str(OUT / 'Evening-Current-Instrumental.mp3')], check=True)
raw.unlink()
metadata = {'title': 'Evening Current', 'durationSeconds': DURATION, 'bpm': BPM,
            'key': 'D minor with jazz turnarounds', 'vocals': False, 'originalComposition': True,
            'sections': [{'startSeconds': a * BAR, 'endSeconds': b * BAR, 'name': name}
                         for a, b, name in sections]}
(OUT / 'track-info.json').write_text(json.dumps(metadata, indent=2))
print('Finished original 3:20 instrumental jazz track.', flush=True)
