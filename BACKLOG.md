# Vibe Drive Jersey — Master Ticket Backlog
# Updated: 2026-08-20 post-hackathon

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## COMPLETED TICKETS (all merged to main branch)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- [x] T-LIGHTING — Hemisphere light, sun arc, sky colors, clouds, moon
- [x] T-REWARDS — Score, landmarks, distance, toasts, localStorage
- [T-ADS — 10 billboards with CanvasTexture, proximity popups
- [x] T-PINPOINT — Pinpoint gold-border billboard at Union Street
- [x] T-ARROW-KEYS — Exponential accel, braking, turning, lateral slide, handbrake
- [x] T-BOAT — Boat model, wake trail, tide, buoys, land collision
- [x] T-FLY — Cessna physics, takeoff, shadow, banking, propeller
- [x] T-HEADLIGHTS — SpotLight cones, taillights, night toggle
- [x] T-RADAR — Real coastline from islandMask(), 120-ray sampling
- [x] T-STEERING — TURN_RATE 3.0, steerValue ±2.5, document pointer events
- [x] T-BUSINESSES — 10 businesses at real GPS coordinates
- [x] T-LANDMARKS — 7 landmarks (castles, lighthouse, airport, Sorel, breakwater, pier)
- [x] T-PARISHES — 12 floating parish labels
- [x] T-MISSIONS — Taxi pick-up/drop-off, waypoint beams, timer, +100 pts
- [x] T-POLICE — Wanted level 0-5 stars, police chase, flashing lights
- [x] T-PEDESTRIANS — 25 NPC pedestrians, wander + flee AI
- [x] T-BRAND — Jersey Green/Blue/Yellow, Inter + JetBrains Mono, angular HUD
- [x] T-GIT — Repo at github.com/willtwilson/vibe-drive-jersey

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OPEN TICKETS — Phase 1: Multiplayer & Leaderboard
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### T-MULTIPLAYER: Real-time multiplayer (Supabase Realtime, 3-5 players)
**Priority:** HIGH | **Effort:** HIGH | **Status:** OPEN

Real-time multiplayer using Supabase Realtime channels on CT707 (100.105.179.50:8000).

**Architecture (DECIDED: Supabase, not raw WebSocket):**
- Use Supabase Realtime (already running, healthy) for player position broadcasts
- @supabase/supabase-js from CDN in index.html
- Channel: `vibedrive:jersey` (room-based)

**Player constraints:**
- Player limit: 3-5 concurrent
- Auto-disconnect: idle 10 minutes, online 2 hours max
- Reconnect on disconnect (retry 3x with 2s backoff)
- Player count indicator in HUD

**Client rendering:**
- Other players rendered as vehicles in 3D scene + radar dots with names
- Position broadcast at 10Hz, heartbeat at 1Hz
- Player vehicle color = hash of username

**Dependencies:** T-USERNAMES | **Infrastructure:** Ready (Supabase realtime running)

### T-USERNAMES: Username system
**Priority:** HIGH | **Effort:** LOW | **Status:** OPEN

Let players set a username that persists across sessions.

**Requirements:**
- Username prompt on first load (localStorage)
- Username displayed above car in 3D world (floating sprite text)
- Username shown on radar
- Username sent with multiplayer position broadcasts
- Changeable via settings button

**Dependencies:** None (localStorage only for single-player; T-MULTIPLAYER for online)

### T-LEADERBOARD: Persistent leaderboard (Supabase)
**Priority:** HIGH | **Effort:** MEDIUM | **Status:** OPEN

Server-backed persistent leaderboard using Supabase on CT707 (100.105.179.50:8000).

**Database (ALREADY PROVISIONED):**
- `players` table: {id UUID, username TEXT UNIQUE, avatar_url TEXT, best_time INT, total_drives INT, created_at, updated_at}
- `scores` table: {id UUID, username TEXT, score INT, mode TEXT, duration_seconds INT, created_at}
- RLS policies: public can INSERT/SELECT/UPDATE on both tables
- Realtime publication enabled on both tables
- 4 sample scores already in database

**Client integration:**
- Embed Supabase anon key + API URL in index.html
- Use @supabase/supabase-js from CDN or direct REST calls
- Leaderboard button in HUD → modal showing top 10
- Auto-submit score on session end or landmark achievement

**Dependencies:** T-USERNAMES

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OPEN TICKETS — Phase 2: GTA Jersey Online (Real Roads)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### T-REAL-ROADS: Drive on actual Jersey streets
**Priority:** HIGH | **Effort:** HIGH | **Status:** RESEARCH COMPLETE — Ready for Tournament Mode

Replace the procedural terrain with a real road network from OpenStreetMap.

**Research findings:**
- 8,664 road segments from OSM via overpass.openstreetmap.fr (6.5MB, saved to research/osm-roads.json)
- ~5,200 driveable roads with names, speed limits, surface types, lane counts
- Recommended: Approach A (overlay on procedural terrain, flat ribbon rendering, ~70K triangles)
- DEM elevation data available (Copernicus 30m) for future terrain upgrade
- Three.js: use ExtrudeGeometry along CatmullRomCurve3, LOD for distant roads

**Tournament Mode:** 3 contenders (k2.7-code, glm-5.2, deepseek-pro-v4), judge on different model
**Dependencies:** None (data in hand)

### T-GTA-TRAFFIC: Real traffic system on roads
**Priority:** MEDIUM | **Effort:** HIGH | **Status:** OPEN

AI traffic cars that follow the real road network, stop at junctions, drive on the left.

**Requirements:**
- 15-20 AI cars following road waypoints
- Stop at red traffic lights
- Lane discipline (drive on left)
- Different car types/colors
- Slow down for cars ahead

**Dependencies:** T-REAL-ROADS

### T-GTA-MULTIPLAYER-CHAT: In-game chat
**Priority:** LOW | **Effort:** MEDIUM | **Status:** OPEN

Simple chat overlay for multiplayer sessions.

**Dependencies:** T-MULTIPLAYER

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OPEN TICKETS — Phase 3: Real-World Data Integration
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### T-PERSONAL-LANDMARKS: Family landmarks
**Priority:** MEDIUM | **Effort:** LOW | **Status:** OPEN

Add personal landmarks meaningful to the family.

**Landmarks to add:**
- Victoria College: (53.9, -66.2) — Victorian school building, +50 pts
- St Michael's School: (59.8, -72.9) — school building, +50 pts
- Caesarean Tennis Club: (58.3, -70.6) — tennis court model (green surface + fence), +25 pts
- Island Padel: (60.8, -64.7) — padel court model (blue glass walls), +25 pts
- Elizabeth Marina: (43.4, -59.4) — marina with boats docked, +50 pts. Family boat: Sunseeker Superhawk 43 "Aura" — model a sleek motor yacht at the marina

**Requirements:**
- Each landmark gets a distinctive 3D model (not just a label)
- Floating name label above each
- Add to landmarks array for rewards
- Elizabeth Marina: render marina pontoons with several boats, with "Aura" named
- Schools: distinctive architecture (Victoria College = Victorian stone building)

**Dependencies:** None

### T-BUS-ROUTES: Real Liberty Bus routes and live data
**Priority:** MEDIUM | **Effort:** MEDIUM | **Status:** RESEARCH COMPLETE

Integrate Liberty Bus API to show real bus positions and routes on the map.

**Research findings:**
- LibertyBus API: api2.libertybus.je/v1/ (no auth, Tenant: jsy header)
- 30 routes, full timetables, service alerts
- 744 OSM bus stops with coordinates and names (research/jersey-bus-stops-osm.json)
- 33 OSM route relations + 607 way geometries as GeoJSON (research/jersey-bus-route-ways-osm.geojson)
- No real-time live tracking (Guernsey only) — simulate positions via timetable interpolation
- Phased: (1) static route lines + stops, (2) simulated live buses via timetable, (3) contact LibertyBus for real API

**Dependencies:** T-REAL-ROADS (for road network to follow)

### T-FLIGHT-DATA: Live Jersey Airport flight tracking
**Priority:** LOW | **Effort:** MEDIUM | **Status:** RESEARCH COMPLETE

Show live arrivals/departures from Jersey Airport and live flight data.

**Research findings:**
- Ports of Jersey CDN: pojcdn.blob.core.windows.net/data/airportArrivals48h.json — free, no auth
- 56 arrivals + 56 departures, 48h window. Fields: Flightnumber, From, To, Scheduled, Status, Airline
- OpenSky Network API: opensky-network.org/api/states/all — free, 400 calls/day, real-time 3D aircraft positions
- Verified live: 18 aircraft in Channel Islands region
- Routes: London Gatwick/Heathrow, Glasgow, Manchester, Dublin, Paris, Amsterdam, Guernsey

**Dependencies:** None (can work independently)

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OPEN TICKETS — Phase 4: Polish & Content
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### T-COLLECTIBLES: Hidden packages around Jersey
**Priority:** LOW | **Effort:** LOW | **Status:** OPEN**

50 hidden collectibles (GTA-style hidden packages) at landmarks and scenic spots.

### T-RADIO: Web Audio radio stations
**Priority:** LOW | **Effort:** LOW | **Status:** OPEN**

Radio station selector with looping audio (Jersey-focused: local radio streams).

### T-TRAFFIC-LIGHTS: Traffic lights at intersections
**Priority:** LOW | **Effort:** LOW | **Status:** OPEN**

4-6 traffic lights at key intersections, red/yellow/green cycle.

### T-DAY-NIGHT-WEATHER-IMPROVE: Enhanced weather
**Priority:** LOW | **Effort:** MEDIUM | **Status:** OPEN**

Rain particles, fog, snow (rare in Jersey!), storm effects based on Open-Meteo data.

### T-OPEN-DESIGN-FULL: Full design polish
**Priority:** LOW | **Effort:** MEDIUM | **Status:** OPEN**

Apply remaining DESIGN-SUGGESTIONS.md items: nav bar polish, pitch deck improvements, presentation flow.

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## INFRASTRUCTURE TICKETS
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### T-TAILSCALE-REAUTH: Reauthenticate Tailscale on Hermes box
**Priority:** HIGH | **Effort:** TRIVIAL | **Status:** NEEDS USER ACTION**

Tailscale was removed from the management console. Hermes box (100.114.180.15) shows "offline".
Need to re-auth: `tailscale up` on the Hermes box.

### T-LOCAL-ACCESS: Make game accessible locally (no Tailscale Funnel)
**Priority:** HIGH | **Effort:** TRIVIAL | **Status:** OPEN**

Since Tailscale Funnel is down, game is accessible only via:
- Local network: http://192.168.0.220:5173 (Hermes LAN IP)
- Tailscale network: http://100.114.180.15:5173 (once re-authed)

Options for the kids:
1. Bookmark the local IP on iPad
2. Re-auth Tailscale and use the Tailscale IP
3. Set up a custom DNS entry (e.g., drive.local) pointing to the Hermes box