"""
High-Throughput Smart Meter IoT Telemetry Generator
===================================================
Role: data-simulator-ksa
Module: data_simulator.smart_meter_simulator

Generates realistic telemetry streams modeling millions of AMI (Advanced Metering
Infrastructure) smart meters across Saudi Arabian metropolitan and giga-project grids.
Complies with SEC (Saudi Electricity Company) and SASO electrical standards:
- Nominal Frequency: 60.0 Hz
- Nominal Single-Phase Voltage: 230.0 V (SASO standard ±6%)
- High ambient temperature profiles modeling Riyadh and Oxagon environments.
"""

import json
import math
import random
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Dict, Generator, List, Optional, Tuple

from data_simulator.kapsarc_client import SAUDI_GRID_ZONES, SaudiGridZone


# SASO / SEC Electrical Thresholds
NOMINAL_VOLTAGE_V = 230.0
VOLTAGE_SAG_THRESHOLD_V = 207.0      # -10% critical threshold
VOLTAGE_SWELL_THRESHOLD_V = 253.0    # +10% critical threshold
NOMINAL_FREQUENCY_HZ = 60.0
FREQ_MIN_TOLERANCE_HZ = 59.5
FREQ_MAX_TOLERANCE_HZ = 60.5


class AnomalyType:
    NONE = "NORMAL"
    VOLTAGE_SAG = "VOLTAGE_SAG"              # Substation or feeder drop < 207V
    VOLTAGE_SWELL = "VOLTAGE_SWELL"          # Transient surge > 253V
    CONSUMPTION_SPIKE = "CONSUMPTION_SPIKE"  # Abnormal peak (e.g. industrial surge)
    FREQ_EXCURSION = "FREQ_EXCURSION"        # Frequency out of 59.5Hz - 60.5Hz
    HIGH_TEMPERATURE = "HIGH_TEMPERATURE"    # Meter enclosure overheating (> 75°C)
    SUSPECTED_TAMPER = "SUSPECTED_TAMPER"    # Phase angle anomaly / zero current


@dataclass
class SmartMeterEvent:
    event_id: str
    meter_id: str
    timestamp: str            # ISO-8601 dynamic UTC timestamp
    timestamp_ms: int         # Milliseconds epoch for Flink event-time watermarking
    grid_zone: str            # e.g. "NEOM-OXAGON-SEC01", "RUH-MALQA-RES"
    city: str
    region: str
    substation_id: str
    sector_type: str          # residential, commercial, industrial, giga_project
    voltage_v: float          # Nominal 230V ±6%
    current_a: float          # Amperes
    active_power_kw: float    # Real power consumption in kW
    reactive_power_kvar: float# Reactive power
    power_factor: float       # cos(phi) typically 0.88 - 0.98
    frequency_hz: float       # Nominal 60Hz
    meter_temp_c: float       # Device temperature
    anomaly_flag: str         # "NORMAL" or anomaly code
    severity: str             # "INFO", "WARNING", "CRITICAL"

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    def to_dict(self) -> Dict:
        return asdict(self)


class SmartMeterFleet:
    """
    Simulates a partitioned fleet of smart meters distributed across Saudi grid zones.
    """

    def __init__(self, total_meters: int = 100_000, anomaly_rate: float = 0.015):
        self.total_meters = total_meters
        self.anomaly_rate = anomaly_rate
        self.zones = SAUDI_GRID_ZONES
        self.meter_registry: List[Tuple[str, SaudiGridZone, float]] = []
        self._initialize_fleet()

    def _initialize_fleet(self) -> None:
        """
        Pre-allocates meter identifiers and assigns them to zones with individual base ratings.
        """
        for i in range(self.total_meters):
            zone = self.zones[i % len(self.zones)]
            meter_id = f"SA-AMI-{zone.city[:3].upper()}-{i+1:08d}"
            # Base capacity in kW depending on sector
            if zone.sector_type == "industrial":
                base_kw = random.uniform(40.0, 150.0)
            elif zone.sector_type == "commercial":
                base_kw = random.uniform(15.0, 50.0)
            elif zone.sector_type == "giga_project":
                base_kw = random.uniform(25.0, 80.0)
            else:  # residential
                base_kw = random.uniform(3.0, 18.0)  # High in KSA due to AC chillers
            self.meter_registry.append((meter_id, zone, base_kw))

    def generate_event(self, index: Optional[int] = None, force_anomaly: Optional[str] = None) -> SmartMeterEvent:
        """
        Synthesizes a single high-fidelity smart meter event with real-time dynamic timestamp.
        """
        idx = index % len(self.meter_registry) if index is not None else random.randint(0, len(self.meter_registry) - 1)
        meter_id, zone, base_kw = self.meter_registry[idx]

        now = datetime.now(timezone.utc)
        ts_iso = now.isoformat()
        ts_ms = int(now.timestamp() * 1000)

        # Diurnal fluctuation based on current hour
        hour_rad = (now.hour / 24.0) * 2 * math.pi
        # Peak at ~15:00 (hour 15 is around 1.25 pi)
        diurnal_factor = 1.0 + 0.35 * math.sin(hour_rad - math.pi / 2)

        # Base electrical values
        power_factor = round(random.uniform(0.91, 0.98), 3)
        voltage = round(random.gauss(NOMINAL_VOLTAGE_V, 2.5), 2)
        frequency = round(random.gauss(NOMINAL_FREQUENCY_HZ, 0.04), 3)
        active_kw = round(base_kw * diurnal_factor * random.uniform(0.90, 1.10), 3)

        # Ambient and device thermal model (Saudi desert climate)
        ambient_temp = 42.0 if 5 <= now.month <= 9 else 26.0
        meter_temp = round(ambient_temp + (active_kw / 5.0) + random.uniform(3.0, 8.0), 1)

        anomaly = AnomalyType.NONE
        severity = "INFO"

        # Determine if an anomaly should be injected
        trigger_anomaly = force_anomaly if force_anomaly else (
            random.random() < self.anomaly_rate
        )

        if trigger_anomaly:
            chosen = force_anomaly or random.choice([
                AnomalyType.VOLTAGE_SAG,
                AnomalyType.VOLTAGE_SWELL,
                AnomalyType.CONSUMPTION_SPIKE,
                AnomalyType.FREQ_EXCURSION,
                AnomalyType.HIGH_TEMPERATURE,
                AnomalyType.SUSPECTED_TAMPER,
            ])

            if chosen == AnomalyType.VOLTAGE_SAG:
                voltage = round(random.uniform(175.0, 204.0), 2)
                anomaly = AnomalyType.VOLTAGE_SAG
                severity = "CRITICAL"
            elif chosen == AnomalyType.VOLTAGE_SWELL:
                voltage = round(random.uniform(255.0, 275.0), 2)
                anomaly = AnomalyType.VOLTAGE_SWELL
                severity = "WARNING"
            elif chosen == AnomalyType.CONSUMPTION_SPIKE:
                active_kw = round(active_kw * random.uniform(3.5, 6.0), 3)
                anomaly = AnomalyType.CONSUMPTION_SPIKE
                severity = "CRITICAL"
            elif chosen == AnomalyType.FREQ_EXCURSION:
                frequency = round(random.choice([random.uniform(58.8, 59.4), random.uniform(60.6, 61.2)]), 3)
                anomaly = AnomalyType.FREQ_EXCURSION
                severity = "CRITICAL"
            elif chosen == AnomalyType.HIGH_TEMPERATURE:
                meter_temp = round(random.uniform(78.0, 92.0), 1)
                anomaly = AnomalyType.HIGH_TEMPERATURE
                severity = "WARNING"
            elif chosen == AnomalyType.SUSPECTED_TAMPER:
                active_kw = 0.05
                power_factor = 0.35
                anomaly = AnomalyType.SUSPECTED_TAMPER
                severity = "WARNING"

        # Derived electrical properties
        # P = V * I * cos(phi) => I = (P * 1000) / (V * cos(phi))
        denom = max(voltage * power_factor, 1.0)
        current = round((active_kw * 1000.0) / denom, 2)
        reactive_kvar = round(active_kw * math.tan(math.acos(min(max(power_factor, 0.1), 1.0))), 3)

        return SmartMeterEvent(
            event_id=str(uuid.uuid4()),
            meter_id=meter_id,
            timestamp=ts_iso,
            timestamp_ms=ts_ms,
            grid_zone=zone.zone_id,
            city=zone.city,
            region=zone.region,
            substation_id=zone.substation_id,
            sector_type=zone.sector_type,
            voltage_v=voltage,
            current_a=current,
            active_power_kw=active_kw,
            reactive_power_kvar=reactive_kvar,
            power_factor=power_factor,
            frequency_hz=frequency,
            meter_temp_c=meter_temp,
            anomaly_flag=anomaly,
            severity=severity,
        )

    def stream_batch(self, batch_size: int = 500) -> List[SmartMeterEvent]:
        """
        Produces a contiguous batch of telemetry events.
        """
        return [self.generate_event() for _ in range(batch_size)]
