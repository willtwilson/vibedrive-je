# Plane Physics Research — VibeDrive.je

**Date:** 2026-08-27
**Ticket:** T-PHYS-RESEARCH-PLANE (#19)
**Parent:** Physics Epic (milestone #6)
**Goal:** Research enhanced plane physics (airspeed, stall, climb, banking, takeoff/landing) for Fly mode, sized for a single sandcastle ticket.

---

## 1. Current-State Audit

### 1.1 Where the code lives

The Fly-mode physics lives in the main animation loop of `index.html`, in the `if (vehicleMode === 'fly')` branch. The block starts at **line 4415** and runs to line 4456. It is driven by the shared vehicle-physics block above it (lines 4346–4413), which computes `carSpeed`, `carHeading`, and `lateralVelocity` using mode-scaled constants.

The plane state variables are declared at **line 3851**:

```js
let planeAlt = 0; // altitude for plane mode
let planeTakeoffT = 0, planeTakeoffStart = 0, planeTakeoffTarget = 50; // smooth takeoff interpolation
let planeShadow = null; // flat dark circle shadow under the plane
```

The base constants (line 3854):

```js
const MAX_SPEED = 80, ACCEL = 30, BRAKE = 60, FRICTION = 10, TURN_RATE = 3.0;
```

### 1.2 Mode entry (lines 3956–3983)

On switching to Fly mode the plane is spawned at `terrainH + 5`, given `carSpeed = 50`, and a 2-second altitude ramp to 50m is armed:

```js
if (mode === 'fly') {
  vehicleMode = 'fly';
  scene.remove(carGroup);
  if (wakeTrailLine) { scene.remove(wakeTrailLine); wakeTrailLine = null; }
  carGroup = createPlane(0xcc2222);
  const terrainH = getTerrainHeight(carX, carZ);
  carGroup.position.set(carX, terrainH + 5, carZ);
  scene.add(carGroup);
  updateUsernameSprite();
  // Smooth takeoff: start at terrain+5, rise to 50 over 2 seconds
  planeAlt = terrainH + 5;
  planeTakeoffTarget = 50;
  planeTakeoffStart = planeAlt;
  planeTakeoffT = 0;
  carSpeed = 50; // Cessna — start moving immediately!
  camMode = 'chase'; // ensure chase view behind the plane
  updateCamLabel();
  // Add shadow plane (flat dark circle on ground)
  if (!planeShadow) {
    const shadowGeo = new THREE.CircleGeometry(3, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
    planeShadow = new THREE.Mesh(shadowGeo, shadowMat);
    planeShadow.rotation.x = -Math.PI / 2;
    scene.add(planeShadow);
  }
  planeShadow.visible = true;
  document.getElementById('mode-name').textContent = '✈️ Fly Mode';
}
```

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
| Constant forward momentum | ✅ | Reuses car `carSpeed`; auto-throttle floors at 30 |
| Auto-throttle to prevent stall | ✅ | `if (carSpeed < 30) carSpeed += ACCEL*dt*0.5` |
| Speed cap | ✅ | `MAX_SPEED * 1.5` = 120 |
| Smooth takeoff ramp | ✅ | 2-second interpolation to 50m (line 4422) |
| Climb / descend | ✅ | `keys.up` +15m/s, `keys.down` −15m/s |
| Auto-level to 50m | ✅ | `planeAlt += (50 - planeAlt)*dt*0.5` |
| Altitude clamp | ✅ | `[terrain+5, 300]` |
| Pitch on climb/descend | ✅ | Fixed `-0.2` / `0.15` |
| Bank into turns | ✅ | Fixed `turnInput * 0.12` |
| Propeller spin | ✅ | `dt * 50` |
| Ground shadow | ✅ | Flat circle, scales/fades with altitude |
| **Real airspeed model** | ❌ | No throttle→airspeed, no drag, no stall speed |
| **Stall** | ❌ | Auto-throttle prevents it entirely |
| **Climb rate vs throttle/pitch** | ❌ | Fixed +15m/s regardless of speed or pitch |
| **Coordinated turn / altitude loss** | ❌ | Bank is cosmetic; no turn-radius-vs-bank relationship |
| **Takeoff (ground roll, rotate)** | ❌ | Instant 2s ramp, no ground roll or rotate |
| **Landing (approach, flare, touchdown)** | ❌ | None — no gear, no touchdown, no go-around |
| **Tuning knobs** | ❌ | Constants hard-coded inline; no tunable params object |

### 1.5 Key gaps (summary)

1. **No airspeed model** — throttle→airspeed, drag, max speed, and stall speed are absent; the plane reuses the car's exponential ramp.
2. **No stall** — auto-throttle floors airspeed at 30, so the plane can never stall; no nose-drop, no loss of lift, no recovery.
3. **No climb/descent model** — climb rate is a fixed +15m/s regardless of throttle or pitch; no max climb angle.
4. **No coordinated turn** — banking is a cosmetic roll; no bank-angle-vs-turn-radius relationship, no altitude loss in turns.
5. **No real takeoff** — the 2s altitude ramp replaces ground roll, rotate, and climb-out.
6. **No landing** — no approach, flare, touchdown, gear, or overshoot/go-around.
7. **No tunable constants** — everything is inline magic numbers.

---

## 2. Proposed Model

### 2.1 Design goals

- **Feels like an arcade plane** (GTA V planes / War Thunder arcade reference) — responsive, forgiving, fun on iPad touch, not a flight sim.
- **Distinct from the car** — airspeed governs everything: lift, stall, climb, turn radius.
- **Stall exists but is recoverable** — a player who pulls up too hard or throttles back too far gets a gentle nose-drop and can recover by adding throttle and lowering the nose. No crash-to-ground.
- **Real takeoff and landing** — ground roll → rotate → climb-out, and approach → flare → touchdown, replacing the 2s ramp.
- **Tunable** — every knob exposed in a single `PLANE_PHYSICS` object.
- **iPad 60fps** — all additions are scalar math on existing state; no new per-frame allocations or draw calls.

### 2.2 Tunable constants object

Introduce a single `PLANE_PHYSICS` object (replacing the inline `MAX_SPEED*1.5`, `15*dt`, `0.12`, `0.2` scalars):

```js
const PLANE_PHYSICS = {
  // Airspeed model
  maxSpeed: 120,            // top airspeed (game units/s) — 1.5x the car's 80
  stallSpeed: 30,           // airspeed below which the wing stops producing lift
  thrust: 26,               // engine thrust (units/s^2) at full throttle
  dragLinear: 0.35,         // linear air drag (per second)
  dragQuadratic: 0.004,     // quadratic drag (per unit speed) — dominates at speed
  idleThrottle: 0.35,       // cruise throttle fraction when no input (keeps airspeed up)

  // Lift / stall
  liftCoeff: 0.9,           // lift multiplier (how strongly the wing holds altitude)
  stallNoseDrop: 0.5,       // nose-drop rate (rad/s) when stalled
  stallRecoverThrottle: 0.6,// throttle fraction needed to begin stall recovery
  stallRecoverRate: 0.8,    // how fast the nose comes back up on recovery

  // Climb / descent
  climbRate: 15,            // max climb rate (units/s) at full throttle
  climbThrottleFactor: 1.0, // how much climb rate scales with throttle (0..1)
  maxClimbAngle: 0.35,      // max pitch-up angle (rad) — ~20 degrees
  maxDescendAngle: 0.25,    // max pitch-down angle (rad)
  autoLevelRate: 0.5,       // how fast the plane auto-levels to cruise altitude

  // Banking & turn
  bankRate: 2.2,            // bank angle per unit of turn input (rad)
  maxBankAngle: 0.9,        // max bank angle (rad) — ~50 degrees
  turnRadiusMin: 0.5,       // turn-rate multiplier at high bank (tight turn)
  turnRadiusMax: 1.0,       // turn-rate multiplier at low bank (wide turn)
  turnAltitudeLoss: 0.4,    // altitude lost per second in a hard banked turn (units/s)

  // Takeoff
  groundRollSpeed: 18,      // airspeed at which the plane rotates (lifts off)
  rotatePitch: 0.25,        // pitch-up angle during rotation (rad)
  climbOutAlt: 50,          // target cruise altitude after climb-out (units)

  // Landing
  approachAlt: 30,          // target approach altitude (units)
  approachSpeed: 40,        // target approach airspeed (units/s)
  flareAlt: 6,              // altitude at which flare begins (units)
  flarePitch: 0.12,         // nose-up pitch during flare (rad)
  touchdownSpeed: 12,       // airspeed at which touchdown is considered complete
  gearDown: true,           // whether landing gear is deployed (visual + drag)
  gearDrag: 0.15,           // extra drag when gear is down
  goAroundThrottle: 0.9,    // throttle for a go-around (overshoot)
};
```

### 2.3 Airspeed model

Replace the car's exponential ramp with a **throttle + drag** model. Airspeed is the single source of truth; everything else (lift, stall, climb, turn) derives from it.

```js
// Throttle input: up = full, down = brake/descend, neutral = cruise
let throttle = PLANE_PHYSICS.idleThrottle;
if (keys.up) throttle = 1.0;
else if (keys.down) throttle = 0.0;

// Thrust accelerates toward maxSpeed; drag opposes it (quadratic dominates at speed)
const drag = carSpeed * PLANE_PHYSICS.dragLinear
           + carSpeed * Math.abs(carSpeed) * PLANE_PHYSICS.dragQuadratic
           + (PLANE_PHYSICS.gearDown ? PLANE_PHYSICS.gearDrag : 0);
carSpeed += (PLANE_PHYSICS.thrust * throttle - drag) * dt;
carSpeed = Math.max(0, Math.min(PLANE_PHYSICS.maxSpeed, carSpeed));
```

The quadratic drag term naturally caps airspeed at `maxSpeed` without a hard clamp, and gives the plane believable momentum — it accelerates briskly off the line, then the drag curve flattens the top end.

### 2.4 Stall

Stall is the core new behaviour. When airspeed drops below `stallSpeed`, the wing stops producing lift: the nose drops, the plane loses altitude, and it must recover by adding throttle and lowering the nose.

```js
const stalled = carSpeed < PLANE_PHYSICS.stallSpeed;
if (stalled) {
  // Nose drops, plane loses lift and altitude
  pitch += PLANE_PHYSICS.stallNoseDrop * dt;
  planeAlt -= (PLANE_PHYSICS.stallSpeed - carSpeed) * dt * 0.8; // sink rate scales with deficit
  // Recovery: add throttle and the nose comes back up
  if (throttle >= PLANE_PHYSICS.stallRecoverThrottle) {
    pitch -= PLANE_PHYSICS.stallRecoverRate * dt;
  }
} else {
  // Normal flight: pitch follows climb/descend input
  pitch = keys.up ? -PLANE_PHYSICS.maxClimbAngle
        : keys.down ? PLANE_PHYSICS.maxDescendAngle
        : 0;
}
```

**Recovery rule:** the plane recovers automatically once the player holds throttle above `stallRecoverThrottle` and airspeed climbs back above `stallSpeed`. This keeps it forgiving on iPad — a stall is a gentle dip, not a crash.

### 2.5 Climb / descent

Climb rate scales with **throttle and pitch**, not a fixed +15m/s. At full throttle the plane climbs at `climbRate`; at low throttle it descends. The auto-level behaviour is preserved but now targets the cruise altitude and is gentler.

```js
// Climb rate = maxClimbRate * throttle * pitchFactor
const pitchFactor = keys.up ? 1 : keys.down ? -1 : 0;
const climb = PLANE_PHYSICS.climbRate * throttle * pitchFactor;
planeAlt += climb * dt;

// Auto-level when neutral: drift back toward cruise altitude
if (!keys.up && !keys.down) {
  planeAlt += (PLANE_PHYSICS.climbOutAlt - planeAlt) * PLANE_PHYSICS.autoLevelRate * dt;
}
```

### 2.6 Banking & coordinated turn

Bank is now a **rate-limited** roll that feeds back into turn radius. A harder bank = tighter turn but more altitude loss (the classic "pull the nose up in a turn" feel). The turn itself uses the existing `carHeading` machinery but with a bank-scaled turn factor.

```js
// Bank: rate-limited roll toward the input, clamped to maxBankAngle
const turnInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0) - steerValue;
const targetBank = THREE.MathUtils.clamp(turnInput * PLANE_PHYSICS.bankRate, -PLANE_PHYSICS.maxBankAngle, PLANE_PHYSICS.maxBankAngle);
bankAngle += (targetBank - bankAngle) * Math.min(1, dt * 3);
carGroup.rotation.z = bankAngle;

// Turn radius tightens with bank; altitude is lost in a hard banked turn
const bankRatio = Math.abs(bankAngle) / PLANE_PHYSICS.maxBankAngle;
const turnFactor = PLANE_PHYSICS.turnRadiusMin + (1 - bankRatio) * (PLANE_PHYSICS.turnRadiusMax - PLANE_PHYSICS.turnRadiusMin);
if (Math.abs(carSpeed) > 1) {
  const dir = carSpeed > 0 ? 1 : -1;
  if (keys.left) carHeading += turnFactor * 3 * dir * dt;
  if (keys.right) carHeading -= turnFactor * 3 * dir * dt;
  if (Math.abs(steerValue) > 0.05) carHeading -= steerValue * turnFactor * 5 * dir * dt;
}
// Altitude loss in a hard banked turn
planeAlt -= bankRatio * PLANE_PHYSICS.turnAltitudeLoss * dt;
```

### 2.7 Takeoff (replaces the 2s ramp)

Replace the instant 2s altitude ramp with a **ground roll → rotate → climb-out** sequence. The plane starts on the ground (`planeAlt = terrainH + 0.5`), accelerates along the runway, and only lifts off once airspeed exceeds `groundRollSpeed`.

```js
// Takeoff state machine: 'ground' -> 'rotate' -> 'climbout' -> 'airborne'
if (planePhase === 'ground') {
  planeAlt = getTerrainHeight(carX, carZ) + 0.5; // wheels on the ground
  carGroup.rotation.x = 0;
  if (carSpeed >= PLANE_PHYSICS.groundRollSpeed) {
    planePhase = 'rotate';
    planePhaseT = 0;
  }
} else if (planePhase === 'rotate') {
  planePhaseT += dt;
  // Rotate nose up over ~1 second, then climb out
  carGroup.rotation.x = -PLANE_PHYSICS.rotatePitch * Math.min(1, planePhaseT);
  planeAlt += PLANE_PHYSICS.climbRate * 0.5 * dt;
  if (planePhaseT >= 1) planePhase = 'climbout';
} else if (planePhase === 'climbout') {
  // Climb to cruise altitude, then normal flight
  planeAlt += PLANE_PHYSICS.climbRate * throttle * dt;
  if (planeAlt >= PLANE_PHYSICS.climbOutAlt) planePhase = 'airborne';
}
```

`planePhase` is a new state variable (initialised to `'ground'` on mode entry). The old `planeTakeoffT`/`planeTakeoffStart`/`planeTakeoffTarget` interpolation is removed.

### 2.8 Landing (approach, flare, touchdown, go-around)

Landing is the inverse of takeoff. When the player descends below `approachAlt`, the plane enters the approach phase; below `flareAlt` it flares (nose-up) and touches down once airspeed drops below `touchdownSpeed`.

```js
if (planePhase === 'airborne' && planeAlt <= PLANE_PHYSICS.approachAlt) {
  planePhase = 'approach';
}
if (planePhase === 'approach') {
  // Descend toward the runway, hold approach speed
  planeAlt -= PLANE_PHYSICS.climbRate * 0.4 * dt;
  if (planeAlt <= PLANE_PHYSICS.flareAlt) {
    planePhase = 'flare';
    carGroup.rotation.x = -PLANE_PHYSICS.flarePitch; // nose up
  }
} else if (planePhase === 'flare') {
  // Flare: bleed speed, settle onto the runway
  carSpeed *= 0.98;
  planeAlt = Math.max(getTerrainHeight(carX, carZ) + 0.5, planeAlt - PLANE_PHYSICS.climbRate * 0.3 * dt);
  if (carSpeed <= PLANE_PHYSICS.touchdownSpeed) {
    planePhase = 'ground'; // touched down — back to ground roll
    carGroup.rotation.x = 0;
  }
}
// Go-around: if the player throttles up hard during approach/flare, abort the landing
if ((planePhase === 'approach' || planePhase === 'flare') && throttle >= PLANE_PHYSICS.goAroundThrottle) {
  planePhase = 'climbout';
}
```

**Gear:** `gearDown` is a visual + drag flag. It is `true` on the ground and during approach, and retracts (drag removed) once airborne above `approachAlt`. The gear is a small visual mesh on the plane (two tiny struts) — no physics beyond the `gearDrag` term.

### 2.9 Ground collision (unchanged)

Keep the existing altitude clamp (`planeAlt = Math.max(getTerrainHeight(carX, carZ) + 5, ...)`) but relax the `+5` to `+0.5` so the plane can actually sit on the runway for takeoff/landing. The `Math.min(300, planeAlt)` ceiling stays.

---

## 3. Reference: Arcade Flight Handling

### 3.1 GTA V planes

- Airspeed is the master variable — the plane visibly accelerates, and pulling up at low speed causes a stall with a nose-drop.
- Takeoff is a real ground roll: you accelerate down the runway, rotate, and climb out.
- Landing is forgiving: you can flare and touch down gently, or go around by adding throttle.
- Banking into turns is smooth and rate-limited; hard banks lose a little altitude.
- Stall is recoverable — add throttle and lower the nose and the plane recovers.

### 3.2 War Thunder (arcade mode)

- Clear airspeed + stall model: below stall speed the nose drops and the plane sinks.
- Climb rate scales with throttle and pitch — you can't climb at full rate with the throttle closed.
- Coordinated turns: bank angle determines turn radius; hard turns cost energy/altitude.
- Forgiving recovery: arcade mode auto-recovers from stalls with throttle.

### 3.3 What to take for iPad

- **Airspeed as the master variable** (both) → lift, stall, climb, and turn all derive from it; one mental model.
- **Recoverable stall** (GTA V / War Thunder arcade) → a gentle nose-drop, not a crash; forgiving on touch.
- **Real ground-roll takeoff and flare landing** (GTA V) → replaces the 2s ramp with a satisfying, readable sequence.
- **Rate-limited banking with altitude loss** (both) → the plane feels weighty and "on the wing", not a floating camera.
- **Throttle-scaled climb** (War Thunder) → climbing is a choice, not automatic.

---

## 4. Implementation Plan (single sandcastle ticket)

**Ticket size:** S–M. One file (`index.html`), one new constants object, one rewritten physics branch, plus tests.

### Step 1 — Add `PLANE_PHYSICS` constants object
Insert near line 3854 (next to `MAX_SPEED`/`ACCEL`/etc.). Pure data, no behaviour change.

### Step 2 — Add plane state variables
Replace `planeTakeoffT`/`planeTakeoffStart`/`planeTakeoffTarget` (line 3852) with:
- `planePhase` (`'ground' | 'rotate' | 'climbout' | 'airborne' | 'approach' | 'flare'`)
- `planePhaseT` (phase timer)
- `pitch` and `bankAngle` (smoothed, rate-limited)
- `throttle` (derived from input each frame)

### Step 3 — Rewrite the Fly-mode physics branch (lines 4415–4456)
Implement, in order:
- Airspeed model (throttle + drag + gear drag) — Section 2.3.
- Stall detection + recovery — Section 2.4.
- Throttle/pitch-scaled climb + auto-level — Section 2.5.
- Rate-limited banking + bank-scaled turn radius + turn altitude loss — Section 2.6.
- Takeoff state machine (ground → rotate → climb-out) — Section 2.7.
- Landing state machine (approach → flare → touchdown → ground, + go-around) — Section 2.8.
- Relax the ground clamp `+5` → `+0.5` so the plane can sit on the runway — Section 2.9.

Keep the propeller spin and ground-shadow code as-is (they already work and are cheap).

### Step 4 — Update mode entry (lines 3956–3983)
On entering Fly mode: set `planePhase = 'ground'`, `planeAlt = terrainH + 0.5`, `carSpeed = 0` (start from a standstill on the runway), and remove the old takeoff-ramp initialisation. Optionally add a small landing-gear visual to `createPlane` (line 3444).

### Step 5 — Tests (test.html)
Add assertions that:
- `PLANE_PHYSICS` object exists with all required keys (`maxSpeed`, `stallSpeed`, `thrust`, `liftCoeff`, `climbRate`, `maxBankAngle`, `groundRollSpeed`, `approachAlt`, `flareAlt`, `touchdownSpeed`, etc.).
- `stallSpeed` < `maxSpeed` (a stall is possible below top speed).
- `groundRollSpeed` < `stallSpeed` (the plane rotates before it can stall — it lifts off before losing lift).
- `climbRate` > 0 and `maxClimbAngle` in `(0, π/2)`.
- `maxBankAngle` in `(0, π/2)` and `turnAltitudeLoss` ≥ 0.
- `approachAlt` > `flareAlt` > 0 (approach is higher than flare).
- The plane branch still references `getTerrainHeight` and `planeShadow` (ground collision + shadow intact).

### Step 6 — Verify
- Load `http://localhost:5173/`, switch to Fly mode, confirm: ground roll → rotate → climb-out, airspeed governs climb, a hard pull-up at low speed stalls (nose drops) and recovers with throttle, banking tightens turns and loses a little altitude, and a descent to the runway flares and touches down (or goes around with throttle).
- Run `test.html` — all green.
- Check iPad Safari 60fps (see budget below).

---

## 5. iPad 60fps Performance Budget

All proposed changes are **scalar arithmetic on existing state** — no new meshes, no new draw calls, no per-frame allocations beyond what already exists.

| Concern | Cost | Verdict |
|---------|------|---------|
| Airspeed/drag/stall math | ~20 extra float ops/frame | ✅ Negligible |
| Throttle/pitch climb | ~5 extra float ops/frame | ✅ Negligible |
| Rate-limited bank + turn | ~10 extra float ops/frame | ✅ Negligible |
| Takeoff/landing state machine | A few branch checks/frame | ✅ Negligible |
| Landing gear visual | 1–2 tiny meshes, static | ✅ One-time GPU cost |
| Ground shadow + propeller | Unchanged (existing) | ✅ Already budgeted |
| New draw calls | **None** (gear is 1 static mesh) | ✅ No per-frame GPU cost |

**Budget:** well under 1% of a frame's CPU budget. The existing Fly mode already runs at 60fps on iPad; these additions do not change the render path, so **60fps on iPad Safari is preserved**.

---

## 6. Acceptance Criteria Checklist

- [x] Research doc written to `research/PHYSICS-PLANE.md`
- [x] Current plane physics block audited and quoted (Section 1.3, verbatim lines 4415–4456)
- [x] Proposed airspeed/stall/climb/bank model specified with tunable constants (Section 2)
- [x] Takeoff and landing behaviour specified — ground roll, rotate, flare, touchdown (Sections 2.7, 2.8)
- [x] Implementation plan sized for one sandcastle ticket (Section 4)
- [x] iPad 60fps performance budget stated (Section 5)
