# Sen (Dream) Game Flow and UI Navigation

## Game Overview
- **Objective**: Create a "Dream" (4 cards) with the lowest possible value (fewest cats). Win with lowest score at 100 points.
- **Players**: 2-5 players.
- **Deck**: 54 cards (0-8: 4 each, 9: 9 copies, Specials: Take 2, Peek 1, Swap 2).

## App Phases and Navigation

### 1. Landing Page
- **UI**: Animated title "Sen", subtitle, enter button.
- **Action**: Click "Enter" to proceed.
- **Navigation**: → Lobby Screen.

### 2. Lobby Screen
- **Modes**: Select Online Multiplayer or Local Hotseat.
- **Online Mode**:
  - Enter name, create room (auto-copies room ID) or join with ID.
  - Wait for 2-5 players, host clicks "Start Game".
  - **UI**: Room ID display, player list, start button (host only).
- **Hotseat Mode**:
  - Enter 2-5 player names, click "Start Game".
  - **UI**: Input fields for names, add/remove players.
- **Navigation**: → Gameboard (playing phase).

### 3. Gameboard Phases

#### Setup Phase (gamePhase: "lobby" → "peeking")
- Each player dealt 4 cards face-down.
- Draw pile (hidden) and discard pile (top card flipped) in center.

#### Peeking Phase (gamePhase: "peeking")
- **UI**: Own cards face-down, clickable to peek.
- **Action**: Click exactly 2 own cards to peek (memorize values).
- **Navigation**: "Finish Peeking" button → Playing Phase.

#### Playing Phase (gamePhase: "playing", sub-phases)
- **Turn Start**: Current player indicator at top.
- **Actions**:
  - Click **Draw Pile** (hidden) → holding_card phase.
  - Click **Discard Pile** (visible) → must swap with own card.
- **Holding Card** (holding_card):
  - Drawn card shown in center slot.
  - Buttons at bottom: Discard, Swap (disabled hint), Action (if special).
  - Swap: Click own card to swap.
- **Special Actions** (action_* phases):
  - **Take 2** (action_take_2): Draw 2, choose 1 to keep (repeat holding_card).
  - **Peek 1** (action_peek_1): Click any card to peek (toast shows value).
  - **Swap 2** (action_swap_2_select_1/2): Click two cards (any players) to swap.
  - **UI**: Instructions at bottom, cards glow/pulse for selection.

#### Round End (gamePhase: "round_end")
- **Trigger**: Click "POBUDKA!" at turn start instead of drawing.
- **Reveal**: All cards flip face-up.
- **Scoring**: Sum values, caller +5 penalty if not lowest.
- **UI**: Scoreboard shows round scores.
- **Navigation**: Continue to next round or game_over.

#### Game Over (gamePhase: "game_over")
- First to 100+ points wins (lowest score).
- **UI**: Final scoreboard.

## UI Layout
- **Top Bar**: Current player, action message, room ID (online), theme/language toggles.
- **Opponents Area**: Player hands (face-down, names).
- **Center**: Draw pile (glowing if actionable), drawn card slot, discard pile (with mini-fan history).
- **Bottom**: Player hand (clickable), GameActions buttons.
- **Side Panel (Desktop)**: Scoreboard, action log, chat (online).
- **Mobile**: Side panel via menu button, compact scaling.

## Key Interactions
- **Cards**: Click for peeking/swapping/specials (hover glow, pulse when interactive).
- **Piles**: Click draw/discard when it's your turn (glowing).
- **Buttons**: POBUDKA (end round), Discard/Swap/Action (holding_card), Finish Peeking.
- **Responsive**: Scales for mobile (<860px height), compact mode.
- **Feedback**: Toasts for actions, animations for moves, aura for specials.