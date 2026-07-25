#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="${0:A:h}"
MODE="${1:-diagnose}"
CONFIRMATION="${2:-}"
RECOVERY_CACHE="${TMPDIR:-/tmp}/airpods-recovery-kit"

if [[ "$(uname -s)" != "Darwin" ]]; then
  print -u2 "The terminal workflow currently supports macOS only."
  exit 2
fi

for required_command in swift python3 afplay osascript; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    print -u2 "Missing required command: $required_command"
    exit 2
  fi
done

if ! swift \
  -module-cache-path "$RECOVERY_CACHE/swift-cache" \
  "$SCRIPT_DIR/route_check.swift" >/dev/null; then
  print -u2 "Refusing to play because the selected output is not verified as AirPods."
  exit 3
fi

mkdir -p "$RECOVERY_CACHE"

case "$MODE" in
  diagnose)
    print "AirPods output verified."
    print "Moisture pulse:"
    print "  $0 pulse --confirm-out-of-ears"
    print "Left/right test:"
    print "  $0 channels --confirm-low-volume"
    ;;
  pulse)
    if [[ "$CONFIRMATION" != "--confirm-out-of-ears" ]]; then
      print -u2 "Remove both AirPods from your ears and place the meshes downward."
      print -u2 "Then rerun with --confirm-out-of-ears."
      exit 2
    fi
    python3 "$SCRIPT_DIR/generate_audio.py" \
      pulse "$RECOVERY_CACHE/moisture-pulse.wav" >/dev/null
    osascript -e 'set volume output volume 12'
    print "Playing one bounded 20-second pulse. Keep AirPods out of your ears."
    /usr/bin/afplay "$RECOVERY_CACHE/moisture-pulse.wav"
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
    osascript -e 'set volume output volume 12'
    print "LEFT tone, short pause, then RIGHT tone."
    /usr/bin/afplay "$RECOVERY_CACHE/left-right.wav"
    print "Channel test complete."
    ;;
  *)
    print -u2 "Usage: $0 {diagnose|pulse|channels} [confirmation]"
    exit 2
    ;;
esac
