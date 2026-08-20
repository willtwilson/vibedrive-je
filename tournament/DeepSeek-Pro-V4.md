# Tournament Contender: DeepSeek-Pro-V4

## 1. Architecture Document

### Overview
The goal is to overlay real Jersey road geometry from OSM onto the existing procedural terrain in the single‑file Three.js game. The system must load, transform, and render ~5,000 driveable road segments as 3D meshes, support left‑hand driving, display lane markings, and show road names at major intersections—all while maintaining 60 fps on iPad Safari.

### Data Loading and Preprocessing
The raw `osm-roads.json` (6.8 MB) is fetched at startup. To reduce payload and parsing time, a pre‑filtered version (`jersey-roads-driveable.json`) should be generated offline containing only ways with `highway` in the driveable set:
```
primary, secondary, tertiary, trunk, trunk_link, primary_link, secondary_link,
tertiary_link, residential, unclassified, living_street, service
```
This reduces the data to roughly 5,200 segments and ~40,000 points. The file can be gzip‑compressed and cached in IndexedDB for subsequent loads.

### Coordinate Transformation
Each OSM way point `(lon, lat)` is converted to world coordinates using the existing mapping:
```js
x = (lon - LNG_CENTER) * SCALE_X
z = (lat - LAT_CENTER) * SCALE_Z + Z_OFFSET
```
where `LNG_CENTER = -2.1976`, `LAT_CENTER = 49.1654`, `SCALE_X = 496`, `SCALE_Z = 747.8`, `Z_OFFSET = -50`. The terrain height `y` is sampled via `getTerrainHeight(x, z)` and a small vertical offset (0.05–0.1 m) is added to avoid z‑fighting.

### Road Mesh Generation
Each driveable way is converted into a flat ribbon mesh draped over the terrain. For every pair of consecutive points, a quad is created by offsetting left and right perpendicular to the direction of travel. The width depends on road type (e.g., trunk/primary 7 m, secondary 6 m, residential 5 m, service 3.5 m). All ribbon geometries are merged into a single `BufferGeometry` using `BufferGeometryUtils.mergeBufferGeometries` to minimise draw calls. Vertex colours (dark asphalt) are used instead of textures.

### Lane Markings
A separate merged `THREE.Line` geometry is created for the centre line of each road. It uses `LineDashedMaterial` (white, dashSize 1.5, gapSize 1.0) and is offset vertically by 0.02 m above the road surface. Because Jersey drives on the left, the centre line separates opposing traffic; the car will be positioned to the left of this line.

### Road Network Graph
A graph is built from the ways:
- **Nodes** are created at way endpoints and at intersections where two or more ways meet within a threshold (e.g., 2 m).
- **Edges** represent individual road segments, storing the list of 3D points, length, road name, and highway type.
This graph is used for car snapping, route following, and intersection detection.

### LOD Strategy
The island is small (~14 × 8 km), and the merged road mesh contains roughly 80,000 triangles—well within iPad capabilities. However, to guarantee 60 fps, a chunked LOD system is designed:
- Divide the world into 250 m × 250 m grid cells.
- For each cell, precompute two geometry levels: **full detail** (all points) and **simplified** (every second point).
- At runtime, cells within 500 m of the camera use full detail; cells between 500 m and 1500 m use simplified; cells beyond 1500 m are hidden or replaced by a single line.
This can be implemented later if performance profiling shows a need.

### Road Names at Intersections
Major intersections (where at least one road is `primary`, `secondary`, or `trunk`, and degree ≥ 3) are identified from the graph. A `THREE.Sprite` with a canvas‑generated texture displaying the road name is placed 2 m above the intersection. Only a limited number (e.g., 50) are shown to avoid clutter.

---

## 2. Key Code Structure

### Data Structures
```js
const DRIVEABLE_HIGHWAYS = new Set([
  'primary', 'secondary', 'tertiary', 'trunk', 'trunk_link',
  'primary_link', 'secondary_link', 'tertiary_link',
  'residential', 'unclassified', 'living_street', 'service'
