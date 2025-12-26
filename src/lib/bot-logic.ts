import { BotDifficulty, GameState, GameAction, Player } from "@/types";

// bot memory: tracks cards it has seen (own cards)
// stored as map of cardIndex -> value
interface BotMemory {
  ownCards: Map<number, number>;
  lastPeekedOpponentCard?: { playerId: string; cardIndex: number; value: number };
}

// global memory store keyed by bot player id
const botMemories = new Map<string, BotMemory>();

function getMemory(botId: string): BotMemory {
  if (!botMemories.has(botId)) {
    botMemories.set(botId, { ownCards: new Map() });
  }
  return botMemories.get(botId)!;
}

export function clearBotMemory(botId: string) {
  botMemories.delete(botId);
}

export function clearAllBotMemory() {
  botMemories.clear();
}

// helper to get a random element from array
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type DifficultySettings = {
  takeDiscardThreshold: number;
  takeDiscardChance: number;
  useSpecialChance: number;
  callPobudkaChance: (knownCount: number, estimatedScore: number) => number;
  mistakeChance: number;
};

function getDifficultySettings(difficulty: BotDifficulty): DifficultySettings {
  switch (difficulty) {
    case "easy":
      return {
        takeDiscardThreshold: 2,
        takeDiscardChance: 0.45,
        useSpecialChance: 0.18,
        callPobudkaChance: (knownCount, score) =>
          knownCount >= 4 && score <= 6 ? 0.12 : 0,
        mistakeChance: 0.35,
      };
    case "normal":
      return {
        takeDiscardThreshold: 3,
        takeDiscardChance: 0.75,
        useSpecialChance: 0.35,
        callPobudkaChance: (knownCount, score) =>
          knownCount >= 3 && score <= 7 ? 0.18 : knownCount >= 4 && score <= 6 ? 0.32 : 0,
        mistakeChance: 0.12,
      };
    case "hard":
    default:
      return {
        takeDiscardThreshold: 3,
        takeDiscardChance: 0.92,
        useSpecialChance: 0.5,
        callPobudkaChance: (knownCount, score) =>
          knownCount >= 3 && score <= 8 ? 0.35 : knownCount >= 4 && score <= 7 ? 0.55 : 0,
        mistakeChance: 0.03,
      };
  }
}

function pickWithMistake<T>(difficulty: BotDifficulty, best: T, fallback: T): T {
  const { mistakeChance } = getDifficultySettings(difficulty);
  return Math.random() < mistakeChance ? fallback : best;
}

// estimate bot's current hand score based on memory
function estimateOwnScore(bot: Player, memory: BotMemory): number {
  let total = 0;

  for (let i = 0; i < bot.hand.length; i++) {
    if (memory.ownCards.has(i)) {
      total += memory.ownCards.get(i)!;
    } else {
      // assume unknown cards average around 5
      total += 5;
    }
  }

  return total;
}

// find the highest known card index in bot's hand
function findHighestKnownCard(memory: BotMemory): number | null {
  let highest = -1;
  let highestIdx: number | null = null;

  for (const [idx, value] of memory.ownCards) {
    if (value > highest) {
      highest = value;
      highestIdx = idx;
    }
  }

  return highestIdx;
}

// find a random unknown card index
function findUnknownCard(bot: Player, memory: BotMemory): number | null {
  const unknowns: number[] = [];
  for (let i = 0; i < bot.hand.length; i++) {
    if (!memory.ownCards.has(i)) {
      unknowns.push(i);
    }
  }
  return unknowns.length > 0 ? randomFrom(unknowns) : null;
}

// bot decision during peeking phase
export function decidePeekAction(state: GameState, botId: string): GameAction | null {
  const botIndex = state.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) return null;

  const peekingState = state.peekingState;
  const currentPeekerId =
    peekingState !== undefined
      ? state.players[peekingState.playerIndex]?.id
      : undefined;
  if (currentPeekerId !== botId) return null;

  if (peekingState && peekingState.peekedCount >= 2) {
    return { type: "FINISH_PEEKING" };
  }

  const bot = state.players[botIndex];
  const memory = getMemory(botId);

  // find cards not yet peeked
  const unpeeked: number[] = [];
  for (let i = 0; i < bot.hand.length; i++) {
    if (!memory.ownCards.has(i)) {
      unpeeked.push(i);
    }
  }

  if (unpeeked.length === 0) return null;

  // peek at a random unpeeked card
  const cardIndex = randomFrom(unpeeked);

  // remember what we peeked (will be updated when action resolves)
  // for now, we just return the action
  return {
    type: "PEEK_CARD",
    payload: { playerId: botId, cardIndex },
  };
}

// called after peek resolves to update memory
export function rememberPeekedCard(botId: string, cardIndex: number, value: number) {
  const memory = getMemory(botId);
  memory.ownCards.set(cardIndex, value);
}

export function forgetRememberedCard(botId: string, cardIndex: number) {
  const memory = getMemory(botId);
  memory.ownCards.delete(cardIndex);
}

// bot decision during playing phase (start of turn)
export function decidePlayAction(state: GameState, botId: string): GameAction | null {
  const botIndex = state.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) return null;

  const bot = state.players[botIndex];
  const memory = getMemory(botId);
  const estimatedScore = estimateOwnScore(bot, memory);
  const difficulty = state.botDifficulty ?? "hard";
  const settings = getDifficultySettings(difficulty);

  // consider calling POBUDKA if score looks good
  // only call if we've seen most of our cards and score is low
  const knownCount = memory.ownCards.size;
  const pobudkaChance = settings.callPobudkaChance(knownCount, estimatedScore);
  if (pobudkaChance > 0 && Math.random() < pobudkaChance) {
    return { type: "CALL_POBUDKA" };
  }

  // check discard pile
  const topDiscard = state.discardPile[state.discardPile.length - 1];

  if (
    topDiscard &&
    topDiscard.value <= settings.takeDiscardThreshold &&
    Math.random() < settings.takeDiscardChance
  ) {
    return { type: "DRAW_FROM_DISCARD" };
  }

  // otherwise draw from deck
  return { type: "DRAW_FROM_DECK" };
}

// bot decision when holding a card (after drawing)
export function decideHeldCardAction(state: GameState, botId: string): GameAction | null {
  const botIndex = state.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) return null;

  const bot = state.players[botIndex];
  const memory = getMemory(botId);
  const drawnCard = state.drawnCard;
  const difficulty = state.botDifficulty ?? "hard";
  const settings = getDifficultySettings(difficulty);

  if (!drawnCard) return null;

  // If we drew from discard, we MUST swap (can't discard, can't use special).
  if (state.drawSource === "discard") {
    const highestKnown = findHighestKnownCard(memory);
    if (
      highestKnown !== null &&
      memory.ownCards.get(highestKnown)! > drawnCard.value
    ) {
      return { type: "SWAP_HELD_CARD", payload: { cardIndex: highestKnown } };
    }
    const unknown = findUnknownCard(bot, memory);
    return {
      type: "SWAP_HELD_CARD",
      payload: { cardIndex: unknown ?? 0 },
    };
  }

  // if it's a special card from deck, maybe use it
  if (
    drawnCard.isSpecial &&
    (state.drawSource === "deck" || state.drawSource === "take2")
  ) {
    if (Math.random() < settings.useSpecialChance) {
      return { type: "USE_SPECIAL_ACTION" };
    }
  }

  // If we got here with take2, discard is not allowed (must swap).
  if (state.drawSource === "take2") {
    const highestKnown = findHighestKnownCard(memory);
    if (
      highestKnown !== null &&
      memory.ownCards.get(highestKnown)! > drawnCard.value
    ) {
      return { type: "SWAP_HELD_CARD", payload: { cardIndex: highestKnown } };
    }
    const unknown = findUnknownCard(bot, memory);
    return {
      type: "SWAP_HELD_CARD",
      payload: { cardIndex: unknown ?? 0 },
    };
  }

  // if drawn card is good (low value)
  if (drawnCard.value <= 3) {
    // find a high card or unknown card to swap with
    const highestKnown = findHighestKnownCard(memory);

    if (highestKnown !== null && memory.ownCards.get(highestKnown)! > drawnCard.value) {
      // swap with highest known
      return { type: "SWAP_HELD_CARD", payload: { cardIndex: highestKnown } };
    }

    const unknown = findUnknownCard(bot, memory);
    const bestIdx = unknown ?? 0;
    const fallbackIdx = 0;
    return {
      type: "SWAP_HELD_CARD",
      payload: { cardIndex: pickWithMistake(difficulty, bestIdx, fallbackIdx) },
    };
  }

  // if drawn card is bad (high value), discard it
  if (drawnCard.value >= 7) {
    return { type: "DISCARD_HELD_CARD" };
  }

  // medium value card (4-6): swap with highest known if better, else discard
  const highestKnown = findHighestKnownCard(memory);
  if (highestKnown !== null && memory.ownCards.get(highestKnown)! > drawnCard.value) {
    return { type: "SWAP_HELD_CARD", payload: { cardIndex: highestKnown } };
  }

  // discard medium cards most of the time
  if (Math.random() < (difficulty === "easy" ? 0.85 : difficulty === "normal" ? 0.75 : 0.65)) {
    return { type: "DISCARD_HELD_CARD" };
  }

  // occasionally swap with unknown
  const unknown = findUnknownCard(bot, memory);
  if (unknown !== null) {
    return { type: "SWAP_HELD_CARD", payload: { cardIndex: unknown } };
  }

  return { type: "DISCARD_HELD_CARD" };
}

// bot decision for take_2 action
export function decideTake2Action(state: GameState): GameAction | null {
  const tempCards = state.tempCards;
  if (!tempCards || tempCards.length !== 2) return null;

  // pick the lower value card
  const [card1, card2] = tempCards;
  const chosenCard = card1.value <= card2.value ? card1 : card2;

  return { type: "ACTION_TAKE_2_CHOOSE", payload: { card: chosenCard } };
}

// bot decision for peek_1 action
export function decidePeek1Action(state: GameState, botId: string): GameAction | null {
  const botIndex = state.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) return null;

  const bot = state.players[botIndex];
  const memory = getMemory(botId);
  const difficulty = state.botDifficulty ?? "hard";

  // prefer peeking at own unknown cards
  const unknownOwn = findUnknownCard(bot, memory);
  const ownPeekChance = difficulty === "easy" ? 0.85 : difficulty === "normal" ? 0.7 : 0.55;
  if (unknownOwn !== null && Math.random() < ownPeekChance) {
    return {
      type: "ACTION_PEEK_1_SELECT",
      payload: { playerId: botId, cardIndex: unknownOwn },
    };
  }

  // otherwise peek at opponent's card
  const opponents = state.players.filter((p) => p.id !== botId);
  if (opponents.length > 0) {
    const opponent = randomFrom(opponents);
    const cardIndex = Math.floor(Math.random() * opponent.hand.length);
    return {
      type: "ACTION_PEEK_1_SELECT",
      payload: { playerId: opponent.id, cardIndex },
    };
  }

  // fallback: peek own first card
  return {
    type: "ACTION_PEEK_1_SELECT",
    payload: { playerId: botId, cardIndex: 0 },
  };
}

// bot decision for swap_2 action (first selection)
export function decideSwap2Select1Action(state: GameState, botId: string): GameAction | null {
  const botIndex = state.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) return null;

  const memory = getMemory(botId);
  const difficulty = state.botDifficulty ?? "hard";

  // find highest known card in own hand
  const highestKnown = findHighestKnownCard(memory);

  if (highestKnown !== null && memory.ownCards.get(highestKnown)! >= 6) {
    // swap our high card
    return {
      type: "ACTION_SWAP_2_SELECT",
      payload: { playerId: botId, cardIndex: highestKnown },
    };
  }

  if (difficulty === "easy" && Math.random() < 0.35) {
    return {
      type: "ACTION_SWAP_2_SELECT",
      payload: { playerId: botId, cardIndex: Math.floor(Math.random() * 4) },
    };
  }

  // otherwise select random opponent card
  const opponents = state.players.filter((p) => p.id !== botId);
  if (opponents.length > 0) {
    const opponent = randomFrom(opponents);
    const cardIndex = Math.floor(Math.random() * opponent.hand.length);
    return {
      type: "ACTION_SWAP_2_SELECT",
      payload: { playerId: opponent.id, cardIndex },
    };
  }

  // fallback
  return {
    type: "ACTION_SWAP_2_SELECT",
    payload: { playerId: botId, cardIndex: 0 },
  };
}

// bot decision for swap_2 action (second selection)
export function decideSwap2Select2Action(state: GameState, botId: string): GameAction | null {
  const botIndex = state.players.findIndex((p) => p.id === botId);
  if (botIndex === -1) return null;

  const firstSelection = state.swapState?.card1;
  if (!firstSelection) return null;

  const memory = getMemory(botId);
  const difficulty = state.botDifficulty ?? "hard";

  // if first selection was our card, bot can either swap with own card or opponent card
  if (firstSelection.playerId === botId) {
    // allow bot to swap two of its own cards if it makes strategic sense
    const otherHighKnown = findHighestKnownCard(memory);

    // if both first selection and another card are known high values (6+), swap them together
    // to potentially put high cards in same position (though this doesn't help much in rules)
    // actually, swapping own cards is mainly useful to reposition cards, but rules don't give advantage
    // so prefer swapping with opponent unless bot is on easy mode and makes mistakes
    const shouldSwapOwnCards =
      difficulty === "easy" && Math.random() < 0.15 || // easy bots sometimes swap own cards randomly
      (otherHighKnown !== null &&
       otherHighKnown !== firstSelection.cardIndex &&
       Math.random() < 0.25); // 25% chance to swap two own cards if bot has multiple known cards

    if (shouldSwapOwnCards && otherHighKnown !== null && otherHighKnown !== firstSelection.cardIndex) {
      return {
        type: "ACTION_SWAP_2_SELECT",
        payload: { playerId: botId, cardIndex: otherHighKnown },
      };
    }

    // otherwise pick opponent's card
    const opponents = state.players.filter((p) => p.id !== botId);
    if (opponents.length > 0) {
      const opponent = randomFrom(opponents);
      const cardIndex = Math.floor(Math.random() * opponent.hand.length);
      return {
        type: "ACTION_SWAP_2_SELECT",
        payload: { playerId: opponent.id, cardIndex },
      };
    }

    // fallback to own card if no opponents (shouldn't happen in normal game)
    const fallbackIndex = otherHighKnown ?? Math.floor(Math.random() * 4);
    return {
      type: "ACTION_SWAP_2_SELECT",
      payload: { playerId: botId, cardIndex: fallbackIndex !== firstSelection.cardIndex ? fallbackIndex : (firstSelection.cardIndex + 1) % 4 },
    };
  } else {
    // first selection was opponent's, pick our own card
    const highestKnown = findHighestKnownCard(memory);
    const cardIndex = highestKnown ?? Math.floor(Math.random() * 4);
    return {
      type: "ACTION_SWAP_2_SELECT",
      payload: { playerId: botId, cardIndex },
    };
  }
}

// main entry point: get the next action for a bot given current game state
export function getBotAction(state: GameState, botId: string): GameAction | null {
  const phase = state.gamePhase;

  switch (phase) {
    case "peeking":
      return decidePeekAction(state, botId);

    case "playing":
      return decidePlayAction(state, botId);

    case "holding_card":
      return decideHeldCardAction(state, botId);

    case "action_take_2":
      return decideTake2Action(state);

    case "action_peek_1":
      return decidePeek1Action(state, botId);

    case "action_swap_2_select_1":
      return decideSwap2Select1Action(state, botId);

    case "action_swap_2_select_2":
      return decideSwap2Select2Action(state, botId);

    case "round_end":
      // bot doesn't need to do anything here, human starts next round
      return null;

    case "game_over":
    case "lobby":
    default:
      return null;
  }
}

// check if it's a bot's turn
export function isBotTurn(state: GameState, humanPlayerId: string): boolean {
  if (state.gameMode !== "solo") return false;
  if (state.gamePhase === "lobby" || state.gamePhase === "game_over") return false;

  const activePlayerId =
    state.gamePhase === "peeking" && state.peekingState !== undefined
      ? state.players[state.peekingState.playerIndex]?.id
      : state.players[state.currentPlayerIndex]?.id;

  if (!activePlayerId) return false;
  return activePlayerId !== humanPlayerId;
}

// get the current bot's id if it's their turn
export function getCurrentBotId(state: GameState, humanPlayerId: string): string | null {
  if (!isBotTurn(state, humanPlayerId)) return null;
  if (state.gamePhase === "peeking" && state.peekingState !== undefined) {
    return state.players[state.peekingState.playerIndex]?.id ?? null;
  }
  return state.players[state.currentPlayerIndex]?.id ?? null;
}
