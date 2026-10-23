"""Evening Current: original instrumental jazz, 3:20 at 96 BPM.
Modern lounge / elevator arrangement: mellow electric piano, warm chord pads,
rounded bass and restrained electronic percussion. No flute, reed or wind lead.
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
        # Soft tine electric piano: struck attack and decaying overtones.
        # No breath, sustained wind-like tone, vibrato or pitch bending.
        phase = 2 * np.pi * f * t
        y = np.sin(phase + .72 * np.sin(phase * 2) * np.exp(-t * 5))
        y += .20 * np.sin(phase * 2.003) * np.exp(-t * 3.8)
        y += .085 * np.sin(phase * 3.997) * np.exp(-t * 8)
        y *= np.exp(-t * 1.9) * envelope(n, .008, .24)
        return lowpass(y, 2800)
    if kind == 'bass':
        y = np.sin(2 * np.pi * f * t) + .16 * np.sin(2 * np.pi * f * 2 * t)
        return lowpass(y, 650) * np.exp(-t * 2.4) * envelope(n, .012, .16)
    if kind == 'pad':
        stereo = []
        for detune in [.998, 1.002]:
            y = np.zeros(n, dtype=np.float32)
            for h, weight in [(1, 1), (2, .29), (3, .14), (4, .065)]:
                y += np.sin(2 * np.pi * f * detune * h * t + .3 * h) * weight
            stereo.append(lowpass(y, 1500))
        return np.stack(stereo, axis=1) * envelope(n, .65, .95)[:, None]
    raise ValueError('Only electric piano, bass and chord pads are used')

def make_drums():
    t = np.arange(round(.5 * SR)) / SR
    phase = 2 * np.pi * (47 * t + 95 * .023 * (1 - np.exp(-t / .023)))
    kick = np.sin(phase) * np.exp(-t * 9)
    kick += RNG.normal(0, 1, len(t)) * np.exp(-t * 320) * .09
    kick *= envelope(len(t), .001, .025)
    t = np.arange(round(.23 * SR)) / SR
    # Quiet electronic rim click, replacing the large jazzy snare.
    noise = lowpass(RNG.normal(0, 1, len(t)).astype(np.float32), 3400)
    snare = (.42 * np.sin(2 * np.pi * 760 * t) + .17 * np.sin(2 * np.pi * 1190 * t)) * np.exp(-t * 100)
    snare += noise * .19 * np.exp(-t * 62)
    snare *= envelope(len(t), .0006, .025)
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
    (36, [52, 55, 59, 62]), (45, [55, 59, 60, 64]),
    (38, [53, 57, 60, 64]), (43, [53, 59, 64, 69]),
    (41, [57, 60, 64, 67]), (40, [55, 59, 62, 67]),
    (38, [53, 57, 60, 64]), (43, [53, 59, 64, 69]),
]
melody = [
    [(.5, 1.1, 64), (2.5, .9, 67)],
    [(0, 1.2, 64), (2.25, .8, 60), (3.25, .5, 59)],
    [(.75, .9, 65), (2.5, 1.1, 64)],
    [(.5, .8, 62), (2, 1.3, 59)],
    [(0, 1.2, 64), (2, .65, 67), (3, .65, 69)],
    [(.5, 1.2, 67), (2.5, .9, 64)],
    [(0, .8, 65), (1.5, .8, 64), (3, .75, 62)],
    [(.5, 1, 59), (2.25, 1.1, 62)],
]
sections = [(0, 8, 'Evening / intro'), (8, 24, 'Lobby groove'),
            (24, 40, 'Current / theme'), (40, 48, 'Electric piano interlude'),
            (48, 64, 'Soft reflections'), (64, 72, 'Last light / theme'),
            (72, 80, 'Goodnight / outro')]

for bar in range(BARS):
    base = bar * BAR
    root, notes = chords[bar % 8]
    theme = 24 <= bar < 40 or 64 <= bar < 72
    interlude = 40 <= bar < 48
    energy = .62 if bar < 8 or bar >= 72 else .88 if interlude else 1
    # Comping changes its rhythm across the phrases instead of repeating an arp.
    pattern = [(0, 1.4), (2.5, 1.1)] if bar % 2 == 0 else [(.5, 1.1), (2.75, .95)]
    for offset, hold in pattern:
        for j, note in enumerate(notes):
            add(voice(note, hold * BEAT + .65), base + offset * BEAT + j * .008,
                .068 * energy, -.26 + j * .1, send=.18)
    if theme or bar < 8 or bar >= 72:
        for note in [notes[0], notes[2]]:
            add(voice(note, BAR + .6, 'pad'), base, .022 * energy, send=.21)
    if 4 <= bar < 78:
        next_root = chords[(bar + 1) % 8][0]
        line = [root, root, root + 7, root + 12]
        for beat, note in zip([0, 1.5, 2.5, 3.5], line):
            add(voice(note, BEAT * .72, 'bass'), base + beat * BEAT,
                .125 * energy * (1 if beat % 2 == 0 else .83), -.04)
    if 8 <= bar < 76:
        for offset, gain in [(0, .27), (1.5, .12), (2, .22), (3.5, .09)]:
            add(kick, base + offset * BEAT, gain * energy)
        for beat in (1.03, 3.03):
            add(snare, base + beat * BEAT, .15 * energy, -.12, send=.12)
        for step in range(8):
            # An even, understated electronic lounge pulse.
            offset = step / 2
            add(hat, base + offset * BEAT, .048 * (1 if step % 2 else .62), .32)
        if bar % 4 == 3:
            add(open_hat, base + 3.5 * BEAT, .016, .3)
        if bar % 8 == 7:
            add(snare, base + 3.65 * BEAT, .055, .1, send=.1)
    if 16 <= bar < 40 or 48 <= bar < 72:
        for offset, length, note in melody[bar % 8]:
            if not theme and bar % 4 == 3 and offset > 1:
                continue
            add(voice(note, length * BEAT + .5), base + offset * BEAT,
                .078 if theme else .060, .15, send=.28)
    if interlude or 8 <= bar < 16:
        pattern = [0, 2, 1, 3, 2, 1]
        for i, j in enumerate(pattern):
            add(voice(notes[j], .72), base + (.6 + i * .5) * BEAT,
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
                'artist=Lemonomics Original Instrumental', '-metadata', 'genre=Lounge', str(master)], check=True)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-c:a', 'libmp3lame',
                '-b:a', '256k', str(OUT / 'Evening-Current-Instrumental.mp3')], check=True)
raw.unlink()
metadata = {'title': 'Evening Current', 'durationSeconds': DURATION, 'bpm': BPM,
            'key': 'C major lounge progression', 'arrangement': 'Modern elevator lounge; electric piano, warm pads, bass and light percussion; no wind lead', 'vocals': False, 'originalComposition': True,
            'sections': [{'startSeconds': a * BAR, 'endSeconds': b * BAR, 'name': name}
                         for a, b, name in sections]}
(OUT / 'track-info.json').write_text(json.dumps(metadata, indent=2))
print('Finished original 3:20 modern lounge instrumental (no wind lead).', flush=True)
