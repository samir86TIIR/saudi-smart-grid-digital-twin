export type RegionKey = 'riyadh' | 'alkhobar' | 'jeddah' | 'neom_tabuk' | 'red_sea';

export type NodeCategory =
  | 'regional_hub'
  | 'energy_source'
  | 'substation'
  | 'critical_asset';

export type HealthStatus = 'nominal' | 'warning' | 'critical';

export type SectorType = 'residential' | 'commercial' | 'industrial' | 'giga_project';

export type EdgeRelation = 'supplies' | 'feeds';

export interface KapsarcSiteMetrics {
  /** KAPSARC calibrated baseline load (MW) */
  baseLoadMw: number;
  /** Summer HVAC peak multiplier (KAPSARC June-August surge factor) */
  summerPeakMultiplier: number;
  /** Regional share of KSA electricity demand (%) */
  nationalDemandSharePct: number;
  /** Renewable generation share (%) */
  renewableSharePct: number;
  /** Carbon intensity (gCO2 / kWh) */
  carbonIntensityGCo2Kwh: number;
  /** Ambient dry-bulb temperature (°C) */
  ambientTempC: number;
  /** SEC tariff sector classification */
  sectorType: SectorType;
  /** KAPSARC dataset reference label */
  kapsarcDatasetRef: string;
}

export interface GridSiteNode {
  id: string;
  name: string;
  regionKey: RegionKey;
  regionLabel: string;
  city: string;
  secOperatingArea: string;
  category: NodeCategory;
  assetSubtype: string;
  /** Strictly public regional centroid or synthetic offset — never real critical infrastructure */
  coordinates: [number, number]; // [longitude, latitude]
  capacityMw: number;
  liveLoadMw: number;
  voltageV: number;
  frequencyHz: number;
  status: HealthStatus;
  smartMeterCount: number;
  kapsarc: KapsarcSiteMetrics;
  loadHistoryMw: number[];
}

export interface EnergyFlowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: EdgeRelation;
  allocatedMw: number;
  maxCapacityMw: number;
  renewableMixPct: number;
  status: HealthStatus;
}

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  siteId: string;
  siteName: string;
  regionLabel: string;
  severity: 'warning' | 'critical';
  anomalyType: 'VOLTAGE_SAG' | 'VOLTAGE_SWELL' | 'FREQ_EXCURSION' | 'HVAC_PEAK_SURGE';
  metricValue: string;
  threshold: string;
  recommendedAction: string;
}

export interface BlastRadiusResult {
  originNodeId: string;
  originNodeName: string;
  impactedNodeIds: string[];
  impactedEdgeIds: string[];
  totalMwAtRisk: number;
  impactedSmartMeters: number;
  criticalAssetsImpacted: number;
  estimatedRecoveryMin: number;
  cascadingRiskLevel: 'MODERATE' | 'HIGH' | 'SEVERE';
  source: 'live_api' | 'demo_replay';
}

export interface NationalKpis {
  nationalLoadMw: number;
  renewableSharePct: number;
  activeAnomalies: number;
  p99LatencyMs: number;
  gridFrequencyHz: number;
  hvacPeakIndex: number;
  activeSmartMeters: number;
}

export interface RegionViewport {
  key: RegionKey | 'all';
  label: string;
  shortLabel: string;
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface KapsarcRegionalSummary {
  regionKey: RegionKey;
  regionName: string;
  secArea: string;
  annualConsumptionTwh: number;
  summerPeakMultiplier: number;
  renewableTarget2030Pct: number;
  currentRenewablePct: number;
  primaryDriver: string;
}
