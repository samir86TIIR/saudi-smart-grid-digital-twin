"""
Unit Tests for Smart Meter IoT Telemetry Generator
==================================================
Role: data-simulator-ksa
Module: data_simulator.test_simulator
"""

import json
import unittest

from data_simulator.kapsarc_client import KapsarcClient, SAUDI_GRID_ZONES
from data_simulator.smart_meter_simulator import (
    AnomalyType,
    NOMINAL_FREQUENCY_HZ,
    NOMINAL_VOLTAGE_V,
    SmartMeterEvent,
    SmartMeterFleet,
)
from data_simulator.kafka_producer import OptimizedKafkaProducer


class TestSmartMeterSimulator(unittest.TestCase):

    def test_kapsarc_baseline_generation(self):
        client = KapsarcClient()
        profiles = client.fetch_historical_consumption(limit=5)
        self.assertGreater(len(profiles), 0)
        for p in profiles:
            self.assertIn("zone_id", p)
            self.assertIn("baseline_mw", p)
            self.assertGreater(p["baseline_mw"], 0)
            self.assertIn(p["region"], ["Tabuk", "Riyadh", "Eastern", "Tabuk/Medina", "Makkah"])

    def test_smart_meter_fleet_initialization(self):
        fleet = SmartMeterFleet(total_meters=100)
        self.assertEqual(len(fleet.meter_registry), 100)
        meter_id, zone, base_kw = fleet.meter_registry[0]
        self.assertTrue(meter_id.startswith("SA-AMI-"))
        self.assertGreater(base_kw, 0)

    def test_smart_meter_nominal_event(self):
        fleet = SmartMeterFleet(total_meters=10, anomaly_rate=0.0)
        event = fleet.generate_event(force_anomaly=AnomalyType.NONE)

        self.assertIsInstance(event, SmartMeterEvent)
        self.assertEqual(event.anomaly_flag, AnomalyType.NONE)
        self.assertEqual(event.severity, "INFO")
        # Nominal voltage should stay reasonably close to 230V
        self.assertTrue(210.0 <= event.voltage_v <= 250.0)
        # Saudi nominal frequency should stay close to 60.0Hz
        self.assertTrue(59.8 <= event.frequency_hz <= 60.2)
        self.assertGreater(event.active_power_kw, 0)
        self.assertGreater(event.current_a, 0)
        self.assertGreater(event.meter_temp_c, 0)

        # Ensure JSON serializability
        payload = json.loads(event.to_json())
        self.assertEqual(payload["meter_id"], event.meter_id)
        self.assertEqual(payload["voltage_v"], event.voltage_v)

    def test_smart_meter_anomaly_injection(self):
        fleet = SmartMeterFleet(total_meters=10)
        # Voltage sag
        event_sag = fleet.generate_event(force_anomaly=AnomalyType.VOLTAGE_SAG)
        self.assertEqual(event_sag.anomaly_flag, AnomalyType.VOLTAGE_SAG)
        self.assertLess(event_sag.voltage_v, 207.0)
        self.assertEqual(event_sag.severity, "CRITICAL")

        # Voltage swell
        event_swell = fleet.generate_event(force_anomaly=AnomalyType.VOLTAGE_SWELL)
        self.assertEqual(event_swell.anomaly_flag, AnomalyType.VOLTAGE_SWELL)
        self.assertGreater(event_swell.voltage_v, 253.0)

        # Frequency excursion
        event_freq = fleet.generate_event(force_anomaly=AnomalyType.FREQ_EXCURSION)
        self.assertEqual(event_freq.anomaly_flag, AnomalyType.FREQ_EXCURSION)
        self.assertTrue(event_freq.frequency_hz < 59.5 or event_freq.frequency_hz > 60.5)

    def test_kafka_producer_dry_run(self):
        producer = OptimizedKafkaProducer(dry_run=True)
        fleet = SmartMeterFleet(total_meters=10)
        batch = fleet.stream_batch(batch_size=50)

        for ev in batch:
            success = producer.publish_event(key=ev.grid_zone, payload_json=ev.to_json())
            self.assertTrue(success)

        stats = producer.get_stats()
        self.assertEqual(stats["total_messages"], 50)
        self.assertGreater(stats["messages_per_second"], 0)
        producer.close()


if __name__ == "__main__":
    unittest.main()
