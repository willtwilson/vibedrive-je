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

## Completed (pre-issues)

All hackathon-era features were built before GitHub Issues existed:
lighting, rewards, billboards, steering, boat mode, fly mode, headlights,
radar coastline, businesses, landmarks, parishes, missions, police,
pedestrians, brand design, git repo.

## Dispatch

Sandcastle is installed on CT214 (devbox-hermes). Dispatch with:
```bash
sandcastle <issue-number>
sandcastle <issue-number> --model litellm/litellm-pro
```
