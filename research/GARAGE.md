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

`applyMode` is the single entry point for vehicle swaps. It is called by the mode-cycle button (line 4031). For each mode it:

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
5. **No unlock/progression** — nothing gates vehicle availability.

---

## 2. Proposed Vehicle Roster

A roster of **3 vehicles per mode** (9 total). Each vehicle is a named config object with a distinct stat profile. The current single vehicle per mode becomes the "balanced" default so existing behaviour is preserved.

### 2.1 Cars (Drive mode) — 3 vehicles

| Vehicle | Role | Top speed | Accel | Grip | Weight | Turn | Drift |
|---------|------|-----------|-------|------|--------|------|-------|
| **Hatchback** (default) | Balanced | 80 | 30 | medium | medium | normal | normal |
| **Sports** | Fast, low grip | 110 | 42 | low | light | tight | high |
| **Truck** | Slow, heavy, high grip | 60 | 18 | high | heavy | wide | low |

### 2.2 Boats (Boat mode) — 3 vehicles

| Vehicle | Role | Top speed | Accel | Planing | Rudder | Wave response |
|---------|------|-----------|-------|---------|--------|---------------|
| **Cruiser** (default) | Balanced | 45 | 14 | medium | medium | medium |
| **Speedboat** | Fast, agile | 60 | 22 | early | tight | high |
| **Fishing boat** | Slow, stable | 30 | 9 | late | wide | low |

### 2.3 Planes (Fly mode) — 3 vehicles

| Vehicle | Role | Top speed | Stall | Climb | Bank | Turn |
|---------|------|-----------|-------|-------|------|------|
| **Cessna** (default) | Balanced | 120 | 30 | medium | medium | medium |
| **Stunt plane** | Agile, low stall | 100 | 20 | high | high | tight |
| **Jet** | Fast, high stall | 200 | 45 | low | low | wide |

---

## 3. Stat Model — Mapping to Physics Constants

### 3.1 Which constants each vehicle overrides

Each vehicle is a config object that overrides a subset of the mode's tunable constants. The physics implementation tickets (#20–22) introduced per-mode objects (`CAR_PHYSICS`, `BOAT_PHYSICS`, `PLANE_PHYSICS`). A vehicle config is a **partial override** of that mode's object.

```js
const VEHICLES = {
  hatchback: { mode: 'drive', color: 0xcc2222, stats: { maxSpeed: 80, accel: 30, grip: 1.0, weight: 1.0, turnRate: 3.0, drift: 1.0 } },
  sports:    { mode: 'drive', color: 0x2244cc, stats: { maxSpeed: 110, accel: 42, grip: 0.7, weight: 0.8, turnRate: 3.6, drift: 1.6 } },
  truck:     { mode: 'drive', color: 0x886633, stats: { maxSpeed: 60, accel: 18, grip: 1.4, weight: 1.8, turnRate: 2.2, drift: 0.4 } },
  cruiser:   { mode: 'boat',  color: 0xffffff, stats: { maxSpeed: 45, accel: 14, planingSpeed: 18, rudderRate: 1.5, waveResponse: 0.6 } },
  speedboat: { mode: 'boat',  color: 0xff6600, stats: { maxSpeed: 60, accel: 22, planingSpeed: 12, rudderRate: 2.0, waveResponse: 0.9 } },
  fishing:   { mode: 'boat',  color: 0x2266aa, stats: { maxSpeed: 30, accel: 9, planingSpeed: 24, rudderRate: 1.0, waveResponse: 0.3 } },
  cessna:    { mode: 'fly',   color: 0xcc2222, stats: { maxSpeed: 120, stallSpeed: 30, climbRate: 15, bankRate: 1.0, turnRadius: 1.0 } },
  stunt:     { mode: 'fly',   color: 0x22cc44, stats: { maxSpeed: 100, stallSpeed: 20, climbRate: 22, bankRate: 1.6, turnRadius: 0.7 } },
  jet:       { mode: 'fly',   color: 0x888888, stats: { maxSpeed: 200, stallSpeed: 45, climbRate: 10, bankRate: 0.6, turnRadius: 1.4 } },
};
```

### 3.2 How the physics loop consumes it

The physics loop currently reads global constants and `vehicleMode`. The garage introduces a **current vehicle** reference:

```js
let currentVehicle = VEHICLES.hatchback; // default
```

The physics loop resolves effective constants by **merging** the mode's base object with the current vehicle's `stats` override:

```js
const P = Object.assign({}, MODE_PHYSICS[vehicleMode], currentVehicle.stats);
```

Then all physics reads use `P.maxSpeed`, `P.accel`, `P.grip`, etc. instead of the global `MAX_SPEED`/`ACCEL`. This keeps the existing physics code intact while making every knob per-vehicle.

### 3.3 Defaults and fallback

- The default vehicle per mode is the current one (hatchback / cruiser / cessna), so **existing behaviour is unchanged** until the player picks a different vehicle.
- If a vehicle config omits a stat, the mode's base value is used (partial override).
- `applyMode(mode)` selects the mode's default vehicle when entering a mode, unless the player has a saved choice for that mode.

---

## 4. Garage UI Spec

### 4.1 Selection flow

The garage is a **full-screen overlay** opened from a new "Garage" button in the HUD (next to the mode-cycle button). Flow:

1. Player taps **Garage** → overlay slides up (bottom sheet, touch-friendly).
2. Overlay shows **three tabs** (🚗 Cars / 🚤 Boats / ✈️ Planes), one per mode.
3. Each tab shows a **horizontal carousel** of that mode's vehicles — a 3D preview (the actual `createCar`/`createBoat`/`createPlane` mesh, rendered in a small preview) plus name and a stat bar (Speed / Accel / Grip / Handling).
4. Player taps a vehicle → it is **selected** (highlighted) and the game switches to it immediately (calls `applyMode` + sets `currentVehicle`).
5. Player taps **Close** → overlay dismisses, back to driving.

### 4.2 Touch-friendly requirements (iPad Safari)

- **Large tap targets** — each vehicle card ≥ 88×88px (Apple HIG minimum).
- **Bottom sheet** — thumb-reachable, no top-of-screen reach.
- **Horizontal swipe** carousel with native momentum scroll (`-webkit-overflow-scrolling: touch`).
- **No hover states** — selection is tap-only.
- **`touch-action: pan-x`** on the carousel so horizontal swipes don't trigger steering.
- **`pointerdown`/`pointerup`** with `isOnUI()` guard so garage taps don't steer the car (reuse the existing steering filter from the controls fix).

### 4.3 In-game vs garage screen

A **full-screen garage overlay** (not a separate page) is recommended:
- Keeps the single-HTML-file constraint.
- Reuses the live Three.js scene for previews (no second renderer, no GC spike).
- The game loop can keep running behind the overlay (or pause — see performance section).

---

## 5. Tuning Knobs — Named Config Objects

Every vehicle is a **named config object** in a single `VEHICLES` registry (Section 3.1). This gives:

- **One place to tune** — change a number in `VEHICLES.sports.stats` and the whole game reflects it.
- **Data-driven factories** — `createCar(color)` becomes `createCar(vehicle)` so mesh size/color can vary per vehicle (e.g. truck is bigger, sports is lower).
- **Testable** — the registry is a plain object; tests can assert stat relationships (sports faster than hatchback, truck heavier, etc.).
- **No GC spikes** — the registry is a static object; switching vehicles only swaps a reference and rebuilds one mesh (same cost as today's `applyMode`).

---

## 6. Persistence & Unlock Decisions

### 6.1 Persistence — **Supabase, keyed by player**

**Decision: persist the selected vehicle per player in Supabase.**

- The game already has a Supabase backend (`players` + `scores` tables) and a player identity flow.
- Add a `player_vehicles` table (or a `vehicle` column on `players`) storing `{ player_id, mode, vehicle_id }`.
- On load, fetch the saved vehicle per mode; on selection, upsert it.
- **Fallback:** if Supabase is unreachable, keep the choice in `localStorage` for the session and sync when back online. This keeps the game playable offline.

### 6.2 Unlock / progression — **all available, no locks**

**Decision: all vehicles available from the start.**

- Rationale: the game is a casual arcade driving experience; gating vehicles behind score/level adds friction without a progression system to back it.
- Keep the schema **future-proof**: the `VEHICLES` registry can later gain an `unlockScore` field without changing the UI flow.
- This is the simplest option and avoids a whole progression subsystem in the first garage pass.

---

## 7. Performance — iPad 60fps

| Concern | Cost | Verdict |
|---------|------|---------|
| `VEHICLES` registry | Static object, loaded once | ✅ Negligible |
| Stat merge per frame | One `Object.assign` per frame (or cached on selection) | ✅ Negligible |
| Vehicle swap | Rebuilds one mesh via existing factory — same as today's `applyMode` | ✅ Already budgeted |
| Garage overlay | One DOM overlay, hidden when closed | ✅ No GPU cost when closed |
| 3D previews | Reuse the live scene; no second renderer | ✅ No extra draw calls |
| GC | No per-frame allocations; swap is a one-time mesh rebuild | ✅ No GC spikes |

**Budget:** the garage adds no per-frame render cost. Vehicle swap is identical to the existing mode-switch cost. **60fps on iPad Safari is preserved.**

---

## 8. Implementation Plan (sized for sandcastle tickets)

### Ticket A — Vehicle config registry + stat model (S)
Add `VEHICLES` registry (Section 3.1), `currentVehicle` reference, and the stat-merge in the physics loop. Factories accept a vehicle config. Defaults preserve current behaviour. Tests: registry exists, 3 vehicles per mode, stat relationships hold, defaults match current constants.

### Ticket B — Per-vehicle meshes (S)
Extend `createCar`/`createBoat`/`createPlane` to vary size/color/shape by vehicle config (truck bigger, sports lower, speedboat slimmer, jet swept). Tests: each vehicle produces a distinct mesh (different scale/color).

### Ticket C — Garage UI (M)
Add the Garage button, bottom-sheet overlay, three tabs, carousel, stat bars, and selection wiring to `applyMode` + `currentVehicle`. Touch-friendly per Section 4.2. Tests: overlay opens, tabs render 3 vehicles each, tapping a vehicle switches mode + vehicle, `isOnUI()` blocks steering.

### Ticket D — Persistence (S)
Add `player_vehicles` Supabase table + load/upsert, with `localStorage` fallback. Tests: saved vehicle restored on load, selection persisted.

### Ticket E — Unlock schema (S, optional)
Add optional `unlockScore` field to the registry and a "locked" state in the UI. No progression logic yet. Tests: locked vehicles render as locked and are not selectable.

---

## 9. Acceptance Criteria Checklist

- [x] Research doc written to `research/GARAGE.md`
- [x] Vehicle roster defined (3 per mode) with distinct stat profiles (Section 2)
- [x] Stat model maps each vehicle to the physics tunable constants (Section 3)
- [x] Garage UI spec — selection flow, touch-friendly (Section 4)
- [x] Persistence decision made — Supabase keyed by player, localStorage fallback (Section 6.1)
- [x] Unlock decision made — all available, schema future-proof (Section 6.2)
- [x] Tuning knobs exposed as named config objects (Section 5)
- [x] Implementation plan sized for sandcastle tickets (Section 8)
- [x] iPad 60fps performance budget stated (Section 7)
