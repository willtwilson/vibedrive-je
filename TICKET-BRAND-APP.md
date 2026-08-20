# TICKET: Apply Vibe Drive Jersey Brand Identity to 3D Driving App

## Objective
Apply the Vibe Drive Jersey brand identity (defined in `/root/vibe-drive-jersey/BRAND.md`) to the 3D driving game at `/root/vibe-drive-jersey/index.html`. The app currently uses a default blue sky + generic dark HUD. It should look like it belongs to the same brand system as the pitch deck.

## Brand Reference
Read `/root/vibe-drive-jersey/BRAND.md` for the full spec. Key tokens:

### Colors
| Token | Hex | Role in app |
|---|---|---|
| Jersey Green | `#00A86B` | Primary accent — HUD borders, active mode button, speed highlight |
| Atlantic Blue | `#0A1A3F` | Dark sky/night background, HUD background base |
| Sprint Yellow | `#FFD60A` | Speedometer text, key numbers, headlights accent |
| Surf White | `#F0F4FF` | HUD text, weather temp display |
| Cliff Grey | `#2A2A3E` | Secondary HUD surfaces, mode button inactive bg |
| Rally Red | `#E63946` | Brake button, taillight glow, car body accent |

### Typography
- HUD title: `Inter` 800, uppercase, tight tracking
- Speedometer: `JetBrains Mono` 700, yellow (`#FFD60A`)
- Weather temp: `Inter` 700, white
- Body labels: `Inter` 500

### Shape
- HUD: sharp corners (0px radius) — current rounded corners should be squared off
- Touch control buttons: keep pill shape (game controls = tactile)
- Mode buttons: sharp corners, green border on active state

## Changes Required

### 1. HUD Restyle (`#hud`)
- Background: `rgba(10, 26, 63, 0.85)` (Atlantic Blue with opacity)
- Border: `1px solid rgba(0, 168, 107, 0.3)` (Jersey Green)
- Border-radius: `0` (sharp corners — currently 14px)
- Title font: add `font-family: 'Inter', system-ui, sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em`
- Weather icon row: keep as-is but ensure temp uses `color: #F0F4FF` (Surf White)
- Speedometer: `color: #FFD60A` (Sprint Yellow), `font-family: 'JetBrains Mono', monospace; font-weight: 700`
- Location text: `color: rgba(240, 244, 255, 0.5)`

### 2. Mode Buttons (`.mode-btn`)
- Inactive: `background: rgba(42, 42, 62, 0.7)` (Cliff Grey), `border: 1px solid rgba(0, 168, 107, 0.2)`
- Active: `background: #00A86B` (Jersey Green), `border: 1px solid #00A86B`, `color: #0A1A3F` (dark text on green)
- Border-radius: `0` (sharp corners)
- Font: `font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em`

### 3. Touch Controls (`.control-btn`)
- Keep pill shape (game controls = tactile, 50% radius is correct)
- Border: `2px solid rgba(0, 168, 107, 0.3)` (Jersey Green)
- Background: `rgba(10, 26, 63, 0.7)` (Atlantic Blue)
- Accelerate button: `background: rgba(0, 168, 107, 0.4)` (green tint — acceleration = go)
- Brake button: `background: rgba(230, 57, 70, 0.4)` (Rally Red — brake = stop)
- Active/pressed state: `background: rgba(0, 168, 107, 0.6)` for accelerate, `rgba(230, 57, 70, 0.6)` for brake

### 4. Badge (`#badge`)
- Border: `1px solid rgba(0, 168, 107, 0.2)`
- Border-radius: `0`
- Color: `#00A86B` (Jersey Green)
- Font: `font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em`

### 5. Loading Screen (`#loading`)
- Background: `rgba(10, 26, 63, 0.95)` (Atlantic Blue)
- Border: `1px solid rgba(0, 168, 107, 0.3)` (Jersey Green)
- Border-radius: `0`
- Text: `font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em`
- Spinner ⚡: `color: #FFD60A` (Sprint Yellow)

### 6. 3D Scene Adjustments
- **Sky colour:** Change from `0x87CEEB` (default sky blue) to `0x4a7ab0` (slightly deeper, more Atlantic)
- **Fog colour:** Match sky: `0x4a7ab0`
- **Night sky:** Already uses `0x0a0a1e` — change to `0x0A1A3F` (Atlantic Blue) for brand consistency
- **Water colour:** Change from `0x1a4a7a` to `0x0A1A3F` (Atlantic Blue)
- **Car body:** Keep red `0xcc2222` — this aligns with Rally Red `#E63946` closely enough. Optionally update to `0xE63946` for exact brand match.
- **Sun light colour:** Keep warm `0xffffee` for day — good contrast with Atlantic sky

### 7. Google Fonts
Add to `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
```

## Do NOT Change
- Game logic, physics, controls, or Three.js scene structure
- Touch event handling
- Weather API integration
- File structure (single index.html)
- Tailscale Funnel deployment

## Verification
1. Open `http://localhost:5173/index.html` in browser
2. Confirm HUD has sharp corners, green border, yellow speedometer
3. Confirm mode buttons are sharp-cornered with green active state
4. Confirm touch controls are still pill-shaped but with green/red tint
5. Confirm sky is deeper Atlantic blue, not default sky blue
6. Confirm night mode uses Atlantic Blue `#0A1A3F`
7. Take screenshot and compare to pitch deck — should look like same brand family

## Priority
**HIGH** — do this before the final presentation. The app and the deck should look like they belong to the same product.