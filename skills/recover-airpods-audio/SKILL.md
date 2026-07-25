---
name: recover-airpods-audio
description: Diagnose wet, quiet, one-sided, crackling, or distorted AirPods with a safety-first browser or macOS workflow. Use when a user reports possible moisture, one AirPod not working, uneven left/right volume, strange noise-control behavior, or wants a bounded recovery tone and channel test without exposing Bluetooth identifiers.
---

# Recover AirPods Audio

## Overview

Guide a user through symptom isolation before attempting any sound playback.
Treat the workflow as diagnosis and a cautious recovery attempt, not a guaranteed
hardware repair.

## Prerequisites

1. Read [references/safety.md](references/safety.md).
2. Confirm which device currently owns the AirPods connection.
3. Require the user to remove both AirPods from their ears before a recovery
   tone.
4. Require an explicit user action before playback.
5. On macOS, use `scripts/airpods-recovery.sh` so the selected output is checked
   without printing or storing its personal device name.

## Procedure

1. Collect the symptom: wet, quiet, silent, distorted, intermittent, or strange
   only during noise control.
2. Check charging and whether both buds are detected.
3. Disable noise control temporarily to distinguish a speaker problem from an
   ANC or transparency microphone problem.
4. Run the left/right channel test before a moisture pulse.
5. Run a bounded pulse only after the safety preflight passes.
6. Re-run the channel test and compare the result.
7. Recommend hardware service when distortion persists, the device becomes
   warm, the battery is missing, or sharp rattling continues.

## macOS commands

Inspect the selected output without playing sound:

```bash
./scripts/airpods-recovery.sh diagnose
```

After the user explicitly confirms both AirPods are out of their ears:

```bash
./scripts/airpods-recovery.sh pulse --confirm-out-of-ears
```

After the pulse and after the user sets system volume below 20 percent:

```bash
./scripts/airpods-recovery.sh channels --confirm-low-volume
```

Do not add either confirmation flag until the user has made the corresponding
confirmation in the current conversation.

## Blocked behavior

- Never autoplay sound.
- Never play before the user confirms the output.
- Never instruct the user to wear the AirPods during a recovery pulse.
- Never expose or store Bluetooth addresses, pairing records, environment
  variables, usernames, or credentials.
- Never claim that a tone removes all liquid or repairs hardware damage.
- Never use heat, compressed air, sharp tools, or added liquid.
- Never modify Bluetooth pairing databases, preferences, or firmware.

## Verification

- Verify both safety confirmations before enabling playback.
- Verify the tone has fixed gain and duration limits.
- Verify no personal device name is committed.
- Verify the left/right test runs before and after the attempt.
- Run the repository privacy audit before publishing any changes.
