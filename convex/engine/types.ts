/**
 * Dreamcats engine types — new edition rules (see RULES.md).
 *
 * The engine is a pure, deterministic state machine. All state is plain JSON
 * so it can live in Convex documents and be replayed/tested anywhere.
 */

export type SpecialKind = "choose_1" | "take_2" | "peek_1" | "swap_2";

export type CardKind = "number" | "hourglass" | "special";

export interface Card {
  /** Stable unique id within a deck (0..55). */
  id: number;
  kind: CardKind;
  /**
   * Printed corner value. Hourglasses print 9 but score by parity (see
   * scoring.ts). Specials score their printed value (choose_1=6, take_2=5,
   * peek_1=3, swap_2=7).
   */
  value: number;
  special?: SpecialKind;
}

export interface DreamSlot {
  card: Card;
  /** Player indices who currently know this card at this position. */
  knownTo: number[];
}

export interface PlayerState {
  id: string;
  name: string;
  dream: DreamSlot[];
  totalScore: number;
  /** Score added per finished round. */
  roundScores: number[];
  /** Slots peeked during the initial-peek phase of the current round. */
  peekedSlots: number[];
}

export type Phase =
  | "peeking" // everyone peeks 2 own cards
  | "awaitTurn" // current player chooses: drawDeck / drawDiscard / callPobudka
  | "holdingDeck" // drew from deck (or kept from take_2): swap / discard / activate
  | "holdingDiscard" // took discard top: must swap
  | "choose1Pick" // browsing discard pile, must pick a card
  | "choose1Swap" // picked a card, must swap it into own dream
  | "take2Pick" // two cards drawn, pick one to keep
  | "peek1Target" // pick any dream slot to peek
  | "swap2First" // pick first slot to swap
  | "swap2Second" // pick second slot to swap
  | "roundEnd"
  | "gameOver";

export interface GameConfig {
  /** Game ends when a total reaches this. Default 100. */
  targetScore: number;
  /** Penalty for a wrong POBUDKA call. Default 5 (house option 15). */
  wrongCallPenalty: number;
}

/** What just happened — enough for UI animation & log lines. */
export type LastAction =
  | { type: "peeked"; player: number; slot: number; targetPlayer: number }
  | { type: "roundStarted" }
  | { type: "drewDeck"; player: number }
  | { type: "drewDiscard"; player: number; card: Card }
  | { type: "swapped"; player: number; slot: number; discarded: Card }
  | { type: "discarded"; player: number; card: Card }
  | { type: "activated"; player: number; special: SpecialKind }
  | { type: "choose1Picked"; player: number; card: Card }
  | { type: "take2Kept"; player: number; discarded: Card }
  | {
      type: "swap2Done";
      player: number;
      a: { player: number; slot: number };
      b: { player: number; slot: number };
    }
  | { type: "pobudka"; player: number }
  | { type: "roundEnded"; byDeckExhaustion: boolean };

export interface RoundResult {
  /** Raw cats counted in the dream. */
  raw: number;
  /** Score actually added (0 for lowest, raw+penalty for a wrong caller). */
  added: number;
  wasLowest: boolean;
  penalty: number;
}

export interface EngineState {
  config: GameConfig;
  /** RNG seed; advanced on every shuffle. */
  seed: number;
  round: number;
  phase: Phase;
  players: PlayerState[];
  /** Last element = top. */
  drawPile: Card[];
  /** Last element = top (face up). */
  discardPile: Card[];
  currentPlayer: number;
  /** Card privately held by currentPlayer, if any. */
  held: Card | null;
  heldSource: "deck" | "discard" | "take2" | "choose1" | null;
  /** Cards drawn by take_2, awaiting the keep decision. */
  take2Cards: Card[] | null;
  swap2First: { player: number; slot: number } | null;
  /** Who called POBUDKA this round, if anyone. */
  callerIndex: number | null;
  /** Player whose action ended the round (caller or last to act). */
  roundEnder: number | null;
  lastAction: LastAction | null;
  /** Populated when phase is roundEnd / gameOver. */
  roundResults: RoundResult[] | null;
  /** Player indices sharing the win; populated at gameOver. */
  winners: number[] | null;
}

export type GameEvent =
  | { type: "peek"; player: number; slot: number }
  | { type: "drawDeck" }
  | { type: "drawDiscard" }
  | { type: "swapHeld"; slot: number }
  | { type: "discardHeld" }
  | { type: "activateSpecial" }
  | { type: "choose1Pick"; discardIndex: number }
  | { type: "take2Pick"; index: 0 | 1 }
  | { type: "peek1Target"; player: number; slot: number }
  | { type: "swap2Select"; player: number; slot: number }
  | { type: "callPobudka" }
  | { type: "nextRound" };

export class EngineError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "EngineError";
  }
}
