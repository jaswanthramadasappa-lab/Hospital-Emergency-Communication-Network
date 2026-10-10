import React, { useState, useMemo } from 'react';
import { 
  Code, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Sliders, 
  FileText, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { generateNS2Script } from '../exporters/ns2_generator';
import { generateNS3CppScript, generateNS3PythonScript } from '../exporters/ns3_generator';

export function NSCodeStudio() {
  const [activeTab, setActiveTab] = useState('NS2_TCL'); // 'NS2_TCL' | 'NS3_CPP' | 'NS3_PY'
  const [simulationTime, setSimulationTime] = useState(10);
  const [packetSize, setPacketSize] = useState(1024);
  const [dataRate, setDataRate] = useState('2Mb');
  const [copied, setCopied] = useState(false);

  // Generate scripts dynamically based on tuned parameters
  const ns2Code = useMemo(() => {
    return generateNS2Script({ simulationTime, packetSize, dataRate });
  }, [simulationTime, packetSize, dataRate]);

  const ns3CppCode = useMemo(() => {
    return generateNS3CppScript({ simulationTime, packetSize, dataRate: `${dataRate}ps` });
  }, [simulationTime, packetSize, dataRate]);

  const ns3PyCode = useMemo(() => {
    return generateNS3PythonScript({ simulationTime, packetSize, dataRate: `${dataRate}ps` });
  }, [simulationTime, packetSize, dataRate]);

  const currentCode = activeTab === 'NS2_TCL' ? ns2Code : activeTab === 'NS3_CPP' ? ns3CppCode : ns3PyCode;
  const currentFilename = activeTab === 'NS2_TCL' ? 'hospital_network.tcl' : activeTab === 'NS3_CPP' ? 'hospital_network.cc' : 'hospital_network.py';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Studio Header & Script Selector */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('NS2_TCL')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'NS2_TCL'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            NS-2 OTcl Script (.tcl)
          </button>

          <button
            onClick={() => setActiveTab('NS3_CPP')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'NS3_CPP'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            NS-3 C++ Script (.cc)
          </button>

          <button
            onClick={() => setActiveTab('NS3_PY')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'NS3_PY'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            NS-3 Python Script (.py)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download {currentFilename}
          </button>
        </div>
      </div>

      {/* Parameter Customizer */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="text-slate-400 block mb-1">Simulation Time: <strong className="text-cyan-400">{simulationTime}s</strong></label>
          <input
            type="range"
            min="5"
            max="60"
            value={simulationTime}
            onChange={(e) => setSimulationTime(parseInt(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div>
          <label className="text-slate-400 block mb-1">Packet Size: <strong className="text-cyan-400">{packetSize} Bytes</strong></label>
          <input
            type="range"
            min="256"
            max="2048"
            step="128"
            value={packetSize}
            onChange={(e) => setPacketSize(parseInt(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div>
          <label className="text-slate-400 block mb-1">CBR Data Rate:</label>
          <select
            value={dataRate}
            onChange={(e) => setDataRate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-lg focus:outline-none"
          >
            <option value="1Mb">1 Mbps (Standard Telemetry)</option>
            <option value="2Mb">2 Mbps (High-res ECG stream)</option>
            <option value="10Mb">10 Mbps (Bulk DICOM scan)</option>
            <option value="50Mb">50 Mbps (Gigabit Uplink)</option>
          </select>
        </div>
      </div>

      {/* Code Viewer & Terminal Run Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Code View (Left 8 Cols) */}
        <div className="lg:col-span-8 glass-panel rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[520px]">
          <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              {currentFilename}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Syntax: {activeTab === 'NS2_TCL' ? 'Tcl' : activeTab === 'NS3_CPP' ? 'C++17' : 'Python 3'}</span>
          </div>

          <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed select-text">
            <pre className="whitespace-pre">{currentCode}</pre>
          </div>
        </div>

        {/* Instructions & Commands Pane (Right 4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              How to Execute Simulation
            </h4>

            {activeTab === 'NS2_TCL' ? (
              <div className="space-y-2 text-xs">
                <p className="text-slate-400">1. Save the generated script as <code className="text-cyan-300 font-mono">hospital_network.tcl</code></p>
                <p className="text-slate-400">2. Run NS-2 simulation in terminal:</p>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[11px]">
                  ns hospital_network.tcl
                </div>
                <p className="text-slate-400">3. View network animation in NAM:</p>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[11px]">
                  nam hospital_network.nam
                </div>
                <p className="text-slate-400">4. Trace output saved to <code className="text-cyan-300 font-mono">hospital_trace.tr</code></p>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <p className="text-slate-400">1. Place <code className="text-cyan-300 font-mono">{currentFilename}</code> in NS-3 <code className="text-cyan-300 font-mono">scratch/</code> directory</p>
                <p className="text-slate-400">2. Compile & execute using ns3 wrapper:</p>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[11px]">
                  ./ns3 run hospital_network
                </div>
                <p className="text-slate-400">3. Inspect generated <code className="text-cyan-300 font-mono">.pcap</code> traces in Wireshark:</p>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[11px]">
                  wireshark hospital-wireshark-trace-0-0.pcap
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Academic Concepts Illustrated
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Duplex link capacity (1000Mbps core vs 50Mbps wireless)</li>
              <li>Dynamic link failure (<code className="text-red-400 font-mono">rtmodel-at 4.0 down</code>)</li>
              <li>TCP Reno Sliding Window vs UDP CBR traffic</li>
              <li>DropTail / RED queue management and buffer overflow</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
