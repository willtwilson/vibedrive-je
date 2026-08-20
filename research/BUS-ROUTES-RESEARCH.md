# BUS-ROUTES-RESEARCH: Integrating Real Jersey Bus Data into VibeDrive.je

## Summary

**There IS a working API.** LibertyBus runs a REST API at `https://api2.libertybus.je/v1/` that serves full GTFS-style timetable data, route lists, and service alerts. Combined with OpenStreetMap data (744 bus stops with coordinates, 33 route relations, 607 way geometries), we have everything needed to render real bus routes on the 3D map. **Live bus tracking does NOT exist for Jersey** — it's Guernsey-only via the web app, though the mobile app claims "Track Buses Live."

---

## 1. LibertyBus Public API ✅ FOUND

### API Details

| Property | Value |
|----------|-------|
| **Base URL** | `https://api2.libertybus.je/v1/` |
| **Auth** | None required — just send `Tenant: jsy` header |
| **Backend** | Ruby on Rails (error messages reveal "undefined method... for nil") |
| **Storage** | AWS S3 (`tower-transit-storage.s3.eu-west-2.amazonaws.com`) |
| **Operator** | Tower Transit (multi-tenant system: Jersey=jsy, Guernsey=gsy) |
| **Frontend** | Vite + Vue 3 + Vuetify SPA at libertybus.je |

### Required Header

```
Tenant: jsy
```

Without this header, all endpoints return `{"error":{"title":"Internal Server Error","detail":"undefined method '...' for nil"}}`.

### Discovered Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /v1/gtfs_timetables/{date}` | GET | List all routes for a season (returns route_id, route_short_name, route_long_name) |
| `GET /v1/gtfs_timetables/{route}` | GET | Route list for a timetable period |
| `GET /v1/gtfs_timetables/{route}/{direction}/{date}` | GET | **Full timetable** — all trips with stop sequences and times |
| `GET /v1/service_alerts` | GET | Active service alerts/disruptions |
| `GET /v1/service_alerts/{id}` | GET | Specific alert |
| `GET /v1/articles` | GET | News articles |
| `GET /v1/articles/latest` | GET | Latest news |
| `GET /v1/articles/featured` | GET | Featured articles |
| `GET /v1/articles/{slug}` | GET | Specific article |
| `GET /v1/banners` | GET | Homepage banners |
| `GET /v1/pages/{slug}` | GET | Static pages |
| `GET /v1/policies/{slug}` | GET | Policy pages |
| `GET /v1/faqs` | GET | FAQs |
| `GET /v1/google/autocomplete/{input}/{types}` | GET | Google Places autocomplete (journey planner) |
| `GET /v1/google/directions/{origin_lat}/{origin_lng}/{dest_lat}/{dest_lng}/{mode}` | GET | Google Directions API proxy |
| `POST /v1/avanchi18s` | POST | Avanchi18 card registration (multipart/form-data) |

### Timetable Data Structure

```json
{
  "direction": "outbound",
  "date": "2026-08-20",
  "route_short_name": "1",
  "trips": [
    {
      "trip_id": "VJ124",
      "trip_headsign": "1",
      "departs_at": "06:25",
      "stop_times": [
        {
          "stop_id": "89204525",
          "stop_name": "Bus Station",
          "arrival_time": "06:25",
          "departure_time": "06:25",
          "sequence": 0,
          "service_exceptions": []
        }
      ]
    }
  ]
}
```

**Route 1 outbound has 55 trips, 42 stops per trip, 43 unique stop IDs.**

### Route List (30 routes, Spring 2026 timetable)

Routes: 1, 1A, 1G, 2, 2A, 3, 4, 4A, 5, 5A, 7, 8, 9, 10, 12, X12, 12A, 13, 14, 15, 16, 19, 20, 21, 22, X22, 23, 24, 28, 33

### Critical Gap: No Stop Coordinates in API

The API uses GTFS-style numeric `stop_id` values (e.g., `89204525`) but **does not expose a stops endpoint** with lat/lon coordinates. We must cross-reference stop names with OSM bus stops to get positions. Testing showed **39/42 stop names match** between the API timetable and OSM data for Route 1.

### Example API Calls

```bash
# Get all routes
curl -s -H "Tenant: jsy" "https://api2.libertybus.je/v1/gtfs_timetables/1"

# Get full timetable for route 1 outbound today
curl -s -H "Tenant: jsy" "https://api2.libertybus.je/v1/gtfs_timetables/1/outbound/2026-08-20"

# Get service alerts
curl -s -H "Tenant: jsy" "https://api2.libertybus.je/v1/service_alerts"
```

---

## 2. GTFS Feed Search ❌ NOT FOUND

- **transit.land**: API v2 returned "Not found" for country=JE. No Jersey feeds indexed.
- **openmobilitydata.org**: Cloudflare challenge blocked access, but no known Jersey GTFS feeds exist.
- **transitfeeds.com**: API requires a key; no known Jersey feeds.
- **No GTFS zip download** is available from libertybus.je or api2.libertybus.je.

**However**, the API itself is GTFS-derived (uses `route_id`, `trip_id`, `stop_id`, `stop_times`, `arrival_time`, `departure_time`, `sequence` — all GTFS terminology). The backend likely has a GTFS feed imported into a database. We can reconstruct a GTFS feed from the API data + OSM coordinates.

---

## 3. OpenStreetMap Bus Stops ✅ 744 STOPS FOUND

### Overpass Query Used

```
[out:json][timeout:25];
node[highway=bus_stop](49.15,-2.25,49.30,-2.00);
out;
```

### Results

| Metric | Value |
|--------|-------|
| Total bus stops | 744 |
| With coordinates | 744 (100%) |
| Named stops | 736 (99%) |
| Lat range | 49.1637 to 49.2560 |
| Lon range | -2.2441 to -2.0187 |
| With ref codes | ~700 (e.g., "4262") |
| With shelter info | ~700 |

### Overpass Endpoints Tested

- `https://overpass-api.de/api/interpreter` — ✅ Working (used for all data collection)
- `https://overpass.kumi.systems/api/interpreter` — ✅ Working (backup)

### Route Relations from OSM (33 relations)

All operated by Liberty Bus, networks: `JE:Bus`, `myBus`, `Liberty Bus`.

Routes found: 1, 1A, 2, 3, 4, 5, 7, 8, 9, 12a, 13, 14, 15, 16, 19, 21, 22, 27

### Route Way Geometries from OSM (607 ways)

Full road-segment geometries for all bus routes, saved as GeoJSON LineString collection. Each way has lat/lon coordinate arrays that can be directly rendered as 3D lines.

---

## 4. Real-Time Bus Tracking ⚠️ PARTIAL

### Web App Live Tracker

The libertybus.je SPA has a `/live_tracker` route, but it is **Guernsey-only**. The navigation menu item is conditionally shown:

```javascript
{label:"Live tracker", icon:"mdi-map-marker", to:{name:"live.tracker"}, 
 condition: this.tenant.slug === "gsy"}  // Guernsey only!
```

Navigating to `/live_tracker` on the Jersey tenant redirects to home.

### Mobile App

The LibertyBus app (promoted on the website) claims "Track Buses Live and see Diversion Notices." This suggests live tracking exists in the mobile app but may use a different API (possibly UrbanThings/Jump). The web bundle references:
- `https://jump.urbanthings.io/id/liberty-app-multi` — UrbanThings transit data platform
- `https://jump.urbanthings.io/id/busesgg-app-multi` — Guernsey buses app

The UrbanThings Jump API returned a .NET-style 404: `"No HTTP resource was found that matches the request URI"`.

### No WebSocket/SSE in Web Bundle

No WebSocket, Socket.io, or Server-Sent Events patterns found in the SPA JavaScript bundle. Live tracking likely uses polling on a mobile-specific API endpoint.

### Recommendation for Live Positions

Since no public live-tracking API is available for Jersey:
1. **Contact LibertyBus directly** (info@libertybus.je, 01534 828555) to request API access for live vehicle positions
2. **Simulate bus positions** using the timetable data — calculate where each bus should be at the current time based on scheduled stop times and interpolate between stops
3. **Check the mobile app** by intercepting its API traffic (the app likely calls a different endpoint for live positions)

---

## 5. Three.js Rendering of Bus Routes

### Recommended Approach: CatmullRomCurve3 + TubeGeometry

Based on Three.js docs and forum discussions:

```javascript
// 1. Convert lat/lon to game world coordinates
function latLonToVector3(lat, lon, radius = 1) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

// For a flat-map game like VibeDrive, use simple linear projection:
function latLonToGameXY(lat, lon, mapBounds) {
    const x = (lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon) * mapWidth;
    const z = (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat) * mapDepth;
    return new THREE.Vector3(x, routeElevation, z);
}

// 2. Create curve from stop coordinates
const points = stopCoordinates.map(s => latLonToGameXY(s.lat, s.lon));
const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);

// 3. Create tube geometry for visible route line
const geometry = new THREE.TubeGeometry(curve, 64, 0.5, 8, false);
const material = new THREE.MeshBasicMaterial({ 
    color: routeColor, 
    transparent: true, 
    opacity: 0.8 
});
const routeMesh = new THREE.Mesh(geometry, material);

// 4. For animated buses moving along the route
const busPosition = curve.getPointAt(t); // t = 0..1 along route
const busRotation = curve.getTangentAt(t);
```

### Alternative: Simple Line Rendering

For performance with many routes, use `THREE.Line` or `Line2` (fat lines):

```javascript
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ 
    color: routeColor, 
    linewidth: 3  // Note: linewidth >1 requires Line2/LineMaterial
});
const line = new THREE.Line(geometry, material);
```

### Route Colors

OSM route relations don't have colour tags. Assign colors per route number:
```javascript
const routeColors = {
    '1': '#e74c3c',   // Red
    '1A': '#e67e22',   // Orange
    '2': '#3498db',    // Blue
    '3': '#2ecc71',    // Green
    '4': '#9b59b6',    // Purple
    '5': '#f1c40f',    // Yellow
    // ... etc
};
```

### Libraries

- **three-geo** (github.com/w3reality/three-geo): 3D geographic visualization, satellite-textured terrain
- **geo-three** (github.com/tentone/geo-three): Map tiles as Three.js meshes
- **Google Maps WebGL Overlay**: WebGLOverlayView with Three.js for Google Maps integration

---

## 6. Site Tech Stack & Scraping Analysis

### libertybus.je Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Vue 3 + Vuetify 3 (Vite SPA) |
| Build | Vite (module JS at `/assets/index.bc2eba77.js`) |
| Backend API | Ruby on Rails at `api2.libertybus.je` |
| Storage | AWS S3 (`tower-transit-storage.s3.eu-west-2.amazonaws.com`) |
| Server | Apache/2.4.52 (Ubuntu) |
| Maps | Google Maps API (autocomplete, directions) |
| Analytics | Google Analytics (G-RYXKT0MGKF) |
| Transit Platform | UrbanThings (jump.urbanthings.io) |
| Operator | Tower Transit (multi-tenant: Jersey + Guernsey) |
| Version | 2.00.011 |

### Scraping Not Needed — API Works

The API is unauthenticated (only needs `Tenant: jsy` header). No scraping required. The SPA is a standard Vue app that calls the same REST API we can call directly.

---

## Data Files Saved

| File | Description | Size |
|------|-------------|------|
| `jersey-bus-stops-osm.json` | 744 bus stops with lat/lon/name/ref | ~100KB |
| `jersey-bus-routes-osm.json` | 33 OSM route relations (ref, name, operator) | ~5KB |
| `jersey-bus-routes-api.json` | 30 routes from LibertyBus API (route_id, names) | ~2.5KB |
| `jersey-route1-timetable-sample.json` | Full route 1 outbound timetable (55 trips, 42 stops) | ~466KB |
| `jersey-bus-route-ways-osm.geojson` | 607 way geometries as GeoJSON LineStrings | ~700KB |
| `jersey-service-alerts.json` | Active service alerts/disruptions | ~5KB |

---

## Concrete Recommendations for VibeDrive.je

### Phase 1: Static Route Display (Easy, 1-2 days)

1. **Load OSM bus stop data** (`jersey-bus-stops-osm.json`) — 744 stops with coordinates
2. **Load OSM route way geometries** (`jersey-bus-route-ways-osm.geojson`) — 607 road segments
3. **Convert lat/lon to game world coordinates** using the same projection as the road network
4. **Render each route as a colored TubeGeometry line** at a small elevation above the road surface
5. **Place bus stop markers** at each stop position (small pole + sign mesh)
6. **Show route number labels** at route termini

### Phase 2: Live Timetable Integration (Medium, 2-3 days)

1. **Fetch timetable data** from `https://api2.libertybus.je/v1/gtfs_timetables/{route}/{direction}/{date}` with `Tenant: jsy` header
2. **Build a stop-name → OSM-coordinate lookup table** (39/42 names match for route 1; may need manual mapping for unmatched stops)
3. **Simulate bus positions** by interpolating between stops based on scheduled times:
   - Find the current time in the timetable
   - Determine which stop the bus just departed and which is next
   - Interpolate position along the route geometry between those stops
   - Move 3D bus models along the CatmullRomCurve3
4. **Update every 10-30 seconds** (timetable data is static per day; no need for rapid polling)

### Phase 3: Real Live Tracking (Hard, requires LibertyBus cooperation)

1. **Contact LibertyBus** (info@libertybus.je) to request:
   - Access to the live vehicle positions API (used by mobile app)
   - A GTFS feed download URL (if available internally)
   - Access to the UrbanThings/Jump API for real-time data
2. **If granted**, poll the live positions endpoint and update bus meshes in real-time
3. **If denied**, continue with timetable-based simulation (Phase 2) — it will be visually convincing

### Phase 4: Service Alerts (Easy, 1 day)

1. **Poll** `https://api2.libertybus.je/v1/service_alerts` with `Tenant: jsy` header
2. **Display active alerts** as toast notifications or info boards at the LibertyBus billboard (coordinates 44.5, -68.4 in St Helier)
3. **Show diversion routes** by highlighting affected route segments in a different color

### Key Coordinate Conversion

Jersey bounds from OSM data:
- **Lat**: 49.1637 to 49.2560 (≈10.3 km north-south)
- **Lon**: -2.2441 to -2.0187 (≈14.5 km east-west)

Map these to the game's world coordinates. The game already has a road network — use the same projection.

### Code Snippet: Fetch All Timetables

```javascript
const API_BASE = 'https://api2.libertybus.je/v1';
const HEADERS = { 'Tenant': 'jsy' };

async function fetchAllRoutes() {
    const res = await fetch(`${API_BASE}/gtfs_timetables/1`, { headers: HEADERS });
    return res.json();
}

async function fetchTimetable(routeShortName, direction, date) {
    const res = await fetch(
        `${API_BASE}/gtfs_timetables/${routeShortName}/${direction}/${date}`,
        { headers: HEADERS }
    );
    return res.json();
}

async function fetchServiceAlerts() {
    const res = await fetch(`${API_BASE}/service_alerts`, { headers: HEADERS });
    return res.json();
}
```

### Code Snippet: Bus Position Simulation

```javascript
function getBusPosition(timetable, currentTime, stopCoordinates) {
    // Find the trip closest to current time
    for (const trip of timetable.trips) {
        const firstDep = trip.stop_times[0].departure_time;
        const lastArr = trip.stop_times[trip.stop_times.length - 1].arrival_time;
        
        if (currentTime >= firstDep && currentTime <= lastArr) {
            // Find which segment the bus is on
            for (let i = 0; i < trip.stop_times.length - 1; i++) {
                const stopA = trip.stop_times[i];
                const stopB = trip.stop_times[i + 1];
                
                if (currentTime >= stopA.departure_time && currentTime <= stopB.arrival_time) {
                    // Interpolate between stopA and stopB
                    const segmentDuration = timeToMinutes(stopB.arrival_time) - timeToMinutes(stopA.departure_time);
                    const elapsed = timeToMinutes(currentTime) - timeToMinutes(stopA.departure_time);
                    const t = elapsed / segmentDuration;
                    
                    const posA = stopCoordinates[stopA.stop_name];
                    const posB = stopCoordinates[stopB.stop_name];
                    
                    return {
                        x: posA.x + (posB.x - posA.x) * t,
                        z: posA.z + (posB.z - posA.z) * t,
                        route: timetable.route_short_name
                    };
                }
            }
        }
    }
    return null; // No bus running at this time
}
```