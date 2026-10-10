# Smart Hospital Emergency Communication Network Simulator

An advanced, interactive simulation and analysis platform for a **Smart Hospital Emergency Communication Network**, integrating core Computer Networks protocols: **Framing, Cyclic Redundancy Check (CRC), Sliding Window (Go-Back-N), Dijkstra Shortest Path, Distance Vector Routing (Bellman-Ford), TCP Congestion Control, Wireshark PCAP generation, and NS-2/NS-3 simulation script generation**.

---

## 🏥 Scenario & Problem Definition

In modern healthcare environments, uninterrupted, low-latency, and error-free communication is vital for patient survival. This system models a connected hospital communication network across **7 core departments**:

1. **Ambulance Mobile Unit (`AMB`)**: Mobile 5G/Wi-Fi wireless node streaming continuous vital telemetry (ECG, Heart Rate, SpO2, BP) and transmitting critical Code Blue emergency alerts.
2. **Emergency Department (`ED`)**: Triage hub prioritizing incoming patient alerts and dispatching trauma/resuscitation requests.
3. **Intensive Care Unit (`ICU`)**: High-priority receiver for Code Blue alarms and continuous telemetry monitors.
4. **Operation Theatre (`OT`)**: Surgical ward receiving patient stats and dispatching STAT pharmacy orders.
5. **Laboratory (`LAB`)**: Diagnostic center transferring MRI scans, CT series, and blood gas analysis reports.
6. **Pharmacy (`PHARM`)**: Medication dispensing system verifying medication requests via ACK/Timeout transactions.
7. **Hospital Central Server (`SRV`)**: Core datacenter and cloud archive for Electronic Health Records (EHR).

---

## 🚀 Key Features & Protocol Modules

### 1. 📡 Data Link Layer: Framing & CRC-32/CRC-16
- **Byte Stuffing (Character-Oriented)**: Uses Flag `0x7E` and Escape `0x7D` with XOR mask `0x20` to guarantee frame synchronization.
- **Bit Stuffing (HDLC Synchronous)**: Automatically stuffs a `0` bit after every five consecutive `1`s (`01111110`).
- **CRC Error Detection**: Step-by-step Modulo-2 binary polynomial long division for CRC-32 (IEEE 802.3 `0xEDB88320`) and CRC-16-CCITT (`0x1021`).
- **Interactive Bit Error Injection**: Flip bits in the transmitted bitstream and observe CRC failure detection in real time.

### 2. 🔄 Reliable Transmission: Go-Back-N & Sliding Window
- **Sliding Window Protocol**: Configurable sender window size $N \in [1..7]$ and 3-bit sequence numbers (mod 8).
- **Stop-and-Wait ARQ ($N=1$)**: Single-packet lockstep transmission.
- **Go-Back-N ARQ ($N=4$)**: Retransmits all in-flight unacknowledged packets upon timer expiration.
- **Selective Repeat ARQ ($N=4$)**: Retransmits only lost packets.

### 3. 🗺️ Network Layer: Dijkstra vs Distance Vector (Bellman-Ford)
- **Dijkstra's Link-State Algorithm**: Step-by-step vertex relaxation trace calculating the shortest latency path from any hospital unit.
- **Distance Vector Routing (Bellman-Ford / RIP)**: Periodic vector exchange matrix convergence with Split Horizon handling.
- **Dynamic Link Severing**: Click any link to break or restore it; watch the network dynamically reroute traffic in real time!

### 4. 📈 Transport Layer: TCP Congestion Control (AIMD)
- Simulates **Slow Start**, **Congestion Avoidance**, **Fast Retransmit (3 Duplicate ACKs)**, and **Fast Recovery**.
- Live SVG chart plotting Congestion Window ($CWND$) and Slow Start Threshold ($SSTHRESH$) over time.

### 5. 🦈 Built-in Wireshark Packet Dissector & .PCAP Exporter
- Real-time packet sniffer with protocol filtering (`HOSP-EMERG`, `HOSP-VITALS`, `TCP-RENO`, `UDP`).
- 3-Pane inspection: Packet Stream Table, Protocol Layer Dissection Tree (Frame &rarr; Ethernet II &rarr; IPv4 &rarr; TCP/UDP &rarr; SHEP), and Hex/ASCII viewer.
- **"Download .PCAP"**: Generates standard binary libpcap files ready to open in desktop Wireshark.

### 6. 💻 NS-2 & NS-3 Simulation Script Studio
- Generates ready-to-run **NS-2 OTcl scripts (`hospital_network.tcl`)** with NAM animations.
- Generates **NS-3 C++ (`hospital_network.cc`)** and **Python (`hospital_network.py`)** scripts with `PointToPointHelper`, `OnOffApplication`, and `FlowMonitor`.

---

## 🛠️ Quick Start

### 1. Web Application (Interactive UI)
```bash
# Install dependencies
npm install

# Start local development server
npm run dev
# Open http://localhost:3000 in your browser

# Build for production
npm run build
```

### 2. Standalone Python Verification Suite
```bash
# Run automated verification tests
python simulation_cli/hospital_sim.py --test

# Run interactive CLI
python simulation_cli/hospital_sim.py
```

---

## 📊 Mathematical Foundations

### 1. Cyclic Redundancy Check (CRC)
Let $M(x)$ be the data polynomial of degree $k$ and $G(x)$ be the generator polynomial of degree $r$:
$$T(x) = M(x) \cdot x^r + R(x)$$
where $R(x) = [M(x) \cdot x^r] \pmod{G(x)}$.

### 2. ARQ Channel Efficiency
For transmission delay $T_t = \frac{L}{B}$ and propagation delay $T_p$, parameter $a = \frac{T_p}{T_t}$:
- **Stop-and-Wait**: $\eta_{SW} = \frac{1 - P}{1 + 2a}$
- **Go-Back-N**: $\eta_{GBN} = \frac{N(1 - P)}{1 + 2a(1 - P + NP)}$
- **Selective Repeat**: $\eta_{SR} = \frac{N(1 - P)}{1 + 2a}$

### 3. Bellman-Ford Routing Equation
$$D_x(y) = \min_{v \in \text{neighbors}(x)} \{ c(x,v) + D_v(y) \}$$

---

## 👥 Authors
Developed for Computer Networks Mini-Project: *Smart Hospital Emergency Communication Network*.
