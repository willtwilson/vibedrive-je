# Tournament Contender: K2.7-Code

## 1. Architecture Document: T-REAL-ROADS

### Goal
Replace the abstract “drive anywhere” island with a real, drivable Jersey road network extracted from OpenStreetMap, while keeping the game in a single HTML file, running at 60 fps on iPad Safari.

### Data Pipeline
The existing `osm-roads.json` (6.8 MB, 8,664 ways) is pre-filtered into a smaller game-ready asset. A small offline helper script (Python/Node) keeps the runtime HTML clean:

1. **Filter** to driveable `highway` types: `primary`, `secondary`, `tertiary`, `trunk` and links, `residential`, `unclassified`, `living_street`, `service`.
2. **Project** every OSM node into the existing game coordinate space using the current mapping:
   - `x = (lon - CENTER_LON) * SCALE_X`
   - `z = (lat - CENTER_LAT) * SCALE_Z + Z_OFFSET`
3. **Sample terrain** once at each projected node using `getTerrainHeight(x, z) + 0.05 m` so roads sit cleanly above the procedural ground.
4. **Emit** `roads.json` containing `{ id, type, name, oneway, points:[{x,y,z}], width }`.

The game loads this file with `fetch()` during a splash screen; no build step is required.

### Road Mesh Generation
Each OSM way becomes a chain of short road quads:

- Compute the segment direction between consecutive points.
- Extrude a perpendicular road width using a lookup table (e.g. trunk 9 m, primary 8 m, secondary/residential 6 m, service 4 m).
- Build a `THREE.BufferGeometry` strip with UVs and vertex colours (dark grey asphalt, lighter edges).
- Add a dashed centre-line as either a thin instanced geometry or a baked texture atlas. For iPad performance, an `InstancedMesh` of small white dash quads is preferred: one draw call for thousands of dashes.

### Terrain Conformance
Roads are not cut into the terrain; they are **laid on top**. The y-coordinate of every road vertex is sampled from `getTerrainHeight`. A small vertical offset prevents z-fighting. Because the procedural terrain is smooth Perlin noise, this looks natural. Sharp intersections are handled by vertex snapping: shared OSM nodes get a single projected point, so connecting roads meet exactly.

### LOD Strategy for iPad
Jersey is small enough to render the whole island, but not at full detail. The world is divided into a grid of tiles (e.g. 400 m cells). For each tile, three merged meshes are pre-built:

- **LOD0 (0–400 m from camera):** all driveable roads + lane markings + intersection labels.
- **LOD1 (400–1200 m):** only A-/B-class roads (`primary`, `secondary`, `trunk`, `tertiary`) with no markings.
- **LOD2 (>1200 m):** major roads only, simplified to thin ribbons or even line segments.

`THREE.LOD` objects switch meshes automatically by camera distance. Tile AABBs are frustum-culled. Per-tile merging keeps draw calls low (tens, not thousands).

### Drivability & Left-Hand Traffic
A uniform-grid spatial index stores every road segment. Each frame the car queries the cell it occupies plus neighbouring cells to find the nearest segment:

- Project the car’s `(x, z)` onto the segment.
- Interpolate the road surface height at that point and set the car’s y.
- Enforce **drive on the left**: from the segment direction compute the left normal `(-dir.z, dir.x)`. If the car is travelling with the OSM way direction, snap it to the left lane; if travelling against it, snap to the right lane. One-way roads use only the left lane in their legal direction.

### Lane Markings & Road Names
- Centre-line dashes are rendered via `InstancedMesh`.
- Road names are generated only at intersections of major roads. A shared OSM node between two named ways triggers a canvas-texture sprite billboard, kept to ~100 labels.

---

## 2. Key Code Structure

### Constants & Lookups
```js
const CENTER_LON = -2.1976, CENTER_LAT = 49.1654;
const SCALE_X = 496, SCALE_Z = 747.8, Z_OFFSET = -50;

const DRIVEABLE = new Set([
  "primary","secondary","tertiary","trunk",
  "trunk_link","primary_link","secondary_link","tertiary_link",
  "residential","unclassified","living_street","service"
]);

const ROAD_WIDTH = {
  trunk:9, primary:8, secondary:7, tertiary:7,
  residential:6, unclassified:5.5, living_street:5, service:4
};
```

### Data Structures
```js
// A projected, terrain-sampled OSM way
RoadSegment {
  id, type, name, oneway:bool,
  points:[{x, y, z}],   // y from getTerrainHeight
  width,
  bbox:{minX,maxX,minZ,maxZ}
}

// Spatial grid cell
Cell {
  segments:RoadSegment[]
}

// Runtime tile LOD container
RoadTile {
  lod:THREE.LOD,
  bbox:THREE.Box3
}
```

### Core Functions
```js
// Projection
function lonLatToGame(lon, lat) -> {x, z}

// Loader
async function loadRoadNetwork(url) -> RoadSegment[]
  fetch(url) -> json
  for each way in json.elements
