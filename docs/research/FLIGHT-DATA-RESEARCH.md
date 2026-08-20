# Flight Data Research — VibeDrive.je

**Date:** 2026-08-20
**Goal:** Find the best live flight data source for Jersey Airport to display in the VibeDrive.je 3D driving game (fly mode with Cessna plane).

---

## Summary Recommendation

**Use TWO data sources combined:**

1. **Ports of Jersey CDN JSON** (`pojcdn.blob.core.windows.net`) — **PRIMARY** for scheduled arrivals/departures board at Jersey Airport. Free, no key, rich flight metadata (flight number, airline, origin, destination, status, scheduled time).

2. **OpenSky Network API** (`opensky-network.org/api/states/all`) — **SECONDARY** for live 3D aircraft positions in the game world. Free (anonymous), no key, provides real-time lat/lon/altitude/velocity/heading for rendering moving aircraft above Jersey.

This combination gives you both a flight information display (like the airport's departure board) and live 3D aircraft flying over the island — perfect for a game with a Cessna fly mode.

---

## Source 1: Ports of Jersey CDN JSON ✅ RECOMMENDED (Primary)

### Discovery

The Jersey Airport website (`jerseyairport.com`) is a Next.js app. By inspecting the client-side JavaScript bundle, I found it fetches data from a public Azure Blob Storage CDN endpoint:

```
https://pojcdn.blob.core.windows.net/data/airportArrivals48h.json
```

This single JSON file contains **both arrivals AND departures** for the next/past 48 hours.

### Endpoint Details

| Property | Value |
|----------|-------|
| **URL** | `https://pojcdn.blob.core.windows.net/data/airportArrivals48h.json` |
| **Format** | JSON |
| **Auth** | None — fully public |
| **Cost** | Free |
| **Rate limits** | None observed (Azure Blob CDN, designed for public access) |
| **Update frequency** | Appears updated hourly (has a `Updated` timestamp field) |
| **Data window** | 48 hours of arrivals + departures (~56 each) |

### Data Fields (Verified from Live Test)

```json
{
  "Updated": "20 Aug 2026 22:00",
  "FlightDepartureDetails": [
    {
      "Flightnumber": "BA1357",
      "From": null,
      "To": "London Heathrow",
      "Scheduled": "07:00",
      "Status": "Airborne at 07:15",
      "Airline": "British Airways",
      "display": false,
      "Date": "2026-08-20 07:00"
    }
  ],
  "FlightArrivalDetails": [
    {
      "Flightnumber": "EZY439",
      "From": "Glasgow",
      "To": null,
      "Scheduled": "07:15",
      "Status": "Landed at 07:01",
      "Airline": "easyJet",
      "display": false,
      "Date": "2026-08-20 07:15"
    }
  ]
}
```

### Available Fields Per Flight

| Field | Type | Description |
|-------|------|-------------|
| `Flightnumber` | string | Full flight number (e.g. "BA1357", "EZY439") |
| `From` | string\|null | Origin city/airport (arrivals only, null for departures) |
| `To` | string\|null | Destination city/airport (departures only, null for arrivals) |
| `Scheduled` | string | Scheduled time (HH:MM format) |
| `Status` | string | Free-text status: "Landed at HH:MM", "Airborne at HH:MM", "As scheduled", "Estimated HH:MM" |
| `Airline` | string | Airline name (e.g. "British Airways", "easyJet", "Loganair", "Aurigny") |
| `Date` | string | Full datetime (e.g. "2026-08-20 07:00") |
| `display` | boolean | UI display flag (can ignore) |

### Observed Status Values

- `"Landed at HH:MM"` — arrival has landed
- `"Airborne at HH:MM"` — departure has taken off
- `"As scheduled"` — no delays, hasn't happened yet
- `"Estimated HH:MM"` — delayed, new estimated time

### Observed Routes (21 destinations)

Amsterdam, Edinburgh, Leeds Bradford, Dublin, Paris (CDG), Liverpool, London Southend, Brest, London Heathrow, Guernsey, London Luton, Alderney, Bordeaux, London Gatwick, Exeter, Bristol, Belfast International, Glasgow, East Midlands, Manchester, Southampton

### Additional Endpoint: Sidebar Data

```
https://pojcdn.blob.core.windows.net/data/sidebar.json
```

Returns: next tide times, marina status, weather summary — useful for the game's harbour/marine features too.

### Pros

- ✅ **No API key, no auth, no rate limits** — it's a public CDN blob
- ✅ **Rich flight metadata** — flight numbers, airlines, origins, destinations, status
- ✅ **Official Ports of Jersey data** — accurate, maintained
- ✅ **Both arrivals & departures** in one call
- ✅ **48-hour window** — can show today's and tomorrow's flights

### Cons

- ❌ **No real-time position data** — no lat/lon/altitude/speed
- ❌ **No aircraft type or registration**
- ❌ **Unknown update frequency** — likely hourly, not real-time
- ❌ **Could change without notice** — undocumented internal endpoint

---

## Source 2: OpenSky Network API ✅ RECOMMENDED (Secondary — Live Positions)

### Endpoint

```
GET https://opensky-network.org/api/states/all?lamin=49.0&lomin=-2.5&lamax=49.4&lomax=-1.5
```

### Details

| Property | Value |
|----------|-------|
| **URL** | `https://opensky-network.org/api/states/all` |
| **Format** | JSON |
| **Auth** | Anonymous (no key) — or OAuth2 for higher limits |
| **Cost** | Free for research/non-commercial use |
| **Rate limits** | **Anonymous: 400 credits/day**, 10-second time resolution |
| **Credit cost** | Jersey bbox (~0.16 sq deg) = **1 credit per call** → **400 calls/day** |
| **Auth rate limits** | Authenticated: 4000 credits/day, 5-second resolution |
| **Contributing** | ADS-B receiver operators: 8000 credits/day |

### Rate Limit Table

| User Type | Daily Credits | Time Resolution | Historical Access |
|-----------|--------------|-----------------|-------------------|
| Anonymous | 400 | 10 seconds | None (current only) |
| Authenticated | 4000 | 5 seconds | 1 hour past |
| Contributing (ADS-B receiver) | 8000 | 5 seconds | 1 hour past |

**Credit cost by area:** Jersey bbox (0.4° × 1.0° = 0.4 sq deg) = 1 credit (under 25 sq deg threshold).

### Data Fields (State Vector Array)

Tested live — returned 18 aircraft in the Channel Islands region, 0 in the tight Jersey bbox at time of test (late evening, low traffic).

Each state vector is an array with these fields (by index):

| Index | Field | Type | Example |
|-------|-------|------|---------|
| 0 | `icao24` | string | "440237" |
| 1 | `callsign` | string | "EJU1926" |
| 2 | `origin_country` | string | "Austria" |
| 3 | `time_position` | int | 1787259731 |
| 4 | `last_contact` | int | 1787259731 |
| 5 | `longitude` | float | 0.258 |
| 6 | `latitude` | float | 49.0951 |
| 7 | `baro_altitude` | float (meters) | 11262.36 |
| 8 | `on_ground` | boolean | false |
| 9 | `velocity` | float (m/s) | 201.16 |
| 10 | `true_track` | float (degrees) | 179.41 |
| 11 | `vertical_rate` | float (m/s) | 0 |
| 12 | `sensors` | array\|null | null |
| 13 | `geo_altitude` | float (meters) | 11490.96 |
| 14 | `squawk` | string | "6302" |
| 15 | `spi` | boolean | false |
| 16 | `position_source` | int | 0 |

### Bounding Box Parameters

```
lamin=49.0   # min latitude
lomin=-2.5   # min longitude
lamax=49.4   # max latitude  
lomax=-1.5   # max longitude
```

This covers Jersey airspace (~40km × 70km box). Area = 0.4 sq deg = 1 credit per call.

### Game Integration Notes

- **400 calls/day anonymous** = ~1 call every 3.6 minutes if running 24/7, or plenty for a game session
- For a game, poll every **30-60 seconds** during fly mode (well within limits)
- Altitude is in **meters** — convert to game units
- Velocity is in **m/s** — convert to knots if displaying (× 1.94384)
- `true_track` is heading in degrees (0=North, 90=East)
- `on_ground` flag identifies aircraft taxiing/landed
- Callsign maps to flight number (e.g. "EJU1926" ≈ easyJet 1926, "BAW486" ≈ British Airways 486)

### Pros

- ✅ **No API key required** (anonymous access works)
- ✅ **Real-time 3D positions** — lat, lon, altitude, heading, speed
- ✅ **Global coverage** — all ADS-B equipped aircraft
- ✅ **Free for non-commercial/research use**
- ✅ **Bounding box query** — only get aircraft near Jersey

### Cons

- ❌ **Rate limited** — 400 calls/day anonymous (manageable for a game)
- ❌ **No origin/destination** in state vectors — only callsign and country
- ❌ **Callsign ≠ flight number** — needs mapping (ICAO airline code → flight number)
- ❌ **No flight schedule** — only live positions of currently airborne aircraft
- ❌ **License** — research/non-commercial only; commercial use requires agreement
- ❌ **Night-time gap** — few aircraft overnight, Jersey bbox often returns empty

---

## Source 3: FlightRadar24 — ❌ NOT RECOMMENDED

### Official API

| Property | Value |
|----------|-------|
| **URL** | `https://fr24api.flightradar24.com/` |
| **Format** | REST JSON |
| **Auth** | API key required |
| **Cost** | **Paid** — usage-based pricing model |
| **Rate limits** | Pay per data received |

The official FR24 API is a commercial product. No free tier documented.

### Unofficial APIs (Not Recommended)

Two GitHub projects exist:
- **`JeanExtreme002/FlightRadarAPI`** (Python/Node.js SDK) — scrapes FR24 JSON endpoints
- **`igolaizola/fr24`** (Go CLI) — uses FR24 JSON endpoints + gRPC-web

Both explicitly state: **"This SDK should only be used for educational purposes. Commercial use requires a Business plan subscription."**

### Verdict

- ❌ Official API is paid (unknown pricing, likely expensive for a game)
- ❌ Unofficial scrapers violate FR24 Terms of Service
- ❌ No guaranteed stability — endpoints can change
- ❌ Legal risk for a published game

---

## Source 4: Ports of Jersey API (ports.je) — ⚠️ No Dedicated API

### Findings

- `ports.je` is the main Ports of Jersey website — no public developer API documented
- The actual data is served from `pojcdn.blob.core.windows.net` (Azure CDN) — **this IS the Ports of Jersey data**, just served as static JSON blobs rather than through a formal API
- `opendata.gov.je` has historical passenger/freight statistics (not live flight data), available via CKAN API

### Verdict

The CDN JSON endpoints in Source 1 above ARE the Ports of Jersey data delivery mechanism. No separate formal API exists for live flight data.

---

## Source 5: ADS-B Exchange — ⚠️ PARTIAL

### Details

| Property | Value |
|----------|-------|
| **URL** | `https://www.adsbexchange.com/api/aircraft/v2/docs` |
| **Format** | JSON REST |
| **Auth** | API key required (free tier available) |
| **Cost** | Free tier exists; paid for commercial |
| **Rate limits** | Varies by plan |

### Test Results

- `api.adsbexchange.com` endpoints returned **empty responses** (0 bytes) — likely requires authentication or the free endpoint format has changed
- The free "rapidapi" endpoint format has been deprecated/restricted

### Pros

- ✅ Would provide similar data to OpenSky (positions, altitude, speed)
- ✅ Includes military/filter data that OpenSky doesn't

### Cons

- ❌ Free tier appears unreliable / endpoint format unclear
- ❌ Requires registration for current API
- ❌ Less documentation than OpenSky
- ❌ Commercial use may require paid plan

### Verdict

OpenSky is a better choice — no registration needed, well-documented, proven to work with a simple curl.

---

## Recommended Architecture for VibeDrive.je

### Two-Layer Flight Data System

```
┌─────────────────────────────────────────────────────┐
│              VibeDrive.je Flight System              │
├──────────────────────┬──────────────────────────────┤
│  Airport Info Board   │  Live Aircraft Rendering     │
│  (UI overlay)         │  (3D objects in game world)  │
├──────────────────────┼──────────────────────────────┤
│  Ports of Jersey CDN  │  OpenSky Network API         │
│  airportArrivals48h   │  /states/all?bbox=Jersey     │
│  .json                │                              │
├──────────────────────┼──────────────────────────────┤
│  Poll: every 5 min    │  Poll: every 30-60 sec       │
│  (data updates hourly)│  (during fly mode only)      │
├──────────────────────┼──────────────────────────────┤
│  Shows:               │  Shows:                      │
│  - Flight number      │  - Real-time aircraft pos    │
│  - Airline            │  - Altitude (3D placement)   │
│  - Origin/Dest        │  - Heading (rotation)        │
│  - Scheduled time     │  - Speed                     │
│  - Status             │  - On-ground flag            │
│  - 48h schedule       │  - Callsign → flight match   │
└──────────────────────┴──────────────────────────────┘
```

### Implementation Details

#### Layer 1: Airport Flight Board

```javascript
// Fetch every 5 minutes — data updates hourly
const FLIGHT_DATA_URL = 'https://pojcdn.blob.core.windows.net/data/airportArrivals48h.json';

async function fetchJerseyFlights() {
  const res = await fetch(FLIGHT_DATA_URL);
  const data = await res.json();
  return {
    updated: data.Updated,
    arrivals: data.FlightArrivalDetails,
    departures: data.FlightDepartureDetails
  };
}
```

Game UI placement: Display as a flight info board near the airport at game coordinates (0.8, -81.9), or as a HUD overlay when near the airport.

#### Layer 2: Live Aircraft in 3D World

```javascript
// Fetch every 30-60 seconds — only when in fly mode
const OPENSKY_URL = 'https://opensky-network.org/api/states/all' +
  '?lamin=49.0&lomin=-2.5&lamax=49.4&lomax=-1.5';

async function fetchLiveAircraft() {
  const res = await fetch(OPENSKY_URL);
  const data = await res.json();
  if (!data.states) return [];
  
  return data.states.map(s => ({
    icao24:        s[0],
    callsign:      s[1]?.trim(),
    country:       s[2],
    longitude:     s[5],    // GPS lon
    latitude:      s[6],    // GPS lat
    altitude:      s[7],    // baro altitude (meters)
    onGround:      s[8],    // boolean
    velocity:      s[9],    // m/s
    heading:       s[10],   // true track (degrees, 0=North)
    verticalRate:  s[11],   // m/s climb/descent
    geoAltitude:   s[13],   // geometric altitude (meters)
    squawk:        s[14]    // transponder code
  }));
}

// Convert GPS to game coordinates
function gpsToGame(lat, lon) {
  // Jersey Airport: GPS (49.2081, -2.1956) → Game (0.8, -81.9)
  // Use same projection as the game's map system
  // ... (depends on game's coordinate system)
}
```

#### Rate Limit Budget (Anonymous OpenSky)

- Jersey bbox = 1 credit per call
- 400 credits/day = 400 calls/day
- At 60-second polling: 1,440 calls/day → **EXCEEDS LIMIT**
- At 90-second polling: 960 calls/day → **EXCEEDS LIMIT**
- At **4-minute polling**: 360 calls/day → ✅ Fits within 400/day
- **Recommendation:** Poll every 3-4 minutes, or register for OAuth2 (4000 credits/day = 90-second polling possible)
- **Game optimization:** Only poll while in fly mode and within visible range of airport

#### Callsign → Flight Number Mapping

OpenSky callsigns use ICAO airline codes, not IATA. Cross-reference with Ports of Jersey data:

| ICAO Callsign | Airline | IATA Code |
|--------------|---------|-----------|
| BAW | British Airways | BA |
| EZY | easyJet | U2/EZY |
| RYR | Ryanair | FR |
| EJU | easyJet Europe | EJU |
| LOG | Loganair | LM |
| AUR | Aurigny | GR |
| WUK | Wizz Air UK | W9 |

Match by stripping the airline code from callsign and comparing the numeric portion to the Ports of Jersey `Flightnumber` field.

---

## CORS Considerations

### Ports of Jersey CDN

Azure Blob Storage typically returns `Access-Control-Allow-Origin: *` — should work from browser directly. **Verify in game testing.**

### OpenSky API

OpenSky API supports CORS — confirmed working from browser-based applications. No proxy needed.

### Fallback: Proxy Server

If CORS issues arise, set up a lightweight proxy:

```javascript
// Node.js/Express proxy example
app.get('/api/flights/schedule', async (req, res) => {
  const data = await fetch('https://pojcdn.blob.core.windows.net/data/airportArrivals48h.json');
  res.json(await data.json());
});

app.get('/api/flights/live', async (req, res) => {
  const data = await fetch('https://opensky-network.org/api/states/all?lamin=49.0&lomin=-2.5&lamax=49.4&lomax=-1.5');
  res.json(await data.json());
});
```

---

## Priority Ranking

| Source | Use Case | Priority | Effort |
|--------|----------|----------|--------|
| Ports of Jersey CDN JSON | Flight info board (schedule, status) | **#1 — Start here** | Low — single fetch, parse JSON |
| OpenSky Network API | Live 3D aircraft positions | **#2 — Add for fly mode** | Medium — coordinate transform, 3D rendering |
| ADS-B Exchange | Fallback for live positions | #3 — backup if OpenSky insufficient | Medium — requires API key |
| FlightRadar24 Official | Premium alternative | Skip — paid, overkill | High |
| FlightRadar24 Unofficial | Quick hack | Skip — ToS violation | Low but risky |

---

## Verification Commands

```bash
# Test Ports of Jersey flight data
curl -s 'https://pojcdn.blob.core.windows.net/data/airportArrivals48h.json' | python3 -m json.tool | head -40

# Test OpenSky live aircraft near Jersey
curl -s 'https://opensky-network.org/api/states/all?lamin=49.0&lomin=-2.5&lamax=49.4&lomax=-1.5' | python3 -m json.tool

# Test Ports of Jersey sidebar (tides, weather, marina)
curl -s 'https://pojcdn.blob.core.windows.net/data/sidebar.json' | python3 -m json.tool
```

All three were tested and verified working on 2026-08-20.