# VibeDrive.je — Enhanced Car Physics Research (Drift, Traction, Weight Transfer)

> **Research report for VibeDrive.je** — Drive-mode car physics upgrade.
> Evaluates the current physics model, proposes an arcade drift/traction/weight-transfer model, and sizes an implementation plan for a single sandcastle ticket.
> Parent: Physics Epic (milestone #6) — Ticket: T-PHYS-RESEARCH-CAR (#17)
> Date: August 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current-State Audit](#2-current-state-audit)
3. [Reference: Arcade Handling That Feels Good](#3-reference-arcade-handling-that-feels-good)
4. [Proposed Model](#4-proposed-model)
5. [Tuning Constants](#5-tuning-constants)
6. [Visual Feedback](#6-visual-feedback)
7. [Performance Budget (iPad 60fps)](#7-performance-budget-ipad-60fps)
8. [Implementation Plan (One Sandcastle Ticket)](#8-implementation-plan-one-sandcastle-ticket)
9. [Risks & Non-Goals](#9-risks--non-goals)

---

## 1. Executive Summary

The current Drive-mode physics is a **2D arcade model**: a single scalar `carSpeed` plus a scalar `lateralVelocity`, integrated into `carX/carZ` with a heading angle. It already has the *seeds* of drift (handbrake raises slide factor and slows lateral decay), but there is **no tyre-grip model, no weight transfer, no understeer/oversteer, and no body roll** — the car is a point mass with a fake `sin()` suspension bounce.

The proposed upgrade keeps the **single-file, no-build, iPad-60fps** constraints by staying in 2D (top-down) with a **bicycle-style tyre model**: longitudinal force from throttle/brake, lateral grip that saturates at a slip threshold, and a handbrake that deliberately drops rear grip to induce oversteer drift. Weight transfer is **modelled as a scalar load split** (front/rear) derived from accel/brake (pitch) and steering (roll), which feeds back into grip — giving the *feel* of weight transfer without a full 3D rigid-body solver.

**Recommendation:** implement the model in **one ticket** — replace the `carSpeed`/`lateralVelocity` block (index.html ~lines 4345–4522) with a grip-limited bicycle model, expose a `PHYS` tuning object, and add cheap visual body roll/pitch. This is a **single mechanic** (car handling) touching **1 file** (index.html) plus this research doc.

---

## 2. Current-State Audit

### 2.1 Where the code lives

The Drive-mode physics block is in `index.html` inside the main animation loop, `else` branch of the vehicle-mode switch (the `vehicleMode === 'drive'` path). The ticket references ~line 4508; the full physics pipeline spans **~4345–4522** (constants at 3854, state at 3847–3850).

### 2.2 Constants (index.html:3854)

```js
const MAX_SPEED = 80, ACCEL = 30, BRAKE = 60, FRICTION = 10, TURN_RATE = 3.0;
```

### 2.3 State (index.html:3847–3850)

```js
let carX = 46, carZ = -65, carHeading = 0, carSpeed = 0; // Start in St Helier
let lateralVelocity = 0; // lateral slide momentum for sharp turns
```

### 2.4 The physics block (index.html:4345–4522, quoted)

```js
// ====== VEHICLE PHYSICS ======
// Boat physics: ACCEL/2, wider turning (TURN_RATE*0.6), more momentum (FRICTION/2)
const accel = vehicleMode === 'boat' ? ACCEL / 2 : ACCEL;
const friction = vehicleMode === 'boat' ? FRICTION / 2 : (isWetRoads(weatherCategory) ? FRICTION * 0.8 : FRICTION);
const turnRate = vehicleMode === 'boat' ? TURN_RATE * 0.6 : TURN_RATE;
// Vehicle physics — improved with exponential accel, proportional brake, speed-sensitive turning
if (keys.up) {
  // (1) Exponential acceleration ramp — slows as approaching MAX_SPEED
  carSpeed += accel * dt * (1 - carSpeed / MAX_SPEED);
} else if (keys.down) {
  if (carSpeed > 0) {
    // (2) Braking proportional to speed
    const brakeForce = BRAKE * dt * (Math.abs(carSpeed) / MAX_SPEED + 0.3);
    carSpeed -= brakeForce;
  } else {
    // (7) Reverse — accelerate backwards at half rate
    carSpeed -= accel * dt * 0.5 * (1 - Math.abs(carSpeed) / 20);
  }
} else {
  // Natural friction / engine braking — handbrake reduces friction for more slide
  const frictionRate = keys.handbrake ? 2 : friction;
  if (carSpeed > 0) carSpeed -= frictionRate * dt;
  else if (carSpeed < 0) carSpeed += frictionRate * dt;
}
carSpeed = Math.max(-20, Math.min(MAX_SPEED, carSpeed));
if (Math.abs(carSpeed) < 0.3) carSpeed = 0;

// (3) Turning — turn rate inversely proportional to speed
if (Math.abs(carSpeed) > 1) {
  const turnFactor = turnRate * dt * (1 - Math.abs(carSpeed) / MAX_SPEED * 0.5);
  const dir = carSpeed > 0 ? 1 : -1; // reverse steering when going backwards
  if (keys.left) carHeading += turnFactor * 3 * dir;
  if (keys.right) carHeading -= turnFactor * 3 * dir;
  if (Math.abs(steerValue) > 0.05) carHeading -= steerValue * turnFactor * 5 * dir;

  // (4) Lateral momentum — on sharp turns, car slides slightly
  const turnInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0) - steerValue;
  const slideFactor = keys.handbrake ? 3.0 : 1.0; // handbrake increases slide
  lateralVelocity += turnInput * Math.abs(carSpeed) / MAX_SPEED * dt * 8 * slideFactor;
}
// Decay lateral velocity over time
const lateralDecay = keys.handbrake ? 0.90 : 0.92; // handbrake = slower decay = more slide
lateralVelocity *= lateralDecay;
if (Math.abs(lateralVelocity) < 0.01) lateralVelocity = 0;

// (5) Terrain slope — sample height at car position and 1 unit ahead
const rad = carHeading * Math.PI / 180;
const aheadX = carX + Math.sin(rad) * 1;
const aheadZ = carZ + Math.cos(rad) * 1;
const hHere = getTerrainHeight(carX, carZ);
const hAhead = getTerrainHeight(aheadX, aheadZ);
if (hAhead > hHere) {
  // Uphill — reduce speed by 5%
  carSpeed *= 1 - 0.05 * dt * 10;
} else if (hAhead < hHere) {
  // Downhill — increase speed by 3%
  carSpeed *= 1 + 0.03 * dt * 10;
}

// Movement — forward + lateral slide
if (Math.abs(carSpeed) > 0.1 || Math.abs(lateralVelocity) > 0.01) {
  const dist = carSpeed * 0.3 * dt;
  carX += Math.sin(rad) * dist;
  carZ += Math.cos(rad) * dist;
  // Apply lateral velocity (perpendicular to heading)
  const latRad = rad + Math.PI / 2;
  carX += Math.sin(latRad) * lateralVelocity * dt;
  carZ += Math.cos(latRad) * lateralVelocity * dt;
}
```

…and the Drive-mode render block (index.html:4508–4522):

```js
// Drive mode
if (islandMask(carX, carZ) <= 0.05) {
  carSpeed *= 0.5;
  carX -= Math.sin(carHeading * Math.PI / 180) * 2;
  carZ -= Math.cos(carHeading * Math.PI / 180) * 2;
}
const terrainHeight = getTerrainHeight(carX, carZ);
// (6) Suspension bounce — small sin offset on car Y
const suspensionBounce = Math.sin(now * 0.01) * 0.1;
carGroup.position.set(carX, Math.max(terrainHeight + 0.5 + suspensionBounce, 0), carZ);
carGroup.rotation.y = carHeading * Math.PI / 180;
carGroup.rotation.x = 0;
const tilt = (keys.left ? 0.05 : keys.right ? -0.05 : 0) - steerValue * 0.05;
carGroup.rotation.z = tilt * (Math.abs(carSpeed) / MAX_SPEED);
```

### 2.5 Audit findings

| # | Finding | Severity |
|---|---------|----------|
| 1 | **No grip model.** Lateral velocity is a hand-tuned `+=`/`*=` decay, not a force. There is no slip angle, so the car never "loses grip" in a physically meaningful way — it just slides a fixed amount. | High |
| 2 | **No understeer/oversteer.** Front and rear grip are identical (there is no axle split), so the car can't push (understeer) or spin (oversteer). Handbrake is a magic `slideFactor=3` multiplier, not a rear-grip reduction. | High |
| 3 | **No weight transfer.** Accel/brake/steering never shift load between axles, so grip is constant regardless of throttle/brake/steer state. | High |
| 4 | **Fake suspension.** `Math.sin(now*0.01)*0.1` is a time-based bounce, not a spring/damper response to terrain or load. Body roll is a hardcoded `tilt` from input, not from lateral acceleration. | Medium |
| 5 | **Constants are magic numbers** scattered inline (3, 5, 8, 0.3, 0.5, 0.05, 0.92, 0.90). Not tunable as a group. | Medium |
| 6 | **Wet-road grip** is a single `FRICTION*0.8` multiplier on longitudinal friction only — it does not reduce lateral grip, so rain doesn't actually make corners harder. | Medium |
| 7 | **Reverse steering** handled by `dir` flip — works, but the proposed model handles it more cleanly via signed velocity. | Low |
| 8 | **Terrain slope** is a hacky `*=(1±k*dt*10)` multiplier, not a force along the slope. Acceptable for arcade; keep as-is. | Low |

**Bottom line:** the current model is a *point-mass with a slide hack*. It is stable, cheap, and already drifts a little — but it cannot express grip limits, weight transfer, or oversteer. The upgrade is a **drop-in replacement of one block**, not a rewrite of the game.

---

## 3. Reference: Arcade Handling That Feels Good

GTA V / Forza-style arcade handling (the target feel) is **not** a full simulation. The key properties that make it feel good on touch controls:

- **Grip is a limit, not a constant.** The car tracks the road perfectly at low slip; beyond a slip threshold it slides. This is the single most important feel factor.
- **Oversteer is earned.** Drift comes from *reducing rear grip* (handbrake) or *throttle-on in a turn* (power oversteer), not from a global slide multiplier.
- **Weight transfer is felt, not seen.** Braking shifts load to the front (more front grip, less rear → car wants to rotate); accelerating shifts load to the rear (more rear grip, less front → car wants to understeer). This is what makes a car "settle" into a corner.
- **Counter-steer is natural.** Once the car is sliding, steering against the slide recovers it — this emerges from the grip model, no special-casing needed.
- **Speed-sensitive steering.** Low speed = sharp, high speed = wide. Already present, keep it.
- **Forgiving on touch.** iPad players can't do fine analog input; the model must self-correct (grip pulls the car back toward the heading) so a sloppy input doesn't spin you out.

---

## 4. Proposed Model

Keep the **2D top-down** representation (no 3D rigid body — that's the performance win). Model the car as a **bicycle model** with two axles, each with a grip limit. All forces are computed in the car's local frame, then integrated into world `carX/carZ` and `carHeading`.

### 4.1 State (replaces `carSpeed` + `lateralVelocity`)

```js
// velocity in car-local frame
let vForward = 0;   // m/s along heading (replaces carSpeed)
let vLateral = 0;   // m/s perpendicular to heading (replaces lateralVelocity)
let carHeading = 0; // degrees, world
```

### 4.2 Per-frame steps

1. **Longitudinal force** — throttle/brake/reverse/engine-brake → `vForward` (same exponential ramp as today, but as a force).
2. **Steering input** — `steer` in `[-1,1]` from keys + `steerValue` (touch). Convert to a front-wheel slip angle.
3. **Lateral grip** — compute the slip angle at each axle; clamp lateral force to the grip limit:
   - `slipAngle = atan2(vLateral, |vForward|)` (front adds steer angle).
   - `lateralForce = min(grip * load, slipAngle * corneringStiffness)`.
   - If the required lateral force exceeds grip → **slide** (car drifts).
4. **Weight transfer** — shift load front/rear from `vForward` change (pitch) and steering (roll):
   - `loadFront = 0.5 + pitchTransfer + rollTransfer`
   - `loadRear  = 0.5 - pitchTransfer - rollTransfer`
   - `pitchTransfer = clamp(-accelLong * weightTransfer, -0.3, 0.3)` (braking → +front)
   - `rollTransfer  = clamp(steer * |vForward| * rollFactor, -0.3, 0.3)`
5. **Handbrake** — multiply **rear** grip by `handbrakeGrip` (e.g. 0.35). This is the drift trigger.
6. **Integrate** — `carHeading += yawRate*dt`; `carX/Z += rotate(vForward, vLateral)`.
7. **Grip recovery** — when not sliding, `vLateral` is pulled hard toward 0 (the car "grips up"). This gives the self-correcting, forgiving feel.

### 4.3 Understeer / oversteer behaviour

- **Understeer** (front grip < rear): car pushes wide, heading doesn't rotate enough. Emerges when front load is low (heavy throttle) or front grip is low (wet).
- **Oversteer** (rear grip < front): rear steps out, heading rotates too much. Emerges on handbrake (rear grip cut) or heavy braking into a turn (front load high).
- **Drift** = sustained oversteer where the player counter-steers to hold a slide angle. Counter-steer works automatically because steering the front wheels against the slide re-establishes front grip.

### 4.4 Wet roads

Replace the single `FRICTION*0.8` with a **grip multiplier** applied to *both* longitudinal and lateral grip (e.g. `gripScale = 0.7` in rain). This makes corners genuinely slippery, not just slower acceleration.

---

## 5. Tuning Constants

Expose as a single tunable object so the feel can be dialled without hunting magic numbers:

```js
const PHYS = {
  maxSpeed: 80,
  accel: 30,
  brake: 60,
  reverseAccel: 15,
  engineBrake: 10,        // coasting decel
  // Grip
  grip: 1.0,              // global grip multiplier (0.7 in rain)
  corneringStiffness: 2.2,// lateral force per unit slip angle
  maxSlipAngle: 0.5,      // rad — beyond this the tyre is fully sliding
  // Drift
  handbrakeGrip: 0.35,    // rear grip multiplier when handbrake held
  driftFactor: 1.0,       // overall drift intensity
  // Weight transfer
  weightTransfer: 0.18,   // load shift per unit accel/steer
  rollFactor: 0.02,       // roll load shift per unit steer*speed
  // Steering
  turnRate: 3.0,          // base yaw rate
  speedSteerFalloff: 0.5, // how much steering shrinks at high speed
  // Suspension (visual)
  springStiffness: 60,
  springDamping: 8,
  bodyRoll: 0.06,         // rad of roll per unit lateral accel
  bodyPitch: 0.04,        // rad of pitch per unit longitudinal accel
};
```

**Suggested starting feel** (arcade, forgiving, iPad-friendly):
- `grip: 1.0`, `handbrakeGrip: 0.35`, `weightTransfer: 0.18`, `maxSlipAngle: 0.5`.
- Drift should be **easy to start** (hold handbrake + steer) but **easy to recover** (release handbrake, counter-steer) — the grip-recovery step handles this.

---

## 6. Visual Feedback

The physics model produces two signals that should drive the car mesh (replacing the fake `sin` bounce and hardcoded tilt):

- **Body roll** (`rotation.z`): proportional to lateral acceleration (i.e. `vLateral` change / `dt`), clamped. This makes the car visibly lean into corners and drift.
- **Body pitch** (`rotation.x`): proportional to longitudinal acceleration — nose-down under braking, nose-up under throttle.
- **Suspension bounce**: replace `sin(now*0.01)` with a **spring-damper** on `carY` that responds to terrain height changes and load (a real `y += (targetY - y)*spring*dt` with damping). Cheap, and makes bumps feel physical.
- **Skid marks** (optional, stretch): a fading trail when `slipAngle > maxSlipAngle` — huge drift feedback payoff, cheap as a line strip (reuse the boat wake-trail pattern at index.html:4475).

All visual work is **pure mesh transforms** — no extra draw calls, no per-frame allocations beyond the existing pattern.

---

## 7. Performance Budget (iPad 60fps)

The proposed model is **strictly cheaper or equal** to the current one:

- **Math cost:** ~15 extra scalar ops/frame (a few `atan2`, `clamp`, `min`). Negligible — the current block already does `getTerrainHeight` (a heightmap sample) twice per frame, which dominates.
- **No allocations:** all state is scalars; no new objects per frame. Skid marks (if added) reuse the existing wake-trail line-strip pattern (index.html:4475) — one geometry `setFromPoints` per frame, already proven at 60fps.
- **No new draw calls:** body roll/pitch are `rotation` writes on the existing `carGroup`.
- **Budget:** the physics block is well under 0.1ms/frame on iPad. The 60fps budget is dominated by rendering (shadows, instanced meshes, radar), not physics. **Headroom: comfortable.**

---

## 8. Implementation Plan (One Sandcastle Ticket)

**Scope: one mechanic (car handling), one file (index.html) + this research doc.** Sized for a single sandcastle ticket.

### Steps

1. **Add `PHYS` tuning object** near the constants (index.html:3854). Replace `MAX_SPEED/ACCEL/BRAKE/FRICTION/TURN_RATE` usage in the Drive block with `PHYS.*` (keep boat/plane using their own values).
2. **Replace state** (index.html:3847–3850): add `vForward`, `vLateral` alongside `carSpeed`/`lateralVelocity` (keep the old ones for boat/plane compatibility, or migrate all — prefer migrate for cleanliness).
3. **Rewrite the Drive-mode physics block** (index.html:4345–4388) with the bicycle grip model from §4. Keep the terrain-slope and island-mask logic (index.html:4390–4413, 4509–4513) unchanged.
4. **Rewrite the Drive-mode render block** (index.html:4515–4521): spring-damper suspension + body roll/pitch from §6.
5. **Wet-road grip** (index.html:4348): apply `gripScale` to lateral grip too, not just longitudinal friction.
6. **Test** on iPad Safari + desktop: drift starts/recoverable, no spin-out on sloppy input, boat/plane unaffected, 60fps.

### File-change count

| File | Change |
|------|--------|
| `index.html` | Physics + render blocks, `PHYS` object, state |
| `research/PHYSICS-CAR.md` | This doc (already done) |

**≤2 files, 1 mechanic.** Fits the ticket's "≤5 file changes, one mechanic" constraint.

### Out of scope (future tickets)
- Skid-mark particles (stretch, optional).
- Per-vehicle handling differences (bus vs car vs boat).
- Collision/impact physics.
- Full 3D rigid-body simulation (rejected — unnecessary cost).

---

## 9. Risks & Non-Goals

- **Risk: drift feels too loose / hard to control on touch.** Mitigation: strong grip-recovery step (§4.2 step 7) and conservative `handbrakeGrip` (0.35). Tune `driftFactor` down if needed.
- **Risk: breaking boat/plane modes.** Mitigation: keep their physics paths separate; only the `drive` branch is rewritten.
- **Risk: regression in existing feel.** Mitigation: keep the same `MAX_SPEED/ACCEL/BRAKE` values as `PHYS` defaults so top speed and accel feel identical; only grip/steer behaviour changes.
- **Non-goal:** realistic simulation. This is arcade handling tuned for iPad touch, not a physics sim.
- **Non-goal:** multiplayer sync changes. The model is deterministic and client-side; no network impact.

---

## Appendix: Why not a full 3D rigid-body solver?

A proper 6-DOF rigid body (Cannon.js / custom) would give "real" weight transfer and body roll, but adds: a physics engine dependency (or ~500 lines of solver), per-frame integration cost, and tuning complexity — all against the single-file, no-build, iPad-60fps constraints. The 2D bicycle model with a scalar load split reproduces the *felt* behaviour (grip limits, oversteer, weight transfer) at a fraction of the cost. **This is the right trade for VibeDrive.je.**
