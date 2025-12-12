import i18n from "@/i18n/config";
import { GameState } from "@/types";

export const initialGameState: GameState = {
  gameMode: "lobby",
  roomId: null,
  hostId: null,
  players: [],
  drawPile: [],
  discardPile: [],
  startingPlayerIndex: 0,
  currentPlayerIndex: 0,
  gamePhase: "lobby",
  actionMessage: i18n.t("game.welcomeMessage"),
  roundWinnerName: null,
  gameWinnerName: null,
  turnCount: 0,
  chatMessages: [],
  drawSource: null,
  lastCallerId: null,
  lastMove: null,
};
