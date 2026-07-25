import importlib.util
import sys
import tempfile
import unittest
import wave
from array import array
from pathlib import Path

SCRIPT_PATH = (
    Path(__file__).parent.parent
    / "skills"
    / "recover-airpods-audio"
    / "scripts"
    / "generate_audio.py"
)
SPEC = importlib.util.spec_from_file_location("generate_audio", SCRIPT_PATH)
assert SPEC and SPEC.loader
generate_audio = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generate_audio)


def read_samples(path: Path) -> tuple[wave._wave_params, array]:
    with wave.open(str(path), "rb") as audio_file:
        params = audio_file.getparams()
        samples = array("h")
        samples.frombytes(audio_file.readframes(params.nframes))
    if sys.byteorder == "big":
        samples.byteswap()
    return params, samples


class GenerateAudioTests(unittest.TestCase):
    def test_moisture_wave_is_stereo_bounded_and_twenty_seconds(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "pulse.wav"
            generate_audio.write_wave(
                output,
                generate_audio.build_moisture_frames(),
            )
            params, samples = read_samples(output)

        self.assertEqual(params.nchannels, 2)
        self.assertEqual(params.framerate, generate_audio.SAMPLE_RATE)
        self.assertEqual(
            params.nframes,
            round(
                generate_audio.MOISTURE_DURATION_SECONDS
                * generate_audio.SAMPLE_RATE
            ),
        )
        self.assertLessEqual(
            max(abs(sample) for sample in samples),
            round(generate_audio.MOISTURE_AMPLITUDE * 32_767),
        )

    def test_channel_wave_isolated_left_then_right(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "channels.wav"
            generate_audio.write_wave(
                output,
                generate_audio.build_channel_frames(),
            )
            params, samples = read_samples(output)

        left = samples[0::2]
        right = samples[1::2]
        left_end = round(
            generate_audio.CHANNEL_TONE_SECONDS * generate_audio.SAMPLE_RATE
        )
        right_start = round(
            (
                generate_audio.CHANNEL_TONE_SECONDS
                + generate_audio.CHANNEL_GAP_SECONDS
            )
            * generate_audio.SAMPLE_RATE
        )

        self.assertGreater(max(abs(sample) for sample in left[:left_end]), 0)
        self.assertEqual(max(abs(sample) for sample in right[:left_end]), 0)
        self.assertEqual(max(abs(sample) for sample in left[right_start:]), 0)
        self.assertGreater(max(abs(sample) for sample in right[right_start:]), 0)
        self.assertLessEqual(
            max(abs(sample) for sample in samples),
            round(generate_audio.CHANNEL_AMPLITUDE * 32_767),
        )


if __name__ == "__main__":
    unittest.main()
