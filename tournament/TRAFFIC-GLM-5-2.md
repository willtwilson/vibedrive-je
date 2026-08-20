# Tournament: TRAFFIC — Contender: GLM-5.2

# T-GTA-TRAFFIC Architecture for VibeDrive.je

## 1. Architecture Document

**Pathfinding Approach**
For a 3D sandbox driving game with 15-20 AI cars, a hybrid approach combining **topological graph traversal** and **local steering behaviors** is optimal. Running full A* pathfinding for every car every frame is computationally expensive and unnecessary for ambient traffic. Instead, the system pre-computes a topological road graph at load time. AI cars use this graph to navigate intersections, selecting random (or weighted) adjacent edges when they reach a node. Between nodes, they use waypoint following with local steering to maintain lane discipline and avoid obstacles.

**Building the Road Graph**
The existing `jersey-roads.js` contains 2,633 roads as arrays of points. On initialization, we parse this data to build an intersection graph. We extract all unique endpoints and midpoints of road segments. By using a spatial hash grid, we find endpoints that are within a small threshold distance (e.g., 2 meters) of each other. These clusters form `GraphNodes` (intersections). The paths between these nodes form `GraphEdges`, storing the road's polyline points, width, and lane count. This graph is built once asynchronously to prevent load-time UI freezing.

**Lane Discipline (Drive on LEFT)**
Jersey traffic drives on the left. When an AI car traverses a `GraphEdge`, it calculates a lateral offset from the road centerline. Given the car's heading and the road's direction vector, the target position is shifted to the left by `(roadWidth / lanes) * 0.5`. When approaching an intersection to turn right (a tight turn in left-hand traffic) or left (a wide turn), the car uses a simple Bezier curve interpolation between the current edge's end-point and the next edge's start-point, ensuring the offset is maintained dynamically without clipping into oncoming lanes.

**Obstacle Avoidance**
Each AI car performs a forward-looking spatial query using the existing spatial grid. A bounding box or raycast is projected 10-20 meters ahead of the car's current position. If another car, the player, or a pedestrian is detected, a PID controller or simple linear interpolation adjusts the car's target speed. If the obstacle is within 5 meters and directly ahead, the target speed drops to 0. 

**Traffic Light Integration**
To future-proof for T-TRAFFIC-LIGHTS, the AI update loop checks the `GraphNode` the car is approaching. If the node has a traffic light state (e.g., `node.trafficLight === 'red'`), the car calculates the distance to the stop line (node position). If within a safe braking distance, the target speed is overridden to 0. If green, the car proceeds normally.

**Performance**
To maintain 60fps on iPad Safari with 15-20 AI cars, the AI logic must be strictly decoupled from the render loop's heavy lifting. We update AI pathing and obstacle detection at a slightly lower frequency (e.g., 15Hz) while interpolating visual movement at 60fps. We utilize Three.js `InstancedMesh` for car bodies to reduce draw calls to 1-2 per car type. Spatial grid queries are bounded to a small radius, ensuring O(1) lookups. Total AI CPU budget should remain under 2ms per frame.

## 2. Key Code Structure

```javascript
// --- DATA STRUCTURES ---
const RoadGraph = {
  nodes: [], // Array of {id, x, z, edges: [edgeId...], trafficLight: null}
  edges: []  // Array of {id, startNode, endNode, points: [[x,z]...], width, lanes, dirVector}
};

class TrafficCar {
  constructor(mesh, color) {
    this.mesh = mesh; // THREE.InstancedMesh reference or Group
    this.color = color;
    this.currentEdge = null;
    this.currentTargetPoint = null;
    this.speed = 0;
    this.maxSpeed = 8 + Math.random() * 4; // m/s
    this.heading = 0;
  }
}

// --- CORE FUNCTIONS ---

/**
 * Builds the topological graph from raw road data.
 * @param {Array} rawRoads - Array from jersey-roads.js
 */
function buildRoadGraph(rawRoads) {
  // 1. Extract endpoints, cluster via spatial grid
  // 2. Create nodes for clusters
  // 3. Link edges between nodes, storing polyline points
}

/**
 * Updates a single AI car's logic.
 * @param {TrafficCar} car 
 * @param {Number} dt - Delta time
 */
function updateTrafficCar(car, dt) {
  // 1. Check forward obstacle via spatial grid
  const obstacle = checkForwardObstacle(car);
  let targetSpeed = obstacle ? calculateBrakeSpeed(obstacle.distance) : car.maxSpeed;
  
  // 2. Check traffic light at next node
  if (approachingIntersection(car) && car.nextNode.trafficLight === 'red') {
     targetSpeed = 0;
  }
  
  // 3. Adjust speed
  car.speed = lerp(car.speed, targetSpeed, dt * 2.0);
  
  // 4. Move along current edge points
  moveAlongPath(car, dt);
  
  // 5. If reached end of edge, pick new edge at node
  if (reachedNode(car)) {
     selectNextEdge(car);
  }
  
  // 6. Snap to road surface using existing system
  const snapped = snapCar(car.mesh.position.x, car.mesh.position.z, car.heading, dt);
  applyLeftLaneOffset(snapped, car.currentEdge);
  
  car.mesh.position.set(snapped.x, snapped.y, snapped.z);
  car.mesh.rotation.y = snapped.heading;
}

/**
 * Checks spatial grid for cars/player ahead.
 * @param {TrafficCar} car 
 * @returns {Object|null} {distance, entity}
 */
function checkForwardObstacle(car) {
  // Create a small bounding box 15m ahead
  // Query existing spatial grid
  // Return closest match
}
```

## 3. Performance Analysis

*   **CPU Time per AI Car:** At 15Hz update frequency (logic) and 60Hz (visuals), the spatial query and vector math take approximately ~0.05ms per car. For 20 cars, this is ~1.0ms total, leaving ~15ms for rendering on a 16.6ms (60fps) frame budget.
*   **Memory Usage:** The `RoadGraph` will contain roughly 2,633 edges and ~1,500 intersection nodes. Storing polylines and vectors will consume approximately 1.5 - 2.5 MB of RAM, well within iPad Safari limits. AI car instances are lightweight data classes (~1KB each).
*   **Draw Calls:** If using standard Three.js meshes, 20 cars equal 20 draw calls (assuming 1 mesh per car). To optimize further, use `THREE.InstancedMesh` for the chassis, reducing draw calls to 1 for all 20 cars, with color variations handled via instance attributes. This frees up the GPU for the environment rendering.

## 4. Risk Assessment

1.  **Getting Stuck at Intersections:** 
    *   *Risk:* Cars deadlock at 4-way stops or overlapping nodes if pathing logic fails to select a valid exit edge.
    *   *Mitigation:* Implement a "stuck timer". If `car.speed < 0.1` for > 3 seconds, force the car to teleport to the nearest valid edge centerline, or simply destroy and respawn the car at a distant node.
2.  **Clipping Through Buildings (Corner Cutting):**
    *   *Risk:* Sharp turns at intersections might cause the AI to ignore the left-lane offset and cut across the centerline or off the road entirely.
    *   *Mitigation:* When transitioning between edges, apply a minimum turning radius. Use quadratic Bezier curves between the exit point of Edge A and the entry point of Edge B, ensuring the interpolated path strictly stays within the bounds of the road width.
3.  **Game Crashes (Infinite Loops):**
    *   *Risk:* `buildRoadGraph()` might encounter malformed road data (e.g., a road with only 1 point) causing an infinite loop or null reference.
    *   *Mitigation:* Wrap the graph generation in a `try-catch`. Validate every road array has `p.length >= 2` before processing. Add a hard iteration limit when searching for nearby intersection nodes.
4.  **Physics Jitter (snapCar conflicts):**
    *   *Risk:* The existing `snapCar()` function might fight the AI's intended heading during sharp curves, causing the car to jitter left and right.
    *   *Mitigation:* Blend the AI's desired heading with the `snapCar()` heading using a smoothing factor (e.g., `actualHeading = lerp(snapHeading, aiHeading, 0.8)`), prioritizing the AI's pathing while respecting the road snap Y-coordinate.
