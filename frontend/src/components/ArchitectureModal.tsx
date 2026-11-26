import { ExternalLink, Layers, Lock, Server, ShieldCheck, X } from 'lucide-react';

interface ArchitectureModalProps {
  onClose: () => void;
}

const GITHUB_REPO_URL = 'https://github.com/samir86TIIR/saudi-smart-grid-digital-twin';

export function ArchitectureModal({ onClose }: ArchitectureModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="glass-panel-strong max-w-2xl w-full rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/70 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
              Saudi Vision 2030 · Sovereign Cloud Blueprint
            </p>
            <h2 className="text-base font-bold text-slate-100 mt-0.5">
              Architecture, Sovereignty &amp; DevSecOps Stack
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            aria-label="Close architecture modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          <p className="leading-relaxed text-slate-300">
            This executive Control Room is the geospatial presentation layer of the{' '}
            <strong className="text-slate-100">Saudi Smart Grid Digital Twin</strong> — an
            end-to-end streaming analytics and operational ontology platform engineered for
            100k+ msg/s AMI smart-meter telemetry across KSA Vision 2030 hubs.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-1.5">
                <Layers className="w-4 h-4" />
                Streaming &amp; Ontology Pipeline
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                <li>KAPSARC Open Data + Python Async IoT Simulator</li>
                <li>Apache Kafka 3.7+ KRaft (Snappy, 100k+ msg/s)</li>
                <li>Apache Flink 1.18 (1-min tumbling windows, &lt;500ms)</li>
                <li>ArangoDB Graph Ontology + BigQuery Storage Write API</li>
                <li>FastAPI SSE Gateway → React + Deck.gl + MapLibre</li>
              </ul>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1.5">
                <ShieldCheck className="w-4 h-4" />
                Sovereignty &amp; DevSecOps Gates
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                <li>100% GCP Sovereign Region: <code>me-central2</code> (Dammam)</li>
                <li>SDAIA NDMO &amp; NCA ECC-1:2018 CMEK 90-day rotation</li>
                <li>Private GKE Cluster + Calico Default-Deny NetworkPolicy</li>
                <li>Automated Checkov IaC &amp; Trivy Container CI/CD Scans</li>
                <li>Zero real critical infrastructure coordinates exposed</li>
              </ul>
            </div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <Server className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-emerald-300">FinOps Zero-Cost Resilience:</strong> Hosted
              statically on GitHub Pages with an automatic client-side{' '}
              <span className="font-mono text-slate-100">Demo Replay Mode</span> when the GKE /
              FastAPI backend is scaled to zero, saving over 51% in cloud runtime costs while
              remaining 24/7 demo-ready for executives.
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Open-Source Reference Architecture (Apache 2.0)
            </span>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-200 font-semibold text-xs transition"
            >
              View GitHub Repository
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
