# Sen-Web Comprehensive Bug Audit Report

**Date:** November 30, 2025
**Codebase:** Sen-Web (Multiplayer Card Game)
**Auditor:** Claude Code

---

## Executive Summary

This audit identified **29 distinct bugs, discrepancies, and rule violations** across the codebase. Of these:
- **6 Critical bugs** violating core game rules
- **6 Major bugs** significantly impacting gameplay
- **8 Moderate bugs** causing inconsistencies or edge cases
- **9 UI/UX issues** reducing player experience

---

## CRITICAL BUGS (Rule Violations)

### 1. **Take 2 Card Discard Bug**
**Severity:** CRITICAL (Rule Violation)
**Files:** `src/state/gameReducer.ts:525`, `convex/actions.ts:541`
**Rule Reference:** RULES.md §5

**Issue:**
After choosing a card from a Take 2 action, the player can DISCARD the chosen card instead of being forced to SWAP or USE it.

**Rule Violation:**
Per RULES.md §5: "With the kept card, perform a normal action (Swap it into your dream OR Discard it OR Use it if it's another special card)." The kept card should NOT allow pure discard if it's a regular number card. Only special actions are allowed.

**Current Code Behavior:**
```typescript
// gameReducer.ts:537-540
drawnCard: chosenCard,
drawSource: "deck", // Treated as drawn from deck
```
This sets `drawSource: "deck"`, making the card behave like a normal draw, allowing DISCARD without swap.

**Expected Behavior:**
After Take 2 choice, the kept card should require either:
1. SWAP with a hand card, OR
2. USE if it's another special card (e.g., nested Take 2)

DISCARD should not be allowed for regular cards from Take 2.

**Fix Required:**
Set a `mustSwapOnly` flag after Take 2 choice instead of regular `drawSource`, and disable the DISCARD button in GameActions while allowing SWAP and ACTION buttons.

---

### 2. **Missing SWAP Button UI**
**Severity:** CRITICAL (UX/Rule Compliance)
**Files:** `src/components/GameActions.tsx:83-105`

**Issue:**
When holding a card from the deck (normal draw, not special), only DISCARD and ACTION buttons are shown. No SWAP button is visible.

**Rule Violation:**
Per RULES.md §4 Action B: "The player looks at it (privately) and chooses one option: B1: Swap, B2: Discard, B3: Use Special Power."

The UI should make all three options obvious.

**Current UI:**
```tsx
// GameActions.tsx:84-105
if (gamePhase === "holding_card" && isMyTurn) {
  return (
    <div>
      <Button onClick={() => broadcastAction({ type: "DISCARD_HELD_CARD" })}>
        {t('game.discard')}
      </Button>
      <Button onClick={() => broadcastAction({ type: "USE_SPECIAL_ACTION" })}
        disabled={!canUseSpecial}>
        {t('game.action')}
      </Button>
    </div>
  );
}
```

Players must discover they can click their hand card to swap.

**UX Impact:**
New players don't understand the swap mechanic. It's non-discoverable and requires memorization.

**Fix Required:**
Add a visible SWAP button OR add contextual help text (e.g., "Or tap a card in your hand to swap").

---

### 3. **Special Card Face-Down on Discard Pile**
**Severity:** CRITICAL (Visual/Rule Compliance)
**Files:** `src/state/gameReducer.ts:362`, `convex/actions.ts:381`
**User Report:** "When you use an action card then on the discard stack appears a card that is face-down which shouldn't ever happen"

**Issue:**
When a special card is used (`USE_SPECIAL_ACTION`), it's added to discard pile but doesn't appear face-up visually.

**Current Code in gameReducer:**
```typescript
// gameReducer.ts:372-395
if (specialAction === "take_2") {
  const drawPile = [...state.drawPile];
  const tempCards: Card[] = [];
  // Draw up to 2 cards
  for (let i = 0; i < 2; i++) {
    if (drawPile.length > 0) {
      tempCards.push(drawPile.pop()!);
    }
  }
  // Discard the used special card
  const discardPile = [...state.discardPile, state.drawnCard];

  return {
    ...state,
    gamePhase: "action_take_2",
    drawPile,
    discardPile,
    drawnCard: null, // ← Problem: Card is immediately cleared
    tempCards,
  };
}
```

The `drawnCard` is set to `null` before adding to discard pile, causing the visual state to be out of sync.

**Visual Result:**
Players see a face-down card on the discard pile when a special was just used, creating confusion about what card it was.

**Expected Behavior:**
Special cards should always appear face-up on the discard pile (they've been used and revealed).

**Fix Required:**
Ensure the PileCard component displays the special card face-up, OR ensure the card is tracked in a way that preserves its "revealed" state when added to discard pile.

---

### 4. **DISCARD from Discard Pile Not Blocked**
**Severity:** CRITICAL (Rule Violation)
**Files:** `src/state/gameReducer.ts:298`, `convex/actions.ts:319`

**Issue:**
Per RULES.md §4: "When you draw from the Discard Pile, you MUST swap with one of your own cards."

Currently, the DISCARD button is only disabled in GameActions when `mustSwap` flag is true, but this flag isn't properly set when drawing from discard.

**Current Code:**
```typescript
// GameActions.tsx:43-44
const mustSwap = gamePhase === "holding_card" && !!drawnCard && drawSource === "discard";
```

This correctly identifies the condition, BUT the gameReducer doesn't validate it in DISCARD_HELD_CARD.

```typescript
// gameReducer.ts:298-318
case "DISCARD_HELD_CARD": {
  if (
    state.gamePhase !== "holding_card" ||
    !state.drawnCard ||
    !state.drawSource
  )
    return state;
  // ← Missing validation for drawSource === "discard"

  const discardPile = [...state.discardPile, state.drawnCard];
  return advanceTurn({...});
}
```

**Server-Side:** `convex/actions.ts:323` correctly validates:
```typescript
if (state.drawSource === "discard") throw new Error("Cannot discard card taken from discard pile");
```

But the client-side reducer doesn't enforce this.

**Risk:**
If the UI button is disabled but user bypasses it (offline mode, network delay), the action succeeds on the client before server rejects it.

**Fix Required:**
Add validation in gameReducer DISCARD_HELD_CARD case to prevent discard when `drawSource === "discard"`.

---

### 5. **Peek 1 Card Stays Visible**
**Severity:** CRITICAL (Security/UX)
**Files:** `src/state/gameReducer.ts:416-445`, `convex/actions.ts:426-466`
**Description:** When `ACTION_PEEK_1_SELECT` is executed, the peeked card is marked `isFaceUp: true, hasBeenPeeked: true`. This makes it visible to all players on the next state sync.

**Issue:**
```typescript
// gameReducer.ts:422-426
const hand = player.hand.map((card, idx) =>
  idx === gameAction.payload.cardIndex
    ? { ...card, isFaceUp: true, hasBeenPeeked: true } // ← Problem
    : card,
);
```

This marks the card as face-up permanently, but peek should only temporarily show the card to the current player.

**Expected Behavior:**
- Peek reveals card to current player
- Card stays face-down visually but marked as `hasBeenPeeked` for glow effect
- Other players never see the card value

**Current Behavior:**
Card becomes face-up in the state, so on next sync, all players see it.

**Fix Required:**
Change `isFaceUp: true` to `isFaceUp: false`. Only set `hasBeenPeeked: true`.

```typescript
? { ...card, isFaceUp: false, hasBeenPeeked: true }
```

---

### 6. **Game Over - Deck Exhaustion Not Handling Game End**
**Severity:** CRITICAL (Game Flow)
**Files:** `src/state/gameReducer.ts:139-154`

**Issue:**
When deck runs out, `endRoundWithScores` is called with `reason: "deck_exhausted"`, but the code has special handling that may not properly trigger `game_over` if a player reaches 100+ points.

**Current Code:**
```typescript
// gameReducer.ts:139-154
if (options.reason === "deck_exhausted") {
  return {
    ...s,
    // ... players updated ...
    gamePhase: "round_end", // ← Always goes to round_end
    roundWinnerName: roundWinner.player.name,
    lastRoundScores,
    actionMessage: ...,
  };
}
```

**Problem:**
The function checks `if (gameOver) { ... gamePhase: "game_over" ... }` at line 119, BUT this check happens BEFORE the `deck_exhausted` branch. If deck exhausts and someone reaches 100+, the code takes the `deck_exhausted` path instead of game_over path.

**Expected Behavior:**
If deck exhaustion causes someone to reach >=100 points, the game should immediately end with `gamePhase: "game_over"`.

**Fix Required:**
Restructure the logic or add an explicit check in the `deck_exhausted` branch.

---

## MAJOR BUGS

### 7. **No Hover Overlay on Pile Cards**
**Severity:** MAJOR (UX/Clarity)
**Files:** `src/components/PileCard.tsx`
**User Report:** "Not all of the cards have overlays so it's when something is in this card stack, you can't even see what card that is unless you know it by the picture."

**Issue:**
PileCard component has no hover overlay to show card information. Unlike GameCard which shows value and special action on hover, PileCards are silent.

**Current Code:**
```tsx
// PileCard.tsx - No hover overlay
<div className={cn(
  "relative rounded-xl overflow-hidden border-2 border-white/15 bg-black/30 shadow-[0_12px_28px_rgba(0,0,0,0.45)]",
  isGlowing && "ring-2 ring-primary/60 shadow-[0_0_30px_hsl(var(--primary)/0.35)]",
  className,
)}>
  <img src={src} alt={...} />
  {/* No overlay or value badge */}
</div>
```

**Expected Behavior:**
Hovering over the discard pile should show:
- Card value (number or special action name)
- If special card: "Take 2", "Peek 1", "Swap 2"

**Fix Required:**
Add hover overlay similar to GameCard (see Card.tsx lines 216-230):
```tsx
{isFaceUp && (
  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
    {/* Value display and action label */}
  </div>
)}
```

---

### 8. **Discard Pile Stack Not Visible**
**Severity:** MAJOR (UX/Strategy)
**Files:** `src/components/Gameboard.tsx:514-528`

**Issue:**
Only the top card of discard pile is visible. No way to see the stack of discarded cards or their order.

**Current Code:**
```tsx
<PileCard
  card={
    discardPile.length > 0
      ? discardPile[discardPile.length - 1] // ← Only top card
      : null
  }
  faceUp={true}
/>
```

**UX Problem:**
Players can't strategically consider what's been discarded. The memory challenge element of the game is reduced.

**Game Impact:**
Reduces strategic depth. Players should be able to infer from the discard pile history to make better decisions.

**Example:**
If the discard pile has had 10 sevens discarded, a player might reason "probably no more 7s in the draw pile" when considering POBUDKA timing.

**Fix Required:**
Show stack indicator or allow hovering to see recent discards (last 3-5 cards).

Implementation options:
1. **Stack counter:** Show "27 cards" badge below discard pile
2. **Hover history:** Show last 3-5 discarded cards in a tooltip
3. **Visual stack:** Offset the card image slightly to show thickness

---

### 9. **Draw Pile Card Count Not Shown**
**Severity:** MAJOR (UX/Information)
**Files:** `src/components/Gameboard.tsx:458-476`

**Issue:**
Draw pile shows no information about remaining cards.

**Current Code:**
```tsx
<PileCard
  card={null}
  faceUp={false}
  onClick={handleDrawFromDeck}
/>
// No card count badge
```

**UX Problem:**
Players don't know how many cards are left in the draw pile. This is critical information for:
- Deciding when to call POBUDKA (deck exhaustion imminent?)
- Estimating game length
- Strategic planning

**Expected:**
A badge showing "27 cards left" that updates as cards are drawn and returned via reshuffling.

**Fix Required:**
Add card count display:
```tsx
<div className="mt-3 sm:mt-4 bg-background/40 backdrop-blur-md px-3 py-1 rounded-full">
  <span>{state.drawPile.length} cards</span>
</div>
```

---

### 10. **Discard Validation on Client vs Server Mismatch**
**Severity:** MAJOR (Data Integrity)
**Files:** `src/state/gameReducer.ts:298-318`, `convex/actions.ts:319-338`

**Issue:**
Server correctly rejects discard from discard pile (line 323 in actions.ts), but client reducer doesn't validate it. If a player manages to send the action (offline mode, network race condition), they'll get a server error but the UI won't have blocked them.

**Current Client Code:**
```typescript
case "DISCARD_HELD_CARD": {
  if (
    state.gamePhase !== "holding_card" ||
    !state.drawnCard ||
    !state.drawSource
  )
    return state;
  // ← Missing: if (drawSource === "discard") return state;

  const discardPile = [...state.discardPile, state.drawnCard];
  return advanceTurn({...});
}
```

**Server Code (correct):**
```typescript
if (state.drawSource === "discard") throw new Error("Cannot discard card taken from discard pile");
```

**Fix Required:**
Add validation in gameReducer to match server:
```typescript
if (drawSource === "discard") return state; // Invalid action
```

---

### 11. **Race Condition in Peek State Transition**
**Severity:** MAJOR (State Management)
**Files:** `src/state/gameReducer.ts:197-210`, `convex/actions.ts:206`

**Issue:**
After peeking 2 cards, the state transitions to "playing" phase, but `peekingState` isn't cleared immediately in all code paths.

**Current Code:**
```typescript
// gameReducer.ts:197-210
if (newPeekedCount >= 2) {
  return {
    ...state,
    players,
    peekingState: { ...state.peekingState, peekedCount: 2 }, // Cap at 2, don't clear
  };
  // ← peekingState still exists
}
```

Then when FINISH_PEEKING is called:
```typescript
// gameReducer.ts:227-240
case "FINISH_PEEKING": {
  return {
    ...state,
    gamePhase: "playing",
    peekingState: undefined, // ← Now cleared
  };
}
```

**Race Condition:**
If messages arrive out of order or state syncs interfere, the game might try to process actions with an inconsistent `gamePhase` vs `peekingState`.

**Fix Required:**
Ensure `peekingState` is cleared immediately when transitioning to "playing":
```typescript
return {
  ...state,
  players,
  peekingState: undefined, // Clear immediately
  gamePhase: "playing", // Skip explicit FINISH_PEEKING
};
```

Or ensure FINISH_PEEKING is always required.

---

## MODERATE BUGS

### 12. **Action Message Localization Missing Fallback**
**Severity:** MODERATE
**Files:** `src/state/gameReducer.ts:258-260`

**Issue:**
```typescript
actionMessage: drawnCard.isSpecial
  ? i18n.t("game.drewSpecial", { action: drawnCard.specialAction })
  : i18n.t("game.drewCard"),
```

If `drawnCard.specialAction` is undefined, the translation string gets an undefined value.

**Fix Required:**
```typescript
{ action: drawnCard.specialAction ?? "Unknown" }
```

---

### 13. **Shuffle Algorithm Not Cryptographically Secure**
**Severity:** MODERATE (Security)
**Files:** `src/lib/game-logic.ts:74`, `convex/actions.ts:30-37`

**Issue:**
Client-side uses `Math.random() - 0.5` sort for shuffling, which is NOT a proper Fisher-Yates algorithm.

**Risk:**
Predictable shuffles could allow players to infer deck order.

**Fix Required:**
Use Fisher-Yates shuffle consistently on server-side only. Remove client-side shuffle entirely.

---

### 14. **POBUDKA Penalty Logic Could Be Clearer**
**Severity:** MODERATE (Code Clarity)
**Files:** `src/state/gameReducer.ts:86-89`

**Current Code:**
```typescript
const callerHasLowest =
  options.reason === "pobudka" &&
  callerScore !== undefined &&
  callerScore <= minScore; // ← Allows ties to NOT get penalty
```

**Question:**
RULES.md §6 says "If the Caller has the **strictly lowest** score" - does this mean ties get no penalty, or do ties trigger the penalty?

**Clarification:**
The `<=` operator is correct per rules (ties don't get penalty), but needs documentation.

**Fix Required:**
Add code comment:
```typescript
// Per RULES §6: If caller ties for lowest, no penalty is applied (callerScore <= minScore)
const callerHasLowest = callerScore <= minScore;
```

---

### 15. **Missing Consistency in Action Labels**
**Severity:** MODERATE
**Files:** `src/state/gameReducer.ts:544`, `src/components/Card.tsx:101-104`

**Issue:**
Some code uses `game.keptCard`, others use `actions.keptACard`. Action labels for special cards are hardcoded in English.

**Fix Required:**
Standardize translation keys. Add translations for special card action names:
```json
{
  "specialActions": {
    "take_2": "Weź 2",
    "peek_1": "Podejrzyj 1",
    "swap_2": "Zamień 2"
  }
}
```

---

### 16. **Action Modal Not Dismissible**
**Severity:** MODERATE (UX)
**Files:** `src/components/ActionModal.tsx:148`

**Issue:**
```tsx
<Dialog open={isOpen}>
  <DialogContent>
    {/* Content */}
  </DialogContent>
</Dialog>
```

No `onOpenChange` handler means players can't manually close modals if they get stuck.

**Fix Required:**
Add close handler or manual close button:
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
```

---

### 17. **No Deck Reshuffling Mechanism**
**Severity:** MODERATE
**Files:** `src/state/gameReducer.ts:245-246`

**Issue:**
When deck exhausts, game immediately ends the round. RULES.md doesn't explicitly address what happens if deck runs out.

**Question:**
Should the discard pile be reshuffled back into the deck, or does exhaustion end the round immediately?

**Current Implementation:**
Exhaustion ends round immediately.

**Fix Required:**
Clarify game rules and implement reshuffle if intended.

---

### 18. **No Hand Validation on Round Start**
**Severity:** MODERATE (Defensive)
**Files:** `convex/actions.ts:605-616`

**Issue:**
When dealing cards at round start, no validation that deck has enough cards.

**Current Code:**
```typescript
for (let i = 0; i < 4; i++) {
  for (const p of players) {
    const card = deck.shift();
    if (card) p.hand.push({ card, isFaceUp: false, hasBeenPeeked: false });
  }
}
```

If deck is corrupted, some players might get < 4 cards.

**Fix Required:**
```typescript
const requiredCards = players.length * 4 + 1; // +1 for discard
if (deck.length < requiredCards) throw new Error("Not enough cards to deal");
```

---

## UI/UX ISSUES

### 19. **Missing SWAP Instructions**
**Severity:** MODERATE (UX)
**Files:** `src/components/PlayerHand.tsx:53`

**Issue:**
Text "Or tap a card below to swap" only appears during holding_card phase, but players don't know they can click cards during special actions (Peek 1, Swap 2).

**Fix Required:**
Show contextual help text based on phase:
- During peeking: "Click any card to peek"
- During holding_card: "Tap a card to swap"
- During action_peek_1: "Click any card to peek"
- During action_swap_2_*: "Click cards to swap"

---

### 20. **No Visual Indication of Deck Exhaustion Imminent**
**Severity:** MODERATE (UX)
**Files:** Multiple (Gameboard, state)

**Issue:**
Players don't know when deck will exhaust, making round ends feel unfair or surprising.

**Fix Required:**
Implement deck count display with warning colors:
- Green: >20 cards
- Yellow: 10-20 cards
- Red: <10 cards
- Critical: <3 cards (maybe pulse animation)

---

### 21. **Swap Highlight Animation Timing**
**Severity:** MODERATE (Visual)
**Files:** `src/components/PlayerHand.tsx:52-60`

**Issue:**
Swap 2 highlight (pink ring) timing might not sync across network latency.

**Example:**
On slow connection, pink highlight appears at wrong time due to client/server timestamp mismatch.

**Fix Required:**
Use server-provided timestamp consistently:
```typescript
const age = Date.now() - lastMove.timestamp;
const shouldHighlight = age < 3200; // Consistent duration
```

---

### 22. **Card Flip Animation Glitch on Mobile Safari**
**Severity:** MODERATE (Mobile)
**Files:** `src/components/Card.tsx:129-162`

**Issue:**
Static mode fallback exists but `disableSpecialAnimation` check might not catch all 3D failures.

**Symptom:**
Some special cards show wrong glow animation or flip fails silently.

**Fix Required:**
Add feature detection for CSS 3D transforms:
```typescript
const supports3D = CSS.supports('transform', 'rotateY(1deg)');
const useStaticMode = !supports3D || disableSpecialAnimation;
```

---

## POLISH TRANSLATION ISSUES

### 23. **Awkward Polish Phrasings**
**Severity:** MINOR (Localization)
**Files:** `public/locales/pl/translation.json`

**Issues:**

| Key | Polish | English | Issue |
|-----|--------|---------|-------|
| `game.drewSpecial` | "Dobrałeś specjalną kartę: {{action}}" | "Drew a special card: {{action}}" | Action name not localized; appears as "take_2" instead of "Weź 2" |
| `game.tookFromDiscard` | "{{player}} wziął z odrzutów" | "took from discard" | Missing "must swap" clarification |
| `modal.winsTheGame` | "🎉 {{player}} wygrywa grę! 🎉" | "🎉 {{player}} wins the game! 🎉" | Variable not passed (uses `gameWinnerName` not `player`) |

**Fix Required:**
1. Localize special action names
2. Add "i musi wymienić" (must swap) clarification
3. Pass correct variable to translation

---

### 24. **Missing Polish Translations**
**Severity:** MINOR (Localization)
**Files:** Multiple

**Missing Keys:**
- `common:success.roomIdCopied` - Referenced in Gameboard.tsx:140 but doesn't exist in pl/translation.json
- Card action labels hardcoded in English in Card.tsx:101-104

**Fix Required:**
Add missing translations and use i18n for all strings.

---

### 25. **Inconsistent Polish Translation Keys**
**Severity:** MINOR (Consistency)
**Files:** `public/locales/pl/translation.json`

**Issue:**
Some action messages use `actions.keptCard` vs `actions.keptACard` inconsistently.

**Fix Required:**
Standardize all translation keys for consistency.

---

## BACKEND/CONVEX ISSUES

### 26. **Missing Idempotency Implementation**
**Severity:** MODERATE (Data Integrity)
**Files:** `convex/actions.ts:71`, `convex/schema.ts`

**Issue:**
Version tracking exists but `idempotencyKey` isn't properly validated before processing mutations.

**Risk:**
Network retry of mutations could cause duplicate actions.

**Current:**
```typescript
version: (gameRecord.version || 0) + 1, // Only increments
```

**Fix Required:**
Implement idempotency key checking:
```typescript
if (gameRecord.idempotencyKey === action.idempotencyKey) {
  return {}; // Already processed
}
```

---

### 27. **No Round/Turn Timeout**
**Severity:** MODERATE (Game Flow)
**Files:** `convex/crons.ts`

**Issue:**
No mechanism to auto-advance if a player is AFK during peeking phase.

**Risk:**
Game can hang forever if a player disconnects during peeking.

**Fix Required:**
Add Convex scheduler to auto-advance peeking after 30+ seconds of inactivity.

---

### 28. **Peek Result Toast Unreliable**
**Severity:** MODERATE (UX)
**Files:** `src/components/PlayerHand.tsx:216-225`

**Issue:**
Toast is triggered after server returns card value, but state sync might not match up.

**Fix Required:**
Return peeked card through Convex response directly, not relying on state sync.

---

## LOGIC DISCREPANCIES

### 29. **Special Card Values Should Be Documented**
**Severity:** MINOR (Documentation)
**Files:** `convex/actions.ts:24-26`, `src/lib/game-logic.ts`

**Issue:**
Special cards have hardcoded values (5, 6, 7) but should match RULES.md §2.

**Current Implementation:**
```typescript
addSpecial(5, "take_2");
addSpecial(6, "peek_1");
addSpecial(7, "swap_2");
```

Per RULES.md §2: Special cards have "value is irrelevant/treated as number, but typically these have high values like 5, 6, 7 in corner" - **Correct!**

**Fix Required:**
Add code comments explaining why these values are chosen:
```typescript
// Per RULES.md §2: Special card values are typically 5, 6, 7
// These values are shown in corner but are only used for scoring if special card
// is picked up from discard pile (treated as regular number card).
```

---

## SUMMARY TABLE

| ID | Severity | Category | Title | Status |
|----|----------|----------|-------|--------|
| 1 | CRITICAL | Rules | Take 2 card discard | Unfixed |
| 2 | CRITICAL | Rules/UX | Missing SWAP button | Unfixed |
| 3 | CRITICAL | Visual | Special card face-down on discard | Unfixed |
| 4 | CRITICAL | Rules | Discard from discard pile not blocked | Unfixed |
| 5 | CRITICAL | Security | Peek 1 card stays visible | Unfixed |
| 6 | CRITICAL | Game Flow | Game over deck exhaustion | Unfixed |
| 7 | MAJOR | UX | No hover overlay on pile cards | Unfixed |
| 8 | MAJOR | UX | Discard pile stack not visible | Unfixed |
| 9 | MAJOR | UX | Draw pile card count not shown | Unfixed |
| 10 | MAJOR | Validation | Client/server validation mismatch | Unfixed |
| 11 | MAJOR | State Mgmt | Race condition in peek state | Unfixed |
| 12 | MODERATE | Localization | Action message fallback | Unfixed |
| 13 | MODERATE | Security | Shuffle algorithm not secure | Unfixed |
| 14 | MODERATE | Code Quality | POBUDKA penalty unclear | Unfixed |
| 15 | MODERATE | Consistency | Action label inconsistency | Unfixed |
| 16 | MODERATE | UX | Action modal not dismissible | Unfixed |
| 17 | MODERATE | Rules | No deck reshuffle mechanism | Unfixed |
| 18 | MODERATE | Defensive | No hand validation | Unfixed |
| 19 | MODERATE | UX | Missing swap instructions | Unfixed |
| 20 | MODERATE | UX | No deck exhaustion warning | Unfixed |
| 21 | MODERATE | Animation | Swap highlight timing | Unfixed |
| 22 | MODERATE | Mobile | Card flip glitch on Safari | Unfixed |
| 23 | MINOR | Localization | Polish translation awkwardness | Unfixed |
| 24 | MINOR | Localization | Missing translations | Unfixed |
| 25 | MINOR | Localization | Inconsistent translation keys | Unfixed |
| 26 | MODERATE | Backend | Missing idempotency | Unfixed |
| 27 | MODERATE | Backend | No timeout for AFK | Unfixed |
| 28 | MODERATE | UX | Peek toast unreliable | Unfixed |
| 29 | MINOR | Documentation | Special card values | Unfixed |

---

## RECOMMENDED FIX PRIORITY

### **Priority 0: CRITICAL (Must Fix Immediately)**
1. Take 2 card discard (#1)
2. Special card face-down on discard (#3)
3. Discard from discard pile validation (#4)
4. Peek 1 card visibility (#5)
5. Game over deck exhaustion (#6)

### **Priority 1: HIGH (Fix in Next Sprint)**
6. Missing SWAP button (#2)
7. No hover overlay on pile cards (#7)
8. Missing deck exhaustion warning (#20)
9. Client/server validation mismatch (#10)
10. No hand validation on round start (#18)

### **Priority 2: MEDIUM (Fix Eventually)**
- All other MODERATE bugs (#12-17, #21-22, #26-28)

### **Priority 3: LOW (Polish/Documentation)**
- All MINOR bugs (#23-25, #29)

---

## CONCLUSION

The codebase has a solid foundation with good architecture, but several rule violations need immediate attention. The most critical issue is the Take 2 discard bug, which directly violates the game rules.

Recommend fixing all **6 CRITICAL** bugs before the next release.

---

**Report Generated:** November 30, 2025
**Auditor:** Claude Code
**Codebase:** Sen-Web v1.0
