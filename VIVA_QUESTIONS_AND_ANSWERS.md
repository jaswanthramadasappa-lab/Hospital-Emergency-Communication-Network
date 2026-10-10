# Smart Hospital Emergency Communication Network - Viva & Examination Guide

This document contains high-yield questions, answers, mathematical derivations, and technical explanations designed for project evaluations, viva-voce examinations, and technical presentations.

---

## 📌 Category 1: Network Topology & Scenario

### Q1: Why is a specialized communication network needed for a smart hospital?
**Answer:**
Hospital environments handle heterogenous traffic classes with drastically different Quality of Service (QoS) requirements:
1. **Critical Emergency Alerts (Code Blue, Trauma Alerts)**: Require deterministic, ultra-low latency (<10ms) and zero packet loss.
2. **Continuous Physiological Vitals (ECG, SpO2, BP)**: Isochronous UDP streams requiring steady throughput and low jitter.
3. **Medical Imaging / Bulk Diagnostic Data (DICOM MRI/CT)**: Large payloads requiring high throughput and guaranteed integrity (TCP + CRC-32).
4. **Administrative & Pharmacy Transactions**: Reliable transactional delivery with verified ACKs.

A unified network architecture with dynamic routing and priority queuing ensures that emergency signals preempt bulk data without causing congestion collapse.

### Q2: What are the 7 nodes in your hospital network and their roles?
**Answer:**
- **Ambulance Mobile Unit (`AMB`)**: Mobile wireless node (5G/Wi-Fi mesh) streaming pre-hospital telemetry.
- **Emergency Department (`ED`)**: Primary triage hub receiving incoming trauma alerts.
- **Intensive Care Unit (`ICU`)**: High-priority ward with continuous telemetry monitors.
- **Operation Theatre (`OT`)**: Surgical suite requiring real-time vital streams and STAT medication requests.
- **Laboratory (`LAB`)**: Diagnostic center generating large MRI/CT scans and blood reports.
- **Pharmacy (`PHARM`)**: Automated dispensary verifying prescription orders.
- **Central Hospital Server (`SRV`)**: Core datacenter and Electronic Health Record (EHR) archive.

---

## 📌 Category 2: Data Link Layer (Framing & CRC)

### Q3: What framing technique is implemented and why?
**Answer:**
We implemented two complementary framing techniques:
1. **Byte Stuffing (Character-Oriented)**: Uses Flag byte `0x7E` ($01111110_2$) and Escape byte `0x7D` ($01111101_2$). When `0x7E` occurs in payload, it is escaped as `0x7D 0x5E` (`0x7E ^ 0x20`). When `0x7D` occurs, it is escaped as `0x7D 0x5D` (`0x7D ^ 0x20`).
2. **Bit Stuffing (HDLC Synchronous)**: A `0` bit is automatically inserted after every five consecutive `1` bits in the bitstream (`01111110`). The receiver destuffs by stripping the `0` following five consecutive `1`s.

### Q4: How does CRC-32 error detection work mathematically?
**Answer:**
Let $M(x)$ be the $k$-bit data polynomial and $G(x)$ be the generator polynomial of degree $r = 32$.
1. The sender appends $r = 32$ zero bits to $M(x)$: $M(x) \cdot x^{32}$.
2. Sender performs Modulo-2 binary long division:
   $$\frac{M(x) \cdot x^{32}}{G(x)} = Q(x) + \frac{R(x)}{G(x)}$$
3. The 32-bit remainder $R(x)$ is the CRC checksum.
4. The transmitted frame is $T(x) = M(x) \cdot x^{32} \oplus R(x)$.
5. The receiver divides the received bitstream $T'(x)$ by $G(x)$. If the remainder is $0$, no bit errors were detected.

**IEEE 802.3 CRC-32 Polynomial:**
$$G(x) = x^{32} + x^{26} + x^{23} + x^{22} + x^{16} + x^{12} + x^{11} + x^{10} + x^8 + x^7 + x^5 + x^4 + x^2 + x + 1$$
Hex representation: `0xEDB88320`.

---

## 📌 Category 3: Transport Layer & ARQ Protocols

### Q5: Compare Stop-and-Wait, Go-Back-N, and Selective Repeat ARQ.
**Answer:**

| Parameter | Stop-and-Wait ($N=1$) | Go-Back-N ($N > 1$) | Selective Repeat ($N > 1$) |
|---|---|---|---|
| **Sender Window Size ($W_s$)** | $1$ | $N$ | $N$ |
| **Receiver Window Size ($W_r$)** | $1$ | $1$ | $N$ |
| **Max Sequence Number Modulo** | $\ge 2$ ($1$ bit) | $\ge N + 1$ | $\ge 2N$ |
| **Out-of-Order Packets** | Discarded | Discarded | Buffered in receiver window |
| **Retransmissions on Loss** | Single packet | Entire window of $N$ packets | Only the lost packet |
| **Channel Efficiency ($\eta$)** | $\frac{1-P}{1 + 2a}$ | $\frac{N(1-P)}{1 + 2a(1-P+NP)}$ | $\frac{N(1-P)}{1 + 2a}$ |

*where $a = \frac{T_{propagation}}{T_{transmission}}$ and $P$ is packet loss probability.*

### Q6: How does TCP Reno Congestion Control operate?
**Answer:**
TCP Reno utilizes **AIMD** (Additive Increase Multiplicative Decrease) across four states:
1. **Slow Start**: When $CWND < SSTHRESH$, $CWND \leftarrow CWND + 1$ MSS per received ACK (Exponential growth: $2^k$).
2. **Congestion Avoidance**: When $CWND \ge SSTHRESH$, $CWND \leftarrow CWND + \frac{1}{CWND}$ per ACK ($+1$ MSS per RTT - Linear growth).
3. **Fast Retransmit & Fast Recovery (3 Duplicate ACKs)**:
   - $SSTHRESH \leftarrow \max(2, \lfloor CWND / 2 \rfloor)$
   - $CWND \leftarrow SSTHRESH + 3$ MSS
   - Retransmits the missing segment immediately without waiting for retransmission timer to expire.
4. **Timeout**: Severe congestion causes $SSTHRESH \leftarrow \max(2, \lfloor CWND / 2 \rfloor)$ and $CWND \leftarrow 1$ MSS (collapse back to Slow Start).

---

## 📌 Category 4: Network Layer & Routing Algorithms

### Q7: What is the difference between Dijkstra (Link-State) and Distance Vector (Bellman-Ford) routing?
**Answer:**

| Criteria | Dijkstra (Link-State / OSPF) | Distance Vector (Bellman-Ford / RIP) |
|---|---|---|
| **Information Scope** | Global knowledge (each node has complete network topology graph) | Local knowledge (nodes know only direct neighbor costs and vectors) |
| **Algorithm** | Dijkstra's Shortest Path Algorithm | Distributed Bellman-Ford equation |
| **Message Exchange** | Link-State Advertisements (LSA) flooded to all nodes | Distance vectors sent only to immediate physical neighbors |
| **Time Complexity** | $\mathcal{O}(\|V\|^2)$ or $\mathcal{O}((\|V\| + \|E\|)\log \|V\|)$ | $\mathcal{O}(\text{diameter} \cdot \|E\|)$ |
| **Convergence Speed** | Rapid convergence | Slower convergence; prone to Count-to-Infinity |
| **Loop Handling** | Loop-free by graph construction | Mitigated via Split Horizon and Poison Reverse |

### Q8: What is the Bellman-Ford equation?
**Answer:**
Let $D_x(y)$ be the cost of the least-cost path from node $x$ to node $y$:
$$D_x(y) = \min_{v \in \mathcal{N}(x)} \{ c(x,v) + D_v(y) \}$$
where $\mathcal{N}(x)$ is the set of physical neighbors of $x$, $c(x,v)$ is the direct link cost to neighbor $v$, and $D_v(y)$ is neighbor $v$'s estimate to destination $y$.

---

## 📌 Category 5: Wireshark & Simulation Tools (NS-2 / NS-3)

### Q9: How did you construct the Wireshark `.pcap` capture file?
**Answer:**
We implemented the binary **libpcap 2.4 format** specification:
1. **Global Header (24 bytes)**:
   - Magic Number: `0xA1B2C3D4` (microsecond resolution)
   - Version: 2.4, Snaplen: 65535, LinkType: 1 (`LINKTYPE_ETHERNET`)
2. **Packet Header (16 bytes per frame)**:
   - `ts_sec`, `ts_usec`, `incl_len`, `orig_len`
3. **Layer Headers**:
   - **Ethernet II**: Destination MAC (6B), Source MAC (6B), EtherType `0x0800` (IPv4).
   - **IPv4 Header (20B)**: Version 4, IHL 5, Total Length, TTL 64, Protocol 17 (UDP) / 6 (TCP), Source IP, Destination IP.
   - **Transport & SHEP Application Layer**: Port numbers, Sequence number, CRC-32 checksum, and medical alert payload.

### Q10: How do NS-2 and NS-3 simulate this network?
**Answer:**
- **NS-2**: Scripted in **OTcl** (`hospital_network.tcl`). Sets up 7 nodes, duplex links with `DropTail` queues, `Agent/UDP` + `CBR` for emergency alerts, `Agent/TCP/Reno` + `FTP` for bulk MRI data, and dynamic link failure scheduling (`$ns rtmodel-at 4.0 down $n_ed $n_icu`).
- **NS-3**: Scripted in **C++ / Python** (`hospital_network.cc` / `hospital_network.py`). Installs `PointToPointHelper`, `InternetStackHelper`, `Ipv4GlobalRoutingHelper`, and measures throughput, delay, and packet loss using `FlowMonitor`.
