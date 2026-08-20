# Vibe Drive Jersey 3D — Transport Mode Tickets

## T-BOAT: Boat Mode

### Concept
Player sails/boats around Jersey's waters. Jersey has one of the world's largest tidal ranges (up to 12m) — this is the unique gameplay mechanic.

### Requirements
- Switch from car to boat when "Boat" mode button is clicked
- Boat model: simple hull (elongated box), cabin, mast (low-poly, similar to car factory)
- Movement on water surface (y = water level, not terrain height)
- Tide mechanic: water level rises/falls over time (visual effect)
  - Fetch tide times from NTSLF or Jersey tide API (if available)
  - If no API: simulate with sinusoidal tide (12 hour cycle)
- Boat physics: slower turning, momentum-based, waves affect movement slightly
- Shallow water slows boat (if terrain height is close to water level)
- Harbor areas: St Helier, St Brelade, Gorey — marked with buoys
- Radar shows boat as blue triangle

### Data Sources
- Tide data: try https://api.open-meteo.com/v1/forecast?... (may not have marine)
- NTSLF: https://www.ntslf.org/tides/uk-tide-gauge-network (may have Jersey)
- Admiralty tide tables (not free, but times are public knowledge)
- Fallback: synthetic sinusoidal tide (12.4 hour cycle, 12m range)

### Effort: MEDIUM | Impact: HIGH (unique to Jersey)

---

## T-FLY: Flight Mode (PARTIALLY IMPLEMENTED)

### Current State
- ✈️ Fly mode button is now active
- Plane model created (fuselage, wings, tail, propeller, cockpit)
- Altitude controlled by speed (accelerate = climb, brake = descend)
- Propeller spins
- Plane pitches up/down with accel/brake
- No terrain collision (can fly through ground)

### Still Needed
- [ ] Better plane physics (banking on turns, stall at low speed)
- [ ] Terrain collision (crash/respawn if you hit the ground)
- [ ] Clouds (simple sprite planes at altitude)
- [ ] Airspace awareness (show altitude in HUD)
- [ ] Landing mechanic (slow down near ground to switch back to drive)
- [ ] Camera modes work differently for plane (cockpit view, wing view)
- [ ] AI planes (other aircraft in the sky, visible on radar)

### Effort: MEDIUM | Impact: HIGH (wow factor for demo)

---

## T-DRIVE-IMPROVE: Drive Mode Improvements

### Steering Fix (DONE)
- Fixed: pointer events now attached to document (not canvas) to avoid z-index issues
- Fixed: isOnUI() function filters out touches on HUD/controls/radar
- Fixed: steerValue clamped to ±1.5 for stronger steering
- Fixed: buttons use stopPropagation to prevent steering conflict

### Still Needed
- [ ] Road network (real or procedural) to drive on
- [ ] Speed bumps / terrain following (car bounces on rough ground)
- [ ] Skid marks on terrain when braking hard
- [ ] Multiple starting positions (St Helier, St Brelade, Gorey)
- [ ] Day/night cycle animation (sun moves across sky)

### Effort: MEDIUM | Impact: MEDIUM