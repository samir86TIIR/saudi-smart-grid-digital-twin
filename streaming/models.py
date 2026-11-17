"""
Streaming Data Models & Schemas
===============================
Role: streaming-architect-ksa
Module: streaming.models
"""

from dataclasses import asdict, dataclass
from typing import Dict, Optional


@dataclass
class MinuteZoneAggregate:
    """
    1-minute tumbling window aggregate per grid zone.
    Target BigQuery Table: `telemetry_1min_aggregates`
    """
    window_start: str
    window_end: str
    grid_zone: str
    city: str
    region: str
    sector_type: str
    meter_count: int
    total_active_power_kwh: float  # (sum of kW * 1/60 hr)
    peak_active_power_kw: float
    avg_active_power_kw: float
    avg_voltage_v: float
    min_voltage_v: float
    max_voltage_v: float
    avg_frequency_hz: float
    anomaly_count: int
    ingestion_time: str

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class GridAnomalyAlert:
    """
    Real-time high-priority grid anomaly alert for operational command centers.
    Target BigQuery Table / Kafka Alert Topic: `telemetry_anomalies`
    """
    alert_id: str
    timestamp: str
    meter_id: str
    grid_zone: str
    city: str
    substation_id: str
    anomaly_type: str
    severity: str  # WARNING, CRITICAL
    observed_voltage_v: float
    observed_frequency_hz: float
    observed_power_kw: float
    root_cause_hypothesis: str
    recommended_action: str

    def to_dict(self) -> Dict:
        return asdict(self)
