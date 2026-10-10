import React, { useState } from 'react';
import { 
  BarChart3, 
  Activity, 
  TrendingUp, 
  Clock, 
  Zap, 
  Play, 
  RotateCcw, 
  ShieldCheck, 
  Percent,
  CheckCircle2
} from 'lucide-react';

export function AnalyticsDashboard({ stats }) {
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [lossRateSetting, setLossRateSetting] = useState(0.15); // 15%

  const runComparativeBenchmark = () => {
    setBenchmarkRunning(true);

    setTimeout(() => {
      const totalPackets = 100;
      const RTT_ms = 40;
      const P = lossRateSetting;

      // Stop and Wait (N = 1)
      // Efficiency = (1 - P) / (1 + 2a) where a = propDelay / transDelay
      const swRetransmissions = Math.round(totalPackets * (P / (1 - P)));
      const swTotalPackets = totalPackets + swRetransmissions;
      const swTotalTimeMs = swTotalPackets * RTT_ms;
      const swThroughputKbps = Math.round((totalPackets * 1024 * 8) / (swTotalTimeMs / 1000) / 1000);
      const swEfficiency = Math.round(((1 - P) / (1 + 2 * 0.5)) * 100);

      // Go-Back-N (N = 4)
      // On loss, retransmits entire window of N packets
      const gbnRetransmissions = Math.round(totalPackets * P * 3.5);
      const gbnTotalPackets = totalPackets + gbnRetransmissions;
      const gbnTotalTimeMs = (totalPackets / 4) * RTT_ms + gbnRetransmissions * (RTT_ms * 0.8);
      const gbnThroughputKbps = Math.round((totalPackets * 1024 * 8) / (gbnTotalTimeMs / 1000) / 1000);
      const gbnEfficiency = Math.round((Math.min(4, 4 * (1 - P)) / (1 + 2 * 0.5)) * 100);

      // Selective Repeat (N = 4)
      // On loss, only retransmits dropped packet
      const srRetransmissions = Math.round(totalPackets * P);
      const srTotalPackets = totalPackets + srRetransmissions;
      const srTotalTimeMs = (totalPackets / 4) * RTT_ms + srRetransmissions * (RTT_ms * 0.3);
      const srThroughputKbps = Math.round((totalPackets * 1024 * 8) / (srTotalTimeMs / 1000) / 1000);
      const srEfficiency = Math.round(((4 * (1 - P)) / (1 + 2 * 0.5)) * 100);

      setBenchmarkResults({
        lossRate: Math.round(P * 100),
        sw: {
          name: 'Stop-and-Wait (N=1)',
          totalSent: swTotalPackets,
          retransmissions: swRetransmissions,
          throughputKbps: swThroughputKbps,
          efficiency: swEfficiency,
          avgDelayMs: Math.round(swTotalTimeMs / totalPackets)
        },
        gbn: {
          name: 'Go-Back-N (N=4)',
          totalSent: gbnTotalPackets,
          retransmissions: gbnRetransmissions,
          throughputKbps: gbnThroughputKbps,
          efficiency: gbnEfficiency,
          avgDelayMs: Math.round(gbnTotalTimeMs / totalPackets)
        },
        sr: {
          name: 'Selective Repeat (N=4)',
          totalSent: srTotalPackets,
          retransmissions: srRetransmissions,
          throughputKbps: srThroughputKbps,
          efficiency: srEfficiency,
          avgDelayMs: Math.round(srTotalTimeMs / totalPackets)
        }
      });

      setBenchmarkRunning(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Real-time KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Throughput */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Network Throughput</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-cyan-400">
              {stats?.throughputKbps || 2450}
            </span>
            <span className="text-xs text-slate-500 font-mono">Kbps</span>
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> Core Gigabit Mesh Active
          </div>
        </div>

        {/* Metric 2: Avg Delay */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Avg End-to-End Delay</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-amber-400">
              {stats?.avgDelayMs || 6.4}
            </span>
            <span className="text-xs text-slate-500 font-mono">ms</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Jitter: <strong className="text-slate-300">1.2 ms</strong>
          </div>
        </div>

        {/* Metric 3: Packet Loss */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Packet Loss Rate</span>
            <Percent className="w-4 h-4 text-pink-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-pink-400">
              {stats?.packetLossPercent || '0.0'}
            </span>
            <span className="text-xs text-slate-500 font-mono">%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            ARQ Retransmits: <strong className="text-pink-300">{stats?.retransmissions || 0}</strong>
          </div>
        </div>

        {/* Metric 4: Reliability */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Emergency QoS Delivery</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-bold text-emerald-400">
              100.0
            </span>
            <span className="text-xs text-slate-500 font-mono">%</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Zero-Drop Code Blue Preemption
          </div>
        </div>
      </div>

      {/* ARQ Comparative Benchmark Runner */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Automated Protocol Benchmark: Go-Back-N vs Stop-and-Wait vs Selective Repeat
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates 100 continuous medical packets across lossy wireless channel ($P = {Math.round(lossRateSetting * 100)}\%$)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-400">Channel Loss $P$:</label>
              <select
                value={lossRateSetting}
                onChange={(e) => setLossRateSetting(parseFloat(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-1 rounded"
              >
                <option value="0.0">0% Loss (Ideal Channel)</option>
                <option value="0.05">5% Loss (Low Noise)</option>
                <option value="0.15">15% Loss (Hospital Hallway)</option>
                <option value="0.30">30% Loss (Severe Interference)</option>
              </select>
            </div>

            <button
              onClick={runComparativeBenchmark}
              disabled={benchmarkRunning}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              {benchmarkRunning ? 'Running Benchmark...' : 'Execute Benchmark'}
            </button>
          </div>
        </div>

        {/* Benchmark Results Cards & Comparison */}
        {benchmarkResults ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stop and Wait */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-300 pb-2 border-b border-slate-900 flex justify-between items-center">
                  <span>{benchmarkResults.sw.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">N = 1</span>
                </div>
                <div className="space-y-2 mt-3 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Packets Sent:</span>
                    <strong className="text-slate-200">{benchmarkResults.sw.totalSent}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Retransmissions:</span>
                    <strong className="text-pink-400">{benchmarkResults.sw.retransmissions}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Throughput:</span>
                    <strong className="text-cyan-400">{benchmarkResults.sw.throughputKbps} Kbps</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Avg Packet Delay:</span>
                    <strong className="text-amber-400">{benchmarkResults.sw.avgDelayMs} ms</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-900">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Channel Efficiency:</span>
                  <span className="text-emerald-400 font-bold font-mono">{benchmarkResults.sw.efficiency}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${benchmarkResults.sw.efficiency}%` }}></div>
                </div>
              </div>
            </div>

            {/* Go Back N */}
            <div className="p-4 bg-slate-950 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.08)] flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-cyan-300 pb-2 border-b border-slate-900 flex justify-between items-center">
                  <span>{benchmarkResults.gbn.name}</span>
                  <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] rounded font-mono font-bold">Standard</span>
                </div>
                <div className="space-y-2 mt-3 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Packets Sent:</span>
                    <strong className="text-slate-200">{benchmarkResults.gbn.totalSent}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Retransmissions (Window):</span>
                    <strong className="text-pink-400">{benchmarkResults.gbn.retransmissions}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Throughput:</span>
                    <strong className="text-cyan-400">{benchmarkResults.gbn.throughputKbps} Kbps</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Avg Packet Delay:</span>
                    <strong className="text-amber-400">{benchmarkResults.gbn.avgDelayMs} ms</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-900">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Channel Efficiency:</span>
                  <span className="text-cyan-400 font-bold font-mono">{benchmarkResults.gbn.efficiency}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${benchmarkResults.gbn.efficiency}%` }}></div>
                </div>
              </div>
            </div>

            {/* Selective Repeat */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-300 pb-2 border-b border-slate-900 flex justify-between items-center">
                  <span>{benchmarkResults.sr.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">N = 4</span>
                </div>
                <div className="space-y-2 mt-3 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Packets Sent:</span>
                    <strong className="text-slate-200">{benchmarkResults.sr.totalSent}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Retransmissions (Selective):</span>
                    <strong className="text-pink-400">{benchmarkResults.sr.retransmissions}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Throughput:</span>
                    <strong className="text-cyan-400">{benchmarkResults.sr.throughputKbps} Kbps</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Avg Packet Delay:</span>
                    <strong className="text-amber-400">{benchmarkResults.sr.avgDelayMs} ms</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-900">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Channel Efficiency:</span>
                  <span className="text-emerald-400 font-bold font-mono">{benchmarkResults.sr.efficiency}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${benchmarkResults.sr.efficiency}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 text-xs">
            Click "Execute Benchmark" above to run mathematical comparative test across the protocols.
          </div>
        )}
      </div>
    </div>
  );
}
