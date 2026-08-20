# Vibe Drive Jersey 3D — Build Ticket

## Objective
Rebuild Vibe Drive Jersey as a full 3D driving game using Three.js, with real Jersey terrain data, 3D buildings from OpenStreetMap, and a drivable 3D car. Must work on iPad/iPhone Safari (touch controls) and be presentable as a hackathon demo.

## Current State
- Existing 2D Leaflet demo at /root/vibe-drive-jersey/index.html (working, deployed via Tailscale Funnel on port 5173)
- Three.js already installed in /root/vibe-drive-jersey/node_modules/three
- Python http.server running on port 5173 (background process)
- Public URL: https://hermes.tail8277f.ts.net

## Requirements

### 3D Terrain
- Generate a 3D terrain mesh for Jersey from elevation data
- Try these data sources IN ORDER until one works:
  1. SRTM GL3 hgt file for N49W002 (try: `wget https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL3.003/2000.02.11/N49W002.SRTMGL3.hgt.zip` — may need Earthdata login, try anonymous)
  2. OpenTopography API (register at portal.opentopography.org for free API key, then call globaldem API)
  3. OSM contour lines via Overpass API (way[tag="contour"] with elevation tags) — extrude into heightmap
  4. SYNTHETIC FALLBACK: Generate procedural terrain using Perlin/simplex noise seeded with Jersey's approximate shape (island ~8km x 15km, highest point 143m at Les Platons). This is acceptable for the hackathon demo if real data fails.
- Terrain mesh should be textured or colored to look like Jersey (green fields, rocky coast, beaches)
- Water surrounding the island (simple blue plane or shader)

### 3D Buildings
- Fetch building footprints from OpenStreetMap via Overpass API for Jersey bounding box (49.15,-2.25,49.30,-2.00)
- Query: `way["building"](49.15,-2.25,49.30,-2.00); out geom;`
- Overpass endpoint: https://overpass-api.de/api/interpreter
- If Overpass is overloaded, try: https://overpass.kumi.systems/api/interpreter
- Extrude buildings to 3D using building:levels tag if present, default 2-3 stories
- Buildings should be simple boxes (LoD1) — white/grey textures
- Position buildings correctly on the terrain mesh

### 3D Car
- Simple low-poly 3D car model (can be built from Three.js BoxGeometry — body + cabin + 4 wheels)
- Car should be red, with headlights (small spheres or planes with emissive material)
- Car drives on the terrain surface (follow terrain height)
- Touch controls: on-screen buttons (left/right/accelerate/brake) — SAME UI as current demo
- Keyboard fallback: arrow keys + WASD
- Car rotates with steering, tilts slightly when turning
- Camera follows behind car (third-person chase camera)

### Environment
- Sky: gradient blue sky (or use Three.js Sky shader)
- Lighting: directional light (sun) positioned based on actual time of day
- If night time: darker ambient, car headlights on, building windows lit
- Fog for depth perception

### Weather Integration
- Fetch from Open-Meteo: https://api.open-meteo.com/v1/forecast?latitude=49.21&longitude=-2.13&current=temperature_2m,wind_speed_10m,weather_code,is_day&timezone=Europe/Jersey
- Display temp/conditions in HUD overlay
- If rain: particle system or simple overlay
- Wind affects car slightly (subtle force)

### HUD (HTML overlay, not 3D)
- Weather display (temp, conditions, wind)
- Speedometer (km/h)
- Mode selector (Drive active, Boat/Fly "coming soon")
- Touch control buttons (semi-transparent, bottom of screen)
- All HUD elements use CSS, positioned over the Three.js canvas

### Deployment
- Keep the existing python3 http.server on port 5173
- Keep the Tailscale Funnel at https://hermes.tail8277f.ts.net
- The app should be a single index.html + main.js (or bundled) served from /root/vibe-drive-jersey/
- If using npm/three.js modules, use Vite or serve with proper MIME types
- The app must load fast — no long loading screens during demo

## Technical Constraints
- Must work on iPad/iPhone Safari (WebGL2 support, touch events)
- Use pointerdown/pointerup for touch controls (more reliable than touchstart on Safari)
- Use requestAnimationFrame for game loop
- Terrain mesh: keep polygon count reasonable for mobile (~10k-50k triangles max)
- Buildings: cap at ~200 buildings for performance
- Use 100dvh not 100vh for viewport height (iOS Safari)

## File Structure
```
/root/vibe-drive-jersey/
├── index.html          # Main HTML with Three.js canvas + HUD overlay
├── main.js             # Game logic (or use inline <script type="module">)
├── terrain.js          # Terrain generation/loading
├── buildings.js        # OSM building fetching + extrusion
├── car.js              # 3D car model + physics
├── weather.js          # Weather + day/night
├── package.json        # Already exists with three.js installed
├── PLAN.md             # Existing plan
├── HANDOFF-presentation.md  # Existing handoff
└── qr-code.png         # Existing QR code
```

## Priority Order (if time is short)
1. 3D terrain mesh + 3D car + touch controls = MINIMUM VIABLE DEMO
2. 3D buildings from OSM = NICE TO HAVE
3. Weather + day/night = NICE TO HAVE
4. Restaurant POIs = SKIP (already in 2D version)

## Do NOT break
- The Tailscale Funnel (https://hermes.tail8277f.ts.net must keep working)
- The python3 http.server on port 5173 (background process, do not kill)
- The existing 2D demo (rename to index-2d.html as backup)