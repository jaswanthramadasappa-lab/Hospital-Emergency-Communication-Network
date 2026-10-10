import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Radio, 
  Layers, 
  Terminal, 
  BarChart3, 
  ShieldAlert, 
  Wifi, 
  GitBranch, 
  Download, 
  Clock, 
  Heart,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { HospitalNetworkTopology, HOSPITAL_NODES } from './protocols/routing';
import { constructHospitalFrame } from './protocols/framing';
import { calculateCRC32 } from './protocols/crc';
import { PCAPWriter } from './protocols/pcapWriter';
import { NetworkCanvas } from './components/NetworkCanvas';
import { ProtocolLab } from './components/ProtocolLab';
import { WiresharkInspector } from './components/WiresharkInspector';
import { NSCodeStudio } from './components/NSCodeStudio';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState('CANVAS'); // 'CANVAS' | 'PROTOCOLS' | 'WIRESHARK' | 'NS_STUDIO' | 'ANALYTICS'
  const [routingAlgorithm, setRoutingAlgorithm] = useState('DIJKSTRA'); // 'DIJKSTRA' | 'DISTANCE_VECTOR'
  
  // Topology state
  const [topology] = useState(() => new HospitalNetworkTopology());
  const [topologyVersion, setTopologyVersion] = useState(0); // Trigger re-render on link toggle

  // Selection
  const [selectedSource, setSelectedSource] = useState('AMB');
  const [selectedDest, setSelectedDest] = useState('ED');

  // Animation & Packets
  const [activePackets, setActivePackets] = useState([]);
  const [packetsList, setPacketsList] = useState([]);
  const [packetCounter, setPacketCounter] = useState(1);

  // Statistics
  const [stats, setStats] = useState({
    totalSent: 0,
    totalDelivered: 0,
    retransmissions: 0,
    avgDelayMs: 5.8,
    throughputKbps: 3420,
    packetLossPercent: '0.0'
  });

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Toggle link active/disabled state
  const handleToggleLink = (linkId) => {
    topology.toggleLink(linkId);
    setTopologyVersion(v => v + 1);
  };

  // Dispatch and transmit a packet through the calculated shortest path
  const handleSendPacket = ({ src, dst, payload, priority = 1, msgType = 'EMERGENCY_ALERT' }) => {
    // Determine path based on routing algorithm
    let path = [];
    if (routingAlgorithm === 'DIJKSTRA') {
      const dijkstraResult = topology.runDijkstra(src);
      path = dijkstraResult.shortestPaths[dst]?.reachable ? dijkstraResult.shortestPaths[dst].path : [];
    } else {
      const dv = topology.runDistanceVector();
      let curr = src;
      path = [src];
      let visited = new Set([curr]);
      while (curr !== dst) {
        const next = dv.finalTables[curr]?.[dst]?.nextHop;
        if (!next || visited.has(next) || next === null) {
          path = [];
          break;
        }
        path.push(next);
        visited.add(next);
        curr = next;
      }
    }

    if (path.length < 2) {
      alert(`No active route found between ${src} and ${dst}. Please restore links on the topology.`);
      return;
    }

    const frame = constructHospitalFrame({
      srcNode: src,
      dstNode: dst,
      priority,
      msgType,
      seqNumber: packetCounter,
      payload
    });

    const srcNodeObj = topology.nodes[src];
    const dstNodeObj = topology.nodes[dst];

    // Build raw packet for PCAP & Wireshark dissection
    const rawBytes = PCAPWriter.buildRawEthernetPacket({
      srcMac: `02:00:00:00:00:0${src.charCodeAt(0) % 9}`,
      dstMac: `02:00:00:00:00:0${dst.charCodeAt(0) % 9}`,
      srcIp: srcNodeObj?.ip || '192.168.1.1',
      dstIp: dstNodeObj?.ip || '192.168.2.1',
      protocol: priority === 0 ? 17 : 6, // UDP for Emergency alerts, TCP for data
      payload: `[SHEPv1] Seq:${packetCounter} Pri:${priority} CRC:${frame.crc32} Data:${payload}`
    });

    const newPacketEntry = {
      id: 'PKT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      index: packetCounter,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString(),
      src: `${src} (${srcNodeObj?.name || src})`,
      dst: `${dst} (${dstNodeObj?.name || dst})`,
      srcIp: srcNodeObj?.ip || '192.168.1.1',
      dstIp: dstNodeObj?.ip || '192.168.2.1',
      srcMac: `02:00:00:00:00:0${src.charCodeAt(0) % 9}`,
      dstMac: `02:00:00:00:00:0${dst.charCodeAt(0) % 9}`,
      protocol: priority === 0 ? 'HOSP-EMERG' : msgType === 'PATIENT_VITALS' ? 'HOSP-VITALS' : 'TCP-RENO',
      transportProtocol: priority === 0 ? 'UDP' : 'TCP',
      priority,
      msgType,
      seqNumber: packetCounter,
      payload,
      crc32: '0x' + frame.crc32,
      rawBytes,
      length: rawBytes.length,
      info: `[Seq=${packetCounter}] ${msgType}: ${payload.slice(0, 32)}...`,
      path,
      progress: 0
    };

    setPacketCounter(c => c + 1);
    setPacketsList(prev => [...prev.slice(-99), newPacketEntry]); // Keep last 100 packets
    setActivePackets(prev => [...prev, newPacketEntry]);

    setStats(prev => ({
      ...prev,
      totalSent: prev.totalSent + 1,
      throughputKbps: Math.min(9800, prev.throughputKbps + 120)
    }));
  };

  // Animation frame runner for active packets traveling links
  useEffect(() => {
    let animId;
    const updatePacketPositions = () => {
      setActivePackets(prev => {
        const nextPackets = [];
        prev.forEach(pkt => {
          const speed = pkt.priority === 0 ? 0.025 : 0.016; // Emergency packets travel faster
          const nextProgress = pkt.progress + speed;
          if (nextProgress < 1.0) {
            nextPackets.push({ ...pkt, progress: nextProgress });
          } else {
            // Packet reached destination
            setStats(s => ({ ...s, totalDelivered: s.totalDelivered + 1 }));
          }
        });
        return nextPackets;
      });
      animId = requestAnimationFrame(updatePacketPositions);
    };

    animId = requestAnimationFrame(updatePacketPositions);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#0b1120]/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3">
            <div className="relative p-2 bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 rounded-xl">
              <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0b1120] animate-ping"></span>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-display font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-blue-400">
                Smart Hospital Emergency Network
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  System Operational
                </span>
                <span>•</span>
                <span>Time: {currentTime}</span>
              </div>
            </div>
          </div>

          {/* Routing Algorithm Switcher */}
          <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 px-2 font-semibold flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" /> Routing:
            </span>
            <button
              onClick={() => setRoutingAlgorithm('DIJKSTRA')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                routingAlgorithm === 'DIJKSTRA'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dijkstra (Link-State)
            </button>
            <button
              onClick={() => setRoutingAlgorithm('DISTANCE_VECTOR')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                routingAlgorithm === 'DISTANCE_VECTOR'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Distance Vector (RIP)
            </button>
          </div>

          {/* Main Module Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveMainTab('CANVAS')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMainTab === 'CANVAS'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              Live Topology
            </button>

            <button
              onClick={() => setActiveMainTab('PROTOCOLS')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMainTab === 'PROTOCOLS'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Protocol Lab
            </button>

            <button
              onClick={() => setActiveMainTab('WIRESHARK')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMainTab === 'WIRESHARK'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Wireshark Sniffer
            </button>

            <button
              onClick={() => setActiveMainTab('NS_STUDIO')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMainTab === 'NS_STUDIO'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              NS2 / NS3 Studio
            </button>

            <button
              onClick={() => setActiveMainTab('ANALYTICS')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMainTab === 'ANALYTICS'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              QoS & Analytics
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeMainTab === 'CANVAS' && (
          <NetworkCanvas
            topology={topology}
            onSendPacket={handleSendPacket}
            activePackets={activePackets}
            routingAlgorithm={routingAlgorithm}
            onToggleLink={handleToggleLink}
            selectedSource={selectedSource}
            setSelectedSource={setSelectedSource}
            selectedDest={selectedDest}
            setSelectedDest={setSelectedDest}
          />
        )}

        {activeMainTab === 'PROTOCOLS' && (
          <ProtocolLab topology={topology} />
        )}

        {activeMainTab === 'WIRESHARK' && (
          <WiresharkInspector
            packetsList={packetsList}
            onClearPackets={() => setPacketsList([])}
          />
        )}

        {activeMainTab === 'NS_STUDIO' && (
          <NSCodeStudio />
        )}

        {activeMainTab === 'ANALYTICS' && (
          <AnalyticsDashboard stats={stats} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 text-center text-xs text-slate-500 font-mono">
        Smart Hospital Emergency Communication Network • Computer Networks Lab Project • Framing, CRC, Go-Back-N, Dijkstra, Bellman-Ford, Wireshark, NS2/NS3
      </footer>
    </div>
  );
}
