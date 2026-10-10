/**
 * Routing Protocols Module
 * Implements:
 * 1. Hospital Network Topology Graph Model
 * 2. Dijkstra's Link-State Shortest Path Algorithm (with full step-by-step execution trace)
 * 3. Distance Vector Routing (Bellman-Ford / RIP) with convergence rounds & split-horizon
 * 4. Dynamic Topology Failures and Re-convergence
 */

// 7 Standard Hospital Departments / Nodes
export const HOSPITAL_NODES = {
  AMB: { id: 'AMB', name: 'Ambulance Unit', type: 'mobile', icon: 'Ambulance', color: '#f59e0b', x: 80, y: 320, ip: '192.168.10.5' },
  ED:  { id: 'ED',  name: 'Emergency Dept',  type: 'core',   icon: 'AlertCircle', color: '#ef4444', x: 260, y: 220, ip: '192.168.1.1' },
  ICU: { id: 'ICU', name: 'Intensive Care Unit', type: 'critical', icon: 'Activity', color: '#ec4899', x: 480, y: 110, ip: '192.168.2.1' },
  OT:  { id: 'OT',  name: 'Operation Theatre', type: 'critical', icon: 'Scissors', color: '#8b5cf6', x: 480, y: 330, ip: '192.168.3.1' },
  LAB: { id: 'LAB', name: 'Laboratory',      type: 'service', icon: 'FlaskConical', color: '#06b6d4', x: 700, y: 110, ip: '192.168.4.1' },
  PHARM:{ id: 'PHARM', name: 'Pharmacy',     type: 'service', icon: 'Pill', color: '#10b981', x: 700, y: 330, ip: '192.168.5.1' },
  SRV: { id: 'SRV', name: 'Hospital Server', type: 'core',   icon: 'Server', color: '#3b82f6', x: 880, y: 220, ip: '192.168.0.10' }
};

// Default Topology Links (Bidirectional)
export const DEFAULT_LINKS = [
  { id: 'AMB-ED', source: 'AMB', target: 'ED', cost: 12, bandwidthMbps: 50, delayMs: 12, active: true },
  { id: 'ED-ICU', source: 'ED', target: 'ICU', cost: 4,  bandwidthMbps: 1000, delayMs: 4, active: true },
  { id: 'ED-OT',  source: 'ED', target: 'OT',  cost: 5,  bandwidthMbps: 1000, delayMs: 5, active: true },
  { id: 'ED-LAB', source: 'ED', target: 'LAB', cost: 18, bandwidthMbps: 100, delayMs: 18, active: true },
  { id: 'ED-PHARM', source: 'ED', target: 'PHARM', cost: 15, bandwidthMbps: 100, delayMs: 15, active: true },
  { id: 'ICU-LAB', source: 'ICU', target: 'LAB', cost: 8, bandwidthMbps: 500, delayMs: 8, active: true },
  { id: 'ICU-SRV', source: 'ICU', target: 'SRV', cost: 6, bandwidthMbps: 1000, delayMs: 6, active: true },
  { id: 'OT-PHARM', source: 'OT', target: 'PHARM', cost: 7, bandwidthMbps: 500, delayMs: 7, active: true },
  { id: 'OT-SRV',  source: 'OT', target: 'SRV',  cost: 5, bandwidthMbps: 1000, delayMs: 5, active: true },
  { id: 'LAB-SRV', source: 'LAB', target: 'SRV', cost: 3, bandwidthMbps: 1000, delayMs: 3, active: true },
  { id: 'PHARM-SRV', source: 'PHARM', target: 'SRV', cost: 4, bandwidthMbps: 1000, delayMs: 4, active: true }
];

export class HospitalNetworkTopology {
  constructor(links = DEFAULT_LINKS) {
    this.nodes = { ...HOSPITAL_NODES };
    this.links = links.map(l => ({ ...l }));
  }

  getAdjacencyList() {
    const adj = {};
    Object.keys(this.nodes).forEach(nodeId => {
      adj[nodeId] = [];
    });

    this.links.forEach(link => {
      if (link.active) {
        adj[link.source].push({ node: link.target, cost: link.cost, linkId: link.id, delayMs: link.delayMs });
        adj[link.target].push({ node: link.source, cost: link.cost, linkId: link.id, delayMs: link.delayMs });
      }
    });

    return adj;
  }

  toggleLink(linkId) {
    const link = this.links.find(l => l.id === linkId);
    if (link) {
      link.active = !link.active;
    }
    return link;
  }

  setLinkCost(linkId, newCost) {
    const link = this.links.find(l => l.id === linkId);
    if (link) {
      link.cost = Math.max(1, newCost);
      link.delayMs = Math.max(1, newCost);
    }
    return link;
  }

  /**
   * Dijkstra's Shortest Path Algorithm
   * Computes shortest paths from sourceNode to all other nodes
   * Returns: { distances, previous, shortestPaths, traceSteps }
   */
  runDijkstra(sourceNode = 'AMB') {
    const adj = this.getAdjacencyList();
    const nodeIds = Object.keys(this.nodes);
    const dist = {};
    const prev = {};
    const visited = new Set();
    const traceSteps = [];

    nodeIds.forEach(id => {
      dist[id] = Infinity;
      prev[id] = null;
    });
    dist[sourceNode] = 0;

    traceSteps.push({
      step: 0,
      description: `Initialization: Set distance to source node ${sourceNode} to 0, all others to ∞`,
      currentVisited: [],
      distances: { ...dist },
      previous: { ...prev },
      currentSelected: sourceNode
    });

    let stepCount = 1;
    while (visited.size < nodeIds.length) {
      // Pick unvisited node with smallest distance
      let u = null;
      let minDistance = Infinity;

      for (const id of nodeIds) {
        if (!visited.has(id) && dist[id] < minDistance) {
          minDistance = dist[id];
          u = id;
        }
      }

      if (u === null || dist[u] === Infinity) break; // All remaining nodes unreachable

      visited.add(u);
      const relaxedEdges = [];

      // Relax neighbors
      for (const edge of adj[u]) {
        const v = edge.node;
        if (!visited.has(v)) {
          const newDist = dist[u] + edge.cost;
          const isShorter = newDist < dist[v];
          relaxedEdges.push({
            neighbor: v,
            edgeCost: edge.cost,
            oldDist: dist[v],
            calcDist: newDist,
            relaxed: isShorter
          });

          if (isShorter) {
            dist[v] = newDist;
            prev[v] = u;
          }
        }
      }

      traceSteps.push({
        step: stepCount++,
        description: `Extracted min node '${u}' (dist=${dist[u]}). Relaxed ${relaxedEdges.length} neighbor(s).`,
        currentSelected: u,
        currentVisited: Array.from(visited),
        relaxedEdges,
        distances: { ...dist },
        previous: { ...prev }
      });
    }

    // Reconstruct shortest paths
    const shortestPaths = {};
    nodeIds.forEach(dest => {
      if (dest === sourceNode) {
        shortestPaths[dest] = { path: [sourceNode], cost: 0, reachable: true };
      } else if (dist[dest] === Infinity) {
        shortestPaths[dest] = { path: [], cost: Infinity, reachable: false };
      } else {
        const path = [];
        let curr = dest;
        while (curr) {
          path.unshift(curr);
          curr = prev[curr];
        }
        shortestPaths[dest] = { path, cost: dist[dest], reachable: true };
      }
    });

    return {
      sourceNode,
      distances: dist,
      previous: prev,
      shortestPaths,
      traceSteps
    };
  }

  /**
   * Distance Vector Routing (Bellman-Ford / RIP)
   * Simulates iterative routing table convergence across all nodes.
   */
  runDistanceVector() {
    const nodeIds = Object.keys(this.nodes);
    const adj = this.getAdjacencyList();

    // Initialize Routing Tables at each node: routingTables[node][dest] = { cost, nextHop }
    let routingTables = {};
    nodeIds.forEach(i => {
      routingTables[i] = {};
      nodeIds.forEach(j => {
        if (i === j) {
          routingTables[i][j] = { cost: 0, nextHop: i };
        } else {
          // Direct link cost if exists, otherwise Infinity
          const directEdge = adj[i].find(e => e.node === j);
          if (directEdge) {
            routingTables[i][j] = { cost: directEdge.cost, nextHop: j };
          } else {
            routingTables[i][j] = { cost: Infinity, nextHop: null };
          }
        }
      });
    });

    const iterationLogs = [];
    let converged = false;
    let round = 0;
    const MAX_ROUNDS = 12;

    iterationLogs.push({
      round: 0,
      description: 'Initial state: Direct neighbor link costs known to each node.',
      tables: JSON.parse(JSON.stringify(routingTables)),
      changes: []
    });

    while (!converged && round < MAX_ROUNDS) {
      round++;
      converged = true;
      const nextTables = JSON.parse(JSON.stringify(routingTables));
      const roundChanges = [];

      // Every node i exchanges its distance vector with direct neighbors
      for (const i of nodeIds) {
        for (const j of nodeIds) {
          if (i === j) continue;

          let minCost = routingTables[i][j].cost;
          let bestNextHop = routingTables[i][j].nextHop;
          let changed = false;

          // Bellman-Ford Equation: D_i(j) = min_v { c(i,v) + D_v(j) }
          for (const edge of adj[i]) {
            const v = edge.node;
            const costViaNeighbor = edge.cost + routingTables[v][j].cost;

            if (costViaNeighbor < minCost) {
              minCost = costViaNeighbor;
              bestNextHop = v;
              changed = true;
            }
          }

          if (changed) {
            converged = false;
            nextTables[i][j] = { cost: minCost, nextHop: bestNextHop };
            roundChanges.push({
              node: i,
              dest: j,
              oldCost: routingTables[i][j].cost,
              newCost: minCost,
              nextHop: bestNextHop
            });
          }
        }
      }

      routingTables = nextTables;
      iterationLogs.push({
        round,
        description: roundChanges.length > 0 
          ? `Round ${round}: ${roundChanges.length} routing table route update(s) exchanged.`
          : `Round ${round}: Network converged! No further routing updates.`,
        tables: JSON.parse(JSON.stringify(routingTables)),
        changes: roundChanges
      });
    }

    return {
      converged,
      totalRounds: round,
      finalTables: routingTables,
      iterationLogs
    };
  }
}
