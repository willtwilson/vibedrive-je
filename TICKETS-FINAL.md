# Vibe Drive Jersey 3D — Final Ticket Batch

## T-ARROW-KEYS: Arrow Key Support & Physics Improvements

### Requirements
- Arrow keys already work for steering (up/down/left/right) — verify and improve
- Add proper car physics:
  - Acceleration curve (not linear — ramp up)
  - Braking distance proportional to speed
  - Turning radius proportional to speed (tighter at low speed, wider at high)
  - Momentum on turns (car drifts slightly)
  - Terrain slope affects speed (uphill slower, downhill faster)
  - Suspension bounce on rough terrain
  - Reverse gear (down key when stopped)
- WASD already supported — verify both work simultaneously
- Add handbrake (spacebar) for sharp turns

### Effort: MEDIUM | Impact: MEDIUM
### DAG: No dependencies

---

## T-PINPOINT: Pinpoint Sponsor & Real Jersey Locations

### Requirements
- Add Pinpoint as a sponsor billboard at real address: One Waverley Place, Union Street, St Helier, JE1 2PP
- Convert Jersey real-world coordinates to game coordinates:
  - St Helier centre ≈ game (0, 50)
  - 1 degree lat ≈ 111km, Jersey is ~8km x 15km
  - Waverley Place, Union Street is in central St Helier
- Billboard shows: "Pinpoint — Vibe.je Hackathon HQ" with Pinpoint branding
- Add Tekex.je office location as a landmark
- Add vibe.je HQ as a landmark
- Both appear on radar as special markers

### Effort: LOW | Impact: HIGH (sponsor relevance for judges)
### DAG: Depends on T-ADS (billboard system)

---

## T-GIT: Commit to GitHub

### Requirements
- Initialize git repo in /root/vibe-drive-jersey
- Create .gitignore (node_modules, *.json data files)
- Commit all source files
- Push to a GitHub repo (need to create one or use existing)
- Commit message: "Vibe Drive Jersey 3D — hackathon demo"

### Effort: LOW | Impact: LOW (but good practice)
### DAG: No dependencies

---

## T-BOAT-BUILD: Build Boat Mode

### Requirements (from TICKETS-TRANSPORT.md)
- Boat model (hull + cabin + mast, low-poly)
- Water surface movement (y = sea level)
- Tide simulation (12.4h sinusoidal cycle, 12m range)
- Shallow water slows boat
- Harbor markers (St Helier, St Brelade, Gorey)
- Boat physics: momentum, waves, slower turning
- "Boat" mode button activated

### Effort: MEDIUM | Impact: HIGH (unique Jersey mechanic)
### DAG: No dependencies

---

## T-LIGHTING-BUILD: Improved Lighting

### Requirements (from TICKETS-ADDITIONAL.md)
- HemisphereLight (sky/ground blend)
- Dynamic sun position (arc across sky based on time)
- Sky gradient changes (dawn/day/dusk/night)
- Clouds (sprite planes at altitude)
- Headlight beams at night (SpotLight)
- Building windows lit at night
- Moon at night

### Effort: MEDIUM | Impact: HIGH
### DAG: No dependencies

---

## T-REWARDS-BUILD: Points & Rewards

### Requirements (from TICKETS-ADDITIONAL.md)
- Score in HUD
- Points for landmarks, proximity, speed, exploration, flying
- Achievement toast popups
- Miles driven counter
- High score in localStorage
- Mini leaderboard

### Effort: MEDIUM | Impact: HIGH
### DAG: Depends on landmarks (already built)

---

## T-ADS-BUILD: Advertising Billboards

### Requirements (from TICKETS-ADDITIONAL.md)
- 3D billboards near roads
- Real Jersey businesses (food.je restaurants, Jersey brands)
- Canvas-generated textures (no external files)
- Proximity popup when driving near
- Includes Pinpoint sponsor billboard
- Includes Tekex.je and vibe.je locations

### Effort: MEDIUM | Impact: HIGH (revenue model)
### DAG: Depends on T-ADS business data (subagent running)

---

## Full DAG
```
T-ARROW-KEYS ──> (standalone)
T-LIGHTING-BUILD ──> (standalone)
T-REWARDS-BUILD ──> (standalone, landmarks exist)
T-ADS-BUILD ──> depends on business data (subagent)
T-PINPOINT ──> depends on T-ADS-BUILD
T-BOAT-BUILD ──> (standalone)
T-GIT ──> (standalone, do last)
```