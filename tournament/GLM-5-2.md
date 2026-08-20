# Tournament Contender: GLM-5.2

# T-REAL-ROADS Architecture — VibeDrive.je

## 1. Architecture Document

### Overview

The road system overlays real OSM road geometry onto the existing procedural Perlin terrain. Roads are rendered as flat ribbon meshes generated from polylines, merged into grid-tiled chunks for draw-call efficiency, and indexed in a spatial hash so the car can snap to the road surface and drive on the left.

### Data Pipeline (offline, pre-process)

The raw `osm-roads.json` (6.8 MB, 8,664 ways) is too large to inline. A Node pre-process script (run once, output committed to the repo) performs:

1. **Filter** to driveable highway types (`primary`, `secondary`, `tertiary`, `trunk`, `*_link`, `residential`, `unclassified`, `living_street`, `service`). ~5,200 ways retained.
2. **Simplify** each polyline with Douglas-Peucker at 1.5 m tolerance — collapses straight sections, preserving ~12–15k points total (from 63,540).
3. **Drop tags** except `name` and `highway` type. Keep names only for `primary`/`secondary`/`trunk`.
4. **Quantize** coordinates to 5 decimal places and encode as flat `Float32Array`-compatible JSON: `{ types:[], names:[], coords:[lng,lat,lng,lat...], wayStart:[0,12,27...] }`. Output ~180–250 KB.
5. **Gzip** — served pre-compressed, fetch decodes via `DecompressionStream` if needed, or just serve raw since 250 KB loads in <1 s on iPad.

The processed file `jersey-roads.json` sits next to the HTML and is fetched at startup behind a loading screen.

### Coordinate Transform

Each `[lng, lat]` maps to world `(x, z)` using the existing constants:
```
x = (lng - -2.1976) * 496
z = (lat - 49.1654) * 747.8 - 50
y = getTerrainHeight(x, z) + 0.08   // 8 cm above terrain to avoid z-fighting
```
The 8 cm lift is critical: ribbons are flat (no banking), terrain is noisy, and without a gap the road shimmers through the ground.

### Rendering

Each way becomes a **ribbon**: for every polyline point, emit two vertices offset perpendicular to the local tangent by `halfWidth` (road-type dependent: trunk 4.5 m, primary 3.8 m, residential 2.5 m, service 1.8 m). UVs run `u` across width (0–1), `v` along length (cumulative distance × dash scale). Normals point up.

All ribbons are bucketed into a **grid of chunks** (8×8 across the island, ~600 m each). Each chunk is one `BufferGeometry` with vertex colors encoding road type (asphalt grey variants, trunk slightly lighter). Result: ≤ 64 draw calls, frustum-culled automatically by Three.js. Material: `MeshStandardMaterial({ vertexColors:true, roughness:0.9 })` — one shared material, no per-way state.

### Lane Markings

Center dashed white lines are a **second merged geometry** built only from `primary`/`secondary`/`trunk`/`tertiary` ways. Each dash is a 3 m × 0.15 m quad placed every 6 m along the centerline, emitted via instanced or direct vertices into one chunked geometry. ~1,500 dashes total. Uses a small white emissive material; toggled off below 30 m draw distance via chunk-level visibility (far chunks skip the dash layer).

### LOD Strategy (iPad)

- **Chunk frustum cull** — primary win; iPad GPU handles 200k triangles fine, but only if not all submitted.
- **Two-tier geometry**: near chunks (≤ 150 m from car) render full ribbon + dashes + names; far chunks render ribbon only, no dashes, no labels.
- **No dynamic tessellation** — ribbons are static; simplification happened offline.
- **Label cap**: max 40 `THREE.Sprite` labels, nearest to car, recycled.
- **Shadow casting off** for roads (terrain already self-shadows via noise).

### Driving Integration

A **spatial hash** (cell = 50 m) indexes every polyline segment by its midpoint cell. Each frame, the car queries its current cell + 8 neighbors, finds the nearest segment within 4 m, projects onto it, and snaps `y` to the road height. The car's heading aligns to the segment direction (or its inverse, depending on travel direction). Left-hand drive is enforced by offsetting the snap target 1.5 m to the **left** of the centerline (perpendicular × −1 in driving direction). When no road is within 4 m, the car reverts to terrain-following off-road mode (slower, more friction).

### Road Names

For each named `primary`/`secondary` way, one label sprite is placed at the way's midpoint (or nearest intersection to the car). Sprites use a canvas texture with the road name, `THREE.Sprite` scaled to ~40 m wide, depthTest off but renderOrder high. Only the 40 closest to the car are attached to the scene each frame; the rest are detached. This keeps sprite count and overdraw bounded.

---

## 2. Key Code Structure

```js
// === Data structures (loaded JSON) ===
const RoadsData = {
  types: Int8Array,        // index per way: 0=service,1=residential,...,7=trunk
  names: Array<string|null>,  // per way
  coords: Float32Array,    // [lng,lat, lng,lat, ...]
  wayStart: Int32Array,    // index into coords where each way begins
  wayLen: Int32Array       // point count per way (points = wayLen*2 floats)
};

// === Constants ===
const ROAD_HALF_WIDTH = [1.8,2.5,2.5,3.0,3.8,3.8,4.5,4.5]; // by type
const ROAD_COLOR = [
  0x3a3a3a,0x343434,0x343434,0x383838,0x3e3e3e,0x3e3e3e,0x444444,0x444444
];
const CHUNKS_X = 8, CHUNKS_Z = 8;
const ISLAND_EXTENT = 12000; // approx world units

// === Transform ===
function lngLatToWorld(lng, lat) {
  const x = (lng - -2.1976) * 496;
  const z = (lat - 49.1654) * 747.8 - 50;
  return [x, z, getTerrainHeight(x, z) + 0.08];
}

// === Loader ===
async function loadRoads(url) /* → RoadsData */;

// === Geometry builder ===
function buildRoadChunkMeshes(data) /* → Array<THREE.Mesh> (64) */ {
  // For each way:
  //   for each point i: compute tangent, normal (perp in XZ), emit 2 verts
  //   build triangle strip indices
  //   assign to chunk by centroid cell
  // Merge per-chunk into one BufferGeometry, set vertex colors
}

function buildDashChunkMeshes(data) /* → Array<THREE.Mesh> (64, sparse) */ {
  // Only primary/secondary/trunk/tertiary
  // Every 6 m along centerline, emit a 3m × 0.15m quad
}

// === Spatial hash for driving ===
class RoadSpatialIndex {
  constructor(data, cellSize=50) {}
  queryNearest(x, z, maxDist=4) /* → {segWay, segT, pointX, pointZ, dirX, dirZ, height} | null */;
}

// === Driving snap (called in animate loop) ===
function snapCarToRoad(car, index) {
  const hit = index.queryNearest(car.position.x, car.position.z, 4);
  if (!hit) { car.onRoad = false; return; }
  car.onRoad = true;
  // Left-hand offset: perpendicular to dir, on the left
  const leftX = -hit.dirZ, leftZ = hit.dirX;
  car.position.x = hit.pointX + leftX * 1.5;
  car.position.z = hit.pointZ + leftZ * 1.5;
  car.position.y = hit.height + 0.3;
  // Heading aligns to dir or -dir based on velocity
  if (car.speed >= 0) car.heading = Math.atan2(hit.dirX, hit.dirZ);
  else car.heading = Math.atan2(-hit.dirX, -hit.dirZ);
}

// === Labels ===
class RoadLabelSystem {
  constructor(scene, data, maxLabels=40) {}
  update(carPos) /* attach/detach sprites nearest to car */ ;
}

// === Init ===
const roads = await loadRoads('jersey-roads.json');
const roadMeshes = buildRoadChunkMeshes(roads);
const dashMeshes = buildDashChunkMeshes(roads);
roadMeshes.forEach(m => scene.add(m));
dashMeshes.forEach(m => scene.add(m));
const roadIndex = new RoadSpatialIndex(roads);
const labels = new RoadLabelSystem(scene, roads);
// In animate(): snapCarToRoad(car, roadIndex); labels.update(car.position);
```

---

## 3. Implementation Phases

### Phase 1 — Static road overlay (MVP, ~1 day)
- Pre-process script: filter, simplify, encode → `jersey-roads.json`
- `loadRoads()`, `lngLatToWorld()`, `buildRoadChunkMeshes()` (no dashes, no labels)
- Single merged mesh (skip chunking initially), verify roads align with terrain visually
- Loading screen during fetch

### Phase 2 — Chunking + LOD (~0.5 day)
- Split into 8×8 chunk meshes
- Far/near tier visibility (dashes off for far)
- Verify 60 fps on iPad with all chunks visible

### Phase 3 — Driving integration (~1 day)
- `RoadSpatialIndex` (grid hash)
- `snapCarToRoad()` with left-hand offset
- Off-road fallback, friction tuning
- Test driving St Helier → St Saviour → east coast

### Phase 4 — Lane markings (~0.5 day)
- `buildDashChunkMeshes()` for major roads only
- White emissive material, dash spacing 6 m
- Toggle with far-chunk culling

### Phase 5 — Road names (~0.5 day)
- `RoadLabelSystem` with 40-sprite cap
- Canvas texture per name, cached
- Place at way midpoint, recycle nearest-to-car

### Deferred (Phase 2 of the broader project)
- Real DEM terrain (replaces Perlin heights — roads would then follow real elevation)
- Road intersections with proper blending
- Traffic / AI cars on the network
- Bridge/tunnel handling (currently roads clip through terrain)

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Roads float or sink vs noisy terrain** | High | Med | Sample `getTerrainHeight` at every ribbon vertex (not just endpoints); +8 cm uniform lift; if severe, sample at 2 m intervals and interpolate. |
| **iPad draw-call / triangle budget exceeded** | Med | High | Chunk + frustum cull; offline Douglas-Peucker simplification; target <150 k triangles total; profile with `renderer.info` early. |
| **6.8 MB fetch slow on first load** | Med | Low | Pre-process to ~200 KB; show loading bar; cache via `localStorage` or service worker (SW optional, no build step needed — inline register script). |
| **Snap-to-road feels jerky / car pops between segments** | High | High | Hysteresis: keep current segment if within 6 m, only switch if another is <2 m closer; smooth heading with `lerpAngle` over 3 frames; project velocity onto segment to pick travel direction. |
| **Z-fighting between road and terrain** | High | Low | `polygonOffset` on road material as backup; `depthWrite:true`, render roads after terrain; 8 cm lift is primary fix. |
| **Left-hand offset wrong on one-way / roundabouts** | Med | Med | Phase 1 ignores; Phase 3 detects roundabouts by closed-loop ways and centers the car; one-way tag handling deferred. |
| **Road names overlap / clutter** | Med | Low | 40-sprite cap; min 200 m between labels of same name; fade out labels >300 m from car. |
| **Overpass endpoint changes / data rot** | Low | Med | Pre-processed JSON is committed to repo; OSM fetch is a one-time offline step, not runtime. |
| **Service roads rendered as driveable clutter** | Med | Low | Render service roads thinner (1.8 m) and darker; exclude from dash layer; keep in spatial index but with lower snap priority. |
| **Roads cross water (coastal tracks)** | Med | Low | Clip ribbons to `islandMask(x,z) > 0.1`; skip ways whose centroid is outside mask. |
