# Tournament: TRAFFIC — Contender: DeepSeek-Pro-V4

## Architecture: AI Traffic System for T-GTA-TRAFFIC

### 1. Architecture Document

The AI traffic system uses a **hybrid navigation model** combining graph-based pathfinding, waypoint following, and local steering. This gives global route planning through Jersey’s real road network while maintaining responsive, frame‑rate‑friendly local behaviour.

#### Road Graph Construction
At load time, the 2,633 road polylines from `jersey-roads.js` are converted into a directed graph.  
- **Nodes** are created at every road endpoint and at intersections where two or more roads meet or cross.  
- **Edges** represent drivable road segments between nodes, storing the original polyline points, total length, road width, lane count, and a default speed limit derived from road type.  
- Endpoints within a merge radius (≈2 m) are snapped to a single node.  
- Crossings without shared endpoints are detected using a spatial hash and segment‑intersection tests; new nodes are inserted at the crossing point, splitting the original edges.  

The result is a graph of roughly 3,000–4,000 nodes and edges, small enough for fast A* searches.

#### Pathfinding
Each AI car holds a **route** – an ordered list of edge IDs from its current position to a randomly chosen destination node.  
- A* runs on the graph with edge weight = `length / speedLimit` and Euclidean heuristic.  
- Routes are recomputed only when the car reaches the end of its current edge, or every 5–10 seconds to avoid dynamic blockages.  
- If no path exists (e.g. dead end), the car picks a new random destination or performs a U‑turn.

#### Lane Discipline (Drive on LEFT)
Jersey traffic drives on the left. For any road edge, the left‑hand normal is computed from the travel direction.  
- Given a forward tangent `d = (dx, dz)`, the left normal is `(-dz, dx)` (normalised).  
- The car’s desired position is offset from the road centreline by `offset = (w - w/l) / 2`, where `w` is road width and `l` is lane count. This places the car in the centre of the leftmost lane.  
- When travelling in the reverse direction along an edge, the offset is mirrored.

#### Local Steering & Obstacle Avoidance
Each frame, the car follows its current edge by interpolating the centreline at a distance `edgeProgress`.  
- The desired position = centreline point + left offset.  
- A simple proportional‑derivative steering controller aligns the car’s heading toward a look‑ahead point (≈10 m ahead).  
- **Obstacle avoidance** uses a forward ray/sphere test: for every other car and the player, project the relative vector onto the car’s forward axis. If the longitudinal distance is positive and less than a stopping distance, and the lateral offset is smaller than car width + margin, the car slows or stops.  
- Desired speed is `min(maxSpeed, k * (distance - minGap))`, clamped to zero when too close.

#### Traffic Light Integration (Future)
A `trafficLights` array holds objects with a `nodeId` and `state` (`red`, `yellow`, `green`).  
- When a car’s next graph node has a red or yellow light, it stops at a stop line located a fixed distance before the node.  
- The car resumes when the light turns green and no obstacle blocks the intersection.

#### Performance Strategy
- **Per‑frame updates** are O(n) with n ≈ 20 cars. Each car does one road interpolation, one obstacle check (using a spatial hash to only test nearby cars), and one steering update.  
- **Pathfinding** is staggered: only one car recomputes its A* route per frame, so the cost is amortised.  
- **Memory allocation** is avoided in the update loop by reusing temporary vectors and objects.  
- **Draw calls** remain low: 20 car meshes plus the existing road and environment. If needed, `InstancedMesh` can reduce draw calls further.

---

### 2. Key Code Structure

#### Data Structures

```javascript
// Road graph
class RoadGraph {
  nodes: Map<number, { id, pos: {x,z}, edges: number[] }>
  edges: Map<number, {
    id, from: number, to: number,
    points: {x,z}[],      // original polyline points
    length: number,
    width: number,
    lanes: number,
    speedLimit: number
  }>
}

// AI Car
class AICar {
  id: number
  mesh: THREE.Object3D
  color: string
  maxSpeed: number        // varies by car type
  currentEdge: number     // edge ID
  edgeProgress: number    // distance along edge (0..length)
  speed: number
  heading: number         // radians
  route: number[]         // list of edge IDs
  routeIndex: number
  state: 'driving' | 'stopped' | 'waiting'
  targetPos: {x,z}
}

// Traffic light (future)
class TrafficLight
