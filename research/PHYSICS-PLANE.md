# Plane Physics Research — VibeDrive.je

**Date:** 2026-08-27
**Ticket:** T-PHYS-RESEARCH-PLANE (#19)
**Parent:** Physics Epic (milestone #6)
**Goal:** Research enhanced plane physics (airspeed, stall, climb, banking, takeoff/landing) for Fly mode, sized for a single sandcastle ticket.

---

## 1. Current-State Audit

### 1.1 Where the code lives

The Fly-mode physics lives in the main animation loop of `index.html`, in the `if (vehicleMode === 'fly')` branch. The block starts at **line 4415** and runs to line 4456. It is driven by the shared vehicle-physics block above it (lines 4345–4413), which computes `carSpeed`, `carHeading`, and `lateralVelocity` using mode-scaled constants.

The plane's altitude state is declared at line 3851:

```js
let planeAlt = 0; // altitude for plane mode
let planeTakeoffT = 0, planeTakeoffStart = 0, planeTakeoffTarget = 50; // smooth takeoff interpolation
let planeShadow = null; // flat dark circle shadow under the plane
```

The base constants (line 3854):

```js
const MAX_SPEED = 80, ACCEL = 30, BRAKE = 60, FRICTION = 10, TURN_RATE = 3.0;
```

### 1.2 The shared vehicle-physics block (lines 4345–4413)

The plane reuses the car's throttle/brake/turn logic verbatim (no mode-specific scalars for `fly` — only `boat` gets `ACCEL/2`, `FRICTION/2`, `TURN_RATE*0.6`):

```js
const accel = vehicleMode === 'boat' ? ACCEL / 2 : ACCEL;
const friction = vehicleMode === 'boat' ? FRICTION / 2 : (isWetRoads(weatherCategory) ? FRICTION * 0.8 : FRICTION);
const turnRate = vehicleMode === 'boat' ? TURN_RATE * 0.6 : TURN_RATE;
```

So in Fly mode the effective values are identical to the car:

| Constant | Car value | Plane value (current) |
|----------|-----------|----------------------|
| `accel` | 30 | 30 |
| `friction` | 10 | 10 |
| `turnRate` | 3.0 | 3.0 |
| `MAX_SPEED` | 80 | 80 (soft-capped to 120 in the fly block) |

### 1.3 The Fly-mode block (lines 4415–4456) — quoted verbatim

```js
if (vehicleMode === 'fly') {
  // Plane: Cessna-like physics — constant forward momentum
  // (1) Maintain minimum airspeed of 30 (auto-throttle if below)
  if (carSpeed < 30) carSpeed += ACCEL * dt * 0.5; // auto-throttle to prevent stall
  if (carSpeed > MAX_SPEED * 1.5) carSpeed = MAX_SPEED * 1.5; // planes can go faster

  // (8) Smooth takeoff: interpolate altitude from terrain+5 to 50 over 2 seconds
  if (planeTakeoffT < 1) {
    planeTakeoffT = Math.min(1, planeTakeoffT + dt / 2); // 2-second ramp
    planeAlt = planeTakeoffStart + (planeTakeoffTarget - planeTakeoffStart) * planeTakeoffT;
  } else {
    // Altitude: up key = climb, down key = descend, auto-level when neutral
    if (keys.up) planeAlt += 15 * dt;
    else if (keys.down) planeAlt -= 15 * dt;
    else planeAlt += (50 - planeAlt) * dt * 0.5; // auto-level to 50m
  }

  planeAlt = Math.max(getTerrainHeight(carX, carZ) + 5, Math.min(300, planeAlt));

  carGroup.position.set(carX, planeAlt, carZ);
  carGroup.rotation.y = carHeading * Math.PI / 180;
  // (5) Pitch: nose-up when climbing, nose-down when descending
  carGroup.rotation.x = keys.up ? -0.2 : keys.down ? 0.15 : 0;
  // (4) Bank: roll into turns based on turn input
  const turnInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0) - steerValue;
  const bankAngle = turnInput * 0.12;
  carGroup.rotation.z = bankAngle;

  // (6) Spin propeller fast
  const prop = carGroup.children.find(c => c.userData && c.userData.isProp);
  if (prop) prop.rotation.x += dt * 50;

  // (7) Update shadow plane — flat dark circle at terrain height
  if (planeShadow) {
    const groundH = getTerrainHeight(carX, carZ);
    planeShadow.position.set(carX, groundH + 0.5, carZ);
    // Scale shadow based on altitude (smaller when higher)
    const altRatio = Math.min(1, (planeAlt - groundH) / 100);
    const shadowScale = 1.5 - altRatio * 0.8;
    planeShadow.scale.set(shadowScale, shadowScale, 1);
    planeShadow.material.opacity = 0.35 * (1 - altRatio * 0.5);
  }
}
```

### 1.4 What the current model does

| Behaviour | Status | Notes |
|-----------|--------|-------|
| Constant forward momentum | ✅ | Reuses car throttle/brake/friction |
| Auto-throttle to prevent stall | ✅ | `if (carSpeed < 30) carSpeed += ACCEL*dt*0.5` |
| Up/down climb/descend | ✅ | Fixed `15 * dt` rate, auto-level to 50m when neutral |
| Bank into turns | ✅ | `bankAngle = turnInput * 0.12` (visual only) |
| Smooth takeoff ramp to 50m | ✅ | 2-second linear interpolation |
| Shadow plane | ✅ | Flat dark circle, scales/fades with altitude |
| Airspeed model (throttle→speed, drag) | ❌ | Reuses car accel; no airspeed, no drag, no stall speed |
| Real stall | ❌ | Auto-throttle prevents ever going below 30 |
| Climb/descent vs throttle & pitch | ❌ | Fixed rate; no pitch→climb coupling, no max climb angle |
| Coordinated turn / bank vs radius | ❌ | Bank is cosmetic; turn radius is the car's flat scalar |
| Altitude loss in turns | ❌ | None |
| Takeoff (ground roll, rotate, climb-out) | ❌ | 2s magic ramp, no ground roll, no rotate |
| Landing (approach, flare, touchdown, gear) | ❌ | None — plane can't land, no gear, no overshoot |
| Tuning knobs | ❌ | Constants hard-coded inline; no tunable params object |

### 1.5 Key gaps (summary)

1. **No airspeed model** — throttle→speed is the car's exponential ramp; no airspeed, no drag, no stall speed, no max-speed-vs-throttle relationship.
2. **No real stall** — the auto-throttle (`carSpeed < 30`) makes stalling impossible; there is no nose-drop/loss-of-lift/recovery behaviour.
3. **No climb/descent model** — altitude changes at a fixed `15 * dt` regardless of throttle or pitch; no max climb angle, no rate-vs-throttle curve.
4. **No coordinated turn** — bank is cosmetic (`rotation.z` only); turn radius is the car's flat scalar, no bank-angle↔turn-radius coupling, no altitude loss in turns.
5. **No takeoff** — a 2-second linear ramp replaces ground roll, rotate, and climb-out.
6. **No landing** — no approach, flare, touchdown, gear, or overshoot/go-around.
7. **No tunable constants** — everything is inline magic numbers.

---

## 2. Proposed Model

### 2.1 Design goals

- **Feels like an arcade plane** (GTA V planes, War Thunder arcade) — responsive, weighty, fun on iPad touch.
- **Distinct from the car** — airspeed matters, stalling is a real risk, climbing costs speed, banking is physical.
- **Landing-capable** — approach, flare, touchdown, and a go-around when you botch it.
- **Tunable** — every knob exposed in a single `PLANE_PHYSICS` object.
- **iPad 60fps** — all additions are scalar math on existing state; no new per-frame allocations or draw calls.

### 2.2 Tunable constants object

Introduce a single `PLANE_PHYSICS` object (replacing the inline `30`, `15`, `0.12`, `50`, `300` magic numbers):

```js
const PLANE_PHYSICS = {
  // Airspeed / propulsion
  maxSpeed: 120,            // top airspeed (game units/s) — planes are faster than the car's 80
  cruiseSpeed: 70,          // speed the plane settles at with neutral throttle
  thrust: 22,               // forward thrust (units/s^2) at full throttle
  dragLinear: 0.35,         // linear air drag (per second)
  dragQuadratic: 0.004,     // quadratic drag (per unit speed) — dominates at speed
  idleThrottle: 0.5,        // neutral-throttle fraction (0..1) that holds cruiseSpeed

  // Stall
  stallSpeed: 30,           // below this airspeed the wing loses lift
  stallNoseDrop: 0.6,       // pitch-down rate (rad/s) while stalled
  stallLiftLoss: 0.7,       // fraction of lift lost while stalled (0..1)
  stallRecoverySpeed: 40,   // airspeed needed to recover from a stall
  stallRecoveryRate: 0.5,   // how fast the nose comes back up after recovery

  // Climb / descent
  climbRate: 15,            // max climb rate (units/s) at full throttle + full pitch
  climbPitchMax: 0.35,      // max nose-up pitch (rad) at full climb
  descentRate: 18,          // max descent rate (units/s) at full pitch-down
  descentPitchMax: 0.3,     // max nose-down pitch (rad)
  climbSpeedPenalty: 0.4,   // fraction of thrust diverted to climbing (0..1)
  autoLevel: 0.5,           // auto-level-to-cruise-altitude rate when neutral (per second)
  cruiseAlt: 50,             // altitude the plane auto-levels to (units)

  // Banking / turn
  bankRate: 2.2,            // max bank angle (rad) at full turn input
  bankSmooth: 4.0,          // how fast the plane rolls into/out of a bank (per second)
  turnRadiusMin: 0.5,        // turn-rate multiplier at high speed (tight, coordinated)
  turnRadiusMax: 1.0,       // turn-rate multiplier at low speed (wide, mushy)
  turnAltLoss: 0.3,         // altitude lost per unit of bank while turning (units/s)
  coordinated: 0.8,         // how much the yaw follows the bank (0 = skid, 1 = coordinated)

  // Takeoff
  rotateSpeed: 45,          // airspeed at which the pilot can rotate (nose up)
  rotateRate: 0.8,          // rotation rate (rad/s) during takeoff
  climbOutAlt: 50,          // target altitude for climb-out after rotation
  groundRollFriction: 3.0,  // extra friction while on the ground (wheels)

  // Landing
  approachSpeed: 40,        // target airspeed on final approach
  flareAlt: 8,              // altitude at which the flare (nose-up) begins
  flareRate: 0.5,           // flare rotation rate (rad/s)
  touchdownSpeed: 25,      // airspeed at which touchdown is safe
  gearDown: true,           // landing gear state (visual + drag)
  gearDrag: 0.15,           // extra drag when gear is down
  goAroundThrottle: 1.0,    // full throttle for a go-around
};
```

### 2.3 Airspeed model

Replace the car's exponential ramp with a **throttle→airspeed** model with linear + quadratic drag. Airspeed is the plane's `carSpeed` (reused), but it now responds to throttle and drag rather than the car's friction:

```js
// Throttle input (0..1): up = full, neutral = idleThrottle, down = brake/reverse-throttle
const throttle = keys.up ? 1 : keys.down ? 0 : PLANE_PHYSICS.idleThrottle;
// Thrust scales with throttle; drag is linear + quadratic
const thrust = PLANE_PHYSICS.thrust * throttle;
const drag = carSpeed * PLANE_PHYSICS.dragLinear + carSpeed * Math.abs(carSpeed) * PLANE_PHYSICS.dragQuadratic;
carSpeed += (thrust - drag) * dt;
// Soft cap — never exceed maxSpeed
carSpeed = Math.max(0, Math.min(PLANE_PHYSICS.maxSpeed, carSpeed));
```

At neutral throttle the plane settles at `cruiseSpeed` (where thrust = drag). At full throttle it accelerates toward `maxSpeed`. The quadratic drag term makes high-speed acceleration feel heavy and gives a believable top speed.

### 2.4 Stall

A stall happens when airspeed drops below `stallSpeed` (e.g. climbing too steeply, or holding the nose up at low speed). While stalled:

- **Lift is lost** — the plane stops climbing and starts sinking.
- **The nose drops** — pitch-down at `stallNoseDrop` rad/s.
- **Recovery** — push the nose down / add throttle to regain airspeed above `stallRecoverySpeed`, then the nose comes back up at `stallRecoveryRate`.

```js
const stalled = carSpeed < PLANE_PHYSICS.stallSpeed;
if (stalled) {
  // Nose drops, lift lost — plane sinks
  planeAlt -= PLANE_PHYSICS.stallNoseDrop * dt * 10;
  pitch = Math.max(pitch - PLANE_PHYSICS.stallNoseDrop * dt, -0.5);
  // Auto-throttle is REMOVED — the pilot must recover by adding throttle
} else if (pitch < 0 && carSpeed > PLANE_PHYSICS.stallRecoverySpeed) {
  pitch += PLANE_PHYSICS.stallRecoveryRate * dt; // nose comes back up
}
```

The current auto-throttle (`if (carSpeed < 30) carSpeed += ACCEL*dt*0.5`) is **removed** — stalling must be possible, and recovery must be a player action (add throttle, lower the nose).

### 2.5 Climb / descent

Climb rate is coupled to **throttle and pitch**, not a fixed `15 * dt`. Climbing diverts thrust (`climbSpeedPenalty`), so a steep climb bleeds airspeed — which is what makes stalling possible:

```js
// Pitch input: up = climb, down = descend, neutral = auto-level
const pitchInput = keys.up ? 1 : keys.down ? -1 : 0;
if (pitchInput > 0) {
  // Climb — costs speed
  const climb = PLANE_PHYSICS.climbRate * pitchInput;
  planeAlt += climb * dt;
  carSpeed -= climb * PLANE_PHYSICS.climbSpeedPenalty * dt; // climbing bleeds airspeed
  pitch = Math.min(pitch + PLANE_PHYSICS.climbPitchMax * dt, PLANE_PHYSICS.climbPitchMax);
} else if (pitchInput < 0) {
  // Descend — gains speed
  planeAlt -= PLANE_PHYSICS.descentRate * dt;
  carSpeed += PLANE_PHYSICS.descentRate * 0.3 * dt; // descending builds airspeed
  pitch = Math.max(pitch - PLANE_PHYSICS.descentPitchMax * dt, -PLANE_PHYSICS.descentPitchMax);
} else {
  // Auto-level to cruise altitude
  planeAlt += (PLANE_PHYSICS.cruiseAlt - planeAlt) * PLANE_PHYSICS.autoLevel * dt;
  pitch *= 0.9; // ease the nose back to level
}
```

**Max climb angle** is implicit: `climbRate` (15) vs `maxSpeed` (120) gives a shallow ~7° climb at full speed; climbing steeply bleeds airspeed until the stall kicks in. This is the arcade "climb too hard and you stall" feel.

### 2.6 Banking & coordinated turn

Replace the cosmetic `bankAngle = turnInput * 0.12` with a **smooth, physical bank** that couples to turn radius and costs altitude:

```js
// Target bank from turn input, smoothed
const turnInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0) - steerValue;
const targetBank = turnInput * PLANE_PHYSICS.bankRate;
bank = THREE.MathUtils.lerp(bank, targetBank, PLANE_PHYSICS.bankSmooth * dt);
carGroup.rotation.z = bank;

// Turn radius: tighter at high speed (coordinated), wider at low speed
const speedRatio = Math.min(1, carSpeed / PLANE_PHYSICS.maxSpeed);
const turnFactor = PLANE_PHYSICS.turnRadiusMin + (1 - speedRatio) * (PLANE_PHYSICS.turnRadiusMax - PLANE_PHYSICS.turnRadiusMin);
const dir = carSpeed > 0 ? 1 : -1;
if (keys.left) carHeading += turnFactor * 3 * dir;
if (keys.right) carHeading -= turnFactor * 3 * dir;
if (Math.abs(steerValue) > 0.05) carHeading -= steerValue * turnFactor * 5 * dir;

// Coordinated yaw — the nose follows the bank
carGroup.rotation.y = carHeading * Math.PI / 180 + bank * PLANE_PHYSICS.coordinated;

// Altitude loss in turns — banking bleeds lift
planeAlt -= Math.abs(bank) * PLANE_PHYSICS.turnAltLoss * dt;
```

The bank is now a **physical state** (smoothed, not instant), the turn radius responds to airspeed, and banking costs a little altitude — so a tight turn at low speed risks a stall.

### 2.7 Takeoff

Replace the 2-second linear ramp with a **ground roll → rotate → climb-out** sequence:

1. **Ground roll** — the plane accelerates along the runway/terrain at `planeAlt = terrain + 5` with extra wheel friction (`groundRollFriction`). No climb yet.
2. **Rotate** — once airspeed ≥ `rotateSpeed`, holding `keys.up` pitches the nose up at `rotateRate` rad/s and the plane lifts off.
3. **Climb-out** — after rotation the plane climbs toward `climbOutAlt` using the normal climb model.

```js
if (planeTakeoffT < 1) {
  // Ground roll — accelerate, stay on the ground, extra wheel friction
  carSpeed += PLANE_PHYSICS.thrust * dt;
  carSpeed -= carSpeed * PLANE_PHYSICS.groundRollFriction * dt;
  planeAlt = getTerrainHeight(carX, carZ) + 5;
  // Rotate when fast enough and the pilot pulls up
  if (carSpeed >= PLANE_PHYSICS.rotateSpeed && keys.up) {
    planeTakeoffT = Math.min(1, planeTakeoffT + PLANE_PHYSICS.rotateRate * dt);
    planeAlt += planeTakeoffT * PLANE_PHYSICS.climbOutAlt * dt;
  }
} else {
  // In the air — normal climb/descent model (Section 2.5)
}
```

The old `planeTakeoffStart`/`planeTakeoffTarget` interpolation is replaced by this physical sequence.

### 2.8 Landing

Landing is the inverse of takeoff — **approach → flare → touchdown → gear**, with a **go-around** when the approach is botched:

1. **Approach** — descend toward a runway/terrain at `approachSpeed` (40), nose slightly down.
2. **Flare** — below `flareAlt` (8), pitch the nose up at `flareRate` to bleed the descent.
3. **Touchdown** — when `planeAlt` reaches terrain height and airspeed ≤ `touchdownSpeed`, the plane is on the ground: `planeAlt = terrain + 5`, gear down, wheel friction applies.
4. **Go-around** — if the pilot holds full throttle (`goAroundThrottle`) during a bad approach, the plane climbs back out instead of crashing.

```js
const groundH = getTerrainHeight(carX, carZ);
if (planeAlt <= groundH + 5) {
  // On the ground — touchdown
  planeAlt = groundH + 5;
  if (carSpeed > PLANE_PHYSICS.touchdownSpeed) {
    // Too fast — bounce / overshoot (go-around)
    if (keys.up) { planeAlt += PLANE_PHYSICS.climbRate * dt; } // go-around
    else { carSpeed *= 0.8; } // hard touchdown, scrub speed
  } else {
    // Safe touchdown — gear down, wheel friction
    carSpeed -= carSpeed * PLANE_PHYSICS.groundRollFriction * dt;
  }
}
```

**Gear** is a visual + drag toggle: `gearDown` adds `gearDrag` when extended (approach/landing) and is retracted after climb-out. It's a small visual cue (a gear mesh on the plane model) plus a drag constant — no new physics system.

### 2.9 Tuning knobs summary

Every number above lives in `PLANE_PHYSICS`. The implementation ticket only needs to touch the constants object and the `if (vehicleMode === 'fly')` branch — no other code.

---

## 3. Reference: Arcade Plane Handling

### 3.1 GTA V planes

- Airspeed is the core currency — too slow and the plane mushes and stalls; too fast and it's hard to turn.
- Climbing steeply bleeds airspeed; you must trade altitude for speed and vice-versa.
- Banking is smooth and physical; tight turns cost altitude.
- Takeoff is a real ground roll + rotate; landing is approach + flare + touchdown.
- Stalling is a real risk but recovery is forgiving (add throttle, lower the nose).

### 3.2 War Thunder arcade

- Very forgiving stall — the plane mushes and sinks rather than snapping into a spin.
- Climb rate is clearly throttle-and-pitch coupled; you can see the speed bleed.
- Coordinated turns: bank and the nose follows; uncoordinated turns skid.
- Landing is approach → flare → touchdown, with a clear go-around if you overshoot.

### 3.3 What to take for iPad

- **Airspeed as the core currency** (GTA V) — makes flying a skill, distinct from driving.
- **Forgiving, recoverable stall** (War Thunder arcade) — mushy sink + nose drop, easy to recover, never a hard crash.
- **Throttle-and-pitch-coupled climb** (both) — climbing bleeds speed, which enables the stall.
- **Physical, smooth banking with altitude cost** (both) — turns feel like turns, not a cosmetic roll.
- **Real takeoff and landing** (both) — ground roll, rotate, flare, touchdown, go-around.

---

## 4. Implementation Plan (single sandcastle ticket)

**Ticket size:** M. One file (`index.html`), one new constants object, one rewritten physics branch, plus tests.

### Step 1 — Add `PLANE_PHYSICS` constants object
Insert near line 3854 (next to `MAX_SPEED`/`ACCEL`/etc.). Pure data, no behaviour change.

### Step 2 — Rewrite the Fly-mode physics branch (lines 4415–4456)
Replace the inline `30`, `15`, `0.12`, `50`, `300` magic numbers with `PLANE_PHYSICS` lookups, and implement:
- Airspeed model (throttle→speed, linear + quadratic drag, soft cap).
- Stall (nose drop, lift loss, recovery) — **remove the auto-throttle**.
- Climb/descent coupled to throttle and pitch, with speed bleed on climb.
- Smooth physical banking with coordinated yaw and altitude loss in turns.
- Takeoff (ground roll → rotate → climb-out) replacing the 2s ramp.
- Landing (approach → flare → touchdown → gear) with a go-around.

Keep the propeller spin and shadow-plane code as-is (they already work and are cheap).

### Step 3 — Add landing gear visual
Add a small gear mesh to `createPlane` (line 3445) that retracts/extends with `gearDown`. Optional but cheap — one small mesh, no new draw calls when retracted.

### Step 4 — Tests (test.html)
Add assertions that:
- `PLANE_PHYSICS` object exists with all required keys (`maxSpeed`, `thrust`, `stallSpeed`, `climbRate`, `bankRate`, `rotateSpeed`, `touchdownSpeed`, etc.).
- Plane `maxSpeed` > car `MAX_SPEED` (planes are faster than cars).
- `stallSpeed` < `cruiseSpeed` (the plane cruises above stall).
- `stallRecoverySpeed` > `stallSpeed` (you must regain speed to recover).
- `climbRate` > 0 and `descentRate` > 0.
- `bankRate` is in a sane range (e.g. `0.5`–`3.0` rad).
- The fly branch still references `getTerrainHeight` and `planeShadow` (existing behaviour intact).

### Step 5 — Verify
- Load `http://localhost:5173/`, switch to Fly mode, confirm: throttle→airspeed, cruise at ~70, stall when climbing too steeply (nose drop + sink), recovery by adding throttle, smooth banking with altitude loss, ground-roll takeoff with rotate, and approach/flare/touchdown landing with a go-around.
- Run `test.html` — all green.
- Check iPad Safari 60fps (see budget below).

---

## 5. iPad 60fps Performance Budget

All proposed changes are **scalar arithmetic on existing state** — no new meshes (except one optional gear mesh), no new draw calls, no per-frame allocations beyond what already exists.

| Concern | Cost | Verdict |
|---------|------|---------|
| Airspeed/drag/stall math | ~25 extra float ops/frame | ✅ Negligible |
| Climb/descent coupling | ~10 extra float ops/frame | ✅ Negligible |
| Bank smoothing + coordinated yaw | 1 `lerp` + 1 multiply/frame | ✅ Negligible |
| Altitude loss in turns | 1 multiply/frame | ✅ Negligible |
| Takeoff/landing state checks | ~5 comparisons/frame | ✅ Negligible |
| Landing gear mesh | 1 small mesh, hidden when retracted | ✅ Negligible |
| New draw calls | **None** (gear hidden when retracted) | ✅ No GPU cost |

**Budget:** well under 1% of a frame's CPU budget. The existing Fly mode already runs at 60fps on iPad; these additions do not change the render path, so **60fps on iPad Safari is preserved**.

---

## 6. Acceptance Criteria Checklist

- [x] Research doc written to `research/PHYSICS-PLANE.md`
- [x] Current plane physics block audited and quoted (Section 1.3, verbatim lines 4415–4456)
- [x] Proposed airspeed/stall/climb/bank model specified with tunable constants (Section 2)
- [x] Takeoff and landing behaviour specified — ground roll, rotate, flare, touchdown, go-around (Sections 2.7–2.8)
- [x] Implementation plan sized for one sandcastle ticket (Section 4)
- [x] iPad 60fps performance budget stated (Section 5)
