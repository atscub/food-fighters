# Multiplayer Plan — PeerJS (WebRTC P2P)

## Overview

Add network multiplayer using PeerJS for peer-to-peer connections. No server required — works with the existing GitHub Pages deployment. Uses a **lockstep input model** where both players exchange inputs each frame and simulate identically.

## Architecture

```
Player A (Host)                    Player B (Guest)
┌──────────────┐                  ┌──────────────┐
│ Game Loop    │  PeerJS DataChannel  │ Game Loop    │
│              │◄────────────────────►│              │
│ Local Input  │   (input exchange)   │ Local Input  │
│ + Simulation │                      │ + Simulation │
└──────────────┘                      └──────────────┘
        │                                     │
        └──── PeerJS Cloud (signaling only) ──┘
```

- **Host** creates a PeerJS connection, gets a room code
- **Guest** joins using the room code
- Both run the same simulation; only inputs are sent over the wire
- PeerJS cloud handles signaling (free), actual data flows P2P

## Networking Model: Lockstep Input

Each game frame:
1. Collect local input (keys pressed this frame)
2. Send local input to remote peer
3. Wait for remote input (with timeout)
4. Apply both inputs and advance simulation by one frame

This guarantees both clients stay in perfect sync. The tradeoff is that the game runs at the speed of the slower connection (input delay = round-trip / 2).

## Implementation Steps

### Phase 1: Networking Layer

**1.1 Add PeerJS dependency**
- `pnpm add peerjs`
- PeerJS wraps WebRTC DataChannel with a simple API

**1.2 Create `src/network/NetworkManager.ts`**
- Singleton that manages the PeerJS connection
- Methods:
  - `hostGame(): string` — create peer, return room code (peer ID)
  - `joinGame(code: string): Promise<void>` — connect to host's peer ID
  - `sendInput(input: InputState): void` — send serialized input
  - `onRemoteInput(callback): void` — register handler for incoming input
  - `disconnect(): void` — clean up
- Expose connection state: `disconnected | connecting | connected`

**1.3 Define `InputState` type in `src/config/`**
```ts
interface InputState {
  frame: number;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  attack: boolean;
  special: boolean;
  block: boolean;
}
```

### Phase 2: Lobby UI

**2.1 Create `src/scenes/LobbyScene.ts`**
- Two buttons: "Host Game" / "Join Game"
- Host flow: show a 4-character room code, wait for guest to connect
- Join flow: text input for room code, connect button
- On connection established, both transition to CharacterSelectScene
- Show connection status / errors

**2.2 Wire into scene flow**
- StartScene menu gets a new "Multiplayer" button
- Multiplayer -> LobbyScene -> CharacterSelectScene -> FightScene
- Keep existing local flow unchanged ("Local Play" button)

### Phase 3: Character Select Sync

**3.1 Modify `CharacterSelectScene`**
- In multiplayer mode: P1 selects locally, P2 selects on their own screen
- Exchange character selections over the data channel
- Both players see "Waiting for opponent..." until both have picked
- Transition to FightScene once both confirm

### Phase 4: Fight Scene Sync

**4.1 Create `src/network/LockstepManager.ts`**
- Manages the input buffer and frame synchronization
- Each frame:
  - Buffer local input tagged with frame number
  - Send to remote peer
  - Wait until remote input for this frame is received
  - Return both inputs so FightScene can apply them
- Handle input delay: buffer 2-3 frames ahead (input delay = ~50ms at 60fps)

**4.2 Modify `FightScene` for multiplayer mode**
- Check if NetworkManager is connected
- If multiplayer: use LockstepManager to get inputs instead of reading keyboard directly
- P1 always controls fighter 1, P2 always controls fighter 2 (from their own perspective)
- Pause/resume game loop based on sync state

**4.3 Handle disconnection**
- If peer disconnects mid-fight: pause, show "Opponent disconnected", return to menu
- Timeout if no input received for 3 seconds

### Phase 5: Polish

**5.1 Room code UX**
- Generate short, human-readable codes (e.g., 4 uppercase letters)
- Map them to PeerJS peer IDs via a prefix: `foodfighters-ABCD`

**5.2 Latency indicator**
- Measure round-trip time via periodic pings
- Show small latency indicator in-game (green/yellow/red)

**5.3 Rematch flow**
- After fight ends, both can vote for rematch
- If both agree, restart FightScene with same characters

## File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Add `peerjs` dependency |
| `src/network/NetworkManager.ts` | **New** — PeerJS connection management |
| `src/network/LockstepManager.ts` | **New** — Frame sync and input buffering |
| `src/config/types.ts` | Add `InputState` and `NetworkState` types |
| `src/scenes/LobbyScene.ts` | **New** — Host/Join UI |
| `src/scenes/StartScene.ts` | Add "Multiplayer" menu option |
| `src/scenes/CharacterSelectScene.ts` | Support remote player selection |
| `src/scenes/FightScene.ts` | Use LockstepManager in multiplayer mode |

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| NAT traversal failure (~10% of connections) | Show clear error, suggest both players try a different network |
| Desync between clients | Use deterministic frame stepping; no random() without shared seed |
| PeerJS cloud signaling downtime | Can self-host PeerServer later if needed (simple Node server) |
| Input delay feels sluggish | 2-3 frame input buffer keeps it under 50ms; acceptable for casual play |

## Future Enhancements (Out of Scope)

- Rollback netcode (GGPO-style) for competitive play
- Dedicated relay server fallback for failed P2P
- Online matchmaking / leaderboards
- Spectator mode
