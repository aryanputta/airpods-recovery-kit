#!/usr/bin/env python3
"""Read connected AirPods battery percentages without exposing device identity."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections.abc import Iterator
from typing import Any

SYSTEM_PROFILER = "/usr/sbin/system_profiler"
BATTERY_LABELS = ("left", "right", "case", "overall")


def parse_percent(value: Any) -> int | None:
    """Return a bounded percentage from a macOS profiler value."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        percent = int(value)
    elif isinstance(value, str):
        match = re.search(r"(?<!\d)(\d{1,3})(?:\s*%)?", value)
        if match is None:
            return None
        percent = int(match.group(1))
    else:
        return None
    return percent if 0 <= percent <= 100 else None


def iter_connected_airpods(
    node: Any,
    *,
    connected: bool = False,
) -> Iterator[dict[str, Any]]:
    """Yield only AirPods payloads found inside connected-device sections."""
    if isinstance(node, list):
        for item in node:
            yield from iter_connected_airpods(item, connected=connected)
        return

    if not isinstance(node, dict):
        return

    for key, value in node.items():
        normalized_key = key.casefold().replace(" ", "_")
        child_connected = connected
        if "device_not_connected" in normalized_key:
            child_connected = False
        elif "device_connected" in normalized_key:
            child_connected = True

        if (
            child_connected
            and "airpods" in normalized_key
            and isinstance(value, dict)
        ):
            yield value

        yield from iter_connected_airpods(value, connected=child_connected)


def iter_fields(node: Any) -> Iterator[tuple[str, Any]]:
    if isinstance(node, list):
        for item in node:
            yield from iter_fields(item)
    elif isinstance(node, dict):
        for key, value in node.items():
            yield key, value
            yield from iter_fields(value)


def extract_battery(payload: dict[str, Any]) -> dict[str, int]:
    """Map Apple's profiler battery fields to anonymous component labels."""
    result: dict[str, int] = {}
    for key, value in iter_fields(payload):
        normalized_key = re.sub(r"[^a-z]", "", key.casefold())
        if "battery" not in normalized_key:
            continue

        label = "overall"
        for component in ("left", "right", "case"):
            if component in normalized_key:
                label = component
                break

        percent = parse_percent(value)
        if percent is not None:
            result[label] = percent
    return result


def find_airpods_battery(data: Any) -> dict[str, int]:
    """Return the first connected AirPods battery payload with usable values."""
    for payload in iter_connected_airpods(data):
        battery = extract_battery(payload)
        if battery:
            return battery
    return {}


def render_battery(battery: dict[str, int]) -> str:
    """Render only anonymous component percentages."""
    lines = ["AirPods battery snapshot"]
    for label in BATTERY_LABELS:
        if label in battery:
            lines.append(f"{label.title()}: {battery[label]}%")
    return "\n".join(lines)


def load_profiler_data() -> Any:
    completed = subprocess.run(
        [SYSTEM_PROFILER, "SPBluetoothDataType", "-json"],
        check=True,
        capture_output=True,
        text=True,
        timeout=20,
    )
    return json.loads(completed.stdout)


def main() -> int:
    try:
        battery = find_airpods_battery(load_profiler_data())
    except (FileNotFoundError, json.JSONDecodeError, subprocess.SubprocessError):
        print(
            "Battery status is unavailable from macOS right now.",
            file=sys.stderr,
        )
        return 4

    if not battery:
        print(
            "macOS did not expose AirPods battery percentages. "
            "Check Control Center > Bluetooth.",
            file=sys.stderr,
        )
        return 4

    print(render_battery(battery))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
