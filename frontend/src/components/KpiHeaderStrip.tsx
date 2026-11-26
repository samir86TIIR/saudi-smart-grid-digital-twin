import { Activity, AlertTriangle, Gauge, Leaf, ThermometerSun, Zap } from 'lucide-react';
import { NationalKpis } from '../types/grid';

interface KpiHeaderStripProps {
  kpis: NationalKpis;
}

export function KpiHeaderStrip({ kpis }: KpiHeaderStripProps) {
  return (
    <div className="pointer-events-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      <div className="glass-panel rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
          <span>National Load</span>
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-lg font-mono font-semibold text-slate-100">
            {kpis.nationalLoadMw.toLocaleString()}
          </span>
          <span className="text-[11px] font-mono text-slate-400">MW</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">
          {(kpis.activeSmartMeters / 1_000_000).toFixed(2)}M AMI Meters
        </p>
      </div>

      <div className="glass-panel rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
          <span>Renewable Share</span>
          <Leaf className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-lg font-mono font-semibold text-emerald-400">
            {kpis.renewableSharePct.toFixed(1)}%
          </span>
          <span className="text-[10px] font-mono text-emerald-500/80">Vision 2030</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">Target: 50% by 2030</p>
      </div>

      <div className="glass-panel rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
          <span>Active Anomalies</span>
          <AlertTriangle
            className={`w-3.5 h-3.5 ${
              kpis.activeAnomalies > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={`text-lg font-mono font-semibold ${
              kpis.activeAnomalies > 0 ? 'text-amber-300' : 'text-emerald-400'
            }`}
          >
            {kpis.activeAnomalies}
          </span>
          <span className="text-[10px] font-mono text-slate-400">Flink Alerts</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">Volt-VAR Auto-Watch</p>
      </div>

      <div className="glass-panel rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
          <span>P99 Latency</span>
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-lg font-mono font-semibold text-slate-100">
            {kpis.p99LatencyMs}
          </span>
          <span className="text-[11px] font-mono text-slate-400">ms</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">Kafka → Flink SLA &lt;500ms</p>
      </div>

      <div className="glass-panel rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
          <span>Grid Frequency</span>
          <Gauge className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-lg font-mono font-semibold text-slate-100">
            {kpis.gridFrequencyHz.toFixed(2)}
          </span>
          <span className="text-[11px] font-mono text-slate-400">Hz</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">SEC Nominal 60.0 Hz</p>
      </div>

      <div className="glass-panel rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
          <span>KAPSARC HVAC</span>
          <ThermometerSun className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-lg font-mono font-semibold text-orange-300">
            {kpis.hvacPeakIndex.toFixed(2)}x
          </span>
          <span className="text-[10px] font-mono text-slate-400">Summer</span>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">Diurnal Cooling Factor</p>
      </div>
    </div>
  );
}
