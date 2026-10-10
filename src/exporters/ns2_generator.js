/**
 * NS-2 OTcl Simulation Script Generator
 * Generates ready-to-run Network Simulator 2 (.tcl) script
 * for the Smart Hospital Emergency Communication Network topology.
 */

export function generateNS2Script({
  simulationTime = 10.0,
  packetSize = 1024,
  dataRate = '2Mb',
  queueType = 'DropTail',
  queueLimit = 50
} = {}) {
  return `# ======================================================================
# SMART HOSPITAL EMERGENCY COMMUNICATION NETWORK - NS-2 SIMULATION SCRIPT
# Topology: Emergency Dept, ICU, Operation Theatre, Pharmacy, Lab, Ambulance, Server
# Protocols: TCP Reno (Congestion Control / Sliding Window), UDP CBR (Emergency Alert)
# Routing: Link-State Shortest Path & Dynamic Link Failure Handling
# ======================================================================

# Create a Simulator instance
set ns [new Simulator]

# Define visualization colors for NAM (Network Animator)
$ns color 1 Red       ;# Emergency Code Blue Packets (High Priority)
$ns color 2 Cyan      ;# Continuous Patient Vitals Telemetry
$ns color 3 Green     ;# Pharmacy & Lab Medical Orders
$ns color 4 Blue      ;# Background Server Archive Transfer

# Open Trace and NAM trace files
set tracefile [open hospital_trace.tr w]
$ns trace-all $tracefile

set namfile [open hospital_network.nam w]
$ns namtrace-all $namfile

# Finish procedure to close trace files and launch NAM
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Simulation finished successfully. Trace saved to hospital_trace.tr"
    # exec nam hospital_network.nam &
    exit 0
}

# ======================================================================
# NODE CREATION (7 Hospital Departments)
# ======================================================================
set n_amb  [$ns node]  ;# Node 0: Ambulance Mobile Unit
set n_ed   [$ns node]  ;# Node 1: Emergency Department (ED)
set n_icu  [$ns node]  ;# Node 2: Intensive Care Unit (ICU)
set n_ot   [$ns node]  ;# Node 3: Operation Theatre (OT)
set n_lab  [$ns node]  ;# Node 4: Laboratory (LAB)
set n_pharm [$ns node] ;# Node 5: Pharmacy (PHARM)
set n_srv  [$ns node]  ;# Node 6: Hospital Server (SRV)

# Set node labels for NAM visualization
$n_amb  label "Ambulance (AMB)"
$n_ed   label "Emergency Dept (ED)"
$n_icu  label "ICU"
$n_ot   label "Operation Theatre (OT)"
$n_lab  label "Laboratory (LAB)"
$n_pharm label "Pharmacy (PHARM)"
$n_srv  label "Central Server (SRV)"

# Set node shapes
$n_ed shape box
$n_srv shape box

# ======================================================================
# DUPLEX LINKS CONFIGURATION (Bandwidth, Delay, Queue)
# ======================================================================
# Mobile wireless uplink: 50Mb, 12ms delay
$ns duplex-link $n_amb $n_ed 50Mb 12ms ${queueType}
# Hospital Gigabit Core Links: 1000Mb, 4-6ms delay
$ns duplex-link $n_ed $n_icu 1000Mb 4ms ${queueType}
$ns duplex-link $n_ed $n_ot 1000Mb 5ms ${queueType}
$ns duplex-link $n_ed $n_lab 100Mb 18ms ${queueType}
$ns duplex-link $n_ed $n_pharm 100Mb 15ms ${queueType}
$ns duplex-link $n_icu $n_lab 500Mb 8ms ${queueType}
$ns duplex-link $n_icu $n_srv 1000Mb 6ms ${queueType}
$ns duplex-link $n_ot $n_pharm 500Mb 7ms ${queueType}
$ns duplex-link $n_ot $n_srv 1000Mb 5ms ${queueType}
$ns duplex-link $n_lab $n_srv 1000Mb 3ms ${queueType}
$ns duplex-link $n_pharm $n_srv 1000Mb 4ms ${queueType}

# Set Queue size for links
$ns queue-limit $n_amb $n_ed ${queueLimit}
$ns queue-limit $n_ed $n_icu ${queueLimit}
$ns queue-limit $n_ed $n_ot ${queueLimit}

# Define link orientation for NAM layout
$ns duplex-link-op $n_amb $n_ed orient right
$ns duplex-link-op $n_ed $n_icu orient right-up
$ns duplex-link-op $n_ed $n_ot orient right-down
$ns duplex-link-op $n_icu $n_lab orient right
$ns duplex-link-op $n_ot $n_pharm orient right
$ns duplex-link-op $n_lab $n_srv orient right-down
$ns duplex-link-op $n_pharm $n_srv orient right-up

# ======================================================================
# TRAFFIC GENERATORS & PROTOCOL AGENTS
# ======================================================================

# 1. EMERGENCY CODE BLUE ALERT: High Priority UDP Traffic (Ambulance -> ED / ICU)
set udp0 [new Agent/UDP]
$udp0 set fid_ 1
$ns attach-agent $n_amb $udp0
set null0 [new Agent/Null]
$ns attach-agent $n_ed $null0
$ns connect $udp0 $null0

set cbr0 [new Application/Traffic/CBR]
$cbr0 attach-agent $udp0
$cbr0 set packetSize_ 512
$cbr0 set rate_ 1Mb
$cbr0 set random_ false

# 2. PATIENT VITALS STREAM: Continuous UDP Traffic (ED -> ICU)
set udp1 [new Agent/UDP]
$udp1 set fid_ 2
$ns attach-agent $n_ed $udp1
set null1 [new Agent/Null]
$ns attach-agent $n_icu $null1
$ns connect $udp1 $null1

set cbr1 [new Application/Traffic/CBR]
$cbr1 attach-agent $udp1
$cbr1 set packetSize_ 256
$cbr1 set interval_ 0.05

# 3. LAB / DICOM IMAGING TRANSFER: TCP Sliding Window (Lab -> Server)
set tcp0 [new Agent/TCP/Reno]
$tcp0 set fid_ 3
$tcp0 set window_ 16
$tcp0 set packetSize_ ${packetSize}
$ns attach-agent $n_lab $tcp0
set sink0 [new Agent/TCPSink]
$ns attach-agent $n_srv $sink0
$ns connect $tcp0 $sink0

set ftp0 [new Application/FTP]
$ftp0 attach-agent $tcp0

# ======================================================================
# SCHEDULE SIMULATION EVENTS & DYNAMIC LINK FAILURES
# ======================================================================
$ns at 0.5 "$cbr0 start"
$ns at 1.0 "$cbr1 start"
$ns at 2.0 "$ftp0 start"

# Simulate sudden link failure between ED and ICU at t = 4.0s
$ns rtmodel-at 4.0 down $n_ed $n_icu
# Link restored at t = 7.0s
$ns rtmodel-at 7.0 up $n_ed $n_icu

$ns at 8.5 "$cbr0 stop"
$ns at 9.0 "$cbr1 stop"
$ns at 9.5 "$ftp0 stop"
$ns at ${simulationTime} "finish"

# Run the simulation
$ns run
`;
}
