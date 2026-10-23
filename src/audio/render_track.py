"""Render Afterglow Drive, an original instrumental synthwave arrangement.

No vocals, sampled recordings, artist performances, network calls, or music-service
dependencies. Requires numpy, scipy and ffmpeg. All notes and sounds are defined
here, so another Codex session can edit the composition and regenerate it.
"""
from pathlib import Path
import json
import subprocess
import wave

import numpy as np
from scipy.signal import butter, sosfilt

OUT = Path(__file__).resolve().parent
SR = 44100
BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 80
DURATION = BARS * BAR
RNG = np.random.default_rng(38273)
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


def analog(note, seconds, kind='pad', phase_offset=0):
    n = round(seconds * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = hz(note)
    if kind == 'pad':
        stereo = []
        for cents in [-6, 6]:
            f0 = f * 2 ** (cents / 1200)
            y = np.zeros(n, dtype=np.float32)
            for h in range(1, min(17, int(6500 / f0))):
                weight = np.exp(-h * f0 / 1600) / h
                y += np.sin(2 * np.pi * f0 * h * t + phase_offset + h * .31) * weight
            y = lowpass(y, 2500)
            y *= envelope(n, .38, .85)
            stereo.append(y)
        return np.stack(stereo, axis=1)
    if kind == 'bass':
        y = .8 * np.sin(2 * np.pi * f * t)
        for h in range(2, 9):
            y += np.sin(2 * np.pi * f * h * t) * .38 / h
        y = lowpass(y, 850)
        y *= envelope(n, .008, .095) * (.65 + .35 * np.exp(-t * 12))
        return y
    if kind == 'arp':
        y = np.sin(2 * np.pi * f * t)
        y += .27 * np.sin(2 * np.pi * f * 2.003 * t)
        y += .09 * np.sin(2 * np.pi * f * 3 * t)
        return y * np.exp(-t * 10) * envelope(n, .006, .13)
    # Portamento and vibrato give the lead a sustained, expressive synth voice.
    vibrato = .0023 * np.sin(2 * np.pi * 5.1 * t) * np.minimum(t * 4, 1)
    phase = 2 * np.pi * np.cumsum(f * (1 + vibrato - .025 * np.exp(-t * 25))) / SR
    y = np.sin(phase) + .3 * np.sin(phase * 2) + .13 * np.sin(phase * 3)
    y += .11 * np.sin(phase * 1.004 + .2)
    return lowpass(y, 3800) * envelope(n, .035, min(.22, seconds / 3))


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
chords = [(40, [55, 59, 62, 66]), (36, [55, 59, 60, 64]),
          (43, [55, 59, 62, 69]), (38, [57, 62, 64, 66])]
bridge = [(45, [57, 60, 64, 67]), chords[1], chords[0], chords[3]]
sections = [(0, 8, 'Dusk / intro'), (8, 24, 'Open road'), (24, 40, 'Afterglow / chorus'),
            (40, 48, 'Skyline / breakdown'), (48, 56, 'Return'),
            (56, 72, 'Afterglow / final chorus'), (72, 80, 'Dawn / outro')]
# Original eight-bar melody; offsets and lengths are in beats within each bar.
motifs = [
    [(0, 1.4, 71), (1.5, .45, 74), (2, .9, 76), (3, .75, 74)],
    [(0, 1.8, 72), (2, .8, 71), (3, .8, 67)],
    [(.5, .8, 71), (1.5, .4, 74), (2, 1.6, 79)],
    [(0, .8, 78), (1, .8, 76), (2, 1.7, 74)],
    [(0, .8, 76), (1, .4, 78), (1.5, .4, 79), (2, 1.7, 83)],
    [(.5, 1.1, 79), (2, .8, 76), (3, .8, 72)],
    [(0, .8, 74), (1, .8, 71), (2, .4, 69), (2.5, .4, 71), (3, .7, 74)],
    [(0, 2.4, 78), (2.5, .4, 76), (3, .7, 74)],
]

for bar in range(BARS):
    base = bar * BAR
    chorus = 24 <= bar < 40 or 56 <= bar < 72
    breakdown = 40 <= bar < 48
    outro = bar >= 72
    root, voices = (bridge if breakdown else chords)[bar % 4]
    energy = .62 if bar < 8 or outro else .5 if breakdown else 1.15 if chorus else .88
    # Broad pads with gentle stereo detuning and a higher chorus voicing.
    for note in voices:
        add(analog(note, BAR + .85, 'pad', bar * .37), base, .030 * energy, send=.24)
    if chorus:
        add(analog(voices[-1] + 12, BAR + .5, 'pad'), base, .015, send=.35)
    bass_active = 4 <= bar < 76 and not breakdown
    if bass_active:
        for step in range(8):
            octave = 12 if step in (3, 7) else 0
            add(analog(root + octave, .25, 'bass'), base + step * BEAT / 2,
                (.135 if chorus else .115) * (1 if step % 2 else .85))
    elif breakdown or 2 <= bar < 4:
        add(analog(root, BAR * .85, 'bass'), base, .055)
    if 2 <= bar < 78:
        pattern = [0, 2, 1, 3, 2, 1, 3, 2] if bar % 8 < 4 else [0, 1, 3, 2, 1, 2, 3, 1]
        steps = 16 if chorus else 8
        for step in range(steps):
            note = voices[pattern[step % 8]] + 12
            add(analog(note, .42, 'arp'), base + step * BAR / steps,
                .032 * energy * (1 if step % 2 == 0 else .74),
                -.4 if step % 2 else .4, send=.45)
    drums_active = 8 <= bar < 76 and not breakdown
    if drums_active:
        for beat in range(4):
            add(kick, base + beat * BEAT, .43 if chorus else .38)
            if beat in (1, 3):
                add(snare, base + beat * BEAT, .25 if chorus else .21, -.04, send=.13)
        for step in range(8):
            add(hat, base + step * BEAT / 2, .065 * (1 if step % 2 else .6), .3)
        if chorus or bar % 4 == 3:
            for step in (1, 3, 5, 7):
                add(open_hat, base + step * BEAT / 2, .036, -.25)
        if bar % 8 == 7:
            for offset, gain in [(3.25, .065), (3.5, .10), (3.75, .13)]:
                add(snare, base + offset * BEAT, gain, .12, send=.15)
    elif 4 <= bar < 8 or 44 <= bar < 48:
        for beat in (0, 2):
            add(kick, base + beat * BEAT, .21)
        for step in range(8):
            add(hat, base + step * BEAT / 2, .035, .2)
    if bar in (8, 24, 32, 48, 56, 64, 72):
        add(crash, base, .085, -.3, send=.22)
    # Sparse first verse; full melodic chorus, followed by a final high harmony.
    melodic = chorus or 16 <= bar < 24 or 48 <= bar < 56
    if melodic:
        phrase = motifs[(bar - (24 if chorus and bar < 40 else 56 if chorus else 16)) % 8]
        for offset, length, note in phrase:
            if not chorus and offset not in (0, .5, 2):
                continue
            add(analog(note, length * BEAT + .13, 'lead'), base + offset * BEAT,
                .093 if chorus else .056, -.08, send=.46)
            if 64 <= bar < 72 and length > .8:
                add(analog(note - 12, length * BEAT + .12, 'lead'), base + offset * BEAT,
                    .027, .25, send=.43)
    if breakdown and bar % 2 == 0:
        add(analog(voices[-1] + 12, BAR * 1.7, 'lead'), base + BEAT, .035, .15, send=.68)
    if bar % 8 == 0:
        print(f'Rendered bar {bar + 1}/{BARS}', flush=True)

# Stereo dotted-eighth echoes and a diffuse synthetic room, all from this score.
for seconds, gain, swap in [(.45, .36, True), (.9, .22, False), (1.35, .13, True),
                             (.071, .11, False), (.113, .09, True), (.179, .06, False)]:
    delay = round(seconds * SR)
    src = echo[:-delay, ::-1] if swap else echo[:-delay]
    mix[delay:] += src * gain

# Soft master saturation, subsonic filtering and gentle fade; no abrupt loop cut.
for channel in range(2):
    mix[:, channel] = highpass(mix[:, channel], 27)
mix = np.tanh(mix * 1.35)
mix *= .89 / np.max(np.abs(mix))
fade_in = round(2 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in, dtype=np.float32)[:, None]
start = round((DURATION - 8) * SR)
mix[start:] *= np.linspace(1, 0, len(mix) - start, dtype=np.float32)[:, None] ** 1.5
mix = mix[:round(DURATION * SR)]
raw = OUT / 'afterglow-drive-premaster.wav'
with wave.open(str(raw), 'wb') as wav:
    wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(SR)
    wav.writeframes((mix * 32767).astype('<i2').tobytes())

common = ['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-af', 'loudnorm=I=-16:TP=-1.2:LRA=10',
          '-ar', str(SR), '-metadata', 'title=Afterglow Drive', '-metadata',
          'artist=Lemonomics Original Instrumental', '-metadata', 'genre=Synthwave']
subprocess.run(common + ['-c:a', 'pcm_s24le', str(OUT / 'Afterglow-Drive-Instrumental.wav')], check=True)
subprocess.run(common + ['-c:a', 'libmp3lame', '-b:a', '256k', str(OUT / 'Afterglow-Drive-Instrumental.mp3')], check=True)
raw.unlink()
metadata = {'title': 'Afterglow Drive', 'durationSeconds': DURATION, 'bpm': BPM,
            'key': 'E minor', 'vocals': False, 'originalComposition': True,
            'sections': [{'startSeconds': a * BAR, 'endSeconds': b * BAR, 'name': name}
                         for a, b, name in sections]}
(OUT / 'track-info.json').write_text(json.dumps(metadata, indent=2))
print('Finished original 3:12 stereo instrumental.', flush=True)
