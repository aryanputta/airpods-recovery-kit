import importlib.util
import unittest
from pathlib import Path

SCRIPT_PATH = (
    Path(__file__).parent.parent
    / "skills"
    / "recover-airpods-audio"
    / "scripts"
    / "battery_check.py"
)
SPEC = importlib.util.spec_from_file_location("battery_check", SCRIPT_PATH)
assert SPEC and SPEC.loader
battery_check = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(battery_check)


class BatteryCheckTests(unittest.TestCase):
    def test_reads_only_connected_airpods_percentages(self) -> None:
        profiler_data = {
            "SPBluetoothDataType": [
                {
                    "device_connected": [
                        {
                            "Example AirPods Pro": {
                                "device_address": "redacted",
                                "device_batteryLevelLeft": "84%",
                                "device_batteryLevelRight": "79%",
                                "device_batteryLevelCase": "61%",
                                "device_batteryStatus": 1,
                                "nested": {
                                    "Cached AirPods": {
                                        "device_batteryLevelLeft": "9%",
                                    }
                                },
                            }
                        }
                    ],
                    "device_not_connected": [
                        {
                            "Old AirPods": {
                                "device_batteryLevelLeft": "12%",
                            }
                        }
                    ],
                }
            ]
        }

        self.assertEqual(
            battery_check.find_airpods_battery(profiler_data),
            {"left": 84, "right": 79, "case": 61},
        )

    def test_rejects_out_of_range_values(self) -> None:
        self.assertIsNone(battery_check.parse_percent("unknown"))
        self.assertIsNone(battery_check.parse_percent("101%"))
        self.assertIsNone(battery_check.parse_percent("AirPods Pro 2"))
        self.assertIsNone(battery_check.parse_percent("iOS 18 100%"))
        self.assertIsNone(battery_check.parse_percent("84"))
        self.assertEqual(battery_check.parse_percent("0%"), 0)
        self.assertEqual(battery_check.parse_percent(100), 100)

    def test_render_never_includes_device_identity(self) -> None:
        rendered = battery_check.render_battery(
            {"left": 84, "right": 79, "case": 61}
        )

        self.assertEqual(
            rendered,
            "AirPods battery snapshot\nLeft: 84%\nRight: 79%\nCase: 61%",
        )
