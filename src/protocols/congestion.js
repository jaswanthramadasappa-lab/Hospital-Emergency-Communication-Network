/**
 * TCP Congestion Control Simulation Module
 * Simulates TCP Reno / Tahoe Congestion Control state transitions:
 * - Slow Start (Exponential Growth)
 * - Congestion Avoidance (AIMD - Additive Increase)
 * - Fast Retransmit (3 Duplicate ACKs)
 * - Fast Recovery (Multiplicative Decrease)
 * - Timeout Collapse (Reset to 1 MSS)
 */

export class TCPCongestionController {
  constructor({
    initialCwnd = 1,
    initialSsthresh = 16,
    maxCwnd = 64,
    mode = 'RENO' // 'RENO' or 'TAHOE'
  } = {}) {
    this.initialCwnd = initialCwnd;
    this.initialSsthresh = initialSsthresh;
    this.maxCwnd = maxCwnd;
    this.mode = mode;

    this.reset();
  }

  reset() {
    this.cwnd = this.initialCwnd;
    this.ssthresh = this.initialSsthresh;
    this.state = 'SLOW_START'; // 'SLOW_START', 'CONGESTION_AVOIDANCE', 'FAST_RECOVERY'
    this.duplicateAcks = 0;
    this.rttRound = 0;
    this.history = [
      { round: 0, cwnd: this.cwnd, ssthresh: this.ssthresh, state: this.state, event: 'INITIALIZE' }
    ];
  }

  /**
   * Called when a new non-duplicate ACK arrives
   */
  onNewAck() {
    this.duplicateAcks = 0;

    if (this.state === 'SLOW_START') {
      // Exponential increase: +1 MSS per ACK
      this.cwnd = Math.min(this.maxCwnd, this.cwnd + 1);
      if (this.cwnd >= this.ssthresh) {
        this.state = 'CONGESTION_AVOIDANCE';
      }
    } else if (this.state === 'CONGESTION_AVOIDANCE') {
      // Linear increase: +1/CWND MSS per ACK (approx +1 MSS per RTT)
      this.cwnd = Math.min(this.maxCwnd, +(this.cwnd + (1 / Math.floor(this.cwnd))).toFixed(2));
    } else if (this.state === 'FAST_RECOVERY') {
      // Transition out of Fast Recovery
      this.cwnd = this.ssthresh;
      this.state = 'CONGESTION_AVOIDANCE';
    }

    this.recordHistory('NEW_ACK');
    return this.getStatus();
  }

  /**
   * Advance by 1 full RTT round of successful transmissions
   */
  stepRttRound() {
    this.rttRound++;
    if (this.state === 'SLOW_START') {
      this.cwnd = Math.min(this.maxCwnd, this.cwnd * 2);
      if (this.cwnd >= this.ssthresh) {
        this.state = 'CONGESTION_AVOIDANCE';
      }
    } else if (this.state === 'CONGESTION_AVOIDANCE') {
      this.cwnd = Math.min(this.maxCwnd, this.cwnd + 1);
    }

    this.recordHistory('RTT_STEP');
    return this.getStatus();
  }

  /**
   * Handle duplicate ACK (e.g. out-of-order or single packet loss)
   */
  onDuplicateAck() {
    this.duplicateAcks++;

    if (this.duplicateAcks === 3) {
      // 3 Duplicate ACKs triggered!
      this.ssthresh = Math.max(2, Math.floor(this.cwnd / 2));
      
      if (this.mode === 'RENO') {
        // Fast Retransmit & Fast Recovery
        this.state = 'FAST_RECOVERY';
        this.cwnd = this.ssthresh + 3;
        this.recordHistory('FAST_RETRANSMIT_3DUP');
      } else {
        // TCP Tahoe behavior
        this.state = 'SLOW_START';
        this.cwnd = 1;
        this.recordHistory('TAHOE_3DUP_RESET');
      }
    } else if (this.state === 'FAST_RECOVERY') {
      this.cwnd += 1;
      this.recordHistory('FAST_RECOVERY_INCR');
    }

    return this.getStatus();
  }

  /**
   * Handle severe packet loss (Timeout)
   */
  onTimeout() {
    this.duplicateAcks = 0;
    this.ssthresh = Math.max(2, Math.floor(this.cwnd / 2));
    this.cwnd = 1;
    this.state = 'SLOW_START';

    this.recordHistory('TIMEOUT_COLLAPSE');
    return this.getStatus();
  }

  recordHistory(event) {
    this.history.push({
      round: this.history.length,
      rttRound: this.rttRound,
      cwnd: Math.round(this.cwnd * 100) / 100,
      ssthresh: this.ssthresh,
      state: this.state,
      event
    });

    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  getStatus() {
    return {
      cwnd: Math.round(this.cwnd * 10) / 10,
      ssthresh: this.ssthresh,
      state: this.state,
      mode: this.mode,
      duplicateAcks: this.duplicateAcks,
      history: [...this.history]
    };
  }
}
