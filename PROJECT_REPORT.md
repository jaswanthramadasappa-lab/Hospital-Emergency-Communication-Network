# Academic Project Report: Smart Hospital Emergency Communication Network

## Executive Summary
This report presents the design, mathematical formulation, simulation, and implementation of a **Smart Hospital Emergency Communication Network**. The system guarantees ultra-reliable, deterministic communication for critical medical units (**Ambulance, Emergency Department, Intensive Care Unit, Operation Theatre, Laboratory, Pharmacy, and Central Hospital Server**).

---

## 1. Network Topology & Architecture
The hospital infrastructure is modeled as a weighted directed graph $G = (V, E)$ where:
- $V = \{ \text{AMB}, \text{ED}, \text{ICU}, \text{OT}, \text{LAB}, \text{PHARM}, \text{SRV} \}$ ($|V| = 7$)
- $E$ represents duplex physical/wireless links with attributes $(B, D, P_{loss})$ where $B$ is bandwidth (Mbps), $D$ is one-way propagation delay (ms), and $P_{loss}$ is channel error probability.

### Topology Link Table
| Link ID | Source | Target | Bandwidth | Propagation Delay | Link Classification |
|---|---|---|---|---|---|
| `AMB-ED` | Ambulance | Emergency Dept | 50 Mbps | 12 ms | Mobile 5G / Wi-Fi Uplink |
| `ED-ICU` | Emergency Dept | ICU | 1000 Mbps | 4 ms | Gigabit Fiber Backbone |
| `ED-OT` | Emergency Dept | Operation Theatre | 1000 Mbps | 5 ms | Gigabit Fiber Backbone |
| `ED-LAB` | Emergency Dept | Laboratory | 100 Mbps | 18 ms | Fast Ethernet Subnet |
| `ED-PHARM` | Emergency Dept | Pharmacy | 100 Mbps | 15 ms | Fast Ethernet Subnet |
| `ICU-LAB` | ICU | Laboratory | 500 Mbps | 8 ms | Switched Ethernet |
| `ICU-SRV` | ICU | Hospital Server | 1000 Mbps | 6 ms | Datacenter Core Link |
| `OT-PHARM` | Operation Theatre | Pharmacy | 500 Mbps | 7 ms | Switched Ethernet |
| `OT-SRV` | Operation Theatre | Hospital Server | 1000 Mbps | 5 ms | Datacenter Core Link |
| `LAB-SRV` | Laboratory | Hospital Server | 1000 Mbps | 3 ms | High-Speed SAN Link |
| `PHARM-SRV` | Pharmacy | Hospital Server | 1000 Mbps | 4 ms | High-Speed SAN Link |

---

## 2. Protocol Engineering & Mathematical Analysis

### 2.1 Data Link Layer: Framing & CRC-32
To ensure frame boundary delineation and data transparency, Byte Stuffing is applied:
- Frame format: `[PREAMBLE 4B][FLAG 1B][SRC 1B][DST 1B][PRIORITY 1B][TYPE 1B][SEQ 2B][LEN 2B][PAYLOAD (stuffed)][CRC32 4B][FLAG 1B]`
- **Flag Byte**: `0x7E` ($01111110_2$)
- **Escape Byte**: `0x7D` ($01111101_2$)
- **Escape Transformation**: When `0x7E` occurs in the payload, it is transformed into `0x7D 0x5E` (`0x7E ^ 0x20`). When `0x7D` occurs, it is transformed into `0x7D 0x5D` (`0x7D ^ 0x20`).

#### CRC-32 Polynomial
$$G(x) = x^{32} + x^{26} + x^{23} + x^{22} + x^{16} + x^{12} + x^{11} + x^{10} + x^8 + x^7 + x^5 + x^4 + x^2 + x + 1$$
Expressed in standard hexadecimal as `0xEDB88320`. The probability of detecting an error burst of length $\le 32$ bits is $100\%$, and the probability of undetected error for random burst $>32$ bits is $2^{-32} \approx 2.33 \times 10^{-10}$.

---

### 2.2 Transport Layer: Sliding Window ARQ & Congestion Control
To maintain channel efficiency over high-bandwidth-delay product paths, the Go-Back-N protocol operates with sender window $N$:
- **Window Condition**: The sender maintains unacknowledged packets inside window $[base, base + N - 1] \pmod{2^m}$.
- **Cumulative ACKs**: Arrival of ACK with sequence $k$ acknowledges all frames $\le k$, advancing $base \leftarrow (k + 1) \pmod{2^m}$.
- **Efficiency Comparison**:
  $$\eta_{SW} = \frac{1-P}{1 + 2a} \quad \text{vs} \quad \eta_{GBN} = \frac{N(1-P)}{1 + 2a(1-P+NP)} \quad \text{vs} \quad \eta_{SR} = \frac{N(1-P)}{1 + 2a}$$

#### TCP Reno Congestion Control
- **Slow Start**: $CWND \leftarrow CWND + 1$ MSS per received ACK (Exponential growth).
- **Congestion Avoidance**: $CWND \leftarrow CWND + \frac{1}{CWND}$ per ACK ($+1$ MSS per RTT - Additive Increase).
- **3 Duplicate ACKs (Fast Retransmit & Recovery)**: $SSTHRESH \leftarrow \max(2, \lfloor CWND / 2 \rfloor)$, $CWND \leftarrow SSTHRESH + 3$ (Multiplicative Decrease).
- **Timeout**: $SSTHRESH \leftarrow \max(2, \lfloor CWND / 2 \rfloor)$, $CWND \leftarrow 1$ MSS (Collapse to Slow Start).

---

### 2.3 Network Layer Routing: Dijkstra vs Distance Vector

#### Dijkstra's Shortest Path Algorithm
Maintains a tentative distance vector $D[u]$ and visited set $S$. At each iteration, extracts $u^* = \arg\min_{v \notin S} D[v]$ and updates all adjacent neighbors $w$:
$$D[w] \leftarrow \min(D[w], D[u^*] + c(u^*, w))$$
Time complexity: $\mathcal{O}(|V|^2)$ with array, $\mathcal{O}((|V| + |E|) \log |V|)$ with min-heap priority queue.

#### Distance Vector Routing (Bellman-Ford)
Each node periodically exchanges its distance vector with direct physical neighbors:
$$D_x(y) = \min_{v \in \mathcal{N}(x)} \{ c(x,v) + D_v(y) \}$$
Converges within $\text{diameter}(G)$ iterations under stationary conditions. Split Horizon with Poison Reverse is employed upon link severing to mitigate the Count-to-Infinity problem.

---

## 3. Wireshark Packet Inspection & PCAP Analysis
The system generates real binary `.pcap` files conformant to the **libpcap 2.4** format:
- **Global Header**: 24 bytes (Magic `0xA1B2C3D4`, Version 2.4, LinkType 1 - Ethernet).
- **Packet Header**: 16 bytes (Timestamp seconds, microsecond offset, captured length, wire length).
- **Ethernet II Frame**: Destination MAC (`02:00:00:00:00:XX`), Source MAC, EtherType `0x0800` (IPv4).
- **IPv4 Layer**: Version 4, IHL 5 (20 bytes), DSCP `0x2E` for emergency packets (Expedited Forwarding), TTL 64, Protocol 17 (UDP) or 6 (TCP).
- **Application Payload**: Smart Hospital Emergency Protocol header with priority, sequence, and verified CRC-32 checksum.

---

## 4. NS-2 and NS-3 Simulation Integration
The generated NS-2 (`.tcl`) and NS-3 (`.cc`) scripts allow executing external discrete-event simulations:
- **NS-2**: Configures Duplex links, DropTail queues, Agent/UDP with Application/Traffic/CBR for emergency alerts, and Agent/TCP/Reno with Application/FTP for MRI transfers. Includes dynamic link failure at $t=4.0\text{s}$ and recovery at $t=7.0\text{s}$.
- **NS-3**: Utilizes `PointToPointHelper`, `Ipv4GlobalRoutingHelper`, `OnOffApplication`, and `FlowMonitorHelper` to log packet loss, mean delay, and throughput metrics.

---

## 5. Conclusion
The Smart Hospital Emergency Communication Network simulator delivers a comprehensive, interactive, and academically rigorous implementation of key Computer Networks principles. The combination of visual real-time simulation, step-by-step protocol debuggers, genuine Wireshark `.pcap` export, and NS-2/NS-3 script generation fulfills all project objectives.
