# Tournament: TRAFFIC — Contender: K2.7-Code

# T‑GTA‑TRAFFIC — AI Traffic Architecture for VibeDrive.je

## 1. Architecture Document

### Core idea
The AI drives on the real `jersey-roads.js` network by combining **A* pathfinding on a directed lane graph** with **low‑cost steering along polylines**. Each car has a route made of road edges; every frame it seeks a point a few metres ahead in its correct lane, slows for vehicles in front, and stops at junctions or future traffic lights. The existing `snapCar()` function is reused for ground alignment and small lateral corrections.

### Building the road graph
`jersey-roads.js` stores roads as polylines: `{p:[[x,z],...], n:name, t:type, w:width, l:lanes}`.

1. **Split each road into edges** between consecutive points `p[i] → p[i+1]`.
2. **Create directed lane edges**:
   * Bidirectional roads get two edges: `A→B` and `B→A`.
   * One‑way or single‑lane roads get one edge only.
3. **Merge endpoints into graph nodes** using a spatial hash with a 1–2 m tolerance, because road endpoints from different sources rarely match exactly. Each node stores outgoing and incoming edge references.
4. **Annotate edges** with length, max speed (derived from `t`), width, lane count, and a **left‑lane offset**.

The result is a compact directed graph of a few thousand edges — small enough to pathfind on in well under a millisecond.

### Pathfinding
Cars do not pathfind every frame. When a car needs a new goal it:

1. Finds the nearest graph node (using the road spatial grid).
2. Picks a random destination node, weighted by road type so cars prefer main roads.
3. Runs **A*** with Euclidean distance as the heuristic and `edge.length / edge.speed` as the cost.
4. Stores the resulting edge list as the car’s route.

A car recomputes its route only when the route is exhausted, when it is manually displaced far from the road, or when a traffic light blocks its only path for too long.

### Lane discipline — drive on the LEFT
Jersey drives on the left, so each directed edge computes a **left normal**:

```
left = normalize(-dz, dx)   // perpendicular to edge direction
```

For a car travelling `A→B`, its target lane centre is:

```
laneOffset = edge.width * 0.25          // left half of a 2‑lane road
target = centreline + left * laneOffset
```

For the reverse edge `B→A`, the direction flips, so the left normal points to the opposite physical side. This places opposing traffic in the correct lanes. On narrow single
