import * as THREE from 'three';

// ============================================================
// Vibe Drive Jersey 3D — main.js
// ============================================================
// Procedural Perlin-noise terrain shaped like Jersey (island ~8km x 15km),
// low-poly 3D car, third-person chase camera, touch + keyboard controls,
// sky/lighting, weather HUD from Open-Meteo.
// ============================================================

// ---- Constants ----
const ISLAND_W = 8000;   // X axis (east-west, ~8km)
const ISLAND_H = 15000;  // Z axis (north-south, ~15km)
const MAX_HEIGHT = 143;  // Les Platons — highest point in Jersey (metres)
const TERRAIN_SEGS = 200; // 200x200 = 40k verts, ~80k triangles — mobile-friendly

// ---- Scene, Renderer, Camera ----
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x88bbee, 0.00003);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 10, 30000);

// ---- Sky ----
const skyGeo = new THREE.SphereGeometry(20000, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color(0x0077ff) },
    bottomColor: { value: new THREE.Color(0xaaccff) },
    offset: { value: 800 },
    exponent: { value: 0.6 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `,
  side: THREE.BackSide,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// ---- Lighting ----
const ambient = new THREE.AmbientLight(0x6688aa, 0.6);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff5dd, 1.0);
sun.position.set(2000, 3000, 1000);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.left = -500;
sun.shadow.camera.right = 500;
sun.shadow.camera.top = 500;
sun.shadow.camera.bottom = -500;
sun.shadow.camera.near = 100;
sun.shadow.camera.far = 8000;
scene.add(sun);

const hemi = new THREE.HemisphereLight(0x88bbff, 0x445522, 0.4);
scene.add(hemi);

// ============================================================
// Perlin Noise (classic 2D — Ken Perlin's improved noise)
// ============================================================
class PerlinNoise {
  constructor(seed = Math.random() * 1000) {
    this.permutation = new Array(512);
    const p = new Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Seeded shuffle
    let rng = seed;
    for (let i = 255; i > 0; i--) {
      rng = (rng * 9301 + 49297) % 233280;
      const j = Math.floor((rng / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.permutation[i] = p[i & 255];
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(a, b, t) { return a + t * (b - a); }
  grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const p = this.permutation;
    const A = p[X] + Y;
    const B = p[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(p[A], x, y), this.grad(p[B], x - 1, y), u),
      this.lerp(this.grad(p[A + 1], x, y - 1), this.grad(p[B + 1], x - 1, y - 1), u),
      v
    );
  }

  // Multi-octave fractal noise (fbm)
  fbm(x, y, octaves = 5, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

const perlin = new PerlinNoise(42);

// ============================================================
// Terrain — Jersey-shaped island using distance-field masking
// ============================================================
// Jersey is roughly elliptical, ~8km E-W, ~15km N-S.
// We use a smooth distance field from the ellipse center to create the island
// shape and add Perlin noise for surface detail.

function getIslandMask(x, z) {
  // Normalize to ellipse coordinates (-1..1)
  const nx = x / (ISLAND_W * 0.5);
  const nz = z / (ISLAND_H * 0.5);
  // Elliptical distance field
  const d = nx * nx + nz * nz;
  // Smooth mask: 1 in center, 0 at/beyond coast
  // Use a smoothstep for coastline variation
  const coastNoise = perlin.fbm(x * 0.0008, z * 0.0008, 3, 0.5, 2.0) * 0.15;
  const dAdjusted = d + coastNoise;
  return Math.max(0, 1.0 - dAdjusted);
}

function getTerrainHeight(x, z) {
  // x, z in world coordinates (meters), centered at origin
  const mask = getIslandMask(x, z);
  if (mask <= 0) return 0; // water level

  // Base terrain from fbm — scale the noise coordinates to get nice hills
  // Large hills + medium detail + small roughness
  const baseFreq = 0.0003;
  const base = perlin.fbm(x * baseFreq, z * baseFreq, 5, 0.5, 2.0);

  // Base is in [-1, 1] — map to [0, MAX_HEIGHT]
  let height = (base * 0.5 + 0.5) * MAX_HEIGHT;

  // Add medium-frequency detail for rolling hills
  const detail = perlin.fbm(x * 0.0015, z * 0.0015, 3, 0.4, 2.0);
  height += detail * 15;

  // Apply island mask — smooth coast to interior
  // Use a power curve so the interior is mostly full height, coast drops quickly
  const maskShaped = Math.pow(mask, 0.7);
  height *= maskShaped;

  // Ensure coast beaches are low (near mask edge)
  if (mask < 0.2) {
    height *= mask / 0.2;
  }

  return Math.max(0, height);
}

// ---- Terrain mesh ----
const terrainGeo = new THREE.PlaneGeometry(ISLAND_W, ISLAND_H, TERRAIN_SEGS, TERRAIN_SEGS);
terrainGeo.rotateX(-Math.PI / 2); // make horizontal (Y up)

const positions = terrainGeo.attributes.position;
const colors = new Float32Array(positions.count * 3);
const tempColor = new THREE.Color();

for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i);
  const z = positions.getZ(i);
  let h = getTerrainHeight(x, z);

  // Ensure minimum 0
  h = Math.max(0, h);
  positions.setY(i, h);

  // Color by height + slope
  const mask = getIslandMask(x, z);
  if (h < 2 && mask < 0.25) {
    // Beach — sandy
    tempColor.setRGB(0.85, 0.80, 0.62);
  } else if (h < 15) {
    // Lowland — green fields
    tempColor.setRGB(0.35, 0.62, 0.28);
  } else if (h < 50) {
    // Midland — darker green
    tempColor.setRGB(0.25, 0.50, 0.20);
  } else if (h < 90) {
    // Upland — brown-green
    tempColor.setRGB(0.38, 0.42, 0.22);
  } else {
    // Cliffs/peaks — grey-brown rock
    tempColor.setRGB(0.42, 0.38, 0.30);
  }

  // Add subtle noise variation to color
  const v = perlin.noise2D(x * 0.01, z * 0.01) * 0.08;
  tempColor.r = Math.max(0, Math.min(1, tempColor.r + v));
  tempColor.g = Math.max(0, Math.min(1, tempColor.g + v));
  tempColor.b = Math.max(0, Math.min(1, tempColor.b + v));

  colors[i * 3] = tempColor.r;
  colors[i * 3 + 1] = tempColor.g;
  colors[i * 3 + 2] = tempColor.b;
}

terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.0,
  flatShading: false,
});
const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
terrainMesh.receiveShadow = true;
scene.add(terrainMesh);

// ---- Water plane ----
const waterGeo = new THREE.PlaneGeometry(40000, 40000);
waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x1166aa,
  transparent: true,
  opacity: 0.78,
  roughness: 0.3,
  metalness: 0.5,
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.y = -1.5;
scene.add(water);

// ---- Simple "road" strip (decorative path following valleys) ----
// Generate a path along a sine curve through the island for visual interest
const roadPoints = [];
for (let t = 0; t <= 1; t += 0.02) {
  const x = (t - 0.5) * ISLAND_W * 0.7;
  const z = Math.sin(t * Math.PI * 2) * ISLAND_H * 0.15 + (t - 0.5) * ISLAND_H * 0.6;
  const y = getTerrainHeight(x, z) + 1.5;
  roadPoints.push(new THREE.Vector3(x, y, z));
}
const roadCurve = new THREE.CatmullRomCurve3(roadPoints);
const roadGeo = new THREE.TubeGeometry(roadCurve, 200, 8, 6, false);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.receiveShadow = true;
scene.add(road);

// ============================================================
// 3D Car — low-poly from BoxGeometry
// ============================================================
function createCar() {
  const car = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(42, 12, 84);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.4 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 12;
  body.castShadow = true;
  body.receiveShadow = true;
  car.add(body);

  // Cabin (smaller box on top, toward the back-center)
  const cabinGeo = new THREE.BoxGeometry(36, 14, 42);
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x224488, roughness: 0.3, metalness: 0.5, transparent: true, opacity: 0.7 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 25, -8);
  cabin.castShadow = true;
  car.add(cabin);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(9, 9, 10, 12);
  wheelGeo.rotateZ(Math.PI / 2); // axle along X
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  const wheelPositions = [
    [-22, 6, 28],   // front-left
    [22, 6, 28],    // front-right
    [-22, 6, -28],  // rear-left
    [22, 6, -28],   // rear-right
  ];
  const wheels = [];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    car.add(wheel);
    wheels.push(wheel);
  }
  car.userData.wheels = wheels;

  // Headlights (small emissive spheres)
  const headlightGeo = new THREE.SphereGeometry(4, 8, 8);
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.6 });

  const hlLeft = new THREE.Mesh(headlightGeo, headlightMat);
  hlLeft.position.set(-14, 14, 42);
  car.add(hlLeft);

  const hlRight = new THREE.Mesh(headlightGeo, headlightMat);
  hlRight.position.set(14, 14, 42);
  car.add(hlRight);

  // Tail lights (red emissive)
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 0.5 });
  const tlLeft = new THREE.Mesh(headlightGeo, tailMat);
  tlLeft.position.set(-14, 14, -42);
  car.add(tlLeft);
  const tlRight = new THREE.Mesh(headlightGeo, tailMat);
  tlRight.position.set(14, 14, -42);
  car.add(tlRight);

  // Actual light sources for night driving
  const headLightL = new THREE.SpotLight(0xffffcc, 0, 600, Math.PI / 6, 0.5, 1.5);
  headLightL.position.set(-14, 14, 42);
  headLightL.target.position.set(-14, 0, 100);
  car.add(headLightL);
  car.add(headLightL.target);

  const headLightR = new THREE.SpotLight(0xffffcc, 0, 600, Math.PI / 6, 0.5, 1.5);
  headLightR.position.set(14, 14, 42);
  headLightR.target.position.set(14, 0, 100);
  car.add(headLightR);
  car.add(headLightR.target);

  car.userData.headlights = [headLightL, headLightR];
  car.userData.headlightMeshes = [hlLeft, hlRight];

  return car;
}

const car = createCar();
// Start on the road near St Helier area (south coast)
const startPos = roadPoints[Math.floor(roadPoints.length * 0.15)] || new THREE.Vector3(0, getTerrainHeight(0, 0) + 20, 0);
car.position.copy(startPos);
car.position.y = getTerrainHeight(startPos.x, startPos.z) + 8;
scene.add(car);

// ============================================================
// Controls — keyboard + touch (pointerdown/pointerup)
// ============================================================
const keys = { left: false, right: false, accel: false, brake: false };

// Keyboard
window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': keys.left = true; break;
    case 'ArrowRight': case 'd': case 'D': keys.right = true; break;
    case 'ArrowUp': case 'w': case 'W': keys.accel = true; break;
    case 'ArrowDown': case 's': case 'S': keys.brake = true; break;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': keys.left = false; break;
    case 'ArrowRight': case 'd': case 'D': keys.right = false; break;
    case 'ArrowUp': case 'w': case 'W': keys.accel = false; break;
    case 'ArrowDown': case 's': case 'S': keys.brake = false; break;
  }
});

// Touch / pointer controls
function bindControlButton(id, key) {
  const el = document.getElementById(id);
  if (!el) return;

  const press = (e) => {
    e.preventDefault();
    keys[key] = true;
    el.classList.add('pressed');
  };
  const release = (e) => {
    e.preventDefault();
    keys[key] = false;
    el.classList.remove('pressed');
  };

  // pointerdown / pointerup / pointercancel for iPad Safari
  el.addEventListener('pointerdown', press, { passive: false });
  el.addEventListener('pointerup', release, { passive: false });
  el.addEventListener('pointercancel', release, { passive: false });
  el.addEventListener('pointerleave', release, { passive: false });
  // Fallback touch events
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend', release, { passive: false });
  el.addEventListener('touchcancel', release, { passive: false });
}

bindControlButton('btn-left', 'left');
bindControlButton('btn-right', 'right');
bindControlButton('btn-gas', 'accel');
bindControlButton('btn-brake', 'brake');

// Prevent context menu / long-press
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================
// Car physics
// ============================================================
let carSpeed = 0;      // units/sec (forward)
let carHeading = 0;    // radians (Y-axis rotation)
const MAX_SPEED = 280; // ~280 m/s visual scale (fast for fun)
const ACCEL = 80;
const BRAKE = 150;
const FRICTION = 40;
const TURN_SPEED = 1.2; // rad/sec at full speed

function updateCar(dt) {
  // Accelerate / brake
  if (keys.accel) {
    carSpeed += ACCEL * dt;
  } else if (keys.brake) {
    carSpeed -= BRAKE * dt;
  } else {
    // Natural friction
    if (carSpeed > 0) carSpeed = Math.max(0, carSpeed - FRICTION * dt);
    else if (carSpeed < 0) carSpeed = Math.min(0, carSpeed + FRICTION * dt);
  }
  carSpeed = Math.max(-MAX_SPEED * 0.4, Math.min(MAX_SPEED, carSpeed));

  // Steering — only effective when moving
  const speedFactor = Math.min(Math.abs(carSpeed) / 50, 1);
  if (keys.left) carHeading += TURN_SPEED * dt * speedFactor * (carSpeed >= 0 ? 1 : -1);
  if (keys.right) carHeading -= TURN_SPEED * dt * speedFactor * (carSpeed >= 0 ? 1 : -1);

  // Move
  const dx = Math.sin(carHeading) * carSpeed * dt;
  const dz = Math.cos(carHeading) * carSpeed * dt;
  car.position.x += dx;
  car.position.z += dz;

  // Clamp to island bounds (keep car on land)
  const margin = 200;
  const maxX = ISLAND_W * 0.5 - margin;
  const maxZ = ISLAND_H * 0.5 - margin;
  if (car.position.x > maxX) car.position.x = maxX;
  if (car.position.x < -maxX) car.position.x = -maxX;
  if (car.position.z > maxZ) car.position.z = maxZ;
  if (car.position.z < -maxZ) car.position.z = -maxZ;

  // Follow terrain height
  const groundY = getTerrainHeight(car.position.x, car.position.z);
  car.position.y = groundY + 8;

  // Apply rotation
  car.rotation.y = carHeading;

  // Tilt car slightly when turning (visual roll)
  const targetTilt = (keys.left ? 0.05 : 0) - (keys.right ? 0.05 : 0);
  car.rotation.z = THREE.MathUtils.lerp(car.rotation.z, targetTilt * speedFactor, 0.1);

  // Slight pitch based on slope (look ahead)
  const aheadX = car.position.x + Math.sin(carHeading) * 50;
  const aheadZ = car.position.z + Math.cos(carHeading) * 50;
  const aheadY = getTerrainHeight(aheadX, aheadZ);
  const slope = (aheadY - groundY) / 50;
  car.rotation.x = THREE.MathUtils.lerp(car.rotation.x, -slope * 0.3, 0.1);

  // Spin wheels
  const wheelSpin = carSpeed * dt * 0.05;
  for (const wheel of car.userData.wheels) {
    wheel.rotation.y += wheelSpin;
  }

  // Headlights on if night
  const isNight = weatherState.isDay === 0;
  const targetIntensity = isNight ? 2.0 : 0;
  for (const hl of car.userData.headlights) {
    hl.intensity = targetIntensity;
  }
  for (const hlm of car.userData.headlightMeshes) {
    hlm.material.emissiveIntensity = isNight ? 1.0 : 0.4;
  }
}

// ============================================================
// Chase camera
// ============================================================
const camOffset = new THREE.Vector3(0, 60, -120);
let camCurrentPos = new THREE.Vector3().copy(car.position).add(camOffset);

function updateCamera(dt) {
  // Desired camera position: behind and above car
  const behindX = -Math.sin(carHeading) * 120;
  const behindZ = -Math.cos(carHeading) * 120;
  const desiredPos = new THREE.Vector3(
    car.position.x + behindX,
    car.position.y + 60,
    car.position.z + behindZ
  );

  // Smooth lerp
  camCurrentPos.lerp(desiredPos, 1 - Math.pow(0.001, dt));

  // Ensure camera doesn't go underground
  const camGround = getTerrainHeight(camCurrentPos.x, camCurrentPos.z);
  if (camCurrentPos.y < camGround + 20) {
    camCurrentPos.y = camGround + 20;
  }

  camera.position.copy(camCurrentPos);
  camera.lookAt(car.position.x, car.position.y + 10, car.position.z);
}

// ============================================================
// Weather — Open-Meteo API
// ============================================================
const weatherState = {
  temp: null,
  wind: null,
  code: null,
  isDay: 1,
  desc: 'Loading…',
  icon: '🌤️',
};

const WEATHER_CODES = {
  0: { desc: 'Clear sky', icon: '☀️' },
  1: { desc: 'Mainly clear', icon: '🌤️' },
  2: { desc: 'Partly cloudy', icon: '⛅' },
  3: { desc: 'Overcast', icon: '☁️' },
  45: { desc: 'Fog', icon: '🌫️' },
  48: { desc: 'Rime fog', icon: '🌫️' },
  51: { desc: 'Light drizzle', icon: '🌦️' },
  53: { desc: 'Drizzle', icon: '🌦️' },
  55: { desc: 'Heavy drizzle', icon: '🌧️' },
  56: { desc: 'Freezing drizzle', icon: '🌧️' },
  57: { desc: 'Freezing drizzle', icon: '🌧️' },
  61: { desc: 'Light rain', icon: '🌦️' },
  63: { desc: 'Rain', icon: '🌧️' },
  65: { desc: 'Heavy rain', icon: '🌧️' },
  66: { desc: 'Freezing rain', icon: '🌧️' },
  67: { desc: 'Freezing rain', icon: '🌧️' },
  71: { desc: 'Light snow', icon: '🌨️' },
  73: { desc: 'Snow', icon: '❄️' },
  75: { desc: 'Heavy snow', icon: '❄️' },
  77: { desc: 'Snow grains', icon: '🌨️' },
  80: { desc: 'Rain showers', icon: '🌦️' },
  81: { desc: 'Rain showers', icon: '🌧️' },
  82: { desc: 'Violent showers', icon: '⛈️' },
  85: { desc: 'Snow showers', icon: '🌨️' },
  86: { desc: 'Snow showers', icon: '❄️' },
  95: { desc: 'Thunderstorm', icon: '⛈️' },
  96: { desc: 'Thunderstorm', icon: '⛈️' },
  99: { desc: 'Thunderstorm', icon: '⛈️' },
};

async function fetchWeather() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=49.21&longitude=-2.13&current=temperature_2m,wind_speed_10m,weather_code,is_day&timezone=Europe/Jersey';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API error: ' + res.status);
    const data = await res.json();
    const cur = data.current;
    weatherState.temp = cur.temperature_2m;
    weatherState.wind = cur.wind_speed_10m;
    weatherState.code = cur.weather_code;
    weatherState.isDay = cur.is_day;

    const info = WEATHER_CODES[cur.weather_code] || { desc: 'Unknown', icon: '❓' };
    weatherState.desc = info.desc;
    weatherState.icon = info.icon;

    updateWeatherHUD();

    // Adjust lighting for day/night
    applyDayNight();

    // Rain effect
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(cur.weather_code)) {
      createRain();
    }

    // Fog for foggy weather
    if ([45, 48].includes(cur.weather_code)) {
      scene.fog.density = 0.00008;
    }
  } catch (e) {
    console.warn('Weather fetch failed:', e);
    weatherState.desc = 'Unavailable';
    weatherState.icon = '🤷';
    updateWeatherHUD();
  }
}

function updateWeatherHUD() {
  document.getElementById('temp').textContent = weatherState.temp !== null ? `${Math.round(weatherState.temp)}°` : '—°';
  document.getElementById('weather-desc').textContent = weatherState.desc;
  document.getElementById('weather-icon').textContent = weatherState.icon;
  document.getElementById('time-badge').textContent = weatherState.isDay === 1 ? '☀️ Day' : '🌙 Night';
}

function applyDayNight() {
  if (weatherState.isDay === 0) {
    // Night
    sun.intensity = 0.15;
    sun.color.setHex(0x4466aa);
    ambient.intensity = 0.15;
    ambient.color.setHex(0x223366);
    hemi.intensity = 0.2;
    skyMat.uniforms.topColor.value.setHex(0x000033);
    skyMat.uniforms.bottomColor.value.setHex(0x110022);
    scene.fog.color.setHex(0x000033);
  } else {
    // Day
    sun.intensity = 1.0;
    sun.color.setHex(0xfff5dd);
    ambient.intensity = 0.6;
    ambient.color.setHex(0x6688aa);
    hemi.intensity = 0.4;
    skyMat.uniforms.topColor.value.setHex(0x0077ff);
    skyMat.uniforms.bottomColor.value.setHex(0xaaccff);
    scene.fog.color.setHex(0x88bbee);
  }
}

// ---- Rain particle system ----
let rainParticles = null;
function createRain() {
  if (rainParticles) return; // already exists

  const count = 3000;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2000;
    positions[i * 3 + 1] = Math.random() * 600;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    velocities[i] = 200 + Math.random() * 300;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0x99ccff,
    size: 3,
    transparent: true,
    opacity: 0.5,
  });

  rainParticles = new THREE.Points(geo, mat);
  rainParticles.userData.velocities = velocities;
  scene.add(rainParticles);
}

function updateRain(dt) {
  if (!rainParticles) return;
  const positions = rainParticles.geometry.attributes.position;
  const velocities = rainParticles.userData.velocities;

  // Follow car
  rainParticles.position.x = car.position.x;
  rainParticles.position.z = car.position.z;

  for (let i = 0; i < positions.count; i++) {
    let y = positions.getY(i);
    y -= velocities[i] * dt;
    if (y < 0) y = 600;
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
}

// ============================================================
// Wind effect on car
// ============================================================
function applyWind(dt) {
  if (!weatherState.wind) return;
  // Subtle lateral push based on wind speed (m/s)
  // Use a constant wind direction for simplicity
  const windForce = weatherState.wind * 0.5; // tweak scale
  const windDir = Math.PI / 4; // NE wind
  const wx = Math.sin(windDir) * windForce * dt;
  const wz = Math.cos(windDir) * windForce * dt;
  car.position.x += wx * 0.1;
  car.position.z += wz * 0.1;
}

// ============================================================
// Speedometer
// ============================================================
function updateSpeedo() {
  // Convert internal speed to km/h (arbitrary visual scale: 1 unit/s ≈ 0.5 km/h)
  const kmh = Math.round(Math.abs(carSpeed) * 0.5);
  document.getElementById('speed').textContent = `Speed: ${kmh} km/h`;
}

// ============================================================
// Window resize
// ============================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// Animation loop
// ============================================================
let lastTime = performance.now();
let loadingHidden = false;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05); // clamp dt
  lastTime = now;

  updateCar(dt);
  applyWind(dt);
  updateCamera(dt);
  updateRain(dt);
  updateSpeedo();

  // Animate water slightly
  water.material.opacity = 0.75 + Math.sin(now * 0.001) * 0.03;

  renderer.render(scene, camera);

  // Hide loading after first frame
  if (!loadingHidden) {
    loadingHidden = true;
    const el = document.getElementById('loading');
    if (el) el.style.display = 'none';
  }
}

// Start
fetchWeather();
animate();