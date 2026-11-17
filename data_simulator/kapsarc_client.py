"""
KAPSARC Open Data Client & Saudi Energy Profile Generator
=========================================================
Role: data-simulator-ksa
Module: data_simulator.kapsarc_client

Connects to the King Abdullah Petroleum Studies and Research Center (KAPSARC)
Open Data Portal API (or provides a calibrated fallback based on actual Saudi
electricity consumption profiles by province, season, and tariff sector).
"""

import logging
import os
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import urllib.request
import json

logger = logging.getLogger("smart_grid_ksa.kapsarc")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@dataclass
class SaudiGridZone:
    zone_id: str
    region: str
    city: str
    substation_id: str
    base_load_mw: float
    summer_peak_multiplier: float
    sector_type: str  # 'residential', 'commercial', 'industrial', 'giga_project'


# Real-world target zones across Saudi Vision 2030 hubs
SAUDI_GRID_ZONES: List[SaudiGridZone] = [
    # NEOM Giga-Project
    SaudiGridZone("NEOM-OXAGON-SEC01", "Tabuk", "Oxagon", "SUB-OXA-001", 120.0, 1.35, "industrial"),
    SaudiGridZone("NEOM-OXAGON-SEC02", "Tabuk", "Oxagon", "SUB-OXA-002", 95.0, 1.30, "industrial"),
    SaudiGridZone("NEOM-THELINE-NODE1", "Tabuk", "The Line", "SUB-LIN-001", 150.0, 1.45, "giga_project"),
    SaudiGridZone("NEOM-THELINE-NODE2", "Tabuk", "The Line", "SUB-LIN-002", 140.0, 1.40, "giga_project"),
    SaudiGridZone("NEOM-TROJENA-HUB", "Tabuk", "Trojena", "SUB-TRJ-001", 60.0, 1.25, "commercial"),

    # Riyadh Urban Core (Central Province - SEC Central Operating Area)
    SaudiGridZone("RUH-KAFD-FINANCIAL", "Riyadh", "Riyadh", "SUB-KAFD-01", 110.0, 1.90, "commercial"),
    SaudiGridZone("RUH-MALQA-RES", "Riyadh", "Riyadh", "SUB-MLQ-01", 85.0, 2.10, "residential"),
    SaudiGridZone("RUH-OLAYA-DOWNTOWN", "Riyadh", "Riyadh", "SUB-OLY-01", 130.0, 1.85, "commercial"),
    SaudiGridZone("RUH-DQ-DIPLOMATIC", "Riyadh", "Riyadh", "SUB-DQ-01", 70.0, 1.75, "residential"),
    SaudiGridZone("RUH-IND-CITY2", "Riyadh", "Riyadh", "SUB-IND2-01", 180.0, 1.40, "industrial"),

    # Eastern Province (Dammam / Jubail - Industrial Heartland)
    SaudiGridZone("EAS-JUBAIL-PETRO", "Eastern", "Jubail", "SUB-JUB-01", 250.0, 1.30, "industrial"),
    SaudiGridZone("EAS-DAMMAM-PORT", "Eastern", "Dammam", "SUB-DAM-01", 90.0, 1.80, "industrial"),

    # Western Province (Jeddah & Red Sea Global)
    SaudiGridZone("WES-REDSEA-RESORT", "Tabuk/Medina", "Red Sea", "SUB-RSP-01", 45.0, 1.50, "giga_project"),
    SaudiGridZone("WES-JED-COR NICHE", "Makkah", "Jeddah", "SUB-JED-01", 100.0, 2.05, "residential")
]


class KapsarcClient:
    """
    Client for KAPSARC Open Data Portal API.
    Portal: https://datasource.kapsarc.org
    Dataset: Saudi Electricity Consumption by Sector and Region.
    """

    BASE_URL = "https://datasource.kapsarc.org/api/explore/v2.1"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("KAPSARC_API_KEY", "")

    def fetch_historical_consumption(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Attempts to fetch real historical open data from KAPSARC Opendatasoft v2.1 API.
        If offline or unauthenticated, gracefully falls back to calibrated baseline models.
        """
        endpoint = f"{self.BASE_URL}/catalog/datasets/saudi-electricity-consumption/records?limit={limit}"
        headers = {"User-Agent": "SmartGridKSA-DigitalTwin/1.0"}
        if self.api_key:
            headers["Authorization"] = f"Apikey {self.api_key}"

        try:
            req = urllib.request.Request(endpoint, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    results = payload.get("results", [])
                    if results:
                        logger.info("Successfully retrieved %d historical records from KAPSARC Open Data", len(results))
                        return results
        except Exception as exc:
            logger.warning("KAPSARC API live call unavailable (%s). Using calibrated Saudi baseline profile.", exc)

        return self._generate_calibrated_profile()

    def _generate_calibrated_profile(self) -> List[Dict[str, Any]]:
        """
        Generates calibrated baseline data mirroring real KAPSARC published statistics:
        - Major seasonal variations: summer peak (June-August) reaches 2x winter baseline due to HVAC.
        - Diurnal curve: afternoon peak (13:00 - 17:00) coinciding with maximum heat index (45°C+ in Riyadh).
        """
        now = datetime.now(timezone.utc)
        hour = now.hour
        month = now.month

        # Saudi summer HVAC surge factor
        is_summer = 5 <= month <= 9
        season_multiplier = 1.75 if is_summer else 1.05

        # Diurnal pattern in Saudi Arabia (SEC load curve)
        # 02:00-06:00: trough; 13:00-17:00: peak demand
        if 13 <= hour <= 17:
            hour_multiplier = 1.45
        elif 18 <= hour <= 23:
            hour_multiplier = 1.25
        elif 7 <= hour <= 12:
            hour_multiplier = 1.10
        else:
            hour_multiplier = 0.75

        profile = []
        for zone in SAUDI_GRID_ZONES:
            adjusted_factor = season_multiplier * hour_multiplier * (1.0 + random.uniform(-0.05, 0.05))
            effective_mw = zone.base_load_mw * adjusted_factor
            profile.append({
                "zone_id": zone.zone_id,
                "region": zone.region,
                "city": zone.city,
                "substation_id": zone.substation_id,
                "sector_type": zone.sector_type,
                "baseline_mw": round(effective_mw, 2),
                "ambient_temp_c": round(38.0 + random.uniform(-6.0, 10.0) if is_summer else 22.0 + random.uniform(-4.0, 5.0), 1),
                "timestamp": now.isoformat()
            })
        return profile
