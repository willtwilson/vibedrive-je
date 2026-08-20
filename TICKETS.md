# Vibe Drive Jersey 3D — Improvement Tickets

## Current State
- Single HTML file at /root/vibe-drive-jersey/index.html (~28KB)
- Three.js via import maps from unpkg CDN
- Procedural terrain, 3D car, chase camera, touch+keyboard+pointer controls
- Live weather (Open-Meteo), day/night, trees, birds, buildings
- Radar minimap with AI players
- 3 synthetic AI cars driving around
- Deployed via Tailscale Funnel at https://hermes.tail8277f.ts.net
- python3 http.server on port 5173 (background, do not kill)

## Tickets (prioritized by impact/effort)

### T1: [MEDIUM/HIGH] Real road network from OSM
- Fetch road geometry from Overpass API for Jersey
- Render as textured strips on the terrain (TubeGeometry or flat ribbon)
- Constrain car to follow roads (optional — can drive off-road for fun)
- Road labels for major routes (A1, A2, etc.)
- Alternative if Overpass is down: generate procedural road network connecting building clusters
- Effort: MEDIUM | Impact: HIGH

### T2: [LOW/HIGH] Jersey landmarks
- Add recognizable Jersey landmarks as 3D models:
  - Mont Orgueil Castle (Gorey) — simple castle tower
  - Elizabeth Castle (St Helier) — castle on island
  - La Corbière Lighthouse — red/white tower on rocks
  - St Brelade's Church — simple church spire
  - Les Platons transmitter mast (highest point)
- Position at real lat/lon (converted to game coordinates)
- These give "I recognize that!" moments for judges
- Effort: LOW | Impact: HIGH

### T3: [LOW/MEDIUM] Car engine sound
- Use Web Audio API to generate a simple engine sound
- Pitch increases with speed
- Oscillator + lowpass filter, no audio file needed
- Add a mute button to the HUD
- Effort: LOW | Impact: MEDIUM

### T4: [MEDIUM/HIGH] Multiplayer sync (simulated)
- Show more AI players on radar
- Give AI players names above their cars (floating text)
- Add a leaderboard showing positions
- Make AI cars avoid each other (basic collision)
- Player count in HUD updates
- Effort: MEDIUM | Impact: HIGH

### T5: [LOW/MEDIUM] Speed-based camera effects
- FOV widens at high speed (sense of speed)
- Motion blur at very high speed (or subtle camera shake)
- Camera lowers at high speed for a more dynamic view
- Effort: LOW | Impact: MEDIUM

### T6: [MEDIUM/MEDIUM] Texture splatting for terrain
- Instead of flat vertex colors, blend textures based on height
- Sand texture at beach level, grass for lowlands, rock for cliffs
- Can use procedural canvas-generated textures (no external files)
- Effort: MEDIUM | Impact: MEDIUM

### T7: [LOW/MEDIUM] Day/night cycle animation
- Currently day/night is a binary switch from weather API
- Add a sun arc across the sky based on sunrise/sunset times
- Sky color gradient shifts (dawn → day → dusk → night)
- Sun position affects shadows in real-time
- Effort: LOW | Impact: MEDIUM

### T8: [LOW/LOW] Speedometer with visual gauge
- Replace text speed display with a circular gauge SVG
- Needle rotates based on speed
- Looks more like a real car dashboard
- Effort: LOW | Impact: LOW

### T9: [MEDIUM/MEDIUM] Real OSM buildings from Jersey
- Fetch building footprints from Overpass (if available)
- Extrude to 3D with correct height (building:levels tag)
- Position at real coordinates
- Fallback: keep procedural buildings but position them at real Jersey coordinate clusters
- Effort: MEDIUM | Impact: MEDIUM

### T10: [LOW/HIGH] Food.je restaurant billboards
- Scrape restaurant list from food.je (browser-based SPA, may need Playwright)
- Place 3D billboards at restaurant locations along roads
- Billboard shows restaurant name + "Order on food.je" 
- Revenue model pitch: businesses pay to appear as billboards
- Effort: LOW | Impact: HIGH

## Notes
- All tickets are additive — no breaking changes to existing features
- T2 (landmarks) and T10 (restaurants) have best impact/effort ratio for the demo
- T3 (engine sound) is a quick win that adds a lot of polish
- OSM data (T1, T9) depends on Overpass API availability — has been unreliable