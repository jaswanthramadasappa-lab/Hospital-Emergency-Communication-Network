/**
 * Binary PCAP (libpcap 2.4) File Generator
 * Converts simulated hospital network frames into standard .pcap binary format
 * ready to be opened in Wireshark for deep packet inspection.
 */

export class PCAPWriter {
  constructor() {
    this.packets = [];
  }

  /**
   * Convert IP string (e.g. '192.168.1.1') to 4-byte array
   */
  static ipToBytes(ipStr) {
    const parts = ipStr.split('.').map(p => parseInt(p, 10));
    return new Uint8Array(parts.length === 4 ? parts : [192, 168, 1, 1]);
  }

  /**
   * Convert MAC string (e.g. '02:00:00:00:01:01') to 6-byte array
   */
  static macToBytes(macStr) {
    const parts = macStr.split(':').map(p => parseInt(p, 16));
    return new Uint8Array(parts.length === 6 ? parts : [0x02, 0x00, 0x00, 0x00, 0x01, 0x01]);
  }

  /**
   * Create an Ethernet II + IPv4 + UDP/TCP packet buffer
   */
  static buildRawEthernetPacket({
    srcMac = '02:00:00:00:00:01',
    dstMac = '02:00:00:00:00:02',
    srcIp = '192.168.1.1',
    dstIp = '192.168.2.1',
    srcPort = 5000,
    dstPort = 5000,
    protocol = 17, // 17: UDP, 6: TCP
    payload = ''
  }) {
    const encoder = new TextEncoder();
    const payloadBytes = typeof payload === 'string' ? encoder.encode(payload) : payload;

    const ethHeaderLen = 14;
    const ipHeaderLen = 20;
    const transportHeaderLen = protocol === 6 ? 20 : 8; // TCP: 20B, UDP: 8B
    const totalLen = ethHeaderLen + ipHeaderLen + transportHeaderLen + payloadBytes.length;

    const buffer = new Uint8Array(totalLen);
    const view = new DataView(buffer.buffer);

    // 1. Ethernet Header (14 bytes)
    const dstMacBytes = PCAPWriter.macToBytes(dstMac);
    const srcMacBytes = PCAPWriter.macToBytes(srcMac);
    buffer.set(dstMacBytes, 0);
    buffer.set(srcMacBytes, 6);
    view.setUint16(12, 0x0800, false); // EtherType: IPv4 (Big Endian)

    // 2. IPv4 Header (20 bytes)
    const ipOffset = 14;
    buffer[ipOffset] = 0x45; // Version 4, Header Length 5 (20 bytes)
    buffer[ipOffset + 1] = 0x00; // DSCP / ECN
    view.setUint16(ipOffset + 2, ipHeaderLen + transportHeaderLen + payloadBytes.length, false); // Total Length
    view.setUint16(ipOffset + 4, Math.floor(Math.random() * 65535), false); // Identification
    view.setUint16(ipOffset + 6, 0x4000, false); // Flags: Don't Fragment
    buffer[ipOffset + 8] = 64; // TTL = 64
    buffer[ipOffset + 9] = protocol; // Protocol (6 for TCP, 17 for UDP)
    view.setUint16(ipOffset + 10, 0x0000, false); // Checksum placeholder

    const srcIpBytes = PCAPWriter.ipToBytes(srcIp);
    const dstIpBytes = PCAPWriter.ipToBytes(dstIp);
    buffer.set(srcIpBytes, ipOffset + 12);
    buffer.set(dstIpBytes, ipOffset + 16);

    // 3. Transport Header
    const transOffset = ipOffset + 20;
    if (protocol === 17) {
      // UDP
      view.setUint16(transOffset, srcPort, false);
      view.setUint16(transOffset + 2, dstPort, false);
      view.setUint16(transOffset + 4, 8 + payloadBytes.length, false); // Length
      view.setUint16(transOffset + 6, 0x0000, false); // Checksum
      buffer.set(payloadBytes, transOffset + 8);
    } else {
      // TCP
      view.setUint16(transOffset, srcPort, false);
      view.setUint16(transOffset + 2, dstPort, false);
      view.setUint32(transOffset + 4, Math.floor(Math.random() * 100000), false); // Seq Num
      view.setUint32(transOffset + 8, 0, false); // Ack Num
      buffer[transOffset + 12] = 0x50; // Data offset 5 (20 bytes)
      buffer[transOffset + 13] = 0x18; // Flags: PSH, ACK
      view.setUint16(transOffset + 14, 65535, false); // Window size
      view.setUint16(transOffset + 16, 0x0000, false); // Checksum
      view.setUint16(transOffset + 18, 0x0000, false); // Urgent ptr
      buffer.set(payloadBytes, transOffset + 20);
    }

    return buffer;
  }

  /**
   * Export all recorded packets as a standard binary Uint8Array in PCAP format
   */
  static generatePCAPBlob(packetsList) {
    // 24-byte PCAP Global Header
    const globalHeaderLen = 24;
    let totalSize = globalHeaderLen;

    packetsList.forEach(pkt => {
      totalSize += 16 + pkt.rawBytes.length; // 16-byte Packet Header + raw bytes
    });

    const pcapBuffer = new Uint8Array(totalSize);
    const view = new DataView(pcapBuffer.buffer);

    // Global Header (Little Endian standard)
    view.setUint32(0, 0xa1b2c3d4, true); // Magic Number (microsecond resolution)
    view.setUint16(4, 2, true);          // Version Major: 2
    view.setUint16(6, 4, true);          // Version Minor: 4
    view.setInt32(8, 0, true);           // Timezone GMT
    view.setUint32(12, 0, true);         // Sigfigs
    view.setUint32(16, 65535, true);     // Snaplen (max packet length)
    view.setUint32(20, 1, true);         // LinkType: 1 = LINKTYPE_ETHERNET

    let offset = globalHeaderLen;

    packetsList.forEach(pkt => {
      const ts = pkt.timestamp || Date.now();
      const tsSec = Math.floor(ts / 1000);
      const tsUsec = (ts % 1000) * 1000;
      const len = pkt.rawBytes.length;

      // 16-byte Packet Header
      view.setUint32(offset, tsSec, true);
      view.setUint32(offset + 4, tsUsec, true);
      view.setUint32(offset + 8, len, true);   // Captured length
      view.setUint32(offset + 12, len, true);  // Original wire length
      offset += 16;

      // Raw Packet Data
      pcapBuffer.set(pkt.rawBytes, offset);
      offset += len;
    });

    return new Blob([pcapBuffer], { type: 'application/vnd.tcpdump.pcap' });
  }

  /**
   * Trigger automatic browser download of generated .pcap file
   */
  static downloadPCAP(packetsList, filename = 'hospital_emergency_network.pcap') {
    const blob = PCAPWriter.generatePCAPBlob(packetsList);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
