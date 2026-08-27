# Boat Physics Research — VibeDrive.je

**Date:** 2026-08-27
**Ticket:** T-PHYS-RESEARCH-BOAT (#18)
**Parent:** Physics Epic (milestone #6)
**Goal:** Research enhanced boat physics (thrust, steering, hull drag, waves, docking) for Boat mode, sized for a single sandcastle ticket.

---

## 1. Current-State Audit

### 1.1 Where the code lives

The Boat-mode physics lives in the main animation loop of `index.html`, in the `else if (vehicleMode === 'boat')` branch. The block starts at **line 4457** and runs to line 4506. It is driven by the shared vehicle-physics block above it (lines 4346–4413), which computes `carSpeed`, `carHeading`, and `lateralVelocity` using mode-scaled constants.

### 1.2 The shared vehicle-physics block (lines 4346–4349)

```js
// Boat physics: ACCEL/2, wider turning (TURN_RATE*0.6), more momentum (FRICTION/2)
const accel = vehicleMode === 'boat' ? ACCEL / 2 : ACCEL;
const friction = vehicleMode === 'boat' ? FRICTION / 2 : (isWetRoads(weatherCategory) ? FRICTION * 0.8 : FRICTION);
const turnRate = vehicleMode === 'boat' ? TURN_RATE * 0.6 : TURN_RATE;
```

The base constants (line 3854):

```js
const MAX_SPEED = 80, ACCEL = 30, BRAKE = 60, FRICTION = 10, TURN_RATE = 3.0;
```

So in Boat mode the effective values are:

| Constant | Car value | Boat value (current) |
|----------|-----------|----------------------|
| `accel` | 30 | 15 |
| `friction` | 10 | 5 |
| `turnRate` | 3.0 | 1.8 |
| `MAX_SPEED` | 80 | 80 (unchanged — **too fast for a boat**) |

### 1.3 The Boat-mode block (lines 4457–4506) — quoted verbatim

```js
} else if (vehicleMode === 'boat') {
  // Boat mode: stay on water surface, can't go on land
  const terrainHeight = getTerrainHeight(carX, carZ);
  if (terrainHeight > tideLevel) {
    // Push boat back — can't go on land
    carSpeed *= 0.3;
    carX -= Math.sin(carHeading * Math.PI / 180) * 3;
    carZ -= Math.cos(carHeading * Math.PI / 180) * 3;
  }
  // Wave bobbing
  const bobY = Math.sin(now * 0.003) * 0.3;
  carGroup.position.set(carX, tideLevel + 1 + bobY, carZ);
  carGroup.rotation.y = carHeading * Math.PI / 180;
  // Wave-induced pitch and roll
  carGroup.rotation.x = Math.sin(now * 0.002) * 0.05;
  carGroup.rotation.z = Math.sin(now * 0.0025 + 1) * 0.05;

  // Update wake trail line — follows boat path
  if (wakeTrailLine && Math.abs(carSpeed) > 1) {
    wakeTrailPoints.push(new THREE.Vector3(carX, tideLevel + 0.2, carZ));
    if (wakeTrailPoints.length > WAKE_TRAIL_MAX) wakeTrailPoints.shift();
    wakeTrailLine.geometry.setFromPoints(wakeTrailPoints);
    wakeTrailLine.material.opacity = 0.8;
  }

  // Water ripple/wake — spawn ripple particles behind boat
  if (Math.abs(carSpeed) > 2 && now % 200 < 20) {
    const wakeGeo = new THREE.RingGeometry(0.5, 1.5, 12);
    const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const wake = new THREE.Mesh(wakeGeo, wakeMat);
    wake.rotation.x = -Math.PI / 2;
    const wakeRad = carHeading * Math.PI / 180;
    wake.position.set(carX - Math.sin(wakeRad) * 4, tideLevel + 0.1, carZ - Math.cos(wakeRad) * 4);
    wake.userData = { spawnTime: now, life: 2000 };
    scene.add(wake);
    // Animate wake ripples — expand and fade
    setTimeout(() => {
      if (wake.parent) scene.remove(wake);
    }, 2000);
  }
  // Animate existing wakes
  scene.children.forEach(child => {
    if (child.userData && child.userData.spawnTime) {
      const age = (now - child.userData.spawnTime) / child.userData.life;
      if (age < 1) {
        child.scale.set(1 + age * 3, 1 + age * 3, 1);
        child.material.opacity = 0.6 * (1 - age);
      }
    }
  });
}
```

### 1.4 What the current model does

| Behaviour | Status | Notes |
|-----------|--------|-------|
| Stays on water surface | ✅ | `carGroup.position.y = tideLevel + 1 + bobY` |
| Cannot go on land | ✅ | Hard push-back when `terrainHeight > tideLevel` |
| Wave bobbing | ✅ | Single global sine, amplitude 0.3, independent of speed |
| Wave pitch/roll | ✅ | Two fixed sines, amplitude 0.05, independent of speed |
| Wake trail | ✅ | Line trail + expanding ring particles |
| Thrust / throttle curve | ❌ | Reuses car accel; no planing vs displacement distinction |
| Reverse | ⚠️ | Reuses car reverse (half-rate) — no docking-grade slow reverse |
| Hull drag / speed cap | ❌ | No water resistance; `MAX_SPEED` = 80 (car speed) |
| Steering feel / turn radius | ❌ | Reuses car turn logic; no rudder response, no speed-vs-turn-radius curve |
| Drift on water | ⚠️ | Inherits car `lateralVelocity` slide — not water-like |
| Docking / slow-speed control | ❌ | None — no fenders, no berth approach, no low-speed authority |
| Tuning knobs | ❌ | Constants are hard-coded inline; no tunable params object |

### 1.5 Key gaps (summary)

1. **No thrust model** — throttle→speed curve is the car's exponential ramp, not a boat's planing curve.
2. **No hull drag** — boat reaches car `MAX_SPEED` (80), far too fast; no water resistance or speed cap.
3. **No rudder feel** — turn rate is a flat scalar; no turn-radius-vs-speed relationship, no drift.
4. **No speed-dependent wave response** — bobbing/pitch/roll are fixed sines regardless of speed.
5. **No docking** — no slow-speed control, no reverse authority, no berth approach.
6. **No tunable constants** — everything is inline magic numbers.

---

## 2. Proposed Model

### 2.1 Design goals

- **Feels like an arcade boat** (GTA V / Hydro Thunder reference) — responsive, weighty, fun on iPad touch.
- **Distinct from the car** — slower top speed, more momentum, wider turns, visible hull response to waves.
- **Docking-capable** — at low speed the boat must be precise and controllable (reverse, small rudder authority).
- **Tunable** — every knob exposed in a single `BOAT_PHYSICS` object.
- **iPad 60fps** — all additions are scalar math on existing state; no new per-frame allocations or draw calls.

### 2.2 Tunable constants object

Introduce a single `BOAT_PHYSICS` object (replacing the inline `ACCEL/2`, `FRICTION/2`, `TURN_RATE*0.6` scalars):

```js
const BOAT_PHYSICS = {
  // Thrust / propulsion
  maxSpeed: 45,            // top speed (game units/s) — ~half the car's 80
  accel: 14,               // forward thrust (units/s^2)
  reverseAccel: 8,         // reverse thrust (units/s^2) — slower than forward
  planingSpeed: 18,        // speed above which hull "planes" (less drag, more speed)
  planingBoost: 1.25,      // extra thrust multiplier above planingSpeed

  // Hull drag / resistance
  dragLinear: 0.6,         // linear water resistance (per second)
  dragQuadratic: 0.02,    // quadratic resistance (per unit speed) — dominates at speed
  idleFriction: 1.2,       // natural deceleration when no throttle (units/s^2)

  // Steering / rudder
  rudderRate: 1.5,         // base turn rate (deg/s per unit of input)
  turnRadiusMin: 0.35,     // turn-rate multiplier at high speed (tighter feel)
  turnRadiusMax: 1.0,      // turn-rate multiplier at low speed (more authority for docking)
  drift: 0.35,             // lateral drift factor on water (0 = none, 1 = full slide)
  driftDecay: 0.90,        // how fast lateral drift decays

  // Wave response
  waveBobAmp: 0.3,         // bobbing amplitude (units)
  waveBobSpeed: 0.003,     // bobbing frequency
  wavePitchAmp: 0.05,      // pitch amplitude (rad)
  waveRollAmp: 0.05,       // roll amplitude (rad)
  waveResponse: 0.6,       // how much wave motion scales with speed (0 = none, 1 = full)
  waveSpeedScale: 0.02,    // speed multiplier on wave frequency (faster = choppier)

  // Docking
  dockSpeed: 6,            // speed below which "docking mode" engages (units/s)
  dockRudderBoost: 1.6,    // rudder authority multiplier at/under dockSpeed
  dockReverseBoost: 1.3,   // reverse authority multiplier at/under dockSpeed
  fenderRange: 4,          // distance to a berth/pontoon that triggers fender feedback
};
```

### 2.3 Thrust and propulsion

Replace the car's exponential ramp with a **two-regime hull model**:

- **Displacement regime** (below `planingSpeed`): thrust is strong and linear — the hull pushes through water, accelerating briskly off the line.
- **Planing regime** (above `planingSpeed`): the hull rises onto the plane, drag drops, and the boat gains a `planingBoost` — the classic "gets on the plane" surge.

```js
// Forward throttle
if (keys.up) {
  const planing = carSpeed > BOAT_PHYSICS.planingSpeed ? BOAT_PHYSICS.planingBoost : 1;
  carSpeed += BOAT_PHYSICS.accel * planing * dt * (1 - carSpeed / BOAT_PHYSICS.maxSpeed);
}
```

**Reverse** uses a dedicated, gentler curve so docking is controllable:

```js
else if (keys.down) {
  if (carSpeed > 0) {
    // Brake on water — slower than car braking, some momentum
    carSpeed -= BOAT_PHYSICS.idleFriction * 2 * dt;
  } else {
    carSpeed -= BOAT_PHYSICS.reverseAccel * dt * (1 - Math.abs(carSpeed) / 12);
  }
}
```

### 2.4 Hull drag and speed cap

Water resistance is **quadratic** (realistic for hulls) plus a small linear term. This naturally caps speed without a hard clamp and gives the boat its weighty momentum:

```js
// Applied every frame regardless of throttle
const drag = carSpeed * BOAT_PHYSICS.dragLinear + carSpeed * Math.abs(carSpeed) * BOAT_PHYSICS.dragQuadratic;
carSpeed -= drag * dt;
// Soft cap — never exceed maxSpeed
carSpeed = Math.max(-12, Math.min(BOAT_PHYSICS.maxSpeed, carSpeed));
if (Math.abs(carSpeed) < 0.2) carSpeed = 0;
```

The quadratic term means: at low speed drag is negligible (good for docking), at high speed it grows fast (good for a believable top speed). The hard clamp is a safety net only.

### 2.5 Steering / rudder

Replace the flat `turnRate` scalar with a **speed-sensitive rudder** — the opposite of the car. A car turns tighter at low speed; a boat needs *more* rudder authority at low speed (docking) and *less* at high speed (planing boats are sluggish to turn):

```js
// Rudder authority: more at low speed (docking), less at high speed (planing)
const speedRatio = Math.min(1, Math.abs(carSpeed) / BOAT_PHYSICS.maxSpeed);
const rudder = BOAT_PHYSICS.rudderRate * (BOAT_PHYSICS.turnRadiusMax - speedRatio * (BOAT_PHYSICS.turnRadiusMax - BOAT_PHYSICS.turnRadiusMin));
// Docking boost at low speed
const dockBoost = Math.abs(carSpeed) <= BOAT_PHYSICS.dockSpeed ? BOAT_PHYSICS.dockRudderBoost : 1;
const turnFactor = rudder * dockBoost * dt;
const dir = carSpeed > 0 ? 1 : -1;
if (keys.left) carHeading += turnFactor * 3 * dir;
if (keys.right) carHeading -= turnFactor * 3 * dir;
if (Math.abs(steerValue) > 0.05) carHeading -= steerValue * turnFactor * 5 * dir;
```

**Drift on water** — a softer, more persistent slide than the car (boats carry momentum sideways):

```js
const turnInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0) - steerValue;
lateralVelocity += turnInput * Math.abs(carSpeed) / BOAT_PHYSICS.maxSpeed * dt * 6 * BOAT_PHYSICS.drift;
lateralVelocity *= BOAT_PHYSICS.driftDecay;
if (Math.abs(lateralVelocity) < 0.01) lateralVelocity = 0;
```

### 2.6 Wave response (speed-dependent)

Keep the existing bobbing/pitch/roll but make amplitude and frequency **scale with speed** — a stationary boat bobs gently, a fast boat pitches and rolls harder and choppier:

```js
const speedFactor = Math.min(1, Math.abs(carSpeed) / BOAT_PHYSICS.maxSpeed);
const bobAmp = BOAT_PHYSICS.waveBobAmp * (1 + speedFactor * BOAT_PHYSICS.waveResponse);
const bobY = Math.sin(now * BOAT_PHYSICS.waveBobSpeed) * bobAmp;
carGroup.position.set(carX, tideLevel + 1 + bobY, carZ);
carGroup.rotation.y = carHeading * Math.PI / 180;
// Pitch/roll scale with speed and get choppier
const waveFreq = 1 + speedFactor * BOAT_PHYSICS.waveSpeedScale * 100;
carGroup.rotation.x = Math.sin(now * BOAT_PHYSICS.waveBobSpeed * waveFreq) * BOAT_PHYSICS.wavePitchAmp * (1 + speedFactor * BOAT_PHYSICS.waveResponse);
carGroup.rotation.z = Math.sin(now * BOAT_PHYSICS.waveBobSpeed * waveFreq + 1) * BOAT_PHYSICS.waveRollAmp * (1 + speedFactor * BOAT_PHYSICS.waveResponse);
```

### 2.7 Docking behaviour

Docking is the "slow-speed control" layer. It engages automatically below `dockSpeed`:

1. **Low-speed rudder authority** — `dockRudderBoost` multiplies turn rate so the boat can be aimed precisely into a berth.
2. **Controllable reverse** — `reverseAccel` + `dockReverseBoost` give enough authority to back out of a berth.
3. **Reduced drag at low speed** — the quadratic drag term is negligible below `dockSpeed`, so the boat doesn't stall out mid-manoeuvre.
4. **Fender feedback** — when within `fenderRange` of a marina pontoon/berth (the Elizabeth Marina group at line 2416), show a subtle visual cue (e.g. a soft "bump" flash or a fender indicator) and dampen speed to prevent clipping through the pontoon.

```js
// Docking: fender proximity to marina pontoons
if (Math.abs(carSpeed) <= BOAT_PHYSICS.dockSpeed) {
  const nearBerth = marinaBerths.some(b => {
    const dx = carX - b.x, dz = carZ - b.z;
    return Math.sqrt(dx*dx + dz*dz) < BOAT_PHYSICS.fenderRange;
  });
  if (nearBerth) {
    // Soft speed damp so the boat settles into the berth
    carSpeed *= 0.9;
    // (optional) fender visual cue
  }
}
```

`marinaBerths` is a small array of berth anchor points derived from the existing Elizabeth Marina pontoon layout (line 2416) — no new geometry, just a few coordinate anchors.

### 2.8 Land collision (unchanged)

Keep the existing hard push-back (lines 4459–4465) — it already prevents beaching. Optionally soften it: instead of `carSpeed *= 0.3` + a 3-unit teleport, apply a gentler `carSpeed *= 0.5` and slide the boat along the shoreline tangent. This is a polish item, not required.

---

## 3. Reference: Arcade Boat Handling

### 3.1 GTA V boats

- Strong, immediate acceleration off the line (displacement feel), then a clear "plane" surge at mid-speed.
- Top speed is clearly lower than cars; boats feel heavy and carry momentum.
- Turning is wide at speed, tight at low speed — you can spin a boat around in a berth.
- Waves visibly rock the hull; speed amplifies the rocking.
- Reverse is slow and deliberate — used for docking, not racing.

### 3.2 Hydro Thunder

- Exaggerated planing: boats visibly lift and accelerate when they get on the plane.
- Very responsive steering at all speeds (arcade, not sim) — good for touch controls.
- Big, readable wave response — the hull pitches and rolls dramatically.

### 3.3 What to take for iPad

- **Responsive low-speed steering** (Hydro Thunder) → docking feels good with touch.
- **Weighty momentum + planing surge** (GTA V) → distinct from the car, satisfying.
- **Speed-amplified wave response** (both) → the boat feels alive and "on the water".
- **Slow, deliberate reverse** (GTA V) → docking is a skill, not a fight.

---

## 4. Implementation Plan (single sandcastle ticket)

**Ticket size:** S–M. One file (`index.html`), one new constants object, one rewritten physics branch, plus tests.

### Step 1 — Add `BOAT_PHYSICS` constants object
Insert near line 3854 (next to `MAX_SPEED`/`ACCEL`/etc.). Pure data, no behaviour change.

### Step 2 — Rewrite the Boat-mode physics branch (lines 4457–4506)
Replace the inline `ACCEL/2`, `FRICTION/2`, `TURN_RATE*0.6` scalars (lines 4346–4349) with `BOAT_PHYSICS` lookups, and implement:
- Thrust (displacement + planing regimes) and dedicated reverse.
- Quadratic hull drag + soft speed cap.
- Speed-sensitive rudder + docking boost + water drift.
- Speed-scaled wave bobbing/pitch/roll.
- Docking fender feedback near marina berths.

Keep the wake trail and ripple particle code as-is (it already works and is cheap).

### Step 3 — Add marina berth anchors
Add a small `marinaBerths` array derived from the Elizabeth Marina pontoon layout (line 2416). ~6 coordinate anchors, no new meshes.

### Step 4 — Tests (test.html)
Add assertions that:
- `BOAT_PHYSICS` object exists with all required keys (`maxSpeed`, `accel`, `dragQuadratic`, `rudderRate`, `waveResponse`, `dockSpeed`, etc.).
- Boat `maxSpeed` < car `MAX_SPEED` (boats are slower than cars).
- `reverseAccel` < `accel` (reverse is gentler).
- `dockRudderBoost` > 1 (docking has extra steering authority).
- `waveResponse` is in `[0,1]`.
- The boat branch still references `tideLevel` and `getTerrainHeight` (land collision intact).

### Step 5 — Verify
- Load `http://localhost:5173/`, switch to Boat mode, confirm: acceleration, planing surge, top speed ~45, wide turns at speed, tight turns at low speed, reverse, wave rocking that scales with speed, and docking feel near Elizabeth Marina.
- Run `test.html` — all green.
- Check iPad Safari 60fps (see budget below).

---

## 5. iPad 60fps Performance Budget

All proposed changes are **scalar arithmetic on existing state** — no new meshes, no new draw calls, no per-frame allocations beyond what already exists.

| Concern | Cost | Verdict |
|---------|------|---------|
| Thrust/drag/rudder math | ~20 extra float ops/frame | ✅ Negligible |
| Speed-scaled wave sines | 3 extra `Math.sin`/frame | ✅ Negligible |
| Docking proximity check | `marinaBerths` ~6 distance checks/frame | ✅ Negligible |
| Wake trail + ripples | Unchanged (existing) | ✅ Already budgeted |
| New meshes/geometry | **None** | ✅ No GPU cost |
| New draw calls | **None** | ✅ No GPU cost |

**Budget:** well under 1% of a frame's CPU budget. The existing Boat mode already runs at 60fps on iPad; these additions do not change the render path, so **60fps on iPad Safari is preserved**.

---

## 6. Acceptance Criteria Checklist

- [x] Research doc written to `research/PHYSICS-BOAT.md`
- [x] Current boat physics block audited and quoted (Section 1.3, verbatim lines 4457–4506)
- [x] Proposed thrust/drag/steering/wave model specified with tunable constants (Section 2)
- [x] Docking behaviour specified — slow-speed control, approach to marina (Section 2.7)
- [x] Implementation plan sized for one sandcastle ticket (Section 4)
- [x] iPad 60fps performance budget stated (Section 5)
