#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
MODE="${1:-diagnose}"
CONFIRMATION="${2:-}"
RECOVERY_CACHE="${TMPDIR:-/tmp}/airpods-recovery-kit"
ORIGINAL_VOLUME=""
VOLUME_WAS_CAPPED=false

restore_output_volume() {
  if [[ "$VOLUME_WAS_CAPPED" == true && "$ORIGINAL_VOLUME" == <-> ]]; then
    osascript -e "set volume output volume $ORIGINAL_VOLUME" \
      >/dev/null 2>&1 || true
    VOLUME_WAS_CAPPED=false
  fi
}

prepare_output_volume() {
  local current_volume
  if ! current_volume="$(
    osascript -e 'output volume of (get volume settings)'
  )"; then
    print -u2 "Could not read the current output volume. Refusing playback."
    exit 2
  fi
  if [[ "$current_volume" != <-> ]] || (( current_volume > 100 )); then
    print -u2 "macOS returned an invalid output volume. Refusing playback."
    exit 2
  fi

  ORIGINAL_VOLUME="$current_volume"
  if (( current_volume > 12 )); then
    VOLUME_WAS_CAPPED=true
    trap restore_output_volume EXIT
    osascript -e 'set volume output volume 12' >/dev/null
    print "Output volume temporarily capped at 12 percent."
  else
    print "Output volume left at $current_volume percent."
  fi
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  print -u2 "The terminal workflow currently supports macOS only."
  exit 2
fi

if [[ "$MODE" == "battery" ]]; then
  if ! command -v python3 >/dev/null 2>&1; then
    print -u2 "Missing required command: python3"
    exit 2
  fi
  python3 "$SCRIPT_DIR/battery_check.py"
  exit $?
fi

case "$MODE" in
  diagnose|pulse|channels) ;;
  *)
    print -u2 "Usage: $0 {diagnose|battery|pulse|channels} [confirmation]"
    exit 2
    ;;
esac

for required_command in swift python3 afplay osascript; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    print -u2 "Missing required command: $required_command"
    exit 2
  fi
done

mkdir -p "$RECOVERY_CACHE"

route_status=0
if swift \
  -module-cache-path "$RECOVERY_CACHE/swift-cache" \
  "$SCRIPT_DIR/route_check.swift" >/dev/null 2>&1; then
  route_status=0
else
  route_status=$?
fi

case "$route_status" in
  0) ;;
  2)
    print -u2 "Could not read the selected audio output. Refusing playback."
    exit 3
    ;;
  3)
    print -u2 "The selected audio output is not verified as AirPods."
    exit 3
    ;;
  *)
    print -u2 "The AirPods route check could not run. Refusing playback."
    exit 3
    ;;
esac

case "$MODE" in
  diagnose)
    print "AirPods output verified."
    print "Battery snapshot:"
    printf '  %q battery\n' "$0"
    print "Moisture pulse:"
    printf '  %q pulse --confirm-out-of-ears\n' "$0"
    print "Left/right test:"
    printf '  %q channels --confirm-low-volume\n' "$0"
    ;;
  pulse)
    if [[ "$CONFIRMATION" != "--confirm-out-of-ears" ]]; then
      print -u2 "Let both AirPods dry completely for at least two hours."
      print -u2 "Then remove them from your ears and place the meshes downward."
      print -u2 "Then rerun with --confirm-out-of-ears."
      exit 2
    fi
    python3 "$SCRIPT_DIR/generate_audio.py" \
      pulse "$RECOVERY_CACHE/moisture-pulse.wav" >/dev/null
    prepare_output_volume
    print "Playing one bounded 20-second pulse after the required drying period."
    print "Keep both AirPods out of your ears."
    /usr/bin/afplay "$RECOVERY_CACHE/moisture-pulse.wav"
    restore_output_volume
    print "Pulse complete. Leave the AirPods facing downward before retesting."
    ;;
  channels)
    if [[ "$CONFIRMATION" != "--confirm-low-volume" ]]; then
      print -u2 "Set system volume below 20 percent."
      print -u2 "Then rerun with --confirm-low-volume."
      exit 2
    fi
    python3 "$SCRIPT_DIR/generate_audio.py" \
      channels "$RECOVERY_CACHE/left-right.wav" >/dev/null
    prepare_output_volume
    print "LEFT tone, short pause, then RIGHT tone."
    /usr/bin/afplay "$RECOVERY_CACHE/left-right.wav"
    restore_output_volume
    print "Channel test complete."
    ;;
esac
