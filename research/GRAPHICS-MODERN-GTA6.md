# GRAPHICS MODERNIZATION RESEARCH: GTA 6-Inspired Visual Uplift for VibeDrive.je

**Date:** August 2026  
**Target:** iPad Safari 30+ FPS, mobile phone fallback  
**Current stack:** Single HTML file, Three.js from unpkg CDN, WebGLRenderer, ~4962 lines  
**Goal:** GTA 6-inspired visual quality while remaining mobile-constrained  

---

## Table of Contents

1. [GTA 6 Visual Style Analysis](#1-gta-6-visual-style-analysis)
2. [Three.js Modern Rendering Techniques](#2-threejs-modern-rendering-techniques)
3. [Mobile/iPad WebGL Constraints](#3-mobileipad-webgl-constraints)
4. [Asset Generation Strategy](#4-asset-generation-strategy)
5. [Three.js Specific Optimizations](#5-threejs-specific-optimizations)
6. [Real Code Examples & References](#6-real-code-examples--references)
7. [Performance Budget](#7-performance-budget)
8. [Phased Implementation Plan](#8-phased-implementation-plan)

---

## 1. GTA 6 Visual Style Analysis

*Source: Digital Foundry GTA 6 Trailer 2 tech breakdown (May 2025)*

### What Makes GTA 6 Look Next-Gen

Based on Digital Foundry's analysis of GTA 6 Trailer 2 (captured on base PS5 at 1440p/30fps):

#### 1.1 Ray-Traced Global Illumination (RTGI)
- **What it does:** Light bounces realistically off all surfaces, coloring nearby objects with indirect diffuse lighting
- **GTA 6 example:** Police car lights reflecting off nearby walls in evening scenes; warm glow bouncing from buildings onto the street
- **Temporal stability:** Exceptionally stable — no flickering/crawling artifacts (better than UE5 Lumen on consoles)
- **Mobile feasibility:** ❌ True RTGI not possible on iPad. **Simulate with:** baked lightmaps + environment maps + screen-space ambient occlusion

#### 1.2 Ray-Traced Reflections (Hybrid)
- **What it does:** Real-time reflections on all surfaces, including partially transparent ones (glass, water, plastic)
- **GTA 6 example:** Car window reflects beach/sky; dashboard reflected on windscreen; sunglasses show the view ahead; watch shows reflection
- **Hybrid approach:** RT + screen-space reflections (SSR) combined
- **Mobile feasibility:** ❌ RT reflections not possible. **Simulate with:** SSR (screen-space reflections) + planar reflections for water + cube map reflections on car body

#### 1.3 Shadow Maps (Traditional)
- **GTA 6 uses traditional shadow maps** (not RT) — a sensible optimization
- Variable penumbra effects (soft shadows at distance)
- Some aliasing visible on small details (drawer handles)
- **Mobile feasibility:** ✅ Shadow maps work well on iPad with proper configuration

#### 1.4 Character & Hair Rendering
- Strand-based hair system (not card-based)
- Hair rendered at lower resolution for performance
- Secondary animation in clothing (cloth simulation)
- **Mobile feasibility:** ❌ Strand-based hair not feasible. **Use:** Card-based hair with good normal maps

#### 1.5 Skin & Sweat Rendering
- Excellent specular response on skin
- Sweat beading visible on characters
- Wet surfaces with realistic specular highlights
- **Mobile feasibility:** ⚠️ Partially — use roughness maps and specular control on materials

#### 1.6 Material Work
- Exceptional material fidelity — glass, liquid, metal, plastic all look distinct
- Beer bottles: bubbles rising, liquid sloshing, ambient lighting through glass
- **Mobile feasibility:** ✅ PBR materials work well. Focus on roughness/metalness maps

#### 1.7 Atmospheric Effects
- Volumetric-style fog in evening scenes
- Evening glow, warm color grading
- Time-of-day atmospheric color shifts
- **Mobile feasibility:** ⚠️ Partially — use exponential fog with color matching + post-processing color grading

#### 1.8 Resolution & Upscaling
- Internal resolution: 1440p (2560x1152) on PS5
- Uses spatial upscaler (FSR-like)
- 30fps target
- **Mobile lesson:** Upscaling is valid — render at lower internal resolution, upscale to display

### Key Takeaway for VibeDrive.je
GTA 6's look comes primarily from **lighting quality** (RTGI + RT reflections), **material fidelity** (PBR with proper roughness/metalness), and **atmospheric color grading**. On iPad, we can approximate this with:
- Environment maps for ambient lighting (fake RTGI)
- SSR + planar reflections (fake RT reflections)  
- PBR materials with procedural textures
- Post-processing: bloom, tone mapping, color grading, vignette
- Exponential fog with time-of-day color
- Shadow maps with PCF soft shadows

---

## 2. Three.js Modern Rendering Techniques

### 2.1 PBR Materials (MeshStandardMaterial / MeshPhysicalMaterial)

The current code already uses `MeshStandardMaterial` — good start. Key upgrades:

```javascript
// Current: basic PBR with flat colors
const terrainMat = new THREE.MeshStandardMaterial({ 
  vertexColors: true, roughness: 0.9, metalness: 0.0 
});

// UPGRADED: PBR with texture maps
const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  map: grassTexture,        // diffuse/albedo
  normalMap: grassNormal,   // surface detail
  roughnessMap: grassRough, // varied roughness
  normalScale: new THREE.Vector2(0.8, 0.8),
  envMapIntensity: 1.0,     // environment reflection strength
});

// MeshPhysicalMaterial for advanced surfaces (water, glass, car paint)
const waterMat = new THREE.MeshPhysicalMaterial({
  color: 0x1a4a7a,
  roughness: 0.1,
  metalness: 0.0,
  transmission: 0.0,
  thickness: 1.0,
  envMapIntensity: 1.5,
  clearcoat: 1.0,        // car paint / wet surface effect
  clearcoatRoughness: 0.1,
});

// Car body paint - GTA-like metallic finish
const carBodyMat = new THREE.MeshPhysicalMaterial({
  color: 0x00cc44,
  roughness: 0.3,
  metalness: 0.9,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  envMapIntensity: 2.0,
});
```

### 2.2 Environment Maps (PMREMGenerator + RoomEnvironment)

This is the **single biggest visual upgrade** — provides image-based lighting (IBL) that makes PBR materials look realistic.

```javascript
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Generate a procedural environment map (no HDR file download needed)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnv = new RoomEnvironment();
const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;

// Apply to all PBR materials in the scene
scene.environment = envMap;

// For outdoor scenes, create a custom environment:
const skyEnv = new THREE.Scene();
// Add gradient sky, sun mesh, etc.
const outdoorEnvMap = pmremGenerator.fromScene(skyEnv, 0.04).texture;
scene.environment = outdoorEnvMap;

// Clean up
pmremGenerator.dispose();

// IMPORTANT: Update environment map when time-of-day changes
function updateEnvironmentForTimeOfDay(tod) {
  const envScene = new THREE.Scene();
  // Add sun/moon at correct position, sky color, etc.
  const newEnv = pmremGenerator.fromScene(envScene, 0.04).texture;
  if (scene.environment) scene.environment.dispose();
  scene.environment = newEnv;
}
```

**For a single-HTML-file project without HDR files:**
```javascript
// Procedural sky environment using a gradient + sun
function createSkyEnvironment(renderer, sunPosition, skyColor) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  
  // Gradient background
  const skyGeo = new THREE.SphereGeometry(100, 32, 32);
  const skyMat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    vertexColors: true,
  });
  // Set vertex colors for gradient...
  
  // Add sun as bright sphere
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffaa })
  );
  sun.position.copy(sunPosition).multiplyScalar(50);
  envScene.add(sun);
  
  envScene.add(skyMesh);
  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return envMap;
}
```

### 2.3 Post-Processing Pipeline

The current code has NO post-processing. This is the second biggest upgrade.

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// === MOBILE-SAFE POST-PROCESSING PIPELINE ===
const composer = new EffectComposer(renderer);

// 1. Main render pass
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2. Bloom — HALF RESOLUTION for mobile (key optimization)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), // half res!
  0.6,    // strength: subtle, not overblown
  0.4,    // radius
  0.85    // threshold: only bright things bloom
);
composer.addPass(bloomPass);

// 3. FXAA (cheaper than SMAA on mobile)
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.set(
  1 / window.innerWidth, 1 / window.innerHeight
);
composer.addPass(fxaaPass);

// 4. Output pass (handles tone mapping)
const outputPass = new OutputPass();
composer.addPass(outputPass);

// In render loop:
function animate() {
  // Replace: renderer.render(scene, camera);
  composer.render();
}
```

**Tone mapping (apply on renderer):**
```javascript
// ACES Filmic tone mapping — cinematic look, GTA-like
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// When using OutputPass, it handles tone mapping
// If NOT using post-processing, set on renderer directly
```

### 2.4 Shadow Map Quality

Current code uses `PCFSoftShadowMap` — already decent. Upgrades:

```javascript
// Current
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// UPGRADED: Better quality on mobile
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // keep this for mobile
// VSM ( VarianceShadowMap) is an alternative but can have artifacts

// Configure shadow camera tightly (critical for quality)
sunLight.shadow.camera.left = -200;
sunLight.shadow.camera.right = 200;
sunLight.shadow.camera.top = 200;
sunLight.shadow.camera.bottom = -200;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 500;

// Mobile: 1024px shadow map (balance quality vs memory)
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;

// Desktop: 2048
// sunLight.shadow.mapSize.width = 2048;
// sunLight.shadow.mapSize.height = 2048;

// Bias to prevent shadow acne
sunLight.shadow.bias = -0.0005;
sunLight.shadow.normalBias = 0.02;
```

**Cascaded Shadow Maps for large outdoor scenes:**
```javascript
import { CSM } from 'three/addons/csm/CSM.js';

const csm = new CSM({
  maxFar: camera.far,
  cascades: 2,  // mobile: 2 cascades, desktop: 4
  parent: scene,
  shadowMapSize: 1024,
  lightDirection: sunPosition.clone().normalize(),
  camera: camera,
  mode: 'practical',
});
```

### 2.5 Instanced Meshes for Buildings/Trees

The current code creates individual `THREE.Mesh` objects for each building and tree — this generates hundreds of draw calls. Switch to `InstancedMesh`:

```javascript
// === BUILDINGS: InstancedMesh ===
const buildingGeo = new THREE.BoxGeometry(1, 1, 1); // unit cube, scale per instance
const buildingMat = new THREE.MeshStandardMaterial({
  roughness: 0.6,
  metalness: 0.1,
  envMapIntensity: 1.0,
});

const buildingCount = 150; // however many buildings
const buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, buildingCount);
buildings.castShadow = true;
buildings.receiveShadow = true;

const matrix = new THREE.Matrix4();
const color = new THREE.Color();

for (let i = 0; i < buildingCount; i++) {
  const pos = getBuildingPosition(i);
  const scale = getBuildingScale(i); // {x: width, y: height, z: depth}
  
  matrix.compose(
    new THREE.Vector3(pos.x, scale.y / 2, pos.z),
    new THREE.Quaternion(),
    new THREE.Vector3(scale.x, scale.y, scale.z)
  );
  buildings.setMatrixAt(i, matrix);
  
  // Per-instance color variation
  color.setHSL(0.6 + Math.random() * 0.1, 0.1, 0.5 + Math.random() * 0.2);
  buildings.setColorAt(i, color);
}
buildings.instanceMatrix.needsUpdate = true;
buildings.instanceColor.needsUpdate = true;
scene.add(buildings);

// Result: 150 draw calls → 1 draw call
```

```javascript
// === TREES: InstancedMesh ===
// Merge trunk + foliage into one geometry, then instance
const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 6);
const leafGeo = new THREE.ConeGeometry(1.5, 4, 6);
leafGeo.translate(0, 3, 0);

// Merge geometries
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const treeGeo = mergeGeometries([trunkGeo, leafGeo]);

const treeMat = new THREE.MeshStandardMaterial({ 
  vertexColors: true, 
  roughness: 0.8 
});
// Use vertex colors to color trunk brown and leaves green separately

const treeCount = 300;
const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
trees.castShadow = true;
trees.receiveShadow = true;

for (let i = 0; i < treeCount; i++) {
  const pos = getTreePosition(i);
  const scale = 0.8 + Math.random() * 0.6;
  matrix.compose(
    new THREE.Vector3(pos.x, 0, pos.z),
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2
    ),
    new THREE.Vector3(scale, scale, scale)
  );
  trees.setMatrixAt(i, matrix);
}
trees.instanceMatrix.needsUpdate = true;
scene.add(trees);
```

### 2.6 Screen-Space Reflections (SSR)

GTA 6 uses hybrid RT + SSR. On mobile, SSR alone gives a strong visual upgrade for wet roads and car reflections:

```javascript
// SSR is available in three.js examples
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';

const ssrPass = new SSRPass({
  renderer: renderer,
  scene: scene,
  camera: camera,
  width: window.innerWidth,
  height: window.innerHeight,
  // Mobile: reduce quality
  maxDistance: 50,
  thickness: 0.5,
});

// Use selectively — only on wet road surfaces and car body
// This is EXPENSIVE — test on iPad first
// Consider: only enable during/after rain, disable otherwise
```

**⚠️ Mobile warning:** SSR is very expensive. Test carefully. Consider planar reflections for water instead (cheaper).

### 2.7 Planar Reflections for Water

More mobile-friendly than SSR for water surfaces:

```javascript
// Simple planar reflection for water
const waterReflectionCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const reflector = new THREE.Reflector(
  new THREE.PlaneGeometry(3000, 3000),
  {
    textureWidth: 512,   // mobile: 512, desktop: 1024
    textureHeight: 512,
    color: 0x1a4a7a,
  }
);
reflector.rotation.x = -Math.PI / 2;
scene.add(reflector);

// Reflector is built into three.js examples
import { Reflector } from 'three/addons/objects/Reflector.js';
```

---

## 3. Mobile/iPad WebGL Constraints

### 3.1 WebGPU vs WebGL2 on iOS

**As of Safari 26 (September 2025), WebGPU is now enabled by default on iOS/iPadOS.**

| Browser | WebGPU Support | Notes |
|---------|---------------|-------|
| Safari (iOS/iPadOS) | ✅ Since v26 (Sep 2025) | Enabled by default |
| Chrome (Android) | ✅ Since v113 (2023) | |
| Safari (macOS) | ✅ Since v26 | |

**Three.js WebGPU support:**
- Since r171, `WebGPURenderer` available with zero-config and automatic WebGL2 fallback
- TSL (Three Shader Language) — write shaders once, compile to WGSL or GLSL

```javascript
// Modern Three.js with WebGPU + WebGL2 fallback
import { WebGPURenderer } from 'three/webgpu';

const renderer = new WebGPURenderer({ 
  antialias: false,
  powerPreference: 'high-performance',
});
await renderer.init(); // Required before first render

// Automatic fallback to WebGL2 if WebGPU unavailable
// Force WebGL2 for debugging: new WebGPURenderer({ forceWebGL: true })
```

**For VibeDrive.je recommendation:** Stay on WebGL2 for now (wider compatibility), plan WebGPU migration as Phase 4. The WebGL2 renderer is still fully supported and the visual techniques in this report all work on WebGL2.

### 3.2 iPad Hardware Constraints (Concrete Numbers)

#### GPU Memory
- **Total system RAM:** iPad Air/Pro: 4-8GB, iPad mini: 4GB
- **Browser tab memory limit (iOS Safari):** ~350-384MB before tab crash/reload
- **Recommended VRAM budget for textures:** ≤ 100MB total
- **A single 4K texture:** 64MB in RGBA format → **use 1K textures max (4MB each)**
- **KTX2/Basis compressed textures:** 4-6x compression → 4K texture becomes ~10-16MB

#### Texture Size Limits
- **MAX_TEXTURE_SIZE on iPad:** 4096 (confirmed via WebGL2 spec + device testing)
- **99% of devices support 4096**, only 50% support >4096
- **Recommendation:** Max texture dimension: 2048 for hero textures, 1024 for secondary, 512 for tertiary
- **Cubemap max:** 1024 per face on mobile

#### Draw Calls
- **Target: < 100 draw calls per frame** (golden rule for 60fps)
- **Below 100:** smooth 60fps on most devices
- **100-300:** acceptable for 30fps target
- **300-500:** janky on mobile
- **>500:** even desktop struggles

#### Triangle Count
- **Rule of thumb:** Keep under 1,200,000 triangles rendered per frame
- **iPad Air M2:** can handle ~500K-1M triangles at 30fps with simple shaders
- **iPad (older A-series chips):** ~200-300K triangles at 30fps
- **Recommendation for VibeDrive.je:** Target 150-250K triangles per frame

#### WebGL2 Uniform/Limit Table
| Limit | WebGL1 Min | WebGL2 Min | iPad Typical |
|-------|-----------|-----------|-------------|
| MAX_VERTEX_ATTRIBS | 8 | 16 | 16 |
| MAX_VERTEX_UNIFORM_VECTORS | 128 | 256 | 256 |
| MAX_FRAGMENT_UNIFORM_VECTORS | 16 | 224 | 224 |
| MAX_VARYING_VECTORS | 8 | 16 | 16 |
| MAX_TEXTURE_IMAGE_UNITS (frag) | 8 | 16 | 16 |
| MAX_COMBINED_TEXTURE_IMAGE_UNITS | 8 | 32 | 32 |

### 3.3 Post-Processing: Mobile-Safe vs Desktop-Only

| Effect | Mobile-Safe? | Notes |
|--------|-------------|-------|
| **Bloom (half-res)** | ✅ Yes | Biggest bang-for-buck. Render at half resolution |
| **FXAA** | ✅ Yes | Cheap AA, works everywhere |
| **SMAA** | ⚠️ Borderline | Higher quality than FXAA but more expensive |
| **Tone Mapping (ACES)** | ✅ Yes | Essentially free — just a color transform |
| **Vignette** | ✅ Yes | Very cheap, adds cinematic look |
| **Color Grading (LUT)** | ✅ Yes | 1 texture lookup, very cheap |
| **SSAO** | ⚠️ Expensive | Use at half-res or skip on older iPads |
| **SSR** | ❌ Too expensive | Skip on mobile, use planar reflections |
| **Depth of Field** | ❌ Skip | Too expensive on mobile |
| **Motion Blur** | ❌ Skip | Too expensive, rarely looks good on mobile |
| **Chromatic Aberration** | ✅ Yes | Very cheap, subtle GTA-like effect |
| **Film Grain** | ✅ Yes | Very cheap, adds texture |

### 3.4 Mobile-Specific Renderer Settings

```javascript
const renderer = new THREE.WebGLRenderer({
  antialias: false,           // disable — use FXAA in post-processing
  powerPreference: 'high-performance',
  stencil: false,             // save memory
  depth: true,                // needed for 3D
  preserveDrawingBuffer: false,
});

// Mobile pixel ratio cap — CRITICAL
const maxPixelRatio = isIPad ? 2 : Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(maxPixelRatio);

// Don't render at full retina resolution on iPad
// iPad Pro 11" is 2388x1668 — rendering at 2x is 4776x3334 = too many pixels
// Cap at 1.5x for 30fps target
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

// Shadow settings
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Tone mapping
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Output color space (sRGB for correct colors)
renderer.outputColorSpace = THREE.SRGBColorSpace;
```

### 3.5 Device Tier Detection

```javascript
function detectDeviceTier() {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return { tier: 'degraded', isMobile: true };
  
  const renderer = gl.getParameter(gl.RENDERER);
  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const isIPad = /iPad/.test(navigator.userAgent);
  const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);
  const dpr = window.devicePixelRatio;
  
  // Check for Apple Silicon iPad (M1/M2)
  const isAppleSilicon = isIPad && maxTexSize >= 4096;
  
  let tier = 'desktop';
  if (isMobile) tier = isAppleSilicon ? 'mobile-high' : 'mobile';
  if (isIPad && !isAppleSilicon) tier = 'mobile';
  
  return {
    tier,           // 'desktop' | 'mobile-high' | 'mobile' | 'degraded'
    isMobile,
    isIPad,
    maxTexSize,
    dpr,
    recommendedPixelRatio: tier === 'desktop' ? 2 : tier === 'mobile-high' ? 1.5 : 1.0,
    recommendedShadowMapSize: tier === 'desktop' ? 2048 : 1024,
    recommendedBloom: tier === 'degraded' ? false : true,
    recommendedBloomResolution: tier === 'desktop' ? 1.0 : 0.5, // half-res on mobile
    recommendedSSAO: tier === 'desktop',
  };
}
```

---

## 4. Asset Generation Strategy

### 4.1 Procedural Textures via Canvas (No Downloads)

The biggest constraint is the single HTML file — no external texture files. Generate textures procedurally using Canvas2D:

```javascript
// === Procedural road texture with normal map ===
function createRoadTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Base asphalt
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(0, 0, size, size);
  
  // Noise/grain
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = Math.random() * 30;
    ctx.fillStyle = `rgb(${42+v},${42+v},${48+v})`;
    ctx.fillRect(x, y, 1, 1);
  }
  
  // Road markings (center line)
  ctx.fillStyle = '#FFD60A';
  for (let y = 0; y < size; y += 80) {
    ctx.fillRect(size/2 - 3, y, 6, 40);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 20);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// === Procedural normal map from heightmap ===
function createNormalMapFromCanvas(heightCanvas) {
  const size = heightCanvas.width;
  const ctx = heightCanvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = normalCanvas.height = size;
  const nctx = normalCanvas.getContext('2d');
  const normalData = nctx.createImageData(size, size);
  
  const strength = 2.0;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const hL = data[((y * size) + Math.max(0, x-1)) * 4] / 255;
      const hR = data[((y * size) + Math.min(size-1, x+1)) * 4] / 255;
      const hD = data[(Math.max(0, y-1) * size + x) * 4] / 255;
      const hU = data[(Math.min(size-1, y+1) * size + x) * 4] / 255;
      
      const dx = (hR - hL) * strength;
      const dy = (hU - hD) * strength;
      const len = Math.sqrt(dx*dx + dy*dy + 1);
      
      normalData.data[idx]     = ((-dx / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      normalData.data[idx + 3] = 255;
    }
  }
  
  nctx.putImageData(normalData, 0, 0);
  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
  return normalTexture;
}

// === Procedural grass texture ===
function createGrassTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Base green
  ctx.fillStyle = '#2d6e2d';
  ctx.fillRect(0, 0, size, size);
  
  // Grass blades
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 3 + Math.random() * 8;
    const angle = Math.random() * Math.PI;
    const shade = Math.random() * 60 - 30;
    const r = Math.max(0, 45 + shade);
    const g = Math.max(0, 110 + shade);
    const b = Math.max(0, 45 + shade);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// === Procedural building facade texture ===
function createBuildingFacadeTexture(baseColor = '#ccccdd') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  
  // Window grid
  const winRows = 6;
  const winCols = 4;
  const winW = size / (winCols + 1);
  const winH = size / (winRows + 1);
  
  for (let row = 0; row < winRows; row++) {
    for (let col = 0; col < winCols; col++) {
      const x = (col + 0.5) * winW + winW * 0.1;
      const y = (row + 0.5) * winH + winH * 0.1;
      const w = winW * 0.8;
      const h = winH * 0.7;
      
      // Window glass - varies between lit and unlit
      const lit = Math.random() > 0.7;
      if (lit) {
        ctx.fillStyle = `rgb(${200 + Math.random()*55}, ${180 + Math.random()*50}, ${100 + Math.random()*80})`;
      } else {
        ctx.fillStyle = `rgb(${30 + Math.random()*40}, ${40 + Math.random()*40}, ${50 + Math.random()*40})`;
      }
      ctx.fillRect(x, y, w, h);
      
      // Window frame
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// === Procedural roughness map ===
function createRoughnessMap(baseRoughness = 0.7, variation = 0.3) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const base = baseRoughness * 255;
  const varRange = variation * 255;
  
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, size, size);
  
  // Add noise variation
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = base + (Math.random() - 0.5) * varRange;
    const clamped = Math.max(0, Math.min(255, v));
    ctx.fillStyle = `rgb(${clamped},${clamped},${clamped})`;
    ctx.fillRect(x, y, 2, 2);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
```

### 4.2 Procedural Environment Maps (No HDR Downloads)

```javascript
// Generate environment maps procedurally for different times of day
function createEnvironmentForTimeOfDay(tod, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  
  // Sky dome with gradient
  const skyGeo = new THREE.SphereGeometry(50, 32, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    vertexColors: true,
  });
  
  // Set gradient colors based on time of day
  const colors = getSkyColors(tod); // returns {top, middle, bottom}
  const positions = skyGeo.attributes.position;
  const vertexColors = new Float32Array(positions.count * 3);
  
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const t = (y / 50 + 1) / 2; // 0=bottom, 1=top
    const c = lerpColor3(colors.bottom, colors.middle, colors.top, t);
    vertexColors[i*3] = c.r;
    vertexColors[i*3+1] = c.g;
    vertexColors[i*3+2] = c.b;
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
  
  // Add sun/moon light source
  const sunPos = getSunPosition(tod);
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3, 16, 16),
    new THREE.MeshBasicMaterial({ color: getSunColor(tod) })
  );
  sunMesh.position.copy(sunPos).multiplyScalar(40);
  envScene.add(sunMesh);
  envScene.add(new THREE.Mesh(skyGeo, skyMat));
  
  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return envMap;
}

// Color presets for different times of day
const TOD_COLORS = {
  dawn:  { top: [0.3, 0.4, 0.7], mid: [0.8, 0.5, 0.3], bot: [0.9, 0.6, 0.4] },
  day:   { top: [0.25, 0.45, 0.9], mid: [0.45, 0.65, 0.95], bot: [0.7, 0.8, 0.95] },
  dusk:  { top: [0.2, 0.2, 0.4], mid: [0.9, 0.4, 0.2], bot: [0.8, 0.3, 0.15] },
  night: { top: [0.02, 0.02, 0.08], mid: [0.05, 0.05, 0.12], bot: [0.08, 0.08, 0.15] },
};
```

### 4.3 Small CDN-Hosted Assets (If Needed)

If the project can host a few small files alongside the HTML:

```
/assets/
  /ktx2/           # Compressed textures (~10-50KB each)
    road_normal.ktx2
    grass_diffuse.ktx2
    building_facade.ktx2
  /hdr/            # Environment maps (small EXR, ~100-500KB)
    sky_day.hdr
    sky_dusk.hdr
    sky_night.hdr
```

**KTX2 compression workflow:**
```bash
# Install gltf-transform
npm install -g @gltf-transform/cli

# Convert PNG to KTX2 (ETC1S for diffuse, UASTC for normals)
gltf-transform uastc texture.png texture_normal.ktx2  # for normal maps
gltf-transform etc1s texture.png texture_diffuse.ktx2 # for diffuse

# Or use toktx directly
toktx --bcmp road_diffuse.png road_diffuse.ktx2  # ETC1S
toktx --uastc road_normal.png road_normal.ktx2   # UASTC
```

**Loading KTX2 in Three.js:**
```javascript
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.180.0/examples/jsm/libs/basis/');

const roadNormal = ktx2Loader.load('assets/ktx2/road_normal.ktx2');
```

---

## 5. Three.js Specific Optimizations

### 5.1 LOD (Level of Detail)

```javascript
// Use THREE.LOD for complex objects like the car
import { LOD } from 'three';

const carLOD = new THREE.LOD();

// High detail: full car mesh (12+ meshes, windows, wheels, lights)
const carHighDetail = createDetailedCarMesh();
carLOD.addLevel(carHighDetail, 0);

// Medium detail: simplified car body
const carMediumDetail = createSimplifiedCarMesh();
carLOD.addLevel(carMediumDetail, 50);

// Low detail: just a box with car color
const carLowDetail = new THREE.Mesh(
  new THREE.BoxGeometry(2, 1, 4),
  new THREE.MeshStandardMaterial({ color: 0x00cc44 })
);
carLOD.addLevel(carLowDetail, 150);

scene.add(carLOD);
```

### 5.2 Frustum Culling

Three.js does automatic frustum culling. Ensure it works:
```javascript
// This is ON by default — just make sure bounding boxes are correct
mesh.frustumCulled = true; // default

// For InstancedMesh, ensure bounding sphere is computed
instancedMesh.computeBoundingSphere();

// Manual culling for chunk-based terrain
function updateVisibleChunks(camera, terrainChunks) {
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projScreenMatrix);
  
  terrainChunks.forEach(chunk => {
    chunk.visible = frustum.intersectsBox(chunk.boundingBox);
  });
}
```

### 5.3 Merge Geometries for Static Objects

```javascript
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Merge all static road segments into one geometry
const roadGeometries = [];
for (const road of roads) {
  roadGeometries.push(road.geometry.clone().applyMatrix4(road.matrix));
}
const mergedRoads = mergeGeometries(roadGeometries);
const roadMesh = new THREE.Mesh(mergedRoads, roadMaterial);
// 50 road segments → 1 draw call
```

### 5.4 Texture Atlasing

```javascript
// Combine multiple small textures into one atlas
// Reduces texture binds (expensive on mobile)
function createTextureAtlas(textures, size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const gridSize = Math.ceil(Math.sqrt(textures.length));
  const cellSize = size / gridSize;
  const uvOffsets = [];
  
  textures.forEach((tex, i) => {
    const col = i % gridSize;
    const row = Math.floor(i / gridSize);
    ctx.drawImage(tex.canvas, col * cellSize, row * cellSize, cellSize, cellSize);
    uvOffsets.push({
      u: col / gridSize,
      v: 1 - (row + 1) / gridSize,  // flip Y
      s: 1 / gridSize,
      t: 1 / gridSize,
    });
  });
  
  const atlas = new THREE.CanvasTexture(canvas);
  return { texture: atlas, offsets: uvOffsets };
}
```

### 5.5 Compressed Textures (KTX2/Basis)

```javascript
// KTX2 with Basis Universal — hardware decompressed on GPU
// 4-6x smaller memory than PNG/JPEG
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.180.0/examples/jsm/libs/basis/');
ktx2Loader.detectSupport(renderer); // auto-detect ETC/ASTC/BC support

// UASTC for normal maps (higher quality)
// ETC1S for diffuse/albedo (smaller files)
```

**Texture format support on iPad:**
- ETC1/ETC2: ✅ Supported (standard mobile format)
- ASTC: ✅ Supported on A8+ chips (best quality/compression)
- BC1-7: ❌ Desktop only
- PVRTC: ✅ Legacy Apple format

### 5.6 BufferGeometry Optimization

```javascript
// Reduce vertex count by using indexed geometry
const geo = new THREE.BoxGeometry(1, 1, 1);
geo.toNonIndexed(); // If you need non-indexed (rare)

// Remove unused attributes
geo.deleteAttribute('uv2'); // if not using lightmaps

// Compute bounding sphere for frustum culling
geo.computeBoundingSphere();
```

### 5.7 Object Pooling for Dynamic Entities

```javascript
class ObjectPool {
  constructor(factory, reset, initialSize = 20) {
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    for (let i = 0; i < initialSize; i++) {
      const obj = factory();
      obj.visible = false;
      this.pool.push(obj);
    }
  }
  acquire() {
    const obj = this.pool.pop() || this.factory();
    obj.visible = true;
    return obj;
  }
  release(obj) {
    this.reset(obj);
    obj.visible = false;
    this.pool.push(obj);
  }
}
```

### 5.8 Frame Timing & Delta-based Movement

```javascript
// Use delta time for frame-rate independent movement
const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();
  
  // Physics: scale by delta
  carVelocity.multiplyScalar(1 - drag * delta);
  carPosition.add(carVelocity.clone().multiplyScalar(delta));
  
  // Render
  composer.render();
}
```

---

## 6. Real Code Examples & References

### 6.1 Key Three.js Examples to Study

| Example | URL | What to Learn |
|---------|-----|--------------|
| WebGPU Bloom | https://threejs.org/examples/webgpu_postprocessing_bloom.html | WebGPU post-processing pipeline |
| PMREM Generator | https://threejs.org/examples/?q=env#webgl_materials_envmaps | Environment map generation |
| RoomEnvironment | https://threejs.org/examples/?q=room#webgl_materials_envmap_room | Procedural indoor env map |
| InstancedMesh | https://threejs.org/examples/?q=instan#webgl_instancing_morph | Instanced rendering |
| Reflector | https://threejs.org/examples/?q=refl#webgl_mirror | Planar reflections for water |
| CSM | https://threejs.org/examples/?q=csm#webgl_csm | Cascaded shadow maps |
| ACES Tone Mapping | https://threejs.org/examples/?q=tone#webgl_tonemapping | Cinematic tone mapping |

### 6.2 GitHub Repos to Study

| Repository | Description |
|-----------|-------------|
| `mauriciopoppe/Three.js-City` | Interactive 3D city with driving — closest existing example |
| `zakky8/web-optimization` | Comprehensive Three.js/WebGL/WebGPU perf knowledge base (48 topic folders) |
| `alton47/threejs-skills` | Three.js post-processing skill with bloom, SSAO, etc. |
| `Nice-Wolf-Studio/claude-skills-threejs-ecs-ts` | Three.js post-processing for mobile |

### 6.3 Key Three.js API Summary for This Project

```javascript
// === IMPORTS NEEDED (all from three/addons/) ===
// Post-processing
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// Environment
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Shadows
import { CSM } from 'three/addons/csm/CSM.js';

// Water
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Water } from 'three/addons/objects/Water.js';

// Utilities
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Texture loading
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
```

### 6.4 CDN Import Map for Single HTML File

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.180.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.180.0/examples/jsm/",
    "three/webgpu": "https://unpkg.com/three@0.180.0/build/three.webgpu.js",
    "three/tsl": "https://unpkg.com/three@0.180.0/build/three.tsl.js"
  }
}
</script>

<script type="module">
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
// etc.
</script>
```

---

## 7. Performance Budget

### 7.1 iPad Safari Target (30 FPS)

| Resource | Budget | Notes |
|----------|--------|-------|
| **Draw calls** | < 80 | Use InstancedMesh for buildings/trees. Currently ~200+ individual meshes |
| **Triangles/frame** | 150-250K | Reduce terrain segments, use LOD for distant objects |
| **Texture memory** | < 100MB total | Use 512x512 procedural textures (1MB each RGBA). KTX2 if hosting files |
| **Max texture dimension** | 2048 | One hero texture (sky/environment). Most textures: 512-1024 |
| **Shadow map** | 1024x1024 | Single directional light shadow. Mobile: 2 CSM cascades max |
| **Pixel ratio** | 1.5 max | Cap DPR — iPad Pro at 2x = too many pixels |
| **Post-processing** | Bloom (half-res) + FXAA + Output | Skip SSAO/SSR on mobile |
| **Active lights** | ≤ 3 | Sun/moon + hemisphere ambient + 1 point light (headlights) |
| **Shader complexity** | mediump | Use `precision mediump float` in custom shaders |
| **Frame time budget** | 33ms (30fps) | 20ms render + 8ms physics + 5ms JS overhead |

### 7.2 Desktop Target (60 FPS)

| Resource | Budget | Notes |
|----------|--------|-------|
| **Draw calls** | < 200 | |
| **Triangles/frame** | 500K-1M | |
| **Texture memory** | < 500MB | |
| **Shadow map** | 2048x2048 | 4 CSM cascades |
| **Pixel ratio** | 2.0 | |
| **Post-processing** | Full bloom + SMAA + SSAO + vignette | |
| **Active lights** | ≤ 5 | |

### 7.3 Performance Optimization Impact (from real measurements)

Source: digitalstrategyforce.com mobile Three.js optimization guide

| Optimization | Frame Time | FPS |
|-------------|-----------|-----|
| Unoptimized (all assets full quality) | 42ms | 24fps |
| + Geometry reduction (50%) | 28ms | 36fps |
| + InstancedMesh (draw calls 200→1) | 18ms | 55fps |
| + Half-res bloom | 12ms | 83fps |
| + Zone visibility culling | 8ms | 125fps |

### 7.4 Current Code Issues Identified

From analyzing `index.html` (~4962 lines):

1. **No post-processing** — no bloom, no tone mapping pipeline
2. **No environment maps** — PBR materials without IBL look flat
3. **Individual meshes for buildings** — each building is a separate `THREE.Mesh` with its own `BoxGeometry`
4. **No texture maps** — all materials use flat colors only
5. **No LOD system** — all objects render at full detail at any distance
5. **No tone mapping** — `toneMapping` not set on renderer (defaults to `NoToneMapping`)
6. **No output color space** — may not be set correctly
7. **Shadow map likely at default 512** — needs explicit configuration
8. **No device tier detection** — same quality on all devices
9. **Antialiasing on renderer** — wastes memory, should use FXAA in post-processing
10. **Fog is linear** — exponential fog looks better and is cheaper

---

## 8. Phased Implementation Plan

### Phase 1: Foundation (Immediate Visual Win, Low Effort)
**Goal:** Environment maps + tone mapping + basic post-processing  
**Expected visual uplift:** 40% of the way to GTA 6 look  
**Estimated effort:** 2-4 hours  

- [ ] Add `PMREMGenerator` + `RoomEnvironment` or procedural sky env map
- [ ] Set `scene.environment` for IBL
- [ ] Set `renderer.toneMapping = THREE.ACESFilmicToneMapping`
- [ ] Set `renderer.toneMappingExposure = 1.0`
- [ ] Set `renderer.outputColorSpace = THREE.SRGBColorSpace`
- [ ] Add `EffectComposer` with `RenderPass` + `UnrealBloomPass` (half-res) + `FXAAShader` + `OutputPass`
- [ ] Switch `renderer.antialias = false` (FXAA handles it)
- [ ] Upgrade fog to `THREE.FogExp2` with time-of-day color
- [ ] Add device tier detection (mobile vs desktop quality)
- [ ] Cap pixel ratio at 1.5 for mobile

### Phase 2: Material & Texture Quality (Major Visual Win)
**Goal:** PBR textures, procedural normal maps, car paint material  
**Expected visual uplift:** 70% of the way to GTA 6 look  
**Estimated effort:** 4-6 hours  

- [ ] Generate procedural road texture with normal map (Canvas2D)
- [ ] Generate procedural grass texture with normal map
- [ ] Generate procedural building facade textures (windows, lit/unlit)
- [ ] Generate procedural roughness maps for varied surfaces
- [ ] Upgrade car body to `MeshPhysicalMaterial` with clearcoat (metallic paint)
- [ ] Upgrade water to `MeshPhysicalMaterial` with envMapIntensity + Reflector
- [ ] Add emissive windows on buildings at night (lit windows bloom)
- [ ] Update environment map when time-of-day changes
- [ ] Add chromatic aberration + vignette to post-processing (cinematic)

### Phase 3: Performance & Draw Call Reduction (Required for 30 FPS)
**Goal:** InstancedMesh, geometry merging, LOD, device tiers  
**Expected effort:** 3-5 hours  

- [ ] Convert all buildings to single `InstancedMesh` (150 meshes → 1 draw call)
- [ ] Convert all trees to single `InstancedMesh` with merged trunk+foliage geometry
- [ ] Convert rocks/walls to `InstancedMesh` or merged geometry
- [ ] Add `THREE.LOD` for car model (high/medium/low detail)
- [ ] Merge static road segments with `mergeGeometries`
- [ ] Implement chunk-based terrain visibility culling
- [ ] Tune shadow camera frustum tightly around visible area
- [ ] Set shadow map size based on device tier (1024 mobile, 2048 desktop)
- [ ] Add `CSM` for better shadow quality at distance (2 cascades mobile, 4 desktop)
- [ ] Add `renderer.info` monitoring in debug mode

### Phase 4: Advanced Effects (GTA 6 Polish)
**Goal:** SSR, SSAO, water reflections, neon signage, rain effects  
**Expected effort:** 4-8 hours  

- [ ] Add `Reflector` for water surface (planar reflections)
- [ ] Add `SSAOPass` at half resolution (desktop only, skip on mobile)
- [ ] Add neon emissive signage on buildings (bloom makes these pop at night)
- [ ] Add wet road effect (increase `envMapIntensity` + `clearcoat` on road material during/after rain)
- [ ] Add headlight cones with volumetric-like fog effect
- [ ] Add lens flare for sun/moon when visible
- [ ] Add subtle film grain for cinematic texture
- [ ] Implement weather-based material changes (wetness, fog density)

### Phase 5: WebGPU Migration (Future-Proofing)
**Goal:** Migrate to `WebGPURenderer` with TSL shaders  
**Expected effort:** 6-10 hours  

- [ ] Switch from `WebGLRenderer` to `WebGPURenderer` with `await renderer.init()`
- [ ] Migrate post-processing to TSL-based pipeline (`pass().pipe(bloom()).pipe(fxaa())`)
- [ ] Move particle systems to compute shaders (for rain, dust, etc.)
- [ ] Use TSL for custom shaders (fresnel, water animation, etc.)
- [ ] Test WebGPU on Safari 26+ iPad, verify WebGL2 fallback works
- [ ] Consider GPU-driven rendering with indirect draws for massive scenes

### Phase 6: KTX2 Texture Pipeline (If Hosting Assets)
**Goal:** Compressed textures for better quality at lower memory  
**Expected effort:** 2-4 hours  

- [ ] Generate KTX2 textures from procedural Canvas textures (one-time bake)
- [ ] Or source small CC0 textures and compress to KTX2
- [ ] Set up `KTX2Loader` with CDN transcoder path
- [ ] Replace Canvas textures with KTX2 where quality matters
- [ ] Verify ETC2/ASTC support on target iPads

---

## Summary: The 80/20 Path to GTA 6 Look on iPad

The **top 5 changes** that will get 80% of the visual upgrade with 20% of the effort:

1. **Environment maps via PMREMGenerator** — instantly makes all PBR materials look realistic with proper reflections and ambient lighting. No downloads needed (procedural sky scene).

2. **Post-processing: Bloom (half-res) + ACES tone mapping + FXAA** — adds cinematic glow to lights/sun/windows, corrects color response, and smooths edges. The single most visible quality upgrade.

3. **InstancedMesh for buildings & trees** — reduces draw calls from 200+ to ~10, enabling 30+ FPS on iPad with room for more effects.

4. **Procedural textures via Canvas2D** — replaces flat-color materials with textured surfaces (road grain, grass blades, building windows). Normal maps add surface detail without geometry cost.

5. **MeshPhysicalMaterial with clearcoat for car & water** — gives the car a glossy metallic paint look and water a reflective surface that catches the environment map. This is what makes vehicles look "GTA-like."

**Total estimated effort for 80% result:** 8-12 hours across Phases 1-3.

---

## Appendix: Key Three.js Version Features

| Feature | Min Three.js Version | Notes |
|---------|---------------------|-------|
| WebGPURenderer | r171 (2025) | Auto WebGL2 fallback |
| TSL (Three Shader Language) | r171 | Cross-backend shaders |
| BatchedMesh | r156 | Multiple geometries, one draw call |
| InstancedMesh | r119 | Same geometry, one draw call |
| PMREMGenerator | r115 | Environment map from scene |
| RoomEnvironment | r122 | Procedural indoor env |
| ACESFilmicToneMapping | r111 | Cinematic tone mapping |
| OutputPass | r152 | Handles tone mapping in post-processing |
| Reflector | r129 | Planar reflections |
| CSM (Cascaded Shadow Maps) | r115 | Better shadows for large scenes |
| Water object | r118 | Advanced water with reflections |
| KTX2Loader | r133 | Compressed texture loading |
| SRGBColorSpace | r152 | Correct color output |

**Recommended Three.js version for this project:** `0.180.0` or later (latest stable as of Aug 2026).

---

*Research compiled from: Digital Foundry GTA 6 Trailer 2 analysis (May 2025), Utsubo 100 Three.js Tips (March 2026), Digital Strategy Force mobile optimization guide (Feb 2026), web.dev WebGPU blog (Nov 2025), WebGL2 Fundamentals cross-platform guide, and Three.js official documentation/examples.*