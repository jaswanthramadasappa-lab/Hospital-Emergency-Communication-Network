import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  Activity, 
  Heart, 
  Radio, 
  Server, 
  Ambulance, 
  Pill, 
  FlaskConical, 
  Scissors, 
  ShieldAlert, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Zap,
  Volume2,
  VolumeX,
  Layers,
  Send
} from 'lucide-react';
import { soundManager } from './AudioSynthesizer';

export function NetworkCanvas({
  topology,
  onSendPacket,
  activePackets,
  routingAlgorithm,
  onToggleLink,
  selectedSource,
  setSelectedSource,
  selectedDest,
  setSelectedDest
}) {
  const [selectedPreset, setSelectedPreset] = useState('CODE_BLUE');
  const [customPayload, setCustomPayload] = useState('CRITICAL: Vent Failure in Bay 3');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activePath, setActivePath] = useState([]);

  // Compute active path whenever source, dest, or topology changes
  useEffect(() => {
    if (routingAlgorithm === 'DIJKSTRA') {
      const result = topology.runDijkstra(selectedSource);
      if (result.shortestPaths[selectedDest]?.reachable) {
        setActivePath(result.shortestPaths[selectedDest].path);
      } else {
        setActivePath([]);
      }
    } else {
      const dv = topology.runDistanceVector();
      // Reconstruct path from Distance Vector next-hop pointers
      const path = [selectedSource];
      let curr = selectedSource;
      let visited = new Set([curr]);
      let reachable = true;

      while (curr !== selectedDest) {
        const next = dv.finalTables[curr]?.[selectedDest]?.nextHop;
        if (!next || visited.has(next) || next === null) {
          reachable = false;
          break;
        }
        path.push(next);
        visited.add(next);
        curr = next;
      }
      setActivePath(reachable ? path : []);
    }
  }, [selectedSource, selectedDest, topology, routingAlgorithm, topology.links]);

  const handleTriggerPreset = (type) => {
    let src = 'AMB';
    let dst = 'ICU';
    let payload = '';
    let priority = 1;
    let msgType = 'EMERGENCY_ALERT';

    switch (type) {
      case 'CODE_BLUE':
        src = 'ED';
        dst = 'ICU';
        payload = 'CODE BLUE: Cardiac Arrest in Resuscitation Bay 1. Crash Cart Required!';
        priority = 0; // Highest priority
        msgType = 'CODE_BLUE';
        soundManager.playEmergencyAlarm();
        break;
      case 'VITALS':
        src = 'AMB';
        dst = 'OT';
        payload = 'VITALS: HR: 134 bpm, SpO2: 89%, BP: 82/48 mmHg, ECG: ST-Elevation';
        priority = 1;
        msgType = 'PATIENT_VITALS';
        soundManager.playHeartbeat();
        break;
      case 'LAB_MRI':
        src = 'LAB';
        dst = 'SRV';
        payload = 'DICOM_IMG: Brain CT Scan Series 402 - 128 Slices [CRC-32 Verified]';
        priority = 2;
        msgType = 'LAB_REPORT';
        soundManager.playAckChime();
        break;
      case 'PHARMACY':
        src = 'OT';
        dst = 'PHARM';
        payload = 'RX_ORDER: Urgent Epinephrine 1mg/10ml & Atropine 0.5mg IV Push';
        priority = 1;
        msgType = 'PHARMACY_ORDER';
        soundManager.playAckChime();
        break;
      default:
        break;
    }

    setSelectedSource(src);
    setSelectedDest(dst);
    onSendPacket({
      src,
      dst,
      payload,
      priority,
      msgType
    });
  };

  const handleCustomSend = (e) => {
    e.preventDefault();
    if (!customPayload.trim()) return;

    soundManager.playAckChime();
    onSendPacket({
      src: selectedSource,
      dst: selectedDest,
      payload: customPayload,
      priority: 1,
      msgType: 'CUSTOM_DATA'
    });
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
  };

  // Node Icons
  const getNodeIcon = (id) => {
    switch (id) {
      case 'AMB': return <Ambulance className="w-6 h-6 text-amber-400 animate-pulse" />;
      case 'ED': return <AlertTriangle className="w-6 h-6 text-red-400" />;
      case 'ICU': return <Activity className="w-6 h-6 text-pink-400" />;
      case 'OT': return <Scissors className="w-6 h-6 text-purple-400" />;
      case 'LAB': return <FlaskConical className="w-6 h-6 text-cyan-400" />;
      case 'PHARM': return <Pill className="w-6 h-6 text-emerald-400" />;
      case 'SRV': return <Server className="w-6 h-6 text-blue-400" />;
      default: return <Radio className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner & Emergency Scenarios Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2 font-display text-sm font-bold tracking-wider uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            Emergency Dispatch System
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Routing: <strong className="text-cyan-400">{routingAlgorithm}</strong> | Nodes: <strong className="text-slate-200">7 Active</strong>
          </span>
        </div>

        {/* Quick Emergency Broadcast Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleTriggerPreset('CODE_BLUE')}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-red-500/20"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-bounce" />
            🚨 Code Blue
          </button>
          <button
            onClick={() => handleTriggerPreset('VITALS')}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Heart className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            🚑 Ambulance Vitals
          </button>
          <button
            onClick={() => handleTriggerPreset('LAB_MRI')}
            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            🧪 Lab MRI Transfer
          </button>
          <button
            onClick={() => handleTriggerPreset('PHARMACY')}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Pill className="w-3.5 h-3.5 text-emerald-400" />
            💊 Pharmacy Order
          </button>
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              soundEnabled ? 'bg-slate-800 text-cyan-400 border-cyan-500/40' : 'bg-slate-900 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'Audio Alerts Enabled' : 'Audio Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Network Topology Canvas */}
      <div className="relative w-full h-[520px] rounded-2xl bg-[#090e1a] border border-slate-800/80 shadow-2xl overflow-hidden grid-bg select-none">
        
        {/* Background Radar Effect */}
        <div className="absolute inset-0 radar-sweep opacity-30 pointer-events-none"></div>

        {/* Legend / Status Overlay */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-xl">
          <div className="font-semibold text-slate-200 flex items-center gap-2 pb-1 border-b border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Topology Status: Online
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-3 h-0.5 bg-cyan-400"></span> Active Shortest Path
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-3 h-0.5 bg-slate-600"></span> Standby Duplex Link
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-3 h-0.5 bg-red-500/80 border-dashed"></span> Severed / Down Link
          </div>
          <div className="text-[10px] text-amber-400/90 pt-1 font-mono">
            💡 Click any link line to test dynamic rerouting!
          </div>
        </div>

        {/* Path Indicator Banner */}
        <div className="absolute top-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono shadow-xl flex items-center gap-2">
          <span className="text-slate-400">Active Path ({selectedSource} &rarr; {selectedDest}):</span>
          {activePath.length > 0 ? (
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              {activePath.join(' → ')}
            </span>
          ) : (
            <span className="text-red-400 font-bold flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> No Route Available
            </span>
          )}
        </div>

        {/* SVG Drawing Layer for Links & In-Flight Animated Packets */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 960 480">
          <defs>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="activeLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Render Duplex Network Links */}
          {topology.links.map(link => {
            const srcNode = topology.nodes[link.source];
            const dstNode = topology.nodes[link.target];
            if (!srcNode || !dstNode) return null;

            // Check if this link is part of current active path
            const isInPath = activePath.some((nodeId, idx) => {
              if (idx === activePath.length - 1) return false;
              const nextNode = activePath[idx + 1];
              return (
                (link.source === nodeId && link.target === nextNode) ||
                (link.source === nextNode && link.target === nodeId)
              );
            });

            const midX = (srcNode.x + dstNode.x) / 2;
            const midY = (srcNode.y + dstNode.y) / 2;

            return (
              <g key={link.id} className="cursor-pointer pointer-events-auto" onClick={() => onToggleLink(link.id)}>
                {/* Clickable hit area */}
                <line
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={dstNode.x}
                  y2={dstNode.y}
                  stroke="transparent"
                  strokeWidth="24"
                />

                {/* Visible Link Line */}
                <line
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={dstNode.x}
                  y2={dstNode.y}
                  stroke={
                    !link.active
                      ? '#ef4444'
                      : isInPath
                      ? 'url(#activeLinkGrad)'
                      : '#334155'
                  }
                  strokeWidth={isInPath && link.active ? '3.5' : '2'}
                  strokeDasharray={!link.active ? '6,6' : isInPath ? 'none' : '4,4'}
                  filter={isInPath && link.active ? 'url(#glow-cyan)' : 'none'}
                  className="transition-all duration-300"
                />

                {/* Link Cost & Metric Badge */}
                <rect
                  x={midX - 22}
                  y={midY - 11}
                  width="44"
                  height="22"
                  rx="6"
                  fill={!link.active ? '#450a0a' : isInPath ? '#083344' : '#0f172a'}
                  stroke={!link.active ? '#ef4444' : isInPath ? '#00f0ff' : '#334155'}
                  strokeWidth="1.2"
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fill={!link.active ? '#fca5a5' : isInPath ? '#38bdf8' : '#94a3b8'}
                  fontSize="9.5"
                  fontFamily="JetBrains Mono"
                  fontWeight="bold"
                >
                  {link.active ? `${link.cost}ms` : 'DOWN'}
                </text>
              </g>
            );
          })}

          {/* Render In-Flight Animated Packets */}
          {activePackets.map(pkt => {
            const pathNodes = pkt.path.map(id => topology.nodes[id]).filter(Boolean);
            if (pathNodes.length < 2) return null;

            // Calculate current coordinates based on packet progress (0 to 1)
            const totalSegments = pathNodes.length - 1;
            const scaledProgress = pkt.progress * totalSegments;
            const currentSegment = Math.min(Math.floor(scaledProgress), totalSegments - 1);
            const segmentT = scaledProgress - currentSegment;

            const p1 = pathNodes[currentSegment];
            const p2 = pathNodes[currentSegment + 1];

            const curX = p1.x + (p2.x - p1.x) * segmentT;
            const curY = p1.y + (p2.y - p1.y) * segmentT;

            return (
              <g key={pkt.id} className="pointer-events-none">
                {/* Packet Glow Aura */}
                <circle
                  cx={curX}
                  cy={curY}
                  r={pkt.priority === 0 ? 12 : 9}
                  fill={pkt.priority === 0 ? '#ef4444' : '#00f0ff'}
                  opacity="0.3"
                  className="animate-ping"
                />
                {/* Packet Core */}
                <circle
                  cx={curX}
                  cy={curY}
                  r={pkt.priority === 0 ? 7 : 5}
                  fill={pkt.priority === 0 ? '#ff2a2a' : '#00f0ff'}
                  filter={pkt.priority === 0 ? 'url(#glow-red)' : 'url(#glow-cyan)'}
                />
                {/* Packet Tooltip Label */}
                <rect
                  x={curX - 28}
                  y={curY - 24}
                  width="56"
                  height="16"
                  rx="4"
                  fill="#020617"
                  stroke={pkt.priority === 0 ? '#ef4444' : '#00f0ff'}
                  strokeWidth="1"
                  opacity="0.9"
                />
                <text
                  x={curX}
                  y={curY - 13}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8"
                  fontFamily="JetBrains Mono"
                  fontWeight="bold"
                >
                  {pkt.msgType.slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Render Interactive Node Elements (DOM Layer) */}
        {Object.values(topology.nodes).map(node => {
          const isSource = selectedSource === node.id;
          const isDest = selectedDest === node.id;
          const isInPath = activePath.includes(node.id);

          return (
            <div
              key={node.id}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => {
                if (selectedSource === node.id) {
                  // toggle or keep
                } else if (!selectedSource) {
                  setSelectedSource(node.id);
                } else {
                  setSelectedDest(node.id);
                }
              }}
              className={`absolute z-30 flex flex-col items-center cursor-pointer transition-all duration-300 group`}
            >
              {/* Node Pulse Effect if Critical */}
              {node.type === 'critical' && (
                <div className="absolute -inset-2 bg-pink-500/20 rounded-2xl blur-sm animate-pulse-fast pointer-events-none"></div>
              )}

              {/* Node Avatar Box */}
              <div
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isSource
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-110'
                    : isDest
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-2 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110'
                    : isInPath
                    ? 'bg-slate-800/95 border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                    : 'bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 hover:scale-105 shadow-lg'
                }`}
              >
                {getNodeIcon(node.id)}

                {/* Badge for Source / Target */}
                {isSource && (
                  <span className="absolute -top-2 -left-2 px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-md uppercase tracking-wider shadow">
                    SRC
                  </span>
                )}
                {isDest && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[9px] rounded-md uppercase tracking-wider shadow">
                    DST
                  </span>
                )}
              </div>

              {/* Node Label & IP */}
              <div className="mt-1.5 flex flex-col items-center pointer-events-none">
                <span className="text-xs font-bold text-slate-100 tracking-wide bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                  {node.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {node.ip}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Transmission & Routing Selection Controls */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold">Source:</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
            >
              {Object.values(topology.nodes).map(n => (
                <option key={n.id} value={n.id}>{n.id} - {n.name}</option>
              ))}
            </select>
          </div>

          <div className="text-slate-500">&rarr;</div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold">Destination:</label>
            <select
              value={selectedDest}
              onChange={(e) => setSelectedDest(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 focus:outline-none"
            >
              {Object.values(topology.nodes).map(n => (
                <option key={n.id} value={n.id}>{n.id} - {n.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Payload Form */}
        <form onSubmit={handleCustomSend} className="flex-1 min-w-[300px] flex items-center gap-2">
          <input
            type="text"
            value={customPayload}
            onChange={(e) => setCustomPayload(e.target.value)}
            placeholder="Type custom patient or hospital telemetry message..."
            className="flex-1 bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:border-cyan-500 focus:outline-none placeholder:text-slate-500 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send Frame
          </button>
        </form>
      </div>
    </div>
  );
}
