import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_ANOMALIES,
  INITIAL_ENERGY_EDGES,
  INITIAL_GRID_NODES,
  computeLocalBlastRadius,
} from '../data/saudiEnergyDataset';
import {
  AnomalyAlert,
  BlastRadiusResult,
  EnergyFlowEdge,
  GridSiteNode,
  HealthStatus,
  NationalKpis,
} from '../types/grid';

export type TelemetryMode = 'demo_replay' | 'live_api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

function deterministicJitter(seed: number, amplitude: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return (frac * 2 - 1) * amplitude;
}

export function useGridTelemetry() {
  const [mode, setMode] = useState<TelemetryMode>(API_BASE_URL ? 'live_api' : 'demo_replay');
  const [liveConnected, setLiveConnected] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [nodes, setNodes] = useState<GridSiteNode[]>(INITIAL_GRID_NODES);
  const [edges, setEdges] = useState<EnergyFlowEdge[]>(INITIAL_ENERGY_EDGES);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>(INITIAL_ANOMALIES);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResult | null>(null);
  const [blastLoading, setBlastLoading] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(0);

  const tickRef = useRef<number>(0);

  // SSE Connection for Live API mode with automatic fallback to Demo Replay Mode
  useEffect(() => {
    if (mode !== 'live_api') {
      setLiveConnected(false);
      return;
    }

    if (!API_BASE_URL) {
      setMode('demo_replay');
      setFallbackNotice('No VITE_API_BASE_URL configured — running in zero-cost Demo Replay Mode.');
      return;
    }

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE_URL}/api/v1/telemetry/stream`);

      eventSource.onopen = () => {
        setLiveConnected(true);
        setFallbackNotice(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            site_id?: string;
            load_mw?: number;
            voltage_v?: number;
            frequency_hz?: number;
            status?: HealthStatus;
            anomaly?: AnomalyAlert;
          };

          if (payload.site_id) {
            setNodes((prev) =>
              prev.map((node) => {
                if (node.id !== payload.site_id) return node;
                const nextLoad = payload.load_mw ?? node.liveLoadMw;
                return {
                  ...node,
                  liveLoadMw: nextLoad,
                  voltageV: payload.voltage_v ?? node.voltageV,
                  frequencyHz: payload.frequency_hz ?? node.frequencyHz,
                  status: payload.status ?? node.status,
                  loadHistoryMw: [...node.loadHistoryMw.slice(-11), nextLoad],
                };
              })
            );
          }

          if (payload.anomaly) {
            setAnomalies((prev) => [payload.anomaly!, ...prev].slice(0, 20));
          }
        } catch {
          // Ignore malformed frames
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        setLiveConnected(false);
        setMode('demo_replay');
        setFallbackNotice(
          'Live FastAPI stream unreachable (scaled to zero for FinOps) — switched to Demo Replay Mode.'
        );
      };
    } catch {
      setLiveConnected(false);
      setMode('demo_replay');
      setFallbackNotice('Live API unavailable — switched to Demo Replay Mode.');
    }

    return () => {
      eventSource?.close();
    };
  }, [mode]);

  // Deterministic KAPSARC Replay Engine (runs in Demo Replay Mode)
  useEffect(() => {
    if (mode !== 'demo_replay' || isPaused) return;

    const interval = window.setInterval(() => {
      tickRef.current += 1;
      const currentTick = tickRef.current;
      setTick(currentTick);

      setNodes((prevNodes) => {
        const updatedNodes = prevNodes.map((node, idx) => {
          const seed = currentTick * 31 + idx * 17;
          const wave = Math.sin((currentTick + idx) * 0.35) * (node.capacityMw * 0.018);
          const jitter = deterministicJitter(seed, node.capacityMw * 0.012);
          const rawLoad = node.liveLoadMw + wave * 0.25 + jitter;
          const clampedLoad = Math.round(
            Math.max(node.capacityMw * 0.38, Math.min(node.capacityMw * 0.97, rawLoad))
          );

          // Voltage simulation aligned with SEC 230V ±6% (216.2V - 243.8V)
          const baseV =
            node.id === 'SUB-JED-01'
              ? 205.5
              : node.id === 'SUB-KAFD-01'
                ? 215.2
                : 230.0;
          const voltageV = Number((baseV + deterministicJitter(seed + 7, 2.2)).toFixed(1));
          const frequencyHz = Number(
            (60.0 + deterministicJitter(seed + 13, node.status === 'critical' ? 0.11 : 0.03)).toFixed(2)
          );

          const loadRatio = clampedLoad / node.capacityMw;
          let status: HealthStatus = 'nominal';
          if (voltageV < 207 || voltageV > 253 || loadRatio > 0.94) {
            status = 'critical';
          } else if (voltageV < 216 || loadRatio > 0.88) {
            status = 'warning';
          }

          return {
            ...node,
            liveLoadMw: clampedLoad,
            voltageV,
            frequencyHz,
            status,
            loadHistoryMw: [...node.loadHistoryMw.slice(-11), clampedLoad],
          };
        });

        // Sync edge flows with updated node statuses
        const nodeById = new Map(updatedNodes.map((n) => [n.id, n]));
        setEdges((prevEdges) =>
          prevEdges.map((edge, eIdx) => {
            const target = nodeById.get(edge.targetId);
            const source = nodeById.get(edge.sourceId);
            const flowDelta = deterministicJitter(currentTick * 19 + eIdx, 14);
            const allocatedMw = Math.round(
              Math.max(30, Math.min(edge.maxCapacityMw * 0.96, edge.allocatedMw + flowDelta * 0.25))
            );
            const status: HealthStatus =
              target?.status === 'critical' || source?.status === 'critical'
                ? 'critical'
                : target?.status === 'warning' || source?.status === 'warning'
                  ? 'warning'
                  : 'nominal';
            return { ...edge, allocatedMw, status };
          })
        );

        // Emit periodic simulated Flink anomaly every 6 ticks (~13s)
        if (currentTick % 6 === 0) {
          const candidates = updatedNodes.filter((n) => n.status !== 'nominal');
          const picked = candidates[currentTick % Math.max(1, candidates.length)] ?? updatedNodes[2];
          if (picked) {
            const isSag = picked.voltageV < 216;
            const newAlert: AnomalyAlert = {
              id: `ANO-FLINK-${currentTick}`,
              timestamp: new Date().toISOString(),
              siteId: picked.id,
              siteName: picked.name,
              regionLabel: picked.regionLabel,
              severity: picked.status === 'critical' ? 'critical' : 'warning',
              anomalyType: isSag ? 'VOLTAGE_SAG' : 'HVAC_PEAK_SURGE',
              metricValue: isSag
                ? `${picked.voltageV.toFixed(1)} V`
                : `${picked.liveLoadMw} MW (${Math.round((picked.liveLoadMw / picked.capacityMw) * 100)}%)`,
              threshold: isSag ? '< 207.0 V (SEC Limit)' : '> 88% Rated Capacity',
              recommendedAction: isSag
                ? 'Automated Volt-VAR capacitor dispatch & feeder voltage stabilization'
                : 'Shift regional BESS discharge & balance SEC tie-line flow',
            };
            setAnomalies((prev) => [newAlert, ...prev].slice(0, 18));
          }
        }

        return updatedNodes;
      });
    }, 2200);

    return () => window.clearInterval(interval);
  }, [mode, isPaused]);

  const kpis: NationalKpis = useMemo(() => {
    const loadNodes = nodes.filter((n) => n.category !== 'energy_source');
    const nationalLoadMw = loadNodes.reduce((sum, n) => sum + n.liveLoadMw, 0);
    const weightedRenew = loadNodes.reduce(
      (sum, n) => sum + n.liveLoadMw * n.kapsarc.renewableSharePct,
      0
    );
    const renewableSharePct =
      nationalLoadMw > 0 ? Number((weightedRenew / nationalLoadMw).toFixed(1)) : 0;
    const activeAnomalies = nodes.filter((n) => n.status !== 'nominal').length;
    const avgFreq =
      nodes.reduce((sum, n) => sum + n.frequencyHz, 0) / Math.max(1, nodes.length);
    const avgSummerMultiplier =
      loadNodes.reduce((sum, n) => sum + n.kapsarc.summerPeakMultiplier, 0) /
      Math.max(1, loadNodes.length);
    const activeSmartMeters = nodes.reduce((sum, n) => sum + n.smartMeterCount, 0);
    const p99LatencyMs = Math.round(118 + Math.abs(deterministicJitter(tick + 5, 24)));

    return {
      nationalLoadMw,
      renewableSharePct,
      activeAnomalies,
      p99LatencyMs,
      gridFrequencyHz: Number(avgFreq.toFixed(2)),
      hvacPeakIndex: Number(avgSummerMultiplier.toFixed(2)),
      activeSmartMeters,
    };
  }, [nodes, tick]);

  const runBlastRadius = useCallback(
    async (originNodeId: string) => {
      setBlastLoading(true);
      if (mode === 'live_api' && API_BASE_URL) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/v1/ontology/substations/${encodeURIComponent(originNodeId)}/blast-radius`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (response.ok) {
            const data = (await response.json()) as BlastRadiusResult;
            setBlastRadius({ ...data, source: 'live_api' });
            setBlastLoading(false);
            return;
          }
        } catch {
          // Graceful fallback to deterministic local ontology graph traversal
        }
      }

      const localResult = computeLocalBlastRadius(originNodeId, nodes, edges);
      setBlastRadius(localResult);
      setBlastLoading(false);
    },
    [edges, mode, nodes]
  );

  const clearBlastRadius = useCallback(() => {
    setBlastRadius(null);
  }, []);

  const toggleMode = useCallback((nextMode: TelemetryMode) => {
    setFallbackNotice(null);
    setMode(nextMode);
  }, []);

  return {
    mode,
    liveConnected,
    fallbackNotice,
    isPaused,
    setIsPaused,
    toggleMode,
    nodes,
    edges,
    anomalies,
    kpis,
    blastRadius,
    blastLoading,
    runBlastRadius,
    clearBlastRadius,
  };
}
