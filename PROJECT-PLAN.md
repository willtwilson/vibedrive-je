# VibeDrive.je — Project Plan & Spec
# Post-hackathon, proper development

## Project Overview
VibeDrive.je is a 3D web-based driving game set in Jersey, Channel Islands. Built with Three.js, served from CT214 (devbox-hermes). Players drive, fly, and boat around a 3D representation of Jersey with real landmarks, businesses, parishes, live weather, day/night cycle, missions, police, pedestrians, and multiplayer.

## Infrastructure
- **Dev/serve box:** CT214 (devbox-hermes, 192.168.0.43, 4c/8GB/40GB)
- **Tailscale:** 100.111.152.2 (breachchain.tail8277f.ts.net)
- **GitHub:** https://github.com/willtwilson/vibedrive-je
- **LiteLLM proxy:** 192.168.0.217:4000 (23 models including ollama cloud)
- **Access:** LAN http://192.168.0.43:5173 or Tailscale http://100.111.152.2:5173
- **No public Funnel** — local/family access only

## Current State
- Single HTML file: index.html (~103KB, ~1558 lines)
- Three.js via import maps from unpkg CDN
- Procedural terrain (Perlin noise + elliptical island mask)
- 3 vehicle modes: drive, boat, fly
- 10 businesses, 7 landmarks, 12 parish labels at real GPS coords
- Missions, wanted/police, 25 pedestrians, radar, rewards, day/night
- No backend, no build step, no tests, no CI

## Architecture Decision: Refactor
**Decision needed from Will:** Refactor to Vite + ES modules before or after new features?

Options:
- A: Refactor first (clean base, slower to first new feature)
- B: Features first on single HTML (faster delivery, debt grows)
- C: Refactor in parallel (new features on current file, refactor as separate branch)

## Phase 1 — Multiplayer & Identity (build now)

### T-USERNAMES
**Spec:** Username prompt on first load. Stored in localStorage. Displayed as floating sprite text above car. Shown on radar. Included in multiplayer broadcasts. Changeable via settings button.
**Effort:** LOW | **Deps:** None | **Ready:** YES

### T-MULTIPLAYER
**Spec:** WebSocket server on CT214 (Node.js, port 5174). 
- Player position broadcast: {id, x, z, heading, speed, vehicleMode, username}
- Rate: 10Hz position updates, 1Hz heartbeat
- Other players rendered as vehicles in 3D scene + radar dots with names
- **Player limit: 3-5 concurrent**
- **Auto-disconnect: idle 10 minutes, online 2 hours max**
- Room code system (default: "jersey")
- Reconnect on disconnect (retry 3x with 2s backoff)
- Player count indicator in HUD
**Effort:** HIGH | **Deps:** T-USERNAMES | **Ready:** YES (needs architecture decision: raw WebSocket vs Socket.io vs Supabase realtime)

### T-LEADERBOARD
**Spec:** Server-backed persistent leaderboard on CT214.
- SQLite database (vibedrive.db)
- Schema: {id, username, score, distance_km, missions_completed, max_wanted, timestamp}
- API endpoints: GET /leaderboard, POST /score
- Top 10 displayed in-game via button
- Also stores per-session stats
**Effort:** MED | **Deps:** T-USERNAMES | **Ready:** YES

## Phase 2 — Real Roads (research in progress, Tournament Mode pending)

### T-REAL-ROADS
**Spec:** Replace procedural terrain roads with real OSM road network.
- Fetch OSM road data via Overpass API
- Render as 3D road meshes on terrain
- Lane markings, drive on LEFT (Jersey)
- Road names at intersections
- Car constrained to road surface (off-road = slow down)
**Effort:** HIGH | **Deps:** Research results | **Ready:** After Tournament Mode

### T-GTA-TRAFFIC
**Spec:** AI traffic cars following real road network.
- 15-20 AI cars, path-following on road waypoints
- Stop at red lights, drive on left
- Different car types/colors
**Effort:** HIGH | **Deps:** T-REAL-ROADS | **Ready:** After roads built

## Phase 3 — Real-World Data (research in progress)

### T-SCHOOLS
**Spec:** Add Victoria College (49.187, -2.089) and St Michael's (49.196, -2.077) as landmarks.
- Distinctive school building models
- Floating name labels
- Add to landmarks array (+50 pts each)
**Effort:** LOW | **Deps:** None | **Ready:** YES

### T-BUS-ROUTES
**Spec:** Real Liberty Bus routes + live positions.
- Research in progress (GTFS feed? API? scrape?)
- Colored route lines on 3D map
- Live bus positions as bus models
- Bus stop markers
- HUD toggle to show/hide routes
**Effort:** MED | **Deps:** T-REAL-ROADS, research | **Ready:** After research

### T-FLIGHT-DATA
**Spec:** Live Jersey Airport flight tracking.
- Research in progress (OpenSky? FR24? jerseyairport.com?)
- Flights as plane models in sky during fly mode
- Airport HUD panel with arrivals/departures
**Effort:** MED | **Deps:** None | **Ready:** After research

## Phase 4 — Polish (low priority, build when bored)

### T-COLLECTIBLES, T-RADIO, T-TRAFFIC-LIGHTS, T-WEATHER, T-DESIGN
All documented in BACKLOG.md. No deps, no research needed.

## Sandcastle Dispatch
Tickets ready for Sandcastle dispatch now:
1. T-USERNAMES (no deps, low effort)
2. T-SCHOOLS (no deps, low effort)
3. T-LEADERBOARD (deps: T-USERNAMES, med effort)

Tickets pending research:
4. T-REAL-ROADS (Tournament Mode)
5. T-BUS-ROUTES (research stream running)
6. T-FLIGHT-DATA (research stream running)

Tickets pending architecture decision:
7. T-MULTIPLAYER (WebSocket vs Supabase)