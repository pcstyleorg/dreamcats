import React, { useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { api } from "../../convex/_generated/api";
import { backAsset, hourglassAsset, numberAsset, specialAsset } from "./assets";
import { GameTable } from "./GameTable";
import {
  errorMessage,
  getPlayerId,
  getSavedName,
  getSavedRoom,
  saveName,
  saveRoom,
} from "./online";
import { OnlineRoom } from "./OnlineApp";
import { LocalGame, LocalGameOptions } from "./store";

type Mode =
  | { kind: "menu" }
  | { kind: "solo"; game: LocalGame; options: LocalGameOptions }
  | { kind: "online"; code: string };

const hasConvex = Boolean(import.meta.env.VITE_CONVEX_URL);

/** Dreamy night sky behind every screen: moon glow, mist and drifting petals. */
export const DreamBackdrop: React.FC = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#4c2d7a_0%,#221543_38%,#0c0a1e_100%)]" />
    <div className="absolute left-1/2 top-[-14%] h-72 w-72 -translate-x-1/2 rounded-full bg-amber-100/10 blur-3xl" />
    <div className="absolute bottom-[-20%] left-[-10%] h-80 w-80 rounded-full bg-fuchsia-400/10 blur-3xl" />
    <div className="absolute bottom-[-25%] right-[-12%] h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
    {[...Array(9)].map((_, i) => (
      <span
        key={i}
        className="animate-float absolute block h-1.5 w-1.5 rounded-full motion-reduce:animate-none"
        style={{
          left: `${(i * 47) % 100}%`,
          top: `${(i * 31 + 9) % 90}%`,
          background: i % 3 === 0 ? "rgba(251,207,232,0.5)" : "rgba(254,243,199,0.35)",
          animationDelay: `${i * 0.9}s`,
          animationDuration: `${5 + (i % 4)}s`,
        }}
      />
    ))}
  </div>
);

const HERO_FAN = [
  { src: numberAsset(3), rotate: -16, x: -64 },
  { src: specialAsset("peek_1"), rotate: -8, x: -32 },
  { src: backAsset, rotate: 0, x: 0 },
  { src: hourglassAsset, rotate: 8, x: 32 },
  { src: numberAsset(7), rotate: 16, x: 64 },
];

/** Default entry: the rebuilt new-edition table (solo vs bots, or online). */
export const TableApp: React.FC = () => {
  const playerId = useMemo(() => getPlayerId(), []);
  const [mode, setMode] = useState<Mode>(() => {
    const saved = hasConvex ? getSavedRoom() : null;
    return saved ? { kind: "online", code: saved } : { kind: "menu" };
  });
  const [botCount, setBotCount] = useState<1 | 2 | 3>(2);
  const [name, setName] = useState(getSavedName);
  const [joinCode, setJoinCode] = useState("");

  const createRoom = useMutation(api.engineRooms.createRoom);
  const joinRoom = useMutation(api.engineRooms.joinRoom);

  const playerName = name.trim() || "You";

  const startSolo = (options: LocalGameOptions) =>
    setMode({ kind: "solo", game: new LocalGame(options), options });

  const enterRoom = (code: string) => {
    saveName(name);
    saveRoom(code);
    setMode({ kind: "online", code });
  };

  const create = () =>
    createRoom({ playerId, name: playerName })
      .then(({ code }) => enterRoom(code))
      .catch((e) => toast.error(errorMessage(e)));

  const join = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) return toast.error("Room codes have 4 letters");
    joinRoom({ code, playerId, name: playerName })
      .then(() => enterRoom(code))
      .catch((e) => toast.error(errorMessage(e)));
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh text-amber-50">
        <DreamBackdrop />
        <div className="relative">
          {mode.kind === "solo" && (
            <GameTable
              key={mode.game.getState().seed}
              game={mode.game}
              onExit={() => setMode({ kind: "menu" })}
              onRestart={() => startSolo(mode.options)}
            />
          )}
          {mode.kind === "online" && (
            <OnlineRoom
              code={mode.code}
              playerId={playerId}
              onLeave={() => setMode({ kind: "menu" })}
            />
          )}
          {mode.kind === "menu" && (
            <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 p-6 text-center">
              {/* Hero: fanned painted cards under the title */}
              <div className="relative h-32 w-full" aria-hidden>
                {HERO_FAN.map(({ src, rotate, x }, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    draggable={false}
                    className="absolute left-1/2 top-2 w-20 rounded-lg shadow-xl shadow-indigo-950/70 ring-1 ring-white/20"
                    style={{
                      transform: `translateX(calc(-50% + ${x}px)) rotate(${rotate}deg)`,
                      transformOrigin: "bottom center",
                      zIndex: i === 2 ? 5 : 4 - Math.abs(i - 2),
                    }}
                  />
                ))}
              </div>

              <div>
                <h1 className="font-heading text-4xl tracking-tight text-amber-50">
                  Dreamcats
                </h1>
                <p className="mt-1.5 text-sm text-indigo-200/90">
                  Wake up with the fewest cats in your dream
                </p>
              </div>

              <div className="w-full space-y-3 rounded-3xl border border-indigo-300/15 bg-indigo-950/45 p-4 shadow-xl shadow-indigo-950/40 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-indigo-200/70">
                    Solo vs bots
                  </span>
                  <div className="flex gap-1.5">
                    {([1, 2, 3] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setBotCount(n)}
                        aria-label={`${n} opponent${n === 1 ? "" : "s"}`}
                        className={
                          n === botCount
                            ? "h-8 w-8 rounded-full bg-pink-300 text-sm font-bold text-pink-950 shadow-md shadow-pink-950/40"
                            : "h-8 w-8 rounded-full bg-indigo-900/70 text-sm text-indigo-200 ring-1 ring-indigo-300/20 hover:bg-indigo-800/70"
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => startSolo({ playerName, botCount })}
                  className="w-full rounded-full bg-gradient-to-b from-pink-300 to-pink-400 py-3 text-base font-bold text-pink-950 shadow-lg shadow-pink-950/40 transition hover:from-pink-200 hover:to-pink-300 active:scale-[0.98]"
                >
                  Start dreaming
                </button>
              </div>

              {hasConvex && (
                <div className="w-full space-y-3 rounded-3xl border border-indigo-300/15 bg-indigo-950/45 p-4 shadow-xl shadow-indigo-950/40 backdrop-blur-sm">
                  <span className="block text-left text-xs uppercase tracking-widest text-indigo-200/70">
                    Play online
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    maxLength={20}
                    className="w-full rounded-xl border border-indigo-300/20 bg-indigo-900/50 px-3 py-2 text-sm text-amber-50 placeholder:text-indigo-300/50 focus:border-amber-300/60 focus:outline-none"
                  />
                  <button
                    onClick={create}
                    className="w-full rounded-full bg-gradient-to-b from-indigo-400 to-indigo-500 py-2.5 text-sm font-bold text-indigo-950 shadow-md shadow-indigo-950/50 transition hover:from-indigo-300 hover:to-indigo-400 active:scale-[0.98]"
                  >
                    Create a room
                  </button>
                  <div className="flex gap-2">
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && join()}
                      placeholder="CODE"
                      maxLength={4}
                      className="w-24 rounded-xl border border-indigo-300/20 bg-indigo-900/50 px-3 py-2 text-center text-sm font-bold tracking-[0.25em] text-amber-50 placeholder:font-normal placeholder:tracking-normal placeholder:text-indigo-300/50 focus:border-amber-300/60 focus:outline-none"
                    />
                    <button
                      onClick={join}
                      className="flex-1 rounded-full bg-indigo-900/70 py-2.5 text-sm font-semibold text-indigo-100 ring-1 ring-indigo-300/20 transition hover:bg-indigo-800/70 active:scale-[0.98]"
                    >
                      Join a room
                    </button>
                  </div>
                </div>
              )}

              <a
                href="/?classic"
                className="text-xs text-indigo-300/70 underline-offset-4 hover:text-indigo-100 hover:underline"
              >
                classic multiplayer (old rules)
              </a>
            </div>
          )}
        </div>
        <Toaster position="top-center" />
      </div>
    </MotionConfig>
  );
};
