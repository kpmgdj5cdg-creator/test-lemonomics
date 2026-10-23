"""Regenerate original Neon Nights vocoder vocals; requires ffmpeg/flite, numpy, scipy.

Not part of the application build: the generated Opus clip is embedded in JS so
downloaded single-file games work without requests, accounts, or audio services.
All lyrics and the carrier melody below are original.
"""
import base64
import pathlib
import subprocess
import tempfile
import wave

import numpy as np
from scipy.signal import butter, resample, sosfilt

ROOT = pathlib.Path(__file__).resolve().parents[1]
RATE = 24000
BPM = 100
BEAT = 60 / BPM
LYRICS = ["Stay in the light", "We are alive", "Ride through the night", "We shine so bright"]
MELODIES = [[64, 67, 69, 67, 64, 64], [65, 69, 72, 69, 67, 65],
            [64, 67, 72, 71, 67, 64], [62, 67, 71, 69, 67, 67]]
song = np.zeros(round(32 * BEAT * RATE))

with tempfile.TemporaryDirectory() as tmp:
    for line, (lyric, notes) in enumerate(zip(LYRICS, MELODIES)):
        path = pathlib.Path(tmp) / f"line-{line}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i",
                        f"flite=text='{lyric}':voice=slt", "-ar", str(RATE), str(path)], check=True)
        with wave.open(str(path)) as wav:
            voice = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(float) / 32768
        # Fit each original phrase to six eighth-note pairs and retain consonants.
        voice = resample(voice, round(3.6 * RATE))
        t = np.arange(len(voice)) / RATE
        midi = np.array(notes)[np.minimum(5, (t / BEAT).astype(int))]
        pitch = 440 * 2 ** ((midi - 69) / 12)
        phase = 2 * np.pi * np.cumsum(pitch) / RATE
        carrier = sum(np.sin(phase * h) / h for h in range(1, 36))
        wet = np.zeros_like(voice)
        bands = np.geomspace(100, 9000, 25)
        lowpass = butter(2, 35, fs=RATE, output='sos')
        for low, high in zip(bands[:-1], bands[1:]):
            band = butter(2, [low, high], btype='bandpass', fs=RATE, output='sos')
            envelope = sosfilt(lowpass, abs(sosfilt(band, voice)))
            wet += sosfilt(band, carrier) * envelope
        wet *= np.sqrt(np.mean(voice**2) / max(1e-12, np.mean(wet**2)))
        vocal = wet * .82 + voice * .18
        # Gentle stereo-ready echo tail is in the clip; the game adds the synth bed.
        tail = np.zeros(len(vocal) + round(BEAT * RATE))
        tail[:len(vocal)] = vocal
        for delay, gain in [(BEAT / 2, .18), (BEAT, .1)]:
            offset = round(delay * RATE)
            tail[offset:offset + len(vocal)] += vocal * gain
        fade = round(.025 * RATE)
        tail[:fade] *= np.linspace(0, 1, fade)
        tail[-fade:] *= np.linspace(1, 0, fade)
        start = round((line * 8 * BEAT + .3) * RATE)
        song[start:start + len(tail)] += tail[:len(song) - start]
    song *= .82 / max(abs(song))
    wav_path = pathlib.Path(tmp) / 'neon-nights.wav'
    with wave.open(str(wav_path), 'wb') as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(RATE)
        wav.writeframes((song * 32767).astype('<i2').tobytes())
    opus_path = pathlib.Path(tmp) / 'neon-nights.ogg'
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wav_path), '-c:a', 'libopus',
                    '-b:a', '40k', str(opus_path)], check=True)
    encoded = base64.b64encode(opus_path.read_bytes()).decode()
    output = ('// Original generated vocoder performance. See scripts/generate-radio-vocals.py.\n'
              'export const NEON_LYRICS = "Stay in the light / We are alive / Ride through the night / We shine so bright";\n'
              f'export const NEON_VOCALS = "{encoded}";\n')
    (ROOT / 'src/radio-vocals.js').write_text(output)
    print(f'Embedded {len(opus_path.read_bytes()):,} bytes of original vocals (19.2 seconds).')
