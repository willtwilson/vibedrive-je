# ⚡ Vibe Drive Jersey — Pitch Script

**2-3 minutes. 7 slides. Memorise the beats, not the words.**

---

## OPEN (15 seconds)

> "What if you could drive around Jersey — right now, from your phone — in 3D, with real weather and the actual sun setting over St Helier?"
>
> "That's Vibe Drive Jersey."

*[Slide 1 — title]*

---

## THE DEMO (30 seconds)

> "It's a 3D driving game on a procedurally generated Jersey. You control a car with touch buttons — works on iPad, iPhone, any browser. No install."
>
> "The weather is LIVE — pulling actual Jersey temperature and wind from the Open-Meteo API. The scene darkens at night based on real sunset times."

*[Slide 2 — features]*

---

## WHY JERSEY (25 seconds)

> "Jersey has one of the world's largest tidal ranges — twelve metres. That's not trivia. That's a gameplay mechanic."
>
> "Real local data: Jersey weather, Jersey tides, Jersey restaurants. Twelve real restaurants with food.je links. This is OUR island."

*[Slide 3 — 12m tidal range]*

---

## HOW WE BUILT IT (25 seconds)

> "Built in ninety minutes. Here's the stack:"
> "Homelab — Proxmox VM, zero cloud bill."
> "Hermes Agent orchestrated the entire build — from idea to deployed demo."
> "LiteLLM for model routing, Ollama Cloud for local inference."
> "Tailscale Funnel — public HTTPS straight from the homelab. No Vercel, no AWS."
> "Three.js for the 3D terrain, car, and lighting — all vanilla JS, no build step."
>
> "No API keys. No cloud bill. No install. Sometimes the best stack is what you already have."

*[Slide 4 — How We Built It]*

---

## THE VISION (25 seconds)

> "Phase 1 — today: 3D drive mode, live weather, day/night, restaurant POIs."
>
> "Phase 2 — boat mode with real Jersey tide data. Twelve-metre tidal range means channels open and close. Some routes only work at high tide. And fly mode for 3D terrain exploration."
>
> "Phase 3 — the business: Jersey businesses pay to appear as billboards along driving routes. Hyperlocal advertising. Local revenue."

*[Slide 5 — vision]*

---

## TRY IT (15 seconds)

> "Scan this QR code and you're driving around Jersey in five seconds. No download, no install — just open and go."

*[Slide 6 — QR code. Hold 15-20 seconds]*

---

## CLOSE (10 seconds)

> "Vibe Drive Jersey. Real island. Real data. Real fun."
>
> "Built at vibe.je. Thank you."

*[Slide 7 — close]*

---

## Q&A TALKING POINTS

**"How did AI help build this?"**
> Hermes Agent — an AI orchestrator — directed the entire build. It wrote the code, managed the deployment, and handled the presentation. I gave it the idea and the stack. It executed in 90 minutes.

**"Why not use Google Maps?"**
> OpenStreetMap is free, no API key, no usage limit. Google Maps would cost money and need a key. For a hackathon, free wins.

**"How is the weather real?"**
> Open-Meteo API — free, open-source. We pass Jersey's coordinates and get actual current temperature, wind speed, and conditions. Refreshes every 10 minutes.

**"How does day/night work?"**
> Sunrise-sunset.org API gives actual sunrise and sunset times for Jersey. We compare current time and adjust the 3D scene lighting — ambient, sun, and sky colour all change.

**"What's the revenue model?"**
> Phase 3: local businesses pay to appear as billboards along driving routes. A restaurant sponsors a stretch of coast road. Hyperlocal — only people driving through Jersey see it.

**"Why Jersey tides for boat mode?"**
> 12-metre tidal range — one of the world's largest. Channels open and close based on tide height. It's a natural gameplay mechanic. No other place has this exact dynamic.

**"Can multiple people play at once?"**
> Not yet — single-player. Phase 2 adds WebSocket multiplayer so you see other drivers on the map.

**"What's the tech stack?"**
> Three.js for 3D, vanilla JS, no framework. Open-Meteo for weather. Sunrise-sunset.org for day/night. Tailscale Funnel for public HTTPS from a homelab. Hermes Agent + LiteLLM + Ollama Cloud for AI orchestration. Zero cloud cost.

---

## PRESENTATION NOTES

- **Total pitch time:** ~2.5 minutes (script) + Q&A buffer
- **Present from iPad:** swipe left/right to navigate slides
- **QR code slide:** hold for 15-20 seconds — let judges pull out phones
- **Live demo:** if you drive live, keep it SHORT — 10 seconds of driving, then back to slides
- **Energy:** this is fun. Smile. It's a game about Jersey. Let that come through.
- **If the demo doesn't load:** don't panic. The QR code works. "Try it yourself" is stronger than watching someone else drive.