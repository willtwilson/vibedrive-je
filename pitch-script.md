# ⚡ Vibe Drive Jersey — Pitch Script

**2-3 minutes. Memorise the beats, not the words.**

---

## OPEN (15 seconds)

> "What if you could drive around Jersey — right now, from your phone — with real weather, real restaurants, and the actual sun setting over St Helier?"
>
> "That's Vibe Drive Jersey. Let me show you."

*[Swipe to slide 1 — title]*

---

## THE DEMO HOOK (30 seconds)

> "It's a driving game on a real map of Jersey. OpenStreetMap tiles, centred on St Helier. You control a car with touch buttons — works on iPad, iPhone, any browser."
>
> "But here's what makes it different: the weather you see is LIVE. Right now it's pulling actual Jersey temperature and wind from the Open-Meteo API. The map darkens at night based on real sunrise and sunset times for Jersey."

*[Swipe to slide 2 — features]*

*[If timing allows: open the demo URL on iPad, drive a few seconds]*

---

## WHY JERSEY (30 seconds)

> "Jersey has one of the world's largest tidal ranges — twelve metres. That's not a trivia fact. That's a gameplay mechanic."
>
> "This is built with real local data: Jersey weather, Jersey tides, Jersey restaurants. Twelve real restaurants — Bohemia, Ormer, Ocean — each with a link to food.je. Drive past one, tap it, order."
>
> "This isn't a generic map game. This is OUR island."

*[Swipe to slide 3 — 12m tidal range]*

---

## TECH / SPEED (20 seconds)

> "Built in forty-five minutes. Vanilla JavaScript, Leaflet maps, OpenStreetMap tiles. No API keys, no build step, no cloud bill. Deployed through Tailscale Funnel — public HTTPS straight from a homelab. Zero cost."
>
> "Sometimes the best stack is no stack."

*[Swipe to slide 4 — tech badges]*

---

## THE VISION (30 seconds)

> "Phase 1 — today: drive mode, live weather, day/night, restaurant POIs."
>
> "Phase 2 — coming soon: boat mode with real Jersey tide data. Imagine your boat can only get through certain channels at high tide. Twelve-metre tidal range means the map literally changes. And fly mode with 3D terrain."
>
> "Phase 3 — the business: sell advertising to Jersey businesses. Restaurants, attractions, shops appear as billboards along your driving route. Local revenue, local impact."

*[Swipe to slide 5 — vision/phases]*

---

## TRY IT (15 seconds)

> "Scan this QR code and you're driving around Jersey in five seconds. No download, no install — just open and go."

*[Swipe to slide 6 — QR code]*

*[Hold on QR code — let judges scan]*

---

## CLOSE (10 seconds)

> "Vibe Drive Jersey. Real island. Real data. Real fun."
>
> "Built at vibe.je. Thank you."

*[Swipe to slide 7 — close]*

---

## Q&A TALKING POINTS

**"Why not use Google Maps?"**
> OpenStreetMap is free, no API key, no usage limit. Google Maps would cost money and need a key. For a hackathon, free wins.

**"How is the weather real?"**
> Open-Meteo API — it's a free, open-source weather API. We pass Jersey's coordinates and get back actual current temperature, wind speed, and weather conditions. It refreshes every 10 minutes.

**"How does day/night work?"**
> Sunrise-sunset.org API gives us actual sunrise and sunset times for Jersey's coordinates. We compare current time to those and apply a CSS filter to darken the map tiles at night. The map literally goes dark when the sun goes down.

**"What's the revenue model?"**
> Phase 3: local businesses pay to appear as billboards along driving routes. A restaurant could sponsor a stretch of coast road. An attraction could place a marker near the actual location. It's hyperlocal advertising — only people driving through Jersey see it.

**"Why Jersey tides for boat mode?"**
> Jersey's 12-metre tidal range is one of the world's largest. That means channels open and close based on tide height. It's a natural gameplay mechanic — some routes are only available at high tide. No other place in the world has this exact dynamic.

**"What tech would you use if you rebuilt it properly?"**
> Same frontend — vanilla JS and Leaflet are perfect. For boat mode I'd add tide height data from the Jersey Ports API. For 3D fly mode, Mapbox GL with terrain tiles. But the core is deliberately minimal — one HTML file, no dependencies you can't load from a CDN.

**"Can multiple people play at once?"**
> Not yet — it's single-player. Phase 2 would add WebSocket multiplayer so you can see other drivers on the map. Imagine a Jersey road trip with your friends, each on your phone.

**"Is the map accurate?"**
> It's OpenStreetMap — community-maintained, very accurate for Jersey. The restaurant coordinates are real locations. The car is constrained to Jersey's bounding box so you can't drive into the sea.

---

## PRESENTATION NOTES

- **Total pitch time:** ~2.5 minutes (script) + 30s Q&A buffer
- **Present from iPad:** swipe left/right to navigate slides. Tap arrows at bottom too.
- **QR code slide:** hold for 15-20 seconds — let judges pull out phones
- **Live demo:** if you drive live, keep it SHORT — 10 seconds of driving, then back to slides
- **Energy:** this is fun. Smile. It's a game about Jersey. Let that come through.
- **If the demo doesn't load:** don't panic. The QR code works. Point them to it. "Try it yourself" is stronger than watching someone else drive.