# Tournament: MULTIPLAYER — Contender: K2.7-Code

# T-MULTIPLAYER Architecture for VibeDrive.je

## 1. Architecture Document (~650 words)

### Transport choice: Supabase Realtime **broadcast**
For 3–5 concurrent players sending 10 Hz position updates, the only sensible transport is **Supabase Realtime broadcast over WebSockets**. It delivers messages directly from client to client via the Realtime server with no database round-trip.

- **Why not `postgres_changes`?** `postgres_changes` streams row-level database mutations. To use it for position sync we would have to `INSERT`/`UPDATE` a player row 10 times per second. That writes the WAL, triggers index/row updates, and adds ~20–100 ms of DB latency. Within minutes it would create millions of rows or high UPDATE contention. It is built for “what changed in the DB,” not for joystick-level motion.
- **Why not REST polling?** Polling the Supabase REST endpoint every 100 ms would mean ~600 requests per minute per player, plus CORS/TCP overhead. Latency would rarely drop below the poll interval, and Tailscale/iPad battery would suffer.
- **Broadcast** keeps the connection open, sends one small JSON frame per update, and the Realtime server fans it out to the other clients. It is stateless for position data and fits the existing `animate()` loop naturally.

### State reconciliation
There is **no server-side physics authority**. Each client is authoritative over its own car. This eliminates most conflicts by design:

1. Every position message carries a monotonic `seq` and a `ts` timestamp from the sender.
2. Receivers keep the last-applied `seq` per remote player.
3. If an arriving message has `seq <= lastSeq`, it is discarded as out-of-order or stale.
4. The latest valid message becomes the interpolation target.

Because only the owning client can move a given car, two clients cannot genuinely disagree about the same vehicle. The only “conflict” is network reordering, which sequence numbers resolve.

### Position interpolation
Raw 10 Hz updates would make remote cars look jerky on a 60 Hz display. Each remote player stores a **two-sample buffer**:

- `previous` — the last fully consumed state.
- `target` — the newest received state.

At render time we interpolate from `previous` toward `target` using a local interpolation clock. A small **100 ms jitter buffer** absorbs Tailscale/network variance. Heading is angle-lerped (wrapping around ±π). If a new update arrives while we are still interpolating, `target` becomes `previous` and the new packet becomes `target`.

If no update arrives for more than ~2 seconds, we briefly extrapolate using the last known velocity/heading, then fade the car to a “lagged/ghost” state and eventually remove it.

### Reconnection
Supabase-js manages the underlying WebSocket reconnect with exponential backoff. On top of that:

- The client rejoins the same Realtime channel on reconnect.
- `presence.sync` events give the full current room state immediately after rejoin, so the client can respawn all remote cars.
- The client re-publishes its own presence and resumes sending position updates.
- A `sessionId` (random + timestamp) lets peers detect that a reconnect is the same player rather than a new one.

If the iPad puts the tab in the background, Safari may throttle timers. We therefore tie the 10 Hz send to `requestAnimationFrame` when visible and use `Page Visibility API` + a short `setTimeout` fallback when hidden, plus a final heartbeat on `pagehide`.

### Player lifecycle
- **Join:** On load the client creates a unique `playerId` (or reuses the persisted username), computes a deterministic color from the username hash, and calls `channel.track({ playerId, name, color, joinedAt, mode })`.
- **Heartbeat:** A lightweight `heartbeat` broadcast is sent every 1 second. It carries the player’s `playerId`, `ts`, and an `active` flag.
- **Idle timeout:** The client monitors input. If there has been no movement/input for 10 minutes, it stops tracking presence and sends a final “leave” heartbeat. Other clients treat missing heartbeats as offline after ~30 seconds and remove the car after ~60 seconds.
- **Max session:** `joinedAt` is recorded locally. After 2 hours the client voluntarily disconnects and rejoins with a fresh session ID, preventing stale presence entries from lingering.
- **Disconnect:** `beforeunload` / `pagehide` untracks presence so the room state stays clean.

---

## 2. Key Code Structure

### Supabase client & channel setup
```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const playerId = getOrCreatePlayerId();          // from username/localStorage
const sessionId = generateSessionId();

const channel = supabase.channel('vibedrive:jersey', {
  config: {
    broadcast: { self: false },                  // don't echo your own packets
    presence: { key: playerId }
  }
});
```

### Core functions

```js
function usernameColor(name) { /* hash -> HSL string */ }

function initMultiplayer() {
  channel
    .on('presence', { event: 'sync' }, handlePresenceSync)
    .on('presence', { event: 'join' }, handlePlayerJoin)
    .on('presence', { event: 'leave' }, handlePlayerLeave)
    .on('broadcast', { event: 'pos' }, handlePositionUpdate)
    .on('broadcast', { event: 'hb' }, handleHeartbeat)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          playerId, name: playerUsername,
          color: usernameColor(playerUsername),
          sessionId, joinedAt: Date.now(), mode: vehicleMode
        });
        startHeartbeat(); startPositionLoop();
      }
    });
}

function sendPositionUpdate() {
  channel.send({
    type: 'broadcast',
    event: 'pos',
    payload: {
      type: 'pos',
      playerId, sessionId, seq: ++outSeq,
      ts: performance.now(),
      x: carX, z: carZ,
      heading: carHeading,
      speed: carSpeed,
      mode: vehicleMode
    }
  });
}

function startPositionLoop() {
  // called from animate(); throttled to ~10 Hz
}

function startHeartbeat() {
  setInterval(() => {
    channel.send({
      type: 'broadcast',
      event: 'hb',
      payload: { type: 'hb', playerId, ts: Date.now(), active: isActive() }
    });
  }, 1000);
}

function handlePositionUpdate({ payload }) {
  const remote = remotePlayers[payload.playerId];
  if (!remote || payload.seq <= remote.lastSeq) return;
  remote.buffer.push(payload);
  if (remote.buffer.length > 2) remote.buffer.shift();
  remote.lastSeq = payload.seq;
}

function handlePresenceSync() {
  const state = channel.presenceState();
  rebuildRemotePlayerList(state);
}

function interpolateRemotePlayers(dt) {
  for (const p of Object.values(remotePlayers)) {
    if (p.buffer.length < 2) continue;
    // interpolate between previous and target using render time - 100 ms buffer
    // l
