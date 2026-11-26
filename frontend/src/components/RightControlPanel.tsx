import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Radio,
} from 'lucide-react';
import { KAPSARC_REGIONAL_SUMMARIES } from '../data/saudiEnergyDataset';
import { AnomalyAlert, RegionKey } from '../types/grid';

interface RightControlPanelProps {
  anomalies: AnomalyAlert[];
  onSelectSiteById: (siteId: string) => void;
  onFocusRegion: (regionKey: RegionKey) => void;
}

function formatAgo(iso: string): string {
  const diffSec = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.floor(diffSec / 60)}m ago`;
}

export function RightControlPanel({
  anomalies,
  onSelectSiteById,
  onFocusRegion,
}: RightControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'anomalies' | 'kapsarc'>('anomalies');

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto glass-panel-strong rounded-lg px-2.5 py-3 text-slate-200 hover:text-cyan-300 flex flex-col items-center gap-2 shadow-xl transition"
        title="Expand Control Feed"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-widest [writing-mode:vertical-rl]">
          Flink &amp; KAPSARC
        </span>
      </button>
    );
  }

  return (
    <aside className="pointer-events-auto glass-panel-strong w-[340px] max-h-[calc(100vh-195px)] rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Tabs Header */}
      <div className="px-3 py-2.5 border-b border-slate-700/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'anomalies'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Anomaly Feed
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 rounded">
              {anomalies.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('kapsarc')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'kapsarc'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            KAPSARC
          </button>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80"
          aria-label="Collapse panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-3 overflow-y-auto space-y-2.5 flex-1">
        {activeTab === 'anomalies' ? (
          anomalies.map((alert) => (
            <button
              key={alert.id}
              onClick={() => onSelectSiteById(alert.siteId)}
              className={`w-full text-left rounded-lg p-2.5 border transition hover:brightness-110 ${
                alert.severity === 'critical'
                  ? 'bg-red-950/35 border-red-500/40'
                  : 'bg-amber-950/30 border-amber-500/35'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-mono font-semibold uppercase flex items-center gap-1 ${
                    alert.severity === 'critical' ? 'text-red-400' : 'text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {alert.anomalyType.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {formatAgo(alert.timestamp)}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-100 mt-1">
                {alert.siteName}
              </p>
              <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                <span className="text-slate-300">{alert.metricValue}</span>
                <span className="text-slate-400">{alert.threshold}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                {alert.recommendedAction}
              </p>
            </button>
          ))
        ) : (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 leading-relaxed">
              Calibrated against <strong className="text-slate-200">KAPSARC Open Data</strong>{' '}
              provincial demand curves and Saudi Vision 2030 NREP renewable targets. Click any
              region to focus.
            </div>
            {KAPSARC_REGIONAL_SUMMARIES.map((region) => {
              const progressPct = Math.min(
                100,
                Math.round((region.currentRenewablePct / region.renewableTarget2030Pct) * 100)
              );
              return (
                <button
                  key={region.regionKey}
                  onClick={() => onFocusRegion(region.regionKey)}
                  className="w-full text-left bg-slate-900/75 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-lg p-2.5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100">
                      {region.regionName}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300">
                      {region.annualConsumptionTwh} TWh/yr
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{region.secArea}</p>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400">
                      Renewable: {region.currentRenewablePct}% / {region.renewableTarget2030Pct}%
                    </span>
                    <span className="text-amber-300">
                      HVAC: {region.summerPeakMultiplier}x
                    </span>
                  </div>
                  <div className="mt-1 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                    {region.primaryDriver}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
