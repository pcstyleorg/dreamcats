/**
 * Online play UI: room lobby + the live table, backed by convex/engineRooms.
 * The viewer's seat is rotated to index 0 so GameTable is shared with local
 * play unchanged.
 */

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { GameEvent } from "../../convex/engine";
import { GameTable } from "./GameTable";
import { OnlineGame, errorMessage, saveRoom, toServerEvent } from "./online";

export interface OnlineRoomProps {
  code: string;
  playerId: string;
  onLeave: () => void;
}

export const OnlineRoom: React.FC<OnlineRoomProps> = ({
  code,
  playerId,
  onLeave,
}) => {
  const room = useQuery(api.engineRooms.get, { code, playerId });
  const sendEvent = useMutation(api.engineRooms.sendEvent);
  const startGame = useMutation(api.engineRooms.startGame);
  const leaveRoom = useMutation(api.engineRooms.leaveRoom);

  const gameRef = useRef<OnlineGame | null>(null);
  gameRef.current ??= new OnlineGame();
  const game = gameRef.current;
  const [ready, setReady] = useState(false);

  const seat = room?.seat ?? -1;
  const playerCount = room?.players.length ?? 0;
  useEffect(() => {
    game.sender = (event: GameEvent) =>
      sendEvent({
        code,
        playerId,
        event: toServerEvent(event, seat, playerCount),
      })
        .then(() => null)
        .catch((e) => errorMessage(e));
  }, [game, sendEvent, code, playerId, seat, playerCount]);

  useEffect(() => {
    if (room?.state && seat >= 0) {
      game.update(room.state, seat);
      setReady(true);
    }
  }, [room?.state, seat, game]);

  const leave = () => {
    leaveRoom({ code, playerId }).catch(() => {});
    saveRoom(null);
    onLeave();
  };

  if (room === undefined) {
    return <Center>Connecting to the dream…</Center>;
  }
  if (room === null) {
    return (
      <Center>
        <p>Room {code} does not exist anymore.</p>
        <LobbyButton onClick={leave}>Back</LobbyButton>
      </Center>
    );
  }

  if (room.status === "playing" && ready) {
    const isHost = room.hostId === playerId;
    return (
      <GameTable
        game={game}
        onExit={leave}
        restartLabel={isHost ? "Play again" : "Waiting for the host…"}
        onRestart={() => {
          if (!isHost) return;
          startGame({ code, playerId }).catch((e) => toast.error(errorMessage(e)));
        }}
      />
    );
  }

  if (room.status === "playing") {
    return <Center>Joining the game…</Center>;
  }

  // Lobby
  const isHost = room.hostId === playerId;
  return (
    <Center>
      <div>
        <p className="text-xs uppercase tracking-widest text-indigo-200/70">
          Room code
        </p>
        <p className="font-heading text-4xl tracking-[0.3em] text-amber-50">
          {room.code}
        </p>
        <p className="mt-1 text-xs text-indigo-300/70">
          Share it — friends join from this screen
        </p>
      </div>
      <div className="w-full space-y-1.5">
        {room.players.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl bg-indigo-950/50 px-3 py-2 text-sm ring-1 ring-indigo-300/10"
          >
            <span>{p.name}</span>
            <span className="text-xs text-indigo-300/70">
              {i === 0 ? "host" : `player ${i + 1}`}
            </span>
          </div>
        ))}
        {room.players.length < 2 && (
          <p className="pt-1 text-center text-xs text-indigo-300/70">
            Waiting for at least one more dreamer…
          </p>
        )}
      </div>
      {isHost ? (
        <LobbyButton
          primary
          disabled={room.players.length < 2}
          onClick={() =>
            startGame({ code, playerId }).catch((e) =>
              toast.error(errorMessage(e)),
            )
          }
        >
          Start game
        </LobbyButton>
      ) : (
        <p className="text-sm text-indigo-200/90">
          Waiting for the host to start…
        </p>
      )}
      <button
        onClick={leave}
        className="text-xs text-indigo-300/70 underline-offset-4 hover:text-indigo-100 hover:underline"
      >
        leave room
      </button>
    </Center>
  );
};

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 p-6 text-center text-amber-50">
    {children}
  </div>
);

const LobbyButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}> = ({ onClick, children, primary = false, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={
      primary
        ? "w-full rounded-full bg-gradient-to-b from-rose-400 to-rose-500 py-3 text-base font-bold text-rose-950 shadow-lg shadow-rose-950/50 transition hover:from-rose-300 hover:to-rose-400 active:scale-[0.98] disabled:opacity-40"
        : "w-full rounded-full bg-indigo-900/70 py-2.5 text-sm font-semibold text-indigo-100 ring-1 ring-indigo-300/20 transition hover:bg-indigo-800/70 active:scale-[0.98]"
    }
  >
    {children}
  </button>
);
