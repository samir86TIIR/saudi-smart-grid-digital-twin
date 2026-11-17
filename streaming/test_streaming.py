"""
Unit Tests for Stream Processing & Anomaly Detection
====================================================
Role: streaming-architect-ksa
Module: streaming.test_streaming
"""

import unittest
from datetime import datetime, timezone

from streaming.flink_job import evaluate_event_anomalies, process_window_aggregation
from streaming.bigquery_sink import BigQuerySinkManager


class TestStreamProcessing(unittest.TestCase):

    def test_voltage_sag_detection(self):
        # Critical voltage sag: 185V (< 207V)
        event = {
            "meter_id": "SA-AMI-OXA-00000001",
            "grid_zone": "NEOM-OXAGON-SEC01",
            "city": "Oxagon",
            "substation_id": "SUB-OXA-001",
            "voltage_v": 185.0,
            "frequency_hz": 60.0,
            "active_power_kw": 25.0,
            "anomaly_flag": "VOLTAGE_SAG",
        }
        alerts = evaluate_event_anomalies(event)
        self.assertGreaterEqual(len(alerts), 1)
        sag_alert = alerts[0]
        self.assertEqual(sag_alert.anomaly_type, "VOLTAGE_SAG_CRITICAL")
        self.assertEqual(sag_alert.severity, "CRITICAL")
        self.assertEqual(sag_alert.observed_voltage_v, 185.0)
        self.assertIn("capacitor", sag_alert.recommended_action.lower())

    def test_frequency_excursion_detection(self):
        # Severe frequency drop to 59.2 Hz
        event = {
            "meter_id": "SA-AMI-RUH-00000042",
            "grid_zone": "RUH-KAFD-FINANCIAL",
            "city": "Riyadh",
            "substation_id": "SUB-KAFD-01",
            "voltage_v": 230.0,
            "frequency_hz": 59.2,
            "active_power_kw": 12.0,
            "anomaly_flag": "FREQ_EXCURSION",
        }
        alerts = evaluate_event_anomalies(event)
        self.assertGreaterEqual(len(alerts), 1)
        freq_alert = alerts[0]
        self.assertEqual(freq_alert.anomaly_type, "FREQUENCY_EXCURSION")
        self.assertEqual(freq_alert.severity, "CRITICAL")

    def test_window_aggregation(self):
        events = [
            {
                "meter_id": "M1",
                "grid_zone": "NEOM-OXAGON-SEC01",
                "city": "Oxagon",
                "region": "Tabuk",
                "sector_type": "industrial",
                "voltage_v": 228.0,
                "frequency_hz": 60.01,
                "active_power_kw": 50.0,
                "anomaly_flag": "NORMAL",
            },
            {
                "meter_id": "M2",
                "grid_zone": "NEOM-OXAGON-SEC01",
                "city": "Oxagon",
                "region": "Tabuk",
                "sector_type": "industrial",
                "voltage_v": 232.0,
                "frequency_hz": 59.99,
                "active_power_kw": 70.0,
                "anomaly_flag": "NORMAL",
            },
            {
                "meter_id": "M3",
                "grid_zone": "NEOM-OXAGON-SEC01",
                "city": "Oxagon",
                "region": "Tabuk",
                "sector_type": "industrial",
                "voltage_v": 190.0,
                "frequency_hz": 60.00,
                "active_power_kw": 60.0,
                "anomaly_flag": "VOLTAGE_SAG",
            },
        ]

        w_start = "2026-11-17T09:00:00Z"
        w_end = "2026-11-17T09:01:00Z"
        agg = process_window_aggregation("NEOM-OXAGON-SEC01", w_start, w_end, events)

        self.assertEqual(agg.meter_count, 3)
        self.assertEqual(agg.grid_zone, "NEOM-OXAGON-SEC01")
        # Peak power = max(50, 70, 60) = 70.0
        self.assertEqual(agg.peak_active_power_kw, 70.0)
        # Average active power = (50 + 70 + 60) / 3 = 60.0
        self.assertEqual(agg.avg_active_power_kw, 60.0)
        # Energy kWh = (180 kW) * (1/60) = 3.0 kWh
        self.assertEqual(agg.total_active_power_kwh, 3.0)
        # Min voltage = 190.0
        self.assertEqual(agg.min_voltage_v, 190.0)
        # Max voltage = 232.0
        self.assertEqual(agg.max_voltage_v, 232.0)
        # One anomaly
        self.assertEqual(agg.anomaly_count, 1)

    def test_bigquery_sink_dry_run(self):
        sink = BigQuerySinkManager(dry_run=True)
        sample_row = {
            "window_start": "2026-11-17T09:00:00Z",
            "window_end": "2026-11-17T09:01:00Z",
            "grid_zone": "RUH-MALQA-RES",
            "city": "Riyadh",
            "region": "Riyadh",
            "sector_type": "residential",
            "meter_count": 1000,
            "total_active_power_kwh": 500.0,
            "peak_active_power_kw": 45.0,
            "avg_active_power_kw": 30.0,
            "avg_voltage_v": 230.1,
            "min_voltage_v": 224.0,
            "max_voltage_v": 235.0,
            "avg_frequency_hz": 60.001,
            "anomaly_count": 2,
            "ingestion_time": "2026-11-17T09:01:05Z",
        }
        success = sink.insert_aggregates([sample_row])
        self.assertTrue(success)
        self.assertEqual(len(sink.buffered_aggregates), 1)


if __name__ == "__main__":
    unittest.main()
