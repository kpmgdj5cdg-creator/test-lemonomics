# Afterglow Drive

Original 3:12 instrumental synthwave composition, 100 BPM, E minor, without vocals.
`afterglow-drive.mp3` is the full 256 kbps stereo song, not a short excerpt.

The hosted game fetches this bundled same-origin asset once when station two is
first selected and reuses its decoded buffer. The standalone build embeds it as
a data URL for offline playback. No music provider or external audio service is
used. The track repeats in full, preserving its intro and fade-out. Muting or
switching stations stops it; a hidden game or dialog pauses and resumes its position.

`render_track.py` contains the editable original score and synthesized instruments.
Optional regeneration needs Python, numpy, scipy and ffmpeg. Run it in this folder
and copy its generated `Afterglow-Drive-Instrumental.mp3` to `afterglow-drive.mp3`.
Normal game builds require only the existing Node dependencies.

## Evening Current

`evening-current.mp3` is a second full original instrumental: 3:20, 96 BPM,
electric piano, bass, reed-like synthesizer, and lightly swung drums. It plays on
Velvet Jazz after Neon Nights. `render_jazz.py` is the editable score and synthesis
source. Run it optionally and copy `Evening-Current-Instrumental.mp3` to
`evening-current.mp3`. `jazz-track-info.json` lists the arrangement sections.
