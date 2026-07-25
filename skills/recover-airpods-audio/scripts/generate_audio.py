#!/usr/bin/env python3

import argparse
import math
import sys
import wave
from array import array
from pathlib import Path

SAMPLE_RATE = 44_100
MOISTURE_DURATION_SECONDS = 20.0
MOISTURE_FREQUENCY_HZ = 165.0
MOISTURE_AMPLITUDE = 0.025
CHANNEL_FREQUENCY_HZ = 660.0
CHANNEL_AMPLITUDE = 0.02
CHANNEL_TONE_SECONDS = 1.5
CHANNEL_GAP_SECONDS = 0.75
RAMP_SECONDS = 0.018


def _ramp(position: float, duration: float) -> float:
    attack = min(position / RAMP_SECONDS, 1.0)
    release = min((duration - position) / RAMP_SECONDS, 1.0)
    return max(0.0, min(attack, release))


def _sample(frequency: float, time_seconds: float, amplitude: float) -> int:
    value = amplitude * math.sin(2.0 * math.pi * frequency * time_seconds)
    return round(value * 32_767)


def _append_stereo(frames: array, left: int, right: int) -> None:
    frames.append(left)
    frames.append(right)


def build_moisture_frames() -> array:
    frames = array("h")
    frame_count = round(MOISTURE_DURATION_SECONDS * SAMPLE_RATE)
    on_seconds = 0.34
    cycle_seconds = 0.5

    for frame in range(frame_count):
        time_seconds = frame / SAMPLE_RATE
        cycle_position = time_seconds % cycle_seconds
        if cycle_position >= on_seconds:
            value = 0
        else:
            envelope = _ramp(cycle_position, on_seconds)
            value = _sample(
                MOISTURE_FREQUENCY_HZ,
                time_seconds,
                MOISTURE_AMPLITUDE * envelope,
            )
        _append_stereo(frames, value, value)

    return frames


def build_channel_frames() -> array:
    frames = array("h")
    right_start = CHANNEL_TONE_SECONDS + CHANNEL_GAP_SECONDS
    duration_seconds = right_start + CHANNEL_TONE_SECONDS
    frame_count = round(duration_seconds * SAMPLE_RATE)

    for frame in range(frame_count):
        time_seconds = frame / SAMPLE_RATE
        left = 0
        right = 0

        if time_seconds < CHANNEL_TONE_SECONDS:
            envelope = _ramp(time_seconds, CHANNEL_TONE_SECONDS)
            left = _sample(
                CHANNEL_FREQUENCY_HZ,
                time_seconds,
                CHANNEL_AMPLITUDE * envelope,
            )
        elif right_start <= time_seconds < duration_seconds:
            position = time_seconds - right_start
            envelope = _ramp(position, CHANNEL_TONE_SECONDS)
            right = _sample(
                CHANNEL_FREQUENCY_HZ,
                position,
                CHANNEL_AMPLITUDE * envelope,
            )

        _append_stereo(frames, left, right)

    return frames


def write_wave(path: Path, frames: array) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    output_frames = array("h", frames)
    if sys.byteorder == "big":
        output_frames.byteswap()

    with wave.open(str(path), "wb") as audio_file:
        audio_file.setnchannels(2)
        audio_file.setsampwidth(2)
        audio_file.setframerate(SAMPLE_RATE)
        audio_file.writeframes(output_frames.tobytes())


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate bounded AirPods recovery test audio."
    )
    parser.add_argument("kind", choices=("pulse", "channels"))
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    frames = (
        build_moisture_frames()
        if args.kind == "pulse"
        else build_channel_frames()
    )
    write_wave(args.output, frames)
    print(args.output)


if __name__ == "__main__":
    main()
