# VibeDrive.je — Mobile/iPad/Desktop Controls Research

## 1. Mobile Driving Game Control Research

### Popular Games Analysed
| Game | Platform | Steering | Accelerate | Brake | Camera | HUD Style |
|------|----------|----------|------------|-------|--------|-----------|
| Asphalt 9 | Mobile | Tilt + touch | Auto | Touch button | Auto + swipe | Minimal, edges |
| Real Racing 3 | Mobile | Tilt | Auto | Pedal buttons | Auto | Edge gauges |
| CSR Racing 2 | Mobile | Timing taps | Pedal | N/A | Fixed | Center timer |
| GTA Mobile (Chinatown/III) | Mobile | Virtual joystick | Button | Button | Swipe | Floating buttons |
| Mario Kart Tour | Mobile | Touch + drag | Auto | Touch | Auto | Bottom corners |
| Trackmania | Desktop | Keyboard/mouse | Key | Key | Mouse | Speed gauges |
| Forza Horizon | Desktop/Xbox | Trigger sticks | Trigger | Trigger | R-stick | Top corners |

### Key Findings

**Steering:**
- **Tilt** is immersive but problematic on iPad (too large to tilt comfortably while holding)
- **Touch steering** (left/right halves of screen) is the most reliable on iPad
- **Virtual joystick** (bottom-left drag) works but obscures view
- **Drag steering** (touch anywhere, drag left/right) is best for minimal HUD — our current approach

**Acceleration:**
- **Auto-accelerate** is standard on mobile racing games (90% of top games)
- Manual pedal buttons take screen space and add complexity
- Our current approach (touch to steer, auto-go) is aligned with mobile conventions

**Braking/Handbrake:**
- Single button, bottom-right corner (right-thumb zone)
- Handbrake = separate button or long-press of brake

**Camera:**
- Auto-camera is standard on mobile
- Manual camera = swipe gesture, not buttons (buttons take space)
- Our 4 camera modes (Chase/Far/Top/Cockpit) should be a cycling button, not 4 separate buttons

**Button Placement (Touch Ergonomics):**
- Apple HIG: 44×44pt minimum touch targets
- Material Design: 48×48dp minimum
- Reachable zones on iPad (held in landscape):
  - Easy: bottom corners (thumbs)
  - Medium: bottom center, top corners
  - Hard: top center, middle edges
- All primary controls should be in bottom 1/3 of screen

## 2. Current App Feature Audit

### Controls Currently Available
| Control | Type | Location | Input |
|---------|------|----------|-------|
| Steering | Touch drag | Full screen (excluding UI) | pointerdown/up on document |
| Acceleration | Auto | N/A | Constant forward |
| Brake | Touch | Bottom right button | pointerdown |
| Handbrake | Keyboard | Space key | keydown |
| Mode: Drive | Button | Bottom center bar | click |
| Mode: Boat | Button | Bottom center bar | click |
| Mode: Fly | Button | Bottom center bar | click |
| Camera: Chase | Button | Bottom center bar | click |
| Camera: Far | Button | Bottom center bar | click |
| Camera: Top | Button | Bottom center bar | click |
| Camera: Cockpit | Button | Bottom center bar | click |
| Night mode | Toggle | Top right | click |
| Bus routes | Toggle | Top right | click |
| Airport flights | Toggle | Top right | click |
| Radio | Toggle | Top right | click |
| Leaderboard | Button | Top right | click |
| Settings | Button | Top right | click |
| Score | Display | Top left | N/A |
| Speed | Display | Top left | N/A |
| Weather | Display | Top left | N/A |
| Username | Display | Top left | N/A |
| Online count | Display | Top left | N/A |
| Collectibles | Display | Top left | N/A |
| Mission | Display | Top center | N/A |
| Wanted level | Display | Top right | N/A |
| Slippery roads | Warning | Variable | N/A |

### Problems Identified
1. **HUD clutter**: 17+ buttons/displays — too many for mobile
2. **Camera buttons take 4 slots** — should be 1 cycling button
3. **Top-right cluster** has 6 buttons (night, bus, airport, radio, leaderboard, settings) — crowded on phone
4. **No haptic feedback** on touch controls
5. **No visual feedback** on steering input (which direction am I turning?)
6. **Mode bar** (Drive/Boat/Fly) takes full bottom-center width — wastes prime thumb space
7. **No pause menu** — can't stop the game
8. **Keyboard mapping** not documented in-game
9. **No fullscreen toggle** for mobile browsers

## 3. Control Requirements

### Platform-Specific Requirements

**Mobile (phone, portrait or landscape):**
- Max 5 visible buttons at any time
- All primary controls in bottom 1/3 (thumb zones)
- Steering: touch-drag (current approach, keep it)
- Auto-accelerate (current, keep it)
- Camera: single cycling button (not 4)
- Secondary features (bus, airport, radio, leaderboard, settings): in a collapsible menu
- HUD: score + speed only in top-left, everything else on-demand

**iPad (landscape, primary device):**
- Slightly larger touch targets (56×56pt)
- Can fit 7-8 visible buttons (more screen real estate)
- Steering: touch-drag or tilt option
- Camera: cycling button OR swipe gesture
- Secondary features: icon row on right edge, not clustered top-right
- HUD: full info display, can afford more detail

**Desktop (keyboard + mouse):**
- Full keyboard controls (WASD + arrows, Space, 1-4 for camera)
- Mouse for camera look (click-drag)
- All buttons accessible via keyboard shortcuts
- HUD: full detail, corners only, no bottom bar clutter

### Layout Requirements
- **Always visible**: Score, Speed, Steering input, Brake button, Mode button
- **One tap away**: Camera, Night mode, Map/Radar
- **Two taps away** (in menu): Bus, Airport, Radio, Leaderboard, Settings, Collectibles
- **Auto-appear**: Mission notifications, Wanted level, Weather warnings, Online count

### Design Philosophies for Tournament
1. **Minimalist** — Hide everything except essentials. 5 buttons max. Gesture-first.
2. **Feature-rich** — All features visible but organized in clean panels. iPad-optimized.
3. **Gesture-first** — Replace buttons with swipe/pinch/tap gestures. Minimal UI.