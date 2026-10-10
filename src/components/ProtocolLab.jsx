import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Binary, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Flame, 
  Cpu, 
  GitBranch, 
  TrendingUp, 
  Sliders, 
  Play, 
  Pause, 
  RotateCcw,
  Bug,
  Database
} from 'lucide-react';
import { 
  POLYNOMIALS, 
  calculateCRC32, 
  calculateCRC16, 
  textToBinaryString, 
  binaryStringToHex, 
  simulateBinaryPolynomialDivision, 
  verifyBinaryCRC, 
  injectBitErrors 
} from '../protocols/crc';
import { byteStuff, byteDestuff, bitStuff, bitDestuff, constructHospitalFrame } from '../protocols/framing';
import { GoBackNSimulator } from '../protocols/gobackn';
import { TCPCongestionController } from '../protocols/congestion';

export function ProtocolLab({ topology }) {
  const [activeTab, setActiveTab] = useState('CRC_FRAMING'); // 'CRC_FRAMING' | 'SLIDING_WINDOW' | 'ROUTING' | 'CONGESTION'

  // ==========================================
  // CRC & Framing State
  // ==========================================
  const [crcInputText, setCrcInputText] = useState('CODE_BLUE:ICU_BED_4');
  const [selectedPolyKey, setSelectedPolyKey] = useState('CRC16_CCITT');
  const [bitErrorPositions, setBitErrorPositions] = useState([]);
  const [framingMode, setFramingMode] = useState('BYTE_STUFFING'); // 'BYTE_STUFFING' | 'BIT_STUFFING'

  const polyInfo = POLYNOMIALS[selectedPolyKey];
  const inputBits = useMemo(() => textToBinaryString(crcInputText.slice(0, 12)), [crcInputText]);
  
  // Calculate polynomial division steps
  const crcSimResult = useMemo(() => {
    const genBits = polyInfo.binaryPoly.slice(0, 9); // Use 8-degree slice for readable step demo
    return simulateBinaryPolynomialDivision(inputBits.slice(0, 24), genBits);
  }, [inputBits, polyInfo]);

  // Corrupted transmission verification
  const corruptedData = useMemo(() => {
    return injectBitErrors(crcSimResult.transmittedBits, bitErrorPositions);
  }, [crcSimResult.transmittedBits, bitErrorPositions]);

  const crcVerification = useMemo(() => {
    const genBits = polyInfo.binaryPoly.slice(0, 9);
    return verifyBinaryCRC(corruptedData.corruptedBits, genBits);
  }, [corruptedData.corruptedBits, polyInfo]);

  // Framing byte & bit stuffing results
  const byteStuffResult = useMemo(() => {
    // Include deliberate 0x7E and 0x7D in test stream to show stuffing
    const encoder = new TextEncoder();
    const raw = encoder.encode(crcInputText);
    const withSpecialBytes = new Uint8Array(raw.length + 2);
    withSpecialBytes[0] = 0x7E; // FLAG
    withSpecialBytes.set(raw, 1);
    withSpecialBytes[withSpecialBytes.length - 1] = 0x7D; // ESC
    return byteStuff(withSpecialBytes);
  }, [crcInputText]);

  const bitStuffResult = useMemo(() => {
    // Inject a string with consecutive 1s to demonstrate bit stuffing
    const demoBits = inputBits + '11111100111110';
    return bitStuff(demoBits);
  }, [inputBits]);

  // ==========================================
  // Go-Back-N / Sliding Window State
  // ==========================================
  const [windowSize, setWindowSize] = useState(4);
  const [lossRate, setLossRate] = useState(0.15);
  const [gbnSimulator] = useState(() => new GoBackNSimulator({ windowSize: 4, packetLossRate: 0.15 }));
  const [gbnSnapshot, setGbnSnapshot] = useState(() => gbnSimulator.getStateSnapshot());

  useEffect(() => {
    gbnSimulator.onStateChange = (state) => setGbnSnapshot({ ...state });
    gbnSimulator.windowSize = windowSize;
    gbnSimulator.packetLossRate = lossRate;
  }, [windowSize, lossRate, gbnSimulator]);

  const handleQueueDemoPackets = () => {
    gbnSimulator.queueData([
      { summary: 'ECG Telemetry Segment #1' },
      { summary: 'Heart Rate Waveform #2' },
      { summary: 'SpO2 Oxygen Sensor #3' },
      { summary: 'Arterial BP Waveform #4' },
      { summary: 'Emergency Rx Order #5' },
      { summary: 'Blood Gas Analysis #6' },
      { summary: 'CT Scan Fragment #7' },
      { summary: 'Lab Culture Ack #8' }
    ]);
  };

  // ==========================================
  // Dijkstra & Distance Vector State
  // ==========================================
  const [dijkstraSource, setDijkstraSource] = useState('AMB');
  const dijkstraResult = useMemo(() => {
    return topology.runDijkstra(dijkstraSource);
  }, [topology, dijkstraSource, topology.links]);

  const dvResult = useMemo(() => {
    return topology.runDistanceVector();
  }, [topology, topology.links]);

  // ==========================================
  // TCP Congestion Control State
  // ==========================================
  const [congestionController] = useState(() => new TCPCongestionController({ initialCwnd: 1, initialSsthresh: 16 }));
  const [congestionState, setCongestionState] = useState(() => congestionController.getStatus());

  const handleCwndNewAck = () => {
    setCongestionState({ ...congestionController.onNewAck() });
  };
  const handleCwndDupAck = () => {
    setCongestionState({ ...congestionController.onDuplicateAck() });
  };
  const handleCwndTimeout = () => {
    setCongestionState({ ...congestionController.onTimeout() });
  };
  const handleCwndStepRtt = () => {
    setCongestionState({ ...congestionController.stepRttRound() });
  };
  const handleCwndReset = () => {
    congestionController.reset();
    setCongestionState({ ...congestionController.getStatus() });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab('CRC_FRAMING')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'CRC_FRAMING'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Binary className="w-4 h-4" />
          Framing & CRC Lab
        </button>

        <button
          onClick={() => setActiveTab('SLIDING_WINDOW')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'SLIDING_WINDOW'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Go-Back-N Sliding Window
        </button>

        <button
          onClick={() => setActiveTab('ROUTING')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'ROUTING'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          Dijkstra & Distance Vector
        </button>

        <button
          onClick={() => setActiveTab('CONGESTION')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'CONGESTION'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          TCP Congestion Control (AIMD)
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. FRAMING & CRC LAB                                       */}
      {/* ========================================================= */}
      {activeTab === 'CRC_FRAMING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls & Framing Inspection (Left 5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Data Input & Polynomial Config
              </h3>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Medical Telemetry Message:</label>
                  <input
                    type="text"
                    value={crcInputText}
                    onChange={(e) => setCrcInputText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">CRC Generator Polynomial:</label>
                  <select
                    value={selectedPolyKey}
                    onChange={(e) => setSelectedPolyKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg focus:border-cyan-500 focus:outline-none"
                  >
                    {Object.entries(POLYNOMIALS).map(([key, item]) => (
                      <option key={key} value={key}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                  <div className="text-slate-400">Generator Bits: <span className="text-cyan-400 font-bold">{polyInfo.binaryPoly.slice(0, 16)}...</span></div>
                  <div className="text-slate-400">Standard IEEE 802.3 CRC-32: <span className="text-emerald-400 font-bold">0x{calculateCRC32(crcInputText).toString(16).toUpperCase()}</span></div>
                  <div className="text-slate-400">Standard CRC-16: <span className="text-blue-400 font-bold">0x{calculateCRC16(crcInputText).toString(16).toUpperCase()}</span></div>
                </div>
              </div>
            </div>

            {/* Framing Mode: Byte Stuffing vs Bit Stuffing */}
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Data Link Framing Details
                </h3>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setFramingMode('BYTE_STUFFING')}
                    className={`px-2 py-0.5 rounded ${framingMode === 'BYTE_STUFFING' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
                  >
                    Byte Stuffing
                  </button>
                  <button
                    onClick={() => setFramingMode('BIT_STUFFING')}
                    className={`px-2 py-0.5 rounded ${framingMode === 'BIT_STUFFING' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
                  >
                    Bit Stuffing
                  </button>
                </div>
              </div>

              {framingMode === 'BYTE_STUFFING' ? (
                <div className="space-y-2 text-xs">
                  <div className="text-slate-400">
                    Flag Byte: <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">0x7E (~)</code> | Escape Byte: <code className="text-pink-400 bg-slate-900 px-1 py-0.5 rounded">0x7D ({'}'})</code>
                  </div>
                  <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 font-mono text-[11px] break-all">
                    <span className="text-amber-400">[0x7E FLAG] </span>
                    <span className="text-slate-200">
                      {Array.from(byteStuffResult.stuffedBytes).slice(0, 16).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}...
                    </span>
                    <span className="text-amber-400"> [0x7E FLAG]</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Stuffed Operations: <strong className="text-cyan-400">{byteStuffResult.operations.length} bytes escaped</strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="text-slate-400">
                    HDLC Flag: <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">01111110</code> (Stuff '0' after five consecutive '1's)
                  </div>
                  <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 font-mono text-[11px] break-all">
                    <span className="text-amber-400">01111110 </span>
                    <span className="text-slate-200">{bitStuffResult.stuffedBits.slice(0, 32)}...</span>
                    <span className="text-amber-400"> 01111110</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bit Insertions: <strong className="text-cyan-400">{bitStuffResult.insertions.length} bit(s) stuffed</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CRC Polynomial Division Steps & Bit Error Injection (Right 7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Binary className="w-4 h-4 text-cyan-400" />
                  Modulo-2 Polynomial Division Trace
                </h3>
                <span className="text-xs font-mono text-cyan-400">
                  Remainder CRC: {crcSimResult.remainder} (0x{crcSimResult.remainderHex})
                </span>
              </div>

              {/* Division Step Flow Box */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto max-h-56 space-y-1.5">
                <div className="text-slate-400 pb-1 border-b border-slate-800">
                  Augmented Data (Data + 0s): <span className="text-slate-200">{crcSimResult.augmentedData}</span>
                </div>
                {crcSimResult.steps.slice(0, 6).map((st, i) => (
                  <div key={i} className="text-[11px] text-slate-300">
                    <span className="text-cyan-400">Step {st.stepIndex}: </span>
                    Bit pos {st.bitPosition} &rarr; Chunk: <span className="text-amber-300">{st.dividendChunk}</span> XOR Divisor <span className="text-pink-300">{st.divisor}</span> &rarr; Rem: <span className="text-emerald-400">{st.xorResult}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Error Injection & Syndrome Verification */}
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Bug className="w-4 h-4 text-red-400" />
                  Channel Bit Error Injection & Syndrome Verification
                </h3>
                <button
                  onClick={() => setBitErrorPositions([])}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Bits
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Click any transmitted bit below to inject an electrical noise bit flip and observe CRC error detection:
                </p>

                {/* Interactive Bit Array */}
                <div className="flex flex-wrap gap-1 p-2 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                  {corruptedData.corruptedBits.split('').map((bit, idx) => {
                    const isFlipped = bitErrorPositions.includes(idx);
                    const isCrcPart = idx >= crcSimResult.dataBits.length;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isFlipped) {
                            setBitErrorPositions(bitErrorPositions.filter(p => p !== idx));
                          } else {
                            setBitErrorPositions([...bitErrorPositions, idx]);
                          }
                        }}
                        className={`w-6 h-7 rounded flex items-center justify-center font-bold transition-all ${
                          isFlipped
                            ? 'bg-red-500 text-slate-950 animate-pulse ring-2 ring-red-400'
                            : isCrcPart
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 hover:bg-cyan-800'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                        title={`Bit #${idx} (${isCrcPart ? 'CRC Field' : 'Payload Field'})`}
                      >
                        {bit}
                      </button>
                    );
                  })}
                </div>

                {/* CRC Verification Alert Status */}
                <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-bold ${
                  crcVerification.isValid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {crcVerification.isValid ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
                    )}
                    <span>
                      {crcVerification.isValid
                        ? 'CRC Check Passed: 0 Bit Errors Detected (Integrity Verified)'
                        : `CRC Check FAILED: Frame Corruption Detected (${bitErrorPositions.length} bit error(s) injected)`}
                    </span>
                  </div>
                  <span className="font-mono text-[11px]">
                    Remainder: {crcVerification.finalRemainder}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. GO-BACK-N SLIDING WINDOW LAB                           */}
      {/* ========================================================= */}
      {activeTab === 'SLIDING_WINDOW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Window State & Controls (Left 6 Cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Protocol Parameters
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleQueueDemoPackets}
                    className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold"
                  >
                    + Queue 8 Packets
                  </button>
                  <button
                    onClick={() => gbnSimulator.reset()}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <label className="text-slate-400 block mb-1">Window Size N ({windowSize}):</label>
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={windowSize}
                    onChange={(e) => setWindowSize(parseInt(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    {windowSize === 1 ? 'N=1 (Stop-and-Wait Mode)' : `N=${windowSize} (Go-Back-N Mode)`}
                  </span>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Simulated Channel Loss ({Math.round(lossRate * 100)}%):</label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={lossRate}
                    onChange={(e) => setLossRate(parseFloat(e.target.value))}
                    className="w-full accent-red-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => gbnSimulator.sendNextPacket(false)}
                  disabled={!gbnSnapshot.sender.canSend || gbnSnapshot.sender.bufferLength === 0}
                  className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-all"
                >
                  Send Next (TX)
                </button>

                <button
                  onClick={() => gbnSimulator.sendNextPacket(true)}
                  disabled={!gbnSnapshot.sender.canSend || gbnSnapshot.sender.bufferLength === 0}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/50 font-bold text-xs rounded-lg transition-all"
                >
                  Force Loss (Drop)
                </button>

                <button
                  onClick={() => gbnSimulator.handleTimeout()}
                  disabled={gbnSnapshot.sender.inFlightCount === 0}
                  className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/50 font-bold text-xs rounded-lg transition-all"
                >
                  Trigger Timeout
                </button>
              </div>
            </div>

            {/* Visual Sliding Window Component */}
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 mb-2">Sender Sequence Number Space (Mod 8)</h3>
              
              <div className="flex gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 justify-center">
                {Array.from({ length: 8 }).map((_, seq) => {
                  const base = gbnSnapshot.sender.base;
                  const nextSeq = gbnSnapshot.sender.nextSeqNum;
                  const N = gbnSnapshot.windowSize;
                  
                  // Check if seq is inside window [base .. (base+N-1) mod 8]
                  const inWindow = (nextSeq >= base)
                    ? (seq >= base && seq < (base + N) % 8) || (base + N > 8 && (seq >= base || seq < (base + N) % 8))
                    : (seq >= base || seq < (base + N) % 8);

                  const isInFlight = gbnSnapshot.sender.inFlight.some(p => p.seq === seq);

                  return (
                    <div
                      key={seq}
                      className={`w-12 h-14 rounded-xl flex flex-col items-center justify-center border font-mono font-bold text-xs transition-all ${
                        isInFlight
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                          : seq === base
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400'
                          : inWindow
                          ? 'bg-slate-800/80 border-slate-600 text-slate-300'
                          : 'bg-slate-900/40 border-slate-800/50 text-slate-600'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 font-sans">Seq</span>
                      <span className="text-sm">#{seq}</span>
                      {seq === base && <span className="text-[8px] text-cyan-400 font-sans uppercase">Base</span>}
                    </div>
                  );
                })}
              </div>

              {/* Legend & Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3">
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Queue Remaining</div>
                  <div className="text-slate-200 font-bold font-mono">{gbnSnapshot.sender.bufferLength} pkts</div>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">In-Flight (Unacked)</div>
                  <div className="text-amber-400 font-bold font-mono">{gbnSnapshot.sender.inFlightCount} pkts</div>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Receiver Expected</div>
                  <div className="text-emerald-400 font-bold font-mono">Seq #{gbnSnapshot.receiver.expectedSeqNum}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Log & Trace Stream (Right 6 Cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Protocol Event Stream
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Delivered: <strong className="text-emerald-400">{gbnSnapshot.sender.stats.completedTransmissions}</strong> | Retransmits: <strong className="text-amber-400">{gbnSnapshot.sender.stats.retransmissions}</strong>
                </span>
              </div>

              <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs overflow-y-auto max-h-80 space-y-1.5">
                {gbnSnapshot.latestLogs.length === 0 ? (
                  <div className="text-slate-600 text-center py-8">Queue packets and click "Send Next" to trace protocol events...</div>
                ) : (
                  gbnSnapshot.latestLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`text-[11px] py-1 border-b border-slate-900 ${
                        log.type === 'DROP'
                          ? 'text-red-400 font-bold'
                          : log.type === 'TIMEOUT'
                          ? 'text-amber-400 font-bold'
                          : log.type === 'ACK_RCV'
                          ? 'text-emerald-400'
                          : log.type === 'DELIVER'
                          ? 'text-cyan-300'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="text-slate-500 mr-2">[{log.timestamp}]</span>
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. DIJKSTRA & DISTANCE VECTOR LAB                         */}
      {/* ========================================================= */}
      {activeTab === 'ROUTING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Dijkstra Trace (Left 6 Cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  Dijkstra's Link-State Algorithm
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-semibold">Source:</label>
                  <select
                    value={dijkstraSource}
                    onChange={(e) => setDijkstraSource(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-1 rounded"
                  >
                    {Object.keys(topology.nodes).map(id => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shortest Paths Result Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
                {Object.entries(dijkstraResult.shortestPaths).map(([dst, info]) => (
                  <div key={dst} className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>To {dst}</span>
                      <span className="text-cyan-400 font-bold">{info.cost === Infinity ? 'Unreachable' : `${info.cost} ms`}</span>
                    </div>
                    <div className="text-slate-200 font-bold mt-1 text-[11px] truncate">
                      {info.path.join(' → ') || 'No Path'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Step-by-Step Relaxation Trace */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5">
                <div className="text-slate-400 pb-1 border-b border-slate-800 text-[11px]">Execution Relaxation Trace:</div>
                {dijkstraResult.traceSteps.map((st) => (
                  <div key={st.step} className="text-[11px] text-slate-300">
                    <span className="text-cyan-400">Step {st.step}: </span>
                    {st.description}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Distance Vector Routing (Right 6 Cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Distance Vector Routing (Bellman-Ford)
                </h3>
                <span className="text-xs text-emerald-400 font-mono">
                  Converged in {dvResult.totalRounds} round(s)
                </span>
              </div>

              {/* Final Routing Matrix Sample */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-left font-mono text-[11px] border border-slate-800">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="p-1.5 border border-slate-800">Node</th>
                      {Object.keys(topology.nodes).map(n => (
                        <th key={n} className="p-1.5 border border-slate-800 text-center">{n}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(topology.nodes).map(src => (
                      <tr key={src} className="hover:bg-slate-900/50">
                        <td className="p-1.5 border border-slate-800 font-bold text-cyan-400">{src}</td>
                        {Object.keys(topology.nodes).map(dst => {
                          const entry = dvResult.finalTables[src]?.[dst];
                          return (
                            <td key={dst} className="p-1.5 border border-slate-800 text-center">
                              {entry?.cost === Infinity ? '∞' : `${entry?.cost} (${entry?.nextHop})`}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bellman-Ford Convergence Rounds Log */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs max-h-48 overflow-y-auto space-y-1.5">
                <div className="text-slate-400 pb-1 border-b border-slate-800 text-[11px]">Vector Exchange Rounds:</div>
                {dvResult.iterationLogs.map((log) => (
                  <div key={log.round} className="text-[11px] text-slate-300">
                    <span className="text-emerald-400">Round {log.round}: </span>
                    {log.description}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TCP CONGESTION CONTROL LAB                             */}
      {/* ========================================================= */}
      {activeTab === 'CONGESTION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls & State Machine Gauges (Left 4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                TCP Reno State Machine
              </h3>

              <div className="space-y-3 mb-4">
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Current Phase:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                    congestionState.state === 'SLOW_START'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : congestionState.state === 'CONGESTION_AVOIDANCE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {congestionState.state}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">CWND (MSS)</div>
                    <div className="text-xl font-mono font-bold text-cyan-400">{congestionState.cwnd}</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400">SSTHRESH (MSS)</div>
                    <div className="text-xl font-mono font-bold text-pink-400">{congestionState.ssthresh}</div>
                  </div>
                </div>
              </div>

              {/* Event Triggers */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCwndStepRtt}
                  className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-lg transition-all"
                >
                  Step 1 Full RTT Round (Success)
                </button>
                <button
                  onClick={handleCwndNewAck}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
                >
                  Receive Single ACK
                </button>
                <button
                  onClick={handleCwndDupAck}
                  className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-lg"
                >
                  Receive Duplicate ACK ({congestionState.duplicateAcks}/3)
                </button>
                <button
                  onClick={handleCwndTimeout}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold rounded-lg"
                >
                  Trigger Timeout (Packet Drop)
                </button>
                <button
                  onClick={handleCwndReset}
                  className="px-3 py-1 text-slate-500 hover:text-slate-300 text-xs text-center mt-1"
                >
                  Reset Controller
                </button>
              </div>
            </div>
          </div>

          {/* CWND Chart Visualizer (Right 8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Congestion Window (CWND) Evolution Graph
                </h3>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> CWND
                  </span>
                  <span className="flex items-center gap-1 text-pink-400">
                    <span className="w-2.5 h-0.5 bg-pink-400"></span> SSTHRESH
                  </span>
                </div>
              </div>

              {/* SVG Line Chart */}
              <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-800 min-h-[220px] flex items-end">
                <svg className="w-full h-56" viewBox="0 0 600 200">
                  {/* Grid Lines */}
                  {[40, 80, 120, 160].map(y => (
                    <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#1e293b" strokeDasharray="2,2" />
                  ))}

                  {/* Polyline for CWND */}
                  {congestionState.history.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="2.5"
                      points={congestionState.history.map((h, idx) => {
                        const x = (idx / (congestionState.history.length - 1)) * 580 + 10;
                        const y = 190 - (h.cwnd / 36) * 170;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  )}

                  {/* Points on CWND */}
                  {congestionState.history.map((h, idx) => {
                    const x = (idx / (congestionState.history.length - 1 || 1)) * 580 + 10;
                    const y = 190 - (h.cwnd / 36) * 170;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill={h.event === 'TIMEOUT_COLLAPSE' ? '#ef4444' : h.event.includes('FAST') ? '#f59e0b' : '#00f0ff'}
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Theory Note */}
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                💡 <strong>AIMD</strong>: In Congestion Avoidance, CWND increases by 1 MSS per RTT (Additive Increase). On packet loss / 3 dup ACKs, SSTHRESH halves and CWND decreases to SSTHRESH (Multiplicative Decrease).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
