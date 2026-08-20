# Vibe Drive Jersey — Build Plan

## Concept
A web-based driving game on a real map of Jersey with live weather, day/night cycle, and restaurant POIs. Boat and Fly modes as "coming soon" placeholders.

## Architecture
- **Frontend only** — vanilla JS + Vite + Leaflet
- **No backend** — all APIs called client-side
- **Deploy** — Vite dev server on hermes (0.0.0.0:5173), exposed via Tailscale Funnel for public HTTPS URL that works from iPad/iPhone without Tailscale installed. QR code generated for easy sharing.

## Data Sources (all confirmed free, no API key)
1. **Map tiles**: OpenStreetMap standard tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
2. **Weather**: Open-Meteo (`https://api.open-meteo.com/v1/forecast?latitude=49.21&longitude=-2.13&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day`)
3. **Sunrise/sunset**: sunrise-sunset.org (`https://api.sunrise-sunset.org/json?lat=49.21&lng=-2.13&formatted=0`)
4. **Restaurant POIs**: Stub data for now (10-15 real Jersey restaurant names/locations), food.je scrape if time permits

## Game Mechanics
- Car icon (SVG, pointing in direction of travel) on Leaflet map centered on St Helier
- **Touch controls** (iPad/iPhone primary): on-screen joystick left, accelerate/brake buttons right
- **Keyboard fallback**: Arrow keys also work (↑ accelerate, ↓ brake, ← → steer)
- Car moves freely on map (not constrained to roads — simpler, still fun)
- Speed displayed in HUD (km/h)
- Map follows car (pan to keep car centered)
- Zoom level ~16-17 for street-level detail
- Mobile-first responsive layout

## Visual Features
- **Day/night cycle**: Calculate from sunrise/sunset API. Night = CSS filter on map tiles (brightness 0.4, hue-rotate to blue). Dusk/dawn = gradient transition.
- **Weather overlay**: Weather condition icon + temp in HUD. Rain = particle overlay (CSS animation). Wind affects car slightly.
- **Restaurant markers**: Leaflet markers with popup showing name, cuisine, "Order on food.je" link
- **Mode selector**: Drive (active), Boat (🔒 coming soon), Fly (🔒 coming soon)

## Restaurant Stub Data
10-15 real Jersey restaurants with approximate lat/lon:
- The Oyster Box, St Brelade
- Bohemia, St Helier
- Mark Jordan at the Beach, St Brelade
- Ocean Restaurant, St Helier
- Ormer, St Helier
- Tassili, St Helier
- Sumas, St Helier
- Rozan, St Helier
- Banjo's, St Helier
- The Salty Dog, St Helier
- Quayside, St Helier

## File Structure
```
/root/vibe-drive-jersey/
├── index.html      # Main HTML with HUD, mode selector, controls
├── main.js         # Game logic: map init, car movement, weather, day/night
├── restaurants.js  # Restaurant stub data
├── package.json    # Vite + Leaflet
└── PLAN.md         # This file
```

## Ticket Breakdown (for parallel Claude Code Sonnet)

### Ticket 1: Core Map + Car Driving
- Initialize Leaflet map centered on St Helier (49.186, -2.105), zoom 16
- Add OSM tile layer
- Create car marker (SVG, pointing in direction of travel)
- Arrow key controls: accelerate/brake/steer
- Physics: velocity, heading angle, acceleration, friction
- Map follows car (setView on each frame)
- Speed display in HUD

### Ticket 2: Weather + Day/Night
- Fetch weather from Open-Meteo on load, refresh every 10 min
- Display: temp, wind speed, weather icon in HUD
- Fetch sunrise/sunset from API
- Calculate current sun position (day/night/dusk/dawn)
- Apply CSS filter to map tiles based on time of day
- Night: dark blue overlay + tile brightness filter
- Rain particle overlay if weather code indicates rain

### Ticket 3: Restaurant POIs + Mode Selector + Polish
- Add restaurant markers with popups
- Mode selector buttons (Drive active, Boat/Fly locked)
- QR code generation for Tailscale URL
- Final styling polish