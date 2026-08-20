# HANDOFF: Vibe Drive Jersey — Presentation/Pitch Session

## Context
You are helping Will Wilson prepare the presentation/pitch for the vibe.je hackathon demo "Vibe Drive Jersey". The demo is being built in parallel in another session. Your job is the PITCH and PRESENTATION, not the code.

## The Demo
**Name:** Vibe Drive Jersey
**Tagline:** Drive around a real map of Jersey with live weather, day/night cycle, and real restaurant POIs.
**URL:** https://hermes.tail8277f.ts.net (public, works from any device including iPad/iPhone)
**QR Code:** /root/vibe-drive-jersey/qr-code.png

## What The Demo Does
- Web-based driving game on a real map of Jersey (OpenStreetMap tiles)
- Car icon you control with touch buttons (iPad/iPhone) or arrow keys (desktop)
- Live weather data from Open-Meteo API (temperature, wind, conditions — real, updating)
- Day/night cycle based on actual sunrise/sunset times for Jersey (map darkens at night)
- 12 real Jersey restaurant markers with popups (Bohemia, Ormer, Ocean, etc. — links to food.je)
- Boat and Fly mode buttons as "coming soon" placeholders
- Deployed via Tailscale Funnel — public HTTPS URL, no install needed

## Tech Stack (for the pitch)
- **Frontend:** Vanilla JS + Leaflet.js + OpenStreetMap tiles (no API keys, all free)
- **Weather:** Open-Meteo API (free, no key, real-time)
- **Day/night:** Sunrise-sunset.org API (free, no key, calculates actual sun position)
- **Deploy:** Tailscale Funnel (public HTTPS from homelab, zero cloud cost)
- **Build time:** ~45 minutes from idea to working demo

## The Vision (for judges)
Phase 1 (today): Drive mode, live weather, day/night, restaurant POIs
Phase 2 (coming soon): Boat mode with real Jersey tide data (Jersey has one of world's largest tidal ranges — 12m), Fly mode with 3D terrain
Phase 3 (future): Sell advertising to Jersey businesses — restaurants, attractions, shops appear as billboards along your driving route. Revenue model for local businesses.

## What Makes This Jersey-Specific
- Real OSM map of Jersey, centered on St Helier
- Real Jersey restaurants (food.je integration planned)
- Jersey tide data for boat mode (unique gameplay mechanic — 12m tidal range)
- Jersey weather (Open-Meteo pulls actual Jersey coordinates)
- Built for the vibe.je community

## Presentation Constraints
- Will is presenting from his iPad or iPhone
- The demo URL works on mobile Safari
- QR code can be shown to the room so judges can try it on their phones
- Keep it short — this is a hackathon, 2-3 minute pitch + live demo

## What Will Needs From You
1. A 2-3 minute pitch script (memorable, punchy, Jersey-flavoured)
2. A single-slide HTML presentation deck (if time permits) or just talking points
3. A QR code slide that judges can scan to try the demo live
4. Key talking points for Q&A

## Key Files
- Demo URL: https://hermes.tail8277f.ts.net
- QR code: /root/vibe-drive-jersey/qr-code.png
- Demo source: /root/vibe-drive-jersey/index.html
- Build plan: /root/vibe-drive-jersey/PLAN.md
- Full hackathon briefing: /root/ai-hackathon-briefing.md

## Timeline
Hackathon deadline was 18:17 on 20 Aug 2026. This is a fast sprint — prioritize the pitch script and QR code slide over a fancy deck.