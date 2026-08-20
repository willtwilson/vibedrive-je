# Vibe Drive Jersey 3D — Additional Tickets

## T-LIGHTING: Improved Lighting & Atmosphere

### Requirements
- Dynamic sun position based on actual time of day (arc across sky)
- Sky color gradient: dawn (orange) → day (blue) → dusk (red/orange) → night (dark blue)
- Clouds: simple sprite planes at altitude, drifting with wind
- Headlight beams at night (SpotLight from car)
- Building windows lit at night (emissive material toggle)
- Better ambient: HemisphereLight for sky/ground color blend
- Fog density changes with time of day (thicker at night)
- Moon at night (simple sphere with emissive material)

### Effort: MEDIUM | Impact: HIGH
### DAG: No dependencies

---

## T-REWARDS: Points & Rewards System

### Requirements
- Score counter in HUD (starts at 0)
- Points earned for:
  - Driving near landmarks (+50 each, once per landmark per session)
  - Driving near AI cars (+10, proximity bonus)
  - Speed bonus: maintain >60 km/h for 5 seconds (+20)
  - Exploring: visit different regions of the island (+30 per region)
  - Flying: take off and land safely (+100)
- Achievement notifications (toast popup, fades after 3s)
- "Miles driven" counter
- High score saved to localStorage (persists across sessions)
- Mini leaderboard: Player vs AI cars (distance traveled)

### Effort: MEDIUM | Impact: HIGH
### DAG: No dependencies (but landmarks must exist — they do)

---

## T-ADS: Advertising Billboards (Real Jersey Businesses)

### Requirements
- 3D billboards placed along roads near building clusters
- Each billboard shows a real Jersey business:
  - food.je restaurants (Bohemia, Ormer, Ocean, Sumas, etc.)
  - Jersey brands (Jersey Dairy, Jersey Royal, Channel Islands Co-op)
  - Local services (LibertyBus, Ports of Jersey, Jersey Telecom)
- Billboard = flat plane with canvas-generated texture (business name + logo text + color)
- Driving near a billboard shows a popup: "🍽️ Bohemia — Fine Dining in St Helier"
- Revenue pitch: businesses pay to appear as billboards in the game
- 8-10 billboards across the island

### Implementation
- Create canvas textures for each business (no external image files needed)
- Position billboards at road-adjacent locations
- Use Three.js PlaneGeometry with CanvasTexture
- Add distance check in game loop for popup notifications

### Effort: MEDIUM | Impact: HIGH (revenue model pitch for judges)
### DAG: Depends on T-REWARDS (billboard proximity = points)

---

## T-BOAT: Boat Mode (from TICKETS-TRANSPORT.md)

### Requirements
- Boat model (hull + cabin + mast)
- Movement on water surface
- Tide mechanic (water level rises/falls)
- Harbor markers (St Helier, St Brelade, Gorey)
- Synthetic tide (12.4h sinusoidal cycle, 12m range)

### Effort: MEDIUM | Impact: HIGH (unique to Jersey)
### DAG: No dependencies

---

## T-FLY-IMPROVE: Plane Mode Improvements

### Requirements
- Terrain collision (crash/respawn)
- Clouds at altitude
- Banking on turns (roll)
- AI planes in sky
- Landing mechanic

### Effort: MEDIUM | Impact: MEDIUM
### DAG: Depends on T-LIGHTING (clouds)