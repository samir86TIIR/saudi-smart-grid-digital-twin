import { useCallback, useMemo, useState } from 'react';
import {
  Cpu,
  Eye,
  EyeOff,
  Pause,
  Play,
  Radio,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DEFAULT_KSA_VIEWPORT, REGION_VIEWPORTS } from './data/saudiEnergyDataset';
import { useGridTelemetry } from './hooks/useGridTelemetry';
import { SaudiGridMap } from './components/SaudiGridMap';
import { KpiHeaderStrip } from './components/KpiHeaderStrip';
import { NodeInspectionDrawer } from './components/NodeInspectionDrawer';
import { RightControlPanel } from './components/RightControlPanel';
import { ArchitectureModal } from './components/ArchitectureModal';
import { GridSiteNode, RegionKey, RegionViewport } from './types/grid';

export function App() {
  const {
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
  } = useGridTelemetry();

  const [viewport, setViewport] = useState<RegionViewport>(DEFAULT_KSA_VIEWPORT);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('SUB-JED-01');
  const [showArcs, setShowArcs] = useState<boolean>(true);
  const [showArchModal, setShowArchModal] = useState<boolean>(false);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const handleSelectNode = useCallback((node: GridSiteNode) => {
    setSelectedNodeId(node.id);
    setViewport({
      key: node.regionKey,
      label: node.name,
      shortLabel: node.regionLabel,
      longitude: node.coordinates[0],
      latitude: node.coordinates[1],
      zoom: 9.2,
      pitch: 45,
      bearing: 0,
    });
  }, []);

  const handleSelectSiteById = useCallback(
    (siteId: string) => {
      const target = nodes.find((n) => n.id === siteId);
      if (target) {
        handleSelectNode(target);
      }
    },
    [handleSelectNode, nodes]
  );

  const handleFocusRegion = useCallback((regionKey: RegionKey) => {
    const found = REGION_VIEWPORTS.find((v) => v.key === regionKey);
    if (found) setViewport(found);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#060A12] text-slate-100 overflow-hidden select-none">
      {/* Full-Bleed WebGL Map (MapLibre GL JS + Deck.gl) */}
      <SaudiGridMap
        nodes={nodes}
        edges={edges}
        viewport={viewport}
        selectedNodeId={selectedNodeId}
        blastRadius={blastRadius}
        showArcs={showArcs}
        onSelectNode={handleSelectNode}
      />

      {/* Top Executive Navigation & KPI HUD */}
      <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 p-3 space-y-2.5">
        <div className="pointer-events-auto glass-panel-strong rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-2xl">
          {/* Brand Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-400/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold tracking-wide text-slate-100">
                SAUDI SMART GRID DIGITAL TWIN
              </h1>
              <p className="text-[10px] font-mono text-slate-400">
                Executive Geospatial Control Room · KAPSARC Open Data
              </p>
            </div>
          </div>

          {/* Regional Quick-Fly Selector */}
          <nav className="flex items-center gap-1 flex-wrap" aria-label="Saudi regions">
            {REGION_VIEWPORTS.map((rv) => {
              const isActive = viewport.key === rv.key;
              return (
                <button
                  key={rv.key}
                  onClick={() => setViewport(rv)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    isActive
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  {rv.shortLabel}
                </button>
              );
            })}
          </nav>

          {/* Telemetry Mode & Controls */}
          <div className="flex items-center gap-1.5">
            {/* Live API vs Demo Replay Toggle */}
            <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 text-[10px] font-mono">
              <button
                onClick={() => toggleMode('demo_replay')}
                className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                  mode === 'demo_replay'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Demo Replay
              </button>
              <button
                onClick={() => toggleMode('live_api')}
                className={`px-2 py-1 rounded-md transition flex items-center gap-1 ${
                  mode === 'live_api'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className="w-3 h-3" />
                {liveConnected ? 'Live SSE' : 'Live API'}
              </button>
            </div>

            <button
              onClick={() => setIsPaused((p) => !p)}
              className="p-1.5 rounded-lg bg-slate-900/85 border border-slate-700/80 text-slate-300 hover:text-white transition"
              title={isPaused ? 'Resume Telemetry Replay' : 'Pause Telemetry Replay'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowArcs((a) => !a)}
              className="p-1.5 rounded-lg bg-slate-900/85 border border-slate-700/80 text-slate-300 hover:text-white transition"
              title={showArcs ? 'Hide Power Flow Arcs' : 'Show Power Flow Arcs'}
            >
              {showArcs ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowArchModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 transition"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Architecture &amp; DevSecOps</span>
            </button>
          </div>
        </div>

        {/* Optional FinOps Fallback Banner */}
        {fallbackNotice && (
          <div className="pointer-events-auto glass-panel rounded-lg px-3 py-1.5 text-[11px] font-mono text-amber-300 border-amber-500/40 flex items-center justify-between">
            <span>{fallbackNotice}</span>
          </div>
        )}

        {/* Executive KPI Cards */}
        <KpiHeaderStrip kpis={kpis} />
      </header>

      {/* Main Floating Panels (Left Inspection Drawer + Right Anomaly/KAPSARC Panel) */}
      <div className="pointer-events-none fixed top-[148px] bottom-11 left-3 right-3 z-20 flex items-start justify-between gap-3">
        <div>
          {selectedNode && (
            <NodeInspectionDrawer
              node={selectedNode}
              edges={edges}
              nodes={nodes}
              blastRadius={blastRadius}
              blastLoading={blastLoading}
              onRunBlastRadius={runBlastRadius}
              onClearBlastRadius={clearBlastRadius}
              onClose={() => {
                setSelectedNodeId(null);
                clearBlastRadius();
              }}
            />
          )}
        </div>

        <RightControlPanel
          anomalies={anomalies}
          onSelectSiteById={handleSelectSiteById}
          onFocusRegion={handleFocusRegion}
        />
      </div>

      {/* Bottom Legend & Mandatory KSA Compliance Footer */}
      <footer className="pointer-events-none fixed bottom-2 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto glass-panel rounded-lg px-3 py-1.5 flex items-center gap-3 text-[10px] font-mono text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Hub
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Renewable Source
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            Substation
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            Critical Asset
          </span>
          <span className="hidden sm:flex items-center gap-1.5 border-l border-slate-700 pl-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Warning
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Critical / Blast
          </span>
        </div>

        <div className="pointer-events-auto glass-panel rounded-lg px-3 py-1.5 text-[10px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Simulated Digital Twin Topology (KAPSARC Open Data) — No real critical infrastructure
            coordinates exposed.
          </span>
        </div>
      </footer>

      {showArchModal && <ArchitectureModal onClose={() => setShowArchModal(false)} />}
    </div>
  );
}

export default App;
