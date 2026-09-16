import unittest

from scripts.sync_fia_entries import find_event_id, parse_race_entries, team_from_segment


class FiaEntrySyncTests(unittest.TestCase):
    def test_matches_calendar_and_fia_event_names(self):
        events = {
            "italian grand prix": "60309",
            "dutch grand prix": "60200",
        }
        self.assertEqual(find_event_id("Italian Grand Prix", events), "60309")
        self.assertEqual(find_event_id("Formula 1 Italian Grand Prix", events), "60309")

    def test_excludes_fp1_only_drivers_and_reads_team_swaps(self):
        text = """
        No. TLA Driver Nat Team Constructor
        3 VER Max Verstappen NED Oracle Red Bull Racing
        30 LAW Liam Lawson NZL Oracle Red Bull Racing
        41 LIN Arvid Lindblad GBR Visa Cash App Racing Bulls
        22 TSU Yuki Tsunoda JPN Visa Cash App Racing Bulls
        In addition to the list of cars and drivers eligible to take part in the event
        6 HAD Isack Hadjar FRA may also take part in FP1
        """
        known = [
            {"driverId": "3", "code": "VER", "driverName": "Max Verstappen", "team": "Red Bull Racing"},
            {"driverId": "30", "code": "LAW", "driverName": "Liam Lawson", "team": "Racing Bulls"},
            {"driverId": "41", "code": "LIN", "driverName": "Arvid Lindblad", "team": "Racing Bulls"},
            {"driverId": "22", "code": "TSU", "driverName": "Yuki Tsunoda", "team": "Unknown"},
            {"driverId": "6", "code": "HAD", "driverName": "Isack Hadjar", "team": "Red Bull Racing"},
        ]

        entries = parse_race_entries(text, known)
        by_id = {entry["driverId"]: entry for entry in entries}
        self.assertEqual(set(by_id), {"3", "30", "41", "22"})
        self.assertEqual(by_id["30"]["team"], "Red Bull Racing")
        self.assertEqual(by_id["22"]["team"], "Racing Bulls")

    def test_uses_team_name_before_engine_constructor(self):
        self.assertEqual(
            team_from_segment(
                "ALB Alexander Albon Atlassian Williams F1 Team Williams Mercedes",
                "Unknown",
            ),
            "Williams",
        )
        self.assertEqual(
            team_from_segment("OCO Esteban Ocon TGR Haas F1 Team Haas Ferrari", "Unknown"),
            "Haas",
        )


if __name__ == "__main__":
    unittest.main()
