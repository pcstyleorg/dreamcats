import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EngineState, GameEvent, LastAction } from "../../convex/engine";
import { backAsset } from "./assets";
import { CardView } from "./CardView";
import { buzz, play, setMuted, useMuted } from "./sound";
import { LocalGame, useLocalGame } from "./store";

const REVEAL_MS = 2600;

const soundFor = (action: LastAction): Parameters<typeof play>[0] | null => {
  switch (action.type) {
    case "roundStarted":
      return "shuffle";
    case "drewDeck":
    case "drewDiscard":
      return "draw";
    case "peeked":
    case "swapped":
    case "discarded":
    case "choose1Picked":
    case "take2Kept":
      return "flip";
    case "activated":
      return "click";
    case "swap2Done":
      return "shuffle";
    case "pobudka":
      return "pobudka";
    case "roundEnded":
      return null; // the reveal wave plays its own flips
    default:
      return null;
  }
};

const promptFor = (s: EngineState, myTurn: boolean): string => {
  switch (s.phase) {
    case "peeking": {
      const left = 2 - s.players[0].peekedSlots.length;
      return left > 0
        ? `Memorize your dream: tap ${left} more card${left === 1 ? "" : "s"}`
        : "Waiting for the others to memorize…";
    }
    case "awaitTurn":
      return myTurn
        ? "Draw from a pile — or call POBUDKA"
        : `${s.players[s.currentPlayer].name} is thinking…`;
    case "holdingDeck":
      return myTurn
        ? s.held?.kind === "special"
          ? "Swap it in, discard it, or use its power"
          : "Tap a dream card to swap — or discard"
        : `${s.players[s.currentPlayer].name} drew a card…`;
    case "holdingDiscard":
    case "choose1Swap":
      return myTurn
        ? "Tap one of your dream cards to replace"
        : `${s.players[s.currentPlayer].name} is swapping…`;
    case "choose1Pick":
      return myTurn
        ? "Choose any card from the discard pile"
        : `${s.players[s.currentPlayer].name} is browsing the discards…`;
    case "take2Pick":
      return myTurn
        ? "Keep one of the two cards"
        : `${s.players[s.currentPlayer].name} took two cards…`;
    case "peek1Target":
      return myTurn
        ? "Tap any card to peek at it"
        : `${s.players[s.currentPlayer].name} is peeking…`;
    case "swap2First":
      return myTurn
        ? "Pick the first card to swap"
        : `${s.players[s.currentPlayer].name} is scheming…`;
    case "swap2Second":
      return myTurn
        ? "Pick the second card to swap"
        : `${s.players[s.currentPlayer].name} is scheming…`;
    default:
      return "";
  }
};

export interface GameTableProps {
  game: LocalGame;
  onRestart: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({ game, onRestart }) => {
  const state = useLocalGame(game);

  useEffect(() => {
    game.resume();
    return () => game.pause();
  }, [game]);

  // Temporary reveals, derived from lastAction during render; a timer only
  // marks them as expired (no direct setState in effects).
  // - "peeked" by the human mid-game (peek_1): reveal the target card.
  // - "roundStarted": hold the human's two initial peeks open briefly so the
  //   phase change doesn't snap them face-down before they can be memorized.
  const action = state.lastAction;
  const isHumanPeek =
    action?.type === "peeked" && action.player === 0 && state.phase !== "peeking";
  const isRoundStart = action?.type === "roundStarted";
  const actionKey = `${state.round}:${JSON.stringify(action)}`;
  const [expiredReveal, setExpiredReveal] = useState("");
  useEffect(() => {
    if (!isHumanPeek && !isRoundStart) return;
    const t = setTimeout(() => setExpiredReveal(actionKey), REVEAL_MS);
    return () => clearTimeout(t);
  }, [isHumanPeek, isRoundStart, actionKey]);
  const revealActive = expiredReveal !== actionKey;
  const revealedSlot =
    isHumanPeek && action.type === "peeked" && revealActive
      ? `${action.targetPlayer}:${action.slot}`
      : null;
  const holdInitialPeeks = isRoundStart && revealActive;

  // Sound + haptics driven by engine actions, so bot moves are audible too.
  const muted = useMuted();
  const playedKeyRef = useRef("");
  useEffect(() => {
    if (playedKeyRef.current === actionKey) return;
    playedKeyRef.current = actionKey;
    if (!action) return;
    const sound = soundFor(action);
    if (sound) play(sound);
    if (action.type === "pobudka") buzz([40, 60, 40]);
  }, [action, actionKey]);
  const gameOverSoundRef = useRef(false);
  useEffect(() => {
    if (state.phase !== "gameOver" || gameOverSoundRef.current) return;
    gameOverSoundRef.current = true;
    play(state.winners?.includes(0) ? "win" : "lose");
  }, [state.phase, state.winners]);

  const dispatch = (event: GameEvent) => {
    const error = game.dispatch(event);
    if (error) toast.error(error);
    else buzz(10);
  };

  const phase = state.phase;
  const roundOver = phase === "roundEnd" || phase === "gameOver";
  const myTurn = state.currentPlayer === 0 && !roundOver && phase !== "peeking";
  const me = state.players[0];

  const slotFaceUp = (player: number, slot: number): boolean => {
    if (roundOver) return true;
    if (
      player === 0 &&
      (phase === "peeking" || holdInitialPeeks) &&
      me.peekedSlots.includes(slot)
    ) {
      return true;
    }
    return revealedSlot === `${player}:${slot}`;
  };

  const anySlotTargeting =
    myTurn && (phase === "peek1Target" || phase === "swap2First" || phase === "swap2Second");

  const ownSlotActive =
    (phase === "peeking" && me.peekedSlots.length < 2) ||
    (myTurn &&
      (phase === "holdingDeck" ||
        phase === "holdingDiscard" ||
        phase === "choose1Swap")) ||
    anySlotTargeting;

  const onSlotClick = (player: number, slot: number) => {
    if (phase === "peeking" && player === 0) {
      dispatch({ type: "peek", player: 0, slot });
    } else if (
      myTurn &&
      player === 0 &&
      (phase === "holdingDeck" || phase === "holdingDiscard" || phase === "choose1Swap")
    ) {
      dispatch({ type: "swapHeld", slot });
    } else if (myTurn && phase === "peek1Target") {
      dispatch({ type: "peek1Target", player, slot });
    } else if (myTurn && (phase === "swap2First" || phase === "swap2Second")) {
      dispatch({ type: "swap2Select", player, slot });
    }
  };

  const canDraw = myTurn && phase === "awaitTurn";
  const browsing = myTurn && phase === "choose1Pick";
  const heldFaceUp =
    state.currentPlayer === 0 ||
    state.heldSource === "discard" ||
    state.heldSource === "choose1";

  const isSelected = (player: number, slot: number) =>
    state.swap2First?.player === player && state.swap2First?.slot === slot;

  return (
    <LayoutGroup>
      <div className="mx-auto flex h-dvh max-w-md flex-col gap-2 p-3 text-slate-100">
        {/* HUD */}
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold tracking-wide">
            Round {state.round} · to {state.config.targetScore}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMuted(!muted)}
              aria-label={muted ? "Unmute sounds" : "Mute sounds"}
              className="rounded p-1.5 text-slate-400 hover:text-slate-200"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <a href="/" className="rounded px-2 py-1 text-slate-400 hover:text-slate-200">
              Exit
            </a>
          </div>
        </div>

        {/* Opponents */}
        <div className="flex justify-center gap-5">
          {state.players.slice(1).map((p, idx) => {
            const player = idx + 1;
            const isTheir = state.currentPlayer === player && !roundOver && phase !== "peeking";
            return (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    isTheir ? "text-amber-300" : "text-slate-300",
                  )}
                >
                  {isTheir && (
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-amber-300"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                  {p.name} · {p.totalScore}
                </span>
                <div className="flex gap-1">
                  {p.dream.map((slot, i) => (
                    <CardView
                      key={slot.card.id}
                      card={slot.card}
                      faceUp={slotFaceUp(player, i)}
                      flipDelay={roundOver ? (player * 4 + i) * 0.09 : 0}
                      className="w-10 text-[10px] sm:w-12"
                      interactive={anySlotTargeting}
                      highlight={anySlotTargeting}
                      selected={isSelected(player, i)}
                      onClick={() => onSlotClick(player, i)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Table center: draw pile · held · discard pile */}
        <div className="flex flex-1 items-center justify-center gap-6">
          {/* Draw pile */}
          <div className="relative w-16 sm:w-20">
            <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-slate-950/70" />
            <img
              src={backAsset}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full translate-x-0.5 translate-y-0.5 rounded-lg object-cover opacity-60"
            />
            {state.drawPile.length > 0 ? (
              <CardView
                card={state.drawPile[state.drawPile.length - 1]}
                faceUp={false}
                className="w-full"
                interactive={canDraw}
                highlight={canDraw}
                onClick={() => dispatch({ type: "drawDeck" })}
              />
            ) : (
              <div className="aspect-[5/7] w-full rounded-lg border border-dashed border-slate-600" />
            )}
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">
              {state.drawPile.length} left
            </span>
          </div>

          {/* Held card / take_2 choice */}
          <div className="flex w-20 items-center justify-center sm:w-24">
            {state.held ? (
              <CardView card={state.held} faceUp={heldFaceUp} className="w-full" />
            ) : state.take2Cards && state.currentPlayer !== 0 ? (
              <div className="flex gap-1">
                {state.take2Cards.map((c) => (
                  <CardView key={c.id} card={c} faceUp={false} className="w-10" />
                ))}
              </div>
            ) : (
              <div className="aspect-[5/7] w-full rounded-lg border border-dashed border-slate-700/70" />
            )}
          </div>

          {/* Discard pile */}
          <div className="relative w-16 sm:w-20">
            {!browsing && state.discardPile.length > 0 ? (
              <div className="relative aspect-[5/7] w-full">
                {state.discardPile.slice(-5).map((card, i, shown) => {
                  const top = i === shown.length - 1;
                  return (
                    <CardView
                      key={card.id}
                      card={card}
                      faceUp
                      className="absolute inset-0 w-full"
                      style={{ rotate: `${((card.id * 37) % 13) - 6}deg` }}
                      interactive={top && canDraw}
                      highlight={top && canDraw}
                      onClick={top ? () => dispatch({ type: "drawDiscard" }) : undefined}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="aspect-[5/7] w-full rounded-lg border border-dashed border-slate-600" />
            )}
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">
              discard
            </span>
          </div>
        </div>

        {/* Prompt */}
        <p className="min-h-5 text-center text-sm text-slate-200">
          {promptFor(state, myTurn)}
        </p>

        {/* My dream */}
        <div className="mx-auto grid w-full max-w-xs grid-cols-4 gap-2">
          {me.dream.map((slot, i) => (
            <CardView
              key={slot.card.id}
              card={slot.card}
              faceUp={slotFaceUp(0, i)}
              flipDelay={roundOver ? i * 0.09 : 0}
              className="w-full"
              interactive={ownSlotActive && (phase !== "peeking" || !me.peekedSlots.includes(i))}
              highlight={ownSlotActive && (phase !== "peeking" || !me.peekedSlots.includes(i))}
              selected={isSelected(0, i)}
              seen={slot.knownTo.includes(0) && !slotFaceUp(0, i)}
              onClick={() => onSlotClick(0, i)}
            />
          ))}
        </div>

        {/* Action bar */}
        <div className="flex h-14 items-center justify-center gap-3">
          <span className="text-xs text-slate-400">You · {me.totalScore}</span>
          {canDraw && (
            <button
              onClick={() => dispatch({ type: "callPobudka" })}
              className="rounded-full bg-rose-500/90 px-5 py-2 text-sm font-bold tracking-wide text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-400 active:scale-95"
            >
              POBUDKA!
            </button>
          )}
          {myTurn && phase === "holdingDeck" && (
            <>
              <button
                onClick={() => dispatch({ type: "discardHeld" })}
                className="rounded-full bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600 active:scale-95"
              >
                Discard
              </button>
              {state.held?.kind === "special" && (
                <button
                  onClick={() => dispatch({ type: "activateSpecial" })}
                  className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500 active:scale-95"
                >
                  Use power
                </button>
              )}
            </>
          )}
        </div>

        {/* take_2 choice (human) */}
        <AnimatePresence>
          {myTurn && phase === "take2Pick" && state.take2Cards && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center gap-4 bg-slate-950/70 backdrop-blur-sm"
            >
              {state.take2Cards.map((card, i) => (
                <CardView
                  key={card.id}
                  card={card}
                  faceUp
                  className="w-28"
                  interactive
                  highlight
                  onClick={() => dispatch({ type: "take2Pick", index: i as 0 | 1 })}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* choose_1 browse (human) */}
        <AnimatePresence>
          {browsing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/80 p-6 backdrop-blur-sm"
            >
              <p className="mb-4 text-center text-sm text-slate-200">
                Choose one card to swap into your dream
              </p>
              <div className="mx-auto grid max-w-sm grid-cols-4 gap-3">
                {state.discardPile.map((card, i) => (
                  <CardView
                    key={card.id}
                    card={card}
                    faceUp
                    className="w-full"
                    interactive
                    onClick={() => dispatch({ type: "choose1Pick", discardIndex: i })}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Round end / game over */}
        <AnimatePresence>
          {roundOver && state.roundResults && (
            <motion.div
              initial={{ y: 240, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 240, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28, delay: 1.2 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-2xl border border-slate-700/60 bg-slate-900/95 p-5 shadow-2xl backdrop-blur"
            >
              <h2 className="mb-3 text-center text-lg font-bold">
                {phase === "gameOver"
                  ? state.winners?.includes(0)
                    ? "You win the game!"
                    : `${state.winners?.map((w) => state.players[w].name).join(" & ")} wins!`
                  : state.callerIndex !== null
                    ? `${state.players[state.callerIndex].name} called POBUDKA!`
                    : "The dream ran out of cards"}
              </h2>
              <div className="mb-4 space-y-1.5">
                {state.players.map((p, i) => {
                  const r = state.roundResults![i];
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm",
                        r.wasLowest ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-800/60",
                      )}
                    >
                      <span>
                        {p.name}
                        {state.callerIndex === i && " 📣"}
                      </span>
                      <span className="tabular-nums">
                        {r.raw} cats → +{r.added}
                        {r.penalty > 0 && (
                          <span className="text-rose-300"> (+{r.penalty} penalty)</span>
                        )}
                        <span className="ml-2 font-bold">{p.totalScore}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() =>
                  phase === "gameOver" ? onRestart() : dispatch({ type: "nextRound" })
                }
                className="w-full rounded-full bg-indigo-500 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400 active:scale-[0.98]"
              >
                {phase === "gameOver" ? "Play again" : "Next round"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
};
