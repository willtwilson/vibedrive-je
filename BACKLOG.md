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

### T-MULTIPLAYER: Real-time multiplayer visibility
**Priority:** HIGH | **Effort:** HIGH | **Status:** OPEN

Show other actual human players online on the same map, visible on each other's radar and in the 3D world.

**Requirements:**
- WebSocket server (Node.js on Hermes box, port 5174)
- Player position broadcast: {x, z, heading, speed, vehicleMode, username}
- Other players rendered as cars/boats/planes in the 3D scene
- Other players visible on radar as colored dots with names
- Player count indicator in HUD
- Reconnect on disconnect
- Room code system (default: "jersey") so kids can play together

**Dependencies:** None (standalone WebSocket server)

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

### T-LEADERBOARD: Persistent leaderboard
**Priority:** HIGH | **Effort:** MEDIUM | **Status:** OPEN

Server-backed persistent leaderboard for highest scores.

**Requirements:**
- Leaderboard API (Node.js endpoint on Hermes box)
- Store: username, score, distance, missions completed, timestamp
- Top 10 displayed in-game (accessible via button)
- SQLite or JSON file for persistence
- Leaderboard view: rank | name | score | distance | date

**Dependencies:** T-USERNAMES

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OPEN TICKETS — Phase 2: GTA Jersey Online (Real Roads)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### T-REAL-ROADS: Drive on actual Jersey streets
**Priority:** HIGH | **Effort:** HIGH | **Status:** OPEN

Replace the procedural terrain with a real road network from OpenStreetMap, so players drive on actual Jersey streets.

**Requirements:**
- Fetch OSM road data via Overpass API (retry with smaller queries, or use a static export)
- Build road mesh network in Three.js — roads as flat textured strips
- Car physics: constrain car to road surface (off-road = slow down)
- Road textures: asphalt for main roads, lighter for residential
- Lane markings: white dashed center line, drive on the LEFT (Jersey)
- Road names as floating text at intersections
- GPS-style minimap showing road network (not just island shape)

**Dependencies:** Overpass API availability (was down during hackathon — retry needed)

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

### T-SCHOOLS: Add Victoria College and St Michael's
**Priority:** MEDIUM | **Effort:** LOW | **Status:** OPEN

Add the kids' schools as landmarks.

**Requirements:**
- Victoria College: 49.187, -2.089 (St Helier) — school building model
- St Michael's School: 49.196, -2.077 (St Saviour) — school building model
- School buildings: distinctive architecture (Victorian for Victoria College)
- School name as floating label
- Add to landmarks array for rewards (+50 pts)

**Dependencies:** None

### T-BUS-ROUTES: Real Liberty Bus routes and live data
**Priority:** MEDIUM | **Effort:** MEDIUM | **Status:** OPEN

Integrate Liberty Bus API to show real bus positions and routes on the map.

**Requirements:**
- Research Liberty Bus API (libertybus.je) — find API endpoint or scrape
- Real bus routes as colored lines on the 3D map
- Live bus positions as bus models moving along routes
- Bus stop markers at real positions
- HUD toggle to show/hide bus routes
- Route numbers displayed above buses

**Dependencies:** T-REAL-ROADS (for road network), Liberty Bus API access

### T-FLIGHT-DATA: Live Jersey Airport flight tracking
**Priority:** LOW | **Effort:** MEDIUM | **Status:** OPEN**

Show live arrivals/departures from Jersey Airport and live flight data.

**Requirements:**
- Jersey Airport arrivals/departures board (web scrape from jerseyairport.com)
- Live flight positions from FlightRadar24 API or OpenSky Network
- Flights shown as plane models in the sky when in fly mode
- Airport HUD panel showing next departures/arrivals
- Flight number, destination, status (on time/delayed/cancelled)

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