# Garage System Research — VibeDrive.je

**Date:** 2026-08-27
**Ticket:** T-GARAGE-RESEARCH (#23)
**Parent:** Physics Epic (milestone #6)
**Goal:** Research a garage system — a roster of interchangeable vehicles (multiple cars, boats, planes), each with distinct performance and handling, selectable from a touch-friendly garage UI. Builds on the tunable physics constants delivered by the physics implementation tickets (#20–22). Sized for sandcastle tickets.

---

## 1. Current-State Audit

### 1.1 Where vehicles are created today

There is **no garage** — the game has exactly one vehicle per mode, hard-coded. Vehicles are created by three factory functions and swapped by `applyMode`.

| Factory | Line | Vehicle |
|---------|------|---------|
| `createCar(color)` | **3411** | Single hatchback-style car (box body, cabin, 4 wheels, headlights/taillights) |
| `createPlane(color)` | **3445** | Single Cessna-style plane (fuselage, wings, tail, fin, propeller, cockpit) |
| `createBoat(color)` | **3469** | Single sailboat (hull, orange stripe, cabin, mast, triangular sail) |

All three take only a `color` argument. There is **no stat/behaviour parameter** — every car is identical, every plane is identical, every boat is identical.

### 1.2 How mode switching works — `applyMode(mode)` (line 3954)

`applyMode` is the single entry point for vehicle swaps. It is called by the mode-cycle button (line 4031) and the mode buttons. For each mode it:

1. `scene.remove(carGroup)` — removes the current vehicle.
2. Calls the factory with a hard-coded color: `createPlane(0xcc2222)` (line 3961), `createBoat(0xcc2222)` (line 3988), `createCar(0xcc2222)` (line 4015).
3. Positions the new vehicle, sets up mode-specific state (plane takeoff, boat wake trail, tide), and updates the HUD label.

The vehicle is stored in the single global `carGroup` (a `THREE.Group`). The physics loop reads `vehicleMode` (`'drive' | 'boat' | 'fly'`) to pick a branch.

### 1.3 The physics constants today (line 3854)

```js
const MAX_SPEED = 80, ACCEL = 30, BRAKE = 60, FRICTION = 10, TURN_RATE = 3.0;
```

These are **global, mode-agnostic** constants. Mode differences are applied as inline scalars in the shared vehicle-physics block (lines 4346–4349):

```js
const accel = vehicleMode === 'boat' ? ACCEL / 2 : ACCEL;
const friction = vehicleMode === 'boat' ? FRICTION / 2 : (isWetRoads(weatherCategory) ? FRICTION * 0.8 : FRICTION);
const turnRate = vehicleMode === 'boat' ? TURN_RATE * 0.6 : TURN_RATE;
```

### 1.4 The three physics branches

| Branch | Lines | Behaviour |
|--------|-------|-----------|
| **Car / drive** | 4351–4413 | Exponential accel ramp to `MAX_SPEED`, proportional brake, half-rate reverse, natural friction, speed-inverse turning, lateral momentum (drift), terrain slope speed-up/down. |
| **Plane / fly** | 4415–4456 | Auto-throttle to min airspeed 30, cap at `MAX_SPEED * 1.5` (120), climb/descend 15/s, auto-level to 50m, pitch/bank on input, propeller spin, ground shadow. |
| **Boat** | 4457–4506 | Land push-back, wave bobbing/pitch/roll, wake trail + ripple particles. (Enhanced model researched in `PHYSICS-BOAT.md` #18.) |

### 1.5 Key gaps (summary)

1. **No roster** — one vehicle per mode, hard-coded color, no stat variation.
2. **No stat model** — factories take only `color`; physics constants are global, not per-vehicle.
3. **No selection UI** — the only "selection" is the mode-cycle button (drive → fly → boat).
4. **No persistence** — vehicle choice is not stored anywhere.
5. **No unlock/progression** — all vehicles would be available (none exist yet).
6. **No tuning knobs** — no named config objects; constants are inline magic numbers.

---

## 2. Proposed Vehicle Roster

Three modes × 3–5 vehicles each, with distinct, readable stat profiles. Each vehicle is a **named config object** (see §5) that overrides the physics constants for its mode.

### 2.1 Cars (Drive mode) — 3 vehicles

| Vehicle | Role | topSpeed | accel | grip | weight | turnRate | drift |
|---------|------|----------|-------|------|--------|----------|-------|
| **Hatchback** | Balanced (default) | 80 | 30 | 1.0 | 1.0 | 3.0 | 1.0 |
| **Sports** | Fast, low grip | 110 | 42 | 0.75 | 0.85 | 3.6 | 1.6 |
| **Truck** | Slow, heavy, high grip | 60 | 20 | 1.3 | 1.6 | 2.2 | 0.4 |

- **Hatchback** — the current feel; the safe default.
- **Sports** — higher top speed and accel, but less grip and more drift: fast but twitchy, rewards skilled steering.
- **Truck** — heavy and slow, but grips hard and turns deliberately; hard to spin out.

### 2.2 Boats (Boat mode) — 3 vehicles

| Vehicle | Role | maxSpeed | accel | rudderRate | drift | waveResponse |
|---------|------|----------|-------|------------|-------|--------------|
| **Speedboat** | Fast, planing | 45 | 16 | 1.5 | 0.35 | 0.6 |
| **Cruiser** | Balanced (default) | 38 | 13 | 1.4 | 0.30 | 0.5 |
| **Fishing boat** | Slow, stable | 28 | 10 | 1.2 | 0.20 | 0.3 |

- **Speedboat** — the current feel; fastest, most responsive, most wave rock.
- **Cruiser** — mid-range, comfortable.
- **Fishing boat** — slow and stable; least wave response, easiest to dock.

### 2.3 Planes (Fly mode) — 3 vehicles

| Vehicle | Role | topSpeed | climbRate | stallSpeed | turnRate | bank |
|---------|------|----------|-----------|------------|----------|------|
| **Cessna** | Balanced (default) | 120 | 15 | 30 | 3.0 | 0.12 |
| **Stunt plane** | Agile, low stall | 100 | 20 | 20 | 4.5 | 0.20 |
| **Jet** | Fast, high stall | 200 | 25 | 60 | 2.2 | 0.10 |

- **Cessna** — the current feel; forgiving, auto-levels to 50m.
- **Stunt plane** — climbs faster, stalls lower, banks harder: aerobatic.
- **Jet** — much faster, but needs more airspeed to stay aloft and turns wider.

---

## 3. Stat Model — Mapping to Physics Constants

Each vehicle is a config object whose keys override the mode's base physics constants. The physics loop reads the **active vehicle's** config instead of the global constants.

### 3.1 Which constants each vehicle overrides

| Stat | Car | Boat | Plane | Current source |
|------|-----|------|-------|----------------|
| `topSpeed` / `maxSpeed` | ✅ | ✅ | ✅ | `MAX_SPEED` (3854) / `MAX_SPEED*1.5` (4419) |
| `accel` | ✅ | ✅ | ✅ | `ACCEL` (3854) |
| `grip` | ✅ | — | — | `friction` scalar (4348) |
| `weight` | ✅ | ✅ | — | `friction` / drag (4348) |
| `turnRate` | ✅ | ✅ | ✅ | `TURN_RATE` (3854) |
| `drift` | ✅ | ✅ | — | `lateralVelocity` factor (4383) |
| `stallSpeed` | — | — | ✅ | hard-coded `30` (4418) |
| `climbRate` | — | — | ✅ | hard-coded `15` (4427) |
| `bank` | — | — | ✅ | hard-coded `0.12` (4440) |
| `waveResponse` | — | ✅ | — | `PHYSICS-BOAT.md` #18 |
| `rudderRate` | — | ✅ | — | `PHYSICS-BOAT.md` #18 |

### 3.2 How the physics loop consumes it

Replace the inline scalars (4346–4349) and hard-coded numbers with lookups from the active vehicle config. Example for the car branch:

```js
const v = ACTIVE_VEHICLE; // e.g. VEHICLES.car.sports
const accel = v.accel;
const friction = v.grip * (isWetRoads(weatherCategory) ? 0.8 : 1);
const turnRate = v.turnRate;
// ... carSpeed += accel * dt * (1 - carSpeed / v.topSpeed);
```

The plane branch replaces `30` (stall), `15` (climb), `0.12` (bank), and `MAX_SPEED*1.5` (top) with `v.stallSpeed`, `v.climbRate`, `v.bank`, `v.topSpeed`. The boat branch reads `v.maxSpeed`, `v.accel`, `v.rudderRate`, `v.drift`, `v.waveResponse` from the `BOAT_PHYSICS`-style config (see `PHYSICS-BOAT.md`).

### 3.3 Defaults and fallback

Every vehicle config is **complete** (all keys present) so the loop never reads `undefined`. A `VEHICLES` registry holds all configs; `ACTIVE_VEHICLE` is a reference to the currently selected one. If a config is missing a key, fall back to the mode's base constant (defensive, not expected).

---

## 4. Garage UI Spec

### 4.1 Selection flow

A **garage screen** opened from a new "Garage" button in the HUD (next to the mode-cycle button). Flow:

1. Player taps **Garage** → a full-screen overlay slides up (touch-friendly, like the existing username modal at line 746).
2. The overlay shows **three tabs** — 🚗 Cars / 🚤 Boats / ✈️ Planes — one per mode.
3. Each tab lists that mode's vehicles as **large touch cards** (≥ 64px tall, ≥ 48px tap target per Apple HIG).
4. Each card shows: vehicle name, a small stat bar (Speed / Accel / Grip / Handling), and a **"Selected"** badge on the active vehicle.
5. Tapping a card **selects** it and applies it immediately (swaps the current vehicle via `applyMode`-style logic). Tapping the already-selected card closes the overlay.
6. A **Close** button dismisses the overlay.

### 4.2 Touch-friendly requirements (iPad Safari)

- Cards are large, tappable, with `touch-action: manipulation` (no double-tap zoom delay).
- No hover-dependent controls; all actions are single taps.
- The overlay uses the existing modal pattern (CSS transitions, `pointer-events`), so it reuses proven iPad-safe code.
- Stat bars are pure CSS (no canvas), so they cost nothing per frame.

### 4.3 In-game vs garage screen

The **garage screen** is the primary selection surface. The existing **mode-cycle button** stays as a quick-switch that cycles modes using the *currently selected* vehicle for each mode (e.g. if you selected the Sports car, cycling to Fly uses your selected plane). This keeps the fast mode-switch while giving the garage full control.

---

## 5. Tuning Knobs — Named Config Objects

A single `VEHICLES` registry, exposed on `window` for testability:

```js
const VEHICLES = {
  car: {
    hatchback: { name: 'Hatchback', topSpeed: 80, accel: 30, grip: 1.0, weight: 1.0, turnRate: 3.0, drift: 1.0 },
    sports:    { name: 'Sports',    topSpeed: 110, accel: 42, grip: 0.75, weight: 0.85, turnRate: 3.6, drift: 1.6 },
    truck:     { name: 'Truck',     topSpeed: 60,  accel: 20, grip: 1.3,  weight: 1.6,  turnRate: 2.2, drift: 0.4 },
  },
  boat: {
    speedboat:   { name: 'Speedboat',   maxSpeed: 45, accel: 16, rudderRate: 1.5, drift: 0.35, waveResponse: 0.6 },
    cruiser:     { name: 'Cruiser',     maxSpeed: 38, accel: 13, rudderRate: 1.4, drift: 0.30, waveResponse: 0.5 },
    fishing:     { name: 'Fishing Boat', maxSpeed: 28, accel: 10, rudderRate: 1.2, drift: 0.20, waveResponse: 0.3 },
  },
  plane: {
    cessna:  { name: 'Cessna',      topSpeed: 120, climbRate: 15, stallSpeed: 30, turnRate: 3.0, bank: 0.12 },
    stunt:   { name: 'Stunt Plane', topSpeed: 100, climbRate: 20, stallSpeed: 20, turnRate: 4.5, bank: 0.20 },
    jet:     { name: 'Jet',         topSpeed: 200, climbRate: 25, stallSpeed: 60, turnRate: 2.2, bank: 0.10 },
  },
};
let ACTIVE_VEHICLE = VEHICLES.car.hatchback; // default
```

The factories gain an optional config argument so the mesh can vary by vehicle (e.g. truck is longer, sports car is lower, jet has swept wings). Minimal geometry deltas — see §7.

---

## 6. Persistence & Unlock Decisions

### 6.1 Persistence — **Supabase, keyed by player**

**Decision: persist the selected vehicle per player in Supabase.**

- The game already has a `players` table and a `playerUsername` (line 999, loaded from `localStorage`). Scores are submitted per player (lines 880, 946).
- Add a `garage` column (or a `player_vehicles` table) storing the selected vehicle id per mode, e.g. `{ car: 'sports', boat: 'cruiser', plane: 'jet' }`.
- On load, after the player is identified, fetch the saved selection and apply it. On selection, write it back (fire-and-forget, like the existing score submit).
- **Fallback:** keep the last selection in `localStorage` (`vibedrive_garage`) so the choice survives offline/session and applies instantly before the Supabase fetch resolves. Supabase is the source of truth across devices; localStorage is the fast local cache.

### 6.2 Unlock / progression — **all available, no locks**

**Decision: all vehicles available from the start.**

- The game is a casual arcade driving game; locking vehicles behind score/level adds friction without a clear reward loop today.
- Keep the roster **fully unlocked** for v1. Add a `locked`/`unlockScore` field to the config schema now (defaulting to `0`/unlocked) so a future progression ticket can gate vehicles without a schema change.

---

## 7. Performance — iPad 60fps

The swap path must not cause GC spikes or frame drops.

| Concern | Mitigation |
|---------|-----------|
| **Vehicle swap GC** | Reuse the existing `applyMode` pattern: `scene.remove(carGroup)` then build the new vehicle. Factories allocate a handful of meshes **once per swap**, not per frame. A swap is a rare user action, so a one-time allocation is fine. |
| **Per-frame cost** | The physics loop only reads numbers from `ACTIVE_VEHICLE` — no allocation, no new draw calls. Stat bars are CSS, not canvas. |
| **Mesh reuse** | Keep the factory functions; add a small per-vehicle geometry variant (e.g. truck body scale, jet wing sweep). Reuse shared geometries/materials where possible (wheels, headlights) to avoid duplicate GPU buffers. |
| **No per-frame allocations** | The garage overlay is static DOM; it does not run in the render loop. |
| **Budget** | Vehicle swap: ~1 frame of one-time work (acceptable). Steady-state: **zero** added per-frame cost. 60fps on iPad Safari preserved. |

---

## 8. Implementation Plan (sized for sandcastle tickets)

**Ticket size:** S–M each. All changes live in `index.html` + `test.html` (single-file constraint).

### Ticket A — Vehicle config registry + stat model (S)
- Add `VEHICLES` registry and `ACTIVE_VEHICLE` (as in §5) near line 3854.
- Refactor the three physics branches (4351–4506) to read from `ACTIVE_VEHICLE` instead of inline constants.
- **Tests:** `VEHICLES` exists with 3 cars / 3 boats / 3 planes; each config has all required keys; sports `topSpeed` > hatchback; truck `grip` > sports; jet `topSpeed` > cessna; stunt `stallSpeed` < cessna.

### Ticket B — Per-vehicle meshes (S)
- Extend `createCar`/`createBoat`/`createPlane` to accept a config and vary geometry (truck length, sports height, jet wing sweep, etc.).
- **Tests:** factories return a group; passing a config changes a distinguishing property (e.g. truck body length > hatchback).

### Ticket C — Garage UI (M)
- Add Garage button + overlay with three tabs and touch cards (reuse modal pattern at line 746).
- Wire selection to `ACTIVE_VEHICLE` and re-apply the current vehicle via `applyMode`.
- **Tests:** garage overlay element exists; tapping a card updates `ACTIVE_VEHICLE`; selected badge reflects the active vehicle.

### Ticket D — Persistence (S)
- Add `garage` column to `players`; save/load selection via Supabase with `localStorage` fallback.
- **Tests:** selection persists to `localStorage`; a saved selection is restored on load.

### Ticket E — Unlock schema (S, optional)
- Add `locked`/`unlockScore` fields (all unlocked by default) for future progression.

---

## 9. Acceptance Criteria Checklist

- [x] Research doc written to `research/GARAGE.md`
- [x] Vehicle roster defined (3 per mode) with distinct stat profiles (§2)
- [x] Stat model maps each vehicle to the physics tunable constants (§3)
- [x] Garage UI spec — selection flow, touch-friendly (§4)
- [x] Persistence decision made — Supabase + localStorage fallback (§6.1)
- [x] Unlock/progression decision made — all unlocked, schema-ready (§6.2)
- [x] Tuning knobs — named config objects (§5)
- [x] Implementation plan sized for sandcastle tickets (§8)
- [x] iPad 60fps performance budget stated (§7)
