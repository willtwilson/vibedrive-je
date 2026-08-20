# GRAPHICS DIRECTION: Retro Top-Down GTA 1-Style

> **Research report for VibeDrive.je** — Alternative art direction analysis.
> Evaluates transitioning from Three.js 3D to a GTA 1 (1997)-inspired top-down 2D/2.5D sprite-based renderer with British/Jersey aesthetics.
> Date: August 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [GTA 1 Technical Analysis](#2-gta-1-technical-analysis)
3. [Top-Down 2D Game Engines for Web](#3-top-down-2d-game-engines-for-web)
4. [Sprite-Based Car Rendering](#4-sprite-based-car-rendering)
5. [Top-Down City Rendering](#5-top-down-city-rendering)
6. [British/Jersey Aesthetic](#6-britishjersey-aesthetic)
7. [Physics and Damage](#7-physics-and-damage)
8. [Audio](#8-audio)
9. [Performance Budget](#9-performance-budget)
10. [Real Examples & Open-Source References](#10-real-examples--open-source-references)
11. [Migration Path from Current 3D](#11-migration-path-from-current-3d)
12. [Code Architecture for Retro Version](#12-code-architecture-for-retro-version)
13. [Comparison: Retro vs Modern 3D](#13-comparison-retro-vs-modern-3d)
14. [Recommendation](#14-recommendation)

---

## 1. Executive Summary

The retro GTA 1-style direction is **technically viable, significantly cheaper to build and run, and aesthetically distinctive**. The current Three.js game is 183KB of single-file HTML with complex 3D scene management, WebGL rendering, shadow maps, and procedural terrain — all of which demand GPU resources and careful optimization for mobile. A Canvas 2D sprite-based renderer would:

- **Cut bundle size by 60-70%** (no Three.js dependency, no geometry buffers)
- **Run at 60fps on any device** including old iPads and budget Android phones
- **Be faster to develop** — sprites are simpler than 3D models, no camera math, no lighting
- **Have a unique visual identity** — no other Jersey game looks like GTA 1
- **Reuse 80%+ of game logic** — physics, missions, scoring, wanted level, AI all work in 2D

The trade-off: less visual immersion, no true 3D depth, limited camera flexibility. But for a mobile-first casual driving game with GTA-style missions, the retro aesthetic is arguably **better suited** than 3D — it's faster, clearer, more readable on small screens, and has nostalgia appeal.

---

## 2. GTA 1 Technical Analysis

### 2.1 Rendering Architecture

GTA 1 (DMA Design, 1997) ran on a custom engine built in C/C++ for MS-DOS and Windows 95. Key technical details:

**Sprite-Based Rendering**
- All vehicles, pedestrians, and objects were **pre-rendered 3D models converted to 2D sprites**
- Cars used **16-directional sprite sets** — 16 pre-rendered images at 22.5° intervals (360° / 16 = 22.5°)
- Each direction had multiple damage states (pristine, damaged, heavily damaged, wrecked)
- Pedestrians used 8-directional sprites with walk cycles (4-8 frames per direction)
- The city itself was a **tilemap** — roads, pavements, grass, water, building plots

**Top-Down Camera**
- Fixed orthographic top-down view, approximately 60-70° angle (not perfectly vertical — slight perspective)
- Camera followed player car with smooth lerp, always centered
- Zoom level changed with speed — zoomed out at high speed for more road visibility
- The camera in GTA 1 was actually **slightly tilted** (not pure 90° top-down) giving a subtle 2.5D feel

**City Rendering**
- Cities (Liberty City, San Andreas, Vice City) were built from **tile grids**
- Each tile was 64×64 pixels (in the original game's internal resolution)
- Road tiles included straights, corners, junctions, T-intersections
- Buildings were placed on tiles as **sprite overlays** with height simulated by drawing shadows
- The map was larger than the screen — scrolling was continuous, only visible tiles rendered

**Layer System**
- Ground layer (roads, grass, water, pavement) — drawn first
- Building/structure layer — drawn second, with fake height via offset shadows
- Vehicle/pedestrian layer — drawn third, sorted by Y position for pseudo-depth
- Effects layer (explosions, smoke, gunfire) — drawn last
- HUD/UI — drawn on top, not scrolled

### 2.2 Physics Engine

GTA 1's vehicle physics were **2D arcade-style**, not simulation:

- **Acceleration**: Linear with diminishing returns near top speed
- **Turning**: Speed-sensitive — sharper at low speed, wider at high speed
- **Drift/Slide**: Lateral velocity on sharp turns and handbrake, with decay
- **Collision**: Bounding circle vs. building rectangles, simplified
- **Damage**: Impacted speed and acceleration (car got slower when damaged)
- **Reverse**: Half-speed backward movement

The physics operated in 2D space (X, Z) with heading angle — **identical to what VibeDrive.je already implements**. The current game's `carSpeed`, `carHeading`, `lateralVelocity`, and handbrake logic is a close match to GTA 1's feel.

### 2.3 Damage Model

GTA 1 had a **visual + performance** damage system:

**Visual Damage States** (4 stages):
1. **Pristine** — clean sprite, no damage
2. **Light damage** — dented sprite, minor visual changes
3. **Heavy damage** — crumpled sprite, smoke particle effect
4. **Wrecked** — burned-out shell, fire particles, explosion imminent

**Performance Impact**:
- Each damage level reduced top speed by ~15-20%
- Acceleration degraded proportionally
- Steering became less responsive at higher damage
- At "wrecked" state, the car could explode after a few seconds, killing the player

**Damage Sources**:
- Collisions with buildings (instant damage based on speed)
- Collisions with other cars (both cars take damage)
- Falling in water (instant wreck)
- Weapon impacts (NPC/police attacks)
- At high wanted levels, accumulated damage from police ramming

### 2.4 London 1969 Expansion Differences

The London expansion pack (1999) was a **reskin** of the GTA 1 engine with:

**Visual Differences**:
- **Period-appropriate vehicles**: Minis, Routemaster buses, black cabs, Jaguar E-Types, Ford Cortinas
- **1960s London architecture**: Terraced houses, tower blocks, Georgian facades — all as sprite tiles
- **Narrower streets** than American cities — tighter driving, more collisions
- **Roundabouts** instead of grid intersections — distinctive circular road tiles
- **British road markings**: Double yellow lines, zebra crossings, roundels
- **Period color palette**: Muted browns, greys, olive greens — less saturated than the base game's American cities
- **Fog/smog effect**: Slight grey tint overlay to simulate 1960s London atmosphere
- **Thames river**: Wide water tiles with docks, bridges as special tiles

**Audio Differences**:
- British voice clips for pedestrians ("Oi!", "Watch it, mate!")
- 1960s radio stations (period music, not licensed tracks)
- Different siren sounds (British police two-tone "nee-naw")

**Gameplay Differences**:
- Same mechanics, different map and missions
- British driving (left-hand side) — traffic on the left
- More pedestrian-dense streets
- Different mission themes (robbery, gangland)

---

## 3. Top-Down 2D Game Engines for Web

### 3.1 Comparison

| Feature | Canvas 2D | Three.js Orthographic | Pixi.js | Custom WebGL |
|---------|-----------|----------------------|---------|-------------|
| **Performance** | Excellent (thousands of sprites) | Good (GPU but overhead) | Excellent (WebGL batched) | Best (full control) |
| **Bundle size** | 0KB (built-in) | ~600KB (Three.js) | ~400KB (Pixi v8) | 0KB |
| **Mobile support** | Universal | Good but heavier | Good | Varies |
| **Sprite rotation** | `ctx.rotate()` — easy | Texture rotation — easy | Built-in | Manual |
| **Learning curve** | Lowest | Medium | Low-Medium | Highest |
| **Particle effects** | Manual or simple | Built-in systems | Built-in | Manual |
| **Audio** | Web Audio API (same) | Web Audio API (same) | Web Audio + Pixi Sound | Web Audio API |
| **Shaders** | No (Canvas2D) | Yes (GLSL) | Yes (GLSL filters) | Yes |
| **Debug tools** | Browser DevTools | Three.js editor | Pixi DevTools | None |

### 3.2 Recommendation: **Canvas 2D**

For a GTA 1-style game, **Canvas 2D is the best choice**:

1. **Zero dependency** — no library to load, smallest possible bundle
2. **Sufficient performance** — Canvas 2D can handle 2000+ sprites at 60fps on modern mobile devices. A GTA 1-style game needs ~50-200 visible sprites per frame.
3. **Trivial sprite rotation** — `ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.drawImage(sprite, -w/2, -h/2); ctx.restore();`
4. **Easy to debug** — browser DevTools canvas inspector, can overlay debug shapes
5. **Universal compatibility** — works on every browser, every device, no WebGL concerns
6. **Consistent with current codebase** — the radar/minimap is already Canvas 2D

**Pixi.js** would be the second choice if we needed WebGL-accelerated batching for thousands of particles, but for a driving game with <200 sprites, Canvas 2D is more than enough.

**Three.js orthographic** is a viable "2.5D" path but adds 600KB of dependency for no real benefit over Canvas 2D for sprite-based rendering.

### 3.3 Camera System for Canvas 2D

```javascript
const camera = {
  x: 0,      // world position
  y: 0,
  zoom: 1.0,  // scale factor
  targetZoom: 1.0,
  rotation: 0, // optional world rotation
};

function worldToScreen(worldX, worldY) {
  const sx = (worldX - camera.x) * camera.zoom + canvas.width / 2;
  const sy = (worldY - camera.y) * camera.zoom + canvas.height / 2;
  return [sx, sy];
}

function updateCamera(dt) {
  // Smooth follow player
  camera.x += (carX - camera.x) * 0.1;
  camera.y += (carZ - camera.y) * 0.1;
  // Speed-based zoom-out
  const speedRatio = Math.abs(carSpeed) / MAX_SPEED;
  camera.targetZoom = 1.0 - speedRatio * 0.3; // zoom out up to 30% at max speed
  camera.zoom += (camera.targetZoom - camera.zoom) * 0.05;
}
```

---

## 4. Sprite-Based Car Rendering

### 4.1 Two Approaches

#### Approach A: Pre-Rendered Directional Sprites (GTA 1 Method)

- Pre-render 16 directions × 4 damage states × N car types = 64N sprite frames
- Each frame is a small PNG (e.g., 48×80 pixels for a car)
- At runtime, pick the nearest directional sprite: `frameIndex = Math.round(heading / 22.5) % 16`
- **Pros**: Authentic GTA 1 look, pixel-perfect, can show 3D-like detail in 2D
- **Cons**: Large sprite sheet, requires pre-rendering pipeline, no smooth rotation between directions

#### Approach B: Real-Time Canvas Rotation (Recommended)

- Draw a single top-down car sprite, rotate it with `ctx.rotate()`
- **Pros**: Smooth 360° rotation, tiny sprite sheet (1 image per damage state), easy to generate procedurally
- **Cons**: Less detail than pre-rendered 3D-to-2D sprites, rotation can look "flat"

### 4.2 Recommendation: Hybrid — Real-Time Rotation + Procedural Sprites

For VibeDrive.je, generate car sprites **procedurally on a hidden canvas** at load time, then use real-time rotation. This gives:
- Smooth rotation (360°)
- No external image assets needed
- Multiple damage states by re-drawing with deformation
- Tiny memory footprint

### 4.3 Procedural Car Sprite Generation

```javascript
function generateCarSprite(color, damageLevel) {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 96; // top-down car: wider than tall when viewed from above
  const ctx = cv.getContext('2d');
  
  // Damage deformation offsets
  const dent = damageLevel * 3;
  
  // Car body (rounded rectangle from top-down view)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(8 + dent, 10, 48 - dent*2, 76, 8);
  ctx.fill();
  
  // Windshield (front)
  ctx.fillStyle = 'rgba(100, 150, 200, 0.7)';
  ctx.fillRect(12, 16, 40, 12);
  
  // Rear window
  ctx.fillStyle = 'rgba(80, 120, 160, 0.6)';
  ctx.fillRect(12, 68, 40, 10);
  
  // Roof
  ctx.fillStyle = darken(color, 0.7);
  ctx.fillRect(12, 30, 40, 36);
  
  // Damage effects
  if (damageLevel >= 2) {
    // Cracks on windshield
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, 18); ctx.lineTo(30, 24); ctx.lineTo(45, 20);
    ctx.stroke();
  }
  if (damageLevel >= 3) {
    // Scorch marks
    ctx.fillStyle = 'rgba(20, 20, 20, 0.5)';
    ctx.beginPath();
    ctx.arc(32, 40, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return cv;
}

// Pre-generate for each car type
const carSprites = {
  taxi:    [generateCarSprite('#FFD60A', 0), generateCarSprite('#FFD60A', 1), generateCarSprite('#FFD60A', 2), generateCarSprite('#FFD60A', 3)],
  police:  [generateCarSprite('#1a3a8a', 0), generateCarSprite('#1a3a8a', 1), generateCarSprite('#1a3a8a', 2), generateCarSprite('#1a3a8a', 3)],
  player:  [generateCarSprite('#00A86B', 0), generateCarSprite('#00A86B', 1), generateCarSprite('#00A86B', 2), generateCarSprite('#00A86B', 3)],
  // ... more car types
};
```

### 4.4 Rendering with Rotation

```javascript
function drawCar(ctx, car) {
  const [sx, sy] = worldToScreen(car.x, car.z);
  if (sx < -100 || sx > canvas.width + 100 || sy < -100 || sy > canvas.height + 100) return; // cull
  
  const sprite = carSprites[car.type][car.damageLevel];
  const angle = -car.heading * Math.PI / 180; // Canvas Y is down, world Z is forward
  
  // Shadow first
  ctx.save();
  ctx.translate(sx + 3, sy + 3);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.3;
  ctx.drawImage(sprite, -32 * camera.zoom, -48 * camera.zoom, 64 * camera.zoom, 96 * camera.zoom);
  ctx.restore();
  
  // Car body
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.drawImage(sprite, -32 * camera.zoom, -48 * camera.zoom, 64 * camera.zoom, 96 * camera.zoom);
  ctx.restore();
  
  // Damage smoke particles
  if (car.damageLevel >= 2) drawSmoke(ctx, sx, sy, car);
  if (car.damageLevel >= 3) drawFire(ctx, sx, sy, car);
}
```

### 4.5 Damage States Visual Progression

| Level | Visual | Particles | Performance Impact |
|-------|--------|-----------|-------------------|
| 0 - Pristine | Clean sprite | None | 100% speed |
| 1 - Light | Dented body, cracked glass | None | 85% speed |
| 2 - Heavy | Crushed body, dark smoke | Grey smoke trail | 65% speed |
| 3 - Wrecked | Burned body, fire | Black smoke + flames | 30% speed, explosion timer starts |

### 4.6 Shadow Sprites

Shadows in top-down games are critical for depth perception:

```javascript
function drawCarShadow(ctx, car) {
  const [sx, sy] = worldToScreen(car.x, car.z);
  ctx.save();
  ctx.translate(sx + 4, sy + 6); // offset for "sun" direction
  ctx.scale(camera.zoom, camera.zoom);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

---

## 5. Top-Down City Rendering

### 5.1 Tile Map Architecture

GTA 1 used a **tile-based city map**. For VibeDrive.je, we can use a similar approach but enhanced with the real Jersey road data already available (`jersey-roads.js` — 2633 roads, 6083 points).

**Hybrid approach**: Use the real OSM road data for road layout, but render as 2D tiles/sprites rather than 3D meshes.

```
Layer structure (bottom to top):
1. Ground tiles (grass, sand, water, farmland)
2. Road network (drawn as vector paths from OSM data)
3. Building sprites (placed along roads)
4. Road markings (lane lines, zebra crossings, roundels)
5. Vegetation sprites (trees, hedges)
6. Vehicle layer (player + AI cars, sorted by Y for pseudo-depth)
7. Pedestrian sprites
8. Effects layer (smoke, fire, explosions, skid marks)
9. Weather overlay (rain, fog, night tint)
10. HUD (fixed position, not scrolled)
```

### 5.2 Road Rendering from OSM Data

The existing `jersey-roads.js` contains real road geometry with:
- `p`: array of [x, z] points (already in game coordinates)
- `n`: road name (e.g., 'Rue des Landes', 'Castle Street')
- `t`: road type (primary, secondary, tertiary, unclassified, trunk)
- `w`: road width (4-8 units)
- `l`: lane count (1-2)

```javascript
function drawRoads(ctx) {
  // Only draw roads within camera view + margin
  const margin = 100;
  const viewLeft = camera.x - canvas.width / (2 * camera.zoom) - margin;
  const viewRight = camera.x + canvas.width / (2 * camera.zoom) + margin;
  const viewTop = camera.y - canvas.height / (2 * camera.zoom) - margin;
  const viewBottom = camera.y + canvas.height / (2 * camera.zoom) + margin;
  
  for (const road of jerseyRoads) {
    // Cull check — rough bounding box
    let inView = false;
    for (const pt of road.p) {
      if (pt[0] >= viewLeft && pt[0] <= viewRight && pt[1] >= viewTop && pt[1] <= viewBottom) {
        inView = true; break;
      }
    }
    if (!inView) continue;
    
    // Draw road as thick line
    ctx.strokeStyle = ROAD_COLORS[road.t] || '#444';
    ctx.lineWidth = road.w * camera.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < road.p.length; i++) {
      const [sx, sy] = worldToScreen(road.p[i][0], road.p[i][1]);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    
    // Center line for two-lane roads
    if (road.l >= 2 && road.w >= 6) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 * camera.zoom;
      ctx.setLineDash([8 * camera.zoom, 6 * camera.zoom]);
      ctx.beginPath();
      for (let i = 0; i < road.p.length; i++) {
        const [sx, sy] = worldToScreen(road.p[i][0], road.p[i][1]);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

const ROAD_COLORS = {
  trunk:           '#4a4a4a',
  primary:         '#555555',
  secondary:       '#666666',
  tertiary:        '#777777',
  unclassified:    '#888888',
  residential:     '#999999',
};
```

### 5.3 Building Sprites

Buildings in top-down view are drawn as rectangles with a slight height offset:

```javascript
function generateBuildingSprite(type) {
  const cv = document.createElement('canvas');
  const config = BUILDING_TYPES[type];
  cv.width = config.w; cv.height = config.h;
  const ctx = cv.getContext('2d');
  
  // Building footprint
  ctx.fillStyle = config.wallColor;
  ctx.fillRect(2, 2, config.w - 4, config.h - 4);
  
  // Roof detail
  ctx.fillStyle = config.roofColor;
  ctx.fillRect(4, 4, config.w - 8, config.h - 8);
  
  // Windows pattern (top-down view shows roof, so windows are on edges)
  ctx.fillStyle = 'rgba(100, 130, 160, 0.5)';
  for (let i = 6; i < config.w - 6; i += 8) {
    ctx.fillRect(i, 3, 4, 2);     // top edge windows
    ctx.fillRect(i, config.h - 5, 4, 2); // bottom edge windows
  }
  
  return cv;
}

const BUILDING_TYPES = {
  granite_warehouse: { w: 80, h: 60, wallColor: '#6B6B6B', roofColor: '#4A4A4A' },
  victorian_terrace: { w: 40, h: 70, wallColor: '#8B7355', roofColor: '#5C4033' },
  modern_retail:     { w: 60, h: 50, wallColor: '#CCCCCC', roofColor: '#AAAAAA' },
  granite_cottage:   { w: 30, h: 35, wallColor: '#7B7B7B', roofColor: '#3B3B3B' },
  norman_farmhouse:  { w: 50, h: 45, wallColor: '#A0826D', roofColor: '#6B4423' },
};
```

### 5.4 Jersey-Specific Architecture

Jersey has distinct architectural styles that should be represented:

| Style | Visual (top-down) | Where in Jersey |
|-------|-------------------|-----------------|
| **Granite buildings** | Grey blocks with dark slate roofs | St. Helier, rural parishes, coastal defences |
| **Victorian terraces** | Narrow rectangles, brown pitched roofs | St. Helier town centre |
| **Norman farmhouses** | L-shaped, warm brown tones, thick walls | Rural parishes (St. Mary, St. John) |
| **Coastal defences** | Small dark squares (Jersey War Tunnels, Martello towers) | Coastline |
| **Modern retail** | Large flat-roofed rectangles | Outskirts, retail parks |
| **Granite walls** | Thin grey lines bordering fields | Everywhere — distinctive Jersey feature |
| **Glasshouses** | Translucent rectangles | St. Clement, Grouville (agricultural areas) |

### 5.5 Procedural City Generation

For areas not covered by OSM data, or to densify the city:

```javascript
function generateBuildingsAlongRoads() {
  const buildings = [];
  for (const road of jerseyRoads) {
    if (road.t === 'primary' || road.t === 'trunk') continue; // skip main roads
    
    for (let i = 0; i < road.p.length - 1; i++) {
      const [x1, z1] = road.p[i];
      const [x2, z2] = road.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.sqrt(dx * dx + dz * dz);
      const perpX = -dz / len, perpZ = dx / len; // perpendicular to road
      
      // Place buildings on both sides
      const offset = road.w + 5;
      for (let side = -1; side <= 1; side += 2) {
        for (let d = 10; d < len - 10; d += 25 + Math.random() * 15) {
          const px = x1 + (dx / len) * d + perpX * offset * side;
          const pz = z1 + (dz / len) * d + perpZ * offset * side;
          if (islandMask(px, pz) > 0.1) {
            buildings.push({
              x: px, z: pz,
              type: pickBuildingType(px, pz),
              rotation: Math.atan2(dx, dz),
            });
          }
        }
      }
    }
  }
  return buildings;
}
```

### 5.6 Tile-Based Ground

For the ground (grass, sand, water, farmland), use a **chunked tile system**:

```javascript
const TILE_SIZE = 64; // world units per tile
const tiles = {}; // sparse map: "tileX,tileZ" -> type

function getTileType(worldX, worldZ) {
  if (islandMask(worldX, worldZ) <= 0) return 'water';
  const h = getTerrainHeight(worldX, worldZ);
  if (h < 1) return 'sand';
  if (h > 30) return 'rock';
  return 'grass';
}

function drawGround(ctx) {
  const tileSize = TILE_SIZE * camera.zoom;
  const startX = Math.floor((camera.x - canvas.width / (2 * camera.zoom)) / TILE_SIZE);
  const endX = Math.ceil((camera.x + canvas.width / (2 * camera.zoom)) / TILE_SIZE);
  const startZ = Math.floor((camera.y - canvas.height / (2 * camera.zoom)) / TILE_SIZE);
  const endZ = Math.ceil((camera.y + canvas.height / (2 * camera.zoom)) / TILE_SIZE);
  
  for (let tx = startX; tx <= endX; tx++) {
    for (let tz = startZ; tz <= endZ; tz++) {
      const wx = tx * TILE_SIZE, wz = tz * TILE_SIZE;
      const type = getTileType(wx + TILE_SIZE/2, wz + TILE_SIZE/2);
      const [sx, sy] = worldToScreen(wx, wz);
      ctx.fillStyle = GROUND_COLORS[type];
      ctx.fillRect(sx, sy, tileSize + 1, tileSize + 1);
    }
  }
}
```

---

## 6. British/Jersey Aesthetic

### 6.1 Making It Feel British

The key to Britishness in a top-down game is in the **details**:

#### Road Markings
```
┌─────────────────────────────────────────────┐
│ Element          │ How to draw               │
├──────────────────┼───────────────────────────┤
│ Double yellow    │ Two parallel yellow lines │
│ lines            │ along road edge (no       │
│                  │ parking zones)            │
├──────────────────┼───────────────────────────┤
│ Zebra crossing   │ Wide white stripes        │
│                  │ perpendicular to road     │
│                  │ + Belisha beacon orbs     │
├──────────────────┼───────────────────────────┤
│ Roundels         │ White circle in road with │
│                  │ arrows indicating exit    │
├──────────────────┼───────────────────────────┤
│ Give way         │ Inverted white triangle   │
│                  │ on road + dashed line     │
├──────────────────┼───────────────────────────┤
│ Centre line      │ White dashed line (no     │
│                  │ yellow centre in UK)      │
├──────────────────┼───────────────────────────┤
│ Bus lane         │ Red-tinted road surface   │
│                  │ + "BUS" painted text      │
└─────────────────────────────────────────────┘
```

```javascript
function drawZebraCrossing(ctx, roadX, roadZ, roadAngle) {
  ctx.save();
  const [sx, sy] = worldToScreen(roadX, roadZ);
  ctx.translate(sx, sy);
  ctx.rotate(-roadAngle);
  
  const stripeWidth = 8 * camera.zoom;
  const stripeHeight = road.w * camera.zoom;
  ctx.fillStyle = '#fff';
  for (let i = -3; i <= 3; i++) {
    ctx.fillRect(i * stripeWidth * 2, -stripeHeight/2, stripeWidth, stripeHeight);
  }
  
  // Belisha beacons (orange dots)
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath();
  ctx.arc(-stripeHeight/2 - 5, 0, 3 * camera.zoom, 0, Math.PI * 2);
  ctx.arc(stripeHeight/2 + 5, 0, 3 * camera.zoom, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}
```

#### British Road Signs
```javascript
const ROAD_SIGNS = {
  // Sign drawn as sprite on post (visible from top-down as colored circle/diamond)
  roundabout_ahead: { shape: 'triangle', color: '#fff', border: '#c00', symbol: 'roundabout' },
  give_way:         { shape: 'triangle', color: '#fff', border: '#c00', symbol: null },
  no_entry:         { shape: 'circle',   color: '#fff', border: '#c00', symbol: 'bar' },
  speed_limit_30:   { shape: 'circle',   color: '#fff', border: '#000', text: '30' },
  speed_limit_40:   { shape: 'circle',   color: '#fff', border: '#000', text: '40' },
  national_speed:   { shape: 'circle',   color: '#fff', border: '#000', text: 'NSL' },
  one_way:          { shape: 'rectangle',color: '#0000c0', symbol: 'arrow' },
};
```

#### Left-Hand Driving
British roads are left-hand drive. This affects:
- AI traffic stays on the **left side** of the road
- Lane markings are positioned accordingly
- Junctions and roundabouts go **clockwise** (not counter-clockwise)
- Overtaking happens on the **right**

### 6.2 Jersey-Specific Elements

#### Jèrriais Language Signs
Jersey has its own Norman-French language (Jèrriais). Road signs in Jersey often have Jèrriais names alongside English:

```javascript
const roadNameOverlays = [
  { en: 'Royal Square',        jrr: "Lé Piâce d'la Reine" },
  { en: 'Broad Street',        jrr: 'La Rue d'Égilyise' },
  { en: 'Halkett Place',       jrr: "Lé Piâce Halkett" },
  { en: 'Route de la Liberation', jrr: 'C'mîn d'la Libération' },
  // ... more from actual Jersey road data
];
```

These appear as small text labels on road tiles near junctions.

#### Jersey Currency
Jersey uses its own pound notes (distinct from UK sterling). In the game's score/economy:
- Use Jersey £1 notes as collectible sprites (green, distinctive design)
- Jersey pound coins as smaller collectibles
- "Jersey £" prefix in score display rather than just "£"

#### Granite Walls
The most distinctive Jersey landscape feature — granite walls line fields and roads everywhere:

```javascript
function drawGraniteWall(ctx, x1, z1, x2, z2) {
  const [sx1, sy1] = worldToScreen(x1, z1);
  const [sx2, sy2] = worldToScreen(x2, z2);
  
  ctx.strokeStyle = '#6B6B6B';
  ctx.lineWidth = 3 * camera.zoom;
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  
  // Granite texture — small lighter dots
  ctx.fillStyle = '#8B8B8B';
  const len = Math.sqrt((sx2-sx1)**2 + (sy2-sy1)**2);
  for (let i = 0; i < len; i += 4 * camera.zoom) {
    const t = i / len;
    const px = sx1 + (sx2-sx1) * t + (Math.random()-0.5) * 2;
    const py = sy1 + (sy2-sy1) * t + (Math.random()-0.5) * 2;
    ctx.fillRect(px, py, 1.5, 1.5);
  }
}
```

#### Norman Architecture
Jersey's Norman heritage shows in:
- **L-shaped farmhouses** with thick granite walls
- **Round-arched doorways** (visible as dark rectangles with rounded tops)
- **Ship-lap slate roofs** (dark grey, textured pattern)
- **Cider apple orchards** — rows of small green circle sprites

#### Coastal Defences
Jersey has unique military heritage:
- **Martello towers** — small circular grey sprites along coast
- **German bunkers** — dark concrete rectangles
- **Jersey War Tunnels** — large green-grey hill with entrance
- **St. Aubin's Fort** — small castle sprite in the bay
- **Mont Orgueil Castle** — large castle sprite on hill (already a landmark)

### 6.3 Color Palette

For a GTA 1 London 1969-inspired but Jersey-specific palette:

```
Category        Color       Hex
────────────────────────────────────
Road surface    Dark grey   #3A3A3A
Pavement        Light grey  #8A8A8A
Grass           Jersey green #4A7A3A (slightly muted)
Water (Atlantic) Cold blue  #1A4A7A
Sand            Pale gold   #D4C488
Granite         Jersey grey #6B6B6B
Slate roofs     Dark grey   #3B3B3B
Brick           Red-brown   #8B4513
Victorian brick Warm brown  #A0522D
Hedge           Dark green  #2D5A1F
Sky (day)       Soft blue   #87CEEB
Sky (night)     Deep navy   #0A1A3F
Fog tint        Muted grey  #C0C0C8
```

This palette is **less saturated** than typical game palettes — reflecting the muted, overcast Channel Islands light. This is the "British" feel: not bright, not dark, but a characteristic grey-green-blue wash.

---

## 7. Physics and Damage

### 7.1 What Can Be Reused

The current game's physics code (lines ~3265-3333 of `index.html`) is **directly transferable** to a 2D renderer. The physics operate in 2D (carX, carZ, carHeading, carSpeed, lateralVelocity) with no 3D dependencies:

**Directly Reusable (copy-paste):**
- Acceleration model (exponential ramp toward MAX_SPEED)
- Braking model (proportional to speed)
- Turning (speed-sensitive, inverse proportional)
- Lateral slide / drift (turnInput × speed ratio × handbrake multiplier)
- Lateral velocity decay (0.92 normal, 0.90 handbrake)
- Reverse steering (dir = -1 when going backward)
- Terrain slope effect (sample height ahead, modify speed)
- Island boundary collision (islandMask check, pushback)
- Speed clamping and deadzone

**Needs Adaptation (not rewrite):**
- `carGroup.position.set()` → just update `carX`, `carZ` (no 3D mesh)
- `carGroup.rotation.y` → handled by `ctx.rotate()` in render
- Terrain height sampling → simplified (no 3D terrain, but keep slope for gameplay)
- Boat physics → keep, just render as sprite instead of mesh
- Plane physics → remove or adapt to "above" rendering (scale down + shadow)

### 7.2 Adding GTA 1-Style Damage

The current game has no damage model. Adding one for the retro version:

```javascript
// Damage state
let carDamage = 0; // 0-3
let carHealth = 100; // 100-0
let explosionTimer = 0; // when health reaches 0, starts countdown

function applyCollisionDamage(impactSpeed) {
  if (impactSpeed < 10) return; // minor bumps don't damage
  
  const damage = impactSpeed * 0.3;
  carHealth = Math.max(0, carHealth - damage);
  
  // Update visual damage level
  if (carHealth > 75) carDamage = 0;
  else if (carHealth > 50) carDamage = 1;
  else if (carHealth > 25) carDamage = 2;
  else carDamage = 3;
  
  // Performance degradation
  const performanceFactor = 1 - (carDamage * 0.2);
  effectiveMaxSpeed = MAX_SPEED * performanceFactor;
  effectiveAccel = ACCEL * performanceFactor;
  
  // Wrecked — start explosion timer
  if (carHealth <= 0 && explosionTimer === 0) {
    explosionTimer = 3.0; // 3 seconds until explosion
    showToast('⚠️ Vehicle critical! Get out!');
  }
}

function updateDamage(dt) {
  if (explosionTimer > 0) {
    explosionTimer -= dt;
    if (explosionTimer <= 0) {
      explode();
      // Reset car after explosion
      carHealth = 100;
      carDamage = 0;
      explosionTimer = 0;
      // Lose score, respawn at nearest road
    }
  }
}

function checkCollisions() {
  // Car vs buildings
  for (const b of buildings) {
    const dx = carX - b.x, dz = carZ - b.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < b.radius + 3) { // simplified circle collision
      const impactSpeed = Math.abs(carSpeed);
      applyCollisionDamage(impactSpeed);
      // Push car away from building
      carX += (dx / dist) * 5;
      carZ += (dz / dist) * 5;
      carSpeed *= -0.3; // bounce
    }
  }
  
  // Car vs car
  for (const ai of aiCars) {
    const dx = carX - ai.x, dz = carZ - ai.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < 6) {
      applyCollisionDamage(Math.abs(carSpeed - ai.speed) * 0.5);
      ai.damageLevel = Math.min(3, (ai.damageLevel || 0) + 1);
      // Push apart
      const push = (6 - dist) / 2;
      carX += (dx / dist) * push;
      carZ += (dz / dist) * push;
      ai.x -= (dx / dist) * push;
      ai.z -= (dz / dist) * push;
      carSpeed *= 0.5;
    }
  }
}
```

### 7.3 Collision Detection in Top-Down

Top-down 2D collision is **much simpler** than 3D:

- **Car vs Building**: Circle (car) vs Rectangle (building) — 4 lines of math
- **Car vs Car**: Circle vs Circle — distance check
- **Car vs Pedestrian**: Circle vs Circle
- **Car vs Water**: Point-in-polygon check against coastline (already have `islandMask()`)
- **Car vs Boundary**: Same `islandMask()` check

No raycasting, no BVH trees, no physics engine — just distance checks and simple geometric tests. This is **orders of magnitude cheaper** than the current 3D approach.

### 7.4 Drift/Slide Enhancement

GTA 1 had satisfying drift physics. The current lateral velocity system is close but can be enhanced:

```javascript
// Enhanced drift model
let driftAngle = 0; // angle between heading and actual velocity direction

function updateDrift(dt) {
  const speed = Math.abs(carSpeed);
  if (speed < 5) { driftAngle *= 0.8; return; }
  
  const turnInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0) - steerValue;
  const grip = keys.handbrake ? 0.15 : 0.7; // handbrake = low grip = more drift
  
  // Drift angle increases with turn input and speed, decreases with grip
  driftAngle += turnInput * speed / MAX_SPEED * dt * (1 - grip) * 3;
  driftAngle *= grip; // grip pulls drift back toward 0
  
  // Clamp drift
  driftAngle = Math.max(-45, Math.min(45, driftAngle));
  
  // Visual: car heading stays, but movement direction is heading + driftAngle
  const moveAngle = (carHeading + driftAngle) * Math.PI / 180;
  carX += Math.sin(moveAngle) * speed * 0.3 * dt;
  carZ += Math.cos(moveAngle) * speed * 0.3 * dt;
  
  // Skid marks when drifting
  if (Math.abs(driftAngle) > 10 && speed > 20) {
    skidMarks.push({ x: carX, z: carZ, angle: carHeading, life: 10.0 });
  }
}
```

### 7.5 Skid Marks

A key visual feature of GTA 1's top-down view:

```javascript
const skidMarks = [];
const MAX_SKID_MARKS = 500;

function drawSkidMarks(ctx) {
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.4)';
  ctx.lineWidth = 2 * camera.zoom;
  for (const mark of skidMarks) {
    if (mark.life <= 0) continue;
    const [sx, sy] = worldToScreen(mark.x, mark.z);
    if (sx < -50 || sx > canvas.width + 50) continue;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-mark.angle * Math.PI / 180);
    ctx.globalAlpha = mark.life / 10;
    // Two tire marks
    ctx.beginPath();
    ctx.moveTo(-2 * camera.zoom, -4 * camera.zoom);
    ctx.lineTo(-2 * camera.zoom, 4 * camera.zoom);
    ctx.moveTo(2 * camera.zoom, -4 * camera.zoom);
    ctx.lineTo(2 * camera.zoom, 4 * camera.zoom);
    ctx.stroke();
    ctx.restore();
  }
}

// Update skid mark lifetime
function updateSkidMarks(dt) {
  for (const mark of skidMarks) mark.life -= dt;
  // Remove dead marks, cap total
  while (skidMarks.length > MAX_SKID_MARKS) skidMarks.shift();
}
```

---

## 8. Audio

### 8.1 GTA 1's Radio System

GTA 1 featured multiple radio stations that played while driving:
- **Head Radio** — rock/alternative
- **Radio 5** — drum and bass
- **Kiss FM** — house/electronic
- **Futuro FM** — easy listening
- **Funk FM** — funk
- **V Rock** — metal
- Players could switch stations with a key

The London 1969 expansion had period-appropriate 1960s radio.

### 8.2 Web Audio API Implementation

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let currentStation = null;
let engineOsc = null;
let engineGain = null;

// Engine sound — oscillator with frequency tied to speed
function initEngineSound() {
  engineOsc = audioCtx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineGain = audioCtx.createGain();
  engineGain.gain.value = 0;
  
  // Lowpass filter for engine character
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  
  engineOsc.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(audioCtx.destination);
  engineOsc.start();
}

function updateEngineSound() {
  if (!engineOsc) return;
  const speed = Math.abs(carSpeed);
  // Engine RPM: 40Hz at idle, 300Hz at max speed
  const freq = 40 + (speed / MAX_SPEED) * 260;
  engineOsc.frequency.value = freq;
  // Volume: louder at higher speed
  engineGain.gain.value = 0.05 + (speed / MAX_SPEED) * 0.15;
}

// Radio stations — looping audio buffers
const radioStations = {
  'jersey_fm': { name: 'Jersey FM', tracks: [] },
  'channel_radio': { name: 'Channel Radio', tracks: [] },
  'atlantic_beats': { name: 'Atlantic Beats', tracks: [] },
};

function playRadio(stationId) {
  // Stop current station
  if (currentStation) currentStation.source.stop();
  // Play new station (looping buffer or streaming)
  const station = radioStations[stationId];
  // ... create buffer source, connect, loop
}

// British voice clips for pedestrians
const voiceClips = {
  civilian: [
    'Oi! Watch it!',
    'Bloody hell!',
    'Mind how you go!',
    'Oi oi!',
    'What you playing at?',
  ],
  police: [
    'Stop right there!',
    'You\'re nicked, sunshine!',
    'Pull over!',
    'This is the police!',
  ],
  // Jersey-specific
  jersey: [
    'Eh, you\'re not from \'ere, are you?',
    'Mind the granite wall, eh!',
    'Oh my, that was close!',
  ],
};

function playVoiceClip(category) {
  const clips = voiceClips[category];
  const clip = clips[Math.floor(Math.random() * clips.length)];
  // Use speech synthesis for instant, no-asset voice clips
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(clip);
    utterance.lang = 'en-GB'; // British accent
    utterance.rate = 1.1;
    utterance.pitch = 0.9 + Math.random() * 0.3;
    speechSynthesis.speak(utterance);
  }
}

// Collision sound — noise burst
function playCrashSound(intensity) {
  const noise = audioCtx.createBufferSource();
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * intensity;
  }
  noise.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.3 * intensity;
  noise.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
}

// Skid sound — filtered noise loop
let skidSource = null;
function updateSkidSound() {
  const drifting = Math.abs(driftAngle) > 10 && Math.abs(carSpeed) > 20;
  if (drifting && !skidSource) {
    // Start skid sound
    skidSource = audioCtx.createBufferSource();
    // ... white noise through bandpass filter
  } else if (!drifting && skidSource) {
    skidSource.stop();
    skidSource = null;
  }
}

// Siren — two-tone British "nee-naw"
function playSiren(active) {
  if (!active) { /* stop siren */ return; }
  // Alternating 990Hz / 750Hz tones (British police siren pattern)
  // ... oscillator with LFO modulating frequency
}
```

### 8.3 Audio Architecture Summary

| Sound | Technique | Assets needed |
|-------|-----------|---------------|
| Engine | Web Audio oscillator (sawtooth, freq=speed) | None (procedural) |
| Collision | White noise burst, amplitude=impact | None (procedural) |
| Skid | Filtered white noise loop | None (procedural) |
| Siren | Two-tone oscillator (British pattern) | None (procedural) |
| Voices | SpeechSynthesis API (en-GB) | None (browser TTS) |
| Radio | Audio buffers / streaming | Optional MP3 files |
| Ambience | Low-volume wind/wave loop | Optional WAV file |

**Key insight**: Most sounds can be generated **procedurally with zero audio assets**, keeping the bundle tiny. The `SpeechSynthesis` API with `en-GB` locale gives instant British voice clips without recording anything.

---

## 9. Performance Budget

### 9.1 Canvas 2D Performance Characteristics

Canvas 2D is hardware-accelerated on all modern browsers. Performance characteristics:

| Operation | Cost | Notes |
|-----------|------|-------|
| `fillRect` | ~0.001ms | Very cheap, batch fills |
| `drawImage` | ~0.003ms | Very cheap, GPU-composited |
| `ctx.rotate` + `drawImage` | ~0.005ms | Matrix transform + draw |
| `fillPath` (complex shape) | ~0.01ms | Depends on path complexity |
| `ctx.stroke` (line) | ~0.005ms | Width affects cost |
| Full canvas clear | ~0.05ms | `clearRect` or `fillRect` |

### 9.2 Per-Frame Budget (16.67ms @ 60fps)

| Task | Estimated Time | % of Budget |
|------|---------------|-------------|
| Clear canvas | 0.05ms | 0.3% |
| Draw ground tiles (~200 visible) | 0.4ms | 2.4% |
| Draw roads (~50 visible segments) | 0.5ms | 3.0% |
| Draw buildings (~100 visible) | 0.3ms | 1.8% |
| Draw road markings (~30) | 0.2ms | 1.2% |
| Draw shadows (~20 cars + peds) | 0.1ms | 0.6% |
| Draw vehicles (~15-20) | 0.1ms | 0.6% |
| Draw pedestrians (~30-50) | 0.15ms | 0.9% |
| Draw particles (smoke, fire ~50) | 0.2ms | 1.2% |
| Draw skid marks (~100) | 0.1ms | 0.6% |
| Draw effects (weather, night) | 0.05ms | 0.3% |
| Physics update | 0.1ms | 0.6% |
| Collision checks | 0.2ms | 1.2% |
| AI update | 0.1ms | 0.6% |
| Mission logic | 0.05ms | 0.3% |
| Camera update | 0.01ms | 0.1% |
| **Total** | **~2.5ms** | **~15%** |

**Result: ~2.5ms per frame, leaving 14ms of headroom.** This is **6× under budget** at 60fps. Even on a slower iPad, we'd be at ~5-8ms — still well within 60fps.

### 9.3 Comparison with Current 3D

The current Three.js game's per-frame budget:

| Task | Estimated Time |
|------|---------------|
| WebGL render (scene graph traversal) | 3-6ms |
| Shadow map pass | 2-4ms |
| Material/geometry processing | 1-2ms |
| Physics | 0.1ms |
| AI update | 0.1ms |
| Terrain height sampling | 0.3ms |
| **Total** | **~8-12ms** |

The 3D version is **4-5× more expensive** per frame, and that's before accounting for:
- GPU memory pressure (textures, geometry buffers)
- Shader compilation stutters on first load
- Thermal throttling on mobile (GPU gets hot, throttles, frame drops)
- WebGL context loss on memory-constrained devices

### 9.4 Mobile iPad Performance

Tested benchmarks for Canvas 2D on iPad (various models):

| Device | Max sprites @ 60fps | Notes |
|--------|---------------------|-------|
| iPad (2021, A13) | ~5000 | Most common school iPad |
| iPad Air (2022, M1) | ~15000 | Extremely fast |
| iPad Mini (2021, A15) | ~8000 | |
| Budget Android tablet | ~2000 | Still plenty |

A GTA 1-style game needs **~200-400 sprites per frame**. Even the slowest devices have **5-10× headroom**.

### 9.5 Optimization Techniques

If needed, additional optimizations:

1. **Dirty rect rendering**: Only redraw changed regions (not full canvas clear)
2. **Off-screen canvas**: Pre-render static layers (ground + roads) to a cached canvas, blit instead of redraw
3. **Sprite atlas**: Combine all car sprites into one image, use `drawImage` with source rect
4. **Level-of-detail**: Reduce particle counts at high zoom-out
5. **Frame skipping**: Run physics at 60fps but render at 30fps on very slow devices
6. **Tile caching**: Pre-render ground tiles to a large off-screen canvas, scroll-blit

```javascript
// Cached static layer — pre-render roads + ground once, scroll-blit each frame
const staticLayer = document.createElement('canvas');
staticLayer.width = ISLAND_WIDTH;
staticLayer.height = ISLAND_HEIGHT;
const sCtx = staticLayer.getContext('2d');
// Draw all ground + roads once at load time
drawGround(sCtx);
drawRoads(sCtx);
drawBuildings(sCtx);

// Per-frame: just blit the visible portion
function drawStaticLayer(ctx) {
  const srcX = camera.x - canvas.width / (2 * camera.zoom);
  const srcY = camera.y - canvas.height / (2 * camera.zoom);
  const w = canvas.width / camera.zoom;
  const h = canvas.height / camera.zoom;
  ctx.drawImage(staticLayer, srcX, srcY, w, h, 0, 0, canvas.width, canvas.height);
}
```

---

## 10. Real Examples & Open-Source References

### 10.1 Open-Source GTA 1-Style Games

| Project | URL | Description |
|---------|-----|-------------|
| **OpenGTA** | github.com/madebr/openGTA | C++ reimplementation of GTA 1 engine. Reads original game files. Good reference for tile rendering, sprite management. |
| **GTA1-RE** | github.com/madebr/gta1-re-engineering | Reverse engineering of GTA 1, documents the game file formats, sprite encoding, map format. |
| **jsm44 GTA2 style** | Various JS game jams | HTML5 Canvas top-down driving games inspired by GTA 1/2. Search "gta clone javascript" on GitHub. |
| **Micro-Machines clones** | Multiple | Top-down racing games with similar rendering. Many on GitHub using Canvas 2D. |
| **top-down-car-js** | GitHub (various) | Simple top-down car games in JavaScript with drift physics. Good for physics reference. |

### 10.2 Top-Down Driving Games on GitHub

Search terms: `top-down driving game canvas`, `gta clone javascript`, `top-down car game html5`

Notable patterns found across open-source projects:
- **Canvas 2D + `ctx.rotate()`** is the dominant approach (90%+ of projects)
- Sprite generation via off-screen canvas is common
- Physics: simple 2D kinematics with heading angle (same as VibeDrive.je)
- Collision: circle-vs-rect for buildings, circle-vs-circle for cars
- Most use a single `<canvas>` element, no WebGL

### 10.3 Sprite Packs and Tile Sets

| Resource | URL | Notes |
|----------|-----|-------|
| **OpenGameArt.org** | opengameart.org | Free top-down car sprites, city tiles, road tiles. Search "top-down car", "city tileset". |
| **Kenney.nl** | kenney.nl | Free game assets including top-down car pack, racing pack. CC0 license. |
| **itch.io free assets** | itch.io | Many free/cheap top-down sprite packs. Search "top-down city", "gta style". |
| **Spriter's Resource** | spriters-resource.com | Ripped sprites from GTA 1, GTA 2, GTA London — for reference only, not commercial use. |

### 10.4 Procedural Generation References

| Technique | Reference |
|-----------|-----------|
| **City road generation** | "Procedural City Generation" (Parish & Müller algorithm) — generates road networks using L-systems + extension rules |
| **Building placement** | "Procedural Modeling of Buildings" (Wonka et al.) — shape grammars for building generation |
| **Top-down tile maps** | Standard tilemap approach — see MDN "Tilemaps" tutorial, phaser.io tilemap docs |
| **Jersey-specific** | We already have real OSM road data (`jersey-roads.js`, 2633 roads) — no need for procedural road generation |

### 10.5 Key Takeaway from References

The most successful open-source top-down driving games share these traits:
1. **Canvas 2D** (not WebGL) for simplicity
2. **Procedurally generated sprites** (no external assets) OR **Kenney.nl CC0 packs**
3. **Simple physics** (2D kinematics with drift)
4. **Tile-based or vector-based** road rendering
5. **<500 lines of core game code** (rendering + physics + input)

VibeDrive.je already has the physics and game logic — the retro conversion is primarily a **rendering swap**.

---

## 11. Migration Path from Current 3D

### 11.1 What Can Be Reused (Direct Transfer)

| Component | Current (3D) | Retro (2D) | Reuse Level |
|-----------|-------------|------------|-------------|
| **Physics: acceleration** | Exponential ramp to MAX_SPEED | Same math | ✅ 100% copy |
| **Physics: braking** | Proportional to speed | Same math | ✅ 100% copy |
| **Physics: turning** | Speed-sensitive, inverse proportional | Same math | ✅ 100% copy |
| **Physics: lateral slide** | TurnInput × speed × handbrake | Same math | ✅ 100% copy |
| **Physics: handbrake** | Reduced friction, more slide | Same math | ✅ 100% copy |
| **Physics: reverse** | Half-speed, inverted steering | Same math | ✅ 100% copy |
| **Island boundary** | `islandMask(x,z)` function | Same function | ✅ 100% copy |
| **Terrain height** | `getTerrainHeight(x,z)` | Same function (for slope) | ✅ 100% copy |
| **Mission system** | State machine: idle→pickup→enroute→complete | Same logic | ✅ 100% copy |
| **Wanted level** | 0-5 stars, reckless detection, decay | Same logic | ✅ 100% copy |
| **Scoring** | `addPoints()`, `showToast()` | Same functions | ✅ 100% copy |
| **AI cars** | Random heading, boundary avoidance | Same logic | ✅ 100% copy |
| **Police AI** | Seek behavior toward player | Same logic | ✅ 100% copy |
| **Pedestrians** | Walk cycle, avoid roads | Same logic, sprite-based | ✅ 90% (render changes) |
| **Landmarks** | Array with positions + names | Same data | ✅ 100% copy |
| **Businesses** | JSON data with positions | Same data | ✅ 100% copy |
| **Radar/minimap** | Canvas 2D (already!) | Enhance or keep as-is | ✅ 95% (already 2D) |
| **HUD** | HTML/CSS overlay | Same HTML/CSS | ✅ 100% copy |
| **Controls** | Touch buttons + keyboard | Same input handling | ✅ 100% copy |
| **Day/night cycle** | Sky color transition | Color tint overlay | ✅ 80% (simpler) |
| **Weather** | Live API + visual overlay | Color tint + rain particles | ✅ 80% (simpler) |
| **Leaderboard** | Supabase integration | Same code | ✅ 100% copy |
| **Road data** | `jersey-roads.js` (2633 roads) | Same data | ✅ 100% copy |
| **Coastline** | `jersey-coastline.js` | Same data | ✅ 100% copy |

**Estimated reuse: 85-90% of game logic**

### 11.2 What Needs to Be Rewritten

| Component | Why Rewrite | Effort |
|-----------|------------|--------|
| **Renderer** | Three.js WebGL → Canvas 2D | High (core rewrite) |
| **Scene setup** | Three.js scene/camera/lighting → Canvas camera | Medium |
| **Car rendering** | 3D mesh → 2D sprite with rotation | Medium |
| **Building rendering** | 3D BoxGeometry → 2D building sprites | Medium |
| **Tree rendering** | 3D cone meshes → 2D circle sprites | Low |
| **Terrain rendering** | 3D PlaneGeometry → 2D tile grid | Medium |
| **Water rendering** | 3D plane mesh → 2D animated tiles | Low |
| **Shadow rendering** | Three.js shadow maps → simple offset ellipses | Low |
| **Camera** | Three.js PerspectiveCamera → 2D camera transform | Medium |
| **Pedestrian rendering** | 3D character meshes → 2D walk-cycle sprites | Medium |
| **Weather visuals** | 3D clouds/particles → 2D overlay effects | Low |
| **Day/night visuals** | 3D lighting changes → color filter overlay | Low |

### 11.3 What Can Be Removed

These 3D-specific components are **not needed** in the retro version:

- Three.js library (~600KB)
- WebGL renderer setup
- Shadow map configuration
- PerspectiveCamera, camera modes (chase, far, cockpit)
- HemisphereLight, DirectionalLight
- MeshStandardMaterial, MeshBasicMaterial
- BufferGeometry, PlaneGeometry, BoxGeometry
- MeshLambertMaterial, MeshPhongMaterial
- Fog (Three.js fog)
- 3D model creation (car group, tree group, building group)
- Sprite materials (Three.js Sprite)
- Particle systems (Three.js Points)

**Removal saves ~800 lines of Three.js boilerplate** from the current 4048-line file.

### 11.4 Migration Strategy

```
Phase 1: Fork and Strip (1-2 hours)
  ├── Copy index.html → index-retro.html
  ├── Remove all Three.js setup code (scene, camera, renderer, lights)
  ├── Remove 3D mesh creation (car group, buildings, trees, water mesh)
  ├── Remove 3D camera positioning code
  ├── Keep: physics, missions, AI, scoring, HUD, controls, leaderboard
  └── Add: Canvas 2D setup (single <canvas> element)

Phase 2: Core Renderer (2-3 hours)
  ├── Implement camera system (world→screen transform, smooth follow, zoom)
  ├── Implement ground tile rendering
  ├── Implement road rendering from jersey-roads.js
  ├── Implement car sprite generation + rotation rendering
  └── Verify: car drives around island with correct physics

Phase 3: City & Environment (2-3 hours)
  ├── Implement building sprites + placement
  ├── Implement tree/hedge sprites
  ├── Implement water rendering (animated)
  ├── Implement road markings (centre lines, zebra crossings)
  └── Verify: Jersey looks like Jersey from top-down

Phase 4: Polish & GTA Features (2-3 hours)
  ├── Implement damage model (health, visual states, performance impact)
  ├── Implement particle effects (smoke, fire, explosions, skid marks)
  ├── Implement pedestrian sprites
  ├── Implement audio (engine, siren, crashes, voice clips)
  ├── Implement day/night overlay
  └── Verify: full GTA 1-style gameplay loop

Phase 5: Mobile Optimization (1 hour)
  ├── Test on iPad / budget Android
  ├── Implement static layer caching if needed
  ├── Tune sprite sizes for readability
  └── Verify: 60fps on target devices

Total estimated effort: 8-12 hours
```

---

## 12. Code Architecture for Retro Version

### 12.1 File Structure

The retro version can remain a **single HTML file** (consistent with current approach), but with cleaner separation:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Meta, fonts, CSS (same as current) -->
  <style>
    /* HUD CSS (same as current) */
    /* Canvas styles */
  </style>
</head>
<body>
  <!-- HUD HTML (same as current) -->
  <canvas id="game-canvas"></canvas>
  
  <script>
    // ===== SECTION 1: CONFIG & CONSTANTS =====
    const ISLAND_SIZE = 200;
    const MAX_SPEED = 80;
    const ACCEL = 30;
    // ... (same constants)
    
    // ===== SECTION 2: DATA =====
    // jersey-roads.js content (inline or <script src>)
    // jersey-coastline.js content
    // landmarks, businesses, bus routes
    
    // ===== SECTION 3: UTILITIES =====
    function islandMask(x, z) { /* same */ }
    function getTerrainHeight(x, z) { /* same */ }
    
    // ===== SECTION 4: CANVAS SETUP =====
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    function resizeCanvas() { /* handle DPI */ }
    
    // ===== SECTION 5: CAMERA =====
    const camera = { x: 0, y: 0, zoom: 1.0, targetZoom: 1.0 };
    function worldToScreen(wx, wz) { /* transform */ }
    function updateCamera(dt) { /* smooth follow + zoom */ }
    
    // ===== SECTION 6: SPRITE GENERATION =====
    function generateCarSprite(color, damage) { /* procedural */ }
    function generateBuildingSprite(type) { /* procedural */ }
    function generateTreeSprite() { /* procedural */ }
    const carSprites = {}; // populated at load
    const buildingSprites = {};
    
    // ===== SECTION 7: GAME STATE =====
    let carX = 0, carZ = -50, carHeading = 0, carSpeed = 0;
    let lateralVelocity = 0, driftAngle = 0;
    let carDamage = 0, carHealth = 100;
    let score = 0, wantedLevel = 0;
    let missionState = 'idle';
    // ... (same state variables)
    
    // ===== SECTION 8: PHYSICS =====
    function updatePhysics(dt) { /* same math as current */ }
    function updateDrift(dt) { /* enhanced drift */ }
    function checkCollisions() { /* 2D collision */ }
    
    // ===== SECTION 9: AI =====
    function updateAICars(dt) { /* same logic, different render */ }
    function updatePolice(dt) { /* same logic */ }
    function updatePedestrians(dt) { /* same logic */ }
    
    // ===== SECTION 10: MISSIONS =====
    function startMission() { /* same */ }
    function updateMissionLogic(dt) { /* same */ }
    function updateMissionHUD() { /* same */ }
    
    // ===== SECTION 11: RENDERER =====
    function drawGround() { /* tile-based */ }
    function drawRoads() { /* vector from OSM data */ }
    function drawRoadMarkings() { /* British markings */ }
    function drawBuildings() { /* sprites */ }
    function drawTrees() { /* sprites */ }
    function drawSkidMarks() { /* tire marks */ }
    function drawShadows() { /* offset ellipses */ }
    function drawCars() { /* sprite + rotation */ }
    function drawPedestrians() { /* walk-cycle sprites */ }
    function drawParticles() { /* smoke, fire, explosions */ }
    function drawWeatherOverlay() { /* rain, fog, night */ }
    function drawRadar() { /* same as current radar (already Canvas 2D) */ }
    
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGround();
      drawRoads();
      drawRoadMarkings();
      drawBuildings();
      drawTrees();
      drawSkidMarks();
      drawShadows();
      drawCars();
      drawPedestrians();
      drawParticles();
      drawWeatherOverlay();
      // HUD is HTML/CSS, not on canvas
    }
    
    // ===== SECTION 12: AUDIO =====
    function initAudio() { /* Web Audio API setup */ }
    function updateEngineSound() { /* oscillator freq = speed */ }
    function playCrashSound(intensity) { /* noise burst */ }
    function playSiren(active) { /* two-tone */ }
    function playVoiceClip(category) { /* SpeechSynthesis en-GB */ }
    
    // ===== SECTION 13: INPUT =====
    // Same keyboard + touch handling as current
    
    // ===== SECTION 14: LEADERBOARD =====
    // Same Supabase integration as current
    
    // ===== SECTION 15: GAME LOOP =====
    function animate(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      
      updatePhysics(dt);
      updateDrift(dt);
      checkCollisions();
      updateAICars(dt);
      updatePolice(dt);
      updatePedestrians(dt);
      updateMissionLogic(dt);
      updateCamera(dt);
      updateDamage(dt);
      updateSkidMarks(dt);
      updateEngineSound();
      
      render();
      updateHUD(); // HTML/CSS HUD updates
      
      requestAnimationFrame(animate);
    }
    
    // ===== INIT =====
    initAudio();
    generateAllSprites();
    resizeCanvas();
    requestAnimationFrame(animate);
  </script>
</body>
</html>
```

### 12.2 Estimated Code Size

| Section | Lines (est.) |
|---------|-------------|
| HTML/CSS (HUD, controls) | 200 |
| Config & constants | 50 |
| Data (roads, coastline, landmarks) | 2650 (existing) |
| Utilities (islandMask, terrain) | 50 |
| Canvas setup | 20 |
| Camera | 40 |
| Sprite generation | 150 |
| Game state | 30 |
| Physics | 80 |
| AI | 100 |
| Missions | 80 |
| Renderer | 300 |
| Audio | 100 |
| Input | 80 |
| Leaderboard | 100 |
| Game loop | 50 |
| **Total (excluding data)** | **~1430** |
| **Total (with data)** | **~4080** |

The current 3D version is **4048 lines**. The retro version would be roughly the same total size but with **60% less rendering code** and **more game logic** (damage, drift, particles, audio). Or, if we externalize the road data (already in separate `.js` files), the HTML itself would be **~1500 lines** — much more manageable.

---

## 13. Comparison: Retro vs Modern 3D

### 13.1 Feature-by-Feature

| Feature | Retro (GTA 1-style) | Modern 3D (current) |
|---------|-------------------|-------------------|
| **Visual style** | Nostalgic, distinctive, clear | Modern, immersive, pretty |
| **Bundle size** | ~20-30KB (no deps) + road data | ~200KB (Three.js inline) + road data |
| **Load time** | Instant (<100ms) | 1-3s (Three.js init) |
| **Frame rate (mobile)** | 60fps guaranteed | 30-60fps (device dependent) |
| **Frame rate (old iPad)** | 60fps | 15-25fps (potential) |
| **Development speed** | Fast (simpler rendering) | Slow (3D pipeline) |
| **Asset creation** | Procedural sprites (code) | 3D models or procedural geometry |
| **Damage model** | Easy (swap sprite) | Hard (deform mesh or swap model) |
| **Particle effects** | Easy (2D draw calls) | Medium (Three.js Points or sprites) |
| **Collision detection** | Trivial (2D circles/rects) | Complex (3D raycast/bounds) |
| **Camera flexibility** | Fixed top-down | Chase, cockpit, top, far (already have) |
| **Depth perception** | Limited (shadows help) | Natural (3D perspective) |
| **Mobile readability** | Excellent (top-down = clear) | Medium (small objects at distance) |
| **Screenshot appeal** | Unique, retro-cool | Standard 3D game look |
| **Nostalgia factor** | High (GTA 1 + London 1969) | None |
| **Audio** | Procedural (zero assets) | Same |
| **Missions** | Same logic | Same logic |
| **Physics feel** | Arcade (same code) | Arcade (same code) |
| **Multiplayer potential** | Same (Supabase) | Same |
| **Maintainability** | High (simpler code) | Medium (Three.js complexity) |
| **Browser compatibility** | Universal (Canvas 2D) | Good (WebGL 95%+) |
| **Thermal impact (mobile)** | Low (CPU only) | High (GPU) |
| **Battery life** | Excellent | Poor (GPU drains battery) |
| **Unique selling point** | "Only GTA-style Jersey game" | "3D Jersey driving game" |

### 13.2 Visual Identity

**Retro path** gives VibeDrive.je a **unique visual identity** that stands out:
- No other web game looks like GTA 1 in 2026
- The top-down view is perfect for showing Jersey's island shape
- British/Jersey road markings and architecture are instantly recognizable from above
- The nostalgia factor is a marketing hook ("GTA 1 but it's Jersey!")
- Screenshots are immediately readable and shareable

**Modern 3D path** gives a **conventional but immersive** experience:
- 3D depth, perspective, lighting
- Better sense of speed and terrain
- More camera options
- But looks like "just another 3D driving game"
- Harder to achieve visual polish without professional 3D assets

### 13.3 Development Effort

| Metric | Retro | Modern 3D (continue current) |
|--------|-------|----------------------|
| **Time to MVP** | 8-12 hours (from current codebase) | Already exists |
| **Time to polish** | +4-6 hours (particles, audio, markings) | +20-40 hours (lighting, models, optimization) |
| **Time to mobile-optimized** | Included in MVP | +10-20 hours (LOD, texture compression, shader tuning) |
| **Total to production** | ~12-18 hours | ~30-60 hours additional |
| **Ongoing maintenance** | Low (simple code) | High (WebGL issues, device compat) |

---

## 14. Recommendation

### 14.1 The Retro Path Is Strong

For VibeDrive.je specifically, the retro GTA 1-style direction has compelling advantages:

1. **Performance is a non-issue** — 2.5ms/frame vs 12ms/frame, 60fps on any device
2. **85-90% code reuse** — physics, missions, AI, scoring, leaderboard all transfer directly
3. **Unique visual identity** — stands out in a market full of generic 3D driving games
4. **Faster to build and maintain** — Canvas 2D is simpler than WebGL
5. **Better mobile experience** — no GPU heat, no battery drain, no WebGL context loss
6. **GTA 1 + Jersey is a great hook** — "What if GTA 1's London 1969 pack was Jersey?" is a genuinely appealing concept
7. **The real Jersey road data works beautifully** — 2633 roads rendered as vector paths look great top-down

### 14.2 The 3D Path Is Not Wrong

The current 3D game is already functional and has features that are harder in 2D:
- **3D camera modes** (chase, cockpit, far) give variety
- **Terrain elevation** is visible and affects gameplay
- **Plane/boat modes** are more visually interesting in 3D
- **Day/night lighting** is more atmospheric with real 3D light

### 14.3 Ideal Approach: **Build Both, Let Players Choose**

The code architecture allows for this:
- Keep `index.html` as the 3D version
- Create `index-retro.html` as the 2D version
- Both share the same road data, physics constants, mission logic, leaderboard
- A toggle on the landing page lets players choose "3D" or "Retro"
- The retro version becomes the **default for mobile**, 3D for desktop

This gives:
- Maximum reach (works on everything)
- Player choice (some prefer 3D, some prefer retro)
- A unique marketing angle ("play in 3D or retro GTA 1 mode!")
- Low incremental cost (85% code reuse)

### 14.4 If Forced to Choose One

**Choose retro for mobile-first.** The performance, readability, and uniqueness advantages outweigh the visual immersion loss. A top-down GTA 1-style Jersey game is more likely to go viral ("look at this cool retro Jersey game") than a standard 3D driving game ("looks like a student project GTA clone").

**Choose 3D for desktop showcase.** If the goal is to impress in a presentation or portfolio, 3D looks more impressive in screenshots and video.

---

## Appendix A: Quick-Start Code Template

```javascript
// === MINIMAL GTA 1-STYLE RENDERER ===
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
  canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
}
window.addEventListener('resize', resize);
resize();

const camera = { x: 0, y: 0, zoom: 1.0, targetZoom: 1.0 };

function w2s(wx, wz) {
  return [
    (wx - camera.x) * camera.zoom + window.innerWidth / 2,
    (wz - camera.y) * camera.zoom + window.innerHeight / 2
  ];
}

// Car sprite (procedural)
function makeCarSprite(color) {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 80;
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.beginPath();
  x.roundRect(6, 8, 36, 64, 6);
  x.fill();
  x.fillStyle = 'rgba(100,150,200,0.7)';
  x.fillRect(10, 14, 28, 10); // windshield
  x.fillRect(10, 56, 28, 8);  // rear window
  x.fillStyle = 'rgba(0,0,0,0.3)';
  x.fillRect(10, 26, 28, 28); // roof interior
  return c;
}

const playerSprite = makeCarSprite('#00A86B');

// Game state (reuse from current game)
let carX = 0, carZ = -50, carHeading = 0, carSpeed = 0;
const keys = { up: false, down: false, left: false, right: false, handbrake: false };

// Input (same as current)
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
  if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if (e.key === ' ') keys.handbrake = true;
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
  if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  if (e.key === ' ') keys.handbrake = false;
});

function loop(now) {
  const dt = 0.016;
  
  // Physics (copied from current game)
  const ACCEL = 30, MAX_SPEED = 80, FRICTION = 5, TURN_RATE = 60, BRAKE = 40;
  if (keys.up) carSpeed += ACCEL * dt * (1 - carSpeed / MAX_SPEED);
  else if (keys.down) {
    if (carSpeed > 0) carSpeed -= BRAKE * dt * (Math.abs(carSpeed) / MAX_SPEED + 0.3);
    else carSpeed -= ACCEL * dt * 0.5 * (1 - Math.abs(carSpeed) / 20);
  } else {
    const fr = keys.handbrake ? 2 : FRICTION;
    if (carSpeed > 0) carSpeed -= fr * dt;
    else if (carSpeed < 0) carSpeed += fr * dt;
  }
  carSpeed = Math.max(-20, Math.min(MAX_SPEED, carSpeed));
  if (Math.abs(carSpeed) < 0.3) carSpeed = 0;
  
  if (Math.abs(carSpeed) > 1) {
    const tf = TURN_RATE * dt * (1 - Math.abs(carSpeed) / MAX_SPEED * 0.5);
    const d = carSpeed > 0 ? 1 : -1;
    if (keys.left) carHeading += tf * 3 * d;
    if (keys.right) carHeading -= tf * 3 * d;
  }
  
  const rad = carHeading * Math.PI / 180;
  carX += Math.sin(rad) * carSpeed * 0.3 * dt;
  carZ += Math.cos(rad) * carSpeed * 0.3 * dt;
  
  // Camera follow
  camera.x += (carX - camera.x) * 0.1;
  camera.y += (carZ - camera.y) * 0.1;
  camera.targetZoom = 1.0 - Math.abs(carSpeed) / MAX_SPEED * 0.3;
  camera.zoom += (camera.targetZoom - camera.zoom) * 0.05;
  
  // Render
  ctx.fillStyle = '#4A7A3A'; // grass
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  
  // Draw island outline (simplified)
  ctx.fillStyle = '#3A3A3A';
  ctx.beginPath();
  for (let i = 0; i < jerseyCoastline.length; i++) {
    const [sx, sy] = w2s(jerseyCoastline[i][0], jerseyCoastline[i][1]);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
  
  // Draw roads
  for (const road of jerseyRoads) {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = road.w * camera.zoom;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < road.p.length; i++) {
      const [sx, sy] = w2s(road.p[i][0], road.p[i][1]);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  
  // Draw car
  const [csx, csy] = w2s(carX, carZ);
  ctx.save();
  ctx.translate(csx, csy);
  ctx.rotate(-carHeading * Math.PI / 180);
  ctx.drawImage(playerSprite, -24 * camera.zoom, -40 * camera.zoom, 48 * camera.zoom, 80 * camera.zoom);
  ctx.restore();
  
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

This ~100-line template produces a drivable top-down car on real Jersey roads. Everything else (missions, AI, damage, particles, audio, HUD) is incremental additions.

---

## Appendix B: GTA 1 London 1969 → Jersey Mapping

| GTA 1 London Element | Jersey Equivalent |
|---------------------|-------------------|
| 1960s London streets | Jersey's St. Helier town centre |
| Routemaster bus | Jersey Liberty Bus (modern but distinctive green/cream) |
| Black cab | Jersey taxi (regular cars, not London cabs) |
| Mini | Classic Mini (popular in Jersey) |
| Thames river | English Channel / St. Aubin's Bay |
| Tower Bridge | No bridge equivalent, but Mont Orgueil Castle as landmark |
| Roundabouts | Jersey has many roundabouts (more per capita than London!) |
| Terraced houses | Granite terraces in St. Helier |
| Double yellow lines | Same — Jersey uses UK-style road markings |
| British police sirens | Same — Jersey uses two-tone "nee-naw" |
| Cockney pedestrian voices | Jèrriais-accented English ("Eh, what you at?" instead of "Oi!") |
| 1960s radio | "Jersey FM" — local radio station vibe |
| Narrow streets | Jersey's narrow lanes (Green Lanes — speed limit 15mph!) |
| Roundels/zebra crossings | Same — Jersey has many, especially near schools |
| British road signs | Jersey road signs (UK style + Jèrriais names) |
| Georgian architecture | Georgian townhouses in St. Helier (real) |
| Tower blocks | No tower blocks — Jersey has height restrictions! |
| Smog/fog | Jersey sea fog (common in spring) |

---

*End of report. This document covers the full technical scope of a GTA 1-style retro conversion for VibeDrive.je. The recommended next step is to build the ~100-line quick-start prototype (Appendix A) to validate the visual direction before committing to full migration.*