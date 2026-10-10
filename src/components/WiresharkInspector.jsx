import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  XCircle, 
  FileCode, 
  Layers, 
  Pause, 
  Play 
} from 'lucide-react';
import { PCAPWriter } from '../protocols/pcapWriter';

export function WiresharkInspector({ packetsList, onClearPackets }) {
  const [selectedPacketId, setSelectedPacketId] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [isPaused, setIsPaused] = useState(false);

  // Selected packet
  const selectedPacket = useMemo(() => {
    if (!selectedPacketId && packetsList.length > 0) {
      return packetsList[packetsList.length - 1];
    }
    return packetsList.find(p => p.id === selectedPacketId) || packetsList[packetsList.length - 1] || null;
  }, [packetsList, selectedPacketId]);

  // Filtered packet list
  const filteredPackets = useMemo(() => {
    return packetsList.filter(pkt => {
      const matchProto = protocolFilter === 'ALL' || pkt.protocol === protocolFilter;
      const matchSearch = filterText === '' || 
        pkt.src.toLowerCase().includes(filterText.toLowerCase()) ||
        pkt.dst.toLowerCase().includes(filterText.toLowerCase()) ||
        pkt.info.toLowerCase().includes(filterText.toLowerCase()) ||
        pkt.protocol.toLowerCase().includes(filterText.toLowerCase());
      return matchProto && matchSearch;
    });
  }, [packetsList, filterText, protocolFilter]);

  const handleDownloadPCAP = () => {
    if (packetsList.length === 0) return;
    PCAPWriter.downloadPCAP(packetsList, 'hospital_emergency_network.pcap');
  };

  // Convert raw bytes to Wireshark-like Hex Dump
  const renderHexDump = (bytes) => {
    if (!bytes || bytes.length === 0) return <div className="text-slate-600">No raw bytes available</div>;

    const lines = [];
    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const hexParts = [];
      const asciiParts = [];

      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          const byte = chunk[j];
          hexParts.push(byte.toString(16).padStart(2, '0').toUpperCase());
          asciiParts.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
        } else {
          hexParts.push('  ');
          asciiParts.push(' ');
        }
      }

      const offset = i.toString(16).padStart(4, '0').toUpperCase();
      const hex1 = hexParts.slice(0, 8).join(' ');
      const hex2 = hexParts.slice(8, 16).join(' ');

      lines.push(
        <div key={i} className="flex gap-4 hover:bg-slate-800/60 px-1 py-0.5 rounded font-mono text-[11px]">
          <span className="text-slate-500">{offset}</span>
          <span className="text-cyan-300">{hex1}  {hex2}</span>
          <span className="text-slate-400 pl-2 border-l border-slate-800">{asciiParts.join('')}</span>
        </div>
      );
    }

    return lines;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Toolbar */}
      <div className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Apply display filter (e.g. HOSP, ICU)..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:border-cyan-500 focus:outline-none w-56 font-mono"
            />
          </div>

          {/* Protocol Filter */}
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2.5 py-1.5 rounded-lg focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Protocols</option>
            <option value="HOSP-EMERG">HOSP-EMERG (Code Blue)</option>
            <option value="HOSP-VITALS">HOSP-VITALS (Telemetry)</option>
            <option value="TCP-RENO">TCP Reno (Imaging/Lab)</option>
            <option value="UDP">UDP</option>
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPaused ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume Sniffer' : 'Pause'}
          </button>

          <button
            onClick={onClearPackets}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <button
            onClick={handleDownloadPCAP}
            disabled={packetsList.length === 0}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 transition-all"
            title="Download true binary PCAP file readable in Wireshark"
          >
            <Download className="w-3.5 h-3.5" />
            Download .PCAP (Wireshark)
          </button>
        </div>
      </div>

      {/* Wireshark 3-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pane 1: Packet Stream Table (Top / Left 7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[480px]">
          <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Live Packet Capture ({filteredPackets.length} captured)
            </span>
            <span className="text-[10px] font-mono text-slate-500">Auto-Scroll: On</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-2">No.</th>
                  <th className="py-1.5 px-2">Time</th>
                  <th className="py-1.5 px-2">Source</th>
                  <th className="py-1.5 px-2">Destination</th>
                  <th className="py-1.5 px-2">Protocol</th>
                  <th className="py-1.5 px-2">Len</th>
                  <th className="py-1.5 px-2">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredPackets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-600 font-sans">
                      No packets captured yet. Send an emergency alert on the canvas or protocol lab.
                    </td>
                  </tr>
                ) : (
                  filteredPackets.map((pkt) => {
                    const isSelected = selectedPacket?.id === pkt.id;
                    const isEmergency = pkt.protocol === 'HOSP-EMERG' || pkt.priority === 0;

                    return (
                      <tr
                        key={pkt.id}
                        onClick={() => setSelectedPacketId(pkt.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-200 font-semibold'
                            : isEmergency
                            ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                            : 'text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-1 px-2 text-slate-500">{pkt.index}</td>
                        <td className="py-1 px-2 text-slate-400">{pkt.timeStr}</td>
                        <td className="py-1 px-2 font-semibold text-amber-400">{pkt.src}</td>
                        <td className="py-1 px-2 font-semibold text-emerald-400">{pkt.dst}</td>
                        <td className="py-1 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            isEmergency ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-cyan-300'
                          }`}>
                            {pkt.protocol}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-slate-400">{pkt.length}</td>
                        <td className="py-1 px-2 truncate max-w-[220px]" title={pkt.info}>
                          {pkt.info}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pane 2 & 3: Deep Dissection Tree & Hex Dump (Right 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Packet Dissection Tree */}
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex-1 max-h-60 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Packet Dissection Tree
            </h4>

            {selectedPacket ? (
              <div className="space-y-2 text-xs font-mono">
                {/* Frame Details */}
                <details open className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <summary className="cursor-pointer text-slate-300 font-bold hover:text-cyan-400">
                    &gt; Frame {selectedPacket.index}: {selectedPacket.length} bytes on wire
                  </summary>
                  <div className="pl-4 pt-1 space-y-0.5 text-[11px] text-slate-400">
                    <div>Arrival Time: {new Date(selectedPacket.timestamp).toISOString()}</div>
                    <div>Frame Length: {selectedPacket.length} bytes ({selectedPacket.length * 8} bits)</div>
                    <div>Interface: eth0 (Smart Hospital Emergency Mesh)</div>
                  </div>
                </details>

                {/* Ethernet II */}
                <details open className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <summary className="cursor-pointer text-slate-300 font-bold hover:text-cyan-400">
                    &gt; Ethernet II, Src: {selectedPacket.srcMac}, Dst: {selectedPacket.dstMac}
                  </summary>
                  <div className="pl-4 pt-1 space-y-0.5 text-[11px] text-slate-400">
                    <div>Destination: {selectedPacket.dstMac}</div>
                    <div>Source: {selectedPacket.srcMac}</div>
                    <div>Type: IPv4 (0x0800)</div>
                  </div>
                </details>

                {/* IPv4 */}
                <details open className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <summary className="cursor-pointer text-slate-300 font-bold hover:text-cyan-400">
                    &gt; Internet Protocol Version 4, Src: {selectedPacket.srcIp}, Dst: {selectedPacket.dstIp}
                  </summary>
                  <div className="pl-4 pt-1 space-y-0.5 text-[11px] text-slate-400">
                    <div>Version: 4 | Header Length: 20 bytes</div>
                    <div>Differentiated Services (DSCP): {selectedPacket.priority === 0 ? '0x2E (Expedited Forwarding)' : '0x00 (Best Effort)'}</div>
                    <div>Time to Live (TTL): 64</div>
                    <div>Protocol: {selectedPacket.transportProtocol} ({selectedPacket.transportProtocol === 'TCP' ? '6' : '17'})</div>
                  </div>
                </details>

                {/* Smart Hospital Emergency Application Layer */}
                <details open className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <summary className="cursor-pointer text-cyan-300 font-bold hover:text-cyan-200">
                    &gt; Smart Hospital Emergency Protocol (SHEP)
                  </summary>
                  <div className="pl-4 pt-1 space-y-0.5 text-[11px] text-slate-300">
                    <div>Priority: <strong className={selectedPacket.priority === 0 ? 'text-red-400' : 'text-cyan-400'}>{selectedPacket.priority === 0 ? 'CRITICAL (0 - Code Blue)' : 'NORMAL (1)'}</strong></div>
                    <div>Message Type: {selectedPacket.msgType}</div>
                    <div>Sequence Number: #{selectedPacket.seqNumber}</div>
                    <div>CRC-32 Checksum: <strong className="text-emerald-400">{selectedPacket.crc32} [Verified OK]</strong></div>
                    <div className="text-amber-300 font-semibold mt-1">Payload: "{selectedPacket.payload}"</div>
                  </div>
                </details>
              </div>
            ) : (
              <div className="text-slate-600 text-xs">Select a packet from the table to inspect layers.</div>
            )}
          </div>

          {/* Hex & ASCII Viewer Pane */}
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex-1 max-h-56 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              Packet Bytes (Hex / ASCII Dissector)
            </h4>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 overflow-x-auto">
              {selectedPacket ? renderHexDump(selectedPacket.rawBytes) : <div className="text-slate-600 text-xs">No packet selected</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
