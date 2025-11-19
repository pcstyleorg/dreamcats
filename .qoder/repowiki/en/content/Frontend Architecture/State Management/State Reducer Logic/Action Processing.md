# Action Processing

<cite>
**Referenced Files in This Document**
- [GameContext.tsx](file://src/context/GameContext.tsx)
- [types/index.ts](file://src/types/index.ts)
- [game-logic.ts](file://src/lib/game-logic.ts)
- [GameActions.tsx](file://src/components/GameActions.tsx)
- [PlayerHand.tsx](file://src/components/PlayerHand.tsx)
- [ActionModal.tsx](file://src/components/ActionModal.tsx)
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
This document explains the action processing mechanism inside the gameReducer function, focusing on how the reducer interprets and applies each action type defined in the GameAction union. It covers validation checks, state transitions, immutability enforcement, and edge-case handling such as empty draw piles and invalid moves. It also provides guidance on extending the reducer safely with new action types while preserving type safety and consistency.

## Project Structure
The action processing lives in the GameContext’s reducer, with UI components dispatching typed actions that the reducer validates and transforms into immutable state updates. Supporting logic for deck creation and shuffling resides in a dedicated module.

```mermaid
graph TB
UI_GameActions["UI: GameActions.tsx<br/>Dispatches PEEK_CARD, CALL_POBUDKA, DRAW_FROM_DECK/DISCARD, DISCARD_HELD_CARD"]
UI_PlayerHand["UI: PlayerHand.tsx<br/>Dispatches SWAP_HELD_CARD, ACTION_PEEK_1_SELECT, ACTION_SWAP_2_SELECT"]
UI_ActionModal["UI: ActionModal.tsx<br/>Dispatches ACTION_TAKE_2_CHOOSE, START_NEW_ROUND"]
Reducer["Reducer: gameReducer in GameContext.tsx<br/>Implements GameAction handlers"]
Types["Types: types/index.ts<br/>Defines GameState, GameAction, GamePhase"]
Logic["Logic: game-logic.ts<br/>createDeck, shuffleDeck"]
UI_GameActions --> Reducer
UI_PlayerHand --> Reducer
UI_ActionModal --> Reducer
Types --> Reducer
Logic --> Reducer
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L47-L548)
- [types/index.ts](file://src/types/index.ts#L81-L100)
- [game-logic.ts](file://src/lib/game-logic.ts#L1-L63)
- [GameActions.tsx](file://src/components/GameActions.tsx#L1-L109)
- [PlayerHand.tsx](file://src/components/PlayerHand.tsx#L83-L131)
- [ActionModal.tsx](file://src/components/ActionModal.tsx#L1-L153)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L47-L548)
- [types/index.ts](file://src/types/index.ts#L37-L100)
- [game-logic.ts](file://src/lib/game-logic.ts#L1-L63)
- [GameActions.tsx](file://src/components/GameActions.tsx#L1-L109)
- [PlayerHand.tsx](file://src/components/PlayerHand.tsx#L83-L131)
- [ActionModal.tsx](file://src/components/ActionModal.tsx#L1-L153)

## Core Components
- gameReducer: Central reducer that accepts a typed action and returns a new GameState. It enforces game-phase validation, performs immutable updates, and advances turns or ends rounds when appropriate.
- GameAction union: Defines all valid actions, including PEEK_CARD, DRAW_FROM_DECK, DRAW_FROM_DISCARD, DISCARD_HELD_CARD, SWAP_HELD_CARD, USE_SPECIAL_ACTION, ACTION_PEEK_1_SELECT, ACTION_SWAP_2_SELECT, ACTION_TAKE_2_CHOOSE, CALL_POBUDKA, and START_NEW_ROUND.
- GameState: Encapsulates the entire game state, including draw/discard piles, players, current player index, game phase, and auxiliary fields for special actions and round scoring.
- UI dispatchers: Components translate user interactions into typed actions and dispatch them to the reducer.

Key responsibilities:
- Validate game phase and preconditions before applying state changes.
- Maintain immutability by cloning arrays and objects before mutation.
- Manage special actions and multi-step flows (e.g., swap_2 selection, take_2 choice).
- Gracefully handle edge cases like empty draw piles and invalid moves.

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L47-L548)
- [types/index.ts](file://src/types/index.ts#L37-L100)

## Architecture Overview
The reducer is invoked by dispatching a typed action. The reducer branches on action.type and applies immutable transformations. Some actions trigger immediate state changes; others transition the game into a special phase requiring subsequent user input.

```mermaid
sequenceDiagram
participant UI as "UI Component"
participant Ctx as "GameContext.dispatch"
participant Red as "gameReducer"
participant State as "GameState"
UI->>Ctx : dispatch({ type : "PROCESS_ACTION", payload : { action } })
Ctx->>Red : call reducer(state, action)
Red->>Red : validate gamePhase and preconditions
Red->>State : return new immutable state
Red-->>Ctx : new state
Ctx-->>UI : state updated
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L818-L840)
- [GameContext.tsx](file://src/context/GameContext.tsx#L47-L548)

## Detailed Component Analysis

### PEEK_CARD
Purpose: Allows the current peeking player to reveal up to two cards from their hand during the peeking phase.

Validation checks:
- gamePhase must be "peeking".
- peekingState must exist.
- peekedCount must be less than 2.
- The targeted player must be the current peeker.
- The selected card must not already be face-up.

Processing logic:
- Clone players and the current player’s hand.
- Flip the selected card face-up and mark it peeked.
- Increment peekedCount in peekingState.

Immutability:
- Players array is cloned.
- Player object is cloned.
- Hand array is cloned.
- Individual card object is cloned and updated.

Edge cases:
- If the action is invalid, the reducer returns the original state unchanged.

```mermaid
flowchart TD
Start(["PEEK_CARD"]) --> CheckPhase["Is gamePhase == 'peeking'?"]
CheckPhase --> |No| ReturnOrig["Return original state"]
CheckPhase --> |Yes| CheckPeekState["Has peekingState?"]
CheckPeekState --> |No| ReturnOrig
CheckPeekState --> |Yes| CheckCount["peekedCount < 2?"]
CheckCount --> |No| ReturnOrig
CheckCount --> |Yes| CheckPlayer["Is action player the peeker?"]
CheckPlayer --> |No| ReturnOrig
CheckPlayer --> |Yes| CheckFace["Is selected card face-up?"]
CheckFace --> |Yes| ReturnOrig
CheckFace --> |No| FlipCard["Clone players/player/hand<br/>Flip card face-up and mark peeked"]
FlipCard --> IncCount["Increment peekedCount"]
IncCount --> ReturnNew["Return new state"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L176-L207)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L176-L207)
- [PlayerHand.tsx](file://src/components/PlayerHand.tsx#L83-L91)

### FINISH_PEEKING
Purpose: Concludes the peeking phase for the current player and advances to the next player or ends peeking.

Validation checks:
- gamePhase must be "peeking".
- peekingState must exist.

Processing logic:
- Reset all cards in the current player’s hand to face-down.
- Advance to the next player index.
- If the next player wraps back to the starting index, end peeking and set gamePhase to "playing".
- Otherwise, continue peeking for the next player.

Immutability:
- Clone players array and the current player’s hand.
- Update peekingState or clear it.

```mermaid
flowchart TD
Start(["FINISH_PEEKING"]) --> PhaseOk["Is gamePhase == 'peeking'?"]
PhaseOk --> |No| ReturnOrig["Return original state"]
PhaseOk --> |Yes| HasState["Has peekingState?"]
HasState --> |No| ReturnOrig
HasState --> |Yes| ResetHand["Reset current player's hand face-down"]
ResetHand --> NextIdx["Compute next player index"]
NextIdx --> LoopBack{"Next == startIndex?"}
LoopBack --> |Yes| EndPeeking["Set gamePhase='playing'<br/>Clear peekingState"]
LoopBack --> |No| ContinuePeeking["Advance to next player<br/>Reset peekedCount"]
EndPeeking --> ReturnNew["Return new state"]
ContinuePeeking --> ReturnNew
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L208-L254)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L208-L254)
- [GameActions.tsx](file://src/components/GameActions.tsx#L27-L31)

### DRAW_FROM_DECK
Purpose: Draw a card from the draw pile when the current player’s phase is "playing".

Validation checks:
- gamePhase must be "playing".
- Ensure draw pile is not empty.

Processing logic:
- Pop a card from the draw pile.
- If the draw pile is empty, end the round immediately (no POBUDKA penalty).
- Otherwise, set drawnCard, drawSource to "deck", gamePhase to "holding_card", and record lastMove.

Immutability:
- Clone draw pile.
- Set drawnCard and drawSource.
- Advance to "holding_card" phase.

Edge cases:
- Empty draw pile triggers immediate round end via endRoundWithScores.

```mermaid
flowchart TD
Start(["DRAW_FROM_DECK"]) --> PhaseOk["Is gamePhase == 'playing'?"]
PhaseOk --> |No| ReturnOrig["Return original state"]
PhaseOk --> |Yes| Draw["Pop card from drawPile"]
Draw --> Empty{"Card exists?"}
Empty --> |No| EndRound["Call endRoundWithScores(reason='deck_exhausted')"]
Empty --> |Yes| Hold["Set drawnCard, drawSource='deck'<br/>gamePhase='holding_card'"]
Hold --> Record["Record lastMove.draw"]
Record --> ReturnNew["Return new state"]
EndRound --> ReturnNew
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L255-L279)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L255-L279)

### DRAW_FROM_DISCARD
Purpose: Draw the top discard card when the current player’s phase is "playing" and the discard pile is not empty.

Validation checks:
- gamePhase must be "playing".
- Discard pile must not be empty.

Processing logic:
- Pop the top card from the discard pile.
- Set drawnCard, drawSource to "discard", gamePhase to "holding_card", and record lastMove.
- Enforce mandatory swap behavior when discarding from the discard pile.

Immutability:
- Clone discard pile.
- Set drawnCard and drawSource.
- Advance to "holding_card" phase.

Edge cases:
- If the discard pile is empty, the action is ignored.

```mermaid
flowchart TD
Start(["DRAW_FROM_DISCARD"]) --> PhaseOk["Is gamePhase == 'playing'?"]
PhaseOk --> |No| ReturnOrig["Return original state"]
PhaseOk --> |Yes| DiscardEmpty{"Discard pile empty?"}
DiscardEmpty --> |Yes| ReturnOrig
DiscardEmpty --> |No| Draw["Pop top card from discardPile"]
Draw --> Hold["Set drawnCard, drawSource='discard'<br/>gamePhase='holding_card'"]
Hold --> Record["Record lastMove.draw"]
Record --> ReturnNew["Return new state"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L281-L299)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L281-L299)

### DISCARD_HELD_CARD
Purpose: Discard the currently held card when the game phase is "holding_card".

Validation checks:
- gamePhase must be "holding_card".
- drawnCard must exist.

Processing logic:
- Append drawnCard to the discard pile.
- Advance the turn using the internal advanceTurn helper.

Immutability:
- Clone discard pile and append drawnCard.
- Use advanceTurn to rotate to next player and reset temporary fields.

Edge cases:
- If drawnCard is missing, the action is ignored.

```mermaid
flowchart TD
Start(["DISCARD_HELD_CARD"]) --> PhaseOk["Is gamePhase == 'holding_card' AND drawnCard?"]
PhaseOk --> |No| ReturnOrig["Return original state"]
PhaseOk --> |Yes| Discard["Push drawnCard to discardPile"]
Discard --> Advance["Call advanceTurn()"]
Advance --> Record["Record lastMove.discard"]
Record --> ReturnNew["Return new state"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L301-L316)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L301-L316)

### SWAP_HELD_CARD
Purpose: Replace a card in the current player’s hand with the drawn card when the game phase is "holding_card".

Validation checks:
- gamePhase must be "holding_card".
- drawnCard must exist.
- The selected card index must be valid.

Processing logic:
- Capture the card to be swapped out.
- Replace the selected hand card with drawnCard (face down, not peeked).
- Append the old card to the discard pile.
- Advance the turn and record lastMove.swap with source information.

Immutability:
- Clone players array, current player, and hand.
- Update hand element and replace the old card in discard pile.

Edge cases:
- If drawnCard is missing, the action is ignored.

```mermaid
flowchart TD
Start(["SWAP_HELD_CARD"]) --> PhaseOk["Is gamePhase == 'holding_card' AND drawnCard?"]
PhaseOk --> |No| ReturnOrig["Return original state"]
PhaseOk --> |Yes| GetCard["Get card at payload.cardIndex"]
GetCard --> Replace["Replace hand card with drawnCard<br/>(faceDown, not peeked)"]
Replace --> AppendDiscard["Append old card to discardPile"]
AppendDiscard --> Advance["Call advanceTurn()"]
Advance --> Record["Record lastMove.swap + source"]
Record --> ReturnNew["Return new state"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L317-L351)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L317-L351)
- [PlayerHand.tsx](file://src/components/PlayerHand.tsx#L93-L97)

### USE_SPECIAL_ACTION
Purpose: Use a special action from a drawn card when the game phase is "holding_card", the drawn card is special, and it was drawn from the deck.

Validation checks:
- gamePhase must be "holding_card".
- drawnCard must be special.
- drawSource must be "deck".

Processing logic:
- Move drawnCard to the discard pile.
- Branch by specialAction:
  - peek_1: Transition to "action_peek_1" phase.
  - swap_2: Transition to "action_swap_2_select_1" phase.
  - take_2: Draw two additional cards from the deck; if any are available, enter "action_take_2" with tempCards; otherwise, advance turn without taking extra cards.

Immutability:
- Clone discard pile and append drawnCard.
- For take_2, clone draw pile and pop two cards into tempCards.

Edge cases:
- If the deck runs out during take_2, the reducer falls back to advancing the turn without extra cards.

```mermaid
flowchart TD
Start(["USE_SPECIAL_ACTION"]) --> PhaseOk["Is gamePhase=='holding_card' AND drawnCard.isSpecial AND drawSource=='deck'?"]
PhaseOk --> |No| ReturnOrig["Return original state"]
PhaseOk --> |Yes| Discard["Append drawnCard to discardPile"]
Discard --> Switch["Switch on specialAction"]
Switch --> Peek1["Set gamePhase='action_peek_1'"]
Switch --> Swap2["Set gamePhase='action_swap_2_select_1'"]
Switch --> Take2["Pop 2 cards from drawPile -> tempCards"]
Take2 --> AnyLeft{"Any tempCards?"}
AnyLeft --> |No| Advance["advanceTurn()"]
AnyLeft --> |Yes| EnterTake2["Set gamePhase='action_take_2'<br/>clear drawnCard/drawSource"]
Peek1 --> ReturnNew["Return new state"]
Swap2 --> ReturnNew
EnterTake2 --> ReturnNew
Advance --> ReturnNew
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L352-L407)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L352-L407)

### ACTION_PEEK_1_SELECT
Purpose: Select a target player and card during the "action_peek_1" phase.

Validation checks:
- gamePhase must be "action_peek_1".

Processing logic:
- Mark the selected card as peeked in the target player’s hand.
- Advance the turn and record lastMove.peek with targetPlayerId.

Immutability:
- Clone players array and update the target hand.

Edge cases:
- If the action is invalid, the reducer returns the original state.

```mermaid
flowchart TD
Start(["ACTION_PEEK_1_SELECT"]) --> PhaseOk["Is gamePhase == 'action_peek_1'?"]
PhaseOk --> |No| ReturnOrig["Return original state"]
PhaseOk --> |Yes| FindPlayer["Locate target player by playerId"]
FindPlayer --> MarkPeek["Mark selected card peeked in target hand"]
MarkPeek --> Advance["advanceTurn()"]
Advance --> Record["Record lastMove.peek + targetPlayerId"]
Record --> ReturnNew["Return new state"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L408-L433)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L408-L433)
- [PlayerHand.tsx](file://src/components/PlayerHand.tsx#L99-L117)

### ACTION_SWAP_2_SELECT
Purpose: Perform a two-card mutual swap during the "action_swap_2" phases.

Validation checks:
- First selection: gamePhase is "action_swap_2_select_1".
- Second selection: gamePhase is "action_swap_2_select_2" and swapState exists.

Processing logic:
- First selection: store the first card’s coordinates in swapState and switch to "action_swap_2_select_2".
- Second selection: swap the two cards between players, then advance the turn.

Immutability:
- Clone players array and perform a deep-like copy for swapping cards between hands.

Edge cases:
- If selections are invalid, the reducer returns the original state.

```mermaid
flowchart TD
Start(["ACTION_SWAP_2_SELECT"]) --> Phase1["Is gamePhase == 'action_swap_2_select_1'?"]
Phase1 --> |Yes| Store["Store first card in swapState<br/>Switch to phase 2"]
Phase1 --> |No| Phase2["Is gamePhase == 'action_swap_2_select_2' AND swapState?"]
Phase2 --> |No| ReturnOrig["Return original state"]
Phase2 --> |Yes| Swap["Deep-like clone players<br/>Swap cards between players"]
Store --> ReturnNew["Return new state"]
Swap --> Advance["advanceTurn()"]
Advance --> Record["Record lastMove.swap_2"]
Record --> ReturnNew
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L434-L475)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L434-L475)
- [PlayerHand.tsx](file://src/components/PlayerHand.tsx#L119-L130)

### ACTION_TAKE_2_CHOOSE
Purpose: Choose one of the two drawn take_2 cards during the "action_take_2" phase.

Validation checks:
- gamePhase must be "action_take_2".
- tempCards must exist.

Processing logic:
- Remove the chosen card from tempCards and append it to the discard pile.
- Place the chosen card as drawnCard, set drawSource to "deck", and switch back to "holding_card".
- Record lastMove.take_2.

Immutability:
- Clone discard pile and update drawnCard/drawSource.

Edge cases:
- If tempCards is missing, the reducer returns the original state.

```mermaid
flowchart TD
Start(["ACTION_TAKE_2_CHOOSE"]) --> PhaseOk["Is gamePhase == 'action_take_2' AND tempCards?"]
PhaseOk --> |No| ReturnOrig["Return original state"]
PhaseOk --> |Yes| Choose["Chosen card from payload"]
Choose --> Other["Other card in tempCards"]
Other --> Discard["Append other card to discardPile (if exists)"]
Discard --> SetHold["Set drawnCard, drawSource='deck'<br/>gamePhase='holding_card'"]
SetHold --> Record["Record lastMove.take_2"]
Record --> ReturnNew["Return new state"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L476-L498)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L476-L498)
- [ActionModal.tsx](file://src/components/ActionModal.tsx#L21-L27)

### CALL_POBUDKA
Purpose: End the current round early and compute scores.

Processing logic:
- Delegate to endRoundWithScores with reason "pobudka" and callerId set to the current player.

Immutability:
- The reducer returns a new state computed by endRoundWithScores.

Edge cases:
- No validation beyond ensuring the action is dispatched; the reducer computes round outcomes.

```mermaid
flowchart TD
Start(["CALL_POBUDKA"]) --> EndRound["Call endRoundWithScores(reason='pobudka', callerId=currentPlayer)"]
EndRound --> ReturnNew["Return new state"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L499-L504)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L499-L504)
- [GameActions.tsx](file://src/components/GameActions.tsx#L33-L37)

### START_NEW_ROUND
Purpose: Reset the game for a new round.

Processing logic:
- Create and shuffle a fresh deck.
- Deal four cards to each player face-down.
- Initialize the discard pile with the top card.
- Rotate the starting player to the next player after the last caller.
- Enter "peeking" phase with peekingState initialized.

Immutability:
- Clone initialState and override fields with new values.

Edge cases:
- Handles missing lastCallerId by defaulting to the current player index.

```mermaid
flowchart TD
Start(["START_NEW_ROUND"]) --> NewDeck["shuffleDeck(createDeck())"]
NewDeck --> Deal["Deal 4 cards to each player"]
Deal --> DiscardInit["Initialize discardPile with top card"]
DiscardInit --> Caller["Determine next starting player after lastCallerId"]
Caller --> EnterPeeking["Enter 'peeking' phase with peekingState"]
EnterPeeking --> ReturnNew["Return new state"]
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L505-L539)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L505-L539)
- [ActionModal.tsx](file://src/components/ActionModal.tsx#L25-L27)
- [game-logic.ts](file://src/lib/game-logic.ts#L1-L63)

## Dependency Analysis
The reducer depends on:
- Types for compile-time safety (GameState, GameAction, GamePhase).
- Utility functions for deck creation and shuffling.
- Internal helpers for turn advancement and round ending.

```mermaid
graph TB
Reducer["gameReducer"]
Types["types/index.ts"]
Logic["game-logic.ts"]
Helpers["advanceTurn(), endRoundWithScores()"]
Reducer --> Types
Reducer --> Logic
Reducer --> Helpers
```

**Diagram sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L47-L548)
- [types/index.ts](file://src/types/index.ts#L37-L100)
- [game-logic.ts](file://src/lib/game-logic.ts#L1-L63)

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L47-L548)
- [types/index.ts](file://src/types/index.ts#L37-L100)
- [game-logic.ts](file://src/lib/game-logic.ts#L1-L63)

## Performance Considerations
- Immutability: The reducer clones arrays and objects before mutation. While simple and safe, frequent cloning can be costly in large hands. Consider:
  - Using structural sharing patterns for large arrays.
  - Avoiding unnecessary deep clones when shallow copies suffice.
- Special actions: Actions like swap_2 involve cloning the entire players array. For large player counts, consider optimizing by updating only the affected players’ hands.
- Round end computations: endRoundWithScores iterates players and hands. For performance, cache derived values (e.g., min score) and avoid repeated recomputation.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Attempting an invalid action:
  - The reducer validates gamePhase and preconditions. If invalid, it returns the original state unchanged. Ensure UI components gate actions based on gamePhase and drawSource.
- Empty draw pile:
  - Drawing from deck when the pile is empty triggers immediate round end. Verify that callers handle the resulting round_end or game_over phases.
- Special action misuse:
  - USE_SPECIAL_ACTION requires drawnCard.isSpecial and drawSource == "deck". If these conditions fail, the action is ignored. Confirm that the drawn card meets these criteria before dispatching.
- Swap_2 and peek_1 flows:
  - These require multiple steps. Ensure the UI sequences through the correct phases and that the reducer transitions accordingly.

**Section sources**
- [GameContext.tsx](file://src/context/GameContext.tsx#L255-L279)
- [GameContext.tsx](file://src/context/GameContext.tsx#L352-L407)
- [GameContext.tsx](file://src/context/GameContext.tsx#L434-L475)

## Conclusion
The gameReducer implements a robust, type-safe action processing pipeline that enforces game-phase validation, maintains immutability, and gracefully handles edge cases. By structuring actions around phases and using immutable updates, the reducer preserves state consistency across single-player and online modes. Extending the reducer with new actions should follow the established patterns: validate preconditions, enforce immutability, and integrate cleanly with existing phases and helpers.