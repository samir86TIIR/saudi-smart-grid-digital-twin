import {
  AlertOctagon,
  Flame,
  GitBranch,
  Leaf,
  RotateCcw,
  ShieldAlert,
  Thermometer,
  X,
  Zap,
} from 'lucide-react';
import { BlastRadiusResult, EnergyFlowEdge, GridSiteNode } from '../types/grid';

interface NodeInspectionDrawerProps {
  node: GridSiteNode;
  edges: EnergyFlowEdge[];
  nodes: GridSiteNode[];
  blastRadius: BlastRadiusResult | null;
  blastLoading: boolean;
  onRunBlastRadius: (nodeId: string) => void;
  onClearBlastRadius: () => void;
  onClose: () => void;
}

function LoadSparkline({ values, capacity }: { values: number[]; capacity: number }) {
  if (values.length < 2) return null;
  const width = 260;
  const height = 46;
  const maxVal = Math.max(capacity, ...values);
  const minVal = Math.min(...values) * 0.9;
  const range = Math.max(1, maxVal - minVal);

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - minVal) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12 overflow-visible">
      <polyline
        fill="none"
        stroke="#22D3EE"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function NodeInspectionDrawer({
  node,
  edges,
  nodes,
  blastRadius,
  blastLoading,
  onRunBlastRadius,
  onClearBlastRadius,
  onClose,
}: NodeInspectionDrawerProps) {
  const utilizationPct = Math.round((node.liveLoadMw / node.capacityMw) * 100);
  const outboundEdges = edges.filter((e) => e.sourceId === node.id);
  const inboundEdges = edges.filter((e) => e.targetId === node.id);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const isBlastActiveForNode = blastRadius?.originNodeId === node.id;

  return (
    <aside className="pointer-events-auto glass-panel-strong w-full max-w-[360px] max-h-[calc(100vh-195px)] rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/70 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-cyan-400">
              {node.id}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                node.status === 'critical'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : node.status === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {node.status}
            </span>
          </div>
          <h2 className="text-sm font-semibold text-slate-100 mt-1 leading-snug">
            {node.name}
          </h2>
          <p className="text-[11px] text-slate-400">
            {node.assetSubtype} · {node.secOperatingArea}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition"
          aria-label="Close inspection panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="p-4 space-y-4 overflow-y-auto text-xs">
        {/* Live Electrical Telemetry */}
        <div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Live SEC Telemetry
            </span>
            <span className="font-mono text-slate-300">{utilizationPct}% Rated</span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                utilizationPct >= 90
                  ? 'bg-red-500'
                  : utilizationPct >= 80
                    ? 'bg-amber-400'
                    : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, utilizationPct)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono">
            <div className="bg-slate-900/75 border border-slate-800 rounded-lg p-2">
              <p className="text-[10px] text-slate-400">Active Load</p>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">
                {node.liveLoadMw} <span className="text-[10px] text-slate-400">MW</span>
              </p>
            </div>
            <div className="bg-slate-900/75 border border-slate-800 rounded-lg p-2">
              <p className="text-[10px] text-slate-400">Voltage (230V)</p>
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  node.voltageV < 207
                    ? 'text-red-400'
                    : node.voltageV < 216
                      ? 'text-amber-300'
                      : 'text-emerald-400'
                }`}
              >
                {node.voltageV}V
              </p>
            </div>
            <div className="bg-slate-900/75 border border-slate-800 rounded-lg p-2">
              <p className="text-[10px] text-slate-400">Frequency</p>
              <p className="text-sm font-semibold text-slate-100 mt-0.5">
                {node.frequencyHz}Hz
              </p>
            </div>
          </div>

          <div className="mt-2 bg-slate-900/60 border border-slate-800/80 rounded-lg px-2.5 py-1.5">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Rolling Load Trajectory (MW)</span>
              <span className="font-mono">Cap: {node.capacityMw} MW</span>
            </div>
            <LoadSparkline values={node.loadHistoryMw} capacity={node.capacityMw} />
          </div>
        </div>

        {/* KAPSARC Open Data Metrics */}
        <div className="bg-slate-900/65 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5" />
              KAPSARC Calibrated Metrics
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {node.kapsarc.kapsarcDatasetRef}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 font-mono text-[11px]">
            <span className="text-slate-400">Baseline Load</span>
            <span className="text-right text-slate-200">{node.kapsarc.baseLoadMw} MW</span>

            <span className="text-slate-400">Summer HVAC Peak</span>
            <span className="text-right text-amber-300">
              {node.kapsarc.summerPeakMultiplier}x Baseline
            </span>

            <span className="text-slate-400">Renewable Mix</span>
            <span className="text-right text-emerald-400">
              {node.kapsarc.renewableSharePct}%
            </span>

            <span className="text-slate-400">Carbon Intensity</span>
            <span className="text-right text-slate-200">
              {node.kapsarc.carbonIntensityGCo2Kwh} gCO₂/kWh
            </span>

            <span className="text-slate-400 flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-orange-400" />
              Ambient Temp
            </span>
            <span className="text-right text-orange-300">{node.kapsarc.ambientTempC}°C</span>

            <span className="text-slate-400">Tariff Sector</span>
            <span className="text-right uppercase text-cyan-300">
              {node.kapsarc.sectorType.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Blast Radius Simulation Control */}
        <div className="border border-slate-700/80 rounded-lg p-3 bg-slate-900/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              Ontology Blast Radius
            </span>
            {isBlastActiveForNode && (
              <button
                onClick={onClearBlastRadius}
                className="text-[10px] text-slate-400 hover:text-slate-100 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Traverse ArangoDB <code className="text-cyan-300">supplies</code> /{' '}
            <code className="text-cyan-300">feeds</code> edges to evaluate cascading downstream
            outage risk from this node.
          </p>

          <button
            onClick={() => onRunBlastRadius(node.id)}
            disabled={blastLoading}
            className="w-full py-2 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <AlertOctagon className="w-4 h-4 text-red-400" />
            {blastLoading
              ? 'Traversing Grid Ontology...'
              : isBlastActiveForNode
                ? 'Re-run Blast Radius Simulation'
                : 'Simulate Outage Blast Radius'}
          </button>

          {isBlastActiveForNode && blastRadius && (
            <div className="mt-2 pt-2.5 border-t border-red-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-red-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Cascading Risk: {blastRadius.cascadingRiskLevel}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {blastRadius.source === 'live_api' ? 'FastAPI Ontology' : 'Local Replay'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="bg-red-950/40 border border-red-500/30 rounded p-1.5">
                  <p className="text-[10px] text-red-300/80">MW at Risk</p>
                  <p className="text-sm font-semibold text-red-200">
                    {blastRadius.totalMwAtRisk.toLocaleString()} MW
                  </p>
                </div>
                <div className="bg-red-950/40 border border-red-500/30 rounded p-1.5">
                  <p className="text-[10px] text-red-300/80">Impacted Nodes</p>
                  <p className="text-sm font-semibold text-red-200">
                    {blastRadius.impactedNodeIds.length} Sites
                  </p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded p-1.5">
                  <p className="text-[10px] text-slate-400">AMI Meters</p>
                  <p className="text-xs font-semibold text-slate-100">
                    {blastRadius.impactedSmartMeters.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded p-1.5">
                  <p className="text-[10px] text-slate-400">Est. Recovery</p>
                  <p className="text-xs font-semibold text-amber-300">
                    {blastRadius.estimatedRecoveryMin} min
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Topology Connections */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            Ontology Edges ({inboundEdges.length} in · {outboundEdges.length} out)
          </p>
          <div className="space-y-1.5">
            {outboundEdges.map((edge) => {
              const target = nodeMap.get(edge.targetId);
              return (
                <div
                  key={edge.id}
                  className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1.5 text-[11px]"
                >
                  <span className="truncate text-slate-300">
                    <span className="font-mono text-cyan-400">{edge.relation}</span> →{' '}
                    {target?.name ?? edge.targetId}
                  </span>
                  <span className="font-mono text-slate-400 ml-2 shrink-0">
                    {edge.allocatedMw} MW
                  </span>
                </div>
              );
            })}
            {inboundEdges.map((edge) => {
              const source = nodeMap.get(edge.sourceId);
              return (
                <div
                  key={edge.id}
                  className="flex items-center justify-between bg-slate-900/40 border border-slate-800/70 rounded px-2.5 py-1.5 text-[11px]"
                >
                  <span className="truncate text-slate-400">
                    ← {source?.name ?? edge.sourceId}
                  </span>
                  <span className="font-mono text-slate-500 ml-2 shrink-0">
                    {edge.allocatedMw} MW
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
