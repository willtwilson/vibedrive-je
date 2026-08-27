# RESEARCH: Making VibeDrive.je World, Physics, Map & Driving Rules Feel Like GTA 1

**Date:** 2026-08-27 · **Author:** Vibeke (sprint engineer) · **Scope:** retro mode (`index-retro.html`)
**Companion doc:** `GRAPHICS-RETRO-GTA1.md` (71KB — rendering, sprites, damage visuals, audio). THIS doc focuses on **gameplay feel**: world, physics, map, driving rules.

---

## 1. What Makes GTA 1 Feel Like GTA 1 (Gameplay, not Graphics)

The original 1997 Grand Theft Auto (DMA Design / Rockstar) is a **top-down arcade driving sandbox**. Its iconic feel comes from four gameplay pillars. Graphics get all the attention; these four are what actually make it *play* like GTA 1:

1. **Driving physics** — heavy arcade cars: big momentum, satisfying drift, speed-sensitive steering, weight.
2. **Chaotic open world** — free-roam, no invisible walls, traffic + pedestrians you can mow down.
3. **Crime loop** — wanted level, police chase, "getaway" tension, cash/missions.
4. **British/urban texture** (in the London 1969 expansion) — left-hand drive, roundabouts, double yellow lines.

---

## 2. World Similarity

### 2.1 Top-Down, Tile-Based, Chunked World
GTA 1 renders the world as a **flat 2D plane** with layered sprites. The world is *dense* and *continuous* — you never hit a void, and there's always something (buildings, cars, people, water) near you.

| GTA 1 trait | VibeDrive retro equivalent |
|---|---|
| Continuous 2D plane (no heightmap driving) | Canvas 2D world, tile-based ground (already planned in #27) |
| Dense city blocks, every tile is "something" | Buildings along all roads (proc-gen + OSM), not just downtown |
| Water as a boundary you *can* drive into (sinks) | Coastline + harbours as solid-but-dangerous; boat mode separate |
| Small islands/cities connected by bridges | Jersey is one island — bridges to Elizabeth Marina / harbours as features |

**Key decision:** GTA 1's Liberty City is ~a few km². Jersey at true scale is ~14km×9km — **too big for a dense top-down city**. For the retro feel, the map should be **compressed**: densify the main towns (St Helier, St Aubin, St Brelade) into a tight, walkable/drivable city core, and keep the countryside sparser. A 1:4 or 1:5 map compression makes the retro world feel as dense as Liberty City.

### 2.2 Pedestrians & Traffic — the "living" world
GTA 1's most memorable feature is **traffic and pedestrians everywhere**, and you can hit them.

- **Traffic:** Cars that follow roads, stop at lights, react to you (honk, swerve). ~15-30 NPC cars on screen in a busy area.
- **Pedestrians:** Walkers on pavements/crossings that flee when you approach or beep. ~20-40 NPCs.
- **Crime reaction:** Hit a pedestrian → wanted level + police. This is the *core loop* that drives GTA 1's fun.

**Gap in VibeDrive:** the current game has AI traffic but no pedestrians, no honking, no flee-behaviour. Adding a simple pedestrian system (spawn on pavements, flee on approach, "splat" reaction) is the single biggest "feels like GTA 1" win.

### 2.3 Wanted Level / Police / Getaway
GTA 1's signature loop:
- Commit crime (hit pedestrian, steal car, crash into cop) → **wanted level 0-6**.
- Police spawn in patrol cars and chase you.
- Lose the cops (evade their sight, or get to a Pay'n'Spray) → wanted level decays.
- Higher wanted level → more/better police cars, roadblocks.

This is **absent from VibeDrive**. Adding a lightweight wanted + police-chase system would transform retro mode from "driving sim" into "GTA 1".

---

## 3. Physics Similarity

### 3.1 The GTA 1 Car Model (arcade, not sim)
From the original design + the existing `GRAPHICS-RETRO-GTA1.md` §2.2/§7.4:

| Property | GTA 1 behaviour | Current VibeDrive |
|---|---|---|
| **Acceleration** | Linear with diminishing returns near top speed | Exponential ramp toward MAX_SPEED — close match |
| **Top speed** | High enough to feel fast, low enough to control | Tunable |
| **Turning** | **Speed-sensitive**: sharp at low speed, wide at high speed | Present (`turnInput × speed ratio`) — close match |
| **Drift/slide** | Lateral velocity on sharp turns + handbrake, with decay | Present (0.92/0.90 decay) — close, can enhance |
| **Weight/momentum** | Cars feel heavy — keep sliding after you stop steering | Present via momentum |
| **Reverse** | Half-speed, tighter turn | Present |
| **Collision** | Bounding circle vs building rect, simplified | Circle-vs-rect is trivial in 2D |

**Verdict:** the current physics model (2D X/Z + heading + lateral velocity) is **already a close match to GTA 1**. The physics need *tuning* and *enhancement*, not a rewrite. The most GTA-1-feel improvements:
1. **Stronger drift**: increase lateral-velocity decay asymmetry (low grip under handbrake = more slide).
2. **Speed-sensitive steering curve**: sharpen low-speed, widen high-speed (the GTA 1 "bicycle vs boat" steering feel).
3. **Collision with traffic**: cars don't pass through each other — they collide, bump, and spin. Currently VibeDrive traffic may not collide with the player car.
4. **Damage → performance**: damaged cars go slower (see §2.3 of the graphics doc — already specced for #28).

### 3.2 Top-Down Physics Simplification
Because retro mode is 2D (no heightmap, no plane physics in the sky):
- **Terrain slope effect** → optional, keep subtle for gameplay.
- **Plane physics** → remove from retro, or render as "above" (shadow + scaled sprite) for a special vehicle.
- **Boat** → keep as a separate water vehicle, rendered as a sprite.

### 3.3 Skid Marks
GTA 1 leaves **skid marks** when drifting/braking hard — a huge visual+feel cue. Already specced in the graphics doc (§7.5) for #28. Essential for the retro feel.

---

## 4. Map Style Similarity

### 4.1 Road Layout — British/Jersey, Not American Grid
GTA 1's London 1969 expansion is the closest analogue. The retro map should use **real Jersey roads** (OSM data, already in the repo) but present them in GTA 1 style:
- **Left-hand driving** (traffic on the left, roundabouts go clockwise). **Critical:** current game may not enforce lane side — retro MUST.
- **Roundabouts** as distinctive circular road tiles (Jersey has many).
- **Narrow streets** in St Helier → tighter, more collisions, more GTA 1 chaos.
- **A-roads/B-roads hierarchy** for visual weight (trunk roads wider).

### 4.2 Road Markings & Signs (British)
From the graphics doc §6:
- **Double yellow lines** (no parking — key Jersey/London cue).
- **Zebra crossings** (black/white stripes across the road).
- **Roundels / speed-limit signs** (red circle, white inner).
- **Red triangle warning signs**.
- **Give-way lines** at junctions.
- **Jèrriais bilingual signs** ("St Hélyi / Saint Helier") — unique Jersey character.

### 4.3 Landmarks as Map Anchor Points
GTA 1's maps are memorable because of landmarks. Jersey retro map should anchor on real ones:
- Elizabeth Castle, Mont Orgueil, St Helier harbour, Liberation Square, St Brelade's Bay, Corbière Lighthouse.
- Schools (Victoria College, St Michael's) — but per Will's note, **don't label them as personal landmarks publicly**; keep them as neutral in-world buildings.

### 4.4 Color Palette & Tone
Muted Channel Islands palette (graphics doc §6.3): grey granite, cream/limestone, slate blues, muted greens, cobble greys. This gives the retro world its distinctive "Jersey" read at a glance.

---

## 5. Driving Rules Similarity

GTA 1 is deliberately **lawless** — there are no traffic laws to follow, which is the point. But the *world* is laid out with British rules so that breaking them *feels* transgressive:

| Rule | GTA 1 (London) | VibeDrive retro recommendation |
|---|---|---|
| **Drive on the left** | Yes | **Yes** — enforce left-lane driving (traffic, parking, give-way) |
| **Speed limits** | Signs exist, not enforced | Signs exist as decor + give a speed feel; not enforced (or a gentle "wanted" bump for excess) |
| **Roundabouts** | Give-way to right | Give-way to right (Jersey left-hand rule) |
| **Traffic lights** | Cars stop at red | NPC traffic stops at red; player *can* run them (→ wanted bump, fun) |
| **Parking (double yellows)** | No parking | Decor only, or NPC "parking" behaviour |
| **Pavements** | Cars *can* mount but it's wrong | Allow mounting (destroys pedestrians + damages car) — core GTA chaos |

**The key design stance:** retro mode should **not** enforce road rules on the player — it should *present* them so breaking them feels deliberate and fun, and *reward* the transgression (wanted level, chaos, damage). That's exactly GTA 1's formula.

---

## 6. Recommended Implementation Tickets (size M, sequential)

These turn the research into actionable work, layered on the existing retro chain (#25-29):

| # | Ticket | What | Blocks |
|---|---|---|---|
| A | **T-RETRO-TRAFFIC** | NPC traffic that follows roads, stops at lights, collides with player, honks/swerves | B, C |
| B | **T-RETRO-PEDESTRIANS** | Pedestrians on pavements/crossings, flee on approach, hit reaction | C |
| C | **T-RETRO-WANTED** | Wanted level, police chase, roadblocks, Pay'n'Spray, getaway decay | D |
| D | **T-RETRO-CRIME-LOOP** | Cash, missions (pickup→deliver, taxi, getaway), score — the GTA 1 loop | — |
| E | **T-RETRO-MAP-DENSIFY** | Compress map ~1:4-1:5, densify St Helier core, keep countryside sparse | all |
| F | **T-RETRO-DRIVE-RULES** | Left-hand drive, give-way at roundabouts, traffic-light behaviour, pavements mountable | A |

**Dependency order:** E (map) → A (traffic) → B (pedestrians) → C (wanted) → D (crime loop). F interleaves with A.

**Effort estimate:** each is a single-mechanic size-M ticket, ~60-90 min each on Flash, sequential. The crime loop (D) is the biggest and could be split into D1 (cash+missions) / D2 (taxi + score).

---

## 7. What NOT to Copy From GTA 1
- **Top-down sprites as the ONLY mode** — keep the polished 3D mode; retro is a toggle.
- **Violence/gore** — no weapons, no blood. Hits are "bump + damage", not carnage. Kid-friendly.
- **Exact 1997 controls** — modernize for iPad touch.
- **Uncompressed huge map** — must stay mobile-friendly (60fps, 2GB-box build).

---

## 8. Summary

The fastest path to "feels like GTA 1" is **not** more graphics — it's:
1. **Pedestrians + dense traffic** (the living world)
2. **Wanted level + police chase** (the crime loop)
3. **British driving rules as transgression** (left-hand, roundabouts, run lights)
4. **Stronger arcade drift** (physics tuning, not rewrite)
5. **Denser, landmarked Jersey map** (compressed ~1:4)

The current physics model is already 80% GTA 1. The world/loop is where the gap is.
