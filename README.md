# AirPods Recovery Kit

> Safe audio tests for wet, water-damaged, quiet, or distorted AirPods.

[![Live demo](https://img.shields.io/badge/live-GitHub%20Pages-14775e)](https://aryanputta.github.io/airpods-recovery-kit/)
[![Deploy GitHub Pages](https://github.com/aryanputta/airpods-recovery-kit/actions/workflows/pages.yml/badge.svg)](https://github.com/aryanputta/airpods-recovery-kit/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-17221e.svg)](LICENSE)

AirPods Recovery Kit is a one-page browser tool, macOS terminal workflow, and
Codex skill for damaged or wet AirPods, AirPods water damage, one AirPod
sounding quiet, left or right audio failing, and distorted audio after moisture
exposure.

**[Open the recovery tool →](https://aryanputta.github.io/airpods-recovery-kit/)**

> [!IMPORTANT]
> This project runs bounded audio tests. It cannot guarantee liquid removal,
> repair damaged hardware, or force a firmware update.

## Why

- **User initiated:** sound never autoplays.
- **Bounded:** gain and duration limits live in code and tests.
- **Private:** the website has no server, account, analytics, cookies, or device
  upload.
- **Inspectable:** each component is small enough to read from top to bottom.

## Safety proof

| Guard | Bound | Verification |
|---|---:|---|
| Automatic playback | `0` | Start button is disabled until two confirmations pass |
| Moisture-pulse duration | `≤ 20 seconds` | JavaScript and generated-WAV tests |
| Web Audio gain | `≤ 0.03` | Constant-bound unit test |
| Personal device data | `0 files` | Pre-publish privacy audit |
| Website data transfer | `0 requests required` | Fully static GitHub Pages site |

These are safety-contract measurements, not repair-success claims.

## Quickstart

### Website

Open the [live recovery page](https://aryanputta.github.io/airpods-recovery-kit/),
choose a moisture pulse or left/right test, complete the two safety checks, and
press the start button.

### macOS terminal

```bash
git clone https://github.com/aryanputta/airpods-recovery-kit
cd airpods-recovery-kit

# Request the current percentages macOS exposes, without printing device identity.
./skills/recover-airpods-audio/scripts/airpods-recovery.sh battery

# Verify that the selected output is an AirPods device.
./skills/recover-airpods-audio/scripts/airpods-recovery.sh diagnose

# Run only after removing both AirPods from your ears.
./skills/recover-airpods-audio/scripts/airpods-recovery.sh \
  pulse --confirm-out-of-ears

# Run only after setting system volume below 20 percent.
./skills/recover-airpods-audio/scripts/airpods-recovery.sh \
  channels --confirm-low-volume
```

The battery command prints only the available left, right, case, or overall
percentages. The route check reports only `AirPods` or `not AirPods`. Neither
prints or stores the personal Bluetooth device name or address.

Browsers cannot read AirPods battery status from macOS or iOS. The percentage
ring on the website is explicitly labeled as audio-test progress.

### Codex skill

Copy the bundled skill into your Codex skills directory:

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/recover-airpods-audio \
  "${CODEX_HOME:-$HOME/.codex}/skills/"
```

Then invoke it:

```text
Use $recover-airpods-audio to diagnose my quiet left AirPod.
```

The skill requires explicit confirmation before adding either audio-playback
flag.

## How it works

```text
symptom
   │
   ├── odd only with Noise Control ──> microphone or vent path
   ├── quiet in every mode ──────────> mesh, charge, balance, or driver path
   └── moisture suspected ───────────> bounded pulse path
                                            │
                          confirm output + safe position
                                            │
                                low-gain 165 Hz pulses
                                            │
                                  left / right comparison
                                            │
                                   result-specific next step
```

The website uses the Web Audio API. The terminal workflow generates the same
bounded PCM waveform locally, checks the macOS Core Audio route, caps system
volume, and plays it with `afplay`.

## When to stop testing

Stop and seek hardware service when:

- an AirPod becomes warm,
- sharp rattling continues,
- the battery or entire bud repeatedly disappears,
- distortion remains after drying,
- or the sound causes discomfort.

Never use heat, compressed air, sharp tools, or added liquid.

## Repository layout

```text
site/
  index.html           one-page recovery interface
  app.js               UI state and result flow
  audio-engine.js      bounded Web Audio schedules
  safety.js            playback preflight
skills/
  recover-airpods-audio/
    SKILL.md            Codex operating procedure
    scripts/            macOS route check and WAV generator
    references/         safety boundary
tests/                  browser-contract and WAV tests
scripts/audit-public.sh privacy and validation gate
```

## Validate locally

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
./scripts/audit-public.sh
```

## Privacy boundary

The audit rejects:

- absolute user home paths,
- Bluetooth MAC addresses,
- pairing databases and preference files,
- common GitHub, cloud, and private-key credential patterns,
- `.env`, plist, mobile configuration, and credential files.

## Limitations

- Browsers cannot reliably verify the operating-system output device across
  every platform. The web flow therefore requires manual output confirmation.
- The terminal route check currently supports macOS.
- The pulse is an experimental recovery attempt, not a substitute for drying or
  hardware repair.
- AirPods firmware updates remain controlled by Apple devices.

## Updates

- **2026-07-25:** Added the one-page browser tool, animated recovery state,
  macOS route guard, Codex skill, privacy audit, and bounded waveform tests.

## License

[MIT](LICENSE)

AirPods is a trademark of Apple Inc. This independent project is not affiliated
with or endorsed by Apple.
