# GTA-Style Improvements for Vibe Drive Jersey

> Research document: how to make the Three.js driving game more like Grand Theft Auto.
> Based on analysis of the current codebase (`index.html`, ~75KB, single-file Three.js game)
> and research into open-source web game projects, Three.js open-world examples, and GTA mechanics.

---

## Current Game State

The game already has:
- 3D terrain (procedural island with heightmap noise), water, trees, buildings
- Car/boat/plane vehicle modes with physics (acceleration, turning, lateral slide, terrain slope)
- AI cars (3 NPC cars that wander randomly, turn at coastlines)
- Radar/minimap (canvas-based, shows coastline, AI cars, billboards, player heading)
- Rewards system (landmarks discovery, billboard proximity, speed bonus, distance tracking)
- Day/night cycle, weather (live API), clouds, birds, buoys
- Parish labels, business billboards with canvas textures
- Touch + keyboard controls, multiple camera modes

---

## Research Findings

### Open-Source Projects & References

1. **Three.js-City** (github.com/mauriciopoppe/Three.js-City) — 3D interactive city with drivable car in Three.js. Demonstrates road networks, car physics, city buildings. Good reference for urban environment.

2. **react-three-npc** (github.com/ssethsara/react-three-npc) — NPC control system built on **yuka.js** for React Three Fiber. NPCs can roam maps or follow targets. MIT licensed. Yuka.js is a dedicated AI library for games with steering behaviors, state machines, pathfinding.

3. **Three.js Open World Game Engine** (discourse.threejs.org/t/3d-open-world-game-engine-based-on-three-js/45369) — Forum thread documenting a terrain-generation-based open world engine in Three.js. Covers chunk management, LOD, large-world streaming.

4. **Three.js Traffic Game** (discourse.threejs.org/t/traffic-game-kinda/8004) — Traffic simulation with cars following roads, traffic lights, signs. Built as a thesis project. Directly relevant to adding traffic.

5. **Three.js Minimap** (stemkoski.github.io/Three.js/Viewports-Minimap.html, waelyasmina.net minimap tutorial) — Minimap implementations using viewport splitting or canvas overlay. The game already has a radar canvas; extending it is straightforward.

6. **Three.js Fundamentals Game Tutorial** (threejsfundamentals.org/threejs/lessons/threejs-game.html) — Official tutorial covering game loop, collision detection, pickups, HUD overlays.

7. **Yuka.js** (github.com/eldeng/yuka) — AI library for JavaScript games. Provides:
   - Steering behaviors (seek, flee, arrive, wander, follow path, obstacle avoidance)
   - State machines (FSM) for NPC behavior
   - Pathfinding (A* on nav meshes)
   - Vehicle modeling
   - Works with Three.js natively

### GTA Mechanics Feasible in Browser

| GTA Feature | Browser Feasibility | Notes |
|---|---|---|
| Mission system (pick-up/drop-off) | ✅ High | Waypoint markers + proximity triggers + state machine |
| Wanted level / police chase | ✅ High | Track reckless driving, spawn police cars with seek-steering |
| NPC pedestrians | ✅ Medium | Yuka.js steering on sidewalk paths, low-poly models |
| Traffic cars on roads | ✅ Medium | Waypoint following + obstacle avoidance |
| Traffic lights | ✅ High | State machine, simple red/yellow/green cycles |
| Collectibles | ✅ High | Already has landmark system; add hidden packages |
| Radio stations | ✅ High | Web Audio API, looping audio tracks, station selector UI |
| Mini-games | ✅ Medium | Racing checkpoints, delivery timers, stunt jumps |
| HUD (health, armor, weapons) | ✅ High | CSS/HTML overlay already exists |
| Weapon system | ⚠️ Low priority | Jersey is peaceful; could do non-violent alternatives |

---

## Prioritized List: Top 10 GTA-Style Improvements

### 1. Mission System: Pick-Up & Drop-Off Taxi Missions
**Effort:** Medium | **Impact:** High

Add a mission framework with taxi-style pick-up/drop-off missions. A passenger NPC appears at a random landmark (e.g., Mont Orgueil Castle). Drive to them, pick them up (proximity trigger), then drive to a destination (e.g., Jersey Airport). Timer + score reward on completion.

**Implementation:**
- Mission state machine: `idle → pickup → enroute → complete`
- Mission markers on radar (colored dots: green=pickup, yellow=dropoff)
- Waypoint beam (vertical cylinder of light at target, visible from distance)
- Toast notifications for mission start/complete
- Reuse existing `addPoints()` and `showToast()` systems
- 5–10 mission locations based on existing landmarks array

**Code touch points:** `landmarks` array (extend with mission data), `drawRadar()` (add mission markers), `animate()` loop (check mission proximity), new mission state variables near existing game state section.

---

### 2. Wanted Level & Police Chase System
**Effort:** Medium | **Impact:** High

Track "reckless driving" (speeding near AI cars, collisions, off-road driving) and increase a wanted level (0–5 stars). Police cars spawn and chase the player using seek-steering behavior. Wanted level decays over time if you evade.

**Implementation:**
- `wantedLevel` variable (0–5), displayed as stars in HUD
- Reckless driving meter: increments when `speed > 60` near AI cars or `islandMask < 0.1` (off-road)
- Police cars: reuse `createCar()` with blue color, add light bar (two blue/red flashing lights on roof)
- Police AI: seek behavior toward player position using simple steering (lerp heading toward player, accelerate)
- Despawn police when wanted level reaches 0
- Evade timer: if no police within 100 units for 10 seconds, reduce wanted level
- Flashing screen border effect at high wanted levels

**Code touch points:** `aiCars` array (add police cars), `animate()` loop (police AI update, reckless check), HUD (add wanted stars), `createCar()` (add police variant with light bar).

---

### 3. NPC Pedestrians on Sidewalks
**Effort:** Medium | **Impact:** High

Add low-poly pedestrian NPCs that walk along defined paths near buildings and landmarks. They wander, react to nearby cars (flee behavior), and add life to the island.

**Implementation:**
- Define ~10–15 sidewalk path waypoints near building clusters (use existing `buildingLocations` array)
- Create pedestrian mesh: simple capsule body + sphere head, animated walk cycle (leg swing via rotation)
- Use **yuka.js** steering behaviors or implement simple wander + path-follow:
  - `wander`: random heading changes at path nodes
  - `flee`: if car within 15 units, run away from car
- Spawn 20–30 pedestrians distributed across St Helier area and landmark clusters
- Pedestrians stay on terrain (use `getTerrainHeight()`)
- Optional: collision = score penalty

**Code touch points:** New `pedestrians` array, new `createPedestrian()` factory function (similar pattern to `createCar()`), `animate()` loop (pedestrian AI update), `drawRadar()` (optional: show as small dots).

---

### 4. Traffic System: Cars Following Roads
**Effort:** Medium | **Impact:** High

Replace the 3 random-wander AI cars with a proper traffic system: 10–15 cars that follow road waypoints, stop at traffic lights, and avoid collisions.

**Implementation:**
- Define road network as connected waypoints (20–30 nodes based on real Jersey road layout)
  - Main roads: St Helier → St Clement → Grouville → St Martin (coastal ring)
  - Cross-island: St Helier → St Saviour → St Lawrence → St Peter
- Traffic cars use path-following steering:
  - Move toward next waypoint, switch to next when within 5 units
  - Speed varies 20–40 km/h, slows for cars ahead (simple distance check)
  - Stop at red traffic lights
- Different car colors using existing `createCar(color)` factory
- Lane offset: cars drive on the left (Jersey!), offset 1.5 units to the left of path center

**Code touch points:** Replace `aiCars` logic in `animate()` with path-following, new `roadNetwork` waypoint array, `createCar()` already supports color parameter.

---

### 5. Traffic Lights at Intersections
**Effort:** Low | **Impact:** Medium

Add traffic lights at 4–6 key intersections. Simple state machine cycles red→green→yellow. Traffic cars stop at red lights. Visual: pole + box with emissive red/yellow/green spheres.

**Implementation:**
- Define intersection positions (near road network nodes where roads cross)
- Traffic light mesh: cylinder pole + box with 3 spheres (red/yellow/green), emissive material
- State machine: `green (8s) → yellow (2s) → red (8s) → green` per light, synchronized per intersection
- Only active material has `emissiveIntensity: 1.0`, others `0.1`
- Traffic cars check nearest traffic light: if red and within 15 units, stop

**Code touch points:** New `trafficLights` array, new `createTrafficLight()` function, `animate()` loop (update light states, car stopping logic).

---

### 6. GTA-Style HUD: Wanted Stars, Health Bar, Mission Objective
**Effort:** Low | **Impact:** High

Upgrade the existing HUD to GTA-style: wanted level stars, health/armor bars, active mission objective text, cash/score display. This is purely CSS/HTML overlay work — no Three.js changes needed.

**Implementation:**
- **Wanted stars**: Row of 5 star icons (⭐) in top-right, filled/empty based on `wantedLevel`
- **Health bar**: Horizontal bar (green→red gradient) in bottom-right, decreases on collisions
- **Mission objective**: Text panel in bottom-center showing current mission ("Pick up passenger at Mont Orgueil" / "Deliver to Jersey Airport" / "Time: 45s")
- **Cash display**: Restyle existing score display as "$" currency (cosmetic)
- **Speedometer**: Restyle as GTA-style circular gauge (optional, canvas-based)
- All CSS-only changes to existing `#hud`, `#score-display`, `#toast` elements

**Code touch points:** CSS section (lines 8–127), HUD HTML (lines 132–183), new elements for health/stars/mission.

---

### 7. Collectibles: Hidden Packages & Stunt Jumps
**Effort:** Low | **Impact:** Medium

Add GTA-style collectibles scattered across the map: hidden packages (glowing pickups) and stunt jump ramps. Discovering all packages gives a bonus. Hitting a ramp at speed triggers a jump animation + score.

**Implementation:**
- **Hidden packages**: 10–15 glowing rotating cubes at landmarks and hard-to-reach spots
  - Reuse proximity detection pattern from `landmarks` array
  - +25 points each, toast notification
  - Visual: small emissive box rotating on Y axis, vertical light beam
- **Stunt ramps**: 5–8 ramp meshes placed near roads
  - When car hits ramp at speed > 40, apply upward velocity (arc trajectory)
  - +50 points for successful jump, toast "🚀 Stunt Jump! +50 pts"
  - Ramp mesh: wedge (triangular prism) using `CylinderGeometry` with 3 vertices or custom geometry

**Code touch points:** New `collectibles` array, `animate()` loop (proximity check + ramp collision), new mesh creation functions.

---

### 8. Radio Station Selector
**Effort:** Low | **Impact:** Medium

Add a GTA-style radio station selector with 3–4 "stations" that play different ambient audio loops. Uses Web Audio API. Station selector UI button cycles through stations.

**Implementation:**
- Use Web Audio API (`AudioContext`) to play looping audio
- 3–4 "stations" with thematic names:
  - "Jersey FM" — chill ambient
  - "Channel Rock" — upbeat
  - "BBC Radio Jersey" — talk/news (could use real stream URL)
  - "Silence" — off
- UI: Small radio button in HUD showing current station name, click to cycle
- Volume slider (optional)
- Audio sources: royalty-free loops (e.g., from freesound.org) or generated tones
- For hackathon: can use simple oscillator-based procedural music (different BPM/mood per station)

**Code touch points:** New `AudioContext` setup, new radio UI button in HUD, `animate()` or event handler for station cycling.

---

### 9. Racing Checkpoint Mini-Game
**Effort:** Medium | **Impact:** Medium

Add a race mode: a series of checkpoints (floating rings) the player must drive through in order, against a timer. Completing all checkpoints before time runs out awards points.

**Implementation:**
- Triggered by pressing "R" or clicking a "Race" button
- 6–8 checkpoints placed along a route (coastal road circuit)
- Checkpoints: glowing rings (torus geometry) that activate (change color) when passed through
- Timer counts down from 60 seconds; each checkpoint adds +5 seconds
- Score based on completion time: `(timeRemaining * 10) + 100` for finishing
- Visual: checkpoint arrows on radar showing next target
- Ring disappears when collected, next ring activates

**Code touch points:** New `raceState` object, new `createCheckpoint()` function, `animate()` loop (checkpoint proximity + timer), radar drawing (checkpoint markers), new UI button.

---

### 10. Enhanced Radar with Mission Markers & Zoom
**Effort:** Low | **Impact:** Medium

Upgrade the existing radar to GTA-style: show mission markers (colored dots for pickups/dropoffs), police (blue dots), pedestrians (white dots), collectibles (gold dots), and add zoom levels.

**Implementation:**
- The radar already draws coastline, AI cars, billboards — extend `drawRadar()`:
  - Mission markers: green (pickup), yellow (dropoff), pulsing
  - Police: blue dots with directional arrows
  - Pedestrians: tiny white dots (only when zoomed in)
  - Collectibles: gold dots
  - Race checkpoints: cyan rings
- Add zoom: two-finger pinch or +/- buttons cycle `RADAR_RANGE` from 100 (close) to 350 (full island)
- Add North-up vs heading-up toggle
- Mission objective line: draw a line from player to current mission target

**Code touch points:** `drawRadar()` function (lines 1080–1171), `RADAR_RANGE` variable, new zoom UI buttons.

---

## Summary Table

| # | Feature | Effort | Impact | Priority |
|---|---------|--------|--------|----------|
| 1 | Mission System (taxi pick-up/drop-off) | Medium | High | 🔴 P0 |
| 2 | Wanted Level & Police Chase | Medium | High | 🔴 P0 |
| 3 | NPC Pedestrians on Sidewalks | Medium | High | 🔴 P0 |
| 4 | Traffic System (cars on roads) | Medium | High | 🟠 P1 |
| 5 | Traffic Lights at Intersections | Low | Medium | 🟠 P1 |
| 6 | GTA-Style HUD (stars, health, mission) | Low | High | 🟠 P1 |
| 7 | Collectibles (packages & stunt ramps) | Low | Medium | 🟡 P2 |
| 8 | Radio Station Selector | Low | Medium | 🟡 P2 |
| 9 | Racing Checkpoint Mini-Game | Medium | Medium | 🟡 P2 |
| 10 | Enhanced Radar with Markers & Zoom | Low | Medium | 🟡 P2 |

---

## Implementation Notes

### Architecture Constraints
- The game is a **single HTML file** (~75KB). All additions must be inline JavaScript + CSS.
- No build step, no npm — pure vanilla Three.js loaded via CDN importmap.
- Performance budget: ~60fps on mobile. Keep NPC/traffic counts reasonable (20–30 pedestrians, 10–15 traffic cars max).
- All 3D models are procedural (BoxGeometry, CylinderGeometry, etc.) — no external GLTF loading.

### Recommended Implementation Order
1. **HUD upgrade** (#6) — pure CSS, no risk, instant visual impact
2. **Collectibles** (#7) — extends existing landmark system, easy win
3. **Mission system** (#1) — core gameplay loop, uses existing proximity detection
4. **Wanted level** (#2) — builds on mission framework for scoring
5. **Traffic lights** (#5) — simple state machine, self-contained
6. **Traffic system** (#4) — replaces existing AI cars with proper path-following
7. **NPC pedestrians** (#3) — new system, benefits from traffic patterns
8. **Radio** (#8) — independent, can be done anytime
9. **Racing** (#9) — depends on checkpoint/waypoint infrastructure
10. **Enhanced radar** (#10) — polish layer, depends on other features existing

### Key Libraries (Optional)
- **Yuka.js** (yuka.js.org) — AI steering, pathfinding, state machines. Can be loaded via CDN. Would simplify NPC/pedestrian/police AI significantly. Without it, implement steering behaviors manually (seek, flee, wander are ~10 lines each).
- **Cannon.js / Cannon-ES** — Physics engine. Not needed for current scope; the game uses custom physics. Only add if collision detection becomes complex.
- **Tone.js** — Web Audio synthesis for procedural radio music. Optional; raw Web Audio API suffices.

### Reusable Patterns from Current Code
- `createCar(color)` → factory pattern for all vehicle types, reuse for police/traffic
- `getTerrainHeight(x, z)` → snap all entities to terrain
- `islandMask(x, z)` → keep entities on land
- `addPoints(pts, msg)` + `showToast(msg)` → reward + notification system
- `drawRadar()` → canvas-based minimap, extend for new entity types
- `landmarks` array proximity check → pattern for all collectible/mission triggers
- Building/billboard canvas textures → pattern for UI elements in 3D space