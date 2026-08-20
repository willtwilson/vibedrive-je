# VibeDrive.je — Backlog

**Source of truth: [GitHub Issues](https://github.com/willtwilson/vibedrive-je/issues)**
This file is a snapshot. For live status, milestones, and labels, see GitHub.

## Milestones

| # | Milestone | Issues | Status |
|---|-----------|--------|--------|
| 1 | Phase 1: Multiplayer Foundation | #1, #2, #3 | Open |
| 2 | Phase 2: Real Roads & Traffic | #5, #6, #11 | Open |
| 3 | Phase 3: Jersey Data Integration | #4, #7, #8 | Open |
| 4 | Phase 4: Gameplay Polish | #9, #10, #12 | Open |
| 5 | Graphics Uplift | #14, #15 | Open |

## Issue Summary

| # | Title | Milestone | Priority | Size | Complexity | Dependencies |
|---|-------|-----------|----------|------|------------|--------------|
| 1 | T-USERNAMES: Username system | M1 | HIGH | S | Low | None |
| 2 | T-MULTIPLAYER: Real-time multiplayer | M1 | HIGH | XL | High | #1 |
| 3 | T-LEADERBOARD: Persistent leaderboard | M1 | HIGH | M | Medium | #1 |
| 4 | T-PERSONAL-LANDMARKS: Family landmarks | M3 | MEDIUM | S | Low | None |
| 5 | T-REAL-ROADS: Real road network | M2 | HIGH | XL | High | None |
| 6 | T-GTA-TRAFFIC: AI traffic | M2 | MEDIUM | L | High | #5 |
| 7 | T-BUS-ROUTES: Liberty Bus routes | M3 | MEDIUM | M | Medium | #5 |
| 8 | T-FLIGHT-DATA: Live flight tracking | M3 | LOW | M | Medium | None |
| 9 | T-COLLECTIBLES: Hidden collectibles | M4 | LOW | XS | Low | None |
| 10 | T-RADIO: Web Audio radio | M4 | LOW | XS | Low | None |
| 11 | T-TRAFFIC-LIGHTS: Traffic lights | M2 | LOW | S | Low | #5 |
| 12 | T-WEATHER: Improved weather | M4 | LOW | M | Medium | None |
| **14** | **T-GFX-3D-POLISH: GTA 6-style visual upgrades** | **M5** | **HIGH** | **L** | **Medium** | **None** |
| **15** | **T-GFX-RETRO: GTA 1-style retro top-down mode** | **M5** | **MEDIUM** | **L** | **Medium** | **#14** |

## Graphics Uplift Plan (Milestone 5)

**Decision:** Build both paths. Polish 3D first, then add retro as toggle mode.

### Phase A: 3D Polish (#14) — 8-12 hours
1. PMREMGenerator environment maps (fake RTGI)
2. Post-processing: bloom + ACES tone mapping + FXAA
3. InstancedMesh for buildings/trees (200+ → ~10 draw calls)
4. Procedural Canvas2D textures (road, grass, buildings)
5. MeshPhysicalMaterial clearcoat (car paint + water)

Research: `research/GRAPHICS-MODERN-GTA6.md` (47KB)

### Phase B: Retro GTA 1 Mode (#15) — 12-18 hours
- `index-retro.html` with Canvas 2D renderer
- Landing page toggle: "3D Mode" or "Retro Mode"
- 85-90% code reuse (physics, missions, AI, scoring, leaderboard)
- 60 FPS guaranteed on any device
- British/Jersey aesthetic: road markings, granite walls, Jèrriais signs
- 4-stage damage model, particle effects, procedural audio

Research: `research/GRAPHICS-RETRO-GTA1.md` (71KB)
Comparison: http://100.115.59.29:8080/vibedrive-graphics-analysis.html

## Dispatch

Sandcastle is installed on CT214 (devbox-hermes). Dispatch with:
```bash
sandcastle <issue-number>
sandcastle <issue-number> --model litellm/litellm-pro
```
