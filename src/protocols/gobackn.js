/**
 * Sliding Window & Reliable Transmission Protocols:
 * - Go-Back-N (GBN) ARQ
 * - Stop-and-Wait (SW) ARQ
 * - Selective Repeat (SR) ARQ
 * Includes discrete event simulation, timer expirations, packet drop/corruption simulation,
 * and comprehensive state-machine trace generation.
 */

export class GoBackNSimulator {
  constructor({
    windowSize = 4,
    seqBitWidth = 3, // 3 bits -> sequence numbers 0 to 7
    timeoutDurationMs = 2500,
    packetLossRate = 0.1, // 10% simulated loss
    onStateChange = () => {}
  } = {}) {
    this.windowSize = windowSize;
    this.seqBitWidth = seqBitWidth;
    this.maxSeqNum = Math.pow(2, seqBitWidth); // e.g. 8 (0..7)
    this.timeoutDurationMs = timeoutDurationMs;
    this.packetLossRate = packetLossRate;
    this.onStateChange = onStateChange;

    this.reset();
  }

  reset() {
    this.sender = {
      base: 0,
      nextSeqNum: 0,
      buffer: [], // All data packets to send
      inFlight: [], // Packets currently inside [base, nextSeqNum - 1]
      timer: null,
      timerStartTime: null,
      stats: {
        totalSent: 0,
        retransmissions: 0,
        droppedPackets: 0,
        totalAcksReceived: 0,
        completedTransmissions: 0
      }
    };

    this.receiver = {
      expectedSeqNum: 0,
      receivedPackets: [],
      stats: {
        totalReceived: 0,
        outOfOrderDrops: 0,
        acksSent: 0
      }
    };

    this.eventLog = [];
    this.notifyState();
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange(this.getStateSnapshot());
    }
  }

  getStateSnapshot() {
    return {
      windowSize: this.windowSize,
      maxSeqNum: this.maxSeqNum,
      sender: {
        base: this.sender.base,
        nextSeqNum: this.sender.nextSeqNum,
        windowEnd: (this.sender.base + this.windowSize) % this.maxSeqNum,
        canSend: this.getInFlightCount() < this.windowSize,
        inFlightCount: this.getInFlightCount(),
        inFlight: this.sender.inFlight.map(p => ({ ...p })),
        bufferLength: this.sender.buffer.length,
        stats: { ...this.sender.stats },
        isTimerRunning: this.sender.timer !== null
      },
      receiver: {
        expectedSeqNum: this.receiver.expectedSeqNum,
        receivedCount: this.receiver.receivedPackets.length,
        stats: { ...this.receiver.stats }
      },
      latestLogs: this.eventLog.slice(-15)
    };
  }

  getInFlightCount() {
    if (this.sender.nextSeqNum >= this.sender.base) {
      return this.sender.nextSeqNum - this.sender.base;
    } else {
      return (this.maxSeqNum - this.sender.base) + this.sender.nextSeqNum;
    }
  }

  logEvent(type, message, details = {}) {
    const entry = {
      id: 'EVT-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      timestamp: new Date().toLocaleTimeString(),
      type, // 'SEND', 'RETRANSMIT', 'ACK_RCV', 'DROP', 'TIMEOUT', 'DELIVER'
      message,
      details
    };
    this.eventLog.push(entry);
    this.notifyState();
    return entry;
  }

  /**
   * Queue medical data items to be transmitted
   */
  queueData(dataItems) {
    const items = Array.isArray(dataItems) ? dataItems : [dataItems];
    items.forEach((item, idx) => {
      this.sender.buffer.push({
        id: `PKT-${Date.now()}-${idx}`,
        data: item,
        status: 'QUEUED'
      });
    });
    this.logEvent('QUEUE', `Queued ${items.length} packet(s) for transmission.`);
  }

  /**
   * Send next eligible packet within the sliding window
   */
  sendNextPacket(forceDrop = false) {
    if (this.sender.buffer.length === 0) {
      return { success: false, reason: 'Buffer is empty' };
    }

    if (this.getInFlightCount() >= this.windowSize) {
      this.logEvent('WINDOW_FULL', `Sender window full [Base: ${this.sender.base}, Next: ${this.sender.nextSeqNum}, N=${this.windowSize}]. Must wait for ACKs.`);
      return { success: false, reason: 'Window is full' };
    }

    const packetData = this.sender.buffer.shift();
    const seq = this.sender.nextSeqNum;
    const packet = {
      seq,
      data: packetData.data,
      id: packetData.id,
      sentTime: Date.now(),
      status: 'IN_FLIGHT'
    };

    this.sender.inFlight.push(packet);
    this.sender.stats.totalSent++;
    this.sender.nextSeqNum = (this.sender.nextSeqNum + 1) % this.maxSeqNum;

    // Start timer if this is the oldest unacked packet
    if (this.sender.base === seq && !this.sender.timer) {
      this.startTimer();
    }

    // Determine if packet is dropped on channel
    const shouldDrop = forceDrop || Math.random() < this.packetLossRate;
    if (shouldDrop) {
      this.sender.stats.droppedPackets++;
      this.logEvent('DROP', `[CHANNEL LOSS] Packet #${seq} ("${packet.data.summary || packet.data}") lost in transit!`, { seq });
    } else {
      this.logEvent('SEND', `[TX] Sent Packet #${seq} [Window: ${this.sender.base}..${(this.sender.base + this.windowSize - 1) % this.maxSeqNum}]`, { seq, payload: packet.data });
      // Simulate channel propagation delay to receiver
      setTimeout(() => {
        this.receivePacketAtReceiver(packet);
      }, 400);
    }

    return { success: true, packet, dropped: shouldDrop };
  }

  startTimer() {
    if (this.sender.timer) clearTimeout(this.sender.timer);
    this.sender.timerStartTime = Date.now();
    this.sender.timer = setTimeout(() => {
      this.handleTimeout();
    }, this.timeoutDurationMs);
  }

  stopTimer() {
    if (this.sender.timer) {
      clearTimeout(this.sender.timer);
      this.sender.timer = null;
      this.sender.timerStartTime = null;
    }
  }

  handleTimeout() {
    this.stopTimer();
    const inFlightCount = this.sender.inFlight.length;
    if (inFlightCount === 0) return;

    this.sender.stats.retransmissions += inFlightCount;
    this.logEvent('TIMEOUT', `[TIMEOUT] Timer expired for base seq #${this.sender.base}! Retransmitting all ${inFlightCount} unacknowledged packets (Go-Back-N).`, {
      base: this.sender.base,
      retransmittingSeqs: this.sender.inFlight.map(p => p.seq)
    });

    // Retransmit all in-flight packets
    const packetsToRetransmit = [...this.sender.inFlight];
    this.startTimer();

    packetsToRetransmit.forEach((pkt, index) => {
      setTimeout(() => {
        this.sender.stats.totalSent++;
        const shouldDrop = Math.random() < this.packetLossRate;
        if (shouldDrop) {
          this.sender.stats.droppedPackets++;
          this.logEvent('DROP', `[RE-TX DROP] Retransmitted Packet #${pkt.seq} dropped on channel!`, { seq: pkt.seq });
        } else {
          this.logEvent('RETRANSMIT', `[RE-TX] Retransmitted Packet #${pkt.seq}`, { seq: pkt.seq });
          setTimeout(() => {
            this.receivePacketAtReceiver(pkt);
          }, 350);
        }
      }, index * 150);
    });
  }

  /**
   * Receiver side processing
   */
  receivePacketAtReceiver(packet) {
    this.receiver.stats.totalReceived++;

    if (packet.seq === this.receiver.expectedSeqNum) {
      // In-order packet received
      this.receiver.receivedPackets.push(packet);
      const ackSeq = this.receiver.expectedSeqNum;
      this.receiver.expectedSeqNum = (this.receiver.expectedSeqNum + 1) % this.maxSeqNum;
      this.receiver.stats.acksSent++;

      this.logEvent('DELIVER', `[RX ACCEPT] Received in-order Packet #${packet.seq}. Sent Cumulative ACK #${ackSeq}. Next Expected: #${this.receiver.expectedSeqNum}`, {
        seq: packet.seq,
        ackSeq
      });

      // Send ACK back to sender
      setTimeout(() => {
        this.handleAckAtSender(ackSeq);
      }, 350);
    } else {
      // Out-of-order packet dropped, re-send ACK for last correctly received packet
      this.receiver.stats.outOfOrderDrops++;
      const lastAck = (this.receiver.expectedSeqNum - 1 + this.maxSeqNum) % this.maxSeqNum;
      this.logEvent('OUT_OF_ORDER', `[RX DISCARD] Received out-of-order Packet #${packet.seq} (Expected #${this.receiver.expectedSeqNum}). Dropped. Re-sending ACK #${lastAck}.`, {
        receivedSeq: packet.seq,
        expectedSeq: this.receiver.expectedSeqNum,
        resendingAck: lastAck
      });

      setTimeout(() => {
        this.handleAckAtSender(lastAck);
      }, 350);
    }
  }

  /**
   * Sender handles cumulative ACK
   */
  handleAckAtSender(ackSeq) {
    this.sender.stats.totalAcksReceived++;
    
    // Check if ackSeq falls within currently unacked range [base .. nextSeqNum - 1]
    const inFlightSeqs = this.sender.inFlight.map(p => p.seq);
    if (inFlightSeqs.includes(ackSeq)) {
      // Cumulative ACK: removes all packets up to and including ackSeq
      const ackIndex = inFlightSeqs.indexOf(ackSeq);
      const acknowledged = this.sender.inFlight.splice(0, ackIndex + 1);
      this.sender.stats.completedTransmissions += acknowledged.length;

      this.sender.base = (ackSeq + 1) % this.maxSeqNum;
      this.logEvent('ACK_RCV', `[ACK RECEIVED] Cumulative ACK #${ackSeq} received. Sender Window slides to Base: #${this.sender.base}. (${acknowledged.length} packet(s) cleared)`, {
        ackSeq,
        newBase: this.sender.base
      });

      // Reset timer if there are still packets in flight, otherwise stop timer
      if (this.sender.inFlight.length > 0) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
    } else {
      this.logEvent('DUP_ACK', `[DUP ACK] Duplicate / old ACK #${ackSeq} received. Sender Base remains at #${this.sender.base}.`, { ackSeq });
    }
  }
}
