# Data Flow Between Layers

<cite>
**Referenced Files in This Document**
- [GameContext.tsx](file://src/context/GameContext.tsx)
- [GameActions.tsx](file://src/components/GameActions.tsx)
- [LobbyScreen.tsx](file://src/components/LobbyScreen.tsx)
- [games.ts](file://convex/games.ts)
- [rooms.ts](file://convex/rooms.ts)
- [chat.ts](file://convex/chat.ts)
- [ConvexProvider.tsx](file://src/ConvexProvider.tsx)
- [index.ts](file://src/types/index.ts)
- [game-logic.ts](file://src/lib/game-logic.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the complete data flow between the frontend and backend layers in sen-web. It traces how user interactions propagate from UI components through React context to Convex mutations, which update the database and broadcast changes to all connected clients via query subscriptions. It also covers specific workflows such as room creation, joining a game, and making a move, along with edge cases like network interruptions, concurrent modifications, and conflict resolution. Finally, it outlines performance optimizations such as optimistic updates and debouncing, and provides troubleshooting guidance for common synchronization issues.

## Project Structure
The data flow spans three primary layers:
- Frontend React components and context
- Convex client bindings and generated API
- Convex backend mutations and queries

```mermaid
graph TB
subgraph "Frontend"
UI_GameActions["UI: GameActions.tsx"]
UI_Lobby["UI: LobbyScreen.tsx"]
Ctx["Context: GameContext.tsx"]
Types["Types: types/index.ts"]
Logic["Logic: game-logic.ts"]
end
subgraph "Convex Client"
Provider["Provider: ConvexProvider.tsx"]
API["Generated API: convex/_generated/api.js"]
end
subgraph "Convex Backend"
M_Games["Mutations: games.ts"]
Q_Games["Queries: games.ts"]
M_Rooms["Mutations: rooms.ts"]
Q_Rooms["Queries: rooms.ts"]
M_Chat["Mutations: chat.ts"]
Q_Chat["Queries: chat.ts"]
end
UI_GameActions --> Ctx
UI_Lobby --> Ctx
Ctx --> Provider
Provider --> API
API --> M_Games
API --> M_Rooms
API --> M_Chat
API --> Q_Games
API --> Q_Rooms
API --> Q_Chat
Q_Games --> Ctx
Q_Chat --> Ctx
Types --> Ctx
Logic --> Ctx
```

**Diagram sources**
- [GameActions.tsx](file://src/components/GameActions.tsx#L1-L109)
- [LobbyScreen.tsx](file://src/components/LobbyScreen.tsx#L1-L413)
- [GameContext.tsx](file://src/context/GameContext.tsx#L574-L1152)
- [ConvexProvider.tsx](file://src/ConvexProvider.tsx#L1-L18)
- [games.ts](file://convex/games.ts#L1-L43)
- [rooms.ts](file://convex/rooms.ts#L1-L119)
- [chat.ts](file://convex/chat.ts#L1-L35)
- [index.ts](file://src/types/index.ts#L1-L100)
- [game-logic.ts](file://src/lib/game-logic.ts#L1-L63)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L574-L1152)
- [ConvexProvider.tsx](file://src/ConvexProvider.tsx#L1-L18)

## Core Components
- GameContext manages the global game state, orchestrates local processing, and synchronizes with Convex. It exposes methods to create/join rooms, start games, broadcast actions, and send chat messages.
- GameActions is a UI component that reads the current state and triggers context methods for user actions.
- ConvexProvider initializes the Convex client and wraps the app.
- Convex modules define mutations and queries for rooms, games, and chat.

Key responsibilities:
- Local state transitions and optimistic UI updates
- Sanitization of state for multiplayer privacy
- Debounced synchronization to the backend
- Presence updates and reconnection logic
- Room lifecycle and player presence

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L574-L1152)
- [GameActions.tsx](file://src/components/GameActions.tsx#L1-L109)
- [ConvexProvider.tsx](file://src/ConvexProvider.tsx#L1-L18)

## Architecture Overview
The system follows a unidirectional data flow:
- UI components read from GameContext and call context methods.
- Context applies local state transitions and schedules a debounced sync to Convex.
- Convex mutations persist state and broadcast changes via subscriptions.
- Subscriptions push updates back to all clients, which reconcile with local state.

```mermaid
sequenceDiagram
participant UI as "UI Component"
participant Ctx as "GameContext"
participant Convex as "Convex API"
participant DB as "Convex Backend"
participant Sub as "Subscriptions"
UI->>Ctx : "User action"
Ctx->>Ctx : "Apply local state transition"
Ctx->>Ctx : "Debounce and sanitize state"
Ctx->>Convex : "setGameStateMutation(state)"
Convex->>DB : "Persist state"
DB-->>Sub : "Notify subscribers"
Sub-->>Ctx : "Remote state update"
Ctx->>Ctx : "Merge remote state (avoid loops)"
Ctx-->>UI : "Updated state for rendering"
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L883-L953)
- [games.ts](file://convex/games.ts#L1-L43)

## Detailed Component Analysis

### Room Creation Workflow
This sequence shows how a host creates a room, initializes local state, and starts the lobby.

```mermaid
sequenceDiagram
participant Host as "Host UI"
participant Ctx as "GameContext"
participant Convex as "Convex API"
participant Rooms as "rooms.ts"
participant Games as "games.ts"
Host->>Ctx : "createRoom(playerName)"
Ctx->>Rooms : "createRoom(roomId, hostId, hostName)"
Rooms->>Rooms : "Insert room and host player"
Rooms-->>Convex : "Success"
Ctx->>Ctx : "Set local state (online, hostId, players)"
Ctx->>Games : "setGameState(initial peeking state)"
Games->>Games : "Upsert game state"
Games-->>Convex : "Success"
Convex-->>Ctx : "Remote state subscription"
Ctx->>Ctx : "Dispatch SET_STATE"
Ctx-->>Host : "Room created and ready"
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L955-L1006)
- [rooms.ts](file://convex/rooms.ts#L1-L27)
- [games.ts](file://convex/games.ts#L1-L30)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L955-L1006)
- [rooms.ts](file://convex/rooms.ts#L1-L27)
- [games.ts](file://convex/games.ts#L1-L30)

### Joining a Game Workflow
This sequence shows how a player joins a room, initializes local state, and waits for synchronization.

```mermaid
sequenceDiagram
participant Guest as "Guest UI"
participant Ctx as "GameContext"
participant Convex as "Convex API"
participant Rooms as "rooms.ts"
participant Sub as "Subscriptions"
Guest->>Ctx : "joinRoom(roomId, playerName)"
Ctx->>Rooms : "joinRoom(roomId, playerId, name)"
Rooms->>Rooms : "Insert/update player presence"
Rooms-->>Convex : "Success"
Ctx->>Ctx : "Set local state (online, players)"
Convex-->>Ctx : "Remote state subscription"
Ctx->>Ctx : "Dispatch SET_STATE"
Ctx-->>Guest : "Joined and synchronized"
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L998-L1058)
- [rooms.ts](file://convex/rooms.ts#L30-L75)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L998-L1058)
- [rooms.ts](file://convex/rooms.ts#L30-L75)

### Making a Move: DRAW_FROM_DECK
This sequence illustrates the end-to-end flow for a typical move, focusing on the “DRAW_FROM_DECK” action.

```mermaid
sequenceDiagram
participant UI as "GameActions.tsx"
participant Ctx as "GameContext.tsx"
participant Convex as "Convex API"
participant Games as "games.ts"
participant Sub as "Subscriptions"
UI->>Ctx : "broadcastAction({ type : 'DRAW_FROM_DECK' })"
Ctx->>Ctx : "dispatch PROCESS_ACTION"
Ctx->>Ctx : "Apply reducer logic (draw from deck)"
Ctx->>Ctx : "Sanitize state (hide peeked cards)"
Ctx->>Convex : "setGameStateMutation(sanitizedState)"
Convex->>Games : "Persist state"
Games-->>Convex : "Success"
Convex-->>Sub : "Notify subscribers"
Sub-->>Ctx : "Remote state update"
Ctx->>Ctx : "Dispatch SET_STATE (merge remote)"
Ctx-->>UI : "Updated UI reflects drawn card and phase"
```

Notes:
- The reducer handles drawing from the deck, advancing turns, and transitioning phases.
- Sanitization ensures opponents cannot see temporarily peeked cards.
- Debounce prevents excessive writes.

**Diagram sources**
- [GameActions.tsx](file://src/components/GameActions.tsx#L67-L105)
- [GameContext.tsx](file://src/context/GameContext.tsx#L818-L953)
- [games.ts](file://convex/games.ts#L1-L30)

**Section sources**
- [GameActions.tsx](file://src/components/GameActions.tsx#L67-L105)
- [GameContext.tsx](file://src/context/GameContext.tsx#L818-L953)
- [games.ts](file://convex/games.ts#L1-L30)

### Data Model and Types
The game state and actions are strongly typed to ensure correctness across layers.

```mermaid
erDiagram
GAME_STATE {
enum gameMode
string roomId
string hostId
int currentPlayerIndex
enum gamePhase
string actionMessage
string drawSource
string roundWinnerName
string gameWinnerName
int turnCount
json players
json chatMessages
json lastMove
json lastRoundScores
json peekingState
json drawnCard
json tempCards
json swapState
}
PLAYER {
string id
string name
json hand
int score
}
CARD {
int id
int value
boolean isSpecial
enum specialAction
}
GAME_STATE ||--o{ PLAYER : "contains"
PLAYER ||--o{ HAND : "has"
HAND ||--|| CARD : "contains"
```

**Diagram sources**
- [index.ts](file://src/types/index.ts#L1-L100)

**Section sources**
- [index.ts](file://src/types/index.ts#L1-L100)

## Dependency Analysis
- UI components depend on GameContext for state and actions.
- GameContext depends on Convex for mutations and queries.
- Convex modules encapsulate persistence and broadcasting.
- Game logic utilities support deterministic deck creation and shuffling.

```mermaid
graph LR
UI["UI Components"] --> Ctx["GameContext"]
Ctx --> Convex["Convex API"]
Convex --> Rooms["rooms.ts"]
Convex --> Games["games.ts"]
Convex --> Chat["chat.ts"]
Ctx --> Types["types/index.ts"]
Ctx --> Logic["game-logic.ts"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L574-L1152)
- [rooms.ts](file://convex/rooms.ts#L1-L119)
- [games.ts](file://convex/games.ts#L1-L43)
- [chat.ts](file://convex/chat.ts#L1-L35)
- [index.ts](file://src/types/index.ts#L1-L100)
- [game-logic.ts](file://src/lib/game-logic.ts#L1-L63)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L574-L1152)
- [rooms.ts](file://convex/rooms.ts#L1-L119)
- [games.ts](file://convex/games.ts#L1-L43)
- [chat.ts](file://convex/chat.ts#L1-L35)
- [index.ts](file://src/types/index.ts#L1-L100)
- [game-logic.ts](file://src/lib/game-logic.ts#L1-L63)

## Performance Considerations
- Optimistic updates: Actions are applied locally immediately, providing instant feedback. Remote reconciliation occurs via subscriptions.
- Debouncing: Synchronization to the backend is debounced to batch rapid state changes and reduce write pressure.
- Sanitization: During peeking, sensitive cards are hidden from opponents to preserve fairness and privacy.
- Presence updates: Periodic presence updates keep the lobby responsive and detect disconnections.
- Reconnection: On mount, the client attempts to reconnect using stored session identifiers.

Practical tips:
- Prefer immediate UI feedback for user actions; rely on subscriptions to reconcile eventual consistency.
- Avoid frequent manual polling; leverage subscriptions for real-time updates.
- Keep mutation payloads minimal; sanitize state before writing to reduce payload size.

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L883-L953)
- [GameContext.tsx](file://src/context/GameContext.tsx#L842-L881)
- [GameContext.tsx](file://src/context/GameContext.tsx#L782-L834)
- [GameContext.tsx](file://src/context/GameContext.tsx#L793-L834)

## Troubleshooting Guide
Common issues and resolutions:
- Network interruptions
  - Symptom: UI stops updating; chat messages fail to send.
  - Resolution: Presence updates and reconnection logic attempt to restore connectivity. Persisted session storage is used to reconnect automatically.
  - Evidence: Reconnection effect and periodic presence updates.
  
  **Section sources**
  - [GameContext.tsx](file://src/context/GameContext.tsx#L793-L834)
  - [GameContext.tsx](file://src/context/GameContext.tsx#L800-L816)

- Concurrent modifications and conflicts
  - Symptom: Conflicting state after simultaneous moves.
  - Resolution: Debounced synchronization and remote state merging prevent loops. The system compares local vs. remote vs. last synced state to avoid redundant writes and loops.
  
  **Section sources**
  - [GameContext.tsx](file://src/context/GameContext.tsx#L616-L682)
  - [GameContext.tsx](file://src/context/GameContext.tsx#L883-L953)

- Privacy leaks during peeking
  - Symptom: Opponents can see temporarily peeked cards.
  - Resolution: Sanitization hides peeked cards from opponents during peeking; local peeked cards remain visible to the current player.
  
  **Section sources**
  - [GameContext.tsx](file://src/context/GameContext.tsx#L842-L881)

- Room join failures
  - Symptom: Join fails with “Room not found.”
  - Resolution: Retry logic with backoff attempts to handle race conditions when creating rooms.
  
  **Section sources**
  - [GameContext.tsx](file://src/context/GameContext.tsx#L1002-L1058)
  - [rooms.ts](file://convex/rooms.ts#L30-L75)

- Player presence anomalies
  - Symptom: Opponent appears disconnected or reappears unexpectedly.
  - Resolution: Presence updates and timeouts distinguish between short disconnections and actual leaves. Long timeout logic resets the game if a player leaves mid-round.
  
  **Section sources**
  - [GameContext.tsx](file://src/context/GameContext.tsx#L698-L749)
  - [rooms.ts](file://convex/rooms.ts#L100-L118)

- Chat message delivery
  - Symptom: Messages not appearing for others.
  - Resolution: Local dispatch precedes mutation to provide optimistic feedback; errors are logged for diagnostics.
  
  **Section sources**
  - [GameContext.tsx](file://src/context/GameContext.tsx#L924-L953)
  - [chat.ts](file://convex/chat.ts#L1-L21)

## Conclusion
The data flow in sen-web is designed for responsiveness and correctness:
- UI actions are processed optimistically in GameContext.
- Changes are sanitized and debounced before persisting to Convex.
- Subscriptions propagate updates to all clients, enabling real-time multiplayer.
- Robust mechanisms handle network interruptions, concurrent edits, and privacy concerns.

By leveraging these patterns, developers can extend functionality while maintaining a smooth, reliable user experience.