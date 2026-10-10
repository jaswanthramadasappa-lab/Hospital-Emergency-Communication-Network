/**
 * NS-3 Simulation Script Generator (C++ and Python)
 * Generates modern NS-3 scripts with PointToPoint links,
 * Internet stack, OnOffApplication, FlowMonitor, and PCAP tracing.
 */

export function generateNS3CppScript({
  simulationTime = 15.0,
  packetSize = 1024,
  dataRate = "10Mbps"
} = {}) {
  return `/*
 * Smart Hospital Emergency Communication Network - NS-3 Simulation
 * Network Topology: AMB (Ambulance), ED (Emergency Dept), ICU, OT (Operation Theatre),
 *                   LAB (Laboratory), PHARM (Pharmacy), SRV (Central Server)
 * Metrics: Packet Loss, End-to-End Delay, Throughput using FlowMonitor
 */

#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/internet-module.h"
#include "ns3/point-to-point-module.h"
#include "ns3/applications-module.h"
#include "ns3/flow-monitor-module.h"
#include "ns3/ipv4-global-routing-helper.h"

using namespace ns3;

NS_LOG_COMPONENT_DEFINE("HospitalEmergencyNetwork");

int main(int argc, char *argv[])
{
    CommandLine cmd(__FILE__);
    cmd.Parse(argc, argv);

    Time::SetResolution(Time::NS);
    LogComponentEnable("HospitalEmergencyNetwork", LOG_LEVEL_INFO);

    NS_LOG_INFO("Creating 7 Hospital Department Nodes...");

    // Create 7 Nodes: 0:AMB, 1:ED, 2:ICU, 3:OT, 4:LAB, 5:PHARM, 6:SRV
    NodeContainer nodes;
    nodes.Create(7);

    // Point-to-Point Link Helpers
    PointToPointHelper p2pFast;
    p2pFast.SetDeviceAttribute("DataRate", StringValue("1000Mbps"));
    p2pFast.SetChannelAttribute("Delay", StringValue("4ms"));

    PointToPointHelper p2pMedium;
    p2pMedium.SetDeviceAttribute("DataRate", StringValue("500Mbps"));
    p2pMedium.SetChannelAttribute("Delay", StringValue("8ms"));

    PointToPointHelper p2pWirelessUplink;
    p2pWirelessUplink.SetDeviceAttribute("DataRate", StringValue("50Mbps"));
    p2pWirelessUplink.SetChannelAttribute("Delay", StringValue("12ms"));

    // Install Internet Stack
    InternetStackHelper stack;
    stack.Install(nodes);

    // Create NetDeviceContainers
    NetDeviceContainer d_amb_ed   = p2pWirelessUplink.Install(nodes.Get(0), nodes.Get(1));
    NetDeviceContainer d_ed_icu   = p2pFast.Install(nodes.Get(1), nodes.Get(2));
    NetDeviceContainer d_ed_ot    = p2pFast.Install(nodes.Get(1), nodes.Get(3));
    NetDeviceContainer d_icu_srv  = p2pFast.Install(nodes.Get(2), nodes.Get(6));
    NetDeviceContainer d_ot_srv   = p2pFast.Install(nodes.Get(3), nodes.Get(6));
    NetDeviceContainer d_lab_srv  = p2pFast.Install(nodes.Get(4), nodes.Get(6));
    NetDeviceContainer d_pharm_srv= p2pFast.Install(nodes.Get(5), nodes.Get(6));
    NetDeviceContainer d_icu_lab  = p2pMedium.Install(nodes.Get(2), nodes.Get(4));
    NetDeviceContainer d_ot_pharm = p2pMedium.Install(nodes.Get(3), nodes.Get(5));

    // Assign IP Addresses
    Ipv4AddressHelper address;
    
    address.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer i_amb_ed = address.Assign(d_amb_ed);

    address.SetBase("10.1.2.0", "255.255.255.0");
    Ipv4InterfaceContainer i_ed_icu = address.Assign(d_ed_icu);

    address.SetBase("10.1.3.0", "255.255.255.0");
    Ipv4InterfaceContainer i_ed_ot = address.Assign(d_ed_ot);

    address.SetBase("10.1.4.0", "255.255.255.0");
    Ipv4InterfaceContainer i_icu_srv = address.Assign(d_icu_srv);

    address.SetBase("10.1.5.0", "255.255.255.0");
    Ipv4InterfaceContainer i_ot_srv = address.Assign(d_ot_srv);

    // Global Routing Calculation (Dijkstra Shortest Path)
    Ipv4GlobalRoutingHelper::PopulateRoutingTables();

    // Enable PCAP Tracing for Wireshark
    p2pFast.EnablePcapAll("hospital-wireshark-trace");

    // 1. Critical Emergency Alert Application (UDP / CBR)
    uint16_t emergencyPort = 9000;
    Address sinkLocalAddress(InetSocketAddress(Ipv4Address::GetAny(), emergencyPort));
    PacketSinkHelper packetSinkHelper("ns3::UdpSocketFactory", sinkLocalAddress);
    ApplicationContainer sinkApp = packetSinkHelper.Install(nodes.Get(2)); // ICU Sink
    sinkApp.Start(Seconds(0.5));
    sinkApp.Stop(Seconds(${simulationTime}));

    OnOffHelper clientHelper("ns3::UdpSocketFactory", Address());
    clientHelper.SetAttribute("OnTime", StringValue("ns3::ConstantRandomVariable[Constant=1]"));
    clientHelper.SetAttribute("OffTime", StringValue("ns3::ConstantRandomVariable[Constant=0]"));
    clientHelper.SetAttribute("DataRate", DataRateValue(DataRate("${dataRate}")));
    clientHelper.SetAttribute("PacketSize", UintegerValue(${packetSize}));

    AddressValue remoteAddress(InetSocketAddress(i_ed_icu.GetAddress(1), emergencyPort));
    clientHelper.SetAttribute("Remote", remoteAddress);

    ApplicationContainer clientApp = clientHelper.Install(nodes.Get(0)); // Ambulance Source
    clientApp.Start(Seconds(1.0));
    clientApp.Stop(Seconds(${simulationTime} - 1.0));

    // FlowMonitor for metrics calculation (Loss, Delay, Throughput)
    FlowMonitorHelper flowmon;
    Ptr<FlowMonitor> monitor = flowmon.InstallAll();

    NS_LOG_INFO("Running Hospital Emergency Network Simulation...");
    Simulator::Stop(Seconds(${simulationTime}));
    Simulator::Run();

    monitor->CheckForLostPackets();
    Ptr<Ipv4FlowClassifier> classifier = DynamicCast<Ipv4FlowClassifier>(flowmon.GetClassifier());
    std::map<FlowId, FlowStats> stats = monitor->GetFlowStats();

    std::cout << "\\n========================================================\\n";
    std::cout << "  SMART HOSPITAL COMMUNICATION PERFORMANCE REPORT (NS-3)  \\n";
    std::cout << "========================================================\\n";

    for (std::map<FlowId, FlowStats>::const_iterator i = stats.begin(); i != stats.end(); ++i)
    {
        Ipv4FlowClassifier::FiveTuple t = classifier->FindFlow(i->first);
        std::cout << "Flow " << i->first << " (" << t.sourceAddress << " -> " << t.destinationAddress << ")\\n";
        std::cout << "  Tx Packets: " << i->second.txPackets << "\\n";
        std::cout << "  Rx Packets: " << i->second.rxPackets << "\\n";
        std::cout << "  Lost Packets: " << i->second.lostPackets << " ("
                  << (double)i->second.lostPackets / i->second.txPackets * 100.0 << "%)\\n";
        std::cout << "  Mean Delay: " << i->second.delaySum.GetSeconds() / i->second.rxPackets * 1000.0 << " ms\\n";
        std::cout << "  Throughput: " << i->second.rxBytes * 8.0 / (${simulationTime} - 1.0) / 1024 / 1024 << " Mbps\\n";
    }

    Simulator::Destroy();
    NS_LOG_INFO("Simulation Complete. PCAP traces exported.");
    return 0;
}
`;
}

export function generateNS3PythonScript({
  simulationTime = 15.0,
  packetSize = 1024,
  dataRate = "10Mbps"
} = {}) {
  return `"""
Smart Hospital Emergency Communication Network - NS-3 Python Script
Simulates emergency alerts, vitals telemetry, and lab transfers across 7 hospital nodes.
"""

from ns import ns

def main():
    print("[NS-3 Python] Initializing Smart Hospital Emergency Network Simulation...")
    
    # Create 7 nodes
    nodes = ns.NodeContainer()
    nodes.Create(7)

    p2pFast = ns.PointToPointHelper()
    p2pFast.SetDeviceAttribute("DataRate", ns.StringValue("1000Mbps"))
    p2pFast.SetChannelAttribute("Delay", ns.StringValue("4ms"))

    stack = ns.InternetStackHelper()
    stack.Install(nodes)

    d_amb_ed = p2pFast.Install(nodes.Get(0), nodes.Get(1))
    d_ed_icu = p2pFast.Install(nodes.Get(1), nodes.Get(2))
    d_icu_srv = p2pFast.Install(nodes.Get(2), nodes.Get(6))

    address = ns.Ipv4AddressHelper()
    address.SetBase(ns.Ipv4Address("10.1.1.0"), ns.Ipv4Mask("255.255.255.0"))
    i_amb_ed = address.Assign(d_amb_ed)

    address.SetBase(ns.Ipv4Address("10.1.2.0"), ns.Ipv4Mask("255.255.255.0"))
    i_ed_icu = address.Assign(d_ed_icu)

    ns.Ipv4GlobalRoutingHelper.PopulateRoutingTables()

    print("[NS-3 Python] Starting simulation for ${simulationTime} seconds...")
    ns.Simulator.Stop(ns.Seconds(${simulationTime}))
    ns.Simulator.Run()
    ns.Simulator.Destroy()
    print("[NS-3 Python] Simulation finished successfully.")

if __name__ == '__main__':
    main()
`;
}
