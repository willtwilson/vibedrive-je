# T-REAL-ROADS: Real Jersey Road Network Rendering Research

## Executive Summary

**Recommended approach: (A) Overlay roads on procedural terrain** — Phase 1. This is immediately implementable using the OSM road data already downloaded. Approach (B) with real DEM terrain is technically feasible (elevation tiles confirmed working) but requires significantly more work and carries iPad performance risk. Phase the real terrain in as Phase 2.

---

## 1. OSM Overpass API Results

### Endpoints Tested

| Endpoint | Full Jersey bbox | St Helier bbox | Notes |
|----------|-----------------|----------------|-------|
| `overpass.openstreetmap.org` | ❌ DNS fail / connection refused | ❌ Same | Not reachable from CT214 |
| `overpass.kumi.systems` | ❌ 502 Bad Gateway | ❌ Timeout (30s) | DNS resolves (CNAME → overpass.private.coffee → 193.219.97.30), but queries time out |
| `overpass.private.coffee` | ❌ Timeout (30s) | ❌ Timeout (30s) | Same backend as kumi.systems |
| `overpass.openstreetmap.fr` | ✅ **WORKS** — 6.8MB, 8,664 road segments | ✅ 1.9MB, 2,765 segments | **Primary endpoint — reliable, fast** |
| `overpass.osm.ch` | ⚠️ HTTP 200 but 0 elements (stale/limited data) | ⚠️ HTTP 200 but 0 elements | Returns valid JSON but no Jersey data |
| `overpass.openstreetmap.ru` | ❌ Timeout | N/A | Unreachable |

### Recommendation
**Use `overpass.openstreetmap.fr` as the primary endpoint.** It returned complete road data for all of Jersey in ~90 seconds with a 120s timeout.

### Query Used
```
[out:json][timeout:120];way[highway](49.15,-2.25,49.30,-2.00);out geom;
```

---

## 2. Road Data Saved

**File**: `/root/vibe-drive-jersey/research/osm-roads.json` (6.8 MB)

### Statistics
- **Total road segments (ways)**: 8,664
- **Total geometry points**: 63,540
- **Lat range**: 49.162491 to 49.260976
- **Lon range**: -2.252480 to -2.010499

### Road Type Breakdown

| Highway Type | Count | Driveable? |
|-------------|-------|-----------|
| service | 3,081 | Yes (minor) |
| footway | 1,888 | No |
| residential | 746 | Yes |
| unclassified | 745 | Yes |
| track | 462 | Partial |
| secondary | 413 | Yes |
| primary | 264 | Yes |
| living_street | 255 | Yes |
| path | 212 | No |
| steps | 200 | No |
| tertiary | 118 | Yes |
| cycleway | 88 | No |
| pedestrian | 78 | No |
| trunk | 77 | Yes (major) |
| trunk_link | 8 | Yes |
| bridleway | 8 | No |
| raceway | 8 | Yes |
| primary_link | 5 | Yes |
| construction | 4 | No |
| tertiary_link | 2 | Yes |
| busway | 1 | No |
| bus_stop | 1 | N/A |

**Driveable roads**: ~5,200 segments (primary, secondary, tertiary, trunk, residential, unclassified, living_street, service, trunk_link, primary_link, tertiary_link, raceway)

**Filter recommendation**: For the driving game, render only `highway` in `["primary", "secondary", "tertiary", "trunk", "trunk_link", "primary_link", "secondary_link", "tertiary_link", "residential", "unclassified", "living_street", "service"]`. This gives ~5,000 segments — enough for a rich road network without overwhelming the renderer.

### Sample Road Tags
```json
{
  "highway": "secondary",
  "lanes": "2",
  "lit": "yes",
  "maxspeed": "20 mph",
  "name": "Castle Street",
  "ref": "B92",
  "sidewalk": "both",
  "surface": "asphalt"
}
```

---

## 3. Three.js Road Rendering Techniques

### Three Approaches Identified

#### A. Flat Ribbon / Triangle Strip (Recommended)
Convert each GeoJSON LineString to a flat ribbon mesh that sits on top of terrain.

**Algorithm**:
1. For each road way, get the array of `{lat, lon}` geometry points
2. Convert each point to game coordinates using existing mapping: `x = (lon - lng_center) * scale_x`, `z = (lat - lat_center) * scale_z + z_offset`
3. Sample terrain height at each point using `getTerrainHeight(x, z)`
4. For each segment between consecutive points, create a quad (2 triangles) offset perpendicular to the road direction by `roadWidth / 2`
5. Set the ribbon y-coordinate to `terrainHeight + 0.5` (slight offset to avoid z-fighting)
6. Use `THREE.MeshStandardMaterial` with dark color, or `THREE.BufferGeometry` with vertex colors

**Advantages**: Simple, performant, works with existing terrain, can filter by road type for different widths/colors
**Code sketch**:
```javascript
function createRoadMesh(way, roadWidth = 4) {
  const geom = way.geometry; // array of {lat, lon}
  const positions = [];
  for (let i = 0; i < geom.length - 1; i++) {
    const p1 = gpsToGame(geom[i].lat, geom[i].lon);
    const p2 = gpsToGame(geom[i+1].lat, geom[i+1].lon);
    const h1 = getTerrainHeight(p1.x, p1.z);
    const h2 = getTerrainHeight(p2.x, p2.z);
    // perpendicular vector for road width
    const dx = p2.x - p1.x, dz = p2.z - p1.z;
    const len = Math.sqrt(dx*dx + dz*dz);
    if (len < 0.01) continue;
    const px = -dz / len * roadWidth / 2;
    const pz = dx / len * roadWidth / 2;
    // 4 corners of the quad
    positions.push(p1.x + px, h1 + 0.5, p1.z + pz);
    positions.push(p1.x - px, h1 + 0.5, p1.z - pz);
    positions.push(p2.x + px, h2 + 0.5, p2.z + pz);
    positions.push(p2.x - px, h2 + 0.5, p2.z - pz);
    // 2 triangles: (0,1,2) and (1,3,2)
  }
  // Build BufferGeometry with positions and indices
}
```

**Performance**: ~5,000 roads × avg 7 points = ~35,000 segments = ~70,000 triangles. This is very manageable for iPad Safari.

#### B. TubeGeometry along CatmullRomCurve3
Use Three.js built-in `TubeGeometry` with `CatmullRomCurve3` to create tube-shaped roads.

**Advantages**: Built-in Three.js, smooth curves
**Disadvantages**: Overkill for flat roads, more triangles than needed, doesn't follow terrain naturally (tube is round)

#### C. three-geojson Library (gkjohnson/three-geojson)
GitHub: https://github.com/gkjohnson/three-geojson

A dedicated Three.js library for loading GeoJSON and generating line/mesh geometry. Supports:
- LineString → `LineSegments` objects
- Polygon → flat/extruded meshes
- WKT format support
- 64-bit precision with mesh offsetting

**Usage**:
```javascript
import { GeoJSONLoader } from 'three-geojson';
const loader = new GeoJSONLoader();
const result = loader.load(geoJsonData);
result.lines.forEach(line => scene.add(line.getLineObject()));
```

**Advantages**: Purpose-built, handles coordinate projection, supports altitude
**Disadvantages**: Not on npm (GitHub install only), designed for globe projection (WGS84 ellipsoid), may need adaptation for flat game terrain

#### D. PathPhalt (Reference Tool)
Three.js forum showcase: https://discourse.threejs.org/t/pathphalt-a-new-road-builder-tool/73657
Online tool: https://code.vonc.fr/pathphalt

A Three.js-based road builder that creates curved roads with decals, markings, and OBJ export. Good reference for road rendering techniques but not directly usable as a library.

### Recommended Approach
**Use Approach A (Flat Ribbon)** — it's the simplest, most performant, and integrates directly with the existing `getTerrainHeight()` function. No external dependencies needed.

**Road width by type**:
| Type | Width (game units) |
|------|-------------------|
| trunk | 8 |
| primary | 7 |
| secondary | 6 |
| tertiary | 5 |
| residential | 4 |
| unclassified | 4 |
| living_street | 3.5 |
| service | 3 |
| track | 3 |

---

## 4. DEM Elevation Data for Jersey

### Sources Tested

| Source | Status | Resolution | Notes |
|--------|--------|-----------|-------|
| AWS S3 SRTM (skadi) | ❌ 404 | N/A | `N49W002.hgt.gz` not found — SRTM skadi tiles may not cover this lat |
| AWS S3 SRTM v2 | ❌ 404 | N/A | Same issue |
| AWS Terrarium tiles | ✅ **WORKS** | ~38m at z12, ~19m at z13 | Free, no auth needed |
| Copernicus DEM GLO-30 | ✅ Available | 30m | Via OpenTopography or Copernicus Data Space (requires auth) |
| SRTM 30m (dwtkns) | ✅ Available | 30m | Via dwtkns.com tile selector |
| Mapbox Terrain RGB | ✅ Available | Variable | Requires Mapbox API token |
| Jersey Gov LiDAR | ✅ Available | High-res | Via Digital Jersey Startup Licensing Scheme |

### Terrarium Elevation Tiles (Recommended — Free, No Auth)

**URL pattern**: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`

**Encoding**: `height = (R * 256 + G + B / 256) - 32768`

**Tiles downloaded for Jersey at zoom 12**:
- 16 tiles (4×4 grid), tile range x=[2022,2025], y=[1401,1404]
- File sizes: 757 bytes (ocean tiles) to 84KB (land tiles)
- Total stitched grid: 1024×1024 pixels

**Elevation statistics for Jersey**:
- Land pixels (>0m): 204,062
- Ocean pixels (≤0m): 844,514
- **Elevation range: 0m to 133.9m** (matches real Jersey — highest point is 136m at Les Platons)
- Mean elevation: 61.5m
- Standard deviation: 34.2m

**Tiles saved to**: `/tmp/jersey_dem_tiles/` (16 PNG files)
**Numpy array saved to**: `/tmp/jersey_elevation_z12.npy` (1024×1024 float32)
**Visualization saved to**: `/tmp/jersey_elevation_z12.png`

**For higher resolution**: Use zoom 13 (49 tiles, ~19m resolution). URL pattern same, just change z=13 and compute new x/y ranges.

### Copernicus DEM GLO-30
Available via:
- OpenTopography: https://portal.opentopography.org/raster?opentopoID=OTSDEM.032021.4326.3
- Copernicus Data Space: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- Earth Data Hub (Zarr): https://earthdatahub.destine.eu/collections/copernicus-dem/datasets/GLO-30

30m global coverage, free under Copernicus license. Jersey tile: N49W002.

### Jersey Government LiDAR
From Digital Jersey (https://www.digital.je/initiatives/government-gis-data/):
- **Full LiDAR 3D model** of the island from 2019 or 2021
- **5m contours** for the island
- **10cm ortho-photography**
- Available via **Startup Licensing Scheme** (must apply, competitive process)
- Eligibility: <3 years old, <20 employees, <£2m revenue

---

## 5. Approach Comparison

### Approach A: Overlay Roads on Procedural Terrain

**Description**: Keep the existing Perlin noise + elliptical island mask terrain. Convert OSM road coordinates to game coordinates and render as flat ribbon meshes on top of the terrain surface.

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Feasibility | ⭐⭐⭐⭐⭐ | Data already downloaded. Just needs coordinate conversion + ribbon mesh generation. ~200 lines of code. |
| iPad Performance | ⭐⭐⭐⭐⭐ | ~70K triangles for roads. Current game handles much more. No shader changes. |
| Accuracy | ⭐⭐⭐ | Road positions are real GPS coords → accurate street layout. But terrain is fake, so roads don't follow real hills. |
| Maintainability | ⭐⭐⭐⭐ | Straightforward code, easy to filter/modify road types. |
| Integration | ⭐⭐⭐⭐⭐ | Uses existing `getTerrainHeight()`, `islandMask()`, coordinate mapping. No architectural changes. |
| Progressive Enhancement | ⭐⭐⭐⭐⭐ | Can add roads without touching terrain code. Game keeps working throughout. |

**Implementation time**: 1-2 days
**Risk**: Low — all components are proven (OSM data, coordinate mapping, terrain height function)

### Approach B: Full GIS Rebuild with Real Terrain + Roads

**Description**: Replace procedural terrain with real DEM elevation data. Drape OSM roads on real terrain. Optionally use government GIS data for buildings, contours, ortho-photos.

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Feasibility | ⭐⭐⭐ | DEM tiles confirmed working. But requires terrain mesh rebuild, coordinate system adjustment, potential texture mapping. ~800-1200 lines. |
| iPad Performance | ⭐⭐⭐ | 1024×1024 DEM grid = 1M vertices. Need to downsample to ~256×256 for iPad. Texture-mapped terrain is heavier than vertex-colored. |
| Accuracy | ⭐⭐⭐⭐⭐ | Real elevation (0-134m matches Jersey). Real road positions on real terrain. Could add ortho-photo texture for photorealism. |
| Maintainability | ⭐⭐⭐ | More complex data pipeline. Need to handle DEM tile downloading, stitching, encoding. |
| Integration | ⭐⭐⭐ | Requires replacing `getTerrainHeight()`, `islandMask()`, and all terrain generation code. Car physics, trees, buildings all need adjustment. |
| Progressive Enhancement | ⭐⭐ | Major refactor — game would be broken during transition. Need feature flag or separate build. |

**Implementation time**: 5-10 days
**Risk**: Medium — DEM-to-terrain pipeline, performance optimization, coordinate system alignment, potential need to retune car physics for real slopes

### Hybrid: A now, B later (RECOMMENDED)

1. **Phase 1 (immediate)**: Implement Approach A — overlay roads on procedural terrain
2. **Phase 2 (future)**: Replace terrain with DEM data, keeping the road overlay system
3. **Phase 3 (optional)**: Apply for Jersey GIS Startup License for buildings, contours, ortho-photos

This gives immediate visual improvement (real road network) with zero risk to the existing game, and leaves the door open for real terrain later.

---

## 6. Jersey-Specific GeoJSON / Shapefile Datasets

### Government of Jersey GIS Data (via Digital Jersey)

**Source**: https://www.digital.je/initiatives/government-gis-data/

Available datasets (under Startup Licensing Scheme):
- ✅ **Roads**: Polygons depicting the extents of the Island's roads with unique and official road names
- ✅ **Buildings**: Island-building polygons, fully attributed and classified by type
- ✅ **Parish boundaries**: High Water polygon data of Island Parishes and Vingtaines
- ✅ **Land Parcels**: Polygons depicting individual land parcels with address details
- ✅ **Contours**: 5m contours for the Island
- ✅ **Coastal Classification**: Polygon layer detailing coastline (sand, rock, cliff, pebbles)
- ✅ **Streams and Water Features**: Including culverts, ponds and quarries
- ✅ **Ortho-photographs**: 10cm ground resolution, full colour, orthorectified
- ✅ **LiDAR Model**: Full LiDAR 3D model from 2019 or 2021
- ✅ **Historic Maps**: Geo-referenced paper maps

**Access**: Competitive application process via Digital Jersey. Requires:
- Company <3 years old, <20 employees, <£2m revenue
- Application form: https://www.digital.je/initiatives/government-gis-data/ (embedded Monday.com form)
- Assessment by expert panel
- License agreement with defined timeframe

**For VibeDrive.je**: This is a strong fit — a game startup using GIS data for a Jersey driving game. The road polygons (not just centerlines) and LiDAR would give the highest accuracy. The ortho-photography could be used as terrain textures.

### OpenData.je

**Source**: https://opendata.je/

- Has API endpoints and downloadable datasets
- Datasets focus on: car parks, public services, FOI data, courts, vehicles
- **No road network or GIS shapefiles** found in the available downloads
- API documentation: https://opendata.je/docs/getting-started/

### Government of Jersey Mapping Service

**Source**: https://www.gov.je/PlanningBuilding/JerseyMappingService/Pages/Digital.aspx

- Jersey digital mapping data — "similar to other online maps but more accurate and up to date"
- Available under Open Government Licence – Jersey v1.0 (OGL-J)
- Referenced alongside the Digital Jersey GIS licensing scheme

### OSM (OpenStreetMap) — Already Downloaded

**The OSM data we already have is the most immediately usable source.** It contains:
- 8,664 road segments with real GPS coordinates
- Road names, types, speed limits, surface info, lane counts
- Complete coverage of Jersey's road network
- Free under ODbL license — no application needed

---

## 7. Concrete Implementation Recommendations

### Phase 1: Road Overlay (Immediate — 1-2 days)

1. **Load OSM data**: Embed the `osm-roads.json` file (or a filtered subset) in the game
   - Filter to driveable roads only (~5,000 segments)
   - Consider compressing: extract only `geometry` arrays + `highway` tag + `name`
   - Expected compressed size: ~1-2 MB

2. **Coordinate conversion function**:
   ```javascript
   function gpsToGame(lat, lon) {
     const LNG_CENTER = -2.1976, LAT_CENTER = 49.1654;
     const SCALE_X = 496, SCALE_Z = 747.8, Z_OFFSET = -50;
     return {
       x: (lon - LNG_CENTER) * SCALE_X,
       z: (lat - LAT_CENTER) * SCALE_Z + Z_OFFSET
     };
   }
   ```

3. **Road mesh generation**: Use the flat ribbon approach (Section 3A)
   - Group roads by type for batch rendering
   - Use `THREE.BufferGeometry` with merged vertices for performance
   - Color by road type: trunk=yellow, primary=red, secondary=orange, residential=gray

4. **Terrain conforming**: Sample `getTerrainHeight()` at each road vertex
   - Offset roads +0.5 units above terrain to prevent z-fighting
   - For long segments, subdivide to follow terrain curvature

5. **Collision/optical**: Roads are visual only (no collision changes needed in Phase 1)
   - Car already drives on terrain height — roads are just a visual overlay
   - Future: snap car to nearest road for "on-road" physics bonus

### Phase 2: Real Terrain (Future — 5-10 days)

1. **Download Terrarium DEM tiles** at zoom 13 (49 tiles, ~19m resolution)
   - Or apply for Jersey LiDAR via Digital Jersey for highest quality
2. **Stitch into elevation grid** and downsample to 256×256 for iPad
3. **Replace terrain mesh**: Use DEM grid as heightmap instead of Perlin noise
4. **Adjust island mask**: Use real coastline from OSM or government data
5. **Re-tune car physics**: Real slopes (up to ~30° in places) may need physics adjustments
6. **Terrain texturing**: Vertex colors based on elevation + slope, or ortho-photo texture

### Phase 3: Government GIS Data (Optional — requires license application)

1. Apply to Digital Jersey Startup Licensing Scheme
2. Get road polygons (more accurate than OSM centerlines)
3. Get building polygons for real building placements
4. Get ortho-photography for terrain textures
5. Get LiDAR for highest-resolution terrain

---

## 8. Key Files

| File | Description |
|------|-------------|
| `/root/vibe-drive-jersey/research/osm-roads.json` | Full Jersey OSM road data (6.8MB, 8,664 segments) |
| `/tmp/jersey_dem_tiles/` | 16 Terrarium elevation tiles at zoom 12 |
| `/tmp/jersey_elevation_z12.npy` | Stitched elevation grid (1024×1024 float32) |
| `/tmp/jersey_elevation_z12.png` | Elevation visualization (grayscale) |

---

## 9. Risks & Mitigations

| Risk | Probability | Mitigation |
|------|------------|------------|
| OSM road data doesn't align with procedural terrain | Medium | Roads will visually drape on fake terrain — looks acceptable for a game. Mitigate by making terrain shape roughly match Jersey's real topography. |
| Too many road segments hurts iPad performance | Low | 5,000 roads × ~7 points = manageable. Can use LOD: only render nearby roads in high detail. Batch by type into merged geometries. |
| Overpass API goes down during development | Low | Data is already downloaded and saved locally. No runtime API dependency needed. |
| DEM terrain replacement breaks car physics | Medium | Phase 2 only — test thoroughly. Keep procedural terrain as fallback. Real slopes are gentle in Jersey (max ~30°). |
| Government GIS license denied | Low | OSM data is sufficient for Phase 1 & 2. Government data is enhancement only. |