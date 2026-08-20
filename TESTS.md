# Vibe Drive Jersey 3D — Test Plan & Issue Log

## Code Coverage Assessment

The app is a single HTML file with inline ES module JavaScript. There are no external test files — all code runs in the browser. Coverage is assessed by functional area.

### Areas Tested (manually or via curl verification)
| Area | Coverage | Method |
|------|----------|--------|
| HTML structure | ✅ | curl grep for key elements |
| Three.js import | ✅ | curl grep for importmap |
| Terrain generation | ✅ | code review, heightmap function |
| Car rendering | ✅ | createCar factory function |
| Weather API | ✅ | Open-Meteo confirmed working |
| Server/Funnel | ✅ | curl HTTP 200 |
| Tailscale Funnel | ✅ | public URL verified |

### Areas NOT Tested (gaps)
| Area | Risk | Test Needed |
|------|------|-------------|
| Touch controls on iPad | HIGH | Manual test on device |
| Pointer steering on iPad | HIGH | Manual test on device |
| Plane mode switching | MEDIUM | Does vehicleMode toggle work? |
| AI car collision | LOW | Visual check |
| Radar rendering | MEDIUM | Canvas drawing correct? |
| Camera mode switching | MEDIUM | Does each cam mode position correctly? |
| Day/night lighting | LOW | Weather API returns is_day |
| Island boundary | MEDIUM | Can car drive off the edge? |
| Performance on iPad | HIGH | FPS check on device |
| Bird animation | LOW | Visual check |
| Landmark positions | LOW | Visual check |

## Issue Log (ordered by DAG dependency)

### I1: [CRITICAL] Steering not working on touch devices
**Root cause:** pointerdown was attached to canvas element, but HUD overlay (z-index: 50) and other elements with z-index: 100 blocked events from reaching the canvas.
**Fix:** Attached pointerdown/pointermove/pointerup to `document` instead of canvas. Added `isOnUI()` function to filter out touches on HUD elements. Buttons use `stopPropagation()` to prevent steering conflict.
**Status:** FIXED in latest version
**DAG:** No dependencies — fix is standalone

### I2: [HIGH] Radar too zoomed in to recognize Jersey
**Root cause:** RADAR_RANGE was 200, which only showed ~40% of the island.
**Fix:** Increased RADAR_RANGE to 350, radar canvas to 180px, added island fill color and AI car name labels.
**Status:** FIXED
**DAG:** No dependencies

### I3: [MEDIUM] No camera mode options
**Root cause:** Only chase camera existed.
**Fix:** Added 4 camera modes (Chase, Far, Top, Cockpit) with toggle buttons.
**Status:** FIXED
**DAG:** Depends on I1 fix (buttons need touch events)

### I4: [MEDIUM] No plane mode
**Root cause:** Fly button was disabled.
**Fix:** Implemented plane model, altitude physics, propeller animation, pitch on accel/brake. Fly button is now active.
**Status:** PARTIALLY FIXED (basic flight works, needs terrain collision + clouds)
**DAG:** Depends on I3 (camera modes should adapt to plane)

### I5: [MEDIUM] No landmarks
**Root cause:** Terrain had no recognizable features.
**Fix:** Added Mont Orgueil Castle (Gorey), La Corbière Lighthouse, Elizabeth Castle.
**Status:** FIXED
**DAG:** No dependencies

### I6: [LOW] No boat mode
**Status:** TICKETED (TICKETS-TRANSPORT.md)
**DAG:** Depends on tide data research

### I7: [HIGH] No automated tests
**Root cause:** Single HTML file, no test framework.
**Test plan:** 
1. Add a `test.html` file that loads the game in an iframe and checks:
   - Three.js loads without error
   - Scene has terrain mesh
   - Scene has car mesh
   - Weather fetch completes
   - Game loop is running (requestAnimationFrame called)
2. Add console assertions in the game itself (debug mode)
**Status:** TODO
**DAG:** Depends on I1 fix (can't test controls if they don't work)

### I8: [MEDIUM] Plane mode vehicle swap may not work correctly
**Root cause:** Using `carGroup.copy(plane)` to swap meshes — Three.js Group.copy may not deep-clone child meshes correctly.
**Fix needed:** Instead of copy, remove old carGroup from scene, add plane as new carGroup, update reference.
**Status:** NEEDS VERIFICATION
**DAG:** Depends on I4

## DAG Dependency Graph
```
I1 (steering) ──┬──> I7 (tests can't run without working controls)
                └──> I3 (camera buttons need touch events)
I4 (plane) ────┬──> I8 (plane swap verification)
               └──> I3 (camera modes for plane)
I2 (radar) ──> (standalone)
I5 (landmarks) ──> (standalone)
I6 (boat) ──> (standalone, needs tide data)
```

## Fix Order (respecting DAG)
1. ✅ I1 — Steering (document-level pointer events)
2. ✅ I2 — Radar zoom
3. ✅ I5 — Landmarks
4. ✅ I3 — Camera modes
5. ✅ I4 — Plane mode (basic)
6. ⬜ I8 — Plane swap verification
7. ⬜ I7 — Automated tests
8. ⬜ I6 — Boat mode (ticketed)