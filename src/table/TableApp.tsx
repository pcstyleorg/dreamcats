import React, { useState } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { getGameBackgroundAsset } from "@/lib/cardAssets";
import { GameTable } from "./GameTable";
import { LocalGame, LocalGameOptions } from "./store";

/**
 * Standalone entry for the rebuilt new-edition table (local play vs bots).
 * Reached via `/?newtable` while the rebuild is in progress.
 */
export const TableApp: React.FC = () => {
  const [options, setOptions] = useState<LocalGameOptions | null>(null);
  const [game, setGame] = useState<LocalGame | null>(null);
  const [botCount, setBotCount] = useState<1 | 2 | 3>(2);

  const start = (opts: LocalGameOptions) => {
    setOptions(opts);
    setGame(new LocalGame(opts));
  };

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="min-h-dvh text-slate-100"
      style={{ background: getGameBackgroundAsset() }}
    >
      {game && options ? (
        <GameTable
          key={`${options.botCount}-${game.getState().seed}`}
          game={game}
          onRestart={() => start(options)}
        />
      ) : (
        <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 p-6 text-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Dreamcats</h1>
            <p className="mt-1 text-sm text-slate-300">
              New edition · fewest cats wins
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400">
              Opponents
            </span>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setBotCount(n)}
                  className={
                    n === botCount
                      ? "h-10 w-10 rounded-full bg-indigo-500 font-bold text-white"
                      : "h-10 w-10 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => start({ playerName: "You", botCount })}
            className="w-full rounded-full bg-rose-500 py-3 text-base font-bold text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-400 active:scale-[0.98]"
          >
            Start dreaming
          </button>
          <a href="/?classic" className="text-xs text-slate-400 hover:text-slate-200">
            classic multiplayer (old rules)
          </a>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
    </MotionConfig>
  );
};
